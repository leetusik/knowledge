# Study: arb_upbit_1's P58-pm (research) then P59-d8 (the rule v2 book) (P40-2t.R1)

`P40-2t.R1` wrote this on 2026-11-10, read-only. P58-pm is read from `arb_upbit_1/works/phases/active/P58-pm/`
(merged, `done`). P59-d8 is read from its worktree
`.claude/worktrees/P59-d8-explain_performance_rule_v2_the_bar_ever/works/phases/active/P59-d8/`; it is unmerged
and still running at about 21:12. Both phases ran on workspace v95 with plugin 0.10.0, and the critic ran as
`claude-sonnet-5-5` against an `opus` writer. Times are KST, from `slice.json`, the commit log and file times.

## The run in one line

`/knowledge:explain` was asked for "performance rule v2 with basic quant knowledge":
- The front door offered a standalone document from the code.
- The operator asked for a book, and for a phase "for information gathering, and then start the writing".
- The session created **P58-pm**, a findings-only research phase allowed to use the web with a source beside each
  finding. It ran in 37 min.
- It then showed the book's confirmation again, by hand. On "yes" it ran **P59-d8**, an explain book phase: the
  evidence, a signed outline, then **8 chapters one at a time**, each written, critiqued on a second model and
  revised.

## P58-pm: the slices and their time

| Slice | Kind, row | Ran (KST) | Span | What it did |
|---|---|---|---|---|
| intake | — | 14:53:03 | — | `create-phase`, research route, from a `Research:` block the agent had stretched: `paths:` code plus records, and a `findings-only:` line adding "the web and the standard references, every source cited beside its finding". The operator answered "tes" (read as yes) to three clarifications: web allowed with sources; run it right away; the book's confirmation after |
| DECOMP | decomposition, high | 14:53:53–14:57:52 | 4.0 min | Four independent research slices, one round; gate waived ("research phase: findings only") |
| S1–S4 | research, high, **one wave** | 14:59:03–15:19:09 | 18.8 / 15.4 / 16.0 / 20.1 min | Six topic files (~350 KB), 60 ideas, each with eight items. Wall 20.1 min against 70.3 summed |
| REVIEW | review, high | 15:19:43–15:30:06 | 10.4 min | `pass`, no findings |

Intake to done: **37 min**. The phase ran on the default stream.

## P58-pm: the operator's stops

1. The explain request, then the operator's reply to the front door's first confirmation: a book, and research
   first.
2. "tes" to the research phase's name, objective and three clarifications. Then it ran with no further stop:
   the DECOMP planned inline and the gate was waived.

## P58-pm: the checks and what they caught

- **The findings form** (its intent, written for the book's reader). Per idea:
  - a plain definition, a toy example with numbers, the formula with each symbol named, and why a strategy judge
    needs it;
  - its **sources** (title, author, section or page, URL, read date) beside each outside fact, with an
    `unsourced:` line for a claim no opened source states;
  - what the scorer does, each claim cited `<path>:L<a>-L<b>@<sha>`;
  - what the builders recorded;
  - `Not found:` lines for what nothing shows.
  - About 55 sources in all: 14, 16, 10 and 15 by slice.
- **The review checks:**
  - 596 citations machine-checked at the commit, plus about 30 by hand: none wrong;
  - every toy number re-derived through the scorer's own functions, and U10 re-scored;
  - **13 sampled source URLs** (two or more per topic) re-opened: each says what is attributed to it;
  - the topics agree on every cross-topic quantity.
- **What it caught:** each topic ends with "Findings for the review": code-versus-spec discrepancies, such as
  only line `is` being gated, and M reading the mean day × 30.4375. They were filed as three deferred jobs in
  arb_upbit_1 (D265-kj, D266-wv, D267-c1), plus input for D248-sk and D253-wp.

## P59-d8: the slices and their time

| Slice | Kind, row | Ran (KST) | Span | What it did |
|---|---|---|---|---|
| intake | — | 15:43:42 | — | Created from the book's confirmation (8 chapters; the preview had 6), "yes". A worktree, parallel mode |
| DECOMP | decomposition, high | 15:45:23–16:03:20 | 18 min | The brief; the whole-book evidence (code 61 · records 143 · gaps 36 · open 8; **151 record quotes machine-checked**); a 48 KB outline (8 chapters, 43 sections, a quiz each); S1–S8 cut **undeclared**, "run one at a time" |
| (gate) | operator | 16:03–16:38 | ≤ 35 min | The outline gate: "accept". It signs every chapter's sections, OQ1 (publish before the open points settle), Sources "the research and the code, not the papers", and about 4,500–5,500 words a chapter |
| S1–S6 | implementation, high, sequential | 16:38:07–20:42:58 | 33.3 / 36.2 / 40.1 / 43.1 / 46.3 / 44.9 min | One chapter each: span 1 writer (opus), span 2 critic (sonnet), span 3 one revision |
| S7 | same | from 20:43:08 | span 1 took 29 min (to 21:12) | Its critic was running when R1 read it |
| S8, REVIEW | todo | — | — | By this pace S8 ends near 22:15. The REVIEW publishes after that, if OQ2 allows |

From the gate to S6's end, 6 chapters took **4 h 05 min**. The whole book projects to about **5 h 40 min** of
chapters after the gate, against the DECOMP's estimate of 4–5 h.

## P59-d8: the operator's stops

1. The book's confirmation: "yes".
2. The outline gate: "accept". It also resolved OQ1.
3. **OQ2 (S1, open):** the hosted knowledge server is older than the plugin's 0.10.0 grammar.
   - It refuses `term:` links and does not validate `formula`, `glossary` or inline math.
   - So the chapters use italics in place of `term:` links.
   - The REVIEW must not publish before OQ2 is answered.
4. The acceptance gate, still to come: the operator reads the book.

## P59-d8: what the critics found (6 chapters judged)

| Chapter | Verdict | Must-fix (kinds) | Should-fix | Notes | Citations re-opened | Answered |
|---|---|---|---|---|---|---|
| 1 the-curve | revise | 2 (facts 2) | 11 | 2 | 52 of ~85 | all 15 fixed |
| 2 believing-a-backtest | revise | 3 (facts 2, reader 1) | 8 | 9 | 110 of 113 | must-fixes and C04–C10 fixed; C11 declined |
| 3 the-hurdle | **pass** | 0 | 11 | 7 | 108 of 109 | 17 fixed; C14 declined |
| 4 luck-or-edge | revise | 4 (facts 2, trace 1, coverage 1) | 7 | 4 | ~83 of ~131 | 12 fixed; 3 notes declined |
| 5 many-tries | revise | 1 (facts 1) | 7 | 5 | 46 of 118 | C01–C09 fixed; 4 notes declined |
| 6 drawdown | revise | 1 (facts 1) | 13 | 7 | 107 of 109 | all 14 fixed |
| **total** | 5 revise, 1 pass | **11** (facts 8, reader 1, trace 1, coverage 1) | **57** | **34** | | **0 disputed** |

**The kinds of finding:**
- **Must-fix.** Most are **facts**: the draft said something the code does not do. Examples:
  - the curve built from trades when a record has an `equity.csv`;
  - "the statistical legs read calendar months" when only T and S do.
  - That second one is a wording the research itself had flagged.
- **Should-fix:** spread over clarity, trace, math, order (4, all *within* a chapter: a term used before its own
  definition), reading, diagrams, quiz and reader.
- **`outside`:** 1 should-fix and 2 notes in all, and **no must-fix**.
  - Each is a gloss beyond the research's record (for example "a textbook model of returns" for Brownian
    motion), or a question of attribution.
  - So the chapters wrote web-sourced basics from P58-pm's records without importing outside claims.
