# P29.DECOMP — cut the learning-reader design phase: research first, then a re-cut

## Context

P29 is the design half of the `design-only` pair P29 (design) → P30 (apply). It was re-confirmed on
2026-10-18 on v60's `drafter` loop (see the last entry under `intent.md` → Clarifications Resolved). The
confirmed shape is **research first, then the design**. The book/chapter model, the native chapter
format and the reader state have to be settled as data contracts before any design handoff can lock
them. So this decomposition cuts **three research slices and a `P29.DECOMP2`**. `DECOMP2` cuts the
design waves (co-work slices, their jobs and critique levels) once the findings are in. This slice cuts
no design slice and writes no slice's `plan.md`.

Read first: `intent.md` in full, `phase.md`, this plan, `.claude/skills/design-cowork/SKILL.md` *Shape*
and *Sizing* (for the DECOMP2 note), and the deferred briefs named below
(`works/deferred/open/<D>/brief.md`).

## The cut — four bare folders

| Slice | Kind / risk | Order | Depends on | Name |
|---|---|---|---|---|
| `P29.S1` | `research / high` | 10 | — | Research: book and chapter model |
| `P29.S2` | `research / high` | 20 | `P29.S1` | Research: native chapter format and legacy path |
| `P29.S3` | `research / high` | 30 | `P29.S2` | Research: reader state and spaced-repetition review |
| `P29.DECOMP2` | `decomposition / high` | 40 | `P29.S3` | Re-cut: design waves from the research findings |

Create each with `python3 scripts/workflow.py new-slice --phase P29 --slice <id> --name "<name>" --kind <kind>
--risk high --order <n> [--depends-on <id>]`. Research is findings-only. Each research slice lands its
findings in `phase.md` as data contracts that a design handoff can quote and that P30's `DECOMP` can
build from.

**Why three slices, and why this order.** Each draws on a different body of evidence: the server model,
then the explainer corpus and the reader code, then per-reader state and scheduling. Each also depends
on the one before it. S2's image and cross-chapter link blocks need S1's identities and storage. S3's
anchors and review items need S2's block ids and quiz types. Deviate from this cut only for a reason
found in the code, and write that reason beside the breakdown.

### What each research slice settles (record this as the breakdown, never as a plan)

**S1 — book and chapter model**
- Books: codebase books built from a project's phases or slices, and subject books with no repo behind
  them. Chapters: order, identity, visibility. Version history (P23) and Korean/English variants. How
  these relate to today's `documents` (extend the existing entity or add new ones), and where each piece
  lives: disk + git, the disposable SQLite index, or the Postgres control plane.
- A mapping of **every** existing document into books and chapters: all 42 on `origin/main`, including
  - the series: glide-ilab's p8/p9/p17-and-p18/p24, P26's five-part `knowledge` set and vocky's P15 set;
  - `p8`/`p8-ko` as one chapter with two variants;
  - the topic docs;
  - the one markdown doc, in `base`.
