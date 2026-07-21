# Result — P16.S2: Web — safe interactive HTML render (sandboxed iframe + raw relay)

Executor: `slice-executor-high`. Status: **done**. Date: 2026-07-21.

The XSS-safety-critical web half of the HTML-explainer pipeline: a same-origin BFF
raw-relay Route Handler, the `next.config.ts` X-Frame-Options exemption for that path,
and the document page's `format === "html"` switch to a sandboxed opaque-origin
`<iframe>`. Markdown rendering stays byte-identical. `web/` only — no `server/`,
`mcp-server/`, or `plugin/` touched.

## What changed (by file, all under `web/`)

- **`src/lib/knowledge/app.ts`** — new `getDocumentRaw(token, id, signal?)` →
  `getRaw(`/app/documents/${id}/raw`, { token, signal })`, style-matched to
  `getDocument`. Imports the previously-unused `getRaw` byte-passthrough seam from
  `client.ts` (the S1-noted hook). Returns the UNREAD upstream `Response` for the
  relay to stream; `ApiError` on non-2xx (404 for missing/cross-tenant/non-HTML).
- **`src/lib/knowledge/types.ts`** — `KbDocumentListItem` gains
  `format: "md" | "html"` (covers `KbDocument` via `extends`), matching S1's additive
  backend field now present on every list + detail projection.
- **New `src/app/api/documents/[id]/raw/route.ts`** — the app's FIRST non-auth route
  handler. `runtime = "nodejs"`, `dynamic = "force-dynamic"`. `GET(req, {params})`
  (Next 16 params-as-Promise): (1) validate id (`Number.isInteger && >= 1`, else 404
  before any session/upstream — mirrors the read page's own pre-guard); (2) SELF-GUARD
  — `openSession(readSessionCookie(req))`, null → 401 with NO upstream call (the
  `(app)` layout guard does not cover `/api/*`); (3) `getDocumentRaw(token, id)` —
  `ApiError` 404 → 404, any other failure → 502; (4) success → stream
  `new Response(upstream.body, { status: 200, headers })` with the five pinned headers
  set EXPLICITLY from a module constant (never copied from upstream drift):
  `Content-Type: text/html; charset=utf-8`,
  `Content-Security-Policy: sandbox allow-scripts; frame-ancestors 'self'`,
  `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`,
  `Cache-Control: no-store`. Error bodies use `bff.ts::json` (`{ok:false}`, the
  logout-route precedent).
- **`next.config.ts`** — kept the global `/:path*` entry (still `X-Frame-Options:
  DENY` for the parent page); ADDED a second, later, more-specific entry
  `source: "/api/documents/:id/raw"` setting `X-Frame-Options: SAMEORIGIN` +
  `Content-Security-Policy: sandbox allow-scripts; frame-ancestors 'self'` — values
  identical to the handler's, so layer precedence can never resolve to a wrong value.
- **`src/app/(app)/documents/[id]/page.tsx`** — imports `./explainer.css`; body render
  now switches on `doc.format`: `"html"` → `<div className="kb-explainer">` wrapping
  `<iframe src={`/api/documents/${id}/raw`} sandbox="allow-scripts" title={doc.title}
  className="kb-explainer__frame" referrerPolicy="no-referrer" />`; else the EXISTING
  `.kb-panel` + `<MarkdownBody>` branch, byte-identical (header/metadata strip
  untouched). **`sandbox="allow-scripts"` only — no `allow-same-origin`** (the
  opaque-origin pin), and no allow-forms/popups/top-navigation/modals.
- **New `src/app/(app)/documents/[id]/explainer.css`** — `.kb-explainer` mirrors
  `.kb-graph`'s sizing (`height: calc(100dvh - var(--kb-app-topbar-h) - 13rem)`,
  `min-height: 30rem`) / border / radius / overflow; `.kb-explainer__frame { border:
  0; width: 100%; height: 100% }`. Fixed generous height + iframe-internal scroll is
  the pinned baseline (no postMessage handshake in P16). `--kb-*` tokens only — no new
  visual design.
