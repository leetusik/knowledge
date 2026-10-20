# P30.S5 result: native ingest, search, MCP and html → native

## Verdict

- **status:** done
- **tier:** high
- **model:** opus
- **effort:** high
- **summary:** Wired S3's parser into `POST /api/documents` as `format: "native"`. The server writes the header, parses the body, resolves references against the publish's assets and the index, and checks a translation's quiz ids, with every violation (images included) in one 422 list. The stored file keeps its assigned ids, and no retired id is ever minted again. Every format now has a body limit. Search and embeddings read S3's projection, reindex derives `native` from the header, and the `/api`, `/app` and MCP reads carry the native source. html → native is an in-place migration with a stem alias, so no link breaks.
- **files_changed:** `server/native_ingest.py` (new), `server/main.py`, `server/db.py`, `server/documents.py`, `server/documents_api.py`, `server/reindex.py`, `server/gitops.py`, `server/graph_api.py`, `server/native/parse.py`, `server/native/README.md`, `mcp-server/src/knowledge_mcp/server.py`, `mcp-server/CONTRACT.md`, `mcp-server/tests/test_search_tool.py`, `web/src/lib/knowledge/types.ts`, `tests/test_native_ingest.py` (new), `tests/test_assets.py`; notebook: `phase.md`, `topics/notes-server.md`, `topics/decisions-archive.md`, `topics/notes-later.md` (new), `topics/operator-questions-decided.md` (new).
- **validation:**
  - `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55432/kb uv run pytest -q`: PASS, 196 passed (190 before plus 6 new; the Postgres-gated tests ran).
  - `cd mcp-server && uv run pytest -q`: PASS, 13 passed (1 new).
  - `pnpm --dir web typecheck`: PASS.
  - `pnpm --dir web build`: PASS (a web type changed).
  - `python3 scripts/skills_parity.py`: FAIL as known (A3, until S7): "explain skill copy missing: .agents/skills/explain/SKILL.md".
  - `python3 scripts/workflow.py validate`: PASS. It warns about the stale docs and oversized sections it already warned about, nothing new.
