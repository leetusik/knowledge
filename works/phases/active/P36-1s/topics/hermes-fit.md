# P36-1s — Hermes fit and code access (S1 findings)

Written by `P36-1s.S1` (2026-10-30), first dispatch. **Status: partial.** Everything that can be
proven without the model answering is proven below, at $0.00. The model never answered: the
Anthropic key in the operator's keys file was rejected (`HTTP 401: invalid x-api-key`; the value
ends in a stray `$`, see *Spend*). The checks that need a real answer are listed in *Still open*;
they need the key fixed and one short re-run of S1.

Evidence lives in this file; the probe kit (configs, scripts, raw outputs) was in the slice's
scratch directory outside the repo and is gone with the cleanup, except the scripts kept for the
re-run (see `result.md`).

## Setup

- **Image:** `nousresearch/hermes-agent:stable`, digest
  `sha256:9c5561579f3ffdf333401797094ac3a743738d6c25d40f4331c7bf77b694238d`, `linux/arm64`,
  1.05 GB, built 2026-10-23; reports `version: 0.22.5` on `/health`. Python 3.14, `mcp` SDK 2.3.0,
  git 2.47.3. Entrypoint is s6-overlay `/init`, which starts as root, chowns `/opt/data`, then runs
  everything as user `hermes` (uid 10000). `/opt/hermes` (the install) is read-only to that user;
  the image sets `HERMES_WRITE_SAFE_ROOT=/opt/data`.
- **Run:** `docker run -d --network s1-net --memory=2g --cpus=2 --security-opt
  no-new-privileges:true -p 127.0.0.1:18642:8642 -v <scratch>/data:/opt/data --env-file <keys file>
  --env-file <scratch env> nousresearch/hermes-agent:stable gateway run`. Only the scratch data dir
  is mounted; no Docker socket, no home dir. Keys reached the process only as env vars; Hermes
  wrote no key to disk (its migrated `/opt/data/.env` is the template, no key values).
- **Config** (`/opt/data/config.yaml`, the parts that matter):
  - `model: {provider: anthropic, default: claude-opus-5-5}`; `agent.reasoning_effort: medium`;
    `agent.max_turns: 16`.
  - `platform_toolsets.api_server: [web, knowledge, code]` (`knowledge`, `code` = the two MCP
    servers) and `agent.disabled_toolsets:` every other toolset (terminal, file, code_execution,
    browser, computer_use, vision, video, image_gen, video_gen, tts, skills, memory,
    session_search, delegation, cronjob, todo, clarify, connections, project, bot_room,
    desktop_ui, onboarding, catalog, kanban, context_engine, x_search, discord*, yuanbao, feishu*).
  - `memory: {memory_enabled: false, user_profile_enabled: false, nudge_interval: 0}`;
    `skills.creation_nudge_interval: 0`; `curator.enabled: false`;
    `auxiliary.background_review.enabled: false`; `auxiliary.title_generation.enabled: false`;
    `terminal.cwd: /opt/data/empty-cwd` (no context files picked up).
  - `web: {search_backend: brave-free, extract_backend: firecrawl, keyless_fallback: false,
    keyless_rescue: false}`.
  - Second layer (added mid-probe): `plugins.enabled: [reader-guard]` (a 40-line plugin, below)
    and `approvals.deny: ["*"]` (blocks every terminal command, even under yolo).
  - `mcp_servers.knowledge: {url: http://s1-kmcp:9000/mcp, headers: {Authorization: "Bearer
    ${KB_SERVICE_KEY}"}, tools: {resources: false, prompts: false}}`;
    `mcp_servers.code: {command: python, args: [/opt/data/probe/code_mcp.py], env: {...}}`.
- **Cold start:** `/health` answered 9.8 s after the container started on a fresh home (stage2
  setup, config migration 0→51, 58 bundled skills synced, s6 services, MCP discovery); 19.7 s on a
  restart with the extra plugin. The MCP servers register at about 7.5 s.
