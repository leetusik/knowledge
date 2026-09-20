# Round 04 — implementation contract (build prompt)

**Phase/slice:** P27.S3 → applied in P28 · **Round:** 04-console-surfaces · **Date:** 2026-09-21
**Design project:** Knowledge Base Design System `623bb4ea-8fb7-4d31-9d58-5c6a42709bbe`
**Record of decisions and reasoning:** `result.md` beside this file.
**Round 03's contract** (the kit this composes): `round-03-build-prompt.md`, still binding in full.

Written for an implementer who cannot open the design pane. Everything needed to build the round is here,
including the stylesheet verbatim. **Invent nothing.** Where a value is not stated, Round 03's value stands;
where Round 03 is silent, the shipped value stands. **No token is added or changed. No string is added.**

---

## 0. The one rule, restated

Every responsive rule in this round is an `@container` query. There are **no `@media` rules in
`kb-console-r4.css`** — including the auth gate, which declares a container of its own (`kbauth`) rather
than querying the viewport.

| Container | Declared on | Governs |
| --- | --- | --- |
| `kbapp` | `.kb-app` | shell decisions — topbar, navbar vs. rail, gutters, the key-reveal sheet |
| `kbmain` | `.kb-app-main` | content decisions — page frame, tiles, tables, search, panels |
| `kbauth` | `.kb-authgate` | the auth gate only (new in this round) |

Named widths are Round 03's and unchanged: phone `< 40rem` · tablet `40–64rem` · desktop `>= 64rem` · wide
`>= 90rem`.

**The number that surprises people.** With the 15rem rail expanded, a 1180px window is **938px of main** =
58.6rem — *below* 64rem. So at 1180-expanded the dashboard is one column and priority-3 table columns are
hidden; the two-column pair needs 1264px of window with the rail open, or 1024px with it folded. This is
correct and intended. Do not "fix" it with a viewport query.

---

## 1. Files

| Action | Path | Notes |
| --- | --- | --- |
| **Create** | `web/src/app/kb-console-r4.css` | The stylesheet in §3, verbatim. |
| **Edit** | `web/src/app/globals.css` | `@import` it **after** `kb-console-responsive.css`. Unlayered, like the rest of the `.kb-*` layer. |
| **Do not touch** | `kb-tokens.css` | No token is added or changed in this round. |
| **Do not touch** | `kb-console.css`, `app-frame.css`, `kb-console-responsive.css` | Verbatim records of P12, the fold, and Round 03. |

Page-level edits are listed per surface in §4 and collected in §9.

---

## 2. Tokens

**None.** Every value in §3 is an existing `--kb-*` token, or a literal lifted verbatim from the component
it replaces (the auth card's gradient, inset light and shadow, which were inline styles in
`auth-card.tsx`).

---

## 3. `kb-console-r4.css` — the whole file, verbatim

