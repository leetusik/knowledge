# P12.S2 — Result (Auth + BFF proxy + authenticated app shell)

Built the security-sensitive core: the server-side knowledge API client, the sealed-cookie BFF auth flow (signup/login/logout), the page guards, and the authenticated app shell — functional/security layer ported faithfully from vocky, design skinned to hi2vi_web's real authenticated-area design. No commits, no doc versions, no status transitions.

## What was built

**Functional/security layer (ported from vocky `web/src/`, identity-renamed):**
- `src/lib/env.ts` — server-only lazy env readers: `readKbApiEnv` (`KB_API_BASE_URL`) + `readSessionEnv` (`SESSION_SECRET`); errors name keys, never values.
- `src/lib/session.ts` — the sealed cookie, **ported verbatim** except the name → cookie `knowledge_session`; AES-256-GCM, key `sha256(SESSION_SECRET)`, IV `randomBytes(12)`, 16-byte tag, envelope `v1.<iv>.<ct>.<tag>` base64url, payload `{token, exp}`, TTL 30d (`Max-Age=2592000`), attrs `httpOnly/sameSite=strict/secure(prod-only)/path=/`. `openSession` returns `null` for any failure (tamper/expiry/unset-secret), never throws. Exports `getSession`/`requireSession`(→`redirect("/login")`)/`readSessionCookie`/`assertSameOrigin`.
- `src/lib/knowledge/{types,client,auth}.ts` — renamed from `lib/vocky/*`, `Kb*` prefix. `types.ts` is the **S2 subset only** (`KbUser`/`KbTenant`/`KbSession`/`KbIdentity`) — `app.ts` and S3+ types deliberately not ported. `client.ts`: `ApiError{status,detail}`, `getJson`/`getRaw`/`sendJson`, absolute URL from `KB_API_BASE_URL` (trailing slash stripped), bearer injection, **every call `cache:"no-store"`**, 204→undefined. `auth.ts`: `activeTenant`/`normalizeAuthResponse` (collapse signup singular-`tenant` / login plural-`tenants[]` → `tenants[0]`), `signup`/`login`/`logout`(fire-and-forget)/`me`.
- `src/lib/client-ip.ts` + `src/lib/rate-limit.ts` — ported verbatim (per-process sliding window incl. the cross-window prune-by-own-`windowMs` fix).
- `src/lib/bff.ts` — the audited pipeline, stages `415 → 403 → 429(before parse) → 400 → 422(zod email min1 max320 / password min1 max1024) → 502/500 → 200`; body always `{ok}`, backend `detail` never echoed; rate key `${bucket}:${ip}`; success `sealSession` + `Set-Cookie`.
- `src/lib/auth-guards.ts` — `requireIdentity = cache(…)` (`requireSession` → live `GET /auth/me`; **catch: only `ApiError` 401 → `redirect("/login")`, everything else rethrown**); `redirectIfAuthenticated` (re-verifies `/auth/me` to break the revoked-cookie ping-pong).
- `src/app/api/auth/{login,signup,logout}/route.ts` — all `runtime="nodejs"` + `dynamic="force-dynamic"`. login `{5, 15m, "auth-login", passThrough [401,400]}`; signup `{10, 15m, "auth-signup", [409,400]}`; logout `assertSameOrigin` → best-effort `logout(token)` → **unconditional** cookie clear.

