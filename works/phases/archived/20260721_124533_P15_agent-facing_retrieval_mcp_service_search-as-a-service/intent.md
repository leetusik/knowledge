# Intent — P15

- Captured at: 2026-07-16T21:41:02+09:00
- Origin: operator (via the hi2vi_web coding agent — cross-project coordination; see Notes)

## Original Input (verbatim)

The operator's request arrived while working in the sibling **hi2vi_web** project (building a
customer-service chatbot). Verbatim, on how that bot should get its knowledge grounding:

> "well, I want it to be able to get information from the knowledge not hi2vi search. and even
> the hi2vi search, I want let the knowledge handle that(if it's good practice?). since we
> eventually want to offer a search as a service, the knowledge will do that kind of job for
> other services. So, if it's not a big trouble, let the knowledge handle the search stuff. if
> the job is deffered, promote it and we are going to develop expecting the all the backlog of
> knowledge will done."

Follow-up (interface + who builds it):

> Interface = **MCP server over HTTP**. "the knowledge is progressing by it's own coding agent.
> you just create a phase for the task. and leave a note for the context(for the agent)."

## Confirmed Intent (refined + clarified)

Build the knowledge project's **agent-facing retrieval interface as an MCP server over HTTP** —
"search as a service" that any AI agent can consume as a tool. This is the reusable product
surface: the same interface serves hi2vi's own agents today and external paying customers later
(it **realizes/subsumes deferred job D6**, "Paid-plan retriever endpoint for external AI agents").

The server exposes knowledge retrieval as MCP tools, backed by the **existing frozen `/api/search`
+ embeddings** (do not rebuild retrieval — wrap and serve it):

- **`search`** (primary): input `{ query, project?, limit? }`; output a ranked, **size-capped**
  list of hits — each with `title`, `snippet` (the retrieval excerpt), and a resolvable source
  **`url`** (derive the public doc URL, e.g. `{KB_PUBLIC_BASE_URL}/{project}/{date}-{slug}/`).
  Corpus-scoped by the caller's credential.
- **`fetch_document`** (optional, for deeper grounding): by `rel_path`/`id` → full markdown
  (also size-capped). Ship if cheap; a `search`-only v1 is acceptable.

**Transport & auth:** MCP **Streamable-HTTP/SSE** (remote agents connect over HTTP, not stdio).
Authed by a **project (`vk_`) credential** (the existing tenancy model), scoped to that project's
corpus. Prefer a **versioned, stable tool contract** (consumers pin to it).

**Reachability:** must work both **container-to-container on the internal `changple_shared_network`**
(so a co-tenant agent reaches it by service name, no edge hop) **and** via the public
`https://knowledge.hi2vi.com/...` edge (for off-box / local-dev agents).

Scope note: this phase is **intent only** right now — the knowledge project's own coding agent
owns decomposition and execution. Reconcile **D6** into this phase during decomposition (promote
it in, or drop it as superseded — your workspace's call).

## Clarifications Resolved

- Q: Where should agent retrieval live — a shim in each consumer, or the knowledge project?
  — A: **The knowledge project** owns it (search as a service); consumers just connect.
- Q: What interface? — A: **MCP server over HTTP** (agent-native standard; reusable by any agent).
- Q: Who builds it? — A: **The knowledge project's own coding agent** (this phase hands it the
  task + context; the hi2vi agent only created the phase).

## Notes

**Cross-project context (why this phase exists now):** The sibling **hi2vi_web** project is
building a first-party customer-service chat widget (phase P18 there) backed by a locked-down,
hardened **OpenClaw** agent (Docker co-tenant on `changple_shared_network`). That CS agent needs
to ground its answers on hi2vi's knowledge. Rather than bolt a one-off retrieval shim into
hi2vi_web, the operator's decision is to make **this** the retrieval product — so hi2vi's CS bot
becomes the **first consumer** of the knowledge MCP service (real dogfooding), and the same surface
later serves external paying agents.

**First consumer = concrete requirements (hi2vi CS bot / OpenClaw):**

- OpenClaw will be configured with `mcp.servers.knowledge` pointing at this server's HTTP URL +
  a project key. It connects **remotely** (Streamable-HTTP/SSE), from a co-tenant container on
  `changple_shared_network` in prod (internal service-name URL) and from the operator's Mac in dev
  (public `https://knowledge.hi2vi.com` URL). So both reachability paths above are required.
- It needs the **`search`** tool returning grounded snippets it can cite. hi2vi's CS agent is
  instructed to append a source marker per used source, so **`title` + a resolvable `url`** in each
  hit matter (they surface as a citation chip in the widget).
- Corpus: hi2vi's content lives under knowledge projects **`hi2vi`** (content-agent research docs)
  and **`hi2vi_web`** (engineering explainers). Scope the hi2vi CS credential to at least `hi2vi`
  (consider both). The master `KB_API_TOKEN` maps to tenant #1 (public docs); a `vk_` project key
  is preferred for least privilege.

**Coordination with hi2vi_web P18 (parallel build):** hi2vi's OpenClaw config is being written to
THIS contract in parallel (its slice P18.S5). The coupling is intentionally loose — OpenClaw's
`mcp.servers` entry is just a URL + auth + allowed tool name, adjustable at install-time against
whatever this phase ships. **If you diverge from the shape above** (different tool name, params,
auth header, or transport), that's fine — just make the final contract explicit in this phase's
docs so hi2vi's install step can point at it. The hi2vi P18 recon of the current knowledge API
(routes, auth model, `/api/search` response shape, container topology) is captured in
`hi2vi_web/works/phases/active/P18/` if useful background.

**Stable-contract reminder:** the existing `/api/search` REST contract is frozen and consumed
elsewhere — this MCP server should sit **alongside** it (a new agent-facing surface), not replace
it.
