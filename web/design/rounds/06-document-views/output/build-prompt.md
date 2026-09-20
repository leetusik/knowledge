# Round 06 — build prompt (the implementation contract)

**Phase/slice:** P27.S5 · **Round:** 06-document-views · **Date:** 2026-09-21
**Record:** `result.md` beside this file. **Brief:** `web/design/rounds/06-document-views/handoff.md`.

This file is self-contained: an engineer with no access to the design pane can build the round from it.
It carries the file map, the token delta, both stylesheets verbatim, the markup reference, the component
changes file by file, the accessibility additions, every new string with its key, and the acceptance
checks. **P28 implements from this file.**

**Additive only.** No existing `--kb-*` name or value changes. `kb-console.css`, `app-frame.css`,
`kb-console-responsive.css`, `console-r4.css` and `graph-r5.css` are never edited. Two files in the
repo have their bodies **replaced** by this round's delta, both of which were flagged at authoring time
as awaiting a design pass: `documents/[id]/prose.css` (P12) and `documents/[id]/explainer.css` (P16).

---

## 1. File map

| Path | Action |
| --- | --- |
| `web/src/app/kb-docview.css` | **new** — the screen layer (`docview-r6.css` verbatim, §3.1) |
| `web/src/app/kb-print.css` | **new** — the print layer (`print-r6.css` verbatim, §3.2) |
| `web/src/app/globals.css` | `@import` both, in that order, after `kb-console-r4.css` / `graph.css` |
| `web/src/app/(public)/documents/[id]/prose.css` | **deleted** — its rules move into `kb-docview.css` |
| `web/src/app/(public)/documents/[id]/explainer.css` | **deleted** — same |
| `web/src/app/(public)/documents/[id]/document-view.tsx` | edited — `<Meta>` → `.kb-docmeta`, header → `.kb-dochead`, body → `.kb-doc__body`, print blocks |
| `web/src/app/(public)/documents/[id]/markdown-body.tsx` | edited — table wrapper, link absolutizing, `data-bare` |
| `web/src/app/(public)/documents/[id]/explainer-frame.tsx` | edited — waiting line, 4s unmeasured timeout, relay failure states |
| `web/src/app/(public)/documents/[id]/version-history.tsx` | edited — `data-pri` / `data-label`, the `ok: false` failure panel |
| `web/src/app/(public)/documents/[id]/page.tsx` | edited — `.kb-doc`, `.kb-docbar`, `?view=full`, the two new controls |
| `web/src/app/(public)/[org]/[project]/[slug]/page.tsx` | edited — same, minus Copy link / Delete |
| `web/src/app/(public)/documents/[id]/versions/[v]/page.tsx` | edited — same, plus `.kb-docnotice` |
| `web/src/app/(public)/documents/[id]/export-pdf-button.tsx` | **new** — client island |
| `web/src/app/(public)/documents/[id]/full-width-exit.tsx` | **new** — client island |
| `web/src/app/(public)/documents/[id]/print-blocks.tsx` | **new** — server component: masthead + colophon |
| `web/src/content/documents.ts` | edited — ten new strings (§7) |

**Load order** (unchanged above the last two lines):

```
kb-tokens.css → kb-console.css → app-frame.css → kb-console-responsive.css
  → console-r4.css → graph-r5.css → kb-docview.css → kb-print.css
```

---

## 2. Token delta

All six names are new. Nothing is renamed and no existing value changes. They live in a `:root` block at
the top of `kb-docview.css` (§3.1) rather than in `kb-tokens.css`, matching round 05's `graph-r5.css`
precedent — the round's layer owns the round's names until a later round promotes them.

| Token | Value | What it is |
| --- | --- | --- |
| `--kb-explainer-h-phone` | `26rem` | Reserved frame height, `kbmain < 40rem` |
| `--kb-explainer-h-tablet` | `32rem` | Reserved frame height, `40–64rem` |
| `--kb-explainer-h-desktop` | `40rem` | Reserved frame height, `>= 64rem` |
| `--kb-explainer-h-unmeasured` | `70rem` | A frame that never reported a height; scrolls internally |
| `--kb-explainer-wait` | `4s` | How long before the unmeasured state is declared |
| `--kb-full-pad` | `1.5rem` | Body padding in the full-width view |
| `--kb-full-exit-size` | `2.75rem` | The exit pill's min-height (= `--kb-tap`) |

**Existing tokens this round starts using:** `--kb-measure` (42rem — declared at kb-tokens.css line 66,
referenced nowhere in `web/src` before this round) becomes the prose text track.
`--kb-app-read-w` (64rem) is unchanged and becomes the bleed track.

**Retired value:** `.kb-prose { max-width: 46rem; margin-inline: auto }` — deleted, not replaced. Do not
reintroduce a `max-width` on `.kb-prose`: the grid is the measure, and a cap on top of it silently
re-narrows the full track.

---

## 3. The stylesheets, verbatim

### 3.1 `kb-docview.css`

