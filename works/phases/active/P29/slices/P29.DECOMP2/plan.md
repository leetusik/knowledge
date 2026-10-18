# P29.DECOMP2 — cut the design waves from the research

## Context

The research half of P29 is done. P29.S1, S2 and S3 settled the learning reader's data contracts; they
are in `phase.md` → `## Decisions`. `DECOMP2` turns them into design work: co-work slices holding waves
of jobs, one job per surface, each job with a critique level. It also finalizes the build inventory that
P30 will build from.

The approved P29.DECOMP plan made this the gate where you see the research and every open question
before any design handoff locks a contract. So:
- **Part A** is for you.
- **Part B** is the cut that `slice-executor-high` makes (the high row, opus @ high).

---

## Part A — for you

### What I need from you when you approve

1. **Q4–Q8 below.** They shape the design. Say "defaults" or change any of them.
2. **Three taste questions for the reader's look.** Answer in your own words; I'll quote you in the
   handoff:
   1. the mood you want for long reading;
   2. readers you like (Apple Books, Kindle, Readwise Reader, iA Writer, anything else);
   3. anything to avoid.

   If you approve without answering, I'll stop once at P29.S4's opening to ask before any drafting. The
   design rules call for these questions while no job has been signed.
3. **Q1–Q3** can wait for P30, but **Q1 is a live exposure today.**

### What the research settled

Full contracts are in `phase.md`; the evidence is in each slice's `result.md`.

- **S1, books and chapters.**
  - **Model:** a book is an ordered manifest on disk that lists chapters. A chapter points at one
    document per language, and each language keeps its own version history.
  - **Explains:** a phase explain goes to the repo's `phases` book (key `p<N>`). One doc per slice goes
    to book `p<N>` (key = the slice id).
  - **Images:** attached at publish and served behind the document's own visibility gate.
  - **Today's library:** the 42 existing documents map into 4 books (33 chapters) plus 8 loose
    documents. There is no subject book yet.
  - **Compatibility:** every change is additive, and no link breaks.
- **S2, the native format and the legacy path.**
  - **The format:** a chapter is Markdown plus callouts and typed blocks:
    - `figure` and `figures` (a row of 2–3 that stacks on a phone);
    - `diagram`, in six kinds coloured only by design-token tones: flow, state, sequence, stack,
      timeline, and chart (as bar, line or interval);
    - a sanitized `svg` block for anything else;
    - `quiz`, in three types: choice, recall and cloze;
    - `sources`.
  - **No raw HTML and no iframe.** The basis was a survey of all 41 explainers: 126 figures, 205 quiz
    questions, and almost no JS (quiz feedback, one reveal, one link builder).
  - **The legacy path:** every existing HTML explainer opens full-screen as the only scroller, and
    nothing measures its height. That ends the inline-scroll fight. D37 is absorbed; D38, D39 and D40
    are obsolete.
- **S3, reader state and review.**
  - **Storage:** reader state is in Postgres, private to each reader. Text size and theme are a
    per-device cookie.
  - **Highlights:** they re-anchor across new versions, falling back to their block and then to
    "unanchored".
  - **Review:** spaced repetition uses FSRS (free, MIT) with two buttons, Again and Good. A quiz's first
    answer seeds its card.

**Four amendments the research made to its own contracts.** I recommend accepting all four; DECOMP2
writes them into the contracts as settled.
1. Re-explaining a plain-`md` document as native is an ordinary next version.
2. The MCP `fetch_document` `format` gains the value `"native"`. This is additive under the contract's
   rule.
3. The quiz result payload's `doc_slug` becomes `doc`, and it gains `unit`.
4. Reader state is keyed by the document's file stem plus a chapter `unit`, not by chapter identity. It
   then survives binding a loose document into a book, and the html → native migration.

### Your open questions — my recommendation on each

**These shape the design.** The handoffs proceed on my recommendation unless you say otherwise. A later
change becomes a superseding round of the affected job.

- **Q4 — interactive JS widgets in native chapters?** Recommend **no, not in v1**.
  - The only JS in 41 explainers is quiz feedback, one reveal and one link builder. The new blocks cover
    all three.
  - An agent that truly needs a widget can still publish a legacy HTML document.
  - *Tradeoff:* free-form interactivity, a cost you already accepted.
