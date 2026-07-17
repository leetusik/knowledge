# Backlog

> Generated dashboard. Do not put detailed task context here; edit phase/slice/deferred folders instead.
> Status box: `[x]` done · `[~]` pending — waiting on operator · `[r]` ready — plan approved, awaiting execution · `[ ]` open/in progress.

## Pointer

- Current phase: `P13`
- Current slice: `P13.REVIEW`
- Next slice: `none`
- Waiting on operator: `none`
- Open deferred jobs: `6`
- Rebuilt at: `2026-07-18T02:26:22+09:00`

## Active Phases

| Phase | Status | Review | Name | Current Slice | Path |
|---|---|---|---|---|---|
| [x] `P10` | `done` | `pass` | Accounts, Tenancy & Tenant-Scoped Knowledge API | `none` | `works/phases/active/P10` |
| [x] `P11` | `done` | `pass` | Per-Tenant Usage Monitoring | `none` | `works/phases/active/P11` |
| [x] `P12` | `done` | `pass` | Web App: Tenant Dashboard & Project Detail Pages | `none` | `works/phases/active/P12` |
| [ ] `P13` | `planned` | `pending` | CLI & Agent-First Onboarding | `P13.REVIEW` | `works/phases/active/P13` |
| [ ] `P14` | `planned` | `pending` | Landing Page & Product Webpage via Claude Design Gate | `P14.DECOMP` | `works/phases/active/P14` |
| [ ] `P15` | `planned` | `pending` | Agent-facing retrieval MCP service (search-as-a-service) | `P15.DECOMP` | `works/phases/active/P15` |

## Phase P10: Accounts, Tenancy & Tenant-Scoped Knowledge API

