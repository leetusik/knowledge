# P12.S6 — Knowledge graph in the web app (per-tenant) · result

Shipped both halves of the plan: a new **unmetered, session-scoped, tenant-scoped
`GET /app/graph`** backend route (a server-side twin of `scripts/graph_hook.py`'s
inversion over the content store) and the **`/graph` frontend** — a faithful port of
the ~1130-line `docs/javascripts/graph.js` canvas force-sim renderer into a
`"use client"` React component, a new `--kb-graph-*` token layer, the overlay CSS,
the `getGraph` client seam, and the Graph rail item gone live. `slice-executor-high`.

## Part A — Backend (`server/graph_api.py`, mounted in `main.py`)

- **New module `server/graph_api.py`** (sibling of `documents_api.py`; router mounted
  after `documents_api` in `server/main.py`). Chose a sibling over folding into
  `documents_api.py` to keep the documents surface single-purpose; it **reuses the S5
  helpers** by importing them (`get_conn` — the async generator connection dependency,
  and `_resolve_project_name` — the project UUID→name bridge), exactly as the S5 notes
  flagged reusable.
- **`GET /app/graph`** — `require_user`-guarded, `tenant_id`-scoped, **UNMETERED**
  (never sets `request.state.usage`). Fetches ALL the tenant's docs
  (`count_documents` then a single `list_documents(limit=count)` — NOT the
  `/app/documents` 200 cap — bounded by `MAX_DOC_NODES = 2000`) and inverts them.
- **`build_tenant_graph(docs)`** — a faithful server-side twin of
  `graph_hook.build_graph`: same doc/tag/missing nodes, related/tag edges (deduped,
  self-refs dropped, `broken` on dead related targets), `degree` = incident-edge count,
  and the load-bearing `projects` order `(-docs, name)`. Nodes keyed on **`rel_path`**,
  `project` from the DB column. **`scripts/graph_hook.py` is untouched** (it must stay
  server-free for the mkdocs build). The **one substitution vs. the hook**: each doc
  node's **`url` = `/documents/{db_id}`** (the S5 read route) — what makes a node click
  navigate in the app.
- Emits the **identical `{version, projects, nodes, edges}` contract** the ported
  renderer consumes unchanged, plus one **superset key `truncated`** (a bool; the
  renderer ignores unknown keys). See Deviation 1.
- The route **accepts** an optional `project` UUID (bridged via `_resolve_project_name`,
  404 on missing/cross-tenant) for symmetry with `/app/documents`, but the shipped UI
  sends none — per-tenant scope, as decided.

### Backend verification

