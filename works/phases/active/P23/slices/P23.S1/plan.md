# Plan — P23.S1 (server: on-disk version archive + schema + version-aware write path)

## Read first

`../../phase.md` — the pinned design decision (sidecar archive on disk, derived SQLite
table) and findings F1–F10 are the contract for this slice. This plan does not repeat
them; it scopes the slice. Implement the design as pinned; where phase.md leaves a
detail open ("S1's call", "S1 pins the exact rule"), decide it and record the decision
in `result.md` + a note in `phase.md`.

## Scope — what S1 builds

1. **Archive primitives** (`server/documents.py`): compute the archive path
   `<root>/.versions/<project>/<date>-<slug>/vNNNN.<ext>` for a superseded body; write
   the archived file with the same frontmatter flavor it had (md `---` fence / html
   `<!--kb … -->` comment), adding/refreshing the `version:` field so each file is
   self-describing.
2. **Schema** (`server/db.py`): `documents.version INTEGER NOT NULL DEFAULT 1` via the
   existing idempotent ALTER ladder in `init_db`; new `document_versions` table keyed
   `UNIQUE(tenant_id, rel_path, version)` with `archive_path`, `title`, `date`, `tags`,
   `format`, `markdown`, `raw_html`, `created_at` (per pinned design item 4). Safe on an
   existing DB. Plus the CRUD helpers S2 will need (insert version row, list by
   rel_path, fetch one) — keep them minimal.
3. **Write path** (`server/main.py`, inside `WRITE_LOCK`, non-reentrant — F10):
   - `POST /api/documents` gains additive `new_version: bool = False` and
     `rel_path: Optional[str] = None` per pinned design item 6: resolve target
     (explicit rel_path → else newest `(project, slug)` match for the tenant — pin the
     exact "newest" rule and record it), archive current file + insert
     `document_versions` row, write new body at the SAME rel_path with `version: N+1`,
     preserve `created_at`/original `date`/`slug`, refresh `updated_at`; response gains
     `version` (+ previous). No target ⇒ plain v1 create, not an error.
   - `overwrite: true` keeps its status/response shape but archives first (the phase's
     one flagged behavior change).
   - 409 detail hint: your call (F/design item 6c).
   - Git (public root only): stage the new archive file in the same scoped commit (item 7).
4. **Reindex** (`server/reindex.py`): exclude `.versions` via `RESERVED_DIRS` +
   `reindex_path`'s reserved-top-dir validation; rebuild `document_versions` from the
   `.versions` tree (drop rows whose archive file vanished); derive `documents.version`
   from the current file's `version:` frontmatter (absent ⇒ 1). Only current versions
   are FTS-indexed/embedded/graphed (design item 5).
5. **Walker exclusions** (F3): `scripts/graph_hook.py::_RESERVED_DIRS` and
   `scripts/site_smoke.py::RESERVED_DOC_DIRS` gain the archive dir.
6. **Mirrors** (F2): every `server/**`, `tests/**`, and the two `scripts/` files changed
   here are byte-mirrored into `plugin/templates/kb/` in this slice.
7. **Tests** — terse, added to existing modules (`tests/test_api_write.py`,
   `tests/test_reindex.py`): a v2 publish archives + bumps version + keeps rel_path/id;
   overwrite archives instead of destroying; reindex rebuilds `document_versions` and
   skips `.versions` in the walk; unversioned corpus behaves exactly as today.

## Out of scope

Read routes (S2), web (S3), skill (S4), CLI changes (F9 — none), any alembic (F1 — none).

## Validation

- `python3 -m pytest` (repo root)
- `python3 scripts/plugin_parity.py`
- `python3 scripts/workflow.py validate`

## Wrap-up

Write `result.md` (decisions pinned here included), append cross-slice notes +
a concrete one-line Doc impact note to `phase.md`.
