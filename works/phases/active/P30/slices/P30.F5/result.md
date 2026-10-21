# P30.F5 — result

## Verdict

- **status:** done
- **tier:** high
- **model:** opus
- **effort:** high
- **summary:** Applied the operator's walkthrough decision to both readers at every width, desktop included. The top bar hides on scroll down. It comes back on a tap, an upward run of at least 64 px within one gesture, or near the top. The bottom chrome is never shown by scrolling: only at the end (held there) or by a tap. The rules are pure (`stepChrome`, `tapChrome`, `applyStep`) and core-tested. The legacy top bar now folds, and the bridge gained `y` and a validated `tap`. Verified live in the production build and a dev clone at 1440, 820 and 390.
- **files_changed:** `web/src/lib/reader/chrome.ts`, `web/src/components/reader/reader-frame.tsx`, `web/src/components/reader/legacy-reader.tsx`, `web/src/lib/legacy/bridge.ts`, `web/src/lib/legacy/messages.ts`, `web/src/app/reader.css`, `web/src/app/legacy.css`, `web/tests/reader-chrome.test.ts`, `web/tests/legacy-bridge.test.ts`, `web/tests/raw-route.test.ts`; notebook: `phase.md` (Decisions, Doc impact, Operator Questions, Now), `topics/operator-questions-decided.md` (*P30.F5*)
- **validation:** `pnpm --dir web typecheck` pass; `lint` pass; `test` pass (37 files, 388 tests); `build` pass (run twice, the second after the last CSS change); `python3 scripts/plugin_parity.py` PASS; `python3 scripts/skills_parity.py` PASS; `python3 scripts/workflow.py validate` passed (the existing oversized-doc-sections warning only). Live: see *Live check*.
- **deviations:** (1) `use-legacy-reading.ts` needed no change: it consumes `{fraction, anchor}` and stays fed. (2) The bridge was re-minified (short local names, `D=document`) so that `y` and `tap` fit under the 2 KB test cap: 1846 → 1916 bytes, same behaviour. (3) The legacy folded top bar is clipped and faded rather than `visibility: hidden`, so the keyboard can still reach it (OQ189). (4) The bridge test's title changed from "about 1 KB" to "under 2 KB", and it now asserts `type:"tap"`. Everything else is as planned.
- **doc_impact:** `- frontend.md: P30.F5 — the reader chrome for both readers, every width: …; the signed rounds' hide/show tables (01-reader r02 *The chrome*, 09-legacy-and-print r01 *Hide and show*) are superseded by the operator's decision (P30.F5)`

## What changed

**The rules: `web/src/lib/reader/chrome.ts`.** These are pure and shared by both readers.
- `stepChrome(state, top, end, now)` returns `{scroll, top, bottom}`. Each bar is set to show, hide, or left alone. The state carries the run, the last event time and the end hold.
- **Top bar:**
  - hides on a downward run of more than 4 px;
  - shows on an upward run of 64 px or more (`SHOW_TOP_AFTER_UP`);
  - shows under 48 px from the top.
- **Bottom chrome:**
  - shows at the end, which sets the hold;
  - shows under 48 px from the top;
  - hides on a downward run of more than 4 px unless held;
  - is never changed by scrolling up.
- The hold lets go on an upward run of more than 12 px (`RELEASE_END_AFTER_UP`).
- A run restarts on a reversal, or after a pause of more than 300 ms (`GESTURE_GAP_MS`).
- `tapChrome(chrome, hasBottom)`: if anything is hidden, both show; if both are shown, both hide. A page with no bottom bar toggles on the top bar alone.
- `applyStep` returns the same object when nothing changes. `atEnd(top, max)` is the 4 px end test.

**Native: `reader-frame.tsx` and `reader.css`.**
- One `chrome` state `{top, bottom}` replaces `hidden`. Both the quiet window (450 ms) and the open-sheet rule still gate every scroll step.
- `rd-chrome-hidden` is split into `rd-top-hidden` and `rd-bot-hidden`:
  - `rd-top-hidden` covers the top bar, the resume pill and the long tables' sticky header offset;
  - `rd-bot-hidden` covers the chapter bar and the annotation place bar (`an-slot--chrome`).
