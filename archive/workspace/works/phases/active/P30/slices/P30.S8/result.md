# P30.S8 — result

## Verdict

- status: done
- tier: high
- model: opus
- effort: high
- summary: Reader state is backed. Alembic `0006_reader_state` adds the seven P29 tables. The user-scoped `/app/reader/…` API (every read and write except review and anchor resolution) re-checks readability through one `Gate`. The web route `POST /api/reader/position` relays the beacon. Both document deletes purge every reader's state first and fail closed. Book binding re-writes `unit`. Core tests 1 and 2, the purge, the conflict rules and the migration are covered in `tests/test_reader_state.py`.
- files_changed: `alembic/versions/0006_reader_state.py`, `server/persistence/models.py`, `server/reader_state.py`, `server/reader_api.py`, `server/main.py`, `tests/test_reader_state.py`, `web/src/app/api/reader/position/route.ts`, `web/src/lib/knowledge/reader.ts`, `plugin/templates/kb/server/{main.py,persistence/models.py,reader_api.py,reader_state.py}`, `plugin/templates/kb/tests/test_reader_state.py`, `plugin/templates/manifest.json`, `works/phases/active/P30/phase.md`, `works/phases/active/P30/topics/doc-impact-detail.md`, `works/phases/active/P30/topics/notes-server.md`, this file
- validation:
  - `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55432/kb uv run pytest -q`: PASS, 202 passed (197 before + 5 new)
  - `uv run pytest -q` with no DSN (legacy mode): PASS, 148 passed, 54 skipped
  - `uv run alembic upgrade head` / `downgrade -1` / `upgrade head` on the test DB (`DATABASE_URL=postgresql+psycopg://kb:kb@127.0.0.1:55432/kb`): PASS; the DB is left at `0006_reader_state (head)`. `alembic.autogenerate.compare_metadata` against the models gives 0 diffs
  - `pnpm --dir web typecheck`, `lint`, `test` (125 passed), `build` (`ƒ /api/reader/position`): PASS
  - `python3 scripts/plugin_parity.py`: PASS
  - `python3 scripts/skills_parity.py`: PASS
  - `python3 scripts/workflow.py validate`: PASS (the existing stale-docs and oversized-section warnings only)
- deviations: (1) The alembic revision is not mirrored into `plugin/templates/kb/`. The template ships no `alembic/` directory at all (0001–0005 are not there either), so a lone 0006 would be wrong. The migration test skips when there is no `alembic.ini`, which keeps it shippable. (2) The purge runs before the content delete, not "in the same transaction". Postgres and SQLite cannot share one, so the purge is its own transaction and fails closed (OQ27). (3) Small additions beyond the plan's route list: `GET profile`, `annotations?doc=` and bookmarks in the per-book list (OQ30).
- doc_impact: `api.md`, `data.md`, `backend.md`, `security.md`, `frontend.md`, `decisions.md`: six lines in `phase.md` → `## Doc impact`, with the detail in `topics/doc-impact-detail.md` → *P30.S8*

## What was built

