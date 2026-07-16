# P10.DECOMP — result

## What this slice did

Decomposed phase P10 into six middle slices (bare folders) and seeded the phase notebook `works/phases/active/P10/phase.md` as the shared cross-slice context. No source code written; no `plan.md` pre-filled for any middle slice; no docs versioned; no status transitions; no commit.

## Slices created (bare folders — `slice.json` only)

All via `python3 scripts/workflow.py new-slice`, exactly as the plan specified. Chained S1→S6 (each depends on its predecessor):

| Slice | Name | kind | risk | order | depends_on |
|-------|------|------|------|-------|-----------|
| P10.S1 | Accounts persistence: Postgres + schema + Alembic + accounts layer | implementation | high | 1 | — |
| P10.S2 | Auth surface /auth/* + require_user session guard | implementation | high | 2 | P10.S1 |
| P10.S3 | Control plane /app/*: tenant-scoped projects + vk_ credentials | implementation | **medium** | 3 | P10.S2 |
| P10.S4 | /api/* credential auth: resolve credential -> tenant+project | implementation | high | 4 | P10.S3 |
| P10.S5 | Content tenant-scoping: documents.tenant_id + reindex + namespaced storage | implementation | high | 5 | P10.S4 |
| P10.S6 | Seed tenant #1 + migrate live corpus + E2E onboarding smoke | implementation | high | 6 | P10.S5 |

Verified each folder contains only `slice.json` (no pre-filled `plan.md`) and that risk/order/kind/depends_on match the plan (S3 medium, the rest high).

## phase.md seeded

Filled all five sections of `works/phases/active/P10/phase.md`:

- **Context** — the two-plane architecture (Postgres control plane / unchanged content plane), solo-owner MVP, namespaced `docs/`-canonical storage decision, `KB_API_TOKEN`-as-legacy-tenant-#1 decision, and the two hard couplings (startup-reindex/`docs/`-canonical → tenant identity must live in the file path; frozen additive-only `POST /api/documents`).
- **Decomposition** — the six-slice table, authoritative per-slice scope, and the risk-differentiation rationale (S3 = the one clean mechanical `/app` CRUD port → medium; auth/new-datastore/frozen-contract/cross-store-derivation/live-migration → high; S2/S3 and S4/S5 split rationale; linear S1→S6 chain).
- **Findings & Notes** — the vocky reference map (with line anchors verified against `/Users/sugang/projects/personal/vocky`), the current-backend integration points (with line anchors verified against `server/`), the solo-owner + optional-`last_used_at` notes, the D6 deferral note, and the Doc-impact list (architecture / backend / data / api / security / operations / decisions).
- **Constraints** — single worker, frozen additive-only contract, files-canonical + disposable SQLite, no per-tenant public sites, tenant #1 zero-client-change.
- **Open Questions** — async-vs-sync SQLAlchemy (resolve S1), namespaced-root path + mkdocs exclusion (resolve S5), session tokens on `/api/*` reads (resolve S4).

## Verification performed

Spot-checked the plan's distilled references against the real files (line anchors matched, with minor drift noted below):

- vocky: 6 accounts tables present in `src/vocky/persistence/models.py` (users L170, tenants L186, tenant_members L201, projects L231, project_credentials L252, auth_tokens L283); `NAMING_CONVENTION` in `persistence/base.py` L6; `accounts/` (security/types/repository/service/auth) present; `vk_` mint in `app_api.py` L234 (`token_prefix=key[:12]` L238, `token_hash=sha256_hex(key)` L239); `smoke.py` present; alembic lives at the **vocky repo root** (`alembic/env.py`), not under `src/vocky/` — noted in phase.md.
- knowledge backend: `main.py` auth deps `require_bearer` L69 / `require_read_bearer` L82; `db.py` `init_db` L84, `_filtered` L193, `list_tags` L249, `list_projects` L267, `get_all_embeddings` L330, `get_document` L179; `reindex.py` `RESERVED_DIRS` L23, `Path(rel).parts[0]` L37; `documents.py` `rel_path` L87, `ensure_project_landing` L342; `search.py` `search` L193.

## Deviations from plan

None material. Two clarifications folded into phase.md rather than reproduced verbatim from the plan:

1. **config.py line drift** — the plan cited `KB_API_TOKEN` ~L44 and `KB_STARTUP_REINDEX` ~L100; the actual anchors are L46 and L105. phase.md uses the verified numbers and flags all backend line anchors as "approximate — they will drift as slices edit."
2. **vocky alembic path** — the plan wrote `alembic/versions/…add_accounts_tenancy.py`; the alembic tree lives at the **vocky repo root** (`alembic/env.py`), not under `src/vocky/`. phase.md records the corrected location.

## Deferred job

D6 (paid-plan retriever endpoint) already exists at `works/deferred/open/D6` and is recorded in phase.md as the phase's standing deferral. **Not** created here (it pre-exists); not promoted.

## For the orchestrator

The six bare slices exist and `phase.md` is seeded. Ready for `validate`, `finish-slice P10.DECOMP`, and commit. No docs versioned (correct — durable docs are consolidated later at `P10.REVIEW` from the Doc-impact list). Next executable slice is **P10.S1** (order 1), which the orchestrator will plan at its turn.
