# P29.S3 — research: reader state and the spaced-repetition review

## Goal

Settle, as data contracts:
- the per-reader state the learning reader keeps: resume and progress, bookmarks, highlights and notes,
  quiz results, the review schedule, and reader settings;
- where each piece lives, and for whom;
- how anchors survive a new version and a language switch;
- the spaced-repetition review: its items, its scheduling algorithm, and the data contract for the review
  surface.

**Findings only: no product code.** What you settle lands in `phase.md`, where `P29.DECOMP2`, the design
handoffs and P30's `DECOMP` will read it.

Read these first:
- the scope: `phase.md` → *Slice breakdown* → **S3**;
- the operator's words in `intent.md` → *First-version features* and Clarifications:
  - resume, in the operator's words "bookmark(where you left)";
  - easy moves between chapters;
  - "fixed column width";
  - quiz results saved;
  - highlights, notes and bookmarks;
  - spaced repetition "from quizzes or highlights";
  - the KO/EN switch;
- `## Decisions` → S1's *Book and chapter model* and S2's *Native chapter format and legacy path* (Ids,
  Quiz, References, Legacy path);
- the notes tagged for S3.

## Facts gathered for you

These come from a read-only lookup on 2026-10-18. Verify each one before you rely on it.

- **Postgres** (`server/persistence/models.py`):
  - tables: `users`; `tenants` (with `slug`); `tenant_members` (`role` is free text, and signup creates
    `owner`); `projects` (`visibility` TEXT, default `private`); `project_credentials`; `auth_tokens`
    (30-day sessions); `usage_events`.
  - **No table holds per-user state or preferences.**
  - `alembic/versions/` holds 5 revisions named `NNNN_<slug>.py`; the newest is `0005_tenant_slug.py`.
- **Identity:**
  - `/app/*` routes use `require_user` (`server/accounts/auth.py`): a Bearer session token → the user →
    `tenants[0]`.
  - Public reads use `optional_user` (`server/documents_api.py`, gated by `_is_publicly_readable`).
  - The web app carries the session in the sealed `knowledge_session` cookie (`web/src/lib/session.ts`).
    Server components and server actions call `web/src/lib/knowledge/client.ts`, which injects the Bearer.
  - There is no generic BFF proxy and no middleware. The only route handlers are auth login, signup and
    logout, plus the two raw relays.
- **Readers without membership:**
  - **Anonymous visitors have no identity at all.**
  - A signed-in user reading another org's public project has an identity but no membership.
- **Client persistence is deliberately cookie-first:**
  - There is no `localStorage` anywhere. `web/src/lib/rail-cookie.ts` explains why: the server reads the
    `kb_rail` cookie, so the first paint is already right, with no flash and no post-hydration jump.
  - `sessionStorage` is used only for the graph's view (`graph-canvas.tsx`).
- **No existing code** for progress, resume, bookmarks, highlights, notes, quiz results or spaced
  repetition. The explainers' quizzes are in-HTML JS, and nothing is stored.
- **D18 and D32:** D18 is the login `returnTo`. D32 is the member auth guard bouncing to `/login` with no
  return address. Both matter if your answer sends anonymous readers through login to save state.

## Questions to settle

Give each one a recommended answer, the evidence behind it, and the alternatives you rejected, each with
its reason. Where only the operator can decide, recommend a default and add the question to
`## Operator Questions`.

