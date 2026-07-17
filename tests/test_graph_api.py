"""The /app/graph route (P12.S6): graph shape/inversion, the url=/documents/{id}
rewrite, the load-bearing project order, tenant isolation, and unmetered-ness.

Reuses the P12.S5 Postgres harness verbatim (the accounts plane is Postgres-only):
imports ``documents_client`` + the signup/create-project helpers from
``tests/test_documents_api.py``, so this suite skips cleanly without a disposable
Postgres (``KB_TEST_DATABASE_URL`` / ``DATABASE_URL``). Documents (with ``related``
+ ``tags``) are written straight into the throwaway SQLite; the graph is driven with
the repo's usual sync ``TestClient``.
"""

from __future__ import annotations

from uuid import uuid4

from server import db

# The Postgres-gated client fixture + accounts-plane helpers, reused as-is. pytest
# resolves an imported fixture by name in the test module's namespace.
from tests.test_documents_api import (  # noqa: F401
    _project,
    _signup,
    documents_client,
)


def _seed(
    tenant_id: str,
    project: str,
    *,
    slug: str,
    title: str,
    date: str = "2026-01-01",
    tags: list[str] | None = None,
    related: list[str] | None = None,
) -> int:
    """Write one document (with related/tags) into the throwaway SQLite."""

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
            markdown=f"# {title}\nbody",
            related=related or [],
            tenant_id=tenant_id,
        )
    finally:
        conn.close()


def _by_id(nodes: list[dict], node_id: str) -> dict | None:
    return next((n for n in nodes if n["id"] == node_id), None)


def test_graph_shape_inversion_and_url_rewrite(documents_client):
    client, _ = documents_client
    headers, tenant = _signup(client, f"graph-{uuid4()}@example.com")
    # alpha (2 docs) · beta (1 doc) · gamma (1 doc): exercises the (-docs, name)
    # project order — alpha leads on count, then beta/gamma tie-break on name asc.
    for name in ("alpha", "beta", "gamma"):
        _project(client, headers, name)

    a_rel = "alpha/2026-01-02-a.md"
    b_rel = "alpha/2026-01-01-b.md"
    ghost = "beta/2020-01-01-missing.md"
    a_id = _seed(tenant, "alpha", slug="a", title="Doc A", date="2026-01-02", tags=["ml"], related=[b_rel])
    _seed(tenant, "alpha", slug="b", title="Doc B", date="2026-01-01", tags=["ml"])
    _seed(tenant, "beta", slug="c", title="Doc C", related=[ghost])
    _seed(tenant, "gamma", slug="d", title="Doc D")

    res = client.get("/app/graph", headers=headers)
    assert res.status_code == 200, res.text
    graph = res.json()
    assert graph["version"] == 1
    assert graph["truncated"] is False

    nodes = graph["nodes"]
    edges = graph["edges"]

    # Nodes: 4 doc + 1 tag hub + 1 ghost. Keyed on rel_path.
    docs = [n for n in nodes if n["type"] == "doc"]
    assert {n["id"] for n in docs} == {a_rel, b_rel, "beta/2026-01-01-c.md", "gamma/2026-01-01-d.md"}
    assert _by_id(nodes, "tag:ml")["type"] == "tag"
    assert _by_id(nodes, ghost)["type"] == "missing"

    # url rewrite: a doc node points at the S5 read route /documents/{db_id}.
    assert _by_id(nodes, a_rel)["url"] == f"/documents/{a_id}"
    assert _by_id(nodes, a_rel)["project"] == "alpha"

    # Edges: related A->B (whole), related C->ghost (broken), tag A/B -> tag:ml.
    related = {(e["source"], e["target"]): e for e in edges if e["kind"] == "related"}
    assert (a_rel, b_rel) in related and "broken" not in related[(a_rel, b_rel)]
    assert related[("beta/2026-01-01-c.md", ghost)]["broken"] is True
    tag_edges = {(e["source"], e["target"]) for e in edges if e["kind"] == "tag"}
    assert (a_rel, "tag:ml") in tag_edges and (b_rel, "tag:ml") in tag_edges

    # Degree = incident edges: A = related(A->B) + tag = 2; tag:ml = 2.
    assert _by_id(nodes, a_rel)["degree"] == 2
    assert _by_id(nodes, "tag:ml")["degree"] == 2

    # Project order is load-bearing: alpha(2) first, then beta/gamma by name asc.
    assert graph["projects"] == [
        {"name": "alpha", "docs": 2},
        {"name": "beta", "docs": 1},
        {"name": "gamma", "docs": 1},
    ]


def test_graph_tenant_isolation(documents_client):
    client, _ = documents_client
    a_headers, a_tenant = _signup(client, f"ga-{uuid4()}@example.com")
    b_headers, b_tenant = _signup(client, f"gb-{uuid4()}@example.com")
    _project(client, a_headers, "shared")
    _project(client, b_headers, "shared")  # same name, other tenant

    _seed(a_tenant, "shared", slug="a", title="Tenant A note", tags=["a-only"])
    _seed(b_tenant, "shared", slug="b", title="Tenant B note", tags=["b-only"])

    graph = client.get("/app/graph", headers=a_headers).json()
    doc_titles = [n["title"] for n in graph["nodes"] if n["type"] == "doc"]
    assert doc_titles == ["Tenant A note"]
    # B's tag never appears in A's graph.
    assert _by_id(graph["nodes"], "tag:b-only") is None
    assert _by_id(graph["nodes"], "tag:a-only") is not None


def test_graph_is_unmetered(documents_client):
    client, sync_engine = documents_client
    from sqlalchemy import text

    headers, tenant = _signup(client, f"gm-{uuid4()}@example.com")
    _project(client, headers, "alpha")
    _seed(tenant, "alpha", slug="m", title="Metered?", tags=["x"])

    def _event_count() -> int:
        with sync_engine.connect() as conn:
            return conn.execute(text("SELECT count(*) FROM usage_events")).scalar_one()

    before = _event_count()
    assert client.get("/app/graph", headers=headers).status_code == 200
    # A web-UI graph read records no usage event.
    assert _event_count() == before


def test_graph_requires_auth(documents_client):
    client, _ = documents_client
    assert client.get("/app/graph").status_code == 401
