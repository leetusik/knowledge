# Handoff to the bootstrap workspace: retire the old `/explain`, then ship the explain phase

For the agent working in the bootstrap repo (`bootstrap_agentic_workspace.sh`). Written 2026-10-21 from the
knowledge repo (`leetusik/knowledge`), phase P31, slice S6. It is an **index**: the detail lives in two files
you read next, and this note says in what order and what to expect. It **supersedes the version pins** in P30's
handoff and nothing else; P30's note stays as the record of the first half.

**Pinned bootstrap HEAD: `f207775` (workspace v62).** Every bootstrap line number below, and every one in
`PATCHES.md`, was re-grepped at that commit, before any edit. If HEAD has moved, re-grep before you edit, or
find each edit by its quoted text (the quoted strings are unique). P30's handoff was pinned to `7517446` (v61):
its line numbers drifted by one or two lines (for example the smoke suite's `"$nskill" -eq 18` is now line
1752, not ~1751), so treat them as hints and search by text.

Everything the note names is in the knowledge repo, under `works/phases/active/`:
- `P30/handoff-explain.md`: retire the old explain (the detail).
- `P31/package/README.md`: the package, its four new files and the order.
- `P31/package/PATCHES.md`: every edit to a file the bootstrap already has (sections 0 to 14).

## 1. Retire the old `/explain` (P30's changes, applied first)

Do everything in `P30/handoff-explain.md` section 2: delete `payload/claude/skills/explain/`, put the pointer
in the seed operations doc, the README block and the installer's closing line, make the updater never touch
anything named `explain`, adjust the smoke tests, write the release notes. Do not restate it here; the
package's `PATCHES.md` section 0 is the crosswalk between that note and this one. Skill count: 18 to **17**.

**What P31 supersedes in it, and nothing more:**
- **The pointer line.** P30's 2.1 text `explain: not written — run /knowledge:explain for this phase` becomes
  `explain: not written — run /knowledge:explain P<N> for one chapter, or create an explain phase for a book`,
  one fixed string everywhere (`PATCHES.md` section 6 lists every file).
