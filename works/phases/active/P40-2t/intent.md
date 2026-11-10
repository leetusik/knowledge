# Intent — P40-2t

- Captured at: 2026-11-10T20:54:36+09:00
- Origin: operator

## Original Input (verbatim)

The operator's request (`/create-phase`, one request for three things; this phase is item 1):

> for three things:
> ---
> 1. recently, arb_upbit_1 and Note(the english) created books using knowledge:explain skill. both got no enough phase, so had to research first. but upbit created own research phase, (the arb_upbit_1 is still processing). I can't tell which is better but the two's process too different and in this way I can assure the quality. you study two cases, and suggest best way of doing that.
> 2. the books, I thought the book's chapters got it's own page and quiz. but now I can see they are just one long page. I would like to break it.
> 3. I need a AI voice reader. so that I can read a document or book at once. quiz skip.

Sent while the first look was running:

> for voice reader, find free option on the internet. I heard there are services that offer AI voice for free.

The operator's reply to the study, the suggestions and the five questions:

> 1. yes
> 2. leave it, it's fine.
> 3. should able to listen on my phone with screen off. yes, but for later documents, maybe ready for the alt text so that reader can read it instead.
> 4. ok
> 5. whatever.
> and for the voice option. I'm not only looking for free model but free api. I heard that exists. and for the models, try latest, trending, and light models.

## Confirmed Intent (refined + clarified)

Two books were recently made from subjects the workspace's records did not cover well enough: Note's
English textbook and arb_upbit_1's performance-rule-v2 book. Both had to research first, but the two
runs went very differently, so the operator cannot be sure of the quality. The operator wants **one
standard way** to do this, and agreed ("yes") to this direction:

- **Research always runs in its own phase** that only records findings. It may read the code, the web
  (a source beside each finding) or the operator's own material, such as chat transcripts. Its
  findings become that phase's records.
- **Explain writes only from records** and never researches by itself. It also accepts a subject with
  no code, once a research phase covers it. The English textbook would have gone this way.
- **One request runs both.** When the research phase passes, the explain's confirmation appears by
  itself; the operator does not have to ask again.
- **The writing keeps explain's checks:** the operator signs the outline, a critic on a second model
  checks each chapter, and every sentence traces to a record. A book always comes out as a **real
  book**, with a page and a quiz for each chapter, never one long document.
- **Faster books:** once the outline is signed, the chapters are written at the same time, not one
  by one.
- Before changing anything, the phase checks this direction against P59-d8's finished run (its
  critics' findings and its publish as a book). If that run contradicts the direction, the phase
  asks the operator before going on.

Scope: the knowledge plugin's explain skill (this repo), and the workspace's explain route, which
lives in the bootstrap template repo. As P39-hk did, the bootstrap part is delivered as a package
that the operator's bootstrap session applies and releases.

Out of scope: the English textbook itself. The operator: "leave it, it's fine."

## Clarifications Resolved

- Q: Make the arb_upbit_1 shape (a research phase, then an explain phase) the one standard way, with
  the fixes above? — A: "yes".
- Q: Item 2's long page is the English textbook (Note's doc 73, published as one document because
  P8-x9 ran as an ordinary phase). Fix it at P8-x9's acceptance gate in the Note session? — A:
  "leave it, it's fine." No work on it; no phase for item 2.
- Q: The proposed names and objectives? — A: "whatever" (accepted as proposed).

## Notes

- The study at intake (2026-11-10):

  | | Note's P8-x9 (English textbook) | arb_upbit_1's P58-pm → P59-d8 (rule v2 book) |
  |---|---|---|
  | Why it researched | explain refused: no code behind the subject | the code is covered, but the reader needed outside quant basics |
  | How it ran | one ordinary phase: corpus → 5 sort slices → merge → DECOMP2 → 6 part writers in parallel → assemble → proofread → publish | research phase P58-pm (4 findings-only slices, web allowed with sources, 37 min), then explain phase P59-d8: evidence, signed outline, chapters one at a time, each with a critic on a second model |
  | Quality checks | its own: 342 quotes checked against the corpus, one fresh-eyes proofread | explain's: sentence trace, a critic per chapter, the outline gate |
  | Output | one 129 KB native document (doc 73), one 20-question quiz at the end | a KB book: 8 chapter files, a quiz per chapter (not yet published at intake) |
  | Time | ~3 h (14:55 → acceptance gate 17:48) | research 37 min; book from 15:44, on chapter 7 of 8 at ~20:50 |

- Why they differ: the explain plugin (0.10.0, P39-hk) is codebase-only and does no research of its
  own. Its "research first" offer was meant for code no phase recorded; P58-pm stretched it to web
  research, and the agent chained the book by hand. The English textbook had no code, so explain
  refused it and the session improvised an ordinary phase.
- Records to study: `../Note/.claude/worktrees/P8-x9-english_textbook_from_my_own_words/workflow/works/phases/active/P8-x9/`
  (its branch is not merged yet); `../arb_upbit_1/works/phases/active/P58-pm/`; P59-d8 in
  `../arb_upbit_1/.claude/worktrees/P59-d8-explain_performance_rule_v2_the_bar_ever/` until it merges.
- No book is published on production yet, so P59-d8's publish is the first live test of the
  reader's chapter pages.
