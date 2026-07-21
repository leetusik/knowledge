# P13.S5 — Expose the control plane at the edge + throttle `/auth` + E2E CLI smoke

`implementation` · risk `high` · order 5 · depends P13.S3 → executor **`slice-executor-high`**

## Context

This is what makes P13 **real** instead of localhost-only. Today the deployed edge (`deploy/knowledge.conf`) proxies only `/api/*` + `/healthz`; `/auth/*` and `/app/*` fall into the `location /` catch-all and **404 into the mkdocs site** — re-confirmed live three times across S1–S3 (`GET https://knowledge.hi2vi.com/auth/me` → 404 text/html). So the CLI's entire first half (signup/login/project/credential) is unreachable on the hosted host. S5 routes those paths to the API.

But publishing `/auth/*` is a **security event**: `POST /auth/login` is a plain JSON password grant and `POST /auth/signup` is open signup, and there is **no server-side rate limiting anywhere** (verified). The only throttle today is the Next BFF's 5/IP/15min (`web/src/app/api/auth/login/route.ts`), which a direct API call bypasses entirely. Exposure and throttling therefore land **in the same slice** — never apart (D-P13-4). This is the riskiest thing in the phase, which is why it is `high` / `slice-executor-high`.

## The throttle-location decision — settled: server-side, not an nginx zone

DECOMP left this "a deliberate call at its planning turn." It is now made, on three hard facts found this turn:

1. **The nginx zone is untestable by this slice.** `limit_req_zone` lives in nginx, but the local stack has **no nginx** (`compose.yml` = `kb`/`api`/`postgres`; the edge is a separate OCI box). The E2E smoke this slice must ship could never exercise an edge throttle — it would be asserted, never proven.
2. **The edge tree is shared and fragile.** `deploy/knowledge.conf:32,35-40` bans `limit_req_zone` here because zone names are **global across `conf.d/`** and `hi2vi.conf` owns the only one; a duplicate is a hard `nginx -t` failure that blocks the reload for **every site on the edge**. A throttle that can take down unrelated sites on a typo is the wrong place for this control.
3. **In-process is coherent here.** `server/main.py:145` pins a **single uvicorn worker** as a load-bearing invariant — so an in-memory per-IP counter has no cross-worker split-state problem and is exactly correct.

So the throttle is **server-side**, and nginx changes for **routing only** (the minimal, must-happen part). The BFF comment's "nginx at the edge is the real limit (P14)" is superseded — the real limit is now this server-side throttle, in P13.

## What ships

| File | | Guarded? |
|---|---|---|
| `server/auth_api.py` | **EDIT** — an in-process fixed-window per-IP limiter (inlined here, small + auth-specific) gating **`signup` + `login`** only; 429 + `Retry-After` on trip | server/ (already an unmirrored parity issue — editing adds none) |
| `server/config.py` | **EDIT** — `auth_rate_limit()` + `auth_rate_window_s()`, `_env`-driven with lenient production defaults | already a byte-drift file (editing adds no new issue) |
| `deploy/knowledge.conf` | **EDIT** — add `location /auth/` + `location /app/` (mirror `/api/`); rewrite the "frozen contract = `/api/* + /healthz` only" comment to say the contract widened | not guarded |
| `web/src/app/api/auth/login/route.ts` | **EDIT** — one comment: the real limit is now the P13 server-side throttle, not "nginx at the edge (P14)" | not guarded |
| `scripts/cli_smoke.py` | **NEW** — the E2E CLI smoke (beside `onboarding_smoke.py`) | not guarded (scripts/) |

**Parity stays exactly 34** if the limiter is *inlined* in `auth_api.py` (recommended — it is ~30 lines, used only by the two auth routes, and a new `server/ratelimit.py` would legitimately bump the count to 35 as another unmirrored SaaS-pivot server file). Do **not** mirror anything into `plugin/templates/` to "fix" parity — `plugin/` is untouched by decree, and D9 already defers the whole guard. If the executor has a strong reason for a separate module, 35 with **0 cli/ mentions** and the delta being *only* that one new server file is acceptable and honest — but 34 is the clean target.

### The throttle

