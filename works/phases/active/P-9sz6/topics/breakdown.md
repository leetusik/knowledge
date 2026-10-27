# P-9sz6 breakdown

## Passes

- DECOMP (P-9sz6.DECOMP, 2026-10-27): one middle slice, `P-9sz6.S1` (research), between DECOMP and REVIEW. Not an explain phase, not a design phase; no `DECOMP2` is planned (nothing has to be learned before the cut).

## Estimate

Time only, from `dispatch-summary`'s `means` block (metered, 2026-10-27):

- `P-9sz6.DECOMP`: decomposition kind mean 7.2 span-min/slice (this span).
- `P-9sz6.S1`: research kind mean 32.8 span-min/slice (2.0 spans/slice; research row 20.6 min/span).
- `P-9sz6.REVIEW`: one high-row span, 86.3 min/span. The review kind mean (442 span-min/slice, 3 spans/slice) comes from gated product reviews with browser walkthroughs and re-review rounds; this phase reviews two text files and changes no product surface, so the single-span figure is the better fit.
- Phase total: about 126 span-min (~2 h) on a first-pass review; each re-review round adds about one more high-row span.

## Why one slice

The deliverable is one coherent writing job over two repos' text, with no product code. The source reading is large (the plugin's `explain/SKILL.md` is 158 KB, the bootstrap engine 850 KB) but selective: a handful of named sections plus grep hits, which one high-row context holds, with `Explore` for the bulky summaries. Splitting the plugin-side analysis into a slice of its own would add a findings hop and lose the thing the handoff most needs, both repos in one context, since the workflow/plugin ownership split is judged across them. No set is shared with another open slice, so there is nothing to parallelize.

## P-9sz6.S1

- Name: Write the explain-as-a-phase handoff and bootstrap prompt
- Goal: write `handoff.md` (the design for the bootstrap-repo session: every decision in `intent.md`'s *Confirmed Intent*, why, what differs from today, the workflow/plugin ownership split, the real places that change located by reading both repos, and a closing list of what the workflow author decides) and `prompt.md` (a short paste-in prompt for a bootstrap-repo session pointing at `handoff.md` and asking for the new workflow version per that repo's own `CLAUDE.md`: changelog fragment, build, release rules).
- Kind: `research` (findings-only: the handoff is the finding; no product code, nothing edited in either repo outside this phase folder).
- Set: `works/phases/active/P-9sz6/handoff.md`, `works/phases/active/P-9sz6/prompt.md`, its own slice folder `works/phases/active/P-9sz6/slices/P-9sz6.S1/`, any `works/phases/active/P-9sz6/topics/<slug>.md` it adds, and `phase.md` via `phase-section`. Read-only: `plugin/` in this repo, and the bootstrap repo's `payload/` and `CLAUDE.md` (never its installed `.claude/` copies).
- Risk and trigger: `high`, routed by kind (research row). The trigger it would carry anyway: open design (the handoff makes design calls the plan cannot pin, e.g. how the explain worktree default coexists with "a worktree starts only on the operator's word").
- spends money: no
- Depends on: none (declared `--depends-on none`).
