# P41-sr.W2 — Book playback, the opened player and the book landing

## Goal

Finish Listen in the web reader, on W1's architecture and built to the **signed design** under **RESPECT THE
DESIGN**: never drop, simplify, restyle or "improve" an approved element, and never reshape the signed reader or book
page.

1. **Listen on a book.** A chapter's Listen is the book from that chapter: one Listen, one playlist (B2), chapters as
   seeks. That includes "next chapter still preparing" (`next-waiting`).
2. **The opened player sheet** (F8, F28–F30, F33), behind the dock's chevron (W1's `setOpenPlayer` seam).
3. **The book landing** (F31): its Listen and Continue listening, the rows' "Audio …" item, and the dock on the
   landing's track.
4. **The kept position** (F17) and the bottom pill's **resume form** ("Continue listening · 18:05").

## Read first

- The breakdown block: `phase-section P41-sr "P41-sr.W2 — Book playback, the opened player and the book landing"
  --topic breakdown`.
- `.claude/skills/design-cowork/reference/build.md`: how a build slice honours a signed round. Follow it.
- **The signed round,** job `docs/reference/design/jobs/11-listen/`, round `01-listen`:
  - `result.md` § Build, the whole of it:
    - *What to build, by part*: the opened player, the book landing, the Listen object, the Listen control's
      `form=resume`;
    - *The wiring*: landing → reader, landing or reader → player, player → page (F33, one answer), reader → landing.

    Where a page fragment and a later `F<n>` disagree, the `F<n>` wins.
  - `frame.md`, especially F2, F3, F7, F8, F9, F17, F19, F23, F25, F28–F33;
  - `pages/player/result.md` and `pages/book/result.md` → `## Build`, plus the reader fragment's resume pill
    (`pages/reader/result.md`);
  - the canvas source under `canvas/project/`: the Player and Book boards, the Dock, Listen and ListenNote, plus
    `frame.css` and `Book.css`.

  **Canvas-only parts are never built:** state bars, `Main.dc.html`, device windows, the in-canvas stand-ins (the
  player's reader behind its sheet), `PlayerData.js` and every fixture, Part 4 of `frame.css` and Part 3 of `Book.css`.
- **W1's work, which you extend and never rewrite:**
  - `slices/P41-sr.W1/result.md`: § Architecture, § Decided as built, § For W2 (the seams), and § Chrome run;
  - the code under `web/src/lib/listen/` and `web/src/components/listen/`.
- **Contracts:**
  - `slices/P41-sr.B1/result.md` § Contract:
    - the Listen key's book form `{org, project, book, from_chapter?}`;
    - State, with `entries`, `made.chapters`, `made.through`, `part.chapter`, `resume`, and the F19 keys including
      `next-waiting`;
    - Position, with `chapter` and `kept`.
  - `slices/P41-sr.B2/result.md` § Contract: one playlist across a book's entries; the timeline's per-entry chapter,
    start and length (chapter seeks come from it, never computed on the client); the playlist identity and its growth
    rule.
- `docs/current/operations.md` `## Operator Runtime`, the whole section: the instrument, the deviceId, the fixed
  window and the scratch build procedure. Note `phase-section P41-sr "Doc impact"`'s last line: how to prove "no CSP
  violation" in Claude in Chrome.

## Build

- **Books in the store and the engine.**
  - Widen W1's doc-only types (`ListenDocKey`, `ListenSeed`, `Listen.kind`, the strict `keySchema` in
    `lib/listen/actions.ts`) to B1's book key. Keep every doc path working as W1 verified it.
  - **Media Session:** title is the chapter, album is the book.
  - **A chapter seek** jumps within the one source, to the timeline's entry start.
  - **`next-waiting`:** the playing chapter ends while the next is not made. Show it as the canvas draws it, then
    continue by itself when the playlist grows. The playlist only grows (B2), so this is never a source swap.
  - **Moving between chapters.** Follow along (F12) runs only on the page of the chapter being heard; on another
    chapter's page it marks nothing. The dock stays docked across chapter and landing moves (*The wiring*).
- **The chapter page.**
  - The book chapter route, `app/(public)/[org]/[project]/books/[book]/[chapter]/page.tsx`, reads the seed beside its
    load, the way W1's document route does: signed in, native, current version, and any miss means no Listen, never a
    failed page.
  - It passes the seed to the `ListenSlot` that chapter pages already render (`lx-slot--chapter`).
  - The chapter head's Listen starts the book from this chapter.
  - The head shows the kept position as `Continue listening · 12:30 of 58:40` (F17), until a Listen starts.
