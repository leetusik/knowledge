# P6.REVIEW — re-review after P6.F1–F4 (supersedes the F1+F2 re-review plan)

This is the RE-review. The first review passed on 2026-07-14 (its plan is in git history;
its summary is preserved in `phase.md` → "Review summary (P6.REVIEW, 2026-07-14)"; docs
consolidated then: architecture v0005, data v0004, frontend v0003, experience v0003,
operations v0006, qa v0003, decisions v0006). The phase was then reopened
`changes_requested` (2026-07-14 10:23): the operator's visual QA — done in Claude Design
co-work — produced the "P6.S1 revision" spec, and subsequent live browser QA caught three
more latent defects. Four fix slices landed since, all committed, working tree clean:

- **P6.F1** (`7de5fa5`) — renderer revision: quiet labels A′, idle mingle, pointer zoom,
  sticky re-place, legend lens.
- **P6.F2** (`3c1e952`) — overlays honor `[hidden]`: class+attribute selectors at (0,2,1)
  now beat the overlays' own display rules.
- **P6.F3** (`9842800`) — roomier spacing, deterministic degree-aware/owner-anchored
  seeding, sessionStorage persistence across reloads.
- **P6.F4** (`fec0157`) — full-bleed breakout margin carried on the `.md-typeset` rule
  that was defeating it (`extra.css:755`).

Earlier re-review runs were stopped mid-validation when the F2/F3 QA reports arrived —
they made NO writes (no doc versions, no phase.md changes), so start clean. This
re-review validates the phase WITH F1–F4 against the revised spec and re-consolidates
the affected durable docs.

## 1. Re-validate the phase with F1–F4 in

The revised behavioral spec sources:
- Slice context: `slices/P6.F{1,2,3,4}/plan.md` + `result.md` (full specs + verification
  records); `phase.md` → sections "P6.F1" through "P6.F4".
- Design mirror (verified still present at planning time):
  `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/7a3b6e1d-58a3-417e-9225-914f76c2e068/scratchpad/kb-graph-design-rev/`
  (`BRIEF_REVISION.md` verbatim spec; `components/graph/graph-render.js` reference
  `kbGraph.mount()`; `tokens/graph.css`; `components/graph/graph.css`). If it has
  vanished mid-run, fall back to the F1 slice folder's embedded spec — do not block.

Battery, from a clean `site/` in a pinned venv (`pip install mkdocs-material==9.7.6`):
- `mkdocs build` → succeeds; artifacts present (`site/graph.json`, `site/graph/index.html`,
  `site/javascripts/graph.js`).
- Determinism: build twice, `cmp` the `graph.json`s (pipeline untouched by F1–F4).
- `node --check docs/javascripts/graph.js`.
- `python3 scripts/site_smoke.py` — EXPECT exactly the known `/Users/` prose-leak
  violation (docs/current/{data,frontend,operations,qa}) until step 3's consolidation
  lands; every graph/renderer/guard/landing assertion must already pass. The FINAL
  post-consolidation run must be fully green — 0 violations (see ORDERING in step 3).
- `--root` negative (doctored copy: drop `extra_javascript:`) → FAIL with exactly the
  allowlist violation. Guard keeps its teeth.
- Serve parity IF the compose `kb` server is already up (it was at planning time,
  `http://localhost:8765/knowledge/` → 200 — NEVER start/stop it): curl
  `/knowledge/graph/` (200, `.kb-graph` mount + `data-graph-src`),
  `/knowledge/javascripts/graph.js` (carries `kb-graph-drift` + `kb-graph:v1`),
  `/knowledge/graph.json` (version 1, 6 doc + 26 tag nodes, no `/Users/`).
