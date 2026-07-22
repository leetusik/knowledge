// Tenant-dashboard copy (P12.S3) — the post-login home: the usage stat tiles, the
// 30-day search trend, the projects table, the recent-activity feed, and
// create-project. Copy-as-data per the S1 convention: the page never hardcodes
// strings inline.
//
// As in `auth.ts`, the create-project error copy is keyed by HTTP STATUS, never by
// knowledge's `detail` text — the text is a server-side implementation detail that
// may change wording at any time, and mapping it into UI copy would couple the two.

/** Which entity a lifecycle-activity line emphasises (bolds). */
export type ActivityEmphasis = "project" | "credential";

export interface ActivityTemplate {
  /** Leading body text, e.g. "Key minted"; the emphasised entity follows. */
  text: string;
  emphasis: ActivityEmphasis;
}

/** Status-keyed create-project error copy (never knowledge's `detail`). */
export const CREATE_PROJECT_ERRORS = {
  /** Client-side zod rejection, or knowledge's 400/422 (blank / >200 chars). */
  invalidName: "Enter a project name of 1–200 characters.",
  /** 401 — the session died mid-request; the next navigation bounces to /login. */
  sessionExpired: "Your session has expired. Sign in again to continue.",
  /** 5xx / network / anything else. */
  generic: "Could not create the project. Please try again.",
} as const;

/**
 * Status-keyed mint-ORG-credential error copy (P18.S3) — shaped like
 * `MINT_CREDENTIAL_ERRORS`, minus the per-project `notFound` (an org key targets the
 * caller's tenant, which always exists). knowledge answers a too-long name as a
 * **422** (FastAPI body validation), which the action maps to `invalidName`.
 */
export const MINT_ORG_CREDENTIAL_ERRORS = {
  /** Client-side zod rejection, or knowledge's own 400/422 (name >200 chars). */
  invalidName: "Key names must be 200 characters or fewer.",
  /** 401 — the session died mid-request; the next navigation bounces to /login. */
  sessionExpired: "Your session has expired. Sign in again to continue.",
  /** 5xx / network / anything else. */
  generic: "Could not create the key. Please try again.",
} as const;

/** Status-keyed revoke-ORG-credential error copy (P18.S3). */
export const REVOKE_ORG_CREDENTIAL_ERRORS = {
  /** A tampered/garbled hidden input — the id is not a user-facing field. */
  invalidRequest: "Could not revoke that key. Reload the page and try again.",
  sessionExpired: "Your session has expired. Sign in again to continue.",
  /** 404 — the key is gone (or is not one of this org's keys). */
  notFound: "That key no longer exists.",
  generic: "Could not revoke the key. Please try again.",
} as const;

