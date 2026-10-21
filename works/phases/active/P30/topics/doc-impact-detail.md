# P30 Doc impact detail (linked from `phase.md` → `## Doc impact`)

Each `## Doc impact` line there is one short line; its full text is here, under the slice that wrote it.

## P30.S6

- **operations.md:** a new runbook entry, "Binding the library into books": `scripts/migrate_books.py`
  (dry run by default, `--apply`, `--report`), credentials from `KB_API_BASE_URL`, `KB_API_TOKEN` and
  `KB_SESSION_TOKEN` or `KB_LOGIN_EMAIL`/`KB_LOGIN_PASSWORD`, exit codes 0/1/2, the map at
  `scripts/migrations/p30_books.json`, and the undo (revert the `docs(<project>): update book …`
  commits, reindex). The steps are `topics/migration-runbook.md`.
- **decisions.md:** ADR: the library is bound into books by `PUT /api/books` only, never by re-publishing,
  so no document file or URL changes. A book that already exists is merged, never replaced (server
  fields, chapters and order win, and a disagreement refuses the run). Every `/documents/{id}`,
  `/@{org}/{project}/{slug}` and html raw read is hashed before and after, and the run is idempotent
  (an unchanged book gets no `PUT`).

## P30.S8

- **api.md:** the user-scoped `/app/reader/…` surface (session-only; anonymous = 401; unmetered). Reads:
  `GET continue?limit=` (1–50, default 10), `GET library`, `GET books/{org}/{project}/{book}`,
  `GET chapters/{org}/{project}/{book}/{key}?lang=&v=`, `GET docs/{org}/{project}/{doc}?v=`,
  `GET annotations?org=&project=&book=|doc=` (annotations and bookmarks), `GET profile`. Writes:
  `PUT positions` (`{org, project, doc, version?, anchor_id?, fraction, max_fraction?, finished?,
  unread?}`), `POST/PATCH/DELETE bookmarks[/{id}]`, `POST/PATCH/DELETE annotations[/{id}]`,
  `POST quiz-attempts` → `{attempt, card: null, result}`, `DELETE state?scope=book|all`, `PATCH profile`.
  `org` is the org slug or the tenant id. Every miss (another user's row, a private or deleted document,
  an unknown org or book) is the one 404 `not found`; a create retried with an owned id is a 200 with the
  stored row. The `/api` and `/app` document deletes purge reader state first and answer 503 (nothing
  deleted) if they cannot; the `/api` delete's body adds `reader_state_purged`.
- **data.md:** Postgres revision `0006_reader_state`: `reader_positions` (PK `(user_id, tenant_id,
  project, doc)`), `reader_bookmarks`, `reader_annotations` (CHECK quote or note), `quiz_attempts` (unique
  `(user_id, tenant_id, project, unit, item_id, attempt)`), `review_cards` (partial unique quiz item,
  unique `annotation_id`), `review_logs`, `reader_profiles`. All cascade from `users`, the content-keyed
  ones from `tenants`; `(tenant_id, project, doc)` indexes back the purge. `doc` is `<date>-<slug>`;
  `unit` is `c:<book>/<key>` or `d:<doc>`.
- **backend.md:** new modules `server/reader_state.py` (the `Gate` readability re-check, the store, the
  purge, the unit re-write, `run_from_worker` for the sync write paths) and `server/reader_api.py` (the
  routes). `server/main.py`: `_delete_document` purges first (fail closed); `put_book` and
  `create_document`'s placement / html → native re-point call `reader_state.sync_units_after_manifest`
  (best-effort). Reindex-driven manifest changes do not re-write units; reads derive `unit` afresh.
- **security.md:** reader-state privacy: state is the reader's alone (no owner, org, aggregate, search,
  MCP, graph or metering access); every query is `user_id`-scoped; every read and write re-checks
  readability (member, or a public project, and the document exists); losing access hides rows, a
  document delete purges every reader's rows before the content goes (fail closed), an account or org
  delete cascades; `DELETE state?scope=all` is the only route that reaches hidden rows.
- **frontend.md:** `POST /api/reader/position`, the beacon relay: same-origin (403), `text/plain` or
  JSON (415), 4 KB cap (413), session required (401), relays to `PUT /app/reader/positions`; `unread`
  is not accepted there (Mark as unread is an explicit write). `web/src/lib/knowledge/reader.ts`
  (`putReaderPosition`, `KbPosition`).
- **decisions.md:** ADR for P29.S3's state contract as shipped: Postgres per `user_id`; stem + unit keys;
  P29's conflict rules in one atomic upsert; client-id idempotent creates; purge before the content
  delete, failing closed; no tombstones; the OQ26–OQ30 choices.

## P30.S9

