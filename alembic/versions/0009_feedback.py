"""feedback: events, comments and attachments, in vocky's final shape

Revision ID: 0009_feedback
Revises: 0008_org_plan_and_key_scope
Create Date: 2026-11-13 00:00:00

Vocky's three Feedback tables, folded from its twelve revisions (head
``20260805_1200``) into one, with vocky's column types, nullability, defaults,
constraint names and index names, so vocky's rows can be copied in column for
column (only ``project_id`` remapped to the platform's projects):

* ``feedback_events``: 26 columns. ``project_id`` -> ``projects.id`` ON DELETE
  CASCADE is the only foreign key out of the three tables: an event belongs to an
  org only through its project. ``user_id`` is the end user's own text and
  ``recorded_by`` is ``agent`` | ``human`` | NULL. Twelve btree indexes, a GIN
  index on ``tags`` and the trigram search index.
* ``feedback_comments``: an operator's comments, CASCADE from the event.
* ``feedback_attachments``: uploaded images; ``feedback_id`` is NULL until the
  capture links the upload to its event, then CASCADE.

No CHECK and no UNIQUE, as in vocky. The search index is a ``pg_trgm`` GIN index
over ``coalesce(message, '') || ' ' || ... || coalesce(trigger_message, '')``; it
must stay byte-for-byte the expression ``server.persistence.models
.feedback_search_expression`` renders, or the planner cannot use it for the
repository's ``ILIKE``. ``pg_trgm`` ships with Postgres and is a trusted
extension, so the database owner can create it.

Downgrade drops the three tables. It leaves the ``pg_trgm`` extension in place:
another object may come to use it, and dropping an extension is not this
revision's to decide.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0009_feedback"
down_revision: str | None = "0008_org_plan_and_key_scope"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

# Kept in lock-step with server.persistence.models.feedback_search_expression.
_SEARCH_EXPR = (
    "coalesce(message, '') || ' ' || "
    "coalesce(comment, '') || ' ' || "
    "coalesce(target_text, '') || ' ' || "
    "coalesce(trigger_message, '')"
)

_EVENT_INDEXES = (
    "ingested_at",
    "event_at",
    "source_product",
    "feedback_value",
    "channel",
    "conversation_id",
    "session_id",
    "user_id",
    "trigger_type",
    "recorded_by",
    "target_type",
    "project_id",
)


def _jsonb(name: str, default: str) -> sa.Column:
    return sa.Column(
        name,
        postgresql.JSONB(astext_type=sa.Text()),
        nullable=False,
        server_default=sa.text(f"'{default}'::jsonb"),
    )


def _created_at() -> sa.Column:
    return sa.Column(
        "created_at",
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.text("CURRENT_TIMESTAMP"),
    )


def upgrade() -> None:
    """Create ``pg_trgm`` (if absent), the three tables and their indexes."""

    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    op.create_table(
        "feedback_events",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("project_id", sa.UUID(), nullable=True),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("source_product", sa.Text(), nullable=False),
        sa.Column("feedback_value", sa.Integer(), nullable=True),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("channel", sa.Text(), nullable=True),
        sa.Column("source_integration", sa.Text(), nullable=True),
        sa.Column("recorded_by", sa.Text(), nullable=True),
        sa.Column("conversation_id", sa.Text(), nullable=True),
        sa.Column("session_id", sa.Text(), nullable=True),
        sa.Column("user_id", sa.Text(), nullable=True),
        sa.Column("trigger_type", sa.Text(), nullable=True),
        sa.Column("trigger_message", sa.Text(), nullable=True),
        _jsonb("trigger_metadata", "{}"),
        sa.Column("target_type", sa.Text(), nullable=True),
        sa.Column("target_id", sa.Text(), nullable=True),
        sa.Column("target_role", sa.Text(), nullable=True),
        sa.Column("target_text", sa.Text(), nullable=True),
        sa.Column("event_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "ingested_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "tags",
            postgresql.ARRAY(sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::text[]"),
        ),
        _jsonb("messages", "[]"),
        _jsonb("used_context", "[]"),
        _jsonb("source_metadata", "{}"),
        _jsonb("attributes", "{}"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_feedback_events")),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            name=op.f("fk_feedback_events_project_id_projects"),
            ondelete="CASCADE",
        ),
    )
    for column in _EVENT_INDEXES:
        op.create_index(f"ix_feedback_events_{column}", "feedback_events", [column])
    op.create_index(
        "ix_feedback_events_tags_gin",
        "feedback_events",
        ["tags"],
        postgresql_using="gin",
    )
    op.execute(
        "CREATE INDEX ix_feedback_events_search_trgm "
        f"ON feedback_events USING gin (({_SEARCH_EXPR}) gin_trgm_ops)"
    )

    op.create_table(
        "feedback_comments",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("feedback_id", sa.UUID(), nullable=False),
        sa.Column("author", sa.Text(), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        _created_at(),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_feedback_comments")),
        sa.ForeignKeyConstraint(
            ["feedback_id"],
            ["feedback_events.id"],
            name=op.f("fk_feedback_comments_feedback_id_feedback_events"),
            ondelete="CASCADE",
        ),
    )
    op.create_index(
        "ix_feedback_comments_feedback_id", "feedback_comments", ["feedback_id"]
    )
    op.create_index(
        "ix_feedback_comments_feedback_id_created_at",
        "feedback_comments",
        ["feedback_id", "created_at"],
    )

    op.create_table(
        "feedback_attachments",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("feedback_id", sa.UUID(), nullable=True),
        sa.Column("storage_key", sa.Text(), nullable=False),
        sa.Column("content_type", sa.Text(), nullable=False),
        sa.Column("byte_size", sa.Integer(), nullable=False),
        sa.Column("filename", sa.Text(), nullable=True),
        sa.Column("claimed_user_id", sa.Text(), nullable=True),
        sa.Column("claimed_source_product", sa.Text(), nullable=False),
        _created_at(),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_feedback_attachments")),
        sa.ForeignKeyConstraint(
            ["feedback_id"],
            ["feedback_events.id"],
            name=op.f("fk_feedback_attachments_feedback_id_feedback_events"),
            ondelete="CASCADE",
        ),
    )
    op.create_index(
        "ix_feedback_attachments_feedback_id", "feedback_attachments", ["feedback_id"]
    )
    op.create_index(
        "ix_feedback_attachments_feedback_id_created_at",
        "feedback_attachments",
        ["feedback_id", "created_at"],
    )
    op.create_index(
        "ix_feedback_attachments_created_at", "feedback_attachments", ["created_at"]
    )


def downgrade() -> None:
    """Drop the three tables (their indexes go with them); keep ``pg_trgm``."""

    op.drop_table("feedback_attachments")
    op.drop_table("feedback_comments")
    op.drop_table("feedback_events")