export const DASHBOARD = {
  /** Document <title> (the SITE template appends " · knowledge"). */
  title: "Dashboard",
  /** Mono eyebrow suffix, rendered as `{tenant} · {eyebrow}`. */
  eyebrow: "Org",
  /** Sub-line under the title. */
  sub: "Usage across your org over the last 30 days.",

  usage: {
    /** The four stat-tile eyebrows, in render order. No deltas (operator decision). */
    tiles: {
      documentsCreated: "Documents created",
      searches: "Searches",
      deleted: "Deleted",
      activeTotal: "Active total",
    },
  },

  trend: {
    heading: "Searches · last 30 days",
    /** Mono caption beside the heading: `{total} total · peak {peak}/day`. */
    caption: (total: number, peak: number): string =>
      `${total.toLocaleString("en-US")} total · peak ${peak.toLocaleString(
        "en-US",
      )}/day`,
    /** Accessible name + sr-only summary prefix for the chart. */
    ariaLabel: "Search volume over the last 30 days",
    /** Shown in place of the chart when there is no series. */
    empty: "No search activity in this window yet.",
  },

  projects: {
    heading: "Projects",
    columns: {
      project: "Project",
      documents: "Docs",
      keys: "Keys",
      /** P19 — per-project Public/Private visibility badge column. */
      visibility: "Visibility",
      created: "Created",
      lastUsed: "Last used",
      action: "Action",
    },
    /** P19 — the two visibility badge labels (rendered off `project.visibility`). */
    visibility: {
      public: "Public",
      private: "Private",
    },
    /** Per-row drill-down affordance (the `/projects/[id]` detail route lands in S4). */
    openLabel: "Open",
    /** Overrides `DataTable`'s built-in default so the empty state stays copy-as-data. */
    empty: "No projects yet. Create your first one to get started.",
  },

  activity: {
    heading: "Recent activity",
    /** Per-`KbActivityEvent.type` body templates; the emphasised entity is bolded. */
    templates: {
      project_created: { text: "Project created", emphasis: "project" },
      key_minted: { text: "Key minted", emphasis: "credential" },
      key_revoked: { text: "Key revoked", emphasis: "credential" },
    } satisfies Record<
      "project_created" | "key_minted" | "key_revoked",
      ActivityTemplate
    >,
    /** Shown for a key event whose credential carries no display name. */
    unnamedKey: "unnamed key",
    empty: "No activity yet.",
  },

  createProject: {
    /** The header trigger button (a plus icon precedes it). */
    openLabel: "New project",
    nameLabel: "Project name",
    namePlaceholder: "e.g. changple",
    submitLabel: "Create",
    submitPendingLabel: "Creating…",
    cancelLabel: "Cancel",
  },

  /**
   * Org-level API keys panel (P18.S3) — one `vk_` key grants the whole org (every
   * project). Reuses the P12 keys-table + mint-modal + revoke language at org scope;
   * the show-once modal copy mirrors the project keyPanel (a dismissed modal is a lost
   * key — knowledge returns the plaintext exactly once).
   */
  orgKeys: {
    heading: "Org API keys",
    /** Explains what an org key is for, once, above the table. */
    lead: "One key grants access to every project in your org. Send it as the API credential your service uses to reach knowledge.",
    columns: {
      name: "Name",
      key: "Key",
      status: "Status",
      created: "Created",
      lastUsed: "Last used",
      /** Header for the trailing actions column (visually empty, sr-only text). */
      actions: "Actions",
    },
    /** Overrides `DataTable`'s built-in default so the empty state stays copy-as-data. */
    empty: "No org keys yet. Create one to start ingesting documents from anywhere.",
    /** `name === null` — the key was minted without a label. */
    unnamed: "Unnamed key",
    /** The three derived states (`credential-status.ts`), keyed for the Badge label. */
    status: {
      active: "Active",
      idle: "Idle",
      revoked: "Revoked",
    } satisfies Record<"active" | "idle" | "revoked", string>,

    mint: {
      /** The disclosure trigger in the panel head (a plus icon precedes it). */
      newKeyLabel: "New key",
      nameLabel: "Key name",
      /** Optional: knowledge defaults an omitted/blank name to `null`. */
      nameHint: "Optional — a label to tell your keys apart.",
      namePlaceholder: "e.g. CI ingest",
      submitLabel: "Create key",
      submitPendingLabel: "Creating…",
      cancelLabel: "Cancel",
    },

    /**
     * The show-once reveal modal. knowledge returns the plaintext `vk_` key EXACTLY
     * ONCE and stores only its hash — there is no "reveal again". A dismissed modal is
     * a lost key.
     */
    keyPanel: {
      heading: "Copy your new key now",
      warning:
        "This is the only time this key will ever be shown. It cannot be recovered — if you lose it, revoke it and create a new one.",
      /** Accessible name for the key value itself. */
      keyLabel: "New API key",
      copyLabel: "Copy",
      copiedLabel: "Copied",
      copyFailedLabel: "Copy failed — select the key and copy it manually.",
      dismissLabel: "Dismiss",
    },

    revoke: {
      label: "Revoke",
      /** Shown in place of the button once the confirm step is armed. */
      confirmPrompt: "Revoke?",
      confirmLabel: "Yes, revoke",
      cancelLabel: "Cancel",
      pendingLabel: "Revoking…",
      /** Accessible name for the per-row action (the label alone is ambiguous). */
      ariaLabelPrefix: "Revoke key",
    },
  },
} as const;

export type DashboardCopy = typeof DASHBOARD;
