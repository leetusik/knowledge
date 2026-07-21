"""Persistence repository for per-tenant usage events (P11).

The sole ORM boundary for the usage domain: it inserts ``usage_events`` rows and
derives the windowed GROUP-BY-day aggregate on read. It never commits (the
service owns the transaction). The aggregate mirrors vocky's feedback-metrics
query: one grouped SELECT with conditional per-event-type counts, totals summed
in Python, and a zero-filled contiguous day series bounded by the window.
"""

from __future__ import annotations

from collections.abc import Iterator
from datetime import date, datetime, timedelta
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from server.persistence.models import UsageEventModel
from server.usage.types import (
    EVENT_DOCUMENT_CREATED,
    EVENT_DOCUMENT_DELETED,
    EVENT_SEARCH,
    RecordUsageEvent,
    UsageDailyCount,
    UsageMetrics,
    UsageTotals,
)


def _iter_days(start_day: date, end: datetime) -> Iterator[date]:
    """Yield each UTC calendar day the half-open window ``[start, end)`` covers.

    The last day that can hold an event is the day of the last instant strictly
    before ``end`` — so an ``end`` that lands exactly on midnight does not add a
    spurious trailing zero day. Empty/degenerate windows yield no days.
    """

    last_day = (end - timedelta(microseconds=1)).date()
    day = start_day
    while day <= last_day:
        yield day
        day += timedelta(days=1)


class UsageRepository:
    """Repository for usage-event persistence and the derive-on-read aggregate."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def insert_usage_event(self, payload: RecordUsageEvent) -> None:
        """Persist one metered event. Caller discards the row (no refresh)."""

        fields: dict[str, object] = {
            "tenant_id": payload.tenant_id,
            "event_type": payload.event_type,
            "project_id": payload.project_id,
        }
        if payload.occurred_at is not None:
            # Only set occurred_at when supplied; else the column default applies.
            fields["occurred_at"] = payload.occurred_at
        model = UsageEventModel(**fields)
        self._session.add(model)
        await self._session.flush()

    async def get_usage_metrics(
        self,
        *,
        tenant_id: UUID,
        project_id: UUID | None,
        start: datetime,
        end: datetime,
    ) -> UsageMetrics:
        """Return the windowed per-day usage aggregate for a tenant/project.

        One grouped SELECT (GROUP BY the UTC calendar day, conditional counts per
        event type), the window filtered half-open (``occurred_at >= start`` and
        ``occurred_at < end``). Days with no events are zero-filled; totals are
        summed in Python from the daily buckets.
        """

        utc_day = func.date(func.timezone("UTC", UsageEventModel.occurred_at))
        statement = (
            select(
                utc_day.label("day"),
                func.count().label("total"),
                func.count()
                .filter(UsageEventModel.event_type == EVENT_DOCUMENT_CREATED)
                .label("documents_created"),
                func.count()
                .filter(UsageEventModel.event_type == EVENT_DOCUMENT_DELETED)
                .label("documents_deleted"),
                func.count()
                .filter(UsageEventModel.event_type == EVENT_SEARCH)
                .label("searches"),
            )
            .where(UsageEventModel.tenant_id == tenant_id)
            .where(UsageEventModel.occurred_at >= start)
            .where(UsageEventModel.occurred_at < end)
            .group_by(utc_day)
            .order_by(utc_day)
        )
        if project_id is not None:
            statement = statement.where(UsageEventModel.project_id == project_id)

        rows = (await self._session.execute(statement)).all()
        by_day = {row.day: row for row in rows}

        daily_counts: list[UsageDailyCount] = []
        total = documents_created = documents_deleted = searches = 0
        for day in _iter_days(start.date(), end):
            row = by_day.get(day)
            if row is None:
                daily_counts.append(
                    UsageDailyCount(
                        day=day,
                        total=0,
                        documents_created=0,
                        documents_deleted=0,
                        searches=0,
                    )
                )
                continue
            daily_counts.append(
                UsageDailyCount(
                    day=day,
                    total=row.total,
                    documents_created=row.documents_created,
                    documents_deleted=row.documents_deleted,
                    searches=row.searches,
                )
            )
            total += row.total
            documents_created += row.documents_created
            documents_deleted += row.documents_deleted
            searches += row.searches

        return UsageMetrics(
            window_start=start,
            window_end=end,
            totals=UsageTotals(
                total=total,
                documents_created=documents_created,
                documents_deleted=documents_deleted,
                searches=searches,
            ),
            daily_counts=tuple(daily_counts),
        )
