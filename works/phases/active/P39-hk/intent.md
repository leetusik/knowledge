# Intent — P39-hk

- Captured at: 2026-10-30T23:45:53+09:00
- Origin: operator

## Original Input (verbatim)

The operator, in the arb_upbit_1 session, after explain phases P50-4b and P51-3q ran there:

> p50 and 51 done well I guess. But It's too costly. you propose a knowledge update to fix this problem.
> ---
> 1. I asked you to explain about the bar, and you used more usage then the bar made phase.
> 2. while you doing that, any leakage, waste part existed?
> 3. and maybe overstepped? you tell me.
> 4. and I need some glossary since terminolgy very difficult. if a user clicks or hover the word that the glossary got, maybe show some window explaining that term.
> 5. I think we gone to far. you check up again. like, dispatching 10 + subagents are acutally needed?

Then, after the proposal:

> create a phase to ~/projects/personal/knowledge

Answers to the clarifying questions:
- scope: "Two phases: A, then glossary (Recommended)";
- design style: "build-after (Recommended)";
- mockup: "Sign on the canvas (Recommended)";
- where: "Own worktree (Recommended)";
- the two names and objectives: "Yes, create both".

This phase is point 4. Points 1–3 and 5 are the sibling phase P38-e1.

## Confirmed Intent (refined + clarified)

Explain documents use hard terminology, so a native chapter can carry a **glossary**. In the reader, a glossary term in the text can be hovered (desktop) or tapped/clicked (phone, keyboard). That opens a small window explaining the term, and the chapter also has a glossary section listing every term.

The shape proposed and confirmed:

- **A glossary block** in the native grammar: one per chapter. Each term has an id, the term, optional aliases, a short definition (about 40 words) and an optional longer one.
- **Term links** in the text, e.g. `[DSR](term:dsr)`:
  - validated like a `#id` link, so an unknown term is refused at publish;
  - linked explicitly by the writer, never auto-detected (a word like "bar" would mislink).
- **The reader:**
  - the term shows a subtle marker;
  - hover or tap opens the window with the short definition, a way to see the longer one, and a link to the glossary section;
  - it is keyboard-reachable and Esc closes it;
  - print turns the glossary into an appendix.
- **Search and translation:** search indexes the glossary text. A translation keeps term ids verbatim and translates the terms and definitions, so the Korean chapter gets Korean definitions.
- **The explain skill:** the outline lists the reader's terms; every definition traces to evidence like any sentence; the critic flags jargon left unlinked on first use.

## Clarifications Resolved

- Q: One phase with the cost fixes, or its own? — A: Its own, run **after P38-e1 merges**, since both edit the explain skill.
- Q: Design style? — A: `build-after`.
- Q: Mockup? — A: Sign on the canvas; no in-product mockup unless asked later.
- Q: Where does it run? — A: In its own worktree.

## Notes

- Likely touch points, for `DECOMP`, not a plan:
  - the server's native grammar (`server/native/`: `schema.py`, `parse.py`, `refs.py`, `project.py`);
  - the reader (`web/src/components/reader/`: the article and print views, plus a new term window);
  - the plugin's explain skill (§4 grammar, ids, translation) and its agent briefs.
- The worktree is the operator's word: start it with `parallel-start` when the phase is executed.

## Design Style

`build-after`: design the definition window and the glossary section on a canvas the operator signs, then build the server, reader and skill changes in this same phase. The surfaces are small, and the whole design should land before any of it is built.
Mockup: on request

## Scope Added at Execution (2026-11-02)

The operator, invoking `/do-whole-phase` on P39-hk (verbatim):

> p39 on worktree but more things.
> --
> 1. I think current novice programmer, and prefixed sections kinda stuff just not good. maybe it would be good to get suggestion before the writing. 
> 2. I didn't try to explain anything after p38 but I think it's good to highlight once again. no hard reading, many visual stuff, including looking good formula. don't just shitting around with 수학 기호들. I'm not prohibit them but make them looks good. and easy to understand.

