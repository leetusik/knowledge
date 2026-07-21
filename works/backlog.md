# Backlog

> Generated dashboard. Do not put detailed task context here; edit phase/slice/deferred folders instead.
> Status box: `[x]` done · `[~]` pending — waiting on operator · `[r]` ready — plan approved, awaiting execution · `[ ]` open/in progress.

## Pointer

- Current phase: `P18`
- Current slice: `P18.S3`
- Next slice: `P18.S4`
- Waiting on operator: `none`
- Open deferred jobs: `9`
- Rebuilt at: `2026-07-22T03:00:44+09:00`

## Active Phases

| Phase | Status | Review | Name | Current Slice | Path |
|---|---|---|---|---|---|
| [x] `P16` | `done` | `pass` | HTML explainer documents end-to-end | `none` | `works/phases/active/P16` |
| [x] `P17` | `done` | `pass` | Explain skill v2: interactive HTML + public multi-user ingestion | `none` | `works/phases/active/P17` |
| [ ] `P18` | `planned` | `pending` | Accounts v2: user/org/project with org-level keys | `P18.S3` | `works/phases/active/P18` |
| [ ] `P19` | `planned` | `pending` | Public projects & direct doc links | `P19.DECOMP` | `works/phases/active/P19` |
| [ ] `P20` | `planned` | `pending` | Frictionless onboarding: hero, install, env-var quickstart, skill on landing | `P20.DECOMP` | `works/phases/active/P20` |

## Phase P16: HTML explainer documents end-to-end

| Slice | Status | Name | Kind | Path |
|---|---|---|---|---|
| [x] `P16.DECOMP` | `done` | decompose phase | `decomposition` | `works/phases/active/P16/slices/P16.DECOMP` |
| [x] `P16.S1` | `done` | Backend: HTML ingest, storage, text extraction, indexing | `implementation` | `works/phases/active/P16/slices/P16.S1` |
| [x] `P16.S2` | `done` | Web: safe interactive HTML render (sandboxed iframe + raw relay) | `implementation` | `works/phases/active/P16/slices/P16.S2` |
| [x] `P16.S3` | `done` | MCP read path: format-aware fetch_document | `implementation` | `works/phases/active/P16/slices/P16.S3` |
| [x] `P16.REVIEW` | `done` | phase review | `review` | `works/phases/active/P16/slices/P16.REVIEW` |

## Phase P17: Explain skill v2: interactive HTML + public multi-user ingestion

| Slice | Status | Name | Kind | Path |
|---|---|---|---|---|
| [x] `P17.DECOMP` | `done` | decompose phase | `decomposition` | `works/phases/active/P17/slices/P17.DECOMP` |
| [x] `P17.S1` | `done` | Explain skill v2: always-HTML interactive explainer + cited web-research section (canonical) | `implementation` | `works/phases/active/P17/slices/P17.S1` |
| [x] `P17.S2` | `done` | Reconcile explain skill copies from the canonical plugin copy (resolve the duplicate registration) | `implementation` | `works/phases/active/P17/slices/P17.S2` |
| [x] `P17.S3` | `done` | Public-host onboarding surface for plugin users (signup -> project -> vk_ -> config) | `implementation` | `works/phases/active/P17/slices/P17.S3` |
| [x] `P17.S4` | `done` | Plugin-template parity remediation: mirror the SaaS server into plugin/templates/kb (D9) | `implementation` | `works/phases/active/P17/slices/P17.S4` |
| [x] `P17.S5` | `done` | Prod accounts-plane cutover + hosted end-to-end skill-path verification (operator gates) | `implementation` | `works/phases/active/P17/slices/P17.S5` |
| [x] `P17.F1` | `done` | Production Deploy: force-recreate bind-mounted api + P16-discriminating smoke | `fix` | `works/phases/active/P17/slices/P17.F1` |
| [x] `P17.REVIEW` | `done` | phase review | `review` | `works/phases/active/P17/slices/P17.REVIEW` |

## Phase P18: Accounts v2: user/org/project with org-level keys

| Slice | Status | Name | Kind | Path |
|---|---|---|---|---|
| [x] `P18.DECOMP` | `done` | decompose phase | `decomposition` | `works/phases/active/P18/slices/P18.DECOMP` |
| [x] `P18.S1` | `done` | Schema 0003 + models + signup/seed default-org/default-project provisioning | `implementation` | `works/phases/active/P18/slices/P18.S1` |
| [x] `P18.S2` | `done` | Org-level keys: resolver + mint endpoint + write-path get-or-create + metering | `implementation` | `works/phases/active/P18/slices/P18.S2` |
| [ ] `P18.S3` | `todo` | Web app: org-level keys surface + workspace->org copy | `implementation` | `works/phases/active/P18/slices/P18.S3` |
| [ ] `P18.S4` | `todo` | CLI --project/default fallback + explain/setup skill text + parity | `implementation` | `works/phases/active/P18/slices/P18.S4` |
| [ ] `P18.S5` | `todo` | Prod migration + deploy + extended onboarding E2E (operator-gated) | `implementation` | `works/phases/active/P18/slices/P18.S5` |
| [ ] `P18.REVIEW` | `todo` | phase review | `review` | `works/phases/active/P18/slices/P18.REVIEW` |

## Phase P19: Public projects & direct doc links

| Slice | Status | Name | Kind | Path |
|---|---|---|---|---|
| [ ] `P19.DECOMP` | `todo` | decompose phase | `decomposition` | `works/phases/active/P19/slices/P19.DECOMP` |
| [ ] `P19.REVIEW` | `todo` | phase review | `review` | `works/phases/active/P19/slices/P19.REVIEW` |

## Phase P20: Frictionless onboarding: hero, install, env-var quickstart, skill on landing

| Slice | Status | Name | Kind | Path |
|---|---|---|---|---|
| [ ] `P20.DECOMP` | `todo` | decompose phase | `decomposition` | `works/phases/active/P20/slices/P20.DECOMP` |
| [ ] `P20.REVIEW` | `todo` | phase review | `review` | `works/phases/active/P20/slices/P20.REVIEW` |
