# Result — P5.REVIEW (phase review & durable-doc consolidation)

Executor: `slice-executor-high`. Completed 2026-07-12. **Verdict: pass.**

Reviewed all five P5 middle slices together (S1 interim design system → S5
operator-designed replacement → S2 landing/UX → S3 CJK search → S4 CI smoke
guard) against the phase objective and `intent.md`, validated the whole phase
behaviorally, and — on the passing review — consolidated the accumulated "Doc
impact" notes into six new durable-doc versions. No source files were edited (the
only content I authored is the six doc versions + this `result.md` + a phase.md
closing note). The one defect that surfaced during consolidation was in my own
draft doc prose, not in the phase's work, and was fixed in the doc versions before
the final gate.

## Validation matrix

| Check | Command | Result |
|---|---|---|
| State integrity | `python3 scripts/workflow.py validate` | **passed** — re-run after doc consolidation, still passes |
| Site build (CI parity) | `docker compose run --rm kb build` | **exit 0**, `Documentation built in ~0.5s`; only the stock MkDocs-2.0 banner — the `README.md`/`index.md` conflict warning is **gone** (S4 hygiene held) |
| Site smoke guard | `python3 scripts/site_smoke.py` | **PASS** — all source + built-site invariants hold |
| Marker round-trip | `server.documents` pure fns on live `docs/index.md` | **all pass** — `insert_recent_bullet` → mechanism `"marker"`, bullet lands after the marker; `remove_recent_bullet` restores byte-for-byte; all 6 Recent `rel_path`s appear exactly once (no dedup collision); the `rel_path in text` dedup guard detects present paths |
| Design-system spot-checks (S1/S5) | see below | **all confirmed** |

### S1/S5 design-system spot-checks

- **`extra.css` §1–§9 structure present:** all nine section headers found
  (§1 Color · §2 Type · §3 Shape/motion · §4 Chrome · §5 Content · §6 Cards/grid ·
  §7 Tags · §8 Search · §9 Page treatments), 569 lines, single fonts `@import` at
  the top.
- **§1 LOCKED Target-1 tokens untouched since S5:** `git diff 30fb703 (P5.S5) HEAD
  -- docs/stylesheets/extra.css` touches only lines 426+ (§9) across all three
  hunks — S2 and S3 added purely additive §9 blocks; §1–§8 are byte-identical to
  the S5 integration. §1 values match the locked palette 1a Teal verbatim (paper
  `#f6f2e8`, surface `#fffefa`, accent `#0f6f66`/`#62bdb2`, `--md-hue: 34`).
- **`mkdocs.yml` matches the design-system contract:** `theme.font: false`; both
  custom palette schemes (`primary/accent: custom`, `default`+`slate`);
  `logo`/`favicon` wired; `extra_css: [stylesheets/extra.css]`; `plugins.search`
  object form `lang: [en, ko]`; `exclude_docs` = `/versions/` + `/README.md`; no
  `nav:`/`strict:`; pin `9.7.6` parity holds in `.github/workflows/pages.yml` and
  `compose.yml`.
- **Built-site invariants** (fresh build): `search_index.json` `config.lang ==
  ['en','ko']`, `separator == '[\\s\\-]+'` (default); `lunr.ko.min.js` +
  `lunr.multi.min.js` shipped; `site/index.html` has one `id="__search"`, four
  `for="__search"` labels, `kb-hero`; marker present; `site/versions/` absent; no
  home-path leak in built HTML.

## Intent conformance (against `intent.md` + objective + each slice's plan vs. result)

- **Operator-designed visual system integrated as delivered — PASS.** The intent
  amendment (2026-07-11: operator designs in Claude Design, agent integrates) is
  honored. S1 shipped the interim baseline; S5 integrated the operator's full
  "Knowledge Base Design System" (all 10 targets) via DesignSync, replacing S1 with
  the LOCKED palette 1a Teal (§1 verbatim). Visual language is now operator-owned,
  not agent taste.
- **Hosting still GitHub Pages, deploys manual-push-only — PASS.** `pages.yml`
  trigger/deploy jobs unchanged; the only edit is one smoke-guard step between
  `mkdocs build` and `upload-pages-artifact`. No hosting change.
- **CJK search browser-only, no `server/` dependency — PASS.** S3 used the Material
  search plugin `lang: [en, ko]` (zero custom JS); `git diff` shows **no `server/`
  changes** across the phase. `architecture.md` v0004 records the browser-only
  boundary vs. the local FastAPI hybrid (same corpus, two implementations).
- **No scope creep — PASS.** Full-phase source diff (since before S1) is confined
  to design CSS/assets, `docs/index.md`/`tags.md`/per-project index pages,
  `mkdocs.yml` (theme config), `scripts/site_smoke.py`, and one line in
  `pages.yml`. No `server/`/skill/API changes, no P6 graph/backlink work, no
  external/third-party theme. Each slice's "Out of scope" section confirms this.
- **D2 absorbed via S1 — PASS.** D2 (design polish) status is `promoted` →
  `P5.S1`; the P3 "design polish deferred (D2)" consequence is resolved (recorded
  in `decisions.md` v0005).

### Deviations reviewed — all acceptable

- **S2 added `navigation.footer`** (prev/next reading links) beyond the plan's
  explicit "optional footer" item. The plan's per-slice rationale listed it as a
  "consider"; it is cheap, reversible, pure config, and complements the hero's
  "read like a book" framing. Acceptable — flagged for the operator's visual
  eyeball (no correctness risk).
