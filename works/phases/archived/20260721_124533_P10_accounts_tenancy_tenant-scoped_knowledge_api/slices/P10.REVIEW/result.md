# P10.REVIEW — result

**Verdict: `pass`.** All six middle slices (S1–S6) + F1 validated together against a real
ephemeral `postgres:17` + a temp `KB_ROOT`; every phase objective, intent, hard constraint,
and both hard couplings hold empirically. The seven doc-impact areas were consolidated into
new doc versions.

The orchestrator should run `review-phase P10 --verdict pass` and commit. (I did not commit,
did not run `review-phase`, and transitioned no slice/phase status.)

## 1. Validation (all run; Docker was available — nothing gapped)

### Legacy regression — PASS
`env -u DATABASE_URL uv run pytest -q` → **65 passed, 1 warning** (pre-existing
httpx/starlette deprecation noise). Confirms legacy single-tenant `/api/*` is byte-for-byte
unchanged (the tenant-mode edits all live behind the `DATABASE_URL` gate).

### Consolidated tenant-mode E2E — PASS
One ephemeral run: throwaway `postgres:17` (host-mapped) + temp `KB_ROOT`s with 3 fake
project dirs (`alpha/bravo/charlie`, each a dated `.md`), `KB_GIT_COMMIT=false`, Gemini keys
unset, never the real `docs/`/git. Driven against a **single-worker `uvicorn`** in tenant
mode (`DATABASE_URL` set, `KB_API_TOKEN` master, `KB_OPERATOR_EMAIL/PASSWORD`). Teardown
`docker rm -f` + temp-dir removal; verified no leftover container and no source/docs-tree
pollution.

- **auth/app (S2/S3) — `assert_main.py`, 40/40 checks:** signup→login→`/auth/me`→logout
  (session invalidated after logout → 401); `/app` project create + `vk_` credential
  mint/list/revoke (list omits `token_hash`; revoked row shows `revoked_at`); cross-tenant
  tenant-C→tenant-B project get + credential mint → **404**.
- **api resolution (S4):** master `KB_API_TOKEN` → tenant #1 (write lands in `docs/alpha/`,
  public); `vk_` → its project's tenant (write lands in `tenants/<uuid>/`); session token →
  the user's tenant; bad **and** absent bearer → **401** on both write and read; `vk_` on
  `POST /api/reindex` → **401** (operator-only preserved). **Frozen `POST /api/documents`
  201 shape intact:** the exact key set `{id, rel_path, url, title, project, slug, date,
  tags, related, recent_updated, landing_created, committed, commit_sha, pushed}` (+ optional
  `commit_error`/`push_error`), **no `tenant` field** on the body or response.
- **content isolation (S5):** tenant B's list/search is disjoint from tenant #1's corpus;
  cross-tenant get **and delete** by id or by path → **404**; tenant #1's doc survives B's
  failed delete attempts.
