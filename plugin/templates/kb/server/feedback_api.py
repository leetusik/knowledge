"""Feedback HTTP surfaces (ported from vocky's Starlette routes, paths unchanged).

Three families, each with its own gate:

- **Capture** (``POST /api/feedback`` 202, ``POST /api/feedback/attachments`` 201):
  ``resolve_api_capture``, so a ``capture``-scoped key reaches these two and nothing
  else. Capture persists **in the request** (no queue, no worker): when the 202 goes
  out the row is committed, and a failed insert is a 5xx the caller sees. The owner
  alert is a FastAPI background task that runs after the response, best-effort
  (``server.feedback.notify``). Both routes sit behind an in-process limiter, per
  ``KB_FEEDBACK_RATE_WINDOW_S``, checked before the body is read: captures get
  ``KB_FEEDBACK_RATE_LIMIT``, uploads their own ``KB_FEEDBACK_UPLOAD_RATE_LIMIT``,
  counted apart. Through the edge the bucket is the client address; from inside the
  network (the Feedback MCP hop) it is the caller's org (``_capture_caller``), so
  minting keys buys no budget. A capture body larger than
  ``KB_FEEDBACK_MAX_BODY_BYTES`` is a 413 before it is parsed. A ``capture``
  org-level key captures only into an existing project or ``"default"``; it never
  creates one (``resolve_capture_project``). Each upload first reclaims unlinked
  attachments older than ``KB_FEEDBACK_ATTACHMENTS_UNLINKED_TTL_S`` (rows and files,
  batch after batch within a small budget), then is refused with a 503 if it would
  take the total size of unlinked attachments above
  ``KB_FEEDBACK_ATTACHMENTS_UNLINKED_MAX_BYTES``.
- **Key reads and management** (``GET /api/feedback``, its attachment download, and
  ``/api/project/feedback*`` + ``/api/project/usage``): ``resolve_api_read`` for
  reads, ``resolve_api_write`` for ``PATCH``/``DELETE``/comment ``POST``; both answer
  a ``capture`` key 403.
- **Session reads** (``/app/feedback*``): ``require_user`` (honours ``X-Hi2vi-Org``).

Scope: every key and session route resolves its project set in one place,
:func:`_scope_project_ids` — a project-bound key's one project, else every project
of the caller's tenant (an org-level key, a session's active org, the master
bearer). An empty set answers an empty result without a query; a per-event route
loads the event through that set and answers **404** for anything outside it, so
another org's existence never leaks. No Feedback route is public.

Vocky's status codes and JSON shapes are kept, ``{"detail": ...}`` errors and 400s
(not FastAPI's 422s) included: requests are parsed by hand. With no
``DATABASE_URL`` (the scaffold's legacy mode) every route here answers 404 before
any auth, like the Listen routes: Feedback needs the accounts plane.
"""

from __future__ import annotations

import base64
import binascii
import contextlib
import json
import logging
import time
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import quote
from uuid import UUID, uuid4

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field, ValidationError
from starlette.datastructures import UploadFile
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.formparsers import MultiPartException

from server import config
from server.accounts.auth import AuthContext, extract_bearer_token, require_user
from server.accounts.security import sha256_hex
from server.accounts.service import (
    DEFAULT_PROJECT_NAME,
    AccountsPersistenceError,
    AccountsReadError,
    get_accounts_service,
)
from server.api_auth import (
    ApiAuthContext,
    resolve_api_capture,
    resolve_api_read,
    resolve_api_write,
)
from server.app_api import serialize_credential
from server.feedback.notify import notify_feedback_captured
from server.feedback.service import (
    FeedbackCapacityError,
    FeedbackPersistenceError,
    FeedbackReadError,
    get_feedback_service,
)
from server.feedback.storage import (
    AttachmentStorage,
    StorageError,
    StorageObjectNotFoundError,
    get_attachment_storage,
)
from server.feedback.types import (
    CreateFeedbackAttachment,
    CreateFeedbackComment,
    CreateFeedbackEvent,
    FeedbackAttachmentRecord,
    FeedbackCommentRecord,
    FeedbackEventRecord,
    FeedbackListCursor,
    FeedbackMetricCounts,
    FeedbackMetrics,
    FeedbackMetricsQuery,
    FeedbackQueryFilters,
    ListFeedbackQuery,
)
from server.usage.metering import stamp_credential_used

logger = logging.getLogger(__name__)

router = APIRouter()


# --- vocabularies and validation (vocky's channel, trigger, recorded_by) ---------

ALLOWED_CHANNELS = ("web", "mobile", "support")
ALLOWED_TRIGGER_TYPES = ("like", "dislike", "comment", "rating", "survey", "manual", "other")
ALLOWED_RECORDED_BY = ("agent", "human")
ALLOWED_TARGET_TYPES = ("message", "conversation", "surface")
ALLOWED_TARGET_ROLES = ("user", "assistant", "system", "tool")

DEFAULT_LIST_LIMIT = 50
MAX_LIST_LIMIT = 100
#: A capture-supplied project name is a get-or-create key; vocky's bound.
MAX_CAPTURE_PROJECT_NAME_LENGTH = 200
#: ``/api/project/usage``'s window when the caller names none.
DEFAULT_USAGE_WINDOW = timedelta(days=30)
#: The widest window ``/api/project/usage`` answers: the response holds one entry per
#: day, so the span is bounded before any per-day list is built.
MAX_USAGE_WINDOW = timedelta(days=366)


class FeedbackValidationError(ValueError):
    """A request vocky answers 400 (its capture and query validation errors)."""


def _one_of(value: str | None, allowed: tuple[str, ...], field_name: str) -> str | None:
    """Trim, collapse blank to None, and reject a value outside ``allowed``."""

    if value is None:
        return None
    normalized = value.strip()
    if not normalized:
        return None
    if normalized not in allowed:
        raise FeedbackValidationError(f"{field_name} must be one of: {', '.join(allowed)}")
    return normalized


def normalize_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    trimmed = value.strip()
    return trimmed or None


def _require_non_blank(value: str, field_name: str) -> str:
    trimmed = value.strip()
    if not trimmed:
        raise FeedbackValidationError(f"{field_name} must not be blank")
    return trimmed


def _parse_timestamp(value: str | None, *, field_name: str) -> datetime | None:
    """An optional ISO 8601 timestamp with an offset, normalized to UTC."""

    if value is None:
        return None
    normalized = value.strip()
    if not normalized:
        raise FeedbackValidationError(f"{field_name} must not be blank when provided")
    try:
        parsed = datetime.fromisoformat(normalized.replace("Z", "+00:00"))
    except ValueError as exc:
        raise FeedbackValidationError(
            f"{field_name} must be a valid ISO 8601 timestamp"
        ) from exc
    if parsed.tzinfo is None or parsed.tzinfo.utcoffset(parsed) is None:
        raise FeedbackValidationError(f"{field_name} must include a timezone offset")
    try:
        return parsed.astimezone(UTC)
    except OverflowError as exc:  # an offset that pushes it past year 1 or 9999
        raise FeedbackValidationError(f"{field_name} is out of range") from exc


