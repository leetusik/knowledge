# Result — P2.S4 (dockerize: Dockerfile, compose `api` service, README API section)

- Phase ID: P2
- Slice ID: P2.S4
- Review status: pending
- Next action: orchestrator runs `validate`, `finish-slice P2.S4`, commits; then the P2.REVIEW slice.

## Outcome

Done. The API is containerized as compose service `api` (port 8766) beside the
mkdocs viewer `kb` (8765), and the README documents it. No server logic changed —
packaging + docs only. Full end-to-end smoke (build → POST via 8766 → livereload
on 8765 → scoped kb-api commit → surgical cleanup → reindex `removed:1`) passed
with `docs/` ending byte-identical and both containers left running.

## Files Changed

- `Dockerfile` (new) — `python:3.12-slim`; apt `git` + `tzdata`; uv binary from
  `ghcr.io/astral-sh/uv:latest`; deps via `uv export --frozen --no-dev
  --no-emit-project -o /tmp/req.txt` → `uv pip install --system -r /tmp/req.txt`;
  system-level `safe.directory /repo` + `kb-api` git identity; `WORKDIR /repo`;
  single-worker uvicorn CMD.
- `.dockerignore` (new) — `.git`, `data/`, `docs/`, `site/`, `.cache/`, `.venv/`,
  `works/`, `__pycache__/`.
- `compose.yml` (modified) — added the `api` service (`build: .`, `8766:8000`,
  `.:/repo`, `KB_ROOT=/repo`, `TZ=Asia/Seoul`, commented `KB_API_TOKEN`,
  `restart: unless-stopped`); `kb` service untouched.
- `README.md` (modified) — added an "API" section after "Viewer operations".
- `works/phases/active/P2/phase.md` — appended the "S4 landed" note + 2 Doc impact
  one-liners (`operations`, `architecture`).
- `works/phases/active/P2/slices/P2.S4/result.md` — this file.

## Validation Run — STRICT ORDER (all passed)

1. **Step-1 git status** (recorded before smoke): `M` on `works/backlog.md`,
   `works/deferred.md`, `works/events.jsonl`, `works/index.json`,
   `works/phases/active/P2/slices/P2.S4/slice.json`, `works/state.json`; `??`
   `works/phases/active/P2/slices/P2.S4/plan.md`.
2. **`docker compose up -d --build`** → the compose *bake* build path panicked
   (Go stack trace in `doBuildBake` — a compose-v2 bug on this host, unrelated to
   our config). Re-ran with **`COMPOSE_BAKE=false docker compose up -d --build`**
   → image built cleanly, both services up. `curl -s localhost:8766/healthz` →
   `{"status":"ok","docs_root":"/repo/docs","db":"ok","documents":1}`.
3. **POST via 8766** (`test-project` / `api-smoke-test`, tags `["smoke-test",
   "docker"]`, `co_authored_by: "Smoke Test <smoke@example.com>"`) → **HTTP 201**,
   `committed:true`, `commit_sha:9b9fe09…`. **Livereload proof**: the returned URL
   `http://localhost:8765/test-project/2026-07-02-api-smoke-test/` served **HTTP
   200** with `<title>API Smoke Test — Dockerized Write Path - Knowledge Base
   </title>` **within 1s**. `git log -1`: author `kb-api <kb-api@localhost>`,
   `Co-Authored-By: Smoke Test <smoke@example.com>` trailer present, exactly **2
   files** (`docs/index.md` + `docs/test-project/2026-07-02-api-smoke-test.md`).
4. **Surgical cleanup** (no `reset --hard`, no `add -A`): `git reset HEAD~1`
   (mixed), `git checkout -- docs/index.md`, `rm docs/test-project/2*.md`,
   `rmdir docs/test-project`. `curl -s -X POST localhost:8766/api/reindex` →
   `{"indexed":1,"removed":1,"skipped":[],"duration_ms":34}`.
5. **End state**: `git log -1` = `207f2ff feat(api): add API-owned write path
   with scoped git commits` (the S3-boundary commit); `git status --porcelain`
   equals the step-1 state plus this slice's expected file changes (`M`
   README.md/compose.yml, `??` Dockerfile/.dockerignore); **nothing changed under
   `docs/`** (byte-identical); **both containers left running**.
6. **`uv run pytest -q`** (host) → **25 passed**. **`python3 scripts/workflow.py
   validate`** → **passed**.
7. **TZ sanity**: `docker compose exec -T api python -c "import datetime;
   print(datetime.date.today())"` → **`2026-07-02`** (KST), matches host `date`.

## Deviations from Plan

- **`COMPOSE_BAKE=false` needed for the build.** `docker compose up -d --build`
  crashed in compose's bake build path (a Docker Compose v2 bug on this host, not
  our Dockerfile/compose). Disabling bake built cleanly — a host/tooling
  workaround, not a change to the deliverables. Recorded in `phase.md`.
- Smoke tags used were `["smoke-test", "docker"]` (2 valid tags per the plan);
  the plan left the exact tag values open.

Otherwise executed exactly as `plan.md` specified. Did not touch the `kb`
service, `mkdocs.yml`, or anything under `server/`. `docs/` was modified only
transiently by the smoke and ended byte-identical. Did not commit; did not
transition slice/phase status.

## Doc Versions Created

- None (implementation slice). Appended 2 Doc impact one-liners to `phase.md`
  (`operations`, `architecture`) for the P2.REVIEW slice to consolidate.

## Roadmap Updates

- None.

## Retrospective

- The container reproduces S3's git prerequisites exactly (system-level
  `safe.directory` + `kb-api` identity), and the shared bind mount makes an API
  write on 8766 live-reload on 8765 within ~1s. tzdata in the slim image is the
  one non-obvious must-have. Note for future rebuilds on this host:
  `COMPOSE_BAKE=false` avoids a compose bake panic.
