# do-whole-phase — a chapter slice (explain phase)

An explain phase's write slices come in two shapes, by `next`'s `explain_unit=`:
- **a book** cuts one slice per chapter of the signed `book/outline.md`, each reading its own phases closer before it writes (*A book's chapter slice*, below); its chapters are declared and run at once (*Chapters at once (a wave)*);
- **a document, or a chapter added to an existing book,** cuts exactly one slice `S1`, which writes from the evidence its `DECOMP` already read into `doc/` (*A document or a chapter: its one write slice*, at the end).

Either is **multi-span**, like a co-work critique step: the executor writes and checks, **you** dispatch the
knowledge plugin's critic on a second model, and the executor revises once. The executor is the plugin's
writer: it reads the code and the phases' records itself (a subject book: the records alone, a research
phase's findings among them) and dispatches no agent (`slice-executor`'s explain carve-out), never the
critic. The evidence and writing rules are the knowledge plugin's `skills/explain/SKILL.md`, cited by
section number and heading and never copied here. This file keeps only what the loop adds.

## A book's chapter slice

The executor writes chapter `<k>` by §9.3 *A chapter: its evidence, then the draft*.

- **Where things live.** The slice folder holds only `plan.md` and `result.md`. Everything else is in the
  phase folder `works/phases/active/P<N>/`, for chapter `<k>` (its position) and `<key>`:
  - the draft: `book/<key>.md`, the body only (it stands in for the skill's `<tmp>/body.md`);
  - images it attaches: `book/assets/<key>/<NAME>.<ext>`, so the review's publish can re-attach them;
  - the critique: `book/critique/<key>.md`, written once by the critic;
  - the chapter's record, in the book's dossier `book/research/` (§3.3 *The record, and resuming a run*),
    every file named for it: its overlay `evidence-ch<k>.md` (entries `E-ch<k>-<nn>`), its map
    `outline-ch<k>.md`, its trace `trace-<key>.md` and its answers `answers-<key>.md`;
  - **never written by a chapter:** the book's `brief.md` and `evidence.md`, frozen at the outline's
    signature (§9.2 *The evidence for a book (an explain phase)*), and `book/outline.md`, the signed outline.
- **What `plan.md` names.** Every field comes from `book/outline.md` or from the slice's own `## Dispatch`; a
  field neither can fill is a gap in the outline, to be asked about and never invented in a plan
  (`reference/explain-decomposition.md`, *Each chapter's `plan.md`, later*). The plan names:
  - the chapter key and position, and its outline entry: the goal, the phases (and slices) it draws from,
    its signed sections, the **reader tasks** (each with its deliverable), its entry ids, gaps and open
    items; the mode (change or topic), the stated reader, the brief (must-cover, leave-out, trusted
    sources), the dossier, its run id and the commit, and where the explain skill is installed;
  - the entry's diagrams and figures, its quiz targets (when its Quiz is signed) and its **images** (none,
    or the names), so the executor and the critic judge the chapter and its attached assets against the
    same spec;
  - the outline's **pins** it uses: the one-line recap of each term it builds on, the book's names, the
    running examples it uses with their numbers, and the link ids it may link to; for the synthesis
    chapter, the chapters it draws on;
  - its **set** (its `## <slice id>` block in `topics/breakdown.md`), which the `## Wave` section carries
    when it runs beside other chapters (*Chapters at once (a wave)*);
  - the publish fields the review's publish will use: project, book (slug, kind `codebase` or `subject`
    and a subject book's label, title), chapter key, position, chapter title, lang, sources and the
    **tags** (2 to 5), all from the outline; the
    **summary** (optional) is written by the executor with the draft; `--co-authored-by` is the executor's
    own `attribution=` line from `## Dispatch`; `--source-repo` is the repo root;
  - **which knowledge base the check targets:** the one the plugin's config resolves (§2 *Resolve the
    knowledge base configuration*), which must be the org the review publishes into. The plan says "the
    configured knowledge base" and nothing more; it never names a URL or a key. The project is the private
    one the review publishes into, never tenant #1.

### The three spans

