# Round 03 — implementation contract (build prompt)

**Phase/slice:** P27.S2 → applied in P28 · **Round:** 03-foundation · **Date:** 2026-09-21
**Design project:** Knowledge Base Design System `623bb4ea-8fb7-4d31-9d58-5c6a42709bbe`
**Record of decisions and reasoning:** `result.md` beside this file.

This document is written for an implementer who cannot open the design pane. Everything needed to build the
round is here, including both stylesheets verbatim. **Invent nothing.** Where a value is not stated, the
shipped value at commit `34c5aa9` stands.

---

## 0. The one structural rule

The console responds to **its container**, not the viewport.

- `.kb-app` → `container: kbapp / inline-size` — shell decisions (topbar composition, rail vs. navbar, gutters).
- `.kb-app-main` → `container: kbmain / inline-size` — content decisions (page frame, tile grid, tables, search).

Every responsive rule in this round is an `@container` query. Do not convert any of them to `@media`. The
rail is 15rem and folds: at a 1100px viewport with the rail expanded, main is 860px, and a viewport query at
`lg` would keep a two-column dashboard that no longer fits. The two token values `--kb-bp-tablet: 40rem` and
`--kb-bp-desktop: 64rem` are the same numbers as Tailwind `sm` and `lg`, so utilities and the `.kb-*` layer
never disagree — but the `.kb-*` layer queries containers.

Named widths:

| Name | Range | Shell |
| --- | --- | --- |
| phone | `< 40rem` (<640px) | One column. Bottom navbar. No rail, no rail toggle. |
| tablet | `40–64rem` (640–1023px) | One column. Navbar as a sticky strip under the topbar. |
| desktop | `>= 64rem` (>=1024px) | `[ rail \| main ]`. Navbar gone. The manual fold applies. |
| wide | `>= 90rem` (>=1440px) | Main capped at 88rem and centred; gutter opens to 2.4rem. |

`--breakpoint-xs: 30rem` in `globals.css:182` stays unused. The single `min-[720px]:` on the documents page
is **deleted** and replaced by `.kb-searchbar`.

---

## 1. Files

| Action | Path | Notes |
| --- | --- | --- |
| **Append** | `web/src/app/kb-tokens.css` | Add the Round 03 block in §2 verbatim, at the end. Additive only — change nothing above it, and add the `/* @kind other */` comment to the existing `--kb-ease` line. |
| **Create** | `web/src/app/kb-console-responsive.css` | The stylesheet in §3, verbatim. |
| **Edit** | `web/src/app/globals.css` | `@import` the new file **after** `kb-console.css`. It is unlayered like the rest of the `.kb-*` layer and outranks Tailwind utilities. |
| **Do not touch** | `web/src/app/kb-console.css` | Verbatim copy of the P12 handback. Appending to it would falsify its header. |
| **Do not touch** | `web/src/components/app-shell/app-frame.css` | Still owns `[data-rail="collapsed"]`. Unchanged. |

---

## 2. Token additions — append verbatim to `kb-tokens.css`

Also change the existing line `  --kb-ease: 0.15s ease;` to `  --kb-ease: 0.15s ease; /* @kind other */`.

```css
/* --------------------------------------------------------------------------
   ROUND 03 (P27.S2) — the responsive foundation. ADDITIVE ONLY: no value above
   this line changed, so the `shipped/` baseline renders identically. Every name
   below is new; nothing was renamed.

   The console responds to its CONTAINER, not the viewport (see
   console-responsive.css) — the rail and its fold change main's width by 15rem,
   so a viewport query gets the content wrong at exactly the widths that matter.
   The breakpoints below are therefore measured on `.kb-app` (shell decisions)
   and `.kb-app-main` (content decisions), and are deliberately the same numbers
   as Tailwind's `sm` / `lg` / (custom) `2xl` so utilities and the `.kb-*` layer
   never disagree.
   -------------------------------------------------------------------------- */
:root {
  /* ---- Named breakpoints ---- */
  --kb-bp-tablet: 40rem;  /* 640px — phone ends, tablet begins */
  --kb-bp-desktop: 64rem; /* 1024px — the rail returns */
  --kb-bp-wide: 90rem;    /* 1440px — content stops growing, gutters open up */

  /* ---- Layout ---- */
  --kb-app-gutter: 1.7rem;
  --kb-app-gutter-phone: 1.05rem;
  --kb-app-gutter-wide: 2.4rem;
  --kb-app-max-w: 88rem;
  --kb-app-navbar-h: 3.6rem;
  --kb-tap: 2.75rem; /* 44px — the minimum touch target below --kb-bp-tablet */

  /* ---- Fluid display ramp (container-relative; `cqi` resolves on kbmain) ---- */
  --kb-app-title-size: clamp(1.35rem, 1.05rem + 1.6cqi, 1.65rem);
  --kb-app-h2-size: clamp(1.02rem, 0.95rem + 0.35cqi, 1.15rem);
  --kb-tile-num-size: clamp(1.9rem, 1.55rem + 1.9cqi, 2.35rem);
  --kb-editorial-size: clamp(1.5rem, 1.1rem + 2cqi, 2.2rem);

  /* ---- Focus ring ---- */
  --kb-focus-w: 2px;
  --kb-focus-offset: 2px;

  /* ---- Motion (settled state is the CSS default; loops never) ---- */
  --kb-ease-out: cubic-bezier(0.2, 0.7, 0.3, 1); /* @kind other */
  --kb-dur-reveal: 0.42s; /* @kind other */

  /* ---- Elevation — two named lifts, replacing the inline rgba() literals ---- */
  --kb-shadow-raise: 0 0.6rem 1.4rem rgba(38, 33, 28, 0.12);
  --kb-shadow-overlay: 0 1.4rem 3rem rgba(38, 33, 28, 0.22);
  --kb-scrim: rgba(38, 33, 28, 0.42);
}

[data-md-color-scheme="slate"] {
  --kb-shadow-raise: 0 0.6rem 1.4rem rgba(0, 0, 0, 0.45);
  --kb-shadow-overlay: 0 1.4rem 3rem rgba(0, 0, 0, 0.6);
  --kb-scrim: rgba(0, 0, 0, 0.58);
}
```

