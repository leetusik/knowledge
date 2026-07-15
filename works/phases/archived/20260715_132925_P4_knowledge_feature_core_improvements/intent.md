# Intent — P4

- Captured at: 2026-07-08T16:35:37+09:00
- Origin: operator

## Original Input (verbatim)

> we have /explain. the personal knowledge store. and I kinda like it and want to make it like plugin style feature. so that other users can use the feature. you make up both repo's phases. and give me execution order. note that I want to develop the knowledge feature first(improve then current, and webui feature add(github page as is). graphic, search engine, obsidien like knowledge map.. etc.. gonna use claude design for designing the webui.

Follow-up (same session):

> And I think knowledge will be eventually SaaS like feature later. just note that and proceed. it's not today's job.

## Confirmed Intent (refined + clarified)

First phase of the knowledge-feature roadmap (knowledge P4 → P5 → P6 → P7, then bootstrap P7). Before adding web-UI features or packaging anything as a plugin, improve the current knowledge feature itself: the /explain skill contract, the FastAPI document API, indexing, and config/portability. The operator deliberately left the concrete scope open — the DECOMP slice audits the pipeline and proposes the improvement slices. This phase is groundwork for the web-UI phases (P5, P6) and the Claude Code plugin phase (P7).

## Clarifications Resolved

- Q: What does "plugin style" mean for how other users install the feature? — A: A real Claude Code plugin (`.claude-plugin/` + marketplace manifest), installable via `/plugin`.
- Q: Where should the plugin live? — A (verbatim): "well, after knowledge claude plugin done, the explain related stuff will discarded from this bootstrap repo. so, knowledge. and leave current state as is till knowledge done." → The plugin lives in this knowledge repo; the bootstrap repo stays exactly as-is until the plugin ships, then retires its embedded /explain (bootstrap P7).
- Q: What should "improve the current" cover (portability/config, /explain output quality, server/API robustness)? — A: Decide at decomposition — keep the phase objective broad.
- Q: One web-UI phase or two? — A: Two (P5 design + search, P6 knowledge graph); operator confirmed all feature work lives in this repo's backlog, not the bootstrap repo.

## Notes

- Roadmap execution order: knowledge P4 → P5 → P6 → P7, then bootstrap P7 (retire embedded /explain).
- Operator direction: knowledge will eventually become a SaaS-like feature. Not today's job — record it, keep the architecture from precluding it, but it is out of scope for this phase.
