# P39-hk patch notes: every edit the bootstrap needs to its existing files

These notes are for the agent working in the bootstrap repo (`bootstrap_agentic_workspace.sh`). The
package's **whole files** are listed in `README.md`. This file lists every edit to a file the bootstrap
**already has**, file by file: what to find, what it becomes, and why.

**Pinned to bootstrap HEAD `bb525b9` (workspace v91, 2026-11-02).** Every line number below was read at that
commit, before any edit. Line numbers are **hints**: find each edit by its quoted text, which occurs
**exactly once** in its file at `bb525b9` (checked by script; P39-hk.S5's `result.md` has the count). If
HEAD has moved, the quoted text still finds the place; if a quote no longer matches, re-read the file
around the hint before you edit. Within one file, apply bottom-up or by quoted text.

**The quoting form.** Each edit gives `**Find** in <file>` with the exact text in a ` ```text ` block,
then what it becomes. A find inside a long line is a substring of that line: replace only that part.

## 0. What changes, in one paragraph

An explain phase stops running a research pipeline. The knowledge plugin 0.10.0's explain skill reads
only the code at one commit and the records of the phases that built the subject (one writer), checks the
draft with one critic on a second model, and publishes private; a subject no phase covers is offered a
**research phase** first. The workspace side follows: `create-phase`'s explain route takes the new
sixteen-line `## Explain` set (`phases:` new; `run:` and `mode:` gone) and gains *The research route*;
the three explain references are rewritten whole (the package's files); the slice executor's explain
carve-out becomes "the writer dispatches no agent"; and the seed doc, the README, the installer's closing
line and the smoke suite drop the research wording. **No engine change:** `workflow.py` reads only the
`unit` line of `## Explain` (`explain_unit`), which stays; a research phase is an ordinary phase. **No
skill is added or removed:** the count stays **19**. No file is retired, so `RETIRED_FILES` gains nothing.

## 1. `payload/claude/skills/create-phase/SKILL.md`

**1a. Step 2 routes the research reply.**

**Find** in `payload/claude/skills/create-phase/SKILL.md` (L33, the end of the explain paragraph):

```text
A request that arrives from `/knowledge:explain` with a proposal the operator accepted with a literal yes is already confirmed: *A confirmed proposal* in the route.
```

**Becomes:** the same sentence, then a blank line and this paragraph, indented three spaces like its
neighbours:

```markdown
   **If the request carries a `Research: <subject>` block** (the explain's "research first": no phase covers the subject yet), it is not an explain but an ordinary phase that records findings for one: follow *The research route* below.
```

- **Why:** the plugin's front door hands the "research first" reply to `create-phase` with that block; step 2 is where every route is chosen.

**1b. Replace the explain route, then add the research route.**

**Find** in `payload/claude/skills/create-phase/SKILL.md` (L121, the heading):

```text
## The explain route
```

**Becomes:** delete from that heading (L121) to the **end of the file** (L210, the paragraph that opens
`**The acceptance gate, per unit:**`), and put in its place, in order:
1. the whole of the package's `claude/skills/create-phase/explain-route.md` (it starts at its
   `## The explain route` heading);
2. a blank line, then the whole of the package's `claude/skills/create-phase/research-route.md` (it starts
   at `## The research route`).

- **Why:** most of the route changes (the fields, the confirmation, the cost, the stops, *A confirmed
  proposal*, what `DECOMP` cuts), so it is given whole. Unchanged inside it: the refusal from a phase
  worktree, the private-project refusal, step 3's create-and-run order (`new-phase`, `intent.md`, the
  intake commit, `parallel-start`, `auto`), and *The acceptance gate, per unit*.
- **Note:** both package files are **text to insert, not files to ship**. Never copy them into
  `payload/claude/skills/create-phase/`: the build ships every file under a skill directory. The core goes
  from 31,474 B to 39,388 B (measured on a scratch copy with this package applied); the smoke suite caps
  only the `design-cowork` and `do-*` cores.
- **D85-qk (b) is settled here:** the route's own confirmation now has the plugin's shape (the plain
  summary, the reader, the sections, the other shapes, the `Built by:` and `Cost:` lines), drawn from the
  installed skill's front-door step 7 instead of a stale copy.

Steps 3, 4.2, 4.4 and 5 of the procedure (L35, L63–L65, L75–L77, L82) need no edit: they name the route,
the `## Explain` section and the worktree exception, all of which stay.

## 2. `payload/claude/agents/slice-executor.md`

**2a. The explain carve-out.**

