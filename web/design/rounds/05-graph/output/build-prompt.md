# Round 05 — implementation contract (build prompt)

**Phase/slice:** P27.S4 → applied in P28 · **Round:** 05-graph · **Date:** 2026-09-21
**Design project:** Knowledge Base Design System `623bb4ea-8fb7-4d31-9d58-5c6a42709bbe`
**Record of decisions and reasoning:** `result.md` beside this file.
**Round 03's contract** (the kit): `round-03-build-prompt.md`. **Round 04's** (the surfaces):
`round-04-build-prompt.md`. Both still binding in full.

Written for an implementer who cannot open the design pane. Everything needed to build the round is here,
including the stylesheet verbatim. **Invent nothing.** Where a value is not stated, round 04's value stands;
where round 04 is silent, round 03's stands; where round 03 is silent, the shipped value stands.
**Tokens are added, never renamed or changed. Five strings are added, and §5 lists all five.**

---

## 0. The one rule of this round

**The overlays answer the PLATE, not the page and not the viewport.** `.kb-graph` becomes a container
(`kbgraph / inline-size`), and every overlay rule is an `@container kbgraph` query. The plate's own
**height** is the one thing it cannot query itself for, so it is set from `kbmain`, the page's container,
exactly as round 03 sets everything else. The dock (§4.3) is a page element, so it too is `kbmain`.

| Container | Declared on | Governs in this round |
| --- | --- | --- |
| `kbapp` | `.kb-app` | the plate's **height** |
| `kbmain` | `.kb-app-main` | whether the dock renders |
| `kbgraph` | `.kb-graph` | **new** — legend, panel, zoom, tooltip placement and size |

**The plate's height is keyed on `kbapp`, not `kbmain`.** "Fills the window" is a statement about the
window, and round 04's contract names the trap: at a 1180px window with the 15rem rail expanded, `kbmain`
is 938px = **58.6rem**, below 64rem. Keyed on the content container, the desktop height would never apply
at 1180 — the plate would be 30rem with a large plate's overlays on it. Everything that is genuinely about
a width (the dock, every overlay) stays on the container it is about.

**Plate tiers:** small `< 34rem` · medium `34–52rem` · large `>= 52rem`.
At the review widths the plate measures **~22.4rem** (390) · **~45rem** (768) · **~56rem** (1180, rail
expanded). Fold the rail at 1180 and it is ~65rem; a 1024 tablet with no rail is ~59rem. All large, all
correct — the plate really is that wide. There is exactly one `@media` rule in the new stylesheet, the
`prefers-color-scheme` block of §4.9, and it is there because round 03's dark adoption is a media query.

---

## 1. Files

| Action | Path | Notes |
| --- | --- | --- |
| **Create** | `web/src/app/(app)/graph/graph-r5.css` | The stylesheet in §3, verbatim. Imported by `graph-canvas.tsx` next to the two it already imports. |
| **Edit** | `web/src/app/(app)/graph/graph-canvas.tsx` | §4, itemised. |
| **Edit** | `web/src/content/graph.ts` | The five strings of §5 only. |
| **Do not touch** | `graph.css`, `graph-tokens.css` | Shipped records. Every change this round needs is additive and lives in `graph-r5.css`. |
| **Do not touch** | `kb-tokens.css`, `kb-console.css`, `app-frame.css`, `kb-console-responsive.css`, `kb-console-r4.css` | Earlier rounds, verbatim. |

---

## 2. Tokens added

All new, all in `graph-r5.css`'s `:root`. No existing `--kb-*` or `--kb-graph-*` name or value is touched.

| Token | Value | Read by |
| --- | --- | --- |
| `--kb-graph-h-phone` | `26rem` | CSS |
| `--kb-graph-h-tablet` | `30rem` | CSS |
| `--kb-graph-h-chrome` | `11.5rem` | CSS (desktop height sum) |
| `--kb-graph-h-min` / `--kb-graph-h-max` | `22rem` / `52rem` | CSS |
| `--kb-graph-inset` | `0.9rem` | CSS — names graph.css's existing overlay inset |
| `--kb-graph-panel-w` / `-w-md` | `17rem` / `15rem` | CSS |
| `--kb-graph-sheet-max` | `60%` | CSS |
| `--kb-graph-btn` / `-btn-touch` | `1.9rem` / `2.75rem` | CSS |
| `--kb-graph-fit-pad` | `0.08` | **engine** |
| `--kb-graph-fit-bias` | `0.38` | **engine** |
| `--kb-graph-restore-tol` | `0.02` | **engine** |
| `--kb-graph-offmap-min` | `0.15` | **engine** |
| `--kb-graph-label-zoom` | `1.6` | **engine** |
| `--kb-graph-label-cap` / `-cap-sm` | `8` / `4` | **engine** |
| `--kb-graph-docs-shown` | `5` | **engine** |

The engine already reads its geometry through `getComputedStyle` in `readTokens()`; add these to the same
read. `-cap-sm` applies when the plate is `< 34rem` wide (measure the host, the same box the
`ResizeObserver` reports).

---

## 3. `graph-r5.css` — the whole file, verbatim

