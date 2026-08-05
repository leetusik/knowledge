---
doc_id: qa
version: v0013
created_at: 2026-08-06T00:05:13+09:00
source: P24.REVIEW
summary: P24 acceptance: the long-standing gated format-key failure is resolved (115 passed 0 failed) and publish.drain() is the deterministic way to assert an after-response side effect
previous: v0012_p22_app-graph_label-focus_qa_mission_the_p6_map_mission_covers_the_mkdocs_surface_only
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
phase produced. As of P13 the **standalone `knowledge` CLI** has its own acceptance layer:
`scripts/cli_smoke.py` drives the *installed* binary through the full lifecycle +
logout-survival + the `/auth` 429 throttle against a running local stack — proven green on
localhost; hosted end-to-end is pending the operator's P10–P13 accounts-plane cutover (see
operations). See *CLI smoke acceptance (P13)* below. **As of P17 the hosted end-to-end
skill path is verified live on prod** (`https://knowledge.hi2vi.com`) against a fresh
throwaway tenant — signup → project → mint `vk_` → `POST /api/documents format:"html"`
(the S1 `sample-explainer.html`) → 201 `.html` + `format:"html"` → `/api` read-back
(extracted-text `markdown`, no `raw_html`) → session-guarded `GET /app/documents/{id}/raw`
(200 raw HTML + the four sandbox headers) → tenant FTS by visible text → the **MCP
`vk_`-path** (`e2e_smoke.py` search + `fetch_document` relaying `format:"html"`). This
**closes** the P13 "hosted E2E pending" and the P15 MCP `vk_` residual; the one
un-automated item left is the operator's **in-browser quiz-render eyeball**. See *Hosted
skill-path E2E (P17)* below. **As of P18 the accounts-v2 work (org-level keys + get-or-create)
adds Postgres-gated coverage and an extended E2E** — new gated suites
`test_accounts_provisioning.py` + `test_org_credentials.py` (mirrored into the plugin
template), `test_dashboard_api.py` updated for the auto-provisioned default project, the CLI
`test_auth.py` adjusted, and `scripts/onboarding_smoke.py` extended with an **org-model
journey** proven green both against a disposable `postgres:17` and **live against prod**. The
`0003` migration was validated at the review (clean upgrade + downgrade round-trip + a
seeded-duplicate de-dupe scenario). **As of P24 the Postgres-gated suite is fully green —
115 passed / 0 failed** — so the long-standing `format`-key failure flagged under P18 and P21
(`test_documents_api.py::test_documents_list_detail_and_project_bridge`) is **resolved and
retired as a standing item**; the notes below are kept for the history of how it was tracked,
not as an open defect. P24 also adds the repo's pattern for testing **after-response** work:
`publish.drain()`. See *Publish-worker acceptance (P24)* below.

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
- **CLI unit tests (P13):** `cd cli && uv run pytest -q` → **39 passed** (config resolver
  contract, auth/onboard, knowledge commands, guide anti-rot). CLI tests live under
  `cli/tests/`, never root `tests/` (parity guard).
- **CLI E2E smoke (P13):** `python3 scripts/cli_smoke.py --base-url http://localhost:8766`
  → `PASS` — drives the **installed** `knowledge` binary through the whole lifecycle + the
  429 (prerequisites + the fresh-stack caveat below).

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

_Scope: the **public mkdocs map** only. The app's `/graph` renderer forked from it at P22 —
its labels are selection-driven, so the "quiet labels (A′)" expectation below does **not**
apply there; use *In-app graph label focus (P22)* instead._

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

### In-app graph label focus (browser — authoritative, P22)

- **Route / entry:** the app's `/graph` (member) and `/graph/{org}` (public, project made
  public). Both render the same `GraphCanvas`, so check one thoroughly and the other for
  parity. **Owed operator QA** — P22 shipped on typecheck/lint/unit-suite plus a static read
  of `labelTarget()`; canvas rAF label behavior has no automated coverage and none is planned
  (a headless CDP probe can confirm geometry, not "does the map feel quiet").
- **What to check:** an **idle map carries no titles at all**, at any zoom — zoom in past the
  old ~110%/135% thresholds and nothing should fade in; **click a node → exactly one title**,
  which persists while selected (Escape/deselect clears it); **hover a node → that node's
  title**, gone on pointer-out; **hover a neighbor of the selected node → two titles at most**
  (the hovered one plus the still-selected one) and **never a cluster**; **drag a node →
  its own title only**; a **tag or ghost node** selected/hovered shows its muted title;
  with the **legend project lens** on, an excluded node stays titleless even when hovered.
