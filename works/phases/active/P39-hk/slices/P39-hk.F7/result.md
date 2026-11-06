# P39-hk.F7 — result

## Verdict

- **status:** done
- **route:** mid
- **model:** opus
- **effort:** medium
- **summary:** In a Korean chapter, the annotation layer now gives the Glossary's place name the Glossary h2's own `lang` ("en"). This covers the place bar, the note box, the selection bars, and the bookmark rows in the Notes sheet and on the per-book page. One shared helper, `chromeLangOf` (`notes-load.ts`), now holds the renderer's `chromeLang` rule; `headingsOf` (F6) calls it too. The new `NoteSection.lang` carries the value, set only for the glossary. Every other name and every English chapter is unchanged from HEAD.
- **files_changed:** `web/src/lib/reader/notes-load.ts`, `web/src/lib/reader/types.ts`, `web/src/lib/reader/load.ts`, `web/src/lib/reader/note-list.ts`, `web/src/components/reader/annotations.tsx`, `web/src/lib/reader/book-notes-load.ts`, `web/tests/display-text.test.ts`, this `result.md`, `phase.md` (through `phase-section`: Decisions entry 41 replaced, one Doc impact line, Now)
- **validation:**
  - `pnpm --dir web typecheck`: passed.
  - `pnpm --dir web lint`: passed.
  - `pnpm --dir web exec vitest run`: passed, 41 files and 589 tests. The new expectations sit inside F6's existing `it`, so the test count does not change.
  - Standalone `next build` in a scratch APFS clone: passed (exit 0). A HEAD build was also made, from a clone with F7's files swapped for their `git archive HEAD` copies.
  - `python3 scripts/workflow.py validate`: passed, with warnings only, none of them new.
  - Acceptance matrix: 7 of 7 pass (below).
- **deviations:**
  1. **Per-book page.** That page loads no chapter's sections, so it has no `NoteSection` to read. `book-notes-load.ts` therefore recognises a section bookmark at the Glossary by its stored place name, which must equal `CHAPTER.terms.glossary` with no label. Only then does it set `secLang = chromeLangOf(b.lang)`. The one edge case is a Korean section literally titled "Glossary": it would also read `lang="en"`, which is harmless for an English word.
  2. **Two extra spots in `annotations.tsx` got the same rule.** The plan did not list them: the selection bar's `.an-box__msg <b>` (clipped passage and block mode). Both show the place name, and each changes only its `lang` value.
  3. **No change was needed for the section-note rows.** Their place name sits in `.an-li__meta <span>`, which has no `lang` of its own. It inherits `lang="en"` from the `.rd-root`/sheet wrapper, on HEAD as well. `note-row.tsx` (outside the Set) was not touched.
- **doc_impact_added:** `**(P39-hk.F7)** qa: in a Korean chapter the Glossary place name reads lang="en" in the place bar, the note box and the bookmark rows.`

## Acceptance matrix

