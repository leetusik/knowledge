# P36-1s — breakdown

Written by `P36-1s.DECOMP` (2026-10-30). The record is `intent.md`; this file says how the
work is cut and what each slice must not trip over. `DECOMP2` rewrites it in place.

## Passes

- **DECOMP** (2026-10-30): `build-after`, mockup on request. A chain:
  `S1` (research) → `D1` (co-work wave of 3 jobs) → `DECOMP2` → `REVIEW`. No build slice
  is cut here: the design decides what gets built, and S1's findings decide how the backend
  is shaped (Hermes confinement, code access, chat storage). `DECOMP2` has both origins
  here: it reads S1's findings and D1's signed design.
- **DECOMP2** (at its turn): cuts the build, backend first, then the reader UI, then any
  fidelity fix, from `topics/hermes-fit.md`, D1's signed rounds' `## Build` and the
  inventory below.

## Estimate

From `dispatch-summary`'s `means` (2026-10-30), read over the main checkout's transcripts
with `--transcripts /Users/sugang/.claude/projects/-Users-sugang-projects-personal-knowledge`
(the worktree's own transcript folder holds only this span). By route, min/span: high 78.1,
research 24.2, design 62.8, critic 80.4, mid 17.8. By kind, span-min/slice: research 24.6,
co-work 735.9 (11.8 spans/slice), decomposition 8.8, implementation 24.8, fix 121.3,
review 237.2.

- DECOMP ≈ 9 min.
- S1 ≈ 25 min at the research mean, up to ≈ 80 (one high span): pulling and probing a
  live Hermes image, 10–20 test questions and three code-access options make it heavier
  than the mean.
- D1 ≈ 430–740 span-min: 3 drafter spans (≈ 63 each), 3 critic spans (≈ 80 each) and up
  to 3 answer rounds, against the co-work mean of ≈ 736. A wave drafts and critiques in
  parallel, so wall time is ≈ 3.5 h plus the operator's read-back, sign-off and any
  superseding round.
- DECOMP2 ≈ 9–80 min (the decomposition mean, up to one high span).
- Build (provisional; DECOMP2 cuts it): about 8 slices from the inventory, half on the mid
  row (≈ 25 each) and half high on core-invariant triggers (schema, auth, money: ≈ 78
  each) ≈ 410 span-min, plus about one fix (≈ 121) ≈ 410–530.
- REVIEW ≈ 237 (gated, with a real-browser walk).
- Phase: about **1,100–1,700 span-min (≈ 19–28 h of span time)**; wall time is shorter
  where a wave runs in parallel. Operator time (the keys file, the design read-back, the
  gate walk) is not in it.

## Join-rebuilt artifact

None in this pass: no slice here builds anything. If two of DECOMP2's build slices add
dependencies, the lockfile they share (`uv.lock`, `web/package-lock.json`) is the phase's
join-rebuilt artifact, and DECOMP2 names it with its rebuild command.

## Build inventory

What to build, not how; one line per candidate. D1's design and S1's findings may add to it
and cut from it.

**Services**
- A Hermes Agent service container on the box: the pinned `arm64` image, capped at 2 GB and
  1.5–2 CPUs, only the web toolsets on, its API server private to the compose network, with
  `knowledge-mcp` and the code-access MCP attached as its MCP servers.
- The code-access path S1 chooses (A: the GitHub API on demand; B: a blobless partial clone
  plus a read-only code MCP; C: a full clone), plus its read-only MCP if one is needed (path
  confinement to the allowed repos, a secrets denylist that always applies).
- The project-to-repos mapping: where a document's project names its repos (documents carry
  no repo metadata today), at the place S1 proposes.

**Server (FastAPI)**
- The chat endpoints: ask (streamed over SSE), stop, list threads, get a thread, new thread.
- The members-only check: a signed-in member of the org that owns the document; nothing on
  public and anonymous views.
- The daily and per-question spend cap, read from usage (today's `server/usage` counts
  events, not cost).
- Thread and message storage, per user per document: Postgres with an Alembic migration, or
  Hermes's own `state.db`, as S1 decides.

**Web**
- BFF routes for the chat endpoints (the SSE stream passed through).
- The reader UI built to D1's signed design: the side panel, the drawer, the composer with
  its context chips, the selection-bar action, the conversation with tool steps and
  citations, and a citation's scroll-and-highlight in the reader.

