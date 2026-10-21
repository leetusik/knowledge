# P31.S4: Package: the explain route, its DECOMP and REVIEW references, and the patch notes

## Goal

The second half of the bootstrap package. With S3's files, it is everything the bootstrap agent needs to make
"explain" a phase. These files all go into `works/phases/active/P31/package/` and mirror `payload/`:

1. **`claude/skills/create-phase/explain-route.md`**: the text of a new `## The explain route` section, to
   insert after the QA-sweep route.
2. **`claude/skills/do-whole-phase/reference/explain-decomposition.md`**: what an explain phase's DECOMP does.
3. **`claude/skills/do-whole-phase/reference/explain-review.md`**: what an explain phase's REVIEW does.
4. **`PATCHES.md`**: every edit the bootstrap must make to its existing files, file by file, with what to
   find, what it becomes and why.
5. **`README.md`**: completed. It covers what the package is, the file map into `payload/`, the order to apply
   it, and the minimums (plugin 0.5.0, a server with `/api/documents/check`).

## Read first

- `intent.md` and `phase.md`:
  - `## Decisions`, including publish-first-then-read, private meaning a private project under the org
    credential, and the three-span chapter slice;
  - the `for S4` notes, which carry the registration line numbers and the critic rule.
- S3's files: `package/claude/agents/explain-critic.md`, `package/.../explain-chapter.md`,
  `package/README.md`.
- The bootstrap, **read-only**:
  - `payload/claude/skills/create-phase/SKILL.md`: the procedure, plus the docs-phase and QA-sweep routes.
    Mirror their shape: prose, and "what that DECOMP will cut".
  - `payload/claude/skills/do-whole-phase/SKILL.md` and `do-next-slice/SKILL.md`: the "Before you plan a
    special slice" line.
  - `do-whole-phase/reference/decomposition.md`, `review.md` and `co-work.md`: the pending-stop and the
    acceptance-gate mechanics to reuse.
  - `payload/contract.md`: the `/explain` line, the size cap and the stop rules.
  - `payload/claude/skills/review-phase/SKILL.md`: the review pointer line.
  - `installer/build.py`, `installer/main.py` and `tests/retrofit_smoke.sh`, for the patch notes.
  - **Re-grep every line number against bootstrap HEAD.**
- `plugin/skills/explain/SKILL.md`: §1 (placement: books, chapter keys, sources), §3, §4.9 and §5. Refer to
  them by section and copy none of them.
- `works/phases/active/P30/handoff-explain.md`: S6 merges with it, so don't contradict it.

## Pinned decisions

1. **Marking an explain phase:** an `## Explain` section in the phase's `intent.md`, written at creation the
   way `## Design Style` is for design phases. Its fields:
   - **subject:** a phase id, a slice id or a free topic;
   - **mode:** codebase or general;
   - **book:** the slug and title, following the skill's §1 placement rules;
   - **lang:** the language, plus any translations wanted;
   - **reader:** who it's for and what they already know;
   - **depth:** about how many chapters;
   - **project:** the KB project, which must be private;
   - **visibility:** `private`.

   DECOMP and REVIEW read it. A phase without the section is not an explain phase. There's **no engine
   change**: the route is prose, like the QA-sweep route.
2. **The outline gate** (operator-confirmed: they sign the outline before chapters are written):
   - The DECOMP executor researches, writes `book/outline.md` and cuts one **bare** chapter slice per chapter.
     Chapters are `--kind implementation`, `--risk low` by default; `high` only with a named trigger, such as
     a chapter on a core algorithm or invariant.
   - The orchestrator then sets the **first chapter slice** `pending`, with `--stop-kind decision --on-words
     "'accept' signs the outline and the chapters run; feedback re-runs DECOMP"`, and stops. The stop
     follows the contract's stop rules: about 2k characters, the outline linked.
   - On feedback, DECOMP runs again: attempt 2, revising the outline and re-cutting the slices.

   **`book/outline.md` must state:**
   - the reader;
   - the order and prerequisites;
   - each chapter's key, title, goal and sources;
   - its planned diagrams and figures;
   - its quiz targets (the understanding each quiz checks).

   The critic reads all of this.
3. **The gate:** `accept-gate <P> --require`, declared at the DECOMP boundary. The operator reads the book in
   the real reader.
4. **REVIEW** (a review, high):
   - read the whole book for flow, repetition and the outline's promises;
   - decide every `disputed` critic finding;
   - run `knowledge check` on every chapter;
   - **publish every chapter, private**, with the org credential (never tenant #1 or the master token, which
     always publish public). Use each chapter's `## Publish` command from its `result.md`, with `check`
     swapped for `save`, and its `book/assets/<key>/`;
   - open the book in the real reader in the manifest runtime, and verify that every chapter renders, the
     diagrams show, the quiz works and the order is right;
   - findings become fix slices, which republish as new versions;
   - on pass, return the walkthrough: the book's URL and what to read.

   Publishing outward is the review's carve-out in an explain phase. Write it explicitly, because a review
   normally edits nothing.
5. **The review pointer line**, which is fixed text in several bootstrap files, becomes
   `explain: not written — run /knowledge:explain P<N> for one chapter, or create an explain phase for a
   book`. Keep it one fixed string everywhere, and list every file that carries it in `PATCHES.md`.
6. **The contract:** `/explain` is operator-invoked only. The explain route is created only on the operator's
   word, like every phase. Any contract edit must be **net-negative in bytes**, because the cap is
   12,288 B. Prefer no contract edit.

## Done when

- The five files exist, and the README maps every package file, S3's included, to its `payload/` path.
- `PATCHES.md` covers:
  - create-phase SKILL.md (insert the route; the procedure's step 2 asks for the `## Explain` fields when
    the request is to explain something);
  - both do-* SKILL.md special-slice lines;
  - `build.py` shared reference files;
  - registering the critic agent in `build.py` and `main.py`;
  - the pointer line in every file;
  - the skill count;
  - `tests/retrofit_smoke.sh`;
  - a CHANGELOG section with migration notes;
  - the rebuild and version-bump rule from the bootstrap's own CLAUDE.md.
- Nothing restates the plugin skill's rules.
- `validate` passes. No product code. The bootstrap is unchanged.

## Notebook

- `phase.md`:
  - S5's note: how to rehearse the outline step and one chapter, and what to look for;
  - S6's note: the package's apply order;
  - `## Now`.
- `result.md`: verdict block first.
- Unattended: record choices as `decided:` on `## Operator Questions`.

## Dispatch

slice=P31.S4
phase=P31
kind=implementation
risk=high
attempt=1
route=high
reason=risk high (not low)
tier=high
subagent_type=slice-executor-high
model=opus
pass_model=yes
effort=high
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=high
