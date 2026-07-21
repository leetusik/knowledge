# P12.S6 — Knowledge graph in the web app (per-tenant)

## Context

Final middle slice of P12. Move the knowledge graph into the authenticated app as a **per-tenant**
view and flip the rail's "Graph" item live. Today the graph is a **build-time mkdocs asset** —
`scripts/graph_hook.py` emits `graph.json` from `docs/` frontmatter (tenant #1 only) and
`docs/javascripts/graph.js` (a ~1130-line zero-dependency `<canvas>` force-sim renderer) draws it on
the public site. S6 has **two parts**: (A) a new per-tenant **graph-data route** built from the content
store, and (B) **porting the canvas renderer** into a React client component. This resolves the
phase's open question **(b)**. It is a substantial but bounded **port of proven code** →
**`slice-executor-high`**. Kept in P12 (the phase-size escape hatch is unneeded — S1–S5 all landed
clean); the public mkdocs graph stays as tenant #1's public surface.

## Resolved decision — open question (b): per-tenant `/app/graph`

Add a new session-scoped, tenant-scoped, **UNMETERED** `GET /app/graph` that reuses the S5 content
store: the `graph_hook.build_graph` **inversion runs unchanged over `db.list_documents(tenant_id=str(
ctx.tenant.id))`** (verified: those doc dicts carry `rel_path` + `related` + `tags` + `title` +
`project` + `date` — every inversion input). **Scope = per-tenant** (the whole tenant's docs; the rail
"Graph" is top-level). Per-project (`?project=<uuid>`) is deferred — the endpoint *may* accept it (via
the S5 `_resolve_project_name` bridge) but the UI ships per-tenant, because narrowing to one project
would reclassify any cross-project `related:` target as a `broken`/`missing` ghost (a latent wrinkle;
**no cross-project links exist in the corpus today**). Unmetered by construction (never set
`request.state.usage`) — the `/app/dashboard`/`/app/documents` precedent.

## Part A — Backend: `GET /app/graph`

Add to `server/documents_api.py` (reuse its `require_user` guard, async `get_conn`, and the
tenant-scoped store) or a sibling `server/graph_api.py` mounted in `main.py`. Fetch **all** the
tenant's docs (`db.count_documents` then `db.list_documents(tenant_id=str(ctx.tenant.id),
limit=<count>)` — the route must not inherit the `/app/documents` 200 cap; add a **sane hard cap**,
e.g. ≤2000 nodes, and note truncation if exceeded). Then **port `graph_hook.build_graph`'s algorithm**
to run over the db doc dicts (a server-side twin — keep `scripts/graph_hook.py` untouched and
server-free for the mkdocs build; modest duplication is cleaner than coupling):
- **Nodes** keyed on **`rel_path`** (the `related`-target keyspace): `doc` nodes `{id: rel_path, type:
  "doc", title, url, date, project, tags, degree}`; `tag` hub nodes `{id:"tag:<t>", type:"tag", title,
  degree}`; `missing` ghost nodes for unresolved `related` targets. `project` from the DB `project`
  column. **`url` = `/documents/{db_id}`** (the S5 read route) — the one substitution vs. the mkdocs
  hook (whose `url` was a build-time `File.url` with no content-store equivalent); this is what makes
  node-click navigate in the app.
- **Edges**: `related` (directed, per explicit `related:` link, deduped on the ordered tuple, `broken`
  flag when the target isn't a known doc id) + `tag` (doc→`tag:<t>`). `degree` = incident-edge count.
- **`projects`**: `[{name, docs}]` sorted `(-docs, name)` (**order is load-bearing** — the renderer
  assigns project ink by index `i % 3`).
- Emit the **identical `{version:1, projects, nodes, edges}` shape** as `graph.json` so the ported
  renderer consumes it unchanged.

**Terse test** (extend the S5 Postgres harness): seed docs with `related`/`tags` → assert the graph
shape (doc/tag/missing nodes, related/tag edges, degree, the `url`=`/documents/{id}` rewrite, the
`projects` order); tenant-isolation (another tenant's docs never appear); **unmetered** (no counter
moves). Minimal cases; skips without a DSN.

## Part B — Frontend: port the canvas renderer

**Route `web/src/app/(app)/graph/page.tsx`** (server component): `requireIdentity()`, `getGraph(token)`
→ pass the graph data as a **prop** to a `"use client"` `<GraphCanvas data={…} />` (no client-side
fetch — the data rides the RSC payload; simpler than a BFF proxy, and `getRaw` remains the fallback if
the payload proves too big). Wrap in the console page frame (`.kb-app-main` — but the graph is
full-height, so a sized `position:relative` container, **not** the mkdocs `100vw` breakout).

**`GraphCanvas` client component** — a **faithful port of `docs/javascripts/graph.js`** (the app's
first `"use client"` canvas + rAF component). **Keep the proven core intact** — the deterministic
force sim (FNV-hash seeding, alpha cooling, the tick integrator, collision relax), the canvas draw
grammar (DPR scaling, edges/halo/nodes/rings/labels, the quiet-label ladder), and the full interaction
model (pointer drag/pan/hover-neighbor-highlight, wheel zoom `{passive:false}`, Escape, the
legend project-lens + tag toggle, zoom buttons, node-tap → info panel). **Do NOT rewrite the sim or
renderer.** Adapt only the shell:
- **Data**: receive `data` as a prop; run the `start(data)` equivalent in a `useEffect` (drop the
  `fetch`/loading path — the empty state still applies when `nodes` is empty).
- **Node navigation**: the info-panel "Read" link uses `node.url` directly (now `/documents/{id}`) —
  rewrite `resolveUrl` (was `'../' + url`) to return the absolute app route; a Next `<Link>`/anchor.
  Ghost/`missing` nodes keep the "no document yet" badge, no link.
- **Lifecycle cleanup (the critical React-specific work)** — the `useEffect` cleanup MUST:
  `cancelAnimationFrame` the persistent (self-requeuing) rAF loop + the one-shot `scheduleDraw`;
  `.disconnect()` the `ResizeObserver` (on the container) and the scheme `MutationObserver`;
  `removeEventListener` the `resize`/`pagehide` fallbacks; `clearTimeout` the 250 ms persist debounce;
  guard the `document.fonts.ready` draw against post-unmount. Keep the tab-scoped `sessionStorage`
  persistence with its try/catch (optional but cheap).
- **Container/canvas**: refs; keep **`touch-action: none`** on the canvas (required for pointer
  drag/zoom). The overlay shells (`.kb-graph-legend`/`-zoom`/`-tooltip`/`-panel`/`-empty`) render in
  JSX; the ported engine fills legend/zoom/panel/tooltip imperatively as graph.js does (lowest-risk
  faithful port — the executor may JSX-ify the panel if clean, but working behavior is the priority).

**Re-theming = a new `--kb-graph-*` token layer, JS unchanged.** graph.js reads **every** color +
geometry token **live via `getComputedStyle` of `--kb-graph-*`** (never a hardcoded hex, never
`--md-*`). The web app has **no `--kb-graph-*` layer yet** → add one (a co-located `graph-tokens.css`
or into `kb-tokens.css`) **mapping the docs' `extra.css` §10a onto the base `--kb-*` palette, both
schemes**: `--kb-graph-canvas`=`--kb-surface-sunken` (dark keeps the bespoke deeper `#16130f`),
`--kb-graph-project-1`=`--kb-accent` (teal) / `-2` = the bronze `--kb-status-idle` / `-3` = graph-only
plum, `--kb-graph-node-tag`/`-edge-related`=`--kb-secondary`, `--kb-graph-label`=`--kb-ink`,
`--kb-graph-focus`/`-edge-active`=`--kb-accent-strong`/`--kb-accent`, `--kb-graph-halo`=accent-rgba,
overlay cards=`--kb-surface`/`--kb-border`/`--kb-radius`. Fix the one dangling
`--md-default-fg-color--lightest` ref (extra.css:913) → `--kb-border`.

