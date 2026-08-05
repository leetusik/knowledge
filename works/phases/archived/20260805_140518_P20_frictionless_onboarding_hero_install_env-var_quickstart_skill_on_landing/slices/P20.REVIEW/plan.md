# P20.REVIEW — phase review (validate all slices + consolidate durable docs)

## Context

All five middle slices are done: DECOMP (`583c83c`), S1 installer/hero/CLI (`0563563`), S2 design round 02 (`15b5f23` + `d71b541`), S3 designed sections (`a8847bc`), S4 ship + live verify (`9742f56` + `e424d65`). The cutover is live and E2E-verified. The review validates the whole phase together, judges it against the objective / `intent.md`, and — **only on a passing verdict** — consolidates the phase.md "Doc impact" list into new doc versions. Executor: `slice-executor-high`. **Never edits source code**; a needed code change = `changes_requested` with proposed fix slices.

## Executor's job

1. **Validate all slices together** (each command from the slices' plan/result records):
   - `python3 scripts/skills_parity.py` (S3's three-copy gate)
   - `bash -n web/public/install.sh` (S1)
   - `cli/.venv/bin/python -m pytest cli/tests -q` (S1; note: system `python3` lacks pytest — use the repo venv, per phase.md gotcha)
   - `cd web && npm run typecheck && npm run lint && npm run test && npm run build` (S1 + S3)
   - Cheap read-only live re-probes (S4): `/healthz` 200; `/install.sh` 200 + shebang; `/SKILL.md` byte-identical to `plugin/skills/explain/SKILL.md`; landing HTML has the curl hero + `id="agents"` + `id="skill"`
   - `python3 scripts/workflow.py validate`
2. **Judge vs the objective and `intent.md`'s four threads**, reading every slice's `result.md`: (1) broken install line → curl installer, live; (2) init/password honesty → depicted prompt + web-login line, no generator; (3) env-var REST path promoted with blockers surfaced (`~/.zshenv`, Codex sandbox toggle) on the landing; (4) explain skill published copyable + downloadable under the parity gate, agent-first guidance. Also verify the constraints held: `web/design/rounds/*` returned records unedited (S2's own landing of `output/` + `SIGNOFF.md` is the sanctioned round record, not an edit of a returned file), no PyPI publish, `docs/current/*` not hand-edited, design DoD walked (S3 result), D16/D10/D20 bookkeeping coherent, S4 residue documented.
3. **On `pass` only — consolidate docs.** From phase.md's "Doc impact" list (the concrete S1/S2/S3/S4 entries; seeds are guidance): expected set `decisions`, `experience`, `operations`, `frontend`, `product` — plus any doc the review judges durable-truth-changed (e.g. `qa` for the new vitest + third parity copy), and none it judges unchanged. One version per affected doc: `python3 scripts/workflow.py doc-new-version --doc <doc> --summary "..." --source P20.REVIEW`, edit **only** the returned `edit_path` (capture the whole phase's change for that doc), then `python3 scripts/workflow.py rebuild-docs`.
4. Write `result.md` (validation table, judgment per thread, doc versions created), append closing notes to `phase.md`, and return the verdict with `review_verdict: pass | changes_requested (numbered issues + proposed P20.Fn fix slices) | blocked`.

## After the executor returns (orchestrator)

`python3 scripts/workflow.py review-phase P20 --verdict <v> --reviewer slice-executor-high --note "..."` (this closes the REVIEW slice + phase together — no separate `finish-slice`), then `validate`, commit. On `changes_requested`: create the proposed `P20.Fn` slices and loop them before re-review. **No archiving** (separate manual step; `rotate-backlog` when the operator asks). Do not continue into another phase.

## Verification

Review's own validation table green (or the verdict says why not); `docs/index.json` gains one new version per consolidated doc; `docs/current/*` regenerated; `workflow.py validate` green.
