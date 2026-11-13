# Result — P18.REVIEW: phase review + durable-doc consolidation

Executed by `slice-executor-high` (kind: review), 2026-07-22. **Verdict: `pass`.**
All five middle slices (S1–S5) validated together, the phase judged against the objective /
intent / scope boundaries, the two flagged items adjudicated, and the phase's durable-truth
changes consolidated into **11 new doc versions** (`--source P18.REVIEW`).

## 1. Validation matrix (all slices, run together)

| Check | Command | Outcome |
|---|---|---|
| Root pytest (legacy, no Postgres) | `.venv/bin/python -m pytest -q` | **PASS** — 70 passed, 19 skipped (Postgres-gated) |
| Postgres-gated suite | `KB_TEST_DATABASE_URL=… .venv/bin/python -m pytest -q` (disposable `postgres:17` on `:55432`) | **88 passed, 1 failed** — the 1 failure is the known **pre-existing** `test_documents_api.py::test_documents_list_detail_and_project_bridge` (P16-era `format`-key mismatch; **not P18** — see §3) |
| Alembic 0003 migration (real prod-path artifact; gated tests use `create_all`, not alembic) | `alembic upgrade head` on fresh Postgres + downgrade→re-upgrade round-trip | **PASS** — `0001→0002→0003` clean; post-`0003` schema verified (nullable `project_id`, NOT-NULL `tenant_id` FK+indexed, `uq_projects_tenant_id`); reversible |
| Web typecheck | `pnpm --dir web typecheck` | **PASS** |
| Web lint | `pnpm --dir web lint` | **PASS** |
| Web tests | `pnpm --dir web test` (vitest) | **PASS** — 8 files / 58 tests |
| Web build | `pnpm --dir web build` (next build) | **PASS** — 16 routes, `/dashboard` dynamic |
| CLI | `cd cli && uv run pytest -q` | **PASS** — 39 passed |
| Plugin parity | `python3 scripts/plugin_parity.py` | **PASS** (exit 0) |
| Skills parity | `python3 scripts/skills_parity.py` | **PASS** (exit 0) |
| Workflow state | `python3 scripts/workflow.py validate` | **PASS** |
| Prod E2E | (not re-run — cited) | S5 **Stage B** ran the extended `onboarding_smoke.py` live against `https://knowledge.hi2vi.com` **today** (exit 0), incl. the org-model journey + the decisive `GET /app/credentials` 404→401 flip. Citing per plan; a re-run only adds throwaway prod tenants. |

The disposable Postgres was torn down after the run. Load-bearing code claims were spot-checked
against the committed tree (not only trusted from `result.md`): `provision_signup` + `DEFAULT_ORG/PROJECT_NAME`
(`service.py`), resolver `if cred.project_id is None → tenant_id=cred.tenant_id` else `get_project`
(`api_auth.py:161-173`), NULL-safe `serialize_credential` (`app_api.py:86`), `get_or_create_project`
+ `ensure_registry_project` dep (`service.py:246`, `main.py:391/428`), and CLI `DEFAULT_PROJECT = "default"`
(`auth.py:68`) — all present as described.

## 2. Judgment vs objective / intent / boundaries — PASS

All four intent bullets are delivered and backed by committed code + green validation:
1. **Signup auto-provisions default org + default project** — `provision_signup` (atomic tenant "default" + owner + project "default"); signup + fresh-DB seed both build on it; existing tenants not renamed. Gated `test_accounts_provisioning` + live E2E (`project == "default"`).
2. **Org-level `vk_` keys, honest with tenant-wide enforcement** — `0003` (tenant_id backfill + nullable project_id) + resolver reads `cred.tenant_id` + additive `POST/GET/DELETE /app/credentials`. Gated `test_org_credentials` + live E2E (one org key → two projects, revoke→401, project-bound regression).
3. **Projects get-or-create by name** — race-safe `get_or_create_project` + async write-path dep + `POST /app/projects` folded in. Gated proof + live E2E (two never-pre-created names appear).
4. **CLI repo-basename default + `--project` + "default" fallback** — `DEFAULT_PROJECT` retargeted to `"default"`; `--project` shipped in P13; `init` mints an org key. 39 CLI tests + `default_project()` smoke.

Scope boundaries held: **D14** (org creation + invites) exists as a deferred job sourced from P18, untouched; **P19** not encroached (no `is_public`/visibility column added to `projects`); **P20** not encroached (marketing landing "workspace" copy in `content/marketing/content.ts` deliberately left for P20). Invariants held: frozen `/api/* + /auth/* + /app/*` contract additive-only (signup `project` field + `/app/credentials` are additions; `POST /api/documents` consumer contract unchanged); both parity gates green; single uvicorn worker preserved (write-path get-or-create is an async dependency in front of the sync `WRITE_LOCK` handler — no multi-worker/cross-process state).

