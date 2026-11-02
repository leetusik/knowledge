# P37-1p.S5 result

- status: needs_operator
- route: mid
- model: opus
- effort: medium
- summary: Removed the landing's graph band (FeatureGraph, the motif component and its data, FEATURE_GRAPH, GRAPH_MOTIF exports, MKT_SECTION_IDS.graph, the .mkt-graph-* CSS block with its --mkt-ink-* tokens) and cut every graph clause from the landing copy and metadata; the README hero now points at the library /@leetusik and the graph screenshot is deleted. Every check except the real-browser leg passed; that leg did not run because no deviceId for the "sugang" profile arrived.
- files_changed: web/src/app/(marketing)/page.tsx; web/src/app/(marketing)/layout.tsx; web/src/components/marketing/feature-graph.tsx (deleted); web/src/components/marketing/graph-motif.tsx (deleted); web/src/components/marketing/primitives.tsx; web/src/components/marketing/marketing.css; web/src/content/marketing/content.ts; web/src/content/marketing/graph-motif.ts (deleted); web/src/content/marketing/links.ts; web/src/content/marketing/index.ts; README.md; .github/knowledge-graph.png (deleted)
- validation:
  - `pnpm exec eslint` on the six edited TS/TSX files: pass
  - `pnpm exec vitest run tests/copy-button.test.ts` (the one test importing `@/content/marketing`): pass, 5/5
  - `pnpm --dir web typecheck`: pass, no errors anywhere
  - `grep -n -i graph` over the set: only `openGraph:` (the Next metadata key), the page.tsx comment noting the band's removal, and the README's local-mkdocs graph bullet plus the legacy `/graph/{uuid}` redirect mention: pass
  - `python3 scripts/workflow.py validate`: pass (only the standing stale-docs and oversized-section warnings)
  - deferred: whole-tree: `pnpm --dir web build`, the full `pnpm --dir web test`, the production-build browser check
  - real browser (Claude in Chrome): NOT RUN, no deviceId
- deviations: none in the code. The browser leg was not run (see operator_need).
- operator_need: browser leg not run: the sugang profile's deviceId
- notebook:
  - Now: S5 landed. The landing goes hero → what-it-is → how-it-works → save → connect → agents → skill (sunken) → pricing (paper) → final CTA, with no graph band, motif, anchor or copy clause. The README hero links /@leetusik ("Explore my library") and .github/knowledge-graph.png is gone. Still open: the landing's real-browser check at the four viewports (needs the sugang profile's deviceId), then the deferred build and production-build check.
  - Notes for later slices: **(from P37-1p.S5, for P37-1p.S3):** no graph-motif CSS or tokens live in `globals.css`. The `--mkt-ink-*` / `--mkt-graph-*` tokens were defined and used only inside marketing.css's motif block and the deleted motif components, and they are gone. The `--kb-ink-teal/bronze/plum(-dark)` data-viz inks in globals.css were left alone; the landing no longer reads them.
  - Doc impact: product (landing) and README: the landing drops the knowledge-graph band, its motif and every graph clause in its copy, pricing ticks and metadata; the README hero points at the public library `/@leetusik` instead of `/@leetusik/graph`, and its graph screenshot is deleted.
  - Operator Questions: none (the browser check that could raise the bare-page question has not run).

## Detail

### What changed
- **Band and motif:** `FeatureGraph` import and element removed from `page.tsx`. Deleted `feature-graph.tsx`, `graph-motif.tsx` and `content/marketing/graph-motif.ts`. Removed `FEATURE_GRAPH` from `content.ts` and the barrel, the `GRAPH_MOTIF`/`GraphMotif`/`Motif*` re-exports, and `MKT_SECTION_IDS.graph`. links.ts's comment now says "between connect and pricing". Removed the whole `.mkt-graph-*` block (plate, slate override, canvas, panel, chip, legend, ring, switch) from `marketing.css`, plus the header comment's "graph plate / panel / legend" clause.
- **Token grep:** before deleting, I grepped `web/src` for `--mkt-ink-*` and `--mkt-graph-*`. The only users were `marketing.css`'s motif block, `graph-motif.tsx` and `feature-graph.tsx`, so every one of those tokens went. `globals.css` was not touched.
- **No dangling anchors:** nothing in `web/src` links `#graph` or reads `MKT_SECTION_IDS.graph`. `content/index.ts` (S2's) does not re-export the marketing module, so the boundary held.
- **Copy cuts (clause only, no new copy):**
  - hero lede: "saved straight from the terminal and read like a book."
  - hero free line: "The web app, hybrid search & the Claude Code connection — all free."
  - "What it is" web card: "a `docs/`-style tree of explainers, and hybrid keyword + semantic search."
  - pricing lede: "The web app, search, and the whole Claude Code connection are free…"
  - pricing ticks: "The web reading room — tree & search"; the "The interactive knowledge graph" item went whole.
  - layout metadata: description "…saved from the terminal, read like a book."; OG description "Free web app, hybrid search, and the Claude Code connection."
- **Comments:** the `page.tsx` band-order comment drops the graph band and the motif client island and notes the removal. The `primitives.tsx` comment says "header/copy islands".
- **README (OQ3):**
  - The hero heading now reads "Explore my library → knowledge.hi2vi.com/@leetusik", linking the library. The italic line was reworded for a library: "every explainer in this library, in one place … open any one to read it."
  - The screenshot line was deleted.
  - "knowledge map … above" now reads "[library](…/@leetusik) above".
  - Body: cut "an in-app graph" (two places) and "`/@{org}/graph`". The "Knowledge map" bullet keeps only the local MkDocs graph sentence (`scripts/graph_hook.py`). "`/graph/{uuid}` links keep resolving" was kept, since it now holds by redirect.
- **Tone check (from the source):** the band tones run dark (hero), paper, sunken, paper, dark, dark, sunken (skill), paper (pricing), dark (CTA), deep (footer), so they still alternate across the cut (sunken → paper). This was confirmed from the `Band tone=` props only. No browser check has been made.

### Browser leg
Not run. I never called a browser tool: the orchestrator sent no deviceId, and `## Operator Runtime` records none. The dev server at `http://127.0.0.1:3030/` answers 200 (`curl`). Once the deviceId arrives, the leg is still owed: `list_connected_browsers`, then `select_browser` with that id, then my own tab at 390×844, 820×1180, 1024×768 and 1440×900. At each, check for no graph band, no broken anchor, alternating tones and no overlap or hole, and take a screenshot.