```css
/* ==========================================================================
   Knowledge Base — DOCUMENT VIEWS layer  (Round 06 · P27.S5)
   --------------------------------------------------------------------------
   Sits on top of console-r4.css (Round 04) and beside graph-r5.css (Round 05).
   It is the screen half of this round's delta; the paper half is print-r6.css,
   a separate file because it is a separate medium and a reviewer must be able
   to read the paper rules without reading these.

   ADDITIVE ONLY. No `--kb-*` name or value above this file changes, and
   console.css / app-frame.css / console-responsive.css / console-r4.css /
   graph-r5.css are never edited. In the repo this file REPLACES the bodies of
   `documents/[id]/prose.css` and `documents/[id]/explainer.css` — both were
   flagged at P12/P16 as on-token extensions awaiting a design pass, and this
   is that pass. Every value they had that survives is restated here.

   THE ONE STRUCTURAL DECISION — the reading column is a GRID, not a max-width.
   Three numbers disagreed: the article capped at 64rem, `.kb-prose` capped
   itself at 46rem, and `--kb-measure: 42rem` was declared and used nowhere.
   They disagreed because one width was being asked to do two jobs: hold a line
   of prose AND hold a code fence, a wide GFM table, a diagram. So the prose
   becomes a three-track grid — a centred TEXT track at `--kb-measure` and a
   FULL track at the article's own width — and each job gets the width it
   needs. 46rem is retired; 42rem finally has a use; 64rem is the bleed.

   Same container rule as rounds 03–05: every query is an `@container` query on
   `kbapp` (shell) or `kbmain` (content). There are no `@media` rules here
   except the two the platform requires (`prefers-reduced-motion`, and the
   coarse-pointer test that decides whether the exit pill advertises Esc).

   Load order: kb-tokens.css → kb-console.css → app-frame.css →
   kb-console-responsive.css → console-r4.css → graph-r5.css → THIS →
   print-r6.css.
   ========================================================================== */

/* -------- Round 06 tokens (all new names; nothing renamed) --------------- */
:root {
  /* The explainer frame before its height handshake lands. Flat per tier, like
     round 05's plate — never a viewport sum. A frame is a box we reserve, not
     a window we fill. */
  --kb-explainer-h-phone: 26rem;
  --kb-explainer-h-tablet: 32rem;
  --kb-explainer-h-desktop: 40rem;
  /* A document that never reports a height: a deterministic tall frame that
     scrolls internally, i.e. exactly the pre-handshake behaviour, chosen on
     purpose rather than inherited from a magic number. */
  --kb-explainer-h-unmeasured: 70rem;
  /* How long we wait for the reporter before saying so. */
  --kb-explainer-wait: 4s; /* @kind other */

  /* The full-width (chrome-less) view. */
  --kb-full-pad: 1.5rem;
  --kb-full-exit-size: 2.75rem;
}

/* -------- The article ----------------------------------------------------- */
/* Replaces `mx-auto w-full max-w-[var(--kb-app-read-w)]` on all three document
   routes, so the reading page's width is a named thing rather than a utility
   string repeated in three files. The cap is unchanged: 64rem. */
.kb-doc { width: 100%; max-width: var(--kb-app-read-w); margin-inline: auto; display: flex; flex-direction: column; gap: var(--kb-space-md); }
.kb-doc > * { min-width: 0; }

/* -------- The actions row ------------------------------------------------- */
/* Two groups, not one list. LEFT is where you came from; RIGHT is what you can
   do with this document. Delete is inside the right group but behind a
   hairline, because it is the one control that ends the page.

   The claim hint is a SENTENCE and was never a control: it leaves the row and
   sits under it, full width, at every size. */
.kb-docbar { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
.kb-docbar__nav { display: flex; align-items: center; gap: 0.5rem; flex: none; }
.kb-docbar__actions { display: flex; align-items: center; gap: 0.5rem; margin-left: auto; flex: none; }
.kb-docbar__sep { width: 1px; align-self: stretch; min-height: 1.6rem; background: var(--kb-border-strong); flex: none; }
.kb-docbar__hint { flex: 1 0 100%; font-size: 0.8rem; line-height: var(--kb-leading-snug); color: var(--kb-hint); margin: 0; text-wrap: pretty; }
.kb-docbar__hint a { color: var(--kb-accent-strong); text-decoration: underline; text-underline-offset: 2px; }
.kb-docbar__hint a:hover { color: var(--kb-accent); }

/* Phone: the row becomes two rows and a line. Back keeps its own line (it is
   navigation, not an action); the document's actions become equal cells at the
   44px floor; Delete drops below a full-width hairline, so the destructive
   control is never a thumb-width from Copy link. */
@container kbmain (width < 40rem) {
  .kb-docbar { gap: 0.55rem; }
  .kb-docbar__nav { flex: 1 0 100%; }
  .kb-docbar__nav > .kb-appbtn { min-height: var(--kb-tap); }
  .kb-docbar__actions { flex: 1 0 100%; margin-left: 0; display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 0.45rem; }
  .kb-docbar__actions > .kb-appbtn { min-height: var(--kb-tap); width: 100%; }
  .kb-docbar__sep { display: none; }
  .kb-docbar__danger { flex: 1 0 100%; display: flex; justify-content: flex-end; margin-top: 0.15rem; padding-top: 0.55rem; border-top: 1px solid var(--kb-border); }
}
/* Above the phone the danger slot is transparent — it is just the last cell of
   the right group. */
.kb-docbar__danger { display: contents; }
@container kbmain (width < 40rem) { .kb-docbar__danger { display: flex; } }

/* -------- The header block ------------------------------------------------ */
/* Unchanged in substance (mono eyebrow · Fraunces title · date sub); named so
   the three routes stop re-declaring an inline margin each. */
.kb-dochead { display: flex; flex-direction: column; gap: 0.35rem; }
.kb-dochead .kb-app-sub { margin: 0; font-family: var(--kb-font-mono); font-size: 0.78rem; color: var(--kb-hint); }

/* -------- The metadata strip ---------------------------------------------- */
/* Was a wrapping flex with `gap-x-8`, which on a 390px screen produces a
   ragged two-and-a-half-column shape nobody designed. It becomes a grid: two
   columns on a phone, auto-fit from 8rem up, so the fields land on a rail
   instead of wherever the wrap happened to leave them. Tags, which are the one
   field of unknown length, span the full width. */
.kb-docmeta { display: grid; grid-template-columns: repeat(auto-fit, minmax(8rem, max-content)); gap: 0.85rem 2.2rem; align-items: start; border-block: 1px solid var(--kb-border); padding-block: 0.9rem; }
.kb-docmeta__field { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
.kb-docmeta__label { font-family: var(--kb-font-mono); font-size: 0.62rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--kb-hint); }
.kb-docmeta__value { font-size: 0.85rem; line-height: var(--kb-leading-snug); color: var(--kb-ink); overflow-wrap: anywhere; }
.kb-docmeta__value--mono { font-family: var(--kb-font-mono); font-size: 0.82rem; }
.kb-docmeta__value--empty { color: var(--kb-hint); }
.kb-docmeta__field--tags { grid-column: 1 / -1; }
.kb-docmeta__field--tags .kb-docmeta__value { display: flex; flex-wrap: wrap; gap: 0.3rem; }
@container kbmain (width < 40rem) {
  .kb-docmeta { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem 1rem; }
}

/* -------- The reading column (DECISION · question 1) ---------------------- */
/* The measure is `--kb-measure` — 42rem, declared in the tokens at P12 and
   never used until now. `.kb-prose`'s own 46rem is retired: it was a second
   opinion about the same thing, and it was the wider one because it was also
   trying to hold code fences and tables.

   Track map:
     full-start | 1fr | TEXT = min(100%, --kb-measure) | 1fr | full-end
   Everything lands in TEXT by default. `pre`, a wide-table wrapper, an image
   and a rule take FULL — up to the article's 64rem — so a code fence is read
   at the width it was written and a GFM table gets the room it needs before it
   is asked to scroll. Below the measure the two side tracks collapse to zero
   and the grid is a single column: a phone sees no change in structure. */
.kb-prose { display: grid; grid-template-columns: [full-start] minmax(0, 1fr) [text-start] min(100%, var(--kb-measure)) [text-end] minmax(0, 1fr) [full-end]; color: var(--kb-ink); font-family: var(--kb-font-body); font-size: 1rem; line-height: var(--kb-leading-body); }
.kb-prose > * { grid-column: text; min-width: 0; }
.kb-prose > pre, .kb-prose > .kb-prose__wide, .kb-prose > figure, .kb-prose > hr, .kb-prose > img { grid-column: full; }
.kb-prose > :first-child { margin-top: 0; }
.kb-prose > :last-child { margin-bottom: 0; }

/* Headings — Fraunces, unchanged in voice. The h1 joins round 03's fluid ramp
   instead of sitting at a flat 1.7rem: a document's own h1 is display type and
   the console's display type is fluid on `cqi`. Everything below it is fixed,
   for the same reason round 03 fixed body type. */
.kb-prose h1, .kb-prose h2, .kb-prose h3, .kb-prose h4, .kb-prose h5, .kb-prose h6 { font-family: var(--kb-font-display); font-weight: var(--kb-weight-semibold); line-height: var(--kb-leading-heading); color: var(--kb-ink); margin: 1.9rem 0 0.7rem; word-break: keep-all; text-wrap: pretty; }
.kb-prose h1 { font-size: var(--kb-app-title-size); letter-spacing: var(--kb-tracking-display); }
.kb-prose h2 { font-size: 1.32rem; padding-bottom: 0.3rem; border-bottom: 1px solid var(--kb-border); }
.kb-prose h3 { font-size: 1.12rem; }
.kb-prose h4 { font-size: 1rem; }
.kb-prose h5, .kb-prose h6 { font-size: 0.9rem; color: var(--kb-secondary); }
/* A heading that follows another heading has nothing to be pushed away from. */
.kb-prose > :is(h1, h2, h3, h4, h5, h6) + :is(h2, h3, h4, h5, h6) { margin-top: 1rem; }

.kb-prose p { margin: 0.9rem 0; }
.kb-prose a { color: var(--kb-accent); text-decoration: none; border-bottom: 1px solid var(--kb-accent-soft); }
.kb-prose a:hover { color: var(--kb-accent-strong); border-bottom-color: var(--kb-accent-strong); }
.kb-prose strong { font-weight: var(--kb-weight-semibold); }
.kb-prose em { font-style: italic; }

.kb-prose ul, .kb-prose ol { margin: 0.9rem 0; padding-left: 1.4rem; }
.kb-prose li { margin: 0.3rem 0; }
.kb-prose li > ul, .kb-prose li > ol { margin: 0.3rem 0; }
/* GFM task lists — the marker leaves, so a checked item lines up with a plain
   paragraph instead of hanging off a bullet it never needed. */
.kb-prose ul:has(> li > input[type="checkbox"]) { list-style: none; padding-left: 0.1rem; }
.kb-prose li:has(> input[type="checkbox"]) { display: flex; align-items: baseline; gap: 0.5rem; }
.kb-prose li input[type="checkbox"] { accent-color: var(--kb-accent); width: 0.95rem; height: 0.95rem; flex: none; }

/* Code. Inline code keeps the sunken chip. A fence takes the FULL track, wraps
   nothing, and scrolls itself — and on a phone it is allowed to reach the
   gutter, because 1.05rem of paper on each side of a 40-column fence is the
   difference between reading it and not. */
.kb-prose code { font-family: var(--kb-font-mono); font-size: 0.86em; background: var(--kb-surface-sunken); border: 1px solid var(--kb-border); border-radius: var(--kb-radius-sm); padding: 0.1em 0.35em; overflow-wrap: anywhere; }
.kb-prose pre { margin: 1.15rem 0; padding: 0.9rem 1rem; background: var(--kb-surface-sunken); border: 1px solid var(--kb-border); border-radius: var(--kb-radius); overflow-x: auto; overscroll-behavior-inline: contain; font-size: 0.85rem; line-height: 1.55; -webkit-overflow-scrolling: touch; }
.kb-prose pre code { background: none; border: 0; padding: 0; font-size: inherit; overflow-wrap: normal; }
@container kbmain (width < 40rem) {
  .kb-prose pre { margin-inline: calc(var(--kb-app-gutter-phone) * -1); border-radius: 0; border-inline: 0; padding-inline: var(--kb-app-gutter-phone); font-size: 0.8rem; }
}

.kb-prose blockquote { margin: 1.15rem 0; padding: 0.2rem 0 0.2rem 1rem; border-left: 2px solid var(--kb-border-strong); color: var(--kb-secondary); }
.kb-prose blockquote p { margin: 0.4rem 0; }
.kb-prose hr { margin: 2rem 0; border: 0; border-top: 1px solid var(--kb-border); }

/* GFM tables. Round 03's `data-pri` stacking cannot apply here — a document's
   own table carries no priority annotations and we will not guess which column
   matters. So the table keeps its shape and is given a scroller instead: the
   wrapper takes the FULL track, holds the overflow, and says so with an edge
   shadow rather than a scrollbar nobody sees on a phone. */
.kb-prose__wide { margin: 1.15rem 0; overflow-x: auto; overscroll-behavior-inline: contain; background: linear-gradient(to right, var(--kb-paper) 30%, rgba(0, 0, 0, 0)) left / 2rem 100% no-repeat, linear-gradient(to left, var(--kb-paper) 30%, rgba(0, 0, 0, 0)) right / 2rem 100% no-repeat, linear-gradient(to right, var(--kb-scrim), rgba(0, 0, 0, 0)) left / 0.6rem 100% no-repeat, linear-gradient(to left, var(--kb-scrim), rgba(0, 0, 0, 0)) right / 0.6rem 100% no-repeat; background-attachment: local, local, scroll, scroll; }
.kb-prose table { width: 100%; min-width: 30rem; border-collapse: collapse; font-size: 0.88rem; }
.kb-prose th, .kb-prose td { padding: 0.5rem 0.75rem; border: 1px solid var(--kb-border); text-align: left; vertical-align: top; }
.kb-prose th { background: var(--kb-surface-sunken); font-family: var(--kb-font-mono); font-size: 0.7rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--kb-secondary); white-space: nowrap; }
.kb-prose tbody tr:nth-child(even) { background: color-mix(in srgb, var(--kb-surface-sunken) 45%, transparent); }

.kb-prose img { max-width: 100%; height: auto; border-radius: var(--kb-radius-sm); display: block; margin: 1.15rem auto; }
.kb-prose figure { margin: 1.15rem 0; }
.kb-prose figcaption { margin-top: 0.45rem; font-family: var(--kb-font-mono); font-size: 0.7rem; color: var(--kb-hint); text-align: center; }

/* The empty body — a state, not a paragraph. */
.kb-prose__empty { grid-column: text; font-size: 0.9rem; color: var(--kb-hint); font-style: italic; margin: 0; }

/* The markdown body's panel. A panel's 1.3rem padding plus the article's
   gutter is two frames around one column; on a phone the panel drops its own
   sides so the measure, not the chrome, decides where the text starts. */
.kb-doc__body { padding: 1.35rem 1.4rem 1.5rem; }
@container kbmain (width < 40rem) { .kb-doc__body { padding: 1.1rem var(--kb-app-gutter-phone) 1.25rem; } }

/* -------- The explainer frame (DECISION · question 10) -------------------- */
/* A foreign page with its own type, colour and layout. We own the box and
   nothing inside it, ever — so the box gets the FULL article width (64rem),
   not the prose measure: framing someone else's laid-out page at 42rem would
   margin it twice and leave its own table of contents nowhere to sit.

   Before the height handshake lands the frame is a flat per-tier box, exactly
   as round 05 re-cut the graph plate. The sum it replaces
   (`100dvh − topbar − 13rem`, floored at 30rem) predates the navigation bar in
   precisely the same way. */
.kb-explainer { position: relative; width: 100%; height: auto; border: 1px solid var(--kb-border); border-radius: var(--kb-radius); overflow: hidden; background: var(--kb-surface); }
.kb-explainer__frame { display: block; border: 0; width: 100%; height: var(--kb-explainer-h-desktop); background: var(--kb-surface); }
@container kbmain (width < 40rem) { .kb-explainer__frame { height: var(--kb-explainer-h-phone); } }
@container kbmain (width >= 40rem) and (width < 64rem) { .kb-explainer__frame { height: var(--kb-explainer-h-tablet); } }
/* Measured: the island writes the exact height inline and sets the flag; every
   rule above must lose, so the flag carries the reset. */
.kb-explainer[data-measured] .kb-explainer__frame { height: auto; }
/* Never measured (no reporter, or a document that answers nothing): a stated
   tall frame that scrolls inside itself — the old behaviour, now a decision. */
.kb-explainer[data-unmeasured] .kb-explainer__frame { height: var(--kb-explainer-h-unmeasured); }

/* The waiting line. Not a skeleton: we cannot know the shape of what is
   coming, and a fake table of contents would be a lie. One mono line, centred,
   on the frame's own surface — and it holds the box open so nothing below it
   moves twice. */
.kb-explainer__wait { position: absolute; inset: 0; display: grid; place-items: center; gap: 0.5rem; align-content: center; background: var(--kb-surface); font-family: var(--kb-font-mono); font-size: 0.7rem; letter-spacing: 0.04em; color: var(--kb-hint); text-align: center; padding: 1rem; }
.kb-explainer[data-measured] .kb-explainer__wait, .kb-explainer[data-unmeasured] .kb-explainer__wait { display: none; }
.kb-explainer__wait i { width: 0.85rem; height: 0.85rem; border-radius: 50%; border: 1.5px solid var(--kb-border-strong); border-top-color: var(--kb-accent); }
@media (prefers-reduced-motion: no-preference) { .kb-explainer__wait i { animation: kb-spin 0.9s linear infinite; } }

/* An honest footnote under a frame that never reported a height, and the same
   slot carries the print caveat (print-r6.css reveals a second line there). */
.kb-explainer__note { display: none; margin: 0.5rem 0 0; font-family: var(--kb-font-mono); font-size: 0.68rem; line-height: 1.55; color: var(--kb-hint); }
.kb-explainer[data-unmeasured] + .kb-explainer__note { display: block; }

/* An in-page ToC jump inside an opaque-origin frame can only be replayed
   against the PAGE. The island already insets it by the topbar; give the
   landing a scroll margin so the heading it lands on is not welded to the
   sticky band, and let the browser animate it unless the reader said not to. */
.kb-doc { scroll-margin-top: calc(var(--kb-app-topbar-h) + 0.75rem); }
@media (prefers-reduced-motion: no-preference) { .kb-app:has(.kb-explainer) { scroll-behavior: smooth; } }

/* -------- The full-width view (DECISIONS · questions 3 and 4) ------------- */
/* The same page with its chrome gone — never the document served bare on our
   origin, and for the HTML body never anything but the same sandboxed relay
   frame. It is a query on the document's own URL (`?view=full`), so browser
   back is the primary exit at every width and the view is linkable.

   It is offered for BOTH bodies. The reader asking for it is asking for the
   document without our furniture, and that request does not change because the
   body happens to be ours. */
.kb-app[data-kb-view="full"] > .kb-topbar, .kb-app[data-kb-view="full"] > .kb-navbar, .kb-app[data-kb-view="full"] .kb-rail, .kb-app[data-kb-view="full"] .kb-docbar, .kb-app[data-kb-view="full"] .kb-dochead, .kb-app[data-kb-view="full"] .kb-docmeta, .kb-app[data-kb-view="full"] .kb-docversions { display: none; }
.kb-app[data-kb-view="full"] .kb-app-layout { grid-template-columns: minmax(0, 1fr); }
.kb-app[data-kb-view="full"] .kb-app-main { padding: 0; max-width: none; }
.kb-app[data-kb-view="full"] .kb-doc { max-width: none; gap: 0; }
/* The body fills the window. For the explainer that means a frame with no card
   around it — the foreign page gets the whole sheet of glass. For markdown it
   means the measure grid on bare paper, with the page's own gutter restored so
   the text is not welded to the window edge. */
.kb-app[data-kb-view="full"] .kb-explainer { border: 0; border-radius: 0; }
.kb-app[data-kb-view="full"] .kb-doc__body { background: transparent; border: 0; border-radius: 0; padding: var(--kb-full-pad) var(--kb-full-pad) 4.5rem; }
@container kbapp (width < 40rem) { .kb-app[data-kb-view="full"] .kb-doc__body { padding: 1rem var(--kb-app-gutter-phone) 5.5rem; } }

/* The one thing on screen: a floating exit. Always visible — not on hover, not
   on scroll-up — because a phone has no Esc key and no hover, and a reader who
   cannot find the way out of a full-window view has been trapped by a feature
   they opted into. Bottom-right on a pointer device, bottom-centre and above
   the home indicator on a phone.

   IT IS A SIBLING OF `.kb-app`, NOT A CHILD — the same rule, and the same
   reason, as round 03's toast region: `.kb-app` declares `container-type:
   inline-size`, which brings layout containment, which makes it the containing
   block for fixed descendants. A pill inside it would be pinned to the bottom
   of the DOCUMENT rather than the bottom of the screen, which on a long
   explainer means "invisible". It therefore queries the VIEWPORT, which is what
   an overlay should query anyway, and it carries the scheme attributes itself. */
.kb-docfull__exit { position: fixed; z-index: 60; right: 1.1rem; bottom: 1.1rem; display: inline-flex; align-items: center; gap: 0.45rem; min-height: var(--kb-full-exit-size); padding: 0.5rem 1rem; background: var(--kb-surface); border: 1px solid var(--kb-border-strong); border-radius: var(--kb-radius-pill); box-shadow: var(--kb-shadow-raise); font-family: var(--kb-font-body); font-size: 0.85rem; font-weight: var(--kb-weight-semibold); color: var(--kb-ink); cursor: pointer; }
.kb-docfull__exit:hover { border-color: var(--kb-accent); color: var(--kb-accent-strong); }
.kb-docfull__exit kbd { font-family: var(--kb-font-mono); font-size: 0.6rem; font-weight: 700; color: var(--kb-hint); border: 1px solid var(--kb-border-strong); border-radius: var(--kb-radius-sm); padding: 0.1em 0.35em; }
@media (pointer: coarse) { .kb-docfull__exit kbd { display: none; } }
@media (width < 40rem) {
  .kb-docfull__exit { left: 50%; right: auto; transform: translateX(-50%); bottom: calc(0.9rem + env(safe-area-inset-bottom, 0px)); padding: 0.55rem 1.4rem; }
}

/* -------- The past version ------------------------------------------------ */
/* The superseded banner keeps its idle-status inks and its `role="status"`; it
   gains a left rule so it reads as a stamp on the document rather than a
   notification about the app. */
.kb-docnotice { display: flex; align-items: flex-start; gap: 0.55rem; border: 1px solid var(--kb-status-idle); border-left-width: 3px; border-radius: var(--kb-radius-sm); background: var(--kb-status-idle-soft); padding: 0.7rem 0.9rem; font-size: 0.86rem; line-height: var(--kb-leading-snug); color: var(--kb-status-idle-ink); text-wrap: pretty; }
.kb-docnotice a { color: var(--kb-status-idle-ink); font-weight: var(--kb-weight-semibold); text-decoration: underline; text-underline-offset: 2px; }
.kb-docnotice .kb-status__dot { margin-top: 0.42rem; flex: none; background: transparent; border: var(--kb-status-ring) solid var(--kb-status-idle); }

/* -------- Version history ------------------------------------------------- */
/* The panel is round 03's table rule verbatim; it only needed its columns
   ranked, which is markup (`data-pri`), and a name to hide behind in the
   full-width view. */
.kb-docversions { margin: 0; }

/* -------- Export (DECISION · question 6, the honest half) ----------------- */
/* The control is an ordinary console button; its only state worth styling is
   the one where the browser gives us nothing back. `aria-busy` already reads
   as progress (console-responsive.css), so this adds the failure line only. */
.kb-docexport__error { font-size: 0.8rem; line-height: var(--kb-leading-snug); color: var(--kb-status-revoked-ink); margin: 0.4rem 0 0; }
```

