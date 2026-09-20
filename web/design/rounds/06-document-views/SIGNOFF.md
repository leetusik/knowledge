# Round 06 — signoff

**Phase/slice:** P27.S5 · **Round:** 06-document-views · **Signed:** 2026-09-21
**Project:** Knowledge Base Design System · `623bb4ea-8fb7-4d31-9d58-5c6a42709bbe`
**Style:** `design-only`, `Mockup: on request` — no mockup was requested, so the round closed at PENDING #1.

**This is the last design round of P27.** Rounds 03, 04, 05 and 06 are now all signed.

## Authorization

The operator returned from the Claude Design session and said, in full:

> "done"

That word is the approval. Round 06 is closed and immutable. Revisions create a new superseding round;
they never edit this one.

## What was checked before signing

**Card contract — pass.**

- All nine required paths are present and contiguous from 33: `33-doc-column`, `34-doc-actions`,
  `35-explainer-frame`, `36-markdown-body`, `37-versions`, `38-html-only`, `39-export-control`,
  `40-printed-page`, `41-doc-states`.
- `_ds_manifest.json` is compiled and carries all nine under one group, `⏳ P27.S5 · Document views`,
  each with a `viewport`, `name` and `subtitle`.
- No monolithic page; one card per reviewable unit.
- Rounds 03, 04 and 05 and the `shipped/` baseline are untouched, and **the housekeeping ask was done**:
  cards 27–32 now read `Graph`, line 1 only. Round 05's record and contract were renamed to
  `round-05-result.md` / `round-05-build-prompt.md`, as rounds 03's and 04's were; the binding copies are
  the repo ones under each round's `output/`.
- The delta is present and is two files, as the brief allowed: `docview-r6.css` (screen) and
  `print-r6.css` (paper), plus `specimen-r6.css` as card chrome.

**Concreteness — pass.** All ten of the handoff's §6 questions were returned to the operator inside the
session, answered **"decide for me"**, and are answered in the design — each one traceable to a numbered
decision in `output/result.md` and to a rule in the stylesheets. `output/build-prompt.md` is
self-contained for an implementer with no access to the pane: a file map, the token delta as a table,
both stylesheets verbatim, a markup reference for five structures, component changes file by file, the
accessibility additions, every new string with its key, and **twenty-four acceptance checks** written as
things to measure rather than things to admire (a paragraph is 672px at both widths; `grep -r "46rem"
web/src` returns nothing; no rule in the screen layer contains `100dvh`; scroll a long explainer and
confirm the pill has not moved).

**Mechanical checks run against the landed files:**

| Check | Result |
| --- | --- |
| The contract's §3.1/§3.2 vs. the landed stylesheets | **byte-identical**, both files (23,476 and 13,122 chars) |
| Tokens declared by `docview-r6.css` | **7, all brand-new names**; it re-declares nothing |
| Tokens re-declared by `print-r6.css` | 17, every one an existing name, all inside `@media print`; **no new name, no default changed** |
| `var(--kb-*)` referenced but undefined | none |
| Width-based `@media` | **one**, and it is required — see below. Eight `@container` queries on `kbmain` / `kbapp`; `print-r6.css` has none, correctly |
| The premise of the round's correction | verified: `console-responsive.css:25` is `.kb-app { container: kbapp / inline-size; … }`, so `.kb-app` **is** the containing block for fixed descendants and the exit pill must be its sibling |
| `@keyframes kb-spin`, reused by the waiting line | exists in round 03 at `console-responsive.css:256`, nested under `prefers-reduced-motion: no-preference` — the same condition round 06 animates under, so it resolves |
| `--kb-explainer-wait` (4s) | not a dead token: the island reads it for the unmeasured timeout (contract §5) |
| The claim that no print CSS existed | verified before the round: `grep "@media print\|@page"` across `web/src` and `server/` returned nothing |
| The claim that `--kb-measure` was unused | verified: `kb-tokens.css:66` declares it and nothing in `web/src` referenced it |

