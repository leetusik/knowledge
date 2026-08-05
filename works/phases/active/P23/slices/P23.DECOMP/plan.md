# Plan — P23.DECOMP (decompose "Document version control")

## Objective

Decompose P23 into middle slices. P23 adds version control to knowledge documents (the
posts themselves — NOT the agentic-workflow durable docs under `docs/versions/`): a coding
agent can fetch a document's previous versions and publish v2/v3 of the same document
instead of a new post or a destructive overwrite. Scope confirmed in `../../intent.md`:

1. Server schema/API — today identity is `UNIQUE(tenant_id, rel_path)` and the only
   re-publish path is destructive `overwrite: true` (`server/main.py` ~463–470: 409 on
   existing rel_path unless overwrite; overwrite replaces file + DB row).
2. Web — display version history for a document.
3. `/explain` skill — support versioned publishing, updated across all three copies:
   canonical `plugin/skills/explain/SKILL.md`, the `.agents/skills/explain` mirror, and
   the installed copy at `~/.claude/skills/explain/`.

All work lives in this knowledge repo (bootstrap repo is NOT involved — confirmed in
intent.md clarifications).

## Your job (decomposition executor)

1. Research the actual code before cutting slices. Key areas:
   - `server/main.py` (POST /api/documents, the 409/overwrite path, GET by-path, DELETE),
     `server/db.py`, `server/documents.py`, `server/documents_api.py`, `server/persistence/`,
     `alembic/versions/` (4 migrations exist; schema changes go through alembic).
   - How documents are stored on disk (rel_path layout, git-backed for tenant #1 via
     `server/gitops.py`) and how search/embeddings/reindex consume documents — decide and
     record what happens to search/graph/embeddings when a new version lands (e.g. only
     latest version is indexed).
   - Web document pages in `web/src` (P21 added delete UI there — see
     `works/phases/active/P21/phase.md` for pointers), to see where version history fits.
   - `plugin/skills/explain/SKILL.md` publish flow (step that POSTs, the overwrite retry
     at ~lines 353/388/433) and the mirror locations.
2. Decide the versioning design at the level needed to cut slices (record it in
   `phase.md` Findings): e.g. a `document_versions` table vs. version columns, what the
   API surface is (list versions, fetch a version, publish-new-version), and whether
   `overwrite` stays as-is for back-compat. Prefer additive, non-destructive design;
   existing docs become v1 implicitly or via backfill.
3. Create the middle slices with `new-slice` (bare folders — never pre-fill their
   `plan.md`). Likely shape (adjust from your research, keep slices sequential):
   - S1: server schema + migration + version-aware API (publish v2/v3, list/fetch
     versions) — `--kind implementation --risk high`
   - S2: web version history display — `--kind implementation --risk high`
   - S3: `/explain` skill versioned publishing across canonical + `.agents` mirror +
     installed copy — kind implementation; risk: high if the skill edit is substantial
     (it is cross-file), low only if it truly ends up a few lines per copy (unlikely —
     default high).
   Use `--order` to sequence between DECOMP (order 1) and REVIEW (order 99 or similar);
   check existing orders with `python3 scripts/workflow.py next` context / slice.json.
4. Seed `phase.md`: decomposition rationale, findings (including the versioning design
   decision), constraints, and any doc-impact expectations. Append — don't rewrite
   existing sections' headers.

## Constraints

- This is NOT a design-bearing phase: the web part follows the existing document-page
  patterns (as P21's delete UI did); no co-work/design slice, no DECOMP2.
- Keep the slice count lean (3-ish middle slices); slices stay sequential.
- Tests: minimal high-value cases only (repo hard rule — no fixture sprawl).
- You may run only `new-slice` among state commands; no commits, no status transitions.
- Durable-doc changes are NOT versioned here — implementation slices append one-line
  "Doc impact" notes to `phase.md`; the REVIEW slice consolidates.
