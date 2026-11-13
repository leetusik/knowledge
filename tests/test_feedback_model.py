"""The Feedback data model and domain service: Postgres-gated.

Round trips an event with its JSON and array columns through create, get, list and
search; a comment and an attachment through capture and delete; the attachment link
guard; org scoping (an org's reads never return another org's rows); and the
project cascade. Runs only with a disposable Postgres via ``KB_TEST_DATABASE_URL``
(or ``DATABASE_URL``) and skips otherwise. Every org, project and product name is
uuid-unique, so a re-used database never interferes.
"""

from __future__ import annotations

import asyncio
import os
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, delete, make_url, text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from server.accounts.service import AccountsService
from server.accounts.types import CreateProject, CreateUser
from server.feedback import (
    CreateFeedbackAttachment,
    CreateFeedbackComment,
    CreateFeedbackEvent,
    FeedbackQueryFilters,
    FeedbackService,
    ListFeedbackQuery,
)

_RAW_DSN = os.environ.get("KB_TEST_DATABASE_URL") or os.environ.get("DATABASE_URL")

Scenario = Callable[[FeedbackService, AccountsService, async_sessionmaker], Awaitable[None]]


@pytest.fixture
def run() -> Callable[[Scenario], None]:
    """Run an async scenario against the Postgres accounts plane, or skip."""

    if not _RAW_DSN:
        pytest.skip(
            "set KB_TEST_DATABASE_URL (or DATABASE_URL) to a disposable Postgres to "
            "run the feedback model tests"
        )
    url = (
        make_url(_RAW_DSN)
        .set(drivername="postgresql+psycopg")
        .render_as_string(hide_password=False)
    )
    sync_engine = create_engine(url)
    try:
        with sync_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:  # pragma: no cover - environment dependent
        sync_engine.dispose()
        pytest.skip(f"Postgres at the test DSN is unreachable: {exc}")

    from server.persistence import models  # noqa: F401 - registers the tables
    from server.persistence.base import Base

    Base.metadata.create_all(sync_engine, checkfirst=True)
    sync_engine.dispose()

    async def _go(scenario: Scenario) -> None:
        engine = create_async_engine(url, poolclass=NullPool)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        try:
            await scenario(FeedbackService(maker), AccountsService(maker), maker)
        finally:
            await engine.dispose()

    return lambda scenario: asyncio.run(_go(scenario))


async def _org(accounts: AccountsService) -> tuple:
    """A new user, an org they own and one project in it."""

    tag = uuid4().hex[:10]
    user = await accounts.create_user(
        CreateUser(email=f"p56s4-{tag}@example.com", password_hash="x")
    )
    tenant, _member = await accounts.create_tenant_with_owner(user.id, f"org-{tag}")
    project = await accounts.create_project(CreateProject(tenant_id=tenant.id, name=f"p-{tag}"))
    return tenant, project


def _event(project_id, product: str, **kw) -> CreateFeedbackEvent:
    return CreateFeedbackEvent(message=kw.pop("message", "hello"), source_product=product,
                               project_id=project_id, **kw)


