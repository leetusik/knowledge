# Intent — P7

- Captured at: 2026-07-08T16:35:37+09:00
- Origin: operator

## Original Input (verbatim)

> we have /explain. the personal knowledge store. and I kinda like it and want to make it like plugin style feature. so that other users can use the feature. you make up both repo's phases. and give me execution order. note that I want to develop the knowledge feature first(improve then current, and webui feature add(github page as is). graphic, search engine, obsidien like knowledge map.. etc.. gonna use claude design for designing the webui.

Follow-up (same session):

> And I think knowledge will be eventually SaaS like feature later. just note that and proceed. it's not today's job.

## Confirmed Intent (refined + clarified)

Final knowledge-repo phase of the roadmap (after P4–P6 have improved the feature and the web UI): package the knowledge feature as a real Claude Code plugin hosted in this repo, so other users can install and use it. Concretely: a `.claude-plugin/plugin.json` + marketplace manifest, shipping the explain skill, plus a setup flow that scaffolds a new user's own KB (document API server, MkDocs site, GitHub Pages workflow). Installable via `/plugin` by any Claude Code user, independent of the operator's bootstrap workspace system. Once this phase's review passes, the bootstrap repo's P7 (retire embedded /explain) becomes unblocked — until then the bootstrap repo stays exactly as-is.

## Clarifications Resolved

- Q: What does "plugin style" mean for how other users install the feature? — A: A real Claude Code plugin (`.claude-plugin/` + marketplace manifest), installable via `/plugin`. (Chosen over: extending the bootstrap installer, a fork-and-go template repo, or a plugin+template combo.)
- Q: Where should the plugin live? — A (verbatim): "well, after knowledge claude plugin done, the explain related stuff will discarded from this bootstrap repo. so, knowledge. and leave current state as is till knowledge done." → The plugin lives in this knowledge repo; the bootstrap repo stays exactly as-is until the plugin ships, then retires its embedded /explain (bootstrap P7).

## Notes

- Roadmap execution order: knowledge P4 → P5 → P6 → P7, then bootstrap P7 (retire embedded /explain).
- Operator direction: knowledge will eventually become a SaaS-like feature. Not today's job — but this phase in particular should keep the architecture (config, auth boundaries, storage assumptions) from precluding a hosted multi-user version. Out of scope to build it.
- Shipping this plugin unblocks the bootstrap repo's P7, which removes `.claude/skills/explain`, `.agents/skills/explain`, the `--with-explain` installer path, and KB API wiring over there.
