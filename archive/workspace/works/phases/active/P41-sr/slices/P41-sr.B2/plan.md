# P41-sr.B2 — Audio delivery: playlists and Range from FastAPI through the BFF and the edge

## Goal

Make B1's made parts playable in a browser, as **one continuous HLS source per Listen**:
- served with HTTP Range from FastAPI;
- relayed through the Next BFF, which holds the session cookie;
- routed by the edge.

Also:
- **pin the packaging** B3 encodes to;
- give W1 a typed client for B1's reader routes, with one **time axis** for chapter seeks and follow along.

Not this slice:
- the player UI (W1 and W2);
- the runner (B3);
- the deploy (X1).

Read first:
- The breakdown block: `phase-section P41-sr "P41-sr.B2 — Audio delivery: playlists and Range from FastAPI through the BFF
  and the edge" --topic breakdown`.
- `topics/phone-playback.md`:
  - §0, §3 and §4: why HLS, and the format;
  - §5: the change list, item by item;
  - §11: what R3 ran locally, including a working fMP4 byte-range packaging.
- `slices/P41-sr.B1/result.md` § Contract: § The Listen key, § State, § Runner routes, § Runner rules, § The store.
  Build on it; change it only where stated below, and list every change in your own § Contract.
- `phase-section P41-sr Decisions` and `Notes for later slices`.

## Pinned

- **Routing.** One path family per side, with no overlap with B1's runner routes (`/api/listen/jobs/…` and
  `/api/listen/parts/…` stay on FastAPI):
  - **FastAPI, session bearer:** `/app/listen/play/…`. It holds the playlist, the parts and the timeline. GET and
    HEAD only.
  - **The BFF, Next route handlers:**
    - `/api/listen/play/[...path]`: a GET and HEAD relay to `/app/listen/play/<path>?<query>`. It unseals
      `knowledge_session` and forwards the bearer, on the image relay's pattern
      (`web/src/app/api/documents/[id]/assets/[file]/route.ts`).
    - `/api/listen/position`: POST, the pagehide beacon on `/api/reader/position`'s pattern
      (`web/src/app/api/reader/position/route.ts`), forwarding to B1's `PUT /app/listen/position`. W1 calls it.
  - **The relay is not an open proxy:**
    - it forwards only under that prefix;
    - it rejects `..`, encoded slashes and empty segments;
    - it passes only the query string it was given.
  - **nginx** (`deploy/knowledge.conf`): one regex location sending `^/api/listen/(play/|position$)` to
    `knowledge-web:3000`, with `proxy_buffering off`, and **no per-location `proxy_set_header`** (the file's documented
    footgun, `:139-144`).
    - Mirror the comment style of the neighbouring regex locations.
    - Do **not** add a location for `/api/reader/position`: that is outside this phase, and the orchestrator files it.
- **Relative URLs.** The playlist names its parts and its init byte ranges by URLs relative to itself, so every
  media request goes back through the same BFF prefix.
- **Visibility.** A part is served only through a unit the caller may read:
  - resolve the unit's document with `_resolve_readable_doc`, or B1's equivalent gate;
  - every miss is the one constant 404;
  - never serve a file by part key alone, because content-addressed keys are shared across a tenant's documents.
- **Range.** Parts are served with `starlette.responses.FileResponse` as `audio/mp4`, with:
  - Range, `206` with `Content-Range`, and `416`;
  - HEAD and `Accept-Ranges`;
  - `nosniff`;
  - `Cache-Control: private` with a long `max-age`, since a unit's part at an index never changes.
- **The playlist.** `application/vnd.apple.mpegurl`, `Cache-Control: no-store`:
  - `#EXT-X-PLAYLIST-TYPE:EVENT` while any entry is still being made;
  - `#EXT-X-ENDLIST` once every playable entry is made;
  - `#EXT-X-START:TIME-OFFSET=0` (R3 §3);
  - `#EXT-X-DISCONTINUITY` between parts, each part with its own `EXT-X-MAP`;
  - it lists only the **playable prefix**, in the reading order of B1's state: the leading made parts of each entry, and
    across a book's entries in order, stopping at the first part not made.
