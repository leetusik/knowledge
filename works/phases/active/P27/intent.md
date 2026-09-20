# Intent — P27

- Captured at: 2026-09-21T02:07:49+09:00
- Origin: operator

## Original Input (verbatim)

> we gonna do visual improvement work. /create-phase
> ---
> 1. gonna improve overall. you may sweep yourself.
> 2. need mobile, tablet, and pc view upgrade. 
> 3. graph broken, and need list of documents when clicked a project
> 4. HTML only view needed and pdf export also needed.

_Answers given during intent capture, word-for-word (the same request created P27 and P28; each carries the full original):_

> Graph — "you see it some wires off the frame"; then "Member /graph, desktop", "Public /@leetusik/graph", "i didn't check my phone. and they default off the frame."
> Project → docs — "Member project page (Recommended), Graph legend"
> HTML view — "Chrome-less full window (Recommended)"
> Design style — "1. note that we are on the new account. should make design system itself first."; then "Yes, design-only + system first (Recommended)"
> Devices — "iPhone Safari, iPad Safari, Mac Chrome, but iphone and ipad also chrome"
> Mockup — "Sign on the cards (default)"
> Browser instrument — "you can use aside" / "use u1"

## Confirmed Intent (refined + clarified)

**This is the design half of a `design-only` pair (P27 design → P28 apply).** It produces signed, immutable design rounds and no product code.

- **Re-make the design system itself first.** The operator is on a **new Claude Design account**; the old project (`f49ab425-…`, rounds 01/02) is not where new rounds will live. Round 1 therefore re-establishes the Knowledge design system in the new account from the real repo via Connect GitHub — the shipped tokens and console layer (`web/src/app/kb-tokens.css`, `web/src/app/kb-console.css`, the P12 handback under `web/design/canvas/`) — and adds the **responsive foundation** the system never had: breakpoints, a phone navigation pattern for the rail/topbar, topbar behaviour under narrow widths, tables and panels on small screens. Surface rounds follow; `DECOMP` decides the round count and records the build inventory in `phase.md`.
- **Surfaces in scope** (the build-inventory seed; one line each, the design may add or cut):
  - app shell — topbar + rail (member) and the public shell (anonymous) at phone / tablet / desktop
  - dashboard (stat tiles, trend, projects table, org keys, create-project, org-slug panel)
  - project page **with a documents list** — today it shows info + credentials + usage only; the data already exists (`GET /app/documents?project=`) and nothing links to it
  - documents browse / search / pager
  - auth pages (login, signup)
  - graph at three viewports — legend / info panel / zoom-cluster placement (the legend covers a third of the plate at 390px), **project click in the legend → that project's document list in the panel**, node identification given P22's selection-only labels, and the operator-reported **wires off the frame by default** on member `/graph` and public `/@leetusik/graph`
  - document view (member, public, past version) with a **chrome-less "HTML only" view** affordance (the explainer alone, full window, no topbar/rail/metadata) and an **Export PDF** affordance whose **print appearance** is designed
  - the overall sweep: anything else the design system round finds inconsistent across the console
- **Out of scope:** the landing page rounds 01/02 stay untouched unless the sweep finds real breakage (report it; do not redesign); server-side PDF rendering (deferred **D25**); a console dark scheme unless the design-system round decides it.
- **Facts the handoff states as inputs, never as decisions:** the responsive gaps (fixed 15rem rail, non-wrapping topbar, hard two-column dashboard grid, fixed-size graph overlays, no `error.tsx`, one width media query in the whole app); the graph defects (persisted session-storage view restores `auto:false` zoom/pan across reloads and plate-size changes; node URLs are id-based so anonymous clicks hop twice or bounce to login; tag pills link to the session-gated documents page, see D18; the empty-data path returns before sizing); the **sandbox constraint** — an HTML-only view must keep the `sandbox allow-scripts` CSP / opaque origin, never raw HTML on the app origin; PDF export is a **browser print pipeline** (HTML-only view + print stylesheet + Export button → `window.print()`), so the design covers what prints.
- **Runtime manifest.** `## Operator Runtime` is absent from the operations doc, and every browser-verifying slice halts without it. `DECOMP` cuts the phase's first slice (`--kind docs --risk low`) to seed it via `doc-new-version --doc operations` from the facts under *Notes*.

## Clarifications Resolved

- Q: What is broken on the graph? — A: "you see it some wires off the frame" → seen on member `/graph` (desktop) and public `/@leetusik/graph`; phone not checked; "they default off the frame". Not reproduced through Aside at 1440×900 / dpr 1 (fits fresh, settled, tags on/off); hypotheses: persisted view, Retina dpr or window size on the operator's Mac.
- Q: Where should clicking a project show its documents? — A: member project page **and** the graph legend.
- Q: What does "HTML only view" mean? — A: the chrome-less full-window explainer (not a source/download view).
- Q: Design style? — A: `design-only`, with the design system itself re-made first because "we are on the new account".
- Q: Devices/browsers for verification? — A: iPhone (Safari + Chrome), iPad (Safari + Chrome), Mac Chrome.
- Q: Runnable mockup before signing each round? — A: sign on the cards (default; a mockup can still be asked for in any round).
- Q: Browser instrument and profile? — A: Aside, account `u1`.
- Q: PDF mechanism? — recommended and not objected to: print pipeline now, server-rendered PDF deferred (D25).

## Design Style

`design-only` — the design is big (a responsive foundation, net-new surfaces, then a consistency sweep) and the design system must be rebuilt in the new Claude Design account before any surface round; the apply work is its own phase, P28.
Mockup: on request

## Notes

- **Runtime manifest facts** (for the first slice to seed `## Operator Runtime` in the operations doc): dev runtime `pnpm --dir web dev` → `http://127.0.0.1:3030` (API per the operations doc's *Web app local build/run (P12)* section); production and **acceptance origin** `https://knowledge.hi2vi.com`; devices iPhone (Safari + Chrome), iPad (Safari + Chrome), Mac Chrome; viewports 390×844 (phone), 820×1180 and 1024×768 (tablet, both orientations), 1280–1440 wide (desktop); Aside agent account **`u1`** (`aside repl --account u1 "<js>"`). Caveat raised with the operator: `u1` currently holds a signed-in admin tab for another product of theirs; `u2` is signed out and cleaner — the operator chose `u1`.
- **Aside repl sharp edges seen this session:** no viewport API on `page` (no `setViewportSize`; narrow widths via Chrome device emulation, real devices, or constraining the document as an approximation); `getByRole('button', 'Zoom in')` takes a string, not an options object; `sleep(ms)` is global (no `page.waitForTimeout`); screenshots must use a relative path and land in `~/.aside/u/1/sessions/<id>/`; each CLI call is its own session and its tabs close at the end, so open the page inside the call and never attach to `tabs[0]` blindly (that once attached to the operator's unrelated admin tab).
- **Acceptance gate** (declared by the orchestrator right after `finish-slice P27.DECOMP`): waive with the fixed note `design-only, no mockup: the operator signed the round on the card set` — re-declare `--require` if the operator asks for a mockup in any round.
- **Round numbering and record:** continue the repo's tree — `web/design/rounds/03-<slug>/`, `04-…` — `handoff.md` + read-only `output/` + `SIGNOFF.md`; cards stay in the new Claude Design project, whose id the operator supplies at the first return.
- Sibling phase: **P28** (apply). Related deferred jobs: D18 (login returnTo + public tag surface — absorbed or promoted in P28), D22 (prettier drift — never `prettier --write` existing web files), D25 (server-rendered PDF).
