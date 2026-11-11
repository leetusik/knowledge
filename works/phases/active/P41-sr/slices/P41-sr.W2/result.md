# P41-sr.W2 result

## Verdict

- status: done
- route: mid
- model: opus
- effort: medium
- summary: Listen now plays a book in the web reader, on W1's single-`<audio>` architecture and to the signed `11-listen` round `01-listen`. The slice adds chapter-aware playback with `next-waiting`, the opened player sheet (F8, F28–F30, F33) and the book landing's Listen (F31): Listen, Continue listening and Start over, the rows' "Audio …" item, and the dock on the landing's track. It also adds the kept place at Stop listening with the pill's resume form (F17), and a `/documents/[id]` seed. Verified in Claude in Chrome on `:3030`, and on the scratch production build at `localhost:3041`, which covered the 1300 / 390 / 320 viewports through the same-origin iframe harness.
- files_changed: web/src/lib/listen/{types,store,machine,actions,engine,view,format,seed}.ts, web/src/lib/listen/book.ts (new), web/src/content/listen.ts, web/src/components/listen/listen-page.tsx, web/src/components/listen/player.tsx (new), web/src/components/reader/reader-frame.tsx, web/src/components/book/{book-page,chapter-rows}.tsx, web/src/components/book/book-listen.tsx (new), web/src/app/(public)/[org]/[project]/books/[book]/page.tsx, web/src/app/(public)/[org]/[project]/books/[book]/[chapter]/page.tsx, web/src/app/(public)/[org]/[project]/[slug]/page.tsx, web/src/app/(public)/documents/[id]/page.tsx, web/src/app/reader.css, web/src/app/book.css, web/tests/listen-player.test.ts
- validation:
  - `pnpm vitest run tests/listen-player.test.ts tests/listen-relay.test.ts`: pass (13 tests, 3 new).
  - `pnpm exec tsc --noEmit`: pass (0 errors).
  - eslint on every changed TS/TSX file: pass.
  - prettier `--check` on changed TS/TSX: pass.
  - prettier on `reader.css` and `book.css` warns, but both files already warned at HEAD, so this is not new.
  - `pnpm exec next build` (scratch clone): pass.
  - Browser checks: see § Verified.
  - deferred: whole-tree (the full vitest suite, and `pnpm build` in the tree; the review runs them).
- deviations:
  1. **Engine: Chromium now takes hls.js.** Chrome's own HLS answers "maybe" for `application/vnd.apple.mpegurl`. It plays the EVENT playlist (no ENDLIST) as live and stalled at the first part boundary: a made chapter of 4 parts stopped at 0:10 with `seekable` empty, and its middle parts were never requested. The fix is in `engine.ts`: `native()` is false on a Chromium browser with MSE, and WebKit (Safari, iOS) keeps native HLS. W1 decided "native first", so this is an architectural decision, listed in the Decisions entry under `notebook`.
  2. **Phone and wide viewports used the operations doc's iframe harness on the production build, not headless Chrome over CDP.** The `resize_window` call is a no-op, the harness gives a true CSS viewport, and a headless profile would have needed its own sign-in.
  3. **Landing → reader opens each chapter in the language the Listen reads.** B1 names that language in the entry's `lang`. Before this, a row last read in Korean opened `?lang=ko` while the English audio played.
- notebook:
  - Decisions:
    - "W2: on Chromium with MSE, Listen plays through hls.js (Chrome's native HLS treats the growing EVENT playlist as live and stalls at part boundaries); WebKit keeps native HLS for the lock screen."
  - Notes for later slices:
    - "**(from P41-sr.W2, for P41-sr.X1, P41-sr.REVIEW)** Book Listen, the player sheet, the landing slot and dock, and the kept place are in. See W2 `result.md` § For X1 and the review: Chromium uses hls.js now; the dock and player title can show the landing row's variant title when the audio's language differs; speed and follow-along carry across Listens only within a page session."
  - Doc impact:
    - "frontend.md: the Listen player sheet (`player.tsx`, `pl-*`), book Listen (`lib/listen/book.ts`, chapter-relative position, `next-waiting`), the landing's Listen slot, rows' audio item and dock (`book-listen.tsx`, `.bk-dock`), and Chromium → hls.js (P41-sr.W2)."
    - "experience.md: a book can be listened to from the landing or any chapter; the player sheet (speed, follow along, chapters, Go to the text, Stop listening); Stop keeps the place and the landing and chapter offer Continue listening (P41-sr.W2)."
    - "qa.md: `listen-player.test.ts` gains 3 cases (next-waiting stall, chapter seek, kept at Stop); the PASS count of that file rises by 3 (P41-sr.W2)."
  - Operator Questions: none.
  - Now: "W2 landed book Listen, the player sheet, the landing's Listen and the kept place; X1 is next."