### 3.2 `kb-print.css`

```css
/* ==========================================================================
   Knowledge Base — PRINT layer  (Round 06 · P27.S5)
   --------------------------------------------------------------------------
   The first `@media print` rule this product has ever had. Verified before the
   round: no `@page`, no print stylesheet, no export control existed anywhere
   in `web/src`.

   WHY A SEPARATE FILE FROM docview-r6.css. Paper is a different medium, not a
   narrow screen: it has no scrolling, no hover, no dark mode, no JavaScript,
   no accent colour worth spending, and a page break every 297mm. A reviewer
   should be able to read every rule that governs paper without reading a
   single screen rule, and an implementer should be able to see, in one file,
   the complete answer to "what comes out of the printer".

   WHAT THIS FILE IS NOT. PDF export here IS the browser's print (job D25, a
   server-side renderer, stays deferred). So this file cannot paginate, cannot
   number pages and cannot run a header — browsers do not implement `@page`
   margin boxes. Page numbers come from the browser's OWN header/footer, which
   is on by default in every print dialog; the export dialog copy says so. What
   this file does own: what is on the sheet, what is dropped, where a break may
   fall, and what a link looks like when it cannot be clicked.

   Load LAST, after docview-r6.css.
   ========================================================================== */

@media print {
  /* -------- The page box ------------------------------------------------- */
  /* `size: auto` on purpose: the reader's paper is the reader's business, and
     the design must survive both A4 (210×297mm) and US Letter (216×279mm).
     Nothing on the sheet is sized from the page height, so the two differ only
     in where the break falls. The margin is a reading margin, not a printer
     minimum — 16mm at the top leaves the browser's own header room to sit
     without touching the masthead. */
  @page { size: auto; margin: 16mm 15mm 18mm; }

  /* -------- The scheme: paper is always light (DECISION · question 8) ----- */
  /* Someone printing at night is looking at a dark page, and a dark page on
     paper is a flooded sheet of toner with hairlines that disappear. Print
     re-declares the LIGHT palette unconditionally — over the document scheme
     attribute AND over round 03's `data-kb-scheme="auto"` OS adoption — and
     drops the warm paper tint to nothing, because most browsers refuse to
     print backgrounds anyway and a half-printed ivory is worse than none. The
     ink stays the brand's warm near-black; it is a darker warm than the screen
     ink, which reads thin at 10.5pt. */
  :root, .kb-app, .kb-app[data-kb-scheme="auto"], [data-md-color-scheme="slate"] {
    --kb-paper: #ffffff; --kb-surface: #ffffff; --kb-surface-sunken: #f4f1ea;
    --kb-border: #c9c2b3; --kb-border-strong: #a9a294;
    --kb-ink: #1b1714; --kb-secondary: #4a433a; --kb-hint: #6d665a;
    --kb-accent: #0a544e; --kb-accent-strong: #0a544e; --kb-accent-soft: #e2ece9;
    --kb-status-idle: #6b5220; --kb-status-idle-soft: #f3ece0; --kb-status-idle-ink: #4f3c16;
    --kb-shadow-raise: none; --kb-shadow-overlay: none; --kb-shadow-hover: none;
  }
  html, body, .kb-app { background: #ffffff !important; color: var(--kb-ink); }
  .kb-app { min-height: 0; display: block; }

  /* -------- What is dropped (DECISION · question 5) ---------------------- */
  /* Every piece of chrome, every control, and every navigation aid. A sheet of
     paper cannot be clicked, so anything whose only purpose is to be clicked
     is noise on it. The version-history PANEL goes too: it is a list of links
     into an app, and the one fact it carries that paper needs — which version
     this is — is in the masthead instead.

     Because print drops the chrome itself, the output is IDENTICAL whether the
     reader exports from the normal page or from the full-width view. That is
     the reason Export PDF never has to switch views first. */
  .kb-topbar, .kb-navbar, .kb-rail, .kb-skip, .kb-docbar, .kb-docversions,
  .kb-toast-region, .kb-account, .kb-docfull__exit, .kb-explainer__wait,
  .kb-railtoggle, .kb-pager { display: none !important; }

  /* -------- The layout --------------------------------------------------- */
  /* Containers, grids and caps all go: the PAGE BOX is now the measure. At A4
     with 15mm side margins the text column is 180mm ≈ 41rem, which is
     `--kb-measure` to within a millimetre — the reading column designed for
     screen turns out to be the shape of a sheet of paper, so the prose grid
     simply collapses to one column and the bleed track disappears with it. */
  .kb-app-layout, .kb-app-main { display: block; padding: 0; margin: 0; max-width: none; }
  .kb-doc { display: block; max-width: none; }
  .kb-prose { display: block; font-size: 10.5pt; line-height: 1.5; }
  .kb-prose > * { max-width: none; }
  .kb-doc__body, .kb-panel { background: transparent; border: 0; border-radius: 0; padding: 0; }

  /* -------- The masthead (print-only, first page) ------------------------ */
  /* Four facts a printed page must carry that a screen never has to: where it
     came from, which version it is, when it was taken off the screen, and who
     made it. Rendered print-only so it never appears in the app. */
  .kb-printonly { display: block; }
  .kb-printhead { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.35rem 1.1rem; border-bottom: 0.75pt solid var(--kb-border-strong); padding-bottom: 6pt; margin-bottom: 14pt; font-family: var(--kb-font-mono); font-size: 7.5pt; letter-spacing: 0.04em; text-transform: uppercase; color: var(--kb-hint); }
  .kb-printhead__word { font-family: var(--kb-font-display); font-size: 11pt; font-weight: 600; letter-spacing: 0; text-transform: none; color: var(--kb-ink); margin-right: auto; }
  .kb-printhead__url { text-transform: none; letter-spacing: 0; color: var(--kb-secondary); overflow-wrap: anywhere; }

  /* -------- The title block ---------------------------------------------- */
  .kb-dochead { display: block; margin-bottom: 10pt; break-after: avoid; }
  .kb-dochead .kb-app-eyebrow { font-size: 7.5pt; color: var(--kb-hint); }
  .kb-dochead .kb-app-title { font-size: 20pt; line-height: 1.2; margin: 3pt 0 0; }
  .kb-dochead .kb-app-sub { font-size: 8.5pt; margin-top: 3pt; }

  /* -------- The metadata strip ------------------------------------------- */
  /* It prints, but not as a grid of fields: on paper it is one wrapped
     definition line, which costs three lines instead of two rows and survives
     both paper widths. Tags print as plain text, not chips — a soft teal fill
     at 7pt is a grey smudge. */
  .kb-docmeta { display: block; border-block: 0.75pt solid var(--kb-border); padding-block: 5pt; margin-bottom: 12pt; font-size: 8.5pt; line-height: 1.6; break-inside: avoid; }
  .kb-docmeta__field { display: inline; }
  .kb-docmeta__field + .kb-docmeta__field::before { content: " · "; color: var(--kb-border-strong); }
  .kb-docmeta__label { display: inline; font-size: 7pt; color: var(--kb-hint); }
  .kb-docmeta__label::after { content: " "; }
  .kb-docmeta__value { display: inline; font-size: 8.5pt; }
  .kb-docmeta__field--tags .kb-docmeta__value { display: inline; }
  .kb-docmeta .kb-chip { display: inline; background: none; border: 0; padding: 0; color: var(--kb-secondary); font-size: 7.5pt; text-transform: none; letter-spacing: 0.02em; }
  .kb-docmeta .kb-chip + .kb-chip::before { content: ", "; }

  /* -------- The superseded stamp (DECISION · question 9) ----------------- */
  /* It prints, and it is the loudest thing on the sheet. A reader holding a
     piece of paper is the one reader who cannot check whether it is current,
     and a printed archive body that does not say so is the single most
     dangerous artefact this product can produce. Boxed, above the title, and
     never split across a break. */
  .kb-docnotice { display: block; border: 1.25pt solid var(--kb-status-idle); border-left-width: 4pt; background: transparent; padding: 6pt 8pt; margin-bottom: 12pt; font-size: 9pt; font-weight: 600; color: var(--kb-status-idle-ink); break-inside: avoid; break-after: avoid; }
  .kb-docnotice .kb-status__dot { display: none; }

  /* -------- Prose on paper ------------------------------------------------ */
  .kb-prose h1, .kb-prose h2, .kb-prose h3, .kb-prose h4, .kb-prose h5, .kb-prose h6 { break-after: avoid; break-inside: avoid; margin: 16pt 0 5pt; color: #000000; }
  .kb-prose h1 { font-size: 15pt; }
  .kb-prose h2 { font-size: 13pt; border-bottom: 0.5pt solid var(--kb-border); padding-bottom: 2pt; }
  .kb-prose h3 { font-size: 11.5pt; }
  .kb-prose h4, .kb-prose h5, .kb-prose h6 { font-size: 10.5pt; }
  .kb-prose p, .kb-prose li { orphans: 3; widows: 3; }
  .kb-prose p { margin: 6pt 0; }
  .kb-prose blockquote, .kb-prose figure, .kb-prose img { break-inside: avoid; }
  .kb-prose pre { break-inside: auto; white-space: pre-wrap; overflow: visible; background: var(--kb-surface-sunken); border: 0.5pt solid var(--kb-border); font-size: 8.5pt; line-height: 1.45; padding: 6pt 8pt; margin: 8pt 0; }
  .kb-prose code { background: transparent; border: 0; padding: 0; font-size: 9pt; }
  .kb-prose pre code { font-size: inherit; }
  /* A code fence is the one block allowed to break, because a 200-line fence
     that may not break leaves a blank page in front of it. It breaks with a
     hairline continuation rule instead of silently. */
  .kb-prose pre { box-decoration-break: clone; }

  /* Tables lose the scroller — there is nothing to scroll — and are allowed to
     break, repeating their header row, because a wide GFM table is often the
     reason the document was printed at all. */
  .kb-prose__wide { overflow: visible; background: none; margin: 8pt 0; }
  .kb-prose table { min-width: 0; width: 100%; font-size: 8.5pt; break-inside: auto; }
  .kb-prose thead { display: table-header-group; }
  .kb-prose tr { break-inside: avoid; }
  .kb-prose th, .kb-prose td { border: 0.5pt solid var(--kb-border); padding: 3pt 5pt; }
  .kb-prose th { background: var(--kb-surface-sunken); font-size: 7pt; }
  .kb-prose tbody tr:nth-child(even) { background: transparent; }

  /* -------- Links on paper (DECISION · question 7) ----------------------- */
  /* The target is printed after the text, in mono, for every link whose href
     is not already its own text. A printed link with no URL is a dead end; a
     printed URL after "here" is the difference between a document and a
     souvenir. `MarkdownBody` absolutizes relative hrefs against the canonical
     URL before this rule ever sees them (see the contract) and marks a link
     whose text IS its href with `data-bare`, which suppresses the repeat. */
  .kb-prose a { color: var(--kb-ink); border-bottom: 0.5pt solid var(--kb-border-strong); text-decoration: none; }
  .kb-prose a[href]::after { content: " (" attr(href) ")"; font-family: var(--kb-font-mono); font-size: 7.5pt; color: var(--kb-hint); word-break: break-all; }
  .kb-prose a[data-bare]::after, .kb-prose a[href^="#"]::after { content: none; }

  /* -------- The explainer on paper (DECISION · question 6) --------------- */
  /* A framed explainer is someone else's page inside a sandbox we may never
     reach into: we cannot restyle it for paper, cannot remove its quiz, cannot
     hint a page break inside it. What we CAN do is be honest about it and get
     out of the way — the card's border and radius go, and the frame prints at
     the full height the handshake measured, which is what makes the whole
     document print rather than its first screenful.

     A document that never reported a height is the one case we cannot print in
     full, and the note says exactly that instead of printing a clipped page
     silently. */
  .kb-explainer { border: 0; border-radius: 0; overflow: visible; background: transparent; break-inside: auto; }
  .kb-explainer__frame { height: auto; min-height: 0; }
  .kb-explainer__note { display: block !important; font-size: 7.5pt; color: var(--kb-hint); margin-top: 6pt; }
  .kb-explainer__note--screen { display: none !important; }

  /* -------- The colophon (print-only, last) ------------------------------ */
  /* Where this came from and when — repeated from the masthead on purpose,
     because the first page and the last page get separated. */
  .kb-printfoot { display: block; margin-top: 16pt; padding-top: 6pt; border-top: 0.75pt solid var(--kb-border); font-family: var(--kb-font-mono); font-size: 7.5pt; line-height: 1.6; color: var(--kb-hint); break-inside: avoid; }
  .kb-printfoot b { font-weight: 600; color: var(--kb-secondary); }
  .kb-printfoot span { overflow-wrap: anywhere; }

  /* -------- Motion ------------------------------------------------------- */
  *, *::before, *::after { animation: none !important; transition: none !important; box-shadow: none !important; }
}

/* -------- Screen: the print-only blocks are not there -------------------- */
.kb-printonly, .kb-printhead, .kb-printfoot { display: none; }
```

