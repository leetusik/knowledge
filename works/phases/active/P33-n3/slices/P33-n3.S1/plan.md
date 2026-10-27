# P33-n3.S1 — plan: the explain skill becomes the explain-phase front door

Mode: `auto` (the operator: "no blocker. full auto till D-32rc ends"). Kind `implementation`, risk
`high` (wide blast radius, then open design; DECOMP's re-rating), the high row. Promoted from D-32rc.

## Goal

Rewrite `plugin/skills/explain/SKILL.md` (plugin 0.6.0, 2,635 lines) into the **front door** of the
explain phase, exactly as `intent.md`'s *Confirmed Intent* and the accepted handoff
(`works/phases/active/P-9sz6/handoff.md` §7, with §3.5's confirmation sketch, §3.6's defaults and
§6's interface) describe. Read first, in this order: `intent.md`; `topics/breakdown.md`
§ P33-n3.S1 (the goal, set, verification and the eight open-design items); `topics/citations.md`
(**the interface contract**); the v86 side you hand off to: `.claude/skills/create-phase/SKILL.md`
*The explain route* and *A confirmed proposal* (the `## Explain` block's exact field names and
shape, `unit` included, and what the route validates and refuses), then the three
`.claude/skills/do-whole-phase/reference/explain-*.md` only where a citation row sends you.

## The open-design items: settled (auto, by DECOMP's recommendation; record each in `## Decisions`)

1. **Where the front door sits.** The file's opening routes by how it was reached: invoked as
   `/knowledge:explain` → the front door; read by path as an explain phase's lead (the workspace's
   executors) → *The run, in one card*, then §3. The card keeps its cited heading as the lead's stage
   map, shorn of its own engine (the compaction header, the run-level stop rules, "a repeat is never
   a new run"). §1 *Resolve the topic, the mode and the placement* holds the flags, the MODE rules and
   the placement **offers** (document by default; a book or a chapter of a book only when asked;
   §1's `p<N>` and named-book rules stated without contradicting create-phase — see citations §1).
2. **`<TOOLS>` once the out-of-repo dossier goes.** §2's resolver stays byte-stable and still prints
   `KB_EXPLAIN_STATE`, now only the converter's shared root (`<TOOLS>` =
   `<KB_EXPLAIN_STATE>/tools/`), so `allowed-tools` patterns and operators' manual rules stay valid.
   `<DOSSIER>` is the folder the phase names (`doc/` or `book/research/`), so a phase's `doc/` "is the
   plugin's `<DOSSIER>`" and "`<tmp>` is `<DOSSIER>`" hold. Nothing may land untracked in a worktree
   outside the dossier's git-ignored `pages/`.
3. **§7 keeps its number** (§8 and §9 are cited): a short section saying there is no project copy —
   the draft is committed in the phase folder.
4. **Headless** (`claude -p`, no way to ask): print the drafted confirmation and stop; never create a
   phase without the operator's literal yes.
5. **The repeat check:** find a live explain phase on the same subject with Read/Glob/Grep (already in
   `allowed-tools`): `works/phases/active/*/intent.md` carrying `## Explain` (nested:
   `workflow/works/...`), plus worktree-stamped phases (`phase.json` `execution`), and offer to resume
   it (`/do-whole-phase <P>`) or make a v2. Add a `workflow.py` call to `allowed-tools` only if Read/Glob
   cannot see a worktree phase; say which in `result.md`.
6. **Refuse early what create-phase would refuse:** asked from inside a phase worktree (the checkout
   is a `.claude/worktrees/` path, or `next` prints `stream=`), and a book or chapter aimed at a public
   project (offer the ways on), so the operator never confirms what the route then refuses. Match the
   route's own refusal list; do not invent new ones.
7. **The confirm pass goes:** §4.10's confirm pass, B5's `#### Confirm mode` and its "confirm pass"
   wording; a disputed must-fix is recorded and the review decides. Keep §4.10's steps 2 and 3
   numbered as the answer and the one revision (citations §4.10). Regenerate the critic agent file.
8. **Frontmatter**, both copies: `description` (every explain is an explain phase; needs a workflow
   workspace v86 or later; still triggers only when the operator wants an explanation persisted),
   `argument-hint` (no `resume`, no `here`), `allowed-tools` (drop what only the removed parts used;
   keep what the front door's reads and the method need; never widen beyond item 5's one possible
   addition).

## What the front door does (handoff §7, §3.5, §6.1)

Parse `quick`, `no-research`, `book=`, `lang=`. Find the workspace (nested:
`workflow/.agentic-nested.json`, honouring its `renames.skills`; at root: `scripts/workflow.py` and
`works/`; both present: ambiguous, say so). Check readiness: `workspace_version` ≥ 86 in
`works/.workspace-version.json` (nested: `workflow/works/...`) **and** a literal `unit` field in the
create-phase skill's `## The explain route`. No workspace, or one too old → refuse, point at the
installer or `/update-workspace`, run nothing. Draft the proposal and ask **one** confirmation
(handoff §3.5's sketch: unit, subject · mode, run, lang · reader · must-cover, project (private) ·
prior, its own worktree and the stops, the cost and the permissions). On the literal yes, invoke the
workspace's `create-phase` through the Skill tool with the request, the proposal (the `## Explain`
block exactly as create-phase's route expects) and the reply, verbatim. Nothing else runs in the
front door.

## Goes / shrinks / stays

Exactly as `intent.md` lists them. Every heading in `topics/citations.md` stays at its number with its
exact text (backticks included) and content that still answers the citer; *The run, in one card*,
§3.3's heading, §9.1 *The book suggestion* (its size test and the report's book suggestion), §7's
number, B5's dispatch block and the critic's same-model rule are pinned. Rules the method needs stay
word for word; do not rewrite prose the handoff keeps.

## Set

`plugin/skills/explain/SKILL.md` (canonical); `.agents/skills/explain/SKILL.md` (body byte-identical,
its own frontmatter: no `argument-hint`/`allowed-tools`, the same `description`); `web/public/SKILL.md`
(full-file byte copy); `plugin/agents/{code-researcher,explain-critic,gap-reviewer,verifier,web-researcher}.md`
(bodies regenerated by `python3 scripts/skills_parity.py --write-agents`); the slice folder. Nothing
else: the README, plugin.json, marketplace.json, the setup skill, the template page and the landing
count are S2's. Do not touch the vendored `.claude/skills/explain/` or any `.claude/` workspace file.

## Verify (no real browser applies: the skill is prose an agent runs)

1. `python3 scripts/skills_parity.py` exit 0 after `--write-agents`; `python3 scripts/plugin_parity.py`
   exit 0.
2. The citation check in `topics/citations.md` exits 0 (`missing=0`), plus a read-through of every row
   against its citing text.
3. A read-through against handoff §7 and §3.5: every *goes* gone, every *shrinks* shrunk, every
   *stays* intact; `grep` for `resume`, `here`, `PROJECT_COPY`, `KB_EXPLAIN_STATE` as a dossier root,
   `.knowledge-explain`, "§9.1's book question", "a repeat's question", "confirm pass"; list each
   remaining hit and why it stays.
4. A **dry run** of the front door against this workspace, by hand, stopping **before** the Skill call
   (no phase created): the readiness check's reads and verdict, then the drafted confirmation for one
   document request and one book request, pasted into `result.md`. Check the drafted `## Explain`
   block field by field against create-phase's route.
5. The refusals on scratch folders in the session scratchpad: no workspace; a fake v85.
6. `claude plugin validate ./plugin` if available (the frontmatter changed); name it if not.
7. `python3 scripts/workflow.py validate`.

## Close

- `result.md`, verdict block first: the eight settled items, the new line count
  (`wc -l web/public/SKILL.md`, for S2's landing count), the dry-run confirmation, the grep list.
- Through `phase-section`: one `## Decisions` entry with the eight items (gist + pointer), one
  `## Doc impact` line (product/architecture: `/knowledge:explain` is the explain-phase front door;
  plugin 0.7.0 needs workspace v86+), consume the S1 note (`--entry K --remove`), add a note for S2
  (flags, the dossier, the permission paths it must describe), rewrite `## Now`.
- No commit, no state moves.

## Dispatch

route=high
reason=risk high (not low)
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
