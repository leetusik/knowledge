# P28.REVIEW — result (re-review, 2026-10-08; the first review's result is in git at `41b569e`)

- **status:** done
- **review_verdict:** `changes_requested`
- **summary:** Re-reviewed the framed-explainer fix inside its boundary (`41b569e..HEAD`: `web/src/lib/explainer-height.ts` + its test; surfaces = every framed explainer: member, public, `?view=full`, print). Gates green, and F2's three headline claims hold when I re-ran them myself in dev and the production build. That covers the latch re-arm after 360 posts, DPR 2 `maxScrollTop` 0 on fractional bodies, and no post below 120 under CPU ×20. But on the same surfaces I found two real defects that make the operator's acceptance unsafe: **(1)** with layout-taking (classic) scrollbars, an explainer that overflows sideways still gets a **14px vertical inner scroller**, and a wheel over it scrolled the frame, not the page (the operator's exact symptom). **(2)** **Printing / Export PDF silently cuts off the end of a framed explainer** whenever the paper column is narrower than the screen frame. This was reproduced on the live production site (docs 30 and 33 lose their last quiz questions) and on a local fixture (paragraphs 102–119 of 120 lost, A4 and Letter).
- **findings → proposed fix slices:**
  1. **P28.F3**: reporter, `measure()` ignores the root's horizontal scrollbar → add `innerHeight − documentElement.clientHeight` (fix / high).
  2. **P28.F4**: print, a framed explainer prints at its *screen*-measured height and is clipped when it reflows taller on paper (fix / high; may need an operator call on the ⌘P path).
- **validation:** `pnpm --dir web typecheck` 0 · `lint` 0 · `test` 0 (17 files, 118 tests) · `build` 0 · `prettier --check` on both touched files: clean (no `--write`) · `python3 scripts/workflow.py validate`: passed (pre-existing advisories only) · pytest **not run**: no server file changed since `41b569e` (`git diff --stat 41b569e..HEAD -- server tests` is empty).
- **deviations:** (a) the verdict is not the expected pass, so no qa carve-out version and no walkthrough were written (both pass-only). (b) Fixture **doc 70** (`p28review-reflow-probe`, synthetic) is **kept** in the dev DB for F3/F4 to reproduce on (named in `phase.md`). Its credential `p28review-repro` was revoked (204). (c) The latch repro used alternating widths (500–506 ↔ 780) rather than a monotone sweep: the sweep gave only 9 posts in Aside, which never spends the budget.
- **doc_versions:** none (not a pass; the qa carve-out waits for the passing re-review).
- **doc_impact verification:** F2's line covers the reporter contract change in full. S10 rightly left none. The review adds none (no durable truth changed). F3/F4 will owe their own lines.
- **walkthrough:** none (not a pass). The routing that the next walkthrough inherits is below and in `phase.md` → `## Operator Questions`.
- **explain:** not written — run /explain for this phase
- **files_changed:** this file; `works/phases/active/P28/phase.md`.

---

## Boundary

`git diff --stat 41b569e..HEAD -- web server tests` → exactly `web/src/lib/explainer-height.ts` (+67/−23 incl. header comment) and `web/tests/explainer-reporter.test.ts` (+108). The reporter is injected by the raw relay into every framed explainer, so the surfaces are: member `/documents/{id}`, public `/@org/project/slug`, `?view=full` on both, the past-version route (markdown for the probe used, so only its full-view chrome applies), and print. `phase-scope P28` was context only.

I also read the diff as code. `post()` returns before touching state on a 0×0 viewport. `lastW` re-arms `budget` per width. `grant` is set only by `kb-explainer-request` and cleared only on an actual post, and it never refills `budget`. The 2px dedupe and the 16ms debounce are unchanged. One theoretical case: a runaway whose width alternates (e.g. a parent scrollbar toggling) would re-arm forever. The parent's 40,000 clamp bounds it, so it is not a finding.

## Instruments

- **Aside `u1`** (`aside repl --account u1`, DPR 1, 1440×900) for the member/public/full-view passes, the latch repro, the wheel tests, Export PDF and back/Esc.
- **Chrome for Testing 148, `--headless=new --force-device-scale-factor=2`**, raw CDP over Node 24's `WebSocket`, port 9555, for DPR 2, CPU ×20 cold loads, the 390×844 mobile viewport (own browser context, signed in through the real `/login` form), print-to-PDF (A4 + Letter) and sideways-overflow scans. Text was extracted with `pdftotext`.
- Runtimes: dev `next dev :3030` (already up) and the production standalone build `:3040`. I started it after `pnpm build`, linked `.next/static` + `public/*` beside `server.js`, checked that the CSS chunk answers 200, and confirmed that the relay serves the F2 reporter (`lastW = w; budget = BUDGET`, `grant = true` both present in `/api/documents/66/raw`). Both servers and Chrome for Testing were stopped afterwards; `:3030` and `:8766` were left as found.
- Production `https://knowledge.hi2vi.com` was **read** anonymously (public docs 25–33 raw + two public document pages printed to PDF). Nothing was written there.

## F2's headline claims, re-run (all hold)

**Latch repro** (Aside; fixture 70, 48rem body, 16,918px at a 1022px frame). Method: 360 width steps on `.kb-explainer`, one `page.evaluate` per step + `sleep(70)`, then release, narrow to 560, then wheel 600 over the frame.

| runtime | posts during steps | released: frame / child sh | narrowed 560: frame / child sh | wheel: page / inner |
|---|---|---|---|---|
| dev :3030 | **360** (> the old 300 budget) | 16,918 / 16,918 | 22,869 / 22,869 | 514 → **1114** / 0 |
| prod :3040 | **360** | 16,918 / 16,918 | 22,869 / 22,869 | 514 → **1114** / 0 |

A monotone 470→799→470 sweep (660 steps, `sleep(35)`) gave only 9 posts in Aside. That never reaches the budget, though frame == child and the wheel moved the page there too.

**DPR 2** (CfT headless DPR 2, anonymous public route; `body.style.paddingBottom` set in the child to make the body fractional; read by `scrollTop = 1e6`):

| pad | body box | frame | `maxScrollTop` (dev) | (prod) |
|---|---|---|---|---|
| 0 | 16,853.156 | 16,918 | 0 | 0 |
| 0.5px | 16,869.656 | 16,934 | 0 | 0 |
| 0.6px | 16,869.75 | 16,934 | 0 | 0 |
| 0.25px | 16,869.406 | 16,934 | **0** | **0** |

The .406 row is the case the old rounding would have under-reported (16,869 + 64 = 16,933 < 16,933.41).

**CPU ×20 cold loads** (throttle + a `getComputedStyle` diag applied per child session via `Target.setAutoAttach`): prod ×3 and dev ×1. Every post was 16,918 (the request re-post included). Zero `measure()` calls at `innerWidth 0`, and nothing below 120. As F2 found, a promptly rendering headless child never measures at 0, so the 0×0 guard itself is evidenced by its unit case and F2's windowed readings, not by this run.

## First-time-user pass over each surface (prod :3040, 1440×900, Aside)

| path | frame | child max scroll (top / left) | wheel 500 over frame: page / inner |
|---|---|---|---|
| `/documents/70` | 16,918 | 0 / 0 | 800 → 1300 / 0 |
| `/documents/70?view=full` | 16,918 (1440 wide, top 0, exit pill) | 0 / 0 | 800 → 1300 / 0 |
| `/@p28s5/research/p28review-reflow-probe` | 16,918 | 0 / 0 | 800 → 1300 / 0 |
| same `?view=full` | 16,918 | 0 / 0 | 800 → 1300 / 0 |

At a **true 390×844** (CfT mobile, DPR 3): `scrollWidth 390` on all of anonymous public, public `?view=full`, member `/documents/70`, member `?view=full`, `/documents/67/versions/1?view=full` and `/documents/66`. On the member views the navbar is shown. `?view=full` hides navbar/topbar and shows the exit pill. Esc on `/documents/70?view=full` → `/documents/70`. `history.back()` from the full view → `/documents/70` (Aside).

**Export PDF lifecycle** (Aside; `window.print` **stubbed** to fire `beforeprint` then `afterprint` 1.5s later, so no real dialog was opened): `Export PDF` → click → `Preparing…` with `aria-busy="true"` and the hint "Choose Save as PDF as the destination. Keep headers and footers on…" → after `afterprint`: back to `Export PDF`, hint cleared. One print call.

## Finding 1: classic scrollbars + a sideways-overflowing explainer leave a vertical inner scroller (P28.F3)

`measure()` returns the body box. When the framed document overflows **horizontally** and the reader's scrollbars take layout space (Windows Chrome by default; a Mac set to "always show scroll bars", which is the operator's "node" Mac Work profile), the root's horizontal scrollbar takes ~15px of the frame's viewport height. The content then overflows **vertically** by that much, and a vertical scrollbar appears beside the horizontal one.

