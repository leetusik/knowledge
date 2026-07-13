# P6.S3 result — Landing entry point + serve parity + ops hygiene

Status: **done**. The knowledge map is now reachable from the landing page, the whole
pipeline is proven under **live local serve** (the environment S1/S2 deliberately did not
exercise), and ops hygiene is closed out. All five deliverables landed; verification 1–5 are
green. The only work left for the operator/REVIEW is browser visual QA (no browser in this
harness) — restated at the end.

## What changed (3 tracked source files)

**1. `docs/index.md` — surgical landing card (+4 lines, one hunk).**
Appended one graph `.kb-card` as the last item of the existing `.kb-grid` (now **5** cards:
changple5 · hi2vi_web · bootstrap · Tags · Graph):

```html
  <a class="kb-card" href="graph/">
    <span class="kb-card__title">Graph · 지식 지도</span>
    <span class="kb-card__desc">The whole library as an interactive map — every explainer a node, linked by shared topics and references.</span>
  </a>
```

- Markup matches the sibling cards byte-for-byte; `href="graph/"` is a directory URL with no
  leading slash, so it resolves under both CI's `/knowledge/` base and local serve.
- Title carries Korean (`Graph · 지식 지도`) exactly like the neighboring Tags card
  (`Tags · 태그`); one-line description in the landing's established voice.
- **Byte-preserved everything else**: the hero, the single `for="__search"` label,
  `<div id="recent">`, the `<!-- explain:recent -->` marker, and the Recent bullets are
  untouched. Verified: `git diff docs/index.md` is a single `+4`-line hunk, and lines 24–33
  (the `#recent` div through the last Recent bullet) hash-match `HEAD`
  (`58d60360…` before == after).

**2. `scripts/site_smoke.py` — additive guard (+10 lines).**
`check_built` now asserts the built `site/index.html` carries the `.kb-card` link to `graph/`:

```python
if not re.search(r'<a[^>]*class="kb-card"[^>]*href="graph/"', html):
    failures.append("site/index.html: landing kb-card link to graph/ missing (P6.S3 graph entry card)")
```

Keyed on the card **class** so it stays distinct from the auto-nav tab / footer / `rel=next`
links to `graph/` that exist in the built page regardless of the landing card (5 total
`href="graph/"` occurrences; only 1 has `class="kb-card"`). Module docstring gained a short
P6.S3 note. Nothing else changed; all pre-existing invariants still pass. (Card is raw HTML →
mkdocs passes it through verbatim, no href rewrite, so `<a class="kb-card" href="graph/">`
appears exactly in `site/index.html`.)

**3. `README.md` — ops hygiene (+5 lines).**
"How it's built" gains a one-bullet **Knowledge map** mention (interactive `/graph/`,
`graph.json` emitted at build time by `scripts/graph_hook.py`, drawn client-side with vendored
no-CDN JS), matching the existing bold-lead-in bullet style. This is the README's site-features
surface (it already documents the API + publishing model), so the mention belongs here.
`.gitignore` still covers `site/` (line 2) — **verified only, unchanged**.

