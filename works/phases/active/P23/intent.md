# Intent — P23

- Captured at: 2026-08-05T14:25:01+09:00
- Origin: operator

## Original Input (verbatim)

> for below tasks:
> ---
> 1. the documents should be able to remove on the web.
> 2. the graph all grpah title shown is kinda sucks. make it possible to see only clicked one.
> 3. the documents should be handled version control. so the coding agent can see the previous document, and add v2 and v3 of it not new post. you should support this feature, and /explain will be updated in bootstrap repo. you create phase for them. on the ./bootstrap...sh
> 4. changple5 prod successfully connected to the knowledge prod. but reported some callback? is disconnected. even the docuemnt uploading it self is successful.

(This phase covers item 3; the four items were split into phases P21–P24.)

## Confirmed Intent (refined + clarified)

Add version control to knowledge documents. Today posts have no version concept — identity is `UNIQUE(tenant_id, rel_path)` and the only re-publish option is a destructive `overwrite: true`. After this phase, a coding agent can see a document's previous versions and publish v2/v3 of the same document instead of creating a new post. Scope: server schema/API, web display of version history, and the `/explain` skill updated to support versioned publishing — across its canonical copy (`plugin/skills/explain/SKILL.md`), the `.agents/skills/explain` mirror, and the installed copy at `~/.claude/skills/explain/`. All work lives in this knowledge repo.

## Clarifications Resolved

- Q: The operator's request said "/explain will be updated in bootstrap repo" — but /explain is canonical in this knowledge repo (plugin/skills/explain), not bootstrap (which owns only the workflow skills). Where should this phase live? — A: All in the knowledge repo; nothing in bootstrap. The bootstrap mention was based on a mistaken assumption about where /explain lives — corrected and confirmed.

## Notes

- Do not confuse with the agentic-workflow durable-doc versioning (`docs/versions/`, `doc-new-version`) — this phase is about the knowledge posts themselves.
- Current destructive path: `POST /api/documents` 409s on existing rel_path unless `overwrite: true` (`server/main.py:463–470`); an overwrite replaces file + DB row, prior content recoverable only from git for tenant #1.
