# P30 slice breakdown — scope per slice (P30.DECOMP)

Linked from `phase.md` → `## Slice breakdown`. Each entry gives what the slice covers, the contract it reads,
and the named trigger behind a `high`. The contract is never restated here:

- **P29 `## Decisions`** (`works/phases/active/P29/phase.md`, read one section at a time with
  `phase-section P29 Decisions`) holds the S1/S2/S3 data contracts. They are cited below by heading, e.g. *S2 Ingest, search and MCP*.
- **The signed rounds** under `docs/reference/design/jobs/<job>/rounds/<round>/`: `build-prompt.md` (cited
  by its `§`/heading) and the snapshot `canvas/project/`. Never the live canvas. Where S1 lands a superseding round, read that round
  instead of the one it supersedes.

Each web slice builds **one signed surface under RESPECT THE DESIGN**. It verifies live in the manifest
runtime, `next dev :3030` plus the production build, through Aside `--account u1`. It names the design job it
implemented in its `result.md`, and it leaves a `frontend.md` Doc impact note that names the signed round as
that surface's design record.

## Design

- **S1 · Superseding design wave (A5)** — `co-work / high` (kind). It is one wave with one PENDING #1 stop and
  three superseding rounds, each at critique level `critic`:
  1. **`01-reader`** (supersedes `02-revise`) covers two items:
     - **C07:** the chapter bar overprints its labels at 150–200% text on a phone, and "‹ Book" overprints
       "Display" below 320 px. Evidence is in `09-legacy-and-print/rounds/01-legacy-and-print/` C07.
     - **The 3:1 control border:** a control-boundary role at least 3:1 in light, dark and sepia, applied
       to the reader's signed controls. Those controls are the `.rd-opt` choice look, `rd-btn--secondary`
       and the language switch's outline.

     `quiz` C09 (the option) and `review` 12 (the rating buttons) draw those signed reader parts in, so
     they take the fix from this round. Structural `kb-border-strong` hairlines are not controls and stay.
  2. **`05-annotations`** (supersedes `01-annotations`) covers two items:
     - **`annotations` 10:** keyboard reach to a highlight's popover, choosing between the two options its
       round posed;
     - **`book-page` 7:** the per-book list's back link reads "‹ Back to the book" when it is opened from the
       book page.
  3. **`06-library`** (supersedes `01-library`): **C11**, the library's control borders at 3:1. This is
     the app-frame side, so the round decides between a library-scoped role and the `kb` token. The `kb`
     token would widen the change to the console, which D44 and D45 own.

  If the drafter finds that `04-quiz` or `08-review` boards must be redrawn for the border, the orchestrator opens superseding rounds on them in the same wave.

  Cost: under the co-work mean ($72, about 400 span-minutes), since these are four fixes.

## Server backing

- **S2 · Books and chapters** — `high` (**core invariant**: persisted state; new SQLite tables, on-disk
  manifests and the write path of `POST /api/documents`). Contracts: P29 *S1 Entities*, *Book*, *Chapter*,
  *Versions × variants*, *Where each piece lives*, *Phase or slice → chapter* and *Compatibility*. It covers:
  - the manifests `<root>/.books/<project>/<book>.json`, written under the write lock (tenant #1 commits
    them with the chapter);
  - SQLite `books`, `chapters` and `chapter_variants`, rebuilt by a third walk in `server/reindex.py`;
  - `lang:` in the header;
  - publish placement from `book`, `chapter`, `lang`, `translated_from` and `subject` (a loose document's
    subject is stored with it);
  - the routes `GET /api/books?project=`, `GET`/`PUT /api/books/{project}/{book}`, `/app/books…` and
    `/app/orgs/{org}/{project}/books/{book}` (public-gated by project);
  - search hits gaining `book`, `chapter_key` and `lang`.

  `PUT` binds existing documents. That is S6's tool.
