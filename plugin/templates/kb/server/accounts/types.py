"""Transport-neutral accounts, tenancy, and credential data types.

No ORM objects cross this boundary. Records carry metadata only; raw session
tokens and project keys are never returned, and credential records expose only
the short ``token_prefix`` (never ``token_hash``).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass(slots=True, kw_only=True)
class CreateUser:
    """Input for creating a user. ``password_hash`` is pre-computed by the caller."""

    email: str
    password_hash: str


@dataclass(slots=True, kw_only=True)
class UserRecord:
    """Stored user. Carries ``password_hash`` so login can verify it."""

    id: UUID
    email: str
    password_hash: str
    created_at: datetime


@dataclass(slots=True, kw_only=True)
class TenantRecord:
    """Stored tenant."""

    id: UUID
    name: str
    created_at: datetime


@dataclass(slots=True, kw_only=True)
class TenantMemberRecord:
    """Stored tenant membership."""

    id: UUID
    tenant_id: UUID
    user_id: UUID
    role: str
    created_at: datetime


@dataclass(slots=True, kw_only=True)
class CreateProject:
    """Input for creating a project under a tenant.

    ``visibility`` defaults to ``"private"`` so every existing creation path keeps
    making private projects; only an explicit caller opts a new row into ``"public"``.
    """

    tenant_id: UUID
    name: str
    visibility: str = "private"


@dataclass(slots=True, kw_only=True)
class ProjectRecord:
    """Stored project. ``visibility`` is ``"private"`` or ``"public"``."""

    id: UUID
    tenant_id: UUID
    name: str
    visibility: str
    created_at: datetime


@dataclass(slots=True, kw_only=True)
class CreateProjectCredential:
    """Input for storing a credential.

    ``tenant_id`` is always set (the credential is authorized at org scope from it).
    ``project_id`` binds the credential to a project for attribution; an org-level
    credential (introduced by the org-mint path) leaves it ``None``. The caller
    computes ``token_prefix`` (short display prefix) and ``token_hash`` (sha256 hex
    of the plaintext key); the raw key is never stored.
    """

    tenant_id: UUID
    token_prefix: str
    token_hash: str
    project_id: UUID | None = None
    name: str | None = None


@dataclass(slots=True, kw_only=True)
class ProjectCredentialRecord:
    """Stored credential metadata. Never exposes ``token_hash``.

    ``project_id`` is ``None`` for an org-level credential (project-bound rows keep
    it set for attribution).
    """

    id: UUID
    tenant_id: UUID
    project_id: UUID | None
    name: str | None
    token_prefix: str
    created_at: datetime
    last_used_at: datetime | None
    revoked_at: datetime | None


@dataclass(slots=True, kw_only=True)
class CreateAuthToken:
    """Input for storing a session token.

    ``token_hash`` is the sha256 hex of the opaque bearer token; the raw token is
    never stored. ``expires_at`` NULL means no expiry (policy set by the caller).
    """

    user_id: UUID
    token_hash: str
    expires_at: datetime | None = None


@dataclass(slots=True, kw_only=True)
class AuthTokenRecord:
    """Stored session token metadata. Never exposes ``token_hash``."""

    id: UUID
    user_id: UUID
    created_at: datetime
    expires_at: datetime | None
    last_used_at: datetime | None
