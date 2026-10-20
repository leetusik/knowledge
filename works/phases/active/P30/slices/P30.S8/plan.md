# P30.S8 — Reader state (Postgres, `/app/reader/` API, beacon, purge)

## Goal

Store each signed-in reader's private state, as P29 S3 settled it:
- resume position and progress;
- bookmarks;
- highlights and notes;
- quiz results;
- profile.

That means one additive Alembic revision with seven tables, the `/app/reader/…` reads and writes (except
review, S10, and anchor resolution, S9), the web position beacon, the purge on document delete, and core
tests 1 and 2.

## Read first (just in time)

- `works/phases/active/P30/topics/slice-breakdown.md` → **S8**: the scope checklist.
- P29's contracts, via `phase-section P29 Decisions`. Read only these headings: *S3 Who keeps state*,
  *Keys*, *Resume and progress* (with the Mark-as-unread reset amended at P29.S4), *Bookmarks*,
  *Highlights and notes*, *Quiz results*, *Tables*, *Routes and writes* and *Privacy*.
- The signed rounds' contract details that touch state:
  - `docs/reference/design/jobs/05-annotations/rounds/02-keyboard-and-back-link/result.md` `## Build` and
    the `01-annotations` build prompt (the note's 2,000-character limit; text before the first heading takes
    no highlight; `block` notes);
  - `04-quiz` (the saved-answer payload, "your answer, v3");
  - `06-library` and `07-book-page` (what "clear all" and "clear this book" remove).
- `works/phases/active/P30/phase.md`: `## Notes for later slices` (standing gates, including the
  **plugin_parity** gate and the core tests), `topics/notes-server.md` (S2 book helpers; S5's
  `source`/stem facts) and `## Operator Questions` (decided OQs).
- Code:
  - `alembic/versions/0005_tenant_slug.py` and `alembic/env.py`;
  - `server/accounts/`, `server/persistence/`, `server/app_api.py` (session auth and `_resolve_readable_doc`);
  - `server/documents_api.py` delete handlers, `server/books.py`;
  - the web BFF patterns under `web/src/app/api/`;
  - `tests/conftest.py` (Postgres fixtures).

## Approach (pinned)

1. **`alembic/versions/0006_reader_state.py`:** additive, `down_revision = 0005`, with the seven tables
   exactly as P29 *Tables* gives them: keys, `user_id` FKs, indexes, and the unique constraints that make
   last-write-wins and grow-only fields possible. A downgrade drops them.
2. **Keys:** state is keyed by `user_id` plus (tenant, project, document stem), with the cross-language
   `unit` P29 defines.
   - `unit` is derived from the index (S2's chapter variants).
   - It is re-written when a manifest binds or unbinds a document: hook S2's `PUT` and placement, and
     S5's html→native, where the stem stays the same.
3. **Routes:** every `/app/reader/…` read and write in P29 *Routes and writes*, except review and anchor
   resolution.
   - Session auth.
   - **Every query is scoped by `user_id`.** Another user's row id is a 404.
   - Every read and write re-checks the document's readability through the same gate the document routes
     use. A private or deleted document is omitted from every list and count, and every write to it is a
     404 (404, never 403).
   - Also `DELETE state?scope=book|all` and `PATCH profile`.
   - The quiz-attempt payload carries `doc` and `unit` from the start.
   - Anchors are stored as given. S9 adds re-anchoring; store the fields it needs (`anchored_version`,
     `anchor_status`, …) now, so S9 adds no migration.
4. **Beacon:** a web route, `POST /api/reader/position` under `web/src/app/api/`, forwards to the server.
   It follows P29's cadence, last-write-wins on position, a grow-only `max_fraction`, and a grow-only
   `finished` (except the explicit Mark-as-unread reset in P29's amended progress contract). It accepts
   `sendBeacon` bodies (text/plain JSON) on pagehide. Format only the files you create (D22).
5. **Purge:** both document-delete handlers purge every reader's state for that document (A4: readers'
   notes go too). Purge in the same transaction where possible, and log the purge.
6. **Anonymous:** no state is stored. Writes without a session return 401 (A4).

## Tests (core 1 and 2, plus the purge)

- Isolation: user B cannot read, list, update or delete user A's rows; each attempt is a 404.
- Visibility: after a project turns private, or a document is deleted, every read, list and count omits
  it, and every write is a 404.
- Delete purges all readers' state for the document.
- The grow-only and last-write-wins rules hold.
- The migration upgrades and downgrades cleanly on the test Postgres.

## Out of scope

- Re-anchoring (S9), review and FSRS (S10), the sign-in return address (S11), and every reader UI.

## Validation

- `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55432/kb uv run pytest -q`.
- `uv run alembic upgrade head` and `uv run alembic downgrade -1` against the test DB.
- `pnpm --dir web typecheck`, `lint`, `test` and `build`.
- `python3 scripts/plugin_parity.py` **must pass**: mirror new and changed server files, the alembic
  revision and tests into `plugin/templates/kb/` and the manifest.
- `python3 scripts/skills_parity.py`.
- `python3 scripts/workflow.py validate`.

## Notebook

- `phase.md`:
  - Doc impact, one short line each, detail in `topics/doc-impact-detail.md`: `api.md`, `data.md`,
    `backend.md`, `security.md` (reader-state privacy), `frontend.md` (the beacon), and a `decisions.md`
    ADR line;
  - notes for S9–S11 and S13+, in `topics/notes-server.md` with one link line;
  - `## Now`.

  Keep it under 41 KB and compress first if needed.
- `result.md`: verdict block first.

**Unattended run:** settle open choices by P29's recommendation or the stricter, privacy-first option.
Record them on `## Operator Questions` as `decided: …`, and return `done`. Return `blocked` only for a
real impediment.

## Dispatch

slice=P30.S8
phase=P30
kind=implementation
risk=high
attempt=1
route=high
reason=risk high (not low)
tier=high
subagent_type=slice-executor-high
model=opus
pass_model=yes
effort=high
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=high