---

## 3. `kb-console-responsive.css` — the whole file, verbatim

```css
/* ==========================================================================
   Knowledge Base — Console RESPONSIVE layer  (Round 03 · P27.S2)
   --------------------------------------------------------------------------
   Sits on top of kb-console.css. It adds nothing to the palette and renames
   nothing; it gives the console the behaviour it has never had: a phone, a
   tablet and a desktop.

   THE ONE STRUCTURAL DECISION — the console responds to its CONTAINER, not the
   viewport. `.kb-app` is the shell container (`kbapp`) and `.kb-app-main` is
   the content container (`kbmain`). The rail is 15rem wide and folds, so at
   1100px a viewport query calls the content "desktop" while main is actually
   860px — the exact width where the two-column dashboard breaks. Container
   queries get it right in every rail state, and they make each specimen honest:
   a 390px-wide `.kb-app` on a 1280px card renders the real phone layout.

   Breakpoints (on the container): < 40rem phone · 40–64rem tablet ·
   >= 64rem desktop · >= 90rem wide. Same numbers as Tailwind sm / lg.

   Load order: kb-tokens.css → kb-console.css → app-frame.css → THIS.
   Like the rest of the `.kb-*` layer it is unlayered and outranks Tailwind
   utilities; do not try to override it with `md:` classes.
   ========================================================================== */

/* -------- Containers ------------------------------------------------------ */
.kb-app { container: kbapp / inline-size; display: flex; flex-direction: column; min-height: 100dvh; }
.kb-app-main { container: kbmain / inline-size; }
.kb-app-layout { flex: 1 1 auto; }

/* -------- Dark scheme adoption (DECISION #4) ------------------------------ */
/* The console follows the operating system. The switch stays the locked
   `data-md-color-scheme` attribute; `data-kb-scheme="auto"` is the server's way
   of saying "nobody has chosen yet". When a preference control is added later it
   writes `light` | `dark` and this block simply stops matching. Scoped to
   `.kb-app` so the landing page (rounds 01/02, locked) is untouched. */
@media (prefers-color-scheme: dark) {
  .kb-app[data-kb-scheme="auto"] {
    --kb-paper: #1a1815; --kb-surface: #232019; --kb-surface-sunken: #2a261e;
    --kb-border: #38332a; --kb-border-strong: #453f34;
    --kb-accent: #62bdb2; --kb-accent-strong: #86d4ca; --kb-accent-soft: rgba(98, 189, 178, 0.2);
    --kb-tag-bg: #24302b; --kb-tag-fg: #97d2c7;
    --kb-ink: #ece4d7; --kb-secondary: #b6ad9d; --kb-hint: #7e7566;
    --kb-status-active: #62bdb2; --kb-status-active-soft: rgba(98, 189, 178, 0.18); --kb-status-active-ink: #86d4ca;
    --kb-status-idle: #c8a15e; --kb-status-idle-soft: rgba(200, 161, 94, 0.16); --kb-status-idle-ink: #d8b673;
    --kb-status-revoked: #d68a76; --kb-status-revoked-soft: rgba(214, 138, 118, 0.16); --kb-status-revoked-ink: #e0a08e;
    --kb-trend-fill-from: rgba(98, 189, 178, 0.22); --kb-trend-fill-to: rgba(98, 189, 178, 0);
    --kb-delta-down: #d68a76;
    --kb-shadow-raise: 0 0.6rem 1.4rem rgba(0, 0, 0, 0.45);
    --kb-shadow-overlay: 0 1.4rem 3rem rgba(0, 0, 0, 0.6);
    --kb-scrim: rgba(0, 0, 0, 0.58);
  }
  .kb-app[data-kb-scheme="auto"] .kb-appbtn--primary,
  .kb-app[data-kb-scheme="auto"] .kb-appbtn--danger { color: #16130f; }
  .kb-app[data-kb-scheme="auto"] .kb-chip { color: var(--kb-accent); }
}

/* -------- Focus floor (system-wide) --------------------------------------- */
.kb-app a:focus-visible, .kb-app button:focus-visible, .kb-app summary:focus-visible,
.kb-app input:focus-visible, .kb-app select:focus-visible, .kb-app textarea:focus-visible,
.kb-app [tabindex]:focus-visible { outline: var(--kb-focus-w) solid var(--kb-accent); outline-offset: var(--kb-focus-offset); }
.kb-field__input:focus-visible { outline: none; }
.kb-skip { position: absolute; left: 0.6rem; top: -3rem; z-index: 60; background: var(--kb-surface); border: 1px solid var(--kb-accent); border-radius: var(--kb-radius-sm); padding: 0.5rem 0.8rem; font-size: 0.85rem; font-weight: var(--kb-weight-semibold); color: var(--kb-accent-strong); text-decoration: none; transition: top var(--kb-ease); }
.kb-skip:focus { top: 0.6rem; }

/* -------- Motion: the one-shot reveal ------------------------------------- */
/* Settled state IS the CSS default — with reduced motion the element is simply
   there. No loops anywhere in the console. */
@media (prefers-reduced-motion: no-preference) {
  .kb-reveal-in { animation: kb-rise var(--kb-dur-reveal) var(--kb-ease-out) both; }
  @keyframes kb-rise { from { opacity: 0; transform: translateY(0.4rem); } to { opacity: 1; transform: none; } }
}

/* -------- Fluid display ramp (DECISION #6) -------------------------------- */
/* Display type is fluid; UI and body type are FIXED. Shrinking 0.82rem body
   text on a phone makes it unreadable — only the voice sizes move. */
.kb-app-title { font-size: var(--kb-app-title-size); }
.kb-app-h2 { font-size: var(--kb-app-h2-size); }
.kb-panel__head .kb-app-h2 { font-size: var(--kb-app-h2-size); }
.kb-tile__num { font-size: var(--kb-tile-num-size); }

/* -------- Shell: topbar --------------------------------------------------- */
.kb-topbar { position: sticky; top: 0; z-index: 40; }
.kb-topbar__user { max-width: 16rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Phone account disclosure — a native <details>, so it works with no JS, is
   keyboard-operable, and needs no focus trap. (DECISION #3) */
.kb-account { position: relative; display: none; }
.kb-account > summary { list-style: none; cursor: pointer; display: grid; place-items: center; width: 2.1rem; height: 2.1rem; border-radius: 50%; background: var(--kb-accent-soft); color: var(--kb-accent-strong); font-family: var(--kb-font-mono); font-size: 0.74rem; font-weight: 700; }
.kb-account > summary::-webkit-details-marker { display: none; }
.kb-account__menu { position: absolute; right: 0; top: calc(100% + 0.55rem); z-index: 50; min-width: 15rem; background: var(--kb-surface); border: 1px solid var(--kb-border-strong); border-radius: var(--kb-radius); box-shadow: var(--kb-shadow-overlay); padding: 0.85rem; }
.kb-account__email { font-family: var(--kb-font-mono); font-size: var(--kb-text-caption); color: var(--kb-ink); word-break: break-all; }
.kb-account__org { font-size: 0.84rem; color: var(--kb-secondary); margin-top: 0.3rem; }
.kb-account__menu .kb-appbtn { width: 100%; margin-top: 0.8rem; min-height: var(--kb-tap); }

/* -------- Shell: the navbar (DECISION #1) --------------------------------- */
/* ONE element, two placements. Phone: pinned to the bottom, thumb-reachable.
   Tablet: a sticky strip under the topbar. Desktop: gone, the rail is back.
   It sits immediately after the topbar in the DOM at every width, so the
   reading and tab order is always brand → navigation → content. */
.kb-navbar { display: none; background: var(--kb-surface-sunken); }
.kb-navbar__link { display: flex; align-items: center; justify-content: center; gap: 0.4rem; text-decoration: none; color: var(--kb-secondary); font-size: 0.82rem; font-weight: var(--kb-weight-medium); transition: color var(--kb-ease), background var(--kb-ease), border-color var(--kb-ease); }
.kb-navbar__link:hover { color: var(--kb-ink); }
.kb-navbar__link[aria-current="page"] { color: var(--kb-accent); font-weight: var(--kb-weight-semibold); background: var(--kb-accent-soft); }

/* -------- Phone  (< 40rem) ------------------------------------------------ */
@container kbapp (width < 40rem) {
  .kb-app-layout { grid-template-columns: minmax(0, 1fr); }
  .kb-app-layout > .kb-rail { display: none; }
  .kb-railtoggle { display: none; }
  .kb-topbar { padding: 0 var(--kb-app-gutter-phone); gap: 0.6rem; }
  .kb-topbar__divider, .kb-topbar__crumb, .kb-topbar__user, .kb-topbar__signout { display: none; }
  .kb-account { display: block; }
  .kb-app-main { padding: 1.1rem var(--kb-app-gutter-phone) 1.6rem; }
  .kb-navbar { display: grid; order: 2; position: sticky; bottom: 0; z-index: 30; grid-auto-flow: column; grid-auto-columns: 1fr; border-top: 1px solid var(--kb-border); padding-bottom: env(safe-area-inset-bottom, 0px); }
  .kb-navbar__link { flex-direction: column; gap: 0.15rem; min-height: var(--kb-app-navbar-h); padding: 0.45rem 0.3rem; border-top: 2px solid transparent; }
  .kb-navbar__link[aria-current="page"] { border-top-color: var(--kb-accent); }
  /* Density (DECISION #7): gutters tighten, targets grow, sections separate. */
  .kb-appbtn { min-height: var(--kb-tap); padding: 0.55rem 1rem; }
  .kb-appbtn--sm { min-height: 2.4rem; padding: 0.4rem 0.75rem; }
  .kb-field__input { min-height: var(--kb-tap); font-size: 1rem; } /* 16px — stops iOS zooming the page on focus */
  .kb-check input { width: 1.25rem; height: 1.25rem; }
  .kb-panel { padding: 1rem 1.05rem; border-radius: var(--kb-radius); }
  .kb-rail__link, .kb-navbar__link { -webkit-tap-highlight-color: transparent; }
}
/* The navbar is after the topbar in the DOM at every width. At phone width the
   flex `order` moves it below the content visually while tab order stays
   brand → navigation → content; `.kb-app` is a flex column so the bar can be
   `position: sticky` rather than `fixed` (no safe-area guesswork, no overlay). */
@container kbapp (width < 40rem) { .kb-app-layout { order: 1; } }

/* -------- Tablet  (40–64rem) ---------------------------------------------- */
@container kbapp (width >= 40rem) and (width < 64rem) {
  .kb-app-layout { grid-template-columns: minmax(0, 1fr); }
  .kb-app-layout > .kb-rail { display: none; }
  .kb-railtoggle { display: none; }
  .kb-topbar { padding: 0 1.4rem; }
  .kb-topbar__user { max-width: 11rem; }
  .kb-navbar { display: grid; position: sticky; top: var(--kb-app-topbar-h); z-index: 20; grid-auto-flow: column; grid-auto-columns: max-content; justify-content: start; gap: 0.25rem; padding: 0.4rem 1.4rem; border-bottom: 1px solid var(--kb-border); }
  .kb-navbar__link { padding: 0.45rem 0.85rem; min-height: 2.5rem; border-radius: var(--kb-radius-sm); }
  .kb-app-main { padding: 1.35rem 1.4rem 2.2rem; }
}

/* -------- Desktop  (>= 64rem) --------------------------------------------- */
@container kbapp (width >= 64rem) {
  .kb-navbar { display: none; }
  /* The operator's manual fold (kb_rail cookie) is desktop-only and unchanged
     (DECISION #2) — app-frame.css still owns `[data-rail="collapsed"]`. */
}
@container kbapp (width >= 90rem) {
  .kb-app-main { padding: 2rem var(--kb-app-gutter-wide) 3rem; max-width: var(--kb-app-max-w); margin-inline: auto; width: 100%; }
}

/* -------- Page frame ------------------------------------------------------ */
/* The eyebrow/title/sub block and the action row beside it. Today this is an
   ad-hoc inline flex on every page and the actions collide with the title. */
.kb-pageframe { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.3rem; }
.kb-pageframe__actions { display: flex; align-items: center; gap: 0.5rem; flex: none; }
.kb-pageframe__title-wrap { min-width: 0; }
@container kbmain (width < 40rem) {
  .kb-pageframe { flex-direction: column; align-items: stretch; gap: 0.9rem; margin-bottom: 1.1rem; }
  .kb-pageframe__actions { width: 100%; }
  .kb-pageframe__actions > .kb-appbtn { flex: 1 1 auto; }
}

/* -------- Content columns ------------------------------------------------- */
.kb-app-cols { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr); gap: var(--kb-space-md); }
@container kbmain (width < 64rem) { .kb-app-cols { grid-template-columns: minmax(0, 1fr); } }

/* -------- Tiles + trend --------------------------------------------------- */
@container kbmain (width < 40rem) {
  .kb-tile-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.7rem; }
  .kb-tile { padding: 0.8rem 0.85rem 0.85rem; }
}
.kb-trend-wrap { height: clamp(6rem, 3.6rem + 9cqi, 8.5rem); }

/* -------- Tables (DECISION #5) -------------------------------------------- */
/* Column priority first, stacked rows last. `data-pri="3"` columns leave at
   tablet; below 40rem the table becomes one card per row, each cell labelled
   from `data-label`. The <thead> stays in the accessibility tree. */
@container kbmain (width < 64rem) { .kb-dtable [data-pri="3"] { display: none; } }
@container kbmain (width < 40rem) {
  .kb-dtable { overflow: visible; border: 0; background: transparent; border-radius: 0; }
  .kb-dtable table { display: block; }
  .kb-dtable thead { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .kb-dtable tbody { display: flex; flex-direction: column; gap: 0.6rem; }
  .kb-dtable tr { display: block; background: var(--kb-surface); border: 1px solid var(--kb-border); border-radius: var(--kb-radius); padding: 0 0.9rem; }
  .kb-dtable tbody tr:hover { background: var(--kb-surface); }
  .kb-dtable td { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; padding: 0.45rem 0; border-bottom: 0; text-align: left; }
  .kb-dtable td::before { content: attr(data-label); font-family: var(--kb-font-mono); font-size: 0.6rem; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: var(--kb-hint); flex: none; }
  .kb-dtable tr > td:first-child { display: block; padding: 0.75rem 0 0.6rem; border-bottom: 1px solid var(--kb-border); font-size: 0.98rem; }
  .kb-dtable tr > td:first-child::before { content: none; }
  .kb-dtable tr > td:first-child { padding-top: 0.75rem; }
  .kb-dtable tr > td:last-child { padding-bottom: 0.8rem; }
  .kb-dtable tr > td:last-child.right { justify-content: flex-start; }
  .kb-dtable tr > td:last-child.right::before { content: none; }
  .kb-dtable tr > td:last-child .kb-appbtn { width: 100%; }
  .kb-dtable__empty td { display: block; padding: 2.2rem 1rem; text-align: center; }
  .kb-dtable__empty td::before { content: none; }
}

/* -------- Search ---------------------------------------------------------- */
.kb-searchbar { display: flex; align-items: center; gap: 0.6rem; }
.kb-searchbar__field { flex: 1 1 auto; min-width: 0; }
.kb-searchbar__filter { flex: none; width: 12rem; }
.kb-searchbar__filter .kb-field__input { min-height: 2.45rem; padding: 0.45rem 0.7rem; font-size: 0.9rem; }
@container kbmain (width < 40rem) {
  .kb-searchbar { flex-direction: column; align-items: stretch; gap: 0.5rem; }
  .kb-searchbar__filter { width: 100%; }
  .kb-searchbar__filter .kb-field__input { min-height: var(--kb-tap); font-size: 1rem; }
}

/* -------- Editorial full-page states (DECISION #8) ------------------------ */
/* Error / not-found / signed-out: no panel, no illustration. The page speaks in
   Fraunces on bare paper, with one teal way forward. A failed SECTION inside a
   working page uses `.kb-panel` + `.kb-editorial` together instead. */
.kb-editorial { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.6rem; padding: clamp(2.5rem, 1rem + 8cqi, 5.5rem) 1.2rem; }
.kb-editorial__code { font-family: var(--kb-font-mono); font-size: 0.66rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--kb-hint); }
.kb-editorial__title { font-family: var(--kb-font-display); font-weight: var(--kb-weight-semibold); font-size: var(--kb-editorial-size); line-height: var(--kb-leading-display); letter-spacing: var(--kb-tracking-display); color: var(--kb-ink); margin: 0; text-wrap: pretty; }
.kb-editorial__sub { font-size: 0.95rem; line-height: var(--kb-leading-snug); color: var(--kb-secondary); max-width: 30rem; margin: 0; text-wrap: pretty; }
.kb-editorial__actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.6rem; margin-top: 0.6rem; }
.kb-editorial__detail { font-family: var(--kb-font-mono); font-size: var(--kb-text-caption); color: var(--kb-hint); margin: 1rem 0 0; }
.kb-panel > .kb-editorial { padding: 2rem 1rem; }
@container kbmain (width < 40rem) { .kb-editorial__actions { flex-direction: column; align-self: stretch; } .kb-editorial__actions > .kb-appbtn { width: 100%; } }

/* -------- Skeleton composition -------------------------------------------- */
.kb-skel-line { height: 0.75rem; }
.kb-skel-line + .kb-skel-line { margin-top: 0.55rem; }
.kb-skel-tile { height: 6.2rem; border-radius: var(--kb-radius); }
.kb-skel-row { height: 2.9rem; border-radius: 0; }
.kb-skel-stack { display: flex; flex-direction: column; gap: 1px; border: 1px solid var(--kb-border); border-radius: var(--kb-radius); overflow: hidden; }

/* -------- Toast ----------------------------------------------------------- */
/* The toast region is the ONE overlay that is not a child of `.kb-app`: it is a
   sibling at the layout root, because `.kb-app` is a container and would become
   its containing block, pinning the toast to the bottom of the document instead
   of the bottom of the screen. It therefore queries the VIEWPORT, which is what
   an overlay should query anyway. It carries the scheme attributes itself. */
.kb-toast { box-shadow: var(--kb-shadow-raise); }
.kb-toast-region { position: fixed; z-index: 55; right: 1.2rem; bottom: 1.2rem; display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-end; }
@media (width < 40rem) {
  .kb-toast-region { left: var(--kb-app-gutter-phone); right: var(--kb-app-gutter-phone); bottom: calc(var(--kb-app-navbar-h) + 0.7rem + env(safe-area-inset-bottom, 0px)); align-items: stretch; }
  .kb-toast { width: 100%; }
}

/* -------- Field extensions (textarea + select had no specimen) ------------ */
textarea.kb-field__input { min-height: 7rem; line-height: var(--kb-leading-snug); resize: vertical; padding: 0.7rem 0.8rem; }
select.kb-field__input { appearance: none; padding-right: 2.1rem; background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%238f8676' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>"); background-repeat: no-repeat; background-position: right 0.7rem center; }
.kb-app[data-md-color-scheme="slate"] select.kb-field__input, [data-md-color-scheme="slate"] select.kb-field__input { background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%237e7566' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>"); }
.kb-form-actions { display: flex; gap: 0.5rem; margin-top: 1rem; }
@container kbmain (width < 40rem) { .kb-form-actions > .kb-appbtn { flex: 1 1 auto; } }

/* -------- Busy button ----------------------------------------------------- */
.kb-appbtn[aria-busy="true"] { cursor: progress; }
.kb-appbtn__spin { width: 0.85em; height: 0.85em; border-radius: 50%; border: 1.5px solid currentColor; border-top-color: transparent; flex: none; }
@media (prefers-reduced-motion: no-preference) {
  .kb-appbtn__spin { animation: kb-spin 0.7s linear infinite; }
  @keyframes kb-spin { to { transform: rotate(360deg); } }
}

/* -------- Overlay / reveal ------------------------------------------------ */
.kb-reveal-overlay { background: var(--kb-scrim); }
.kb-reveal { box-shadow: var(--kb-shadow-overlay); }
@container kbapp (width < 40rem) { .kb-reveal__actions { flex-direction: column-reverse; } .kb-reveal__actions .kb-appbtn { width: 100%; } }

/* -------- Specimen-only state aliases (not used in production) ------------ */
.kb-appbtn.is-focus, .kb-rail__link.is-focus, .kb-navbar__link.is-focus,
.kb-account > summary.is-focus, .kb-skip.is-focus { outline: var(--kb-focus-w) solid var(--kb-accent); outline-offset: var(--kb-focus-offset); }
.kb-skip.is-focus { top: 0.6rem; }
.kb-navbar__link.is-hover { color: var(--kb-ink); }
```