## 3. Flagged items — routing recommendations (I cannot run `defer-job`; recommend only)

1. **Pre-existing `test_documents_api.py` `format`-key gated failure — NOT phase-blocking.** Confirmed P16-era: the test was last modified in P12 (`_LIST_KEYS` omits `format`), and `format` entered the document-list projection in P16 (`server/main.py:193/606`, commit 69d00a8). No P18 commit touches that test or the projection; it only surfaces under a Postgres-gated run (default CI has no Postgres). It is a documents/content-plane concern outside P18's accounts scope. **Recommend: a small deferred job** (either add `format` to `_LIST_KEYS` or drop it from the list projection). It does not block the P18 objective.
2. **S4's `init --project other` re-mints an org key — cosmetic tension, not a defect.** The reuse-gate structure was preserved verbatim per plan decision #2, so a recorded-project change re-mints a second org key even though org keys aren't project-bound (the extra key still authorizes the whole org; harmless). **Recommend: a deferred job** (candidate follow-up to relax the gate to reuse an org key across projects).

Neither warrants `changes_requested` — both are follow-ups the orchestrator can file as deferred jobs post-review.

## 4. Durable-doc consolidation (11 new versions, `--source P18.REVIEW`)

Consolidated the phase's whole "Doc impact" running list (not per-slice) into one new version per affected doc, editing only each returned `edit_path`, then one `rebuild-docs`:

| Doc | New version |
|---|---|
| product | `v0009` — user→org→project; default org+project on signup; org-level keys; get-or-create; org mgmt deferred D14 |
| experience | `v0009` — default org+project on signup; org-level vk_ from the dashboard Org API keys panel; org copy; CLI/skill onboarding |
| architecture | `v0015` — user→org→project (tenant row is the org, no rename); org vs project-bound resolution seam; write-path get-or-create async dep |
| frontend | `v0008` — Org API keys dashboard panel (P12 reuse, no design round); BFF org helpers; `project_id string\|null`; Workspace→Org copy |
| backend | `v0008` — `provision_signup`; resolver reads `cred.tenant_id`; `get_or_create_project` + `list_org_credentials`; async `ensure_registry_project` |
| data | `v0009` — alembic `0003`: `projects UNIQUE(tenant_id,name)` + de-dupe; `project_credentials.tenant_id` NOT NULL + `project_id` nullable |
| api | `v0013` — additive `/app/credentials` endpoints; signup `project`; nullable `serialize_credential`; get-or-create on `POST /app/projects` + writes |
| decisions | `v0017` — D-P18 set (no rename; additive org keys; get-or-create+UNIQUE; async-dep get-or-create; CLI `DEFAULT_PROJECT` retarget; no design round) |
| operations | `v0019` — P18 cutover runbook (0003 makes ordering load-bearing); executed + verified live; onboarding_smoke org-model leg |
| security | `v0011` — org-level key auth made honest; **no trust-boundary shift**; revoked org keys → 401 |
| qa | `v0009` — gated org-credentials + provisioning tests; CLI test_auth adjusted; onboarding_smoke org-model journey; pre-existing documents_api failure flagged |

**Note (deviation, mechanical):** the initial `doc-new-version` summaries slugified into filenames exceeding the OS 255-byte limit — the first attempts for product/experience/architecture/frontend/backend raised `ENAMETOOLONG` **before** writing any file or index entry (the `dest.exists()` check fires first), so no artifacts leaked. `data`'s first summary squeaked under the file limit but the Edit tool's `.tmp.<pid>.<hash>` suffix then overflowed on edit; I removed that unedited `v0009` (file + its index entry, resetting `latest` to `v0008`) and recreated `data/v0009` with a shorter summary. All 11 docs were then created with concise summaries and edited cleanly. Verified: no orphan version files, every `latest` points at its P18 version, `validate` passes.

## 5. Deviations from plan.md

- Added an **alembic `0003` upgrade + downgrade round-trip smoke** beyond the plan's gated-suite ask — the gated tests build schema via `metadata.create_all`, so they never exercise the real migration; this de-risks the highest-risk P18 artifact. All green.
- The doc-summary filename-length workaround above (mechanical; no content impact).
- No other deviations. No source code edited, no commits, no status transitions, no `defer-job` run.
