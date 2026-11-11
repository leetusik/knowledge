# P41-sr.X1 — result (Span 1: the pre-flight; Span 2: the part-size fix and the production record)

## Verdict

- **status:** needs_operator (Stop C)
- **route:** high
- **model:** opus
- **effort:** xhigh
- **summary:** Listen runs on production. The operator's Listen played ("Voice comes well"), the Mac runner rendered
  four parts at RTF 0.46–0.47 with no failure, and a part is served through the edge with Range (`206`, `416` past
  the end) and is never cached by Cloudflare (`DYNAMIC`). Part 3 came within 3,430 bytes of the 4 MiB upload cap,
  so Span 2 raises `listen_max_part_bytes()`'s default to 16 MiB, under the edge's `20m`. Stop C ships that fix.
- **Span 1, in a line:** the pre-flight passed every whole-tree gate (root pytest 250 passed with Postgres, web
  vitest 602, lint, tsc, `next build`, both parity checks, `plugin validate`, `nginx -t`), and found that Production
  Deploy migrates `0007` in-line, so Stop A had no hand-run migration → § Pre-flight, § Runbook, § Stop A, as run.
- **files_changed (Span 2):**
  - `server/config.py`, `plugin/templates/kb/server/config.py`: the default and the docstring, byte-identical;
  - `works/phases/active/P41-sr/slices/P41-sr.X1/result.md` (this file).

  No test names the cap, so no test changed. Span 1 changed only this file.
