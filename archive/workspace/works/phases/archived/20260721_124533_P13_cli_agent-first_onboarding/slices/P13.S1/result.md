# P13.S1 — result

**Status: done.** The CLI's installable foundation exists: `knowledge` installs, runs, and resolves the config seam. No root file was touched (not even `.gitignore` — no build artifact appeared, so it needed no change).

## What shipped

```
cli/pyproject.toml                    hatchling; knowledge-cli 0.1.0; deps=[httpx]; dev=[pytest]
cli/src/knowledge_cli/__init__.py     __version__ = "0.1.0"
cli/src/knowledge_cli/config.py       the config seam — resolve() + save() + redact_token()
cli/src/knowledge_cli/client.py       KnowledgeClient over /auth + /app + /api; ApiError
cli/src/knowledge_cli/main.py         argparse skeleton + `knowledge config` + the error boundary
cli/tests/test_config.py              10 tests pinning the documented resolver contract
cli/uv.lock                           (not in the plan's tree — see Deviations)
```

Exactly one runtime dependency (`httpx`), stdlib `argparse` with `set_defaults(func=…)` throughout — the house style of `scripts/workflow.py` and `onboarding_smoke.py`. No typer/click/rich introduced.

## Open Question (d), answered: the CLI is `knowledge`

Per the plan: package `knowledge-cli`, module `knowledge_cli`, console script **`knowledge`**, **no `kb` alias**. The primary caller is a coding agent, not a human typing all day, so the explicit name costs nothing and reads unambiguously in S4's agent docs; `kb` is a generic two-letter name with real PATH-collision risk. Matches the `knowledge-kb` config dir and the `knowledge` plugin.

## The port is faithful — proven differentially, not by reading

The main risk in this slice was `resolve()` silently diverging from the prose resolver it ports. Rather than trust a careful reading, I **extracted the resolver verbatim from `plugin/skills/explain/SKILL.md` (lines 32–77) and ran it against `config.resolve()` across a 20-scenario matrix**, comparing `KEY=VALUE` output line by line (scratchpad harness, not committed — tests stay terse).

**20/20 scenarios agree**, including the traps a reading would plausibly miss:

| Scenario | Agreed behavior |
|---|---|
| config is JSON `null` | parses to `None` → treated exactly like **no file** (falls through to legacy) |
| config is a flat shape | silently **not read** — "a flat shape will not be read" is literally true |
| `api: null` / `api` absent | `cfg.get("api") or {}` → defaults, not a crash |
| `{}` + legacy present | config is **authoritative** → defaults win, legacy never consulted |
| empty-string env var | treated as unset |
| `KB_SITE_BASE_URL` | **not** an override — `site.base_url` has none, deliberately |
| `kb_root: "~/kb"` | expanded |
| unparseable | `error`, never falls back |

## Verification

| # | Command | Result |
|---|---|---|
| 1 | `cd cli && uv run pytest -q` | **10 passed** |
| — | differential vs the real SKILL.md heredoc (scratchpad) | **20/20 scenarios agree** |
| 2 | `uv tool install ./cli` → `knowledge --version` / `--help` / `config` | installed 1 executable; all four resolver branches correct through the **installed binary**; uninstalled cleanly |
| 3 | `python3 scripts/plugin_parity.py` | **exit 1, 34 issues = 26 completeness + 8 byte-drift** — byte-identical to the pre-slice baseline; **0 mentions of `cli/`** |
| 4 | `uv run pytest -q` (repo root) | **65 passed, 12 skipped** (unchanged) |
| 4 | `git status --porcelain` | only `cli/` + `works/`; **no root file touched** |
| — | `python3 scripts/workflow.py validate` | passed |

`knowledge config` through the installed binary, all four branches: `unconfigured` (exit 1), legacy (`KB_LOCAL_FALLBACK=yes`), remote-only SaaS config (`KB_API_TOKEN=vk_…9f2c`, `KB_LOCAL_FALLBACK=no`), and `error` on unparseable (exit 1). The token is redacted everywhere it is printed.

### Live probes — two facts confirmed at zero risk

The local stack is **not running** (no Postgres; only unrelated containers), so I probed the deployed host **read-only, no credentials, no POST**:

