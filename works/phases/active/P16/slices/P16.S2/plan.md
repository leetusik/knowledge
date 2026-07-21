# Plan — P16.S2: Web — safe interactive HTML render (sandboxed iframe + raw relay)

Operator-approved at the do-whole-phase gate, 2026-07-21. Executor: `slice-executor-high` (`risk: high`).

Read `phase.md` first — especially Pinned design decision 1 (rendering approach) and the S1 notes ("Raw route — the exact contract S2 relays", also in `works/phases/active/P16/slices/P16.S1/result.md`). This slice is the XSS-safety-critical heart of the phase: a slip in the sandbox attributes / CSP / X-Frame exemption is a security hole. Recon below verified 2026-07-21.

## Context

S1 shipped the backend: `GET /app/documents/{doc_id}/raw` (session-guarded, tenant-scoped) returns the raw HTML (starts at `<!DOCTYPE html>`), `text/html; charset=utf-8`, with headers `Content-Security-Policy: sandbox allow-scripts; frame-ancestors 'self'` / `X-Frame-Options: SAMEORIGIN` / `X-Content-Type-Options: nosniff` / `Cache-Control: no-store`; 404 for md/missing/cross-tenant. `/app` doc projections now carry additive `format: "md"|"html"`.

## Scope

A browser-facing BFF relay Route Handler for the raw HTML (the app's **first** non-auth route handler — the 3 auth routes are the only precedent), the `format === "html"` switch in the document page rendering a sandboxed opaque-origin iframe, the `X-Frame-Options` exemption for the relay path, additive `format` in the web types, terse vitest cases. Markdown rendering byte-identical. No `server/`, `mcp-server/`, or `plugin/` changes.

## Verified web shapes (reuse these; don't reinvent)

- `src/lib/knowledge/client.ts::getRaw(path, {token})` (L100-112) — purpose-built unused byte-passthrough: returns the upstream `Response` unread, throws `ApiError` on non-2xx. `server-only` module — fine in a Route Handler.
- Route-handler idiom (auth routes): `export const runtime = "nodejs"` + `export const dynamic = "force-dynamic"` (cookie unseal needs node:crypto; per-request). Session read in a handler without redirect: `openSession(readSessionCookie(req))` → token | null (`src/lib/session.ts`; the logout route is the precedent). `bff.ts::json(status, body)` for error responses. `requireSession()` redirects — do NOT use it in the relay.
- `next.config.ts::headers()` has ONE entry, `source: "/:path*"`, including `X-Frame-Options: DENY` — it matches `/api/*` route handlers too, and DENY blocks same-origin framing. This is the blocker to exempt.
- Page: `src/app/(app)/documents/[id]/page.tsx` — server component; `requireIdentity()` at (app) layout + page; body renders at ~L140-149: `<div className="kb-panel">` wrapping `<MarkdownBody>`. The `(app)` layout guard does NOT cover `/api/*` — the relay must self-guard.
- Types: `src/lib/knowledge/types.ts::KbDocumentListItem` (KbDocument extends it) — no `format` field yet; backend now sends it on list + detail.
- Container precedent for a tall content card: `src/app/(app)/graph/graph.css::.kb-graph` (width 100%, `height: calc(100dvh - var(--kb-app-topbar-h) - 13rem)`, `min-height: 30rem`, `--kb-border`/`--kb-radius`, overflow hidden) — mirror it; co-located per-route `.css` imports are the convention. No `<iframe>` exists anywhere in the codebase yet.
- Tests: vitest node env, `tests/**/*.test.ts` only (no component/jsdom tooling — don't add any); `tests/auth-routes.test.ts` is the exact pattern (import the handler directly, `sealSession()` cookie, `vi.stubGlobal("fetch")`, real `Request`, assert status/headers/body; `server-only` is stubbed via vitest alias).

## Changes by file (web/)

1. **`src/lib/knowledge/app.ts`** — add `getDocumentRaw(token, id, signal?)` → `getRaw(` + "`" + `/app/documents/${id}/raw` + "`" + `, { token, signal })`, style-matched to `getDocument`.
2. **`src/lib/knowledge/types.ts`** — `KbDocumentListItem` gains `format: "md" | "html"` (covers `KbDocument` via extends).
3. **New `src/app/api/documents/[id]/raw/route.ts`** — `GET`:
   - `runtime = "nodejs"`, `dynamic = "force-dynamic"`.
   - Parse id (`Number.isInteger && >= 1`, else 404 via `json()`).
   - `const token = openSession(readSessionCookie(req))`; null → `json(401, …)` (no upstream call).
   - `getDocumentRaw(token, id)`; `ApiError` 404 → `json(404, …)`; any other failure → `json(502, …)`.
   - Success: `new Response(upstream.body, { status: 200, headers })` — stream passthrough; set headers **explicitly to the pinned values** (don't trust upstream drift): `Content-Type: text/html; charset=utf-8`, `Content-Security-Policy: sandbox allow-scripts; frame-ancestors 'self'`, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`.
4. **`next.config.ts`** — keep the global entry; ADD a second, later, more-specific entry `source: "/api/documents/:id/raw"` setting `X-Frame-Options: SAMEORIGIN` + `Content-Security-Policy: sandbox allow-scripts; frame-ancestors 'self'` — values identical to the handler's, so layer precedence can never produce a wrong value (Next's documented rule: for the same key, the later matching entry overrides). If you can cheaply verify the final response headers on a running server, do; otherwise record the layering decision in `phase.md` for REVIEW's e2e pass to confirm.
5. **`src/app/(app)/documents/[id]/page.tsx`** — format switch at the body render only (header/metadata strip untouched): `doc.format === "html"` → explainer container instead of `.kb-panel` + `<MarkdownBody>`:
   ```tsx
   <div className="kb-explainer">
     <iframe src={`/api/documents/${id}/raw`} sandbox="allow-scripts" title={doc.title}
             className="kb-explainer__frame" referrerPolicy="no-referrer" />
   </div>
   ```
   **`sandbox="allow-scripts"` exactly — never add `allow-same-origin`** (the opaque-origin pin; also no allow-forms/popups/top-navigation/modals). md branch byte-identical.
6. **New co-located `explainer.css`** (imported by the page like `prose.css`): `.kb-explainer` mirrors `.kb-graph` sizing/border/radius/overflow; `.kb-explainer__frame { border: 0; width: 100%; height: 100%; }`. Fixed generous height + iframe-internal scrolling is the pinned baseline (phase.md Open Question 2 — no postMessage handshake in P16). Reuse `--kb-*` tokens only; **no new visual design** (constraint — if genuine visual decisions surface, stop and escalate rather than improvise).

## Tests (terse — one new `tests/raw-route.test.ts`, auth-routes pattern)

Cases: (a) valid sealed cookie + upstream 200 html → 200, body passthrough, and the five headers assert exact values; (b) no/invalid cookie → 401 and upstream fetch never called; (c) upstream 404 → 404; (d) bad id (`"abc"`, `0`) → 404 without upstream call. No component tests (no tooling; the page branch is covered by REVIEW's e2e instead).

## Validation (run and report exact commands + output)

- Web suite green: the `web/` package.json test script (vitest run).
- Types/lint/build per the repo's usual web gates (`npm run lint` and/or `npm run build` in `web/` — whichever exist; build also type-checks the new route).
- Backend suite untouched — don't run it.

## On finish

Write `result.md` in this slice folder; append to `phase.md`: cross-slice notes (the relay URL `/api/documents/{id}/raw`, the header-layering decision and how it was verified), Doc-impact lines (frontend/experience: sandboxed-iframe explainer render + relay route; security: render-side completion of the opaque-origin stance — pairs with S1's partial line), and anything S3/REVIEW must know. Never commit; never transition slice/phase status; no `doc-new-version`; no `new-slice`.
