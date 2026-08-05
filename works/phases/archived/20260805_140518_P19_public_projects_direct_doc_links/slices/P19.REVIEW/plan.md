# Plan — P19.REVIEW "phase review + durable-doc consolidation"

Operator-approved 2026-07-22 (do-whole-phase, final gate). Executor: `slice-executor-high` (kind: review — the one slice allowed to run `doc-new-version`/`rebuild-docs`).

Read first: `works/phases/active/P19/phase.md` (the whole notebook — decomposition, cross-slice notes S1–S5, the accumulated **Doc impact** lines, Constraints), `works/phases/active/P19/intent.md` (points 5 & 6 are P19's), each slice's `result.md`, and `works/phases/active/P18/slices/P18.REVIEW/result.md` (the template: validation matrix → judgment → flagged routing → doc versions table).

All five middle slices are done, committed, and live on prod (S5 Stage B: hosted smoke PASS incl. web pages; flip probe 401→404).

## 1. Validation matrix — all slices together (report exact outcomes; tear down disposables)

- Root pytest, legacy (no Postgres): `.venv/bin/python -m pytest -q` — expect pass + Postgres-gated skips.
- Full Postgres-gated run: fresh disposable `postgres:17` + `KB_TEST_DATABASE_URL=… KB_AUTH_RATE_LIMIT=0 .venv/bin/python -m pytest -q` — expect all pass EXCEPT the one known pre-existing D15 failure (`test_documents_api.py::test_documents_list_detail_and_project_bridge`, P16-era `format` key — not P19's; anything else failing is a finding).
- Alembic on fresh Postgres: `alembic upgrade head` (`0001→…→0004`) + downgrade→re-upgrade round-trip; verify `projects.visibility text NOT NULL DEFAULT 'private'`.
- Web: `pnpm --dir web typecheck` / `lint` / `test` / `build`.
- CLI: `cd cli && pytest -q` (use the cli venv/uv per its setup) — expect 40 passed.
- `python3 scripts/plugin_parity.py` and `python3 scripts/skills_parity.py` — both PASS lines.
- `python3 scripts/workflow.py validate`.
- Prod E2E: **cite S5 Stage B** (ran 2026-07-22, hosted `onboarding_smoke.py` PASS incl. the public-link leg with web pages) — do NOT re-run the full smoke (it only adds throwaway prod tenants); you may re-verify the read-only flip probe (`GET https://knowledge.hi2vi.com/app/graph?org=<random-uuid>` → 404).

## 2. Spot-check load-bearing claims against the committed tree (not just result.md trust)

`optional_user` never raises (`server/accounts/auth.py`); doc read is scoped-first-then-public-fallback with the legacy-mode guard and registry-less-rows-never-public (`server/documents_api.py`); `db._filtered` with an **empty** `projects` allowlist fails closed; graph public path 404s on empty/nonexistent org (`server/graph_api.py`); the web anonymous branch fetches **tokenless only** (never renders a token-fetched doc to an anonymous visitor — `web/src/app/(public)/documents/[id]/page.tsx`); raw relay sandbox headers byte-identical server and BFF; mode-aware url branches on `ctx.tenant_id`, not `is_public` (`server/main.py:592-601`); `robots.ts` now allows `/documents` + `/graph`.

## 3. Judgment vs objective / intent.md (points 5 & 6) / boundaries

- Per-project visibility, private default (incl. get-or-create implicit creates); session-only PATCH toggle; 404 cross-tenant.
- Public projects' docs AND graph readable by anonymous visitors and other users; outsiders' graph shows only public-project nodes (absent, not dimmed — server-side filter); 404-never-403 extended everywhere on the new surface.
- Every save returns a working direct URL (tenant mode → `{app origin}/documents/{id}`, live-verified; legacy/template keeps the mkdocs shape); CLI surfaces it; both skill copies updated; shareable when public.
- Boundaries: D13 untouched; D15 not absorbed; no design authoring (composition from existing pieces only); `/api/*` contract additive-only; single-uvicorn-worker model preserved; both parity gates green; no P20 encroachment.

## 4. Flagged follow-ups → routing recommendations (you may NOT run `defer-job`; recommend, the orchestrator files them)

(a) No rate limiting on the anonymous read surface (S2 defer-note). (b) Login `returnTo` plumbing + public-graph tag-hub links landing on the session-gated `/documents?tag=` (S3 niceties). (c) Org slug vanity URLs for the public graph (UUID-only MVP). (d) D15 stays as the already-filed deferred job. None should block a pass unless you find them worse than recorded.

## 5. Doc consolidation — ONLY on a passing review

Consolidate the whole accumulated "Doc impact" list from `phase.md` into **one new version per affected doc**: `python3 scripts/workflow.py doc-new-version --doc <name> --summary "…" --source P19.REVIEW`, edit only each returned `edit_path`, then ONE `rebuild-docs` at the end. Expected set (final call yours, from the phase.md list): `api`, `backend`, `security`, `frontend`, `data` (the impact lines omit it, but alembic `0004` + the SQLite `projects` allowlist predicate belong in the schema doc — add it), `operations`, `product`, and `experience` at your judgment (CLI save now surfaces a shareable direct url; public sharing journey). Never hand-edit `docs/current/*` (generated) or old versions.

## 6. Deliverables

`result.md` written from scratch (validation matrix + judgment + flagged routing + doc versions table, per the P18.REVIEW template); a closing note in `phase.md` if warranted; return **`review_verdict: pass | changes_requested | blocked`** with notes (and proposed fix slices with names/kinds if changes_requested). Never commit; never transition slice/phase status; never touch source code; `doc-new-version` + editing the returned `edit_path`s + `rebuild-docs` are your only doc writes.
