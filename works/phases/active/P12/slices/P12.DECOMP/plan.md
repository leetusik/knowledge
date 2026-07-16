# P12.DECOMP — Plan (decompose the Web App phase)

Orchestrator's native plan for the **`P12.DECOMP`** slice, executed by **`slice-executor-high`**. The executor's only job is to create P12's middle slices as **bare folders** and seed the phase notebook — **no `web/` code, no slice `plan.md`, no `doc-new-version`, no commits.** The S1–S6 implementation plans are written later, one at a time, at each slice's own turn.

## Context

P12 is knowledge's **first authenticated-frontend phase**. It builds the tenant dashboard + project detail pages (and the per-tenant read surfaces) as a **new Next.js app in a `web/` subdir**, modeled on `~/projects/personal/hi2vi_web` and — far more directly — on **vocky's already-built P4** (`~/projects/personal/vocky/web/`), which stood up the exact same phase against the same accounts/tenancy/usage API shape (knowledge's control plane was itself ported from vocky). "hi2vi_web-style" = stack + patterns + design gate, **not** repo topology.

The backend is a **pure JSON API** (FastAPI, single uvicorn worker + in-process `WRITE_LOCK`) with **bearer-only auth** (opaque session token returned in the JSON body, 30-day TTL, sha256-hex at rest) and **no CORS / cookies / CSRF / session middleware — by design**. The dashboard is a **session-token client** of `/auth/*` + `/app/*` only (never the `vk_`-keyed `/api/*` machine surface). The no-CORS wall is sidestepped by a **server-side BFF**: the browser talks only to the Next origin; Next calls `knowledge-api` server-to-server with `Authorization: Bearer`; the backend token is sealed into an httpOnly cookie. No backend CORS change is needed.

**Three operator scope decisions (confirmed at this decomposition):**
- **Per-tenant documents browse + search → IN P12** (mirror vocky's flagship read surface). The authenticated web app becomes the **per-tenant knowledge viewer**; the public mkdocs site stays tenant #1's public surface. (Per-tenant mkdocs sites do not exist today — other tenants' content is gitignored and in no build — so this is the "coexist-vs-replace the viewer" answer: per-tenant browsing lives in the app.)
- **Knowledge graph → MOVE INTO the web app** (per-tenant/per-project graph view), porting the existing canvas renderer + a new per-tenant graph-data path.
- **Production deploy → DEFERRED to P14** (the landing-page / Claude-design-gate phase). P12 builds functional pages + `output: "standalone"`, runnable via `pnpm dev` only; Dockerfile / compose / edge vhost land with the design gate in P14 (mirrors vocky: build in P4, deploy in P6).

**Knowledge-specific divergence from vocky (the load-bearing planning fact):** vocky's read surfaces already lived on `/app/*` (e.g. `/app/feedback`), so its web app needed **no** backend change. Knowledge's read surfaces do **not**: **documents live only on `/api/*`** (metered, `vk_`/session-bearer, scoped by project *name* string) and **the graph is a build-time mkdocs asset over `docs/` only**. So **P12's read slices (S5, S6) most likely ADD small session-scoped, tenant-scoped, *unmetered* `/app/*` read routes to the backend** (documents list/search; per-tenant graph data) rather than reuse the metered `/api/*`. That is a legitimate, isolated backend addition — it does **not** touch the D-P12-2 "no CORS" principle. The exact mechanism (new `/app` routes vs. metered `/api`) is each read slice's own planning-turn decision; DECOMP only records the open question.

The DECOMP slice's output is: **6 bare middle-slice folders + a fully seeded `works/phases/active/P12/phase.md`.**

## What the DECOMP executor (`slice-executor-high`) does — scope + guardrails

1. **Verify this plan's research against the current tree** — the `/auth/*` + `/app/*` endpoint shapes (below), that documents are NOT on `/app/*`, the graph asset paths, and the hi2vi_web/vocky template paths. Adjust the breakdown only if reality has drifted; otherwise keep the 6-slice shape below.
2. Run the six `new-slice` commands (bare folders only — **never** pre-fill any slice's `plan.md`).
3. Seed `phase.md`: fill **Context**, **Decomposition**, **Findings & Notes** (incl. decisions D-P12-1/2/3 + the anchors), **Constraints**, **Open Questions**, and start the **Doc impact** running list.
4. Run `python3 scripts/workflow.py validate`.
5. Write `result.md` (terse: slices-created table, phase.md sections seeded, validation result, any deviations) and append cross-slice notes to `phase.md`. Return a verdict.
   - **No** `web/` code, **no** slice `plan.md`, **no** `doc-new-version`, **no** commits (the orchestrator commits).

## Proposed slice breakdown (6 middle slices)

Foundation chain **S1 → S2**, then a **fan-out** of four surfaces (**S3, S4, S5, S6**) that each need only the S2 shell + authed client and are otherwise independent (any order after S2). One `high` (the auth/BFF boundary); the rest `medium`; none `low` (nothing is fully mechanical). Mirrors the house foundation-then-fan-out pattern with the one security-sensitive slice at the top tier.

- **P12.S1 — App scaffold + design-system foundation** · `medium` · order 1
  Stand up the Next.js 16 / React 19 / TS app in `web/` (pnpm, Tailwind v4 CSS-first `@theme`, ESLint/Prettier, `next.config.ts` `output: "standalone"`, runnable via `pnpm dev`). Port the design system — **most directly from vocky's `web/`** (already adapted from hi2vi_web for a dashboard), with hi2vi_web as upstream: the `@theme` token system (colors/fonts/type scale/radius; **no dark-mode toggle** — explicit surface tokens), `cn()` (`clsx` + **extended `tailwind-merge`** registering the custom `text-*` scale — load-bearing), self-hosted `next/font` (Noto Sans KR + JetBrains Mono), the CVA primitive set (`button`, `card`, `section`, `field`, `badge`, `grid`) **plus the `data-table` primitive** (lists of projects/credentials/documents need it), and the copy-as-data `src/content/` convention. Scaffold `web/design/canvas/` (tokens mirror + a couple of section cards + `_ds_manifest.json`) for the **deferred-to-P14** design gate. **Neutral placeholder palette** (token *names* kept swappable). Purely presentational — no backend calls yet.
  _Rationale:_ the load-bearing foundation every page builds on; templated but needs adaptation, so `medium`, not `low`.

- **P12.S2 — Auth + BFF proxy + authenticated app shell** · `high` · order 2 · depends P12.S1
  The security-sensitive core and the whole server-side data layer. Typed **server-side knowledge API client** (server-only base-URL env, `getJson`/`sendJson`, `ApiError`, bearer injection, **every call `cache: "no-store"`** — per-user data must never hit Next's fetch cache; normalize the signup-`tenant`(singular)/login-`tenants[]`(plural) asymmetry to `tenants[0]`, solo-owner MVP). **BFF auth flow**: signup + login pages → Next server calls knowledge `/auth/signup|login` → seal the returned token into an **AES-256-GCM httpOnly `SameSite=Strict` cookie** (key `sha256(SESSION_SECRET)`, `{token, exp}`, 30-day TTL matching the backend, `Secure` in prod) the Next app sets for itself, never exposed to browser JS → server guards (a `requireIdentity` analog that verifies live via `GET /auth/me`, wrapped in React `cache()`; + same-origin check) gating `/app` routes → logout clears the cookie + calls `/auth/logout` → redirect-to-`/login` on backend 401/expiry (the `(auth)` bounce **re-verifies against `/auth/me`** to avoid a revoked-cookie ping-pong). One audited BFF pipeline for the public mutations (415 → 403 same-origin → 429 per-IP → 400/422 zod → backend → seal → `{ok}`; backend `detail` never echoed, preserving enumeration-safety; login throttled stricter than signup). **Authenticated app shell** (sticky topbar: brand · tenant/workspace · user email · logout; over `[rail | main]`) that S3–S6 render inside; rail links to not-yet-shipped routes render as muted "Soon", never 404s. No web-side DB.
  _Rationale:_ auth boundary + sealed-cookie sealing + BFF token wiring = the riskiest slice → top tier.

- **P12.S3 — Tenant dashboard: projects + create + tenant usage** · `medium` · order 3 · depends P12.S2
  Post-login home. Projects list + create-project (`GET|POST /app/projects`); tenant usage summary (`GET /app/usage?days=30`: `totals{total, documents_created, documents_deleted, searches}` + zero-filled daily trend + project list). Reuse the vocky **usage components** (`stat-tiles`, dependency-free inline-SVG `trend-chart` — `maxTotal` floored at 1, empty-series + all-zero handling, `aria-label`/sr-only summary) generic over knowledge's metric-counts shape. Server components via S2's authed client; create-project is a **server action** (+ `useActionState` island + `revalidatePath`). Tenant name comes from the S2 shell's cached `/auth/me` (no extra `GET /app/tenant` round-trip). Render the project list from `/app/projects` (canonical), not `usage.projects` (narrower serializer).
  _Rationale:_ read + one create + derived-metrics rendering → `medium`.

- **P12.S4 — Project detail: info + credentials + project usage** · `medium` · order 4 · depends P12.S2
  Per-project page. Project info (`GET /app/projects/{id}`); **credentials management** — `POST` mint with a **show-once `vk_` key** modal (returned once at mint; never re-render/log it), `GET` list metadata (incl. revoked; never the hash), `DELETE` soft-revoke (`/app/projects/{id}/credentials[/{cid}]`); project usage (`GET /app/projects/{id}/usage?days=30`, surfacing each key's `last_used_at`). Adds the project→detail link to the dashboard's project rows. **404-never-403** on foreign/cross-tenant ids (backend-enforced). Authed mutations are **server actions** (call `requireIdentity()` **outside** the action's `try` — it `redirect()`s by throwing; a `"use server"` file exports **only** async functions).
  _Rationale:_ CRUD + credential mint/revoke UX; boundary backend-enforced → `medium` (may bump to `high` at its planning turn if the show-once credential handling proves riskier).

- **P12.S5 — Per-tenant documents browse + search** · `medium` · order 5 · depends P12.S2
  The per-tenant knowledge viewer (vocky's flagship-read-surface analog). Per-project document list + a document detail/read view + search, scoped to the tenant/project. **Key open question resolved at this slice's planning turn:** documents are **not** on `/app/*` today — either (preferred) **add small session-scoped, tenant-scoped, *unmetered* `/app` read routes** to the backend (e.g. `GET /app/documents`, `GET /app/documents/{id}`, `GET /app/search`) so web-UI browsing does **not** pollute the metered usage counts, **or** call the existing **metered** `/api/documents` + `/api/search` with the session bearer (tenant mode → `tenants[0]`), accepting that web-UI searches inflate the `searches` metric. Also handle the control-plane `project` UUID ↔ content-plane `project` *name* bridge (documents filter by name string). **Read + search only.**
  _Rationale:_ read + search rendering + a likely small backend read-route addition → `medium` (may bump to `high` if the backend routes/search prove nontrivial).

- **P12.S6 — Knowledge graph in the web app (per-tenant)** · `medium` · order 6 · depends P12.S2
  Move the graph into the app as a per-tenant (optionally per-project) view. Two parts, both to be designed at this slice's planning turn: (1) a **per-tenant graph-data source** — today `scripts/graph_hook.py` emits `graph.json` from `docs/` frontmatter (`related:` edges + `tags`) at mkdocs build, **tenant #1 only**; per-tenant data must come from the content plane, most likely via a **new session-scoped `/app` graph endpoint** (e.g. `GET /app/graph` / `GET /app/projects/{id}/graph`) reusing the hook's inversion logic over a tenant's documents; and (2) **porting the ~1130-line zero-dependency `<canvas>` force-sim renderer** (`docs/javascripts/graph.js`) into a React client component wired through the BFF. **This is the slice most likely to bump to `high` at its planning turn** — a novel canvas-in-React port + a graph-data path that does not exist yet — but it is a port of proven code with a clear boundary, so DECOMP rates it `medium` and preserves the bump-up option.
  _Rationale:_ a substantial but bounded port of existing, working graph code + a new per-tenant data route → `medium`, flagged as the top bump-to-`high` candidate.

**Why 6 (above the 2–4 house range):** standing up a whole app is inherently large; vocky's equivalent was 5 ("top of the range but justified for a whole app"). P12 = vocky's 5 surfaces (scaffold / auth+BFF+shell / dashboard / project-detail / read-surface) **plus** the net-new **graph** the operator explicitly moved into the app. S1/S2 split by both risk and concern (design system vs. auth security). S3/S4/S5/S6 are four distinct surfaces with distinct API sets — merging any pair makes an oversized slice. The executor **may keep the 6-slice shape** as-is; it is deliberate.

## Decisions to record (Findings & Notes → Decisions)

- **D-P12-1 — App location.** The app is a **subdirectory `web/` in this repo**, versioned/committed by the existing workflow engine. "hi2vi_web-style" = stack/patterns/design-gate, not repo topology.
- **D-P12-2 — Browser↔API boundary.** A **Next.js server-side BFF proxy**. Next calls `knowledge-api` server-to-server with `Authorization: Bearer`; the browser only ever talks to the Next origin; the backend session token lives in a **sealed AES-256-GCM httpOnly cookie**, never in browser JS; **no web-side DB, no backend CORS change.** (Adding session-scoped `/app` *read* routes for documents/graph in S5/S6 is orthogonal to this — it extends the control-plane API, not the CORS/origin model.)
- **D-P12-3 — Design gate + deploy.** P12 **ports** the design system + builds **functional** pages against a **neutral placeholder palette** (names swappable), scaffolds `web/design/canvas/`, but **defers the intensive Claude design-gate session AND production deploy to P14**. S1 sets up only local-dev-runnable + `output: "standalone"`.
- **Scope decisions (operator-confirmed):** per-tenant **documents browse+search is in P12** (the web app is the per-tenant knowledge viewer; public mkdocs stays tenant #1's); the **graph moves into the web app** (per-tenant); **deploy is P14**.

## Implementation anchors (so downstream slice plans start grounded)

- **Knowledge session API — the surfaces the app consumes** (from `server/`, verify current):
  - `server/auth_api.py` — `POST /auth/signup` → 201 `{token, user, tenant}` (singular); `POST /auth/login` → 200 `{token, user, tenants:[…]}` (plural, generic 401); `POST /auth/logout` → 204 (bearer optional); `GET /auth/me` → `{user, tenants:[…]}`. Opaque `secrets.token_urlsafe(32)`, 30-day TTL, token in JSON body, sha256-hex at rest.
  - `server/app_api.py` — `GET /app/tenant`; `GET|POST /app/projects` (POST `{name}` → 201); `GET /app/projects/{id}` (404 cross-tenant); `POST /app/projects/{id}/credentials` (`{name?}` → 201 `{credential, key:"vk_…"}`, key once); `GET /app/projects/{id}/credentials` (incl. revoked, never hash); `DELETE …/credentials/{cid}` → 204 soft-revoke. Serializers `serialize_project`/`serialize_credential`.
  - `server/usage_api.py` — `GET /app/usage?days=1..365` → `{window, totals{total, documents_created, documents_deleted, searches}, daily_counts[](zero-filled), projects}`; `GET /app/projects/{id}/usage?days=…` → same + `project` + `credentials`.
  - Session guard `server/accounts/auth.py::require_user` (bearer → sha256 → active session → user → `tenants[0]`; generic 401; solo-owner MVP). Two-mode `/api/*` resolver `server/api_auth.py` (a session token resolves to `tenants[0]` in tenant mode — relevant only if S5 uses the metered `/api/*`).
  - **NOT on `/app/*` today (S5/S6 add read routes):** documents (only `GET /api/documents` / `GET /api/search`, metered, scoped by project *name*) and per-tenant graph data (only `scripts/graph_hook.py` build-time over `docs/`).
- **Graph assets to port (S6):** `scripts/graph_hook.py` (PyYAML-only `related`+`tags` inversion → `graph.json`; must not import `server/*`), `docs/javascripts/graph.js` (~1130-line zero-dep `<canvas>` force sim), `docs/graph.md` (`.kb-graph` mount), styling in `docs/stylesheets/extra.css` §10.
- **vocky `web/` — the near-verbatim template** (`~/projects/personal/vocky/web/src/`): `lib/session.ts` (sealed AES-256-GCM cookie), `lib/bff.ts` (audited auth pipeline), `lib/auth-guards.ts` (`requireIdentity` + `cache()`), `lib/vocky/{client,auth,app,types}.ts` (typed API-client seam; swap base-URL env + `/auth`+`/app` response types), `components/ui/data-table.tsx`, `components/usage/{stat-tiles,trend-chart}.tsx`, `components/app-shell/*`, `app/(auth)/*`, `app/(app)/*`, `app/api/auth/*/route.ts`. Two server-only env keys → for knowledge: `KB_API_BASE_URL` + `SESSION_SECRET` (neither `NEXT_PUBLIC_`, lazy-read so `next build` needs no env). Its P4 record: `~/projects/personal/vocky/works/phases/active/P4/phase.md`.
- **hi2vi_web upstream** (`~/projects/personal/hi2vi_web`): `src/app/globals.css` (`@theme` tokens), `src/components/ui/*` (CVA primitives), `src/lib/utils.ts` (`cn` + extended tailwind-merge), `next.config.ts`/`Dockerfile`/`compose.prod.yml`/`deploy/edge/*.conf` (the **P14** standalone-Docker-behind-shared-`edge` deploy reference).

## phase.md seeding (what to write into the notebook)

- **Context:** greenfield-authenticated-frontend framing; the BFF/subdir/design-gate+deploy decisions; the pure-JSON/no-CORS backend and the session-vs-`vk_` surface split; the knowledge-specific divergence (read surfaces not yet on `/app/*` → S5/S6 likely add `/app` read routes).
- **Decomposition:** intro para (foundation-chain S1→S2 + fan-out S3–S6) → the six per-slice bullets above → the "Why 6" split-rationale para.
- **Findings & Notes:** Decisions **D-P12-1/2/3** + the scope decisions; the **Implementation anchors** above (knowledge endpoints + graph assets + vocky/hi2vi_web template paths).
- **Constraints:** session-token client of `/auth/*`+`/app/*` only (never `vk_` `/api/*` from the app's own auth); BFF boundary (sealed httpOnly cookie, no browser-JS token, **no CORS change**, no web-side DB); credential plaintext (`vk_`) shown **exactly once**; **404-never-403** on foreign ids; usage derived / 30-day default (no billing); Tailwind-v4 `@theme`, **no dark-mode toggle**, copy-as-data `src/content/`; placeholder palette (swappable); scaffold `design/canvas/` but **defer the heavy design gate AND deploy to P14** (S1 = local-dev + `output: standalone` only); **web-UI document browsing should stay unmetered** (prefer new `/app` read routes over the metered `/api/*`); **DECOMP writes no app code**.
- **Open Questions:** (a) S5 documents-read mechanism — new unmetered `/app` read routes vs. metered `/api/*` (+ the project name↔UUID bridge); (b) S6 graph-data source — new `/app` graph endpoint reusing `graph_hook.py` logic over content-plane docs vs. another path, and per-tenant vs. per-project scope; (c) `KB_API_BASE_URL` local-dev target (host `:8766` vs container `:8000`) — a P14 concern; (d) whether the graph slice (S6) should spin into a follow-up if S1–S5 reveal the phase is oversized (escape hatch; default: keep in P12 per operator).
- **Doc impact (running list for P12.REVIEW to consolidate — executor confirms exact doc names/versions against `docs/index.json`):**
  - `frontend.md` — **new version** (extends the existing mkdocs/graph frontend doc, not authored fresh): the ported design system (`@theme` tokens, `cn`, CVA primitives + `data-table`), the `web/` app structure, the BFF + auth/session model, and the component/page inventory (dashboard, project detail, documents browse, in-app graph).
  - `architecture.md` — new version: separate-origin Next.js app + server-side BFF proxy as knowledge's **authenticated** browser surface (sealed httpOnly cookie, no CORS, no web-side DB); the new session-scoped `/app` read routes for documents/graph; the app as the **per-tenant knowledge viewer** (resolves the "coexist-vs-replace mkdocs viewer" question).
  - `api.md` — new version **if** S5/S6 add `/app` read routes (documents/search/graph): document them.
  - `experience.md` (if present) — the dashboard / project-page / documents-browse / graph UX.
  - `decisions.md` — D-P12-1/2/3 + the docs-browse-in-app / graph-in-app / deploy-in-P14 scope decisions.
  - `operations.md` — web-app build/run stub (`pnpm dev`, `output: standalone`); full production deploy = **P14**.
  - `product.md` (if present, possibly) — the authenticated web app as the primary user surface; all web-UI features free.

## Exact commands the executor runs

```
python3 scripts/workflow.py new-slice --phase P12 --slice P12.S1 --name "App scaffold + design-system foundation" --kind implementation --risk medium --order 1
python3 scripts/workflow.py new-slice --phase P12 --slice P12.S2 --name "Auth + BFF proxy + authenticated app shell" --kind implementation --risk high --order 2 --depends-on P12.S1
python3 scripts/workflow.py new-slice --phase P12 --slice P12.S3 --name "Tenant dashboard: projects + create + tenant usage" --kind implementation --risk medium --order 3 --depends-on P12.S2
python3 scripts/workflow.py new-slice --phase P12 --slice P12.S4 --name "Project detail: info + credentials + project usage" --kind implementation --risk medium --order 4 --depends-on P12.S2
python3 scripts/workflow.py new-slice --phase P12 --slice P12.S5 --name "Per-tenant documents browse + search" --kind implementation --risk medium --order 5 --depends-on P12.S2
python3 scripts/workflow.py new-slice --phase P12 --slice P12.S6 --name "Knowledge graph in the web app (per-tenant)" --kind implementation --risk medium --order 6 --depends-on P12.S2
python3 scripts/workflow.py validate
```

## Verification (DECOMP writes no code)

- `python3 scripts/workflow.py validate` passes.
- `python3 scripts/workflow.py next` shows **`P12.S1`** as current (order 1), `P12.REVIEW` last.
- `works/backlog.md` lists P12.S1–S6 with the risk/order/depends above; each new slice folder holds **only `slice.json`** (no `plan.md`/`result.md`).
- `phase.md` has all sections seeded (Context, Decomposition, Findings & Notes, Constraints, Open Questions, Doc impact).
- No files created under `web/`; no new `docs/versions/*`; no commit made by the executor.
