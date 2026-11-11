# P41-sr.B2 — result

## Verdict

- **status:** done
- **route:** high
- **model:** opus
- **effort:** xhigh
- **summary:** Pinned the part packaging. Each part is one fragmented MP4 with fragments of about 6 s: AAC-LC, mono,
  48 kbps CBR, made with ffmpeg `aac_at` at the engine's own rate, with no edit list. The server indexes those bytes
  in pure Python and refuses anything else at upload with a 422 and a reason. A Listen now plays as one HLS `EVENT`
  playlist that only grows. Its parts are served with Range under `/app/listen/play/…`, and its timeline is built from
  the same integer microseconds as the `EXTINF` lines. The state gains `play`; the Next BFF relays the family at
  `/api/listen/play/…` and adds the `/api/listen/position` beacon; the edge routes both to web. W1 gets the typed
  client `listen.ts`.
- **files_changed:**
  - new: `server/listen_mp4.py`, `server/listen_play.py`, `tests/test_listen_play.py`,
    `tests/fixtures/listen/part.m4a`, `web/src/app/api/listen/play/[...path]/route.ts`,
    `web/src/app/api/listen/position/route.ts`, `web/src/lib/knowledge/listen.ts`, `web/tests/listen-relay.test.ts`;
  - edited: `server/listen.py`, `server/listen_api.py`, `server/listen_jobs.py`, `server/main.py`,
    `tests/test_listen.py`, `web/src/lib/knowledge/client.ts`, `deploy/knowledge.conf`,
    `plugin/templates/manifest.json`;
  - mirrored byte-identical: the `plugin/templates/kb/` copies of the nine `server/` and `tests/` files above.
  - this `result.md`.
- **validation** (on the throwaway `postgres:17` container `p41-b2-pg-7k3`, at 127.0.0.1:55442; the container and
  its volume were removed at the end):
  - `uv run pytest -q tests/test_listen.py tests/test_listen_play.py`: 6 passed with `KB_TEST_DATABASE_URL`; 2 passed
    and 4 skipped without it. **PASS.**
  - `uv run pytest -q` (the full suite): 250 passed with a DSN; 186 passed and 64 skipped without one. B1 had 247, and
    185 + 62. **PASS.**
  - `uv run python scripts/plugin_parity.py`: PASS, exit 0.
  - `0007` was not amended, so its migration checks did not apply. On a fresh scratch database,
    `alembic upgrade head` ran through `0007_listen`. `test_reader_state`'s migration walk, part of the full suite,
    passed.
  - `cd web && pnpm vitest run tests/listen-relay.test.ts`: 4 passed. With the three other `getRaw` callers' suites
    (`asset-route`, `raw-route`, `version-raw-route`): 18 passed. **PASS.**
  - `pnpm eslint` on the five changed web files: exit 0. `prettier --check`: clean.
  - `pnpm tsc --noEmit`: no error in a changed file. It reports two **existing** errors: `Cannot find module 'temml'`
    in `src/lib/native/mathml.ts` and in `tests/native-math.test.ts`.
    - The cause is the environment: `temml` is in `package.json` and the lockfile but not in this checkout's
      `node_modules`.
    - The same cause makes 7 other Vitest suites fail to load (`pnpm vitest run`: 292 tests pass, 7 files fail on
      import).
  - `nginx -t` on `deploy/knowledge.conf`: **syntax is ok**. It ran in a throwaway `nginx:1.27-alpine` container
    (`--rm`, the image already local), with a scratch self-signed certificate at the conf's certificate paths and no
    upstreams.
  - `python3 scripts/workflow.py validate`: "Workflow validation passed". Its only warnings were already there:
    consolidation owed, stale docs, oversized doc sections, and P26.S5's kind.
  - `git status --porcelain --untracked-files=all`: only this slice's set. Already dirty before this slice and left
    alone: `UPDATE_REQUIRED.md`, `works/backlog.md`, `works/events.jsonl`, `phase.md`, `slice.json`, `plan.md`.
- **deviations:** 9, listed in § Deviations. The one outside the plan's set is the edit to `tests/test_listen.py`. The
  upload validation forces it, and the breakdown's set (`tests/test_listen*.py`) covers it.
- **doc_impact:** none written to `phase.md`; the orchestrator writes the notebook. The lines are under `notebook` →
  Doc impact. There are five: `api.md`, `operations.md` and `security.md` as the plan asked, plus `qa.md` (the suite
  counts) and `backend.md` (two new modules).
