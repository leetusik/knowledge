"""Feedback service exports (vocky's Feedback domain, in the platform).

Importing this package touches no database: the service opens its engine on first
use, so the package imports cleanly with ``DATABASE_URL`` unset (Feedback is then
dormant, like the rest of the accounts plane).
"""

from server.feedback.service import (
    FeedbackPersistenceError,
    FeedbackReadError,
    FeedbackService,
    get_feedback_service,
)
from server.feedback.storage import (
    AttachmentStorage,
    LocalFilesystemAttachmentStorage,
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
    FeedbackDailyCount,
    FeedbackDailyMetricCount,
    FeedbackEventRecord,
    FeedbackListCursor,
    FeedbackListPage,
    FeedbackMetricCounts,
    FeedbackMetrics,
    FeedbackMetricsQuery,
    FeedbackQueryFilters,
    FeedbackSummary,
    ListFeedbackQuery,
    SummarizeFeedbackQuery,
)

__all__ = [
    "AttachmentStorage",
    "CreateFeedbackAttachment",
    "CreateFeedbackComment",
    "CreateFeedbackEvent",
    "FeedbackAttachmentRecord",
    "FeedbackCommentRecord",
    "FeedbackDailyCount",
    "FeedbackDailyMetricCount",
    "FeedbackEventRecord",
    "FeedbackListCursor",
    "FeedbackListPage",
    "FeedbackMetricCounts",
    "FeedbackMetrics",
    "FeedbackMetricsQuery",
    "FeedbackPersistenceError",
    "FeedbackQueryFilters",
    "FeedbackReadError",
    "FeedbackService",
    "FeedbackSummary",
    "ListFeedbackQuery",
    "LocalFilesystemAttachmentStorage",
    "StorageError",
    "StorageObjectNotFoundError",
    "SummarizeFeedbackQuery",
    "get_attachment_storage",
    "get_feedback_service",
]
