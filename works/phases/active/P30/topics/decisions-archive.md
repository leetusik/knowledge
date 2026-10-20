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
