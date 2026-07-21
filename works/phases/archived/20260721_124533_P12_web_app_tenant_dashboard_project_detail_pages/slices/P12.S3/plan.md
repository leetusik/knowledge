# P12.S3 — Tenant dashboard: projects + create + tenant usage

## Context

P12 is knowledge's authenticated web app (`web/`, Next.js). The foundation is built and the
design is settled: **S1** scaffolded the app + design system, **S2** built the auth/BFF/sealed-cookie
layer + the app-shell, **S2R** re-skinned everything to the **Knowledge Base "calm editorial library"
design system** (the KB design handback lives at `web/design/canvas/`, applied via the `.kb-*` console
classes + per-scheme `--kb-*` tokens). S3 is the first real **page** slice: the post-login dashboard
home. It builds on a settled design and API — it is an *implementation* slice, not a design gate.

**The build target is the design specimen** `web/design/canvas/pages/app-dashboard.card.html` (the
faithful visual source of truth) plus the drawing spec `web/design/canvas/components/console/console-trend.js`.
**The near-verbatim functional template is vocky's dashboard** (`~/projects/personal/vocky/web/src/app/(app)/dashboard/*`
+ `components/usage/*` + `lib/vocky/{app,types}.ts` + `content/dashboard.ts`).

**Operator decisions taken at this planning turn** (design specimen is richer than the current API):
1. **Back the richer parts with a NEW backend aggregate route** (not a frontend fan-out, not a
   minimal drop). The projects table's per-project `Docs`/`Keys`/`Last-used` columns and the
   Recent-activity feed are served by one new session-scoped, tenant-scoped, **unmetered** `/app`
   route. This is why S3's executor is bumped one tier to **`slice-executor-high`** — it now spans a
   net-new backend API surface (tenant-scoping correctness / no cross-tenant leak) *plus* the full
   dashboard frontend.