- **notebook:**
  - **Decisions:**
    - `Packaging (B2): one fragmented MP4 per part (ftyp + moov, then ~6 s moof/mdat fragments, no edit list), AAC-LC
      mono 48 kbps CBR from ffmpeg aac_at at the engine's rate (Ming-3.0: 44.1 kHz); TARGETDURATION 6; the server
      indexes the stored bytes (no stored index) and refuses any other shape with a 422 → slices/P41-sr.B2/result.md § Packaging`
    - `Play identity (B2): the playlist URL names the units that play (base64url of their ids, in reading order); a
      new URL when they change (Update audio lands, a unit is replaced), and the old URL keeps serving its own units
      until one is gone (then the constant 404) → slices/P41-sr.B2/result.md § Contract`
  - **Notes for later slices:**
    - `**(from P41-sr.B2, for P41-sr.B3)** Encode to the pin: the exact ffmpeg command (aac_at, CBR 48k, mono, native rate, fMP4 with ~6 s fragments) is in result.md § Packaging. PUT as audio/mp4 with no ext; any other shape is a 422. The server measures seconds from the bytes; send segment_seconds including any pause you insert. A 10-min part is ~3.7 MB; the 4 MiB cap holds ~11 min → slices/P41-sr.B2/result.md § Packaging`
    - `**(from P41-sr.B2, for P41-sr.W1, P41-sr.W2)** The state's play = {list, playlist, timeline}, as BFF paths via listen.ts. Load play.playlist once len is set (native HLS, else hls.js). A chapter seek is timeline.entries[i].start; follow along maps currentTime to segments[].block. Re-read the timeline while it is incomplete. A new play.list means the audio changed: never swap src at ended. Beacon: POST /api/listen/position → slices/P41-sr.B2/result.md § Contract`
    - `**(from P41-sr.B2, for P41-sr.REVIEW)** ffmpeg cannot prove playback across EXT-X-DISCONTINUITY: its HLS demuxer under-decodes fMP4 parts whose timestamps restart (B2's playlist and R3's alike). W1's browser run and the iPhone checks are the proof. The B2 evidence is a remux of every frame through the playlist (result.md § Packaging).`
  - **Doc impact:**
    - `- api.md: new session-only GET|HEAD /app/listen/play/{<list>.m3u8, <unit>/<n>.m4a, timeline?list=}; the Listen state gains play {list, playlist, timeline}; upload is audio/mp4 only (audio/aac now 415) and 422s any shape but the pinned fragmented MP4; a part's seconds are measured from its bytes (X-Audio-Seconds and finish's seconds no longer set them); the BFF adds GET|HEAD /api/listen/play/… and POST /api/listen/position (P41-sr.B2)`
    - `- operations.md: the edge sends ~ ^/api/listen/(play/|position$) to knowledge-web with proxy_buffering off (the runner's /api/listen/jobs|parts stay on FastAPI); the Mac runner encodes with ffmpeg aac_at (AAC-LC mono 48 kbps CBR, fragmented MP4, ~6 s fragments); a 10-min part is ~3.7 MB under the 4 MiB upload cap; KB_LISTEN_PROFILE's default names this packaging, so a packaging change must change it (P41-sr.B2)`
    - `- security.md: audio is served only through a unit whose document passes the readability gate (never by part key alone; one constant 404); the BFF play relay is session-only, path-allowlisted under /api/listen/play/, forwards only Range/If-Range and the given query, and never widens a cache scope to public; parts are private and immutable for a year; byte ranges come from the stored bytes, never from a client (P41-sr.B2)`
    - `- qa.md: tests/test_listen_play.py (3 tests, 2 Postgres-gated) and web/tests/listen-relay.test.ts (4 tests); the full Python suite is 250 passed with a DSN, 186 passed / 64 skipped without (P41-sr.B2)`
    - `- backend.md: server/listen_mp4.py (the pinned part packaging: a pure-Python fMP4 index and validator, memoized per file) and server/listen_play.py (the /app/listen/play router: playlist, parts by Range, timeline); listen.py gains the play identity codec (P41-sr.B2)`
  - **Now:**
    - `B2 landed: the packaging pin (fMP4, AAC-LC mono 48k, ~6 s fragments), the growing HLS playlist, Range parts, the timeline, the BFF relay and beacon, listen.ts and the edge location. Next: B3 (encodes to the pin), W1 and G1 together.`
  - **Operator Questions:** none.

