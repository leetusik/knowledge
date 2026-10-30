# P36-1s.S1 — result

- status: needs_operator
- route: research
- model: opus
- effort: xhigh
- spent: $0.00 (3 Claude API requests, all refused 401 before billing; Brave, Firecrawl/Exa/Parallel keyless and GitHub reads on free tiers)
- summary: Ran the pinned Hermes Agent image (0.22.5, arm64) confined in scratch and proved, without a model answer, that only web search, page extract and the two MCP servers reach the model, that every write/exec/read tool is blocked through two independent layers (the bridge/agent-loop scope plus a `reader-guard` pre_tool_call allowlist and `approvals.deny`), and that Opus 5.5 requests carry effort medium; settled web (Brave + Firecrawl keyless), the knowledge-base key (org service key; no per-session header in Hermes), code access (B: blobless clone + pinned-commit prefetch) and the serving path (`/v1/runs`, Postgres as the chat source of truth). The live-model checks are blocked: the operator's `ANTHROPIC_API_KEY` ends in a stray `$` and Anthropic answered 401.
- files_changed:
  - `works/phases/active/P36-1s/topics/hermes-fit.md` (new)
  - `works/phases/active/P36-1s/phase.md` (through `phase-section`: 7 Decisions lines, OQ1–OQ2, the DECOMP note for S1 removed, 2 notes added, Now rewritten)
  - `works/phases/active/P36-1s/slices/P36-1s.S1/result.md` (new)
- validation:
  - `python3 scripts/workflow.py validate` — passed (only pre-existing warnings from other phases)
  - `git status --short` — only `works/` paths (this slice's three plus the orchestrator's own uncommitted `works/backlog.md`, `works/events.jsonl`, `slice.json`, `plan.md`)
  - key-shaped grep (`sk-ant-…`, `BSA…`, 16+ chars) over the phase folder and the scratch dir — no match; the bare prefixes appear only in `plan.md`'s own verification text
  - `docker ps -a --filter name=s1-` — no container left; network `s1-net` removed
