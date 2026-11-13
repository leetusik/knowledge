# Intent — P17

- Captured at: 2026-07-21T13:17:14+09:00
- Origin: operator

## Original Input (verbatim)

> you should create phase for both this repo and bootstrap_agentic_workspace. And give me execution order. You ask me questions if anything unclear.
>
> ---
> 1. I want to upgrade `/explain` skill to "https://gist.githubusercontent.com/geoffreylitt/a29df1b5f9865506e8952488eac3d524/raw/126e7fe9eecaafadfe1ac8bb183d135812b608f2/explain-diff-html.md" like this one.
> 2. for all review slices, want to use the skill automatically. basically phase review + docs + and the explain.
> 3. maybe using claude code plugin or whatever. I need to link the explain skill with knowledge webui since it's deployed publically. for all knowledge users.
> 4. knowledge should me properly render the explain skill generated html. and should be able to searchable.

Follow-up (same session):

> And maybe for explain skill, it could contain internet search kind of job for beyond codebase. so that it can contain comparing our implementation and best practices, and maybe suggest next steps.

## Confirmed Intent (refined + clarified)

Items 1 + 3 of the request, plus the follow-up: upgrade the explain skill — **plugin copy canonical** (`plugin/skills/explain`), all other copies reconciled — to **always emit a gist-style self-contained interactive HTML explainer** (Background / Intuition / Code / Quiz; interactive MCQ quiz with feedback; HTML diagrams, not ASCII; responsive; concrete toy-data examples) for **both** modes: explaining a topic and explaining a code change/diff/phase. The markdown house style is fully replaced (one format everywhere).

Research goes beyond the codebase: a **default-on, citation-backed "Best practices & next steps" section** from web research — where the implementation aligns with prevailing practice, where it deliberately diverges, and 2–4 concrete suggested next steps, every claim carrying a source link. The skill skips the section by judgment (purely internal subjects, trivial fixes) and degrades gracefully offline — required because bootstrap P8 will run this skill unattended at phase reviews.

Ingestion links to the **publicly deployed KB** (`https://knowledge.hi2vi.com`), not just localhost: every knowledge user posts explainers to **their own tenant with their own key** — including closing whatever prod accounts/auth deploy gap that requires (the P10–P13 accounts-plane cutover was never deployed to prod).

## Clarifications Resolved

- Q: Should explain v2 keep the markdown topic mode or always emit HTML? — A: **Both modes, always HTML** — one skill, one output format; review auto-explain uses the change mode.
- Q: Always-on web research, or optional? — A: Operator delegated ("it's your call") → decided **default-on with a judgment gate**, dedicated cited section, graceful offline skip. Rationale: an opt-in flag would never fire in the automated review path, which is where comparison + next steps pay off most; hallucination risk in a public KB is managed by mandatory citations, cost by the judgment gate.
- Q: How far does "for all knowledge users" go now? — A: **Full multi-user** — plugin users post to their own tenant on the public host with their key, including the prod auth/deploy gap-closing that requires.
- Q: One knowledge phase or several? — A: Two — P16 pipeline first, then this phase (emitted HTML must be renderable the moment the skill ships).
- Q: Where does the existing bootstrap P7 fit? — A: First in the overall order.

## Notes

- Cross-repo execution order: bootstrap P7 → knowledge P16 → **knowledge P17** → bootstrap P8. Depends on P16 (HTML pipeline) being done.
- Skill copies today: `plugin/skills/explain/SKILL.md` (shipped payload, canonical going forward), project `.claude/skills/explain` (byte-identical to user-level `~/.claude/skills/explain` — a duplicate registration to reconcile during this phase), `.agents/skills/explain` (portable variant without Claude-specific frontmatter). Bootstrap's embedded copy is removed by bootstrap P7 before this phase.
- Exact section placement of "Best practices & next steps" and any force-on/off argument are DECOMP detail.
- Operator's long-standing note (bootstrap P7 intent): knowledge eventually becomes a SaaS-like feature — context only, not this phase's job beyond the ingestion/auth work confirmed above.