- **What must be unchanged:** hover still **undims the neighborhood** and dims the rest (node
  alpha was out of scope), the teal **selection ring** and the **info panel** on click, edge
  activation + halo, the **low-zoom pointer tooltip** below 0.6× zoom, and reload-restore.
- **What would feel wrong:** any title appearing for a node you are neither on nor have
  selected; titles fading in as you zoom (that is the deleted ladder returning); the hovered
  node's title *not* appearing at normal zoom (there is no tooltip above 0.6×, so the node
  would be unidentifiable without a click); a hover lighting a whole neighborhood of titles.
- **The open operator call:** P22 kept a title for the hovered/dragged node on top of the
  selected one. If the literal "only the clicked one" is wanted, dropping `|| n.id === focus`
  from `labelTarget()` is the whole change — decide this during the eyeball.

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

## CLI smoke acceptance (P13)

The standalone `knowledge` CLI is accepted by `scripts/cli_smoke.py` — the sibling of `scripts/onboarding_smoke.py`, but where that drives the raw HTTP surface, this drives the **installed binary** as a user's agent would: one `subprocess` per command under a throwaway `XDG_CONFIG_HOME`, collect-all-failures, `PASS`/exit-1. It exists + reads as a faithful lifecycle+429 driver (confirmed at the review; the live run itself was proven at `P13.S5`, not re-run here).