def _normalize_feedback_value(value: int | None) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool) or value not in (1, 2):
        raise FeedbackValidationError("feedback_value must be 1 for like or 2 for dislike")
    return value


def _normalize_tags(tags: list[str] | None) -> tuple[str, ...]:
    if tags is None:
        return ()
    normalized: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        cleaned = tag.strip()
        if not cleaned:
            raise FeedbackValidationError("tags must not contain blank values")
        if cleaned in seen:
            raise FeedbackValidationError("tags must not contain duplicates")
        seen.add(cleaned)
        normalized.append(cleaned)
    return tuple(normalized)


def _normalize_json_object(value: Any, *, field_name: str) -> dict[str, Any]:
    if value is None:
        return {}
    if not isinstance(value, dict):
        raise FeedbackValidationError(f"{field_name} must be a JSON object")
    return dict(value)


def _normalize_attachment_ids(values: list[str] | None) -> tuple[UUID, ...]:
    """Parse, dedupe and bound the referenced attachment ids (re-guarded at link)."""

    if not values:
        return ()
    seen: set[UUID] = set()
    normalized: list[UUID] = []
    for raw_value in values:
        try:
            parsed = UUID(str(raw_value).strip())
        except ValueError as exc:
            raise FeedbackValidationError("attachment_ids must be valid UUIDs") from exc
        if parsed in seen:
            continue
        seen.add(parsed)
        normalized.append(parsed)
    max_count = config.feedback_attachments_max_count()
    if len(normalized) > max_count:
        raise FeedbackValidationError(f"attachment_ids must not exceed {max_count} items")
    return tuple(normalized)


# --- capture request and receipt models (vocky's ``capture.py``) ------------------


class CaptureFeedbackSourceInput(BaseModel):
    product: str
    integration: str | None = None


class RestCaptureFeedbackInput(BaseModel):
    """The ``POST /api/feedback`` body. Unknown fields are ignored (pydantic default).

    ``project`` names the destination for a caller with no project binding (an
    org-level key, a session, the master bearer): get-or-created in the caller's own
    tenant, ``"default"`` when absent. A project-bound key ignores it.
    """

    message: str
    source: CaptureFeedbackSourceInput
    feedback_value: int | None = None
    comment: str | None = None
    channel: str | None = None
    recorded_by: str | None = None
    conversation_id: str | None = None
    session_id: str | None = None
    user_id: str | None = None
    trigger_type: str | None = None
    trigger_message: str | None = None
    trigger_metadata: Any = Field(default_factory=dict)
    target_type: str | None = None
    target_id: str | None = None
    target_role: str | None = None
    target_text: str | None = None
    event_at: str | None = None
    tags: list[str] | None = None
    messages: list[Any] | None = None
    used_context: list[Any] | None = None
    source_metadata: dict[str, Any] = Field(default_factory=dict)
    attributes: dict[str, Any] = Field(default_factory=dict)
    attachment_ids: list[str] | None = None
    project: str | None = None


class CaptureFeedbackResponse(BaseModel):
    """The 202 receipt. ``request_id`` is the stored event's id (vocky's was a
    UUID too, minted by its queue); ``accepted_at`` is its ``ingested_at``."""

    request_id: str
    accepted_at: str
    status: str = "accepted"


class FeedbackPatchInput(BaseModel):
    """``PATCH /api/project/feedback/{id}`` (vocky's ``AdminFeedbackPatchInput``)."""

    feedback_value: int | None = None
    comment: str | None = None
    channel: str | None = None
    tags: list[str] | None = None
    source_metadata: dict[str, object] | None = None
    attributes: dict[str, object] | None = None


class FeedbackCommentInput(BaseModel):
    """``POST /api/project/feedback/{id}/comments`` (vocky's ``AdminFeedbackCommentInput``)."""

    author: str | None = None
    body: str


def _format_pydantic_error(exc: ValidationError) -> str:
    first_error = exc.errors()[0]
    location = ".".join(str(part) for part in first_error.get("loc", ()))
    message = str(first_error.get("msg", "invalid value"))
    return f"{location}: {message}" if location else message


def normalize_rest_payload(raw: RestCaptureFeedbackInput) -> CreateFeedbackEvent:
    """Validate and normalize a REST capture body into the service's input.

    ``recorded_by`` stays as sent (``None`` when absent): REST callers are mixed. The
    MCP tool defaults it to ``"agent"`` before it calls this route.
    """

    return CreateFeedbackEvent(
        message=_require_non_blank(raw.message, "message"),
        source_product=_require_non_blank(raw.source.product, "source.product"),
        feedback_value=_normalize_feedback_value(raw.feedback_value),
        comment=normalize_optional_text(raw.comment),
        channel=_one_of(raw.channel, ALLOWED_CHANNELS, "channel"),
        source_integration=normalize_optional_text(raw.source.integration),
        recorded_by=_one_of(raw.recorded_by, ALLOWED_RECORDED_BY, "recorded_by"),
        conversation_id=normalize_optional_text(raw.conversation_id),
        session_id=normalize_optional_text(raw.session_id),
        user_id=normalize_optional_text(raw.user_id),
        trigger_type=_one_of(raw.trigger_type, ALLOWED_TRIGGER_TYPES, "trigger_type"),
        trigger_message=normalize_optional_text(raw.trigger_message),
        trigger_metadata=_normalize_json_object(
            raw.trigger_metadata, field_name="trigger_metadata"
        ),
        target_type=_one_of(raw.target_type, ALLOWED_TARGET_TYPES, "target_type"),
        target_id=normalize_optional_text(raw.target_id),
        target_role=_one_of(raw.target_role, ALLOWED_TARGET_ROLES, "target_role"),
        target_text=normalize_optional_text(raw.target_text),
        event_at=_parse_timestamp(raw.event_at, field_name="event_at"),
        tags=_normalize_tags(raw.tags),
        messages=tuple(raw.messages or ()),
        used_context=tuple(raw.used_context or ()),
        source_metadata=dict(raw.source_metadata),
        attributes=dict(raw.attributes),
        attachment_ids=_normalize_attachment_ids(raw.attachment_ids),
    )


#: The 400 a ``capture`` org-level key gets for a project name its org does not have.
CAPTURE_KEY_UNKNOWN_PROJECT = (
    "project does not exist in this org, and a capture-only key cannot create one"
)


