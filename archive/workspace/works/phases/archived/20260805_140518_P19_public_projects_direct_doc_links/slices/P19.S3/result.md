# Result — P19.S3 "Web public surfaces: visibility toggle + public doc/graph pages + share link"

**Status: done.** The web public/private boundary is in place, composed 1:1 from
already-designed pieces (no `design-cowork` round, no new CSS/tokens). All local gates
pass: `pnpm lint` / `pnpm typecheck` / `pnpm test` (61 passed) / `pnpm build`, plus
`plugin_parity.py` PASS (a server file was touched under the plan's bounded discretion).

## What shipped

### 1. Optional-identity guard (web)
- `web/src/lib/auth-guards.ts` — new `optionalIdentity(): Promise<AuthenticatedContext | null>`
  (`cache()`d, like `requireIdentity`). No cookie → `null`; live session → `{ token, identity }`;
  a **dead cookie** (knowledge 401) → `null` (degrade to anonymous, mirroring the server
  `optional_user`); real outages rethrow. Never redirects.

### 2. New `(public)` route group (URLs unchanged; no `(public)/layout.tsx`)
- **Moved** `documents/[id]/` (page + not-found + explainer.css + prose.css + markdown-body)
  from `(app)` to `(public)` via `git mv` (tracked as renames). The `/documents` list stays in `(app)`.
- Extracted the doc rendering (header + metadata strip + format branch) into a co-located
  shared server component `document-view.tsx` — **zero visual change** (verbatim copy of the
  P12.S5 render, incl. the `Meta` helper and the sandboxed HTML-explainer iframe).
- Rewrote `(public)/documents/[id]/page.tsx` to branch on `optionalIdentity()`:
  - **member** → `getDocument(token, id)` + `<AppShell identity>` with back-link **and** copy-link;
    `ApiError` 404/400 → `notFound()`.
  - **anonymous** → `getDocument(undefined, id)` + `<PublicShell>`; `ApiError` 404/400 →
    `redirect("/login")` (uniform anonymous miss). A malformed id → `notFound()` before any session read.
- New public graph page `(public)/graph/[org]/page.tsx` + co-located `not-found.tsx`: UUID-validate
  `org` (malformed → `notFound()`), `optionalIdentity()`, `getGraph(token ?? undefined, { org })`,
  `ApiError` 404 → `notFound()` (never a login bounce), renders `<PublicShell>` + org-neutral
  eyebrow/title from `GRAPH` + `<GraphCanvas data>` (imported as-is from `(app)/graph/graph-canvas`).
- New `PublicShell` (`web/src/components/public-shell.tsx`, server component): the same `.kb-app`
  light-scheme frame (`data-md-color-scheme="default"`) + `.kb-topbar` brand block (→ `/`) + spacer +
  a "Sign in" ghost link + `.kb-app-main`. Composition of existing classes only.

### 3. BFF plumbing (`web/src/lib/knowledge/app.ts`, `types.ts`)
- `getDocument` / `getDocumentRaw` now accept `token: string | undefined`.
- `getGraph(token, options: { org? } = {}, signal?)` — appends `?org=` (encodeURIComponent);
  bare call byte-unchanged. Updated the one caller (`(app)/graph/page.tsx`).
- New `setProjectVisibility(token, id, visibility)` → `PATCH /app/projects/{id}` (returns `raw.project`).
  `getProject` already existed and was reused (not re-added).
- Types: `KbProject.visibility: "private" | "public"` and `KbDashboardProject.visibility`.

### 4. Raw relay optional-identity (`web/src/app/api/documents/[id]/raw/route.ts`)
- Replaced the 401 short-circuit with `const token = openSession(readSessionCookie(req)) ?? undefined;`
  then `getDocumentRaw(token, id)`. The four `RAW_HTML_HEADERS` are **byte-identical**; `next.config.ts`
  matcher untouched. An anonymous browser sends no cookie ⇒ tokenless relay ⇒ server serves only public
  raw HTML (private/nonexistent = 404). The stale header comment was updated to match.

### 5. Toggle + badge (project detail) + dashboard badge
- `(app)/projects/[projectId]/page.tsx` — header now carries a `Badge` (`active`=Public / `idle`=Private,
  `chip`) + a new client island `visibility-toggle.tsx` (AppButton secondary sm, label "Make public"/
  "Make private"), wired to `setProjectVisibilityAction` in `actions.ts` (mint-action idiom:
  `requireIdentity()` outside try, status-mapped errors, `revalidatePath("/projects/[projectId]", "page")`).
  The current visibility is read off the existing `getProjectUsage` bundle — see **Deviations**.
- **Dashboard badge landed** (bounded discretion): the `/app/dashboard` rollup row is built from a
  Postgres `ProjectRecord` (`list_projects_for_tenant`, which carries `visibility`), so
  `server/dashboard_api.py` gained a `"visibility"` key (+ byte-mirror to
  `plugin/templates/kb/server/dashboard_api.py`; docstring shape updated), `KbDashboardProject.visibility`
  was added, and the dashboard projects table gained a Public/Private badge column. **Only** server change.

### 6. Copy-link island
- `web/src/components/copy-link-button.tsx` (`navigator.clipboard.writeText`, idle/copied/failed states,
  AppButton ghost sm) — builds `${window.location.origin}${path}` client-side. Used on the doc member
  branch (`/documents/{id}`) and the member `/graph` header (`/graph/{orgId}` from `identity.tenant.id`,
  skipped when the tenant is null). Labels from the new `SHARE` content module.

### 7. robots.ts
- Removed `/documents` and `/graph` from disallow; kept `/dashboard`, `/projects`, `/login`, `/signup`,
  `/api/`. `sitemap.ts` unchanged.

### 8. Content + tests
- New `web/src/content/share.ts` (`PUBLIC_SHELL`, `SHARE`); `project.ts` (`SET_VISIBILITY_ERRORS` +
  `PROJECT.visibility` badge/toggle/hint copy); `graph.ts` (`GRAPH.notFound`); `dashboard.ts`
  (`projects.columns.visibility` + `projects.visibility` labels); `index.ts` re-exports.
- `tests/session-guards.test.ts` — 3 new `optionalIdentity` cases (no cookie → null, no upstream call;
  dead cookie 401 → null; live session → context). `tests/raw-route.test.ts` — the old 401 case replaced
  by anonymous passthrough (tokenless call, no `Authorization` header) + upstream-404 member-or-anonymous;
  the 200-with-pinned-headers and bad-id cases kept.

## Validation (run in `web/`, exact outcomes)

| Command | Result |
| --- | --- |
| `pnpm lint` | **pass** (eslint, no warnings) |
| `pnpm typecheck` (`tsc --noEmit`) | **pass** (clean) |
| `pnpm test` (`vitest run`) | **pass — 8 files, 61 tests** |
| `pnpm test tests/session-guards.test.ts tests/raw-route.test.ts` | **pass — 2 files, 11 tests** |
| `pnpm build` (`next build`) | **pass** — `/documents/[id]` (ƒ) and `/graph/[org]` (ƒ) present; internal TS check passed |
| `python3 scripts/plugin_parity.py` (repo root; server file touched) | **PASS — plugin templates are in parity** |
| `python3 scripts/workflow.py validate` | **pass** (state integrity) |

Not claimed: end-to-end / deployed-stack smoke — that is S5's job.

### Note on typecheck
The first `pnpm typecheck` failed only on a **stale generated artifact** —
`.next/dev/types/validator.ts` (dated 7/18, from a prior `next dev` session) still imported the doc page
by its old `(app)/documents/[id]` filesystem path. `next build` regenerates `.next/types` cleanly; the
stale `.next/dev` dir (a local dev cache, absent on CI/fresh clone, gitignored) was deleted, after which
typecheck is clean. Not a code issue.

## Deviations from plan.md

1. **No separate `getProject` round-trip on the project page.** The plan said to fetch
   `getProject(token, projectId)` alongside usage via `Promise.all`. `getProjectUsage` already bundles
   `project` (serialized via `serialize_project`, which now carries `visibility`), so the badge + toggle
   read `usage.project.visibility` directly — no extra call. A sound simplification fully satisfying the
   intent (badge + toggle off the project's visibility); `revalidatePath` refreshes it after a toggle.
2. **`getProject` was reused, not added.** Plan point 3 listed a "new `getProject`"; it already existed
   in `app.ts` — reused as-is. Only `setProjectVisibility` was added.
3. **Public-graph page uses a typed `loadGraph` helper** (mirroring the doc page's `loadDocument`) instead
   of an inline `let graph` — cleaner control-flow typing, same behavior.

Everything else follows the plan as written. Two behaviors worth flagging (within plan scope, recorded in
`phase.md`): the moved not-found pages render **bare** (no `(public)` layout by design), so a member hitting
a genuinely-missing doc id sees the centered empty-state without app-shell chrome; and the ported
`GraphCanvas` tag-hub links still target the session-gated `/documents?tag=`, so an anonymous visitor
clicking a **tag hub** on a public graph lands on `/login` (the doc-node "Read" links work anonymously).
Both are noted as deferred niceties (login `returnTo`; anonymous tag browse).

## Doc impact (appended to phase.md for the review to consolidate)
- **`frontend.md`** — the `(public)` route group (optional-identity doc page + public graph page), `PublicShell`,
  project-detail visibility badge + toggle, dashboard badge column, the shared copy-link island, the
  `optionalIdentity()` guard + tokenless raw-HTML relay, and the `robots.ts` change.
- **`api.md`** — the `/app/dashboard` projects rollup rows gain a `visibility` field.
