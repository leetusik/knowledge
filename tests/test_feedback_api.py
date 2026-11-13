"""The Feedback HTTP surfaces: Postgres-gated.

Capture persists in the request and answers 202 with the row committed; a
``capture`` key reaches only the two capture routes; every key and session route
is scoped to the caller's own org (another org's event is a 404 and never listed);
uploads are accepted by magic bytes and size only; the owner alert runs after the
response and can never fail a capture; the capture limiter answers 429. Runs only
with a disposable Postgres via ``KB_TEST_DATABASE_URL`` (or ``DATABASE_URL``) and
skips otherwise; ``smtplib`` is never reached (the send is monkeypatched).
"""

from __future__ import annotations

import os
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, make_url, text

_RAW_DSN = os.environ.get("KB_TEST_DATABASE_URL") or os.environ.get("DATABASE_URL")

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
SMTP_ENV = ("KB_SMTP_HOST", "KB_SMTP_PORT", "KB_SMTP_USER", "KB_SMTP_PASSWORD", "KB_SMTP_FROM")


@pytest.fixture
def fb(tmp_path, monkeypatch):
    """A TestClient on a Postgres accounts plane, attachments on tmp_path, no SMTP."""

    if not _RAW_DSN:
        pytest.skip(
            "set KB_TEST_DATABASE_URL (or DATABASE_URL) to a disposable Postgres to "
            "run the feedback API tests"
        )
    url = (
        make_url(_RAW_DSN)
        .set(drivername="postgresql+psycopg")
        .render_as_string(hide_password=False)
    )
    sync_engine = create_engine(url)
    try:
        with sync_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:  # pragma: no cover - environment dependent
        sync_engine.dispose()
        pytest.skip(f"Postgres at the test DSN is unreachable: {exc}")

    from server.persistence import models  # noqa: F401 - registers the tables
    from server.persistence.base import Base

    Base.metadata.create_all(sync_engine, checkfirst=True)

    (tmp_path / "docs").mkdir()
    monkeypatch.setenv("KB_ROOT", str(tmp_path))
    monkeypatch.setenv("KB_DB_PATH", str(tmp_path / "data" / "kb.sqlite3"))
    monkeypatch.setenv("KB_FEEDBACK_ATTACHMENTS_DIR", str(tmp_path / "attachments"))
    monkeypatch.setenv("DATABASE_URL", url)
    monkeypatch.setenv("KB_AUTH_RATE_LIMIT", "0")
    for name in SMTP_ENV:
        monkeypatch.delenv(name, raising=False)

    import server.api_auth as api_auth
    import server.feedback_api as feedback_api
    import server.feedback.notify as notify
    import server.persistence.engine as engine_mod

    sent: list = []
    monkeypatch.setattr(notify, "send_message", lambda message: sent.append(message))
    engine_mod._engine = None
    engine_mod._session_maker = None
    api_auth._tenant_one_cache = None
    feedback_api._rate_windows.clear()

    from server.main import app

    with TestClient(app) as client:
        client.sent = sent  # type: ignore[attr-defined]
        yield client

    feedback_api._rate_windows.clear()
    api_auth._tenant_one_cache = None
    engine_mod._engine = None
    engine_mod._session_maker = None
    sync_engine.dispose()


def _signup(client: TestClient) -> dict:
    res = client.post(
        "/auth/signup",
        json={"email": f"p56s5-{uuid4().hex}@example.com", "password": "hunter2pass"},
    )
    assert res.status_code == 201, res.text
    body = res.json()
    body["session"] = {"Authorization": f"Bearer {body['token']}"}
    return body


def _key(client: TestClient, owner: dict, *, scope: str = "full", project: bool = False) -> dict:
    path = (
        f"/app/projects/{owner['project']['id']}/credentials" if project else "/app/credentials"
    )
    res = client.post(path, json={"scope": scope}, headers=owner["session"])
    assert res.status_code == 201, res.text
    return {"Authorization": f"Bearer {res.json()['key']}", "id": res.json()["credential"]["id"]}


def _h(key: dict) -> dict:
    return {"Authorization": key["Authorization"]}


def _capture(client: TestClient, headers: dict, **extra) -> dict:
    body = {
        "message": "the button is broken",
        "source": {"product": "app-x"},
        "user_id": "u-1",
        **extra,
    }
    res = client.post("/api/feedback", json=body, headers=headers)
    assert res.status_code == 202, res.text
    return res.json()


