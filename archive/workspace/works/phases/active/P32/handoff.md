# Handoff to the bootstrap workspace: a book researches first, then ships on the knowledge plugin's critic

For the agent working in the bootstrap repo (`bootstrap_agentic_workspace.sh`). Written 2026-10-23 from the
knowledge repo (`leetusik/knowledge`), phase P32, slice S10. It is an **index**: the detail lives in two files
you read next, and this note says in what order and what to expect. It builds on P31's package, which `main`
already carries (the explain references and the create-phase route exist there); it supersedes none of
P31's handoff except the plugin minimum (0.5.0 becomes **0.6.0**).

Everything the note names is in the knowledge repo, under `works/phases/active/P32/`:
- `package/README.md`: what the package does, the order, the minimums, permissions, the search cap, the cost.
- `package/PATCHES.md`: every edit to a file the bootstrap already has (sections 0 to 10), text-anchored.
- `package/claude/`: the three files that are copied or pasted (two references and the route text).
- `rehearsal/r2/` (`spend.md` first) and `rehearsal/r1b/scorecard.md`: the evidence behind the numbers below.

Do not edit the knowledge repo from the bootstrap session.

## 1. What this does

An explain phase (a book) now researches the **whole subject before it writes the outline**, on the knowledge
plugin's research pipeline: the `DECOMP` leads that research into `book/research/`, writes `book/outline.md`
with each chapter's reader tasks and evidence, and the operator's signature at the outline gate freezes the
research indexes. Each chapter then tops the research up (a small run into its own overlays), writes from its
reader tasks, and is judged by the plugin's `knowledge:explain-critic`, which replaces the bootstrap's own
critic (retired). A `/knowledge:explain ... book` request proposes the phase and, on the operator's literal
yes, hands it to `/create-phase` already confirmed.

## 2. Before you apply

1. **Release the knowledge plugin 0.6.0 first.** That is the operator's word and push; the knowledge repo
   never releases it. The new references need the skill's §9 and the plugin's research agents.
2. **The pin.** The package is anchored at bootstrap `main` = **`1f4aa7d`** (workspace v73), and re-counted at
   **`97e1c38`** (v74): every "Find" in `PATCHES.md` occurs exactly once at both. Of the files it patches, only
   `installer/main.py` (`WORKSPACE_VERSION = 74`) and `tests/retrofit_smoke.sh` (a new Test 10h, away from the
   anchors) changed between them. **If `main` has moved past `97e1c38`**, re-count the anchors as `PATCHES.md`
   says at its top (`git show HEAD:<file> | grep -c -F '<find>'`, each must print `1`) and compare the blob ids
   it names before you edit. Search by the quoted text, never by line number. Where the bootstrap's own
   `CLAUDE.md` at `HEAD` disagrees with the release rule here (`PATCHES.md` 9), its text wins.

## 3. Apply, in this order

`package/claude/` mirrors your `payload/claude/`. One release, one `changelog.d/` fragment. The numbers are
`README.md`'s *The order to apply it* and the `PATCHES.md` sections it covers:

1. **Check the base:** `git merge-base --is-ancestor 1f4aa7d HEAD`, then the anchor counts (section 2 above).
2. **The two references (`PATCHES.md` 2, 3):** copy `explain-decomposition.md` and `explain-chapter.md` over
   the payload's, byte for byte (the build shares them into `do-next-slice/reference/`).
3. **`create-phase` (`PATCHES.md` 1a, 1b, 1c):** the two sentences, then replace `## The explain route` to the
   end of the file with `package/claude/skills/create-phase/explain-route.md`. It is a paste, not a copied file.
4. **`explain-review.md` (4a to 4d)** and **`slice-executor.md` (5a, 5b)**, the explain carve-out (OQ2): in an
   explain phase only, the `DECOMP` executor and each chapter executor may dispatch the plugin's research agents.
5. **Retire the critic (`PATCHES.md` 6a to 6f):** move `payload/claude/agents/explain-critic.md` to
   `tests/fixtures/v73/`, then `build.py`, `main.py`, the `update-workspace` note, the READMEs and the seed
   operations doc. **The update step** is `RETIRED_FILES` (6c): `--update` lists a host's installed copy as
   `stale (ours, unchanged)` by content (four hashes), and `/update-workspace` step 9 deletes it; an edited copy
   is listed "yours, kept".