def test_event_round_trips_through_get_list_and_search(run):
    async def scenario(feedback, accounts, _maker):
        _tenant, project = await _org(accounts)
        product = f"prod-{uuid4().hex[:8]}"
        when = datetime(2026, 11, 13, 12, 0, tzinfo=UTC)
        created = await feedback.create_feedback_event(_event(
            project.id, product,
            message="The checkout button is broken",
            feedback_value=2,
            recorded_by="agent",
            user_id="end-user-1",
            trigger_metadata={"step": 3, "nested": {"ok": True}},
            target_type="message",
            target_text="결제를 진행할 수 없어요",
            event_at=when,
            tags=("bug", "checkout"),
            messages=({"role": "user", "content": "hi"},),
            used_context=("doc-1", {"id": 2}),
            source_metadata={"app": "web"},
            attributes={"severity": "high"},
        ))
        got = await feedback.get_feedback_event(created.id)
        assert got == created
        assert got.tags == ("bug", "checkout")
        assert got.messages == ({"role": "user", "content": "hi"},)
        assert got.used_context == ("doc-1", {"id": 2})
        assert got.trigger_metadata == {"step": 3, "nested": {"ok": True}}
        assert got.event_at == when and got.ingested_at is not None

        scope = FeedbackQueryFilters(project_ids=(project.id,))
        page = await feedback.list_feedback(ListFeedbackQuery(limit=10, filters=scope))
        assert [r.id for r in page.records] == [created.id]

        async def search(term: str) -> list:
            filters = FeedbackQueryFilters(project_ids=(project.id,), search=term)
            return [r.id for r in (await feedback.list_feedback(
                ListFeedbackQuery(limit=10, filters=filters))).records]

        assert await search("CHECKOUT button") == [created.id]  # case-insensitive
        assert await search("결제") == [created.id]  # a substring of a Korean word
        assert await search("refund") == []
        assert await search("%") == []  # LIKE wildcards are matched literally
        assert await search("check_ut") == []
        tagged = FeedbackQueryFilters(project_ids=(project.id,), tag="bug", recorded_by="agent")
        assert len((await feedback.list_feedback(ListFeedbackQuery(limit=10, filters=tagged))).records) == 1

    run(scenario)


def test_comment_and_attachment_round_trip_and_delete_returns_storage_keys(run):
    async def scenario(feedback, accounts, _maker):
        _tenant, project = await _org(accounts)
        product = f"prod-{uuid4().hex[:8]}"
        upload = await feedback.create_unlinked_attachment(CreateFeedbackAttachment(
            storage_key=f"{uuid4().hex}.png", content_type="image/png", byte_size=42,
            claimed_source_product=product, claimed_user_id="u1", filename="shot.png",
        ))
        assert upload.feedback_id is None
        event = await feedback.create_feedback_event_with_attachments(
            _event(project.id, product, user_id="u1", attachment_ids=(upload.id,))
        )
        comment = await feedback.create_feedback_comment(
            CreateFeedbackComment(feedback_id=event.id, body="looking into it", author="op")
        )

        detail = await feedback.get_scoped_feedback_detail(event.id, (project.id,))
        assert detail is not None
        record, comments, attachments = detail
        assert record.id == event.id
        assert comments == (comment,)
        assert [(a.id, a.feedback_id, a.storage_key, a.byte_size) for a in attachments] == [
            (upload.id, event.id, upload.storage_key, 42)
        ]

        deleted, keys = await feedback.delete_feedback_event(event.id)
        assert (deleted, keys) == (True, (upload.storage_key,))
        assert await feedback.get_feedback_event(event.id) is None
        assert await feedback.get_feedback_attachment(upload.id) is None
        assert await feedback.list_feedback_comments(event.id) == ()
        assert await feedback.delete_feedback_event(event.id) == (False, ())

    run(scenario)


def test_attachment_links_only_unlinked_and_scope_matching(run):
    async def scenario(feedback, accounts, _maker):
        _tenant, project = await _org(accounts)
        product = f"prod-{uuid4().hex[:8]}"

        async def upload(user):
            return await feedback.create_unlinked_attachment(CreateFeedbackAttachment(
                storage_key=f"{uuid4().hex}.png", content_type="image/png", byte_size=1,
                claimed_source_product=product, claimed_user_id=user,
            ))

        async def capture(attachment, *, user, prod=product):
            event = await feedback.create_feedback_event_with_attachments(
                _event(project.id, prod, user_id=user, attachment_ids=(attachment.id,))
            )
            return event, (await feedback.get_feedback_attachment(attachment.id)).feedback_id

        shot = await upload("alice")
        _, linked_to = await capture(shot, user="mallory")  # another user
        assert linked_to is None
        _, linked_to = await capture(shot, user="alice", prod=f"other-{product}")  # another product
        assert linked_to is None
        first, linked_to = await capture(shot, user="alice")  # the claimed scope
        assert linked_to == first.id
        _, linked_to = await capture(shot, user="alice")  # never a second time
        assert linked_to == first.id

        anonymous = await upload(None)
        _, linked_to = await capture(anonymous, user="alice")  # NULL matches only NULL
        assert linked_to is None
        event, linked_to = await capture(anonymous, user=None)
        assert linked_to == event.id

    run(scenario)