- **The opened player sheet** (page `player`, its fragment whole). Register it with `setOpenPlayer`. It holds:
  - the reader's sheet container (F8), with head Go to the text and Close (wrapping);
  - the zone;
  - the position in 34 px Fraunces;
  - seek: `<input type="range">` with 5 s steps;
  - the transport grid;
  - the Speed, Follow along and Chapters rows, Chapters with readiness and the current row's 1 px accent edge (F28);
  - Stop listening;
  - the scrim as an `aria-hidden` surface (F29).

  Speed and Follow along write W1's `speed` and `follow`, which are saved and kept from one Listen to the next (F3).
  ListenNote in the player uses `act` and `tone` as F25 says (`secondary` for Update audio).
- **F33, one answer for leaving the player:**
  - Close, Escape and a tap on the scrim reveal the page under the sheet unchanged, and focus returns to the dock.
  - Go to the text goes to the reader at the Listen's chapter (or document). It scrolls once to the block being
    read (F12), or to the head at the start.
  - Stop listening ends the Listen, removes the dock, closes the sheet onto the page under it, and keeps the
    position (F17, `kept`).
  - Focus is trapped while the sheet is open, and opening it moves focus to Close.
- **The book landing** (page `book`, its fragment whole):
  - the head's `.bk-listen` slot: Listen (chapter 1), Continue listening (the saved chapter and position), Start
    over (chapter 1 · 0:00), and the kept form `Continue listening · Chapter 4 · 12:30`;
  - the rows' "Audio …" meta item (F31);
  - the playing row with the accent edge (F28);
  - the dock on the landing's track: the layout column below 64rem, the side column from 64rem;
  - on first-part-ready, one Play, which is the dock's (F25).

  `book-page.tsx` is server code and `chapter-rows.tsx` is client. Read the landing's seed in
  `app/(public)/[org]/[project]/books/[book]/page.tsx` the same way as the chapter's.
  - **Landing → reader:** pressing Listen, Continue listening, Start over or the note's Play opens the chapter with
    the Listen. A chapter row and Continue reading leave the Listen as it is.
  - A book not yet made opens the reader on Preparing… (part 1), then Ready. Nothing plays before (F9, F31).
- **The bottom pill's resume form** (`form=resume`, "Continue listening · 18:05"). It shows only once the head's
  Listen has scrolled under the top bar (reader-G5), as W1's start pill does.
- **The `/documents/[id]` route** renders `ReaderPage` for a native document, but W1 passes it no seed.
  - If the document has the org, project and stem a Listen key names, pass the seed the same way as the slug route.
  - Otherwise leave it and say why under *Decided as built*.
- **Strings:** word for word from the canvas, in `web/src/content/listen.ts` (the book copy is already there), plus
  `book.ts` and `reader.ts` only where a string belongs to them.
- **Tokens:** kb-* plus `--lx-*`. CSS goes in `reader.css`'s Listen block, or the stylesheet the book page already
  uses.
- **No new dependency.**

## Tests (tiny)

Extend `web/tests/listen-player.test.ts` with at most three cases on core behaviour:
1. a book State whose playing entry is made while the next is not maps to `next-waiting`;
2. a chapter seek resolves to the timeline entry's start;
3. Stop listening leaves `kept`, and starting a Listen clears it.

## Verification (in a browser, Claude in Chrome, by `## Operator Runtime`)

**The instrument:**
1. `list_connected_browsers`, then `select_browser` on exactly **`c14e5b18-f250-45f1-b92e-4a08a31197b5`**, before any
   other browser tool.
2. Open your own tab, drive only it, and close it at the end.

A missing tool, id or match is `needs_operator`, never another browser. Read `innerWidth` and record it. Prove "no CSP
violation" with a buffered `ReportingObserver` plus a `securitypolicyviolation` listener: `read_console_messages` does
not capture them (W1's finding).

**The stack:** rebuild W1's by its `result.md` § How to rebuild the stack. The scripts are in the scratchpad
`w1/tools/`; copy them to `w2/tools/` and extend them there.
- Postgres in a container named **`p41-w2-pg`**, on **127.0.0.1:55451**;
- the API on **:8766**, with a scratch `KB_ROOT` in the system temp directory, and `KB_LISTEN_PART_CAP_S` small so
  chapters split into several parts;
- `:3030` is the operator's: drive it, **never restart it**, and never read or edit `web/.env.local`;
- sign up the throwaway account in the agent's Chrome on `:3030`, and mind the sign-in limiter;
- **never print a key**;
- **content:** one **synthetic** native **book** of 3–4 short chapters in English, and a Korean variant of at least
  two chapters, written by you. Never use `.cache/` excerpts or private documents. Find the book publishing path from
  the server's API (B1's § Probes made "a book from chapter two");
