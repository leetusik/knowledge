# Result — P23.DECOMP

Decomposed P23 ("Document version control") into four sequential middle slices and pinned
the versioning storage design in `phase.md`. No source code was touched.

## What I researched

`server/main.py` (write/delete paths, `WRITE_LOCK`, the 409/overwrite branch), `server/db.py`
(`_SCHEMA`, `init_db`'s idempotent ALTER ladder, upsert-by-`(tenant_id, rel_path)`),
`server/documents.py` (rel_path, frontmatter serializers/parsers for both md and html,
Recent-index helpers), `server/reindex.py` (the disk→DB rebuild and its reserved-dir walk),
`server/documents_api.py` (the unmetered `/app` plane + `_resolve_readable_doc` public gate),
`scripts/graph_hook.py`, `scripts/site_smoke.py`, `scripts/plugin_parity.py`,
`scripts/skills_parity.py`, `plugin/templates/manifest.json`, the web document surfaces
under `web/src/`, `cli/src/knowledge_cli/`, and all four copies of the explain skill.

## The design decision (full text in `phase.md` → Findings)

**Sidecar archive on disk + a derived, disposable SQLite table.** The decisive constraint is
that the content DB is rebuilt from disk by `reindex` (and can be dropped outright by
`init_db`), so version history kept only in SQLite would be silently wiped. Git is not a
fallback either — non-#1 tenants' trees are gitignored.

So: the current version stays at its canonical `rel_path` (identity, doc `id`, URLs, graph
edges unchanged — a version bump preserves the original `date`/`slug`); superseded bodies are
archived to `<content-root>/.versions/<project>/<date>-<slug>/v0001.<ext>` with the same
frontmatter flavor they had, so each version is self-describing; `documents.version` (default
1, idempotent ALTER) and a new `document_versions` table keyed
`UNIQUE(tenant_id, rel_path, version)` are rebuilt from that tree by `reindex`. Only the
current version is indexed/embedded/graphed. `POST /api/documents` gains `new_version` and an
explicit `rel_path` target; `overwrite: true` keeps its response shape but now archives
instead of destroying. Existing documents are implicitly v1 — no migration.

## Slices created (bare folders; no `plan.md` pre-filled)

| ID | Name | Kind | Risk | Order | Depends on |
| --- | --- | --- | --- | --- | --- |
| `P23.S1` | server: on-disk version archive + schema + version-aware write path | implementation | high | 1 | — |
| `P23.S2` | server: version history read API (`/api` + `/app` planes) | implementation | high | 2 | P23.S1 |
| `P23.S3` | web: document version history + past-version view | implementation | high | 3 | P23.S2 |
| `P23.S4` | `/explain` skill: read prior version + publish v2 across all skill copies | implementation | high | 4 | P23.S2 |

All four are `risk: high` because each writes real code (or substantive prose) across more
than one file — the contract routes every cross-file change to `slice-executor-high`, so no
slice here qualifies for the `low`/mid tier. `DECOMP` is order 0 and `REVIEW` is order 9999,
so orders 1-4 sequence cleanly between them.

Why four rather than the plan's suggested three: the server work splits naturally at the
storage/read boundary. S1 alone already touches `documents.py`, `db.py`, `reindex.py`,
`main.py`, two `scripts/` walkers, their `plugin/templates/kb/` mirrors and three test
modules; folding S2's read routes (both planes, plus a sandboxed raw route) into it would
make one unreviewable slice. S3 and S4 have no file overlap with each other or with the
Python planes.

## Key findings recorded in `phase.md`

- **No alembic for this plane** — the four migrations are the Postgres accounts plane; the
  documents store is schema-in-code SQLite. (Corrects an assumption in this slice's `plan.md`.)
- **`plugin/templates/kb/` is a CI-gated byte-parity mirror** (`shipped_dirs: server, tests,
  …` + a completeness check), so every `server/**` and `tests/**` change must be mirrored in
  the same slice; `scripts/graph_hook.py` and `scripts/site_smoke.py` are mirrored too.
- **`pathlib.rglob` descends into dot-dirs** (verified empirically), so `.versions` must be
  excluded in `reindex.RESERVED_DIRS`, `graph_hook._RESERVED_DIRS` and
  `site_smoke.RESERVED_DOC_DIRS` — missing the graph_hook one breaks the deploy gate, whose
  doc-node-count identity would then mismatch.
- **The explain skill has four copies, not the three the intent names** — the extra one is
  `web/public/SKILL.md`, held to a *full-file* byte match by `scripts/skills_parity.py` in CI.
  The installed `~/.claude/skills/explain/SKILL.md` is outside the repo and currently drifted.
- **`/explain` cannot currently find "the same document"**: it derives rel_path from today's
  date, so a later v2 computes a different path. The skill must resolve the existing doc
  first — this is the crux of S4.
- Plus: the `/app` plane must stay unmetered, version reads must reuse
  `_resolve_readable_doc` and the pinned sandbox headers, `WRITE_LOCK` is non-reentrant, and
  the CLI keeps working untouched (`--new-version` deferred).

`phase.md` also carries the expected doc-impact areas for the review, the per-slice
validation commands, and two open questions (rollback/diff/pruning; a CLI flag).

## Validation

| Command | Outcome |
| --- | --- |
| `python3 scripts/workflow.py validate` | PASS — "Workflow validation passed." |
| `python3 scripts/workflow.py next` | PASS — `next_slice=P23.S1` |
| `ls -a` on each new slice folder | PASS — only `slice.json`, no `plan.md` |
| `python3 scripts/skills_parity.py` (baseline check) | PASS — recorded as the green baseline S4 must preserve |

## Deviations from `plan.md`

1. **Four middle slices instead of the suggested three** — the server work split at the
   write/read boundary (rationale above and in `phase.md`).
2. **No alembic migration** — the plan suggested schema changes go through `alembic/versions/`;
   research showed alembic governs only the Postgres accounts plane. Recorded as finding F1.
3. The plan listed three explain-skill copies (from `intent.md`); there are four
   (`web/public/SKILL.md` is CI-gated). Recorded as finding F7 — S4's scope is wider than the
   intent's wording, without changing what the operator asked for.

## Doc impact

None versioned here (decomposition slice). `phase.md` now carries a **Doc impact** section
seeded with the areas the review is expected to consolidate (`data.md`, `api.md`,
`backend.md`, `frontend.md`/`experience.md`, `architecture.md`/`decisions.md`, `product.md`);
each implementation slice must still append its own concrete one-liner.
