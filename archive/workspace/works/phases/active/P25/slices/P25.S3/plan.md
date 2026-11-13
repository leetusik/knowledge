# Plan — P25.S3: web pretty document route and legacy /documents/{id} redirect

## Goal

`/@{org}/{project}/{doc-slug}` renders the document in the browser, and an anonymous visitor on legacy `/documents/{id}` is 307-redirected to the pretty URL when one exists. Read `phase.md` § "P25.S3", Findings (D1, D4), Constraints first. S2 has landed: backend resolver `GET /app/orgs/{org}/{project}/{slug}` (bare org slug — no `@`; misses are one indistinguishable 404 with detail `"no document at that path"`), and `KbDocument.canonical_path` (nullable) on both detail reads. See `works/phases/active/P25/slices/P25.S2/result.md`.

## Decisions fixed by this plan

- **Q1 is settled — no shadowing** (verified against the committed `web/.next/routes-manifest.json`: route groups are URL-transparent, routes compile to full-path regexes, static wins over dynamic; the only 3-segment routes today are static `/api/auth/*`). Still do the plan's first task: a fresh `npm run build` and eyeball the route manifest — that closes phase.md Q1 empirically, then build the page. No rewrite, no middleware.
- **Metadata stays static** (`export const metadata`, no `generateMetadata`): the repo-wide rule exists because the knowledge client is `cache: "no-store"` and `generateMetadata` would double the upstream fetch; per-doc SEO titles are part of the explicitly out-of-scope SEO expansion. Note this choice in `phase.md` for the review.
- **No `CopyLinkButton` on the pretty page in this slice** — share affordances are S5's job wholesale.
- **`robots.ts` / `sitemap.ts` untouched** (out of scope; robots allows the new namespace by default).
- **Redirect direction is one-way only**: legacy → pretty, anonymous branch only. The pretty route never redirects back to an id URL (loop hazard); a pretty-URL miss is `notFound()` (anonymous visitors do NOT get bounced to `/login` here — the resolver's 404 already collapses private/unknown, and `/login` bounce would leak nothing but adds friction on a shared-link surface; use plain `notFound()` on both branches for the pretty route).

## Work

1. **Empirical Q1 check** (first task): `cd web && npm run build`; confirm in the route output/manifest that `/documents/[id]`, `/graph/[org]`, `/api/*` routes still compile as before alongside the new `/[org]/[project]/[slug]`. Record the observation in `result.md`.

2. **BFF helper** in `web/src/lib/knowledge/app.ts`, mirroring `getDocument` (:367): `resolveDocument(token: string | undefined, org: string, project: string, slug: string, signal?: AbortSignal): Promise<KbDocument>` → `getJson` on `/app/orgs/${encodeURIComponent(org)}/${encodeURIComponent(project)}/${encodeURIComponent(slug)}` (bare org — caller strips `@`). `import "server-only"` file, token-first signature, doc comment carrying the route contract, throw `ApiError` — never swallow.

3. **Pretty route** `web/src/app/(public)/[org]/[project]/[slug]/page.tsx`, cloned from `(public)/documents/[id]/page.tsx`'s structure:
   - `params: Promise<{org: string; project: string; slug: string}>`; guard **before** any session read or upstream call: `org` must start with `@` and the remainder be non-empty, else `notFound()`. (This guard is load-bearing: the route is the catch-all for every unmatched 3-segment URL.) Decode params (`decodeURIComponent`) as the sibling routes do.
   - `const ctx = await optionalIdentity()` after the guard.
   - Fetch via a module-level `loadDocument`-style helper OUTSIDE the component (`ApiError` 404/400 → `onMiss`, rethrow the rest; `redirect()`/`notFound()` never inside a `try` — repo hard convention). `onMiss` is `notFound` for BOTH branches (see decision above).
   - Member branch: `<AppShell identity={ctx.identity}>` with back-link to `/documents`, `<DocumentView doc id={doc.id}>`, `<VersionHistory>` (id-keyed links stay id-keyed). Skip `DeleteDocumentButton`/`CopyLinkButton` — those stay on the id page until S5 decides.
   - Anonymous branch: `<PublicShell>` + `<DocumentView>` + `<VersionHistory>` — same as the legacy anonymous page.
   - `loadVersions` degrade-to-empty pattern reused as-is.
   - Static `export const metadata` using the existing documents title from `@/content`.
   - Co-located `not-found.tsx` (copy the sibling's), with an anonymous-safe CTA: link to `/` (the legacy one links to member-gated `/documents`; don't repeat that here).
   - All strings from `@/content` — no inline copy. Add keys to the existing content module rather than a new one if only a couple of strings are needed.

4. **Legacy redirect** in `(public)/documents/[id]/page.tsx`, anonymous branch only: after `loadDocument(undefined, id, …)` returns, if `doc.canonical_path` is non-null → `redirect(doc.canonical_path)` (307; at page top level, NOT inside a try). Member branch unchanged. A slug-less tenant's doc has `canonical_path: null` and serves exactly as today.

5. **Web tests** (vitest, `web/tests/`, mirroring `document-versions.test.ts` idiom — `vi.stubGlobal("fetch")`, exact URL + `Authorization` presence/absence + `cache: "no-store"`): one small suite for `resolveDocument` (URL encoding, anonymous = no auth header, 404 → `ApiError`). Keep it terse; page-level rendering is not unit-tested in this repo.

## Out of scope

Graph (S4), share affordances + org-slug settings field (S5), robots/sitemap, `next.config.ts` header exemptions, nginx, any `server/**` change (⇒ no plugin-template mirroring needed this slice — web files are not shipped_dirs; verify `plugin_parity` stays green anyway since it runs in CI).

## Validation

- `cd web && npm run lint && npm run typecheck && npm run build && npm run test`.
- Manual smoke with the dev compose stack if cheap (optional; the phase review does behavioral validation).
- `python3 scripts/workflow.py validate`.
- Append actual "Doc impact" lines to `phase.md` (frontend.md/experience.md: the pretty route, the anonymous-only legacy redirect, the static-metadata decision).
