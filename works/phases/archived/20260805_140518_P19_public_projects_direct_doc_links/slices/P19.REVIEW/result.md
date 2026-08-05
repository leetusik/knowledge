# Result — P19.REVIEW: phase review + durable-doc consolidation

Executed by `slice-executor-high` (kind: review), 2026-07-22. **Verdict: `pass`.**
All five middle slices (S1–S5) were validated together, the phase judged against the
objective / intent points 5 & 6 / scope boundaries, the load-bearing security claims
spot-checked against the committed tree, the four flagged follow-ups adjudicated as
routing recommendations, and the phase's durable-truth changes consolidated into
**8 new doc versions** (`--source P19.REVIEW`).

## 1. Validation matrix (all slices, run together)

| Check | Command | Outcome |
|---|---|---|
| Root pytest (legacy, no Postgres) | `.venv/bin/python -m pytest -q` | **PASS** — 70 passed, 27 skipped (Postgres-gated) |
| Full Postgres-gated suite | fresh disposable `postgres:17` + `KB_TEST_DATABASE_URL=… KB_AUTH_RATE_LIMIT=0 .venv/bin/python -m pytest -q` | **96 passed, 1 failed** — the 1 failure is **exactly** the known pre-existing **D15** (`test_documents_api.py::test_documents_list_detail_and_project_bridge`, extra `'format'` key; P16-era, not P19). Nothing else failed. |
| Alembic `0004` (fresh Postgres, real prod artifact) | `alembic upgrade head` (`0001→0002→0003→0004`) + `downgrade -1` → re-`upgrade head` | **PASS** — clean `0003_org_level_credentials -> 0004_project_visibility`; `projects.visibility` = `text NOT NULL DEFAULT 'private'::text` (byte-equal to the migration); downgrade drops the column, re-upgrade restores it identically; head = `0004_project_visibility` |
| Web typecheck | `pnpm --dir web typecheck` (`tsc --noEmit`) | **PASS** (clean) |
| Web lint | `pnpm --dir web lint` (eslint) | **PASS** (no warnings) |
| Web tests | `pnpm --dir web test` (vitest) | **PASS** — 8 files / 61 tests |
| Web build | `pnpm --dir web build` (next build) | **PASS** — `/documents/[id]` (ƒ) and `/graph/[org]` (ƒ) present |
| CLI | `cd cli && .venv/bin/python -m pytest -q` | **PASS** — 40 passed |
| Plugin parity | `python3 scripts/plugin_parity.py` | **PASS** (exit 0) |
| Skills parity | `python3 scripts/skills_parity.py` | **PASS** (exit 0) |
| Workflow state | `python3 scripts/workflow.py validate` | **PASS** |
| Prod E2E | (not re-run — cited) + read-only flip probe | S5 **Stage B** ran the extended `onboarding_smoke.py` live against `https://knowledge.hi2vi.com` **today** (exit 0, web pages in scope, `public-link (private->public->private, web pages OK)`). Re-verified read-only: `/healthz` **200** (`documents:23`), and the **flip probe** `GET /app/graph?org=<random-uuid>` → **404 `{"detail":"graph not found"}`** (the decisive 401→404 P19 live-flip). Did **not** re-run the full smoke (it only adds throwaway prod tenants). |

The disposable `postgres:17` was **torn down** after the run (`--rm`, confirmed gone).
The one Postgres failure is the expected D15 and nothing else — a clean matrix.

## 2. Spot-check of load-bearing security claims (against the committed tree, not `result.md` trust)

Every claim in the plan's §2 verified in the committed code:

