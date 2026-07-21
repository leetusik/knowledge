# P12.S3 — Tenant dashboard: projects + create + tenant usage — result

Status: **done**. The full post-login dashboard is built — a new backend aggregate
route plus the whole dashboard frontend — and validated (backend pytest green,
`typecheck` / `lint` / `test` / `build` all pass). Built on the settled Knowledge
Base design system, faithful to the specimen (with one documented no-destination
omission — see Deviations).

## What was built

### Part A — Backend: `GET /app/dashboard`

- **`server/dashboard_api.py` (new)** — one session-guarded, tenant-scoped,
  **unmetered** aggregate route, mirroring `usage_api.py`'s style and reusing its
  `_resolve_window` helper + the accounts/usage services. `days = Query(30, ge=1, le=365)`.
  Pure reads: never calls `record_event`.
- **Response shape** (pinned in the handler docstring — the frontend codes against it):
  `{ projects: [{id,name,created_at,documents,keys,last_used_at}], activity: [{type,at,project_name,credential_name}] }`.
- **Assembly** (per plan):
  - `documents` = `get_usage_metrics(tenant, project_id, window).totals.documents_created`
    — documents_created over the 30-day window, **not** a live per-project total (the
    content-plane UUID↔name bridge is S5, deliberately not pulled in).
  - `keys` = count of **non-revoked** credentials (`revoked_at is None`).
  - `last_used_at` = `max` of the project's credentials' `last_used_at` (null if none).
  - `activity` = real lifecycle events — `project_created` per project (at `created_at`),
    `key_minted` per credential (at `created_at`), `key_revoked` per revoked credential
    (at `revoked_at`) — sorted newest-first, capped at 8. (The mock's "42 documents
    indexed" / "search volume +18%" aggregate items are not discrete events and are
    not reconstructable without an event log, so the panel renders only the lifecycle
    events it can honestly back — as the plan directs.)
  - Per-project loop over `get_usage_metrics` + `list_project_credentials` (MVP-fine;
    the single-query optimization was not forced — correctness + scoping first).
- **Mounted** in `server/main.py` after `usage_api` (same `require_user` guard; no new
  wiring — the shared `AuthError` handler already renders the generic 401).
- No path param → no 404-vs-403 concern; the only scoping guarantee is that solely
  `ctx.tenant.id`'s projects/credentials are ever read (no cross-tenant leak),
  verified by the isolation test.

### Part B — Frontend: the dashboard page

- **`web/src/lib/knowledge/app.ts` (new)** — the `/app/*` client seam mirroring
  `auth.ts`: `listProjects`, `createProject`, `getUsage` (bare, 30d), `getDashboard`
  (bare). Thin typed wrappers over `client.ts`; `token` required first arg; every call
  keeps `cache: "no-store"`; callers branch on `ApiError.status`.
