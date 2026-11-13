# P30.S28 — `/explain` ownership moves to this repo; the bootstrap handoff note (docs)

## Operator direction (2026-10-21, in session)

> "for s28, I think the production knowledge or knowledge git should take charge of /explain skill at all.
> leave workflow side only pointer. how do you think?"

The orchestrator recommended yes, with these terms. The operator confirmed: "for s28, I'll follow your recommendation". The plan follows them:
- this repo owns `/explain` outright, delivered through its Claude Code plugin;
- the bootstrap workspace keeps only a pointer;
- the bootstrap's updater never touches anything named `explain`.

## Goal

1. **Make this repo the sole owner, and make delivery work.** `plugin/.claude-plugin/plugin.json` is still
   `0.3.0`, and its description, like `.claude-plugin/marketplace.json`'s entry, still says "self-contained
   interactive HTML explainers". S7 made the skill native-only, so an installed plugin may never pick it up.
   - Bump the plugin to **0.4.0**.
   - Rewrite both descriptions for native chapters, books, images and the general-learning mode. Keep them
     short and factual.
   - Check `plugin/README.md` and the plugin's setup skill for HTML-explainer wording, and update it.
   - Run `skills_parity` and `plugin_parity`.
   - If the marketing pages under `web/src/content/marketing/` describe the skill as an HTML explainer (S7's
     observation), update that copy too. That is text only; keep the existing layout and never restyle
     anything.
2. **Write the handoff note** at `works/phases/active/P30/handoff-explain.md`. The operator gives it to the
   bootstrap workspace repo's agent. **This repo never edits the bootstrap repo**, which is readable here,
   read-only, at `/Users/sugang/projects/personal/bootstrap_agentic_workspace.sh`.

## The note must cover

1. **The ownership change and why:** the skill, CLI and API change together in this repo (S7), and every
   outside copy drifted (P29's list, A3).
2. **What the bootstrap does:**
   - **delete** its own `explain` skill (find its exact path or paths, and every place that installs,
     copies, lists or documents it: the updater script, manifests, README, CLAUDE.md templates);
   - **add a pointer** in its docs or CLAUDE.md template saying `/explain` comes from the knowledge plugin,
     with the exact install and update commands (`/plugin marketplace add leetusik/knowledge`, `/plugin
     install knowledge@knowledge`). Verify the exact command syntax against current Claude Code docs, and
     the marketplace and plugin names in `.claude-plugin/marketplace.json`;
   - **the updater never creates, deletes or modifies anything named `explain`**, including
     `.agents/skills/explain/` (this closes A3) and `.claude/skills/explain/`.
3. **What a workspace sees:** the skill is `/knowledge:explain` (check the plugin's skill name and
   namespacing). A workspace that had the bootstrap's copy should remove it once, to avoid two skills.
4. **The contract the skill relies on, for reference only.** It lives here, so link, don't copy:
   - `plugin/skills/explain/SKILL.md`;
   - `server/native/README.md`;
   - `cli/README.md`.
5. **Verification the bootstrap agent can run:**
   - the updater leaves a planted `.agents/skills/explain/` and `.claude/skills/explain/` untouched;
   - the pointer renders;
   - in a fresh workspace, installing the plugin gives `/knowledge:explain`.

It's self-contained: someone with only the bootstrap repo and the note can apply it.

## Read first

- `works/phases/active/P30/intent.md`: the handoff item.
- `topics/notes-later.md` → *What the bootstrap's `.claude/skills/explain/SKILL.md` must change* (P29's list,
  now replaced by "delete it and point").
- The S7 result and OQ22–OQ25.
- `plugin/` (`plugin.json`, `README.md`, `skills/`, `setup/`) and `.claude-plugin/marketplace.json`.
- The bootstrap repo, read-only: grep it for `explain` to list every touchpoint for the note.

## Validation

- `python3 scripts/skills_parity.py` and `python3 scripts/plugin_parity.py`.
- `pnpm --dir web typecheck`, `lint`, `test` and `build`, if marketing copy changed.
- `python3 scripts/workflow.py validate`.
- `git diff --stat` shows **no** path under the bootstrap repo, which is outside this repo anyway.

## Notebook

- `phase.md`:
  - a Decision line: "`/explain` is owned by this repo and delivered by the knowledge plugin; the bootstrap
    keeps a pointer (operator, 2026-10-21)";
  - one Doc impact line (`operations.md` and `product.md`, wherever the skill's distribution is documented);
  - `## Now`, where next is REVIEW.
- `result.md`: verdict block first, with the note's path for the orchestrator to report.

## Dispatch

slice=P30.S28
phase=P30
kind=docs
risk=low
attempt=1
route=cheap
reason=kind docs rated low
tier=mid
subagent_type=slice-executor-mid
model=sonnet
pass_model=yes
effort=high
pass_effort=yes
attribution=Claude Sonnet 5.5
explore_model=haiku
explore_effort=high
