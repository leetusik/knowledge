# Result — P17.S5: Prod accounts-plane cutover + hosted E2E (operator gates)

This slice runs in **two executor stages around one operator `pending` gate**. Stage A
(below) is complete and returned `needs_operator`. **Stage B appends to this file after
the operator clears the gate.**

---

## Stage A — pre-flight + operator runbook (done 2026-07-21)

### Probes run (from the sandbox, via `python3` stdlib `urllib` against `https://knowledge.hi2vi.com`)

`curl` was available too, but `python3 urllib` was used for a single clean capture. Each
line is one request; the two auth-throttled endpoints were hit **once** (well under the
20/900 s/IP limit).

| Probe | Result | Reading |
|---|---|---|
| `GET /healthz` | **200** `{"status":"ok","docs_root":"/repo/docs","db":"ok","documents":11}` | api live, SQLite doc store OK, 11 docs |
| `GET /` | **200** Next.js web app (`<!DOCTYPE html>… _next/…`) | web surface live |
| `GET /mcp` | **406** `{"jsonrpc":"2.0",…"Not Acceptable: Client must accept text/event-stream"}` | routed to a live MCP server |
| `GET /auth/me` | **401** `{"detail":"Unauthorized"}` | accounts routes mounted |
| **Discriminator 1** — `POST /auth/login` `{"email":"nobody@example.com","password":"wrong-password-123"}` | **401** `{"detail":"invalid email or password"}` | **accounts plane MIGRATED + LIVE** (see below) |
| **Discriminator 2** — `GET /api/documents` (no bearer) | **401** `{"detail":"missing or invalid bearer token"}` + `WWW-Authenticate: Bearer` | frozen bearer-on-all-`/api/*` contract intact |
| `GET /openapi.json` / `/api/openapi.json` / `/docs` | 404 (schema disabled in prod) | inconclusive; not needed — git state settles P16 presence |

### The headline finding — the accounts-plane cutover is ALREADY DONE

Discriminator 1 is decisive. The `POST /auth/login` handler (`server/auth_api.py:242`)
calls `service.get_user_by_email(...)` with **no `try/except`**, and the service layer
(`server/accounts/service.py:75`) **re-raises any DB error** as `AccountsReadError`
(never swallows it to `None`); if `DATABASE_URL` were unset, `get_session_maker()`
raises `RuntimeError` (`server/persistence/engine.py:36`). So:

- a **dormant** plane (no `DATABASE_URL`) → 500 (RuntimeError),
- an **unmigrated** DB (no `users` table) → 500 (`AccountsReadError`),
- a **live, migrated** DB with the email simply absent → the clean **401
  `invalid email or password`** we observed.

We got the clean 401 ⇒ **`DATABASE_URL` is set, Postgres is up, and the alembic
migrations (`0001_accounts_tenancy` + `0002_usage_events`) are applied.** And
`/healthz` serving `documents:11` (with the documented `KB_STARTUP_REINDEX=true`, whose
boot reindex calls `get_tenant_one_id()`) means the boot reindex resolved **tenant #1**,
so **seed has run too**. The box `.env` secrets (`POSTGRES_PASSWORD`,
`KB_OPERATOR_EMAIL`, `KB_OPERATOR_PASSWORD`) must already be present, or login would 500.

This resolves the plan's stated unknown ("whether Postgres behind them is
provisioned/migrated/seeded") — **it is.** The P10–P13 runbook (`operations.md`
L410–428) has effectively been executed; the box was last deployed for P15 (origin/main
`284fc03`/P15.F1), which carries the P10–P12 accounts plane.

### What is STILL missing — P16 code on the box

The box deploys **origin/main** (`Production Deploy` checks out `GITHUB_SHA` of `main`),
and origin/main is `284fc03` (P15-era). **Local `main` is `3ad7bd9` — 13 commits ahead,
0 behind** — carrying the entire **P16 HTML-explainer pipeline** (`POST /api/documents`
`format:"html"`, tenant-scoped `GET /app/documents/{id}/raw` with the four sandbox
headers, MCP `fetch_document` `format` relay) plus P17 S1–S4. **None of that is on the
box.** Stage B's hosted E2E needs those P16 endpoints, so the push + redeploy is
genuinely required — **for P16, not for the accounts plane.**

