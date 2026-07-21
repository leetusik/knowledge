# Phase P16: HTML explainer documents end-to-end

_Intent: see [intent.md](intent.md)._

## Objective

Make standalone self-contained HTML explainer documents a first-class KB document type: the document API accepts them, the web app renders them safely with their interactivity (quiz JS) working, search indexes their extracted text, and the MCP read path handles them sanely — alongside existing markdown docs.

## Context

This phase is item 4 of the operator request (see `intent.md`) plus the enabling API
work: HTML explainers become a first-class KB doc type end-to-end. Cross-repo order:
bootstrap P7 (done) → **knowledge P16 (this)** → knowledge P17 (skill upgrade + public
ingestion) → bootstrap P8. P16 lands the rendering pipeline first so emitted explainer
HTML is renderable the moment the P17 skill ships. The core design problem — preserve
"XSS-safe by construction" while letting explainer quiz JS run — is resolved under
_Pinned design decisions_ below (sandboxed opaque-origin iframe).

## Decomposition

Three implementation slices, cut along the plane boundary (backend → web → MCP) so
each slice's disk↔DB↔wire round-trip is coherent on its own. End-to-end behavioral
validation belongs to `P16.REVIEW` (no separate verification slice). `depends_on` is
advisory (existence-checked only); the real ordering is by `order`.

- **P16.S1 — Backend: HTML ingest, storage, text extraction, indexing** (`risk: high`, order 1).
  The riskiest, most cross-cutting slice: it touches the frozen `/api/*` contract
  (additively), the disposable content-plane schema, `reindex` (the drift-repair
  critical path), `seed`, and embeddings, and introduces stdlib text extraction plus
  a new raw-HTML read route. Kept as ONE slice because splitting the write path from
  reindex would leave an incoherent state (an `.html` on disk that reindex can't
  rebuild = drift). Covers: additive `format` on `DocumentIn` + the `.html` ingest
  shape; the `.html` `rel_path` convention; format-aware `write_document_file`
  (metadata carried in a leading HTML-comment frontmatter block so disk stays
  canonical and reindex re-derives everything); stdlib `html.parser` text extraction
  → the `markdown` DB column (FTS/snippets/embeddings then work unchanged); new
  `format` + `raw_html` columns in `_SCHEMA` + `init_db` migration; `db.upsert_document`
  gaining those params; widening every hardcoded `.md` point in `reindex`
  (`_FILENAME_RE`, `_walk_root`'s `rglob`, `reindex_path`'s `.endswith`, format-aware
  `parse_frontmatter`) and `seed._discover_projects`; `validate_related` accepting
  `.html`; additive `format` field on the `/api/documents/{id}` + by-path + `/app`
  read projections (with `raw_html` kept internal, never in the JSON body); and the
  new `GET /app/documents/{id}/raw` route that serves the raw HTML as `text/html`
  with the sandbox CSP + X-Frame-Options exemption headers. Terse backend tests.
- **P16.S2 — Web: safe interactive HTML render (sandboxed iframe + raw relay)** (`risk: high`, order 2, depends_on S1).
  The XSS-safety-critical heart of the phase — high risk because a slip in the
  sandbox attributes / CSP / X-Frame exemption is a security hole, and the Next.js
  header wiring has real gotchas. Covers: the web BFF raw-relay route handler
  (reusing the unused `client.ts::getRaw` byte-passthrough seam) that relays the raw
  HTML bytes + headers to the browser; the `next.config.ts` X-Frame-Options exemption
  for the raw path (+ CSP `frame-ancestors 'self'`); the `format` switch in the
  document page (`format === "html"` → sandboxed `<iframe sandbox="allow-scripts">`
  pointing at the relay route, else the existing `<MarkdownBody>` unchanged);
  `format` added to `KbDocument`/`KbDocumentListItem`; iframe height/responsive UX
  reusing the existing KB design system (no new visual design). Terse vitest cases.
