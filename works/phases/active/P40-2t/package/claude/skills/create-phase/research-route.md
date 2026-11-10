## The research route

An explain tells only what the records say. **When no phase covers its subject** (code no phase built or recorded, or a subject with no code behind it: a field of study, a language, the operator's own words), the plugin's front door, or *The explain route*'s own confirmation, offers "research first". On that reply it hands this skill, verbatim, the operator's request, a block like this one (the plugin's §1 *Resolve the topic, the mode and the placement*, *The phases that cover the subject*), and the explain proposal as last shown:

```
Research: <subject>
- subject: <subject, refined from the operator's words>
- paths: <the subject's files and folders> | none (no code behind it)
- sources: <one or more of: code · web · operator material (<which: intent files' original input, typed chat messages; which repos and hosts>)>
- question: <the reader's questions, one a line>
- findings-only: yes — it records findings in its phase's notebook and topics; it writes no product code and spends no money
- then: explain <subject> — <unit>, for <reader>; its confirmation, redrawn from these findings, is shown for your yes when this phase passes
```

**The block's fields:**
- **subject**: what is researched, refined from the operator's words; its plain name is what a later explain's coverage greps for;
- **paths**: the subject's files and folders in this repository, or `none` when no code is behind it;
- **sources**: what the research reads, one or more of `code`, `web` and `operator material` (naming which material: intent files' *Original Input*, typed chat messages, and from which repositories and hosts). Each source brings its own rules (*What that `DECOMP` will cut*, below);
- **question**: the reader's questions, one a line;
- **findings-only**: always `yes`: it records findings, writes no product code and spends no money;
- **then**: the explain the research is for, its unit and reader. It is what *When it passes* (below) acts on.

**A legacy block** (from a plugin older than 0.11.0: five lines, no `sources:` line, its `then:` asking the operator to ask again) is read as `sources: code`, with no chain: no explain follows by itself when it passes. Say once, at the confirmation: "update the knowledge plugin to 0.11.0 for the chained explain".

A research phase is an **ordinary phase**: no flag, no new `intent.md` section, no engine change. Its `research` slices already record findings, never product code, into the phase's notebook and `topics/`, and that record is what the explain reads (the plugin's §3.4 *D1: the evidence*). What the route adds is that the scope is already written down, the rules for each source, and the lines that make the record findable. It is **the explain's own research**, so it runs as the explain route does: one confirmation, then created and run (the contract's explain-route exception, "create and run their phase"):

1. **Confirm once**, at step 3, from the block: the name `Research: <subject>`; an objective such as *"read `<paths>` (or: the sources named) and record what <subject> is and does and why, as findings, so that an explain of <subject> can be written from them; findings only, no product code"*; and **the sources it will read**. For the operator's material it also names **the repository the extract lands in** (this one, in the research phase's `topics/corpus/`) and **whether that repository has a git remote** (`git remote -v`), so that the operator decides before anything is read. The operator may narrow the paths or the sources, or add questions. The one literal yes signs the name, the objective, the sources and the run in `auto`; a changed line is folded in and the whole confirmation shown again.
2. **On the yes, create and run**, in this order:
   1. `python3 scripts/workflow.py new-phase --name "Research: <subject>" --objective "..."`;
   2. fill `intent.md`: under *Original Input (verbatim)* the operator's request, the block, the explain proposal as last shown, this confirmation and the reply, word for word. Under *Confirmed Intent* write the block's lines as confirmed, one a line, the `- then: explain …` line included: **the `paths:` line and the subject's plain name are what the plugin's coverage greps `intent.md` for** (with `paths: none`, the plain name alone), so that a later explain finds this phase. (Its commits touch only its own phase folder, so the coverage's other half, `git log` over the subject's paths, never names it: these lines, and its `## Decisions` gists naming the same paths or plain name, are how it is found.) Then write what its `DECOMP` will cut (below);
   3. the intake commit (step 5);
   4. `python3 scripts/workflow.py next`, then run the phase per the `do-whole-phase` skill in **`auto`**, **on the default stream**: no `parallel-start`, whatever hint `new-phase` prints. The confirmation is the explicit `auto` the contract's decomposition carve-out requires, so `DECOMP` plans inline.

   Its stops are the usual typed `pending` ones; it has no outline gate and no acceptance gate (below).