## Contract

W1, W2 and B3 build from this section. B1's § Contract stands, except where § Changes to B1's contract below says
otherwise.

### Play paths (FastAPI)

The common rules:

- Session only: `Authorization: Bearer <session>`, through B1's `listen_user`.
- GET and HEAD only.
- No `DATABASE_URL`: 404 before auth. No or bad session: 401.
- Every miss is the one `404 {"detail": "not found"}`: an unknown or malformed id, a unit that is gone, an unreadable
  document, a part not made yet.

| Path | Answers |
|---|---|
| `/app/listen/play/<list>.m3u8` | The playlist, `application/vnd.apple.mpegurl`, `Cache-Control: no-store`, `nosniff`. |
| `/app/listen/play/<unit>/<n>.m4a` | Part `n` of a unit. `<unit>` is the unit's uuid as 32 lowercase hex; `n` is the part's 0-based `idx`. The response is the stored file, `audio/mp4`, through Starlette `FileResponse`. |
| `/app/listen/play/timeline?list=<list>` | The time axis as JSON, `no-store`, `nosniff`. A missing `list` gets a 422. |

What a part answers:

- **Range:** `206` with `Content-Range`. Past the end, `416` with `bytes */<size>`.
- **Plain GET:** `200`, with `Accept-Ranges: bytes`.
- **Every answer** carries `ETag` and `Last-Modified`, and honours `If-Range`.
- **Caching:** `Cache-Control: private, max-age=31536000, immutable`. A unit's part at an index never changes: a
  replaced unit gets a new id.

**Visibility.** The part route and the playlist both check the unit's `(tenant, project, doc)` against
`reader_state.Gate.doc`, which is `_resolve_readable_doc`'s rule. A file is never served by its part key alone.

### The playlist identity and its growth rule

**The id.** `<list>` is the base64url encoding, without padding, of the 16-byte ids of the units that play, one per
listenable entry in reading order.

- That unit is `_pick`'s choice: the playing unit, which may be an earlier version's.
- An entry with no unit yet is 16 zero bytes.
- `unavailable` entries are left out.
- The id holds at most 256 units; the state truncates past that.
- Only the canonical spelling is accepted, so one list of units has one URL.
- `server/listen.py` has the codec: `play_token`, `play_units`, `play_links`.

**The playlist** lists the playable prefix. B1's state `len` uses the same rule.

- For each unit in order, it lists the unit's leading made parts.
- It goes on to the next unit only when this one is complete: it has parts, all of them made and indexed.
- It stops at:
  - the first part not made;
  - a unit that is still being made, or failed;
  - an unreadable unit, which has no parts;
  - an entry with no unit yet.

**Its lines.** The header lines are constant, and every playlist URL keeps them for life:

```
#EXTM3U
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:EVENT
#EXT-X-INDEPENDENT-SEGMENTS
#EXT-X-START:TIME-OFFSET=0
```

Then, for each listed part:

1. `#EXT-X-DISCONTINUITY`, except before the first part.
2. `#EXT-X-MAP:URI="<unit>/<n>.m4a",BYTERANGE="<init>@0"`.
3. For each fragment, three lines:
   - `#EXTINF:<seconds, 6 decimals>,`
   - `#EXT-X-BYTERANGE:<size>@<offset>`
   - `<unit>/<n>.m4a`

`#EXT-X-ENDLIST` comes last, once every named unit is complete. The URIs are relative to the playlist, so every media
request returns through the same prefix: the BFF's, through the browser.

**Growth.** Under one URL, lines are only ever appended. When the units that play change, the state hands out a new
`list`. That happens when:

- Update audio lands, and `_pick` moves to the current version;
- a unit is replaced, and gets a new id;
- a document gets its first unit;
- a chapter becomes listenable.

The old URL keeps serving its own units, and keeps growing until its own `ENDLIST`. Once one of its units is gone or
unreadable, it answers the constant 404.

The scratch run showed this end to end:

1. v1 was made, and v2 was updated.
2. While v2 was being made, the state kept v1's URL.
3. When v2 was made, the state handed out a new URL.
4. v1's URL went on serving its playlist byte-identically.
5. Only the one changed part got a job.

### The timeline

