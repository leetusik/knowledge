# Result — P16.S1: Backend — HTML ingest, storage, text extraction, indexing

Executor: `slice-executor-high`. Status: **done**. Date: 2026-07-21.

Additive, format-aware backend for HTML explainer documents. Markdown docs stay
byte-identical; every change is additive (new optional input field, new output
field, new columns, new route). No `web/`, `mcp-server/`, or `plugin/templates/`
touched.

## What changed (by file)

- **`server/documents.py`**
  - `rel_path(project, date, slug, fmt="md")` — `.html` extension for `fmt="html"`,
    default keeps all existing callers byte-identical.
  - `validate_related` accepts rel paths ending `.md` **or** `.html`.
  - Factored the shared inner YAML field lines into `_frontmatter_inner_lines(...)`;
    `serialize_frontmatter` now wraps them in `---` fences (verified byte-identical to
    the previous output — the `test_api_write.py` `_EXPECTED_FM` assertion is the
    guard and stays green).
  - `serialize_html_frontmatter(...)` → `<!--kb\n<same inner lines>\n-->\n` and
    `parse_html_frontmatter(text) -> (meta, body)` parallel to `parse_frontmatter`
    (file must start with a bare `<!--kb` line; header ends at the first bare `-->`
    line; `yaml.safe_load` the inner; `FrontmatterError` on malformed).
  - `extract_html_text(html) -> str` — stdlib `html.parser.HTMLParser` subclass:
    drops the content of `script`/`style`/`template`/`noscript`, inserts coarse
    block-boundary newlines, and whitespace-normalizes (collapse space runs, trim per
    line, drop blanks). No new deps.
  - `write_document_file(..., fmt="md")` — for `html` writes
    `serialize_html_frontmatter + "\n" + _normalize_body(body)`, re-parses its own
    output with the matching parser (self-roundtrip property preserved), and returns
    the parsed-back body (raw HTML for html docs; the caller derives extracted text).
    md path byte-identical.
- **`server/db.py`** — `_SCHEMA` `documents` gains `format TEXT NOT NULL DEFAULT 'md'`
  and `raw_html TEXT`; `init_db` back-fills both via the existing PRAGMA-guarded
  `ALTER TABLE ADD COLUMN` pattern (the `related` precedent); `upsert_document`
  gains keyword-only `format="md"` / `raw_html=None`, threaded through the INSERT
  columns **and** the `ON CONFLICT … DO UPDATE SET` list. FTS definition untouched.
- **`server/main.py`** — `DocumentIn.format: Literal["md","html"] = "md"` (free 422 on
  a bad value); `create_document` passes `fmt` into `rel_path`/`write_document_file`,
  applies the body rule (html → `markdown` = `extract_html_text(...)`, `raw_html` =
  raw body; md → `markdown` = body, `raw_html` = None), threads `format`/`raw_html`
  into the upsert, and adds an additive `format` field to the 201 response. Embeddings
  input already keys on `stored_markdown` (extracted text for html) — unchanged.
  `_INTERNAL` drop-set gains `raw_html` (never in `/api` JSON; `format` IS exposed).
- **`server/reindex.py`** — `_FILENAME_RE` widened to `\.(md|html)$` (group 3 = ext);
  `_walk_root` globs a merged, sorted `*.md` + `*.html`; `reindex_path` extension check
  widened to `.md`/`.html`; `_index_file` branches on extension → matching frontmatter
  parser + the same body rule → upsert with `format`/`raw_html`. Malformed
  comment-frontmatter → the same skip-with-reason path as md. `_sync_embeddings`
  unchanged.
- **`server/seed.py`** — `_discover_projects` globs `*.md` + `*.html` (the shared
  `_FILENAME_RE` auto-widened); order irrelevant (a set).
- **`server/documents_api.py`** — `_DROP` gains `raw_html`; new
  `GET /app/documents/{doc_id}/raw` (`require_user`, tenant-scoped): 404 when missing /
  cross-tenant / `format != "html"` / empty `raw_html`; else `Response(raw_html,
  media_type="text/html; charset=utf-8")` with the sandbox header set (below).

## The body rule (core invariant, kept identical on write and reindex)

`body` = on-disk content minus the frontmatter block. Then:
- md: DB `markdown` = body; `raw_html` = NULL; `format` = 'md'.
- html: DB `markdown` = `extract_html_text(body)`; `raw_html` = body; `format` = 'html'.