- The resume pill follows the top bar, as before.
- "Show reading controls" appears while either bar is hidden and brings both.

**Legacy: `legacy-reader.tsx`, `legacy.css`, `bridge.ts` and `messages.ts`.**
- The same rules are fed by the bridge: `y` gives the px runs, `fraction >= 0.995` is the end, and `tap` toggles.
- The fold re-base and quiet window from S25 now apply to either bar's fold. While re-basing, a message only moves the baseline; the end and the top still count.
- The top bar folds to the progress line with a height transition (`lg-top-hidden`), so the frame grows upward.
- The bridge:
  - posts `y` (rounded `scrollTop`, never negative) with every `scroll` message;
  - posts `{type:"tap"}` on a plain click, but not with a modifier key, not on `a`, `button`, `input`, `select`, `textarea`, `label`, `summary`, `[contenteditable]` or `[tabindex]`, and not while text is selected.
- `readBridgeMessage`:
  - requires `y` (finite, 0 to 10,000,000);
  - accepts `tap` with exactly `{kb, v, type}`;
  - keeps the sender check (`source === frame.contentWindow`) and the size cap;
  - takes its key cap from `SCROLL_KEYS.size`.

**Core tests (`web/tests/reader-chrome.test.ts`):**
- a 12 or 30 px nudge up shows nothing, and neither do three 3 px steps or separate nudges with a pause between them;
- a run of 64 px or more shows the top only, while 63 px and a reversed run do not;
- a tap toggles both, and brings the bottom after a top-only reveal;
- the end shows and holds the bottom; the hold lets go after a 20 px scroll up, and the next scroll down hides it;
- a scroll down hides both, except the bottom held at the end;
- near the top, both show.

`legacy-bridge.test.ts` adds the tap message (accepted; refused from another window, with extra keys, with a bad `v` or `kb`) and bad `y` values (missing, negative, a string, infinite, oversized).

## Live check

**Runtime** (`topics/surface-slice-rules.md`; `:8766` and `:3030` were never used or stopped):
- a scratch API on `:8981` (PID 65114), with a scratch `KB_ROOT` and database `kb_f5live` in `kb-p28s2-pg` migrated to 0006, and `KB_GIT_COMMIT=false`;
- one member signed up through the API (`f5-member@example.com`, org slug `f5org`);
- the fixture book (`scripts/publish_fixture_book.py` with a tenant `vk_` key), plus a long legacy html chapter `long-legacy` (chapter 4, 12 parts) so the frame scrolls about 6,900 px;
- `fixtures` set to public;
- the production build: `next build`, then `next start :3981` (PIDs 65258, then 66060 after the rebuild);
- a dev clone (`cp -Rc` of `web/` minus `.next`) running `next dev` on `localhost:3983` (PIDs 66386 and 66402).

**Cleanup:** I stopped all of those by PID and dropped `kb_f5live`. Afterwards `:3030` (8452) and `:8766` (66506) were still listening.

**Instruments:**
- Aside `aside repl --account u1`: 1440×900, signed in once as the member (the first scripted attempt did not submit; one successful sign-in);
- headless Chrome over CDP: the S27/F4 `cdp.mjs` driver, a throwaway profile, `Input.synthesizeScrollGesture` (mouse at 1440, touch at 820 and 390), real mouse clicks and touch taps, and true viewports through `Emulation.setDeviceMetricsOverride` (390×844 at DPR 3 with touch, 820×1180 at DPR 2 with touch, 1440×900);
- console and CSP capture through CDP.

**Results.** Each row is one step. `y` is the scroll position in CSS px: `scrollY` for native, the bridge's `y` for legacy. Legacy `top` is shown as class/visibility/topbox height; legacy `bottom` as class/height.

Production build, CDP, 1440×900, anonymous:

