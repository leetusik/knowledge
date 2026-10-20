# P30 decisions archive — full text of compressed `## Decisions` lines

Linked from `phase.md` → `## Decisions`. Moved here verbatim by P30.S4 to keep the notebook under budget; the
notebook keeps a one-line summary of each. Nothing here is superseded.

- **Granularity (P30.DECOMP).** Each slice is sized to about one P28-sized implementation slice, on the
  build prompts' own section seams:
  - `01-reader` (63 KB of build prompt) is split three ways: shell, prose kit, and progress and moving;
  - `03-diagrams` is split into the frame and flow/state, then the other four kinds;
  - `05-annotations` is split into highlights and notes (the anchor capture), then the lists and markers;
  - `09-legacy-and-print` is split into the legacy reader, then print;
  - the server's native format is split into a pure parser and validator (S3), then the ingest wiring (S5);
  - reader state is split into the state API (S8), anchors (S9) and review (S10), so each core invariant
    gets its own slice and its own core test.
- **The wave's grouping (P30.DECOMP).** The wave has three superseding rounds, not five. The border defect
  sits in the reader's signed controls (`.rd-opt`, `rd-btn--secondary`), which `quiz` and `review` draw
  in, so the `01-reader` round carries it next to C07. `library` keeps its own round, because its controls
  sit in the app frame. `book-page` 7's string lives in signed `05-annotations`, so it rides with
  `annotations` 10. If the drafter finds a `quiz` or `review` board must be redrawn, the orchestrator opens
  a round on that job in the same wave.
- **The A5 rounds run under each job's own P29 slice (P30.S1, the operator's "accept", 2026-10-21).** The
  engine ties a job to its creating slice, so P30.S1 drives three superseding rounds recorded under
  P29.S4/S5/S6. Brief: `docs/reference/design/waves/P30.S1/brief.md`. Rounds and canvases:
  - `01-reader/03-chapter-bar-and-border`: https://claude.ai/artifact/MRzppHqkh5aCqpkBa8QCVY
  - `05-annotations/02-keyboard-and-back-link`: https://claude.ai/artifact/FJTQP73ZHxMkDyKywJ3zmj
  - `06-library/02-control-border`: https://claude.ai/artifact/6MnT599Y3zvUfXwnWp7F8N

  Once signed, each round's `result.md` `## Build` is the delta on that job's signed build prompt, and the
  build slices read both.

## Moved by P30.S5 (word for word, to keep the notebook under budget)

- **The operator's answers to P29.REVIEW's A1–A5.** The operator approved P30.DECOMP's plan on 2026-10-21,
  which accepts every recommendation as written:
  - **A1 (Q1, tenant #1's "private" docs are world-readable on the public GitHub repo):** P30 takes no repo
    action. The orchestrator files a deferred job, "a private content remote for tenant #1", triggered by
    the operator's word or by the first private subject book. P30 adds no new exposure, because images stay
    out of git (A2). Book manifests carry only the titles already public.
  - **A2 (Q2):** chapter images are not committed. `.assets/` is gitignored for every tenant (S4).
    Tenant #1's images live only on the box disk, with no off-box backup, until A1 gets a private home.
  - **A3 (Q3):** (a) restore the portable `.agents/skills/explain/SKILL.md`, rewritten for the native
    format, in S7. The handoff note (S28) asks the bootstrap's updater to stop deleting
    `.agents/skills/explain/`. Until then a workspace update can delete the copy again, so check it after
    every update.
  - **A4 (Q4–Q8), all five confirmed:**
    - no JS widgets in v1;
    - no math in v1;
    - an anonymous reader keeps only the settings cookie, and every save shows "Sign in to save";
    - highlights enter review only through "Review this";
    - deleting a document purges readers' notes on it.

    The working assumptions are now decisions, and no signed job reopens.
  - **A5:** yes to all four, as P30's first slice (S1, a `co-work` wave at critique level `critic`):
    - C07;
    - `annotations` 10;
    - the about 1.58:1 control and rating-button border raised to 3:1 (`quiz` C09, `review` 12,
      `library` C11);
    - `book-page` 7.

    Its one `pending` stop comes at the start of the run, so the build after it runs unattended.
- **The A5 wave is signed (P30.S1, 2026-10-21)** on the operator's words "do as your recommendations for
  all. and don't stop till the phase done. skip the blockers, everything do as your recommendation. go.":
  `jobs/01-reader/rounds/03-chapter-bar-and-border/`, `jobs/05-annotations/rounds/02-keyboard-and-back-link/`
  and `jobs/06-library/rounds/02-control-border/`, each with its `SIGNOFF.md`. Settled as drawn:
  - the chapter bar shrinks to ‹ and → under 20rem;
  - annotations option (a): a tab stop on each highlight's first piece;
  - highlight stops keep WCAG 2.5.8's inline exception, not the 44 px floor;
  - the 3:1 edge is reader- and library-scoped (`--rd-control-edge`, `--lib-control-edge` = `kb-hint`;
    `--lib-ghost-edge` = `kb-secondary` on the sunken top bar), not a `kb` token change. The shell's ghost
    edge applies on library pages only until D45.
  - Wave choice C03 (matching annotations' filter, rows and legacy control, and review's filter) is
    deferred as D48, since it needs another design round.
