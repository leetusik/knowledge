# P39-hk.F4 result: the Glossary in the contents, linear text for math on text-only surfaces, D80-ch's line

## Verdict

- **status:** done
- **route:** high
- **model:** opus
- **effort:** xhigh
- **summary:** "In this chapter" and the Contents sheet now list the generated Glossary h2 at the glossary block's place, with the renderer's id and word (OQ16). Every text-only surface the plan named now shows inline math as S8's linear text, through one new server-only flattener (`display-text.ts`) and one exact quote mapper (`shownQuote`). The surfaces are the contents, library and book Continue, note place names, a citation's way back, and highlight quotes in the reader's lists, the overlap chooser and the Review card. Heading ids, the anchor projection and stored anchors are unchanged (OQ10). The KB template page's file-fallback sentence is now true of the skill (D80-ch). I swept it in Claude in Chrome against HEAD, en and ko, on the production build and dev.
- **files_changed:**
  - `web/src/lib/native/display-text.ts` (new, `server-only`): `displayText`, `quoteBasis`, `displayQuote`
  - `web/src/lib/reader/load.ts`: `headingsOf` (display text; the Glossary entry; exported for the test)
  - `web/src/lib/library/continue.ts`: `sectionTitle` (display text)
  - `web/src/lib/reader/notes-load.ts`: `nameOf`/`noteSections` (display text); `sectionLabel` (new export, for the Review card)
  - `web/src/lib/native/cites.ts`: the way back's `section` (display text)
  - `web/src/lib/reader/note-list.ts`: `QuoteAtom`, `shownQuote`, `BuildOptions.shown`
  - `web/src/components/reader/annotations.tsx`: the page's formula atoms, the `shown` quotes, the overlap chooser
  - `web/src/lib/review/actions.ts`: highlight cards' quote and stored place name mapped on the server
  - `plugin/templates/kb/docs/getting-started/{{KB_DATE}}-how-your-knowledge-base-works.md`: the one sentence
  - `web/tests/display-text.test.ts` (new, 3 tests)
  - `works/phases/active/P39-hk/phase.md`, through `phase-section` only
  - `works/phases/active/P39-hk/topics/decisions.md` and `topics/notes-for-later-slices.md`: written by `--to-topic`, plus the moved entries' links fixed by hand, as the plan asks
  - this `result.md`
- **validation:**
  - `pnpm --dir web typecheck`: pass. `pnpm --dir web lint`: pass. Both were re-run on the final tree.
  - `pnpm --dir web exec vitest run`: pass, 41 files, **588 tests** (585 + 3).
  - `reader-anchor.test.ts` is unchanged and green. `git diff` is empty for `project.ts`, `anchor.ts`, `parse.ts`, `reader-anchor.test.ts`, `tests/fixtures/` and `server/`.
  - `uv run pytest -q`: not run, since no Python was touched.
  - `.venv/bin/python scripts/plugin_parity.py`: PASS. The template page is `template_only`, so it has no copy to check.
  - `python3 scripts/skills_parity.py`: PASS.
  - Standalone `next build` in a scratch APFS clone: pass for HEAD and for F4. Both were served from `.next/standalone`.
  - `python3 scripts/workflow.py validate`: passed. Its warnings are pre-existing (old slice kinds, consolidation debt, stale docs, oversized doc sections), and none is P39-hk's.
  - **Live sweep: run.** Instrument: Claude in Chrome. I called `list_connected_browsers` (one browser, deviceId `c14e5b18-f250-45f1-b92e-4a08a31197b5`) and `select_browser` on it before any other browser tool. Details in § *Live sweep*.
- **deviations:** nine, each small and listed with its reason in § *Deviations*:
  - the Glossary entry's `lang` follows the list's (OQ23);
  - the Review card's stored place name is relabelled when it is exactly the TeX label;
  - new snapshots' `block_title` carries the display label;
  - one read per document in Review, without `getBook`;
  - `headingsOf` is exported;
  - a third tiny test;
  - the book page's "You stopped at" is fixed by the same function;
  - phase.md was trimmed with `--to-topic`;
  - the instrument split.
- **doc_impact:** `- **(P39-hk.F4)** product.md, architecture.md: the contents list the Glossary h2 at its place; text-only surfaces (the contents, Continue, note place names and new snapshots' `block_title`, a citation's way back, highlight quotes in the reader's lists and on the Review card) show inline math as linear text (`display-text.ts`, `shownQuote`); the KB template page says an API-down publish keeps the draft and writes nothing to the project. qa.md: web suite 588 (+3, `display-text.test.ts`).`
- **operator_need:** none.

