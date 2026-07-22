"""Org-level keys + get-or-create projects (P18.S2): Postgres-gated.

Like ``test_accounts_provisioning.py``, the accounts plane is Postgres-only, so this
terse suite runs **only** with a disposable Postgres via ``KB_TEST_DATABASE_URL``
(preferred) or ``DATABASE_URL`` and skips cleanly otherwise. It drives the real HTTP
surface: mint an org key (``project_id NULL``), prove it authorizes ``POST
/api/documents`` and that the write get-or-creates the registry project, that a
project-bound key still writes, that a revoked org key is rejected, and that a
duplicate ``POST /app/projects`` is idempotent (no 500). Signup emails are
uuid-unique so a shared/re-used database never interferes.
"""

from __future__ import annotations

import os
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, make_url, text

_RAW_DSN = os.environ.get("KB_TEST_DATABASE_URL") or os.environ.get("DATABASE_URL")


@pytest.fixture
def org_client(tmp_path, monkeypatch):
    """A TestClient wired to a Postgres accounts plane + an on-disk KB root, or skip."""

    if not _RAW_DSN:
        pytest.skip(
            "set KB_TEST_DATABASE_URL (or DATABASE_URL) to a disposable Postgres to "
            "run the org-credentials tests"
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
    import server.persistence.engine as engine_mod

    engine_mod._engine = None
    engine_mod._session_maker = None

    from server.main import app

    with TestClient(app) as client:
        yield client

    engine_mod._engine = None
    engine_mod._session_maker = None
    sync_engine.dispose()


def _signup(client: TestClient) -> dict:
    res = client.post(
        "/auth/signup",
        json={"email": f"p18s2-{uuid4().hex}@example.com", "password": "hunter2pass"},
    )
    assert res.status_code == 201, res.text
    return res.json()


def _doc_payload(project: str) -> dict:
    return {
        "title": "Org Key Smoke",
        "markdown": "# Org Key Smoke\n\nBody.\n",
        "project": project,
        "tags": ["testing", "orgkey"],
        "source_repo": "org-test",
        "commit": False,
    }


def test_org_key_mints_authorizes_write_and_get_or_creates_project(org_client):
    """Org mint -> project_id null; the key authorizes a write that get-or-creates."""

    session = {"Authorization": f"Bearer {_signup(org_client)['token']}"}

    mint = org_client.post("/app/credentials", headers=session)
    assert mint.status_code == 201, mint.text
    assert mint.json()["credential"]["project_id"] is None
    org_key = mint.json()["key"]

    # "alpha" does not exist yet — the write must get-or-create it.
    write = org_client.post(
        "/api/documents",
        json=_doc_payload("alpha"),
        headers={"Authorization": f"Bearer {org_key}"},
    )
    assert write.status_code == 201, write.text
    # Tenant-mode 201 `url` is the direct doc page, not the legacy mkdocs shape (P19.S4).
    saved = write.json()
    assert saved["url"].endswith(f"/documents/{saved['id']}")

    projects = org_client.get("/app/projects", headers=session).json()["projects"]
    names = {p["name"] for p in projects}
    assert "default" in names and "alpha" in names  # get-or-create landed the row


def test_project_bound_key_still_writes(org_client):
    """Regression: a project-bound vk_ key keeps authorizing writes unchanged."""

    body = _signup(org_client)
    session = {"Authorization": f"Bearer {body['token']}"}

    mint = org_client.post(
        f"/app/projects/{body['project']['id']}/credentials", headers=session
    )
    assert mint.status_code == 201, mint.text
    assert mint.json()["credential"]["project_id"] == body["project"]["id"]

    write = org_client.post(
        "/api/documents",
        json=_doc_payload("default"),
        headers={"Authorization": f"Bearer {mint.json()['key']}"},
    )
    assert write.status_code == 201, write.text


def test_revoked_org_key_is_unauthorized(org_client):
    """A revoked org key resolves to nothing -> 401 on the content plane."""

    session = {"Authorization": f"Bearer {_signup(org_client)['token']}"}
    mint = org_client.post("/app/credentials", headers=session)
    credential_id = mint.json()["credential"]["id"]
    org_key = mint.json()["key"]

    revoke = org_client.delete(f"/app/credentials/{credential_id}", headers=session)
    assert revoke.status_code == 204, revoke.text

    write = org_client.post(
        "/api/documents",
        json=_doc_payload("beta"),
        headers={"Authorization": f"Bearer {org_key}"},
    )
    assert write.status_code == 401, write.text


def test_duplicate_create_project_is_idempotent(org_client):
    """A duplicate POST /app/projects returns the same row (201), never a 500."""

    session = {"Authorization": f"Bearer {_signup(org_client)['token']}"}

    first = org_client.post("/app/projects", json={"name": "dup"}, headers=session)
    assert first.status_code == 201, first.text
    again = org_client.post("/app/projects", json={"name": "dup"}, headers=session)
    assert again.status_code == 201, again.text
    assert again.json()["project"]["id"] == first.json()["project"]["id"]