- **`optional_user` never raises** (`server/accounts/auth.py:100-143`) — returns `None` on every miss path (no header, unknown/expired token, missing user, no tenant); resolves exactly as `require_user` incl. the best-effort `last_used_at` stamp.
- **Doc read is scoped-first-then-public-fallback** (`server/documents_api.py:103-152`) — member fast-path first; then the **legacy-mode guard** (`config.database_url() is None ⇒ None`), missing-row 404, **registry-less owner** (`not owner` / `''` / unparseable UUID ⇒ `None` — never public), then `get_project_by_name(...).visibility == "public"` required. 404-never-403.
- **`db._filtered` empty allowlist fails closed** (`server/db.py:289-295`) — `projects=[]` ⇒ `where.append("0")` (`WHERE … 0`, matches nothing); default `None` leaves every existing caller byte-identical.
- **Graph public path 404s on empty/nonexistent org** (`server/graph_api.py:231-241`) — legacy-mode guard ⇒ 404; empty `public_names` (also covers a nonexistent org) ⇒ 404 `"graph not found"`.
- **Mode-aware url branches on `ctx.tenant_id`, not `is_public`** (`server/main.py:592-601`) — tenant → `{public_base_url}/documents/{id}`; legacy → mkdocs shape.
- **Web anonymous branch fetches tokenless only** (`web/src/app/(public)/documents/[id]/page.tsx:99-107`) — `loadDocument(undefined, id, () => redirect("/login"))`; never renders a token-fetched doc to an anonymous visitor.
- **Raw relay is tokenless-when-no-cookie + byte-identical sandbox headers** (`web/src/app/api/documents/[id]/raw/route.ts`) — `openSession(readSessionCookie(req)) ?? undefined`; `RAW_HTML_HEADERS` match the backend dict (`Content-Security-Policy: sandbox allow-scripts; frame-ancestors 'self'`, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`).
- **`robots.ts` now allows `/documents` + `/graph`** (removed from `disallow`; `/dashboard`, `/projects`, auth pages, `/api/` still blocked).

## 3. Judgment vs objective / intent points 5 & 6 / boundaries — PASS

Both paired intent capabilities are delivered, code-backed, and green:

1. **Per-project visibility, private default** — `0004` `projects.visibility text NOT NULL DEFAULT 'private'`; `CreateProject.visibility` defaults `"private"` so implicit get-or-create rows stay private; session-only `PATCH /app/projects/{id}` (404 cross-tenant, 422 invalid). Gated tests + live PATCH round-trip.
2. **Public docs AND graph anonymously readable; outsiders' graph shows only public-project nodes; 404-never-403 everywhere** — `optional_user` + `_resolve_readable_doc` + the org-scoped public graph filtered to `visibility=="public"` names (absent, not dimmed — a server-side allowlist filter); every private/nonexistent read is an indistinguishable 404. Gated `test_public_read.py` (incl. the negative non-leak + the instant-toggle 200→404 proof) + the live public-link leg.
3. **Every save returns a working direct URL; CLI surfaces it; both skill copies updated; shareable when public** — mode-aware 201 `url` (`ctx.tenant_id` branch, live-verified ending `/documents/{id}`); CLI `save` prints `url:`; both `SKILL.md` copies note shareability; legacy/template keeps the mkdocs shape.

**Scope boundaries held:** **D13** (`source_url`) untouched; **D15** flagged, not absorbed (its gated failure is unchanged); **no design authoring** (every public surface composes 1:1 from existing pieces — `PublicShell`/`GraphCanvas`/`Badge`/copy-link idiom; no new CSS/tokens); **`/api/*` contract additive-only** (the only change is the value of the always-present `url` key, verified live against the frozen 201 key set); **single-uvicorn-worker** model preserved (the visibility bridge is per-request Postgres reads + a SQLite predicate, no new workers/locks); **both parity gates green**; **no P20 encroachment** (marketing landing `workspace` copy deliberately left).

## 4. Flagged follow-ups — routing recommendations (I cannot run `defer-job`; recommend only)

None of these block the pass; each is worse-than-recorded only if you consider it so, and I do not — they match their `result.md` records exactly.

1. **No rate limiting on the anonymous read surface (S2 defer-note).** The new public doc/`raw`/graph paths are unauthenticated and unthrottled (only `/auth/*` is limited). They leak nothing (404-never-403, fail-closed bridge) but are open to volume. **Recommend: a deferred job** — an edge or in-process per-IP limiter on the anonymous read paths before they see real traffic.
2. **Login `returnTo` + public-graph tag-hub links (S3 niceties).** An anonymous doc miss bounces to `/login` and drops the visitor at the dashboard (no returnTo); the ported `GraphCanvas` tag-hub links still target the session-gated `/documents?tag=`, so an anonymous visitor clicking a tag hub lands on `/login` (the doc-node "Read" links work anonymously). **Recommend: a deferred job** (or two) — plumb `returnTo`, and route public-graph tag hubs to a public tag surface.
3. **Org slug vanity URLs for the public graph (UUID-only MVP).** `/graph/{org}` takes the tenant UUID; an org **slug** is a deferrable nicety. **Recommend: a deferred job.**
4. **D15 stays as the already-filed deferred job.** The pre-existing `test_documents_api` `format`-key gated failure is untouched by P19; it remains the standing deferred item (add `format` to `_LIST_KEYS` or drop it from the list projection). No new action.

## 5. Durable-doc consolidation (8 new versions, `--source P19.REVIEW`)

Consolidated the phase's whole accumulated "Doc impact" list (not per-slice) into one new version per affected doc, editing only each returned `edit_path`, then one `rebuild-docs`:

| Doc | New version | What it captures |
|---|---|---|
| product | `v0010` | per-project public/private visibility (default private, incl. implicit creates); anonymous public doc+graph reads (graph = public nodes only); mode-aware shareable direct save URL; deferred niceties |
| experience | `v0010` | the toggle + Public/Private badge, copy-link share, anonymous public doc/graph pages (`PublicShell`, `/login` bounce on miss), CLI `save` prints the direct url; deferred niceties |
| api | `v0014` | `visibility` on projects/dashboard/signup; `PATCH /app/projects/{id}`; optional-identity `GET /app/documents/{id}`+`/raw`; `GET /app/graph?org=`; mode-aware 201 `url` (frozen contract updated additively — example + field meaning) |
| backend | `v0009` | `optional_user`; `_resolve_readable_doc` two-gate resolution; graph public path; `db._filtered(projects=)` fail-closed bridge; `set_project_visibility` + PATCH; mode-aware save-url build |
| security | `v0012` | the first anonymous read surface — 404-never-403; never-raising optional-identity; fail-closed bridge; registry-less-never-public; legacy-mode guard; tokenless BFF relay; 8 checklist items; the no-anon-throttle open question |
| frontend | `v0009` | the `(public)` route group; optional-identity doc page + `/graph/[org]`; `PublicShell`; `optionalIdentity()` + tokenless raw relay; visibility toggle/badges + dashboard column; copy-link island; `robots.ts` |
| data | `v0010` | alembic `0004` `projects.visibility text NOT NULL DEFAULT 'private'` (no mint-window); the SQLite `projects` name-allowlist predicate (query-layer bridge, fail-closed); migrations bullet |
| operations | `v0020` | the executed P19 cutover (additive `0004`, no mint-window, reconcile→migrate→recreate); `onboarding_smoke.py` public-link leg + `--skip-web-pages`; the live 401→404 flip |

**Doc-set decision (my call, per plan §5).** The plan's expected set was `api, backend, security, frontend, data, operations, product, experience` — I consolidated all 8. `data` was added per the plan's instruction (the `0004` schema + the SQLite allowlist predicate belong in the schema doc). `product` and `experience` both warranted edits (public sharing is a genuine product capability + user journey). `decisions` and `qa` were **not** in the phase.md Doc impact list nor the plan's expected set, so — following the plan's scoping — I did not version them. All 8 created cleanly (concise summaries, no ENAMETOOLONG); `rebuild-docs` regenerated `docs/current/*`; every `latest` points at its P19 version; `validate` passes; no orphan version files.

## 6. Deviations from plan.md

- **None of substance.** Verdict `pass`; 8 docs consolidated as the plan scoped (including `data` per §5). No source code edited, no commits, no status transitions, no `defer-job` run, no push, no alembic against any live DB (fresh disposable only; prod access was the read-only flip probe alone).
- One mechanical note: the alembic round-trip required the async driver URL form (`postgresql+psycopg://`, per `server/config.database_url()`); the first attempt with a bare `postgresql://` fell to the absent `psycopg2` — corrected, then the full `0001→0004` + downgrade→re-upgrade round-trip ran clean.