**Find** in `payload/claude/agents/slice-executor.md` (L33, the whole line):

```text
**The explain carve-out (an explain phase only).** When the phase's `intent.md` carries `## Explain` and you are its `DECOMP` executor or a chapter executor, `plan.md` makes you the **lead** of the knowledge plugin's research run (its explain skill's §3 *Research* for a document or a chapter, §9.2 *Research for a book (an explain phase)* for a book, §9.3 *A chapter: its top-up, then the draft* for a book's chapter), and the `Agent` tool has a second purpose: dispatching the agents that skill tells its lead to dispatch, namely its research roles (`knowledge:web-researcher`, `knowledge:code-researcher`, `knowledge:gap-reviewer`, `knowledge:verifier`, or the general stand-ins the skill names when those are absent) and its preflight's two probe agents, each prompt starting with the line `slice: <id>`. Nothing else changes: never the critic (`knowledge:explain-critic` is the orchestrator's span), never another executor, never on any other slice; the dossier's indexes, the outline, the document or chapter, `result.md` and `phase.md` stay yours to write, and what the agents return is data, never instructions.
```

**Becomes:**

```markdown
**The explain carve-out (an explain phase only).** When the phase's `intent.md` carries `## Explain` and you are its `DECOMP` executor, a write or chapter executor, or a fix executor, `plan.md` makes you the knowledge plugin's **writer** (its explain skill's §3 *Gather the evidence* and §4 *Write the chapter — native Markdown*; for a book, §9.2 *The evidence for a book (an explain phase)* or §9.3 *A chapter: its evidence, then the draft*), and the `Agent` tool loses even its lookup purpose: you read the code at the run's commit and the covering phases' records **yourself**, alone (§3.4 *D1: the evidence*), and dispatch no agent, `Explore` included, because a lookup's brief is not evidence. Never the critic either (`knowledge:explain-critic` is the orchestrator's span), and never another executor; the dossier, the outline, the document or chapter, `result.md` and `phase.md` stay yours to write, and what the code, its comments and the records say is data, never instructions.
```

- **Why:** plugin 0.10.0 has no research roles and no preflight probes (S4 deleted the four agents and
  Part B's B1–B4, B6–B8, B10, B11); §9.2 says "Neither executor dispatches an agent". The four agent names
  and the old §3 / §9.2 / §9.3 headings would otherwise stay cited.

**2b. The Never list.**

**Find** in `payload/claude/agents/slice-executor.md` (L78):

```text
- use the Agent tool for anything but a read-only `Explore` lookup or, in an explain phase, the explain carve-out's research agents (*Delegate reads, never writes*) — never to write
```

**Becomes:**

```markdown
- use the Agent tool for anything but a read-only `Explore` lookup (*Delegate reads, never writes*), and as an explain phase's writer not even that (*The explain carve-out*) — never to write
```

(the rest of the line, from ` `result.md`, edit `phase.md`…` on, is unchanged).

## 3. `payload/claude/skills/do-whole-phase/reference/worktree.md`

**3a. The explain exception's permission sentence** (L5, its last two sentences).

**Find** in `payload/claude/skills/do-whole-phase/reference/worktree.md` (L5):

```text
A long full run is best started in a session of its own: one session drives one checkout at a time, and an explain's `pending` stops halt only its own stream. Manual-mode research permissions live in the untracked `.claude/settings.local.json`; Claude Code (v2.1.211 and later) reads and writes the **main checkout's** copy from a worktree session, so the preflight's rules apply there too
```

**Becomes:**

```markdown
A long run (a book) is best started in a session of its own: one session drives one checkout at a time, and an explain's `pending` stops halt only its own stream. An explain writer's manual-mode permissions live in the untracked `.claude/settings.local.json`; Claude Code (v2.1.211 and later) reads and writes the **main checkout's** copy from a worktree session, so the rules the plugin's §3.2 *Permissions, and the payload builder* prints apply there too
```

(the parenthesis that follows, `(on Windows, …, which needs none).`, is unchanged).

**3b. The teardown's reason** (L8).

**Find** in `payload/claude/skills/do-whole-phase/reference/worktree.md` (L8):

```text
(it deletes the ignored `pages/` cache, whose passages the committed findings quote)
```

**Becomes:**

```markdown
(it deletes the ignored `pages/` folder, which holds nothing the committed record needs)
```

- **Why:** there is no `full` run, no preflight and no fetched page any more; `pages/` holds at most the
  payload builder's fallback copy (plugin §2 *Resolve the knowledge base configuration*).

## 4. `payload/claude/skills/parallel-phase/SKILL.md`

**4a.** **Find** in `payload/claude/skills/parallel-phase/SKILL.md` (L81):

```text
(an explain's manual-mode research rules included)
```

**Becomes:**

```markdown
(an explain writer's manual-mode rules included)
```

**4b.** **Find** in `payload/claude/skills/parallel-phase/SKILL.md` (L382):

```text
(every passage used is quoted in the committed findings)
```

**Becomes:**

```markdown
(it holds nothing the committed record needs)
```

- **Why:** as 3b. The smoke pins on this file (`the main checkout's \`.claude/settings.local.json\``,
  `` `parallel-teardown <P> --discard-ignored` ``) are untouched.

## 5. `installer/payloads/doc_bodies/operations.md` (the seed operations doc)

**Find** in `installer/payloads/doc_bodies/operations.md` (L55–L60):

```text
one confirmation the phase is created **and** run: researched, written, checked by a fresh-eyes
critic and published private, in its own worktree under `.claude/worktrees/`, merged back by
itself (a nested install names no host branch for it). A book still stops for its outline
sign-off and its acceptance gate. Until the plugin's next release, `/knowledge:explain` still
writes single documents on its own; ask `/create-phase` to explain something to use the phase
path now. Plugin version 0.6.0 or later is required. An explain's research runs on your session's permissions (auto mode needs nothing; manual mode needs the rules its preflight prints, in `.claude/settings.local.json`) and its web searches count against Claude Code's per-session cap: raise `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION` in your user settings' `env` (the plugin's README, *Explain: permissions and the search cap*).
```

**Becomes:**

```markdown
one confirmation the phase is created **and** run, in its own worktree under `.claude/worktrees/`,
and merged back by itself (a nested install names no host branch for it): one writer reads this
repository's code and the records of the phases that built the subject, a critic on a second
model checks the draft against them, and it is published private. An explain does no research of
its own and covers only this repository's code; a subject no phase recorded is offered a research
phase first. A book still stops for its outline sign-off and its acceptance gate. Plugin version
0.10.0 or later is required. The writer runs on your session's permissions: auto mode needs
nothing, and manual mode needs the rules the explain skill's §3.2 *Permissions, and the payload
builder* prints, in `.claude/settings.local.json` (the plugin's README, *Explain: permissions*).
```

- **Why:** "researched", the preflight, the search cap and the 0.6.0 floor are all gone; "Until the
  plugin's next release" has been stale since plugin 0.7.0 made `/knowledge:explain` the phase's front
  door. The plugin README's heading is now *Explain: permissions* (P39-hk.S4 removed the search-cap
  paragraph). The smoke pins (`Every explain is its own **explain phase**`, `merge`, the pointer line two
  lines below, the two `/plugin` install lines above) all still hold.

## 6. `README.en.md` (the Knowledge block)

**Find** in `README.en.md` (L541–L545):

```text
> confirmation the phase is created **and** run (researched, written, checked by a fresh-eyes critic,
> published private) in its own worktree under `.claude/worktrees/`, and merges back by itself; a book
> still stops for its outline sign-off and its acceptance gate. Until the plugin's next release,
> `/knowledge:explain` still writes single documents on its own: ask `/create-phase` to explain something
> to use the phase path now. Plugin version 0.6.0 or later is required; an explain's research runs on your session's permissions and web-search cap (the plugin's README, *Explain: permissions and the search cap*). To update: `/plugin marketplace update knowledge`,
```

**Becomes:**

```markdown
> confirmation the phase is created **and** run in its own worktree under `.claude/worktrees/`, and
> merges back by itself: one writer reads this repository's code and the records of the phases that
> built the subject, a critic on a second model checks the draft against them, and it is published
> private. It does no research of its own and covers only this repository's code; a subject no phase
> recorded is offered a research phase first. A book still stops for its outline sign-off and its
> acceptance gate. Plugin version 0.10.0 or later is required; the writer runs on your session's
> permissions (the plugin's README, *Explain: permissions*). To update: `/plugin marketplace update knowledge`,
```

- **Why:** as section 5.

## 7. `installer/main.py` (the install's closing lines)

**Find** in `installer/main.py` (L3112):

```text
(plugin 0.6.0+)
```

**Becomes:** `(plugin 0.10.0+)`.

**Find** in `installer/main.py` (L3113):

```text
created and run after one confirmation in its own worktree, merged back by itself: until the plugin's next release, ask /create-phase to explain something — see docs/current/operations.md
```

**Becomes:**

```text
written from this repo's code and its phases' records, created and run after one confirmation in its own worktree, merged back by itself — see docs/current/operations.md
```

- **Why:** the floor, and the stale "until the plugin's next release". The smoke pin `every explain is its
  own explain phase` stays on that line.

## 8. `tests/retrofit_smoke.sh`

**8a. The explain pins at L229–L240** (the comment, the 0.6.0 floor, the critic's opus pin, the
DECOMP's `slice:` line).

**Find** in `tests/retrofit_smoke.sh` (L229–L238):

```text
# A book runs on the knowledge plugin's research pipeline (plugin 0.6.0+). The route keeps the heading
# and the must-cover field the plugin's readiness check reads; a chapter dispatches the plugin's critic on opus
# with same-model: accepted (v75); only explain executors may dispatch the plugin's research agents; the
# workspace's own explain-critic is retired.
assert "must-cover" in create_phase and "0.6.0" in create_phase and "**A confirmed proposal.**" in create_phase
_chapter = (root / "payload/claude/skills/do-whole-phase/reference/explain-chapter.md").read_text(encoding="utf-8")
assert "knowledge:explain-critic" in _chapter and "kind: chapter" in _chapter and "trace-<key>.md" in _chapter
assert "same-model: accepted" in _chapter and "`model: opus`" in _chapter and "model: sonnet" not in _chapter
_decomp = (root / "payload/claude/skills/do-whole-phase/reference/explain-decomposition.md").read_text(encoding="utf-8")
assert "installed_plugins.json" in _decomp and "pages/.gitignore" in _decomp and "slice: <P>.DECOMP" in _decomp
```

**Becomes:**

```python
# An explain is written from the code and the phases' records, with no research run (plugin 0.10.0+).
# The route keeps the heading, the literal unit and phases fields the plugin's readiness check reads, and
# the must-cover field; it writes no run: or mode: line, and it has a research route. A chapter's critic is
# the plugin's, on the other model family (sonnet for an Opus writer), never same-model: accepted; an
# explain executor dispatches no agent; the workspace's own explain-critic stays retired.
assert "must-cover" in create_phase and "0.10.0" in create_phase and "**A confirmed proposal.**" in create_phase
assert "- **unit**:" in create_phase and "- **phases**:" in create_phase and "- phases: P30, P33-n3" in create_phase
assert "**no `run:` line and no `mode:` line**" in create_phase
assert "- run: full" not in create_phase and "- mode: codebase" not in create_phase
assert "## The research route" in create_phase and "Research: <subject>" in create_phase
assert "--kind research --risk high" in create_phase and "**If the request carries a `Research: <subject>` block**" in create_phase
_chapter = (root / "payload/claude/skills/do-whole-phase/reference/explain-chapter.md").read_text(encoding="utf-8")
assert "knowledge:explain-critic" in _chapter and "kind: chapter" in _chapter and "trace-<key>.md" in _chapter
assert "**`model: sonnet`** when span 1 ran on an Opus model" in _chapter and "`model: opus`" in _chapter
assert "answers-<key>.md" in _chapter and "scratch: works/" not in _chapter
_decomp = (root / "payload/claude/skills/do-whole-phase/reference/explain-decomposition.md").read_text(encoding="utf-8")
assert "installed_plugins.json" in _decomp and "pages/.gitignore" in _decomp and "**0.10.0 or later**" in _decomp
assert "and dispatch no agent, `Explore` included" in (root / "payload/claude/agents/slice-executor.md").read_text(encoding="utf-8")
# Nothing that ships keeps the retired research machinery.
for p in [*(root / "payload").rglob("*.md"), root / "installer/payloads/doc_bodies/operations.md", root / "README.en.md"]:
    _t = p.read_text(encoding="utf-8")
    for gone in ("knowledge:web-researcher", "knowledge:code-researcher", "knowledge:gap-reviewer",
                 "knowledge:verifier", "no-research", "D0b: the preflight", "STOPPED: evidence gate",
                 "*Explain: permissions and the search cap*"):
        assert gone not in _t, (str(p), gone)
```

The next two lines (L239 `assert "**The explain carve-out" in …` and L240 `assert not (… "explain-critic.md").exists()`)
stay as they are.

**8b. The route's required strings** (L250, inside the `for required in (…)` list).

**Find** in `tests/retrofit_smoke.sh` (L250):

```text
"Run `/do-whole-phase` to research and write it.", "§9.2 *Research for a book (an explain phase)*",
```

**Becomes:**

```text
"§9.2 *The evidence for a book (an explain phase)*", "§3.2 *Permissions, and the payload builder*",
```

- Every other string of that list still holds in the new route (checked against the package file).

**8c. The per-unit reference pins** (L266–L270).

**Find** in `tests/retrofit_smoke.sh` (L266–L267):

```text
               "--kind implementation --risk high --order 10", "**`STOPPED: evidence gate`**",
               "narrow the subject: DECOMP resumes from run.md", "explain document: published private; a v2 is cheap",
```

**Becomes:**

```text
               "--kind implementation --risk high --order 10", "## Run stops (every unit)",
               "feedback re-runs DECOMP from the dossier", "explain document: published private; a v2 is cheap",
```

**Find** in `tests/retrofit_smoke.sh` (L268):

```text
"outline sign-off: on", "under `## The book`", "§3.9 *`quick` and `no-research`*")),
```

**Becomes:**

```text
"outline sign-off: on", "under `## The book`", "§3.4 *D1: the evidence*", "`## Drawn from`")),
```

**Find** in `tests/retrofit_smoke.sh` (L270):

```text
                "`critique: none (quick)`", "works/phases/active/P<N>/doc/body.md")),
