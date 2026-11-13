# P41-sr.W1 result: the web player core

## Verdict

- **status:** done
- **route:** high
- **model:** opus
- **effort:** xhigh
- **summary:** Built the Listen player core: one `<audio>` mounted from the root layout on reader paths, native HLS else hls.js 1.7.4 light, the F19 machine, Media Session, the kept position, and on the loose-document reader the head control, pill, dock, ListenNote and follow along, all to the signed `11-listen` canvas. Verified it in the agent's Chrome through **Claude in Chrome** (deviceId `c14e5b18-…`, selected first): the whole check list on the dev runtime `:3030` at the window's 960 px with signup in that Chrome, the production `:3041` build on both the native and hls.js paths, and the wide dock through the iframe harness at 1700 and 1599. Every check passes with no CSP violation; phone widths passed headless in the first run, and `tap` stays owed to the iPhone at acceptance.
- **files_changed:**
  - **edited:**
    - `web/src/app/layout.tsx`, `web/src/app/reader.css`
    - `web/src/app/(public)/[org]/[project]/[slug]/page.tsx`
    - `web/src/components/reader/reader-frame.tsx`, `web/src/components/reader/reader-page.tsx`, `web/src/components/reader/chapter-head.tsx`
    - `web/src/content/index.ts`
    - `web/package.json`, `web/pnpm-lock.yaml`
  - **new:**
    - `web/src/content/listen.ts`
    - in `web/src/lib/listen/`: `actions.ts`, `engine.ts`, `follow.ts`, `format.ts`, `hls-light.d.ts`, `machine.ts`, `paths.ts`, `seed.ts`, `store.ts`, `types.ts`, `view.ts`
    - in `web/src/components/listen/`: `dock.tsx`, `icons.tsx`, `listen-control.tsx`, `listen-host.tsx`, `listen-note.tsx`, `listen-page.tsx`, `listen-root.tsx`
    - `web/tests/listen-player.test.ts`
  - **The Chrome run (2026-11-11) changed no code.** It rewrote this `result.md` only.
- **validation:**
  - `pnpm vitest run tests/listen-player.test.ts tests/listen-relay.test.ts`: pass, 2 files and 10 tests. It was re-run after the Chrome run; the tree is unchanged.
  - `pnpm exec tsc --noEmit`: clean (first run).
  - `pnpm exec eslint` on the changed TypeScript files: clean (first run).
  - `pnpm exec prettier --check` on the changed TypeScript files: clean (first run).
    - `reader.css` already failed Prettier at HEAD, as do 15 of the app's CSS files. The new block follows the file's own one-line style and was left unformatted.
  - `pnpm exec next build` in a scratch APFS clone: pass, three times (twice in the first run, once in the Chrome run). `/` stays static, ○.
  - **The Claude in Chrome run:** every check passes (§ Chrome run). The CSP proof is a buffered `ReportingObserver` plus a `securitypolicyviolation` listener, because `read_console_messages` cannot see CSP reports (a positive control proved it).
  - `git status --porcelain --untracked-files=all`: only set files changed, plus the orchestrator's `slice.json` and `plan.md`. `UPDATE_REQUIRED.md` was left alone.
  - Deferred, whole-tree: the full web test, lint and build gate, and the full pytest.
- **deviations:**
  1. The phone widths (390 and 320) were checked in the first run with headless Chrome over CDP, which the plan allows. They were not re-run in Chrome, whose window is fixed at 960.
  2. The account was signed up in the agent's Chrome on `:3030`. The org `vk_` key was then minted through the scratch API, using a session from an API sign-in with the same account, not in the app. That way the key never appeared on screen or in a screenshot. It was never printed.
  3. The API ran with `KB_LISTEN_PART_CAP_S=20`, so the short synthetic documents split into many parts.
  4. The scratch clone excluded `.env*`, and `SESSION_SECRET` was a random scratch value given on the command line.
  5. The F26 two-language loose document is impossible. Loose documents always carry `langs: []`, so the F26 CSS is built but dormant.
  6. The engine changed after the first run's first pass: a 401 on the position save now moves to `fail-session` (§ Decided as built).
  7. `hls-light.d.ts` was added, because hls.js's light entry ships no types.
  8. **Offline in Chrome:** Claude in Chrome has no DevTools network emulation. The run overrode `navigator.onLine` and fired `offline`/`online` in the page, and stopped the API to cut the parts. The first run used DevTools offline over CDP.
  9. **Dark in Chrome:** the run used the reader's Display → Dark, because the window's `prefers-color-scheme` cannot be emulated. The setting was restored to System afterwards.
  10. Production was opened as `http://localhost:3041`, so its session cookie never touched `:3030`'s on `127.0.0.1`.
  11. **Teardown is partial:**
      - Deleting the scratch clone, the `KB_ROOT`, the rendered parts and the secret files was refused by the permission layer, and was not worked around.
      - Every secret left behind belongs to the destroyed database and stopped API, so each one is inert.
      - The paths are in § How to rebuild the stack. The orchestrator should delete them.
