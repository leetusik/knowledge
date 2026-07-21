# P12.S5 — Per-tenant documents browse + search — result

Built the per-tenant knowledge viewer: three new **unmetered** `/app` read routes on
the backend + the server-rendered documents browse/search/read surface on the
frontend, and flipped the Documents rail item live. Open question **(a)** is resolved
as built: unmetered `/app` read routes (not the metered `/api/*`), with the
control-plane project-UUID → content-plane project-name bridge.

## What I built

### Backend (`server/`)
- **`server/documents_api.py` (new)** — three `require_user`-guarded, tenant-scoped,
  **unmetered** routes reusing the S1 store/search **as-is**:
  - `GET /app/documents` (`project?: UUID`, `tag?`, `limit=50 ≤200`, `offset=0`) →
    `{total, items}` newest-first.
  - `GET /app/documents/{doc_id}` → the projected doc **with** `markdown` (404 on
    missing/cross-tenant — `db.get_document` scopes by `tenant_id`).
  - `GET /app/search` (`q` required, `project?: UUID`, `tag?`, `limit=10 ≤50`,
    `offset=0`) → `{query, mode, total, limit, offset, results}` (`SearchQueryError →
    400`).
  - `_resolve_project_name()` — the **UUID→name bridge**: resolves a supplied project
    UUID via `AccountsService.get_project` scoped to the caller's tenant (**404 if
    missing/cross-tenant**, mirroring `app_api._load_scoped_project`), then passes the
    resolved **name** to the store/search.
  - `_app_doc()` projector — drops `tags_text` + `tenant_id` (the `/api` projector
    leaks `tenant_id`; this one must not) + `markdown` on the list.
  - **Unmetered by construction** — never sets `request.state.usage`, so hitting any
    route moves no usage counter (the store/search layer is metering-free).
- **`server/main.py`** — mounted `documents_api.router` after `dashboard_api`.
- **`tests/test_documents_api.py` (new)** — the S3 Postgres-harness pattern, seeding
  documents straight into the throwaway SQLite (`db.upsert_document`, tenant-scoped).
  Five terse cases: list/detail shapes + newest-first + projector · UUID→name bridge
  filter · tenant-isolation (cross-tenant doc id/project → 404, no list/search leak) ·
  search shape · **unmetered** (before==after `usage_events`) · requires-auth (401).

### Frontend (`web/`)
- **`lib/knowledge/app.ts`** — `getDocuments`/`getDocument`/`searchDocuments` (query
  strings via a `URLSearchParams` `documentsQueryString`, the vocky
  `feedbackQueryString` port; blank omitted, no `encodeURIComponent` on top).
- **`lib/knowledge/types.ts`** — `KbDocumentListItem`/`KbDocument`/`KbDocumentsPage`/
  `KbSearchResult`/`KbSearchPage`/`KbDocumentsQuery`.
- **`lib/knowledge/documents-query.ts` (new, pure)** — the `searchParams` round-trip
  (`PARAM_KEYS`→`takeFirst`→`readActiveParams` drop-blanks→`toQuery`) + **offset**
  pager math (`activeLimit`/`activeOffset`/`pagerOffsets`/`documentsHref`). Extracted
  (no `server-only`) so the Node vitest imports it (the S4 `credential-status.ts`
  precedent).
- **`app/(app)/documents/page.tsx` (new)** — `.kb-appsearch` GET form (magnifier + `q`
  + project UUID `<select>` + Reset `<Link>`) → branch on `q` (search ranked+snippet /
  browse newest-first) → `.kb-dtable` (Title link + snippet sub · Project · Date mono ·
  Tags chips) → two empty states → offset pager + "N results". Snippet `<mark>` render
  is XSS-safe (split + rebuilt with real `<mark>`, never `dangerouslySetInnerHTML`).
- **`app/(app)/documents/[id]/page.tsx` (new)** — `requireIdentity()` outside any try;
  non-integer id → `notFound()`; `loadDocument()` maps 404/400 → `notFound()`. Back
  link + header + metadata strip + rendered markdown in a `.kb-panel`.
- **`app/(app)/documents/[id]/markdown-body.tsx` + `prose.css` (new)** —
  `react-markdown@10` + `remark-gfm@4`, **no `rehype-raw` → XSS-safe**; a server
  component (zero client island); styled by a minimal on-token `.kb-prose` block.
- **`app/(app)/documents/not-found.tsx` + `[id]/not-found.tsx` (new)** — branded
  `.kb-empty` not-founds (bad `?project=` filter · bad id).