**Overlay CSS** — port `extra.css` §10b/c into a co-located `graph.css`: the sized `.kb-graph`
container (drop the mkdocs `100vw` full-bleed + the `:has()` sidebar-hiding), `.kb-graph__canvas`
(`touch-action:none`, grab cursor), and the absolutely-positioned legend / zoom / panel / tooltip /
empty cards on `--kb-*` tokens.

**Wiring:** `getGraph(token)` in `lib/knowledge/app.ts` + `KbGraph`/`KbGraphNode`/`KbGraphEdge` in
`types.ts`; `content/graph.ts` copy (legend labels, panel copy, empty states); drop `soon` from the
Graph item in `content/app.ts` (rail item live; `rail-nav.tsx` unchanged — `/graph` + any
`/graph/*` light it).

## Design fidelity — RESPECT THE DESIGN

**No graph design specimen exists** (only dashboard + login). The graph's *look is already designed* —
by the existing, shipped renderer + the `--kb-graph-*` tokens (which map to the KB palette). Port it
**faithfully**: keep the renderer's visual grammar (project inks, tag hubs, ghost dashes, halos,
quiet labels, the settle→mingle motion) exactly; re-theme only through the token layer. Compose the
overlay UI (legend/zoom/panel/tooltip/empty) from the `.kb-*` tokens. Do **not** redesign the graph or
simplify the interaction model. The token-layer composition is flagged for the review (a future design
pass could formalize a graph spec). Reference: `docs/javascripts/graph.js`, `docs/stylesheets/extra.css`
§10, `scripts/graph_hook.py`.

