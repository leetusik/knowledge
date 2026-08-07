"""tenant slug: the durable public identity behind pretty share URLs

Revision ID: 0005_tenant_slug
Revises: 0004_project_visibility
Create Date: 2026-08-07 00:00:00

Adds ``tenants.slug`` (``Text NULL UNIQUE``) — a tenant's human, durable public
name, the ``{org}`` segment of a pretty share URL. The accounts plane is the right
home for it: a shared link has to survive a full content reindex, and the content
plane's ``documents.id`` explicitly does not.

Pure additive, with **no backfill** and no derived default: every existing tenant
keeps ``NULL`` and therefore keeps exactly today's URLs, and the operator claims a
slug afterwards through ``PATCH /app/tenant``. Postgres treats NULLs as distinct
under a unique constraint, so any number of slug-less tenants coexist.

There is no DB ``CHECK`` on the value — charset, length and the reserved-word list
are validated at the app layer (``server.accounts.slugs``), matching the
``projects.visibility`` (0004) and ``usage_events.event_type`` precedent.

Downgrade drops the constraint and the column (fix-forward repo).
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0005_tenant_slug"
down_revision: str | None = "0004_project_visibility"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    """Add the nullable, unique ``tenants.slug`` column (no backfill)."""

    op.add_column("tenants", sa.Column("slug", sa.Text(), nullable=True))
    op.create_unique_constraint(op.f("uq_tenants_slug"), "tenants", ["slug"])


def downgrade() -> None:
    """Drop ``tenants.slug`` and its unique constraint."""

    op.drop_constraint(op.f("uq_tenants_slug"), "tenants", type_="unique")
    op.drop_column("tenants", "slug")
