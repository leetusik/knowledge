# P39-hk.F3 — result

## Verdict

- **status:** done
- **route:** high
- **model:** opus
- **effort:** xhigh
- **summary:** P30.F3's rule now bounds the chapter end's button and the chapter quiz's buttons (round 1). Round 2 builds the operator's two "accept" looks. On the book page, an "Older translation" tag that won't fit beside its link drops onto its own line under it, the link whole, and breaks inside its word only at 320/200% (OQ20). On the past-version page, a display formula wider than the column scrolls inside its own box, with FormulaBox's region (OQ22). Every chapter and the book page now equal the viewport at 320, 390 and 820 at 150% and 200%, except all-blocks at 320/200% (342, its top bar: OQ21, accepted as is). Everything that fits is pixel-identical to HEAD. The past version is still 446 at 390/200%, now only from the source URL and the console's signed-out "Sign in", which are a deferred job.
- **files_changed:** `web/src/app/reader.css` (round 1), `web/src/app/book.css` (rounds 1 and 2), `web/src/app/kb-docview.css` (round 2), `works/phases/active/P39-hk/slices/P39-hk.F3/result.md`, `works/phases/active/P39-hk/phase.md` (through `phase-section`)
- **validation:**
  - `pnpm --dir web typecheck`: pass
  - `pnpm --dir web lint`: pass
  - `pnpm --dir web exec vitest run`: pass (40 files, 585 tests)
  - standalone build in a scratch copy (`f3/after3`, the final tree): pass
  - the sweep, headless Chrome over CDP (DPR 2, mobile, root font) plus Claude in Chrome: pass, see *Round 2*. The book page is the viewport at every width and size; the past version's formula is no longer a cause; round 1's whole sweep holds on the final build, paper included.
  - `python3 scripts/workflow.py validate`: pass (warnings only, none of them this slice's)
- **deviations:**
  - Round 1: the quiz rule also covers `.qz-acts` (Check / Try again), with `.qz-swap` centred; `.rd-next .rd-btn` also bounds the book page's "Read chapter 1 →" and the loose note's "‹ Back to the library" (and, unverified live, the Review end's button).
  - Round 2, OQ20: no `flex: none` or `min-width: max-content` on the link. Wrapping alone keeps it whole, because the tag no longer shares its line. `flex: none` would also have stopped the tagless "English · v1" from wrapping at 320/200% (125.4 px in a 124 px column, where HEAD wraps it), a change the look does not make.
  - Round 2, OQ22: the formula box has 0.25em of padding above and below, given back by negative margins, as F1's inline formula box does. Without it, the scroller clips the ink a fraction bar or radical draws just past the formula's box, and the 100% render changes (94 px differ at 390/100%). With it, nothing moves and 100% is byte-identical.
  - The past version at 320/200% also has the console docbar's "Full width" (`kb-appbtn`, r=356) past the viewport. It is a console control, like "Sign in", so it belongs to the same deferred job; unchanged.
- **doc_impact:** qa (F3 round 2, supersedes the F3 line above): P30's text-size line passes on the chapter end, the quiz and the book page (the page is the viewport at 320, 390 and 820, 150%/200%). The past version's display formula scrolls in its own box; the page is still 446 at 390/200% from the source URL and the console's signed-out "Sign in" ("Full width" too at 320), deferred as "the console at 200% text".
- **operator_need:** none

## Round 2 (2026-11-06, after the operator's "accept" on OQ20–OQ22)

### The fix

- `book.css`, round 1's `.bk-lang .rd-tag` rule revisited, with one comment:
  - `.bk-lang { flex-wrap: wrap; }`
  - `.bk-lang .rd-tag { flex: 0 1 auto; min-width: 0; max-width: 100%; white-space: normal; overflow-wrap: anywhere; }`
  - A tag whose one-line width does not fit beside its link goes to the next flex line, where `max-width: 100%` caps it at the column. It wraps between words there, and inside a word only when the word itself is wider (`overflow-wrap: anywhere`). The link is alone on its line, so it keeps its whole width. Where the two fit side by side, nothing in these rules acts.
- `kb-docview.css`, after `.kb-doc__body`'s padding rules, with one comment:
  - `.kb-doc__body .ra-mb__eq { overflow-x: auto; overflow-y: hidden; padding-block: 0.25em; margin-block: -0.25em; }`
  - `.kb-doc__body` exists only on the past-version page (`documents/[id]/versions/[v]/page.tsx`), and `.ra-mb__eq` only in a native display formula, so the rule reaches exactly that page's display math.
  - The page already mounts the reader's `FormulaBox` (through `NativeChapter`), so the region semantics come with it, measured: a focusable `role="region"` named "Formula, scrolls sideways", only while it scrolls. No component changed. No reader styling came with it: no fades, no formula size, no hairlines (OQ13).
- `reader-aids.css` (the reader's formula rules) is not loaded on that page: `math-layer.tsx` and `term-layer.tsx` import it, and the page mounts neither. That is why the formula was unbounded there.

### Reproduction on HEAD (CDP, DPR 2, mobile, root font)

- **Book page** (`book2.mjs`, `links.mjs`): the row's "한국어 · v1" link with its "Older translation" tag.
  - At 320/150%, 320/200%, 390/150% and 390/200%, HEAD keeps the nowrap tag beside the link by squeezing the link to 17–34 px (4 to 6 lines, "한국/어·/v1").
  - The tag (202 px at 150%, 269 px at 200%) runs past its column, so the page is 336 (320/150%), 448 (320/200%) and 448 (390/200%).
- **Past version** (`past.mjs`): four display formulas in `figure.ra-mb > .ra-mb__box > .ra-mb__eq`, unstyled (overflow visible).
  - At 390/200%, two of them are wider than their 254 px box (by 5 and 91 px); at 320/200%, three (by 75, 2 and 161 px); at 320/150%, one (by 41 px).
  - `FormulaBox` already marks those boxes as regions, because `scrollWidth > clientWidth` also holds for visible overflow, but they cannot scroll: ArrowRight and End leave `scrollLeft` at 0.
  - With the other causes hidden in the probe (the source line, the top bar's buttons and the docbar's actions, `ISO=1`), HEAD's page is still **413** at 390/200% and 320/200%: the formula alone widens it (`mi` "time", `mtd`, r=413).

### Book page (OQ20), HEAD → F3 (`book2.mjs`, light and dark, identical results)

| width @ size | page | the tag at F3 | the link at F3 |
|---|---|---|---|
| 320 @ 100% | 320 → 320 | beside the link: identical | identical |
| 320 @ 150% | 336 → **320** | under the link, 2 lines ("OLDER / TRANSLATION"), 173.6 px in its 174 px column | whole, 83.4 px, 1 line (HEAD 16.9 px, 6 lines) |
| 320 @ 200% | 448 → **320** | under, 3 lines ("OLDER / TRANSLA / TION"), 124.8 px in its 124 px column | whole, 111.2 px (HEAD 22.5 px, 6 lines) |
| 390 @ 100% | 390 → 390 | identical | identical |
| 390 @ 150% | 390 → 390 | under, 1 line, 201.6 px (its HEAD width) | whole, 83.4 px (HEAD 33.6 px, 4 lines) |
| 390 @ 200% | 448 → **390** | under, 2 lines, 194.8 px in a 194 px column | whole, 111.2 px |
| 820 @ 100%, 150%, 200% | 820/805 → same | beside: identical | identical |
| 1440 @ 100% | 1440 → 1440 | identical | identical |

- **Identity:** "identical" means the link's box, the tag's box (to 0.01 px) and a crop of the whole `.bk-vars` row are byte-identical to HEAD, in both themes.
- **Look:** the tag's padding, radius and colours are HEAD's at every size. Its lines start at its left edge (it is a tag, not a button), and it is not a tap target. The link keeps its tap height (88 px at 200%). The gap between the link and the tag is `.bk-lang`'s own `gap`, unchanged.
- **The word break happens only at 320/200%,** where the word "TRANSLATION" alone is wider than the 124 px column. At 390/200% the column is 194 px and the tag breaks only between its words.
- **Link-only rows are unchanged** at every size (`links.mjs`). At 320/200%, "English · v1" still wraps to two lines in its 124 px column, as it does at HEAD.

### Past version (OQ22), HEAD → F3

Page width (`past.mjs`, and `wide.mjs` on the final build):

| width @ size | page | what still sticks out at F3 |
|---|---|---|
| 320, 390 @ 100% | 320, 390 → same | nothing |
| 390 @ 150% | 390 → 390 | nothing |
| 320 @ 150% | 335 → 335 | the source URL, `a.fg-src__link`, r=335 |
| 390 @ 200% | 446 → **446** | the source URL (r=446) and the top bar's "Sign in" (r=410). HEAD also had the formula (r=413) |
| 320 @ 200% | 447 → **447** | the source URL (r=446), "Sign in" (r=410) and the docbar's "Full width" (r=356). HEAD also had the formula (`msqrt`, `mtd`, `mi` up to r=413) |
| 820 @ every size | 805 → 805 | nothing |

- **The formula is no longer a cause.** With the source line, "Sign in" and the docbar's actions hidden in the probe, F3's page is **320 and 390** at 320/200% and 390/200%, where HEAD's was 413. The formula is also absent from F3's list of elements past the viewport.
- **It scrolls in its own box** (`past.mjs`, `pastscroll.mjs`):
  - The boxes that are wider than their column are focusable regions named "Formula, scrolls sideways": at 390/200%, 2 of them (5 and 91 px of room); at 320/200%, 3 (75, 2 and 161 px); at 320/150%, 1 (41 px).
  - None of them is a region at 100% or at 390/150%.
  - Tab focuses each one (`:focus-visible`, the console's 2 px ring). ArrowRight ×6 and End scroll it to its end (`scrollLeft` = its room), and the page's `scrollX` stays 0. At HEAD, the same keys left `scrollLeft` at 0.
- **At 100%, unchanged** (`pastpix.mjs`, `imgdiff.mjs`). At 320, 390, 820 and 1440 at 100%, and at 390/150%, every formula's figure crop (with 10 px around it) and its box crop are byte-identical to HEAD (0 px differ). The body panel's height is identical at every width and size: the box's padding is given back by its margins.
- **At 320/150% and 200%,** where the page is wider than the viewport, each box at scroll 0 shows what HEAD showed. Every pixel is within 1 level of HEAD's, which is raster noise across the whole crop. Outside its box, a formula that scrolls no longer draws past the box's edge.
- One formula's scrollable overflow reaches 3–4 px past the box's padding vertically (`scrollHeight` 144/141 at 150%, 192/188 at 200%). It carries no ink: that box's crop is byte-identical at 390/150%.
- **Themes:** the console page does not follow `prefers-color-scheme`, so the dark run is the light one; both were identical.

### Real browser (Claude in Chrome, deviceId `c14e5b18-…`, iframe harness `vp_proxy.py` :3997 → F3 :3996)

I selected the agent's profile by deviceId before acting. Each look was at the root font's 200%. Dark was set through `data-md-color-scheme="slate"` on the frame's `.rd-root`, so no cookie or setting changed. The tab is closed.

- **Book page, 390/200%:** "한국어 · v1" whole on its line, the "OLDER / TRANSLATION" pill under it, then "Versions". Page 390. Light and dark.
- **Book page, 320/200%:** the link whole, the pill under it as "OLDER / TRANSLA / TION", inside the 146–270 column. Page 320. Light and dark.
- **Past version, 390/200%:** the λ formula ("λ = rate × time / P(no event) = e^−λ") stops at its box's right edge. A real wheel scroll over it moved it 91 px to its end (its whole room), and the page did not move (`scrollX` 0). The box is `role="region"`, "Formula, scrolls sideways", `tabIndex` 0. The page is 446, from the source URL and "Sign in".

### Round 1's sweep again, on the final build

- **Page width** (`wide.mjs`, 11 pages × 320/390/820 × 100/150/200%): the same as round 1's build except where round 2 acts.
  - reading-aids en/ko, write-lock en/ko, the loose note and `/documents/5` are at the viewport everywhere (805 at 820, the classic scrollbar).
  - The book page is now at the viewport everywhere (round 1: 384 at 320/200%).
  - all-blocks en is 342 at 320/200% (the top bar; OQ21, accepted as is).
  - The past version is as in the table above.
  - Outside the boundary, unchanged from round 1: `/` (336–385 at 320) and `/@p39rv` (410 at 200%, the console's "Sign in").
- **Identity** (`ctl.mjs`, HEAD against the final build, light and dark, 7 pages × 10 width-and-size combinations):
  - 123 and 120 rows IDENT. Every DIFF is a control whose label now wraps, a control below one that wrapped (same box size, moved down), or the book tag.
  - Against round 1's summary, the only changes are the book tag's rows (under its link, inside its column at every size) and four noise rows:
    - write-lock ko's Show answer at 390/150% (light) is IDENT this time;
    - write-lock ko's Check at 820/200% (dark) differed once and was IDENT on two re-runs;
    - the loose note's two buttons at 320/150% (dark) alternate between runs, and HEAD against HEAD alternates too.
  - The same box with different pixels in every case: anti-aliasing noise, as round 1 found.
- **Wrapped look:** every wrapped control keeps HEAD's padding, radius and colours (`pad true rad true col true`), and its lines are centred for a button.
- **Bars** (`bars.mjs`): the top bar and chapter bar are byte-identical to round 1's build at 390/150%, 390/200% and 320/200%, on reading-aids en, all-blocks en and the loose note. The book page's top is too.
  - Against HEAD they are identical wherever HEAD's page was the viewport.
  - Where HEAD's page was wider than F3's (all-blocks 397 → 390 at 390/200% and 397 → 342 at 320/200%; reading-aids 348 → 320 and the loose note 355 → 320 at 320/200%), the fixed bars span the page, so they moved with it. At 390/200%, all-blocks' top bar is 0–390 with its end group at 236–376, where HEAD's was 0–397 and 243–383: the same boxes, 7 px to the left.
- **F1/F2's `sweep.mjs`:** no inner vertical scroller at the 12 widths. The text-size block is at the viewport: 390 at 390, 805 at 820, at 150% and 200%, light and dark.
- **Quiz option column** (`quiz.mjs`, "CONDITIONAL-GO's 1.5", en and ko): **107.3 px at 390/200%** and **37.3 px at 320/200%**, the same as HEAD. At 320/200% the page is 320 (HEAD 348).
- **Paper** (`paper.mjs`, and `pastpix.mjs` with `PRINT=1`, print media, 794 px):
  - The chapter end's and the quiz's buttons are hidden on paper in both builds.
  - The book page's "Read chapter 1 →" and its tag print with identical boxes.
  - The past version's four formulas print byte-identical, and its page and body panel are the same size.
  - `kb-print.css` is unaffected.
- **Not live-verified, as in round 1:** the Review card (`/review` needs a member; `reader.css` is unchanged since round 1, and its rules exclude `.rv-body`), and `.bk-clear` (untouched).
- **The past version at 820:** its formulas are also byte-identical at 820/150% and 820/200%.

### Stack as run (round 2)

Everything is in `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/aba4c78e-665c-427a-9abd-276457679f2d/scratchpad/f3/`.
- **New:** `book2.mjs` (the book page's link and tag), `links.mjs` (every language link), `past.mjs` (the past version's page width, its formula boxes, and the cause isolation with `ISO=1`), `pastpix.mjs` (formula pixels, and paper with `PRINT=1`), `pastscroll.mjs` (keyboard scroll and focus), `bars.mjs` (the top and chapter bars), `imgdiff.mjs` (PNG pairs compared in headless Chrome), `r2-sweep.sh` (round 1's sweep on the final build). Outputs are in `r2/`.
- **My processes:** headless Chrome :9371 (92014); standalone HEAD :3992 (92045, round 1's `head` build, the same tree as HEAD), round 1 :3994 (92047, `after2`), final :3996 (92987, `after3`); proxy :3997 (93446). Build `after3` (92801). All stopped, and only those.
- I never touched `:3030`, `:8766`, `:8977` (read only, as the API) or `:3978`.

## Round 1 (2026-11-05): ended needs_operator on OQ20–OQ22, answered "accept"

Round 1's verdict was needs_operator: its CSS was complete for everything the record decided, and three residues needed a visual decision (OQ20–OQ22). Its log follows as written, except that its open items are now settled by round 2: OQ20 and OQ22 above, and OQ21 accepted as is.

### The fix (Decisions has the gist)

- `reader.css`, after `.rd-next .rd-btn { margin-top }`: `.rd-next .rd-btn { max-width: 100%; white-space: normal; text-align: center; }`, with P30's comment.
- `reader.css`, after `.kb-ch .qz-card .rd-btn { flex: none; }`: `.kb-ch:not(.rv-body) .qz-card .rd-btn, .kb-ch:not(.rv-body) .qz-acts .rd-btn { max-width: 100%; white-space: normal; text-align: center; }` and `.kb-ch:not(.rv-body) .qz-acts .qz-swap { align-items: center; }`. The Review card's body is `.kb-ch.rv-body`, so P30.F3's `review.css` rule stays the only one that applies there.
- `book.css`, before `.bk-lang__link`: `.bk-lang .rd-tag { flex: 0 1 auto; min-width: 0; max-width: 100%; white-space: normal; }`, as `.rd-ch__tag` has it.
- I did not change `.rd-btn` or `.rd-tag` globally, any component, any string, or the font size.

### Reproduction on HEAD (CDP, DPR 2, mobile, root font)

| # | page @ width / size | HEAD page | element setting it |
|---|---|---|---|
| 1 | chapter end, reading-aids en/ko @320/200% | 348 | `a.rd-btn--primary` in `.rd-next`: 315 px wide in a 253 px column ("Back to the book →") |
| 1b | loose note @320/200% | 355 | "‹ Back to the library", 321 px in 253 |
| 1c | book page "Read chapter 1 →" @320/200% | (inside 448) | 295 px in 253 |
| 2 | book page @390/200% | 448 | `span.rd-tag` "Older translation": 269 px nowrap, right edge 448 |
| 2b | book page @320/150% | 336 | the same tag, 202 px, right edge 336 |
| 3 | write-lock en/ko, all-blocks en @390 and 320/200% | 397 | "Show answer": 238 px in a 229 px card (159 at 320) |
| 3b | the same pages @320/200% | (inside 397) | "Check / Try again", 184 px, right edge 343 |
| 4 | `/documents/5/versions/1` @390/200% | 446 | `a.fg-src__link` (source URL) at r=446; console top bar "Sign in" (`kb-appbtn`, nowrap) at r=410; display math `mtd` at r=413 |
| 4 | the same @320/200% | 447 | the same, plus docbar "Full width" at r=356 and several `msqrt`/`mo` |
| 4 | the same @320/150% | 335 | `a.fg-src__link` alone, r=335 |

**Case 4's cause:** it is not one of P30's no-wrap controls. The widest element is the source line's URL inside the console docview (`.pp-screen` → `a.fg-src__link`, 378 px), with display math under it (`mi`/`mtd`, r=413). Neither is a no-wrap control. The console top bar's signed-out "Sign in" is a no-wrap control (P28's `kb-appbtn`), but it overflows on **every** signed-out console page at 200% (`/@p39rv` is 410 at 320 and at 390). Fixing it alone would leave the page at 446. So, as the plan says, I recorded the causes and changed nothing (OQ22). `kb-console*.css` and `kb-docview.css` were not touched.

### After (build `f3/after2`), page width

- **P30's line, 390 and 820 at 150%/200%:** reading-aids en/ko, write-lock en/ko, all-blocks en, the loose note and the book page are all at the viewport (390, or 805 with the classic scrollbar). The past version is 446 at 390/200% (case 4, unchanged).
- **320:** at 100% and 150%, every page is at 320 except the past version (335, case 4). At 200%:
  - reading-aids en/ko, write-lock en/ko and the loose note: 320 (HEAD 348/397/355).
  - all-blocks en: **342** (HEAD 397). This is now the top bar: logo 14–102, "‹ Book" 114–190 and Display 201–328 in a 10rem container. It was hidden behind Show answer at HEAD. Round 03's record stops at 320/100% and 390/200%, and the plan keeps the top bar unchanged (OQ21).
  - book page: **384** (HEAD 448). The tag wraps to "OLDER / TRANSLATION", but the one word is 148 px and the language line has 124 px beside its 112 px indent (OQ20).
  - past version: 447 (case 4).
- **Fixed controls inside their column:** the chapter end and the quiz are inside everywhere. The book tag is inside at 320/150% and 390/150%. At 390/200% the tag runs 213–361 against a column that ends at 356 (bk-vars content right ≈ 340), so the page is fine but the tag is not inside its column. The same holds at 320/200% (OQ20).

### Identity (HEAD vs F3, light and dark, `ctl.mjs`: box to 0.01 px plus a crop SHA-1)

- **All widths at 100% (320, 390, 820, 1440), 820 at 150% and 820 at 200%,** on all 7 pages and every fixed control: IDENT in both themes (122 and 123 rows).
- **Noise:** in the first run, write-lock ko's Show answer at 820/150% differed. On re-runs it was identical. At 390/150% the same button alternates between two crop hashes, `06e1834300e6` and `d2250953634c`, and both builds produce both. Same box, same pixels to the eye: anti-aliasing noise (HEAD against HEAD: stable on 8 combos).
- **Allowed diffs:** every other DIFF is a control whose label now wraps, or a control below one that wrapped, moved down with the same box size ("Read next →" and "Check" after Show answer wraps).
- **One diff outside the identity set that is a real change:** book page @390/150%. HEAD fits the tag by squeezing the link "한국어 · v1" to 34 px, wrapped onto several lines. F3 keeps the link whole (68 px) and wraps the tag to two lines. Both shrink in proportion: no CSS can make the link give way first without risking a sub-pixel wrap in the tag. 390/150% is outside the plan's identity set and the tag's label now wraps there, so this meets the letter of the plan. I raise it in OQ20 anyway.

### Wrapped look (390/200% and 320/200%, crops in `f3/ctl2/`)

- Padding, radius, background, ink and border are equal to HEAD on every wrapped control (`pad true rad true col true`). Height ≥ `--kb-tap` (88 at 200%).
- Line centring: every line's offset is 0 for the chapter end, Show answer and Check. The `[-178, 19.6]` offsets for "‹ Back to the library" and "Read chapter 1 →" are the chevron/arrow span's own rect: the crops show centred lines.
- **320/200% at its limit:**
  - In a Korean chapter (write-lock ko), Show answer breaks mid-word ("Sh/ow/an/sw/er") and Check breaks as "Che/ck". The chapter inherits `overflow-wrap: anywhere; word-break: keep-all`, and the quiz body there is 108 px (159–267).
  - In English, "answer" fits only by eating into the button's padding.
  - This is the narrow quiz column, the plan's "not a fix here" layout question (OQ21).

### Unchanged

- **Review card** (P30.F3): excluded by `:not(.rv-body)`. I did not verify it live, because `/review` redirects a signed-out visitor.
- **`.bk-clear .rd-btn`:** untouched; it needs reading data and a member.
- **Chapter bar and top bar** at 390/150% and 390/200%: every child box is identical to HEAD (reading-aids en, the loose note). Logo 14–102 and Display 239–378 at 200%, the same as HEAD.
- **F1/F2's `sweep.mjs`:** no inner vertical scroller at the 12 widths. The text-size block is equal to HEAD, all at the viewport.
- **Quiz option column** (reading-aids en, "CONDITIONAL-GO's 1.5"): **107.3 px at 390/200%** and **37.3 px at 320/200%**, the same as HEAD. At 320/200% the page is 320 (HEAD 348).

### Paper (`paper.mjs`, print media, 794 px)

The chapter end and the quiz buttons are hidden on paper in both builds (`.rd-end` and `.qz` are in the print sheet's hidden list). On the book page, "Read chapter 1 →" and the tag print with identical boxes. `kb-print.css` is unaffected.

### Real browser (Claude in Chrome, deviceId `c14e5b18-…`, iframe harness `vp_proxy.py` on :3995 → F3 :3994)

I selected the agent's profile by deviceId before acting. Each look was at 390 with the root font at 200%. Dark was set through `data-md-color-scheme="slate"` on the frame's root, so no cookie or setting changed. The tab is closed.

- **Show answer** (write-lock en): two centred lines inside the bordered button, light and dark, page 390.
- **Chapter end** (reading-aids en): at 390 it fits on one line, light and dark. At 320 it wraps to "Back to the / book →", centred, light and dark, page 320.
- **Book tag:** "OLDER / TRANSLATION" in its pill, light and dark, page 390. In the real browser the link next to it shrinks to "한국 / 어· / v1", and the word TRANSLATION reaches the pill's edge (OQ20).

### Stack as run

Everything is in `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/aba4c78e-665c-427a-9abd-276457679f2d/scratchpad/f3/`.
- **Scripts copied from f2:** `build.sh`, `standalone.sh`, `chrome.sh`, `launch.sh`, `cdp-lib.mjs`, `measure.mjs`, `sweep.mjs`, `quiz.mjs`, `vp_proxy.py`.
- **New:** `wide.mjs` (page width plus the leaf elements past the edge), `ctl.mjs` (identity and look), `top.mjs`, `cs.mjs`, `paper.mjs`, `sum.py`.
- **My processes:** builds `head`, `after`, `after2`; standalone HEAD :3992 (20981), after :3993 (24085), after2 :3994 (26370); proxy :3995 (26435); headless Chrome :9371 (20492). All stopped, and only those. I never touched `:3030`, `:8766`, `:8977` or `:3978`.

### Observations outside the boundary

- The marketing home `/` is 336 at 320/100% and 385 at 320/200%.
- On the book page at 320/200% and 390/200%, the quiet "Versions" button runs 126–317 against a 286 px row (inside the viewport).
