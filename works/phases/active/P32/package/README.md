# P32 package: the explain phase on the knowledge plugin's research pipeline, for the bootstrap

This is a ready-to-apply package for the bootstrap (workflow) repo, `bootstrap_agentic_workspace.sh`. It brings
the explain phase (a book, P31's package) onto the knowledge plugin's research pipeline, plugin **0.6.0**:

- **research before the outline.** The phase's `DECOMP` leads the explain skill's whole-book research (§9.2)
  into the phase's `book/research/` dossier, then writes `book/outline.md` from it, with each chapter's
  **reader tasks**, questions, claims, declared gaps and expected top-up, and `book/research/summary.md`,
  which the outline gate links. The operator's signature **freezes** the book's research indexes;
- **a top-up per chapter.** Each chapter slice leads its own small research run (§9.3) into per-chapter
  overlays, writes from its reader tasks (§3.10, §4) keeping `trace-<key>.md`, and is judged by the plugin's
  **`knowledge:explain-critic`** (`kind: chapter`) on the other model family;
- **the plugin's book suggestion hands over to `/create-phase`.** A proposal the operator accepted with a
  literal yes arrives confirmed (OQ3), and the route asks three new fields: `must-cover`, `leave-out` and
  `trusted sources`, with `lang: en` by default;
- **one carve-out (OQ2):** in an explain phase only, the `DECOMP` executor and each chapter executor may
  dispatch the plugin's research agents. Nothing else in `slice-executor` changes;
- **the bootstrap's own `explain-critic` is retired,** and `--update` lists a host's installed copy as stale
  for `/update-workspace` to delete.

The package was prepared in the knowledge repo by phase P32 (slice P32.S8). The operator relays it; this repo
never edits the bootstrap. Paths under `claude/` mirror the bootstrap's `payload/claude/`. There is **no
engine change and no contract change**.

None of the files restates the plugin's research or writing rules: they cite `skills/explain/SKILL.md` by
section (§1 placement, §2 configuration, §3.2 preflight, §3.3 resume, §3.10 the chapter's outline (D6), §4
writing (D7), §4.7 images, §4.8 read-through, §4.9 check, §4.10 critic (D8), §5 publish, §9.1 the book
proposal, §9.2 the whole-book research, §9.3 a chapter's research, Part B's B5 critic dispatch).

## The files

| Package file | Goes to | What it is |
|---|---|---|
| `README.md` | **Not shipped** | This file: what the package does, the order, the minimums, permissions, the search cap, cost, waves, limits |
| `PATCHES.md` | **Not shipped** | Every edit to the bootstrap's existing files, text-anchored at bootstrap `main` = `1f4aa7d`, the v73 release (each anchor found exactly once there and at `86ec6fa`, `22529b4`, `a484241` and `8789a2f`), plus the release fragment, the release rule and the checks after applying |
| `claude/skills/do-whole-phase/reference/explain-decomposition.md` | `payload/claude/skills/do-whole-phase/reference/explain-decomposition.md` (**replaces** it; the build shares it into `do-next-slice/reference/`) | The `DECOMP`: the eleven `## Explain` fields, the skill found through `installed_plugins.json`, the whole-book research (§9.2) into `book/research/` (`pages/.gitignore` first), `book/outline.md` with each chapter's reader tasks and evidence, `summary.md`, chapter slices `--risk high`, the outline gate and the freeze |
| `claude/skills/do-whole-phase/reference/explain-chapter.md` | `payload/claude/skills/do-whole-phase/reference/explain-chapter.md` (**replaces** it; shared the same way) | A chapter slice's three spans: the executor tops up (§9.3), drafts from the reader tasks (§3.10, §4) and checks; the orchestrator dispatches `knowledge:explain-critic` with the B5 block; the executor answers once. Plus the critic's model rule and the freeze check at the commit |
| `claude/skills/create-phase/explain-route.md` | **Not a file.** Its text replaces `## The explain route` through the end of `payload/claude/skills/create-phase/SKILL.md` (`PATCHES.md` 1c) | The route: the eleven fields, plugin ≥ 0.6.0, the cost said up front, *A confirmed proposal* (the plugin's §9.1 handoff), and what that `DECOMP` will cut |

`explain-review.md` and `slice-executor.md` get patches, not replacements (`PATCHES.md` 4 and 5): their
changes are a few sentences in long files.

## The order to apply it

Apply it as **one release** (one `changelog.d/` fragment, which `build.py --release` stamps into the next
version), after the knowledge plugin 0.6.0 is published: the new references need §9 and the research
agents. Where the bootstrap's own `CLAUDE.md` at `HEAD` says otherwise about releasing, it wins.

1. **Check the base.** `git merge-base --is-ancestor 1f4aa7d HEAD` must succeed. If `HEAD` is not `1f4aa7d`,
   re-run the anchor counts (`PATCHES.md`, top) and compare the blob ids it names; a changed blob means
   that file was edited since, so carry that edit through (`PATCHES.md`, top).
2. **The two references** (`PATCHES.md` 2, 3): copy the package's files over the payload's, byte for byte.
3. **`create-phase`** (1a, 1b, 1c): the two sentences, then the route replaced by `explain-route.md`.
4. **`explain-review.md`** (4a–4d) and **`slice-executor.md`** (5a, 5b).
5. **Retire the critic** (6a–6f): the payload file moved to `tests/fixtures/v73/`, `build.py`, `main.py` and
   its `RETIRED_FILES` line, the `update-workspace` note, the READMEs and the seed operations doc.
6. **The smoke suite** (7a–7c) and **the release fragment** (8).
7. **The release** (9): build, `--check`, set the `RETIRED_FILES` version, land it with `--release`, smoke
   alone, commit, then refresh the repo's own install and delete the stale critic it lists.
8. **Verify** (10).

## The minimums

- **The knowledge plugin 0.6.0 or later**, set up (`/knowledge:setup`): §9, the research agents
  (`knowledge:web-researcher`, `code-researcher`, `gap-reviewer`, `verifier`) and `knowledge:explain-critic`
  with `kind: chapter` and its `reader` category. The `DECOMP` reads the version from
  `~/.claude/plugins/installed_plugins.json` and stops `pending` (operator action) below it.
- **The `knowledge` CLI 0.2.0 or later and a server with `/api/documents/check`** for the check; without
  either, §4.9's skip applies, as in P31.
- **The bootstrap at workspace v73 (`1f4aa7d`) or later.** The anchors hold from `86ec6fa` on (P42's waves and
  the multi-repo host merged), verified at `86ec6fa`, `22529b4`, `a484241`, `8789a2f` and `1f4aa7d`; the release
  steps (`PATCHES.md` 8, 9) need v73's `changelog.d/` fragments, stamped by `build.py --release`.
- **Claude Code** that runs a subagent's own subagents (spawn depth 2: the executor leads, its research agents
  run beneath it), with auto mode the interactive default. P32's tests ran on 2.1.283 and later.

## Permissions

The research agents run on the **session's** permissions; the workspace's shipped `.claude/settings.json` is
not changed and must not be.

- **Interactive auto mode** (the default) needs nothing more.
- **Manual mode:** the skill's preflight (§3.2) probes before the research starts and, on a denial, returns
  `FAILED: permissions` with the exact allow rules for this machine (WebSearch, WebFetch, its `curl`, page-text
  and `pdftotext` commands, read-only `git show/log/grep/blame/diff/status`, `shasum`, `mktemp`, the
  `knowledge` CLI, and `Read`/`Edit` on the repo root and `Read` on the skill's folder). The executor returns
  `needs_operator` with that block; the operator adds it to `.claude/settings.local.json` (or turns on auto
  mode), and the span resumes from the run's `run.md`.
- **What needs approval and so fails unattended** (found under `claude -p`, P32.S5–S7): a command with `$`, a
  comma brace expansion (`{a,b}`), `git -C`, `sed -i`. The skill's commands avoid them, and a lead must too.
  `git -C workflow …` in the references is the orchestrator's, in an interactive session, on a nested host.
- **No Grep or Glob tool on some hosts** (Claude Code 2.1.308 had neither). Nothing in the package needs them:
  the `DECOMP` finds the skill by reading `installed_plugins.json`, never by globbing the plugin cache.

## The search cap (OQ4)

Every web search in a session, by the main thread and by every subagent at any depth, counts against Claude
Code's per-session cap, **200 by default** (P32.S3 saw it refill about 100 an hour). A book's whole-book research alone can pass it (§9.2's ceiling is
45 dispatches, about 8 searches each), and the chapters' top-ups add to the same session's count. The operator
raises `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION` in their **user** settings' `env` (for example `"1000"`; the
plugin's README, *Explain: permissions and the search cap*). **The package tells the operator; it never sets
it**, and nothing in the workspace writes it. At the cap a researcher reports `failed: search-limit` rather
than "not found"; the executor returns `needs_operator`, and the run resumes from `run.md` after the cap is
raised or in a new session (the cap is per session).

## The cost

P32.S7 measured a `full` single document at about **$28–44 on an Opus lead**, about 12–18× `/explain` 0.5.0. A
book is several of those: the whole-book research is at least one full document's research, and each chapter
adds a top-up, a three-pass draft and a critic, close to one full document each. So a six-chapter book is
roughly 6–8 such runs, on the order of $170–350 at S7's rates. That is an **estimate, not a measurement**;
P32.S9's rehearsal gives the first figure. `create-phase` tells the operator the order of magnitude at step 2,
and the `DECOMP`'s plan-gate estimate gives time from the meter.

## Waves

**No wave runs explain chapter slices.** `reference/wave.md` (P42) says it directly: "An explain phase declares
nothing, so it stays sequential", and the `DECOMP` cuts every chapter without `--depends-on`. So:

- **the carve-out is one research lead at a time:** the `DECOMP`, then each chapter in turn. Never two leads in
  one session;
- **the search cap is still shared, sequentially:** the `DECOMP`'s research and every chapter's top-up in one
  `/do-whole-phase` session add up against one cap (above);
- **the dossier would allow waves later:** each chapter writes only files named for it, one writer per
  overlay, and the frozen indexes are read-only. Running chapters together would still multiply concurrent
  agents against the session's limit and share one search cap, so it stays a deliberate later change, not a
  side effect of this package.

## Known limits

- **A codebase book on a sub-repo of a multi-repo host is not supported.** The plugin's code researcher's
  repository is the session's working folder (it runs `git`, never `git -C`), so a `codebase` book must be
  run from the repo it explains.
- **A headless orchestrator is untested.** The orchestrator dispatches the critic like every span, in the
  background (`reference/verdicts.md`); the skill's §4.10 foreground rule is for its lead under `claude -p`,
  where a background critic was stopped after ten idle minutes.
- **The plugin's §1 placement counts numbered phases** (`p<N>`, position `N`). The bootstrap mints ids since
  v73 (`P-7kq2`), which have no number: the route suggests the slug from the id (`p-7kq2`) and the
  operator confirms it at step 2. Teaching §1 minted ids is a plugin change, outside this package.
- **An explain phase created before this release** reads its three new fields as `none`; one already past
  its outline gate has no `book/research/` and must re-run its `DECOMP` before its next chapter (the
  CHANGELOG's migration notes).

## What the rehearsal checks

P32.S9 runs a small book through the package's texts, in a scratch folder laid out as an explain phase (never
by installing the bootstrap), and the first real book in an updated workspace settles the rest. Between them,
beyond "it works", they settle what no test here could:

1. whether the research agents a chapter executor dispatches (depth 2) run on the session's permissions
   (auto mode, or the rules in `settings.local.json`), and whether a denial there surfaces as the preflight's
   `FAILED: permissions`;
2. whether background research agents' completions reach a lead running as a subagent (the preflight's probe
   A, "end your turn and wait"), so the skill's wave loop works at depth 1;
3. whether `dispatch-summary` attributes the depth-2 spans and the critic's span to the slice by their
   `slice: <id>` first line;
4. the critic in the background from the orchestrator, on the other family, with `kind: chapter`;
5. the freeze: the chapter commits touch only files named for their chapter, and the review's check finds it;
6. the search count of the `DECOMP`'s research against the cap, and the book's real cost.

S9's leads run as `claude -p` sessions, each the session's main thread, so their research agents sit at depth 1
and no workspace engine meters them: items 1–4 depend on the orchestrator and executor layering and stay the
first real book's unless S9's plan nests the leads under a subagent. Items 5 and 6 S9 reads from its own
commits and transcripts.
