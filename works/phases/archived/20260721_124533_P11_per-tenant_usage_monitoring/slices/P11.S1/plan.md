# P11.S1 — Usage persistence + aggregate service

Plan for slice **P11.S1** (implementation, risk **medium** → `slice-executor-mid`). This is the
foundational slice: it lays the durable `usage_events` schema and the derive-on-read aggregate
that S2 (metering) writes into and S3 (read API) reads from. **No HTTP wiring** — S1 touches no
routes, no middleware, no `main.py`. Shared context lives in `works/phases/active/P11/phase.md`
(read it first; it carries the resolved design + findings).

## Context

P11 meters per-tenant/per-project usage as observability (no quotas/billing). Grain is an
**event log** (operator-approved): one durable Postgres row per metered event, aggregated on read.
S1 builds the storage + query engine; it does not record or expose anything yet. The read shape
mirrors vocky's proven feedback-metrics aggregate.

## Deliverables

### 1. `UsageEventModel` — append to `server/persistence/models.py`

Follow `ProjectModel` (`server/persistence/models.py:87`) exactly (UUID PK, `PG_UUID(as_uuid=True)`,
tz-aware `utc_now`). Keep the model **in `persistence/models.py`** so `alembic/env.py` (which imports
`server.persistence.models` for `Base.metadata`) sees it, consistent with the other six tables.

```python
class UsageEventModel(Base):
    """One metered content-plane event (observability; P11)."""
    __tablename__ = "usage_events"
    __table_args__ = (
        Index("ix_usage_events_tenant_id_occurred_at", "tenant_id", "occurred_at"),
        Index("ix_usage_events_project_id_occurred_at", "project_id", "occurred_at"),
    )
    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    project_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    event_type: Mapped[str] = mapped_column(Text, nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now,
        server_default=text("CURRENT_TIMESTAMP"))
```

- `project_id` is **nullable + `SET NULL`** so master-bearer/unmapped-project usage degrades to
  tenant-level and a deleted project doesn't delete its usage history.
- `event_type` is **free text** (not a DB enum/CHECK) — flexible for new event types without a
  migration; integrity comes from the shared constants below. (This resolves the S1 open question.)

### 2. `server/usage/` domain package (mirror `server/accounts/`)

Create `server/usage/__init__.py`, `types.py`, `repository.py`, `service.py`. The domain layer
imports `UsageEventModel` from `server.persistence.models` (exactly as `accounts/repository.py`
imports its models).

**`server/usage/types.py`** — transport-neutral `@dataclass(slots=True, kw_only=True)` records
(pattern: `server/accounts/types.py`) + the shared event-type constants:

```python
EVENT_DOCUMENT_CREATED = "document.created"
EVENT_DOCUMENT_DELETED = "document.deleted"
EVENT_SEARCH = "search"
```

- `RecordUsageEvent{tenant_id: UUID, event_type: str, project_id: UUID|None=None, occurred_at: datetime|None=None}`
- `UsageTotals{total, documents_created, documents_deleted, searches}` (all `int`)
- `UsageDailyCount{day: date, total, documents_created, documents_deleted, searches}`
- `UsageMetrics{window_start: datetime, window_end: datetime, totals: UsageTotals, daily_counts: tuple[UsageDailyCount, ...]}`

**`server/usage/repository.py`** — `UsageRepository(session)`, the sole ORM boundary, **never
commits** (pattern: `server/accounts/repository.py`):
- `insert_usage_event(payload: RecordUsageEvent) -> None` — build `UsageEventModel(...)`,
  `session.add(model)`, `await session.flush()` (no refresh needed; caller discards the row). Pass
  `occurred_at` only when set (else let the column default apply).
