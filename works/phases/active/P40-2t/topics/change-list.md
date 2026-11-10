# P40-2t: the comparison, the six verdicts, the answers (a)–(e) and the change list (R1)

`P40-2t.R1` wrote this on 2026-11-10. Its evidence is in `topics/study-p8-x9.md` and `topics/study-p58-p59.md`,
the route text as read (the plugin at `ebbbfff4`, 0.10.0; the bootstrap payload at `fdb1151`, v95), and
`topics/route-today.md`. DECOMP2 cuts its edit slices from §5. Every passage is named by its heading; line
numbers drift.

## 1. Side by side

| | Note's P8-x9 (English textbook) | arb_upbit_1's P58-pm → P59-d8 (rule v2 book) |
|---|---|---|
| Why it researched | No code behind the subject: explain refused it | The code was covered, but the reader needed outside quant basics |
| Shape of the run | **One ordinary phase**: corpus → 5 sorts (wave) → merge → DECOMP2 → 6 part writers (wave) → assemble → proofread → publish → review (2 rounds) | **Two phases**: research P58-pm (4 slices in one wave, web allowed with sources), then explain P59-d8 (evidence, signed outline, 8 chapters **one at a time**, each with writer, critic and revision) |
| Time | 14:55 → acceptance gate 17:48: **2 h 53 min**. Writers: 13 min wall for 6 parts | Research **37 min**. Book: DECOMP 18 min, gate ≤ 35 min, chapters 33–46 min **each in series**. 6 chapters took 4 h 05 min; about 5 h 40 min projected for 8 |
| Operator stops | Intake (5 clarifications), a mid-run re-cut, DECOMP2's outline-like gate (OQ1, OQ2), the acceptance gate | Request plus "book, research first", "tes" (the research confirmation), "yes" (the book confirmation, redrawn after research), the outline gate "accept", the acceptance gate (to come); OQ2 (server grammar) open |
| Checks run | 342 quotes exact against the corpus; extractor self-tests; join, id and scan checks; one fresh-eyes proofread; privacy proof of the publish. **No second-model critic, no sentence trace** | Research: 596 citations at the commit, toys re-derived, 13 source URLs re-opened. Book: 151 record quotes checked at D1; a **critic on sonnet per chapter** against an opus writer; a sentence trace |
| What the checks caught | Proofread: 36 fixes (wrong meanings, pronouns, over-broad rules, cross-part duplicates). Review: 1 notebook finding | Research review: 0 findings (its discrepancies were filed as jobs). Critics, 6 chapters: **11 must-fix** (facts 8), 57 should-fix, 34 notes, 0 disputed. `outside`: no must-fix. Cross-chapter: 5 should-fix |
| Output | **One 129 KB document**, one 20-item quiz at the end, a plain glossary section (a server work-around). Published private, doc 73 v2 | **A KB book**: 8 chapters planned, 7 drafted at R1, each its own file with its own quiz (5 items), glossary and formulas. Unpublished at R1 |
| Improvised | The detour around explain; writers pre-cut before research; the glossary work-around; a placeholder publish | The research route stretched to the web; the `then:` line rewritten and the book chained by hand; gap G36 for the papers; OQ2 |

**What the two runs teach together:**
- P58-pm's research phase and P59-d8's records-only book carried outside knowledge into a checked book. There
  were no `outside` must-fixes.
- P8-x9's parallel writing was fast: 13 min against about 62 min in series. But with no critic it shipped what
  only a proofread caught, and its one-document shape is exactly what the operator rejected.
- The standard way takes the research phase and the checks from the first run, and the parallel writing from
  the second.

## 2. The six confirmed points: verdicts

| # | Point (`intent.md`, *Confirmed Intent*) | Verdict | Evidence |
|---|---|---|---|
| 1 | Research always runs in its own findings-only phase (code, web with a source beside each finding, or the operator's material) | **holds, with a change** | P58-pm: 37 min, 0 review findings, 13 sources confirmed, and the records carried web-sourced basics into P59-d8 with no `outside` must-fix. P8-x9's gathering was sound findings work (corpus, sorts, merge), but it shared a phase with the writing, so the book skipped explain's checks. **The change:** the research route gains a `sources:` line, per-source rules, privacy rules for the operator's material and a reader-shaped findings form ((a)) |
| 2 | Explain writes only from records and accepts a no-code subject a research phase covers | **holds, with a change** | P59-d8 wrote from P58-pm's records of kind `finding` under one standing gap (G36), and its critics accepted that. P8-x9 was refused only for having no code. The server and CLI already accept book kind `subject` (`server/books.py` `BOOK_KINDS`). **The change:** MODE gains the subject case, the book kind `subject`, a finding entry's `source:` field, and the critic's rule for findings ((b)) |
| 3 | One request runs both: the explain's confirmation appears by itself once the research passes | **holds, with a change** | The P58-pm → P59-d8 chain did exactly this by hand: one "yes" after the research. The confirmation changed after the research (6 → 8 chapters, "60 recorded ideas read easier as 8"), which shows it belongs **after** the research. **The change:** the research route runs at once, then `When it passes` shows the confirmation; the front door accepts `from=P<N>` ((c)) |
| 4 | The checks stay (signed outline, a second-model critic per chapter, every sentence traced), and a book is a real book with a page and a quiz per chapter | **holds** | The critics caught 11 must-fixes (8 facts) in 6 chapters that a no-critic run would have shipped. P8-x9's proofread found 36 issues after the fact. Each P59-d8 chapter has its own quiz block and publishes as its own document. The live chapter pages wait on P59-d8's publish (§7) |
| 5 | Once the outline is signed, chapters are written at the same time | **holds, with a change** | P59-d8 in series: about 40 min a chapter, about 5 h 40 min for 8. P8-x9's parallel parts: 13 min wall. What series gave P59-d8 is replaceable: forward corrections, recaps checked against earlier text, link ids. Only 5 of 68 must/should findings were cross-chapter, all should-fix. **The change:** pin more in the outline, a synthesis chapter after the wave, at most 4 chapters at once, the critic reading earlier chapters at `HEAD` only, and a review consistency pass ((d)) |
| 6 | Check against P59-d8's finished run first; ask if it contradicts | **holds** | 6 of 8 chapters are critiqued and nothing contradicts points 1–5. Its publish and acceptance are still to come; the checks that wait are in §7 and *Notes for later slices*. Not a stop (R1's plan) |

