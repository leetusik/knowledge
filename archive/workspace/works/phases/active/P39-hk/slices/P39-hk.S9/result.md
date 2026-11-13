# P39-hk.S9 result: terms in the reader and on paper

## Verdict

- **status:** done
- **route:** high
- **model:** opus
- **effort:** xhigh
- **summary:** Built the signed `10-reading-aids` terms. A `term:` link is the dotted term marker, numbered `tm-<id>-<n>` across the text and the formulas' legends (`terms.ts`). Each linked term gets one hidden `tw-<id>` window: a window from 40rem, and the same element as a fixed bottom sheet below that. The chapter's Glossary section has its way back, and paper gets the glossary appendix. All of it is static server markup that one client `TermLayer`, beside `AnnotationLayer`, drives. The sheet placement was confirmed live first: fixed in place, no frame slot. The sweep ran in Claude in Chrome on the agent profile, on dev and on the standalone build, and paper ran through headless CDP. It found and fixed one composition bug: the selection bar came back beside a window.
- **files_changed:**
  - `web/src/lib/native/terms.ts` (new)
  - `web/src/lib/native/render.tsx`
  - `web/src/components/reader/term-layer.tsx` (new)
  - `web/src/components/reader/reader-article.tsx`
  - `web/src/app/reader-aids.css`
  - `web/src/app/kb-print.css`
  - `web/src/content/chapter.ts`
  - `web/tests/native-terms.test.ts` (new)
  - `works/phases/active/P39-hk/phase.md` (through `phase-section` only)
  - `works/phases/active/P39-hk/slices/P39-hk.S9/result.md` (new)