## What was built, rule by rule

**Rule 1 (OQ16): list the Glossary.**
- `headingsOf` (`load.ts`) mirrors the renderer exactly. The renderer draws the Glossary h2 (`render.tsx` `glossary(id)`) only in a native chapter that is not refused, from the non-refused blocks, and only when `planTerms` finds an entry.
- Where it does, `headingsOf` lists `{id: block.id ?? "glossary", level: 2, text: CHAPTER.terms.glossary}` at the block's place among the headings.
- **The threshold:** the Glossary counts toward the Toc's two-h2 threshold like any h2, so a chapter with one author h2 and a glossary now shows "In this chapter". This is recorded in the Decisions entry.
- Nothing else about either list changed:
  - the Toc and the sheet render it through their existing entry markup (`chapter-head.tsx` and `chapter-list.tsx` are untouched);
  - `curH2` needed no change, because section tracking already measured the Glossary h2 (`.rd-article :is(h2, h3)[id]`) and returned null only because the id was not in `headings`;
  - the sheet's tap-to-close comes from `onSection` as for every entry.
- `reader-frame.tsx` is untouched.

**Rule 2 (OQ10): linear text, display only.**
- `display-text.ts` (`server-only`) holds `displayText(nodes)`: `plainText`'s walk, with each `math` node as `linearTex(tex) ?? tex`.
- It is used in:
  - `headingsOf`: "In this chapter" and the Contents sheet;
  - `sectionTitle`: library Continue, and the book page's "You stopped at", which uses the same function (`lib/book/load.ts`);
  - `nameOf` and `noteSections`: note place names, including figure, quiz and diagram names built from captions and prompts (`words()`), and the Sources heading;
  - `planCitations`: a citation's back-link `aria-label`.
- `plainText`, `inlineText`, `project.ts` and `anchor.ts` are untouched. Heading ids still come from `headingSlug(plainText(content))`.
- Every importer of a changed server module stays server-side:
  - `cites.ts` is imported only by `render.tsx` and a test;
  - `note-list.ts` imports nothing server-only;
  - both standalone builds passed.

**Rule 3 (OQ10): the quotes, mapped only where exact.**
- **One mapper, `shownQuote`** (`note-list.ts`, pure, shared by the client and the server). It takes:
  - the section's projected text, as code points;
  - the highlight's own `[start, end)` and its stored `exact`;
  - the section's formula atoms `{at, len, alt}`.

  It replaces each formula wholly inside the range with its linear text and copies everything else verbatim, a bare citation's atom included.

  It returns null, so the stored quote shows, in four cases:
  - the text at those offsets is not the stored quote;
  - an offset falls inside a formula;
  - atoms overlap;
  - no formula is in the quote.

  It never searches the string.
- **In the reader** (`annotations.tsx`):
  - Once the layer has its host, it reads the page's atoms in a frame: `math.ra-m` elements with `data-an-len`, in the containers the self-check keeps (`verified(segments(root))`), each at `data-base` + its unit offset, with its `alttext`.
  - It builds a `shown` map for exactly the highlights the page paints (kind `hl`, `anchored`, not `stored`).
  - The Notes sheet's rows get the map through `buildGroups`'s new `shown` option, and the overlap chooser uses it too.
  - A chapter without a formula finds no atom and sets no state, so nothing changes there.
- **On the Review card** (`actions.ts`, `"use server"`):
  - The card payload carries `front.anchor` (`block_id`, `start`, `end`), which the server resolves on `where.version`, the document's current version.
  - For each highlight card, the action reads the card's document once per distinct document in the call:
    - with `getDocument` when `where.href` is `/documents/<id>`;
    - otherwise with `resolveDocument(where.org, where.project, <slug of where.doc>)`.
  - It checks the document's project, its stem (`docStem`) and its version against the card, validates the chapter, builds `quoteBasis(tree)`, and maps the quote with `shownQuote`.
  - Any miss or fault keeps the card as it came.
  - The same card's stored place name (`front.block_title`, `where.block_title`) is replaced by today's display label only when it equals, exactly, the label the same tree gives with `plainText`. That is the TeX label a snapshot stored before F4 (`notes-load.ts` `sectionLabel`).
  - `rateReviewCard`'s `next` card goes through the same path.
  - No Python, API or stored-data change was needed, so no OQ was owed for the Review card.

