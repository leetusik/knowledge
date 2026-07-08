# Intent — P5

- Captured at: 2026-07-08T16:35:37+09:00
- Origin: operator

## Original Input (verbatim)

> we have /explain. the personal knowledge store. and I kinda like it and want to make it like plugin style feature. so that other users can use the feature. you make up both repo's phases. and give me execution order. note that I want to develop the knowledge feature first(improve then current, and webui feature add(github page as is). graphic, search engine, obsidien like knowledge map.. etc.. gonna use claude design for designing the webui.

Follow-up (same session):

> And I think knowledge will be eventually SaaS like feature later. just note that and proceed. it's not today's job.

## Confirmed Intent (refined + clarified)

Second phase of the knowledge-feature roadmap (after P4 core improvements): a Claude-designed visual overhaul of the MkDocs GitHub Pages site plus an upgraded search experience. Hosting stays GitHub Pages ("github page as is") — this is a redesign of the static site, not a hosting change. The operator wants Claude to do the design work ("gonna use claude design for designing the webui"), not an external designer or off-the-shelf theme. The Obsidian-like knowledge map is deliberately NOT in this phase — it is its own phase (P6). Open deferred job D2 (design polish for the Pages site) is absorbed here: promote it into this phase at decomposition.

## Clarifications Resolved

- Q: What does "plugin style" mean for how other users install the feature? — A: A real Claude Code plugin (`.claude-plugin/` + marketplace manifest), installable via `/plugin`.
- Q: Where should the plugin live? — A (verbatim): "well, after knowledge claude plugin done, the explain related stuff will discarded from this bootstrap repo. so, knowledge. and leave current state as is till knowledge done." → The plugin lives in this knowledge repo; the bootstrap repo stays exactly as-is until the plugin ships, then retires its embedded /explain (bootstrap P7).
- Q: One web-UI phase or two? — A: Two (this phase = design + search, P6 = knowledge graph); operator confirmed all feature work lives in this repo's backlog, not the bootstrap repo.

## Notes

- Roadmap execution order: knowledge P4 → P5 → P6 → P7, then bootstrap P7 (retire embedded /explain).
- Absorb deferred D2 (design polish) — promote into this phase at decomposition.
- Operator direction: knowledge will eventually become a SaaS-like feature. Not today's job — record it, keep the architecture from precluding it, but it is out of scope for this phase.