- **Q5 — math in v1?** Recommend **no**.
  - The corpus has none.
  - Add a server-rendered `math` block in the phase that publishes the first AI or Finance book needing
    it.
  - *Tradeoff:* formulas go in prose or code until then.
- **Q6 — what does an anonymous reader of a public book keep?** Recommend **only the theme and text-size
  cookie**.
  - Every save action says "Sign in to save" and returns them to the same spot.
  - *Tradeoff:* a public reader loses their place between visits. The alternative is a device-only store
    merged on sign-in: real complexity for readers you don't have yet.
- **Q7 — do highlights enter review automatically?** Recommend **only when you tick "Review this"** on a
  highlight. Quizzes enter automatically.
  - Turning every highlight into a card floods the queue with text you marked for reference.
  - This narrows your "from quizzes or highlights", so it's your call.
- **Q8 — when a document is deleted, do readers' notes on it go too?** Recommend **yes**, so no one
  keeps copies of deleted text.
  - *Tradeoff:* a reader loses notes they wrote.

**These don't touch the design.** They stay open for P30.

- **Q1 — tenant #1's "private" content is world-readable on GitHub, today.** `leetusik/knowledge` is
  public.
  - Recommend moving tenant #1's content to a separate **private** remote before P30 adds images and
    books.
  - Making the repo private would break the public installer and the plugin marketplace.
  - Nothing in P29 touches this, and I change nothing until you decide.
- **Q2 — commit chapter images to git?** Recommend **no**. They stay on the server disk until Q1 gives
  the content a private home.
- **Q3 — keep shipping the portable `/explain` copy?** Recommend **restoring it** in P30.
  - The 2026-09-21 workspace update deleted it, and `skills_parity.py` has failed ever since.
  - P30's standing gate can't pass until you answer.

### The look — taken from your confirmed intent, not a new question

Every job's handoff says **`new visual direction: no`**. Your intent says "P27's design system … is the
starting point, not something to replace wholesale", from your "reader first fine". The open part is
what the intent names: "Reader typography and themes are in play". That includes the new sepia theme,
and the reader job settles it.

---

## Part B — the cut

### Three waves, nine jobs, foundations first

| Slice (`co-work / high`) | Order | Depends on | Jobs (critique level) |
|---|---|---|---|
| `P29.S4` Design wave 1 — the reader | 50 | `P29.DECOMP2` | `reader` (critic+judge) |
| `P29.S5` Design wave 2 — chapter blocks and annotations | 60 | `P29.S4` | `figures` (critic), `diagrams` (critic+judge), `quiz` (critic), `annotations` (critic) |
| `P29.S6` Design wave 3 — library, book page, review, legacy and print | 70 | `P29.S5` | `library` (critic+judge), `book-page` (critic), `review` (critic), `legacy-and-print` (critic) |

**Why this shape:**
- **The reader goes first, alone.** It is the most central surface. It also sets reading typography and
  the light/dark/sepia themes, and every later job draws in all three themes, so those must be signed
  first. A one-canvas first stop also lets your taste land early.
- **Wave 2** is everything inside a chapter. **Wave 3** is everything around it. Review needs the signed
  quiz and annotations, print needs the signed blocks, and the library and book page reuse the reader's
  progress vocabulary.
- **Critique levels.** `critic+judge` goes where a wrong call is costly:
  - the reading foundation;
  - your headline ask, "more refined diagrams";
  - the new information architecture with its public org page.

  Every other job is a new surface with many states, so it gets `critic`.
- **Sizing.** Each job is one surface of about 5 Pages or fewer.
- **Time.** About 55–100 agent-minutes per job, roughly 8–15 agent-hours in total. The jobs in a wave
  draft in parallel. Nothing here spends money beyond the workspace's own dispatches.
- **Stops.** One PENDING #1 stop per wave, so three. Each superseding round adds one.

### What each job draws

Every job covers phone, iPad and desktop, in light, dark and sepia. Its scope comes from the S1–S3 notes
in `phase.md`.

