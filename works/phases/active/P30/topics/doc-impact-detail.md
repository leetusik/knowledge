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
