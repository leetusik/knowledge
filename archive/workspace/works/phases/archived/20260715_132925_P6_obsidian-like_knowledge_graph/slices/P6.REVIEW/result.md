# P6.REVIEW — re-review result (after P6.F1–F4)

**Verdict: PASS.** The whole phase was re-validated WITH the four fix slices (F1–F4)
in place, against the operator-directed P6.S1 revision spec. Every check is green; the
one known pre-existing `/Users/` prose leak was fixed doc-side (the guard kept strict);
six durable-doc versions were consolidated; and the final post-consolidation
`mkdocs build` + `site_smoke.py` is fully green (0 violations). No new defect surfaced,
so this is a clean pass — no fix slices proposed.

This result supersedes the stale first-pass draft that previously occupied this file.

## 1. Re-validation battery (all green)

All builds ran in a fresh pinned venv (`mkdocs-material==9.7.6`, confirmed) unless
noted. The compose `kb` server was already running (`http://localhost:8765/knowledge/`
→ 200) and was never started/stopped by this review.

| # | Check | Command / method | Outcome |
|---|---|---|---|
| 1 | Build + artifacts | `mkdocs build` (venv) | exit 0; `site/graph.json`, `site/graph/index.html`, `site/javascripts/graph.js` all present |
| 2 | Determinism | build ×2 into separate dirs, `cmp graph.json` | **byte-identical** |
| 3 | JS syntax | `node --check docs/javascripts/graph.js` | **OK** |
| 4 | Smoke (pre-consolidation) | `python3 scripts/site_smoke.py` | exactly **1** violation — the KNOWN `/Users/` prose leak in `current/{data,frontend,operations,qa}`; every graph/renderer/guard/landing assertion PASSED |
| 5 | `--root` negative (post-consolidation) | doctored copy, `extra_javascript:` dropped, over the leak-free consolidated build | FAIL with **exactly** the allowlist violation (`extra_javascript: missing`). Guard keeps its teeth. (Pre-consolidation the same doctored copy also showed the known leak → 2 violations, expected.) |
| 6 | Serve parity | curl the running `kb` server | `/` 200; `/graph/` 200 (`.kb-graph` mount + `data-graph-src="../graph.json"`); `/javascripts/graph.js` 200 (carries `kb-graph-drift` ×4 + `kb-graph:v1` ×1); `/graph.json` version 1, **6 doc + 26 tag** nodes, 30 edges, **no `/Users/`** |
| 7 | Spec-fidelity F1–F4 | grep/read `graph.js` + `extra.css` §10 vs mirror + slice specs | all match (detail below) |
| 8 | CDP behavior probe | own headless Chrome (port 9224), launched + torn down | F2/F3/F4 all confirmed (detail below) |
| 9 | Cross-cutting invariants | `git diff 43f4b79..HEAD`, greps | all hold (detail below) |
| 10 | Workflow state | `python3 scripts/workflow.py validate` | **PASS** |
| 11 | FINAL smoke (post-consolidation) | `mkdocs build` (venv) → `site_smoke.py` | **PASS — 0 violations** |

### Spec-fidelity spot-checks (step 1.7)

- **F1** — §10a carries the 4 new tokens verbatim (`--kb-graph-drift: 3px`,
  `--kb-graph-drift-period: 9s`, `--kb-graph-zoom-min: 0.5`, `--kb-graph-zoom-max:
  2.5`) beside `--kb-graph-settle: 600ms`; scheme blocks untouched. `graph.js`: ladder
  `Math.max(0, Math.min(1, (displayZoom() - 1.1) / 0.25))`; per-kind drift amp `T.drift
  * (tag 1.5 : missing 1.2 : doc 1)` id-seeded/deterministic; wheel pinch factor
  `exp(-deltaY * ((ctrlKey||metaKey) ? 0.01 : 0.0024))`; `projectKeep()` lens +
  `.is-on` single-select (`activeProject` toggle, 6× `is-on`); reduced-motion paths
  event-driven (no persistent loop).
- **F2** — §10c `[hidden]` helpers at (0,2,1): `.kb-graph .kb-graph-empty[hidden]`,
  `…-zoom[hidden]`, `…-tooltip[hidden]`, plus the pre-emptive `-legend[hidden]` /
  `-panel[hidden]` pair — each now outranks its overlay's (0,2,0) `display` rule.