- **notebook:**
  - **Decisions:** Player (W1): one module store (`useSyncExternalStore`), with one engine on one `<audio>`, mounted from the root layout on reader paths only (`next/dynamic`, `ssr:false`). It uses native HLS first, else hls.js 1.7.4 light with no worker. The CSP is unchanged: nonce plus `strict-dynamic` covers the lazy chunk, and the policy has no media or connect directives. → `slices/P41-sr.W1/result.md` § Architecture.
  - **Notes for later slices:**
    - **(from P41-sr.W1, for P41-sr.W2)** The open-player seam is `setOpenPlayer(fn)` in `web/src/lib/listen/store.ts`. The dock's chevron calls `listenActions.openPlayer`, which does nothing until W2 registers. The engine already has `seek`, and the store has `speed` and `follow` → `result.md` § For W2.
    - **(from P41-sr.W1, for P41-sr.W2)** Books are not in W1.
      - `Listen.kind`, `ListenSeed` and `ListenDocKey` are doc-only, in `web/src/lib/listen/types.ts`.
      - The book strings (`whereBook`, `nextWaiting`, `finishedBook`, `lineBook`) are already in `content/listen.ts`.
      - Chapter pages render `ListenSlot` with `lx-slot--chapter`, but nothing passes them a seed.
      - `/documents/[id]` passes no seed.
    - **(from P41-sr.W1, for P41-sr.REVIEW)** A reload while playing can show the last save, not the pagehide position. The route reads the seed before the beacon lands (API log: GET state, then both PUTs).
      - Seen: 0:37 against 0:40. The next load showed 0:40.
      - It is at most the 15 s save interval.
      - Judge it at the walkthrough, or defer it → `slices/P41-sr.W1/result.md` § Chrome run.
  - **Doc impact:**
    - `frontend.md`: the Listen player core.
      - `ListenRoot` sits in the root layout and lazily mounts `listen-host` on reader paths.
      - The module store is `lib/listen/store.ts`.
      - The engine (`lib/listen/engine.ts`) uses native HLS, else hls.js 1.7.4 light with `enableWorker:false`. The F19 machine is `lib/listen/machine.ts`.
      - Server actions are in `lib/listen/actions.ts`. The document route reads the seed beside its load.
      - New dependency: `hls.js@1.7.4`, pinned exact.
      - New styles: the `lx-*` and `rx-listen` block in `reader.css`.
    - `experience.md`: Listen on the loose-document reader, P41-sr.W1.
      - The head control holds the tallest note's height.
      - The bottom slot shows the pill, or the dock once Listen is pressed.
      - ListenNote follows the F19 states; follow along marks the block being read and never scrolls.
      - Offline has three states.
      - An expired session is reported at the next position save.
      - Leaving reader paths pauses Listen.
    - `product.md`: signed-in readers can listen to a native document's current version.
      - The position is kept across reloads and devices; the beacon fires on pagehide.
      - Audio of an earlier text plays with "Earlier version" and Update audio; the new audio takes over at the next press.
    - `operations.md` `## Operator Runtime` (P41-sr.W1):
      - `read_console_messages` does not capture the browser's CSP violation reports. In a positive control, an `img-src` violation fired `securitypolicyviolation` and a buffered `csp-violation` report, and the console tool showed nothing.
      - Prove "no CSP violation" with a buffered `ReportingObserver({types:['csp-violation'], buffered:true})` plus a listener.
      - A production build opened as `localhost:<port>` keeps its session cookie apart from `127.0.0.1:3030`'s.
  - **Operator Questions:** none.
  - **Now:** W1's code is complete. It is verified in the agent's Chrome (dev `:3030` at 960, production `:3041`, and the wide dock through the harness) and headless at 390 and 320. `tap` stays owed to the iPhone at acceptance. W2 builds on the seams in `result.md` § For W2.

