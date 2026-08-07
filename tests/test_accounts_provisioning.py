"""Signup provisioning + tenant-scoped credentials (P18.S1): Postgres-gated.

Like ``test_dashboard_api.py``, the accounts plane is Postgres-only (the ORM uses
``postgresql.UUID`` columns), so this terse suite runs **only when a disposable
Postgres is provided** via ``KB_TEST_DATABASE_URL`` (preferred) or ``DATABASE_URL``
and skips cleanly otherwise — the default ``pytest`` run stays green without one.

It drives the real HTTP surface (signup / list-projects / mint) and reads the one
column the response never exposes (``project_credentials.tenant_id``) back with a
throwaway sync engine. Signup emails are uuid-unique and every assertion is scoped
to the caller's own tenant, so a shared/re-used database never interferes.
"""

from __future__ import annotations

import os
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, make_url, text

_RAW_DSN = os.environ.get("KB_TEST_DATABASE_URL") or os.environ.get("DATABASE_URL")


@pytest.fixture
def accounts_client(tmp_path, monkeypatch):
    """A TestClient wired to a Postgres accounts plane, or skip when none is given."""

    if not _RAW_DSN:
        pytest.skip(
            "set KB_TEST_DATABASE_URL (or DATABASE_URL) to a disposable Postgres to "
            "run the accounts provisioning tests"
        )

    url = (
        make_url(_RAW_DSN)
        .set(drivername="postgresql+psycopg")
        .render_as_string(hide_password=False)
    )

    # A short-lived sync engine owns DDL + direct reads, so the app's async engine is
    # created fresh inside the TestClient event loop and never shared across loops.
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

    monkeypatch.setenv("KB_DB_PATH", str(tmp_path / "data" / "kb.sqlite3"))
    monkeypatch.setenv("DATABASE_URL", url)
    # The /auth throttle counts per (IP, path) in a PROCESS-global dict shared by every
    # suite in the session, so seed signups here eat into the later suites' budget. No
    # pytest test asserts on throttling — disable it (same call as ``documents_client``).
    monkeypatch.setenv("KB_AUTH_RATE_LIMIT", "0")
    import server.persistence.engine as engine_mod

    engine_mod._engine = None
    engine_mod._session_maker = None

    from server.main import app

    with TestClient(app) as client:
        yield client, sync_engine

    engine_mod._engine = None
    engine_mod._session_maker = None
    sync_engine.dispose()


def _signup(client: TestClient) -> dict:
    res = client.post(
        "/auth/signup",
        json={"email": f"p18-{uuid4().hex}@example.com", "password": "hunter2pass"},
    )
    assert res.status_code == 201, res.text
    return res.json()


def test_signup_provisions_default_org_and_project(accounts_client):
    """Signup returns a "default" org + "default" project, visible via /app."""

    client, _sync = accounts_client
    body = _signup(client)
    assert body["tenant"]["name"] == "default"
    assert body["project"]["name"] == "default"

    headers = {"Authorization": f"Bearer {body['token']}"}
    res = client.get("/app/projects", headers=headers)
    assert res.status_code == 200, res.text
    assert [p["name"] for p in res.json()["projects"]] == ["default"]


def test_minted_credential_carries_tenant_id(accounts_client):
    """A minted project credential persists tenant_id (= the project's tenant)."""

    client, sync_engine = accounts_client
    body = _signup(client)
    headers = {"Authorization": f"Bearer {body['token']}"}

    res = client.post(
        f"/app/projects/{body['project']['id']}/credentials", headers=headers
    )
    assert res.status_code == 201, res.text
    credential_id = res.json()["credential"]["id"]

    with sync_engine.connect() as conn:
        row = conn.execute(
            text(
                "SELECT tenant_id, project_id FROM project_credentials WHERE id = :id"
            ),
            {"id": credential_id},
        ).one()
    assert str(row.tenant_id) == body["tenant"]["id"]
    assert str(row.project_id) == body["project"]["id"]


def test_new_project_defaults_private(accounts_client):
    """Signup's project is private, on the create response and both read shapes."""

    client, _sync = accounts_client
    body = _signup(client)
    assert body["project"]["visibility"] == "private"

    headers = {"Authorization": f"Bearer {body['token']}"}
    listed = client.get("/app/projects", headers=headers)
    assert listed.status_code == 200, listed.text
    assert listed.json()["projects"][0]["visibility"] == "private"

    one = client.get(f"/app/projects/{body['project']['id']}", headers=headers)
    assert one.status_code == 200, one.text
    assert one.json()["project"]["visibility"] == "private"


