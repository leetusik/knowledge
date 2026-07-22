import type { Metadata } from "next";
import Link from "next/link";

import {
  appButtonClass,
  Badge,
  DataTable,
  type DataTableColumn,
} from "@/components/ui";
import { StatTiles, type StatTileVM, TrendChart } from "@/components/usage";
import { DASHBOARD } from "@/content";
import { requireIdentity } from "@/lib/auth-guards";
import {
  getDashboard,
  getUsage,
  listOrgCredentials,
} from "@/lib/knowledge/app";
import { credentialStatus } from "@/lib/knowledge/credential-status";
import type {
  KbActivityEvent,
  KbCredential,
  KbDashboardProject,
} from "@/lib/knowledge/types";

import { CreateProjectForm } from "./create-project-form";
import { MintOrgKeyForm } from "./mint-org-key-form";
import { RevokeOrgKeyButton } from "./revoke-org-key-button";

// P12.S3 — the tenant dashboard: the post-login home and the app's first real data
// page. A server component throughout (only the create-project header button is a
// client island), rendered inside the S2/S2R `(app)` shell (the topbar with the
// tenant name + the teal-active rail already wrap this) — so it renders ONLY inside
// `.kb-app-main`, never re-drawing chrome.
//
// Two PARALLEL calls: `/app/usage` for the stat tiles + 30-day search trend, and the
// P12.S3 `/app/dashboard` rollup for the richer projects table (per-project Docs /
// Keys / Last-used) + the recent-activity feed. `Promise.all` makes the second call
// free in wall-clock terms. A non-401 failure from either propagates to the error
// boundary — an outage must surface, not masquerade as an empty dashboard (the
// 401→/login redirect lives inside `requireIdentity`). Tenant name comes from the
// shell's cached `/auth/me`; no extra round-trip here.
export const metadata: Metadata = { title: DASHBOARD.title };

const columns: DataTableColumn<KbDashboardProject>[] = [
  {
    key: "name",
    header: DASHBOARD.projects.columns.project,
    cell: (project) => (
      <span className="kb-dtable__name">{project.name}</span>
    ),
  },
  {
    key: "documents",
    header: DASHBOARD.projects.columns.documents,
    align: "right",
    className: "num",
    cell: (project) => project.documents.toLocaleString("en-US"),
  },
  {
    key: "keys",
    header: DASHBOARD.projects.columns.keys,
    align: "right",
    className: "num",
    cell: (project) => project.keys.toLocaleString("en-US"),
  },
  {
    // P19 — per-project Public/Private badge, straight off the rollup's `visibility`
    // (active=Public / idle=Private reuse the closed Badge status enum, no new CSS).
    key: "visibility",
    header: DASHBOARD.projects.columns.visibility,
    cell: (project) => (
      <Badge status={project.visibility === "public" ? "active" : "idle"}>
        {project.visibility === "public"
          ? DASHBOARD.projects.visibility.public
          : DASHBOARD.projects.visibility.private}
      </Badge>
    ),
  },
  {
    key: "created",
    header: DASHBOARD.projects.columns.created,
    className: "mono",
    cell: (project) => formatCreated(project.created_at),
  },
  {
    key: "last_used",
    header: DASHBOARD.projects.columns.lastUsed,
    className: "mono",
    cell: (project) => relativeTime(project.last_used_at),
  },
  {
    key: "action",
    header: DASHBOARD.projects.columns.action,
    actions: true,
    // The `/projects/[id]` detail route lands in S4 (the next slice); the Open link
    // is the designed affordance and goes live then. Acceptable — the phase is not
    // deployed until P14.
    cell: (project) => (
      <Link
        href={`/projects/${project.id}`}
        className={appButtonClass("ghost", "sm")}
      >
        {DASHBOARD.projects.openLabel}
      </Link>
    ),
  },
];

