---
doc_id: qa
version: v0006
created_at: 2026-07-15T00:59:51+09:00
source: P8.REVIEW
summary: P8: hosted E2E acceptance against live production; assert the capability (pushed:true) not the status code; shipped-payload slices must run plugin_parity locally
previous: v0005_p7_plugin_e2e_reproducer_patterns_render_build_site_smoke_on_the_grown_corpus_parity_guard_negatives_per-project_deploy-gate_invariant
---

# QA

## Status

The public site (Track 1) has a mechanical acceptance gate as of P5:
`python3 scripts/site_smoke.py`, run after a `docker compose run --rm kb build`.
It is both the CI deploy gate and the local pre-push check for any change in the
P5 area (design CSS, landing markup, `mkdocs.yml`, search config). As of P6 the
same guard also covers the **knowledge-graph** feature: the `graph.json` data
contract, the first vendored custom JS (an `extra_javascript` allowlist replacing
the old "must be absent" assertion), the built `/graph/` page, and the landing
graph card. Server-side QA for Track 2 (the FastAPI store) stays as the P4
pytest/reindex checks in operations; this doc records the site-build acceptance
strategy. As of P7 the plugin distribution has its own acceptance layer: a
render→build→`site_smoke.py` **scaffold gate** (the phase crux), a byte-parity guard
with negative tests, and a full install/setup/explain E2E run against a temp scaffold
on non-operator ports — plus a **per-project deploy-gate invariant** the F1 fix and its
reproducer nailed down. As of P8 the **hosted** deployment has its own acceptance layer
too: a six-assertion E2E run against live production, whose central lesson —
**assert the capability, never the status code** — is the most transferable thing the
phase produced.

## Test Commands

- **Site-build acceptance (Track 1):**
  `docker compose run --rm kb build && python3 scripts/site_smoke.py`
  — builds with the pinned 9.7.6 image (same as CI), then asserts the load-bearing
  invariants. A clean build **and** a `PASS` predict a clean, gate-passing deploy.
- **State integrity (workspace):** `python3 scripts/workflow.py validate`.
- **API / store (Track 2):** `uv run pytest -q`; drift repair via
  `uv run python -m server.reindex` (see operations).
- **Plugin manifests (P7):** `claude plugin validate .` and
  `claude plugin validate ./plugin`, each also with `--strict` — all four exit 0.
- **Template-sync parity (P7):** `python3 scripts/plugin_parity.py` → `PASS` (the
  shipped snapshot is byte-in-parity with the repo). **Run it locally in any slice that
  touches a shipped-payload path** (`server/*`, `tests/*`, `Dockerfile`, …) — see the P8
  lesson below; pytest alone does not catch template drift.
- **Scaffold crux acceptance (P7):** render a non-operator scaffold →
  `docker run --rm -v <tmp>:/docs squidfunk/mkdocs-material:9.7.6 build` →
  `python3 <tmp>/scripts/site_smoke.py --root <tmp>` → `PASS` (a fresh KB passes its
  own portable deploy gate).

## Acceptance Criteria Style

- **Named invariants, not `--strict`.** Acceptance is a fixed list of load-bearing
  invariants the guard asserts by name — never `mkdocs build --strict`. `--strict`
  turns any build warning into a hard failure, which would block future `/explain`
  zero-config page adds on warning-level noise. The guard is deliberately silent on
  build *warnings*; only the `README.md`/`index.md` conflict is fixed (via
  `exclude_docs`), not asserted.
- Acceptance is **mechanical** for structure/contract invariants; **visual**
  acceptance (does the design read right?) stays with the operator, done on the
  local dev server before any push (deploys are manual-push-only).

## Site-Build Invariants (asserted by `scripts/site_smoke.py`)

Stdlib-only, optional `--root` (default = repo root). Two groups, collected and
reported together; exits non-zero naming every violation.