async def resolve_capture_project(ctx: ApiAuthContext, project_name: str | None) -> UUID:
    """The project a capture lands in, always one of the caller's own tenant.

    A project-bound key lands in its project and ``project_name`` is ignored. A
    ``capture``-scope org-level key lands only in a project that already exists in
    its org, or in ``"default"`` (absent or named, get-or-created); any other name is
    a 400 (``CAPTURE_KEY_UNKNOWN_PROJECT``): a write-only key placed on a machine the
    operator does not control must never grow the org's project list, which no route
    can shrink. A ``full`` key, a session and the master bearer get-or-create the
    named project (else ``"default"``) in ``ctx.tenant_id``. Never ``None``.
    """

    if ctx.project_id is not None:
        return ctx.project_id
    if ctx.tenant_id is None:  # never reached: legacy mode 404s first
        raise FeedbackValidationError("no tenant to capture into")
    name = normalize_optional_text(project_name) or DEFAULT_PROJECT_NAME
    if len(name) > MAX_CAPTURE_PROJECT_NAME_LENGTH:
        raise FeedbackValidationError(
            f"project must not exceed {MAX_CAPTURE_PROJECT_NAME_LENGTH} characters"
        )
    accounts = get_accounts_service()
    if ctx.scope != "full" and name != DEFAULT_PROJECT_NAME:
        existing = await accounts.get_project_by_name(ctx.tenant_id, name)
        if existing is None:
            raise FeedbackValidationError(CAPTURE_KEY_UNKNOWN_PROJECT)
        return existing.id
    project = await accounts.get_or_create_project(ctx.tenant_id, name)
    return project.id


# --- serializers (vocky's ``query_feedback_common``) ------------------------------


def serialize_datetime(value: datetime) -> str:
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def serialize_record(record: FeedbackEventRecord) -> dict[str, object]:
    return {
        "id": str(record.id),
        "message": record.message,
        "source_product": record.source_product,
        "feedback_value": record.feedback_value,
        "comment": record.comment,
        "channel": record.channel,
        "source_integration": record.source_integration,
        "recorded_by": record.recorded_by,
        "conversation_id": record.conversation_id,
        "session_id": record.session_id,
        "user_id": record.user_id,
        "trigger_type": record.trigger_type,
        "trigger_message": record.trigger_message,
        "trigger_metadata": dict(record.trigger_metadata),
        "target_type": record.target_type,
        "target_id": record.target_id,
        "target_role": record.target_role,
        "target_text": record.target_text,
        "event_at": serialize_datetime(record.event_at) if record.event_at else None,
        "ingested_at": serialize_datetime(record.ingested_at),
        "tags": list(record.tags),
        "messages": list(record.messages),
        "used_context": list(record.used_context),
        "source_metadata": dict(record.source_metadata),
        "attributes": dict(record.attributes),
    }


def serialize_comment(comment: FeedbackCommentRecord) -> dict[str, object]:
    return {
        "id": str(comment.id),
        "author": comment.author,
        "body": comment.body,
        "created_at": serialize_datetime(comment.created_at),
    }


def serialize_attachment(attachment: FeedbackAttachmentRecord, *, url: str) -> dict[str, object]:
    return {
        "id": str(attachment.id),
        "content_type": attachment.content_type,
        "byte_size": attachment.byte_size,
        "filename": attachment.filename,
        "created_at": serialize_datetime(attachment.created_at),
        "url": url,
    }


def _with_project_id(record: FeedbackEventRecord) -> dict[str, object]:
    return {
        **serialize_record(record),
        "project_id": str(record.project_id) if record.project_id is not None else None,
    }


def _serialize_scoped_record(record: FeedbackEventRecord, ctx: ApiAuthContext) -> dict[str, object]:
    """A project-bound key gets vocky's shape verbatim (no ``project_id``); every
    other caller spans many projects, so the record says which one it is in."""

    if ctx.project_id is not None:
        return serialize_record(record)
    return _with_project_id(record)


# --- cursors and list queries -----------------------------------------------------


def encode_cursor(cursor: FeedbackListCursor) -> str:
    payload = {"id": str(cursor.id), "ingested_at": serialize_datetime(cursor.ingested_at)}
    raw = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def decode_cursor(value: str | None) -> FeedbackListCursor | None:
    if value is None:
        return None
    normalized = value.strip()
    if not normalized:
        raise FeedbackValidationError("cursor must not be blank when provided")
    padded = normalized + ("=" * (-len(normalized) % 4))
    invalid = "cursor must be a valid list_feedback cursor"
    try:
        payload = json.loads(base64.urlsafe_b64decode(padded.encode("ascii")))
    except (ValueError, UnicodeDecodeError, binascii.Error) as exc:
        raise FeedbackValidationError(invalid) from exc
    if not isinstance(payload, dict):
        raise FeedbackValidationError(invalid)
    ingested_at_raw = payload.get("ingested_at")
    id_raw = payload.get("id")
    if not isinstance(ingested_at_raw, str) or not isinstance(id_raw, str):
        raise FeedbackValidationError(invalid)
    try:
        cursor_id = UUID(id_raw)
    except ValueError as exc:
        raise FeedbackValidationError(invalid) from exc
    ingested_at = _parse_timestamp(ingested_at_raw, field_name="cursor.ingested_at")
    assert ingested_at is not None
    return FeedbackListCursor(ingested_at=ingested_at, id=cursor_id)


def _parse_int_param(value: str | None, *, field_name: str) -> int | None:
    if value is None:
        return None
    normalized = value.strip()
    if not normalized:
        raise FeedbackValidationError(f"{field_name} must not be blank when provided")
    try:
        return int(normalized)
    except ValueError as exc:
        raise FeedbackValidationError(f"{field_name} must be an integer") from exc


def _normalize_limit(value: int | None) -> int:
    if value is None:
        return DEFAULT_LIST_LIMIT
    if value < 1 or value > MAX_LIST_LIMIT:
        raise FeedbackValidationError(f"limit must be between 1 and {MAX_LIST_LIMIT}")
    return value


def _validate_time_window(start: datetime | None, end: datetime | None) -> None:
    if start is not None and end is not None and start >= end:
        raise FeedbackValidationError("start_ingested_at must be before end_ingested_at")


def _normalize_tag(value: str | None) -> str | None:
    if value is None:
        return None
    trimmed = value.strip()
    if not trimmed:
        raise FeedbackValidationError("tag must not be blank")
    return trimmed


def _require_scope_value(value: str | None, *, field_name: str) -> str:
    """``user_id`` / ``source_product``: required and non-blank on the end-user reads."""

    if value is None:
        raise FeedbackValidationError(f"{field_name} is required")
    trimmed = value.strip()
    if not trimmed:
        raise FeedbackValidationError(f"{field_name} must not be blank")
    return trimmed


