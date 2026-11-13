# Plan — P25.S5: share affordances — copy-link, save URL, and the org-slug settings field

## Goal

The surfaces that hand a URL to a human hand out the pretty one, and the operator can actually set the org slug from the dashboard. Read `phase.md` § "P25.S5", Findings, Constraints, and the S1–S4 notes first. Everything upstream has landed: `identity.tenant` already carries `slug` at runtime (S1's `serialize_tenant` flows through `/auth/me` by reference — the web needs only a **type addition**), `KbDocument.canonical_path` (S2), the pretty doc route (S3), and `/@{org}/graph` + `KbGraph.canonical_path` (S4).

## Decisions fixed by this plan (settling the open questions)

- **The S3 pretty document page gets a `CopyLinkButton` too**, on its member branch, copying its own canonical path (`/@{org}/{project}/{slug}` — rebuild from the guarded params or use `doc.canonical_path`; they are identical there). S3 flagged the affordance gap; the shareable page should be the easiest place to share from. Anonymous branches stay button-free (unchanged convention).
- **Dashboard placement: a new `kb-panel` section** modeled structurally on the org-keys section (heading + lead left, form right), for "Public URL / org slug". Always-visible `Input` + save button (NOT a disclosure — slugs are mutable and the current value must be visible), prefilled with the current slug, `maxLength={40}` mirroring the backend cap.
- **The panel displays the resulting pretty graph URL** (`/@{slug}/graph`) with a `CopyLinkButton` once a slug exists — minimal, one line; no per-project URL list.
- **409 gets its own error copy key** ("that URL name is already taken" style) — do not reuse `generic`; it is the most likely real failure. Error map: 400/422 → invalid (cite charset/reserved rule), 401 → sessionExpired, 404 → notFound, 409 → taken, else generic.
- **`CopyLinkButton` component stays as-is** (no reset-timer/a11y rework — out of scope; both new usages follow the existing contract: `path` only, client builds the origin).

## Work

1. **Type + BFF helper**:
   - `KbTenant` in `web/src/lib/knowledge/types.ts`: add `slug: string | null` (additive-field doc comment style).
   - `app.ts`: `setTenantSlug(token: string, slug: string)` → `sendJson<{tenant: KbTenant}>("/app/tenant", "PATCH", { slug }, { token })`, unwrap `.tenant`, doc comment carrying the 422/409/404 contract. (No GET helper needed — identity already carries the slug.)

2. **Copy-link swaps** (path prop only, zero new fetching):
   - `(public)/documents/[id]/page.tsx` member branch (~line 126): `path={doc.canonical_path ?? `/documents/${id}`}`.
   - `(app)/graph/page.tsx` header (~line 46): `path={slug ? `/@${slug}/graph` : `/graph/${orgId}`}` from `identity.tenant?.slug` (keep the existing `orgId ? … : null` guard).
   - `(public)/[org]/[project]/[slug]/page.tsx` member branch: add `<CopyLinkButton path={…canonical path…} />` beside the back-link, matching the id page's placement.

3. **Dashboard org-slug field**:
   - `dashboard/actions.ts`: `setOrgSlugAction(_prev, formData)` cloning `setProjectVisibilityAction`'s shape — zod safeParse (mirror the backend rule client-side: lowercase, `^[a-z0-9]+(-[a-z0-9]+)*$`, 2–40; backend stays authoritative for reserved words), `requireIdentity()` outside the try, `ApiError` status branching per the error map above, `revalidatePath("/dashboard", "page")`, state `{ error: string | null; ok?: number }`.
   - New client island `dashboard/org-slug-form.tsx` following `visibility-toggle.tsx` conventions: `INITIAL_STATE` in the island (a `"use server"` module may export only async functions), `useActionState`, `useId` + `FieldError` + `aria-describedby`, `disabled={pending}`, pending label swap, `Label` + `Input` from `@/components/ui`. Prefill via a `defaultValue={tenant.slug ?? ""}` prop from the server page.
   - `dashboard/page.tsx`: render the new panel (heading/lead/form, plus the pretty graph URL + copy button when `tenant.slug` is set). Identity is already on the page — no new reads.
   - Copy: `SET_ORG_SLUG_ERRORS` const (incl. the 409 key) + a `DASHBOARD.orgSlug` section in `web/src/content/dashboard.ts`, re-exported through `content/index.ts` as the others are. All strings in content modules — none inline.

4. **Tests** (terse): extend the web vitest suite with one small file for `setTenantSlug` (exact URL/method/body, auth header, 409 → `ApiError`), mirroring `resolve-document.test.ts`. No page-render tests (repo convention).

## Out of scope

`server/**` and root `tests/**` are untouched (⇒ no plugin-template mirroring; parity must stay green trivially). No `CopyLinkButton` component rework, no robots/sitemap, no per-project public URL listings, no org landing page.

## Validation

- `cd web && npm run lint && npm run typecheck && npm run build && npm run test` (baseline 14 files / 83 tests; expect +1 file).
- `scripts/plugin_parity.py` → PASS (nothing mirrored, just confirm).
- Postgres-gated pytest: not required (no backend change); S4's baseline (124 passed / 83+41 skipped) stands — state this in `result.md`.
- `python3 scripts/workflow.py validate`.
- Append actual "Doc impact" lines to `phase.md` (experience.md: copy-link swaps + the dashboard org-slug panel as the slug-provisioning story — this is how tenant #1 gets its slug, operator-set, no backfill; frontend.md: `KbTenant.slug`, `setTenantSlug`, the new island).