1. **Span 1, the executor** (the high row, as `reference/dispatch.md` resolves it; the prompt says
   `span: 1`). It runs items 1–2 of §9.3 *A chapter: its evidence, then the draft*, alone:
   - **the chapter's evidence** (item 1): its outline entry and the frozen entries it names, then a closer
     reading of the records of the phases it draws from and of their code, for its signed sections only,
     into the overlay `evidence-ch<k>.md`, never the frozen files;
   - **the chapter's map and draft** (item 2, by §3.10 *D6: the final outline, the reader's path* and §4
     *Write the chapter — native Markdown*): `outline-ch<k>.md` opens with `## Reader's task`, the reader
     tasks of the chapter's outline entry with their deliverables, then the reader's path, the chapter's
     sections as signed in `book/outline.md`, with their word budgets and `## Not used`. D7 writes
     `book/<key>.md` under §4's prose rules, keeping `trace-<key>.md` as it goes: the outline's diagrams and
     figures, callouts, the Quiz and the Next steps part where signed, and the Sources section (§4.6
     *Sources*). It recaps a term with the outline's recap line, uses the outline's names and running
     numbers, and links only to the ids it pins, never to what another chapter's draft says
     (§9.3 *A chapter: its evidence, then the draft*);
   - **the read-through and the check**, by *The read-through and the check* below;
   - write `result.md`: the verdict block first, then a `## Publish` section (below), then its log;
   - return `done` with `critic_ready: yes`.

   **A stop in span 1** returns instead, with no `critic_ready`, and a re-dispatch goes on from the record
   (§3.3 *The record, and resuming a run*): `FAILED: permissions` (§3.2 *Permissions, and the payload
   builder*) is `needs_operator`, with the rules block the skill printed. Nothing else in span 1 is a stop:
   a gap is stated or dropped, and a section the evidence cannot carry is cut to `## Not used`.

   Any other verdict is handled as usual (`reference/verdicts.md`), and no critic runs.