- How a workspace phase or slice becomes a chapter. Today the review's `explain: not written — run /explain
  for this phase` pointer leads to `/explain`. Settle which book the chapter lands in, its position and
  title, and how re-explaining produces its next version.
- Images: attached by the agent at publish, stored somewhere, served with the chapter's own visibility
  (P19: private by default, 404-never-403), with limits and formats.
- Compatibility:
  - `/documents/{id}` and `/@{org}/{project}/{doc-slug}` keep resolving (P25);
  - search and the MCP `search` / `fetch_document` v1 contract keep working over chapters;
  - the graph keeps working;
  - everything stays free.

  D13 (`source_url`) is an input for citations in general-learning chapters.

**S2 — native chapter format and the legacy path**
- A survey of what the existing explainers actually draw: diagram kinds, widgets, figures, tables, code,
  callouts, multi-column layouts, quizzes and Korean text, with counts and examples. This is the evidence
  the block vocabulary is derived from; nothing in the vocabulary is invented.
- The format:
  - the syntax (starting candidate: Markdown plus a small set of blocks — figure, figure row, callout,
    diagram, quiz);
  - the diagram vocabulary: styled by the design system, plus sanitized custom SVG;
  - the quiz types;
  - stable block ids, for resume, highlights, notes and quiz results;
  - how images and cross-chapter links are referenced;
  - Korean/English authoring;
  - the sanitize-and-render model: no iframe, and raw HTML never runs on the app origin.
- The legacy path:
  - every existing HTML explainer shows full-screen in the reader as the **only scroller**, and nothing
    measures content height;
  - how the reader's chrome coexists with it;
  - how a native chapter and a legacy chapter print;
  - a recorded fate for each of D37, D38, D39, D40 and D25: obsolete, absorbed by P30's path, or still
    needed.
- `/explain`: how the codebase modes and the general-learning mode produce native chapters (which book,
  what position, images, versions, variants), and what that means for the shipped skill copies and their
  parity check.
- If research hits a real blocker in the native-format direction, it stops with `needs_operator` and
  never switches approach silently (`intent.md`).

**S3 — reader state and review**
- Which per-reader state exists:
  - resume position and progress;
  - bookmarks, highlights and notes;
  - quiz results and the review schedule;
  - reader settings: text size and theme, with the column width fixed.

  Also where each piece is kept, and for whom: a signed-in owner or member, or an anonymous reader of a
  public project.
- How anchors survive a new chapter version and a language switch.
- The spaced-repetition model built from quizzes or highlights: the review item, the scheduling
  algorithm (recommend one, with reasons), and the data contract for the review surface.

**DECOMP2** cuts the design:
- co-work slices (`--kind co-work --risk high`), in waves of up to about 4 jobs;
- one job per surface, foundations first;
- each job's critique level;
- anything the findings show is still missing.

## Build inventory (provisional; DECOMP2 finalizes it)

What to design, not how; one line per candidate. Every surface is designed for phone, iPad and desktop.
1. Library: books by subject and by project, with progress and a resume entry.
2. Book page: the ordered chapters, progress, resume, and which variants and versions exist.
3. Reader: a native chapter in continuous scroll, with a fixed column, text size, theme
   (light/dark/sepia), progress, previous/next and the chapter list, resume, the KO/EN switch and
   version history.
4. Chapter blocks: figure, figure row (2–3 items that stack on a phone), callout, diagram vocabulary,
   code, image, quiz.
5. Highlights, notes and bookmarks: made in the reader, listed per book.
6. Quiz: in-chapter, with results saved.
7. Review: the spaced-repetition queue built from quizzes and highlights.
8. Legacy reader: an existing HTML explainer full-screen inside the reader.
9. Navigation: the console, auth and landing change only where the new navigation forces it.

Out: page-turn mode, offline reading, product code, and a mockup unless the operator asks for one.

## Deferred jobs — record this routing

- **D36** (P28's nine gate rulings). Its "next console or design phase" trigger is this phase, but it
  is **not promoted**: the rulings are P28 console calls outside a reader-first boundary. Its
  reader-relevant items become inputs:
  - (4) round 06's English-only copy goes to S2 and DECOMP2;
  - (6) the public document loading state goes to DECOMP2;
  - (7) the Safari, print and DPR judgments go to S2;
  - (9) the framed explainer's default look goes to S2.

  D36 stays open for everything else, which waits for the operator's device walk of the console.
- **D27** (a closing sweep round 07). Read `works/phases/active/P28/slices/P28.REVIEW/result.md` and
  state in the verdict whether P28 left any cross-round drift unsettled. If it left none, the
  orchestrator closes D27 as "no sweep", its trigger's own default.
- **D37, D38, D39, D40, D25** are S2 inputs (the legacy path and printing). They stay open until P30
  ships what S2 decides.
- **D13** is an S1 input.
- **D34** stays deferred: the landing is out of scope unless the navigation forces a change there.

## phase.md (the executor's edit, under budget)

- Add a `## Slice breakdown and build inventory` section after `## Slices`, holding the table above,
  each slice's scope and the inventory.
