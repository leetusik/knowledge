# Result — job `06-library`, round `02-control-border` (slice P29.S6, driven by P30.S1)

Drafted by `design-drafter` on 2026-10-21.

## Verdict

- status: done
- job: 06-library
- round: 06-library/02-control-border
- boards_written: none. One stylesheet changed, `library.css` (two roles, three control edges, one hover edge).
- render_loop: done: 2 renders, 1 fix (critique 01 C01). `self_check=fail blocking=non-text-contrast:9,reflow:2`,
  and every blocking line is outside this round's scope (logged below: G2, G3, and C04 to D44).
- critique_answers: critique 01: fixed 1 (C01), rebutted 0.
- design_check: `design-check: OK -- 1 job(s), 2 round(s), 19 board(s), open rounds: 06-library/02-control-border, 5 warning(s)`
- open_questions: Q1, the scope of the roles: (a) library-scoped (drawn) or (b) raise `kb-border-strong`; and,
  under (a), whether the shared shell's ghost edge holds on every console page or only on the library's
- open_items: Q1, G2, G3

## Summary

Draws C11. `--lib-control-edge` = `kb-hint` edges the grouping control and every secondary button ("Clear all
reading data", Cancel, not found's actions): 3.22/3.90/3.31 on the page, 3.56/3.58/3.62 on its fill (light/dark/
sepia; signed 1.42–1.70). Critique C01, fixed: the shell's ghost buttons ("Navigation", "Sign out", "Sign in")
rest on the sunken topbar, where `kb-hint` is 2.97 light. They take `--lib-ghost-edge` = `kb-secondary`, their
label colour: 6.23/6.78/5.96 (signed 1.13–1.20). Hover is `kb-ink`. Pressed, focus and disabled unchanged. No
hairline, layout, copy or board changed. Q1: (a) drawn, (b) logged. It also asks whether the shared shell's edge
holds on every console page. Open: G2, G3. Departures: none.

## Build

The delta on `rounds/01-library/build-prompt.md`. Everything not named here builds as that file says.

### The role

- **`--lib-control-edge`**, library-scoped. It resolves to `kb-hint` in each theme:

  | Theme | Value |
  |---|---|
  | light | `#8f8676` |
  | dark | `#7e7566` |
  | sepia | `#8b785b` |

  - Declare it wherever the theme is set (`:root, [data-theme]`), so it follows the theme.
  - It is a non-text colour. **`kb-hint` stays never-text**: the *Colour roles* rule holds.
  - Use it only where the control's edge meets `kb-paper` or `kb-surface`. On `kb-surface-sunken` it measures
    2.97:1 in light, so no control sits on the sunken band with this edge.
- **`--lib-ghost-edge`**, library-scoped (critique 01, C01). It resolves to `kb-secondary` in each theme, the
  ghost button's own label colour:

  | Theme | Value |
  |---|---|
  | light | `#5c5347` |
  | dark | `#b6ad9d` |
  | sepia | `#5f4d37` |

  - Declared the same way (`:root, [data-theme]`). It edges the shell's ghost buttons only, which rest on the
    topbar's `kb-surface-sunken` (and, for the account menu's "Sign out", on `kb-surface`).
  - Why not `kb-hint` there: 2.97:1 on `kb-surface-sunken` in light. `kb-secondary` is the next `kb` neutral that
    clears 3:1 on that band in every theme. No new colour is introduced.
- **The wave seam:** `--lib-control-edge` (`kb-hint`) is the value this job draws for a control's resting edge on
  the page and on a surface in the app frame. The grouping control is the reader's language switch as signed, so
  `01-reader`'s value for that switch should be this one. On the sunken topbar the library needs a different answer
  (`kb-secondary`, for the reason above), and logs it here as the brief asks. The orchestrator compares the jobs.

### What changes in the signed build prompt

