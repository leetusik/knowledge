# P40-2t — the route text today, against the confirmed intent

`P40-2t.DECOMP` wrote this on 2026-11-10. It lists where the current text says something the confirmed
intent (`intent.md`, *Confirmed Intent*) changes, so that R1 starts its change list from known places
instead of re-reading everything. It is a map, not the change list: R1 decides what changes and how.

Line numbers drift: re-find each passage by its heading (`grep -n '^#'`). They are taken at:

- the plugin: this branch at `2f5facda`, `plugin/skills/explain/SKILL.md` (0.10.0, 156 KB);
- the payload: the bootstrap repo at `fdb1151` (v95), under `payload/claude/skills/` and `payload/scripts/workflow.py`.

## Point 1: research runs in its own findings-only phase, from code, the web (sourced) or the operator's material

- **Payload, `create-phase/SKILL.md` *The research route*** (L225 on): the block's `question:` line is code-only
  ("what does this code do, and why is it built this way"). *What that `DECOMP` will cut* (L243) says each research
  slice reads "this repository only ... never the web". Its findings form is code-only too: `<path>:L<a>-L<b>@<sha>`
  citations, with `Not found:` lines for what the code does not show.
- **Plugin, §1 *The phases that cover the subject*** (L231–264): the research block is offered only when "the code is
  there, but no phase built or recorded it". Its `findings-only:` line says "it reads the code".
- Nothing in either place names the web (with a source beside each finding) or the operator's own material, nor any
  privacy rule for that material. This is question **(a)**. The model the plan names is P8-x9's own rules: only the
  operator's own words, no secrets, pastes left out.

## Point 2: explain writes only from records, and accepts a subject with no code once a research phase covers it

- **Plugin:**
  - the frontmatter `description` ("Codebase-only ... a subject with no code in this repo is declined");
  - the intro (L15–17);
  - §1 MODE, *No code behind it* (L136–142: decline);
  - §1 *A book* (L179–180: "A book about a subject with no code behind it is declined");
  - the front door's step 3, *Refuse early* (L296–297);
  - §9.2 "A book is a **codebase book**" (L1886);
  - the card's *The evidence* and §3.4 D1 (L888 on): "the code at one commit and the records ... Nothing else is
    evidence: no web page or search result".
- **Payload, `create-phase/SKILL.md` *The explain route*:**
  - the intro (L131: "A subject with no code behind it is declined");
  - the refusal list (L135);
  - the `subject` field ("a topic of this repository's code");
  - `book`, "kind `codebase`" (L143);
  - L157 ("every subject is this repository's code");
  - *A confirmed proposal*'s check, "the subject real and in this repository's code" (L212).
- **The evidence chain is question (b).** With no code, D1's evidence is the records alone. The open points:
  - what D1 reads from a research phase's findings;
  - what the book kind is (`subject`, beside `codebase`);
  - what the critic traces a sentence against when the finding under it rests on a web page or on the operator's
    material. Today B5's rules say "never search the web, fetch a page", and its *Inputs* item 6 checks the code and
    the records at the cited ranges.
- **Every edit to SKILL.md touches more than one file.** Part B (B5, B9) is the body of
  `plugin/agents/explain-critic.md`, which `python3 scripts/skills_parity.py --write-agents` regenerates. The skill
  has three copies, checked by `scripts/skills_parity.py`:
  - `plugin/skills/explain/SKILL.md`, the canonical one;
  - `.agents/skills/explain/SKILL.md`, the same body;
  - `web/public/SKILL.md`, a byte copy of the whole file.

## Point 3: one request runs both phases

- **Plugin:**
  - §1 *None covers it* (L248–252): "the explain then runs from those findings afterwards, when the operator asks again,
    never automatically";
  - the research block's `then:` line (L261);
  - the front door's step 7, the "research first" paragraph (L422–428);
  - step 8, *On "research first"* (L519–524): "The explain does not follow by itself".
- **Payload, `create-phase/SKILL.md` *The research route*:**
  - step 1 (L240): "The explain does **not** follow by itself";
  - the closing report's line: "ask `/knowledge:explain <subject>` again".
- This is question **(c)**: which step shows the explain's confirmation once the research phase passes, and how it
  still asks for the operator's literal yes. The candidates are the research review's pass and its closing report.

## Point 4: explain's checks stay, and a book is always a real book

