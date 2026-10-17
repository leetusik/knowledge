# Intent — P29

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

_Answers given during intent capture, word-for-word (the same request created P29 and P30; each carries the full original). Item 4's answers are positional — the mapping to the nine candidates is under Clarifications Resolved:_

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

**This is the design half of a `design-only` pair (P29 design → P30 apply).** It produces research
findings, signed immutable design rounds, and no product code.

**The direction.** knowledge becomes a personal learning library that reads like an e-book, for anything
the operator is studying (AI, English, Finance, …). Codebase knowledge stays a first-class case.

- **Books and chapters.** A *book* is an ordered series of *chapters*. One model, two kinds:
  - **Codebase books** — the series that workspace phases already produce: one doc per phase
    (glide-ilab's `p8`, `p9`, `p17-and-p18`, `p24` explainers) or one doc per slice (P26's five-part
    `knowledge` series; vocky's P15 series). They survive ("about codebase also survive").
  - **Subject books** — general learning tied to no repo, e.g. an "English" or a "Finance" book that
    gains chapters over months.
  - **Chapters keep version history** — P23's model: re-explaining publishes v2/v3 of the same chapter.
  - **Korean/English variants** of a chapter, switchable in the reader. Today `p8` and `p8-ko` are two
    unrelated documents.
- **A native chapter format — the operator delegated this choice ("idk you suggest me"); suggested and
  confirmed.** A chapter is structured content that the reader renders itself, **with no iframe**, so the
  reader owns layout, typography, theme and interaction. It answers the operator's asks directly:
  - **more refined diagrams** — a diagram vocabulary styled by the design system, plus sanitized custom
    SVG, instead of every agent hand-drawing CSS/SVG from scratch;
  - **phone and iPad friendly** — layout is the reader's job, built and verified once;
  - **images** — files attached to the chapter at publish (screenshots, rendered charts), served with the
    chapter's own visibility; today's sandbox blocks every image that is not inlined;
  - **multi-column images / diagrams** — a figure row of 2–3 items that stacks on a phone;
  - **more quizzes** — quiz blocks anywhere in a chapter, more question types, results saved.

  The exact syntax is the research slice's to propose; the starting candidate is Markdown plus a small set
  of block types (figure, figure row, callout, diagram, quiz). Accepted cost: `/explain`'s output format
  changes, and agents lose free-form JS widgets. **If research hits a real blocker in this direction, it
  stops and asks the operator — it never switches approach silently.**
- **A legacy path for every existing HTML explainer.** Each stays readable, shown full-screen in the
  reader as the **only scroller**. Nothing measures content height, so the inner scroller cannot appear
  ("gonna fix goddamn inline scroll. total different approach might help"). Re-explaining a legacy
  explainer publishes its next version in the new format.
- **Reader-first redesign.** Design the new surfaces at phone / iPad / desktop: **library** (by subject
  and by project) → **book page** (chapters, progress) → **reader** → **review** (spaced repetition).
  The console (dashboard, keys, usage), auth, graph and landing change **only where the new navigation
  forces it**. P27's design system went live with P28 and is the starting point, not something to
  replace wholesale. Reader typography and themes are in play.
- **First-version features (operator-confirmed)** — the seed of the build inventory:
  - library → book → reader;
  - resume where you left off ("bookmark(where you left)"), a progress indication, easy movement to
    another chapter (previous/next, chapter list);
  - reader settings: text size and theme (light / dark / sepia). **Column width is fixed, not a setting.**
  - quiz results saved per chapter;
  - highlights and notes, bookmarks;
  - spaced-repetition review built from quizzes or highlights;
  - Korean/English chapter variants, switchable.
  - **Out:** page-turn mode (continuous scroll only); offline reading / an installable web app.
- **Research first, then the rounds** (confirmed shape; `DECOMP` cuts it, and a `DECOMP2` will likely
  cut the rounds from what was learned). The research settles:
  - the book/chapter model, and how every existing document maps into it;
  - how a workspace phase or slice becomes a chapter (the workspace review's
    `explain: not written — run /explain for this phase` is where codebase chapters come from today);
  - the native chapter format and its block vocabulary, including the diagram vocabulary and the quiz
    types — derived from what the existing explainers actually draw, not invented;
  - how a chapter's images are attached, stored and served;
  - the general-learning `/explain` mode, which has no repo behind it;
  - the legacy HTML path;
  - which per-reader state is kept, and where.

  The design handoff then states these as data contracts.
- **Out of scope:**
  - product code of any kind (that is P30);
  - a runnable mockup, unless the operator asks for one in a round;
  - page-turn mode and offline reading;
  - the bootstrap repo itself — P30 writes the handoff note, and the bootstrap repo's agent changes its
    own `/explain`.

## Clarifications Resolved

- Q: Does "phase 기반 — one doc per phase or one slice per doc" mean a book built from workspace phases
  (one chapter per phase, or one chapter per slice)? And can a book also exist outside any repo? — A:
  "Yeah, book. about codebase also survive. chapters can be version updated," → yes. Codebase books stay;
  chapters are versioned; subject books exist beside them.
- Q: Keep HTML explainers and give each the whole screen (a), or a native format the reader renders
  itself with no iframe (b)? — A: "idk you suggest me", with requirements: refined diagrams, phone/iPad
  friendly, images, multi-column images or diagrams, more quizzes. → Suggested (b), with the existing HTML
  explainers on a full-screen legacy path. Confirmed: "good".
- Q: A full redesign (new design system, every surface), or reader-first? — A: "reader first fine."
- Q: First-version must-haves, item by item:
  - library by subject/project → book page → reader: "ok";
  - resume where you left off, a progress bar, previous/next chapter: "bookmark(where you left), more
    easy to another chapter good.  may help.";
  - reader settings (text size, theme, column width): "good. but fixed column width.";
  - quiz results saved per chapter: "yeah";
  - highlights and notes, bookmarks: "yeah";
  - spaced-repetition review from quizzes or highlights: "yeah";
  - Korean/English chapter versions, switchable: "yeah";
  - page-turn mode beside continuous scrolling: "no";
  - offline reading (installable web app): "no".
- Q: Phase shape — a `design-only` pair: P29 design (research first, then the rounds) + P30 apply? — A:
  "good."
- Q: A runnable mockup before signing each round? — the operator was told to say "mockup on the reader"
  if they wanted one, and did not → `Mockup: on request`. They can still ask in any round.
- Q: How do images get into a chapter? — stated in the confirmation and confirmed: the agent attaches them
  at publish (screenshots, rendered charts). There is no editing in the web app.
- Q: A separate stopgap phase for the inline scroll before P30 lands? — not answered; the recommended
  default was stated in the confirmation and confirmed with "good": no stopgap phase. P28 stays `pending`
  until the operator pushes `main` and walks its gate.

## Design Style

`design-only` — the design is big (a new information architecture, a chapter format whose every block
type needs designing, and the reader and review surfaces at three viewports), and the build is bigger
(server model, format pipeline, reader, skill), so the apply work is its own phase, P30.
Mockup: on request

## Notes

- **Where the product is today** — facts for the research slice and the handoff:
  - **Document shape.** A document is markdown or a self-contained HTML explainer (P16). It is grouped by
    `project` (for `/explain`, the repo's folder name), with 2–5 tags, `related` links, a date + slug
    identity, P23 version history, P19 per-project visibility and P25 pretty URLs
    (`/@{org}/{project}/{doc-slug}`). **No series, book or ordering concept exists.**
  - **How an HTML explainer renders.** It sits in a sandboxed opaque-origin iframe (`sandbox
    allow-scripts`, no `allow-same-origin`), served through the BFF raw relay. A reporter injected into
    it (`web/src/lib/explainer-height.ts`) posts the content height outward, so the page scrolls instead
    of the frame.
  - **The inline-scroll history.** That file has had five passes since July: `1d59d6b`, `f5a7017`
    (P25.F4), `e9de885` (P28.F2), `be9157d` (P28.F3) and `e41eb40` (P28.F4). Every measurement miss
    brings the inner scroller back: sub-pixel rounding at DPR 2, a stale budget latch, classic scrollbars.
    The legacy path must not depend on that measurement at all.
  - **Images.** The sandbox blocks every external request, so an explainer cannot show any image that is
    not inlined.
  - **The library.** The operator's own library (tenant #1, git-backed, on `origin/main` at capture) is
    **42 documents, 41 of them HTML explainers**:
    - `changple5` 20, `glide-ilab` 7, `knowledge` 5, `vocky` 4, `arb_upbit_1` 3, and one each in
      `Mijual`, `bootstrap_agentic_workspace.sh` and `base` (the only markdown one);
    - glide-ilab's are phase-numbered (`p8`, `p9`, `p17-and-p18`, `p24`) beside topic docs, plus one
      `-ko` variant (`p8-…-ko`).
  - **`/explain` today is shaped around codebases.** Topic mode walks the repo. Every page has a fixed
    shape: Background / Intuition / Code / Best practices / a 5-question Quiz.
    - Shipped copies (parity-gated by `scripts/skills_parity.py`): canonical
      `plugin/skills/explain/SKILL.md`, portable `.agents/skills/explain/SKILL.md`, landing-served
      `web/public/SKILL.md`.
    - The bootstrap workspace vendors its own copy, which arrives here as `.claude/skills/explain/SKILL.md`.
- **Constraints carried from prior product truth:**
  - **No shared link breaks** (P25): `/documents/{id}` and `/@{org}/{project}/{doc-slug}` keep resolving.
  - P19 visibility semantics (private by default, 404-never-403) extend to books, chapters and their
    images.
  - Untrusted document content stays XSS-safe by construction. The reader renders and sanitizes the
    native format; raw HTML never runs on the app origin.
  - Search and the MCP retrieval service (`search` / `fetch_document`, v1 contract) keep working over
    chapters.
  - Everything stays free, with no plan gating.
- **Acceptance gate** — declared right after `finish-slice P29.DECOMP`: waive with the fixed note
  `design-only, no mockup: the operator signed the round on the card set`. Re-declare `--require` if the
  operator asks for a mockup in any round.
- **Design record.** Continue the repo's round tree after the last landed round, 06:
  `web/design/rounds/<NN>-<slug>/` holding `handoff.md`, read-only `output/` and `SIGNOFF.md`. The Claude
  Design project from P27 is `623bb4ea-8fb7-4d31-9d58-5c6a42709bbe` (Knowledge Base Design System).
  Whether this phase's rounds live there is the first handoff's question for the operator.
- **Runtime manifest.** `## Operator Runtime` (operations doc) exists: iPhone and iPad in Safari and
  Chrome, Mac Chrome, Aside agent account `u1`.
- **Related deferred jobs**, for `DECOMP` to route:
  - D36 (P28 gate rulings closed at defaults) — its trigger, "the next console or design phase", is this
    phase.
  - D27 (a closing consistency-sweep round 07) — likely superseded by this redesign.
  - D31 (retire round 06's card group label) — due at the next DesignSync session on the P27 project.
  - D37 / D38 / D39 / D40 (explainer reporter, framing and print) — the legacy-path decision may absorb or
    obsolete them.
  - D25 (server-rendered PDF) — the native format changes the print picture.
  - D13 (`source_url` for scraped sources) — relevant to citations in general-learning chapters.
  - D34 (landing hero clipped at phone widths) — the landing is out of scope unless the navigation forces
    it.
- **P28 comes first.** This phase cannot start until P28's open acceptance gate is cleared or failed.
  P28.F2/F3/F4 sit unpushed on local `main` (10 ahead of / 11 behind `origin/main` at capture), so
  production still runs the pre-F2 reporter.
- Sibling phase: **P30** (apply).