- **Prerequisites (the caller sets up):** a running local stack (`docker compose up -d postgres api`), **migrated in-container** (`docker compose exec -T api uv run alembic upgrade head` — the host has no `DATABASE_URL` route to postgres), and the CLI installed with **`uv tool install ./cli --reinstall`** (never `--force` — uv reuses the cached wheel and silently keeps the stale binary).
- **What it drives + asserts:** `init` (signup → project → mint `vk_` → config seam **0600**, `api.token=vk_…`, resolves configured) → `projects` empty-state (before the first save — `/api/projects` is a GROUP BY over documents) → `save` (2 tags) → `list` → `search` (unique token) → `read` (**byte-for-byte round-trip**) → `projects` present → `usage` (live) → `logout` → **post-logout `save`/`search` still work on the `vk_` while `usage` fails** (the two-token model from the terminal) → the **throttle**.
- **The 429 + enumeration-safety, proven live at S5:** hammering `login` from one IP returned **20×`401` then `429`** with `Retry-After` + a generic body; unknown-email and wrong-password 401s were **byte-identical** (the IP-keyed throttle runs before the credential check, so it never leaks which was wrong); signup and login have independent windows. Through the CLI the 429 surfaces as a clean `error: HTTP 429: …` — no hang, no raw body (S5 touched no CLI code; that clean surfacing is `main()`'s existing `ApiError` boundary — do not "improve" it without re-running the smoke).
- **Fresh-window caveat:** the limiter state is **in-process**, so the throttle assertion assumes a **fresh** `api` (empty window). A re-run against the same long-lived container within the window sees residual counts — `docker compose restart api` resets it (the smoke's failure messages say so). Tune the threshold with `--login-limit` if the stack's `KB_AUTH_RATE_LIMIT` differs from the default 20.
- **Hosted E2E is pending, not failing.** Every P13 slice validated against **localhost** because the accounts plane is not yet deployed to prod (no `knowledge-postgres` on the box, box clone at pre-P13 code, box `.env` missing the accounts secrets). Hosted acceptance — one real `knowledge init --base-url https://knowledge.hi2vi.com` — becomes possible after the operator runs the one-time P10–P13 cutover (operations); the edge routing that makes it reachable is already deployed and verified.

## Hosted skill-path E2E (P17)

P17's behavioral acceptance is the **hosted, live-prod skill path** — the counterpart to
P8's publish-on-write E2E, but exercising the P16 HTML pipeline through the accounts plane
with a real per-tenant `vk_` key. It was run green at the phase's S5 (17/17 checks) and
re-probed at the review. Two tiers, both credential-free-repeatable and secret-safe:

- **Credential-free re-probes (the cheap regression, safe to repeat any time).** Against
  `https://knowledge.hi2vi.com` with a browser `User-Agent` (Cloudflare 403s the default
  `Python-urllib` UA — a transport detail only): `GET /healthz` → **200**; `POST
  /auth/login` with nonsense creds → **401 `invalid email or password`** (the
  migrated/live discriminator — dormant or unmigrated would 500); unauth `GET
  /app/documents/1/raw` → **401** (the P16 route is present; a pre-P16 api returns
  route-absent **404**). These three settle "accounts plane live + P16 shipped" without any
  account or write.
- **The full throwaway-account E2E (run when the skill path or the deploy changes).** Sign
  up a **reserved-domain `example.com` throwaway**, create a project, mint a `vk_` (shown
  once), then: `POST /api/documents format:"html"` with the S1 `sample-explainer.html` →
  **201** `.html` `rel_path` + `"format":"html"`; `GET /api/documents/{id}` (vk_) →
  `format:"html"` + `markdown` = **extracted text** (not raw HTML) + **no `raw_html` key**;
  `GET /app/documents/{id}/raw` (session) → **200 `<!DOCTYPE html>`** with all four sandbox
  headers (CSP `sandbox allow-scripts; frame-ancestors 'self'`, `X-Frame-Options`,
  `nosniff`, `no-store`); `GET /api/search` finds it by visible text; and `e2e_smoke.py`
  (public host, the minted `vk_`) PASSes `search` + `fetch_document` with the tool now
  relaying `format:"html"`. **Rules:** create no persistent accounts you cannot clean up
  (there is **no delete API** — throwaway tenants are namespaced and isolated from tenant
  #1's corpus; the operator may purge later), hold the `vk_`/session token in tmp only
  (never in `works/`), and keep the auth-throttle budget tiny (a couple of login/signup
  calls, well under 20/900 s/IP).
- **The one operator residual: the in-browser quiz-render eyeball.** Confirming the P16
  sandboxed iframe *renders* the interactive explainer (quiz clicks + feedback) under a
  fresh tenant needs a real browser — none is in the harness. It is an operator
  visual-acceptance residual (P16 accepted the same class); every machine-verifiable layer
  behind it — the raw-HTML relay and the four sandbox headers — is proven live. The natural
  moment is the operator's post-phase dogfood (install the plugin from the public
  marketplace, `/knowledge:setup` connect, `/explain`, view the doc), which also completes
  S2's flagged steady-state (drop the redundant user-level skill copy).

## Accounts v2 acceptance (P18)

P18's acceptance is Postgres-gated pytest + CLI unit tests + the extended `onboarding_smoke.py` E2E (there is no browser residual — the org-keys panel reuses proven P12 components). All green at the P18 review.

- **Postgres-gated pytest (the accounts plane is Postgres-only).** Run the full suite against a disposable `postgres:17` with `KB_TEST_DATABASE_URL` set (the gated tests build the post-`0003` schema via `metadata.create_all`, so no alembic step is needed for pytest). New terse gated suites: `tests/test_accounts_provisioning.py` (signup → `tenant.name == "default"`, `project.name == "default"`, minted credential persists `tenant_id`) and `tests/test_org_credentials.py` (org mint → `project_id NULL` + authorizes a write + the unregistered project appears in `/app/projects` [get-or-create proof]; project-bound key still writes; revoked org key → 401; duplicate `POST /app/projects` → 201 same id). `tests/test_dashboard_api.py` was updated for the auto-provisioned default project. **All mirrored into `plugin/templates/kb/` + `manifest.json` (parity).** At the P18 review the full gated suite ran **88 passed, 1 failed** — the 1 failure is the pre-existing `documents_api` case below.
- **The `0003` migration is validated separately** (gated tests use `create_all`, not alembic, so they don't exercise the real migration): at the review, `alembic upgrade head` applied `0001→0002→0003` cleanly against a fresh Postgres (schema verified: nullable `project_id`, NOT-NULL `tenant_id` FK+indexed, `uq_projects_tenant_id`), a downgrade→re-upgrade round-trip succeeded, and S1 had validated the de-dupe path against a seeded-duplicate scenario.
- **CLI unit tests.** `cd cli && uv run pytest -q` → **39 passed**. `test_auth.py` was adjusted (not expanded): `"default"` project assertions, a pin that `init` mints via `POST /app/credentials` (org) and **never** the per-project endpoint, and the renamed reuse-gate test `test_init_remints_when_the_configured_project_changes`.
- **Extended `onboarding_smoke.py` (the committed post-deploy verifier).** Gained a **section-4 org-model journey** run in its own fresh tenant (keeping the tenant-B `documents_created == 1` equalities pristine): one org key → two get-or-create projects with per-named-project usage, revoke → 401, project-bound regression. Proven green against a disposable `postgres:17` tenant-mode stack **and live against prod** (exit 0). `scripts/` is not a plugin `shipped_dir` → no template mirror.
- **Pre-existing gated failure (NOT P18) — since RESOLVED at P24; kept here as history only.** `tests/test_documents_api.py::test_documents_list_detail_and_project_bridge` used to fail because the document-list projection carries a `format` key that the test's `_LIST_KEYS` set omits. This is a **P16-era** mismatch — the test was last touched in P12, and `format` entered the list projection in P16 (`server/main.py`), while the suite is Postgres-gated so default CI (no Postgres) never runs it. Confirmed by S1/S2 on clean trees and re-confirmed at the P18 review (no P18 commit touches that test or the projection). **It is a documents/content-plane concern outside P18's accounts scope; recommended as a small deferred job** (either add `format` to `_LIST_KEYS` or drop it from the list projection) — it does not block the P18 objective.

## P20 onboarding acceptance (curl installer + published skill)

P20's acceptance is the CLI + web unit suites, the extended skill-parity gate, and a **live prod E2E** of the installer + `init`/D16/`save`. The ship carries **no migration**, so `onboarding_smoke.py` is unchanged (no committed P20 verifier). All green at the P20 review.

- **CLI unit tests.** `cli/.venv/bin/python -m pytest cli/tests -q` → **40 passed** (the system `python3` here is 3.13 without pytest/httpx; the suite runs via the repo `cli/.venv` — 3.12, editable `knowledge_cli`). `test_auth.py` was adjusted (not expanded): the reuse-gate test became `test_init_project_change_reuses_the_org_key` (proves `init --project other` reuses — `minted == 1`, `api.project` re-recorded, the cross-project note fires); `test_init_new_key_mints_again` still proves `--new-key` re-mints.
- **Web unit suite + build.** `cd web && npm run typecheck && npm run lint && npm run test && npm run build` all green — **66 vitest tests** (was 61; +1 file `web/tests/copy-button.test.ts`: idle→copied, two failure paths, two byte-locks on the copy payloads), and `next build` static-generates `/` (`○ Static`), proving the build-time `fs` read of `public/SKILL.md`. **No vitest covers the marketing terminal content**, so the hero-copy guard is typecheck/lint, not a unit test.
- **The three-copy skill-parity gate.** `python3 scripts/skills_parity.py` PASS — the existing two copies (`plugin/` canonical vs `.agents/` body-only) plus the **new third copy** `web/public/SKILL.md`, held to a **stricter full-file** byte match (frontmatter included) against the canonical. CI runs it via the unchanged `plugin-ci.yml`.
- **Installer syntax.** `bash -n web/public/install.sh` clean (shellcheck not installed on this box).
- **Live prod E2E (executor-run, sanitized).** A clean-env `curl -fsSL https://knowledge.hi2vi.com/install.sh | bash` (fully isolated temp HOME/XDG/UV, `env -i` PATH hygiene, torn down) resolved the `git+` channel to the post-P20 tip and installed a CLI carrying S1's `web login:` line + D16 reuse; a throwaway-account `init` printed the web-login line + minted an org key, `init --project other` reused it (D16 live), and `save` returned a `…/documents/{id}` URL. Read-only re-probes at the review confirmed `/install.sh` + `/SKILL.md` 200 byte-identical + the landing surface. Residue: one throwaway account + one private doc (no delete API); operator env verified untouched. This is executor verification, **not** a committed verifier.
- **Depicted-vs-live nuance (not a defect).** On prod a brand-new org's `default` project is server-pre-created at signup, so init #1 shows `project: default (already existed)` rather than the hero's `(created)`; the hero copy stays honest for a genuinely new org.

## Web document-delete acceptance (P21)

P21's acceptance is the Postgres-gated pytest suite + the web unit/lint/typecheck/build set + a **live end-to-end exercise run at the review**. All green at the P21 review.

- **The gated suite got materially healthier — a fixture fix, not a test-count trick.** `tests/test_documents_api.py`'s shared `documents_client` fixture now sets **`KB_AUTH_RATE_LIMIT=0`**. `server/auth_api.py::_enforce_rate_limit` counts per `(IP, path)` in a **module-global** dict with a 20-per-15-min default — one window for the **entire pytest session**, which the suite had already exceeded (P19's `test_public_read.py` pushed it over), so later suites were 429ing during *fixture setup*. With the limiter disabled it early-returns **without counting**, freeing the budget for every suite that reuses this fixture (`test_graph_api`, `test_public_read`, `test_html_documents`). No pytest test anywhere asserts on throttling, and `tests/conftest.py` was not touched. **Full gated suite: 89 passed / 8 failed → 99 passed / 1 failed.** If you ever see a cluster of setup-time 429s in this suite again, this global window is the first thing to check.
- **Backend delete tests (terse, four additions).** `test_delete_document_removes_file_row_and_index` (204 → file unlinked from `tenants/<uuid>/`, subsequent `GET` 404, and an FTS search for the body term returns `total == 0`, proving the AFTER DELETE trigger fired); `test_delete_document_tenant_isolation` (tenant A deleting B's id → 404, B's doc still reads 200); `test_delete_document_is_unmetered` (`usage_events` count unchanged across a successful delete); plus one line in the existing `test_documents_require_auth` (`DELETE /app/documents/1` unauthenticated → 401). The `/api`-plane delete behavior is **not** duplicated — `tests/test_api_write.py` already covers it. Both edited files are mirrored into `plugin/templates/kb/` (parity gate).
- **Web suite.** From `web/`: `pnpm vitest run` → 10 files / **69 tests passed** (the new `web/tests/delete-document.test.ts` adds 1 — a node-env `fetch` stub asserting the `DELETE …/app/documents/42` request shape and the 204 → `undefined` resolve); `pnpm lint`, `pnpm typecheck`, `pnpm build` all clean, with `/documents` + `/documents/[id]` still dynamic. The suite deliberately covers **only the client seam** — the action's status→copy mapping, the two-step confirm, and the redirect are covered by the live exercise below, not by unit tests.
- **The live E2E, and how to reproduce it without a browser.** The untested pieces were exercised at the review against a real stack (disposable `postgres:17`, uvicorn on `:8766`, the Next **standalone** server — `next start` refuses an `output: standalone` build, so run `node .next/standalone/server.js` after copying `.next/static` into it). The trick that removes the need for a browser driver: the delete island's `<form>` is **fully progressive-enhancement capable**, so its rendered hidden inputs (`$ACTION_REF_n`, `$ACTION_n:0`, `$ACTION_n:1`, `$ACTION_KEY`) can be replayed with `curl -F` against the page URL to invoke the real server action. The session cookie is `Secure`, so curl will not store or resend it — capture the `Set-Cookie` value and pass it with `-H "Cookie: …"`; the BFF also requires an `Origin` header matching `Host` (else 403). Results: **detail delete → 303 `Location: /documents`** with the doc gone from file, DB, and FTS; **list delete → 200 with no `Location`**, the row absent from the revalidated list; **repeat delete → 200 carrying the `notFound` copy**; **cross-tenant delete → the same `notFound` copy**, the target surviving for its owner; **tampered non-integer id → the `invalidRequest` copy**; **unauthenticated action → 303 `Location: /login`**; and `usage_events` still **0** after three successful deletes (unmetered, live).
- **The `is_public=True` branch is no longer untested.** It needs `KB_OPERATOR_EMAIL` pointing at the caller (so their tenant resolves as tenant #1) and a `KB_ROOT` holding **both** `docs/<rel>` and `tenants/<uuid>/<rel>` for the same document — then the delete tells you which root it chose. At the review it unlinked **`docs/`** and left `tenants/<uuid>/` intact, confirming the UUID-typed `is_public` bridge (a stringified tenant id would have silently taken the wrong branch). Note the route still answers **204** in a non-git root: the helper swallows the commit failure. This branch stays out of pytest — it needs an operator email and a git tree — so re-run it by hand if the bridge is ever touched.
- **Pre-existing gated failure — RESOLVED as of P24, do not re-file it.** `tests/test_documents_api.py::test_documents_list_detail_and_project_bridge` (the `format`-key mismatch first recorded under *Accounts v2 acceptance (P18)*) was still failing at the P21 review's 100-test run. It **passes now**: the P24 review re-ran it in isolation and the full gated suite came back **115 passed / 0 failed**. It was fixed somewhere in P22/P23 rather than by a dedicated slice, which is exactly why a standing "known failure" note is worth re-verifying rather than copying forward — this one outlived its truth by two phases.
- **Repo-wide prettier drift is real and predates this phase.** `pnpm format:check` fails on **51 files at a clean HEAD**. P21 did not widen or narrow it — every line the phase wrote is prettier-clean, and the three touched files still flagged are flagged only on pre-existing lines. Making `format:check` a real gate means a separate repo-wide reformat; it is a candidate deferred job, not a phase finding.

## Publish-worker acceptance (P24)

P24 moved the git push and the Gemini embed **behind** the write response, which makes the thing under test a *side effect that happens after the assertion point*. All green at the P24 review: repo suite **83 passed / 32 skipped**, Postgres-gated suite **115 passed / 0 failed**, CLI suite **44 passed**, both parity gates PASS.

- **`publish.drain()` is this repo's way to test after-response work — use it instead of `sleep`.** The worker exposes `pending()` / `drain(timeout)` / `last_error()` / `reset_last_error()`; a test submits its write, calls `drain()`, and *then* asserts the side effect (the commit reached `origin/main`, the embedding row exists, `last_error()` is `None`). No polling, no sleeps, no flakes. Never call `drain()` from a request path — a queued push takes `WRITE_LOCK`, so draining while holding it deadlocks.
- **The ordering guarantee has its own test, and it must stay.** `test_response_does_not_wait_for_a_hanging_push` blocks `gitops.push` on a `threading.Event` and asserts the 201 comes back in under a second. This is the regression test for the *original bug*: if anyone ever moves publish work back in front of the response (or swaps the queue for something whose ordering depends on the middleware stack), this is the test that catches it. A companion case proves `KB_GIT_TIMEOUT_S` actually bounds a wedged git subprocess.
- **Response-shape assertions moved off `pushed`.** `tests/test_api_push.py` previously asserted `pushed:true` on a successful publish; post-P24 `pushed` is a constant `false`, so the suite asserts the **published head against the post-rebase local head** instead, plus `push_pending` presence. If a test ever needs "did it publish?", the answer is git state after `drain()`, never a response field.
- **What is still not covered by pytest.** The box's real push credential chain (SSH origin + deploy key) — that is the bring-up assertion in **operations**, deliberately manual. And the worker-side Gemini embed has no client timeout: a stalled embed would block the FIFO queue behind it, which no test simulates (recorded as a deferred job, availability of the off-box backup only).
- **A live spot-check worth repeating when the read projection changes.** The CLI's timeout recovery compares the *body* it sent against the document it reads back, which only works because `markdown` is in the `by-path` read projection. Verified against a real TestClient at the review — the projection is `created_at, date, format, id, markdown, project, rel_path, related, slug, source_repo, tags, tenant_id, title, updated_at, version`, and notably carries **no `url`** (that is synthesized only on write responses). Both clients correctly omit a URL on the recovered path; a `FakeApi`-only test would not have proven either fact.

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
- **The two-implementation config seam (P13)** — `cli/src/knowledge_cli/config.py:resolve()`
  and the `plugin/skills/explain/SKILL.md:31-78` heredoc are two independent implementations of
  the same `knowledge-kb` resolver that **cannot be merged** (each must work without the other).
  Drift is the standing risk; the only guard is `cli/tests/test_config.py` (which pins the
  documented behavior, validated verbatim against the real SKILL heredoc over a 20-scenario
  matrix). **Anyone editing either side must edit both** — and `plugin/` is untouched by decree,
  so the SKILL side moves only on an explicit operator decision.
- **The `/auth` throttle's single-worker coherence (P13)** — the per-IP limiter is in-process
  and lock-free (atomic only under one uvicorn worker). Scaling `api` workers gives each its own
  counter and silently breaks the throttle; no test can see it (it needs a multi-worker box).
  The `cli_smoke.py` throttle assertion also assumes a **fresh** window — a stale window makes a
  green run impossible, not a false green (the failure messages name the restart fix).
- **CLI re-install with `--force` ships a stale binary (P13)** — `uv tool install ./cli --force`
  reuses the cached `0.1.0` wheel, so a CLI change can silently test yesterday's code. Any live
  CLI run or `cli_smoke.py` invocation must use `--reinstall`; the smoke's binary resolver points
  at the installed path, so it inherits whatever was installed.
- **The third web `SKILL.md` parity copy (P20)** — `web/public/SKILL.md` must stay **byte-identical
  (full file, frontmatter included)** to the canonical `plugin/skills/explain/SKILL.md`; editing the
  canonical without re-copying (or forking the web copy) FAILs `scripts/skills_parity.py` in CI. The
  landing's Copy control fetches the *served* file, so a forked copy would be both a CI failure and a
  live-content divergence. The gate is CI-only (like the other parity gates), so a local edit that
  skips it ships drift.

## Open Questions

- None blocking. Behavioral search correctness is empirically verified by the smoke
  guard's index checks plus the operator's browser mission; visual acceptance stays
  with the operator on the dev server before each push.