6. **The smoke suite (7a to 7c)** and **the release fragment (8):** `changelog.d/explain-research-pipeline.md`.
7. **The release (`PATCHES.md` 9):** `python3 installer/build.py`, then `--check`; set the `RETIRED_FILES`
   version to `main`'s `WORKSPACE_VERSION` **just before** `--release` (`73` at the pin, `74` at `97e1c38`: the
   last release that ships the file; the hashes stand); land the fragment with `python3 installer/build.py
   --release` (never edit `WORKSPACE_VERSION` or a numbered `CHANGELOG.md` section by hand); `bash
   tests/retrofit_smoke.sh` alone in its shell call, between `--release` and the commit; commit with no phase
   or slice ids; refresh the repo's own install with `sh bootstrap_agentic_workspace.sh --update .`, delete the
   stale critic it lists, and commit that in `git -C workflow`.
8. **Verify (`PATCHES.md` 10).**

**No P42/P40 order to choose:** both are merged in `main` (before `86ec6fa`). **No engine change, no contract
edit.** Explain chapters stay sequential: `reference/wave.md` says an explain phase "stays sequential", and the
`DECOMP` cuts chapters without `--depends-on`.

## 4. The minimums

- **Knowledge plugin 0.6.0 or later**, set up with `/knowledge:setup`. The `DECOMP` reads the version from
  `~/.claude/plugins/installed_plugins.json` and stops `pending` below it.
- **Bootstrap workspace v73 (`1f4aa7d`) or later:** the release steps need v73's `changelog.d/` fragments.
- **`knowledge` CLI 0.2.0 or later and a server with `/api/documents/check`**, as in P31; without them the
  check is skipped as before.
- **Claude Code that runs a subagent's own subagents** (the chapter executor leads; its research agents run
  beneath it, depth 2). The number to state: the README says "P32's tests ran on 2.1.283 and later" and "auto
  mode the interactive default". Those are two different things. **2.1.283 is when interactive Claude Code made
  auto mode the default** (`topics/hosts-and-delivery.md` §4.3, from the host docs); it is the floor for "needs
  nothing more". **2.1.309 is the version rehearsal 2 ran depth 2 on**, and it is the highest tested, not a
  measured floor: no lower version was tried for nesting. State both and claim no other minimum.

## 5. Running a book: permissions, the search cap, the cost

**Permissions.** The research runs on the **session's** permissions; the package does not change
`.claude/settings.json`.
- **Recommend interactive auto mode.** It needs nothing more.
- **Manual mode:** the executor returns `needs_operator` with the rules the skill's stop block prints. For a lead
  that reads `SKILL.md` as a file (the `DECOMP` or a chapter executor) those now include `Bash(python3 -c *)`,
  because its first call, §2's resolver, is a `python3 -c`. **That rule lets any inline Python run**, which is
  why auto mode is the better answer. The `DECOMP`'s plan-gate report names the lines before it dispatches.
- **`permissionMode: bypassPermissions` in `slice-executor`'s frontmatter did not apply** in rehearsal 2's
  manual-mode `claude -p` sessions, as a subagent or as the main thread; deny rules held at depth 2. Do not
  count on it to cover an explain lead. Detail: `README.md`, *Permissions*.

**The search cap.** Every web search in a session, by the main thread and every subagent together, counts
against Claude Code's per-session cap, **200 by default** (about 100 an hour refill). Measured: the `DECOMP`'s
whole-book research for a two-chapter book at tier 3 made **83** searches, and one chapter's top-up **13**. A
six-chapter book in one session is about 83 + 6 x 13, **about 160**, under 200 with little room; a wider
`DECOMP` or top-up passes it. Tell the operator to raise `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION` in their
**user** settings' `env`. **The package tells; nothing in the workspace sets it** (OQ4). At the cap a researcher
reports `failed: search-limit`, the executor returns `needs_operator`, and the run resumes from `run.md`.

**The cost** (rehearsal 2, list prices, `rehearsal/r2/spend.md`): the whole-book research and outline ≈ **$51**
(two chapters, tier 3); a chapter ≈ **$50 to $58** with its revision (≈ $48.3 measured up to its critique, the
revision's $5–10 estimated); a six-chapter book ≈ **$350 to $400**. `create-phase` tells the operator at step 2, but in
words only: the route's text says the book "costs several one-shot runs" and names the search cap, and gives
**no dollar figure**. If you want the order of magnitude in dollars said there, that is your edit to make; the
package does not.

## 6. What a workspace gets afterwards

- **A book's folders:** `book/research/` (the whole-book dossier; `pages/` is git-ignored, only its
  `.gitignore` is tracked), `book/research/summary.md` (the research summary the outline gate links), the
  **freeze** of `library.md` and `ledger.md` at the operator's signature, and per chapter the overlays
  (`library-ch<k>.md`, `ledger-ch<k>.md`), `outline-ch<k>.md`, `trace-<key>.md` and `book/critique/<key>.md`.