```css
/* ==========================================================================
   Knowledge Base — Console SURFACES layer  (Round 04 · P27.S3)
   --------------------------------------------------------------------------
   Sits on top of console-responsive.css (Round 03). Round 03 built the kit —
   breakpoints on the container, the navbar, the topbar, the table rule, the
   states. Round 04 composes the six real surfaces out of it, and this file is
   only what that composition needed and the kit did not already have.

   ADDITIVE ONLY. Nothing above this file is edited: no token name or value
   changes, no `.kb-*` class is renamed, and console.css / app-frame.css /
   console-responsive.css are untouched verbatim records of earlier rounds.

   Same structural rule as Round 03: every console query is an `@container`
   query on `kbapp` (shell) or `kbmain` (content). The auth gate is outside the
   shell, so it declares a container of its own — `kbauth` on `.kb-authgate` —
   rather than reaching for the viewport: there are no `@media` rules in this
   file.

   Load order: kb-tokens.css → kb-console.css → app-frame.css →
   kb-console-responsive.css → THIS.
   ========================================================================== */

/* -------- Page flow ------------------------------------------------------- */
/* Every console page is one vertical stack. Today each panel carries its own
   `margin-top: var(--kb-space-md)`; one `gap` says it once, and it is what makes
   the stack's order reviewable in one place. */
.kb-page-flow { display: flex; flex-direction: column; gap: var(--kb-space-md); }
.kb-page-flow > .kb-pageframe { margin-bottom: 0; }

/* -------- Panel head ------------------------------------------------------ */
/* The head carries a heading, optionally a lead or a mono caption, and at most
   one trigger. Below 40rem it stacks and the trigger goes full width — a 44px
   target beside a heading leaves the heading nowhere to go. */
.kb-panel__headmain { min-width: 0; }
.kb-panel__lead { margin: 0.3rem 0 0; font-size: 0.85rem; line-height: var(--kb-leading-snug); color: var(--kb-secondary); max-width: 44rem; text-wrap: pretty; }
.kb-panel__caption { font-family: var(--kb-font-mono); font-size: 0.68rem; letter-spacing: 0.04em; text-transform: uppercase; color: var(--kb-hint); white-space: nowrap; flex: none; }
.kb-panel__head--start { align-items: flex-start; }
@container kbmain (width < 40rem) {
  .kb-panel__head { flex-direction: column; align-items: stretch; gap: 0.55rem; }
  .kb-panel__head > .kb-appbtn, .kb-panel__head > form > .kb-appbtn { width: 100%; }
  .kb-panel__caption { white-space: normal; }
}

/* -------- Disclosure forms (DECISION · Q6) -------------------------------- */
/* One placement at every width: the revealed form is a BLOCK under the head it
   hangs off, never a sheet, never a modal, never a field squeezed into the head
   row. The trigger stays visible and keeps `aria-expanded`, so the disclosure
   never hides the control that opened it and the page never jumps. */
.kb-inlineform { margin-top: 0.85rem; padding-top: 0.85rem; border-top: 1px solid var(--kb-border); max-width: 24rem; }
/* The page-frame variant (create project) has no panel around it, so it brings
   its own surface. */
.kb-inlineform--framed { margin-top: 0; padding-top: 0; border-top: 0; background: var(--kb-surface); border: 1px solid var(--kb-border); border-radius: var(--kb-radius); padding: 0.95rem 1rem 1rem; }
.kb-form-actions--end { justify-content: flex-end; }
@container kbmain (width < 40rem) {
  .kb-inlineform { max-width: none; }
  .kb-form-actions--end { justify-content: stretch; }
}

/* -------- A field with its own submit beside it --------------------------- */
/* The Public URL slug field: always visible (not a disclosure), so it cannot sit
   in the panel head beside the lead — it is a row under the head at every width. */
.kb-fieldrow { display: flex; align-items: flex-start; gap: 0.6rem; }
.kb-fieldrow > .kb-field { flex: 1 1 auto; min-width: 0; }
.kb-fieldrow > .kb-appbtn { flex: none; min-height: 2.85rem; margin-top: 1.55rem; }
@container kbmain (width < 40rem) {
  .kb-fieldrow { flex-direction: column; align-items: stretch; }
  .kb-fieldrow > .kb-appbtn { width: 100%; margin-top: 0.2rem; }
}

/* -------- Mono hint line under a form ------------------------------------- */
/* The documents search hint and the slug rule are SENTENCES, so they lose the
   uppercase transform the mono eyebrow style carries; mono and hint-grey keep
   them subordinate without shouting two lines of caps at a phone. */
.kb-hintline { font-family: var(--kb-font-mono); font-size: 0.7rem; line-height: 1.55; color: var(--kb-hint); margin: 0.6rem 0 0; }

/* -------- Search bar: submit + reset (DECISION · Q4) ---------------------- */
/* A third cell in the bar at 40rem and up; its own row under the bar below it,
   where Search takes the space and Reset stays the width of its label. */
.kb-searchbar__actions { display: flex; align-items: center; gap: 0.5rem; flex: none; }
@container kbmain (width < 40rem) {
  .kb-searchbar__actions > .kb-appbtn:first-child { flex: 1 1 auto; }
}

/* -------- Result rows: snippet · tags · pager ----------------------------- */
.kb-snippet { display: block; margin-top: 0.25rem; font-size: var(--kb-text-caption); line-height: var(--kb-leading-snug); color: var(--kb-hint); }
.kb-snippet mark { background: var(--kb-accent-soft); color: var(--kb-accent-strong); border-radius: 2px; padding: 0 0.15em; }
.kb-taglist { display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem; }
/* Overflow marker for a row carrying more tags than the cell can show. */
.kb-chip--more { color: var(--kb-hint); background: transparent; border-color: var(--kb-border); }
.kb-pager { display: flex; align-items: center; justify-content: flex-end; gap: 0.5rem; margin-top: var(--kb-space-md); }
@container kbmain (width < 40rem) {
  .kb-pager { justify-content: space-between; }
  .kb-pager > * { flex: 1 1 0; justify-content: center; min-height: var(--kb-tap); }
}

/* -------- Two-step confirm inside a row ----------------------------------- */
/* Revoke and Delete arm in place: the prompt replaces the label and the two
   buttons sit beside it. In a stacked phone card the prompt takes its own line
   above them, because "Delete permanently? This can't be undone." is a sentence,
   not a label. */
.kb-confirm { display: inline-flex; align-items: center; gap: 0.45rem; }
.kb-confirm__prompt { font-size: var(--kb-text-caption); line-height: var(--kb-leading-snug); color: var(--kb-status-revoked-ink); }
@container kbmain (width < 40rem) {
  .kb-confirm { display: flex; flex-wrap: wrap; width: 100%; gap: 0.4rem; }
  .kb-confirm__prompt { flex: 1 0 100%; }
  .kb-dtable tr > td:last-child .kb-confirm .kb-appbtn { width: auto; flex: 1 1 0; }
}

/* -------- Page frame: the project header's status pair -------------------- */
/* The Public/Private chip, the toggle that inverts it, and the one-line hint
   that says what the current state means. */
.kb-pageframe__status { display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem; flex: none; }
.kb-pageframe__hint { font-size: 0.8rem; line-height: var(--kb-leading-snug); color: var(--kb-secondary); text-align: right; max-width: 17rem; margin: 0; }
@container kbmain (width < 40rem) {
  .kb-pageframe__status { flex-direction: row; flex-wrap: wrap; align-items: center; justify-content: space-between; width: 100%; }
  .kb-pageframe__status > .kb-appbtn { flex: 1 1 auto; }
  .kb-pageframe__hint { order: 3; flex: 1 0 100%; text-align: left; max-width: none; }
}

/* -------- Public URL line ------------------------------------------------- */
.kb-urlline { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 0.75rem; }
.kb-urlline__label { font-family: var(--kb-font-mono); font-size: 0.68rem; letter-spacing: 0.04em; text-transform: uppercase; color: var(--kb-hint); }
.kb-urlline__url { font-family: var(--kb-font-mono); font-size: 0.85rem; color: var(--kb-ink); word-break: break-all; }
@container kbmain (width < 40rem) { .kb-urlline > .kb-appbtn { width: 100%; } }

/* -------- Recent activity feed -------------------------------------------- */
/* A mono relative-time column and a sentence with one bolded entity. The time
   column holds its 4.6rem at every width: it is what makes the feed scannable,
   and at 390 it still leaves 17rem for the sentence. */
.kb-activity { list-style: none; margin: 0; padding: 0; }
.kb-activity__row { display: flex; align-items: baseline; gap: 0.6rem; padding: 0.55rem 0; border-bottom: 1px solid var(--kb-border); font-size: 0.85rem; line-height: var(--kb-leading-snug); color: var(--kb-secondary); }
.kb-activity__row:last-child { border-bottom: 0; }
.kb-activity__time { width: 4.6rem; flex: none; font-family: var(--kb-font-mono); font-size: 0.68rem; color: var(--kb-hint); }
.kb-activity__row b { font-weight: var(--kb-weight-semibold); color: var(--kb-ink); }

/* -------- Anonymous public shell (DECISION · Q8) -------------------------- */
/* No rail, so main would run to the window edge at any width. It is capped at
   the same 88rem the member console caps at above 90rem and centred — a visitor
   never gets a wider column than a member. The Sign in action is never hidden. */
.kb-app--public .kb-app-main { max-width: var(--kb-app-max-w); margin-inline: auto; width: 100%; }
.kb-topbar__signin { flex: none; }

/* -------- Show-once key reveal on a phone (DECISION · Q6) ----------------- */
/* The one overlay the console keeps, because dismissing it loses the key. Below
   40rem it becomes a bottom sheet: the key sits above the thumb, Copy is the
   full-width primary, and the sheet clears the navbar. */
@container kbapp (width < 40rem) {
  .kb-reveal-overlay { align-items: end; padding: 0; }
  .kb-reveal { width: 100%; border-radius: var(--kb-radius) var(--kb-radius) 0 0; padding: 1.1rem 1.05rem calc(1.15rem + env(safe-area-inset-bottom, 0px)); }
  .kb-reveal__key { flex-direction: column; align-items: stretch; gap: 0.55rem; }
  .kb-reveal__key .kb-appbtn { width: 100%; }
}

/* -------- Auth gate (DECISION · Q7) --------------------------------------- */
/* The gate is its own stage: no shell, no rail, no page chrome. It is still
   measured on a CONTAINER, not the viewport — `.kb-authgate` declares `kbauth`
   and the page padding lives on the wrap inside it, so the rule that governs a
   390px phone is the same rule a 390px specimen frame proves. `safe center`
   keeps the card's top reachable when the software keyboard shortens the
   viewport; plain centring clips it. The card is never full-bleed: the card IS
   the threshold.

   `.kb-authcard` replaces the component's inline styles one-for-one; no value
   here is new except where a phone rule says so. */
.kb-authgate { container: kbauth / inline-size; min-height: 100dvh; display: grid; justify-items: center; align-content: safe center; background: var(--kb-paper); }
.kb-authgate__wrap { width: min(28rem, 100%); padding: 3.5rem 1.5rem; }
.kb-authcard { background: linear-gradient(180deg, #26221b, #1f1c16); border: 1px solid var(--kb-border-strong); border-radius: var(--kb-radius); padding: 1.6rem 1.6rem 1.3rem; box-shadow: 0 2rem 4rem rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(236, 228, 215, 0.06); }
.kb-authcard__brand { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 1.5rem; }
.kb-authcard__word { display: inline-flex; align-items: center; gap: 0.5rem; font-family: var(--kb-font-display); font-weight: var(--kb-weight-semibold); font-size: 1.35rem; color: var(--kb-ink); }
.kb-authcard__pill { display: inline-flex; align-items: center; gap: 0.4rem; flex: none; font-family: var(--kb-font-mono); font-size: 0.56rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--kb-accent); border: 1px solid var(--kb-border-strong); border-radius: var(--kb-radius-pill); padding: 0.3em 0.6em; }
.kb-authcard__pill i { width: 6px; height: 6px; border-radius: 50%; background: var(--kb-accent); box-shadow: 0 0 0 3px var(--kb-accent-soft); }
.kb-authcard__lead { font-family: var(--kb-font-display); font-weight: var(--kb-weight-semibold); font-size: 1.35rem; line-height: var(--kb-leading-display); color: var(--kb-ink); margin: 0 0 0.2rem; }
.kb-authcard__sub { font-size: 0.88rem; line-height: var(--kb-leading-snug); color: var(--kb-secondary); margin: 0 0 1.3rem; text-wrap: pretty; }
/* The status-keyed error sits between the last field and the submit, and its
   box is ALWAYS rendered, so arriving at an error moves nothing. */
.kb-authcard__error { min-height: 1.15rem; margin: 1rem 0 0.55rem; font-size: 0.82rem; line-height: var(--kb-leading-snug); color: var(--kb-status-revoked-ink); }
.kb-authcard__submit { width: 100%; }
.kb-authcard__trust { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.4rem 1.1rem; margin-top: 1.3rem; padding-top: 1rem; border-top: 1px solid var(--kb-border); }
.kb-authcard__trustitem { display: inline-flex; align-items: center; gap: 0.4rem; font-family: var(--kb-font-mono); font-size: 0.58rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--kb-hint); white-space: nowrap; }
.kb-authcard__trustitem i { width: 5px; height: 5px; border-radius: 50%; background: var(--kb-accent); flex: none; }
.kb-authcard__alt { text-align: center; font-size: 0.88rem; color: var(--kb-secondary); margin: 1.3rem 0 0; }
.kb-authcard__alt a { color: var(--kb-accent); font-weight: var(--kb-weight-semibold); text-decoration: none; }
.kb-authcard__alt a:hover { color: var(--kb-accent-strong); text-decoration: underline; }
@container kbauth (width < 40rem) {
  .kb-authgate__wrap { padding: 2.2rem var(--kb-app-gutter-phone) 2.6rem; }
  .kb-authcard { padding: 1.15rem 1.15rem 1.05rem; }
  .kb-authcard__brand { margin-bottom: 1.15rem; }
  /* Restated for the gate: Round 03's tap floor and 16px inputs live inside
     `@container kbapp`, and the gate is not inside `.kb-app`. */
  .kb-authcard .kb-field__input { min-height: var(--kb-tap); font-size: 1rem; }
  .kb-authcard .kb-appbtn { min-height: var(--kb-tap); }
  .kb-authcard__trust { gap: 0.35rem 0.85rem; }
}

/* -------- Specimen-only state aliases (not used in production) ------------ */
.kb-authcard .kb-field__input.is-focus { border-color: var(--kb-accent); box-shadow: 0 0 0 3px var(--kb-accent-soft); }
```