Also appended cross-slice notes + Doc-impact one-liners to `works/phases/active/P6/phase.md`
(this slice's findings block + `experience`/`frontend`, `operations`, `qa` doc-impact lines).

## Serve-parity evidence (compose `kb`, live `mkdocs serve --livereload`)

Base URL `http://localhost:8765/knowledge/` (the dev server logged
`Serving on http://0.0.0.0:8000/knowledge/`; compose maps 8765→8000, bind-mounts the repo).
**The S1 hook's `on_post_build` fires under live serve, not just `mkdocs build`** — confirmed
by fetching the hook-emitted `graph.json` over HTTP:

| # | Request | Result |
|---|---------|--------|
| 1 | `GET /knowledge/graph.json` | **200**, valid JSON, `version == 1`, **6 doc** + 26 tag nodes, 30 edges, `projects [changple5:4, bootstrap…:1, hi2vi_web:1]`, no `/Users/` leak |
| 2 | `GET /knowledge/graph/` | **200**, contains `kb-graph`, `data-graph-src="../graph.json"`, `<script src="../javascripts/graph.js">` |
| 3 | `GET /knowledge/javascripts/graph.js` | **200**, 35,268 bytes (the vendored renderer) |
| 4 | `GET /knowledge/` (landing) | **200**, carries `<a class="kb-card" href="graph/">` + `Graph · 지식 지도` |

The `data-graph-src="../graph.json"` on `/knowledge/graph/` resolves to `/knowledge/graph.json`
(fetched successfully in #1). No watch-rebuild loop was observed across the many live-reloads in
the container log (the hook writes to the temp `site_dir`, never into `docs/`, and reassigns its
URL map per rebuild — S1's serve-safe design holds). **No in-scope defect fixes were needed**:
`docs/graph.md`, `docs/javascripts/graph.js`, `extra.css §10`, and `mkdocs.yml` were all left
untouched.

**Container teardown:** the compose `kb` service was **already running** before this slice
(`docker compose up -d kb` reported "Running", not "Started"; `restart: unless-stopped`; the log
shows it serving since 06:55 with a long history of live-reloads). Because I did not start it,
per "tear down what you start" I **left it running as found** rather than kill the operator's
persistent live-reload dev server. If a clean stop is wanted: `docker compose down kb`
(or `docker compose stop kb`). This is the one deviation from the plan's literal "tear the
server down afterward" — flagged here for the operator.

## Verification (1–5, all green)

1. **CI-parity venv build** (`mkdocs-material==9.7.6` → mkdocs 1.6.1, `mkdocs build` at repo
   root) → `Documentation built in 0.33 seconds`, exit 0. (The red "MkDocs 2.0" banner is
   Material's advisory, not an error — same as S1/S2.) Then **`python3 scripts/site_smoke.py`**
   → `PASS — all site invariants hold`, exit 0 (including the new landing-link assertion).
2. **`git diff docs/index.md`** → single `+4`-line hunk (the one card block); the
   `<!-- explain:recent -->` region (lines 24–33) is byte-identical to `HEAD` (shasum match).
3. **Serve-parity curls** → the four rows above, all as recorded.
4. **`--root` negative** (copied tree in scratchpad): baseline copy → guard **PASS**; then
   removed the graph `.kb-card` block from the copy's built `site/index.html` → guard **FAIL
   with exactly 1 violation**: `site/index.html: landing kb-card link to graph/ missing (P6.S3
   graph entry card)`, exit 1. The 4 remaining nav/footer/`rel=next` `href="graph/"` links did
   **not** satisfy the assertion — proving it is specific to the landing card.
5. **`python3 scripts/workflow.py validate`** → `Workflow validation passed`, exit 0.

## Doc-impact notes recorded (for REVIEW to consolidate — not versioned here)

- `experience`/`frontend`: knowledge map reachable from the landing page (graph `.kb-card` in
  the `.kb-grid`, 5 cards now, `Graph · 지식 지도` → `graph/`), plus the auto-nav top tab.
- `operations`: serve parity confirmed — `graph_hook.py` emits under live `mkdocs serve`
  (compose `kb`), not just `mkdocs build`; local dev workflow unchanged; `.gitignore` still
  excludes `site/`; README documents the map.
- `qa`: `site_smoke.py` `check_built` gains the landing graph-link assertion (`.kb-card` →
  `graph/`), `--root` negative-tested.

## Deviations from `plan.md`

- **Container teardown**: the `kb` service was already running before the slice, so I left it
  running as found rather than tear down the operator's persistent dev server (see above). No
  server was started by me. This is the one deliberate deviation, flagged for the operator.
- Otherwise none. No S2 defect fixes were required (serve parity was clean), so `docs/graph.md`
  / `docs/javascripts/graph.js` / `extra.css §10` / `mkdocs.yml` / `compose.yml` / `pages.yml`
  were all untouched.

## What REVIEW / the operator should validate

- **Browser visual QA is still owed** (no browser in this harness): both color schemes, the
  ~600ms settle-then-still animation, hover/selection dimming + info panel, the zoom-ladder
  label transitions (hub-only <60% → all doc labels 60–110% → neighborhood tag labels >110%),
  legend project-filter + tag-visibility switch, and the reduced-motion path. Eyeball the new
  landing card in context (both schemes) too.
- **Graph-page footer** (S2's known, flagged, deliberately-unchanged behavior): with
  `navigation.footer` on, the footer sits just below the viewport-height map (a small scroll
  reveals it). Record it; only address if the operator finds it undesirable.
- The phase's durable-doc consolidation spans S0–S3 (see `phase.md`'s "Doc impact" list):
  `architecture`, `data`, `frontend`, `experience`, `operations`, `qa`, `decisions`.
