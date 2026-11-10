# P41-sr.R3 — phone playback with the screen off (research)

## Goal

This slice establishes how the knowledge web reader can play a document, or a whole book chapter after
chapter, **on the operator's iPhone with the screen locked**. It also finds what the current serving
chain must change to allow that. It is findings only: no product code. A throwaway test page under
`.cache/p41-playback/` is allowed.

Read these first:
- `intent.md`: *Confirmed Intent* and *Scope Added at Execution* A.
- The breakdown's `## P41-sr.R3` and *Build inventory*, via `phase-section … --topic breakdown`.
- `docs/current/operations.md` `## Operator Runtime`, through its section only: the devices are iPhone
  Safari and Chrome, iPad, and Mac Chrome; **the operator accepts on production**,
  `https://knowledge.hi2vi.com`.

## Questions to answer, each with sources (links and the date read)

1. **Background audio from a web page with the screen locked.**
   - **Platforms:** iOS Safari, iOS Chrome (WebKit), and a **home-screen web app**
     (`web/src/app/manifest.ts` declares `display: "standalone"`; check how standalone changes
     background audio), plus Android Chrome.
   - **Per platform, find:**
     - what keeps playing and what stops;
     - which iOS versions are affected and the known bugs;
     - whether the user's tap to start is needed.
2. **Media Session.**
   - lock-screen metadata (title, chapter, artwork);
   - the action handlers that work on iOS: play, pause, seek back and forward, previous and next track,
     seekto;
   - position state.
3. **Chapter to chapter while locked.** With one `<audio>` element, does changing `src` in `ended`, or
   advancing to the next item, keep playing on a locked iPhone?
   - Compare: one file per chapter; one file per book; per-segment files; HLS (native on iOS); and
     MSE / ManagedMediaSource.
   - Recommend the most reliable shape for a book of 130k–300k characters, about 2.5–6 h of speech.
4. **Formats and sizes.**
   - AAC/m4a versus MP3 versus Opus on iOS;
   - the bitrate for speech;
   - MB per hour, and per book.
5. **HTTP Range and the serving chain.** iOS media playback needs `206` Range responses. Check the
   current chain and name every change needed:
   - FastAPI's asset route reads the whole file into a `Response`
     (`server/documents_api.py:664-783`);
   - the BFF relay uses `arrayBuffer()` (`web/src/app/api/documents/[id]/assets/[file]/route.ts`);
   - the edge nginx locations, buffering and `client_max_body_size` (`deploy/knowledge.conf`);
   - Cloudflare: Range on uncached `private` responses, the ~100 s origin cap, media caching rules;
   - auth: same-origin cookies on `<audio>` requests, and visibility: private documents.
6. **Generate ahead or on demand.**
   - Generate at publish, or at the first Listen.
   - What can play while the rest is still generating (the first chunk or chapter first)?
   - Caching keyed by document version, voice and language; what invalidates it; box disk per book.
7. **The Mac as an off-box runner** (operator addition). This Mac generates the audio and uploads it to
   the box, which then serves it. Cover:
   - how the Mac learns about work (polling the API with the KB token, or a push);
   - uploading large audio through the edge (20 MB `client_max_body_size`, the Cloudflare limits);
   - "the Mac must be on, and a job waits until it is";
   - compared with the box-runner path.
8. **The alternative: a private podcast feed** for a book, as a secret-token RSS feed in a podcast app.
   - How screen-off and offline playback improve.
   - **Privacy:** do Apple Podcasts or other apps fetch the feed and audio through their own servers?
   - Tokens and revocation.
   - Recommend whether it is worth offering beside the web player.
9. **What the design must draw.** List the reader and player states and transitions that follow from
   the above: preparing or generating (with partial readiness); playing; paused; buffering; moving to
   the next chapter; finished; failed or out of quota; offline; resuming a position. Add any iOS-imposed
   UX, such as the first tap to start.

## Optional: a throwaway check

- You may build a tiny page plus a Range-capable static server under `.cache/p41-playback/`, on a free
  local port, to confirm desktop behaviour: Range requests, `ended` advancing to the next file, and
  Media Session calls.
- **If you use Claude in Chrome**, follow the Operator Runtime:
  1. `list_connected_browsers`, then `select_browser` on deviceId
     `c14e5b18-f250-45f1-b92e-4a08a31197b5`, before any other browser tool;
  2. open your own tab and close it at the end;
  3. with no Chrome tools or no match, skip this check. It is optional, and not a stop.
- **No agent instrument stands in for a real iPhone.** List the exact checks the operator should make on
  their iPhone at acceptance.

## Output

- **`works/phases/active/P41-sr/topics/phone-playback.md`:**
  - the answers above;
  - **a recommendation**: the delivery shape, the format, generate-ahead or on-demand, and whether to
    offer a podcast feed;
  - the serving-chain changes, as a list for DECOMP2;
  - the states list for D1;
  - the operator's iPhone acceptance checks;
  - sources.
- **`result.md`**, with the verdict block first.

## Return (wave rules: you write no `phase.md`)

The `notebook` field holds:
- **Notes for later slices**, `**(from P41-sr.R3, for D1, DECOMP2, REVIEW)**`: gists that link the
  topic (the delivery recommendation; the states for D1; the Range fix for DECOMP2; the iPhone checks
  for REVIEW). Mark that DECOMP's note *"the asset route has no Range support"* is consumed, and say
  whether to remove it or replace it.
- **Operator Questions:** only one the operator alone can answer, for example whether they want the
  podcast feed.
- **Now:** one line.

## Validation

- The topic file exists, and each claim carries a source.
- If a test server ran, it is stopped.
- `git status --porcelain --untracked-files=all` shows nothing of yours outside your set.

## Wave

- **Set (this slice):** `.cache/p41-playback/`, `works/phases/active/P41-sr/topics/phone-playback.md`,
  `works/phases/active/P41-sr/slices/P41-sr.R3/`, a free local port, and the agent's Chrome (if used).
- **Running beside it:**
  - `P41-sr.R1`: `.cache/p41-voices/apis/`, `works/phases/active/P41-sr/topics/voice-apis.md`, its
    slice folder.
  - `P41-sr.R2`: `.cache/p41-voices/models/`, `.cache/p41-voices/venv*/`,
    `works/phases/active/P41-sr/topics/voice-models.md`, its slice folder, the Mac's CPU and GPU.
  - `P41-sr.S1`: `server/spoken.py`, `tests/test_spoken.py`, `tests/fixtures/spoken/`, their
    `plugin/templates/kb/` copies, `plugin/templates/manifest.json`, its slice folder.
- **Waiting commits:** none.
- **Join-rebuilt artifact:** none.
- **Checks:** only the validation above.

## Dispatch

route=research
reason=kind research
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