```css
/* ==========================================================================
   Knowledge Base — GRAPH layer  (Round 05 · P27.S4)
   --------------------------------------------------------------------------
   Sits on top of graph-tokens.css + graph.css (the shipped record, copied here
   verbatim and NOT edited) and on top of round 03's console-responsive.css and
   round 04's console-r4.css (also not edited).

   ADDITIVE ONLY. No `--kb-*` or `--kb-graph-*` token is renamed or given a new
   value; every token below is new. No existing class is renamed; existing
   classes are only extended.

   THE ONE STRUCTURAL DECISION OF THIS ROUND — the overlays respond to the
   PLATE, not to the page and not to the viewport. `.kb-graph` declares its own
   container (`kbgraph`), so an overlay rule is written against the box it
   actually floats over. The plate's HEIGHT is the one thing the plate cannot
   query itself for, so it is set from `kbmain`, the page's container, exactly
   as round 03 sets everything else.

   Plate tiers (container `kbgraph`):  < 34rem small · 34–52rem medium ·
   >= 52rem large. At the round's three review widths the plate measures
   ~22.4rem (390) · ~45rem (768) · ~56rem (1180 with the rail expanded).

   Load order: kb-tokens.css → kb-console.css → app-frame.css →
   kb-console-responsive.css → kb-console-r4.css → graph-tokens.css →
   graph.css → THIS.
   ========================================================================== */

/* -------- Added tokens ---------------------------------------------------- */
:root {
  /* Plate height. Phone and tablet are DETERMINISTIC (a fixed block in the page
     flow) because `100dvh` minus a bottom bar minus a page header is a sum that
     was already wrong once; desktop keeps the window-filling behaviour because
     there the page genuinely fits. */
  --kb-graph-h-phone: 26rem;
  --kb-graph-h-tablet: 30rem;
  --kb-graph-h-chrome: 11.5rem; /* topbar excluded — page frame + main padding */
  --kb-graph-h-min: 22rem;
  --kb-graph-h-max: 52rem;

  /* Overlay geometry (0.9rem is graph.css's existing inset, given a name). */
  --kb-graph-inset: 0.9rem;
  --kb-graph-panel-w: 17rem;
  --kb-graph-panel-w-md: 15rem;
  --kb-graph-sheet-max: 60%;
  --kb-graph-btn: 1.9rem; /* large plate */
  --kb-graph-btn-touch: 2.75rem; /* 44px — small + medium plate */

  /* Read by the engine through getComputedStyle, like every other graph token. */
  --kb-graph-fit-pad: 0.08; /* fraction of the plate kept clear around content */
  --kb-graph-fit-bias: 0.38; /* selected node parks this far down a sheeted plate */
  --kb-graph-restore-tol: 0.02; /* plate-size drift that still restores a view */
  --kb-graph-offmap-min: 0.15; /* below this share of nodes on screen → recenter */
  --kb-graph-label-zoom: 1.6; /* every label above this zoom */
  --kb-graph-label-cap: 8; /* always-on hub labels, large + medium plate */
  --kb-graph-label-cap-sm: 4; /* always-on hub labels, small plate */
  --kb-graph-docs-shown: 5; /* project documents in the panel, newest first */
}

/* -------- 1 · The plate (card 27) ----------------------------------------- */
/* The plate is a container and a plain block in `.kb-page-flow`; it keeps the
   page's gutter at every width — the map is a surface in the page, not a
   full-bleed exception to it.

   The HEIGHT is keyed on `kbapp`, the SHELL, not on `kbmain`: "fills the
   window" is a statement about the window, and `kbmain` is 938px = 58.6rem at
   a 1180px window with the rail expanded — round 04's number that surprises
   people. Keyed on `kbmain` the desktop height would never apply at 1180.
   Width-driven decisions (the dock, and every overlay) stay on the container
   whose width they are actually about. */
.kb-graph { container: kbgraph / inline-size; height: clamp(var(--kb-graph-h-min), calc(100dvh - var(--kb-app-topbar-h) - var(--kb-graph-h-chrome)), var(--kb-graph-h-max)); min-height: var(--kb-graph-h-min); }
@container kbapp (width < 40rem) { .kb-graph { height: var(--kb-graph-h-phone); min-height: 0; } }
@container kbapp (width >= 40rem) and (width < 64rem) { .kb-graph { height: var(--kb-graph-h-tablet); min-height: 0; } }

/* -------- 2 · Overlays (card 28) ------------------------------------------ */
/* Shared: an overlay never outgrows the plate it floats over. */
.kb-graph .kb-graph__ui { max-width: calc(100% - 2 * var(--kb-graph-inset)); max-height: calc(100% - 2 * var(--kb-graph-inset)); }
.kb-graph .kb-graph-panel { overflow: auto; overscroll-behavior: contain; }
.kb-graph .kb-graph-legend { overflow: auto; }

/* Legend collapse — the head becomes the toggle; the body is what folds.
   Present at every width the legend is on the plate; persisted like the lens. */
.kb-graph .kb-graph-legend__toggle { display: flex; align-items: center; gap: 0.4rem; width: 100%; padding: 0.1rem 0.3rem 0.3rem; border: 0; background: transparent; cursor: pointer; font: inherit; font-size: 0.6rem; font-weight: var(--kb-weight-semibold); letter-spacing: var(--kb-tracking-label); text-transform: uppercase; color: var(--kb-hint); }
.kb-graph .kb-graph-legend__toggle:hover { color: var(--kb-ink); }
.kb-graph .kb-graph-legend__caret { margin-left: auto; transition: transform var(--kb-ease); }
.kb-graph .kb-graph-legend__toggle[aria-expanded="false"] .kb-graph-legend__caret { transform: rotate(-90deg); }
.kb-graph .kb-graph-legend__toggle[aria-expanded="false"] + .kb-graph-legend__body { display: none; }

/* Zoom stack: a touch-sized target below 52rem of plate. */
@container kbgraph (width < 52rem) {
  .kb-graph .kb-graph-zoom__btn { width: var(--kb-graph-btn-touch); height: var(--kb-graph-btn-touch); font-size: 1.05rem; }
}

/* ---- Small plate (< 34rem) ----------------------------------------------- */
@container kbgraph (width < 34rem) {
  /* The legend leaves the plate — it is the dock below it (see §3). */
  .kb-graph .kb-graph-legend { display: none; }
  /* Pinch and double-tap already zoom. The only control a gesture cannot
     replace is "I have lost the map", so Fit is the one button that stays. */
  .kb-graph .kb-graph-zoom { border: 0; background: transparent; }
  .kb-graph .kb-graph-zoom__btn[data-zoom="in"], .kb-graph .kb-graph-zoom__btn[data-zoom="out"] { display: none; }
  .kb-graph .kb-graph-zoom__btn[data-zoom="fit"] { border: 1px solid var(--kb-border); border-radius: 50%; background: var(--kb-surface); box-shadow: var(--kb-shadow-raise); }
  /* No hover on a touch plate; the tooltip never fires and is not rendered. */
  .kb-graph .kb-graph-tooltip { display: none; }
  /* The info panel is a sheet on the plate's bottom edge, full width, capped at
     60% so the map above it stays legible; the engine parks the selected node
     in the clear part (`--kb-graph-fit-bias`). */
  .kb-graph .kb-graph-panel { top: auto; right: 0; left: 0; bottom: 0; width: auto; max-width: none; max-height: var(--kb-graph-sheet-max); border-width: 1px 0 0; border-radius: var(--kb-radius) var(--kb-radius) 0 0; padding: 0.85rem 1rem 1rem; box-shadow: var(--kb-shadow-overlay); }
  .kb-graph .kb-graph-panel__close { min-width: var(--kb-tap); min-height: 2.2rem; font-size: 1rem; }
  .kb-graph .kb-graph-panel__title { font-size: 1.12rem; }
  .kb-graph .kb-graph-panel__tags { gap: 0.35rem; }
  .kb-graph .kb-graph-panel .kb-tag { font-size: 0.75rem; padding: 0.25em 0.7em; }
  .kb-graph .kb-graph-panel__read { display: inline-flex; align-items: center; min-height: var(--kb-tap); font-size: 0.85rem; }
}
@media (prefers-reduced-motion: no-preference) {
  @container kbgraph (width < 34rem) {
    .kb-graph .kb-graph-panel { animation: kb-graph-sheet var(--kb-dur-reveal) var(--kb-ease-out) both; }
  }
}
@keyframes kb-graph-sheet { from { transform: translateY(0.9rem); opacity: 0; } to { transform: none; opacity: 1; } }

/* ---- Medium plate (34–52rem) --------------------------------------------- */
@container kbgraph (width >= 34rem) and (width < 52rem) {
  .kb-graph .kb-graph-panel { width: var(--kb-graph-panel-w-md); }
  .kb-graph .kb-graph-legend { width: 10rem; }
}

/* -------- 3 · The dock — the legend off the plate (cards 28, 29) ---------- */
/* Below 40rem of PAGE the legend is a strip in the page flow under the plate:
   one scrollable row of project lenses at a 44px target, then the two switches,
   then the note. It is the same control set in the same order, at a size a
   thumb can hit, on a surface that covers nothing. */
.kb-graph-dock { display: none; }
@container kbmain (width < 40rem) { .kb-graph-dock { display: block; margin-top: 0.55rem; } }
.kb-graph-dock__scroll { display: flex; gap: 0.4rem; overflow-x: auto; scrollbar-width: none; padding: 0.15rem 0 0.3rem; -webkit-overflow-scrolling: touch; }
.kb-graph-dock__scroll::-webkit-scrollbar { display: none; }
.kb-graph-dock__item { display: inline-flex; align-items: center; gap: 0.45rem; flex: none; min-height: var(--kb-tap); padding: 0.4rem 0.75rem; border: 1px solid var(--kb-border); border-radius: var(--kb-radius-pill); background: var(--kb-surface); font: inherit; font-size: 0.82rem; color: var(--kb-secondary); cursor: pointer; white-space: nowrap; transition: color var(--kb-ease), border-color var(--kb-ease), background var(--kb-ease); }
.kb-graph-dock__item .kb-graph-legend__count { margin-left: 0.1rem; font-size: 0.72rem; }
.kb-graph-dock__item.is-on { color: var(--kb-ink); border-color: var(--kb-accent); background: var(--kb-accent-soft); font-weight: var(--kb-weight-medium); }
.kb-graph-dock__item.is-off { color: var(--kb-hint); }
.kb-graph-dock__item.is-off .kb-graph-legend__chip { background: transparent; box-shadow: inset 0 0 0 1.5px var(--chip, var(--kb-graph-node-doc)); }
.kb-graph-dock__item .kb-graph-switch { margin-left: 0.1rem; }
.kb-graph-dock__note { margin: 0.1rem 0 0; font-family: var(--kb-font-mono); font-size: 0.62rem; letter-spacing: 0.03em; color: var(--kb-hint); }
.kb-graph-dock__item:focus-visible { outline: var(--kb-focus-w) solid var(--kb-accent); outline-offset: var(--kb-focus-offset); }

/* -------- 4 · Project mode in the panel (card 29) ------------------------- */
/* One click on a project lens does both jobs: the lens on the map, and the
   project's documents in the panel. Same panel, second mode. */
.kb-graph .kb-graph-panel__count { font-family: var(--kb-font-mono); font-size: 0.66rem; color: var(--kb-hint); font-variant-numeric: tabular-nums; margin-top: 0.3rem; }
.kb-graph .kb-graph-panel__list { list-style: none; margin: 0.5rem 0 0; padding: 0; }
.kb-graph .kb-graph-panel__doc { display: block; padding: 0.42rem 0; border-top: 1px solid var(--kb-border); text-decoration: none; color: var(--kb-ink); }
.kb-graph .kb-graph-panel__doc:hover .kb-graph-panel__doctitle { color: var(--kb-accent-strong); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 0.15em; }
.kb-graph .kb-graph-panel__doctitle { display: block; font-size: 0.82rem; line-height: var(--kb-leading-snug); color: var(--kb-ink); }
.kb-graph .kb-graph-panel__docmeta { display: block; margin-top: 0.12rem; font-family: var(--kb-font-mono); font-size: 0.62rem; color: var(--kb-hint); font-variant-numeric: tabular-nums; }
.kb-graph .kb-graph-panel__foot { display: flex; align-items: center; gap: 0.75rem; margin-top: 0.7rem; padding-top: 0.6rem; border-top: 1px solid var(--kb-border); }
.kb-graph .kb-graph-panel__empty { margin: 0.6rem 0 0; font-size: 0.78rem; line-height: var(--kb-leading-snug); color: var(--kb-secondary); }
@container kbgraph (width < 34rem) {
  .kb-graph .kb-graph-panel__doc { padding: 0.55rem 0; min-height: var(--kb-tap); }
  .kb-graph .kb-graph-panel__doctitle { font-size: 0.9rem; }
  .kb-graph .kb-graph-panel__foot { gap: 0.5rem; }
  .kb-graph .kb-graph-panel__foot > * { min-height: var(--kb-tap); display: inline-flex; align-items: center; }
}

/* -------- 5 · The stranger's panel (card 31) ------------------------------ */
/* The anonymous shell has no rail, and `.kb-app-layout` is a two-column grid
   whose first track is the rail's 15rem at every width above 64rem. Round 04
   capped and centred public main but never collapsed the grid, because no
   public surface had reached a desktop width yet — the map is the first.
   One column, so main is main. */
.kb-app--public .kb-app-layout { grid-template-columns: minmax(0, 1fr); }

/* A tag on the public map is a lens on the map, not a link into a member route;
   it is a <button>, and it carries the pill's shape without its link ink. */
.kb-graph button.kb-tag { cursor: pointer; font: inherit; font-size: 0.66rem; line-height: 1.5; color: var(--kb-tag-fg); background: var(--kb-tag-bg); }
.kb-graph button.kb-tag:hover { color: var(--kb-accent-strong); border-color: var(--kb-accent); }
.kb-graph button.kb-tag[aria-pressed="true"] { border-color: var(--kb-accent); color: var(--kb-accent-strong); background: var(--kb-accent-soft); }
.kb-graph .kb-graph-panel__gate { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.3rem 0.5rem; margin-top: 0.15rem; font-size: 0.72rem; line-height: var(--kb-leading-snug); color: var(--kb-hint); }
.kb-graph .kb-graph-panel__gate a { font-weight: var(--kb-weight-medium); color: var(--kb-accent); text-decoration: none; }
.kb-graph .kb-graph-panel__gate a:hover { color: var(--kb-accent-strong); text-decoration: underline; }

/* -------- 6 · Off-map recenter + states (card 32) ------------------------- */
/* Shown only when the content has left the plate: a quiet pill at the top of
   the map with the one action that fixes it. Never shown on first paint —
   first paint always fits. */
.kb-graph .kb-graph-recenter { position: absolute; top: var(--kb-graph-inset); left: 50%; transform: translateX(-50%); z-index: 4; display: inline-flex; align-items: center; gap: 0.6rem; padding: 0.3rem 0.35rem 0.3rem 0.75rem; background: var(--kb-surface); border: 1px solid var(--kb-border-strong); border-radius: var(--kb-radius-pill); box-shadow: var(--kb-shadow-raise); font-size: 0.72rem; color: var(--kb-secondary); }
.kb-graph .kb-graph-recenter[hidden] { display: none; }
.kb-graph .kb-graph-recenter .kb-appbtn { min-height: 1.8rem; padding: 0.2rem 0.7rem; }
@container kbgraph (width < 34rem) { .kb-graph .kb-graph-recenter .kb-appbtn { min-height: var(--kb-tap); } }

/* graph.css :404-406 tints EVERY `<a>` inside the plate teal, which repaints an
   `<a class="kb-appbtn">` placed in a plate state — teal label on a teal
   button. Buttons keep their own ink. */
.kb-graph a.kb-appbtn--primary, .kb-graph a.kb-appbtn--danger { color: #fbfaf5; }
.kb-graph a.kb-appbtn--secondary { color: var(--kb-ink); }
.kb-graph a.kb-appbtn--secondary:hover { color: var(--kb-accent-strong); }
.kb-graph a.kb-appbtn--ghost { color: var(--kb-secondary); }
.kb-graph a.kb-appbtn--ghost:hover { color: var(--kb-ink); }
[data-md-color-scheme="slate"] .kb-graph a.kb-appbtn--primary, [data-md-color-scheme="slate"] .kb-graph a.kb-appbtn--danger { color: #16130f; }

/* The plate's own states sit in the existing `.kb-graph-empty` box: one title,
   one sentence, at most two actions. The map never borrows the page's
   editorial state — a failed map is a failed panel, not a failed page. */
.kb-graph .kb-graph-empty__actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.5rem; margin-top: 0.75rem; }
.kb-graph .kb-graph-empty__detail { margin-top: 0.7rem; font-family: var(--kb-font-mono); font-size: 0.62rem; color: var(--kb-hint); }
.kb-graph .kb-graph-empty--load { color: var(--kb-hint); }
.kb-graph .kb-graph-skel { display: grid; place-items: center; gap: 0.5rem; }
.kb-graph .kb-graph-skel__dot { width: 0.55rem; height: 0.55rem; border-radius: 50%; background: var(--kb-border-strong); }
@media (prefers-reduced-motion: no-preference) {
  .kb-graph .kb-graph-skel__dot { animation: kb-graph-pulse 1.4s var(--kb-ease-out) infinite; }
  @keyframes kb-graph-pulse { 0%, 100% { opacity: 0.35; } 50% { opacity: 1; } }
}

/* -------- 7 · Dark scheme adoption (§4 fact 2) ---------------------------- */
/* graph-tokens.css declares the graph inks on `[data-md-color-scheme]`, which
   round 03's OS adoption never flips — it re-declares the base `--kb-*` on
   `.kb-app[data-kb-scheme="auto"]` and leaves the attribute on "default". A
   custom property that says `var(--kb-accent)` resolves where it is DECLARED,
   so the graph would keep the light values even inside a dark console. This
   block re-declares the slate graph set at the same place round 03 re-declares
   the base set — same values as `[data-md-color-scheme="slate"]`, nothing new,
   nothing renamed. When a preference control lands and writes `light` | `dark`,
   this block stops matching exactly as round 03's does. */
@media (prefers-color-scheme: dark) {
  .kb-app[data-kb-scheme="auto"] {
    --kb-graph-canvas: #16130f;
    --kb-graph-project-1: var(--kb-accent);
    --kb-graph-project-2: var(--kb-status-idle);
    --kb-graph-project-3: #c99bc0;
    --kb-graph-node-doc: var(--kb-graph-project-1);
    --kb-graph-node-outline: var(--kb-graph-canvas);
    --kb-graph-node-tag: var(--kb-secondary);
    --kb-graph-node-ghost: #6b6355;
    --kb-graph-edge: #6f6759;
    --kb-graph-edge-related: #9a9081;
    --kb-graph-edge-active: var(--kb-accent);
    --kb-graph-focus: var(--kb-accent-strong);
    --kb-graph-halo: rgba(98, 189, 178, 0.25);
    --kb-graph-label: var(--kb-ink);
    --kb-graph-label-muted: var(--kb-secondary);
    --kb-graph-label-halo: var(--kb-graph-canvas);
    --kb-graph-dim: 0.22;
  }
  .kb-app[data-kb-scheme="auto"] .kb-graph a.kb-appbtn--primary,
  .kb-app[data-kb-scheme="auto"] .kb-graph a.kb-appbtn--danger { color: #16130f; }
}

/* -------- 8 · Reduced motion --------------------------------------------- */
@media (prefers-reduced-motion: reduce) {
  .kb-graph .kb-graph-panel, .kb-graph .kb-graph-skel__dot { animation: none !important; }
}
```

