# P28.F1 — result

- **status**: done
- **summary**: Closed `P28.S9`'s finding F1 — the graph dock's tag switch measured **0 × 0** on a small plate — by re-stating `graph.css`'s own four switch rules at `.kb-graph-dock .kb-graph-switch` in `kb-record-fixes.css`, the phase's third and (on current evidence) final orchestrator-authorised correction. Every declaration is copied verbatim from `graph.css:172-201`, **no value is originated**, and the two the record itself already answers for this placement (`margin-left`, the focus ring) are deliberately left out. Measured in dev and in the production standalone build at a true 390 × 844: the dock switch now renders the record's **24 × 13.59** box with its thumb, toggles the 76 tag hubs off and back on under a real mouse click and under Enter, and the legend's switch is **byte-identical** — proved by deleting the four new rules from the live CSSOM and re-measuring every property.
- **files_changed**:
  - `/Users/sugang/projects/personal/knowledge/web/src/app/kb-record-fixes.css` (+87 lines: one commented correction block + 4 rules)
  - `/Users/sugang/projects/personal/knowledge/works/phases/active/P28/phase.md`
  - `/Users/sugang/projects/personal/knowledge/works/phases/active/P28/slices/P28.F1/result.md`
- **validation**:
  - `pnpm --dir web typecheck` — pass
  - `pnpm --dir web lint` — pass (no output)
  - `pnpm --dir web test` — pass (17 files, 113 tests)
  - `pnpm --dir web build` — pass (standalone output, full route table)
  - `python3 scripts/workflow.py validate` — pass (pre-existing advisories only: unknown kinds on P22/P26 slices, `oversized_doc_sections=11`)
  - Served-rule check in **dev** (`:3030`) and in the **production** chunk (`:3040`) — the four rules are in the shipped CSS, last, unminified-in-dev and unfolded by the production minifier
  - Real browser (**Aside `repl`, `--account u1`**) in the manifest runtime: dev `:3030` and the production standalone build `:3040`, at a true **390 × 844** through the S2/S9 harness proxy, plus **820 × 1180**, **1024 × 768** and native **1440 × 900**
- **deviations**: none from the plan's instruction. Two declarations of `graph.css:172` are **not** restated, and that is the plan's own "restate, do not redesign" rule applied — see §2.
- **doc_impact**: one line appended to `phase.md` → `frontend.md`: the graph dock's tag switch gets the record's own box through a third correction in `kb-record-fixes.css` (the phone's only tag-hub control was invisible, un-clickable and a dead tab stop).
- **doc_versions**: n/a (not a review slice; no `doc-new-version` run)

---

## 1. The defect, reproduced before anything was changed

Dev, `/@p28s6/graph`, `.kb-app` narrowed to 390 (the S9 hydrated-container probe — the dock's reveal rule is
`@container kbmain (width < 40rem)`, which that probe does fire):

| | before |
|---|---|
| `.kb-graph-dock` | `display: block` (legend `display: none`) |
| dock `.kb-graph-switch` box | **0 × 0** |
| its `::after` thumb | `content: none` — no thumb at all |
| background | `rgba(0, 0, 0, 0)` |
| `cursor` | `default` |
| `border-radius` / `position` | `0px` / `static` |
| enclosing `.kb-graph-dock__item` | 118.22 × 44 |
| legend `.kb-graph-switch` at 1440 | 24 × 13.59, `rgb(15, 111, 102)`, `ml 28.7812px`, `br 32px`; `::after` 9.26562 × 9.26562 at `left 12.7188px` |

So the control existed, was focusable and was bound (`aria-pressed="true"`, `data-switch="tags"`) — and had no box.

## 2. The fix, and the two declarations deliberately left out

`web/src/app/kb-record-fixes.css`, one commented block in the sheet's established charter style (round + section,
the gap, the authorisation and its date, what a revert costs), then four rules:

```
.kb-graph-dock .kb-graph-switch            { flex / width / height / border / border-radius / cursor / position / background / transition }
.kb-graph-dock .kb-graph-switch::after     { content / position / top / left / transform / width / height / border-radius / background / transition }
.kb-graph-dock .kb-graph-switch.is-on      { background }
.kb-graph-dock .kb-graph-switch.is-on::after { left }
```

Every declaration is character-for-character `graph.css:172-201`. Two are **omitted on purpose**, and in both cases
the record has already spoken for this placement:

1. **`margin-left: auto`** (`graph.css:174`) pushes the switch to the right end of the *legend's* row. Round 05
   replaces it for the dock — `graph-r5.css:141`, `.kb-graph-dock__item .kb-graph-switch { margin-left: 0.1rem }`.
   That selector is (0,2,0), mine is (0,2,0), and this sheet is imported **last**, so restating `auto` would have
   silently overruled a decision round 05 makes on purpose. Measured after the fix: the dock switch's
   `margin-left` is **1.6px** = the record's `0.1rem`. Intact.
2. **The focus ring** (`graph.css:410`, `.kb-graph button:focus-visible`) is not restated because the dock is
   already inside a *different* record rule: round 03 §3's console-wide `.kb-app button:focus-visible`. Measured
   on the focused dock switch — `2px solid rgb(15, 111, 102)`, `outline-offset: 2px`; the legend's is the same
   ring at offset 1px. Nothing was needed.

