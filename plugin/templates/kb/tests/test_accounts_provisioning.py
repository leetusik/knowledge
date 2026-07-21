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
