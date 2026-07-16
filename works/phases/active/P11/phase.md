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

### S1 built (usage persistence + aggregate) — contracts for S2/S3
_Done in P11.S1: `usage_events` model, `alembic 0002_usage_events`, `server/usage/` package
(`types`/`repository`/`service`). No HTTP wiring. Import check + 65-test legacy suite green; the
DB round-trip is deferred to S4/REVIEW (no Postgres in the S1 env)._

- **Shared event-type constants** live in `server.usage.types` — **import them, never re-declare
  the literals** (S2 records with these, S3 reports them):
  `EVENT_DOCUMENT_CREATED = "document.created"`, `EVENT_DOCUMENT_DELETED = "document.deleted"`,
  `EVENT_SEARCH = "search"`. `usage_events.event_type` is **free text** (no DB enum/CHECK) — this
  resolves the S1 open question; integrity comes from these constants.
- **`record_event` raises on failure** — `UsageService.record_event(payload: RecordUsageEvent)`
  runs on its own isolated transaction and raises `UsagePersistenceError`; **the S2 caller must wrap
  it best-effort** (catch + log, never fail the observed request). `RecordUsageEvent{tenant_id: UUID,
  event_type: str, project_id: UUID|None=None, occurred_at: datetime|None=None}` — pass `project_id=None`
  for master-bearer / unmapped-project usage (degrades to tenant-level via the nullable `SET NULL` FK).
  Entrypoint: `from server.usage import get_usage_service` (or `record_event` / `RecordUsageEvent` /
  the `EVENT_*` constants — all re-exported from the package).
- **Read signature for S3:** `UsageService.get_usage_metrics(*, tenant_id: UUID,
  project_id: UUID|None, start: datetime, end: datetime) -> UsageMetrics` — keyword-only. Window is
  **half-open `[start, end)`** (`occurred_at >= start AND occurred_at < end`); `project_id=None` means
  tenant-wide. Read errors surface as `UsageReadError`.
- **`UsageMetrics` shape (S3 serializes this):**
  `UsageMetrics{window_start: datetime, window_end: datetime, totals: UsageTotals, daily_counts:
  tuple[UsageDailyCount, ...]}`; `UsageTotals{total, documents_created, documents_deleted, searches}`
  (all `int`); `UsageDailyCount{day: date, total, documents_created, documents_deleted, searches}`.
  `daily_counts` is the **contiguous zero-filled** UTC-day series bounded by the window (never by event
  volume); `_iter_days` excludes a trailing exactly-midnight `end` day (half-open-consistent). Totals
  are summed in Python from the daily buckets. Maps cleanly to vocky's
  `{window:{start,end}, totals:{…}, daily_counts:[{day,…}]}` response shape S3 targets.
- **Migration deploy step:** `alembic upgrade head` applies `0002_usage_events`
  (`down_revision="0001_accounts_tenancy"`); constraint names verified to match the model
  (`pk_usage_events`, `fk_usage_events_tenant_id_tenants` CASCADE, `fk_usage_events_project_id_projects`
  SET NULL) — no autogenerate drift.

### S2 built (metering hook) — final mechanism for S3/S4
_Done in P11.S2: writes/deletes/searches are metered best-effort; `last_used_at` wired.
Import check + 65-test legacy suite green; live DB behavior deferred to S4/REVIEW._

- **Final metering mechanism = stash + async middleware** (chosen over per-handler async
  hooks; resolves the sync→async wrinkle). The sync content handlers stash a
  `UsageHint` on `request.state.usage` on their **success path only**; a single
  `@app.middleware("http")` (`usage_metering` in `server/main.py`) calls
  `record_usage(hint)` after `call_next` **iff** a hint is present, `hint.tenant_id is
  not None`, and the response is 2xx. Error paths (401/404/409/422/400) raise before the
  stash, so only successes are metered. Awaiting in the middleware keeps metering
  synchronous w.r.t. the client while the sync handler never blocks on Postgres.
- **`server/usage/metering.py` (new)** owns `UsageHint{tenant_id, event_type,
  project_name, project_id, credential_id}` + `async record_usage(hint)`. `record_usage`
  is **best-effort** (broad `try/except Exception` + `logging.warning(exc_info=True)`) —
  it wraps S1's raising `record_event`, so a metering failure never fails a request. It
  resolves project attribution name → UUID (`get_project_by_name`), records the event,
  then stamps `last_used_at`. S3 should NOT re-meter reads; it only reports.
- **`ApiAuthContext.credential_id: UUID|None`** added (`server/api_auth.py`), set **only**
  in the `vk_` branch of `_resolve_tenant_bearer` (`credential_id=cred.id`); master and
  session callers leave it `None`. Carried so the middleware can stamp the credential.