---

## 4. `graph-canvas.tsx`

Nine changes. Numbers in parentheses are today's line numbers in the file as of this round.

### 4.1 The plate and the canvas (`:1675-1707`, `resize()`, `start()`)

1. `import "./graph-r5.css";` beside the two existing imports.
2. **Size the canvas before any early return.** `start()` today calls `showEmpty("empty")` and returns
   (`:1588-1596`) before `resize()` ever runs, so a plate that later receives data paints into a
   zero-sized backing store. Move the first `resize()` and the `ResizeObserver` registration **above** the
   empty check; keep `showEmpty("empty")` and the return after them.
3. Never fit on a zero-sized plate. If `resize()` reads a width or height of `0`, record that the first
   real size is still pending and re-run the initial fit on the first non-zero size.
4. Nothing else about the plate is engine work — the height is CSS.

### 4.2 Fit, persist and restore (the reported off-frame default)

The stored `sessionStorage` record gains the plate size it was captured at:

```
{ v: <bump the version>, w: <plate px>, h: <plate px>, n: <node count>,
  view: { auto, zt, pxt, pyt }, selectedId, activeProject, tagsVisible,
  legendOpen: <new, §4.3> }
```

Rules, in order:

| Moment | Behaviour |
| --- | --- |
| First paint, no stored record | `fit()` with a margin of `--kb-graph-fit-pad` (8%) of the plate on every side. |
| First paint, stored record | Restore the view **only if** `abs(w − plateW)/plateW <= --kb-graph-restore-tol` **and** the same for `h` **and** `n === node count`. Otherwise ignore the stored view (keep the selection, the lens and the tag switch) and `fit()`. |
| Version mismatch | Ignore the whole record and `fit()`. |
| Tags toggled | Unchanged: re-fit when `view.auto`. |
| Resize inside a tier | Keep zoom; translate so the content centroid stays at the same fraction of the plate. Do not re-fit. |
| Resize across a tier boundary (34rem / 52rem) | `fit()`. |
| Fit control | `fit()`, and set `view.auto = true`. |