- **Migration** `alembic/versions/0006_reader_state.py` (down_revision `0005_tenant_slug`), mirrored by ORM models in
  `server/persistence/models.py` (the tests' `create_all` and the migration agree: zero autogenerate diff):
  - **`reader_positions`:** its PK is `(user_id, tenant_id, project, doc)`, the upsert's conflict target. It has indexes
    `(user_id, updated_at DESC)` and `(user_id, tenant_id, project, unit)`.
  - **`reader_bookmarks` and `reader_annotations`:** the annotations table has the CHECK `quote IS NOT NULL OR note IS
    NOT NULL`.
  - **`quiz_attempts`:** unique `(user_id, tenant_id, project, unit, item_id, attempt)`.
  - **`review_cards`:** a partial unique index on the quiz item, and a unique `annotation_id` (FK with cascade).
  - **`review_logs` and `reader_profiles`.**
  - **Shared rules:** every table cascades from `users`, and the content-keyed ones also from `tenants`. Each per-document
    table also gets a `(tenant_id, project, doc)` index for the purge.
  - **Downgrade** drops the tables, dependents first.
- **`server/reader_state.py`:**
  - **`Gate`** is the readability re-check, `_resolve_readable_doc`'s rule applied to a stem: the document must exist
    by stem in the tenant, and the caller must be a member or the project public. It also derives `unit`, `lang` and the
    current `version` fresh from the index, with caches per request.
  - **The store.** `upsert_position` is one atomic `INSERT … ON CONFLICT DO UPDATE` carrying P29's rules: LWW,
    `GREATEST(max_fraction)`, set-only finished, and the `unread` reset. There are also idempotent client-id creates, owned
    get/update/delete, `record_attempt` (the server numbers attempts, with a retry on a unique race), `latest_attempts`
    (`DISTINCT ON`), and the profile and the two clears.
  - **The content-plane hooks:** `purge_document`, `rewrite_units`, `sync_units_after_manifest`, and `run_from_worker`
    (`anyio.from_thread.run`, because the content write paths are sync handlers in worker threads).
- **`server/reader_api.py`:** every route under `/app/reader`. The routes and shapes are in its docstring and in
  `topics/notes-server.md` → *S8*.
- **`server/main.py`:**
  - The router is mounted.
  - `_delete_document` purges first and answers 503 if that fails. It serves both `/api` deletes and, through
    `_delete_owned_document`, the `/app` delete. The `/api` response adds `reader_state_purged`.
  - `put_book` and `create_document` (placement, and the html → native manifest re-point) call the unit re-write. It runs
    outside `WRITE_LOCK`, on the union of the book's bindings before and after.
- **Web:**
  - `web/src/app/api/reader/position/route.ts` checks four things in order: same origin (403), `text/plain` or JSON
    (415), the 4 KB cap (413) and a session (401). It then validates the body with zod (422, strict, no `unread`) and
    relays to `PUT /app/reader/positions`. It passes 401/404/422 through, and anything else is a 502.
  - `web/src/lib/knowledge/reader.ts` holds `putReaderPosition` and `KbPosition`.
  - Only the files created here were formatted with prettier (D22).

## Tests (`tests/test_reader_state.py`, Postgres-gated)

1. `test_isolation_another_users_rows_are_404`:
   - B sees none of A's rows on a shared public document, in the doc read, continue and library;
   - B's PATCH and DELETE of A's bookmark and annotation ids are 404;
   - a create that claims A's id is a 404;
   - B's `scope=all` clear leaves A intact;
   - an anonymous write is a 401.
2. `test_visibility_private_hides_and_delete_purges`:
   - after the project turns private, B's doc read, continue and library omit the document;
   - every write kind from B is a 404, while the owner still reads;
   - when the project turns public again, the rows come back unchanged;
   - the `/app` delete purges all 8 rows of both readers, and afterwards the reads and a write are 404.
3. `test_api_delete_purges_and_book_binding_rewrites_unit`:
   - `PUT /api/books` (org `vk_` key) re-writes the stored `unit` from `d:<doc>` to `c:guide/ch1`;
   - finishing the ko variant finishes the chapter, so the book reads 1 of 2;
   - the chapter read resolves `?lang=en`;
   - `scope=book` clears the book and keeps the loose document;
   - the `/api` delete purges and reports `reader_state_purged`.
4. `test_position_and_attempt_conflict_rules`:
   - LWW position, grow-only max, finish at 0.96 on v2 shows `updated`, and the finish then stays set;
   - `unread` resets, and Mark as finished finishes again;
   - a version above the current one is a 422;
   - quiz attempts are numbered 1, 2, a retry is idempotent (200), and the latest attempt is shown.
5. `test_migration_upgrades_and_downgrades_on_a_fresh_database`:
   - creates a scratch database on the test server;
   - runs upgrade, then downgrade to `0005` (the 7 tables are gone), then upgrade again (7 tables, zero diff);
   - drops the database.

An extra probe was run and then deleted (it was never kept): library, continue, the per-book annotations list, profile
GET/PATCH (the IANA check, `day_starts_at_hour` refused), an md position bookmark, a non-native annotation (422), a note
over 2,000 characters (422), and `scope=book` without its parameters (422). All gave the expected answers.

## Decisions taken (unattended; recorded on `## Operator Questions`)

OQ26–OQ30. They cover the stem and `org` addressing, purging first and failing closed, deleting without tombstones, the
limits, and the additions beyond P29's list. The full text is in `phase.md` → `## Operator Questions`.

## Notes and leftovers

- The notes for S9, S10, S11 and S13+ are in `topics/notes-server.md` → *S8*, linked from `## Notes for later slices`.
- Manifest edits that arrive through reindex alone (a hand-edited `.books` file) do not re-write units. Reads are still
  right, because they derive the unit afresh. Only stored-unit grouping (S10's quiz-card lookup) could lag, until the
  next write to that document.
- A chapter's quiz cards (S10) are not removed when one language variant is deleted, because the other variants share
  them. A loose document's cards are removed.
- No real-browser claim: this slice has no UI. The beacon route was verified with typecheck, lint and build only.
- The shared test Postgres (`kb-p28s2-pg`) is at `0006_reader_state` and holds the test rows.