- **F3** — constants `REST_RELATED 150 / REST_TAG 210 / LAYOUT_RADIUS 400 /
  COLLIDE_PAD 20`, `REPULSION 9000` / cutoff `600*600` / `CENTER_K 0.016` at baseline;
  deterministic degree-aware doc seeding (`(deg-2)/6`, `0.35 + 0.5*(1-degNorm)`) +
  owner-anchored even-angular-slot tag seeding + `ghostSourceOf` beside-linker;
  persistence key `'kb-graph:v1:' + hash01(sorted ids)`, value
  `{rest, view:{zt,pxt,pyt,auto}, tagsVisible, activeProject, selectedId}`, one
  debounced persist (250ms) + `pagehide` flush, every access try/caught, restore sets
  `restCaptured=true; alpha=0; simStarted=false` (settle skipped).
- **F4** — §10b `.md-typeset > .kb-graph { margin: 0 0 0 calc(50% - 50vw); }` — the
  breakout margin carried on the higher-specificity rule.

### CDP behavior probe (step 1.8)

Own headless Chrome (Chrome/141) on debug port 9224 against the running `kb` server,
torn down at the end (confirmed CDP down, kb server left untouched at 200). Raw CDP over
the built-in `WebSocket`; results:

- **F4 geometry** — at 1440×900 and 1280×720: `graph.x = 0`, `graph.right = viewport`
  (full-bleed, no left gutter); the bottom-right zoom stack fully on-screen
  (`right` 1422 ≤ 1440 / 1262 ≤ 1280). (The top-right info panel is `display:none` when
  no node is selected, so its rect is degenerate — expected; F4's own slice already
  CDP-measured the panel at −18…−19.8 px off-right across widths incl. 1920.)
- **F2 overlay** — after load the empty/loading overlay computes `display: none`
  (with `[hidden]` set) and `elementFromPoint` at canvas-center returns the `<canvas>`
  — the overlay is truly hidden and the canvas receives pointer events.
- **F3 persistence** — first load writes `sessionStorage['kb-graph:v1:0.491849']` with
  32 rest positions + a `view`; a same-tab reload restores the identical key with 32
  positions, **max position Δ = 0** — placement preserved, settle skipped.

### Cross-cutting invariants (step 1.9)

- F1–F4 source diff (`git diff 43f4b79..HEAD`) touches **only**
  `docs/javascripts/graph.js` + `docs/stylesheets/extra.css`; all other changed paths
  are `works/*` bookkeeping. `mkdocs.yml`, `docs/graph.md`, `docs/index.md`,
  `scripts/*`, `server/*`, CI, compose all unchanged by F1–F4.
- `extra.css` diff hunks are all ≥ line 581 (inside §10, which starts at 574) — §1–§9
  untouched. Still ONE vendored JS file (`docs/javascripts/graph.js`), **zero** matches
  for `https?://|cdn|import|require(` in it; `extra_javascript` unchanged
  (`== javascripts/graph.js`). `docs/versions/*` and `docs/current/*` were untouched by
  F1–F4. P7/SaaS not precluded (self-contained renderer + build hook).

## 2. Pre-existing `/Users/` prose leak — fixed doc-side, guard kept strict

`site_smoke.py` reported exactly one violation before consolidation: the literal
`/Users/` as inline-code PROSE (documenting the guard invariant) in
`docs/current/{data,frontend,operations,qa}.md` — introduced by the FIRST review's
consolidation (commit `43f4b79`), whose smoke ran before the docs were consolidated so
it was never caught. **Resolution: fixed the docs, kept the guard strict.** The four
leaking docs each got a new version rewritten to describe the invariant without the byte
sequence (e.g. "no user-home absolute path", "no user-home-path-leak"). `site_smoke.py`
was NOT touched, and neither `docs/current/*` (generated) nor old `docs/versions/*`
(immutable) were hand-edited. Post-consolidation grep across all `docs/current/*.md` →
zero `/Users/`; final smoke → 0 violations.

## 3. Consolidated durable docs (6 new versions, source P6.REVIEW)

