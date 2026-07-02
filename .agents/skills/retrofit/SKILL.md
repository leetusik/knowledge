---
name: retrofit
description: Non-destructively adopt this agentic workspace into the current existing repository.
---

# retrofit

Adopt the agentic workspace into the CURRENT existing repository, non-destructively. Explicit-invocation only. The full procedure and collision policy are in `docs/retrofit-guide.md`; this skill drives it.

Preflight (read-only):

1. Confirm a git repo: `git rev-parse --is-inside-work-tree`. If the working tree is dirty (`git status --porcelain` is non-empty), tell the operator and recommend committing or stashing first, so the retrofit lands as a clean, reviewable diff.
2. If `works/state.json` already exists, STOP and report: this repo already has the workspace — drive it with `python3 scripts/workflow.py` (or `/do-next-slice`). Do not retrofit again.
3. Locate the installer `bootstrap_agentic_workspace.sh`. It is NOT part of an installed workspace, so ask the operator for its path, or fetch it per the README (the `curl` one-liner). Never fabricate a copy.
4. Seed the first phase from the project's CURRENT state: read the `README`, the package manifest (`package.json` / `pyproject.toml` / `Cargo.toml` / `go.mod` / …), the primary language, and `git log -1 --format=%s`. From these, synthesize a concrete `--phase-name` and `--phase-objective` that reflect the existing code and the first real change to make.

Apply:

5. Run the installer in retrofit mode from the repo root:

   ```sh
   sh <path>/bootstrap_agentic_workspace.sh . --into-existing \
     --name "<project>" --summary "<one sentence>" \
     --phase-name "<synthesized>" --phase-objective "<synthesized>"
   ```

   It is non-destructive: it skips files you already have, additively merges `.claude/settings.json` and `CLAUDE.md`/`AGENTS.md` (marked section + `*.workspace.md` sidecar), installs the `docs/`+`works/` subsystems only if absent, and aborts before writing if a foreign `scripts/workflow.py` exists. It seeds P1 with `DECOMP`+`REVIEW` only.

Reconcile + verify:

6. If the repo already had `CLAUDE.md`/`AGENTS.md`, the installer kept them and wrote `CLAUDE.workspace.md`/`AGENTS.workspace.md` plus a marked pointer block. Read the sidecar and fold the workspace contract into the project's own contract as appropriate — the project's existing rules win where they disagree.
7. Replace P1's placeholder `intent.md` with the synthesized intent: set Origin to `synthesized-from-repo`, record the README / manifest / `git log` basis you used under "Original Input (verbatim)", and the synthesized objective under "Confirmed Intent (refined + clarified)". Keep it linked near the top of P1's `phase.md`.
8. Ensure `__pycache__/` and `*.pyc` are git-ignored (the installer never edits `.gitignore`).
9. Run `python3 scripts/workflow.py validate`, then `python3 scripts/workflow.py next`.

Report:

10. Summarize what the installer created / skipped / merged (from its printed summary) and show `git status`. Do NOT commit automatically — the operator reviews the diff and tells you when to commit. Point them at `docs/retrofit-guide.md` for the full policy and troubleshooting.
