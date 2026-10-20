# P30.S6 result: library migration into books (the tool and the local proof)

- status: done
- tier: high
- model: opus
- effort: high
- summary: Built `scripts/migrate_books.py`, an idempotent, link-preserving binding tool that drives only `PUT /api/books`, plus its checked-in map `scripts/migrations/p30_books.json` (P29.S1's 4 books, 33 chapters and 8 loose documents; `origin/main` is still at `ed8dba0`, so nothing new to place). Proved it on a throwaway copy of the 42-document `origin/main` library: 4 books bound, all 167 URL checks identical before and after, 259 files byte-identical, and the second `--apply` a no-op. A Postgres-gated core test covers the same behaviour on a synthetic subset.
- files_changed: scripts/migrate_books.py, scripts/migrations/p30_books.json, tests/test_migrate_books.py, works/phases/active/P30/phase.md, works/phases/active/P30/topics/migration-runbook.md, works/phases/active/P30/topics/doc-impact-detail.md, works/phases/active/P30/topics/notes-server.md, works/phases/active/P30/slices/P30.S6/result.md
- validation:
  - `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55432/kb uv run pytest -q`: 197 passed (196 + the new test)
  - the full local `origin/main` proof: pass (summary below)
  - `python3 scripts/skills_parity.py`: exit 1, the known failure (A3, until S7)
  - `python3 scripts/workflow.py validate`: passed (only the existing warnings)
  - `git status`: no library copy in the repo; only the slice's files are new
- deviations: (1) The throwaway library root sits in the session scratchpad, outside the repo. The permission system refused `rm -rf` on it, so it was not deleted. It cannot land in the repo. Path: `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/e7ea5b44-3c7d-4e6d-8ebc-268a3e5a2b8a/scratchpad/libroot`. (2) The plan says idempotence comes from S2's no-op `PUT`. The tool goes further: it skips a book whose server state already equals the target, so a second run makes no call at all. (3) A mapped book that already exists is merged, not replaced, so a chapter `/explain` places before the run cannot be dropped (OQ21).
- doc_impact: `operations.md`: the migration runbook. `decisions.md`: an ADR line. Both lines are in `phase.md` → `## Doc impact`, and the full text is in `topics/doc-impact-detail.md` → *P30.S6*.

## What was built

- **`scripts/migrations/p30_books.json`** holds the binding as data: `books.<project>.<book> = {title, kind, chapters: [{key, position, variants: {lang: rel_path}, source?}]}`, which is exactly the `PUT` body. Each book and chapter has a one-line `reason`, which the tool strips before sending. The `loose` list has 8 entries, each with its reason. It was generated from the `origin/main` listing, and the generator asserts 34 bound + 8 loose = 42 and that every key is valid.
- **`scripts/migrate_books.py`** runs as `uv run python scripts/migrate_books.py`, using argparse and httpx like the other operator scripts.
  - **Dry run (the default):** the inventory, each book's action (`create` / `update` / `unchanged`) with its diff, every `PUT` body, any unmapped documents (they stay loose), any conflicts, and the pre-flight URL checks.
  - **`--apply`:** the `PUT`s, then checks that every book matches the plan, that no loose document is bound, and that every URL is unchanged. `--report` writes JSON.
  - **Credentials:** env only. `KB_API_TOKEN` is the bearer. `KB_SESSION_TOKEN`, or `KB_LOGIN_EMAIL` + `KB_LOGIN_PASSWORD` (the tool logs in and out itself), covers the `/app` checks. Without a session, `--apply` refuses unless `--skip-app-checks` is given.
  - **Exit codes:** 0 ok, 1 a write or verify failure, 2 refused before any write.
  - **Safety by construction:** the `Api` wrapper only issues GETs, `PUT /api/books/…` and login/logout. It never posts a document.
  - **The merge:** an existing book keeps its fields, chapters and order; only missing chapters and variants are added. A key bound to a different document, a document bound in another book, a loose document bound on the server, a mapped path missing on the server, or a chapter with no live variant is a conflict, and the whole run is refused before any write.
  - **The link snapshot covers every document on the server, not only the mapped ones:**
    - `GET /api/documents/{id}` (bearer);
    - `GET /app/documents/{id}` (session; the backend of `/documents/{id}`, including `canonical_path`);
    - `GET /app/orgs/{org}/{project}/{slug}` from that canonical path (the backend of `/@{org}/…`, including the id it resolves to);
    - `GET /app/documents/{id}/raw` for html.

    The content hash is sha256 over the document's own fields (id, rel_path, project, slug, date, title, version, format, markdown, source), never the additive book fields. Every check must answer 200 before (the pre-flight) and be identical after.
- **`tests/test_migrate_books.py`** is the core test, Postgres-gated. A synthetic library spans two projects and mixes html and md, with a KO/EN pair, a loose note, and a chapter `/explain` placed in a mapped book before the run. It asserts:
  - the dry run writes nothing;
  - the apply makes two `PUT`s, and all 19 checks resolve and stay identical;
  - every file is byte-identical, and git shows only `docs/.books/` in the new commits;
  - the only calls are GETs and `PUT /api/books`;
  - the merged book keeps the pre-placed `p3` chapter;
  - the second run makes no `PUT` and no commit;
  - a map that would rebind a bound document is refused with no write.

## Reconciliation

`git fetch origin`: `origin/main` is still `ed8dba0` (2026-10-16), the commit P29.S1 mapped. The 42 documents listed under `docs/<project>/<date>-<slug>.{html,md}` are identical to P29.S1's list (`diff` empty). Nothing was published since, so no new placement was needed. The map is P29.S1's, unchanged. The open choices are decided on `## Operator Questions` as OQ20 (titles, the joint explain's `source`, P29's "unclean" items kept as drawn) and OQ21 (merge, never replace).

## The full local `origin/main` proof (run once by hand)

Setup:
- `git archive origin/main docs | tar -x` into a scratchpad root (never the working tree), `git init` + commit there.
- `uvicorn server.main:app` on `:8799` in tenant mode, against the disposable PG `:55432`, with `KB_ROOT` pointing at that root and a throwaway master token.
- Sign up the operator, set an org slug, then `POST /api/reindex`.
- The tool ran as a CLI through real HTTP, with `KB_LOGIN_EMAIL`/`KB_LOGIN_PASSWORD`, so the login path was exercised too.

```
reindex: indexed 42 (11 project index.md skipped as non-documents), removed 0
dry run  : exit 0 — documents 42, books 0 -> 4 [create] (changple5/curriculum 20, glide-ilab/phases 4,
           knowledge/maintainer-guide 5, vocky/maintainer-guide 4); loose 8; unmapped 0; conflicts 0;
           pre-flight 167 URL checks, 0 not resolving; 4 PUT(s) would be made; nothing written
apply 1  : exit 0 — 4 PUTs, each 200 created=True committed=True; verify 167 checks after, 0 failures
apply 2  : exit 0 — all 4 [unchanged], 0 PUTs; verify 167 checks after, 0 failures
files    : 259 hashed before, 259 after, identical (everything under docs/ except .books/)
git      : apply 1 = 4 commits touching only docs/.books/{changple5/curriculum,glide-ilab/phases,
           knowledge/maintainer-guide,vocky/maintainer-guide}.json; apply 2 = 0 commits; docs/ clean
```

167 checks = 42 bearer reads + 42 `/documents/{id}` + 42 pretty URLs (every document has a canonical path) + 41 html raw reads. The server was stopped afterwards (`/healthz` no longer answers). The disposable PG keeps one throwaway `proof-…@example.com` user and its tenant, test data like the suite's.

## Notes

- The runbook for the orchestrator's production run is `topics/migration-runbook.md`: reconcile again, credentials, dry run with the expected numbers, apply, verify (the idempotence re-run, the kb-api commits to integrate, `curl` spot checks), and the undo.
- One `## Doc impact` line is 131 characters, over the plan's 120. The section is append-only, so it stays.
- The tool sends `User-Agent: kb-migrate-books/1`. The production edge is known to 403 Python `urllib`. This could not be checked without touching production, so the runbook says to report a 403, not to spoof a browser.
- Consumed: the S6 items in `topics/notes-server.md` (the stem facts are kept for later slices) and the S6 tags in `## Notes for later slices`.