## Architecture

**Mount.**
- `web/src/app/layout.tsx` renders `<ListenRoot />` after `{children}`.
- `ListenRoot` (`components/listen/listen-root.tsx`) is a client component. It renders `ListenHost` only when `isListenPath(usePathname())` holds:
  - `/documents/{id}`;
  - `/@org/project/slug`, with an encoded `%40` also accepted;
  - `/@org/project/books/book[/chapter]`.
- `ListenHost` is loaded with `next/dynamic(…, { ssr: false })`. It owns the one `<audio preload="none" hidden>`, creates the engine in an effect, registers it in the store, and destroys it on unmount.
- The host outlives client navigation between reader pages, so the dock and the audio persist. Leaving reader paths unmounts it: it saves the position, sends a beacon and pauses.
- Evidence: `next build` keeps `/` static (○), and the library page shows no Listen.

**Store.**
- `lib/listen/store.ts` is a module-level store read through `useSyncExternalStore`, with no state library.
  - Reads and writes: `getListen`, `setListen`, `patchListen` and `useListen()`; the server snapshot is null.
  - `setEngine` takes the engine, and queues a press made before the engine exists.
  - `setOpenPlayer` is the W2 seam.
  - `listenActions` holds `start`, `play`, `pause`, `retry`, `startOver`, `update`, `seek` and `openPlayer`.
- The reader reaches it through `ListenPageContext`, which `ReaderFrame` provides. Its value carries the seed, the unit and the head's callback ref, which the frame measures for the pill.
- `useListen() !== null` sets the root class `lx-docked`, which drives the page's end padding and stacks the other slot pills above the dock.

**Engine** (`lib/listen/engine.ts`, `createEngine(audio)`).
- **Native or hls.js.**
  - `canPlayType("application/vnd.apple.mpegurl")` is checked on every attach. Chrome 157 answered `maybe`, so it played natively.
  - Otherwise `import("hls.js/light")` loads hls.js, preloaded when not native, with `{enableWorker:false, startPosition, lowLatencyMode:false, backBufferLength:90}`.
- **R3.**
  - The source is never swapped at `ended`. A new `play.list` that arrives while sounding waits (`switchList`) until the next press.
  - `play()` is called synchronously inside the press.
  - The Media Session handlers are re-registered on every `playing`.
- **Faults.**
  - A refused `play()` (`NotAllowedError`) goes to `tap`.
  - A network fault while offline goes to the offline states; any other fault reads the state, and a 401 goes to `fail-session`.
  - An hls.js media error is recovered once.
- **Polling.** The server state is polled every 6 s while the page is visible and every 30 s while hidden, only in the making states (`polls()`).
- **Timeline.** `GET` of the B2 timeline URL, `no-store`. Follow along maps its segments onto the page's readable blocks (`lib/listen/follow.ts`):
  - a segment's `block` id is matched to `data-block` on the page;
  - runs of null-block segments are spread across the blocks by weight.

**Position.**
- The `listenSave` server action runs on pause, on seek, at most every 15 s while playing, and on leave. The pagehide beacon is `navigator.sendBeacon("/api/listen/position")`.
- A 401 on the save moves to `fail-session`.

**CSP answer: no change to `csp.ts` or `proxy.ts`.** The production reader header was `object-src 'none'; base-uri 'none'; frame-src 'self'; frame-ancestors 'none'; img-src 'self' data:; script-src 'self' 'nonce-…' 'strict-dynamic'`.
- There is no `default-src`, so `media-src` and `connect-src` are unrestricted: the native media requests and hls.js's XHRs pass.
- The hls.js chunk is a dynamic import from a nonce'd script, which `strict-dynamic` allows.
- `worker-src` would fall back to `script-src`, and blob workers would be blocked there; hence `enableWorker:false`.
- Evidence from the production :3041 build, headless:
  - a `securitypolicyviolation` listener injected before load recorded `[]` throughout;
  - no CSP entry reached the console or log, on both the native path and the forced hls.js path (`canPlayType` stubbed to `""`: the playlist and parts loaded over XHR, `src` was a `blob:` and the audio played).

