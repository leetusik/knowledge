# Backlog

> Generated dashboard. Do not put detailed task context here; edit phase/slice/deferred folders instead.
> Status box: `[x]` done · `[~]` pending — waiting on operator · `[r]` ready — plan approved, awaiting execution · `[ ]` open/in progress.

## Pointer

- Current phase: `P17`
- Current slice: `P17.REVIEW`
- Next slice: `none`
- Waiting on operator: `none`
- Open deferred jobs: `8`
- Rebuilt at: `2026-07-21T22:32:58+09:00`

## Active Phases

| Phase | Status | Review | Name | Current Slice | Path |
|---|---|---|---|---|---|
| [x] `P16` | `done` | `pass` | HTML explainer documents end-to-end | `none` | `works/phases/active/P16` |
| [ ] `P17` | `planned` | `pending` | Explain skill v2: interactive HTML + public multi-user ingestion | `P17.REVIEW` | `works/phases/active/P17` |

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
| [ ] `P17.REVIEW` | `todo` | phase review | `review` | `works/phases/active/P17/slices/P17.REVIEW` |