- **§ Tokens → Colour roles:**
  - `kb-border-strong` keeps card hover and the structural edges (the confirmation panel, the account menu, the
    count pill, the topbar divider and the strip's separator). **Control edges become `--lib-control-edge`**, and
    the shell's ghost buttons, which drew `kb-border`, take `--lib-ghost-edge`.
  - The "system gap" note on `kb-border-strong` is answered for the library's controls by the role above.
- **§7 The grouping control:**
  - The box is 1px `--lib-control-edge` (was `kb-border-strong`) on `kb-surface`.
  - Everything else is as signed: `kb-radius-sm`, the 1px inner padding and 1px gap, the 44 px options, rest
    `kb-secondary`, hover `kb-ink` on `kb-surface-sunken`, and pressed `kb-accent-strong` on `kb-accent-soft`
    with an inset 1px `kb-accent` ring.
- **The secondary button**, wherever §8 and §9 name one:
  - "Clear all reading data", Cancel in the confirmation, and the not-found state's "Sign in" / "‹ Back to your
    library".
  - Rest: `kb-surface` fill, 1px `--lib-control-edge` edge (was `kb-border-strong`), `kb-ink` label,
    `kb-radius-sm`, at least 44 px tall.
  - Hover: edge `kb-accent`, label `kb-accent-strong`. Focus: the system ring (2px `kb-accent`, offset
    `kb-focus-offset`). Disabled (Cancel while clearing): `kb-secondary` on `kb-surface-sunken` with a `kb-border`
    edge. All three as signed.
- **The shell's ghost button** (`kb-appbtn--ghost`): "Navigation" (the rail toggle, icon-only, `aria-label`),
  "Sign out" and "Sign in" in the topbar, and "Sign out" in the phone account menu.
  - Rest: transparent fill, 1px `--lib-ghost-edge` edge (was `kb-border`), `kb-secondary` label, as signed
    otherwise (`kb-radius-sm`, at least 44 px).
  - Hover: edge `kb-ink` (was `kb-border-strong`) and label `kb-ink` (as signed): a step stronger than rest, as the
    signed hover meant. Focus: the system ring, as signed.
  - Scope under Q1 (a): this applies where the shell frames the library's pages. The shell is shared, so a
    library-only rule leaves the console's other pages on the signed `kb-border` edge until D45 (see Q1).
- **Unchanged:** the primary and danger buttons (their fill is their edge), the quiet "Show all" buttons, rows,
  cards, panels, every hairline and rule, the shell's structure and every other shell part (the topbar divider, the
  rail and strip links, the phone bar), and the state bar and foot strip (canvas-only, never built).

### Contrast (WCAG 2 relative luminance; `kb-accent-soft` composited over `kb-surface`)