```
{
  "list": "<list>",
  "len": seconds,          // the sum of every listed EXTINF (6 decimals: whole microseconds)
  "complete": bool,        // the playlist carries EXT-X-ENDLIST
  "entries": [{            // the named units in order, up to the first one not complete
    "unit": uuid, "doc": stem, "chapter": key|null, "title": str, "lang": str, "version": int,
    "start": s, "len": s,  // on the playlist's axis; len counts the listed parts only
    "complete": bool,
    "parts":    [{"n": idx, "start": s, "len": s, "timed": bool}],
    "segments": [{"block": id|null, "start": s, "dur": s}]   // spoken segments of the listed parts
  }]
}
```

- **One source:** every `start` and `len` is computed from the very integer microseconds the playlist prints.
- **Segments:** within a part, the runner's `segment_seconds` are scaled to the part's measured length, so the
  segments tile the part exactly. When `segment_seconds` is missing or does not match the segments, each segment's
  characters are the weights instead, and the part reads `timed: false`.
- **`chapter`** is the document's book binding (`DocRef.chapter_key`). It is set even on a document Listen.

### The state's new field

```
"play": {"list": "<list>",
         "playlist": "/app/listen/play/<list>.m3u8",
         "timeline": "/app/listen/play/timeline?list=<list>"} | null
```

- `play` is `null` until some listenable document has a unit, that is, before the first start.
- Before part 1 is made, the playlist is valid but has no segments. W1 attaches it once `len` is set.

### BFF paths (Next route handlers)

- **`GET|HEAD /api/listen/play/<path>?<query>`** relays to `/app/listen/play/<path>?<query>`.
  - **Auth:** session only. It unseals `knowledge_session` and forwards the bearer; without a session it answers 401
    and calls nothing.
  - **Paths:** it reads the raw request path. Only one or two segments are relayed, each matching
    `^[A-Za-z0-9_-]+(\.[A-Za-z0-9]+)?$`. Anything else is a 404 before any call: `..`, `.`, an empty segment,
    `%2F`, three segments, or a path outside the prefix.
  - **Query:** passed through as given.
  - **Forwarded headers:** `Range` and `If-Range`.
  - **Status:** 200, 206 and 416 pass through. knowledge's 401 and 404 keep their status. Anything else is a 502.
  - **Response headers:**
    - passed through: `Content-Range`, `Content-Length`, `Accept-Ranges`, `ETag` and `Last-Modified`;
    - `Content-Type` only if it is `audio/mp4`, `application/vnd.apple.mpegurl` or `application/json`, else a 502;
    - always set: `nosniff` and `default-src 'none'; sandbox`;
    - `Cache-Control` passes, but a `public` scope becomes `no-store`.
  - **Body:** `upstream.body` is streamed. HEAD has no body.
- **`POST /api/listen/position`** is the pagehide beacon, on `/api/reader/position`'s pattern.
  - It checks same-origin (403), JSON or `text/plain` (415), a session (401) and a 4 KB cap (413).
  - It parses the body (400) and validates it strictly with zod against B1's `PositionIn` (422).
  - It forwards to `PUT /app/listen/position`. knowledge's 401, 404 and 422 pass through; anything else is a 502.
  - It answers `{ok}`.
- **The edge:** `location ~ ^/api/listen/(play/|position$)` sends both to `knowledge-web:3000`, with
  `proxy_buffering off` and no per-location `proxy_set_header`. The runner's `/api/listen/jobs/…` and
  `/api/listen/parts/…` stay on `location /api/`, which is FastAPI.

### `web/src/lib/knowledge/listen.ts` (new, `server-only`)

- **Types:**
  - `KbListenKey`, `KbListenStateName`, `KbListenFailure`, `KbListenUnitView`, `KbListenEntry`;
  - `KbListenPosition`, `KbListenPositionWrite`;
  - `KbListenPlay`, `KbListenState`;
  - `KbListenTimeline`, `KbListenTimelineEntry`, `KbListenTimelinePart`, `KbListenTimelineSegment`.
- **Constant:** `LISTEN_PLAY_BFF` (`"/api/listen/play/"`).
- **Functions:**
  - `bffPlay(play)`: maps knowledge's play paths to the BFF's, keeping the tail.
  - `startListen(token, key)`, `updateListen(token, key)` and `getListenState(token, key)`: each returns the state with
    `play` already in BFF paths.
  - `putListenPosition(token, body)`.
  - `getListenPlay(token, path, search, {method, headers, signal})`: the relay's raw call, with `pass: [416]`.

