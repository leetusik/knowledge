# Plan — P2.F1 (anchor the .gitignore data/ rule to /data/)

## Situation

P2.REVIEW round 1 returned `changes_requested` with one verified finding: `.gitignore` line 4 is the unanchored rule `data/`, which matches **any** directory named `data` — including `docs/versions/data/`, where the `data` durable-doc versions live. A new `data` doc version file would be silently git-ignored (confirmed: `git check-ignore docs/versions/data/v0002_test-probe.md` → matched by `.gitignore:4:data/`), so it would be dropped from commits and `docs/index.json` would reference an untracked file. See `works/phases/active/P2/slices/P2.REVIEW/result.md` for the full review round.

## The fix (one line)

In `.gitignore`, change line 4 from `data/` to `/data/` — anchoring the ignore to the repo-root disposable SQLite dir only. Every other rule stays as-is (no other rule collides with a `docs/versions/<doc-id>` dir name; unanchored `__pycache__/` is intentional).

## Verification (run all; report in verdict)

1. `git check-ignore -v docs/versions/data/v0002_probe.md` → NO match (exit 1).
2. `git check-ignore -v data/kb.sqlite3` → still matched (now by `/data/`).
3. `git status --short` → no unexpected new untracked entries (i.e. nothing previously hidden floods in; expected visible changes are only `.gitignore` itself plus the usual works/ slice state).
4. `uv run pytest -q` → 25/25.
5. `python3 scripts/workflow.py validate` → passes.

## Wrap-up (executor)

- Add one line to `works/phases/active/P2/phase.md` → Findings & Notes: `F1: .gitignore data rule anchored to /data/ — docs/versions/data/ is trackable; root data/ (SQLite) still ignored.` (No new Doc impact entry — packaging correction, no durable-truth change beyond what `operations` covers.)
- Write `result.md` in this slice folder.
- Never commit; never transition status. Touch only `.gitignore`, this slice's files, and `phase.md`.