- **Memory (`docker stats`):** idle 319 MiB (gateway Python ≈ 282 MiB RSS, code MCP 17 MiB, MCP
  supervisor 26 MiB), 35 pids; 435 MiB / 58 pids while the code MCP was grepping and a probe
  process was attached. Model-turn RSS is still open. Well inside the 2 GB cap.
- **Listening sockets inside the container:** only `0.0.0.0:8642` (the API server) plus two
  loopback ports; no dashboard is exposed.

## Q1

**Lockdown.** **What the model is offered.** Hermes's own listing (`hermes tools list --platform api_server`):
only `web` enabled among built-ins, MCP servers `knowledge` and `code`. The request body Hermes
sent to the API (captured with `HERMES_DUMP_REQUESTS=1`, preflight dump) carried exactly five
tools: `web_extract`, `web_search`, `tool_search`, `tool_describe`, `tool_call`. The MCP tools sit
behind Hermes's *tool search* bridge (`tool_search` finds, `tool_call` runs). System prompt:
4,711 characters (our `SOUL.md` plus Hermes's tool guidance).

**What the bridge can reach.** The session-scoped bridge catalog is exactly
`web_search, web_extract, mcp__code__{list_repos,list_files,read_file,grep},
mcp__knowledge__{search,fetch_document}` (after `tools: {resources: false, prompts: false}`
dropped the four MCP utility tools).

**Write / exec / read attempts, driven through Hermes's own dispatcher with the API server's
scope, no model involved** (`model_tools.handle_function_call`, the function the agent loop
calls):

| Attempt | Through the bridge (`tool_call`) | As a direct tool name |
|---|---|---|
| `terminal` `id` | blocked: "not available in this execution context" | **ran (`uid=10000(hermes)`) before the guard plugin**; blocked by `reader-guard` after |
| `write_file /tmp/s1-pwned.txt` | blocked | denied by `HERMES_WRITE_SAFE_ROOT` before; blocked by `reader-guard` after |
| `read_file /etc/passwd`, `patch`, `execute_code`, `delegate_task`, `memory`, `cronjob_manage`, `session_search`, `skill_manage`, `browser_exec`, `manage_connections` | all blocked | — |
| `tool_search` for "run a shell command", "write or edit a file", "read a local file", "remember something", "schedule a job" | no matches; only `code` (4 tools) and `knowledge` (2) listed | — |
| `web_extract` of `http://s1-kmcp:9000/healthz`, `http://169.254.169.254/…`, `http://127.0.0.1:8642/health`, `file:///etc/passwd`, `http://host.docker.internal:8766/api/health` | — | all blocked by Hermes's SSRF guard ("private or internal network address", "unsupported URL scheme") |

**Reading of the direct-name row.** Disabled toolsets are removed from what the model is offered
and from the bridge, but the tools stay registered in the process, and the dispatcher function
does not re-check the session scope for a direct name. The agent loop does
(`agent/turn_tool_validation.py` errors any tool name outside the session's `valid_tool_names`),
so a model cannot reach `terminal` today; but that is one check. The `reader-guard` plugin adds an
independent one: a `pre_tool_call` hook that blocks every tool not on an 11-name allowlist
(Hermes fails a `pre_tool_call` hook **closed** on timeout or exception). With it, both direct
attempts were blocked. `approvals.deny: ["*"]` is a third, terminal-only layer. **Verdict: Hermes
can be confined**, on the condition that the build ships the guard plugin and the deny rule, not
just `disabled_toolsets`. The live attempt (the model asked to write, run, read `/etc/passwd`) is
still open; it can only end in refusal or one of the blocked rows above.

**Other confinement facts.**
- Memory, curator, background review and title generation are off in config; with the key
  rejected no turn completed, so "no auxiliary call fires" is confirmed only for the failed turns
  (no auxiliary LLM call appears in `agent.log`). The aux client resolves to the main provider
  (Opus 5.5) when none is set (`Vision auto-detect: using main provider anthropic`), so any aux
  task that does fire (context compression on a long thread) bills Opus unless routed elsewhere.
- The in-process cron scheduler still ticks (no jobs; the cron tool is off; the Jobs API needs the
  API server key).
- 59 of 63 bundled plugins load by default (achievements, kanban routes, web providers…); none
  adds a model-visible tool in this scope.
- The API server logs a warning at start: it is bound to `0.0.0.0` with the `local` terminal
  backend. In the product it must stay on the compose network, never published.

## Q6

**Two sessions.** `/v1/responses` keys a conversation by `X-Hermes-Session-Key` (or `previous_response_id` /
`conversation`); `X-Hermes-Session-Id` is honoured on `/v1/chat/completions` and `/v1/runs`, not as
an input on `/v1/responses` (the plan named the header; this used the one the endpoint reads).
- Key `reader-A` → session `60a83686…`; key `reader-B` → a different session `8767cbb1…`; a
  second `reader-A` request reused `60a83686…`.
- Session B's request body (preflight dump) held only B's own message; A's code word
  `ALPHA-7391` appeared in no B request. A's failed first turn was not kept in A's history (Hermes
  drops failed turns), so "A remembers, B does not" with real history is still open.
- Whoever holds `API_SERVER_KEY` can name any session key or id, so the browser must never choose
  one: FastAPI derives it from (user, thread).

## SSE shape

Captured on the failure path only (a full transcript with tool steps is still open). On
`/v1/responses`: `response.created` → `hermes.status` (`{"kind": "lifecycle", "text": "❌
Anthropic rejected the request …"}`) → `response.output_item.added` (message) →
`response.output_text.delta` → `response.output_text.done` → `response.output_item.done` →
`response.failed`. The failure text is written **as an assistant message** aimed at an operator
("Update it in Settings → Providers, or run `hermes setup`"), so the reader must map a failed run
to its own unavailable state and never render Hermes's text. Keep-alive comment lines (`:`) every
10 s.

Documented success-path events (from Hermes's API-server docs, to confirm live):
- `/v1/responses`: `function_call` / `function_call_output` output items for tool steps,
  `reasoning` items with `response.reasoning_summary_text.delta`, mid-turn commentary as a
  `message` item with `phase: "commentary"`, final `response.completed` with `usage`.
- `/v1/runs/{id}/events`: `tool.started` (`tool`, `preview` of args), `tool.completed` (`tool`,
  `duration`, `error`, `preview` of the result, redacted, ≤ 500 chars), `message.delta`,
  `message.interim` (commentary), `reasoning.available`, terminal `run.completed` /
  `run.failed` / `run.cancelled` carrying `usage` and `runtime`.

## Effort and usage (the spend cap)

- **Effort reaches the request.** Every request body Hermes built for Opus 5.5 carried
  `model: claude-opus-5-5`, `thinking: {type: adaptive, display: summarized}`,
  `output_config: {effort: medium}`, `tool_choice: auto`, `max_tokens: 128000` (from
  `agent/anthropic_adapter.py:_thinking_kwargs`, and seen in both preflight dumps). That the API
  accepted it is open (the key was refused first).
- **Per-answer usage.** `/v1/responses` reports only `input_tokens`, `output_tokens`,
  `total_tokens` (`gateway/platforms/api_server.py:_USAGE_TOKEN_KEYS`) — no cache split, so cached
  input cannot be priced right from it. `/v1/runs` reports `cache_read_tokens` and
  `cache_write_tokens` too, and `runtime` (provider/model actually served). Every provider call
  is also logged (`API call #n: model=… in=… out=… cache=…/… write=…`) and can be tapped per call
  with a `post_api_request` hook (main loop) and `post_auxiliary_call` (side tasks such as
  compression), which the guard plugin does. Live numbers are open.
- `max_tokens: 128000` per call is a ceiling, not a cap ($2.56 of output at worst for one call);
  the per-question bound in the build is `agent.max_turns` plus `agent.run_budget_seconds` plus
  FastAPI's stop (`POST /v1/runs/{id}/stop`).

## Q2

**Web.** Called through Hermes's own `web_search` / `web_extract` tools inside the container (no model).
- **Brave search works:** 0.8–1.3 s, good results (e.g. "Python 3.15 release date" → python.org
  release page first). **Free tier is 1 query per second:** a second search 0.0–0.3 s after the
  first returned `HTTP 429`; after a 1.2 s gap it succeeded. Hermes does not space searches, and a
  model often searches twice in one step, so one of a pair can fail. Brave sees the query text,
  which the model writes from the reader's question.
- **Page extract (who sees what: the extract vendor sees the URL, never the question):**

| Backend (keyless) | python.org docs | Wikipedia | GitHub repo page | Notes |
|---|---|---|---|---|
| Firecrawl | 1.6 s, 15,439 chars | 1.7 s, 15,022 | 1.0 s, 15,371 | full page markdown incl. nav chrome; all 3 served |
| Parallel | 1.0 s, 15,312 | 1.2 s, 15,244 | 3.0 s, 3,536 (metadata summary) | cleanest content; random per-process session id sent |
| Exa | 0.3 s, 3,104 | 0.3 s, 3,046 | failed (`CRAWL_LIVECRAWL_TIMEOUT`, 10 s) | short excerpts |
| Keenable | failed: needs a key | failed | failed | not keyless any more |

  The "keyless rotation" is therefore Exa / Parallel / Firecrawl round-robin: quality varies call
  by call and each URL goes to a different vendor. With a Brave key present, Hermes autodetects
  `brave-free` for extract too (search-only), so the ring is reachable only as a one-shot rescue.
- **Recommendation:** search on Brave (free), extract pinned to Firecrawl keyless
  (`extract_backend: firecrawl`; 500 credits a month free with a key if the keyless tier
  throttles), `keyless_fallback: false` and `keyless_rescue: false` so no query or URL silently
  goes to another vendor. Parallel is the runner-up on content quality.

## Q3

**Knowledge base.**

- `knowledge-mcp` built from this worktree's `mcp-server/` (unchanged) ran in a container against
  a **stub** of the two read routes it proxies (`/api/search`, `/api/documents/{id}`), attached to
  Hermes as an HTTP MCP server. Hermes registered `search` and `fetch_document`, and both answered
  through Hermes's dispatcher (0.04 s, 0.03 s). The stub logged every upstream call carrying the
  configured service bearer and nothing else.
- **No live knowledge-base probe:** the main checkout has no `.env` (no local master bearer at the
  place the plan named), and a successful `/api/search` in tenant mode is metered
  (`EVENT_SEARCH`, `server/main.py`), i.e. it writes a usage row, which the plan forbids. The
  end-to-end probe belongs to the build, against a test tenant.
- **Whose key Hermes sends:** Hermes's MCP headers are fixed per process: `headers` (with `${ENV}`
  substitution) and `identity_header` with `value_from: static | profile`, resolved once at
  connect time; MCP connections are shared by every session of a profile; Hermes forwards no
  session id to MCP calls. **There is no per-session header**, so a per-reader `vk_` key cannot
  ride through Hermes. Decision: Hermes sends one **org-scoped service key** of the owning org
  (an org-level `vk_`, `project_id NULL`), and FastAPI enforces "signed-in member of that org"
  before any question reaches Hermes. That equals the reader's visibility while the reader is a
  member (today only the operator).
- **Paid users later:** one Hermes profile per tenant (its own `.env` with that tenant's service
  key and its own `API_SERVER_KEY`, served under `/p/<profile>/` by one gateway) rather than one
  shared profile, so a tenant's key and sessions never share a process scope with another's.

## Q4

**Code access without copying.** Test repo `leetusik/knowledge` (public; 449 commits, 3,698 files at `4d04d947`).

| | A: GitHub API on demand (`gh`, host) | B: blobless partial clone + read-only code MCP | C: full clone |
|---|---|---|---|
| Disk | 0 | 1.1 MB after clone (commits + trees, no blobs); +≈0.02 MB per file read | 25 MB `.git` + 59 MB checkout |
| First read of a file | 0.35–0.56 s (mean 0.41 s, 10 reads, incl. `gh` start-up) | 0.52–0.66 s (lazy blob fetch, 11 reads); 0.03 s once fetched | local |
| Listing | `git/trees/<sha>?recursive=1` 0.8 s | `ls-tree` 0.02 s | local |
| Grep | code search: **0 hits** for three identifiers that exist at HEAD; default branch only; no regex; 10 requests/min | lazy: **174 s** for `web/src` (≈ 300 blobs, fetched one by one); whole repo timed out at 300 s. After a one-shot batch prefetch of the pinned commit (`git diff --shortstat <empty-tree> <sha>`: **3.4 s**, +22 MB), grep through the MCP in 0.35 s | 0.06 s |
| Pin to a commit | `?ref=<sha>` | every read at the pinned commit | checkout / `git show` |
| Rate limits | 5,000 core requests/h per token | none (git over HTTPS) | none |
| Credentials on the box | a token on every read | a read-only deploy key or token for fetches, held by the code MCP only | same as B |

**B's confinement, tested through Hermes** (code MCP over stdio; a scratch-only probe commit added
symlinks `escape-link → ../../../.env`, `escape-abs → /etc/passwd`, and fake `.env`,
`deploy/id_rsa`, `secrets/token.txt`, `config/server.pem`):
- `../../.env`, `web/../../../.env` → "'..' is not allowed in a path"; `/opt/data/.env`,
  `/etc/passwd` → "absolute paths are not allowed"; `escape-link`, `escape-abs` → "not a regular
  file (mode 120000); symlinks … are not followed"; `.env`, `deploy/id_rsa`, `secrets/token.txt`,
  `config/server.pem` → "on the secrets denylist"; repo `hermes` → "not an allowed repo".
  `list_files` hid the denylisted paths (it also hides `.env.example`); `grep` for the canary in
  the fake secrets found nothing. `README.md` read normally.
- Reads go through git objects (`ls-tree`, `cat-file blob <sha>:<path>`), never a filesystem path,
  so `..` and symlinks cannot escape by construction; the lexical checks and the tree-entry mode
  check are belts on top.
- **Hermes MCP circuit breaker:** Hermes counts `isError: true` tool results; 3 in a row pause
  that server for 60 s, process-wide (every session of the profile). The first run tripped it
  after three refused paths. The code MCP must return refusals as normal results (it did on the
  second run), or one confused or adversarial thread takes code access offline for everyone.

**Recommendation: B with a pinned-commit prefetch.** It reads at an exact commit (citations as
`repo/path:line @ sha`), cannot be steered outside the repo, needs no checkout, and its fetch
credential stays in the code MCP. The prefetch keeps one commit's files (≈ the tree's size, 22 MB
here) and no history; that is the smallest copy that makes grep usable. A is out (code search is
unreliable and branch-bound); C is the fallback if prefetching proves fragile. In production the
code MCP should be **its own container** (read-only mounts of the clones, no Hermes data dir),
attached over HTTP, rather than a stdio child inside Hermes as in this probe.

