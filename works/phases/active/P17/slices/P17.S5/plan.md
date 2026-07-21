# Plan — P17.S5: Prod accounts-plane cutover + hosted E2E (operator gates)

Operator-approved at the plan gate (2026-07-21). Read `../../phase.md` (Findings &
Notes: the cutover section, S3's hosted-E2E expectations, S4's parity-green note;
Constraints) and the runbook `docs/current/operations.md` L410–428 + `deploy/SECRETS.md`
first. This slice runs in **two executor stages around one operator `pending` gate**;
your dispatch prompt tells you which stage you are.

Orchestrator pre-flight (2026-07-21, from the workstation — trust but re-verify in
stage A): `/healthz` 200 (`{"status":"ok","db":"ok","documents":11}`); `/` 200 Next.js
web app; `/mcp` 406 routed; `/auth/me` **401 JSON** → P15-era code with `/auth` routes
mounted. Unknown: whether Postgres behind them is provisioned/migrated/seeded.

## Hard rules (both stages)

- **Operator-run actions are never yours**: push, box SSH/`.env`, `Production Deploy`
  dispatch, migrate/seed. You only probe from outside, prepare exact commands, and
  verify results. No source-file edits in this slice — only `works/` artifacts. If you
  find a real defect, report it as findings (a fix slice's job), never patch inline.
- All probes/E2E run against `https://knowledge.hi2vi.com` with either no credentials,
  a throwaway account you create in stage B, or tokens minted under it. You never see
  operator secrets (`KB_API_TOKEN`, box passwords).
- `/auth/{signup,login}` are throttled 20/900s per IP — stay well under (the full E2E
  needs ~3 auth calls; do not retry-loop).

## Stage A — pre-flight + operator runbook (first dispatch)

1. Re-run the external probes (`/healthz`, `/`, `/mcp`, `/auth/me`) and add the two
   discriminators:
   - `POST /auth/login` with nonsense credentials (e.g. `{"email":"nobody@example.com",
     "password":"wrong-password-123"}`): a migrated accounts plane answers the
     enumeration-safe `401 {"detail":"invalid email or password"}`; a missing/unmigrated
     DB errors differently (500/connect error). Creates nothing.
   - `GET /api/documents` with no bearer (expected 401 per the frozen bearer-on-all-
     `/api/*` contract) — records the auth posture.
2. From the findings, write the **customized operator checklist** into `result.md` —
   only the steps still needed, with exact commands lifted from `operations.md`
   L410–428 / `deploy/SECRETS.md` / `.github/workflows/deploy-production.yml`:
   push main (tip `3ad7bd9`+) · box `.env` adds (`POSTGRES_PASSWORD`,
   `KB_OPERATOR_EMAIL`, `KB_OPERATOR_PASSWORD`) · dispatch `Production Deploy` ·
   the deadlock-safe one-shot (`stop api` → `run --rm api alembic upgrade head` →
   `run --rm api python -m server.seed` → `up -d api`) · post-step spot checks.
3. Append a short stage-A findings note to `phase.md`. Return **`needs_operator`**
   with the checklist in the verdict.

## Stage B — hosted end-to-end (re-dispatch after the operator clears the gate)

1. Confirm the cutover took: the login discriminator now returns the migrated 401;
   `/healthz` still 200.
2. **Throwaway-account skill-path E2E** (secret-free; read
   `server/auth_api.py`/`app_api.py` + `docs/current/api.md` for exact shapes):
   - `POST /auth/signup` with a syntactically valid throwaway email (record it in
     `result.md` — e.g. `kb-e2e-p17s5-<date>@example.com`) → 201 `{token, …}`.
   - Session bearer → `POST /app/projects` → `POST /app/projects/{id}/credentials`
     → the raw `vk_` (shown once — hold in memory/tmp only, never in `result.md`).
   - `POST /api/documents` with the `vk_` bearer: `format:"html"`, body =
     `works/phases/active/P17/slices/P17.S1/sample-explainer.html`, a test project
     name, title/tags per the skill's §5 conventions → 201.
   - Read back `/api/documents/{id}`: `format:"html"`, `markdown` = extracted text
     (never raw HTML), no `raw_html` key.
   - `GET /app/documents/{id}/raw` with the session bearer → 200 raw HTML starting
     `<!DOCTYPE html>` + the four sandbox headers (CSP sandbox, X-Frame SAMEORIGIN,
     nosniff, no-store).
   - Search under the tenant finds the doc by visible text.
   - **MCP `vk_`-path** (the outstanding P15 residual): run
     `mcp-server/scripts/e2e_smoke.py` (read it for its exact CLI) against the public
     host with the minted `vk_` → `search` + `fetch_document` succeed and
     `fetch_document` carries `format`.
3. Cleanup + residuals in `result.md`: the throwaway tenant/email (no delete API —
   operator may purge later); the in-browser quiz-render eyeball stays for REVIEW;
   note the optional operator-only `onboarding_smoke.py --master-token` extra.
4. Append the stage-B outcome + Doc impact lines to `phase.md`
   (**operations**: the P10–P13 cutover is executed and verified — the L410–428
   runbook's state changes; **qa**: hosted skill-path E2E incl. MCP `vk_` path).
   Return **`done`** (or findings if something failed).

## Wrap-up

Both stages write into the same `result.md` (stage A opens it, stage B appends).
Never commit; never transition slice/phase status.