## Built

- **Book playback** (`lib/listen/book.ts`, `engine.ts`, `machine.ts`):
  - One playlist plays the whole book from the start chapter. Chapter boundaries and seeks come from B2's timeline (`chapterStart`, `spansOf`, `spanAt`).
  - The position is chapter-relative (`chapter` + seconds).
  - A stall within 1.5 s of a complete chapter's end becomes `next-waiting` when the next listenable chapter is not made (`stallKey`); otherwise it becomes `buffering`.
  - On a chapter change, Media Session shows the chapter as the title and the book as the album.
- **Player sheet** (`components/listen/player.tsx`, `reader.css` `pl-*`), ported from `PlayerPanel`:
  - A right-hand sheet on wide screens and a bottom sheet on phones.
  - Go to the text and Close.
  - Status or note zone.
  - Fraunces position with "of … (so far)", and the seek range.
  - Transport: previous chapter, −15, play/pause, +15, next chapter.
  - Speed (six options), the Follow along switch, and Chapters: made chapters are buttons that seek; the others show their readiness.
  - Stop listening.
  - Focus moves into the sheet and is trapped there. Escape, Close and a scrim tap close it and return focus to the dock's open button.
- **Book landing** (`book-listen.tsx`, `book-page.tsx`, `chapter-rows.tsx`, `book.css`):
  - The `.bk-listen` slot, which offers one of:
    - "Listen · 4 chapters (· about …)";
    - Continue listening "Chapter n · m:ss" with Start over;
    - the live note.
  - The rows' "Audio 1 min / Audio preparing… · part n of N / Audio not prepared yet" item, with Playing/Paused and the edge on the row being heard.
  - A fixed dock that follows the layout column below 64rem and the side column from 64rem.
- **Kept place** (`store.ts`):
  - Stop listening saves `kept: true` and keeps the place client-side.
  - The chapter head and the bottom pill offer "Continue listening · m:ss", and the landing offers "Chapter n · m:ss".
  - A new Listen clears the kept place.
- **Seeds**:
  - Chapter pages read the book key from their chapter, including `lang`.
  - The landing reads the book from chapter 1 plus the resume chapter, with hrefs mapped to the language the Listen reads.
  - `/documents/[id]` seeds from `view.write`.
- **Chapter scope** in a language that some chapters lack ends at the last listenable chapter ("Chapters 1–2" on the Korean variant).

## Verified

All checks used synthetic content (book `listening-lab`, 4 chapters, Korean variants of ch1–2, and the loose note), the scratch API on :8766 with GOOGLE and GEMINI unset, and parts made by the scratch runner.

**Claude in Chrome**: the agent's profile, `select_browser` on `c14e5b18-…`, and my own tab only. Origin `127.0.0.1:3030` (dev), `innerWidth` 960.

| Check | Result |
|---|---|
| Listen on an unmade book → `/ch1` | Preparing… · part 1 of 4, then Ready; nothing plays before the press |
| Dock Play | plays; Media Session shows the chapter and the book; follow along runs; `scrollY` stays put |
| Player open | 416 px wide, `aria-modal`, focus on Close, the trap wraps both ways |
| Escape, Close, scrim tap | sheet closes, scroll unchanged, focus on Open the player |
| Speed 1.5× | `playbackRate` 1.5 and the row reads 1.5×; carried to the next Listen in the session and saved to the position |
| Follow along off | switch `aria-checked=false`, follow stops, saved |
| Chapters list | ch2 is a button; ch3 reads "Buffering… Preparing… · part 1 of 3"; ch1 and ch4 read "Not prepared yet". The `aria-current` row is fixed by the `spanAt` fix (zero-length spans skipped; screenshot `bug-span-zero-len.jpg` from before) |
| End of ch2 with ch3 unmade | `next-waiting`: the dock reads "Preparing… · Chapter 3" and the head reads "Chapter 3 is still preparing…". After ch3 part 1 was made, it continued into "The storm" by itself |
| Go to the text from the ch2 page while ch3 plays | navigated to `/ch3` and scrolled once to the heard block |
| Dock across chapter → landing → chapter | persists. The landing row being heard shows Paused plus the teal edge; the dock sits on the layout column (160–800) |
| Stop listening (sheet, on the landing) | dock gone, focus on Continue listening, landing reads "Continue listening · Chapter 4 · 0:08"; the server shows `kept: true` |
| Chapter head after Stop | "Continue listening · 0:08 of 0:21 · Start over" |
| Pill after the head scrolls away | "Continue listening · 0:08"; the press resumes at 1.5×, follow off, `kept` false on the server |
| Continue listening (landing) | starts ch2 at 0:11 and opens `/ch2`; follow along on the heard block |
| Rows' audio items | made "Audio 1 min"; the chapter being made "Audio preparing… · part 2 of 4"; queued chapters "Audio not prepared yet" (fixed: queued chapters earlier read "preparing… part 1 of 3") |
| Korean variant `?lang=ko` | scope "Chapters 1–2"; Preparing, then Ready, then plays; dock title `lang=ko`; Media Session "등대지기의 아침 / Listening lab…" |
| Document Listen (loose note) | plays; follow along runs; document sheet without the chapter rows |
| `/documents/7` | head "Continue listening · 0:01 of 0:12 · Start over" (the seed) |
| Dark through Display | sheet and dock readable in dark (`player-doc-dark-960.jpg`); restored to System |
| Landing Start over (after the language fix) | opens `/ch1` in English, follow along on the English text |
| CSP observer (per page) | 0 violations |

