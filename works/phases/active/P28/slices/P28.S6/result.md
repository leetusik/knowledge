# P28.S6 — result

- **status:** done
- **summary:** Round 05's graph engine applied (§§4.1–4.9, §5, §6, §7) after two prerequisites the plan
  ordered first: the stylesheet cascade was fixed by moving `graph-tokens.css` + `graph.css` into the
  `globals.css` chain (all twelve measured collisions resolve; `.kb-graph` goes 636px/480px → 660px/352px),
  and the D26 off-frame defect was **reproduced on a seeded 33-doc / 100-tag / 6-project corpus shaped like
  the operator's and diagnosed**: `fit()` clamped its zoom up to `FIT_Z_MIN = 0.5` when the corpus needed
  0.284 (desktop) / 0.135 (phone), so the map could not fit, and the 64px fixed pad compounded it on short
  plates. Replacing both with §2's proportional `--kb-graph-fit-pad` takes the same corpus from wires off the
  frame to **0 nodes off the plate** with the record's exact 8% margin. All ten of round 05 §8's acceptance
  checks were exercised in the operator runtime with Aside and re-confirmed in the production build.
- **files_changed:**
  - `web/src/app/globals.css`
  - `web/src/app/(app)/graph/graph-canvas.tsx`
  - `web/src/app/(app)/graph/page.tsx`
  - `web/src/app/(app)/graph/loading.tsx`
  - `web/src/app/(public)/[org]/graph/page.tsx`
  - `web/src/app/(public)/graph/[org]/page.tsx`
  - `web/src/content/graph.ts`
  - `web/src/lib/knowledge/types.ts`
  - `works/phases/active/P28/phase.md`, `works/phases/active/P28/slices/P28.S6/result.md`
- **validation:**
  - `pnpm --dir web typecheck` — pass
  - `pnpm --dir web lint` — pass
  - `pnpm --dir web test` — pass (17 files, 113 tests; no new test file — round 05 needed no `?next=` shape
    the existing 25 cases do not already cover, see *§5 / D18* below)
  - `pnpm --dir web build` — pass (standalone)
  - `python3 scripts/workflow.py validate` — pass (pre-existing warnings only)
  - Round 05 §8 acceptance checks 1–10 — all exercised, table below
  - Real browser: **Aside, `aside repl --account u1` over Bash**, in the manifest runtime
    (`pnpm --dir web dev` → `http://127.0.0.1:3030`, API `127.0.0.1:8766`) **and** in the production build
    (`pnpm --dir web build` → standalone `node server.js` on `127.0.0.1:3040`)
- **deviations:** four, all recorded below under *Readings of the record* — the cascade resolution chosen over
  S4's alternative, the `projectIds` prop that §9's collected-edits table did not anticipate, the gate line's
  `?next=` target, and `loading.tsx` adopting §6.7. None is a visual decision; the four record gaps found are
  reported, not filled.
- **doc_impact:** one line appended to `phase.md` (`frontend.md` + `experience.md` + `product.md`).

---

## 1. The cascade: what was chosen, and the before/after

S4 left the measured problem: `graph-r5.css` is imported from `globals.css` (document sheet **0**) while
`graph-tokens.css + graph.css` were **component** imports on `graph-canvas.tsx` (sheet **2**), so at equal
specificity the sheet round 05 is written to layer *on top of* was out-ordered by the one underneath it.

**Chosen: move `graph-tokens.css` and `graph.css` into the `globals.css` chain, immediately before
`graph-r5.css`, and drop the two component imports.** Reasons, in the order they decided it:

1. It puts all three in one sheet **in round 05 §3's own stated order**, with **no rule duplicated**. S4's
   alternative (re-import `graph-r5.css` from the component after `graph.css`) also restores the order but
   ships a second copy of a 18 KB sheet and leaves two sources of truth for every rule.
2. It changes only *where the imports live*. The three files are byte-identical records and were not touched.
3. **Round 06 §1 already assumes it** — it writes the chain as `… kb-console-r4.css → graph-tokens.css →
   graph.css → graph-r5.css → kb-docview.css …`, i.e. it expects `graph.css` in the globals chain. S7/S8
   inherit a chain that already matches their contract.
