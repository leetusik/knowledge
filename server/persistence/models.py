"""ORM models for the Postgres control plane.

Ported from vocky's accounts/tenancy tables (the first six here) plus the P11
``usage_events`` table (the 7th), the seven P30.S8 reader-state tables (JSONB for
a reader's anchors, quotes, snapshots and quiz responses), and the five P41-sr.B1
Listen tables (units, parts, jobs, runners and listening positions).
"""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from server.persistence.base import Base


def utc_now() -> datetime:
    """Return the current UTC timestamp."""

    return datetime.now(UTC)


class UserModel(Base):
    """Registered account user (email + argon2id password hash)."""

    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        server_default=text("CURRENT_TIMESTAMP"),
    )


class TenantModel(Base):
    """Tenant (workspace). Ownership lives in ``tenant_members``, not here.

    ``slug`` is the tenant's durable **public** identity (the ``{org}`` of a pretty
    share URL). Nullable with no backfill: a tenant without one simply has no pretty
    URL yet and keeps today's links working. ``UNIQUE`` (Postgres allows many NULLs,
    so slug-less tenants never collide). Charset/reserved-word validation is
    app-layer in ``server.accounts.slugs`` — no DB ``CHECK``, matching the
    ``projects.visibility`` / ``usage_events.event_type`` convention.

    ``plan`` is the org's plan (``'free'`` by default, 0008); its allowed values are
    ``server.accounts.types.TENANT_PLANS``, validated app-side, and no API route
    writes it.
    """

    __tablename__ = "tenants"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str | None] = mapped_column(Text, nullable=True, unique=True)
    plan: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="free",
        server_default=text("'free'"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        server_default=text("CURRENT_TIMESTAMP"),
    )


class TenantMemberModel(Base):
    """Membership linking a user to a tenant with a role."""

    __tablename__ = "tenant_members"
    __table_args__ = (
        UniqueConstraint("tenant_id", "user_id"),
        Index("ix_tenant_members_tenant_id", "tenant_id"),
        Index("ix_tenant_members_user_id", "user_id"),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        server_default=text("CURRENT_TIMESTAMP"),
    )