- `GET https://knowledge.hi2vi.com/healthz` → `{'status': 'ok', 'docs_root': '/repo/docs', 'db': 'ok', 'documents': 11}` — the client's transport, base-url handling, UA and JSON parsing work **end to end against the real server**.
- `GET /auth/me` → **404, `content-type: text/html`** — **phase fact 3 re-confirmed live**: the control plane is unrouted and `/auth/*` falls into the mkdocs catch-all. `_detail()` correctly degraded the HTML body to `''` instead of spraying a web page through an error message. This is exactly the pre-S5 symptom, and the client already handles it.

## What I could NOT verify — read this honestly

1. **The documented install command does not work yet.** `uv tool install git+https://github.com/leetusik/knowledge#subdirectory=cli` is **unverifiable until the operator pushes**. I verified the claim rather than repeating it: local `main` is **30 commits ahead of `origin/main`** (the plan said 29 — off by one, presumably the DECOMP commit), `origin/main` is at `4bec5de`, and `git ls-tree origin/main -- cli` is **empty** — as is `server/auth_api.py`, so the entire P10–P12 control plane is unpushed too. That URL currently resolves to P9-era code with no `cli/`. **Only the local-path form (`uv tool install ./cli`) is proven.** Do not claim otherwise in S4's docs.
2. **Every `/auth` and `/app` wrapper is unexercised against a real server** — no local stack, and the deployed host does not route those planes (see above). Only `/healthz` was hit live. Their shapes are lifted from `onboarding_smoke.py`'s proven calls, but "lifted correctly" is an inference until S2/S3 run them. The `/api` wrappers are likewise unexercised.
3. **`save()` has never met a real `/knowledge:setup`-written config.** The operator has **no `~/.config/knowledge-kb/` at all** (confirmed — and never touched; all runs used a temp `XDG_CONFIG_HOME`). Its unknown-key preservation is proven only against synthetic configs.

## Deviations from `plan.md`

1. **`knowledge config` shipped** — plan-sanctioned deviation from DECOMP's "skeleton + `--help`, no behavior yet". It makes the slice verifiable by running the real thing.
2. **`cli/uv.lock` exists** — not in the plan's file tree; `uv run` creates it. Kept: it pins `httpx`+`pytest` for reproducible `cd cli && uv run pytest` in S2–S5. Not consumed by `uv tool install`, and parity ignores it (0 `cli/` mentions). Trivially removable if the review dislikes it.
3. **Three small hardenings the plan did not specify** (all documented in-code):
   - A **non-dict** `api`/`site` value, or a non-object JSON root, yields `{}`/`status=error` instead of the skill's `AttributeError` traceback. A traceback is not a contract worth porting; both sides still refuse to proceed.
   - `save()` **raises `ConfigError` rather than clobber** a config file that exists but cannot be parsed — refusing to destroy a file the user may want to repair.
   - The `knowledge-kb` directory is created `0o700` (the skill's `mkdir -p` uses the umask). The file is `0o600` either way.
4. **`.gitignore` untouched.** The plan allowed it if a build artifact appeared; none did (uv builds out-of-tree). **Zero root files changed.**

## What S2 must know

- **`save({"api": {"token": vk_key}})` deep-merges** — it will not drop a neighbouring `api.base_url`. Use the nested schema; a flat shape is silently ignored by the skill. `auth.session_token` (D-P13-3) is additive and survives untouched.
- **Mode 0600 is set on the temp file before `os.replace`**, so the config is never briefly world-readable with a `vk_` in it. Do not add a `chmod` after the fact.
- **`client.py` takes a per-call `token=`** override — hold the session token and the `vk_` key at once and pass whichever the plane wants (`/app/*` = session token; a `vk_` gets **401** there).
- **The signup/login asymmetry is real**: `signup` → `{token, user, tenant}` (**singular**), `login` → `{token, user, tenants[]}` (**plural**). Both are documented on the wrappers.
- **`credential_create()` returns the plaintext `vk_` once, ever.** Write it to the seam; never print or log it. `redact_token()` is there for any display.
- **The generic 401 is preserved** — `ApiError.detail` carries the server's own wording; do not "helpfully" distinguish bad email from bad password.
- **`knowledge config` exits 1 on `unconfigured`** and prints a factual message that deliberately **does not** name an unshipped command. Once `init` exists, S2 should add that hint.
- **Live-test against `--base-url http://localhost:8766`** — the control plane 404s at the edge until S5. The `https://knowledge.hi2vi.com` default is the *onboarding* target, deliberately different from `resolve()`'s documented `localhost:8766` default (they answer different questions).
- The operator has **no config file today**, so S2's `init` will be the first thing ever to create it — the "preserve unknown keys" path will not be exercised on their machine.
