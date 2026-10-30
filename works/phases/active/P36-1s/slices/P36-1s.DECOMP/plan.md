# P36-1s.DECOMP — decompose "Hermes: a chat agent beside the reader"

## Context

The operator wants a Hermes chat in the reader (`intent.md` is the record): it runs on the server on the open-source Hermes Agent (Nous Research), uses Claude Opus 5.5 at medium effort with the operator's key, and searches the web through Brave. It reads the document, the knowledge base, the document's code repos (read-only) and the web. On desktop it's a hideable side panel; on tablet and phone, a drawer. You can ask about the whole document or attach selected lines as context. Only members of the owning org can use it, and chats are saved per user per document. The design style is `build-after` and the mockup is on request.

This slice only cuts the phase. It runs on the high row, in the phase worktree, writes no product code and runs no Hermes or API call.

## What intake already established (inputs for the cut)

- **The box:** Oracle Ampere, `aarch64`, 4 cores and 23.7 GB RAM, with about 13 GB available and a load average of about 0.4. Hermes needs 1 core and 1 GB without browser tools, and it publishes `arm64` images.
- **Hermes facts** (from a clone at `ef35e8b9`):
  - It serves an OpenAI-compatible API (`/v1/responses`, `/v1/chat/completions`) that streams over SSE, reports tool progress and keeps sessions by `X-Hermes-Session-Id`.
  - Its Anthropic adapter knows `claude-opus-5-5`, where thinking is mandatory, and maps effort to `output_config.effort`, with medium as the default.
  - Its toolsets can be turned off. Its `file` toolset includes `write_file` and `patch`, so file access has to come from somewhere else.
  - It is an MCP client.
  - Brave is search-only, so reading a page's content needs a second backend.
  - One gateway runs per data directory, and memory and skills are shared across sessions.
- **The hypothesis to test:** turn off every Hermes toolset except web search and page extract. All document and code access then goes through MCP servers we control:
  - the existing `knowledge-mcp` (`search` and `fetch_document`, which forwards a `vk_` bearer);
  - a small read-only code MCP, confined to the allowed repos, with secrets always denied.
- **Keys:** this machine has neither `ANTHROPIC_API_KEY` nor `BRAVE_SEARCH_API_KEY` in its environment. `gh` is signed in, and Docker and `uv` are present.

## The cut (bare folders: no plan is pre-filled)

| Slice | Kind / risk | Order | Declared deps | Spends money |
|---|---|---|---|---|
| `P36-1s.S1` Hermes fit and code access | `research` / `high` | 1 | `--depends-on none` | **yes, ~$2–5** through the Claude API (Opus 5.5, 10–20 test questions), plus Brave's free tier |
| `P36-1s.D1` chat design, a wave of 3 jobs | `co-work` / `high` | 2 | none (barrier) | no |
| `P36-1s.DECOMP2` the build cut | `decomposition` / `high` | 3 | none (barrier) | no |
| `P36-1s.REVIEW` (already exists) | review | last | — | — |

`DECOMP2` has both origins here: it reads S1's findings and D1's signed design, then cuts the backend slices first and the reader build after them.

### S1's questions, to record in its breakdown block

S1's `plan.md` is written at its turn, so these are recorded here only as the slice's goal.

1. **Hermes lockdown:** run the pinned `arm64` image locally with a scratch `HERMES_HOME`, behind its API server, and check:
   - Opus 5.5 at medium effort actually reaches the API;
   - only the web toolsets are on, and memory capture, the curator and skills self-improvement are off;
   - a request to write a file or run a command fails;
   - two sessions are isolated from each other;
   - SSE tool-progress events arrive in a shape the reader can render;
   - idle and in-use memory (RSS) and cold-start time.
