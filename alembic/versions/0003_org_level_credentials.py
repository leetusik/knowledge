"""org-level credentials: unique project names + tenant-scoped credentials

Revision ID: 0003_org_level_credentials
Revises: 0002_usage_events
Create Date: 2026-07-22 00:00:00

Three coupled changes make org-level API keys and get-or-create projects possible:

1. ``projects`` gains ``UNIQUE(tenant_id, name)`` so a project name is unique per
   tenant (get-or-create keys off it). Because there was no unique before, prod may
   already hold duplicate ``(tenant_id, name)`` rows — the upgrade **de-dupes
   defensively first** (keep the oldest matching row, re-point its credentials and
   usage events, delete the rest), then adds the constraint. The de-dupe is a no-op
   on a clean database.
2. ``project_credentials`` gains a ``tenant_id`` column (FK ``tenants``, backfilled
   from each row's bound project's tenant, then ``NOT NULL``) so the resolver can
   authorize a key at org scope without a project.
3. ``project_credentials.project_id`` becomes **nullable** — org-level credential
   rows carry ``project_id NULL`` (the FK CASCADE stays, so a project-bound key
   still dies with its project). No existing row changes meaning.

Downgrade is destructive by design (fix-forward repo): the de-dupe cannot be
un-merged, and restoring ``project_id NOT NULL`` deletes any org-level rows.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0003_org_level_credentials"
down_revision: str | None = "0002_usage_events"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


# (dead_id -> survivor_id) for every non-oldest duplicate ``(tenant_id, name)``
# project. Oldest-wins by ``(created_at, id)`` — the exact order the accounts
# repository's ``get_project_by_name`` uses, so the survivor is the row every
# existing lookup already resolves to. Empty on a clean database.
_DUPES = """
    SELECT id AS dead_id, survivor_id
    FROM (
        SELECT
            id,
            first_value(id) OVER (
                PARTITION BY tenant_id, name
                ORDER BY created_at, id
            ) AS survivor_id
        FROM projects
    ) ranked
    WHERE id <> survivor_id
"""


def upgrade() -> None:
    """De-dupe project names, add the unique + tenant-scoped credential columns."""

    # 1. De-dupe pre-existing duplicate (tenant_id, name) projects before the
    #    unique constraint can be added. Re-point child rows to the survivor, then
    #    delete the dead duplicates. All no-ops when there are no duplicates.
    op.execute(
        f"""
        UPDATE project_credentials pc
        SET project_id = d.survivor_id
        FROM ({_DUPES}) d
        WHERE pc.project_id = d.dead_id
        """
    )
    op.execute(
        f"""
        UPDATE usage_events ue
        SET project_id = d.survivor_id
        FROM ({_DUPES}) d
        WHERE ue.project_id = d.dead_id
        """
    )
    op.execute(
        f"""
        DELETE FROM projects p
        USING ({_DUPES}) d
        WHERE p.id = d.dead_id
        """
    )

    # 2. Unique project names per tenant (backs get-or-create).
    op.create_unique_constraint(
        op.f("uq_projects_tenant_id"),
        "projects",
        ["tenant_id", "name"],
    )

    # 3. project_credentials.tenant_id: add nullable, backfill from the bound
    #    project's tenant (every row still has a project_id at this point), then
    #    make it NOT NULL, add the FK, and index it.
    op.add_column(
        "project_credentials",
        sa.Column("tenant_id", sa.UUID(), nullable=True),
    )
    op.execute(
        """
        UPDATE project_credentials pc
        SET tenant_id = p.tenant_id
        FROM projects p
        WHERE pc.project_id = p.id
        """
    )
    op.alter_column(
        "project_credentials",
        "tenant_id",
        existing_type=sa.UUID(),
        nullable=False,
    )
    op.create_foreign_key(
        op.f("fk_project_credentials_tenant_id_tenants"),
        "project_credentials",
        "tenants",
        ["tenant_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index(
        "ix_project_credentials_tenant_id",
        "project_credentials",
        ["tenant_id"],
        unique=False,
    )

    # 4. project_credentials.project_id -> nullable (org-level rows carry NULL).
    #    The existing CASCADE FK is unchanged; a bound key still dies with its
    #    project, a NULL org-level row is unaffected.
    op.alter_column(
        "project_credentials",
        "project_id",
        existing_type=sa.UUID(),
        nullable=True,
    )


def downgrade() -> None:
    """Reverse the columns/constraint. Destructive: org-level rows are dropped.

    The upgrade's project de-dupe cannot be reversed (the merged duplicate rows are
    gone), and org-level credentials (``project_id IS NULL``) cannot survive the
    restored NOT NULL, so they are deleted here.
    """

    # 4'. Restore project_id NOT NULL — org-level rows cannot survive it.
    op.execute("DELETE FROM project_credentials WHERE project_id IS NULL")
    op.alter_column(
        "project_credentials",
        "project_id",
        existing_type=sa.UUID(),
        nullable=False,
    )

    # 3'. Drop the tenant_id index, FK, and column.
    op.drop_index(
        "ix_project_credentials_tenant_id",
        table_name="project_credentials",
    )
    op.drop_constraint(
        op.f("fk_project_credentials_tenant_id_tenants"),
        "project_credentials",
        type_="foreignkey",
    )
    op.drop_column("project_credentials", "tenant_id")

    # 2'. Drop the unique constraint (the de-dupe stays — it is irreversible).
    op.drop_constraint(
        op.f("uq_projects_tenant_id"),
        "projects",
        type_="unique",
    )
