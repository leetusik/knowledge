# P10.F1 — plan (orchestrator → slice-executor-low)

Apply a **one-line fix** in `/Users/sugang/projects/personal/knowledge`. This is a fully mechanical, exact edit —
follow it literally; if anything differs from what's described, **escalate** rather than improvising.

## The problem (context only — the fix is below)
`server/api_auth.py::get_tenant_one_id()` reads `config.operator_email()` **verbatim** and looks the user up with
an exact-match query, but the seed / `/auth/signup` store the operator email lowercased. So a mixed-case
`KB_OPERATOR_EMAIL` leaves the master bearer unresolvable and the live `docs/` corpus stamped `''`. Fix = normalize
the email the same way the seed does.

## The edit (single site)
In `server/api_auth.py`, inside `async def get_tenant_one_id()`, find:

```python
    email = config.operator_email()
    if not email:
        return None
```

Change the first line so the email is normalized before the guard and lookup:

```python
    email = (config.operator_email() or "").strip().lower()
    if not email:
        return None
```

That is the **only** change. Do NOT edit anything else — not the seed, not `config.operator_email()`, not
`get_user_by_email`/the repository, not any other function or file. The `if not email:` guard already handles the
unset/blank case (`""` is falsy). The cache-on-success line (`_tenant_one_cache = tenants[0].id`), the
`_tenant_mode()` gate, and every caller are untouched.

## Verification (run; report in `result.md`)
1. `unset DATABASE_URL && uv run pytest -q` → **65 passed** (regression; the edited line is in the tenant-mode
   branch that legacy tests don't reach, so a green run proves no legacy breakage).
2. `python3 scripts/workflow.py validate` → passes.

## Finish
Write `result.md` (the one-line normalization + the 65-pass regression result). Append one line to
`works/phases/active/P10/phase.md` noting the S6-flagged caveat is resolved: `get_tenant_one_id()` now normalizes
`KB_OPERATOR_EMAIL` (`.strip().lower()`) like the seed / `/auth/signup`, so the `KB_API_TOKEN` master bearer is
casing-tolerant (the deploy runbook's "must be lowercase" line becomes a nicety, not a hard requirement) — folds
into the existing security/operations doc-impact for `P10.REVIEW`. Do NOT commit, transition status, or run
`doc-new-version`. Return `done` when the edit is in and the 65-test regression is green; otherwise `escalate`
with what you saw.
