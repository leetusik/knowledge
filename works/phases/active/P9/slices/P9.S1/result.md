# P9.S1 result — Self-host the web UI + retire Pages

**Verdict: done.** Authored + locally validated the six artifacts that self-host the mkdocs web UI on the
box and retire GitHub Pages for this repo's site. **No production impact** — no box SSH, no edge reload,
no `docker compose up`. The production cutover is S5.

## Files changed (6)

1. **`compose.prod.yml`** — added the `site` live-serve viewer service and repointed `KB_PUBLIC_BASE_URL`.
   - New service (key `site`): `image: squidfunk/mkdocs-material:9.7.6`, `container_name: knowledge-site`,
     `command: serve --dev-addr=0.0.0.0:8000 --livereload`, `volumes: [ .:/docs ]`,
     `networks: [ changple_shared_network ]`, **no host `ports:`**, `restart: unless-stopped`, and a python
     healthcheck (`urllib.request.urlopen('http://127.0.0.1:8000/', timeout=3)` → 200) with
     `interval 30s / timeout 5s / retries 3 / start_period 40s`.
   - `KB_PUBLIC_BASE_URL: https://leetusik.github.io/knowledge` → `https://knowledge.hi2vi.com` (no trailing
     slash; `config.py` rstrips). No server code touched.
   - Refreshed the now-stale file header comment ("ships ONLY the api service … the public site is GitHub
     Pages" → "ships TWO services: `api` + `site` (self-hosted viewer, P9.S1)").
2. **`deploy/knowledge.conf`** — split the single `location /` into three, hoisting shared headers.
   - Added `set $knowledge_site_upstream knowledge-site;` beside the api upstream var.
   - `location /api/` + `location = /healthz` → `$knowledge_upstream` (each keeps `proxy_connect_timeout 5s`
     + `proxy_read_timeout 120s`); `location /` → `$knowledge_site_upstream` (the mkdocs viewer).
   - **Header-inheritance footgun handled:** hoisted the shared `proxy_set_header` (Host / X-Real-IP /
     X-Forwarded-For / X-Forwarded-Proto) + `proxy_http_version 1.1` + `proxy_set_header Connection ""` to
     **server level**, so every `location` (setting no header of its own) inherits the full set.
   - Skipped the livereload websocket `Upgrade`/`Connection` headers (cosmetic per §B). Kept
     `client_max_body_size 5m`, `resolver`, real-IP, HSTS at server level. Refreshed the file header comment.
3. **`mkdocs.yml`** — `site_url` line 2 → `https://knowledge.hi2vi.com/` (root, trailing slash).
4. **`plugin/templates/params.operator.json`** — `KB_SITE_URL` → `https://knowledge.hi2vi.com/`, byte-exact
   to `mkdocs.yml` `site_url` (keeps the `parameterized` render-and-compare green).
5. **`.github/workflows/pages.yml`** — retired the Pages deploy, **kept** the site-build CI guard. Removed
   the `deploy` job, the `upload-pages-artifact` step, the `pages: write` + `id-token: write` permissions,
   and `concurrency: group: pages`. Kept the `build` job on `push:[main]` + `workflow_dispatch` (checkout →
   setup-python → `pip install mkdocs-material==9.7.6` → `mkdocs build` → `python3 scripts/site_smoke.py`).
   Kept the **filename** (site_smoke pin-parity reads it) and the pin line; renamed `name:` → `site build`.
6. **`plugin/templates/manifest.json`** — removed `".github/workflows/pages.yml"` from `files.identical`
   (last entry) and dropped the now-dangling comma after `".dockerignore"`. `pages.yml` is now
   parity-unmanaged (no other manifest class; `.github/workflows` is not a `shipped_dir`), so the
   neutralized repo copy and the untouched plugin template may legitimately diverge (downstream keeps Pages).

## Validation (all local — no box access)

| Check | Command | Result |
|---|---|---|
| Plugin parity | `python3 scripts/plugin_parity.py` | **PASS** — "plugin templates are in parity with the repo" (mkdocs.yml `parameterized` parity holds via updated `params.operator.json`; `pages.yml` no longer `identical`). |
| Site build | `docker compose run --rm kb build` | **OK** — "Documentation built in 0.55 seconds" (the MkDocs-2.0 banner is an upstream advisory, not an error). |
| Site smoke | `python3 scripts/site_smoke.py` | **PASS** — "all site invariants hold" (pin-parity read still finds `mkdocs-material==9.7.6` in `pages.yml` matching `compose.yml`). |
| Compose config | `docker compose -f compose.prod.yml config` (dummy `.env` with `KB_API_TOKEN=x`) | **PASS (exit 0)** — asserted via `--format json`: `site` has **no** `ports`, is on `changple_shared_network`, `container_name: knowledge-site`, `command: [serve, --dev-addr=0.0.0.0:8000, --livereload]`, healthcheck `start_period 40s`, `restart: unless-stopped`; `api.KB_PUBLIC_BASE_URL = https://knowledge.hi2vi.com`. |
| Vhost syntax | throwaway `nginx:alpine` `nginx -t` (dummy self-signed certs, `http{}` wrapper including only this vhost) | **PASS** — "configuration file test is successful". Isolated (this vhost only); the real cross-tree `nginx -t` + graceful reload over the full conf.d/ tree is S2's edge-re-apply / S5's on-box gate. |
| House rules | grep `deploy/knowledge.conf` | **PASS** — no `default_server`, no IPv6 `listen [::]`, no `limit_req_zone` (the only grep hits are the header house-rule doc comments). Three locations: `/api/`, `= /healthz`, `/`. |
| Stray old URL | grep `leetusik.github.io` across the 6 changed files | **PASS** — none (docs/current/* deliberately untouched — REVIEW's job). |

Dummy `.env` and the built `site/` (both gitignored) were removed after validation; the worktree holds only
the six tracked edits (plus the orchestrator's pre-existing `works/*` state changes, which are not mine).

## Deviations from plan.md

- **`pages.yml` neutralization mechanism (a refinement the plan explicitly requested I record).** The
  originally-approved §C wording was "neutralize (drop only the `push:` trigger)". The plan.md refined this
  to "remove the deploy job/step/permissions but KEEP the build guard + the pin line + the filename," and I
  implemented that refinement: I **removed the Pages deploy** and **kept** the `build` job on
  `push:[main]` + `workflow_dispatch`. This retires Pages **and** preserves the site-build CI guard
  (dropping the `push` trigger would have lost it). This is the plan's own instruction, not a departure from
  it — flagged here per the plan's request.
- Otherwise **none** — implemented §A/§B/§C and both operator decisions as written.

Additional (non-plan-mandated) hygiene: refreshed the now-inaccurate header comments in `compose.prod.yml`
and `deploy/knowledge.conf` so those files describe the two-service reality. Comment-only; no behavior change.

## Doc impact (appended to `phase.md`, not versioned this slice)

Durable truth changed (site now self-hosted live-serve, not Pages; 201 `url` origin now
`https://knowledge.hi2vi.com` root; two-location edge routing; Pages retired via manifest reclassification).
The `DECOMP`-seeded "Doc impact" list already names the affected docs (`operations.md`, `architecture.md`,
`api.md`, `security.md`, `decisions.md`, `deploy/README.md`); I appended a one-line S1-realized note under it.
Per the once-per-phase rule, **no docs were versioned** — `P9.REVIEW` consolidates.
