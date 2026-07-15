# Plan — P2.S4 (dockerize: Dockerfile, compose `api` service, README)

## Situation

Last implementation slice of P2. S1–S3 are committed: the API is fully working on the host (25/25 tests; write-path smoke proven). Read `works/phases/active/P2/phase.md` first — especially **"S3 landed — interfaces & gotchas for S4"** (the container prerequisites are load-bearing). Full spec: approved plan at `~/.claude/plans/make-up-phases-for-precious-fairy.md`, "Phase 4".

Environment facts (verified by the orchestrator): Docker daemon 28.5.2 up; the `kb` viewer container is already running on 8765 (leave it untouched and leave both services running at the end).

S4 changes **no server logic** — packaging + docs only.

## Create / modify

- **`Dockerfile`** (new):
  - `FROM python:3.12-slim`
  - `apt-get update && apt-get install -y --no-install-recommends git tzdata && rm -rf /var/lib/apt/lists/*` — **tzdata is not in slim**; without it `TZ=Asia/Seoul` silently falls back and `datetime.date.today()` computes UTC dates (wrong file dates around midnight KST).
  - `COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv`
  - Copy **only** `pyproject.toml` + `uv.lock`; install runtime deps: `uv export --frozen --no-dev --no-emit-project -o /tmp/req.txt && uv pip install --system -r /tmp/req.txt` (or the pipe form).
  - `git config --system safe.directory /repo` and **system-level** identity: `git config --system user.name "kb-api"`, `git config --system user.email "kb-api@localhost"` — system level so the `/repo` bind mount can't shadow them (see "S3 landed").
  - `WORKDIR /repo`; `CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "8000"]` — **single worker**, never add `--workers` (in-process `WRITE_LOCK`).
- **`.dockerignore`** (new): `.git`, `data/`, `docs/`, `site/`, `.cache/`, `.venv/`, `works/`, `__pycache__/` — the build context needs only pyproject/lock; everything else arrives via the runtime bind mount.
- **`compose.yml`** (extend; **do not touch the `kb` service or its comments**): add
  ```yaml
  api:
    build: .
    ports:
      - "8766:8000"
    volumes:
      - .:/repo
    environment:
      KB_ROOT: /repo
      TZ: Asia/Seoul
      # KB_API_TOKEN: set to require Bearer auth on mutating endpoints
    restart: unless-stopped
  ```
- **`README.md`** (extend — add an "API" section after "Viewer operations (ask your agent)"): ports (8765 site / 8766 API); endpoint one-liners (`GET /healthz`, `GET /api/documents[?project=&tag=]`, `GET /api/documents/{id}` / `by-path/...`, `GET /api/search?q=`, `POST /api/reindex`, `POST /api/documents`); the operating model — the API owns writes (convention file + Recent bullet + DB row + scoped git commit; never pushes), `docs/` stays canonical, `POST /api/reindex` rebuilds the DB after manual edits / API-down fallback writes / git resets; publishing remains a manual `git push` by the operator; single-worker invariant (never scale workers); optional `KB_API_TOKEN` bearer auth (mutating endpoints only); Linux-host note (add a compose `user:` mapping if this ever moves off macOS).

## End-to-end verification — STRICT ORDER (same git-safety rules as S3)

1. **Run the smoke BEFORE writing `result.md`/`phase.md`.** Record `git status --porcelain` (expect: untracked S4 `plan.md`, modified `works/` state files, plus your new Dockerfile/.dockerignore/compose/README changes — nothing else).
2. `docker compose up -d --build` → both services up (`docker compose ps`). `curl -s localhost:8766/healthz` → `{"status":"ok",...,"documents":1}`.
3. POST a throwaway doc through **8766** (project `test-project`, slug `api-smoke-test`, 2 valid tags, small H1 body, `co_authored_by: "Smoke Test <smoke@example.com>"`) → 201 `committed:true`. **Livereload proof**: poll the returned `url` (port 8765) up to ~15s until it serves HTTP 200 with the doc title in the HTML. `git log -1` → author `kb-api`, trailer present, exactly 2 files.
4. Surgical cleanup — **never `git reset --hard`, never `git add -A`** (they'd revert tracked `works/` state): `git reset HEAD~1` (mixed), `git checkout -- docs/index.md`, `rm docs/test-project/2*.md`, `rmdir docs/test-project`. Then `curl -s -X POST localhost:8766/api/reindex` → `"removed": 1`.
5. End state: `git log -1` = the S3-boundary commit (`feat(api): add API-owned write path...`); `git status --porcelain` = step-1 state; nothing changed under `docs/`; **both containers left running**.
6. `uv run pytest -q` (host) still 25/25; `python3 scripts/workflow.py validate` passes.
7. TZ sanity: `docker compose exec api python -c "import datetime; print(datetime.date.today())"` → today's date in KST.

## Wrap-up (executor — only after the smoke)

- Append to `phase.md`: **"S4 landed"** note (image contents incl. tzdata + why, single-worker CMD, system-level git config, how to enable `KB_API_TOKEN`) + **Doc impact** one-liners: `operations` (S4) — compose runs two services (kb 8765 / api 8766; restart unless-stopped; TZ Asia/Seoul; token option; single worker); `architecture` (S4) — final two-service shape of Track 2 (viewer + API over the shared bind-mounted repo).
- Write `result.md` (decisions, deviations, smoke transcript summary).
- Never commit; never transition status. Write only `Dockerfile`, `.dockerignore`, `compose.yml`, `README.md`, your slice files, and `phase.md`. Do not modify the `kb` service, `mkdocs.yml`, or `server/`. `docs/` only via the smoke, ending byte-identical.
