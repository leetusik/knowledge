# Intent — P31

- Captured at: 2026-10-21T18:54:00+09:00
- Origin: operator

## Original Input (verbatim)

> I think this would better:
> --
> 1. I can accept the 1.
> 2. But I want workflow's phase handle the explain workflow. the explain phase might contain research, diagram drawing, quiz generating, and stuff. so that a document or many chapters can be done by detailed, with carefult agentic flow not just one prompt one document.

> 1. yes
> 2. every chapter. but when?
> 3. private by default.
> 4. prepare it from here, and then tell bootstrap to apply the change.(it's on me)

> yes, and /do-whole-phase right away

## Confirmed Intent (refined + clarified)

Explaining becomes a **workflow phase**, not one prompt making one document. An explain phase turns a subject into
a carefully built book, with research, an outline, diagrams, figures and quizzes. The subject is either a code
phase (for example "explain P30") or a general topic. The steps run as separate agent work, each checked.

The shape the operator confirmed:
- **Research and outline first.** The phase's decomposition researches the source and writes the book outline:
  chapters, learning order, which ideas need a diagram, what each quiz tests. **The operator signs the outline**
  before any chapter is written.
- **One slice per chapter.** Each chapter is drafted as a native chapter in the repo, not published. It is checked
  against the publish rules, then judged by a **fresh-eyes critic** (facts and citations, diagrams correct, the
  quiz tests understanding), and then revised once. The critic runs on **every chapter**, inside that chapter's
  slice, so later chapters build on corrected ones.
- **The review** reads the whole book for flow, renders it in the reader, and then publishes every chapter at once.
- **Private by default.** The operator makes a book public after accepting it.
- **The operator accepts** by reading the book in the real reader.
- The one-shot `/knowledge:explain` stays for quick single chapters. The writing rules (grammar, ids, quiz,
  sources, publish) stay in the knowledge plugin's skill, and the phase refers to them rather than copying them.

What this phase delivers, **prepared in this repo**:
1. `knowledge check`: validates a chapter against the publish rules without publishing, through the CLI and a
   server endpoint.
2. A ready-to-apply package for the bootstrap (workflow) repo: the explain route for phase creation, the
   decomposition and review references, the per-chapter slice procedure, and an explain-critic agent.
3. An updated `handoff-explain.md`, telling the bootstrap agent to apply the package as well as retire its old
   HTML `/explain` and point at the plugin.

**Out of scope:** editing the bootstrap repo, which the operator relays ("it's on me"), and writing any actual book.

## Clarifications Resolved

- Q: Accept the plugin owning the skill (retire the bootstrap's old HTML `/explain`, pointer only)? — A: "I can
  accept the 1."
- Q: Should the operator sign the book outline before chapters are written? — A: "yes".
- Q: Critic pass on every chapter or only hard ones? — A: "every chapter. but when?" Answered and confirmed:
  inside each chapter slice, after the draft and validation, then one revision, before the slice closes.
- Q: Publishing? — A: "private by default."
- Q: Where is it built? — A: "prepare it from here, and then tell bootstrap to apply the change.(it's on me)".
- Q: Name and objective as proposed? — A: "yes, and /do-whole-phase right away".

## Notes

- The acceptance gate is required. The operator checks `knowledge check` on a real chapter, and reads the package
  and the handoff note before relaying them.
- The bootstrap repo (`/Users/sugang/projects/personal/bootstrap_agentic_workspace.sh`) may be read for its current
  `create-phase` routes and its agent and skill shapes. It is never edited.
