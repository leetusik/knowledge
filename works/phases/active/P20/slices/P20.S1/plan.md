# P20.S1 — installer + hero honesty + CLI onboarding fixes (orchestrator plan, operator-approved 2026-07-22)

Executor: `slice-executor-high`. Read `phase.md` (decisions, findings — they ground everything here) and this plan before touching code. This slice folds in deferred **D16** (now `promoted`, pointing here; original context at the bottom).

## Context

The landing hero's install line `uv tool install knowledge-cli` fails live (never on PyPI, D-P13-1). Operator-approved decisions (fixed, from DECOMP): **curl installer** (`curl -fsSL https://knowledge.hi2vi.com/install.sh | bash`), **depict-the-prompt password honesty** (no generator), **D16 folds in here** (org keys are project-agnostic — `init --project other` must reuse, not re-mint). No design round in this slice — hero command text is content inside the already-designed component; the new landing *sections* are S2/S3's job.

## Changes (5 workstreams)

### 1. `web/public/install.sh` — new file, the curl installer

Served live at `https://knowledge.hi2vi.com/install.sh` with zero infra work (standalone image ships `public/`; nginx `/` catch-all — see phase.md Findings). Contract:

- `#!/usr/bin/env bash`, `set -euo pipefail`, all logic inside `main()` with `main "$@"` as the last line (partial-download safety for `curl | bash`).
- Requires `curl`; check and fail with a clear message otherwise.
- If `uv` is missing: say so, run the official Astral bootstrap `curl -LsSf https://astral.sh/uv/install.sh | sh`, then `export PATH="$HOME/.local/bin:$PATH"` for the rest of the script and re-check.
- Install with the repo's own upgrade-safe form (`cli/README.md:15`): `uv tool install --reinstall git+https://github.com/leetusik/knowledge#subdirectory=cli` — idempotent re-runs, picks up new main.
- Verify `knowledge --version` (exists — `cli/src/knowledge_cli/main.py:75` prints `knowledge-cli {__version__}`); if `knowledge` isn't on PATH after install, print the remedy (add `~/.local/bin` to PATH / `uv tool update-shell`).
- Finish by printing the next step: `knowledge init --email you@example.com`.
- Terse and auditable (~≤70 lines), no sudo, echo each phase before doing it.

### 2. `web/src/content/marketing/terminals.ts` — honest hero terminal

Replace `HERO_TERMINAL` lines (currently 7, first line broken) with the honest depiction — approved exact content (tones: `prompt` for `$ `, `arg` for flags/paths, `ok` for success lines, `key` for the vk_; apply tones with the same judgment the current file shows):

```
$ curl -fsSL https://knowledge.hi2vi.com/install.sh | bash
$ knowledge init --email you@example.com
Password:
signed up as you@example.com (org: default)
project: default (created)
key: minted vk_…9f2c
config: ~/.config/knowledge-kb/config.json (0600)
$ knowledge save explainer.md
saved: explainer
url: https://knowledge.hi2vi.com/documents/a1b2c3
```

Every line mirrors real output shapes: `Password: ` is the actual getpass prompt (`auth.py:92`), `signed up as … (org: …)` / `project: … (created)` / `key: minted vk_…9f2c` (`redact_token` format, `config.py:292`) / `config: … (0600)` are `cmd_init`'s real prints (`auth.py:477-539`), and `saved:`/`url:` are `knowledge save`'s real prints (`knowledge.py:407-410`) — the url line showcases the P19 direct doc link. Depiction is a representative selection, not a full transcript (the `KB_STATUS=` resolver block is omitted for hero brevity — selection, not dishonesty). Update the file header comment to note the copy departure from `build-prompt.md §4` (hero line 1 was live-broken; P20 decision). **Never edit `web/design/rounds/01-*`** (read-only design record). Leave `CONNECT_TERMINAL` untouched.

### 3. `knowledge init` web-login line — `cli/src/knowledge_cli/auth.py`

Add one base_url-aware success line making the web-login connection obvious (CLI + web share one accounts plane), printed just before the final `done —` line (`auth.py:560`):

```
web login: {base_url}/login (same email + password)
```

### 4. D16 — reuse-gate relaxation, `cli/src/knowledge_cli/auth.py:491-514`

Org keys are project-agnostic (`project_id NULL`, P18), so drop `same_project` from the reuse condition: reuse iff `api.get("token") and same_service and not args.new_key`. Details:

- `config.save()` already re-records `api.project = project_name` on every init (`auth.py:531`) — the key follows the machine, the project field follows the request. No change needed there.
- Messaging: generalize the existing legacy note (`auth.py:504-514`) — when reusing while the recorded/requested project differ (or recorded absent and requested ≠ default), print once that a pre-P18 key may be project-bound (writes still land under the requested name; usage meters against the key's own project; `--new-key` mints fresh). Preserve the "absent = unknown, never mismatched" spirit and the show-once security property.
- Rewrite the now-stale comment block (`auth.py:482-490`) to the new truth (reuse across projects is the point of org keys; cite D16).
- Tests: adjust/extend `cli/tests/test_auth.py` minimally — one case proving `init --project other` reuses an existing same-service key (no mint), one proving `--new-key` still mints. Keep terse per repo rules (no fixture sprawl).

### 5. Install copy touch-ups (minimal)

- `cli/README.md` §Install: add the one-liner as the quick path; the `git+` form stays the canonical/manual channel (D-P13-1 unchanged).
- `cli/src/knowledge_cli/guide.py`: keep `INSTALL_COMMAND` as the `git+` form (agents want the direct form); add at most a one-line installer mention in the surrounding §install text.

## Shipping caveat (record in result.md)

The `git+` form installs GitHub **main** — S1's CLI changes reach `curl | bash` users only after S4's operator-gated push. S1 lands code + honest hero; S4 ships + live-verifies.

## Validation (run these; report outcomes in result.md)

- `bash -n web/public/install.sh` (+ `shellcheck` if installed)
- `python3 -m pytest cli/tests -q`
- `cd web && npm run typecheck && npm run lint` (and `npm run test` if it covers marketing content)
- Live `curl | bash` E2E is S4's job, not S1's.

## Wrap-up (executor contract)

- Append the "Doc impact" one-liners to `phase.md` (expected: `decisions.md` — curl-installer resolution, D16 relaxation, depict-the-prompt honesty; CLI/onboarding + operations install docs — one-liner + `--reinstall` upgrade path). No `doc-new-version` — REVIEW consolidates.
- Append durable cross-slice notes to `phase.md` (anything S2/S3/S4 need — e.g. the final hero line set S2's design context should know about, installer URL semantics for S4's smoke).
- Write `result.md`; return the structured verdict. No commits, no state transitions.

---

## Promoted Deferred Context (D16, verbatim from promotion)

# Deferred: D16 knowledge init --project other re-mints an org key (reuse-gate relaxation)

## Why Deferred

S4 preserved the init reuse-gate structure verbatim, so a recorded-project change still mints a fresh org key even though org keys are not project-bound — mild tension with one-key-all-repos. Relax the gate to reuse an existing org key across projects.

## Trigger to Promote

next CLI onboarding slice (e.g. P20) or operator reports duplicate org keys
