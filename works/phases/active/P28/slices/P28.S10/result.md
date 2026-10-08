# P28.S10 — result (second pass, 2026-10-08 — supersedes the first pass's verdict)

- **status**: `done`
- **summary**: Research only, no product code. The "short measured height" lead is **killed**: doc 60's own
  body, framed at 1000px in a local-only harness, reports exactly **13,307** with **zero** inner overflow
  and no scrollers of its own. Its rival, "the beacon delays the first height", is killed as well: a 6s
  stand-in module script left measurement untouched. What I did reproduce is a **durable** inner scroller in
  a framed explainer. The child reporter's lifetime `budget = 300` latch (P17, `1d59d6b`, so it predates
  P28) stops all re-posting once 300 heights have gone out, and after that any width change leaves the
  frame at a stale height. With the content taller than the frame, the wheel over the frame scrolls the
  inner document and the page stays where it is, which is the operator's symptom. It persists until a
  reload. I also found that the reporter posts bogus heights from a not-yet-laid-out frame
  (`innerWidth 0` → **64** or **90,820**). The fix is a small change to `web/src/lib/explainer-height.ts`.
- **validation**: `python3 scripts/workflow.py validate` → passed (see *Validation* below).
- **deviations**: (1) **Plan step 1 was cut short by a guard I did not override.** I tried to publish
  doc 60's stripped body into the local dev DB as the plan allowed. The sandbox classifier denied it
  ("Sensitive-Source Provenance"). I reproduced instead on **synthetic** fixtures shaped like doc 60:
  the same template CSS, a `<details>`, quiz reveals, SVGs and a `display:block` table, with no real
  content. I measured doc 60's own DOM only inside a **local-only** static harness on `127.0.0.1` (no
  ingest, no server write). (2) I added one instrument beside Aside. Aside cannot hide a tab, cannot
  throttle the CPU and cannot install a script before load, so a throwaway **Chrome for Testing 148**
  driven over raw CDP (Node's built-in WebSocket) covered those three probes. Both instruments are named
  per measurement below. (3) On the coordinator's mid-task instruction I dropped the short-height lead and
  prioritised the hidden-tab and pre-measure candidates. Both are answered below.
- **doc_impact**: none. The slice changed no durable truth. The fix slice owes the note when it lands.
- **files changed**: this file; `works/phases/active/P28/phase.md`.
- **recommended fix slice**: `P28.F2`, "Explainer reporter: re-arm the runaway latch on width change and
  ignore an unlaid-out frame". `--kind fix --risk high`. Files: `web/src/lib/explainer-height.ts` (the
  mechanism), `web/tests/explainer-reporter.test.ts` (+2 small cases). An optional parent re-sync in
  `explainer-frame.tsx` is a second, separable step. The mechanism, and what must not change, is in the
  `phase.md` note tagged `(from P28.S10, for the fix slice)`.

The findings themselves (verdicts, mechanism, transient windows, the beacon facts) are in `phase.md` →
`## Decisions` (the four `(P28.S10)` lines), `## Operator Questions` (the beacon entry) and `## Notes for
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
Doc 60 has nothing that defeats `measure()`.

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

Only a reload or a remount clears it. That is the operator's symptom exactly: under the pointer the
document scrolls itself instead of the page, and it disappears on its own the next time the page loads.
Natural ways to spend 300 posts in one document's life: about five seconds of window drag-resize, or of
dragging a **side-docked DevTools** splitter (the operator was running console snippets) with the frame
under about 800px, plus a rail toggle or two and the F-class bogus posts. **Whether that is what happened
in the operator's session is not proven.** It is the only durable mechanism any probe found.

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