## Verification (executor runs before returning `done`)

- **Backend:** the terse `/app/graph` test (graph shape/inversion · tenant-isolation · **unmetered** ·
  the `url`=`/documents/{id}` rewrite) + the existing suite green.
- **Frontend:** `pnpm --dir web typecheck` · `lint` · `test` (add a terse test only where a pure
  helper exists — e.g. a data-shaping/token-mapping function; the canvas/rAF core isn't unit-testable)
  · `build` (`/graph` compiles; the client component builds). A lightweight **render smoke** if
  feasible (the sim is deterministic — no `Math.random`).
- **E2E (interactive graph):** the real drag/zoom/hover/click-through-to-a-doc needs a running backend
  + seeded login + a browser — leave it to the phase review (same no-host-Postgres limit as S3–S5),
  and say so in `result.md`. The orchestrator runs `python3 scripts/workflow.py validate` after the
  `done` verdict.

## Doc impact (executor appends to `phase.md`; the REVIEW consolidates)
- `api.md` — the new unmetered, session-scoped, tenant-scoped `GET /app/graph` (the content-store
  graph-data inversion; the `url`=`/documents/{id}` node link).
- `architecture.md` — the knowledge graph moves into the app as a **per-tenant** view (content-store
  derived, not the build-time mkdocs asset — which stays tenant #1's public surface); web-UI graph
  reads are unmetered `/app`.
- `frontend.md` — the `GraphCanvas` client component (the ported zero-dep canvas force-sim), the
  `--kb-graph-*` token layer + overlay CSS, and `lib/knowledge/app.ts` `getGraph`.
- `experience.md` — the in-app graph UX (drag/zoom/hover-highlight/legend-lens/node→document) and the
  Graph rail item going live.

## Out of scope (deferred)
- **Per-project** graph UI (the endpoint may accept `?project`, but the shipped UI is per-tenant).
- The build-time **mkdocs graph** stays (tenant #1's public site) — S6 does not remove it.
- Graph editing / node CRUD (read-only visualization).

## Critical files
- **Backend:** the `GET /app/graph` route + inversion port in `server/documents_api.py` (or a new
  `server/graph_api.py` mounted in `server/main.py`); reuses `server/db.py`
  (`list_documents`/`count_documents`), `server/documents_api.py` helpers (`get_conn`,
  `_resolve_project_name`); a terse test under `tests/`. Algorithm reference (do not import):
  `scripts/graph_hook.py`.
- **Frontend (new):** `web/src/app/(app)/graph/page.tsx` + a `graph-canvas.tsx` (`"use client"` port)
  + co-located `graph.css` (overlays) + the `--kb-graph-*` token layer; `web/src/content/graph.ts`.
- **Frontend (edit):** `web/src/lib/knowledge/app.ts` (+ `getGraph`); `web/src/lib/knowledge/types.ts`
  (+ graph shapes); `web/src/content/{index.ts,app.ts}` (barrel + drop Graph `soon`); the token file
  (`web/src/app/kb-tokens.css` or a new import).
- **Port sources (read-only):** `docs/javascripts/graph.js` (the 1130-line renderer),
  `docs/stylesheets/extra.css` §10 (tokens + overlays), `docs/graph.md` (mount markup),
  `scripts/graph_hook.py` (the inversion algorithm).