- **`content/documents.ts` (new)** + `content/index.ts` barrel; **`content/app.ts`** —
  dropped `soon` from the Documents nav item (rail item now live; `rail-nav.tsx`
  unchanged).
- **`package.json`** — added `react-markdown` (10.1.0) + `remark-gfm` (4.0.1).

## Validation (all green)

- **Backend** `.venv/bin/python -m pytest`:
  - Default (no DSN): **65 passed, 8 skipped** (the Postgres-gated dashboard +
    documents suites skip cleanly).
  - With `KB_TEST_DATABASE_URL` pointed at a throwaway `kb_documents_test` DB on
    vocky's Postgres (`127.0.0.1:55432`): **73 passed, 0 skipped** — the 5 new
    documents tests + the S3 dashboard tests all run and pass. (Throwaway DB dropped
    after.)
- **Frontend** (`pnpm --dir web …`): `typecheck` ✓ · `lint` ✓ (0 warnings) ·
  `test` ✓ (**54 passed**, incl. the new `documents-query.test.ts` — blank-dropping +
  pager clamp + href) · `build` ✓ (`/documents` + `/documents/[id]` compile as `ƒ`
  Dynamic; `react-markdown`/`remark-gfm` resolve in the RSC graph).
- **Markdown reader smoke** (throwaway server-render, not committed): GFM tables +
  bold render; raw HTML is neutralized — `<script>` dropped, `<img … onerror>` escaped
  to inert `&lt;img…&gt;` text, no live element. Confirms XSS-safety without
  `rehype-raw`.

## Deviations from `plan.md`

1. **`documents_api.get_conn` is an `async def` generator dependency** (the plan said
   "reuse the store/search as-is" but didn't specify the dependency shape). Required:
   the handlers are `async def` (they `await` the accounts service for the bridge), so
   the SQLite connection must be opened on the event-loop thread — a sync `def`
   dependency runs in FastAPI's threadpool and hands a cross-thread connection
   (`sqlite3.ProgrammingError`, check_same_thread). Hit and fixed during backend
   testing. See the S5 phase note.
2. **Extracted `documents-query.ts` as a pure module** rather than inlining the
   round-trip in `page.tsx` (the plan located them in the page). Done so the terse
   Node vitest can import them (the S4 `credential-status.ts` precedent); the page
   imports from it.
3. **The `/app` projector keeps `related`** (forward `related:` rel_paths) — the plan
   said drop only `tags_text`+`tenant_id`(+list-`markdown`), which leaves `related` in.
   `KbDocumentListItem.related` reflects it; a minor superset of the plan's listed
   fields, and useful for **S6's graph edges**.
4. **Added a list-level `documents/not-found.tsx`** with its own `filterNotFound` copy
   (for a bad `?project=` filter), alongside the `[id]/not-found.tsx` the plan named —
   both are in the plan's critical-files list, so this fills the pair.
5. **Snippet highlighting** — implemented safe `<mark>` reconstruction (split + real
   `<mark>` elements) rather than dropping the markers or using `dangerouslySetInnerHTML`
   (the plan said "append the snippet" without specifying; this preserves the
   highlight while staying XSS-safe).

## Notes for S6 / the review

- **Design fidelity (flag):** no documents specimen was in the KB handback — both
  pages are a faithful composition of the delivered `.kb-*` vocabulary; the one new
  bit is the minimal on-token **`.kb-prose`** reader style (no reader/prose spec was
  designed) — flagged for a future design pass to formalize.
- **Content store for the graph slice (S6):** the same S1 SQLite (`db.py`) scoped by
  `tenant_id`. The **UUID→name bridge** (`_resolve_project_name`) and the **async
  `get_conn`** are ready to reuse for a per-project `/app/graph`. The projected doc's
  **`related`** (forward rel_path links) + `tags` are exactly what
  `scripts/graph_hook.py` inverts — a per-tenant graph endpoint can build edges from
  `db.list_documents(...)` over a tenant's docs (no docs/ frontmatter walk needed).
  Metering stays opt-in, so an `/app/graph` read is unmetered the same way.
- **Interactive full-stack E2E** (browser through the BFF against a running backend +
  seeded login) was **not** stood up — same no-host-mapped-Postgres limitation as
  S3/S4 (vocky's Postgres backs the automated route test, but the Next BFF + sealed
  session + a live uvicorn is a larger stack). The route behavior is covered
  end-to-end by the `TestClient` suite and the markdown render by the server-render
  smoke; left the visual/interactive E2E to the phase review.