- `## Decisions`:
  - research first, with a DECOMP2 re-cut;
  - the design tool is `drafter`, the record lives under `docs/reference/design/jobs/`, and `web/design/`
    is read-only design memory;
  - the gate is waived, and the orchestrator declares it;
  - the deferred-job routing.
- `## Notes for later slices`, tagged per reader. Verify each fact before recording it:
  - **All research slices:**
    - Read the library from `origin/main`: `git fetch origin`, then `git show origin/main:<path>`. Local
      `main` has diverged (14 ahead / 11 behind) and lacks glide-ilab's docs. Never pull or merge.
    - Each HTML document's metadata is its `<!--kb … -->` header.
    - `docs/current` is stale for api, backend, experience, frontend, product, qa and security. P28's
      `## Doc impact` (P28 `phase.md` L608–838) corrects it.
    - Findings go into `phase.md` as data contracts. Long evidence goes in `result.md`, referenced by path.
  - **S1:**
    - `server/documents.py`: rel_path, validators, the `<!--kb-->` header, the `.versions/` archive.
    - `server/db.py` + `server/reindex.py`: SQLite is a disposable index, rebuilt from disk.
    - `server/persistence/models.py`: Postgres.
    - `server/main.py` + `server/documents_api.py`: the write path, versions, the visibility gate with its
      constant 404, `_canonical_path`, the raw route.
    - `server/gitops.py` and `publish.py`: tenant #1 commits to git; other tenants live under
      `tenants/<uuid>/`, uncommitted.
    - `mcp-server/CONTRACT.md`: v1, additive-only. `_citation_url` returns "" (D13).
    - Nothing today implements a series, a collection, an attachment or an upload. The explainers hold no
      `<img>`, only inline SVG.
  - **S2:**
    - The corpus is about 3 MB of HTML, ~73 KB per explainer. Survey it with a throwaway extraction
      script plus `Explore` passes over representative documents, not by reading it whole.
    - Skill copies: `plugin/skills/explain/SKILL.md` (canonical) = `web/public/SKILL.md`.
      `.claude/skills/explain/SKILL.md` is the vendored copy, with the `general` research mode.
      `.agents/skills/explain/SKILL.md` is missing, although `scripts/skills_parity.py` expects it.
    - Reader code: `document-view.tsx`, `markdown-body.tsx`, `explainer-frame.tsx`,
      `web/src/lib/explainer-height.ts`, both raw relay routes, `web/next.config.ts`, `kb-docview.css`,
      `kb-print.css`.
    - Design memory: `web/design/rounds/06-document-views/`.
  - **S3:** durable per-user state cannot live only in the SQLite index. Anchors and review items build
    on S2's block ids and quiz types.
  - **DECOMP2** (v60 design facts):
    - `design-init` runs first.
    - A Design System Artifact is synced from the live code before the first job. The orchestrator does
      this inline; decide whether its prep needs a slice of its own.
    - `bar.md` is seeded from the operator's standing rules in `web/design/rounds/*/SIGNOFF.md`, quoted
      with date and source.
    - Taste questions only where the look is open.
    - Critique levels are `off | critic | critic+judge`. The judge runs here (`proxy=none`).
    - A critiqued job takes about 55–100 agent-minutes.
- `## Now`: the cut, and what S1 starts with.

## Validation

`python3 scripts/workflow.py validate` passes, and the four new slices appear in `phase.md`'s generated
`## Slices` table, in order.

## Return

Write `result.md` with the verdict block first, including the D27 finding. The breakdown, decisions and
notes go in `phase.md`. Run no state command except `new-slice`, write no `plan.md` for any slice, and do
not commit.

## After the return (orchestrator only; the executor does none of this)

`record-dispatch` → `finish-slice P29.DECOMP --outcome …` → `accept-gate P29 --waive --note "design-only,
no mockup: the operator signed each job on its canvas"` → close D27 if the finding allows → `validate` →
one commit. The loop then runs S1 → S2 → S3 without stopping: research slices are not gated, they run on
the engine's research row, and they spend no money. It stops at `P29.DECOMP2`'s planning gate. There, the
research decisions and every open operator question come to the operator before any design handoff locks
a contract.

## Dispatch

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
