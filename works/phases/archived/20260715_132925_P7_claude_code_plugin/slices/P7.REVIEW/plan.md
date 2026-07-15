# Plan — P7.REVIEW: phase review

Orchestrator plan (auto run). Executor: slice-executor-high, kind `review`. Review the WHOLE phase; never edit source code here (code problems = `changes_requested` with proposed fix slices). Consolidate docs ONLY on a pass. The orchestrator records your verdict with `review-phase` — you run no state transitions and no commits.

## Inputs

Read: `phase.md` (whole — Decomposition, all "landed" Findings blocks, Constraints, the full `## Doc impact` list), `intent.md`, every completed slice's `slice.json` + `plan.md` + `result.md` (DECOMP, S1–S6, F1 — note S1 and S6 carry escalation history in their plan.md), `docs/index.json`, the relevant `docs/current/*.md`, and the shipped surfaces themselves (`.claude-plugin/marketplace.json`, `plugin/`, `LICENSE`, root `README.md`).

## 1. Validate all slices together

Re-run the consolidated validation set (from the slices' plans/results):

- `uv run pytest -q` (expect 57 passed)
- `python3 scripts/plugin_parity.py`
- `claude plugin validate .` and `claude plugin validate ./plugin`, each also with `--strict`
- Operator-repo deploy gate: `docker run --rm -v "$PWD":/docs squidfunk/mkdocs-material:9.7.6 build` then `python3 scripts/site_smoke.py`
- Crux acceptance spot-check (fresh render, not reusing S6's temp): `python3 plugin/setup/render.py --dest <tmp> --set <non-operator test params per S3's findings>` → `docker run --rm -v <tmp>:/docs squidfunk/mkdocs-material:9.7.6 build` → `python3 <tmp>/scripts/site_smoke.py --root <tmp>` → PASS; then remove `<tmp>`
- `python3 scripts/workflow.py validate`

Any failure here = `changes_requested` (or `blocked` if environmental), with numbered issues.

## 2. Judge against the objective and intent

From `phase.md` Objective + `intent.md` Confirmed Intent:

- Real Claude Code plugin hosted in THIS repo: `.claude-plugin/marketplace.json` + `plugin/.claude-plugin/plugin.json`, installable via `/plugin marketplace add leetusik/knowledge` → `/plugin install knowledge@knowledge` (S6 proved the non-interactive equivalent in a sandbox).
- Ships the explain skill (`/knowledge:explain`) and the setup flow (`/knowledge:setup`) that scaffolds server + MkDocs + Pages.
- Payload isolation: nothing personal ships (verify the manifest's `source: "./plugin"` and that `plugin/` holds no operator content, tokens, or workspace machinery).
- SaaS-open: config model (env → `~/.config/knowledge-kb/config.json` → legacy → stop; hosted = base_url + token), local-only fallback rule, server bearer auth — nothing precludes a hosted version; nothing hosted was built.
- Bootstrap repo untouched (this phase changed only this repo); the operator's own machines keep working (legacy convention tier).
- MIT LICENSE landed at root + `license` in plugin.json (operator decision 2026-07-14).
- Constraints in `phase.md` all honored (release discipline documented in S6's checklist; version stays 0.1.0 pre-release; never pushed).

Cross-check `docs/current/*.md` for statements the phase made stale (architecture roadmap line about P7, operations, security) — that's what the doc consolidation fixes; contradictions you can't fix in docs = findings.

## 3. Weigh the known open items (deliberately deferred to you)

1. **uv pin 0.8.14 vs 0.11.28** (S1 + its escalation; host has both). The pin is proven and reproducible; bumping is a one-line deliberate change. Decide: keep (recommend noting in decisions doc) or propose a fix slice. Not a pass-blocker by itself.
2. **201 response `url` under non-default ports** (S6 caveat): `public_base_url()` defaults to `localhost:8765`; an advanced custom-port scaffold gets a wrong-port `url` in the response body unless `KB_PUBLIC_BASE_URL` is set. The setup skill collects ports — check whether the scaffolded `compose.yml`/config story covers this (does S5's scaffold set `KB_PUBLIC_BASE_URL` for custom ports, or document it?). Judge severity: cosmetic (report URL only) vs journey-breaking. If it warrants code, that's a proposed fix slice, not an edit here.
3. Anything else your read of results/`phase.md` surfaces.

## 4. On a PASS only — consolidate the docs

For each doc named in `phase.md`'s `## Doc impact` list (expected: architecture, api, backend, operations, security, qa, decisions, product — confirm against the list itself), run:

`python3 scripts/workflow.py doc-new-version --doc <doc> --summary "<P7: …>" --source P7.REVIEW`

then edit ONLY the returned `edit_path`, capturing the phase's changes for that doc (fold in every relevant Doc impact line; keep each doc's existing structure and voice; never patch `docs/current/*.md` or old versions directly). Include: the plugin/marketplace packaging layout + template-sync/parity model (architecture), the shipped skill's config resolution + landing_created + POST side effect (api), the auto-landing write path (backend), install/setup/release-checklist + parity CI + portable gate (operations), the SaaS-open config + secrets/fallback rules (security), the E2E/reproducer patterns + gate invariant (qa), the phase's ADRs — MIT, plugin-in-repo + source "./plugin", dynamic PROJECTS discovery, uv pin, auto-landing decision, no-KB_PUBLIC_BASE_URL (decisions), and the product-level fact that the feature is installable by any Claude Code user (product). Then `python3 scripts/workflow.py rebuild-docs` and confirm `docs/index.json` picked all versions up.

## 5. Wrap up

- Write `result.md` from scratch: validation table, findings, the verdict rationale, doc versions created (or the numbered issues + proposed fix slices on `changes_requested`).
- Return the structured verdict with `review_verdict` (`pass` | `changes_requested` | `blocked`) and `doc_versions`.