`client.ts`: `getRaw(path, options: KbRawOptions)`, where the new exported `KbRawOptions` adds three opt-ins:

- `method: "GET" | "HEAD"`;
- `headers`, forwarded, with the bearer always winning;
- `pass`, the non-2xx statuses returned instead of thrown.

Defaults are unchanged: GET, the bearer only, and a throw on any non-2xx. The three earlier callers' suites pass.

### Changes to B1's contract

1. **Upload.**
   - `Content-Type: audio/aac` is now a `415`: parts are `audio/mp4` only, stored as `.m4a`, or `.mp4` with
     `?ext=mp4`.
   - Once the sha matches, bytes that are not the pin get `422 {"detail": "not the pinned packaging: <reason>"}`.
   - The job's `seconds` are now measured from the bytes. `X-Audio-Seconds` is still validated when it is sent, but
     its value is no longer used.
2. **Finish.** A part's `seconds` are measured from the stored file: the sum of the playlist's `EXTINF`.
   - The body's `seconds` stands in only for a file that does not index, which cannot happen for a part stored since
     B2.
   - So B1's 422 "no seconds" no longer occurs for a stored part.
   - The state's `len` and the timeline's `len` now agree, to within the state's 3-decimal rounding.
3. **State.** It gains `play`, described above.
4. **`server/listen_jobs.py`** gains three reads: `units_by_ids`, `play_parts` and `unit_part`.
5. **`tests/test_listen.py`.** The upload test now uploads the synthetic fixture, since fake bytes would get a 422.
   It also expects the measured `len` (7.023) instead of the declared 3.5, and uses a fixture with a trailing `free`
   box as its "other bytes".

## Packaging

### The pin

**The container.** Each part is **one fragmented MP4 file** (ISO BMFF, brand `iso5`):

- `ftyp`;
- one `moov`, holding:
  - one `soun` track whose sample entry is `mp4a`;
  - empty sample tables;
  - `mvex`/`trex`;
  - no edit list.
- then a `moof` + `mdat` pair per fragment;
- no `sidx` and no trailing `mfra`.

The `tfhd` carries default-base-is-moof, so every fragment's data offsets are relative to its own `moof`. That makes
each byte range self-contained.

The playlist names the one file for every fragment by byte range, and names the init section (`ftyp` + `moov`) by
`EXT-X-MAP`.

**Fragment length.** About 6 s: `-frag_duration 6000000` cuts at the first frame past 6 s.

- At 44.1 kHz that is 259 AAC frames, 6.013968 s.
- `EXT-X-TARGETDURATION` is a constant 6. A waiting client re-reads an unchanged playlist every 3 s (RFC 8216
  §6.3.4), so "the next chapter landed" starts within seconds.
- The upload refuses any fragment longer than 6.5 s, since its `EXTINF` would round past the target.
- A 10-minute part has 100 fragments.

**The codec.** AAC-LC, mono, 48 kbps CBR, from the AudioToolbox encoder (`aac_at`), at the engine's native rate:
Ming-3.0 renders 44.1 kHz (`topics/voice-models.md`), so there is no `-ar`.

- `aac_at` is used because Apple's encoder is the stronger AAC-LC encoder at low bit rates.
- CBR keeps a part's size predictable under the upload cap.

**Priming and edit lists.** There is **no edit list**, and the encoder's priming plays.

- Each encoded part is 50–66 ms longer than its input: the priming, plus rounding to whole frames. Measured: 13.3 s →
  13.352925 s, 7.9 s → 7.965895 s, 21.05 s → 21.108389 s, and 4.2 s → 4.250703 s.