Both `create_document` and `reindex._index_file` apply this same rule against the same
normalized body string, so a fresh-DB reindex reproduces the write path's row
byte-for-byte. This is proved by `test_html_fresh_reindex_reproduces_row` (wipe the
sqlite + `reindex()` → identical `markdown` and `raw_html`).

## Validation (exact commands + outcomes)

- `uv run pytest tests -q` → **70 passed, 13 skipped, 1 warning** (baseline before this
  slice was 65 passed / 12 skipped; +5 new non-Postgres html tests pass, +1
  Postgres-gated raw-route test skips cleanly here — no Postgres locally, exactly like
  the existing `test_documents_api.py` suite). The Starlette/httpx deprecation warning
  is pre-existing.
- `uv run pytest tests/test_html_documents.py -v` → 5 passed, 1 skipped.
- Raw route de-risked out-of-band (Postgres unavailable locally): a scratchpad check
  that overrides `require_user` confirmed `GET /app/documents/{id}/raw` returns 200 +
  `text/html; charset=utf-8` + `Content-Security-Policy: sandbox allow-scripts;
  frame-ancestors 'self'` + `X-Frame-Options: SAMEORIGIN` + `X-Content-Type-Options:
  nosniff` + `Cache-Control: no-store`, serves the raw HTML (script intact), 404s for
  an md doc and a missing/cross-tenant id, and the detail projection exposes `format`
  while never leaking `raw_html`. (This override check was not added to the committed
  suite — the committed raw-route test follows the plan's `test_documents_api.py`
  Postgres-gated `/app` fixture pattern, so it runs in a Postgres CI.)
- Existing md suites unmodified — `test_api_write.py`'s byte-exact `_EXPECTED_FM` /
  frontmatter assertions still pass, the regression guard for markdown byte-identity.

The new `tests/test_html_documents.py` (one focused file) covers: html POST → 201 +
`.html` rel_path + `format` in the response; on-disk file starts `<!--kb` with the raw
`<!DOCTYPE html>` after the closing `-->`; DB row per the body rule (script/style text
absent from `markdown`, `raw_html` intact); `/api/documents/{id}` carries `format`,
never `raw_html`; fresh-DB reindex reproduces identical `markdown`/`raw_html`; FTS
matches extracted text but not `<script>`-only terms; md docs stay additive-`format`
`md`; bad `format` → 422; `validate_related` accepts `.html`; and (Postgres-gated) the
raw route 200 + headers + 404 for md + auth guard.

## Raw route — the exact contract S2 relays

- Path: `GET /app/documents/{doc_id}/raw` (session-guarded via `require_user`,
  tenant-scoped by `str(ctx.tenant.id)`).
- 200 body: the raw HTML **without** the comment-frontmatter — it starts at
  `<!DOCTYPE html>` (no quirks-mode prefix). `media_type="text/html; charset=utf-8"`.
- Headers (S2 must relay these verbatim through the BFF):
  - `Content-Security-Policy: sandbox allow-scripts; frame-ancestors 'self'`
  - `X-Frame-Options: SAMEORIGIN`
  - `X-Content-Type-Options: nosniff`
  - `Cache-Control: no-store`
- 404 when: missing id, cross-tenant id, `format != "html"`, or empty `raw_html`.
- Unmetered (`/app`) — no `request.state.usage` stash.

## Known accepted quirk (recorded, not engineered around)

Overwriting the same slug with the other format yields a different `rel_path` (the
extension differs), so both an `.md` and an `.html` file can coexist for the same
`project/date-slug`. The delete path is already `rel_path`-keyed, so this is
consistent; it is an accepted edge, not a bug.

## Deviations from `plan.md`

- **Plugin-parity assumption corrected.** The plan stated S1's edits "only add
  byte-drift lines to already-drifted files." In fact `server/documents.py` was
  byte-**identical** to its shipped plugin template before this slice, so my edit
  newly drifts it. Net effect on the (already-red) gate: 34 → 36 issues (documents.py
  newly byte-drifts +1; the new `tests/test_html_documents.py` is unshipped +1). This
  does not change the conclusion — the gate was already failing from P10+ server
  growth and remediation belongs to P17; per the plan I did **not** touch
  `plugin/templates/`. Full note in `phase.md` Findings.
- The `test_html_fresh_reindex_reproduces_row` assertion was relaxed from
  `skipped == []` to "the html rel_path is not in skipped" because the write path
  auto-creates the project landing `explainers/index.md`, which reindex correctly
  skips (no date-prefixed filename) — pre-existing landing behavior, unrelated to
  html.

No other deviations.