- **`tests/test_graph_api.py`** (new, terse — reuses the S5 Postgres harness by
  importing `documents_client` + `_signup`/`_project` from `test_documents_api.py`;
  skips cleanly without a DSN). Four cases: graph shape/inversion + the
  `url=/documents/{id}` rewrite + the load-bearing `(-docs, name)` project order
  (alpha=2 · beta/gamma=1 tie-broken by name) + degree + the `missing`/broken-edge
  ghost; tenant-isolation (another tenant's docs/tags never appear); **unmetered**
  (`usage_events` count unchanged); requires-auth (401).
- **Ran green against a reachable Postgres** (`postgresql://vocky:vocky@127.0.0.1:55432/postgres`
  — the only reachable one; knowledge still has no host-mapped Postgres, same limit as
  S3–S5). **Full suite with the DSN: 77 passed, 0 skipped** (the 73 from S5 + the 4 new
  graph cases). Default run (no DSN): **65 passed, 12 skipped** (the Postgres-gated
  suites, graph included, skip). Pure `build_tenant_graph` also spot-checked directly.

## Part B — Frontend

- **`web/src/app/(app)/graph/page.tsx`** — server component: `requireIdentity()` →
  `getGraph(token)` → passes the data as a **prop** to `<GraphCanvas data={…} />`
  (rides the RSC payload; no browser fetch, no BFF proxy). Console page header
  (eyebrow + Fraunces title + sub) above the map. Renders into `.kb-app-main`.
- **`web/src/app/(app)/graph/graph-canvas.tsx`** — the **faithful port** of
  `docs/javascripts/graph.js`. The proven CORE is intact and unchanged in behavior:
  the deterministic force sim (FNV-hash seeding, alpha cooling, tick integrator,
  collision relax), the draw grammar (DPR scaling, edges/halo/nodes/rings/labels, the
  quiet-label ladder), and the full interaction model (pointer drag/pan/hover-
  neighbor-highlight, wheel zoom `{passive:false}`, Escape, the legend project-lens +
  tag toggle, zoom buttons, node-tap → info panel, the tab-scoped sessionStorage
  persistence). Every colour/geometry token is still read **live via
  `getComputedStyle` of `--kb-graph-*`**. **Shell adaptations only:**
  - Receives `data` as a prop; runs `start(data)` in a `useEffect` (the `fetch`/
    loading path dropped; the empty state still applies when there are no doc nodes).
  - **Node navigation:** `resolveUrl` rewritten to return `node.url` directly (now the
    absolute `/documents/{id}` route). Tag pills, which the docs hook pointed at a
    `tags/` page that has no app equivalent, now link to `/documents?tag=<t>` (the S5
    tag filter — a working, faithful adaptation). Ghost/`missing` nodes keep the
    no-link "no document yet · 문서 없음" badge. The panel "Read the explainer →"
    wording became **"Read the document →"** (these are the tenant's documents).
  - **Lifecycle cleanup (the critical React work):** the `useEffect` cleanup
    `cancelAnimationFrame`s the persistent self-requeuing rAF loop + the one-shot
    `scheduleDraw`; `.disconnect()`s the `ResizeObserver` + the scheme
    `MutationObserver`; `removeEventListener`s the `resize`/`pagehide` fallbacks +
    the host `keydown`; `clearTimeout`s the 250 ms persist debounce; and a `disposed`
    flag guards the `document.fonts.ready` draw, the rAF loop, and the one-shot draw
    against post-unmount work (the original IIFE never tore down; StrictMode's
    dev double-mount is handled by the full teardown).
  - Overlay shells (`legend`/`zoom`/`tooltip`/`panel`/`empty`) render in JSX; the
    engine fills legend/zoom/panel/tooltip **imperatively** as graph.js does (lowest-
    risk faithful port). `touch-action: none` kept on the canvas (in `graph.css`).
- **`--kb-graph-*` token layer** — `web/src/app/(app)/graph/graph-tokens.css` (co-
  located, imported by the client component). Maps `extra.css` §10a onto the base
  `--kb-*` palette for **both schemes**. The mapping is **near-exact by construction**:
  §10a's values were themselves drawn from the KB palette, so most graph tokens resolve
  to a base token **byte-for-byte** (`project-1`=`--kb-accent` teal; `-2`=`--kb-status-idle`
  bronze; `label`=`--kb-ink`; `focus`=`--kb-accent-strong`; `canvas`=`--kb-surface-sunken`
  light). Only the handful of **graph-only inks** with no base token stay literals: the
  third project ink (plum `#764f6c`/`#c99bc0`), the ghost/tag-edge neutrals, the dark
  `edge-related`, the accent-rgba halo, the bespoke dark plate `#16130f`, and
  `--kb-graph-dim`.
- **Overlay CSS** — `web/src/app/(app)/graph/graph.css`: ported `extra.css` §10b/c onto
  a **sized `position:relative` container** (`height: calc(100dvh - var(--kb-app-topbar-h)
  - 13rem); min-height: 30rem`), dropping the mkdocs `100vw` full-bleed + the `.md-*`
  `:has()` sidebar-hiding. The dangling **`--md-default-fg-color--lightest`** ref
  (extra.css:913, the `.kb-tag` border) is **fixed → `--kb-border`**.
- **Client seam / types / copy:** `getGraph(token)` added to `lib/knowledge/app.ts`;
  `KbGraph`/`KbGraphNode`/`KbGraphEdge`/`KbGraphProject` added to `types.ts`;
  `content/graph.ts` (page frame + empty-state copy) + barrel export in `content/index.ts`.
- **Rail:** dropped `soon` from the Graph item in `content/app.ts` (`rail-nav.tsx`
  unchanged — `/graph` lights via `startsWith`). **Graph is now LIVE in the rail.**

### Frontend verification (all green)

- `pnpm --dir web typecheck` ✓ · `lint` ✓ (0 warnings) · `test` ✓ (**54 passed**;
  S2/S3/S4/S5 unchanged — no new frontend unit test, see below) · `build` ✓ (**`/graph`
  compiles as `ƒ` Dynamic**; the client component builds).
- **No new frontend unit test:** the graph frontend has no isolated pure helper (the
  inversion is backend-tested; the token mapping is CSS; the canvas/rAF engine is not
  unit-testable). Per the plan ("add a terse test only where a pure helper exists").
- **Render smoke not stood up:** vitest runs in the **node environment** (no jsdom, no
  canvas 2D context); a deterministic render smoke would need a jsdom + canvas-polyfill
  fixture — exactly the scaffolding sprawl the repo's test hard-rule warns against. The
  sim IS deterministic (no `Math.random`), so a render smoke would be reproducible if a
  DOM harness is later warranted.

## Left for the phase review (interactive E2E)

The real interactive graph — settle→mingle motion, pointer drag/pan, wheel/pinch zoom,
hover-neighbor-highlight + tooltip, the legend project-lens + tag toggle, node-tap →
info panel, and **click-through-to-a-document** (`/documents/{id}`) — needs a running
backend + seeded login + a browser (same no-host-Postgres limit as S3–S5). Left to the
phase review to exercise live. Points to verify interactively:
- Node click opens the panel and "Read the document →" navigates to the S5 read route;
  a tag pill navigates to `/documents?tag=<t>`; a ghost node shows the no-link badge.
- Both schemes render on-token (the app ships light `default` only today; the dark
  `slate` graph tokens are wired but only exercised if a scheme toggle lands).
- Unmount cleanup: navigating away from `/graph` and back leaves no leaked rAF loop /
  observer (StrictMode dev double-mount stresses this).

## Deviations from plan.md

1. **`truncated` superset key.** The plan says emit the "identical `{version, projects,
   nodes, edges}` shape" and "note truncation if exceeded". I added a `truncated` bool
   to the response (a harmless superset — the renderer only reads `projects`/`nodes`/
   `edges`) as the natural way to surface the node-cap; `KbGraph.truncated?` is optional
   in the types. No consumer relies on it yet.
2. **Tag-pill href + "explainer"→"document" wording.** The docs renderer linked panel
   tag pills to a `tags/` page and labelled the read link "Read the explainer →". The
   app has no tags route and these are documents, so tag pills now link to the working
   S5 `/documents?tag=<t>` filter and the read label reads "Read the document →". A
   faithful shell adaptation, not a redesign of the interaction.

Otherwise implemented as planned. No source changes to `scripts/graph_hook.py` or the
mkdocs graph (tenant #1's public surface stays).

## Design fidelity — flagged for REVIEW

**No graph design specimen exists** in the KB handback (only dashboard + login). The
graph's look is already designed by the shipped renderer + the `--kb-graph-*` tokens;
this slice ports it faithfully and re-themes only through the token layer (which maps
onto the KB palette, near-exact to §10a by construction). The interaction model and
visual grammar are unchanged. **The `--kb-graph-*` token-layer composition is flagged
for the review** — a future design pass could formalize a graph spec (project inks,
ghost dashes, halos, the quiet-label ladder), the same way S5 flagged `.kb-prose`.
