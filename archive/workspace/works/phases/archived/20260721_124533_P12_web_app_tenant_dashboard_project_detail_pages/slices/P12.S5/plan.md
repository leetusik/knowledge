# P12.S5 — Per-tenant documents browse + search

## Context

Fifth slice of P12. The authenticated web app becomes the **per-tenant knowledge viewer**: browse the
tenant's documents (newest-first, optional project filter), full-text **search** them, and **read** a
document (rendered markdown). This makes the rail's "Documents" item live. It resolves the phase's
biggest open question — **(a) the documents-read mechanism** — and adds a small backend read surface,
so the executor is **`slice-executor-high`** (new API routes + search wiring + a markdown renderer).

**Template:** vocky's flagship read surface (`~/projects/personal/vocky/web/src/app/(app)/feedback/*`)
— a **zero-client-island**, server-rendered browse+search+detail whose `searchParams` round-trip and
list/detail split port directly. **Backend anchors** verified in `server/main.py` / `server/db.py` /
`server/search.py` / `server/api_auth.py`.

## Resolved decision — open question (a): unmetered `/app` read routes

Add **new session-scoped, tenant-scoped, UNMETERED `/app` read routes** (the DECOMP-preferred,
constraint-backed path), **not** the metered `/api/*`. Confirmed clean by recon:
- **Metering is route-layer only** — each metered `/api/*` handler opts in via `request.state.usage`;
  an HTTP middleware records it. `server/db.py` and `server/search.py` are **metering-free**. A new
  `/app` route that never sets `request.state.usage` moves no counter — exactly the existing
  **`/app/dashboard`** (S3) precedent.
- **Product consequence (flagged):** web-UI searches therefore do **not** appear in the dashboard's
  "Searches" tile. That metric stays "billable agent/API retriever usage" (the paid retriever is
  **P15**), and web-UI features are free — so keeping web browsing/search out of it is correct and
  matches the constraint "web-UI document browsing should stay unmetered."

## Part A — Backend: three unmetered `/app` read routes

New `server/documents_api.py` (mirror `server/dashboard_api.py`/`usage_api.py` style), mounted in
`server/main.py` after the other `/app` routers. All `Depends(require_user)` → `ctx.tenant`;
tenant-scoped via `tenant_id=str(ctx.tenant.id)`; **unmetered** (never set `request.state.usage`).
Reuse the existing store/search functions **as-is**:

- **`GET /app/documents`** — `project?: UUID`, `tag?: str`, `limit=Query(50, ge=1, le=200)`,
  `offset=Query(0, ge=0)`. Calls `db.count_documents` + `db.list_documents(conn, project=<name>, tag,
  limit, offset, tenant_id=str(ctx.tenant.id))`. Returns `{ total, items: [projected doc, …] }`
  newest-first. **Projector** (adapt `_public_doc`): drop `tags_text` **and** `markdown` **and**
  `tenant_id` (the `/api` projector leaks `tenant_id`; the `/app` one should not).
- **`GET /app/documents/{doc_id:int}`** — `db.get_document(conn, doc_id, tenant_id=str(ctx.tenant.id))`;
  `None → 404` (cross-tenant id never leaks). Returns the projected doc **with** `markdown` (drop only
  `tags_text` + `tenant_id`). (Doc ids are integers — no `/by-path` route needed for the web UI, so no
  route-ordering collision.)
- **`GET /app/search`** — `q: str` (required), `project?: UUID`, `tag?`, `limit=Query(10, ge=1,
  le=50)`, `offset=Query(0, ge=0)`. Calls `search_mod.search(conn, q, project=<name>, tag, limit,
  offset, tenant_id=str(ctx.tenant.id))`; `SearchQueryError → 400`. Returns `{ query, mode, total,
  limit, offset, results: [...] }` (result items already exclude `markdown`/`tenant_id`; keep
  `snippet`/`score` for the UI).

**The UUID→name bridge (the DECOMP-named work):** documents key off the project **name** string, but
the web UI works in control-plane project **UUIDs**. When `project` (a UUID) is supplied, resolve it
with `AccountsService.get_project(project_id)` → **404 if missing/cross-tenant** (mirror
`server/app_api.py::_load_scoped_project`), then pass `project=<record.name>` to the store/search. A
helper shared by list + search.

**Backend test (terse):** extend the S3 Postgres harness pattern — assert (1) list/detail/search
shapes; (2) tenant-isolation (a second tenant's docs never appear; a cross-tenant `doc_id`/`project`
→ 404); (3) **unmetered** (hitting all three moves no usage counter); (4) the project UUID→name
bridge filters correctly. Minimal high-value cases; skips cleanly without a DSN.