class ProjectModel(Base):
    """Project owned by a tenant. Project names are unique per tenant."""

    __tablename__ = "projects"
    __table_args__ = (
        UniqueConstraint("tenant_id", "name"),
        Index("ix_projects_tenant_id", "tenant_id"),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    visibility: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="private",
        server_default=text("'private'"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        server_default=text("CURRENT_TIMESTAMP"),
    )


class ProjectCredentialModel(Base):
    """An API credential scoped to a tenant. Only the sha256 ``token_hash`` is stored.

    ``tenant_id`` is always populated (the resolver authorizes at org scope from it).
    ``project_id`` is nullable: an **org-level** credential carries ``project_id NULL``
    (the key grants the whole tenant/org), while a **project-bound** credential keeps
    ``project_id`` set for attribution. The org-level (NULL) rows are introduced by the
    org-mint path; every row this repo writes today is project-bound.

    ``scope`` (0008) is ``'full'`` (every key surface, the default and every key minted
    before 0008) or ``'capture'`` (only the Feedback capture surfaces); allowed values
    are ``server.accounts.types.CREDENTIAL_SCOPES``, validated app-side.
    """

    __tablename__ = "project_credentials"
    __table_args__ = (
        Index("ix_project_credentials_project_id", "project_id"),
        Index("ix_project_credentials_tenant_id", "tenant_id"),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    project_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=True,
    )
    name: Mapped[str | None] = mapped_column(Text, nullable=True)
    token_prefix: Mapped[str] = mapped_column(Text, nullable=False)
    token_hash: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    scope: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="full",
        server_default=text("'full'"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        server_default=text("CURRENT_TIMESTAMP"),
    )
    last_used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


class AuthTokenModel(Base):
    """Opaque DB-backed session token for a user. Only the sha256 hash is stored."""

    __tablename__ = "auth_tokens"
    __table_args__ = (Index("ix_auth_tokens_user_id", "user_id"),)

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    token_hash: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        server_default=text("CURRENT_TIMESTAMP"),
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    last_used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


class UsageEventModel(Base):
    """One metered content-plane event (observability; P11).

    Event-log grain: one durable row per metered event, aggregated on read.
    ``project_id`` is nullable + ``SET NULL`` so master-bearer / unmapped-project
    usage degrades to tenant-level and deleting a project keeps its usage history.
    ``event_type`` is free text (not a DB enum/CHECK) so new event types need no
    migration — integrity comes from the shared constants in ``server.usage.types``.
    The two composite indexes back the windowed GROUP-BY-day aggregate.
    """

    __tablename__ = "usage_events"
    __table_args__ = (
        Index("ix_usage_events_tenant_id_occurred_at", "tenant_id", "occurred_at"),
        Index("ix_usage_events_project_id_occurred_at", "project_id", "occurred_at"),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    project_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
    )
    event_type: Mapped[str] = mapped_column(Text, nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        server_default=text("CURRENT_TIMESTAMP"),
    )


# -- reader state (P30.S8; P29.S3 *Tables*) -----------------------------------
#
# Seven tables for each signed-in reader's private state, created by
# ``alembic/versions/0006_reader_state.py``. Every row is keyed by ``user_id``
# (FK ``users`` ON DELETE CASCADE) plus the content owner ``(tenant_id, project)``
# and, for the per-document tables, the document stem ``doc`` (``<date>-<slug>``,
# the rel_path's file name without its extension) and the cross-language ``unit``
# (``c:<book>/<key>`` for a chapter, ``d:<doc>`` for a loose document). There is no
# FK to ``projects`` (a document's project need not have a registry row) and none
# to the SQLite content plane, so a document delete purges these rows in the delete
# handlers (``server.reader_state.purge_document``). User-created rows carry a
# client-generated UUID ``id`` so a retried create is idempotent. Value checks
# (states, statuses, ranges) are app-layer, the repo's convention; the one DB CHECK
# is P29's "a quote or a note" on annotations. ``(tenant_id, project, doc)`` indexes
# back the cross-user purge and the unit re-write.


def _uuid_fk(target: str) -> Mapped[UUID]:
    return mapped_column(
        PG_UUID(as_uuid=True), ForeignKey(target, ondelete="CASCADE"), nullable=False
    )


def _ts(nullable: bool = False) -> Mapped[datetime]:
    if nullable:
        return mapped_column(DateTime(timezone=True), nullable=True)
    return mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        server_default=text("CURRENT_TIMESTAMP"),
    )