- **deviations:**
  - The plan's fallback rule for references was not needed: P29 decides every case (OQ19).
  - Retired ids cover every earlier native version, not only the previous one (P29's "never reused"; OQ17).
  - The translation quiz-id check (P29 *Ids*, handed on by S3's note) was added, though the plan's approach did not list it.
  - Assets are now native-only (OQ14), so S4's publish test moved to a native chapter.
  - The non-server long notes went to a new `topics/notes-later.md`, not `topics/notes-server.md`, so the server-notes file stays about server APIs.
  - Decisions A1–A5 and the A5 signoff detail moved word for word to `topics/decisions-archive.md`, each kept as a summary line, to fit the budget.
- **doc_impact:** six lines appended to `phase.md` → `## Doc impact`: api.md (the publish, read, alias and migration contract), api.md (the MCP contract), data.md (the `source` columns, `'native'`, the re-keyed and stem-keyed chains), backend.md (`native_ingest`, reindex, the migration, the graph alias), frontend.md (the web types), decisions.md (an ADR line).

## What shipped

### Publish (`server/main.py` `create_document`, `server/native_ingest.py`)

- **The request.** `format: Literal["md","html","native"]`, plus a new optional `summary` field: native only, non-empty, written into the header. A native `markdown` is the body **without** a header. `documents.native_file_content` composes the server's header (the md fields plus `format: native`, `syntax: 1` and `summary`) with the body, and returns the line offset of the body.
- **One 422.** Violations are collected into one list in S3's shape:
  - `body-too-large`;
  - `asset-*` from `prepare_assets`;
  - `asset-format` for assets on md or html;
  - the parser's violations;
  - `ref-unknown-asset`, for inline `asset:` images, figure `src` and figure-row images, and also for inline images read before a failed parse (`NativeFormatError.refs`);
  - `translation-quiz-ids`.

  Lines are remapped to the body as sent (`0` = the header or the whole document). md and html still fail before target resolution, exactly as before.
- **Warnings.**
  - `ref-unresolved`: a `chapter:` or `doc:` miss. The publish's own chapter or slug counts as resolved.
  - `translation-ids`: heading or block id drift from the source.
  - `translation-source-missing`.
- **Ids.** `reserved_ids` is the union of the ids of the current row's native source and every archived native version (`native_ingest.retired_ids`, using the new `ParseResult.ids`).
- **Storage.** The file is the parser's `.source`, written verbatim. The DB keeps `source` (the file) and `markdown = search_text(tree)`, which FTS5 and the after-response embed read. Nothing in `search.py` or `embeddings.py` changed.
- **The 201** adds `assigned_ids`, `warnings` and `migrated_from`, on native publishes only.
- **Body limits** (`native_ingest.BODY_LIMITS`): native 512 KB, md 512 KB, html 1 MB, counted in UTF-8 bytes of `markdown`. Largest existing on `origin/main`: html 113,298 B (`glide-ilab/2026-10-10-p9-…html`); md 17,225 B. So every existing document fits.

### Format changes and the html → native migration

- Allowed: the same format; `md → native`, an ordinary next version at the same rel_path; `html → native`, the migration. Everything else is a 422 (native → md was tested by hand: 422).
- The migration is triggered by any re-publish that resolves an html target: book placement, `new_version` by slug, or an explicit `rel_path`, the old `.html` path included. Under the write lock:
  - `_place_variant(replaces=old)` treats the old path's binding as this document's. Without book fields, the manifest binding the old path is re-pointed instead.
  - `db.rekey_document` moves the `documents` row (id kept) and its `document_versions` rows to `<stem>.md`.
  - The html body is archived as `.versions/<stem>/vNNNN.html`, and the native file is written at `<stem>.md`.
  - The `.html` file is unlinked, and `gitops.remove` (`git rm --cached --ignore-unmatch`) stages the deletion.
  - The Recent bullet is re-pointed in place.
  - The manifest and the derived book rows are rewritten.
- A 409 is raised when `<stem>.md` is already taken by another row or a stray file.
- **The stem alias** (`db.get_document_by_path_or_alias`) serves:
  - `GET /api/documents/by-path/{rel}` and its two version reads, which now read the chain by the document's CURRENT rel_path;
  - an explicit `rel_path` on a re-publish;
  - a book binding lookup;
  - graph `related:` edges (`graph_api`).

  By-path DELETE stays exact.
- **One document per stem.** A NEW document whose stem another document owns is a 409, with `rel_path`/`id`/`hint` like the existing 409. No existing test relied on sharing a stem.

### Reindex (`server/reindex.py`)

- `_body_columns` is the single body rule. html gives extracted text plus `raw_html`. A `.md` file whose header says `format: native` gives `stored_projection(file)` plus `source`, falling back to the raw body text if a hand-edited file no longer parses, so the document never drops out of search. Anything else is md.
- `parse_archive_rel_path` now returns `ArchivePath(stem, version, ext)`. `_walk_versions` keys each archive file under the current document that owns its stem, preferring the archive's own extension when two documents share a stem (legacy). With no current document, it falls back to the archive's own extension, as before.
- The vanished-version cleanup now compares `(rel_path, archive_path)` pairs, so a row left keyed under a pre-migration path is dropped.

### Reads

- `/api` `_public_doc`/`_public_version` and `/app` `_app_doc`/`_app_version`: `source` is on the detail and single-version reads and dropped from every list. `/raw` stays html-only, so a native document is a 404 there.
- MCP `fetch_document` returns `source` in `markdown` when `format == "native"` (`_body_of`). The key set is unchanged. `CONTRACT.md` records the `"native"` value as additive v1 and the old `.html` path alias.
- Web: `format: "md" | "html" | "native"` and `source?: string | null` on `KbDocument`/`KbDocumentVersion`, types only. `DocumentView` still sends every non-html document to `<MarkdownBody>`, which for native shows the projection; S12 replaces that branch.

## Tests (very core, `tests/test_native_ingest.py`)

1. `test_native_violations_are_one_422_list`: an h1, raw HTML, a `#id` miss, an unknown `asset:` image and a bad asset come back as one 422, at the body lines sent.
2. `test_native_round_trip_keeps_ids_and_never_reuses_a_retired_one`:
   - the assigned ids and their lines; the stored file carries them, plus `format/syntax/summary`;
   - the `ref-unresolved` warning;
   - `source` on the read;
   - search finds the quiz prompt but never its answer key;
   - a re-publish of the fetched body keeps every id, and a new non-ASCII heading gets `s-2`, never the retired `s-1`;
   - reindex re-derives `native`, `source` and the projection from the header, and v1's archived source.
3. `test_translation_keeps_quiz_ids`: a changed option id is a 422 `translation-quiz-ids`; identical ids give a 201 with no warnings.
4. `test_html_to_native_migration_breaks_no_link`:
   - a migration through `rel_path=<old .html>` with no book fields keeps the same id, moves to `.md` at v2, removes the html, and archives `v0001.html`;
   - the old path resolves to the native document;
   - v1 (html, `raw_html` intact) reads by either path;
   - the book variant is re-pointed with the same doc id;
   - all of it again after deleting the SQLite file and reindexing;
   - the commit shows `D` html, `A` md and the manifest;
   - a later chapter publish is an ordinary v3 at `.md`;
   - a new html document at the same stem is a 409.
5. `test_body_limit_per_format`: md, native and html over their limits each give exactly `body-too-large`; 600 KB of html is a 201.
6. `test_private_native_read_is_404` (Postgres-gated): the member's detail carries `source` and `assets`, the list has no `source`, and anonymous access is the same 404 as a missing id.

MCP: `test_fetch_returns_native_source_in_the_same_shape`.

## Probes (thrown away, in the scratchpad, not committed)

- A figure plus figure-row publish: an unknown figure-row image is a 422 at the fence line with `block: row`; with every asset sent, a 201 with assigned figure ids and a `doc:` warning.
- An empty `summary` is a 422, and `summary` on an md document is a 422.
- A migration through book fields only (`_place_variant(replaces=…)`): the variant is re-pointed and the Recent bullet re-linked in place, with no duplicate. A graph `related:` edge to the old `.html` resolves to the `.md` node, not a broken edge.
- md → native at the same rel_path, with `migrated_from: null`; native → md is a 422.

## Notebook

- Compressed first, never dropping a decision or a question:
  - OQ1–OQ13 collapsed with `--resolve`, their full text moved word for word to `topics/operator-questions-decided.md`;
  - the S27, S28 and REVIEW long notes moved to `topics/notes-later.md`;
  - A1–A5 and the A5 signoff detail moved to `topics/decisions-archive.md` → *Moved by P30.S5*;
  - the S2, S3 and S4 "For S5" items consumed in `topics/notes-server.md`.
- Added:
  - the `## Decisions` S5 line;
  - OQ14–OQ19, decided;
  - six Doc impact lines;
  - the S5 note pointer, with detail in `topics/notes-server.md` → *S5*;
  - `## Now`.
- `phase.md` is now 39.1 KB of 40.96 KB. The next slice should compress before adding.

## Dead ends

- `git show --name-status` reported the migration as a rename (`R094 …html → .versions/…/v0001.html`), so the test uses `--no-renames`.
- A choice quiz item needs `explain` (S3's schema), so the first test draft failed with `field-missing`.