- **validation:**
  - `pnpm --dir web typecheck`: pass.
  - `pnpm --dir web lint`: pass.
  - `pnpm --dir web exec vitest run tests/native-terms.test.ts tests/native-render.test.ts tests/native-math.test.ts tests/reader-anchor.test.ts tests/reader-chrome.test.ts tests/csp.test.ts`: pass, 6 files, 292 tests.
  - The whole web suite `pnpm --dir web exec vitest run`: pass, 40 files, 583 tests. It was run anyway; the plan defers it.
  - Standalone `next build` in a scratch clone: pass. It was built twice, the second time after the sweep fix, and served from `.next/standalone`.
  - Live sweep: done (instruments below).
  - `python3 scripts/workflow.py validate`: passed. Its warnings are pre-existing: old slice kinds, consolidation debt, and Decisions entry 30 being long (the orchestrator's move).
  - deferred (whole-tree): the full pytest suite.
- **deviations:** See *Deviations* below:
  - `annotations.tsx` is untouched (R1's 3-line touch dropped).
  - A term's click clears a native selection (a sweep fix).
  - The quiz's paper copies render without ids.
  - There is no `print-glossary.tsx`: paper is the same DOM restyled.
  - The sheet is the window element restyled.
  - The highlight rule is written from the link's side.
  - Two instruments were used.
- **doc_impact:** `- **(P39-hk.S9)** product.md, architecture.md, qa.md: terms in the reader. A `term:` link is the term marker (a dotted link to `#gl-<id>`, `tm-<id>-<n>` per occurrence across text and legends, `terms.ts`); one hidden `tw-<id>` window per linked term, the window from 40rem and the fixed bottom sheet under it; the chapter's Glossary section (h2, A to Z, "‹ Back to the text"); the client `TermLayer` beside `AnnotationLayer`; the paper glossary appendix (`kb-print.css`); CSS in `reader-aids.css`; `native-terms.test.ts` (+6 tests)`
- **notebook:** I wrote these myself through `phase-section`; the slice ran alone.
  - Decisions 33–35: the term sheet placement; the terms wiring; what the record left.
  - OQ15–OQ17.
  - One Doc impact line.
  - Notes:
    - removed the consumed notes: old 6 and 8 (R1), 13 (DECOMP2), 15 (S6) and 18 (S8);
    - retargeted three: 1 is now "for REVIEW and the integration", 12 and 19 are now "for REVIEW";
    - added one note for REVIEW.
  - `## Now` rewritten.
- **operator_need:** none

## What was built

- **`terms.ts` (`planTerms`):** a pure pre-pass in `cites.ts`'s pattern.
  - It reads the first glossary block's entries, then visits every `term:` link in render order and numbers it per term.
  - A typed block's fields are visited in the order the renderer draws them: a figure's caption then credit; a formula's reading then its legend's `means`; a quiz item's prompt, text, options, answer and explanation.
  - The plan is keyed by the link node, so the renderer asks about the very object it draws.
  - A link to an id the glossary does not hold gets no number. It renders through the missing-link path.
- **The marker** (`render.tsx` `term()`), F2, F22, F33:
  - Markup: `<a class="ra-term" id="tm-<id>-<n>" href="#gl-<id>" aria-haspopup="dialog" aria-expanded="false" aria-controls="tw-<id>">`.
  - Its words are kept whole at a hyphen (`span.ra-keep`, `keepText`). Only the text's own characters are used, so anchor offsets never move.
  - Without script, every marker is a link to its entry.
  - The rest, hover and open styles come from the record. They are written over the reader's link rules (`.kb-ch a.ra-term`), with a Korean offset of 0.28em.
  - Inside a highlight the line takes the ink, through `.kb-ch a.ra-term:has(mark.an-m)`, and the words stay ink.
- **The windows** (`termWindows()`), F3–F5, F18, F32:
  - There is one hidden `div.ra-win#tw-<id>` (`role="dialog"`, `tabindex="-1"`) per linked term, in one `.ra-float` holder at the end of `.kb-ch`.
  - The head holds the term (`tw-<id>-t`), "Also called …", and Close.
  - The body holds the short definition, then the longer one (`tw-<id>-l`, hidden) under a hairline.
  - The foot holds Read more / Show less in one `.ra-swap` box, then "In the glossary →". A term with no longer definition gets the end-aligned foot with no toggle.
  - Chrome words are English in a Korean chapter (F1), from `CHAPTER.terms`.
  - The second copy of a definition takes no ids.
  - The window is capped at `min(32rem, 70vh)` and its body scrolls (F5). It fades in over 0.15s, in the window form only, and not under reduced motion.
- **The phone sheet** (F4):
  - It is the same element. Under `@container rd (width < 40rem)` it is restyled with the `.ra-sheet*` values: fixed at the viewport's bottom, 60vh tall (85vh with the longer definition open), no gap, no fade, no scrim.
  - The holder lifts to z-index 25, over the bars and the annotation slots.
  - The layer sizes its own spacer, `div.ra-pad`, to the sheet's height. That is the page's bottom padding. It also scrolls the term's last line to 1rem above the sheet, on open and on Read more.
- **The glossary section** (`glossary()`), F6, F17, F25, F33:
  - It sits where the author placed the block.
  - It opens with the reader's h2 "Glossary" (`id` = the block's id, `lang="en"` in a Korean chapter).
  - Then comes `ul.ra-gl`, A to Z by `Intl.Collator(lang)`, which puts Korean 가나다 first and Latin after.
  - Each `li.ra-gl__item#gl-<id>` holds the term, "Also called …", the short definition and the longer one.
  - A linked term's entry also holds a hidden "‹ Back to the text" (`.fg-back`).
  - The arrived entry is marked `is-target`, the sources' `:target` mark. Its ground bleeds into the gutter, and the dividers run on the column.
- **`TermLayer`** (client, mounted in `reader-article.tsx` after `AnnotationLayer`):
  - **Opening:**
    - click, tap or Enter (the link's own click) opens the window and focuses it;
    - Space opens it through a key handler;
    - a click on the open term closes it;
    - a modified click is left to the browser.
  - **Hover** works with a fine pointer in the window form only. A rest of 250 ms opens it with focus left in the text; leaving the term and the window for 200 ms closes a hover-opened one. A hover never replaces a window opened by click or key (F19).
  - **Placement (F3):**
    - Below the term, on the first line box's left edge.
    - Shifted left to end on the column.
    - Above the term, anchored by its bottom, when there is less room below than the window needs and more room above.
    - Placed hidden, then shown. Re-placed on resize and on a change of form.
  - **Closing:**
    - Close and Esc return focus to the term.
    - Tab past the last control lets focus go on in the text.
    - Shift+Tab out of the first control returns focus to the term.
    - A pointer down outside closes it, and that click never also toggles the chrome. The sheet then returns focus to its term unless the tap lands on a control.
    - A focus outside closes it.
  - **"In the glossary →"** closes the window, marks the entry, aims its Back at the very occurrence, scrolls the entry under the bar and focuses it. Back scrolls the occurrence to the centre, focuses it and clears the mark.
  - `fitRadicals(win)` runs on every open and after Read more (S8's API).
  - Its pointerdown and Esc run in the capture phase, before the annotation layer's.
- **Paper** (`kb-print.css`), F10:
  - The marker is ink with a 1px dotted `--pp-hint` underline at 0.22em, with nothing after it.
  - The windows and the spacer never print.
  - The appendix is the same `ul.ra-gl`, on 552px. Each entry is `padding 8px 0`, has a `--pp-border` hairline and is never split. The term is Fraunces 600 14px; "Also called" is 12px `--pp-sec`; the definitions are Literata 14px/1.55 with 4px between them. There is no ground and no way back.
  - The order is body → quiz → Glossary → Sources → Answers → colophon (measured).
- **Words:** `CHAPTER.terms` (Glossary, Close, Read more, Show less, In the glossary →, Also called). Back reuses `sources.back`.
- **Test:** `native-terms.test.ts`, 6 tests:
  - render-order numbering across the text, a callout title, a figure caption and the quiz;
  - a legend's term counted between the text's;
  - one window per linked term, A to Z;
  - unique ids on the page;
  - the way back's first aim;
  - English chrome in a Korean chapter;
  - no number for an id outside the glossary.

## Live sweep

**Instruments:**
- **Claude in Chrome** on the agent's own profile, selected by `deviceId` `c14e5b18-…` after `list_connected_browsers`. It drove every screen state: real clicks, keys, hovers and drags, with page JS for measuring and reading only. The window is fixed at 1728×963 (DPR 1).
- **Narrower viewports** came from S8's same-origin harness (`vp_proxy.py`, `/__vp?w=&h=&path=`), pointed at the scratch standalone build.
- **Headless Chrome 156 over CDP** (`cdp.mjs`, a throwaway profile) handled what the extension cannot do: `Page.printToPDF`, and `prefers-reduced-motion` emulation. The PDFs were rendered with `pdftoppm` and I looked at every page.
- There was no WebKit, no real phone and no screen reader.

**The trigger, confirmed first:**
- Test: on dev I injected a `position: fixed; bottom: 0` probe inside `.rd-prose > .kb-ch`, under `.rd-page`'s `container-type: inline-size`, and scrolled 600px.
- Result: the probe stayed at viewport bottom 963. The container is no containing block in Chromium, so the sheet stays in place (Decision 33).
- WebKit had regressions here in 18.2 (bugs 284945, 286237), so a real iPhone check goes to the gate.

| State | Viewport | Theme | Lang | Build | What was seen |
|---|---|---|---|---|---|
| rest | 1728 direct | light, dark | en, ko | dev | Ink text with a 0.09em dotted `kb-secondary` line at 0.24em (ko 0.28em); dark `rgb(182,173,157)` on ink `rgb(236,228,215)`. |
| focus open (click) | 1728 | light | en | dev | The window is 448px (28rem), 5.6px under the term, left on the term's first line box. The line is solid accent 2px, focus is in the window, and there is no ring after a mouse click. Hash unchanged. |
| keyboard | 1728 | light | en | dev | Esc → closed, focus on the term (ring). Enter → open, the window's ring shows. Tab goes Close → Read more → In the glossary →, and Tab past the last control → closed with focus on the next term. Space on a term → open, no page scroll. Shift+Tab from the window → closed, focus on the term. |
| hover open | 1728 | light | en | dev | A legend term opened after a 250 ms rest with focus left in the text. Moving into the window kept it; leaving closed it. A hover over another term never replaced a clicked window, and leaving a clicked window kept it. |
| longer open | 1728 | light, dark | en | dev | The window grows in place (placed below it grows down, placed above it grows up with its bottom fixed). Capped at 512px with the body scrolling; the toggle box stays 88.5px. |
| no longer definition | 1024×768 | light | ko | standalone | The foot is end-aligned with only "In the glossary →", and there is no alias line. |
| right edge | 1728; 820×1180 | light | en | dev; standalone | Shifted left to end on the column (1216 = col right; 698 = col right). |
| bottom edge | 1728 | light | en | dev | Above the term, bottom-anchored with a 5.5px gap. |
| swap | 1728 | light | en | dev | A click on another term swaps the window. A click outside closes it and does not toggle the chrome; the next tap does toggle it. |
| phone 390 sheet | 390×844 | dark, light | en, ko | standalone | Fixed, 390 wide, over the bottom bar. The term sits 16px above the sheet (open and Read more); the spacer matches the sheet (294 / 510px); focus is in the sheet. Close → focus on the term. A tap outside → closed, focus on the term, chrome unchanged. "In the glossary →" and Back work. A legend term (ko) also opens in the sheet. |
| phone 320 sheet | 320×568 | light | ko | standalone | Fixed, 320 wide; the term sits 15.7px above the sheet; no sideways scroll (scrollWidth 320). |
| form switch | 390 ↔ 820 (live iframe resize) | light | en | standalone | Sheet → window (spacer cleared, placed by its term) and back (sheet with spacer, re-scrolled). |
| Korean | 1728, 1024, 390, 320 | light | ko | dev, standalone | Korean definitions with `keep-all`, aliases in Korean after "Also called", chrome English, glossary 가나다 then K and t-통계량. |
| glossary arrived + Back | 1728, 390 | light, dark | en | dev, standalone | Sunken ground, 1px `kb-border-strong` inset box, the entry 74.7px from the top (under the bar's line), Back aimed at the occurrence (`#tm-sharpe-1`, a legend's). Back → the term centred and focused, mark cleared. Cross-page way back from a legend term: yes. |
| dark open / glossary | 1728 | dark | en | dev | Surface, border and accent from the tokens; no hard-coded colour. |
| highlight meets term | 1728 | light | en | dev | **Injected** `mark.an-m` inside `#tm-oos-1` (a DOM probe, signed out; never a member's highlight): the line takes the ink, the words stay ink. Removed by reload. |
| selection bar + term | 1728; 1440 | light | en | dev; standalone | **Found and fixed.** A term click while the anonymous selection bar showed left both open: a press on a link keeps the native selection, and the annotation layer re-read it on mouseup. Fixed in `TermLayer` by clearing the selection on a term click. After the fix (dev, and the rebuilt standalone): bar closed, window open. Dragging a selection with a window open closes the window and opens the bar. Selecting inside a window or the glossary shows no bar. |
| reduced motion | 1440, 390 | light | en | standalone (CDP) | `no-preference`: window `ra-in`, sheet none. `reduce`: none in both, and the marker transition is off. |
| paper | A4, letter | light | en, ko | standalone (CDP) | 6 pages each. Marker 1px dotted `rgb(109,102,90)` at 3.08px (0.22em), `cursor: auto`. "Glossary" h2 600 18.67px with `break-after: avoid` (ko `lang="en"`) is kept with its first entry. The list is 552px, 10px under the h2. Entries are 8px 0 with a 1px `#c9c2b3` hairline, `break-inside: avoid`, a 2px gap, no ground; term 600 14px Fraunces, alias 12px, definitions 14px/1.55; no Back; windows and spacer `display: none`. Order: body → quiz → Glossary → Sources → Answers → colophon. |

**Console and server logs:**
- The extension's console read showed no errors on the standalone build.
- The dev log has 24 `TypeError` lines (`r.termWindows`, `CHAPTER.terms.glossary`, `this.copied`). Each came from a hot reload between two of my edits, before the method or string existed; every request after the edits landed was 200.

## Left to the gate

- **A member's real highlight on a term (F2):** the dotted line in ink on the paint, and its note popover beside a window ("never two floating things"). The agent profile is signed out, so S9 checked only an injected mark and the anonymous selection bar.
- **The phone sheet on a real iPhone (Safari):** fixed inside the `rd` container, which is the WebKit 18.2 regression class. Also the sheet over the iOS toolbar. The native reader sets no `viewport-fit=cover`, so safe-area insets are 0.
- **VoiceOver / a screen reader:** on the window and the sheet (`role="dialog"`, labelled by the term; focus moves in and back).
- **Not checked:**
  - the sepia theme;
  - text sizes other than 3;
  - the old-version page (`/documents/<id>/versions/<v>`), where terms render as unstyled links with their windows hidden, as OQ13 found for math.
- **As drawn, for the operator to see at the gate:**
  - a window placed below its term grows downward on Read more and can run under the bottom bar; the page scrolls, and the canvas does not re-place it either;
  - the annotations' chrome place bar can cover a term on the bottom line while the bars show (pre-existing, outside S9).

## Stack as run

All of it ran on scratch ports; the main checkout's `:3030` (PID 8452) and `:8766` (PID 80074) were never touched and were still listening at the end.

- **API:**
  - The database `kb_p39s9live` was created in `kb-p28s2-pg` and migrated with alembic.
  - It ran `uvicorn server.main:app --port 8987`, with a scratch `KB_ROOT` and `KB_DB_PATH`, `KB_GIT_COMMIT=false`, `KB_STARTUP_REINDEX=false`, and without the Google/Gemini keys (`s9live/api.sh`).
- **Member:** a throwaway signup, `p39s9-member@example.com`, with an org key and slug `p39s9` (`setup.py`; its output stays in `setup.json` and was never printed).
- **Publish:**
  - `scripts/publish_fixture_book.py` on fresh state gave these ids: all-blocks 1, write-lock 2/3, legacy 4, reading-aids en 5 / ko 6, loose note 7.
  - `fixtures` and `fixture-finance` were then made public.
- **Dev:** `next dev -H 127.0.0.1 -p 3987` against `:8987`, with a throwaway `SESSION_SECRET` (`dev.sh`).
- **Standalone:**
  - A `cp -Rc` clone of `web/` without `.next`, then `next build` (`build.sh`).
  - It was served from `.next/standalone` on `:3988` (`standalone.sh`).
  - It was rebuilt after the sweep fix.
- **Harness:** `vp_proxy.py 3986 3988`.
- **Paper and motion:** headless Chrome on `:9334` (`chrome.sh`), `node cdp.mjs 9334 http://127.0.0.1:3988 …/paper`, then `render_pdfs.sh 80`.
- **Reader URL:** `/@p39s9/fixtures/books/fixture-guide/reading-aids?lang=en|ko`.
- **Cleanup:**
  - Stopped exactly the processes I started:
    - API 49675;
    - dev 49677 / 49683;
    - standalone 54846 (first build) and 56974;
    - proxy 54881;
    - headless Chrome 56053 and its helpers.
  - Dropped `kb_p39s9live`.
  - Deleted the `kb_reader` cookie I set on the agent profile (127.0.0.1).
  - Left `csrftoken`, `kb_rail` and `__next_hmr_refresh_hash__` alone. Those are host-wide cookies I cannot attribute to this run.
  - Closed my tab.
  - Scripts, the CDP report, the PDFs and the PNGs are under `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/aba4c78e-665c-427a-9abd-276457679f2d/scratchpad/s9live/`.

## Deviations

1. **`annotations.tsx` untouched.** R1 planned a 3-line touch to the layer's `onKey`.
   - An Enter on a term fires the link's own click, and Space calls `term.click()`. Both reach the annotation layer's existing article-capture click, which already closes its popover or bar for any link.
   - The R1 touch, after its `defaultPrevented` bail, could not have seen a prevented Space anyway.
   - Zero edits there is also the smallest P36-1s merge surface.
2. **Sweep fix: a term's click clears a native selection** (`term-layer.tsx`).
   - Found live: Chrome keeps the selection through a press on a link, and the annotation layer's mouseup read brought its bar back beside the window.
   - This is the record's "a tap anywhere else closes the bar" applied to a term.
3. **The quiz's paper copies are drawn again, without ids** (`render.tsx` `quiz()`, `copied()`).
   - The paper sheet and answer key reused the island's nodes, so a term in a prompt gave two `tm-…` ids. The same was already true for a citation's `cite-…` id, and the fix covers both.
   - The island keeps the ids.
4. **No `print-glossary.tsx`.** Paper is the same DOM restyled, with the `.ra-pgl` values mapped onto `.ra-gl__*`, in the order the author placed the block (the record's order for this chapter).
5. **The sheet is the window element restyled.** Values are transcribed from `.ra-sheet*`; there is no second markup (Decision 33).
6. **`.kb-ch a.ra-term:has(mark.an-m)`** in place of the canvas's `mark.an-m .ra-term`.
   - The paint puts its mark inside the term's link.
   - It uses a descendant match, because a keep span may hold the mark.
7. **F4 focus on an outside tap.** The record's text says focus returns to the term; the canvas's controller only closed. It is built per F4, except when the tap lands on a control, which takes the focus itself.
8. **Two instruments.** Claude in Chrome ran every screen state. Headless Chrome over CDP ran paper and reduced motion, which the extension cannot print or emulate. Both are named above.
