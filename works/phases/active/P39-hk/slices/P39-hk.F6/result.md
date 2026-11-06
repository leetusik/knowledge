# P39-hk.F6 — result

## Verdict

- **status:** done
- **route:** mid
- **model:** opus
- **effort:** medium
- **summary:** The annotation layer now names the Glossary "Glossary": `nameOf` has a `glossary` case that returns `CHAPTER.terms.glossary`. The place bar, the Notes sheet and per-book rows, and new marks' stored place name all read it. Two cases folded in from OQ23: the resume pill reads each inline `math` as its `alttext`, so it matches the contents entry; and in a Korean chapter the Glossary contents entry now carries the h2's `lang` ("en") in In this chapter and the Contents sheet. Every other name, entry and English contents list is unchanged from HEAD.
- **files_changed:** `web/src/lib/reader/notes-load.ts`, `web/src/components/reader/use-reading.ts`, `web/src/lib/reader/types.ts`, `web/src/lib/reader/load.ts`, `web/src/components/reader/chapter-head.tsx`, `web/src/components/reader/chapter-list.tsx`, `web/tests/display-text.test.ts`, this `result.md`, `phase.md` (through `phase-section`), `topics/decisions.md` and `topics/notes-for-later-slices.md` (the room-freeing moves the plan asked for, plus their relative links fixed by hand)
- **validation:** `pnpm --dir web typecheck` passed. `pnpm --dir web lint` passed. `pnpm --dir web exec vitest run` passed: 41 files, 589 tests (588 plus 1 new). The standalone `next build` in a scratch APFS clone passed (exit 0). `python3 scripts/workflow.py validate` passed (warnings only, none of them new). Acceptance matrix: 11 of 11 pass, below.
- **deviations:** (1) The byte comparisons with HEAD were made on the server-rendered HTML (curl, with nonces, chunk names and scripts normalised) and on the flight data, not in headless Chrome over CDP. The review's `:3978` already serves HEAD's code (`0162fb65`; no product commit since), so I built no HEAD copy. (2) Item 1's language sub-rule is reported, not built. The place bar (`annotation-parts.tsx`, `titleLang`) and the section-note box (`annotations.tsx`) already give each title a `lang`, but it is the chapter's. Making it the Glossary h2's would mean editing files outside the Set, so I left both and raised it as OQ25. (3) To bring `phase.md` under 38 KB I also moved two long Notes entries to their topic (F4's member-proxy recipe and S11's release gate), on top of Decisions 36–40.
- **doc_impact_added:** `**(P39-hk.F6)** qa: at the Glossary the place bar, the Notes sheet and per-book rows and a new mark read "Glossary"; the resume pill reads an inline formula as its linear text (the contents entry); a Korean chapter lists the Glossary entry with lang="en".`

## Acceptance matrix

These ran on F6's standalone build on `:3988`, against the review's API `:8977` (`kb_p39review`). HEAD is the review's `:3978`. The signed-in views went through the review's `member_proxy.py`, copies of which I ran myself: `:3985` pointing at F6 and `:3975` pointing at HEAD. The browser never held a credential. Browser checks were made in **Claude in Chrome** on the selected device `c14e5b18-…`. The 390 checks used the proxy's same-origin `/__vp` harness. Databases were read with read-only `psql` (`default_transaction_read_only=on`).

| # | Case | Result | Instrument |
|---|---|---|---|
| 1 | Place bar at the Glossary | **Pass.** `.an-place__where` reads `<b>Glossary</b>` in every case below. HEAD read `<b lang="en"></b>` (empty). | Claude in Chrome. Cases: 1728 en via `#glossary` landing; 1728 ko via In this chapter, the Contents sheet, and a tap on an entry's text (the bar is visible in the screenshot); 390 ko via the Contents sheet; 390 en via In this chapter |
| 2 | Bookmark row in the Notes sheet | **Pass.** en reads "Bookmark · Glossary". ko reads "Glossary" for the new ko bookmark and for the en one (in the other-language group). HEAD's rows were blank. | Claude in Chrome |
| 3 | Per-book notes page row | **Pass for a mark made with F6.** The new ko bookmark and the section note both read "Glossary". The pre-F6 en bookmark stays blank there, on HEAD and on F6, because this page reads only the stored snapshot (`book-notes-load.ts` passes no sections). That file is outside the Set; see OQ25 and OQ23's stored part. | Claude in Chrome |
| 4 | New Glossary bookmark's stored place name | **Pass.** `reader_bookmarks` row `e2ff9e53…` (ko, `{"block_id":"glossary"}`) has `snippet = 'Glossary'`. A bookmark keeps its place name in `snippet`; an annotation keeps it in `snapshot.block_title`. | read-only psql |
| 5 | A section note at the Glossary | **Pass.** The box's `.an-box__where` reads "Glossary". The stored row `a30f895c…` has `snapshot->>'block_title' = 'Glossary'`. | Claude in Chrome + read-only psql |
| 6 | The review's pre-F6 bookmark (`7bf7920f…`, `snippet ''`) | **Pass.** It reads "Glossary" in the live rows: the en and ko Notes sheets (`where?.label`). HEAD's row was blank. | Claude in Chrome |
| 7 | Every other section and block name, en and ko | **Pass.** I compared every `{id, word, title}` from the signed-in flight data, HEAD against F6. reading-aids en/ko: 11 each. all-blocks en/ko: 24 each. math-check en/ko: 12 each. The only difference is `glossary`, which went from `''` to `'Glossary'`. | `f6/names.py` (HTTP through the two proxies) |
| 8 | Resume pill on math-check at the math h2 | **Pass.** en: "Picked up where you left off · When e^(−λ) is near one", which equals the contents entry; HEAD read "When e−λ is near one". ko: "… · e^(−λ)가 1에 가까울 때", which equals the contents entry; HEAD read "e−λ가 1에 가까울 때". | Claude in Chrome, the same saved position loaded on both builds |
| 9 | The pill everywhere else | **Pass.** The pill read the same on both builds: reading-aids en "When nothing happens", reading-aids ko "아무 일도 없을 때", write-lock en "How it works", and the Glossary landing "Glossary". all-blocks is finished, so neither build shows a pill there. No started fixture has an h4. The h4 path runs the same `headingText` walk, and a heading with no `math` reads exactly as `textContent` did. | Claude in Chrome |
| 10 | reading-aids ko: the Glossary entry | **Pass.** In this chapter: `<a class="rd-toc__a" href="#glossary" lang="en">Glossary</a>`. Contents sheet: `<a class="rd-ch__sec" href="#glossary" lang="en">`. Every other entry is still `lang="ko"`. The wrap is `!isKorean("en")`, the same as the renderer's non-Korean wrap, and "Glossary" has no Hangul, so its markup is a bare string either way. math-check ko is the same. | SSR diff + Claude in Chrome |
| 11 | English chapters' contents | **Pass.** After normalisation the SSR DOM is byte-identical to HEAD: 0 changed lines for reading-aids en, math-check en, write-lock en/ko and all-blocks en/ko. In the English flight data the Glossary heading has no `lang` key. The two ko pages differ only on the Glossary `<a>`. | `f6/htmldiff.py` |