- **api.md:** the `/app/reader/docs/…` and `/chapters/…` reads now return annotations resolved for the
  version on screen: each carries `anchor: {status, method, block_id, start, end, section_index}`
  (`method` exact | fuzzy | moved | section | block | orphan | stored) and `anchor_status` for that
  version; `annotations` holds anchored and `block` ones in reading order, `unanchored` the orphans;
  `other_languages: {annotations, bookmarks}` holds the chapter's other variants' marks with
  `section: {block_id, exact, section_index}` mapped by id (nearest preceding id as the fallback);
  bookmarks carry `place: {block_id, exact, fraction, section_index}`; `resume` is the unit's latest
  position mapped onto the variant. `GET annotations?…` returns `annotations`, `unanchored` and
  `bookmarks`, resolved against each chapter's current version.
- **backend.md:** new pure module `server/anchors.py` (the ladder `resolve`, `map_id`, bit-parallel
  Levenshtein `similarity`, `THRESHOLD` 0.8); `server/reader_state.py` gains `SectionCache` (each
  version's section projection parsed once per request; `None` = do not resolve) and
  `write_back_anchors`; `server/reader_api.py` gains `_Anchoring` (resolve, queue, flush once per read).
- **data.md:** `reader_annotations.anchor_status` (anchored | block | orphan) and `anchored_version` (the
  newest version the text was found on) are a cache written back by reads of a document's current
  version; the captured `block_id`/`quote` and `updated_at` are never rewritten by re-anchoring. No
  schema change.
- **decisions.md:** ADR: server-side re-anchoring from the immutable captured anchor, status-only
  write-back, the fuzzy method with both 0.8 bars, and the OQ31–OQ34 edge cases.

## P30.S10

- **api.md:** `GET /app/reader/review/queue?limit=` (1–100, default 20) → `{now, day, profile, counts:
  {due, new_highlights, done_today, by_book}, limit_reached, next_due_at, cards}`; `POST
  /app/reader/review/cards/{id}/review` `{rating: again|good, review_id, response?, duration_ms?}` →
  `{card, counts, limit_reached, next_due_at, day, next}` (repeat = no-op; 409 suspended or an id used
  for another card); `PATCH /app/reader/review/cards/{id}` `{status: active|suspended}`; `PATCH
  annotations/{id}` gains `review: bool` ("Review this"); `POST quiz-attempts` returns `card`; every
  annotation carries `review`. Intervals are whole minutes. The card shape: `server/reader_api.py`'s
  docstring and OQ41.
- **backend.md:** new module `server/review.py` (the only importer of `fsrs`: `_Scheduler` with the
  seeded fuzz, `review_day`, `Resolver` (gate, drift, rendering), `build_queue`, `seed_quiz_card`,
  `set_highlight_review`, `set_status`, `review`); the review routes and `_mark_review` in
  `server/reader_api.py`; dependency `fsrs==6.3.2` (pyproject, uv.lock, mirrored in the template).
- **data.md:** S10 writes `review_cards` and `review_logs` as 0006 made them: a log's id is the client's
  `review_id`; `response` = `{answer, due, state[, seeded_by]}`; `state_before` 0 = never reviewed,
  else the FSRS state (1 learning, 2 review, 3 relearning); `status` active | suspended | retired;
  drift writes (reset, retire) happen on reads. No schema change.
- **decisions.md:** ADR: review on FSRS as shipped: py-fsrs pinned, defaults plus one 10-minute step,
  no optimiser, seeded fuzz so previews are exact, first-attempt seeding, lazy drift and readability
  through the gate, limits per OQ36 (OQ35–OQ41).


## Full Doc impact lines, folded by the orchestrator (word for word)

### P30.S2, folded

- api.md: `POST /api/documents` gains the optional `book`, `chapter`, `lang`, `translated_from` and `subject` fields (chapter placement; the 201 gains `book`, `chapter_key`, `lang`, `translated_from`, `subject`, `book_created`, `chapter_created` and `manifest_path` only when one of them is sent). New routes: `GET /api/books?project=`, `GET`/`PUT /api/books/{project}/{book}`, `GET /app/books?project=<uuid>`, `GET /app/books/{project}/{book}` and the project-gated `GET /app/orgs/{org}/{project}/books/{book}` (one constant 404). Search hits gain `book`, `chapter_key` and `lang`. Document reads gain `lang`, `subject` and `translated_from` (P30.S2)
- data.md: book manifests at `<root>/.books/<project>/<book>.json` (canonical; tenant #1's are committed with their chapter). Derived SQLite tables `books`, `chapters` and `chapter_variants` have composite keys and no surrogate ids, plus a unique `(tenant_id, rel_path)` (one chapter per document). `documents` gains `lang`, `subject` and `translated_from`. The header gains the optional `lang:`, `translated_from: {lang, version}` and `subject:` (P30.S2)
- backend.md: the new modules `server/books.py` (manifest validators and atomic IO) and `server/books_api.py` (/app book routes). `reindex.py`'s third walk, `_rebuild_books`, runs as one transaction and reports `books_indexed`/`books_removed`; `.books` is a reserved dir. `create_document` settles the manifest under `WRITE_LOCK` before any file write (P30.S2)
- decisions.md: ADR: books and chapters as on-disk manifests with a derived SQLite index (P29.S1's model, shipped). Membership never rewrites a document. POST seeds only a new book or chapter, and PUT edits. A deleted document's binding is omitted on read, not unbound on delete (P30.S2)

### P30.S3, folded

- data.md: the native chapter format as shipped. That covers the header (`format: native`, `syntax: 1`, `summary`); the grammar (CommonMark + GFM tables, strikethrough and autolinks, GFM-alert callouts of six types, typed fenced YAML 1.2 core blocks, and trailing `{#id}` heading ids, h2–h4 only); every typed-block schema and limit; the id namespace and assignment rules; the reference schemes; the normalized block tree; and the section projection (passage containers joined by "\n", with offsets in code points) that annotation offsets are measured against. The spec is `server/native/README.md` (P30.S3)
- backend.md: the new package `server/native/` (`parse.py` `parse_chapter`, `schema.py`, `svg.py`, `ids.py`, `refs.py`, `project.py`, `yamlcore.py`, `errors.py`, `fixtures_util.py`) is pure and not yet wired. It adds the dependencies `markdown-it-py==4.2.0` and `mdit-py-plugins==0.6.1`, and the shared conformance fixtures in `tests/fixtures/native/` (core test 4, the Python half) (P30.S3)
- decisions.md: ADR: native ingest rejects and never strips. One violation list feeds one 422, and the SVG allowlist reports the block, element and attribute. ADR: markdown-it-py for the Python parser, held to the TS parser by language-neutral fixtures. ADR: the per-section passage-container projection (the signed `05-annotations` rule) is the basis for annotation offsets, and the search text is a separate, wider projection. ADR: unknown tones, shapes, kinds and callout types are rejected at ingest, and the renderer's fallbacks are defence in depth (P30.S3)

### P30.S4, folded

- api.md: `POST /api/documents` gains the optional `assets: [{name, media_type, content_base64}]` (png, jpeg, webp, gif; 2 MB each, 20, 12 MB in total; not on an html document). Violations come back as ONE 422 list (`asset-*` codes, S3's shape), and the 201 carries `assets` (the stored map) when some were sent. Document and version detail reads (`/api` and `/app`, not the `/app` list) gain `assets`. The delete response gains `assets_removed`. New optional-identity routes: `GET /app/documents/{id}/assets/{sha256}.{ext}` and `GET /app/orgs/{org}/{project}/{slug}/assets/{file}`, with one constant 404, `nosniff`, `Content-Security-Policy: default-src 'none'; sandbox` and `Cache-Control: private|public, max-age=300` (P30.S4)
- data.md: chapter images at `<root>/.assets/<project>/<date>-<slug>/<sha256>.<ext>` (content-addressed, per document, never committed, removed with the document). The header gains `assets:` (one JSON-flow line per name: `{file, media_type, width, height, animated, still?}`, the displayed size), and `documents` and `document_versions` gain an `assets` JSON column re-derived by reindex. `.assets` is a reserved dir (P30.S4)
- backend.md: the new module `server/assets.py` (validation, container-level metadata stripping with a pixel check, the GIF still, content-addressed storage). The new dependency is `pillow` 13. `gitops.add` drops any `.assets/` path; `create_document` stores images under `WRITE_LOCK` before the body, and `_delete_document` removes the directory (P30.S4)
- security.md: image visibility: an asset is readable exactly when its document is (`_resolve_readable_doc` / the slug resolver's gate), only when some version of that document names it, and every miss is one constant 404. EXIF/GPS is stripped losslessly with an orientation-only block kept, and a 40 MP decode cap guards against decompression bombs. Raster only (no SVG upload), served `nosniff` under `default-src 'none'; sandbox` (P30.S4)
- frontend.md: the BFF image relay `GET /api/documents/[id]/assets/[file]` (optional identity; it re-asserts the content type from the extension, `nosniff`, the sandbox CSP and the cache scope) and `getDocumentAsset` in `lib/knowledge/app.ts` (P30.S4)
- operations.md: `deploy/knowledge.conf` raises `client_max_body_size` to 20m and adds the regex location `^/api/documents/<id>/assets/<sha256>.<ext>$` → knowledge-web. Tenant #1's images live only on the box disk under `docs/.assets/`, with no off-box backup (A2) (P30.S4)
- decisions.md: ADR: chapter images are stripped at the container level, never re-encoded, so the pixels are the uploaded ones (pixel-verified), and the orientation tag survives. ADR: the asset map is per version, with no inheritance, and P29's per-document directory is the dedupe unit (P30.S4)

### P30.S5, folded

- **api.md (P30.S5):** `POST /api/documents` gains `format: "native"` and a `summary` field. A native body is sent without a header and fails with one 422 list (codes in `server/native/README.md` → *Ingest (S5)*, lines in the body as sent). The 201 adds `assigned_ids`, `warnings` and `migrated_from`. Body limits apply to every format (native 512 KB, md 512 KB, html 1 MB). Only native chapters may carry `assets`. The `/api` and `/app` detail and version reads add `source`. By-path reads resolve an old `.html` path through the stem alias. html → native is the one format migration, and a new document taking another's stem is a 409.
- **api.md, the MCP contract (P30.S5):** `fetch_document`'s `format` gains `"native"`, and `markdown` then carries the native source. This is additive and stays contract v1; `mcp-server/CONTRACT.md` is updated, so the `api.md` summary of it needs the same line.
- **data.md (P30.S5):** `documents.source` and `document_versions.source` hold the stored native file. `format` gains `'native'`, a `.md` file whose header says `format: native` (plus `syntax: 1`, `summary`). For native rows, `markdown` is the plain-text search projection. `document_versions.rel_path` is the document's CURRENT rel_path and is re-keyed on html → native. Archive chains are stem-keyed (`v0001.html` … `v000N.md` in one directory). One document owns each stem.
- **backend.md (P30.S5):** new module `server/native_ingest.py` (body limits, reference and translation checks, retired ids, the stored projection). `create_document` composes, parses and validates native chapters and runs the html → native migration (`db.rekey_document`, `gitops.remove`, the manifest re-point, `documents.replace_recent_link`). Reindex derives `format` from the header and finds archive chains by stem (`parse_archive_rel_path` → `ArchivePath`). The graph resolves `related:` edges through the stem alias. `ParseResult.ids` and `NativeFormatError.refs` are added.
- **frontend.md (P30.S5):** the web `KbDocument`/`KbDocumentVersion` types gain `format: "native"` and `source?` (types only; S12 renders).
- **decisions.md (P30.S5):** ADR line for P29.S2's ingest contract as shipped: one 422; references (`asset:`/`#id` fail, `chapter:`/`doc:` warn); the per-format body limits; native-only images; html → native as an in-place re-key with a stem alias and one document per stem (OQ14–OQ19).

### P30.S6, folded

- operations.md: the library-to-books migration runbook (`scripts/migrate_books.py`); detail `topics/doc-impact-detail.md` (P30.S6)
- decisions.md: ADR: library bound by `PUT /api/books` only, merged never replaced, links hashed (P30.S6)

### P30.S7, folded

- experience.md: the `/explain` native flow, phase/slice → chapter placement, general mode, `--asset` images (P30.S7)
- api.md: `knowledge save` flags `--format`, `--book`, `--chapter`, `--position`, `--lang`, `--translated-from`, `--asset`, `--new-version`; `read --source` (P30.S7)
- operations.md: `scripts/publish_fixture_book.py` loads the dev fixture book into a LOCAL API (P30.S7)

### P30.F1, folded

- operations.md: plugin template parity restored with the P30 server (`plugin/templates/kb/` mirrors S2-S7; the manifest gains a `root_only` list that `scripts/plugin_parity.py` honors for the migration tool's test and the book fixtures) (P30.F1)

### P30.S8, folded

- api.md: the `/app/reader/…` reads and writes, the 404 rule, the purge's 503; detail `topics/doc-impact-detail.md` (P30.S8)
- data.md: revision `0006_reader_state`, seven reader tables, keys `doc`/`unit` (P30.S8)
- backend.md: `server/reader_state.py`, `server/reader_api.py`, the delete purge and unit re-write hooks in `main.py` (P30.S8)
- security.md: reader-state privacy: user-scoped, readability re-checked, hidden on lost access, purged on delete (fail closed) (P30.S8)
- frontend.md: `POST /api/reader/position`, the beacon relay, and `lib/knowledge/reader.ts` (P30.S8)
- decisions.md: ADR: P29.S3's reader-state contract as shipped (OQ26–OQ30) (P30.S8)

### P30.S9, folded

- api.md: reader reads return resolved annotations (`anchor`, `unanchored`, `other_languages`, bookmark `place`, `resume`); detail `topics/doc-impact-detail.md` (P30.S9)
- backend.md: `server/anchors.py` (the ladder, `map_id`), `SectionCache` and `write_back_anchors` in `reader_state.py`, `_Anchoring` in `reader_api.py` (P30.S9)
- data.md: `anchor_status`/`anchored_version` are a read-written cache; the captured anchor is never rewritten; no schema change (P30.S9)
- decisions.md: ADR: re-anchoring from the immutable captured anchor, status-only write-back, fuzzy at 0.8 on quote and context (OQ31–OQ34) (P30.S9)

### P30.S10, folded

- api.md: the review routes, "Review this", the quiz-attempt `card`, annotations' `review`; detail `topics/doc-impact-detail.md` (P30.S10)
- backend.md: `server/review.py` (the only `fsrs` importer), the review routes in `reader_api.py`, dependency `fsrs==6.3.2` (P30.S10)
- data.md: how S10 writes `review_cards`/`review_logs` (log id = `review_id`, `response` keeps the outcome); no schema change (P30.S10)
- decisions.md: ADR: review on FSRS as shipped (OQ35–OQ41) (P30.S10)

### P30.S11

- frontend.md: the sign-in return address: `src/proxy.ts` stamps `x-kb-request-path`; `requireSession`/`requireIdentity` redirect to `/login?next=`; `safeNextPath` hardened (length cap, decoded `//` `\` control chars); `loginHref`; signup honours `next` and the auth cross-link carries it; `/documents/{id}` anonymous misses carry `next` (D18, D32) (P30.S11)
- frontend.md: `web/src/lib/reader-href.ts` — `orgSegment`, `bookHref`, `readerHref`, `signInToSaveHref`, the one builder for reader, book and "Sign in to save" URLs (P30.S11)
- security.md: the open-redirect rule for `next=` as shipped (same-origin path only, fail closed, laundered at the gate, in `loginHref` and in the form; the proxy header is overwritten and laundered) (P30.S11)
- api.md: `GET /app/orgs/{org}/{project}/books/{book}` accepts the tenant id as `org` (UUID first); both book reads' `canonical_path` falls back to the tenant id instead of `null` (OQ42) (P30.S11)
- decisions.md: ADR: a slug-less tenant's reader URLs are built on the tenant id (OQ26, OQ42) (P30.S11)

### P30.S12

- frontend.md: the native/md render pipeline `web/src/lib/native/` (parse → validate → render; remark + the GFM table/strikethrough/autolink-literal extensions, NOT remark-gfm; `yaml`; saxes for svg; Shiki JS engine) — server-only, no raw HTML, `<NativeChapter source format assetUrl resolveRef>`; `/documents/{id}` and its versions render native through it; md stays on `<MarkdownBody>` until S13 (P30.S12)
- frontend.md: the render hooks S13+ style (`kb-ch`, `kb-ch-h`, `kb-ch-callout[data-kind]`, `kb-ch-code`/`kb-tok-*`, `kb-ch-figure`, `kb-ch-figures`, `kb-ch-diagram[data-kind]`, `kb-ch-svg`, `kb-ch-quiz`, `kb-ch-sources`, `kb-ch-table`, `kb-link-missing`, `kb-ch-unshowable`) and the code-token classes (`kb-tok-<token>` from Shiki's CSS-variables theme, no inline colour) (P30.S12)
- security.md: the app CSP as shipped — every response: `object-src 'none'; base-uri 'none'; frame-src 'self'; frame-ancestors 'none'; img-src 'self' data:` (next.config); the reader routes (`/documents/…`, `/@…`) add `script-src 'self' 'nonce-…' 'strict-dynamic'` per request from `src/proxy.ts` (`'unsafe-eval'` in dev only); `style-src` open; the two raw relays keep their `sandbox` policy (OQ51) (P30.S12)
- security.md: render-side defence in depth: re-validation refuses a block (placeholder) or the whole chapter, never shows source; svg rebuilt through the allowlist a second time with block-scoped ids; a missing link carries no href/title/target; native images are same-origin asset-relay URLs only (P30.S12)
- decisions.md: ADR: the TS port mirrors the Python parser's tree exactly, quirks included (the chart `type` clobber, OQ46; trailing-tab and callout-indent whitespace; trailing-newline ids), held by core test 4 (`web/tests/native-conformance.test.ts`) (P30.S12)
- decisions.md: ADR: chapter:/doc: links stay missing until the reader can resolve them for the reader (OQ50); md images same-origin only (OQ52) (P30.S12)

### P30.F2

- backend.md: the native tree's chart diagram carries its kind (`bar|line|interval`) under its own `chart` key; the block keeps `type: "diagram"` (top-level and inside a figures row); `native/project.py` now searches a top-level chart's labels (it was skipped under `type: "bar"`). A stored chapter is re-parsed from `source`, so its tree changes shape on its next parse; a search row stored before this keeps the old text until re-ingest or reindex (P30.F2)
- backend.md: a choice-quiz `answer` entry that is not a string is one `quiz-answer` violation (422 with its line), never a `TypeError`/500; every id, slug, key, asset-name, file-name and `chapter:`/`doc:` validator in `server/` (`native/ids`, `native/refs`, `assets`, `books`, `documents`, `documents_api`, `reader_api`) matches with `re.fullmatch`, so a trailing newline (a YAML block-scalar `id: |`) is refused with the normal `id-malformed` (P30.F2)
- decisions.md: the README tree contract changed: chart `chart:"bar"|"line"|"interval"` replaces the clobbered `type`; supersedes the S12 ADR line "quirks included (the chart `type` clobber, OQ46; trailing-newline ids)": those two quirks are gone, the other whitespace quirks stay held by core test 4 (P30.F2)


## P30.S13

- frontend.md: the reader shell (`web/src/components/reader/`, `web/src/lib/reader/`, `web/src/app/reader.css`, `reader-fonts.css`) is built from the signed `01-reader` rounds `02-revise` and `03-chapter-bar-and-border` (the surface's design record; round 03 supersedes the chapter bar, the control edge `--rd-control-edge`, the compact chrome and the two-slot language switch). Route `/@{org}/{project}/books/{book}/{chapter}` (`?lang=`, `?v=`, `@{slug}` and `@{tenant-id}`) plus native and `md` loose documents on `/documents/{id}` and `/@{org}/{project}/{slug}` render in the reader; html chapters redirect to the legacy frame; `loading.tsx`, `not-found.tsx` and `error.tsx` are §16's three states. Reader chrome uses viewport media queries (a `container-type` ancestor contains fixed descendants); the chrome rules run as accumulated same-direction scroll runs.
- frontend.md: the `kb_reader` cookie (`web/src/lib/reader-cookie.ts`; `size 1-5`, `theme system|light|dark|sepia`, `libraryGroup` carried through) is device-only, written by the Display sheet and read by the server for the first paint; a tampered field parses to its default. Self-hosted Literata and Noto Serif KR as unicode-range woff2 subsets (`web/public/fonts/reader/`, ~6.8 MB, `reader-fonts.css`, imported only by the reader frame).
- security.md: in dev the reader routes' CSP `script-src` is `'self' 'nonce-…' 'unsafe-eval'` (no `'strict-dynamic'`) because Next 16 dev leaves its chunk tags un-nonced; production keeps `'strict-dynamic'` (verified: every script nonced). A missing, private or unreadable chapter is the same constant not-found view.
- decisions.md: S13's OQ55–OQ62 (decided in `topics/operator-questions-decided.md` → *P30.S13*).

## P30.S14

- frontend.md: the chapter opening (`ChapterHead`: book line, title with U+2060 after each hyphen between letters, lede, version line, the two notices, the generated contents) and the prose kit (headings, paragraphs, lists, quotes, links with " · new tab", callouts with the type-word head and Show/Hide, code with the title bar and 2ch hanging indent, ASCII drawings, the diagram slot's figure, tables with `scope=col`) are built from the signed `01-reader` rounds `02-revise` and `03-chapter-bar-and-border` (the surface's design record; round 03 changes controls only). The look is in `web/src/app/reader.css`, on S12's `kb-ch-*` hooks and the canvas's `rd-head*`, `rd-toc*` and `rd-notice*`.
- frontend.md: wide or scrolling blocks are client islands (`TableBox`, `ArtBox`) that measure whether they scroll and show a 2rem fade only on a side where more remains; the window is the only scroller. Each Hangul run in text whose language is not Korean is wrapped in `<span lang="ko">` at render time (`web/src/lib/reader/hangul.tsx`: the chapter body, the opening, the contents, the Contents sheet and the chapter bar's neighbour titles).
- frontend.md: the reader's view model gains `summary`, `date`, `project` and `staleSource` (the "Older translation" notice); an `md` document opens with the signed opening and its own leading H1 is dropped when it is the title.
- decisions.md: S14's OQ63-OQ68 (decided in `topics/operator-questions-decided.md` → *P30.S14*).

## P30.S15

- frontend.md: progress and moving are built from the signed `01-reader` rounds 02 and 03 (the design record for this surface): the resume pill (§4), the chapter end with Mark as finished / Mark as unread (§10), the chapter list at the end and in Contents (§11), the Version history sheet (§14, §15), the language switch's mapped landing and the "Progress, section and finished" and "Opening and moving" behaviour. The code is `web/src/components/reader/` (`use-reading.ts` the reader's memory, `chapter-end.tsx`, `version-list.tsx`, `reader-progress.tsx`, the pill in `reader-frame.tsx`) and the pure rules in `web/src/lib/reader/position.ts` (cadence, end-of-chapter, hold, `max_fraction`, write gate; tested in `web/tests/reader-position.test.ts`).
- frontend.md: a reader page's `<title>` is the chapter's or document's title (`generateMetadata`, with the load shared with the page by React `cache`: `loadChapterReaderOnce`, `getDocumentOnce`, `resolveDocumentOnce`); the reader frame is keyed by document and version, so the unread hold, the pill and the position state end with the view.
- security.md: the reader's writes go through the server action `saveReaderPosition` (`web/src/lib/reader/actions.ts`: session unsealed from the httpOnly cookie, a strict body schema, no write for the signed-out) and, on `pagehide`, the existing same-origin beacon route; Mark as unread is a server action only (the route's schema has no `unread`).
- decisions.md: S15's OQ69-OQ77 (decided in `topics/operator-questions-decided.md` → *P30.S15*).

## P30.S16

- frontend.md: figures and sources are built from the signed `02-figures` round 01 (the design record for this surface) with the `03-diagrams` tones: the image box (reserved from the asset map's size, loading sheen, edge, plate, missing, animated still under reduced motion), the figure (`column` and a measured `wide` scroll box), the plain image (`img-<name>`, a paragraph split around it), the figure row (CSS-only container queries) and the row card in every tone, the `svg` block (`--fg-vbw`, `--fg-minw`, the tone classes), the sources list and the citation with its way back. The code is `web/src/lib/native/render.tsx` (markup), `cites.ts` (the citation plan), `links.ts` (`resolveAsset`, `documentAssets`), `web/src/components/reader/figure-parts.tsx` (the client parts: image box state, scroll figure) and the last block of `web/src/app/reader.css` (the tones, `fg-*`).
- frontend.md: the tone palette is reader-scoped CSS: `--dg-<tone>`, `-ink`, `-tint` per theme (+ print), `--fg-plate`, `--fg-edge`; `.fg-tone-<tone>` for cards and `kb-fill-/kb-stroke-<tone>` for svg.
- decisions.md: S16's OQ78-OQ82 (decided in `topics/operator-questions-decided.md` → *P30.S16*).

## P30.S17

- **frontend.md:** the `03-diagrams` round 01 (`jobs/03-diagrams/rounds/01-diagrams`) is the design record of the `diagram` block's frame and its flow and state drawings. The block is drawn on the server: `web/src/lib/native/diagram-layout.ts` (the canvas's `dggraph.js` ported: grid placement, node sizing, shapes, gaps, orthogonal edge routes, ports and tracks, labels on one ground, groups as lanes and layers, self-loops, a growing-gap loop), `diagram-text.ts` (wrapping and measuring), `diagram-metrics.ts` (GENERATED advance widths, `web/scripts/gen-diagram-metrics.py`), `diagram-draw.tsx` (React SVG, the text alternative) and the client frame `components/reader/diagram-figure.tsx` (measured overflow, fades, hint). Only flow and state are drawn; S18 draws the other kinds.
- **security.md:** the drawn SVG is built from React elements; every author string is a `<text>` child (escaped), no `innerHTML`; the only `style` attributes are the numbers `--dg-vbw` and `--dg-floor`.

## P30.S18

- **frontend.md:** the `03-diagrams` round 01 is also the design record of the sequence, stack, timeline and chart kinds. Sequence is `web/src/lib/native/diagram-sequence.ts` (the canvas's `layoutSequence` ported) drawn by the same `Drawing` as flow and state. Stack, timeline and chart are HTML in `em`: `diagram-rows.ts` (the numbers: stack layers, timeline rows, the chart's y range, ticks, bars, lines, intervals, rule and end-label nudging, the data table) and `diagram-kinds.tsx` (the elements and the text alternatives), inside the same `DiagramFigure`. `reader.css` carries the row kinds' CSS (the last block); every position is a numeric `--dg-*` variable. S12's text bodies are gone.
- **security.md:** the only `style` attributes remain numbers set as `--dg-*` custom properties (the render test allows a minus sign); author strings are React text children.

## P30.S19

- **frontend.md:** the `04-quiz` round 01 is the design record of the quiz block. The chapter's one client island (`components/reader/quiz.tsx`) grades on the client (`lib/reader/quiz.ts`: choice sets, cloze match after NFC, trim and case-fold, recall self-grade), saves every graded attempt through the server action `saveQuizAttempt` (the server numbers it; the first seeds the review card) and shows the latest saved answer on return with its provenance, or fresh with a drift note (`lib/reader/quiz-saved.ts`). The option border is the reader's 3:1 control edge.
- **api.md:** `GET /app/reader/chapters/…` and `/docs/…` `quiz` (the latest attempt per item) is now read by the web; the BFF write is `POST /app/reader/quiz-attempts` through a server action.

## P30.S20

- **frontend.md:** the `05-annotations` rounds 01 (`jobs/05-annotations/rounds/01-annotations`) and 02 (`02-keyboard-and-back-link`, §1 keyboard reach, which wins where it differs) are the design record of highlights and notes in the reader: the paint (`<mark>` wrapping after hydration, `lib/reader/paint.ts`), the selection bar, the popover, the undo line and the note editor (`components/reader/annotations.tsx`, the `AnnotationLayer` mounted by `ReaderArticle`), the strings in `READER.notes`, and the CSS (the "P30.S20" block of `reader.css`). The renderer stamps every passage container with `data-tx`/`data-sec`/`data-base` (and `data-an-skip`/`data-an-len` on text that is not the author's), and `lib/reader/anchor.ts` captures a selection as the server's section projection (code points, containers joined by "\n"), proven equal to Python's in `web/tests/reader-anchor.test.ts`. Writes are server actions (`saveAnnotation`, `editAnnotation`, `removeAnnotation`); a delete is sent after its 10 s undo line; a 401 holds the writes across the sign-in.
- **api.md:** the web now reads `annotations`/`unanchored` from the chapter and doc reads (with `v=` for an older version on screen) and writes `POST/PATCH/DELETE /app/reader/annotations[/{id}]` through server actions.

## P30.S21

- frontend.md: `05-annotations` rounds 01 and 02 (§2 back link) are the design record of bookmarks (section and position), the place bar, the margin and rows, the "Bookmarked" tag, the Notes view of the Contents sheet with its Unanchored and other-language groups, a row in a list, and the per-book list at `/@{org}/{project}/notes/{book}` with its back link (`?from=book` or `?ch=&lang=&v=&at=`); the layer's DOM hosts and `?note=` landing.
- api.md: annotation reads (chapter, document, per-book, POST/PATCH) carry `card` ("active" | "suspended" | "") for the caller; `review` equals `card == "active"`.


## P30.S22

- **frontend.md:** `06-library` rounds 01 (`jobs/06-library/rounds/01-library`) and 02 (`02-control-border`, C11: `--lib-control-edge` on the grouping control and the secondary buttons, `--lib-ghost-edge` on the shell's ghost buttons where the shell frames a library page) are the design record of the library (`/library`), the public org library (`/@{org}`), the shell's Reading group (Library, Review with the due count), the 44 px shell targets and "Your reading data / Clear all". The post-sign-in landing is `/library`.
- **api.md:** new `GET /app/orgs/{org}/library?scope=all|public` (optional identity; a member reads every project, anyone else the public ones; `scope=public` gives a member the public view; books with chapters and variants, loose documents, the project list; one 404 for every miss); `GET /app/reader/library` books carry `updated`.
- **backend.md:** `server/books_api.py` `org_library`, `server/db.py` `list_loose_documents`.
- **operations.md:** none (the runtime manifest is unchanged).

## P30.S23

- **frontend.md:** `07-book-page` round 01 is the design record of the book page: `/@{org}/{project}/books/{book}` in the reader's chrome (a slim top bar, no app rail), the head, Continue reading, the per-book list's entry, Contents with the variants line and the versions panel, "Clear this book's reading data", the loading, not-found and failed states, the five book shapes, member / other org / signed out. New files: `web/src/app/(public)/[org]/[project]/books/[book]/{page,loading,error,not-found}.tsx`, `web/src/components/book/`, `web/src/lib/book/` (`model.ts` the rules, `load.ts` the reads, `view.ts`, `actions.ts` the clear), `web/src/content/book.ts`, `web/src/app/book.css`.
- **api.md:** none (the page reads existing routes: `GET /app/orgs/{org}/{project}/books/{book}`, `GET /app/reader/books/…`, `GET /app/reader/annotations`, `DELETE /app/reader/state?scope=book`; `KbReaderBook` carries `continue`, `updated` and `counts`).
- **security.md:** none (the book page is a reader route, so it takes the nonce'd `script-src`; the clear is a server action that sends only the caller's own `(org, project, book)`).
- **operations.md:** none (the runtime manifest is unchanged).

## P30.S24

- **frontend.md:** `08-review` round 01 is the design record of the review surface: `/review` in the reader's family (no app shell), the queue header and counts with the By book disclosure, the quiz and highlight cards, the foot (Next or the two ratings with interval previews on the 3:1 control edge), the way back into the chapter, suspend and undo, the end / limit / paused / empty / failed states, review settings and Display. New files: `web/src/app/review/{layout,page,loading,error}.tsx`, `web/src/app/review.css`, `web/src/components/review/` (`review-app` the island, `card`, `queue-head`, `end`, `settings`, `skeleton`, `inline`, `review-static`), `web/src/lib/review/` (`model.ts` and `foot.ts` pure and tested in `web/tests/review-model.test.ts`; `actions.ts` the server actions; `types.ts`, `spec.ts`, `cx.ts`), `web/src/content/review.ts`.
- **api.md:** none (the page reads and writes existing routes: `GET /app/reader/review/queue`, `POST …/cards/{id}/review` with `review_id`, `PATCH …/cards/{id}`, `PATCH /app/reader/profile`, `GET /app/reader/continue`; `lib/knowledge/reader.ts` gained `getReviewQueue`, `postCardReview`, `patchReviewCard`, `patchReaderProfile`).
- **security.md:** none (a reader-family route, so it takes the nonce'd `script-src`; the actions send only the caller's own token).
- **operations.md:** none (the runtime manifest is unchanged).