**Design skin — dark "secure threshold" gate (hi2vi_web `operator/login`):**
- `src/app/(auth)/layout.tsx` — unguarded, `robots:noindex`; full-viewport `bg-ink` stage + two `aria-hidden` decorative layers (radial green glows + masked 52px hairline grid).
- `src/app/(auth)/auth-card.tsx` — forest-gradient card (`linear-gradient(180deg,#0d3127,var(--color-forest))`) + soft shadow + `inset 0 1px 0 rgba(154,247,199,.08)` top-light; brand row (green-accent mark) + mono uppercase "Secure" pill (glowing green dot); `text-heading-4` lead + `text-body-sm text-on-dark-muted` sub; mono trust-chip footer ("Signed session · SameSite=Strict · Noindex") + cross-link.
- `src/app/(auth)/credentials-form.tsx` — shared client island; plain `fetch` to the BFF route (not `useActionState`), reads **status only**, on `res.ok` → `router.replace("/dashboard")+refresh()`, on fail → `errorFor(status)` + clear password. Security-mint labels, dark translucent inputs (`bg-[rgba(6,21,18,.55)]`, `focus:border-green-deep` + green focus shadow), full-width `bg-green` submit (hover `security-teal`), circular-badge `role="alert"` error.
- `login/{page,login-form}.tsx` + `signup/{page,signup-form}.tsx` — `await redirectIfAuthenticated()` then card + form; `errorFor` mappings (login 401→invalidCredentials, 400|422→invalidInput, 429→rateLimited; signup 409→emailTaken, …).

**Design skin — light "workspace" console (hi2vi_web `operator/(console)`):**
- `src/components/app-shell/app-shell.tsx` (server) — sticky white topbar (`bg-canvas border-b border-hairline`): brand (green-`deep` accent) + `h-5 w-px bg-hairline` divider + workspace/tenant breadcrumb + `flex-1` spacer + `hidden md:inline` email + light logout; grid `grid-cols-1 min-[900px]:grid-cols-[248px_minmax(0,1fr)]`, `min-h-[calc(100dvh-57px)]`.
- `rail-nav.tsx` (client, `usePathname`) — white `bg-canvas` rail with `min-[900px]:border-r`, mono-uppercase eyebrow heading, nav rows active = `border-green-deep bg-surface-green` + `aria-current`; Documents/Graph render as muted **"Soon"** pills (never a 404 link).
- `logout-button.tsx` (client) — light-tone; POST `/api/auth/logout` then `router.replace("/login")+refresh()` in `finally`. `index.ts` barrel.
- `src/components/ui/app-button.tsx` — the **flat app-chrome button language** (`appButtonClass`/`AppButton`: `rounded-md`, no pill/translate/marketing-shadow; primary `bg-green hover:bg-green-deep`, secondary/ghost/danger) + the `Tag` mono chip. Marketing pill `Button` stays reserved for P14. Wired into `components/ui/index.ts`.

**App gate + root:**
- `src/app/(app)/layout.tsx` — `const {identity} = await requireIdentity()` → `<AppShell>`.
- `src/app/(app)/dashboard/page.tsx` — **minimal placeholder** (heading + `Tag` + signed-in email/tenant from the cache-deduped `requireIdentity`) — proves the gate renders; S3 swaps real data.
- `src/app/page.tsx` — replaced S1's preview with the root redirect (`getSession()` ? `/dashboard` : `/login`).

**Content / deps / env / identity renames:**
- `content/auth.ts` (`AUTH_ERRORS`, `AUTH_TRUST_ITEMS`, `LOGIN_PAGE`, `SIGNUP_PAGE`, `AuthPageCopy`) + `content/app.ts` (`APP_NAV` = Dashboard live + Documents/Graph `soon:true`; `APP_SHELL`) + `BRAND` in `content/site.ts`; `content/index.ts` barrel extended.
- `package.json`: added `server-only ^0.0.1`, `zod ^4.4.3`, dev `vitest ^4.1.10`, `"test": "vitest run"`.
- `.env.example`: `KB_API_BASE_URL=http://127.0.0.1:8766` + `SESSION_SECRET=` (both server-only/blank).
- Renames vs vocky applied throughout: cookie `knowledge_session`, env `KB_API_BASE_URL`, `lib/knowledge/`, `Kb*` types, knowledge brand strings.
- `tests/{session,session-guards,auth-routes,knowledge-auth}.test.ts` + `tests/stubs/server-only.ts` + `vitest.config.ts` (alias `@`→`./src`, `server-only`→inert stub).