**Stack.**
- F7 build `:3998`, behind `member_proxy.py` on `:3995`.
- HEAD build `:3996` (F6's state), behind `:3994`.
- Both builds used the review's API `:8977`.

**Instruments.**
- **Claude in Chrome:** `list_connected_browsers`, then `select_browser` on `c14e5b18-f250-45f1-b92e-4a08a31197b5`. Width 1728 in the top-level tab; width 390 through the proxy's same-origin `/__vp` harness.
- **SSR/flight diff:** `scratchpad/f7/diff.py`. Scripts are removed, and nonces, chunks and module refs are normalised.
- **Place-bar sweep:** a script that scrolls every top-level `[data-block]` under the bar and records the `.an-place__where` markup (`id/lang/hash`).

| # | Case | Result | Instrument |
|---|---|---|---|
| 1 | reading-aids ko, place bar at the Glossary, 1728 and 390 | **Pass.** `<span class="an-place__where"><b lang="en">Glossary</b></span>` at 1728 (`#glossary` landing) and at 390 (landing and sweep). HEAD reads `<b lang="ko">Glossary</b>`. | Claude in Chrome |
| 2 | reading-aids ko, section note at the Glossary | **Pass.** `<p class="an-box__where" lang="en">Glossary</p>`. HEAD reads `lang="ko"`. The note text keeps `lang="en"` (`langOf`, unchanged). | Claude in Chrome (1728, the margin-rail note opened) |
| 3 | reading-aids ko, Notes sheet | **Pass.** Glossary bookmark row: `.an-li__main` `lang` went from ko (HEAD) to en (F7). Section-note row: the note keeps `lang="en"`; the place name in the meta resolves to en on both builds (inherited, see deviation 3). The other rows are identical to HEAD, including the en-group Glossary bookmark (en). | Claude in Chrome (390, Contents sheet → Notes) |
| 4 | Per-book notes page, same marks | **Pass.** Glossary bookmark `.an-li__main` `lang` went from ko to en. Section-note row unchanged (meta → en). SSR DOM diff: 1 changed line pair, exactly that span. Flight diff: only that row's item gains `secLang:"en"`. The pre-F6 bookmark stays blank there, which is out of scope (dropped scratch data). | SSR diff + Claude in Chrome |
| 5 | Every other section, reading-aids and all-blocks ko | **Pass.** The sweep's `id/lang/hash` lists equal HEAD's for every block except `glossary`: 8 sections on reading-aids ko, all `lang="ko"`. A new-note box on `when-nothing-happens` reads `lang="ko"` "아무 일도 없을 때". all-blocks has no ko variant (`?lang=ko` serves en), and its sweep hash is `1rd8d24` on both builds. SSR DOM: 0 changed lines on every page. Flight data: only the `glossary` section gains `"lang":"en"` (reading-aids ko, math-check ko). | Claude in Chrome sweep (390) + SSR/flight diff |
| 6 | English chapters (reading-aids, all-blocks, math-check en) | **Pass.** Place-bar sweeps are identical to HEAD (reading-aids en lists match; all-blocks `1rd8d24`; math-check en `3ba5md`). The reading-aids en Notes sheet rows hash `1jw6xsq` on both builds (5 rows). SSR DOM and flight data: 0 changed lines for reading-aids, all-blocks and math-check en, and for write-lock en/ko. | Claude in Chrome + SSR/flight diff |
| 7 | math-check ko, place bar at the Glossary | **Pass.** `<b lang="en">Glossary</b>` at 1728 (landing) and 390 (sweep). HEAD reads `lang="ko"`. Every other block matches HEAD. No console errors. | Claude in Chrome |

## What changed

- `notes-load.ts`:
  - New export `chromeLangOf(lang)`, the renderer's rule: "en" in a chapter that is not English, otherwise `undefined`.
  - `noteSections(checked, lang)` sets `lang` on the glossary section only, and only when that value is defined.
  - `loadNotes` passes its `lang` through.
- `load.ts`: `headingsOf` calls `chromeLangOf` instead of its own copy of the regex.
- `types.ts`: new optional field `NoteSection.lang?`.
- `note-list.ts`:
  - New optional fields `SectionLook.lang?` and `ListItem.secLang?`. `noteItem`, `bookmarkItem` and `otherItem` set `secLang` from the section looked up.
  - `rowView` gives `titleLang = secLang` for a section bookmark with no label, which is the only row whose title is the place name.
- `annotations.tsx`:
  - The `look` index carries the section's `lang`.
  - New helper `sectionLang(sec)` = `meta.get(sec)?.lang ?? lang`. It is used by the place bar's `titleLang`, the popover's `.an-box__where` (through a `whereLang` set next to each `where`), and the two selection-bar `<b>`s.
- `book-notes-load.ts`: deviation 1.
- `tests/display-text.test.ts`, inside F6's `it`: `loadNotes(checked, null, "ko")` gives only `glossary-1` a `lang` ("en"); for "en" no section has one.

## Observations (outside F7's scope, not changed)

- **The other-language bookmark row in an English chapter.** A ko bookmark at the Glossary shows the en chapter's label "Glossary", tagged `lang="ko"` (the mark's language). This applies to every section's label in that group, not only the Glossary, and English chapters had to stay byte-identical, so I did not change it.
- **Korean section names in an English-tagged meta line.** In the Notes sheet, the meta place name inherits the sheet's `lang="en"`, so a Korean section name ("실행 채점하기") is tagged en. This is a pre-existing gap and needs `note-row.tsx`.

## Stack as run (all stopped)

- **Builds:** `scratchpad/f7/build.sh mine` and `build.sh head head`. `standalone.sh` ran them as PIDs 22207 (`:3998`) and 22211 (`:3996`).
- **Proxies:** `review/member_proxy.py` on 3995→3998 (PID 22229) and 3994→3996 (PID 22231). They sign in on the server side; the browser held only the pre-existing `csrftoken` and `kb_rail` cookies.
- **Stopped:** all four PIDs. `:3978` (3131) and `:8977` (68284) are still running. `:3030` and `:8766` were not touched.
- **Scratch data:** reading positions moved by the sweeps on reading-aids en/ko and math-check en/ko. A new-note editor was opened and closed without saving. No marks were added.
- **Claude in Chrome:** I used one tab of my own and closed it. No settings were changed.
