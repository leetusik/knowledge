# Plan — P16.S1: Backend — HTML ingest, storage, text extraction, indexing

Operator-approved at the do-whole-phase gate, 2026-07-21. Executor: `slice-executor-high` (`risk: high`).

Read `phase.md` first (Pinned design decisions + Constraints) — this plan implements pins 2–4 and the backend half of pin 5. Recon below is grounded in exact current signatures (verified 2026-07-21); trust but re-verify locally as you edit.

## Scope

Additive, format-aware backend: `POST /api/documents` accepts `format: "md"|"html"`; HTML docs stored canonical on disk as `docs/<project>/<date>-<slug>.html` with a leading `<!--kb … -->` comment-frontmatter; extracted plain text fills the DB `markdown` column (FTS/snippets/embeddings unchanged); new disposable `format`/`raw_html` columns; reindex/seed widened to `.html`; new session-guarded `GET /app/documents/{doc_id}/raw` serving the raw HTML with sandbox CSP headers. **Markdown docs stay byte-identical everywhere** (rendering, storage, search, frontmatter). No web/, no mcp-server/ changes in this slice.

## Uniform body rule (prevents disk↔DB drift — the slice's core invariant)

`body` = on-disk content minus the frontmatter block. Then:
- md: DB `markdown` = body; `raw_html` = NULL; `format` = 'md'
- html: DB `markdown` = `extract_html_text(body)`; `raw_html` = body; `format` = 'html'

`create_document` and `reindex._index_file` both apply this same rule, so a fresh-DB reindex reproduces exactly what the write path stored.

## Changes by file (server/)

1. **`documents.py`**
   - `rel_path(project, date, slug, fmt="md")` — extension by format; default keeps existing callers unchanged.
   - `validate_related`: accept rel paths ending `.md` **or** `.html` (rest of the shape checks unchanged).
   - HTML comment-frontmatter: factor the inner YAML lines out of `serialize_frontmatter` (shared helper) and add `serialize_html_frontmatter(...)` → `<!--kb\n<same inner lines>\n-->\n`, plus `parse_html_frontmatter(text) -> (meta, body)` parallel to `parse_frontmatter` (file must start with the `<!--kb` line; closing `-->` line; `yaml.safe_load` the inner; `FrontmatterError` on malformed). An HTML comment before `<!DOCTYPE html>` is legal and quirks-safe; served body excludes it anyway per the body rule.
   - `extract_html_text(html) -> str` — stdlib `html.parser.HTMLParser` subclass: ignore content inside `script/style/template/noscript`; collect text nodes; coarse block-boundary newlines + whitespace normalization. Terse (~40 lines), no new deps.
   - `write_document_file(..., fmt="md")`: for html write `serialize_html_frontmatter + "\n" + _normalize_body(body)`; keep the self-roundtrip property (re-parse own output with the matching parser) and return the parsed-back **body** (raw html for html docs — caller derives extracted text via the body rule). md path byte-identical.
