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


## Moved by the orchestrator before P30.S7 (word for word)

- **The build contract (P30.DECOMP).** Every slice builds from two records under RESPECT THE DESIGN, and
  this notebook does not copy either:
  - P29's `phase.md` → `## Decisions`, which holds the S1, S2 and S3 data contracts;
  - the signed rounds' `build-prompt.md` and their `canvas/project/` snapshots under
    `docs/reference/design/jobs/`. Where S1 lands a superseding round, that round wins.

  A gap in either record goes on `## Operator Questions`, never into a silent fix.
- **The operator's answers to P29.REVIEW's A1–A5** (P30.DECOMP's plan, approved 2026-10-21; every
  recommendation accepted as written; full text: `topics/decisions-archive.md` → *Moved by P30.S5*):
  - A1: no repo action in P30, and a deferred job for a private content remote;
  - A2: chapter images are never committed (`.assets/` is gitignored);
  - A3: S7 restores the portable explain skill;
  - A4: no JS widgets or math in v1, an anonymous reader keeps only the settings cookie, highlights
    enter review only through "Review this", and deleting a document purges readers' notes;
  - A5: the four design fixes ran as S1's wave.
- **The cut's shape (P30.DECOMP).** The order is the wave, then the server backing, then `/explain` and the
  CLI, then the web surfaces, then print, the sweep and the handoff.
  - **The wave first:** under RESPECT THE DESIGN, no surface may be built over a signed defect.
  - **Backing before surfaces:** every surface reads an API that must exist first.
  - **`/explain` and the CLI (S7) before the web:** S7 restores the parity gate early and gives the web
    slices a real way to publish native fixture chapters with images.
- **Granularity (P30.DECOMP).** Each slice is about one P28-sized implementation slice, cut on the build
  prompts' own section seams (`01-reader` three ways, `03-diagrams` and `05-annotations` two, `09` two, the
  native format parser then ingest, reader state as S8/S9/S10). Full text: `topics/decisions-archive.md`.
- **The wave's grouping (P30.DECOMP).** Three superseding rounds, not five (the border defect rides the
  `01-reader` round, `library` keeps its own, `book-page` 7 rides `annotations` 10). Full text:
  `topics/decisions-archive.md`.
- **Ratings (P30.DECOMP).** Twelve implementation slices are `high`, each for a named core invariant (the
  breakdown table). S1 is `high` by kind. The other web surfaces are `low` because their build prompts pin them. S20 is `high` because it
  captures the stored anchor. S12 and S25 are `high` for the render-side sanitizing and the frame's message
  boundary.
- **Deferred-job routing (P30.DECOMP).** The orchestrator runs these:
  - **D37** is absorbed by **S25**, not S4 as the plan suggested. S25 rewrites both raw relays (the bridge
    and the sandbox tokens), and that change is D37's trigger;
  - **D18** (re-scoped at P28.REVIEW to the member guard) and **D32** are absorbed by **S11**;
  - D37, D18 and D32 stay open as records (`promote-deferred` only creates new slices, and S11 and S25
    already exist). Each absorbing slice's plan reads the job's `brief.md`, and P30.REVIEW closes the
    three once their slices ship;
  - **D38, D39 and D40** stay open, to be dropped at P30.REVIEW once S25's frame is live;
  - **D25, D36, D13 and D41–D46** stay as they are. D36 (7)'s device checks are S27 inputs; D36 stays open
    for the console walk.
- **The library migration's production run is not a slice (P30.DECOMP).** S6 builds and proves the binding
  locally. Running it on production writes the operator's live content through `kb-api` commits, so the
  orchestrator runs it after deploy, on the operator's word, before the gate walkthrough.
- **The acceptance gate is required (P30.DECOMP).** The intent says so: the operator walks the running
  reader on phone, iPad and desktop. The orchestrator runs `accept-gate P30 --require` with this slice's
  commit.
- **The A5 rounds run under each job's own P29 slice (P30.S1, the operator's "accept", 2026-10-21).**
  P30.S1 drove three superseding rounds recorded under P29.S4/S5/S6; each signed round's `result.md`
  `## Build` is the delta on that job's signed build prompt. Brief, round names and canvas links:
  `topics/decisions-archive.md`.
