# P13.S2 — result

**Status: done.** `signup`, `login`, `logout`, `whoami`, `init` ship, and **the phase's thesis is proven**: a config written entirely by the CLI resolves through the *verbatim* `explain/SKILL.md` heredoc as `KB_STATUS=configured`, `KB_API_TOKEN=vk_…`, `KB_LOCAL_FALLBACK=no`. S1's `/auth` + `/app` wrappers met a real server for the first time and **needed no fixes**.

## What shipped

```
cli/src/knowledge_cli/auth.py     NEW  the five commands + password/base-url resolution
cli/src/knowledge_cli/errors.py   NEW  CliError (see Deviations)
cli/src/knowledge_cli/main.py     EDIT register subcommands; resolve --base-url centrally; init hint
cli/src/knowledge_cli/client.py   EDIT optional `transport=` (httpx's own default; see Deviations)
cli/tests/test_auth.py            NEW  12 tests, httpx.MockTransport, no live server
```

## The live run — the point of this slice

Real tenant-mode API: `docker compose up -d postgres api` + `alembic upgrade head`, driving the **installed** binary against `http://localhost:8766` under a throwaway `XDG_CONFIG_HOME`. `/auth/me` unauthenticated → **401 JSON**, not the deployed host's 404-HTML, so the control plane was genuinely live.

| # | Check | Result |
|---|---|---|
| 1 | `init` fresh, `--password-stdin` | signup → project created → key minted → config **0600**, `api.token=vk_…`, **no `kb_root`**, `auth.session_token` present |
| 2 | `init` **again** | `logged in` / `project: already existed` / `key: reusing the one in your config` |
| 3 | **server-side** idempotency proof | **1 project, 1 credential** for the tenant after two `init`s; `config api.token[:12] == credential.token_prefix` → **True** |
| 4 | `whoami` | right email + workspace |
| 5 | wrong password | `login failed: invalid email or password` |
| 6 | **unknown email** | **byte-identical message** → enumeration-safety preserved |
| 7 | `KNOWLEDGE_PASSWORD` env, no stdin | works |
| 8 | no password, stdin not a TTY | clear error, **no hang**, exit 1 |
| 9 | `vk_` on `/app/projects` | **401** — the planes are not interchangeable |
| 10 | `logout` | 204; `auth.session_token: null`; **`api.token` survives** |
| 11 | **logout really revokes** | same token on `/auth/me`: **200 before → 401 after** |
| 12 | `ps` during a live login | argv is `… login --email … --password-stdin` — **0 processes leak the password** |
| 13 | **THE PAYOFF** — `knowledge config` **and** the verbatim SKILL.md heredoc (extracted from the real file, lines 32–77) | both: `configured`, the real `vk_`, `KB_LOCAL_FALLBACK=no` |

Check 11 exists because **`POST /auth/logout` returns 204 even with no bearer** (`auth_api.py:157-164`) — a CLI that forgot to send the token would still "succeed" and leave the session live for 30 days. Only re-using the token afterwards catches that. Check 3 likewise: the CLI *saying* "reusing" proves nothing; counting rows server-side does.

### Regressions

| Command | Result |
|---|---|
| `cd cli && uv run pytest -q` | **22 passed** (10 S1 + 12 new) |
| `uv run pytest -q` (root) | **65 passed, 12 skipped** — identical to baseline. The 12 still skip: `postgres` publishes **no host port**, so a host-side test cannot reach it regardless. |
| `python3 scripts/plugin_parity.py` | exit 1, **34 issues** — line-for-line identical to S1's baseline; **0 `cli/` mentions** |
| `git status --porcelain` | only `cli/` + `works/` — **no root file touched** |
| `python3 scripts/workflow.py validate` | passed |

## Deviations from `plan.md`

