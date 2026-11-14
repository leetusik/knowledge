"""Multi-org sessions and key scopes: Postgres-gated.

A signed-in user may name the org a request acts in with ``X-Hi2vi-Org: <tenant
id>``; absent, the session acts in the user's first tenant (today's behaviour). A
non-member or malformed id is a 403, never another tenant. ``vk_`` keys and the
master bearer ignore the header. A ``capture`` key is refused by the Library
resolvers and accepted by ``resolve_api_capture``.

Like its neighbours this runs only with a disposable Postgres via
``KB_TEST_DATABASE_URL`` (or ``DATABASE_URL``) and skips otherwise. Emails are
uuid-unique, so a re-used database never interferes.
"""

from __future__ import annotations

import os
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, make_url, text
from starlette.requests import Request

_RAW_DSN = os.environ.get("KB_TEST_DATABASE_URL") or os.environ.get("DATABASE_URL")


@pytest.fixture
def switch_client(tmp_path, monkeypatch):
    """A TestClient wired to a Postgres accounts plane + an on-disk KB root, or skip."""

    if not _RAW_DSN:
        pytest.skip(
            "set KB_TEST_DATABASE_URL (or DATABASE_URL) to a disposable Postgres to "
            "run the org-switch tests"
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

    from server.persistence.base import Base
    from server.persistence import models  # noqa: F401 - registers the tables

    Base.metadata.create_all(sync_engine, checkfirst=True)

    (tmp_path / "docs").mkdir()
    monkeypatch.setenv("KB_ROOT", str(tmp_path))
    monkeypatch.setenv("KB_DB_PATH", str(tmp_path / "data" / "kb.sqlite3"))
    monkeypatch.setenv("DATABASE_URL", url)
    monkeypatch.setenv("KB_AUTH_RATE_LIMIT", "0")
    import server.api_auth as api_auth
    import server.persistence.engine as engine_mod

    engine_mod._engine = None
    engine_mod._session_maker = None
    api_auth._tenant_one_cache = None

    from server.main import app

    with TestClient(app) as client:
        yield client

    api_auth._tenant_one_cache = None
    engine_mod._engine = None
    engine_mod._session_maker = None
    sync_engine.dispose()


def _signup(client: TestClient) -> dict:
    res = client.post(
        "/auth/signup",
        json={"email": f"p56s2-{uuid4().hex}@example.com", "password": "hunter2pass"},
    )
    assert res.status_code == 201, res.text
    return res.json()


def _second_org(client: TestClient, user_id: str) -> str:
    """Put an existing user into a second, newer org through the service."""

    from server.accounts.service import get_accounts_service

    tenant, _member = client.portal.call(
        get_accounts_service().create_tenant_with_owner, UUID(user_id), "second"
    )
    return str(tenant.id)


def _doc(project: str) -> dict:
    return {
        "title": "Org Switch",
        "markdown": "# Org Switch\n\nBody.\n",
        "project": project,
        "tags": ["testing", "orgswitch"],
        "source_repo": "org-switch-test",
        "commit": False,
    }


def _request(headers: dict[str, str]) -> Request:
    raw = [(k.lower().encode(), v.encode()) for k, v in headers.items()]
    return Request({"type": "http", "method": "GET", "path": "/", "headers": raw})


def test_new_tenant_plan_is_free(switch_client):
    body = _signup(switch_client)
    session = {"Authorization": f"Bearer {body['token']}"}
    res = switch_client.get("/app/tenant", headers=session)
    assert res.status_code == 200, res.text
    assert res.json()["tenant"]["plan"] == "free"

    # The one tenant write the API has (the slug PATCH) never writes the plan.
    slug = f"org-{uuid4().hex[:10]}"
    patched = switch_client.patch(
        "/app/tenant", json={"slug": slug, "plan": "pro"}, headers=session
    )
    assert patched.status_code == 200, patched.text
    assert patched.json()["tenant"]["plan"] == "free"


def test_header_picks_the_active_org(switch_client):
    body = _signup(switch_client)
    org_a = body["tenant"]["id"]
    org_b = _second_org(switch_client, body["user"]["id"])
    session = {"Authorization": f"Bearer {body['token']}"}
    in_b = {**session, "X-Hi2vi-Org": org_b}

    # No header: the first tenant, as before.
    assert switch_client.get("/app/tenant", headers=session).json()["tenant"]["id"] == org_a
    me = switch_client.get("/auth/me", headers=session).json()
    assert me["active_tenant_id"] == org_a
    assert [t["id"] for t in me["tenants"]] == [org_a, org_b]

    # The header moves the session into org B, for reads and writes.
    assert switch_client.get("/app/tenant", headers=in_b).json()["tenant"]["id"] == org_b
    assert switch_client.get("/auth/me", headers=in_b).json()["active_tenant_id"] == org_b
    made = switch_client.post("/app/projects", json={"name": "in-b"}, headers=in_b)
    assert made.status_code == 201, made.text
    assert made.json()["project"]["tenant_id"] == org_b
    names_b = {p["name"] for p in switch_client.get("/app/projects", headers=in_b).json()["projects"]}
    names_a = {p["name"] for p in switch_client.get("/app/projects", headers=session).json()["projects"]}
    assert "in-b" in names_b and "in-b" not in names_a

    # The content plane's session step honours it too.
    write = switch_client.post("/api/documents", json=_doc("cp-b"), headers=in_b)
    assert write.status_code == 201, write.text
    cp_b = {p["project"] for p in switch_client.get("/api/projects", headers=in_b).json()["projects"]}
    cp_a = {p["project"] for p in switch_client.get("/api/projects", headers=session).json()["projects"]}
    assert "cp-b" in cp_b and "cp-b" not in cp_a


def test_header_naming_a_foreign_or_malformed_org_is_403(switch_client):
    me = _signup(switch_client)
    other = _signup(switch_client)
    session = {"Authorization": f"Bearer {me['token']}"}
    owner_c = {"Authorization": f"Bearer {other['token']}"}
    org_c = other["tenant"]["id"]

    for bad in (org_c, str(uuid4()), "not-a-uuid"):
        hdr = {**session, "X-Hi2vi-Org": bad}
        assert switch_client.get("/app/tenant", headers=hdr).status_code == 403, bad
        assert switch_client.get("/auth/me", headers=hdr).status_code == 403, bad
        assert switch_client.post(
            "/app/projects", json={"name": "intrude"}, headers=hdr
        ).status_code == 403, bad
        # The optional-identity read surface and the content plane refuse it too.
        assert switch_client.get("/app/documents/1", headers=hdr).status_code == 403, bad
        assert switch_client.get("/api/projects", headers=hdr).status_code == 403, bad
        assert switch_client.post(
            "/api/documents", json=_doc("intrude"), headers=hdr
        ).status_code == 403, bad

    names_c = {p["name"] for p in switch_client.get("/app/projects", headers=owner_c).json()["projects"]}
    assert "intrude" not in names_c
    cp_c = {p["project"] for p in switch_client.get("/api/projects", headers=owner_c).json()["projects"]}
    assert "intrude" not in cp_c


def test_keys_and_master_bearer_ignore_the_header(switch_client, monkeypatch):
    body = _signup(switch_client)
    org_a = body["tenant"]["id"]
    org_b = _second_org(switch_client, body["user"]["id"])
    session = {"Authorization": f"Bearer {body['token']}"}
    key = switch_client.post("/app/credentials", headers=session).json()["key"]

    for n, hdr_value in enumerate((org_b, "not-a-uuid")):
        write = switch_client.post(
            "/api/documents",
            json={**_doc("by-key"), "title": f"Key Write {n}"},
            headers={"Authorization": f"Bearer {key}", "X-Hi2vi-Org": hdr_value},
        )
        assert write.status_code == 201, write.text
    in_b = {**session, "X-Hi2vi-Org": org_b}
    assert "by-key" in {p["project"] for p in switch_client.get("/api/projects", headers=session).json()["projects"]}
    assert "by-key" not in {p["project"] for p in switch_client.get("/api/projects", headers=in_b).json()["projects"]}

    # The master bearer maps to tenant #1 (this user's first tenant) whatever the header says.
    import server.api_auth as api_auth

    monkeypatch.setenv("KB_API_TOKEN", "p56s2-master")
    monkeypatch.setenv("KB_OPERATOR_EMAIL", body["user"]["email"])
    api_auth._tenant_one_cache = None
    ctx = switch_client.portal.call(
        api_auth.resolve_api_read,
        _request({"Authorization": "Bearer p56s2-master", "X-Hi2vi-Org": org_b}),
    )
    assert str(ctx.tenant_id) == org_a and ctx.scope == "full"


def test_capture_scope_is_refused_by_the_library(switch_client):
    session = {"Authorization": f"Bearer {_signup(switch_client)['token']}"}
    mint = switch_client.post("/app/credentials", json={"scope": "capture"}, headers=session)
    assert mint.status_code == 201, mint.text
    assert mint.json()["credential"]["scope"] == "capture"
    capture = {"Authorization": f"Bearer {mint.json()['key']}"}

    assert switch_client.get("/api/projects", headers=capture).status_code == 403
    assert switch_client.post("/api/documents", json=_doc("cap"), headers=capture).status_code == 403

    # resolve_api_capture (S5/S6's resolver) accepts it, and a full key.
    import server.api_auth as api_auth

    ctx = switch_client.portal.call(api_auth.resolve_api_capture, _request(capture))
    assert ctx.scope == "capture" and ctx.credential_id is not None
    full = switch_client.post("/app/credentials", headers=session).json()
    assert full["credential"]["scope"] == "full"
    ctx = switch_client.portal.call(
        api_auth.resolve_api_capture, _request({"Authorization": f"Bearer {full['key']}"})
    )
    assert ctx.scope == "full"
    assert switch_client.get(
        "/api/projects", headers={"Authorization": f"Bearer {full['key']}"}
    ).status_code == 200


def test_mint_accepts_only_known_scopes(switch_client):
    body = _signup(switch_client)
    session = {"Authorization": f"Bearer {body['token']}"}
    for path in ("/app/credentials", f"/app/projects/{body['project']['id']}/credentials"):
        assert switch_client.post(path, json={"scope": "admin"}, headers=session).status_code == 422
        ok = switch_client.post(path, json={"scope": "capture"}, headers=session)
        assert ok.status_code == 201 and ok.json()["credential"]["scope"] == "capture"


def test_service_validates_scope_and_adds_members(switch_client):
    """The service's own guards: an unknown scope never reaches the table, and an
    existing user can be added to an existing org (the migration's call)."""

    from server.accounts.service import get_accounts_service
    from server.accounts.types import CreateProjectCredential

    owner = _signup(switch_client)
    joiner = _signup(switch_client)
    service = get_accounts_service()
    with pytest.raises(ValueError):
        switch_client.portal.call(
            service.create_project_credential,
            CreateProjectCredential(
                tenant_id=UUID(owner["tenant"]["id"]),
                token_prefix="vk_x",
                token_hash=uuid4().hex,
                scope="admin",
            ),
        )

    switch_client.portal.call(
        service.add_tenant_member, UUID(owner["tenant"]["id"]), UUID(joiner["user"]["id"]), "member"
    )
    in_owner_org = {
        "Authorization": f"Bearer {joiner['token']}",
        "X-Hi2vi-Org": owner["tenant"]["id"],
    }
    res = switch_client.get("/app/tenant", headers=in_owner_org)
    assert res.status_code == 200 and res.json()["tenant"]["id"] == owner["tenant"]["id"]


def test_joining_an_older_org_moves_neither_tenant_one_nor_the_default_org(switch_client, monkeypatch):
    """The operator owns tenant #1 (made at signup), then joins an org whose
    ``created_at`` is older (the accounts merge's shape). The master bearer, the
    public corpus and a header-less session all stay on tenant #1."""

    import server.api_auth as api_auth
    from server.accounts.service import get_accounts_service

    operator = _signup(switch_client)
    tenant_one = operator["tenant"]["id"]
    elder = _signup(switch_client)
    older_org = elder["tenant"]["id"]
    url = make_url(_RAW_DSN).set(drivername="postgresql+psycopg")
    engine = create_engine(url)
    try:
        with engine.begin() as conn:
            conn.execute(
                text(
                    "UPDATE tenants SET created_at = "
                    "(SELECT created_at FROM tenants WHERE id = :one) - interval '1 day' "
                    "WHERE id = :old"
                ),
                {"one": tenant_one, "old": older_org},
            )
    finally:
        engine.dispose()
    # Joined as an owner, the strongest case: an "earliest owned" rule alone would move.
    switch_client.portal.call(
        get_accounts_service().add_tenant_member, UUID(older_org), UUID(operator["user"]["id"]), "owner"
    )

    monkeypatch.setenv("KB_API_TOKEN", "p56s14-master")
    monkeypatch.setenv("KB_OPERATOR_EMAIL", operator["user"]["email"])
    api_auth._tenant_one_cache = None  # an API restart
    master = switch_client.portal.call(
        api_auth.resolve_api_read, _request({"Authorization": "Bearer p56s14-master"})
    )
    assert str(master.tenant_id) == tenant_one and master.is_public

    session = {"Authorization": f"Bearer {operator['token']}"}
    elder_key = switch_client.post(
        "/app/credentials", headers={"Authorization": f"Bearer {elder['token']}"}
    ).json()["key"]
    in_older = switch_client.portal.call(
        api_auth.resolve_api_read, _request({"Authorization": f"Bearer {elder_key}"})
    )
    assert str(in_older.tenant_id) == older_org and not in_older.is_public

    assert switch_client.get("/app/tenant", headers=session).json()["tenant"]["id"] == tenant_one
    me = switch_client.get("/auth/me", headers=session).json()
    assert me["active_tenant_id"] == tenant_one
    assert [t["id"] for t in me["tenants"]] == [tenant_one, older_org]
    # The older org's own founder still defaults to it.
    founder = {"Authorization": f"Bearer {elder['token']}"}
    assert switch_client.get("/app/tenant", headers=founder).json()["tenant"]["id"] == older_org


def test_missing_session_with_header_is_still_401(switch_client):
    org = _signup(switch_client)["tenant"]["id"]
    assert switch_client.get("/app/tenant", headers={"X-Hi2vi-Org": org}).status_code == 401
    assert switch_client.get(
        "/app/tenant", headers={"Authorization": "Bearer nope", "X-Hi2vi-Org": org}
    ).status_code == 401


def test_no_header_value_means_first_tenant(switch_client):
    """A blank header is treated as absent (a BFF with no cookie yet)."""

    body = _signup(switch_client)
    _second_org(switch_client, body["user"]["id"])
    hdr = {"Authorization": f"Bearer {body['token']}", "X-Hi2vi-Org": ""}
    assert switch_client.get("/app/tenant", headers=hdr).json()["tenant"]["id"] == body["tenant"]["id"]
