# Plan — P8.S5: E2E acceptance — first hi2vi write → push → Pages → live; search under auth

Orchestrator plan (auto mode). Executor: `slice-executor-high` (bumped from the DECOMP's `medium`: this slice performs a **real mutation of production** — a write to the live public API that commits and pushes to `main` on a public repo and triggers a Pages deploy).

## Context — the endpoint is LIVE (orchestrator brought it up, 2026-07-14)

The operator delegated the bring-up; the orchestrator performed it with granted box access (`ssh oracle-cloud`). Current state, all verified:

- **`https://knowledge.hi2vi.com` is live** — a vhost (`/home/opc/edge/conf.d/knowledge.conf`) on the dedicated edge (`edge-nginx`, project `edge` at `/home/opc/edge`), proxying over `changple_shared_network` to `knowledge-api:8000`. Cloudflare-proxied, wildcard `*.hi2vi.com` origin cert.
- **The API runs from its own clone** at `/opt/knowledge` on the box (compose project from `compose.prod.yml`, container `knowledge-api`), at commit `4eb85d5`, with `KB_GIT_PUSH=true`, `KB_REQUIRE_READ_AUTH=true`, `KB_PUBLIC_BASE_URL=https://leetusik.github.io/knowledge`.
- **The push path is proven** from inside the container: `ssh` is present (`/usr/bin/ssh`, the P8.F2 fix) and `git ls-remote origin` over the mounted deploy key returns `4eb85d5`. It has **never actually pushed a commit yet** — that is what this slice proves.
- **Embeddings are live**: boot reindex logged `embedded=6`; `GET /api/search` returns `mode: "hybrid"`.
- Already validated by the orchestrator: `healthz` → 200 (open); authed `/api/search` → 200; un-authed and wrong-token → 401; co-tenant sites (`hi2vi.com`, `changple.ai`) → 200 after the edge reload.

## The token (never print it, never write it to any file in the repo)

Fetch it at use time into a shell variable and use it only in a header:

```bash
TOKEN=$(ssh oracle-cloud 'sudo grep "^KB_API_TOKEN=" /opt/knowledge/.env | cut -d= -f2-')
curl -s -H "Authorization: Bearer $TOKEN" ...
```

**Hard rule: never `echo` the token, never paste it into `result.md`, `phase.md`, or any committed file.** If you need to show a command in `result.md`, show it with `$TOKEN` unexpanded.

## The write (this is a real, public publication — write something true)

One `POST https://knowledge.hi2vi.com/api/documents` with `project: "hi2vi"` — the first document in the hi2vi research space, which also bootstraps `docs/hi2vi/` (intent item 3). The doc lands on the **public** GitHub Pages site, so its content must be **accurate and genuinely useful** — no lorem-ipsum, no fake research. Write an honest inaugural note for the space: what `docs/hi2vi/` is (the hi2vi content agent's daily deep-research output), how documents arrive here (the content agent POSTs to the knowledge API, which writes the markdown + index entry + search row and publishes to Pages automatically), and how to read/search them. Keep it short (a few hundred words), correct, and free of secrets, tokens, internal IPs, box paths, and private hostnames. `source_repo: "hi2vi_web"` (the consumer repo this integration serves); pick sensible `tags`.

Note: `docs/hi2vi/` (research, `project: "hi2vi"`) is deliberately distinct from the existing engineering explainers in `docs/hi2vi_web/` (`project: "hi2vi_web"`) — do not conflate them.

## Assertions (the acceptance criteria — record each with its evidence in `result.md`)

1. **201** with `pushed: true` (**not** just `committed: true` — a `pushed:false` + `push_error` here means publish-on-write is broken and the slice FAILS), plus `landing_created: true` (the `docs/hi2vi/index.md` auto-landing, P7.F1), a `commit_sha`, and a `url` under `https://leetusik.github.io/knowledge/...`.
2. **The commit is really on `main`** — verify against GitHub, not the box: `gh api repos/leetusik/knowledge/commits/main --jq .sha` (or `git ls-remote`) equals the response's `commit_sha`. Confirm the commit's tree contains both the new doc and `docs/hi2vi/index.md`.
3. **The Pages deploy runs and passes** — the pushed commit triggers `.github/workflows/pages.yml` (which gates on `scripts/site_smoke.py`). Watch it to completion (`gh run list --workflow=pages.yml`, `gh run watch <id>`); it must conclude **success**. (`plugin-ci.yml` also runs on the push — it must stay green too; parity was fixed in F1/F2.)
4. **The doc is live** — `curl` the response's `url` → HTTP 200 and the page contains the doc's title. (Pages can take a minute after the deploy job finishes; poll briefly.)
5. **Read-back under auth** — `GET /api/search?q=<distinctive phrase from the doc>` with the bearer finds the new doc (it is indexed in the same request that wrote it); the same call **without** the bearer → 401. Note the reported `mode` (expect `hybrid`).
6. **Idempotency/dup semantics** — re-POST the identical payload → **409** (`rel_path` exists), the documented "treat 409-after-timeout as already-written" rule from `contract.md`. Confirm no second commit was created.

If assertion 1 or 2 fails, do **not** paper over it: stop, capture the exact response body/`push_error` and the container logs (`ssh oracle-cloud 'cd /opt/knowledge && docker compose -f compose.prod.yml logs api | tail -40'`), and return `blocked` with the diagnosis.

## Constraints

- **You may read the box and the live API. Do not change box config, do not restart the container, do not touch `/home/opc/edge/`.** The one intended production mutation is the single API write (plus the duplicate-POST that must 409).
- **Never run `git commit`/`git push` in this repo yourself** — the *API on the box* commits and pushes; that is the system under test. Your local repo may end up behind `origin/main`; that's expected, the orchestrator reconciles it.
- Do not modify `server/*`, `deploy/*`, or `docs/` by hand — the doc must be created **through the API**, exactly as hi2vi's agent will.
- Append to `phase.md`: a `### P8.S5` Findings section (what the E2E proved, timings, the doc's public URL, anything surprising) and **Doc impact** lines (`qa.md`: the E2E acceptance procedure + the "assert `pushed:true`, not just 201" lesson; `operations.md`: the live endpoint is validated end-to-end incl. Pages deploy). Do not run `doc-new-version`.
- Executor contract: never commit, never transition slice/phase status. Write `result.md`; return the structured verdict.
