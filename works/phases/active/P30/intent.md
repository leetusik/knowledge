# Intent — P30

- Captured at: 2026-10-17T18:36:36+09:00
- Origin: operator

## Original Input (verbatim)

_Invoked as `/create-phase` with these arguments, whitespace preserved:_

> ```text
> ---
>     - knowledge 개선(phase 기반. one doc per phase or one slice per doc)
>         - more knowledge learning based. not only codebase but more general learning
>         - it will helps me with learning my own specialized things. AI, English, Finance, etc..
>         - maybe full-redesign again. with very new features. 
>         - I want it to be work like E book reader.
>         - after the change on this repo, I'll inform your handoff note for the /explain skill change to bootstrap workspace repo agent.
>         - gonna fix goddamn inline scroll. total different approach might help.
> ```

_Answers given during intent capture, word-for-word (the same request created P29 and P30; each carries the full original). Item 4's answers are positional — mapped in P29's `intent.md` under Clarifications Resolved:_

> ```text
> 1. Yeah, book. about codebase also survive. chapters can be version updated,
> 2. idk you suggest me. I want more refined diagrams, mobile, ipad friendly, image available, multi column image or diagram input also possible, and more quizs available etc..
> 3. reader first fine.
> 4.
> - ok
> - bookmark(where you left), more easy to another chapter good.  may help.
> - good. but fixed column width.
> - yeah
> - yeah
> - yeah
> - yeah
> - no
> - no
> 5. good.
> ```
>
> Confirmation of both phases and of the item-2 suggestion: "good"

## Confirmed Intent (refined + clarified)

**This is the apply half of the `design-only` pair (P29 design → P30 apply).** It runs only after P29 is
`done`: research settled and every round signed. Its `DECOMP` reads two things as the implementation
contract, under **RESPECT THE DESIGN** — never drop, simplify, restyle or "improve" an approved element:
P29's findings in P29's `phase.md`, and each landed round's record (the round's `output/build-prompt.md`,
or Claude Design's own handoff bundle).

**What to build** — for `DECOMP` to cut, not pre-cut here. Order: backing first, then the design
implementation surface by surface, then the fidelity and functional sweep.

- **Server.**
  - Books and chapters: codebase and subject books, chapter order, chapter version history carried
    forward, Korean/English variants.
  - The native chapter format's ingest, storage, search and MCP path.
  - Chapter image assets: uploaded with the chapter, stored, and served with the chapter's own visibility.
  - Per-reader state: resume position, bookmarks, highlights and notes, quiz results, the
    spaced-repetition review.
  - Migrating every existing document into the book model, so nothing disappears and **no shared link
    breaks**.
- **Web.** The library, book page, reader and review surfaces at phone / iPad / desktop. **The reader has
  exactly one scroller:**
  - native chapters are rendered by the reader itself, with no iframe;
  - legacy HTML explainers are shown full-screen, as the only scroller;
  - so the content-height handshake (`web/src/lib/explainer-height.ts` and its parent half) is **retired,
    not patched a sixth time** ("gonna fix goddamn inline scroll. total different approach might help").

  The console, auth, graph and landing change only where the new navigation forces it (reader-first).
- **`/explain` in this repo.**
  - The new chapter format and the book/chapter metadata on publish, including the general-learning mode
    with no repo behind it, across the three parity-gated shipped copies: `plugin/skills/explain/SKILL.md`
    (canonical), `.agents/skills/explain/SKILL.md` and `web/public/SKILL.md`.
  - Whatever the `knowledge` CLI needs to publish a chapter with images.
- **Fidelity and functional sweep.**
  - Instrument and runtimes: the manifest viewports, in the operator runtime and the production build,
    with Aside (`aside repl --account u1`) or the fallback real browser.
  - Every visible control does something.
  - Resume position and progress survive a reload; quiz results and highlights persist.
  - **No inner scroller can be produced** on any chapter or legacy explainer — at DPR 2, with classic
    scrollbars, and across many width changes (reuse P28's `## Regression Checklist` lines in the qa doc).
- **Closing deliverable — the bootstrap handoff note.** The phase's last slice writes a self-contained
  note for the bootstrap workspace repo's agent describing the `/explain` change, saved in this phase's
  folder and reported to the operator, who relays it ("I'll inform your handoff note for the /explain
  skill change to bootstrap workspace repo agent"). It covers:
  - the chapter format and the book/chapter metadata;
  - how a phase or a slice becomes a chapter;
  - the general-learning mode;
  - images and versioning;
  - what the vendored `.claude/skills/explain/SKILL.md` must change.

  **This repo never edits the bootstrap repo.**
- **Acceptance gate:** `--require` — the operator walks the running reader on phone, iPad and desktop
  before the review can pass.
- **Out of scope:**
  - new visual decisions — a gap in the record goes on `## Operator Questions`, never a silent fix;
  - page-turn mode;
  - offline reading / an installable web app;
  - editing chapters in the web app;
  - any change inside the bootstrap repo — including this workspace's `.claude/skills/explain/`, which the
    bootstrap ships and a later workspace update brings in.

## Clarifications Resolved

- The same Q/A as P29's `intent.md`:
  - books from phases, plus subject books, with versioned chapters;
  - the native chapter format, suggested and confirmed, with a full-screen legacy path for HTML
    explainers;
  - reader-first;
  - the first-version features item by item (in: library → book → reader, resume and easy chapter
    moves, text size and theme with a fixed column width, saved quiz results, highlights / notes /
    bookmarks, spaced-repetition review, KO/EN variants; out: page-turn mode, offline);
  - the `design-only` pair;
  - `Mockup: on request`;
  - images attached by the agent at publish, with no web editing;
  - no stopgap scroll phase.
- Q: Who carries the `/explain` change to the bootstrap workspace repo? — A: the operator relays this
  phase's handoff note to that repo's agent.

## Design Style

`design-only` — this is the apply phase of the pair. P29 holds the research findings and the signed
rounds, and this phase's `DECOMP` cuts the build from them.
Mockup: on request

## Notes

- Depends on **P29** reaching `done`. Do not decompose before then.
- **Standing gates:**
  - web: `pnpm --dir web typecheck · lint · test · build`;
  - the server test suite;
  - `python3 scripts/skills_parity.py` for the skill copies;
  - D22: never `prettier --write` existing web files inside a slice.
- **Tests only for very core behavior** — format parsing and sanitizing, the per-reader state API, the
  migration's link preservation. The reader's look is verified live.
- **Self-hosting wrinkle (from P26).** `/explain` writes against the hosted API land as `kb-api` commits
  pushed to `origin/main`. Local `main` must integrate them before any push (11 behind at capture). Verify
  published documents with `curl`, not Python `urllib` (the edge answers it 403).
- **Related deferred jobs**, for `DECOMP` to route:
  - D37 / D38 / D39 / D40 — likely closed by retiring the handshake;
  - D25 (server-rendered PDF);
  - D18 and D32 (login return address) — if the reader's navigation sends anonymous readers through
    login.
- Sibling phase: **P29** (design).
