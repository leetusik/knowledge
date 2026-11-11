# P41-sr.B1 — Listen jobs, audio store and listening positions (backend core)

## Goal

Build the server half of Listen that every later slice stands on:
- the audio store;
- the Postgres tables;
- the job queue the Mac runner claims from;
- the reader API the web player calls;
- the runner API the Mac calls.

No delivery: serving parts with Range and the HLS playlist are B2's. No web code. No runner: that is B3's.

Read first:
- `intent.md`: *Confirmed Intent* and *Scope Added at Execution* A.
- `phase-section P41-sr Decisions` and `Notes for later slices`. Note the voice: **Ming-3.0 US_Emma, English and
  Korean, rendered on the Mac**.
- The breakdown's `## P41-sr.B1 — …` block (`phase-section P41-sr "P41-sr.B1 — Listen jobs, audio store and
  listening positions (backend core)" --topic breakdown`). It holds the file:line facts this plan relies on.
- `topics/phone-playback.md` §6 (the cache key, the manifest, invalidation) and §7 (polling, lease, heartbeat,
  upload).
- The signed design's state contract: `docs/reference/design/jobs/11-listen/rounds/01-listen/result.md`
  `## Build` → *The Listen object (F19 + F23)*, and `frame.md` F17 and F19. The reader API must be able to fill
  `state`, `old`, `soFar`, `len`, `part`, `made`, and the kept position.
- `server/spoken.py` (S1): `spoken_script(tree, *, lang, title)` gives segments
  `{section, block, kind, lang, text}`.

## The design to build (pinned; decide only what is marked yours)

### Units: audio is made per document version

- **A unit** is one document version, in one language, in one voice.
  - Its identity is `(tenant, project, doc, version, lang, voice, profile)`. `doc` is the same document key
    `reader_positions` uses.
  - `voice` is the constant `ming3-us_emma`.
  - `profile` is a constant string naming the engine and encoder profile, for example `ming3-0.5b/aac-lc-48k-mono`.
    Put both constants in `config.py` with env overrides.
- **A book chapter is a document**, so a chapter's audio is that chapter document's unit.
- **"Listen to a book from chapter N"** is the ordered list of chapter units from N to the end. The order is the
  books' reading order (`server/books.py`, `position, key`), in the requested language's variant.
  - It is not a stored unit.
  - B2 turns that list into one playlist.
- **Only native documents are listenable.** These are documents whose source parses with
  `server/native/parse.py`. A legacy document answers the "unavailable" state. Find how the code tells them apart
  and say so in `result.md`.

### The manifest: segments, then parts

- **Segments.** Run `spoken_script(parse_chapter(source).tree, lang=…, title=…)`.
- **Segment hash:** `sha256(text + "\n" + lang + "\n" + voice + "\n" + profile)`.
- **Parts.** Group consecutive segments into parts at **section boundaries**: S1's `section` field. Merge
  neighbouring sections while the part's estimated speech stays **≤ ~10 min**. Estimate from characters at the
  measured rates, 13.4 characters a second for English and 7.5 for Korean (R1); put them in `config.py`.
  - Split a single section longer than the cap at segment boundaries.
  - Grouping by section keeps an edit local: only the parts holding a changed segment change.
- **Part key:** `sha256` over the ordered segment hashes, plus `profile`. It names the audio file, so an unchanged
  part is reused across versions with no new job.

### The store

- **Where:** `<content root>/.audio/` (`_content_root`, `documents_api.py:684`), with files named
  `<part key>.<ext>`.
- **Gitignore:** on first use, write `.audio/.gitignore` containing `*`, as `assets.py:683` does for `.assets`.
- **Never staged:** add `.audio` beside `_NEVER_STAGED_DIR` in `server/gitops.py`. It is used at `:267` and
  `:446`; keep the same mechanism.
- **Writes are write-once and atomic:** a temp file, then `os.replace`.
  - An existing file with the same key and the same bytes is a success.
  - Different bytes for an existing key are a 409.
  - Take the write lock only if the code already requires it for files under the content root (as
    `store_assets` does); otherwise atomic write-once is enough. Say which you did.
