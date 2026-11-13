# Plan — P16.REVIEW: phase review

Operator-approved at the do-whole-phase gate, 2026-07-21. Executor: `slice-executor-high` (review slice).

Phase P16 ("HTML explainer documents end-to-end") shipped three implementation slices: S1 backend (ingest/storage/extraction/indexing/raw route), S2 web render (BFF relay + sandboxed opaque-origin iframe), S3 MCP (`format` relay, contract v1). Your job: validate all slices together, judge the phase against `intent.md`/objective/constraints, and — only on a passing verdict — consolidate the `phase.md` Doc-impact list into new doc versions. Read `phase.md`, `intent.md`, and the three slice `result.md`s first.

## 1. Re-validate all slices together (fresh runs; report exact commands + output)

- Backend: `uv run pytest tests -q` (repo root).
- Web: `pnpm test`, `pnpm lint`, `pnpm build` (in `web/`).
- MCP: `uv run pytest` (in `mcp-server/`).
- State: `python3 scripts/workflow.py validate`.

## 2. One end-to-end behavioral check

Your choice of TestClient scratch script (scratchpad, not committed) or live uvicorn against a temp KB_ROOT: POST an HTML explainer (quiz-style, with `<script>`) via `/api/documents` → on-disk `.html` starting with `<!--kb` frontmatter → `GET /api/documents/{id}` returns `format:"html"` + extracted-text `markdown`, never `raw_html` → `/api/search` finds it by extracted-text terms → wipe the SQLite + `reindex()` reproduces the identical row → a markdown doc round-trips byte-identically alongside. (The /app raw route + relay + iframe are machine-verified at unit/runtime level by S1/S2; the live in-browser "quiz JS runs" check is NOT executor-verifiable — record it as the known operator residual, do not fake it.)

## 3. Review against intent

Read `intent.md`, `phase.md` (pins + constraints), the three `result.md`s, and the relevant `docs/current/*.md`. Verify: the objective is met end-to-end; contracts stayed additive-only (spot-check `git log`/diffs: `DocumentIn`, `_public_doc`, `documents_api`, `CONTRACT.md` — no existing field/route changed, `markdown` meaning preserved); markdown byte-identity held (the suites are the guard); the sandbox pin survived implementation exactly (`sandbox="allow-scripts"` and no `allow-same-origin` in `page.tsx`; identical CSP values across the S1 route, S2 relay, and next.config entry).

## 4. Known residuals — judge, don't trip

(a) `scripts/plugin_parity.py` is a PRE-EXISTING red gate (34 issues before P16, now 36; P16 not the cause; remediation belongs to P17; recorded in phase.md Findings). (b) The format-flip-same-slug coexistence quirk (accepted, recorded in S1 result). (c) The S1 landing-skip test relaxation (pre-existing landing behavior, unrelated to html). (d) Live browser quiz check = operator residual.

## 5. On a passing review ONLY — consolidate docs

Map the phase.md Doc-impact list onto the EXISTING doc set: `api`, `backend`, `architecture`, `data`, `frontend`, `experience`, `product` — there is NO security doc: fold the XSS-containment stance into `architecture` (the stance) and `frontend` (the render side); `operations` is likely untouched (no new services/env/migrations — version it only if you find a real operational truth change). Version a doc ONLY where durable truth actually changed. Use `python3 scripts/workflow.py doc-new-version --doc <doc> --summary "..." --source P16.REVIEW`, following the established flow from prior phase reviews (write the new version file under `docs/versions/<doc>/`, regenerate `docs/current/` via the tooling — never hand-edit `docs/current/`, never patch old version files).

## 6. Report + verdict

Write `result.md` (review report: what was validated, the evidence, verdict rationale, residuals) and append a phase.md wrap-up note. Return `review_verdict: pass | changes_requested | blocked` — with concrete proposed fix slices (name + scope each) if `changes_requested`.

## Permissions

This review slice MAY run `doc-new-version` (only this slice may). Still: no commits, no slice/phase status transitions, no `new-slice`, and NO source-code edits — docs and workspace files only. If you find a defect, the answer is `changes_requested` with findings, never a self-applied fix.
