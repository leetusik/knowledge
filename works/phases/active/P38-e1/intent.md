# Intent — P38-e1

- Captured at: 2026-10-30T23:45:48+09:00
- Origin: operator

## Original Input (verbatim)

The operator, in the arb_upbit_1 session, after explain phases P50-4b (the bar v2) and P51-3q (its Korean translation) ran there:

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
- where: "Own worktree (Recommended)";
- the two names and objectives: "Yes, create both".

Point 4 (the glossary) is the sibling phase P39-hk.

## Confirmed Intent (refined + clarified)

Make a `/knowledge:explain` run cost what the document needs, not a 30-agent research project, and ship it as **plugin 0.9.0**.

The metered case that prompted it (arb_upbit_1, `dispatch-summary`):

- **P50-4b**, a v2 of a three-day-old document whose code had not changed: **$79** and 33 agents.
  - research $45: 5 code researchers, 5 web researchers, 19 verifier batches, 2 gap reviews and the lead;
  - writing $18: the draft went 7,600 → 5,800 → 4,770 words;
  - the critic $11: it re-opened all 34 sources;
  - the review $2.3.
- **P51-3q**, the Korean translation: $7.84 for a $2.26 translation.
- The phase that built the subject, P42, cost at most about $78. Explaining it cost more than making it.

What the operator wants changed, in the explain skill and its agent briefs (kept in parity):

1. **A delta mode for a v2.** When a prior exists, research only what changed since it. The prior's verified claims are reused when their sources are unchanged, checked by content, instead of being re-proved from scratch.
2. **A team sized by the document.**
   - Researchers are capped by the document's word budget: a document gets at most about 4, and the top tier is for books only.
   - Claims are capped at about the number of checkable sentences the budget holds.
   - Sizing weighs where the evidence lives (the repo or the web) and whether a prior exists. Today the sizing takes the highest of three scores, so any rich subject gets 7–10 researchers.
3. **Verify only what is used.** The outline picks its claims first, and only those are verified. Today every claim the researchers return is verified: 256 here, many of them never used.
4. **A cheaper, independent critic.** It runs on a model other than the writer's (Sonnet for an Opus writer), trusts the run's own verifier records, and re-opens only a small sample of sources.
5. **A writer held to budget.** Section word budgets apply while drafting, not afterwards. The trace is appended to, never rewritten whole.
6. **No secret leakage.** The KB resolver never prints the API key (today §2 prints `KB_API_TOKEN` into the transcript), and every KB call goes through the `knowledge` CLI or a header file.
7. **An honest confirmation.** The front door shows the metered cost of the proposed run. When a prior exists or the subject is narrow, it offers the cheaper run (quick or delta).
8. **Translations stay cheap.** A translation is one write span with no research. A loose document has no language variants: a `--lang ko --new-version` save onto the English becomes the next version and replaces it. So the skill says how to publish a loose document's translation as a document of its own.

## Clarifications Resolved

- Q: One phase or two? — A: Two. This one is A, the cost fixes. The glossary is P39-hk, run after this phase merges, because both edit the explain skill.
- Q: Where does it run? — A: In its own worktree ("Own worktree (Recommended)").
- Q: What about the workspace-template side (a translation as an extra write slice in the same explain phase, explain reviews on the mid row)? — A: Out of scope here. It lives in the bootstrap repo (`bootstrap_agentic_workspace.sh` upstream).

## Notes

- Evidence on disk in arb_upbit_1:
  - `works/phases/active/P50-4b/doc/run.md`, `doc/critique.md` and the `slices/*/result.md` files;
  - `works/phases/active/P51-3q/`;
  - the metered table: run `python3 scripts/workflow.py dispatch-summary --phase P50-4b` in that repo (likewise `--phase P51-3q` and `--phase P42`).
- The API key printed during P50-4b should be rotated. That is the operator's action, outside this phase.
- The worktree is the operator's word: start it with `parallel-start` when the phase is executed.
