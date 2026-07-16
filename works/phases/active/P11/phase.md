# Phase P11: Per-Tenant Usage Monitoring

_Intent: see [intent.md](intent.md)._

## Objective

Meter per-tenant/per-project usage (API calls, documents saved, search activity) and expose it via API for the dashboard; free plan only — observability, not quotas or billing

## Context

P11 is phase 2 of the five-phase SaaS pivot (P10–P14). **P10** delivered accounts, tenancy, and a
tenant-scoped `/api/*`. P11 adds **per-tenant / per-project usage monitoring** — observability only:
**no quotas, no billing, no entitlements**. The paid retriever endpoint is out of scope (tracked as
deferred D6). These metrics feed **P12's** tenant dashboard + project-detail pages via a read API.

## Decomposition

Shape: **S1 → {S2, S3} → S4**. S1 lays the durable schema + aggregate service; S2 (metering hook)
and S3 (read API) both build on S1 and are independent of each other; S4 is the E2E smoke that
exercises the whole chain end-to-end and so depends on S3 (which in turn transitively needs S2's
writes to produce non-zero counts, but the smoke drives writes itself via the live API, so the
declared dependency is on the read API it calls).

| Slice | Name | Kind | Risk | Order | Depends on | Scope |
|-------|------|------|------|-------|------------|-------|
| P11.S1 | Usage persistence + aggregate service | implementation | medium | 1 | — | `usage_events` model + hand-written Alembic `0002_usage_events`; `Create*/*Record` types; `UsageRepository` (insert-event + windowed GROUP-BY-day aggregate); `UsageService` (`record_event` best-effort + `get_usage_metrics`). No HTTP wiring. |
| P11.S2 | Metering hook (record writes/deletes/search + wire `last_used_at`) | implementation | medium | 2 | P11.S1 | Record `document.created` (201), `document.deleted` (2xx), `search` (2xx) best-effort; resolve project attribution (payload/filter name → project UUID, nullable fallback); wire `touch_credential_last_used` in `_resolve_tenant_bearer`. Owns the **sync→async** resolution. |
| P11.S3 | Usage read API | implementation | medium | 3 | P11.S1 | `server/usage_api.py`: `GET /app/usage` (tenant-scoped) + `GET /app/projects/{id}/usage` (`_load_scoped_project`, 404 cross-tenant, + project credentials with `last_used_at`). Vocky response shape, 30-day default window, empty-tenant short-circuit. Mounted in `main.py`. |
| P11.S4 | E2E usage smoke + verification | implementation | low | 4 | P11.S3 | Extend `scripts/onboarding_smoke.py`: tenant B writes a doc + searches, then asserts `/app/usage` counts, `/app/projects/{id}/usage` project counts + credential `last_used_at`, and cross-tenant isolation. |

**Risk rationale.** S1–S3 are **medium**: S1 is the first durable schema since P10 plus aggregate-query
correctness; S2 is hot-path integration with best-effort semantics and legacy-mode parity to protect;
S3 is cross-tenant-404 + serialization correctness that P12 will consume. **S4 is the only `low`** — it
is a mechanical extension of an already-established smoke template (`scripts/onboarding_smoke.py`), no
new design. (The orchestrator may bump S4 to `mid` if S3 leaves the response shape non-obvious.)

## Findings & Notes

_Load-bearing research established before DECOMP (file:line pointers verified against the tree at
decomposition time)._

### Vocky's "no metering table" trick only half-applies
Vocky derived all usage from an existing domain table (`feedback_events`) + `last_used_at` stamps.
For us, **documents-saved totals are already derivable** from the existing `GET /api/projects`
(`{project, count, latest_date}`) and `GET /healthz` — but **search activity and API-call volume
persist nowhere**, so they need real metering. Hence a small durable event table is unavoidable; we
keep vocky's *read* shape.

### Metering seam — where to hook
No middleware exists in `server/`. `/api/*` funnels through two async resolvers
`resolve_api_read` / `resolve_api_write` → shared **`_resolve_tenant_bearer` (`server/api_auth.py:123`)**,
where the credential is resolved to `tenant_id` (+ `project_id` **only for `vk_` callers**; master
bearer & session tokens leave `project_id=None`). `cred` is in scope at **`api_auth.py:147`**.

### `last_used_at` is built but unwired
`project_credentials.last_used_at` + `touch_credential_last_used` exist
(**`server/accounts/repository.py:204`**, **`server/accounts/service.py:265`**) but are **never called**.
`auth_tokens` is already wired via `touch_auth_token_last_used` in the best-effort try/except at
**`server/accounts/auth.py:84`** — copy that stamp pattern (one indexed UPDATE; failure logged, never
fails the request).

### sync→async wrinkle (the crux of the metering slice, P11.S2's key risk)
The content handlers `create_document` / `search` / `delete_*` are **sync `def`** (WRITE_LOCK + sqlite),
but a Postgres usage write is **async**, and event-type + success-status are only known *after* the
handler runs. **Recommended resolution:** an **async HTTP middleware** that reads the resolved ctx off
`request.state` (the resolver stashes it) + the response status, and records a best-effort event for the
metered routes on 2xx; keep the `last_used_at` stamp in the resolver (it has `cred`). S2 owns
choosing/validating this mechanism — it is that slice's key risk.

