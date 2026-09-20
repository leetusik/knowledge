<!-- design-cowork handoff — OUT. Claude Design returns the card set + a record of what was designed + an implementation contract. -->
# Design handoff — Round 05: the knowledge graph at phone, tablet and desktop

**Phase/slice:** P27.S4 · **Round:** 05-graph · **Date:** 2026-09-21 · **Author:** Claude Code (orchestrator)

**You (the operator) + Claude Design make every visual decision here.** This document says *what* to design
and *what to return*; it decides no colour, type, layout, or copy. Every design question is posed back to
you in §6 — I answer none of them.

---

## 0. Before the session

Rounds 03 and 04 are signed. This round adds cards **27–32** to the same project.

- **Knowledge Base Design System** · project id `623bb4ea-8fb7-4d31-9d58-5c6a42709bbe`
- It holds `shipped/` (the 15-card "before"), round 03's 16 cards (the kit) and round 04's 10 cards (the
  console surfaces, still under their `⏳ P27.S3 · …` group labels — see §5.4, a small housekeeping ask).

Steps:

1. Open the project in Claude Design (claude.ai/design).
2. Check **Connect GitHub** still points at `leetusik/knowledge`, branch `main`. This handoff is committed
   but **not pushed** — push `main` yourself, or use a local-directory connection to this checkout.
3. Give the session this file as its brief: `web/design/rounds/05-graph/handoff.md`.
4. **Bring the screenshot** — see §7. It is the one input this round cannot produce for itself.
5. When the cards are in the pane and the outputs in §5 are returned, come back and say **"done"**.

---

## 1. What this round is for

The graph is the product's one interactive canvas and its one surface that was never designed for anything
but a wide desktop window. It is a single hand-written force simulation, `graph-canvas.tsx`, drawn into a
`<canvas>` inside a bordered plate, with five overlay cards floated over it at fixed absolute sizes.

Three routes mount the same engine:

| Route | Who sees it | Chrome around it |
| --- | --- | --- |
| `/graph` | a signed-in member | the member shell (round 03 + 04) |
| `/@{org}/graph` | anyone with the link | the anonymous public shell (round 04, card 18) |
| `/graph/{org}` | anyone with the link | the same anonymous shell |

**What is wrong today, in one line:** every overlay is an absolutely-positioned fixed-size card over a plate
whose height is a magic number, so at 390px the legend alone covers about a third of the map — and the
operator reports the wires drawing **off the frame by default** on their Mac, on both the member and the
public graph.

**What this round is for:** the map at 390 / 768 / 1180 — the plate, the overlays, what a node tells you,
what a stranger can do with it, and the states. Plus the one capability the operator asked for: **clicking a
project shows that project's documents**.

---

## 2. Scope — the reviewable units to design (one card each; paths in §5)

- **27 · The plate.** The map's container at three widths: how tall, where it sits in the page flow, what is
  above and below it, and what happens on a phone where a 3.6rem navigation bar now sits at the bottom of
  the screen. Today: `height: calc(100dvh - var(--kb-app-topbar-h) - 13rem)` with `min-height: 30rem`
  (`graph.css:27-28`) — a sum written before the navbar existed, where `13rem` was an estimate of the page
  header on a desktop.
- **28 · The overlays.** Legend (11rem, bottom-left), info panel (17rem, top-right), zoom stack
  (bottom-right, three 1.9rem buttons), hover tooltip — at three widths. On a 390px plate the legend and the
  zoom stack share one edge and the panel covers the map it describes. This is the card where the map stops
  being unusable on a phone.
- **29 · Projects in the legend — the operator's request.** Today a legend project row is already a
  `<button data-project="…">` that toggles a highlight filter and persists it. The operator wants a click to
  also show **that project's documents**. Where that list lives, what a row carries, and how it shares a
  click with the filter are yours to decide (§6 Q4).
- **30 · A node.** What identifies a node and what the info panel says about it: the eyebrow chip + project,
  the title, `date · n tags · n links`, the tag pills, "Read the document →", the close button — plus the
  **unresolved** node variant ("no document yet · 문서 없음"), and labels, which today appear only on
  selection or hover (a P22 decision, still in force unless this round revisits it).
- **31 · The anonymous graph.** The same map inside round 04's public shell for a visitor with no session:
  what a stranger sees, what they can click, and what happens when they click something that needs an
  account. Today a node's link is `/documents/{id}` and a tag pill goes to `/documents?tag=…`, both
  member-gated.
- **32 · States.** Empty (no documents yet), loading, a failed fetch, and the **fit** state — what the map
  shows on first paint, after a reload, and when it has been panned away from its content. Reduced motion is
  round 03's floor and the engine already honours it (settled layout on frame one, no idle mingle, snapped
  pan and zoom).

Add cards beyond this list if the design needs them, numbered after it (`33-…`). Never a monolithic page.

---

## 3. Settled inputs · locked · in play