- **audio:** act as the runner through B1's runner API, with macOS `say` clips in B2's pinned packaging and
  `segment_seconds`. Make chapter 1 and part of chapter 2, and leave chapter 3 unmade, so `next-waiting` and
  readiness show.

**Check at least these, on dev `:3030` at the agent's window width:**
- **On the landing:**
  - Listen on an unmade book: Preparing… (part 1), then Ready;
  - Listen on a made book: it opens playing;
  - Continue listening and Start over;
  - the rows' "Audio …" items and the playing row's edge;
  - the dock on the landing's track, beside the side column from 64rem (use the iframe harness if the window is
    narrower, as W1 did).
- **On a chapter:**
  - Listen starts the book from this chapter;
  - Media Session's title is the chapter and its album the book;
  - follow along runs on this chapter's page only;
  - `next-waiting` at the end of the made prefix, and continuing once you make the next part;
  - the dock persists across chapter → landing → chapter moves.
- **The player sheet:**
  - it opens from the chevron, with focus on Close and focus trapped;
  - Close, Escape and the scrim reveal the page unchanged, with focus back on the dock;
  - Go to the text goes to the chapter heard and scrolls once to the block;
  - Speed changes the rate and is kept for the next Listen;
  - Follow along toggles and is kept;
  - a Chapters row seeks, and shows readiness;
  - Stop listening removes the dock and keeps the position: the landing reads `Continue listening · Chapter n ·
    m:ss`, and the chapter head reads `… of …`;
  - a new Listen clears it.
- **The resume pill**, after the head scrolls under the top bar.
- **Korean**, on the Korean variant.
- **Dark**, through the reader's Display, restored afterwards.
- **A document Listen still works as W1 verified it:** one quick play on a loose document.

**Phone width (390 and 320):** headless Chrome over CDP, as W1 did. Check the sheet, the landing's Listen slot and
the dock at both widths.

**Production build:** the scratch standalone build on **:3041** (`## Operator Runtime`), opened as `localhost:3041`
so its cookie stays apart. Check:
- a chapter Listen plays;
- the sheet opens;
- the chapter route's `loading.tsx` path under the player;
- no CSP violation.

**Audio may play aloud. Keep each play short.**

**At the end:**
- sign the test account out in the agent's tab, then close the tab;
- stop the API and `:3041`;
- remove `p41-w2-pg` with its volume;
- delete the scratch clone, the `KB_ROOT` and the secret files. If the permission layer refuses a delete, list the
  paths in `result.md`. Never work around it.

## Validation

- `cd web && pnpm vitest run tests/listen-player.test.ts tests/listen-relay.test.ts`;
- `pnpm exec tsc --noEmit`;
- `pnpm exec eslint`, and `prettier --check`, on your changed TypeScript files;
- `pnpm exec next build` in the scratch clone (the verification above);
- `git status --porcelain --untracked-files=all`: only your set, plus this slice folder. `UPDATE_REQUIRED.md` is the
  workspace updater's, not yours.
- **Deferred: whole-tree:** the full web test, lint and build gate, and the full pytest (the review runs them).

## Set

- `web/src/components/listen/**`, `web/src/lib/listen/**`;
- `web/src/components/book/**`, `web/src/lib/book/**`;
- `web/src/components/reader/**`;
- `web/src/app/(public)/[org]/[project]/books/[book]/**`;
- `web/src/app/(public)/documents/[id]/page.tsx`;
- `web/src/app/(public)/[org]/[project]/[slug]/page.tsx`, only if the seed's shape changes;
- `web/src/content/listen.ts`, `book.ts`, `reader.ts` and `index.ts`;
- `web/src/app/reader.css`, and the stylesheet the book page already uses;
- `web/src/lib/knowledge/listen.ts`, only if a typed call is missing;
- `web/tests/listen-player.test.ts`.

**Nothing else.** In particular: no `web/package.json` or lock change, no server file, and no `csp.ts` or `proxy.ts`.

## Return

- `result.md`, with the verdict block first, then:
  - **§ Built:** what each part became, and where;
  - **§ Verified:** each check, with its instrument, origin, viewport and result;
  - **§ Decided as built:** anything the canvas left silent;
  - **§ For X1 and the review:** what the production check and the iPhone walkthrough should look at.
- Screenshots go to the scratch directory, referenced by path, with synthetic content only.
- The `notebook` field holds:
  - **Decisions:** only if you decide something architectural;
  - **Notes for later slices** `(for X1, REVIEW)`: one gist;
  - **Doc impact:** `frontend.md`, `experience.md` and `qa.md`, one line each;
  - **Operator Questions:** only a real one;
  - **Now:** one line.

## Dispatch

route=mid
reason=kind implementation rated low
subagent_type=slice-executor
model=opus
pass_model=yes
effort=medium
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