---

## 4. Markup reference

### 4.1 The article, on all three routes

```html
<article class="kb-doc">
  <div class="kb-docbar">
    <div class="kb-docbar__nav">
      <a class="kb-appbtn kb-appbtn--ghost kb-appbtn--sm" href="/documents">
        <ChevronLeft size="15" aria-hidden /> All documents
      </a>
    </div>
    <div class="kb-docbar__actions">
      <CopyLinkButton …>                     <!-- member branch only -->
      <ExportPdfButton …>                    <!-- all surfaces -->
      <a class="kb-appbtn kb-appbtn--ghost kb-appbtn--sm" href="?view=full">Full width</a>
      <span class="kb-docbar__sep"></span>   <!-- only when Delete renders -->
      <div class="kb-docbar__danger"><DeleteDocumentButton … /></div>
    </div>
    <p class="kb-docbar__hint">…claim hint…</p>   <!-- when shown; always its own line -->
  </div>

  <PrintMasthead … />                        <!-- print-only, §4.5 -->
  <div class="kb-docnotice" role="status">…</div>   <!-- past version only -->

  <div class="kb-dochead">
    <div class="kb-app-eyebrow">{project}</div>
    <h1 class="kb-app-title">{title}</h1>
    <p class="kb-app-sub">{date}</p>
  </div>

  <div class="kb-docmeta">…§4.2…</div>

  <!-- body: one of -->
  <div class="kb-panel kb-doc__body"><div class="kb-prose">…</div></div>
  <div class="kb-explainer" …>…§4.3…</div>

  <VersionHistory … />                       <!-- <section class="kb-panel kb-docversions"> -->
  <PrintColophon … />                        <!-- print-only, §4.5 -->
</article>
```