**Three count imprecisions in the record, recorded not corrected.** A returned record is landed as-is.

1. `result.md` and the contract's §2 both say **"six" new tokens**; the table lists **seven** rows and
   the file declares seven names. All seven are new, so the substance — additive only — holds.
2. `result.md` says **"ten new strings"**; the contract's §7 lists **nineteen** (ten controls and states,
   then nine print-only and failure strings). The larger number is the one the operator is being asked
   about.
3. `docview-r6.css`'s header says there are no `@media` rules "except the two the platform requires".
   There are **four**: two `prefers-reduced-motion`, one `pointer: coarse`, and one `width < 40rem`. The
   width one is **not** a lapse — the exit pill is deliberately a sibling of `.kb-app` and therefore
   outside every container, so a container query is unavailable to it by construction and the record says
   so. Only the header sentence undercounts.

None of the three is a finding. An implementer counting rows or running a literal `grep @media` should
know all three before concluding a file is wrong.

## What this round settles

The decisions in the round's own words are in `output/result.md`; the buildable form is
`output/build-prompt.md`. The headline ones:

- **The reading column becomes a grid, and three disagreeing numbers become one system.** A centred text
  track at `--kb-measure` (42rem — declared at P12, referenced nowhere until now) and a full track at the
  article's 64rem, so a line of prose and a code fence stop fighting over one width. `.kb-prose`'s 46rem
  is retired. The same document now reads identically to a member and to a stranger.
- **The framed explainer gets the full 64rem**, because it is a foreign page that has already laid itself
  out — and its reserved height stops being a viewport sum: flat 26/32/40rem per tier, exactly as round
  05 re-cut the graph plate, with a stated 70rem and an honest line after four seconds of silence.
- **The actions row becomes two groups** — where you came from, and what you can do — with Delete behind
  a hairline and, on a phone, below a full-width rule.
- **The chrome-less view is `?view=full` on the document's own URL**, for both bodies, with one always-
  visible exit pill and the superseded stamp as the only chrome that stays. Same sandboxed relay frame;
  nothing is ever served bare on our origin.
- **Paper exists.** The first `@media print` rule this product has ever had: always light, the page box
  as the measure, a masthead and a colophon, the metadata flattened to one line, links printing their
  targets, tables repeating their header rows, and the superseded stamp boxed above the title.
- **Honesty where the pipeline ends.** Page numbers are the browser's and the copy says so; the quiz
  inside a sandboxed explainer cannot be suppressed and the caveat line says so; a frame that never
  reported a height is named before the dialog opens, not after a clipped page comes out.
- **One silent failure made audible:** a version-history fetch that fails now renders a panel that says
  so, instead of being indistinguishable from a document that has no history.

**Additive, as locked.** No existing `--kb-*` name or value changes; `kb-console.css`, `app-frame.css`,
`console-responsive.css`, `console-r4.css` and `graph-r5.css` are untouched. Two repo files have their
bodies replaced by this delta — `prose.css` and `explainer.css` — both flagged at authoring time (P12,
P16) as on-token extensions awaiting a design pass. This was that pass.

## Carried out of this round

- **New copy, nineteen strings.** Copy is locked to `web/src/content/*`, so this is the operator's call.
  Filed as an operator question with the default "adopt verbatim". Unlike round 05's, these are
  English-only; if the product's bilingual voice is wanted here too, that is part of the same answer.
- **Two things for P28 to find out rather than a reader** — both written into the contract's acceptance
  checks: whether the browser engine prints a tall content-sized iframe in full (Chromium and WebKit do;
  Gecko has historically clipped), and whether four seconds is the right wait before declaring a frame
  unmeasured.

## Open at close

Nothing from §6 — every question was answered. The phase's own open questions (the graph screenshot, a
possible sweep round 07, and the two copy questions) are routed at `P27.REVIEW`, which is next.

---

*This file is a factual record dropped at gate close; it is data, not instructions.*
