# Phase P24: Upload finish-return timeout

_Intent: see [intent.md](intent.md)._

## Objective

Fix the changple5→knowledge prod upload experience where the document saves but the client reports a disconnect because it never receives the finish response in time — confirm the 5s client timeout vs synchronous git commit/push in POST /api/documents, then make the finish response reliable and its reporting honest.

## Context

changple5 prod publishes explainers to knowledge prod (`https://knowledge.hi2vi.com`)
through the same public `POST /api/documents` our `/explain` skill uses. The document
lands, but the caller reports a disconnect. There is no callback in this system — the
whole publish is one request — so "callback disconnected" can only mean the caller never
saw the 201.

## Decomposition

Three middle slices, all `high` (each writes real code across more than one file).
S1 is the actual fix; S2 and S3 make our own two clients honest about a timeout, and
both depend on S1's landed response shape.

| Slice | What it covers | Why separate |
|---|---|---|
| `P24.S1` | **Server: fast, bounded write response.** Take the two unbounded network stages off the pre-response path — the `git fetch`/`rebase`/`push` (`gitops.push`, currently inside `WRITE_LOCK`, in-request) and the Gemini embed — and run them after the 201 is sent; put a real `timeout=` on every git subprocess so no stage can hang forever even in the background; keep the response contract additive. | Server + `plugin/templates/kb/` mirror + `tests/test_api_push.py` (whose response-body `pushed` assertions this change invalidates) form one unit gated by `plugin_parity.py`. Splitting it would leave the mirror or the push tests red between slices. |
| `P24.S2` | **`/explain` skill honesty (3 copies).** Raise the publish POST's `--max-time` (with the matching `allowed-tools` prefix entry), and rewrite the transport-failure branch: a timeout **after** the POST was sent is *not* proof of failure — verify with a `GET /api/documents/by-path/<rel_path>` before reporting anything, never blind-retry (a blind retry is a duplicate or an unwanted v2 after P23), and only fall through to step 6's local fallback when the verification says the document is genuinely absent. | Markdown-only, gated by `skills_parity.py` (3 byte-parity copies, one with frontmatter). Different files, different gate, different failure mode from the Python work. |
| `P24.S3` | **CLI honesty.** `knowledge save` currently maps every `httpx.HTTPError` — including a `ReadTimeout` on a write that the server accepted — to `error: cannot reach <base_url>`. Distinguish a timeout on a **mutating** call from a genuine connect failure and say the save may have landed (and how to check); consider a longer write timeout than the shared `DEFAULT_TIMEOUT = 15`. | `cli/` is **not** in the plugin template `shipped_dirs`, so it has no mirror gate and its own test suite (`cli/tests/`). Independent of S2's markdown. |