`.kb-doc` replaces `mx-auto w-full max-w-[var(--kb-app-read-w)]` and supplies the vertical rhythm
(`gap: var(--kb-space-md)`), so no child carries a `marginBottom` inline style any more. Delete the
`style={{ marginBottom: "1rem" }}` on the actions row and the `mb-[var(--kb-space-md)]` on the header
and the strip.

**The hairline renders only when Delete does.** `.kb-docbar__danger` is `display: contents` above 40rem,
so the button is a plain last cell of the right group; below 40rem the same element becomes the
full-width danger row. Do not conditionally swap the wrapper in JS.

### 4.2 The metadata strip

`<Meta>` keeps its name, its exported status and its label/value vocabulary; only the classes change.

```html
<div class="kb-docmeta">
  <div class="kb-docmeta__field">
    <span class="kb-docmeta__label">Project</span>
    <span class="kb-docmeta__value">knowledge</span>
  </div>
  <div class="kb-docmeta__field">
    <span class="kb-docmeta__label">Date</span>
    <span class="kb-docmeta__value kb-docmeta__value--mono">2026-08-07</span>
  </div>
  <div class="kb-docmeta__field">
    <span class="kb-docmeta__label">Source</span>
    <span class="kb-docmeta__value kb-docmeta__value--mono">leetusik/knowledge</span>
  </div>
  <div class="kb-docmeta__field kb-docmeta__field--tags">
    <span class="kb-docmeta__label">Tags</span>
    <span class="kb-docmeta__value"><span class="kb-chip">frontend</span>…</span>
  </div>
</div>
```