- Applies to **`POST /auth/signup` and `POST /auth/login` only** — the unauthenticated grant surface. `logout`/`me` carry a bearer; `/app/*` and `/api/*` are bearer-gated; none of them get it.
- **Keyed on the real client IP:** `X-Real-IP` (nginx sets it from the CF-restored real IP, `knowledge.conf:128`), falling back to the first `X-Forwarded-For` hop, then `request.client.host`. Trustworthy because the API container is reachable **only through the edge** (not publicly bound), so the header is always edge-set. Document that assumption at the limiter.
- **In-memory fixed window**, pruned opportunistically and defensively size-capped (an attacker must not grow the dict unbounded). Coherent under the single worker.
- **429 with `Retry-After`**, generic body — must **not** perturb the generic-401 property (unknown-email and wrong-password stay byte-identical; 429 is orthogonal and IP-based, never email-based).
- **Lenient production defaults** (e.g. login ~10 / 15 min, signup ~5 / hour per IP — the executor picks and states them) so a legit agent re-running `init` a few times never trips it, and — critically — **the existing 65-pass suite stays green** (read the limit at call-time so a test that logs in repeatedly doesn't trip a default; if one would, that is the signal the default is too low). Both limits `_env`-overridable so the smoke can force a low value and prove the 429 deterministically.

### nginx routing (authored here, deployed by the operator)

Add two `location` blocks mirroring `/api/` exactly (same `proxy_pass http://$knowledge_upstream:8000`, same timeouts, no per-location `proxy_set_header` — the header-inheritance footgun at `:120-132`). Rewrite the `:134-139` comment honestly: the public contract is now `/api/* + /auth/* + /app/* + /healthz`. **Applying it is operator-only** (`scp` + `ssh … ./deploy.sh` to the OCI box, `:14-24`) — the executor authors the file and validates it as text; it cannot deploy it.

### The E2E CLI smoke (`scripts/cli_smoke.py`)

Style = `onboarding_smoke.py`: argparse, collect-all-failures, `PASS`/exit-1 (`:298-322`). Drives the **installed** `knowledge` binary (subprocess) against `--base-url http://localhost:8766` under a throwaway `XDG_CONFIG_HOME`. Carries S2/S3's hard-won mechanics:

- `uv tool install ./cli --reinstall` (never `--force` — uv reuses the cached wheel).
- `alembic upgrade head` runs **inside** the container (`docker compose exec -T api uv run alembic upgrade head`) — the host has no `DATABASE_URL` route to postgres.
- Any server-log assertion uses `-f <abs compose.yml>` and a positive control (a bare `logs` from the wrong dir silently reads "0", which cost S3 a run).

Lifecycle it must drive and assert: `init` (signup) → `save` → `list` → `search` → `read` (round-trips) → `projects` (empty-state before the first save, present after) → `usage` → `logout` → (`save`/`search` still work on the `vk_`, `usage` fails) → **the throttle**: with the limit forced low via env, hammer `login` past it and assert the CLI surfaces a 429-derived error (not a hang, not a raw body). Clean up as S2/S3 did: `docker compose stop` (never `-v`), `uv tool uninstall knowledge-cli`, throwaway config only — touch nothing in the operator's `~/.config`.

## Verification

Live (required — the slice is not done without it):

```
docker compose up -d postgres api
docker compose exec -T api uv run alembic upgrade head   # container form
uv tool install ./cli --reinstall
python3 scripts/cli_smoke.py --base-url http://localhost:8766   # full lifecycle + the 429 → PASS/exit-1
```
The throttle is proven by the smoke's forced-low-limit run (an in-process limiter with no local nginx is the only testable design — decision above). Also confirm nginx text validity as far as possible without the edge: the file parses and the two new blocks mirror `/api/` (a full `nginx -t` needs the edge's `./validate.sh`, an operator step).

Regressions — the S3 baseline, **with S5's honest deltas called out**:

```
cd cli && uv run pytest -q          # unchanged (S5 touches no CLI code) — 39 passed
uv run pytest -q                    # root: must STAY 65 passed, 12 skipped — the throttle must not trip the suite
python3 scripts/plugin_parity.py    # exactly 34 (limiter inlined), 0 cli/ mentions; 35 only if a new server file, never CLI debt
python3 scripts/workflow.py validate
git status --porcelain              # server/ + deploy/ + web/ + scripts/ + works/ — NO cli/ change, NO plugin/ change
```

Then `result.md`, the `phase.md` cross-slice notes, and the **Doc impact** line — S5 earns the rest of DECOMP's `security.md` (public password grant now throttled server-side; the two-token surface is now internet-facing) and `api.md` (the frozen public contract **widened** to `/auth/* + /app/*`) and `operations.md` (edge routing added; the deploy path) lines. No `doc-new-version` — `P13.REVIEW` consolidates.

## Operator handoff — the gate before `P13.REVIEW`

S5's *code* is complete and committable once the local smoke is green, but the phase's headline — "a user never needs the website" — is only true on the **hosted host**, which needs two operator-only actions the executor cannot perform. After the orchestrator commits S5, it will **STOP before `REVIEW`** and hand the operator this checklist (do-whole-phase halts on operator co-work anyway):

1. **Push `main`** (`cli/` is unpushed; makes the git install form real for S4's guide + ships the throttle to the box). Note: this also turns `plugin-ci.yml` red — the pre-existing D9 parity debt, accepted, and the operator chooses the timing.
2. **Deploy the edge:** `scp deploy/knowledge.conf oracle-cloud:/home/opc/edge/conf.d/knowledge.conf` then `ssh oracle-cloud 'cd /home/opc/edge && ./deploy.sh'` (the `nginx -t`-gated apply).
3. **Verify hosted:** `GET https://knowledge.hi2vi.com/auth/me` now → 401 JSON (not 404 HTML), and one real `knowledge init` against the hosted base end to end.

`P13.REVIEW` runs after the operator confirms the hosted host serves `/auth/*` — that is what lets the review validate the intent on the real target rather than on localhost.