---

## 4. Markup changes, component by component

### 4.1 Shell — `components/app-shell/app-shell.tsx`, `app-frame.tsx`

Order inside `.kb-app`, **at every width**:

```
.kb-app
├── a.kb-skip                 (new)
├── header.kb-topbar
├── nav.kb-navbar             (new, aria-label="Primary")
└── div.kb-app-layout[data-rail]
    ├── aside#kb-rail.kb-rail   (nav inside: aria-label="Sections")
    └── main#content.kb-app-main

div.kb-toast-region              (new, SIBLING of .kb-app at the layout root)
```

- The navbar is **always after the topbar in the DOM**. CSS `order` moves it below the content visually on a
  phone; tab order stays brand → navigation → content.
- `.kb-app` root also carries `data-kb-scheme="auto"` (see §6).
- `.kb-skip` → `<a class="kb-skip" href="#content">` with the copy from `content/app.ts`. Target the `<main>`.
- The two navs must keep **different `aria-label`s** — both are always in the DOM even though only one is
  ever visible.

### 4.2 Topbar

Render everything at every width; CSS decides what shows.

```html
<header class="kb-topbar">
  <button class="kb-appbtn kb-appbtn--ghost kb-appbtn--sm kb-railtoggle" …>   <!-- unchanged -->
  <a class="kb-topbar__brand" …>
  <span class="kb-topbar__divider"></span>
  <span class="kb-topbar__crumb">Org <b>{org}</b></span>
  <span class="kb-topbar__spacer"></span>
  <span class="kb-topbar__user">{email}</span>
  <button class="kb-appbtn kb-appbtn--ghost kb-appbtn--sm kb-topbar__signout">Sign out</button>
  <details class="kb-account">
    <summary aria-label="Account menu">{initial}</summary>
    <div class="kb-account__menu">
      <div class="kb-account__email">{email}</div>
      <div class="kb-account__org">Org <b>{org}</b></div>
      <button class="kb-appbtn kb-appbtn--secondary kb-appbtn--sm">Sign out</button>
    </div>
  </details>
</header>
```