- **The format:** it is B2's open decision.
  - B1 stores bytes with an extension from a small allowlist, `m4a`, `mp4` or `aac`, chosen by the upload's
    `Content-Type`: `audio/mp4` or `audio/aac`.
  - It verifies the client's declared sha256 of the bytes.
  - It caps an upload at **4 MB** (config).

### Postgres (Alembic `alembic/versions/0007_listen.py`, `down_revision = "0006_reader_state"`)

Model it on `0006_reader_state.py` and `ReaderPositionModel` (`server/persistence/models.py:284`). Name the
tables `listen_*`. You choose the columns and indexes beyond what follows; justify any extra in `result.md`.

- **`listen_units`:**
  - the identity above;
  - `state`: `making`, `made` or `failed`;
  - the part count, the made-part count, and the made and total seconds;
  - the total characters;
  - `failure` text;
  - created and updated times.
- **`listen_parts`:**
  - the unit, the index, the part key;
  - the first and last segment index, the segment hashes (JSON), the characters, the estimated seconds;
  - once made: the file key, the bytes, the real seconds (`seconds` comes from the runner), and the made time.
- **`listen_jobs`, one per part to make:**
  - the unit, the part index, the part key;
  - `priority` (reading order from the listener's start);
  - `state`: `queued`, `leased`, `done` or `failed`;
  - `lease_until`, `leased_by` (the credential id), `attempts`, `last_error`;
  - created and updated times.
  - **No duplicates:** a part key that is already made or already queued enqueues nothing.
- **`listen_runners`:** `(tenant, credential)` → `last_seen`. Every runner call updates it.
- **`listen_positions`,** one row per user and **Listen**:
  - the key: user, tenant, `kind` (`doc` or `book`), project, the doc or book key, the start chapter for a book;
  - the position: the chapter or doc key and the seconds;
  - `speed`, `follow` (bool), `kept` (bool, F17: the place Stop listening leaves), and the updated time.
  - `speed` and `follow` are the listener's preference and carry to the next Listen (F3). Store the preference
    with the latest position, or in its own row; your choice, stated.

### The queue (the core invariant)

- **Claim:** pick the lowest `priority`, then the oldest, among jobs that are `queued` or `leased` with an expired
  lease, for the caller's tenant.
  - Use one transaction with `SELECT … FOR UPDATE SKIP LOCKED`.
  - Set `leased`, `lease_until = now + lease` (default 600 s, config), `leased_by`, and `attempts + 1`.
  - Return `204` when there is nothing to do.
- **Heartbeat:** extends the lease, only for the job's current holder (`leased_by` matches and the lease is
  live); otherwise `409`.
- **Upload** (`PUT …/parts/{part_key}`, raw body): it stores the file write-once. It is allowed for the holder of
  a live lease on a job for that key.
- **Finish:** records the made part (file key, bytes, seconds) and sets the job `done`. It updates the unit's
  counts, and sets the unit `made` when every part is made.
- **Fail:** records `last_error` and returns the job to `queued`, until **3 attempts** (config). Then the job
  becomes `failed` and the unit `failed`, with its message.
- **Lease expiry:** a lease that expires (the Mac slept) makes the job claimable again, with no reaper thread;
  the claim query does it.
- **Priority:** a new Listen enqueues its unit's missing parts in reading order from the listener's start: the
  start chapter, then the following chapters. A later Listen of the same content re-prioritises the queued jobs
  it covers to come first.

### The reader API (`/app/listen/…`, session only, `accounts/auth.py:65-143`)

Every route resolves the document through `_resolve_readable_doc`, or its book equivalent, behind one constant
404. With no `DATABASE_URL`, every Listen route answers 404.

- **`POST /app/listen/start`** `{project, doc | book + from_chapter, lang}`:
  - creates or attaches the units for the current versions;
  - enqueues the missing parts (above);
  - clears a `kept` position for this Listen;
  - returns the Listen state.
