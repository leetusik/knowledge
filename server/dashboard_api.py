"""Tenant dashboard aggregate — the post-login home's one server-side rollup (P12.S3).

A single session-guarded, tenant-scoped, **unmetered** ``GET /app/dashboard`` read
that the web app's dashboard page codes against. It rolls the caller's tenant's
projects, their per-project usage + credential state, and a lifecycle-event activity
feed into one response, so the browser makes one server-to-server round-trip instead
of a per-project fan-out.

Mirrors ``server/usage_api.py``'s style and reuses its window helper plus the
accounts and usage services. It is **pure reads** — it never calls
``UsageService.record_event``, so hitting the route moves no usage counter. There is
no path param, so the 404-vs-403 scoping concern is N/A here; the only scoping
guarantee is that solely ``ctx.tenant.id``'s projects and credentials are ever read,
so no cross-tenant data can leak.
"""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query

from server.accounts.auth import AuthContext, require_user
from server.accounts.service import get_accounts_service
from server.usage import UsageReadError, get_usage_service
from server.usage_api import _resolve_window

router = APIRouter()

# The activity feed surfaces only the most-recent lifecycle events (project created,
# key minted, key revoked), newest-first.
_ACTIVITY_LIMIT = 8


@router.get("/app/dashboard")
async def get_dashboard(
    days: int = Query(30, ge=1, le=365),
    ctx: AuthContext = Depends(require_user),
) -> dict[str, object]:
    """Return the caller's tenant dashboard: per-project rollup + activity feed.

    Response shape (pinned — the P12 dashboard page codes against it)::

        {
          "projects": [
            {"id": str, "name": str, "created_at": ISO,
             "documents": int, "keys": int, "last_used_at": ISO|null,
             "visibility": "private"|"public"}
          ],
          "activity": [
            {"type": "project_created"|"key_minted"|"key_revoked",
             "at": ISO, "project_name": str, "credential_name": str|null}
          ]
        }

    Per project: ``documents`` is ``documents_created`` over the last ``days`` window
    (the page is framed "over the last 30 days") — **not** a live per-project document
    total, which needs the content-plane UUID<->name bridge and is deferred to S5;
    ``keys`` counts only non-revoked credentials; ``last_used_at`` is the most-recent
    ingest recency across the project's credentials (null when none has been used).

    ``activity`` is built from the tenant's real, discrete lifecycle records — a
    ``project_created`` per project (at ``created_at``), a ``key_minted`` per
    credential (at ``created_at``), and a ``key_revoked`` per revoked credential (at
    ``revoked_at``) — sorted newest-first and capped at the most recent few. (The
    design mock's aggregate items — "42 documents indexed", "search volume +18%" —
    are not discrete events and are not reconstructable without an event log, so the
    panel renders only the lifecycle events it can honestly back.)

    Unmetered: this handler only *reports*. A read that cannot complete surfaces as
    ``UsageReadError`` and is rendered as a clean 500 rather than a bare traceback.
    """

    start, end = _resolve_window(days)
    accounts = get_accounts_service()
    usage = get_usage_service()

    projects = await accounts.list_projects_for_tenant(ctx.tenant.id)

    project_rows: list[dict[str, object]] = []
    # (sort key, event) pairs so the feed can be ordered newest-first across projects.
    activity: list[tuple[datetime, dict[str, object]]] = []

    for project in projects:
        credentials = await accounts.list_project_credentials(project.id)
        try:
            metrics = await usage.get_usage_metrics(
                tenant_id=ctx.tenant.id,
                project_id=project.id,
                start=start,
                end=end,
            )
        except UsageReadError:
            raise HTTPException(status_code=500, detail="dashboard read failed")

        used = [c.last_used_at for c in credentials if c.last_used_at is not None]
        last_used_at = max(used) if used else None

        project_rows.append(
            {
                "id": str(project.id),
                "name": project.name,
                "created_at": project.created_at.isoformat(),
                "documents": metrics.totals.documents_created,
                "keys": sum(1 for c in credentials if c.revoked_at is None),
                "last_used_at": last_used_at.isoformat() if last_used_at else None,
                "visibility": project.visibility,
            }
        )

        activity.append(
            (
                project.created_at,
                {
                    "type": "project_created",
                    "at": project.created_at.isoformat(),
                    "project_name": project.name,
                    "credential_name": None,
                },
            )
        )
        for credential in credentials:
            activity.append(
                (
                    credential.created_at,
                    {
                        "type": "key_minted",
                        "at": credential.created_at.isoformat(),
                        "project_name": project.name,
                        "credential_name": credential.name,
                    },
                )
            )
            if credential.revoked_at is not None:
                activity.append(
                    (
                        credential.revoked_at,
                        {
                            "type": "key_revoked",
                            "at": credential.revoked_at.isoformat(),
                            "project_name": project.name,
                            "credential_name": credential.name,
                        },
                    )
                )

    activity.sort(key=lambda item: item[0], reverse=True)

    return {
        "projects": project_rows,
        "activity": [event for _, event in activity[:_ACTIVITY_LIMIT]],
    }
