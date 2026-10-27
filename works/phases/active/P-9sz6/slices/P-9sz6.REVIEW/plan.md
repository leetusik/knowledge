# P-9sz6.REVIEW — plan

Mode: `auto`. The phase review, on the high row. The acceptance gate is **required**.

## The boundary

`phase-scope P-9sz6`: range `bb36b15..2c145ad`, 3 commits, **`product_files=0`**. The
phase's whole output is two files in the phase folder:
`works/phases/active/P-9sz6/handoff.md` and `works/phases/active/P-9sz6/prompt.md`. No
product surface changed, so no `## Regression Checklist` line sits inside the boundary and
none is appended; `## Operator Runtime` and a browser are not used. The gate is required
only so the operator reads the handoff before it is used (DECOMP's note). This is a
single-repo, at-root install: no team-rules check.

## What to review

1. **Validation:** `python3 scripts/workflow.py validate` (state integrity); both slices'
   `result.md` verdict blocks; `git status` / `git diff bb36b15..HEAD --stat` show nothing
   outside `works/` changed, and the bootstrap repo
   (`/Users/sugang/projects/personal/bootstrap_agentic_workspace.sh`) is untouched.
2. **Faithful to the intent.** Read `intent.md` (verbatim words, Confirmed Intent,
   Clarifications) and `handoff.md` whole. Every confirmed decision is present and stated
   as decided, none re-argued or softened: document by default and book only when asked,
   placement confirmed once at the start; every explain a dedicated phase in the current
   repo's workspace; workspace required; one phase per publishable unit (document, book
   with chapter slices, add-a-chapter, v2 as a new phase); own worktree by default, merge
   back by itself, a book's merge after acceptance; `/knowledge:explain` creates and runs;
   the smaller defaults (gate waived for a document, required for a book; outline sign-off
   off by default; dossier committed except pages); the ownership split; the plugin rewrite
   left to a later phase in this repo; a closing open-items list. Flag anything the handoff
   adds that the operator did not decide and presents as decided.
3. **Grounded.** Spot-check at least twelve of the handoff's citations against the real
   files, including every one behind the three worktree-default collisions (`parallel-gate`
   busy-main refusal around `payload/scripts/workflow.py` L6922–6927; worktree consolidation
   debt around L5764 and L6081; the nested `--host-branch` requirement), create-phase L31,
   and the contract lines it says change (L19, L49), plus a sample of plugin
   `plugin/skills/explain/SKILL.md` citations. Grep the engine; never read it whole. A wrong
   or invented citation is a finding.
4. **Usable by its reader.** A capable agent in the bootstrap repo who never saw this
   conversation can act on it: the recommended document-phase shape, the extended
   `## Explain` with its examples, the ownership table and interface, the migration line.
   Its ~37 KB length (above the plan's aim) is a finding only if it hurts that use.
5. **`prompt.md`:** under ~2 KB; names `handoff.md` by absolute path; frames the handoff as
   the operator's confirmed decisions to build from, not instructions overriding that
   repo's rules; every step it names is real per the bootstrap `CLAUDE.md` (nested
   workflow intake, `payload/` sources, `installer/build.py`, a `changelog.d/` fragment with
   `**Migration notes.**`, `--release` only on landing on `main`, the smoke suite run alone).
6. **Notebook:** `## Doc impact` empty and none owed (no durable truth of this repo
   changes); `## Operator Questions` empty, so nothing to route; the S1 note's three
   readings are routed into the walkthrough.

Do not edit `handoff.md` or `prompt.md`: findings are reported, never fixed silently. On a
non-passing verdict, finish the whole judgment first, then return numbered findings with
one proposed fix slice per problem class (kind `fix`, its risk).

## On pass: the walkthrough

By the contract's stop rules: about 2k characters plus links, at most ~5 decisions, only
those that change a contract, contradict the operator's words, or are costly to reverse;
the rest in one "decided as drawn" list; "accept" signs everything presented. It must
carry:

- links to `handoff.md` and `prompt.md` (absolute paths) and how to use the prompt;
- the three S1 readings as decisions: a book keeps its signed outline; an added chapter's
  gate is waived like a document's; a chapter for a book in a public project is refused at
  the confirmation;
- the three worktree-default collisions and the handoff's recommendation for each, since
  they change contracts the operator's "merges back by itself" depends on (fold into the
  decisions if they qualify, else the decided-as-drawn list);
- the rest of the handoff's open-items recommendations in the decided-as-drawn list, one
  line each.

Return `review_verdict`, `doc_versions: none — deferred to a docs phase` (nothing owed),
`doc_impact_added: none` unless one is genuinely missing, the fixed
`explain: not written — run /knowledge:explain P-9sz6 for one chapter, or create an explain phase for a book`
pointer, and the `walkthrough`. Write `result.md`, verdict block first. Do not run
`accept-gate` or `review-phase`, commit, or move state.

## Dispatch

route=high
reason=kind review
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