## Part B — Frontend: the documents surface (server-only, like vocky)

Flip the rail live: in `web/src/content/app.ts` drop `soon: true` from the Documents item (href
`/documents`) — `rail-nav.tsx` needs no change (active state lights `/documents` + `/documents/[id]`).

**Client seam `web/src/lib/knowledge/app.ts`** — add `getDocuments(token, query)` → `GET
/app/documents` + query string; `getDocument(token, id)` → `GET /app/documents/{id}`;
`searchDocuments(token, query)` → `GET /app/search`. Build the query string with `URLSearchParams`
(it does all escaping — **no** `encodeURIComponent` on top, or Korean double-encodes; blank omitted;
bare path when empty), mirroring vocky's `feedbackQueryString`. `token` first arg; `cache:"no-store"`;
errors by `ApiError.status`.

**Types `web/src/lib/knowledge/types.ts`** — `KbDocumentListItem` (id, project, slug, date, title,
tags, rel_path, source_repo, created_at, updated_at — no markdown); `KbDocument` (+ `markdown`);
`KbDocumentsPage {total, items}`; `KbSearchResult` (list-item fields + `score`, `snippet`, `signals`);
`KbSearchPage {query, mode, total, limit, offset, results}`; a `KbDocumentsQuery {q?, project?, tag?,
limit?, offset?}`.

