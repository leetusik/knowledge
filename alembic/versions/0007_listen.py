"""listen: units, parts, the job queue, runners and listening positions

Revision ID: 0007_listen
Revises: 0006_reader_state
Create Date: 2026-11-11 00:00:00

P41-sr.B1, the server half of Listen (the voice reader). Adds, purely additively:

* ``listen_units`` — one document version's audio in one language, voice and engine
  profile; unique on that identity, so a concurrent start cannot make two;
* ``listen_parts`` — each unit's manifest: segments grouped by section into parts of
  at most ~10 min, keyed by a hash of their spoken text; ``(tenant_id, part_key)``
  finds a part already made under another unit or version;
* ``listen_jobs`` — one job per part to make, under a lease; a partial unique index
  keeps one live (queued or leased) job per part key per tenant, and a partial index
  backs the claim's ``ORDER BY priority, created_at``;
* ``listen_runners`` — when each runner credential last called;
* ``listen_positions`` — one listening position per user and Listen, beside
  ``reader_positions``, with the listener's speed and follow along.

Every table cascades from ``tenants`` (positions from ``users`` too; parts and jobs
from their unit; runner rows from their credential). The audio itself lives on disk
under each content root's ``.audio/``, never in Postgres. Value checks stay
app-layer, the repo's convention.

Downgrade drops the five tables, dependents first (fix-forward repo).
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0007_listen"
down_revision: str | None = "0006_reader_state"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

_LIVE = sa.text("state IN ('queued', 'leased')")


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


def _jsonb() -> postgresql.JSONB:
    return postgresql.JSONB(astext_type=sa.Text())


def upgrade() -> None:
    """Create the five Listen tables and their indexes."""

    # -- listen_units --------------------------------------------------------
    op.create_table(
        "listen_units",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("project", sa.Text(), nullable=False),
        sa.Column("doc", sa.Text(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("lang", sa.Text(), nullable=False),
        sa.Column("voice", sa.Text(), nullable=False),
        sa.Column("profile", sa.Text(), nullable=False),
        sa.Column("state", sa.Text(), nullable=False),
        sa.Column("part_count", sa.Integer(), nullable=False),
        sa.Column("parts_made", sa.Integer(), nullable=False),
        sa.Column("made_seconds", sa.Float(), nullable=False),
        sa.Column("total_seconds", sa.Float(), nullable=False),
        sa.Column("chars", sa.Integer(), nullable=False),
        sa.Column("failure", sa.Text(), nullable=True),
        sa.Column("failure_kind", sa.Text(), nullable=True),
        sa.Column("failure_part", sa.Integer(), nullable=True),
        _ts("created_at"),
        _ts("updated_at"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_listen_units")),
        sa.UniqueConstraint(
            "tenant_id", "project", "doc", "version", "lang", "voice", "profile",
            name="uq_listen_units_identity",
        ),
        _fk("listen_units", "tenant_id", "tenants"),
    )

    # -- listen_parts --------------------------------------------------------
    op.create_table(
        "listen_parts",
        sa.Column("unit_id", sa.UUID(), nullable=False),
        sa.Column("idx", sa.Integer(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("part_key", sa.Text(), nullable=False),
        sa.Column("seg_first", sa.Integer(), nullable=False),
        sa.Column("seg_last", sa.Integer(), nullable=False),
        sa.Column("seg_hashes", _jsonb(), nullable=False),
        sa.Column("segments", _jsonb(), nullable=False),
        sa.Column("chars", sa.Integer(), nullable=False),
        sa.Column("est_seconds", sa.Float(), nullable=False),
        sa.Column("file", sa.Text(), nullable=True),
        sa.Column("bytes", sa.Integer(), nullable=True),
        sa.Column("seconds", sa.Float(), nullable=True),
        sa.Column("segment_seconds", _jsonb(), nullable=True),
        _ts("made_at", nullable=True),
        sa.PrimaryKeyConstraint("unit_id", "idx", name=op.f("pk_listen_parts")),
        _fk("listen_parts", "unit_id", "listen_units"),
        _fk("listen_parts", "tenant_id", "tenants"),
    )
    op.create_index("ix_listen_parts_key", "listen_parts", ["tenant_id", "part_key"])

    # -- listen_jobs ---------------------------------------------------------
    op.create_table(
        "listen_jobs",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("unit_id", sa.UUID(), nullable=False),
        sa.Column("part_idx", sa.Integer(), nullable=False),
        sa.Column("part_key", sa.Text(), nullable=False),
        sa.Column("priority", sa.BigInteger(), nullable=False),
        sa.Column("state", sa.Text(), nullable=False),
        _ts("lease_until", nullable=True),
        sa.Column("leased_by", sa.UUID(), nullable=True),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("file", sa.Text(), nullable=True),
        sa.Column("bytes", sa.Integer(), nullable=True),
        sa.Column("seconds", sa.Float(), nullable=True),
        _ts("created_at"),
        _ts("updated_at"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_listen_jobs")),
        _fk("listen_jobs", "tenant_id", "tenants"),
        _fk("listen_jobs", "unit_id", "listen_units"),
    )
    op.create_index(
        "uq_listen_jobs_live_key",
        "listen_jobs",
        ["tenant_id", "part_key"],
        unique=True,
        postgresql_where=_LIVE,
    )
    op.create_index(
        "ix_listen_jobs_claim",
        "listen_jobs",
        ["tenant_id", "priority", "created_at"],
        postgresql_where=_LIVE,
    )
    op.create_index("ix_listen_jobs_unit", "listen_jobs", ["unit_id"])

    # -- listen_runners ------------------------------------------------------
    op.create_table(
        "listen_runners",
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("credential_id", sa.UUID(), nullable=False),
        _ts("last_seen"),
        sa.PrimaryKeyConstraint("tenant_id", "credential_id", name=op.f("pk_listen_runners")),
        _fk("listen_runners", "tenant_id", "tenants"),
        _fk("listen_runners", "credential_id", "project_credentials"),
    )

    # -- listen_positions ----------------------------------------------------
    op.create_table(
        "listen_positions",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("kind", sa.Text(), nullable=False),
        sa.Column("project", sa.Text(), nullable=False),
        sa.Column("item", sa.Text(), nullable=False),
        sa.Column("from_chapter", sa.Text(), nullable=False),
        sa.Column("lang", sa.Text(), nullable=False),
        sa.Column("chapter", sa.Text(), nullable=True),
        sa.Column("seconds", sa.Float(), nullable=False),
        sa.Column("speed", sa.Float(), nullable=False),
        sa.Column("follow", sa.Boolean(), nullable=False),
        sa.Column("kept", sa.Boolean(), nullable=False),
        _ts("updated_at"),
        sa.PrimaryKeyConstraint(
            "user_id", "tenant_id", "kind", "project", "item", "from_chapter",
            name=op.f("pk_listen_positions"),
        ),
        _fk("listen_positions", "user_id", "users"),
        _fk("listen_positions", "tenant_id", "tenants"),
    )
    op.create_index(
        "ix_listen_positions_user_updated",
        "listen_positions",
        ["user_id", sa.text("updated_at DESC")],
    )


def downgrade() -> None:
    """Drop the five tables, dependents first (their indexes go with them)."""

    op.drop_table("listen_positions")
    op.drop_table("listen_runners")
    op.drop_table("listen_jobs")
    op.drop_table("listen_parts")
    op.drop_table("listen_units")