Two facts make the redeploy safe and one-step:

1. **No new DB migration in this push.** `alembic/versions/` is byte-identical between
   `284fc03` and `3ad7bd9` (still `0001`+`0002`, already applied). P16's `format` /
   `raw_html` columns live in the **SQLite documents store** and are added **idempotently
   on api boot** by `server/db.py:init_db()` (`ALTER TABLE documents ADD COLUMN …`) — no
   manual step, no operator action.
2. **No fresh-DB boot deadlock.** That deadlock (`operations.md` L417) only bites a
   *fresh* accounts DB (missing `users` table → `get_tenant_one_id()` crash-loop). This
   box is already migrated **and** seeded (tenant #1 resolves), so the redeploy is the
   "already-migrated later redeploy" path — the api boots clean. The `stop → migrate →
   seed → up` one-shot is a first-cutover fix and **does not apply here**.
3. **plugin-ci no longer goes red on the push.** The old runbook warning ("accept
   `plugin-ci.yml` red — D9 parity debt") is **stale**: S4 made `plugin_parity.py`
   green and S2's `skills_parity.py` is green, so both drift gates now pass.

---

## Customized operator checklist (only the steps still needed)

The anticipated `.env`-provisioning and `stop→migrate→seed→up` one-shot are **omitted —
they are already done** (external evidence above). The required path is just **push →
dispatch Production Deploy**. On-box confirmation + a fallback are included in case the
operator wants certainty, but neither is required by the evidence.

### Step 1 (required) — push `main` to origin

Local `main` is a clean fast-forward (13 ahead, 0 behind). This ships P16 + P17 S1–S4.

```bash
git push origin main          # tip 3ad7bd9 (feat(plugin): P17.S4 …)
```

If the publish-on-write box advanced `origin/main` in the meantime (a doc auto-commit),
the push is rejected — then `git pull --rebase origin main` and re-push. Confirm the new
tip: `git rev-parse origin/main` should be `3ad7bd9` (or later, including your rebase).

### Step 2 (required) — dispatch the `Production Deploy` Action

`workflow_dispatch`, main-only. It reconciles the box clone `/opt/knowledge` to
origin/main, rebuilds + health-gates `knowledge-api` + `knowledge-web` (+ `knowledge-mcp`),
keeps `knowledge-postgres` up (compose `depends_on`), and runs its own external smoke
(`/healthz` 200, `/` 200, `/mcp` 406-routed).

```bash
gh workflow run "Production Deploy" --ref main       # or: gh workflow run deploy-production.yml --ref main
gh run watch $(gh run list --workflow="Production Deploy" -L1 --json databaseId -q '.[0].databaseId')
```

Or the UI: **Actions → Production Deploy → Run workflow → branch `main`**.

On boot, `init_db()` auto-adds the SQLite `format`/`raw_html` columns; the accounts plane
(already migrated + seeded) boots clean — no deadlock. **No `.env` change, no
migrate/seed step.**

### Step 3 (optional confirmation — nothing to fix if these pass)

Only if you want on-box certainty that the accounts plane is what the probes indicate:

```bash
# Services up + postgres healthy:
ssh oracle-cloud 'cd /opt/knowledge && docker compose -f compose.prod.yml ps'
#   expect knowledge-api / knowledge-web / knowledge-mcp / knowledge-postgres  Up (healthy)

# Migrations already at head — this is a safe no-op (api is healthy, so `exec` works):
ssh oracle-cloud 'cd /opt/knowledge && docker compose -f compose.prod.yml exec -T api uv run alembic upgrade head'

# Re-run the idempotent seed (no-op if tenant #1 already exists — it does):
ssh oracle-cloud 'cd /opt/knowledge && docker compose -f compose.prod.yml exec -T api python -m server.seed'
```

### Post-deploy spot checks (public, no secrets — I re-run these at the start of Stage B)

```bash
curl -sS https://knowledge.hi2vi.com/healthz            # 200 {"status":"ok",…}
curl -sS -X POST https://knowledge.hi2vi.com/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"nobody@example.com","password":"wrong-password-123"}'   # 401 "invalid email or password"
curl -sS -o /dev/null -w '%{http_code}\n' https://knowledge.hi2vi.com/  # 200
```

### FALLBACK — only if Step 3 shows the accounts DB is NOT migrated/seeded

Against all the external evidence. If (and only if) the api is crash-looping on a fresh
DB, use the deadlock-safe one-shot from `operations.md` L417–423 (`stop → one-off migrate
→ one-off seed → up`), with `POSTGRES_PASSWORD`/`KB_OPERATOR_EMAIL`/`KB_OPERATOR_PASSWORD`
provisioned in `/opt/knowledge/.env` first:

```bash
ssh oracle-cloud 'cd /opt/knowledge && \
  docker compose -f compose.prod.yml stop api && \
  docker compose -f compose.prod.yml run --rm api alembic upgrade head && \
  docker compose -f compose.prod.yml run --rm api python -m server.seed && \
  docker compose -f compose.prod.yml up -d api'
```

---

## Gate

Slice set `pending` by the orchestrator; Stage A returns **`needs_operator`**. The
operator runs **Step 1 (push) + Step 2 (Production Deploy)**; Step 3 is optional
confirmation. On completion, re-dispatch Stage B — it re-verifies the cutover took
(login discriminator + `/healthz`) and runs the throwaway-account skill-path E2E incl.
the MCP `vk_` path.

## Stage A validation

| Command | Outcome |
|---|---|
| 6 external probes (2 discriminators) via `python3 urllib` vs `https://knowledge.hi2vi.com` | all as tabulated above — accounts plane proven live/migrated; P16 proven absent from the box |
| `python3 scripts/workflow.py validate` | **passed** (workspace state integrity) |

No source files edited (Stage A touches only `works/` artifacts). No operator actions
run (no push, no SSH, no deploy dispatch). No secrets seen.

---

## Stage B — hosted end-to-end (run 2026-07-21, after the operator cleared the gate)

**Outcome: `needs_operator`.** The accounts-plane cutover holds and the whole
onboarding + `vk_` plumbing works end to end, but the **hosted P16 skill-path E2E
cannot pass: `knowledge-api` on the box is running STALE, pre-P16 code** despite
`origin/main = 3ad7bd9` (which carries P16) and the operator's GREEN `Production Deploy`
(run 29830927799). The deploy's external smoke checks only `/healthz` 200, `/` 200,
`/mcp` 406 — none exercise P16 — so a GREEN smoke did not prove the api picked up P16.

All probes/E2E ran from the sandbox via `python3` stdlib `urllib` (curl unavailable).
Cloudflare rejected the default `Python-urllib` User-Agent with **403 error 1010**, so
every request set a browser `User-Agent` (a transport detail only — no auth/secret
implication). Auth-throttle budget stayed tiny: **2 `login` + 1 `signup`** total across
both runs, far under 20/900 s/IP; no retry loops.

### Throwaway account (recorded per plan; the `vk_` is NOT recorded here)

- **Email:** `kb-e2e-p17s5-20260721t214338@example.com` (reserved `example.com` domain;
  password held in tmp only, never durable).
- Tenant `8333f560-ece0-4069-b771-d6ac5f830ac7` ("…'s workspace"), user
  `73aebb89-5cfc-495a-bd71-21ceeee22b0c`, project `kb-e2e-p17s5`
  (`3ad1db0f-1262-4d3d-a50e-28da04e57b5e`), credential prefix `vk_jooc9GAdP…` (raw key
  held in tmp only). Ingested doc **id 12**.

### B1 — cutover still holds ✅

| Check | Result |
|---|---|
| `GET /healthz` | **200** `{"status":"ok","db":"ok","documents":11}` |
| `POST /auth/login` nonsense creds | **401** `{"detail":"invalid email or password"}` (migrated 401) |

The accounts plane (P10–P13) is live/migrated/seeded, exactly as Stage A proved.

### B2 — throwaway skill-path E2E (onboarding ✅, P16 ingest ❌)

| Step | Result | Verdict |
|---|---|---|
| `POST /auth/signup` (throwaway email) | **201** `{token, user, tenant}` | ✅ |
| `POST /app/projects` (`kb-e2e-p17s5`) | **201** `{project}` | ✅ |
| `POST /app/projects/{id}/credentials` | **201** `{credential, key}` — raw `vk_` shown once | ✅ |
| `POST /api/documents` `format:"html"`, body = S1 `sample-explainer.html` | **201** — but `rel_path` = `kb-e2e-p17s5/2026-07-21-debouncing-search-box-e2e.**md**`, response has **no `format` key** | ❌ P16 not applied |
| Read-back `GET /api/documents/12` (vk_) | **200**, but keys lack **`format`**; `markdown` is the **raw `<!DOCTYPE html>…`** (13 997 chars), not extracted text | ❌ |
| Read-back `GET /app/documents/12` (session) | **200**, keys lack **`format`** | ❌ |
| `GET /app/documents/12/raw` (session) | **404 `{"detail":"Not Found"}`** — FastAPI's *route-absent* default, **not** the P16 handler's `"no HTML document with id 12"` | ❌ route does not exist on the box |
| `GET /api/search?q=Debouncing` / `q=keystroke` (vk_) | **200**, total 1, finds doc 12 | ✅ (indexed; but over the raw HTML, since it was stored as md) |
| MCP `e2e_smoke.py` (public host, minted vk_, `--query Debouncing`) | **PASS** — `search → 1 hit (id 12)`, `fetch_document → 13 997 chars` | ✅ vk_-path works |
| MCP `fetch_document(id=12)` `format` field | present, value **`"md"`** (mcp-server default; upstream omits `format`); `markdown` = raw HTML | ⚠️ mcp is P16-aware, api is not |

### Decisive diagnosis — split deploy: `knowledge-mcp` P16-aware, `knowledge-api` stale

The P16 `format`/`raw_html` code IS in the checked-out `3ad7bd9` tree
(`server/main.py:383` `format: Literal["md","html"]`, `server/documents.py`, the
`GET /app/documents/{id}/raw` route in `server/documents_api.py:156`). Yet on the live
box:

- **`knowledge-api` is unambiguously pre-P16:** `format:"html"` on POST is silently
  ignored (extra field dropped by the old pydantic model → `.md` doc, raw HTML stored
  verbatim in the `markdown` column); no read projection carries `format`; the
  `/app/documents/{id}/raw` route **does not exist** (404 `Not Found`, not the P16
  handler's message). All three are P16 additions and all three are absent.
- **`knowledge-mcp` is P16-aware:** `fetch_document` carries the additive `format` key
  (P16 addition), defaulting to `"md"` because the upstream `/api` read omits it —
  exactly the documented "older upstream omitting the key defaults to `md`" path. So the
  MCP container updated but the API container did not.
- Everything else works: accounts plane, signup→project→`vk_` mint, ingest, tenant
  search, and the MCP `vk_`-path (search + fetch) — so the box is healthy; only the
  `knowledge-api` **image/code** is stale.

**Conclusion:** the `Production Deploy` (run 29830927799) did not land the P16 `server/`
code onto the running `knowledge-api` container — most likely the api image was served
from a build cache or the service was not recreated, while `knowledge-mcp` rebuilt. This
is a deployment defect, not a code defect (the code in `3ad7bd9` is correct and complete)
and not something Stage B can resolve from outside (no source patch per this slice's Hard
Rules; redeploy is operator-only).

### What the operator must do (the re-opened gate)

Force `knowledge-api` onto the `3ad7bd9` code, then re-dispatch Stage B. Suggested:

```bash
# On the box — rebuild WITHOUT cache and recreate the api (+ mcp for good measure):
ssh oracle-cloud 'cd /opt/knowledge && git -C /opt/knowledge log -1 --oneline && \
  docker compose -f compose.prod.yml build --no-cache api knowledge-mcp && \
  docker compose -f compose.prod.yml up -d --force-recreate api knowledge-mcp'
```

(Confirm the box clone is at `3ad7bd9` first — `git log -1` above. `init_db()` will add
the SQLite `format`/`raw_html` columns idempotently on the api's clean boot; no migration,
no seed, no `.env` change.) Then a public spot check should show P16 live:

```bash
# After redeploy, a fresh format:"html" POST should return rel_path *.html + "format":"html",
# and GET /app/documents/{id}/raw should 200 with the sandbox headers.
```

Re-dispatch Stage B afterward; it re-runs the full skill-path E2E (the same steps above)
and expects: POST → `.html` + `format:"html"`; read-back `format:"html"` + extracted-text
`markdown` + no `raw_html`; `/app/documents/{id}/raw` → 200 + the four sandbox headers;
MCP `fetch_document` `format:"html"` + extracted markdown.

### Cleanup + residuals

- **Throwaway tenant/email not deleted** — no delete API exists (plan-anticipated); the
  operator may purge tenant `8333f560-…` / doc 12 later. It sits in its own namespaced
  tenant, isolated from tenant #1's public corpus.
- **In-browser quiz-render eyeball** — still outstanding for `P17.REVIEW` (needs the P16
  web viewer + the accounts plane, i.e. the redeploy above first).
- **Optional operator-only** `scripts/onboarding_smoke.py --master-token …` extra — not
  run (needs the master `KB_API_TOKEN`, which Stage B never sees); left to the operator.

### Stage B validation

| Command | Outcome |
|---|---|
| B1 cutover re-confirm (`/healthz`, login discriminator) via `python3 urllib` | **✅ pass** — accounts plane live/migrated |
| B2 skill-path E2E (signup→project→vk_→POST→read-back→raw→search) | **partial** — onboarding + ingest 201 + search ✅; **P16 read shape ❌** (api pre-P16) |
| `mcp-server/scripts/e2e_smoke.py --url https://knowledge.hi2vi.com/mcp --key <vk_> --query Debouncing` | **✅ PASS** — MCP vk_-path (search + fetch_document) works |
| MCP `fetch_document` `format` field | present, `"md"` (mcp P16-aware; upstream api not) |
| `python3 scripts/workflow.py validate` | **✅ passed** (workspace state integrity) |

No source files edited (this slice touches only `works/` artifacts). No operator actions
run. No secrets seen; the minted `vk_` was held in tmp only and never written here.

---

## Stage B re-run — hosted end-to-end (run 2026-07-21, after the operator restarted `knowledge-api`)

**Outcome: `done` — FULL PASS.** The first Stage-B run (above) blocked on a split deploy:
`knowledge-api` was serving stale pre-P16 code (route-absent 404 on
`/app/documents/{id}/raw`, `format:"html"` silently dropped). The operator has since
**restarted the bind-mounted `knowledge-api` container** (now `Up` fresh) and the
orchestrator verified the discriminator flipped — unauthenticated
`GET /app/documents/1/raw` now returns **401** (P16 route present; previously the
route-absent **404**), `/healthz` 200. This re-run runs the entire P16 skill-path leg
with a **fresh throwaway account** and every check passes.

All HTTP probes ran via `python3` stdlib `urllib` with a **browser `User-Agent`**
(Cloudflare 403s the default `Python-urllib` UA — transport detail only, no
auth/secret implication). The MCP leg ran through `mcp-server/.venv` (`mcp==1.28.1`).
Auth-throttle budget this run: **1 `login`** (B1 discriminator) **+ 1 `signup`** =
**2 auth calls**, far under 20/900 s/IP; no retry loops.

### Fresh throwaway account (recorded per plan; the `vk_` is NOT recorded here)

- **Email:** `kb-e2e-p17s5-rerun-20260721t131816@example.com` (reserved `example.com`
  domain; password held in tmp only, never durable).
- Tenant `48e2cc73-bcb0-4abf-bc3a-d0a3d19a031a`, user
  `dd010b11-1b49-4a23-b6d0-51966be5377f`, project `kb-e2e-p17s5-rerun`
  (`c302089f-8119-4599-a70d-806044f369dd`), credential prefix `vk_vnhR1wS8U…` (raw key
  held in tmp only). Ingested doc **id 13** (`/healthz` now reports `documents:12` on the
  public tenant #1; the new doc lands in the namespaced throwaway tenant, not tenant #1).

### B1 — cutover + P16 route discriminator ✅

| Check | Result |
|---|---|
| `GET /healthz` | **200** `{"status":"ok","db":"ok","documents":12}` |
| `POST /auth/login` nonsense creds | **401** `{"detail":"invalid email or password"}` (migrated 401) |
| `GET /app/documents/1/raw` (unauth) | **401** `{"detail":"Unauthorized"}` — P16 route present (was route-absent 404 in run 1) |

### B2 — throwaway skill-path E2E (17/17 checks PASS)

| Step | Result | Verdict |
|---|---|---|
| `POST /auth/signup` (throwaway email) | **201** `{token, user, tenant}` | ✅ |
| `POST /app/projects` (`kb-e2e-p17s5-rerun`) | **201** `{project}` | ✅ |
| `POST /app/projects/{id}/credentials` | **201** `{credential, key}` — raw `vk_` shown once | ✅ |
| `POST /api/documents` `format:"html"`, body = S1 `sample-explainer.html` | **201** — `rel_path` = `kb-e2e-p17s5-rerun/2026-07-21-debouncing-a-search-box-explained.**html**`, `"format":"html"` | ✅ P16 applied |
| Read-back `GET /api/documents/13` (vk_) | **200**, `"format":"html"`; `markdown` = **extracted text** (`"Debouncing a Search Box — Explained\n…"`, 6723 chars), **not** raw HTML; **no `raw_html` key** (keys: created_at, date, format, id, markdown, project, rel_path, related, slug, source_repo, tags, tenant_id, title, updated_at) | ✅ |
| `GET /app/documents/13/raw` (session) | **200**, body starts **`<!DOCTYPE html>`**; `Content-Type: text/html; charset=utf-8`; **four sandbox headers** all present (see below) | ✅ |
| Sandbox headers | CSP `sandbox allow-scripts; frame-ancestors 'self'` · `X-Frame-Options: SAMEORIGIN` · `X-Content-Type-Options: nosniff` · `Cache-Control: no-store` | ✅ all four |
| `GET /api/search?q=Debouncing` (vk_) | **200**, `total 1`, finds doc **13** by visible text (search over the extracted text, exactly the P16 design) | ✅ |
| MCP `e2e_smoke.py` (public host, minted vk_, `--query Debouncing`) | **PASS** — `search → 1 hit (id 13)`, `fetch_document → 6723 chars (truncated=False)` | ✅ vk_-path |
| MCP `fetch_document(id=13)` `format` field | present, value **`"html"`**; `markdown` = extracted text (6723 chars, not raw HTML) — the P16 `format` relay now carries the real value | ✅ |

### Diagnosis vs. run 1 — the split deploy is resolved

Run 1's decisive failures (`format:"html"` dropped → `.md` doc, no `format` read field,
`/app/documents/{id}/raw` route-absent 404) are **all gone**: the freshly-restarted
`knowledge-api` now runs the P16 `server/` code (`server/main.py:383` `format` Literal,
`server/documents_api.py:156` raw route). `knowledge-mcp` was already P16-aware in run 1
and now relays the real `format:"html"` because the upstream `/api` read carries it. The
box is fully P16-consistent (api + mcp + web). This was a deployment defect (stale api
container), never a code defect — `3ad7bd9`'s code was correct and complete throughout.

### Cleanup + residuals

- **Two throwaway tenants/emails not deleted** — no delete API (plan-anticipated). Run 1's
  `8333f560-…` (doc 12) and this run's `48e2cc73-…` (doc 13) sit in their own namespaced
  tenants, isolated from tenant #1's public corpus; the operator may purge later.
- **In-browser quiz-render eyeball** — still the one outstanding item for `P17.REVIEW`
  (the P16 sandboxed iframe rendering the interactive explainer under the tenant in the
  web app; the raw-HTML relay + sandbox headers that back it are now proven live).
- **Optional operator-only** `scripts/onboarding_smoke.py --master-token …` — not run
  (needs the master `KB_API_TOKEN`, never seen by this slice); left to the operator.

### Stage B re-run validation

| Command | Outcome |
|---|---|
| `python3 http_e2e.py` (B1 + B2: healthz, login discriminator, raw-route discriminator, signup→project→vk_→POST `format:html`→`/api` read-back→`/app` raw+headers→tenant search) | **✅ 17/17 PASS** |
| `mcp-server/.venv/bin/python scripts/e2e_smoke.py --url https://knowledge.hi2vi.com/mcp --key <vk_> --query Debouncing` | **✅ PASS** — search → 1 hit (id 13), fetch_document → 6723 chars |
| MCP `fetch_document(id=13)` `format` inspection | **✅** `format:"html"`, extracted markdown (6723 chars) |
| `python3 scripts/workflow.py validate` | **✅ passed** (workspace state integrity) |

No source files edited (this slice touches only `works/` artifacts). No operator actions
run in this stage (the api restart was the operator's; verified externally). No secrets
seen; the minted `vk_` and session token were held in a tmp file only, never written here.
