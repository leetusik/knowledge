# P12.DECOMP — Result

Decomposed P12 into 6 bare middle-slice folders and seeded the phase notebook. No app code, no slice `plan.md`, no doc versions, no commits.

## Research verification (against the current tree, 2026-07-16)

The plan's research was verified before creating anything — **no drift**, so the 6-slice shape was kept exactly as planned:

- `server/auth_api.py` `/auth/*` shapes (signup singular-`tenant` 201, login plural-`tenants[]` 200 generic-401, logout 204, `/auth/me`) — match.
- `server/app_api.py` `/app/*` (tenant, projects GET/POST, project GET 404-cross-tenant, credentials POST/GET/DELETE) + `server/usage_api.py` (`GET /app/usage`, `GET /app/projects/{id}/usage`, default `days=30`) — match.
- Documents/search are **not** on `/app/*` — confirmed. They live only on `/api/*` in `server/main.py` (`GET /api/documents`, `/api/documents/{id}`, `/api/search`, `POST/DELETE /api/documents`); no `/app/documents`, `/app/search`, or `/app/graph` route exists.
- Graph assets exist: `scripts/graph_hook.py` (7.7 KB), `docs/javascripts/graph.js` (**1130 lines**, matches the plan's ~1130), `docs/graph.md`.
- Template paths exist: vocky `web/src/{lib/session.ts, lib/bff.ts, lib/auth-guards.ts, lib/vocky/, components/ui/, components/usage/, components/app-shell/}` and `works/phases/active/P4/phase.md`; hi2vi_web `src/app/globals.css`, `src/lib/utils.ts`, `next.config.ts`.
- `web/` does not exist yet.

## Slices created

| Slice | Name | kind | risk | order | depends_on |
|-------|------|------|------|-------|------------|
| P12.S1 | App scaffold + design-system foundation | implementation | medium | 1 | — |
| P12.S2 | Auth + BFF proxy + authenticated app shell | implementation | high | 2 | P12.S1 |
| P12.S3 | Tenant dashboard: projects + create + tenant usage | implementation | medium | 3 | P12.S2 |
| P12.S4 | Project detail: info + credentials + project usage | implementation | medium | 4 | P12.S2 |
| P12.S5 | Per-tenant documents browse + search | implementation | medium | 5 | P12.S2 |
| P12.S6 | Knowledge graph in the web app (per-tenant) | implementation | medium | 6 | P12.S2 |

Each new slice folder holds only `slice.json` — no `plan.md`/`result.md` pre-filled. Foundation chain S1→S2, then fan-out S3/S4/S5/S6 (each depends only on S2). S2 is the one `high` (auth/BFF boundary); S4 and especially S6 carry an explicit bump-to-`high` option at their planning turns.

## phase.md sections seeded

Context; Decomposition (intro + six per-slice bullets + "Why 6" rationale); Findings & Notes (Decisions D-P12-1/2/3 + operator scope decisions; verified Implementation anchors; DECOMP cross-slice notes); Constraints; Open Questions (a–d); and the Doc impact running list (frontend, architecture, api, experience, decisions, operations, product).

## Validation

- `python3 scripts/workflow.py validate` → **Workflow validation passed.**
- `python3 scripts/workflow.py next` → `current_slice=P12.DECOMP`, `next_slice=P12.S1` (P12.S1 becomes current once the orchestrator finishes DECOMP; `P12.REVIEW` remains last).
- `works/backlog.md` lists P12.S1–S6 with the risk/order/depends above, REVIEW last.
- No files under `web/`; no new `docs/versions/*`; no commit.

## Deviations

None — the plan's research held, so the 6-slice breakdown and all metadata were created verbatim.
