"""Transport-neutral usage-metering service (P11).

Owns the session lifecycle (open, commit/rollback) and translates SQLAlchemy
errors into domain errors. ``record_event`` runs on its own isolated transaction
and **raises** on failure — the S2 metering caller is what makes it best-effort by
catching, so a metering failure never fails the request it observes.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from server.persistence.engine import get_session_maker
from server.usage.repository import UsageRepository
from server.usage.types import RecordUsageEvent, UsageMetrics


class UsagePersistenceError(RuntimeError):
    """Raised when a usage event cannot be persisted."""


class UsageReadError(RuntimeError):
    """Raised when usage metrics cannot be read from storage."""


class UsageService:
    """Application service for recording usage events and reading their aggregate."""

    def __init__(self, session_maker: async_sessionmaker[AsyncSession]) -> None:
        self._session_maker = session_maker

    async def record_event(self, payload: RecordUsageEvent) -> None:
        """Persist one metered event on its own transaction; raise on failure.

        Intentionally raises so the S2 caller can wrap it best-effort (catch and
        log) — keeping best-effort semantics at the call site, not buried here.
        """

        async with self._session_maker() as session:
            repository = UsageRepository(session)
            try:
                await repository.insert_usage_event(payload)
                await session.commit()
            except SQLAlchemyError as exc:
                await session.rollback()
                raise UsagePersistenceError("failed to persist usage event") from exc

    async def get_usage_metrics(
        self,
        *,
        tenant_id: UUID,
        project_id: UUID | None,
        start: datetime,
        end: datetime,
    ) -> UsageMetrics:
        """Return the windowed per-day usage aggregate for a tenant/project."""

        async with self._session_maker() as session:
            repository = UsageRepository(session)
            try:
                return await repository.get_usage_metrics(
                    tenant_id=tenant_id,
                    project_id=project_id,
                    start=start,
                    end=end,
                )
            except SQLAlchemyError as exc:
                await session.rollback()
                raise UsageReadError("failed to read usage metrics") from exc


def get_usage_service() -> UsageService:
    """Return the shared usage service."""

    return UsageService(get_session_maker())
