# Backlog

> Generated dashboard. Do not put detailed task context here; edit phase/slice/deferred folders instead.
> Status box: `[x]` done · `[~]` pending — waiting on operator · `[r]` ready — plan approved, awaiting execution · `[ ]` open/in progress.

## Pointer

- Current phase: `P28`
- Current slice: `none`
- Next slice: `none`
- Waiting on operator: `P28`
- Open deferred jobs: `24`

## Active Phases

| Phase | Status | Review | Name | Current Slice | Path |
|---|---|---|---|---|---|
| [x] `P21` | `done` | `pass` | Web document deletion | `none` | `works/phases/active/P21` |
| [x] `P22` | `done` | `pass` | Graph label focus | `none` | `works/phases/active/P22` |
| [x] `P23` | `done` | `pass` | Document version control | `none` | `works/phases/active/P23` |
| [x] `P24` | `done` | `pass` | Upload finish-return timeout | `none` | `works/phases/active/P24` |
| [x] `P25` | `done` | `pass` | Pretty public share URLs | `none` | `works/phases/active/P25` |
| [x] `P26` | `done` | `pass` | New-maintainer knowledge base | `none` | `works/phases/active/P26` |
| [x] `P27` | `done` | `pass` | Console visual redesign — design system + responsive surfaces (design) | `none` | `works/phases/active/P27` |
| [~] `P28` | `pending` | `pending` | Console visual redesign — apply | `P28.REVIEW` | `works/phases/active/P28` |

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
| [x] `P25.S1` | `done` | org slug: postgres column, validation, and the /app/tenant set surface | `implementation` | `works/phases/active/P25/slices/P25.S1` |
| [x] `P25.S2` | `done` | slug-based public document resolver and canonical share path | `implementation` | `works/phases/active/P25/slices/P25.S2` |
| [x] `P25.S3` | `done` | web pretty document route and legacy /documents/{id} redirect | `implementation` | `works/phases/active/P25/slices/P25.S3` |
| [x] `P25.S4` | `done` | org-slug public graph URL and legacy /graph/{uuid} redirect | `implementation` | `works/phases/active/P25/slices/P25.S4` |
| [x] `P25.S5` | `done` | share affordances: copy-link, save URL, and the org-slug settings field | `implementation` | `works/phases/active/P25/slices/P25.S5` |
| [x] `P25.F1` | `done` | canonical_path round-trip guard: emit only when the slug resolves back to the same row | `fix` | `works/phases/active/P25/slices/P25.F1` |
| [x] `P25.F2` | `done` | dashboard org-slug hint: changing a claimed slug breaks previously shared links | `fix` | `works/phases/active/P25/slices/P25.F2` |
| [x] `P25.F3` | `done` | unclaimed-slug share UX: surface claim-your-URL state instead of silently copying the legacy URL | `fix` | `works/phases/active/P25/slices/P25.F3` |
| [x] `P25.F4` | `done` | member document view: consolidate explainer scroll (iframe height handshake vs AppShell layout) | `fix` | `works/phases/active/P25/slices/P25.F4` |
| [x] `P25.REVIEW` | `done` | phase review | `review` | `works/phases/active/P25/slices/P25.REVIEW` |

## Phase P26: New-maintainer knowledge base

| Slice | Status | Name | Kind | Path |
|---|---|---|---|---|
| [x] `P26.DECOMP` | `done` | decompose phase | `decomposition` | `works/phases/active/P26/slices/P26.DECOMP` |
| [x] `P26.S1` | `done` | Knowledge: what it is and how it is used | `knowledge` | `works/phases/active/P26/slices/P26.S1` |
| [x] `P26.S2` | `done` | Knowledge: system internals - content plane, write path, contracts | `knowledge` | `works/phases/active/P26/slices/P26.S2` |
| [x] `P26.S3` | `done` | Knowledge: the read surfaces - two front ends | `knowledge` | `works/phases/active/P26/slices/P26.S3` |
| [x] `P26.S4` | `done` | Knowledge: shipping and running it - distribution, deploy, security, QA | `knowledge` | `works/phases/active/P26/slices/P26.S4` |
| [x] `P26.S5` | `done` | Knowledge: why it is this way, and how to change it | `knowledge` | `works/phases/active/P26/slices/P26.S5` |
| [x] `P26.S6` | `done` | Audit and refresh README.md | `implementation` | `works/phases/active/P26/slices/P26.S6` |
| [x] `P26.REVIEW` | `done` | phase review | `review` | `works/phases/active/P26/slices/P26.REVIEW` |

