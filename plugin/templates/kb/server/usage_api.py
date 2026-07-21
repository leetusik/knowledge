"""Tenant-scoped usage read API — the dashboard's derive-on-read surface (P11.S3).

Two session-guarded ``/app/*`` reads over S1's ``UsageService.get_usage_metrics``
aggregate: ``GET /app/usage`` (whole-tenant) and ``GET /app/projects/{id}/usage``
(one project, drill-down). Mirrors ``server/app_api.py``'s style exactly and reuses
its tenant-scoping helpers — ``_load_scoped_project`` (answers **404** for both a
missing and a cross-tenant project, so existence never leaks), ``serialize_project``,
and ``serialize_credential``. The response shape (``window`` / ``totals`` /
``daily_counts`` plus ``projects`` or ``project`` + ``credentials``) is a contract
P12's dashboard codes against, so it is pinned here.

The single ``days`` query param selects a trailing UTC-calendar-day window ending
today (inclusive); ``_resolve_window`` turns it into the half-open ``[start, end)``
the aggregate consumes. FastAPI validates the bound (``ge=1, le=365`` → 422),
leaving no inverted-window risk. A read that cannot complete surfaces as
``UsageReadError`` and is rendered here as a clean 500 rather than a bare traceback.
This module only *reports* usage; metering (the writes) is S2's concern, never
re-triggered on a read.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from server.accounts.auth import AuthContext, require_user
from server.accounts.service import get_accounts_service
from server.app_api import (
    _load_scoped_project,
    serialize_credential,
    serialize_project,
)
from server.usage import UsageMetrics, UsageReadError, get_usage_service

router = APIRouter()


def _resolve_window(days: int) -> tuple[datetime, datetime]:
    """Turn a ``days`` count into the half-open ``[start, end)`` UTC-day window.

    The window is the last ``days`` UTC calendar days ending today (inclusive):
    ``start`` is midnight of ``today-(days-1)`` and ``end`` is midnight of tomorrow,
    so under S1's ``_iter_days`` the zero-filled series is exactly ``days`` contiguous
    calendar days (``today-(days-1)`` through ``today``).
    """

    today = datetime.now(UTC).date()
    # start of tomorrow → half-open upper bound that includes all of today
    end = datetime(today.year, today.month, today.day, tzinfo=UTC) + timedelta(days=1)
    start = datetime(today.year, today.month, today.day, tzinfo=UTC) - timedelta(
        days=days - 1
    )
    return start, end


def serialize_usage_metrics(metrics: UsageMetrics) -> dict[str, object]:
    """Serialize S1's derive-on-read aggregate to the pinned dashboard shape.

    ``daily_counts`` is contiguous and zero-filled (length ``= days``); ``day`` is a
    ``YYYY-MM-DD`` string and the window bounds are ISO datetimes.
    """

    return {
        "window": {
            "start": metrics.window_start.isoformat(),
            "end": metrics.window_end.isoformat(),
        },
        "totals": {
            "total": metrics.totals.total,
            "documents_created": metrics.totals.documents_created,
            "documents_deleted": metrics.totals.documents_deleted,
            "searches": metrics.totals.searches,
        },
        "daily_counts": [
            {
                "day": count.day.isoformat(),
                "total": count.total,
                "documents_created": count.documents_created,
                "documents_deleted": count.documents_deleted,
                "searches": count.searches,
            }
            for count in metrics.daily_counts
        ],
    }


@router.get("/app/usage")
async def get_usage(
    days: int = Query(30, ge=1, le=365),
    ctx: AuthContext = Depends(require_user),
) -> dict[str, object]:
    """Return the caller's whole-tenant usage aggregate over the last ``days``.

    Scoped by ``tenant_id`` with ``project_id=None``, so tenant-level NULL-project
    events are included and a zero-event tenant still returns the zero-filled series
    (no short-circuit). The payload also lists the tenant's projects for the
    dashboard's drill-down.
    """

    start, end = _resolve_window(days)
    try:
        metrics = await get_usage_service().get_usage_metrics(
            tenant_id=ctx.tenant.id,
            project_id=None,
            start=start,
            end=end,
        )
    except UsageReadError:
        raise HTTPException(status_code=500, detail="usage read failed")
    projects = await get_accounts_service().list_projects_for_tenant(ctx.tenant.id)
    payload = serialize_usage_metrics(metrics)
    payload["projects"] = [serialize_project(project) for project in projects]
    return payload


@router.get("/app/projects/{project_id}/usage")
async def get_project_usage(
    project_id: UUID,
    days: int = Query(30, ge=1, le=365),
    ctx: AuthContext = Depends(require_user),
) -> dict[str, object]:
    """Return one project's usage aggregate (drill-down) over the last ``days``.

    ``_load_scoped_project`` answers **404** for both a missing and a cross-tenant
    project, so existence never leaks. The payload adds the project record and its
    credentials — surfacing each ingest key's ``last_used_at`` recency (which, per
    S2, reflects last *metered* use: a write/search, not a read).
    """

    project = await _load_scoped_project(project_id, ctx)
    start, end = _resolve_window(days)
    try:
        metrics = await get_usage_service().get_usage_metrics(
            tenant_id=ctx.tenant.id,
            project_id=project.id,
            start=start,
            end=end,
        )
    except UsageReadError:
        raise HTTPException(status_code=500, detail="usage read failed")
    credentials = await get_accounts_service().list_project_credentials(project.id)
    payload = serialize_usage_metrics(metrics)
    payload["project"] = serialize_project(project)
    payload["credentials"] = [
        serialize_credential(credential) for credential in credentials
    ]
    return payload