**Where the project → repos mapping lives (proposal).** A `project_repos` table in the accounts
plane (Postgres): `project_id`, `provider` (`github`), `owner`, `repo`, `ref` (branch to follow),
`pinned_sha` (what reads use; advanced by a fetch job), `added_by`, timestamps; edited by an org
member in project settings, read by FastAPI when it starts a run (the allowed repos go to the code
MCP per run). Documents already carry a `source_repo` hint (`server/db.py`), but local paths are
sanitised to a basename (`server/documents.py:sanitize_source_repo`), so it can seed a suggestion,
not the mapping. A config file on the box was rejected: it needs a deploy to change and is
invisible to members.

## Q5

**The serving path.**

```
browser ──(session cookie)──▶ web BFF /api/chat/*          (SSE pass-through, no Hermes key)
   ──▶ FastAPI /app/chat/*                                  (members-only check: signed-in member
        │                                                    of the document's org; daily cap check;
        │                                                    thread + messages in Postgres)
        ├─▶ Hermes POST /v1/runs {session_id: <thread id>, input, instructions: doc context}
        │      Idempotency-Key; GET /v1/runs/{id}/events (SSE) ─▶ re-emitted to the BFF
        │      POST /v1/runs/{id}/stop  ◀── "stop" button
        │      run.completed.usage (input / output / cache read / cache write) ─▶ cost ledger
        └─ Hermes (compose network only, API_SERVER_KEY held by FastAPI)
              ├─ MCP knowledge-mcp (org service vk_ key) ─▶ /api/search, /api/documents
              ├─ MCP code (own container, read-only clones, pinned shas)
              └─ web: Brave search, Firecrawl extract
```
- **Use `/v1/runs`, not `/v1/responses`:** it carries the cache split for pricing, lets FastAPI
  name the session after its own thread id, has stop and idempotency, and its events are already
  tool-step shaped.
