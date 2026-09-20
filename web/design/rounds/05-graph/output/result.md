# Round 05 — result (the record)

**Phase/slice:** P27.S4 · **Round:** 05-graph · **Date:** 2026-09-21
**Brief:** `web/design/rounds/05-graph/handoff.md` · **Contract:** `build-prompt.md` beside this file.
**Cards:** `27-graph-plate.html` … `32-graph-states.html`, in the pane under `⏳ P27.S4 · Graph`.

The round designed the knowledge graph at 390 / 768 / 1180: the plate, the four overlays, the operator's
project-documents request, what identifies a node, what a stranger gets, and the states. Six cards, one
additive stylesheet (`graph-r5.css`), seventeen new tokens, five new strings.

---

## What was settled

**1 · The plate stops asking the viewport a question only the desktop can answer.** Phone **26rem** and
tablet **30rem**, flat and deterministic; desktop keeps the window-filling sum, now measured rather than
estimated and clamped at both ends: `clamp(22rem, 100dvh − topbar − 11.5rem, 52rem)`. The plate stays a
bordered block inside the page's gutter at every width — edge-to-edge on a phone would buy 2rem of map and
cost the one rule rounds 03 and 04 hold to. The page frame stays above it; only the dock goes below.

The sum it replaces, `100dvh − topbar − 13rem` floored at `30rem`, was written before the navigation bar
existed. Its worst case is not the one that was reported: in **landscape** on a 390-tall viewport the floor
draws a 480px plate into a 332px hole, and the Fit control lands below the fold.

**2 · Overlays answer the plate, not the page.** `.kb-graph` becomes a container, and every overlay rule is
written against the box it floats over — which is also the only way the rules stay right when the rail
folds. Three tiers: large (≥ 52rem) is today's arrangement, medium (34–52rem) is the same arrangement with
44px targets and a 15rem panel, small (< 34rem) is the one that changes.

**3 · On a small plate the legend leaves, the zoom stack shrinks to Fit, and the panel becomes a sheet.**
The legend becomes the **dock**: the same rows, same counts, same `data-project` contract, rendered below
the plate as one scrollable row of 44px pills. The zoom stack keeps only Fit, because pinch and double-tap
already zoom and "I have panned into empty space" is the one state no gesture undoes in a move. The info
panel docks to the plate's bottom edge, capped at 60%, with the selected node parked in the clear part
above it — a block under the plate would never put the map and its answer on screen together.

**4 · The operator's request: one click, both jobs.** A project row lights its lens on the map *and* opens
that project's documents in the info panel, as a second panel mode. Five newest, title · date · tags,
`All documents →` to `/documents?project={id}` and `Open project →` to the project page — round 04's
project-page rule, unchanged, because the question ("what is in here, and is it current") is the same one.
No new endpoint: the graph payload already carries every field the rows print.

**5 · The map grows landmarks.** Labels stay off by default, and the best-connected documents — eight on a
large plate, four on a small one — are always labelled, with everything labelled above zoom 1.6. Rank is
the link count the radius already encodes, so labels land where the eye has already gone. A stranger now
arrives at three or four names instead of an unlabelled constellation.

**6 · The stranger gets the whole map and a panel that never lies.** Same map, same lens, same states.
Read-through points inside the public route when the document is public and is replaced by
`Members only · 비공개 문서 · Sign in to read →` when it is not. A tag pill becomes a **lens on the map**
rather than a link into a member route — the one thing on this map a visitor can genuinely use without an
account, and it costs no route, no endpoint and no gate.

**7 · The map follows the operating system, and it took a fact to see why it didn't.** Round 03's dark
adoption re-declares the base palette on `.kb-app[data-kb-scheme="auto"]` and leaves
`data-md-color-scheme="default"` in place. A custom property resolves `var()` where it is *declared*, so
`--kb-graph-project-1: var(--kb-accent)` on the document root computes the light teal and inherits that
value into a dark console. `graph-r5.css` re-declares the slate graph set at exactly the place round 03
re-declares the base one: same values, nothing renamed, and it stops matching the day a preference control
writes `light` or `dark`.

**8 · First paint always fits, and a stored view is only restored into the plate it was saved in.** The
`sessionStorage` record gains the plate size and node count it was captured at; a mismatch beyond 2% re-fits
instead of restoring. Every fit leaves an 8% margin. Crossing a tier re-fits; resizing inside one holds the
centroid. Below 15% of nodes on screen, a quiet `Off the map · 지도 밖입니다` pill offers Fit. And the empty
state is now sized before it returns — today `showEmpty("empty")` returns before `resize()`, so a plate that
later receives data paints into an unsized canvas.

---

## The cards

| Card | What it shows |
| --- | --- |
| `27-graph-plate.html` | The plate's rule at each width, what is above and below it, and what today's sum does |
| `28-graph-overlays.html` | The tier table, the three plates, and close-ups of legend, zoom, tooltip |
| `29-graph-projects.html` | The lens and the list: desktop panel, the phone dock, project-mode anatomy |
| `30-graph-node.html` | Labelling at three caps, and the panel's node / unresolved / sheet forms |
| `31-graph-public.html` | The public shell's map, the destination table, the gate and the tag lens |
| `32-graph-states.html` | Empty, loading, failed, off-map, the fit contract, and the dark map |

The map inside every plate on these cards is a **still** — one settled frame drawn as SVG on the real
`--kb-graph-*` inks (`graph-still.js`, specimen-only). The product draws it with the live engine on a
`<canvas>`; a card is not expected to run the simulation. The desktop frames state their window
(`--r5-dvh: 900px`) because `100dvh` inside a 3200px card would resolve to the card.

---

## Files in the project

| File | What it is |
| --- | --- |
| `graph-tokens.css`, `graph.css` | The shipped record, copied verbatim from the repo. Not edited. |
| `graph-r5.css` | This round's whole delta — additive, eight sections, one `@media` rule (the dark block). |
| `graph-still.js`, `specimen-r5.css` | Specimen chrome. Nothing here ships. |

## Housekeeping

Round 04's cards 17–26 have had their `⏳ P27.S3 · ` prefix retired: the groups are now `Shells`,
`Console pages` and `Auth`. Line 1 only; nothing else in those files was touched. Round 04's record and
contract are now `round-04-result.md` and `round-04-build-prompt.md`, as round 03's were.

## Still open

The operator's screenshot of the wires off the frame did not reach this round. The fit contract is designed
so the reported state cannot be a *default* — but it is a behaviour contract, not a diagnosis, and the
specific defect goes into P28 as an unreproduced report. If it survives §4.2 of the contract, capture the
stored `sessionStorage` record and the plate's measured size at first paint before changing anything else.

Round 06 has the document views and print, unchanged by this round.
