# P39-hk.F3 — result

## Verdict

- **status:** needs_operator
- **route:** mid
- **model:** opus
- **effort:** medium
- **summary:** P30.F3's rule now covers the chapter end's button (`.rd-next .rd-btn`), the chapter quiz's buttons (`.kb-ch:not(.rv-body)` `.qz-card` / `.qz-acts`) and the book page's "Older translation" tag (`.bk-lang .rd-tag`). P30's line (390 and 820 at 150%/200%) now has no sideways scroll on any chapter or on the book page, and every label that fits renders identically to HEAD. Three things still fail, and each needs a visual decision the record does not make (OQ20–OQ22). (1) At 200%, the tag's one word "TRANSLATION" is wider than the room beside its link. (2) At 320/200%, the quiz column and the all-blocks top bar are too narrow. (3) Case 4, the past-version page, is wide because of the console shell, display math and a source URL, not because of one of these controls; it is recorded here and unchanged.
- **files_changed:** `web/src/app/reader.css`, `web/src/app/book.css`, `works/phases/active/P39-hk/slices/P39-hk.F3/result.md`, `works/phases/active/P39-hk/phase.md` (through `phase-section`)
- **validation:**
  - `pnpm --dir web typecheck`: pass
  - `pnpm --dir web lint`: pass
  - `pnpm --dir web exec vitest run`: pass (40 files, 585 tests)
  - standalone build in a scratch copy (`f3/after2`): pass
  - the sweep (headless Chrome over CDP, plus Claude in Chrome): see below. It passes P30's line, identity and the unchanged checks. It fails at 390/200% for the tag's column and at 320/200% for the page width (OQ20, OQ21).
  - `python3 scripts/workflow.py validate`: pass (warnings only, none of them this slice's)
- **deviations:**
  - The quiz rule also covers `.qz-acts` (Check / Try again / I got it / I missed it). At 320/200%, "Check / Try again" stuck out of its column at r=343, so it belongs to the same class as Show answer. I added one line, `.qz-acts .qz-swap { align-items: center }`, so the shorter label sits mid-button when the longer one wraps. It changes nothing while both labels fit.
  - The `.rd-next .rd-btn` rule also bounds the book page's "Read chapter 1 →" (it was 295 px wide in a 253 px column at 320/200%), the loose note's "‹ Back to the library", and, by construction, the Review end's "continue" button. The Review end needs a signed-in session, so I did not verify it live.
- **doc_impact:** qa: P30's text-size line (390 and 820 at 150%/200%) now passes on the chapter end, the quiz and the book page. The past-version page still fails (console top bar, docview math and source URL; OQ22). At 320/200%, the book page (384) and all-blocks (342) are still wide (OQ20, OQ21).
- **operator_need:** Answer OQ20, OQ21 and OQ22 in `phase.md`. Each one asks whether to fix the residue now (and how), or accept it and defer a job. The CSS in the tree can be committed as it is: it is complete for everything the record decides.

## The fix (Decisions has the gist)

- `reader.css`, after `.rd-next .rd-btn { margin-top }`: `.rd-next .rd-btn { max-width: 100%; white-space: normal; text-align: center; }`, with P30's comment.
- `reader.css`, after `.kb-ch .qz-card .rd-btn { flex: none; }`: `.kb-ch:not(.rv-body) .qz-card .rd-btn, .kb-ch:not(.rv-body) .qz-acts .rd-btn { max-width: 100%; white-space: normal; text-align: center; }` and `.kb-ch:not(.rv-body) .qz-acts .qz-swap { align-items: center; }`. The Review card's body is `.kb-ch.rv-body`, so P30.F3's `review.css` rule stays the only one that applies there.
- `book.css`, before `.bk-lang__link`: `.bk-lang .rd-tag { flex: 0 1 auto; min-width: 0; max-width: 100%; white-space: normal; }`, as `.rd-ch__tag` has it.
- I did not change `.rd-btn` or `.rd-tag` globally, any component, any string, or the font size.

## Reproduction on HEAD (CDP, DPR 2, mobile, root font)

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

## After (build `f3/after2`), page width

- **P30's line, 390 and 820 at 150%/200%:** reading-aids en/ko, write-lock en/ko, all-blocks en, the loose note and the book page are all at the viewport (390, or 805 with the classic scrollbar). The past version is 446 at 390/200% (case 4, unchanged).
- **320:** at 100% and 150%, every page is at 320 except the past version (335, case 4). At 200%:
  - reading-aids en/ko, write-lock en/ko and the loose note: 320 (HEAD 348/397/355).
  - all-blocks en: **342** (HEAD 397). This is now the top bar: logo 14–102, "‹ Book" 114–190 and Display 201–328 in a 10rem container. It was hidden behind Show answer at HEAD. Round 03's record stops at 320/100% and 390/200%, and the plan keeps the top bar unchanged (OQ21).
  - book page: **384** (HEAD 448). The tag wraps to "OLDER / TRANSLATION", but the one word is 148 px and the language line has 124 px beside its 112 px indent (OQ20).
  - past version: 447 (case 4).
- **Fixed controls inside their column:** the chapter end and the quiz are inside everywhere. The book tag is inside at 320/150% and 390/150%. At 390/200% the tag runs 213–361 against a column that ends at 356 (bk-vars content right ≈ 340), so the page is fine but the tag is not inside its column. The same holds at 320/200% (OQ20).

## Identity (HEAD vs F3, light and dark, `ctl.mjs`: box to 0.01 px plus a crop SHA-1)

- **All widths at 100% (320, 390, 820, 1440), 820 at 150% and 820 at 200%,** on all 7 pages and every fixed control: IDENT in both themes (122 and 123 rows).
- **Noise:** in the first run, write-lock ko's Show answer at 820/150% differed. On re-runs it was identical. At 390/150% the same button alternates between two crop hashes, `06e1834300e6` and `d2250953634c`, and both builds produce both. Same box, same pixels to the eye: anti-aliasing noise (HEAD against HEAD: stable on 8 combos).
- **Allowed diffs:** every other DIFF is a control whose label now wraps, or a control below one that wrapped, moved down with the same box size ("Read next →" and "Check" after Show answer wraps).
- **One diff outside the identity set that is a real change:** book page @390/150%. HEAD fits the tag by squeezing the link "한국어 · v1" to 34 px, wrapped onto several lines. F3 keeps the link whole (68 px) and wraps the tag to two lines. Both shrink in proportion: no CSS can make the link give way first without risking a sub-pixel wrap in the tag. 390/150% is outside the plan's identity set and the tag's label now wraps there, so this meets the letter of the plan. I raise it in OQ20 anyway.

## Wrapped look (390/200% and 320/200%, crops in `f3/ctl2/`)

- Padding, radius, background, ink and border are equal to HEAD on every wrapped control (`pad true rad true col true`). Height ≥ `--kb-tap` (88 at 200%).
- Line centring: every line's offset is 0 for the chapter end, Show answer and Check. The `[-178, 19.6]` offsets for "‹ Back to the library" and "Read chapter 1 →" are the chevron/arrow span's own rect: the crops show centred lines.
- **320/200% at its limit:**
  - In a Korean chapter (write-lock ko), Show answer breaks mid-word ("Sh/ow/an/sw/er") and Check breaks as "Che/ck". The chapter inherits `overflow-wrap: anywhere; word-break: keep-all`, and the quiz body there is 108 px (159–267).
  - In English, "answer" fits only by eating into the button's padding.
  - This is the narrow quiz column, the plan's "not a fix here" layout question (OQ21).

## Unchanged

- **Review card** (P30.F3): excluded by `:not(.rv-body)`. I did not verify it live, because `/review` redirects a signed-out visitor.
- **`.bk-clear .rd-btn`:** untouched; it needs reading data and a member.
- **Chapter bar and top bar** at 390/150% and 390/200%: every child box is identical to HEAD (reading-aids en, the loose note). Logo 14–102 and Display 239–378 at 200%, the same as HEAD.
- **F1/F2's `sweep.mjs`:** no inner vertical scroller at the 12 widths. The text-size block is equal to HEAD, all at the viewport.
- **Quiz option column** (reading-aids en, "CONDITIONAL-GO's 1.5"): **107.3 px at 390/200%** and **37.3 px at 320/200%**, the same as HEAD. At 320/200% the page is 320 (HEAD 348).

## Paper (`paper.mjs`, print media, 794 px)

The chapter end and the quiz buttons are hidden on paper in both builds (`.rd-end` and `.qz` are in the print sheet's hidden list). On the book page, "Read chapter 1 →" and the tag print with identical boxes. `kb-print.css` is unaffected.

## Real browser (Claude in Chrome, deviceId `c14e5b18-…`, iframe harness `vp_proxy.py` on :3995 → F3 :3994)

I selected the agent's profile by deviceId before acting. Each look was at 390 with the root font at 200%. Dark was set through `data-md-color-scheme="slate"` on the frame's root, so no cookie or setting changed. The tab is closed.

- **Show answer** (write-lock en): two centred lines inside the bordered button, light and dark, page 390.
- **Chapter end** (reading-aids en): at 390 it fits on one line, light and dark. At 320 it wraps to "Back to the / book →", centred, light and dark, page 320.
- **Book tag:** "OLDER / TRANSLATION" in its pill, light and dark, page 390. In the real browser the link next to it shrinks to "한국 / 어· / v1", and the word TRANSLATION reaches the pill's edge (OQ20).

## Stack as run

Everything is in `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/aba4c78e-665c-427a-9abd-276457679f2d/scratchpad/f3/`.
- **Scripts copied from f2:** `build.sh`, `standalone.sh`, `chrome.sh`, `launch.sh`, `cdp-lib.mjs`, `measure.mjs`, `sweep.mjs`, `quiz.mjs`, `vp_proxy.py`.
- **New:** `wide.mjs` (page width plus the leaf elements past the edge), `ctl.mjs` (identity and look), `top.mjs`, `cs.mjs`, `paper.mjs`, `sum.py`.
- **My processes:** builds `head`, `after`, `after2`; standalone HEAD :3992 (20981), after :3993 (24085), after2 :3994 (26370); proxy :3995 (26435); headless Chrome :9371 (20492). All stopped, and only those. I never touched `:3030`, `:8766`, `:8977` or `:3978`.

## Observations outside the boundary

- The marketing home `/` is 336 at 320/100% and 385 at 320/200%.
- On the book page at 320/200% and 390/200%, the quiet "Versions" button runs 126–317 against a 286 px row (inside the viewport).