| Slice | Status | Name | Kind | Path |
|---|---|---|---|---|
| [x] `P10.DECOMP` | `done` | decompose phase | `decomposition` | `works/phases/active/P10/slices/P10.DECOMP` |
| [x] `P10.S1` | `done` | Accounts persistence: Postgres + schema + Alembic + accounts layer | `implementation` | `works/phases/active/P10/slices/P10.S1` |
| [x] `P10.S2` | `done` | Auth surface /auth/* + require_user session guard | `implementation` | `works/phases/active/P10/slices/P10.S2` |
| [x] `P10.S3` | `done` | Control plane /app/*: tenant-scoped projects + vk_ credentials | `implementation` | `works/phases/active/P10/slices/P10.S3` |
| [x] `P10.S4` | `done` | /api/* credential auth: resolve credential -> tenant+project | `implementation` | `works/phases/active/P10/slices/P10.S4` |
| [x] `P10.S5` | `done` | Content tenant-scoping: documents.tenant_id + reindex + namespaced storage | `implementation` | `works/phases/active/P10/slices/P10.S5` |
| [x] `P10.S6` | `done` | Seed tenant #1 + migrate live corpus + E2E onboarding smoke | `implementation` | `works/phases/active/P10/slices/P10.S6` |
| [x] `P10.F1` | `done` | Normalize KB_OPERATOR_EMAIL casing in get_tenant_one_id | `fix` | `works/phases/active/P10/slices/P10.F1` |
| [x] `P10.REVIEW` | `done` | phase review | `review` | `works/phases/active/P10/slices/P10.REVIEW` |

## Phase P11: Per-Tenant Usage Monitoring

| Slice | Status | Name | Kind | Path |
|---|---|---|---|---|
| [x] `P11.DECOMP` | `done` | decompose phase | `decomposition` | `works/phases/active/P11/slices/P11.DECOMP` |
| [x] `P11.S1` | `done` | Usage persistence + aggregate service | `implementation` | `works/phases/active/P11/slices/P11.S1` |
| [x] `P11.S2` | `done` | Metering hook (record writes/deletes/search + wire last_used_at) | `implementation` | `works/phases/active/P11/slices/P11.S2` |
| [x] `P11.S3` | `done` | Usage read API | `implementation` | `works/phases/active/P11/slices/P11.S3` |
| [x] `P11.S4` | `done` | E2E usage smoke + verification | `implementation` | `works/phases/active/P11/slices/P11.S4` |
| [x] `P11.REVIEW` | `done` | phase review | `review` | `works/phases/active/P11/slices/P11.REVIEW` |

## Phase P12: Web App: Tenant Dashboard & Project Detail Pages

| Slice | Status | Name | Kind | Path |
|---|---|---|---|---|
| [x] `P12.DECOMP` | `done` | decompose phase | `decomposition` | `works/phases/active/P12/slices/P12.DECOMP` |
| [x] `P12.S1` | `done` | App scaffold + design-system foundation | `implementation` | `works/phases/active/P12/slices/P12.S1` |
| [x] `P12.S2` | `done` | Auth + BFF proxy + authenticated app shell | `implementation` | `works/phases/active/P12/slices/P12.S2` |
| [x] `P12.S2R` | `done` | Re-skin app to Knowledge Base design system | `implementation` | `works/phases/active/P12/slices/P12.S2R` |
| [x] `P12.S3` | `done` | Tenant dashboard: projects + create + tenant usage | `implementation` | `works/phases/active/P12/slices/P12.S3` |
| [x] `P12.S4` | `done` | Project detail: info + credentials + project usage | `implementation` | `works/phases/active/P12/slices/P12.S4` |
| [x] `P12.S5` | `done` | Per-tenant documents browse + search | `implementation` | `works/phases/active/P12/slices/P12.S5` |
| [x] `P12.S6` | `done` | Knowledge graph in the web app (per-tenant) | `implementation` | `works/phases/active/P12/slices/P12.S6` |
| [x] `P12.REVIEW` | `done` | phase review | `review` | `works/phases/active/P12/slices/P12.REVIEW` |

## Phase P13: CLI & Agent-First Onboarding

| Slice | Status | Name | Kind | Path |
|---|---|---|---|---|
| [x] `P13.DECOMP` | `done` | decompose phase | `decomposition` | `works/phases/active/P13/slices/P13.DECOMP` |
| [x] `P13.S1` | `done` | CLI package + config seam + API client | `implementation` | `works/phases/active/P13/slices/P13.S1` |
| [x] `P13.S2` | `done` | Auth & onboarding commands | `implementation` | `works/phases/active/P13/slices/P13.S2` |
| [x] `P13.S3` | `done` | Knowledge commands | `implementation` | `works/phases/active/P13/slices/P13.S3` |
| [x] `P13.S4` | `done` | Agent-readable guide docs + discovery | `implementation` | `works/phases/active/P13/slices/P13.S4` |
| [x] `P13.S5` | `done` | Expose the control plane at the edge + throttle /auth + E2E CLI smoke | `implementation` | `works/phases/active/P13/slices/P13.S5` |
| [ ] `P13.REVIEW` | `todo` | phase review | `review` | `works/phases/active/P13/slices/P13.REVIEW` |

## Phase P14: Landing Page & Product Webpage via Claude Design Gate

| Slice | Status | Name | Kind | Path |
|---|---|---|---|---|
| [ ] `P14.DECOMP` | `todo` | decompose phase | `decomposition` | `works/phases/active/P14/slices/P14.DECOMP` |
| [ ] `P14.REVIEW` | `todo` | phase review | `review` | `works/phases/active/P14/slices/P14.REVIEW` |

## Phase P15: Agent-facing retrieval MCP service (search-as-a-service)

| Slice | Status | Name | Kind | Path |
|---|---|---|---|---|
| [ ] `P15.DECOMP` | `todo` | decompose phase | `decomposition` | `works/phases/active/P15/slices/P15.DECOMP` |
| [ ] `P15.REVIEW` | `todo` | phase review | `review` | `works/phases/active/P15/slices/P15.REVIEW` |