**No point is contradicted.** R1 returns `done`, not `needs_operator`.

## 3. The answers, pinned

### (a) The research block's sources, and the privacy rules

**The block** (the front door drafts it; `create-phase`'s research route reads it):

```
Research: <subject>
- subject: <subject, refined from the operator's words>
- paths: <the subject's files and folders> | none (no code behind it)
- sources: <one or more of: code · web · operator material (<which: intent files' original input, typed chat messages; which repos and hosts>)>
- question: <the reader's questions, one a line>
- findings-only: yes — it records findings in its phase's notebook and topics; it writes no product code and spends no money
- then: explain <subject> — <unit>, for <reader>; its confirmation, redrawn from these findings, is shown for your yes when this phase passes
```

The route lists the block's fields in bold (`**sources**`, …). The literal `**sources**` field line is new in
v96: it is the readiness marker of (e).

**Code:** as today.
- Each claim is cited `<path>:L<a>-L<b>@<short sha>`.
- `Not found:` lines record what neither the code, a comment nor the history shows.

**The web** (P58-pm's form, now the rule):
- Each outside fact carries its source beside it: title, author, section or page, URL, and the date read.
- An `unsourced:` line marks a claim no opened source states.
- A source that could not be opened is never cited as read.
- Only the workspace's own search and fetch tools: a paid source is spend, and it plans at the gate.
- **The research review re-opens a sample, at least 2 sources per topic**, and confirms that each says what is
  attributed to it (P58-pm re-opened 13).
- The explain never re-checks the web. This sample is the web check.

**The operator's own material** (P8-x9's corpus rules, now the rule):
1. **Only the operator's own words:**
   - the typed and queued messages of interactive sessions;
   - the verbatim *Original Input* of intent files.
   - Never other agents' or peers' messages, task notifications, tool or hook output, skill bodies, compaction
     summaries, or intents narrated by the assistant.
   - The assistant's text is kept only as context, to judge a misunderstanding, and is never quoted.
2. **Pastes are cut:** code, logs and quoted documents are not the operator's words.
3. **Secrets are never quoted, stored or printed:** keys, tokens, passwords, connection strings.
   - The extract redacts them by shape.
   - Its extractor has a self-test that fails on made-up shapes.
   - Results report counts only.
4. **People, companies, clients and product names** a finding does not need are masked as `[name]`, and money as
   `[figure]`, in every quote a finding carries. Public tools stay named, and no insult or profanity is quoted.
   - Masking happens in the research phase, so the explain quotes records verbatim and never alters one.
5. **Read-only everywhere else:** nothing is written on another host or repository.
   - The extract and its extractor live in the research phase's `topics/corpus/` and are committed with it, as
     records.
   - The research confirmation names the repository they land in, and **whether it has a git remote**, so that
     the operator decides before anything is read.
6. **Quotes cite record ids** (`mp-0414`-style). A book's text carries no record id, path, email or phone
   number; the trace holds them.
7. **The research review** checks the extractor's self-tests, runs a secret-shape scan over the extract, and
   samples the masking.
8. The publish stays **private** (already absolute).

**Reader-shaped findings.** When the `then:` reader is new to the subject, each idea is recorded in this order:
- a plain definition, a worked example with numbers, the formula with its symbols named, and why the reader
  needs it;
- then what the code does with it, and what the builders recorded.

This is P58-pm's eight-item form. It is what let P59-d8 teach from the findings alone.

**A corpus slice** is a `--kind research` slice. Its output is the extract, its manifest and its extractor, all
under `topics/corpus/`. These are records, not product code; P8-x9 ran this as a mid-row `implementation`
slice.

### (b) A subject with no code: MODE, coverage, D1, the trace and the critic

- **MODE gains a third case, a *subject*** (beside change and topic): the subject is not this repository's code.
  Examples: a field of study, a language, the operator's own words.
  - **Told from records alone:** a research phase's findings, put on `phases:`.
  - **With a covering research phase** (named by `from=P<N>`, or found by the coverage), the front door goes on.
  - **With none**, the confirmation offers only **"research first"**. There is no "yes from the code alone",
    because there is no code.
  - **Outside a git repository**, it declines. The workspace check already refuses there.
- **The book kind:** `codebase` (the subject is the code, even when it leans on outside basics, as P59-d8 does)
  or **`subject`**, with a short display label.
  - The `## Explain` line is `book: <slug> — "<title>" (kind subject: <label>)`.
  - The publish adds `--book-kind subject --book-subject "<label>"`. The CLI and server already accept both.
- **The placement:** the project is §5's rule (the repository's root folder name) unless the operator names
  another. P8-x9 chose a new `english` project. A loose document needs no kind.
