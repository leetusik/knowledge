# P20.S1 result — installer + hero honesty + CLI onboarding fixes

Executor: `slice-executor-high`. All five workstreams from `plan.md` landed; folds in D16.

## What changed

### 1. `web/public/install.sh` (new, 50 lines) — the curl installer

Served live at `https://knowledge.hi2vi.com/install.sh` (standalone image ships `public/` + nginx
`/` catch-all — zero infra). Contract met: `#!/usr/bin/env bash` + `set -euo pipefail`; all logic in
`main()` with `main "$@"` last (partial-download safety); requires `curl` (clear fail otherwise);
bootstraps `uv` via the official Astral installer + `export PATH="$HOME/.local/bin:$PATH"` and
re-checks when missing; installs with the upgrade-safe `uv tool install --reinstall
git+https://github.com/leetusik/knowledge#subdirectory=cli`; verifies `knowledge --version` and
prints the PATH remedy if the binary isn't visible; finishes by printing
`knowledge init --email you@example.com`. No sudo; each phase echoed before it runs.

### 2. `web/src/content/marketing/terminals.ts` — honest hero terminal

Replaced `HERO_TERMINAL`'s 7 lines (line 1 live-broken) with the approved 10-line honest depiction:
curl one-liner → `knowledge init --email …` → `Password:` → real `init` prints (`signed up as … (org:
default)` / `project: default (created)` / `key: minted vk_…9f2c` / `config: … (0600)`) → `knowledge
save explainer.md` → `saved: explainer` / `url: https://…/documents/a1b2c3` (showcases the P19 direct
doc link). Tones applied with the file's existing judgment (`prompt` for `$ `, `arg` for flags/paths
incl. the install URL and the doc url, `ok` for status lines, `key` for `vk_…9f2c`; `Password:` left
untoned as on-dark body). Header comment updated to record the copy departure from `build-prompt.md
§4` (hero line 1 was live-broken; P20 decision). `CONNECT_TERMINAL` untouched;
`web/design/rounds/01-*` untouched.

### 3. `knowledge init` web-login line — `cli/src/knowledge_cli/auth.py`

Added one base_url-aware line just before the final `done —`:
`web login: {base_url}/login (same email + password)`, with a comment explaining the shared
accounts plane.

### 4. D16 — reuse-gate relaxation — `cli/src/knowledge_cli/auth.py`

Dropped `same_project` from the reuse condition → `if api.get("token") and same_service and not
args.new_key`. `config.save()` still re-records `api.project` every run (unchanged). The legacy note
was generalized: it now fires once when the requested project differs from the recorded one (or the
recorded project is absent and the request is non-default), warning that a pre-P18 key may be
project-bound (writes still land under the requested name; usage meters against the key's own project;
`--new-key` mints fresh). The "absent = unknown, never mismatched" spirit and show-once property are
preserved (a same-default re-run stays silent, the key is never printed). Rewrote the two stale
comment blocks to the new truth (reuse across projects is the point of org keys; cites D16 + P18).

Tests (`cli/tests/test_auth.py`): rewrote `test_init_remints_when_the_configured_project_changes` →
`test_init_project_change_reuses_the_org_key` (proves `init --project other` reuses: `minted == 1`,
`api.project` re-recorded to `other`, and the cross-project note fires on stderr).
`test_init_new_key_mints_again` already proves `--new-key` still mints (unchanged, still green). No
fixture sprawl added.

### 5. Install copy touch-ups

- `cli/README.md` §Install — added the curl one-liner as the quick path; the `git+` `uv` form stays
  the canonical/manual channel (D-P13-1 unchanged).
- `cli/src/knowledge_cli/guide.py` §1 — `INSTALL_COMMAND` unchanged (agents want the direct `git+`
  form); added one sentence noting the human one-liner wraps exactly that command.

## Validation

| Command | Result |
| --- | --- |
| `bash -n web/public/install.sh` | PASS (clean; `shellcheck` not installed on this box, so not run) |
| `cli/.venv/bin/python -m pytest cli/tests -q` | PASS — 40 passed (0.28s) |
| `cd web && npm run typecheck` | PASS (tsc clean) |
| `cd web && npm run lint` | PASS (eslint clean) |
| `cd web && npm run test` | PASS — 61 vitest tests (8 files) |

Notes on validation: the plan lists `python3 -m pytest cli/tests` — the system `python3` here is 3.13
without pytest/httpx, so the suite runs via the repo's `cli/.venv` (3.12, editable `knowledge_cli` +
pytest + httpx; confirmed the venv resolves `knowledge_cli` to `cli/src/`). No vitest covers the
marketing terminal content, so `npm run test` doesn't directly guard the hero copy (typecheck + lint
do); it was run anyway and stays green. Live `curl | bash` E2E is S4's job, not S1's.

## Shipping caveat (per plan)

The installer's `git+…#subdirectory=cli` form installs **GitHub main**, so S1's CLI changes (the
web-login line + D16 reuse) reach `curl | bash` / `git+` users **only after S4's operator-gated `git
push` of main**. S1 lands code + the honest hero; S4 pushes + live-verifies. Likewise
`web/public/install.sh` is only live at `/install.sh` after S4's web deploy.

## Doc impact (appended to phase.md, not versioned — REVIEW consolidates)

- `decisions.md` — curl-installer resolution (not PyPI, D-P13-1 stands), D16 reuse-gate relaxation,
  hero-honesty via depicted prompt (no generator), `knowledge init` web-login line.
- `experience.md` (CLI/onboarding) — honest hero terminal, web-login line, D16 cross-project reuse,
  curl one-liner in `cli/README.md` + `guide.py`.
- `operations.md` — `web/public/install.sh` served live at `/install.sh` (zero infra), wraps
  `uv tool install --reinstall git+…`.
- `frontend.md` — hero terminal (`terminals.ts` `HERO_TERMINAL`) copy change (content-only, no
  design round).

## Deviations from plan

None of substance. One environmental adaptation: ran the CLI suite via `cli/.venv/bin/python -m
pytest` because the box's default `python3` (3.13) lacks pytest/httpx — same command, working
interpreter (noted in phase.md as a gotcha for S4/REVIEW). `shellcheck` is not installed, so only
`bash -n` was run for the installer (the plan marked shellcheck optional: "if installed").
