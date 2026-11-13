# Plan — P19.S3 "Web public surfaces: visibility toggle + public doc/graph pages + share link"

Operator-approved 2026-07-22 (do-whole-phase, manual gate). Executor tier: `slice-executor-high` (risk `high` — the web public/private boundary + anonymous sandboxed relay).

Read `works/phases/active/P19/phase.md` first — especially the **S2 cross-slice notes** (the S3-facing read contract) and the **Constraints** (no design authoring: composition from existing designed pieces only; no new CSS, no new tokens, no new visual chrome beyond composing existing classes/components).

Server contract to compose against (done, committed): `GET /app/documents/{id}` + `/raw` are optional-identity (member-scoped or public-project reads; 404-never-403); `GET /app/graph?org={tenant_uuid}` is the public graph view; `PATCH /app/projects/{project_id}` `{"visibility":"private"|"public"}` session-only; `serialize_project` carries `visibility`. Web app dir: `web/` (Next.js 16 App Router, pnpm, Node ≥ 22.13).

## Grounded facts

- `(app)/layout.tsx` only gates identity and wraps children in `<AppShell identity={...}>`; AppShell requires a full `KbIdentity` (tenant name + email) — no anonymous path. `.kb-app` is the `[data-md-color-scheme]` ancestor the graph engine needs.
- `auth-guards.ts` has `requireIdentity` (cache'd, redirects) and `session.ts` has `getSession()` (token-or-null, :164-167); **no optional-identity helper exists**. `identity.tenant?.id` is the org UUID.
- Doc page (`(app)/documents/[id]/page.tsx`): one `requireIdentity()` line gates it; render = header + metadata strip + format branch (html → iframe `/api/documents/${id}/raw` with `sandbox="allow-scripts"`; else MarkdownBody); `ApiError` 404/400 → `notFound()`; static `metadata` export (deliberately no generateMetadata — keep it).
- Raw relay (`api/documents/[id]/raw/route.ts`): self-guards via `openSession(readSessionCookie(req))` → 401 when no cookie; relays `getDocumentRaw(token, id)`; re-asserts the 4 sandbox headers (`RAW_HTML_HEADERS` :34-40); `next.config.ts` per-path override matcher `"/api/documents/:id/raw"` stays untouched.
- `GraphCanvas({ data: KbGraph })` is a pure client component, no auth imports. Tag-hub links point at the session-gated `/documents?tag=` — accepted edge (see wrap-up).
- BFF wrappers support tokenless calls (`KbRequestOptions.token?`, `authHeaders(undefined)` → `{}`, `client.ts:53-61`), but `app.ts` `getDocument`/`getDocumentRaw`/`getGraph` declare `token: string` required and `getGraph` sends no query; no `getProject`/PATCH wrapper; `KbProject`/`KbDashboardProject` lack `visibility`.
- Project page header block (`projects/[projectId]/page.tsx:190-199`) is the toggle's home; `mint-credential-form.tsx` + its `actions.ts` are the client-island/server-action idiom (`requireIdentity()` outside try; `revalidatePath("/projects/[projectId]", "page")`; clipboard copy at :222-231).
- Dashboard projects table (`dashboard/page.tsx:44-94`) renders the `/app/dashboard` **rollup** (`KbDashboardProject`) — a serializer S1 did not touch.
- `Badge` status enum is closed (`active|idle|revoked`) — reuse `active`(Public)/`idle`(Private), chip variant; no new CSS. Copy strings live in `src/content/*`.
- `robots.ts` disallows `/documents`, `/graph` today; `sitemap.ts` lists only `/`. Login has no returnTo support.
- Validation: `pnpm lint` / `pnpm typecheck` / `pnpm test` (vitest; precedents `web/tests/raw-route.test.ts`, `session-guards.test.ts`) / `pnpm build`. No web CI — your local runs are the gate.

## Changes (pinned)

1. **`optionalIdentity` guard** (`web/src/lib/auth-guards.ts`): `cache(async (): Promise<AuthenticatedContext | null>)` — `getSession()` null ⇒ null; else `me(token)`; `ApiError` 401 ⇒ null (dead cookie = anonymous, mirroring server `optional_user`); other errors rethrow.

2. **New `(public)` route group** (URLs unchanged; no `(public)/layout.tsx` — pages compose their own shell):
   - **Move** `documents/[id]/` (page + not-found + explainer.css) from `(app)` to `(public)`; `/documents` list stays in `(app)`. Extract the existing doc rendering (header/metadata/format-branch) into a co-located shared server component `document-view.tsx` — refactor-in-place, **zero visual change** — then branch on `optionalIdentity()`:
     - ctx present → `getDocument(token, id)`; render `<AppShell identity={identity}>` + view (member experience unchanged incl. back-link; cross-org users transparently get public docs via the S2 server fallback). `ApiError` 404/400 → `notFound()` as today.
     - ctx null → `getDocument(undefined, id)`; `ApiError` 404/400 → **`redirect("/login")`** (uniform for all anonymous misses; no returnTo plumbing — deferred nicety). Success → render **PublicShell** + view.
   - **New `PublicShell`** (`web/src/components/public-shell.tsx`, server component): `.kb-app` scheme wrapper (`data-md-color-scheme="default"`) + `kb-topbar` with the brand block (BRAND logo/wordmark, `Link` → `/` — same markup as AppShell's brand block) + spacer + "Sign in" `Link` styled `appButtonClass("ghost","sm")` → `/login` + `<main id="main-content" className="kb-app-main">`. **Composition of existing classes/pieces only.** Copy strings in `src/content/`.
   - **New public graph page** `(public)/graph/[org]/page.tsx` + co-located `not-found.tsx` (modeled on the docs one): validate `org` param (UUID regex; malformed → `notFound()`), `optionalIdentity()`, `getGraph(token ?? undefined, { org })`; `ApiError` 404 → `notFound()` (never a login redirect here). Render PublicShell + eyebrow/title from `GRAPH` content (org-neutral) + `<GraphCanvas data={graph} />`.

3. **BFF plumbing** (`web/src/lib/knowledge/app.ts`, `types.ts`): `getDocument`/`getDocumentRaw` accept `token: string | undefined`; `getGraph(token: string | undefined, options?: { org?: string })` appends `?org=` (encodeURIComponent); new `getProject(token: string, id: string)` → `GET /app/projects/{id}` (returns `raw.project`); new `setProjectVisibility(token, id, visibility)` → `sendJson` PATCH `/app/projects/{id}`. Types: `KbProject.visibility: "private" | "public"`.

4. **Raw relay optional-identity** (`web/src/app/api/documents/[id]/raw/route.ts`): replace the 401 short-circuit with `const token = openSession(readSessionCookie(req)) ?? undefined;` then `getDocumentRaw(token, id)`; upstream 404 → 404 as today; `RAW_HTML_HEADERS` byte-identical.

5. **Toggle + badge (project detail page)**: fetch `getProject(token, projectId)` alongside usage (`Promise.all`). Header block gains a `Badge` (`active`=Public / `idle`=Private, `chip`) + new client island `visibility-toggle.tsx` (AppButton secondary sm; label "Make public"/"Make private") wired to new `setProjectVisibilityAction` in `projects/[projectId]/actions.ts` — `requireIdentity()` outside try, status-mapped errors, `revalidatePath("/projects/[projectId]", "page")` (the mint-action idiom).
   - **Dashboard badge — bounded discretion**: inspect `server/dashboard_api.py`. IF the projects rollup row is built with a Postgres `ProjectRecord` in hand, add the `visibility` key there (+ byte-mirror to `plugin/templates/kb/server/dashboard_api.py`, + `KbDashboardProject.visibility`, + a badge column in the dashboard columns array). ELSE skip the dashboard badge entirely and say so in result.md. **No other server changes are permitted in this slice.**

6. **Copy-link affordances** — one reusable client island `copy-link-button.tsx` (`navigator.clipboard.writeText`, copied/failed state per the mint-form pattern, AppButton ghost sm):
   - Doc page member branch (beside the back-link): copies `${window.location.origin}/documents/${id}`.
   - Member `/graph` page header: copies `${window.location.origin}/graph/${orgId}` (org id passed as prop from `identity.tenant.id`; skip rendering when tenant is null). Labels from a content module.

7. **`robots.ts`**: remove `/documents` and `/graph` from disallow; keep `/dashboard`, `/projects`, `/login`, `/signup`, `/api/`. `sitemap.ts` unchanged.

8. **Tests (vitest, terse)**: extend `web/tests/session-guards.test.ts` for `optionalIdentity` (no cookie → null; dead cookie (401) → null; valid → context) and `web/tests/raw-route.test.ts` for the anonymous passthrough (no cookie → upstream called tokenless + upstream 404 mapped to 404; valid cookie → token forwarded; sandbox headers asserted). Avoid new test files if these two cover it.

## Validation (run in `web/`, report exact outcomes)

- `pnpm lint` && `pnpm typecheck` && `pnpm test` (exact counts) && `pnpm build` (the real gate).
- If (and only if) the dashboard-badge server touch happened: `python3 scripts/plugin_parity.py` from the repo root → must print the PASS line.
- Do not claim end-to-end/manual smoke — that is S5's job on the deployed stack.

## Wrap-up

- Append to `phase.md`: cross-slice notes — the public web URL contract for S4/S5 (`/documents/{id}` optional-identity page; `/graph/{org_uuid}` public page; anonymous doc miss → `/login` redirect), whether the dashboard badge landed, deferred niceties (login returnTo; the public-graph tag-hub links land on the session-gated `/documents?tag=`). Doc impact line: `frontend.md` (public route group + PublicShell composition + toggle/copy-link + robots change); `api.md` only if the dashboard rollup gained `visibility`.
- Write `works/phases/active/P19/slices/P19.S3/result.md` from scratch.
- Return the structured verdict (verdict, summary, files_changed, validation, deviations, doc_impact). Never commit; never transition slice/phase status; never touch `docs/`.
