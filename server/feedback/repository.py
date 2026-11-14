"""Persistence repository for Feedback (ported from vocky's ``feedback/repository.py``).

The sole ORM boundary for the Feedback domain. It never commits: the service owns
the transaction. An event belongs to an org only through its project, so every
org-facing read is scoped by a set of project ids: ``FeedbackQueryFilters.project_ids``
for lists, summaries and metrics, and the ``get_scoped_*`` methods for one event or
one attachment, which return ``None`` for a missing row and for a row outside the
scope alike (a NULL-project row is never in scope). The unscoped by-id methods
(``get_feedback_event``, ``update_feedback_event``, ...) are vocky's own; an org-facing
caller reaches them only after a scoped load, as vocky's handlers do.
"""

from __future__ import annotations

import logging
from collections.abc import Collection, Mapping, Sequence
from datetime import date, datetime, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import Select, and_, bindparam, delete, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from server.feedback.types import (
    CreateFeedbackAttachment,
    CreateFeedbackComment,
    CreateFeedbackEvent,
    FeedbackAttachmentRecord,
    FeedbackCommentRecord,
    FeedbackDailyCount,
    FeedbackDailyMetricCount,
    FeedbackEventRecord,
    FeedbackListCursor,
    FeedbackListPage,
    FeedbackMetricCounts,
    FeedbackMetrics,
    FeedbackMetricsQuery,
    FeedbackQueryFilters,
    FeedbackSummary,
    ListFeedbackQuery,
    SummarizeFeedbackQuery,
)
from server.persistence.models import (
    FeedbackAttachmentModel,
    FeedbackCommentModel,
    FeedbackEventModel,
    feedback_search_expression,
)

logger = logging.getLogger(__name__)


