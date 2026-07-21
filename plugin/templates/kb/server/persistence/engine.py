"""Async engine and session helpers for the Postgres accounts plane.

Lazy singletons: the engine is created on first use (not at import or app
startup) and disposed in the app lifespan. When ``DATABASE_URL`` is unset the
accounts plane is dormant — the content plane boots fine and nothing here is
touched. Ported from vocky's ``db.py``; the only change is the URL source
(``server.config.database_url()`` instead of pydantic-settings).
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from server import config

_engine: AsyncEngine | None = None
_session_maker: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    """Return the shared async engine, creating it on first use.

    Raises ``RuntimeError`` when ``DATABASE_URL`` is unset (accounts dormant).
    """

    global _engine

    if _engine is None:
        url = config.database_url()
        if not url:
            raise RuntimeError(
                "DATABASE_URL is not set; the accounts plane is unavailable"
            )
        _engine = create_async_engine(url, pool_pre_ping=True)

    return _engine


def get_session_maker() -> async_sessionmaker[AsyncSession]:
    """Return the shared async sessionmaker."""

    global _session_maker

    if _session_maker is None:
        _session_maker = async_sessionmaker(get_engine(), expire_on_commit=False)

    return _session_maker


async def dispose_engine() -> None:
    """Dispose the cached engine during app shutdown (no-op if never created)."""

    global _engine, _session_maker

    if _engine is not None:
        await _engine.dispose()

    _engine = None
    _session_maker = None