- **Source invariants** (parsed from `docs/`, `mkdocs.yml`, `compose.yml`,
  `.github/workflows/pages.yml`):
  - `docs/index.md` has the `<!-- explain:recent -->` marker with ≥1 correctly
    formatted bullet directly under it (`format_recent_bullet`'s shape);
    `docs/tags.md` has `<!-- material/tags -->`.
  - `mkdocs.yml` has no top-level `nav:`/`strict:`, has `font: false`,
    `plugins.search.lang` includes both `en` and `ko`.
  - **(P6)** `mkdocs.yml` `extra_javascript` is present and its entries are
    **exactly** `["javascripts/graph.js"]` (the flipped custom-JS allowlist,
    replacing the old "must be absent" assertion); `hooks:` references
    `scripts/graph_hook.py` and the file exists; `docs/javascripts/graph.js` exists;
    `docs/graph.md` exists with `hide:` frontmatter.
  - Pin parity: `mkdocs-material==X` (CI) equals `squidfunk/mkdocs-material:X`
    (compose).
- **Built-site invariants** (against `site/`; a clear "run mkdocs build first"
  error if `site/` is missing):
  - `site/search/search_index.json` `config.lang` includes `en`+`ko`;
    `lunr.ko.min.js` + `lunr.multi.min.js` shipped under
    `site/assets/javascripts/lunr/min/`.
  - `site/index.html` has `kb-hero`, `kb-grid`, exactly one `id="__search"` and
    ≥1 `for="__search"` (the zero-JS hero toggle), the `<ul>` element-adjacent to
    `<div … id="recent">` (HTML comments tolerated between — the `#recent + ul`
    styling depends on this DOM shape), and the marker comment + a rendered bullet.
  - The three per-project `site/<project>/index.html` pages built.
  - `site/versions/` absent; no leaked absolute local home-directory path (the
    guard scans built HTML for an operator home-path prefix) and no
    `<script src="http…">` CDN tag in any built HTML.
  - **(P6)** `site/javascripts/graph.js` shipped; `site/graph/index.html` exists,
    mounts `.kb-graph` with `data-graph-src`, and references `javascripts/graph.js`;
    the built `site/index.html` carries the landing `.kb-card` link to `graph/`
    (keyed on the card *class*, distinct from the auto-nav tab / footer / `rel=next`
    links to `graph/` that exist regardless of the card).

- **Graph data-contract invariants (P6, `check_graph` over `site/graph.json`):**
  the file exists and carries **no user-home absolute path** in its raw text (the
  guard matches the operator home-path prefix literally, so a real leak still fails);
  it is valid JSON with
  `version == 1`; `projects`/`nodes`/`edges` are lists; node ids are unique; every
  node has `id`/`type`/`title` with `type` ∈ `{doc, tag, missing}`; every doc node
  has `url`/`date`/`project`/`tags`/`degree`; every edge has `kind` ∈ `{related,
  tag}` and **both endpoints resolve** to node ids; the `projects` doc counts **sum
  to** the doc-node count; and the **doc-node count equals the filesystem count** of
  `docs/*/*.md` at depth 2 (excluding `index.md` + reserved dirs — self-adapts to new
  docs/projects). A dead `related:` is tolerated as data (a `broken` edge + a `missing`
  ghost node), never a failure.

## Manual QA Missions

### Korean/CJK search (browser — authoritative)

- **Route / entry:** `http://localhost:8765/knowledge/` → hero search field or `/`.
- **What a real user would try:** `미라클`, `관련` (should match **while typing** —
  prefix-matches the agglutinated `관련해`; the core CJK win), `창플`; `nginx` /
  `cache` (English regression); `블록체인` (absent term → no results, cleanly).
- **What would feel wrong:** `관련` only matching after the full `관련해` is typed
  (typeahead wildcard not firing); an absent term flooding results; English
  results changing.
- **Evidence:** the smoke guard's Node lunr approximation predicts these, but only
  the browser exercises Material's real worker — eyeball it.

### Design eyeball (both schemes)

- **Route / entry:** the dev server, before any push.
- **What to check:** hero, Recent list, Browse cards, tag pills, code blocks,
  admonitions, and the search field in **both** light and dark (toggle the header
  brightness icon); teal is the only accent in both.
- **What would feel wrong:** a second hue creeping in; faux-bold weights; the logo
  vanishing on one header; the awkward "Bootstrap agentic workspace.sh" tab (known
  and accepted — not a defect).

### Knowledge map (browser — authoritative, P6, revised at P6.S1)

- **Route / entry:** `http://localhost:8765/knowledge/graph/` (Graph top tab or the
  landing Graph card). This is **owed operator QA** — no full browser ran in the build
  harness; a re-review headless-Chrome CDP probe confirmed the *geometry/behavior*
  (full-bleed layout, overlay-hide, reload-restore) but the *feel* is un-eyeballed.
- **What to check (revised behaviors):** the **settle-then-mingle** motion (~600ms
  settle, then a barely-there idle wander — never fast enough to fight the pointer);
  **quiet labels (A′)** — marks-only at idle, titles revealing on hover/selection and
  doc titles fading up past ~110% zoom; **pointer/pinch zoom toward the cursor** + 1:1
  plate pan; **sticky node re-placement** (drag a node — it stays; its tag spokes
  follow on a spring); the **legend lens** (clicking a project highlights it and dims
  the rest, `.is-on`, click again to clear — nothing is removed) + the tag-visibility
  switch; the **reload-restore** round-trip (drag/zoom, then trigger a same-tab reload
  — the map returns as left, no fresh settle); both color schemes (toggle header
  brightness — the map repaints); and the reduced-motion path (paints at rest, holds
  still, snaps).
- **What would feel wrong:** a second hue appearing in an interactive accent (hover/
  selection must be teal — project inks are node fills only); the mingle fast enough to
  fight the pointer, or no mingle at all under normal motion; always-on labels (A′ is
  quiet); the loading overlay never disappearing or the canvas ignoring the pointer
  (the F2 `[hidden]` defeat); the map box offset from the left edge with the info panel
  / zoom stack clipped off-screen (the F4 full-bleed defeat); a fresh settle on every
  same-tab reload; a CDN request in the network panel.
- **Flagged, not a defect:** with `navigation.footer` on, the footer sits just below
  the viewport-height map (a small scroll reveals it).

## Regression Checklist

- [ ] `docker compose run --rm kb build` exits 0 with no `README.md`/`index.md`
      conflict warning.
- [ ] `python3 scripts/site_smoke.py` → `PASS`.
- [ ] The `<!-- explain:recent -->` marker + bullet format is byte-intact
      (`server.documents` insert/remove round-trips the live `docs/index.md`).
- [ ] `python3 scripts/workflow.py validate` passes.

## Verifying the Guard Itself (negative-test pattern)

The guard must be proven to actually guard. The pattern (from P5.S4): **doctor a
scratchpad copy, never the repo.** Copy `mkdocs.yml`, `docs/index.md`,
`docs/tags.md`, `compose.yml`, `.github/workflows/pages.yml`, and the built
`site/` tree into a scratch dir; break exactly one invariant per group (e.g.
malform the first Recent bullet's date prefix; drop `"ko"` from the copied
`search_index.json` `config.lang`); run `python3 scripts/site_smoke.py --root
<scratch>` and confirm it exits non-zero and **names both failures by group**.
Confirm the repo's own files were untouched throughout. This is the template for
re-proving the guard after any change to `check_source`/`check_built`.

**P6 graph negatives (also add `docs/graph.md`, `docs/javascripts/graph.js`,
`scripts/graph_hook.py`, and `site/graph.json`/`site/graph/` to the copied tree):**
drop the `extra_javascript:` block from the copied `mkdocs.yml` → the allowlist
assertion FAILs with exactly one violation; delete `site/graph.json` → the graph
guard FAILs; inject a CDN `<script src="http…">` into the copied
`site/graph/index.html` → the all-pages CDN scan FAILs; remove the graph `.kb-card`
from the copied `site/index.html` → the landing-link assertion FAILs (the remaining
nav/footer/`rel=next` `href="graph/"` links do **not** satisfy it); doctor a
`related:` target to a nonexistent path and rebuild → a `broken` edge + a `missing`
ghost node appear and the guard still **PASSes** (a dead link is data, not an error).
All of these were exercised during P6 and re-confirmed at review.

## Browser-QA layout/overlay checks (P6.S1) — the CDP geometry probe

The build/smoke guard cannot see rendered geometry, so two **CSS-specificity defeats**
in the graph page's `:has(.kb-graph)`-scoped `extra.css` §10 rule stack slipped past it
and were only caught by the operator's live browser QA:

- **F2 — overlays could never hide.** Overlays toggle visibility via the JS `hidden`
  attribute, but `.kb-graph [hidden] { display:none }` at specificity (0,1,1) lost to
  each overlay's own `display` rule at (0,2,0) (`.kb-graph .kb-graph-empty` grid, zoom
  flex, tooltip inline-flex). The loading/empty overlay stayed up and swallowed all
  canvas pointer events. Fixed by raising the `[hidden]` helpers to class+attribute
  selectors at (0,2,1).
