# P28.S10 — result (second pass, 2026-10-08 — supersedes the first pass's verdict)

- **status**: `done`
- **summary**: Research only, no product code. **Root cause, proved by the numbers:** the child
  reporter's `measure()` (`web/src/lib/explainer-height.ts`) reads the body through integer-**rounded**
  `offsetHeight`/`scrollHeight`, so it falls short of the real content by up to 0.5 CSS px whenever the
  body's fractional height is under .5. On a **DPR 2** (retina) display Blink snaps scrolling to
  half-CSS-pixel device units, so a shortfall of about 0.25px or more leaves the framed document a **real
  0.5px scroll range** inside the correctly measured frame. Overlay scrollbars hide it at rest. Classic
  scrollbars draw it as a full-height thumb, which is the operator's screenshot. Chrome's wheel latching
  then hands the gesture to the iframe instead of the page. **Doc 60 at DPR 2:** body 13,200.4766px →
  reported 13,264 → content ends at 13,264.48 → **`maxScrollTop = 0.5`**, measured twice. All nine public
  explainers at DPR 2: 0. Doc 60 at DPR 1: body 13,242.89 rounds up, so no range, and that is why every
  check here (Aside and this machine run at DPR 1) passed. The rounding dates from `1d59d6b`
  (2026-07-29), so it **predates P28**. Two real secondary defects in the same file: the lifetime
  `budget = 300` latch (once spent, any width change leaves a stale height, a *durable* inner scroller,
  reproduced) and posts from an unlaid-out frame (`innerWidth 0` → 64 or 90,820). Killed on the way: a
  short measured height, the slow beacon, a hidden tab (it heals), a background tab, and the 640px
  pre-measure box (its overlay takes the wheel).
