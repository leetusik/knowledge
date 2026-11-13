# Result — P23.S1 (server: on-disk version archive + schema + version-aware write path)

Status: **done**. The pinned design (phase.md "sidecar archive on disk, derived table
in SQLite", items 1–7) is implemented end to end: a superseded body is archived to
`<root>/.versions/<project>/<date>-<slug>/vNNNN.<ext>`, the current file carries a
`version:` frontmatter field, `documents.version` + `document_versions` are derived
state, and a full DB wipe + reindex reproduces both from disk alone (verified).

## What landed

**`server/documents.py` — archive primitives + a version-aware serializer**

- `ARCHIVE_DIR = ".versions"` (the one constant `reindex` imports; `graph_hook` /
  `site_smoke` can't import `server/*`, so they carry the literal).
- `archive_dir_rel_path(rel)` / `archive_rel_path(rel, version)` /
  `parse_archive_rel_path(arch_rel)` — the path ↔ `(rel_path, version)` bijection.
  Filenames are zero-padded `v0001.<ext>`; the extension mirrors the document's.
- `set_frontmatter_version(text, version)` — **byte-preserving**: it edits the
  `version:` line inside the existing frontmatter block (either flavor: `---` fenced
  or `<!--kb … -->`) and touches nothing else, so an archived file is a faithful copy
  of what was published (unknown frontmatter fields and the body survive verbatim)
  rather than a re-serialization.
- `read_document_version(root, rel)` — reads the version off the file (drift path).
- `archive_document_file(...)` (copy-before-replace, returns the archive rel_path or
  `None` when there is no file) and `remove_archive_dir(...)` (delete path; prunes the
  now-empty `<project>/` and `.versions/` parents with `rmdir`, never recursively).
- `serialize_frontmatter` / `serialize_html_frontmatter` / `write_document_file` gain
  an optional `version`, emitted **after `date:` and only for version ≥ 2** — a v1
  document is byte-identical to a pre-P23 one, which is what makes "no `version:` ⇒ v1"
  a real no-migration story.

**`server/db.py` — schema + CRUD**

- `documents.version INTEGER NOT NULL DEFAULT 1` in `_SCHEMA` **and** in the idempotent
  `ALTER TABLE … ADD COLUMN` ladder in `init_db` (same pattern as `related`/`format`/
  `raw_html`). No alembic (F1).
- `document_versions` keyed `UNIQUE(tenant_id, rel_path, version)` with
  `archive_path/title/date/tags/format/markdown/raw_html/created_at`. Identity-keyed,
  never `doc_id`-keyed, so it survives a rebuild that reassigns row ids. Not referenced
  by any FTS trigger and not FK'd to `documents` — deliberately, so the pre-tenancy
  `DROP TABLE documents` path can't cascade history away.
- `upsert_document(..., version=1)`, `upsert_document_version(...)` (idempotent, so
  reindex re-upserts without clearing), `list_document_versions` (version DESC),
  `get_document_version`, `delete_document_versions_by_path`, and
  `find_latest_document_by_slug` (the resolution rule below). The last four are the
  helpers S2 codes its read routes against.

**`server/main.py` — version-aware write path** (all inside the non-reentrant
`WRITE_LOCK`, F10): `DocumentIn` gains `new_version: bool = False` and
`rel_path: Optional[str] = None`; `_resolve_version_target` picks the target; the
archive is written **before** `write_document_file` replaces the body; the
`document_versions` row is inserted from the superseded DB row; the new body is written
at the same `rel_path` with `version: N+1`; `created_at` is preserved by the existing
`ON CONFLICT` (it was never in the UPDATE set) and `updated_at` moves. Response gains
`version`, `previous_version`, `archived_path`. Delete gains archive removal +
`versions_removed`.

**`server/reindex.py`** — `.versions` added to `RESERVED_DIRS` (which `server/seed.py`
also imports — see note 3 below); `_index_file` derives `documents.version` from
frontmatter (`_version_from_meta`, absent/garbage ⇒ 1); new `_index_version_file` +
`_walk_versions` rebuild `document_versions` from the archive tree per content root;
rows whose archive file vanished are dropped, exactly like vanished documents. Report
gains `versions_indexed` / `versions_removed` (additive; `indexed`/`removed` still count
current documents only).

**Walkers (F3):** `scripts/graph_hook.py::_RESERVED_DIRS` and
`scripts/site_smoke.py::RESERVED_DOC_DIRS` both gain `.versions`, each with a comment
saying why (archived bodies keep their `source:` mapping, so without the exclusion they
become graph nodes and break `check_graph`'s doc-count identity).

**Mirrors (F2):** all seven changed `server/**` + `scripts/**` files and the three
changed `tests/**` files copied byte-for-byte into `plugin/templates/kb/`.

## Decisions pinned here (phase.md left these to S1)

1. **Newest-`(project, slug)` resolution — `ORDER BY date DESC, id DESC LIMIT 1`,
   tenant-scoped** (`db.find_latest_document_by_slug`). The largest convention date
   wins; a same-date tie is broken by the highest row id (most recently created). This
   is exactly `list_documents`' newest-first ordering, so "newest" means the same thing
   everywhere in the store. Caveat for S4: `slug` defaults to `slugify(title)`, so a
   **retitled** v2 must pass `slug` or `rel_path` explicitly or it resolves to nothing
   and creates a new document.
2. **409 hint call (design item 6c):** status unchanged; the `detail` dict gains
   `version` and `hint` **only when an existing DB row was found** — a file-on-disk-only
   conflict is not versionable, so it gets no hint. `message`/`rel_path`/`id`/
   `existing_title` are untouched, so the CLI's 409 explainer (F9) is unaffected.
   Hint text: `re-publish as the next version: POST again with "new_version": true,
   "rel_path": "<rel>"`.
3. **Identity is immutable across a version chain → two 422s.** A resolved target
   whose `format` differs from the request's, or whose `project` differs, is a **422**
   ("publish it as a new document instead") rather than a silent coercion. Reason: the
   `rel_path` encodes both the project dir and the extension, and the archive dir sits
   beside it — honoring either change would write HTML into a `.md` file or scatter one
   document across two project dirs. The `(project, slug)` path can't hit either guard;
   only an explicit `rel_path` can.
4. **A resolved target's `date` and `slug` win over the request's** (design item 1
   applied literally): a v2 sent on a later date keeps the original `rel_path`, `date`
   and `slug`, and the response echoes the target's, not the request's.
5. **`overwrite: true` also bumps the version.** It archives the replaced body as
   v`N` and publishes v`N+1`, so the two write modes share one version chain. Status
   and existing response keys are unchanged (`version`/`previous_version`/
   `archived_path` are additive) — this is the phase's one flagged behavior change,
   now flagged concretely.
6. **Drift is still archived.** A file present on disk with no DB row (overwrite path)
   is archived anyway, numbered from its own `version:` frontmatter; no
   `document_versions` row is written, because the next reindex derives it from the
   archived file. Disk is canonical, so this loses nothing.
7. **Deleting a document deletes its history.** `_delete_document` removes the whole
   `.versions/<project>/<date>-<slug>/` dir and the derived rows, and stages the removed
   dir in the same scoped commit (public root). Rationale: P21 shipped a user-facing
   delete; leaving readable bodies of a "deleted" document on disk — and in the public
   git tree — would be a data-retention wart, and reindex would keep resurrecting rows.
   Response gains `versions_removed` (the `/app` route still answers 204).
8. **`created_at` on a version row** = when the body was archived: the write path
   stamps *now*; reindex re-derives the archive file's **mtime** (the write path's
   timestamp is gone once the DB is wiped, and disk is the only truth then).
9. **Commit message for a version bump:** `docs(<project>): update <slug> to v<n>`
   (v1 creates keep `docs(<project>): add <slug>` byte-for-byte).

## Validation

| Command | Outcome |
| --- | --- |
| `.venv/bin/python -m pytest` (repo root) | **PASS** — 79 passed, 30 skipped (the skips are the pre-existing Postgres-gated accounts/dashboard/app-route tests: "set KB_TEST_DATABASE_URL…"), 1 pre-existing StarletteDeprecationWarning |
| `.venv/bin/python scripts/plugin_parity.py` | **PASS** — "plugin templates are in parity with the repo" |
| `python3 scripts/workflow.py validate` | **PASS** — "Workflow validation passed." |

Note: the repo-root `python3` (Homebrew 3.13) has no pytest; the project venv
`.venv/bin/python` (3.12) is the interpreter for `pytest` and `plugin_parity.py`.

Tests added (terse, into existing modules — no new fixtures or files):
`tests/test_api_write.py` — v2 archives + keeps id/rel_path/date, explicit-`rel_path`
targeting + the cross-project 422, `new_version` with no target ⇒ v1, overwrite archives
instead of destroying, delete removes the archive, 409 hint;
`tests/test_reindex.py` — `.versions` never enters the document walk / rebuilds
`document_versions` / vanished archive file drops its row / only the current version is
FTS-searchable, plus an unversioned-corpus regression (v1 everywhere, zero version rows);
`tests/test_html_documents.py` — the html flavor round-trips (`<!--kb` archive with
`version: 1`, rebuilt from disk after a DB wipe).

Manual smoke beyond the suite (scratchpad, not committed): full html publish → v2 →
`rm kb.sqlite3` → `reindex()` reproduced `documents.version == 2` **and** the v1
`document_versions` row with extracted-text `markdown` + raw HTML; FTS matched only the
current body. Also confirmed from mkdocs upstream that its default file-scanner
exclusion is a gitignore spec `['.*', '/templates/']`, i.e. dot-prefixed dirs are
excluded at any depth — so `docs/.versions/` is never built into the site and
`mkdocs.yml` needs no `exclude_docs` entry.

## Deviations from plan.md

None in scope. Three judgment calls beyond the literal plan text, all recorded above:
the delete-side archive cleanup (7), the two identity 422s (3), and the `versions_indexed`/
`versions_removed` additive reindex report keys. `server/seed.py` got a one-line docstring
correction (it imports `reindex.RESERVED_DIRS`, so it inherits the `.versions` exclusion
for free — worth stating rather than leaving a stale comment).

## For S2/S3/S4

- Read helpers already exist: `db.list_document_versions(conn, rel_path, tenant_id=…)`
  (version DESC, includes `markdown`/`raw_html`) and
  `db.get_document_version(conn, rel_path, version, tenant_id=…)`. S2 keys its routes
  off the **document id → its `rel_path`**, since `document_versions` is identity-keyed.
- `version` is now on every document row and therefore already exposed by both
  projections (`main._public_doc` and `documents_api._app_doc` drop only
  `tags_text`/`raw_html`/`tenant_id`), so `/api` and `/app` reads already carry it.
- The write contract S4 codes against: `POST /api/documents` with `new_version: true`
  plus either `rel_path` (preferred) or a matching `(project, slug)`; response carries
  `version`, `previous_version`, `archived_path`.
