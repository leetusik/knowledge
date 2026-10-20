# P30 server notes — the server slices' APIs as shipped

Linked from `phase.md` → `## Notes for later slices`. Moved here by P30.S4 to keep the notebook under budget;
each section keeps its source and audience tags. A slice that consumes an entry says so in its `result.md`
and may delete it here. Detail behind each entry: that slice's `result.md`.

## (from P30.S2, for S7, S11 and S13) The book API as shipped

The full contract is in `slices/P30.S2/result.md` → *Contracts as shipped*. The essentials:

- **Helpers:**
  - the manifest IO and validators are in `server/books.py` (`read_manifest`, `write_manifest`,
    `normalize_manifest`, `find_chapter`, `find_binding`, `next_position`, `validate_lang`);
  - the index is `db.replace_book` / `db.get_book` / `db.list_books` / `db.find_chapter_binding` /
    `db.chapter_bindings_for_docs`.
- **The manifest** is `{slug, title, kind, subject|null, description|null, chapters:[{key, position,
  title?, variants:{lang: rel_path}, source?}]}`.
- **A book's GET shape:** each chapter carries `variants:[{lang, rel_path, doc_id, title, slug, version,
  format, updated_at, translated_from}]`. `/app` adds `canonical_path`.
- (The S5 item, re-pointing the manifest variant on html → native, was consumed by P30.S5.)
- (The S6 item, `PUT` for binding existing documents, was consumed by P30.S6.)
- **For S7:** the CLI sends `book: {slug, title?, kind, subject?}`, `chapter: {key, position?, title?,
  source?}`, `lang`, `translated_from: {lang, version}` and `subject`. A new book needs `kind`.
- **Postgres-gated tests:** the disposable PG `kb-p28s2-pg` on `:55432` (`kb:kb`) runs them via
  `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55432/kb`.
- (The S4 item, `.assets` as a reserved dir, was consumed by P30.S4.)

## (from P30.S3, for S9 and S12) The native parser as shipped

The spec is `server/native/README.md`; the detail is in `slices/P30.S3/result.md`.

- **API:** `parse_chapter(source, reserved_ids=())` returns `.tree`, `.source` (ids written in: store
  this), `.assigned_ids` and `.refs`, or it raises `NativeFormatError`, whose `.to_detail()` is the
  422 list. The projections are `sections(tree)`/`section_map`, which are the anchor basis, and
  `search_text(tree)` for FTS.
- (The S5 items were consumed by P30.S5. The parser now also returns `.ids`, the document id
  namespace, and a `NativeFormatError` carries `.refs`, the references read before it failed.)
- **For S9:** section text and offsets (code points, with no whitespace collapse) come from
  `project.sections`. Re-anchor against them.
- **For S12:**
  - reproduce the tree, the `.txt` sections and the `.err` `<line> <code>` rows for every fixture;
  - the svg tree is already allowlisted, with `xlink:href` normalized to `href`. Scope its internal ids on
    render;
  - P29's render fallbacks stay as defence in depth (OQ5).
- (The S4 item, the asset-name rule, was consumed by P30.S4: `server/assets.py` imports
  `refs.ASSET_NAME_RE`.)

## (from P30.S4, for S7, S16, S25 and S27) Image assets as shipped

Module docstring of `server/assets.py` is the spec; the detail is in `slices/P30.S4/result.md`.

- **Publish:** `POST /api/documents` takes `assets: [{name, media_type, content_base64}]` (pydantic
  `AssetIn`, extra fields forbidden). `assets_mod.prepare_assets(items)` validates, strips and hashes
  before the lock and raises `AssetError`, whose `.to_detail()` is a list in S3's shape (`line: 0`,
  `col: 0`, `code`, `message`, plus `asset`). Codes: `asset-name`, `asset-duplicate`, `asset-type`,
  `asset-base64`, `asset-empty`, `asset-size`, `asset-magic`, `asset-dimensions`, `asset-decode`,
  `asset-animated`, `asset-count`, `asset-total`, and `asset-format` (assets on an html document). The
  201 carries `assets` (the stored map) only when the request sent some.
- **The map** (`documents.assets` / `document_versions.assets` JSON, the header's `assets:` block, the
  `/api` and `/app` detail reads; the `/app` LIST omits it): `{name: {file: "<sha256>.<ext>", media_type,
  width, height, animated[, still: "<sha256>.png"]}}`. `width`/`height` are the DISPLAYED size (an EXIF
  rotation of 90/270 swaps them). `ext` is `png | jpg | webp | gif`.
- **No inheritance:** a version's map is exactly what its publish sent. A re-explain must re-send its
  images (the CLI does), and the archived version keeps its own map and files.
- (The S5 item was consumed by P30.S5: one merged 422 list, and only a native chapter may carry
  assets, so `md` and `html` both get `asset-format`, per OQ14.)
- **For S7:** `--asset NAME=PATH` maps to one `{name, media_type, content_base64}`; the media type comes
  from the file's magic bytes (`assets_mod.sniff_media_type` is the server's rule).
- **For S16:** the render model's `Asset.url` is the BFF relay `/api/documents/{id}/assets/{file}`
  (`stillUrl` from `still`), and `width`/`height` feed `--fg-w`/`--fg-h`. The web `KbDocument` type does
  not carry `assets` yet: add it there. The backend also serves the pretty
  `GET /app/orgs/{org}/{project}/{slug}/assets/{file}`, but the web has no relay for it: the reader
  should use the id relay.
- **For S25:** the asset relay sets no `no-transform` (D37 is yours). The edge routes it by a new regex
  location in `deploy/knowledge.conf`. **Observation:** the P23 version-raw relay
  `/api/documents/<id>/versions/<v>/raw` has NO nginx location, so in production it falls into
  `location /api/` (FastAPI, no such route): re-check it when you rewrite both raw relays.
- **For S27 and the orchestrator (deploy):** `deploy/knowledge.conf` raises `client_max_body_size`
  5m → 20m and adds the asset relay location; the box needs the nginx reload that a deploy does.
  `pillow` is a new Python dependency (in `uv.lock`).

## (from P30.S5, for S7, S12, S16 and S28) Native ingest as shipped

The spec is `server/native/README.md` → *Ingest (S5)*; the detail is in `slices/P30.S5/result.md`.

- **The publish contract:** `format: "native"`, `markdown` = the body WITHOUT a header. The server
  writes the header (the md fields plus `format: native`, `syntax: 1` and the request's `summary`). The
  422 is one list in S3's shape, with lines in the body as sent (`0` = header or whole document). The
  201 adds `assigned_ids` `[{id, type, line}]`, `warnings` (`ref-unresolved`, `translation-ids`,
  `translation-source-missing`) and `migrated_from`. Body limits: native 512 KB, md 512 KB, html 1 MB.
- **Reads:** `GET /api/documents/{id}` and `by-path` carry `source`, the whole stored file with its
  header. So do `/app/documents/{id}`, the slug read and both version reads, beside `assets`.
  `markdown` is the plain-text search projection. Every list drops `source`. `/raw` stays html-only
  (a native document is a 404 there).
- **Stems (was the S6 item; S6 consumed its binding half):** a NEW document may not take a stem another
  document owns (409, `detail.rel_path` names the owner). `document_versions` rows are keyed by the
  document's CURRENT rel_path, and reindex finds a chain by stem (`documents.parse_archive_rel_path` →
  `ArchivePath(stem, version, ext)`). By-path reads of an old `.html` path resolve through the stem
  alias. By-path DELETE stays exact.
- **For S7 (CLI):** strip the file's own `---` header and send its fields as request fields (title,
  tags, date, `summary`, `lang`, `translated_from`). Send the body as `markdown`. A re-explain reads
  `source` from `GET /api/documents/by-path/{rel}`. MCP `fetch_document` caps at 20,000 characters
  (`MCP_FETCH_MAX_CHARS`), so a long chapter's source is truncated there. A legacy html chapter needs
  no special flag: its first native publish (book fields, `new_version` or `rel_path`) is the
  migration. Surface `warnings` and the 422 list's lines to the author.
- **For S12:** render from `source`, the whole file, which S3's TS port parses as-is. The version
  read's `source` is the archived file. `web/src/lib/knowledge/types.ts` now has
  `format: "md" | "html" | "native"` and `source?: string | null` on `KbDocument` and
  `KbDocumentVersion`. `DocumentView` still sends every non-html document to `<MarkdownBody>` with
  `markdown`, which for native is the projection. S12 replaces that branch.
- **For S16:** `KbDocument` carries `source` now; it still lacks `assets` (S4's note).
- **For S28:** the skill's re-explain fetches the source, keeps its ids, strips the header and
  re-sends the body. A translation must keep the source's quiz item and option ids (422
  `translation-quiz-ids`).
