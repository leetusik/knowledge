# Round 04 — record of what was designed

**Phase/slice:** P27.S3 · **Round:** 04-console-surfaces · **Returned:** 2026-09-21
**Project:** Knowledge Base Design System · `623bb4ea-8fb7-4d31-9d58-5c6a42709bbe`
**Brief:** `web/design/rounds/04-console-surfaces/handoff.md`
**Contract for the apply phase:** `build-prompt.md`, beside this file.
**Round 03's record and contract** are preserved in this project as `round-03-result.md` and
`round-03-build-prompt.md` (see Departures).

Round 03 built the kit. Round 04 composes the six surfaces out of it, at 390 / 768 / 1180, with the real
data and the real copy. Ten cards, one new stylesheet, no new tokens, **no new strings**.

---

## 1. The eight open questions, answered

**1 · Dashboard order on a phone → the desktop order, unchanged, and nothing folds.**
Tiles → trend → projects · recent activity → Public URL → Org API keys, top to bottom, at every width. The
blocks are already in falling order of how often they are read, and a page that rearranges itself between
devices is a second page to learn — the operator who checks the dashboard on a phone at 9am and a laptop at
10am should be reading the same page twice, not two pages once. Nothing hides behind a disclosure: a
disclosure conceals exactly the state the dashboard exists to show. The only things that fold are the three
forms that already fold (create project, mint org key, mint credential). Card **19**.

**2 · The project click target → the name is the link; the Open button stays.**
A seven-column row whose only target is a 38px ghost button at the far right is a row you have to aim at.
Making the whole row a link breaks text selection, hands a screen reader one enormous link, and leaves
nowhere to put the second control a row will eventually need. So the project name becomes an `<a>` (it is
what the eye is already on) and the explicit **Open** action stays in the action column the data contract
fixes. In a stacked phone card the name is the card heading and the link, and Open is the full-width 44px
action at the bottom of the card. Cards **19**, **21**.

**3 · The project's documents list → a panel between the trend and the API keys: five newest, title · date
· tags, one link to the rest.**
Above it, what the project has been doing; inside it, what the project holds; below it, the machinery that
fills it. A row is the title as a link to `/documents/{id}`; the head's **All documents** goes to
`/documents?project={id}`, the filtered list that already exists. Five rows, because the panel answers
"what is in here, and is it current" — not "show me everything"; everything is one click away on a surface
built for it. Past five: nothing — no pager, no "show more". Columns are the documents list's own minus two:
**Project** (the panel is inside the project) and **Delete** (a project page that can silently destroy a
document is a page you cannot hand to a colleague). Empty: the table's own empty row carrying
`DOCUMENTS.list.emptyNoDocuments`. Card **22**.

**4 · The search bar's submit and reset → a third cell in the bar; their own row on a phone.**
Above 40rem: field (flex) · project filter (12rem) · Search (primary) + Reset (ghost), one row. Below 40rem
the bar stacks and the two buttons share a row, Search taking the space and Reset the width of its word —
two stacked full-width buttons would spend a third of the screen saying one thing twice. Reset stays a link
to `/documents`, never `type="reset"`. Card **23**.

**5 · The 30-day trend on a phone → kept, unchanged, at every width.**
The distortion the handoff feared was a property of the fixed 120px figure, and Round 03 already removed it:
`.kb-trend-wrap` is `clamp(6rem, 3.6rem + 9cqi, 8.5rem)` measured on `kbmain`, which at 390 gives a 96px box
over a 354px column — 3.7:1 against the SVG's native 3.75:1, a 1% stretch. Nothing to fix and nothing to
drop. What the round does change is the panel head: below 40rem the heading and the mono caption stack
instead of sharing a baseline row. The apply must **delete the `h-[120px]` figure utility** on both pages;
the clamp owns the height now. Cards **19**, **21**.

