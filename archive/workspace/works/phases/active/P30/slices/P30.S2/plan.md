# P30.S2 — Books and chapters (server)

## Goal

Ship the server's book and chapter model, as P29 S1 settled it:
- on-disk book manifests;
- SQLite `books` / `chapters` / `chapter_variants`, rebuilt by reindex;
- the `lang:` header;
- publish placement from `book` / `chapter` / `lang` / `translated_from` / `subject`;
- the book routes;
- book-aware search hits.

No web UI and no migration of existing documents. S6 binds them; this slice provides `PUT`, which S6's tool
calls.

## Read first (just in time)

- `works/phases/active/P30/topics/slice-breakdown.md` → **S2**: the scope list. It is the checklist.
- P29's contracts, through `python3 scripts/workflow.py phase-section P29 Decisions`, reading only these
  headings: *S1 Entities*, *Book*, *Chapter*, *Versions × variants*, *Where each piece lives*,
  *Phase or slice → chapter*, *Compatibility*. Also skim *Privacy* / visibility as it touches book routes.
  Use an `Explore` agent if the section is large; its brief is advisory.
- `works/phases/active/P30/phase.md` → `## Decisions` (A1–A5: images stay out of git, A2) and
  `## Notes for later slices` (standing gates, D22).
- The code you extend:
  - `server/documents.py`, `server/documents_api.py`, `server/publish.py`, `server/reindex.py`,
    `server/search.py`, `server/app_api.py`, `server/gitops.py`, `server/db.py` / `server/persistence/`;
  - the existing tests in `tests/`, especially `test_documents_api.py`, `test_api_write.py`,
    `test_public_read.py` and `test_reindex.py`;
  - `mcp-server/` only if search results flow through it unchanged. If MCP needs the new fields, add them
    additively.

## Approach (pinned)

1. **Manifests:** `<root>/.books/<project>/<book>.json`, in exactly the shape P29 *Book* gives (ordered
   chapters, each chapter key → its language variants → document stems).
   - Written under the existing write lock.
   - For tenant #1 (the git-backed tenant), commit the manifest in the same commit as the chapter, the way
     `gitops.py` commits documents today. `.assets/` stays gitignored (A2; S4 owns assets).
2. **SQLite:** add `books`, `chapters` and `chapter_variants` to the existing SQLite index store, in the
   column shapes P29 gives.
   - They are a derived index: `server/reindex.py` gains a third walk that rebuilds them from the manifests.
     Deleting the DB and reindexing restores them exactly.
   - Follow how the existing index tables are created and migrated. Do not touch the Postgres accounts
     schema (alembic); that is S8's.
3. **Header:** accept and store `lang:`, defaulting as P29 says.
4. **Publish placement:** `POST /api/documents` (and the MCP write path, if it shares the code) accepts
   optional `book`, `chapter`, `lang`, `translated_from` and `subject`, with the validation and placement
   P29 *Chapter* and *Versions × variants* define.
   - A document with no `book` stays a loose document exactly as today, storing `subject` if given.
   - **Compatibility is additive:** every existing request, response field and URL behaves exactly as
     before.
5. **Routes:**
   - `GET /api/books?project=`, plus `GET` and `PUT /api/books/{project}/{book}` (API-key auth, like the
     existing document API);
   - the app routes `/app/books…` (session auth, member scope);
   - the public route `/app/orgs/{org}/{project}/books/{book}`, gated by project visibility exactly like
     the public document routes (404, never 403).
   - `PUT` replaces a book's manifest (title, order, bindings), validates that every bound stem exists and
     is readable in that project, and writes under the lock.
6. **Search:** a hit gains `book`, `chapter_key` and `lang` when the document is a chapter variant. Loose
   documents carry nulls. The response stays additive.

## Out of scope

- Images (S4).
- The native format and parser (S3, S5).
- The migration tool and binding real documents (S6).
- The CLI and `/explain` (S7).
- Reader state (S8).
- Every web surface.
- Never pull or merge `origin/main`.

## Tests (very core only)

Add a small number of tests that pin the invariants:
- publish with `book`/`chapter`/`lang` places the variant, and the manifest and tables agree;
- reindex from an empty DB reproduces the book tables;
- a public book route on a private project is a 404;
- a loose publish with no new fields is byte-identical in behaviour to before (one regression test);
- `PUT` refuses a stem that doesn't exist or isn't in that project.

## Validation

- `uv run pytest` (the whole server suite) passes.
- `python3 scripts/skills_parity.py` FAILS as known (A3, fixed in S7). Record it, don't fix it.
- `python3 scripts/workflow.py validate`.
- `git diff --stat` shows no `web/` change.

## Notebook

- `phase.md`:
  - `## Doc impact` lines: `api.md` for the routes and fields, `data.md` for the manifests and tables,
    `backend.md` for the reindex walk, and a `decisions.md` ADR line for the book model.
  - `## Notes for later slices`: anything S3–S6 must know, such as the exact manifest shape and helper
    names.
  - `## Now`.
- `result.md`: verdict block first.

**Operator questions:** the operator is running this phase unattended ("skip the blockers, everything do
as your recommendation"). If the contract leaves a choice open, decide it by P29's recommendation or the
most conservative additive option. Record it on `## Operator Questions` as `decided: …`, and return
`done`, not `needs_operator`. Return `blocked` only for a real impediment you cannot work around.

## Dispatch

slice=P30.S2
phase=P30
kind=implementation
risk=high
attempt=1
route=high
reason=risk high (not low)
tier=high
subagent_type=slice-executor-high
model=opus
pass_model=yes
effort=high
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=high
