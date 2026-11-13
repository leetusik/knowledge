- `status`: done
- `tier`: mid
- `model`: sonnet
- `effort`: high
- `summary`: Built the signed `07-book-page` round 01 as `/@{org}/{project}/books/{book}`: a server-composed page in the reader's chrome (top bar with the scroll-shown middle, head, Continue reading with its seven cases, the notes entry, Contents with the variants line and versions panel, "Clear this book's reading data" with its confirmation), the loading, not-found and failed states, the five book shapes, and member / another org / signed out. No server change. Live-checked on the production build (390, 820, 1024, 1440; light, dark, sepia; keyboard; console and CSP clean).
- `files_changed`:
  - `web/src/app/(public)/[org]/[project]/books/[book]/page.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx` (new)
  - `web/src/app/book.css` (new)
  - `web/src/components/book/book-page.tsx`, `book-frame.tsx`, `book-top.tsx`, `top-mid.tsx`, `chapter-rows.tsx`, `clear-data.tsx`, `book-states.tsx` (new)
  - `web/src/lib/book/model.ts`, `load.ts`, `view.ts`, `actions.ts` (new)
  - `web/src/content/book.ts` (new), `web/src/content/index.ts` (BOOK export)
  - `web/src/lib/knowledge/reader.ts` (`KbReaderBook` gains `continue`, `updated`, `counts`; `clearBookReaderState`)
  - `web/tests/book-model.test.ts` (new, 8 tests)
  - `works/phases/active/P30/phase.md` (sections), `topics/operator-questions-decided.md`, `topics/doc-impact-detail.md`, `topics/notes-later.md`, `topics/decisions-archive.md`
- `validation`:
  - `pnpm --dir web typecheck` pass
  - `pnpm --dir web lint` pass
  - `pnpm --dir web test` pass (371 tests; 363 before, 8 new)
  - `pnpm --dir web build` pass (route `/[org]/[project]/books/[book]` is dynamic)
  - `python3 scripts/plugin_parity.py` pass
  - `python3 scripts/skills_parity.py` pass
  - `python3 scripts/workflow.py validate` pass (existing warnings only)
  - server suite not run: the server is unchanged
  - live check: see below
- `deviations`:
  - the plan's "client island only for Clear" became three small client parts (the top bar's middle needs the head's scroll position; the Versions toggle is one-open-at-a-time across the list; Clear), because the page's drawn behaviour needs them; every other part is a server component (OQ142, OQ143);
  - the 3:1 control edge on the ghost controls, the reveal of a failed clear's alert and the top bar's plain anchors are recorded as decided (OQ140, OQ141, OQ143)