- Spec-fidelity spot-checks of `docs/javascripts/graph.js` + `extra.css` §10 against the
  mirror + slice specs:
  - **F1:** 4 new tokens verbatim (none changed, scheme blocks untouched); quiet-label
    targets (ladder `clamp01((dz−1.1)/0.25)`, tags on-demand only); drift formula +
    per-kind amps (doc 1 / ghost 1.2 / tag 1.5) + id-seeded determinism; wheel pinch
    factor (`ctrl/meta ? 0.01 : 0.0024`) + token clamps relative to fit; sticky-commit
    math (rest minus drift; tag offsets vs owners' rest centroid); `projectKeep` lens +
    `.is-on` single-select; reduced-motion paths (no mingle, no persistent loop, snap
    eases).
  - **F2:** §10c `[hidden]` helpers at (0,2,1) — `.kb-graph .kb-graph-empty[hidden]`,
    `…-zoom[hidden]`, `…-tooltip[hidden]`, plus the pre-emptive legend/panel pair; no
    overlay rule with an own `display` outranks them.
  - **F3:** constants `REST_RELATED 150 / REST_TAG 210 / LAYOUT_RADIUS 400 /
    COLLIDE_PAD 20` with `REPULSION 9000` / cutoff `600²` / `CENTER_K 0.016` at baseline;
    deterministic degree-aware doc seeding (hubs in, leaves out) + owner-anchored
    even-angular-slot tag seeding + ghost-beside-linker; sessionStorage persistence —
    key `'kb-graph:v1:' + hash01(sorted ids)`, value
    `{rest, view:{zt,pxt,pyt,auto}, tagsVisible, activeProject, selectedId}`, one
    debounced persist (~250ms) + `pagehide` flush, every access try/caught (silent
    no-op), restore skips the settle and snaps a stored non-auto camera; the
    no-randomness invariant (hash01 only) kept.
  - **F4:** `extra.css` §10b `.md-typeset > .kb-graph { margin: 0 0 0 calc(50% - 50vw); }`
    — the breakout margin carried on the higher-specificity rule.
- **CDP behavior probe** (best-effort; F4 established headless Chrome + CDP as a
  repeatable tool): launch your OWN headless-Chrome instance (separate debug port, e.g.
  9223; tear it down when done) against the running `kb` server. Assert:
  - (F4) graph bounding rect `x≈0` and `right≈viewport` at ≥2 widths (e.g. 1440×900,
    1280×720), info panel + zoom stack fully on-screen.
  - (F2) after graph load, the loading/empty overlay is actually hidden (computed
    `display: none`) and the canvas receives pointer events.
  - (F3) reload the page in the same session: `sessionStorage` carries the `kb-graph:v1:`
    key and node placement is restored (settle skipped / positions match pre-reload).
  If Chrome/CDP is unavailable, fall back to the static assertions above and say so
  explicitly in `result.md`.
- Cross-cutting invariants: the F1–F4 diffs touch ONLY `docs/javascripts/graph.js` +
  `extra.css` §10 (F2/F4 CSS-only, F3 JS-only); still ONE vendored JS file, zero
  third-party / zero CDN; `extra.css` §1–§9 untouched; `mkdocs.yml`, `docs/graph.md`,
  `docs/index.md`, `scripts/*`, `server/*`, CI, compose all unchanged by F1–F4; old
  `docs/versions/*` untouched; P7/SaaS not precluded.
- `python3 scripts/workflow.py validate`.

## 2. Fix the pre-existing `/Users/` prose leak (required for a green tree)

P6.F1's validation surfaced it; it is NOT an F-slice defect: `site_smoke.py` reports
exactly 1 violation — the literal string `/Users/` as inline-code PROSE (documenting the
guard invariant) in `docs/current/{data,frontend,operations,qa}.md`, introduced by the
FIRST review's consolidation (commit `43f4b79`), whose smoke ran before the docs were
consolidated so it was never caught.

Resolution (decided): **fix the docs, keep the guard strict.** A real absolute path in
inline code would be a genuine leak, so the guard must keep matching the literal; the
durable docs must describe the invariant without that byte sequence (e.g. "no local
absolute paths (user-home prefixes) leak into shipped artifacts"). The four leaking docs
all get new versions in step 3 — write them leak-free. Do NOT hand-edit
`docs/current/*` (generated) or old `docs/versions/*` (immutable); do NOT touch
`site_smoke.py`.

## 3. On a passing re-review only — consolidate durable docs

Consolidate `phase.md` → "## Doc impact" P6.F1–F4 entries plus the leak fix, via
`python3 scripts/workflow.py doc-new-version --doc <doc> --summary "..." --source
P6.REVIEW` + write each new version file as the full updated doc + `rebuild-docs`:
- `experience` — F1's journey revision (quiet labels A′ with on-demand reveal + >110%
  fade-up, idle mingle after settle, pointer/pinch zoom + 1:1 pan, sticky re-placement
  with spring-following spokes, legend lens) + F3's layout revision (roomier default
  spacing, degree-aware/owner-anchored seeding, placement/camera/lens survive reloads
  within the tab; fresh tab = fresh default layout).