1. **`errors.py` is a new module** (not in the plan's file list). `main` imports `auth` to register subcommands, so `auth` cannot import `CliError` back from `main`. A 12-line leaf module is the honest fix, and S3 imports it naturally.
2. **`client.py` gained `transport: httpx.BaseTransport | None = None`** — httpx's own default, so zero runtime change. It lets the tests drive the real request path through `MockTransport` without a live server or a new dep.
3. **`DEFAULT_BASE_URL` moved `main.py` → `auth.py`**, beside the resolver that uses it (same reason as 1). `main()` now resolves `--base-url` **once, centrally**; every command just reads `args.base_url`.
4. **Base-url resolution reads the config** — `--base-url` > `$KB_API_BASE_URL` > the config's literal `api.base_url` > the hosted default. The plan did not specify this, but without it `whoami`/`logout` would send a localhost session to the SaaS. It reads via `load_raw()`, **never `resolve()`** — the resolver's legacy-checkout branch answers `http://localhost:8766` for anyone with `~/projects/personal/knowledge/mkdocs.yml` (**the operator**), which would silently onboard them to their own laptop.
5. **`signup`/`login` write `api.base_url`**, not just `auth.*`. One base in the config = a session and a `vk_` can never drift onto different servers. They still **never write `api.token`** — only `init` writes the seam's key, so logging in cannot repoint anyone's document API.
6. **`init` reuses `api.token` only when the config's base matches** the resolved base. The plan said "if the config already carries a working `api.token`, keep it"; a key minted by another service is not "working". It checks **presence + base**, not liveness (that needs a data-plane call — S3's territory); `--new-key` is the escape hatch.
7. **Two warnings the plan did not ask for**, both for silent-harm cases found while building:
   - creating the config file while a **legacy checkout is active** — the file is authoritative once it exists, so `/knowledge:explain` stops falling back to `~/projects/personal/knowledge`. This **fired on the live run** (the operator has that checkout).
   - `api.base_url` changing while an `api.token` from the old base is present.
8. **`init` does not remove a pre-existing `kb_root`.** `save()` deep-merges and has no delete path, and destroying someone's local-checkout setting is not `init`'s call. Instead it reports `KB_LOCAL_FALLBACK` and warns if it resolved to `yes`. Unreachable on a fresh machine (the operator's case) — the merge base is `{}`.
9. **No password confirmation on interactive signup.** Not in the plan; the primary caller is a non-interactive agent, and it would fork the shared password path.

## Open Question (b) — resolved, with a wrinkle the live run exposed

`site.base_url` = the same base, per the plan. Correct for the hosted service, where **one origin serves both planes**. But a **localhost** `init` writes `site.base_url=http://localhost:8766` — the **API** port, not mkdocs' **8765** — because locally the two planes are different ports. Dev-only imperfection (the hosted service is the real target); recorded for P14, which is where the honest non-#1-tenant target (the web app's document view) actually lands.

## What S3 must know

- **`uv tool install ./cli --force` does NOT rebuild.** uv reuses the cached `0.1.0` wheel, so my first live run silently drove **S1's stale binary** (`invalid choice: 'init'`). Use **`--reinstall`**. This will bite S4's docs and S5's E2E smoke.
- **`args.base_url` is already resolved** in `main()` — do not re-derive it.
- **`errors.CliError`** = bail with a user-facing message; `main()` prints it and exits 1. Never let a traceback escape: it could carry a `vk_`.
- **`KnowledgeClient(..., transport=…)`** is how tests reach the real request path.
- **The default project is `knowledge`** (`auth.DEFAULT_PROJECT`), which satisfies `validate_project`'s `^[A-Za-z0-9][A-Za-z0-9._-]*$`. `init` writes no `project` into the config — if S3 needs a default project for `save`, that is a **new additive key S3 must add** (and `init` should probably write it; it does not today).
- **Confirmed live, so stop treating these as inferred:** signup → `tenant` **singular** / login + me → `tenants` **plural**; credential create → `{credential, key}` with `credential.token_prefix == key[:12]`; a `vk_` on `/app/*` → **401**; logout → 204 **even with no bearer**.
- The `vk_` never reaches stdout/stderr: `redact_token()` (`vk_…fRX8`) is the only display form, asserted by `test_init_never_prints_the_key`.

## What I left behind — exactly

- **`knowledge_pgdata` volume: NEW.** It did **not** exist before this slice (`docker volume ls` was empty for this project). It now holds **one throwaway tenant** (`cli-s2+<hex>@example.com`) and nothing else. Stopped, **not dropped** — the plan forbade `-v`. It never held real data, so the operator can `docker compose down -v` freely.
- **Containers `knowledge-api-1` + `knowledge-postgres-1`: `exited`** (`docker compose stop`, not removed). `restart: unless-stopped` will not resurrect them.
- **No image built** — `knowledge-api:latest` was already 25 hours old and compose reused it.
- **CLI uninstalled** (`uv tool uninstall knowledge-cli`); `knowledge` is off PATH, as before the slice.
- **The operator's `~/.config/knowledge-kb/` still does not exist.** Every run used a throwaway `XDG_CONFIG_HOME`.
- Scratchpad note: the shared scratchpad already held **P13.S1's harness debris** (`differential.py`, `fakehome/`, and an `xdg/knowledge-kb/config.json` carrying the placeholder `vk_original_key_here_0000_last4`). It is a fixture string, not a credential, and nothing in the tree writes it — but it contaminated my first `XDG_CONFIG_HOME` until I moved to a clean dir. Not a live-key leak.
