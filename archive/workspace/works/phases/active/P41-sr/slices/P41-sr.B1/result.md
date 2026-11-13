# P41-sr.B1 — result

## Verdict

- **status:** done
- **route:** high
- **model:** opus
- **effort:** xhigh
- **summary:** Built Listen's server half. It has five parts:
  - the manifest and the write-once `.audio/` store (`server/listen.py`);
  - the Postgres units, parts, leased job queue, runner stamps and listening positions (`server/listen_jobs.py`, Alembic `0007_listen`);
  - the session-only `/app/listen` reader API and the org-key `/api/listen` runner API (`server/listen_api.py`, mounted in `main.py`);
  - three tiny core tests;
  - the byte-identical template mirror.

  The API contract is in § Contract below.
- **files_changed:**
  - new: `server/listen.py`, `server/listen_jobs.py`, `server/listen_api.py`, `alembic/versions/0007_listen.py`,
    `tests/test_listen.py`, `tests/fixtures/listen/doc.md`;
  - edited: `server/main.py`, `server/config.py`, `server/gitops.py`, `server/persistence/models.py`,
    `plugin/templates/manifest.json`;
  - mirrored: the `plugin/templates/kb/` copies of all eight `server/` and `tests/` files above (new and edited);
  - this `result.md`.
- **validation** (throwaway `postgres:17` container `p41-b1-pg` on 127.0.0.1:55441, removed with its volume at the end):
  - `uv run pytest -q tests/test_listen.py`: 3 passed with `KB_TEST_DATABASE_URL`; 1 passed, 2 skipped without it.
  - `uv run pytest -q tests/test_spoken.py tests/test_api_read.py tests/test_documents_api.py tests/test_assets.py`:
    17 passed, 10 skipped without a database. With `tests/test_reader_state.py` added and a database, 32 passed.
    `test_reader_state`'s migration test now walks `0007` down and up and diffs the ORM.
  - `uv run python scripts/plugin_parity.py`: PASS, exit 0.
  - `alembic upgrade head`, `downgrade -1` (back to `0006_reader_state`, listen tables 0), `upgrade head` on the scratch database
    `kb_mig`: all clean. `compare_metadata` against the ORM: `[]`.
  - Full Python suite: 247 passed with a database; 185 passed, 62 skipped without.
  - `git status --porcelain --untracked-files=all`: only this slice's set. Already dirty before this slice and left alone:
    `UPDATE_REQUIRED.md`, `works/backlog.md`, `works/events.jsonl`, `phase.md`, `slice.json`, `plan.md`.
  - Not run: the web gates (the REVIEW's whole-tree checks).
- **deviations:** 11, listed in § Deviations. None changes a pinned behaviour; each adds what the contract needed, or
  states a choice the plan left open.
- **doc_impact:** none written to `phase.md`, since the orchestrator writes the notebook. The six lines are under
  `notebook` → Doc impact.
- **notebook:**
  - **Decisions:**
    - `Listen backend (B1): units per document version, parts by section ≤ 10 min, a Postgres job queue with leases, positions beside reader_positions → slices/P41-sr.B1/result.md § Contract`
  - **Notes for later slices:**
    - `**(from P41-sr.B1, for P41-sr.B2, P41-sr.B3, P41-sr.W1)** Build from slices/P41-sr.B1/result.md § Contract. B2: a unit's parts in listen_parts (file, seconds, segment_seconds), bytes at <content root>/.audio/<file>; the playable prefix is the leading made parts. B3: § Runner rules. W1: § State, and its F19 mapping.`
    - `**(from P41-sr.B1, for P41-sr.REVIEW)** Known gaps, filed as deferred-job candidates in result.md § Open edges: a document delete leaves its listen_* rows and .audio files (unreachable behind the gate); there is no audio GC yet.`
  - **Doc impact:**
    - `- backend.md: Listen's server half: server/listen.py (the manifest: segments → hashes → parts by section ≤ ~10 min, keyed by text; the write-once .audio/ store), server/listen_jobs.py (units, parts, the leased job queue, positions), server/listen_api.py; the KB_LISTEN_* settings; gitops never stages .audio (P41-sr.B1)`
    - `- api.md: new /app/listen/{start,state,position,update} (session) and /api/listen/{jobs/claim, jobs/{id}/heartbeat, parts/{key}, jobs/{id}/finish, jobs/{id}/fail} (org vk_ key); shapes and codes in slices/P41-sr.B1/result.md § Contract (P41-sr.B1)`
    - `- data.md: Alembic 0007_listen adds listen_units, listen_parts, listen_jobs (one live job per part key, a partial unique index), listen_runners and listen_positions; audio files at <content root>/.audio/<part key>.<ext>, gitignored and never staged (P41-sr.B1)`
    - `- security.md: the runner API takes only an org-level vk_ key (a project-bound key, the master bearer or a session gets 403); an upload needs the caller's live lease, is sha256-checked, ≤ 4 MiB and write-once; reader routes are session-only behind the readability gate's constant 404; runner_last_seen and failure messages go to the owning tenant's members only; a private document's spoken text is copied into listen_parts.segments (P41-sr.B1)`
    - `- qa.md: tests/test_listen.py (3 tests, 2 Postgres-gated); the full Python suite is 247 passed with a DSN, 185 passed / 62 skipped without (P41-sr.B1)`
    - `- operations.md: 0007_listen runs in the deploy's alembic step; Listen audio grows on the box disk under docs/.audio/ and tenants/<uuid>/.audio/; the KB_LISTEN_* env settings (voice, profile, cap, rates, lease, attempts, upload cap, poll, RTF) (P41-sr.B1)`
  - **Now:**
    - `B1 landed: the Listen backend core (store, 0007_listen, leased queue, reader and runner APIs, template mirror). Next: B2 pins the packaging and serving on § Contract; B3 and W1 build on it after.`
  - **Operator Questions:** none.

## Contract

B2, B3 and W1 build from this section.

### Common rules

- **No `DATABASE_URL`:** every route below answers `404 {"detail": "not found"}`, before any auth.
- **Reader routes (`/app/listen/…`):**
  - auth is `Authorization: Bearer <session>` (`require_user`); anything else gets the generic 401;
  - every miss gets the same `404 {"detail": "not found"}`: an unknown org, a private or deleted document, a missing
    book or chapter;
  - a malformed body or query gets 422. All of these routes are unmetered.
- **Runner routes (`/api/listen/…`):**
  - auth is `Authorization: Bearer vk_…`, an **org-level** key, through `resolve_api_write`. A bad or missing bearer
    gets 401. A project-bound key, the master `KB_API_TOKEN` or a session token gets
    `403 {"detail": "the runner API takes an org-level vk_ key"}`;
  - every accepted call upserts `listen_runners(tenant, credential).last_seen`;
  - a runner sees only its own tenant's jobs; another tenant's job id is 404.

### The Listen key

The same key serves as the body of start, update and position, and as the query of state.

- `{org, project, doc}`: a document. `doc` is the document stem (`<date>-<slug>`), the key `reader_positions` uses.
- `{org, project, book, from_chapter?}`: a book from a chapter to its end, in `chapters.position, key` order.
  `from_chapter` defaults to the first chapter.
- `org` is the org slug or the tenant id (the reader API's rule). Give exactly one of `doc` and `book`.
- `lang` is optional:
  - on a document, it must equal the document's own language, else 422;
  - on a book, it picks each chapter's variant. The default is the start chapter's `en` variant, else its first.
    A chapter with no variant in that language is an `unavailable` entry with `reason: "missing"`.
- **Listenable:** only native documents can be listened to. The code tells them apart by the SQLite
  `documents.format == 'native'`, which the indexer sets from the `format: native` header (`documents.is_native_meta`,
  `reindex._split_body`). A native document's whole file is in `documents.source`. `DocRef.format` carries the format
  through the gate. Any other format (`md`, `html`) is `unavailable` with `reason: "legacy"`.
- **Unreadable:** a native document whose source no longer parses, or whose spoken script holds nothing beyond its
  title, gets a unit stored `failed` with `failure.kind: "unreadable"`. F17 calls this "Can't be read aloud".

### Reader routes

- **`POST /app/listen/start`** (Listen key) → `200` State. It clears `kept` on this Listen's position. Per document of
  the Listen:
  1. If the current version's unit is made, it plays. Start re-verifies its part keys against the document; a stale
     unit is replaced (§ Deviations 7).
  2. Else, if an earlier version has a made unit, that unit plays (`old: true`). Start queues nothing new for the
     document; that is Update audio's job.
  3. Else, start creates or verifies the current version's unit. A part whose key is already made anywhere in the
     tenant, with its file on disk, is made at once. A voice-failed unit is reset to `making`: this is "Try again".

  Every missing part is queued in reading order from the start chapter. Each new Listen's jobs go ahead of every
  earlier Listen's. A job that is already live only has its priority lowered, never duplicated.
- **`POST /app/listen/update`** (Listen key) → `200` State. For every listenable document, it does what step 3 does,
  even when an earlier version is playing. So only part keys that are new get jobs. It does not touch `kept`.
- **`GET /app/listen/state?org=&project=&doc=`** or **`…&book=&from_chapter=&lang=`** → `200` State. It only reads.
- **`PUT /app/listen/position`**: the Listen key plus `{chapter?, seconds, speed?, follow?, kept?}` → `200 {listen, position}`.
  - **Limits:** `seconds` must be within 0..14400, and `speed` within 0.5..3.0.
  - **`chapter`:** on a book, it defaults to `from_chapter` and must be one of this Listen's chapters, else 422. On a
    document, it must be absent, else 422.
  - **When omitted:**
    - `speed` and `follow` keep this Listen's stored value. Without one they take the user's newest row anywhere (the
      F3 preference), else `1.0` and `true`.
    - `kept` keeps its stored value, else `false`.
  - Last write wins.

### State

```
{
  "listen":  {"kind": "doc"|"book", "org", "project", "doc"|null, "book"|null, "from_chapter"|null, "lang"},
  "state":   "none" | "unavailable" | "making" | "made" | "failed",
  "old":      bool,          // some entry plays an earlier version than the document's current one
  "updating": bool,          // ...and that document's current-version unit is being made
  "so_far":   bool,          // not every listenable entry is made
  "len":      seconds|null,  // the playable length from the start; null when nothing is made yet
  "made":    {"parts": int, "of": int, "chapters": [chapter key], "through": chapter key|null},
  "part":    {"n": int, "of": int, "chapter": key|null} | null,   // the part being made (1-based)
  "left_seconds": int|null,  // about how long the making still takes (wall time)
  "waiting":  bool,          // work being made, and no runner call within 2 × KB_LISTEN_POLL_S
  "runner_last_seen": iso|null,                                  // members of the owning tenant only
  "failure": {"kind": "voice"|"unreadable", "part": {"n","of"}|null,
              "message": str /* members only */, "chapter": key|null} | null,
  "entries": [Entry],        // one per document, in reading order (a doc Listen has one)
  "position": Position|null, // this Listen's row
  "resume":   Position|null, // book only: the user's newest row for this book, whatever its start chapter
  "speed": float, "follow": bool,  // this Listen's, else the user's newest row (F3), else 1.0 / true
  "kept":  bool
}
Entry    = {"chapter": key|null, "title", "doc": stem|null, "lang", "current_version": int|null,
            "state": "unavailable" (+ "reason": "legacy"|"missing") | "none" | "making" | "made" | "failed",
            "old": bool, "updating": bool,
            "unit": uuid|null, "version": int, "parts": int, "parts_made": int,
            "len": seconds|null, "so_far": bool, "est_seconds": float,
            "part": {"n","of"}|null, "left_seconds": int|null, "failure": {...}|null,
            "update": UnitView|null}   // the current version's unit while an earlier one plays
Position = {"from_chapter", "chapter", "seconds", "lang", "speed", "follow", "kept", "updated_at"}
```

- **Top-level `state`:**
  - `unavailable` when no entry can be listened to;
  - otherwise the state of the first entry, in reading order, that is not `made`;
  - `made` when every entry is made.
  - `none` means no unit exists yet: the Listen has not started.
- **An entry's `len`:**
  - made: the real total;
  - otherwise: the leading made parts, that is the contiguous playable prefix (`2:10 of 9:40 so far`, F23);
  - `null` when part 1 is not made (F2: show no length).
- **Top-level `len`:** the made entries' lengths, plus the next entry's made prefix.
- **`made`:**
  - `parts` and `of` count the parts of the playing units;
  - `chapters` lists the chapters whose audio is complete;
  - `through` is the last chapter of the run made from the start. This is F23's `made`, which moves only with the
    making.
- **`part`:** the first unmade part of the first entry that is not made. The F32 dock shows it as "part n of 9".
  `failure.part` is where the voice stopped, accurate even when earlier parts are still being made.
- **`left_seconds`:** the estimated seconds of every unmade part × `KB_LISTEN_RTF`. It covers only making units. F9's
  "about 15 min left" is formatted from it; the web hides it before part 1 is done.
- **The F19 mapping, for W1:**
  - `waiting` ← `state: making` with `waiting: true`;
  - `making` (Preparing…) ← `making` with `len: null`;
  - `ready` (the first part) ← `making` with `len` set;
  - `fail-voice` ← `failure.kind: voice`;
  - `fail-unreadable` ← `failure.kind: unreadable`;
  - `outdated` (Earlier version) ← `old`, and Update audio's "Updating…" ← `updating`;
  - `next-waiting` ← the next entry is not made while this chapter ends;
  - every playback state (`tap`, `loading`, `playing`, …, `offline-*`, `fail-play`, `fail-session`) is client-side.
    `fail-limit` has no server source: the voice is local.

### Runner routes

- **`POST /api/listen/jobs/claim`** answers `204` with an empty body when there is nothing to do. Otherwise:

  ```
  200 {"job": uuid, "part_key": hex64, "lang", "voice", "profile",
       "segments": [{"text"}], "est_seconds", "attempt", "max_attempts", "lease_seconds", "lease_until"}
  ```

  - **Order:** the lowest `priority`, then the oldest, among the tenant's `queued` jobs and its `leased` jobs whose
    lease has expired. One transaction, `SELECT … FOR UPDATE SKIP LOCKED`.
  - **What it sets:** `leased`, `lease_until = now + KB_LISTEN_LEASE_S` (600), `leased_by` = the credential, and
    `attempts + 1`. Every claim is an attempt.
  - **Expired and out of attempts:** the claim fails such a lease first, with its units, rather than handing it out.
  - **Made meanwhile:** a job whose key was already made under another job is retired as `done`, and its units are
    moved on.
- **`POST /api/listen/jobs/{job}/heartbeat`**:
  - `200 {"job", "lease_until"}` extends the lease to `now + lease`. The caller must be the holder, with a live lease;
  - `409`: not this credential's live lease;
  - `404`: an unknown job, or another tenant's.
- **`PUT /api/listen/parts/{part_key}[?ext=m4a|mp4|aac]`** takes the raw body. Headers:
  - `Content-Type: audio/mp4` stores `.m4a`, or `.mp4` with `?ext=mp4`. `Content-Type: audio/aac` stores `.aac`;
  - `X-Content-SHA256: <hex sha256 of the body>`, required;
  - `X-Audio-Seconds: <float>`, optional.

  Answers:
  - `201 {"part_key", "job", "file", "bytes", "created": true}`;
  - `200 … "created": false`: the same bytes are already stored;
  - `409`: there is no live lease of this credential on a job for this key, or other bytes are already stored for the
    key (the `detail` names the stored file; the file stands);
  - `413`: the body is over `KB_LISTEN_MAX_PART_BYTES` (4 MiB);
  - `415`: the type or `ext` is not allowed;
  - `422`: the sha header is malformed or does not match, the body is empty, or the seconds are bad;
  - `404`: the key is malformed.
- **`POST /api/listen/jobs/{job}/finish`** `{"seconds"?: float, "segment_seconds"?: [float]}`:
  - `200 {"job", "state": "done", "part_key", "file", "bytes", "seconds", "units": [{"unit", "state", "parts_made", "parts"}]}`.
    It records the part as made on **every** part row with that key, so every unit that shares it moves. A unit is
    set `made` when all its parts are. A repeat after `done` returns the stored result;
  - `409`: not this credential's lease, or no file is stored for the key;
  - `422`: no `seconds`, neither here nor in the upload's header; or `segment_seconds`' length is not the part's
    segment count;
  - `404`.
- **`POST /api/listen/jobs/{job}/fail`** `{"error": str}`, stored up to 2,000 characters:
  - `200 {"job", "state": "queued"|"failed", "attempts", "max_attempts"}`. The job returns to `queued` until
    `attempts ≥ KB_LISTEN_MAX_ATTEMPTS` (3). Then it is `failed`, and every unit still waiting on its key is `failed`
    with `failure_kind: voice`, the message and `failure_part`;
  - `409` and `404` as for finish.

### Runner rules (for B3)

- **Polling:**
  - poll `claim` every `KB_LISTEN_POLL_S` (30 s);
  - while rendering, heartbeat at least that often. The lease is 600 s, and any call counts as "seen";
  - after 60 s with no call, the web reads `waiting`.
- **Rendering:** render exactly with the claim's `voice` and `profile`, because both are inside the key. An engine
  that cannot match them calls `fail`. Render the `segments` in order.
- **`segment_seconds`:** send one duration per segment, in order. These are follow along's timings (F12; B2 and W1).
- **Answers that tell the runner to stop or move on:**
  - `409` on heartbeat: the lease is lost, so drop the job;
  - `409` "already stored" on upload: call `finish` with your seconds, and the stored file stands;
  - `409` "no live lease" on upload: drop the job;
  - `404` on heartbeat or finish: the job is gone (its unit was replaced), so drop it.

### The store (for B2)

- **Where the files are:**
  - the path is `<content root>/.audio/<part key>.<ext>`;
  - the content root is `documents_api._content_root({"tenant_id": <unit tenant>})`;
  - the helpers are `listen.audio_path(root, file)`, `listen.find_part_file(root, key)` and
    `listen.MEDIA_TYPE_BY_EXT`.
- **What the database holds:**
  - `listen_parts` holds a unit's parts in `idx` order, with `file`, `seconds`, `segment_seconds` and `segments`
    (`{text, section, block, kind}`);
  - the playable prefix is the leading run of parts with `made_at` set.
- **How files get there:** written once, with a temp file then `os.replace`, behind `listen._STORE_LOCK`;
  `.audio/.gitignore` is `*`.
- **`WRITE_LOCK` is not taken.** It serializes the document write path (file, index, database, git), and `.audio/` is
  in none of those (gitignored, never staged, not indexed). A 4 MB upload would otherwise wait behind a git push of up
  to 60 s. The module's own lock makes the existence check and the publish one atomic step, under the single-worker
  invariant.

### Settings (`server/config.py`, environment overrides)

| Setting | Default | What it sets |
|---|---|---|
| `KB_LISTEN_VOICE` | `ming3-us_emma` | the voice (inside every key) |
| `KB_LISTEN_PROFILE` | `ming3-0.5b/aac-lc-48k-mono` | the engine and encoder (inside every key); B2 may change it with its packaging |
| `KB_LISTEN_PART_CAP_S` | 600 | a part's estimated speech cap |
| `KB_LISTEN_CPS_EN` / `KB_LISTEN_CPS_KO` | 13.4 / 7.5 | characters per second (R1); other languages use the English rate |
| `KB_LISTEN_LEASE_S` | 600 | the lease, and each heartbeat's extension |
| `KB_LISTEN_MAX_ATTEMPTS` | 3 | claims before a failure is final |
| `KB_LISTEN_MAX_PART_BYTES` | 4 MiB | the upload cap |
| `KB_LISTEN_POLL_S` | 30 | the runner's poll; `waiting` after 2× |
| `KB_LISTEN_RTF` | 0.45 | the real-time factor behind `left_seconds` (Ming measured 0.42, R5) |

### Tables (`0007_listen`; columns beyond the plan's, justified)

- **`listen_units`** carries the plan's identity, state, counts, seconds, characters, failure and times.
  - `uq_listen_units_identity` is on `(tenant, project, doc, version, lang, voice, profile)`, so a concurrent start
    cannot make two units.
  - `total_seconds` is the estimate while making: real seconds for made parts, estimates for the rest. Once made it is
    the real sum.
  - Extra: `failure_kind`, so F10 can tell voice from unreadable.
  - Extra: `failure_part`, where a voice failure stopped ("at part 4 of 12").
- **`listen_parts`** has the primary key `(unit_id, idx)`.
  - Extra: `tenant_id`, with the index `ix_listen_parts_key (tenant_id, part_key)`. It finds a key made under any unit
    or version, the reuse that keeps an unchanged part off the queue.
  - Extra: `segments` (JSONB `{text, section, block, kind}`). The claim carries the text, so the Mac never reads a
    document. The block ids let follow along map time to a block.
  - Extra: `segment_seconds` (JSONB, from finish), follow along's timings. It saves a later migration.
- **`listen_jobs`:**
  - Extra: `tenant_id`, the claim's scope.
  - Extra: `file`, `bytes` and `seconds`, the upload's result carried to finish.
  - `uq_listen_jobs_live_key`, a partial unique index on `(tenant_id, part_key)` where the state is queued or leased,
    is the no-duplicates invariant.
  - `ix_listen_jobs_claim`, partial, on `(tenant_id, priority, created_at)`, serves the claim's order.
  - `ix_listen_jobs_unit` serves the cascade from units.
  - `priority` is a `BIGINT`: `-(epoch ms) × 100000 + ordinal in reading order`.
  - `leased_by` has no foreign key. It is an audit value, and credentials are only ever soft-revoked.
- **`listen_runners`** has the primary key `(tenant_id, credential_id)` and `last_seen`. `credential_id` cascades from
  `project_credentials`.
- **`listen_positions`** has the plan's key as `(user_id, tenant_id, kind, project, item, from_chapter)`.
  - `item` is the document stem or the book slug. `from_chapter` is `''` for a document.
  - Extra: `lang`, the Listen's language, since the pinned key has none.
  - `ix_listen_positions_user_updated` serves the preference lookup.
  - **The preference choice:** `speed` and `follow` ride on every row, and the user's newest row is the preference.
    There is no separate row.

## Deviations

1. **`org` in the Listen key.** The plan's body named `{project, doc | book + from_chapter, lang}`. The gate needs the
   org (slug or tenant id) to resolve the owner tenant, the same as every `/app/reader` route.
2. **`?ext=mp4`.** The plan allowed three extensions from two media types. `audio/mp4` stores `.m4a` by default, and
   `.mp4` when asked, so B2 can pick fMP4 without a server change.
3. **`seconds` in two places.** `X-Audio-Seconds` on the upload is optional. Finish's `seconds` is optional when the
   upload carried it; finish's value wins.
4. **`segment_seconds` on finish** (optional). Follow along (F12) is taken, and per-segment offsets are what it needs
   (`topics/phone-playback.md` §6).
5. **Every claim is an attempt** (the plan: `attempts + 1` on claim). An expired lease that has used up its attempts
   is failed by the next claim, with "the runner stopped renewing its lease", instead of being handed out. Without
   this, a runner that crashes without calling `fail` would loop forever.
6. **Non-members see less.** `runner_last_seen` and the failure `message` go only to members of the owning tenant.
   Anyone reading a public project still gets `waiting` and `failure.kind`.
7. **Stale units are replaced.** Start and update re-verify the current unit's part keys against the document's
   manifest. If they differ, the unit is replaced, and its made parts survive by key. This happens after an S1 rule
   change, or after a document is deleted and re-created at the same version.
8. **"Nothing to read aloud"** means nothing beyond the title. `spoken_script` always emits the title, so a native
   document holding only code would otherwise read as a one-segment unit.
9. **Start attaches to an earlier version.** When an earlier version's audio is made, start plays it (F10 "Earlier
   version"), and only update makes the current one. This reads "creates or attaches" together with F10 and F17.
10. **A claim retires a job whose key was made meanwhile.** This covers a race between unit creation and a finish.
11. **The failure position is stored.** `failure_part` is on the unit, rather than inferred from the first unmade
    part. The probe showed the inference was wrong whenever an earlier part was still in progress.

## Probes beyond the tests (scratch scripts, not committed)

Run against the same throwaway database through `TestClient`.

- **A legacy (`md`) document:** `unavailable`, with `reason: "legacy"`.
- **A document made in full, then edited to v2:**
  - state reads `old: true`, and start attaches with no new jobs (the claim answers 204);
  - update makes v2, with 3 of 4 parts made at once (reused by key) and 1 job;
  - after that job, state is v2, made, `old: false`.
- **Positions:**
  - `kept`, `speed: 1.5` and `follow: false` round-trip, and start clears `kept`;
  - a later PUT without `speed` keeps 1.5;
  - a document position with a `chapter` → 422.
- **A book from chapter two:**
  - entries run two, three, then four (`unavailable`, legacy);
  - after starting it from one and then from two again, the claims came in the order two, three, one;
  - the chapters shared 3 of 4 parts with the earlier document, so 6 of 8 parts were made at once;
  - in Korean, the chapters without a `ko` variant are `missing`;
  - a book position outside the Listen → 422; `resume` crosses start chapters.
- **A stranger on a public project:**
  - can start; `runner_last_seen` is null;
  - gets 404 on a private document of the same org, and 401 without a session.
- **Concurrency:** 12 simultaneous `claim()` calls on fresh engines returned 12 distinct jobs.
- **An expired lease with its attempts used up:** the job is failed by the next claim, and the unit is
  `failed`/`voice` at its part.
- **Finish and upload answers:**
  - finish before an upload → 409; another credential → 409; no seconds → 422; a wrong `segment_seconds` count → 422;
  - finish twice → 200 and 200, keeping the first seconds;
  - an unknown job → 404; another tenant's → 404; a session on the runner API → 403;
  - uploads: 415, 422 (sha), 413 (cap) and `?ext=mp4` all answered as specified.
- **A job inserted for an already-made key:** the claim retired it (`done`) and answered 204.
- **The same version with changed text:** the unit was replaced, and the finished part survived by key.
- **Unreadable sources:** an unparseable one and a code-only one each give `failed`/`unreadable`, with no jobs.
- **No `DATABASE_URL`:** all seven method and path pairs answer 404.
- **gitops:** `add` and `remove` drop `docs/.audio/…` paths, and `.audio` is not a footprint directory. No deploy
  script runs `git clean`, so `.audio/` survives a deploy, as `.assets/` does.

## Open edges (deferred-job candidates, for the orchestrator to file)

- **Delete and GC.** A document delete does not purge its `listen_*` rows or its `.audio` files. The rows are
  unreachable behind the gate, and the files wait for a GC (`topics/phone-playback.md` §6: delete parts no manifest
  references after N days). Trigger: the first audio GC, or a privacy pass over document deletes.
- **Greedy grouping.** An edit that pushes a part across the cap re-groups that document's later parts, and only those
  re-render. Anchoring part boundaries on section ids would stop that. Trigger: an edit re-renders more than its
  section.
- **Replacing a stale unit cascades.** It deletes that unit's jobs. Another unit sharing one of those keys gets a new
  job on its next start or update, and until then shows `making`.
- **Outdated jobs keep their place.** Jobs of an outdated unit, from a document edited before its unit was made, keep
  their old priority; newer Listens still come first.
- **Readers of a public project can queue work** on the owner's runner. It costs only Mac time.

Housekeeping: the probes' temporary content roots (`p41b1-*` and `p41b1b-*` under the system temp directory) were
left, because the permission system refused the `rm`. They are outside the repo and hold only probe data.