- `.kb-topbar__signout` is a **new class on the existing button** — that is what the phone rule hides.
- The anonymous shell's Sign in uses `.kb-topbar__signin` and is **never hidden**.
- `{initial}` is the first character of the email's local part, uppercased.
- Height is 3.5rem at every width; the topbar never wraps.
- The menu is plain `<details>`. No JS, no focus trap, no scrim. Close-on-outside-click is optional polish,
  not required.

### 4.3 Navigation — new `components/app-shell/navbar-nav.tsx`

```html
<nav class="kb-navbar" aria-label="Primary">
  <a class="kb-navbar__link" href="/dashboard" aria-current="page">Dashboard</a>
  <a class="kb-navbar__link" href="/documents">Documents</a>
  <a class="kb-navbar__link" href="/graph">Graph</a>
</nav>
```

- Same three destinations and the same labels as `rail-nav.tsx`, from `content/app.ts`. No icons.
- `aria-current="page"` is the source of truth for the active state.
- The rail keeps the `kb_rail` cookie and `data-rail` exactly as today. **The responsive layer never writes
  `data-rail`.** Below 64rem the rail is `display: none` and the toggle is hidden.

### 4.4 Page frame — every console page

Replace the ad-hoc inline flex with:

```html
<div class="kb-pageframe">
  <div class="kb-pageframe__title-wrap">
    <div class="kb-app-eyebrow">{org} · {context}</div>
    <h1 class="kb-app-title">{title}</h1>
    <p class="kb-app-sub">{sub}</p>
  </div>
  <div class="kb-pageframe__actions">…at most two buttons, at most one primary…</div>
</div>
```

