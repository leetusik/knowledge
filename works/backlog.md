# Backlog

> Generated dashboard. Do not put detailed task context here; edit phase/slice/deferred folders instead.
> Status box: `[x]` done · `[~]` pending — waiting on operator · `[r]` ready — plan approved, awaiting execution · `[ ]` open/in progress.

## Pointer

- Current phase: `P11`
- Current slice: `P11.S3`
- Next slice: `P11.S4`
- Waiting on operator: `none`
- Open deferred jobs: `5`
- Rebuilt at: `2026-07-16T20:32:20+09:00`

## Active Phases

| Phase | Status | Review | Name | Current Slice | Path |
|---|---|---|---|---|---|
| [x] `P10` | `done` | `pass` | Accounts, Tenancy & Tenant-Scoped Knowledge API | `none` | `works/phases/active/P10` |
| [ ] `P11` | `planned` | `pending` | Per-Tenant Usage Monitoring | `P11.S3` | `works/phases/active/P11` |
| [ ] `P12` | `planned` | `pending` | Web App: Tenant Dashboard & Project Detail Pages | `P12.DECOMP` | `works/phases/active/P12` |
| [ ] `P13` | `planned` | `pending` | CLI & Agent-First Onboarding | `P13.DECOMP` | `works/phases/active/P13` |
| [ ] `P14` | `planned` | `pending` | Landing Page & Product Webpage via Claude Design Gate | `P14.DECOMP` | `works/phases/active/P14` |

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
| [ ] `P11.S3` | `todo` | Usage read API | `implementation` | `works/phases/active/P11/slices/P11.S3` |
| [ ] `P11.S4` | `todo` | E2E usage smoke + verification | `implementation` | `works/phases/active/P11/slices/P11.S4` |
| [ ] `P11.REVIEW` | `todo` | phase review | `review` | `works/phases/active/P11/slices/P11.REVIEW` |

## Phase P12: Web App: Tenant Dashboard & Project Detail Pages

| Slice | Status | Name | Kind | Path |
|---|---|---|---|---|
| [ ] `P12.DECOMP` | `todo` | decompose phase | `decomposition` | `works/phases/active/P12/slices/P12.DECOMP` |
| [ ] `P12.REVIEW` | `todo` | phase review | `review` | `works/phases/active/P12/slices/P12.REVIEW` |

## Phase P13: CLI & Agent-First Onboarding

| Slice | Status | Name | Kind | Path |
|---|---|---|---|---|
| [ ] `P13.DECOMP` | `todo` | decompose phase | `decomposition` | `works/phases/active/P13/slices/P13.DECOMP` |
| [ ] `P13.REVIEW` | `todo` | phase review | `review` | `works/phases/active/P13/slices/P13.REVIEW` |

## Phase P14: Landing Page & Product Webpage via Claude Design Gate

| Slice | Status | Name | Kind | Path |
|---|---|---|---|---|
| [ ] `P14.DECOMP` | `todo` | decompose phase | `decomposition` | `works/phases/active/P14/slices/P14.DECOMP` |
| [ ] `P14.REVIEW` | `todo` | phase review | `review` | `works/phases/active/P14/slices/P14.REVIEW` |