- **`AccountsService.get_project_by_name(tenant_id, name) -> ProjectRecord | None`** now
  exists (repository + service), tenant-scoped, **oldest-wins** (`ORDER BY created_at,
  id LIMIT 1` — names aren't unique per tenant). S3's project-detail page can reuse it if
  useful, though S3 primarily loads by id.
- **REFINEMENT — `last_used_at` stamped on metered events only, NOT in the resolver.**
  The DECOMP note said "keep the `last_used_at` stamp in the resolver"; S2 moved it into
  `record_usage` (metered write/search path) because stamping in the resolver writes on
  **every read**, contradicting the operator's "open reads stay fast." Consequence: a
  `vk_` key used only for reads won't refresh `last_used_at` — it reflects the last
  write/search. Acceptable for an ingest key. **S3/S4 plan against this:** the
  credential `last_used_at` a project-usage read surfaces reflects last *metered* use
  (write/search), not last read; S4's smoke should drive a write/search before asserting
  `last_used_at` is non-null. Revisit only if read-recency is later wanted (a throttled
  read stamp).
- **Legacy inertness confirmed:** hints carry `tenant_id=None` in legacy mode, the
  middleware guard skips, no engine is created — 65-test legacy suite unchanged.

### S3 built (usage read API) — response contract for S4 to assert against
_Done in P11.S3: `server/usage_api.py` (new) mounted in `server/main.py`. Two
session-guarded, tenant-scoped reads over S1's aggregate. No new persistence, no
metering (S3 only reports). Import check + 65-test legacy suite green; live DB
behavior deferred to S4/REVIEW (no Postgres in this env)._

- **`GET /app/usage`** — whole-tenant. `days: int = Query(30, ge=1, le=365)`,
  `Depends(require_user)`. Calls `get_usage_metrics(tenant_id=ctx.tenant.id,
  project_id=None, start, end)`. **Response:**
  `{window:{start,end}, totals:{total,documents_created,documents_deleted,searches},
  daily_counts:[{day,total,documents_created,documents_deleted,searches}, …],
  projects:[{id,name,tenant_id,created_at}]}`. `project_id=None` means tenant-wide,
  so tenant-level NULL-project events count and a zero-event tenant still returns the
  full zero-filled series (no empty-tenant short-circuit — our aggregate handles it).
- **`GET /app/projects/{project_id}/usage`** — drill-down. Same query/guard. Uses
  `_load_scoped_project` → **404** for missing *and* cross-tenant (existence never
  leaks). **Response:** same `window/totals/daily_counts` +
  `project:{id,name,tenant_id,created_at}` +
  `credentials:[{id,project_id,name,token_prefix,created_at,last_used_at,revoked_at}]`.
- **`days`-window semantics (for S4 assertions):** `_resolve_window(days)` = last
  `days` UTC calendar days ending **today** inclusive, as half-open `[start, end)`
  (`end` = midnight tomorrow, `start` = midnight `today-(days-1)`). `daily_counts` is
  contiguous & zero-filled, **length exactly `days`**; `day` is `YYYY-MM-DD`; window
  bounds are ISO datetimes (UTC). Default window = 30 days; bad `days` → **422**.
- **Error surface:** `get_usage_metrics` wrapped `try/except UsageReadError →
  HTTPException(500, "usage read failed")`. Reuses `_load_scoped_project`,
  `serialize_project`, `serialize_credential` from `server.app_api` (imported, not
  duplicated) so the project/credential shapes match `app_api` byte-for-byte.
- **`last_used_at` caveat for S4:** per S2, the credential `last_used_at` this read
  surfaces reflects last *metered* use (write/search), **not** last read — S4 must
  drive a write/search before asserting it is non-null.
- **No `/api/project/usage`** built (`vk_`-scoped self-usage): out of scope for P11;
  clean future addition, noted only.

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

_S1 confirms the two entries it lands are already listed and accurate: `data.md` (the `usage_events`
table now exists as the 7th control-plane table; retention still deferred) and `operations.md`
(`alembic 0002_usage_events`, `down_revision=0001_accounts_tenancy`, run via `alembic upgrade head`).
No new Doc impact lines needed from S1._

_S3 confirms the `api.md` line is accurate and now landed: `GET /app/usage` +
`GET /app/projects/{id}/usage` exist as additive, require_user-guarded, tenant-scoped
control-plane reads (cross-tenant project → 404), mounted in `server/main.py`. The REVIEW
slice should document the pinned response contract (see the S3 note above). No new Doc impact
lines needed from S3._

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