**Source moves ahead of Tags in source order** on the live document, so the three short fields share the
first row and the tag list — one chip or eleven — always starts a row of its own. An absent value keeps
the em-dash (`noTags` / `noSource`) and takes `.kb-docmeta__value--empty`; a field never disappears,
because a strip that changes shape per document is not a strip. The past version's five fields are
Version · Date · Superseded · Archive · Tags, in that order, Archive on `--mono` and allowed to truncate.

### 4.3 The explainer frame

```html
<div class="kb-explainer" data-measured?>       <!-- or data-unmeasured -->
  <div class="kb-explainer__wait"><i></i>Loading explainer…</div>
  <iframe class="kb-explainer__frame"
          src="/api/documents/{id}/raw"
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          title={doc.title}
          style={measured ? { height: `${h}px` } : undefined}></iframe>
</div>
<p class="kb-explainer__note">{explainerUnmeasured}</p>
<p class="kb-explainer__note kb-explainer__note--screen">{printCaveat}</p>
```

The sandbox attribute, the relay `src`, `referrerPolicy` and the pinned response headers are **unchanged
and out of scope**. The second note is hidden on screen and revealed by `kb-print.css`; it is the paper
caveat, so it must be in the DOM at print time even when the frame measured cleanly.

### 4.4 The full-width view