- deviations:
  1. `phase.md` has no `## Findings` section; the findings went into `## Decisions` as gist lines (the notebook's place for what research settles), each pointing at `topics/hermes-fit.md`.
  2. The model never answered (key rejected), so the lockdown, MCP and web checks were driven through Hermes's own dispatcher (`model_tools.handle_function_call`) with the API server's exact tool scope, and the effort/isolation checks were read from Hermes's request dumps (`HERMES_DUMP_REQUESTS=1`). The plan's live `/v1/responses` checks are listed as open.
  3. After the dispatcher ran `terminal` by direct name, a scratch `reader-guard` plugin and `approvals.deny: ["*"]` were added to the config and the run repeated, to test a second confinement layer.
  4. Session isolation used `X-Hermes-Session-Key`, the header `/v1/responses` reads (`X-Hermes-Session-Id` is an input only on `/v1/chat/completions` and `/v1/runs`).
  5. Knowledge base: no master bearer in the main checkout's `.env` (the file does not exist), and a live `/api/search` is metered (writes a usage row), so the real `knowledge-mcp` ran against a stub upstream instead of a stub MCP — the plan's fallback, one step closer to production.
  6. The keyless rotation cannot be selected for extract while a Brave key is present; its members (Firecrawl, Exa, Parallel, Keenable) were compared pinned one at a time.
  7. Cleanup kept two images (`nousresearch/hermes-agent:stable`, `s1-knowledge-mcp:probe`) and a secret-free probe kit in scratch for the re-run; containers, network, the Hermes home, scratch secrets and clones are gone.
- doc_impact: none (findings only; no durable truth changed)
- operator_need: Fix the `ANTHROPIC_API_KEY` line in `~/.config/knowledge/hermes-research.env`: its value is 100 characters and ends in a `$` that no Anthropic key contains (Anthropic answered `401 invalid x-api-key`; Hermes's masked copy ends in the same `$`). Paste the key alone, keep `chmod 600`, then re-dispatch S1 for the live checks in `topics/hermes-fit.md` § Still open (at most 8 questions, about $1–2, inside the approved $5). Two questions also wait on the operator but do not block the re-run: OQ1 (Brave's 1 search per second) and OQ2 (the private-repo credential).

## What ran

Scratch: `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/113714c2-2241-4bb0-b01e-8f93ccb033d5/scratchpad/s1` (outside the repo).

1. `docker pull nousresearch/hermes-agent:stable` (40 s) → digest `sha256:9c5561579f3ffdf333401797094ac3a743738d6c25d40f4331c7bf77b694238d`.
2. Docker network `s1-net`; `s1-kbapi-stub` (a stdlib stub of `/api/search` and `/api/documents/{id}` that logs the inbound headers); `s1-kmcp` (this worktree's `mcp-server/` built as `s1-knowledge-mcp:probe`, `KB_API_BASE_URL` at the stub); `s1-hermes` (`--memory=2g --cpus=2 --security-opt no-new-privileges:true -p 127.0.0.1:18642:8642`, only the scratch data dir mounted, keys via the two `--env-file`s, a scratch `API_SERVER_KEY` generated into a 600 file and sent with `curl -H @file` / read by the client script, never printed).
3. A blobless clone of `leetusik/knowledge` in the data dir plus a scratch-only probe commit (`s1-probe`) with symlink and fake-secret fixtures; a stdio code MCP (`code_mcp.py`, hand-rolled JSON-RPC, git-object reads) attached to Hermes.
4. `ask.py` (budget guard: stops at 20 questions or $4.50) sent `q01` (session A), `q02` (session B), `q03` (session A) to `/v1/responses` with `stream: true`; all failed with `401 invalid x-api-key`, usage 0/0. `reconcile.py` over `agent.log`: 0 billed API calls, $0.0000.
5. `dumpinfo.py` / `dumpmsgs.py` over the preflight dumps: model, thinking, `output_config.effort: medium`, the five offered tools, per-session message sets, the masked key's last character (shape only).
6. `bridge_probe.py lockdown` (twice: before and after the guard plugin) and `bridge_probe.py web` / `web search`, run in the container as user `hermes` — results in `topics/hermes-fit.md` § Q1, § Q2, § Q3, § Q4.
7. `mcp_bench.py` on a fresh blobless clone (first reads, scoped and whole-repo grep); `gh_bench.py` on the host (option A); a full clone and a `git diff --shortstat <empty-tree> <sha>` prefetch on the host (option C and B+prefetch).

## Dead ends and surprises

- The first lockdown run tripped Hermes's MCP circuit breaker: three refused paths returned with `isError: true` paused the code server for 60 s for every session; fixed in the probe by returning refusals as normal results.
- The first blobless clone was hydrated by accident while building the fixtures (a 21.8 MB pack appeared during the plumbing commands), which made its grep look fast; the timings in the topic come from a second, untouched clone. `git read-tree`, `update-index` and `write-tree` alone did not fetch on a third clone; `git diff --shortstat <empty-tree> <sha>` is the batch prefetch that works on git 2.45/2.47 (`git backfill` needs 2.49).
- GitHub code search returned 0 hits for `NoneSel`, `identity_header` and `resolve_api_read`, all present at HEAD.
- Brave answered 429 to a search sent 0.0–0.3 s after the previous one.
- Hermes appends `_config_version: 51` to `config.yaml` and migrates it on first boot; it seeds 58 bundled skills into the home even with the skills toolset off.
- Reading the web app's `.env.local` for a bearer was denied by the session's permission layer; not retried (the plan named the main checkout's `.env`, which does not exist).

## Kept for the re-run (scratch, no secrets)

`kit/` (the final `config.yaml`, `SOUL.md`, `probe/code_mcp.py`, `probe/bridge_probe.py`, `probe/mcp_bench.py`, `plugins/reader-guard/`), `stub/kbapi_stub.py`, `tools/` (`ask.py` with the budget guard, `reconcile.py`, `wait_health.py`, `dumpinfo.py`, `dumpmsgs.py`, `gh_bench.py`, `envshape.py`, `envchars.py`), `out/` (probe outputs, the failed-turn SSE files, `ledger.jsonl`). The scratch dir is session-specific; if it is gone, `topics/hermes-fit.md` § Setup is enough to rebuild. Images kept: `nousresearch/hermes-agent:stable`, `s1-knowledge-mcp:probe` (remove with `docker rmi` if the operator picks the fallback).

## Notebook

Written to `phase.md` through `phase-section`: Decisions 2–8 (Hermes fit, serving, saved chats, knowledge-base key, web, code access, mapping), OQ1–OQ2, Notes for D1 and DECOMP2, Now. The detail behind each is `topics/hermes-fit.md`.