2. **`db.py`** — `_SCHEMA` documents table gains `format TEXT NOT NULL DEFAULT 'md'` and `raw_html TEXT`; `init_db` adds both via the existing PRAGMA-guarded `ALTER TABLE ADD COLUMN` pattern (the `related` precedent); `upsert_document(..., format="md", raw_html=None)` threaded through INSERT columns **and** the `ON CONFLICT … DO UPDATE SET` list (`format` is a Python builtin shadow — a keyword-only param named `format` is fine, just don't call `format()` in that scope). FTS definition untouched.
3. **`main.py`** — `DocumentIn.format: Literal["md","html"] = "md"` (free 422 on bad values); `create_document` passes format into `rel_path`/`write_document_file`, applies the body rule for the upsert (`markdown` = extracted text for html) and embeddings input (extracted text — the existing `document_input(title, stored_markdown)` call shape works if `stored_markdown` is set per the body rule); response gains additive `format`; `_public_doc`'s `_INTERNAL` drop-set gains `"raw_html"` (never in `/api` JSON — `format` IS exposed). 409 pre-check / git add paths / recent-index calls unchanged (they key on `rel`).
4. **`reindex.py`** — `_FILENAME_RE` widened to accept `\.(md|html)$`; `_walk_root` globs both `*.md` and `*.html` (keep deterministic order); `reindex_path` extension check widened; `_index_file` branches on extension → matching frontmatter parser + body rule → upsert with `format`/`raw_html`. Malformed comment-frontmatter → the same skip-with-reason path as md. `_sync_embeddings` unchanged (embeds the `markdown` column = extracted text for html).
5. **`seed.py`** — `_discover_projects`: it reuses `reindex._FILENAME_RE` (auto-widened); add the `*.html` glob beside `*.md`.
6. **`documents_api.py`** — `_DROP` gains `"raw_html"` (list + single GET never carry it); new route:
   `GET /app/documents/{doc_id}/raw` (`require_user`, tenant-scoped `db.get_document(conn, doc_id, tenant_id=str(ctx.tenant.id))`): 404 when missing / cross-tenant / `format != "html"` / empty `raw_html`; else `Response(content=raw_html, media_type="text/html; charset=utf-8")` with headers:
   - `Content-Security-Policy: sandbox allow-scripts; frame-ancestors 'self'`
   - `X-Frame-Options: SAMEORIGIN`
   - `X-Content-Type-Options: nosniff`
   - `Cache-Control: no-store`
   (S2 relays these via the BFF; CSP `sandbox` also privilege-strips a direct top-level visit — the pinned defense in depth. `/app` is unmetered — no usage stash.)

Known accepted quirk (record in result.md, don't engineer around): overwriting the same slug with the other format yields a different rel_path (extension differs) — both files can coexist; delete path is already rel_path-keyed.

## Tests (terse, per contract)

One new focused `tests/test_html_documents.py` (follow `test_api_write.py`'s per-file client fixture — env vars set before `from server.main import app`, real git tmp repo — and `test_documents_api.py`'s authed `/app` fixture pattern): POST `format:"html"` with a small quiz-style HTML (incl. a `<script>`) → 201, `.html` rel_path + `format` in response; on-disk file starts `<!--kb`; DB row per body rule (script text absent from `markdown`, `raw_html` intact); `/api/documents/{id}` carries `format`, never `raw_html`; fresh-DB `reindex()` reproduces identical `markdown`/`raw_html`; FTS search matches extracted text; raw route 200 + `text/html` + CSP header for the html doc, 404 for an md doc; `validate_related` accepts `.html`. Keep it one small file — no fixture sprawl. Existing md suites must stay green **unmodified** (the byte-exact frontmatter assertions in `test_api_write.py` are the regression guard).

## Explicitly OUT of scope — plugin parity (pre-existing red gate)

`scripts/plugin_parity.py` currently FAILS on main with 34 pre-existing issues (P10+ server growth never mirrored into `plugin/templates/kb/`; verified 2026-07-21, before any P16 source change). Do NOT touch `plugin/templates/` — S1's edits only add byte-drift lines to already-drifted files. Append a one-paragraph Findings note to `phase.md` recording this (pre-existing red gate; P16 not the cause; remediation belongs to the plugin/skill phase P17) so P16.REVIEW doesn't trip on it.

## Validation (run and report exact commands + output)

- Full backend suite green: `uv run pytest tests -q` (or the repo's Makefile test target if one exists).
- Confirm the new test file covers the round trip above and existing tests were not modified.

## On finish

Write `result.md` (free-form) in this slice folder; append to `phase.md`: durable cross-slice notes (anything S2/S3 must know — e.g. the exact raw-route path + header set, the comment-frontmatter syntax), the plugin-parity Findings note, and one-line Doc-impact entries (api: `format` field + raw route; backend/architecture: HTML doc type storage/extraction/reindex; data: `format`/`raw_html` columns). Do not commit; do not transition status; no `doc-new-version`; no `new-slice`.
