# P9.S1 — Self-host the web UI + retire Pages

**You are `slice-executor-high`.** Implement this slice against the signed-off design (`phase.md`
§A/§B/§C + the four operator decisions). This slice **authors + locally validates** the artifacts;
the **production cutover** (edge reload, containers up on the box) happens at **S5** via the deploy —
so **do not** touch the box, reload the edge, or bring up any container here. No production impact.

**Confirmed operator decisions baked in:** Pages = **reclassify + neutralize**; URLs → `knowledge.hi2vi.com`
**root** (drop `/knowledge/`).

## Read first
`phase.md` (§A/§B/§C + Constraints), then the exact files below. Ground every edit against current content.

## Changes

### 1. `compose.prod.yml` — add the live-serve viewer + repoint the public URL
- Add a viewer service mirroring local `compose.yml`'s `kb` (verified there): service key `site`,
  `image: squidfunk/mkdocs-material:9.7.6`, `container_name: knowledge-site` (the edge proxies by name),
  `command: serve --dev-addr=0.0.0.0:8000 --livereload` (**`--livereload` is load-bearing** — §A/§H;
  without it new pages don't appear until restart), `volumes: [ .:/docs ]` (same box clone the api mounts),
  `networks: [ changple_shared_network ]` (external; **no host `ports:`**), `restart: unless-stopped`, and a
  **healthcheck** mirroring the api's (image has no curl — use `python -c "import urllib.request,sys;
  sys.exit(0) if urllib.request.urlopen('http://127.0.0.1:8000/', timeout=3).status==200 else sys.exit(1)"`,
  `interval 30s`, `timeout 5s`, `retries 3`, `start_period ~40s`).
- Change `KB_PUBLIC_BASE_URL: https://leetusik.github.io/knowledge` (line 51) →
  `KB_PUBLIC_BASE_URL: https://knowledge.hi2vi.com` (no trailing slash; `config.py` rstrips). No server
  code change (`server/config.py`/`main.py` are plugin-`identical`).

### 2. `deploy/knowledge.conf` — split the single `location /` into two upstreams
- Next to `set $knowledge_upstream knowledge-api;` add `set $knowledge_site_upstream knowledge-site;`.
- Replace the one `location / { proxy_pass http://$knowledge_upstream:8000; … proxy_read_timeout 120s; }`
  with three:
  - `location /api/ { proxy_pass http://$knowledge_upstream:8000; … proxy_read_timeout 120s; }` (api; keep the write timeout),
  - `location = /healthz { proxy_pass http://$knowledge_upstream:8000; … }` (api healthz),
  - `location / { proxy_pass http://$knowledge_site_upstream:8000; … }` (the mkdocs viewer).
