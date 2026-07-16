"""Transport-neutral usage-metering data types and shared event constants.

No ORM objects cross this boundary. ``RecordUsageEvent`` is the write input;
``UsageMetrics`` (with its nested totals and zero-filled daily counts) is the
derive-on-read aggregate S3 serializes. The ``EVENT_*`` constants are the shared
vocabulary the metering hook (S2) writes and the read API (S3) reports — they are
the integrity contract behind the free-text ``usage_events.event_type`` column.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from uuid import UUID

# -- shared event-type vocabulary -----------------------------------------
# Free-text on the column; canonical here so S2 records and S3 reports the same
# strings (import these, never re-declare the literals).
EVENT_DOCUMENT_CREATED = "document.created"
EVENT_DOCUMENT_DELETED = "document.deleted"
EVENT_SEARCH = "search"


@dataclass(slots=True, kw_only=True)
class RecordUsageEvent:
    """Input for recording one metered event.

    ``project_id`` is optional: master-bearer / unmapped-project usage records at
    tenant level (NULL project). ``occurred_at`` is optional: when None the column
    default (``CURRENT_TIMESTAMP``) applies.
    """

    tenant_id: UUID
    event_type: str
    project_id: UUID | None = None
    occurred_at: datetime | None = None


@dataclass(slots=True, kw_only=True)
class UsageTotals:
    """Window-wide totals, summed in Python from the daily buckets."""

    total: int
    documents_created: int
    documents_deleted: int
    searches: int


@dataclass(slots=True, kw_only=True)
class UsageDailyCount:
    """Per-UTC-day counts for one calendar day in the window (zero-filled)."""

    day: date
    total: int
    documents_created: int
    documents_deleted: int
    searches: int


@dataclass(slots=True, kw_only=True)
class UsageMetrics:
    """Derive-on-read usage aggregate over a half-open window ``[start, end)``.

    ``daily_counts`` is the contiguous, zero-filled series of UTC calendar days
    the window covers (bounded by the window, never by event volume).
    """

    window_start: datetime
    window_end: datetime
    totals: UsageTotals
    daily_counts: tuple[UsageDailyCount, ...]
