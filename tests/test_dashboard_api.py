"""GET /app/dashboard aggregate route (P12.S3): shape, tenant isolation, unmetered.

The accounts/usage plane is Postgres-only (the ORM uses ``postgresql.UUID`` columns,
so SQLite cannot back it), and this repo has no accounts pytest harness yet. This
terse suite therefore runs **only when a disposable Postgres is provided** via
``KB_TEST_DATABASE_URL`` (preferred) or ``DATABASE_URL`` — and skips cleanly
otherwise, so the default ``pytest`` run stays green on a machine without Postgres.

Given a DSN it: creates the control-plane tables with a throwaway *sync* engine
(``Base.metadata.create_all``, so no cross-event-loop engine sharing with the app),
seeds two tenants entirely through the real HTTP surface (signup / create-project /
mint / revoke) plus a few direct ``usage_events`` inserts, then drives the route with
the repo's usual sync ``TestClient``. Seed emails are uuid-unique and every assertion
is scoped to the caller's own tenant, so a shared/re-used database never interferes.
"""

from __future__ import annotations

import os
from datetime import UTC, datetime
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, make_url, text

from server.usage.types import (
    EVENT_DOCUMENT_CREATED,
    EVENT_DOCUMENT_DELETED,
    EVENT_SEARCH,
)

_RAW_DSN = os.environ.get("KB_TEST_DATABASE_URL") or os.environ.get("DATABASE_URL")


def _urls(raw: str) -> tuple[str, str]:
    """Return (async_url, sync_url) for the psycopg driver from a raw DSN."""

    url = make_url(raw)
    async_url = url.set(drivername="postgresql+psycopg").render_as_string(
        hide_password=False
    )
    sync_url = url.set(drivername="postgresql+psycopg").render_as_string(
        hide_password=False
    )
    return async_url, sync_url


@pytest.fixture
def dashboard_client(tmp_path, monkeypatch):
    """A TestClient wired to a Postgres accounts plane, or skip when none is given."""

    if not _RAW_DSN:
        pytest.skip(
            "set KB_TEST_DATABASE_URL (or DATABASE_URL) to a disposable Postgres to "
            "run the /app/dashboard route test"
        )

    async_url, sync_url = _urls(_RAW_DSN)

    # A short-lived sync engine owns DDL + direct seeding, so the app's async engine
    # is created fresh inside the TestClient event loop and never shared across loops.
    sync_engine = create_engine(sync_url)
    try:
        with sync_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:  # pragma: no cover - environment dependent
        sync_engine.dispose()
        pytest.skip(f"Postgres at the test DSN is unreachable: {exc}")

    from server.persistence.base import Base
    from server.persistence import models  # noqa: F401 - registers the tables

    Base.metadata.create_all(sync_engine, checkfirst=True)

    # Keep the content plane on a throwaway SQLite path; point the accounts plane at
    # the test DSN and force a fresh async engine in the TestClient loop.
    monkeypatch.setenv("KB_DB_PATH", str(tmp_path / "data" / "kb.sqlite3"))
    monkeypatch.setenv("DATABASE_URL", async_url)
    import server.persistence.engine as engine_mod

    engine_mod._engine = None
    engine_mod._session_maker = None

    from server.main import app

    with TestClient(app) as client:
        yield client, sync_engine

    engine_mod._engine = None
    engine_mod._session_maker = None
    sync_engine.dispose()


def _signup(client: TestClient, email: str) -> tuple[dict[str, str], str]:
    res = client.post("/auth/signup", json={"email": email, "password": "hunter2pass"})
    assert res.status_code == 201, res.text
    body = res.json()
    return {"Authorization": f"Bearer {body['token']}"}, body["tenant"]["id"]


def _project(client: TestClient, headers: dict[str, str], name: str) -> str:
    res = client.post("/app/projects", json={"name": name}, headers=headers)
    assert res.status_code == 201, res.text
    return res.json()["project"]["id"]


def _mint(client: TestClient, headers: dict[str, str], project_id: str) -> str:
    res = client.post(f"/app/projects/{project_id}/credentials", headers=headers)
    assert res.status_code == 201, res.text
    return res.json()["credential"]["id"]


