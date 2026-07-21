# P11.S1 result — Usage persistence + aggregate service

Implemented the durable `usage_events` schema and the derive-on-read aggregate
that S2 (metering) writes into and S3 (read API) reads from. No HTTP wiring: no
routes, no middleware, no `main.py` touched. Executed against `plan.md` with the
`accounts/` domain as the layering template.

## Files added / changed

- **`server/persistence/models.py`** — appended `UsageEventModel` (mirrors
  `ProjectModel`): UUID PK, `tenant_id` FK→`tenants` `ondelete=CASCADE` (not null),
  `project_id` FK→`projects` `ondelete=SET NULL` (nullable), `event_type` free-text
  `Text`, tz-aware `occurred_at` (`default=utc_now`, `server_default=CURRENT_TIMESTAMP`);
  two composite indexes `ix_usage_events_tenant_id_occurred_at` and
  `ix_usage_events_project_id_occurred_at`. Also lightly refreshed the module
  docstring (was "the six here" — now names the 7th `usage_events` table). No new
  imports needed (all of `Index/Text/ForeignKey/DateTime/text/PG_UUID/utc_now`
  were already imported).
- **`server/usage/__init__.py`** — package exports (mirrors `accounts/__init__.py`):
  service, errors, `get_usage_service`, the types, and the three `EVENT_*` constants.
- **`server/usage/types.py`** — transport-neutral `@dataclass(slots=True, kw_only=True)`
  records + the shared event-type constants:
  `EVENT_DOCUMENT_CREATED="document.created"`, `EVENT_DOCUMENT_DELETED="document.deleted"`,
  `EVENT_SEARCH="search"`. Records: `RecordUsageEvent`, `UsageTotals`,
  `UsageDailyCount`, `UsageMetrics`.
- **`server/usage/repository.py`** — `UsageRepository(session)`, the sole ORM
  boundary, never commits. `insert_usage_event(payload)` (`add` + `flush`, sets
  `occurred_at` only when supplied). `get_usage_metrics(*, tenant_id, project_id,
  start, end)` — one grouped SELECT: `utc_day = func.date(func.timezone("UTC",
  occurred_at))`, `func.count().label("total")`, and one
  `func.count().filter(event_type == <const>)` conditional count per event type;
  filters `tenant_id ==` (always), `project_id ==` (when not None), window
  half-open `occurred_at >= start AND occurred_at < end`; `group_by(utc_day)
  .order_by(utc_day)`; rows mapped to a `{day: row}` dict, zero-filled with the
  module-level `_iter_days(start.date(), end)` helper, totals summed in Python
  from the daily buckets.
