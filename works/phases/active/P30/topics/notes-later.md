# P30 notes for the late slices (S27, S28, REVIEW), full text

Moved word for word from `phase.md` → `## Notes for later slices` by P30.S5 to keep the notebook under budget. Each entry there is now one line that points here. A slice that consumes an entry says so in its `result.md` and may delete it here.

- **(from P29.S2, re-tagged by P30.DECOMP, for S27) Device checks** (D36 (7)). Run them in the operator
  runtime with Aside `u1`. The physical-device items are recorded as operator-run, for the gate walkthrough.
  - On iPhone and iPad in Safari and Chrome, and on Mac Chrome and Safari:
    - the legacy frame as the only scroller under `100dvh` (URL bar shown and hidden; the home-indicator
      strip, WebKit 292603);
    - momentum scrolling in the frame;
    - keyboard scrolling after focus;
    - external links opening a new tab;
    - whether the frame's `color-scheme` steers the 18 self-theming documents.
  - Native diagram hairlines at DPR 2 and 3.
  - Native Korean line breaking.
  - Print to PDF from Safari and from Chrome.
- **(from P30.DECOMP, for S27 and REVIEW) Before the gate:**
  1. Push `main` with the operator's permission, after integrating `kb-api` commits.
  2. Wait for a green Production Deploy.
  3. The orchestrator runs S6's migration on production, on the operator's word.
  4. Then the walkthrough.

  REVIEW drops D38–D40 once S25's frame is live. All nine design canvases become deletable once their
  surfaces ship; REVIEW raises that.
- **(from P29.S2, re-tagged by P30.DECOMP, for S28) What the bootstrap's `.claude/skills/explain/SKILL.md`
  must change:**
  - write native, not HTML;
  - send `book`, `chapter`, `lang`, `translated_from` and `assets`, with `format: "native"`;
  - on a re-explain, carry ids forward through `fetch_document`;
  - general mode: `#sources` becomes a `sources` block, and it publishes a loose document carrying
    `subject` by default, and a chapter only when a book is named;
  - the fixed five sections become the recommended outline;
  - translation keeps ids;
  - images are attached by name through the CLI's `--asset`, and images are no longer banned;
  - stop deleting `.agents/skills/explain/` (A3).
