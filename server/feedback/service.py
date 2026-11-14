"""Transport-neutral Feedback service (ported from vocky's ``feedback/service.py``).

Owns the session lifecycle (one session per call: open, commit/rollback) and turns
SQLAlchemy errors into ``FeedbackPersistenceError`` / ``FeedbackReadError``. Capture
persists in the caller's request (no queue, no worker): a failed insert raises, and
the route answers 5xx. Org-facing reads go through the ``get_scoped_*`` methods or a
``FeedbackQueryFilters.project_ids`` tuple; see ``server.feedback.repository``.
"""

from __future__ import annotations

from collections.abc import Collection, Mapping
from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from server.feedback.repository import FeedbackRepository
from server.feedback.types import (
    CreateFeedbackAttachment,
    CreateFeedbackComment,
    CreateFeedbackEvent,
    FeedbackAttachmentRecord,
    FeedbackCommentRecord,
    FeedbackEventRecord,
    FeedbackListPage,
    FeedbackMetrics,
    FeedbackMetricsQuery,
    FeedbackSummary,
    ListFeedbackQuery,
    SummarizeFeedbackQuery,
)
from server.persistence.engine import get_session_maker


class FeedbackPersistenceError(RuntimeError):
    """Raised when a feedback write cannot be persisted."""


class FeedbackReadError(RuntimeError):
    """Raised when feedback cannot be read from storage."""


class FeedbackCapacityError(RuntimeError):
    """Raised when an upload would take unlinked attachments above their ceiling."""


class FeedbackStorageFullError(RuntimeError):
    """Raised when an upload would take every stored attachment above the total ceiling."""


