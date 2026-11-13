# P30.S19 result: Quiz (`04-quiz` round 01)

- status: done
- tier: mid
- model: sonnet
- effort: high
- summary: The signed quiz block is built: `choice`, `recall` and `cloze` run as the chapter's one client island, graded on the client; every graded attempt is saved through a server action over `POST quiz-attempts` (the server numbers it, the first seeds S10's card); a signed-in reader sees the latest saved answer with its provenance on return, or a fresh item with the drift note; signed out gets Sign in to save once; retry, focus, keyboard and the assistive-technology lines are as drawn; the option border is the 3:1 control edge.
- files_changed: web/src/lib/reader/quiz.ts (new), web/src/lib/reader/quiz-saved.ts (new), web/src/components/reader/quiz.tsx (new), web/tests/reader-quiz.test.ts (new), web/src/lib/native/render.tsx (`quiz()`, `clozeRun()`, `QuizViewContext`), web/src/components/reader/reader-article.tsx, web/src/lib/reader/load.ts (`LoadedReader.quiz`), web/src/lib/reader/actions.ts (`saveQuizAttempt`), web/src/lib/knowledge/reader.ts (`KbQuizAttempt`, `postQuizAttempt`), web/src/app/reader.css (last block); works/phases/active/P30/phase.md, topics/{notes-later,operator-questions-decided,doc-impact-detail}.md
- validation:
  - `pnpm --dir web typecheck` PASS · `lint` PASS · `test` PASS (31 files, 282 tests; 13 new) · `build` PASS
  - `python3 scripts/plugin_parity.py` PASS · `python3 scripts/skills_parity.py` PASS · `python3 scripts/workflow.py validate` PASS (pre-existing warnings only)
  - live check (below): PASS
- deviations: none from the plan, with one reading to note: the plan says "saving the first attempt"; the signed prompt says every graded attempt is sent and the server numbers it (only the first seeds the card). I followed the signed round (OQ93). The server did not change.
- doc_impact: frontend.md, api.md: P30.S19 (one line in `phase.md`; full text `topics/doc-impact-detail.md` → *P30.S19*)

## What was built

- **Island** (`components/reader/quiz.tsx`): `QuizBlock` holds every item's state, the "X of N answered" count (kept in the head, hidden until the first grade), the one Sign in to save per view and the focus requests. The server renderer passes each item as data (`spec`: ids, the key, the accepted forms; grading is client-side) and as rendered inline Markdown (prompt, options, answer, explanation), so a link in a prompt is the reader's link and a link in an option sits above the option's button. Every status sentence is stacked in one grid cell and a button that changes label holds both, so grading moves nothing; what grows is only what the round says grows.
- **Cloze**: the renderer turns each blank into the island's input in reading order (blanks inside em/strong/del too) and moves the characters that touch a blank's end (a comma, a full stop, 을/에) into the blank's no-wrap group. Enter in a blank is Check (not during an IME composition, OQ97).
- **Rules** (`lib/reader/quiz.ts`, pure and tested): choice sets with "partly right", the cloze match (NFC, trim, case-fold, inner spaces count, an empty blank is wrong, "k of N blanks right"), recall self-grade, an empty Check (no grade, no send), Try again keeps a drift note, the foot's words, provenance and drift notes, item shape.
- **Saving**: server action `saveQuizAttempt` (strict zod body, session unsealed server-side, never throws) over `postQuizAttempt`; the client's UUID is the idempotency key; the reply's `attempt` words the line ("Saved for review" on 1, else "Saved · review keeps your first answer"); a reply lands only on the send that started it; a failed send reads "Not saved · check your connection" and is not an attempt.
- **On return** (`quiz-saved.ts`, server): the latest attempt per item from the variant read, in any language and version. A cloze answered in another language starts fresh with the language note; a changed shape (type, option ids, answer set; blank count and, in one language, accepted sets) starts fresh with the drift note, judged against the item as it was on the answer's version (read only when it is not the one on screen); otherwise graded with "Your answer from {date}[, on vN | , in {Language} vN]".
- **CSS**: transcribed from the canvas's `quiz.css`, every rule `.kb-ch`-prefixed because the prose kit's list, link and `li > * + *` rules are more specific; the option's border is `--rd-control-edge` (round 03 §1; C09), measured `#8f8676` at rest; hover, pressed and graded rings are as drawn.

