# Round 03 — record of what was designed

**Phase/slice:** P27.S2 · **Round:** 03-foundation · **Returned:** 2026-09-21
**Project:** Knowledge Base Design System · `623bb4ea-8fb7-4d31-9d58-5c6a42709bbe`
**Brief:** `web/design/rounds/03-foundation/handoff.md`

The operator answered every §6 question with "as your recommendation", so all eight were decided in the
design. Each decision is stated on the card that settles it, and restated here with its reasoning.

---

## 1. The eight open questions, answered

**1 · Phone navigation → a bottom bar; tablet gets the same element as a strip.**
One component, `.kb-navbar`, three equal links, three placements: pinned to the bottom of the screen below
40rem, a sticky strip under the topbar from 40 to 64rem, gone above. The product has three destinations and
no plan for a fourth, so a bar is honest at that count. A drawer would have been the only part of this
foundation that needs JavaScript, a focus trap, a scrim and an escape key. The rail is not narrowed to icons
at tablet — the three labels have no icons today, and inventing three glyphs for a reading room is
decoration this system does not do. Card **07**.

**2 · The rail fold → kept, unchanged, desktop-only.**
`app-frame.css` still owns `[data-rail="collapsed"]`; the `kb_rail` cookie is still read by the server and
still renders the first paint correctly. The responsive layer never writes `data-rail`. Below 64rem the
breakpoint removes the rail regardless of the cookie and hides the toggle, so nobody can reach a state the
cookie cannot describe, and the cookie survives a trip through a phone. No server change. Card **07**.

**3 · Topbar on phones → brand, plus an initial avatar opening a native `<details>`.**
The disclosure carries the full email, the org and Sign out. The crumb moves into the page-frame eyebrow,
where the org already appears. `<details>` was chosen over a menu because it works with no hydration, is
keyboard-operable out of the box and needs no focus trap. The topbar is 3.5rem at every width and never
wraps. The anonymous shell's **Sign in** is a different class and is *not* hidden on phones. Card **06**.

**4 · Dark scheme → adopted, following the operating system, no toggle.**
Scoped to `.kb-app` so the landing page is untouched. Gated on `data-kb-scheme="auto"` — the server saying
nobody has chosen — so a future preference control writes `light`/`dark` and the rule stops matching on its
own. Pure CSS, therefore no flash and no inline head script. A toggle was deliberately deferred: it costs a
topbar control, a cookie, a server read and a disagreement-with-OS policy, which is a round of its own. This
earned an **added card, 16**. Cards **16**, and dark proofs on **12**.

**5 · Tables on phones → column priority, then stacked cards.**
`data-pri="3"` columns leave below 64rem; below 40rem the table becomes one card per row with `data-label`
captions, the first cell promoted to the card heading and the action full width at the bottom. Horizontal
scroll is removed entirely. Priorities are assigned per table in the column definition and are listed on the
card for all three real tables. The `<thead>` is visually hidden, never deleted. Card **10**.

**6 · Type → display fluid, UI and body fixed. The stat numeral does scale down.**
Four `clamp()` ramps (page title, panel heading, stat numeral, editorial statement), all measured in `cqi`
against the `kbmain` container rather than `vw`. Body, labels, table cells and buttons hold their size —
0.82rem body text is already at its floor. The numeral reaches its 2.35rem ceiling at about 420px of main,
so every tablet and desktop tile is identical to today; it drops to 1.9rem on a phone so a four-digit count
fits a half-width tile. Card **02**.

**7 · Density → tighter gutters, taller targets, more air between sections.**
The spacing scale does not change; the shell picks different steps. Gutter 1.05rem on phone against 1.7rem
on desktop and 2.4rem above 90rem. A 44px floor (`--kb-tap`) under buttons, inputs and nav links below
40rem, and 16px input text specifically to stop iOS Safari zooming the page on focus. Desktop keeps the
hi2vi dashboard density the brief locks. Card **03**.

**8 · Error and loading → editorial for a page, a panel for a piece of one.**
When the page cannot exist the shell stays, the content area empties, and the page speaks in Fraunces on
bare paper with one teal action and a mono reference line. When a section fails inside a working page the
same block sits in the panel that failed. Empty states are never editorial — they live in the panel whose
contents are missing. The skeleton mirrors the layout it stands in for at the breakpoint it is standing in
(four tiles on desktop, two on a phone, card-shaped rows where the stacked table will land). Card **14**.

---

## 2. The structural decision the handoff did not ask for

**The console responds to its container, not the viewport.** `.kb-app` is the shell container (`kbapp`),
`.kb-app-main` is the content container (`kbmain`).

