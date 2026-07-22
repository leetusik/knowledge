"""The P19.S2 anonymous read surface: public-project doc/raw reads + the
org-scoped public graph, and the negative non-leak guarantees.

The trust boundary under test: a **public**-visibility project's docs and graph
are readable with no session (and cross-org), while **private** projects and
nonexistent ids are indistinguishable 404s — never a 403, never a leak. Reuses
the Postgres-gated harness + signup/create-project helpers from
``tests/test_documents_api`` (accounts is Postgres-only), so this suite skips
cleanly without a disposable ``KB_TEST_DATABASE_URL`` / ``DATABASE_URL``.
Visibility is toggled through the real ``PATCH /app/projects/{id}`` surface; docs
are seeded straight into the throwaway SQLite scoped to the signed-up tenant.
"""

from __future__ import annotations

from uuid import uuid4

from server import db

# Postgres-gated client fixture + accounts-plane helpers, reused as-is.
from tests.test_documents_api import (  # noqa: F401
    _project,
    _signup,
    documents_client,
)

_HTML = (
    "<!DOCTYPE html>\n<html><body><h1>Public explainer</h1>"
    "<script>const SECRET_TOKEN='x';</script></body></html>\n"
)
_SANDBOX = {
    "content-security-policy": "sandbox allow-scripts; frame-ancestors 'self'",
    "x-frame-options": "SAMEORIGIN",
    "x-content-type-options": "nosniff",
    "cache-control": "no-store",
}


def _set_public(client, headers, project_id, visibility="public"):
    res = client.patch(
        f"/app/projects/{project_id}", json={"visibility": visibility}, headers=headers
    )
    assert res.status_code == 200, res.text


def _seed(tenant_id, project, *, slug, fmt="md", raw_html=None, tags=None, related=None):
    conn = db.connect()
    try:
        return db.upsert_document(
            conn,
            project=project,
            slug=slug,
            date="2026-01-01",
            title=f"Doc {slug}",
            tags=tags or [],
            source_repo="acme/repo",
            rel_path=f"{project}/2026-01-01-{slug}.{'html' if fmt == 'html' else 'md'}",
            markdown="body text",
            related=related or [],
            format=fmt,
            raw_html=raw_html,
            tenant_id=tenant_id,
        )
    finally:
        conn.close()


def test_anonymous_reads_public_denies_private(documents_client):
    client, _ = documents_client
    headers, tenant = _signup(client, f"pub-{uuid4()}@example.com")
    pub = _project(client, headers, "pub")
    _project(client, headers, "priv")  # left private
    _set_public(client, headers, pub)

    pub_id = _seed(tenant, "pub", slug="p", fmt="html", raw_html=_HTML)
    priv_id = _seed(tenant, "priv", slug="s")

    # Anonymous (no headers): public doc JSON → 200, and the projection drops tenant_id.
    r = client.get(f"/app/documents/{pub_id}")
    assert r.status_code == 200, r.text
    assert "tenant_id" not in r.json()

    # Anonymous raw HTML → 200 with the four sandbox headers intact.
    raw = client.get(f"/app/documents/{pub_id}/raw")
    assert raw.status_code == 200
    assert raw.headers["content-type"].startswith("text/html")
    for key, val in _SANDBOX.items():
        assert raw.headers[key] == val
    assert "SECRET_TOKEN" in raw.text

    # Private doc and a nonexistent id are indistinguishable 404s (never 403).
    assert client.get(f"/app/documents/{priv_id}").status_code == 404
    assert client.get(f"/app/documents/{priv_id}/raw").status_code == 404
    assert client.get("/app/documents/99999999").status_code == 404


def test_cross_org_user_sees_only_public(documents_client):
    client, _ = documents_client
    a_headers, a_tenant = _signup(client, f"a-{uuid4()}@example.com")
    b_headers, _ = _signup(client, f"b-{uuid4()}@example.com")
    a_pub = _project(client, a_headers, "pub")
    _project(client, a_headers, "secret")  # private
    _set_public(client, a_headers, a_pub)

    pub_id = _seed(a_tenant, "pub", slug="p")
    secret_id = _seed(a_tenant, "secret", slug="s")

    # A second, authenticated org reads A's public doc but never A's private one:
    # the member fast-path misses (cross-org) then the public path gates on visibility.
    assert client.get(f"/app/documents/{pub_id}", headers=b_headers).status_code == 200
    assert client.get(f"/app/documents/{secret_id}", headers=b_headers).status_code == 404


def test_public_graph_is_org_scoped(documents_client):
    client, _ = documents_client
    a_headers, a_tenant = _signup(client, f"ga-{uuid4()}@example.com")
    b_headers, b_tenant = _signup(client, f"gb-{uuid4()}@example.com")
    a_pub = _project(client, a_headers, "pub")
    _project(client, a_headers, "secret")  # private
    _set_public(client, a_headers, a_pub)
    _project(client, b_headers, "bonly")  # B has only a private project

    _seed(a_tenant, "pub", slug="p", tags=["shown"])
    secret_rel = "secret/2026-01-01-s.md"
    _seed(a_tenant, "secret", slug="s", tags=["hidden"])

    # Anonymous public graph for org A: only the public project's nodes/tags.
    g = client.get("/app/graph", params={"org": a_tenant})
    assert g.status_code == 200, g.text
    graph = g.json()
    node_ids = {n["id"] for n in graph["nodes"]}
    assert secret_rel not in node_ids
    assert "tag:hidden" not in node_ids and "tag:shown" in node_ids
    assert [p["name"] for p in graph["projects"]] == ["pub"]

    # A nonexistent org and an org with zero public projects both → 404 (no leak).
    assert client.get("/app/graph", params={"org": str(uuid4())}).status_code == 404
    assert client.get("/app/graph", params={"org": b_tenant}).status_code == 404

    # Bare unauthenticated call still 401; the member bare call sees the whole corpus.
    assert client.get("/app/graph").status_code == 401
    member = client.get("/app/graph", headers=a_headers).json()
    assert {p["name"] for p in member["projects"]} == {"pub", "secret"}


def test_visibility_toggle_flips_anonymous_read(documents_client):
    client, tenant = documents_client[0], None
    headers, tenant = _signup(client, f"tog-{uuid4()}@example.com")
    proj = _project(client, headers, "flip")
    _set_public(client, headers, proj)
    doc_id = _seed(tenant, "flip", slug="d")

    # Public → anonymous read allowed; flip to private → the same read 404s at once
    # (the bridge resolves visibility per-read from Postgres, no reindex).
    assert client.get(f"/app/documents/{doc_id}").status_code == 200
    _set_public(client, headers, proj, visibility="private")
    assert client.get(f"/app/documents/{doc_id}").status_code == 404