- **Holds in the explain route today:**
  - the outline gate signs every chapter's sections at once;
  - a critic on a second model judges each chapter, and the writer revises once;
  - every sentence is traced to the code or a record;
  - a book is one KB book, with one chapter file and its own quiz per chapter.
- **The failure was the detour.** P8-x9 went around explain, through an ordinary phase, and came out as one 129 KB
  document. Point 2 removes that detour.
- R1 confirms the chapter shape against P59-d8's chapters, and its publish when one exists.

## Point 5: after the outline is signed, the chapters are written in parallel

- **The payload today says chapters run alone:**
  - `do-whole-phase/reference/explain-decomposition.md`, step 4 *Undeclared* (L67): "an explain phase declares
    nothing, so every chapter runs alone, never in a wave";
  - the same file's outline gate (L75 on): the first chapter slice is set `pending` until the operator's `accept`;
  - `do-whole-phase/reference/decomposition.md` L5: "an explain phase's chapters stay undeclared and run alone";
  - `do-whole-phase/reference/explain-chapter.md` *The three spans*: span 1 is the executor; span 2 is the critic,
    which the orchestrator dispatches (L71); span 3 is the executor again, resumed by `SendMessage` (L104).
    `wave.md` *Unchanged* (L81) keeps "the explain references" out of the wave rules.
- **The engine (payload `workflow.py`):**
  - `explain_phase()` (L3877, with the comment above it) exempts an explain `DECOMP` from v77's forced declaration in
    `finish-slice` (L5781);
  - `parallel-plan` prints "an explain phase's chapters stay undeclared and run one at a time" (L5702);
  - nothing refuses a declared chapter: `new-slice --depends-on` and `set-slice-deps` have no explain check. So a
    wave may need only text changes plus the note and the exemption, or more. R1 decides.
- **Each chapter's files** are its own: `book/<key>.md`, `trace-<key>.md`, `outline-ch<k>.md`,
  `research/evidence-ch<k>.md`, `critique/<key>.md` and `answers-<key>.md`. The book's `brief.md`, `evidence.md` and
  `outline.md` are frozen at the signature. So the chapters' sets look disjoint.
- **What couples the chapters:**
  - the taught-terms note that each chapter recaps from;
  - B5 *Inputs* item 7, where the critic reads earlier chapters' headings and terms for the order rule;
  - the review's whole-book read (`explain-review.md` step 2).
- This is question **(d)**.

## Point 6: check against P59-d8 first

- **P59-d8's state when this DECOMP ran** (2026-11-10 about 21:05, from its `slice.json` files in its worktree):
  - `DECOMP` ran 15:45 → 16:03;
  - S1 started at 16:38, after the outline was signed;
  - S1–S6 are done, at 33, 36, 40, 43, 46 and 45 minutes each, one at a time;
  - S7 has been `in_progress` since 20:43; S8 and REVIEW are `todo`;
  - nothing is published.
- At this pace S8 ends around 22:15, and the publish (its REVIEW) comes after that.

## Other things the reading found

- **do-next-slice's explain pointers.** `do-next-slice/SKILL.md` L38 points at
  `reference/explain-{decomposition,chapter,review}.md`, but those three files exist only under
  `do-whole-phase/reference/`. do-next-slice has its own copies of `decomposition.md` (its explain gate line, L7)
  and `review.md` (its pointer to `explain-review.md`), and nothing else. So the plan's "do-next-slice has twins of
  those references" holds only for those two. Whether the L38 pointer is a defect the package should fix is R1's
  call.
- **The version handshake, question (e).** The front door's readiness test is step 2 (L282–292): workspace v94 or
  later, plus the literal `**phases**` field line in create-phase's `## The explain route`. A new route needs a new
  literal marker that only the v96 route writes, on P39-hk's pattern: its S5 handshake paired a workspace
  version with the `**phases**` marker, and the test reads v94 today. Also look at the `0.10.0 or later` line in the payload explain route (L131 area) and at the
  refusal it names.
- **This repo is installed at v89.** The package targets the v95 payload at `fdb1151`, never this repo's
  `.claude/skills/`. P39-hk's package is the pattern: `works/phases/active/P39-hk/package/`, holding `claude/`,
  `PATCHES.md`, `README.md` and `checks/apply.py`, `cites.py` and `finds.py`.
