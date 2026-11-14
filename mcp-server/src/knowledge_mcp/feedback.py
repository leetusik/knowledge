"""The write-only Feedback MCP endpoint: one ``capture_feedback`` tool at ``/feedback/mcp``.

Ported from vocky's ``capture_feedback`` (name, parameters, description and result
shape kept) as a thin proxy to ``POST /api/feedback`` with the caller's bearer
forwarded verbatim, the same proxy-and-forward pattern as the Library's tools. The
API is the authority: this module validates nothing beyond the tool schema and
relays the API's 400 ``detail``. The one thing it adds is vocky's MCP default,
``recorded_by = "agent"`` when the caller gives none (REST leaves it null).

Every outcome is a tool result, never an exception: a 202 becomes vocky's
``Accepted feedback capture <id>`` result with the receipt as structured content;
any upstream status of 400 or more, or a transport failure, becomes an ``isError``
result. ``server.py`` builds the endpoint's ``FastMCP`` and calls :func:`register`.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx
from mcp.server.fastmcp import Context, FastMCP
from mcp.types import CallToolResult, TextContent
from pydantic import BaseModel

from . import config, upstream

logger = logging.getLogger(__name__)

# The endpoint's path on the shared app (the edge passes it through unchanged).
FEEDBACK_MCP_PATH = "/feedback/mcp"

INSTRUCTIONS = "Capture user feedback from agent interactions through the MCP capture tool."


class CaptureFeedbackSourceInput(BaseModel):
    """Raw nested source input."""

    product: str
    integration: str | None = None


def error_result(message: str) -> CallToolResult:
    """A tool execution error result."""

    return CallToolResult(content=[TextContent(type="text", text=message)], isError=True)


def _error_for(exc: upstream.UpstreamError) -> CallToolResult:
    if exc.status == 400:
        return error_result(exc.detail or "capture rejected: bad request")
    if exc.status == 401:
        # The same wording as the Library's tools (server._tool_error).
        return error_result("unauthorized: missing/invalid bearer")
    if exc.status == 403:
        return error_result("forbidden: this key may not capture feedback")
    if exc.status == 429:
        return error_result("rate limited: too many captures, retry later")
    return error_result(f"capture failed: upstream returned HTTP {exc.status}")


def _body(fields: dict[str, Any]) -> dict[str, Any]:
    """The JSON body: the given fields only, ``recorded_by`` defaulted to ``agent``."""

    body: dict[str, Any] = {}
    for key, value in fields.items():
        if value is None:
            continue
        if isinstance(value, BaseModel):
            value = value.model_dump(exclude_none=True)
        body[key] = value
    recorded_by = body.get("recorded_by")
    if not isinstance(recorded_by, str) or not recorded_by.strip():
        body["recorded_by"] = "agent"
    return body


async def run_capture_feedback(
    *,
    fields: dict[str, Any],
    authorization: str | None,
    transport: Any | None = None,
) -> CallToolResult:
    """Core capture: build the body, proxy ``POST /api/feedback``, map the outcome.

    Kept apart from the tool wrapper so it is unit-testable with an
    ``httpx.MockTransport`` upstream and an explicit ``authorization`` value.
    """

    try:
        receipt = await upstream.capture_feedback(
            base_url=config.api_base_url(),
            authorization=authorization,
            body=_body(fields),
            timeout=config.UPSTREAM_TIMEOUT,
            transport=transport,
        )
    except upstream.UpstreamError as exc:
        return _error_for(exc)
    except httpx.HTTPError as exc:
        logger.warning("feedback capture upstream unreachable: %s", type(exc).__name__)
        return error_result(f"capture failed: upstream unreachable ({type(exc).__name__})")

    request_id = receipt.get("request_id")
    structured = {
        "request_id": request_id,
        "accepted_at": receipt.get("accepted_at"),
        "status": receipt.get("status", "accepted"),
    }
    return CallToolResult(
        content=[TextContent(type="text", text=f"Accepted feedback capture {request_id}")],
        structuredContent=structured,
        isError=False,
    )


def _inbound_authorization(ctx: Context | None) -> str | None:
    """The caller's inbound ``Authorization`` header, or ``None`` (then a 401)."""

    if ctx is None:
        return None
    try:
        request = ctx.request_context.request
    except (ValueError, AttributeError):
        return None
    if request is None:
        return None
    return request.headers.get("authorization")


async def capture_feedback(
    message: str,
    source: CaptureFeedbackSourceInput,
    feedback_value: int | None = None,
    comment: str | None = None,
    channel: str | None = None,
    recorded_by: str | None = None,
    project: str | None = None,
    conversation_id: str | None = None,
    session_id: str | None = None,
    user_id: str | None = None,
    trigger_type: str | None = None,
    trigger_message: str | None = None,
    trigger_metadata: dict[str, Any] | None = None,
    target_type: str | None = None,
    target_id: str | None = None,
    target_role: str | None = None,
    target_text: str | None = None,
    event_at: str | None = None,
    tags: list[str] | None = None,
    messages: list[Any] | None = None,
    used_context: list[Any] | None = None,
    source_metadata: dict[str, Any] | None = None,
    attributes: dict[str, Any] | None = None,
    ctx: Context | None = None,
) -> CallToolResult:
    """Capture a single feedback event for later review.

    The event is scoped to the API key sent as the transport's
    ``Authorization: Bearer`` header: the call is authorized by the API, which
    accepts a ``capture`` key (write-only) or a ``full`` key, and stamps the key's
    destination project onto the event.

    ``project`` names the destination project and is honored **only** for an
    org-level key, defaulting to ``"default"``. A full-access key get-or-creates it
    under its org; a capture-only key may name only a project that already exists in
    its org (or ``"default"``), and any other name is refused with the API's
    message. A project-bound key always lands in its bound project and ignores the
    argument entirely.

    ``recorded_by`` marks who recorded the event (``"agent"`` | ``"human"``). It
    defaults to ``"agent"`` on this transport — MCP is the agent-runtime surface —
    so an agent that never learns the argument still produces correctly marked
    data; pass ``"human"`` explicitly when relaying a human-recorded event.
    """

    fields = {
        "message": message,
        "source": source,
        "feedback_value": feedback_value,
        "comment": comment,
        "channel": channel,
        "recorded_by": recorded_by,
        "project": project,
        "conversation_id": conversation_id,
        "session_id": session_id,
        "user_id": user_id,
        "trigger_type": trigger_type,
        "trigger_message": trigger_message,
        "trigger_metadata": trigger_metadata,
        "target_type": target_type,
        "target_id": target_id,
        "target_role": target_role,
        "target_text": target_text,
        "event_at": event_at,
        "tags": tags,
        "messages": messages,
        "used_context": used_context,
        "source_metadata": source_metadata,
        "attributes": attributes,
    }
    return await run_capture_feedback(fields=fields, authorization=_inbound_authorization(ctx))


def register(server: FastMCP) -> None:
    """Register ``capture_feedback`` (its docstring is the agent-facing description)."""

    server.tool(name="capture_feedback")(capture_feedback)
