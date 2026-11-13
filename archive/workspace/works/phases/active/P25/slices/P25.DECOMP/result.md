# Result — P25.DECOMP

Decomposed P25 into five middle slices (four created here, one left for the orchestrator
to promote from D19) and seeded `phase.md` with the breakdown, the four settled design
decisions, the research findings, the constraints, and four open questions.

## What was created

| Slice | Name | Kind | Risk | Order | depends_on |
|---|---|---|---|---|---|
| `P25.S1` | org slug: postgres column, validation, and the `/app/tenant` set surface | implementation | high | 1 | — |
| `P25.S2` | slug-based public document resolver and canonical share path | implementation | high | 2 | `P25.S1` |
| `P25.S3` | web pretty document route and legacy `/documents/{id}` redirect | implementation | high | 3 | `P25.S2` |
| `P25.S5` | share affordances: copy-link, save URL, and the org-slug settings field | implementation | high | 5 | `P25.S3` |

All four are **bare folders** — each contains only `slice.json`; no `plan.md` was
pre-filled.

## What was deliberately NOT created

`P25.S4` — the D19 slice. Per `plan.md` it is left for the orchestrator:

```
python3 scripts/workflow.py promote-deferred D19 \
  --phase P25 --slice P25.S4 \
  --name "org-slug public graph URL and legacy /graph/{uuid} redirect" \
  --kind implementation --risk high --order 4 --depends-on P25.S1
```

Its scope is written up in `phase.md` § Decomposition → *P25.S4*. D19's stored trigger
("Operator wants pretty share URLs") has fired, and its whole content — the public graph
addressed by org slug instead of tenant UUID — is exactly this slice.

**Note on `depends_on`:** `P25.S5` names only `P25.S3`, not `P25.S4`. `validate` checks
that every `depends_on` target exists, and `P25.S4` does not exist yet — adding it here
would have failed validation. The orchestrator may add it after promoting D19.

## Design decisions settled (full rationale in `phase.md` § Findings & Notes)

1. **URL shape** — `/@{org}/{project}/{doc-slug}` for documents, `/@{org}/graph` for the
   graph. The Next.js parallel-route hazard the plan warned about does not apply: the
   folder is a plain dynamic `[org]`, and only the *param value* starts with `@` (a legal
   unencoded path character). Fallback, if the route-precedence check in Q1 fails, is a
   rewrite/middleware onto an internal prefix — the user-facing URL shape is unchanged
   either way.
2. **Doc-slug collisions** — the pretty URL omits the date and resolves to the newest
   `(project, slug)` via the existing `find_latest_document_by_slug` (`date DESC, id
   DESC`), tenant-scoped. No dated form; exact-row addressing stays on `/documents/{id}`
   and `/documents/{id}/versions/{v}`.
3. **Org slug provisioning** — nullable `UNIQUE` `tenants.slug` (alembic
   `0005_tenant_slug`, additive, **no backfill**), app-layer charset + reserved-word
   validation, set via `PATCH /app/tenant` and a dashboard field. Tenant #1 gets its slug
   when the **operator** sets it after deploy — no hardcoded value anywhere.
4. **Old links** — never 404. Anonymous `/documents/{id}` redirects to `canonical_path`
   when one exists (members keep the id URL, which carries member-only affordances);
   `/graph/{uuid}` redirects to `/@{org}/graph` when the tenant has a slug. Redirects are
   **307 temporary**, not 308, because slugs are mutable. A slug-less tenant sees exactly
   today's behavior.

Supporting mechanism: an additive nullable **`canonical_path`** on the document read
shape, so the pretty URL is built once in the backend and never re-derived in TypeScript.

## Key research findings that shaped the breakdown

- **No project slug is needed.** `validate_project` (`^[A-Za-z0-9][A-Za-z0-9._-]*$`)
  already makes project names URL-safe — they are directory names in `rel_path`, and the
  same string lives in both `projects.name` (Postgres) and `documents.project` (SQLite).
  This removed a whole slice's worth of work from the original expectation.
- **Version/raw reads can stay id-keyed** — they resolve the current doc first and read
  the archive by `rel_path`, and the resolver response carries `id`. So the
  `next.config.ts` `X-Frame-Options` exemptions and the sandboxed-explainer iframe path
  need no change.
- **nginx needs no change.** `location /` already routes everything unmatched to the web
  container, and `/app/` to the API; the single regex location is
  `~ ^/api/documents/[0-9]+/raw$`, untouched by this phase.
- **`_resolve_readable_doc` is the trust boundary to reuse** rather than re-derive, so
  the new slug route inherits 404-never-403, the legacy-mode guard and the
  registry-less-owner guard for free.
- **The Postgres-gated test suite skips silently** without `KB_TEST_DATABASE_URL` /
  `DATABASE_URL` — recorded in `phase.md` § Constraints so every slice reports whether it
  actually ran.

## Validation

| Command | Outcome |
|---|---|
| `python3 scripts/workflow.py validate` | **passed** — `Workflow validation passed.` |
| `ls works/phases/active/P25/slices/P25.S1/` | confirms bare folder (`slice.json` only) |

No code was changed by this slice, so no test suite applies.

## Doc impact

None recorded for this slice itself (decomposition changes no durable truth). A
**"Doc impact"** section was opened in `phase.md` with the *expected* areas the
implementation slices will touch (`api.md`, `data.md`/`architecture.md`,
`frontend.md`/`experience.md`, `decisions.md`), marked as expectations for the
implementation slices to replace with real notes as they land.

## Deviations from `plan.md`

None of substance. Two judgment calls worth naming:

- The plan suggested "the graph URL could be `/@{org}/graph` or `/graph/@{org}` — your
  call". Picked `/@{org}/graph` (everything public hangs off one namespace) after
  confirming it does not collide with the 3-segment doc route.
- The plan allowed 3–5 middle slices; the breakdown uses the full 5, because the D19
  graph work is genuinely separable and the share affordances span three web surfaces.
  Every slice is `risk: high` — none is a one-/few-line edit, so none routes to the
  `mid` tier.