- **F4 — full-bleed defeated.** `.kb-graph`'s `margin-left: calc(50% − 50vw)` breakout
  at (0,1,0) was zeroed by `.md-typeset > .kb-graph { margin: 0 }` at (0,2,0), so the
  100vw map box started at the article's left edge and pushed the info panel + zoom
  stack off-screen on wide viewports. Fixed by carrying the breakout margin on the
  higher-specificity rule itself.

**Lesson (a QA invariant now):** whenever a declaration is meant to be overridden or
extended by a later, more-specific selector, verify the *value* carries forward
everything the earlier rule needed — a plain `[hidden] { display:none }` or a
`margin: 0` reset can silently win a specificity race.

**The CDP geometry probe (repeatable tool).** These bugs are invisible to a static
guard but trivial to assert with **headless Chrome + the Chrome DevTools Protocol**:
launch an own Chrome instance on a private debug port against the running dev server,
navigate `/graph/` at several viewport widths, and read `getBoundingClientRect()` +
computed styles via `Runtime.evaluate`. The re-review's probe asserted, at 1440×900 and
1280×720, `graph.x ≈ 0` and `graph.right ≈ viewport` (F4 full-bleed), the empty overlay
computed `display:none` with the canvas receiving pointer events at center (F2), and a
same-tab reload preserving the `sessionStorage` `kb-graph:v1:` blob + node positions
(F3, max Δ 0). Tear the Chrome instance down when done; never start/stop the operator's
compose `kb` server. This is the template for the overlay/layout class of bug the smoke
guard cannot see.