- **nginx correctness:** exact `= /healthz` and prefix `/api/` both beat the catch-all `/`, so routing is
  api for `/api/*` + `/healthz`, site for everything else. **Header-inheritance footgun:** a `location`
  that sets *any* `proxy_set_header` inherits **none** from the server — so **hoist** the shared
  `proxy_set_header` (Host / X-Real-IP / X-Forwarded-For / X-Forwarded-Proto) + `proxy_http_version 1.1`
  + `proxy_set_header Connection ""` to **server level** (cleanest), leaving each `location` with just
  `proxy_pass` (+ the api locations' `proxy_read_timeout 120s`, `proxy_connect_timeout 5s`). Keep
  `client_max_body_size 5m`, `resolver`, real-IP, HSTS at server level (unchanged).
- Minor: FastAPI's `/docs`,`/openapi.json`,`/redoc` now route to the site (404 there). The frozen consumer
  contract is `/api/*` + `/healthz` only, so **leave it** (don't add openapi routing unless asked).
- **Skip** the mkdocs livereload websocket `Upgrade`/`Connection` headers — cosmetic (server-side rebuild
  works regardless; §B); keeping the hoisted `Connection ""` is correct for the proxy.

### 3. `mkdocs.yml` — site_url to the domain root
- Line 2: `site_url: https://leetusik.github.io/knowledge/` → `site_url: https://knowledge.hi2vi.com/`
  (root — this is what makes `mkdocs serve` answer at `/`, matching the edge `location /` and the §1 healthcheck).

### 4. `plugin/templates/params.operator.json` — keep plugin-parity green
- `"KB_SITE_URL": "https://leetusik.github.io/knowledge/"` → `"https://knowledge.hi2vi.com/"` — **must match
  `mkdocs.yml` site_url exactly** (`mkdocs.yml` is `parameterized`; `plugin_parity.py` renders the template
  with these params and byte-compares to repo `mkdocs.yml`).

### 5. `.github/workflows/pages.yml` — retire the Pages deploy, KEEP the site-build CI guard
- **Remove the Pages deploy:** delete the `deploy` job, the `actions/upload-pages-artifact` step, the
  `pages: write` + `id-token: write` permissions, and `concurrency: group: pages`.
- **Keep the `build` job** on `push: [main]` + `workflow_dispatch` (checkout, setup-python,
  `pip install mkdocs-material==9.7.6`, `mkdocs build`, `python3 scripts/site_smoke.py`) — this preserves
  the site-build CI guard (catches a broken build/site_smoke *before* it reaches the box's live-serve).
- **Keep the filename** `.github/workflows/pages.yml` (`site_smoke.py:147-160` reads that exact path for
  pin-parity) and the `pip install mkdocs-material==9.7.6` line (the pin it checks). You may change the
  `name:` field (e.g. `name: site build`).
- _Refinement of the approved "drop the push trigger": removing the deploy while keeping the build guard
  retires Pages **and** preserves CI (dropping the trigger would lose it). Note it in `result.md`._

### 6. `plugin/templates/manifest.json` — reclassify `pages.yml` out of `identical`
- Remove `".github/workflows/pages.yml"` from `files.identical` (it is the **last** entry — also drop the
  trailing comma now dangling after `".dockerignore"` to keep valid JSON). `pages.yml` is in no other
  manifest class and `.github/workflows` is not a `shipped_dir`, so it becomes parity-unmanaged — the repo's
  neutralized copy and the plugin template's (still-Pages) copy may legitimately diverge. The template
  (`plugin/templates/kb/.github/workflows/pages.yml`) stays **untouched** → downstream plugin users keep Pages.

## Validation (all local — no box access)
- `python3 scripts/plugin_parity.py` → passes (mkdocs.yml `parameterized` parity holds via the updated
  `params.operator.json`; `pages.yml` no longer `identical`).
- Build the site + smoke: `docker compose run --rm kb build` (or a local `mkdocs build`) then
  `python3 scripts/site_smoke.py` → passes (built-site invariants + the pin-parity read still find the pin).
- `docker compose -f compose.prod.yml config` parses (a dummy `.env` with `KB_API_TOKEN=x` present) and shows
  `knowledge-site` with `container_name`, healthcheck, on `changple_shared_network`, **no host port**.
- nginx: the real `nginx -t` + reload is on-box at S5; here, syntax-check the vhost if a local nginx/throwaway
  container is available, else review the location split carefully against the house rules (no `default_server`,
  no IPv6 `listen`, no `limit_req_zone`).
- Grep the **changed** files for a stray `leetusik.github.io` (docs rewording is REVIEW's job — do **not**
  touch `docs/current/*` here).

## Constraints
- Author + local-validate ONLY — no box SSH, no edge reload, no `docker compose up`. Cutover is S5.
- Do not version docs (append a one-line Doc-impact note to `phase.md` if durable truth changed — the
  doc rewording is consolidated at REVIEW). Append S1 findings to `phase.md` Findings & Notes.
- Never commit, never transition status (the orchestrator does both).

## Verdict
Return `done` with the files changed + validation results (plugin_parity, site_smoke, compose config), or
`escalate` with findings if something is beyond depth / the design doesn't hold against the real files.
