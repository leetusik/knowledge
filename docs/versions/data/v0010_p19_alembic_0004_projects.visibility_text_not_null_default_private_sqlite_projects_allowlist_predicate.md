---
doc_id: data
version: v0010
created_at: 2026-07-22T15:28:37+09:00
source: P19.REVIEW
summary: P19 alembic 0004 projects.visibility text NOT NULL default private; SQLite projects allowlist predicate
previous: v0009_p18_alembic_0003_projects_unique_tenant_id_name_with_de-dupe_project_credentials.tenant_id_not_null_project_id_nullable_org_keys_carry_project_id_null
---

# Data

## Status

Implemented and validated (Track 2). SQLite + FTS5 backs the document store, with a P4 disposable embedding cache (`document_embeddings`) for hybrid semantic search. `docs/` markdown is the canonical, durable store; the DB — including the embedding cache — is a disposable projection rebuilt from files.

P6 adds a **second, independent data surface for Track 1**: a build-time `graph.json` static asset for the knowledge map. It is not part of the SQLite store and shares no runtime with it — it is derived directly from `docs/` frontmatter at `mkdocs build`/`serve` time and drawn client-side. Its data contract is documented at the end of this doc.

**P10** adds a **durable Postgres control plane** for accounts/tenancy — six tables that are the source of truth for users, tenants, projects, and API credentials — and threads a `tenant_id` through the disposable SQLite content store. The content store stays files-canonical + disposable; Postgres is the one place P10 introduces durable relational state beyond `docs/`.

**P11** adds a **7th** control-plane table, `usage_events` — a durable, append-only **event log** of per-tenant / per-project usage (document creates/deletes and searches) that the dashboard reads back as a **derive-on-read** GROUP-BY-day aggregate. It is observability data only (no quotas/billing), carries no new PII (only tenant/project/event-type/timestamp), and its retention is **deferred** (a cleanup job is flagged as D8, not built now).

**P16** adds an HTML explainer document format to the **disposable content plane only**: the `documents` table gains two columns — `format TEXT NOT NULL DEFAULT 'md'` and nullable `raw_html TEXT` (the raw HTML, populated for html docs only) — via an idempotent `ALTER TABLE ADD COLUMN` in `init_db`. The `markdown` column for an html doc holds **server-extracted plain text** (so FTS5 / `snippet()` / embeddings are unchanged), while `raw_html` holds the raw HTML the web viewer's raw route serves. Canonical storage is still files (`docs/<project>/<date>-<slug>.html`, metadata in a leading `<!--kb … -->` comment-frontmatter), and reindex rebuilds both columns from the file alone. **The Postgres control plane is untouched — no Alembic migration.**

**P18** reshapes the **Postgres control plane** for org-level credentials + get-or-create projects, via the **third Alembic migration `0003_org_level_credentials`** (`down_revision="0002_usage_events"`). See *Accounts v2 control-plane schema (P18)* below.

**P19** adds **per-project visibility** to the Postgres control plane via the **fourth Alembic migration `0004_project_visibility`** (`down_revision="0003_org_level_credentials"`) — a single additive column `projects.visibility text NOT NULL DEFAULT 'private'`. The **disposable SQLite content plane is unchanged** (no new column, no migration); visibility is bridged into reads at query time via a new project-**name** allowlist predicate on the existing `documents` reads. See *Project visibility control-plane schema (P19)* below.

## Storage