## Plugin acceptance: parity negatives, the F1 reproducer, the per-project gate invariant (P7)

The plugin distribution added three acceptance patterns, all proven at build and
re-confirmed at review — none of them touch the operator's live KB (all E2E ran
against a temp scaffold on ports **9765/9766** + a temp `XDG_CONFIG_HOME`; the live
stack on 8765/8766 stayed up, never restarted):

- **Byte-parity guard, with negatives.** `scripts/plugin_parity.py` re-renders the
  `plugin/templates/kb/` snapshot with the operator's real params and byte-compares
  against repo root. Both negatives are proven: a one-byte drift in any shipped file
  FAILs, and a file present on one side but missing on the other FAILs the
  **completeness rule** (so a new `server/*.py` can't silently miss the scaffold).
- **The scaffold gate is the crux invariant.** A fresh scaffold must pass its own
  portable `site_smoke.py` (render → mkdocs 9.7.6 build → `site_smoke --root`). Because
  the guard now derives projects **dynamically** (P7.S1), the seed `getting-started`
  project satisfies the marker/bullet/graph invariants with no per-name coordination.
- **The per-project deploy-gate invariant + the F1 reproducer.** `site_smoke` requires
  `site/<project>/index.html` for **every** project `discover_projects` finds, and
  mkdocs `navigation.indexes` does **not** synthesize a missing landing — so a scaffold
  user documenting a **second** project would have failed their next Pages deploy. The
  F1 reproducer nails this down as a **repeatable pattern**: render a non-operator
  scaffold, then drive the **scaffold's own** byte-identical server via FastAPI
  `TestClient` imported **from the scaffold path** (binds **no ports** — the live KB is
  provably untouched) to POST a doc into a *new* project → assert `landing_created=true`
  + the 3-path scoped commit + `source_repo` basename-sanitized (no absolute local
  home-path leak) → `mkdocs build` → `site_smoke.py --root` **PASS** on the grown
  corpus, no home-path leak in any built HTML. This is the template for testing a server
  change against a scaffold without ever binding a port or touching the operator's stack.

## Hosted acceptance: the publish-on-write E2E (P8)

The hosted deployment (<https://knowledge.hi2vi.com>, see operations) is accepted by **one
real write to production** — not a mock, not a staging box. Run it after any change to the
write path, the push discipline, the image, or the box config. It was run green on
2026-07-14 and is the procedure to repeat:

1. **`POST /api/documents`** (bearer, `project` = a real project) → **201** carrying
   **`pushed:true`**, a `commit_sha`, a Pages `url`, and — for a brand-new project —
   `landing_created:true`.
2. **The `commit_sha` is `main`'s HEAD on the remote** (verify against **GitHub**, not the
   box), and its tree holds **exactly** the expected paths: the doc, the auto-created
   `docs/<project>/index.md`, and the `docs/index.md` Recent bullet. No `-A` sweep, no
   unrelated file, and its parent is the pre-write baseline (a clean fast-forward — the box
   did not clobber or revert anything).
3. **CI is green on that push:** the `pages.yml` run concludes **success** (its `site_smoke.py`
   step is the per-project landing gate) and `plugin-ci.yml` (parity) stays green.
4. **The doc is publicly live** at the returned `url` (~1 minute end to end).
5. **Read it back under auth:** `GET /api/search` **with** the bearer finds it (expect
   `mode:"hybrid"` when the box has a Gemini key — a doc is embedded in the *same request*
   that wrote it, so it is searchable immediately); **without** the bearer → **401**; a wrong
   bearer → **401**; `GET /healthz` stays **open**.
6. **A duplicate POST → 409** with `id` + `existing_title`, and **no second commit** on `main`.

**Post-run box hygiene:** the box clone must be clean with no `.git/rebase-merge`/`rebase-apply`
leftovers. (It may legitimately be *behind* `origin/main` — the next write fetches and rebases.)

### The two lessons (both cost a fix slice — do not relearn them)

- **Assert the capability, never the status code.** Push is **best-effort by design**: a
  totally broken publish chain returns an **identical-looking 201**, just with `pushed:false`
  and a `push_error`, and nothing ever reaches Pages. That is exactly what a missing
  `openssh-client` in the image did — the container could not push *at all*, and the failure
  was completely silent. The decisive assertion is **`pushed:true`**, and the same generalizes:
  **whenever a capability is best-effort, acceptance must assert the capability itself, not the
  request's status code** — and bring-up must assert its enablement (`command -v ssh`) rather
  than infer it.
- **A shipped-payload change must run the parity guard locally.** `plugin_parity.py` only runs
  in CI on push, so slices that edited `server/*` / `tests/*` / `Dockerfile` and validated with
  pytest alone shipped template drift **twice** in this phase (fixed by P8.F1 and again by
  P8.F2). Local validation for any shipped-payload path now includes
  `python3 scripts/plugin_parity.py`.

### Doing this safely

The E2E writes a **real, honest document** to the public knowledge base (there is no
throwaway mode — the whole point is the real publish chain), so: write something worth
publishing, and **leak-scan the payload before sending** (no token, no box path, no hostname
or container name). Read-only re-checks of production (`healthz`, an un-authed 401, the Pages
URL) are safe to repeat any time and are the cheap regression probe.

## Known Fragile Areas

- **The `#recent + ul` DOM adjacency** — a future markup change that inserts an
  element between the `#recent` head and the Recent `<ul>` silently breaks Recent
  styling with no build error (guarded).
- **`plugins.search` config** — reverting to the bare `- search` drops `lang` back
  to `["en"]` and breaks all Korean search with zero build error (guarded — the
  single most important search invariant).
- **Pin `9.7.6`** — a bump could change/remove the bundled `lunr.ko`/`lunr.multi`
  packs or rename the `#__search` toggle the hero label depends on (guarded, tied
  to pin parity).
- **The marker/bullet contract** — parsed by `server/documents.py` and the
  `/explain` API-down fallback; any landing edit must keep it byte-intact (guarded).
- **The `graph.json` data contract (P6)** — a schema/id/endpoint/publish-safety
  change (or a `graph_hook.py` regression that stops emitting, leaks a user-home
  absolute path, or breaks the projects-sum / doc-count identities) silently breaks
  the map with no build error (guarded by `check_graph`).
- **The `extra_javascript` allowlist (P6)** — it must stay exactly
  `["javascripts/graph.js"]`; adding a second entry or a CDN script is a guard
  failure, protecting the no-CDN invariant now that the site ships custom JS.
- **The per-project landing invariant (P7)** — every project needs
  `site/<project>/index.html`, so the write path (and the explain fallback) must keep
  auto-creating `docs/<project>/index.md` for a new project; a regression there
  silently breaks a scaffold user's next Pages deploy (guarded by `site_smoke`'s
  per-project check + the F1 tests).
- **Template-sync parity (P7)** — any `plugin/**` change must stay byte-in-parity with
  the repo (or update both sides); `plugin_parity.py` / `plugin-ci.yml` guard it, and a
  `plugin/**` change also requires a `plugin.json` version bump. **It is only enforced in CI**,
  so a slice that skips it locally ships drift (it happened twice in P8).
- **The silent-publish class of failure (P8)** — anything the push path needs but nothing
  asserts (the `ssh` binary, the deploy key, the remote URL, network egress) fails **without a
  loud signal**: writes keep returning 201 while nothing publishes. Guarded only by the E2E's
  `pushed:true` assertion and the bring-up capability check — there is no unit test that can
  see it.

## Open Questions

- None blocking. Behavioral search correctness is empirically verified by the smoke
  guard's index checks plus the operator's browser mission; visual acceptance stays
  with the operator on the dev server before each push.
