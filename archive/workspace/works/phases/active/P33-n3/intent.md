# Intent — P33-n3

- Captured at: 2026-10-27T20:00:05+09:00
- Origin: operator

## Original Input (verbatim)

> why that defered? I thought every explain will be go through the explain phase.

> you do it by it's order. no blocker. full auto till D-32rc ends

> no need for bootstrap version upgrade after that right? only plugin update?

## Confirmed Intent (refined + clarified)

Every explain goes through an explain phase (the operator's decision in P-9sz6, built on the workflow
side by workspace v86). The knowledge plugin's `/knowledge:explain` still runs single documents on its
own engine, outside any phase. This phase makes the plugin match: the explain skill
(`plugin/skills/explain/SKILL.md`, plugin 0.6.0) becomes the **front door** to the explain phase, as
the accepted P-9sz6 handoff §7 describes (`works/phases/active/P-9sz6/handoff.md`, §3.5, §6 and §7).

- **`/knowledge:explain` becomes the front door.** It parses its flags (`quick`, `no-research`,
  `book=`, `lang=`), finds the workspace (nested: `workflow/.agentic-nested.json`; at root:
  `scripts/workflow.py` and `works/`) and checks it is ready, drafts the proposal and asks **one
  confirmation** (unit — a standalone document by default, a book or a chapter of a book only when
  asked; subject and mode; run; lang; reader; must-cover; project, private; prior; that it runs in its
  own worktree; the cost and the permissions the research needs). On the operator's literal yes it
  hands the request, the proposal (the `## Explain` block, `unit` included) and the reply, verbatim,
  to the workspace's `create-phase` explain route, which creates the phase and runs it. With no
  workspace, or one older than v86, it refuses and points at the installer or `/update-workspace`; it
  never runs anything itself. A repeat on the same subject checks for a live explain phase and offers
  to resume it (`/do-whole-phase <P>`) or make a v2.
- **Goes** (the skill's own run-state machinery, now the workflow's job): the run card as an engine of
  its own (its compaction header, run-level stop rules, "a repeat is never a new run"); the `resume`
  argument and §3.3's resume steps; §1's automatic book placement and "a whole book is a suggestion";
  §2's out-of-repo dossier state and its cwd fallback; §3.1's unfinished-run lookup; §7's `here`
  copy; §9.1's proposal flow (replaced by the single confirmation for every unit); the "no workspace"
  single-document fallback.
- **Shrinks:** §3.3 to the `run.md` format and the in-span resume from disk; §4.10's confirm pass (the
  review decides a dispute); §8 to the fields the review and the closing report carry (item 8 stays as
  "a book suggested for a scoped-down topic").
- **Stays:** §2's resolver; §3.1's prior and translation rules; §3.2's preflight; §3.4–§3.10's method;
  §4's grammar and rules; §4.9's check; §5–§6's publish API; Part B; the critic's rubric;
  `pagetext.py`.
- **Stable references.** The v86 workspace's executors read this skill by path and cite its sections
  (§1, §2, §3, §3.1–§3.10, §4, §4.7–§4.10, §5, §5.1, §8, §9, §9.1–§9.3, Part B, B5, B9). Those section
  numbers and headings stay, each with its new, smaller content where it shrinks; nothing they cite
  disappears or moves.
- **The plugin says it.** Its description (`plugin/.claude-plugin/plugin.json`,
  `.claude-plugin/marketplace.json`) and README say explain needs a workflow workspace (v86 or later).
- **Version.** Bump the plugin's version (0.6.0 → 0.7.0); the front door requires workspace v86.
- **Release.** Commit, never push: the operator pushes for the marketplace and then updates the
  installed plugin. No new workspace (bootstrap) version is needed: v86 already ships the workflow side.

## Clarifications Resolved

- Q (operator): "why that defered? I thought every explain will be go through the explain phase." —
  A: the plugin side could only change after the workflow version that runs the explain phase shipped
  and reached this repo; that is now done (v86, `/update-workspace` at f3c3994), and this phase is the
  promoted job D-32rc.
- Q (operator): "no need for bootstrap version upgrade after that right? only plugin update?" — A: yes:
  after this phase only the plugin update is needed (push, then update the installed plugin).
- Q: Start now, in which mode? — A (verbatim): "you do it by it's order. no blocker. full auto till
  D-32rc ends": after P-8jbf and the workspace update, run this phase to the end in `auto`.

## Notes

- Source of truth for the scope: P-9sz6's accepted `handoff.md` §7 (with §3.5's confirmation sketch,
  §3.6's smaller defaults and §6's interface), and the v86 skills it describes:
  `.claude/skills/create-phase/SKILL.md` (*The explain route*, *A confirmed proposal*) and
  `.claude/skills/do-whole-phase/reference/explain-*.md`.
- The skill is 2,635 lines; the run card is L22–101, §9.1 L1359–1397.
- Promoted from D-32rc (P-9sz6.REVIEW).