**Operations**
- `compose.prod.yml`, the deploy, and the edge if SSE needs it (buffering, timeouts).
- The box secrets: `ANTHROPIC_API_KEY`, `BRAVE_SEARCH_API_KEY`, a page-extract key if S1's
  choice needs one, and a GitHub token if option A wins.

**D1's jobs: one co-work slice, a wave of 3, each at critique level `critic`**

The foundation is the reader's existing design system (the P30 rounds: namespace `kb`,
source `web/src/app/kb-tokens.css`), so every job extends it. Each is a new, central,
many-state surface, hence `critic`; none is public (members only), so none needs `judge`.
The slugs are proposals; `design-open` numbers the jobs (`10-`…`12-` today). Listed in the
order to open them, the most central first.

1. **`hermes-shell`: the chat shell** — `critic`.
   - A desktop side panel beside the reader column that can be hidden, with the choice
     remembered; a drawer on tablet and phone.
   - The thread list, "New chat", and the composer.
   - Empty, loading and error states, including "daily cap reached" and "Hermes
     unavailable".
   - Absent for non-members and on public views.
   - Not this job: the messages and citations (`hermes-conversation`); the context chips
     inside the composer and the selection action (`hermes-context`).
2. **`hermes-conversation`: the conversation** — `critic`.
   - Your message with its attached excerpts; the streamed answer.
   - Collapsible tool-step lines.
   - The three kinds of citation: a document anchor, a code snippet with `path:line`, and
     a web link.
   - Stop and Retry.
   - Not this job: the panel and its states (`hermes-shell`); what a citation's click does
     in the reader (`hermes-context`).
3. **`hermes-context`: selection to context** — `critic`.
   - The "Ask Hermes" action on the existing selection bar
     (`web/src/components/reader/annotations.tsx`).
   - Removable context chips in the composer, several at once.
   - Asking about a whole section from its heading.
   - Clicking a citation scrolls the reader to the passage and highlights it briefly.
   - Legacy HTML explainers get whole-document questions only.
   - Not this job: the composer's frame (`hermes-shell`); the citation's look in the
     answer (`hermes-conversation`).

## Out of scope

Paid or other users; any write tool or shell for the agent; line selection on legacy HTML
explainers (all from `intent.md`).

## P36-1s.S1

- **Name:** Hermes fit and code access. **Kind / risk:** `research` / `high`, by kind;
  the triggers are also open design (the confinement approach and the code-access
  architecture are both unpinned) and a core invariant (private code and the operator's key
  must stay confined).
