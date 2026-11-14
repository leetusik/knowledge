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
    real_send = notify.send_message
    monkeypatch.setattr(notify, "send_message", lambda message: sent.append(message))
    engine_mod._engine = None
    engine_mod._session_maker = None
    api_auth._tenant_one_cache = None
    feedback_api._rate_windows.clear()

    from server.main import app

    with TestClient(app) as client:
        client.sent = sent  # type: ignore[attr-defined]
        client.real_send = real_send  # type: ignore[attr-defined]
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


def test_the_limiter_buckets_the_edge_by_address_and_the_mcp_hop_by_credential(fb, monkeypatch):
    """The edge sets ``X-Real-IP``: one client address is one bucket, whatever key it
    sends. The MCP hop (and any in-network caller) reaches the API without it: each
    credential is its own bucket, and no header the caller sends can pick one."""

    a, b = _signup(fb), _signup(fb)
    key_a, key_b = _key(fb, a, scope="capture"), _key(fb, b, scope="capture")
    key_a2 = _key(fb, a)
    body = {"message": "m", "source": {"product": "p"}}
    monkeypatch.setenv("KB_FEEDBACK_RATE_LIMIT", "2")

    # The MCP hop: no X-Real-IP. Key A spends its own bucket only.
    _capture(fb, _h(key_a))
    _capture(fb, _h(key_a))
    assert fb.post("/api/feedback", json=body, headers=_h(key_a)).status_code == 429
    _capture(fb, _h(key_b))  # another org's key is never counted with key A
    _capture(fb, _h(key_a2))  # nor another key of the same org
    for spoof in ({"X-Forwarded-For": "198.51.100.7"}, {"X-Forwarded-For": "10.0.0.1, 10.0.0.2"}):
        assert fb.post("/api/feedback", json=body, headers={**_h(key_a), **spoof}).status_code == 429

    # The edge: one client address is one bucket across keys and orgs.
    edge = {"X-Real-IP": "203.0.113.9"}
    _capture(fb, {**_h(key_b), **edge})
    _capture(fb, {**_h(key_a2), **edge})
    assert fb.post("/api/feedback", json=body, headers={**_h(key_b), **edge}).status_code == 429
    _capture(fb, {**_h(key_b), "X-Real-IP": "203.0.113.10"})

    # Uploads follow the same rule in buckets of their own.
    assert _upload(fb, _h(key_a)).status_code == 201
    assert _upload(fb, _h(key_a)).status_code == 201
    assert _upload(fb, _h(key_a)).status_code == 429
    assert _upload(fb, _h(key_b)).status_code == 201

    # An unauthenticated in-network request is still a 401, never a bucket.
    assert fb.post("/api/feedback", json=body).status_code == 401


def _sql(statement: str, **params) -> list:
    """Run one statement on the test database (the fixture's DSN) and return its rows."""

    url = make_url(_RAW_DSN).set(drivername="postgresql+psycopg")
    engine = create_engine(url)
    try:
        with engine.begin() as conn:
            result = conn.execute(text(statement), params)
            return list(result) if result.returns_rows else []
    finally:
        engine.dispose()


def _age(attachment_id: str, interval: str) -> None:
    _sql(
        f"UPDATE feedback_attachments SET created_at = now() - interval '{interval}' WHERE id = :id",
        id=attachment_id,
    )


def _attachment_row(attachment_id: str) -> list:
    return _sql(
        "SELECT storage_key, feedback_id FROM feedback_attachments WHERE id = :id", id=attachment_id
    )