- **`GET /app/listen/state?…`** (the same key): returns the Listen state, shaped so the web can fill F19 and F23:
  - each unit's `state`;
  - `made` (made parts, and the chapters whose audio is complete);
  - the part in progress, and its index of n;
  - `len`: the full length when known, or the made length while still making, with `soFar`;
  - `old`: the stored unit is for an older version than the document's current one;
  - `waiting`: jobs queued but no runner seen within, say, 2 × the poll interval;
  - `runner_last_seen`;
  - the failure, with its kind;
  - the saved position, speed, follow and kept.

  Shape it for the web, never for the canvas fixture.
- **`PUT /app/listen/position`:** saves the position, speed, follow and kept, for the session's user.
- **`POST /app/listen/update`:** after a document version changed, makes the current version's unit. Only parts
  whose key is new get jobs.

### The runner API (`/api/listen/…`, an org `vk_` key, `resolve_api_write`; reject a project-bound key)

- **`POST /api/listen/jobs/claim`:** returns `204`, or the job: `{job, part_key, lang, voice, profile, segments:
  [{text}], est_seconds}`. The Mac never reads a document.
- **`POST /api/listen/jobs/{job}/heartbeat`**.
- **`PUT /api/listen/parts/{part_key}`:** the raw audio, with `Content-Type`, a header carrying the sha256 of the
  body, and `seconds`.
- **`POST /api/listen/jobs/{job}/finish`** `{seconds}` and **`POST /api/listen/jobs/{job}/fail`** `{error}`.

## Tests (tiny, core only)

Postgres tests use a throwaway database. Prefer `KB_TEST_DATABASE_URL` if it is set; otherwise you may start
one disposable `postgres` container on a free local port, with a unique name such as `p41-b1-pg`, and remove it
at the end.
- **Never touch the other containers running on this Mac.**
- If Docker or the image is unavailable, the Postgres tests skip, as `tests/test_accounts_provisioning.py` does,
  and you say so.

Three test functions at most, in `tests/test_listen.py`:
1. **Claim, lease and re-queue:**
   - two claims never return the same job;
   - an expired lease is claimable again;
   - a third failure fails the job and the unit.
2. **Upload:** write-once, the same bytes are idempotent, different bytes give `409`, and an upload without the
   lease is refused.
3. **Manifest stability**, with no Postgres needed: editing one section's text changes only that part's key.
   Use a small native fixture under `tests/fixtures/listen/`.

## The template mirror

Every new or changed file under `server/` and `tests/` mirrors byte-identically into `plugin/templates/kb/`,
with an entry in `plugin/templates/manifest.json` `files.identical`, keeping its ordering style.
- `alembic/` is not shipped, so `0007_listen.py` stays root-only.
- `server/main.py` is byte-identical: it imports the Listen router, so the router module must ship. Never import a
  root-only module from a shipped file.

## Validation

- `uv run pytest -q tests/test_listen.py`
- `uv run pytest -q tests/test_spoken.py tests/test_api_read.py tests/test_documents_api.py tests/test_assets.py`
- `uv run python scripts/plugin_parity.py`, which must exit 0
- `uv run alembic upgrade head` then `downgrade -1` against the throwaway database, if one ran
- `git status --porcelain --untracked-files=all`: only this slice's set changed. `UPDATE_REQUIRED.md` at the root is
  the workspace updater's notice, not yours.
- The full `pytest` and the web gates are the REVIEW's whole-tree checks. You may run the full Python suite if it
  is quick; list what you ran.

## Return

- Write `result.md` with the verdict block first.
- Put **the API contract** (paths, bodies, status codes, the state shape) in a `## Contract` section. B2, B3 and
  W1 build from it.
- The `notebook` field holds:
  - **Decisions:** one gist: `Listen backend (B1): units per document version, parts by section ≤ 10 min, a
    Postgres job queue with leases, positions beside reader_positions → slices/P41-sr.B1/result.md § Contract`;
  - **Notes for later slices** `(for B2, B3, W1)`: one gist pointing at `§ Contract`;
  - **Doc impact:** `backend.md`, `api.md`, `data.md`, `security.md`, each one line naming what changed;
  - **Now:** one line.

## Dispatch

route=high
reason=risk high (not low)
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
