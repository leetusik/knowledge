# Backlog

> Generated dashboard. Do not put detailed task context here; edit phase/slice/deferred folders instead.
> Status box: `[x]` done · `[~]` pending — waiting on operator · `[r]` ready — plan approved, awaiting execution · `[ ]` open/in progress.

## Pointer

- Current phase: `P9`
- Current slice: `P9.S4`
- Next slice: `P9.S5`
- Waiting on operator: `none`
- Open deferred jobs: `2`
- Rebuilt at: `2026-07-15T11:03:45+09:00`

## Active Phases

| Phase | Status | Review | Name | Current Slice | Path |
|---|---|---|---|---|---|
| [x] `P1` | `done` | `pass` | Bootstrap Intake | `none` | `works/phases/active/P1` |
| [x] `P2` | `done` | `pass` | Track 2 — DB-backed document API | `none` | `works/phases/active/P2` |
| [x] `P3` | `done` | `pass` | Track 1 — GitHub Pages publishing | `none` | `works/phases/active/P3` |
| [x] `P4` | `done` | `pass` | Knowledge feature core improvements | `none` | `works/phases/active/P4` |
| [x] `P5` | `done` | `pass` | Web UI redesign & search | `none` | `works/phases/active/P5` |
| [x] `P6` | `done` | `pass` | Obsidian-like knowledge graph | `none` | `works/phases/active/P6` |
| [x] `P7` | `done` | `pass` | Claude Code plugin | `none` | `works/phases/active/P7` |
| [x] `P8` | `done` | `pass` | Knowledge API for hi2vi content agent | `none` | `works/phases/active/P8` |
| [ ] `P9` | `planned` | `pending` | Production deploy GitHub Action for the knowledge API | `P9.S4` | `works/phases/active/P9` |

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
| [x] `P6.F1` | `done` | Graph renderer revision — quiet labels, idle mingle, pointer zoom, sticky re-place, legend lens (design P6.S1) | `fix` | `works/phases/active/P6/slices/P6.F1` |
| [x] `P6.F2` | `done` | Graph overlays cannot be hidden — [hidden] loses to overlay display rules (operator browser QA) | `fix` | `works/phases/active/P6/slices/P6.F2` |
| [x] `P6.F3` | `done` | Graph layout: more node spacing, smarter placement, placement survives reloads (operator browser QA) | `fix` | `works/phases/active/P6/slices/P6.F3` |
| [x] `P6.F4` | `done` | Graph full-bleed breakout defeated by §10b margin rule — panel/zoom clipped off-screen (operator QA) | `fix` | `works/phases/active/P6/slices/P6.F4` |
| [x] `P6.REVIEW` | `done` | phase review | `review` | `works/phases/active/P6/slices/P6.REVIEW` |

## Phase P7: Claude Code plugin

| Slice | Status | Name | Kind | Path |
|---|---|---|---|---|
| [x] `P7.DECOMP` | `done` | decompose phase | `decomposition` | `works/phases/active/P7/slices/P7.DECOMP` |
| [x] `P7.S1` | `done` | Feature portability pass | `implementation` | `works/phases/active/P7/slices/P7.S1` |
| [x] `P7.S2` | `done` | Plugin skeleton + marketplace wiring | `implementation` | `works/phases/active/P7/slices/P7.S2` |
| [x] `P7.S3` | `done` | Template payload, renderer, parity guard | `implementation` | `works/phases/active/P7/slices/P7.S3` |
| [x] `P7.S4` | `done` | Shipped explain skill | `implementation` | `works/phases/active/P7/slices/P7.S4` |
| [x] `P7.S5` | `done` | Setup skill | `implementation` | `works/phases/active/P7/slices/P7.S5` |
| [x] `P7.F1` | `done` | Write path auto-creates project landing index.md — second-project docs break the scaffold deploy gate (S6 E2E) | `fix` | `works/phases/active/P7/slices/P7.F1` |
| [x] `P7.S6` | `done` | E2E install test + docs | `implementation` | `works/phases/active/P7/slices/P7.S6` |
| [x] `P7.REVIEW` | `done` | phase review | `review` | `works/phases/active/P7/slices/P7.REVIEW` |

## Phase P8: Knowledge API for hi2vi content agent

| Slice | Status | Name | Kind | Path |
|---|---|---|---|---|
| [x] `P8.DECOMP` | `done` | decompose phase | `decomposition` | `works/phases/active/P8/slices/P8.DECOMP` |
| [x] `P8.S1` | `done` | publish-on-write: server-side git push after the scoped commit | `implementation` | `works/phases/active/P8/slices/P8.S1` |
| [x] `P8.S2` | `done` | hosted read auth: gate reads/search behind bearer (local stays open) | `implementation` | `works/phases/active/P8/slices/P8.S2` |
| [x] `P8.S3` | `done` | prod deploy artifacts for knowledge.hi2vi.com (compose.prod + vhost + runbook) | `implementation` | `works/phases/active/P8/slices/P8.S3` |
| [x] `P8.F1` | `done` | plugin template sync — mirror S1/S2 server+test changes, manifest entry, version bump (parity red at HEAD) | `fix` | `works/phases/active/P8/slices/P8.F1` |
| [x] `P8.S4` | `done` | secrets provisioning runbook + frozen consumer contract | `implementation` | `works/phases/active/P8/slices/P8.S4` |
| [x] `P8.F2` | `done` | reality-fix: openssh-client in image (push was impossible), deploy artifacts retargeted to the live dedicated edge | `fix` | `works/phases/active/P8/slices/P8.F2` |
| [x] `P8.S5` | `done` | E2E acceptance: first hi2vi write -> push -> Pages -> live; search under auth | `implementation` | `works/phases/active/P8/slices/P8.S5` |
| [x] `P8.REVIEW` | `done` | phase review | `review` | `works/phases/active/P8/slices/P8.REVIEW` |

## Phase P9: Production deploy GitHub Action for the knowledge API

| Slice | Status | Name | Kind | Path |
|---|---|---|---|---|
| [x] `P9.DECOMP` | `done` | decompose phase | `decomposition` | `works/phases/active/P9/slices/P9.DECOMP` |
| [x] `P9.S1` | `done` | Self-host the web UI + retire Pages | `implementation` | `works/phases/active/P9/slices/P9.S1` |
| [x] `P9.S2` | `done` | On-box deploy: reconcile + redeploy both services + edge re-apply | `implementation` | `works/phases/active/P9/slices/P9.S2` |
| [x] `P9.S3` | `done` | GHA driver + Production Deploy workflow | `implementation` | `works/phases/active/P9/slices/P9.S3` |
| [ ] `P9.S4` | `todo` | Runner SSH-key provisioning runbook + operator gate | `implementation` | `works/phases/active/P9/slices/P9.S4` |
| [ ] `P9.S5` | `todo` | E2E acceptance (real dispatch) | `implementation` | `works/phases/active/P9/slices/P9.S5` |
| [ ] `P9.REVIEW` | `todo` | phase review | `review` | `works/phases/active/P9/slices/P9.REVIEW` |