def test_unlinked_uploads_are_reclaimed_after_the_ttl(fb):
    from server.feedback.storage import attachments_dir

    owner = _signup(fb)
    key = _key(fb, owner, scope="capture")

    def upload() -> str:
        res = _upload(fb, _h(key))
        assert res.status_code == 201, res.text
        return res.json()["attachment_id"]

    stale, fresh, linked, gone_file = upload(), upload(), upload(), upload()
    eid = _capture(fb, _h(key), attachment_ids=[linked])["request_id"]
    stale_file = attachments_dir() / _attachment_row(stale)[0].storage_key
    linked_file = attachments_dir() / _attachment_row(linked)[0].storage_key
    fresh_file = attachments_dir() / _attachment_row(fresh)[0].storage_key
    (attachments_dir() / _attachment_row(gone_file)[0].storage_key).unlink()
    for aid in (stale, linked, gone_file):
        _age(aid, "2 days")
    assert stale_file.exists()

    upload()  # the next upload sweeps

    assert _attachment_row(stale) == [] and not stale_file.exists()
    assert _attachment_row(gone_file) == []  # a file already missing is not an error
    assert _attachment_row(fresh) != [] and fresh_file.exists()
    assert str(_attachment_row(linked)[0].feedback_id) == eid and linked_file.exists()
    record = fb.get(f"/app/feedback/{eid}", headers=owner["session"]).json()["record"]
    assert [a["id"] for a in record["attachments"]] == [linked]

    # A capture naming a reclaimed id is treated as an unknown id: the event is
    # stored without it (never a 500).
    receipt = _capture(fb, _h(key), attachment_ids=[stale, fresh])
    record = fb.get(f"/app/feedback/{receipt['request_id']}", headers=owner["session"]).json()["record"]
    assert [a["id"] for a in record["attachments"]] == [fresh]


def test_the_reclaim_ttl_is_a_knob_and_each_sweep_is_bounded(fb, monkeypatch):
    import server.feedback_api as feedback_api

    owner = _signup(fb)
    key = _key(fb, owner)
    monkeypatch.setenv("KB_FEEDBACK_ATTACHMENTS_UNLINKED_TTL_S", "3600")
    monkeypatch.setattr(feedback_api, "UNLINKED_SWEEP_BATCH", 2, raising=False)
    old = [_upload(fb, _h(key)).json()["attachment_id"] for _ in range(3)]
    young = _upload(fb, _h(key)).json()["attachment_id"]
    for aid in old:
        _age(aid, "2 hours")
    _age(young, "30 minutes")

    _upload(fb, _h(key))
    assert sum(1 for aid in old if _attachment_row(aid)) >= 1  # at most a batch per upload
    for _ in range(10):
        if not any(_attachment_row(aid) for aid in old):
            break
        _upload(fb, _h(key))
    assert not any(_attachment_row(aid) for aid in old)
    assert _attachment_row(young) != []


def test_a_capture_only_org_key_never_creates_a_project(fb):
    owner = _signup(fb)
    capture = _key(fb, owner, scope="capture")
    full = _key(fb, owner)

    def names() -> set[str]:
        res = fb.get("/app/projects", headers=owner["session"])
        return {p["name"] for p in res.json()["projects"]}

    before = names()
    unknown = f"made-up-{uuid4().hex[:8]}"
    res = fb.post(
        "/api/feedback",
        json={"message": "m", "source": {"product": "p"}, "project": unknown},
        headers=_h(capture),
    )
    assert res.status_code == 400
    assert res.json()["detail"] == (
        "project does not exist in this org, and a capture-only key cannot create one"
    )
    assert names() == before

    # "default" (absent or named) and an existing project answer 202.
    defaulted = _capture(fb, _h(capture))
    named_default = _capture(fb, _h(capture), project="default")
    made = fb.post("/app/projects", json={"name": "existing-app"}, headers=owner["session"])
    assert made.status_code == 201, made.text
    existing = _capture(fb, _h(capture), project="existing-app")
    projects = {p["name"]: p["id"] for p in fb.get("/app/projects", headers=owner["session"]).json()["projects"]}
    assert str(_event(fb, defaulted["request_id"]).project_id) == projects["default"]
    assert str(_event(fb, named_default["request_id"]).project_id) == projects["default"]
    assert str(_event(fb, existing["request_id"]).project_id) == projects["existing-app"]
    assert unknown not in projects

    # A full key, a session and a project-bound capture key are unchanged.
    _capture(fb, _h(full), project=unknown)
    _capture(fb, owner["session"], project=f"{unknown}-s")
    bound = _key(fb, owner, scope="capture", project=True)
    landed = _capture(fb, _h(bound), project=f"{unknown}-b")
    assert str(_event(fb, landed["request_id"]).project_id) == owner["project"]["id"]
    after = names()
    assert unknown in after and f"{unknown}-s" in after and f"{unknown}-b" not in after


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