---

## 4. Surface by surface

### 4.1 Every console page — the page flow

Each page's blocks become direct children of one flow element inside `<main>`:

```html
<main id="content" class="kb-app-main">
  <div class="kb-page-flow">
    <div class="kb-pageframe">…</div>
    …blocks, in order…
  </div>
</main>
```

**Delete every `style={{ marginTop: "var(--kb-space-md)" }}` and `mt-[var(--kb-space-md)]` on a page-level
block.** The flow's `gap` is the page's vertical rhythm, and the flow is where a reviewer reads the page's
order off one element.

The shell itself (skip link → topbar → navbar → layout → toast sibling) is Round 03's and does not change.

### 4.2 Anonymous public shell — `components/public-shell.tsx`

```html
<div class="kb-app kb-app--public" data-md-color-scheme="default">
  <a class="kb-skip" href="#content">…</a>
  <header class="kb-topbar">
    <a class="kb-topbar__brand" href="/">…</a>
    <span class="kb-topbar__spacer"></span>
    <a class="kb-appbtn kb-appbtn--ghost kb-appbtn--sm kb-topbar__signin" href="/login">Sign in</a>
  </header>
  <div class="kb-app-layout">
    <main id="content" class="kb-app-main">{children}</main>
  </div>
</div>
```

- `.kb-app--public` caps main at `--kb-app-max-w` (88rem) and centres it, at **every** width.
- **No `.kb-navbar`**, no rail, no crumb, no user, no account disclosure, no rail toggle.
- **No `data-kb-scheme`**: the public surfaces stay light (the graph engine reads the scheme attribute and
  rounds 05/06 have not designed a dark graph).
