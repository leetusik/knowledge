# Result — P8.S2: hosted read auth (gate reads/search behind bearer; local stays open)

## Outcome

Added the opt-in `KB_REQUIRE_READ_AUTH` flag that puts the read/search surface behind the **existing** bearer, for the hosted box only. Local/plugin behavior is unchanged: with the flag unset, reads stay open **even when `KB_API_TOKEN` is set** (a set token still guards writes only). Delivered exactly per plan — no design deviations.

## Changes

### `server/config.py`
- New accessor `require_read_auth_enabled()` following the `git_push_enabled()` idiom exactly: env-at-call-time, truthy-parse `{1,true,yes,on}`, **default false** (inverted default like `git_push_enabled`, unlike the falsy-parsed `git_commit_enabled` / `startup_reindex_enabled`).

### `server/main.py`
- New FastAPI dependency `require_read_bearer` placed right after `require_bearer`. It **no-ops unless `KB_REQUIRE_READ_AUTH` is true**; when true it **delegates to `require_bearer(authorization)`**. This cleanly encodes the both-must-hold rule: flag off → open; flag on but no token → `require_bearer` no-ops → open; flag on + token set → exact-match `Authorization: Bearer <token>` check → 401. The bearer check is byte-for-byte identical to the write path (reuse, not reimplementation).
- Attached `_: None = Depends(require_read_bearer)` to the six read/search routes only: `GET /api/documents`, `GET /api/documents/{doc_id}`, `GET /api/documents/by-path/{rel_path}`, `GET /api/search`, `GET /api/tags`, `GET /api/projects`. Dependency param inserted after any path/required params (before `conn`) so default-arg ordering stays valid.
- `GET /healthz` left untouched → stays open unconditionally.
- `require_bearer` and all write routes (`POST /api/reindex`, `POST /api/documents`, both DELETEs) untouched.
- No CORS middleware added (deliberate — server-to-server consumer; the Pages site is browser-only lunr and never calls this API).
- Updated the module docstring (it previously claimed "Reads … are always open") to describe the new flag-gated read-auth, the always-open healthz, and the deliberate no-CORS decision.

### `tests/test_api_read.py` (3 new tests, terse, matching existing conventions)
- `test_reads_open_by_default_even_with_token` — the key backward-compat case: `KB_API_TOKEN` set, flag unset → all read/search routes 200 with no header; writes (`POST /api/reindex`) still 401.
- `test_read_auth_gates_reads_when_flag_and_token_set` — flag on + token set: each of the six gated routes returns 401 with no bearer, 401 with a wrong bearer, 200 with the correct one; `GET /healthz` stays 200 with no header.
- `test_read_auth_noop_without_token` — flag on, no token → reads stay open (both-must-hold rule).

## Validation

| Command | Result |
|---|---|
| `.venv/bin/python -m pytest -q` (full suite) | **65 passed**, 1 warning (pre-existing Starlette httpx deprecation) — was 62 as of S1, +3 new tests |
| `.venv/bin/python -m pytest tests/test_api_read.py -q` | **13 passed** |
| `python3 scripts/workflow.py validate` | **Workflow validation passed** |

Note: pytest is only available in the repo `.venv` (`.venv/bin/python`); the bare `python3` (Homebrew 3.13) has no pytest. Orchestrator should use `.venv/bin/python -m pytest` to reproduce.

## Deviations from plan

None. All five fixed design decisions honored; scope stayed within `server/main.py` + `server/config.py` + tests. The one addition beyond the literal file list is the `main.py` module docstring update (it had become inaccurate — "reads are always open"); this is in-scope for the same file and durable-truth is captured via the Doc impact notes, not doc versions.

## Doc impact (appended to phase.md — versioned once at P8.REVIEW, not here)

- **api.md** — hosted read/search require the bearer (`Authorization: Bearer <token>`) when `KB_REQUIRE_READ_AUTH=true`; local default leaves reads open.
- **security.md** — read-auth model: `KB_REQUIRE_READ_AUTH` flag AND `KB_API_TOKEN` must both be set to gate reads; healthz always open; no CORS (server-to-server consumer).
- **operations.md** — new `KB_REQUIRE_READ_AUTH` flag (default false, box sets true) in the box env.