| Control · state · pair | Light | Dark | Sepia |
|---|---|---|---|
| Rest edge (`--lib-control-edge`) vs the page, `kb-paper` (the grouping control; "Clear all reading data"; not found's actions) | 3.22 | 3.90 | 3.31 |
| Rest edge vs `kb-surface` (each control's own fill; Cancel's ground inside the confirmation) | 3.56 | 3.58 | 3.62 |
| Signed rest edge, `kb-border-strong`, vs `kb-paper` (replaced) | 1.42 | 1.70 | 1.50 |
| Signed rest edge, `kb-border-strong`, vs `kb-surface` (replaced) | 1.58 | 1.56 | 1.64 |
| Secondary hover edge, `kb-accent`, vs `kb-paper` | 5.39 | 7.96 | 5.70 |
| Secondary hover edge, `kb-accent`, vs `kb-surface` | 5.97 | 7.31 | 6.23 |
| Grouping pressed: inset ring `kb-accent` vs its `kb-accent-soft` fill | 4.82 | 4.99 | 4.98 |
| Grouping pressed: inset ring vs the group's `kb-surface` padding | 5.97 | 7.31 | 6.23 |
| Focus ring, `kb-accent`, vs `kb-paper` / `kb-surface` | 5.39 / 5.97 | 7.96 / 7.31 | 5.70 / 6.23 |
| Danger "Yes, clear all reading data": its fill vs `kb-surface` | 5.36 | 6.00 | 5.46 |
| Disabled Cancel: `kb-border` edge vs `kb-surface` (inactive, exempt from 1.4.11; unchanged) | 1.35 | 1.30 | 1.33 |
| Not used: the edge vs `kb-surface-sunken` | 2.97 | 3.32 | 3.14 |
| Ghost rest edge (`--lib-ghost-edge`) vs the topbar, `kb-surface-sunken` ("Navigation", "Sign out", "Sign in") | 6.23 | 6.78 | 5.96 |
| Ghost rest edge vs `kb-surface` (the account menu's "Sign out") | 7.48 | 7.32 | 6.87 |
| Signed ghost rest edge, `kb-border`, vs `kb-surface-sunken` (replaced) | 1.13 | 1.20 | 1.15 |
| Ghost hover edge, `kb-ink`, vs `kb-surface-sunken` | 13.18 | 11.94 | 10.24 |
| Ghost hover step: rest edge `kb-secondary` to hover edge `kb-ink` (the label takes the same step) | 2.11 | 1.76 | 1.72 |
| Focus ring, `kb-accent`, vs `kb-surface-sunken` (the topbar's buttons) | 4.98 | 6.77 | 5.41 |

- **The states stay distinct.** Rest is a grey edge. Secondary hover turns the edge teal and the label
  `kb-accent-strong`; that edge step is 1.68, 2.04 and 1.72 by luminance, plus the hue and the label colour.
  Pressed adds a fill and an inset teal ring. Focus adds a 2px teal ring outside the edge. The ghost button's
  hover darkens both its edge and its label to `kb-ink`, and focus adds the teal ring.
- Sepia is measured on the Components boards' sepia rows. The library itself follows the system (light or dark)
  as signed.

## Scope: every bordered control on this canvas, named

**Changed (in scope):**

1. The grouping control, "By project / By subject" (`.lib-seg`): the Page's *Books and documents* head, and
   boards 11 and 17.
2. "Clear all reading data" (`.lib-btn--secondary`): at rest and after clearing (§8; boards 12 and 18).
3. Cancel in the confirmation, while confirming and after a failure (§8). While clearing it is disabled, and its
   `kb-border` edge is unchanged.
4. The not-found state's secondary action: "Sign in" signed out, "‹ Back to your library" signed in (§9; boards 13
   and 19).
5. The shell's ghost buttons (`kb-appbtn--ghost`): "Navigation" (the rail toggle), "Sign out" and "Sign in" in
   the topbar, and "Sign out" in the phone account menu. Their transparent fill on the sunken topbar leaves the
   edge as the only cue to their extent. Changed in critique pass 01 (C01): the brief locks the shell's
   *structure*, not its edge colour, so they are in scope. The first draft's G1 reason ("the handoff locks the
   shell") did not hold.

**Unchanged (named, with the reason):**

6. The book cards and the Continue lead (`a.lib-book`, `a.lib-lead`). The handoff keeps card edges as signed, and
   each card is named by its title. Logged in **G2**.
7. The phone bar's current item (`.kb-navbar__link[aria-current]`), part of the shell. Its current state is a
   2px `kb-accent` top edge, a `kb-accent-strong` label and `aria-current`. Logged in **G2**.
8. Not controls, so they stay as signed: the count pill (`.kb-count`), the confirmation panel's edge and the
   account menu's edge (containers), and the topbar divider and the strip's separator (dividers).
9. Already at 3:1 or more, or without an edge: the skip link (`kb-accent` edge, 5.97:1), the primary and danger
   buttons (filled), the quiet "Show all N" buttons, rows, and rail and strip links.

## Q1: the scope of the role (drawn: a)

- **(a) A library-scoped role (drawn).** It changes only the library's five controls above (two roles). No structural line
  moves, and no other page changes.
  - The library's secondary buttons now differ from the console's, whose control edges keep `kb-border-strong`
    until D45.
  - `kb-hint` takes a second, non-text use beside its text uses (placeholders, disabled text, micro-labels).
- **(b) Raise `kb-border-strong` itself.** This fixes every console input and control in one place, but the
  token also draws structural lines:
  - here: card hover, the confirmation and account-menu edges, the count pill, the topbar divider and the
    strip's separator;
  - across the console: the README's "emphasised dividers".
  At about 3:1 these become box lines, against "hairlines instead of boxes". The change widens to every console
  page, which is D44/D45's ground.
  - A third path for D45: a new `kb` control-edge token, this role promoted, with `kb-border-strong` left
    structural.
- (a) holds: no library control sits on a ground where its edge falls under 3:1. The shell's ghost buttons, on the
  sunken topbar, take `kb-secondary` instead of `kb-hint` for that reason.
- **The shell under (a).** The ghost buttons are the console's shared shell. A library-only rule means the topbar's
  buttons show a clear edge on the library's pages and the signed faint edge on the other console pages until D45.
  Applying the ghost edge to the shared shell everywhere fixes the console's topbar too, but it reaches past the
  library, which is (b)'s ground. Drawn: the edge on the library's canvas; the reach is the operator's call.

## Intent (unchanged from the signed round)

Every Page keeps the signed round's intent. This round changes one value, the edge of the library's bordered
controls. Who is here, and what they see first, stay as signed.

## The plan (reviewed before the change)

- **One change, in `library.css`:** the role, on the grouping control's edge and the secondary button's edge. No
  board markup changes.
- **Why `kb-hint`:** it is the lightest `kb` token that clears 3:1 on both grounds these controls touch:
  `kb-paper` outside and `kb-surface` inside, in all three themes.
  - `kb-secondary` (6.2:1 or more) would also pass, but it draws a box in ink, against "hairlines instead of
    boxes".
  - A new hex would be a colour the system does not have.
- **Reviewed against the handoff and the bar:** it is the smallest change that clears the defect. Structural lines
  and the shell keep their signed values. Hover, pressed and focus are unchanged and distinct.
- **No new presets:** rest and pressed are on the Components boards. Hover and focus are reached on the Pages.

## Data

Unchanged: the signed seeds (`library.js`). Nothing was added, and no placeholder was left.

## Component and token gaps

- **G1:** closed in critique pass 01 (C01). The shell's ghost buttons now rest at 5.96:1 or more (item 5).
- **G2:** the instrument's other `non-text-contrast` lines, none of them in this round's scope:
  - card edges (`a.lib-lead`, `a.lib-book`; 1.21–1.41:1), kept by the handoff;
  - the phone bar's current item (shell);
  - the pressed grouping option, where the instrument counts its fill (1.24:1 light) and not its inset ring. The
    ring measures 4.82, 4.99 and 4.98 against the fill, and 5.97, 7.31 and 6.23 against the group's surface.
    Recasting the signed ring as a border would change a signed element's build values to satisfy the
    instrument, so it is left as signed.
- **G3:** the Widths and PublicWidths boards each show their windows with the state bar each page carries.
  `design-check` and the preview warn `check=state-bar` (the shipped rule asks for one bar above all the windows).
  These are signed boards, not in play here.
- **Carried, not answered here:** the text200 reflow at 390 on Main and PublicLibrary (403 and 454 px wide) is
  the shell's topbar under large text: C04, deferred job D44. Also carried: the fold's re-flow (`layout-shift` on
  "Navigation" and "Rail folded"; C04) and "Continue · 한국어 first" (C02, rebutted and signed).
- **System:** the role is library-scoped and not added to `kb`. Promoting it is D45's call.

## States reached only by interaction

- Hover: the secondary button's teal edge, the grouping option's sunken fill, and the ghost button's `kb-ink` edge
  and label ("Sign out", "Navigation" in the topbar). Point at the control on 01 · Page — Library (the flow).
- Focus: the system ring. Tab to the grouping control or a secondary button on the same Page. Cancel takes the
  focus when the confirmation opens (programmatic focus after a mouse press shows no ring; Tab or Enter does).

## Render log

- **Pass 1** (whole job, `--click --contact-sheet --strict`): 25 PNGs, 145 states, 73 issue lines. Output in
  `.preview/06-library/02-control-border/`.
  - Looked at GroupingStates (light, dark and sepia rows), ClearStates (every state, in three themes), the Page's
    *Books and documents* head, and its clicked confirmation (state 41). The new edge reads as a quiet grey line
    around the grouping control and the secondary buttons. It sits a step darker than the panel and card
    hairlines, which are unchanged. Hover, pressed and focus are distinct.
  - No issue line names an in-scope control's rest edge.
  - `self_check=fail blocking=non-text-contrast:13,reflow:2`. Each line is G1, G2 or C04/D44.
  - The 23 `layout-shift`, 34 `state-bar` and 1 `too-tall` lines are pre-existing: C04, C02, G3, and the 8000 px
    screenshot cap at text200. Border colour cannot move layout.
- **Pass 2** (critique pass 01; `--board` Library, Main, PublicLibrary, ShellStates, Widths and PublicWidths, the
  boards that mount the shell; same flags): 12 PNGs, 145 states merged.
  - Looked at ShellStates (light, dark and sepia: desktop, folded, iPad and the public topbar) and the Page's
    topbar. "Navigation", "Sign out" and "Sign in" now show a clear edge in their label colour, in every theme. The
    topbar is otherwise as signed.
  - No `non-text-contrast` line names a ghost button any more. `self_check=fail blocking=non-text-contrast:9,reflow:2`
    (was 13 and 2). Each remaining line is G2 or C04/D44. `layout-shift` (23) and `state-bar` (34) unchanged, all
    pre-existing.
- `design-check 06-library`: OK, exit 0. Its warnings are G3's two `state-bar` lines, plus `abs-path` lines in
  the signed round's own files (immutable, not this round's).

## Departures from the handoff

None.

## Critique pass 01

- **C01** (must-fix, the shell's ghost buttons at 1.12–1.35:1): fixed. A second library-scoped role,
  `--lib-ghost-edge` = `kb-secondary`, edges `kb-appbtn--ghost`, because `kb-hint` is 2.97:1 on the sunken topbar
  in light. It measures 6.23/6.78/5.96 on the topbar and 7.48/7.32/6.87 in the account menu (light/dark/sepia). The
  hover edge moves from `kb-border-strong` to `kb-ink`, so hover stays a step stronger than rest. Added to the
  contrast table, `## Build` and the scope list (item 5). G1 is closed. Whether the shared shell takes the edge on
  every console page is added to Q1 for the operator. Re-rendered (pass 2): no ghost-button line remains.
