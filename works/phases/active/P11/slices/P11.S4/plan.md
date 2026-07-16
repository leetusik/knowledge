# P11.S4 — E2E usage smoke (extend onboarding_smoke.py)

Plan for slice **P11.S4** (implementation, risk **low** → `slice-executor-low`, a literal plan-follower).
**Fully mechanical**: insert the exact code below verbatim — no design decisions. Extends the existing
`scripts/onboarding_smoke.py` to assert the meter→read chain end-to-end. Shared context:
`works/phases/active/P11/phase.md`.

## Context

S1–S3 built usage metering + the read API, but their **live** DB behavior was deferred (no Postgres in
the executor envs). S4 adds the committed, runnable assertions that exercise the whole chain against a
live tenant-mode instance: tenant B writes a doc + searches (already in the smoke), then B's
`/app/usage` and `/app/projects/{id}/usage` must reflect exactly that activity, the `vk_` key's
`last_used_at` must be set, and usage must be tenant-scoped. **S4 writes these assertions; they are RUN
live at the phase REVIEW (or by the operator/CI against the deployed instance)** — S4's own env has no
Postgres, so S4 only makes the script valid, it does not run it live.

The smoke's `run(base_url, master_token, failures)` already: onboards tenant B (→ `session_auth`,
`project_id`, `vk_auth`), B writes one doc via `vk_auth`, and B searches ≥1 time via `vk_auth`. Reads
are not metered; only the 1 write (`document.created`) and the search(es) are. Metering is synchronous
(recorded before each write/search response returns), so a later `/app/usage` read sees them with no race.

## Edit 1 — add the `uuid` import

In `scripts/onboarding_smoke.py`, in the stdlib import group (currently `argparse`, `datetime`,
`secrets`, `sys`), add `import uuid` after `import sys` (keeps the group alphabetical).

## Edit 2 — insert the usage assertions

**Location:** at the **end of the `with httpx.Client(timeout=15, follow_redirects=False) as client:`
block inside `run(...)`** — immediately after the tenant-#1 isolation checks (the `if t1_rel_path:`
block that ends the master-bearer by-path check) and **before** the block closes (before the dedented
`isolation = …` summary line). Indent at the `with`-body level (8 spaces). Insert verbatim:

```python
        # --- 3. Usage metering: B's activity is metered + tenant-scoped ----
        # B wrote exactly one doc and searched >= 1 time via the metered /api/*
        # path. Metering is synchronous (recorded before each write/search
        # response returns), so /app/usage reflects it immediately.
        r = client.get(f"{base_url}/app/usage", headers=session_auth)
        if r.status_code != 200:
            failures.append(f"GET /app/usage: expected 200, got {r.status_code} {r.text}")
        else:
            usage = r.json()
            totals = usage.get("totals", {})
            # Fresh tenant B wrote exactly one doc. == 1 (not >= 1) also proves
            # cross-tenant isolation: tenant #1's writes must NOT leak into B's usage.
            if totals.get("documents_created") != 1:
                failures.append(
                    "GET /app/usage: expected totals.documents_created == 1 for fresh "
                    f"tenant B, got {totals.get('documents_created')!r} "
                    f"(metering or tenant isolation broken): {usage}"
                )
            if not isinstance(totals.get("searches"), int) or totals["searches"] < 1:
                failures.append(
                    "GET /app/usage: expected totals.searches >= 1, got "
                    f"{totals.get('searches')!r}: {usage}"
                )
            # Default 30-day window -> a contiguous, zero-filled 30-day series.
            if len(usage.get("daily_counts", [])) != 30:
                failures.append(
                    "GET /app/usage: expected 30 zero-filled daily_counts, got "
                    f"{len(usage.get('daily_counts', []))}"
                )
            # B's own project appears in the tenant's project list.
            if not any(p.get("id") == project_id for p in usage.get("projects", [])):
                failures.append(
                    f"GET /app/usage: B's project {project_id!r} missing from projects list"
                )

        # Per-project drill-down: B's project shows the write + its credential's recency.
        r = client.get(f"{base_url}/app/projects/{project_id}/usage", headers=session_auth)
        if r.status_code != 200:
            failures.append(
                f"GET /app/projects/{{id}}/usage: expected 200, got {r.status_code} {r.text}"
            )
        else:
            proj_usage = r.json()
            if proj_usage.get("totals", {}).get("documents_created") != 1:
                failures.append(
                    "GET /app/projects/{id}/usage: expected totals.documents_created == 1, got "
                    f"{proj_usage.get('totals', {}).get('documents_created')!r}: {proj_usage}"
                )
            # The vk_ key did metered work (write + search) -> last_used_at is set.
            creds = proj_usage.get("credentials", [])
            if not creds or not any(c.get("last_used_at") for c in creds):
                failures.append(
                    "GET /app/projects/{id}/usage: expected a credential with a non-null "
                    f"last_used_at (the vk_ key did metered work), got {creds}"
                )

        # Cross-tenant/missing project usage is scoped: a foreign project id -> 404, no leak.
        r = client.get(
            f"{base_url}/app/projects/{uuid.uuid4()}/usage", headers=session_auth
        )
        if r.status_code != 404:
            failures.append(
                f"GET /app/projects/<random>/usage: expected 404 (scoped), got "
                f"{r.status_code} {r.text}"
            )
```

## Edit 3 — mention usage in the summary line

Change the `return` at the end of `run(...)` from
`return f"tenant B onboarded ({email}), doc {b_rel_path}; {isolation}"`
to
`return f"tenant B onboarded ({email}), doc {b_rel_path}; {isolation}; usage metered"`.

## Edit 4 — add step 3 to the module docstring

In the numbered overview at the top of the file (after the "2. Isolation …" item), add:
```
  3. Usage — with B's session token, GET /app/usage + /app/projects/{id}/usage
     assert B's one write + search(es) are metered (documents_created == 1,
     searches >= 1, 30 zero-filled daily buckets), the vk_ key's last_used_at is
     set, and a foreign project id -> 404 (usage is tenant-scoped).
```

## Out of scope (do not touch)

Everything under `server/` (S1–S3, done), `docs/`, `pytest`/`tests/`. Only `scripts/onboarding_smoke.py`
changes.

## Validation (executor runs; orchestrator re-runs only `validate`)

- **Mandatory:** `.venv/bin/python -m py_compile scripts/onboarding_smoke.py` → no syntax error.
- **Mandatory:** `.venv/bin/python scripts/onboarding_smoke.py --help` → prints usage and exits 0 (confirms
  the new `import uuid` and the file load cleanly).
- **Mandatory:** `.venv/bin/python -m pytest -q` → **65 passed** (the smoke isn't part of pytest; this just
  confirms nothing else broke).
- **The live end-to-end run is NOT done here** (no tenant-mode Postgres instance in this env). It is the
  phase REVIEW's job (or the operator/CI) to run
  `python scripts/onboarding_smoke.py --base-url <live> --master-token <KB_API_TOKEN>` against a running
  tenant-mode instance and see PASS. Do **not** fabricate a live result; state this clearly in `result.md`.

## On completion (executor writes)

- `result.md` — the edits made, the assertions added, and that the live run is deferred to REVIEW/operator.
- Append to `phase.md` **Findings & Notes**: that `onboarding_smoke.py` now covers the meter→read chain
  (the exact assertions) and is the phase's live-acceptance script for REVIEW to run. Confirm the
  `operations.md` Doc-impact line (smoke extended with usage assertions).