**List page `web/src/app/(app)/documents/page.tsx`** (async server component, **no client island**):
port vocky's `searchParams` round-trip — a `PARAM_KEYS` tuple, `takeFirst` (collapse `string|string[]`),
`readActiveParams` (trim + **drop blanks** so an empty GET form means "no filter"), `toQuery` (typed).
**Adapt to OFFSET pagination** (knowledge returns `{total, …, limit, offset}`, not vocky's cursor):
prev/next are `<Link>`s that set `offset` (±limit, clamped `[0, total)`), preserving the other active
params. **Branch on `q`:** `q` present → `searchDocuments` (ranked; show snippet); else →
`getDocuments` (newest-first). Run `listProjects(token)` in parallel for the project-filter options +
name display. Render:
- A **`.kb-appsearch` GET form** (`<form method="GET" action="/documents">`): the magnifier
  (`lucide-react`) + a `type="search"` input (`.kb-appsearch__input`, `defaultValue={active.q}`) + a
  project `<select>` (blank "All" first option → dropped when blank; value = project **UUID**) +
  submit; a **Reset `<Link href="/documents">`** (not `type="reset"`). *(The `.kb-appsearch__key`
  shortcut chip is out of scope — no shortcut is designed; omit it to stay server-only.)*
- The **`.kb-dtable`** list via the existing `DataTable`: columns **Title** (links to
  `/documents/{id}`; in search mode append the `snippet`, `.kb-dtable__sub`) · **Project** (name) ·
  **Date** (mono) · **Tags** (chips). **Two empty states** (vocky pattern) via `empty`: no documents
  at all vs. no matches for the filters.
- An **offset pager** (`.kb-appbtn--secondary/ghost` links) + a "N results" count.

**Read view `web/src/app/(app)/documents/[id]/page.tsx`** (async server component): `params` is a
Promise (Next 16). `requireIdentity()` outside the `try`; a `loadDocument()` helper mapping `ApiError`
**404/400 → `notFound()`** (outside the try). Layout: a back `<Link href="/documents">`, a header
(`.kb-app-eyebrow` project · `.kb-app-title` = document title · `.kb-app-sub` date), a metadata strip
(project / date / tags chips / source_repo), then the **rendered markdown** body in a `.kb-panel`.
A branded `.kb-empty` **`not-found.tsx`** for a bad id.

**Markdown rendering** — add **`react-markdown` + `remark-gfm`** (GFM tables/lists/strikethrough).
Render **without raw-HTML** (react-markdown ignores embedded HTML by default → inherently XSS-safe;
do **not** add `rehype-raw`). Style the output with a small **`.kb-prose`** block using the KB type
tokens (Fraunces headings · Source Sans body · JetBrains `code`/`pre` on `--kb-surface-sunken` · teal
`--kb-accent` links · hairline `blockquote`/`hr`) — an on-token extension for the reader surface (no
prose spec was designed; flagged for the review). Keep it minimal; co-locate the CSS.

**Copy `web/src/content/documents.ts`** (new, barrel-exported) — page title/lead, search
labels/placeholder/hint, filter labels, column headers, the two empty-state strings, pager label,
read-view headings/field labels, not-found copy. Copy-as-data (no inline strings).

## Design fidelity — RESPECT THE DESIGN

**No documents specimen exists** (only dashboard + login) — compose faithfully from the designed
`.kb-*` vocabulary following the dashboard patterns + vocky's structure; do not invent new visual
design. `.kb-appsearch` was authored *for* this surface (per its CSS comment). Reuse `.kb-dtable`
(`DataTable`), `.kb-empty`/`.kb-dtable__empty` (the two empty states), `.kb-panel`, `.kb-chip` (tags),
the type helpers, and `.kb-appbtn--*` (pager); `lucide-react` icons. The one designed-vocabulary gap
is the **reader prose** style (`.kb-prose`, built from KB tokens) — flagged for the review; a future
design pass can formalize a reader spec. Reference: `web/design/canvas/components/console/console.css`
(`.kb-appsearch`, `.kb-dtable`, `.kb-empty`) + `pages/app-dashboard.card.html`.

## Verification (executor runs before returning `done`)

- **Backend:** the terse `/app/documents` + `/app/search` test (shapes · tenant-isolation/no-leak ·
  **unmetered** · UUID→name bridge) + the existing suite green.
- **Frontend:** `pnpm --dir web typecheck` · `lint` · `test` (add a terse test only where it adds
  value — e.g. the `readActiveParams`/`toQuery` blank-dropping or the offset-pager math) · `build`
  (`/documents` + `/documents/[id]` compile as dynamic routes; the new deps resolve).
- **E2E (smoke):** if a backend + seeded session is available, browse documents, search (verify ranked
  results + snippets), open a doc (rendered markdown), and confirm a bad id → branded not-found;
  otherwise leave interactive E2E to the phase review (same no-host-Postgres limit as S3/S4). The
  orchestrator runs `python3 scripts/workflow.py validate` after the `done` verdict.

## Doc impact (executor appends to `phase.md`; the REVIEW consolidates)
- `api.md` — the three new unmetered, session-scoped, tenant-scoped `/app` read routes
  (`GET /app/documents`, `/app/documents/{id}`, `/app/search`) + the project UUID→name bridge.
- `architecture.md` — the app as the **per-tenant knowledge viewer** (resolves the DECOMP
  "coexist-vs-replace the mkdocs viewer" question: per-tenant browsing lives in the app; the public
  mkdocs site stays tenant #1's public surface); web-UI reads are unmetered `/app` routes.
- `frontend.md` — the documents browse/search/read surface + `lib/knowledge/app.ts`
  documents/search functions + the markdown reader (`react-markdown`/`remark-gfm` + `.kb-prose`).
- `experience.md` — the documents UX (browse · search · read) and the Documents rail item going live.

## Out of scope (deferred)
- Document **editing/create/delete** from the web UI (read + search only — writes stay `/api/*`).
- Tag-filter UI + the `.kb-appsearch` keyboard shortcut (routes accept `tag`, but the UI surfaces
  project + q for now).
- The in-app **graph** (**S6**, the last slice).

## Critical files
- **Backend:** `server/documents_api.py` (new — 3 routes + the UUID→name bridge helper) + mount in
  `server/main.py`; reuses `server/db.py` (`list_documents`/`count_documents`/`get_document`),
  `server/search.py` (`search`), `server/accounts/service.py` (`get_project`); a terse test under `tests/`.
- **Frontend (new):** `web/src/app/(app)/documents/{page.tsx,not-found.tsx}` +
  `web/src/app/(app)/documents/[id]/{page.tsx,not-found.tsx}`; a `.kb-appsearch` search component +
  the markdown reader component (+ co-located `.kb-prose` CSS); `web/src/content/documents.ts`.
- **Frontend (edit):** `web/src/lib/knowledge/app.ts` (+ documents/search); `web/src/lib/knowledge/types.ts`
  (+ document/search shapes); `web/src/content/{index.ts,app.ts}` (barrel + drop Documents `soon`);
  `web/package.json` (+ `react-markdown`, `remark-gfm`).
- **Templates/spec (read-only):** vocky `~/projects/personal/vocky/web/src/app/(app)/feedback/*` +
  `lib/vocky/app.ts` (`feedbackQueryString`); `web/design/canvas/components/console/console.css`
  (`.kb-appsearch`, `.kb-dtable`, `.kb-empty`) + `pages/app-dashboard.card.html`.