- **`web/src/lib/knowledge/types.ts` (extended)** — `KbProject`, `KbUsageWindow`
  (`{start,end}` — **not** vocky's `*_ingested_at`), `KbUsageTotals`, `KbDailyCount`,
  `KbUsage`, `KbDashboardProject`, `KbActivityEvent`, `KbDashboard`.
- **`web/src/content/dashboard.ts` (new)** + barrel export — page eyebrow/title/sub,
  the four tile eyebrows, trend heading + caption fn, projects column headers + empty,
  activity heading + per-`type` templates + empty, create-project copy, and
  `CREATE_PROJECT_ERRORS` (invalidName / sessionExpired / generic, keyed by status).
- **`web/src/components/usage/` (new)** —
  - `stat-tiles.tsx`: `.kb-tile-grid` + four `.kb-tile` (Fraunces `.kb-tile__num`),
    `toLocaleString("en-US")`, view-model driven, **no delta line** (operator decision).
  - `trend-chart.tsx`: a server-rendered inline SVG that **ports `console-trend.js`'s
    geometry exactly** (`W=600 H=160 PT=12 PB=24 PX=6 GRID=3`; min/max/span; the `M/L`
    line; the baseline-anchored area filled with the `--kb-trend-fill-*` gradient; 4
    grid lines; the `r=3.5` endpoint; the exact `.kb-trend*` class hooks;
    `viewBox="0 0 600 160" preserveAspectRatio="none"`). A11y: `role="img"`,
    `aria-label`, `sr-only` total/peak/range summary. The geometry is a pure exported
    `trendGeometry()` so the port is unit-locked; empty series → a `.kb-empty` state.
  - `index.ts` barrel.
- **`web/src/app/(app)/dashboard/page.tsx` (replaced)** — async server component:
  `requireIdentity()` then `Promise.all([getUsage, getDashboard])` (a non-401 failure
  propagates to the error boundary). Layout top→bottom per the specimen: `.mainhead`
  (eyebrow + Fraunces "Dashboard" title + sub + the New-project button) → 4-tile
  `StatTiles` (4th "Active total" = `documents_created − documents_deleted`, derived) →
  the trend `.kb-panel` (heading + mono caption + `TrendChart` over `daily_counts.map(d
  => d.searches)`) → the two-column `.grid2` (Projects panel `1.7fr` | Recent-activity
  `1fr`). Specimen-local helpers (`.mainhead`/`.grid2`/`.trendhead`/`.trendcap`/`.act*`)
  reproduced faithfully as Tailwind arbitrary-value utilities referencing the same
  `--kb-*` tokens; `.kb-*`-property overrides (e.g. the trend `h2` font-size) done via
  inline `style` per the S2R layering note.
- **Projects table** — the existing `DataTable<T>` with the six specimen columns:
  Project · Docs (right/`num`) · Keys (right/`num`) · Created (`mono`) · Last used
  (`mono`) · Action(Open, right). "Open" = `appButtonClass("ghost","sm")` `<Link
  href={`/projects/${id}`}>` (the `/projects/[id]` route lands in S4). A page-local
  `relativeTime` helper (`"2h ago"`/`"3d ago"`/`"—"`) + `formatCreated` (ISO date).
- **Recent-activity panel** — the `.act` list (mono timestamp via `relativeTime` +
  templated bolded body per `KbActivityEvent.type`), empty state when no activity.
- **Create-project flow** — `actions.ts` (`"use server"`, zod `min(1).max(200).refine(trim)`,
  `requireIdentity()` **OUTSIDE the try**, errors mapped by status — knowledge answers
  a blank/too-long name as **422** so 400 **and** 422 → `invalidName`,
  `revalidatePath("/dashboard")` + `ok` bump) + `create-project-form.tsx` (client
  island: the header "New project" button toggles an inline form built from the
  designed `.kb-field`/`.kb-appbtn` classes; `useActionState`).

## Validation

Backend:
- `KB_TEST_DATABASE_URL=postgresql+psycopg://…/kb_dashboard_test uv run pytest tests/test_dashboard_api.py -q` → **3 passed** (shape + tenant-isolation/no-leak; unmetered; requires-auth 401).
- `uv run pytest -q` (no DSN) → **65 passed, 3 skipped** — the existing suite stays green and the new tests skip cleanly when no Postgres DSN is configured.

Frontend (all pass):
- `pnpm --dir web typecheck` → clean.
- `pnpm --dir web lint` → clean.
- `pnpm --dir web test` → **39 passed** (36 existing + 3 new `trend-geometry` cases).
- `pnpm --dir web build` → succeeds; `/dashboard` compiles as `ƒ (Dynamic)` (correct — it reads the session cookie).

**End-to-end (interactive):** not run — left to the phase review, per plan. Knowledge
has no host-mapped Postgres (the only reachable Postgres is vocky's dev server at
`127.0.0.1:55432`), so a live dashboard render against a seeded knowledge session
could not be stood up here. The route is proven by the pytest suite; the frontend by
typecheck/lint/build.

## Notes for the review / next slice

- **Test harness (new ground):** the repo had **no** accounts/usage pytest suite and
  no async test harness (no `pytest-asyncio`; the existing suite is the repo's sync
  `fastapi.TestClient`). The accounts plane is **Postgres-only** (ORM `postgresql.UUID`
  columns → SQLite can't back it). `tests/test_dashboard_api.py` is therefore a
  **self-contained, env-driven Postgres test**: it reads `KB_TEST_DATABASE_URL` (or
  `DATABASE_URL`) and **skips** when unset/unreachable (so the default run stays
  green — no hardcoded creds committed). It creates the control-plane tables with a
  throwaway **sync** engine (`Base.metadata.create_all`, so the app's async engine is
  never shared across event loops), seeds two tenants through the real HTTP surface
  (signup / create-project / mint / revoke) plus a few direct `usage_events` inserts,
  and drives the route with `TestClient`. Uuid-unique seed emails + tenant-scoped
  assertions mean a shared/re-used DB never interferes. **A throwaway `kb_dashboard_test`
  database was created on `127.0.0.1:55432` (vocky's Postgres) to run it — a disposable
  test artifact, safe to drop.** This harness is reusable by S4's project-detail tests.
- The `.kb-trend` fill gradient uses a fixed id (`kb-trend-fill`) — fine for the single
  chart on the dashboard; if S4 renders a second `TrendChart` on the same page, give it
  a unique id (a prop) to avoid a `<defs>` id collision.

## Deviations from plan.md / the specimen

1. **"View all" projects button omitted (the one designed element not shipped).** The
   specimen's Projects panel head carries a `.kb-appbtn--secondary --sm` "View all"
   affordance, but **there is no all-projects route anywhere in P12**: the rail
   deliberately has no Projects entry, project-detail is S4, and the dashboard already
   renders the tenant's **complete, unpaginated** project list — so "View all" has no
   destination. Shipping it live would 404, which violates the S2 console principle
   "not-yet-shipped routes render as muted 'Soon', never a 404 link." The plan's own
   detailed projects-panel spec also omits it. Flagged for the phase review to decide
   whether a later slice adds an all-projects surface + the button. Every other designed
   element (the four Fraunces tiles, the teal line/area trend, the full six-column
   projects table, the recent-activity panel, the two-column bottom grid, spacing and
   hierarchy) ships as designed.
2. **Create-form appearance** — the sanctioned open spot: an inline disclosure using
   only the designed `.kb-field` + `.kb-appbtn` classes (no invented modal look).
3. **Stat-tile deltas omitted** — operator decision (single-window usage, no
   prior-period data).
4. **Collapse-on-success without a `useEffect`** (implementation detail, not a
   behavioral change): the repo's eslint `react-hooks/set-state-in-effect` rule forbids
   `setState` in an effect, so the form collapses inside the action's transition (the
   idiomatic React 19 pattern), which also unmounts the inputs (no field reset needed).
5. **No `app.ts`-mapping vitest test** — the plan said "only if it adds value"; the
   thin `getJson`/`sendJson` wrappers add little, so instead I locked the higher-value
   `console-trend.js` geometry port with `web/tests/trend-geometry.test.ts`.

## Doc impact (appended to phase.md; the REVIEW consolidates into doc versions)

- `api.md` / `architecture.md` — the new session-scoped, tenant-scoped, **unmetered**
  `GET /app/dashboard` aggregate route (per-project usage/credential rollup + lifecycle
  activity feed).
- `frontend.md` — the dashboard page + the `lib/knowledge/app.ts` `/app/*` client seam
  + the `components/usage/` StatTiles/TrendChart (line/area, `console-trend.js` port) +
  the projects DataTable + activity feed + the create-project server action.
- `experience.md` — the post-login dashboard UX (usage tiles / 30-day search trend /
  projects table / recent activity / create-project).