- **What D1 reads** when a research phase's topics are the records:
  - the phase's `intent.md`, its `## Decisions` gists, its `topics/` findings (the bulk), and its slices'
    `result.md` heads, as §3.4 already lists;
  - a corpus only at the record ids a finding cites, never whole.
  - With `paths: none` there are no code entries (`code 0`); the commit (`HEAD` at D0) pins the records.
- **How a sentence traces to a finding that cites a web source:**
  - The sentence traces to the record entry for the finding line: kind `finding`, its `says:` quoted verbatim.
  - The entry gains one field, **`source:`**, which copies the outside work the finding names, as recorded
    (title, URL), or `none`.
  - The chapter states the fact in its own voice under a **standing gap**: "the outside works behind these
    findings were read by <P>, not by this book". That is P59-d8's G36 form, written by the DECOMP whenever a
    `source:` entry serves a chapter. Or the chapter attributes the fact in plain words.
  - **Sources** list the code and the records. Whether they also list the outside works ("read by the
    research") is **OQ1**; until the operator answers, the default is P59-d8's signed form, records only.
- **What the critic checks against:** the record line at its cited range and its `source:` field, **never the
  web**. It checks three things:
  1. the sentence says no more than the finding. A gloss beyond it is `outside`, as in P59-d8 ch 6's C06;
  2. an outside fact rests on a finding. With none, it is an `outside` must-fix;
  3. it is attributed, by the standing gap or in plain words.
  - The web itself was checked upstream, by the research review's sample.

### (c) The confirmation that "appears by itself"

- **Before the research.** The front door has already drafted the explain confirmation: unit, reader, the shape
  or chapter list, project, lang. On "research first" it hands `create-phase` the block **and that proposal as
  last shown**, verbatim. The research route writes both under *Original Input (verbatim)*, and the `then:`
  line under *Confirmed Intent*.
- **The research phase runs at once.**
  - Its one confirmation (name, objective, sources, and for the operator's material where the extract is
    committed) is the explicit `auto`, as the explain route's is.
  - It runs on the default stream.
  - It falls under the contract's explain-route exception ("create and run their phase") as the explain's own
    research. The route text says so. The contract is not edited: it has 3 B of headroom under its 12,288 B cap.
- **The step that shows it:**
  - The pass is recorded in `review.md`, both in `do-whole-phase` and in `do-next-slice`'s own copy.
  - For a phase whose *Confirmed Intent* has a `- then: explain` line, the orchestrator then follows
    `create-phase`'s *The research route*, **When it passes**, after the pass is recorded and merged (if the
    phase ran in a worktree).
  - It invokes the plugin's front door through the Skill tool as `/knowledge:explain <subject> from=<P>`.
  - The SKILL.md cores are not touched: `do-whole-phase` is at 8,185 B and `do-next-slice` at 8,180 B, against
    an 8,192 B cap.
- **What it carries forward:**
  - The `then:` line, and the previewed proposal, as the starting draft: unit, reader, shape, project, lang,
    must-cover.
  - `P<N>` on `phases:`, beside any phase that covers the code.
  - The redraw may change the sections or chapters. `Why:` says what changed and why, as P59-d8's 6 → 8 did.
- **It still waits for the literal yes:**
  - Front-door steps 7–8 are unchanged: show the confirmation and end the turn.
  - Only a literal yes hands it to `create-phase`; nothing is created otherwise.
  - Headless prints it and creates nothing.
  - Under `/do-whole-phases` it is shown in the run's closing report and parks nothing, because no phase exists
    until the yes.
  - A research phase that does not pass shows nothing. A "no" leaves the research as records, which a later
    `/knowledge:explain` finds by coverage.

### (d) Chapters as a wave after the outline gate

**The orchestrator's working proposal, tested against P59-d8:** all five parts are **kept**. Three are adjusted,
and three additions come from the evidence.

- **The outline gate:** unchanged.
  - Right after `finish-slice <P>.DECOMP`, in the same turn and before any dispatch, the first chapter slice is
    set `pending`.
  - A stop on disk empties `ready_slices`, so no declared chapter starts until "accept".
  - On "accept", that slice goes `in_progress` and the wave starts.
- **Declaration:**
  - Every chapter whose outline "builds on" is served by the outline's taught terms declares
    `--depends-on none`.
  - **A synthesis chapter** builds on every earlier chapter, or walks one case through their ideas, as
    P59-d8's ch 8 does. It declares `--depends-on` each chapter it draws on, so it runs after them and reads
    them finished.
  - "Builds on" in the outline is now a **recap obligation, not a run order**.
  - A document's or a chapter unit's `S1` declares `--depends-on none`.
