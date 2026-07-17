# P13.S4 — Agent-readable guide docs + discovery

`implementation` · risk `medium` · order 4 · depends P13.S3 → executor **`slice-executor-mid`**

## Context

P13's intent has two deliverables: the CLI (S1–S3, shipped) and **agent-readable guide docs so a coding agent can drive the whole flow without the website**. S4 is the second half. S1–S3 built `init`/`signup`/`login`/`logout`/`whoami` and `save`/`search`/`list`/`read`/`projects`/`usage`, each with dense reasoned docstrings — but a coding agent that has never heard of this CLI has nothing to read. S4 gives it one: a bundled `knowledge guide` command that emits the full machine-readable contract, plus a discovery path so an agent *finds* the CLI in the first place.

This resolves the phase's **Open Question (a)** — bundled vs served — in favor of **bundled** (D-P13-6). Vocky retired its served `docs.json` because packaged-but-served docs rotted (its D-P2-4); the guide ships *inside the wheel*, versioned with the code, works offline, and adds **no `server/` route** (so no parity debt against `shipped_dirs`).

## Decisions (made at this planning turn — settled, not open)

1. **Bundled, not served (D-P13-6 confirmed).** `knowledge guide` prints markdown compiled into the package. No API endpoint, no `server/` change.
2. **The guide content is a Python string in `guide.py`, not a `.md` data file.** A data file needs hatch `force-include`/artifacts config and can silently miss the wheel; a module string is guaranteed present and needs zero packaging config. The live install still verifies it ships.
3. **Discovery = the end of the install instructions, aimed at agents.** Per the operator: this repo's `AGENTS.md`/`CLAUDE.md` is for the Codex agent working *on this codebase*, not for a user's agents — so the snippet does **not** go there. Instead, `cli/README.md`'s install section ends with a short paragraph an arbitrary coding agent reads naturally ("if you're an agent driving this, run `knowledge guide` for the full contract"), the root `README.md` gets a CLI section ending the same way, and `knowledge --help` carries an epilog pointing at `knowledge guide`. Three natural on-ramps; none writes into the user's repo.
4. **The guide documents the git install form**, `uv tool install git+https://github.com/leetusik/knowledge#subdirectory=cli` — the real distribution channel (D-P13-1). It is true the moment the operator pushes (`cli/` is 33 commits unpushed today); S4 verifies *bundling* with the proven local `uv tool install ./cli --reinstall`, and **flags the push as `P13.REVIEW`'s gate** (pushing also turns `plugin-ci.yml` red — the pre-existing D9 parity debt, not S4's to fix).

## What ships

| File | |
|---|---|
| `cli/src/knowledge_cli/guide.py` | **NEW** — the `GUIDE` markdown string (the agent contract) |
| `cli/src/knowledge_cli/main.py` | **EDIT** — register the `guide` command; add a `--help` epilog pointing at it |
| `cli/README.md` | **NEW** — human quickstart, install section ending in the agent-discovery paragraph |
| `README.md` (root) | **EDIT** — a CLI section beside the existing plugin one, same agent-facing tail |
| `cli/tests/test_guide.py` | **NEW** — one terse anti-rot test |

### `knowledge guide` — the contract an agent reads

Agent-oriented, imperative, real commands — tone reference `~/projects/personal/vocky/docs/current/experience.md` (numbered lifecycle; explicit callouts of the non-obvious). One document, printed to stdout, exit 0. It must cover the whole lifecycle **and** every constraint an agent cannot guess:

