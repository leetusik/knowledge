---
doc_id: api
version: v0018
created_at: 2026-08-07T15:58:57+09:00
source: P25.REVIEW
summary: P25 pretty share URLs: PATCH /app/tenant, GET /app/orgs/{org}/{project}/{slug} resolver, additive canonical_path (round-trip guarded) and tenant slug, org-slug ?org= on the graph, pretty 201 save url
previous: v0017_p24_write_response_no_longer_waits_on_the_network_git_push_and_the_gemini_embed_run_after_the_201_additive_push_pending_pushed_always_false_when_deferred_push_error_gone_commit_sha_is_the_local_pre-rebase_commit
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

**As of P15 the API gains an agent-facing companion — an MCP-over-HTTP retrieval service — that sits *alongside* the frozen `/api/*` and never modifies it.** A separate thin server (`mcp-server/`, package `knowledge_mcp`; see *Agent-facing MCP retrieval service* below and **architecture**) exposes knowledge retrieval to AI agents as MCP tools (`search`, `fetch_document`) over the **Streamable-HTTP** transport at `/mcp`, authed by an `Authorization: Bearer vk_…` header **forwarded verbatim** to `/api/*` — so it reimplements no retrieval and inherits the exact tenant/project corpus scoping of the REST surface. Its consumer-pinned **tool contract is v1** (additive-only; surfaced at the service's own internal `GET /healthz` as `contract_version`), and the frozen `/api/*` field names, types, statuses, and routes are **untouched** (P15 changed **no `server/` code** — verified at review). This is a new *agent-facing* API surface, documented in full below.

**As of P16 HTML explainer documents are a first-class doc type, added to every read/write surface additively.** `POST /api/documents` gains an optional `format: "md" | "html"` input (default `"md"` — the raw content still arrives in the `markdown` body field, which for `format:"html"` carries the self-contained HTML). Every document read projection (`/api/documents/{id}`, `/api/documents/by-path/{rel}`, and the `/app/*` doc reads) gains an additive `format` output; the raw HTML lives in an **internal `raw_html` column that is never in any JSON body**. A new session-guarded, tenant-scoped route **`GET /app/documents/{id}/raw`** serves the raw HTML as `text/html` with the sandbox headers (below) for the web viewer's iframe. The MCP `fetch_document` tool output gains an additive `format` field, and for an html doc its `markdown` is the server-extracted readable text — so **`markdown`'s contract meaning ("readable text body") is preserved, not repurposed**: markdown docs are byte-identical, and html is a *new* format whose readable body is its extracted text. **The frozen `/api/*` consumer contract and the MCP tool contract v1 are preserved verbatim** — every P16 change is a new optional field or an entirely new `/app` route; no existing field's name, type, presence, status, or route changed (verified at the P16 review). See *HTML explainer document type (P16)* below.

**As of P18 the control plane gains org-level credentials and get-or-create projects — all additive to the frozen `/api/* + /auth/* + /app/*` contract.** New org-level credential routes appear on `/app/*` (`POST /app/credentials` mints an org key with `project_id NULL`, `GET /app/credentials` lists them, `DELETE /app/credentials/{id}` revokes), sitting **alongside** the unchanged per-project `/app/projects/{id}/credentials` routes. `POST /auth/signup`'s response gains an additive `project` field beside `tenant`. `POST /app/projects` becomes **get-or-create** (a duplicate name → 201 existing row, no longer a 500), and `POST /api/documents` gains a **get-or-create side effect** (an unregistered `body.project` now leaves a `projects` registry row) — its consumer contract is otherwise unchanged. `serialize_credential.project_id` is now nullable (`null` for org keys). No existing field, type, status, or route changed. See *Org-level credentials + get-or-create projects (P18)* below.

**As of P19 the control plane gains per-project visibility and the product's first anonymous read surface — additive to the frozen contract.** Every `/app/projects` response (list, get, the signup `project`) and `/app/dashboard` rollup row gains an additive **`visibility`** field (`"private"` | `"public"`, default private); a new **`PATCH /app/projects/{project_id}`** session-only toggle flips it (404 cross-tenant/missing, 422 invalid). The read routes **`GET /app/documents/{id}` + `.../raw`** become **optional-identity** — a resolved member reads their own tenant's doc exactly as before, an anonymous or cross-org caller reads it **only** when its project is public — and **`GET /app/graph`** gains an **`org={tenant_uuid}`** selector that returns an **org-scoped public graph** (public projects only). Everything private/nonexistent is an indistinguishable **404** on this surface (404-never-403, no 403 anywhere). Separately, the `POST /api/documents` 201 **`url` is now mode-aware** (tenant → the direct doc page, legacy → the mkdocs shape) — a value change to an existing always-present key, so the frozen contract holds additively. See *Public projects + anonymous read surface (P19)* below.

**As of P21 the `/app` plane gains its first *mutating* document route — an unmetered, session-only `DELETE /app/documents/{doc_id}`.** The web app can now hard-delete a document, and it does so **without** the metering the `/api` plane's deletes carry: the new route reuses `server/main.py::_delete_document`'s **logic**, not the metered `/api` route, so a UI click never bills an `EVENT_DOCUMENT_DELETED` and the "every web-UI feature is free" invariant holds even for a write. Unlike the P19 GETs on the same path prefix there is **no public/optional-identity fallback**: the route is `require_user` with a tenant-scoped lookup, so an anonymous caller gets **401** and a missing *or* cross-tenant id is an indistinguishable **404** (404-never-403 — reading a public document never implies deleting it). The frozen `/api/*` contract is untouched, and `server/main.py` was not modified. See *Member document delete (P21)* below.

**As of P23 a document can be re-published as its next version, and its history is readable on both planes — all additive.** `POST /api/documents` gains two optional inputs, `new_version` (bool, default `false`) and `rel_path` (string), and its 201 body gains three always-present keys — `version`, `previous_version`, `archived_path`. A versioned write **keeps the target's `rel_path`** (so `id`, `url`, graph edges and `related` links never move) and archives the body it replaces; `overwrite: true` keeps its status and every existing key but **now archives instead of destroying**. Five new **unmetered** read routes expose the history: `GET /api/documents/by-path/{rel_path}/versions` + `.../versions/{version}` on the agent plane, and `GET /app/documents/{id}/versions`, `.../versions/{version}`, `.../versions/{version}/raw` on the web plane (optional-identity, 404-never-403). Every document read projection already carried the new `documents.version` field. **No existing field's type, status, or route changed** (the 201 gained keys, additively — the P16 `format` precedent); an **unversioned document answers an empty history rather than a 404**, and a corpus that is never re-published behaves exactly as pre-P23. See *Versioned publishing + version history (P23)* below.

**As of P24 the write response no longer waits on the network — publishing moved *behind* the 201, and one additive key describes it.** `POST /api/documents` (and both `DELETE /api/documents/*` routes) used to run two unbounded network stages **between the durable save and the response**: the publish push (`git fetch` → `rebase` → `git push`, two SSH round-trips to GitHub, with no subprocess timeout at all) and the Gemini embed. A client with a short deadline — the shipped `/explain` skill posted with `curl --max-time 5` — therefore saw a transport failure for a write that had **already landed**. Both stages now run on an after-response publish worker, so the pre-response path is entirely local (validate → archive → file write → Recent/landing → DB commit → local `git add`/`git commit`) and the 201's latency no longer depends on GitHub or Gemini. The contract change is **additive**: a new always-present **`push_pending: bool`** ("a push to `origin/main` was queued and runs right after this response") on the 201 and both DELETE 200s. Three consequences for consumers, none of which removes or retypes a field: **`pushed` is now always `false`** when a push was deferred (its documented meaning — "saved; publishes on the next successful push" — is unchanged, and it was never a failure signal), **`push_error` no longer appears in any response** (a failed background push is logged in the container, not returned), and **`commit_sha` is the local, pre-rebase commit** rather than the published head. **A client must never read `pushed:false` as a failure and must never retry on it.** See *Commit/push semantics* and *Operational semantics the client relies on* below.

**As of P25 a tenant has a public org slug, documents are addressable by it, and every detail read says what a document's pretty URL is — all additive.** The canonical tenant shape (`POST /auth/signup`, `POST /auth/login`, `GET /auth/me`, `GET /app/tenant`) gains an additive nullable **`slug`**, and a new session-guarded **`PATCH /app/tenant`** claims it (422 malformed/reserved, 409 taken). A new optional-identity read route **`GET /app/orgs/{org}/{project}/{slug}`** resolves a document by (org slug, project, doc slug) with the same trust semantics and the same 404-never-403 rule as the P19 anonymous reads. Both **detail** reads (`GET /app/documents/{id}` and the resolver) gain an additive nullable **`canonical_path`** — `/@{org}/{project}/{doc-slug}` — which is `null` for a slug-less owner, in legacy mode, **and for a document whose dateless pretty path resolves to a newer duplicate** (the round-trip rule: *a non-null `canonical_path` always resolves back to the document that advertised it*). `GET /app/graph`'s `org=` selector now accepts an **org slug or a tenant UUID** and its response gains the same additive nullable `canonical_path` (`/@{org}/graph`). The `POST /api/documents` 201 **`url`** becomes pretty when the writing tenant has a slug and the path round-trips. No existing field's name, type, status, or route changed. See *Pretty share URLs: org slug, slug resolver, and `canonical_path` (P25)* below.

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
- The `by-path` route is declared before the `{id:int}` route so a path never binds to the id route. **(P23)** the two `by-path/.../versions…` routes are declared before *both*, since `{rel_path:path}` is greedy.
- **(P23) every document read on both planes carries `version`** (the projectors drop only `tags_text`/`raw_html`/`tenant_id`), so a client can show "v3" without a second call. `markdown` on an html doc is still the extracted plain text; `raw_html` still never appears here.

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
- Output: `{deleted, id, rel_path, title, project, slug, recent_removed, versions_removed, committed, commit_sha, pushed, push_pending, commit_error?}`. `recent_removed` is `false` (idempotent) when the index or bullet was already gone. **(P23)** `versions_removed` reports whether the document had an on-disk version archive to delete — **deleting a document deletes its whole history**, staged in the same scoped commit; the `/app` delete still answers 204 with an empty body. **(P24)** `push_pending` is additive and always present; `push_error` no longer appears (see below).
- **DELETE pushes too (P8)**, under the same `KB_GIT_PUSH` flag and the same best-effort semantics as POST — parity for the reverse path, so a deletion on the hosted box removes the doc from the live self-hosted site (fresh-on-write) and, via the push, from the off-box backup. **(P24)** that push, like POST's, runs **after** the response on the publish worker; the delete's own file/DB/commit work is still fully in-request under `WRITE_LOCK`.

### POST /api/documents

The API-owned write path — one call creates the convention file, the Recent bullet, the DB row, and the scoped git commit.

- Required: `title`; `markdown` (body **without** frontmatter, starting at the H1); `project` (`^[A-Za-z0-9][A-Za-z0-9._-]*$`, no `..`/`/`); `tags` (2–5, each `^[a-z0-9]+(-[a-z0-9]+)*$`); `source_repo`.
- Optional: `date` (default today, KST), `slug` (default `slugify(title)`), `related` (added P4 — list of rel_paths, default `[]`; shape-validated only, dead links tolerated, a self-reference is dropped silently), `overwrite` (default false), `commit` (default true), `co_authored_by`, **`new_version`** (added P23, default false) and **`rel_path`** (added P23, default null — the version target).
- **`source_repo` is sanitized at write time** (added P4): a local filesystem path collapses to its basename (`/home/<user>/projects/changple5` → `changple5`), a URL passes through unchanged. The stored file, DB row, and API output are always publish-safe, without any skill change.
- Success: **201** `{id, rel_path, url, title, project, slug, date, tags, related, format, version, previous_version, archived_path, recent_updated, landing_created, committed, commit_sha, pushed, push_pending}` (+ optional `commit_error`) — `format` added P16, the three version keys added P23, `push_pending` added P24 (and `push_error` retired with it) (`previous_version`/`archived_path` are `null` on a plain create). **`url` is mode-aware (P19):** tenant mode → `<KB_PUBLIC_BASE_URL>/documents/<id>` (the direct doc page, shareable when public); legacy/single-tenant mode → `<KB_PUBLIC_BASE_URL>/<project>/<date>-<slug>/` (the mkdocs shape). The key/type are unchanged.
- **Auto-landing side effect (P7 / F1):** inside `WRITE_LOCK`, right after writing the doc file, the write path calls `ensure_project_landing(docs_root, project)` — if `docs/<project>/index.md` is **absent** (the first doc of a new project), it writes a minimal landing (H1 = project name + one line, **no frontmatter** so it stays a non-doc) and the response carries `landing_created:true`; the scoped commit then stages a **third** path (`docs/<project>/index.md`) alongside the doc + `docs/index.md`. An existing landing (hand-written or previously auto-created) is **never overwritten** → `landing_created:false`, two-path commit as before. This keeps every project satisfying the per-project `site/<project>/index.html` deploy-gate invariant (mkdocs `navigation.indexes` does not synthesize one). The `/knowledge:explain` skill's file-fallback branch performs the same ensure-landing when the API is unreachable.
- `KB_PUBLIC_BASE_URL` note (P7): its default `http://localhost:8765` is correct for a default-port local viewer, so the scaffold's `compose.yml` deliberately leaves it unset (see security/decisions). A scaffold on **advanced custom ports** would then report a default-port `url` in the 201 body — a cosmetic mismatch in one informational field only (the write, site build, and viewer are all correct); set `KB_PUBLIC_BASE_URL` to the chosen viewer origin if custom ports are used.
- **Versioned re-publish (P23).** `new_version: true` republishes an **existing** document as its next version: the target is the explicit `rel_path` when given, else the **newest** document matching `(project, slug)` for the tenant (`date DESC, id DESC`). The current body is archived, the new body is written at the **same `rel_path`** — so `id`, `url`, `rel_path`, graph edges and inbound `related` links all stay put, and the target's original `date`/`slug` win over the request's (the response echoes the target's). **No target found ⇒ an ordinary v1 create**, never a 404, so an agent needs no lookup dance. A resolved target with a different `format` or `project` is a **422** (publish it as a new document instead) — identity is immutable across a version chain. Response: `version` = what was published, `previous_version` + `archived_path` = the body it superseded.
- **`overwrite: true` now archives the body it replaces (P23)** and bumps the version too (it archives v`N` and publishes v`N+1`, sharing one chain with `new_version`). Status and every pre-P23 response key are unchanged; the legacy destructive path simply stops losing data. Use `overwrite` to *replace*, `new_version` to *supersede*.
- **409** when `rel_path` already exists on disk **or** in the DB and `overwrite` is false — the body names the existing doc: `{message, rel_path, id, existing_title}`. **(P23)** the detail additionally carries `version` + a `hint` naming the versioned retry **when an existing DB row backs the conflict** (a disk-only conflict is not versionable and gets no hint); the four pre-P23 keys are untouched, so the CLI's 409 explainer is unaffected. A `new_version` write that **resolved** a target never reaches this branch; one whose resolution missed still can.
- **422** on any convention validation error (project/tags/slug/date/frontmatter/`related` shape).
- Commit semantics: the scoped commit is **local and in-request** (fast — no network), and a **failed commit never rolls back** the file/DB → still **201** with `committed:false` + `commit_error`. A deliberate skip (`commit:false` in the request, or `KB_GIT_COMMIT=false`) → `committed:false`, **no** `commit_error`. `commit_sha` is `null` in both non-committed cases.
- **Publish-on-write (P8), `KB_GIT_PUSH` — default false.** When enabled (the hosted box only), the scoped commit is published to `origin/main`: `git fetch origin main` → rebase onto `origin/main` → non-force `git push origin HEAD:main`. **Never `--force`, never `git add -A`** — the box only ever lands its own new-file + Recent-bullet commit on top of the latest remote, so it can never clobber or revert operator work. A rebase conflict aborts cleanly, keeping the local commit.
- **(P24) That push runs *after* the response, not inside the request.** It is queued on a single process-wide FIFO publish worker (`server/publish.py`) and re-takes `WRITE_LOCK` there — so it still never races another write's tree mutation, but it no longer spends the caller's timeout budget. The same is true of the **Gemini embed**, which also moved behind the response. Every git subprocess is bounded by **`KB_GIT_TIMEOUT_S` (default 60 s)**, so a hung SSH round-trip can neither wedge the worker nor hold the write lock forever.
- **Push failure semantics (best-effort, never a 5xx) — but no longer reported in-band.** The response always carries `pushed: bool` and, since P24, `push_pending: bool`. `push_pending:true` means a push was queued and starts right after this response; `pushed` is then **`false`**, because at the moment the body is written the push has not run. **`push_error` no longer exists in any response** — the response is long gone before the push can fail — and a failed background push surfaces **only** as a `[kb-api] publish: push <rel_path> FAILED: …` line in the container log. A `pushed:false` write still **succeeded**: the doc is written + committed locally and publishes on the **next** successful push. **`commit_sha` is now the local, pre-rebase commit** on every path (the rebase happens after the response, so the API can no longer report the published head); to assert what is actually published, read git state on the box rather than the response (see **operations**).
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

P12's authenticated web app consumes five additive, `require_user`-guarded, tenant-scoped control-plane reads (in `server/{dashboard,documents,graph}_api.py`, mounted after `usage_api`). All are **unmetered** — none sets `request.state.usage` or calls `record_event`, so web-UI browsing/search/graph never appear in the billable `searches` metric (the paid retriever is P15). The frozen `/api/*` contract is untouched. These are consumed by the Next.js BFF **server-to-server** (the browser never calls them directly — see architecture/security); they add no CORS. (P12's five routes are all reads; as of P21 the plane is no longer read-only — see *Member document delete (P21)* below — but it stays unmetered, writes included.)

- **`GET /app/dashboard`** (`days=30`, `1..365`) → `{projects:[{id,name,created_at,documents,keys,last_used_at}], activity:[{type,at,project_name,credential_name}]}`. A one-round-trip rollup: `documents` = `documents_created` over the window; `keys` = non-revoked credential count; `last_used_at` = max across the project's credentials; `activity` = real lifecycle events (`project_created`/`key_minted`/`key_revoked`), newest-first, capped 8.
- **`GET /app/documents`** (`project?:UUID`, `tag?`, `limit=50 ≤200`, `offset=0`) → `{total, items}` newest-first · **`GET /app/documents/{id:int}`** → the doc **with** `markdown` (404 missing/cross-tenant) · **`GET /app/search`** (`q` required, `project?:UUID`, `tag?`, `limit=10 ≤50`, `offset=0`) → `{query, mode, total, limit, offset, results}` (`SearchQueryError → 400`). These reuse the store/search as-is scoped by `tenant_id`; the `/app` projector drops `tags_text` + `tenant_id` (and `markdown` on the list), keeping `related`. A supplied `project` UUID is resolved to the content-plane project **name** (documents key off name) via a tenant-scoped bridge — **404 on missing/cross-tenant**.
- **`GET /app/graph`** (optional `project?:UUID`) → `{version, projects, nodes, edges}` (+ a `truncated` flag; `MAX_DOC_NODES = 2000`). A **server-side twin** of `scripts/graph_hook.py`'s inversion over `db.list_documents(tenant_id=…)` — nodes keyed on `rel_path`, related/tag edges (deduped, ghost/broken on dead targets), `degree`, the `(-docs, name)` project order — with the one substitution that each doc node's `url` = `/documents/{db_id}` (the read route). `scripts/graph_hook.py` is untouched (it stays server-free — tenant #1's public mkdocs surface).

## Public contract widened + `/auth` throttle (P13)

P13 shipped a standalone `knowledge` CLI whose onboarding half (signup → login → project → `vk_`) speaks to `/auth/*` + `/app/*`. Those planes existed in code from P10 but **404-ed into the mkdocs catch-all at the edge** — so the CLI's first half was unreachable on the hosted host. P13 routes them at the edge and throttles the newly-public grant. What the consumer now sees:

- **Widened public surface: `/api/* + /auth/* + /app/* + /healthz`.** The `/auth/*` session grant and the `/app/*` tenant/project/credential (+ usage) surfaces are now edge-routed to the API. Their shapes are the P10/P11 contracts documented under *Multi-tenant surfaces* and *Usage read API* above — P13 added **no** new route or field there, only edge routing. The `vk_` minted at `POST /app/projects/{id}/credentials` is what the CLI writes into `api.token`, and it authenticates `/api/*` exactly as before.
- **New status on the public auth surface: `429`.** `POST /auth/signup` and `POST /auth/login` return **`429`** with a `Retry-After` header and a generic body `{"detail":"too many requests — please retry later"}` when a per-IP fixed window is exceeded (server-side, in-process, per-`(IP, route)`, default 20/15 min, `KB_AUTH_RATE_LIMIT`/`KB_AUTH_RATE_WINDOW_S`-tunable — see security/operations). The throttle runs **before** the credential check and keys off IP only, so the enumeration-safe generic `401` (unknown-email and wrong-password stay byte-identical) is **preserved through it**. Signup and login have independent buckets.
- **Two `/api/*` response-shape facts the CLI surfaced (unchanged contract, load-bearing to a consumer).** These are pre-existing behaviors P13's `save`/`search`/`list`/`projects` commands depend on, worth stating where a client codes against them: `GET /api/documents` answers `{total, items}` while `GET /api/search` answers `{total, results}` — the two list shapes differ by key. And `GET /api/projects` is a **GROUP BY over documents**, not a project registry: a just-created project (or a `vk_`-bound project with zero documents) is **absent** from it until its first save, and a document written under a *different* free-form `project` name than the key's bound project appears under that name (the write's `body.project` runs `validate_project()` as a convention check only — it is **never** checked against the `vk_`'s bound project, `main.py:396`). The CLI defaults `save`'s project to the git repo basename to partition the corpus identically to `/knowledge:explain`, but the server does not enforce it.

## Agent-facing MCP retrieval service: tool contract v1 (P15)

P15 adds a **new agent-facing surface** — an MCP (Model Context Protocol) server over HTTP — that turns knowledge retrieval into a tool any AI agent can call ("search as a service"). It is a **separate process** (`mcp-server/`, not part of `server/`), a **thin proxy** over the frozen `GET /api/search` + single-document reads; it reimplements no retrieval and **never modifies `/api/*`**. The full pinnable spec lives in-repo at `mcp-server/CONTRACT.md`; this section is the durable summary. The first consumer is hi2vi's OpenClaw CS bot (`mcp.servers.knowledge`, hi2vi P18.S5).

- **Transport & endpoint.** MCP over **Streamable-HTTP** (the official `modelcontextprotocol` transport — *not* the deprecated HTTP+SSE), built with the Python `mcp` SDK (FastMCP, pinned `mcp==1.28.1`). One endpoint: **`POST /mcp`** (responses are JSON or an SSE stream the transport negotiates). The **deployed** server runs **stateless** (`MCP_STATELESS_HTTP=1`) — both tools are pure per-call proxies, so no session affinity is needed. Liveness is an internal-only `GET /healthz` → `{"status":"ok","service":"knowledge","contract_version":"1"}`; the public routed-liveness signal is a bare `GET /mcp` → **406** with a JSON-RPC body (a routed MCP response, distinct from a gateway 5xx).
- **Dual reachability.** Internal `http://knowledge-mcp:9000/mcp` (a co-tenant agent on `changple_shared_network`, no edge hop) **and** public `https://knowledge.hi2vi.com/mcp` (off-box / local-dev agents). Both serve the identical two-tool surface (deploy mechanics in **operations**).
- **Auth = forward-the-bearer.** Send `Authorization: Bearer <key>` (a project `vk_…` key). The **`initialize` handshake needs no bearer**; **tool calls require it**, and it is forwarded **verbatim** upstream to `/api/*`, where the existing tenant resolver (`server/api_auth.py`) scopes the corpus. **No auth logic lives in the MCP service.** (SDK client note: in `mcp==1.28.1` the transport's `headers=`/`auth=` params are deprecated + ignored — set the bearer on the underlying `httpx.AsyncClient` via `streamablehttp_client`'s `httpx_client_factory` with a factory that *merges* the header; a `partial(create_mcp_http_client, headers=…)` silently drops it. See `CONTRACT.md` + `mcp-server/scripts/e2e_smoke.py`.)
- **Tool `search(query, project?, limit=5)`** → `{query, total, results[]}`, each hit `{title, snippet, url, id, rel_path}`. `snippet` has FTS `<mark>…</mark>` tags **stripped** (agents consume plain text); `limit` is **clamped 1–20** before forwarding; `project` optionally narrows to one project within the caller's tenant. Errors (returned as MCP tool errors): `unauthorized: missing/invalid bearer` (401 upstream), `bad search query: <detail>` (400 upstream), otherwise generic.
- **Tool `fetch_document(id? | rel_path?)`** → the full document: `{id, rel_path, title, project, date, tags, url, markdown, truncated, total_chars}`. Provide **exactly one** of `id`/`rel_path` (**XOR** — both/neither → a tool error *before* any upstream call). `markdown` is **character-capped** (default 20000, `MCP_FETCH_MAX_CHARS`); over the cap it is the first N chars + a `…[truncated: showing N of TOTAL characters]` marker, `truncated:true`, and `total_chars` = the **full** length (so the agent knows there is more and can narrow via `search`). Errors: `not found` (404 — a missing **or** cross-tenant id/path both 404, existence never leaks), `unauthorized` (401), otherwise generic. Proxies the frozen `GET /api/documents/{id}` + `GET /api/documents/by-path/{rel_path}`.
- **`url` is reserved-empty (deferred D13).** For the **whole current corpus** every hit's / `fetch`'s `url` is `""` — no document carries a public citation origin yet. **Treat empty `url` as "no citation link," not an error.** A future `source_url` data-model + ingester job (deferred **D13**) populates it; that is additive and stays contract v1.
- **Corpus scoping = tenant-wide per `vk_`.** A `vk_` resolves to a **tenant**, and search/fetch scope to the **whole tenant's** corpus (upstream filters by `tenant_id`, not the key's bound project). So **one hi2vi `vk_` key covers both the `hi2vi` and `hi2vi_web` knowledge projects** — no two-key scheme; the `search` `project` param optionally narrows. Final key provisioning is coordinated with hi2vi P18.S5 on the operator side.
- **Versioning — contract v1, additive-only.** `CONTRACT_VERSION = "1"`, surfaced at the service's `GET /healthz` as `contract_version`. **Non-breaking (stays v1):** a new tool, a new optional param, a new output field (e.g. `url` becoming populated). **Breaking (bumps the version):** removing/renaming a tool or field, changing a type, or changing the auth model. This `contract_version` is **distinct from** MCP `serverInfo.version` (= the `mcp` SDK release `1.28.1`).

## HTML explainer document type (P16)

P16 makes a standalone, self-contained interactive HTML explainer a first-class KB document format, added **additively** to the write path, the read projections, and the MCP tool — the frozen `/api/*` consumer contract and MCP contract v1 are untouched.

- **Write — `POST /api/documents` gains `format`.** Optional `format: "md" | "html"` (a pydantic `Literal`, default `"md"`; a bad value → a free **422**). The document body still arrives in the existing **`markdown`** field — for `format:"html"` it carries the raw self-contained HTML (`<!DOCTYPE html>…` with inline CSS/JS). No mutually-exclusive second body field. The `.html` doc's `rel_path` is `<project>/<date>-<slug>.html`. Existing markdown callers are unchanged (the default keeps the request byte-identical).
- **Read projections gain `format`, hide `raw_html`.** `/api/documents/{id}`, `/api/documents/by-path/{rel_path}`, `GET /app/documents`, and `GET /app/documents/{id}` each carry an additive `format` field. The raw HTML is stored in an internal **`raw_html` column that is dropped from every JSON body** (added to the response projectors' drop-sets) — agents and the read API never receive `<script>`/`<style>` markup, only the extracted text in `markdown` for html docs.
- **New route — `GET /app/documents/{doc_id}/raw`.** Session-guarded (`require_user`) and tenant-scoped; serves the raw HTML (the on-disk body **without** its comment-frontmatter, starting at `<!DOCTYPE html>`) as `media_type="text/html; charset=utf-8"` with exactly four headers: `Content-Security-Policy: sandbox allow-scripts; frame-ancestors 'self'`, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`. **404** for a missing / cross-tenant / non-html / empty-`raw_html` doc (existence never leaks). Unmetered. It is a NEW route — no existing route changed. The web BFF relays it (see **frontend**); the sandbox/XSS-containment stance is in **architecture**.
- **MCP `fetch_document` gains `format`.** The tool output carries an additive `format` (`"md" | "html"`), relayed verbatim from the upstream single-doc read (an older upstream omitting the key defaults to `"md"`). For an html doc, `markdown` is the **server-extracted readable text** — contract-v1 meaning preserved — and the character-cap truncation applies to it unchanged. The MCP tool contract stays **v1** (a new output field is additive; no `CONTRACT_VERSION` bump); `mcp-server/CONTRACT.md` was updated in-source.
- **Search over html docs.** FTS5 / `snippet()` / embeddings run over the DB `markdown` column, which for an html doc holds the **extracted text** — so html explainers are searchable by their visible content and **never** by `<script>`/`<style>` text (verified at the P16 review E2E). See **data**/**backend** for the extraction + storage shape.

## Org-level credentials + get-or-create projects (P18)

P18 adds org-level `vk_` keys and get-or-create projects to the control plane — additive to the frozen `/api/* + /auth/* + /app/*` contract (no existing field/type/status/route changed; verified at the P18 review).

- **`POST /auth/signup` gains an additive `project`.** The response is now `{token, user, tenant, project}` (`project` = `{id, name, tenant_id, created_at}`, the auto-provisioned `"default"` project) — additive on the frozen `/auth/*` grant. Signup provisions a `"default"` org **and** `"default"` project atomically (see backend).
- **Org-level credential endpoints (additive on `/app/*`, all `require_user`-guarded, scoped to the caller's org/tenant):**
  - `POST /app/credentials` → **201** `{credential, key}` — mints an **org-level** `vk_` (`project_id NULL`); the raw key is shown once. Authorizes every project in the org.
  - `GET /app/credentials` → `{credentials:[...]}` — org-level keys only (includes revoked), oldest-first.
  - `DELETE /app/credentials/{credential_id}` → **204** (idempotent soft-revoke); **404** unless the id is one of the caller's own org-level credentials (same anti-probe as the per-project delete).
  - These sit **alongside** the unchanged per-project `POST|GET /app/projects/{id}/credentials` + `DELETE …/credentials/{cid}` — both key kinds work.
- **`serialize_credential.project_id` is now nullable** — `null` for an org key, the UUID string for a project-bound key (the shared serializer `usage_api` also imports; backward-compatible for project-bound rows).
- **`POST /app/projects` is now get-or-create** — a duplicate name returns the existing row (**201**, same shape) instead of the 500 the new `UNIQUE(tenant_id, name)` would otherwise cause.
- **`POST /api/documents` gains a get-or-create side effect** — an unregistered `body.project` now leaves a `projects` registry row (so a saved-to name always appears in `/app/projects`). The write's `body.project` is still a free-form convention check only, **never** matched against the credential (enforcement is tenant-wide). The frozen 201 consumer contract is otherwise unchanged.
- **Resolver.** In tenant mode an **org key** (`project_id NULL`) resolves to its `tenant_id` with no bound project; a **project-bound** key keeps its existence guard + `project_id`. A **revoked** org key resolves to nothing → **401**, same as a project-bound one.

## Public projects + anonymous read surface (P19)

P19 adds per-project visibility and the product's first anonymous read path. All changes are additive to the frozen `/api/* + /auth/* + /app/*` contract (verified at the P19 review): new fields, one new route, one new query param, and a mode-aware value on the existing `url` key — no existing field/type/status/route changed.

- **`visibility` field on projects.** `serialize_project` gains `"visibility"` (`"private"` | `"public"`), so it appears on `GET /app/projects`, `GET /app/projects/{id}`, the `POST /auth/signup` response's `project`, and the `GET /app/dashboard` projects rollup rows. New projects (including implicitly get-or-created ones) default `"private"`.
- **New route — `PATCH /app/projects/{project_id}`.** Session-only (`require_user`), body `{"visibility": "private" | "public"}` (a pydantic `Literal` → **422** on any other value). Reuses `_load_scoped_project` → **404** for both a missing **and** a cross-tenant project (existence never leaks). Returns `{"project": <serialized project>}` with the new visibility. This is the first PATCH route in the codebase.
- **`GET /app/documents/{id}` + `GET /app/documents/{id}/raw` become optional-identity.** Both switched from `require_user` to an **optional-identity** dependency (`optional_user` — returns a member context for a resolvable session/bearer, else anonymous). A resolved member reads their own tenant's doc exactly as before (byte-preserved); an anonymous **or cross-org** caller reads it only when the doc's project is `visibility == "public"`. The `/raw` route keeps the exact P16 sandbox headers (`Content-Security-Policy: sandbox allow-scripts; frame-ancestors 'self'`, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`). A missing id, another tenant's **private** id, a nonexistent id, a non-html doc (raw), and a legacy-mode call are **all indistinguishable 404s** (404-never-403). The two `unauth → 401` assertions that codified the old contract on these exact routes moved to **404** accordingly; `/app/documents` (list) and `/app/search` stay session-only (still 401 unauth).
- **`GET /app/graph` gains `org={tenant_uuid}`.** The bare call (no `org`) is unchanged — a member sees their whole corpus, an anonymous bare call still **401**s. `org` = the caller's own tenant → identical to the bare member call. `org` = another tenant (or anonymous) → the **public view**: only that org's `public`-visibility projects' nodes/edges/tag-hubs. An org with **no** public projects — which also covers a nonexistent org — answers **404** `{"detail":"graph not found"}` (no existence leak); legacy mode (`DATABASE_URL` unset) also 404s. The `project` narrowing param is ignored on the public path; the response shape is unchanged and carries no org echo. (The member's own org UUID for the web to build `?org=` is the tenant id from `/auth/me`.)
- **`POST /api/documents` 201 `url` is now mode-aware.** Built at the single site keyed on the resolved context's `tenant_id` (never `is_public`): **tenant mode** → `{KB_PUBLIC_BASE_URL}/documents/{id}` (the direct doc page — on prod `KB_PUBLIC_BASE_URL` is the app origin, so this resolves 200 for a public project and is shareable); **legacy/single-tenant mode** → the unchanged mkdocs `{project}/{date}-{slug}/`. The 201 key set is unchanged (the value of the always-present `url` key changed, not the key/type/status), so the frozen contract holds additively — the examples in *Frozen consumer contract* below are updated to the tenant-mode shape.
- **The Postgres→SQLite visibility bridge** backing these reads is a backend concern — see **backend**/**security** for the per-read resolution and its fail-closed guarantees.

## Member document delete (P21): `DELETE /app/documents/{doc_id}`

P21 adds the first mutating route on the `/app` plane. It is additive — no existing field, type, status, or route changed, and `server/main.py` is untouched (verified at the P21 review).

- **`DELETE /app/documents/{doc_id:int}`** (`server/documents_api.py`) — `require_user`, tenant-scoped, **unmetered**. Success is **204 No Content** with an empty body: `_delete_document`'s result dict (`commit_sha`, `pushed`, `recent_removed`, …) is machine-plane reporting the UI has no use for. Statuses: **204** success · **401** no/invalid session (generic `{"detail":"Unauthorized"}`) · **404** `{"detail":"no document with id <id>"}` for a missing id **and** for another tenant's id, indistinguishable by design · **422** a non-integer path param. Nothing else — a failed git commit/push inside the helper is swallowed and still answers **204**.
- **No public fallback — deliberately unlike the P19 GETs on the same prefix.** `GET /app/documents/{id}` and `.../raw` are optional-identity (an anonymous or cross-org caller may read a *public* project's doc); the DELETE is **not**. It is `require_user` plus `db.get_document(..., tenant_id=<caller's tenant>)`, so a member who can *read* another org's public document still gets a plain 404 when they try to delete it. Reading never implies deleting.
- **Unmetered, and that is the point.** The handler never sets `request.state.usage`, so no `EVENT_DOCUMENT_DELETED` is recorded — in contrast to `DELETE /api/documents/{doc_id}` and `.../by-path/{rel_path}`, which do. The web plane could technically have called the metered `/api` route with a session bearer (`resolve_api_write` accepts one) and shipped zero backend code; that was rejected because it would bill a UI click as an agent event and route the web app through the machine plane's auth resolver. Reusing the *logic* instead keeps both planes' trust boundaries intact.
- **Identical delete semantics to the `/api` plane**, because it is the same helper: file unlink from the caller's content root, the public Recent-index bullet, the DB row (FTS row via the AFTER DELETE trigger, embeddings via `ON DELETE CASCADE`), then the scoped git commit/push for the public root. It inherits the same **non-transactional ordering** — the file goes first, and a failed commit never restores it — and the same **hard, no-undo, not-idempotent** behavior: a repeat delete of the same id answers 404, not 204.
- **Session → API context bridge.** `/app` handlers hold an `AuthContext(user, tenant)`; the helper wants an `ApiAuthContext`. The bridge carries the caller's tenant **as a `UUID`** (not a string), `project_id`/`credential_id` `None` (a session has neither), and `is_public` by `resolve_api_write`'s own rule — tenant #1 is the public `docs/` root, every other tenant its namespaced `tenants/<uuid>/` one. That flag decides which root the file is unlinked from and whether the Recent index and git commit run, so it is resolved (an `await`) before the worker thread starts. See **backend** for the threading/import mechanics.

## Versioned publishing + version history (P23)

P23 makes re-publishing additive and exposes a document's superseded bodies on both planes. Everything is additive (verified at the P23 review): two optional request fields, three new always-present 201 keys, five new routes, and two new keys inside the existing 409 detail. No existing field's name, type or status changed and no route moved.

**Write — `POST /api/documents`** (see *POST /api/documents* above for the full field list): `new_version: bool = false` + `rel_path: string | null` in, `version` / `previous_version` / `archived_path` out; `overwrite: true` archives instead of destroying; the 409 detail gains `version` + `hint` when a DB row backs the conflict; a resolved target with a mismatched `format` or `project` is a 422.

**Read — the shared envelope.** Both planes answer the same shape, with the same field names:

```json
{
  "rel_path": "hi2vi/2026-07-14-growth-loops.md",
  "current_version": 3,
  "total": 2,
  "versions": [
    {"rel_path": "hi2vi/2026-07-14-growth-loops.md", "version": 2,
     "archive_path": ".versions/hi2vi/2026-07-14-growth-loops/v0002.md",
     "title": "Content Idea: Growth Loops", "date": "2026-07-14",
     "tags": ["growth", "loops"], "format": "md",
     "created_at": "2026-08-01T10:22:04+09:00"}
  ]
}
```

- `versions` lists **superseded bodies only**, newest first (`version DESC`); `current_version` (from `documents.version`) is what completes the chain — the full history is "`current_version` + the listed archives". **The current version is deliberately not addressable as a version**: `…/versions/<current>` is a plain 404 on both planes, because the current body *is* the document read. A UI should render "current" from the document it already holds.
- **An unversioned document answers `current_version: 1, total: 0, versions: []` — never a 404**, so one call is enough to render "no history".
- Index rows carry **no bodies**. `id` and `tenant_id` never leave either plane (`document_versions.id` is an autoincrement on a table reindex rebuilds — nothing may key off it).
- **`created_at` on a version row is when the body was archived**, not when it was authored. Label it "Superseded", not "Created".
- All five routes are **unmetered** — no new usage event type exists, and browsing history never moves a counter.

**`/api` (agent plane, `resolve_api_read` + tenant filter):**

- **`GET /api/documents/by-path/{rel_path:path}/versions`** → the envelope. **404** when the current document is missing or another tenant's.
- **`GET /api/documents/by-path/{rel_path:path}/versions/{version}`** → the row **plus `markdown`**, plus **`raw_html` when `format == "html"`**. This is the **one documented exception** to "`raw_html` never leaves `/api` JSON": a superseded explainer body is otherwise unreadable by an agent, since `.versions/` is never served and no other route exposes it. The *current* raw HTML is still reachable only through the sandboxed `/app` route. **404** for an unknown document *or* version (including the current one).
- Both are declared **before** the bare `GET /api/documents/by-path/{rel_path}` — `{rel_path:path}` is greedy and Starlette matches in declaration order, so any future by-path suffix route must be declared above it too.

**`/app` (web plane, optional-identity — member **or** public-project anonymous, every miss an indistinguishable 404, never a 403):**

- **`GET /app/documents/{doc_id}/versions`** → the same envelope; rows drop `raw_html` and `markdown`.
- **`GET /app/documents/{doc_id}/versions/{version}`** → the row **with `markdown`**, **never `raw_html`** (this plane's raw bytes leave only through a `/raw` route).
- **`GET /app/documents/{doc_id}/versions/{version}/raw`** → the archived HTML body as `text/html; charset=utf-8` with the same four sandbox headers as `GET /app/documents/{id}/raw` (`Content-Security-Policy: sandbox allow-scripts; frame-ancestors 'self'`, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`) — a superseded explainer is exactly as untrusted as a live one. Missing doc / missing version / non-html version / empty body all answer the same 404.
- Each route resolves the **document** first (member fast-path → public-project fallback) and then reads the archive by that document's `rel_path`, scoped to the **owning** document's `tenant_id` — not the caller's. That is what makes a public document's history anonymously readable without ever crossing tenants.

**Not in P23** (deliberate): version diffing, a rollback/"make v2 current again" endpoint, version pruning, and a CLI `--new-version` flag. The CLI keeps working untouched because `overwrite` retains its response shape.

## Pretty share URLs: org slug, slug resolver, and `canonical_path` (P25)

P25 gives a tenant a durable public identity and makes public documents and the public graph addressable by it. Everything is additive to the frozen `/api/* + /auth/* + /app/*` contract: two new fields, two new routes, one widened query param, and a value change on the always-present 201 `url`.

**The org slug (`tenants.slug`).**

- **Additive nullable `slug` on the canonical tenant shape.** `serialize_tenant` (`server/auth_api.py`) emits `"slug"`, so it appears at once on `POST /auth/signup`, `POST /auth/login`, `GET /auth/me` and `GET /app/tenant`. `null` = "no pretty URL yet"; there is **no backfill and no derived default**.
- **New route — `PATCH /app/tenant`.** Session-guarded (`require_user`), **no tenant id in the path** (implicitly the caller's own tenant), body `{"slug": "..."}`. **200** `{tenant}` with the new slug · **422** malformed **or reserved**, the message citing the constraint · **409** already taken (the `UNIQUE` violation is mapped, never a 500). Re-setting a tenant's own current slug is a **no-op success**, not a conflict.
- **Rules, in one place** (`server/accounts/slugs.py`, re-exported from `server.accounts`): charset `^[a-z0-9]+(-[a-z0-9]+)*$`, 2–40 chars, **lowercased on write** (so `Hi2Vi` and `hi2vi` are the same slug and collide), plus a 38-word reserved list (`api`, `app`, `auth`, `admin`, `login`, `dashboard`, `documents`, `graph`, `projects`, `search`, `settings`, `_next`, `docs`, … ). Validation is **app-layer**, matching the `projects.visibility` precedent — there is no DB `CHECK`. Never re-derive the charset elsewhere; import the module.

**New route — `GET /app/orgs/{org}/{project}/{slug}`** (the resolver).

- **Optional-identity**, exactly like the P19 detail reads: member fast-path → legacy-mode guard → the owning project's `visibility == "public"` gate (the extracted `_is_publicly_readable` predicate, shared with `GET /app/documents/{id}` so there is one trust boundary, not two).
- `org` is the **bare** slug — **no `@`** (the `@` is a web-plane convention the BFF strips). `project` is matched **exactly** (case-sensitive). The doc slug resolves **newest-first** (`find_latest_document_by_slug`: `date DESC, id DESC`), i.e. the address means *"the newest document under this title"*; there is no dated form.
- **Every miss is one constant 404** — `{"detail": "no document at that path"}` — for an unknown, malformed or reserved org slug, an unknown project, an unknown doc slug, a **private** project, and legacy mode alike. Nonexistent and forbidden are indistinguishable (404-never-403). It deliberately does not reuse the id route's `f"no document with id {id}"` detail, which cannot exist on a route that never sees an id; what the rule protects is that misses on the **same** surface look alike.
- The response is the ordinary **detail projection**, so it carries `id` — which is why `/app/documents/{id}/versions*` and `.../raw` stay id-keyed and completely unchanged.

**Additive nullable `canonical_path` on the DETAIL reads.**

- Present on `GET /app/documents/{id}` and on the resolver — **not** on `GET /app/documents` list rows (injecting it into the shared projector would add a per-row Postgres lookup to every list page). A web surface that wants a pretty link from a list must fetch the detail or fall back to `/documents/{id}`.
- Value: `/@{org-slug}/{project}/{doc-slug}`. **`null`** when the owner has claimed no slug, in legacy mode, for a registry-less owner — **and when the path does not round-trip** (below).
- **The round-trip rule (P25.F1).** Because the path is dateless, only the **newest** row under a `(project, slug)` pair owns it. `GET /app/documents/{id}` emits the path only when `find_latest_document_by_slug(project, slug, owner)` returns *that same row*; a superseded duplicate answers `null` — the same `null` every slug-less tenant gets, so no consumer contract changes. The invariant to code against: **a non-null `canonical_path` always resolves back to the document that advertised it.** Duplicates are reachable in ordinary use (a re-publish **without** `new_version` computes a different `rel_path`, since the date is part of it, and inserts a second row). The **resolver's own** `canonical_path` is unconditional — it resolved *through* the slug, so it is newest-wins by construction.

**`GET /app/graph` — `org=` widened, plus its own `canonical_path`.**

- `org=` now accepts a **tenant UUID or an org slug**, parsed **UUID-first** (a canonical UUID is charset-legal as a slug) with `get_tenant_by_slug` as the fallback. Unknown, unclaimed, reserved and malformed values all collapse into the pre-existing single **404 `{"detail":"graph not found"}`** — so a **malformed `org=` now 404s where it used to 422**, deliberately: on an anonymous surface one indistinguishable 404 leaks less than a 422 confirming "not even a well-formed org identifier".
- The **member fast-path compares the resolved tenant id**, so a member addressing their own org *by slug* still gets the whole-corpus member view.
- The response gains the additive nullable **`canonical_path`** (`/@{org-slug}/graph`, `null` for a slug-less tenant and in legacy mode) alongside `truncated`. The P19 note that this response "carries no org echo" is retired — echoing the pretty path of the org the caller explicitly named leaks nothing.
- **Legacy mode still never touches the accounts plane:** the `DATABASE_URL` guard precedes any slug lookup.

**`POST /api/documents` — the 201 `url` is pretty when it can be.** In tenant mode with a claimed org slug the always-present `url` becomes `{KB_PUBLIC_BASE_URL}/@{slug}/{project}/{doc-slug}`, carrying the **same round-trip guard** — so a **backdated** publish under an existing slug falls back to `{origin}/documents/{id}`. A slug-less tenant keeps `{origin}/documents/{id}` exactly as P19 left it, and legacy/single-tenant mode keeps the unchanged mkdocs shape. On a `new_version` bump the URL uses the **target's** project/slug, so a document's pretty URL never moves across a version chain. The URL is pretty regardless of the project's **visibility** (the resolver is optional-identity, so it resolves for the author either way) — it is shareable only once the project is public, exactly like `/documents/{id}` today.

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
frozen `/api/*` consumer is untouched. **P18 upheld this verbatim:** the org-level `/app/credentials`
routes and the additive signup `project` field are new additions; `POST /app/projects` and
`POST /api/documents` gained get-or-create behavior with **no** change to any existing field, type,
status, or route, so the frozen `/api/*` consumer keeps working unchanged (re-verified live at the
P18 cutover — the extended `onboarding_smoke.py` posts the frozen 201 shape end to end). **P19 upheld
this additively:** the only `/api/*` change is the **value** of the always-present 201 `url` key,
which is now mode-aware (tenant → `{app origin}/documents/{id}`, legacy → the mkdocs shape) — the key
name, type (string), presence, and the whole 201 key set are unchanged, so an unknown-keys-ignoring
consumer is unaffected. On prod tenant #1's master bearer resolves in tenant mode (`tenant_id` set),
so its 201 `url` now names the direct doc page too (the old mkdocs link was already broken there); the
example below is the tenant-mode shape. The extended `onboarding_smoke.py` re-verified the frozen 201
key set live while asserting the `url` ends `/documents/{id}`.

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
  - `overwrite` (bool, default `false`) — **since P23 this archives the replaced
    body instead of destroying it, and bumps the version**; status and every
    pre-P23 response key are unchanged
  - `commit` (bool, default `true`)
  - `co_authored_by` (string, e.g. `"hi2vi-agent <bot@hi2vi.com>"`)
  - `new_version` (bool, default `false`, **added P23**) — re-publish an existing
    document as its next version instead of creating a new one
  - `rel_path` (string, default `null`, **added P23**) — the explicit version
    target; without it the newest `(project, slug)` match for the tenant wins, and
    no match at all is an ordinary v1 create

**201 — created** (all keys always present except the two optional error keys):

```json
{
  "id": 1,
  "rel_path": "hi2vi/2026-07-14-growth-loops.md",
  "url": "https://knowledge.hi2vi.com/documents/1",
  "title": "Content Idea: Growth Loops",
  "project": "hi2vi",
  "slug": "growth-loops",
  "date": "2026-07-14",
  "tags": ["growth", "loops"],
  "related": ["hi2vi/2026-07-10-other.md"],
  "format": "md",
  "version": 1,
  "previous_version": null,
  "archived_path": null,
  "recent_updated": true,
  "landing_created": true,
  "committed": true,
  "commit_sha": "0847f2e9ef6a4c227d35968e75c27ab6f6bf414d",
  "pushed": false,
  "push_pending": true
}
```

Field meanings:

- `id` — DB row id. `rel_path` — path under `docs/` (`<project>/<date>-<slug>.md`).
- `url` — the doc's viewer URL. **Mode-aware as of P19** (branched on the resolved credential's
  `tenant_id`, not `is_public`): **tenant mode** → `<KB_PUBLIC_BASE_URL>/documents/<id>` — the direct
  doc page in the Next app (on the box `KB_PUBLIC_BASE_URL=https://knowledge.hi2vi.com` is the app
  origin), which resolves for the saving member and is **shareable to anyone once the project is
  public**; **legacy/single-tenant mode** → the old mkdocs `<KB_PUBLIC_BASE_URL>/<project>/<date>-<slug>/`
  shape (the dormant template stack still serves mkdocs there, so legacy stays correct). Before P19
  the tenant-mode value was the mkdocs shape (broken for every non-#1 tenant, which is why the CLI hid
  it). The `url` key/type/presence are unchanged — only the value moved (additive-only).
- `format` — **P16 addition.** `"md" | "html"`.
- `version` / `previous_version` / `archived_path` — **P23 additions**, always
  present. `version` is what this write published; `previous_version` and
  `archived_path` describe the body it superseded (both `null` on a plain create).
  On a version bump the `date`, `slug` and `rel_path` above are the **target's**,
  not the request's — the document's path never moves.
- `recent_updated` — whether the `docs/index.md` Recent bullet was added (`false`
  on an `overwrite` re-write **or a version bump** — `update_recent_index` already
  suppresses a duplicate when the `rel_path` is present, so a v2 adds no second
  bullet).
- `landing_created` — `true` only when this was the **first** doc of a new project
  and the API auto-created `docs/<project>/index.md`; `false` otherwise.
- `committed` — whether the scoped git commit succeeded. `commit_sha` — the commit
  hash (see below); `null` when not committed.
- `pushed` — **P8 addition.** Its meaning is unchanged ("was this commit already on
  `origin/main` when the response was written?"), but **since P24 it is always
  `false`**: the push runs after the response, so it has not happened yet. It is
  **not** a failure signal and **must never trigger a retry** — the document is
  durably saved either way.
- `push_pending` — **P24 addition**, always present on the 201 and both DELETE 200s.
  `true` = a push to `origin/main` was **queued** and runs immediately after this
  response (box only, `KB_GIT_PUSH=true` and the commit succeeded); `false` = no push
  was queued, because pushing is disabled (local/plugin) or nothing was committed.
- `commit_sha` semantics — **changed in P24**: it is the **local commit** this request
  made, *before* the publish worker's fetch+rebase, so it is **no longer necessarily
  the published head** on `main` (the rebase may rewrite it after the response). `null`
  when `committed:false`. Consumers that need the published hash must read git state on
  the box, not this field.
- `commit_error` (string) — present **only** when a commit was attempted and
  failed; not a failure of the request (the doc is still written, 201). **`push_error`
  was removed in P24** and appears in no response: the push has not run when the body is
  written, so a push failure can only be reported in the container log
  (`[kb-api] publish: … FAILED`).

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
  step is gone; Pages retired). The push to `origin/main` is **off-box backup/history** only, and
  **since P24 it happens after the response** — so `pushed` is always `false` and `push_pending:true`
  just means "the backup push is on its way". Neither is a failure, the doc is **already live**, and
  the client must **not** retry the write on either. If a background push fails, the accumulated
  commits catch up on the **next** successful push. `/api/*` routing to the API is unchanged (the
  site serves `/`; the api serves `/api/*` + `/healthz`).
- **(P24) The write response contains no network I/O.** Everything before the 201 is local
  (validate → archive → file write → Recent/landing → DB commit → local git commit), so a write's
  latency no longer depends on GitHub or Gemini. A client timeout on a write is therefore almost
  never the write path — and, crucially, **is not evidence the write failed** (see below).
- **(P24) A transport failure on a write is not proof of failure — verify, never blind-retry.**
  The document is durably saved before any of the deferred work runs, so a lost response says
  nothing about whether the write landed. The client rule both shipped clients now implement:
  ask the API what is at the target `rel_path` (`GET /api/documents/by-path/{rel_path}`) **once**,
  and only act on the answer — present with your body → an honest success (write nothing, never
  re-POST); absent or still the old body → the write genuinely missed, so at most **one** informed
  retry; a *different* document at a plain-create path → that is the 409 you never saw. Note the
  read projection carries **no `url`** (it is synthesized only on the write responses), so a
  recovered save reports `rel_path`/`version` rather than inventing a URL. **Never loop.**
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