**Production build** (scratch standalone, `localhost:3041`, signed in with the test account):

| Check | Result |
|---|---|
| Landing | rows' audio items render |
| Start over | through the chapter route's `loading.tsx` path, plays under it |
| Sheet | opens at 416 px, focus on Close |
| CSP | 0 violations |

**Same-origin iframe harness** (`vp-proxy` → :3041, production):

| Check | Result |
|---|---|
| 1300 × 860 | the landing dock sits exactly on the side column (118.8–502.8, the `.bk-side` box) |
| 390 × 844 | the bottom sheet is 390 wide; no overflow in the sheet; page `scrollWidth` 390 |
| 320 × 700 | landing slot 286 wide in the 320 column; dock 16.8–303.2; sheet 320 wide; nothing past 320; `scrollWidth` 320 |

**Screenshots** are in the scratch folder `w2/shots/`:
- `player-chapter-960.jpg`, `player-speed-960.jpg`, `next-waiting-960.jpg`;
- `landing-docked-960.jpg`, `player-landing-960.jpg`, `ko-dock-960.jpg`, `player-doc-dark-960.jpg`;
- `landing-dock-side-1300-prod.jpg`, `player-390-prod.jpg`, `player-320-prod.jpg`.

Audio plays were kept to a few seconds each.

## Decided as built

- The landing dock is `position: fixed` on the column's edges, not sticky.
- The player's resume-offer form is not built: no path reaches it, because the sheet only opens over a live Listen.
- Failed and unavailable chapters get no audio item on the rows.
- `aboutSum`: half-hour rounding from 45 min; below that, "about" plus the length in words.
- Left time with no estimate falls back to "under 5 min".
- `/documents/[id]` seeds from `view.write` (a member viewing a native document).
- Stop listening moves focus to the head's Continue listening, else to main.
- Continue listening from a kept chapter with no seed of its own reads the state at the press, so on iOS it may need a second tap (`tap`).
- Speed and follow along carry across Listens within a page session (the client prefs). After a full load, a resume takes them from the saved position, and a fresh Listen starts at 1× with follow along on.
- The making note's "Chapter n of 4" counts the book's chapters; the head's scope counts only listenable ones.

## For X1 and the review

- **Chromium → hls.js** (deviation 1). Safari and iOS are untested here and still use native HLS; X1 and the review should check iOS.
- **Title residual:** the landing's rows carry the variant title the reader last opened. When that differs from the Listen's language, the dock and player show that title (e.g. a Korean title over English audio) until a chapter page seeds the Listen. The href and lang are corrected; the title is not available on the landing.
- **Not exercised:**
  - the `fail-limit` and `outdated` notes on a book;
  - offline during next-waiting;
  - the landing's live note while chapters are made;
  - iOS lock screen.
- **Refused by the permission layer.** The `rm -rf` of the scratch data was denied, and I did not work around it. Please delete these paths:
  - `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/5d1a4fc9-9d70-403f-9f9d-a092c34a78a0/scratchpad/w2/webbuild` (the scratch clone);
  - `/tmp/p41w2-kbroot-IV1H` (the KB root, including the made audio parts);
  - in `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/5d1a4fc9-9d70-403f-9f9d-a092c34a78a0/scratchpad/w2/`, the secret files `acct-email.txt`, `acct-pw.txt`, `session.txt`, `vk.txt` and `pgpw.txt`.
- **Torn down:**
  - API :8766, production :3041 and harness :3043 stopped;
  - `docker rm -f -v p41-w2-pg` done;
  - the test account signed out on both origins;
  - my tab closed;
  - `:3030` (PID 8452) left running.
- Not touched: `web/.env.local`, `UPDATE_REQUIRED.md`, any other container, `package.json` or the lockfile, any server file, `csp.ts`, `proxy.ts`.
