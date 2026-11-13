# Wave brief — P30.S1, the A5 superseding wave

Written by the orchestrator on 2026-10-21 from the record:
- P29's review routing (`works/phases/active/P29/slices/P29.REVIEW/result.md` §5, decision A5);
- P30's decision record (`works/phases/active/P30/phase.md` → `## Decisions`);
- the cut (`works/phases/active/P30/topics/slice-breakdown.md` → S1);
- the signed rounds named in each handoff.

The wave reopens three signed jobs for small, scoped fixes. Each round's rounds folder lives under the
job's own P29 slice (P29.S4, S5, S6); P30.S1 drives them (the operator's choice, 2026-10-21: "accept").

## Product context

- **What knowledge is.** A hosted knowledge base. Coding agents publish documents into an org's library,
  read on the web and over MCP. P29 designed it into a **personal learning library that reads like an
  e-book**: books of ordered chapters, with codebase knowledge first-class. P30 builds that design.
- **Who reads.** The operator, a solo developer, reading their own books on iPhone, iPad and a Mac in long
  sessions; and anyone reading a public book while signed out.
- **Why this wave.** P29's review found three accessibility defects and one wording change in signed jobs.
  Under RESPECT THE DESIGN the build may not repair a signed part in code, so they are fixed here, in the
  design, before P30 builds those surfaces. The operator approved all four on 2026-10-21 (A5: "yes to all
  four, as P30's first slice").

## The operator's bar

From `docs/reference/design/bar.md`, verbatim:

1. **The state bar scrolls away with the page; it is never pinned.** Its size may stay as the page's
   presets need.
   - "prototype state too big. which is fine. but just make it doesn't follow scroll." The operator,
     2026-10-19, at PENDING #1 of `01-reader/01-reader` (P29.S4). Source:
     `jobs/01-reader/rounds/01-reader/feedback.md`.
   - Made a rule for every canvas the same day. Asked "Should this apply to every canvas from now on
     (waves 2 and 3 too)? If yes, I'll add it to your standing design rules so you don't have to
     repeat it.", the operator answered "ok".

The shipped bar (the drafter's *working canvas*, *state bar* and *craft* sections) binds as before.

## The system inventory

- **Title: `knowledge`**, as the Design System Artifact shows it. Namespace `kb`. Artifact
  https://claude.ai/artifact/7qemgwHNsoPNf5kYHEJ4md, version `1792321604-e214` (`design.json`), unchanged
  since the signed rounds.
- **Cached at each job's `canvas/project/ds/kb/`:** `tokens.css`, `tokens.json`, `README.md`, `fonts/`.
  The README's colour, type, states and content rules bind.
- **Known gaps (logged, not this wave's):** no component bundle; no sepia outside the reader; no Hangul
  face; no on-fill token; the dark focus ring and print palette are not tokens. These go to the `kb` sync
  after P30 (deferred job D45).
- **The gap this wave answers:** `kb-border-strong` measures about 1.58:1 on `kb-surface` (1.58 light,
  1.56 dark, 1.64 sepia), under the 3:1 floor for the boundary of a UI control.

## Constraints

- **Viewports:** phone 390×844; iPad 820×1180 portrait and 1024×768 landscape; desktop 1440×900 as the
  reference. Also the narrow phone, 320 px wide, for the reader's chapter bar.
- **Text size:** the reader's five signed steps, plus the browser's own zoom of the root font size to 150%
  and 200% (the evidence for C07).
- **The accessibility floor:** text ≥ 4.5:1, large text and UI ≥ 3:1, in light, dark and sepia, measured;
  the system's focus ring; targets ≥ 44 px below 40rem; a state never shown by colour alone;
  `prefers-reduced-motion` respected; every control operable by keyboard.
- **No icon set and no emoji.** Words and the text marks `·`, `…` and `→`.

## Locked vs. in play

- **Locked:** every signed element of every job that the handoff does not name as in play. That includes
  layout, copy (except the one string `book-page` 7 changes), type, the reading column, the data contracts,
  the app shell's structure and the system's structure and brand spirit ("A calm editorial library: warm
  paper, charcoal ink, one deep teal, and hairlines instead of boxes").
- **In play, and only these:** the four A5 items, each named in its job's handoff. The fix must be the
  smallest change that clears the defect. Structural `kb-border-strong` hairlines (rules between rows,
  card edges, dividers) are **not** controls and stay as signed.

## Collected taste

The established look is the signed rounds'. No new taste is asked for or given in this wave: `new visual
direction: no` on every job.

## Shared data

Each job's canvas already holds its signed data (`reader.js`, `annot.js`, `library.js` seeds). Reuse it
unchanged. Add no personal or production data and no secrets.

## One direction

One direction per job. Where a handoff poses a question with options, draw the one you recommend, log
the other with its trade-off in `result.md`, and leave the choice to the operator.

## The three paths

- The runtime: `docs/reference/design/.type/artifact-type/dc-runtime.js`.
- The type references: `docs/reference/design/.type/` (`SKILL.md`, `artifact-type/reference/`).
- The system namespace `kb`; its cache at `jobs/<job>/canvas/project/ds/kb/`.

## The wave's jobs

- `01-reader`, round `03-chapter-bar-and-border`: C07, and a 3:1 control-boundary role for the reader's
  signed controls.
- `05-annotations`, round `02-keyboard-and-back-link`: `annotations` 10 (keyboard reach to a highlight's
  popover), and `book-page` 7 (the per-book list's back link from the book page).
- `06-library`, round `02-control-border`: C11, the library's control borders at 3:1.

**Cross-job seam:** the 3:1 boundary is one decision drawn twice. `01-reader` defines it for the reader's
controls, and `06-library` applies it in the app frame. Where both can use the same value, they should. If
`06-library` needs a different answer, it logs why.
