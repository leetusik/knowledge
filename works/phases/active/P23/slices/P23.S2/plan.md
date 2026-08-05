# Plan — P23.S2 (server: version history read API, /api + /app planes)

## Read first

`../../phase.md` — pinned design, findings F4/F5 especially, and the "S1 landed" notes
(what S2 should call). The storage layer is done: `db.list_document_versions` /
`db.get_document_version` exist and carry `markdown` + `raw_html`;
`document_versions` is identity-keyed by `(tenant_id, rel_path, version)`, so id-keyed
routes resolve id → rel_path first. `documents.version` is already exposed on both
planes' document reads.

## Scope — additive read routes only

**`/api` plane (`server/main.py`, agent-facing, API-key auth like its neighbors):**
- `GET /api/documents/by-path/{rel_path:path}/versions` — list version history:
  the archived rows (version DESC) with light metadata (version, title, date, tags,
  format, archive_path, created_at) — exclude the heavy `markdown`/`raw_html` bodies
  from the list shape; include the current version's number so the agent sees the full
  chain in one call.
- `GET /api/documents/by-path/{rel_path:path}/versions/{version}` — fetch one archived
  version incl. `markdown` (and `raw_html` for html format). 404 when absent (match the
  plane's existing 404 style).
- Follow the existing by-path route conventions right above them; tenant scoping via
  `_tenant_filter(ctx)` exactly like `GET /api/documents/by-path/...`. No new usage
  event types (F4 — reads stay unmetered).

**`/app` plane (`server/documents_api.py`, web BFF, member/anonymous access):**
- `GET /app/documents/{doc_id}/versions` — list, resolving the doc via
  `_resolve_readable_doc` (member fast-path → public-project fallback, misses are 404
  never 403 — F5), then listing by its rel_path. Never sets `request.state.usage` (F4).
- `GET /app/documents/{doc_id}/versions/{version}` — one version with body for the web
  view (markdown for md).
- `GET /app/documents/{doc_id}/versions/{version}/raw` — archived html version's raw
  body with the pinned sandbox headers repeated exactly from the existing
  `GET /app/documents/{id}/raw` (`Content-Security-Policy: sandbox allow-scripts;
  frame-ancestors 'self'`, `X-Frame-Options: SAMEORIGIN`, nosniff, no-store); 404 for a
  non-html version (or absent raw), matching the existing raw route's behavior for
  non-html docs.

Keep response shapes consistent between the two planes where they overlap (same field
names as the existing document projections; archived rows come straight from the
`document_versions` columns).

## Mirrors & tests

- Mirror every changed `server/**` and `tests/**` file into `plugin/templates/kb/`
  (F2) in this slice.
- Terse tests in existing modules (`tests/test_api_write.py` or wherever the by-path
  reads are tested, `tests/test_documents_api.py`): list + fetch on `/api` after a v2
  publish; `/app` list/fetch via a public project (anonymous) and a member; raw
  archived-html headers; 404s for unknown version. A handful of cases, no scaffolding
  sprawl.

## Out of scope

Web UI (S3), skill (S4), any write-path change, metering, CLI.

## Validation

- `python3 -m pytest` (use the project venv interpreter if repo-root python3 lacks
  pytest — S1 used `.venv/bin/python -m pytest`)
- `python3 scripts/plugin_parity.py`
- `python3 scripts/workflow.py validate`

## Wrap-up

Write `result.md`; append cross-slice notes (exact route shapes for S3/S4 to code
against) + a one-line Doc impact entry to `phase.md`.