- **P16.S3 — MCP read path: format-aware `fetch_document`** (`risk: medium`, order 3, depends_on S1).
  A bounded additive change to the MCP proxy — medium risk (slice-executor-mid) is
  the cost lever here; the contract-preservation reasoning is already pinned below,
  so no deep design is needed. Covers: adding the additive `format` field to
  `_map_document` (relayed from S1's upstream read); confirming the character-cap
  truncation still applies to extracted text; and updating `mcp-server/CONTRACT.md`
  (a hand-maintained contract file, NOT a `docs/current` versioned doc — a normal
  source edit) to document the additive field, keeping contract v1. One terse MCP test.

## Findings & Notes

_Durable findings and cross-slice notes; `DECOMP` seeds this, and each slice appends when it finishes._

### Recon re-verified (2026-07-21, in-repo)

The orchestrator's starting-point recon holds. Confirmed:

- **Ingest**: `POST /api/documents` (`server/main.py::create_document`, `DocumentIn`
  at L366) takes a `markdown` string; no format/content-type field. `.md` hardcodes:
  `documents.py::rel_path` (L88), `validate_related` (L115 `endswith(".md")`),
  `reindex._FILENAME_RE` (L26), `reindex_path` (L187 `endswith(".md")`), `_walk_root`
  (L244 `rglob("*.md")`), `seed._discover_projects` (L62 `rglob("*.md")`).
- **Store**: `db.py::_SCHEMA` — `documents` table, body in `markdown` TEXT column;
  `init_db` already does disposable migrations (a drop/rebuild for `tenant_id`, an
  `ALTER TABLE ADD COLUMN` for `related`) — so adding columns is cheap, no Alembic.
- **Search**: FTS5 external-content over `(title, tags_text, markdown)` + auto-sync
  triggers; embeddings key on `document_input(title, markdown)`. Extracted text in
  `markdown` ⇒ FTS/snippets/embeddings work unchanged.
- **Viewer**: `documents/[id]/page.tsx` → `markdown-body.tsx` = react-markdown +
  remark-gfm, **no** `rehype-raw`. Fetch: server component → `app.ts::getDocument` →
  `client.ts::getJson` → `GET /app/documents/{id}`. `client.ts::getRaw` (L100-112) is
  the unused byte-passthrough seam ("kept for S5/S6 read surfaces") — the raw-HTML hook.
- **X-Frame trap**: `next.config.ts::headers()` sets `X-Frame-Options: DENY` on
  `/:path*` (blocks even same-origin framing). No CSP exists yet.
- **MCP**: `server.py::_map_document` returns `{id, rel_path, title, project, date,
  tags, url, markdown, truncated, total_chars}` — no `format` field yet; adding one is
  additive. `CONTRACT.md` v1 additive-only.
- **Adjacent surface**: mkdocs (`mkdocs.yml`) has no `nav:`/`strict:` — auto-nav from
  the tree; Material copies non-`.md` files through as raw static assets.
  `graph_hook` walks `*.md` only (L65/L99) and further filters on a `source` mapping
  in frontmatter (an `.html` file has none) → HTML ignored. `site_smoke.discover_projects`
  counts `*.md` (excluding `index.md`). `ensure_project_landing` writes an `index.md`
  (no frontmatter, a non-doc). Delete path (`_delete_document`) keys off `rel_path` →
  already format-agnostic.

### Pinned design decisions

**1. Rendering approach — dedicated raw route + sandboxed iframe (opaque origin).**
The web viewer renders an `format === "html"` document in an
`<iframe sandbox="allow-scripts">` (crucially **without** `allow-same-origin`) whose
`src` points at a same-origin BFF raw-relay route. Why this preserves the
"XSS-safe by construction" stance *while* letting quiz JS run:

- `sandbox="allow-scripts"` with **no** `allow-same-origin` ⇒ the framed document gets
  an **opaque origin**: no `document.cookie`, no `localStorage`/`sessionStorage`/
  IndexedDB, and `window.parent`/`window.top` DOM access is cross-origin (blocked by
  SOP). `allow-scripts` alone is what keeps the interactive multiple-choice quiz
  working — the whole point.
- No `allow-forms`, `allow-popups`, `allow-top-navigation`, `allow-modals`,
  `allow-same-origin` ⇒ no form posts, no popups, no breaking out to navigate the top
  frame, no reading the parent app.
- The app session cookie is `httpOnly` (JS can't read it regardless) AND the `/app`
  and `/api` planes have **no CORS** (server-to-server) — so a credentialed
  cross-origin `fetch` from the opaque iframe to the API is blocked. The untrusted
  explainer JS therefore cannot exfiltrate the session or call the API as the user.
- **Defense in depth for a direct top-level visit** to the raw URL: the raw response
  carries `Content-Security-Policy: sandbox allow-scripts` (+ `frame-ancestors 'self'`),
  so the browser applies the sandbox to the top-level document too — a person who
  navigates straight to the raw bytes is *also* privilege-stripped.
- **X-Frame-Options exemption**: the global `X-Frame-Options: DENY` blocks even
  same-origin framing, so the raw route must drop it / set `SAMEORIGIN` and rely on
  CSP `frame-ancestors 'self'` (only the app frames it). The parent document page
  keeps `DENY`.
- **iframe height/UX**: the framed opaque-origin doc can't be measured cross-origin
  (parent can't read its `scrollHeight`, and the parent can't inject a height-reporter
  into an opaque-origin child). Baseline: a generous responsive height (e.g. tall
  `min-height`) with the iframe scrolling internally, reusing existing KB chrome. An
  optional `postMessage` height handshake (the child posts its height, parent matches
  on `event.source === iframe.contentWindow`) is a later enhancement the explainer
  template (P17) can opt into — **not** required for P16.
- *Ruled out*: sanitize-and-inline (kills quiz JS). *Fallback if the route+iframe
  sizing proves worse*: `srcdoc` iframe (same sandbox/opaque-origin safety, no new
  route, but inflates the parent payload and has the same sizing constraint) — the web
  slice may pivot to it within this pinned safety intent, escalating if the pin breaks.

**2. Ingest shape (additive to the frozen `POST /api/documents`).** `DocumentIn` gains
an optional `format: "md" | "html"` (default `"md"`; existing callers unchanged).
The raw content still arrives in the `markdown` string field (renamed in intent to
"the document body"; for `format="html"` it carries the self-contained HTML). This
keeps the request shape and the write path's single body field — no mutually-exclusive
second field to validate. The `.html` `rel_path` convention: `documents.py::rel_path`
becomes format-aware → `{project}/{date}-{slug}.html` for HTML docs.

**3. Storage / indexing shape.** Raw HTML is **canonical on disk** at
`docs/<project>/<date>-<slug>.html`, carrying its metadata in a **leading HTML-comment
frontmatter block** (e.g. `<!--kb … -->` wrapping the same title/date/tags/source
fields) so the browser ignores it and `reindex` can re-derive title/tags/date/project/
tenant from the file alone (disk canonical, DB disposable — hard coupling #1 preserved).
The disposable content-plane SQLite gains two columns (free — disposable): `format`
(`'md'` default) and `raw_html` (nullable; populated only for HTML docs). The DB
`markdown` column stores **server-extracted plain text** (stdlib `html.parser`, no heavy
deps) so FTS5 / `snippet()` / embeddings (`document_input`) all work **unchanged**.
`raw_html` is rebuilt by reindex from the on-disk `.html` and is the source the raw
route serves — keeping the render path DB-backed (no per-request disk I/O, no
path-traversal surface in the route) and symmetric with how markdown docs read
`markdown` from the DB. `init_db` adds both columns via idempotent `ALTER TABLE ADD
COLUMN` (or a disposable drop/rebuild). Every hardcoded `.md` walk/match in `reindex`
and `seed` widens to include `.html`; `_index_file`/`parse_frontmatter` branch on
extension.

**4. Read paths.** `/api/documents/{id}` + `/api/documents/by-path/{rel_path}` (frozen
plane) and `/app/documents/{id}` + list gain an **additive** `format` field; `raw_html`
is kept internal (added to the projector drop-sets — never in the JSON body). The new
`GET /app/documents/{id}/raw` route (session-guarded, tenant-scoped, additive — a NEW
route never touches existing ones) serves `raw_html` as `text/html` with the sandbox
CSP + X-Frame exemption; it 404s for a non-HTML / missing / cross-tenant doc. MCP
`fetch_document` stays contract-v1: it keeps `markdown` = the readable text body (for
HTML docs = the extracted text) and adds an **additive** optional `format` field.
Contract-preservation: `markdown`'s meaning ("the document's readable text body")
is **not** repurposed for existing docs — markdown docs are byte-identical; HTML is a
*new* doc format whose readable body is the extracted text. Agents get extracted text
(the right agent surface); raw HTML is a web-viewer-only concern.

**5. Adjacent-surface stance (required: nothing breaks).**
- **mkdocs public site**: a public-tenant `.html` doc is committed to `docs/<project>/`
  and copied through by Material as a **raw static asset** (served raw at its URL);
  `graph_hook` ignores it (walks `*.md` + needs a `source` frontmatter mapping);
  `site_smoke.discover_projects` counts `*.md` only, so an HTML doc adds no gate
  requirement, and a project's auto-created `index.md` landing is unaffected. **The
  build does not break.** Serving the self-contained explainer raw on the public Pages
  site is acceptable/low-risk: that site is a **credential-less, cookie-less public
  static origin** — there is no session to compromise there; the safety-critical render
  path is the *authenticated web app*, which uses the sandboxed iframe. (P17's public
  ingestion may revisit whether HTML docs should be published there at all; not P16's
  call.)
- **`validate_related`**: widen to accept `.md` **or** `.html` (both are valid doc
  rel_paths) so HTML explainers can be cross-linked.
- **Recent index / project landing**: `update_recent_index` writes a markdown link to
  the `.html` rel_path (resolves to the raw asset on the site) — works unchanged;
  `ensure_project_landing` still writes the `.md` landing — unaffected.
- **Delete path**: already format-agnostic (keys off `rel_path`) — works for `.html`
  with no change.

### Doc impact (running list — the review slice consolidates these into doc versions)

_Non-review slices append one line per durable-truth change here; do NOT run
`doc-new-version` before the review._

- (DECOMP) No durable-doc change from decomposition itself. Anticipated for the review
  to consolidate: **api** (new `format` field + `GET /app/documents/{id}/raw` route),
  **architecture**/**backend** (HTML doc type: raw-on-disk + extracted-text-in-DB +
  `raw_html`/`format` columns + reindex widening), **frontend**/**experience**
  (sandboxed-iframe safe render of interactive explainers), **security** (the
  opaque-origin XSS-containment stance + CSP/X-Frame exemption), and possibly
  **product** (HTML explainers as a first-class KB doc type). Each implementation slice
  should append its own precise Doc-impact line as it lands.

## Constraints

- **Existing markdown docs unaffected — byte-for-byte.** Rendering (react-markdown, no
  rehype-raw), storage (`format` defaults `'md'`), search, and the on-disk `.md`
  frontmatter format all stay identical for markdown docs.
- **Frozen contracts, additive-only.** `/api/*` and the MCP tool contract (v1) change
  only by *adding* — a new optional input field (`format`), new optional output fields
  (`format`), and entirely new routes (`GET /app/documents/{id}/raw`). No existing
  field's type/presence/status/route changes; `markdown`'s contract meaning ("readable
  text body") is preserved, not repurposed for existing docs.
- **Content-plane SQLite may change freely** (it is disposable — reindex rebuilds it
  from canonical `docs/`): new `format`/`raw_html` columns via idempotent migration.
  The **Postgres control plane is untouched** (no Alembic migration; `seed` only
  widens its file-walk to discover HTML-only projects).
- **No new services / deploy topology.** Everything lands in the existing api / web /
  mcp processes; no new container, port, or edge route.
- **Keep test files small** (contract rule): terse, high-value cases per slice — a
  round-trip write→reindex→read for backend, the render-branch + relay-headers for web,
  the `format`-field mapping for MCP. E2E behavioral validation is the review's job.
- **No new visual design.** The web slice reuses the existing KB design system for the
  iframe chrome. If a slice turns out to need genuine visual decisions, it goes through
  the **design-cowork** gate (Claude Design + operator) in a separate design slice —
  never improvised by the executor.

## Open Questions

- None blocking. Two deferred-to-implementation micro-decisions, both bounded by the
  pins above: (1) the exact leading-HTML-comment frontmatter syntax for `.html` docs
  (S1's call, within "carry title/date/tags/source so reindex re-derives"); (2) whether
  the iframe uses a fixed generous height or an opt-in `postMessage` height handshake
  (S2's call — baseline is fixed height with internal scroll; the handshake is a P17
  explainer-template enhancement, not required here).