## Security decisions (load-bearing gotchas preserved — none optimized away)
- `requireIdentity` **rethrows any non-401** so a backend outage ≠ silent logout; only `ApiError` 401 → `/login`.
- `(auth)` pages **re-verify against `/auth/me`** before bouncing → breaks the revoked-cookie ping-pong (a dead cookie renders the login form).
- GCM tag = integrity: length + tag checks kept; a flipped byte can never forge a token.
- Rate-limit runs **before** body parsing; distinct per-route bucket (`auth-login` vs `auth-signup`).
- `cache:"no-store"` on every knowledge call.
- `server-only` imports guard the whole server layer; backend `detail` **never** echoed (enumeration-safe generic 401); logout best-effort revoke + **unconditional** clear (never fails open); `secure` cookie prod-only (dev http/127.0.0.1 wouldn't keep a Secure cookie).
- Boundary held: no `/app/*` data pages, no `lib/knowledge/app.ts` — the dashboard only hits `/auth/me` via the guard.

## Verification

Mandatory set — all green in `web/`:
- `pnpm install` → added `server-only 0.0.1`, `zod 4.4.3`, `vitest 4.1.10`.
- `pnpm typecheck` (`tsc --noEmit`) → **exit 0**.
- `pnpm lint` (`eslint .`) → **exit 0**, no findings.
- `pnpm test` (`vitest run`) → **exit 0**, 4 files / **36 tests passed** (session crypto, session guards, BFF route pipeline, tenant normalization).
- `pnpm build` (`next build`) → **exit 0**; every `/auth` + `(app)` route renders `ƒ (Dynamic)` (`/`, `/login`, `/signup`, `/dashboard`, `/api/auth/{login,logout,signup}`); `/_not-found` is the only `○ Static`.

Security greps (no leakage):
- `import "server-only"` present on all six server-layer modules (`env`/`session`/`bff`/`auth-guards`/`knowledge/client`/`knowledge/auth`).
- No `"use client"` component imports the server/token layer (grep clean; `session.ts`/`env.ts` appear only because their *comments* mention the string `"use client"`).
- `.next/static` client bundles contain **no** `SESSION_SECRET` / `KB_API_BASE_URL` / `knowledge_session` / bearer / `sealSession` / `readSessionEnv`; `aes-256-gcm` lives only in `.next/server` chunks. The build itself proves the `server-only` guard holds — a client import would have failed it.

**Live auth E2E: PENDING for P12.REVIEW.** The tenant-mode knowledge backend could not be stood up in-sandbox: the Docker daemon is not running (`docker info` fails) and there is no local Postgres/psql binary, so neither the dev `compose.yml` api (`:8766` + Postgres) nor a bare `uvicorn` with a `DATABASE_URL` is reachable here. Per the plan this does **not** make the slice `pending` — the vitest suite covers the crypto / BFF-pipeline / tenant-normalization behavior. The consolidated live flow to run at P12.REVIEW: point `KB_API_BASE_URL` at a live tenant-mode backend and drive real **signup → sealed `knowledge_session` cookie → guarded `/dashboard` renders inside the shell → logout clears it**, plus **revoked-cookie replay** (dead cookie renders `/login`, no ping-pong) and **no token in HTML**.

## Deviations from plan
- **Brand mark.** hi2vi's gate accents a digit (`2` in `hi2vi`); knowledge has no digit, so `BRAND` (`content/site.ts`) accents the leading **`k`** as the green mark ("**k**nowledge") — `text-green` on the dark gate, `text-green-deep` on the light topbar. A defensible design call to satisfy the "green-accent digit/mark" intent.
- **StatusPill not introduced.** The plan's app-chrome primitive note reads "e.g. `app-button.tsx` + the `Tag`/`StatusPill` chip vocabulary". Introduced `appButtonClass`/`AppButton` + `Tag` (the mono chip, used by the dashboard placeholder). `StatusPill` is deliberately deferred — hi2vi's is coupled to run-status content (`RUN_STATUS_META`) that does not exist here; a slice with real status data (S3+) should add it. `AppButton`/`appButtonClass` are exported ahead of first use to establish the language for S3–S6 (consistent with S1 shipping `Input`/`Textarea`/`Checkbox`/`DataTable` for later slices).
- No other deviations; the functional/security layer is a faithful port and the two-source split (vocky structure / hi2vi design) was applied as specified.