class ReaderPositionModel(Base):
    """One resume position + chapter progress per ``(user, tenant, project, doc)``.

    Last write wins on the position, ``max_fraction`` only grows and ``finished``
    only sets — except the explicit Mark-as-unread reset (P29 *Resume and progress*).
    """

    __tablename__ = "reader_positions"
    __table_args__ = (
        Index("ix_reader_positions_user_updated", "user_id", text("updated_at DESC")),
        Index("ix_reader_positions_user_unit", "user_id", "tenant_id", "project", "unit"),
        Index("ix_reader_positions_doc", "tenant_id", "project", "doc"),
    )

    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    tenant_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        primary_key=True,
    )
    project: Mapped[str] = mapped_column(Text, primary_key=True)
    doc: Mapped[str] = mapped_column(Text, primary_key=True)
    unit: Mapped[str] = mapped_column(Text, nullable=False)
    lang: Mapped[str] = mapped_column(Text, nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    format: Mapped[str] = mapped_column(Text, nullable=False)
    anchor_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    fraction: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    max_fraction: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    state: Mapped[str] = mapped_column(Text, nullable=False, default="started")
    finished_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    started_at: Mapped[datetime] = _ts()
    finished_at: Mapped[datetime | None] = _ts(nullable=True)
    updated_at: Mapped[datetime] = _ts()


class ReaderBookmarkModel(Base):
    """An explicit bookmark: ``anchor`` is ``{block_id}`` or ``{anchor?, fraction}``."""

    __tablename__ = "reader_bookmarks"
    __table_args__ = (
        Index("ix_reader_bookmarks_user_unit", "user_id", "tenant_id", "project", "unit"),
        Index("ix_reader_bookmarks_doc", "tenant_id", "project", "doc"),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[UUID] = _uuid_fk("users.id")
    tenant_id: Mapped[UUID] = _uuid_fk("tenants.id")
    project: Mapped[str] = mapped_column(Text, nullable=False)
    doc: Mapped[str] = mapped_column(Text, nullable=False)
    unit: Mapped[str] = mapped_column(Text, nullable=False)
    lang: Mapped[str] = mapped_column(Text, nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    anchor: Mapped[dict] = mapped_column(JSONB, nullable=False)
    label: Mapped[str | None] = mapped_column(Text, nullable=True)
    snippet: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = _ts()
    updated_at: Mapped[datetime] = _ts()


class ReaderAnnotationModel(Base):
    """A highlight (``quote``, optionally a ``note``) or a block note (``note`` only).

    ``anchor_status`` / ``anchored_version`` are the fields S9's server-side
    re-anchoring writes back; S8 stores the anchor as given (``anchored``, the
    version it was made on).
    """

    __tablename__ = "reader_annotations"
    __table_args__ = (
        CheckConstraint("quote IS NOT NULL OR note IS NOT NULL", name="quote_or_note"),
        Index("ix_reader_annotations_user_unit", "user_id", "tenant_id", "project", "unit"),
        Index("ix_reader_annotations_doc", "tenant_id", "project", "doc"),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[UUID] = _uuid_fk("users.id")
    tenant_id: Mapped[UUID] = _uuid_fk("tenants.id")
    project: Mapped[str] = mapped_column(Text, nullable=False)
    doc: Mapped[str] = mapped_column(Text, nullable=False)
    unit: Mapped[str] = mapped_column(Text, nullable=False)
    lang: Mapped[str] = mapped_column(Text, nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    block_id: Mapped[str] = mapped_column(Text, nullable=False)
    quote: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    snapshot: Mapped[dict] = mapped_column(JSONB, nullable=False)
    anchor_status: Mapped[str] = mapped_column(Text, nullable=False, default="anchored")
    anchored_version: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = _ts()
    updated_at: Mapped[datetime] = _ts()


class QuizAttemptModel(Base):
    """One saved quiz attempt (append-only; the server numbers ``attempt``)."""

    __tablename__ = "quiz_attempts"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "tenant_id", "project", "unit", "item_id", "attempt",
            name="uq_quiz_attempts_user_item_attempt",
        ),
        Index("ix_quiz_attempts_doc", "tenant_id", "project", "doc"),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[UUID] = _uuid_fk("users.id")
    tenant_id: Mapped[UUID] = _uuid_fk("tenants.id")
    project: Mapped[str] = mapped_column(Text, nullable=False)
    doc: Mapped[str] = mapped_column(Text, nullable=False)
    unit: Mapped[str] = mapped_column(Text, nullable=False)
    lang: Mapped[str] = mapped_column(Text, nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    block_id: Mapped[str] = mapped_column(Text, nullable=False)
    item_id: Mapped[str] = mapped_column(Text, nullable=False)
    item_type: Mapped[str] = mapped_column(Text, nullable=False)
    response: Mapped[dict] = mapped_column(JSONB, nullable=False)
    correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    attempt: Mapped[int] = mapped_column(Integer, nullable=False)
    answered_at: Mapped[datetime] = _ts()
    created_at: Mapped[datetime] = _ts()


class ReviewCardModel(Base):
    """A review card (FSRS state) from a quiz item or a highlight. Written by S10."""

    __tablename__ = "review_cards"
    __table_args__ = (
        Index(
            "uq_review_cards_quiz_item",
            "user_id", "tenant_id", "project", "unit", "item_id",
            unique=True,
            postgresql_where=text("source = 'quiz'"),
        ),
        Index("ix_review_cards_user_status_due", "user_id", "status", "due"),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[UUID] = _uuid_fk("users.id")
    tenant_id: Mapped[UUID] = _uuid_fk("tenants.id")
    project: Mapped[str] = mapped_column(Text, nullable=False)
    unit: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(Text, nullable=False)
    item_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    annotation_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("reader_annotations.id", ondelete="CASCADE"),
        nullable=True,
        unique=True,
    )
    item_type: Mapped[str] = mapped_column(Text, nullable=False)
    lang: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="active")
    due: Mapped[datetime] = _ts()
    stability: Mapped[float | None] = mapped_column(Float, nullable=True)
    difficulty: Mapped[float | None] = mapped_column(Float, nullable=True)
    fsrs_state: Mapped[int] = mapped_column(Integer, nullable=False)
    step: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reps: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    lapses: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_review: Mapped[datetime | None] = _ts(nullable=True)
    created_at: Mapped[datetime] = _ts()
    updated_at: Mapped[datetime] = _ts()


class ReviewLogModel(Base):
    """One review of a card (append-only; ``id`` is the client's ``review_id``)."""

    __tablename__ = "review_logs"
    __table_args__ = (Index("ix_review_logs_card_id", "card_id"),)

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    card_id: Mapped[UUID] = _uuid_fk("review_cards.id")
    user_id: Mapped[UUID] = _uuid_fk("users.id")
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    response: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    reviewed_at: Mapped[datetime] = _ts()
    state_before: Mapped[int] = mapped_column(Integer, nullable=False)
    scheduled_days: Mapped[int] = mapped_column(Integer, nullable=False)
    elapsed_days: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)


class ReaderProfileModel(Base):
    """A reader's review settings (one row per user; absent = the defaults)."""

    __tablename__ = "reader_profiles"

    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    time_zone: Mapped[str | None] = mapped_column(Text, nullable=True)
    day_starts_at_hour: Mapped[int] = mapped_column(
        Integer, nullable=False, default=4, server_default=text("4")
    )
    max_reviews_per_day: Mapped[int] = mapped_column(
        Integer, nullable=False, default=200, server_default=text("200")
    )
    new_highlights_per_day: Mapped[int] = mapped_column(
        Integer, nullable=False, default=20, server_default=text("20")
    )
    updated_at: Mapped[datetime] = _ts()


# -- Listen (P41-sr.B1): the voice reader's audio, its job queue and positions ------
#
# Five tables, created by ``alembic/versions/0007_listen.py``. A **unit** is one
# document version in one language, voice and engine profile; its **parts** are the
# manifest (segments grouped by section, at most ~10 min each), keyed by a hash of
# their spoken text, so an unchanged part is shared across versions and documents.
# A **job** asks the runner to make one part key; at most one job per key is live
# (queued or leased) per tenant, enforced by a partial unique index. The made audio
# lives on disk under the content root's ``.audio/`` (``server/listen.py``), never in
# Postgres. ``listen_positions`` sits beside ``reader_positions``: one row per user
# and Listen. Every row cascades from ``tenants`` (and positions from ``users``);
# value checks are app-layer, the repo's convention.


class ListenUnitModel(Base):
    """One document version's audio in one language, voice and profile."""

    __tablename__ = "listen_units"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id", "project", "doc", "version", "lang", "voice", "profile",
            name="uq_listen_units_identity",
        ),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id: Mapped[UUID] = _uuid_fk("tenants.id")
    project: Mapped[str] = mapped_column(Text, nullable=False)
    doc: Mapped[str] = mapped_column(Text, nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    lang: Mapped[str] = mapped_column(Text, nullable=False)
    voice: Mapped[str] = mapped_column(Text, nullable=False)
    profile: Mapped[str] = mapped_column(Text, nullable=False)
    state: Mapped[str] = mapped_column(Text, nullable=False, default="making")
    part_count: Mapped[int] = mapped_column(Integer, nullable=False)
    parts_made: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    made_seconds: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    total_seconds: Mapped[float] = mapped_column(Float, nullable=False)
    chars: Mapped[int] = mapped_column(Integer, nullable=False)
    failure: Mapped[str | None] = mapped_column(Text, nullable=True)
    failure_kind: Mapped[str | None] = mapped_column(Text, nullable=True)
    failure_part: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = _ts()
    updated_at: Mapped[datetime] = _ts()


class ListenPartModel(Base):
    """One part of a unit's manifest; ``file``/``bytes``/``seconds`` once made."""

    __tablename__ = "listen_parts"
    __table_args__ = (Index("ix_listen_parts_key", "tenant_id", "part_key"),)

    unit_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("listen_units.id", ondelete="CASCADE"),
        primary_key=True,
    )
    idx: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[UUID] = _uuid_fk("tenants.id")
    part_key: Mapped[str] = mapped_column(Text, nullable=False)
    seg_first: Mapped[int] = mapped_column(Integer, nullable=False)
    seg_last: Mapped[int] = mapped_column(Integer, nullable=False)
    seg_hashes: Mapped[list] = mapped_column(JSONB, nullable=False)
    segments: Mapped[list] = mapped_column(JSONB, nullable=False)
    chars: Mapped[int] = mapped_column(Integer, nullable=False)
    est_seconds: Mapped[float] = mapped_column(Float, nullable=False)
    file: Mapped[str | None] = mapped_column(Text, nullable=True)
    bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    segment_seconds: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    made_at: Mapped[datetime | None] = _ts(nullable=True)


class ListenJobModel(Base):
    """A request to the runner to make one part key, under a lease."""

    __tablename__ = "listen_jobs"
    __table_args__ = (
        Index(
            "uq_listen_jobs_live_key",
            "tenant_id", "part_key",
            unique=True,
            postgresql_where=text("state IN ('queued', 'leased')"),
        ),
        Index(
            "ix_listen_jobs_claim",
            "tenant_id", "priority", "created_at",
            postgresql_where=text("state IN ('queued', 'leased')"),
        ),
        Index("ix_listen_jobs_unit", "unit_id"),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id: Mapped[UUID] = _uuid_fk("tenants.id")
    unit_id: Mapped[UUID] = _uuid_fk("listen_units.id")
    part_idx: Mapped[int] = mapped_column(Integer, nullable=False)
    part_key: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[int] = mapped_column(BigInteger, nullable=False)
    state: Mapped[str] = mapped_column(Text, nullable=False, default="queued")
    lease_until: Mapped[datetime | None] = _ts(nullable=True)
    leased_by: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    file: Mapped[str | None] = mapped_column(Text, nullable=True)
    bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = _ts()
    updated_at: Mapped[datetime] = _ts()


class ListenRunnerModel(Base):
    """When a runner credential last called the runner API."""

    __tablename__ = "listen_runners"

    tenant_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        primary_key=True,
    )
    credential_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("project_credentials.id", ondelete="CASCADE"),
        primary_key=True,
    )
    last_seen: Mapped[datetime] = _ts()


class ListenPositionModel(Base):
    """One listening position per user and Listen, with the listener's preferences.

    The key is ``(user, tenant, kind, project, item, from_chapter)``: ``kind`` is
    ``doc`` or ``book``, ``item`` the document stem or the book slug, and
    ``from_chapter`` the chapter a book Listen started from (``''`` for a document).
    ``speed`` and ``follow`` ride on every row; the newest row is the preference.
    """

    __tablename__ = "listen_positions"
    __table_args__ = (
        Index("ix_listen_positions_user_updated", "user_id", text("updated_at DESC")),
    )

    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    tenant_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        primary_key=True,
    )
    kind: Mapped[str] = mapped_column(Text, primary_key=True)
    project: Mapped[str] = mapped_column(Text, primary_key=True)
    item: Mapped[str] = mapped_column(Text, primary_key=True)
    from_chapter: Mapped[str] = mapped_column(Text, primary_key=True)
    lang: Mapped[str] = mapped_column(Text, nullable=False)
    chapter: Mapped[str | None] = mapped_column(Text, nullable=True)
    seconds: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    speed: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    follow: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    kept: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    updated_at: Mapped[datetime] = _ts()
