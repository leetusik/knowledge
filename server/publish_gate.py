"""Whether a write publishes to the public repo: the project-visibility gate (P34).

Tenant #1's content root is the git-published ``docs/`` tree, but not every tenant #1
project is public: the accounts registry carries each project's ``visibility``. A
write publishes (its scoped commit, its ``docs/index.md`` Recent bullet, its project
landing) only when this one rule says so:

* **legacy mode** (``ctx.tenant_id is None``: no accounts plane) -> ``ctx.is_public``,
  today's behaviour byte-for-byte;
* **another tenant** (``not ctx.is_public``) -> never: its root is the gitignored
  ``tenants/<uuid>/`` tree, as before;
* **tenant #1** -> only when its registry project exists and is ``"public"``. A missing
  row, or any failure to read it, counts as private (fail closed, logged).

A tenant #1 write that does not publish also records its project in the checkout's
``info/exclude`` private-projects block (``hide_private_project`` ->
``gitops.mark_private``), so the project's untracked files stay out of ``git status``
and ``gitops`` refuses to stage its footprint whatever a caller passes.

The async rule serves the async callers (the save path's registry dependency, the
app-side delete); ``publish_decision_from_worker`` bridges it into the sync handlers,
which FastAPI runs on a worker thread (``reader_state.run_from_worker``). This module
never imports ``server.main`` (``main`` imports it) and never names a project in a log
line.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any, Optional

from server import config, gitops, reader_state
from server.accounts.service import get_accounts_service

if TYPE_CHECKING:  # pragma: no cover - typing only
    from server.api_auth import ApiAuthContext

logger = logging.getLogger(__name__)

# The ``commit_error`` a tenant #1 write reports when its project's visibility could
# not be read: the write is saved, nothing is committed, and the caller is told why.
VISIBILITY_UNREADABLE = (
    "publishing skipped: the project's visibility could not be read, so the write "
    "was saved but not committed"
)


@dataclass(frozen=True, slots=True)
class PublishDecision:
    """The rule's answer for one write.

    ``publishes`` gates the commit, the Recent bullet and the landing. ``error`` is set
    only when the visibility lookup failed (``publishes`` is then ``False``); a
    deliberate private skip carries no error, like ``commit: false``.
    """

    publishes: bool
    error: Optional[str] = None


PUBLISHES = PublishDecision(True)
PRIVATE = PublishDecision(False)
UNREADABLE = PublishDecision(False, VISIBILITY_UNREADABLE)


def decide(ctx: "ApiAuthContext", record: Any) -> PublishDecision:
    """The rule applied to an already-loaded registry ``record`` (or ``None``)."""
    if ctx.tenant_id is None:
        return PUBLISHES if ctx.is_public else PRIVATE
    if not ctx.is_public:
        return PRIVATE
    if record is not None and getattr(record, "visibility", None) == "public":
        return PUBLISHES
    return PRIVATE


async def publish_decision(ctx: "ApiAuthContext", project: str) -> PublishDecision:
    """The rule for ``project``, reading tenant #1's registry row when it matters."""
    if ctx.tenant_id is None or not ctx.is_public:
        return decide(ctx, None)
    try:
        record = await get_accounts_service().get_project_by_name(ctx.tenant_id, project)
    except Exception:  # noqa: BLE001 - any failure fails closed
        logger.warning(
            "project visibility lookup failed; the write will not publish", exc_info=True
        )
        return UNREADABLE
    return decide(ctx, record)


async def project_publishes(ctx: "ApiAuthContext", project: str) -> bool:
    """Whether a write to ``project`` publishes (commit, index bullet, landing)."""
    return (await publish_decision(ctx, project)).publishes


def publish_decision_from_worker(ctx: "ApiAuthContext", project: str) -> PublishDecision:
    """``publish_decision`` for a sync handler running on a worker thread.

    Legacy and non-#1 callers are answered without the bridge (no event loop needed).
    Called outside a worker thread (a script, a CLI) the bridge raises, which fails
    closed like any other lookup failure.
    """
    if ctx.tenant_id is None or not ctx.is_public:
        return decide(ctx, None)
    try:
        return reader_state.run_from_worker(publish_decision, ctx, project)
    except Exception:  # noqa: BLE001 - any failure fails closed
        logger.warning(
            "project visibility lookup could not run; the write will not publish",
            exc_info=True,
        )
        return UNREADABLE


def project_publishes_from_worker(ctx: "ApiAuthContext", project: str) -> bool:
    """The sync wrapper of ``project_publishes``."""
    return publish_decision_from_worker(ctx, project).publishes


def is_private_write(ctx: "ApiAuthContext", decision: PublishDecision) -> bool:
    """A tenant #1 write (``docs/`` root, tenant mode) that does not publish."""
    return ctx.tenant_id is not None and bool(ctx.is_public) and not decision.publishes


def hide_private_project(ctx: "ApiAuthContext", decision: PublishDecision, project: str) -> None:
    """Record a private tenant #1 project in the checkout's ``info/exclude`` block.

    Runs only for a tenant #1 write that does not publish, and only when git commits
    are enabled (the checkout is a repo). Best-effort: a failure is logged and never
    fails the write (the staging guard and the visibility gate still hold). Callers
    hold ``WRITE_LOCK``.
    """
    if not is_private_write(ctx, decision) or not config.git_commit_enabled():
        return
    try:
        gitops.mark_private(project, root=config.kb_root())
    except Exception:  # noqa: BLE001 - never fail a write on the exclude file
        logger.warning("could not record a private project in info/exclude", exc_info=True)
