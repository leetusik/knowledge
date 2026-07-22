# Plan — P19.DECOMP (decompose "Public projects & direct doc links")

Operator-approved 2026-07-22 (do-whole-phase, manual gate). Executor: `slice-executor-high`.

## Mission

Decompose P19 into middle slices — create them with `python3 scripts/workflow.py new-slice` (bare folders; never pre-fill their `plan.md`), set each `--risk` deliberately (it selects the executor tier; `low` only for fully mechanical work — expect none here), set `--order`, and seed `phase.md` (Decomposition rationale, Findings & Notes including the fact-corrections below, Constraints). No implementation, no doc versions. Write `result.md`, return a structured verdict. You may run `new-slice` (this is the one slice allowed to); never commit, never transition slice/phase status.

Phase objective (`phase.json` / `intent.md`): per-project public/private visibility — public projects' docs and graph readable by anonymous visitors and other users (the graph shows outsiders only public-project nodes) — and every save returns a working direct doc URL replacing the legacy mkdocs `url` field.

## Grounded facts (verified by orchestrator research this session; spot-check as you go)

**Server**
- `projects` table (`server/persistence/models.py:87-108`): `id, tenant_id, name, created_at`, `UNIQUE(tenant_id,name)` — **no visibility column anywhere**. Migrations: alembic `alembic/versions/0001..0003`; an `0004` follows `0003_org_level_credentials` (naming convention via `server/persistence/base.py:6-18`).
- Get-or-create by name on write path: `AccountsService.get_or_create_project` (`server/accounts/service.py:246-284`) via `ensure_registry_project` dep (`server/main.py:391-420`) + `POST /app/projects` (`server/app_api.py:130-143`). Implicit creates need a default visibility → **private**.
- **No anonymous read path exists**: `/app/*` is session-only via `require_user` (`server/accounts/auth.py:65-97`, always raises); `/api/*` needs a resolvable bearer in tenant mode (`server/api_auth.py:190-244`). **`KB_REQUIRE_READ_AUTH` is a no-op in tenant mode** (only the legacy branch consults it, `api_auth.py:225-234`) — corrects an imprecision in `intent.md`; record in `phase.md`.
- No "is user member of tenant X" helper exists (only `list_tenants_for_user`); solo-owner MVP maps a session to the user's first tenant.
- **Cross-plane bridge**: SQLite `documents` (`server/db.py:22-40`) carries `tenant_id` + project **name string** — no project_id FK, no visibility. Project identity/visibility lives in Postgres. Any doc/graph visibility filter must bridge name↔visibility per tenant.
- Read paths needing a visibility predicate: shared `db._filtered` (`db.py:256-282`, backs list/count), `get_document` (:224), `get_document_by_path` (:239), `list_tags` (:337), `list_projects` (:363), `get_all_embeddings` (:432), `search.py:231-246`; endpoints in `main.py` (245,262,271,281,293,305), `documents_api.py` (102,138,156,193), `graph_api.py:157-189`.
- Graph `GET /app/graph` (`graph_api.py:157-189`): session-only, tenant-wide, nodes carry project **name** (:86,:125) + per-project counts (:144-150); node `url` is `/documents/{id}` (:83-84).
- Save 201 `url` built at **one site**: `server/main.py:592-595` = `KB_PUBLIC_BASE_URL/{project}/{date}-{slug}/` — legacy mkdocs pattern, retired on prod at P14 (`compose.prod.yml:56-63` documents it as broken/cosmetic), wrong for all non-#1 tenants. CLI deliberately hides it (`cli/src/knowledge_cli/knowledge.py:402-410`; guide restates at `cli/src/knowledge_cli/guide.py:137`).
- 404-never-403 everywhere for cross-tenant (`app_api.py:99-109`, `documents_api.py:86-99`, `db.py:224-236`); auth failures are generic 401.

**Web (Next.js 16 App Router, BFF, no middleware)**
- `(app)` layout gates everything via `requireIdentity()` → redirect `/login` (`web/src/app/(app)/layout.tsx:19`, `web/src/lib/auth-guards.ts:43-55`). Routes: dashboard, documents, documents/[id], graph, projects/[projectId].
- Doc detail renders HTML docs in `sandbox="allow-scripts"` iframe → self-guarded BFF relay `web/src/app/api/documents/[id]/raw/route.ts` → `GET /app/documents/{id}/raw` (P16 pinned decision, headers re-asserted; `next.config.ts:41-56`).
- Graph page passes `GET /app/graph` payload to `<GraphCanvas>`; legend is a lens (dim, not filter) keyed by project name (`graph-canvas.tsx:807-846,1318-1383`).
- Project detail page (`projects/[projectId]/page.tsx:190-199`) has no settings block — natural home for the visibility toggle. `KbProject` type has no visibility field (`types.ts:53-58`). No share/copy-link affordances exist except mint-key clipboard buttons (pattern to reuse).
- `robots.ts:8-25` disallows `/documents`, `/graph`, `/projects`…; `sitemap.ts` lists only `/`. Public pages must consciously amend this.
- Prod: `NEXT_PUBLIC_APP_URL=https://knowledge.hi2vi.com` (build-arg, baked).

