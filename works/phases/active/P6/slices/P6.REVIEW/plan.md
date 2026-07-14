# P6.REVIEW — re-review after P6.F1 + P6.F2 (supersedes the first-pass plan)

This is the RE-review. The first review passed on 2026-07-14 (its plan is in git history;
its summary is preserved in `phase.md` → "Review summary (P6.REVIEW, 2026-07-14)"; docs
consolidated then: architecture v0005, data v0004, frontend v0003, experience v0003,
operations v0006, qa v0003, decisions v0006). The phase was then reopened
`changes_requested`: the operator's visual QA — done in Claude Design co-work — produced
the "P6.S1 revision" spec, implemented by **P6.F1** (commit `7de5fa5`). The operator's
subsequent live browser QA then caught a latent S2 defect (the loading overlay could never
hide — CSS specificity), fixed by **P6.F2** (commit `3c1e952`). A first re-review run was
stopped mid-validation when F2 was reported — it made NO writes (no doc versions, no
phase.md changes), so start clean. This re-review validates the phase WITH F1 + F2 against
the REVISED spec and re-consolidates the affected durable docs.

## 1. Re-validate the phase with F1 + F2 in

The revised behavioral spec sources:
- Slice context: `slices/P6.F1/plan.md` (full spec + verification record) and
  `slices/P6.F1/result.md`; `phase.md` → "P6.F1" section. For the overlay fix:
  `slices/P6.F2/plan.md` + `result.md`; `phase.md` → "P6.F2" section.
- Design mirror: `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/7a3b6e1d-58a3-417e-9225-914f76c2e068/scratchpad/kb-graph-design-rev/`
  (`BRIEF_REVISION.md` verbatim spec; `components/graph/graph-render.js` reference
  `kbGraph.mount()`; `tokens/graph.css`; `components/graph/graph.css`).

Battery, from a clean `site/` in a pinned venv (`pip install mkdocs-material==9.7.6`):
- `mkdocs build` → succeeds; artifacts present (`site/graph.json`, `site/graph/index.html`,
  `site/javascripts/graph.js`).
- Determinism: build twice, `cmp` the `graph.json`s (pipeline untouched by F1).
- `node --check docs/javascripts/graph.js`.
- Serve parity IF the compose `kb` server is already up (never start/stop it): re-curl
  `/knowledge/graph/` (200) and `/knowledge/javascripts/graph.js` (carries `kb-graph-drift`).
- Spot-check spec fidelity of `docs/javascripts/graph.js` + `extra.css` §10 against the
  mirror: 4 new tokens verbatim (none changed, scheme blocks untouched); quiet-label
  targets (ladder `clamp01((dz−1.1)/0.25)`, tags on-demand only); drift formula +
  per-kind amps (doc 1 / ghost 1.2 / tag 1.5) + id-seeded determinism; wheel pinch factor
  (`ctrl/meta ? 0.01 : 0.0024`) + token clamps relative to fit; sticky-commit math (rest
  minus drift; tag offsets vs owners' rest centroid); `projectKeep` lens + `.is-on`
  single-select; reduced-motion paths (no mingle, no persistent loop, snap eases).
- F2 fidelity: the `[hidden]` helper in §10c now carries the five class+attribute
  selectors at (0,2,1) (`.kb-graph .kb-graph-empty[hidden]` etc.); confirm no overlay
  rule with an own `display` outranks it, and that F2's diff is that one hunk only.
- Cross-cutting invariants as in the first review: ONE vendored JS file, zero third-party
  /CDN, `extra.css` §1–§9 untouched (F1's + F2's diffs must be §10-only), `mkdocs.yml`
  unchanged by F1/F2, `docs/graph.md`/`docs/index.md`/`scripts/*` unchanged by F1/F2, old
  `docs/versions/*` untouched, P7/SaaS not precluded.
- `python3 scripts/workflow.py validate`.

## 2. Fix the pre-existing `/Users/` prose leak (required for a green tree)

P6.F1's validation surfaced it; it is NOT an F1 defect: `site_smoke.py` reports exactly
1 violation — the literal string `/Users/` as inline-code PROSE (documenting the guard
invariant) in `docs/current/{data,frontend,operations,qa}.md`, introduced by the FIRST
review's consolidation (commit `43f4b79`), whose smoke ran before the docs were
consolidated so it was never caught.

Resolution (decided): **fix the docs, keep the guard strict.** A real absolute path in
inline code would be a genuine leak, so the guard must keep matching the literal; the
durable docs must describe the invariant without that byte sequence (e.g. "no local
absolute paths (user-home prefixes) leak into shipped artifacts"). The four leaking docs
all get new versions in step 3 — write them leak-free. Do NOT hand-edit `docs/current/*`
(generated) or old `docs/versions/*` (immutable); do NOT touch `site_smoke.py`.

## 3. On a passing re-review only — consolidate durable docs

Consolidate `phase.md` → "## Doc impact" P6.F1 entries plus the leak fix, via
`python3 scripts/workflow.py doc-new-version --doc <doc> --summary "..." --source
P6.REVIEW` + write each new version file as the full updated doc + `rebuild-docs`:
- `experience` — F1's journey revision (quiet labels A′ with on-demand reveal + >110%
  fade-up, idle mingle after settle, pointer/pinch zoom + 1:1 pan, sticky re-placement
  with spring-following spokes, legend lens).
- `frontend` — F1's §10/renderer truth (+4 tokens, `.is-on`, live-model port, persistent
  rAF w/ document.hidden guard, reduced-motion event-driven) AND remove the `/Users/`
  literal.
