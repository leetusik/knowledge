# P7.REVIEW — phase review

**Verdict: PASS.** The phase delivered its objective in full, every consolidated
validation is green, all constraints are honored, and the two deliberately-deferred
open items are non-blocking. Eight durable-doc versions were consolidated from the
phase's `## Doc impact` list. No code or `docs/current/*.md` was edited by this review.

_This review runs no state transitions and no commits — the orchestrator records the
verdict via `review-phase` and commits._

## 1. Consolidated validation (all slices together)

| Command | Result |
|---|---|
| `uv run pytest -q` | **57 passed**, 1 warning |
| `python3 scripts/plugin_parity.py` | **PASS** — templates in parity with the repo |
| `claude plugin validate .` (plain + `--strict`) | both **exit 0** — marketplace manifest valid |
| `claude plugin validate ./plugin` (plain + `--strict`) | both **exit 0** — plugin manifest valid |
| Operator-repo gate: `docker run --rm -v "$PWD":/docs squidfunk/mkdocs-material:9.7.6 build` → `python3 scripts/site_smoke.py` | build OK → **PASS** |
| **Crux fresh-scaffold spot-check** (non-operator params: Field Notes / America/New_York / ports **9765-9766** / date 2025-01-15): `render.py` (35 files, no leftover `{{KB_*}}` tokens) → `docker run … build` → `python3 <tmp>/scripts/site_smoke.py --root <tmp>` | render OK → build OK → **PASS**, no home-path leak in built HTML |
| `python3 scripts/workflow.py validate` | **passed** |
| Operator-repo gate **re-run** after doc consolidation (docs/current changed → republished) | build OK → **PASS** |

- **Live KB never touched.** The operator's stack (`knowledge-api-1` / `knowledge-kb-1`
  on 8765/8766) stayed `Up 5 hours`, never restarted; the crux spot-check used ports
  9765/9766 and a temp dir. The temp scaffold dir was removed after use.
- **`plugin/setup/__pycache__/render.cpython-313.pyc`** exists on disk but is **not
  git-tracked** (`git ls-files` empty) — not shipped, no action.

## 2. Judgment against objective / intent / constraints

Objective (package `/explain` + the KB as a Claude Code plugin hosted in this repo,
installable via `/plugin`, SaaS-open, bootstrap untouched) — **fully met**:

- **Real plugin, both manifests valid.** Repo-root `.claude-plugin/marketplace.json`
  (marketplace `knowledge`, owner `leetusik`, single entry `source: "./plugin"`) +
  `plugin/.claude-plugin/plugin.json` (`version 0.1.0` set here only, `license: MIT`,
  homepage = live Pages site). Install path
  `/plugin marketplace add leetusik/knowledge` → `/plugin install knowledge@knowledge`;
  S6 proved the non-interactive equivalent in a sandbox. Interactive
  `/plugin marketplace add` remains **operator post-phase QA** (this env's permission
  system blocks a nested `claude` install — noted, not a phase defect).
- **Ships both skills.** `/knowledge:explain` (config-resolved client + bearer +
  local-only fallback) and `/knowledge:setup` (`disable-model-invocation`, full
  scaffold UX). Both carry `name:` frontmatter and namespace correctly.
- **Setup scaffolds server + MkDocs + Pages** and the fresh scaffold passes its own
  portable deploy gate — the phase crux, re-proven here.
- **Payload isolation holds.** `source: "./plugin"`; the payload ships only the
  templated KB + the two skills. Scanned `plugin/` for operator content / secrets /
  machinery: no `.env`, no token file, no `works/`/`data/`, no `workflow.py`. See
  Findings for the two benign matches.
- **SaaS-open.** Per-user config `~/.config/knowledge-kb/config.json` (chmod 600,
  nested `kb_root`/`api.{base_url,token}`/`site.base_url`), bearer when a token is
  configured, local-only-fallback rule, Gemini key host-env only — nothing hosted
  built, nothing precludes it.
- **MIT** landed (root `LICENSE` + `plugin.json` `license`). **Version stays 0.1.0**
  (pre-release). **Never pushed** (constraint honored; only local commits).
- **Bootstrap repo untouched.** This phase changed only this repo; F1's body-identical
  ensure-landing step touched this repo's own `.claude/`/`.agents/` explain copies (not
  the separate bootstrap repo) — see deviations.

`docs/current/*.md` cross-check: the architecture roadmap line "P7 — `/explain` as a
Claude Code plugin" (was framed as planned) is now stale-on-pass → consolidated to
"delivered"; operations / security / api / backend / qa / decisions / product all had
durable additions. No unfixable contradiction surfaced.

## 3. Open items (deliberately deferred to review) — both non-blocking

