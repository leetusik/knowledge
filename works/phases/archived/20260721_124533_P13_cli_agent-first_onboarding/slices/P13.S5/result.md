# P13.S5 result — Expose the control plane at the edge + throttle `/auth` + E2E CLI smoke

**Status: done.** The control plane is routed at the edge (authored, not deployed — operator-only), the now-public password grant is throttled server-side, and the full CLI lifecycle + the 429 are proven live against a local stack. Two operator-only actions gate `P13.REVIEW` (push + edge deploy) — see the handoff in `phase.md`.

## What shipped

| File | Change |
|---|---|
| `server/config.py` | `auth_rate_limit()` (default **20**) + `auth_rate_window_s()` (default **900s** = 15 min), `_env`-driven, read per-call. |
| `server/auth_api.py` | An **inlined** in-process fixed-window per-IP limiter gating **`signup` + `login`** only; 429 + `Retry-After` + generic body on trip. |
| `deploy/knowledge.conf` | Added `location /auth/` + `location /app/` mirroring `/api/` exactly; rewrote the "frozen contract = `/api/*` + `/healthz`" routing comment **and** the top "NO rate-limit zone" rationale to say the contract widened and the throttle moved server-side. |
| `web/src/app/api/auth/login/route.ts` | One comment: the real limit is now the P13 **server-side** throttle, not "nginx at the edge (P14)". |
| `scripts/cli_smoke.py` | **NEW** — the E2E CLI smoke (drives the installed `knowledge` binary). |

Parity stayed **exactly 34, 0 cli/ mentions**: I inlined the limiter in `auth_api.py` (an already-unmirrored server file) and edited `config.py` (an already byte-drifted file) — no new server file, so no new issue. No `cli/` or `plugin/` touch.

## The throttle — design and the calls I made

Server-side, in-process, per-IP, fixed-window — exactly as the plan settled. Keyed on `X-Real-IP` (nginx sets it from the CF-restored real IP) → first `X-Forwarded-For` hop → `request.client.host`, keyed per **(IP, route)** so signup and login are independent. The trust assumption (the API is reachable only through the edge, so those headers are always edge-set) is documented at the limiter. The check runs before any credential work and keys off the IP alone, so it never perturbs the generic 401. The whole function does no `await`, so under the single uvicorn worker's event loop it runs atomically — no lock. Memory is bounded: expired windows roll over lazily on access, and a `_RATE_MAX_KEYS=20_000` defensive cap drops expired-then-oldest keys under a distributed flood.

**Deviations from the plan's letter (all deliberate, stated honestly):**