The eyebrow carries the **org first** on every page — on a phone it is the only place the org is visible.

### 4.5 Dashboard two-column block

`<div class="kb-app-cols">` replaces the inline `grid-template-columns: minmax(0,1.7fr) minmax(0,1fr)`.

### 4.6 Tables — `components/ui/data-table.tsx`

Column definitions gain `priority: 1 | 2 | 3`. The renderer emits, on **every** `<th>` and `<td>`:

- `data-pri="{priority}"`
- `data-label="{column.header}"` on `<td>` only, **except** the first column and the action column.

Priorities for the three real tables:

| Table | 1 · always | 2 · tablet and up | 3 · desktop only |
| --- | --- | --- | --- |
| Projects | Project, Action | Docs, Visibility, Last used | Keys, Created |
| Documents | Title, Actions | Project, Date | Tags |
| Credentials | Key, Status | Last used | Created |

No page writes `data-pri`/`data-label` by hand. Do not add a horizontal-scroll affordance; the CSS removes
the scroll below 40rem.

### 4.7 Fields — `components/ui/field.tsx`

- `<textarea>` and `<select>` use `.kb-field__input`; the CSS gives them their own height and chevron.
- The error paragraph is rendered **always**, even when empty, so the reserved 1.1rem holds.
- `aria-invalid` + `aria-describedby` on error.