The rail is 15rem and folds. At a 1100px viewport with the rail expanded, main is 860px — a viewport query
at `lg` calls that desktop and keeps a two-column dashboard that no longer fits. Container queries are
correct in every rail state, and they make the fold and the breakpoints one system instead of two that have
to be reconciled. They also make the specimens honest: every frame on these cards is a real `.kb-app` at a
real width, not a picture of one, which is why a reviewer can scroll the phone frame and watch the bar
stick.

This is the one place the round went beyond the brief's scope, and it is load-bearing for everything else
in it.

---

## 3. Departures from the handoff

| Departure | What and why |
| --- | --- |
| **Card 01 renamed** | The handoff lists `01-tokens.html`; the shipped baseline's equivalent is `01-colors.html`. The round's card is `01-tokens.html` as specified and covers the palette **and** the new structural tokens. |
| **A 16th card added** | `16-scheme-adoption.html`, under `⏳ P27.S2 · Foundations`. The dark-scheme answer is a system-wide behaviour with a contract of its own; burying it in card 01 would have hidden it. |
| **`tokens.css` appended, not replaced** | The handoff asks for "a `tokens.css` the cards link". The file at the project root is the verbatim shipped copy the 15 `shipped/` cards link. Replacing it would have falsified the baseline. The round's values are **appended in a marked block, additively** — no value above that line changed, so `shipped/` renders identically. |
| **A second stylesheet** | The responsive rules live in a new `console-responsive.css` rather than being appended to `console.css`, for the same reason `app-frame.css` exists: `console.css` is a verbatim copy of the P12 handback and appending to it would forge a decision that round never made. |
| **New `.kb-*` classes** | Seven: `.kb-navbar` (+`__link`), `.kb-account` (+`__menu __email __org`), `.kb-pageframe` (+`__actions __title-wrap`), `.kb-app-cols`, `.kb-searchbar` (+`__field __filter`), `.kb-editorial` (+`__code __title __sub __actions __detail`), `.kb-skip`, plus `.kb-form-actions`, `.kb-toast-region`, `.kb-skel-*` and `.kb-appbtn__spin`. All are additions; nothing was renamed. |
| **A busy button state** | Did not exist. Added because forms now submit from phones where the page does not visibly reload. |
| **A skip link** | Did not exist. Added because the tab distance to content grew: on a phone the reader passes brand, account and three nav links first. |
| **`--kb-ease` annotated** | A `/* @kind other */` comment was added to the existing declaration so the compiler can classify it. No value change. |

**Not touched, as locked:** every existing token *name* and *value*; the brand spirit; teal as the only
interactive accent; the three faces and their Korean fallbacks; warm paper; no emoji; the status semantics
and their form encoding; the two-scheme attribute hook; all copy (every string on these cards is either from
`web/src/content/*` or is specimen chrome); the landing page.

---

## 4. What is in the project

**Cards** — 16 at the project root, in reading order, under three groups carrying the round's address:

```
⏳ P27.S2 · Foundations   01-tokens · 02-type · 03-spacing-shape · 04-breakpoints-layout · 16-scheme-adoption
⏳ P27.S2 · Components    05-page-frame · 06-topbar · 07-navigation · 08-buttons · 09-fields-forms ·
                          10-tables · 11-panels-tiles · 12-status · 13-search
⏳ P27.S2 · States        14-states · 15-focus-motion
```

**Stylesheets the cards link** — `fonts.css`, `tokens.css` (the round's values), `console.css`,
`app-frame.css`, `console-responsive.css` (the round's layer), `specimen.css`, `specimen-r3.css` (chrome).

**The contract** — `build-prompt.md`, beside this file. It is written for an implementer with no access to
this pane: every breakpoint, every per-component rule, the full navigation pattern, the table rule, the
states' composition, and the file-by-file apply map.

**`shipped/`** — untouched. It still renders exactly as it did, and remains the "before".

---

## 5. Open for later rounds

- **A scheme toggle.** The hook is in place (`data-kb-scheme`); the control, the cookie and the
  disagreement-with-OS policy are not designed.
- **Table sorting and paging.** Out of scope here. When they arrive they sit in the panel head.
- **The graph overlays.** Still at fixed absolute sizes; round 05.
- **Document surfaces and print.** `--kb-app-read-w` and `--kb-measure` are unchanged and untested against
  this foundation; round 06.
- **Rail icons.** Deliberately not introduced. If a fourth destination ever lands, the bar and the rail both
  need revisiting together.
