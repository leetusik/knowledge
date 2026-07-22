"""project visibility: per-project public/private flag

Revision ID: 0004_project_visibility
Revises: 0003_org_level_credentials
Create Date: 2026-07-22 00:00:00

Adds ``projects.visibility`` (``Text NOT NULL DEFAULT 'private'``) so a project can
be marked public (its docs + graph become anonymously readable) or kept private
(the default). The column is added in a single step: the ``'private'`` default is a
constant, so no two-phase backfill (as in 0003) is needed — every existing row
picks up the server default. There is no DB CHECK constraint on the value: the
codebase validates visibility at the app layer (the toggle endpoint accepts only
``"private"``/``"public"``), matching the ``usage_events.event_type`` convention.

Downgrade drops the column (fix-forward repo).
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0004_project_visibility"
down_revision: str | None = "0003_org_level_credentials"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    """Add ``projects.visibility`` defaulting every row to ``'private'``."""

    op.add_column(
        "projects",
        sa.Column(
            "visibility",
            sa.Text(),
            nullable=False,
            server_default=sa.text("'private'"),
        ),
    )


def downgrade() -> None:
    """Drop ``projects.visibility``."""

    op.drop_column("projects", "visibility")