1. **uv pin `0.8.14` vs the plan's `0.11.28`** — **KEEP `0.8.14`.** It is the uv that
   produced `uv.lock` (the plan's `0.11.28` rested on a wrong host-version premise); it
   is proven, reproducible, and ships byte-identically in both the repo `Dockerfile` and
   the template (verified equal). A future bump is a one-line change in both places.
   Recorded in the decisions doc.
2. **201 response `url` under custom ports** — **cosmetic, not journey-breaking.**
   `public_base_url()` defaults to `http://localhost:8765`, used at one place
   (`server/main.py:332`) to build the 201 body's `url` field; the scaffold's
   `compose.yml` deliberately leaves `KB_PUBLIC_BASE_URL` unset (Findings §2 — setting a
   subpath would break the local viewer). A scaffold on **advanced custom ports** gets a
   default-port `url` in one informational response field only — the document write, the
   site build, and the viewer are all correct, and the default-port journey (setup only
   asks ports on "advanced") is fully correct. The config's `site.base_url` does carry
   the chosen viewer port. Recorded as a known limitation in api/decisions with a
   future-improvement note (derive `KB_PUBLIC_BASE_URL` from `KB_VIEWER_PORT` if custom
   ports become common). Not a `0.1.0` release blocker → no fix slice proposed.
3. **Payload benign matches (my own scan)** — `plugin/templates/params.operator.json`
   ships **public** site metadata only (site name, the public Pages URL, copyright, TZ,
   ports — no secret, no local path); it feeds the parity guard. Provenance/example
   comments naming the operator's other projects (`changple5`, `hi2vi_web`) live in
   byte-identical shipped source (`server/config.py`, `embeddings.py`, `search.py`
   docstrings; the explain skill's example project name) — an accepted consequence of the
   byte-identical-snapshot design; scrubbing them would break parity and leaks nothing
   sensitive. Neither rises to a constraint violation.

## 4. Doc consolidation (PASS-only) — 8 versions

For each doc named in `phase.md` `## Doc impact`, ran `doc-new-version --source
P7.REVIEW`, edited only the returned `edit_path`, then `rebuild-docs`. `docs/index.json`
picked all 8 up as latest.

| Doc | New version (latest) | Captures |
|---|---|---|
| architecture | `v0006` | plugin/marketplace layout, payload isolation, template-sync snapshot + shared renderer + root-only parity guard, portable deploy gate; roadmap P7 → delivered |
| api | `v0004` | shipped explain config resolution + bearer + local-only fallback; `landing_created` field + auto-landing side effect; custom-port `url` caveat |
| backend | `v0004` | F1 auto-landing (`project_landing_content` / `ensure_project_landing`, 3-path commit, never-overwrite, delete-path reasoning) |
| operations | `v0008` | install/setup flow, portable `site_smoke` (dynamic discovery), `plugin-ci.yml` parity gate, release/version-bump discipline, uv pin |
| security | `v0003` | SaaS-open config model (600), secrets-never-scaffolded, local-only-fallback, payload isolation; 3 new checklist rows |
| qa | `v0005` | plugin manifests + parity + crux commands; parity negatives, the F1 reproducer pattern, the per-project deploy-gate invariant; 2 fragile-area rows |
| decisions | `v0008` | 6 ADRs: plugin-in-repo + `source ./plugin`, MIT, dynamic discovery, uv `0.8.14`, auto-landing, no-`KB_PUBLIC_BASE_URL`-default |
| product | `v0003` | the feature now ships as an installable Claude Code plugin for any user; SaaS-open direction |

## 5. Deviations from plan.md

- **Caught and fixed a `/Users/` leak I introduced in the qa doc.** My first draft of
  the qa version wrote the literal string "`/Users/`" twice in prose. `site_smoke.py`
  (lines 249-254) scans **built HTML for the bare literal `/Users/`**, and
  `docs/current/*.md` **is published** — so that prose would have tripped the operator's
  own deploy gate on the next push. Reworded to "home-path" phrasing (matching how the
  existing docs deliberately avoid the literal), rebuilt, and **re-ran the operator-repo
  gate → PASS**. No other doc contained the literal.
- Otherwise executed the plan as written.

## 6. Notes for the operator (post-phase)

- **Owed QA:** the interactive `/plugin marketplace add leetusik/knowledge` →
  `/plugin install` flow in a real Claude Code session (the sandbox proved the
  non-interactive path; this env blocks a nested `claude`).
- **Not blocking, tracked in docs:** custom-port 201 `url` field cosmetic mismatch.
- On a passing review the bootstrap repo's P7 (retire embedded `/explain`) is now
  unblocked — that is the operator's separate action in the other repo, never edited
  from here.
