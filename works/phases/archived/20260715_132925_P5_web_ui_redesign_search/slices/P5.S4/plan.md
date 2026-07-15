# P5.S4 — Site-build CI smoke guard & hygiene (plan)

Operator-approved plan (2026-07-12). Executor: **slice-executor-mid** (risk `medium` — it edits the deploy-critical `pages.yml`, minimally).

## Context

P5 introduced the site's first client-side assets and load-bearing contracts — the design-system CSS, raw-HTML landing markup around the byte-exact `<!-- explain:recent -->` marker, the `#recent + ul` styling adjacency, the CJK search config (`lang: [en, ko]`), and the zero-JS hero `for="__search"` label. None are protected: most regressions (e.g. reverting `plugins.search` to bare `- search`) build **cleanly** and deploy silently broken. There are no automated site-build tests at all. This slice adds a lean CI-parity smoke guard plus one hygiene fix — deliberately small. Read `works/phases/active/P5/phase.md` first, especially the two "Cross-slice notes — for S4" sections (from S2 and S3): they are the invariant lists this guard encodes, and S2's/S3's `result.md`s contain ready-made assertion snippets (e.g. S2's `#recent + ul` adjacency regex).

## Work items

1. **`scripts/site_smoke.py`** — single stdlib-only script (no deps, no test framework, ~150 lines), beside `scripts/workflow.py`. Takes an optional `--root` (default: repo root) so a negative test can run against a doctored copy. Two assert groups, collected then reported together; exit non-zero with the failure list, else a PASS summary:
   - **Source invariants:** `docs/index.md` has the exact marker line and ≥1 bullet directly under it matching `^- \d{4}-\d{2}-\d{2} · \[[^\]]+\]\([^)]+\) — .+$` (the `format_recent_bullet` shape in `server/documents.py:215`); `docs/tags.md` has `<!-- material/tags -->`; `mkdocs.yml` has no top-level `nav:`/`strict:`, has `font: false`, search plugin `lang` contains `en` and `ko`, no `extra_javascript:`; **pin parity** — the version in `.github/workflows/pages.yml` (`mkdocs-material==X`) equals the tag in `compose.yml` (`squidfunk/mkdocs-material:X`) (parse both; guards future bumps).
   - **Built-site invariants** (clear error "run mkdocs build first" if `site/` missing): `site/search/search_index.json` config `lang` includes `ko`; `site/assets/javascripts/lunr/min/lunr.ko.min.js` and `lunr.multi.min.js` shipped; `site/index.html` contains `kb-hero`, `kb-grid`, exactly one `id="__search"` and ≥1 `for="__search"`, the rendered `<ul>` element-adjacent to `<div … id="recent">` (comments allowed between — reuse S2's regex from its result.md), and the marker comment + bullets; the three per-project `site/<project>/index.html` pages built (`changple5`, `hi2vi_web`, `bootstrap_agentic_workspace.sh`); `site/versions/` absent; no `/Users/` leak and no `<script src="http…` CDN script in any built HTML.
2. **CI wiring** (`.github/workflows/pages.yml` — minimal, deploy-critical): one added step between `mkdocs build` and `upload-pages-artifact`: `- run: python3 scripts/site_smoke.py` — a failed invariant stops the deploy. Touch nothing else (never `--strict`, keep concurrency/pins/comments as-is).
3. **Hygiene:** add `/README.md` to `exclude_docs` in `mkdocs.yml`. mkdocs already auto-excludes it (it collides with `index.md` — the pre-existing build warning S2/S3 saw); this makes the exclusion explicit, silences the warning, and changes nothing published. Keeps the "exclude_docs is the only exclusion mechanism" rule.
4. **Notes & docs:** Doc-impact one-liners to `phase.md` — `operations.md` (CI smoke guard: what it asserts, how to run locally after a compose build), `qa.md` (site-build acceptance = the smoke script), `decisions.md` (why a guard instead of `--strict` — warnings must never block /explain's zero-config page adds; why README exclusion is now explicit). Forward note: `P5.REVIEW` can run `python3 scripts/site_smoke.py` as part of validating all slices.

## Validation (lean)

- `docker compose run --rm kb build` → exit 0 **and** the README/index.md warning is gone (hygiene fix confirmed); then `python3 scripts/site_smoke.py` → PASS.
- **Negative test** (proves the guard actually guards): copy `mkdocs.yml` + `docs/index.md` + `site/` skeleton into the scratchpad, mutate one invariant per group (e.g. drop `ko` from the copied search_index config; break a bullet line), run with `--root` → non-zero exit naming those failures. Nothing in the repo is mutated.
- `git diff` shows `docs/` content untouched (S4 edits only `mkdocs.yml`, `pages.yml`, adds the script) — marker/bullets trivially intact.
- `python3 scripts/workflow.py validate`.

## Out of scope

Any new test suite/framework; `--strict`; touching `server/`, skills, docs content, or the design CSS; asserting on build *warnings* generally (only the README one is fixed, not asserted — future /explain pages must never be blocked by warning-level noise).

## Executor contract

Do the work above, write `result.md` (free-form, from scratch) beside this file, append the Doc-impact one-liners and the forward note to `works/phases/active/P5/phase.md`. Never commit; never run `start-slice`/`finish-slice`/`set-slice-status`/`doc-new-version`. Return a structured verdict (`done` / `needs_operator` / `blocked` / `escalate` with findings).