**Off-map.** After any pan, zoom or resize settles, compute the share of doc nodes whose centre lies inside
the plate. Below `--kb-graph-offmap-min` (15%), reveal the recenter pill (§6.6); at or above it, hide it.
Never show it on first paint — first paint always fits. Its button calls the same `fit()` the zoom stack's
third button calls.

### 4.3 The legend, its collapse, and the dock

**Collapse.** `buildLegend()` renders the existing `Projects · 프로젝트` head as a `<button
class="kb-graph-legend__toggle" aria-expanded>` followed by `<div class="kb-graph-legend__body">` holding
everything it renders today (rows, rule, tag row, unresolved row, note). Copy is unchanged. Clicking
toggles `aria-expanded`; CSS hides the body. Persist as `legendOpen`, default `true`.

**The dock.** When the plate is small the legend is hidden by CSS and the same control set renders **below
the plate**, in the page flow, as `.kb-graph-dock` (§6.5). Render it always — CSS shows it only at
`kbmain < 40rem` — and keep both control sets bound to the same state, so a lens lit in one is lit in the
other. `data-project` values and handlers are identical; the dock's project control is a `<button>` with
`aria-pressed`. The dock is a sibling of `.kb-graph` inside `.kb-page-flow`, which means `GraphCanvas`
returns a fragment of `<div class="kb-graph">…</div>` + `<div class="kb-graph-dock">…</div>`.

