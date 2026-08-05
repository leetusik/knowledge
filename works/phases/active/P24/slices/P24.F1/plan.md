# Plan — P24.F1 (fix: operator surfaces — honest push verification after the after-response publish)

## Read first

`../../phase.md` (review notes at the end) and the review's findings in
`../P24.REVIEW/result.md`. This slice closes the review's three findings; it is
docs/comments/one-script-constant in scope — no server behavior change.

## Findings to close

1. **(must)** `deploy/README.md:184-189` — the bring-up check prescribes verifying
   push capability via `pushed:true` / `push_error` in the 201 body; post-P24 `pushed`
   is constantly `false` and `push_error` never appears, so a healthy box reads as
   broken. Replace with an honest post-P24 procedure per the review's suggestion:
   after the first write, grep the api container log for the `[kb-api] publish:` line
   (success/FAILED), plus `git -C /opt/knowledge rev-list origin/main..HEAD` returning
   empty (nothing unpushed). Restate P8.F2's rule ("assert the capability at bring-up,
   never infer it from a 201") in whatever wording fits — the point is the runbook
   must again contain a check that CAN pass on a healthy box and fail on a broken one.
   Check the surrounding README section for any other now-impossible statements
   (`push_error` mentions, "the 201 tells you the push worked" phrasing).
2. **(should)** `compose.prod.yml:48-51` — the `KB_GIT_PUSH` comment still describes
   the push as in-request; update it. Document `KB_GIT_TIMEOUT_S` (default 60s) where
   an operator looks: the compose box-config comment block and/or the deploy README
   env table — match wherever the file documents its siblings.
3. **(optional — do it)** `scripts/onboarding_smoke.py:81-82` — add `push_pending` to
   the required-key list so the committed post-deploy verifier proves the additive
   contract change reached prod. Neither `deploy/` nor `scripts/onboarding_smoke.py`
   is in `shipped_dirs` — no mirror obligation (verify with plugin_parity anyway).

## Constraints

- No `server/**` or behavior changes. Docs, comments, and the smoke-script constant
  only. Keep the runbook edits in the file's existing voice and format.
- If the smoke-script edit somehow trips `plugin_parity.py`, stop and reconsider —
  it should not (not in shipped_dirs).

## Validation

- `python3 scripts/plugin_parity.py` (unchanged-green check)
- `.venv/bin/python -m pytest -q` (nothing should move)
- If `scripts/onboarding_smoke.py` has any self-test or lint the repo uses, run it;
  otherwise a syntax check (`python3 -m py_compile scripts/onboarding_smoke.py`).
- `python3 scripts/workflow.py validate`

## Wrap-up

Write `result.md`; append a one-line Doc impact entry (`operations.md` — the new
bring-up verification) to `phase.md` if it adds anything beyond the review's two
appended lines (check first — the review already added an operations.md line; don't
duplicate).