**Rule 4 (D80-ch).** Only the sentence changed (L39–41, re-wrapped into four lines):

> None of these needs the others to be running to work. If the API is down, the explainer is not published, but its draft is kept so you can publish it later, and nothing is written into your project. If you never publish the site, it still runs on your own machine.

This follows §6 (no file fallback; the publish fails; the draft is kept for the same publish later) and §7 (nothing written into the project). The setup skill and the page's other lines are untouched.

## The brief's lines, verified

- **Toc and Contents.** `headingsOf` is at L186–202 (HEAD), as the brief said, and so are the Toc (`chapter-head.tsx`, shown at `h2s >= 2`, L106), `secs`/`curH2` (L387–396) and `ChapterList` (L790–801). `glossary(id)` is at L1219–1231. The brief left out two conditions, now mirrored in `headingsOf`:
  - the h2 renders only when the terms plan holds an entry;
  - a refused block is not drawn.
- **Continue.** `sectionTitle` is at L76–84, as the brief said. The brief missed its second consumer, `lib/book/load.ts` (the book page's "You stopped at …"), which is fixed with it.
- **Notes place names.**
  - `nameOf` (L82–121; the heading at L89), `noteSections` (heading at L129), `sectionLabel` and `snapshotOf` match the brief.
  - Missed by the brief: `words()`, which flattens captions, prompts and readings through `plainText`. It now goes through the flattener too.
- **A highlight's quote in the reader.**
  - `note-list.ts` L115 and `annotations.tsx` L2342 (the overlap chooser) match the brief.
  - `note-row.tsx` L75 renders `v.quote` from the list, not `quote.exact`, so it needed no change.
  - `annotations.tsx` L2215–2217 is `markList`, the Text changed and other-language boxes. Those cannot be mapped exactly and stay stored.
- **A citation's way back.** `cites.ts` L86–88 and the `aria-label` at `render.tsx` L1834 match the brief.
- **The Review card.**
  - `front.quote` is `ann.quote.exact` (`review.py` L554–556).
  - The payload also carries `front.anchor` and `front.context`, which `HighlightFront` does not declare.
  - `where` has no document id: `where.doc` is the `<date>-<slug>` stem and `where.version` is the current version.
  - `linearCard` skips non-quiz cards (L80).
- **Not in the brief:** the resume pill ("Picked up where you left off · …", `use-reading.ts` `sectionTitleOf`) reads the h2's `textContent`. That gives the MathML tokens ("e−λ"), not TeX, and HEAD and F4 show the same. The file is outside the Set, so this goes to OQ23.

## Reproduced on HEAD

**The scratch chapter.** The fixture has no math in a heading, so `math-heads` is a copy of `reading-aids`, made in the scratch area only (`f4/make_chapter.py`; the repo's fixtures are untouched):
- en: its third h2 is `## When $`e^{-\lambda}`$ is near one`. It has no authored id, so the id `when-e-lambda-is-near-one` is the slug of its plain text.
- ko: the h2 is `## $`e^{-\lambda}`$가 1에 가까울 때 {#when-e-lambda-is-near-one}`, `translated_from en@1`.
- Both have a bare citation `[1](#src-rule)` in the paragraph under that h2.
- They are published as chapter 5 of the fixture book on my scratch API.

**Seeded data.** By HTTP as the throwaway member (`seed.py`, `seed2.py`):
- highlights across a formula, across two formulas and a citation, with no math, a Korean one, and one that overlaps a formula highlight's plain words;
- "Review this" on for three of them;
- a reading position at the `poisson` block.

HEAD's standalone build shows raw TeX on every surface: the Toc and the sheet (`When e^{-\lambda} is near one`), library Continue, the book page, note place names, notes-row quotes, the overlap chooser, the citation's `aria-label` and the Review card's quote and place name. The Glossary is in neither list.

## Live sweep

**Instruments:**
- **Claude in Chrome** on the agent profile. The window is fixed at 1728×963 (DPR 1, `innerWidth` read first).
  - It drove real clicks, a real drag-select, Escape and wheel scrolls.
  - Page JS was used to read and measure. The identity hashes and the width matrix also used JS to click the sheet's own buttons and to set the root font size (F3's method).
- **True 390 and 320 viewports** came from S8's same-origin harness (`vp_proxy.py`), pointed at the standalone builds, in the same tab.
- **Signed-in checks used no credential in the browser.**
  - `f4/member_proxy.py` signs the throwaway member in by script (the BFF's `/api/auth/login`), adds the session cookie to each proxied request, and strips any session `Set-Cookie` from responses.
  - The browser only ever held what HEAD's own pages set. Its Cookie header is reduced to `kb_reader`.
  - It hydrates on a standalone build, not on `next dev`: the HMR websocket is not proxied, as `## Operator Runtime` already notes for the harness.
- There was no WebKit, no real phone and no screen reader.

**HEAD vs F4, the same member session (standalone :3948 vs :3949):**

| Surface | HEAD | F4 |
|---|---|---|
| "In this chapter" (en) | Scoring a run · Counting the trials · `When e^{-\lambda} is near one` · Sources | … · **When e^(−λ) is near one** · **Glossary** · Sources (`#glossary`) |
| "In this chapter" (ko) | … · `e^{-\lambda}가 1에 가까울 때` · Sources | … · **e^(−λ)가 1에 가까울 때** · **Glossary** · Sources |
| Contents sheet (en, ko) | TeX, no Glossary | linear text, Glossary at its place; the mark follows (see below) |
| Library Continue | Left off at `When e^{-\lambda} is near one` · 55% | Left off at **When e^(−λ) is near one** · 55% (also on dev) |
| Book page | You stopped at `When e^{-\lambda} is near one` | You stopped at **When e^(−λ) is near one** |
| Note place name (rows, popover `where`) | `When e^{-\lambda} is near one` | **When e^(−λ) is near one**; ko **e^(−λ)가 1에 가까울 때** |
| Notes-row quote | `Poisson with mean \lambda = \mathrm{rate} \times \mathrm{time}` | **Poisson with mean λ = rate × time** |
| Notes-row quote, two formulas and a citation | `\lambda = … 1, and no event at all has probability e^{-\lambda}` | **λ = rate × time 1, and no event at all has probability e^(−λ)** (the citation's atom stays its stored "1") |
| Notes-row quote (ko) | `평균 \lambda = … \mathrm{time}인 포아송 분포를` | **평균 λ = rate × time인 포아송 분포를** |
| Overlap chooser | `Poisson with mean \lambda = …` | **Poisson with mean λ = rate × time**; the no-math pick unchanged |
| Citation's back link `aria-label` (en, ko) | Back to the text, in “When e^{-\lambda} is near one” | … in “**When e^(−λ) is near one**” / “**e^(−λ)가 1에 가까울 때**” |
| Review highlight card (queue read) | quote and place in TeX | quote **Poisson with mean λ = rate × time**; title and "Section “…”" **When e^(−λ) is near one** |
| Review, via "Got it" (`rateReviewCard`'s `next`) | n/a | the no-math card unchanged; the ko card **평균 λ = rate × time인 포아송 분포를**, **e^(−λ)가 1에 가까울 때** |

**OQ16 behaviour (F4):**
- **Desktop, en.** The sheet's Glossary link lands on `#glossary`, with the h2 at 72 px under the 59 px top bar, and closes the sheet.
- **The current-section mark.** On reopening, the mark (`aria-current="location"`) sits on Glossary. It stays there at the chapter's end, because the Sources h2 cannot reach the line (on HEAD nothing is marked there). It moves back to the section above when that section's h2 is below the line. The chapter is "Counting the trials" while the math h2's top is at 262 px.
- **390 (harness).** The tap on Glossary closes the sheet and lands on the h2 at 72 px; `scrollWidth` is 390.
- **Dev, direct, anonymous (ko).** The Toc and the sheet show linear text and the Glossary; the tap lands and closes; no console error.

**IDs and anchors:**
- **The h2 ids are identical** in HEAD and F4, on both chapters: `scoring-a-run`, `counting-the-trials`, `when-e-lambda-is-near-one`, `glossary`, `sources-list`.
- **The math-heads article matches HEAD byte for byte** once the citation `aria-label` is normalized (FNV `d3f1e211:42213` in both).
- **The round trip.** I made two highlights in the browser on F4: "computes s = mean ÷ sd and" (en) and "이벤트가 하나도 없을 확률은 e^{−λ}입니다" (ko, Review on). Reading the API back (`readback.py`), every stored quote is the projection's slice at its offsets, TeX verbatim, `anchored`. After a reload each paints on the same words.
- **The new ko highlight's snapshot `block_title`** is `e^(−λ)가 1에 가까울 때`, the display label (Decisions entry). The snapshot's shape is unchanged.

**Identity (HEAD vs F4, FNV hash and length of the outer HTML, same member session):**

| Page | `.kb-ch` | "In this chapter" | Sheet list | Notes rows |
|---|---|---|---|---|
| write-lock en | `c8adf849:10396` both | identical | `b00dc799:1660` both | `bc9b6680:462` both (one no-math highlight) |
| write-lock ko | `15f46713:9918` both | `4cd5b4bc:397` both | `665669ed:1653` both | `d9a2237:454` both |
| all-blocks en | `6b334675:49357` both | `dfaf916d:984` both | `8a8af908:1656` both | none |
| reading-aids en | `a7d68d81:41629` both | only "Glossary" added (between "When nothing happens" and "Sources"), same entry markup | same | none |

**F1–F3.**
- This slice touches none of F1–F3's files. Theirs: `render.tsx`, `reader-aids.css`, `kb-print.css`, `formula-box.tsx`, `math-layer.tsx`, `scroll-box.tsx`, `reader.css`, `book.css`, `kb-docview.css`, `native-terms.test.ts`.
- The chapter article is byte-identical to HEAD on reading-aids, write-lock and all-blocks, so their article-level matrices hold.
- The one layout this slice changes is the contents lists: shorter heading text, plus one entry. So I re-ran F3's page-width bar in the harness on reading-aids and math-heads, en and ko, at 320 and 390 × 100%, 150% and 200%. `scrollWidth` equals the viewport in all 24 cases.
- With the sheet open at 320/200%, F4's entries fit (141/141). The sheet scrolls 3 px (323/320) from a `button.rd-btn` in its header. That is identical on HEAD, write-lock included, so it predates F4 (OQ21's 320/200% territory).
- Paper is unaffected: `.rd-head` (with "In this chapter") never prints.

**Console and logs:**
- No console errors on F4's standalone or on dev.
- No `error` or `exception` lines in the standalone or dev server logs.
- The API log shows no 4xx or 5xx except the fixture publisher's own existence check (404).
- The dev proxy logged connection resets from the unproxied HMR websocket.

## Left as stored (OQ23)

Each of these is outside F4's Set or cannot be mapped exactly from what the surface holds:
- **The other language's group in the Notes sheet.** Its offsets are in the other variant's text, which is not on the page. The same goes for the Text changed and Unanchored rows.
- **The book's notes list** (`book-notes-load.ts`) shows stored quotes. Its place names come from snapshots, so a highlight saved after F4 has a linear one and a pre-F4 one keeps its TeX.
- **The resume pill** reads the h2's MathML tokens ("e−λ"; `use-reading.ts`).
- **The Glossary entry's `lang` in a Korean chapter.**
  - It takes the lists' `lang="ko"`, as every entry does, including the author's English "Sources" on HEAD. Its h2 carries `lang="en"`.
  - A per-entry `lang` needs `types.ts` (`ReaderHeading.lang?`), `chapter-head.tsx` and `chapter-list.tsx`, all outside the Set.
  - I read the rule's "in `chromeLang`" as the English word with the lists' existing markup, which "Nothing else about either list changes" and the Set support.

Recommended to the review: one deferred job. I appended this as OQ23.

## Stack as run

All of it ran on scratch ports. The scripts are under `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/aba4c78e-665c-427a-9abd-276457679f2d/scratchpad/f4/`.

- **API:**
  - The database `kb_p39f4live` was created in `kb-p28s2-pg` (:55432) and migrated with alembic.
  - It ran on `:8947` (`api.sh`), with a scratch `KB_ROOT`, no Google or Gemini keys, `KB_GIT_COMMIT=false` and `KB_STARTUP_REINDEX=false`.
- **Member:** `setup.py` makes a throwaway signup, `p39f4-member@example.com`, with an org key and slug `p39f4`. Its credentials are only in `setup.json` and were never printed.
- **Data:**
  - `publish.py` runs `scripts/publish_fixture_book.py` and makes `fixtures` and `fixture-finance` public. The ids on fresh state match S8's.
  - `make_chapter.py` and `publish_math.py` add `math-heads` en and ko (doc ids 8 and 9, chapter 5).
  - `seed.py` and `seed2.py` add the highlights; `position.py` sets the reading position.
- **Builds:** `build.sh head` was cloned before any edit and `build.sh mine` after. Each is an APFS clone of `web/` without `.next`, then `next build`. `standalone.sh <build> <port>` served HEAD on `:3948` and F4 on `:3949`.
- **Dev:** `dev.sh` runs `next dev` on `:3947` from the worktree's `web/`, against `:8947`, with a throwaway secret.
- **Proxies:**
  - signed-in: `member_proxy.py` 3945→3948 (HEAD), 3946→3949 (F4), 3942→3947 (dev);
  - anonymous harness: `vp_proxy.py` 3943→3948, 3944→3949.
- **Reader URL:** `/@p39f4/fixtures/books/fixture-guide/math-heads?lang=en|ko`. The Review card is at `/review`.
- **Cleanup:**
  - I stopped exactly the processes I started:
    - API 96588;
    - HEAD standalone 96819 and F4 standalone 97664;
    - member proxies 96846, 97680 and 98316;
    - harness proxies 97699 and 97695;
    - dev 98281, 98288 and 98294, with its workers.
  - I dropped `kb_p39f4live` and closed my tab. The MCP group was removed.
  - My `rm` of the scratch build clones (`f4/head`, `f4/mine`) and `f4/root` was denied, so they remain in the scratchpad.
  - I set no cookie on the profile. The extension cannot read cookies, so any host-wide 127.0.0.1 cookie a page set (for example dev's HMR hash) was left alone, as S9 did.
  - `:3030` (8452) and `:8766` (80074), and the review's walk stack `:8977` (68284) and `:3978` (68294), were never touched, and all were still listening at the end. Nothing was read from or written to `:8977`.

## Deviations, with reasons

1. **The Glossary entry's `lang`.** It follows the list's language rather than the h2's `lang="en"` (above, OQ23). The alternative needs three files outside the Set. The lists already mark the author's English "Sources" the same way.
2. **The Review card's stored place name.** It is relabelled only when it equals, exactly, the TeX label the same tree gives. It is the same card and the same rule (text from inline nodes holding math), the document is already read for the quote, and it costs nothing. Display only.
3. **New snapshots carry the display label as `block_title`.** This follows from rule 2's `nameOf`: `snapshotOf` stores the reader's `sectionLabel`. Its shape is unchanged. Every reader of `block_title` is a display surface (the Review card, the book's notes list, the Unanchored meta; the server only stores and returns it), so those now show linear text for new highlights.
4. **The Review document read.** It uses `getDocument` (by the href's id) or `resolveDocument` (by the stem's slug), checked against the card's project, stem and version. This avoids a `getBook` read per book, so each distinct document costs exactly one read.
5. **`headingsOf` is exported** from `load.ts`, so the core test reads the real list rather than a copy of it.
6. **A third test case**, beyond the plan's two: the exact quote mapping. A whole formula is mapped; the word "n" next to the formula `n` is left alone; an offset inside a formula, or text that is not the stored quote, gives null. That is the rule's core ("never search the string"), and the case is one `it` of a few lines.
7. **The book page's "You stopped at …"** is fixed by the same `sectionTitle`. No extra file.
8. **The notebook.** Following the plan:
   - I moved 13 older Decisions to `topics/decisions.md` (entries 1–4, 19, 27–29, 31–35, default gists) and 3 REVIEW notes to `topics/notes-for-later-slices.md` (S8, S9, F1–F3, with short gists that state each note).
   - I fixed their relative links by hand: `../slices/…`, plus sibling topics.
   - phase.md ends at 38,570 of 40,960 B, about 2.4 KB free for the review.
9. **Instruments.**
   - Member surfaces were checked on the production build through the signed-in proxy. Through a proxy, dev does not hydrate (no HMR socket), so dev was checked by its server render through the proxy (library Continue, the Toc) and directly, anonymously, for the sheet.
   - Identity hashes and the width matrix used page JS, including JS clicks on the sheet's own buttons. Interaction checks used real clicks, a drag, keys and scrolls.

## Notebook (written through `phase-section`; the slice ran alone)

- **Decisions:** "Contents and text-only math (F4)" appended (506 B). 13 older entries were moved to `topics/decisions.md`.
- **Doc impact:** the one line above, appended.
- **Operator Questions:** OQ23 appended: what F4 left as TeX; recommended one deferred job.
- **Notes for later slices:**
  - "(from F4, for REVIEW)" appended: the signed-in proxy, the math-heading chapter and the seeds.
  - 3 older REVIEW notes were moved behind pointers.
  - None was tagged for F4, so none was consumed.
- **Now:** rewritten: F4's landing, OQ23, "Next: REVIEW round 2 (the acceptance gate)".
