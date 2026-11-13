# P10.F1 — result

## Change

One-line normalization in `server/api_auth.py::get_tenant_one_id()`. Before:

```python
    email = config.operator_email()
    if not email:
        return None
```

After:

```python
    email = (config.operator_email() or "").strip().lower()
    if not email:
        return None
```

Verified before editing that `config.operator_email()` appears exactly once in
`server/api_auth.py` (line 94), matching the plan's single-site description
exactly. No other line in the file, the seed, `get_user_by_email`, or any other
function/file was touched.

## Verification

1. `unset DATABASE_URL && uv run pytest -q` → **65 passed, 1 warning** (the
   warning is pre-existing `httpx`/starlette deprecation noise, unrelated to
   this change). Confirms no legacy regression — the edited line lives in the
   tenant-mode branch (`_tenant_mode()` gate above it), which the 65 legacy
   tests don't reach.
2. `python3 scripts/workflow.py validate` → `Workflow validation passed.`

Both green.

## Deviations from plan.md

None. The edit, surrounding lines, and verification matched the plan exactly.

## Doc impact

Folds into the existing P10.REVIEW security/operations doc-impact (see the
one-liner appended to `phase.md`'s "Doc-impact one-liners" — no new doc-impact
area opened by this fix). No `doc-new-version` run here (review-slice-only).