- **The A5 wave is signed (P30.S1, 2026-10-21)** on the operator's "do as your recommendations for
  all…": `jobs/01-reader/rounds/03-chapter-bar-and-border/`, `jobs/05-annotations/rounds/02-keyboard-and-back-link/`
  and `jobs/06-library/rounds/02-control-border/`, each with its `SIGNOFF.md`. What was settled as drawn
  (the ‹ → chapter bar under 20rem, annotations option (a), WCAG 2.5.8's inline exception, the
  reader- and library-scoped 3:1 edge tokens) and wave choice C03, deferred as D48:
  `topics/decisions-archive.md` → *Moved by P30.S5*.
- **Run mode (the operator, 2026-10-21): unattended to the end of the phase.** "don't stop till the phase
  done. skip the blockers, everything do as your recommendation." The orchestrator settles a slice's
  operator question with its own recommendation, records it on `## Operator Questions` as decided, and
  continues. It still never pushes, deploys or runs the production migration unasked, and the acceptance
  gate stays the operator's.
- **The book model is shipped server-side (P30.S2).** It follows P29.S1's contract exactly. The choices it left open are recorded as OQ1–OQ3, all decided:
  - variants name documents by `rel_path`;
  - a POST seeds only a new book or chapter, and `PUT` edits;
  - deleting a bound document leaves its binding to be dropped on read.

  The header writes `lang:` only when it is sent; placement then defaults to `en`. Search's `lang` is the variant key, and it is null for a loose document even when its header has a `lang:`.
- **The native format's parser is shipped as a pure module (P30.S3).** `server/native/` parses a chapter into
  the normalized block tree, is not wired to a route yet, and **rejects, never strips**: one
  `NativeFormatError` lists every violation, with its line and a stable code. It uses markdown-it-py 4.2.0
  and mdit-py-plugins 0.6.1 (GFM tables, strikethrough, `gfm_autolink`; no task lists or footnotes), plus
  a YAML 1.2 core loader on PyYAML. The tree, the codes and the projection are specified in
  `server/native/README.md`, which S12 reimplements. The open choices are OQ4–OQ8, each decided by the
  stricter option or the signed round:
  - the anchor projection is the signed `05-annotations` *passage containers*, not P29's search projection;
  - unknown enum values are rejected at ingest;
  - YAML-internal ids are required;
  - the svg block is a YAML mapping.
- **Chapter images are shipped server-side, with the web relay (P30.S4).** P29.S1 *Images* exactly: P29's
  per-document layout `<root>/.assets/<project>/<date>-<slug>/<sha256>.<ext>` (it names one, so the plan's
  hash-prefix layout gave way), dedupe within the document, and the delete path removes the directory.
  The version's map `{name: {file, media_type, width, height, animated[, still]}}` lives in its header and
  is mirrored into SQLite. Reads go through the document's own gate with one constant 404. `.assets/` is
  kept out of git three ways: the repo `.gitignore`, a self-ignoring `.assets/.gitignore`, and
  `gitops.add`. The open choices are OQ9–OQ13, all decided: lossless container-level stripping, animated
  images GIF only, a five-minute cache, no inheritance across versions, and the 20m edge cap.
- **Native ingest is shipped (P30.S5).** It follows P29.S2's *Ingest, search and MCP* contract and
  P29.S1's *Legacy → native re-explain*. Its open choices are OQ14–OQ19, all decided:
  - a publish sends the body, and the server writes the header;
  - one 422 list, with lines counted in the body as sent;
  - references follow P29 exactly (`asset:` and `#id` misses fail, `chapter:` and `doc:` misses warn);
  - body limits: native and md 512 KB, html 1 MB;
  - only native chapters carry images;
  - every earlier version's ids are retired;
  - the DB keeps `source` (the file) and, in `markdown`, the search projection;
  - html → native keeps the row's id and moves its rel_path and version chain to `<stem>.md`, with the
    book binding following;
  - a stem alias keeps old `.html` paths readable, and one document owns each stem.
- **The library migration is built and proved locally (P30.S6).** `scripts/migrate_books.py` binds the
  map `scripts/migrations/p30_books.json` (P29.S1's 4 books, 33 chapters, 8 loose; `origin/main` still at
  `ed8dba0`) through `PUT /api/books` only. A book already on the server is merged, never replaced, and any
  disagreement refuses the run before a write. Every reader URL is hashed before and after, and an
  unchanged book gets no `PUT`. Titles and merge rules: OQ20–OQ21. Steps: `topics/migration-runbook.md`.

