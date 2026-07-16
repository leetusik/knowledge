"""Best-effort metering hook: the content-plane → usage-events bridge (P11.S2).

The metered ``/api/*`` handlers are sync ``def`` (they hold ``WRITE_LOCK`` over a
sqlite critical section) and cannot ``await`` a Postgres write, and the event type
+ success status are only known *after* the handler runs. So each handler stashes a
small :class:`UsageHint` on ``request.state.usage`` on its success path, and the
async HTTP metering middleware (``server/main.py``) calls :func:`record_usage` after
the response is produced.

:func:`record_usage` is **best-effort**: it swallows every exception (S1's
``record_event`` raises ``UsagePersistenceError`` on failure) so metering can never
change a status code, response body, or timing-visible failure of the observed
request. In legacy mode (``DATABASE_URL`` unset) the middleware never calls it —
hints carry ``tenant_id=None`` and the guard skips — so no engine is created and the
content plane stays byte-for-byte pre-P10.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from uuid import UUID

from server.accounts.service import get_accounts_service
from server.usage import RecordUsageEvent, get_usage_service

_log = logging.getLogger(__name__)


@dataclass(slots=True)
class UsageHint:
    """What a metered handler stashes on ``request.state.usage`` on success.

    ``tenant_id`` is ``None`` in legacy mode — the middleware's guard then skips
    :func:`record_usage` entirely, so a hint is recorded only in tenant mode.
    ``project_name`` is the operation's project (POST body / search filter);
    :func:`record_usage` resolves it to the tenant's project UUID for attribution,
    falling back to ``project_id`` (the ``vk_`` caller's bound project), else
    tenant-level (NULL project). ``credential_id`` is the ``vk_`` credential to
    stamp ``last_used_at`` on, or ``None`` (master / session callers).
    """

    tenant_id: UUID | None
    event_type: str
    project_name: str | None = None
    project_id: UUID | None = None
    credential_id: UUID | None = None


async def record_usage(hint: UsageHint) -> None:
    """Record one metered event + stamp credential recency, best-effort.

    Swallows every exception (logged at WARNING with a traceback) so a metering
    failure never surfaces into the observed request's response. The caller (the
    metering middleware) only invokes this in tenant mode on a 2xx with a hint, so
    ``hint.tenant_id`` is expected to be set here.
    """

    if hint.tenant_id is None:
        # Defensive: the middleware already guards on this, but never touch
        # Postgres for a legacy hint even if reached directly.
        return

    try:
        # Attribute to the operation's actual project when its name resolves to a
        # tenant project UUID (this is what attributes tenant #1's master-bearer
        # writes per project). Fall back to the vk_ caller's bound project id,
        # else tenant-level (NULL project) via the nullable SET NULL FK.
        project_id = hint.project_id
        if hint.project_name:
            proj = await get_accounts_service().get_project_by_name(
                hint.tenant_id, hint.project_name
            )
            if proj is not None:
                project_id = proj.id

        await get_usage_service().record_event(
            RecordUsageEvent(
                tenant_id=hint.tenant_id,
                project_id=project_id,
                event_type=hint.event_type,
            )
        )

        # last_used_at is stamped ONLY here — on a metered event, never on a plain
        # read (stamping in the resolver would write on every read). A vk_ key used
        # only for reads therefore reflects its last write/search.
        if hint.credential_id is not None:
            await get_accounts_service().touch_credential_last_used(
                hint.credential_id
            )
    except Exception:  # noqa: BLE001 — best-effort; metering never fails a request
        _log.warning(
            "usage metering failed (event_type=%s, tenant_id=%s)",
            hint.event_type,
            hint.tenant_id,
            exc_info=True,
        )