- Primary content DB: SQLite at `data/kb.sqlite3`, **WAL** mode, idempotent DDL applied at `connect()`. Disposable and **gitignored** — the ignore rule is root-anchored `/data/` (so the `docs/versions/data/` durable-doc subtree stays trackable), and the DB is rebuilt from `docs/` by reindex.
- **(P10) Control-plane DB: Postgres** (`postgres:17`), reached via async SQLAlchemy 2.0 + psycopg3 (`postgresql+psycopg://…`), migrated by Alembic. Holds the six accounts tables + **(P11)** the `usage_events` table (below). **Durable** (a `pgdata` volume), unlike the disposable content SQLite. Dormant when `DATABASE_URL` is unset.
- **(P10) Per-tenant content root:** non-#1 tenants' `docs/`-style files live under a namespaced `<KB_ROOT>/tenants/<tenant_uuid>/` root (a sibling of `docs/`), **gitignored + never in the mkdocs build**. Tenant #1 keeps `docs/<project>/…` unchanged.
- Cache / object storage: none. (Non-#1 `tenants/` content is on-box only, with no git backup / no published site — see *Retention*.)

## Entities

### documents

- Purpose: one row per explainer document.
- Columns: `id`, `project`, `slug`, `date` (GLOB-checked `YYYY-MM-DD`), `title`, `tags` (JSON array), `tags_text` (space-joined mirror of `tags` for FTS), `source_repo` (P4: a **publish-safe** basename — sanitized at write time, never an absolute local path), `related` (P4: `TEXT NOT NULL DEFAULT '[]'`, a JSON array of forward-link rel_paths, **not** in `documents_fts`), `rel_path` (= `<project>/<date>-<slug>.md` **or** `.html`, relative to the tenant's content root), `markdown` (the doc's **readable text** without frontmatter, starting at the H1 for md; the **extracted plain text** for html), `created_at`, `updated_at`, **(P10)** `tenant_id` (`TEXT NOT NULL DEFAULT ''`), **(P16)** `format` (`TEXT NOT NULL DEFAULT 'md'`, `'md' | 'html'`) and `raw_html` (nullable `TEXT`, the raw HTML for html docs only; **never in any JSON body** — dropped by the read projectors).
- **(P16) `format`/`raw_html` semantics:** `format` discriminates the doc type; for an html doc `markdown` = the stdlib-`html.parser`-extracted visible text (so FTS/embeddings index the readable content, never `<script>`/`<style>`) and `raw_html` = the raw self-contained HTML the web viewer's raw route serves. Both are **path-derived by reindex** from the on-disk `.html` file, not durable in the DB. The FTS trigger trio and `document_embeddings` are unchanged (both key off `markdown`/rowid).
- **(P10) `tenant_id` semantics:** `''` is the **legacy / tenant-#1 sentinel** (legacy single-tenant mode and the operator's own `docs/` corpus after re-stamp use the resolved tenant #1 UUID); any other tenant's rows carry their tenant UUID string. It is **path-derived** by reindex, not client-supplied.
- Constraints: **(P10)** `UNIQUE(tenant_id, rel_path)` — the old `UNIQUE(rel_path)` and `UNIQUE(project, date, slug)` were **dropped**, so the same `rel_path` can exist once per tenant; a same-tenant repeat is an in-place upsert. A `CHECK` still GLOB-validates the date format.
- Upsert keys on `(tenant_id, rel_path)` (preserves `created_at`, refreshes `updated_at`; `tenant_id` is set on insert, not in the `DO UPDATE`). `document_embeddings` + `documents_fts` are unchanged — tenant is transitive via `doc_id`/rowid.

### documents_fts

- **External-content** FTS5 virtual table: `documents_fts(title, tags_text, markdown, content='documents', content_rowid='id', tokenize='porter unicode61')`. The tokenizer is **unchanged in P4** — Korean/CJK searchability is achieved entirely at the query layer (prefix expansion in `build_match_query`), not by switching the index tokenizer.
- Kept in sync with `documents` by an **AFTER INSERT / DELETE / UPDATE trigger trio** (the delete/update paths use the external-content `'delete'` protocol). The P4 `related` base-table column is deliberately excluded — the trigger trio names its columns explicitly (`title, tags_text, markdown`), so it is untouched.
- External-content (not contentless) so `snippet()` / `highlight()` work over `markdown`. Column order `(title, tags_text, markdown)` maps to `bm25` weights `8.0 / 4.0 / 1.0`.

### document_embeddings (P4)

- Purpose: a **disposable cache** of one embedding vector per document for hybrid semantic search.
- Columns: `doc_id` (PK → `documents(id)` **`ON DELETE CASCADE`**), `model`, `content_hash`, `dims`, `vector` (float32 BLOB), `updated_at`.
- Vectors are L2-normalized float32 (the Gemini SDK returns **3072-dim**), keyed by content hash so reindex re-embeds only changed docs; a wiped table just re-embeds. Kept **sqlite-vec-upgradable** — the same `doc_id` keying maps onto a future `vec0` virtual table.
- The FK cascade (with `PRAGMA foreign_keys=ON` at `connect()`) means deleting a document automatically drops its embedding row — the delete path needed no extra cleanup code.

### Postgres accounts schema (P10) — the control plane

Six durable tables (async SQLAlchemy 2.0 models under `server/persistence/models.py`, UUID PKs, tz-aware `created_at`, stable Alembic constraint names via a `NAMING_CONVENTION`), ported from the `vocky` reference:

- **`users`** — the account (email + argon2id `password_hash`).
- **`tenants`** — a workspace. **No owner column** — ownership is the `tenant_members` join.
- **`tenant_members`** — the ownership/membership join (`role="owner"` for the solo owner in the MVP).
- **`projects`** — tenant-owned projects; carries `tenant_id`. The **source of truth for project → tenant** the `/api/*` resolver reads.
- **`project_credentials`** — per-project `vk_` ingest keys: stored as sha256-hex `token_hash` + a 12-char display `token_prefix` (raw key never persisted); `revoked_at` soft-revoke.
- **`auth_tokens`** — opaque session bearer tokens: sha256-hex `token_hash`, optional `expires_at` (30-day TTL). Active = NULL-or-future `expires_at`.

Only sha256 hashes are stored for credentials/session tokens — the raw value is returned exactly once and never persisted.

### usage_events (P11) — per-tenant usage metering (the 7th control-plane table)

- Purpose: one durable row per **metered content-plane event** (a document create/delete or a search), the source data behind the tenant dashboard's usage view. **Event-log grain** — one row per event; the dashboard aggregates are derived on read, never pre-rolled.
- Columns (async SQLAlchemy 2.0 model `UsageEventModel` under `server/persistence/models.py`, same `NAMING_CONVENTION`/`PG_UUID`/tz-aware `utc_now` conventions as the six accounts tables): `id` (UUID PK), `tenant_id` (**FK → `tenants.id` `ON DELETE CASCADE`**, `NOT NULL`), `project_id` (**nullable** FK → `projects.id` **`ON DELETE SET NULL`**), `event_type` (**free text**, `NOT NULL` — `document.created` | `document.deleted` | `search`), `occurred_at` (tz-aware, `NOT NULL`, default `utc_now` / server default `CURRENT_TIMESTAMP`).
- **`project_id` is nullable + `SET NULL`** so master-bearer / unmapped-project usage degrades cleanly to **tenant-level** attribution, and deleting a project keeps its usage history (the row survives, project unset). `event_type` is **free text, not a DB enum/CHECK** — new event types need no migration; integrity comes from the shared constants in `server.usage.types` (`EVENT_DOCUMENT_CREATED` / `EVENT_DOCUMENT_DELETED` / `EVENT_SEARCH`), imported by both the metering hook and the read API.
- **Indexes:** two composite indexes — `ix_usage_events_tenant_id_occurred_at (tenant_id, occurred_at)` and `ix_usage_events_project_id_occurred_at (project_id, occurred_at)` — that back the windowed GROUP-BY-day aggregate.
- **Derive-on-read aggregate:** `UsageService.get_usage_metrics` runs a single grouped SELECT (GROUP BY the UTC calendar day of `occurred_at`, conditional per-`event_type` counts) over a **half-open window `[start, end)`**, totals summed in Python, days **zero-filled** to a contiguous windowed series (bounded by the window, never by event volume). See backend.
- **Retention:** the log grows unbounded; a cleanup/retention job is **deferred (D8)** until volume becomes material — not built in P11.

### Accounts v2 control-plane schema (P18) — org-level credentials + unique project names

P18 reshapes two of the P10 accounts tables (migration `0003_org_level_credentials`); the six-table set is otherwise unchanged. The changes **supersede** the P10 `projects` / `project_credentials` bullets above:

- **`projects` gains `UNIQUE(tenant_id, name)`** (`uq_projects_tenant_id`). This is the constraint **get-or-create** relies on (saving to a name is now safely idempotent per tenant). Because prod had **no** unique before, `0003` **defensively de-dupes** any duplicate `(tenant_id, name)` rows first — **oldest-wins** by `(created_at, id)` (matching `get_project_by_name`'s ordering), re-pointing every `project_credentials.project_id` + `usage_events.project_id` from a dead duplicate to the survivor, then deleting the dead rows — so the constraint can be added without failing on live data.
- **`project_credentials.tenant_id`** is added **`NOT NULL`** (FK → `tenants.id` `ON DELETE CASCADE`, indexed `ix_project_credentials_tenant_id`), **backfilled** from each row's bound `project.tenant_id`. The resolver now reads `tenant_id` off the credential directly.
- **`project_credentials.project_id` becomes nullable.** An **org-level** credential carries `project_id NULL` (it authorizes the whole tenant/org); a **project-bound** credential keeps its `project_id` (attribution + the vanished-project existence guard). No column is dropped, no existing row's meaning rewritten — org-level keys are purely additive.
- The ORM (`server/persistence/models.py`) mirrors all three (`ProjectModel` `UniqueConstraint`; `ProjectCredentialModel` non-null `tenant_id` FK + index + nullable `project_id`). `0003`'s downgrade is destructive-by-design (a fix-forward repo): it drops `project_id IS NULL` rows before restoring `NOT NULL`.

### Project visibility control-plane schema (P19) — `projects.visibility`

P19 adds one additive column to the `projects` table (migration `0004_project_visibility`); nothing else in the six-table set changes, and the disposable SQLite content plane is untouched.

- **`projects` gains `visibility` `text NOT NULL DEFAULT 'private'`** — the per-project public/private flag (`'private' | 'public'`, app-layer validated, **no DB CHECK**, matching the `usage_events.event_type` free-text convention). The constant server DEFAULT means the add is a **single-step** migration with no two-phase backfill, and pre-P19 code (which neither reads nor writes the column) keeps working during any migrate→recreate overlap — so `0004` carries **no mint-window** (unlike `0003`). The ORM mirrors it (`ProjectModel.visibility`, `default="private"`, `server_default=text("'private'")`), so `Base.metadata.create_all` (used by the Postgres-gated tests) yields a schema byte-equal to the migration. `0004`'s downgrade is `op.drop_column`.
- **`ProjectRecord.visibility` / `serialize_project`** carry it up through the accounts layer; `CreateProject.visibility` defaults `"private"`, so signup / `provision_signup` / `get_or_create_project` keep making private rows untouched (implicitly created projects are private by default). See **backend**.
- **The visibility bridge is query-layer, not schema (SQLite content plane).** SQLite `documents` rows carry only the project **name string** (no visibility column, no FK). Each anonymous read resolves the owner's set of public-project **names** from the small Postgres `projects` table and passes it as an allowlist predicate into the existing SQLite reads: `server/db.py`'s `_filtered`/`list_documents`/`count_documents` gained an optional `projects: Sequence[str] | None` → `documents.project IN (?,…)`. Default `None` leaves every existing caller byte-identical; an **empty** list is `WHERE … 0` (**fail-closed** — matches nothing). No SQLite schema change and no reindex — the toggle takes effect instantly. See **backend**/**security**.

## Indexes / Search

- BM25 keyword search via `documents_fts`, fused in Python with an exp-decay recency signal (P4).
- **CJK/Hangul/Kana** search comes from query-layer prefix expansion, not the index (the tokenizer stays `porter unicode61`).
- **Hybrid semantic search** (P4): a cosine vector ordering over `document_embeddings` is fused with the keyword ordering via RRF in `server/search.py` when a Gemini key is configured; otherwise search degrades to BM25-only.

## Extension Point (sqlite-vec upgrade)

- The formerly-clean `sqlite-vec` seam is now **consumed** by hybrid search, but stored as a plain `document_embeddings` BLOB table + Python cosine (the local python.org macOS venv cannot load SQLite extensions). To adopt `sqlite-vec` later, swap that table for a `vec0` virtual table on the same `doc_id` and replace the Python cosine loop with a vec KNN query — the RRF fusion, signals shape, and `mode` logic are unaffected; nothing else keys off the storage format.

## Migrations

- Tooling: none for the disposable DB. DDL is idempotent and applied at connect.
- P4 added one **in-place** migration for continuity: `init_db` runs `PRAGMA table_info(documents)` and, if the `related` column is absent, `ALTER TABLE documents ADD COLUMN related TEXT NOT NULL DEFAULT '[]'` — idempotent, so a pre-P4 DB upgrades without a rebuild.
- **(P16)** `init_db` adds `format` and `raw_html` the same way — PRAGMA-guarded `ALTER TABLE documents ADD COLUMN` for each (the P4 `related` precedent), idempotent, so a pre-P16 disposable DB upgrades without a rebuild (a reindex then back-fills them from the on-disk files). No Alembic / Postgres change.
- **(P10) SQLite content DB** — because the tenancy change reworks the table constraints (`UNIQUE(tenant_id, rel_path)`), an in-place `ALTER` is not enough: `init_db` checks `PRAGMA table_info(documents)` and, if `tenant_id` is absent (a pre-tenancy DB), **drops and recreates** `documents` + `documents_fts` + `document_embeddings` and re-runs the schema. Safe because the DB is disposable — the boot reindex repopulates from files.
- **(P10) Postgres control plane** — versioned with **Alembic** (async `env.py`, initial revision `0001_accounts_tenancy` creating the six tables). Migrations run **explicitly** (`alembic upgrade head`) as a deploy step, never on boot.
- **(P11) Second migration `0002_usage_events`** (`down_revision="0001_accounts_tenancy"`) — a hand-written Alembic revision creating `usage_events` + its two composite indexes, with constraint names matching the model (`pk_usage_events`, `fk_usage_events_tenant_id_tenants` CASCADE, `fk_usage_events_project_id_projects` SET NULL — no autogenerate drift). `alembic upgrade head` now applies **both** `0001` and `0002` in order (verified live against `postgres:17` at the P11 review).
- **(P18) Third migration `0003_org_level_credentials`** (`down_revision="0002_usage_events"`) — the org-level-credentials + unique-project-names change (de-dupe → `UNIQUE(tenant_id,name)` → `project_credentials.tenant_id` add/backfill/NOT-NULL/FK/index → `project_id` nullable; see *Accounts v2 control-plane schema (P18)* above). `alembic upgrade head` now applies `0001`+`0002`+`0003` in order; validated against a disposable `postgres:17` at the P18 review (clean upgrade + downgrade round-trip + a seeded-duplicate de-dupe scenario). It is a **manual** deploy step (never on boot) and is the actual de-dupe run on prod — `alembic/` stays repo-only (not shipped in the plugin template).
- **(P19) Fourth migration `0004_project_visibility`** (`down_revision="0003_org_level_credentials"`) — a single additive `op.add_column("projects", visibility text NOT NULL server_default 'private')` (downgrade `op.drop_column`). `alembic upgrade head` now applies `0001`+`0002`+`0003`+`0004` in order; validated against a disposable `postgres:17` at the P19 review (clean `0001→0004` upgrade + a `0004→0003` downgrade→re-upgrade round-trip, column verified `text NOT NULL DEFAULT 'private'`). A **manual** deploy step; unlike `0003` it carries **no mint-window** (the constant server DEFAULT makes the old-code+new-schema overlap fully safe). Root-only; not mirrored to the plugin template.
- Rule: the SQLite DB is disposable and rebuilt from `docs/`/`tenants/` — schema changes are applied via new idempotent DDL (or a disposable drop-and-recreate) + a reindex. The Postgres accounts schema is durable and migrated explicitly with Alembic.

## Reconciliation (reindex)

- Reindex walks `docs/<subdir>/**/*.md` **only** — top-level files (`index.md`, `tags.md`, `README.md`, `index.json`) are never entered, and `RESERVED_DIRS = {"current","versions"}` are excluded entirely.
- Malformed walked files land in `skipped:[{rel_path, reason}]` (filename not `<YYYY-MM-DD>-<slug>.md`, missing/invalid frontmatter, bad date); real explainers are counted in `indexed`.
- Removal is keyed on **file presence**: a DB row whose `rel_path` no longer exists under a non-reserved subdir is removed. Reindex never runs git.
- **(P10) tenant path-derivation (hard coupling):** reindex walks **both** roots and re-derives `tenant_id` from the content root — `docs/` → tenant #1 (its UUID, resolved from `KB_OPERATOR_EMAIL`), each `tenants/<uuid>/` sibling → that dir name. So a rebuilt `kb.sqlite3` re-populates `tenant_id` **from the path alone**, and cross-tenant isolation survives a full disposable-DB rebuild (verified in the P10 review E2E). Vanished-row cleanup is **tenant-scoped**: a row is stale only if its `(tenant_id, rel_path)` is absent on disk, so one tenant's reindex never deletes another's rows.

## Retention

- The SQLite DB is a disposable projection; `docs/` is the durable store. Reindex reconciles drift (manual edits, API-down fallback writes, git resets).
- **(P10)** The Postgres accounts DB is **durable** (a `pgdata` volume). Tenant #1's corpus stays safe via the git-published `docs/` tree; **non-#1 tenants' `tenants/<uuid>/` content is on-box-only** — gitignored, unpublished, with no off-box backup in P10. A backup/snapshot job for `tenants/` should be added before non-#1 tenants carry real data at scale (flagged for a deferred job).
- **(P11)** `usage_events` is durable in the same Postgres control plane and grows **append-only** (one row per metered event). No retention is applied in P11 — a cleanup/retention job is **deferred (D8)** until the log's growth becomes material (e.g. before onboarding high-volume non-#1 tenants).

## Build-time Knowledge-Graph Data Contract (P6, Track 1)

A **build-time static asset** — not a DB table. `scripts/graph_hook.py` (a mkdocs
`hooks:` module, PyYAML-only, no `server/*` import) walks `docs/`, parses explainer
frontmatter itself, and writes `graph.json` into `site/` (fetched client-side like
`site/search/search_index.json`). It is regenerated from `docs/` on every build/serve;
nothing persists it. The renderer that consumes it is in **frontend**; the hook
mechanism + guard in **operations**/**qa**; the modelling ADRs in **decisions**.

### Node-selection rule

- A **doc node** is any `docs/**/*.md` whose frontmatter carries `source` as a
  **mapping containing `project`** (the /explain contract). This discriminator — not
  a hard-coded project list — is what naturally **excludes `docs/current/*` and
  `docs/versions/*`** (their `source` is a plain string, a different content class
  with no tags/related), plus belt-and-braces skips of reserved dirs
  (`current, versions, stylesheets, assets, javascripts`) and file names
  (`index.md, tags.md, README.md`). Self-adapts to new docs/projects. Today → the 6
  explainers. `docs/current` inclusion behind a toggle is deferred beyond v1.

### Schema — `{version, projects, nodes, edges}`

Serialized `json.dumps(..., ensure_ascii=False, indent=2, sort_keys=True)` + trailing
newline (keys sort alphabetically inside every object); **two builds are byte-identical**.

- **`version`**: `1`.
- **`projects`**: `[{name, docs}]`, ordered **(doc-count desc, name asc)** — today
  `[changple5:4, bootstrap_agentic_workspace.sh:1, hi2vi_web:1]`. This order **is** the
  renderer's project→ink assignment (`i % 3`); the legend reads `docs` counts from it.
- **doc node**: `{id, type:"doc", title, url, date, project, tags, degree}`. `id` =
  repo-relative path under `docs/` exactly as `related:` entries author it (e.g.
  `changple5/…-p35-….md`); `url` = mkdocs `File.url` (directory-style, **no leading
  slash** → resolves under both CI's `/knowledge/` base and local serve); `date` = ISO
  string.
- **tag node**: `{id:"tag:<t>", type:"tag", title:<t>, degree}` — **no `url`** (hubs,
  not navigation targets). Tags are **first-class nodes** (the `related:` graph alone is
  too sparse — one 3-doc cluster + isolated docs — so tag spokes are the map's connective
  tissue).
- **ghost/missing node**: `{id:<raw path>, type:"missing", title:<raw path>, degree}` —
  no `url`; emitted **only** for an unresolved `related:` target.
- **edge**: `{source, target, kind}` (+ `"broken": true` on an unresolved `related`).
  `related` is directed **as authored** (P4 forward-only convention, consumed unchanged);
  `tag` connects doc ↔ `tag:<t>`. Self-refs and duplicate `related:` entries are dropped.
  `degree` = incident-edge count over the emitted edge list.

### Guarantees

- **Deterministic** — stable node/edge ordering, byte-identical across builds (no
  timestamps in the payload).
- **Publish-safe** — repo-relative ids/urls only; **no user-home absolute path**
  ever leaks into the payload (guard-asserted; see qa).
- **Dead links are data, not errors** — a `related:` to a nonexistent doc yields a
  `broken` edge + a `missing` ghost node, never a build failure.
- **Today's numbers (validated):** 6 doc + 26 tag = 32 nodes; 3 `related` + 27 `tag` =
  30 edges; 0 broken, 0 ghost.
