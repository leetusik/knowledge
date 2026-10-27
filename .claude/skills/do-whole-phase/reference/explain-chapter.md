# do-whole-phase — a chapter slice (explain phase)

An explain phase's write slices come in two shapes, by `next`'s `explain_unit=`:
- **a book** cuts one slice per chapter of the signed `book/outline.md`, each topping up its own research (*A book's chapter slice*, below);
- **a document, or a chapter added to an existing book,** cuts exactly one slice `S1`, which writes from the research its `DECOMP` already led into `doc/` (*A document or a chapter: its one write slice*, at the end).

Either is **multi-span**, like a co-work critique step: the executor drafts and checks, **you** dispatch the
knowledge plugin's critic, and the executor revises once. The executor may dispatch the research agents
the skill names (`slice-executor`'s explain carve-out), and never the critic. The research and writing
rules are the knowledge plugin's `skills/explain/SKILL.md`, cited by section number and heading and never
copied here. This file keeps only what the loop adds.

## A book's chapter slice

The executor is the **lead** of the chapter's research run (§9.3 *A chapter: its top-up, then the draft*).

- **Where things live.** The slice folder holds only `plan.md` and `result.md`. Everything else is in the
  phase folder `works/phases/active/P<N>/`, for chapter `<k>` (its position) and `<key>`:
  - the draft: `book/<key>.md`, the body only (it stands in for the skill's `<tmp>/body.md`);
  - images it attaches: `book/assets/<key>/<NAME>.<ext>`, so the review's publish can re-attach them;
  - the critique: `book/critique/<key>.md`, written once by the critic;
  - the chapter's research, in the book's dossier `book/research/` (§9.3 *A chapter: its top-up, then the
    draft*), every file named for it: its state `run-ch<k>.md`, its gap files `gaps/ch<k>-r<n>.md` and
    `gaps/final-ch<k>.md`, its researchers' findings and verify batches (stems `ch<k>-…`), the overlays
    `library-ch<k>.md` and `ledger-ch<k>.md`, its map `outline-ch<k>.md` and its trace `trace-<key>.md`.
    Fetched pages go to `book/research/pages/`, which git ignores;
  - **never written by a chapter:** the book's `library.md`, `ledger.md` and the files they index, frozen
    at the outline's signature (§9.2 *Research for a book (an explain phase)*).
- **What `plan.md` names.** Every field comes from `book/outline.md` or from the slice's own `## Dispatch`; a
  field neither can fill is a gap in the outline, to be asked about and never invented in a plan
  (`reference/explain-decomposition.md`, *Each chapter's `plan.md`, later*). The plan names:
  - the chapter key and position, and its outline entry: the goal, the **reader tasks** (each with its
    deliverable), the questions, claim ids, declared gaps and **expected top-up**; the mode (change, topic or
    general), the source (a commit range, a phase, files or a subject), the stated reader, the brief
    (must-cover, leave-out, trusted sources), the dossier, and where the explain skill is installed;
  - the research mode, `full`, and the entry's **images** (none, or the names), so the executor and the
    critic judge the "Best practices & next steps" section and the attached assets against the same spec;
  - the publish fields the review's publish will use: project, book (slug, kind, title), chapter key,
    position, chapter title, lang, sources and the **tags** (2 to 5), all from the outline; the
    **summary** (optional) is written by the executor with the draft; `--co-authored-by` is the executor's
    own `attribution=` line from `## Dispatch`; `--source-repo` is the repo root;
  - **which knowledge base the check targets:** the one the plugin's config resolves (§2 *Resolve the
    knowledge base configuration*), which must be the org the review publishes into. The plan says "the
    configured knowledge base" and nothing more; it never names a URL or a key. The project is the private
    one the review publishes into, never tenant #1.

### The three spans

1. **Span 1, the executor** (the high row, as `reference/dispatch.md` resolves it; the prompt says
   `span: 1`). It runs items 1–5 of §9.3 *A chapter: its top-up, then the draft*, its state in `run-ch<k>.md`:
   - **D0b** again (§3.2 *D0b: the preflight*), the preflight's probe agents included: this is a new session;
   - **the gap check, the top-up and the chapter's gate** (items 2–4 of §9.3 *A chapter: its top-up, then the draft*). New evidence goes into the
     overlays, never the frozen files. **Every prompt it sends an agent starts with the line `slice: <id> (a
     label for the workspace's meter, not a task)`**, then the dispatch block the skill gives, so
     `dispatch-summary` attributes the nested span and a general agent does not take the line for a task. The
     optional **`sources` chapter** skips them: it lists the book's `library.md` and every chapter's
     overlay, adds no evidence, and dispatches no agent. The executor is a subagent, so a background
     agent's completion never reaches it: the probe agent A and every wave go in the foreground, a wave's
     calls in one message (§3.2 *D0b: the preflight*, §3.5 *D2: a wave*);
   - **the chapter's outline and draft** (item 5 of §9.3 *A chapter: its top-up, then the draft*, by §3.10 *D6: the final outline, the reader's path*
     and §4 *Write the chapter — native Markdown*): `outline-ch<k>.md` opens with `## Reader's task`, the
     reader tasks of the chapter's outline entry with their deliverables, then the reader's path with its
     word budgets and `## Not used`. D7 writes `book/<key>.md` in that section's three passes, under its prose rules,
     keeping `trace-<key>.md` as it goes: the outline's diagrams and figures, callouts, the quiz the
     outline names, sources;
   - **the read-through and the check**, by *The read-through and the check* below;
   - write `result.md`: the verdict block first, then a `## Publish` section (below), then its log;
   - return `done` with `critic_ready: yes`.

   **A research stop in span 1** returns instead, with no `critic_ready`, and a re-dispatch goes on from
   `run-ch<k>.md`:
   - `FAILED: permissions` (§3.2 *D0b: the preflight*): `needs_operator`, with the rules block the skill printed;
   - `failed: search-limit`: `needs_operator`; the operator raises the cap or starts a new session;
   - `FAILED: web research unavailable`: `blocked`;
   - **below the chapter's gate** (item 4 of §9.3 *A chapter: its top-up, then the draft*): `needs_operator`, with the failing must-cover items and
     questions. The operator answers `trust <source>` (one more round on those items, beyond the ceiling)
     or `drop <item>` (out of this chapter's must-cover), as the resume note of §3.3 *`run.md`, and
     resuming a run* says, or changes the chapter. Their words go verbatim into `plan.md` as
     `## Attempt <n>`, and span 1 runs again.

   Any other verdict is handled as usual (`reference/verdicts.md`), and no critic runs.
2. **Span 2, you dispatch the critic:** `knowledge:explain-critic`, with `model: opus` on the call (the rule
   below), and like every span (`reference/verdicts.md`): in the background, waiting for its
   completion notification. §4.10 *D8: the critic, one revision, then publish* has its lead dispatch the
   critic in the foreground, because a headless `claude -p` session stopped a background critic after ten
   idle minutes; that is the lead's rule inside its own run, and your main thread is the interactive
   session the workspace runs in. The prompt is the line `slice: <id>`, then the B5 *Critic
   (`knowledge:explain-critic`)* dispatch block filled in, every path from the repo root:

   ```
   slice: <P>.S<k>
   mode: critique · kind: chapter
   draft: works/phases/active/P<N>/book/<key>.md · critique: works/phases/active/P<N>/book/critique/<key>.md · dossier: works/phases/active/P<N>/book/research
   skill: <the skill path plan.md names> · scratch: works/phases/active/P<N>/book/research/pages/critic-<key>
   writer_model: <the model= line span 1 ran on> · same-model: accepted
   chapter: slice: <P>.S<k> · phase: P<N> · key: <key> · plan: works/phases/active/P<N>/slices/<P>.S<k>/plan.md
   ```

   The scratch folder sits under the dossier's `pages/`, so what the critic fetches stays out of git. It is
   a long span (up to 120 turns, its frontmatter's `maxTurns`) and writes `book/critique/<key>.md`: findings by severity (`must-fix`, `should-fix`, `note`), confidence and
   evidence, its `reader` category included (a reader task the chapter does not serve is a must-fix). Read
   **only its verdict block**. A `blocked` critic (a wrong model, a missing outline) is fixed and
   re-dispatched once; a second `blocked`, or any failure twice, STOPs: set the slice `pending` with
   `--stop-kind decision` (a critic stop) and tell the operator.
3. **Span 3, the executor**, resumed with `SendMessage` (`span: 3`, the critique path), or re-dispatched
   from disk on the same route if it is gone (it reads `plan.md`, its own `result.md`, the draft,
   `trace-<key>.md` and the critique). It answers the critique per steps 2–3 of §4.10 *D8: the critic,
   one revision, then publish*, without the confirm pass:
   - answer every `must-fix`, and the `should-fix`s it agrees with, in **one** revision, with no new
     evidence: a fix the frozen indexes and the chapter's overlays cannot support removes the sentence or
     states the point as open, and `trace-<key>.md` follows every changed sentence;
   - record in `result.md` a `## Critique answers` section, one line per finding:
     `C01 · fixed | disputed | declined · <how, or why not>`. A disputed `must-fix` keeps its evidence there;
   - re-read the changed parts per §4.8 *Before you publish* and re-run `knowledge check` to exit 0 (exit 2
     per span 1's rule); if the revision changed any flag, rewrite `## Publish` to match;
   - add a `## Notes for later slices` entry to `phase.md` for later chapters: the terms this chapter
     defines and the heading ids to link to, as corrected;
   - rewrite the verdict block as the final one (`critique: answered`, `disputed: <ids> | none`) and return.

   This span always runs, even on a critic `pass`: it is where the critique is answered and recorded.

**No second critic round, and no confirm pass.** A `must-fix` the executor disputes stays in `result.md` with
its reason, and the phase review decides it, beside the book.

## The read-through and the check (every write slice)

- Read the draft through per §4.8 *Before you publish*, and also read each diagram's **order of steps** and
  each quiz key against the code, not from memory: these are where the rehearsal's critic found its two
  must-fixes.
- Run `knowledge check` per §4.9 *Check* with the publish's flags and fix it to exit 0. **Exit 2 is not one
  case; read stderr:**
  - `has no /api/documents/check (HTTP 404 or 405)`, or argparse's `invalid choice: 'check'` (a CLI before
    0.2.0): skip the check with a line in `result.md`, as §4.9 *Check* says;
  - `cannot reach …`, `your API key was rejected`, or `no verdict from the server`: **not a skip.** The
    draft was never checked and the review's publish would fail the same way. Return `blocked` for an
    unreachable server and `needs_operator` for a rejected key; do not return `critic_ready: yes`.

  The same list at exit 1 twice is the executor's two-strike rule: return `blocked` (the high row never
  escalates).

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
  co-authored-by, the book and chapter flags (a book's chapter, or a chapter unit), a v2 document's
  `--new-version --rel-path <rel_path>`, and the assets.

The review swaps `check` for `save`; nothing else in the line changes.

## The critic's model

The critic runs on **`opus`**, whatever model drafted the chapter: pass `model: opus` on the call (the
plugin's frontmatter names another model, and §4.10 *D8: the critic, one revision, then publish* picks the other family). The fresh eyes are a fresh
context, and the operator dropped the different-model rule (v75). The plugin's critic still refuses a writer
of its own family (`blocked`) unless the dispatch says `same-model: accepted`, so every block in this file
carries it. For an Opus draft (the high row's default) its verdict then reads `critic_model: <id> (same
model, degraded)`. That label is expected here, not a defect: record it as it comes, and never treat it as
a finding, a stop or a reason to re-dispatch.

This needs **no engine change**: the critic has no row in the route table and no file in this workspace.
The plugin ships it, and you apply the rule per call.

## Records, limits and the commit

- `record-dispatch` once, after the last span, with its verdict; span 1's `done` is not a slice verdict
  (unless it is the only span, under `run: quick`). The critic's span and the research agents' spans are
  metered from the transcripts, attributed by their `slice:` line, never recorded.
- A usage limit in any span is resumed or re-dispatched per `reference/dispatch.md` (5); it is never a
  verdict. Span 1 re-dispatched from disk goes on from its run state (`run-ch<k>.md`, or `doc/run.md`).
- A write slice runs on the high row, so it never escalates: a `blocked` or `needs_operator` return stops
  the run (`reference/verdicts.md`).
- Only after the last span returns `done`: `finish-slice`, then **one commit** carrying the draft, its
  assets, the critique, the slice's research or run files, `result.md` and `phase.md`. **Check the freeze
  first:** `git status --short` (nested: `git -C workflow status --short`):
  - a book's chapter may show, under `book/research/`, only files named for this chapter (`ch<k>-…`,
    `…-ch<k>.md`, `trace-<key>.md`). A change to `library.md`, `ledger.md` or another file of the
    whole-book run breaks the freeze;
  - a document's or a chapter unit's `S1` may show, under `doc/`, only `body.md`, `trace.md`,
    `critique.md`, `assets/` and `run.md`. A change to `library.md`, `ledger.md`, `findings/`, `verify/`
    or `gaps/` means the write slice moved the evidence `DECOMP` gathered.

  Either: STOP and tell the operator. Nothing is published: the phase review publishes.

## A document or a chapter: its one write slice

`S1` of a document or a chapter unit writes from the research its `DECOMP` led (`reference/explain-decomposition.md`,
*A document or a chapter*). It runs no research of its own: no D0b, no gap check, no top-up, and no
research agent. With `outline sign-off: on` it starts only after the operator's `accept`.

- **Where things live:** the phase's dossier `works/phases/active/P<N>/doc/`, the plugin's `<DOSSIER>`, so
  the paths of §4 *Write the chapter — native Markdown* and §5 *Publish via the KB document API* need no
  translation (`<tmp>` is `<DOSSIER>`, as §2 *Resolve the knowledge base configuration* says): the draft `doc/body.md`, its trace `doc/trace.md`,
  images `doc/assets/<NAME>.<ext>`, the critique `doc/critique.md`, the run's state `doc/run.md`. Fetched
  pages, if any, go to `doc/pages/`, which git ignores.
- **What `plan.md` names:** drawn from `## Explain`, `doc/brief.md`, `doc/outline.md` and the `DECOMP`'s
  `## Decisions` gist (`reference/explain-decomposition.md`, *S1's `plan.md`, later*): the skill's path and
  version, the dossier and its run id, the run (`full`, `quick` or `no-research`), the reader, the brief,
  the prior, and the publish fields. A field none of them fills is a gap: ask, never invent it.
- **Span 1, the executor** (`span: 1`): D7 by §3.10 *D6: the final outline, the reader's path* and §4
  *Write the chapter — native Markdown*, from `doc/outline.md`'s `## Reader's task` and path, keeping
  `doc/trace.md`; a chapter also honours `## The book` (it uses no term a later chapter defines without
  defining it, and links earlier chapters' keys as `chapter:` links). Under `no-research`, the draft has no
  "Best practices & next steps" section and no sources block unless the operator gave pages (§3.9 *`quick`
  and `no-research`*). Then *The read-through and the check*, `result.md` with its `## Publish` section,
  and `done` with `critic_ready: yes`, or, under **`quick`**, the final verdict (`critique: none (quick)`):
  §4.10 *D8: the critic, one revision, then publish* sends `quick` straight to the publish, so `S1` is one span and no critic runs.
- **Span 2, you dispatch the critic** (`full` and `no-research`): as for a book, in the background, with
  `model: opus`, the B5 *Critic (`knowledge:explain-critic`)* dispatch block for a **document** (on plugin 0.6.0 a chapter unit is judged as a
  document too; the order against its book is the review's check):

  ```
  slice: <P>.S1
  mode: critique · kind: document
  draft: works/phases/active/P<N>/doc/body.md · critique: works/phases/active/P<N>/doc/critique.md · dossier: works/phases/active/P<N>/doc
  skill: <the skill path plan.md names> · scratch: works/phases/active/P<N>/doc/pages/critic
  writer_model: <the model= line span 1 ran on> · same-model: accepted
  ```

  It reads `doc/brief.md` and `doc/outline.md` and writes `doc/critique.md`. A critic failing twice is the
  same `--stop-kind decision` stop as a book's.
- **Span 3, the executor** answers it as a book's chapter does (one revision, no new evidence, no confirm
  pass, `## Critique answers`, §4.8 *Before you publish* and §4.9 *Check* again, `## Publish` rewritten if a flag changed), with
  `doc/trace.md` following every changed sentence, and returns the final verdict (`critique: answered`,
  `disputed: <ids> | none`). A disputed `must-fix` is the review's to decide.