def test_patch_visibility_toggles_both_ways(accounts_client):
    """PATCH flips visibility to public and back to private, returning the new value."""

    client, _sync = accounts_client
    body = _signup(client)
    headers = {"Authorization": f"Bearer {body['token']}"}
    project_id = body["project"]["id"]

    public = client.patch(
        f"/app/projects/{project_id}", json={"visibility": "public"}, headers=headers
    )
    assert public.status_code == 200, public.text
    assert public.json()["project"]["visibility"] == "public"

    private = client.patch(
        f"/app/projects/{project_id}", json={"visibility": "private"}, headers=headers
    )
    assert private.status_code == 200, private.text
    assert private.json()["project"]["visibility"] == "private"


def test_patch_visibility_missing_project_is_404(accounts_client):
    """PATCH an unknown project id -> 404 (never leaks cross-tenant existence)."""

    client, _sync = accounts_client
    headers = {"Authorization": f"Bearer {_signup(client)['token']}"}
    res = client.patch(
        f"/app/projects/{uuid4()}", json={"visibility": "public"}, headers=headers
    )
    assert res.status_code == 404, res.text


def test_patch_visibility_invalid_value_is_422(accounts_client):
    """PATCH an out-of-enum visibility value -> 422 from the Literal, no DB write."""

    client, _sync = accounts_client
    body = _signup(client)
    headers = {"Authorization": f"Bearer {body['token']}"}
    res = client.patch(
        f"/app/projects/{body['project']['id']}",
        json={"visibility": "unlisted"},
        headers=headers,
    )
    assert res.status_code == 422, res.text


# -- org slug (P25.S1) ------------------------------------------------------
# The tenant's durable public identity: nullable until claimed, unique, lowercase,
# and guarded by the shared charset + reserved-word rules in server.accounts.slugs.


def test_tenant_slug_starts_null_and_round_trips(accounts_client):
    """A fresh tenant has slug None; PATCH claims it and GET /app/tenant reads it back."""

    client, _sync = accounts_client
    body = _signup(client)
    assert body["tenant"]["slug"] is None
    headers = {"Authorization": f"Bearer {body['token']}"}

    # Slugs are globally UNIQUE, so the claimed value must be uuid-unique or a re-run
    # against a re-used database would 409 on the row the previous run left behind.
    slug = f"org-{uuid4().hex[:10]}"

    # Mixed case + surrounding whitespace normalize to the stored lowercase form.
    res = client.patch(
        "/app/tenant", json={"slug": f"  {slug.upper()}  "}, headers=headers
    )
    assert res.status_code == 200, res.text
    assert res.json()["tenant"]["slug"] == slug

    read = client.get("/app/tenant", headers=headers)
    assert read.status_code == 200, read.text
    assert read.json()["tenant"]["slug"] == slug


def test_tenant_slug_reserved_is_422(accounts_client):
    """A reserved word is rejected 422 and nothing is written."""

    client, _sync = accounts_client
    headers = {"Authorization": f"Bearer {_signup(client)['token']}"}

    res = client.patch("/app/tenant", json={"slug": "dashboard"}, headers=headers)
    assert res.status_code == 422, res.text
    assert client.get("/app/tenant", headers=headers).json()["tenant"]["slug"] is None


def test_tenant_slug_malformed_is_422(accounts_client):
    """Bad charset, bad hyphenation, and too-short all fail the shared rules."""

    client, _sync = accounts_client
    headers = {"Authorization": f"Bearer {_signup(client)['token']}"}

    for bad in ("Not Valid", "-lead", "trail-", "double--hyphen", "a", "under_score"):
        res = client.patch("/app/tenant", json={"slug": bad}, headers=headers)
        assert res.status_code == 422, f"{bad!r} -> {res.status_code}: {res.text}"


def test_tenant_slug_duplicate_across_tenants_is_409(accounts_client):
    """A slug held by another tenant is a clean 409, and re-claiming your own is fine."""

    client, _sync = accounts_client
    first = {"Authorization": f"Bearer {_signup(client)['token']}"}
    second = {"Authorization": f"Bearer {_signup(client)['token']}"}
    slug = f"org-{uuid4().hex[:10]}"

    assert client.patch("/app/tenant", json={"slug": slug}, headers=first).status_code == 200
    # Case-insensitive: the normalized form is what collides.
    taken = client.patch("/app/tenant", json={"slug": slug.upper()}, headers=second)
    assert taken.status_code == 409, taken.text
    # Idempotent for the holder, and the loser still has no slug.
    assert client.patch("/app/tenant", json={"slug": slug}, headers=first).status_code == 200
    assert client.get("/app/tenant", headers=second).json()["tenant"]["slug"] is None
