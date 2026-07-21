# Backlog

> Generated dashboard. Do not put detailed task context here; edit phase/slice/deferred folders instead.
> Status box: `[x]` done · `[~]` pending — waiting on operator · `[r]` ready — plan approved, awaiting execution · `[ ]` open/in progress.

## Pointer

- Current phase: `P17`
- Current slice: `P17.S1`
- Next slice: `P17.S2`
- Waiting on operator: `none`
- Open deferred jobs: `8`
- Rebuilt at: `2026-07-21T15:55:23+09:00`

## Active Phases

| Phase | Status | Review | Name | Current Slice | Path |
|---|---|---|---|---|---|
| [x] `P16` | `done` | `pass` | HTML explainer documents end-to-end | `none` | `works/phases/active/P16` |
| [ ] `P17` | `planned` | `pending` | Explain skill v2: interactive HTML + public multi-user ingestion | `P17.S1` | `works/phases/active/P17` |

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
| [ ] `P17.S1` | `todo` | Explain skill v2: always-HTML interactive explainer + cited web-research section (canonical) | `implementation` | `works/phases/active/P17/slices/P17.S1` |
| [ ] `P17.S2` | `todo` | Reconcile explain skill copies from the canonical plugin copy (resolve the duplicate registration) | `implementation` | `works/phases/active/P17/slices/P17.S2` |
| [ ] `P17.S3` | `todo` | Public-host onboarding surface for plugin users (signup -> project -> vk_ -> config) | `implementation` | `works/phases/active/P17/slices/P17.S3` |
| [ ] `P17.S4` | `todo` | Plugin-template parity remediation: mirror the SaaS server into plugin/templates/kb (D9) | `implementation` | `works/phases/active/P17/slices/P17.S4` |
| [ ] `P17.S5` | `todo` | Prod accounts-plane cutover + hosted end-to-end skill-path verification (operator gates) | `implementation` | `works/phases/active/P17/slices/P17.S5` |
| [ ] `P17.REVIEW` | `todo` | phase review | `review` | `works/phases/active/P17/slices/P17.REVIEW` |
