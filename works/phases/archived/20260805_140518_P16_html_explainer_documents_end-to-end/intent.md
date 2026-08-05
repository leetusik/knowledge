# Intent — P16

- Captured at: 2026-07-21T13:17:09+09:00
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

This phase is item 4 of the request (plus the enabling API work): make standalone, self-contained interactive HTML explainer documents a **first-class KB document type end-to-end** — the document API accepts them, they are stored under `docs/<project>/` alongside markdown, the web app renders them safely **with their interactivity (quiz JS) working**, search (FTS5 + hybrid) indexes their extracted text, and the MCP read path (`fetch_document`, contract v1 additive-only) handles them sanely.

Starting point (verified 2026-07-21): standalone/raw HTML is unrenderable today — the FastAPI layer has no HTML document routes, the web viewer uses `react-markdown` **without** `rehype-raw` (raw HTML deliberately stripped, "XSS-safe by construction"), and the FTS index covers markdown only. Preserving that safety stance while letting explainer interactivity run is the core design problem of this phase (approach is DECOMP/design detail, not decided here).

## Clarifications Resolved

- Q: Should explain v2 keep the markdown topic mode or always emit HTML? — A: One skill, both topic and code-change modes, **always emitting the gist-style HTML explainer** (so this pipeline is the rendering path for all future explainers).
- Q: One knowledge phase or several? — A: Two — **P16 = this HTML pipeline, P17 = the skill upgrade + public ingestion**; pipeline lands first so emitted HTML is renderable the moment the skill ships.
- Q: How far does "for all knowledge users" go now? — A: Full multi-user (P17's concern; context for API/auth surface touched here).
- Q: Where does the existing bootstrap P7 ("Retire embedded /explain", gate satisfied) fit? — A: It runs **first**, before this phase.

## Notes

- Cross-repo execution order: bootstrap P7 → **knowledge P16** → knowledge P17 → bootstrap P8 (auto-explain at phase review).
- Target format the pipeline must carry (from the gist): single self-contained HTML file with inline CSS+JS; sections Background / Intuition / Code / Quiz; interactive multiple-choice quiz with feedback; HTML (not ASCII) diagrams; responsive.
- Existing markdown documents and their rendering/search behavior must be unaffected.