```html
<div class="kb-app" data-kb-view="full" …>   <!-- AppShell / PublicShell, prop-driven -->
  …existing shell markup, unchanged…
</div>
<FullWidthExit />                            <!-- SIBLING of .kb-app, at the layout root -->
```

```html
<button type="button" class="kb-docfull__exit">Exit full width <kbd>Esc</kbd></button>
```

The shells take one new boolean prop and set `data-kb-view="full"` on `.kb-app`. **Nothing is
conditionally unmounted** — the CSS hides the chrome — so exiting the view costs no refetch and no
remount. The pill is `position: fixed`, `z-index: 60` (above the topbar's 40 and the toast region's 55
is deliberate: it must never be covered).

**The pill must be a sibling of `.kb-app`, mounted at the layout root beside the toast region, and it
carries the scheme attributes itself.** `.kb-app` declares `container-type: inline-size`, which brings
layout containment, which makes it the containing block for **fixed** descendants: a pill inside it
would be pinned to the bottom of the document rather than the bottom of the screen, and on a long
explainer that means invisible. This is the same trap and the same fix round 03 documented for
`.kb-toast-region` in `kb-console-responsive.css`. For the same reason the pill's phone rule is a
viewport `@media (width < 40rem)` query, not an `@container kbapp` one.

### 4.5 The print-only blocks

Rendered by a server component, always in the DOM, `display: none` on screen (the last rule in
`kb-print.css`).

```html
<div class="kb-printhead kb-printonly">
  <span class="kb-printhead__word">knowledge</span>
  <span class="kb-printhead__url">knowledge.hi2vi.com/@leetusik/knowledge/frontend</span>
  <span>v16</span>
  <span>Printed 2026-09-21</span>
</div>

<div class="kb-printfoot kb-printonly">
  <b>knowledge</b> · Frontend · v16 · <span>knowledge.hi2vi.com/@leetusik/knowledge/frontend</span><br>
  Printed 2026-09-21 from the knowledge console. …
</div>
```

The URL is `doc.canonical_path` when it exists, else the id URL, prefixed with the deployment origin.
The printed date is rendered on the **client** (the server's date is not the reader's) — hydrate it into
the two blocks from the export island, defaulting to the server-rendered ISO date.

---

## 5. Component changes, file by file

**`document-view.tsx`** — swap the header block's Tailwind for `.kb-dochead`; swap `<Meta>`'s inner
classes for `.kb-docmeta__*`; swap the strip's utility string for `.kb-docmeta`; reorder Source before
Tags; add `.kb-doc__body` to the markdown panel; render the empty-body line as
`<p class="kb-prose__empty">` inside `.kb-prose` (not beside it). Stays a server component with no auth
import.

**`markdown-body.tsx`** — three additions to the `components` map:
1. `table` renders `<div class="kb-prose__wide"><table>…</table></div>`. The wrapper must be a **direct
   child of `.kb-prose`** or it will not reach the full track.
2. `a` absolutizes a relative `href` against the document's canonical URL (pass it in as a prop) so the
   printed URL is reachable, and sets `data-bare` when the link's text content equals its `href`.
3. `pre` gets `tabIndex={0}` and `role="region"` with an `aria-label` from the fence's language
   (§6) — it scrolls, so it must be keyboard-reachable.

**`explainer-frame.tsx`** — keep the two existing postMessage listeners and the 120–40000px clamp
verbatim. Add: the `.kb-explainer__wait` line as the frame's sibling; a `setTimeout` of
`--kb-explainer-wait` (4s) that sets `data-unmeasured` if no height has arrived, cleared on the first
height; and the relay-failure branch — `onError` on the iframe, plus a `load` handler that treats a
non-HTML relay answer as a failure — rendering `.kb-editorial` **inside** `.kb-explainer` (404: no
retry; 502: a Reload button). Do not remove the existing child-ward `kb-explainer-request` re-post; the
hydration race it fixes is unrelated to this round.

