"""Per-tenant knowledge graph — the web app's in-app graph data source (P12.S6).

One session-guarded, tenant-scoped, **unmetered** ``/app`` read route:

* ``GET /app/graph`` — the caller's tenant's knowledge map as the same
  ``{version, projects, nodes, edges}`` contract ``scripts/graph_hook.py`` emits
  at mkdocs build time, but built from the content store instead of the ``docs/``
  frontmatter tree. Two additive keys sit on top of that contract: ``truncated``
  (node cap hit) and the nullable ``canonical_path`` (``/@{org-slug}/graph``, the
  pretty public URL — P25.S4), which is ``null`` for a slug-less tenant and in
  legacy mode.

Why a server-side TWIN of the hook (not an import). ``scripts/graph_hook.py``
must stay server-free — it runs inside ``mkdocs build`` (CI installs only
``mkdocs-material``), so importing ``server/*`` there would drag FastAPI/SQLite
into the docs build. The inversion algorithm is small and stable, so this module
reimplements it over the store's document dicts (``server/db.py::list_documents``,
which already decodes each doc's ``related`` + ``tags``). The public mkdocs graph
(tenant #1's public surface) is untouched and keeps its build-time path.

The one substitution vs. the hook: a doc node's ``url`` is the S5 read route
``/documents/{db_id}`` (the hook used a build-time ``File.url`` with no
content-store equivalent). That is what makes a node click navigate inside the
app.

**Scope = per-tenant.** The whole tenant's corpus keys the graph (the rail's
"Graph" is a top-level surface). The route *accepts* an optional ``project``
control-plane UUID (bridged to a name via the S5 ``_resolve_project_name``, 404
on missing/cross-tenant) for symmetry with ``/app/documents``, but the shipped UI
sends none — narrowing to one project would reclassify any cross-project
``related:`` target as a ``missing`` ghost, and no cross-project links exist in
the corpus today.

**Unmetered by construction.** Metering is opt-in per handler via
``request.state.usage`` (recorded by the ``server/main.py`` HTTP middleware); this
handler never sets it, so a web-UI graph read moves no usage counter — the S3
``/app/dashboard`` and S5 ``/app/documents`` precedent. Web-UI features are free.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from server import config, db
from server.accounts.auth import AuthContext, AuthError, optional_user
from server.accounts.service import get_accounts_service

# Reuse the S5 helpers verbatim (the S5 notes flag both as reusable here): the
# async generator connection dependency (SQLite must be opened on the handler's
# own event-loop thread — this handler is ``async def`` because the project
# bridge awaits the accounts service) and the project UUID -> name bridge.
from server.documents_api import _resolve_project_name, get_conn

router = APIRouter()

# A sane hard cap on doc nodes. The tenant corpora are small today; this bounds
# the O(n^2) client force sim + the response size if a corpus ever grows large.
# When the tenant has more docs than this, the newest ``MAX_DOC_NODES`` are
# graphed and ``truncated`` is set so the UI can say so.
MAX_DOC_NODES = 2000


def build_tenant_graph(docs: list[dict[str, Any]]) -> dict[str, Any]:
    """Invert a tenant's document dicts into the graph.json data contract.

    A server-side twin of ``scripts/graph_hook.py::build_graph`` — the SAME
    inversion (doc/tag/missing nodes; related/tag edges; ``degree``; the
    ``(-docs, name)`` project order the renderer assigns ink by), keyed on each
    doc's ``rel_path`` (the ``related``-target keyspace) and sourcing ``project``
    from the DB column. The ONE difference: a doc node's ``url`` is the S5 read
    route ``/documents/{db_id}`` rather than a build-time page URL.

    ``docs`` are ``server/db.py`` document dicts (``id``, ``rel_path``,
    ``project``, ``title``, ``date``, ``tags`` + ``related`` already decoded).
    """

    records = []
    for d in docs:
        rel = str(d["rel_path"])
        records.append(
            {
                "id": rel,
                "title": str(d.get("title") or rel),
                "url": f"/documents/{d['id']}",
                "date": str(d.get("date") or ""),
                "project": str(d.get("project") or ""),
                "tags": [str(t) for t in (d.get("tags") or [])],
                "related": [str(r) for r in (d.get("related") or [])],
            }
        )

    doc_ids = {r["id"] for r in records}

    # Edges (deduped; self-references dropped) — related first, then doc<->tag.
    edges: list[dict[str, Any]] = []
    seen: set[tuple] = set()
    for r in records:  # related: directed as authored
        for target in r["related"]:
            key = ("related", r["id"], target)
            if target == r["id"] or key in seen:
                continue
            seen.add(key)
            edge: dict[str, Any] = {"source": r["id"], "target": target, "kind": "related"}
            if target not in doc_ids:
                edge["broken"] = True
            edges.append(edge)
    for r in records:  # doc <-> tag
        for tag in r["tags"]:
            tag_id = f"tag:{tag}"
            key = ("tag", r["id"], tag_id)
            if key in seen:
                continue
            seen.add(key)
            edges.append({"source": r["id"], "target": tag_id, "kind": "tag"})

    # Nodes: docs, then tag hubs, then ghost (missing) nodes for dead related targets.
    nodes: list[dict[str, Any]] = []
    for r in records:
        nodes.append(
            {
                "id": r["id"],
                "type": "doc",
                "title": r["title"],
                "url": r["url"],
                "date": r["date"],
                "project": r["project"],
                "tags": r["tags"],
            }
        )
    for tag in sorted({t for r in records for t in r["tags"]}):
        nodes.append({"id": f"tag:{tag}", "type": "tag", "title": tag})
    for mid in sorted({e["target"] for e in edges if e.get("broken")} - doc_ids):
        nodes.append({"id": mid, "type": "missing", "title": mid})

    # Degree = incident edge count over the emitted edge list.
    degree: dict[str, int] = {}
    for e in edges:
        degree[e["source"]] = degree.get(e["source"], 0) + 1
        degree[e["target"]] = degree.get(e["target"], 0) + 1
    for n in nodes:
        n["degree"] = degree.get(n["id"], 0)

    # Projects: (doc-count desc, name asc) — the renderer assigns ink i % 3 in
    # this order, so the ordering is load-bearing.
    proj_counts: dict[str, int] = {}
    for r in records:
        proj_counts[r["project"]] = proj_counts.get(r["project"], 0) + 1
    projects = sorted(
        ({"name": name, "docs": count} for name, count in proj_counts.items()),
        key=lambda p: (-p["docs"], p["name"]),
    )

    nodes.sort(key=lambda n: (n["type"], n["id"]))
    edges.sort(key=lambda e: (e["kind"], e["source"], e["target"]))
    return {"version": 1, "projects": projects, "nodes": nodes, "edges": edges}


async def _build_graph(
    conn,
    *,
    tenant_id: str,
    project_name: str | None,
    projects: list[str] | None,
) -> dict[str, Any]:
    """Count → single windowed ``list_documents`` → invert → ``truncated`` flag.

    Shared by the member and public paths. ``projects`` (a public-project-name
    allowlist) is passed only on the public path; ``None`` on the member path keeps
    the count/list calls byte-identical to the pre-P19 bare call.
    """

    total = db.count_documents(
        conn, project=project_name, tenant_id=tenant_id, projects=projects
    )
    limit = min(total, MAX_DOC_NODES)
    docs = db.list_documents(
        conn,
        project=project_name,
        limit=limit,
        offset=0,
        tenant_id=tenant_id,
        projects=projects,
    )
    graph_data = build_tenant_graph(docs)
    graph_data["truncated"] = total > MAX_DOC_NODES
    return graph_data


def _graph_canonical_path(org_slug: str | None) -> str | None:
    """The org's pretty public graph path, or ``None`` when it has no slug.

    Mirrors ``documents_api._canonical_path``: the pretty URL is assembled **once,
    here in the backend**, and every consumer (the legacy ``/graph/{uuid}`` page's
    redirect, the member copy-link) reads it back instead of re-deriving it. A
    slug-less tenant — ``tenants.slug`` is nullable with no backfill — simply has
    no pretty URL yet and keeps today's ``/graph/{uuid}`` link.
    """

    return f"/@{org_slug}/graph" if org_slug else None


@router.get("/app/graph")
async def graph(
    project: UUID | None = None,
    org: str | None = None,
    ctx: AuthContext | None = Depends(optional_user),
    conn=Depends(get_conn),
) -> dict[str, Any]:
    """A tenant's knowledge graph: member (whole corpus) or public (P19.S2).

    Optional-identity with an ``org`` selector, which is **either a tenant UUID or
    that tenant's public org slug** (P25.S4 — the slug backs ``/@{org}/graph``).
    A canonical UUID string is also a legal slug charset-wise, so ``org`` is parsed
    as a UUID **first** and only treated as a slug when that fails; slug resolution
    goes through ``AccountsService.get_tenant_by_slug`` (which normalizes and
    answers ``None`` for anything malformed, reserved or unclaimed), so an
    unresolvable slug is the **same** 404 as an org with no public graph. A
    malformed ``org`` therefore 404s where it used to 422 — strictly friendlier on
    an anonymous surface, and it leaks nothing.

    * **No ``org``** — the bare call the logged-in app makes. A resolved ``ctx`` is
      required (an anonymous bare call raises the same generic 401 as before, so
      member behavior is preserved); the member sees their whole tenant corpus.
      ``project`` (a control-plane UUID, bridged to a name, 404 on
      missing/cross-tenant) is accepted for symmetry but the shipped UI sends none.
    * **``org`` = the caller's own tenant** (by UUID *or* by their own slug —
      the comparison is against the RESOLVED tenant id) — identical to the bare
      member call.
    * **``org`` = another tenant (or anonymous)** — the **public view**: only that
      org's ``public``-visibility projects' nodes/edges/tag-hubs. Legacy-mode guard
      (no ``DATABASE_URL`` ⇒ 404, and the accounts service is never touched there);
      an org with **no** public projects — which also covers a nonexistent org —
      answers 404 ``"graph not found"`` (no existence leak). The ``project``
      narrowing param is **ignored** on the public path (the UI never sends it).

    Fetches via a single windowed ``list_documents`` bounded by ``MAX_DOC_NODES``
    and sets ``truncated`` (a harmless superset of the four-key contract) when the
    corpus exceeds the node cap. The response additionally carries the nullable
    **``canonical_path``** (``/@{slug}/graph``) — echoing the pretty path of the org
    the caller explicitly asked for leaks nothing, and it is what lets the legacy
    ``/graph/{uuid}`` page forward to the pretty URL without re-deriving it.
    Unmetered.
    """

    # ── Resolve `org` (UUID or slug) to a tenant id ───────────────────────────
    # UUID first: a canonical UUID string matches the slug charset, so parsing in
    # the other order would send every uuid through a pointless slug lookup.
    org_id: UUID | None = None
    owner = None  # TenantRecord, when the slug lookup already loaded it
    if org is not None:
        try:
            org_id = UUID(org)
        except (ValueError, AttributeError, TypeError):
            # Not a UUID ⇒ an org slug. Resolving one needs the accounts plane, so
            # the legacy-mode guard comes FIRST — legacy stays a plain 404 and
            # never touches the accounts service.
            if config.database_url() is None:
                raise HTTPException(status_code=404, detail="graph not found")
            owner = await get_accounts_service().get_tenant_by_slug(org)
            if owner is None:
                # Malformed, reserved or unclaimed — one indistinguishable 404.
                raise HTTPException(status_code=404, detail="graph not found")
            org_id = owner.id

    # Member paths: no org, or org == the caller's own tenant. Both are the exact
    # pre-P19 bare call (whole-corpus, project-symmetry param honored). The
    # comparison is against the RESOLVED id, so a member addressing their own org
    # by slug lands here too.
    if org_id is None or (ctx is not None and ctx.tenant.id == org_id):
        if ctx is None:
            # Bare unauthenticated call: same generic 401 as the pre-P19 route.
            raise AuthError("missing bearer token")
        project_name = (
            await _resolve_project_name(project, ctx) if project is not None else None
        )
        graph_data = await _build_graph(
            conn, tenant_id=str(ctx.tenant.id), project_name=project_name, projects=None
        )
        # Free on the member path: the slug is already on the session tenant.
        graph_data["canonical_path"] = _graph_canonical_path(ctx.tenant.slug)
        return graph_data

    # Public view: anonymous or a non-member caller addressing another org.
    if config.database_url() is None:
        raise HTTPException(status_code=404, detail="graph not found")
    accounts = get_accounts_service()
    public_names = [
        p.name
        for p in await accounts.list_projects_for_tenant(org_id)
        if p.visibility == "public"
    ]
    if not public_names:
        # No public projects (also covers a nonexistent org) — no existence leak.
        raise HTTPException(status_code=404, detail="graph not found")
    if owner is None:
        # The org came in as a UUID, so its slug is not in hand yet — one read,
        # alongside the projects call this path already pays for.
        owner = await accounts.get_tenant(org_id)
    graph_data = await _build_graph(
        conn, tenant_id=str(org_id), project_name=None, projects=public_names
    )
    graph_data["canonical_path"] = _graph_canonical_path(
        owner.slug if owner is not None else None
    )
    return graph_data