**Parity / contract constraints**
- `server/` tree + most `tests/*.py` are **byte-mirrored** in `plugin/templates/kb/` (`plugin/templates/manifest.json`; `scripts/plugin_parity.py` in CI). New server files must be added to template + manifest.
- **Template nuance**: the mirrored server runs the dormant single-tenant stack where mkdocs at `KB_PUBLIC_BASE_URL` still EXISTS — the legacy `url` is *correct* there. The `url` fix must be mode-aware (legacy mode keeps mkdocs URL; tenant mode returns the app doc URL).
- Explain skill: exactly 2 copies (`plugin/skills/explain/SKILL.md` canonical, `.agents/skills/explain/SKILL.md`), body byte-parity in CI (`scripts/skills_parity.py`); Step 8 already reports the `url` (SKILL.md:471-485).
- `api.md:305-311` documents `url` as always-present in a frozen/additive-only contract — value changes, key stays; doc impact note.
- Prod cutover pattern (P18.S5 runbook, `works/phases/active/P18/slices/P18.S5/result.md` §4): reconcile box clone → `docker compose -f compose.prod.yml run --rm api alembic upgrade head` → `deploy/deploy.sh`, operator-gated; Production Deploy action runs no alembic.
- Tests: root `tests/` (pytest, mirrored), `cli/tests/` separate. Deferred D15: pre-existing gated failure in `test_documents_api` (documents-list projection) — flag, don't absorb silently. D13 (source_url) is distinct — out of scope.

## Resolved at the gate: no design round in P19

Operator approved: every public surface composes 1:1 from already-designed pieces — public doc view = existing document-detail rendering without the authenticated app shell; public graph view reuses `<GraphCanvas>` as-is; toggle and copy-link reuse existing form/clipboard patterns. No new visual decisions → no `co-work` design slice. Anything genuinely new (branded share chrome, sign-up CTA for anonymous visitors) is out of scope — defer as a candidate for a later design round (note it in `phase.md`). Seed this as a phase constraint: **no design authoring; composition from existing designed pieces only.**

## Required design stances (take a position, record rationale in `phase.md`)

1. **Visibility bridge**: recommend per-read resolution of the tenant's public-project-name set from Postgres (toggle takes effect instantly; no SQLite schema change/reindex) over denormalizing onto SQLite rows; confirm feasibility at current scale (graph ≤2000 nodes, `MAX_DOC_NODES` `graph_api.py:59`).
2. **Public URL namespace**: docs — public read at the existing `/documents/{id}` shape for share-link continuity (server: new anonymous-capable read; web: public route/optional identity) vs a separate `/p/...` namespace; graph — an org-scoped public URL needs an org identifier in the path (tenant UUID acceptable for MVP; an org slug is a deferrable nicety). Private/nonexistent → 404, never 403 (extends the existing convention).
3. **Auth shape**: new optional-identity dependency vs separate public endpoints on the server; on the web, public pages live outside the `(app)` gate (new route group or self-guarding pages). The raw HTML relay must work for public docs (anonymous BFF path) with the P16 sandbox/CSP headers unchanged.
4. **Save `url` fix is mode-aware**: tenant mode → app doc URL (`{app origin}/documents/{id}`; decide the origin source — `KB_PUBLIC_BASE_URL` is already the app origin on prod); legacy mode (template stack) → keep the mkdocs URL. CLI un-hides the URL; skill text updated in both copies; api.md/backend.md doc impact noted.

## Candidate slice structure (refine as your investigation warrants; expected ~5 middle slices)

- **S1 Backend visibility core**: alembic `0004` (projects.visibility, default private) + model/type plumbing + `PATCH /app/projects/{id}` visibility toggle + get-or-create default + tests. (medium/high)
- **S2 Backend public read surface**: anonymous doc read + raw + org-scoped public graph filtered to public projects + 404 conventions + tests. (high — auth boundary)
- **S3 Web**: toggle UI on project detail (+ dashboard row badge), public doc page + public graph page composed from existing components, share/copy-link affordance, robots/sitemap amendments. (medium/high)
- **S4 Save-URL + CLI + skill + parity**: `main.py` url repoint (mode-aware) + CLI print + guide + both SKILL.md copies + template mirror + manifest + tests. (medium)
- **S5 Prod cutover**: reconcile → alembic 0004 → deploy → live smoke (public link E2E), operator-gated (`pending` checkpoints). (high)

## Constraints to seed into `phase.md`

Template/skill parity CI gates; api.md additive-only; keep tests terse; D15 caveat; D13 out of scope; no design authoring (composition from existing designed pieces only).

## Deliverables

`new-slice` calls creating the middle slices (bare folders, deliberate `--risk`/`--order`); `phase.md` seeded (Decomposition, Findings & Notes incl. fact corrections, Constraints); `result.md`; structured verdict.
