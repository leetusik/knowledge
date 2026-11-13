# Plan — P25.F3: unclaimed-slug share UX — surface the claim-your-URL state instead of silently copying the legacy URL

## Why (operator report + live diagnosis, 2026-08-07)

After the P25 production cutover the operator pressed the document page's copy-link button and got `https://knowledge.hi2vi.com/documents/25` — and read that as the feature not working. Live diagnosis (verified against production): `GET /app/documents/25` returns `canonical_path: null` and the resolver knows no org slug — **no org slug has been claimed on the tenant yet**, so every share affordance is correctly executing its designed fallback. The code is right; the UX is wrong: the fallback is **silent**, and nothing on the share surfaces tells the owner that the pretty URL is one dashboard field away. This confusion is the defect.

## The fix (web-only, no backend change, no visual redesign)

When the **signed-in owner** views a share surface and their tenant has **no slug claimed** (`identity.tenant.slug === null` — `KbTenant.slug` landed in S5 and `/auth/me` carries it), show a small inline hint beside the copy affordance: claim your public URL name on the dashboard to get a pretty share link — with a link to `/dashboard`. Concretely:

1. **Document detail, member branch** (`web/src/app/(public)/documents/[id]/page.tsx`): next to the existing `<CopyLinkButton path={doc.canonical_path ?? …}>`, when `ctx.identity.tenant?.slug == null`, render the hint. When a slug IS claimed but `canonical_path` is null (the F1 superseded-duplicate case), render **no** hint — the fallback is then correct and permanent for that row.
2. **Pretty page, member branch** (`web/src/app(public)/[org]/[project]/[slug]/page.tsx`): not applicable (reaching it implies a slug exists) — touch only if inspection shows otherwise.
3. **Member graph header** (`web/src/app/(app)/graph/page.tsx`): same conditional hint beside its copy button when `identity.tenant?.slug == null` (it currently falls back to `/graph/{orgId}` silently).
4. **Copy as data**: hint string(s) in the existing content modules (`web/src/content/share.ts` fits — extend `ShareCopy`), re-exported via `content/index.ts`. Match the repo's terse, plain tone; keep it ONE short sentence. Style: follow existing muted helper-text patterns (e.g. the dashboard panel's hint styling) — this is a minor affordance in the existing design language, NOT a redesign; add no new components beyond a trivial inline element (a styled `<span>`/`<Link>` is fine).
5. **Anonymous branches: untouched.** Non-owner members of other orgs: untouched (hint keys off the viewer's own tenant, and only on surfaces whose copy button copies that viewer's own org URLs — the doc page hint should additionally require the viewer's tenant to own the doc; on the member branch that is already true by construction since the member fast-path only resolves own-tenant docs).

## Tests / validation

- `cd web && npm run lint && npm run typecheck && npm run build && npm run test` (current baseline 15 files / 85 tests; a rendering unit test is NOT expected — repo convention).
- No `server/**` or root `tests/**` changes → plugin parity trivially green (`scripts/plugin_parity.py` to confirm).
- `python3 scripts/workflow.py validate`.
- Append a one-line Doc impact note to `phase.md` (experience.md: the unclaimed-slug hint on share surfaces).

## Boundaries

No backend changes; no `CopyLinkButton` component rework; no dashboard changes (its panel already exists and self-describes); no robots/sitemap; if the fix turns out to require a real design decision (new visual element beyond an inline hint), STOP and return `needs_operator` rather than inventing design.
