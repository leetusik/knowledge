# P13.S1 — CLI package + config seam + API client

Orchestrator's plan for **`P13.S1`** (`implementation`, `risk: medium`, order 1, no deps), executed by **`slice-executor-mid`**.

## Context

P13 ships a standalone CLI so a user inside Claude Code or Codex can sign up, log in, configure credentials, and use the knowledge features **without ever visiting the website**. S1 is the foundation the other four slices stand on: an **installable package**, the **config seam in code for the first time**, and the **HTTP client**. No auth flow yet (S2), no knowledge commands (S3), no guide docs (S4), no edge exposure (S5).

Read `works/phases/active/P13/phase.md` first — its Context, Decisions (D-P13-1…6), Implementation anchors, and Constraints are the ground truth for this slice. Three facts drive it:

1. **The repo is deliberately not installable.** Root `pyproject.toml` has no `[build-system]` and `[tool.uv] package = false` — a *virtual* project, because `server/` runs bind-mounted and Docker reproduces it with `uv export --no-emit-project`. So the CLI needs **its own package**, and the root stays untouched (D-P13-1).
2. **The config seam has never been code.** `~/.config/knowledge-kb/config.json` exists only as prose + `python3 -c` heredocs in two SKILL.md files (zero code hits repo-wide). This slice writes the **first code implementation**, and it must match the prose resolver exactly — "a flat shape will not be read".
3. **The onboarding sequence is already proven.** `scripts/onboarding_smoke.py` drives every call this client needs over `httpx`. The client lifts *proven* calls, it does not invent them.

**House style is settled, so this slice invents nothing:** every CLI in this repo is **stdlib `argparse` with subparsers + `set_defaults(func=…)`** (`scripts/workflow.py:1020-1131` is the 1141-line reference; `onboarding_smoke.py:298-322` is the small one). There is **no typer/click/rich anywhere**, and vocky has none either. The CLI matches that, adding exactly **one** runtime dependency: `httpx`.

## Deliverables — all new, all under `cli/`

**This slice touches no existing root file.** `.dockerignore` is parity-`identical` and the Dockerfile only copies `pyproject.toml uv.lock` (`Dockerfile:31`), so `cli/` never reaches the image and `.dockerignore` must **not** be edited (that would add fresh parity drift, violating D-P13-5). `.gitignore` already ignores `.venv/` and `__pycache__/` at any depth; it is `template_only` in the parity manifest (never byte-compared), so it is the **one** root file that is safe to touch — add `dist/` only if a build artifact actually appears.

```
cli/
  pyproject.toml            hatchling; name knowledge-cli; requires-python >=3.12;
                            deps = ["httpx"]; dev group = ["pytest"];
                            [project.scripts] knowledge = "knowledge_cli.main:main"
                            [tool.hatch.build.targets.wheel] packages = ["src/knowledge_cli"]
                            [tool.pytest.ini_options] testpaths = ["tests"]
  src/knowledge_cli/
    __init__.py             __version__ = "0.1.0"
    config.py               the config seam (the risky module — see below)
    client.py               httpx transport + thin typed endpoint wrappers
    main.py                 argparse skeleton + the `config` command
  tests/
    test_config.py          terse; pins the documented resolver contract
```

### CLI name — `knowledge`, no `kb` alias

Open question (d), decided: **`knowledge`**. The primary caller is a *coding agent*, not a human typing all day, so an explicit name costs nothing and reads unambiguously in agent docs. `kb` is a generic two-letter name with real PATH-collision risk — not worth squatting; a user who wants it can alias it themselves. Package `knowledge-cli`, module `knowledge_cli`, matching the `knowledge-kb` config dir and the `knowledge` plugin.

### `config.py` — the seam, and the one place to be exact

Two **separate** jobs; conflating them is the main design error to avoid:

**(a) `resolve()` — mirror the prose resolver byte-for-byte.** A faithful port of `plugin/skills/explain/SKILL.md:31-78`, returning the same six values (`status`, `kb_root`, `api_base_url`, `api_token`, `site_base_url`, `local_fallback`). The contract, highest priority first:

| Rule | Behavior |
|---|---|
| Path | `$XDG_CONFIG_HOME/knowledge-kb/config.json`, else `~/.config/knowledge-kb/config.json` |
| Env overrides | `KB_ROOT`, `KB_API_BASE_URL`, `KB_API_TOKEN` — **each overrides only its own key**; empty string is treated as unset |
| Config file | **authoritative when present** — never falls through to legacy for keys it omits (the `if cfg is not None:` branch, `:55`) |
| Legacy | only when no config file: `~/projects/personal/knowledge/mkdocs.yml` exists → that root, `:8766`, `:8765`, no token |
| Defaults | `api.base_url` → `http://localhost:8766`, `site.base_url` → `http://localhost:8765`, token → empty |
| `site.base_url` | **has no env override** (`:69`) — deliberate, keep it that way |
| Unparseable JSON | `status=error`, report the path, **never** fall back to another source (`:46-49`) |
| Nothing at all | `status=unconfigured` |
| `local_fallback` | true only when `kb_root` exists *and* contains `mkdocs.yml` |

**(b) `save(updates)` — the writer that does not exist today.** Read-modify-write that **preserves unknown keys** (a user may have a `/knowledge:setup`-written config; the CLI must not clobber fields it does not own), nested schema only, written **atomically** (tmp file in the same dir + `os.replace`) with mode **`0o600` set on the temp file *before* the replace** — never `chmod` after, which would leave a window where a file containing a `vk_` key is world-readable. This is the first time `chmod 600` is *enforced* rather than merely instructed (`setup/SKILL.md:223` is prose nothing checks).

