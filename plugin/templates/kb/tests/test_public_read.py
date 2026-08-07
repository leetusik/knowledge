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
    _seed_version,
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


def _set_slug(client, headers) -> str:
    """Claim a fresh org slug for the caller's tenant and return it.

    The slug is generated per call because ``tenants.slug`` is **globally** unique —
    unlike every other assertion in these suites, which is tenant-scoped. A
    hardcoded slug passes once and then 409s forever against a re-used database.
    """

    slug = f"org-{uuid4().hex[:10]}"
    res = client.patch("/app/tenant", json={"slug": slug}, headers=headers)
    assert res.status_code == 200, res.text
    return slug


def _seed(
    tenant_id, project, *, slug, fmt="md", raw_html=None, tags=None, related=None, version=1
):
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
            version=version,
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
    # P25.S4: no org slug claimed yet ⇒ the additive key is present and null, so
    # the legacy /graph/{uuid} page serves exactly as today.
    assert graph["canonical_path"] is None

    # A nonexistent org and an org with zero public projects both → 404 (no leak).
    assert client.get("/app/graph", params={"org": str(uuid4())}).status_code == 404
    assert client.get("/app/graph", params={"org": b_tenant}).status_code == 404

    # Bare unauthenticated call still 401; the member bare call sees the whole corpus.
    assert client.get("/app/graph").status_code == 401
    member = client.get("/app/graph", headers=a_headers).json()
    assert {p["name"] for p in member["projects"]} == {"pub", "secret"}

    # ── P25.S4: ?org= also accepts the org SLUG ──────────────────────────────
    org = _set_slug(client, a_headers)
    by_slug = client.get("/app/graph", params={"org": org})
    assert by_slug.status_code == 200, by_slug.text
    assert {n["id"] for n in by_slug.json()["nodes"]} == node_ids
    assert by_slug.json()["canonical_path"] == f"/@{org}/graph"
    # The UUID form now reports the same pretty path (one org, one canonical URL).
    assert client.get("/app/graph", params={"org": a_tenant}).json()[
        "canonical_path"
    ] == f"/@{org}/graph"

    # An unclaimed, a reserved and a malformed slug are ONE indistinguishable 404 —
    # never a 422, so the anonymous surface leaks no charset information.
    for bad in [f"org-{uuid4().hex[:10]}", "dashboard", "NOT A SLUG"]:
        assert client.get("/app/graph", params={"org": bad}).status_code == 404

    # A member addressing their OWN org by slug still gets the member whole-corpus
    # path (the fast-path compares RESOLVED tenant ids, not raw strings).
    mine = client.get("/app/graph", params={"org": org}, headers=a_headers).json()
    assert {p["name"] for p in mine["projects"]} == {"pub", "secret"}
    assert mine["canonical_path"] == f"/@{org}/graph"


def test_anonymous_reads_public_version_history(documents_client):
    """P23.S2: a public document's history is anonymously readable — the list, one
    archived version, and an archived HTML version's raw body carrying the very same
    sandbox headers as the current one; a private document's history is a 404."""

    client, _ = documents_client
    headers, tenant = _signup(client, f"pubver-{uuid4()}@example.com")
    pub = _project(client, headers, "pub")
    _project(client, headers, "priv")  # left private
    _set_public(client, headers, pub)

    pub_id = _seed(tenant, "pub", slug="p", fmt="html", raw_html=_HTML, version=2)
    priv_id = _seed(tenant, "priv", slug="s")
    _seed_version(
        tenant, "pub/2026-01-01-p.html", 1, markdown="old text", fmt="html", raw_html=_HTML
    )

    page = client.get(f"/app/documents/{pub_id}/versions").json()
    assert (page["current_version"], page["total"]) == (2, 1)
    assert "raw_html" not in page["versions"][0]  # bytes leave only via /raw
    one = client.get(f"/app/documents/{pub_id}/versions/1")
    assert one.status_code == 200 and one.json()["markdown"] == "old text"
    assert "raw_html" not in one.json()

    raw = client.get(f"/app/documents/{pub_id}/versions/1/raw")
    assert raw.status_code == 200 and "SECRET_TOKEN" in raw.text
    assert raw.headers["content-type"].startswith("text/html")
    for key, val in _SANDBOX.items():
        assert raw.headers[key] == val

    # A private document's history, an unknown version and its raw twin: same 404.
    assert client.get(f"/app/documents/{priv_id}/versions").status_code == 404
    assert client.get(f"/app/documents/{pub_id}/versions/9").status_code == 404
    assert client.get(f"/app/documents/{pub_id}/versions/9/raw").status_code == 404