def normalize_list_query(request: Request) -> ListFeedbackQuery:
    """Vocky's list filters (``source_product``, ``source_integration``,
    ``recorded_by``, ``conversation_id``, ``session_id``, ``user_id``,
    ``trigger_type``, ``feedback_value``, ``channel``, ``target_type``, ``tag``, the
    ``start/end_ingested_at`` window), ``limit`` (1..100, default 50) and ``cursor``."""

    params = request.query_params
    start = _parse_timestamp(params.get("start_ingested_at"), field_name="start_ingested_at")
    end = _parse_timestamp(params.get("end_ingested_at"), field_name="end_ingested_at")
    _validate_time_window(start, end)
    return ListFeedbackQuery(
        filters=FeedbackQueryFilters(
            start_ingested_at=start,
            end_ingested_at=end,
            source_product=normalize_optional_text(params.get("source_product")),
            source_integration=normalize_optional_text(params.get("source_integration")),
            recorded_by=_one_of(params.get("recorded_by"), ALLOWED_RECORDED_BY, "recorded_by"),
            conversation_id=normalize_optional_text(params.get("conversation_id")),
            session_id=normalize_optional_text(params.get("session_id")),
            user_id=normalize_optional_text(params.get("user_id")),
            trigger_type=_one_of(
                params.get("trigger_type"), ALLOWED_TRIGGER_TYPES, "trigger_type"
            ),
            feedback_value=_normalize_feedback_value(
                _parse_int_param(params.get("feedback_value"), field_name="feedback_value")
            ),
            channel=normalize_optional_text(params.get("channel")),
            target_type=_one_of(params.get("target_type"), ALLOWED_TARGET_TYPES, "target_type"),
            tag=_normalize_tag(params.get("tag")),
        ),
        limit=_normalize_limit(_parse_int_param(params.get("limit"), field_name="limit")),
        cursor=decode_cursor(params.get("cursor")),
    )


def _parse_uuid(request: Request, name: str) -> UUID:
    try:
        return UUID(request.path_params[name])
    except ValueError as exc:
        raise FeedbackValidationError(f"{name} must be a valid UUID") from exc


# --- responses --------------------------------------------------------------------


def _detail(message: str, status_code: int) -> JSONResponse:
    return JSONResponse({"detail": message}, status_code=status_code)


def _not_found() -> JSONResponse:
    return _detail("feedback not found", 404)


def _read_failed() -> JSONResponse:
    return _detail("storage read failed", 500)


def _write_failed() -> JSONResponse:
    return _detail("storage write failed", 500)


def _attachment_content_disposition(filename: str | None) -> str:
    if not filename:
        return "attachment"
    ascii_fallback = (
        filename.encode("ascii", "ignore").decode("ascii").replace('"', "").strip()
        or "download"
    )
    encoded = quote(filename, safe="")
    return f"attachment; filename=\"{ascii_fallback}\"; filename*=UTF-8''{encoded}"


def _stream_attachment(
    attachment: FeedbackAttachmentRecord, *, end_user: bool = False
) -> Response:
    """The attachment's bytes, ``nosniff``; the end-user route also forces a
    download and ``no-store`` (vocky's two header sets)."""

    try:
        data = get_attachment_storage().load(attachment.storage_key)
    except StorageObjectNotFoundError:
        logger.warning("attachment %s has no stored object", attachment.id)
        return _detail("attachment not found", 404)
    except StorageError:
        logger.exception("failed to read attachment object")
        return _detail("attachment storage unavailable", 503)
    headers = {"X-Content-Type-Options": "nosniff"}
    if end_user:
        headers["Content-Disposition"] = _attachment_content_disposition(attachment.filename)
        headers["Cache-Control"] = "private, no-store"
    return Response(content=data, media_type=attachment.content_type, headers=headers)


# --- legacy mode, the capture limiter, and scope ----------------------------------


def _require_accounts_plane() -> None:
    """Feedback needs the accounts plane: with no ``DATABASE_URL`` every route 404s."""

    if config.database_url() is None:
        raise HTTPException(status_code=404, detail="Not Found")


# key ("<bucket>:<path>") -> (window_start_monotonic, count_in_window); its own
# buckets, apart from the /auth/* limiter's. One uvicorn worker, so in-process is
# coherent.
_rate_windows: dict[str, tuple[float, int]] = {}
_RATE_MAX_KEYS = 20_000


def _edge_client_ip(request: Request) -> str | None:
    """The client address the edge recorded, or ``None`` for an in-network caller.

    The edge (``deploy/hi2vi.conf``) **sets** ``X-Real-IP`` to the connecting address
    on every proxied request, overwriting whatever a client sent, and the API has no
    public port. So a request carrying it came through the edge, and one without it
    came from inside the network: the Feedback MCP hop, which calls the API directly
    with only the caller's bearer. ``X-Forwarded-For`` is never read here: a client
    can append to it, so it could pick a bucket.
    """

    real_ip = request.headers.get("X-Real-IP")
    if real_ip and real_ip.strip():
        return real_ip.strip()
    return None


def _org_bucket(ctx: ApiAuthContext, request: Request) -> str:
    """The bucket of an authenticated in-network caller: its org.

    The resolved tenant: a ``vk_`` key's org (project-bound or not), a session's
    active org, tenant #1 for the master bearer. Every key and session of one org
    shares it, so minting more keys buys no more budget, and one org never spends
    another's. Never an address or a header the caller chose (a session's
    ``X-Hi2vi-Org`` names only an org it is a member of). A context without a
    tenant is legacy mode, which 404s before this; it falls back to the bearer.
    """

    if ctx.tenant_id is not None:
        return f"org:{ctx.tenant_id}"
    token = extract_bearer_token(request)  # never reached: legacy mode 404s first
    return f"bearer:{sha256_hex(token)}" if token else "anonymous"


async def _capture_caller(request: Request, *, limit: int) -> ApiAuthContext:
    """Rate-limit and authenticate a capture request, before its body is read.

    Through the edge the bucket is the client address and it is checked **first**,
    so a flood of bad bearers from one address stays cheap (429, then 401 without a
    lookup). An in-network request (no ``X-Real-IP``: the MCP hop) is authenticated
    first, then counted in its org's bucket, so the MCP container's one address
    never makes every org's agents share one limit, and no org's budget grows with
    the keys it holds. Either way an unauthenticated request is a 401 before any
    body is read. ``limit`` is the route's own (captures and uploads differ).
    """

    _require_accounts_plane()
    edge_ip = _edge_client_ip(request)
    if edge_ip is not None:
        _enforce_capture_rate_limit(request, f"ip:{edge_ip}", limit)
        return await resolve_api_capture(request)
    ctx = await resolve_api_capture(request)
    _enforce_capture_rate_limit(request, _org_bucket(ctx, request), limit)
    return ctx


