# P37-1p.S5 result

- status: done
- route: mid
- model: opus
- effort: medium
- summary: Removed the landing's graph band (FeatureGraph, the motif component and its data, FEATURE_GRAPH, GRAPH_MOTIF exports, MKT_SECTION_IDS.graph, the .mkt-graph-* CSS block with its --mkt-ink-* tokens) and cut every graph clause from the landing copy and metadata; the README hero now points at the library /@leetusik and the graph screenshot is deleted. Every check passed, including the real-browser check at all four viewports (Claude in Chrome, the "sugang" profile).
- files_changed: web/src/app/(marketing)/page.tsx; web/src/app/(marketing)/layout.tsx; web/src/components/marketing/feature-graph.tsx (deleted); web/src/components/marketing/graph-motif.tsx (deleted); web/src/components/marketing/primitives.tsx; web/src/components/marketing/marketing.css; web/src/content/marketing/content.ts; web/src/content/marketing/graph-motif.ts (deleted); web/src/content/marketing/links.ts; web/src/content/marketing/index.ts; README.md; .github/knowledge-graph.png (deleted)
- validation:
  - `pnpm exec eslint` on the six edited TS/TSX files: pass
  - `pnpm exec vitest run tests/copy-button.test.ts` (the one test importing `@/content/marketing`): pass, 5/5
  - `pnpm --dir web typecheck`: pass, no errors anywhere
  - `grep -n -i graph` over the set: only `openGraph:` (the Next metadata key), the page.tsx comment noting the band's removal, and the README's local-mkdocs graph bullet plus the legacy `/graph/{uuid}` redirect mention: pass
  - `python3 scripts/workflow.py validate`: pass (only the standing stale-docs and oversized-section warnings)
  - deferred: whole-tree: `pnpm --dir web build`, the full `pnpm --dir web test`, the production-build browser check
  - real browser (Claude in Chrome, profile deviceId c14e5b18-f250-45f1-b92e-4a08a31197b5, my own tab only): pass at 390×844, 820×1180, 1024×768 and 1440×900. At each: no graph band, element or word, 0 broken `#` anchors, no horizontal page overflow, no gap or overlap between bands, and the tones alternate (skill sunken → pricing paper). One existing issue outside the set (see Browser leg).
- deviations: none in the code. The window ignored `resize_window` (it stayed 1728×963 CSS, probably maximized), and `:3030` refuses framing. So the viewports were exact CSS-viewport iframes in the manifest's documented harness: a throwaway same-origin proxy on :3097 that strips `X-Frame-Options`/CSP. I stopped it afterwards; :3030 was never restarted.
- notebook:
  - Now: S5 landed. The landing goes hero → what-it-is → how-it-works → save → connect → agents → skill (sunken) → pricing (paper) → final CTA, with no graph band, motif, anchor or copy clause. The README hero links /@leetusik ("Explore my library") and .github/knowledge-graph.png is gone. Browser check passed at the four viewports. Still open: the deferred build and the production-build check, and one existing hero overflow at 390 (see the note for REVIEW).
  - Notes for later slices: **(from P37-1p.S5, for P37-1p.S3):** no graph-motif CSS or tokens live in `globals.css`. The `--mkt-ink-*` / `--mkt-graph-*` tokens were defined and used only inside marketing.css's motif block and the deleted motif components, and they are gone. The `--kb-ink-teal/bronze/plum(-dark)` data-viz inks in globals.css were left alone; the landing no longer reads them.
  - Doc impact: product (landing) and README: the landing drops the knowledge-graph band, its motif and every graph clause in its copy, pricing ticks and metadata; the README hero points at the public library `/@leetusik` instead of `/@leetusik/graph`, and its graph screenshot is deleted.
  - Notes for later slices (2): **(from P37-1p.S5, for P37-1p.REVIEW):** an existing issue outside S5's set: at a 390px CSS viewport the hero `h1` ("conversation." at 68px needs 404px) overflows the 342px content column, and the hero band's overflow-hidden clips the h1, lede and CTAs at the right edge. hero.tsx and the headline are untouched by P37-1p. List it as an observation or deferred-job candidate, not a finding.
  - Operator Questions: none. The page does not look bare: the skill → pricing junction is clean, and the two pricing cards now carry 4 ticks each.

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
**Instrument:** Claude in Chrome. I called `list_connected_browsers`, then `select_browser` on exactly `c14e5b18-f250-45f1-b92e-4a08a31197b5` (listed as "Browser 1"), before any other browser tool. I drove only my own tab, from `tabs_create_mcp`, and closed it at the end. I never touched S2's tabs.

**Viewport method:** `resize_window` reported success but the window stayed 1728×963 CSS px (probably maximized). `:3030` sends `X-Frame-Options: DENY` and `frame-ancestors 'none'`. So I used `## Operator Runtime`'s documented narrow-viewport harness: a throwaway same-origin Python proxy on `127.0.0.1:3097`. It forwarded to `:3030` with the headers stripped and the Cookie header dropped, and served `/__vp?w=&h=` as an iframe of exactly that size. `innerWidth`/`innerHeight` inside the frame read 390×844, 820×1180, 1024×768 and 1440×900. Inside the harness, React does not hydrate under `next dev`, as the manifest says, so the header renders transparent there (the scroll-state island). The directly loaded, hydrated tab drew it dark. That difference is a harness artifact. The proxy is stopped (:3097 → 000), and `:3030` still answers 200.

**Per viewport (measured in the frame's DOM, plus a screenshot of the skill → pricing junction):**
- Band order and tones were the same at all four: top dark, what-it-is paper, how-it-works sunken, save paper, connect dark, agents dark, skill sunken, pricing paper, get-started dark.
- 0 elements matching `[class*=graph]`, `#graph` or `canvas`; no whole word "graph" in the page text. The only "graph" substrings are "paragraph" in the skill pane.
- 0 broken `#` anchors.
- No band gap or overlap beyond ±1px rounding.
- 820, 1024, 1440: no element past the right edge.
- 390: page scrollWidth is 390, but the hero overflows inside its band. Its grid column takes the `h1`'s 404px min-content against 342px available, so the hero h1, lede and CTA row are clipped at the right edge. The cause is the existing headline font size at 68px versus the word "conversation.". S5 did not touch hero.tsx or the headline, so I left it and noted it for the review.
- The page does not look bare. Skill (sunken) runs straight into pricing (paper) with the hairline. The pricing cards are balanced at 4 ticks each, Free and Agent Retrieval API.
- The earlier direct load at the window's own 1728×963 (hydrated) also showed no graph band, 0 broken anchors and no x-overflow.

Screenshots were taken at each viewport (in-session IDs, not saved to disk).
