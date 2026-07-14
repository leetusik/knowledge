# Plan — P7.S6: E2E install test + docs

Orchestrator plan (auto run). Executor: slice-executor-mid. Read FIRST: `phase.md` (Decomposition P7.S6; the S3/S4/S5 "landed" Findings blocks — they hold the renderer facts, config schema, and the exact rehearsal commands S5 proved; Constraints) and `plugin/README.md` + root `README.md`. No commits, no status transitions.

## Goal

Prove the whole plugin the way a stranger meets it — install surface, then the full user journey through BOTH skills including the failure path — and write the docs that make it installable: README sections + finalized plugin README + release checklist.

## Part A — install-surface verification

1. `claude plugin validate .` , `claude plugin validate ./plugin`, both again with `--strict` → all exit 0.
2. Mechanical install-surface sanity (the things `/plugin marketplace add` + `/plugin install` resolve): marketplace entry `name` == plugin.json `name`; `source: "./plugin"` resolves to a dir containing `.claude-plugin/plugin.json`; both skills present at `plugin/skills/{explain,setup}/SKILL.md` with `name:` frontmatter; no `version` in the marketplace entry; no component files inside `plugin/.claude-plugin/`.
3. If (and only if) the `claude` CLI exposes a NON-interactive marketplace/install path (check `claude plugin --help`), exercise it against `./` in a sandboxed config dir and record the result. If it's interactive-only, record that the interactive `/plugin marketplace add <path>` flow is left to the operator's post-phase QA — do NOT spawn interactive sessions, and do NOT run `claude -p` (it would burn model quota and act on this repo).

## Part B — full user-journey E2E (all against a TEMP scaffold; NEVER the operator's live KB at :8765/:8766)

Reuse S5's rehearsal pattern (S5's Findings block records the exact commands): temp target + temp `XDG_CONFIG_HOME`, test params (distinct site name, TZ, ports 9765/9766), render → marker → git init/commit → config write (600).

Then the new ground — drive the SHIPPED explain skill's own spelled commands (extract them from `plugin/skills/explain/SKILL.md` verbatim) against that scaffold:

4. **API path (201)**: `docker compose up -d --build` in the scaffold (test ports; `COMPOSE_BAKE=false` if the compose build panics — known host quirk); resolver snippet (with the temp XDG env) → must yield the scaffold config; build a tiny valid explainer payload exactly per the skill (body.md + meta.json + merge one-liner) with a REAL-but-minimal house-style body; curl POST → expect 201; assert: doc file exists in the scaffold at `docs/<project>/<date>-<slug>.md`, Recent bullet inserted under the marker, DB row present (`/api/documents` lists it), scoped git commit landed in the scaffold repo (git log shows it, only the two paths staged).
5. **Duplicate guard (409)**: re-POST the same payload → expect 409 with `existing_title`/`rel_path` (no second file, no second bullet).
6. **Fallback path (transport failure, local kb_root)**: `docker compose stop api` (or down) → re-run the resolver (unchanged config) → per the skill, curl now exits non-zero → perform the skill's fallback steps verbatim: hand-written frontmatter file, marker insert, `git -C <scaffold> add -A` + commit → assert file + bullet + commit. Then **reconciliation**: bring the api back up (startup reindex is on by default) or POST `/api/reindex`; assert the fallback doc now appears in `/api/documents`.
7. **Gate still green with the grown corpus**: `docker run --rm -v <scaffold>:/docs squidfunk/mkdocs-material:9.7.6 build` + `python3 <scaffold>/scripts/site_smoke.py --root <scaffold>` → PASS (now 2 projects/3 docs — dynamic discovery proves itself).
8. Full teardown: compose down -v, remove containers/images if created solely for this (image reuse from S5 is fine), delete temp dirs. `docker ps` clean of rehearsal containers.

## Part C — docs

