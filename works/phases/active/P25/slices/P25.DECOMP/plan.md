# Plan — P25.DECOMP (decompose "Pretty public share URLs")

## Job

Decompose P25 into middle slices (`new-slice`, bare folders — never pre-fill their `plan.md`), and seed `phase.md`: the Decomposition section (breakdown + rationale), Findings & Notes (what your research established), Constraints, and Open Questions. This phase does **not** touch product visual design — single-pass decomposition, no `co-work` slice, no `DECOMP2`.

## Intent (from `intent.md` — read it first)

P19's project-level public sharing works; the problem is the URL. `https://knowledge.hi2vi.com/documents/25` is ugly to share and built on a disposable-SQLite row id that is not guaranteed to survive a full index rebuild. The public graph is `/graph/{tenant-uuid}` — same ugliness (deferred job D19). Deliver: org slug (durable, Postgres) + slug-based public document URLs + org-slug graph URL + old links keep working (redirect) + share affordances hand out the pretty URL.

**Not in scope:** per-document visibility, secret share-link tokens, sitemap/SEO expansion.

## Research starting points (verify, don't trust blindly)

- `server/documents_api.py` — `_resolve_readable_doc` (public-read predicate), `GET /app/documents/{id}` + `/raw` + `/versions/*`; the 201 on save returns a `{app origin}/documents/{id}` URL (find where that URL is built — P24 touched the write path).
- `server/db.py` — `find_latest_document_by_slug(project, slug)` (P23) is the natural resolver primitive; documents table has `slug`, `project`, `date`, `rel_path`; canonical identity is tenant + project + `<date>-<slug>` (file path). Rowid is NOT durable.
- `server/graph_api.py` — public graph by tenant UUID (~line 189).
- `server/persistence/models.py` + `alembic/` — accounts plane (Postgres): tenants table gets the org slug column (unique, durable). Check how migrations are structured (e.g. `0004_project_visibility`).
- `server/app_api.py` — project visibility PATCH; pattern for an org-slug set/read surface.
- `web/src/app/(public)/documents/[id]/`, `(public)/graph/[org]/` — current public routes; `web/src/components/copy-link-button.tsx`, `public-shell.tsx`, `web/src/content/share.ts` — share affordances.
- `deploy/knowledge.conf` — nginx has a dedicated regex location for `/api/documents/[id]/raw` (~line 214); new URL shapes may need edge attention.
- `web/src/app/robots.ts`, `sitemap.ts` — out of scope, do not touch.

## Design decisions to settle during this decomposition (record the choice + rationale in `phase.md`)

1. **URL shape.** Recommendation: `/@{org}/{project}/{doc-slug}` — the `@` prefix avoids collisions with existing top-level routes (`/documents`, `/graph`, `/dashboard`, `/login`, ...). CAUTION: in Next.js App Router a *folder* named `@x` is a parallel-route slot, so a literal `@` prefix must be handled inside a dynamic segment (e.g. root `[org]` segment whose param is validated to start with `@`, or a rewrite in `next.config`/middleware). Verify feasibility in this codebase's App Router setup and pick the shape that stays simple; a bare `/{org}/{project}/{slug}` with a reserved-name list is an acceptable fallback. The graph URL should follow the same convention (e.g. `/@{org}/graph` or `/graph/@{org}` — your call, consistent with the doc shape).
2. **Doc-slug collision semantics.** `find_latest_document_by_slug` resolves (project, slug) → newest. Decide whether the pretty URL omits the date (nicer, resolves-to-newest) and how/whether a dated form disambiguates. Keep it simple.
3. **Org slug provisioning.** New unique column on tenants; needs a reserved-word guard and a way to set it (an `/app` PATCH + a small settings UI affordance, or simplest sane thing). Decide how tenant #1 gets its slug (operator sets it via the UI/API after deploy — do not invent a hardcoded value).
4. **Old links.** `/documents/{id}` and `/graph/{uuid}` must keep working — decide redirect vs dual-serve per surface. Internal app navigation may keep ids; only the *share* surfaces must hand out pretty URLs.

## Constraints for the breakdown

- Keep it lean — likely 3–5 middle slices. Backend (Postgres slug + resolvers/redirect APIs) before web (routes + share affordances). Respect 404-never-403 everywhere on the anonymous surface.
- Set each slice's `--risk` deliberately: `low` (→ mid tier) only for a genuine one-/few-line edit or docs; everything that writes real code or spans files is `high`.
- **D19 promotion — leave one slice uncreated.** Deferred job D19 (`works/deferred/open/D19`, org-slug vanity URL for the public graph) is subsumed by this phase. Designate which slice covers it, but do **not** create that one with `new-slice`: record in `phase.md` (and your verdict's notes) its intended id, name, kind, risk, and order, marked "orchestrator creates via promote-deferred D19". The orchestrator will run `promote-deferred D19 --phase P25 --slice <id> ...` after you return. Create every other middle slice normally.
- Tests: minimal high-value cases per the workspace contract — no suite sprawl.
- Append a one-line "Doc impact" expectation note per slice only if obvious now; otherwise leave doc impact to the implementation slices.

## Done means

Middle slices exist (except the designated D19 one), `phase.md` seeded with breakdown/rationale/findings/constraints, and your verdict lists the slices (id, name, risk, order) including the D19 placeholder.
