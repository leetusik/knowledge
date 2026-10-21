---
status: done
tier: mid
model: sonnet
effort: high
---

# P30.F4: sweep fixes X3, X4 / OQ183 and the React 418, result

## Verdict block

- **status:** done.
- **summary:** A `#section` in a reader address now lands on its block (after hydration, a client navigation and the real sign-in return) and wins over the saved resume. A document bound as a book chapter opened by `/documents/{id}` or its loose canonical address redirects 307 to its chapter URL, keeping `?v=` and `?lang=`. The React 418 on the legacy chapter was a server/browser date mismatch in `PrintedOn`; fixed.
- **validation** (all passed):
  - `pnpm --dir web typecheck`, `lint`, `test` (383 tests, with the new `chapterRedirectHref` tests), `build`;
  - `.venv/bin/python -m pytest -q` (163 passed, 66 skipped; the new `test_detail_names_the_chapter_a_document_is_bound_as` is among them);
  - `python3 scripts/plugin_parity.py`, `python3 scripts/skills_parity.py`, `python3 scripts/workflow.py validate`.
- **files_changed:**
  - web: `web/src/components/reader/use-hash-landing.ts` (new), `web/src/components/reader/reader-frame.tsx`, `web/src/components/reader/print-client.tsx`, `web/src/lib/reader-href.ts`, `web/src/lib/knowledge/types.ts`, `web/src/app/(public)/documents/[id]/page.tsx`, `web/src/app/(public)/[org]/[project]/[slug]/page.tsx`, `web/tests/reader-href.test.ts`;
  - server: `server/documents_api.py` (+ `plugin/templates/kb/server/documents_api.py`), `tests/test_books.py` (+ `plugin/templates/kb/tests/test_books.py`);
  - notebook: `works/phases/active/P30/phase.md` (Decisions, Doc impact, Operator Questions OQ183 resolved, Notes, Now), `topics/notes-later.md`, `topics/decisions-archive.md`, `topics/doc-impact-detail.md`; this file.
- **deviations:**
  1. **A server change was needed.** The plan said to resolve the binding from existing reads. The two document detail reads carried only `canonical_path`, no book or chapter, and the reader-state reads need a bearer (an anonymous visitor has none). Search hits already carried `{book, chapter_key, lang}` from `db.chapter_bindings_for_docs`, so I added the same data as an additive `chapter: {book, chapter_key, lang} | null` to `GET /app/documents/{id}` and `GET /app/orgs/{org}/{project}/{slug}` (one indexed read each; it names only a book of the document's own project). `plugin_parity` passes.
  2. The redirect adds the variant's own `?lang=` when the link named none, so a Korean document opens its Korean variant rather than the chapter's default.
  3. I did not rebuild a pre-fix build to re-run the X3 and X4 scripts as a "before". S27 recorded the before (X3: 0 landings, X4: no redirect); here only the after was run.
  4. The hash landing was not driven on the legacy frame. The legacy reader's bridge restore already takes the hash (`hashAnchor` in `legacy-reader.tsx`); I left it alone.
- **doc_impact:** one `## Doc impact` line in `phase.md` (`frontend.md`, `api.md`); full text in `topics/doc-impact-detail.md` → *P30.F4*.

## What I changed

### X3: hash landing

- **Cause:** nothing in the reader scrolled to `location.hash`. `use-reading.ts` already stands down for a hash that names a block (the resume does not override it), but the browser's own fragment scroll loses a race with the streamed page, and a client navigation (the login form's redirect to `next`) never reaches it.
- **Fix:** `web/src/components/reader/use-hash-landing.ts`, called from `ReaderFrame` (`ready`, and `pathname|lang|version` as the place key):
  - lands the element with `scrollIntoView({ block: "start", behavior: "instant" })`, so the bar is cleared by the block's existing `scroll-margin-top` (reader.css line 370) and `html:has(.rd-root) { scroll-behavior: auto }` keeps it instant;
  - repeats at 40, 150, 400 and 900 ms and when fonts are ready, since the router resets the scroll after a client navigation and a late font shifts the layout;
  - stops at the reader's first wheel, touch, key or press, and starts again on `hashchange`;
  - calls the frame's `quiet()` so the chrome treats the jump as the reader's own, like a contents entry.
- A hash that names no element lands nowhere, and the resume still applies (checked: `#no-such-id` after a contents jump stayed at the resume).

### X4 / OQ183: bound chapters redirect

- `chapterRedirectHref(doc, {v, lang})` in `web/src/lib/reader-href.ts` builds the chapter URL through `readerHref`. It returns `null` for an unbound document, a document with no `canonical_path` (a slug-less tenant keeps its id address) and one with no `chapter`.
- `documents/[id]/page.tsx` (member branch, and the anonymous branch before the existing pretty-URL redirect) and `[org]/[project]/[slug]/page.tsx` call it after the document has been read, so a private or missing document still gets the constant not-found or the login bounce first; they `redirect()` (307). The browser carries the `#fragment`. `generateViewport` returns early for a redirecting document.
- The version page `/documents/{id}/versions/{v}` is untouched (D51).
- **Very-core test:** `web/tests/reader-href.test.ts` → `chapterRedirectHref` (bound with and without a query kept, unbound, no org). Server: `tests/test_books.py` → the detail names the chapter a document is bound as, and a loose one names none.