### 4.8 Search — `app/(app)/documents/page.tsx`

```html
<div class="kb-searchbar">
  <div class="kb-searchbar__field"><div class="kb-appsearch">…input… <span class="kb-appsearch__key">/</span></div></div>
  <div class="kb-searchbar__filter"><select class="kb-field__input" aria-label="Filter by project">…</select></div>
</div>
```

Delete the `min-[720px]:` utility. The `/` hint stays in the DOM; hide it below 40rem if you prefer, it is
cosmetic either way.

### 4.9 Buttons — `components/ui/app-button.tsx`

New busy state: `aria-busy="true"` plus a leading `<span class="kb-appbtn__spin" aria-hidden="true"></span>`
and a present-participle label ("Creating…", "Minting…"). Do not also set `disabled` — `aria-busy` plus
`pointer-events` handling in the form is enough, and a disabled button drops out of the tab order mid-action.

---

## 5. States — new pages

### 5.1 Editorial (a whole page failed)

```html
<main class="kb-app-main">
  <div class="kb-editorial">
    <div class="kb-editorial__code">Not found · 404</div>
    <h1 class="kb-editorial__title">{one sentence, Fraunces}</h1>
    <p class="kb-editorial__sub">{one or two sentences}</p>
    <div class="kb-editorial__actions">{one primary, optionally one ghost}</div>
    <p class="kb-editorial__detail">ref {id} · {timestamp}</p>   <!-- errors only -->
  </div>
</main>
```