- `.kb-topbar__signin`, never `.kb-topbar__signout` — that class is what Round 03's phone rule hides.
- Keep the existing sticky utilities or move them to `.kb-topbar` (Round 03 already makes the topbar
  sticky); do not add a second sticky context.

### 4.3 Dashboard — `app/(app)/dashboard/page.tsx`

Order inside `.kb-page-flow`, identical at every width:

1. `.kb-pageframe` — eyebrow `{org} · Org`, `h1` "Dashboard", sub; actions slot holds the one primary,
   "New project".
2. `.kb-tile-grid` — four tiles, eyebrow + figure, **no delta line**.
3. Trend panel.
4. `.kb-app-cols` — Projects (1.7fr) · Recent activity (1fr).
5. Public URL panel.
6. Org API keys panel.

**Trend panel**

```html
<section class="kb-panel" aria-labelledby="trend-head">
  <div class="kb-panel__head">
    <h2 id="trend-head" class="kb-app-h2">Searches · last 30 days</h2>
    <span class="kb-panel__caption">{DASHBOARD.trend.caption(total, peak)}</span>
  </div>
  <figure class="kb-trend-wrap" data-…>…TrendChart…</figure>
</section>
```

**Delete the `h-[120px]` figure class.** `.kb-trend-wrap` (Round 03) owns the height:
`clamp(6rem, 3.6rem + 9cqi, 8.5rem)` — 136px at desktop, 96px at 390. The SVG keeps
`preserveAspectRatio="none"`; at 390 the box is 3.7:1 against its native 3.75:1.

**Projects panel** — head is the `h2` alone. Table priorities are Round 03's: Project, Action = 1 · Docs,
Visibility, Last used = 2 · Keys, Created = 3. The **project name cell becomes a link**:

```html
<a href={`/projects/${project.id}`} class="kb-dtable__name">{project.name}</a>
```

The ghost `sm` **Open** button stays in the action column. The row itself is not clickable and takes no
`cursor: pointer`.

**Recent activity panel**