1. **Who keeps state, and where.**
   - **The three readers:**
     - a signed-in member of the book's org;
     - a signed-in user reading another org's public project;
     - an anonymous reader of a public project.
   - **The store, per state item below:**
     - Postgres: durable, per user;
     - a cookie: per device, read on the server for the first paint;
     - browser storage: this goes against the codebase's cookie-first rule, so justify any use;
     - nothing.
   - **The anonymous reader:** settle what they get:
     - nothing beyond the page;
     - device-only state;
     - a prompt to sign in.

     Also settle whether device state merges into an account on sign-in.
   - **Never stored in:**
     - the content tree or git (S1: tenant #1's content is pushed to a public repo);
     - the disposable SQLite index.
2. **The state model.** Entities, fields, keys and lifecycle for each item:
   - **Resume** (the operator's "bookmark (where you left)"):
     - per chapter variant and per loose document;
     - plus the "continue reading" pointers the library and the book page need, per book and overall.
   - **Progress:**
     - a chapter's state: unopened, started or finished;
     - define "finished" for native and legacy chapters alike, and whether finishing one language variant
       finishes the chapter;
     - a book's progress, and what its denominator counts.
   - **Bookmarks:** explicit ones, alongside resume.
   - **Highlights and notes:** whether a note attaches to a highlight, to a block, or both.
   - **Quiz results:** S2's saved-result payload, where it is kept, and how "the first attempt counts".
   - **Review state:** see question 4.
   - **Reader settings:**
     - text size, as a small set of steps;
     - theme: light, dark or sepia, and whether "system" is one;
     - per device, or synced to the account.

     **Column width is fixed, not a setting** (the operator's words).

   **Keys:**
   - A chapter variant is `(tenant, project, book, key, lang)` (S1).
   - Say how a **loose document** is keyed. By P25, `(project, slug)` resolves the newest document; confirm
     that or choose another key.
   - Never key on `documents.id`.

   **Tables:** name the Postgres tables, with their columns, uniqueness, indexes and cascade rules, as one
   additive alembic revision. Cover the cascade when an account is deleted; when a document, chapter or
   book is deleted; and when a project is turned private.
3. **Anchors across versions and languages.** S2 fixed the units: an h2–h4 heading id, a typed-block id,
   or a quiz item id. Prose is `{block_id, quote: {exact, prefix, suffix}}`. Settle:
   - **Re-anchoring on a new version** of the same variant: look up the id, then search for the quote
     inside that block, exact first, then fuzzy.
   - **When the quote no longer matches, or the id is gone** (a retired section): is the anchor kept, moved
     to the block, or orphaned? Where is an orphan shown?
   - **A language switch:** resume and bookmarks map by id. Settle what a highlight made in Korean shows in
     English, since quotes do not translate.
   - **Legacy chapters:**
     - S2's bridge reports `{fraction, anchor}`, where `anchor` is the nearest element id;
     - a legacy frame has no highlights, notes or quiz results;
     - settle what resume and progress mean there;
     - settle how a legacy anchor degrades after the `html → native` format migration (S1).
   - **Where anchoring runs:** the reader's DOM, the server over the stored source, or both.
   - **What the stored record keeps**, so the review and the highlight list can show text without opening
     the chapter.
4. **Spaced-repetition review.**
   - **Review items:**
     - which quiz types enter review (S2: `recall` and `cloze` are natural cards, and `choice` can be
       one);
     - whether entry is automatic on answering, or opt-in;
     - how the first attempt seeds the schedule.
   - **Highlights:** the operator said review "from quizzes or highlights". Decide whether a highlight
     becomes an item, and how: resurfacing with a self-rating, or a recall card the reader writes from a
     note. Narrowing the operator's words is an operator question.
   - **The algorithm:** recommend one, and cite your sources.
     - The candidates: FSRS (an open-source scheduler with Python and TypeScript implementations), SM-2
       and Leitner boxes.
     - The reasons to weigh:
       - retention efficiency;
       - simplicity;
       - the licence, since everything stays free;
       - default parameters or per-user optimisation;
       - where it runs: the server at submission, or the client.
   - **Grading inputs:**
     - how `choice`/`cloze` correctness and `recall`'s `got`/`missed` map onto the algorithm's ratings;
     - whether the review surface asks for a 2-button or a 4-button rating. DECOMP2 needs this as a
       design input.
   - **Item drift:**
     - A new chapter version keeps, changes or retires an item id. Say what happens to the item's schedule
       in each case.
     - An item whose chapter becomes unreadable to the reader (made private, or deleted) must never render
       its content (404-never-403; no leak through the review).
   - **The review surface's data contract:**
     - the queue: due now, new, counts per book, next due;
     - a card's payload, for each item type and for a highlight;
     - the submit (rating and response) and what it returns (the next due, and the interval preview for
       each rating);
     - day boundaries in the reader's time zone;
     - any daily limits.
5. **Routes and writes.**
   - **The routes P30 adds:** session-authenticated, under `/app/…`, and called from server components and
     server actions. Add a route handler only where one is needed, for example a resume write fired on
     `pagehide`.
   - **The write cadence:** resume is debounced.
   - **Multi-device conflict rules:** for example, last write wins for resume, highlights are unioned, and
     quiz attempts are append-only.
   - **Isolation:** a reader only ever reads and writes their own rows.
   - **Compatibility:** every change is **additive**. Name anything breaking as an operator question.
6. **Privacy.** Reader state is private to the reader:
   - never visible to the book's owner or to org members;
   - never in search, MCP or the graph.

   Also settle what a reader can delete, and what is kept when access is lost.

## Method

- **Code.** Verify the facts above. Then read:
  - `server/persistence/` and `server/accounts/`;
  - `server/documents_api.py`, for the visibility gate;
  - `web/src/lib/session.ts`, `web/src/lib/knowledge/client.ts`, `web/src/lib/auth-guards.ts` and
    `web/src/lib/rail-cookie.ts`;
  - `web/src/app/api/` and `alembic/versions/`.
- **Docs.** `docs/current` is STALE for api, backend, experience, frontend, product, qa and security. Check
  it against P28's `## Doc impact` (P28 `phase.md` L608–838) and against the code. **The code wins.**
- **Explore.** Use `Explore` at the `explore_model` / `explore_effort` below for bulky reads. Upgrade it to
  `sonnet` for a lookup that needs judgment.
- **Web search.** Use it for prior art and outside evidence, and cite it:
  - FSRS: the algorithm, its papers, and the licence of its Python and TS libraries;
  - SM-2, and Anki's scheduling;
  - reading-position sync in e-book readers: Kindle, Apple Books, KOReader;
  - highlight anchoring and orphans: W3C Web Annotation selectors, Hypothesis;
  - Readwise-style highlight review.
- **No corpus survey is needed.** A throwaway probe goes in your session scratchpad under `p29-s3/`.
  Delete it before you finish.
- **Scope.** Change nothing in the product, and no file outside this slice's folder and `phase.md`.
- **Blockers.** A real blocker returns `needs_operator` with the exact question. Never switch approach
  silently.

## Output

- **`phase.md` `## Decisions`.** Add the subsection `### Reader state and review — data contracts (P29.S3;
  evidence in slices/P29.S3/result.md)` after S2's. Write one entry per settled question, phrased as a
  contract a design handoff can quote. Cover:
  - the state model, and the stores per reader;
  - the tables;
  - the anchor rules;
  - the review items, the algorithm and the ratings;
  - the review data contract;
  - the routes and the conflict rules;
  - privacy.

  Tag each entry `(P29.S3)`.
- **`phase.md` `## Operator Questions`.** Only decisions that are truly the operator's, each with your
  recommended default.
- **`phase.md` `## Notes for later slices`.**
  - **For DECOMP2:** the surfaces and states the design must draw for reader state and review:
    - the resume entry ("continue reading") in the library and the book page;
    - chapter and book progress;
    - the bookmark, highlight and note interactions, and their per-book lists, orphans included;
    - the settings panel;
    - the review queue, with a card's front and back for each item type, the rating buttons, and the empty
      and done-for-today states;
    - what an anonymous reader sees;
    - the legacy reader's resume.
  - **For P30's DECOMP:**
    - the core tests: the per-reader state API's isolation and its visibility re-check, and anchor
      re-mapping across a version and a language;
    - the alembic revision;
    - the scheduler library choice.
  - Tag each note `**(from P29.S3, for …)**`.
  - Remove the notes tagged for S3 once you consume them. Re-tag for DECOMP2 any note it still needs, for
    instance where the real library lives, for realistic canvas content.
- **`phase.md` `## Now`.** Rewrite it. S3 is the last research slice, so `## Now` must also say that
  DECOMP2 is next. List every open operator question (Q1–Q5, plus yours) and the two S1 amendments that S2
  proposed, for DECOMP2's planning gate.
- **`result.md`.** The verdict block first. Then the evidence behind each decision, the rejected
  alternatives, the sources cited, and the commands you ran.
- **Budget.** Keep `phase.md` under its budget. Rewrite sections, never just append to them, and never drop
  a decision or a question.

## Validation

- `python3 scripts/workflow.py validate` passes.
- `git status --porcelain` shows only this slice's folder, `phase.md` and the engine's generated files.
- The scratch directory is deleted.

## Return

Return the structured verdict, mirrored at the head of `result.md`:
- `status`, `tier`, `model`, `effort`;
- `summary`, `files_changed`, `validation`, `deviations`;
- `doc_impact: none`, `operator_need`.

Never commit and never move workflow state.

## Dispatch

route=research
reason=kind research
tier=high
subagent_type=slice-executor-high
model=opus
pass_model=yes
effort=medium
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=high