- **isolation survives the disposable-DB rebuild (hard coupling #1):** stopped the server,
  **deleted `kb.sqlite3`**, restarted (boot reindex rebuilt from files), and re-ran
  `onboarding_smoke.py` → **PASS** — isolation still holds, `tenant_id` re-derived purely
  from the path. Post-rebuild re-stamp check: all `docs/` rows carry tenant #1's UUID, **0**
  rows left with the `''` sentinel.
- **seed + migrate + onboard (S6):** `python -m server.seed` run twice — run 1
  `created=['alpha','bravo','charlie']`, run 2 `created=[] existed=[all three]` → **0 new
  rows** (idempotent). Boot reindex with tenant #1 seeded **re-stamped every `docs/` row's
  `tenant_id`** with tenant #1's UUID (not `''`). `python scripts/onboarding_smoke.py
  --base-url <app> --master-token <KB_API_TOKEN>` → **PASS** (pre- and post-rebuild).
- **F1 casing (`assert_f1.py`, 5/5, separate DB + KB_ROOT + process):** with a **mixed-case**
  `KB_OPERATOR_EMAIL=Operator@Example.com`, the `KB_API_TOKEN` master bearer **still resolves
  tenant #1** (`POST /api/documents` → 201, lands in `docs/alpha/`; master reads tenant #1's
  corpus), and `docs/` is stamped with one real tenant #1 UUID (no `''` sentinel). This is the
  behavior the 65-test legacy run can't reach — F1's `.strip().lower()` in
  `get_tenant_one_id()` is what makes it pass.

### State integrity — PASS
`python3 scripts/workflow.py validate` → "Workflow validation passed." (run again after the
doc consolidation → still passed).

## 2. Review against objective / intent / constraints

**Objective + intent — met.** Users/tenants/tenant-owned projects/API credentials with
signup/login/session (`/auth/*` + `/app/*`), per-tenant write/read/search (`/api/*` tenant
resolver + tenant-scoped content), and the operator's tenant #1 seeded with the live corpus
migrated in as tenant #1 (seed + path-derived re-stamp, no data move). **No paid retriever
built** — `works/deferred/open/D6` is still `status: deferred`; no `/retriever` or
`/retrieve` endpoint exists in `server/`. **Plugin / self-host path untouched** — no
`plugin/` or `.claude/commands` file changed across P10 (`git diff 422152a..HEAD`). Free =
knowledge-save + `/explain` + web UI: no gating was added to any of those.

**Hard constraints — each holds:**
- **Frozen `POST /api/documents` additive-only:** verified empirically (exact 201 key set,
  no `tenant` body field; tenant derived from the credential). `DocumentIn` carries no tenant
  field; the response construction in `server/main.py` matches `api.md`'s frozen key list.
- **Single uvicorn worker + in-process `WRITE_LOCK`:** `Dockerfile` `CMD` has **no
  `--workers`** (with a comment forbidding it); `WRITE_LOCK` is intact; the async Postgres
  plane never touches it. The E2E ran a single-worker server.
- **Content files-canonical + disposable SQLite:** `init_db` drops/recreates a pre-tenancy
  DB; reindex rebuilds from files; no per-tenant git repos; no invariant inversion.
- **No per-tenant public sites:** `tenants/` is gitignored and never in the mkdocs build.
- **Tenant #1 zero client changes:** `KB_API_TOKEN` still resolves to tenant #1 (master
  bearer), F1 makes it casing-tolerant.

**Both hard couplings verified empirically** (see §1): reindex re-derives `tenant_id` from
the path and survives the disposable-DB rebuild; the frozen contract survived tenant scoping.

**Non-blocking finding (documented, carried into docs):** non-#1 tenant content under
`tenants/<uuid>/` is gitignored + on-box-only — no off-box backup, no published site in P10.
Tenant #1 (the only real data today) stays safe via the git-published `docs/` tree, and P10
deliberately excludes per-tenant sites/backup, so this is **not** a P10 defect. Recommend the
orchestrator/operator file a **deferred backup/snapshot job for `tenants/`** before any non-#1
tenant carries real data at scale (I cannot run `defer-job` from a review slice). Folded into
the data + security + decisions docs as a flagged follow-up.

## 3. Doc consolidation (PASS only)

Created one new version per area (seeded from latest, targeted edits folding in P10's durable
truth; `docs/current/*` never hand-edited), then `rebuild-docs` + `validate` (both clean):

| Doc | New version | Focus |
|---|---|---|
| architecture | `v0009` | two-plane app; async Postgres control plane + unchanged content plane; dormant without `DATABASE_URL`; path-durable tenant identity |
| backend | `v0005` | `server/persistence/` + `server/accounts/` (security→types→repository→service); async SQLAlchemy 2.0 + psycopg3 decision; `require_user`; `api_auth` two-mode resolver + `get_tenant_one_id`; per-tenant content root; idempotent seed |
| data | `v0006` | 6 Postgres accounts tables; `documents.tenant_id` + `UNIQUE(tenant_id, rel_path)` + `''` sentinel; namespaced `tenants/<uuid>/`; reindex path-derivation; Alembic vs disposable-SQLite migrations |
| api | `v0007` | `/auth/*`, `/app/*`, `/api/*` credential→tenant resolver; cross-tenant 404; frozen consumer contract preserved additively |
| security | `v0006` | multi-tenant threat model; argon2id; sha256 token hashing at rest; pinned un-revokable master bearer; cross-tenant isolation; F1 casing-tolerant operator email |
| operations | `v0011` | `postgres:17` in both compose files; explicit `alembic upgrade head`; `python -m server.seed` + `KB_OPERATOR_EMAIL/PASSWORD` prereqs; P10 cutover runbook; `onboarding_smoke.py`; still single-worker |
| decisions | `v0011` | 3 ADRs: Postgres-over-SQLite for accounts; namespaced `docs/`-canonical per-tenant storage; `KB_API_TOKEN` as the pinned tenant-#1 master bearer |

## Deviations from plan.md

- **E2E driven as a single-worker `uvicorn` + httpx (not TestClient, not `docker compose
  up`).** The plan calls for the same ephemeral stack S3–S6 ran; a real single-worker server
  is the most faithful form and is required to exercise `scripts/onboarding_smoke.py` (it
  drives a real base URL). Postgres was containerized; `KB_ROOT` was a temp dir, so the real
  `docs/`/git were never touched. No behavioral gap — every assertion the plan enumerates was
  covered, plus the delete-404 and disposable-DB-rebuild checks.
- No other deviations.