**Seed.** The document route (`[slug]/page.tsx`) reads `readListenState(token, {org, project, doc: docStem(...)})` in parallel with its load, only for a signed-in reader of a native document. It passes `listen` to `ReaderPage` → `ReaderFrame` only on the current version: an older version's text is not the audio's text. Any miss means no Listen, never a failed page.

**Dev runtime.**
- `:3030` answered 500 on `/` because `temml` was missing from `web/node_modules`. `pnpm add --save-exact hls.js@1.7.4` installed it, and `:3030` answers 200 again.
- `:3030` reaches the scratch API: an anonymous GET of a scratch reader path logged `GET /app/orgs/w1lab/…` → 404 on :8766.
- `:3030` compiled the changed route.

## Verified

**Instrument (the first run, phone widths).**
- Headless Google Chrome 157, a throwaway profile, driven over CDP from a scratch Node daemon (`scratchpad/w1/cdp/daemon.mjs`).
  - Flags: `Emulation.setDeviceMetricsOverride` with `mobile:true` and DPR 2; `--autoplay-policy=no-user-gesture-required`; `--mute-audio`.
- Origin: the production standalone build on `http://127.0.0.1:3041`, assembled per `## Operator Runtime`, against the scratch API on :8766 and `p41-w1-pg`.
- Viewports: `innerWidth` read as **390** and **320**, height 844.
- **Not** Claude in Chrome: that run is § Chrome run, below.
- Content: five synthetic native documents in the scratch org `w1lab`, project `listen-w1`: an English river log in 11 parts, a Korean one, one unmade, one edited after its audio, and one whose voice fails.
- Audio: macOS `say`, one clip per segment (Samantha for English, Yuna for Korean), packaged with B2's pinned `aac_at` fMP4 command and finished with `segment_seconds`.

**Screenshots** are in `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/5d1a4fc9-9d70-403f-9f9d-a092c34a78a0/scratchpad/w1/shots/` (synthetic content only).

| Check | Width | Result |
|---|---|---|
| Unmade: no false length before the press | 390 | pass: the control read "Listen" with no length (`a1`) |
| → waiting (no runner seen) | 390 | pass: "Waiting for the Mac, last seen 17:19"; dock Play disabled (`a2`) |
| → making after the runner's claim | 390 | pass: "Preparing… Part 1 of 2", line at 2% (`a3`) |
| → ready once part 1 was made | 390 | pass: "Ready · the rest is preparing", dock Play enabled (`a4`) |
| → playing | 390 | pass: "Playing · 0:03 of 0:15 so far" (`a5`). The playlist grew while playing and part 2 played seamlessly; "so far" dropped once made (`a6`) |
| Pause | 390 | pass: "Paused · 0:05", saved (`b1`) |
| Seek | 390 | pass: `currentTime=44` moved follow along to the H2 "The noon break" (segment 43.36) (`b2`) |
| Finished | 390 | pass: "Finished · You've listened to the end."; dock lead Start over (`a7`) |
| Follow along: the right block | 390 | pass: title at 0 s, then the lede, paragraph, list item and H2 at their segment starts; rule in the start margin (`w390-3`) |
| Follow along: never scrolls | 390 | pass: `scrollY` stayed 1250 across three block changes |
| Dock stays put; chrome hides | 390, 320 | pass: dock rect `[17,763,373,828]` at every scroll, with or without `rd-top-hidden` |
| Dock clears the end of the page | 390 | pass: the end padding grows by the dock (`w390-4`) |
| Dock under sheets | 390 | pass: the Display sheet covers the dock (`g2`) |
| Pill with the chrome, after the head | 390 | pass: "Continue listening · 0:21"; pressing it docks without scrolling (`g1`) |
| Outdated, then Update audio | 390 | pass: "Earlier version …" plus Update audio, then Updating…; only the changed part was remade; at `ended` the old source stayed (R3); Start over took the new list (`d1`–`d3`) |
| Voice failure (three `fail` calls) | 390 | pass: "Stopped … at part 1 of 2." "Error · 502"; dock "Preparing stopped · try again"; Try again → making → playing (`e1`) |
| Offline: DevTools network-offline over CDP | 390 | pass: offline-play ("0:07 loaded"), offline-stopped at 0:12 when the buffer ran out, online → paused → Play resumed (`f1`, `f2`). Pressed offline → offline-start, online → starts (`f3`) |
| Signed out (cookies cleared mid-play) | 390 | pass after the fix: fail-session, "Signed out", dock Sign in (`i1`) |
| Korean | 390, 320 | pass: dock title `lang=ko`, follow along on the Korean lede (`c1`, `h3`) |
| Dark (`prefers-color-scheme`) | 390 | pass (`c1`) |
| `mediaSession` | 320, 390 | pass: metadata title and album, playbackState. A spy saw play, pause, seekbackward, seekforward and seekto set, and previoustrack and nexttrack nulled |
| Position survives a reload | 390 | pass: reload → "Continue listening 0:44 of 1:28" |
| Beacon on pagehide | 390 | pass: `POST /api/listen/position` type Ping; leaving the page kept 0:47 |
| No CSP violations, production | 390, 320 | pass on native and hls.js paths: `[]`, and no CSP log entry |
| 320 layout | 320 | pass: the head control wraps Start over; the dock title ellipsizes; the dock spans the column edges `[17,…,303]` (`h1`, `h2`) |

