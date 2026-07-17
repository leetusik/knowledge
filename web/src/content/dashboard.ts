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

export const DASHBOARD = {
  /** Document <title> (the SITE template appends " · knowledge"). */
  title: "Dashboard",
  /** Mono eyebrow suffix, rendered as `{tenant} · {eyebrow}`. */
  eyebrow: "Workspace",
  /** Sub-line under the title. */
  sub: "Usage across your workspace over the last 30 days.",

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
      created: "Created",
      lastUsed: "Last used",
      action: "Action",
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
} as const;

export type DashboardCopy = typeof DASHBOARD;