def test_the_usage_window_is_bounded(fb, monkeypatch):
    """A window wider than a year, reversed, or overflowing is a 400 answered before
    any per-day list is built; the default window and a full year still answer."""

    from server.feedback.repository import FeedbackRepository

    built: list = []
    real_days = FeedbackRepository._iter_requested_days

    def counting(self, start_day, end_ingested_at):
        built.append((start_day, end_ingested_at))
        return real_days(self, start_day, end_ingested_at)

    monkeypatch.setattr(FeedbackRepository, "_iter_requested_days", counting)
    owner = _signup(fb)
    key = _key(fb, owner)
    _capture(fb, _h(key))

    def usage(**params):
        return fb.get("/api/project/usage", params=params, headers=_h(key))

    refused = [
        {"start_ingested_at": "0001-01-01T00:00:00Z", "end_ingested_at": "9999-12-31T00:00:00Z"},
        {"end_ingested_at": "0001-01-05T00:00:00Z"},
        {"start_ingested_at": "2026-02-01T00:00:00Z", "end_ingested_at": "2026-01-01T00:00:00Z"},
        {"start_ingested_at": "0001-01-01T00:00:00+05:00"},
    ]
    for params in refused:
        res = usage(**params)
        assert res.status_code == 400, (params, res.status_code, res.text[:200])
        assert isinstance(res.json()["detail"], str) and res.json()["detail"]
    assert built == []

    assert len(usage().json()["daily_counts"]) == 31
    year = usage(start_ingested_at="2025-01-01T00:00:00Z", end_ingested_at="2026-01-01T00:00:00Z")
    assert year.status_code == 200 and len(year.json()["daily_counts"]) == 365
    top = usage(start_ingested_at="9999-12-01T00:00:00Z", end_ingested_at="9999-12-31T23:59:59Z")
    assert top.status_code == 200 and top.json()["daily_counts"][-1]["day"] == "9999-12-31"


def _self_signed_cert(work) -> tuple[str, str]:
    import shutil
    import subprocess

    openssl = shutil.which("openssl")
    if openssl is None:
        pytest.skip("openssl is needed to make the stand-in SMTP server's certificate")
    key, crt = str(work / "k.pem"), str(work / "c.pem")
    subprocess.run(
        [openssl, "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", key, "-out", crt,
         "-days", "1", "-subj", "/CN=not-your-smtp.example"],
        check=True, capture_output=True,
    )
    return key, crt


