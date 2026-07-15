# Plan — P4.DECOMP: decompose "Knowledge feature core improvements"

Orchestrator's native plan, approved by the operator 2026-07-08. You are the slice-executor for the decomposition slice: audit-verify, design the middle-slice breakdown, create the slices (bare folders), and seed `phase.md`. You never commit and never transition slice/phase status.

## Context

P4 (see `../../intent.md` and `../../phase.md`): audit and improve the current /explain + KB pipeline before the web-UI (P5), knowledge-graph (P6), and plugin (P7) phases. SaaS-someday is noted but out of scope.

Operator decisions captured at planning (binding):

- P4 covers **all four** areas: search quality, API completeness, cross-link convention, publish hygiene.
- **Skill-side changes are deferred to P7.** P4 touches only this repo (server/API/content/site). The current /explain payload must keep working unchanged — anything new in the write contract must be optional/backward-compatible. Never edit `~/.claude/skills/explain` or the bootstrap repo.
- **D1 resolved**: keep `docs/current/` on the public site; **hide `docs/versions/`** from the built site (nav + search) while preserving auto-nav.

## Pre-gathered audit findings (spot-verify against code; don't re-derive from scratch)

Search & indexing:
- `documents_fts` tokenizer is `porter unicode61` (`server/db.py:40`) — English-only stemming; Korean/CJK text is not word-searchable (no trigram/ICU). A tokenizer change requires dropping/rebuilding the FTS table (reindex rebuilds from `docs/`).
- BM25 weights 8/4/1 (title/tags_text/markdown) in `server/search.py`; no recency signal in ranking; no search pagination (only `limit` 1–50).
- Reindex is full-scan only (`server/reindex.py`, `POST /api/reindex`), manually triggered; no startup drift self-heal.

API surface:
- No update/delete over HTTP — `db.delete_document_by_path` exists but is unexposed; deletion today means hand-editing `docs/` + reindex, and the Recent bullet in `docs/index.md` is not maintained.
- No `GET /api/tags` / `GET /api/projects` aggregations (the P5 web UI will need them).

Content / graph groundwork:
- Zero inter-doc links across the 6 explainer docs; no `related:` metadata → the P6 graph has no edges.

Publish hygiene / portability:
- Every published page's frontmatter carries `source.repo` as an absolute local path (e.g. `/Users/sugang/projects/personal/changple5`) — shipped to the public site (all 6 docs).
- `docs/versions/` (20 historical files) publishes publicly — resolved by the D1 decision above.
- `mkdocs.yml` auto-nav is load-bearing: no `nav:`, no `strict:`, ever (`mkdocs.yml:25-27`).

Invariants: `docs/` canonical / DB disposable; single uvicorn worker (in-process write lock); scoped `git add` (never `-A`), never push; tests stay small; durable-doc versioning only at `P4.REVIEW` — slices append one-line "Doc impact" notes to `phase.md`.

## Your job (this slice)

1. Read `../../phase.md`, `../../intent.md`, and this file; spot-verify the findings above.
2. Design the middle-slice breakdown covering the four areas; create the slices with `python3 scripts/workflow.py new-slice --phase P4 --slice P4.S<n> --name "..." --kind implementation --risk <low|medium> --order <n>` — bare folders only, never pre-fill their `plan.md`.
3. **Exception — do NOT create the publish-hygiene slice.** Propose its name/order/risk in `phase.md` instead; the orchestrator will create it by promoting deferred job D1 into it (`promote-deferred` creates the slice and attaches the D1 brief).
4. Seed `phase.md`: fill Decomposition (breakdown, rationale, ordering), Findings & Notes (verified audit), Constraints; start a "Doc impact" list section (empty is fine).
5. Write `result.md` beside this plan; return the structured verdict.

Set each slice's `--risk` deliberately — it selects the executor tier for that slice (`low` → high-effort variant, else xhigh).

## Proposed breakdown sketch (guidance — refine, merge/split/reorder as the audit warrants; keep it lean)

- S1 — Search quality: Korean/CJK-capable FTS5 tokenization (evaluate `trigram` vs alternatives; FTS rebuild path), optional recency-aware ranking, search pagination. Risk: medium.
- S2 — API surface: `DELETE` document endpoint (file + DB + Recent-bullet removal + scoped commit under the write lock), `GET /api/tags`, `GET /api/projects`. Risk: medium.
- S3 — Reindex robustness: incremental/single-path reindex, startup drift self-heal. Risk: low.
- S4 — Cross-link convention: related-docs representation (e.g. optional `related:` frontmatter of rel_paths and/or a `## Related` body section), DB/API exposure, backfill the 6 existing docs. API-side only; optional, backward compatible. Risk: medium.
- S5 — Publish hygiene *(proposed only — created via D1 promotion by the orchestrator)*: publish-safe `source` metadata (drop absolute paths; backfill existing docs), hide `docs/versions/` from the built site without breaking auto-nav (e.g. mkdocs `exclude_docs`), README/config touch-ups. Risk: low.

## Done means

- Middle slices exist as bare folders with deliberate kind/risk/order; the publish-hygiene slice is proposed in `phase.md` but not created.
- `phase.md` seeded (Decomposition, Findings & Notes, Constraints, Doc impact list started).
- `result.md` written; structured verdict returned. No commits, no status transitions, no source-code changes.