**Owed to the Claude in Chrome run** (paid in § Chrome run, except `tap`):
- the whole list above, in the dev runtime `:3030` at the agent's window width, with signup in the agent's Chrome;
- the wide-screen dock measure (`min-width: 100rem`);
- the dev console's CSP check;
- the production `:3041` load in the agent's Chrome;
- the `tap` state, which only a real refusal can reach, on an iPhone; it is not reachable on desktop.

## Chrome run

**Instrument: Claude in Chrome, in the agent's dedicated Chrome profile** (2026-11-11).
- **Select first.** `list_connected_browsers` listed one browser, deviceId `c14e5b18-f250-45f1-b92e-4a08a31197b5`. `select_browser` ran on that id before any other browser tool.
- **The tab.** The run opened its own tab (`tabs_create_mcp`), drove only that tab, and closed it at the end.
  - The tab group still holds tab `1503959229`, an empty New Tab that was already there at the first context call. This run did not open it and left it alone.
- **The window.** Chrome 157. `innerWidth` read **960**; the height was 963, later 907, as the window's own bars changed. DPR 1.
- **Origins:**
  - **dev:** `http://127.0.0.1:3030`, the operator's `next dev`. It was never restarted and is still PID 8452, answering 200. It ran against the scratch API on :8766 and `p41-w1-pg` (a fresh database).
  - **production:** the standalone build, assembled per `## Operator Runtime`, opened as `http://localhost:3041` against the same API.
  - **wide:** a scratch same-origin iframe harness on `localhost:3043`, proxying :3041 with the frame headers stripped (`scratchpad/w1/tools/vp-proxy.mjs`). The production build hydrates inside it.