2. **Omit stat-tile deltas.** Usage returns a single window with no prior-period data; the four
   figures render without the "↑ +42 this month" caption (a real delta needs a product definition we
   don't have). The tile layout otherwise matches the design.

This is consistent with D-P12-2 (the new route extends the control-plane `/app` API; it does **not**
touch the browser↔API BFF/CORS boundary) and is the same kind of isolated `/app` read-route addition
DECOMP anticipated for S5/S6.

---

## Part A — Backend: one new aggregate route

**New route `GET /app/dashboard?days=30`** in `server/` (mirror `server/usage_api.py`'s style; a new
`server/dashboard_api.py` router mounted in `server/main.py`, or an added handler in `usage_api.py` —
executor's call; a dedicated module is cleaner). Guarded by `Depends(require_user)`, **tenant-scoped,
unmetered** (pure reads over the accounts + usage services — never calls `record_event`). `days` is
`Query(30, ge=1, le=365)` like the other usage routes.

**Response shape** (pin it in a docstring — S3's frontend codes against it):
```json
{
  "projects": [
    { "id": "<uuid>", "name": "<str>", "created_at": "<ISO>",
      "documents": <int>, "keys": <int>, "last_used_at": "<ISO>|null" }
  ],
  "activity": [
    { "type": "project_created"|"key_minted"|"key_revoked",
      "at": "<ISO>", "project_name": "<str>", "credential_name": "<str>|null" }
  ]
}
```

**Assembly** (reuse existing services — `list_projects_for_tenant`, `get_usage_metrics`,
`list_project_credentials`, `serialize_project`'s field conventions):
- For each of the tenant's projects, compute the row: `documents` = `get_usage_metrics(tenant_id,
  project_id=p.id, window).totals.documents_created`; `keys` = count of **non-revoked** credentials;
  `last_used_at` = max `last_used_at` across the project's credentials (null if none used).
- Build `activity` from real lifecycle events across the same projects/credentials: a
  `project_created` per project (`at = created_at`), a `key_minted` per credential (`at = created_at`,
  `credential_name`), a `key_revoked` per revoked credential (`at = revoked_at`). Sort by `at`
  descending, take the most-recent **N (≈8)**. (This is honest, real data. The mock's "42 documents
  indexed" / "search volume +18%" items are aggregate-derived, not discrete events, and are not
  reconstructable without an event log — the panel renders the lifecycle events it can back.)

**Implementation notes / decisions to carry:**
- A per-project loop over `get_usage_metrics` + `list_project_credentials` is acceptable for MVP (all
  server-side; one HTTP round-trip still beats a frontend fan-out). A single project-grouped
  aggregation query in the usage repository is a **welcome optimization if the executor finds it a
  clean addition** — correctness + tenant-scoping come first; do not force the optimization.
- **`documents` = documents_created over the 30-day window** (the page is framed "over the last 30
  days"), *not* a live total. A true live per-project document count needs the content-plane
  documents table via the control-plane-UUID ↔ content-plane-name bridge — **that is S5's explicit
  open question and is deliberately NOT pulled into S3.** Keep the header honest (e.g. "Docs").
- No path param, so 404-never-403 scoping is N/A here; the guarantee is simply that only
  `ctx.tenant.id`'s projects/credentials are ever read (no cross-tenant leak).

**Backend verification:** add a **terse** focused test of the new route (there is no existing
accounts/usage pytest suite — follow the repo's pytest convention shown in `tests/`, an ASGI/httpx
call against a seeded tenant): assert the shape, that it returns only the caller's tenant's data
(seed a second tenant → its projects/activity never appear), and that a call is **unmetered** (usage
counts unchanged after hitting it). Minimal high-value cases only.

---

## Part B — Frontend: the dashboard page

Replace the placeholder `web/src/app/(app)/dashboard/page.tsx`. All new/edited files live under
`web/src/`. The app-shell (topbar with tenant name + rail with Dashboard-active) already wraps the
page via `(app)/layout.tsx` — **render only inside `.kb-app-main`; do not re-render chrome.**

**Client seam — `web/src/lib/knowledge/app.ts` (NEW)** — mirror the `auth.ts` pattern (thin typed
wrappers over `client.ts`'s `getJson`/`sendJson`, `token` as required first arg, key off `ApiError.status`):
- `getUsage(token, signal?)` → `GET /app/usage` (bare; server defaults 30d) → `KbUsage`
- `getDashboard(token, signal?)` → `GET /app/dashboard` (bare; 30d) → `KbDashboard`
- `createProject(token, name)` → `POST /app/projects {name}` → `KbProject`
- `listProjects(token, signal?)` → `GET /app/projects` → `KbProject[]` (add for completeness/S4 reuse; the page uses `getDashboard`)

**Types — extend `web/src/lib/knowledge/types.ts`:** `KbProject {id,name,tenant_id,created_at}`;
`KbUsageWindow {start,end}` (**note: knowledge uses `start`/`end`, not vocky's `*_ingested_at`**);
`KbUsageTotals {total,documents_created,documents_deleted,searches}`; `KbDailyCount
{day,total,documents_created,documents_deleted,searches}`; `KbUsage {window,totals,daily_counts,projects}`;
`KbDashboardProject {id,name,created_at,documents,keys,last_used_at}`; `KbActivityEvent
{type,at,project_name,credential_name}`; `KbDashboard {projects,activity}`.

**Copy — `web/src/content/dashboard.ts` (NEW), exported via `content/index.ts` barrel** (follow the
`auth.ts` copy-module shape: an interface + `as const` objects + a status-keyed error map). Holds:
page eyebrow/title/sub; the four tile eyebrows (Documents created / Searches / Deleted / Active total);
trend heading ("Searches · last 30 days") + caption template; projects panel heading + column
headers + empty copy; activity panel heading + per-`type` templates + empty copy; create-project form
copy; `CREATE_PROJECT_ERRORS` (invalidName / sessionExpired / generic, keyed by HTTP status — never
the backend `detail`).

**Components — `web/src/components/usage/` (NEW, presentational, props-only):**
- `stat-tiles.tsx` — renders `.kb-tile-grid` + four `.kb-tile` (`.kb-tile__eyebrow` + `.kb-tile__num`).
  **No delta line** (operator decision). Fraunces numerals come from `.kb-tile__num`; format values
  with `toLocaleString("en-US")`. Takes a pre-computed view-model (the 4th tile "Active total" =
  `documents_created − documents_deleted` is derived in the page, not a `totals` key).
- `trend-chart.tsx` — **port `console-trend.js`'s geometry exactly** as a server-rendered inline SVG
  (no client JS): `W=600 H=160 PT=12 PB=24 PX=6 GRID=3`; `min/max/span=max-min||1`; the `M/L` line
  path; the baseline-anchored area path (`M PX baseline … L each point … L (PX+innerW) baseline Z`)
  filled with the `--kb-trend-fill-from/to` gradient; **4** grid lines (`g=0..GRID`); the endpoint
  `<circle r=3.5>`. Emit the exact class hooks `.kb-trend` / `.kb-trend__grid` / `.kb-trend__area` /
  `.kb-trend__line` / `.kb-trend__point`, `viewBox="0 0 600 160" preserveAspectRatio="none"`. Add
  a11y from vocky's version: `role="img"`, `aria-label`, and an `sr-only` summary sentence (total /
  peak / range). Input: `series: number[]` = `daily_counts.map(d => d.searches)`. Handle empty series
  gracefully (render the empty/`.kb-empty` state, not a broken SVG).
- `index.ts` barrel.

**Projects table** — use the existing `DataTable<T>` primitive (it renders `.kb-dtable`). Columns per
the specimen: **Project · Docs (right) · Keys (right) · Created · Last used · Action(Open, right)**.
Project cell = `.kb-dtable__name` (name) + optional `Tag`/`.kb-chip`; numeric cells `className="num"`,
date/relative cells `className="mono"`. "Open" = ghost `appButtonClass("ghost","sm")` `<Link
href={`/projects/${p.id}`}>` (the `/projects/[id]` detail route lands in **S4, the next slice** — the
link is the designed affordance and goes live then; acceptable since the phase isn't deployed until
P14). Empty state via `DataTable`'s `empty` copy. Add a small relative-time helper for "Last used"
(e.g. "2h ago" / "3d ago"; "—" when null).

**Recent-activity panel** — a `.kb-panel` with the specimen's `.act` list (timestamp + templated body
per `KbActivityEvent.type`, using the copy templates + the relative-time helper). Empty state when no
activity.

**Create-project flow** — the design shows a **primary "New project" button** in the header
(`.mainhead`), not vocky's always-visible inline form. Implement: the button (client) toggles a small
inline create form built from the **designed** `.kb-field` + `.kb-appbtn--primary` classes (no
invented modal look). The form is a **server action + `useActionState` island** (mirror vocky's
`actions.ts` + `create-project-form.tsx`): zod `min(1).max(200).refine(trim)`, call `requireIdentity()`
**OUTSIDE the `try`** (it redirects by throwing), map errors by HTTP status, `revalidatePath("/dashboard")`
+ bump an `ok` counter on success (collapse/reset the form). A `"use server"` file exports **only**
async functions. *(The create form's exact appearance is the one spot the specimen leaves open —
flagged for the operator; the inline-disclosure-with-designed-fields choice uses only existing
designed classes and can be refined by a later design pass if wanted.)*

**Page composition** (`page.tsx`, async server component): `export const metadata = {title:
DASHBOARD.title}`; `const {token} = await requireIdentity()` then `const [usage, dashboard] = await
Promise.all([getUsage(token), getDashboard(token)])` (a non-401 failure propagates to the error
boundary — an outage must not render as an empty dashboard; the 401→`/login` redirect is inside the
guard). Lay out top→bottom exactly as the specimen: `.mainhead` (eyebrow + `.kb-app-title` "Dashboard"
+ `.kb-app-sub` + the New-project button) → the 4-tile `StatTiles` → the trend `.kb-panel` (heading +
caption + `TrendChart`) → the two-column bottom grid (Projects panel 1.7fr | Recent-activity 1fr).
Tenant name is already in the topbar (shared cached `/auth/me`) — no extra call.

**Page-local layout helpers** (the specimen's `.mainhead` / `.grid2` / `.trendhead` / `.trendcap` /
`.kb-trend-wrap` / `.act*` are specimen-local, **not** in `kb-console.css`). Reproduce them faithfully
in the codebase's Tailwind idiom — arbitrary-value utilities referencing the same `--kb-*` tokens the
specimen uses (`grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]`, `gap-[var(--kb-space-md)]`,
`h-[120px]` for the trend wrap, `w-[4.6rem] font-mono` for the activity timestamps, `--kb-border`
row dividers). Do not approximate the values — match the specimen.

---

## Design fidelity — RESPECT THE DESIGN

The KB design is settled and returned; **ship every designed element as designed** — the four tiles
(Fraunces numerals), the teal line/area trend, the full six-column projects table, the recent-activity
panel, the two-column bottom grid, spacing, and hierarchy. Do **not** drop, simplify, or "improve" a
designed element to save effort. Use the `.kb-*` console classes + `--kb-*` tokens (never re-derive
colors or invent new visual styling); icons via `lucide-react` (the "New project" plus icon). The only
sanctioned departures are the two operator decisions above (backend route for the rich data; no
tile deltas) and the flagged open create-form appearance. Source of truth:
`web/design/canvas/pages/app-dashboard.card.html` + `console-trend.js`.

---

## Verification (executor runs before returning `done`)

- **Backend:** the terse new-route test (shape · tenant-isolation/no-leak · unmetered) + the existing
  suite stays green.
- **Frontend:** `pnpm --dir web typecheck` · `pnpm --dir web lint` · `pnpm --dir web test` (add a
  terse `app.ts`-mapping test only if it adds value, mirroring `tests/knowledge-auth.test.ts`) ·
  `pnpm --dir web build` (the `/dashboard` route compiles; it is dynamic via the cookie read).
- **End-to-end (smoke):** if a backend + seeded session is available, run `pnpm --dir web dev` (:3030)
  against the API, sign in as the seeded tenant, and confirm tiles/trend/table/activity render and
  create-project works; otherwise note that full interactive E2E is left to the phase review. The
  orchestrator runs `python3 scripts/workflow.py validate` (state integrity) after the `done` verdict.

## Doc impact (executor appends one-line notes to `phase.md` — the phase REVIEW consolidates into doc versions)
- `api.md` / `architecture.md` — the new session-scoped, tenant-scoped, **unmetered** `GET /app/dashboard`
  aggregate route (per-project usage/credential rollup + lifecycle activity feed).
- `frontend.md` — the dashboard page + the `lib/knowledge/app.ts` `/app/*` client seam + the
  `components/usage/` StatTiles/TrendChart (line/area, `console-trend.js` port) + the projects
  DataTable + activity feed + the create-project server action.
- `experience.md` — the post-login dashboard UX (usage tiles / 30-day search trend / projects table /
  recent activity / create-project).

## Out of scope (deferred, by decision)
- Stat-tile month-over-month deltas (omitted — no prior-period data).
- Live per-project document totals (the content-plane UUID↔name bridge is **S5**).
- The `/projects/[id]` project-detail page (**S4**, next slice — the table's Open link targets it).
- Documents browse/search (**S5**) and the in-app graph (**S6**).

## Critical files
- **Backend (new/edit):** `server/dashboard_api.py` (new route) + mount in `server/main.py`; reuses
  `server/app_api.py` (`serialize_project`, `list_projects_for_tenant`), `server/usage/service.py`
  (`get_usage_metrics`), accounts `list_project_credentials`. Terse test under `tests/`.
- **Frontend (new):** `web/src/lib/knowledge/app.ts`; `web/src/content/dashboard.ts`;
  `web/src/components/usage/{stat-tiles,trend-chart,index}.tsx`;
  `web/src/app/(app)/dashboard/{actions.ts,create-project-form.tsx}`.
- **Frontend (edit):** `web/src/app/(app)/dashboard/page.tsx` (replace placeholder);
  `web/src/lib/knowledge/types.ts`; `web/src/content/index.ts` (barrel).
- **Templates/spec (read-only):** `web/design/canvas/pages/app-dashboard.card.html`,
  `web/design/canvas/components/console/console-trend.js`; vocky's
  `web/src/app/(app)/dashboard/*` + `components/usage/*` + `lib/vocky/{app,types}.ts` +
  `content/dashboard.ts`.