## Phase P27: Console visual redesign — design system + responsive surfaces (design)

| Slice | Status | Name | Kind | Path |
|---|---|---|---|---|
| [x] `P27.DECOMP` | `done` | decompose phase | `decomposition` | `works/phases/active/P27/slices/P27.DECOMP` |
| [x] `P27.S1` | `done` | Seed ## Operator Runtime in the operations doc | `docs` | `works/phases/active/P27/slices/P27.S1` |
| [x] `P27.S2` | `done` | Design round 03: design system re-established in the new account + responsive foundation | `co-work` | `works/phases/active/P27/slices/P27.S2` |
| [x] `P27.S3` | `done` | Design round 04: console surfaces at three viewports (shell, dashboard, project + documents list, documents, auth, public shell) | `co-work` | `works/phases/active/P27/slices/P27.S3` |
| [x] `P27.S4` | `done` | Design round 05: graph at three viewports + legend project click | `co-work` | `works/phases/active/P27/slices/P27.S4` |
| [x] `P27.S5` | `done` | Design round 06: document views + chrome-less HTML-only view + Export PDF print appearance | `co-work` | `works/phases/active/P27/slices/P27.S5` |
| [x] `P27.REVIEW` | `done` | phase review | `review` | `works/phases/active/P27/slices/P27.REVIEW` |

## Phase P28: Console visual redesign — apply

| Slice | Status | Name | Kind | Path |
|---|---|---|---|---|
| [x] `P28.DECOMP` | `done` | decompose phase | `decomposition` | `works/phases/active/P28/slices/P28.DECOMP` |
| [x] `P28.S1` | `done` | Graph server groundwork: canonical_path on doc nodes | `implementation` | `works/phases/active/P28/slices/P28.S1` |
| [x] `P28.S2` | `done` | Round 03 apply: tokens, responsive stylesheet, shell + components | `implementation` | `works/phases/active/P28/slices/P28.S2` |
| [x] `P28.S3` | `done` | Round 03 apply: system states (error, loading, not-found, empty, toast) | `implementation` | `works/phases/active/P28/slices/P28.S3` |
| [x] `P28.S4` | `done` | Round 04 apply: shells, dashboard, project page + documents panel | `implementation` | `works/phases/active/P28/slices/P28.S4` |
| [x] `P28.S5` | `done` | Round 04 apply: disclosures, documents page, auth gate + login next | `implementation` | `works/phases/active/P28/slices/P28.S5` |
| [x] `P28.S6` | `done` | Round 05 apply: graph engine, dock, project lens, public graph | `implementation` | `works/phases/active/P28/slices/P28.S6` |
| [x] `P28.S7` | `done` | Round 06 apply: document views + chrome-less full-width view | `implementation` | `works/phases/active/P28/slices/P28.S7` |
| [x] `P28.S8` | `done` | Round 06 apply: print layer + Export PDF control | `implementation` | `works/phases/active/P28/slices/P28.S8` |
| [x] `P28.S9` | `done` | Fidelity + functional sweep across every changed surface | `qa` | `works/phases/active/P28/slices/P28.S9` |
| [x] `P28.F1` | `done` | Graph dock: the tag switch measures 0x0 on a small plate | `fix` | `works/phases/active/P28/slices/P28.F1` |
| [ ] `P28.REVIEW` | `in_progress` | phase review | `review` | `works/phases/active/P28/slices/P28.REVIEW` |
