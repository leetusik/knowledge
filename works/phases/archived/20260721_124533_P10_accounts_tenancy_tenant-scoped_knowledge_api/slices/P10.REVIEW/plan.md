# P10.REVIEW — plan (orchestrator → slice-executor-high)

Run the **phase review** for P10 in `/Users/sugang/projects/personal/knowledge`. Read
`works/phases/active/P10/phase.md` end-to-end first — the Objective, the two hard couplings, the Constraints, and
every appended "S1/S2/S3/S4/S5/S6/F1" block (those one-liners are your doc-consolidation source material). Also
read `works/phases/active/P10/intent.md` (the confirmed operator intent). This is the capstone: **validate all
slices together, review against objective/intent/constraints, and — only on a passing review — consolidate the
phase's doc-impact into new doc versions.** You return a `review_verdict`; the orchestrator records it and commits.

**You may run `doc-new-version` (this is the review slice — the one place it's allowed) and `rebuild-docs`. You do
NOT commit, do NOT run `review-phase`, and do NOT transition any slice/phase status** — the orchestrator does all
of that from your verdict. Write `result.md` and append a short review summary to `phase.md`.

## 1. Validate all slices together (report every result honestly — never fabricate a pass)
- **Legacy regression:** `unset DATABASE_URL && uv run pytest -q` → **65 pass** (S1–S4 legacy guards + S5 no-filter
  reads + S6 additive-only + F1 tenant-mode-only edit). Any failure → investigate; a real regression is
  `changes_requested`/`blocked`.
- **Tenant-mode E2E** — ephemeral, exactly as S3–S6 ran it: throwaway `postgres:17` + a **temp `KB_ROOT`** whose
  `docs/` has 2–3 fake project dirs each with a `YYYY-MM-DD-slug.md` (never the real `docs/`/git; `KB_GIT_COMMIT=
  false`); `alembic upgrade head`; `KB_OPERATOR_EMAIL` + `KB_OPERATOR_PASSWORD` + a `KB_API_TOKEN` set; tear down
  `down -v` + remove the temp dir. One consolidated run covering the whole stack:
  - **auth/app (S2/S3):** signup → login → `/auth/me` → logout; `/app` project + `vk_` credential mint/list/revoke;
    cross-tenant access → **404**.
  - **api resolution (S4):** master `KB_API_TOKEN` → tenant #1; `vk_` → its project's tenant; session → user's
    tenant; bad/absent bearer → 401; frozen `POST /api/documents` **201 shape intact**.
  - **content isolation (S5):** tenant B never reads/searches/deletes tenant A's docs; cross-tenant get/delete by
    id or path → 404; isolation **survives a reindex / disposable-DB rebuild** (hard coupling #1).
  - **seed + migrate + onboard (S6):** `python -m server.seed` **idempotent** (2nd run 0 new rows); a reindex
    **re-stamps** every `docs/` row's `tenant_id` with tenant #1's UUID (not `''`); `python
    scripts/onboarding_smoke.py --base-url <app> --master-token <KB_API_TOKEN>` → **PASS**.
  - **F1 casing:** run the seed + master-bearer resolution with a **mixed-case** `KB_OPERATOR_EMAIL` (e.g.
    `Operator@Example.com`) → the master bearer **still resolves** tenant #1 and `docs/` is stamped with T1's UUID.
    (This is the one behavior the legacy 65-test run can't reach — it's the point of F1.)
  - **Docker unavailable?** Don't block: run the legacy regression + import/route/seed-guard sanity and **report
    the tenant-mode E2E as an un-run gap** in `result.md` + the review note (a documented gap, not a pass — and
    say so plainly in the verdict rationale). Prior slices (S3–S6) each ran this ephemeral stack successfully, so
    Docker was available in this environment.
- **State integrity:** `python3 scripts/workflow.py validate`.

## 2. Review against objective / intent / constraints (a real critical pass)
- **Objective + intent.md:** users/tenants/tenant-owned projects/API creds with signup/login/session; per-tenant
  write/read/search; operator tenant #1 seeded + the live corpus migrated in as tenant #1. Confirm **no paid
  retriever built** (D6 stays deferred — `works/deferred/open/D6`), the **plugin/self-host path is untouched**, and
  free = knowledge-save + `/explain` + web UI.
- **Hard constraints — each MUST hold (this is where a mistake would be externally visible):** frozen `POST
  /api/documents` additive-only (tenant #1's `url`/`rel_path` + 201 shape unchanged; tenant never a body field);
  **single uvicorn worker** + in-process `WRITE_LOCK` preserved; content stays files-canonical + disposable SQLite
  (no invariant inversion, no per-tenant git repos); **no per-tenant public sites** (P12 territory); **tenant #1
  works with zero client changes** (`KB_API_TOKEN` still → tenant #1).
- **Two hard couplings:** reindex re-derives `tenant_id` from the file path (survives the disposable-DB rebuild);
  the frozen contract survived tenant scoping. Verify both empirically in the E2E above.

## 3. On a PASS — consolidate doc-impact into new versions (docs ONLY, never source)
For **each** of the seven areas P10 touched, run `python3 scripts/workflow.py doc-new-version --doc <name>
--source P10.REVIEW --summary "<concise P10 summary>"`, then **edit the newly created version file** under
`docs/versions/<name>/vNNNN_*.md` — it is seeded from the current latest, so apply **targeted edits** folding P10's
durable truth into the relevant sections (don't rewrite from scratch; **never hand-edit `docs/current/*`** — those
are generated). Use the `phase.md` appended one-liners as the source. The seven docs + focus:
- **architecture** — two-plane app: async Postgres control plane alongside the unchanged files + disposable-SQLite
  content plane; lazy/dormant without `DATABASE_URL`.
- **backend** — `server/persistence/` + `server/accounts/` (security→types→repository→service); async SQLAlchemy
  2.0 + psycopg3 decision; `require_user` guard; `api_auth` two-mode resolver + `get_tenant_one_id` bridge;
  per-tenant content root; idempotent seed.
- **data** — 6 Postgres accounts tables; `documents.tenant_id` + `UNIQUE(tenant_id, rel_path)` + `''` legacy
  sentinel; namespaced `tenants/<uuid>/` root; reindex path-derivation survives the disposable-DB rebuild.
- **api** — `/auth/*`, `/app/*`, `/api/*` credential→tenant resolver; cross-tenant 404; frozen consumer contract
  preserved additively.
- **security** — multi-tenant threat model; argon2id passwords; sha256 token hashing at rest; pinned un-revokable
  master bearer; cross-tenant content isolation; casing-tolerant operator-email resolution (F1).
- **operations** — `postgres:17` in both compose files; explicit `alembic upgrade head`; `python -m server.seed` +
  `KB_OPERATOR_EMAIL`/`KB_OPERATOR_PASSWORD` prereqs; the deploy/migration runbook; `scripts/onboarding_smoke.py`
  verifier; still single-worker.
- **decisions** — ADRs: Postgres-over-SQLite for accounts; namespaced `docs/`-canonical per-tenant storage;
  `KB_API_TOKEN` as the pinned tenant-#1 master bearer.
Then `python3 scripts/workflow.py rebuild-docs` and `python3 scripts/workflow.py validate`. (Do **not** consolidate
docs on a non-pass verdict.)

## 4. Finish — return the verdict
Write `result.md`: the validation results (the pytest count, the tenant-mode E2E outcomes incl. the F1 mixed-case
check, or the documented Docker gap), the objective/constraint findings, the list of doc versions created (or why
not), and your rationale. Append a short review summary to `phase.md`. Return a structured verdict:
- **`pass`** — validation green and every constraint holds; you created the seven consolidated doc versions.
- **`changes_requested`** — a real defect; include concrete proposed fix slices (`P10.Fn`, name + one-line scope).
  Do **not** version docs.
- **`blocked`** — something can't be assessed; say what.
Set `review_verdict` accordingly (this is a review slice). The orchestrator will run `review-phase P10 --verdict
<v>` from your return, then validate and commit.