- `get_usage_metrics(tenant_id, project_id, start, end) -> UsageMetrics` — the derive-on-read
  aggregate, mirroring vocky `feedback/repository.py:497-553`:
  - `utc_day = func.date(func.timezone("UTC", UsageEventModel.occurred_at))`
  - one grouped SELECT: `utc_day.label("day")`, `func.count().label("total")`, and one
    `func.count().filter(UsageEventModel.event_type == <const>).label(<name>)` per event type
    (`documents_created`/`documents_deleted`/`searches`).
  - filters: `tenant_id ==` (always); `project_id ==` when not None; window `occurred_at >= start`
    **and** `occurred_at < end` (half-open).
  - `group_by(utc_day).order_by(utc_day)`; map rows → `{day: counts}`; **zero-fill** the contiguous
    day series with a `_iter_days(start.date(), end)` helper copied from vocky
    `_iter_requested_days` (`repository.py:674`); sum totals in Python from the daily buckets.

**`server/usage/service.py`** — `UsageService(session_maker)` owning the txn + domain errors
(pattern: `server/accounts/service.py`): errors `UsagePersistenceError`/`UsageReadError`;
`record_event(...)` = `async with session … insert … commit` on its own isolated transaction
(mirrors `touch_credential_last_used`, `service.py:265` — raises on failure; **the S2 caller** is
what makes it best-effort by catching); `get_usage_metrics(...)` = read wrapped in
`try/except SQLAlchemyError → UsageReadError`; module-level `get_usage_service()` returning
`UsageService(get_session_maker())` (pattern: `get_accounts_service`, `service.py:342`).

### 3. Alembic migration `alembic/versions/0002_usage_events.py`

Hand-written in the `0001_accounts_tenancy.py` style (no autogenerate markers):
`revision="0002_usage_events"`, `down_revision="0001_accounts_tenancy"`. `upgrade()`:
`op.create_table("usage_events", …)` with the columns above, `PrimaryKeyConstraint(name=op.f("pk_usage_events"))`,
`ForeignKeyConstraint(["tenant_id"], ["tenants.id"], name=op.f("fk_usage_events_tenant_id_tenants"), ondelete="CASCADE")`,
`ForeignKeyConstraint(["project_id"], ["projects.id"], name=op.f("fk_usage_events_project_id_projects"), ondelete="SET NULL")`,
then the two composite `op.create_index(...)`. `downgrade()` drops the two indexes then the table.

## Out of scope for S1 (do not touch)

`server/main.py`, `server/api_auth.py`, `server/app_api.py`, any middleware, `scripts/onboarding_smoke.py`.
No `doc-new-version`, no commits, no status transitions. Metering wiring is S2; the read endpoints are S3.

## Validation (executor runs; orchestrator re-runs only `validate`)

- **Mandatory:** `python3 -c "import server.persistence.models, server.usage.types, server.usage.repository, server.usage.service"` — imports clean (catches syntax/import/typo errors); the new package resolves under `pythonpath=["."]`.
- **Mandatory:** confirm the legacy suite is untouched — `python3 -m pytest -q` stays green (S1 adds
  no import into the app path, so the 65-test legacy regression must be unaffected).
- **Conditional (only if a Postgres `DATABASE_URL` is available in the executor's env):**
  `alembic upgrade head` applies `0002` cleanly; a micro round-trip via `UsageService`
  (`record_event` two events for a tenant, then `get_usage_metrics` returns the right per-type
  daily counts + zero-filled days + summed totals); then `alembic downgrade -1` / `upgrade head`
  round-trips. If no Postgres is available, **state that explicitly** in `result.md` — the live
  behavioral validation is consolidated at S4's onboarding smoke and the phase REVIEW.

## On completion (executor writes)

- `result.md` — free-form: files added, the schema + aggregate shape, event-type constants, which
  validation ran vs was deferred (and why).
- Append to `phase.md` **Findings & Notes**: the shared event-type constants (so S2 imports them,
  not re-declares), the `get_usage_metrics(tenant_id, project_id, start, end)` signature + half-open
  window contract + `UsageMetrics` shape (so S3 serializes it), and that `record_event` raises (S2
  must wrap best-effort). Append to **Doc impact**: confirm `data.md` (new `usage_events` table) and
  `operations.md` (`0002_usage_events` → `alembic upgrade head`) as already listed.
