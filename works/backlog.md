# Backlog

> Generated dashboard. Do not put detailed task context here; edit phase/slice/deferred folders instead.
> Status box: `[x]` done · `[~]` pending — waiting on operator · `[r]` ready — plan approved, awaiting execution · `[ ]` open/in progress.

## Pointer

- Current phase: `P10`
- Current slice: `P10.S4`
- Next slice: `P10.S5`
- Waiting on operator: `none`
- Open deferred jobs: `3`
- Rebuilt at: `2026-07-16T16:21:42+09:00`

## Active Phases

| Phase | Status | Review | Name | Current Slice | Path |
|---|---|---|---|---|---|
| [ ] `P10` | `planned` | `pending` | Accounts, Tenancy & Tenant-Scoped Knowledge API | `P10.S4` | `works/phases/active/P10` |
| [ ] `P11` | `planned` | `pending` | Per-Tenant Usage Monitoring | `P11.DECOMP` | `works/phases/active/P11` |
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
| [ ] `P10.S4` | `todo` | /api/* credential auth: resolve credential -> tenant+project | `implementation` | `works/phases/active/P10/slices/P10.S4` |
| [ ] `P10.S5` | `todo` | Content tenant-scoping: documents.tenant_id + reindex + namespaced storage | `implementation` | `works/phases/active/P10/slices/P10.S5` |
| [ ] `P10.S6` | `todo` | Seed tenant #1 + migrate live corpus + E2E onboarding smoke | `implementation` | `works/phases/active/P10/slices/P10.S6` |
| [ ] `P10.REVIEW` | `todo` | phase review | `review` | `works/phases/active/P10/slices/P10.REVIEW` |

## Phase P11: Per-Tenant Usage Monitoring

| Slice | Status | Name | Kind | Path |
|---|---|---|---|---|
| [ ] `P11.DECOMP` | `todo` | decompose phase | `decomposition` | `works/phases/active/P11/slices/P11.DECOMP` |
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
