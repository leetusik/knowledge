# P6.S3 — Landing entry point + serve parity + ops hygiene (orchestrator plan, auto mode)

## Context

Final middle slice of P6: make the map reachable from the landing page, prove the whole pipeline works under **live local serve** (the one environment S1/S2 deliberately did not exercise), and close out ops hygiene. Risk `medium` → `slice-executor-mid`.

Sources: `phase.md` (S1 schema notes, S2 cross-slice notes — especially: serve parity is S3's explicit check; the landing card is owed; all graph-page URLs are relative so they resolve under both CI `/knowledge/` and local serve), `works/phases/active/P6/slices/P6.S2/result.md`.

## Deliverables

**1. Landing entry card — EDIT `docs/index.md` (surgical).** Add one graph `.kb-card` to the existing `.kb-grid` (4 cards today: changple5 · hi2vi_web · bootstrap · Tags), linking `graph/`. Read the existing cards first and match their exact markup shape and copy voice (title + one-line description; the site mixes EN with light Korean — e.g. title "Graph", description in the landing's established style, "지식 지도" may ride along if the neighboring cards carry Korean). **Byte-preserve everything else**: the hero (single `for="__search"` label), `<div id="recent">` + `<!-- explain:recent -->` marker + bullet lines untouched (the guard and the /explain machinery depend on them). Card placement: after the project/Tags cards or wherever the grid reads naturally — keep it one grid item, no structural changes.

**2. Serve parity — verify, and fix only if broken.** Preferred: the compose service (`docker compose up -d kb`, site at `http://localhost:8765/knowledge/`); fallback if docker isn't available/running: the pinned venv (`pip install mkdocs-material==9.7.6`) + `mkdocs serve --dev-addr=127.0.0.1:8123` run in the background. Then verify with curl:
- `GET <base>/graph.json` → 200, parses as JSON, `version == 1`, 6 doc nodes (the hook's `on_post_build` must fire under live serve);
- `GET <base>/graph/` → 200, contains `kb-graph`, `data-graph-src="../graph.json"`, and the `javascripts/graph.js` reference;
- `GET <base>/javascripts/graph.js` → 200;
- `GET <base>/` → 200, contains the new graph card link.
Tear the server down afterward. If the hook does NOT emit under serve (fetch 404), diagnose and fix within the hook's serve-safe design (writes to `site_dir`, reassigns state per rebuild) — a fix here is in-scope; a redesign of the mechanism is not (escalate instead).

**3. Guard the entry point — EDIT `scripts/site_smoke.py` (additive, small):** built `site/index.html` must contain a link to `graph/` (the landing card). Nothing else changes; existing landing invariants (hero/`#__search`/`#recent`-adjacency/marker/bullets) already cover the rest and must still pass.

**4. Ops hygiene:** check the repo `README.md` — if it documents the published site's features (it documents the API and publishing model), add a one-or-two-line Graph mention in the matching section/style (the site now ships an interactive knowledge map at `/graph/`, data emitted at build time by `scripts/graph_hook.py`, guarded by `site_smoke.py`). Skip if the README genuinely has no site-features surface to extend — note that instead. Confirm `.gitignore` still covers `site/` (it should; just verify, don't churn).

**5. Notes + docs:** append to `phase.md`: cross-slice notes (serve-parity outcome — the evidence lines; landing card shape) + Doc-impact one-liners: `experience`/`frontend` (landing entry point to the map), `operations` (serve parity confirmed: hook emits under live `mkdocs serve`; local workflow unchanged), `qa` (landing graph-link assertion added). Also note for REVIEW/operator: **visual QA in a real browser is still owed** (both schemes, settle animation, hover/selection, zoom ladder, legend filters, reduced motion) — the harness environment has no browser; and the footer on the graph page sits just below the viewport-height map (S2's known, flagged behavior — record it, don't change it).

**6. Write `works/phases/active/P6/slices/P6.S3/result.md`** — what changed, the serve-parity evidence (actual curl outcomes), verification results.

## Verification (lean)

1. CI-parity venv build (`mkdocs build`) → `python3 scripts/site_smoke.py` → PASS (with the new landing-link assertion).
2. `git diff docs/index.md` shows ONLY the one added card block; the `<!-- explain:recent -->` region is byte-identical (e.g. `git diff` hunk inspection or hash the marker region before/after).
3. The serve-parity curls above, recorded verbatim in result.md.
4. One negative (`--root` copy): remove the graph card from the copied built `site/index.html` → guard FAILs on the new assertion.
5. `python3 scripts/workflow.py validate`.

## Executor contract (slice-executor-mid)

- Allowed: the surgical `docs/index.md` card; additive `site_smoke.py` assertion; README site-features mention (if applicable); scratchpad/venv builds; background serve processes (compose `kb` or venv `mkdocs serve`) — **tear down what you start**; write this slice's `result.md`; append to `phase.md`.
- Not allowed: `docs/graph.md` / `docs/javascripts/graph.js` / `extra.css` §10 changes (S2 is closed — if serve parity exposes a genuine defect in them, fix the minimal defect and flag it prominently in result.md; anything structural → `escalate`); `mkdocs.yml` (unless a serve-parity fix strictly requires it — flag if so); `compose.yml`/`pages.yml`; hero/`#recent`/marker/bullets in `index.md`; `doc-new-version`; commits; status transitions; other slices' files.
- If both docker and venv-serve are unavailable, return `blocked` with what you tried.
- Before returning: verification 1–5 green; structured verdict + summary + notes_for_orchestrator (what REVIEW should validate) + files_changed + validation evidence.