**The shell stays.** Topbar, navbar and rail all render. Losing the rail as well as the page is the
difference between "this page failed" and "the app is gone".

Apply to: a new `app/(app)/error.tsx`, the six existing `not-found.tsx` files, and the public
`documents/[id]/not-found.tsx` (which renders inside the anonymous shell, with **Sign in** as the primary).
All copy goes in `web/src/content/*` like every other string.

- 500 → primary is **Try again**, ghost is **Back to dashboard**, plus the mono `ref` line (selectable).
- 404 → primary is the nearest list (All documents / Dashboard), no `ref` line.

### 5.2 In-frame failure (one section failed)

The same `.kb-editorial` block **inside the `.kb-panel` that failed** (`<div class="kb-panel" style="padding:0">`),
with an `<h2>` at 1.15rem instead of the `<h1>`, and a single `sm` Retry. The rest of the page stays usable.

### 5.3 Empty

Unchanged `.kb-empty`, always **inside the panel whose contents are missing** — never editorial. The rule is
the whole distinction: **editorial = the page failed · panel = a part is waiting.**

### 5.4 Loading — `loading.tsx` per route

The skeleton mirrors the layout it replaces at the breakpoint it is standing in: four `.kb-skel-tile` on
desktop, two on a phone, card-shaped `7rem` blocks where the stacked table will land. `aria-busy="true"` on
the region, not on each block. Use `.kb-skel` + `.kb-skel-line` / `.kb-skel-tile`.

