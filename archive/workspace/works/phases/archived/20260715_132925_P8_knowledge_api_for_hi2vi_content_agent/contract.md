# Frozen consumer contract — hi2vi content-agent client

**What this is.** The frozen API contract the hi2vi `P15.S4` content-agent client
codes against. Shapes below were verified at **P8.S4** against `server/main.py`
(FastAPI handlers + `DocumentIn` model) by exercising every endpoint through the
pytest `TestClient` over a temp KB tree — the JSON is captured live, not guessed.

**For P8.REVIEW.** Everything below the horizontal rule is verbatim-ready to
consolidate into `docs/current/api.md` as a new `## Hosted deployment + frozen
contract` section (version via `doc-new-version --doc api`, never hand-edit
`docs/current/*`). The published `api.md` on Pages **is** the pointer the hi2vi
repo references. This is the durable-doc realization of the phase's "Doc impact"
api.md line for S4.

**Freeze rule.** Frozen as of P8: **additive-only** thereafter. New response
fields may appear (clients must ignore unknown keys) and new endpoints may be
added, but existing field names, types, and status-code meanings will not change.
The two P8 additions to the write body — `pushed` and `push_error` — are already
folded in below.

---

## Hosted deployment + frozen contract

The knowledge API is hosted publicly at **`https://knowledge.hi2vi.com`** (P8),
a co-tenant on the shared OCI edge. The hi2vi content agent consumes it
server-to-server. The local/plugin deployment is unchanged; the differences on
the hosted box are (a) bearer required on **all** `/api/*` calls, and (b)
publish-on-write (writes push to `main`, deploying to GitHub Pages).

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
  "url": "https://leetusik.github.io/knowledge/hi2vi/2026-07-14-growth-loops/",
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
- `url` — the **published Pages URL** of the doc (`<KB_PUBLIC_BASE_URL>/<project>/<date>-<slug>/`;
  on the box `KB_PUBLIC_BASE_URL=https://leetusik.github.io/knowledge`). Live once
  the push deploys (see publish flow).
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

- **Publish flow.** A `201` with `pushed:true` means the doc was committed and
  pushed to `main`; the GitHub Pages deploy then makes it live at `url` within a
  few minutes. A `201` with `pushed:false` **and a `push_error`** means the doc is
  written + committed on the box but not yet on `main` — it publishes on the **next**
  successful push (commits accumulate) or a manual push. In both cases the write
  **succeeded** — the client should **not** retry the write on `pushed:false`.
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