| step | native y | native top / bottom | legacy y | legacy top / bottom |
|---|---|---|---|---|
| open | 0 | shown / shown | — | shown h59 / shown h170 |
| scroll down 600 | 600 | hidden / hidden | 600 | hidden h3 / hidden h0 |
| slow nudge up 12 (60 px/s) | 588 | hidden / hidden | 588 | hidden / hidden |
| slow nudge up 30 | 558 | hidden / hidden | 558 | hidden / hidden |
| deliberate up 150 | 408 | **shown** / hidden | 408 | **shown h59** / hidden |
| scroll down 200 | 608 | hidden / hidden | 608 | hidden / hidden |
| click on the text | 608 | shown / shown | 608 | shown / shown h170 |
| click again | 608 | hidden / hidden | 608 | hidden / hidden |
| scroll to the end | 8863 | hidden / **shown** | 6900 | hidden / **shown** |
| scroll down again at the end | 8863 | hidden / shown | 6900 | hidden / shown |
| slow nudge up 30 from the end | 8833 | hidden / shown | 6870 | hidden / shown |
| deliberate up 400 | 8433 | shown / shown | 6470 | shown / shown |
| scroll down 300 | 8733 | hidden / hidden | 6730 | hidden / hidden |

At 820×1180 and 390×844 (touch gestures and touch taps) the production build gave identical outcomes at every step. Sample values:
- 820: native deliberate up to 406 showed the top only; the end at 8541 showed and held the bottom; legacy end at 6640, bottom h190.
- 390: native end at 10333; legacy end at 12641, bottom h276.

Aside at 1440, signed in (member), production build, with real wheel and mouse input. The results were the same:
- native: wheel down 600 hid both; up 12 and a slow up 30 showed nothing; up 150 (to 408) showed the top only; a click brought both, and a second click hid both; the end (8923) showed the bottom, which stayed through a further wheel down and a slow 30 px wheel up;
- legacy: the same sequence, with the end at 6895–6900 and the bottom held.

The dev clone (CDP, 1440 and 390, both readers) gave the same outcomes as the production build at every step.

**The desktop top bar hides.** At 1440, native `.rd-top` computes to hidden. The legacy topbox goes from 59 px to 3 px (the progress line only); screenshot `1440x900-legacy-*`.

**Keyboard focus reveals a hidden bar:**
- Native, unchanged since S13: with the bars hidden, the first Tab lands on "Show reading controls" (opacity 1 while focused), and Enter shows both.
- Legacy: with the bars hidden and focus on the skip link, Tab lands on the folded bar's logo, and the topbox unfolds to 59 px with the bar visible. Tab again lands on Display, still visible.
- The bottom chrome's `:has(:focus-visible)` rule and the legacy "Show reading controls" after the frame are as S25 built them.

**Tap exemptions (bridge).** I loaded the relayed document into a same-origin harness frame and clicked with real mouse events:
- a paragraph posted `tap`, and so did a heading;
- the document's `<button>` posted nothing;
- an `#anchor` link posted nothing.

In the real reader, a drag-selection in the frame posted no `tap`, and the chrome did not change.

**Console and CSP:**
- production build: no entries at all, across every run (CDP capture);
- dev clone: only dev noise (React DevTools info, HMR and Fast Refresh logs, two "preloaded but not used" CSS warnings); no exceptions and no CSP violations.

**Not run:** real iPhone and iPad (WebKit momentum and `100dvh`), Safari and Firefox. Those are the operator's device checks.

## Decisions (on `## Operator Questions` as OQ185–OQ190; full text in `topics/operator-questions-decided.md` → *P30.F5*)

- OQ185: the end's hold lets go after an upward run of more than 12 px, not on leaving the 4 px zone, because the legacy frame shrinks when its bottom unfolds.
- OQ186: scrolling up never changes the bottom chrome, so a deliberate scroll up from the end keeps it shown.
- OQ187: a run restarts after a 300 ms pause between scroll events, so separate small nudges never add up to 64 px.
- OQ188: the legacy top bar folds to the progress line, so the frame grows upward.
- OQ189: keyboard reach. Native is unchanged; the folded legacy top bar stays tabbable.
- OQ190: the bridge sends `y`; the bridge is now 1916 bytes.

## Notes

- `phase.md` now carries the Decisions line ("Reader chrome rules amended by the operator at the walkthrough (P30.F5)"), one Doc impact line (frontend.md), the collapsed OQ185–OQ190 line and `## Now`. It is at 38.5 KB, under the 40 KB budget.
- Residue: the Aside profile `u1` holds the scratch member's session cookie for `127.0.0.1:3981`, which is dead now that the server is stopped. Scratch files are under the session scratchpad `f5/`.