- **`reader`:**
  - **Pages:**
    - the chapter opening: title, the `summary` lede and the generated table of contents;
    - reading: the chrome hides on scroll, with a progress indicator;
    - the chapter end: the chapter list (unopened / started / finished / Updated), Mark as finished or
      unread, and the next chapter;
    - the settings panel: text size in 5 steps; theme System / Light / Dark / Sepia; no column width;
    - the language switch (endonyms "English" / "한국어") and version history, including the
      stale-translation flag.
  - **The prose kit:** headings, lists, callouts (6 types, collapsed and expanded), code (titled,
    wrapping, ASCII `text`), tables (wide, long, numeric), links and the "missing link" style.
  - **The chapter loading state** (D36 (6)).
  - **Member and anonymous chrome.** Chrome copy is English-only (D36 (4)). The theme follows System for
    every reader, the one exception to P28's light public surfaces.
- **`figures`:**
  - `figure`: column and wide, image loading and missing, caption and credit;
  - `figures` rows of 2 and 3 mixed items, side by side and stacked on a phone. A row's diagram item
    shows the sibling `diagrams` job's look;
  - the `svg` block, themed by tone classes;
  - `sources`, with inline citations.
- **`diagrams`:**
  - the six kinds (flow with groups, lanes, the entity shape and a loop; state; sequence; stack, nested
    too; timeline; chart as bar, line and interval) with every tone;
  - Korean labels;
  - the widest case on a phone: scale or scroll is the drafter's call, flagged for you;
  - the title and caption as the text alternative.
- **`quiz`:**
  - every state of choice (single and multi), cloze and recall;
  - retry;
  - the saved answer on return ("your answer, v3");
  - anonymous: answerable, with "Sign in to save".
- **`annotations`:**
  - the bookmark toggle;
  - select → highlight; notes on a highlight and on a block; edit and delete;
  - the "Review this" toggle;
  - the chapter's annotation panel and its Unanchored group;
  - the `block` margin marker and the other-language marker;
  - the per-book list of bookmarks and notes;
  - legacy and `md` chapters: "bookmark this position" and "Highlights are not available";
  - "Sign in to save".
- **`library`:**
  - the member library by project and by subject, including the state with no subject book (today's
    truth);
  - Continue reading;
  - book cards with progress, and loose documents;
  - the phone loading skeleton (D36 (6));
  - the public org library `/@{org}`;
  - Library and Review as entry points in the app shell. Console, auth and landing change only where
    this forces it.
- **`book-page`:**
  - the ordered chapters with their states, book progress, and Continue reading;
  - each chapter's KO/EN variants and versions;
  - legacy and native chapters side by side;
  - a `phases` book, a per-slice book, and a preface-like chapter;
  - the member and public views.
- **`review`:**
  - the queue header (due, new highlights, done today, by book);
  - front and back for choice, cloze, recall and highlight cards;
  - Again / Good with interval previews, and Next for the graded types;
  - suspend; done for today; empty; the link back into the chapter.
- **`legacy-and-print`:**
  - the full-screen frame under a slim chrome bar (back, title, previous/next, chapter list, KO/EN,
    versions, Print);
  - "theme, text size and highlights don't apply here";
  - loading and relay failure;
  - phone safe areas, the chrome hiding on scroll, the restored position;
  - the document's look kept as authored (D36 (9));
  - **print:** the native sheet (light, a figure row, a diagram, a quiz answer key at the end), plus the
    legacy Print control and its ⌘P notice sheet.

### Canvas content rule (a decision)

The design record is committed to **this repo, which is public**, so whatever a canvas shows becomes
public. Canvases therefore:
- **keep the library's real shape:**
  - 4 codebase books of 20, 5, 4 and 4 chapters;
  - 8 loose documents;
  - one KO/EN pair;
  - a preface-like chapter;
  - no subject book;
- **use real titles only from the `knowledge` project's own maintainer guide.** Every other book and
  project is invented, with the same shape;
- **use invented subject-book samples** (English, Finance, AI) where a subject state is drawn.

They **never** carry:
- glide-ilab or base material;
- arb_upbit_1's strategy content;
- secrets, emails or any personal data.

### Setup at P29.S4's opening (me, inline; not its own slice)

The publish and the record run only on the main thread, and the read-only system route is small:
1. **`design-init`.** `docs/reference/design/` does not exist yet.
2. **Sync the Design System Artifact from code, by the read-only route.** No component bundle exists.
   - Read the Design System type's `from-code.md` live.
   - Have `Explore` gather the token inventory: `web/src/app/kb-tokens.css` (125 custom properties),
     the token blocks in `globals.css`, and `(app)/graph/graph-tokens.css`.
   - Write `tokens.json`, `tokens.css`, a README and static previews in the scratchpad, then publish.
   - Run `design-system --artifact … --namespace kb --version … --source web/src/app/kb-tokens.css
     --files tokens.json,tokens.css`.