```html
<ul class="kb-activity">
  <li class="kb-activity__row">
    <span class="kb-activity__time">{relativeTime(event.at)}</span>
    <span>{template.text} · <b>{emphasised}</b></span>
  </li>
</ul>
```

Replaces the inline Tailwind list. The time column is `4.6rem`, `flex: none`, at every width.

**Public URL panel** — the field is **always visible** and is **not** in the head:

```html
<section class="kb-panel" aria-labelledby="org-slug-head">
  <div class="kb-panel__head kb-panel__head--start">
    <div class="kb-panel__headmain">
      <h2 id="org-slug-head" class="kb-app-h2">Public URL</h2>
      <p class="kb-panel__lead">{DASHBOARD.orgSlug.lead}</p>
    </div>
  </div>
  <div class="kb-fieldrow">
    <label class="kb-field">
      <span class="kb-field__label">Org slug</span>
      <input class="kb-field__input" …>
    </label>
    <button class="kb-appbtn kb-appbtn--secondary">Save</button>
  </div>
  <p class="kb-hintline">{DASHBOARD.orgSlug.hint}</p>
  <!-- claimed -->
  <div class="kb-urlline">
    <span class="kb-urlline__label">{DASHBOARD.orgSlug.graphUrlLabel}</span>
    <code class="kb-urlline__url">/@{slug}/graph</code>
    <CopyLinkButton …/>
  </div>
  <!-- not claimed -->
  <p class="kb-panel__lead">{DASHBOARD.orgSlug.empty}</p>
</section>
```

The slug label is **visible**, not `sr-only`: on a phone the panel heading is two lines above the input and
cannot act as its label. Below 40rem `.kb-fieldrow` stacks and Save goes full width at 44px; the Copy button
in `.kb-urlline` does the same.

**Org API keys panel** — head carries the heading, the lead and the "New key" disclosure trigger; the mint
form opens **below the head** (§4.4); the table follows. Priorities: Name, Key, Status, Actions = 1 ·
Last used = 2 · Created = 3.

### 4.4 Disclosures, everywhere — one placement

Applies to **create project**, **mint org key**, **mint credential**.

```html
<!-- trigger stays in the head / page frame -->
<button type="button" class="kb-appbtn kb-appbtn--secondary" aria-expanded="true" aria-controls="mint-form">
  <Plus size={16} aria-hidden/> New key
</button>

<!-- the revealed form, as the next sibling of the head -->
<form id="mint-form" class="kb-inlineform">
  <label class="kb-field">…</label>
  <div class="kb-form-actions kb-form-actions--end">
    <button class="kb-appbtn kb-appbtn--ghost">Cancel</button>
    <button class="kb-appbtn kb-appbtn--primary">Create key</button>
  </div>
</form>
```

- The trigger **never disappears**; it toggles `aria-expanded` and closes the form.
- `.kb-inlineform` inside a panel; `.kb-inlineform--framed` when the form hangs off the page frame
  (create project), because there is no panel around it to supply a surface.
- Max width 24rem above 40rem; full width below. Actions right-aligned above 40rem; 50/50 at 44px below.
- Focus moves to the first field on open and back to the trigger on close.
- The error is the field's own `.kb-field__error` (always rendered, 1.1rem reserved). No layout moves.

**The show-once key reveal** keeps its overlay:

```html
<div class="kb-reveal-overlay">
  <div class="kb-reveal kb-reveal-in" role="dialog" aria-modal="true" aria-labelledby="rv-head">
    <h2 id="rv-head" class="kb-reveal__title">Copy your new key now</h2>
    <p class="kb-reveal__warn"><span class="kb-status__dot" aria-hidden="true"></span>{warning}</p>
    <div class="kb-reveal__key">
      <code class="kb-reveal__code" aria-label="New API key">{plaintext}</code>
      <button class="kb-appbtn kb-appbtn--secondary kb-appbtn--sm">Copy</button>
    </div>
    <div class="kb-reveal__actions"><button class="kb-appbtn kb-appbtn--ghost">Dismiss</button></div>
  </div>
</div>
```

Below 40rem of `kbapp` the overlay bottom-anchors and the panel becomes a full-width sheet with top corners
only, the key block stacks (Copy full width beneath the code), and Round 03's `column-reverse` puts Copy
above Dismiss. Bottom padding includes `env(safe-area-inset-bottom)`; the sheet clears the navbar.

### 4.5 Project page — `app/(app)/projects/[projectId]/page.tsx`

Order inside `.kb-page-flow`: page frame · tiles · trend · **Documents (§4.6)** · API keys.

```html
<div class="kb-pageframe">
  <div class="kb-pageframe__title-wrap">
    <div class="kb-app-eyebrow">Org · Project</div>
    <h1 class="kb-app-title">{project.name}</h1>
    <p class="kb-app-sub">Created {date}</p>
  </div>
  <div class="kb-pageframe__status">
    <Badge status={public ? "active" : "idle"} chip>{Public|Private}</Badge>
    <button class="kb-appbtn kb-appbtn--secondary">{Make public|Make private}</button>
    <p class="kb-pageframe__hint">{PROJECT.visibility.hint[state]}</p>
  </div>
</div>
```

- Above 40rem: right-aligned column, hint right-aligned under the toggle at `max-width: 17rem`.
- Below 40rem: one full-width row — chip left, toggle taking the rest — with the hint on its own line,
  left-aligned, `order: 3`.