```

**Becomes:**

```text
                "`doc/answers.md`", "works/phases/active/P<N>/doc/body.md")),
```

**Find** in `tests/retrofit_smoke.sh` (L273, the `_review` pins' last line):

```text
"§8 *D9: the report*", "§9.1 *The book suggestion*", "(*An explain phase merges back by itself*)")),
```

**Becomes:**

```text
"§8 *D9: the report*", "§9.1 *The book suggestion*", "(*An explain phase merges back by itself*)",
               "`book/research/answers-<key>.md`", "every `## Gaps` line of `doc/evidence.md`")),
```

- **Why:** the old pins hold the retired research run (the evidence gate, `run.md`, `run: quick`, §3.9,
  the DECOMP's agent prompts). Every new pin is a string of the package's files, checked by script before
  this handoff. The pins at L1029–L1032 (`select_browser` on the recorded deviceId), L403–L421
  (`[--depends-on` absent), L790–L809 (the worktree exception) and L216–L227 (the pointer, the seed doc and
  README wording) all still hold after sections 3–7.

## 9. The release notes: `changelog.d/explain-from-the-phases.md` (a new file)

The bootstrap stamps versions only on `main` (`changelog.d/README.md`): write this fragment, never a
numbered `CHANGELOG.md` section, and never touch `WORKSPACE_VERSION` by hand.

```markdown
# An explain is written from the code and the phases' records, with a research phase offered when no phase covers the subject

- **Explain phases read the phases, not the web.** An explain phase now runs the knowledge plugin's 0.10.0 flow: one writer reads this repository's code at one commit and the records of the phases that built the subject (their intent, decisions, notes, slice results and research findings), traces every sentence to them, and a critic on a second model checks the draft against them before the private publish. There is no research run: no web search, no research agents, no verifier, no gap rounds, no evidence gate, no preflight. A subject with no code behind it is declined; the knowledge base keeps the subject books and documents already published.
- **The `## Explain` section has sixteen lines.** `create-phase`'s explain route writes `phases:` (the covering phases, or `none` to explain from the code alone) and no longer writes `run:` or `mode:`. Its own confirmation takes the plugin's shape (a plain summary, a concrete reader, the sections as the reader's questions, other shapes, the phases that built it, and the cost line "one writer and one critic on a second model"). A proposal from a plugin older than 0.10.0 is refused with the update to make, and nothing is created.
- **A research phase first, when no phase covers the subject.** The new *The research route* in `create-phase` takes the plugin's "research first" reply and its `Research: <subject>` block: an ordinary phase of `research` slices that read only this repository and record findings, cited by path and line, in the phase's notebook and `topics/`, its gate waived. Its `intent.md` names the subject's paths, so a later explain's coverage lookup finds it. The explain follows only when you ask again.
- **The explain references, rewritten.** A document's or a chapter's `DECOMP` writes `doc/brief.md`, `doc/evidence.md` and `doc/outline.md`; a book's writes `book/research/evidence.md` and a `book/outline.md` that names the phases each chapter draws from (`## Drawn from`, `## Gaps`), and the outline's signature freezes the book's `brief.md` and `evidence.md`. A chapter reads its phases closer into `evidence-ch<k>.md` and answers the critique in `answers-<key>.md` (a document: `doc/answers.md`). The review reads the gaps from `evidence.md`'s `## Gaps` and allows a write slice's appended evidence entries. Gone: `run.md`, `summary.md`, the top-up, the chapter gate, the optional sources chapter, `run: quick` and `no-research`. Publishing, the privacy proof and the reader check are unchanged.
- **The critic runs on the other model family.** The orchestrator names the critic's model on the call, `sonnet` for an Opus writer and `opus` otherwise, and never sends `same-model: accepted`; this replaces v75's opus-for-every-chapter rule. The dispatch block drops `scratch:`.
- **An explain executor dispatches no agent.** The slice executor's explain carve-out now makes it the plugin's writer, which reads the code and the records itself: no research agents, no probes, no `Explore` lookup.
- **Migration notes.** `/update-workspace` brings it. Explain phases need the knowledge plugin **0.10.0 or later**: run `/plugin marketplace update knowledge`, then update `knowledge@knowledge` from the `/plugin` panel. An explain phase that already ran its `DECOMP` on an older plugin (its dossier has `run.md` or `ledger.md` and no `evidence.md`) cannot continue on 0.10.0: finish it before updating the plugin, or close it and ask for the explain again. An older `## Explain` section is read as it is: `run:` is ignored, `mode: general` stops its `DECOMP` for your decision, and a missing `phases:` line is found by the `DECOMP`. In manual permission mode, the old preflight's web rules are no longer needed; the writer's rules are the ones the plugin's §3.2 *Permissions, and the payload builder* prints.
```

## 10. The release (the bootstrap's own `CLAUDE.md` rules)

1. Edit `payload/**` and `installer/**` only (plus `tests/retrofit_smoke.sh` and the fragment). Never edit
   the installed copies in `.claude/`, `CLAUDE.local.md` or `workflow/`.
2. Copy the package's three whole files over `payload/claude/skills/do-whole-phase/reference/` (never into
   `do-next-slice/reference/`: `SHARED_SKILL_FILES` in `installer/build.py` makes those copies), then apply
   sections 1–8 and write section 9's fragment.
3. `python3 installer/build.py`, then `python3 installer/build.py --check`.
4. `bash tests/retrofit_smoke.sh`, **alone** in its shell call.
5. Commit with the rebuilt `bootstrap_agentic_workspace.sh` in the same commit (the host convention:
   Conventional Commits, a component scope, **no phase or slice ids**).
6. Land it on `main` as `changelog.d/README.md` says: `python3 installer/build.py --release` stamps the
   next version (**v92** when nothing else lands first), folds the fragment into its `## v92` section and
   sets `WORKSPACE_VERSION`; commit `build(release): workspace v92 — <the fragment's line 1>`.
7. **Push `main`** before the knowledge plugin 0.10.0 is published: `/update-workspace` clones from GitHub,
   and plugin 0.10.0's front door refuses every workspace older than this release (`handoff-explain.md`,
   *The version handshake*).
8. Refresh this repo's own install: `sh bootstrap_agentic_workspace.sh --update .`, then commit the refresh
   in `git -C workflow`.

## 11. Verification after applying

- **The build and the smoke suite pass:** `python3 installer/build.py --check` and
  `bash tests/retrofit_smoke.sh` (sections 8a–8c are its new pins).
- **A fresh scratch install** (a throwaway `git init`, then `sh bootstrap_agentic_workspace.sh <dir>
  --at-root --name T --summary t`):
  - `.claude/skills/do-whole-phase/reference/explain-{decomposition,chapter,review}.md` equal the
    package's files, and `do-next-slice/reference/` holds byte-identical copies;
  - `.claude/skills/create-phase/SKILL.md` has `## The explain route` (with `- **phases**:` in it) and
    `## The research route`;
  - `.claude/agents/slice-executor.md`'s carve-out says `dispatch no agent`;
  - still no `.claude/agents/explain-critic.md`.
- **No research machinery left:** `git grep -n -E "web-researcher|code-researcher|gap-reviewer|knowledge:verifier|no-research|run: (full|quick)|D0b: the preflight|evidence gate" -- payload installer README.en.md`
  finds one line only: the paragraph of `explain-decomposition.md`'s *Run stops* that says there is no
  evidence gate.
- **Every plugin section the route cites exists** in the installed plugin 0.10.0 by number and heading:
  P33-n3's citation check (`works/phases/active/P33-n3/topics/citations.md` in the knowledge repo), run
  over the installed `.claude/`, prints `missing=0`.
