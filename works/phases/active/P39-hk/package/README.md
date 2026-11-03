# P39-hk package: explain from the phases, and the research route, for the bootstrap

This is a ready-to-apply package for the bootstrap (workflow) repo, `bootstrap_agentic_workspace.sh`. It
moves the workspace's explain route onto the knowledge plugin 0.10.0's flow: an explain is written only
from the code at one commit and the records of the phases that built the subject, by one writer, checked
by one critic on a second model, and published private; a subject no phase covers is offered a **research
phase** first. There is no research run any more: no web search, no research agents, no verifier, no gap
rounds, no evidence gate, no preflight.

The package was prepared in the knowledge repo by phase P39-hk, slice S5, against bootstrap HEAD
**`bb525b9` (workspace v91)**. The operator relays it; `works/phases/active/P39-hk/handoff-explain.md` is
the index and tells the bootstrap agent how to apply it.

Paths here mirror the bootstrap's `payload/`: `package/<path>` goes to `payload/<path>`. **Five things are
not shipped files**: the two create-phase route texts, `PATCHES.md`, this `README.md` and `checks/`.

## The files

| Package file | Goes to | What it is | Slice |
|---|---|---|---|
| `claude/skills/do-whole-phase/reference/explain-decomposition.md` | `payload/claude/skills/do-whole-phase/reference/explain-decomposition.md`, **replacing it whole** (the build shares it into `do-next-slice/reference/`) | An explain phase's `DECOMP`: the sixteen-line `## Explain` check and how an older section is read; the plugin floor **0.10.0**; a book's brief and whole-subject evidence into `book/research/`, then `book/outline.md` with `## Drawn from` and `## Gaps`, each chapter naming the phases it draws from; the outline gate, whose signature freezes `brief.md` and `evidence.md`; a document's or a chapter's `doc/brief.md`, `evidence.md` and `outline.md`, then one `S1`; the run's only stops (permissions, the knowledge base) | P39-hk.S5 |
| `claude/skills/do-whole-phase/reference/explain-chapter.md` | `payload/claude/skills/do-whole-phase/reference/explain-chapter.md`, **replacing it whole** (shared) | A write slice's three spans: the writer reads its phases closer (a book's chapter: into `evidence-ch<k>.md`) and drafts; **you** dispatch the plugin's critic, on the **other model family** (`sonnet` for an Opus writer, else `opus`), with no `scratch:` and no `same-model: accepted`; the writer answers once in `answers.md` / `answers-<key>.md` and revises once. No top-up, no gap check, no chapter gate | P39-hk.S5 |
| `claude/skills/do-whole-phase/reference/explain-review.md` | `payload/claude/skills/do-whole-phase/reference/explain-review.md`, **replacing it whole** (shared) | The review: the freeze on `brief.md`, `evidence.md` and `book/outline.md`; the gaps read from `evidence.md`'s `## Gaps`; a write slice's **appended** evidence entries allowed; disputes read from the answers files; publishing, the privacy proof and the reader check **unchanged**; the `## Report` from the plugin's §8 | P39-hk.S5 |
| `claude/skills/create-phase/explain-route.md` | **Not a file.** Its text replaces `## The explain route` to the end of `payload/claude/skills/create-phase/SKILL.md` (`PATCHES.md` 1b) | The route: the refusals (a subject with no code, a plugin older than 0.10.0 added), the **sixteen fields** (`phases:` new, `run:` and `mode:` gone), the one confirmation in the plugin's own shape, the cost line "one writer and one critic on a second model", the stops, *A confirmed proposal*, and what `DECOMP` cuts | P39-hk.S5 |
| `claude/skills/create-phase/research-route.md` | **Not a file.** Its text follows the explain route at the end of the same `SKILL.md` (`PATCHES.md` 1b) | **The research route:** how the explain's "research first" reply and its `Research: <subject>` block become an ordinary phase of `research` slices, how it is cut and recorded so that a later explain's coverage lookup finds it, its waived gate | P39-hk.S5 |
| `PATCHES.md` | **Not shipped** | Every edit to a file the bootstrap already has, found by quoted text unique at `bb525b9`: create-phase, the slice executor's carve-out, `worktree.md`, `parallel-phase`, the seed operations doc, `README.en.md`, `installer/main.py`, the smoke suite; then the `changelog.d` fragment, the release and the verification | P39-hk.S5 |
| `checks/finds.py`, `checks/cites.py`, `checks/apply.py` | **Not shipped** | The three checks this package was validated with (read-only, or on a scratch copy): every quoted find exactly once at a commit; every cited plugin section present by number and heading; the package applied to a scratch copy with the patched smoke suite's explain pins run | P39-hk.S5 |