- **The cap, kept at 4:** at most **4 chapters in flight**, counting any of their three spans. The next ready
  chapter starts as one finishes. This is the upper end of the proposal's 3–4.
  - No run hit a usage limit with 4–6 spans at once: P58-pm ran 4, P8-x9 ran 5 and then 6.
  - Each chapter is three spans, about 40 min, with a critic of up to 120 turns. The cap limits the burst and
    the returns the main thread handles at once.
  - The operator's word lifts it.
  - It is a text rule, an exception to `wave.md`'s "no cap"; the engine does not enforce it.
- **Each chapter's set:**
  - `book/<key>.md` and `book/assets/<key>/`;
  - `book/critique/<key>.md`, written by its critic;
  - `book/research/evidence-ch<k>.md`, `outline-ch<k>.md`, `trace-<key>.md` and `answers-<key>.md`;
  - its slice folder.
  - The frozen `brief.md`, `evidence.md` and `book/outline.md` are in no set; they are read-only.
  - **Shared runtime resource:** the repository's code environment, when chapters re-derive numbers through the
    code. In P59-d8, S1's first `uv run` created `.venv`. The DECOMP warms the environment once; a chapter
    never installs or creates one. `knowledge check` is a read-only call.
- **The critic inside a wave:**
  - A chapter's span-1 return (`critic_ready: yes`) is **not a slice return**: no `record-dispatch`, no set
    check, no `finish-slice`. Dispatch that chapter's critic at once, in the background.
  - On the critic's return, read only its verdict block and resume span 3: `SendMessage`, or re-dispatch from
    disk with its `## Wave` section rewritten.
  - Only span 3's final verdict goes through `wave.md`'s *At each return*: the set check, notebook entries,
    and a rolling commit per chapter.
  - A usage limit in any span is handled by `dispatch.md` (5), never as a verdict.
- **The engine:**
  - **`finish-slice` drops its explain exemption**: a book's DECOMP declares like any decomposition.
  - **`parallel-plan` drops** "an explain phase's chapters stay undeclared and run one at a time".
  - `new-slice --depends-on`, `set-slice-deps`, `next`'s ready set and its stops need no change: none has an
    explain check.
- **What keeps the book consistent:**
  1. **The outline pins more**, beside the taught-terms list that P59-d8's outline already has. Each item answers
     one class of P59-d8's cross-chapter findings:
     - each term's **one-line recap**, which every later chapter uses (ch 4 C07);
     - the book's **one name per thing** (ch 5 C05, ch 6 C07);
     - the **running examples and their numbers** (ch 2 C07);
     - the **section ids** a chapter may link to.
     - The proposal's "running examples and numbers" is kept and widened by the recap lines and the names.
  2. **Each chapter's span 3 returns a notebook note:** the terms it taught, its link ids, and **corrections**:
     any fix it made to a fact the outline or the frozen evidence states. This replaces P59-d8's forward channel.
  3. **The critic reads an earlier chapter only as committed** (`git show HEAD:<path>`). A sibling still in
     flight is judged by the outline's recap lines. In a sequential run every earlier chapter is committed, so
     nothing changes there.
  4. **The synthesis chapter runs last** and reads the finished chapters.
  5. **The review's whole-book read gains a consistency pass**, kept from the proposal and widened:
     - recaps against the pinned lines;
     - one name per thing;
     - the running numbers;
     - every recorded correction, checked in every other chapter.
     - A mismatch is a finding, with a fix slice for that chapter.
- **The gain, on P59-d8's numbers:**
  - Chapters 1–7 in two rolling rounds of at most 4, then ch 8: about **2 h 15 min** after the gate, against
    about **5 h 40 min** in series.
  - Uncapped, it would take about 1.5 h.

### (e) The version handshake: plugin 0.11.0 against v96

**The pattern** is P39-hk's (OQ8/OQ24, F5). The bootstrap release that carries the package lands and is pushed
**first**. Only then is plugin 0.11.0 pushed. The plugin's refusal names that release's real number: v96 is
expected. If the bootstrap releases another version first, a fix slice renames the number before the plugin is
pushed, as P39-hk.F5 did.

**Plugin 0.11.0's front door:**
- **The test:** `workspace_version` is **96 or later**, **and** create-phase's `## The research route` lists the
  literal `**sources**` field, which only the v96 route writes.
- **No workspace:** "… (v96 or later) …".
- **Too old:** "This workspace (v<N>) cannot run explain phases from the knowledge plugin: they need v96 or
  later, whose create-phase research route writes a `sources` line. Run `/update-workspace`, then ask again."

**v96's side:**
- create-phase's explain route refuses a plugin that is missing, **older than 0.11.0**, or not set up. It reads
  the version from the registry, as today.