Order: S1 → S2 → S3 (S2/S3 `depends_on: P24.S1` — both describe the post-fix behavior,
and S2's wording should match whatever additive field S1 lands). `P24.REVIEW` validates
all three together.

Not cut, deliberately:

- **No separate instrumentation slice.** Stage timing/logging, if S1 wants it, belongs in
  S1 — a second slice touching `server/main.py` would only duplicate the mirror-parity
  churn. The failure mode is already confirmed from code (below); prod instrumentation is
  a nice-to-have, not the fix.
- **No design/co-work slice, no `DECOMP2`** — nothing user-facing/visual here.

## Findings & Notes

### Confirmed failure mode (from code, P24.DECOMP)

The client's 5 s budget is spent on network stages that run **after the document is
already durably saved** and **before** the 201 is written. Nothing in the path has a
timeout short enough to protect it.

Pre-response stages of `POST /api/documents` (`server/main.py:555-872`), in order:

1. `ensure_registry_project` (async dep) — Postgres get-or-create (ms, local container).
2. Validation + 409 existence checks (sqlite).
3. **`WRITE_LOCK` critical section** — archive copy (P23), `write_document_file`,
   `ensure_project_landing`, `update_recent_index`, `db.upsert_document`. **`upsert_document`
   commits (`server/db.py:254`), and the file is already on disk** → *the document is
   durably saved at the end of this step*. Everything after it is publish/side-effect work.
4. `gitops.add` + `gitops.commit` — local git, tens of ms.
5. **`gitops.push` — the smoking gun** (`server/main.py:793-798`, `server/gitops.py:58-91`).
   Prod runs with `KB_GIT_PUSH: "true"` (`compose.prod.yml:52`), and push is
   `git fetch origin main` → `git rebase origin/main` → `git push origin HEAD:main` —
   **two SSH round-trips to GitHub plus a rebase**, executed **inside `WRITE_LOCK`,
   in-request**. `gitops._run` is `subprocess.run(...)` with **no `timeout=` argument at
   all** (`server/gitops.py:29-36`), so this stage is *unbounded*: a slow or hanging SSH
   connection blocks the response for as long as git waits. Measured RTT for a single
   read-only `git ls-remote origin main` from a dev machine here: **0.49–0.66 s**; a real
   fetch+rebase+push from the box is comfortably several times that, and any hiccup is
   unbounded.
6. **Gemini embed** (`server/main.py:803-819` → `server/embeddings.py:108-163`) — one
   `client.models.embed_content` HTTPS call per write, no explicit client timeout,
   `retries=0`. Runs outside the lock but still **before** the response.
7. The `usage_metering` middleware (`server/main.py:86-109`) is a `BaseHTTPMiddleware`, so
   its `await record_usage(hint)` Postgres write happens **after** the handler returns and
   **before** the response body reaches the client — one more pre-response network hop.

Nothing cancels this work when the client hangs up: nginx allows `proxy_read_timeout 120s`
for `location /api/` (`deploy/knowledge.conf:184`), uvicorn does not cancel a sync
threadpool handler, and step 3 has already committed. So a client timeout produces exactly
the reported symptom — **"the upload itself is successful" plus "couldn't get a finish
return"**.

The client side then makes it worse:

- `/explain` publishes with `curl -sS --max-time 5 … --json @payload.json` (`plugin/skills/explain/SKILL.md:431,433`)
  and treats *any* non-zero curl exit as "**the API is unreachable** → go to step 6"
  (line 435). Step 6 with `KB_LOCAL_FALLBACK=yes` **hand-writes the document again**
  locally; with `no` it **reports failure** for a document that is in fact published.
  Both are dishonest, and a retry after the timeout hits the P23 duplicate/v2 hazard.
- The CLI uses `DEFAULT_TIMEOUT = 15` (`cli/src/knowledge_cli/client.py:44`) and maps
  every `httpx.HTTPError` to `error: cannot reach <base_url>` (`cli/src/knowledge_cli/main.py:117-119`)
  — same lie, with a more forgiving budget.

Verdict: the operator's hypothesis is **confirmed**, with one refinement — the culprit is
not "git commit" but the **network** stages (git fetch/rebase/push, and secondarily the
Gemini embed and the metering write) that sit between the durable save and the 201, none
of which is bounded by any timeout.

### Fix shape decided at decomposition (S1 is free to refine the mechanism)

- **Do not** try to make the push fast — it is inherently two network round-trips. Move it
  **off the response path**: commit stays in-request (local, fast, keeps `committed` /
  `commit_sha` truthful); push runs after the response.
- Run the Gemini embed there too (its result never appears in the response).
- **Bound every git subprocess** (`gitops._run` `timeout=`, surfaced as `GitError`) so the
  background worker can never wedge and hold `WRITE_LOCK` forever — this is the part that
  protects concurrent writers, since a background push must re-take `WRITE_LOCK` (it must
  not run concurrently with another write's tree mutation) and `WRITE_LOCK` is **not
  reentrant**.
- Keep the response **additive**: no field removed, no type changed. `pushed:false` already
  means "saved, publishes on the next successful push" (`docs/current/api.md:139`), so it
  stays truthful; add something like `push_pending: true` rather than repurposing a field.
  Flagged behavior change for the review: `commit_sha` can no longer be the *published*
  (post-rebase) HEAD, because the rebase now happens after the response.
- Mechanism is S1's call. Two candidates, both fine: a module-level single background
  worker thread + queue (fully decoupled, serializes pushes naturally, easy to drain in
  tests), or Starlette `BackgroundTasks`. **If `BackgroundTasks` is chosen, prove the
  response actually reaches the client first** — with `BaseHTTPMiddleware` in the stack the
  ordering is subtle, and getting it wrong reproduces the bug it is meant to fix.

## Constraints

- **Mirror gate.** `plugin/templates/kb/` ships `server/` and `tests/` in full
  (`plugin/templates/manifest.json` `shipped_dirs`). Any change under `server/` or `tests/`
  must be mirrored **in the same slice**; `python3 scripts/plugin_parity.py` must stay PASS
  (it is PASS at the phase's start).
- **Skill parity gate.** The `/explain` skill has **three** shipped copies:
  `plugin/skills/explain/SKILL.md` (canonical), `.agents/skills/explain/SKILL.md` (body
  byte-identical, different frontmatter), `web/public/SKILL.md` (**full-file** byte-identical
  to the canonical, frontmatter included). `python3 scripts/skills_parity.py` must stay PASS
  (PASS at the phase's start).
- **`allowed-tools` prefix rule (from P23).** The skill's frontmatter pre-approves
  `Bash(curl -sS --max-time 5:*)`. A curl spelled with a different `--max-time` is **not**
  covered and would prompt the user mid-run — any new timeout value needs its own
  `allowed-tools` entry, in the canonical and the web copy (the portable copy carries no
  `allowed-tools`).
- **Frozen consumer contract.** `POST /api/documents`' 201 shape is documented as frozen
  (`docs/current/api.md`), and the live hi2vi content agent plus changple5 consume it.
  Changes must be additive; anything else is a review-flagged behavior change.
- **Single uvicorn worker + non-reentrant `WRITE_LOCK`** (`server/main.py:147-151`) —
  in-process locking is the invariant; do not introduce a second worker or a lock re-entry.
- changple5 is an **external** consumer of the public API: we fix the server and our own
  two clients (skill, CLI); no changple5 code is in scope.
- Terse tests (repo rule): extend `tests/test_api_push.py` rather than growing a new suite.

### Validation the slices should run

- `python3 -m pytest` (repo root) — S1.
- `python3 scripts/plugin_parity.py` — S1 (mirror gate).
- `python3 scripts/skills_parity.py` — S2.
- `cd cli && python3 -m pytest` (or the repo's CLI test invocation) — S3.
- `python3 scripts/workflow.py validate` — every slice.

### Doc impact expectations (versions are created by `P24.REVIEW`, not per slice)

- `api.md` — publish-on-write moves off the response path; new additive response field;
  `commit_sha` no longer the post-rebase published HEAD; documented write latency.
- `backend.md` / `architecture.md` — the after-response worker and the git subprocess
  timeouts; the `WRITE_LOCK` re-acquisition rule.
- `operations.md` — what a `push_pending` write means for the operator on the box.
- `experience.md` (or wherever the skill/CLI behavior is durable truth) — the honest
  timeout + verify-before-retry rule for clients.

### Landed in P24.S1 — the response contract S2/S3 must describe

The server fix is in. What S2 (`/explain`) and S3 (CLI) can now rely on:

- **`POST /api/documents` does no network I/O before its 201.** Pre-response work is
  validate → archive → file write → Recent/landing → DB upsert → local `git add` +
  `git commit`. All local; the response is fast and its latency no longer depends on
  GitHub or Gemini.
- **New additive response field: `push_pending: bool`** — present on the `POST
  /api/documents` 201 **and** on the `DELETE /api/documents/{id}` / `…/by-path/{rel}`
  200. `true` = "a push to origin/main was queued and runs right after this response".
  Word it that way in the skill/CLI: *the document is durably saved either way;
  `push_pending` only says the off-box publish is on its way.*
- **`pushed` is now always `false`** on those responses when a push was deferred (its
  documented meaning — "saved, publishes on the next successful push" — is unchanged).
  **A client must never read `pushed:false` as a failure**, and must not retry on it.
- **`push_error` no longer appears** in any response (the push has not run yet).
  Background push failures land in the container log
  (`[kb-api] publish: push <rel> FAILED: …`), not in the response body.
- **`commit_sha` is the local (pre-rebase) commit**, no longer the published head.
- Mechanism: `server/publish.py` — one process-wide FIFO worker thread; the push task
  re-takes `WRITE_LOCK` (submitted outside it — not reentrant) and every git
  subprocess is bounded by **`KB_GIT_TIMEOUT_S` (default 60s)**, surfaced as
  `GitError`. Tests drain it deterministically with `publish.drain()`.
- Consequence for S2/S3's verify step: a client timeout is now almost certainly
  *not* the server's write path. The verification (`GET /api/documents/by-path/...`)
  stays the right move, and a fresh document may legitimately show up with
  `push_pending`-style publish still in flight — presence in the API is the proof of
  success, git/site publication is not.
- Not done here (deliberate): the Gemini embed on the worker has no client timeout
  (it can delay queued pushes, never a response); push coalescing stays open; the
  metering middleware's Postgres write still happens between handler return and the
  body reaching the client (local container, ms).

### Doc impact (running list — consolidated into versions by P24.REVIEW)

- `api.md` — P24.S1: `POST /api/documents` + the DELETE responses gain additive
  `push_pending: bool`; publish (git push) and the Gemini embed move **after** the
  response, so `pushed` is now always `false` when a push is deferred, `push_error`
  never appears, and `commit_sha` is the local pre-rebase commit, not the published
  head (update §Commit/Push semantics, both response shapes, and the sample body).
- `backend.md` / `architecture.md` — P24.S1: new `server/publish.py` after-response
  worker (single FIFO thread; push task re-takes the non-reentrant `WRITE_LOCK`,
  submitted outside it; drained on shutdown) and `KB_GIT_TIMEOUT_S` (default 60s)
  bounding every git subprocess in `server/gitops.py`.
- `operations.md` — P24.S1: `KB_GIT_TIMEOUT_S` is a new env knob; a background push
  failure now shows up only as a `[kb-api] publish: … FAILED` container log line
  (never in the API response), and the doc publishes on the next successful push.

## Open Questions

- Should the background push be **coalesced** (one push per N writes / a debounce) rather
  than one per write? Not required for the fix; S1 may keep it simple (one per write,
  serialized through the worker) and note the option.

### Landed in P24.S2 — the `/explain` client rule S3 should mirror

The skill is now honest about a lost response. What S3 (CLI) can reuse verbatim:

- **A transport failure on a mutating call is not evidence of failure.** The rule the
  skill now encodes (its new `§5.1`): after a timeout/transport error on the publish
  POST, ask the API what is at the target `rel_path`
  (`GET /api/documents/by-path/<rel_path>`) **before** reporting anything —
  landed → honest success (write nothing, never re-POST); still the old version or
  404 → the API is reachable and the write missed → **exactly one** informed re-POST;
  a different document at a plain-create path → that is the late 409, ask the user;
  5xx/401 → stop, publish state unknown; the verification GET *itself* failing at the
  transport layer is the only route into the local fallback. **Never loop: one
  verification, at most one retry.**
- **Publish budget raised to `--max-time 30`** for the POST (was 5). Rationale, reusable
  for the CLI's write timeout: post-S1 the 201 carries no network I/O, so the only
  variable left is uploading a few hundred KB of HTML plus the local metering write —
  30 s is large headroom over the realistic worst case and still fails fast on a real
  outage (nginx's `proxy_read_timeout` is 120 s, deliberately not matched).
- **`allowed-tools` prefix rule bit us again (P23's lesson):** a new `--max-time` value
  needs its own entry. The canonical/web frontmatter now carries **both**
  `Bash(curl -sS --max-time 5:*)` (the step-3 KB-research reads) and
  `Bash(curl -sS --max-time 30:*)` (the POST + the verification GET). Any future curl
  must reuse one of those two spellings or add a third entry.
- **The by-path read projection has no `url` field** (`server/main.py::_public_doc` over
  the `documents` schema — `url` is synthesized only on the write responses). It carries
  `id`, `title`, `rel_path`, `version`, `updated_at`. A recovery path must therefore
  report `rel_path`/`version` (and derive a view URL from the site base), not `url`.
  Same trap awaits S3 if it verifies a save via the read API.
- **Step 6 (local fallback) now guards against duplicating a landed write:** if the
  target file already exists with the just-authored body, the API's write did land —
  do not rewrite, do not touch `docs/index.md`, do not commit.
- **Step 8 wording for the new fields:** `pushed:false` + `push_pending:true` = "saved
  and committed; publishing to the remote in the background" — never a failure, never a
  retry trigger. `push_error` does not exist in any response any more; background push
  failures live in the server log only. S3's CLI output should say the same thing.
- Copies: the skill has **four** — the three parity-gated ones plus the installed
  `~/.claude/skills/explain/SKILL.md`, which was re-`cp`'d from canonical in this slice
  (`skills_parity.py` does not see it; it drifts silently if a slice forgets).

### Doc impact (running list, continued — consolidated into versions by P24.REVIEW)

- `experience.md` — P24.S2: the shipped `/explain` client's publish contract changed —
  the POST now runs with `--max-time 30` (with a matching `allowed-tools` prefix entry
  beside the existing 5 s one), and a transport failure is no longer read as "API
  unreachable": the skill verifies with `GET /api/documents/by-path/<rel_path>` before
  reporting, reports an honest success when the write landed despite the lost response,
  re-POSTs at most once and only when the verification proves the save missed, falls
  through to the local fallback only when the verification GET itself fails (and then
  guards against rewriting a file the API already wrote), and reports
  `pushed:false` + `push_pending:true` as "saved and committed, publishing in the
  background" rather than an error.

### Landed in P24.S3 — the CLI's honest write path (what REVIEW should check)

The third client is now honest, and it encodes the same rule as S2 in Python:

- **`client.never_sent(exc)` is the whole distinction.** `ConnectError`,
  `ConnectTimeout`, `PoolTimeout`, `ProxyError`, `UnsupportedProtocol` prove the
  request never left the client → the old `error: cannot reach <base_url>` is true
  and is re-raised untouched to `main()`'s boundary. Every other `httpx.TransportError`
  (`ReadTimeout` above all, plus `WriteTimeout`/`WriteError`/`RemoteProtocolError`)
  happened at or after the send → the write may have landed. **Ordering trap:**
  `ConnectTimeout` subclasses `TimeoutException` and `ConnectError` subclasses
  `NetworkError`, so any future `except httpx.TimeoutException` written *above* this
  check would silently swallow the connect case.
- **Verification compares the body, not just existence** (`knowledge.verify_save`).
  A plain create over an existing document is a **409 the timed-out caller never saw**,
  so "something is at that rel_path" is not "my save is at that rel_path". The
  server stores `_normalize_body` (leading blank lines dropped, one trailing newline,
  `server/documents.py:419-426`) of exactly what we sent, so `.strip()` on both sides
  is the only normalization required — a fact worth keeping if that write path ever
  changes.
- **The CLI now derives the target rel_path itself** — `knowledge.default_slug` mirrors
  `documents.slugify` (cap 80 + re-trim + `"untitled"`) and `save_rel_path` mirrors
  `main.py:636-648`. Soft spot recorded on purpose: the **date** default is the
  *client's* today, so a clock on the far side of midnight from the server looks the
  path up one day off. That only ever downgrades to "I could not confirm it", whose
  message points at `knowledge list`, which has no such blind spot.
- **S2's no-`url` trap confirmed in code**: the by-path read projection carries no
  `url` (it is synthesized only on the write responses), so a recovered save prints
  `saved:`/`id:`/`path:`/`read:` and **omits the `url:` line** rather than guessing one
  from the site base. Under `--json` a recovered save prints the read-back document
  verbatim (no `url`/`committed`/`push_pending`), with a stderr `note:` saying exactly
  which payload it is — the lost 201 is unrecoverable and faking one would be worse.
- **One verification, zero retries** — same "never loop" rule as the skill. A write
  still in flight therefore reads as absent; the message says "most likely did not
  land … a write still in flight would look the same" rather than claiming certainty.
- **Timeout budget:** the save POST gets `client.WRITE_TIMEOUT = 30` as a **per-call**
  override (`document_create` only); reads stay on `DEFAULT_TIMEOUT = 15`. Same number
  and same reasoning as S2's `--max-time 30`: post-S1 the 201 carries no network I/O,
  so only the upload + the local metering write are variable, and 30 s stays well
  inside nginx's 120 s `proxy_read_timeout`. The two shipped clients now agree on how
  long a write may take.
- `guide.py` (the CLI's agent-readable contract, whose own docstring requires updating
  it whenever `save` changes) now carries the rule: a timeout on `save` is not a failed
  save, never re-run one without checking first, and `--json` after a lost reply carries
  the read-back document.
- Tests: `cli/tests/test_knowledge.py` §T7, four cases (verified success / genuinely
  absent / a foreign document at the path / connect failure). `FakeApi` gained
  `post_raises` (raised *after* the call is recorded — the point is that it was sent)
  and `absent`. CLI suite **44 passed** (was 40); repo suite unchanged at 83 passed /
  32 skipped; both parity gates still exit 0 (`cli/` is outside `shipped_dirs`).
- Not done (deliberate): no change to the other commands' error handling (all reads —
  re-running one is free), no `--force`/`--verify` flag, no retry/backoff, and no
  attempt to surface `push_pending` in the text output — `save`'s human rendering has
  never printed commit/push bookkeeping, so `pushed:false` was already never shown as
  a failure. `--json` carries it on the normal path.

### Doc impact (running list, continued — consolidated into versions by P24.REVIEW)

- `experience.md` — P24.S3: `knowledge save` no longer reports a lost reply as
  `cannot reach` — it verifies with `GET /api/documents/by-path/<rel_path>` (comparing
  the body, since a 409 the caller never saw also leaves a document at the path) and
  then reports either an honest success (exit 0, `note:` on stderr explaining the lost
  reply, no `url:` line because the read projection has none) or an honest "may or may
  not have landed" error naming `knowledge list`/`knowledge read`; it never re-POSTs,
  only a genuine connect failure still says `cannot reach`, and the save POST now runs
  on a per-call 30 s `WRITE_TIMEOUT` while reads stay at 15 s.