def _enforce_capture_rate_limit(request: Request, bucket: str, limit: int) -> None:
    """Fixed-window limit of ``limit`` per ``bucket`` on a capture route; 429 past it.

    Each route counts in a bucket of its own (the key carries the path), so a
    client's uploads never spend its captures, nor the other way round."""

    if limit <= 0:
        return
    window = float(config.feedback_rate_window_s())
    now = time.monotonic()
    if len(_rate_windows) >= _RATE_MAX_KEYS:
        for key in [k for k, (start, _) in _rate_windows.items() if now - start >= window]:
            del _rate_windows[key]
        if len(_rate_windows) >= _RATE_MAX_KEYS:
            oldest = sorted(_rate_windows, key=lambda k: _rate_windows[k][0])
            for key in oldest[: _RATE_MAX_KEYS // 2]:
                del _rate_windows[key]

    key = f"{bucket}:{request.url.path}"
    start, count = _rate_windows.get(key, (now, 0))
    if now - start >= window:
        start, count = now, 0
    count += 1
    _rate_windows[key] = (start, count)
    if count > limit:
        retry_after = max(1, int(window - (now - start)))
        raise HTTPException(
            status_code=429,
            detail="too many requests — please retry later",
            headers={"Retry-After": str(retry_after)},
        )


@dataclass(slots=True)
class _Caller:
    """A resolved key/bearer caller and its project set."""

    ctx: ApiAuthContext
    project_ids: tuple[UUID, ...]


async def _scope_project_ids(tenant_id: UUID | None, project_id: UUID | None) -> tuple[UUID, ...]:
    """The ONE scope rule: a project-bound key -> its project; anyone else -> every
    project of the tenant. A caller with no tenant is refused (never an unscoped read)."""

    if tenant_id is None:
        raise HTTPException(
            status_code=401,
            detail="missing or invalid bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if project_id is not None:
        return (project_id,)
    projects = await get_accounts_service().list_projects_for_tenant(tenant_id)
    return tuple(project.id for project in projects)


async def _key_caller(request: Request, *, write: bool = False) -> _Caller:
    _require_accounts_plane()
    resolver = resolve_api_write if write else resolve_api_read
    ctx = await resolver(request)
    return _Caller(ctx=ctx, project_ids=await _scope_project_ids(ctx.tenant_id, ctx.project_id))


async def _session_caller(request: Request) -> tuple[AuthContext, tuple[UUID, ...]]:
    _require_accounts_plane()
    ctx = await require_user(request)
    return ctx, await _scope_project_ids(ctx.tenant.id, None)


async def _load_scoped(feedback_id: UUID, project_ids: tuple[UUID, ...]) -> FeedbackEventRecord | None:
    """The event when its project is in ``project_ids``; None when missing or outside."""

    if not project_ids:
        return None
    return await get_feedback_service().get_scoped_feedback_event(feedback_id, project_ids)


# --- capture ----------------------------------------------------------------------


def _body_too_large(max_bytes: int) -> JSONResponse:
    return _detail(f"request body must not exceed {max_bytes} bytes", 413)


async def _read_capped_body(request: Request, max_bytes: int) -> bytes | JSONResponse:
    """The request body, or a 413 once it is known to exceed ``max_bytes``.

    A declared ``Content-Length`` over the cap is refused before a byte is read; a
    body without one (chunked) is counted while it streams and refused as soon as
    it passes the cap, so an oversized body is never buffered whole nor parsed.
    """

    declared_raw = request.headers.get("content-length")
    if declared_raw is not None:
        try:
            declared = int(declared_raw)
        except ValueError:
            return _detail("invalid Content-Length", 400)
        if declared > max_bytes:
            return _body_too_large(max_bytes)
    chunks: list[bytes] = []
    total = 0
    async for chunk in request.stream():
        total += len(chunk)
        if total > max_bytes:
            return _body_too_large(max_bytes)
        chunks.append(chunk)
    return b"".join(chunks)


@router.post("/api/feedback")
async def capture_feedback(request: Request, background_tasks: BackgroundTasks) -> Response:
    """Capture one feedback event; 202 once the row is committed."""

    ctx = await _capture_caller(request, limit=config.feedback_rate_limit())
    body_or_refusal = await _read_capped_body(request, config.feedback_max_body_bytes())
    if isinstance(body_or_refusal, Response):
        return body_or_refusal

    try:
        try:
            raw_body = json.loads(body_or_refusal)
        except ValueError as exc:
            raise FeedbackValidationError("request body must be valid JSON") from exc
        if not isinstance(raw_body, dict):
            raise FeedbackValidationError("request body must be a JSON object")
        try:
            raw = RestCaptureFeedbackInput.model_validate(raw_body)
        except ValidationError as exc:
            raise FeedbackValidationError(_format_pydantic_error(exc)) from exc
        payload = normalize_rest_payload(raw)
        payload.project_id = await resolve_capture_project(ctx, raw.project)
    except FeedbackValidationError as exc:
        return _detail(str(exc), 400)
    except (AccountsPersistenceError, AccountsReadError):
        logger.exception("Failed to resolve the capture's destination project")
        return _detail("project resolution failed", 500)

    try:
        record = await get_feedback_service().create_feedback_event_with_attachments(payload)
    except FeedbackPersistenceError:
        logger.exception("Failed to persist captured feedback event")
        return _detail("storage write failed", 500)

    # After the response, best-effort: the key's last-used stamp, then the alert.
    background_tasks.add_task(stamp_credential_used, ctx.credential_id)
    background_tasks.add_task(notify_feedback_captured, record)
    receipt = CaptureFeedbackResponse(
        request_id=str(record.id), accepted_at=serialize_datetime(record.ingested_at)
    )
    return JSONResponse(receipt.model_dump(mode="json"), status_code=202)


_READ_CHUNK = 64 * 1024
# Multipart framing inflates Content-Length past the image; the authoritative cap
# is on the decoded bytes.
_MULTIPART_OVERHEAD_SLACK = 8192
_SNIFF_BYTES = 32


def sniff_image_content_type(head: bytes) -> str | None:
    """The image type of ``head`` by its magic bytes, never the declared type."""

    if head[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if head[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if head[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    if len(head) >= 12 and head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "image/webp"
    return None


def _clean_filename(filename: str | None) -> str | None:
    if filename is None:
        return None
    cleaned = "".join(ch for ch in filename if ch.isprintable() and ch not in "\r\n").strip()[:255]
    return cleaned or None


#: Unlinked attachments one sweep batch reclaims (one committed delete).
UNLINKED_SWEEP_BATCH = 100
#: One upload's sweep budget: it repeats batches until nothing stale is left, this
#: many rows are reclaimed, or this many seconds are spent, whichever comes first.
#: A backlog drains at hundreds of rows per upload, and no upload waits long.
UNLINKED_SWEEP_MAX_ROWS = 500
UNLINKED_SWEEP_MAX_SECONDS = 1.0


async def _reclaim_unlinked_attachments(storage: AttachmentStorage) -> None:
    """Delete unlinked attachments older than the TTL, rows then files, in batches.

    The opportunistic sweep (no scheduler): an upload nobody linked within
    ``KB_FEEDBACK_ATTACHMENTS_UNLINKED_TTL_S`` is reclaimed by a later upload. Each
    batch's files are removed only for rows its committed delete returned; a file
    already missing is not an error. Batches repeat until one comes back short (no
    stale row left) or the budget (``UNLINKED_SWEEP_MAX_ROWS`` rows,
    ``UNLINKED_SWEEP_MAX_SECONDS``) is spent. The sweep never fails the upload that
    runs it. A capture that later names a reclaimed id is treated like any unknown
    id (stored without it).
    """

    older_than = datetime.now(UTC) - timedelta(
        seconds=config.feedback_attachments_unlinked_ttl_s()
    )
    started = time.monotonic()
    reclaimed = 0
    while reclaimed < UNLINKED_SWEEP_MAX_ROWS:
        limit = min(UNLINKED_SWEEP_BATCH, UNLINKED_SWEEP_MAX_ROWS - reclaimed)
        if limit <= 0:
            break
        try:
            keys = await get_feedback_service().reclaim_unlinked_attachments(
                older_than=older_than, limit=limit
            )
        except FeedbackPersistenceError:
            logger.exception("unlinked attachment sweep failed; the upload goes on")
            break
        for key in keys:
            try:
                storage.delete(key)
            except StorageObjectNotFoundError:
                continue
            except StorageError:
                logger.warning("could not delete a reclaimed attachment's file", exc_info=True)
        reclaimed += len(keys)
        if len(keys) < limit or time.monotonic() - started >= UNLINKED_SWEEP_MAX_SECONDS:
            break
    if reclaimed:
        logger.info("reclaimed %d unlinked attachment(s)", reclaimed)


#: The 503 an upload gets when it would take unlinked attachments above the ceiling.
UPLOADS_PAUSED = "uploads are paused while unlinked files are reclaimed — please retry later"


@router.post("/api/feedback/attachments")
async def upload_attachment(request: Request, background_tasks: BackgroundTasks) -> Response:
    """Store one uploaded image (unlinked) and return its id; 201."""

    ctx = await _capture_caller(request, limit=config.feedback_upload_rate_limit())

    max_bytes = config.feedback_attachments_max_bytes()
    allowed_types = config.feedback_attachments_allowed_mime_types()
    try:
        user_id = _require_scope_value(request.query_params.get("user_id"), field_name="user_id")
        source_product = _require_scope_value(
            request.query_params.get("source_product"), field_name="source_product"
        )
    except FeedbackValidationError as exc:
        return _detail(str(exc), 400)

    content_length = request.headers.get("content-length")
    if content_length is not None:
        try:
            declared = int(content_length)
        except ValueError:
            return _detail("invalid Content-Length", 400)
        if declared > max_bytes + _MULTIPART_OVERHEAD_SLACK:
            return _detail("attachment too large", 413)

    try:
        form = await request.form(max_files=1, max_fields=1)
    except (MultiPartException, StarletteHTTPException):
        return _detail("invalid multipart upload", 400)

    try:
        upload = form.get("file")
        if not isinstance(upload, UploadFile):
            return _detail("file part is required", 400)
        if upload.size is not None and upload.size > max_bytes:
            return _detail("attachment too large", 413)
        chunks: list[bytes] = []
        total = 0
        while True:
            chunk = await upload.read(_READ_CHUNK)
            if not chunk:
                break
            total += len(chunk)
            if total > max_bytes:
                return _detail("attachment too large", 413)
            chunks.append(chunk)
        data = b"".join(chunks)
        filename = _clean_filename(upload.filename)
    finally:
        await form.close()

    if not data:
        return _detail("attachment must not be empty", 400)
    content_type = sniff_image_content_type(data[:_SNIFF_BYTES])
    if content_type is None or content_type not in allowed_types:
        return _detail("unsupported image type", 415)

    storage = get_attachment_storage()
    await _reclaim_unlinked_attachments(storage)
    # The ceiling, after the sweep: checked first so a refused upload writes no
    # file, then again under a lock with the insert so no race can overshoot it.
    ceiling = config.feedback_attachments_unlinked_max_bytes()
    try:
        if await get_feedback_service().unlinked_attachment_bytes() + total > ceiling:
            logger.warning("unlinked attachments are at their ceiling; upload refused")
            return _detail(UPLOADS_PAUSED, 503)
    except FeedbackReadError:
        logger.exception("could not measure unlinked attachments")
        return _detail("attachment storage unavailable", 503)
    storage_key = str(uuid4())
    try:
        storage.save(storage_key, data)
    except StorageError:
        logger.exception("attachment storage write failed")
        return _detail("attachment storage unavailable", 503)

    try:
        record = await get_feedback_service().create_unlinked_attachment(
            CreateFeedbackAttachment(
                storage_key=storage_key,
                content_type=content_type,
                byte_size=total,
                filename=filename,
                claimed_user_id=user_id,
                claimed_source_product=source_product,
            ),
            unlinked_ceiling=ceiling,
        )
    except FeedbackCapacityError:
        with contextlib.suppress(StorageError):
            storage.delete(storage_key)
        logger.warning("unlinked attachments reached their ceiling; upload refused")
        return _detail(UPLOADS_PAUSED, 503)
    except FeedbackPersistenceError:
        with contextlib.suppress(StorageError):
            storage.delete(storage_key)
        logger.exception("attachment row insert failed; deleted orphaned object")
        return _detail("attachment storage unavailable", 503)

    background_tasks.add_task(stamp_credential_used, ctx.credential_id)
    return JSONResponse(
        {
            "attachment_id": str(record.id),
            "content_type": record.content_type,
            "byte_size": record.byte_size,
            "filename": record.filename,
        },
        status_code=201,
    )


# --- the end-user key read ---------------------------------------------------------


def _serialize_user_record(
    record: FeedbackEventRecord,
    comments: tuple[FeedbackCommentRecord, ...],
    attachments: tuple[FeedbackAttachmentRecord, ...],
) -> dict[str, object]:
    return {
        **serialize_record(record),
        "comments": [serialize_comment(comment) for comment in comments],
        "attachments": [
            serialize_attachment(
                attachment, url=f"/api/feedback/{record.id}/attachments/{attachment.id}"
            )
            for attachment in attachments
        ],
    }


@router.get("/api/feedback")
async def list_user_feedback(request: Request) -> Response:
    """One end user's own feedback (required ``user_id`` + ``source_product``) with
    its comments and attachments, inside the key's scope."""

    caller = await _key_caller(request)
    try:
        user_id = _require_scope_value(request.query_params.get("user_id"), field_name="user_id")
        source_product = _require_scope_value(
            request.query_params.get("source_product"), field_name="source_product"
        )
        query = normalize_list_query(request)
        query.filters.user_id = user_id
        query.filters.source_product = source_product
    except FeedbackValidationError as exc:
        return _detail(str(exc), 400)

    if not caller.project_ids:
        return JSONResponse({"records": []})
    query.filters.project_ids = caller.project_ids
    try:
        page, comments_by_id, attachments_by_id = (
            await get_feedback_service().list_feedback_with_comments_and_attachments(query)
        )
    except FeedbackReadError:
        return _read_failed()

    payload: dict[str, object] = {
        "records": [
            _serialize_user_record(
                record, comments_by_id.get(record.id, ()), attachments_by_id.get(record.id, ())
            )
            for record in page.records
        ]
    }
    if page.next_cursor is not None:
        payload["next_cursor"] = encode_cursor(page.next_cursor)
    return JSONResponse(payload)


@router.get("/api/feedback/{feedback_id}/attachments/{attachment_id}")
async def download_user_feedback_attachment(request: Request) -> Response:
    """One of the end user's own attachments; any mismatch is a 404."""

    caller = await _key_caller(request)
    try:
        feedback_id = _parse_uuid(request, "feedback_id")
        attachment_id = _parse_uuid(request, "attachment_id")
        user_id = _require_scope_value(request.query_params.get("user_id"), field_name="user_id")
        source_product = _require_scope_value(
            request.query_params.get("source_product"), field_name="source_product"
        )
    except FeedbackValidationError as exc:
        return _detail(str(exc), 400)

    try:
        # The key's scope first (vocky checked only user + product), then the
        # attachment's own user + product guard.
        if await _load_scoped(feedback_id, caller.project_ids) is None:
            return _detail("attachment not found", 404)
        attachment = await get_feedback_service().get_user_attachment(
            feedback_id=feedback_id,
            attachment_id=attachment_id,
            user_id=user_id,
            source_product=source_product,
        )
    except FeedbackReadError:
        return _read_failed()
    if attachment is None:
        return _detail("attachment not found", 404)
    return _stream_attachment(attachment, end_user=True)


# --- project feedback: review and manage ------------------------------------------


@router.get("/api/project/feedback")
async def list_project_feedback(request: Request) -> Response:
    caller = await _key_caller(request)
    try:
        query = normalize_list_query(request)
    except FeedbackValidationError as exc:
        return _detail(str(exc), 400)
    if not caller.project_ids:
        return JSONResponse({"records": []})
    query.filters.project_ids = caller.project_ids
    try:
        page = await get_feedback_service().list_feedback(query)
    except FeedbackReadError:
        return _read_failed()
    payload: dict[str, object] = {
        "records": [_serialize_scoped_record(record, caller.ctx) for record in page.records]
    }
    if page.next_cursor is not None:
        payload["next_cursor"] = encode_cursor(page.next_cursor)
    return JSONResponse(payload)


@router.get("/api/project/feedback/{feedback_id}/comments")
async def list_project_feedback_comments(request: Request) -> Response:
    caller = await _key_caller(request)
    try:
        feedback_id = _parse_uuid(request, "feedback_id")
    except FeedbackValidationError as exc:
        return _detail(str(exc), 400)
    try:
        if await _load_scoped(feedback_id, caller.project_ids) is None:
            return _not_found()
        comments = await get_feedback_service().list_feedback_comments(feedback_id)
    except FeedbackReadError:
        return _read_failed()
    return JSONResponse({"comments": [serialize_comment(comment) for comment in comments]})


@router.post("/api/project/feedback/{feedback_id}/comments")
async def post_project_feedback_comment(request: Request) -> Response:
    caller = await _key_caller(request, write=True)
    try:
        feedback_id = _parse_uuid(request, "feedback_id")
    except FeedbackValidationError as exc:
        return _detail(str(exc), 400)
    try:
        payload = FeedbackCommentInput.model_validate(await request.json())
    except (ValueError, ValidationError):
        return _detail("request body must be a valid JSON object", 400)
    body = payload.body.strip()
    if not body:
        return _detail("body must not be blank", 400)
    author = normalize_optional_text(payload.author)

    try:
        if await _load_scoped(feedback_id, caller.project_ids) is None:
            return _not_found()
    except FeedbackReadError:
        return _read_failed()
    try:
        comment = await get_feedback_service().create_feedback_comment(
            CreateFeedbackComment(feedback_id=feedback_id, body=body, author=author)
        )
    except FeedbackPersistenceError:
        return _write_failed()
    return JSONResponse({"comment": serialize_comment(comment)}, status_code=201)


@router.get("/api/project/feedback/{feedback_id}/attachments/{attachment_id}")
async def download_project_feedback_attachment(request: Request) -> Response:
    caller = await _key_caller(request)
    try:
        feedback_id = _parse_uuid(request, "feedback_id")
        attachment_id = _parse_uuid(request, "attachment_id")
    except FeedbackValidationError as exc:
        return _detail(str(exc), 400)
    try:
        if await _load_scoped(feedback_id, caller.project_ids) is None:
            return _not_found()
        attachment = await get_feedback_service().get_scoped_attachment(
            feedback_id=feedback_id, attachment_id=attachment_id, project_ids=caller.project_ids
        )
    except FeedbackReadError:
        return _read_failed()
    if attachment is None:
        return _detail("attachment not found", 404)
    return _stream_attachment(attachment)


@router.get("/api/project/feedback/{feedback_id}")
async def get_project_feedback(request: Request) -> Response:
    caller = await _key_caller(request)
    try:
        feedback_id = _parse_uuid(request, "feedback_id")
    except FeedbackValidationError as exc:
        return _detail(str(exc), 400)
    try:
        detail = (
            await get_feedback_service().get_scoped_feedback_detail(feedback_id, caller.project_ids)
            if caller.project_ids
            else None
        )
    except FeedbackReadError:
        return _read_failed()
    if detail is None:
        return _not_found()
    record, comments, attachments = detail
    payload = _serialize_scoped_record(record, caller.ctx)
    payload["comments"] = [serialize_comment(comment) for comment in comments]
    payload["attachments"] = [
        serialize_attachment(
            attachment, url=f"/api/project/feedback/{feedback_id}/attachments/{attachment.id}"
        )
        for attachment in attachments
    ]
    return JSONResponse({"record": payload})


@router.patch("/api/project/feedback/{feedback_id}")
async def patch_project_feedback(request: Request) -> Response:
    caller = await _key_caller(request, write=True)
    try:
        feedback_id = _parse_uuid(request, "feedback_id")
    except FeedbackValidationError as exc:
        return _detail(str(exc), 400)
    try:
        patch = FeedbackPatchInput.model_validate(await request.json())
    except (ValueError, ValidationError):
        return _detail("request body must be a valid JSON object", 400)

    updates: dict[str, object] = {}
    fields = patch.model_fields_set
    try:
        if "feedback_value" in fields:
            updates["feedback_value"] = _normalize_feedback_value(patch.feedback_value)
        if "comment" in fields:
            updates["comment"] = normalize_optional_text(patch.comment)
        if "channel" in fields:
            updates["channel"] = _one_of(patch.channel, ALLOWED_CHANNELS, "channel")
        if "tags" in fields:
            updates["tags"] = list(_normalize_tags(patch.tags))
        if "source_metadata" in fields:
            updates["source_metadata"] = patch.source_metadata or {}
        if "attributes" in fields:
            updates["attributes"] = patch.attributes or {}
    except FeedbackValidationError as exc:
        return _detail(str(exc), 400)
    if not updates:
        return _detail("request body must include at least one editable field", 400)

    try:
        if await _load_scoped(feedback_id, caller.project_ids) is None:
            return _not_found()
    except FeedbackReadError:
        return _read_failed()
    try:
        record = await get_feedback_service().update_feedback_event(feedback_id, updates)
    except FeedbackPersistenceError:
        return _write_failed()
    if record is None:
        return _not_found()
    return JSONResponse({"record": _serialize_scoped_record(record, caller.ctx)})


@router.delete("/api/project/feedback/{feedback_id}")
async def delete_project_feedback(request: Request) -> Response:
    """Delete the row first, then its attachment files, best-effort; 204."""

    caller = await _key_caller(request, write=True)
    try:
        feedback_id = _parse_uuid(request, "feedback_id")
    except FeedbackValidationError as exc:
        return _detail(str(exc), 400)
    try:
        if await _load_scoped(feedback_id, caller.project_ids) is None:
            return _not_found()
    except FeedbackReadError:
        return _read_failed()
    try:
        deleted, storage_keys = await get_feedback_service().delete_feedback_event(feedback_id)
    except FeedbackPersistenceError:
        return _write_failed()
    if not deleted:
        return _not_found()

    storage = get_attachment_storage()
    for storage_key in storage_keys:
        try:
            storage.delete(storage_key)
        except StorageError:
            logger.warning(
                "failed to delete attachment object %s for feedback %s", storage_key, feedback_id
            )
    return Response(status_code=204)


# --- usage --------------------------------------------------------------------------


def _serialize_metrics(metrics: FeedbackMetrics, start: datetime, end: datetime) -> dict[str, object]:
    totals = metrics.totals
    return {
        "window": {
            "start_ingested_at": serialize_datetime(start),
            "end_ingested_at": serialize_datetime(end),
        },
        "totals": {
            "total": totals.total,
            "liked": totals.liked,
            "disliked": totals.disliked,
            "unrated": totals.unrated,
        },
        "daily_counts": [
            {
                "day": day.day.isoformat(),
                "total": day.total,
                "liked": day.liked,
                "disliked": day.disliked,
                "unrated": day.unrated,
            }
            for day in metrics.daily_counts
        ],
    }


@router.get("/api/project/usage")
async def get_api_project_usage(request: Request) -> Response:
    """The scope's capture volume over a window (default the last 30 days) plus its
    credentials; a caller with no project binding also sees the org-level keys."""

    caller = await _key_caller(request)
    try:
        start = _parse_timestamp(
            request.query_params.get("start_ingested_at"), field_name="start_ingested_at"
        )
        end = _parse_timestamp(
            request.query_params.get("end_ingested_at"), field_name="end_ingested_at"
        )
        if end is None:
            end = datetime.now(UTC)
        if start is None:
            try:
                start = end - DEFAULT_USAGE_WINDOW
            except OverflowError as exc:
                raise FeedbackValidationError("end_ingested_at is out of range") from exc
        _validate_time_window(start, end)
        if end - start > MAX_USAGE_WINDOW:
            raise FeedbackValidationError(
                f"the window must not exceed {MAX_USAGE_WINDOW.days} days"
            )
    except FeedbackValidationError as exc:
        return _detail(str(exc), 400)

    if not caller.project_ids:
        metrics = FeedbackMetrics(
            totals=FeedbackMetricCounts(total=0, liked=0, disliked=0, unrated=0),
            daily_counts=(),
        )
    else:
        try:
            metrics = await get_feedback_service().get_feedback_metrics(
                FeedbackMetricsQuery(
                    filters=FeedbackQueryFilters(
                        start_ingested_at=start,
                        end_ingested_at=end,
                        project_ids=caller.project_ids,
                    )
                )
            )
        except FeedbackReadError:
            return _read_failed()
    payload = _serialize_metrics(metrics, start, end)

    accounts = get_accounts_service()
    credentials = []
    for project_id in caller.project_ids:
        credentials.extend(await accounts.list_project_credentials(project_id))
    if caller.ctx.project_id is None and caller.ctx.tenant_id is not None:
        credentials.extend(await accounts.list_org_credentials(caller.ctx.tenant_id))
    credentials.sort(key=lambda record: (record.created_at, record.id))
    payload["credentials"] = [serialize_credential(record) for record in credentials]
    return JSONResponse(payload)


# --- session reads (/app/feedback*) -------------------------------------------------


@router.get("/app/feedback")
async def list_app_feedback(request: Request) -> Response:
    """List and search (``q``: a case-insensitive substring) the active org's
    feedback, newest first; ``project_id`` narrows to one of its projects."""

    _ctx, owned = await _session_caller(request)
    try:
        query = normalize_list_query(request)
        query.filters.search = normalize_optional_text(request.query_params.get("q"))
    except FeedbackValidationError as exc:
        return _detail(str(exc), 400)

    scope = owned
    raw = request.query_params.get("project_id")
    if raw is not None:
        try:
            narrow = UUID(raw.strip())
        except ValueError:
            return _detail("project_id must be a valid UUID", 400)
        if narrow not in owned:
            return _detail("project not found", 404)
        scope = (narrow,)
    if not scope:
        return JSONResponse({"records": []})
    query.filters.project_ids = scope
    try:
        page = await get_feedback_service().list_feedback(query)
    except FeedbackReadError:
        return _read_failed()
    payload: dict[str, object] = {"records": [_with_project_id(record) for record in page.records]}
    if page.next_cursor is not None:
        payload["next_cursor"] = encode_cursor(page.next_cursor)
    return JSONResponse(payload)


@router.get("/app/feedback/{feedback_id}/attachments/{attachment_id}")
async def download_app_feedback_attachment(request: Request) -> Response:
    _ctx, owned = await _session_caller(request)
    try:
        feedback_id = _parse_uuid(request, "feedback_id")
        attachment_id = _parse_uuid(request, "attachment_id")
    except FeedbackValidationError as exc:
        return _detail(str(exc), 400)
    try:
        if await _load_scoped(feedback_id, owned) is None:
            return _not_found()
        attachment = await get_feedback_service().get_scoped_attachment(
            feedback_id=feedback_id, attachment_id=attachment_id, project_ids=owned
        )
    except FeedbackReadError:
        return _read_failed()
    if attachment is None:
        return _detail("attachment not found", 404)
    return _stream_attachment(attachment)


@router.get("/app/feedback/{feedback_id}")
async def get_app_feedback(request: Request) -> Response:
    _ctx, owned = await _session_caller(request)
    try:
        feedback_id = _parse_uuid(request, "feedback_id")
    except FeedbackValidationError as exc:
        return _detail(str(exc), 400)
    try:
        detail = (
            await get_feedback_service().get_scoped_feedback_detail(feedback_id, owned)
            if owned
            else None
        )
    except FeedbackReadError:
        return _read_failed()
    if detail is None:
        return _not_found()
    record, comments, attachments = detail
    payload = _with_project_id(record)
    payload["comments"] = [serialize_comment(comment) for comment in comments]
    payload["attachments"] = [
        serialize_attachment(
            attachment, url=f"/app/feedback/{feedback_id}/attachments/{attachment.id}"
        )
        for attachment in attachments
    ]
    return JSONResponse({"record": payload})