- **Saved chats: Postgres is the source of truth** (threads per user per document; messages with
  tool steps, citations and per-run usage). Hermes's stored responses are capped (100, LRU, per
  its docs) and its `state.db` is internal and per-profile; treat Hermes sessions as a cache keyed
  by thread id, and if Hermes has lost one, re-send the thread as `conversation_history` (which
  Hermes treats as authoritative).
- **Spend cap:** FastAPI prices each run from `run.completed.usage` (Opus 5.5: $4/MTok input,
  $5 cache write, $0.20 cache read, $20 output) and refuses new runs past the daily cap; per
  question, `agent.max_turns` + `agent.run_budget_seconds` + stop. Route `auxiliary.compression`
  to a cheaper model, and meter aux calls with `post_auxiliary_call`.

## Build checklist

For DECOMP2.

1. Pin the image by digest; `/opt/data` on a **named volume** (Hermes keeps `state.db` in WAL,
   which its docs say concurrent writers corrupt on a bind mount that crosses a VM boundary; the
   probe's Docker Desktop bind mount still ran WAL, `state.db-wal` present, so the detection is
   not to be relied on); `--memory=2g --cpus=2`; `no-new-privileges`; API server on the compose
   network only.
2. The config above, plus the `reader-guard` plugin (`pre_tool_call` allowlist; usage taps) and
   `approvals.deny: ["*"]`; set `HERMES_WRITE_SAFE_ROOT` to an empty directory.
