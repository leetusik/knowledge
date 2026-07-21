# P12.S4 — Project detail: info + credentials + project usage

## Context

Fourth slice of P12 (knowledge's authenticated web app). S3 shipped the dashboard, whose projects
table links each row's "Open" to `/projects/<id>` — a route that does not exist yet. **S4 builds that
route**: the per-project page showing project info, **credential management** (mint a show-once `vk_`
key · list · revoke), and that project's usage.

**S4 is frontend-only — no backend change.** Every endpoint it needs already exists (`GET
/app/projects/{id}`, `GET|POST|DELETE /app/projects/{id}/credentials[/{cid}]`, `GET
/app/projects/{id}/usage`), verified in `server/app_api.py` + `server/usage_api.py`. The
near-verbatim functional template is **vocky's project page**
(`~/projects/personal/vocky/web/src/app/(app)/projects/[projectId]/*` + `lib/vocky/app.ts`/`types.ts`
+ `content/project.ts`), retargeted to knowledge's API shapes + the settled Knowledge Base design.

**Executor tier: `slice-executor-high`.** Frontend-only, but the **show-once credential-plaintext
handling** is the security-sensitive core (the `vk_` key is returned once and must never be logged,
cached, persisted, URL'd, or re-rendered), and the show-once modal's behavior must be **built from
scratch** (see the design note). Top tier is the safe ceiling (in `flex` mode mid and high are the
same model/effort, so this costs nothing extra).

**Deltas omitted** (consistent with the S3 operator decision): the project-usage stat tiles render the
four figures with no month-over-month delta — no prior-period data exists.

## Design note — no project-detail specimen (compose the delivered system)

The KB design handback delivered **only two page specimens** (dashboard + login) — there is **no**
project-detail card. But the full `.kb-*` component vocabulary *is* designed (status encoding, the
`.kb-reveal*` show-once modal styling, `.kb-dtable`, `.kb-field*`, `.kb-appbtn*`, tiles, trend), and
`APP_BRIEF.md` explicitly lists "project detail" as an intended surface on this vocabulary. So the page
is a **faithful composition of already-designed components** following the dashboard card's established
patterns (shell · `.mainhead` header · `.kb-tile-grid` · trend `.kb-panel` · `.kb-dtable`) + vocky's
project-page structure — applying the delivered system, **not inventing new design**. This is flagged
for the phase review; a future design pass can refine the project-page composition if wanted.

## Route + data flow

Route group `web/src/app/(app)/projects/[projectId]/` (segment `[projectId]` to match vocky's
`revalidatePath("/projects/[projectId]", "page")`; the S3 "Open" link `/projects/<uuid>` resolves to
it — S4 makes that link live). Files: `page.tsx` (server component), `actions.ts` (`"use server"` mint
+ revoke), `mint-credential-form.tsx` (client island + the show-once modal), `revoke-credential-button.tsx`
(client, inline confirm), and `not-found.tsx`.

**Single fetch (cleaner than vocky's two):** knowledge's `GET /app/projects/{id}/usage` payload
bundles **`project`** *and* **`credentials`** (both via the same serializers) alongside
`window`/`totals`/`daily_counts` (confirmed `server/usage_api.py:145-148`) — vocky's did not include
`project`, forcing a second call. So the page makes **one** call, `getProjectUsage(token, projectId)`,
and reads `.project` (header), `.credentials` (table), and the usage (tiles/trend) from it. Follow
vocky's guard structure exactly:
- Call `requireIdentity()` and destructure `token` **OUTSIDE** any `try` (it `redirect()`s by throwing).
- Wrap the fetch in a dedicated `loadProject()` helper that maps `ApiError` **404 or 400 → `notFound()`**
  (missing / cross-tenant / non-UUID all become the branded not-found; 404-never-403 is backend-enforced),
  and rethrows anything else — `notFound()` also signals by throwing, so it must live outside a catch
  that would swallow it. A 401 never reaches here (the guard already redirected).
- Static `metadata = { title: PROJECT.title }` (no `generateMetadata` — every fetch is `no-store`).

## Client seam + types (extend, don't recreate)

**`web/src/lib/knowledge/app.ts`** (S3 created this) — add: `getProject(token, id)` → `GET
/app/projects/{id}` → `KbProject`; `createCredential(token, id, name?)` → `POST
.../credentials {name?}` → **returns the whole `{credential, key}` envelope** (never unwrap — `key` is
the one-time plaintext); `revokeCredential(token, id, cid)` → `DELETE .../credentials/{cid}` (204);
`getProjectUsage(token, id)` → `GET .../usage` → `KbProjectUsage`. `encodeURIComponent` every path id;
`token` first arg; `cache:"no-store"`; branch on `ApiError.status`.

**`web/src/lib/knowledge/types.ts`** — add `KbCredential {id, project_id, name:string|null,
token_prefix, created_at, last_used_at:string|null, revoked_at:string|null}`; `KbMintedCredential
{credential:KbCredential, key:string}`; `KbProjectUsage {window, totals, daily_counts, project:KbProject,
credentials:KbCredential[]}` (reuse S3's `KbUsageWindow`/`KbUsageTotals`/`KbDailyCount`).

## Page layout (vertical stack, `.kb-app-main`; shell already wraps it)

1. **Header** (`.mainhead`-style flex, reproduced as Tailwind arbitrary-value utilities like S3): eyebrow
   (e.g. `Workspace · Project`) + `.kb-app-title` (Fraunces) = the project **name** (knowledge projects
   have a single `name`; the dashboard mock's slug+chip was illustrative) + `.kb-app-sub` (created date).
2. **Project usage** — **reuse S3's `components/usage/` `StatTiles` + `TrendChart` as-is** (they are
   presentational/props-only). Four tiles from `usage.totals` (documents_created / searches /
   documents_deleted / derived Active = created−deleted), **no deltas**; the trend `.kb-panel` over
   `usage.daily_counts.map(d => d.searches)` with the heading + caption. One usage block per page → no
   `kb-trend-fill` gradient-id collision (the S3 note's concern was two charts on one page); if the
   component now requires a unique id prop, pass one.
3. **Credentials section** — a `.kb-panel`: head "API keys" + a **"New key"** `.kb-appbtn--primary`
   button that toggles the inline mint form (the S3 create-project disclosure pattern), then the
   `.kb-dtable` credentials table. Columns: **Name** (name, or italic-hint "Unnamed key") · **Key**
   (`token_prefix…`, mono — never the full key) · **Status** (see below) · **Created** (mono) · **Last
   used** (mono, or "Never" when null) · **Action** (Revoke, right). Empty state via `DataTable`'s
   `empty`.

## Credential status — 3-state (design-faithful, beyond vocky's 2)

Knowledge's KB design ships a **three-state** status vocabulary (`.kb-status--active/idle/revoked`,
form-encoded: filled teal dot / hollow amber ring / struck terracotta), and the existing
`components/ui/badge.tsx` `Badge` already supports `status: "active"|"idle"|"revoked"`. Derive per
credential (vocky rendered only 2 states — knowledge does the fuller, designed 3):
- `revoked_at != null` → **revoked**
- else `last_used_at != null` → **active**
- else (never used) → **idle**

Put this derivation in a tiny pure helper and unit-test it (terse) — it is the one bit of real logic.

## Mint + the show-once key modal (the security-sensitive core)

Port **vocky's mint mechanics verbatim**, restyled to the designed `.kb-reveal*` overlay:
- **`actions.ts` `mintCredentialAction`** (`"use server"`): validate `projectId` (uuid) + optional
  `name` (`z.string().max(200).optional()`; blank/whitespace → omitted → knowledge stores null);
  `requireIdentity()` **outside** the `try`; call `createCredential`; on error map **by HTTP status**
  (401→sessionExpired, 404→notFound, 400/422→invalidName — knowledge answers body-validation as **422**;
  else generic); on success `revalidatePath("/projects/[projectId]", "page")` (route pattern +
  `"page"`) and return `{ error:null, key: minted.key, ok: <stamp> }`. The plaintext key rides back
  **only in the action-state return** — the one sanctioned server→client crossing.
- **`mint-credential-form.tsx`** (`"use client"`): `useActionState`; `INITIAL_STATE` lives here (a
  `"use server"` file exports only async fns). Show the modal when `state.key` is present and
  `state.ok !== dismissedAt` — **dismissal keyed by the `ok` stamp, not a boolean** (a boolean would
  swallow the next minted key). The name input is not `required` (unnamed keys are first-class).
- **`ShowOnceKey` modal** — a private component styled with the designed `.kb-reveal*` classes
  (`.kb-reveal-overlay` scrim → `.kb-reveal` panel → `.kb-reveal__title` + `.kb-reveal__warn` amber
  caution with the hollow idle dot + `.kb-reveal__key`/`__code` mono `select-all` key + `.kb-reveal__actions`
  Copy/Dismiss). **Behavior must be built (the handback ships no reveal JS and `.kb-reveal-overlay` is
  `position:absolute`):** render it as a real viewport modal (fixed-position portal, or a positioned
  wrapper), with `role="dialog"` + `aria-modal`, focus-trap, **Escape-to-dismiss**, and focus return —
  a11y the inline vocky card didn't need. Copy via `navigator.clipboard.writeText` with a
  select-all/manual-copy fallback on failure (**never log the key in the catch**).
- **Security invariants (preserve exactly):** the `vk_` plaintext exists **only** in client action-state
  and the one-time RSC action response; it is **never** logged, cached (`no-store`), persisted, placed
  in a URL/storage, or written into the server-rendered tree; the list endpoint only ever returns
  `token_prefix`. Put these invariants in the executor dispatch prompt.

## Revoke

**`revokeCredentialAction`** (`"use server"`): validate both uuids; `requireIdentity()` outside the
`try`; `revokeCredential`; status-mapped errors; `revalidatePath("/projects/[projectId]", "page")`.
Revoke is an idempotent **stamp** (sets `revoked_at`, 204) — the row **stays listed** and its badge
flips to Revoked on the revalidated render. **`revoke-credential-button.tsx`** (`"use client"`): a
two-step **inline confirm** (not `window.confirm`), ids as hidden inputs, `.kb-appbtn--danger`
(knowledge HAS the terracotta danger variant — more faithful than vocky's "secondary"); already-revoked
rows render no action.

## Copy + not-found

- **`web/src/content/project.ts`** (new, barrel-exported) — mirror vocky's `PROJECT` copy module +
  the status-keyed `MINT_CREDENTIAL_ERRORS` / `REVOKE_CREDENTIAL_ERRORS`. Load-bearing: the show-once
  **warning** ("the only time this key is shown; it cannot be recovered — revoke and re-create if
  lost") and the revoke confirm prompt.
- **`not-found.tsx`** — a small branded not-found using the designed **`.kb-empty`** empty-state
  classes (title + sub + a back-to-dashboard link), rather than Next's raw default.

## Design fidelity — RESPECT THE DESIGN

Compose only from the designed `.kb-*` vocabulary + `--kb-*` tokens (`.kb-dtable`, `.kb-status--*`,
`.kb-reveal*`, `.kb-field*`, `.kb-appbtn--{primary,danger,ghost,sm}`, `.kb-panel`, `.kb-tile*`,
`.kb-trend*`, `.kb-empty`); `lucide-react` icons; never re-derive colors or invent styling. Ship the
show-once modal, the 3-state status, and the danger-revoke exactly as the system designs them. The one
sanctioned open area is the page **composition** (no specimen) — follow the dashboard patterns + vocky
structure. Reference: `web/design/canvas/components/console/console.css` (`.kb-reveal*`, `.kb-status*`)
+ `pages/app-dashboard.card.html` (shell/header/tiles/trend/table patterns).

## Verification (executor runs before returning `done`)

- `pnpm --dir web typecheck` · `pnpm --dir web lint` · `pnpm --dir web test` (add a **terse** unit test
  for the credential-status-derivation helper — active/idle/revoked edge cases; the `console-trend`/auth
  tests stay green) · `pnpm --dir web build` (`/projects/[projectId]` compiles as a dynamic route).
- **End-to-end (smoke):** if a backend + seeded session is available, open a project from the
  dashboard, mint a key (verify it shows once + copy works + it never reappears after dismiss/reload),
  revoke it (row flips to Revoked), and confirm a bad id → the branded not-found. Otherwise note that
  interactive E2E is left to the phase review (same no-host-Postgres limitation as S3). The orchestrator
  runs `python3 scripts/workflow.py validate` (state integrity) after the `done` verdict.

## Doc impact (executor appends to `phase.md`; the REVIEW consolidates into doc versions)
- `frontend.md` — the project-detail page + the `lib/knowledge/app.ts` credential/project functions +
  the show-once `.kb-reveal` modal + the 3-state credential status + per-project usage reuse.
- `experience.md` — the project-detail UX (info · mint show-once key / copy / revoke-with-confirm ·
  per-project usage) and the 3-state key status.
- (**No `api.md`** — S4 adds no backend surface.)

## Out of scope (deferred)
- Stat-tile deltas (omitted — no prior-period data).
- Project rename/delete/management (DECOMP scoped "project info", not lifecycle management).
- Live per-project document totals (the content-plane UUID↔name bridge is **S5**).
- Documents browse/search (**S5**) and the in-app graph (**S6**).

## Critical files
- **New:** `web/src/app/(app)/projects/[projectId]/{page.tsx,actions.ts,mint-credential-form.tsx,revoke-credential-button.tsx,not-found.tsx}`;
  `web/src/content/project.ts`; a terse `web/tests/*.test.ts` for the status helper.
- **Edit:** `web/src/lib/knowledge/app.ts` (+ project/credential functions); `web/src/lib/knowledge/types.ts`
  (+ credential/project-usage shapes); `web/src/content/index.ts` (barrel).
- **Reuse as-is:** `web/src/components/usage/{stat-tiles,trend-chart}.tsx` (S3), `web/src/components/ui/{data-table,badge,app-button,field}.tsx`, `web/src/lib/auth-guards.ts`.
- **Templates/spec (read-only):** vocky `~/projects/personal/vocky/web/src/app/(app)/projects/[projectId]/*`
  + `lib/vocky/{app,types}.ts` + `content/project.ts`; `web/design/canvas/components/console/console.css`
  (`.kb-reveal*`, `.kb-status*`, `.kb-dtable`, `.kb-field*`) + `pages/app-dashboard.card.html`.
