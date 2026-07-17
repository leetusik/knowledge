import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Badge, DataTable, type DataTableColumn } from "@/components/ui";
import { StatTiles, type StatTileVM, TrendChart } from "@/components/usage";
import { PROJECT } from "@/content";
import { requireIdentity } from "@/lib/auth-guards";
import { getProjectUsage } from "@/lib/knowledge/app";
import { ApiError } from "@/lib/knowledge/client";
import { credentialStatus } from "@/lib/knowledge/credential-status";
import type { KbCredential, KbProjectUsage } from "@/lib/knowledge/types";

import { MintCredentialForm } from "./mint-credential-form";
import { RevokeCredentialButton } from "./revoke-credential-button";

// P12.S4 — the per-project drill-down, reached from the dashboard's project rows.
// A server component throughout, rendered inside the S2/S2R `(app)` shell (so it
// draws only into `.kb-app-main`, never redrawing chrome). Only the mint form and
// the per-row revoke button are client islands.
//
// SINGLE fetch (cleaner than vocky's two): knowledge's `/app/projects/{id}/usage`
// bundles `project` (header) + `credentials` (table) alongside the usage
// (tiles/trend), all through the same serializers — so the page reads everything
// from one `getProjectUsage`. `revalidatePath` re-renders this page, refetching
// usage AND the credential list together.
//
// The <title> is STATIC copy, not the project name: the knowledge client is
// `cache: "no-store"`, so `generateMetadata` would cost a second uncached fetch.
export const metadata: Metadata = { title: PROJECT.title };

const columns: DataTableColumn<KbCredential>[] = [
  {
    key: "name",
    header: PROJECT.credentials.columns.name,
    cell: (credential) =>
      credential.name === null ? (
        <span className="text-[var(--kb-hint)] italic">
          {PROJECT.credentials.unnamed}
        </span>
      ) : (
        <span className="kb-dtable__name">{credential.name}</span>
      ),
  },
  {
    key: "key",
    header: PROJECT.credentials.columns.key,
    className: "mono",
    // `token_prefix` is a display stub (`"vk_"` + a slice), never a usable
    // credential. The plaintext key exists only in the mint response.
    cell: (credential) => `${credential.token_prefix}…`,
  },
  {
    key: "status",
    header: PROJECT.credentials.columns.status,
    // Derived three-state status (`credential-status.ts`): revoked / active / idle,
    // encoded in FORM as well as color via the `Badge` (WCAG 1.4.1).
    cell: (credential) => {
      const status = credentialStatus(credential);
      return <Badge status={status}>{PROJECT.credentials.status[status]}</Badge>;
    },
  },
  {
    key: "created",
    header: PROJECT.credentials.columns.created,
    className: "mono",
    cell: (credential) => formatDate(credential.created_at),
  },
  {
    key: "last_used",
    header: PROJECT.credentials.columns.lastUsed,
    className: "mono",
    // `null` until the key is first used to ingest.
    cell: (credential) =>
      credential.last_used_at === null
        ? PROJECT.credentials.never
        : relativeTime(credential.last_used_at),
  },
  {
    key: "action",
    header: (
      <span className="sr-only">{PROJECT.credentials.columns.actions}</span>
    ),
    actions: true,
    // A revoked key has nothing to revoke; its struck badge tells the story.
    cell: (credential) =>
      credential.revoked_at === null ? (
        <RevokeCredentialButton
          projectId={credential.project_id}
          credentialId={credential.id}
          credentialLabel={credential.name ?? credential.token_prefix}
        />
      ) : null,
  },
];

/** `"2026-03-12T09:31:02+00:00"` → `"2026-03-12"` (mono ISO date); unparseable → first 10 chars. */
function formatDate(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso.slice(0, 10);
  return at.toISOString().slice(0, 10);
}