### 5.5 Toast

```html
<div class="kb-toast-region" role="status" aria-live="polite">
  <div class="kb-toast kb-toast--success kb-reveal-in"><span class="kb-status__dot" aria-hidden="true"></span>{message}</div>
</div>
```

The region is a **root-level sibling of `.kb-app`**, not a child of it — `.kb-app` is a container and would
become its containing block, pinning the toast to the bottom of the document instead of the bottom of the
screen. It carries the scheme attributes itself and is the one rule in this round that queries the viewport
(`@media`), which is what an overlay should query. On a phone it sits **above** the navbar, never over it.

---

## 6. Dark scheme adoption

The root of the console shell renders both attributes:

```html
<div class="kb-app" data-md-color-scheme="default" data-kb-scheme="auto">
```

- `data-md-color-scheme` is unchanged and still the switch.
- `data-kb-scheme="auto"` means "nobody has chosen". The `prefers-color-scheme: dark` block in §3 only matches
  while it is `auto`.
- **Auth routes keep `data-md-color-scheme="slate"` and no `data-kb-scheme`.** They are always dark.
- The landing page is untouched — the block is scoped to `.kb-app`.
- No inline head script, no cookie, no flash. When a preference control is designed it writes
  `data-kb-scheme="light" | "dark"` and this rule stops matching on its own.

---

## 7. Accessibility floor

| Concern | Rule |
| --- | --- |
| Focus ring | 2px teal, 2px offset, `:focus-visible` only, on every interactive element. **Inputs are the exception** — they keep the teal border plus 3px soft-teal ring and take `outline: none`. |
| Focus order, phone | skip → brand → account summary → Dashboard → Documents → Graph → content. |
| Focus order, desktop | skip → rail toggle → brand → Sign out → rail links → content. |
| Hidden rail | `display: none` — out of the tab order **and** the accessibility tree. Never `visibility` or `width: 0`. |
| Hidden table header | `clip-path` visually-hidden — stays in the accessibility tree. Never `display: none`. |
| Touch targets | 44px (`--kb-tap`) below 40rem on buttons, inputs, checkboxes and nav links. `sm` buttons stay at 38px because they only ever appear inside a row that is itself the target. |
| iOS zoom | Inputs are 16px below 40rem. Non-negotiable. |
| Reduced motion | The settled state is the CSS default. The reveal does not run. The skeleton shimmer and the busy spinner stop. Colour/border transitions at 0.15s are kept. |
| Status | Encoded in **form** (filled dot / hollow ring / struck dot + struck label) before colour. Unchanged. |

---

## 8. Definition of done

1. `kb-tokens.css` carries the Round 03 block; nothing above it changed.
2. `kb-console-responsive.css` exists verbatim and is imported after `kb-console.css`.
3. At **390px**: bottom bar pinned, no rail, no toggle, account disclosure holds email + org + sign out,
   tiles 2-up, tables stacked as cards, page-frame actions full width, every target >=44px, inputs 16px.
4. At **768px**: navbar as a sticky strip under the topbar, no rail, priority-3 table columns gone.
5. At **1024px+**: rail back, navbar gone, the `kb_rail` fold works exactly as it did before this round.
6. At **1440px+**: main capped at 88rem and centred, gutter 2.4rem.
7. Resizing a **desktop** window from 1400 to 1100 with the rail expanded stacks `.kb-app-cols` — because
   `kbmain` crossed 64rem, not because the window did.
8. With the OS in dark mode the console is slate; the auth gate is still slate; the landing page is still light.
9. `error.tsx` and all seven not-found pages render `.kb-editorial` inside the shell.
10. With `prefers-reduced-motion: reduce`, nothing in the console moves except 150ms colour fades.
