# Intent — P28

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

**This is the apply half of a `design-only` pair (P27 design → P28 apply).** It runs only after every P27 round is signed; its `DECOMP` reads the landed records (`web/design/rounds/03-…/output/build-prompt.md` and each later round's) as the implementation contract under **RESPECT THE DESIGN** — never drop, simplify, restyle, or "improve" an approved element.

- **Order of work** (for `DECOMP`, not pre-cut here): backing/groundwork first, then the design implementation per surface, then fidelity + functional sweep.
  - **Groundwork / graph fixes** (functional, not visual): emit `canonical_path` node URLs from `server/graph_api.py` instead of `/documents/{id}`; anonymous-safe tag links on the public graph (absorbs or promotes **D18**); size the canvas before the empty-data short-circuit; an `error.tsx` for the app routes; diagnose and fix the **wires-off-the-frame default** the operator sees on member `/graph` and public `/@leetusik/graph` (first reproduce it in the operator runtime on their Mac — check the persisted session-storage view and the Retina/dpr path).
  - **Design implementation**: the responsive shell (rail/topbar + phone navigation), dashboard, project page with its **documents list** (member page) and the **graph legend project click → document list in the panel**, documents browse/search, auth pages, public shell, graph at three viewports, document views.
  - **Chrome-less HTML-only view**: a route that shows the explainer alone, full window, keeping the `sandbox allow-scripts` CSP / opaque-origin relay and adding the per-path `next.config.ts` X-Frame-Options exemption where framing is involved — never raw HTML on the app origin.
  - **PDF export as a print pipeline**: print stylesheet + an Export PDF control that calls `window.print()` on the HTML-only view; the designed print appearance is the spec. Server-rendered PDF stays deferred (**D25**).
  - **Fidelity + functional sweep**: every changed surface at the manifest viewports (phone 390×844, tablet 820×1180 / 1024×768, desktop 1280–1440), in the operator runtime and the production build, driven with Aside (`aside repl --account u1`) or the fallback real browser; every visible control does something, interaction states, liveness over time.
- **Acceptance gate:** `--require` — the operator walks the running product on phone, tablet, and desktop before the review can pass.
- **Out of scope:** new visual decisions (a gap in the record goes on `## Operator Questions`, never a silent fix); landing page rounds 01/02; server-side PDF.

## Clarifications Resolved

- Same eight Q/A pairs as P27's `intent.md` (graph symptom and routes; project click → member project page + graph legend; HTML-only = chrome-less full window; `design-only` with the design system first; devices iPhone/iPad in Safari + Chrome and Mac Chrome; sign on the cards; Aside account `u1`; PDF via print pipeline, server render deferred as D25).

## Design Style

`design-only` — this is the apply phase of the pair; P27 holds the signed rounds, and this phase's `DECOMP` cuts the build from them.
Mockup: on request

## Notes

- Depends on **P27** reaching `done` (every round signed). Do not decompose before then.
- The runtime manifest (`## Operator Runtime`, operations doc) is seeded by P27's first slice; if it is still absent when this phase starts, the first browser-verifying slice returns `needs_operator` and stops.
- Related deferred jobs: D18 (absorb or promote here), D22 (prettier drift — never `prettier --write` existing web files inside a slice), D25 (server-rendered PDF).
- Standing web gates: `pnpm --dir web typecheck · lint · test · build`; no CI gate for `web/` (qa doc). Canvas graph behaviour has no automated coverage — the sweep is the check.
