# P11.DECOMP — Result

Decomposed **P11 "Per-Tenant Usage Monitoring"** into four middle slices (bare folders) and seeded
`phase.md` as the shared notebook. No source code was written; no middle-slice `plan.md` was created.

## Slices created

All four created with `new-slice` (bare folders — each holds only `slice.json`):

| Slice | Name | Kind | Risk | Order | Depends on |
|-------|------|------|------|-------|------------|
| P11.S1 | Usage persistence + aggregate service | implementation | medium | 1 | — |
| P11.S2 | Metering hook (record writes/deletes/search + wire last_used_at) | implementation | medium | 2 | P11.S1 |
| P11.S3 | Usage read API | implementation | medium | 3 | P11.S1 |
| P11.S4 | E2E usage smoke + verification | implementation | low | 4 | P11.S3 |

Dependency shape **S1 → {S2, S3} → S4**. Orders 1–4 slot cleanly between `P11.DECOMP` (order 0) and
`P11.REVIEW` (order 9999), which is untouched and stays final. Metadata verified via each `slice.json`.

## Risk rationale

- **S1–S3 medium:** S1 = first durable schema since P10 + aggregate-query correctness; S2 = hot-path
  integration, best-effort semantics, legacy-mode parity; S3 = cross-tenant 404 + serialization that
  P12 consumes.
- **S4 low** (the only one): mechanical extension of the established `scripts/onboarding_smoke.py`
  template — noted in `phase.md` that the orchestrator may bump it to mid if S3 leaves the response
  shape non-obvious.

## phase.md sections seeded

- **Context** — P11 as phase 2 of the P10–P14 SaaS pivot; observability only.
- **Decomposition** — four-slice table with the S1→{S2,S3}→S4 shape and risk rationale.
- **Findings & Notes** — load-bearing research with file:line pointers (verified against the tree):
  metering seam `_resolve_tenant_bearer` (`api_auth.py:123`, `cred` at `:147`); unwired
  `last_used_at` (`repository.py:204` / `service.py:265`) with the copy-this stamp pattern at
  `auth.py:84`; the sync→async wrinkle + recommended async-middleware resolution; the
  project-attribution wrinkle (master bearer has no `project_id`; derive from payload/filter name,
  nullable fallback); the "documents-saved totals already derivable" insight; and the
  persistence/Alembic/read-API templates (`models.py:87 ProjectModel`, `0001_accounts_tenancy.py`,
  `app_api.py`).
- **Resolved design** — `usage_events` schema, aggregate-on-read, metering semantics, read-API home,
  legacy/dormant parity.
- **Resolved decisions** — event-log grain; meter writes+searches; retention deferred; vocky read shape
  (flagged as future `decisions.md` ADRs).
- **Doc impact** — running list seeded for six docs: `data.md`, `api.md`, `backend.md`,
  `operations.md`, `decisions.md`, `security.md`.
- **Constraints** — legacy/dormant parity (65-test regression green), metering never fails a request,
  frozen `/api/*` consumer contract untouched.
- **Open Questions** — metering mechanism (middleware vs per-handler), `event_type` enum/CHECK vs free
  text, project-name→UUID resolution cost.

## Pointer verification

Spot-checked the most load-bearing file:line references before transcribing them so the notebook is
accurate: `_resolve_tenant_bearer` at `server/api_auth.py:123` and `cred = await
service.get_active_credential_by_token_hash(...)` at `:147`; `touch_credential_last_used` at
`server/accounts/repository.py:204` and `server/accounts/service.py:265`; the best-effort
`touch_auth_token_last_used` stamp in the try/except at `server/accounts/auth.py:84`. All confirmed.

## Validation

Left to the orchestrator (per launch instruction): `python3 scripts/workflow.py validate` (state
integrity — S1–S4 exist as bare folders, orders between DECOMP and REVIEW, REVIEW last, `depends_on`
targets exist) and `python3 scripts/workflow.py next` (should select P11.S1). Manual metadata check of
each `slice.json` passed (orders/risks/kinds/depends_on match the plan; each folder holds only
`slice.json`).

## Deviations

None. Did not run `validate` myself — deferred to the orchestrator per the launch instruction. No
retention `defer-job` filed (that is an explicit orchestrator follow-up, not the executor's job).
