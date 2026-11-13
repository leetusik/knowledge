# P41-sr.W1 — The web player core: the persistent Listen, the dock, the note, Listen on a document

## Goal

Make Listen real in the reader for a **loose document**:
- the persistent Listen (store, one `<audio>`, HLS, Media Session, the saved position);
- the Listen control in the head;
- the bottom slot;
- the Dock;
- ListenNote;
- the icons;
- the compact top-bar port;
- follow along.

All of it is built to the **signed design**, under **RESPECT THE DESIGN**: never drop, simplify, restyle or "improve"
an approved element, and never reshape the signed reader.

**Not this slice (W2's):**
- book and chapter playback;
- the opened player sheet (F8, F28–F30, F33): Speed, Follow along and Chapters rows, Stop listening;
- the book landing (F31);
- the bottom pill's resume form.

W1 builds the architecture W2 extends. Leave clean seams: a provider action `openPlayer()` that the dock's chevron
calls, and that W2 fills with the sheet.

## Read first

- The breakdown block: `phase-section P41-sr "P41-sr.W1 — The web player core: the persistent Listen, the dock, the note,
  Listen on a document" --topic breakdown`.
- `.claude/skills/design-cowork/reference/build.md`: how a build slice honours a signed round. Follow it.
- **The signed round,** job `docs/reference/design/jobs/11-listen/`, round `01-listen`:
  - `result.md` § Build, *What to build, by part* and *The wiring*. Where a page fragment and a later `F<n>` disagree,
    the `F<n>` wins;
  - `frame.md` F1–F33, especially F2, F3, F5–F7, F9, F10, F12, F17, F19, F22–F27, F32;
  - the frame and reader page fragments (`pages/frame/result.md`, `pages/reader/result.md` → `## Build`);
  - the canvas source under `canvas/project/`: the Listen, Dock, ListenNote, Reader and Shell boards, plus `frame.css`.

  **Canvas-only parts are never built:** the state bars, `Main.dc.html`, the device windows, `PlayerData.js` and the
  fixtures.
- **Contracts:**
  - `slices/P41-sr.B1/result.md` § Contract, § State and its **F19 mapping**;
  - `slices/P41-sr.B2/result.md` § Contract: the `play` fields, the playlist's growth rule, the timeline, the beacon,
    and the exports of `web/src/lib/knowledge/listen.ts`.
- `docs/current/operations.md` `## Operator Runtime`, the whole section: the instrument, the deviceId, the fixed
  window, and the scratch build procedure.
- `docs/current/frontend.md`: only the sections on the reader, CSP and the nonce, and fonts.

## Build

- **The persistent Listen** lives above the routes (R3: a full page load stops the audio). It is mounted from the root
  layout (`web/src/app/layout.tsx`), which also wraps app, auth and marketing, and **renders and loads nothing on
  pages that are not reader or book paths.**
  - **Yours to decide (the high trigger), recorded in `result.md` § Architecture:**
    - how the client store is shaped. There is no state library; prefer a small `useSyncExternalStore` store over
      adding one;
    - how the player code reaches the reader paths **under their per-request nonce CSP** (`web/src/proxy.ts:33-36`,
      `web/src/lib/csp.ts:43-54`; the warning at `book-top.tsx:12-15`). Every script and chunk the Listen loads must
      carry the nonce, or be served the way Next already nonces its own chunks;
    - how mounting it in the root layout avoids making every page dynamic.

    Prove the choice in the production build (Verification).
  - **One `<audio>` element for the life of the page.** Native HLS where `canPlayType('application/vnd.apple.mpegurl')`
    says so; otherwise **hls.js**, a pinned exact version, added to `web/package.json` and the lock with
    `pnpm add --save-exact`.
    - Load `play.playlist` once `len` is set.
    - **Never swap `src` at `ended`.** A new `play.list` means the audio changed: switch only at a natural point (W2
      handles the book cases), and say how you did.
  - **The F19 state machine:**
    - server states from B1's mapping;
    - playback states on the client: `tap`, `loading`, `buffering`, `playing`, `paused`, `finished`, `offline-*`,
      `fail-play`, `fail-session`;
    - `fail-limit` has no source and is never shown.

    Poll `state` while making: about every 5–10 s while the page is visible, slower when hidden. Re-read the timeline
    while it is incomplete.
  - **Media Session:**
    - metadata: title = the document title (W2: the chapter), album = the document (W2: the book);
    - play, pause, seek back and forward 15 s (F-skip), `seekto`;
    - `setPositionState` kept current.
  - **The saved position:**
    - through `listen.ts`'s position call, throttled, about every 15 s while playing, on pause, and on seek;
    - plus a **pagehide beacon** to `POST /api/listen/position`;
    - speed and follow along are kept per the State (F3).
  - **Signed out:** the reader routes are session-only. Build exactly what the canvas draws for a signed-out reader
    (the design has Sign in states; see F24/F25 and the player's Sign in note). If the canvas is silent for a case,
    show no Listen control to a signed-out reader, and log it under *Decided as built*.
- **On the loose-document reader** (`web/src/components/reader/reader-frame.tsx`, `reader-page.tsx`, the document
  route `web/src/app/(public)/[org]/[project]/[slug]/page.tsx`):
  - the **Listen control** in the head's slot, **held at the unit's tallest note** so nothing jumps (F6, F27);
  - the **bottom slot**: the start pill, shown only once the head's Listen has scrolled under the top bar
    (reader-G5), or the **Dock** when a Listen is on (F7). The lead is by state; the chevron calls `openPlayer()`;
  - **ListenNote** (F10, F24, F25) with its `act` and `tone` props;
  - the **nine icons** (F5): inline `<svg aria-hidden="true">` inside named buttons, from `frame.css` `.lx-i--*`;
  - the **compact top-bar port** for a two-language document (F26): the signed second slot after Display, in `Shell`;
  - **follow along** (F12):
    - a 3px `kb-accent` rule in the margin of the block being read, on by default;
    - **it never scrolls the page**;
    - it is told apart from annotation highlights and term markers.

    Map `currentTime` → the timeline's `segments[].block` → the rendered block. If the native reader's DOM ids do not
    match S1's `block` values, add the mapping in your set and say how.
  - **Every** F19 state the document flow can reach, drawn as the canvas draws it: idle, ready or not yet made;
    preparing (waiting, making); ready while making; tap; loading and buffering; playing; paused; finished; the
    failures (voice, unreadable, playback, session); offline; outdated with Update audio; Korean (Pretendard,
    `keep-all`); dark.
  - **Strings** go in a new `web/src/content/listen.ts`, exported through `web/src/content/index.ts`, in the house
    pattern, word for word from the canvas.
  - **Tokens:** kb-* plus the frame's `--lx-*` (F14). CSS lives in `web/src/app/reader.css` or a new stylesheet beside
    it, in the reader's existing pattern.

## Tests (tiny)

`web/tests/listen-player.test.ts`, Vitest in the node environment: the state machine's transitions.
- The server state maps to each F19 key (B1's mapping).
- Playback events move `loading` → `playing` → `paused` → `finished`.
- `offline` is reached.
- A new `play.list` while playing does not swap at `ended`.

## Verification (in a browser, Claude in Chrome, by `## Operator Runtime`)

**The instrument:**
1. `list_connected_browsers`, then `select_browser` on exactly **`c14e5b18-f250-45f1-b92e-4a08a31197b5`**, before any
   other browser tool.
2. Open your own tab, drive only it, and close it at the end.

No Chrome tools, no id or no match: return `needs_operator`. Never borrow another browser. Read `innerWidth` first, and
record it.

**The stack.** The dev runtime is `:3030`, the operator's running `next dev`. **Never restart it, and never edit
`web/.env.local`** (it holds secrets; do not read it either). Its BFF calls the API at `:8766`, which is not running
now.
1. Start Postgres in a container named **`p41-w1-pg`**, on **127.0.0.1:55451**, then `alembic upgrade head`.
2. Start the API on **:8766**: `uv run uvicorn server.main:app --port 8766`, with `DATABASE_URL` and a **scratch
   `KB_ROOT` in the system temp directory**.
3. Confirm `:3030` reaches it, for example from the API's access log.
   - **`:3030` answers `/` with a 500 today**, possibly because `temml` is missing from `web/node_modules`; your
     `pnpm add` installs it. Find out which, and say.
   - If `:3030` cannot reach your API, or cannot serve the reader for a reason outside your set, use a scratch
     `next dev` instead. Run it from an APFS clone of `web/` (no `.next`) on **:3041**, with `KB_API_BASE_URL` set on
     its command line, and record the deviation.
4. **Account and key:**
   - sign up a throwaway account through the app's own signup, in the agent's Chrome, at the origin you use;
   - mint an org `vk_` key in the app;
   - **never print the key**;
   - mind the sign-in limiter: about 5 per 15 min per `next` process.
5. **Content:** write **synthetic** native documents into the scratch tenant through the API: one English, one Korean,
   one with two languages for F26, and one long enough to scroll.
   - Never use `.cache/` excerpts or real private documents.
   - Use the house native format (`server/native/`).
6. **Audio:** act as the runner yourself, through B1's runner API.
   - Make parts in **B2's pinned packaging** (§ Packaging's command) from macOS `say` (a system voice, not a cloned
     person), one clip per segment.
   - Send `segment_seconds`, so follow along can be seen.
   - Leave one document unmade, to show waiting and making.

**Check at least these, in the dev runtime:**
- Listen on an unmade document: no false length → waiting (no runner seen) → making after your claim → ready once part
  1 is made → playing.
- Play, pause, seek, and finished.
- Follow along marks the right block, and never scrolls the page.
- The dock stays put while the top bar hides and returns. It never covers the text, the bottom nav or a sheet's
  controls.
- Outdated and Update audio, by editing a document after its audio was made.
- A voice failure: three `fail` calls.
- Offline: the DevTools network-offline equivalent through the page, or by stopping the API, said which.
- Korean.
- Dark.
- `navigator.mediaSession.metadata` and its action handlers are set.
- The position survives a reload, and the beacon fires on pagehide.
- **The console is clean of CSP violations** (`read_console_messages` with a pattern).
- **Phone width:** the window size is fixed, and the reader uses viewport media. Use P30's way (headless Chrome over
  CDP with device metrics) for 390 and 320, and say which.

**Production build:** follow the scratch standalone build procedure in `## Operator Runtime` (P37-1p).
1. Clone `web/` to the scratch directory and run `pnpm exec next build` there.
2. Serve it on **:3041** against your `:8766` API.
3. Load a reader path. The player must load and play with **no CSP violation**, because nonce handling differs from
   dev.

**At the end:**
- stop the API, and remove `p41-w1-pg` and its own volume;
- stop any scratch `next`, and delete the scratch clone and `KB_ROOT`;
- sign the agent's tab out;
- leave `:3030` running as you found it.

## Validation

- `cd web && pnpm vitest run tests/listen-player.test.ts tests/listen-relay.test.ts`
- `pnpm exec eslint` and `prettier --check` on your changed files
- `pnpm exec tsc --noEmit`: report any error outside your set (a sibling's work in flight), never fix it
- `git status --porcelain --untracked-files=all` on your set: only your files
- **deferred: whole-tree**: the full web test, lint and build gate, and the full pytest. The scratch build above is
  verification, not the gate.

## Return

- `result.md`, with the verdict block first, then:
  - **§ Architecture:** the store, the mount and the CSP answer, with evidence;
  - **§ Verified:** each check, with its instrument, origin, viewport and result;
  - **§ Decided as built:** anything the canvas left silent;
  - **§ For W2:** the seams.
- Screenshots go to the slice folder only if small, else to the scratch directory, referenced by path. None may show
  private content.
- The `notebook` field holds:
  - **Decisions:** one gist, `Player (W1): … → slices/P41-sr.W1/result.md § Architecture`;
  - **Notes for later slices** `(for W2)`: the seams;
  - **Doc impact:** `frontend.md`, `experience.md`, `product.md`, one line each;
  - **Operator Questions:** only a real one;
  - **Now:** one line.

## Wave

- **set:**
  - `web/src/app/layout.tsx`, `web/src/app/reader.css`;
  - `web/src/app/(public)/[org]/[project]/[slug]/page.tsx`;
  - `web/src/components/listen/**`, `web/src/components/reader/**`;
  - `web/src/lib/listen/**`, `web/src/lib/reader/**`, `web/src/lib/knowledge/listen.ts`;
  - `web/src/content/listen.ts`, `web/src/content/index.ts`;
  - `web/src/lib/csp.ts`, `web/src/proxy.ts`;
  - `web/package.json`, `web/pnpm-lock.yaml`;
  - `web/tests/listen-player*.test.ts`.
- **Runtime resources held:**
  - the agent's Chrome profile;
  - the API on **:8766**;
  - `:3030`, the operator's: driven, never restarted;
  - a scratch `next` on **:3041**;
  - the container `p41-w1-pg` on **:55451**;
  - `web/node_modules`, through `pnpm add`.
- **Running beside it:**
  - **P41-sr.B3**, set: `tools/listen-runner/**` and `.gitignore`. Runtime: the container `p41-b3-pg` on :55453, the
    API on :8793 and the Mac GPU.
  - **P41-sr.G1**, set: `plugin/skills/explain/**`, `plugin/agents/explain-critic.md`, `.agents/skills/explain/SKILL.md`,
    `web/public/SKILL.md`, `plugin/.claude-plugin/plugin.json`, `plugin/README.md`, `.claude-plugin/marketplace.json`,
    `plugin/skills/setup/SKILL.md`, `web/src/content/marketing/content.ts`, and `README.md` only if it names the
    version. No runtime.
- **Waiting commits:** none.
- **Join-rebuilt artifact:** none.
- **Checks scoped to the set:** those under Validation. Whole-tree checks are deferred.

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

## Re-dispatch: the Claude in Chrome run only (2026-11-11)

The operator connected the agent's Chrome ("Try sugang profile"). `list_connected_browsers` now lists the recorded
deviceId `c14e5b18-f250-45f1-b92e-4a08a31197b5`. The code is done. This dispatch runs only the browser part.

- **Do not change the code** unless a check fails. A fix stays inside `## Wave`'s set, and `result.md` says what
  changed and why.
- **Instrument:** select first, every run: `list_connected_browsers`, then `select_browser` on exactly that
  `deviceId`. Then open your own tab with `tabs_create_mcp`, drive only that tab, and close it at the end. A missing
  id or no match is still `needs_operator`.
- **Rebuild the scratch stack** per `result.md` § How to rebuild the stack, using the scripts kept in the scratchpad
  `w1/tools/`. `:3030` is the operator's and is running: never restart it. `:8766`, `:3041` and `p41-w1-pg` are free.
- **Run the owed list** (`result.md` § Verified, *Owed to the Claude in Chrome run*):
  - the whole check list, in the dev runtime `:3030`, at the agent window's width (read `innerWidth` and record it),
    with the signup done in the agent's Chrome on `:3030`;
  - the wide-screen dock measure (`min-width: 100rem`): if the window is narrower, use the iframe harness in
    `## Operator Runtime`, or record the measure as not reachable;
  - the dev console's CSP check, with `read_console_messages` and a pattern;
  - the production `:3041` load in the agent's Chrome: one play, follow along, and the console;
  - the `tap` state stays owed to the iPhone at acceptance.
- **Audio may play aloud** in the agent's Chrome. Keep each play short.
- **At the end:**
  - sign the test account out in the agent's tab, then close the tab;
  - stop the API and `:3041`;
  - remove `p41-w1-pg` with its volume;
  - delete the scratch clone, the `KB_ROOT` and the secrets.
- **Update `result.md` in place:**
  - replace the verdict block (the status, a summary naming the instrument, the validation, and the notebook fields
    kept from the first run);
  - add `## Chrome run` after § Verified, with a table of check, width and result, and the evidence;
  - drop `operator_need` if done.