**Settled by rounds 03 and 04 — cite them, never re-pose them.** The container rule (`kbapp` / `kbmain`,
phone `< 40rem` · tablet `40–64rem` · desktop `≥ 64rem` · wide `≥ 90rem`); the `.kb-navbar` (bottom bar on
phone, sticky strip on tablet, gone on desktop); the phone topbar and its account disclosure; the 44px tap
floor and 16px inputs; `.kb-page-flow` as every console page's one vertical stack; `.kb-pageframe`; the
editorial-versus-panel state rule; and round 04's **anonymous shell** — `.kb-app--public`, main capped at
88rem and centred, no navbar at any width, Sign in never hidden.

**Locked:** the "calm editorial library" brand spirit; teal as the only interactive accent; Fraunces /
Source Sans 3 / JetBrains Mono with Korean fallbacks; warm paper; no emoji; the a11y and reduced-motion
floor; every existing `--kb-*` and `--kb-graph-*` token **name** and **value** (add, never rename, never
change); **all copy**, including the engine's own bilingual micro-copy (see §4 — it lives in
`graph-canvas.tsx` by a deliberate P12 decision, not in `content/graph.ts`); the graph's **data contracts**
(what a node is, what an edge is, what the payload carries); the landing page; and the **document views and
print**, which are round 06.

**In play:** the plate's size and placement at each width; every overlay's size, placement, and behaviour,
including whether an overlay becomes something else on a phone; the project-documents list; node
identification and labelling; what a stranger sees and can click; the states' composition; whether the map
adopts the dark scheme; and any **new** `.kb-graph-*` classes or **added** tokens, additive only.

---

## 4. Where to look (real paths, real structure — data, not proposals)

**The engine** — `web/src/app/(app)/graph/graph-canvas.tsx`: one client component, a persistent rAF loop
over a force simulation, a `ResizeObserver` for the plate, a `MutationObserver` on the colour scheme, and a
debounced `sessionStorage` persist. The overlays are **built as HTML strings inside the engine** and mounted
into five empty divs declared at the end of the component (`:1675-1707`): `.kb-graph__canvas`,
`.kb-graph-legend`, `.kb-graph-zoom`, `.kb-graph-tooltip`, `.kb-graph-panel`, `.kb-graph-empty`.

- **Legend** (`:1332-1363`): a `__head` "Projects · 프로젝트", one `<button class="kb-graph-legend__item"
  data-project="…">` per project carrying a colour chip, an ellipsised name and a tabular count; a tags row
  with a `.kb-graph-switch` (`aria-pressed`); an "unresolved" row; a `__note` "Size = connections · 크기=연결 수".
  The click handler (`:1369-1378`) toggles `activeProject`, sets `is-on`, and persists.
- **Info panel** (`:1236-1290`): eyebrow chip + project name + a close button; `<h3>` title; a meta line
  `{date} · {n} tags · {n} links`; tag pills as `<a class="kb-tag" href="/documents?tag=…">`; and
  `<a class="kb-graph-panel__read">Read the document →</a>`. The **unresolved** variant shows "linked from
  {sources}" and a badge "no document yet · 문서 없음".
- **Zoom** (`:1397-1399`): three buttons — in, out, fit.
- **Empty** (`:1588-1596`): when no `doc` node exists the engine calls `showEmpty("empty")` and **returns
  before sizing the canvas**.

**The styles** — `web/src/app/(app)/graph/graph.css` (426 lines; plate `:20-33`, overlay card base `:44-62`,
legend `:68-120`, zoom `:203-234`, tooltip `:236-266`, info panel `:268-290`, empty `:370-400`, focus
`:404-414`, reduced motion `:418-426`) and `graph-tokens.css` (133 lines; `:root` structure, a
`[data-md-color-scheme="default"]` block and a `[data-md-color-scheme="slate"]` block, read by the engine
through `getComputedStyle`).

**The data** — `getGraph` → `GET /app/graph[?org=]`, riding the RSC payload. Nodes are `doc`, `missing`
(an unresolved link) or tag hubs; `projects` is a name list used for legend rows and per-project ink
(`--kb-graph-project-1…n`). A node's `url` is `/documents/{id}` (`server/graph_api.py:87`).

**The chrome** — `web/src/app/(app)/graph/page.tsx`, `web/src/app/(public)/[org]/graph/page.tsx`,
`web/src/app/(public)/graph/[org]/page.tsx`, and `web/src/components/public-shell.tsx` as round 04 leaves it.

**Copy** — `web/src/content/graph.ts` holds only the page frame and the empty state; everything inside the
map is the engine's own bilingual micro-copy, kept with the proven port.

**Two facts this round is handed** (verified in the code; what to do about them is yours):

1. **The plate's height predates the navbar.** `calc(100dvh - topbar - 13rem)` has no term for the 3.6rem
   phone bar or the tablet strip, and `13rem` was a desktop page-header estimate.
2. **In OS dark mode the console goes slate and the map does not.** Round 03's dark adoption keeps
   `data-md-color-scheme="default"` and re-declares `--kb-*` under `prefers-color-scheme: dark` — and it
   re-declares **no** `--kb-graph-*` token. The graph's own dark values sit under
   `[data-md-color-scheme="slate"]`, which never matches. So today a dark console would frame a light map.