- **Chapters run one after another, never in a wave** (`README.md`, *Waves*): the carve-out is one research lead
  at a time, and the search cap is shared.
- **Who dispatches the critic, in the background or the foreground.** The **workspace's orchestrator
  dispatches `knowledge:explain-critic` in the background**, like every span (d63; `reference/verdicts.md`).
  The **skill's own §4.10 says foreground** because its caller there is a lead under `claude -p`, where a
  background critic was stopped after ten idle minutes. Both are right for their caller. Rehearsal 2's `-p`
  orchestrator sent it foreground (its main thread would have ended otherwise); the background dispatch from
  an interactive orchestrator is untested (section 8).

## 7. What the rehearsals taught (one line each, with where it now lives)

From the first rehearsal and its fix (S7, F1):
- **Write for the reader's task, not the topic's coverage:** the outline opens with `## Reader's task`, the
  draft is three passes under prose rules: skill §3.10 and §4.
- **The critic reads as the reader:** the `reader` category (an unserved task is a must-fix): skill Part B,
  B5 (*The rubric*); `plugin/agents/explain-critic.md`.
- **Under `claude -p` the critic is dispatched foreground:** skill §4.10 step 1. Its `maxTurns` is **120**
  (`plugin/agents/explain-critic.md`).
- **The result:** the new chapter wins Helpfulness, Comprehensiveness and Insight on both subjects, the old
  still wins Readability (length); the operator accepted that (d62): `rehearsal/r1b/scorecard.md`.

From the second (S9, Claude Code 2.1.309; `rehearsal/r2/spend.md`, `topics/build-decisions.md` d64 to d68):
- **A subagent or by-path lead gets no `allowed-tools` grant,** so the stop block prints its own lines; and
  **its probe A and every wave run in the foreground, a wave's calls in one message,** because a background
  agent's completion never reaches a subagent lead: skill §3.2, §3.5, §9.2, and both references (d65).
- **The slice line carries a label:** `slice: <id> (a label for the workspace's meter, not a task)`, so a nested
  agent does not take the id for a task; the meter's pattern still matches: both references (d66).
- **The critic finds the tools folder** from `run.md`'s `dossier:` line, and **a longer `--max-time` is not
  allowed** (a time-out is a failed exact text): skill B5 and B11 (d67).
- **`quick` keeps D6 and D7,** the reader-first outline and draft: skill §3.9 (d67).
- **The measured cost and search count:** `README.md`, *The search cap* and *The cost* (d68).
- **Attribution:** every nested span's first prompt matched the meter's `slice:` pattern (transcripts only;
  `dispatch-summary` itself was not run).

## 8. Left for the first real book

The operator accepted rehearsal 2 as it ran (d69), with the cap reached before the chapter's revision. These
are the first real book's to see (`README.md`, *What the rehearsal checks*):
- **A chapter's revision span and its commit under the freeze,** and **the review's freeze check** on that
  commit (rehearsal 2 checked the freeze on the working tree only, and it held).
- **The critic dispatched in the background by an interactive orchestrator.**
- **`dispatch-summary` on the nested spans** (the transcripts say it will attribute them).
- **Auto mode end to end:** rehearsal 2 ran in manual mode under `claude -p`, never in auto.

## 9. Out of scope, and known gaps

**Out of scope here:**
- Editing anything in the knowledge repo from the bootstrap session; the package, the plugin and the skill are
  its side.
- Re-vendoring the skill, adding an `explain` stub that forwards to the plugin, or reviving `--with-explain`.
- Setting `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION`, or changing the shipped `.claude/settings.json`.
- Running chapters in a wave, a codebase book on a sub-repo of a multi-repo host (`README.md`, *Known limits*),
  and thinning the bootstrap further.

**Known gaps:**
- **The plugin's §1 has no placement for minted ids** (`P-7kq2`): it counts numbered phases. The route suggests
  the slug from the id and the operator confirms it at step 2. Teaching §1 minted ids is a plugin follow-up.
- **The outline gate's report ran 3.7k characters** in rehearsal 2, against the workspace's ≈ 2k stop rule;
  the package does not enforce the length yet.
- **An explain phase created before this release** reads its three new fields as `none`; one already past its
  outline gate has no `book/research/` and must re-run its `DECOMP` before its next chapter (the `update-workspace`
  note, `PATCHES.md` 6d).
