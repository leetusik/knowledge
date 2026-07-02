---
name: update-workspace
description: Update the current repo's agentic-workspace machinery to the latest upstream cornerstone, preserving your phases, slices, and docs.
allowed-tools: Bash(python3 scripts/workflow.py:*), Read, Edit, Write, Glob, Grep, Bash
disable-model-invocation: true
---

# update-workspace

Update the CURRENT repo's agentic-workspace machinery to the latest upstream cornerstone, preserving your own work. Explicit-invocation only. Run this when the cornerstone has changed since you adopted or last synced and you want this repo to match the current version. (For first-time adoption use `/retrofit` instead.)

What it changes: it OVERWRITES machinery (`scripts/workflow.py`, the `.claude/agents/` and `.codex/agents/` subagents, every skill under `.claude/skills/` and `.agents/skills/`, `.codex/config.toml`, `works/templates/*`), additively MERGES `.claude/settings.json`, and refreshes the `CLAUDE.md`/`AGENTS.md` contract. It PRESERVES everything under `works/` except templates (your state, phases, slices, deferred jobs) and all of `docs/` (your versioned docs). It never commits.

Preflight (read-only):

1. Confirm a git repo: `git rev-parse --is-inside-work-tree`. If the working tree is dirty (`git status --porcelain` is non-empty), tell the operator and recommend committing or stashing first, so the update lands as a clean, reviewable diff.
2. Confirm this repo already has the workspace: `works/state.json` (or any `works/phases/active/*/phase.json`) AND `scripts/workflow.py` must exist. If not, STOP — this repo has not adopted the workspace; use `/retrofit` instead.
3. If `works/.workspace-version.json` exists, read it and report the last-synced commit and time so the operator knows the starting point.

Fetch upstream:

4. Shallow-clone the cornerstone to a temp dir and capture its HEAD commit:

   ```sh
   tmp="$(mktemp -d)"
   git clone --depth 1 https://github.com/leetusik/bootstrap_agentic_workspace.sh.git "$tmp"
   ref="$(git -C "$tmp" rev-parse HEAD)"
   ```

Preview the diff (this is the "check what is different" step):

5. Run the freshly-cloned installer in dry-run update mode from the repo root — it writes nothing and prints the change-list:

   ```sh
   sh "$tmp/bootstrap_agentic_workspace.sh" . --update --dry-run
   ```

   Show the operator the change-list: machinery files that would be updated (with +added/-removed counts) or added, settings merged, how many files are preserved and unchanged, and any stale workspace skills upstream has dropped.

6. STOP and let the operator review and approve. Do not apply without approval.

Apply (after the operator approves):

7. Run the same installer in update mode, recording the upstream commit so provenance is tracked:

   ```sh
   SYNCED_COMMIT="$ref" sh "$tmp/bootstrap_agentic_workspace.sh" . --update
   ```

Verify:

8. The installer's update already ran `validate` / `rebuild` (or `next` for a repo without the docs subsystem) and printed the result. Run `python3 scripts/workflow.py next` to confirm the current state under the refreshed engine.

Report and clean up:

9. Summarize what was updated / added / merged / preserved and any flagged stale skills (from the installer's printed summary), and show `git status`. Do NOT commit automatically — the operator reviews the diff and tells you when to commit. Remove the temp clone: `rm -rf "$tmp"`.