- `decisions` — the operator-directed P6.S1 supersession of two locked S0 decisions
  (label Strategy A → A′; settle-then-still/"no idle drift" → settle-then-mingle),
  Claude Design provenance; amend the affected P6 ADR wording rather than contradicting it.
- `data`, `operations` — new versions primarily to remove the `/Users/` literal
  (say so honestly in each `--summary`); fold in any small F1 truth touch-up.
- `qa` — remove the `/Users/` literal AND consolidate F2's Doc-impact line (the
  `[hidden]`-specificity lesson from operator browser QA; F1 needed no guard change).
- `architecture` — only if you judge F1 changed architecture-level truth (it should not:
  the build-time-data / browser-render seam is unchanged).
- ORDERING: consolidate + `rebuild-docs` FIRST, then the final `mkdocs build` +
  `python3 scripts/site_smoke.py` so smoke covers the consolidated docs (the first
  review's sequencing gap). Final smoke must be fully green (0 violations). Then
  `workflow.py validate` + `workflow.py docs` to confirm the index picked up the versions.

## 4. Deliverables

- `result.md` (write fresh; the first pass's substance lives in phase.md + git history):
  validation matrix with actual outcomes, spec-fidelity findings, the leak fix, doc
  versions created, explicit verdict + reasoning.
- `phase.md`: append "## Re-review summary (P6.REVIEW, after P6.F1)" — keep the first
  review's summary section intact. Restate what stays operator-owed: browser visual QA of
  the revised map (both schemes: mingle feel, hover/select reveal, pinch zoom toward
  pointer, sticky drag + spring spokes, legend lens, reduced motion) and the pre-existing
  graph-page footer note.
- Return `review_verdict: pass | changes_requested | blocked`. If `changes_requested`:
  do NOT consolidate docs; list concrete proposed fix slices for the orchestrator.

## Executor contract (slice-executor-high)

- Allowed: read everything; venv/scratchpad builds + doctored `--root` copies; curls
  against the already-running local server only; `doc-new-version` + new files under
  `docs/versions/` + `rebuild-docs` (docs only, never source); write this slice's
  `result.md`; append to `phase.md`.
- Not allowed: any change to source (`scripts/`, `docs/javascripts/`, `docs/graph.md`,
  `docs/index.md`, `docs/stylesheets/`, `mkdocs.yml`, `server/`, CI, compose);
  hand-editing `docs/current/*` or old `docs/versions/*`; creating slices; commits;
  status transitions (`review-phase` is the orchestrator's).
- A NEW defect found during validation → verdict `changes_requested` with proposed fix
  slices; environmental impossibility → `blocked`.
