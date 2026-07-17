"""The /app/documents + /app/search read routes (P12.S5): shapes, tenant isolation,
the project UUID->name bridge, and unmetered-ness.

Follows the P12.S3 accounts test pattern (see ``tests/test_dashboard_api.py``): the
accounts plane is Postgres-only, so this suite runs **only when a disposable Postgres
is provided** via ``KB_TEST_DATABASE_URL`` (preferred) or ``DATABASE_URL`` and skips
cleanly otherwise. It seeds the accounts plane through the real HTTP surface (signup /
create-project) and the content plane by writing documents straight into the throwaway
SQLite (``db.upsert_document``, ``tenant_id`` = the signed-up tenant's uuid), then
drives the routes with the repo's usual sync ``TestClient``. Seed emails are
uuid-unique and every assertion is scoped to the caller's own tenant, so a shared DB
never interferes.
"""

from __future__ import annotations

import os
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, make_url, text

from server import db

_RAW_DSN = os.environ.get("KB_TEST_DATABASE_URL") or os.environ.get("DATABASE_URL")


def _url(raw: str) -> str:
    """Return the psycopg SQLAlchemy URL for a raw DSN (async + sync share it)."""

    return (
        make_url(raw)
        .set(drivername="postgresql+psycopg")
        .render_as_string(hide_password=False)
    )


@pytest.fixture
def documents_client(tmp_path, monkeypatch):
    """A TestClient over a Postgres accounts plane + throwaway SQLite, or skip."""

    if not _RAW_DSN:
        pytest.skip(
            "set KB_TEST_DATABASE_URL (or DATABASE_URL) to a disposable Postgres to "
            "run the /app/documents route test"
        )

    url = _url(_RAW_DSN)

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

    # Content plane on a throwaway SQLite path; accounts plane on the test DSN with a
    # fresh async engine in the TestClient loop (KB_STARTUP_REINDEX=0 comes from the
    # autouse conftest fixture, so no boot reindex touches the real docs/ tree).
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


def _signup(client: TestClient, email: str) -> tuple[dict[str, str], str]:
    res = client.post("/auth/signup", json={"email": email, "password": "hunter2pass"})
    assert res.status_code == 201, res.text
    body = res.json()
    return {"Authorization": f"Bearer {body['token']}"}, body["tenant"]["id"]


def _project(client: TestClient, headers: dict[str, str], name: str) -> str:
    res = client.post("/app/projects", json={"name": name}, headers=headers)
    assert res.status_code == 201, res.text
    return res.json()["project"]["id"]


def _seed_doc(
    tenant_id: str,
    project: str,
    *,
    slug: str,
    title: str,
    markdown: str,
    date: str = "2026-01-01",
    tags: list[str] | None = None,
) -> int:
    """Write one document straight into the throwaway SQLite (scoped to tenant_id)."""

    conn = db.connect()
    try:
        return db.upsert_document(
            conn,
            project=project,
            slug=slug,
            date=date,
            title=title,
            tags=tags or [],
            source_repo="acme/repo",
            rel_path=f"{project}/{date}-{slug}.md",
            markdown=markdown,
            related=[],
            tenant_id=tenant_id,
        )
    finally:
        conn.close()


_LIST_KEYS = {
    "id",
    "project",
    "slug",
    "date",
    "title",
    "tags",
    "rel_path",
    "source_repo",
    "related",
    "created_at",
    "updated_at",
}


def test_documents_list_detail_and_project_bridge(documents_client):
    client, _ = documents_client
    headers, tenant_id = _signup(client, f"owner-{uuid4()}@example.com")
    alpha = _project(client, headers, "alpha")
    _project(client, headers, "beta")

    # Two alpha docs on different dates (newest-first check) + one beta doc.
    _seed_doc(tenant_id, "alpha", slug="old", title="Old alpha", markdown="# old\nbody", date="2026-01-01")
    newest = _seed_doc(tenant_id, "alpha", slug="new", title="New alpha", markdown="# new\nbody", date="2026-03-01", tags=["ml"])
    _seed_doc(tenant_id, "beta", slug="b1", title="Beta one", markdown="# beta\nbody", date="2026-02-01")

    res = client.get("/app/documents", headers=headers)
    assert res.status_code == 200, res.text
    page = res.json()
    assert page["total"] == 3
    titles = [item["title"] for item in page["items"]]
    assert titles[0] == "New alpha"  # date DESC, newest first
    # Projector: list items carry no markdown / tags_text / tenant_id.
    item = page["items"][0]
    assert set(item) == _LIST_KEYS
    assert "markdown" not in item and "tags_text" not in item and "tenant_id" not in item

    # The project UUID -> name bridge: filtering by alpha's control-plane UUID returns
    # only alpha's two docs (documents key off the project NAME, resolved from the id).
    res = client.get("/app/documents", params={"project": alpha}, headers=headers)
    assert res.status_code == 200, res.text
    filtered = res.json()
    assert filtered["total"] == 2
    assert {item["project"] for item in filtered["items"]} == {"alpha"}

    # Detail carries markdown, still no tags_text / tenant_id.
    res = client.get(f"/app/documents/{newest}", headers=headers)
    assert res.status_code == 200, res.text
    doc = res.json()
    assert doc["markdown"].startswith("# new")
    assert "tags_text" not in doc and "tenant_id" not in doc
    assert doc["tags"] == ["ml"]


