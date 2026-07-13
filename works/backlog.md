# Backlog

> Generated dashboard. Do not put detailed task context here; edit phase/slice/deferred folders instead.
> Status box: `[x]` done · `[~]` pending — waiting on operator · `[r]` ready — plan approved, awaiting execution · `[ ]` open/in progress.

## Pointer

- Current phase: `P7`
- Current slice: `P7.DECOMP`
- Next slice: `P7.REVIEW`
- Waiting on operator: `none`
- Open deferred jobs: `0`
- Rebuilt at: `2026-07-14T05:19:12+09:00`

## Active Phases

| Phase | Status | Review | Name | Current Slice | Path |
|---|---|---|---|---|---|
| [x] `P1` | `done` | `pass` | Bootstrap Intake | `none` | `works/phases/active/P1` |
| [x] `P2` | `done` | `pass` | Track 2 — DB-backed document API | `none` | `works/phases/active/P2` |
| [x] `P3` | `done` | `pass` | Track 1 — GitHub Pages publishing | `none` | `works/phases/active/P3` |
| [x] `P4` | `done` | `pass` | Knowledge feature core improvements | `none` | `works/phases/active/P4` |
| [x] `P5` | `done` | `pass` | Web UI redesign & search | `none` | `works/phases/active/P5` |
| [x] `P6` | `done` | `pass` | Obsidian-like knowledge graph | `none` | `works/phases/active/P6` |
| [ ] `P7` | `planned` | `pending` | Claude Code plugin | `P7.DECOMP` | `works/phases/active/P7` |

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
| [x] `P2.REVIEW` | `done` | phase review | `review` | `works/phases/active/P2/slices/P2.REVIEW` |

## Phase P3: Track 1 — GitHub Pages publishing

| Slice | Status | Name | Kind | Path |
|---|---|---|---|---|
| [x] `P3.DECOMP` | `done` | decompose phase | `decomposition` | `works/phases/active/P3/slices/P3.DECOMP` |
| [x] `P3.S1` | `done` | Pages workflow + site_url + README publishing model | `implementation` | `works/phases/active/P3/slices/P3.S1` |
| [x] `P3.S2` | `done` | Publish gate: operator enables Pages + first push; verify live site | `implementation` | `works/phases/active/P3/slices/P3.S2` |
| [x] `P3.REVIEW` | `done` | phase review | `review` | `works/phases/active/P3/slices/P3.REVIEW` |

## Phase P4: Knowledge feature core improvements

| Slice | Status | Name | Kind | Path |
|---|---|---|---|---|
| [x] `P4.DECOMP` | `done` | decompose phase | `decomposition` | `works/phases/active/P4/slices/P4.DECOMP` |
| [x] `P4.S1` | `done` | Search quality — CJK-capable FTS tokenization, recency ranking, pagination | `implementation` | `works/phases/active/P4/slices/P4.S1` |
| [x] `P4.S6` | `done` | Hybrid semantic search — Gemini embeddings + sqlite-vec + RRF fusion | `implementation` | `works/phases/active/P4/slices/P4.S6` |
| [x] `P4.S2` | `done` | API completeness — DELETE document, GET /api/tags, GET /api/projects | `implementation` | `works/phases/active/P4/slices/P4.S2` |
| [x] `P4.S3` | `done` | Reindex robustness — incremental single-path reindex + startup drift self-heal | `implementation` | `works/phases/active/P4/slices/P4.S3` |
| [x] `P4.S4` | `done` | Cross-link convention — related-docs metadata, API exposure, backfill | `implementation` | `works/phases/active/P4/slices/P4.S4` |
| [x] `P4.S5` | `done` | Publish hygiene — publish-safe source metadata + hide docs/versions from the built site | `implementation` | `works/phases/active/P4/slices/P4.S5` |
| [x] `P4.REVIEW` | `done` | phase review | `review` | `works/phases/active/P4/slices/P4.REVIEW` |

## Phase P5: Web UI redesign & search

| Slice | Status | Name | Kind | Path |
|---|---|---|---|---|
| [x] `P5.DECOMP` | `done` | decompose phase | `decomposition` | `works/phases/active/P5/slices/P5.DECOMP` |
| [x] `P5.S1` | `done` | Design system — Claude-designed palette/typography/branding via theme config + extra_css tokens, logo/favicon | `implementation` | `works/phases/active/P5/slices/P5.S1` |
| [x] `P5.S5` | `done` | Design co-work — operator designs targets in Claude Design; sync & integrate as delivered | `implementation` | `works/phases/active/P5/slices/P5.S5` |
| [x] `P5.S2` | `done` | Landing page & UX structure — index.md redesign (preserve explain:recent), nav/browse experience, tags page | `implementation` | `works/phases/active/P5/slices/P5.S2` |
| [x] `P5.S3` | `done` | CJK-capable client-side search — Korean/CJK-aware search on the static Pages site | `implementation` | `works/phases/active/P5/slices/P5.S3` |
| [x] `P5.S4` | `done` | Site-build CI smoke guard & hygiene — mkdocs build parity check + invariant assertions | `implementation` | `works/phases/active/P5/slices/P5.S4` |
| [x] `P5.REVIEW` | `done` | phase review | `review` | `works/phases/active/P5/slices/P5.REVIEW` |

## Phase P6: Obsidian-like knowledge graph

| Slice | Status | Name | Kind | Path |
|---|---|---|---|---|
| [x] `P6.DECOMP` | `done` | decompose phase | `decomposition` | `works/phases/active/P6/slices/P6.DECOMP` |
| [x] `P6.S0` | `done` | Design co-work — knowledge-graph design via Claude Design | `implementation` | `works/phases/active/P6/slices/P6.S0` |
| [x] `P6.S1` | `done` | Graph data pipeline + data-contract guard | `implementation` | `works/phases/active/P6/slices/P6.S1` |
| [x] `P6.S2` | `done` | Interactive graph renderer, full-canvas page + JS guard flip | `implementation` | `works/phases/active/P6/slices/P6.S2` |
| [x] `P6.S3` | `done` | Landing entry point + serve parity + ops hygiene | `implementation` | `works/phases/active/P6/slices/P6.S3` |
| [x] `P6.REVIEW` | `done` | phase review | `review` | `works/phases/active/P6/slices/P6.REVIEW` |

## Phase P7: Claude Code plugin

| Slice | Status | Name | Kind | Path |
|---|---|---|---|---|
| [ ] `P7.DECOMP` | `todo` | decompose phase | `decomposition` | `works/phases/active/P7/slices/P7.DECOMP` |
| [ ] `P7.REVIEW` | `todo` | phase review | `review` | `works/phases/active/P7/slices/P7.REVIEW` |