**What that `DECOMP` will cut** (write it into `intent.md`; do not cut it here): one `--kind research --risk high` slice per part of the subject a reader asks about separately (one for a small subject), declared by the usual rule, and nothing else: no build slices. For the operator's material, a **corpus slice** comes first (also `--kind research`): its output is the extract, its manifest and its extractor, all under `topics/corpus/`, which are records, not product code; the research slices read the extract after it. Each slice reads only the sources the block names, under that source's rules:

- **Code**, as before: this repository only, the code at the commit it reads (`git log -1 --format=%h`), its comments and its history (`git log`, `git blame`).
  - Each claim is cited `<path>:L<a>-L<b>@<short sha>` (the citation form the explain re-finds, the plugin's B9 *The dossier: files, ids and entries*).
  - `Not found:` lines record what neither the code, a comment nor the history shows.
- **The web:**
  - Each outside fact carries its source beside it: title, author, section or page, URL, and the date read.
  - An `unsourced:` line marks a claim no opened source states.
  - A source that could not be opened is never cited as read.
  - Only the workspace's own search and fetch tools: a paid source is spend, and it plans at the gate.
  - **The research review re-opens a sample, at least 2 sources per topic**, and confirms that each says what is
    attributed to it.
  - The explain never re-checks the web. This sample is the web check.
- **The operator's own material**, under eight privacy rules:
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

Each slice records each finding as:
- a `## Decisions` gist line that names the subject's paths (or, with `paths: none`, its plain name) and what was found, its detail in `topics/<slug>.md`;
- in that topic, the finding with its citation or source as its source's rule says, the why where the sources show it, and, on `Not found:` or `unsourced:` lines, what none of them shows: the explain states those as gaps, never fills them;
- an operator-decision question only on `## Operator Questions`, by the usual rule.

**Reader-shaped findings.** When the `then:` reader is new to the subject, each idea is recorded in this order:
- a plain definition, a worked example with numbers, the formula with its symbols named, and why the reader
  needs it;
- then what the code does with it, and what the builders recorded.

**The research review** checks the findings against their sources: for the web, the sample of at least 2 sources per topic, re-opened; for the operator's material, the extractor's self-tests, a secret-shape scan over the extract, and a sample of the masking. The phase changes no product code and no operator-visible surface, so its acceptance gate is waived at the `DECOMP` boundary (`accept-gate <P> --waive --note "research phase: findings only, nothing the operator sees"`). It leaves no `## Doc impact` note, unless a finding shows a `docs/current/` section wrong, which gets one line.

**When it passes.** After the review's `pass` is recorded (and, for a phase that ran in a worktree, merged back), a phase whose *Confirmed Intent* has a `- then: explain` line goes on to its explain: invoke the plugin's front door through the Skill tool as `/knowledge:explain <subject> from=<P>`.
- The front door carries forward the `then:` line and the proposal as last shown (unit, reader, shape, project, lang, must-cover) as its starting draft, with `P<N>` on `phases:` beside any phase that covers the code.
- It redraws the confirmation from the findings. The sections or chapters may change, and its `Why:` line says what changed since the preview and why.
- It still waits for the **literal yes**: it shows the confirmation and ends the turn, and only a literal yes hands it to *The explain route* (*A confirmed proposal*). Nothing is created otherwise.
- Headless, it prints the confirmation and creates nothing. Under `/do-whole-phases`, the confirmation goes in the run's closing report and parks nothing: no phase exists until the yes.
- A research phase that does not pass shows nothing. A "no" leaves the research as records, which a later `/knowledge:explain <subject>` finds by coverage. A phase with no `- then: explain` line (a legacy block) goes on to nothing.
