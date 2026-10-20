"""reader state: seven tables for each signed-in reader's private state

Revision ID: 0006_reader_state
Revises: 0005_tenant_slug
Create Date: 2026-10-21 00:00:00

P30.S8, building P29.S3 *Tables*. Adds, purely additively:

* ``reader_positions`` — one resume position + chapter progress per
  ``(user_id, tenant_id, project, doc)`` (that key is the primary key, so the
  last-write-wins upsert has its conflict target);
* ``reader_bookmarks`` — explicit bookmarks;
* ``reader_annotations`` — highlights and notes (CHECK: a quote or a note);
* ``quiz_attempts`` — the append-only attempt log, unique per
  ``(user, tenant, project, unit, item_id, attempt)`` so the server's numbering
  cannot duplicate under a race;
* ``review_cards`` / ``review_logs`` — S10's FSRS cards and their log (created
  here so S10 needs no migration);
* ``reader_profiles`` — review settings, one row per user.

Every table cascades from ``users``; every content-keyed table also cascades from
``tenants``. There is no FK into the SQLite content plane: a deleted document's
rows are purged by the delete handlers. Besides P29's indexes, each doc-keyed
table gets a ``(tenant_id, project, doc)`` index for that cross-user purge and for
the unit re-write a manifest change triggers. Value checks stay app-layer (the
``projects.visibility`` precedent), except P29's one CHECK on annotations.

Downgrade drops the seven tables, dependents first (fix-forward repo).
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0006_reader_state"
down_revision: str | None = "0005_tenant_slug"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def _now() -> sa.TextClause:
    return sa.text("CURRENT_TIMESTAMP")


def _ts(name: str, nullable: bool = False) -> sa.Column:
    if nullable:
        return sa.Column(name, sa.DateTime(timezone=True), nullable=True)
    return sa.Column(name, sa.DateTime(timezone=True), nullable=False, server_default=_now())


def _fk(table: str, column: str, target: str) -> sa.ForeignKeyConstraint:
    return sa.ForeignKeyConstraint(
        [column],
        [f"{target}.id"],
        name=op.f(f"fk_{table}_{column}_{target}"),
        ondelete="CASCADE",
    )


def _content_cols() -> list[sa.Column]:
    """The owner + document key every per-document table carries."""

    return [
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("project", sa.Text(), nullable=False),
        sa.Column("doc", sa.Text(), nullable=False),
        sa.Column("unit", sa.Text(), nullable=False),
        sa.Column("lang", sa.Text(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
    ]


def upgrade() -> None:
    """Create the seven reader-state tables and their indexes."""

    # -- reader_positions ----------------------------------------------------
    op.create_table(
        "reader_positions",
        *_content_cols(),
        sa.Column("format", sa.Text(), nullable=False),
        sa.Column("anchor_id", sa.Text(), nullable=True),
        sa.Column("fraction", sa.Float(), nullable=False),
        sa.Column("max_fraction", sa.Float(), nullable=False),
        sa.Column("state", sa.Text(), nullable=False),
        sa.Column("finished_version", sa.Integer(), nullable=True),
        _ts("started_at"),
        _ts("finished_at", nullable=True),
        _ts("updated_at"),
        sa.PrimaryKeyConstraint(
            "user_id", "tenant_id", "project", "doc", name=op.f("pk_reader_positions")
        ),
        _fk("reader_positions", "user_id", "users"),
        _fk("reader_positions", "tenant_id", "tenants"),
    )
    op.create_index(
        "ix_reader_positions_user_updated",
        "reader_positions",
        ["user_id", sa.text("updated_at DESC")],
    )
    op.create_index(
        "ix_reader_positions_user_unit",
        "reader_positions",
        ["user_id", "tenant_id", "project", "unit"],
    )
    op.create_index("ix_reader_positions_doc", "reader_positions", ["tenant_id", "project", "doc"])

    # -- reader_bookmarks ----------------------------------------------------
    op.create_table(
        "reader_bookmarks",
        sa.Column("id", sa.UUID(), nullable=False),
        *_content_cols(),
        sa.Column("anchor", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("label", sa.Text(), nullable=True),
        sa.Column("snippet", sa.Text(), nullable=False),
        _ts("created_at"),
        _ts("updated_at"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_reader_bookmarks")),
        _fk("reader_bookmarks", "user_id", "users"),
        _fk("reader_bookmarks", "tenant_id", "tenants"),
    )
    op.create_index(
        "ix_reader_bookmarks_user_unit",
        "reader_bookmarks",
        ["user_id", "tenant_id", "project", "unit"],
    )
    op.create_index("ix_reader_bookmarks_doc", "reader_bookmarks", ["tenant_id", "project", "doc"])

    # -- reader_annotations --------------------------------------------------
    op.create_table(
        "reader_annotations",
        sa.Column("id", sa.UUID(), nullable=False),
        *_content_cols(),
        sa.Column("block_id", sa.Text(), nullable=False),
        sa.Column("quote", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("anchor_status", sa.Text(), nullable=False),
        sa.Column("anchored_version", sa.Integer(), nullable=False),
        _ts("created_at"),
        _ts("updated_at"),
        sa.CheckConstraint(
            "quote IS NOT NULL OR note IS NOT NULL",
            name=op.f("ck_reader_annotations_quote_or_note"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_reader_annotations")),
        _fk("reader_annotations", "user_id", "users"),
        _fk("reader_annotations", "tenant_id", "tenants"),
    )
    op.create_index(
        "ix_reader_annotations_user_unit",
        "reader_annotations",
        ["user_id", "tenant_id", "project", "unit"],
    )
    op.create_index(
        "ix_reader_annotations_doc", "reader_annotations", ["tenant_id", "project", "doc"]
    )

    # -- quiz_attempts -------------------------------------------------------
    op.create_table(
        "quiz_attempts",
        sa.Column("id", sa.UUID(), nullable=False),
        *_content_cols(),
        sa.Column("block_id", sa.Text(), nullable=False),
        sa.Column("item_id", sa.Text(), nullable=False),
        sa.Column("item_type", sa.Text(), nullable=False),
        sa.Column("response", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("correct", sa.Boolean(), nullable=False),
        sa.Column("attempt", sa.Integer(), nullable=False),
        _ts("answered_at"),
        _ts("created_at"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_quiz_attempts")),
        sa.UniqueConstraint(
            "user_id", "tenant_id", "project", "unit", "item_id", "attempt",
            name="uq_quiz_attempts_user_item_attempt",
        ),
        _fk("quiz_attempts", "user_id", "users"),
        _fk("quiz_attempts", "tenant_id", "tenants"),
    )
    op.create_index("ix_quiz_attempts_doc", "quiz_attempts", ["tenant_id", "project", "doc"])

    # -- review_cards (S10 writes them) --------------------------------------
    op.create_table(
        "review_cards",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("project", sa.Text(), nullable=False),
        sa.Column("unit", sa.Text(), nullable=False),
        sa.Column("source", sa.Text(), nullable=False),
        sa.Column("item_id", sa.Text(), nullable=True),
        sa.Column("annotation_id", sa.UUID(), nullable=True),
        sa.Column("item_type", sa.Text(), nullable=False),
        sa.Column("lang", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        _ts("due"),
        sa.Column("stability", sa.Float(), nullable=True),
        sa.Column("difficulty", sa.Float(), nullable=True),
        sa.Column("fsrs_state", sa.Integer(), nullable=False),
        sa.Column("step", sa.Integer(), nullable=True),
        sa.Column("reps", sa.Integer(), nullable=False),
        sa.Column("lapses", sa.Integer(), nullable=False),
        _ts("last_review", nullable=True),
        _ts("created_at"),
        _ts("updated_at"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_review_cards")),
        sa.UniqueConstraint("annotation_id", name=op.f("uq_review_cards_annotation_id")),
        _fk("review_cards", "user_id", "users"),
        _fk("review_cards", "tenant_id", "tenants"),
        sa.ForeignKeyConstraint(
            ["annotation_id"],
            ["reader_annotations.id"],
            name=op.f("fk_review_cards_annotation_id_reader_annotations"),
            ondelete="CASCADE",
        ),
    )
    op.create_index(
        "uq_review_cards_quiz_item",
        "review_cards",
        ["user_id", "tenant_id", "project", "unit", "item_id"],
        unique=True,
        postgresql_where=sa.text("source = 'quiz'"),
    )
    op.create_index(
        "ix_review_cards_user_status_due", "review_cards", ["user_id", "status", "due"]
    )

    # -- review_logs ---------------------------------------------------------
    op.create_table(
        "review_logs",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("card_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("response", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        _ts("reviewed_at"),
        sa.Column("state_before", sa.Integer(), nullable=False),
        sa.Column("scheduled_days", sa.Integer(), nullable=False),
        sa.Column("elapsed_days", sa.Integer(), nullable=False),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_review_logs")),
        sa.ForeignKeyConstraint(
            ["card_id"],
            ["review_cards.id"],
            name=op.f("fk_review_logs_card_id_review_cards"),
            ondelete="CASCADE",
        ),
        _fk("review_logs", "user_id", "users"),
    )
    op.create_index("ix_review_logs_card_id", "review_logs", ["card_id"])

    # -- reader_profiles -----------------------------------------------------
    op.create_table(
        "reader_profiles",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("time_zone", sa.Text(), nullable=True),
        sa.Column(
            "day_starts_at_hour", sa.Integer(), nullable=False, server_default=sa.text("4")
        ),
        sa.Column(
            "max_reviews_per_day", sa.Integer(), nullable=False, server_default=sa.text("200")
        ),
        sa.Column(
            "new_highlights_per_day", sa.Integer(), nullable=False, server_default=sa.text("20")
        ),
        _ts("updated_at"),
        sa.PrimaryKeyConstraint("user_id", name=op.f("pk_reader_profiles")),
        _fk("reader_profiles", "user_id", "users"),
    )


def downgrade() -> None:
    """Drop the seven tables, dependents first (their indexes go with them)."""

    op.drop_table("reader_profiles")
    op.drop_table("review_logs")
    op.drop_table("review_cards")
    op.drop_table("quiz_attempts")
    op.drop_table("reader_annotations")
    op.drop_table("reader_bookmarks")
    op.drop_table("reader_positions")