### 4.4 Project mode in the panel (the operator's request)

A project control (legend row **or** dock pill) toggles `activeProject` exactly as today — the lens, the
`is-on` class, the persist. **Additionally:**

- Turning a lens **on** opens the info panel in project mode (§6.3).
- Turning it **off** (clicking the lit control) closes the panel if it is showing project mode.
- Selecting a node while a lens is lit switches the panel to node mode and **leaves the lens lit**.
  Clicking the lit control again returns project mode.
- `Esc` closes the panel; the lens stays. This matches today's `deselect()`.

Project mode's rows are the project's documents, **newest first, `--kb-graph-docs-shown` (5) of them**,
drawn from the graph payload the page already has (doc nodes carry `project`, `title`, `date`, `tags`,
`url`), sorted by `date` descending, ties by title. No new endpoint, no new fetch. Counts:
`{n} documents` = doc nodes in the project; `{n} links` = `related` edges with both ends in it.

### 4.5 Labels

Keep today's rule (labels on selection, on hover, and for the selected node's neighbourhood) and add:

1. **Landmarks.** The top *N* doc nodes by related-link count are labelled always, where *N* is
   `--kb-graph-label-cap` (8) on a medium or large plate and `--kb-graph-label-cap-sm` (4) on a small one.
   Ties break by `date`, newest first, so the set is stable across renders. Recompute on payload change and
   on a tier change, never per frame.