- Busy toggle: `aria-busy="true"` + `.kb-appbtn__spin` + "Saving…". Never `disabled`.

Credentials panel: same head/disclosure/table rules as the org-keys panel; priorities Name, Key, Status,
Actions = 1 · Last used = 2 · Created = 3; a revoked key renders no action.

### 4.6 Project documents panel — NEW

```html
<section class="kb-panel" aria-labelledby="proj-docs-head">
  <div class="kb-panel__head">
    <h2 id="proj-docs-head" class="kb-app-h2">{DOCUMENTS.title}</h2>
    <a class="kb-appbtn kb-appbtn--ghost kb-appbtn--sm"
       href={`/documents?project=${project.id}`}>{DOCUMENTS.read.backLabel}</a>
  </div>
  <DataTable columns={projectDocColumns} rows={docs} empty={DOCUMENTS.list.emptyNoDocuments} />
</section>
```

| Concern | Rule |
| --- | --- |
| Position | After the trend panel, before the API keys panel, at every width. |
| Data | `getDocuments(token, { project: projectId })` — `lib/knowledge/app.ts:387` — as a **second parallel fetch** beside `getProjectUsage` (`Promise.all`). Take the first **5** of `items`. |
| Failure | This fetch must NOT take the page down. Catch it and render the in-panel failure block (Round 03 §5.2: `.kb-panel` + `.kb-editorial`, `h2` at 1.15rem, one `sm` Retry) in this panel only. A 401 still redirects via the page's existing guard. |
| Columns | Title (priority 1, link to `/documents/{id}`) · Date (priority 2, `mono`) · Tags (priority 3). |
| Not included | **Project** (the panel is inside the project) and **Delete** (deleting is a documents-surface action). No snippet — there is no query to highlight. |
| Order | Newest first — the endpoint's default. No sort control. |
| Past five | Nothing. No pager, no "show more"; the head link is the way through. |
| Head caption | None. A count there would read as the project's total, and the panel shows five of an unknown many. |
| Empty | The table's own empty row with `DOCUMENTS.list.emptyNoDocuments`. Not `.kb-empty` (it wants a title *and* a sub; only one string exists) and never editorial. |
| Strings | All existing: `DOCUMENTS.title`, `DOCUMENTS.read.backLabel`, `DOCUMENTS.list.columns.*`, `DOCUMENTS.list.noTags`, `DOCUMENTS.list.emptyNoDocuments`. |

### 4.7 Documents — `app/(app)/documents/page.tsx`

**The bar.** Delete `min-[720px]:flex-row`, `min-[720px]:flex-1`, `min-[720px]:w-56` and the wrapper's
utility classes:

```html
<form class="kb-searchbar" method="GET" action="/documents">
  {hidden passthrough inputs}
  <div class="kb-searchbar__field">
    <label class="kb-appsearch">
      <Search size={16} aria-hidden/>
      <input class="kb-appsearch__input" type="search" name="q" aria-label="Search documents" …>
      <span class="kb-appsearch__key">/</span>
    </label>
  </div>
  <div class="kb-searchbar__filter">
    <select class="kb-field__input" name="project" aria-label="Project">…</select>
  </div>
  <div class="kb-searchbar__actions">
    <button type="submit" class="kb-appbtn kb-appbtn--primary">Search</button>
    <a href="/documents" class="kb-appbtn kb-appbtn--ghost">Reset</a>
  </div>
</form>
<p class="kb-hintline">{DOCUMENTS.search.hint}</p>
```

Reset stays a link, never `type="reset"`. Below 40rem the bar stacks and Search flexes while Reset keeps its
intrinsic width.

**Results panel** — head is `h2` "Documents" + `.kb-panel__caption` with `DOCUMENTS.count.label(total)`.
Table priorities (Round 03): Title, Actions = 1 · Project, Date = 2 · Tags = 3.

**Snippet** (search mode) — inside the title cell, after the link:

```html
<span class="kb-snippet">…text <mark>match</mark> text…</span>
```

The rebuild-from-literal-`<mark>`-markers logic is unchanged (never `dangerouslySetInnerHTML`); only the
styling moves out of Tailwind arbitraries into `.kb-snippet mark`. Because the snippet lives in the title
cell, it stays with the title when the row becomes a card below 40rem.

**Tags**

```html
<span class="kb-taglist">
  <span class="kb-chip">{tag}</span> ×3
  <span class="kb-chip kb-chip--more" title="{remaining, comma-separated}">+{n}</span>
</span>
```

Max three chips, then the overflow marker. No tag is truncated. Below 64rem the column leaves entirely
(priority 3).

**Pager**

```html
<nav class="kb-pager" aria-label="Documents pagination">
  <span class="kb-appbtn kb-appbtn--ghost kb-appbtn--sm" aria-disabled="true">Previous</span>
  <a class="kb-appbtn kb-appbtn--secondary kb-appbtn--sm" href="…">Next</a>
</nav>
```

Right-aligned; the disabled side keeps its `pointer-events: none; opacity: .4`. Below 40rem the two split
the row and take the 44px floor. Still rendered only when a page exists to go to.

**Delete confirm** — arms in the action cell:

```html
<span class="kb-confirm">
  <span class="kb-confirm__prompt">{DOCUMENTS.delete.confirmPrompt}</span>
  <button class="kb-appbtn kb-appbtn--ghost kb-appbtn--sm">Cancel</button>
  <button class="kb-appbtn kb-appbtn--danger kb-appbtn--sm">Yes, delete</button>
</span>
```

