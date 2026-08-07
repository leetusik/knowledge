# Plan — P25.S4: (D19) org-slug public graph URL and legacy /graph/{uuid} redirect

_(The "Promoted Deferred Context" section at the bottom carries D19's original brief.)_

## Goal

`/@{org}/graph` becomes the public graph URL; `GET /app/graph?org=` accepts an org slug in addition to a tenant UUID; the legacy `/graph/{uuid}` page redirects (307, anonymous AND member — it has no member-only affordances to preserve) to the pretty URL when the tenant has a slug, else serves exactly as today. Read `phase.md` § "P25.S4", Findings (D1, D4), Constraints, and the S1–S3 notes first. S3 has landed: the `(public)/[org]/` tree exists with the `@`-guard idiom, `safeDecode`, and the one-way-redirect rule.

## Decisions fixed by this plan

- **The graph response gains an additive nullable `canonical_path`** (`"/@{slug}/graph"`, `null` when the tenant has no slug or in legacy mode) — this is how the legacy page learns the slug to redirect, mirroring S2's document pattern exactly: built once in the backend, never re-derived in TypeScript. Member calls (`org` omitted) get it free from `ctx.tenant.slug`; the public path already pays a Postgres call for `list_projects_for_tenant`, and one tenant/slug read alongside it is acceptable. The docstring's "no org echo" note (graph_api.py:211) must be updated — echoing the canonical path of the org the caller explicitly asked for leaks nothing.
- **`?org=` retyping: `UUID | None` → `str | None`, try-UUID-parse-first, else treat as slug** via `get_tenant_by_slug` (which normalizes internally and returns `None` for malformed/reserved — one indistinguishable 404, no charset re-derivation). A canonical UUID string matches the slug charset, so UUID parse must come first. Malformed org values that 422 today become 404 — acceptable and strictly friendlier on an anonymous surface; note it in `result.md`.
- **The member fast-path comparison** (graph_api.py:220, currently `ctx.tenant.id == org` as UUIDs) must compare against the *resolved* tenant UUID regardless of whether the caller sent a UUID or a slug — a member using their own slug gets the member path. This is the slice's sharpest regression risk; add/extend a test for it.
- **The new page requires the `@`-prefixed slug strictly** — no UUID accepted in `/@{...}/graph` (UUIDs stay on the legacy route, which redirects forward). One-way redirects only: legacy → pretty; the pretty page never redirects back.
- **Member graph page's `CopyLinkButton` stays untouched** — that is S5.

## Work

1. **Backend** (`server/graph_api.py` only):
   - Retype `org` param to `str | None`; in the handler: `org is None` → member path unchanged; else try `UUID(org)`; on failure `get_tenant_by_slug(org)` (after the legacy-mode guard — never touch the accounts service when `config.database_url() is None`; that stays a 404) → `None` ⇒ the existing `"graph not found"` 404; success ⇒ resolved tenant UUID (+ its slug, already in hand for `canonical_path`).
   - Member fast-path: compare `ctx.tenant.id` to the resolved UUID.
   - Public path unchanged after resolution (public projects filter, empty ⇒ 404).
   - Add `canonical_path` to the response: member path from `ctx.tenant.slug`; public path from the resolved tenant record (avoid a second lookup when the org came in as a slug — the record is already in hand; when it came as a UUID, fetch the tenant once).
   - Update the module docstring where it documents the response shape / no-org-echo.
2. **Type mirror**: `KbGraph` in `web/src/lib/knowledge/types.ts` gains `canonical_path: string | null` with the additive-field doc comment style. `getGraph` in `app.ts` needs no signature change (`options.org` is already `string`); update its JSDoc contract note to mention slug acceptance.
3. **New page** `web/src/app/(public)/[org]/graph/page.tsx` (2 segments — no collision with the 3-segment doc route): clone the S3 `@`-guard + `safeDecode` idiom, `optionalIdentity()` after the guard, `getGraph(ctx?.token, { org: orgSlug })` via the existing `loadGraph`-style ApiError-404→notFound mapping (outside the component; never in a `try` with redirect/notFound), render `<PublicShell>` + the same `.mainhead` block + `<GraphCanvas data={graph} />`; static `metadata` `{ title: GRAPH.title }`; co-located `not-found.tsx` with the anonymous-safe `/` CTA (reuse/adapt the S3 one). Strings via `@/content` (reuse `GRAPH`; add keys only if needed).
4. **Legacy redirect** in `(public)/graph/[org]/page.tsx`: after `loadGraph` resolves, if `graph.canonical_path` is non-null → `redirect(graph.canonical_path)` (top level, both identity branches — this public page has no member-only affordances). UUID guard, 404 behavior, and slug-less serving stay exactly as today.
5. **Tests**:
   - Extend `tests/test_public_read.py::test_public_graph_is_org_scoped` (reuse the existing `_set_slug` helper — slugs are globally unique, uuid-unique per run only): `?org=<slug>` happy path (+ `canonical_path` correct), unknown slug ⇒ 404, reserved/malformed slug ⇒ 404 (not 422), slug-less tenant via UUID ⇒ `canonical_path: null`.
   - `tests/test_graph_api.py`: one case — member calling `?org=<own uuid string>` still gets the member whole-corpus path (guards the fast-path retype).
   - No new web test scaffolding (there are no web graph tests today; the "tests stay small" rule wins).
6. **Plugin parity**: mirror changed `server/**` and `tests/**` files into `plugin/templates/kb/`; no manifest change expected (no new files). `scripts/plugin_parity.py` must pass.

## Out of scope

Share affordances / member copy-link / `KbTenant.slug` type (S5), doc-node `url`s in the graph payload (stay `/documents/{id}`, resolving through S3's redirect), robots/sitemap, nginx.

## Validation

- Gated pytest against a disposable Postgres (S1's recipe; baseline 123 passed) run twice; no-DSN run for the skip path (baseline 83 passed + 40 skipped). **State run-vs-skip.**
- `cd web && npm run lint && npm run typecheck && npm run build && npm run test` (web baseline 14 files / 83 tests).
- `scripts/plugin_parity.py` → PASS. `python3 scripts/workflow.py validate`.
- Append actual "Doc impact" lines to `phase.md` (api.md: `?org=` slug acceptance + graph `canonical_path`; frontend.md/experience.md: `/@{org}/graph` + legacy redirect).

---

## Promoted Deferred Context

# Deferred: D19 Org slug vanity URLs for the public graph

## Context

## Why Deferred

P19's public graph is addressed by tenant UUID (/graph/{uuid}) — functional but ugly to share; a unique org slug would give human-readable public URLs.

## Trigger to Promote

Operator wants pretty share URLs, or org management features (D14) land

## Notes
