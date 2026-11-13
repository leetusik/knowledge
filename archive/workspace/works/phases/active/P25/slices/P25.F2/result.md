# Result — P25.F2: dashboard org-slug hint — changing a claimed slug breaks previously shared links

## What changed

One-string copy edit in `web/src/content/dashboard.ts`: extended
`DASHBOARD.orgSlug.hint` (the hint under the Public URL panel's org-slug field) to warn
that changing an already-claimed slug breaks links that were shared under the old one.

Before:

```
hint: "2–40 characters: lowercase letters, numbers and single hyphens.",
```

After:

```
hint: "2–40 characters: lowercase letters, numbers and single hyphens. Changing an already-claimed name breaks links you've already shared.",
```

No other key, component, or file was touched, per the plan's boundary.

## Validation

- `cd web && npm run typecheck` — clean (`tsc --noEmit`, no errors).
- `cd web && npm run test` — **15 files / 85 tests passed**, matching the baseline noted
  in `phase.md` (P25.S5's "web baseline moves to 15 files / 85 tests"); no change in
  count, as expected for a copy-only edit.
- `python3 scripts/workflow.py validate` — `Workflow validation passed.`

No backend file was touched, so the Postgres-gated pytest suite was not re-run; the
`P25.F1` baseline (125 passed with Postgres, 83 passed / 42 skipped without) stands
unaffected. `plugin_parity` is unaffected — `web/` is not a shipped dir.

## Deviations

None. The edit was exactly the one string named in `plan.md`, matching the existing
copy's plain/terse tone and sitting in the same sentence-per-clause style as the rest of
`orgSlug`'s copy block.

## Doc impact

Appended to `phase.md` under a new "Actual (P25.F2):" block (Doc impact running list):

> `docs/current/experience.md` — the dashboard's Public URL panel hint now names the
> cost of Q3's mutability inline: `DASHBOARD.orgSlug.hint` (`web/src/content/dashboard.ts`)
> gained one clause warning that changing an already-claimed slug breaks links already
> shared, next to the existing charset rule. Copy-only; no behavior changed.

This closes REVIEW Finding 2 (minor) for the consolidating review pass.
