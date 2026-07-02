# Backlog

> Generated dashboard. Do not put detailed task context here; edit phase/slice/deferred folders instead.
> Status box: `[x]` done · `[~]` pending — waiting on operator · `[ ]` open/in progress.

## Pointer

- Current phase: `P2`
- Current slice: `P2.REVIEW`
- Next slice: `none`
- Waiting on operator: `none`
- Open deferred jobs: `1`
- Rebuilt at: `2026-07-02T16:00:14+09:00`

## Active Phases

| Phase | Status | Review | Name | Current Slice | Path |
|---|---|---|---|---|---|
| [x] `P1` | `done` | `pass` | Bootstrap Intake | `none` | `works/phases/active/P1` |
| [ ] `P2` | `in_progress` | `changes_requested` | Track 2 — DB-backed document API | `P2.REVIEW` | `works/phases/active/P2` |
| [ ] `P3` | `planned` | `pending` | Track 1 — GitHub Pages publishing | `P3.DECOMP` | `works/phases/active/P3` |

## Phase P1: Bootstrap Intake

| Slice | Status | Name | Kind | Path |
|---|---|---|---|---|
| [x] `P1.DECOMP` | `done` | decompose phase | `decomposition` | `works/phases/active/P1/slices/P1.DECOMP` |
| [x] `P1.REVIEW` | `done` | phase review | `review` | `works/phases/active/P1/slices/P1.REVIEW` |

## Phase P2: Track 2 — DB-backed document API

| Slice | Status | Name | Kind | Path |
|---|---|---|---|---|
| [x] `P2.DECOMP` | `done` | decompose phase | `decomposition` | `works/phases/active/P2/slices/P2.DECOMP` |
| [x] `P2.S1` | `done` | Scaffold, conventions library, DB + reindex (no HTTP) | `implementation` | `works/phases/active/P2/slices/P2.S1` |
| [x] `P2.S2` | `done` | Read/search API: healthz, list/get/by-path, BM25 search, reindex endpoint | `implementation` | `works/phases/active/P2/slices/P2.S2` |
| [x] `P2.S3` | `done` | Write path: POST /api/documents + Recent marker + scoped git commit | `implementation` | `works/phases/active/P2/slices/P2.S3` |
| [x] `P2.S4` | `done` | Dockerize: Dockerfile, compose api service, README API section | `implementation` | `works/phases/active/P2/slices/P2.S4` |
| [x] `P2.F1` | `done` | Anchor .gitignore data/ rule to /data/ | `fix` | `works/phases/active/P2/slices/P2.F1` |
| [ ] `P2.REVIEW` | `changes_requested` | phase review | `review` | `works/phases/active/P2/slices/P2.REVIEW` |

## Phase P3: Track 1 — GitHub Pages publishing

| Slice | Status | Name | Kind | Path |
|---|---|---|---|---|
| [ ] `P3.DECOMP` | `todo` | decompose phase | `decomposition` | `works/phases/active/P3/slices/P3.DECOMP` |
| [ ] `P3.REVIEW` | `todo` | phase review | `review` | `works/phases/active/P3/slices/P3.REVIEW` |