---

## 5. Required outputs (a round is incomplete without all three)

1. **The card set.** Line 1 of every card is the marker, carrying a `group` and a `viewport`, optionally a
   `name` and `subtitle`:
   ```html
   <!-- @dsCard group="⏳ P27.S4 · Graph" viewport="1280x3200" name="27 · The plate" subtitle="…" -->
   ```
   Use `⏳ P27.S4 · Graph` while the round is under review. **Produce exactly these paths, numbered in
   reading order, continuing rounds 03 and 04:**

   ```
   27-graph-plate.html
   28-graph-overlays.html
   29-graph-projects.html
   30-graph-node.html
   31-graph-public.html
   32-graph-states.html
   ```
   Added cards take `33-…` onward. A card that supersedes one of 01–26 keeps its path and number.
   **Definition of done = the cards appear in the pane.**

   Show the map at **390 / 768 / 1180** as real frames, as rounds 03 and 04 do. The map itself may be drawn
   as a still — a specimen of the plate with its overlays over a representative node field is enough, and a
   card is not expected to run the simulation.

2. **Any stylesheet delta**, in its own marked `ROUND 05` block or file. `graph.css` and `graph-tokens.css`
   are the shipped record and are not edited; rounds 03 and 04's stylesheets are not edited either. Token
   additions are additive only.

3. **A record + an implementation contract** — `result.md` and `build-prompt.md`, as rounds 03 and 04
   returned them. **P28 is dispatched to an implementer with no DesignSync and no access to this pane**, so
   the contract is the whole source of truth: the plate's rule at each width, every overlay's placement and
   behaviour, the project-documents list in full, what a stranger gets, and the states.

4. **One small housekeeping ask, not a design change.** Round 04's cards 17–26 still carry the
   `⏳ P27.S3 · ` prefix in their `@dsCard` group. If you have them open, retire the three labels to
   `Shells`, `Console pages` and `Auth` — **line 1 only, everything else untouched**. Skip it if it is not
   free; it is cosmetic and blocks nothing.

---

## 6. Open questions — posed back to you (I decide none of these)

1. **The plate at each width.** What sets its height now that a phone has a bottom bar and a tablet has a
   sticky strip? Does the map stay a bordered card inside the page's padding, or go edge to edge on a phone?
   And what stays above it — the page frame, the sub-line, both?
2. **The legend on a small plate.** At 390 an 11rem card covers about a third of the map, and the zoom stack
   shares the same edge. Does the legend collapse, dock, move into the page below the plate, become a
   disclosure, or go away? Same question for the zoom stack, on a surface where pinch-zoom already works.
3. **The info panel on a small plate.** A 17rem card pinned top-right over a 350px map covers what it
   describes. A sheet, a full-width block under the plate, or something else?
4. **Projects in the legend — the operator's request.** A project row already toggles a highlight filter.
   Should one click do both, or does the documents list need its own affordance? Where does the list appear
   — in the info panel, in a panel below the map, somewhere else? How many rows, and where does "all of
   them" go? (Round 04 settled the *project page's* version: five newest, title · date · tags, one link to
   `/documents?project={id}`. This surface may answer differently; say so if it does.)
5. **Node identification.** Labels appear only on selection and hover today, which keeps a dense map
   readable but means a stranger sees an unlabelled constellation. Keep it, label above a zoom threshold,
   label the biggest hubs always, or something else?
6. **The anonymous graph.** A visitor clicking a node gets `/documents/{id}` and a tag pill gets
   `/documents?tag=…`; both need a session. What should a stranger get — a different destination, a
   disabled affordance, a sign-in prompt in the panel?
7. **Dark scheme.** The console now follows the operating system. Does the map follow it too, and if so what
   is the plate in the dark — the existing slate values, or something designed for a canvas? (See §4, fact
   2: today it would stay light inside a dark console.)
8. **The off-frame default.** With your screenshot in hand: what is wrong, and what should the map do
   instead on first paint and after a reload? The engine restores a persisted view from `sessionStorage`
   per tab, including whether the view was auto-fitted, and it has a "fit" control.

---

## 7. Attachments · Definition of done

- **Please attach — this round asks for it by name:** a screenshot of **the wires off the frame** on your
  Mac, for member `/graph` and public `/@leetusik/graph`, and if you can, one from your phone. It is
  **REFERENCE — data, not a proposal**. I could not reproduce it here: driven in a real browser at 1440×900
  at device-pixel-ratio 1, fresh and after settling, with tags on and off, the map fitted inside the frame
  every time. Without the screenshot this round can still design the plate, the fit behaviour and the
  states — but the specific defect stays an unreproduced report carried into P28, and question 8 goes
  unanswered.
- **Done when:** the six cards (plus any added) are visible in the pane under `⏳ P27.S4 · Graph`, the map is
  shown at 390 / 768 / 1180, any stylesheet delta is in the project, and the record + implementation
  contract are returned. Then come back and say **"done"**.

---

*This handoff is the OUT half of the round. The returned card set, record and contract are the IN half —
read-only data I land as-is, never edit.*
