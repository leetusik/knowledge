"""org plan and key scope: tenants.plan, project_credentials.scope

Revision ID: 0008_org_plan_and_key_scope
Revises: 0007_listen
Create Date: 2026-11-13 00:00:00

Two additive value columns, both ``TEXT NOT NULL`` with a constant server default,
so every existing row takes the default at once and no data step is needed:

* ``tenants.plan`` (default ``'free'``) — an org's plan. Read through
  ``/app/tenant``; nothing over the API writes it.
* ``project_credentials.scope`` (default ``'full'``) — what a key reaches: ``full``
  (everything a key did before, so every existing key keeps working) or ``capture``
  (only the Feedback capture surfaces).

There is no DB ``CHECK`` on either value: the allowed sets live app-side in
``server.accounts.types`` (``TENANT_PLANS``, ``CREDENTIAL_SCOPES``), matching the
``projects.visibility`` (0004) precedent.

Downgrade drops both columns (fix-forward repo).
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0008_org_plan_and_key_scope"
down_revision: str | None = "0007_listen"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    """Add ``tenants.plan`` and ``project_credentials.scope`` with constant defaults."""

    op.add_column(
        "tenants",
        sa.Column("plan", sa.Text(), nullable=False, server_default=sa.text("'free'")),
    )
    op.add_column(
        "project_credentials",
        sa.Column("scope", sa.Text(), nullable=False, server_default=sa.text("'full'")),
    )


def downgrade() -> None:
    """Drop ``project_credentials.scope`` and ``tenants.plan``."""

    op.drop_column("project_credentials", "scope")
    op.drop_column("tenants", "plan")