## Live check

Instrument: **headless Chrome over CDP** with a throwaway profile and real mouse, keyboard and text events (`scratchpad/s19/cdp19.mjs`) for the behaviour, POSTs, console and CSP; **Aside** (`aside repl --account u1`) through the anonymous iframe harness for true 390 geometry and screenshots. Compared by screenshot against the critic's rendered `ChoiceStates.frame.png` of the signed canvas (the canvas itself needs the design tool).

Runtime: production build `next start` `:3821` and a dev clone `:3823` (opened at `localhost`) against a scratch API `:8821` (scratch `KB_ROOT`, scratch database `kb_s19live` in `kb-p28s2-pg`, migrated to `0006`, `KB_GIT_COMMIT=false`, no Gemini keys); the fixture book plus my chapter `quizlab` (every type, a six-option choice, a link in a prompt and in an option, inline code, a long option, a five-blank cloze, a one-item untitled quiz, its Korean translation, and a v2 with a changed shape); `fixtures` made public for anonymous reads.

| Check | Result |
|---|---|
| Single right / wrong, multi toggle / empty Check / partly right, recall hidden → shown → got / missed, cloze empty / typed / right / partly right / five blanks / Korean | all behave as the *Every state* table; the number is circled or struck, tags on the border, "Nothing to check yet" with its reason |
| Case, spaces, alternative; "Write  Lock" (two spaces) | wrong with "You wrote" and the accepted forms; an NFD "쓰기 잠금" matches |
| Signed in: first attempt, retry | POSTs carry `{selected / blanks / self_grade}`, version, block, item; first "Saved for review", the retry "Saved · review keeps your first answer"; database: attempts 1 and 2, one card per item seeded by the first |
| Failed save (API stopped) | "Not saved · check your connection"; the grade stands; live region says so |
| On return: same version, older version, other language, changed item | "Your answer from 20 Oct 2026", "…, on v1", "…, in English v1"; a changed answer set starts fresh with the version note; a cloze from another language starts fresh with the language note |
| Signed out | no POST; Sign in to save once under the first graded item (return address `…?lang=en#check--read-column`); Not now closes it for the view and focuses the item's Try again; a reload keeps nothing |
| Focus | Try again → first option; Show answer → the card; I got it → Try again; single choice keeps focus on the chosen option, Tab goes on to Try again |
| Keyboard | Tab moves option to option; Enter (and Space) choose or toggle; Check by Enter; graded options `aria-disabled`, still focusable; hidden status layers `aria-hidden`; one polite live region per item |
| Viewports | 390, 820, 1024, 1440: no sideways scroll (document width = viewport); margin column 37 px at 390; option key and first text line share a centre (checked after fixing a `li > * + *` margin) |
| Themes, sizes | light, slate and sepia screenshots right; size 5 at 390 (graded five-blank cloze, ellipsis in a long wrong answer, "Left empty") fits; size 1 only measured for overflow |
| Reduced motion | option transition computes to ~0 |
| Console and CSP | none on the production build (only the unrelated `/favicon.ico` 404); the dev clone shows no hydration warning; the pre-existing `scroll-behavior` warning (OQ62) is unchanged |

Not verified: print (CSS transcribed, not printed), real devices and iOS keyboard behaviour, Aside's real keyboard on the quiz (CDP events used), sizes 2 and 4, the canvas boards side by side, a refused save mid-session (401), a quiz in the iframe harness (S15's limit on writes there).

## Findings

- The prose kit's `.kb-ch li > * + *` margin pushed an option's text and tag down; fixed with `margin-top: 0` on those two (a live-check catch).
- For REVIEW: the plan's wording "first attempt only" and the prompt's "every attempt is sent" differ; the code follows the prompt (OQ93). Nothing to file.

## Residue

Scratch database `kb_s19live` in `kb-p28s2-pg`; scratch files in the session scratchpad `s19/`. The servers I started (API `:8821`, `next start` `:3821`, dev `:3823`, harnesses `:3822` and `:3824`) are stopped by PID; the standing `:3030` and `:8766` were not touched.