- **validation**: `python3 scripts/workflow.py validate` → passed (see *Validation* below).
- **deviations**: (1) **Doc 60 was never ingested.** The sandbox classifier denied publishing its
  body into the local dev DB ("Sensitive-Source Provenance") and I did not retry in another form. Its DOM
  was measured only inside a **local-only** static harness on `127.0.0.1` (no ingest, no server write),
  and the timing probes ran on **synthetic** doc-60-shaped fixtures. (2) **Instruments.** Aside for
  everything at DPR 1. A throwaway **Chrome for Testing 148** over raw CDP (Node's global `WebSocket`) for
  hidden tabs, CPU throttling, pre-load scripts and **`--force-device-scale-factor=2`**. Its out-of-process
  sandboxed frame never received frame-rect updates in an unrendered window, so the DPR 2 readings run
  with `--disable-features=IsolateSandboxedIframes` (process placement only; layout and snapping are
  per-frame and unchanged). Its wheel dispatch hangs without a compositor frame, so **the latching half
  is standard Chrome behaviour, not demonstrated here**. A first classic-scrollbar attempt
  (`AppleShowScrollBars Always` in Chrome for Testing's *own* defaults domain, since removed) crashed and
  gave frozen readings, so it is discarded. (3) **Mid-task course changes from the coordinator**, taken
  in order: drop the short-height lead, then try the hidden-tab and pre-measure candidates (both
  answered, neither durable), then the screenshot lead, sub-pixel overflow in a measured frame
  (confirmed, §I).
- **doc_impact**: none. The slice changed no durable truth. The fix slice owes the note.
- **files changed**: this file; `works/phases/active/P28/phase.md`.
- **recommended fix slice**: `P28.F2`, "Explainer reporter: measure the content height exactly, and
  stop latching on reflow". `--kind fix --risk high`. Files: `web/src/lib/explainer-height.ts` (the
  `REPORTER` string), `web/tests/explainer-reporter.test.ts` (+3 small cases). Mechanism, in priority
  order: (1) `measure()` returns `Math.ceil` of the **fractional** body box,
  `Math.max(b.getBoundingClientRect().height, b.scrollHeight)` plus margins. It stays viewport-independent,
  so there is no ratchet. (2) The budget re-arms on a viewport-**width** change. (3) Nothing is posted
  from a 0×0 viewport. Full detail, and what must not change, is in the `phase.md` note tagged
  `(from P28.S10, for the scroll fix slice)`.

The findings themselves (verdicts, mechanism, transient windows, the beacon facts) are in `phase.md` →
`## Decisions` (the `(P28.S10)` lines), `## Operator Questions` (the beacon entry) and `## Notes for
later slices`. Below is the log: what I ran, the readings, and the dead ends.

---

## What the first pass established and this pass keeps

All of it still stands, and none of it is repeated here (see git history of this file at `39a769a`):
the nine public production documents all measure; the relay injects the reporter and the CSP permits it;
`explainer-height.ts` has a zero-line diff across P28; the `overflow` diff loses nothing; the handshake
has been live in production since 2026-08-07; markdown `pre` and tables still scroll sideways; and the
`70rem` fallback is pixel-identical above the fold on a desktop and about 2× worse on a phone. The first
pass's caution about the `~/.config/knowledge-kb/config.json` org key printed into a transcript also
still applies.

## Runtime and setup (all local, all removed afterwards)

- `kb-p28s2-pg` had **exited 8 days ago** (status 255). Every member page was a 500 and every raw route a
  404. I ran `docker start kb-p28s2-pg` and it is **left running**, as the notebook expects. uvicorn
  `:8766` and `next dev` `:3030` were already up and are unchanged.
- For publishing I signed in to `p28s5@example.com` over `/auth/login` and minted an org credential
  named `p28s10-repro`. It is **revoked** (204).
- **Fixtures created, all `--commit false`, all in `p28s5/research`, all DELETED afterwards (204; raw now
  404):**
  - `70` `p28s10-slow-script-probe`: fixture 66's body plus a trailing `<script type="module"
    crossorigin="anonymous" src="http://127.0.0.1:8799/beacon.js">`, a stand-in for the edge-injected
    beacon. Its delay is set per request.
  - `71` `p28s10-shape-probe`: doc 60's **shape** with synthetic text (template CSS, `<details>`, five
    quiz blocks with `hidden` reveals, two `width="100%"` SVGs, a 6-column `display:block` table), 9,969px
    at a 1022px frame.
  - `72` `p28s10-diag-probe`: 71 plus a head script that wraps `window.getComputedStyle`. The reporter
    calls it on `document.body` inside `measure()`, so every measurement posts a `p28s10-diag` message
    carrying `readyState`, the body box, `innerWidth`/`innerHeight` and the call stack. It does not
    change the reporter's behaviour.
- Throwaway servers, all killed: a slow-script stand-in on `:8799`, a static harness on `:8798`, and
  Chrome for Testing with `--remote-debugging-port=9333` and a scratch profile.
- **Public raw copies** of docs 25–33 (anonymous GETs) were served from the same local harness for the
  DPR 2 comparison and deleted with it.
- **Doc 60's file:** stripped of the saved-from comment and the beacon (and, for the harness copy, its
  absolutised `#` anchors restored). The derived copies were **deleted** at the end. Only the operator's
  original file remains in the scratchpad. Nothing private was committed, ingested or sent anywhere.

## Readings

### A. Doc 60 itself measures perfectly (Aside, local static harness, frame 1000px)

The harness copies the island's clamp and its load-time `kb-explainer-request`. One height message
arrived at 98ms: **13,307** (the operator's own number). Inside the child: `innerHeight 13307`,
`documentElement.scrollHeight 13307`, `scrollWidth 1000 = clientWidth`, body 13,243 plus 32/32 margins
= `measure()` 13,307. The lowest element bottom was 13,275 and the widest element was H1 at 768px.
**Overflowing scrollers in the whole document: none** (3 tables, none overflowing at this width).
Doc 60 has no structural feature that defeats `measure()`. **That is true at DPR 1 only.** At DPR 2
the rounding in `measure()` does leave a half-pixel scroll range (§I).

### B. A slow third-party module script does not delay measurement (Aside, fixture 70, 6,000ms delay)

The parent stayed `readyState: interactive` until about 6.3s, because the iframe's `load` waits for the
module. The frame was nevertheless `data-measured` with `height: 8698px` at the **first** sample (2.07s)
and stayed there. The reporter's `ResizeObserver` posts long before the child's `DOMContentLoaded`.
**Not the cause.**

### C. A hidden-tab width change goes stale and HEALS on becoming visible (CDP, fixture 71)

| step | visibility | frame width | frame height | messages |
|---|---|---|---|---|
| loaded | visible | 1022 | 9969 | 9969 @324ms |
| window minimised | **hidden** | 1022 | 9969 | — |
| `.kb-explainer` → 600px, +4s | hidden | 598 | **9969 (stale)** | **none** |
| restored, +0.8s | visible | 598 | **11717** | 11717 @10.77s |

That matches the coordinator's live observation, and it also answers the open half: **the frame heals
about 0.4s after the tab is shown.** The reporter's `ResizeObserver` and `resize` run once rendering
resumes. This is a transient and not the operator's durable symptom.

### D. A document opened in a background tab measures fine (CDP)

`Target.createTarget({background: true})`, `visibilityState: hidden`: it was `data-measured`,
`height: 9969px` at 307ms and stayed correct through activation.

### E. The pre-measure 640px box CANNOT be scrolled under the pointer (CDP, CPU ×20)

During the waiting state (`[null, null, null, 640]`), `elementFromPoint` at the frame's centre returns
**`DIV.kb-explainer__wait`**. That is the overlay (`position:absolute; inset:0`), which sits over the
iframe, so a wheel there scrolls the page. Coordinator candidate (3) is **ruled out** for the waiting
state. An inner wheel needs the iframe exposed: `[data-unmeasured]` (70rem), a clamped bogus height
(F), or a stale measured height (G).

### F. The reporter measures a frame that has not been laid out (CDP, fixture 72, cold loads, cache off)

| CPU | first diagnostic | posted | then |
|---|---|---|---|
| ×1 | `iw 1022 ih 640`, body 9905 | 9969 | clean |
| ×4 | DCL saw `iw 0 ih 0`; first measure already `iw 1022` | 9969 | clean |
| ×20 | measure at **`iw 0 ih 0`, body 0** | **64** (margins only) | 9969 about 1.25s later |
| ×10, **client-side navigation** short explainer → 72 (`next.router.push`) | measure at **`iw 0`**, body **90,756** | **90,820** → clamped to **40,000** | 9969 10ms later |

At ×20 the bogus 64 arrived **before hydration** and was lost, which was harmless. If it lands after
hydration, the parent clamps it to `MIN_HEIGHT 120`, sets `data-measured` (which hides the overlay) and
exposes a 120px frame that scrolls internally until the next re-post. On a client-side navigation it
lands after hydration by construction, as the 90,820 did. It is short-lived (one rendering frame,
visible tab), but it is a real wrong post, and every one costs a unit of `budget` (G).

The client-side navigation also showed the App Router **remounts** the island (`new-iframe`; its state
starts from `[null, null, null]`), so no height carries over between documents.

### G. THE DURABLE ONE: the lifetime `budget` latch (Aside, fixture 71, visible tab)

The reporter decrements `budget` once per post and returns forever at 0. A width change below the body's
48rem measure (frame narrower than about 800px) produces a new height on every step, so a continuous
drag spends about 60 per second.

1. 320 distinct widths, 35ms apart: **298** posts observed. Released to full width, the 300th post
   happened to be the return to 9969, which is a lucky heal.
2. 330 widths, then release: frame stuck at **10,673** for 9,969 of content (stale and too tall).
   I then sent `kb-explainer-request` by hand: **no post** (the request resets `last` but never `budget`).
3. 330 widths (700–996px), release, then narrow to **560px**: frame stuck at **9,969** while the child's
   content is **12,453**. **2,484px of inner overflow.** `page.mouse.wheel(0, 600)` over the frame:
   **inner `scrollY` 0 → 600, page `scrollY` 2000 → 2000.**

Only a reload or a remount clears it. This is a real *durable* inner scroller, but it is **not the
operator's screenshot**. There the frame is the full measured box with a sliver of overflow (§I), whereas
a latched frame is stale by hundreds or thousands of pixels and would draw a visibly shorter thumb. It
stays in the fix as the second item because natural actions can spend 300 posts in one document's life:
about five seconds of window drag, or of dragging a side-docked DevTools splitter, with the frame under
about 800px.

The latch is from `1d59d6b` (2026-07-29), so it **predates P28**. P28 widened the frame (`.kb-doc` full
track, 1022px at 1440) above the 48rem knee, which if anything makes the latch *harder* to hit at a
wide window than the old 46rem column did.

### H. Where the beacon comes from, and what it touches (curl; no state changed)

- It is **not in the repo** (`git grep` for `cloudflareinsights|cf-beacon|email-decode|cdn-cgi` finds
  nothing outside an unrelated changple5 explainer).
- It is **edge-injected**, and only for browser-like requests. `curl` with no UA gets no beacon.
  The same URL with a Chrome UA and `Accept: text/html` gets
  `<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js/…" integrity=…
  data-cf-beacon='{"…","spa":2}'>` before `</body>`, on **both** the app page `/documents/29` and the
  framed `/api/documents/29/raw`. So the nine public documents carry it too.
- Cloudflare **Email Address Obfuscation** is also active on the relay. Public doc 29's raw body
  contains `/cdn-cgi/l/email-protection` and `<script data-cfasync="false"
  src="/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js">`, so Cloudflare rewrites the
  explainer body itself. Doc 60 has neither (no address in it).
- Beacon fetch from here: 200, 31,679 B, 49–61ms, `access-control-allow-origin: *` (so it executes inside
  the opaque-origin sandbox), `cache-control: public, max-age=86400`.
- The response headers show no `no-transform`. From memory of Cloudflare's docs and **unverified here**:
  `Cache-Control: no-transform` on a response stops both the Web Analytics auto-injection and email
  obfuscation. That would be the origin-side lever if the operator wants it.

### I. THE ROOT CAUSE — `measure()` rounds, and at DPR 2 the shortfall survives as a scroll range

The lead came from the operator's screenshot (`scratchpad/doc60/shot.png`, read as data). It is
`/documents/60` on a retina Mac (3104 px wide for a ~1550 CSS px window, so DPR 2) with **classic**
scrollbars. A dark thumb runs down the frame's inner right edge from its top past the bottom of the
window. A thumb that long means a scroller whose range is tiny next to its height, which is a measured
frame with a sliver of overflow. It is neither the 640px box (whose iframe the overlay covers, and whose
thumb would be about 30px) nor a short frame.

The probe (identical in every frame): fractional body box from `getBoundingClientRect()`, the content bottom
(`body` bottom + `marginBottom`), what `measure()` returns, and **the real scroll range**:
`scrollingElement.scrollTop = 1e6`, read back, restored.

**Controlled fractions** (a 1000.x px block in the template's body, the real reporter, the island's clamp):

| block | DPR 1 (Aside): shortfall → range | DPR 2 (CfT): shortfall → range |
|---|---|---|
| 1000.09 | 0.09 → **0** | 0.09 → **0** |
| 1000.30 | 0.30 → **0** | 0.30 → **0.5** |
| 1000.44 | 0.44 → **0** | 0.45 → **0.5** |
| 1000.55 | rounds up → 0 | rounds up → 0 |
| 1000.89 | rounds up → 0 | rounds up → 0 |

At DPR 1 Chrome snaps a sub-pixel overflow away entirely. With layout-taking `::-webkit-scrollbar`
styling, which stands in for classic scrollbars in Aside, no scrollbar appears for 0.09–0.44 either.
At DPR 2 the scroll range is in **half-pixel** units, so a shortfall of about 0.25 or more becomes a real
0.5px range.

**Doc 60**, local-only harness, frame 1022px:

| DPR | body box | `measure()` | content bottom | shortfall | `maxScrollTop` |
|---|---|---|---|---|---|
| 1 (Aside) | 13,242.8906 | 13,307 | 13,306.89 | rounds up | **0** (all 15 widths 1022→390: shortfalls -0.36…+0.375, range always 0) |
| 2 (CfT, two separate runs) | 13,200.4766 | 13,264 | 13,264.48 | **0.4766** | **0.5** |

The body box differs between the two DPRs (13,242.89 vs 13,200.48) because text shaping differs at 2×,
so whether a document hits this depends on the document, the width, the DPR and the fonts. That is the
operator's "not all the docs has one" and "intermittent". It also explains why the orchestrator saw a
clean 13,307 on the operator's main machine: that is the DPR 1 layout, which rounds up.

**The nine public explainers at DPR 2** (frame 1022): ranges all **0**. Shortfalls are 0.06 (25) and
0.125 (28), both under a device pixel and snapped away. The other seven round up. Doc 60 is the only
document in the sample that crosses the threshold, which is why every check on the public set passed.

**Not demonstrated:** the wheel latching onto a 0.5px range. CDP `Input.dispatchMouseEvent` hangs in
this unrendered window and Aside runs at DPR 1. It is standard Chrome scroll-latching behaviour (a gesture
latches to the first scroller that can move in its direction, and the remainder does not chain to the
page mid-gesture), and it matches the operator's words. Flagged as inference.

**Why the fix is `ceil` of the fractional box rather than `documentElement.scrollHeight`:** the header's
ratchet warning still holds, because `documentElement.scrollHeight` is floored by the frame's own height.
`getBoundingClientRect()` on the **body** has no such floor, and it is fractional, so
`Math.ceil(rect.height + margins)` can never fall short and never grows with the frame. The
`Math.max(..., b.scrollHeight)` keeps today's coverage of descendants that overflow the body box. The .55
and .89 rows above are the proof that a frame at least as tall as the true content leaves range 0.

## Dead ends

- **Publishing doc 60's body to the local DB.** Denied by the classifier. I did not retry it in another
  form.
- **`file://` in Aside.** "Cannot navigate to a file URL without local file access". I switched to a
  `127.0.0.1` static server.
- **Hiding a tab in Aside.** A second `openTab` leaves the first tab `visible`, and `page.cdp` is
  `undefined` (no `Page.bringToFront`). That is why CDP was used for C and D.
- **The P25 header claim "Chrome does not run rAF in an opaque-origin frame like this one"** is
  environment-specific. In a visible tab the child ran rAF (1 in 800ms) and its ResizeObserver fired.
  Offscreen or hidden, rAF is 0. The `setTimeout` debounce is still right (hidden tabs), but the
  comment's stated reason is wrong. That is noted for the fix slice and not edited here.

## Aside / instrument notes (new, for the notebook's harness recipe)

`page.frames()[1].evaluate(fn)` **does** run inside the sandboxed opaque-origin explainer
(`origin "null"`). That makes the child's `innerHeight`, `scrollHeight` and `scrollY` readable directly,
which the first pass assumed was impossible. `installPageScript` exists among the repl globals (untried).
CDP via Chrome for Testing
(`~/Library/Caches/ms-playwright/chromium-1223/…/Google Chrome for Testing`, `--remote-debugging-port`,
scratch `--user-data-dir`) plus Node 24's global `WebSocket` gives `Page.addScriptToEvaluateOnNewDocument`,
`Emulation.setCPUThrottlingRate`, `Browser.setWindowBounds {windowState: minimized}` (a real
`hidden`) and `Target.createTarget {background: true}`.

## Validation

- `python3 scripts/workflow.py validate`: passed. The only warnings are the pre-existing advisories
  (P28 consolidation owed, stale docs, unknown legacy kinds, oversized doc sections).
- `git status --short` after the run shows only the orchestrator's pre-existing edits plus this file and
  `phase.md`. No product file changed, and nothing under `tenants/` is tracked.
