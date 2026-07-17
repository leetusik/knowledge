---
doc_id: api
version: v0010
created_at: 2026-07-18T03:13:35+09:00
source: P13.REVIEW
summary: P13 CLI onboarding widened the frozen public contract to /api/* + /auth/* + /app/* + /healthz; new 429 on /auth/{signup,login}
previous: v0009_p12_unmetered_session-scoped_app_read_routes_dashboard_documents_search_graph
---

# API

## Status

Stable and validated. The Track 2 FastAPI service implements the read, search, reindex, and API-owned write contracts below. `docs/` is the canonical store; the SQLite DB is a disposable projection. P4 hardened the surface: search is paginated and hybrid (keyword + optional Gemini vector signal), documents can be deleted, `GET /api/tags` and `GET /api/projects` expose aggregations, reindex accepts a single-path form, and documents carry `related` cross-links — all additive and backward-compatible (the existing `/explain` write payload is unchanged; every new write-contract field is optional). P7 (F1) added one write-path **side effect**: the first document of a **new project** also auto-creates that project's `docs/<project>/index.md` landing page, surfaced as a new `landing_created` response field. The shipped `/knowledge:explain` skill is the client (config-resolved base URL + optional bearer — see below).

**As of P8 the API has two deployments, one codebase:**

- **Local / plugin** (compose service `api`, base `http://localhost:8766`) — unchanged: reads open, writes bearer-guarded only when `KB_API_TOKEN` is set, and the API **never pushes**.
- **Hosted** — live at **`https://knowledge.hi2vi.com`**, consumed server-to-server by the hi2vi content agent. Two behaviors differ, and **both are opt-in flags that default off**, so the local/plugin experience is untouched: `KB_REQUIRE_READ_AUTH=true` puts reads/search behind the same bearer, and `KB_GIT_PUSH=true` turns the write path into **publish-on-write**. **As of P9 the box self-hosts the site** (a `mkdocs serve` viewer off the same clone), so a written doc is live at its `url` **fresh-on-write** — no GitHub Pages (retired), and the origin of the 201 `url` is now the domain **root** `https://knowledge.hi2vi.com`. The push to `main` continues, now as off-box backup/history. **This is additive/config only** — the frozen consumer contract below (field names, types, status meanings, `/api/*` routing) is **unchanged**, and the hi2vi consumer is unaffected (proven live at P9.S5).

**As of P10 the hosted API is multi-tenant.** Two new control-plane surfaces appear — `/auth/*` (signup/login/logout/me sessions) and `/app/*` (tenant projects + `vk_` credentials) — and every `/api/*` bearer now **resolves to a tenant** when `DATABASE_URL` is set (tenant mode). The live corpus is **tenant #1**, and `KB_API_TOKEN` is kept as its pinned master bearer, so **the hi2vi consumer needs zero changes** — the frozen `POST /api/documents` contract is preserved **additively** (tenant is derived from the credential, never a body field; tenant #1's `url`/`rel_path` shapes and the 201 key set are unchanged). With `DATABASE_URL` **unset** the `/api/*` surface is byte-for-byte the pre-P10 single-`KB_API_TOKEN` behavior. See *Multi-tenant surfaces* below.

**As of P11 two additive control-plane usage reads appear** — `GET /app/usage` (whole-tenant) and `GET /app/projects/{id}/usage` (one project) — that serve the P12 dashboard a **derive-on-read** usage aggregate (document creates/deletes, searches) over a rolling day window. They are `require_user`-guarded and tenant-scoped like the rest of `/app/*` (a cross-tenant project → **404**). Usage is metered as a **request-state side effect** on the existing metered `/api/*` writes/searches, so **the frozen `/api/*` consumer contract is untouched** — no request or response field changed. See *Usage read API* below.

**As of P12 five additive control-plane read routes appear on `/app/*`** — `GET /app/dashboard`, `GET /app/documents`, `GET /app/documents/{id}`, `GET /app/search`, `GET /app/graph` — all `require_user`-guarded, tenant-scoped, and **unmetered** (web-UI reads never move a usage counter). They back the P12 authenticated web app, reuse the existing store/search/services scoped by `tenant_id`, and leave the **frozen `/api/*` consumer contract untouched**. See *Web-app read API (P12)* below.

**As of P13 the frozen *public consumer contract widens* — for the first time — from `/api/* + /healthz` to `/api/* + /auth/* + /app/* + /healthz`, and a new `429` appears on the public auth surface.** The control-plane surfaces `/auth/*` (sessions) and `/app/*` (tenant/project/credential) — which have existed in code since P10 but were **404-ing into the mkdocs catch-all at the edge** — are now **routed at the edge** to the API (`deploy/knowledge.conf` gained `location /auth/` + `location /app/` mirroring `/api/`). This is what lets the P13 `knowledge` CLI run its whole onboarding first half (signup → login → project → mint `vk_`) against the hosted host, not just localhost. Because publishing an unauthenticated password grant is a new exposure, `POST /auth/signup` and `POST /auth/login` now answer **`429` + `Retry-After`** (generic body) when a per-IP fixed window is exceeded — a **new documented status on that surface** (throttle mechanics live in **security**/**operations**). The existing `/api/*` field names, types, status meanings, and routing are **unchanged** — the widening is a routing + additive-status change, not a shape change, so the frozen `/api/*` consumer (the hi2vi agent) is unaffected. See *Public contract widened + `/auth` throttle (P13)* below.