**6 · Panel-head disclosures on a phone → a block under the head, at every width. The key reveal becomes a
bottom sheet.**
One placement everywhere, because three placements is three things to learn: the revealed form renders after
the head as `.kb-inlineform` (24rem above 40rem, full width below), the trigger stays visible carrying
`aria-expanded`, and nothing above the form moves. The create-project form, which hangs off the page frame
rather than a panel, brings its own surface (`.kb-inlineform--framed`) — it replaces today's 17rem field
crammed into the header row, which at 390 had nowhere to go at all. The **show-once reveal** is the one
overlay the console keeps, because dismissing it loses the key: a centred modal above 40rem, a bottom sheet
below it, where the mono key wraps full width, Copy is the full-width primary directly under it, and Dismiss
sits below Copy so the destructive-by-omission action is never the one under the thumb. Card **20**.

**7 · The auth gate on a phone → still a card; the error sits above the submit.**
The card is the design — a lit threshold on a dark page — and a full-bleed phone variant would be a
different product for the same two fields. What changes below 40rem is the air around it: stage padding
1.5rem → 1.05rem (the phone gutter), card padding 1.6rem → 1.15rem, which buys 26px of card width without
touching the type. The error renders **between the last field and the submit, always**, in a reserved
1.15rem box: one message for the whole form, never per field, because `invalidCredentials` deliberately does
not say which field is wrong — and because the password is cleared on failure, a message under the password
field would be pointing at an empty input. Cards **25**, **26**.

**8 · The anonymous shell on desktop → main capped at 88rem and centred; the topbar carries brand and Sign
in only.**
With no rail there is nothing to stop a visitor's column at 1440 or 1920. The member console already stops
at `--kb-app-max-w` above 90rem, so the public shell applies the same cap from the start: a stranger never
gets a wider measure than a member. No navbar at any width — the bar exists to reach Dashboard, Documents
and Graph, and a visitor can reach none of them. Sign in is `.kb-topbar__signin` (not `__signout`, which is
the class the phone rule hides) and is never hidden. One new class, `.kb-app--public`, doing one thing.
Card **18**.

---

## 2. What the round found that the handoff did not ask

**At 1180 with the rail expanded, the dashboard is already in its one-column form.** Main is 938px = 58.6rem,
which is below the 64rem where `.kb-app-cols` splits and below where priority-3 table columns return. The
1.7fr / 1fr pair needs **1264px of window** with the rail open, or 1024px with it folded. This is the
container rule working exactly as Round 03 intended (a 575px-wide seven-column table is not a desktop
layout), but it means "desktop" in this product is the fold state as much as the window — so card **19**
shows 1180 twice, expanded and folded, and that pair is the clearest demonstration of the rule in the set.
Note for the record: Round 03's card **04** carries a stale sentence claiming 940px of main is "past 64rem"
and two-column. It is not; the CSS in that same round is correct and unchanged.

**The auth gate can be a container too.** The handoff's framing (and our first pass) treated the gate as the
one surface that has to query the viewport. It does not: `.kb-authgate` declares `kbauth` and the page
padding moves onto a wrap inside it, so the rule that governs a 390px phone is the same rule a 390px
specimen frame proves. **There is not one `@media` rule in this round's stylesheet.**

**The specimen chrome was overriding the product.** `specimen.css` pins `.kb-trend-wrap` at a flat 120px (the
P12 value, from before the console had breakpoints) and loads after `console-responsive.css`, so every card
that draws a trend was showing the pre-Round-03 height. `specimen-r4.css` re-asserts the product rule. This
is chrome, not a design change — but it means Round 03's trend frames under-reported the clamp.

---

## 3. Departures from the handoff