2. **Web search:** Brave search works. Choose the page-extract backend (the keyless ring sends queries to third parties; Firecrawl's free tier is the alternative).
3. **Knowledge-base access** through `knowledge-mcp` attached as an MCP server.
4. **Code access without copying.** Compare:
   - (A) the GitHub API on demand, through GitHub's MCP server or a small one of our own, with a read-only fine-grained token: rate limits, the limits of code search, and pinning to a commit;
   - (B) a blobless partial clone on the box, plus a read-only code MCP with path confinement and a secrets denylist;
   - (C) a full clone, the fallback.

   Recommend one. Also propose where the mapping from a project to its repos lives, since documents carry no repo metadata today.
5. **Saved chats:** decide the source of truth for "saved per user per document" (Postgres, which needs a migration, versus Hermes's own `state.db`). Decide where the members-only check and the daily spend cap are enforced. Sketch the request path: browser → BFF → FastAPI → Hermes.
6. **If Hermes cannot be confined safely,** return `needs_operator` with the fallback named (keep the Hermes name on the Claude API directly). Never decide that alone.
7. **Findings** go into `phase.md` as gist lines, with the detail in `topics/hermes-fit.md`. No product code.

**Operator action needed before S1 runs:** put both keys in `~/.config/knowledge/hermes-research.env` (`ANTHROPIC_API_KEY=…` and `BRAVE_SEARCH_API_KEY=…`, `chmod 600`, outside the repo). S1 passes it to Docker with `--env-file` and never prints or commits it. If the file is missing, S1 returns `needs_operator`. S1 reads GitHub through the existing `gh` sign-in, read-only.

### D1: three design jobs in one wave, each with critique level `critic`

1. **The chat shell:**
   - a desktop side panel beside the reader column that can be hidden, with the choice remembered;
   - a drawer on tablet and phone;
   - the thread list and "New chat", and the composer;
   - empty, loading and error states, including "daily cap reached" and "Hermes unavailable";
   - absent for non-members and on public views.
2. **The conversation:**
   - your message with its attached excerpts;
   - the streamed answer;
   - collapsible tool-step lines;
   - the three kinds of citation: a document anchor, a code snippet with `path:line`, and a web link;
   - Stop and Retry.
3. **Selection to context:**
   - the "Ask Hermes" action on the existing selection bar (`web/src/components/reader/annotations.tsx`);
   - removable context chips in the composer, several at once;
   - asking about a whole section from its heading;
   - clicking a citation scrolls the reader to the passage and highlights it briefly;
   - legacy HTML explainers get whole-document questions only.

All three stay inside the reader's existing design system (the P30 rounds).

## Build inventory (what to build, not how, for `topics/breakdown.md`)

- **Services:** a Hermes service container on the box, capped at 2 GB and 1.5–2 CPUs; the code-access path S1 chose, plus its read-only MCP if one is needed; the project-to-repos mapping.
- **Server (FastAPI):** the chat endpoints (ask with SSE, stop, list threads, get a thread, new thread); the members-only check; the daily and per-question spend cap read from usage; thread and message storage, with a migration if Postgres is chosen.
- **Web:** BFF routes, and the reader UI built to the signed design (panel, drawer, chips, selection action, citations).
- **Operations:** `compose.prod.yml`, the deploy and the edge if SSE needs it, and the box secrets (`ANTHROPIC_API_KEY`, `BRAVE_SEARCH_API_KEY`, and a GitHub token if option A wins).

## What the executor writes

- **`new-slice` three times**, as in the table above: `--depends-on none` on S1, nothing declared on D1 or `DECOMP2`, and the `DECOMP2` id exactly `P36-1s.DECOMP2`.
- **`topics/breakdown.md`**, containing:
  - `## Passes`;
  - `## Estimate`, from `dispatch-summary`'s `means`;
  - `## Build inventory`, with D1's three jobs and their critique level;
  - one `## <slice id>` block per slice, each giving the goal, the set, the risk and its trigger, `spends money:` and what it depends on.
- **`phase.md`**, through `phase-section` only:
  - a `## Decisions` gist line, `Breakdown (DECOMP): …`;
  - the operator action for the keys file in `## Now`.
- **`result.md`**, verdict block first. Its `parallel:` line is expected to be a chain: S1 and then the barriers.

The executor never runs `accept-gate`, never commits, and never writes another slice's `plan.md`.

## After it returns (orchestrator)

1. `record-dispatch`, then `finish-slice P36-1s.DECOMP`, then `accept-gate P36-1s --require` (the phase changes the reader the operator sees), then `validate`.
2. Commit on the phase branch.
3. S1 spends money, so its plan comes back to the operator for approval before it runs.

## Verification

- `python3 scripts/workflow.py validate` passes.
- `parallel-plan P36-1s` shows S1, then D1, then `DECOMP2`, then `REVIEW`.
- `topics/breakdown.md` has every required section.
- `phase-section P36-1s Now` names the keys file.
- No product file is touched: `git status` shows only `works/`.

## Dispatch

route=high
reason=kind decomposition
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