- That is near-silence at the head of a part, and parts are cut at paragraph boundaries, which are pauses anyway.
- The upload refuses an edit list that skips media (a non-zero `media_time`). That way every player plays the same
  samples, and `EXTINF` (the sum of the samples' `trun` durations over the `mdhd` timescale) is the media's own
  duration.
- `ffmpeg`'s fragmented `mp4` muxer writes no `edts` with these flags. Its `hls` muxer writes a no-op `(0, 0)` edit,
  which is accepted.

**The profile string.** `KB_LISTEN_PROFILE`'s default (`ming3-0.5b/aac-lc-48k-mono`, inside every key) now names this
packaging. Any later change to the packaging or the encoder must change that string, so old and new parts never share
keys.

### B3's exact command

```
ffmpeg -hide_banner -nostdin -loglevel error -y -i part.wav -map 0:a:0 -ac 1 \
  -c:a aac_at -aac_at_mode cbr -b:a 48k -map_metadata -1 -fflags +bitexact \
  -f mp4 -movflags +empty_moov+default_base_moof+skip_trailer -frag_duration 6000000 part.m4a
```

- Upload it with `PUT /api/listen/parts/<key>`, `Content-Type: audio/mp4` and no `ext`. The server stores `.m4a`.
- `segment_seconds` on finish: one per segment, **including any pause the runner inserts after a segment**, so they
  sum to the part's audio. The server scales them to the measured length either way.
- **Size:** a 10-minute part is 3,716,046 bytes (measured), 88.6 % of `KB_LISTEN_MAX_PART_BYTES` (4 MiB). The cap
  holds about 11.3 min at 48 kbps, so a part whose real speech overruns B1's 10-minute estimate by more than about 13 %
  gets a 413.
- `aac_at` accepts only s16 or u8 input. ffmpeg converts a float WAV on its own.

### Upload validation (`server/listen_mp4.py`, before anything is stored)

The upload checks the pin and returns `422 "not the pinned packaging: <reason>"`. It requires:

- `ftyp` first, then `moov`;
- exactly one `soun` track, whose `mp4a` `esds` is MPEG-4 audio with an `AudioSpecificConfig` of AAC-LC (object type
  2), 1 channel, and a known rate;
- `mvex` with a `trex` for the track;
- no edit list that skips media;
- per fragment:
  - one `traf` for the track, with a `tfdt`;
  - no absolute `base_data_offset` and no empty-duration flag;
  - every `trun` with a data offset, its samples inside the fragment's own `mdat`, and its runs back to back;
  - a positive duration of at most 6.5 s;
- fragments that follow each other on the decode timeline, with no gap or overlap;
- after the last fragment, only `mfra`, `free` or `skip`;
- at most 4,000 fragments, and at most 4 h.

Any malformed field (an `IndexError` or a `struct.error`) is reported as a `PackagingError`. A fuzz of 20,000 mutated
fixtures raised nothing else; 2,591 indexed and 17,409 were refused.

Measured refusal reasons:

| Upload | Reason |
|---|---|
| A progressive `+faststart` file | `not a fragmented MP4 (no mvex)` |
| Stereo | `the audio is not mono (2 channels)` |
| 10 s fragments | `a fragment of 10.008 s is longer than 6.5 s` |
| ADTS `.aac`, or a WAV | `not an MP4: the file does not start with ftyp` |

**The index is not stored.** There is no column and no sidecar, and `0007` is untouched. Each part's index is derived
from its bytes on first use and memoized in the process: an `lru_cache` of 4,096 entries, keyed by path, size and
mtime. Stored parts are write-once, so the cache never goes stale.

- Evidence: indexing a 10-minute part takes 0.8 ms from bytes and 0.9 ms from the file, and 3 µs once memoized.
- After a restart, a 36-part book costs about 30 ms once.

### Evidence (what decoded, with durations)

The scratch FastAPI ran (uvicorn on 127.0.0.1:18766) over the throwaway Postgres (`alembic upgrade head`) and a scratch
`KB_ROOT`. B1's synthetic fixture document made four parts at `KB_LISTEN_PART_CAP_S=15`.

The four parts were synthetic sines in the pinned command: 330, 550, 770 and 990 Hz, encoded from 13.3, 7.9, 21.05 and
4.2 s. Each went through B1's runner API: claim, upload, then finish with `segment_seconds`. Finish recorded the
measured lengths: 13.352925, 7.965895, 21.108389 and 4.250703 s.

1. **Halfway**, after 2 of 4 parts:
   - The playlist was `EVENT` with 2 maps and 1 discontinuity, `application/vnd.apple.mpegurl`, `no-store`.
   - After the rest were made, the new text **started with the old text byte for byte** and ended in `ENDLIST`, with
     3 discontinuities. The URL in the state was unchanged.
2. **One axis:**
   - The sum of the `EXTINF` lines is 46.677912 s.
   - The timeline's `len` is 46.677912. Its parts start at 0, 13.352925, 21.31882 and 42.427209, and its last segment
     ends at exactly 46.677912.
   - The state's `len` is 46.678.
   - `ffprobe` on the playlist URL, sending the Authorization header, gave a duration of **46.677912**.
3. **Every byte range, through the playlist over HTTP** (`ffmpeg -headers "Authorization: Bearer …" -i <playlist URL>
   -c copy`):
   - **2014 frames**, equal to the four parts' own 2014 packets.
   - Decoded: **46.765 s**. That is 87 ms over the `EXTINF` sum, about 22 ms per part: each part's last AAC frame is
     trimmed in its `trun`, but decodes whole once remuxed to ADTS.
   - The tones switch at 13.35, 21.338 and 42.474 s, against the timeline's 13.353, 21.319 and 42.427: within 50 ms,
     and the gap is the next part's priming.
   - The origin log showed 28 part requests, every one a `206` byte range, and the playlists as `200`.
4. **The plan's `ffmpeg -i <playlist URL> -f null -`** reports `time=00:00:42.49` with no error, but it under-decodes.
   - `ffprobe -count_frames` reads 1312 of 2014 frames.
   - ffmpeg's HLS demuxer drops frames across fMP4 discontinuities whose timestamps restart at 0. It warns "Found
     duplicated MOOV Atom. Skipped it" and "timestamp discontinuity".
   - **R3's own playlist does the same**: 205 of its 487 frames, in `.cache/p41-playback/media/book.m3u8`. R3's
     "decoded end to end (20.68 s)" was the duration header.
   - Both of ffmpeg's packagings, `hls single_file` and fragmented `mp4`, and both encoders lose frames the same way.
     So this is ffmpeg's limitation, not the pin's.
   - Decoding through a discontinuity is proved by a real player: W1's browser run, and the REVIEW's iPhone checks
     (R3 §10).
5. **Range over HTTP** (`curl`, on a 83,734-byte part):

   | Request | Answer |
   |---|---|
   | HEAD | `200`, `content-length: 83734`, `accept-ranges: bytes`, `etag`, `last-modified`, `private, max-age=31536000, immutable`, `nosniff`, `audio/mp4` |
   | `bytes=0-99` | `206`, `content-range: bytes 0-99/83734`, `content-length: 100` |
   | `bytes=999999-` | `416`, `content-range: bytes */83734` |
   | The timeline | `no-store`, `nosniff` |

   Starlette's own 416 carries neither `nosniff` nor a cache header. Its body is empty, and the relay sets `nosniff`
   anyway.
6. **Through the BFF relay.** `next dev` and `next start` were not run: § Deviations 8 says why.
   - Instead, the **real relay handler**, with the real `getRaw` and real `fetch`, was run against the scratch FastAPI
     with a real sealed session cookie. This was a throwaway Vitest file, deleted after its one run.

   | Request | Answer |
   |---|---|
   | The playlist | `200`, `application/vnd.apple.mpegurl`, `no-store` |
   | `bytes=0-99` | `206`, `bytes 0-99/83734`, length 100, the bytes equal to the file's, **no `content-encoding`** |
   | `bytes=80000-` | `206`, `bytes 80000-83733/83734`, 3734 bytes |
   | Past the end | `416`, `bytes */83734` |
   | HEAD | `200`, length 83734, no body |
   | A mismatched `If-Range` | `200` with the whole file |
   | No cookie | `401` |

   **Content-Encoding under `next start`.** Next applies `compression()` with its default filter in both dev and
   production (`next/dist/server/lib/router-server.js:115-116`). That middleware, run in front of the relay's types,
   gave:
   - `audio/mp4` (a 206): **no `Content-Encoding`**, since mime-db marks it `compressible: false`;
   - the playlist: none;
   - the timeline's `application/json`: gzip, which is harmless because it carries no Range.
7. **The edge:** `nginx -t` passed (see validation). The new regex matches `/api/listen/play/…` and
   `/api/listen/position`. It does not match `/api/listen/positions`, `/api/listen/jobs/…`, `/api/listen/parts/…` or
   `/app/listen/play/…`. That was checked against these sample paths.

## Deviations

1. **`tests/test_listen.py` was edited.** It is outside the plan's listed set but inside the breakdown's
   `tests/test_listen*.py`.
   - B1's upload test sent fake bytes, which the upload validation the plan requires now refuses with a 422.
   - It now sends the synthetic fixture.
   - It expects the measured `len` instead of the declared one, and uses the fixture plus a trailing `free` box as the
     write-once "other bytes".
2. **No stored index.** The plan offered a column or a sidecar. Indexing is under a millisecond for a 10-minute part
   (see the evidence), so the index is derived from the immutable bytes on first use and memoized. The bytes stay the
   one record, and `0007`, the ORM and Alembic are untouched.
3. **Finish measures seconds from the bytes.** This is a B1 change the plan did not name. It makes the state's `len`
   agree with the playlist's axis, and it makes the measure apply to bytes that are already stored: the runner's
   "409 already stored, then finish with your seconds" path would otherwise record the seconds of a different render.
4. **`audio/aac` uploads are now a 415.** The pin is fragmented MP4, and an ADTS body could never pass validation, so
   refusing it by type is clearer than a 422.
5. **The timeline takes only `list=`.** The plan allowed the Listen key or the playlist id. The state hands out
   `play.timeline`, so W1 never builds it, and a timeline per `list` is single-sourced with its playlist by
   construction.
6. **The fixture's encoder.** `tests/fixtures/listen/part.m4a` (6,503 bytes) is half a second of sine and then 6.5 s
   of silence. It uses the pinned container flags with ffmpeg's native `aac` encoder, not `aac_at`: `aac_at` CBR pads
   silence to 48 kbps, giving 44,739 bytes for the same 7 s. The container shape, which is what the test pins, is the
   same, as the indexer shows.
7. **ffmpeg's `-f null` decode** is reported, but it is not the evidence for the discontinuities (see evidence 4). The
   evidence added is the full-frame remux through the playlist, with tone boundaries checked against the timeline.
8. **The BFF was checked without `next dev` or `next start`.** The operator's own `next dev` holds port 3030 and this
   checkout's `.next/`; it has run since 2026-10-21. A second dev server or a `next build` here would collide with it,
   and a copy of the app with its `node_modules` was out of proportion. Instead:
   - the real relay handler ran against the real FastAPI (evidence 6);
   - `Content-Encoding` was checked against Next's own compression middleware.
   W1's browser run covers the full chain.
9. **HLS details the plan left open:**
   - `EXT-X-VERSION:6`, the minimum for `EXT-X-MAP` outside an I-frame playlist;
   - `EXT-X-INDEPENDENT-SEGMENTS`;
   - `EXT-X-MEDIA-SEQUENCE:0`;
   - `EVENT` stays even after `ENDLIST`, so that no earlier line ever changes;
   - in the timeline, `chapter` is the document's book binding, even on a document Listen.

## Open edges (for the orchestrator)

- **The edge location for `/api/reader/position`**, which the plan says the orchestrator files. It is not added here.
- **`temml` is missing from this checkout's `web/node_modules`.**
  - The cause is the environment, not the code; `pnpm install` would restore it.
  - It makes `tsc` report 2 errors, and 7 Vitest suites fail to load: `display-text`, `library-model`, `native-cites`,
    `native-render`, `native-terms`, `reader-anchor` and `native-math`.
  - It predates this slice, which touches none of those files.
- **Playlist size for very long books.**
  - A 6-hour book is about 3,600 fragments: about 300 KB of playlist (about 86 bytes per fragment), re-read every
    3 s while a chapter is being made.
  - Next does not gzip `application/vnd.apple.mpegurl`; whether Cloudflare does is unverified.
  - If it matters on a phone, the remedy is letting the BFF gzip the playlist explicitly. It is not needed now.
  - A deferred-job candidate only if W1's device run shows a cost: "Listen: compress long playlists", triggered by
    measured playlist latency on the iPhone.
- **ffmpeg cannot prove the discontinuity decode.** The REVIEW should rely on the browser and iPhone checks. This is
  the note for REVIEW above.

## Throwaway work (not committed)

- **Scratch** (the session scratchpad, outside the repo): the synthetic sines and parts, the box dumper, the e2e
  drivers (`e2e.py`, `e2e2.py`), the compression probe, and the nginx check directory with its self-signed certificate.
- **Containers:**
  - `p41-b2-pg-7k3` (`postgres:17`, 127.0.0.1:55442) held the test databases `kb_test`, `kb_e2e` and `kb_mig`. It was
    removed with `docker rm -f -v`, and its anonymous volume is gone.
  - `p41-b2-nginx-7k3` ran with `--rm`.
  - No other container was touched.
- **The scratch uvicorn** on 127.0.0.1:18766 was stopped, and the port is checked closed.
- **The throwaway Vitest file** `web/tests/zz-p41b2-live.test.ts` was deleted after its one run.