- CfT headless, prod, fixture 70 with `::-webkit-scrollbar{width:15px;height:15px}` in the child (S10's sanctioned stand-in for classic scrollbars) plus one 3000px-wide block: `sbH 15`, `ih 16,944`, `sh 16,943`, **`maxTop 14`** (`maxLeft 2112`). The same without the scrollbar styling: `maxTop 0`. That one is the overlay case.
- Aside, prod `/documents/70`, `.kb-explainer` at 600px, the same scrollbar styling plus an 8-column `nowrap` table inserted into the child: frame 22,924, child `clientHeight` 22,909, **`maxTop 14`**. `mouse.wheel(0, 300)` over the frame: **page `scrollY` 600 → 600, inner `scrollY` 0 → 14.** The wheel latched into the frame and did not chain to the page. That is the operator's complaint, reproduced.
- How live it is: sideways-overflow scan of the nine public production explainers (CfT, frame-width sweep 1000→358 by 10). Doc 25 starts overflowing at **510**px (a table), doc 26 at **550** (table), doc 27 at **640** (`code`). Docs 28–33 never do. A side-docked DevTools drag on a ~1365px window, which is in the plan's own walkthrough, easily takes the frame below 640.
- It predates P28 (the body-based measure is P25's), and F2 neither caused nor fixed it. It is inside this boundary (the changed file, the reported symptom, the acceptance machine). It may also be what the original report meant by "both vertical **and horizontal**": in this state both bars show.
- **Fix (P28.F3, `fix`/`high`):** in the `REPORTER` string, add the root's horizontal-scrollbar height, `Math.max(0, innerHeight − document.documentElement.clientHeight)`, to `measure()`. It depends on width, not height, so it cannot ratchet. Add one test case (a fake `clientHeight` 15 short → +15). Prove it live with the `::-webkit-scrollbar` stand-in at a frame narrower than the overflow (fixture 70 + an injected wide table) in dev and prod: `maxTop 0` and the wheel moves the page. Optionally fold in F2's residual (the 2px dedupe can leave a frame 1px short after a sub-2px growth) if it is cheap and safe.

## Finding 2: printing a framed explainer silently drops its end (P28.F4)

`kb-print.css` sets `.kb-explainer__frame { height: auto }`, but the island's inline `height: <measured>px` wins. On paper the frame keeps the **screen**-measured height, while the paper column is narrower than a desktop frame (1022px at 1440). The child reflows taller and everything below the screen height is **cut off**, with no warning: the caveat only says the quiz does not work on paper. Round 06's own comment says the full measured height "is what makes the whole document print", and S8's check 19 ("prints in FULL") was answered on fixture 66, whose height barely depends on width (650↔700px). That is why it passed.

| what was printed (CfT headless, `Page.printToPDF`) | frame | pages | result |
|---|---|---|---|
| local prod, fixture 70 public, A4 | 16,918 | 19 | last paragraph printed **101** of 0–119 |
| same, `?view=full`, A4 | 16,918 | 19 | **101** |
| same, US Letter | 16,918 | — | **101** |
| control: loaded at a 600px window (frame measured 22,869), A4 | 22,869 | 26 | **119**, complete |
| **production** doc 30 (`/@leetusik/knowledge/knowledge-system-internals-…`), A4 | 12,710 | 15 | quiz stops **mid-question 3 of 5** |
| **production** doc 33 (`/@leetusik/knowledge/why-knowledge-is-this-way-…`), A4 | 8,508 | 11 | quiz stops at **question 4 of 5** |

The control row proves the mechanism: when the measured height belongs to a width no wider than the paper column, nothing is lost. This defect is in P28 itself (round 06's print half, `P28.S8`). It is live on production now, and it defeats one of the four things the operator asked for ("PDF export") on exactly the content that most needs it.

**Fix (P28.F4, `fix`/`high`; the orchestrator may cut a short research step first):** the measured height must belong to the paper column before print layout happens. The Export PDF island already has a `Preparing…` phase and one animation frame before `print()`, so the natural hook is: size the frame to the print column, request a height (`kb-explainer-request`), await it, then `print()`, then restore on `afterprint`. The ⌘P path cannot await a child post (`beforeprint` is synchronous), so it needs its own answer. One option is an over-estimate at `beforeprint`, at the cost of trailing blank space. Another is to print at the screen width scaled to the column. Another is an honest caveat that says "use Export PDF". Any new or changed paper copy or visual treatment is an **operator decision** (RESPECT THE DESIGN; `kb-print.css` is verbatim, so CSS corrections go only to `kb-record-fixes.css` with authorisation). Validate on real paper: A4 + Letter, fixture 70 and a production-shaped explainer, last line present.

## Regression Checklist (qa `## Regression Checklist`, 11 lines)

| block | lines | inside / outside | result |
|---|---|---|---|
| `docker compose run --rm kb build` / `site_smoke.py` / `explain:recent` marker | 3 | outside: the mkdocs site and `server.documents`; neither is in the diff | not re-run |
| `workflow.py validate` | 1 | inside (always) | pass |
| Graph fit · graph dock tag switch | 2 | outside: `graph-canvas.tsx` / css not in the diff | not re-run |
| Project page Documents panel | 1 | outside | not re-run |
| Document views `?view=full` (member, anonymous, past version; exit pill; Esc; back) | 1 | **inside** | pass (all three routes; Esc and back) |
| Print / Export PDF (masthead + colophon on paper; hint → `Preparing…` → clears on `afterprint`) | 1 | **inside** | **the line itself passes** (masthead `knowledge` · URL · version · printed date, and the colophon, are on paper; lifecycle with stubbed print). **But the paper body is truncated: Finding 2.** |
| Console at 390, no horizontal page scroll | 1 | inside for its document-view part (the reporter feeds those frames) | pass on the doc views (`scrollWidth 390`, navbar on member views); the dashboard/documents/project/graph parts are outside |
| `/login?next=` round trip | 1 | outside | not re-run |

Outside: **7 lines**, by count. The proof is the diff above, which touches only the reporter and its test.

## Operator Questions: routing of the entries added since the first review

The first review's routing (nine walkthrough decisions, cleared 2026-09-21) stands and is not re-litigated.

| entry | route |
|---|---|
| S10 "THE ONE THING BLOCKING THE SCROLL FIX" (doc 60 repro) | **consumed**: answered 2026-10-08, the fix is F2 (already marked). |
| S10 `100dvh` / 26-32-40rem vs 70rem (unmeasured box) + its "no longer on the fix's path" follow-up | **deferred-job candidate** (below). Default: leave round 06's 70rem as signed. It needs a walkthrough line only if the operator wants to take it now. |
| S10 Cloudflare beacon + email obfuscation in every framed explainer | **walkthrough decision at the next passing review** (keep / `no-transform` on the relay / zone-wide off; recommended: relay only), plus a **deferred-job candidate** for the header change so it is not lost if the walkthrough is skipped again. New fact: the relay already answers `cache-control: no-store`, so the change is adding `no-transform` to that header on the raw relay and the versions raw route. |

## Deferred-job candidates (for the orchestrator to file; I did not run `defer-job`)

1. **Title:** Stop Cloudflare rewriting framed explainers: `Cache-Control: no-transform` on the raw relay. **Reason:** Cloudflare edge-injects its Web Analytics beacon (third-party script, runs inside the sandbox, reports private document views by id) and Email Address Obfuscation into `/api/documents/{id}/raw`, so readers do not get the author's byte-exact document. The relay already sends `no-store`; appending `no-transform` there and on the versions raw route is the origin-side lever (unverified against Cloudflare's docs). **Trigger:** the operator picks option (b) at the P28 walkthrough, or the next change to the raw relay routes. **Source:** P28.S10.
2. **Title:** Unmeasured explainer box: 70rem vs round 06's flat per-tier heights. **Reason:** a framed explainer that never reports a height keeps the 70rem (1120px) fallback with an internal scroll, about 2× the old box on a phone. The record-compatible alternative (26/32/40rem) overrules only the token; `100dvh` would contradict round 06 §8 check 8. **Trigger:** a document observed staying `[data-unmeasured]`, or a phone report of an inner scroll on an unmeasured frame. **Source:** P28.S10.

No outside-boundary observations this round.

## Runtime left behind

- Up, as found: `kb-p28s2-pg`, uvicorn `:8766`, `next dev :3030`.
- Stopped: the `:3040` standalone server and Chrome for Testing (`:9555`). The scratch profile and PDFs are in the session scratchpad only.
- Dev DB: fixture **doc 70** `p28review-reflow-probe` (p28s5 / research, public, synthetic lorem, `commit: false`) **kept** for F3/F4. Credential `p28review-repro` **revoked**. `web/.next` holds this build, with `static`/`public` links in `standalone/` (gitignored).
- Repo: no product file touched. `git status` shows only `works/` files.

## Notebook edits (`phase.md`)

`## Decisions`: two measured lines (findings 1 and 2). `## Operator Questions`: one appended routing line. `## Notes for later slices`: F2's review note consumed and replaced by one F3/F4 repro note. `## Now`: rewritten. `## Doc impact`: nothing added (no durable truth changed).