2. **Span 2, you dispatch the critic:** `knowledge:explain-critic`, with its model on the call (*The
   critic's model*, below), and like every span (`reference/verdicts.md`): in the background, waiting for
   its completion notification. §4.10 *D8: the critic, one revision, then publish* has its writer dispatch
   the critic in the foreground, because a headless `claude -p` session stopped a background critic after
   ten idle minutes; that is the writer's rule inside its own run, and your main thread is the interactive
   session the workspace runs in. The prompt is the line `slice: <id>`, then the dispatch block of B5
   *Critic (`knowledge:explain-critic`)*, its *Your dispatch*, filled in, every path from the repo root. The
   field set is that block's, read from the installed skill at dispatch; these blocks are that set filled
   with this workspace's paths, a line B5 has and a block lacks is filled from B5, and B5 wins on any
   difference:

   ```
   slice: <P>.S<k>
   mode: critique · kind: chapter
   draft: works/phases/active/P<N>/book/<key>.md · critique: works/phases/active/P<N>/book/critique/<key>.md · dossier: works/phases/active/P<N>/book/research
   skill: <the skill path plan.md names>
   writer_model: <the model= line span 1 ran on>
   title: <the chapter title plan.md names>[ · kept][ · book: <the book's title>]
   chapter: slice: <P>.S<k> · phase: P<N> · key: <key> · plan: works/phases/active/P<N>/slices/<P>.S<k>/plan.md
   ```

   The `title:` value is the outline's chapter title in `plan.md`; `· book:` goes only on a new book's
   first chapter slice by `order`, and `· kept` only on an existing chapter's next version (`prior:`).
   There is no `scratch:` line: the critic fetches nothing, and ignores one an older block sends.

   It is a long span (up to 120 turns, its frontmatter's `maxTurns`) and writes `book/critique/<key>.md`:
   findings by severity (`must-fix`, `should-fix`, `note`), confidence and evidence, checked against the code
   at the commit and the record lines themselves (B5 *Critic (`knowledge:explain-critic`)*, *How you
   check*): a sentence from outside the code and the records (`outside`) is a must-fix even when true, and
   a reader task the chapter does not serve (`reader`) is a must-fix. Read **only its verdict block** (its
   `trace:` and `coverage:` lines among it). A `blocked` critic (a wrong model, a missing outline, a denied
   call) is fixed and re-dispatched once; a second `blocked`, or any failure twice, STOPs: set the slice
   `pending` with `--stop-kind decision` (a critic stop) and tell the operator.
3. **Span 3, the executor**, resumed with `SendMessage` (`span: 3`, the critique path), or re-dispatched
   from disk on the same route if it is gone (it reads `plan.md`, its own `result.md`, the draft,
   `trace-<key>.md`, its overlay and the critique). It answers the critique by item 3 of §9.3 *A chapter:
   its evidence, then the draft*, which is steps 2–3 of §4.10 *D8: the critic, one revision, then
   publish*:
   - answer every finding in `book/research/answers-<key>.md`, one line each:
     `C01 · fixed | disputed | declined · <how, or why not>`. Fix every `must-fix` or remove its sentence,
     and the `should-fix`s it agrees with, in **one** revision. A fix may read the chapter's phases and code
     again, as a new entry in its overlay `evidence-ch<k>.md` (never the frozen files, never anything from
     outside them); a point they do not support is removed or stated as a gap. A disputed `must-fix` keeps
     its evidence (a code range, a record line) on its line. `trace-<key>.md` is appended to for every
     changed sentence (B9 *The dossier: files, ids and entries*, *The trace*);
   - re-read the changed parts per §4.8 *Before you publish* and re-run `knowledge check` to exit 0 (exit 2
     per span 1's rule); if the revision changed any flag, rewrite `## Publish` to match;
   - a `must-fix` neither fixed nor disputed with evidence is `STOPPED: critic` (§4.10, step 3): return
     `needs_operator` with its ids, and you set the slice `pending --stop-kind decision` (a critic stop);
   - write the chapter's note, a `## Notes for later slices` entry tagged for the later chapters and the
     `REVIEW`: the terms this chapter taught, the heading ids a later chapter may link to as an extra (as
     the outline pins them, or as corrected), and its **corrections**, every fix it made to a fact that
     `book/outline.md` or the frozen `evidence.md` states (the frozen files themselves stay untouched), or
     `none`. The review checks each correction in every other chapter. **In a wave** (`plan.md` carries
     `## Wave`) the note goes in the verdict's `notebook` field, never into `phase.md`, and you write it at
     its return (*Chapters at once (a wave)*);
   - rewrite the verdict block as the final one (`critique: answered`, `disputed: <ids> | none`,
     `corrections: <one line each> | none`, the answers file's path) and return.

   This span always runs, even on a critic `pass`: it is where the critique is answered and recorded.

**No second critic round.** A `must-fix` the executor disputes stays in `answers-<key>.md` with its
evidence, and the phase review decides it, beside the book.

## Chapters at once (a wave)

A book's chapters are declared (`reference/explain-decomposition.md`, *A book*), so once the outline is
signed they run as a wave, and `reference/wave.md` holds whole: each plan's `## Wave` section, the sets,
the check at each return, the rolling commits, the stops and *Resume*. What follows is what a book's
chapters add to it, and only they: a document's or a chapter unit's `S1` runs alone, and `/do-next-slice`
never runs a wave (its `reference/verdicts.md`), so there each chapter runs alone, its three spans as
above.

**At most 4 chapters in flight.** A chapter is in flight while it is `in_progress` (`running_slices=`
lists it), whichever of its three spans runs, and between them. Start the ready chapters by `order` until
4 are in flight; as each one finishes (*At each return*, its commit included), start the next ready one.
This is the one cap on a wave, an exception to `wave.md`'s "no cap": a chapter is three long spans, its
critic up to 120 turns, and the cap bounds the burst and the returns you handle at once. The engine does
not hold it (`ready_slices=` lists every ready chapter, and `parallel-plan` prints them in one round), so
count it yourself from `running_slices=` before every start, *Resume*'s included. The operator's word
lifts it for the run; record that as a `## Decisions` line, where a later session finds it. The cap is
fixed in advance, never a response to a limit: you never stagger a wave to dodge one
(`reference/dispatch.md`, (5)).

**Span 1 and the critic return; the slice does not.** A chapter's three spans are one slice, and only
the last return is the slice's:
- **span 1's `done` with `critic_ready: yes` is not a slice return:** no `record-dispatch`, no set check,
  no `finish-slice`, no notebook write and no commit. Dispatch that chapter's critic at once, in the
  background (span 2, above), never waiting for a sibling;
- **the critic's return is not one either:** read only its verdict block, then resume span 3 at once,
  with `SendMessage` to span 1's executor, or, if it is gone, by a re-dispatch from disk on the same
  route with its `## Wave` section rewritten (the same set; the chapters running and the commits waiting
  now);
- **span 3's final verdict (`critique: answered`) is the slice's return.** It takes *At each return*
  whole: `record-dispatch` once, the set check, `finish-slice`, its `notebook` entries (the chapter's
  note among them), `validate` and its own rolling commit. Then the next ready chapter starts.

Each chapter runs on its own clock, and you take returns one at a time, in the order they come in: a
span-1 return dispatches its critic, a critic's return resumes its span 3, and a span-3 return finishes
its slice. Give every span a dispatch description that names its chapter and span (`<P>.S<k> span 1`,
`<P>.S<k> critic`, `<P>.S<k> span 3`), so the resume card's running spans say whose span still runs.

**Stops.** A stop in any chapter's span goes to disk the moment it returns
(`wave.md`, *Stops and retries*): span 1's `needs_operator` or `blocked`, a critic that fails twice
(span 2's `--stop-kind decision`), span 3's `STOPPED: critic`, or a failed or empty return. Nothing new
starts after it, but a chapter already in flight still runs its own spans to its final return, its
critic and its span 3 included: they are its spans, not starts. Each is then finished and committed, and
the run stops with every stop reported.

**Usage limits.** A limit in any span, span 1, the critic or span 3, is `reference/dispatch.md` (5):
never a verdict, and nothing is recorded for it. Resume that span with `SendMessage`, or re-dispatch it
from disk: span 1 and span 3 go on from the record (§3.3 *The record, and resuming a run*), and a critic
starts again from its dispatch block (it writes its file once). A limit with no reset time sets that
chapter `pending --stop-kind limit`, a stop like those above.

**What a chapter sees of the others: nothing in flight.** Its writer recaps, names and links from the
outline's pins (span 1, above). Its critic reads an earlier chapter only as committed, by
`git -C <the draft's folder> show HEAD:./<its file>` (B5 *Critic (`knowledge:explain-critic`)*, *Inputs*),
the folder exactly as its dispatch block's `draft:` writes it (`works/phases/active/P<N>/book`), and judges
a sibling still in flight by the outline's recap lines. `HEAD:./` resolves in that folder's own
repository, so the one command reads the nested repo when nested (the host never tracks `workflow/`) and
this repo at the root, from the same working folder: in a run with one chapter at a time every earlier
chapter is committed and read, in both layouts, so nothing changes there. The synthesis chapter starts
only once every chapter it draws on is `done` and committed (its declaration binds, and a held commit
holds every start: `wave.md`, *At each return*, step 5), so it reads them finished. A correction reaches
the other chapters through its note, and the review checks it in each of them
(`reference/explain-review.md`).

**Where each chapter is, read from disk alone.** The resume card's `returned=`, and its next action, read
any `result.md` that exists as a return; after span 1 it is not one. So at every session start, after
every compaction and before every start or commit (`wave.md`, *Resume*), read each `in_progress` chapter
from its files, never from memory:
- **no `result.md`, or a head that is not `done`:** span 1 has not returned `critic_ready: yes`. Handle it
  as *Resume* handles any slice: wait for a running span, else re-dispatch span 1 from disk, which goes on
  from the record;
- **a head `done` with `critic_ready: yes` and no `critique: answered`:** span 1 has returned.
  - `book/critique/<key>.md` exists with its `- verdict:` line: the critic has returned. Resume span 3,
    with `SendMessage` while its executor lives, else from disk;
  - no critique file: the critic is still running (the card's running spans name it: wait), or it never
    ran or died with its session: dispatch it now (span 2);
- **a head with `critique: answered`:** span 3 has returned, and with it the slice: finish it by
  *At each return*.

Wait for every running span and never re-dispatch one; at a fresh session's start none is running. Then
start chapters only while no stop is on disk, no held commit holds starts, and fewer than 4 are in
flight.

## The read-through and the check (every write slice)

- Read the draft through per §4.8 *Before you publish*, and also read each diagram's **order of steps** and
  each quiz key against the code, not from memory: these are where the rehearsal's critic found its two
  must-fixes.
- Run `knowledge check` per §4.9 *Check* with the publish's flags and fix it to exit 0 (a document's or a
  chapter unit's `S1` runs that section's record line first; a book's chapter skips it). **Exit 2 is not
  one case; read stderr:**
  - `has no /api/documents/check (HTTP 404 or 405)`, or argparse's `invalid choice: 'check'` (a CLI before
    0.2.0): skip the check with a line in `result.md`, as §4.9 *Check* says;
  - `cannot reach …`, `your API key was rejected`, or `no verdict from the server`: **not a skip.** The
    draft was never checked and the review's publish would fail the same way. Return `blocked` for an
    unreachable server and `needs_operator` for a rejected key; do not return `critic_ready: yes`.

  The same list at exit 1 twice (`STOPPED: check`) is the executor's two-strike rule: return `blocked` (the
  high row never escalates).

## The `## Publish` section

It is the exact command that exited 0, **minus its target**, so that the review can turn it into the
publish by changing one word:
- start it `knowledge check <draft> …`, with the draft path and every `--asset NAME=PATH` relative to the
  **repo root** (`works/phases/active/P<N>/book/<key>.md`, or `works/phases/active/P<N>/doc/body.md`),
  because the review runs from there;
- leave out `--base-url`, the token and `--json`, and put no environment variable in front. Whoever runs
  it adds the global `--base-url <KB_API_BASE_URL>` before the subcommand, from §2 *Resolve the knowledge
  base configuration* (`knowledge --base-url <KB_API_BASE_URL> check …`), and the review adds `--json`
  and the credential;
- keep every other flag: `--format native`, title, tags, summary, lang, project, source-repo,
  co-authored-by, the book and chapter flags (a book's chapter, or a chapter unit: the book's kind, and a
  subject book's label, by §5 *Publish via the KB document API*), a v2 document's
  `--new-version --rel-path <rel_path>`, and the assets.

The review swaps `check` for `save`; nothing else in the line changes.

## The critic's model

The critic runs on **a model of the other family from the writer's** (§4.10 *D8: the critic, one
revision, then publish*, step 1; B5 *Critic (`knowledge:explain-critic`)*, *Your model*). Name it on the
call: **`model: sonnet`** when span 1 ran on an Opus model (the high row's default), and `model: opus`
when it ran on any other. The dispatch never says `same-model: accepted`: that line is for a host that
cannot pick a model, and this one picks it per call. A critic that returns `blocked` for the writer's
model was sent on the wrong one: correct the call and dispatch it once more. Record its `critic_model:`
as it comes.

The fresh eyes are a fresh context **and** a second model: the knowledge plugin's own rule, and the
operator's word for the explain ("a critic on a second model"). This replaces v75's rule of `opus` with
`same-model: accepted` for every chapter. It needs **no engine change**: the critic has no row in the
route table and no file in this workspace. The plugin ships it, and you apply the rule per call.

## Records, limits and the commit

- `record-dispatch` once, after the last span, with its verdict; span 1's `done` is not a slice verdict.
  The critic's span is metered from the transcripts, attributed by its `slice:` line, never recorded.
- A usage limit in any span is resumed or re-dispatched per `reference/dispatch.md` (5); it is never a
  verdict. Span 1 re-dispatched from disk goes on from the record (§3.3 *The record, and resuming a run*).
- A write slice runs on the high row, so it never escalates: a `blocked` or `needs_operator` return stops
  the run (`reference/verdicts.md`); in a wave, by `wave.md`'s *Stops and retries*
  (*Chapters at once (a wave)*, above).
- Only after the last span returns `done`: `finish-slice`, then **one commit per chapter** carrying the
  draft, its assets, the critique, the chapter's record files, `result.md` and `phase.md`. In a wave it is
  *At each return*'s rolling commit, made the moment the chapter finishes: its set's dirty paths, then its
  workflow state (the book has no join-rebuilt artifact). **Check the freeze first:** `git status --short`
  (nested: `git -C workflow status --short`):
  - a book's chapter may show, under `book/research/`, only files named for this chapter
    (`evidence-ch<k>.md`, `outline-ch<k>.md`, `trace-<key>.md`, `answers-<key>.md`). A change to
    `brief.md`, `evidence.md`, another chapter's file or `book/outline.md` breaks the freeze. **In a
    wave, scope the check to this chapter's set and the frozen files**
    (`git status --short -- <its set> <the frozen brief.md, evidence.md and book/outline.md>`): the other
    chapters in flight have dirty files too, which are theirs, and *At each return*'s set check judges
    them; a change to a frozen file still breaks the freeze;
  - a document's or a chapter unit's `S1` may show, under `doc/`, only `body.md`, `trace.md`,
    `critique.md`, `answers.md`, `assets/`, and `evidence.md` with entries **appended**: a writer gap read
    at D7, or a fix's new entry at D8 (§3.3 *The record, and resuming a run*; §4.10, step 2). `git diff --
    <its path>` then shows only added lines, bar the closing counts line they replace. A change to
    `brief.md` or `outline.md`, or to an entry `evidence.md` already had, means the write slice moved what
    `DECOMP` gathered.

  Either: STOP and tell the operator. Nothing is published: the phase review publishes.

## A document or a chapter: its one write slice

`S1` of a document or a chapter unit writes from the evidence its `DECOMP` read (`reference/explain-decomposition.md`,
*A document or a chapter*). It reads more only for a writer gap or a fix (a new entry appended to
`doc/evidence.md`), and dispatches no agent. With `outline sign-off: on` it starts only after the
operator's `accept`.

- **Where things live:** the phase's dossier `works/phases/active/P<N>/doc/`, the plugin's `<DOSSIER>`, so
  the paths of §4 *Write the chapter — native Markdown* and §5 *Publish via the KB document API* need no
  translation (`<tmp>` is `<DOSSIER>`, as §2 *Resolve the knowledge base configuration* says): the draft
  `doc/body.md`, its trace `doc/trace.md`, images `doc/assets/<NAME>.<ext>`, the critique `doc/critique.md`,
  the answers `doc/answers.md`. The git-ignored `doc/pages/` holds at most the payload builder's fallback copy.
- **What `plan.md` names:** drawn from `## Explain`, `doc/brief.md`, `doc/outline.md` and the `DECOMP`'s
  `## Decisions` gist (`reference/explain-decomposition.md`, *S1's `plan.md`, later*): the skill's path and
  version, the dossier, its run id and the commit, the covering phases, the reader, the brief, the prior,
  and the publish fields. A field none of them fills is a gap: ask, never invent it.
- **Span 1, the executor** (`span: 1`): D7 by §3.10 *D6: the final outline, the reader's path* and §4
  *Write the chapter — native Markdown*, from `doc/outline.md`'s `## Reader's task` and path, keeping
  `doc/trace.md`; a chapter also reads `## The book` for what earlier chapters teach, so it can recap that
  briefly per §4 *Write the chapter — native Markdown*, *Standalone* (a `chapter:` link only as an extra).
  Then *The read-through and the check*, `result.md` with its `## Publish` section, and `done` with
  `critic_ready: yes`. A stop is span 1's of a book's chapter (`FAILED: permissions`).
- **Span 2, you dispatch the critic:** as for a book, in the background, with the model by *The critic's
  model*, the B5 *Critic (`knowledge:explain-critic`)* dispatch block for a **document** (a chapter unit is
  judged as a document too; the order against its book is the review's check):

  ```
  slice: <P>.S1
  mode: critique · kind: document
  draft: works/phases/active/P<N>/doc/body.md · critique: works/phases/active/P<N>/doc/critique.md · dossier: works/phases/active/P<N>/doc
  skill: <the skill path plan.md names>
  writer_model: <the model= line span 1 ran on>
  title: <the --title of S1's ## Publish>[ · kept]
  ```

  The field set is B5's (*Your dispatch*), as the sentence above the chapter block says. The `title:` value
  is the `--title` of S1's `## Publish`, which you read before this span; a chapter unit sends its chapter
  title from `plan.md`'s publish fields, with `· kept` only on an existing chapter's next version, and a v2
  loose document sends its title with no `kept`.

  It reads `doc/brief.md`, `doc/outline.md`, `doc/evidence.md` and `doc/trace.md` and writes
  `doc/critique.md`. A critic failing twice is the same `--stop-kind decision` stop as a book's.
- **Span 3, the executor** answers it as a book's chapter does, in `doc/answers.md` (§4.10 *D8: the critic,
  one revision, then publish*, steps 2–3: one revision, a fix's new evidence appended to `doc/evidence.md`,
  §4.8 *Before you publish* and §4.9 *Check* again, `## Publish` rewritten if a flag changed), with
  `doc/trace.md` appended to for every changed sentence, and returns the final verdict
  (`critique: answered`, `disputed: <ids> | none`). A disputed `must-fix` is the review's to decide.