**`version-history.tsx`** — add `data-pri="3"` to the Title column and `data-pri="2"` to Superseded;
add `data-label` to every cell (round 03's stacked-row rule reads it); the phone's View link renders as
`kb-appbtn kb-appbtn--ghost kb-appbtn--sm` with the version in the visible label. New prop `ok?: boolean`
— `false` renders the panel head plus `.kb-editorial` (code "Unavailable", the sub line from §7, **no
button**); `versions.length === 0 && ok !== false` still returns `null`.

**`page.tsx` ×3** — read `searchParams` for `view=full`; pass it to the shell; wrap the body in
`<article class="kb-doc">`; build the actions row per §4.1; mount `<ExportPdfButton>` on every surface
and the Full width link on every surface; change `loadVersions` to return `{ ok: false }` on catch
instead of an empty array. The past-version page gains `.kb-docnotice` with its existing `role="status"`
and the `notice()` copy, placed **above** `.kb-dochead`.

**`export-pdf-button.tsx`** (new, client) — on click: set `aria-busy`, wait one animation frame, call
`window.print()` inside a `try`; render the dialog hint line (iOS variant chosen by
`navigator.maxTouchPoints > 1 && /Mac|iP/.test(navigator.platform)`); clear it on `afterprint`; render
`.kb-docexport__error` if `print()` throws or if `beforeprint` has not fired within 1500ms. If the page
holds an `[data-unmeasured]` explainer, show `exportUnmeasured` **before** calling `print()` and require
a second click.

**`full-width-exit.tsx`** (new, client) — the pill; `router.replace` removing the `view` param (so the
exit does not add a history entry on top of the entry that back already handles); an `Escape` keydown
listener on `document`; nothing else. No focus trap — nothing is trapped.

---

## 6. Accessibility

- The exit pill is a real `<button>` with the visible label `Exit full width`; the `<kbd>` is decorative
  and hidden from the accessibility tree is **not** required (the word "Esc" is useful to a screen-reader
  user with a keyboard).
- Entering the full-width view moves focus to the body container (`tabIndex={-1}` on `.kb-doc`); leaving
  it returns focus to the Full width control.
- `.kb-explainer__wait` is inside an `aria-live="polite"` region so "Loading explainer…" and the
  unmeasured note are announced; the frame keeps its `title`.
- Scrollable regions get keyboard access: `.kb-prose pre` and `.kb-prose__wide` take `tabIndex={0}` plus
  `role="region"` and an `aria-label` ("Code block" / "Table"). A region that scrolls and cannot be
  focused is unreachable by keyboard.
- The export button uses `aria-busy`, never a disabled-without-explanation state; the hint and error
  lines are `aria-live="polite"`.
- The superseded banner keeps `role="status"`.
- Round 03's focus floor applies unchanged; nothing in this round declares an `outline: none`.
- Contrast: every printed ink is ≥ 7:1 on white; the screen palette is untouched.

---

## 7. Copy — every new string, with its key

Copy lives in `web/src/content/*` and is not rewritten by a design round. The strings below **do not
exist yet**; they are proposals for the operator to accept or replace, not decisions made here. Keys are
under `DOCUMENTS.read` unless noted.

| Key | String |
| --- | --- |
| `exportLabel` | Export PDF |
| `exportPending` | Preparing… |
| `exportDialog` | Choose **Save as PDF** as the destination. Keep headers and footers on if you want page numbers. |
| `exportDialogIos` | Print goes to the share sheet — choose **Save to Files**. |
| `exportFailed` | Couldn't open the print dialog. Use your browser's Print command instead — ⌘P, or Ctrl+P. |
| `exportUnmeasured` | This explainer didn't report its height, so only its first page will print. Open it full width and print from there. |
| `fullWidthLabel` | Full width |
| `fullWidthExit` | Exit full width |
| `explainerLoading` | Loading explainer… |
| `explainerUnmeasured` | This explainer didn't report its height, so it scrolls inside its frame. Open it full width for the whole page. |

Print-only and state strings:

| Key | String |
| --- | --- |
| `print.printedOn(date)` | Printed {date} |
| `print.colophon(date)` | Printed {date} from the knowledge console. The version above was current on that date; check the link for the live document. |
| `print.archivedColophon(current)` | Printed {date}. This is an archived body. The current version is v{current}. |
| `print.explainerCaveat` | This explainer is interactive on screen. Its quiz and controls do not work on paper; read it at the address above. |
| `versions.panel.failedCode` | Unavailable |
| `versions.panel.failedSub` | Couldn't load this document's history. The document itself is fine — reload to try again. |
| `explainerError.notFound` | This explainer's file couldn't be found. Its metadata is above; the body may have been removed from the content plane. |
| `explainerError.upstream` | The explainer couldn't be loaded right now. Reload the page to try again. |
| `explainerError.reload` | Reload |

Unchanged and reused: `read.backLabel`, `read.fields.*`, `read.noSource`, `read.emptyBody`,
`list.noTags`, `versions.*`, `notFound.*`, `publicNotFound.*`, `delete.*`, `SHARE.claimHint.*`.

---

## 8. Acceptance checks

**Measure and layout**

1. At 1180 member and 1180 public, a paragraph in `.kb-prose` measures **672px** (42rem) in both. The two
   pages differ only in the margin beside it.
2. A `<pre>` and a `.kb-prose__wide` measure the **article's** width at every size — 885px at 1180
   member, 1125px at 1180 public.
3. At 390 a `<pre>` reaches both gutters (its box is 390px wide minus the frame border) and scrolls
   horizontally; the page does not.
4. `grep -r "46rem" web/src` returns nothing. `grep -r "kb-measure" web/src` returns the token
   declaration **and** `kb-docview.css`.
5. The metadata strip is two equal columns at 390 with Tags spanning both; no field is missing when its
   value is an em-dash.

**The frame**

6. With the reporter disabled, the frame is 26/32/40rem by tier for 4s, then 70rem with
   `[data-unmeasured]`, the note visible, and the frame scrolling internally.
7. With the reporter enabled, `[data-measured]` is set, the inline height matches the reported height,
   the waiting line is gone, and the **page** scrolls — there is exactly one scrollbar.
8. No rule anywhere in `kb-docview.css` contains `100dvh` or `100vh`.
9. An in-page ToC jump lands the target clear of the sticky topbar by ≥ 0.75rem.

**The full-width view**

10. `?view=full` hides topbar, navbar, rail, actions row, header, strip and version panel, and keeps the
    superseded stamp on a past version.
11. Browser back exits the view and restores the scroll position; the pill exits without adding a
    history entry; Esc exits on a keyboard.
12. In the view the iframe's `sandbox` attribute is still exactly `allow-scripts` and its `src` is still
    the relay. No route serves document HTML directly.
13. At 390 the pill is centred, ≥ 44px tall, clear of `env(safe-area-inset-bottom)`, and visible without
    scrolling at any scroll position. Scroll a long explainer to the bottom **and** the middle and
    confirm the pill has not moved — if it scrolls away, it has been mounted inside `.kb-app`.

**Paper** (check on A4 **and** US Letter, in light **and** dark OS schemes)

14. The printed sheet carries: masthead, title block, one-line metadata, body, colophon. It carries no
    topbar, navbar, rail, actions row, claim hint, version panel or pill.
15. Printing with the OS in dark mode produces the same sheet as light: white ground, `#1b1714` ink.
16. Every prose link that is not `data-bare` prints its href in mono after the text; a `#`-anchor prints
    nothing.
17. A table crossing a page break re-prints its header row; no table row splits; no heading is the last
    thing on a page.
18. A past version prints its stamp above the title, unsplit, and the version appears in both the
    masthead and the colophon.
19. A measured explainer prints its **whole** framed document plus the caveat line. **Record the engine**
    — Chromium and WebKit print a content-sized frame in full; if Gecko clips, the caveat and the
    full-width fallback are the documented behaviour, not a bug to fix in CSS.
20. Nothing on the sheet is sized in `dvh`/`vh`, and `grep "@page" kb-print.css` returns exactly one rule
    with `size: auto`.

**States**

21. A document with no history renders **no** panel; a history fetch that throws renders the panel with
    the Unavailable editorial and no button.
22. A relay 404 and a relay 502 both render inside the frame's box at the reserved height, and the page
    length does not change.
23. Loading renders real strip labels with skeleton values; with `prefers-reduced-motion: reduce` the
    skeleton does not animate.
24. Export: `window.print()` blocked → the error line appears; an unmeasured explainer → the warning
    appears before the dialog and a second click is required.