- **One Listen, one source.** A book from a chapter is one playlist across its chapters. Chapters are seeks.
- **An EVENT playlist only grows.** A playlist URL's content may only gain segments until `ENDLIST`.
  - When the units that play change (Update audio lands, or a unit is replaced), the state hands out a **new
    playlist URL**.
  - The old URL keeps serving what it served (old part files stay on disk; there is no GC yet, D106-wd), or answers
    with the constant 404 once its units are gone.
  - Pin the identity in the URL, for example a short hash of the playing unit ids. Your mechanism, stated.
- **The time axis is single-sourced.**
  - **The timeline:** `GET /app/listen/play/timeline?<Listen key or playlist id>` returns, from the **same durations
    the playlist's `EXTINF` lines carry**:
    - each entry's chapter, start and length;
    - each part's start;
    - each spoken segment's `{block, start, dur}`, from B1's `segment_seconds`, cumulated within its part and fitted to
      the part's real duration.
  - **The state** gains the playlist URL (and the timeline's), so W1 never builds them. Shape both for W1, and put them
    in your § Contract.
- **The web client layer.** `web/src/lib/knowledge/listen.ts` (new) holds:
  - the TypeScript types of B1's State, Entry and Position, and of your timeline;
  - typed calls for B1's `start`, `state`, `position` and `update`, on the pattern of `web/src/lib/knowledge/reader.ts`.

  `getRaw` (`client.ts:100-112`) is extended to forward chosen request headers (`Range` and `If-Range`), and to return
  `206` and `416` without throwing. Keep every existing caller's behaviour.

## Yours to decide (the high trigger), with evidence

**The packaging of a part.** R3 §11 ran fMP4 parts made with `-f hls -hls_segment_type fmp4 -hls_flags single_file`,
joined with discontinuities, end to end. Decide and record:

- **The container and its fragmenting:** a fragmented MP4 per part, as one file with byte-ranged fragments, or
  another shape you can justify.
- **Fragment length.** It drives how often an EVENT playlist is reloaded:
  - a client reloads an unchanged live playlist on the scale of the target duration;
  - so one fragment per 10-minute part would make "next chapter still preparing" resume minutes late;
  - a few seconds per fragment keeps it prompt.
- **How the box learns each fragment's byte range and duration.** The box has **no ffmpeg** (`Dockerfile:18-20`).
  - Prefer the server deriving them from the stored bytes in pure Python, at upload or on first use: top-level box
    scan, `tfdt` and `mdhd`/`trex`/`trun` as needed. Never trust byte ranges a client declares.
  - Store the index where you judge best: a column, or a sidecar beside the file.
  - `0007_listen` has run only on throwaway databases (no persistent database here has applied it), so you may amend
    it in place rather than add `0008`. If you do, keep `downgrade` and the ORM diff clean.
- **Upload validation.** B1's upload rejects bytes that are not the pinned packaging, with a 422 and a reason, so a
  wrong encoder fails at once instead of at playback.
- **The encoder settings for B3:**
  - AAC-LC, mono, 48 kbps, at the engine's native rate. Ming-3.0's rate is in `topics/voice-models.md`;
  - the exact ffmpeg command line, and the priming and edit-list handling.

  Verify it with **this Mac's ffmpeg**.

## Tests (tiny, core only; Postgres tests skip without `KB_TEST_DATABASE_URL`, as in B1)

At most three pytest functions in `tests/test_listen_play.py`, and one Vitest file:
1. **Range:** `bytes=0-99` gives `206` with `Content-Range`. Past the end gives `416`.
2. **The playlist:** `EVENT` with a discontinuity between two made parts, stopping before an unmade one. Adding the
   last part gives `ENDLIST`, and the earlier lines are unchanged.
3. **The fragment index from bytes:** use a **tiny synthetic fixture** (a short sine or silence, encoded in the pinned
   packaging, a few KB) under `tests/fixtures/listen/`. Never use a voice sample or excerpt text.
4. **Vitest, `web/tests/listen-relay.test.ts`:** the relay forwards `Range`, passes `206` and its range headers
   through, streams the body, and refuses a path outside its prefix.

## Verification beyond the tests

- **End to end through FastAPI.**
  1. On a throwaway Postgres (as B1: a unique container name, removed at the end; never touch the other containers),
     make 2–3 short synthetic parts with this Mac's ffmpeg in the pinned packaging.
  2. Run them through B1's runner API: claim, upload, finish.
  3. Fetch the playlist with a session bearer, and decode it to the end with `ffmpeg -i <playlist URL> -f null -`,
     sending the Authorization header.
  4. Confirm the decoded duration is close to the sum of the parts, and that the discontinuities decode.
- **Through the BFF, if practical.** Run `next dev`, or `next start` after a build if you check `Content-Encoding`.
  - Try a real session cookie for a local test user. If minting one is impractical, say so; the Vitest relay test and
    W1's browser run cover the chain.
  - Confirm an audio response carries **no `Content-Encoding`**.
- **The edge:** check `deploy/knowledge.conf`'s syntax if you can do so without the production upstreams. Otherwise
  read the new location carefully against its neighbours, and say which you did.

## Set

- `server/listen*.py` (a new delivery module, and B1's modules where the state, upload or store change);
- `server/main.py` only if a router is added;
- `server/persistence/models.py` and `alembic/versions/0007_listen.py` only if the index needs a column;
- `tests/test_listen_play.py`, `tests/fixtures/listen/*`;
- the `plugin/templates/kb/` copies of every changed server or test file, and `plugin/templates/manifest.json`;
- web:
  - `web/src/app/api/listen/**`;
  - `web/src/lib/knowledge/listen.ts` (new), `web/src/lib/knowledge/client.ts`;
  - `web/tests/listen-relay.test.ts`;
- `deploy/knowledge.conf`.

Nothing else. In particular, not `reader-frame.tsx`, the layout or any component; those are W1's.

## Validation

- `uv run pytest -q tests/test_listen.py tests/test_listen_play.py`, with and without the test DSN.
- `uv run pytest -q`: the full suite with the test DSN, if quick.
- `uv run python scripts/plugin_parity.py`: exit 0.
- If `0007` is amended: `alembic upgrade head`, `downgrade -1`, `upgrade head`, plus the ORM `compare_metadata`
  diff, all clean.
- Web:
  - `cd web && pnpm vitest run tests/listen-relay.test.ts`;
  - `pnpm lint` and `pnpm tsc --noEmit` (or the repo's typecheck script) on the changed files, if they run in a
    reasonable time.
- `git status --porcelain --untracked-files=all`: only this slice's set. `UPDATE_REQUIRED.md` is the workspace
  updater's notice, not yours.
- Remove the throwaway container and its own volume. Leave no temp files inside the repo.

## Return

- Write `result.md` with the verdict block first, then:
  - **§ Contract:** what W1 and B3 build from:
    - the play paths;
    - the playlist identity and its growth rule;
    - the timeline shape;
    - the state's new fields;
    - the BFF paths;
    - `listen.ts`'s exported names.
  - **§ Packaging:** the pin, with B3's exact ffmpeg command, the upload validation, and the evidence (what decoded,
    with durations).
- The `notebook` field holds:
  - **Decisions:** one gist, `Packaging (B2): … → slices/P41-sr.B2/result.md § Packaging`;
  - **Notes for later slices:**
    - `(for B3)`: the pin;
    - `(for W1, W2)`: the play paths, the timeline and `listen.ts`;
  - **Doc impact:** `api.md`, `operations.md` and `security.md`, one line each;
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