Below 40rem the prompt takes its own full-width line above the two buttons, which split the row. Same
markup for **revoke** on the project and dashboard key tables (`PROJECT.revoke` / `DASHBOARD.orgKeys.revoke`
copy).

**Empty states** — both inside the results panel, in the table's empty row, with the `0 results` caption
still in the head: `emptyNoDocuments` when there are no filters, `emptyNoMatches` when there are. The
submitted query stays in the bar. Neither is editorial.

### 4.8 Auth — `app/(auth)/layout.tsx`, `auth-card.tsx`, `credentials-form.tsx`

**Delete every inline style in `auth-card.tsx`.** The structure becomes:

```html
<div class="kb-authgate" data-md-color-scheme="slate">
  <div class="kb-authgate__wrap">
    <div class="kb-authcard">
      <div class="kb-authcard__brand">
        <span class="kb-authcard__word"><img src={BRAND.logo} alt="" width="24" height="24"/>{BRAND.wordmark}</span>
        <span class="kb-authcard__pill"><i aria-hidden="true"></i>{copy.securePill}</span>
      </div>
      <h1 class="kb-authcard__lead">{copy.lead}</h1>
      <p class="kb-authcard__sub">{copy.sub}</p>
      {/* CredentialsForm */}
      <form novalidate>
        <div class="kb-field">…email…</div>
        <div class="kb-field">…password… {signup && <p class="kb-field__hint">…</p>}</div>
        <p class="kb-authcard__error" id="{id}-error" role="alert">{error ?? ""}</p>
        <button type="submit" class="kb-appbtn kb-appbtn--primary kb-authcard__submit">…</button>
      </form>
      <div class="kb-authcard__trust">
        <span class="kb-authcard__trustitem"><i aria-hidden="true"></i>{item}</span> ×3
      </div>
    </div>
    <p class="kb-authcard__alt">{copy.altPrompt} <a href={copy.altHref}>{copy.altLinkLabel}</a></p>
  </div>
</div>
```