| Departure | What and why |
| --- | --- |
| **`result.md` / `build-prompt.md` reused** | The handoff asks for both filenames, and Round 03's copies were already at the project root. Round 03's are preserved as `round-03-result.md` and `round-03-build-prompt.md`; `result.md` and `build-prompt.md` are now Round 04's, as asked. |
| **A second specimen sheet** | `specimen-r4.css` — card chrome only: the trend-height restore above, `.sr-only` (the app gets it from Tailwind), a 1440 frame width, a labelled placeholder for surfaces other rounds design, and a `min-height` climb-down for the auth stage inside a frame. No design decision is in it. |
| **Card 19 shows four frames, not three** | 1180 expanded *and* folded, plus 768 and 390 — see §2. The three required widths are all present. |
| **Card 18 shows a fourth frame at 1440** | The anonymous shell's answer is a cap; a cap is invisible until something is wider than it. |
| **The search hint loses its uppercase transform** | `.kb-hintline` is mono 0.7rem in sentence case. The string is a 79-character sentence; uppercased it is three lines of shouting on a phone. Same colour, same family, same size. |
| **The Public URL field is not a disclosure and not in the head** | It is always visible (an operator's most-wanted current value), and a lead paragraph plus a field cannot share a head row at any width below desktop. It is a `.kb-fieldrow` under the head at every width. |
| **Create-project's form moved out of the page-frame row** | See question 6. Today it replaces the header button with a 17rem field; it now opens as a framed block under the page frame. |
| **New `.kb-*` classes** | Fourteen: `.kb-page-flow`, `.kb-panel__headmain`, `.kb-panel__lead`, `.kb-panel__caption`, `.kb-panel__head--start`, `.kb-inlineform` (+`--framed`), `.kb-form-actions--end`, `.kb-fieldrow`, `.kb-hintline`, `.kb-searchbar__actions`, `.kb-snippet`, `.kb-taglist`, `.kb-chip--more`, `.kb-pager`, `.kb-confirm` (+`__prompt`), `.kb-pageframe__status` (+`__hint`), `.kb-urlline` (+`__label __url`), `.kb-activity` (+`__row __time`), `.kb-app--public`, `.kb-topbar__signin`, `.kb-authgate` (+`__wrap`), `.kb-authcard` (+ eight elements). All additions; nothing renamed. |
| **No new tokens** | The round needed none. Every value in `console-r4.css` is an existing `--kb-*` token or a literal lifted verbatim from the component it replaces (the auth card's gradient and shadow). |
| **No new strings** | Including the new documents panel: its heading is `DOCUMENTS.title`, its link is `DOCUMENTS.read.backLabel`, its empty line is `DOCUMENTS.list.emptyNoDocuments`. Nothing on these cards needs an operator decision about copy. |

**Not touched, as locked:** every existing token name and value; `console.css`, `app-frame.css` and
`console-responsive.css` (verbatim records of P12, the fold, and Round 03); the brand spirit; teal as the
only interactive accent; the three faces; warm paper; no emoji; the status semantics and their form
encoding; the table column contracts and Round 03's priorities; every string; the landing page; the graph
and the document read surfaces (rounds 05 and 06 — the frames that show them use a labelled placeholder).

---

## 4. What is in the project

**Cards** — ten at the project root, in reading order, under the round's address:

```
⏳ P27.S3 · Shells          17-shell-member · 18-shell-public
⏳ P27.S3 · Console pages   19-dashboard · 20-dashboard-panels · 21-project ·
                            22-project-documents · 23-documents · 24-documents-search-states
⏳ P27.S3 · Auth            25-auth-gate · 26-auth-states
```

Round 03's sixteen cards and the fifteen `shipped/` baseline cards are untouched.

**Stylesheets the cards link** — `fonts.css`, `tokens.css`, `console.css`, `app-frame.css`,
`console-responsive.css`, **`console-r4.css`** (this round's layer), `specimen.css`, `specimen-r3.css`,
**`specimen-r4.css`** (chrome).

**The contract** — `build-prompt.md`: the whole stylesheet verbatim, the per-surface composition at each
width, the click targets, every disclosure's placement, the auth error placement, and the file-by-file apply
map.

---

## 5. Open for later rounds

- **The public surfaces themselves.** Card 18 frames the anonymous chrome; the public document view, its
  print stylesheet and the public graph are rounds 06 and 05.
- **Table sorting and paging inside a panel.** Still unbuilt; when they arrive they sit in the panel head
  beside the caption, and the head is now a three-slot element that can take them.
- **A scheme toggle.** Round 03 left the hook (`data-kb-scheme`); nothing in this round consumes it.
- **The project documents panel's failure state.** Specified (the in-panel block from Round 03's card 14) but
  not drawn on a card — it is the first thing to draw if the second fetch turns out to be flaky in practice.
- **`--kb-app-read-w` and `--kb-measure`.** Still untested against this foundation; round 06.