**Why this sheet and not `graph.css`.** S9 suggested widening `graph.css:172` itself, which is defensible
(`graph.css` is P22's file, not a signed round sheet). The plan rules otherwise and the plan is right: round 05 §1
declares `graph.css` and `graph-tokens.css` *do not touch — shipped records*, and `kb-record-fixes.css` exists for
exactly this class of miss, is imported last, and makes the whole correction revertible by deleting one block.

**Why the legend cannot be touched, structurally.** `.kb-graph-dock` is a **sibling** of `.kb-graph`
(`graph-canvas.tsx:2499`, round 05 §4.3's "GraphCanvas returns a fragment"), so no element inside the legend can
ever match a `.kb-graph-dock …` selector. That is an argument; §4 is the measurement.

## 3. Measurements after the fix

**Served first** (the notebook's deaf-dev-server trap — and it nearly caught me the other way: my first `grep` for
the rule failed because dev serves this CSS *pretty-printed*, so a one-line regex misses it; the rule was there all
along). Dev chunk `src_1lezih-._.css` and production chunk `0m8q_r6josku2.css` both carry all four rules, the dock
block **after** the `.kb-graph …` block, and the production minifier neither folded nor reordered them.

| measurement | dev `:3030` | production `:3040` |
|---|---|---|
| dock switch box, small plate | **24 × 13.59** | **24 × 13.59** (true 390 × 844) |
| its `::after` thumb | 9.26562 × 9.26562, `left 12.7188px` (`is-on`) | identical |
| background `is-on` / `is-off` | `rgb(15, 111, 102)` / `rgb(216, 204, 179)` | identical |
| `margin-left` (round 05's 0.1rem) | 1.6px | 1.6px |
| `border-radius` / `cursor` | 32px / `pointer` | 32px / `pointer` |
| `.kb-graph-dock__item` | 118.22 × 44 → **142.22 × 44** (+24 = the switch) | 142.22 × 44 |
| legend switch at 1440 | 24 × 13.59, `ml 28.7812px`, `::after left 12.7188px` | identical |
| legend switch at 1024 × 768 | — | 24 × 13.59, `ml 28.7812px` |
| legend switch at 820 × 1180 | — | 24 × 13.59, `ml 12.7812px` (auto against a narrower row) |

**Functional, under a real `page.mouse.click()` at a true 390 against the production build** (the S9 addendum: the
harness *does* hydrate against `next start`/standalone), and repeated in dev:

`aria-pressed` **true → false → true**; `is-on` dropped and restored; background accent → `--kb-border-strong` →
accent; the thumb slides `12.7188px → 2px → 12.7188px`; the legend's switch follows the dock's state
(`syncLegendUI`); and the canvas genuinely repaints — its `toDataURL()` goes **88,598 → 62,778 → 88,594** chars as
the 76 tag hubs leave and come back. Screenshot of the rendered dock (Tags · 태그 76 with a visible teal toggle) at
`/tmp/claude-502/.../scratchpad/dock390.png`.

**Keyboard, both placements.** Tab from the preceding dock control lands on the switch
(`aria-label="Toggle tag visibility"`), `:focus-visible` matches, ring `2px solid accent` at offset 2px, and
**Enter** toggles it (`aria-pressed` → `false`, background → `rgb(216, 204, 179)`). In the legend: Tab reaches it,
ring `2px solid accent` at offset 1px, box still 24 × 13.59.

## 4. The proof that the legend is untouched — an A/B on the live CSSOM

Measuring "before" and "after" across two page loads is weak evidence for *unchanged*. So, at 820 × 1180 against
production, with the page loaded and the legend showing, I snapshotted the legend switch, then **deleted every rule
whose `selectorText` starts with `.kb-graph-dock .kb-graph-switch` from the live stylesheets** (4 rules removed —
the exact set this slice added), waited, and snapshotted again:

```
removed: 4
identical: true
```

Every property equal, including sub-pixel geometry: `24 × 13.594` at `x 156.797, y 560.453`,
`background rgb(15, 111, 102)`, `margin-left 12.7812px`, `border-radius 32px`, `flex 0 0 auto`,
`position relative`, `cursor pointer`, `transition background 0.15s`, `border-width 0px`, and `::after`
`9.26562 × 9.26562` at `left 12.7188px / top 6.79688px`, `transform matrix(1, 0, 0, 1, 0, -4.63281)`.

With the fix on and with the fix off, the legend's switch is the same pixels. That is the slice's main risk closed
by measurement rather than by argument.

## 5. What this does not fix (reported, not decided)

The toggle now measures **24 × 13.59** in the dock — the record's own size, the same one it has had in the legend
since P22 — inside a `.kb-graph-dock__item` pill that is **44px** tall (`min-height: var(--kb-tap)`,
`graph-r5.css:136`). So the *row* is thumb-sized and the *toggle* is not. Round 05 draws no other size for this
control anywhere, so enlarging it in the dock would be originating a value, which the plan forbids and which is a
visual decision in any case. It is on `## Operator Questions` for the gate walk, and it is the **fourth** instance
of the same pattern this phase has recorded (the 33.6px account avatar, the 38px `--sm` buttons, §9 item 4's
blanket sentence) — a record whose acceptance prose promises 44px everywhere while its stylesheets deliberately
draw some controls smaller.

Not re-checked here and still owed by the operator's walk, exactly as S9 left it: **touch** (this control is
finger-operated in real life — a tap on a 24 × 13.59 target on glass is the one thing no automated run can judge)
and **Safari on iOS**.

## 6. Runtime left as found

Dev `next dev` on `:3030` and the API on `:8766` up, `kb-p28s2-pg` up, Aside profile `u1` signed in as `p28s5`.
The production standalone server (`:3040`) and the production harness proxy (`:3032`) were started for this slice
and are **stopped again**; `.next/standalone` was relinked per the S8/S9 addenda (`.next/static`, then `public/`
entry by entry). No fixture data was created, changed or deleted.