- **The plugin minimum.** P30's 2.2 says plugin `0.4.0` or later; it is now **`0.5.0`** or later, because an
  explain phase runs `knowledge check` (the plugin skill's §4.9). Keep the install commands verbatim.
  `PATCHES.md` section 10 adds one sentence about explain phases to the pointer text.
- **The CHANGELOG.** One section covers both handoffs (`PATCHES.md` section 12).

P31 makes **no contract edit**: the contract stays at 12,281 of 12,288 bytes, so P30's net-negative edit to its
`/explain` sentence is still the only change there.

## 2. Apply the package, in this order

`P31/package/` mirrors your `payload/` (`package/<path>` goes to `payload/<path>`). One release, in order:

1. **P30's changes** (section 1 above).
2. **Copy the four new files**, never under `do-next-slice/reference/` (the build shares them):
   - `claude/agents/explain-critic.md`;
   - `claude/skills/do-whole-phase/reference/explain-chapter.md`;
   - `claude/skills/do-whole-phase/reference/explain-decomposition.md`;
   - `claude/skills/do-whole-phase/reference/explain-review.md`.

   The fifth file, `claude/skills/create-phase/explain-route.md`, is **not copied**: its text is appended to
   `payload/claude/skills/create-phase/SKILL.md` as `## The explain route` (`PATCHES.md` 1c).
3. **Apply `PATCHES.md` sections 1 to 12:** `create-phase` (step 2 fields, step 4.2, the route text), both
   `do-*` special-slice lines, the decomposition and review twins, the review skill, the pointer line in every
   file, `installer/build.py`, `installer/main.py`, the engine's counts, the seed docs and READMEs, the smoke
   tests, the CHANGELOG. Within a file apply bottom-up, or by quoted text, because P30's edits delete lines.
4. **Release** (`PATCHES.md` 13): `python3 installer/build.py` then `--check`; bump `WORKSPACE_VERSION`
   (`installer/main.py` line 48, `62` at `f207775`) and add the CHANGELOG section in the same commit; run
   `bash tests/retrofit_smoke.sh` alone in its shell call; commit with no phase or slice ids; refresh the
   repo's own install with `sh bootstrap_agentic_workspace.sh --update .`.
5. **Verify** (`PATCHES.md` 14): a fresh scratch install, a `--nested` one, and the `for this phase` grep.

**No engine change.** An explain phase is marked by an `## Explain` section in `intent.md`; the critic has no
route-table row (the orchestrator picks its model per call). The `do-next-slice` core sits at 8,174 of its
8,192 B cap, so do not add prose to it beyond what `PATCHES.md` says.

## 3. What a workspace gets afterwards

- **`/knowledge:explain`** (from the plugin) for one chapter: a topic or a change, researched, written,
  checked and published as a native document. The bare `/explain` is gone.
- **"make an explain phase for X"** for a whole book, through `create-phase`'s new explain route:
  - `DECOMP` researches and writes `book/outline.md`, cuts one bare slice per chapter, and **stops at the
    outline gate**: the operator says `accept`, or gives feedback and `DECOMP` runs again;
  - each chapter slice drafts, runs `knowledge check`, is judged once by the fresh-eyes `explain-critic`
    (a different model from the drafter), and is revised once;
  - the `REVIEW` reads the whole book, checks and **publishes every chapter private**, proves it private
    (an anonymous 404), reads it in the real reader through the agent's own browser profile, and returns the
    walkthrough. The operator accepts at the acceptance gate; making the book public stays the operator's act.

## 4. The minimums

- **Knowledge plugin 0.5.0 or later**, set up once with `/knowledge:setup` (it writes the org-level key the
  review publishes with).
- **`knowledge` CLI 0.2.0 or later** (`knowledge check`).
- **A knowledge server with `POST /api/documents/check`**, deployed by the knowledge operator (open question
  OQ1 in the knowledge repo; it is not the bootstrap's to do). Until then `knowledge check` exits 2 with
  `has no /api/documents/check`, the chapter's check is skipped with a report line, and the publish's own
  422 stays the backstop. Exit 2 for "cannot reach" or "key rejected" is **not** a skip.
- A private project in the operator's org, and a filled `## Operator Runtime` with an agent browser account
  signed into the reader as an org member (the package README lists these).

## 5. What the rehearsal taught (one line each, with where it now lives)

The package was rehearsed once, end to end, on a scratch stack before this handoff; these are the points a
cold reader would otherwise miss:
- **An outline entry carries three more lines,** `tags`, `web research: on | off` with a reason, and `images`:
  `explain-decomposition.md`, *What the plan asks the executor to do*.
- **Quiz and diagram targets name the exact case** (loose document or bound chapter; placed or not) and the
  code's step order, naming the function: `explain-decomposition.md`, and the critic's checks in
  `explain-critic.md`, *How you check*.
- **A chapter's `## Publish` is target-free:** `knowledge check <repo-root-relative draft> <flags>` with no
  `--base-url`, token or `--json`; the review adds the target and swaps `check` for `save`:
  `explain-chapter.md`, *The `## Publish` section*; used in `explain-review.md` steps 4 and 5.
- **Exit 2 is read from stderr:** only `has no /api/documents/check (HTTP 404 or 405)` and argparse's
  `invalid choice` are a skip (an old server answers 405): `explain-chapter.md` span 1 and `explain-review.md`
  step 4.
- **The critic judges the section against the plan's research line** (`on`/`off`) and checks diagram step
  order and the quiz's case: `explain-critic.md`, *Inputs* and *How you check*.
- **A chapter plan is filled only from the outline;** attribution comes from the slice's `## Dispatch`, the
  check's target is "the configured knowledge base", and no plan names a URL or key:
  `explain-decomposition.md`, *Each chapter's `plan.md`, later*.
- **Still untested:** whether the agent's browser profile can hold a reader sign-in as an org member (OQ10);
  the review returns `needs_operator` if it cannot, rather than borrowing the operator's profile.

## 6. Out of scope here

- Do not edit anything in the knowledge repo from the bootstrap session; the package, the plugin 0.5.0, the
  CLI 0.2.0 and the server route are its side.
- Do not re-vendor the skill, add an `explain` stub that forwards to the plugin, or revive `--with-explain`.
- Do not add a critic route-table row or any engine change; if you want one later it is your decision (the
  knowledge repo chose to ship without).
