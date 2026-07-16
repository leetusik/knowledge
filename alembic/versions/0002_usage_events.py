"""usage events table (per-tenant usage metering)

Revision ID: 0002_usage_events
Revises: 0001_accounts_tenancy
Create Date: 2026-07-16 00:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0002_usage_events"
down_revision: str | None = "0001_accounts_tenancy"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    """Create the ``usage_events`` table and its two composite indexes."""

    op.create_table(
        "usage_events",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("project_id", sa.UUID(), nullable=True),
        sa.Column("event_type", sa.Text(), nullable=False),
        sa.Column(
            "occurred_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_usage_events")),
        sa.ForeignKeyConstraint(
            ["tenant_id"],
            ["tenants.id"],
            name=op.f("fk_usage_events_tenant_id_tenants"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            name=op.f("fk_usage_events_project_id_projects"),
            ondelete="SET NULL",
        ),
    )
    op.create_index(
        "ix_usage_events_tenant_id_occurred_at",
        "usage_events",
        ["tenant_id", "occurred_at"],
        unique=False,
    )
    op.create_index(
        "ix_usage_events_project_id_occurred_at",
        "usage_events",
        ["project_id", "occurred_at"],
        unique=False,
    )


def downgrade() -> None:
    """Drop the ``usage_events`` indexes then the table (mirror-image)."""

    op.drop_index(
        "ix_usage_events_project_id_occurred_at",
        table_name="usage_events",
    )
    op.drop_index(
        "ix_usage_events_tenant_id_occurred_at",
        table_name="usage_events",
    )
    op.drop_table("usage_events")