def test_slug_resolver_serves_public_and_hides_everything_else(documents_client):
    """P25.S2: `/app/orgs/{org}/{project}/{slug}` resolves a public doc anonymously,
    and an unknown org, an unknown doc slug and a private project are all the SAME
    404 — nonexistent and forbidden stay indistinguishable."""

    client, _ = documents_client
    headers, tenant = _signup(client, f"res-{uuid4()}@example.com")
    org = _set_slug(client, headers)
    pub = _project(client, headers, "pub")
    _project(client, headers, "priv")  # left private
    _set_public(client, headers, pub)

    pub_id = _seed(tenant, "pub", slug="p")
    _seed(tenant, "priv", slug="s")

    hit = client.get(f"/app/orgs/{org}/pub/p")
    assert hit.status_code == 200, hit.text
    body = hit.json()
    # Carries the row id (so /versions* and /raw stay id-keyed), the body, and the
    # pretty path — but never the internal scoping column.
    assert body["id"] == pub_id and body["markdown"] == "body text"
    assert body["canonical_path"] == f"/@{org}/pub/p"
    assert "tenant_id" not in body

    misses = [
        client.get(f"/app/orgs/{org}/priv/s"),  # private project
        client.get(f"/app/orgs/{org}/pub/nope"),  # unknown doc slug
        client.get(f"/app/orgs/{org}/nosuch/p"),  # unknown project
        client.get(f"/app/orgs/org-{uuid4().hex[:10]}/pub/p"),  # unclaimed org slug
        client.get("/app/orgs/NOT A SLUG/pub/p"),  # malformed org slug
        client.get("/app/orgs/dashboard/pub/p"),  # reserved org slug
    ]
    assert [m.status_code for m in misses] == [404] * 6
    assert len({m.json()["detail"] for m in misses}) == 1  # one identical detail


def test_member_resolves_own_private_doc_by_slug(documents_client):
    """The resolver's member fast-path: the owner reads their own doc through the
    pretty URL whatever its project's visibility (the URL is handed out at save
    time, before the project is ever made public)."""

    client, _ = documents_client
    headers, tenant = _signup(client, f"resmem-{uuid4()}@example.com")
    org = _set_slug(client, headers)
    _project(client, headers, "priv")  # left private
    doc_id = _seed(tenant, "priv", slug="s")

    mine = client.get(f"/app/orgs/{org}/priv/s", headers=headers)
    assert mine.status_code == 200, mine.text
    assert mine.json()["id"] == doc_id
    # ...and it stays invisible to everyone else.
    assert client.get(f"/app/orgs/{org}/priv/s").status_code == 404


def test_document_detail_carries_canonical_path(documents_client):
    """P25.S2: `GET /app/documents/{id}` gains the additive `canonical_path` — the
    pretty path once the owner has an org slug, `null` before that (a slug-less
    tenant keeps exactly today's behavior)."""

    client, _ = documents_client
    headers, tenant = _signup(client, f"canon-{uuid4()}@example.com")
    pub = _project(client, headers, "pub")
    _set_public(client, headers, pub)
    doc_id = _seed(tenant, "pub", slug="p")

    # No slug claimed yet: additive key present, null — for the member AND anonymously.
    assert client.get(f"/app/documents/{doc_id}", headers=headers).json()["canonical_path"] is None
    assert client.get(f"/app/documents/{doc_id}").json()["canonical_path"] is None

    org = _set_slug(client, headers)
    expected = f"/@{org}/pub/p"
    # Member path reads the slug off the session tenant; the anonymous path looks the
    # owner up. Both must agree.
    member = client.get(f"/app/documents/{doc_id}", headers=headers)
    assert member.json()["canonical_path"] == expected
    assert client.get(f"/app/documents/{doc_id}").json()["canonical_path"] == expected


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
