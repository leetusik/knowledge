# Slice brief — P39-hk.D1, the reading aids

Written by the orchestrator on 2026-11-02 from the record:
- the phase's intent (`works/phases/active/P39-hk/intent.md`, both *Confirmed Intent* and *Scope Added at Execution*);
- the cut (`works/phases/active/P39-hk/topics/breakdown.md` → `## Build inventory`, `## P39-hk.D1`);
- the reader's code (`web/src/components/reader/`, `web/src/lib/native/render.tsx`, `web/src/app/kb-tokens.css`, `web/src/app/kb-print.css`);
- the signed jobs 01–09 under `docs/reference/design/jobs/`.

## Product context

- **What knowledge is.** A hosted knowledge base that reads like an e-book. Coding agents publish documents
  and books of chapters into an org's library. The operator reads them on the web. A chapter is written in a
  "native" Markdown grammar that the reader draws (callouts, diagrams, figures, charts, a quiz, sources).
- **Who reads.** The operator, a solo developer, reading explain documents about their own code (for
  example, the performance rule of their trading bot) on iPhone, iPad and a Mac in long sessions. Documents
  come in English and Korean. Anyone else reads only what is made public.
- **Why this job.** Explain documents use hard terminology and formulas, and the formulas are written today
  as raw symbols in running text ("s = mean ÷ sd and t = s × √n", "(Σe)² ÷ Σe² over its eigenvalues e").
  The operator asked for two things, in their words:
  - "I need some glossary since terminolgy very difficult. if a user clicks or hover the word that the
    glossary got, maybe show some window explaining that term." (2026-10-30, the arb_upbit_1 session, quoted
    in `intent.md`.)
  - "no hard reading, many visual stuff, including looking good formula. don't just shitting around with
    수학 기호들. I'm not prohibit them but make them looks good. and easy to understand." (2026-11-02, quoted
    in `intent.md`.)
- **What the build will carry** (the confirmed data contract, from `intent.md`; locked):
  - one **glossary** per chapter: each term has an id, the term, optional aliases, a **short definition**
    (about 40 words) and an optional **longer** one;
  - **term links** in the text, written explicitly by the writer and never auto-detected, so not every
    occurrence of a word is marked;
  - in the reader the term shows a subtle marker; hover (desktop) or tap (phone, keyboard) opens a window
    with the short definition, a way to see the longer one, and a link to the glossary section; it is
    keyboard-reachable and Esc closes it; print turns the glossary into an appendix;
  - **inline formulas** in a sentence, and a **display formula block** that carries a plain-words reading
    and a "where" legend explaining each symbol under it;
  - a Korean chapter gets Korean terms and definitions (ids stay the same); formulas are the same in every
    language.

## The operator's bar

From `docs/reference/design/bar.md`, verbatim:

1. **The state bar scrolls away with the page; it is never pinned.** Its size may stay as the page's
   presets need.
   - "prototype state too big. which is fine. but just make it doesn't follow scroll." The operator,
     2026-10-19, at PENDING #1 of `01-reader/01-reader` (P29.S4). Source:
     `jobs/01-reader/rounds/01-reader/feedback.md`.
   - Made a rule for every canvas the same day. Asked "Should this apply to every canvas from now on
     (waves 2 and 3 too)? If yes, I'll add it to your standing design rules so you don't have to
     repeat it.", the operator answered "ok".

