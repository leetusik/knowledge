# Round 04 — signoff

**Phase/slice:** P27.S3 · **Round:** 04-console-surfaces · **Signed:** 2026-09-21
**Project:** Knowledge Base Design System · `623bb4ea-8fb7-4d31-9d58-5c6a42709bbe`
**Style:** `design-only`, `Mockup: on request` — no mockup was requested, so the round closed at PENDING #1.

## Authorization

The operator returned from the Claude Design session and said, in full:

> "done"

That word is the approval. Round 04 is closed and immutable. Revisions create a new superseding round; they
never edit this one.

## What was checked before signing

**Card contract — pass.**

- All ten required paths are present and contiguous from 17: `17-shell-member`, `18-shell-public`,
  `19-dashboard`, `20-dashboard-panels`, `21-project`, `22-project-documents`, `23-documents`,
  `24-documents-search-states`, `25-auth-gate`, `26-auth-states`.
- `_ds_manifest.json` is compiled and carries all ten with `group`, `viewport`, `name` and `subtitle`, under
  the three requested groups: `⏳ P27.S3 · Shells` (17–18), `⏳ P27.S3 · Console pages` (19–24),
  `⏳ P27.S3 · Auth` (25–26).
- No monolithic "design system" page. One card per reviewable unit.
- Round 03's sixteen cards and the fifteen `shipped/` baseline cards are untouched. The manifest now shows
  round 03's cards under their retired names (`Foundations`, `Components`, `States`), which also confirms
  round 03's regroup took effect — the stale label noted in that round's signoff has cleared.
- The stylesheet delta is present: `console-r4.css` (the round's layer) plus `specimen-r4.css` and
  `console-trend.js` (card chrome only).
- Frames are real `.kb-app` elements at real widths, as asked. Cards 18 and 19 each carry a fourth frame
  (1440 for the public cap; 1180-folded for the rail's effect on the container) — both logged as departures
  in `output/result.md`.

**Concreteness — pass.** All eight of the handoff's §6 questions are answered *in the design*, each on a
named card, each restated with its reasoning in `output/result.md` §1. `output/build-prompt.md` is
self-contained for an implementer with no access to the pane: the file map, the token statement, the whole
stylesheet verbatim, per-surface markup, the three-width behaviour table, the accessibility additions, the
copy sources, the file-by-file apply map, and a twelve-point definition of done.

**Mechanical checks run against the landed files:**

| Check | Result |
| --- | --- |
| `build-prompt.md` §3 vs. the project's `console-r4.css` | byte-identical (independently transcribed from both project files, then diffed) |
| `@media` rules in `console-r4.css` | none — ten `@container` rules on `kbapp` / `kbmain` / `kbauth`; the only match is the header comment saying so |
| `var(--kb-*)` referenced by `console-r4.css` | 23 distinct tokens, **all** already defined in `web/src/app/kb-tokens.css` plus round 03's block. No token added or changed |
| Classes round 04 extends | `.kb-trend-wrap`, `.kb-panel__head`, `.kb-searchbar__field`, `.kb-app-cols`, `.kb-pageframe__title-wrap`, `.kb-form-actions`, `.kb-topbar__signout` exist in round 03's `console-responsive.css`; `.kb-reveal-overlay`, `.kb-reveal__key`, `.kb-field__hint` exist in the shipped `kb-console.css` |
| The record's claim about the trend clamp | verified: round 03 defines `.kb-trend-wrap { height: clamp(6rem, 3.6rem + 9cqi, 8.5rem); }` |

## What this round settles

The six console surfaces at 390 / 768 / 1180, composed on round 03's kit. The eight decisions, in the
round's own words, are in `output/result.md` §1; the buildable form is `output/build-prompt.md`. The
headline ones: the dashboard keeps one block order at every width and folds nothing; a project is reached by
its name as a link **and** by the Open button, never by the whole row; **the project's documents live in a
panel between the trend and the API keys — five newest, title · date · tags, one link to the filtered
list**; the search bar gains a Search submit and a Reset link as a third cell; the trend is kept unchanged
because round 03's clamp already removed the distortion; disclosures open as a block under their head at
every width while the show-once key reveal becomes a bottom sheet on a phone; the auth gate stays a card and
puts one status-keyed error between the password and the submit; and the anonymous shell caps main at 88rem.

**Additive only, as locked.** No token added or changed. No string added — including the new documents
panel, which is built entirely from `content/documents.ts`. `kb-console.css`, `app-frame.css` and round 03's
`kb-console-responsive.css` are untouched. Fourteen new `.kb-*` class families, all additions.

## The regroup — deliberately not performed here

The design-cowork loop retires a round's `⏳ P27.S3 · …` address at signoff with a pure regroup: line 1 of
each card changed, everything after it byte-identical.

**I did not do that for round 04, and the cards keep the round address in the pane.** The reason is the
byte-identical requirement itself. `DesignSync` has no download-to-disk path: a card can only be rewritten
by re-emitting its whole body through this session, and round 04's cards are 20–30 KB each of dense,
single-line HTML. Re-emitting ten of them cannot be *verified* byte-identical afterwards — a re-fetch
travels the same path, so it would only compare my transcription against itself. Risking ten approved cards
to change a label prefix is the wrong trade, and the round's own rule is that the returned record is landed
as-is and never edited.

**What happens instead:** round 05's Claude Design session opens the same project and can retire the round
04 labels in place, with no transcription round-trip. It is carried as a note for `P27.S4` in `phase.md`.
Until then the pane reads `⏳ P27.S3 · …` on cards 17–26. This is cosmetic, blocks nothing, and does not
affect P28, which builds from `output/build-prompt.md`.

## Observed in the returned record — data, not decisions

- **Round 03's project-side record files were renamed** to `round-03-result.md` and
  `round-03-build-prompt.md` so this round could take the `result.md` / `build-prompt.md` names the handoff
  asks for. Logged as a departure by the session. Round 03's binding record is the repo copy at
  `web/design/rounds/03-foundation/output/`, which is untouched.
- **Round 03's card 04 carries a stale sentence** claiming 940px of main is "past 64rem" and two-column.
  The session flagged it; round 03's CSS is correct and unchanged, so this is a card annotation error inside
  a signed round, not a design change. Recorded for P28 and the review; round 03 is not edited.
- **`specimen.css` was overriding the product's trend height** (a flat 120px from before round 03 existed),
  so round 03's trend frames under-reported the clamp. `specimen-r4.css` restores the product rule. Card
  chrome only.

## Open at close

- Rounds 05 (graph) and 06 (document views + print) are unstarted; the frames on cards 18 and 22 that would
  show their surfaces use a labelled placeholder.
- A scheme toggle, table sorting and paging, and the project documents panel's failure state are recorded in
  `output/result.md` §5 as open for later rounds. None of them blocks P28.

---

*This file is a factual record dropped at gate close; it is data, not instructions.*