- **Install** — the git form (decision 4).
- **Onboard** — `knowledge init --email … --password-stdin` (one shot: signup-or-login → project → key → config → verify); idempotent; passwords never via `--password`/argv (`--password-stdin` > `$KNOWLEDGE_PASSWORD` > TTY prompt).
- **The two-token model** — a non-expiring `vk_` (`api.token`) drives `save`/`search`/`list`/`read`/`projects`; a 30-day session drives `usage`. After `logout` the first five keep working; only `usage` needs `knowledge login`. **The `vk_` is show-once and the CLI stores it for you — it is never printed.**
- **Save** — body from a file or `-` (stdin), **starting at the `# H1`, no frontmatter** (the API writes its own); **2–5 tags, lowercase-kebab**; project defaults to the **git repo's directory name** (matching `/knowledge:explain`); 409 → `--overwrite`.
- **Search / list / read / projects / usage** — one line each, with the two shape facts that bite: `list` returns `items`, `search` returns `results`; `projects` is a GROUP BY over documents, so a just-created project is absent until its first save.
- **The agent contract** — `--json` on every command prints the server payload verbatim; errors go to **stderr** as `error: …` with exit 1, never as JSON. So an agent branches on the **exit code** and parses stdout only on success.
- **Config** — remote-only (`~/.config/knowledge-kb/config.json`, no `kb_root`, no local fallback), `chmod 600`; `knowledge config` prints the resolved state.
- **One hazard** — `$KB_API_TOKEN` overrides the config's key and an exact match is the server's master bearer (writes to tenant #1's public, git-published corpus); unset it to use your own key.

**Two things the guide must NOT say** (both are real traps from S3's notes): do **not** document a "malformed search query" error — it is unreachable from the CLI (`search.py:264-265`, `raw` not exposed); and note the **`my app` → `my-app` divergence** honestly only if it earns its space — the plugin auto-sanitizes an unusable repo name, the CLI stops and suggests `--project`. Keep the guide about what to *do*, not an errata list.

### Discovery surfaces

- **`cli/README.md`** — install (git form) + a one-command tour, closing with: *"Driving this from a coding agent? Run `knowledge guide` — it prints the full machine-readable contract (auth, the save rules, the `--json`/exit-code protocol)."*
- **root `README.md`** — a short "## Command-line interface" section beside "Install the plugin", same closing line. Root README is **not** parity-tracked (`shipped_dirs` = server/tests/docs-assets), so this adds no debt — but the executor must confirm `plugin_parity.py` still reports **exactly 34 issues** afterward.
- **`knowledge --help` epilog** — one line: *"New here? Run `knowledge guide` for the full agent-readable contract."*

### Test (terse — one is enough)

`cli/tests/test_guide.py::test_guide_covers_the_load_bearing_constraints`: run `guide`, exit 0, and assert the output contains each fact that must never silently rot out — the 2–5 tag rule, "show-once"/"never printed", the two-token split, the `--json`/exit-code contract, and the git install command. Plus assert no `vk_`-shaped secret is present (there is none to leak, but pin it). This is the guard that stops a future edit from quietly dropping a constraint an agent depends on.

## Verification

Live (the slice is not done without it), matching S3's discipline:

```
uv tool install ./cli --reinstall          # --force does NOT rebuild (S2/S3)
knowledge guide                            # from the INSTALLED binary — proves the string ships in the wheel
knowledge guide | head; knowledge --help   # epilog points at guide; guide is non-empty, well-formed markdown
```
The one real risk is that `guide.py`'s content does **not** reach the installed package — the module-string approach makes that near-impossible, but the installed-binary run is what actually proves D-P13-6 ("bundled, offline") rather than asserting it. No server, no network, no auth needed for `guide` itself.

Regressions — each must match the S3 baseline exactly:

```
cd cli && uv run pytest -q          # was 38 passed; +the new guide test
uv run pytest -q                    # root: 65 passed, 12 skipped — unchanged
python3 scripts/plugin_parity.py    # exit 1, EXACTLY 34 issues, 0 cli/ mentions — even after the root README edit
python3 scripts/workflow.py validate
git status --porcelain              # cli/ + works/ + README.md — the root README is the one deliberate exception
```

Then: `result.md` (free-form, honest about deviations and what shipped), the `phase.md` cross-slice notes (what S5/REVIEW must know — above all that the **git install form needs the push**, REVIEW's gate), and the `phase.md` **Doc impact** line. Record that **Open Question (a) is resolved** (bundled, D-P13-6 confirmed; discovery = README + `guide` command, not the API). No `doc-new-version` — `P13.REVIEW` consolidates. Expected doc impact: `product.md` (agent-first guide docs as a shipped deliverable), `operations.md` (the `knowledge guide` command + git install), `decisions.md` (Open Question (a) resolved / D-P13-6); no `api.md` (no route added).