The shipped bar (the drafter's *working canvas*, *state bar* and *craft* sections) binds as before.

## The system inventory

- **Title: `knowledge`**, as the Design System Artifact shows it. Namespace `kb`. Artifact
  https://claude.ai/artifact/7qemgwHNsoPNf5kYHEJ4md, version `1792321604-e214` (`design.json`).
- **Cached at `jobs/10-reading-aids/canvas/project/ds/kb/`:** `tokens.css`, `tokens.json`, `README.md`,
  `fonts/` (Fraunces, Source Sans 3, JetBrains Mono). The README's colour, type, states and content rules
  bind: one accent (`kb-accent`), hairlines instead of boxes, `kb-hint` never for body text, no emoji,
  sentence case, Pretendard for Hangul with `word-break: keep-all` on Korean headings.
- **The product's source of truth** is `web/src/app/kb-tokens.css`: light is `[data-md-color-scheme="default"]`
  (warm ivory paper), dark is `[data-md-color-scheme="slate"]` (warm charcoal). Print is
  `web/src/app/kb-print.css`, the same DOM with `.pp-only` blocks shown only on paper.
- **Precedents in the reader** (what exists; documentation, not a decision):
  - there is **no popover primitive**. The nearest is the annotation popover in
    `web/src/components/reader/annotations.tsx` (`an-box an-pop`, `role="dialog"`, `aria-label`, Esc closes
    it), from the signed job `05-annotations`;
  - the reader's sheets (`web/src/components/reader/reader-frame.tsx`, signed job `01-reader`);
  - callouts, including a collapsed `DEFINITION` callout that explain chapters use today for a primer term
    (`web/src/lib/native/render.tsx`, signed job `02-figures`);
  - the quiz and its paper form (signed job `04-quiz`), the precedent for a glossary appendix on paper;
  - print and the paper look (signed job `09-legacy-and-print`).
- **The signed look** is jobs 01–09. Their closed round snapshots (`jobs/<job>/rounds/*/canvas/project/`)
  are the vocabulary to extend: the reading column, its type sizes, its hairlines, its states.

## Constraints

- **Viewports:** phone 390×844 and the narrow phone at 320 px; iPad 820×1180 portrait; desktop 1440×900 as
  the reference.
- **Themes:** light and dark, both drawn for every surface; print on paper (A4 and letter).
- **Input:** mouse hover, touch tap, keyboard (Tab reaches a term, Enter or Space opens it, Esc closes it and
  focus returns to the term).
- **The accessibility floor:** text ≥ 4.5:1, large text and UI ≥ 3:1, in light and dark, measured; the
  system's focus ring; targets ≥ 44 px on a phone; a state never shown by colour alone;
  `prefers-reduced-motion` respected; every control operable by keyboard; a formula has a text alternative
  a screen reader can speak.
- **The canvas has no network** except a Google Fonts `css2` link and uploaded assets, so no math library
  loads on it: draw formulas with the browser's native MathML or HTML and CSS. How the product renders them
  (the engine) is settled later by the research slice R1, which renders the signed look, so the canvas
  fixes the look, not the engine.

## Locked vs. in play

- **Locked:** the `kb` system's structure and token meanings; the reader's signed layout (jobs 01–09); the
  copy voice (the README's *Content fundamentals*); the accessibility floor; the data contract above.
- **In play:** the term marker's look; the window's form, placement, size and motion on desktop and phone;
  how the longer definition opens; the glossary section's layout and where it sits in the chapter; the
  inline formula's and the display block's typesetting, spacing and the legend's form; a long formula on a
  narrow phone; every print form.

## Collected taste, never invented

- The operator's words above: easy to understand, visual, formulas that "looks good", no wall of symbols.
- The established look, from the README: "A calm editorial library: warm paper, charcoal ink, one deep
  teal, and hairlines instead of boxes … Draw every surface as if it were a well-set page first and an app
  second."

## Shared data

Real text from the operator's own explain document "Our bar: performance rule v1" (their trading bot's
performance rule, published private in their knowledge base). Use these passages and terms; nothing on the
canvas is secret or personal.

- **Running text with terms and raw formulas, as published today:**
  - "The scorer takes each event's P&L in % of K and computes s = mean ÷ sd and t = s × √n. Thirty events
    averaging +0.10 % of K with an sd of 0.25 % give t ≈ 2.19, just over B6's 2.0; fifteen such events give
    1.55, enough for CONDITIONAL-GO's 1.5 but not for B6."
  - "The **deflated Sharpe ratio (DSR)** answers this. It is a probability, that the true Sharpe ratio beats
    a bar, with the bar raised for the number of trials."
  - "The scorer takes the participation ratio of the trials' correlation matrix, (Σe)² ÷ Σe² over its
    eigenvalues e: ten perfectly correlated trials count as 1, ten independent ones as 10."
  - "With independent arrivals at a steady rate, the count over a stretch is Poisson with mean
    λ = rate × time, and no event at all has probability e^(−λ)."
  - "**The probabilistic Sharpe ratio (PSR) turns a Sharpe ratio into a probability:** that the true one
    exceeds a chosen threshold, allowing for non-Normal returns; it rises with a longer record and positive
    skew and falls with fatter tails."
- **Terms** (write the definitions in plain words from these passages; an unknown fact stays a visible
  placeholder): Sharpe ratio; deflated Sharpe ratio (DSR); probabilistic Sharpe ratio (PSR); participation
  ratio; eigenvalue; walk-forward backtest; look-ahead bias; out-of-sample; drawdown; haircut; K (the
  position size the P&L is measured against); t-statistic.
- **Formulas:** t = s × √n with s = mean ÷ sd; the participation ratio N = (Σe)² ÷ Σe²; λ = rate × time and
  P(no event) = e^(−λ).
- **Edge cases:** a long term with an abbreviation ("probabilistic Sharpe ratio (PSR)"); a term with an
  alias ("DSR" for "deflated Sharpe ratio"); a term with no longer definition; a term near the right edge of
  the column and at the bottom of the screen; a term inside a sentence that is also highlighted (job 05); a
  Korean chapter (예: "디플레이티드 샤프 비율(DSR)") with a Korean definition; a glossary of about 12 terms; a
  long display formula on a 320 px phone.

## One direction

The operator asked for no options. Draw one direction and log open questions.

## The three paths

- The runtime: `docs/reference/design/.type/artifact-type/dc-runtime.js`.
- The type references: `docs/reference/design/.type/` (`SKILL.md`, `artifact-type/reference/format.md`,
  `craft.md`, `design-system-components.md`, `view-state.md`, `print.md`).
- The system namespace `kb`, cached at `jobs/10-reading-aids/canvas/project/ds/kb/`.
