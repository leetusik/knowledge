# P38-e1.S7 result

- status: done
- route: mid
- model: opus
- effort: medium
- summary: The explain confirmation now carries a plain `Cost:` line after the Sections list, priced from a new cost table in §1 step 7 (measured on 0.8.0, projected for 0.9.0), and offers the delta (decline word `from scratch`, from-scratch price beside it) or `quick` without choosing. A loose document's translation is now a new document `<source slug>-<xx>`, one write span with no research or critic, never `--new-version` onto its source.
- files_changed: plugin/skills/explain/SKILL.md; .agents/skills/explain/SKILL.md; web/public/SKILL.md; works/phases/active/P38-e1/phase.md (via phase-section); works/phases/active/P38-e1/slices/P38-e1.S7/result.md
- validation: skills_parity PASS; plugin_parity PASS; heading diff vs 14e1cbda empty (markers equal); citation check `checked=200 missing=2` (baseline); `uv run pytest tests/test_explain_resolver.py -q` 2 passed; cost table = cost-evidence §6; `--new-version` grep clean; `git status --porcelain .claude/` empty; `workflow.py validate` passed
- deviations: the old `- cost:` bullet's permissions clause kept as its own `- permissions:` bullet (one of the two options the plan allowed); the "a book's cost line / worktree: no" sentence now says `worktree: no` on the stops line (it was attached to the cost line, which no longer is a bullet). Part B untouched, so agents not regenerated.
- doc_impact: `product.md` (metered Cost line, delta or `quick` offered, loose translation as its own document); `qa.md` `## Regression Checklist` (headless front-door line expects the `Cost:` line) — both appended to `## Doc impact`.

## What changed in `plugin/skills/explain/SKILL.md`

- §1 step 6: `run` notes a translation keeps `full`; `lang` gains the translation form `ko (translated from en v2)`.
- §1 step 7 layout: `Cost: <the agents> · ≈ $<a>–<b> at list price (the cost table, below) · cheaper: <delta | quick> ≈ $<c>` right after `Quiz and Sources close it…`; `- cost: …` bullet → `- permissions: manual permission mode needs the preflight's rules (§3.2)`.
- §1 step 7 prose: a **The `Cost:` line** paragraph (agents + $ at list price citing the table; one clause "On a subscription, read the dollars as usage, not as a bill"; offers, never chooses) with cases: v2 with dossier (run line `full — as a delta of v<N> (researches only what changed since <date>)`, `say "from scratch" for a full rerun ≈ $<v1 price>`), no dossier (`delta: none (no dossier)`, v1 price), narrow subject (`cheaper: say "quick"`, the run card's never-choose rule restated as binding), book, translation (`run: full`, source-naming `lang:`, no Sections block, one write span). S5's v2 prose folded into it.
- §1 step 7: **The cost table**, labelled "measured on plugin 0.8.0 runs, projected for 0.9.0".
- §3.1 *Translation*: chapter vs loose document; loose → new document, slug `<source slug>-<xx>`, title in that language, `--slug … --lang <xx> --translated-from <src lang>@<version>`, curl sets `"slug"`, never `--new-version --rel-path`, `translation-source-missing` warning harmless; "one write span: no research and no critic … then §4.8–§4.9 and §5 (§4.10)".
- §4.10 first line: "`quick` and a translation go straight to §5; …".
- §5: a CLI bullet for the loose translation (`--slug`, no `--new-version`/`--rel-path`); curl form: the "leave slug unset" sentence notes the exception, and a sentence after the drop-fields rule sets `"slug"` and forbids `new_version`/`rel_path`.

Copies: `.agents/skills/explain/SKILL.md` = canonical minus the two frontmatter lines (grep -v; exactly 2 such lines); `web/public/SKILL.md` = `cp`.

## Validation detail

- `python3 scripts/skills_parity.py` → `PASS — explain skill copies are in body parity (web copy byte-identical); the 5 plugin agents match Part B.`
- `python3 scripts/plugin_parity.py` → `PASS — plugin templates are in parity with the repo.`
- Heading diff: `git show 14e1cbda:plugin/skills/explain/SKILL.md` saved to the scratchpad; `diff` of `^#` lines empty; `<!--`/BEGIN/END marker lines identical.
- Citation check (P33-n3 `topics/citations.md` L66–84, run from the repo root) → `citations checked=200 missing=2` (the two pre-existing `B5 *Your dispatch*` misses).
- `uv run pytest tests/test_explain_resolver.py -q` → `2 passed`.
- Cost table vs `topics/cost-evidence.md` §6 — cost-evidence: v1 document, codebase **≈ $35–45**; v2 delta **≈ $25–38**; translation **≈ $3** of write span; `quick` not metered; book not metered. SKILL table: v1 document (measured on a codebase subject) $35–45; v2 delta $25–38; translation $3; `quick` not metered yet; book not metered yet. Equal. Agent counts copied from the same rows (4 researchers 2+2, ~14 batches, ≤ 1 gap; 1–2 code + 0–1 web, ~5 batches plus the recheck, 0–1 gap).
- `grep -n -- '--new-version' plugin/skills/explain/SKILL.md`:
  - 740: `` `translated_from`). **Never** `--new-version --rel-path` onto the source: the ``
  - 1811: `[--new-version --rel-path <PRIOR_REL_PATH>] \` (the CLI synopsis)
  - 1819: `` - `--new-version --rel-path` is for a **loose** document's re-explain (`PRIOR` from step 3). ``
  - 1823: `` `--translated-from <src lang>@<version>`, and no `--new-version` or `--rel-path`. ``
  No line tells a loose translation to use it.
- `git status --porcelain .claude/` → empty.
- `python3 scripts/workflow.py validate` → passed (pre-existing stale-docs / oversized-section warnings only).

## Notebook

- `## Doc impact`: two lines appended (product.md, qa.md Regression Checklist).
- `## Decisions`: one gist line (cost line replaces the bullet; translation rules).
- `## Notes for later slices`: removed the consumed `(from DECOMP, for S1–S7)`, `(from S2, for S7)`, `(from S3, for S5 and S7)`, `(from S5, for S7)`; added `(from S7, for S8 and S9)` on where the cost table lives and the copy sync.
- `## Now`: rewritten, 2,156 B → 1,288 B.