class FeedbackRepository:
    """Repository for feedback event persistence and reads."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    # -- events ---------------------------------------------------------------

    async def create_feedback_event(
        self,
        payload: CreateFeedbackEvent,
    ) -> FeedbackEventRecord:
        """Persist a feedback event and return the stored record."""

        model = FeedbackEventModel(
            project_id=payload.project_id,
            message=payload.message,
            source_product=payload.source_product,
            feedback_value=payload.feedback_value,
            comment=payload.comment,
            channel=payload.channel,
            source_integration=payload.source_integration,
            recorded_by=payload.recorded_by,
            conversation_id=payload.conversation_id,
            session_id=payload.session_id,
            user_id=payload.user_id,
            trigger_type=payload.trigger_type,
            trigger_message=payload.trigger_message,
            trigger_metadata=dict(payload.trigger_metadata),
            target_type=payload.target_type,
            target_id=payload.target_id,
            target_role=payload.target_role,
            target_text=payload.target_text,
            event_at=payload.event_at,
            tags=list(payload.tags),
            messages=list(payload.messages),
            used_context=list(payload.used_context),
            source_metadata=dict(payload.source_metadata),
            attributes=dict(payload.attributes),
        )
        self._session.add(model)
        await self._session.flush()
        await self._session.refresh(model)
        return self._to_record(model)

    async def get_feedback_event(self, feedback_id: UUID) -> FeedbackEventRecord | None:
        """Return one stored feedback record by ID (unscoped)."""

        model = await self._session.get(FeedbackEventModel, feedback_id)
        if model is None:
            return None
        return self._to_record(model)

    async def get_scoped_feedback_event(
        self,
        feedback_id: UUID,
        project_ids: Collection[UUID],
    ) -> FeedbackEventRecord | None:
        """Return one record only when its project is in ``project_ids``.

        ``None`` both when the record is missing and when it lies outside the scope
        (a NULL-project row included), so a caller's 404 never leaks existence.
        Vocky's ``_load_scoped_feedback`` / ``_load_project_feedback``, as a query.
        """

        scope = tuple(project_ids)
        if not scope:
            return None
        statement = select(FeedbackEventModel).where(
            FeedbackEventModel.id == feedback_id,
            FeedbackEventModel.project_id.in_(scope),
        )
        model = (await self._session.execute(statement)).scalar_one_or_none()
        return self._to_record(model) if model is not None else None

    async def update_feedback_event(
        self,
        feedback_id: UUID,
        updates: Mapping[str, Any],
    ) -> FeedbackEventRecord | None:
        """Update a stored feedback record and return it."""

        model = await self._session.get(FeedbackEventModel, feedback_id)
        if model is None:
            return None

        for field_name, value in updates.items():
            setattr(model, field_name, value)

        await self._session.flush()
        await self._session.refresh(model)
        return self._to_record(model)

    async def delete_feedback_event(self, feedback_id: UUID) -> bool:
        """Delete a stored feedback record by ID (comments and attachments cascade)."""

        model = await self._session.get(FeedbackEventModel, feedback_id)
        if model is None:
            return False

        await self._session.delete(model)
        await self._session.flush()
        return True

    # -- comments -------------------------------------------------------------

    async def create_feedback_comment(
        self,
        payload: CreateFeedbackComment,
    ) -> FeedbackCommentRecord:
        """Persist an operator comment and return the stored record."""

        model = FeedbackCommentModel(
            feedback_id=payload.feedback_id,
            author=payload.author,
            body=payload.body,
        )
        self._session.add(model)
        await self._session.flush()
        await self._session.refresh(model)
        return self._to_comment_record(model)

    async def list_feedback_comments(
        self,
        feedback_id: UUID,
    ) -> tuple[FeedbackCommentRecord, ...]:
        """Return one feedback event's operator comments, oldest-first."""

        statement = (
            select(FeedbackCommentModel)
            .where(FeedbackCommentModel.feedback_id == feedback_id)
            .order_by(
                FeedbackCommentModel.created_at,
                FeedbackCommentModel.id,
            )
        )
        models = (await self._session.execute(statement)).scalars().all()
        return tuple(self._to_comment_record(model) for model in models)

    async def list_comments_for_feedback_ids(
        self,
        feedback_ids: Sequence[UUID],
    ) -> dict[UUID, tuple[FeedbackCommentRecord, ...]]:
        """Return operator comments grouped by feedback id, oldest-first (batched)."""

        if not feedback_ids:
            return {}

        statement = (
            select(FeedbackCommentModel)
            .where(FeedbackCommentModel.feedback_id.in_(feedback_ids))
            .order_by(
                FeedbackCommentModel.feedback_id,
                FeedbackCommentModel.created_at,
                FeedbackCommentModel.id,
            )
        )
        models = (await self._session.execute(statement)).scalars().all()

        grouped: dict[UUID, list[FeedbackCommentRecord]] = {}
        for model in models:
            grouped.setdefault(model.feedback_id, []).append(
                self._to_comment_record(model)
            )
        return {feedback_id: tuple(records) for feedback_id, records in grouped.items()}

    # -- attachments ----------------------------------------------------------

    async def create_feedback_attachment(
        self,
        payload: CreateFeedbackAttachment,
    ) -> FeedbackAttachmentRecord:
        """Persist an uploaded, not-yet-linked attachment and return it."""

        model = FeedbackAttachmentModel(
            storage_key=payload.storage_key,
            content_type=payload.content_type,
            byte_size=payload.byte_size,
            filename=payload.filename,
            claimed_user_id=payload.claimed_user_id,
            claimed_source_product=payload.claimed_source_product,
        )
        self._session.add(model)
        await self._session.flush()
        await self._session.refresh(model)
        return self._to_attachment_record(model)

    async def delete_stale_unlinked_attachments(
        self,
        *,
        older_than: datetime,
        limit: int,
    ) -> tuple[str, ...]:
        """Delete up to ``limit`` unlinked attachments created before ``older_than``.

        Returns the deleted rows' storage keys, so the caller can remove the files
        after the commit. Oldest first, on ``ix_feedback_attachments_created_at``.
        A linked row (``feedback_id`` set) is never matched. ``FOR UPDATE SKIP
        LOCKED`` keeps two concurrent sweeps off each other's rows, and a capture
        linking the same row concurrently either commits first (the delete then no
        longer matches it) or finds it gone (the link skips it, as for an unknown
        id): a linked attachment never loses its row or its file.
        """

        if limit <= 0:
            return ()
        candidates = (
            select(FeedbackAttachmentModel.id)
            .where(
                FeedbackAttachmentModel.feedback_id.is_(None),
                FeedbackAttachmentModel.created_at < older_than,
            )
            .order_by(FeedbackAttachmentModel.created_at)
            .limit(limit)
            .with_for_update(skip_locked=True)
        )
        statement = (
            delete(FeedbackAttachmentModel)
            .where(
                FeedbackAttachmentModel.id.in_(candidates.scalar_subquery()),
                FeedbackAttachmentModel.feedback_id.is_(None),
            )
            .returning(FeedbackAttachmentModel.storage_key)
            .execution_options(synchronize_session=False)
        )
        return tuple((await self._session.execute(statement)).scalars().all())

    async def get_feedback_attachment(
        self,
        attachment_id: UUID,
    ) -> FeedbackAttachmentRecord | None:
        """Return one stored attachment by id, or None when missing (unscoped)."""

        model = await self._session.get(FeedbackAttachmentModel, attachment_id)
        if model is None:
            return None
        return self._to_attachment_record(model)

    async def link_attachments_to_feedback(
        self,
        feedback_id: UUID,
        attachment_ids: Sequence[UUID],
        *,
        user_id: str | None,
        source_product: str,
    ) -> int:
        """Link unlinked, scope-matching attachments to a feedback event.

        Only attachments that are still unlinked AND whose claimed scope matches the
        feedback's ``(user_id, source_product)`` are linked (a NULL claimed user
        matches only a NULL event user). Returns the number linked. Ids that are
        missing, already linked, or claimed by a different scope are skipped and
        logged, never raised: a misrouted or missing screenshot must not fail real
        feedback. The ``feedback_id IS NULL`` guard makes linking idempotent and
        blocks moving an attachment from one event to another.
        """

        if not attachment_ids:
            return 0

        requested = tuple(dict.fromkeys(attachment_ids))

        if user_id is None:
            claimed_user_match = FeedbackAttachmentModel.claimed_user_id.is_(None)
        else:
            claimed_user_match = FeedbackAttachmentModel.claimed_user_id == user_id

        statement = (
            update(FeedbackAttachmentModel)
            .where(
                FeedbackAttachmentModel.id.in_(requested),
                FeedbackAttachmentModel.feedback_id.is_(None),
                FeedbackAttachmentModel.claimed_source_product == source_product,
                claimed_user_match,
            )
            .values(feedback_id=feedback_id)
            .returning(FeedbackAttachmentModel.id)
            .execution_options(synchronize_session=False)
        )
        linked = set((await self._session.execute(statement)).scalars().all())

        skipped = [aid for aid in requested if aid not in linked]
        if skipped:
            logger.warning(
                "feedback %s: skipped linking %d attachment(s) "
                "(missing, already linked, or scope mismatch): %s",
                feedback_id,
                len(skipped),
                [str(aid) for aid in skipped],
            )
        return len(linked)

    async def list_attachments_for_feedback_ids(
        self,
        feedback_ids: Sequence[UUID],
    ) -> dict[UUID, tuple[FeedbackAttachmentRecord, ...]]:
        """Return attachments grouped by feedback id, oldest-first (batched)."""

        if not feedback_ids:
            return {}

        statement = (
            select(FeedbackAttachmentModel)
            .where(FeedbackAttachmentModel.feedback_id.in_(feedback_ids))
            .order_by(
                FeedbackAttachmentModel.feedback_id,
                FeedbackAttachmentModel.created_at,
                FeedbackAttachmentModel.id,
            )
        )
        models = (await self._session.execute(statement)).scalars().all()

        grouped: dict[UUID, list[FeedbackAttachmentRecord]] = {}
        for model in models:
            assert model.feedback_id is not None
            grouped.setdefault(model.feedback_id, []).append(
                self._to_attachment_record(model)
            )
        return {feedback_id: tuple(records) for feedback_id, records in grouped.items()}

    async def list_feedback_attachments(
        self,
        feedback_id: UUID,
    ) -> tuple[FeedbackAttachmentRecord, ...]:
        """Return one feedback event's attachments, oldest-first."""

        statement = (
            select(FeedbackAttachmentModel)
            .where(FeedbackAttachmentModel.feedback_id == feedback_id)
            .order_by(
                FeedbackAttachmentModel.created_at,
                FeedbackAttachmentModel.id,
            )
        )
        models = (await self._session.execute(statement)).scalars().all()
        return tuple(self._to_attachment_record(model) for model in models)

    async def list_storage_keys_for_feedback(
        self,
        feedback_id: UUID,
    ) -> tuple[str, ...]:
        """Return the storage keys of a feedback event's attachments."""

        statement = select(FeedbackAttachmentModel.storage_key).where(
            FeedbackAttachmentModel.feedback_id == feedback_id
        )
        keys = (await self._session.execute(statement)).scalars().all()
        return tuple(keys)

    async def get_user_attachment(
        self,
        *,
        feedback_id: UUID,
        attachment_id: UUID,
        user_id: str,
        source_product: str,
    ) -> FeedbackAttachmentRecord | None:
        """Return an attachment for an end-user download, scope-checked.

        Authorized off the LINKED feedback row's ``(user_id, source_product)``
        rather than the attachment's claimed scope, so an unlinked attachment is
        never downloadable. ``None`` on any miss (no existence leak).
        """

        statement = (
            select(FeedbackAttachmentModel)
            .join(
                FeedbackEventModel,
                FeedbackEventModel.id == FeedbackAttachmentModel.feedback_id,
            )
            .where(
                FeedbackAttachmentModel.id == attachment_id,
                FeedbackAttachmentModel.feedback_id == feedback_id,
                FeedbackEventModel.user_id == user_id,
                FeedbackEventModel.source_product == source_product,
            )
        )
        model = (await self._session.execute(statement)).scalar_one_or_none()
        return self._to_attachment_record(model) if model is not None else None

    async def get_admin_attachment(
        self,
        *,
        feedback_id: UUID,
        attachment_id: UUID,
    ) -> FeedbackAttachmentRecord | None:
        """Return an attachment by its feedback linkage (unscoped)."""

        statement = select(FeedbackAttachmentModel).where(
            FeedbackAttachmentModel.id == attachment_id,
            FeedbackAttachmentModel.feedback_id == feedback_id,
        )
        model = (await self._session.execute(statement)).scalar_one_or_none()
        return self._to_attachment_record(model) if model is not None else None

    async def get_scoped_attachment(
        self,
        *,
        feedback_id: UUID,
        attachment_id: UUID,
        project_ids: Collection[UUID],
    ) -> FeedbackAttachmentRecord | None:
        """Return an attachment only when its LINKED event's project is in scope.

        The org/project download path (vocky's scoped load + ``get_admin_attachment``
        in one query). ``None`` on any miss, an unlinked attachment included.
        """

        scope = tuple(project_ids)
        if not scope:
            return None
        statement = (
            select(FeedbackAttachmentModel)
            .join(
                FeedbackEventModel,
                FeedbackEventModel.id == FeedbackAttachmentModel.feedback_id,
            )
            .where(
                FeedbackAttachmentModel.id == attachment_id,
                FeedbackAttachmentModel.feedback_id == feedback_id,
                FeedbackEventModel.project_id.in_(scope),
            )
        )
        model = (await self._session.execute(statement)).scalar_one_or_none()
        return self._to_attachment_record(model) if model is not None else None

    # -- lists and aggregates -------------------------------------------------

    async def list_feedback(
        self,
        query: ListFeedbackQuery,
    ) -> FeedbackListPage:
        """Return a cursor-paginated list of stored feedback records, newest first."""

        statement = select(FeedbackEventModel)
        statement = self._apply_query_filters(statement, query.filters)

        if query.cursor is not None:
            statement = statement.where(
                or_(
                    FeedbackEventModel.ingested_at < query.cursor.ingested_at,
                    and_(
                        FeedbackEventModel.ingested_at == query.cursor.ingested_at,
                        FeedbackEventModel.id < query.cursor.id,
                    ),
                )
            )

        statement = statement.order_by(
            FeedbackEventModel.ingested_at.desc(),
            FeedbackEventModel.id.desc(),
        ).limit(query.limit + 1)

        models = (await self._session.execute(statement)).scalars().all()
        has_next_page = len(models) > query.limit
        page_models = models[: query.limit]

        next_cursor = None
        if has_next_page and page_models:
            last_model = page_models[-1]
            next_cursor = FeedbackListCursor(
                ingested_at=last_model.ingested_at,
                id=last_model.id,
            )

        return FeedbackListPage(
            records=tuple(self._to_record(model) for model in page_models),
            next_cursor=next_cursor,
        )

    async def summarize_feedback(
        self,
        query: SummarizeFeedbackQuery,
    ) -> FeedbackSummary:
        """Return aggregate feedback counts over a requested ingest window."""

        total_statement = select(func.count()).select_from(FeedbackEventModel)
        total_statement = self._apply_query_filters(total_statement, query.filters)
        total_count = int((await self._session.execute(total_statement)).scalar_one())

        utc_day = func.date(func.timezone("UTC", FeedbackEventModel.ingested_at))
        daily_statement = select(
            utc_day.label("day"),
            func.count().label("count"),
        ).select_from(FeedbackEventModel)
        daily_statement = self._apply_query_filters(daily_statement, query.filters)
        daily_statement = daily_statement.group_by(utc_day).order_by(utc_day)

        daily_rows = (await self._session.execute(daily_statement)).all()
        counts_by_day = {row.day: int(row.count) for row in daily_rows}

        start_ingested_at = query.filters.start_ingested_at
        end_ingested_at = query.filters.end_ingested_at
        assert start_ingested_at is not None
        assert end_ingested_at is not None

        daily_counts = tuple(
            FeedbackDailyCount(day=day, count=counts_by_day.get(day, 0))
            for day in self._iter_requested_days(start_ingested_at.date(), end_ingested_at)
        )

        return FeedbackSummary(total_count=total_count, daily_counts=daily_counts)

    async def get_feedback_metrics(
        self,
        query: FeedbackMetricsQuery,
    ) -> FeedbackMetrics:
        """Return dashboard metrics over a requested ingest window."""

        utc_day = func.date(func.timezone("UTC", FeedbackEventModel.ingested_at))
        daily_statement = select(
            utc_day.label("day"),
            func.count().label("total"),
            func.count().filter(FeedbackEventModel.feedback_value == 1).label("liked"),
            func.count().filter(FeedbackEventModel.feedback_value == 2).label("disliked"),
            func.count().filter(FeedbackEventModel.feedback_value.is_(None)).label("unrated"),
        ).select_from(FeedbackEventModel)
        daily_statement = self._apply_query_filters(daily_statement, query.filters)
        daily_statement = daily_statement.group_by(utc_day).order_by(utc_day)

        daily_rows = (await self._session.execute(daily_statement)).all()
        counts_by_day = {
            row.day: FeedbackMetricCounts(
                total=int(row.total),
                liked=int(row.liked),
                disliked=int(row.disliked),
                unrated=int(row.unrated),
            )
            for row in daily_rows
        }

        start_ingested_at = query.filters.start_ingested_at
        end_ingested_at = query.filters.end_ingested_at
        assert start_ingested_at is not None
        assert end_ingested_at is not None

        zero_counts = FeedbackMetricCounts(total=0, liked=0, disliked=0, unrated=0)
        daily_counts = tuple(
            FeedbackDailyMetricCount(
                day=day,
                total=counts_by_day.get(day, zero_counts).total,
                liked=counts_by_day.get(day, zero_counts).liked,
                disliked=counts_by_day.get(day, zero_counts).disliked,
                unrated=counts_by_day.get(day, zero_counts).unrated,
            )
            for day in self._iter_requested_days(start_ingested_at.date(), end_ingested_at)
        )

        return FeedbackMetrics(
            totals=FeedbackMetricCounts(
                total=sum(daily_count.total for daily_count in daily_counts),
                liked=sum(daily_count.liked for daily_count in daily_counts),
                disliked=sum(daily_count.disliked for daily_count in daily_counts),
                unrated=sum(daily_count.unrated for daily_count in daily_counts),
            ),
            daily_counts=daily_counts,
        )

    def _apply_query_filters(
        self,
        statement: Select[Any],
        filters: FeedbackQueryFilters,
    ) -> Select[Any]:
        """Apply the supported read filters to a statement."""

        if filters.project_ids is not None:
            statement = statement.where(
                FeedbackEventModel.project_id.in_(filters.project_ids)
            )
        if filters.search is not None:
            # A case-insensitive substring match on the trigram index's own
            # expression, so the planner can use the index. The term's LIKE
            # wildcards are escaped (``icontains(autoescape=True)``'s escaping),
            # under an explicit bind name.
            escaped = (
                filters.search.replace("/", "//").replace("%", "/%").replace("_", "/_")
            )
            statement = statement.where(
                feedback_search_expression().ilike(
                    bindparam("feedback_search", f"%{escaped}%"), escape="/"
                )
            )
        if filters.start_ingested_at is not None:
            statement = statement.where(
                FeedbackEventModel.ingested_at >= filters.start_ingested_at
            )
        if filters.end_ingested_at is not None:
            statement = statement.where(FeedbackEventModel.ingested_at < filters.end_ingested_at)
        if filters.source_product is not None:
            statement = statement.where(
                FeedbackEventModel.source_product == filters.source_product
            )
        if filters.feedback_value is not None:
            statement = statement.where(
                FeedbackEventModel.feedback_value == filters.feedback_value
            )
        if filters.channel is not None:
            statement = statement.where(FeedbackEventModel.channel == filters.channel)
        if filters.target_type is not None:
            statement = statement.where(FeedbackEventModel.target_type == filters.target_type)
        if filters.source_integration is not None:
            statement = statement.where(
                FeedbackEventModel.source_integration == filters.source_integration
            )
        if filters.recorded_by is not None:
            statement = statement.where(FeedbackEventModel.recorded_by == filters.recorded_by)
        if filters.conversation_id is not None:
            statement = statement.where(
                FeedbackEventModel.conversation_id == filters.conversation_id
            )
        if filters.session_id is not None:
            statement = statement.where(FeedbackEventModel.session_id == filters.session_id)
        if filters.user_id is not None:
            statement = statement.where(FeedbackEventModel.user_id == filters.user_id)
        if filters.trigger_type is not None:
            statement = statement.where(FeedbackEventModel.trigger_type == filters.trigger_type)
        if filters.tag is not None:
            statement = statement.where(FeedbackEventModel.tags.contains([filters.tag]))

        return statement

    # -- record conversion ----------------------------------------------------

    def _to_record(self, model: FeedbackEventModel) -> FeedbackEventRecord:
        """Convert a persisted model into a transport-neutral record."""

        return FeedbackEventRecord(
            id=model.id,
            project_id=model.project_id,
            message=model.message,
            source_product=model.source_product,
            feedback_value=model.feedback_value,
            comment=model.comment,
            channel=model.channel,
            source_integration=model.source_integration,
            recorded_by=model.recorded_by,
            conversation_id=model.conversation_id,
            session_id=model.session_id,
            user_id=model.user_id,
            trigger_type=model.trigger_type,
            trigger_message=model.trigger_message,
            trigger_metadata=dict(model.trigger_metadata),
            target_type=model.target_type,
            target_id=model.target_id,
            target_role=model.target_role,
            target_text=model.target_text,
            event_at=model.event_at,
            ingested_at=model.ingested_at,
            tags=tuple(model.tags),
            messages=tuple(model.messages),
            used_context=tuple(model.used_context),
            source_metadata=dict(model.source_metadata),
            attributes=dict(model.attributes),
        )

    def _to_comment_record(self, model: FeedbackCommentModel) -> FeedbackCommentRecord:
        """Convert a persisted comment model into a transport-neutral record."""

        return FeedbackCommentRecord(
            id=model.id,
            feedback_id=model.feedback_id,
            author=model.author,
            body=model.body,
            created_at=model.created_at,
        )

    def _to_attachment_record(
        self,
        model: FeedbackAttachmentModel,
    ) -> FeedbackAttachmentRecord:
        """Convert a persisted attachment model into a transport-neutral record."""

        return FeedbackAttachmentRecord(
            id=model.id,
            feedback_id=model.feedback_id,
            storage_key=model.storage_key,
            content_type=model.content_type,
            byte_size=model.byte_size,
            filename=model.filename,
            claimed_user_id=model.claimed_user_id,
            claimed_source_product=model.claimed_source_product,
            created_at=model.created_at,
        )

    def _iter_requested_days(
        self,
        start_day: date,
        end_ingested_at: datetime,
    ) -> tuple[date, ...]:
        """Return the UTC day series covered by an exclusive end timestamp."""

        last_day = (end_ingested_at - timedelta(microseconds=1)).date()
        # Count the days rather than step past the last one, so a window ending on
        # 9999-12-31 never computes the date after it (an OverflowError).
        return tuple(
            start_day + timedelta(days=offset)
            for offset in range((last_day - start_day).days + 1)
        )