/** `"2h ago"` / `"3d ago"` / `"just now"`; the raw ISO date when unparseable. */
function relativeTime(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso.slice(0, 10);
  const seconds = Math.floor((Date.now() - at.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * The SINGLE project fetch, with the not-found mapping isolated so `notFound()`
 * (which, like `redirect()`, signals by throwing) can never sit inside the `try`
 * that would swallow it.
 *
 * 404 (missing OR another tenant's — knowledge answers 404-never-403 so ids cannot
 * be probed) and 400 (not a UUID) both render the SAME branded not-found: a
 * malformed id is effectively not-found, and distinguishing them would leak the
 * shape of what exists. A 401 never reaches here — `requireIdentity` already turned
 * it into a redirect. EVERYTHING ELSE rethrows (an outage should surface, not
 * masquerade as a missing project).
 */
async function loadProject(
  token: string,
  projectId: string,
): Promise<KbProjectUsage> {
  try {
    return await getProjectUsage(token, projectId);
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 404 || error.status === 400)
    ) {
      notFound();
    }
    throw error;
  }
}

export default async function ProjectPage({
  params,
}: {
  // Next 16: dynamic route params arrive as a Promise.
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { token } = await requireIdentity();
  const usage = await loadProject(token, projectId);
  const { project, credentials } = usage;

  // The four tiles. "Active total" is derived (`documents_created − documents_deleted`),
  // not a `totals` key; no deltas (operator decision, consistent with S3).
  const tiles: StatTileVM[] = [
    {
      key: "documents_created",
      eyebrow: PROJECT.usage.tiles.documentsCreated,
      value: usage.totals.documents_created,
    },
    {
      key: "searches",
      eyebrow: PROJECT.usage.tiles.searches,
      value: usage.totals.searches,
    },
    {
      key: "deleted",
      eyebrow: PROJECT.usage.tiles.deleted,
      value: usage.totals.documents_deleted,
    },
    {
      key: "active_total",
      eyebrow: PROJECT.usage.tiles.activeTotal,
      value: usage.totals.documents_created - usage.totals.documents_deleted,
    },
  ];

  const series = usage.daily_counts.map((day) => day.searches);
  const peak = series.length > 0 ? Math.max(...series) : 0;

  return (
    <>
      {/* .mainhead — eyebrow + Fraunces title (the project name) + created sub. */}
      <div className="mb-[1.3rem]">
        <div className="kb-app-eyebrow">{PROJECT.header.eyebrow}</div>
        <h1 className="kb-app-title" style={{ marginTop: "0.35rem" }}>
          {project.name}
        </h1>
        <p className="kb-app-sub">
          {PROJECT.header.createdPrefix} {formatDate(project.created_at)}
        </p>
      </div>

      {/* Project usage — S3's StatTiles + TrendChart reused as-is (one block per
          page, so no `kb-trend-fill` gradient-id collision). */}
      <StatTiles tiles={tiles} />

      <div className="kb-panel" style={{ marginTop: "var(--kb-space-md)" }}>
        <div className="mb-[0.3rem] flex items-baseline justify-between gap-4">
          <h2 className="kb-app-h2" style={{ fontSize: "1rem" }}>
            {PROJECT.trend.heading}
          </h2>
          <span className="text-[0.68rem] uppercase tracking-[0.04em] text-[var(--kb-hint)] [font-family:var(--kb-font-mono)]">
            {PROJECT.trend.caption(usage.totals.searches, peak)}
          </span>
        </div>
        <figure className="m-0 mt-[0.3rem] block h-[120px]">
          <TrendChart
            series={series}
            ariaLabel={PROJECT.trend.ariaLabel}
            empty={PROJECT.trend.empty}
          />
        </figure>
      </div>

      {/* Credentials — the panel head carries the "New key" disclosure; the table
          lists metadata only (`token_prefix`, never the full key). */}
      <section
        className="kb-panel"
        style={{ marginTop: "var(--kb-space-md)" }}
        aria-labelledby="credentials-head"
      >
        <div className="mb-[0.9rem] flex items-start justify-between gap-4">
          <div>
            <h2
              id="credentials-head"
              className="kb-app-h2"
              style={{ fontSize: "1.05rem" }}
            >
              {PROJECT.credentials.heading}
            </h2>
            <p className="mt-[0.3rem] text-[0.85rem] text-[var(--kb-secondary)]">
              {PROJECT.credentials.lead}
            </p>
          </div>
          <MintCredentialForm projectId={project.id} />
        </div>

        <DataTable
          columns={columns}
          rows={credentials}
          rowKey={(credential) => credential.id}
          empty={PROJECT.credentials.empty}
        />
      </section>
    </>
  );
}
