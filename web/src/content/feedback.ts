// Feedback copy: the org's searchable list of captured feedback and one record's
// detail. Copy-as-data: the pages never hardcode strings inline.
//
// READ + SEARCH ONLY. Editing, deleting and commenting happen on the key-authed
// `/api/project/feedback` surface, not in the web app, so there is no action copy.

export const FEEDBACK = {
  /** Document <title> (the SITE template appends the suffix). */
  title: "Feedback",
  /** Mono eyebrow suffix, rendered as `{org} · {eyebrow}`. */
  eyebrow: "Feedback",

  filters: {
    /**
     * `q` is a case-insensitive SUBSTRING match over the message, comment, target
     * text and trigger message: a partial word matches, which is what makes a
     * Korean stem (`결제`) find its particle-attached forms (`결제를`).
     */
    searchLabel: "Search",
    searchPlaceholder: "e.g. 결제 or checkout",
    searchHint:
      "Matches any part of the feedback text, comment, or context — Korean and English alike.",
    projectLabel: "Project",
    /** The project filter's unset option: submitted blank, then omitted. */
    projectAll: "All projects",
    valueLabel: "Rating",
    /** The rating filter's unset option (the API accepts only 1 or 2). */
    valueAny: "Any rating",
    valueLiked: "Liked",
    valueDisliked: "Disliked",
    submitLabel: "Search",
    /** A link to a bare `/feedback`, not a reset button. */
    resetLabel: "Clear",
  },

  list: {
    heading: "Recent feedback",
    columns: {
      when: "When",
      project: "Project",
      message: "Feedback",
      value: "Rating",
      source: "Source",
    },
    /** Times are stored and shown in UTC. */
    timeNote: "Times are shown in UTC, newest first.",
    /** No project yet: nothing can have arrived. */
    emptyNoProjects:
      "No projects yet. Create one from the dashboard, then send feedback with its API key.",
    /** Projects exist and the filters matched nothing. */
    emptyNoMatches: "No feedback matches these filters.",
    /** `project_id` is null or names a project not in the list. */
    unknownProject: "—",
    /** The rating as plain text: `null` is unrated. */
    valueUnrated: "Unrated",
    valueLiked: "Liked",
    valueDisliked: "Disliked",
  },

  pagination: {
    ariaLabel: "Feedback pages",
    /** Forward only: browser back is "previous". Shown only with a `next_cursor`. */
    nextLabel: "Next page",
  },

  detail: {
    /** STATIC title: a message title would cost a second uncached fetch. */
    title: "Feedback detail",
    backLabel: "Back to feedback",
    /** The page's h1: the end user's own words follow it. */
    messageHeading: "Feedback",
    commentHeading: "Comment",
    /** `comment === null`. */
    commentNone: "No comment.",
    detailsHeading: "Details",
    /** The strip's caption: one record has no order, only its UTC times. */
    timeNote: "Times are shown in UTC.",
    fields: {
      project: "Project",
      value: "Rating",
      sourceProduct: "Product",
      sourceIntegration: "Integration",
      channel: "Channel",
      recordedBy: "Recorded by",
      triggerType: "Trigger",
      triggerMessage: "Trigger message",
      targetType: "Target type",
      targetRole: "Target role",
      targetText: "Target text",
      conversationId: "Conversation",
      sessionId: "Session",
      userId: "End user",
      /** Caller-reported time the feedback happened. */
      eventAt: "Happened at",
      /** When it was stored. */
      ingestedAt: "Captured at",
      id: "Record ID",
    },
    /** Any nullable field returned as `null`. */
    fieldEmpty: "—",
    tagsHeading: "Tags",
    tagsNone: "No tags.",
    commentsHeading: "Operator comments",
    commentsColumns: {
      author: "Author",
      when: "When",
      body: "Comment",
    },
    commentsNone: "No comments on this record.",
    /** `author === null`. */
    commentAuthorUnknown: "Unknown author",
    /**
     * The free-form caller-supplied JSON, shown as full-width fields of the
     * details strip, always open, and only when non-empty.
     */
    raw: {
      triggerMetadata: "Trigger metadata",
      sourceMetadata: "Source metadata",
      attributes: "Attributes",
      messages: "Messages",
      usedContext: "Used context",
    },
  },

  attachments: {
    heading: "Attachments",
    none: "No attachments.",
    columns: {
      name: "File",
      type: "Type",
      size: "Size",
      /** The action column's header, visually hidden. */
      actions: "Download",
    },
    /** `filename === null`. */
    unnamed: "Untitled file",
    /** Every file downloads: the bytes are the uploader's, never shown inline. */
    downloadNote: "Attachments download rather than open in the browser.",
    downloadLabel: "Download",
    /** Units for `byte_size`, ascending by factors of 1024. */
    byteUnits: ["B", "KB", "MB", "GB"],
  },

  /** The list's not-found: a hand-typed filter the API refused (400 or 404). */
  filterNotFound: {
    title: "No such view",
    sub: "That filter doesn't match a project or a value in your org.",
    backLabel: "Back to feedback",
  },

  /** The detail's not-found: missing, malformed, or another org's record. */
  notFound: {
    title: "Feedback not found",
    sub: "This feedback doesn't exist, or it isn't part of your org.",
    backLabel: "Back to feedback",
  },
} as const;

export type FeedbackCopy = typeof FEEDBACK;
