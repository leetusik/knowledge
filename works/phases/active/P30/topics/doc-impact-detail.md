# P30 Doc impact detail (linked from `phase.md` → `## Doc impact`)

Each `## Doc impact` line there is one short line; its full text is here, under the slice that wrote it.

## P30.S6

- **operations.md:** a new runbook entry, "Binding the library into books": `scripts/migrate_books.py`
  (dry run by default, `--apply`, `--report`), credentials from `KB_API_BASE_URL`, `KB_API_TOKEN` and
  `KB_SESSION_TOKEN` or `KB_LOGIN_EMAIL`/`KB_LOGIN_PASSWORD`, exit codes 0/1/2, the map at
  `scripts/migrations/p30_books.json`, and the undo (revert the `docs(<project>): update book …`
  commits, reindex). The steps are `topics/migration-runbook.md`.
- **decisions.md:** ADR: the library is bound into books by `PUT /api/books` only, never by re-publishing,
  so no document file or URL changes. A book that already exists is merged, never replaced (server
  fields, chapters and order win, and a disagreement refuses the run). Every `/documents/{id}`,
  `/@{org}/{project}/{slug}` and html raw read is hashed before and after, and the run is idempotent
  (an unchanged book gets no `PUT`).