- `doc_impact`: one line appended to `phase.md` `## Doc impact` (frontend.md: `07-book-page` round 01 as the book page's design record); full lines in `topics/doc-impact-detail.md` → *P30.S23*
- `explain`/`review_verdict`/`doc_versions`/`walkthrough`: not applicable (not a review slice)

## What was built

Spec: `docs/reference/design/jobs/07-book-page/rounds/01-book-page/build-prompt.md` §§1-8, *The book shapes*, *Member, another org, signed out*, *Keyboard and accessibility*, and the canvas's `book.css` (transcribed into `web/src/app/book.css`, canvas-only rules left out). The reader's `reader.css` already held every `rd-*` class the page reuses; only the ghost button was missing, so it is defined in `book.css` scoped to `.bk-page`.

- **Route and frame.** The page lives at `books/[book]/page.tsx` beside S13's `[chapter]`. `BookFrame` is the reader's root at text size 3 (the page ignores the size setting, open question 12) with the theme from the `kb_reader` cookie, read on the server. The window scrolls; the `rd` size container wraps `<main>` only, so the sticky top bar stays outside it.
- **Reads (no server change).** `getBook` (optional identity, one constant 404), `getReaderBook` (typed with `continue`, `updated` and `counts` now), `getReaderBookNotes`, and `getDocument` / `getDocumentVersions` for the version dates, a chapter's lede and the section the reader stopped at. Optional reads fail soft; the manifest and the state read fail the page (404 is the constant not-found, anything else is the error state).
- **The rules** (`lib/book/model.ts`, tested): manifest order, the shown language, "Updated", the stale translation, the shape of the book, and `planContinue`, the §3 table (start, continue, next, finished with or without an Updated chapter).
- **Clear.** `DELETE /app/reader/state?scope=book` through a server action (`lib/book/actions.ts`), the inline two-step with focus on Cancel, Escape back to the trigger, "Clearing…" in a fixed-width button, Cancel hidden while in flight, the alert on failure, and a status line with focus on success; then `router.refresh()`.

## Live check

- **Runtime:** a scratch API on `:8871` (database `kb_s23live` in `kb-p28s2-pg`, scratch `KB_ROOT`), a pass-through proxy `:8872` that fails or slows the book read and the clear on flag files, `next start` `:3871` from the production build. Data: the fixture book, plus a "guide" (5 chapters, a Korean translation of an older English version, one chapter on v3), Tidewater (20 chapters, a description, chapter 10 on v2), `lantern`'s phases and per-slice books, two accounts in two orgs. Never `:8766` or `:3030`; every PID I started was stopped by PID and the database dropped (the standing `:3030` and `:8766` still answer).
- **Instrument:** headless Chrome over CDP with a throwaway profile (real mouse and keys, `setDeviceMetricsOverride` for true narrow viewports, emulated dark and reduced motion) for the sweep, console and CSP; Aside `aside repl --account u1` for one signed-in pass at 1440 (head, Continue, row words, the 384/640 columns). The canvas has no static render (its runtime is not in the round's tree), so the boards could not be compared by screenshot; I compared against the build prompt's numbers and the canvas stylesheet instead.
- **Viewports and themes:** 390, 820, 1024, 1440 in light, dark and sepia: nothing scrolls sideways, no inner scroller, no target under 44 px; columns 384 + 640 at 1440, 384 + 547 at 1024 (the prompt says 548, a 1 px gutter rounding), one column of 640 at 820 and 356 at 390; the h1 is 33.5 / 41.6 / 34.6 px by head width.
- **States seen:** the guide (3 of 5 finished, chapter 2 at 38%, chapter 5 Updated, a stale Korean translation, versions open), Continue as continue / next / start (the "finished" cases and a chapter at 0% are pinned by the unit test, not seen live), a native section ("You stopped at Code, 38% of the way in."), Tidewater with a description and the top bar's middle on a phone (visible after scrolling, `aria-hidden` and hidden at the top), the phases book and the per-slice book with their shape notes and "P24.S2 · Started · 22%", a legacy row with "ORIGINAL LAYOUT", signed out (head, Sign in in the bar and inline, "Start · Chapter 1", no state words, no notes entry or foot), another org (place "@s23org / knowledge", own state, foot and entry), a private book signed out and signed in from another org (the same not-found), a missing book, the tenant id as the org segment, loading (the page's shape, two columns from 64rem, no pulse under reduced motion), failed (reference shown, Try again reloads), the clear flow in full (confirm, Escape, failed, retry, clearing with a second press and Escape ignored, cleared with the rows, progress, Continue and the notes entry reset).
- **Keyboard:** Tab order (logo, Library, Continue, notes entry, rows, language links, Versions, Clear), the 2 px accent ring on every control, Enter and Space on Versions, Enter on the trigger lands on Cancel, Escape returns to the trigger.
- **Links:** the chapter's "‹ Book" and "Back to the book →" and the per-book list's "Back to the book" land on the page; "Notes in this book →" opens the list with `?from=book`; language links and "View" carry `?lang=` and `?v=`.
- **Console and CSP:** clean on every page and state. One console error appears in the failed state, the server error Next logs for a thrown render (as the chapter's). Found and fixed on the way: Next emitted an un-nonced `<script>` for the client chunks `loading.tsx` reached, which `strict-dynamic` blocked (OQ143).
- **Not verified live:** the "Finished" Continue block (both buttons), a chapter started at 0%, a Korean last-read chapter row (its language link and the shown-variant rule are checked by link and by the unit test); print; real devices (touch emulated); larger-text reflow; an all-legacy book and a legacy chapter 7 (the fixture's one legacy row was checked); sepia on every state (sepia was swept at four widths on the guide).

## Decided (details in `topics/operator-questions-decided.md` → *P30.S23*, OQ136-OQ146)

Continue's rule and percentages; shape detection; viewer rule; version dates; the 3:1 edge on the ghost controls; the failed clear's reveal; the refresh after a clear; plain anchors in the top bar; not-found's links and status; the notes entry and foot counts; the language a row opens in.

## For REVIEW

- Version rows all show the document's one publication date (server: no per-version publish date); deferred-job candidate.
- Not-found and failed answer HTTP 200 (the loading boundary has streamed), like the chapter route.
- The page has no re-read on back navigation, so old progress can show until the next request.
- Server observation carried over: Mark as unread resets only the variant's own row.