def test_the_alert_never_authenticates_to_an_unverified_smtp_server(fb, monkeypatch, tmp_path, caplog):
    """A STARTTLS server whose certificate does not verify (self-signed, another
    name: a man in the middle) never receives AUTH; the capture still answers 202."""

    import socket
    import ssl
    import threading

    import server.feedback.notify as notify

    key_pem, crt_pem = _self_signed_cert(tmp_path)
    listener = socket.socket()
    listener.bind(("127.0.0.1", 0))
    listener.listen(1)
    listener.settimeout(10)
    port = listener.getsockname()[1]
    seen: list[str] = []

    def serve() -> None:
        try:
            conn, _ = listener.accept()
        except OSError:
            return
        conn.settimeout(10)
        f = conn.makefile("rwb")

        def send(line: str) -> None:
            f.write(line.encode() + b"\r\n")
            f.flush()

        try:
            send("220 stand-in ESMTP")
            f.readline()
            send("250-stand-in")
            send("250 STARTTLS")
            f.readline()
            send("220 go ahead")
            ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            ctx.load_cert_chain(crt_pem, key_pem)
            tls = ctx.wrap_socket(conn, server_side=True)
            f = tls.makefile("rwb")
            f.readline()
            send("250-stand-in")
            send("250 AUTH PLAIN LOGIN")
            while line := f.readline():
                seen.append(line.decode(errors="replace"))
                send("235 ok" if line.startswith(b"AUTH") else "250 ok")
                if line.upper().startswith(b"QUIT"):
                    break
        except (OSError, ssl.SSLError):
            pass
        finally:
            conn.close()

    thread = threading.Thread(target=serve, daemon=True)
    thread.start()
    monkeypatch.setattr(notify, "send_message", fb.real_send)
    monkeypatch.setenv("KB_SMTP_HOST", "127.0.0.1")
    monkeypatch.setenv("KB_SMTP_PORT", str(port))
    monkeypatch.setenv("KB_SMTP_USER", "alerts@example.com")
    monkeypatch.setenv("KB_SMTP_PASSWORD", "synthetic-smtp-password")
    monkeypatch.setenv("KB_SMTP_FROM", "alerts@example.com")

    owner = _signup(fb)
    key = _key(fb, owner)
    with caplog.at_level("ERROR", logger="server.feedback.notify"):
        receipt = _capture(fb, _h(key), message="mail me over a bad TLS")
    thread.join(10)
    listener.close()
    assert _event(fb, receipt["request_id"]) is not None
    assert not any(line.startswith("AUTH") for line in seen), seen
    assert any("failed; dropped" in r.getMessage() for r in caplog.records)


def test_implicit_tls_verifies_the_server_too(monkeypatch):
    """Port 465 (``SMTP_SSL``) is given a verifying context as well."""

    import smtplib
    import ssl
    from email.message import EmailMessage

    import server.feedback.notify as notify

    contexts: list = []

    class Recorder:
        def __init__(self, host, port, timeout=None, context=None):
            contexts.append(context)

        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

        def login(self, user, password):
            pass

        def send_message(self, message):
            pass

    monkeypatch.setattr(smtplib, "SMTP_SSL", Recorder)
    monkeypatch.setenv("KB_SMTP_HOST", "smtp.invalid")
    monkeypatch.setenv("KB_SMTP_PORT", "465")
    monkeypatch.setenv("KB_SMTP_FROM", "alerts@example.com")
    notify.send_message(EmailMessage())
    (ctx,) = contexts
    assert isinstance(ctx, ssl.SSLContext)
    assert ctx.verify_mode == ssl.CERT_REQUIRED and ctx.check_hostname


def _last_used(credential_id: str):
    (row,) = _sql("SELECT last_used_at FROM project_credentials WHERE id = :id", id=credential_id)
    return row[0]


def test_a_capture_stamps_its_keys_last_used(fb):
    owner = _signup(fb)
    capture = _key(fb, owner, scope="capture")
    uploader = _key(fb, owner, scope="capture")
    failed = _key(fb, owner, scope="capture")
    revoked = _key(fb, owner, scope="capture")

    _capture(fb, _h(capture))
    assert _last_used(capture["id"]) is not None
    assert _upload(fb, _h(uploader)).status_code == 201
    assert _last_used(uploader["id"]) is not None

    # A key that only failed is never stamped: 400, 415, 403, and (revoked) 401.
    unknown = {"message": "m", "source": {"product": "p"}, "project": f"nope-{uuid4().hex[:8]}"}
    assert fb.post("/api/feedback", json=unknown, headers=_h(failed)).status_code == 400
    assert _upload(fb, _h(failed), data=b"not an image").status_code == 415
    assert fb.get("/api/project/feedback", headers=_h(failed)).status_code == 403
    assert _last_used(failed["id"]) is None
    assert fb.delete(f"/app/credentials/{revoked['id']}", headers=owner["session"]).status_code == 204
    plain = {"message": "m", "source": {"product": "p"}}
    assert fb.post("/api/feedback", json=plain, headers=_h(revoked)).status_code == 401
    assert _last_used(revoked["id"]) is None

    # A session capture has no key and stamps nothing (and still answers 202).
    _capture(fb, owner["session"])