**Record for the review:** this creates a **second implementation of one contract** — the SKILL.md heredoc and `config.py` can now drift. They cannot be merged: the skill must keep working with the CLI uninstalled (it is the self-host open-core path), so independent implementations are correct. The mitigation is `test_config.py` pinning the documented behavior. This is a durable-truth note for `phase.md` → the review's doc impact.

### `client.py` — transport + thin wrappers

`KnowledgeClient(base_url, token=None, timeout=15)` over `httpx.Client(follow_redirects=False)`, mirroring `onboarding_smoke.py` and vocky's `smoke.py` conventions: explicit **`User-Agent: knowledge-cli/<version>`** (lets the operator identify CLI traffic at the edge), bearer injected as `Authorization: Bearer <token>` — the **same header and scheme for both** a session token and a `vk_` key (`api_auth.py:130-175` resolves all three forms off one header).

One `_request()` core raising **`ApiError(status, detail)`**, parsing FastAPI's `{"detail": …}` when present. Do **not** dump raw bodies: the server's own details are designed safe (generic 401, 404-never-403), so surface `detail` and let callers map status → friendly message; anything unparseable degrades to the status alone.

Thin wrappers for the endpoints the phase actually uses — every one has a named consumer in S2/S3, none speculative (all anchored in `phase.md`): `auth_signup/login/logout/me`; `projects_list/create`, `project_get`, `credential_create/list/revoke`; `document_create/list`, `search`; `usage`, `project_usage`.

### `main.py` — argparse skeleton + one real command

Subparser registry in the `workflow.py` shape, global `--base-url` and `--version`, and **`knowledge config`** — prints the resolved config with the token **redacted** (`vk_…last4`). Small, genuinely useful (it is the agent-facing debug command and the human answer to "what am I pointed at?"), and it makes S1 verifiable by *running the real thing* rather than only by unit test.

*(Deliberate deviation: DECOMP sketched S1 as "skeleton + --help, no behavior yet". Shipping `config` costs a few lines, exercises the seam end to end, and gives the slice an observable behavior. Note it in `result.md`.)*

### `--base-url` default — the SaaS, and why this is not a contradiction

Global `--base-url`, default **`https://knowledge.hi2vi.com`**, honoring `KB_API_BASE_URL` when set. This does **not** conflict with `resolve()`'s documented `http://localhost:8766` default, because they answer different questions: `resolve()` reports *what an existing config says* (and must match the skill exactly); `--base-url` is the *onboarding target* S2 writes into a fresh config. A brand-new SaaS user with no config must reach the hosted service, not localhost.

**This flag is load-bearing, not polish:** the control plane is not exposed at the edge until **S5**, so every live test of S1–S4 must run against a local instance (`--base-url http://localhost:8766`). Without the flag the phase is untestable before its last slice.

## Guardrails

- **No root file changes** except optionally `.gitignore`. Specifically: never touch root `pyproject.toml` (`package = false` is load-bearing for Docker), `Dockerfile`, `.dockerignore`, `compose*.yml`.
- **Nothing under `server/`, `tests/`, `web/`, `deploy/`, `plugin/`.** CLI tests live in `cli/tests/` (D-P13-5 — root `tests/` is parity-guarded). `plugin/` + both SKILL.md files are untouched by decree.
- **No auth/knowledge command implementations** — that is S2/S3. S1 stops at the client wrapper + `config`.
- **No secrets in logs.** The token is redacted in `config` output and never printed elsewhere.
- **No `doc-new-version`** (durable docs version only at the review) — append a "Doc impact" line to `phase.md` instead.
- **Keep tests terse** (AGENTS.md hard rule): one focused `test_config.py`. The resolver is the risky part and earns tests; do not build a fixture rig for the client.
- No commits — the orchestrator commits.

## Verification

1. `cd cli && uv run pytest -q` → passes. Covers: per-key env override; config-file-authoritative (no legacy fallthrough for omitted keys); `unconfigured`; `error` on unparseable JSON; `site.base_url` ignores env; `save()` preserves unknown keys and yields mode `0o600`. Use `monkeypatch` for `HOME`/`XDG_CONFIG_HOME` — **never** touch the operator's real `~/.config/knowledge-kb/config.json`.
2. **Install and run the real thing:** `uv tool install ./cli`, then `knowledge --version`, `knowledge --help`, `knowledge config` (against a temp `XDG_CONFIG_HOME` so the operator's own config is untouched). Clean up with `uv tool uninstall knowledge-cli`.
   - **The `git+https://…#subdirectory=cli` form cannot be verified in this slice** — local `main` is **29 commits ahead of `origin/main`**, so that URL resolves to P9-era code with no `cli/`. Document the command; verify the **local path** form now; the git form becomes verifiable only after the operator pushes. Record this honestly in `result.md` — do **not** claim the documented install path works.
3. **No new parity debt:** `python3 scripts/plugin_parity.py` → still exit 1 with the **same 34 issues (26 completeness + 8 byte-drift)** as before the slice. A different count means a root file was touched.
4. **Root unaffected:** `uv run pytest -q` at the repo root still passes; `git status --porcelain` shows only `cli/` (plus `.gitignore` if a build artifact needed ignoring) and `works/`.

## Slice bookkeeping

- Write `cli/`'s files, then `works/phases/active/P13/slices/P13.S1/result.md` (free-form, terse: what shipped, decisions taken, verification output, deviations, anything S2 must know).
- Append cross-slice notes to `works/phases/active/P13/phase.md` — in particular the **two-implementations-of-one-config-contract** drift risk, the resolved CLI name, and confirmation/correction of the Doc impact line (`architecture.md` for the `cli/` package boundary; `operations.md` for `uv tool install`).
- Answer phase Open Question **(d)** (CLI name) in `phase.md`.
- Return a structured verdict; never commit, never transition status.