def _upload(client: TestClient, headers: dict, data: bytes = PNG, ctype: str = "image/png",
            user_id: str = "u-1", product: str = "app-x"):
    return client.post(
        f"/api/feedback/attachments?user_id={user_id}&source_product={product}",
        files={"file": ("shot.png", data, ctype)},
        headers=headers,
    )


def _event(client: TestClient, event_id: str):
    from server.feedback.service import get_feedback_service

    return client.portal.call(get_feedback_service().get_feedback_event, UUID(event_id))


def test_capture_is_committed_and_lands_in_the_callers_project(fb):
    owner = _signup(fb)
    project_key = _key(fb, owner, project=True)
    receipt = _capture(fb, _h(project_key), project="ignored-by-a-project-key")
    assert receipt["status"] == "accepted" and receipt["accepted_at"].endswith("Z")
    stored = _event(fb, receipt["request_id"])
    assert stored is not None and str(stored.project_id) == owner["project"]["id"]

    org_key = _key(fb, owner)
    named = _capture(fb, _h(org_key), project="mobile-app")
    defaulted = _capture(fb, _h(org_key))
    projects = {p["name"]: p["id"] for p in fb.get("/app/projects", headers=owner["session"]).json()["projects"]}
    assert str(_event(fb, named["request_id"]).project_id) == projects["mobile-app"]
    assert str(_event(fb, defaulted["request_id"]).project_id) == projects["default"]

    bad = fb.post("/api/feedback", json={"message": "  ", "source": {"product": "x"}}, headers=_h(org_key))
    assert bad.status_code == 400 and bad.json()["detail"] == "message must not be blank"
    for body in ({"source": {"product": "x"}}, {"message": "m", "source": {"product": "x"}, "channel": "fax"}):
        assert fb.post("/api/feedback", json=body, headers=_h(org_key)).status_code == 400
    assert fb.post("/api/feedback", content=b"not json", headers=_h(org_key)).status_code == 400


def test_every_route_needs_a_caller(fb):
    owner = _signup(fb)
    key = _key(fb, owner)
    fb.delete(f"/app/credentials/{key['id']}", headers=owner["session"])
    eid, aid = uuid4(), uuid4()
    routes = [
        ("POST", "/api/feedback"), ("POST", "/api/feedback/attachments"),
        ("GET", "/api/feedback?user_id=u&source_product=p"),
        ("GET", f"/api/feedback/{eid}/attachments/{aid}?user_id=u&source_product=p"),
        ("GET", "/api/project/feedback"), ("GET", f"/api/project/feedback/{eid}"),
        ("PATCH", f"/api/project/feedback/{eid}"), ("DELETE", f"/api/project/feedback/{eid}"),
        ("GET", f"/api/project/feedback/{eid}/comments"), ("POST", f"/api/project/feedback/{eid}/comments"),
        ("GET", f"/api/project/feedback/{eid}/attachments/{aid}"), ("GET", "/api/project/usage"),
        ("GET", "/app/feedback"), ("GET", f"/app/feedback/{eid}"),
        ("GET", f"/app/feedback/{eid}/attachments/{aid}"),
    ]
    for headers in ({}, {"Authorization": "Bearer vk_unknown"}, _h(key)):
        for method, path in routes:
            assert fb.request(method, path, headers=headers).status_code == 401, (method, path, headers)


def test_a_capture_key_reaches_only_capture(fb):
    owner = _signup(fb)
    capture = _key(fb, owner, scope="capture")
    full = _key(fb, owner)
    assert _upload(fb, _h(capture)).status_code == 201
    receipt = _capture(fb, _h(capture))
    eid = receipt["request_id"]
    reads = [
        "/api/project/feedback", f"/api/project/feedback/{eid}", "/api/project/usage",
        "/api/feedback?user_id=u-1&source_product=app-x", "/api/projects",
    ]
    for path in reads:
        assert fb.get(path, headers=_h(capture)).status_code == 403, path
        assert fb.get(path, headers=_h(full)).status_code == 200, path
    assert fb.patch(f"/api/project/feedback/{eid}", json={"comment": "x"}, headers=_h(capture)).status_code == 403
    assert fb.post(f"/api/project/feedback/{eid}/comments", json={"body": "x"}, headers=_h(capture)).status_code == 403
    assert fb.delete(f"/api/project/feedback/{eid}", headers=_h(capture)).status_code == 403
    assert _upload(fb, _h(full)).status_code == 201
    _capture(fb, _h(full))