- **Cross-chapter findings:** 5 of the 68 must-fix and should-fix findings, **all should-fix, no must-fix**.
  Each needed an earlier chapter's final text:
  - ch 4 C07: a recap that dropped the compounding case chapter 1 teaches;
  - ch 5 C05: a leg named "core" where chapter 4 says "S";
  - ch 2 C07: a running number (0.229, cash's month) left unexplained, which chapter 1 set up;
  - ch 3 C05: an open fix chapter 2 names as filed, which chapter 3 did not;
  - ch 6 C07: wording that differs from the words chapter 1 gave.
  - The rest is one note (ch 2 N8, an untraced gloss of a later chapter's term).

**The run's own forward channel.** Each chapter's span 3 appended to `## Notes for later slices`:
- the terms it taught;
- **corrections** to shared facts, such as "only T and S read calendar months" and "an `equity.csv` record is
  read from its marks";
- the heading ids later chapters may link to.

Later chapters read those notes. A wave loses this channel, so question (d) has to replace it.

## The output shape

- **A KB book**, kind `codebase`, slug `performance-rule-v2`, project `arb_upbit_1`, private.
  - There are 8 chapter files `book/<key>.md`; 7 are drafted, 37–59 KB each.
  - Each has **its own quiz** (one quiz block, 5 items), a glossary block, 5–10 formulas and 1–4 diagrams.
  - Each publishes as **its own chapter document** at the review. This is the "real book" of confirmed point 4.
- **The dossier** is `book/research/`: the frozen `brief.md` and `evidence.md` (73 KB), and per chapter
  `evidence-ch<k>.md`, `outline-ch<k>.md`, `trace-<key>.md` and `answers-<key>.md`. The critiques are in
  `book/critique/<key>.md`.
- **Unpublished:**
  - the chapter pages and per-chapter quizzes on production;
  - the privacy proof of the book route;
  - the real-reader read;
  - the operator's acceptance.

## What went wrong or was improvised

- **Plugin 0.10.0's research route is code-only ("never the web").** The agent stretched it: it wrote outside
  sources into the `Research:` block's `findings-only:` line and asked the operator. That was an
  operator-confirmed exception, not the route.
- **The hand-made chain:**
  - The front door's `then:` line says "only when the operator asks again". The agent rewrote it as "the
    orchestrator shows the book's one confirmation … and runs the explain phase".
  - It ran P58-pm at once, though the route says to stop after creating it.
  - After the pass it re-drafted the confirmation with P58-pm on `phases:`. The chapters went from 6 to 8,
    because "60 recorded ideas read easier as 8 chapters", which shows why the confirmation belongs after the
    research.
- **Web-sourced records in a codebase book.** The DECOMP treated P58-pm's topics as records of kind `finding`,
  and declared one book-wide gap, **G36**: "the papers behind the basics were read by P58-pm, not by this book",
  stated in every chapter.
  - The outline gate signed "Sources list the research and the code, not the papers".
  - The critics accepted this model. Their one `outside` remark on a finding was attribution only: "the record
    supports the sentence".
- **The chapters ran one at a time by rule.** The engine and the references keep explain chapters undeclared,
  so 8 chapters × about 40 min run in series, and the book is the slowest part of the whole chain.
- **OQ2, the server grammar,** is the same deploy gap as P8-x9's glossary work-around.
- **A shared runtime resource.** S1's first `uv run` created the git-ignored `.venv` in the worktree. S4–S7
  re-derived their toy numbers with `uv run` too. In a wave, the first runs would race to create it.
