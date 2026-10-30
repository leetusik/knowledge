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
