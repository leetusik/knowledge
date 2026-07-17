// Project-detail copy (P12.S4) — the per-project drill-down: project info, this
// project's usage, its ingest credentials, and the mint/revoke flows. Copy-as-data
// per the S1 convention: the page never hardcodes strings inline.
//
// As in `auth.ts` / `dashboard.ts`, form error copy is keyed by HTTP STATUS, never
// by knowledge's `detail` text — the text is a server-side implementation detail
// that may change wording at any time.

import type { CredentialStatus } from "@/lib/knowledge/credential-status";

/**
 * Status-keyed mint-credential error copy.
 *
 * NOTE knowledge answers a too-long name as a **422** (FastAPI body validation),
 * not vocky's 400 — the action maps both to `invalidName`.
 */
export const MINT_CREDENTIAL_ERRORS = {
  /** Client-side zod rejection, or knowledge's own 400/422 (name >200 chars). */
  invalidName: "Key names must be 200 characters or fewer.",
  /** 401 — the session died mid-request; the next navigation bounces to /login. */
  sessionExpired: "Your session has expired. Sign in again to continue.",
  /** 404 — the project vanished (or was never ours) between render and submit. */
  notFound: "This project no longer exists.",
  /** 5xx / network / anything else. */
  generic: "Could not create the key. Please try again.",
} as const;

/** Status-keyed revoke-credential error copy. */
export const REVOKE_CREDENTIAL_ERRORS = {
  /** A tampered/garbled hidden input — the ids are not user-facing fields. */
  invalidRequest: "Could not revoke that key. Reload the page and try again.",
  sessionExpired: "Your session has expired. Sign in again to continue.",
  /** 404 — the key or project is gone (or is another tenant's). */
  notFound: "That key no longer exists.",
  generic: "Could not revoke the key. Please try again.",
} as const;

export const PROJECT = {
  /** Document <title> (the SITE template appends " · knowledge"). STATIC — the
   * knowledge client is `cache: "no-store"`, so a `generateMetadata` title would
   * cost a second uncached round-trip for a cosmetic gain. */
  title: "Project",

  header: {
    /** Mono eyebrow above the title. */
    eyebrow: "Workspace · Project",
    /** Prefix for the created-date sub-line, rendered as `{prefix} {date}`. */
    createdPrefix: "Created",
  },

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

  credentials: {
    heading: "API keys",
    /** Explains what the keys are for, once, above the table. */
    lead: "Use a key's value as the API credential your service sends to knowledge.",
    columns: {
      name: "Name",
      key: "Key",
      status: "Status",
      created: "Created",
      lastUsed: "Last used",
      /** Header for the trailing actions column (visually empty, sr-only text). */
      actions: "Actions",
    },
    /** Overrides `DataTable`'s built-in default, which bypasses copy-as-data. */
    empty: "No keys yet. Create one to start ingesting documents.",
    /** `name === null` — the key was minted without a label. */
    unnamed: "Unnamed key",
    /** `last_used_at === null` — the key has never been used to ingest. */
    never: "Never",
    /** The three derived states (`credential-status.ts`), keyed for the Badge label. */
    status: {
      active: "Active",
      idle: "Idle",
      revoked: "Revoked",
    } satisfies Record<CredentialStatus, string>,
  },

  mint: {
    /** The disclosure trigger in the panel head (a plus icon precedes it). */
    newKeyLabel: "New key",
    nameLabel: "Key name",
    /** Optional: knowledge defaults an omitted/blank name to `null`. */
    nameHint: "Optional — a label to tell your keys apart.",
    namePlaceholder: "e.g. Production ingest",
    submitLabel: "Create key",
    submitPendingLabel: "Creating…",
    cancelLabel: "Cancel",
  },

  /**
   * The show-once reveal modal. knowledge returns the plaintext `vk_` key EXACTLY
   * ONCE and stores only its hash — there is no "reveal again". The copy carries
   * that weight, because a dismissed modal is a lost key.
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

  /** The branded not-found (`not-found.tsx`), on the `.kb-empty` empty-state classes. */
  notFound: {
    title: "Project not found",
    sub: "This project doesn't exist, or it isn't part of your workspace.",
    backLabel: "Back to dashboard",
  },
} as const;

export type ProjectCopy = typeof PROJECT;