def test_upload_sniffs_bytes_and_links_only_on_a_match(fb, monkeypatch):
    owner = _signup(fb)
    key = _key(fb, owner)
    up = _upload(fb, _h(key))
    assert up.status_code == 201 and up.json()["content_type"] == "image/png"
    # The declared type is ignored both ways.
    assert _upload(fb, _h(key), data=b"<svg></svg>", ctype="image/png").status_code == 415
    assert _upload(fb, _h(key), data=PNG, ctype="text/plain").status_code == 201
    monkeypatch.setenv("KB_FEEDBACK_ATTACHMENTS_MAX_BYTES", "32")
    assert _upload(fb, _h(key)).status_code == 413
    monkeypatch.delenv("KB_FEEDBACK_ATTACHMENTS_MAX_BYTES")

    wrong_user = _upload(fb, _h(key), user_id="someone-else").json()["attachment_id"]
    aid = up.json()["attachment_id"]
    eid = _capture(fb, _h(key), attachment_ids=[aid, wrong_user])["request_id"]
    detail = fb.get(f"/api/project/feedback/{eid}", headers=_h(key)).json()["record"]
    assert [a["id"] for a in detail["attachments"]] == [aid]
    over = [str(uuid4()) for _ in range(11)]
    assert fb.post("/api/feedback", json={"message": "m", "source": {"product": "p"}, "attachment_ids": over},
                   headers=_h(key)).status_code == 400

    for path, headers in (
        (f"/api/project/feedback/{eid}/attachments/{aid}", _h(key)),
        (f"/app/feedback/{eid}/attachments/{aid}", owner["session"]),
        (f"/api/feedback/{eid}/attachments/{aid}?user_id=u-1&source_product=app-x", _h(key)),
    ):
        res = fb.get(path, headers=headers)
        assert res.status_code == 200 and res.content == PNG, path
    assert fb.get(f"/api/feedback/{eid}/attachments/{aid}?user_id=u-2&source_product=app-x",
                  headers=_h(key)).status_code == 404


def test_another_orgs_event_is_404_and_never_listed(fb):
    a = _signup(fb)
    b = _signup(fb)
    key_a = _key(fb, a, project=True)
    aid = _upload(fb, _h(key_a)).json()["attachment_id"]
    eid = _capture(fb, _h(key_a), attachment_ids=[aid])["request_id"]
    assert fb.get(f"/api/project/feedback/{eid}", headers=_h(key_a)).status_code == 200
    assert fb.get(f"/app/feedback/{eid}", headers=a["session"]).status_code == 200

    for b_caller in (_h(_key(fb, b)), _h(_key(fb, b, project=True)), b["session"]):
        is_session = b_caller is b["session"]
        if not is_session:
            assert fb.get(f"/api/project/feedback/{eid}", headers=b_caller).status_code == 404
            assert fb.patch(f"/api/project/feedback/{eid}", json={"comment": "x"}, headers=b_caller).status_code == 404
            assert fb.delete(f"/api/project/feedback/{eid}", headers=b_caller).status_code == 404
            assert fb.get(f"/api/project/feedback/{eid}/comments", headers=b_caller).status_code == 404
            assert fb.post(f"/api/project/feedback/{eid}/comments", json={"body": "x"}, headers=b_caller).status_code == 404
            assert fb.get(f"/api/project/feedback/{eid}/attachments/{aid}", headers=b_caller).status_code == 404
            assert fb.get(f"/api/feedback/{eid}/attachments/{aid}?user_id=u-1&source_product=app-x",
                          headers=b_caller).status_code == 404
            listed = fb.get("/api/project/feedback", headers=b_caller).json()["records"]
            mine = fb.get("/api/feedback?user_id=u-1&source_product=app-x", headers=b_caller).json()["records"]
            assert eid not in {r["id"] for r in listed + mine}
        else:  # /app/feedback* is session-only (a key is a 401 there)
            assert fb.get(f"/app/feedback/{eid}", headers=b_caller).status_code == 404
            assert fb.get(f"/app/feedback/{eid}/attachments/{aid}", headers=b_caller).status_code == 404
            assert eid not in {r["id"] for r in fb.get("/app/feedback", headers=b_caller).json()["records"]}
    # Nothing B did changed A's event.
    record = fb.get(f"/api/project/feedback/{eid}", headers=_h(key_a)).json()["record"]
    assert record["comment"] is None and record["comments"] == []