4. It is provably side-effect-free outside the graph: `graph-tokens.css` declares **only** `--kb-graph-*`
   custom properties (checked: zero non-`--kb-graph-` declarations), and `graph.css` has **zero** selectors
   outside the `.kb-graph` namespace (checked). The cost is the ~29 KB of graph CSS now parsed on every page,
   which round 06 priced in.

**Measured, dev runtime, `/graph` at 1440×900:**

| | before | after |
|---|---|---|
| `.kb-graph` computed `height` | **636px** (`graph.css`: `100dvh − topbar − 13rem`) | **660px** (round 05 §3's `clamp(22rem, 100dvh − topbar − 11.5rem, 52rem)`) |
| `.kb-graph` computed `min-height` | **480px** (`graph.css`: 30rem) | **352px** (round 05 §3: 22rem) |
| document stylesheets | 4 (globals 0, app-frame 1, **graph chunk 2**, inline 3) | 3 (globals 0, app-frame 1, inline 2) — the graph chunk is gone |
| same-selector/same-property collisions losing to `graph.css` | **12** (enumerated live through the CSSOM) | **0** — one sheet, source order decides |

The twelve, for the record (S4 counted nine; these are rule-level, so `.kb-graph`'s height/min-height counts
three times — base plus the two `kbapp` tiers):

```
.kb-graph                     [top]                             -> height, min-height
.kb-graph                     [kbapp < 40rem]                   -> height, min-height
.kb-graph                     [kbapp 40–64rem]                  -> height, min-height
.kb-graph .kb-graph-zoom__btn [kbgraph < 52rem]                 -> width, height, font-size
.kb-graph .kb-graph-tooltip   [kbgraph < 34rem]                 -> display
.kb-graph .kb-graph-panel     [kbgraph < 34rem]                 -> width, padding-*, top, right
.kb-graph .kb-graph-panel__close  [kbgraph < 34rem]             -> font-size
.kb-graph .kb-graph-panel__title  [kbgraph < 34rem]             -> font-size
.kb-graph .kb-graph-panel__tags   [kbgraph < 34rem]             -> row-gap, column-gap
.kb-graph .kb-graph-panel__read   [kbgraph < 34rem]             -> font-size
.kb-graph .kb-graph-panel     [kbgraph 34–52rem]                -> width
.kb-graph .kb-graph-legend    [kbgraph 34–52rem]                -> width
```

All twelve now resolve to round 05. Spot-confirmed after the move: the plate's two sizing declarations
(above), `.kb-graph-zoom__btn` 44×44 at a <52rem plate, `.kb-graph-tooltip { display: none }` at a <34rem
plate, `.kb-graph-panel` 272px (17rem) large / 240px (15rem) medium / full-width sheet small, and
`.kb-graph-legend` 160px (10rem) at a medium plate. The dev server was confirmed **not deaf** before any of
this (the new rules were curl'd out of the served chunk, per S4's note).

## 2. D26: reproduced, then diagnosed, then fixed

**The corpus.** The operator's screenshots show 6 projects (20/5/4/2/1/1 docs), 100 tag hubs and several
weakly connected outliers. `p28s5`'s six documents cannot reproduce that, so a fixture tenant **`p28s6`** was
seeded through the real API to the same shape: **33 docs / 100 tag hubs / 3 unresolved ghosts / 6 projects
(20·5·4·2·1·1) / 136 nodes / 161 edges**, a dense related-linked `changple5` core plus four outliers each
hanging off a single long edge. Details under *Fixtures* below.

**Reproduced first, on the unchanged engine** (cascade already fixed, so the plate was round 05's):

```
plate 1121 x 658      content extent at rest 1432 x 1866 world units
stored view record    { v: (none), view: { zt: 0.5, pxt: 0, pyt: 0, auto: true } }
```

`0.5` is exactly `FIT_Z_MIN`. The zoom that actually fits is
`min((1121−128)/1432, (658−128)/1866) = min(0.693, 0.284) = 0.284`. At the clamped `0.5` the content paints
**933px tall into a 658px plate** — 275px, 42% of the content height, off the frame, horizontally fine.
That is the operator's desktop screenshot precisely: centre legible, long edges running out through the top
and bottom boundary. A screenshot of the reproduction is in the scratchpad; the visible signature is a single
wire entering at the top-right corner and leaving at the bottom-left.

The phone case falls out of the same arithmetic: a 322×416 phone plate needs `z = 0.135`, so the clamp
inflates it **3.7×** — which is why the phone screenshot is so much worse than the Mac one, and why the
symptom "degrades sharply as the plate gets shorter".

**The ranked hypotheses, settled.**

- **(1) the fit runs before the sim settles — DISPROVEN.** `render()` already calls `fit(true)` on *every*
  settling tick while `view.auto`, and once more at `alpha <= ALPHA_MIN`. The fit does re-run; it simply
  could not go low enough. No re-fit or deferred fit was needed, and none was added.
- **(2) the fit is computed on the cluster, not the full extent — DISPROVEN.** `fit()` already takes
  `min/max` over every visible node.
- **(3) aspect ratio / fixed pixel padding — CONFIRMED as a compounding cause.** `FIT_PAD = 64` px per side
  is 40% of a 322px phone plate's width before a node is drawn.
- **(4) a persisted view restored into a differently-sized plate — not the cause here** (the reproduction had
  no stored record), but §4.2's new guard closes it anyway; proven separately below.

**Plus the one the note did not rank, which is the actual root cause: the zoom FLOOR.** `FIT_Z_MIN = 0.5`
clamped the fit *upward*. A fit that may not go below 0.5 is not a fit.

**The change** (`graph-canvas.tsx`): `FIT_PAD`/`FIT_Z_MIN` are gone; `fit()` now uses
`usable = 1 − 2 × --kb-graph-fit-pad` (§2's own token, proportional by construction) and clamps only with a
degenerate floor (`0.01`) and the **unchanged** ceiling `1.5`. The ceiling is kept deliberately: a two-node
map should not be blown up to fill a desktop plate, and `1.5` is the shipped value.

**Measured after, same corpus, same plate, first paint:**

```
z 0.2962   content on screen 424 x 553 in a 1121 x 658 plate
nodes outside the plate 0   worst overflow 0px
553 / 658 = 0.840 = 1 − 2 x 0.08   <- the record's 8% margin, exactly, on the binding axis
```

Identical in the production build (`z 0.2962`, `offframe 0`).

## 3. Round 05 §8 — the ten acceptance checks

Instrument: **Aside `repl`, `--account u1`**, dev runtime; every layout-only number below is a *computed*
value or a measured rect, never an eyeball. Narrow viewports use S2's same-origin iframe harness at a true
CSS viewport; **the harness does not hydrate React**, so where a check needs the engine at a narrow width the
engine-built markup was transplanted into the harness (S3's technique) or the plate itself was narrowed at
top level so the real `ResizeObserver` and the real container queries fired. Each row says which.

| # | Check | Result | How |
|---|---|---|---|
| 1 | **390 portrait** — plate 26rem, no legend on the plate, dock under it as one scrollable row of ≥44px pills, Fit-only zoom stack round and raised, tap → sheet ≤60% with the node above it | **pass** | Harness 390×844: plate **356×416px = 26rem**, legend `display:none`, tooltip `display:none`, page does not scroll (844 = 844). Dock (real markup transplanted): `display:block`, one row (`overflow-x:auto`, scrollWidth 986 > clientWidth 356, single line), **all 8 pills exactly 44px**, note present. Sheet: full width, `max-height:60%`, actual **0.596 of the plate**, flush to the plate's bottom edge after its reveal animation, `border-width: 1px 0 0`, top-only radius, `overflow-y:auto`, doc rows 56px, close 44×35, foot items 44px. Zoom stack + node park measured **live** by narrowing the plate itself to 354×414 (22.1rem) at top level: `in`/`out` `display:none`, `fit` **44×44, border-radius 50%**, stack background transparent with no border; tapping a node parked it at **0.381** of the plate height (`--kb-graph-fit-bias` = 0.38) with the sheet top at 0.511 |
| 2 | **390 landscape (844×390)** — nothing off-screen, the page scrolls | **pass, with the record's own unreported case confirmed** | Harness 844×390: plate 799×**480px**, nothing clipped horizontally, **the page scrolls** (740 > 390) — the old "480px plate in a 332px hole" is gone. Two notes: the plate is **30rem, not the 26rem §8 item 2 predicts**, because §3 keys the phone height on `kbapp` *width* < 40rem and a landscape phone is 844 wide (record prose vs. record stylesheet — the verbatim stylesheet wins and was not edited); and **the Fit control is 254px below the fold** (measured: Fit button top 644 in a 390-tall viewport), which is exactly the case round 05 flagged as real and unreported. Reported, not fixed |
| 3 | **768** — plate 30rem, legend on the plate at 10rem, zoom 44px, panel 15rem, everything inside the plate | **pass** | Harness 768×1024: plate 723×**480px = 30rem**; `.kb-graph-legend` computed **width 160px = 10rem**; `.kb-graph-zoom__btn` 44×44 (`kbgraph < 52rem`); `.kb-graph-panel` computed **240px = 15rem** (`kbgraph 34–52rem`); `.kb-graph__ui { max-width/max-height: calc(100% − 28.8px) }` caps every overlay to the plate. Page does not scroll |
| 4 | **1180** — today's desktop arrangement plus the collapse caret, up to eight always-on labels, panel capped with internal scroll | **pass** | Harness 1180×820: plate 1126×**580px** = the §3 clamp (820 − 56 − 184). Caret + collapse verified live (row below). Panel: `max-height/max-width: calc(100% − 28.8px)`, `overflow-y:auto`, width **272px = 17rem**, bottom inside the plate. Landmark labels: a full-frame canvas diff between `--kb-graph-label-cap: 8` and `0` (each after a tier round-trip so `computeLandmarks()` re-ran) differs by **16,018 px (2.18% of the plate)** — the landmarks are drawn and the token governs them |
| 5 | **The lens** — a project click dims the map *and* fills the panel; click again clears both | **pass** | Live: clicking `knowledge` lights it in the legend **and** the dock (`is-on`, `aria-pressed=true`), marks the other five `is-off`, and opens project mode — eyebrow `Project`, title `knowledge`, count **"5 documents · 4 links"** (5 doc nodes; 4 `related` edges with both ends inside — the fifth edge bridges to `changple5` and is correctly excluded), five rows newest-first, foot `All documents →` / `Open project →`. Clicking it again closes the panel and clears the lens. §4.4's other three rules too: selecting a node switches to node mode and **leaves the lens lit**; clicking the lit control then **returns project mode**; `Esc` closes the panel and the lens stays |
| 6 | **Restore** — pan + reload returns the view; a plate past 52rem refuses and fits; neither is off-frame | **pass** | Same plate: pan → reload restores `{auto:false, zt:0.2962, pxt:166, pyt:97.5}` byte-for-byte. All three guards probed by mutating the stored record and reloading: **plate-width mismatch** (`w × 0.8`), **node-count mismatch** (`n + 1`) and **version mismatch** (`v: 1`) each ignore a stored `{auto:false, zt:0.6, pan 200/−150}` and fit instead (`auto:true, zt:0.2961, pan 0`). Also verified live: collapsing the rail (plate 1121 → 1329, same tier) **keeps the zoom and translates the pan 166 → 196.8 = 166 × 1329/1121**, §4.2's centroid-fraction rule to the decimal |
| 7 | **Off the map** — pan until the field leaves the plate → the pill; Fit → gone, 8% margin | **mechanism pass; the trigger is unreachable — see finding F1** | The pill renders and works: forced into the state (by raising `--kb-graph-offmap-min` through the token the engine reads, then zooming to max and panning to saturation) it appears as a **193×40** pill at the plate's top with §6.6's copy and its Fit button, and pressing that Fit hides it and returns `auto:true, zt:0.2976`. But the 15% condition **cannot be reached by panning**: `clampPan()` bounds the pan to ±(plate × zoom)/2, so at fit zoom a saturated pan (pxt 166 = W·zt/2, pyt 97.5 = H·zt/2) still leaves **100%** of doc nodes on the plate, and at maximum zoom with a saturated pan it leaves **80.6%**. Never on first paint: confirmed hidden |
| 8 | **Public** — a node opens the panel, the read link points inside `/@{org}` or is the gate, a tag pill lenses and navigates nowhere | **pass** | Signed out, `/@p28s6/graph`: only the 2 public projects in the legend, Sign in in the topbar, `.kb-app-layout` one `1440px` track (§3's shell line — no rail). Tapping a node opens the panel with read link **`/@p28s6/changple5/probe-doc`** (200) — the pretty `canonical_path`, no `publicBase` prefixed. Tag pills are `<button aria-pressed>` with **no href**; clicking one sets `activeTag: "alpha"`, `aria-pressed=true` and **does not navigate** (`location.href` unchanged) — D18's tag half. Public project mode has **no foot** (§4.6) and its rows use pretty paths. Lighting the project lens **cleared the tag lens** (mutual exclusion). The gate (§6.4) verified by a temporary probe forcing `isPublicDoc → false` (reverted, file byte-diffed back): it renders `Members only · 비공개 문서` + `Sign in to read →` with `href="/login?next=%2F%40p28s6%2Fchangple5%2Fprobe-doc"`, the read link disappears, and following it **through a real login lands on the document itself** (`/@p28s6/changple5/probe-doc`, h1 "Probe doc"). Third route too: the legacy `/graph/{uuid}` 307s to `/@{org}/graph` for a slugged org, and for a deliberately slug-less fixture tenant it renders with `publicBase="/graph/{uuid}"`, stranger's panel, read link falling back to `/documents/62` (200 anonymously) |
| 9 | **Dark** — plate `#16130f`, slate inks, overlays match; flip the OS mid-session and it re-inks | **pass** | OS flipped to dark **while the tab was open** (osascript, restored immediately after): the canvas pixel went `239,233,219` → **`22,19,15` = `#16130f`**, `--kb-graph-canvas` `#efe9db` → `#16130f`, `--kb-graph-dim` `.16` → `.22`, legend background `rgb(255,254,250)` → `rgb(35,32,25)`; flipping back re-inked to `#efe9db`. This is §4.9's one engine change working — no attribute changes on an OS flip, so the existing MutationObserver never fires; the new `matchMedia("(prefers-color-scheme: dark)")` listener is what drives the re-read |
| 10 | **Empty, loading, failed** — each inside the plate with the frame intact; empty paints at the right size | **pass** | **Empty** (a genuinely empty fixture tenant): `canvas.width/height = 1329×658` matching the plate — §4.1.2's fix, the canvas is now sized **before** the early return where it used to be 0×0 — plus the designed copy and the new single primary action `Add a document → /documents`, inked `#fbfaf5` by §6's button rule rather than graph.css's teal-on-teal. **Loading**: caught on a real client-side route transition into `/graph` — §6.7's markup, `Drawing the map · 지도를 그리는 중`, one pulsing dot (`animation-name: kb-graph-pulse`), **zero skeleton nodes**, plate at its real 658px. **Failed**: forced by a temporary probe throwing inside `start()` (reverted, byte-diffed back) — renders **in the plate** with `.kb-pageframe` intact above it, §5's copy, two actions (Try again primary / Go to documents secondary, each with its own ink), `GET /app/graph · TypeError` in `__detail`, and **zero** `.kb-editorial` on the page |

Also verified outside the numbered list: the legend collapse (§4.3) — `aria-expanded` toggles, the body
folds, the caret rotates −90°, and `legendOpen: false` **persists across a reload**; the tag switch re-fits
when `view.auto` (zt 0.2962 → 0.9245 with the 100 tag hubs hidden) and its state **mirrors between legend and
dock**; §4.1.3 — collapsing the plate to zero height does **not** fit or persist a degenerate size, and the
first real size re-fits cleanly (0 off-frame); the member graph's tag pills are still `<a href="/documents?tag=">`
links; §4.5.2's zoom rule (canvas ink 14.1k → 23.3k → 36.0k as display zoom crosses 1.3 then 1.69, and
`zt 0.5006 = fitZoom 0.2962 × 1.69` exactly). Dashboard, documents, login and the public document view were
smoke-loaded after the cascade move and are unchanged.

## 4. Readings of the record (deviations), and the four gaps found

**Four readings acted on — none is a visual decision.**

1. **The cascade resolution.** §1 names `graph-canvas.tsx` as `graph-r5.css`'s import site; S4 measured that
   loading it there loses. Resolved by moving the two records it sits on *up* to it rather than moving it
   *down*, for the four reasons in §1 above — chiefly that round 06 §1, the later signed round, already
   writes the chain that way.
2. **`projectIds` — a prop §9's table did not anticipate.** §6.3 draws project mode's foot as
   `/documents?project={id}` and `/projects/{id}`, and **both need a project UUID**: the documents filter is
   parsed as a UUID server-side (a name 422s) and `/projects/{id}` obviously so. `/app/graph`'s `projects`
   carry only `{name, docs}`. §9's collected-edits table says `(app)/graph/page.tsx` does not change, but the
   alternative was to drop two designed links. The member page now takes the map from `listProjects` on a
   **second parallel fetch that cannot take the map down** (`.catch(() => [])` — a failure drops those two
   links and nothing else, exactly the shape round 04 §4.6's documents panel uses). §4.4's "No new endpoint,
   no new fetch" is honoured where it is written — project mode's **rows** still come from the payload the
   page already has. Public pages pass nothing; a stranger has no foot at all.
3. **The gate's `?next=` target.** §6.4 writes `/login?next={publicBase}/documents/{id}`. `P28.DECOMP` already
   recorded that `/@{org}/documents/{id}` **is not a route this app has** (it resolves as project
   `documents` and 404s), and repaired the *read link* by preferring `canonical_path`. The same repair is
   applied to the gate, for the same reason and through the same single builder: a `next` that 404s after
   login is not a return address. Emitted value: `/login?next=/@{org}/{project}/{slug}`, which is the shape
   `safeNextPath` accepts (`web/tests/next-path.test.ts` already covers `/@acme/handbook/onboarding`
   verbatim, so **no new test case was needed** — the plan's one exception did not apply) and which was
   proved to complete the round trip end to end. Never an origin, never a `publicBase` prefix.
4. **`loading.tsx` adopts §6.7 and stops quoting a height.** It used to carry `graph.css:27`'s height as an
   inline style because `graph.css` was a component import it must not pull in; that copy is now wrong (the
   plate is round 05's) and unnecessary (the sheet is global). The skeleton now simply wears `.kb-graph` —
   inheriting the phone/tablet `@container` heights a copied `clamp()` never could — and renders §6.7's
   loading block, which is the only place in this app where "the payload is not yet resolved" is a real
   moment.

**Four record gaps found — reported, not filled** (all four are also on `phase.md`'s `## Operator Questions`):

- **F1 — §4.2's off-map threshold is unreachable.** `--kb-graph-offmap-min` is 15% of doc nodes on the plate,
  but the engine's pre-existing `clampPan()` bounds the pan to ±(plate × zoom)/2, so once the fit is correct
  the content cannot be pushed off: **100%** of doc nodes remain on the plate at a saturated fit-zoom pan and
  **80.6%** at maximum zoom with a saturated pan. The pill is built, correct, armed and proven to work when
  the state is entered; §4.2's own restore guard closes the other route into it. §8 item 7's "pan until the
  field leaves the plate" cannot be performed. Nothing was changed to make it reachable — loosening
  `clampPan` would be a new interaction decision.
- **F2 — §4.5.1's always-on landmark labels are illegible at a real fit zoom.** `drawLabel` scales the font
  by the world zoom (correct for a world-space renderer), so at this corpus's fit zoom of 0.296 the eight
  landmark titles paint at `12.5 × 0.296 ≈ 3.7px` — a grey smudge in the middle of the map, visible in the
  screenshots. Before this round the rule was selection/hover-only, where you had already zoomed in; §4.5.1
  is the first rule that labels without being asked, and the corrected fit is the first time the fit zoom
  goes this low. The record gives landmarks no size of their own. **Not changed** — a minimum label size is a
  visual decision. The one-line shape of the fix, if the operator wants it: floor the label scale in
  `drawLabel` (e.g. `Math.max(z, 0.8)`), or make the floor a token.
- **F3 — §4.8's loading and failed rows describe an engine that fetches its own payload.** This one receives
  `data` as a prop from a server component, so "the payload is not yet resolved" belongs to the route
  (`loading.tsx`, where §6.7 now lives) and "the fetch rejects" is caught by the route's error boundary long
  before the engine runs. §9 forbids changing `(app)/graph/page.tsx`, so the fetch was **not** restructured.
  The failed state is built with §5's copy and §4.8's detail line and is wired to the one failure that is
  still the engine's — a model build that throws — which is proven to render in the plate with the page frame
  intact. Making it catch a *fetch* failure means changing `page.tsx`.
- **F4 — §7's "every control ≥44px on a small or medium plate" overreaches §3's own stylesheet.** The panel's
  close button measures **44×35** at 390, because round 05 §3 itself sets
  `.kb-graph-panel__close { min-width: var(--kb-tap); min-height: 2.2rem }`. Everything else §7 names does
  measure ≥44 (dock pills 44, Fit 44, read link 44, document rows 56, foot items 44). Same shape as round 03
  §8 item 3's account avatar and round 04 §9 item 4's `--sm` buttons: prose overreaching a verbatim signed
  sheet. Not fixed.

**Also observed, not a gap and not acted on:** the graph page is not wrapped in `.kb-page-flow`, although
§4.3 describes the dock as "a sibling of `.kb-graph` inside `.kb-page-flow`" and round 04 §4.1 makes every
other console page one. Round 04's page work was `P28.S4`'s and it did not wrap this page. The dock carries
its own `margin-top: 0.55rem`, so the rendering is right either way; flagged for `P28.S9`'s seam sweep.

## 5. What is *not* verified by this slice's instrument

Per the plan's instruction to name the seam rather than paper it:

- **Touch.** Every interaction above was driven with a mouse at top level, or measured in the harness where
  React does not hydrate. Nothing was verified with a real finger: the dock's horizontal thumb-scroll, the
  sheet's internal scroll under a touch drag, pinch-to-zoom and double-tap on the small plate (§3's own
  justification for dropping the +/− buttons), and iOS Safari's handling of the sheet.
- **A phone-sized plate driven interactively at a phone-sized *page*.** The two phone-and-interactive checks
  that matter — the dock's lens wired to the same state as the legend, and the sheet's park bias — were each
  verified live, but by narrowing **the plate** at a 1440-wide page (so the real `ResizeObserver` and the
  real `kbgraph` container queries fired) rather than at a 390-wide page. `kbmain`-keyed behaviour (whether
  the dock is *shown*) was verified in the harness by computed style, not by clicking it at 390.
- **Real devices.** iPhone/iPad Safari and Chrome are the operator's at the gate.

## 6. Fixtures left behind (for `P28.S7`, `P28.S8`, `P28.S9` and the gate)

All in the existing `kb-p28s2-pg` container; the `p28s5` tenant is untouched. Passwords are throwaway.

| Tenant | Sign-in | Slug | Shape | What it is for |
|---|---|---|---|---|
| `p28s6@example.com` / `p28s6-throwaway-pw` | slug **`p28s6`** | 6 projects 20·5·4·2·1·1, **33 docs, 100 tag hubs, 3 unresolved**, `changple5` + `knowledge` public | the D26 reproduction corpus — the only fixture large enough to show the off-frame defect, and the one to re-check the graph on |
| `p28s6noslug@example.com` / same pw | **none** (deliberate) | 1 public project, 2 docs | the legacy `/graph/{uuid}` route and the `canonical_path: null` fallback |
| `p28s6empty@example.com` / same pw | none | zero documents | the plate's empty state |

Seeding scripts are in this session's scratchpad only; the corpus is reproducible from the recipe in
`phase.md`'s runtime note plus a `related:` list (the `POST /api/documents` body takes `related` as a list of
`{project}/{date}-{slug}.md` rel_paths, 2–5 `tags` required).

## 7. Temporary probes, all reverted

Two, both on `graph-canvas.tsx`, each applied for one measurement and then restored from a pre-probe copy and
**byte-diffed back to identical**: `isPublicDoc → false` (to render and round-trip §6.4's gate, which is
unreachable in production — see the note on the payload carrying no visibility marker) and a throw at the top
of `start()` (to render §4.8's failed state). A third, non-code probe set `--kb-graph-offmap-min` and
`--kb-graph-label-cap` through inline custom properties on `.kb-graph` in the browser only, which the engine
re-reads through its existing `getComputedStyle` path; no file was touched for those.