### React 418

- **Cause:** `PrintNotice` (the legacy page's print sheet) is rendered inside the `"use client"` `LegacyReader`. Its `PrintedOn initial={serverDate()}` (`new Date()`) therefore ran again in the browser at hydration. Whenever the server's date differs from the reader's (another time zone, or around midnight) the text differs and React throws 418. The mount effect overwrites the text with the reader's date anyway.
- **Not reproducible with matching clocks:** the first six attempts (dev and production build, signed in and out, 390 to 1440 wide, light and dark, the cookie size and theme, a finished, started and unread chapter, a bookmark, review cards) were all clean. S27 saw none either. F3's stack ran in the early hours, when the server's and the browser's dates differ in a mixed-zone setup.
- **Reproduced** by starting the dev server with `TZ=Pacific/Honolulu` (the browser stays on Asia/Seoul): "Hydration failed … `+ 21 Oct 2026` `- 20 Oct 2026`" at `PrintedOn`. After `suppressHydrationWarning` on the span: clean.
- The native reader, book page, loose document, library, review, per-book notes and `?v=1` were loaded under the same mismatch: no error. (The other callers of `PrintedOn` are server components; the client gets the server's prop.)

## Verification (production build, scratch stack)

- **Instrument:** headless Chrome over CDP (a throwaway profile, real mouse, wheel and key events, `Emulation.setDeviceMetricsOverride`), as S27 and F3 did. **Aside `u1` was not used**; no Aside claim is made.
- **Stack:** scratch API `:8931` (database `kb_f4live`, dropped, scratch `KB_ROOT`), `next start :3931` on a production build (`NEXT_PUBLIC_APP_URL` set, `KB_API_BASE_URL` overridden to the scratch API; the checked-in `.env.local` points at `:8766`), run with `TZ=Pacific/Honolulu` so the 418 would show if it came back; a dev clone `next dev :3932` in a scratchpad copy for the readable error. The fixture book (`scripts/publish_fixture_book.py`), `fixtures` made public, one member (`f4org`), S27's seed (quiz answers, highlights, review cards) and a legacy bookmark and position. `:8766` and `:3030` were never used.
- **X3 on the production build:**

  | Case | Result |
  |---|---|
  | plain link `…/all-blocks` → `…/write-lock#lock-quiz`, signed out | 5 of 5 land (`scrollY` 1524, block 75 px from the top: bar 59 + 16) |
  | same, signed in | 5 of 5; the position written is the block (`anchor_id: lock-quiz`, fraction 0.68), not 0 |
  | the real sign-in return (top-bar Sign in, form login, `next=…%23quiz-section`) | 3 of 3: `scrollY` 0 then 7142 for the next ten samples; block 72 px from the top |
  | hash with a resume saved far down (`#background` while the resume was `quiz-section`) | lands on `background`; no pill; the next load without a hash resumes at the new place with the pill |
  | the chapter opening's contents entry (`#diagrams`), same page | lands, block 72 px from the top |
  | a missing id | resume applies (as designed) |
- **X4 on the production build** (member and anonymous):
  - `/documents/1` → `/@f4org/fixtures/books/fixture-guide/all-blocks?lang=en`: "Chapter 1 of 3", Contents and Next, no Previous.
  - `/documents/4` (legacy html) → `…/legacy?lang=en`: "Chapter 3 of 3", Contents and Previous.
  - `/documents/2?v=1&lang=en` → `…/write-lock?lang=en&v=1`; `/documents/3` and `/@f4org/fixtures/write-lock-ko?v=1` → `…/write-lock?lang=ko[&v=1]`.
  - `/documents/1#quiz-section` and `/@f4org/fixtures/every-block-once#quiz-section` keep the fragment and land on the block (7142, 72 px).
  - Unchanged: the loose `/@f4org/fixture-finance/compound-growth` (anonymous: the constant 404; member: the loose reader), the private `/documents/5` (anonymous: login bounce with `next`; member: the loose reader), and `/documents/9999` (anonymous: login bounce; member: not found).
  - `curl` without a session: 307 with the right `Location` for all four chapter forms.
- **Console:** the production build logs no error, exception or CSP line on any page above; the only line is the browser's own 404 for the pages that 404, and the known "css preloaded … not used" warning.

## Cleanup

Stopped only my own PIDs (the API, the production web server, the dev clone) and dropped `kb_f4live`. Headless Chromes exit with their scenarios. `:8766` (PID 66506) and `:3030` (PID 8452) were still listening afterwards and were never touched. The scratch files are under the session scratchpad `…/scratchpad/f4/` (scenarios `x3a.mjs`, `x3b.mjs`, `x3c.mjs`, `x4.mjs`, `e418*.mjs`).

## Notebook housekeeping

`phase.md` was 39.6 KB; the S27 sweep note's long text moved to `topics/notes-later.md` (*The QA sweep's defects, as they stood in phase.md before P30.F4*) with a one-line pointer; `phase.md` is 39.0 KB after this slice.

## Notes for the review

- The legacy frame was not driven for a hash (its bridge restore handles it); a real iOS and the other browsers are not run.
- The login limiter allowed the five form sign-ins this run needed (two earlier cached-cookie reuses, then one each for three round-trips); a fourth in a row may 429 (known).
- Not done and not asked: a deferred job. Nothing outside the phase's boundary was changed.