2. **Zoom.** Above `--kb-graph-label-zoom` (1.6) every doc node is labelled.
3. Tag hubs label above zoom `1.2`, in `--kb-graph-label-muted`. Unresolved nodes label only on hover or
   selection.
4. Labels keep the existing `--kb-graph-label-halo` stroke behind the glyphs.
5. When a lens is lit, a dimmed node's label dims with it (same alpha as the node).

### 4.6 The anonymous graph

The engine needs to know it is public and under which base. Pass a prop from the two public pages, e.g.
`publicBase="/@{org}"` (the route the visitor is already on); member pages pass nothing.

| Affordance | Member | Public |
| --- | --- | --- |
| `Read the document →` | `/documents/{id}` (unchanged) | `{publicBase}/documents/{id}` when the payload marks the doc public |
| …when it is not public | n/a | replace the read link with the gate line of §6.4: `Members only · 비공개 문서` + `Sign in to read →` → `/login?next={publicBase}/documents/{id}` |
| Tag pill | `<a class="kb-tag" href="/documents?tag=…">` (unchanged) | `<button class="kb-tag" aria-pressed>` — toggles a **tag lens** on the map, no navigation |
| Project mode foot | `All documents →` + `Open project →` | `All documents →` only where the org publishes a list; otherwise no foot |

**Tag lens** = the existing lens mechanism keyed on a tag instead of a project: nodes carrying the tag keep
full ink, everything else drops to `--kb-graph-dim`. It persists in the same record, it is mutually
exclusive with the project lens (lighting one clears the other), and the pressed pill is its only UI.
If the payload does not distinguish public documents, treat every node in a public payload as public — the
public graph endpoint already filters to public projects.

### 4.7 The panel as a sheet

No engine change to the markup; two behaviours:

1. When the plate is small and the panel opens, pan so the selected node sits at `--kb-graph-fit-bias`
   (0.38) of the plate height — above the sheet — without changing zoom.
2. The sheet scrolls internally (CSS). Keep focus management as it is: opening moves nothing, the close
   button is reachable, `Esc` closes.

### 4.8 States

| State | Trigger | What renders |
| --- | --- | --- |
| Empty | no doc nodes | Today's `.kb-graph-empty` with `GRAPH.empty`, **plus** one primary action, `GRAPH.empty.action` (§5) → the documents page. |
| Loading | payload not yet resolved | `.kb-graph-empty .kb-graph-empty--load` (§6.7): one pulsing mark and `GRAPH.loading` (§5). No skeleton nodes. With reduced motion the mark holds still. |
| Failed | the fetch rejects | `.kb-graph-empty` with `GRAPH.failed` (§5), two actions (Try again · Go to documents) and the failed request in `.kb-graph-empty__detail` (`GET /app/graph · {status}`). **In the plate** — the page frame stays. Never the page-level editorial state. |
| Off the map | §4.2 | The recenter pill (§6.6). |

### 4.9 Dark

