"""The Feedback owner alert: one plain-text email per captured event (ported from
vocky's ``notifications.py``).

Stdlib ``smtplib`` only. ``POST /api/feedback`` schedules :func:`notify_feedback_captured`
as a FastAPI background task, so it runs **after** the 202 is sent and can never
delay or change it. Best-effort: every failure (recipient lookup, SMTP) is logged
and dropped; there is no retry. Off unless ``server.config.smtp_configured()`` (a
host and a From address). The recipient is the owner of the org that owns the
event's project. The blocking send runs in a worker thread so the single uvicorn
event loop is never blocked.
"""

from __future__ import annotations

import asyncio
import logging
import smtplib
from email.message import EmailMessage

from server import config
from server.feedback.types import FeedbackEventRecord

logger = logging.getLogger(__name__)


def render_message(record: FeedbackEventRecord, to_email: str) -> EmailMessage:
    """Render the plain-text alert email for one captured feedback event."""

    subject = f"Feedback: {record.source_product}"
    if record.feedback_value is not None:
        subject = f"{subject} ({record.feedback_value})"

    lines = [
        f"Message: {record.message}",
        f"Feedback value: {record.feedback_value}",
        f"Comment: {record.comment}",
        f"Channel: {record.channel}",
        f"Source product: {record.source_product}",
        f"Event at: {record.event_at}",
        f"Ingested at: {record.ingested_at}",
        f"Event id: {record.id}",
        f"Project id: {record.project_id}",
    ]

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = config.smtp_from() or ""
    message["To"] = to_email
    message.set_content("\n".join(lines))
    return message


def send_message(message: EmailMessage) -> None:
    """Blocking SMTP send: ``SMTP_SSL`` on port 465, else ``SMTP`` + ``starttls()``.
    AUTH only when ``KB_SMTP_USER`` is set."""

    host = config.smtp_host() or ""
    port = config.smtp_port()
    user = (config.smtp_user() or "").strip()
    smtp_cls = smtplib.SMTP_SSL if port == 465 else smtplib.SMTP
    with smtp_cls(host, port, timeout=10) as client:
        if smtp_cls is smtplib.SMTP:
            client.starttls()
        if user:
            client.login(user, config.smtp_password() or "")
        client.send_message(message)


async def notify_feedback_captured(record: FeedbackEventRecord) -> None:
    """Mail the owner of the event's org about one captured event; never raises."""

    if record.project_id is None or not config.smtp_configured():
        return
    try:
        from server.accounts.service import get_accounts_service

        to_email = await get_accounts_service().get_owner_email_for_project(
            record.project_id
        )
        if to_email is None:
            logger.warning(
                "No owner email for project %s; skipping feedback alert", record.project_id
            )
            return
        message = render_message(record, to_email)
        await asyncio.to_thread(send_message, message)
    except Exception:  # best-effort: an alert never fails or re-runs a capture
        logger.exception("Feedback alert for event %s failed; dropped", record.id)
