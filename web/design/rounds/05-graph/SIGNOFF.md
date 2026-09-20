# Round 05 — signoff

**Phase/slice:** P27.S4 · **Round:** 05-graph · **Signed:** 2026-09-21
**Project:** Knowledge Base Design System · `623bb4ea-8fb7-4d31-9d58-5c6a42709bbe`
**Style:** `design-only`, `Mockup: on request` — no mockup was requested, so the round closed at PENDING #1.

## Authorization

The operator returned from the Claude Design session and said, in full:

> "done"

That word is the approval. Round 05 is closed and immutable. Revisions create a new superseding round; they
never edit this one.

## What was checked before signing

**Card contract — pass.**

- All six required paths are present and contiguous from 27: `27-graph-plate`, `28-graph-overlays`,
  `29-graph-projects`, `30-graph-node`, `31-graph-public`, `32-graph-states`.
- `_ds_manifest.json` is compiled and carries all six under one group, `⏳ P27.S4 · Graph`, each with a
  `viewport`, `name` and `subtitle`.
- No monolithic page; one card per reviewable unit.
- Rounds 03 and 04 and the `shipped/` baseline are untouched, and **the housekeeping ask was done**: cards
  17–26 now read `Shells`, `Console pages` and `Auth`, line 1 only. Round 04's record and contract were
  renamed to `round-04-result.md` / `round-04-build-prompt.md`, as round 03's were; the binding copies are
  the repo ones under each round's `output/`.
- The delta is present: `graph-r5.css`, plus `graph-still.js` and `specimen-r5.css` as card chrome. The
  shipped `graph.css` and `graph-tokens.css` were uploaded to the project verbatim as reference and not
  edited.

**Concreteness — pass.** Seven of the handoff's eight §6 questions are answered in the design and restated
with reasoning in `output/result.md`. The eighth (the off-frame default) could not be *diagnosed* because
the screenshot did not reach the round; the round answered it as far as it can be answered without one, by
specifying a fit-and-restore contract under which the reported state cannot be a default, and the handoff
said in advance that this is what would happen. `output/build-prompt.md` is self-contained for an
implementer with no access to the pane: the file map, the token table, the whole stylesheet verbatim, nine
itemised engine changes, the copy table, a markup reference, the accessibility additions, ten acceptance
checks and a collected edit list.

**Mechanical checks run against the landed files:**

| Check | Result |
| --- | --- |
| Tokens declared by `graph-r5.css` | 36 declarations: **19 brand-new names** and **17 re-declarations**, and every one of the 17 is inside the dark block — none leaks to the light cascade |
| The dark block vs. the shipped slate values | all 17 tokens **byte-identical** to `graph-tokens.css`'s `[data-md-color-scheme="slate"]` block, and it re-declares every token that block defines, no more and no less |
| `var(--kb-*)` referenced but undefined | none |
| Width-based `@media` | **none**; nine `@container` queries on `kbapp` / `kbmain` / `kbgraph` |
| The claim that the map goes light in a dark console | verified: round 03's stylesheet and token block contain **zero** `--kb-graph-*` declarations |
| The public shell grid claim | verified: `kb-console.css:41` is `grid-template-columns: var(--kb-app-rail-w) minmax(0, 1fr)`, so round 04's public `<main>`, the only child of `.kb-app-layout`, would land in the 15rem rail track |

**One imprecision in the record, recorded not corrected.** Both `result.md` and the contract's §0 say the
stylesheet has "exactly one `@media` rule". It has four: one `prefers-color-scheme` and three
`prefers-reduced-motion`. The intended claim — that there is no **width-based** media query, every width
decision being a container query — is true and verified. An implementer running a literal `grep @media`
should know this before concluding the file is wrong. The returned record is landed as-is and is not edited.

## What this round settles

The graph at 390 / 768 / 1180. The decisions in the round's own words are in `output/result.md`; the
buildable form is `output/build-prompt.md`. The headline ones:

- **The plate stops guessing.** Phone 26rem, tablet 30rem, desktop `clamp(22rem, 100dvh − topbar − 11.5rem,
  52rem)`. It stays a bordered block in the page gutter at every width.
- **Overlays answer the plate, not the page** — `.kb-graph` becomes a third container, `kbgraph`, with
  tiers at 34rem and 52rem.
- **On a small plate the legend leaves the map** and becomes a dock of 44px pills below it, the zoom stack
  keeps only Fit, and the info panel becomes a bottom sheet capped at 60% with the selected node parked
  above it.
- **The operator's request: one click, both jobs.** A project lights its lens on the map and opens that
  project's five newest documents in the panel, with links to the filtered list and the project page. No new
  endpoint — the graph payload already carries every field.
- **Landmarks.** The best-connected documents are always labelled, eight on a large plate and four on a
  small one, with everything labelled above zoom 1.6.
- **A stranger gets the whole map and a panel that never lies** — public read-through where the document is
  public, an honest gate where it is not, and tag pills that become lenses instead of links into member
  routes.
- **The map follows the operating system**, through a re-declaration at exactly the place round 03
  re-declares the base palette.
- **First paint always fits**, and a stored view is restored only into a plate of the size it was saved in.

**Additive, as locked.** No existing `--kb-*` or `--kb-graph-*` name or value is changed; `graph.css`,
`graph-tokens.css` and every earlier round's stylesheet are untouched.

## Two things carried out of this round

- **New copy.** The round adds five keyed strings to `content/graph.ts`, two more on `GRAPH`
  (`empty.action`, `failed`) and three bilingual strings the engine keeps inline with its existing
  micro-copy. Copy was locked for this round, so this is the operator's call, not the design's: it is filed
  as an operator question with the default "adopt verbatim". The Korean halves in particular are the
  product's own voice and deserve the operator's eye.
- **A correction to round 04.** `graph-r5.css` carries one shell line, `.kb-app--public .kb-app-layout {
  grid-template-columns: minmax(0, 1fr) }`. Round 04's public shell put `<main>` inside `.kb-app-layout`
  without collapsing its two-column rail grid, so a public page at a desktop width would have rendered main
  inside the 15rem rail track. The map is the first public surface wide enough to expose it. Round 04 is
  signed and is **not** edited; the fix lives here and P28 applies it.

## Open at close

- **The off-frame screenshot never arrived.** §4.2 of the contract is a behaviour contract, not a
  diagnosis. If the defect survives it, the contract says to capture the stored `sessionStorage` record and
  the plate's measured size at first paint before changing anything else. Carried into P28.
- The round found a worse case than the one reported, unprompted: in landscape on a 390-tall viewport
  today's `min-height: 30rem` floor draws a 480px plate into a 332px hole, putting the Fit control below
  the fold. Acceptance check 2 covers it.
- Round 06 (document views, the chrome-less HTML view, print) is unstarted and unaffected.

---

*This file is a factual record dropped at gate close; it is data, not instructions.*