def test_documents_tenant_isolation(documents_client):
    client, _ = documents_client
    a_headers, a_tenant = _signup(client, f"a-{uuid4()}@example.com")
    b_headers, b_tenant = _signup(client, f"b-{uuid4()}@example.com")
    a_project = _project(client, a_headers, "shared")
    b_project = _project(client, b_headers, "shared")  # same name, other tenant

    _seed_doc(a_tenant, "shared", slug="a", title="Tenant A note", markdown="alpine kubernetes")
    b_doc = _seed_doc(b_tenant, "shared", slug="b", title="Tenant B note", markdown="alpine kubernetes")

    # A's list never contains B's doc, even with the same project name.
    page = client.get("/app/documents", headers=a_headers).json()
    assert page["total"] == 1
    assert page["items"][0]["title"] == "Tenant A note"

    # B's doc id -> 404 for A (cross-tenant id never leaks: 404, not 403).
    assert client.get(f"/app/documents/{b_doc}", headers=a_headers).status_code == 404
    # B's project UUID -> 404 for A (the bridge is tenant-scoped).
    assert (
        client.get("/app/documents", params={"project": b_project}, headers=a_headers).status_code
        == 404
    )
    # A genuinely random UUID -> 404 too.
    assert (
        client.get("/app/documents", params={"project": str(uuid4())}, headers=a_headers).status_code
        == 404
    )

    # Search is tenant-scoped as well: A's own project's UUID resolves; B's doc never
    # surfaces even though both docs share the term.
    results = client.get(
        "/app/search", params={"q": "kubernetes", "project": a_project}, headers=a_headers
    ).json()
    assert {r["title"] for r in results["results"]} == {"Tenant A note"}


def test_documents_search_shape(documents_client):
    client, tenant = documents_client[0], None
    headers, tenant = _signup(client, f"search-{uuid4()}@example.com")
    _project(client, headers, "alpha")
    _seed_doc(tenant, "alpha", slug="k8s", title="Running Kubernetes", markdown="deploy on kubernetes clusters")

    res = client.get("/app/search", params={"q": "kubernetes"}, headers=headers)
    assert res.status_code == 200, res.text
    body = res.json()
    assert set(body) >= {"query", "mode", "total", "limit", "offset", "results"}
    assert body["query"] == "kubernetes"
    assert body["total"] == 1
    hit = body["results"][0]
    assert hit["title"] == "Running Kubernetes"
    assert "snippet" in hit and "score" in hit
    assert "markdown" not in hit and "tenant_id" not in hit

    # A term that matches nothing -> empty result set, not an error.
    empty = client.get("/app/search", params={"q": "zzznomatchxyz"}, headers=headers).json()
    assert empty["total"] == 0 and empty["results"] == []


def test_documents_are_unmetered(documents_client):
    client, sync_engine = documents_client
    headers, tenant = _signup(client, f"meter-{uuid4()}@example.com")
    _project(client, headers, "alpha")
    doc = _seed_doc(tenant, "alpha", slug="m", title="Metered?", markdown="searchterm body")

    def _event_count() -> int:
        with sync_engine.connect() as conn:
            return conn.execute(text("SELECT count(*) FROM usage_events")).scalar_one()

    before = _event_count()
    assert client.get("/app/documents", headers=headers).status_code == 200
    assert client.get(f"/app/documents/{doc}", headers=headers).status_code == 200
    assert client.get("/app/search", params={"q": "searchterm"}, headers=headers).status_code == 200
    # Web-UI browse/search records no usage event (unlike the metered /api/search).
    assert _event_count() == before


def test_documents_require_auth(documents_client):
    client, _ = documents_client
    assert client.get("/app/documents").status_code == 401
    assert client.get("/app/documents/1").status_code == 401
    assert client.get("/app/search", params={"q": "x"}).status_code == 401