Nothing in the engine. `graph-r5.css` §7 re-declares the slate graph set on
`.kb-app[data-kb-scheme="auto"]` inside `@media (prefers-color-scheme: dark)`, which is where round 03
re-declares the base palette. **Why it is needed:** a custom property resolves its `var()` where it is
*declared*. `graph-tokens.css` declares `--kb-graph-project-1: var(--kb-accent)` on the document root, so
it computes the *light* teal and inherits that value into `.kb-app` no matter what `.kb-app` says about
`--kb-accent`. Without the re-declaration a dark console frames a light map. The engine's existing scheme
`MutationObserver` is unaffected; add `window.matchMedia("(prefers-color-scheme: dark)")` to the same
re-read so the map re-inks when the OS flips while the tab is open.

---

## 5. Copy — the five strings this round adds

Everything else on every card is existing copy, verbatim: `GRAPH.*` from `content/graph.ts` and the
engine's own bilingual micro-copy (`Projects · 프로젝트`, `Tags · 태그`, `Unresolved`,
`Size = connections · 크기=연결 수`, `no document yet · 문서 없음`, `Read the document →`,
`Knowledge map · 지식 지도`). **Do not reword any of it.**

| Key | String | Where |
| --- | --- | --- |
| `GRAPH.project.eyebrow` | `Project` | Panel project mode, eyebrow |
| `GRAPH.project.count` | `{docs} documents · {links} links` | Panel project mode, under the title |
| `GRAPH.project.all` | `All documents →` | Panel project mode, foot |
| `GRAPH.project.open` | `Open project →` | Panel project mode, foot, member only |
| `GRAPH.project.empty` | `No documents in this project yet.` | Panel project mode, no rows |

Plus three the engine keeps inline with the rest of its micro-copy, bilingual in the same pattern:

| String | Where |
| --- | --- |
| `Members only · 비공개 문서` + `Sign in to read →` | Public panel gate (§6.4) |
| `Off the map · 지도 밖입니다` + `Fit` | Recenter pill (§6.6) |
| `Drawing the map · 지도를 그리는 중` | Loading state |

And two on `GRAPH`: `GRAPH.empty.action` = `Add a document`; `GRAPH.failed` =
`{ title: "The map didn't load", sub: "Something went wrong fetching the graph. Nothing was changed.",
retry: "Try again", back: "Go to documents" }`.

---

## 6. Markup reference

Every block below is what the engine emits. Existing blocks are shown only where this round changes them.

### 6.1 The mount

```html
<div class="kb-graph">
  <canvas class="kb-graph__canvas" role="img" aria-label="Knowledge map · 지식 지도"></canvas>
  <div class="kb-graph__ui kb-graph-legend" hidden></div>
  <div class="kb-graph__ui kb-graph-zoom" hidden></div>
  <div class="kb-graph-tooltip" hidden></div>
  <div class="kb-graph__ui kb-graph-panel" hidden></div>
  <div class="kb-graph-recenter" hidden></div>
  <div class="kb-graph-empty" hidden>…</div>
</div>
<div class="kb-graph-dock" hidden></div>
```

### 6.2 The legend with its collapse

```html
<div class="kb-graph__ui kb-graph-legend">
  <button class="kb-graph-legend__toggle" type="button" aria-expanded="true">Projects · 프로젝트
    <svg class="kb-graph-legend__caret" width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
      aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
  </button>
  <div class="kb-graph-legend__body">
    <!-- today's rows, rule, tag row, unresolved row and note, unchanged -->
  </div>
</div>
```

### 6.3 The panel, project mode

```html
<div class="kb-graph__ui kb-graph-panel kb-graph-panel--project">
  <div class="kb-graph-panel__eyebrow">
    <span class="kb-graph-legend__chip" style="--chip: var(--kb-graph-project-1)"></span>Project
    <button class="kb-graph-panel__close" type="button" title="Close" aria-label="Close">✕</button>
  </div>
  <h3 class="kb-graph-panel__title">Ingest pipeline</h3>
  <div class="kb-graph-panel__count">12 documents · 31 links</div>
  <ul class="kb-graph-panel__list">
    <li><a class="kb-graph-panel__doc" href="/documents/{id}">
      <span class="kb-graph-panel__doctitle">Ingest API — rate limits and retries</span>
      <span class="kb-graph-panel__docmeta">2026-09-18 · 3 tags</span>
    </a></li>
    <!-- five -->
  </ul>
  <div class="kb-graph-panel__foot">
    <a class="kb-graph-panel__read" href="/documents?project={id}">All documents →</a>
    <a class="kb-graph-panel__read" href="/projects/{id}">Open project →</a>
  </div>
</div>
```

With no rows, the `<ul>` is replaced by `<p class="kb-graph-panel__empty">No documents in this project
yet.</p>` and the foot stays.

### 6.4 The public panel's gate

Replaces `<a class="kb-graph-panel__read">` when the document is not public:

```html
<div class="kb-graph-panel__gate">
  <span>Members only · 비공개 문서</span>
  <a href="/login?next=/@{org}/documents/{id}">Sign in to read →</a>
</div>
```

Public tag pills:

```html
<li><button class="kb-tag" type="button" aria-pressed="false">api</button></li>
```

### 6.5 The dock