To the proposal folding 1 and 2 in: "yes". Then, before it was recorded:

> and this also. I changed my mind. all of the explains will cover based on only what the codebase does. no new things. and don't try to research by explainer self. just embrace the what phases are did. if a subject is in code but no dedicated phase, maybe you suggest research phase first, and then explain.

To the proposal folding 3 in: "yes".

### Confirmed (refined + clarified)

The phase keeps the glossary above and adds three things. Where they conflict with the *Confirmed Intent* above, these lines win.

**A. Suggest the reader and the shape, never a template.**
- The confirmation's reader line is a concrete guess from the request and the operator's situation (who they are, what they know, what they are new to), never a stock "a novice".
- Its sections follow the subject (the questions this reader asks, in the order they ask them), not the fixed Background → Intuition → Code → Best practices → Quiz outline. The confirmation also offers one or two other shapes, one line each; the operator picks or edits, still one confirmation.
- The fixed parts loosen: Sources and the short "In one paragraph" box stay; the Quiz is suggested only when the subject earns it, and the operator may drop it; best practices go (C).

**B. Easy reading, visuals first, formulas that look good.**
- Writer and critic rules: a diagram, chart or figure wherever a picture explains better than a paragraph; short paragraphs, no dense stretch; the critic flags hard reading and a missing visual.
- Real math in the native grammar: inline formulas and a display formula block, typeset properly in the reader and in print, validated at publish, kept verbatim across translation. A display formula carries a plain-words reading and a "where" legend explaining each symbol under it. The critic flags a bare symbol string in prose.
- The design canvas covers the term window, the glossary section and the formula block (display, inline, legend).

**C. Explain only what the code does, from what the phases recorded.**
- No research by the explainer: no web search, no research agents, no fact-check batches, no gap rounds. One writer reads the records of the phases that built the subject (intent, decisions, slice results, research findings) and the code itself.
- Every sentence traces to a code range or a line of those records; a critic on a second model checks the draft against them before publish.
- No new things: an idea the code relies on is explained only as far as the code and the records state it; nothing comes in from outside.
- A subject in the code that no phase covers: the confirmation says so and offers to create a research phase first (it reads the code and records findings); the explain runs from those findings afterwards, on the operator's word, never automatically.
- Subjects in no code (general mode) are dropped: the plugin's explain becomes codebase-only for everyone who installs it, and such a request is declined plainly. Subject books go with it; codebase books stay, their chapters drawn from phases.
- P38-e1's research sizing goes: team sizing, verify-only-the-used-claims, the quick / full / no-research choice and the price table; the four research agents (web, code, gap, verifier) are retired. Kept: the signed sections (now A's suggested shape), the plain-words summary, translation, and v2 (the prior plus the phases since). The cost line is one writer plus one critic.
- "Best practices & next steps" becomes **next steps** only, from the workspace itself (open deferred jobs, open questions, decisions not yet built), suggested when there is something open.
- Glossary definitions and formulas trace to the code and the records too.
- Where it lands: the plugin's explain skill and agents, and the workspace's explain route (create-phase's route, the explain decomposition, chapter and review references), which lives in the bootstrap template repo (`payload/claude/skills/`).

### Clarifications Resolved (at execution)

- Q: Where does it run? — A: Its own worktree ("p39 on worktree").
- Q: Best practices and Quiz? — A: Suggested only when the subject earns them; best practices then go by C.
- Q: Other shapes at the confirmation? — A: One or two alternatives beside the tailored outline.
- Q: One phase or two? — A: One, P39.
- Q: Subjects in no code? — A: Dropped; the explain is codebase-only.
- Q: P38-e1's machinery? — A: The research sizing is removed, as listed in C.
- Q: Name? — A: "Explain what was built: phase-grounded, suggested shape, glossary, formulas".