class FeedbackService:
    """Application service for feedback persistence and reads."""

    def __init__(self, session_maker: async_sessionmaker[AsyncSession]) -> None:
        self._session_maker = session_maker

    # -- capture and event writes ---------------------------------------------

    async def create_feedback_event(
        self,
        payload: CreateFeedbackEvent,
    ) -> FeedbackEventRecord:
        """Persist a feedback event and return the stored record."""

        async with self._session_maker() as session:
            repository = FeedbackRepository(session)
            try:
                record = await repository.create_feedback_event(payload)
                await session.commit()
            except SQLAlchemyError as exc:
                await session.rollback()
                raise FeedbackPersistenceError("failed to persist feedback event") from exc

        return record

    async def create_feedback_event_with_attachments(
        self,
        payload: CreateFeedbackEvent,
    ) -> FeedbackEventRecord:
        """Persist a feedback event and link its claimed attachments in one txn.

        The event insert and the guarded attachment link share one session and one
        commit. Linking is scope-verified against the event's ``(user_id,
        source_product)`` and never fails the write: misrouted, missing, or
        already-linked attachments are skipped and logged.
        """

        async with self._session_maker() as session:
            repository = FeedbackRepository(session)
            try:
                record = await repository.create_feedback_event(payload)
                if payload.attachment_ids:
                    await repository.link_attachments_to_feedback(
                        record.id,
                        payload.attachment_ids,
                        user_id=payload.user_id,
                        source_product=payload.source_product,
                    )
                await session.commit()
            except SQLAlchemyError as exc:
                await session.rollback()
                raise FeedbackPersistenceError("failed to persist feedback event") from exc

        return record

    async def update_feedback_event(
        self,
        feedback_id: UUID,
        updates: Mapping[str, Any],
    ) -> FeedbackEventRecord | None:
        """Update one feedback record by ID (load it scoped first)."""

        async with self._session_maker() as session:
            repository = FeedbackRepository(session)
            try:
                record = await repository.update_feedback_event(feedback_id, updates)
                await session.commit()
                return record
            except SQLAlchemyError as exc:
                await session.rollback()
                raise FeedbackPersistenceError("failed to persist feedback event") from exc

    async def delete_feedback_event(
        self, feedback_id: UUID
    ) -> tuple[bool, tuple[str, ...]]:
        """Delete one feedback record and return its attachment storage keys.

        The keys are read before the cascade removes the attachment rows, in the
        same transaction, so the caller can delete the files after the commit.
        Returns ``(deleted, storage_keys)``; the keys are empty when nothing was
        deleted. Load the record scoped first.
        """

        async with self._session_maker() as session:
            repository = FeedbackRepository(session)
            try:
                storage_keys = await repository.list_storage_keys_for_feedback(feedback_id)
                deleted = await repository.delete_feedback_event(feedback_id)
                await session.commit()
            except SQLAlchemyError as exc:
                await session.rollback()
                raise FeedbackPersistenceError("failed to persist feedback event") from exc

        return (deleted, storage_keys if deleted else ())

    # -- event reads ----------------------------------------------------------

    async def list_feedback(self, query: ListFeedbackQuery) -> FeedbackListPage:
        """Return a cursor-paginated list of feedback records."""

        async with self._session_maker() as session:
            repository = FeedbackRepository(session)
            try:
                return await repository.list_feedback(query)
            except SQLAlchemyError as exc:
                await session.rollback()
                raise FeedbackReadError("failed to read feedback records") from exc

    async def list_feedback_with_comments(
        self,
        query: ListFeedbackQuery,
    ) -> tuple[FeedbackListPage, dict[UUID, tuple[FeedbackCommentRecord, ...]]]:
        """Return a page of feedback records plus their comments (one session)."""

        async with self._session_maker() as session:
            repository = FeedbackRepository(session)
            try:
                page = await repository.list_feedback(query)
                comments_by_id = await repository.list_comments_for_feedback_ids(
                    [record.id for record in page.records]
                )
                return page, comments_by_id
            except SQLAlchemyError as exc:
                await session.rollback()
                raise FeedbackReadError("failed to read feedback records") from exc

    async def list_feedback_with_comments_and_attachments(
        self,
        query: ListFeedbackQuery,
    ) -> tuple[
        FeedbackListPage,
        dict[UUID, tuple[FeedbackCommentRecord, ...]],
        dict[UUID, tuple[FeedbackAttachmentRecord, ...]],
    ]:
        """Return a page of feedback plus its comments and attachments (one session)."""

        async with self._session_maker() as session:
            repository = FeedbackRepository(session)
            try:
                page = await repository.list_feedback(query)
                ids = [record.id for record in page.records]
                comments_by_id = await repository.list_comments_for_feedback_ids(ids)
                attachments_by_id = await repository.list_attachments_for_feedback_ids(ids)
                return page, comments_by_id, attachments_by_id
            except SQLAlchemyError as exc:
                await session.rollback()
                raise FeedbackReadError("failed to read feedback records") from exc

    async def get_feedback_event(self, feedback_id: UUID) -> FeedbackEventRecord | None:
        """Return one feedback record by ID (unscoped)."""

        async with self._session_maker() as session:
            repository = FeedbackRepository(session)
            try:
                return await repository.get_feedback_event(feedback_id)
            except SQLAlchemyError as exc:
                await session.rollback()
                raise FeedbackReadError("failed to read feedback records") from exc

    async def get_scoped_feedback_event(
        self,
        feedback_id: UUID,
        project_ids: Collection[UUID],
    ) -> FeedbackEventRecord | None:
        """Return one record only when its project is in ``project_ids``, else None."""

        async with self._session_maker() as session:
            repository = FeedbackRepository(session)
            try:
                return await repository.get_scoped_feedback_event(feedback_id, project_ids)
            except SQLAlchemyError as exc:
                await session.rollback()
                raise FeedbackReadError("failed to read feedback records") from exc

    async def get_scoped_feedback_detail(
        self,
        feedback_id: UUID,
        project_ids: Collection[UUID],
    ) -> (
        tuple[
            FeedbackEventRecord,
            tuple[FeedbackCommentRecord, ...],
            tuple[FeedbackAttachmentRecord, ...],
        ]
        | None
    ):
        """Return one in-scope record with its comments and attachments, or None.

        Vocky's detail handlers (a scoped load, then the comments and the
        attachments) in one session; nothing of an out-of-scope event is read.
        """

        async with self._session_maker() as session:
            repository = FeedbackRepository(session)
            try:
                record = await repository.get_scoped_feedback_event(feedback_id, project_ids)
                if record is None:
                    return None
                comments = await repository.list_feedback_comments(record.id)
                attachments = await repository.list_feedback_attachments(record.id)
                return record, comments, attachments
            except SQLAlchemyError as exc:
                await session.rollback()
                raise FeedbackReadError("failed to read feedback records") from exc

    async def summarize_feedback(self, query: SummarizeFeedbackQuery) -> FeedbackSummary:
        """Return aggregate feedback counts over a requested window."""

        async with self._session_maker() as session:
            repository = FeedbackRepository(session)
            try:
                return await repository.summarize_feedback(query)
            except SQLAlchemyError as exc:
                await session.rollback()
                raise FeedbackReadError("failed to read feedback records") from exc

    async def get_feedback_metrics(self, query: FeedbackMetricsQuery) -> FeedbackMetrics:
        """Return dashboard feedback metrics over a requested window."""

        async with self._session_maker() as session:
            repository = FeedbackRepository(session)
            try:
                return await repository.get_feedback_metrics(query)
            except SQLAlchemyError as exc:
                await session.rollback()
                raise FeedbackReadError("failed to read feedback records") from exc

    # -- comments -------------------------------------------------------------

    async def create_feedback_comment(
        self,
        payload: CreateFeedbackComment,
    ) -> FeedbackCommentRecord:
        """Persist an operator comment and return the stored record."""

        async with self._session_maker() as session:
            repository = FeedbackRepository(session)
            try:
                record = await repository.create_feedback_comment(payload)
                await session.commit()
            except SQLAlchemyError as exc:
                await session.rollback()
                raise FeedbackPersistenceError("failed to persist feedback comment") from exc

        return record

    async def list_feedback_comments(
        self,
        feedback_id: UUID,
    ) -> tuple[FeedbackCommentRecord, ...]:
        """Return one feedback event's operator comments, oldest-first."""

        async with self._session_maker() as session:
            repository = FeedbackRepository(session)
            try:
                return await repository.list_feedback_comments(feedback_id)
            except SQLAlchemyError as exc:
                await session.rollback()
                raise FeedbackReadError("failed to read feedback comments") from exc

    # -- attachments ----------------------------------------------------------

    async def create_unlinked_attachment(
        self,
        payload: CreateFeedbackAttachment,
        *,
        unlinked_ceiling: int | None = None,
        total_ceiling: int | None = None,
    ) -> FeedbackAttachmentRecord:
        """Persist an uploaded, not-yet-linked attachment and return it.

        With ``unlinked_ceiling``, the insert happens only if the total size of the
        unlinked attachments, this one included, stays at or under it; otherwise
        nothing is written and :class:`FeedbackCapacityError` is raised. With
        ``total_ceiling``, checked second, the same holds for every stored
        attachment, linked or not, and :class:`FeedbackStorageFullError` is raised.
        The checks and the insert share one transaction under an advisory lock, so
        concurrent uploads never overshoot a ceiling together.
        """

        async with self._session_maker() as session:
            repository = FeedbackRepository(session)
            try:
                if unlinked_ceiling is not None or total_ceiling is not None:
                    await repository.lock_unlinked_ceiling()
                if unlinked_ceiling is not None:
                    total = await repository.unlinked_attachment_bytes()
                    if total + payload.byte_size > unlinked_ceiling:
                        await session.rollback()
                        raise FeedbackCapacityError(
                            "unlinked attachments are at their ceiling"
                        )
                if total_ceiling is not None:
                    stored = await repository.attachment_bytes()
                    if stored + payload.byte_size > total_ceiling:
                        await session.rollback()
                        raise FeedbackStorageFullError(
                            "stored attachments are at their ceiling"
                        )
                record = await repository.create_feedback_attachment(payload)
                await session.commit()
            except SQLAlchemyError as exc:
                await session.rollback()
                raise FeedbackPersistenceError(
                    "failed to persist feedback attachment"
                ) from exc

        return record

    async def attachment_bytes(self) -> int:
        """The total size of every stored attachment, linked or not (all orgs together)."""

        async with self._session_maker() as session:
            repository = FeedbackRepository(session)
            try:
                return await repository.attachment_bytes()
            except SQLAlchemyError as exc:
                await session.rollback()
                raise FeedbackReadError("failed to measure stored attachments") from exc

    async def unlinked_attachment_bytes(self) -> int:
        """The total size of every unlinked attachment (all orgs together)."""

        async with self._session_maker() as session:
            repository = FeedbackRepository(session)
            try:
                return await repository.unlinked_attachment_bytes()
            except SQLAlchemyError as exc:
                await session.rollback()
                raise FeedbackReadError("failed to measure unlinked attachments") from exc

    async def reclaim_unlinked_attachments(
        self,
        *,
        older_than: datetime,
        limit: int,
    ) -> tuple[str, ...]:
        """Delete up to ``limit`` unlinked attachment rows older than ``older_than``.

        Returns their storage keys once the delete is committed, so the caller removes
        the files only for rows that are really gone. Linked rows are never touched.
        """

        async with self._session_maker() as session:
            repository = FeedbackRepository(session)
            try:
                keys = await repository.delete_stale_unlinked_attachments(
                    older_than=older_than, limit=limit
                )
                await session.commit()
            except SQLAlchemyError as exc:
                await session.rollback()
                raise FeedbackPersistenceError(
                    "failed to reclaim unlinked attachments"
                ) from exc

        return keys

    async def get_feedback_attachment(
        self,
        attachment_id: UUID,
    ) -> FeedbackAttachmentRecord | None:
        """Return one stored attachment by id, or None when missing (unscoped)."""

        async with self._session_maker() as session:
            repository = FeedbackRepository(session)
            try:
                return await repository.get_feedback_attachment(attachment_id)
            except SQLAlchemyError as exc:
                await session.rollback()
                raise FeedbackReadError("failed to read feedback attachment") from exc

    async def list_feedback_attachments(
        self,
        feedback_id: UUID,
    ) -> tuple[FeedbackAttachmentRecord, ...]:
        """Return one feedback event's attachments, oldest-first."""

        async with self._session_maker() as session:
            repository = FeedbackRepository(session)
            try:
                return await repository.list_feedback_attachments(feedback_id)
            except SQLAlchemyError as exc:
                await session.rollback()
                raise FeedbackReadError("failed to read feedback attachments") from exc

    async def get_user_attachment(
        self,
        *,
        feedback_id: UUID,
        attachment_id: UUID,
        user_id: str,
        source_product: str,
    ) -> FeedbackAttachmentRecord | None:
        """Return an attachment for an end-user download, scope-checked."""

        async with self._session_maker() as session:
            repository = FeedbackRepository(session)
            try:
                return await repository.get_user_attachment(
                    feedback_id=feedback_id,
                    attachment_id=attachment_id,
                    user_id=user_id,
                    source_product=source_product,
                )
            except SQLAlchemyError as exc:
                await session.rollback()
                raise FeedbackReadError("failed to read feedback attachment") from exc

    async def get_admin_attachment(
        self,
        *,
        feedback_id: UUID,
        attachment_id: UUID,
    ) -> FeedbackAttachmentRecord | None:
        """Return an attachment by its feedback linkage (unscoped)."""

        async with self._session_maker() as session:
            repository = FeedbackRepository(session)
            try:
                return await repository.get_admin_attachment(
                    feedback_id=feedback_id,
                    attachment_id=attachment_id,
                )
            except SQLAlchemyError as exc:
                await session.rollback()
                raise FeedbackReadError("failed to read feedback attachment") from exc

    async def get_scoped_attachment(
        self,
        *,
        feedback_id: UUID,
        attachment_id: UUID,
        project_ids: Collection[UUID],
    ) -> FeedbackAttachmentRecord | None:
        """Return an attachment only when its linked event's project is in scope."""

        async with self._session_maker() as session:
            repository = FeedbackRepository(session)
            try:
                return await repository.get_scoped_attachment(
                    feedback_id=feedback_id,
                    attachment_id=attachment_id,
                    project_ids=project_ids,
                )
            except SQLAlchemyError as exc:
                await session.rollback()
                raise FeedbackReadError("failed to read feedback attachment") from exc


def get_feedback_service() -> FeedbackService:
    """Return the shared feedback service (raises when ``DATABASE_URL`` is unset)."""

    return FeedbackService(get_session_maker())
