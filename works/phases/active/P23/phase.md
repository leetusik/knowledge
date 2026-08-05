# Phase P23: Document version control

_Intent: see [intent.md](intent.md)._

## Objective

Add version control to knowledge documents: agents can fetch previous versions and publish v2/v3 of an existing document instead of a new post; server schema/API, web display of version history, and the /explain skill updated across canonical copy, mirrors, and installed copy — all in this repo.

## Context

Today a knowledge document's identity is `UNIQUE(tenant_id, rel_path)` where
`rel_path = <project>/<YYYY-MM-DD>-<slug>.{md,html}`. Re-publishing is either a **409**
(`server/main.py:463-471`) or a **destructive** `overwrite: true` that replaces the file
and the DB row. Prior content is recoverable only from git, and only for tenant #1
(non-#1 tenants write the gitignored `tenants/<uuid>/` tree). This phase makes
re-publishing **additive**: v2/v3 of the *same* document, with the previous bodies kept
and readable by agents and the web UI.

## Decomposition

Four middle slices, strictly sequential. All `risk: high` — every one of them writes real
code (or substantive prose) across more than one file, which the contract routes to
`slice-executor-high` regardless of size.

| Slice | Name | Order | Depends on | Why it is its own slice |
| --- | --- | --- | --- | --- |
| `P23.S1` | server: on-disk version archive + schema + version-aware write path | 1 | — | The load-bearing storage decision. Touches `server/documents.py` (archive path + `version:` frontmatter), `server/db.py` (`documents.version` + `document_versions`), `server/reindex.py` (walk exclusion + archive rebuild), `server/main.py` (write path), `scripts/graph_hook.py` + `scripts/site_smoke.py` (reserved-dir constants), their `plugin/templates/kb/` mirrors, and tests. Everything downstream reads what this slice defines. |
| `P23.S2` | server: version history read API (`/api` + `/app` planes) | 2 | S1 | Additive read routes on both planes (list versions, fetch one version, raw HTML for an html version). Small and mechanical *given* S1's storage, but it is the contract both S3 and S4 code against, so it lands before either. |
| `P23.S3` | web: document version history + past-version view | 3 | S2 | Frontend only (`web/src/lib/knowledge/*`, `web/src/content/documents.ts`, the `(public)/documents/[id]` tree, a BFF raw relay twin). No overlap with the Python planes; follows P21's established web patterns. |
| `P23.S4` | `/explain` skill: read prior version + publish v2 across all skill copies | 4 | S2 | Prose-only, but across **four** copies with a CI parity gate (see finding F7). Isolated from code so a skill-copy drift failure never blocks server/web work. |

Why S1 and S2 are split rather than one "server" slice: combined they would touch
`db.py`, `documents.py`, `reindex.py`, `main.py`, `documents_api.py`, two `scripts/`
files, six template mirrors and three test modules in a single slice — too large to
review as one unit, and the write path is where all the risk lives.

**Not in this phase** (deliberate, record as deferred if wanted): version *diffing*, a
rollback/restore endpoint, version deletion/pruning, and CLI (`cli/`) surfacing of
versions. The CLI keeps working unchanged because `overwrite` keeps its response shape.

## Findings & Notes

### Pinned design decision (DECOMP) — sidecar archive on disk, derived table in SQLite

**The content DB is disposable.** `server/reindex.py` rebuilds every `documents` row from
the canonical files on disk (`docs/` for tenant #1/legacy, `tenants/<uuid>/` otherwise),
and `server/db.py::init_db` will even *drop and recreate* the content tables on a
pre-tenancy DB. Therefore **version history must live on disk** — a DB-only
`document_versions` table would be silently wiped by the next boot reindex. Git is not a
substitute: non-#1 tenants' trees are gitignored and never committed.

The design the middle slices implement:

1. **The current version stays exactly where it is.** `<root>/<project>/<date>-<slug>.<ext>`
   keeps its `rel_path`, so document identity, the numeric `id`, `/documents/{id}` URLs,
   graph edges and `related` links are all stable across a version bump. A v2 publish
   **never** changes `rel_path` — it therefore preserves the *original* `date` and `slug`
   (a request `date` targeting an existing document is ignored, not honored; `updated_at`
   is what moves).
2. **Superseded bodies are archived to a reserved top-level dir in the same content root:**
   `<root>/.versions/<project>/<date>-<slug>/v0001.<ext>`, `v0002.<ext>`, …  Each archived
   file carries the **same frontmatter flavor as the doc it came from** (`---` fenced for
   md, `<!--kb … -->` comment for html), so every version is self-describing and
   `reindex` can re-derive its metadata from the file alone. Only *superseded* versions are
   archived; the newest one is always the canonical file.
   * Top-level (not `<project>/.versions/`) on purpose: `reindex._walk_root`, `graph_hook`
     and `site_smoke` all already reason about **reserved top-level dirs**, so exclusion is
     a one-constant change in each instead of a filter inside every rglob.
   * Dot-prefixed on purpose: `docs/versions/` is already taken by the agentic durable docs
     in this repo, and MkDocs excludes dot-prefixed paths from the built site.
3. **`documents.version INTEGER NOT NULL DEFAULT 1`**, back-filled with the existing
   idempotent `ALTER TABLE … ADD COLUMN` ladder in `init_db` (the same pattern as
   `related` / `format` / `raw_html`). Re-derived from a `version:` frontmatter field on the
   current file; a file without one is v1. **Existing documents are implicitly v1 — no
   migration, no backfill job.**
4. **`document_versions`** — a new disposable SQLite table keyed by
   `UNIQUE(tenant_id, rel_path, version)` (identity-keyed, not `doc_id`-keyed, so it
   survives a full rebuild): `archive_path`, `title`, `date`, `tags`, `format`, `markdown`,
   `raw_html`, `created_at`. Rebuilt by `reindex` from the `.versions` tree; rows whose
   archive file vanished are dropped, exactly like the vanished-document cleanup.
5. **Only the current version is searchable.** Archived versions are never inserted into
   `documents_fts`, never embedded, and never become graph nodes. Search/graph/`/documents`
   listings are byte-identical to today for an unversioned corpus.
6. **Write path (`POST /api/documents`)** gains two additive fields:
   `new_version: bool = False` and `rel_path: Optional[str] = None`.
   * `new_version: true` → resolve the target (explicit `rel_path` when given, else the
     newest document matching `(project, slug)` for this tenant), archive the current file +
     row as `v<current>`, write the new body at the same `rel_path` with `version: N+1`,
     preserve `created_at`, refresh `updated_at`. Response gains `version` (and the
     previous one). No target found ⇒ a normal create at v1 (no 404 dance for the agent).
   * `overwrite: true` **keeps its status/response shape** but now archives the replaced
     body first, so the legacy destructive path stops losing data. This is the one
     behavior change to an existing contract in the phase — flagged here for the review.
   * The 409 path is unchanged in status; its `detail` may gain a hint that the target is
     versionable (S1's call).
   * Recent-index bullet: `update_recent_index` already suppresses a duplicate when the
     `rel_path` is present in `docs/index.md`, so a version bump adds no second bullet.
7. **Git (public root only):** the version write stages the new archive file alongside
   `docs/<rel>` and `docs/index.md` in the same scoped commit, so tenant #1's history
   travels with the repo.

### Durable findings

- **F1 — the content plane has no alembic.** `alembic/versions/0001…0004` cover only the
  **Postgres accounts/control plane** (tenants, usage, org credentials, project
  visibility). The documents store is SQLite, schema-in-code in `server/db.py::_SCHEMA`
  plus the idempotent `ALTER` ladder in `init_db`. **P23 adds no alembic migration.**
  (The `P23.DECOMP` plan's suggestion to route schema changes through alembic is wrong for
  this plane.)
- **F2 — `plugin/templates/kb/` is a byte-parity mirror of the live repo, CI-gated.**
  `plugin/templates/manifest.json` declares `shipped_dirs: [server, tests, docs/assets,
  docs/stylesheets, docs/javascripts]` and `scripts/plugin_parity.py` (run by
  `.github/workflows/plugin-ci.yml`) byte-compares every listed file **and** fails on any
  file present on one side and missing on the other. So: **every `server/*.py` and
  `tests/*.py` edit or addition in this phase must be mirrored into
  `plugin/templates/kb/`** in the same slice. `plugin/templates/kb/scripts/` ships
  `graph_hook.py` + `site_smoke.py` (parameterized copies) — those two are mirrored too.
  Validate with `python3 scripts/plugin_parity.py`.
- **F3 — hidden dirs are NOT skipped by `pathlib`.** `Path.rglob("*.md")` matches inside
  `.versions/`. Three walkers must exclude the archive dir explicitly:
  `server/reindex.py::RESERVED_DIRS` (currently `{"current", "versions"}`, applied to
  top-level dirs in `_walk_root`), `scripts/graph_hook.py::_RESERVED_DIRS` and
  `scripts/site_smoke.py::RESERVED_DOC_DIRS` (both currently
  `{"current","versions","stylesheets","assets","javascripts"}`). **Missing the graph_hook
  one breaks the deploy gate**: `site_smoke.check_graph` asserts the graph's doc-node count
  equals the depth-2 filesystem `*.md` count, and archived versions carry a `source:`
  mapping, so they *would* become graph nodes. Also add the dir to
  `reindex.reindex_path`'s reserved-top-dir validation.
- **F4 — the `/app` plane must never meter.** `server/documents_api.py` handlers
  deliberately never set `request.state.usage`; the web version-history routes must keep
  that (browsing versions is free). The `/api` version reads may stay unmetered too — no
  new usage event types are introduced by this phase.
- **F5 — public/anonymous access gate.** Any `/app` version route must reuse
  `documents_api._resolve_readable_doc` (member fast-path → public-project fallback, every
  miss a 404, never a 403). An html version's raw route must repeat the pinned sandbox
  headers of `GET /app/documents/{id}/raw` (`Content-Security-Policy: sandbox
  allow-scripts; frame-ancestors 'self'`, `X-Frame-Options: SAMEORIGIN`, `nosniff`,
  `no-store`).
- **F6 — web patterns to follow (S3).** Copy lives in `web/src/content/documents.ts`
  (content-object convention — no inline strings); the knowledge client wrappers in
  `web/src/lib/knowledge/app.ts` over `web/src/lib/knowledge/client.ts`; types in
  `web/src/lib/knowledge/types.ts` (`KbDocument extends KbDocumentListItem`); the doc page
  is `web/src/app/(public)/documents/[id]/page.tsx` with the member/anonymous branch and
  the shared server component `document-view.tsx`; the html body is relayed through the BFF
  route `web/src/app/api/documents/[id]/raw/route.ts` (a version-aware twin is needed for
  archived html versions). P21's `phase.md` (lines ~104-125) is the reference for the
  action/island conventions. This is **not** a design-bearing slice — reuse the existing
  metadata-strip / `kb-panel` vocabulary; no new visual language.
- **F7 — the explain skill has FOUR copies, not three.** The confirmed intent names three;
  the repo actually carries: `plugin/skills/explain/SKILL.md` (canonical),
  `.agents/skills/explain/SKILL.md` (portable mirror — **body**-identical, differing only in
  the `argument-hint`/`allowed-tools` frontmatter lines), **`web/public/SKILL.md` (the
  landing-served copy — held to a FULL byte-for-byte match, CI-gated)**, and the installed
  copy `~/.claude/skills/explain/SKILL.md` (outside the repo, currently drifted behind
  canonical by two edits). `scripts/skills_parity.py` gates the first three and is green
  today; S4 must keep it green. The installed copy is a filesystem write outside the repo —
  if the executor cannot write it, report the exact `cp` for the operator rather than
  leaving parity half-applied.
- **F8 — how the agent finds "the same document".** `/explain` derives `rel_path` from
  `project/<today>-<slug>`, so a v2 written on a later date computes a *different*
  `rel_path` and would silently become a new post — this is exactly the bug the phase
  fixes. The skill must resolve the existing doc first (`GET /api/documents?project=<p>`
  and match on `slug`, or `GET /api/documents/by-path/<rel_path>`), read its body
  (`markdown` is returned on a single-doc fetch) plus, if wanted, an older version via the
  S2 routes, and then POST `new_version: true` with the resolved `rel_path`. Server-side
  `(project, slug)` resolution is the convenience path; when several dates share a slug the
  **newest** wins (S1 pins the exact rule in its result).
- **F9 — the CLI is an unlisted consumer.** `cli/src/knowledge_cli/client.py:281-313` and
  `knowledge.py` expose `--overwrite` and a 409 explainer. It keeps working untouched
  because `overwrite` retains its response shape; a `--new-version` CLI flag is explicitly
  **out of scope** for P23 (defer if the operator wants it).
- **F10 — one uvicorn worker / `WRITE_LOCK`.** The archive+write must happen inside the
  existing `server/main.py::WRITE_LOCK` critical section (file → index → DB → git), and the
  lock is **not reentrant** — a helper called from inside it must not re-acquire it (see
  `documents_api._delete_owned_document`'s note).

### S1 notes (server storage + write path landed)

Full detail in `slices/P23.S1/result.md`; the durable, cross-slice parts:

- **S1 decisions later slices depend on.**
  * Newest-`(project, slug)` = **`ORDER BY date DESC, id DESC LIMIT 1`**, tenant-scoped
    (`db.find_latest_document_by_slug`) — the same ordering `list_documents` calls
    newest-first. **F8 caveat for S4:** `slug` defaults to `slugify(title)`, so a
    *retitled* v2 must send `slug` or `rel_path` or it creates a new document.
  * **409 detail** keeps its status and every existing key; it gains `version` + `hint`
    **only when an existing DB row was found** (a disk-only conflict is not versionable).
    The CLI's 409 explainer (F9) is untouched.
  * **Identity is immutable across a version chain**: a resolved target with a different
    `format` *or* a different `project` is a **422**, never a silent coercion. A resolved
    target's `date`/`slug` also win over the request's (the response echoes the target's).
  * **`overwrite: true` now bumps the version too** (archives v`N`, publishes v`N+1`) —
    both write modes share one chain. Status + existing keys unchanged; `version`,
    `previous_version`, `archived_path` are additive.
  * **Deleting a document deletes its history** — `_delete_document` removes the whole
    `.versions/<project>/<date>-<slug>/` dir + rows and stages the removal in the same
    scoped commit; response gains `versions_removed` (the `/app` delete stays 204).
  * `document_versions.created_at` = when the body was archived: *now* on the write path,
    the archive file's **mtime** when reindex re-derives it.
- **What S2 should call** (already in `server/db.py`, no new storage work needed):
  `list_document_versions(conn, rel_path, tenant_id=…)` (version DESC, carries
  `markdown` + `raw_html`) and `get_document_version(conn, rel_path, version,
  tenant_id=…)`. `document_versions` is **identity-keyed** (`tenant_id, rel_path,
  version`) — so a route keyed on a doc **id** must first resolve that id to its
  `rel_path` (`db.get_document`/`_resolve_readable_doc`), then read versions by path.
- **`version` is already on the read surfaces.** Both projections drop only
  `tags_text`/`raw_html`/`tenant_id`, so `/api` and `/app` document reads already expose
  `documents.version` — S3 needs no server change to show "v3".
- **A v1 file is byte-identical to a pre-P23 one.** `version:` is emitted only for
  version ≥ 2 (right after `date:`), and `set_frontmatter_version` edits that one line
  in place rather than re-serializing, so an archived body keeps unknown frontmatter
  fields and its exact bytes. Do not "normalize" archived files.
- **Free win discovered:** `server/seed.py` imports `reindex.RESERVED_DIRS`, so adding
  `.versions` there also kept it out of seed's project discovery — otherwise `.versions`
  would have been provisioned as a *project* in the accounts registry. Any future walker
  that reasons about top-level content dirs should import that constant, not re-list it
  (only `graph_hook`/`site_smoke` can't — they must never import `server/*`).
- **mkdocs needs no change** (verified upstream): its default file-scanner exclusion is a
  gitignore spec `['.*', '/templates/']`, so dot-prefixed dirs are skipped at any depth
  and `docs/.versions/` is never built into the site. The dot prefix in the pinned design
  is doing real work.
- **Reindex report gained additive keys** `versions_indexed` / `versions_removed`;
  `indexed`/`removed` still count current documents only.

### Validation the slices should run

- `python3 -m pytest` (repo root; `testpaths = ["tests"]`, `pythonpath = ["."]`) — S1/S2.
- `python3 scripts/plugin_parity.py` — S1/S2 (template mirror gate).
- `python3 scripts/skills_parity.py` — S4.
- `npm run build` / lint in `web/` — S3 (check the repo's actual web scripts first).
- `python3 scripts/workflow.py validate` — every slice.

## Constraints

- Content-plane schema changes go in `server/db.py` only (no alembic — F1), and must be
  idempotent + safe on an existing DB.
- Every `server/**` and `tests/**` change is mirrored to `plugin/templates/kb/` in the same
  slice (F2); the same holds for `scripts/graph_hook.py` / `scripts/site_smoke.py`.
- Tests stay terse: a handful of high-value cases per slice (repo hard rule), added to the
  existing `tests/test_api_write.py` / `test_reindex.py` / `test_documents_api.py` modules
  rather than new fixture scaffolding wherever possible.
- Never hand-edit `docs/current/*.md`; implementation slices append a one-line **Doc
  impact** note below and the `P23.REVIEW` slice consolidates them into doc versions.
- Backward compatibility is required: an unversioned corpus, the existing `/api` + `/app`
  read shapes, the CLI, and search/graph output must all behave exactly as today.
- No visual-design work in this phase (F6) — S3 reuses existing components and tokens.

## Doc impact

_One line per durable-truth change; `P23.REVIEW` consolidates these into doc versions._

- (DECOMP) Expected areas for the review to consolidate: `data.md` (the `.versions`
  on-disk archive layout, `documents.version`, `document_versions`), `api.md` (the
  `new_version`/`rel_path` write fields and the version read routes on both planes),
  `backend.md` (write-path archiving + reindex rebuild + reserved-dir exclusions),
  `frontend.md`/`experience.md` (version history UI), `architecture.md` or
  `decisions.md` (the "disk is canonical, DB is disposable" consequence for versioning),
  `product.md` (versioned publishing as a product capability). Each slice must still
  append its own concrete note here.
- (S1) `data.md` + `backend.md` + `api.md`: document version history is now stored
  on disk at `<root>/.versions/<project>/<date>-<slug>/vNNNN.<ext>` (superseded bodies,
  self-describing via a `version:` frontmatter field emitted only for v≥2) with the
  derived `documents.version` column and the identity-keyed `document_versions` table
  (`UNIQUE(tenant_id, rel_path, version)`, no alembic — content-plane schema stays in
  `server/db.py`); `reindex` rebuilds that table from disk and excludes `.versions` from
  the document walk (as do `graph_hook`/`site_smoke`, so archived bodies are never
  searched, embedded, graphed or published); `POST /api/documents` gains
  `new_version`/`rel_path` (archive-then-write at an unchanged `rel_path`, response gains
  `version`/`previous_version`/`archived_path`), `overwrite: true` now archives the body
  it replaces instead of destroying it, the 409 detail gains a versionable hint, and
  deleting a document deletes its archive with it.

## Open Questions

- Should a future phase add rollback ("make v2 current again"), version diffing, or
  pruning of very old versions? Out of scope here; raise as deferred jobs if wanted.
- Should the CLI grow a `--new-version` flag (F9)? Deferred by decision.