1. **The default is a single shared 20/900s pair, not the plan's example (login ~10/15min, signup ~5/hour).** The plan's *table* specifies one pair (`auth_rate_limit()` + `auth_rate_window_s()`) while its prose *example* gave two different pairs. I honored the table: one config pair, applied to two independent per-route buckets. I set it to **20 per 15 min per IP** because that value is simultaneously (a) lenient — a legit agent re-running `knowledge init` a handful of times never approaches it; (b) a real throttle on the now-public grant (a single IP is hard-capped, and it sits behind Cloudflare's real-IP restore); and (c) **test-safe with margin** — the Postgres-backed accounts suite does ~8 signups from one shared `testclient` IP, comfortably under 20 (verified below). The plan's guidance was "the executor picks and states them" and "if a test trips, the default is too low — raise it, don't weaken the test"; 20 is that raised value.

2. **I did NOT force the limit low via a container env in the live run.** The plan pictured forcing `KB_AUTH_RATE_LIMIT` low so the smoke proves the 429 with few requests. But getting an env into the running `api` **container** requires editing `compose.yml` (to interpolate the var into the api service), and `compose.yml` is (a) **outside this slice's stated git-status scope** (`server/ + deploy/ + web/ + scripts/ + works/`) and (b) a plugin-parity byte-drift file. So I left `compose.yml` alone. Instead I proved the 429 by **hammering the real production default (20)** through the CLI on a fresh stack — deterministic in ~21 login calls (~seconds) — which is arguably a stronger test (it proves the *actual configured* threshold, not an artificial one). The `_env` override seam still exists and is verified (`KB_AUTH_RATE_LIMIT=3` → `auth_rate_limit()==3`, `=0` → disabled). If the operator wants to tune the limit **on the box**, they add `KB_AUTH_RATE_LIMIT`/`KB_AUTH_RATE_WINDOW_S` to `compose.prod.yml`'s api env — a small ops follow-up, not required for the default to be safe.

3. **I updated the top `# --- NO rate-limit zone here ---` note as well as the `:134-139` routing comment.** The plan named the routing comment; I also corrected the top note because its old justification ("This API needs none anyway: every /api/* call is bearer-gated … single known consumer") became **false** the moment `/auth/*` — an unauthenticated grant — is published. The `NO limit_req_zone` house rule itself is untouched; only its now-stale rationale was corrected to point at the server-side limiter.

## Live E2E — required, and what it actually proved

Stack up (`docker compose up -d postgres api`), migrated in-container (`docker compose exec -T api uv run alembic upgrade head` — the host has no `DATABASE_URL` route to postgres), CLI installed (`uv tool install ./cli --reinstall`). Confirmed `/auth/me` returns **401 JSON** locally (control plane routed) before running the smoke.

```
python3 scripts/cli_smoke.py --base-url http://localhost:8766
PASS — CLI onboarded cli-smoke+<hex>@example.com (project cli-smoke, doc 14);
       lifecycle + logout-survival + 429 throttle verified
```

The smoke drove, all green, the installed binary under a throwaway `XDG_CONFIG_HOME`: `init` (signup → project → mint `vk_` → config seam, **0600**, `api.token=vk_…`, resolves configured) → `projects` empty-state → `save` → `list` → `search` (found by unique token) → `read` (**byte-for-byte round-trip**) → `projects` present → `usage` (live) → `logout` → post-logout **`save`/`search` still work on the `vk_`** while **`usage` fails** (the two-token model, from the terminal) → the throttle.

**The 429, shown tripping — not claimed.** Two independent demonstrations:

- *Post-smoke (window saturated by the smoke's own hammer):* a raw `POST /auth/login` returned `HTTP/1.1 429`, `retry-after: 869`, body `{"detail":"too many requests — please retry later"}` — proving the counter persists across the 15-min window.
- *Fresh window (after `docker compose restart api` reset the in-process state):* hammering `POST /auth/login` from one host IP produced **401 for the first 20 requests, then 429** (I did 2 enumeration-safety probes first, so the visible hammer showed `1:401 … 18:401 19:429 …`; 2 + 18 = the 20th 401, and the **21st login request is the first throttled** → the limit is exactly 20). The tripping 429 carried `retry-after: 899` and the generic body.

**Generic-401 preserved, verified live and byte-for-byte:** an unknown email and a real account with a wrong password both answered `{"detail":"invalid email or password"}` — identical. The throttle is IP-based and sits in front of the credential check, so it never leaked which was wrong. Through the CLI, both surface the identical `error: login failed: invalid email or password`, and the 429 surfaces as a clean `error: HTTP 429: too many requests — please retry later` (no hang, no raw body).

**Per-path independence confirmed live:** the `real-evidence@example.com` signup (path `/auth/signup`) did not consume any of the `/auth/login` window — the login hammer still got its full 20 before tripping.

**Throttle does not trip the suite:** the Postgres-backed accounts suite (which the host run skips, no DB route) ran **inside the container** with the throttle at its default 20 — `8 passed`. So the ~8 signups from the shared `testclient` IP stay under the limit.

Cleanup as S2/S3: `docker compose stop` (never `-v` — pgdata preserved), `uv tool uninstall knowledge-cli`, throwaway config + work dirs removed by the smoke. Verified **no `~/.config/knowledge-kb`** was created (operator config untouched). Throwaway tenants/docs remain in the local pgdata + SQLite — expected, and the reason `-v` is never used.

## Validation summary

| Command | Result |
|---|---|
| `python3 scripts/cli_smoke.py --base-url http://localhost:8766` | **PASS** (exit 0) — full lifecycle + 429 |
| raw `curl` login hammer (fresh window) | 20×401 then 429 + `Retry-After` + generic body |
| generic-401 identity (curl, unknown vs wrong) | byte-identical `invalid email or password` |
| `uv run pytest -q` (root, host) | **65 passed, 12 skipped** (unchanged) |
| `cd cli && uv run pytest -q` | **39 passed** (unchanged — no CLI code touched) |
| DB auth suite in-container (throttle live) | **8 passed** (throttle does not trip it) |
| `python3 scripts/plugin_parity.py` | exit 1, **34 issues, 0 cli/** (unchanged) |
| `python3 scripts/workflow.py validate` | passed |
| `git status --porcelain` (code) | only `server/ deploy/ web/ scripts/` — no `cli/`, no `plugin/` |

**nginx:** validated as text (braces balanced 7/7; `/auth/`, `/app/`, `/api/` all proxy `http://$knowledge_upstream:8000` with `proxy_connect_timeout 5s` + `proxy_read_timeout 120s` and **no per-location `proxy_set_header`**). No `nginx -t` locally — no nginx binary; a real parse is the operator's `./validate.sh`/`./deploy.sh` on the edge.

## Doc impact

Appended one `P13.S5` line to `phase.md`'s Doc impact list (security.md / api.md / operations.md). No `doc-new-version` — `P13.REVIEW` consolidates.