def _seed_event(sync_engine, tenant_id: str, project_id: str, event_type: str) -> None:
    with sync_engine.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO usage_events (id, tenant_id, project_id, event_type, occurred_at) "
                "VALUES (:id, :tenant_id, :project_id, :event_type, :occurred_at)"
            ),
            {
                "id": str(uuid4()),
                "tenant_id": tenant_id,
                "project_id": project_id,
                "event_type": event_type,
                "occurred_at": datetime.now(UTC),
            },
        )


def test_dashboard_shape_and_tenant_isolation(dashboard_client):
    client, sync_engine = dashboard_client

    headers, tenant_id = _signup(client, f"owner-{uuid4()}@example.com")
    project_a = _project(client, headers, "alpha")
    project_a2 = _project(client, headers, "beta")
    cred_active = _mint(client, headers, project_a)
    cred_revoked = _mint(client, headers, project_a)

    # Revoke one key on alpha (so keys counts only the survivor) and stamp the
    # active key's recency (so last_used_at is surfaced).
    revoke = client.delete(
        f"/app/projects/{project_a}/credentials/{cred_revoked}", headers=headers
    )
    assert revoke.status_code == 204, revoke.text
    with sync_engine.begin() as conn:
        conn.execute(
            text(
                "UPDATE project_credentials SET last_used_at = :ts WHERE id = :id"
            ),
            {"ts": datetime.now(UTC), "id": cred_active},
        )

    # Two document.created events on alpha within the window -> documents == 2; the
    # deleted/search events must NOT inflate the documents figure.
    _seed_event(sync_engine, tenant_id, project_a, EVENT_DOCUMENT_CREATED)
    _seed_event(sync_engine, tenant_id, project_a, EVENT_DOCUMENT_CREATED)
    _seed_event(sync_engine, tenant_id, project_a, EVENT_DOCUMENT_DELETED)
    _seed_event(sync_engine, tenant_id, project_a, EVENT_SEARCH)

    # A second tenant whose data must never bleed into the first's dashboard.
    other_headers, _ = _signup(client, f"intruder-{uuid4()}@example.com")
    _project(client, other_headers, "intruder-project")
    other_pid = _project(client, other_headers, "intruder-two")
    _mint(client, other_headers, other_pid)

    res = client.get("/app/dashboard", headers=headers)
    assert res.status_code == 200, res.text
    body = res.json()

    rows = {row["name"]: row for row in body["projects"]}
    assert set(rows) == {"alpha", "beta"}  # only the caller's projects, no leak
    assert rows["alpha"]["documents"] == 2
    assert rows["alpha"]["keys"] == 1  # revoked key excluded
    assert rows["alpha"]["last_used_at"] is not None
    assert rows["beta"]["documents"] == 0
    assert rows["beta"]["keys"] == 0
    assert rows["beta"]["last_used_at"] is None
    assert {project_a, project_a2} == {row["id"] for row in body["projects"]}

    # Activity is the real lifecycle events, newest-first, no cross-tenant bleed.
    types = {event["type"] for event in body["activity"]}
    assert types == {"project_created", "key_minted", "key_revoked"}
    names = {event["project_name"] for event in body["activity"]}
    assert names == {"alpha", "beta"}
    assert "intruder-project" not in names and "intruder-two" not in names
    ats = [event["at"] for event in body["activity"]]
    assert ats == sorted(ats, reverse=True)


def test_dashboard_is_unmetered(dashboard_client):
    client, sync_engine = dashboard_client

    headers, _ = _signup(client, f"meter-{uuid4()}@example.com")
    _project(client, headers, "gamma")

    def _event_count() -> int:
        with sync_engine.connect() as conn:
            return conn.execute(text("SELECT count(*) FROM usage_events")).scalar_one()

    before = _event_count()
    assert client.get("/app/dashboard", headers=headers).status_code == 200
    assert client.get("/app/dashboard", headers=headers).status_code == 200
    # A pure read: hitting the dashboard records no usage event.
    assert _event_count() == before


def test_dashboard_requires_auth(dashboard_client):
    client, _ = dashboard_client
    assert client.get("/app/dashboard").status_code == 401
