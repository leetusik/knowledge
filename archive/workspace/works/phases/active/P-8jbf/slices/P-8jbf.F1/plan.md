# P-8jbf.F1 — plan: a wide table that fits the wide column does not scroll

Mode: `auto` (unattended: settle judgment calls by recommendation and record them). Kind
`fix`, risk `high` (it repairs mid-row work), the high row.

## The defect (P-8jbf.REVIEW, Finding 1; full detail and evidence in
`slices/P-8jbf.REVIEW/result.md`, and the notebook note for F1)

From a 1600px window the reader column is 44rem (704px), which equals the signed wide-table
minimum `.kb-ch-table--wide table { min-width: 44rem }` (`web/src/app/reader.css:716`). The
scroll box's 1px borders (`reader.css:706`) leave 702px inside, so an 8+ column table whose
cells fit gets client 702 / scroll 704: `is-over is-more-r`, the hint "Scroll sideways for
all 8 columns →", a fade over the last column, and a 2px scrollbar. Latent: once that is
fixed, a fitting wide table is still announced as `role=region`, `tabindex=0`, "Table, 8
columns, scrolls sideways", because `const box = wide || long || m.over`
(`web/src/components/reader/scroll-box.tsx:116`).

## The fix (approach; the values stay the signed ones)

- **CSS, inside the existing `@media screen and (min-width: 100rem)` block only:** let a wide
  table's minimum fit the box it sits in, so a table that fits the 44rem column shows whole,
  while a table whose content is wider still overflows and scrolls. Keep the signed intent of
  the minimum — a wide table is never squashed narrower than the column — e.g. `min-width:
  100%` on `.rd-article .kb-ch-table--wide table` under the step. Nothing below the step
  changes.
- **TableBox (`scroll-box.tsx`):** the region role, the tab stop and the "scrolls sideways"
  label follow the measured overflow for a wide table that is not long. Keep today's
  server-rendered markup as the default so nothing shifts on load below 1600 (dropping
  `wide` from `box` outright would make the hint and region appear only after hydration
  there); correct it from measurement after mount, as the box already measures.
- Match the surrounding code's style and comment density. No restyle of the box, hint or
  fade (RESPECT THE DESIGN): they still appear exactly as signed whenever a table really
  scrolls.

**Set:** `web/src/app/reader.css` (inside the wide-step block only) and
`web/src/components/reader/scroll-box.tsx`. Check every TableBox consumer (grep) before
changing the component.

## Acceptance matrix (prove each case; record results in `result.md`)

1. 8-column short table at 1600, 1920, 2560, sizes 1, 3, 5: no overflow, no `is-over`, no
   hint, no fade, no scrollbar, right border visible.
2. The same table at 1599, 1440 and 390: unchanged (scrolls with hint and fade where it did).
3. A wide table with long cells from 1600 (e.g. 9 columns): still scrolls, with hint and fade.
4. A long table (more than 20 rows): its designed box and behaviour at every width.
5. A fitting wide table is not announced as "scrolls sideways" and is not a tab stop; a
   scrolling one keeps both; no layout shift on load below 1600.
6. Print: A4 and Letter, chapter and loose document, pixel-identical to before.
7. Review, book, book-notes and legacy pages unchanged; every TableBox consumer checked.
8. `pnpm --dir web lint`, `typecheck`, `build`, and `python3 scripts/workflow.py validate`
   pass.

## Verify

As S1 and the review did (their `result.md` hold the recipe): `## Operator Runtime`'s dev
runtime `:3030` where its data allows, a scratch stack (scratch API + fixture book, dev copy
and production build) where it does not; headless Chrome (CDP) for wide widths, Aside `u1`
for 1440. Stop every scratch server and Chrome you start and drop any scratch database you
create; never touch `:3030`/`:8766` processes or other sessions' databases. Name the
instrument in `result.md`. No new test (style); a tiny test only if the TableBox logic change
is core behaviour worth one, and keep it tiny.

## Close

- `result.md`, verdict block first, the matrix case by case.
- Append one `## Doc impact` line (qa/product: a wide table that fits the wide column shows
  whole; one that does not still scrolls) through `phase-section`.
- Consume the notebook's F1 note (`--entry K --remove`); rewrite `## Now` for the re-review.
- No commit, no state moves.

## Dispatch

route=high
reason=kind fix rated high
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