### Project attribution wrinkle
The operator (tenant #1) writes via the **master bearer**, which has **no `project_id`** on the context —
but the POST body carries `project` (name) and search carries a `project` filter. To attribute the
operator's own usage per project (a primary dashboard case), resolve the operation's project
**name → Postgres project UUID** within the tenant (best-effort). `usage_events.project_id` stays
**nullable** so an unmapped name degrades cleanly to tenant-level attribution.

### Persistence + Alembic templates
New entity = model (`server/persistence/models.py`, follow **`ProjectModel` at :87** — `NAMING_CONVENTION`,
`PG_UUID`, tz-aware `utc_now`) → types (`Create*`/`*Record`, `server/accounts/types.py`) → repository
(sole ORM boundary, **never commits**) → service (owns the `async with session … commit`) → hand-written
Alembic migration **`0002_<slug>.py` with `down_revision="0001_accounts_tenancy"`** (style:
`alembic/versions/0001_accounts_tenancy.py`), run explicitly as a deploy step (`alembic upgrade head`).

### Read-API template
`server/app_api.py` is the exact pattern the read endpoints mirror: `Depends(require_user)`,
`_load_scoped_project` (404 both missing & cross-tenant), `serialize_*` helpers, `get_accounts_service()`.
Vocky's proven response shape: `{window:{start,end}, totals:{…}, daily_counts:[{day,…}], projects|credentials:[…]}`,
default window = last 30 days, missing days zero-filled in Python.

### Testing posture
There is **zero pytest coverage** of the Postgres/accounts plane; the only harness is
`scripts/onboarding_smoke.py` (live httpx E2E, tenant mode). P11 **extends that script** rather than
standing up a new pytest Postgres fixture — matches the repo's "keep tests lean, prefer smoke checks" rule.

## Resolved design (shared by all middle slices)

- **`usage_events` (durable Postgres, 7th control-plane table):** UUID PK; `tenant_id`
  (FK→`tenants`, `ondelete=CASCADE`, indexed); `project_id` (nullable FK→`projects`, `ondelete=SET NULL`,
  indexed); `event_type` (text — `document.created` | `document.deleted` | `search`); `occurred_at`
  (tz-aware, default `utc_now`). Indexes for windowed aggregates on `(tenant_id, occurred_at)` and
  `(project_id, occurred_at)`. **Event-log grain** (one row per event; aggregates derived on read).
- **Aggregate on read:** `UsageService`/`UsageRepository` `get_usage_metrics(tenant_id, project_id?, window)`
  — a single grouped SELECT (`GROUP BY date(occurred_at)`, conditional counts per `event_type`), totals
  summed in Python, days zero-filled to a contiguous windowed series (bounded by the window, never by
  event volume). Mirrors vocky `feedback/repository.py`.
- **Metering:** best-effort, isolated transaction, **never fails the request**; covers **all** caller
  types (master / `vk_` / session) so tenant #1's own activity is counted. `last_used_at` stamp lives in
  the resolver.
- **Read API home:** a new `server/usage_api.py` router (mounted in `server/main.py` like
  `auth_api`/`app_api`), session-guarded, cross-tenant-safe (404).
- **Legacy/dormant parity:** with `DATABASE_URL` unset, metering is inert and `/api/*` stays
  byte-for-byte pre-P10 (the 65-test legacy regression must stay green).

## Resolved decisions

Two design forks were resolved with the operator before DECOMP; these become `decisions.md` ADRs at REVIEW:

1. **Grain = event log.** One durable Postgres row per metered event; dashboard aggregates are derived
   on-read (GROUP BY day). Chosen over per-request rollups for flexibility and simplicity at low volume.
2. **Meter scope = writes + searches only.** Meter high-signal events (document create, document delete,
   search) synchronously best-effort, plus stamp credential `last_used_at` for recency. The open read/list
   path stays **unmetered** so it stays fast — this avoids by construction the hot-path write-amplification
   vocky explicitly warned about (their P3 `phase.md:50`).
3. **Retention = deferred.** The event log grows unbounded; a cleanup/retention job is deferred (filed by
   the orchestrator after DECOMP) until volume becomes material — not built now.
4. **Read shape = vocky's.** `{window, totals, daily_counts, projects|credentials}`, 30-day default window,
   zero-filled days. Derive-on-read; `last_used_at` finally wired for recency.

## Doc impact

_Running list of durable-truth changes for the REVIEW slice to consolidate into new doc versions
(one version per doc, capturing the whole phase). Middle slices append here; they do NOT version docs._

- **`data.md`** — new `usage_events` table (event-log grain, 7th control-plane table), retention deferred.
- **`api.md`** — new reads `GET /app/usage` + `GET /app/projects/{id}/usage` (additive control-plane reads).
- **`backend.md`** — metering seam (`_resolve_tenant_bearer` + async middleware), `server/usage_api.py` /
  `UsageService`, sync→async approach.
- **`operations.md`** — `0002_usage_events` migration → `alembic upgrade head` deploy step; onboarding smoke
  extended with usage assertions.
- **`decisions.md`** — event-log-over-rollup, meter-writes+searches, derive-on-read, `last_used_at` wired.
- **`security.md`** — per-tenant usage isolation, cross-tenant-404 on the usage reads.

## Constraints

- **Legacy/dormant parity:** with `DATABASE_URL` unset, `/api/*` stays byte-for-byte pre-P10; the 65-test
  legacy regression must stay green.
- **Metering never fails a request:** best-effort, isolated transaction, failures logged not raised.
- **Frozen `/api/*` consumer contract untouched:** metering is additive / side-effect only — no change to
  request or response shapes the live hi2vi agent depends on.

## Open Questions

_For the middle slices to resolve at their own turn._

- **S2:** exact metering mechanism — async HTTP middleware (recommended) vs per-handler hooks?
- **S1:** is `event_type` an enum / CHECK constraint or free text?
- **S2:** cost of project-name → project-UUID resolution on the write path (extra query per metered write)?
