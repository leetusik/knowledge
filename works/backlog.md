# Backlog

> Generated dashboard. Do not put detailed task context here; edit phase/slice/deferred folders instead.
> Status box: `[x]` done · `[~]` pending — waiting on operator · `[r]` ready — plan approved, awaiting execution · `[ ]` open/in progress.

## Pointer

- Current phase: `P23`
- Current slice: `P23.S3`
- Next slice: `P23.S4`
- Waiting on operator: `none`
- Open deferred jobs: `15`
- Rebuilt at: `2026-08-05T16:45:31+09:00`

## Active Phases

| Phase | Status | Review | Name | Current Slice | Path |
|---|---|---|---|---|---|
| [x] `P21` | `done` | `pass` | Web document deletion | `none` | `works/phases/active/P21` |
| [x] `P22` | `done` | `pass` | Graph label focus | `none` | `works/phases/active/P22` |
| [ ] `P23` | `planned` | `pending` | Document version control | `P23.S3` | `works/phases/active/P23` |
| [ ] `P24` | `planned` | `pending` | Upload finish-return timeout | `P24.DECOMP` | `works/phases/active/P24` |

## Phase P21: Web document deletion

| Slice | Status | Name | Kind | Path |
|---|---|---|---|---|
| [x] `P21.DECOMP` | `done` | decompose phase | `decomposition` | `works/phases/active/P21/slices/P21.DECOMP` |
| [x] `P21.S1` | `done` | Backend: member DELETE /app/documents/{doc_id} | `implementation` | `works/phases/active/P21/slices/P21.S1` |
| [x] `P21.S2` | `done` | Web: delete action + confirm UI on documents pages | `implementation` | `works/phases/active/P21/slices/P21.S2` |
| [x] `P21.REVIEW` | `done` | phase review | `review` | `works/phases/active/P21/slices/P21.REVIEW` |

## Phase P22: Graph label focus

| Slice | Status | Name | Kind | Path |
|---|---|---|---|---|
| [x] `P22.DECOMP` | `done` | decompose phase | `decomposition` | `works/phases/active/P22/slices/P22.DECOMP` |
| [x] `P22.S1` | `done` | Show labels only for the selected node | `feature` | `works/phases/active/P22/slices/P22.S1` |
| [x] `P22.REVIEW` | `done` | phase review | `review` | `works/phases/active/P22/slices/P22.REVIEW` |

## Phase P23: Document version control

| Slice | Status | Name | Kind | Path |
|---|---|---|---|---|
| [x] `P23.DECOMP` | `done` | decompose phase | `decomposition` | `works/phases/active/P23/slices/P23.DECOMP` |
| [x] `P23.S1` | `done` | server: on-disk version archive + schema + version-aware write path | `implementation` | `works/phases/active/P23/slices/P23.S1` |
| [x] `P23.S2` | `done` | server: version history read API (/api + /app planes) | `implementation` | `works/phases/active/P23/slices/P23.S2` |
| [ ] `P23.S3` | `todo` | web: document version history + past-version view | `implementation` | `works/phases/active/P23/slices/P23.S3` |
| [ ] `P23.S4` | `todo` | /explain skill: read prior version + publish v2 across all skill copies | `implementation` | `works/phases/active/P23/slices/P23.S4` |
| [ ] `P23.REVIEW` | `todo` | phase review | `review` | `works/phases/active/P23/slices/P23.REVIEW` |

## Phase P24: Upload finish-return timeout

| Slice | Status | Name | Kind | Path |
|---|---|---|---|---|
| [ ] `P24.DECOMP` | `todo` | decompose phase | `decomposition` | `works/phases/active/P24/slices/P24.DECOMP` |
| [ ] `P24.REVIEW` | `todo` | phase review | `review` | `works/phases/active/P24/slices/P24.REVIEW` |