- **S4's `site_smoke.py` came in at 187 lines** vs. the plan's "~150" guidance. The
  line count was guidance, not a constraint; the invariants themselves are the
  plan's own enumeration (4 source + ~9 built-site). Kept lean (stdlib-only, no
  framework). Acceptable.
- **S5 fonts wiring** (`theme.font: false` + single `@import`) deviates from S1's
  `theme.font.text/code` split — a deliberate, well-reasoned choice to load the
  exact 500/600 weights the delivered design uses (Material's request omits them).
  Recorded as an ADR (`decisions.md` v0005). Acceptable and faithful to the intent.
- **Known limitation (not a defect):** the `bootstrap_agentic_workspace.sh` nav tab
  reads awkwardly because auto-nav derives tab labels from folder names; unfixable
  without a URL-breaking rename or a forbidden `nav:` override. Correctly recorded
  in `experience.md` and left for the operator to accept.

## Doc versions created (6)

Consolidated from the phase's "Actual notes" — full coherent docs, not changelog
appends. Procedure per doc: `doc-new-version` → edit the returned `edit_path` →
`rebuild-docs` → `validate` → final build + `site_smoke.py`.

| Doc | New version | From |
|---|---|---|
| frontend | `v0002_p5_mkdocs_material_design_system_…_zero-js_hero` | v0001 (bootstrap placeholder) |
| experience | `v0002_p5_calm-editorial_operator-designed_visual_language_…_hero_affordance` | v0001 (placeholder) |
| decisions | `v0005_p5_palette_1a_teal_claude-design_provenance_…_smoke_guard_over_--strict` | v0004 |
| operations | `v0005_p5_site_design_build_asset_set_…_local_build_eyeball_workflow` | v0004 |
| architecture | `v0004_p5_browser-only_static-search_boundary_vs_local_fastapi_hybrid_…` | v0003 |
| qa | `v0002_p5_site-build_acceptance_site_smoke.py_…_negative-test_pattern_for_the_guard` | v0001 (placeholder) |

- **frontend v0002:** first real frontend truth — theme config, the `extra.css`
  §1–§9 token/hook architecture, fonts via a single `@import` (`theme.font:
  false`), nav features, landing markup wiring + the `#recent + ul` alias, the
  search plugin `lang: [en, ko]`, and the zero-JS hero label.
- **experience v0002:** first real experience truth — the operator-designed "calm
  editorial library" visual language, landing/browse journeys, per-project pages,
  the tab-label-from-folder-name finding, and the CJK search UX + hero affordance +
  known limits.
- **decisions v0005:** five new P5 ADRs (design ownership/provenance; palette 1a
  Teal LOCKED; fonts via `@import`; landing/nav choices incl. omitted counts; CJK
  plugin-`lang` approach ladder; smoke guard over `--strict` + explicit README
  exclusion). Superseded-decisions section records D2 resolved and the S1 interim
  system superseded by the S5 delivery.
- **operations v0005:** the site design build-asset set, the single Google-Fonts
  `@import`, the deploy-gating `site_smoke.py` step + local build/eyeball workflow
  (subpath `http://localhost:8765/knowledge/`), and the explicit `README.md`
  exclusion.
- **architecture v0004:** the browser-only static-search boundary vs. the local
  FastAPI hybrid — same corpus, two independent implementations by deployment
  target; roadmap refreshed (Track 1 live/redesigned, P6 graph, P7 plugin).
- **qa v0002:** site-build acceptance = `site_smoke.py` after a compose build; the
  full asserted invariant list; the negative-test pattern (doctor a scratchpad
  copy, run with `--root`) for verifying the guard itself; known fragile areas.

## One issue found & fixed (in my own doc drafts, not the phase work)

The first post-consolidation `site_smoke.py` run **FAILed** with a home-path leak
in `current/qa/index.html` and `current/operations/index.html`: my draft prose
described the guard's "no local-path leak" invariant using the literal sentinel
string, which then published into the built HTML and tripped the very check it
described. This is publish-hygiene working as intended (a P4 security invariant),
not a guard defect. Fixed by rephrasing both doc versions to describe the invariant
without reproducing the literal sentinel, then `rebuild-docs` → final build →
`site_smoke.py` **PASS** → `validate` passed. No source file was touched.

## Files changed

- `docs/versions/frontend/v0002_…_zero-js_hero.md` (new, consolidated)
- `docs/versions/experience/v0002_…_hero_affordance.md` (new, consolidated)
- `docs/versions/decisions/v0005_…_smoke_guard_over_--strict.md` (new, consolidated)
- `docs/versions/operations/v0005_…_local_build_eyeball_workflow.md` (new, consolidated)
- `docs/versions/architecture/v0004_…_two_implementations_by_deployment_target.md` (new, consolidated)
- `docs/versions/qa/v0002_…_negative-test_pattern_for_the_guard.md` (new, consolidated)
- `docs/current/{frontend,experience,decisions,operations,architecture,qa}.md` (regenerated by `rebuild-docs`)
- `docs/index.json` (updated by `rebuild-docs`)
- `works/phases/active/P5/phase.md` (closing consolidation note)
- `works/phases/active/P5/slices/P5.REVIEW/result.md` (this file)

## Verdict

**pass.** All five middle slices meet the phase objective and `intent.md` with no
scope creep; the whole phase validates (build exit 0, smoke PASS, marker
round-trip clean, state integrity clean); the slice deviations are acceptable.
Six durable-doc versions consolidate the phase's truth. No source-level defects →
no fix slices proposed. Archiving is a separate manual step (the phase stays in
`active/` after a passing review). Final *visual* acceptance remains the
operator's, done on the dev server at `http://localhost:8765/knowledge/` before any
manual-push deploy.