```html
<div class="kb-graph-dock">
  <div class="kb-graph-dock__scroll">
    <button class="kb-graph-dock__item" type="button" data-project="Ingest pipeline" aria-pressed="false">
      <span class="kb-graph-legend__chip" style="--chip: var(--kb-graph-project-1)"></span>Ingest pipeline
      <span class="kb-graph-legend__count">12</span>
    </button>
    <!-- one per project, then: -->
    <span class="kb-graph-dock__item">
      <span class="kb-graph-legend__chip kb-graph-legend__chip--ring"></span>Tags · 태그
      <span class="kb-graph-legend__count">9</span>
      <button class="kb-graph-switch is-on" type="button" data-switch="tags"
        aria-label="Toggle tag visibility" aria-pressed="true"></button>
    </span>
    <span class="kb-graph-dock__item">
      <span class="kb-graph-legend__chip kb-graph-legend__chip--ghost"></span>Unresolved
      <span class="kb-graph-legend__count">3</span>
    </span>
  </div>
  <p class="kb-graph-dock__note">Size = connections · 크기=연결 수</p>
</div>
```

Lit project: `class="kb-graph-dock__item is-on" aria-pressed="true"`; the others gain `is-off`.

### 6.6 The recenter pill

```html
<div class="kb-graph-recenter">Off the map · 지도 밖입니다
  <button type="button" class="kb-appbtn kb-appbtn--secondary kb-appbtn--sm">Fit</button>
</div>
```

### 6.7 Loading

```html
<div class="kb-graph-empty kb-graph-empty--load">
  <div class="kb-graph-skel"><span class="kb-graph-skel__dot"></span></div>
  <div class="kb-graph-empty__sub">Drawing the map · 지도를 그리는 중</div>
</div>
```

---

## 7. Accessibility and motion

- **Targets.** Every control on a small or medium plate is at least `var(--kb-tap)` (44px): the dock pills,
  the Fit button, the panel close, the read link, the document rows.
- **State.** `aria-expanded` on the legend toggle; `aria-pressed` on dock pills, the tag switch and public
  tag lenses; the panel keeps its `aria-label`led close button.
- **Order.** The dock follows the plate in the DOM, so the reading order is map → controls. The canvas
  keeps `role="img"` and `GRAPH.canvasLabel`.
- **Keyboard.** Unchanged plus: the legend toggle and the dock are in the tab order; `Esc` closes the panel
  from anywhere in the plate.
- **Reduced motion.** The sheet's rise and the loading pulse are inside
  `@media (prefers-reduced-motion: no-preference)`; the engine's existing settled-on-frame-one, no-mingle,
  snapped pan/zoom behaviour is unchanged.
- **Contrast.** `graph.css` tints every `<a>` in the plate teal, which would repaint an
  `<a class="kb-appbtn">` in a plate state teal-on-teal. §6 of the stylesheet restores each button
  variant's own ink; keep those rules if you add any button to the plate.

---

## 8. Acceptance checks

1. **390 portrait.** Plate 26rem. No legend on the plate; the dock is under it, one scrollable row, every
   pill ≥ 44px. Zoom stack shows Fit only, round and raised. Tap a node → the sheet rises from the bottom
   edge, ≤ 60% of the plate, and the node sits above it.
2. **390 landscape (844×390).** Nothing is off-screen: the plate is still 26rem and the page scrolls.
   Today's build puts a 480px plate in a 332px hole.
3. **768.** Plate 30rem. Legend on the plate at 10rem, zoom buttons 44px, panel 15rem, everything inside
   the plate's bounds.
4. **1180.** Identical to today's desktop arrangement, plus the legend's collapse caret, plus up to eight
   always-on labels, plus the panel capped to the plate with internal scroll.
5. **The lens.** Click a project in the legend or the dock → the map dims everything else *and* the panel
   shows that project's five newest documents. Click it again → both clear.
6. **Restore.** Load `/graph` on a desktop window, pan away, reload → the view returns. Narrow the window
   past 52rem and reload → the map fits instead of restoring. In neither case is content off the frame.
7. **Off the map.** Pan until the field leaves the plate → the pill appears; press Fit → it disappears and
   the map is fitted with an 8% margin.
8. **Public.** `/@{org}/graph` with no session: a node opens the panel; the read link points inside
   `/@{org}` or is replaced by the gate; a tag pill lights a lens and navigates nowhere.
9. **Dark.** Set the OS to dark with no stored preference: the plate is `#16130f`, the nodes are the slate
   inks, and the overlays match the console. Flip the OS while the tab is open → the map re-inks.
10. **Empty, loading, failed.** Each renders inside the plate with the page frame intact above it; the
    empty state paints at the right size (it is now sized before the early return).

---

## 9. Collected edits

| File | Change |
| --- | --- |
| `web/src/app/(app)/graph/graph-r5.css` | **new** — §3 verbatim |
| `web/src/app/(app)/graph/graph-canvas.tsx` | import the stylesheet; §4.1–4.8; render the dock as a sibling; accept a `publicBase` prop |
| `web/src/app/(app)/graph/page.tsx` | no change |
| `web/src/app/(public)/[org]/graph/page.tsx` | pass `publicBase="/@{org}"` |
| `web/src/app/(public)/graph/[org]/page.tsx` | pass `publicBase="/graph/{org}"` |
| `web/src/content/graph.ts` | the keys in §5 |
| — | §3 also carries one shell line the map is the first surface to need: `.kb-app--public .kb-app-layout { grid-template-columns: minmax(0, 1fr) }`. Round 04 capped and centred public main but left the two-column rail grid in place, so a public page at a desktop width put main in the 15rem rail track. |

**Still open, carried into P28:** the operator's screenshot of the wires off the frame was not attached to
this round. §4.2 is designed so that the reported state cannot be a *default* — but it is a behaviour
contract, not a diagnosis. If the defect survives it, capture the stored `sessionStorage` record and the
plate's measured size at first paint before changing anything else.