- `frontend` — F1's §10/renderer truth (+4 tokens, `.is-on`, live-model port, persistent
  rAF w/ document.hidden guard, reduced-motion event-driven) + F3's renderer truth
  (retuned constants, deterministic smarter seeding, sessionStorage keyed by corpus
  signature, settle skipped on restore) AND remove the `/Users/` literal.
- `decisions` — the operator-directed P6.S1 supersession of two locked S0 decisions
  (label Strategy A → A′; settle-then-still/"no idle drift" → settle-then-mingle),
  Claude Design provenance; amend the affected P6 ADR wording rather than contradicting
  it.
- `qa` — remove the `/Users/` literal AND consolidate F2's + F4's Doc-impact lines (the
  TWO §10 specificity defeats found by operator browser QA: `[hidden]` vs overlay
  display rules; `margin: 0` killing the full-bleed `margin-left`) + the CDP geometry
  probe as a repeatable QA tool for overlay/layout bugs.
- `data`, `operations` — new versions primarily to remove the `/Users/` literal (say so
  honestly in each `--summary`); fold in any small F1–F4 truth touch-up (none expected).
- `architecture` — only if you judge F1–F4 changed architecture-level truth (they should
  not: the build-time-data / browser-render seam is unchanged).
- ORDERING: consolidate + `rebuild-docs` FIRST, then the final `mkdocs build` +
  `python3 scripts/site_smoke.py` so smoke covers the consolidated docs (the first
  review's sequencing gap). Final smoke must be fully green (0 violations). Then
  `workflow.py validate` + `workflow.py docs` to confirm the index picked up the
  versions.

## 4. Deliverables

- `result.md` (write fresh; the first pass's substance lives in phase.md + git history):
  validation matrix with actual outcomes, spec-fidelity findings, CDP probe outcomes,
  the leak fix, doc versions created, explicit verdict + reasoning.
- `phase.md`: append "## Re-review summary (P6.REVIEW, after P6.F1–F4)" — keep the first
  review's summary section intact. Restate what stays operator-owed: browser visual QA
  of the revised map (both schemes: mingle feel, hover/select reveal, pinch zoom toward
  pointer, sticky drag + spring spokes, legend lens, reload-restore, reduced motion) and
  the pre-existing graph-page footer note.
- Return `review_verdict: pass | changes_requested | blocked`. If `changes_requested`:
  do NOT consolidate docs; list concrete proposed fix slices for the orchestrator.

## Executor contract (slice-executor-high)

- Allowed: read everything; venv/scratchpad builds + doctored `--root` copies; curls
  against the already-running local server only; launching + tearing down your OWN
  headless-Chrome instance for the CDP probe; `doc-new-version` + new files under
  `docs/versions/` + `rebuild-docs` (docs only, never source); write this slice's
  `result.md`; append to `phase.md`.
- Not allowed: any change to source (`scripts/`, `docs/javascripts/`, `docs/graph.md`,
  `docs/index.md`, `docs/stylesheets/`, `mkdocs.yml`, `server/`, CI, compose);
  hand-editing `docs/current/*` or old `docs/versions/*`; creating slices; commits;
  status transitions (`review-phase` is the orchestrator's); starting/stopping the
  compose `kb` server.
- A NEW defect found during validation → verdict `changes_requested` with proposed fix
  slices; environmental impossibility → `blocked`.
