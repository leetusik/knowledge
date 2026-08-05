# Plan — P24.REVIEW (phase review: upload finish-return timeout)

## Inputs

- `../../phase.md` — objective, confirmed failure mode, decided fix shape, constraints,
  every slice's appended notes, and the Doc impact list (S1 three lines, S2, S3).
- `../../intent.md` — the operator's confirmed intent.
- Each slice's `plan.md` + `result.md` (S1 server, S2 skill, S3 CLI).
- P24 is NOT in parallel mode — a passing review consolidates docs here.

## 1. Validate all slices together

- Repo suite: `.venv/bin/python -m pytest` (83 passed / 32 skipped baseline).
- Postgres-gated suites (no CI runs pytest): stand up the disposable cluster with the
  **`-17`-suffixed Homebrew binaries** (`initdb-17`, `pg_ctl-17`, `createdb-17` — the
  bare names don't exist here), DSN `postgresql://kb@/kbtest?host=/tmp&port=55432`;
  issue `rm -rf`/`initdb`/`pg_ctl` as separate commands (a compound one is denied by
  the sandbox). If cluster setup fails, say so explicitly — don't silently accept
  skips.
- CLI suite: `cli/.venv/bin/python -m pytest cli/tests -q` (44 passed baseline; the
  root suite never covers cli/).
- `python3 scripts/plugin_parity.py` (S1 touched server+tests+manifest).
- `python3 scripts/skills_parity.py` (S2 touched the three repo skill copies), and
  `diff -q plugin/skills/explain/SKILL.md ~/.claude/skills/explain/SKILL.md` (fourth
  copy — S2 wrote it; it is outside the parity script).
- `python3 scripts/workflow.py validate`.
- Behavioral spot-checks the suites may not cover end-to-end: the ordering guarantee
  test (`test_response_does_not_wait_for_a_hanging_push`), a slow/hung push never
  delaying a 201; `KB_GIT_TIMEOUT_S` bounding a wedged git subprocess; the skill's
  §5→§5.1→§6→§8 flow consistency (every curl covered by an `allowed-tools` prefix).

## 2. Review against objective and intent

- Intent: confirm-the-failure-mode ✔ (DECOMP, from code); finish response reliable ✔?
  (S1 — judge the mechanism: single worker FIFO, WRITE_LOCK re-take, drain on
  shutdown; the queue is in-memory — a crash before the push drains loses only the
  push, not the save, and the next write pushes everything; is that acceptable and
  documented?); client reporting honest ✔? (S2 skill, S3 CLI).
- Flagged behavior changes to confirm deliberate + documented: `commit_sha` no longer
  the post-rebase published HEAD; `push_error` unreachable in responses; `pushed`
  always false when deferred (external consumers like changple5/hi2vi read these —
  additive-only promise held?).
- Recorded soft spots to judge (fix slices or accepted-and-documented): worker-side
  Gemini embed still unbounded (delays queued pushes, never responses); background
  embed's SQLite race (fails closed, reindex catches up); CLI client-side date
  rel_path derivation around midnight (degrades to "could not confirm").
- Backward compat: response shapes additive; `saved:` output lines unchanged
  (onboarding_smoke); CLI reads still at 15s.

## 3. Verdict

- `changes_requested` / `blocked`: complete validation + judgment first, then STOP
  before doc work; numbered findings + proposed fix slices.
- `pass`: consolidate the Doc impact list via
  `python3 scripts/workflow.py doc-new-version --doc <doc> --summary "..." --source P24.REVIEW`
  — the lines name `api.md`, `backend.md`/`architecture.md`, `operations.md`,
  `experience.md`; write what the lines support (merge overlaps per doc), verify the
  list is complete against the slices' results, then rebuild-docs if not automatic.
- Report `explain: not written — run /explain for this phase`.

## Wrap-up

Write `result.md`; append any durable notes to `phase.md`. Return: review_verdict,
findings, proposed_fix_slices, doc_versions, validation, explain pointer.

## Re-review (after P24.F1)

The first pass returned `changes_requested` with three findings (see the review notes
in `phase.md` and the first-pass `result.md`); `P24.F1` closed them (docs/comments +
`onboarding_smoke.py` `push_pending` key — see `../P24.F1/result.md`). This pass:

1. Verify F1 actually closes each finding: `deploy/README.md` §2's new three-command
   procedure is honest against the code (failure-only log grep — `server/publish.py`
   logs no success line; `rev-list == 0` positive assertion), `compose.prod.yml`
   comment + `KB_GIT_TIMEOUT_S` docs, `onboarding_smoke.py` key list.
2. Re-run the cheap validation (repo pytest, plugin_parity, py_compile of the smoke
   script, workflow validate). The expensive suites (Postgres-gated, CLI) were green
   on the first pass and F1 touched nothing they import — re-run them only if you see
   reason to distrust that.
3. On pass: consolidate the FULL Doc impact list (including the review's two appended
   lines and F1's operations.md line — lift README §2 verbatim into `operations.md`
   so runbook and doc don't drift; retire qa.md's stale "pre-existing gated failure"
   note per the first-pass finding that the gated suite is now 115/115). Then the
   fixed explain pointer as before.