- **`server/usage/service.py`** — `UsageService(session_maker)` owning the txn +
  domain errors `UsagePersistenceError` / `UsageReadError`. `record_event(payload)`
  = `async with session … insert … commit` on its own isolated transaction and
  **raises** on failure (best-effort is the S2 caller's job, by catching).
  `get_usage_metrics(...)` = read wrapped in `try/except SQLAlchemyError →
  UsageReadError`. Module-level `get_usage_service()` returns
  `UsageService(get_session_maker())`.
- **`alembic/versions/0002_usage_events.py`** — hand-written in the `0001` style,
  `revision="0002_usage_events"`, `down_revision="0001_accounts_tenancy"`.
  `upgrade()` creates `usage_events` with `op.f()` names — `pk_usage_events`,
  `fk_usage_events_tenant_id_tenants` (CASCADE), `fk_usage_events_project_id_projects`
  (SET NULL) — then the two composite indexes. `downgrade()` drops the two indexes
  then the table (mirror-image). Verified the migration's `op.f()` constraint names
  match the model-generated names exactly (no autogenerate drift).

## Schema + aggregate shape

- **`usage_events`** (7th control-plane table, event-log grain): one durable row
  per metered event, aggregated on read. `project_id` nullable + `SET NULL` so
  master-bearer / unmapped-project usage degrades to tenant-level and a deleted
  project keeps its usage history. `event_type` is free text (no DB enum/CHECK) —
  new event types need no migration; integrity comes from the shared `EVENT_*`
  constants. (Resolves the S1 open question: **free text, not enum/CHECK.**)
- **`get_usage_metrics(*, tenant_id, project_id, start, end) -> UsageMetrics`** —
  **half-open window `[start, end)`**. `UsageMetrics` = `{window_start, window_end,
  totals: UsageTotals{total, documents_created, documents_deleted, searches},
  daily_counts: tuple[UsageDailyCount{day, total, documents_created,
  documents_deleted, searches}, ...]}`. `daily_counts` is the contiguous,
  zero-filled series of UTC calendar days the window covers — bounded by the
  window, never by event volume.

### `_iter_days` half-open contract

`_iter_days(start_day: date, end: datetime)` yields each UTC calendar day from
`start_day` through the day of the last instant strictly before `end`
(`(end - 1µs).date()`), so an `end` landing exactly on midnight adds no spurious
trailing zero day. Exactly consistent with the `occurred_at < end` filter. (No
vocky source is vendored in this repo, so `_iter_days` was reconstructed
faithfully to the plan's half-open window contract rather than literally copied —
see Deviations.)

## Validation

- **Mandatory — import check: PASS.**
  `python3 -c "import server.persistence.models, server.usage.types, server.usage.repository, server.usage.service"` → `imports OK`
  (run with the repo venv `.venv/bin/python`, which has SQLAlchemy 2.0.51 /
  Alembic 1.18.5; the base system `python3` has no SQLAlchemy).
- **Mandatory — legacy regression: PASS.**
  `python3 -m pytest -q` → **65 passed** (1 pre-existing, unrelated
  `StarletteDeprecationWarning`). S1 adds no import into the app path, so the
  legacy suite is unaffected.
- **Extra offline safety checks (no DB, not a substitute for the DB round-trip):**
  compiled the aggregate `SELECT` under the Postgres dialect — the aggregate
  `FILTER (WHERE ...)` clause and `date(timezone('UTC', ...))` render correctly,
  with and without the `project_id` filter; compiled the `usage_events` DDL under
  the Postgres dialect (table + both composite indexes; tenant FK CASCADE, project
  FK SET NULL; `project_id` nullable, `tenant_id` not null); confirmed the
  migration's `op.f()` constraint names match the model-generated names; exercised
  `_iter_days` (correct half-open day series, trailing-midnight day excluded).
- **Conditional — DB round-trip: DEFERRED (no Postgres available).**
  `DATABASE_URL` is **unset** in this environment, and `alembic/env.py` raises when
  it is unset, so `alembic upgrade head`, the `UsageService` micro round-trip
  (record two events → `get_usage_metrics` → assert per-type / zero-fill / totals),
  and the `downgrade -1` / `upgrade head` round-trip **were not run**. No DB results
  are fabricated. Per the plan, this live behavioral validation is consolidated at
  **S4's onboarding smoke** and the **phase REVIEW**.

## Deviations from plan

- **`_iter_days` reconstructed, not copied.** The plan says to copy vocky's
  `_iter_requested_days` (`repository.py:674`), but no vocky source is vendored in
  this repo (searched: no `iter_requested_days` / `feedback_events` anywhere). I
  reconstructed the helper faithfully to the plan's stated `_iter_days(start.date(),
  end)` signature and half-open contract. Behavior verified above.
- **Module docstring touch-up in `models.py`** (out of the plan's literal "append"
  scope, but within intent): updated "Ported from vocky's accounts/tenancy tables
  (the six here) … this repo only needs accounts, tenancy, projects, credentials,
  and sessions" so it acknowledges the new 7th `usage_events` table — phase.md
  itself calls `usage_events` the "7th control-plane table". No code/behavior change.
- Otherwise none — schema, layering, error types, and the migration follow the plan
  and the `accounts/` template exactly.