- `explain-decomposition.md`'s registry check requires **0.11.0 or later**, or sets DECOMP `pending
  --stop-kind operator-action`.

**The mixed states:**

| Plugin | Workspace | What happens |
|---|---|---|
| 0.11.0 | v95 | The front door refuses and names v96 |
| 0.10.0 | v96 | 0.10.0's own test passes (v94+ and `**phases**`). The v96 explain route then refuses the 0.10.0 plugin and names 0.11.0 |
| 0.10.0 | v96, "research first" | The research route reads the old five-line block as `sources: code` with no chain, and says once "update the plugin to 0.11.0 for the chained explain" |
| 0.11.0 | v95, explain in flight (P59-d8) | Unaffected. Its DECOMP's floor was 0.10.0, and in a sequential run the critic's `HEAD`-only rule reads the same committed chapters |

**This v89 workspace:**
- It can run no explain today: plugin 0.10.0 already refuses anything below v94.
- After the v96 release, the operator runs `/update-workspace` here. That step goes from v89 through v90–v96.
- The phase itself needs no update: it edits the plugin and writes a package that is checked on a scratch copy
  of the v95 payload.
- arb_upbit_1 and Note are at v95, and need the same update before they use the new route.

## 4. Two rules that let DECOMP2 cut in parallel

- **No plugin heading is renamed or added.** Every change lands under an existing heading or bold part. So the
  package's citations (`checks/cites.py`, by number **and** heading) hold against both 0.10.0 and 0.11.0, and
  the plugin and the package can be written at the same time.
  - The two new anchors live in the payload, not the plugin: create-phase *The research route*'s **When it
    passes** bold part, and `explain-chapter.md`'s *Chapters at once (a wave)* heading.
  - The names are pinned here, so slices that cite them across sets agree.
- **Per-area patch files.** The package keeps P39-hk's layout. Its find/replace notes are split into
  `package/patches/<area>.md`, one per set, and the release slice writes `PATCHES.md` as their ordered index.
  `checks/apply.py` applies `patches/*.md` in that order. No two slices edit one patch file.
- **The package starts from `fdb1151`'s payload files**, never from P39-hk's package copies:
  `explain-decomposition.md` already differs (v86–v91 → v86–v93).

## 5. The change list

Sizes: **S** small (a sentence to a paragraph), **M** medium (several paragraphs, or a rule with cases), **L**
large (a section rewritten, or new procedure).

### Group A: the plugin, one set

The set is `plugin/skills/explain/SKILL.md` (canonical), `.agents/skills/explain/SKILL.md` (same body) and
`web/public/SKILL.md` (a byte copy), plus `plugin/agents/explain-critic.md`, regenerated by
`python3 scripts/skills_parity.py --write-agents` from Part B. Two plugin slices never run together. The group
is two natural halves in series: **A-front** (A1–A13) and **A-evidence** (A14–A22).

| # | Passage | What changes | Why | Size |
|---|---|---|---|---|
| A1 | frontmatter `description` | "Codebase-only … a subject with no code … is declined" becomes: from the code and the records, a research phase's findings included; a subject with no code is offered research first, and its confirmation comes back by itself; needs v96 | 1, 2, 3, (e) | S |
| A2 | *explain* (intro) and its "Every explain is an explain phase" paragraph | "codebase-only … declined" becomes records-only; v94 becomes v96 | 2, (e) | S |
| A3 | *The run, in one card* · *The evidence* | Records include a research phase's findings (web-sourced or the operator's material); a subject explain has no code entries. The writer's rules are unchanged: no research | 2, (b) | S |
| A4 | §1 *Resolve the topic, the mode and the placement* · **Arguments** | A new trailing word, `from=P<N>`: the research phase a chained explain is drawn from. It goes on `phases:`, and its intent's previewed proposal is the starting draft | 3, (c) | S |
| A5 | §1 · MODE, *No code behind it* | Becomes the **subject** case (records only; research first when none covers it; decline only outside a git repository). The "an idea the code relies on" sentence stays for topic mode | 2, (b) | M |
| A6 | §1 · *The unit, and where it goes*, **A book** | Kind `codebase` or `subject` (label). Remove "A book about a subject with no code behind it is declined" | 2, (b) | S |
| A7 | §1 · COVERAGE, *None covers it* and the research block | Offered for code no phase covers **and** for a subject. The block gains `paths: … \| none`, `sources:` and the chained `then:` ((a)'s block). One line says the research route holds the sourcing and privacy rules, and that the confirmation names where the operator's material is read | 1, 3, (a), (c) | M |
| A8 | *The front door, step by step* · step 2 | The readiness test becomes v96 plus `**sources**` under `## The research route`; the refusal texts name v96 | (e) | S |
| A9 | step 3, *Refuse early* | Drop the no-code decline; keep the worktree and public-project refusals; add "outside a git repository: decline" | 2 | S |
| A10 | step 5 (the prior, the cheap look, the coverage) | `from=P<N>`: that phase is covering, and its previewed proposal is read from its `intent.md`. A subject with no paths runs the coverage grep on the subject's plain name. The cheap look for a subject reads the research phase's Decisions and topic headings | 3, (b), (c) | S |
| A11 | step 6, the proposal | `subject` wording (a topic of the code, or a subject a research phase covers); `phases` includes `from=`; `book` kind `subject`; drop "every subject is the repository's code" | 2, (b) | S |
| A12 | step 7, *Ask once* (the no-coverage paragraph, `Built by:`, the book's stops line) | "Research first" covers both cases, and names the sources it would read and that the confirmation returns by itself; no "yes from the code alone" for a subject. A redrawn confirmation says in `Why:` what changed since the preview | 3, (c) | M |
| A13 | step 8, *On "research first"* | The hand-off carries the block **and the proposal as last shown**. "The explain does not follow by itself" becomes: its confirmation comes back by itself when the research passes (create-phase's research route), and still waits for the literal yes | 3, (c) | S |
| A14 | §3.4 *D1: the evidence* (opening, steps 2, 3 and 6) | A research phase's findings are records; a corpus is read only at cited record ids; no code with `paths: none`; a finding's outside work is carried as the entry's `source:`, never read; the standing gap for outside works read by the research | 2, (b) | M |
| A15 | §4 *Write the chapter — native Markdown* · *The subject, not the records*, and §4.6 *Sources* | Sources list the code and the records, research-phase lines naming the findings. The outside-works group is **OQ1**: default off | 2, (b), OQ1 | S |
| A16 | §5 *Publish via the KB document API* (the command and its flags) | `--book-kind codebase` becomes `<codebase\|subject>`, plus `--book-subject "<label>"` for a subject book | (b) | S |
| A17 | §9.2 *The evidence for a book (an explain phase)* | "A book is a codebase book" becomes codebase or subject. Item 3's outline adds the pinned recap lines, names, running examples and link ids, which the workspace asks for | 2, 5, (d) | S |
| A18 | §9.3 *A chapter: its evidence, then the draft* | Written beside other chapters: recap with the outline's recap lines, link only to section ids the outline names, and report corrections (the workspace's note) | 5, (d) | S |
| A19 | B5 *Critic (`knowledge:explain-critic`)* · *Inputs*, item 7 | Earlier chapters are read only as committed (`git show HEAD:<path>`); a sibling not at `HEAD` is judged by the outline's taught terms and recap lines | 5, (d) | S |
| A20 | B5 · *How you check*, **Nothing from outside** (and *The trace*) | A finding resting on an outside work supports the sentence: check the record line and its `source:`, never the work. A gloss beyond the finding is `outside`. Attribution comes by the standing gap or in plain words | 2, (b) | S |
| A21 | B9 *The dossier: files, ids and entries* · the record-entry form and *What an entry supports* | A `- source: <title, URL> \| none` field on a `finding` entry; what a finding entry supports | (b) | S |
| A22 | B9 · *The evidence* paragraph | Records include research findings (web-sourced, or the operator's material); still nothing read from outside the records | 2, (b) | S |

**Group A total: L**, about 22 passages across 4 files. Each half is about one span.

### Group B: the payload's create-phase routes

The package files are `package/claude/skills/create-phase/explain-route.md` and `research-route.md`. Their texts
replace `## The explain route` to the end of `payload/claude/skills/create-phase/SKILL.md` at `fdb1151`; start from
that text. The patch notes are `package/patches/create-phase.md`, for the *Procedure*'s step 2 research paragraph
and the intro's one-exception sentence.

| # | Passage | What changes | Why | Size |
|---|---|---|---|---|
| B1 | *The explain route*, its opening two paragraphs | Records-only; a subject a research phase covers is accepted; plugin floor **0.11.0** | 2, (e) | S |
| B2 | **Refuse before anything is written** | Drop "a subject with no code behind it" (it goes to the research route); the plugin refusal reads "older than 0.11.0" | 2, (e) | S |
| B3 | step 1, the sixteen fields, and *When no phase covers the subject* | `subject` wording; `phases` may be a research phase; `book` kind `codebase\|subject` (label); drop "every subject is this repository's code"; "research first" covers both cases | 2, (b) | M |
| B4 | **A confirmed proposal** | "the subject real and in this repository's code" becomes "… or covered by a research phase on `phases:`"; a legacy `mode: general` covered by a research phase reads as a subject explain | 2, (b) | S |
| B5 | **What that `DECOMP` will cut**, a book | Chapters are declared and run as a wave after the outline gate, at most 4 at once, with a synthesis chapter after; the outline pins the recap lines and names | 5, (d) | S |
| B6 | *The research route*, the block | `paths: … \| none`, the new **`sources`** field (the v96 marker), the chained `then:`; the fields as a bold list | 1, 3, (a), (e) | M |
| B7 | research route, steps 1–2 | One confirmation names the sources and, for the operator's material, the repo the extract lands in and whether it has a remote. On yes: `new-phase`, `intent.md` (block and proposal verbatim), intake commit, then **run in `auto` on the default stream**, as the explain route's own research (the contract's exception), not STOP | 3, (c) | M |
| B8 | research route, **What that `DECOMP` will cut** | Per-source rules: code as today; the web (source beside each finding, `unsourced:`, no paid source); the operator's material (a corpus `research` slice, extractor and extract in `topics/corpus/`, the eight privacy rules). Reader-shaped findings when the reader is new. The research review samples at least 2 sources per topic and checks the corpus's self-tests, a secret scan and masking | 1, (a) | L |
| B9 | research route, a new bold part **When it passes** (and its closing paragraph) | After the pass is recorded (and merged), invoke `/knowledge:explain <subject> from=<P>`; the front door redraws and waits for the literal yes; headless prints; `/do-whole-phases` reports it and parks nothing. The "ask `/knowledge:explain` again" line goes | 3, (c) | M |
| B10 | research route (new sentence) | A legacy block with no `sources:` line (from plugin 0.10.0) is read as `sources: code`, with no chain, and one line asks for the plugin update | (e) | S |
| B11 | `create-phase` intro, "with one exception", and *Procedure* step 2's "**If the request carries a `Research: <subject>` block**" | The exception now covers the explain's research phase too; step 2 no longer says "no phase covers the subject yet" only | 3 | S |

**Group B total: L.**

### Group C: the payload's explain references, the wave, decomposition, review and the executor

The whole files are `package/claude/skills/do-whole-phase/reference/explain-{decomposition,chapter,review}.md`;
start from `fdb1151`'s copies. The build's `SHARED_SKILL_FILES` copies them into `do-next-slice/reference/`:
never place a copy there. The patch notes are `package/patches/workflow.md`.

| # | Target · passage | What changes | Why | Size |
|---|---|---|---|---|
| C1 | `explain-decomposition.md` · *Before you plan it* | `## Explain` check: a subject explain's `phases:` must name a research phase; legacy `mode: general` with a covering research phase reads as a subject; the registry floor becomes **0.11.0**; the estimate is chapters in rounds of at most 4, plus the synthesis chapter | 2, 5, (e) | M |
| C2 | `explain-decomposition.md` · *A book*, steps 2–5 | D1 on research records (no code for a subject; the standing gap); the outline's book kind `codebase\|subject`; the pinned recap lines, names, running examples and link ids; "builds on" read as recap obligations; the synthesis chapter named; **declare** (`--depends-on none`, the synthesis on what it draws on); each chapter's set into `topics/breakdown.md`; warm the code environment once; run `parallel-plan` | 2, 5, (b), (d) | L |
| C3 | `explain-decomposition.md` · *The outline gate*, and *A document or a chapter* step 4 | The stop on the first chapter holds every declared chapter (a stop on disk); on accept, start up to 4. `S1 --depends-on none` | 5, (d) | S |
| C4 | `explain-chapter.md` · a new section, *Chapters at once (a wave)* | At most 4 chapters in flight; the span-1 and critic returns are not slice returns; the critic is dispatched per chapter as its span 1 returns; span 3 by `SendMessage` or from disk with `## Wave`; only span 3's verdict takes *At each return*; usage limits | 5, (d) | M |
| C5 | `explain-chapter.md` · *The three spans* (span 3) and *Records, limits and the commit* | Span 3's note (taught terms, link ids, **corrections**) goes in the `notebook` field in a wave; the freeze check is scoped to the chapter's set; one rolling commit per chapter; the publish fields carry the book kind and label | 5, (b), (d) | S |
| C6 | `explain-review.md` · *Plan a book's review*, step 2 | The whole-book read adds the consistency pass (recap lines, names, running numbers, every correction across chapters) | 4, 5, (d) | S |
| C7 | `wave.md` · its opening, *Planning and dispatching a wave* and *Unchanged* | "An explain phase declares nothing, so it stays sequential" goes; add the explain book's two exceptions (the cap of 4; span-1 and critic returns are not slice returns, see `explain-chapter.md`); drop "the explain references" from *Unchanged* | 5, (d) | S |
| C8 | `do-whole-phase/reference/decomposition.md`, the declaration bullet | "…and an explain phase's chapters stay undeclared and run alone" becomes "an explain book declares its chapters by `reference/explain-decomposition.md`" | 5 | S |
| C9 | `payload/claude/agents/slice-executor.md` · the decomposition bullet and *The explain carve-out* | "leave an explain phase's chapters undeclared" becomes "declare an explain book's chapters by its reference"; in a wave, `phase.md` entries go in the `notebook` field | 5, (d) | S |
| C10 | `do-whole-phase/reference/review.md` **and** `do-next-slice/reference/review.md`, at the recorded `pass` | One line each: a research phase with a `- then: explain` line goes on to create-phase's *The research route*, **When it passes** | 3, (c) | S |

**Group C total: L.** **No edit** to `payload/contract.md` (3 B of headroom under 12,288 B) or to the
`do-whole-phase` / `do-next-slice` `SKILL.md` cores (7 B and 12 B under 8,192 B).

### Group D: the engine

The targets are `payload/scripts/workflow.py` and its probe in `tests/retrofit_smoke.sh`. The patch notes are
`package/patches/engine.md`.

| # | Passage | What changes | Why | Size |
|---|---|---|---|---|
| D1 | `finish_slice` (`if decomposition and not explain_phase(pdir):`) and the comment above `explain_phase()` | Drop the exemption: a book's DECOMP declares its chapters like any decomposition. `explain_phase()` stays, for the detached host worktree | 5, (d) | S |
| D2 | `cmd_parallel_plan` (the explain note and its early `return`) | Drop "an explain phase's chapters stay undeclared and run one at a time". It prints the rounds and the undeclared check like any phase | 5, (d) | S |
| D3 | `tests/retrofit_smoke.sh`, Test 10d's forced-declaration probe (the "explain exempt" lines) and the wave comment ("explain chapters stay undeclared") | The probe flips: an explain DECOMP over an undeclared chapter is refused, and passes once declared | 5 | S |

**Group D total: S.** Verified: `new-slice --depends-on`, `set-slice-deps`, `next`'s `ready_slices=` and
`start-slice` have no explain check.

### Group E: the release, last

| # | Target · passage | What changes | Why | Size |
|---|---|---|---|---|
| E1 | `plugin/.claude-plugin/plugin.json` (`version`, `description`); `.claude-plugin/marketplace.json` (`description`) | 0.11.0; the description as A1 | (e) | S |
| E2 | `plugin/skills/setup/SKILL.md` (`plugin_version` and the sentence on it) | 0.11.0 | (e) | S |
| E3 | `plugin/README.md` *Explain: flags and the one confirmation*; the root `README.md` (the "v94 or later" line); `plugin/templates/kb/docs/getting-started/{{KB_DATE}}-how-your-knowledge-base-works.md` (the "v94 or later" line) | v96, the research route chained, `from=`, the subject book, chapters at once | 1–5, (e) | M |
| E4 | parity | `python3 scripts/skills_parity.py --write-agents` and then the check; `python3 scripts/plugin_parity.py` | — | S |
| E5 | `package/README.md` | P39-hk's shape: the files table, the order to apply, the minimums (plugin 0.11.0, CLI 0.2.0+, a server with `check`), how it was checked, and **the release order: bootstrap first, plugin after** | (e) | M |
| E6 | `package/PATCHES.md` and `package/patches/release.md` | The ordered index of `patches/*.md`; the `changelog.d/<slug>.md` fragment; `README.en.md`'s Knowledge block; the smoke suite's explain pin block (new literals: `**sources**`, `0.11.0`, `--depends-on none` for chapters, "at most 4"); the release; verification after applying | (e) | M |
| E7 | `package/checks/apply.py`, `finds.py`, `cites.py` | Retarget to `fdb1151` (v95); the skill count is **21**; `apply.py` applies `patches/*.md` in index order; `cites.py` runs against the 0.11.0 skill | (e) | M |

**Group E total: M.** Every product-truth change also owes a `## Doc impact` note from the slice that makes it:
`docs/current/qa.md` names v94, and the operations doc's explain lines.

### What R1 decided not to change

- **do-next-slice's pointer to `reference/explain-*.md` is correct.** It was a false positive from reading the
  payload tree instead of a built install. `installer/build.py`'s `SHARED_SKILL_FILES` copies `explain-chapter.md`,
  `explain-decomposition.md`, `explain-review.md` (and `dispatch.md`) from `do-whole-phase/reference/` into
  `do-next-slice/reference/` at build time. arb_upbit_1 (v95) and this repo (v89) both hold them. The package
  fixes nothing there, and must never ship a copy under `do-next-slice/`.
- **The contract and the two SKILL.md cores** are full to within bytes, so nothing is added there (see Group C).
- **The hosted knowledge server lags the plugin grammar** (P8-x9's glossary work-around, P59-d8's OQ2). This is a
  deploy of this repo's server, outside this phase's boundary. It is a deferred-job candidate for REVIEW.
- **No new plugin heading** (§4).

## 6. Suggested cut for DECOMP2 (its call)

- **Round 1 (a wave):**
  - **A-front** (A1, A2, A4–A13);
  - **B** (the create-phase routes);
  - **C** (the references, wave, decomposition, executor, review);
  - **D** (the engine).
  - Their sets are disjoint by §4's rules.
- **Round 2:** **A-evidence** (A3, A14–A22), after A-front, because it uses the same 4-file set.
  - It may run beside round 1's longer B or C.
- **Then E** (the release), then REVIEW.
- **Rating:** by the normal rule. The approach is pinned here, so most are `mid` unless DECOMP2 names a
  trigger. A wide blast radius is arguable for A-front (the front door is the contract the payload cites).
- **The join-rebuilt artifact** stays the plugin's four-file set. The package has none.

## 7. What waits on P59-d8's publish

At about 21:12, S7's critic was running; S8 and the REVIEW are to come, and its REVIEW must not publish before
its OQ2 (the server grammar) is answered.

- Its ch 7–8 critiques, and its REVIEW's whole-book read. These are the best evidence of what sequential writing
  still left inconsistent, so they test (d)'s consistency pass.
- The book on production:
  - 8 chapter pages in order on the book page;
  - each chapter's own quiz grading with its `explain`;
  - formulas and the glossary rendering (OQ2);
  - `chapter:` links landing;
  - the anonymous probe of the book route returning 404.
- The operator's acceptance of the book.
- **R1's view:** the edits need not wait. Nothing in the route design depends on how the reader renders a
  chapter page. Point 4's per-chapter page is the explain's book publish, already in place. If P59-d8's
  publish exposes a reader defect, that is a product fix, not a route change. REVIEW records P59-d8's result if
  it exists by then, and otherwise names it in the walkthrough as the live test of point 4.
