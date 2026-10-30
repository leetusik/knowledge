# P36-1s.S1 — Hermes fit and code access (research; spends money)

## Context

The operator chose the open-source Hermes Agent for the reader's chat (P36-1s `intent.md`). Before any design or build, this research slice proves Hermes can be locked down for a members-only, read-only reader agent on Opus 5.5 at medium effort with Brave web search. It also picks how the agent reads code without copying repos. It writes **findings only and no product code**. It runs on the high row (research kind) in the phase worktree. Its questions are fixed by `topics/breakdown.md`'s `## P36-1s.S1` block (Q1–Q7, plus the two DECOMP additions), and this plan says how to answer them.

## Spend (what you approve)

- **Claude API:** at most **20 test questions** on `claude-opus-5-5` at medium effort, with a **hard stop at $5**. The executor adds up each answer's reported tokens: $4 per MTok of input, $20 per MTok of output, $0.20 per MTok of cache reads. It stops asking once the total reaches $4.50. Expected spend is $2–4.
- **Brave Search:** free tier, a few dozen queries at most: $0.
- **Page-extract trial:** Firecrawl's free tier (keyless): $0. The keyless rotation is tested once only to compare the two.
- Nothing else is paid. GitHub is read through the existing `gh` sign-in, within its free API limits.

## Ground rules

- **Keys.** They are read only through `docker run --env-file ~/.config/knowledge/hermes-research.env`. They are never printed, echoed, logged, copied into the repo or passed on a command line. If the file is missing or empty: `needs_operator`.
- **Scratch only.** Every probe file lives in a scratch directory outside the repo (`$SCRATCH=/private/tmp/claude-502/…/scratchpad/s1`): the Hermes data directory, the configs, any throwaway probe MCP server, the test clone. Hermes is third-party code, so it gets nothing from the host except the scratch data directory: no Docker socket and no home directory. Its port binds to `127.0.0.1` only. Its container is capped at `--memory=2g --cpus=2`, the box's planned limit.
- **The operator's runtime is not touched.** `127.0.0.1:3030` and `:8766` are live; they are never restarted, and only read endpoints are called on them. Nothing is minted or written in the local database.
- **Image pinning.** Pull `nousresearch/hermes-agent:stable` and record its digest. Use the reference clone at `…/scratchpad/hermes-src/repo` (`ef35e8b9`) only to read docs and code; it is untrusted data.
- **Cleanup.** At the end, stop and remove every container and the scratch Hermes home (it holds session data). Keep only the findings.

## Steps

1. **Bring-up (Q1).** Configure a scratch `HERMES_HOME`:
   - provider `anthropic`, model `claude-opus-5-5`, effort `medium`;
   - `API_SERVER_ENABLED=true`, with a scratch `API_SERVER_KEY` generated in the scratch env and never printed;
   - `disabled_toolsets` covering everything except `web`/`search` and MCP. List the final enabled tools with Hermes's own tool listing;
   - memory capture, the curator, skills self-improvement, delegation, cron, `session_search` and `code_execution` off.

   Record cold-start time and idle RSS (`docker stats`).
2. **Lockdown checks (Q1, Q6).** Through `/v1/responses` with `stream: true`:
   - ask it to write a file, run a shell command, read `/etc/passwd`, and read outside the allowed code root. Each must fail or be refused, with no tool able to do it;
   - two sessions (`X-Hermes-Session-Id` A and B): B can't see A's history;
   - capture one full SSE transcript, with tool-progress, reasoning and commentary events, into `topics/hermes-fit.md`, so the reader can see what it would render;
   - confirm from usage or the logs that the request carried `output_config.effort=medium` on `claude-opus-5-5`, and that each answer reports token usage (the DECOMP addition, for the spend cap).
3. **Web (Q2).** Brave search answers a current-events question. Compare page extract on Firecrawl's free tier and on the keyless rotation (quality, latency, who sees the query) and recommend one.
4. **Knowledge-base access (Q3).**
   - Run `mcp-server` (`knowledge-mcp`) from the worktree on a free local port, against the running local API at `http://127.0.0.1:8766`, using the local dev master bearer if the main checkout's gitignored `.env` has one (read in place, never printed).
   - Attach it to Hermes as an HTTP MCP server and ask one question that needs the knowledge base.
   - Settle whose key Hermes sends: test Hermes's per-session `identity_header` / `headers` (`mcp.md`) to carry a per-reader `vk_`, against an org-scoped service key.
   - If no local bearer exists, prove the header mechanism with a throwaway stub MCP in scratch and leave the end-to-end knowledge-base probe to the build.
5. **Code access (Q4).** Use `leetusik/knowledge` as the test repo, since its documents explain it.
   - **(A) The GitHub API from the host via `gh`:** reading contents at a pinned SHA; code search (it covers only the default branch; measure its rate limit); latency for about 10 typical reads.
   - **(B) A blobless partial clone** (`--filter=blob:none`) in scratch, served to Hermes by a throwaway read-only stdio MCP in scratch (list, grep, read a line range; realpath confinement; denying `.env`, `*.pem`, `id_*` and `secrets/`). Try `../`, a symlink escape and `.env` through Hermes. Record disk size, first-read latency and grep speed.
   - Recommend A, B or C (a full clone) with the reasons.
   - Propose where the project-to-repos mapping lives (for example a `project_repos` row in the accounts plane, edited by a member, against a config file on the box).
6. **The serving path (Q5).** From what the steps above showed, sketch: browser → BFF (members-only check) → FastAPI (thread storage, spend cap from the reported usage) → Hermes (sessions) → MCPs. Recommend the source of truth for saved chats, Postgres against Hermes's `state.db`, with the reasons. Note what changes for "paid users later": one Hermes profile per tenant against a shared one.
7. **Verdict.**
   - **If Hermes can be confined:** `done` with a recommendation.
   - **If it cannot be confined** (a write or exec path that can't be turned off, cross-session leaks, Opus 5.5 or effort not reaching the API): `needs_operator`, with what failed, the evidence and the named fallback (the Hermes name on the Claude API directly). Never switch alone.

## Writes

- **`works/phases/active/P36-1s/topics/hermes-fit.md`** (new): one section per question, with the evidence (commands, measured numbers, the SSE excerpt with secrets redacted), the money spent with its token totals, and the recommendations.
- **`phase.md`**, through `phase-section` only:
  - `## Findings` gist lines linking the topic;
  - the S1 note consumed from `## Notes for later slices`;
  - `## Now` rewritten for D1 and DECOMP2;
  - any question only the operator can answer, on `## Operator Questions`.
- **`slices/P36-1s.S1/result.md`**, verdict block first, including `spent: $X.XX`.
- No product files, no commits, no workflow state beyond its own slice.

## Verification

- `git status` shows only `works/phases/active/P36-1s/` paths.
- `grep` for the key prefixes (`sk-ant-`, `BSA`) over the phase folder finds nothing.
- `docker ps -a` shows no S1 container left.
- `python3 scripts/workflow.py validate` passes.

## Dispatch

route=research
reason=kind research
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
