# Plan — P8.S2: hosted read auth — gate reads/search behind bearer (local stays open)

Orchestrator plan (auto mode), per the operator-approved hosting proposal in `../../phase.md` §3. Executor: `slice-executor-mid`.

## Job

Add an opt-in flag that puts the read/search surface behind the **existing** bearer token, for the hosted deployment only. Local/plugin behavior must not change at all: with the flag unset, reads stay open — **even when `KB_API_TOKEN` is set** (today a set token guards only writes; preserve exactly that).

Read first: `../../phase.md` §3 + Findings (esp. the S1 entry — it added the config-flag idiom you'll reuse), `server/main.py` (`require_bearer` at ~line 64 and the read routes), `server/config.py`, `tests/test_api_read.py` + `tests/conftest.py`.

## Fixed design decisions (approved — do not re-open)

1. **New `KB_REQUIRE_READ_AUTH` flag, default false.** Add a config accessor following `git_push_enabled()`'s idiom exactly (S1 added it: truthy-parse `{1,true,yes,on}`, env-at-call-time, default false).
2. **Read auth is active only when the flag is true AND `KB_API_TOKEN` is set.** Flag true with no token = no-op (same philosophy as `require_bearer` today). Implement as a new FastAPI dependency (e.g. `require_read_bearer`) that no-ops unless both hold, else performs the same exact-match `Authorization: Bearer <token>` check → 401. Attach it to these six routes, mirroring how `require_bearer` is attached to the write routes: `GET /api/documents`, `GET /api/documents/{doc_id}`, `GET /api/documents/by-path/{rel_path}`, `GET /api/search`, `GET /api/tags`, `GET /api/projects`.
3. **`GET /healthz` stays open unconditionally** (edge/uptime probes; the doc-count leak is immaterial — the corpus is public on Pages).
4. **No CORS** — do not add any CORS middleware. The consumer is server-to-server; the Pages site's search is browser-only lunr and never calls this API. (State this in your phase.md note so the decision is recorded as deliberate.)
5. **`require_bearer` and the write routes are untouched.**

## Tests (small — extend `tests/test_api_read.py` or one tiny new file, matching conventions)

1. Backward-compat guard (the key case): `KB_API_TOKEN` set, flag **unset** → reads still 200 without any header.
2. Flag on + token set: each gated surface responds 401 without a bearer and 200 with the correct one (parametrize over the six routes or spot-check a representative subset incl. `/api/search` and one document read; keep it terse). Wrong token → 401.
3. Flag on + token set: `GET /healthz` → 200 with no header.
4. Flag on, **no token** → reads stay open (the both-must-hold rule).

Existing suite must stay green (62 passed as of S1). Run the full suite and record commands + outcomes in `result.md`.

## Constraints

- Don't touch gitops/push, deploy artifacts, compose, or docs/ — this slice is `server/main.py` + `server/config.py` + tests only.
- Append one-line **Doc impact** notes to `phase.md` (api.md: hosted read/search require bearer, local default open; security.md: read-auth model — flag + token both required, healthz open, no CORS; operations.md: `KB_REQUIRE_READ_AUTH` in the box env) and any cross-slice findings to Findings & Notes (S2 section).
- Executor contract: never commit, never transition slice/phase status; write free-form `result.md` in this slice folder; return the structured verdict. If anything here turns out deeper than it looks (surprising route wiring, test fixture friction you can't resolve mechanically), return `escalate` with findings rather than improvising a redesign.