9. **Root `README.md`** — add two sections (match the README's existing voice; keep them tight):
   - "**Install the plugin**" (near the top, after the pitch): the plugin ships this repo's knowledge feature for any Claude Code user — `/plugin marketplace add leetusik/knowledge`, `/plugin install knowledge@knowledge`, then `/knowledge:setup` once, then `/knowledge:explain <topic>`; requirements one-liner; link to `plugin/README.md`.
   - "**Recreating from scratch**" (this fulfills the long-dangling reference in the workspace explain skill's step 2 — for the operator's OWN KB): restore = clone this repo + `docker compose up -d` (reindex self-heals the DB); rebuild-fresh = install the plugin and run `/knowledge:setup`, then point `~/.config/knowledge-kb/config.json` at the restored/new location.
10. **`plugin/README.md`** — finalize: remove the placeholder blockquote (the skills exist now); add a short "Development & releasing" section: the payload is snapshot-synced from the live repo (parity guard `scripts/plugin_parity.py`, CI `plugin-ci.yml`), and the **release checklist**: any `plugin/**` change ships only with a `plugin.json` version bump (installers update on bumps), run parity + both validates + the E2E rehearsal before pushing a release.
11. Cross-check no doc contradicts reality (ports, commands, paths as landed).

## Validation summary to record

Parts A/B assertions above, plus: `python3 scripts/plugin_parity.py` (README edits must not disturb parity — root README is not in the manifest), and `python3 scripts/workflow.py validate`.

## Wrap-up

- Append to `phase.md` Findings: "P7.S6 landed" block — E2E outcomes (both paths + reconciliation), any install-surface caveat (e.g. interactive-only marketplace add left to operator QA), and where the release checklist lives.
- Append Doc impact lines:
  - `operations — E2E-proven user journey (install surface, setup, explain 201/409/fallback + reindex reconciliation, gate green on grown corpus); release checklist: plugin/** change ⇒ plugin.json version bump + parity/validate/E2E before push. [S6]`
  - `product — the knowledge feature now ships as an installable Claude Code plugin (marketplace + /knowledge:explain + /knowledge:setup); README carries install + recreate-from-scratch paths. [S6]`
- Keep `plugin.json` at 0.1.0 (first release bump is the operator's call at/after review).
- Write `result.md` from scratch; return the structured verdict.

## Escalation 1: mid → high

The mid tier executed Parts A and B cleanly and stopped early (worktree untouched, scaffold/image/temp dirs torn down, live KB untouched, no docs written) on a REAL shipped-feature gap at Part B step 7.

**What passed (trust it, with the noted exception):**
- Part A fully: all four `claude plugin validate` runs; every mechanical install-surface check; AND a real non-interactive install E2E — `claude plugin marketplace add <local path>` + `claude plugin install knowledge@knowledge` in a sandboxed `CLAUDE_CONFIG_DIR` (both skills resolved at v0.1.0, enabled), torn down cleanly. The re-run may cite these instead of repeating them IF the manifests/skill frontmatter are untouched since (P7.F1 edits the explain skill BODY — frontmatter untouched — so a quick re-`validate` of both dirs is enough; the sandboxed install need not be repeated).
- Part B steps 4–6 + reconciliation, against a temp scaffold on ports 9765/9766: render/marker/git/config(600)/resolver → compose up healthz+viewer → API 201 (file + basename-sanitized source.repo + Recent bullet + DB row + scoped 2-path commit) → 409 duplicate guard (no duplication) → fallback on curl exit 7 (file + bullet + commit; used a realistic `/Users/example/...` source.repo) → startup-reindex reconciliation (fallback doc appears via API; path sanitized) → mkdocs build with NO `/Users/` leak in any built HTML. These must be RE-RUN after the fix (code changed), but the commands are proven — reuse them.

**What broke (step 7):** `python3 <scaffold>/scripts/site_smoke.py --root <scaffold>` → `FAIL: site/e2e-demo/index.html missing`. Root cause: the API write path (`server/documents.py`) and both explain-skill branches create the dated doc + Recent bullet but never a project landing `docs/<project>/index.md`; `check_built` requires `site/<project>/index.html` for every project `discover_projects()` finds; `navigation.indexes` doesn't synthesize one. The scaffold's seed project passes only because the template ships its landing; the operator's landings are hand-written.

**Resolution:** fix slice **P7.F1** (order 5.5) makes the API write path auto-create a minimal `docs/<project>/index.md` when absent (never overwriting), mirrors the change across the byte-parity boundary (template `server/documents.py` + tests), and adds the same ensure-landing step to the explain skills' fallback branches. Run AFTER P7.F1 is done.

**Revised charter for the high-tier re-run:**
1. Confirm P7.F1 landed: `uv run pytest -q`, `python3 scripts/plugin_parity.py`, `claude plugin validate .` + `./plugin` (all green).
2. Re-run Part B FULLY (steps 4–8) on the fixed code — same commands, temp scaffold, test ports; step 4 additionally asserts the new-project landing `docs/<project>/index.md` was auto-created and included in the scoped commit; step 6's fallback likewise ensures the landing per the updated skill; step 7 must now PASS on the grown corpus.
3. Then Part C docs as planned (if the auto-landing is worth a user-facing sentence, one line in plugin/README's explain description or the root README section — your call).
4. Run the deferred `python3 scripts/plugin_parity.py` + `python3 scripts/workflow.py validate` at the end as planned.