// P18.S3 — the org-level API-keys table. Mirrors the project page's credential
// columns (name / key stub / derived status / created / last used / revoke) at ORG
// scope: an org key carries `project_id null` and grants the whole org. Revoke rides
// by credential id alone (no project id).
const orgKeyColumns: DataTableColumn<KbCredential>[] = [
  {
    key: "name",
    header: DASHBOARD.orgKeys.columns.name,
    cell: (credential) =>
      credential.name === null ? (
        <span className="text-[var(--kb-hint)] italic">
          {DASHBOARD.orgKeys.unnamed}
        </span>
      ) : (
        <span className="kb-dtable__name">{credential.name}</span>
      ),
  },
  {
    key: "key",
    header: DASHBOARD.orgKeys.columns.key,
    className: "mono",
    // `token_prefix` is a display stub (`"vk_"` + a slice), never a usable
    // credential. The plaintext key exists only in the mint response.
    cell: (credential) => `${credential.token_prefix}…`,
  },
  {
    key: "status",
    header: DASHBOARD.orgKeys.columns.status,
    // Derived three-state status (`credential-status.ts`): revoked / active / idle,
    // encoded in FORM as well as color via the `Badge` (WCAG 1.4.1).
    cell: (credential) => {
      const status = credentialStatus(credential);
      return (
        <Badge status={status}>{DASHBOARD.orgKeys.status[status]}</Badge>
      );
    },
  },
  {
    key: "created",
    header: DASHBOARD.orgKeys.columns.created,
    className: "mono",
    cell: (credential) => formatCreated(credential.created_at),
  },
  {
    key: "last_used",
    header: DASHBOARD.orgKeys.columns.lastUsed,
    className: "mono",
    // `null` until the key is first used to ingest → `relativeTime` renders "—".
    cell: (credential) => relativeTime(credential.last_used_at),
  },
  {
    key: "action",
    header: (
      <span className="sr-only">{DASHBOARD.orgKeys.columns.actions}</span>
    ),
    actions: true,
    // A revoked key has nothing to revoke; its struck badge tells the story.
    cell: (credential) =>
      credential.revoked_at === null ? (
        <RevokeOrgKeyButton
          credentialId={credential.id}
          credentialLabel={credential.name ?? credential.token_prefix}
        />
      ) : null,
  },
];

/** `"2026-03-12T09:31:02+00:00"` → `"2026-03-12"` (mono ISO date); unparseable → first 10 chars. */
function formatCreated(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso.slice(0, 10);
  return at.toISOString().slice(0, 10);
}

