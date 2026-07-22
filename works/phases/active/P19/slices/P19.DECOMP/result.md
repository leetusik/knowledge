# Result — P19.DECOMP

Decomposed "Public projects & direct doc links" into **five implementation middle slices**. No implementation code written; no doc versions created. `phase.md` seeded (Decomposition, Findings & Notes with fact corrections + design-stance decisions, Constraints, Open Questions).

## Investigation / spot-checks (all plan facts confirmed accurate)

- `projects` table has **no visibility column** (`server/persistence/models.py:87-108`); alembic chain ends at `0003_org_level_credentials` (`down_revision = "0002_usage_events"`), so `0004` follows it.
- **`KB_REQUIRE_READ_AUTH` is a no-op in tenant mode** — consulted only in the legacy branch of `resolve_api_read` (`server/api_auth.py:227-234`); the tenant branch always requires a resolvable bearer. Recorded as a fact correction to `intent.md`'s wording.
- **No PATCH route on projects** — confirmed the full `app_api.py` router list (GET/POST `/app/projects`, GET `/app/projects/{id}`, credential subroutes only). `serialize_project` (`app_api.py:66-74`) and `ProjectRecord` (`accounts/types.py:62-68`) both lack visibility and need plumbing.
- Save `url` built at the **single site** `server/main.py:592-595` (`KB_PUBLIC_BASE_URL/{project}/{date}-{slug}/`).
- SQLite `documents` carries `tenant_id` + project **name string** only; visibility lives in Postgres → cross-plane bridge required. Read filter site `db._filtered` (`db.py:256-282`) confirmed. Graph node `url` is already `/documents/{id}` (`graph_api.py:83`); graph endpoint session-only + tenant-wide (`graph_api.py:157-189`).

## Design stances taken (rationale in `phase.md` Findings & Notes)

1. **Visibility bridge → per-read resolution from Postgres** (public-project-name allowlist per read), not SQLite denormalization — instant toggle, no reindex, feasible at ≤2000-node scale.
2. **Public URL namespace → reuse `/documents/{id}`** for docs (share-link continuity); org-scoped public graph carries an org id in the path, **tenant UUID for MVP**, slug deferred. Private/nonexistent → 404 never 403.
3. **Auth shape → optional-identity server dependency** (not separate public endpoints); web public pages **outside the `(app)` gate**; anonymous raw-HTML relay keeps P16 sandbox/CSP headers unchanged.
4. **Save `url` mode-aware** — tenant → `{app origin}/documents/{id}` (origin from `KB_PUBLIC_BASE_URL`); legacy/template → keep mkdocs URL.

## Slices created (bare folders, `slice.json` only — no pre-filled `plan.md`)

| id | name | kind | risk | order | depends_on |
|----|------|------|------|-------|------------|
| P19.S1 | Backend visibility core: `projects.visibility` migration + PATCH toggle | implementation | medium | 1 | — |
| P19.S2 | Backend public read surface: anon doc/raw read + org-scoped public graph | implementation | high | 2 | P19.S1 |
| P19.S3 | Web public surfaces: visibility toggle + public doc/graph pages + share link | implementation | high | 3 | P19.S2 |
| P19.S4 | Save-URL fix (mode-aware) + CLI un-hide + skill + template/manifest parity | implementation | medium | 4 | P19.S1 |
| P19.S5 | Prod cutover: reconcile + alembic 0004 + deploy + public-link live smoke | implementation | high | 5 | P19.S1..S4 |

Risk rationale: no `low` slices (none of this is fully mechanical). S2/S3/S5 are `high` — S2 introduces a new trust boundary + cross-plane bridge with non-leak guarantees, S3 crosses the web public/private boundary with an anonymous sandboxed relay, S5 is an operator-gated irreversible prod migration. S1/S4 are `medium` — bounded migration/plumbing and parity-gated mode-aware wiring, respectively, both needing judgment but no new trust boundary.

## Validation

- `python3 scripts/workflow.py validate` → **Workflow validation passed.**
- Confirmed all five slice folders contain only `slice.json` (no `plan.md`).

## Open risks / notes for the orchestrator

- **S2 is the security-critical slice** — the anonymous read must never leak private-project docs or graph nodes; its plan should demand an explicit negative test.
- **Parity discipline** spans S2 (new server files → template + manifest) and S4 (both `SKILL.md` copies, template mirror, manifest) — CI (`plugin_parity.py`, `skills_parity.py`) will fail otherwise.
- **Open question** left in `phase.md`: the public-graph org-in-path shape (query `?org=` vs path segment) — either acceptable, decide at S2/S3 planning; org **slug** vanity URL deferred.
- **Doc impact** is not versioned here (decomposition slice) — the review will consolidate `api.md`, `backend.md`, `frontend.md`, `product.md` per the notes seeded in `phase.md` Constraints.
- **D15** (pre-existing `test_documents_api` gated failure) and **D13** (`source_url`) are flagged out-of-scope in Constraints.

## Deviations from `plan.md`

None. Followed the candidate 5-slice structure; refined slice names and set risks/deps deliberately as the plan invited.
