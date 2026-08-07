# Backlog

> Generated dashboard. Do not put detailed task context here; edit phase/slice/deferred folders instead.
> Status box: `[x]` done · `[~]` pending — waiting on operator · `[r]` ready — plan approved, awaiting execution · `[ ]` open/in progress.

## Pointer

- Current phase: `P25`
- Current slice: `P25.S1`
- Next slice: `P25.S2`
- Waiting on operator: `none`
- Open deferred jobs: `15`
- Rebuilt at: `2026-08-07T14:44:52+09:00`

## Active Phases

| Phase | Status | Review | Name | Current Slice | Path |
|---|---|---|---|---|---|
| [x] `P21` | `done` | `pass` | Web document deletion | `none` | `works/phases/active/P21` |
| [x] `P22` | `done` | `pass` | Graph label focus | `none` | `works/phases/active/P22` |
| [x] `P23` | `done` | `pass` | Document version control | `none` | `works/phases/active/P23` |
| [x] `P24` | `done` | `pass` | Upload finish-return timeout | `none` | `works/phases/active/P24` |
| [ ] `P25` | `planned` | `pending` | Pretty public share URLs | `P25.S1` | `works/phases/active/P25` |

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
| [x] `P23.S3` | `done` | web: document version history + past-version view | `implementation` | `works/phases/active/P23/slices/P23.S3` |
| [x] `P23.S4` | `done` | /explain skill: read prior version + publish v2 across all skill copies | `implementation` | `works/phases/active/P23/slices/P23.S4` |
| [x] `P23.REVIEW` | `done` | phase review | `review` | `works/phases/active/P23/slices/P23.REVIEW` |

## Phase P24: Upload finish-return timeout

| Slice | Status | Name | Kind | Path |
|---|---|---|---|---|
| [x] `P24.DECOMP` | `done` | decompose phase | `decomposition` | `works/phases/active/P24/slices/P24.DECOMP` |
| [x] `P24.S1` | `done` | Fast, bounded write response: git push + embed off the response path | `implementation` | `works/phases/active/P24/slices/P24.S1` |
| [x] `P24.S2` | `done` | Explain skill: honest publish timeout + verify before retry (3 copies) | `implementation` | `works/phases/active/P24/slices/P24.S2` |
| [x] `P24.S3` | `done` | CLI: honest write-timeout reporting on knowledge save | `implementation` | `works/phases/active/P24/slices/P24.S3` |
| [x] `P24.F1` | `done` | Operator surfaces: honest push verification after the after-response publish | `fix` | `works/phases/active/P24/slices/P24.F1` |
| [x] `P24.REVIEW` | `done` | phase review | `review` | `works/phases/active/P24/slices/P24.REVIEW` |

## Phase P25: Pretty public share URLs

| Slice | Status | Name | Kind | Path |
|---|---|---|---|---|
| [x] `P25.DECOMP` | `done` | decompose phase | `decomposition` | `works/phases/active/P25/slices/P25.DECOMP` |
| [ ] `P25.S1` | `todo` | org slug: postgres column, validation, and the /app/tenant set surface | `implementation` | `works/phases/active/P25/slices/P25.S1` |
| [ ] `P25.S2` | `todo` | slug-based public document resolver and canonical share path | `implementation` | `works/phases/active/P25/slices/P25.S2` |
| [ ] `P25.S3` | `todo` | web pretty document route and legacy /documents/{id} redirect | `implementation` | `works/phases/active/P25/slices/P25.S3` |
| [ ] `P25.S4` | `todo` | org-slug public graph URL and legacy /graph/{uuid} redirect | `implementation` | `works/phases/active/P25/slices/P25.S4` |
| [ ] `P25.S5` | `todo` | share affordances: copy-link, save URL, and the org-slug settings field | `implementation` | `works/phases/active/P25/slices/P25.S5` |
| [ ] `P25.REVIEW` | `todo` | phase review | `review` | `works/phases/active/P25/slices/P25.REVIEW` |