/** `"2h ago"` / `"3d ago"` / `"just now"`; `"—"` when null or unparseable. */
function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "—";
  const seconds = Math.floor((Date.now() - at.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** The bolded body of one activity line, per its type's template. */
function activityBody(event: KbActivityEvent) {
  const template = DASHBOARD.activity.templates[event.type];
  const emphasised =
    template.emphasis === "project"
      ? event.project_name
      : (event.credential_name ?? DASHBOARD.activity.unnamedKey);
  return (
    <>
      {template.text} ·{" "}
      <b className="font-semibold text-[var(--kb-ink)]">{emphasised}</b>
    </>
  );
}

export default async function DashboardPage() {
  const { token, identity } = await requireIdentity();
  const tenantName = identity.tenant?.name ?? "—";

  const [usage, dashboard, orgCredentials] = await Promise.all([
    getUsage(token),
    getDashboard(token),
    listOrgCredentials(token),
  ]);

  // The four tiles. "Active total" is derived (`documents_created − documents_deleted`),
  // not a `totals` key; no deltas (operator decision).
  const tiles: StatTileVM[] = [
    {
      key: "documents_created",
      eyebrow: DASHBOARD.usage.tiles.documentsCreated,
      value: usage.totals.documents_created,
    },
    {
      key: "searches",
      eyebrow: DASHBOARD.usage.tiles.searches,
      value: usage.totals.searches,
    },
    {
      key: "deleted",
      eyebrow: DASHBOARD.usage.tiles.deleted,
      value: usage.totals.documents_deleted,
    },
    {
      key: "active_total",
      eyebrow: DASHBOARD.usage.tiles.activeTotal,
      value: usage.totals.documents_created - usage.totals.documents_deleted,
    },
  ];

  const series = usage.daily_counts.map((day) => day.searches);
  const peak = series.length > 0 ? Math.max(...series) : 0;

  return (
    <>
      {/* .mainhead — eyebrow + title + sub, with the create-project affordance right. */}
      <div className="mb-[1.3rem] flex items-start justify-between gap-4">
        <div>
          <div className="kb-app-eyebrow">
            {tenantName} · {DASHBOARD.eyebrow}
          </div>
          <h1 className="kb-app-title" style={{ marginTop: "0.35rem" }}>
            {DASHBOARD.title}
          </h1>
          <p className="kb-app-sub">{DASHBOARD.sub}</p>
        </div>
        <CreateProjectForm />
      </div>

      <StatTiles tiles={tiles} />

      {/* Trend panel — heading + mono caption + the line/area search trend. */}
      <div className="kb-panel" style={{ marginTop: "var(--kb-space-md)" }}>
        <div className="mb-[0.3rem] flex items-baseline justify-between gap-4">
          <h2 className="kb-app-h2" style={{ fontSize: "1rem" }}>
            {DASHBOARD.trend.heading}
          </h2>
          <span className="text-[0.68rem] uppercase tracking-[0.04em] text-[var(--kb-hint)] [font-family:var(--kb-font-mono)]">
            {DASHBOARD.trend.caption(usage.totals.searches, peak)}
          </span>
        </div>
        <figure className="m-0 mt-[0.3rem] block h-[120px]">
          <TrendChart
            series={series}
            ariaLabel={DASHBOARD.trend.ariaLabel}
            empty={DASHBOARD.trend.empty}
          />
        </figure>
      </div>

      {/* .grid2 — Projects (1.7fr) | Recent activity (1fr). */}
      <div className="mt-[var(--kb-space-md)] grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-[var(--kb-space-md)]">
        <div className="kb-panel">
          <div className="kb-panel__head">
            <h2 className="kb-app-h2">{DASHBOARD.projects.heading}</h2>
          </div>
          <DataTable
            columns={columns}
            rows={dashboard.projects}
            rowKey={(project) => project.id}
            empty={DASHBOARD.projects.empty}
          />
        </div>

        <div className="kb-panel">
          <div className="kb-panel__head">
            <h2 className="kb-app-h2">{DASHBOARD.activity.heading}</h2>
          </div>
          {dashboard.activity.length === 0 ? (
            <p className="text-[0.88rem] text-[var(--kb-secondary)]">
              {DASHBOARD.activity.empty}
            </p>
          ) : (
            <ul className="m-0 list-none p-0">
              {dashboard.activity.map((event, index) => (
                <li
                  key={`${event.type}-${event.at}-${index}`}
                  className="flex items-baseline gap-[0.6rem] border-b border-[var(--kb-border)] py-[0.55rem] text-[0.85rem] last:border-b-0"
                >
                  <span className="w-[4.6rem] flex-none text-[0.68rem] text-[var(--kb-hint)] [font-family:var(--kb-font-mono)]">
                    {relativeTime(event.at)}
                  </span>
                  <span className="text-[var(--kb-secondary)]">
                    {activityBody(event)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Org API keys — a full-width panel below the projects/activity grid. The
          panel head carries the "New key" disclosure; the table lists metadata only
          (`token_prefix`, never the full key). One org key grants the whole org. */}
      <section
        className="kb-panel"
        style={{ marginTop: "var(--kb-space-md)" }}
        aria-labelledby="org-keys-head"
      >
        <div className="mb-[0.9rem] flex items-start justify-between gap-4">
          <div>
            <h2
              id="org-keys-head"
              className="kb-app-h2"
              style={{ fontSize: "1.05rem" }}
            >
              {DASHBOARD.orgKeys.heading}
            </h2>
            <p className="mt-[0.3rem] text-[0.85rem] text-[var(--kb-secondary)]">
              {DASHBOARD.orgKeys.lead}
            </p>
          </div>
          <MintOrgKeyForm />
        </div>

        <DataTable
          columns={orgKeyColumns}
          rows={orgCredentials}
          rowKey={(credential) => credential.id}
          empty={DASHBOARD.orgKeys.empty}
        />
      </section>
    </>
  );
}