- **Account.**
  - Signed up through `:3030/signup` in the agent's Chrome, as a throwaway `@example.test` address. The BFF's `POST /auth/signup` returned 201 in the API log.
  - Signed in once on `:3041`.
  - Signed out of both at the end:
    - `:3030` by the signed-out-mid-play check (the app's own `POST /api/auth/logout`), confirmed when `/library` redirected to `/login`;
    - `:3041` by the library's Sign out button.
- **Content and audio.** The same five synthetic documents and macOS `say` runner as the first run (§ Verified). The Korean one was published with `lang: "ko"`.
- **How it was driven.** Real clicks for every press: the head control, the dock, the pill, Update audio, Try again and Start over. Real wheel scrolls for the chrome. DOM, `<audio>` and `mediaSession` reads through the page. Each play was kept to a few seconds, aloud.
- **Screenshots** (synthetic content only): `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/5d1a4fc9-9d70-403f-9f9d-a092c34a78a0/scratchpad/w1/chrome-shots/`. They are `dark-960`, `korean-dark-960`, `outdated-960`, `voice-fail-960`, `offline-start-960`, `signed-out-960`, `prod-3041-playing-960` and `wide-1700-harness`.

| Check | Width | Result |
|---|---|---|
| Signup in the agent's Chrome on :3030 | 960 | pass: landed on `/library`, with the org created |
| Unmade: no false length | 960 | pass: "Listen", no length |
| → waiting (no runner seen) | 960 | pass: "Waiting · Waiting for the Mac. Preparing starts by itself when it's on." with no "last seen" (a fresh database); the dock read "Waiting for the Mac" with Play disabled |
| → making after the runner's claim | 960 | pass: "Preparing… · Part 1 of 2. You can play once this part is ready.", with the line; the dock read "Preparing… · part 1 of 2" with Play disabled |
| → ready once part 1 was made | 960 | pass: "Ready · The first 1 min are ready to play; the rest is still preparing."; the dock read "Ready to play · the rest is preparing" with Play enabled |
| → playing | 960 | pass: "Playing · 0:02 of 0:15 so far". Part 2 was made while playing; playback ran on through 0:15 with no gap, "so far" dropped ("0:15 of 0:21") |
| Finished | 960 | pass: "Finished · You've listened to the end."; the dock read "Finished · 0:21". The finished dock's lead is Start over, seen on the edited note |
| Pause | 960 | pass: "Paused · 0:13 of 1:28"; `mediaSession.playbackState` was `paused` |
| Seek | 960 | pass: `currentTime` 44 put the mark on the H2 `the-noon-break`; 30 put it on "At three bends…"; 2 put it on the lede. The head and the dock followed |
| Follow along: the right block | 960 | pass: the title at 0.1 s, the lede at 1.9 s, then each paragraph at its time (for example "They wrote each sighting…" at 20.7 s) |
| Follow along: never scrolls | 960 | pass: `scrollY` stayed 0 across block changes onto off-screen blocks. This held in four runs with hooks on `scrollTo`/`scrollBy`/`scroll`/`scrollIntoView`/`focus` and a scroll listener, which saw no calls. One jump went unexplained (observation 3) |
| Dock stays put while the chrome hides and returns | 960 | pass: the dock stayed at `[192,826,768,891]` at `scrollY` 0, at 500 (top bar hidden by a real wheel) and at 300 (top bar back) |
| Dock clears the end of the page | 960 | pass: at the bottom, 120 px between the last control and the dock; the end padding grows while docked |
| Dock under a sheet | 960 | pass: with Display open, `elementFromPoint` across the dock hit the scrim and the sheet (z 40 over the slot's 21) |
| Pill with the chrome, after the head | 960 | pass: "Continue listening · 0:40", centred while the chrome shows and hidden with it. Pressing it docked and played. The text stayed in place: `scrollY` +28 from scroll anchoring as the head's note grew above |
| Outdated, then Update audio | 960 | pass: "Earlier version · The text changed after this audio was made…" with Update audio → Updating…. Only the changed part was remade. At `ended` the old list stayed (R3); Start over took the new list (0:22) |
| Voice failure (three `fail` calls) | 960 | pass: "Stopped · Something on our side stopped preparing this audio at part 1 of 2. · Error · 502"; the dock read "Preparing stopped · try again". Try again → Preparing… → made → started by itself → playing |
| Offline: pressed while offline | 960 | pass: offline-start, "You're offline. Listen can start once you're back online."; back online, it started from 0:41 |
| Offline: while playing | 960 | pass: offline-play, "Offline · 0:08 loaded", then offline-stopped, "Offline · stopped at 0:58". Back online it read Paused, and Play resumed at 0:58 |
| Korean | 960 | pass: the dock title `lang=ko` with `word-break: keep-all`; follow along on the Korean title, then the lede; the `mediaSession` title was Korean |
| Dark | 960 | pass: Display → Dark gave the page and the dock surface `rgb(35,32,25)` and ink `rgb(236,228,215)` (`dark-960`, `korean-dark-960`) |
| `mediaSession` | 960 | pass: the metadata title and album are the document title, with no artwork. `play`, `pause`, `seekbackward`, `seekforward` and `seekto` were set; `previoustrack` and `nexttrack` were nulled |
| Position survives a reload | 960 | pass: "Continue listening · 0:45 of 1:28" after a reload (see observation 2) |
| Beacon on pagehide | 960 | pass: `sendBeacon("/api/listen/position")` fired on pagehide and returned ok. The API logged `PUT /app/listen/position` and held 40.061 s |
| Leaving reader paths pauses | 960 | pass: client navigation to `/library` removed the `<audio>`, which was paused, and the dock |
| The host persists across reader pages | 960 | pass: a client navigation from the Korean document to the unmade note kept the same `<audio>` element playing (64.4 → 66.9 s), and the dock kept the river log |
| Signed out mid-play | 960 | pass: the app's sign-out ran while playing; at the next save the dock read "Signed out", with Sign in, and paused |
| No CSP violation, dev | 960 | pass: a buffered `ReportingObserver` and a listener reported `[]` on the unmade flow, on the river log, and over one client-navigation session with play (library → reader → library → reader). `read_console_messages` showed no CSP or error entry, but it cannot see CSP reports (observation 1). Dev header: `script-src 'self' 'nonce-…' 'unsafe-eval'` |
| Production `:3041` load | 960 | pass: signed in, Continue listening played natively, follow along marked "Near the ford…" at 1:07, `scrollY` stayed 0, the CSP checks gave `[]`, and the console was empty. Header: `script-src 'self' 'nonce-…' 'strict-dynamic'` |
| Production, hls.js path | 960 | pass: with `canPlayType` stubbed to `""`, the hls.js chunk loaded under `strict-dynamic`, `src` was `blob:`, the parts came over XHR, and it played; follow along marked "Back at the hut…" and the CSP checks gave `[]` |
| Wide dock (`min-width: 100rem`) | 1700 (harness) | pass: the dock spans `[498, 1202]`, 704 px = 44rem, the same edges as the title and the paragraphs; the slot's `--rd-measure` is 44rem (`wide-1700-harness`) |
| Wide control | 1599 (harness) | pass: the dock spans `[512, 1088]`, 576 px = 36rem, the paragraph's edges; the media query does not match |
| `tap` | — | owed to the iPhone at acceptance; not reachable on desktop |
| Phone 390 and 320 | — | first run, headless (§ Verified); not re-run, because the window is fixed |

**Observations** (none failed a check):
1. **The console tool cannot see CSP reports.**
   - A positive control loaded an image from `127.0.0.1:9`, which violates `img-src`. It fired `securitypolicyviolation` and a buffered `csp-violation` report, yet `read_console_messages` returned nothing.
   - The CSP proof here is therefore the observer and the listener; the console read proves only that there were no app errors.
   - This is recorded as a Doc impact note for `## Operator Runtime`.
2. **A reload while playing shows the last save.**
   - The route reads the seed before the pagehide beacon lands. In the API log, `GET /app/listen/state` came before both `PUT /app/listen/position`.
   - The page read 0:37 while the server then held 0:40, and the next reload showed 0:40.
   - The gap is bounded by the 15 s save interval. It is left for the review as a note.
3. **One unexplained scroll.** During the first play on the river log, the page was found at `scrollY` 677, with the chrome hidden, a few seconds after a screenshot at 0.
   - No Listen code calls a scroll or focus API (grep).
   - Four re-runs with hooks and a scroll listener saw no scroll across the same block changes.
   - The cause is not established. The window sits on the operator's desktop, so outside input is possible.
4. **Production, at the press:** one 100 ms sample showed the mark on the title before it settled on the right paragraph, at the kept position. This was not seen on dev, and it is cosmetic.
5. **How the offline stop happened.** With the API stopped, the next part request got the BFF's error body. The element raised `DEMUXER_ERROR_COULD_NOT_PARSE` (code 4) while 0:08 was still buffered, and with `navigator.onLine` false the engine read that as offline-stopped. A real network-offline fails the request instead, and the state is the same.

## Decided as built

These are points the canvas left silent; each was decided the way the build reads.
- **Server key ordering.** While making, a set `len` reads `ready` even if the runner is also away (the made audio outranks the waiting).
- **Made while waiting.** A Listen that becomes made after a press starts by itself; a refusal reads `tap`.
- **A document's stall at the end of its made prefix** reads `buffering`.
- **No Listen** for signed-out readers, legacy md documents (`unavailable`) or older versions; the seed is withheld in the route.
- **Strings:**
  - `waitingText` drops ", last seen …" when the runner was never seen;
  - day words: "HH:MM yesterday" and "HH:MM tomorrow", else "3 Nov 2026";
  - made lengths read at least "1 min";
  - time left is "under 5 min", 5-min steps under an hour, and half hours from an hour.
- **The head's hold** keeps the fail-limit copy as drawn, even though W1 never reaches fail-limit.
- **Leaving reader paths pauses Listen** (the host unmounts).
- **A pending new list** keeps the same seconds at the swap press.
- **Media Session album** is the document title, with no artwork.
- **openPlayer** does nothing until W2.
- **F26 is dormant**: loose documents carry `langs: []`.
- **Hidden in print**: the slot and the head control.
- **Expired session.** Made parts are capability URLs and keep playing without the session, so the position save is where an expired session first shows. A 401 there moves to `fail-session`, which pauses. Otherwise the reader would play on while their position silently stopped being kept.
- **Old audio after an edit.** Follow along maps the playing audio's timeline onto the current text. While an earlier version plays, its marks follow the old segment-to-block map and may sit one block off after an edit.

## For W2

- **Seam:** `setOpenPlayer(fn)` in `web/src/lib/listen/store.ts`. The dock's `.lx-dock__open` (`aria-haspopup="dialog"`) calls `listenActions.openPlayer`.
- **Engine transport:** `listenActions.seek(seconds)`, `play`, `pause`, `startOver`, `retry` and `update`. `Listen.speed` and `Listen.follow` are carried and saved, but W1 has no control for them.
- **Books:** add a book key and `kind`.
  - Types: `ListenDocKey`, `ListenSeed` and `Listen.kind` in `lib/listen/types.ts`; `keySchema` in `lib/listen/actions.ts` is strict `{org, project, doc}`.
  - Pages: chapter pages already render `ListenSlot` with `lx-slot--chapter` (above the chapter bar), but no route passes a seed.
  - Strings: the book copy is already in `LISTEN`.
- **The chapter route's `loading.tsx`** reaches `ReaderFrame`, so check the CSP there under the player.
- **`ListenNote`** takes `act` and `tone` (F25), for the player's transport and the secondary Update audio.

## How to rebuild the stack (for the Chrome run)

The scripts are kept in `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/5d1a4fc9-9d70-403f-9f9d-a092c34a78a0/scratchpad/w1/tools/`. All content is synthetic.
- `setup.py`: org slug, project and key.
- `docs.py`: the five documents. Republish the Korean one with `lang: "ko"`.
- `runner.py`: `make`, `claim`, `resume` and `fail N`.
- `edit_outdated.py`: the new version.

The steps:
1. `docker run` Postgres as `p41-w1-pg` on 127.0.0.1:55451.
2. `alembic upgrade head`.
3. Start uvicorn on :8766 with a scratch `KB_ROOT` and `KB_LISTEN_PART_CAP_S=20`.
4. Sign up and mint the key, start the Listens, and run `runner.py make`.

The first run was torn down completely at its end:
- the API was stopped;
- `p41-w1-pg` was removed with its volume;
- the scratch :3041 was stopped;
- the clone, `KB_ROOT`, the rendered parts, the headless profiles and the secrets were deleted.

**The Chrome run** rebuilt the stack the same way, on a fresh database, with these differences:
- the signup ran in the agent's Chrome on `:3030`, then an API sign-in gave `setup.py` its session;
- `docs.py` publishes the Korean document with `lang: "ko"`;
- `tools/vp-proxy.mjs` is the wide-viewport harness.

Its teardown:
- the API, the scratch `:3041` and the harness proxy were stopped;
- `p41-w1-pg` was removed with its volume, and the volume is confirmed gone;
- the test account was signed out on both origins, and the agent's tab was closed;
- `:3030` was left running as found (PID 8452, 200).

**Left behind, owed to the orchestrator:** the permission layer refused the delete, and it was not worked around. Everything is under `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/5d1a4fc9-9d70-403f-9f9d-a092c34a78a0/scratchpad/w1/`:
- `webclone/`, the scratch clone and build;
- `kbroot2/`, the `KB_ROOT`;
- `parts/`, the rendered audio;
- the secret files `pgpw.txt`, `acct-email.txt`, `acct-pw.txt`, `session.txt`, `vk.txt` and `last-claim.json`.

Each secret belongs to the destroyed database or the stopped API, so each one is inert.