def test_an_orgs_reads_never_return_another_orgs_rows(run):
    async def scenario(feedback, accounts, _maker):
        product = f"prod-{uuid4().hex[:8]}"
        seeded = {}
        for name in ("a", "b"):
            tenant, project = await _org(accounts)
            shot = await feedback.create_unlinked_attachment(CreateFeedbackAttachment(
                storage_key=f"{uuid4().hex}.png", content_type="image/png", byte_size=1,
                claimed_source_product=product, claimed_user_id="u",
            ))
            event = await feedback.create_feedback_event_with_attachments(_event(
                project.id, product, message=f"shared words {name}", user_id="u",
                attachment_ids=(shot.id,),
            ))
            await feedback.create_feedback_comment(
                CreateFeedbackComment(feedback_id=event.id, body=f"note {name}")
            )
            scope = tuple(p.id for p in await accounts.list_projects_for_tenant(tenant.id))
            seeded[name] = (scope, event, shot)

        scope_a, event_a, shot_a = seeded["a"]
        _scope_b, event_b, shot_b = seeded["b"]

        for search in (None, "shared words"):
            filters = FeedbackQueryFilters(project_ids=scope_a, search=search)
            page, comments, attachments = await feedback.list_feedback_with_comments_and_attachments(
                ListFeedbackQuery(limit=50, filters=filters)
            )
            assert [r.id for r in page.records] == [event_a.id]
            assert set(comments) <= {event_a.id} and set(attachments) <= {event_a.id}

        assert await feedback.get_scoped_feedback_event(event_b.id, scope_a) is None
        assert await feedback.get_scoped_feedback_detail(event_b.id, scope_a) is None
        assert await feedback.get_scoped_attachment(
            feedback_id=event_b.id, attachment_id=shot_b.id, project_ids=scope_a
        ) is None
        # A's own attachment id under B's event id is no way round it either.
        assert await feedback.get_scoped_attachment(
            feedback_id=event_b.id, attachment_id=shot_a.id, project_ids=scope_a
        ) is None
        assert await feedback.get_scoped_feedback_event(event_a.id, ()) is None

        assert (await feedback.get_scoped_feedback_event(event_a.id, scope_a)).id == event_a.id
        assert (await feedback.get_scoped_attachment(
            feedback_id=event_a.id, attachment_id=shot_a.id, project_ids=scope_a
        )).id == shot_a.id

    run(scenario)


def test_deleting_a_project_removes_its_feedback(run):
    async def scenario(feedback, accounts, maker):
        from server.persistence.models import ProjectModel

        _tenant, project = await _org(accounts)
        product = f"prod-{uuid4().hex[:8]}"
        shot = await feedback.create_unlinked_attachment(CreateFeedbackAttachment(
            storage_key=f"{uuid4().hex}.png", content_type="image/png", byte_size=1,
            claimed_source_product=product,
        ))
        event = await feedback.create_feedback_event_with_attachments(
            _event(project.id, product, attachment_ids=(shot.id,))
        )
        await feedback.create_feedback_comment(CreateFeedbackComment(feedback_id=event.id, body="x"))

        async with maker() as session:
            await session.execute(delete(ProjectModel).where(ProjectModel.id == project.id))
            await session.commit()

        assert await feedback.get_feedback_event(event.id) is None
        assert await feedback.list_feedback_comments(event.id) == ()
        assert await feedback.get_feedback_attachment(shot.id) is None

    run(scenario)