3. `tools: {resources: false, prompts: false}` on each MCP server; the code MCP returns refusals
   with `isError: false`.
4. Never show Hermes's own error text to readers; map `run.failed` to the unavailable state.
5. Brave's 1 query/s: decide between living with an occasional failed search, a paid plan, or
   the keyless rescue for search only (OQ below).

## Spend

- **$0.00.** Three requests reached the Claude API (`q01` session A, `q02` session B, `q03`
  session A); all three were refused with `HTTP 401: invalid x-api-key` before any tokens were
  billed (usage 0/0). No other paid call was made; Brave (≈ 6 queries) and Firecrawl/Exa/Parallel
  keyless extracts (12 pages) are free tiers; GitHub reads used ≈ 16 core requests and 3 code
  searches of the `gh` sign-in's free quota.
- **Why the key failed:** the `ANTHROPIC_API_KEY` value in the keys file is 100 characters and its
  last character is `$`, which no Anthropic key contains (a likely copy artefact); Hermes's masked
  copy in the request dump ends in the same `$`. S1 did not edit or copy the file.

## Still open

Needs a working key: at most 8 questions, about $1–2, inside the approved $5.

1. One web question (Brave search → Firecrawl extract → cited answer): full `/v1/runs` events
   transcript **and** the `/v1/responses` SSE for the same kind of turn, with tool steps,
   reasoning summary and commentary, into this file.
2. One knowledge-base question through the stub (search → fetch → cited answer).
3. One code question (grep → read_file → `path:line @ sha` citation).
4. Session A states a code word; session B asks for it (must not know); A asks again (must know).
5. The model asked to write a file, run `id`, read `/etc/passwd`, and read `../../.env` through
   the code tools: refusals or blocked rows only.
6. Usage per answer vs. the per-call log and the guard plugin's tap; confirm no auxiliary call;
   in-use RSS during a turn.