3. **Seed `bar.md`** from your standing rules, which the executor extracts below. If there are none, it
   says `none beyond the shipped bar`.
4. **Open the job.** Run `design-open --slug reader --slice P29.S4 --critique critic+judge`, create the
   canvas (Design type), and write the handoff with your taste answers.

Then the drafter → critic → judge → answer pass, the publish, the commit and **PENDING #1**.

### What the executor does

Exactly these steps, and nothing else:
1. **Create the three slices.** Run `new-slice --phase P29 --slice P29.S4|S5|S6 --name "<the table's
   name>" --kind co-work --risk high --order 50|60|70 --depends-on <previous>`. They are bare folders,
   with no `plan.md`.
2. **Rewrite `## Slice breakdown and build inventory`.**
   - Put in the wave table and each job's scope as above.
   - Replace the provisional inventory with the **final** build inventory: one line per item, *what*
     not how, each mapped to its job.
3. **Update `## Decisions`**, tagged `(P29.DECOMP2)`.
   - Record:
     - the cut and the critique levels, with their reasons;
     - `new visual direction: no`, with the intent line;
     - the canvas content rule;
     - the system sync and `bar.md` done inline at S4;
     - Q4–Q8 running on the recommended defaults unless you answer otherwise;
     - which D36 items the jobs absorb: (4) and (6) in the reader, (6) in the library, (9) in
       legacy-and-print. The rest stay with D36.
   - Write the four accepted amendments **into the S1/S2/S3 contract lines in place**, marked
     "amended, accepted at P29.DECOMP2". Replace superseded lines; never stack them, and never drop a
     decision.
4. **Rework `## Notes for later slices`.**
   - **Split** every note tagged for DECOMP2 into per-wave notes (`for P29.S4` / `S5` / `S6`), so each
     wave's handoffs find their inputs. Drop nothing a wave needs. Remove only what this slice consumed.
   - Fix S2's "7 kinds" to the contract's six.
   - **Add for S4 your own words from rounds 01–06** (`web/design/rounds/*/SIGNOFF.md` and
     `handoff.md`, about 127 KB). Extract two lists, verbatim, each entry with its date and `file:line`:
     - **standing rules** meant for every design, which seed `bar.md`;
     - **taste words and references**, for the handoff's collected taste.

     Include only the operator's own words. A round's outcome is not a rule.
   - Keep the `origin/main` / stale-docs note, re-tagged for S4.
5. **Rewrite `## Now`.**
6. **Write `result.md`**, with the verdict block first.

It writes no `plan.md` and runs no state or `design-*` command besides `new-slice`. It appends to
`## Operator Questions` only the answers I pass along. It writes no product code and does not commit.

### Validation

- `python3 scripts/workflow.py validate` passes.
- `## Slices` shows S4, S5 and S6 in order before `REVIEW`.
- `phase.md` stays under budget.
- `git status --porcelain` shows only the P29 folder and the engine's generated files.

### After the return (me)

1. Run `record-dispatch` → `finish-slice P29.DECOMP2` → `validate` → one commit. The acceptance gate
   stays waived (design-only, no mockup).
2. Enter `P29.S4` with the setup above, then stop at **PENDING #1** with the reader canvas link, for you
   to open in the Claude app.
3. Only your literal words sign the job.
4. Not before P29 is `done`: P30. P28 still owes its durable-doc consolidation (a docs phase, on your
   word).

## Operator answers at the gate

The operator approved this plan on 2026-10-18 **with no text**:
- **Q4–Q8:** no answer. They run on the recommended defaults as working assumptions (record that in
  `## Decisions`, step 3). Each question stays open on `## Operator Questions` for the review to route;
  append nothing there.
- **The taste questions:** not answered. The orchestrator asks them at `P29.S4`'s opening, before any
  drafting. Record no taste answers; the S4 notes say the questions are still open.

## Dispatch

slice=P29.DECOMP2
route=high
reason=kind decomposition
tier=high
subagent_type=slice-executor-high
model=opus
pass_model=yes
effort=high
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=high