There were no console errors on F6's reading-aids ko or math-check ko.

## What changed

- `notes-load.ts` `nameOf`: a `case "glossary"` returning `{ word: "Section", title: CHAPTER.terms.glossary }`. No caller changed.
- `use-reading.ts`: `headingText(node)` walks the heading's nodes. A `math` element with an `alttext` reads as that `alttext`, and every other node reads as its text. `sectionTitleOf` uses it in place of `textContent`. I chose this walk over a `view.headings` lookup because it also covers h4s, which are not in `view.headings`.
- `types.ts`: `ReaderHeading.lang?`.
- `load.ts`: `headingsOf(checked, lang?)` sets `lang` on the Glossary entry only, as the renderer's `chromeLang` (`lang && !/^en\b/i.test(lang) ? "en" : undefined`). That is the same rule applied to the same value, `view.lang`, which `ReaderArticle` passes to `ChapterView` and so to the Renderer's `lang`. `chromeLang` is a private getter in `render.tsx` (outside the Set), so the rule is mirrored with a comment naming it. Where it would be `undefined`, the key is left off, so English data is unchanged. Both callers now pass the view's language (`variant.lang`, and the loose document's `lang`).
- `chapter-head.tsx` `Toc` and `chapter-list.tsx`: `lang={entry.lang ?? lang}`, and the `hangulRuns` wrap follows the same language.
- `tests/display-text.test.ts`: one new `it`: `sectionLabel(tree, "glossary-1", plainText) === "Glossary"`, `headingsOf(checked, "ko")` gives only the Glossary `lang: "en"`, and `headingsOf(checked, "en")` has no `lang` key.

## The OQ23 cases folded in (OQ23 stays open)

F6 took the two exact cases of OQ23: the resume pill's MathML tokens (cases 8 and 9) and the Glossary entry's `lang` in a Korean chapter (case 10). The stored quotes' TeX in the other-language group and on the per-book page is still the operator's to decide. It is still visible: the per-book page shows `Poisson with mean \lambda = \mathrm{rate} \times \mathrm{time}`, and so does the ko Notes sheet's English group.

## Residue → OQ25

- In a Korean chapter, the place bar (`.an-place__where b`) and the section-note box (`.an-box__where`) tag "Glossary" `lang="ko"`. The values come from `annotation-parts.tsx` (`titleLang`) and `annotations.tsx`, both outside the Set.
- On the per-book notes page, a Glossary bookmark made before F6 stays blank, because the page reads only the stored snapshot.

## Stack as run (all stopped)

- F6's standalone build: `scratchpad/f6/build.sh mine`, an APFS clone of `web/` without `.next`, then `next build`. `f6/standalone.sh mine 3988` ran it as PID 10335, using the review's `SESSION_SECRET` file and `KB_API_BASE_URL=http://127.0.0.1:8977`.
- `member_proxy.py 3985 3988` (PID 10373) and `member_proxy.py 3975 3978` (PID 10374). I ran the review's script from the `f6/` folder; it signs in on the server side and the browser never sees the cookie.
- I stopped PIDs 10335, 10373 and 10374. `:3978` (3131) and `:8977` (68284) are still running. I did not touch `:3030` or `:8766`.
- Throwaway reader data on the scratch member: a ko Glossary bookmark (`e2ff9e53…`), a ko section note on `glossary` (`a30f895c…`, "F6 throwaway section note"), and reading positions moved on reading-aids en/ko, math-check en/ko and write-lock en (now "started").
- Claude in Chrome: I used one tab of my own and closed it. I changed no Display settings. The only cookie names present were the pre-existing `csrftoken` and `kb_rail`.
- Scripts: `scratchpad/f6/htmldiff.py` and `scratchpad/f6/names.py`. The HTML captures are in `scratchpad/f6/html/`.

## Notebook

- Freed room: Decisions 36–40 and Notes 12 and 14 moved to their topics, behind gist lines, with their relative links fixed to `../slices/`. That took `phase.md` from 39,843 to 38,060 bytes; it is 38,499 after F6's entries.
- Appended: the Decisions entry *Glossary place name, pill math, entry lang (F6)*, one Doc impact line, and OQ25. `## Now` is rewritten and ends with "Next: F5 (waits on OQ24)". OQ23 is not resolved.
