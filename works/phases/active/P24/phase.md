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

## Open Questions

- Should the background push be **coalesced** (one push per N writes / a debounce) rather
  than one per write? Not required for the fix; S1 may keep it simple (one per write,
  serialized through the worker) and note the option.