def test_a_user_in_two_orgs_sees_each_only_under_its_header(fb):
    from server.accounts.service import get_accounts_service

    a = _signup(fb)
    org_a = a["tenant"]["id"]
    tenant_b, _member = fb.portal.call(
        get_accounts_service().create_tenant_with_owner, UUID(a["user"]["id"]), "second"
    )
    org_b = str(tenant_b.id)
    in_a = {**a["session"], "X-Hi2vi-Org": org_a}
    in_b = {**a["session"], "X-Hi2vi-Org": org_b}
    ea = _capture(fb, in_a, message="in a")["request_id"]
    eb = _capture(fb, in_b, message="in b")["request_id"]
    ids_a = {r["id"] for r in fb.get("/app/feedback", headers=in_a).json()["records"]}
    ids_b = {r["id"] for r in fb.get("/app/feedback", headers=in_b).json()["records"]}
    assert ea in ids_a and eb not in ids_a and eb in ids_b and ea not in ids_b
    assert fb.get(f"/app/feedback/{eb}", headers=in_a).status_code == 404
    assert fb.get(f"/app/feedback/{eb}", headers=in_b).status_code == 200
    assert fb.get("/app/feedback?q=IN%20B", headers=in_b).json()["records"][0]["id"] == eb


def test_patch_comment_and_delete(fb):
    owner = _signup(fb)
    key = _key(fb, owner)
    aid = _upload(fb, _h(key)).json()["attachment_id"]
    eid = _capture(fb, _h(key), attachment_ids=[aid])["request_id"]

    patched = fb.patch(f"/api/project/feedback/{eid}", json={"feedback_value": 2, "tags": ["ux"]}, headers=_h(key))
    assert patched.status_code == 200, patched.text
    assert patched.json()["record"]["feedback_value"] == 2 and patched.json()["record"]["tags"] == ["ux"]
    assert fb.patch(f"/api/project/feedback/{eid}", json={}, headers=_h(key)).status_code == 400
    made = fb.post(f"/api/project/feedback/{eid}/comments", json={"body": " seen ", "author": "op"}, headers=_h(key))
    assert made.status_code == 201 and made.json()["comment"]["body"] == "seen"
    assert [c["body"] for c in fb.get(f"/api/project/feedback/{eid}/comments", headers=_h(key)).json()["comments"]] == ["seen"]

    from server.feedback.storage import attachments_dir

    files = [p for p in attachments_dir().rglob("*") if p.is_file()]
    assert len(files) == 1
    assert fb.delete(f"/api/project/feedback/{eid}", headers=_h(key)).status_code == 204
    assert _event(fb, eid) is None
    assert not files[0].exists()
    assert fb.get(f"/api/project/feedback/{eid}", headers=_h(key)).status_code == 404


def test_the_alert_runs_after_the_capture_and_never_fails_it(fb, monkeypatch):
    owner = _signup(fb)
    key = _key(fb, owner)
    _capture(fb, _h(key))
    assert fb.sent == []  # SMTP unset: nothing sent

    monkeypatch.setenv("KB_SMTP_HOST", "smtp.invalid")
    monkeypatch.setenv("KB_SMTP_FROM", "alerts@example.com")
    _capture(fb, _h(key), message="mail me")
    assert len(fb.sent) == 1
    assert fb.sent[0]["To"] == owner["user"]["email"] and "mail me" in fb.sent[0].get_content()

    import server.feedback.notify as notify

    def boom(message):
        raise OSError("smtp down")

    monkeypatch.setattr(notify, "send_message", boom)
    receipt = _capture(fb, _h(key), message="still captured")
    assert _event(fb, receipt["request_id"]) is not None


def test_the_capture_limiter(fb, monkeypatch):
    owner = _signup(fb)
    key = _key(fb, owner)
    monkeypatch.setenv("KB_FEEDBACK_RATE_LIMIT", "2")
    _capture(fb, _h(key))
    _capture(fb, _h(key))
    over = fb.post("/api/feedback", json={"message": "m", "source": {"product": "p"}}, headers=_h(key))
    assert over.status_code == 429 and "Retry-After" in over.headers
    # Uploads count in their own bucket.
    assert _upload(fb, _h(key)).status_code == 201
    monkeypatch.setenv("KB_FEEDBACK_RATE_LIMIT", "0")
    for _ in range(3):
        _capture(fb, _h(key))


def test_feedback_is_a_reserved_org_slug(fb):
    owner = _signup(fb)
    res = fb.patch("/app/tenant", json={"slug": "feedback"}, headers=owner["session"])
    assert res.status_code == 422


def test_usage_counts_the_scope(fb):
    owner = _signup(fb)
    key = _key(fb, owner)
    _capture(fb, _h(key), feedback_value=1)
    res = fb.get("/api/project/usage", headers=_h(key))
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["totals"]["total"] == 1 and body["totals"]["liked"] == 1
    assert key["id"] in {c["id"] for c in body["credentials"]}