- **Goal:** findings only, no product code. Its `plan.md` is written at its turn; these are
  its questions:
  1. **Hermes lockdown:** run the pinned `arm64` image locally with a scratch `HERMES_HOME`,
     behind its API server, and check:
     - Opus 5.5 at medium effort actually reaches the API;
     - only the web toolsets are on, and memory capture, the curator and skills
       self-improvement are off;
     - a request to write a file or run a command fails;
     - two sessions are isolated from each other;
     - SSE tool-progress events arrive in a shape the reader can render;
     - idle and in-use memory (RSS) and cold-start time.
  2. **Web search:** Brave search works. Choose the page-extract backend (the keyless ring
     sends queries to third parties; Firecrawl's free tier is the alternative).
  3. **Knowledge-base access** through `knowledge-mcp` attached as an MCP server.
     Added by DECOMP: `knowledge-mcp` forwards the caller's `Authorization: Bearer vk_…`
     upstream (`mcp-server/src/knowledge_mcp/__init__.py`), so settle whose key Hermes sends:
     a per-session header carrying the reader's own key, if Hermes allows one, or a service
     key scoped to the owning org (which equals the reader's visibility only while the
     reader is a member of that org).
  4. **Code access without copying.** Compare:
     - (A) the GitHub API on demand, through GitHub's MCP server or a small one of our
       own, with a read-only fine-grained token: rate limits, the limits of code search,
       and pinning to a commit;
     - (B) a blobless partial clone on the box, plus a read-only code MCP with path
       confinement and a secrets denylist;
     - (C) a full clone, the fallback.

     Recommend one. Also propose where the mapping from a project to its repos lives,
     since documents carry no repo metadata today.
  5. **Saved chats:** decide the source of truth for "saved per user per document"
     (Postgres, which needs a migration, versus Hermes's own `state.db`). Decide where the
     members-only check and the daily spend cap are enforced. Sketch the request path:
     browser → BFF → FastAPI → Hermes. Added by DECOMP: today's usage metering
     (`server/usage`, P11) counts events, not cost, so check that Hermes reports token usage
     per answer, which is what the cap would be read from.
  6. **If Hermes cannot be confined safely,** return `needs_operator` with the fallback
     named (keep the Hermes name on the Claude API directly). Never decide that alone.
  7. **Findings** go into `phase.md` as gist lines, with the detail in
     `topics/hermes-fit.md`. No product code.
- **Operator action before it runs:** put both keys in
  `~/.config/knowledge/hermes-research.env` (`ANTHROPIC_API_KEY=…` and
  `BRAVE_SEARCH_API_KEY=…`, `chmod 600`, outside the repo). S1 passes it to Docker with
  `--env-file` and never prints or commits it; a missing file means `needs_operator`. S1
  reads GitHub through the existing `gh` sign-in, read-only.
- **Set:** `works/phases/active/P36-1s/topics/hermes-fit.md` (new);
  `works/phases/active/P36-1s/phase.md` (through `phase-section`);
  `works/phases/active/P36-1s/slices/P36-1s.S1/`. No product file. Runtime it holds: the
  local Docker daemon, the Hermes API server's local port, a scratch `HERMES_HOME` outside
  the repo, the keys file (read only), the `gh` sign-in (read only), and the local dev stack
  (`compose.yml`) if the knowledge-base probe runs against it.
- **spends money:** yes, ~$2–5 via the Claude API (Opus 5.5 at medium effort, 10–20 test
  questions), plus Brave Search's free tier ($0); a page-extract trial on Firecrawl's free
  tier is $0. Its plan comes to the operator for approval.
- **Depends on:** nothing (declared `--depends-on none`).

## P36-1s.D1

- **Name:** chat design, a wave of 3 jobs. **Kind / risk:** `co-work` / `high`, by kind (a
  design slice is never `low`).
- **Goal:** the three jobs above drafted, critiqued at `critic` and signed by the operator
  on their canvases. It runs inline on the main thread (drafter and critic dispatched), ends
  at SIGNOFF, and writes no product code; an in-product mockup only if the operator asks
  for one (then the gate is re-declared in the mockup commit). Where S1's findings shape a
  state (the tool-step event shape, a code citation's `path:line` and commit, the cap and
  unavailable states), the handoff carries them. In a plain Markdown document the
  selection bar captures no anchor (`annotations.tsx`, `NoneSel`), which the
  `hermes-context` handoff should name.
- **Set:** the three new job folders under `docs/reference/design/jobs/` and the wave's
  folder under `docs/reference/design/waves/`, any `docs/reference/design/design.json`
  update `design-open` makes; `works/phases/active/P36-1s/slices/P36-1s.D1/`;
  `works/phases/active/P36-1s/phase.md`. Numbered sequence: the design job numbers.
- **spends money:** no (the drafter and critic are the workspace's own dispatches).
- **Depends on:** nothing declared: a barrier that runs alone, after S1 by order.

## P36-1s.DECOMP2

- **Name:** the build cut. **Kind / risk:** `decomposition` / `high`, by kind.
- **Goal:** cut the build slices from S1's findings, D1's signed rounds and the inventory:
  backend first (the Hermes service, code access, chat storage and its migration, the
  endpoints with the members check and the spend cap, the BFF), then the reader UI built to
  the signed design, then any fidelity fix. Rate the slices that touch the schema, the
  members-only check or the spend cap `high` (core invariant), the rest `low`. Give each
  slice that asks Hermes a live question its own `spends money: yes` line. If the operator
  chose the Claude-API fallback at S1, cut that instead. Rewrite this file in place and add
  a `Breakdown (DECOMP2): …` gist line in `## Decisions`, keeping this pass's.
- **Set:** `works/phases/active/P36-1s/topics/breakdown.md`; the new slice folders under
  `works/phases/active/P36-1s/slices/`; `works/phases/active/P36-1s/phase.md`.
- **spends money:** no.
- **Depends on:** nothing declared: a barrier that runs alone, after D1 by order.

## P36-1s.REVIEW

- Exists (`review` / `high`). The phase changes what the operator sees, so its gate is
  required, with a walkthrough in the runtime `## Operator Runtime` names. The phase runs in
  a worktree, so the review writes no doc versions; its two gate sections go to
  `## Doc impact` tagged for the merge.
- **spends money:** likely yes, ~$1–3 via the Claude API (live questions in the gate walk);
  its plan names the volume at its turn.
