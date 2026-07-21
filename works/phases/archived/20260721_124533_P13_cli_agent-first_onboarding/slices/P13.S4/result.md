# P13.S4 result — Agent-readable guide docs + discovery

Shipped the second half of P13's intent: a bundled `knowledge guide` command that
emits the full agent-readable contract, plus three discovery on-ramps that point an
arbitrary coding agent at it. All four planning decisions held; no deviations.

## What shipped

| File | Change |
|---|---|
| `cli/src/knowledge_cli/guide.py` | **NEW** — `GUIDE` (the contract, an 8-section numbered lifecycle as a module string) + `INSTALL_COMMAND` constant + `cmd_guide`/`register`. |
| `cli/src/knowledge_cli/main.py` | **EDIT** — import `guide`, `guide.register(sub)`, and a `--help` epilog: "New here? Run `knowledge guide` for the full agent-readable contract." |
| `cli/README.md` | **NEW** — human quickstart: install (git form), a one-command tour, closing with the agent-discovery paragraph. |
| `README.md` (root) | **EDIT** — a "## Command-line interface" section beside "Install the plugin", same agent-facing tail. The one deliberate non-`cli/` edit; root README is not parity-tracked. |
| `cli/tests/test_guide.py` | **NEW** — one terse anti-rot test. |

## Decisions carried out (all settled at planning, none relitigated)

1. **Bundled, not served (D-P13-6 confirmed).** No `server/` route, no API endpoint.
   The guide is compiled into the wheel and prints offline.
2. **Guide content is a Python string in `guide.py`,** not a `.md` data file — a
   string is guaranteed present in the wheel with zero packaging config; a data file
   would need hatch `force-include`/artifacts and could silently miss it.
3. **Discovery = install-instruction tails aimed at agents**, not this repo's
   `AGENTS.md`/`CLAUDE.md` (that is for the Codex agent working *on* this codebase,
   per the operator). Three natural on-ramps: `cli/README.md`'s install section, the
   root `README.md` CLI section, and the `knowledge --help` epilog.
4. **The guide documents the git install form**
   (`uv tool install git+https://github.com/leetusik/knowledge#subdirectory=cli`) as
   the distribution channel — true the moment the operator pushes. Bundling was
   verified with the proven local `uv tool install ./cli --reinstall`.

## What the guide covers (and deliberately does not)

Full lifecycle, agent-first: install → `init` (idempotent, `--password-stdin` >
`$KNOWLEDGE_PASSWORD` > TTY, never `--password`/argv) → the two-token model (`vk_` in
`api.token` drives save/search/list/read/projects forever; the 30-day
`auth.session_token` drives only `usage`) → save (H1-first body, no frontmatter;
2-5 lowercase-kebab tags; project = git repo dir name matching `/knowledge:explain`;
409 → `--overwrite`) → search/list/read/projects/usage (with the `items` vs `results`
shape split and the GROUP-BY-over-documents `projects` fact) → the `--json`/exit-code
agent contract → remote-only config, `chmod 600` → the one `$KB_API_TOKEN` → tenant-#1
public-write hazard. The show-once `vk_` is stated as written-for-you and never
printed.

Per S3's traps, the guide **does not** document a "malformed search query" error
(`search.py:264-265` is unreachable without the `raw` flag the CLI never exposes) —
`search` is framed as "any query is safe to type". The `my app` → `my-app` divergence
is stated honestly in one clause (the CLI stops and suggests `--project`), framed as
what to *do*, not an errata entry. No invented errors.

## Verification

### Live run (required — the slice's whole point)

```
uv tool install ./cli --reinstall          # --reinstall, not --force (S2/S3 trap)
knowledge guide                            # from the INSTALLED binary
knowledge --help                           # epilog + guide subcommand
```

- Installed to `~/.local/bin/knowledge`, package at
  `~/.local/share/uv/tools/knowledge-cli/bin/python`.
- `knowledge guide` from the **installed** binary emits the full contract: 155 lines,
  8765 bytes, well-formed markdown (8 `##` sections, single `#` title). **This proves
  D-P13-6's "bundled, offline" claim rather than asserting it** — the module string
  reached the wheel. No server, no network, no auth touched.
- `knowledge --help` (installed binary) lists `guide` in the subcommand set and ends
  with the epilog line pointing at it.

### Regressions — all match the S3 baseline exactly

```
cd cli && uv run pytest -q       → 39 passed   (was 38; +test_guide.py)
uv run pytest -q  (root)         → 65 passed, 12 skipped   (unchanged)
python3 scripts/plugin_parity.py → exit 1, EXACTLY 34 issues, 0 cli mentions
                                   (byte-identical to the pre-edit run — the root
                                    README edit did NOT move the count; README.md is
                                    not in shipped_dirs = server/tests/docs-assets)
python3 scripts/workflow.py validate → passed
git status --porcelain           → cli/ + works/ + README.md only
```

`git status` shows my files under `cli/` (guide.py, main.py, README.md,
test_guide.py) plus the root `README.md`; the `works/*` entries are the
orchestrator's slice-start transitions and this slice's `plan.md`, not my edits.
Nothing in `server/`, `tests/`, or `plugin/` — no new parity debt.

## Deviations from plan

None. Every planned file, decision, and check landed as written.

## For REVIEW / the operator

The git install form the guide documents is **not yet true**: `cli/` is unpushed
(local `main` well ahead of `origin/main`; `git ls-tree origin/main -- cli` is
empty). **The operator pushing is `P13.REVIEW`'s gate** — until then only the local
`uv tool install ./cli` form works, and pushing also turns `plugin-ci.yml` red (the
pre-existing D9 parity debt, not S4's to fix). Open Question (a) is now resolved:
bundled (D-P13-6 confirmed), discovery via README tails + the `guide` command, not
the API.