- **validation (Span 2):**
  - `uv run pytest -q tests/test_listen.py tests/test_listen_play.py` with no DSN: **2 passed, 4 skipped** (the four
    Postgres route tests). Then with a disposable `postgres:17` (`p41-x1s2-pg`, 127.0.0.1:55452,
    `KB_TEST_DATABASE_URL`): **6 passed, 0 skipped**. The container and its volume were removed after;
  - `cmp server/config.py plugin/templates/kb/server/config.py`: **identical**;
  - `uv run python scripts/plugin_parity.py`: **PASS, exit 0**;
  - `git diff --stat`: the product files are the two config files only, `+5 −2` each. The other modified paths
    (`works/backlog.md`, `works/events.jsonl`, `phase.md`, X1's `slice.json`, `works/state.json`) were already
    modified at dispatch: the orchestrator's state;
  - `python3 scripts/workflow.py validate`: **passed**, with only the warnings that were already there.
- **deviations (Span 2):** 4, listed in § Deviations → Span 2. The main one: the plan's "about 4× headroom at +50 %"
  is 3.0× when measured; the 16 MiB choice stands.
- **doc_impact:** none written to `phase.md`. The span's set excludes it, so the line is under `notebook` → Doc
  impact.
- **notebook:**
  - **Decisions** (append):
    - `**Part upload cap (X1):** KB_LISTEN_MAX_PART_BYTES defaults to 16 MiB (was B1's 4 MiB): on production, part 3 was 4,190,874 B, 3,430 B under 4 MiB, because speech ran 19 % past its length estimate at ~6.19 KB/s; 16 MiB holds ~45 min and stays under the edge's client_max_body_size 20m; the part length cap (600 s) is unchanged → slices/P41-sr.X1/result.md § The part-size defect and fix`
  - **Notes for later slices:**
    - remove `(from P41-sr.B3, for P41-sr.X1)` (entry 9 at dispatch): consumed, the runner is installed;
    - replace `(from P41-sr.X1, for X1 Span 2, P41-sr.REVIEW)` (entry 14 at dispatch) with:
      `**(from P41-sr.X1, for P41-sr.REVIEW)** The operator's signed-in Range snippet on production gave 206 / 416 / HEAD 200, accept-ranges bytes, no content-encoding on parts, cf-cache-status DYNAMIC. Its first form found no playlist (resource-timing discovery), and the revised form clears the buffer and waits for hls.js's next playlist reload → slices/P41-sr.X1/result.md § Production check, § For the review`
    - append:
      `**(from P41-sr.X1, for P41-sr.REVIEW)** The first part's wait: about 5 min before anything plays (claim → upload 4 min 57 s on production), because part 1 is a full ~10-min part rendered at RTF ≈ 0.46. A short first part would start playback in under a minute. A candidate finding or deferred job, not fixed in X1 → slices/P41-sr.X1/result.md § For the review`
  - **Doc impact** (append):
    - `- operations.md (and security.md's upload line): the Listen part upload cap is 16 MiB (KB_LISTEN_MAX_PART_BYTES default, was 4 MiB), under the edge's client_max_body_size 20m, and supersedes the "4 MiB" in B1's security.md line and B2's operations.md line; production measured 6.19 KB/s, ~0.37 MB per spoken minute (~22 MB an hour), and speech up to 19 % over the length estimate (P41-sr.X1)`
  - **Operator Questions:** none.
  - **Now** (replace):
    - `X1 Span 2 done: Listen plays on production (Range 206/416, DYNAMIC; 4 parts at RTF 0.46–0.47), and part 3 came 3,430 B under the 4 MiB cap, so the default is now 16 MiB (server/config.py + template). WAITING ON OPERATOR: Stop C (push, Production Deploy, Try again if a part was refused); df -h /opt/knowledge still owed. Then REVIEW.`
- **operator_need:** Stop C, word for word:

  > **Stop C: ship the part-size fix.**
  > 1. `! git push origin main`, after the orchestrator commits the fix;
  > 2. `! gh workflow run deploy-production.yml --ref main`;
  > 3. if part 4 or a later part was refused meanwhile, press **Try again** on that document after the deploy is
  >    green.

  Separately, still owed from Stop A: the box's `df -h /opt/knowledge` (§ Production check → Free disk).

## Pre-flight

### 1. What ships

- `git fetch origin`. Then `origin/main..main` is **41 commits**, and `main..origin/main` is 0, so the push is a
  fast-forward. `origin/main` is `b1eb6484` (2026-11-09).
- The push carries more than P41-sr. P40-2t's merged run also goes (`c1e3914e` … `559261c8`, `b668d582`). So the push
  **releases plugin 0.10.0 → 0.12.0** in `.claude-plugin/marketplace.json` and `plugin/.claude-plugin/plugin.json`:
  P40-2t.S6's 0.11.0 plus G1's 0.12.0. The deploy then serves the new `web/public/SKILL.md`.
- 310 files, +41,973 −502. The product files are:
  - `alembic/versions/0007_listen.py`;
  - `server/listen*.py`, `spoken.py`, `config.py`, `gitops.py`, `main.py` and `persistence/models.py`;
  - `deploy/knowledge.conf`;
  - the web player, the two BFF relays and `hls.js` 1.7.4;
  - `tools/listen-runner/`;
  - the plugin template mirror and the tests.

**The scan** (counts and paths, never values):

| Check | Result |
|---|---|
| Audio files | 2, both B2's fixture. `tests/fixtures/listen/part.m4a` and its byte-identical template mirror `plugin/templates/kb/tests/fixtures/listen/part.m4a` (same sha1). **6,503 bytes** each, AAC 44.1 kHz mono, 7.0 s: a 0.52 s tone, then 6.5 s of silence (`silencedetect`). The mirror sits outside `tests/fixtures/listen/` only because it is the parity copy. |
| `.cache/` paths | 0 |
| `.env` files | 0. `tools/listen-runner/env.example` only, with empty values. `tools/listen-runner/.env` is ignored (`.gitignore:17`). |
| `vk_[A-Za-z0-9]{8,}` | 0 |
| `SESSION_SECRET=` | 0 |
| Private-key headers | 0 |
| Also checked: `hf_…`, `sk-…`, `gh?_…`, `AKIA…`, `xox?-`, `*KEY/SECRET/TOKEN/PASSWORD=<value>` | 0 each |
| Bare `vk_` mentions | 56 (`vk_` or `vk_...`) in prose and code. All are prefixes, none is a value. |
| Private excerpt text | 0. R5's leak checker (`.cache/p41-voices/models/_bench/r5_leak_check.py`) ran over all 308 changed text files: `TOTAL 0` excerpt n-grams. The fixtures are synthetic. The design round states "No voice names, keys, accounts or private text" (`docs/reference/design/jobs/11-listen/rounds/01-listen/result.md:146`). |
| Voice samples | 0 (the only audio is the fixture above) |
| `UPDATE_REQUIRED.md` | untracked, not in the diff, untouched |
| Web lockfile | pnpm 10.28.2 (the image's version, `web/Dockerfile:17`) ran `install --frozen-lockfile --lockfile-only` on a scratch copy and **passed**. So the image's `pnpm install --frozen-lockfile` (`web/Dockerfile:19`) accepts `hls.js@1.7.4`. |

### 2. The whole-tree gates

| Gate | Result |
|---|---|
| Root `uv run pytest -q`, Postgres live (`postgres:17` as `p41-x1-pg` on 127.0.0.1:55451, `KB_TEST_DATABASE_URL` set) | **250 passed, 0 skipped**, 1 warning (Starlette's httpx deprecation), 21.3 s |
| Alembic on scratch `kb_mig` | `upgrade head`: 0001 → 0007, all seven. `downgrade -1` → `0006_reader_state`, with 0 `listen_%` tables. `upgrade head` → `0007_listen (head)`, with the five tables `listen_jobs`, `listen_parts`, `listen_positions`, `listen_runners`, `listen_units`. **All clean.** |
| `cd tools/listen-runner && uv run pytest -q` | **3 passed** |
| `pnpm vitest run` | **43 files, 602 tests passed** |
| `pnpm lint` | **exit 0** |
| `pnpm exec tsc --noEmit` | **exit 0**, no output |
| Production build | Built in a scratch APFS clone (`cp -Rc` per top-level entry of `web/`, without `.next`, `.env.local` and `tsconfig.tsbuildinfo`). `pnpm exec next build`: **exit 0**. Next 16.2.10, 31 routes, including `ƒ /api/listen/play/[...path]` and `ƒ /api/listen/position`. Never built into `web/.next`. `:3030` was left running (PID 8452). |
| `uv run python scripts/plugin_parity.py` | **PASS**, exit 0. Also with system `python3`, as `plugin-ci.yml:24` runs it: **PASS**. |
| `python3 scripts/skills_parity.py` | **PASS**, exit 0 |
| `claude plugin validate plugin` | **Validation passed.** One plugin-directory warning, `ICON_MISSING`, which the validator says does not change the result. `claude plugin validate .` (the marketplace manifest): **passed**. |
| `nginx -t` | **ok** (§4) |
| `python3 scripts/workflow.py validate` | **passed**. The warnings were already there: consolidation owed, stale docs, oversized doc sections. |
| Not run | The mkdocs site build (`pages.yml`). It is not on the plan's list, and the push runs it in CI. |

No gate failed.

### 3. The migration order

**The deploy migrates by itself.** `deploy/deploy.sh` has applied migrations in-line since P25 (`313beafa`,
`d3afbbe6`, 2026-08-07):

| Step | Where |
|---|---|
| Reconcile the box clone (one-shot api container) | `deploy/deploy.sh:313-321` |
| `dc build` | `deploy/deploy.sh:329` |
| Postgres up and healthy | `deploy/deploy.sh:335-336` |
| **`dc run --rm -T --no-deps --name knowledge-migrate-$$ --entrypoint sh api -c 'cd /repo && alembic upgrade head'`** | `deploy/deploy.sh:349-355` |
| Force-recreate the api, health-gate it | `deploy/deploy.sh:366-370` |
| Recreate web and mcp | `deploy/deploy.sh:377` |
| Gate web and mcp, assert the api is fresh | `deploy/deploy.sh:380-393` |

The lifecycle comment is at `deploy/deploy.sh:60-86`. The migration step **fails closed**: an error dies before the
api is recreated, and the old api keeps serving. Two things follow:
- **The order is pinned by the deploy itself.** A hand-run `upgrade head` before the deploy is a no-op, because the
  box clone holds only the old revisions until the reconcile. After the deploy it is a no-op too. "Migrate first"
  and "deploy first" both collapse into **dispatch the deploy**, with `alembic current` before and after.
- **The repo's written record is stale.** `docs/current/operations.md:121,130,139` say "Production Deploy runs
  **no** alembic", and `deploy/README.md` §6 step 3 describes `up -d --build`. Both predate P25. This is a Doc impact
  line. B1's own note ("0007_listen runs in the deploy's alembic step") was right.

**Checked against `compose.prod.yml`:**
- The service is `api` (`:21`), the container `knowledge-api`.
- `alembic` is on PATH: deps are installed with `uv pip install --system` (`Dockerfile:31-33`), and alembic is in
  `pyproject.toml:13`.
- `WORKDIR /repo` (`Dockerfile:43`) holds `alembic.ini` through the bind mount `.:/repo` (`compose.prod.yml:28-29`).
- `DATABASE_URL` uses the psycopg form (`compose.prod.yml:90`).
- So the read-only check `docker compose -f compose.prod.yml exec -T api sh -c 'cd /repo && alembic current'` works
  on the running api, in deploy.sh's own form.

**Old code, new schema.** This window is real: the old api serves on the migrated schema between step 2b and the
recreate, for seconds to a minute.
- `0007` is **purely additive**. `upgrade()` only runs `create_table` five times and `create_index` five times
  (`alembic/versions/0007_listen.py:68-201`). It does not alter any existing table.
- Its foreign keys to `tenants`, `users` and `project_credentials` take a brief lock on those tables inside the
  migration's transaction. That is milliseconds on small tables.
- The old code knows nothing of the five tables. It is **safe, as `0004` was.**

**New code, old schema.** In the normal path this never happens to the api, because the migration runs before the
recreate. It can happen only if the migration fails *and* the api restarts before a fix-forward, since the
bind-mounted `server/` is already new. In that case:
- **The API's startup and reindex:**
  - `lifespan` (`server/main.py:73-103`) runs `get_tenant_one_id` and the reindex;
  - the reindex walks only `.md` and `.html` files (`server/reindex.py:429`);
  - the only Listen addition to `main.py` is three `include_router` lines (`server/main.py:178-183`);
  - so no Listen table is touched.
- **The reader routes:** only `server/listen_jobs.py`, `listen_api.py`, `listen_play.py`, `persistence/models.py`
  and `main.py` reference a Listen table (grep over `server/`). No non-Listen route reads one.
- **The web reader's seed degrades to no Listen:**
  - `readListenState` (`web/src/lib/listen/seed.ts:21-31`) wraps `getJson`;
  - `getJson` throws on any non-2xx (`web/src/lib/knowledge/client.ts:82`);
  - `readListenState` catches that and returns `null`;
  - so a 500 (`UndefinedTable`) from `/app/listen/state` means "no Listen", never a failed page;
  - this covers all four callers: `[slug]/page.tsx:222`, the chapter page `:145`, the book page `:75` and
    `documents/[id]/page.tsx:170`.
- **`/healthz`** (`server/main.py:334-341`) reads the SQLite content plane.
- **The deploy's health gate** is the containers' healthchecks: the api's `/healthz` (`compose.prod.yml:132-144`)
  and the web's `fetch('/')` (`compose.prod.yml:189-195`). Neither touches Listen.
- Only Listen's own routes would 500.

**Production's current head.** It is unknown here, and the doc records `0004`.
- A plain public GET shows production serves P30.S8's reader API: `GET /app/reader/continue` → `401
  {"detail":"Unauthorized"}`.
- Every deploy since P25 migrates before the api restarts.
- So **`0006_reader_state` is expected**. The operator confirms it at Stop A.
- If the head is older, `upgrade head` also runs:
  - `0005`, which adds the nullable `tenants.slug` plus a unique constraint (`0005_tenant_slug.py:40-41`);
  - and/or `0006`, which only creates seven tables.

  Both are additive and safe for the old code. They run in order inside the same deploy step.

### 4. The edge and the deploy chain

- **The edge is re-applied.** `deploy/oracle-production-deploy-remote.sh:79-91` installs `deploy/knowledge.conf`
  into `/home/opc/edge/conf.d/`. The edge's own `./deploy.sh` then runs the `nginx -t` gate and a graceful reload.
  This runs only after the healthy deploy (`:136-141`), and a failed `nginx -t` fails the run loudly.
- **Both services serve new code:**
  - `knowledge-web` is rebuilt (`deploy.sh:329`), recreated on the new image (`:377`) and gated (`:381`);
  - the api is force-recreated (`:366`), and `assert_api_fresh` proves it (`:171-181`, `:388`).
- **`nginx -t` was run locally:**
  - the conf in a throwaway `nginx:1.27-alpine`, with a fresh self-signed certificate at its certificate paths:
    "syntax is ok", "test is successful";
  - then a **routing run**: the same conf served on a throwaway Docker network, with stub upstreams aliased
    `knowledge-api`, `knowledge-web` and `knowledge-mcp`;
  - routed to **web**: `/api/listen/play/x/playlist.m3u8`, `HEAD /api/listen/play/<unit>/3.m4a`,
    `/api/listen/play/timeline`, `POST /api/listen/position`, `/api/auth/login`, `/api/documents/1/raw` and
    `/library`;
  - routed to **api**: `POST /api/listen/positions`, `POST /api/listen/jobs/claim`, `PUT /api/listen/parts/abc`,
    `/app/listen/state`, `/app/listen/play/x.m3u8` and `/healthz`;
  - `/mcp` went to **mcp**;
  - `Range: bytes=0-99` reached the upstream unchanged.
- **The body cap:**
  - `client_max_body_size 20m` (`deploy/knowledge.conf:135`) covers the runner's `PUT /api/listen/parts/<key>`, which
    falls into `location /api/`;
  - through the routing run, a 5 MB upload passed the edge and a 21 MB upload got 413;
  - the server caps a part at 4 MiB (`KB_LISTEN_MAX_PART_BYTES`);
  - a 10-minute part at 48 kbps is about 3.6 MB, so the cap is ample.
- **Cloudflare:**
  - parts carry `Cache-Control: private, max-age=31536000, immutable` (`server/listen_play.py:62`);
  - the playlist and the timeline carry `no-store` (`:63`);
  - `.m4a` and `.m3u8` are not default-cached extensions (R3 §5);
  - so expect `cf-cache-status: DYNAMIC`.

No deploy script and no conf needed a change, so nothing under `deploy/` was edited.

### 5. The snippet check (scratch stack)

**The stack:**
- A fresh database in `p41-x1-pg` (at head).
- The API on 127.0.0.1:**8767**, with a scratch `KB_ROOT` and `KB_LISTEN_PART_CAP_S=20`.
- The scratch **production build** (standalone, served the way the image serves it) on 127.0.0.1:**3043**, calling
  `:8767`.
- A test account, signed up through the API (`@example.test`). It has slug `x1lab`, project `listen-x1`, an org key,
  and one synthetic short note.
- The Listen was started: 2 parts. They were rendered by W1's macOS `say` scratch runner and uploaded through the
  runner API.
- `:3030` was not touched. It calls `:8766`, which stayed down.

**Signed in, run verbatim in Node 24:**
- The session came from a BFF login into a cookie-jar file, never printed.
- `performance.getEntriesByType` was stubbed to return the playlist entry.
- Results:
  - playlist: `200`, `no-store`;
  - `range_0_99`: **206**, `content-range: bytes 0-99/87123`, `accept-ranges: bytes`, **no `content-encoding`**, 100
    bytes, `private, max-age=31536000, immutable`;
  - `past_end`: **416**, `content-range: bytes */87123`;
  - `head`: **200**, `accept-ranges: bytes`, `content-length: 87123`.
- Signed out: the playlist got 401 and the snippet printed its "signed in on this tab?" note.

**In the agent's Chrome:**
- Instrument: **Claude in Chrome**. `list_connected_browsers`, then `select_browser` on deviceId `c14e5b18-…`, before
  anything else. The run used its own tab, which was closed afterwards.
- On the `:3043` page, signed out, the snippet found no playlist and printed its message.
- After one fetch of the playlist path, it found the URL in `performance` and printed the 401 note.
- **The signed-in Chrome run was not made.** Signing the agent's Chrome into the scratch stack needed the scratch
  test password in the agent's context. The permission layer refused that, and it was not worked around. The
  operator's production paste is the first signed-in browser run.
- **Found:** Chrome records a resource-timing entry only once the response body has been read. hls.js reads the
  playlist in full, so the entry exists once Listen has loaded. The paste-the-URL fallback covers anything else.

**The flip probes' "after" answers, measured on the scratch stack:**

| Probe | Answer |
|---|---|
| BFF play | `401 xfo=DENY` |
| BFF position, with Origin | `401 xfo=DENY` (without Origin: `403`) |
| API claim | `401 www-auth=Bearer` |
| API state | `401 www-auth=Bearer` |
| API `GET` claim | `405` |

## Runbook

### Stop A (the operator)

Put to the operator word for word (also in `operator_need`):

> **Stop A: put Listen on production.** These are your steps. I run nothing on production.
>
> 1. **Push.** In the knowledge repo on this Mac: `git push origin main`. It sends 41 commits: Listen (P41-sr) plus
>    the P40-2t merge, so it also releases plugin 0.12.0 to the marketplace. If the push is rejected because the box
>    published a doc meanwhile, run `git pull --rebase origin main` and push again.
> 2. **On the box:** `ssh oracle-cloud`, then `cd /opt/knowledge`. Run these two and send me both outputs:
>    - `docker compose -f compose.prod.yml exec -T api sh -c 'cd /repo && alembic current'` (expected:
>      `0006_reader_state (head)`);
>    - `df -h /opt/knowledge`.
> 3. **Deploy.** GitHub → Actions → **Production Deploy** → **Run workflow** on `main`. Or run
>    `gh workflow run deploy-production.yml --ref main`, then `gh run watch`.
>    **Don't run alembic by hand.** The deploy migrates by itself, after it pulls and builds and before it restarts
>    the api.
>    Success means the run is green, and its log (or the artifact's `deploy-output.txt`) shows, in order:
>    - `Running upgrade 0006_reader_state -> 0007_listen`;
>    - `knowledge-api healthy`;
>    - `all three services healthy`;
>    - the edge step passing (`nginx -t`, then the reload);
>    - `Deploy completed successfully.`;
>    - `smoke OK (200)` for `/healthz` and `/`.
> 4. **On the box again:** run the same `alembic current` command. Expected: `0007_listen (head)`. Send me that line.
>
> If the deploy fails, don't roll back. Send me the failed step's log, or the run's `production-deploy-…` artifact.
> A failed migration stops before the api restarts, so the old site keeps serving.

**What the step 2 answer means:**

| Answer | Meaning |
|---|---|
| `0006_reader_state (head)` | Expected. The deploy runs `0006_reader_state -> 0007_listen` only. |
| `0005_tenant_slug` or `0004_project_visibility` | The deploy runs the whole chain to `0007` in one step, and every step is additive. Safe, but a past deploy's migration never landed. Note it. |
| `0007_listen` | Already applied (unexpected). The deploy's step is a no-op. |
| Error or empty | Stop and send it to the orchestrator. Do not deploy. |

### Then: the orchestrator's flip probes

These are public and unauthenticated. The POSTs have empty bodies.

```sh
B=https://knowledge.hi2vi.com
F='%{http_code} xfo=%header{x-frame-options} www-auth=%header{www-authenticate}\n'
curl -sS -o /dev/null -w "$F" "$B/healthz"
curl -sS -o /dev/null -w "$F" "$B/api/listen/play/x/playlist.m3u8"
curl -sS -o /dev/null -w "$F" -X POST -H "Origin: $B" -H 'Content-Type: application/json' "$B/api/listen/position"
curl -sS -o /dev/null -w "$F" -X POST "$B/api/listen/jobs/claim"
curl -sS -o /dev/null -w "$F" "$B/app/listen/state?org=x&project=y&doc=z"
```

| Probe | Before (production, GET measured 2026-11-12) | After (expected; proven on the scratch stack) | Answered by, after | Proves |
|---|---|---|---|---|
| `GET /healthz` | `200 xfo=` | `200 xfo=` | FastAPI | liveness (no flip) |
| `GET /api/listen/play/x/playlist.m3u8` | `404 xfo=` (`{"detail":"Not Found"}`, FastAPI) | **`401 xfo=DENY`** (`{"ok":false}`) | Next BFF (`knowledge-web`) | the edge re-apply **and** the new web image |
| `POST /api/listen/position` | `404 xfo=` (FastAPI; inferred from the GET, the same `location /api/`) | **`401 xfo=DENY`** (`403` if the Origin header is left out) | Next BFF | the same |
| `POST /api/listen/jobs/claim` | `404 xfo=` (GET measured: 404) | **`401 www-auth=Bearer`** (`{"detail":"missing or invalid bearer token"}`) | FastAPI | the api runs the new code |
| `GET /app/listen/state?…` | `404 xfo=` | **`401 www-auth=Bearer`** (`{"detail":"Unauthorized"}`) | FastAPI | the same |

**How to tell the servers apart:** a Next answer carries `x-frame-options: DENY` (from `next.config.ts` headers); a
FastAPI answer does not, and a FastAPI 401 carries `WWW-Authenticate: Bearer`.

**Diagnosis:**
- The play probe still gives `404 xfo=`: the edge was not re-applied.
- It gives `404 xfo=DENY`: the edge is new but the web image is old.

The schema itself is proven by step 4's `alembic current` and by the first real Listen.

### Stop B (the operator)

1. On this Mac: `cd tools/listen-runner && uv sync`.
2. **Mint the org key.**
   - Sign in at https://knowledge.hi2vi.com as the account whose documents you will listen to.
   - Open **`/dashboard`**, find the panel **Org API keys** and press **New key**.
   - Type a **Key name** such as `Mac Listen runner`, then press **Create key**.
   - The window **Copy your new key now** shows the key once.
   - Do **not** use a project page's key form: a project key gets 403 from the runner API.
   - The runner only takes jobs from its own org.
3. `cp env.example .env`. Set `KB_LISTEN_URL=https://knowledge.hi2vi.com` and `KB_LISTEN_KEY=` the key. Never paste
   the key in chat.
4. `uv run python -m listen_runner --once`. It prints to the terminal, not the log:
   - expected: `start server=https://knowledge.hi2vi.com …`, then `idle note=no job` (the key works);
   - `claim-refused status=401` means a wrong key;
   - `claim-refused status=403` means a project key.
5. `./install.sh`. It loads the LaunchAgent, which starts at login and restarts on a crash.
6. In your Chrome on the Mac, signed in on production, open **one short native document** of yours (a few
   paragraphs) and press **Listen**. It reads "Waiting for the Mac", then "Preparing… Part 1 of N", then plays.
7. Run `tail -n 40 ~/Library/Logs/kb-listen-runner.log`. Send me the lines from `claimed` to `finished`. They hold no
   text and no key.
8. While it plays, open DevTools → Console on that page. Chrome may first ask you to type `allow pasting`. Paste this
   one line, press Enter, and send me the output that starts with `X1`:

```js
(async(u)=>{u=u||performance.getEntriesByType('resource').map(e=>e.name).find(n=>/\/api\/listen\/play\/[^/?]+\.m3u8/.test(n))||[...document.querySelectorAll('audio')].map(a=>a.currentSrc).find(s=>/\.m3u8/.test(s));if(!u)return console.log('X1: no Listen playlist on this page yet. Press Listen and play a second, then run this again (or paste the .m3u8 URL from the Network panel between the last two quotes).');const h=(r,b)=>({status:r.status,'content-range':r.headers.get('content-range'),'accept-ranges':r.headers.get('accept-ranges'),'content-encoding':r.headers.get('content-encoding'),'content-length':r.headers.get('content-length'),'cache-control':r.headers.get('cache-control'),'cf-cache-status':r.headers.get('cf-cache-status'),...(b===undefined?{}:{bytes:b})});const pl=await fetch(u,{cache:'no-store'});const l=(await pl.text()).split('\n').map(s=>s.trim()).find(s=>s&&!s.startsWith('#')&&/\.m4a$/.test(s));if(!l)return console.log('X1 '+JSON.stringify({playlist:h(pl),note:pl.ok?'no part in the playlist yet: wait for Preparing to finish':'the playlist did not load: signed in on this tab?'}));const p=new URL(l,new URL(u,location.href)).href;const g=(m,x)=>fetch(p,{method:m,cache:'no-store',headers:x?{Range:x}:{}});const hd=await g('HEAD');const a=await g('GET','bytes=0-99');const ab=(await a.arrayBuffer()).byteLength;const n=+((a.headers.get('content-range')||'').split('/')[1]||hd.headers.get('content-length')||0);const z=await g('GET',`bytes=${n+100}-${n+199}`);await z.arrayBuffer();console.log('X1 '+JSON.stringify({playlist:h(pl),range_0_99:h(a,ab),past_end:h(z),head:h(hd)},null,1))})('')
```

The snippet prints only statuses and headers: no URL, no audio, no key.

### Span 2's checks

**The runner log.** For each part, in order:
1. `claimed job=… part=… lang=…`;
2. on the first job only, `model-loaded … load_s=…`;
3. `rendered job=… seconds=… render_s=… rtf=…`, with `rtf` about 0.4–0.5 (R5 measured 0.42);
4. `uploaded job=… status=201 bytes=…`, with bytes under 4 MiB;
5. `finished job=… seconds=…`.

There must be no `failed`, no `dropped` and no `claim-refused`.

**The snippet output:**

| Field | Expected |
|---|---|
| `range_0_99.status` | **206** |
| `range_0_99.content-range` | `bytes 0-99/<size>` |
| `range_0_99.accept-ranges` | `bytes` |
| `range_0_99.content-encoding` | **null** |
| `range_0_99.bytes` | 100 |
| `cf-cache-status` (every response) | null, `DYNAMIC` or `BYPASS`, **never `HIT`** |
| `past_end.status` | **416**, with `content-range: bytes */<size>` |
| `head.status` | 200, with `accept-ranges: bytes` and `content-length` equal to the size |
| `playlist` | 200, `no-store` |

**If it fails:**
- `HIT`: a Cloudflare cache rule is wrong. Stop.
- 200 instead of 206: Range is dropped on the way. Stop, because iOS needs ranges.

**The play.** The document plays start to end in Chrome on the Mac, with the dock showing, and a reload resumes near
the place. The iPhone screen-off checks stay at acceptance (R3 §10).

**Free disk.** Record Stop A's `df -h /opt/knowledge`. Audio grows by about 0.35 MB per spoken minute (48 kbps, about
21 MB an hour), under `/opt/knowledge/docs/.audio/` and `/opt/knowledge/tenants/<uuid>/.audio/`. The box's CPU and RAM
go unrecorded.

### Rollback notes

**If the deploy fails, fix forward** (`deploy/deploy.sh:53-58`, `deploy/README.md` §6). There is no rollback.
- **The migration fails:** the run stops before the api restarts, so the old site keeps serving. Fix forward on
  `main` and re-dispatch.
- **A health gate fails:** the artifact holds the logs. Fix forward the same way.
- **`nginx -t` fails at the edge step:** the new containers run, but routing is unchanged. Listen audio then answers
  404, and everything else works. Fix `deploy/knowledge.conf` and re-dispatch.

**If Listen misbehaves after a green deploy:**
- **Stop the runner:** `launchctl bootout gui/$(id -u)/com.knowledge.listen-runner` stops it until the next login.
  `tools/listen-runner/uninstall.sh` removes it.
- **Cut it off server-side:** revoke its key under `/dashboard` → Org API keys.
- **The site works without Listen.** The `0007` tables are additive and harmless.
- **Never run `alembic downgrade` on the box.** It drops the Listen tables, and this repo fixes forward.
- **A code revert** is a `git revert` on `main`, a push, and a re-dispatch.

## Stop A, as run

From the plan's § Stop A, as run (2026-11-12). The operator said "you do all".

- **The operator ran these, because the permission layer refused the agent:**
  - the push, `b1eb6484..bf75e1eb`;
  - Production Deploy run `43048454873`.

  The agent's SSH read of `alembic current` and `df` was refused too, and was not worked around.
  `df -h /opt/knowledge` is still owed by the operator.
- **The run was green:**
  - `Running upgrade 0006_reader_state -> 0007_listen`;
  - knowledge-api, knowledge-web and knowledge-mcp healthy;
  - edge `nginx -t` ok, then the reload;
  - `Deploy completed successfully.`;
  - the smokes OK for `/healthz` 200, `/` 200 and `/mcp` 406.
- **The flip probes,** run by the orchestrator afterwards, all as § Runbook predicted:

  | Probe | Result |
  |---|---|
  | `healthz` | `200` |
  | `play` | `401 xfo=DENY` |
  | `position` | `401 xfo=DENY` |
  | `claim` | `401 www-auth=Bearer` |
  | `state` | `401 www-auth=Bearer` |

- **Stop B, prepared by the orchestrator:**
  - `uv sync` in `tools/listen-runner`;
  - `.env` written from `env.example` with `KB_LISTEN_URL=https://knowledge.hi2vi.com` and an empty
    `KB_LISTEN_KEY=`, mode 0600, gitignored. The key was the operator's to paste.

## Production check

**Stop B, as run.** The operator put the org key in `tools/listen-runner/.env`, ran `install.sh`
(`com.knowledge.listen-runner` is loaded and running), and pressed Listen on a document of theirs on production.
The orchestrator ran `--once`: `idle note=no job`.

### The runner

From `~/Library/Logs/kb-listen-runner.log`. The table has no job ids, part keys or text, because the repo is public.
The orchestrator recorded parts 1–3; Span 2 read part 4 from the same log, without touching the runner.

| Part | Segments | Estimate | Audio | Over the estimate | Render | RTF | Bytes | Of 4 MiB | Upload |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 35 | 598.4 s | 627.96 s | +4.9 % | 289.1 s | 0.460 | 3,888,484 | 92.7 % | `201` |
| 2 | 14 | 315.3 s | 310.96 s | −1.4 % | 145.2 s | 0.467 | 1,926,459 | 45.9 % | `201` |
| 3 | 41 | 567.5 s | 676.79 s | **+19.3 %** | 320.9 s | 0.474 | **4,190,874** | **99.92 %** | `201` |
| 4 | 29 | 569.3 s | 638.43 s | +12.2 % | 302.7 s | 0.474 | 3,953,069 | 94.2 % | `201` |

- The model loaded in 2.7 s, on the first job only. Peak memory was 4.41–4.48 GB.
- Every part has its `claimed`, `rendered`, `uploaded` and `finished` lines, and each `finished` comes 1–2 s after
  its upload.
- No `failed`, `dropped` or `claim-refused` line appeared.
- When Span 2 last read the log (00:53 KST), part 5 had been claimed (20 segments, estimate 431.9 s). At +19 % it
  would be ~3.2 MB, so it fits even the old cap.
- **The stream is 6,192 B/s on every part** (49.5 kbps: the 48 kbps CBR plus the fMP4 framing). That is ~0.37 MB per
  spoken minute and ~22 MB an hour. Span 1's estimate was 0.35 MB.

### The Range snippet

The operator ran it signed in, in their own browser on production. The first form found no playlist (§ For the
review). The revised form clears the resource-timing buffer and waits for hls.js's next playlist reload. Its output,
on part 1:

| Request | Result |
|---|---|
| `range_0_99` | `206`, `content-range: bytes 0-99/3888484`, `accept-ranges: bytes`, `content-encoding: null`, 100 bytes, `cache-control: private, max-age=31536000, immutable`, `cf-cache-status: DYNAMIC` |
| `past_end` | `416`, `content-range: bytes */3888484`, `DYNAMIC` |
| `head` | `200`, `accept-ranges: bytes`, `content-length: 3888484`, `DYNAMIC` |
| `playlist` | `200`, `no-store`, `content-encoding: zstd`, `DYNAMIC` |

Every field matches § Runbook → Span 2's checks:
- the part answers Range through Cloudflare and the edge, uncompressed;
- the part is never cached (`DYNAMIC`, never `HIT`), and its `private` cache-control keeps it that way;
- the size is the same across the Range answer, the `416` and the `HEAD`.

The playlist's `zstd` is Cloudflare compressing the text playlist for a client that accepts it. It is harmless,
because the playlist is never fetched by range.

### The play

The operator: "Voice comes well." The Listen played in their browser on production.

**Not heard yet:**
- the part boundary (part 1 → part 2, at ~10:28);
- a reload resuming near the place.

The review's walkthrough covers them, with the iPhone screen-off checks (R3 §10).

### Free disk

**Still owed by the operator.** The agent's SSH read of `df -h /opt/knowledge` at Stop A was refused, and was not
worked around. Audio grows by ~0.37 MB per spoken minute (measured above), under `/opt/knowledge/docs/.audio/` and
`/opt/knowledge/tenants/<uuid>/.audio/`. This first document's four parts alone are 13.96 MB.

## The part-size defect and fix

### The defect

B1 set the part upload cap, `listen_max_part_bytes()`, to 4 MiB (4,194,304 B). B2 measured a 10-minute part at
3,716,046 B and noted that the cap holds about 11 minutes. On production that margin was not enough:
- **Speech ran up to 19.3 % past B1's length estimate** (part 3: 676.8 s against 567.5 s), and part 4 ran 12.2 %
  past it. The part cap (`KB_LISTEN_PART_CAP_S`, 600) bounds the estimate, not the audio.
- **The stream is 6,192 B/s**, so 4 MiB holds 677.3 s of audio. Part 3 was 676.8 s: **3,430 B under the cap**.

**What a larger part does:**
1. `_read_capped` answers `413` (`server/listen_api.py:657`, on the declared `Content-Length`);
2. the runner's `_deliver` (`tools/listen-runner/src/listen_runner/__main__.py`) treats any status other than
   200, 201 or 409 as `upload refused` and `fail`s the job;
3. the render is deterministic (`KB_LISTEN_SEED`, 0), so all three attempts make the same bytes, and the Listen stops
   at "Preparing stopped".

### The fix

`server/config.py`, and byte for byte `plugin/templates/kb/server/config.py`:

```python
def listen_max_part_bytes() -> int:
    """The largest part upload accepted (``KB_LISTEN_MAX_PART_BYTES``, 16 MiB). A
    10-minute part is about 4 MB (AAC 48 kbps), and speech ran up to 19 % past its
    length estimate on production, so 4 MiB was too tight (P41-sr.X1). 16 MiB stays
    under the edge's ``client_max_body_size 20m``, and the upload is read capped."""
    return int(_env_number("KB_LISTEN_MAX_PART_BYTES", 16 * 1024 * 1024, integer=True))
```

**Why 16 MiB (16,777,216 B):**
- It holds 2,709 s (45 min) at 6,192 B/s.
- Against a 600 s estimate, it gives 3.8× headroom at the observed +19 % (4.42 MB) and 3.0× at +50 % (5.57 MB).
- It stays under the edge's `client_max_body_size 20m` (20,971,520 B; `deploy/knowledge.conf:135`). That is
  server-level, and no `location` overrides it. `/api/listen/parts/…` stays on `location /api/` (FastAPI).
- The upload is read through `_read_capped`, which refuses an over-cap `Content-Length` before reading and stops
  the stream at the cap. Memory stays bounded at one part per upload, and the runner uploads one part at a time.

**Unchanged:**
- the part length cap (`KB_LISTEN_PART_CAP_S`, 600);
- the env override (`KB_LISTEN_MAX_PART_BYTES`). Nothing in `compose*.yml` or `deploy/` sets it, so production runs
  the default. The box's `.env` was not read.
- the runner, which has no size cap of its own.

**The grep.** No other place inside `server/`, `tests/` or their template mirrors states 4 MiB for parts, and no
test names the cap. The places outside the set that still say 4 MiB were left alone:
- `phase.md`'s B1 (`security.md`) and B2 (`operations.md`) Doc impact lines. That list is append-only, so the new
  Doc impact line supersedes them;
- B1's and B2's `result.md`, which are other slices' logs;
- this file's Span 1 § Runbook → Span 2's checks ("bytes under 4 MiB"), which is Span 1's record.

`docs/current/` states no part cap yet, because Listen is not consolidated.

### Until Stop C lands

Production still runs the 4 MiB default. A part over 677 s of audio gets `413`, and its Listen stops at
"Preparing stopped". After the deploy, **Try again** on that document re-renders the part, and the 16 MiB cap takes
it. Parts 1–4 of the operator's document fit, and so would part 5.

## For the review

1. **The first part's wait.** It is about 5 minutes before anything plays:
   - part 1 was claimed at 00:35:25, the model loaded at 00:35:29, and part 1 was uploaded at 00:40:22. That is
     **4 min 57 s from the claim**, plus up to one poll interval (`KB_LISTEN_POLL_S`, 30 s) before the claim;
   - the cause: part 1 is a full ~10-minute part (estimate 598 s), rendered at RTF ≈ 0.46.

   A short first part (say 60–90 s of speech) would start playback in under a minute: ~40 s of render plus the
   model load. Every later part renders while the earlier ones play, so the wait comes only once. This is a
   candidate finding or deferred job, **not fixed here**. A possible job: *Listen: a short first part, so playback
   starts in under a minute*. Its reason is the ~5 min wait, and its trigger is the next Listen work or the
   operator's call at the walkthrough.
2. **The snippet's discovery miss, and its fix.**
   - The first form looked for the playlist in `performance.getEntriesByType('resource')`, then in each `<audio>`'s
     `currentSrc`, and found nothing.
   - The likely cause, not proven: Chromium plays through hls.js (W2), so the `<audio>` source is a `blob:` MediaSource
     URL that never names the `.m3u8`. And a reader page that polls can fill the resource-timing buffer (250 entries
     by default), after which new entries are dropped.
   - The revised form clears the buffer (`performance.clearResourceTimings()`) and waits for hls.js's next playlist
     reload. That works while the playlist still grows. Once it is complete, hls.js stops reloading it, so a later
     check should observe new entries (a `PerformanceObserver`) or start from a fresh load.
   - This is a tooling note, not a product defect. It matters for the walkthrough's scripts.
3. **The part-size fix corrects B1's cap** (§ The part-size defect and fix). B1 and B2 both ran on the high row.
   B2's measured 88.6 % of the cap assumed the estimate was the audio length. X1 found and fixed it on the high
   row. The review should confirm the fix shipped (Stop C), and that no Listen stopped at "Preparing stopped" in
   between.

## Refused by the permission layer (not worked around)

1. **Reading the scratch test account's values.** `cat` of `x1/acct-email.txt` and `x1/acct-pw.txt` was refused
   (Credential Materialization). Without them there was no signed-in Chrome run. The signed-in path ran in Node with a
   cookie jar the agent never printed (§5).
2. **The teardown delete.** `rm -rf` of the scratch directory was refused. These are left, all under
   `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/5d1a4fc9-9d70-403f-9f9d-a092c34a78a0/scratchpad/`:
   - `x1/webbuild/`: the scratch clone and its standalone build;
   - `x1/kbroot/`: the scratch `KB_ROOT`, with the synthetic note and its two parts;
   - `x1/parts/`: the rendered synthetic audio;
   - `x1/edge/`: the self-signed certificate and key, and the stub confs;
   - `x1/lockcheck/`, `x1/tools/`, the logs, `snippet.js`, `harness.mjs`, `play.json`, `start.json` and
     `last-claim.json`;
   - the secret files `x1/pgpw.txt`, `acct-email.txt`, `acct-pw.txt`, `session.txt`, `vk.txt`, `bff-cookies.txt` and
     `session-secret.txt`. Each belongs to the destroyed database or a stopped server, so each is inert;
   - `x1.diff`, the `origin/main..main` diff (public-repo content);
   - `files.txt`.

**Torn down:**
- the scratch API (`:8767`) and the scratch production server (`:3043`) were stopped;
- `p41-x1-pg` was removed with its volume, and the volume is confirmed gone;
- the stub network and containers (`p41-x1-net`, `p41-x1-edge`, `p41-x1-stub-*`) were removed;
- the agent's Chrome tab was closed.

**Left untouched:** `:3030` (still PID 8452), `web/.env.local`, `changple5-*`, `p50-s12-db` and
`UPDATE_REQUIRED.md`.

**Span 2:** nothing was refused. Left untouched: the running runner (`com.knowledge.listen-runner`; its log was only
read), `:3030`, every `.env` file (including `tools/listen-runner/.env` and `web/.env.local`), and the box.

## Deviations

### Span 1

1. **No hand-run migration at Stop A.** The plan's "the migration and Production Deploy, in the pinned order"
   becomes "dispatch the deploy", with `alembic current` before and after. The reason: `deploy/deploy.sh:349-355`
   runs `alembic upgrade head` in-line and fails closed (§3).
2. **`alembic current` uses `exec -T api sh -c 'cd /repo && …'`** on the running api, which is deploy.sh's own form.
   It is a read, so it uses no `run --rm` container.
3. **`--once` prints to the terminal, not the log.** The LaunchAgent writes `~/Library/Logs/kb-listen-runner.log`.
   So `--once` is Stop B's connectivity check (`idle`), and the `claimed` … `finished` lines come from the LaunchAgent
   after a Listen starts.
4. **The snippet's signed-in path was proven in Node, not Chrome.** The permission layer refused reading the test
   password (§5).
5. **The position probe sends `Origin` and `Content-Type`.** Without them the BFF answers 403 or 415 before its
   session check. Those still flip from FastAPI's 404, but not to the plan's 401.
6. **`phase.md` was not written.** The plan's Set excludes it, and its Return asks for the `notebook` field instead.
7. **The teardown delete was refused.** The paths are listed above.

### Span 2

1. **The Postgres route tests ran too.** The plan allowed them to skip without a DSN. A disposable `postgres:17`
   ran them (6 passed, 0 skipped), and was removed with its volume after, as in Span 1.
2. **The headroom figure.** The plan says 16 MiB leaves "about 4× headroom over a 10-minute estimate even at
   +50 %". At the measured 6,192 B/s it is 3.0× at +50 % and 3.8× at the observed +19 %. 16 MiB stands: it stays
   under the edge's `20m`, the read is capped, and 3× is far past the worst overrun seen.
3. **Part 4 is recorded.** The plan's table stopped at part 3, with part 4 rendering. Span 2 read part 4 from the
   log (reading only), and added the render, overrun and share-of-cap columns. Job ids and part keys stay out,
   because the repo is public.
4. **`phase.md` was not written,** as in Span 1: the span's set excludes it, so the entries are under `notebook`.
   The notebook adds one `## Decisions` line beyond the plan's list (the new cap), because the review cross-checks
   each decision a `result.md` records against `## Decisions`.