Ordering followed the plan: all `doc-new-version` edits → `rebuild-docs` → **then** the
final `mkdocs build` + `site_smoke.py` (green), then `workflow validate` + `workflow
docs`.

- **experience → v0004** — F1 journey revision (quiet labels A′ with on-demand reveal +
  >110% doc-title fade-up; idle mingle after settle; pointer/pinch zoom + 1:1 pan;
  sticky re-placement with spring-following spokes; legend lens) + F3 layout revision
  (roomier default spacing, degree-aware/owner-anchored seeding, placement/camera/lens
  survive in-tab reloads; fresh tab = fresh default). Owed-QA note updated to the
  revised behaviors + the CDP probe coverage.
- **frontend → v0004** — F1 renderer/§10 truth (+4 tokens none changed, persistent rAF
  w/ `document.hidden` guard, reduced-motion event-driven, `.is-on` lens, live-model
  port) + F3 renderer truth (retuned constants, deterministic smarter seeding,
  `sessionStorage` keyed by corpus signature, settle skipped on restore) + the F2/F4
  §10 specificity fixes noted; **removed the `/Users/` literal** (reworded); line count
  refreshed (~810 → ~1130).
- **decisions → v0007** — new ADR for the operator-directed **P6.S1 revision** that
  consciously supersedes two locked S0 decisions (Label Strategy A → A′;
  settle-then-still/"no idle drift" → settle-then-mingle), Claude Design provenance;
  amended the P6 renderer ADR wording ("settles then stops" → settles then mingles) and
  added two Superseded-Decisions entries.
- **qa → v0004** — **removed both `/Users/` literals** (reworded); added the two §10
  specificity defeats found by operator browser QA (F2 `[hidden]` vs overlay display;
  F4 `margin:0` vs full-bleed `margin-left`); added the headless-Chrome **CDP geometry
  probe** as a repeatable overlay/layout QA tool; updated the graph manual-QA mission to
  the revised behaviors.
- **data → v0005** — reworded the `graph.json` publish-safety guarantee without the
  literal path token (summary states this honestly; the data contract is unchanged —
  F1–F4 were renderer/CSS-only).
- **operations → v0007** — reworded the two smoke-guard/serve-parity publish-safety
  notes without the literal path token (honest summary; build/serve pipeline unchanged).

**architecture — intentionally NOT re-versioned.** F1–F4 did not change
architecture-level truth: the build-time-data / browser-render seam is unchanged. It
stays at v0005.

`workflow docs` confirms the six new latests are indexed; `docs/index.json`
`last_rebuilt_at` refreshed.

## 4. Deviations from `plan.md`

- **`--root` negative ordering.** The plan lists the `--root` negative in step 1
  (pre-consolidation). Because the known `/Users/` leak still lived in the built pages
  before consolidation, a doctored copy of the pre-consolidation tree yielded *two*
  violations (the allowlist + the known leak). I ran the negative test **both** ways: on
  the pre-consolidation tree (2 violations — allowlist present, guard mechanism proven)
  and again on the leak-free consolidated tree, where it reduces to **exactly** the
  allowlist violation the plan expects. No behavior differs; only the sequencing was
  adjusted so "exactly the allowlist violation" holds against the final tree.
- **Doc-version summaries shortened.** Two `doc-new-version` calls first failed with
  `File name too long` because the slug is derived from the whole summary; I re-ran with
  concise summaries. No content impact.
- Otherwise none. The CDP probe was available (Chrome present, own instance on 9224),
  so no fallback to static-only assertions was needed.

## 5. Owed to the operator (unchanged, restated)

- **Browser visual QA of the revised map** in **both** schemes — the *feel* the CDP
  probe cannot judge: the idle mingle, the quiet → hover/selection label reveal + the
  >110% doc-title fade-up, trackpad-pinch / wheel zoom toward the pointer + 1:1 pan,
  sticky node re-placement with spring-following spokes, the legend lens (highlight, not
  filter), the reload-restore round-trip, and the reduced-motion path (paint at rest,
  hold still, snap).
- The **graph-page footer** note (with `navigation.footer` on, the footer sits just
  below the viewport-height map; a small scroll reveals it) — flagged since S2/S3, a
  deliberate, unchanged behavior, not a defect; the operator to opine.

The orchestrator records this verdict via `review-phase` (the executor does not
transition status).
