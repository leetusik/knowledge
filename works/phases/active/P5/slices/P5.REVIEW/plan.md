# P5.REVIEW — Phase review & durable-doc consolidation (plan)

Operator-approved plan (2026-07-12). Executor: **slice-executor-high**.

## Context

All four P5 middle slices are `done` (S1 design system → S5 operator-designed replacement → S2 landing/UX → S3 CJK search → S4 CI smoke guard). This review slice validates the whole phase against the objective/`intent.md`, and — only on a passing review — consolidates the accumulated "Doc impact" notes in `phase.md` into new durable-doc versions (this is the only slice allowed to run `doc-new-version`). Read `works/phases/active/P5/phase.md` in full (objective, constraints, all Doc-impact "Actual notes", cross-slice notes) and `works/phases/active/P5/intent.md`, plus each slice's `plan.md`/`result.md`.

## Review scope

1. **State integrity:** `python3 scripts/workflow.py validate`.
2. **Behavioral validation, all slices at once:**
   - `docker compose run --rm kb build` → exit 0, no README/index.md warning (S4 hygiene held).
   - `python3 scripts/site_smoke.py` → PASS (S4's guard encodes S2/S3/S4's invariants: marker/bullet contract, tags marker, no `nav:`/`strict:`, `font: false`, search `lang` en+ko, pin parity, lunr.ko/multi shipped, hero `__search` label, `#recent + ul` adjacency, per-project pages, `versions/` excluded, no `/Users/`/CDN leaks).
   - Marker round-trip via `server.documents` pure functions (S2's ready-made check — insert/remove/dedup on the live `docs/index.md`).
   - S1/S5 design-system spot-check: `extra.css` §1–§9 structure present, §1 LOCKED Target-1 tokens untouched since S5 integration (`git log`/diff vs. the S5 commit), `mkdocs.yml` theme block matches the phase's design-system contract (`theme.font: false`, custom palettes, logo/favicon, extra_css).
3. **Review against intent** (`intent.md` + objective + each slice's `plan.md` vs. `result.md`): operator-designed visual system integrated as delivered; hosting still GitHub Pages, deploys manual-push-only; CJK search browser-only (no `server/` dependency); no scope creep (no `server/`/skill/API changes, no P6 graph work, no external theme); D2 absorbed via S1. Confirm each slice's deviations (S2's `navigation.footer`, S4's 187-line script) are acceptable.
4. **On pass ONLY — consolidate durable docs** (6 docs, from `phase.md` "Actual notes"; write full coherent docs, not changelog appends; source files untouched — docs only):

   | Doc | From | Consolidates |
   |---|---|---|
   | `frontend` | v0001 (bootstrap placeholder) | S1+S5+S2+S3: theme config, `extra.css` §1–§9 token/hook architecture, fonts via single `@import` (`theme.font: false`), nav features, landing markup wiring + `#recent + ul` alias, search plugin `lang: [en, ko]`, zero-JS hero label |
   | `experience` | v0001 (placeholder) | S1+S5+S2+S3: "calm editorial library" operator-designed visual language, landing/browse journeys, per-project pages, tab-label-from-folder-name finding, CJK search UX + hero affordance + known limits |
   | `decisions` | v0004 | S1/S5/S2/S3/S4 ADRs: palette 1a + Claude-Design provenance, fonts wiring, nav choices + counts omitted, CJK approach ladder (chosen: plugin `lang`), smoke guard instead of `--strict`, explicit README exclusion |
   | `operations` | v0004 | build asset set, single Google-Fonts `@import`, smoke guard + deploy gating + how to run locally, dev-server eyeball note |
   | `architecture` | v0003 | browser-only static-search boundary vs. the local FastAPI hybrid (same corpus, two implementations by deployment target) |
   | `qa` | v0001 (placeholder) | site-build acceptance = `site_smoke.py` after a compose build; negative-test pattern for the guard itself |

   Procedure per doc (P4.REVIEW's proven path): `python3 scripts/workflow.py doc-new-version --doc <id> --summary "<summary>" --source P5.REVIEW` → edit the printed `edit_path` file with the consolidated content → after all six: `python3 scripts/workflow.py rebuild-docs` → `validate` → re-run `python3 scripts/site_smoke.py` + a final build (doc pages publish under `docs/current/`; confirm no `/Users/` leak).
5. **Verdict:** return `review_verdict: pass` | `changes_requested` (with concretely proposed fix slices) | `blocked`. If any source-level defect is found, do NOT fix it in this slice — propose `P5.Fn` fix slices and return `changes_requested` (docs are then consolidated by the re-review after fixes).

## Not in this slice

No archiving (manual, later). No source-file edits. No `nav:`/`strict:`. Visual acceptance stays with the operator: deploys are manual-push-only and the dev server is up at `http://localhost:8765/knowledge/` for eyeballing before any push.

## Executor contract

Do the review above, write `result.md` (free-form, from scratch) beside this file — validation matrix, intent-conformance findings, the doc versions created (or the proposed fix slices on `changes_requested`). You may run `doc-new-version`/`rebuild-docs` (review slice only). Never commit; never transition slice/phase status (the orchestrator records your verdict via `review-phase`). Return a structured verdict with `review_verdict: pass | changes_requested | blocked` and a reviewer note.