- **S3 · Native format: Python parser and validator** — `high` (**core invariant**: sanitizing; the
  ingest's 422 is the security boundary). Contracts: P29 *S2 Syntax*, *Header*, *Callout*, *Figure*,
  *Figure row*, *Diagram*, *Custom SVG*, *Code*, *Quiz*, *Sources*, *Ids* and *References*, plus the
  additive details from `02-figures`, `03-diagrams`, `04-quiz` and `05-annotations` (*Contract details P30
  adds*). It covers:
  - markdown-it-py with GFM and the three extensions;
  - YAML 1.2 core typed blocks;
  - the SVG allowlist, which rejects and never strips;
  - id syntax and assignment rules;
  - reference schemes and per-block limits;
  - the **normalized block tree JSON** and the **per-block plain-text projection**;
  - the shared **conformance fixtures**. This is core test 4, the Python half; S12 runs the same fixtures from TS.

  It is a pure module plus tests and is not wired to a route yet.
- **S4 · Image assets** — `high` (**core invariant**: auth and visibility on new read routes, plus
  deletion). Contracts: P29 *S1 Images* and `02-figures` *Contract details* (width, height, `animated`, the
  still frame). It covers:
  - `assets: [{name, media_type, content_base64}]` on publish;
  - magic bytes, the formats, and the limits of 2 MB, 20 images and 12 MB;
  - EXIF and GPS stripping (the dependency is S4's choice and adds no paid service);
  - the content-addressed store `<root>/.assets/…`;
  - `GET /app/documents/{id}/assets/{sha256}.{ext}` and the pretty `/@{org}/{project}/{slug}/assets/{file}`
    behind `_resolve_readable_doc`, with the constant 404 and the stated headers;
  - the web BFF asset relay route;
  - deleting a document removes its assets;
  - **`.assets/` gitignored for every tenant (A2)**.
- **S5 · Native ingest** — `high` (**core invariant**: persisted state; the version chain and the
  `html → native` format migration). Contracts: P29 *S2 Ingest, search and MCP*, *Format flag and `md`*,
  *Render model* (the read route) and *S1 Legacy → native re-explain*. It covers:
  - `format: "native"` on `POST /api/documents`, with every violation listed in one 422;
  - assigned ids written into the stored file and returned with the warnings;
  - reference resolution against the publish's assets and the index;
  - the **body limit for every format**;
  - the search and embedding plain-text projection;
  - reindex deriving `format` from the header;
  - the read route returning the native source plus the version's asset map;
  - MCP `fetch_document`'s `format: "native"`, recorded in `mcp-server/CONTRACT.md`;
  - the `html → native` migration: a stem-based `parse_archive_rel_path` and `document_versions` keying,
    the archived html, the rel_path updated in place, and the stem alias for by-path and MCP lookups.

  An `md → native` change stays an ordinary next version.
- **S6 · Library migration into books** — `high` (**core invariant**: the operator's live content; "no
  shared link breaks"). Input: P29.S1's book map (`works/phases/active/P29/slices/P29.S1/result.md` →
  *The book map*: 4 books, 33 chapters, 8 loose documents). It **re-reads `origin/main`** first and
  reconciles any document published since `ed8dba0`. It builds an idempotent binding tool with a dry run
  that drives `PUT /api/books`. It proves the binding locally against a copy of the `origin/main` library:
  every existing `/documents/{id}` URL and every `/@{org}/{project}/{slug}` URL resolves before and after,
  and no document file is rewritten (core test: the migration's link preservation). **The production run is
  not this slice's.** It is an orchestrator step after deploy, on the operator's word (see the note for S27
  and REVIEW). A mapping question only the operator can answer goes on `## Operator Questions`.
- **S7 · `/explain` and the CLI** — `low`. The approach is pinned: P29 *S2 /explain* and *S1 Phase or slice →
  chapter*, plus P29's handoff note for the general mode. It covers:
  - the native rewrite of `plugin/skills/explain/SKILL.md` (canonical) and `web/public/SKILL.md`;
  - **the portable `.agents/skills/explain/SKILL.md` restored (A3)**, so `python3 scripts/skills_parity.py`
    passes again;
  - the CLI's `knowledge save`: `--format native` or detection from the header, `--book`, `--chapter`,
    `--position`, `--lang`, `--translated-from LANG@V`, a repeatable `--asset NAME=PATH` and
    `--new-version`, with the header read first.

  It uses the CLI to publish the phase's dev fixture chapters (see the fixtures note).
- **S8 · Reader state** — `high` (**core invariant**: a new Postgres schema, per-user isolation and the
  purge on delete). Contracts: P29 *S3 Who keeps state*, *Keys*, *Resume and progress*, *Bookmarks*,
  *Highlights and notes*, *Quiz results*, *Tables*, *Routes and writes* and *Privacy*. It covers:
  - `alembic/versions/0006_reader_state.py` (seven tables, additive; the head is `0005_tenant_slug`);
  - every `/app/reader/…` read and write except review (S10) and anchor resolution (S9);
  - `unit` derived from the index, and re-written when a manifest binds or unbinds a document;
  - `DELETE state?scope=book|all`, and `PATCH profile`;
  - the purge in both document-delete handlers;
  - the web beacon route `POST /api/reader/position`, with the cadence, last-write-wins and the
    grow-only `max_fraction` and `finished`;
  - the quiz-attempt payload, which carries `doc` and `unit` from the start;
  - core tests 1 (isolation) and 2 (the visibility re-check).
- **S9 · Anchors** — `high` (**core invariant**: persisted annotation state; the ladder must never delete
  or move automatically). Contract: P29 *S3 Anchors*, plus `05-annotations` → *Sections and offsets*. It
  covers:
  - the server-side re-anchoring ladder (exact, fuzzy ≥ 0.8, moved, `block`, `orphan`) over the stored
    source;
  - the write-back of `anchor_status` and `anchored_version`;
  - resolved annotations in the chapter and document reads and in the per-book list;
  - language mapping by id with the nearest-preceding fallback;
  - legacy bookmarks as approximate after migration;
  - core test 3.
- **S10 · Review on FSRS** — `high` (**core invariant**: card state transitions). Contracts: P29 *S3 Review
  items*, *Algorithm: FSRS*, *Ratings*, *Item drift* and *Review data contract*, plus `08-review` →
  *Contract details P30 adds* (`limit_reached`, held cards in the counts, the quiz title and the question's
  place in `where`). It covers:
  - `fsrs` (py-fsrs) **pinned**, defaults plus one 10-minute step, with no optimiser;
  - seeding from the first attempt;
  - "Review this" cards (turning it off suspends the card, which keeps its history; deleting the highlight
    deletes the card);
  - the queue, the local day and the limits, the idempotent review, suspend, and the previews;
  - the unreadable-card exclusion.
- **S11 · Sign-in return address and org-slug URLs** — `high` (**core invariant**: auth, an
  open-redirect-sensitive return address). It **absorbs D18 (re-scoped at P28.REVIEW) and D32**:
  - `requireSession()` and its 401 branch carry `next=`, built through `headers()` or middleware and
    laundered by `safeNextPath`;
  - "Sign in to save" returns to the same chapter and block (`01-reader` §12);
  - reader URLs are built on the owner's org slug (`tenants.slug` is nullable).

  The landing after sign-in moves to `/library` in S22, where it is drawn.

## Web surfaces (one signed surface per slice)

- **S12 · Native render pipeline (TS)** — `high` (**core invariant**: sanitizing; render-side defense in
  depth, plus the offset projection the stored anchors depend on). Contracts: P29 *S2 Render model*,
  *Custom SVG* (Render) and *References* (At render). It covers:
  - remark with the slice's own plugin and `yaml` in a server component;
  - validating again at render;
  - mapping to React with no raw HTML, `innerHTML` or `dangerouslySetInnerHTML`;
  - the allowlisted SVG-to-React mapping;
  - the link schemes and the never-leaking "missing link";
  - the TS half of the conformance fixtures, including the per-block projection (core test 4);
  - `md` through the same pipeline with the extensions inactive;
  - server-side code highlighting into token classes (the library is the slice's pick, e.g. Shiki with CSS
    variables);
  - the app CSP as defense in depth.

  It builds the plumbing, not the look. Components render minimal semantic markup, which S13 onwards style.
- **S13 · Reader shell** (`01-reader`) — `low`. It covers:
  - *Tokens* (faces, the five text sizes, the themes including sepia, *Frame and motion*, the type scale);
  - *Layout*;
  - §1 Top bar, §2 the progress line, §3 the chapter bar (as superseded by S1), §12 Sign in to save, §13
    the Display sheet, §15 the sheets, §16 the reader's states;
  - *Behaviour* → *The chrome* and *Keyboard*;
  - the `kb_reader` cookie (P29 *S3 Who keeps state*);
  - the chapter route `/@{org}/{project}/books/{book}/{key}`;
  - native and `md` documents opening in the reader from `/documents/{id}` and the pretty URL. html stays
    on today's frame until S25;
  - the reader-scoped values in *Values P30 adds* that the shell uses.
- **S14 · Prose kit and chapter opening** (`01-reader`) — `low`: §5 the chapter opening and the generated
  table of contents, §6 and §6a prose and Hangul runs, §7 callouts, §8 code, §8a the diagram slot as a figure
  frame (its drawing is S17's), §9 tables and §9a the scroll fades, and the missing-link style.
- **S15 · Progress and moving** (`01-reader`) — `low`: §4 the resume pill, §10 the chapter end, §11 the
  chapter list, §14 version history with the stale-translation flag, the language switch, *Progress, section
  and finished* and *Opening and moving*. It wires positions and finishes to S8's API: the cadence, the
  beacon, and Mark as finished / unread.
- **S16 · Figures** (`02-figures`) — `low`: §1–§8. It covers the image box, the figure, the plain image, the
  figure row and the row card. The svg block is styled here on S12's mapping, along with the sources list and
  citations. The tone values are `03-diagrams`' (wave choice 1).
- **S17 · Diagrams I** (`03-diagrams`) — `low`: *The frame in the slot*, *Size*, *Faces and sizes*, *The
  tones* (including the svg classes), *Flow and state* (placement, sizing, shapes, gaps, orthogonal edges,
  groups and lanes, self-loops), *Labels that do not fit*, *Korean* and *The text alternative*.
- **S18 · Diagrams II** (`03-diagrams`) — `low`: *Sequence*, *Stack*, *Timeline* and *Chart* (bar, line,
  interval as `[low, high]` or `[low, median, high]`), plus *Every state* for all six kinds.
- **S19 · Quiz** (`04-quiz`) — `low`: §1–§9 and *Behaviour*. It covers grading on the client, saving the
  first attempt through `POST quiz-attempts`, the saved answer on return ("your answer, v3"), signed out,
  retry, keyboard and assistive technology. The option border is S1's.
- **S20 · Annotations I** (`05-annotations`) — `high` (**core invariant**: persisted state; the browser
  captures the stored anchor, quote plus block-projection offsets, which S9 re-maps). It covers:
  - *The paint*, including inside a folded callout;
  - *The selection flow* by mouse, touch and keyboard (keyboard as superseded by S1);
  - *The popover*, *The undo line*, notes on a highlight or a block, edit and delete;
  - "Review this", wired to S10;
  - the 2,000-character note.
- **S21 · Annotations II** (`05-annotations`) — `low`: bookmarks, *The place bar*, *The margin, the rows and
  the tag* (block and other-language markers), *The Notes sheet* with its Unanchored group, *A row in a
  list*, *The per-book list* (with S1's back link) and *Plain Markdown, legacy and signed out*.
- **S22 · Library** (`06-library`, as superseded by S1) — `low`: §1–§9. It covers the shell's "Reading"
  group (Library, Review), the member library by project and by subject, Continue reading, book cards,
  loose rows, Clear all, and the states. It adds the public org library `/@{org}`. The landing after sign-in
  becomes `/library` for every member (`library` 3, which changes `DEFAULT_NEXT_PATH`). Console, auth and
  landing change only where this forces it.
- **S23 · Book page** (`07-book-page`) — `low`: §1–§8. It covers the book shapes, member, another org and
  signed out, the notes entry, and "Clear this book's reading data".
- **S24 · Review surface** (`08-review`) — `low`: §1–§8. It covers the queue head, cards, ratings with
  previews (the rating border is S1's), the way back, suspend, the end states, the review settings
  (`PATCH profile`), and Display.
- **S25 · Legacy reader** (`09-legacy-and-print`) — `high` (**core invariant**: the sandbox and the
  cross-frame message boundary). Contracts: P29 *S2 Legacy path* and the round's legacy sections. It covers:
  - the full-screen `100dvh` frame as the only scroller;
  - the ~1 KB bridge (scroll, restore, link interception), replacing `injectHeightReporter` in **both raw
    relays**;
  - the sandbox gaining `allow-popups allow-popups-to-escape-sandbox`, still with no `allow-same-origin`;
  - validating `event.source` and the `navigate` message;
  - **retiring the handshake**: `web/src/lib/explainer-height.ts`, its parent half in
    `explainer-frame.tsx` and the frame's print pinning;
  - the legacy bar, hide and show, keyboard and focus, resume, progress and bookmarks through the bridge,
    languages and versions, loading and relay failure, the legacy Display with `color-scheme` following
    the theme, and the `look` field;
  - **absorbs D37**: `Cache-Control: no-transform` on both raw relays (its trigger, "the next change to the
    raw relay", fires here).
- **S26 · Print** (`09-legacy-and-print`) — `low`: the native print sheet (masthead, figure rows,
  diagrams, the quiz on paper, the answer key, the colophon, page breaks), extending `kb-print.css`; the
  legacy Print control; the ⌘P notice sheet. `print-blocks.tsx` and `export-pdf-button.tsx` retire from
  the legacy path.

## Close

- **S27 · Fidelity and functional sweep** — `qa / low` (cheap route; the orchestrator may bump it at
  planning). It runs across every P30 surface, at the manifest viewports, in `next dev :3030` and the
  production build, through Aside `--account u1` with the true-viewport harness from `## Operator Runtime`.
  It checks that:
  - every visible control works;
  - resume and progress survive a reload;
  - quiz results and highlights persist;
  - **no inner scroller** appears on any chapter or legacy document at DPR 2, with classic scrollbars, or
    across many width changes (P28's checklist lines in `qa.md`);
  - D36 (7)'s device checks pass (see the notes). The physical-device items are recorded as operator-run.

  Defects become `F` slices.
- **S28 · Bootstrap handoff note** — `docs / low`. A self-contained note saved as
  `works/phases/active/P30/handoff-explain.md`. It covers the five items in `intent.md` and P29's list of what
  the bootstrap's `.claude/skills/explain/SKILL.md` must change, and it asks the bootstrap's updater to stop
  deleting `.agents/skills/explain/` (A3). It is reported to the operator. **This repo never edits the
  bootstrap repo.**