There is **no engine change**:
- `workflow.py` reads only the `unit` line of `## Explain` (`explain_unit`, `next`'s `explain_unit=`), and
  that line stays;
- a research phase is an ordinary phase: no flag, no new `intent.md` section, its `research` slices
  already record findings into the notebook and `topics/`;
- the critic has no route-table row: the orchestrator names its model per call.

No skill is added or removed (the count stays **19**), and no file is retired (`RETIRED_FILES` gains
nothing).

None of the files restates the plugin's rules. They cite `skills/explain/SKILL.md` by number **and**
heading; P39-hk renamed several of the headings P31 and v86 cited, so every citation was redone from the
knowledge repo's `works/phases/active/P39-hk/topics/skill-headings.md` and checked against the plugin's
skill as it stands for 0.10.0:

| Cited as | Was (v91's text) |
|---|---|
| §3 *Gather the evidence* | §3 *Research* |
| §3.2 *Permissions, and the payload builder* | §3.2 *D0b: the preflight* |
| §3.3 *The record, and resuming a run* | §3.3 *`run.md`, and resuming a run* |
| §3.4 *D1: the evidence* (and its *A v2: the prior plus the phases since*) | §3.4 *D1: the plan*, through §3.8; §3.9 *`quick` and `no-research`* (deleted) |
| §4.2 *The outline, from the signed shape* | §4.2 *Recommended outline* |
| §9.2 *The evidence for a book (an explain phase)* | §9.2 *Research for a book (an explain phase)* |
| §9.3 *A chapter: its evidence, then the draft* | §9.3 *A chapter: its top-up, then the draft* |
| B9 *The dossier: files, ids and entries* (the light record) | the same heading, the research dossier |
| B5 *Critic (`knowledge:explain-critic`)*, its *Your dispatch* | `B5 *Your dispatch*` (D85-qk (d): a bold part, not a heading) |
| — | Part B *The research roles*, B1–B4 (the four research agents): retired |

Unchanged and still cited: *The run, in one card*, §1 *Resolve the topic, the mode and the placement* (now
with *The reader*, *The shape*, *The phases that cover the subject*), *The front door, step by step*, §2
*Resolve the knowledge base configuration*, §3.1 *D0: the brief, and the prior version*, §3.10 *D6: the
final outline, the reader's path*, §4 *Write the chapter — native Markdown*, §4.6–§4.10, §5, §5.1, §8 *D9:
the report*, §9.1 *The book suggestion*.

## The order to apply it

One release (the next after v91, expected **v92**):

1. **Copy the three whole files** over `payload/claude/skills/do-whole-phase/reference/` (rows 1–3 above).
   Never put a copy under `do-next-slice/reference/`: `SHARED_SKILL_FILES` in `installer/build.py` makes
   those.
2. **Apply `PATCHES.md` sections 1–8**: create-phase (1a the research paragraph in step 2; 1b the two route
   texts in place of the old route), the slice executor (2a, 2b), `worktree.md` (3a, 3b), `parallel-phase`
   (4a, 4b), the seed operations doc (5), `README.en.md` (6), `installer/main.py` (7), the smoke suite
   (8a–8c).
3. **Write the release fragment**, `changelog.d/explain-from-the-phases.md` (`PATCHES.md` 9).
4. **Build, test, commit, land** (`PATCHES.md` 10): `python3 installer/build.py` and `--check`; the smoke
   suite alone; one commit with the rebuilt artifact and no phase ids; then `--release` on `main`, which
   stamps v92; **push `main`** before plugin 0.10.0 is published.
5. **Verify** (`PATCHES.md` 11).

## The minimums

- **The knowledge plugin 0.10.0 or later**, installed and set up once (`/knowledge:setup` writes the
  org-level key the review publishes with). 0.10.0 is the version whose explain skill has §3 *Gather the
  evidence* and no research agents; it ships from the knowledge repo's P39-hk (its release slice).
- **The `knowledge` CLI 0.2.0 or later** (`knowledge check`), and **a knowledge server with
  `POST /api/documents/check`**: unchanged from P31.
- **A private project** in the operator's org, and, for the review's reading, a filled `## Operator Runtime`
  naming the agent's Chrome `deviceId`: unchanged.

## How it was checked (P39-hk.S5)

- `checks/finds.py <bootstrap> bb525b9`: `finds checked=18 not-exactly-once=0`.
- `checks/apply.py <scratch copy>`: the package applied to a copy of `payload/`, `installer/`,
  `README.en.md` and `tests/retrofit_smoke.sh` at `bb525b9`; the patched suite's explain block (L206–L297
  after the patch) and the unchanged pins on the same files pass; the skill count is 19; the create-phase
  core is 39,388 B.
- On that copy, `python3 installer/build.py` wrote the artifact, and a fresh `--at-root` install from it had
  the three references byte-identical in both `do-*` skills and equal to the package's, both routes in
  create-phase, the new carve-out, no `explain-critic.md`, and `validate` passing.
- `checks/cites.py <the plugin's SKILL.md> <the install's .claude/**/*.md and docs/current/operations.md>`:
  `citations checked=218 bold parts checked=28 missing=0`. The same check over the knowledge repo's
  vendored v91 `.claude/` against the 0.10.0 skill: `missing=85` of 200, which this package clears.