> **Prod-cutover caveat (P13).** The edge routing above is deployed and verified (the edge returns FastAPI JSON on `/auth/*`, not the old mkdocs HTML). But the **accounts plane itself (P10–P12) is not yet running on the prod box** (no `knowledge-postgres`, box clone at pre-P13 code, box `.env` missing the accounts secrets) — so a hosted `knowledge init` cannot complete end-to-end until the operator runs the one-time P10–P13 production cutover (see **operations** → *Hosted accounts-plane cutover*). The contract *shape* below is proven on localhost tenant mode; "hosted end-to-end" is pending that cutover, not a code gap.

## Auth

Two layers, both driven by `KB_API_TOKEN` plus one flag:

- **Writes** (`POST /api/documents`, `DELETE /api/documents/*`, `POST /api/reindex`): `Authorization: Bearer <KB_API_TOKEN>` required whenever `KB_API_TOKEN` is set (else 401). Unchanged since P2.
- **Reads/search** (`GET /api/documents`, `/api/documents/{id}`, `/api/documents/by-path/{rel_path}`, `/api/search`, `/api/tags`, `/api/projects`): open **by default**. They require the same bearer only when **both** `KB_REQUIRE_READ_AUTH=true` **and** `KB_API_TOKEN` is set (P8) — the hosted box's configuration. The dependency (`require_read_bearer`) *delegates* to the write path's `require_bearer`, so the two auth surfaces cannot drift.
- **Backward-compat guard (tested):** a set `KB_API_TOKEN` with the flag unset leaves reads open — a local token still guards writes only. Token unset (default) = localhost open.
- **`GET /healthz` is always open**, even on the hosted box (edge/uptime probes need it). Its `documents` count is not a leak: the whole corpus is already public on the site (self-hosted at `knowledge.hi2vi.com` as of P9; formerly GitHub Pages).
- **No CORS, deliberately.** The consumer is server-to-server; the public site (P9: the box's self-hosted `mkdocs` viewer, formerly GitHub Pages) searches browser-only via lunr and never calls this API, so no browser origin ever reaches it. A future browser client would be a separate, explicit change.
- **(P10) Tenant-mode resolution (`DATABASE_URL` set).** The write/read guards are replaced by a two-mode resolver (`server/api_auth.py`). In tenant mode a bearer must resolve to a tenant: exact `KB_API_TOKEN` → **tenant #1** (the pinned master, via `KB_OPERATOR_EMAIL`), a `vk_` key → its project's tenant (+project), a session token → the user's `tenants[0]`; an unresolvable/absent bearer → a **generic 401** (`WWW-Authenticate: Bearer`, no missing-vs-invalid leak). Reads require a resolvable credential too (a tenant is needed to scope). `POST /api/reindex` stays operator-only (a `vk_` key → 401). **Legacy mode (`DATABASE_URL` unset) is unchanged** — the old `require_bearer`/`require_read_bearer` semantics hold byte-for-byte.

## Shipped explain-skill client: config resolution + bearer (P7)

The packaged `/knowledge:explain` skill is the API's client and resolves its target
**per key, highest precedence first**: environment (`KB_ROOT` / `KB_API_BASE_URL` /
`KB_API_TOKEN`) → the config file `$XDG_CONFIG_HOME/knowledge-kb/config.json`
(default `~/.config/knowledge-kb/config.json`; nested keys `kb_root`, `api.base_url`,
`api.token`, `site.base_url`) → the legacy `~/projects/personal/knowledge` convention
(keeps the operator's own machines working pre-setup) → **stop** and tell the user to
run `/knowledge:setup`. A present config file is authoritative and does not fall
through to legacy for keys it omits (omitted `api.base_url` defaults to
`http://localhost:8766`; `kb_root` may be legitimately absent = remote-only). When a
token is configured the skill adds `Authorization: Bearer <token>` to the mutating
POST. The API-first branch semantics are unchanged (201/409/422/401); the file+git
fallback fires **only** when config resolves a **local** `kb_root` — a remote
`base_url` that is unreachable is reported, never silently written to disk.

## Contracts

### GET /healthz

- Purpose: liveness + DB reachability + document count.
- Output: `{status:"ok", docs_root, db:"ok", documents:N}`.

### GET /api/documents

- Query: `project`, `tag`, `limit` (1–200, default 50), `offset` (≥0).
- Output: `{total, items:[...]}`, newest-first. Items omit `markdown` and the internal `tags_text` mirror, and each item now carries `related` (the cross-link array, same DB-row pass-through as `tags`).

### GET /api/documents/{id} and GET /api/documents/by-path/{rel_path:path}

- Output: the single document including `markdown`, `source_repo` (publish-safe basename — see write path), and `related` (still no `tags_text`); 404 when missing.
- The `by-path` route is declared before the `{id:int}` route so a path never binds to the id route.

### GET /api/tags

- Purpose: tag aggregation for a tag cloud / browser (added P4 for the P5 web UI). Open read.
- Query: optional `project` — scopes the counts to one project.
- Output: `{tags:[{tag, count}, ...]}`, ordered **count DESC, then tag ASC** for direct display.

### GET /api/projects

- Purpose: project aggregation for a project browser (added P4). Open read.
- Output: `{projects:[{project, count, latest_date}, ...]}`, ordered **project ASC**.

### GET /api/search

- Query: `q` (required), `project`, `tag`, `limit` (1–50, default 10), `offset` (≥0, added P4), `raw` (default false).
- Output: `{query, mode, total, limit, offset, results:[{doc fields, score, snippet, signals}]}`. `total` is the full match/fusion count; `limit`/`offset` echo the page. `mode` is `"bm25"` or `"hybrid"` (see below).
- **Keyword ranking (always present):** `bm25(documents_fts, 8.0, 4.0, 1.0)` (title 8×, tags 4×, body 1×) fused in Python with an exponential-decay recency signal from the doc's `date` — `score = bm25 + RECENCY_WEIGHT·recency` (module constants `HALF_LIFE_DAYS=90`, `RECENCY_WEIGHT=0.5`); ordered score DESC with date DESC then id DESC as tiebreaks. The full match set is re-ranked in Python *before* `offset`/`limit` slice it, so pagination applies to the final composed ordering, not raw bm25 rank. `snippet()` wraps keyword hits in `<mark>…</mark>`.
- **CJK / Hangul / Kana search:** achieved at the query layer, not the index — `build_match_query` prefix-expands any token containing CJK/Hangul/Kana into a `"tok"*` prefix query (`검색` → `검색"*`), so a 2-char proper noun or a stem matches its inflected forms. Pure-ASCII tokens keep exact porter-stemmed matching. (The FTS tokenizer is unchanged — `porter unicode61`.)
- **Hybrid semantic mode:** when a Gemini API key is configured and the query embeds, a vector ordering (cosine similarity over cached embeddings) is fused with the keyword ordering via **Reciprocal Rank Fusion** (`RRF_K=60`). `mode` is then `"hybrid"`, `total` is the fused-union size, and `score` is the (small, e.g. ~0.03) RRF value. `signals` becomes `{bm25?, recency, vector?}`: `bm25` is present only for keyword hits, `vector` (cosine) only when the vector signal participated; a **pure-semantic (vector-only) hit** carries `{recency, vector}` with a leading-text `snippet` (no `<mark>`). With no key, `raw=true`, or an embed failure the search degrades gracefully to `mode:"bm25"` with byte-identical keyword behavior.
- Safety: each whitespace token is individually double-quoted before `MATCH`, so raw FTS5 operator syntax (`NEAR/AND(`, unbalanced parens, `*`) can never 500 — it collapses to harmless quoted phrases. `raw=true` opts into raw FTS5 syntax deliberately (and stays BM25-only); a syntax error then returns **400**. Blank `q` → empty results.
- Note: BM25 IDF collapses toward 0 on a tiny corpus (a term present in every doc), so keyword `bm25` can round toward 0 there — recency is then the effective tiebreak; the snippet and result still return.

### POST /api/reindex

- Rebuild the DB from `docs/`: walk `docs/<subdir>/**/*.md`, upsert by `rel_path`, delete rows for vanished files. **Never commits.**
- Optional body `{"rel_path": "<project>/<file>.md"}` (pydantic `ReindexIn`; null/absent → full reindex unchanged) triggers an **incremental single-path** reindex — index the one file if present, delete its row if vanished — validated against absolute/`..`/reserved/non-`.md` shapes (a `ValueError` → **422**).
- Output (full): `{indexed, removed, skipped:[{rel_path, reason}], embeddings:{embedded, cached, removed, skipped_reason?}, duration_ms}`; single-path: `{rel_path, action, reason?, embeddings:{...}, duration_ms}`. The `embeddings` block reports the content-hash-cached embedding sync (see Data/Backend).

### DELETE /api/documents/{doc_id} and DELETE /api/documents/by-path/{rel_path:path}

- The `POST /api/documents` write path in reverse (added P4), bearer-guarded, run entirely under `WRITE_LOCK`: remove the `docs/` file (`missing_ok` — a DB row without a file is drift, cleaned without erroring), drop the doc's Recent bullet from `docs/index.md`, delete the DB row (the FTS `AFTER DELETE` trigger and the `document_embeddings` FK `ON DELETE CASCADE` clean up automatically), then a scoped git commit.
- Resolves the target row first → **404** when absent. The `by-path` route is declared before the `{doc_id}` route (same collision-avoidance as the GET pair).
- Query: `commit` (default `true`), optional `co_authored_by`. Commit semantics mirror POST exactly — a failed commit surfaces `committed:false` + `commit_error`, never a rollback.
- Output: `{deleted, id, rel_path, title, project, slug, recent_removed, committed, commit_sha, pushed, commit_error?, push_error?}`. `recent_removed` is `false` (idempotent) when the index or bullet was already gone.
- **DELETE pushes too (P8)**, under the same `KB_GIT_PUSH` flag and the same best-effort semantics as POST — parity for the reverse path, so a deletion on the hosted box removes the doc from the live self-hosted site (fresh-on-write) and, via the push, from the off-box backup.

### POST /api/documents

The API-owned write path — one call creates the convention file, the Recent bullet, the DB row, and the scoped git commit.

- Required: `title`; `markdown` (body **without** frontmatter, starting at the H1); `project` (`^[A-Za-z0-9][A-Za-z0-9._-]*$`, no `..`/`/`); `tags` (2–5, each `^[a-z0-9]+(-[a-z0-9]+)*$`); `source_repo`.
- Optional: `date` (default today, KST), `slug` (default `slugify(title)`), `related` (added P4 — list of rel_paths, default `[]`; shape-validated only, dead links tolerated, a self-reference is dropped silently), `overwrite` (default false), `commit` (default true), `co_authored_by`.
- **`source_repo` is sanitized at write time** (added P4): a local filesystem path collapses to its basename (`/home/<user>/projects/changple5` → `changple5`), a URL passes through unchanged. The stored file, DB row, and API output are always publish-safe, without any skill change.
- Success: **201** `{id, rel_path, url, title, project, slug, date, tags, related, recent_updated, landing_created, committed, commit_sha, pushed}` (+ optional `commit_error`/`push_error`), where `url = <KB_PUBLIC_BASE_URL>/<project>/<date>-<slug>/`.
- **Auto-landing side effect (P7 / F1):** inside `WRITE_LOCK`, right after writing the doc file, the write path calls `ensure_project_landing(docs_root, project)` — if `docs/<project>/index.md` is **absent** (the first doc of a new project), it writes a minimal landing (H1 = project name + one line, **no frontmatter** so it stays a non-doc) and the response carries `landing_created:true`; the scoped commit then stages a **third** path (`docs/<project>/index.md`) alongside the doc + `docs/index.md`. An existing landing (hand-written or previously auto-created) is **never overwritten** → `landing_created:false`, two-path commit as before. This keeps every project satisfying the per-project `site/<project>/index.html` deploy-gate invariant (mkdocs `navigation.indexes` does not synthesize one). The `/knowledge:explain` skill's file-fallback branch performs the same ensure-landing when the API is unreachable.
- `KB_PUBLIC_BASE_URL` note (P7): its default `http://localhost:8765` is correct for a default-port local viewer, so the scaffold's `compose.yml` deliberately leaves it unset (see security/decisions). A scaffold on **advanced custom ports** would then report a default-port `url` in the 201 body — a cosmetic mismatch in one informational field only (the write, site build, and viewer are all correct); set `KB_PUBLIC_BASE_URL` to the chosen viewer origin if custom ports are used.
- **409** when `rel_path` already exists on disk **or** in the DB and `overwrite` is false — the body names the existing doc: `{message, rel_path, id, existing_title}`.
- **422** on any convention validation error (project/tags/slug/date/frontmatter/`related` shape).
- Commit semantics: a **failed commit never rolls back** the file/DB → still **201** with `committed:false` + `commit_error`. A deliberate skip (`commit:false` in the request, or `KB_GIT_COMMIT=false`) → `committed:false`, **no** `commit_error`. `commit_sha` is `null` in both non-committed cases.
- **Publish-on-write (P8), `KB_GIT_PUSH` — default false.** When enabled (the hosted box only), the write path pushes the scoped commit to `origin/main` **inside the same write lock, in-request**: `git fetch origin main` → rebase onto `origin/main` → non-force `git push origin HEAD:main`. **Never `--force`, never `git add -A`** — the box only ever lands its own new-file + Recent-bullet commit on top of the latest remote, so it can never clobber or revert operator work. A rebase conflict aborts cleanly, keeping the local commit.
- **Push failure semantics mirror commit exactly (best-effort, never a 5xx).** The response always carries `pushed: bool`; `push_error` (string) appears **only** when a push was attempted and failed. A `pushed:false` write still **succeeded** — the doc is written + committed locally and publishes on the **next** successful push. `commit_sha` on a **successful push** is the **final published HEAD** on `main` (the rebase may rewrite the commit, so this — not the pre-push hash — is the authoritative published sha); on `pushed:false` it stays the local commit hash.
- An `overwrite` re-write suppresses the duplicate Recent bullet (`recent_updated:false`).

## Multi-tenant surfaces: `/auth`, `/app`, and `/api` tenant resolution (P10)

Two new control-plane surfaces sit **outside `/api/*`** (so the content-plane bearer guards never touch them), plus a tenant-resolving rewrite of the `/api/*` auth. All control-plane surfaces are cross-tenant-safe: a missing **and** a cross-tenant resource both answer **404**, so existence never leaks.

**`/auth/*` (sessions, public):**
- `POST /auth/signup` → **201** `{token, user, tenant}` (**singular** `tenant`) — creates the user + their tenant + owner membership + a 30-day session token, atomically.
- `POST /auth/login` → **200** `{token, user, tenants:[…]}` (**plural**). Enumeration-safe: unknown email and wrong password return a **byte-identical** `401 {"detail":"invalid email or password"}`.
- `POST /auth/logout` → **204** (idempotent, no auth). `GET /auth/me` → **200** `{user, tenants:[…]}` (`require_user`-guarded).
- Duplicate signup → **409**. Body validation is FastAPI-native **422**. Serializers never emit `password_hash`/`token_hash`.

**`/app/*` (tenant control plane, all `require_user`-guarded, scoped to the caller's tenant):**
- `GET /app/tenant`; `GET|POST /app/projects` (POST → **201**); `GET /app/projects/{id}`.
- `POST /app/projects/{id}/credentials` → **201** `{credential, key}` — the raw `vk_` ingest key is returned **once** here only (persisted as sha256-hex + a 12-char `token_prefix`).
- `GET /app/projects/{id}/credentials` → metadata only (includes revoked; never `token_hash`/`key`). `DELETE …/credentials/{cid}` → **204** (idempotent soft-revoke).
- Cross-tenant / missing project or credential → **404**; malformed UUID path / blank project name → **422**.

**`/api/*` credential → tenant resolution (tenant mode, `DATABASE_URL` set):** every `/api/*` bearer resolves to an `ApiAuthContext(tenant_id, project_id, is_public)`: exact `KB_API_TOKEN` → tenant #1 (master), a `vk_` key → its project's tenant (+project), a session token → the user's `tenants[0]`. Content is then **tenant-scoped**: every read/search/list/by-id/by-path/delete is filtered to the resolved tenant, and a cross-tenant fetch or delete by id or path → **404**. Writes for tenant #1 land in `docs/` (public, git-published); every other tenant's writes land in the namespaced `tenants/<uuid>/` root (no git, no landing/Recent). Legacy mode (`DATABASE_URL` unset) adds **no** filter and is byte-identical to pre-P10. **(P11)** the resolved context also carries `credential_id` (set only for a `vk_` caller) so the metering layer can stamp that credential's `last_used_at`.

## Usage read API (P11): `GET /app/usage` + `GET /app/projects/{id}/usage`

Two additive, `require_user`-guarded control-plane reads (in `server/usage_api.py`, mounted in `main.py`) over the P11 derive-on-read usage aggregate. Both are tenant-scoped exactly like the rest of `/app/*`. They only **report** usage — metering (the writes) is a side effect of the metered `/api/*` handlers, never re-triggered on a read. This is a contract P12's dashboard codes against, so it is pinned here.

- **Window param:** `days` (int, default **30**, `ge=1, le=365` → a bad value is a FastAPI-native **422**). It selects the last `days` UTC calendar days ending **today** inclusive, resolved to a half-open `[start, end)` window (`end` = midnight tomorrow, `start` = midnight `today-(days-1)`). `daily_counts` is contiguous and **zero-filled to exactly `days`** entries; `day` is `YYYY-MM-DD`; the window bounds are ISO UTC datetimes.

- **`GET /app/usage`** — whole-tenant (`project_id=None`, so tenant-level NULL-project events count and a zero-event tenant still returns the full zero-filled series — no empty-tenant short-circuit). Response:

  ```json
  {
    "window": {"start": "…", "end": "…"},
    "totals": {"total": 0, "documents_created": 0, "documents_deleted": 0, "searches": 0},
    "daily_counts": [{"day": "YYYY-MM-DD", "total": 0, "documents_created": 0, "documents_deleted": 0, "searches": 0}, "… (length = days)"],
    "projects": [{"id": "…", "name": "…", "tenant_id": "…", "created_at": "…"}]
  }
  ```

- **`GET /app/projects/{project_id}/usage`** — one project (drill-down). Uses `_load_scoped_project` → **404** for both a missing **and** a cross-tenant project (existence never leaks). Same `window`/`totals`/`daily_counts`, plus `project` (the project record) and `credentials` (each `vk_` key: `{id, project_id, name, token_prefix, created_at, last_used_at, revoked_at}`). Per P11, a credential's `last_used_at` reflects its last **metered** use (a write/search), not a read.

- **Error surface:** a read that cannot complete surfaces internally as `UsageReadError` and is rendered as a clean **500** (`{"detail":"usage read failed"}`), never a bare traceback. `serialize_project` / `serialize_credential` are reused from `app_api` so the project/credential shapes match byte-for-byte.

## Web-app read API (P12): the unmetered `/app` read routes

P12's authenticated web app consumes five additive, `require_user`-guarded, tenant-scoped control-plane reads (in `server/{dashboard,documents,graph}_api.py`, mounted after `usage_api`). All are **unmetered** — none sets `request.state.usage` or calls `record_event`, so web-UI browsing/search/graph never appear in the billable `searches` metric (the paid retriever is P15). The frozen `/api/*` contract is untouched. These are consumed by the Next.js BFF **server-to-server** (the browser never calls them directly — see architecture/security); they add no CORS.

- **`GET /app/dashboard`** (`days=30`, `1..365`) → `{projects:[{id,name,created_at,documents,keys,last_used_at}], activity:[{type,at,project_name,credential_name}]}`. A one-round-trip rollup: `documents` = `documents_created` over the window; `keys` = non-revoked credential count; `last_used_at` = max across the project's credentials; `activity` = real lifecycle events (`project_created`/`key_minted`/`key_revoked`), newest-first, capped 8.
- **`GET /app/documents`** (`project?:UUID`, `tag?`, `limit=50 ≤200`, `offset=0`) → `{total, items}` newest-first · **`GET /app/documents/{id:int}`** → the doc **with** `markdown` (404 missing/cross-tenant) · **`GET /app/search`** (`q` required, `project?:UUID`, `tag?`, `limit=10 ≤50`, `offset=0`) → `{query, mode, total, limit, offset, results}` (`SearchQueryError → 400`). These reuse the store/search as-is scoped by `tenant_id`; the `/app` projector drops `tags_text` + `tenant_id` (and `markdown` on the list), keeping `related`. A supplied `project` UUID is resolved to the content-plane project **name** (documents key off name) via a tenant-scoped bridge — **404 on missing/cross-tenant**.
- **`GET /app/graph`** (optional `project?:UUID`) → `{version, projects, nodes, edges}` (+ a `truncated` flag; `MAX_DOC_NODES = 2000`). A **server-side twin** of `scripts/graph_hook.py`'s inversion over `db.list_documents(tenant_id=…)` — nodes keyed on `rel_path`, related/tag edges (deduped, ghost/broken on dead targets), `degree`, the `(-docs, name)` project order — with the one substitution that each doc node's `url` = `/documents/{db_id}` (the read route). `scripts/graph_hook.py` is untouched (it stays server-free — tenant #1's public mkdocs surface).

## Public contract widened + `/auth` throttle (P13)

P13 shipped a standalone `knowledge` CLI whose onboarding half (signup → login → project → `vk_`) speaks to `/auth/*` + `/app/*`. Those planes existed in code from P10 but **404-ed into the mkdocs catch-all at the edge** — so the CLI's first half was unreachable on the hosted host. P13 routes them at the edge and throttles the newly-public grant. What the consumer now sees:

- **Widened public surface: `/api/* + /auth/* + /app/* + /healthz`.** The `/auth/*` session grant and the `/app/*` tenant/project/credential (+ usage) surfaces are now edge-routed to the API. Their shapes are the P10/P11 contracts documented under *Multi-tenant surfaces* and *Usage read API* above — P13 added **no** new route or field there, only edge routing. The `vk_` minted at `POST /app/projects/{id}/credentials` is what the CLI writes into `api.token`, and it authenticates `/api/*` exactly as before.
- **New status on the public auth surface: `429`.** `POST /auth/signup` and `POST /auth/login` return **`429`** with a `Retry-After` header and a generic body `{"detail":"too many requests — please retry later"}` when a per-IP fixed window is exceeded (server-side, in-process, per-`(IP, route)`, default 20/15 min, `KB_AUTH_RATE_LIMIT`/`KB_AUTH_RATE_WINDOW_S`-tunable — see security/operations). The throttle runs **before** the credential check and keys off IP only, so the enumeration-safe generic `401` (unknown-email and wrong-password stay byte-identical) is **preserved through it**. Signup and login have independent buckets.
- **Two `/api/*` response-shape facts the CLI surfaced (unchanged contract, load-bearing to a consumer).** These are pre-existing behaviors P13's `save`/`search`/`list`/`projects` commands depend on, worth stating where a client codes against them: `GET /api/documents` answers `{total, items}` while `GET /api/search` answers `{total, results}` — the two list shapes differ by key. And `GET /api/projects` is a **GROUP BY over documents**, not a project registry: a just-created project (or a `vk_`-bound project with zero documents) is **absent** from it until its first save, and a document written under a *different* free-form `project` name than the key's bound project appears under that name (the write's `body.project` runs `validate_project()` as a convention check only — it is **never** checked against the `vk_`'s bound project, `main.py:396`). The CLI defaults `save`'s project to the git repo basename to partition the corpus identically to `/knowledge:explain`, but the server does not enforce it.

## Frozen consumer contract (P8)

The section below is the **frozen** contract the hi2vi content-agent client (`hi2vi` P15.S4)
codes against. Its shapes were captured from live responses — first through the pytest
`TestClient` (P8.S4), then **confirmed against the production box** (P8.S5): the 201 key
order, the 409 `detail` object, the 401 body, and the search item/`signals` shapes all
match.

**Freeze rule.** Frozen as of P8: **additive-only** thereafter. New response fields may
appear (clients must ignore unknown keys) and new endpoints may be added, but existing
field names, types, and status-code meanings will not change. **P10 upheld this
verbatim:** multi-tenancy derives the tenant from the credential (never a `POST
/api/documents` body field), tenant #1's `url`/`rel_path` shapes and the 201 key set are
unchanged, and the hi2vi consumer keeps working with **zero** changes (`KB_API_TOKEN`
still resolves to tenant #1). Verified in the P10 review E2E: the frozen 201 key set is
intact under tenant scoping with no tenant field on the response. **P11 upheld this
verbatim:** usage metering is a `request.state` side effect on the metered `/api/*`
handlers (recorded post-response by an async middleware), so **no** `/api/*` request or
response field changed — the P11 review E2E re-confirmed the frozen 201 key set is intact
while metering runs, and the usage reads live entirely on the additive `/app/*` surface.
**P13 widened the public surface additively:** it edge-routes the pre-existing `/auth/*` + `/app/*`
planes (no field/shape change) and adds a `429` status to `/auth/{signup,login}` — a new status on
a newly-public surface, not a change to any existing `/api/*` field, type, or status meaning, so the
frozen `/api/*` consumer is untouched.

## Hosted deployment + frozen contract

The knowledge API is hosted publicly at **`https://knowledge.hi2vi.com`** (P8),
a co-tenant on the shared OCI edge. The hi2vi content agent consumes it
server-to-server. The local/plugin deployment is unchanged; the differences on
the hosted box are (a) bearer required on **all** `/api/*` calls, and (b)
publish-on-write (writes are committed + pushed to `main`). As of P9 the box also
**self-hosts the site** (the doc is live at its `url` fresh-on-write, at the domain
root), so the write no longer depends on a GitHub Pages deploy; the push is off-box
backup. Routing is path-based: `/` → the site, `/api/*` + `/auth/*` + `/app/*` + `/healthz` → this API
(**P13** added `/auth/*` + `/app/*` to the edge; pre-P13 it was `/api/*` + `/healthz` only).

### Client config

- `KNOWLEDGE_API_URL=https://knowledge.hi2vi.com`
- `KNOWLEDGE_API_TOKEN=<the box's KB_API_TOKEN>` — the single shared secret; the
  same value the box sets as `KB_API_TOKEN`.
- Send `Authorization: Bearer <KNOWLEDGE_API_TOKEN>` on **every `/api/*` request**.
  The hosted box runs `KB_REQUIRE_READ_AUTH=true`, so reads/search are gated too
  (not just writes). Missing/invalid token → **401** `{"detail": "missing or
  invalid bearer token"}`.
- `GET /healthz` is **open** (no auth) — use it for liveness/uptime probes. Output:
  `{status:"ok", docs_root, db:"ok", documents:N}`.

### Write — `POST /api/documents`

Headers: `Authorization: Bearer <token>`, `Content-Type: application/json`.

**Request body** (`DocumentIn`):

- Required:
  - `title` (string)
  - `markdown` (string) — the document body **without** frontmatter, starting at
    the H1; the API generates convention-exact frontmatter.
  - `project` (string) — `"hi2vi"` for content-agent research docs. Pattern
    `^[A-Za-z0-9][A-Za-z0-9._-]*$` (no `..`, no `/`). (Note: hi2vi *engineering*
    explainers use `project:"hi2vi_web"` — a separate folder; content docs are
    `"hi2vi"`.)
  - `tags` (string[]) — **2–5** tags, each `^[a-z0-9]+(-[a-z0-9]+)*$`.
  - `source_repo` (string) — a local path is sanitized to its basename at write
    time; a URL passes through unchanged (publish-safe either way).
- Optional:
  - `date` (string `YYYY-MM-DD`, default today in KST)
  - `slug` (string, default `slugify(title)`; pattern `^[a-z0-9]+(-[a-z0-9]+)*$`)
  - `related` (string[] of rel_paths, default `[]`; shape-validated only, dead
    links tolerated, a self-reference is dropped silently)
  - `overwrite` (bool, default `false`)
  - `commit` (bool, default `true`)
  - `co_authored_by` (string, e.g. `"hi2vi-agent <bot@hi2vi.com>"`)

**201 — created** (all keys always present except the two optional error keys):

```json
{
  "id": 1,
  "rel_path": "hi2vi/2026-07-14-growth-loops.md",
  "url": "https://knowledge.hi2vi.com/hi2vi/2026-07-14-growth-loops/",
  "title": "Content Idea: Growth Loops",
  "project": "hi2vi",
  "slug": "growth-loops",
  "date": "2026-07-14",
  "tags": ["growth", "loops"],
  "related": ["hi2vi/2026-07-10-other.md"],
  "recent_updated": true,
  "landing_created": true,
  "committed": true,
  "commit_sha": "0847f2e9ef6a4c227d35968e75c27ab6f6bf414d",
  "pushed": false
}
```

Field meanings:

- `id` — DB row id. `rel_path` — path under `docs/` (`<project>/<date>-<slug>.md`).
- `url` — the **published URL** of the doc (`<KB_PUBLIC_BASE_URL>/<project>/<date>-<slug>/`;
  as of P9 the box sets `KB_PUBLIC_BASE_URL=https://knowledge.hi2vi.com` — the **root** of the
  self-hosted site, no longer the Pages origin). Live **fresh-on-write** (the box's live-serve
  viewer serves it the instant it is written — see publish flow).
- `recent_updated` — whether the `docs/index.md` Recent bullet was added (`false`
  on an `overwrite` re-write).
- `landing_created` — `true` only when this was the **first** doc of a new project
  and the API auto-created `docs/<project>/index.md`; `false` otherwise.
- `committed` — whether the scoped git commit succeeded. `commit_sha` — the commit
  hash (see below); `null` when not committed.
- `pushed` — **P8 addition.** `true` when the commit was pushed to `origin/main`
  (box only, `KB_GIT_PUSH=true`); `false` when push is disabled (local/plugin) or a
  push was attempted and failed.
- `commit_sha` semantics: on a **successful push** it is the **final published
  HEAD** on `main` (a fetch+rebase before push may rewrite the commit, so this is
  the authoritative published hash); on `pushed:false` (disabled or failed) it stays
  the local commit hash; `null` when `committed:false`.
- `commit_error` (string) — present **only** when a commit was attempted and
  failed. `push_error` (string) — present **only** when a push was attempted and
  failed. Neither is a failure of the request: the doc is still written (201).

**409 — duplicate** (target `rel_path` already exists on disk or in the DB and
`overwrite` is false):

```json
{
  "detail": {
    "message": "document already exists at hi2vi/2026-07-14-growth-loops.md",
    "rel_path": "hi2vi/2026-07-14-growth-loops.md",
    "id": 1,
    "existing_title": "Content Idea: Growth Loops"
  }
}
```

`id` and `existing_title` are included when a matching DB row exists (the normal
case on the box, where the DB tracks every doc); a bare on-disk collision with no
DB row yields just `message` + `rel_path`.

**422 — convention error** (invalid project / tags / slug / date / frontmatter /
`related` shape): `{"detail": "<human-readable reason>"}`, e.g.
`{"detail": "tags must have 2-5 items, got 1"}`.

**401 — auth** (missing/invalid bearer): `{"detail": "missing or invalid bearer
token"}`.

### Read / search (all require the bearer on the hosted box)

- **`GET /api/search`** — params: `q` (required), `project`, `tag`, `limit` (1–50,
  default 10), `offset` (≥0), `raw` (default false). Response:
  `{query, mode, total, limit, offset, results:[...]}`. `mode` is `"hybrid"` when
  the Gemini vector signal fused in, else `"bm25"`. Each result item:
  `{id, project, slug, date, title, tags, rel_path, source_repo, created_at,
  updated_at, score, snippet, signals}` — `snippet` wraps keyword hits in
  `<mark>…</mark>`; `signals` is `{bm25?, recency, vector?}` (`recency` always;
  `bm25` only for keyword hits; `vector` only when the semantic signal
  participated). `raw=true` opts into raw FTS5 syntax and stays BM25-only; an FTS
  syntax error then → **400**. Blank `q` → empty results.
- **`GET /api/documents`** — params: `project`, `tag`, `limit` (1–200, default 50),
  `offset` (≥0). Response: `{total, items:[...]}`, newest-first. Each item:
  `{id, project, slug, date, title, tags, source_repo, rel_path, related,
  created_at, updated_at}` (no `markdown`).
- **`GET /api/documents/{doc_id}`** and **`GET /api/documents/by-path/{rel_path}`**
  — the single document **including `markdown`**:
  `{id, project, slug, date, title, tags, source_repo, rel_path, markdown, related,
  created_at, updated_at}`; **404** when missing. (`by-path` takes the full
  `<project>/<date>-<slug>.md` rel_path.)
- **`GET /api/tags`** — optional `project`. Response: `{tags:[{tag, count}, ...]}`,
  ordered count DESC then tag ASC.
- **`GET /api/projects`** — Response:
  `{projects:[{project, count, latest_date}, ...]}`, ordered project ASC.

### Operational semantics the client relies on

- **Publish flow (P9: fresh-on-write, no Pages).** A `201` means the doc is written to
  the box and **live at `url` immediately** — the self-hosted `mkdocs serve` viewer serves it
  off the same clone the instant it is written, with no build/CDN lag (the ~65 s GitHub Pages
  step is gone; Pages retired). `pushed:true` means the commit also reached `origin/main` as
  **off-box backup/history**; `pushed:false` **and a `push_error`** means the backup push has not
  landed yet (it catches up on the **next** successful push) — but the doc is **already live** and
  the write **succeeded**, so the client should **not** retry the write on `pushed:false`. `/api/*`
  routing to the API is unchanged (the site serves `/`; the api serves `/api/*` + `/healthz`).
- **Retry / idempotency.** Writes are keyed by `project/date/slug` → `rel_path`. If
  a write times out or fails ambiguously, **re-POSTing the same
  `project`+`date`+`slug` returns 409** (`rel_path` already exists) — treat a
  409-after-timeout as *already written*, not an error (fetch it via
  `GET /api/documents/by-path/{rel_path}` to confirm/read it back). Only use
  `overwrite:true` when you deliberately intend to replace the existing doc.
- **Single daily writer.** The API serializes writes under a process-wide lock and
  assumes a single low-volume writer (the daily content agent); do not run
  concurrent bulk writers against it.
- **Search quality.** Hybrid semantic search is on when the box has a Gemini key
  (`mode:"hybrid"`); with no key / quota exhaustion / `raw=true` it silently
  degrades to `mode:"bm25"` with identical keyword behavior — the client needs no
  branch, just read `mode` if it cares.