- **New `tests/raw-route.test.ts`** — terse, on the `auth-routes.test.ts` pattern
  (import the handler directly, `sealSession()` cookie, `vi.stubGlobal("fetch")`, real
  `Request`, Next-16 `params: Promise.resolve({id})` context). 4 cases: (a) valid
  session + upstream 200 → 200, bearer/URL asserted, body passthrough (script intact),
  the five headers exact; (b) no cookie → 401, fetch never called; (c) upstream 404 →
  404; (d) bad id (`"abc"`, `"0"`) → 404 without upstream call.

## Validation (exact commands + outcomes)

Run in `web/`:

- `pnpm test` (→ `vitest run`) → **8 files passed, 58 tests passed** (baseline was 7
  files / 54 tests; +1 file / +4 the new raw-route cases). Isolated:
  `pnpm exec vitest run tests/raw-route.test.ts` → 1 file, 4 passed.
- `pnpm lint` (→ `eslint .`) → **clean, no errors/warnings**.
- `pnpm build` (→ `next build`) → **Compiled successfully; TypeScript finished (no
  errors)**; the new route is registered `ƒ /api/documents/[id]/raw` (dynamic,
  server-rendered on demand) — the type gate for the new route + the `format` field.
- **Header-layering verified at runtime** (`next start` on :3030, no backend needed —
  the config-header layer applies to responses regardless of the route body):
  - `curl -D- /api/documents/1/raw` (no cookie → 401) →
    `X-Frame-Options: SAMEORIGIN` and
    `Content-Security-Policy: sandbox allow-scripts; frame-ancestors 'self'` — a SINGLE
    value each (the specific entry overrode the global `DENY`; no duplicate/conflict).
    The 401 body also carries `cache-control: no-store` + `content-type:
    application/json` from the handler.
  - `curl -D- /` (control) → `X-Frame-Options: DENY` — the parent page keeps the global
    deny, so only the raw path is framable.
- Backend suite untouched (not run, per plan).

## Security stance (render side complete — the S1 pin, now end-to-end)

`sandbox="allow-scripts"` with NO `allow-same-origin` gives the framed explainer an
opaque origin: quiz JS runs, but it has no `document.cookie` / storage, no cross-origin
parent DOM access, and (with `/app`+`/api` CORS-less + the httpOnly session cookie) no
way to call the API as the user or exfiltrate the session. Defense in depth for a
direct top-level visit: the relay's own `CSP: sandbox allow-scripts` privilege-strips
that document too. `referrerPolicy="no-referrer"` on the iframe keeps the relay URL out
of any referer the framed doc could emit.

## Deviations from `plan.md`

None. The plan's optional "if you can cheaply verify final response headers on a
running server, do" was taken — the header layering is confirmed at runtime (above),
not deferred to REVIEW. The plan's `srcdoc` fallback was NOT needed (the route+iframe
path worked as pinned).

## For S3 / REVIEW

- **The relay URL is `/api/documents/{id}/raw`** (same-origin BFF), backed by S1's
  `GET /app/documents/{id}/raw`. Auth-required (401 without a valid sealed cookie),
  id-validated (404 for non-integer/<1), 404 passthrough for missing/cross-tenant/
  non-HTML, 502 for any other upstream fault.
- **REVIEW's e2e pass** should confirm the full AUTHENTICATED round-trip against a real
  backend: create an `.html` doc → open `/documents/{id}` → the iframe renders and the
  quiz JS runs, while a direct top-level visit to the raw URL is sandbox-stripped, and
  a markdown doc still renders byte-identically. The header layering + the unit-level
  behavior are already verified here; what remains is the live cross-origin behavior of
  the sandboxed iframe (not unit-testable — no jsdom/browser tooling in this repo).
- **iframe sizing is the pinned fixed-height baseline** (`.kb-explainer`), internal
  scroll. A postMessage height handshake is an explicit P17 explainer-template
  enhancement, not this phase.