| Concern | Rule |
| --- | --- |
| Stage | `min-height: 100dvh`, grid, `align-content: safe center`, `container: kbauth / inline-size`. Replaces the layout's `place-items-center px-6 py-14`. |
| Wrap | `width: min(28rem, 100%)`, `padding: 3.5rem 1.5rem` → the card is 25rem. Below 40rem: `2.2rem / 1.05rem / 2.6rem`. |
| Error | Rendered **always** (empty string when none), between the password field and the submit, `min-height: 1.15rem`, `role="alert"`. One message for the form; never per field. |
| `aria-invalid` | On **both** inputs while an error stands, with `aria-describedby` pointing at the error's id. Typing in either clears error + attributes. |
| Submit | Full width. Busy = `aria-busy="true"` + `.kb-appbtn__spin` + the pending label, never `disabled`. |
| Fields below 40rem | 44px tall, 16px text — from the `kbauth` query (Round 03's floors are scoped to `kbapp`, which the gate is not inside). |
| Password hint | Signup only, `.kb-field__hint`, attached to the field. Never carries an error. |
| Trust chips | Wrap to as many centred lines as needed; gap tightens below 40rem. Never truncated, never scrolled, never reduced to two of three. |
| Scheme | `data-md-color-scheme="slate"` on the stage; **no `data-kb-scheme`**. The gate is always dark. |

---

## 5. What each surface does at each width

| Surface | phone `< 40rem` | tablet `40–64rem` | desktop `>= 64rem` (of the container named) |
| --- | --- | --- | --- |
| Member shell | bottom bar, account disclosure, no rail, 1.05rem gutter | bar as a sticky strip, no rail | rail returns, fold applies, bar gone |
| Public shell | no bar ever, Sign in visible | same | main capped 88rem, centred |
| Dashboard | one column, tiles 2-up, tables as cards, page action full width | one column, tiles 4-up, priority-3 columns gone | `.kb-app-cols` splits at 64rem **of main** (1264px of window with the rail open) |
| Dashboard panels | disclosures full width; key reveal is a bottom sheet | disclosure 24rem | disclosure 24rem; reveal is a centred modal |
| Project | header pair is one row + hint line; same block order | same block order | status pair right-aligned |
| Project documents | cards, tags gone, title is the heading | tags gone | title · date · tags |
| Documents | bar stacks, actions share a row, pager splits | bar one row, tags gone | full table, pager right |
| Auth | 1.05rem stage padding, 1.15rem card padding, 44px/16px fields | 25rem card, 3.5rem stage padding | unchanged from tablet — the card never grows |

---

## 6. Accessibility floor — additions to Round 03's

| Concern | Rule |
| --- | --- |
| Project row | Two targets, both labelled: the name link (its text is the project name) and `Open` (whose accessible name must include the project name, e.g. `aria-label="Open changple"` if the visible label stays generic). |
| Disclosures | `aria-expanded` on the trigger, `aria-controls` pointing at the form's id. Focus to the first field on open, back to the trigger on close. |
| Two-step confirms | The armed state replaces the trigger in the same cell; focus moves to **Cancel**, not to the destructive button. The trigger's `aria-label` carries the row's subject. |
| Key reveal | `role="dialog" aria-modal="true"`, labelled by its heading; focus enters on the dialog, `Esc` dismisses, focus returns to the trigger. On a phone it is still a dialog, not a page region. |
| Auth error | `role="alert"` on an always-present element, so the message is announced on change rather than on mount. |
| Busy controls | `aria-busy`, never `disabled` — a disabled control leaves the tab order mid-action. |
| Tag overflow | The `+{n}` marker carries a `title` listing the hidden tags and is not interactive; it must not be the only place a tag name exists for a screen reader (the read page carries the full list). |
| Targets | Everything Round 03 set at 44px below 40rem still applies, and the auth gate now restates it for `kbauth`. |

---

## 7. Copy

**No new strings.** Every string on these surfaces already exists:

| Surface | Source |
| --- | --- |
| Shell, nav, account | `content/app.ts` (`APP_NAV`, `APP_SHELL`) |
| Public shell | `content/index.ts` → `PUBLIC_SHELL.signIn` |
| Dashboard | `content/dashboard.ts` |
| Project | `content/project.ts` |
| Documents, **and the new project documents panel** | `content/documents.ts` |
| Auth | `content/auth.ts` (`AUTH_ERRORS`, `AUTH_TRUST_ITEMS`, `LOGIN_PAGE`, `SIGNUP_PAGE`) |

The project documents panel uses `DOCUMENTS.title` (heading), `DOCUMENTS.read.backLabel` (the "All
documents" link), `DOCUMENTS.list.columns.*`, `DOCUMENTS.list.noTags` and
`DOCUMENTS.list.emptyNoDocuments`.

---

## 8. Apply map

| File | Change |
| --- | --- |
| `app/kb-console-r4.css` | **new** — §3 |
| `app/globals.css` | `@import` after `kb-console-responsive.css` |
| `components/public-shell.tsx` | `.kb-app--public`, `.kb-topbar__signin`, skip link |
| `app/(app)/dashboard/page.tsx` | `.kb-page-flow`; panel heads (`__headmain`, `__lead`, `__caption`); `.kb-fieldrow` + `.kb-hintline` + `.kb-urlline`; `.kb-activity`; project name link; delete the trend figure's `h-[120px]` and every block `margin-top` |
| `dashboard/create-project-form.tsx` | form moves out of the header into `.kb-inlineform--framed` under the page frame; trigger stays with `aria-expanded` |
| `dashboard/mint-org-key-form.tsx`, `projects/[id]/mint-credential-form.tsx` | `.kb-inlineform` under the panel head; `.kb-form-actions--end` |
| `dashboard/org-slug-form.tsx` | `.kb-fieldrow`, visible label |
| `dashboard/revoke-org-key-button.tsx`, `projects/[id]/revoke-credential-button.tsx`, `documents/delete-document-button.tsx` | `.kb-confirm` + `.kb-confirm__prompt` |
| `projects/[projectId]/page.tsx` | `.kb-page-flow`; `.kb-pageframe__status` + `__hint`; **the new documents panel (§4.6) and its parallel fetch**; trend figure |
| `projects/[projectId]/visibility-toggle.tsx` | busy state via `aria-busy` + spinner |
| `app/(app)/documents/page.tsx` | `.kb-searchbar__actions`; delete `min-[720px]:*`; `.kb-hintline`; `.kb-snippet`; `.kb-taglist` + `.kb-chip--more`; `.kb-pager` |
| `components/ui/reveal` (show-once) | nothing structural — the phone sheet is CSS only |
| `app/(auth)/layout.tsx` | `.kb-authgate` replaces the stage utilities |
| `app/(auth)/auth-card.tsx` | **all inline styles deleted**, replaced by `.kb-authcard*` |
| `app/(auth)/credentials-form.tsx` | always-rendered `.kb-authcard__error` above the submit; `.kb-authcard__submit`; busy via `aria-busy` |

---

## 9. Definition of done

1. `kb-console-r4.css` exists verbatim and is imported after `kb-console-responsive.css`. No token changed.
2. Every console page's blocks are children of one `.kb-page-flow`; no page-level `margin-top` survives.
3. At **1180 with the rail expanded** the dashboard is one column and Keys/Created are hidden; **folding the
   rail** brings back the 1.7fr / 1fr pair and all seven columns. Both are correct.
4. At **390**: the dashboard's six blocks appear in the same order as at 1180; the trend is 96px tall and
   not distorted; tables are cards; every target is ≥44px; inputs are 16px.
5. A project row can be reached by tapping the project name **and** by the Open button; the row itself is
   not a link.
6. The project page shows a Documents panel with five rows between the trend and the API keys, linking to
   `/documents?project={id}`; with no documents it shows the one-sentence empty row inside the panel.
7. The documents bar carries Search and Reset at every width; the `min-[720px]:` utility is gone from the
   codebase.
8. A search result marks its matches with real `<mark>` elements styled by `.kb-snippet mark`; a row with
   five tags shows three chips and `+2`.
9. Every disclosure opens as a block under its head with its trigger still visible; the show-once key reveal
   is a centred modal above 40rem and a bottom sheet below it, clearing the navbar.
10. The auth gate is a 25rem card at every width, with the status-keyed error in an always-present slot
    between the password field and the submit; at 390 the stage padding is 1.05rem and the fields are 44px
    and 16px.
11. `grep` finds **no `@media`** rule in `kb-console-r4.css`.
12. With the OS in dark mode the console is slate, the auth gate is still slate, the landing page is still
    light, and no rule in this round had to be written twice for it.
