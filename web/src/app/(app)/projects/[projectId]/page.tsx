import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Editorial } from "@/components/states";
import {
  appButtonClass,
  Badge,
  DataTable,
  type DataTableColumn,
} from "@/components/ui";
import { StatTiles, type StatTileVM, TrendChart } from "@/components/usage";
import { DOCUMENTS, PROJECT, STATES } from "@/content";
import { requireIdentity } from "@/lib/auth-guards";
import { getDocuments, getProjectUsage } from "@/lib/knowledge/app";
import { ApiError } from "@/lib/knowledge/client";
import { credentialStatus } from "@/lib/knowledge/credential-status";
import type {
  KbCredential,
  KbDocumentListItem,
  KbProjectUsage,
} from "@/lib/knowledge/types";

import { DocumentsRetryButton } from "./documents-retry";
import { MintCredentialForm } from "./mint-credential-form";
import { RevokeCredentialButton } from "./revoke-credential-button";
import { VisibilityToggle } from "./visibility-toggle";

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

// Round 04 §4.5 CLOSES the gap round 03 §4.6 left here (§4.6 rated `1 Key, Status ·
// 2 Last used · 3 Created` and assigned nothing to `Name` or to the action column,
// so P28.S2 defaulted both to 1). The later round rates the whole table — "Name,
// Key, Status, Actions = 1 · Last used = 2 · Created = 3" — and that is exactly what
// stands below: the defaults were right, and they are no longer defaults.
const columns: DataTableColumn<KbCredential>[] = [
  {
    key: "name",
    header: PROJECT.credentials.columns.name,
    priority: 1,
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
    priority: 1,
    className: "mono",
    // `token_prefix` is a display stub (`"vk_"` + a slice), never a usable
    // credential. The plaintext key exists only in the mint response.
    cell: (credential) => `${credential.token_prefix}…`,
  },
  {
    key: "status",
    header: PROJECT.credentials.columns.status,
    priority: 1,
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
    priority: 3,
    className: "mono",
    cell: (credential) => formatDate(credential.created_at),
  },
  {
    key: "last_used",
    header: PROJECT.credentials.columns.lastUsed,
    priority: 2,
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
    priority: 1,
    actions: true,
    // A revoked key has nothing to revoke; its struck badge tells the story.
    // The `project_id !== null` guard is a type narrow, not new behavior: a
    // project-detail credential is always project-bound (non-null `project_id`)
    // now that `KbCredential.project_id` is `string | null` for P18 org keys.
    cell: (credential) =>
      credential.revoked_at === null && credential.project_id !== null ? (
        <RevokeCredentialButton
          projectId={credential.project_id}
          credentialId={credential.id}
          credentialLabel={credential.name ?? credential.token_prefix}
        />
      ) : null,
  },
];

// Round 04 §4.6 — the project documents panel's three columns, and the three it
// deliberately does NOT have. Title (priority 1, linking to the document) · Date
// (2, mono) · Tags (3). NO `Project` column (the panel is already inside one project),
// NO `Delete` (deleting is a documents-surface action), and no snippet (there is no
// query here to highlight). Every string is an existing `DOCUMENTS.*` one — this
// round adds none.
const documentColumns: DataTableColumn<KbDocumentListItem>[] = [
  {
    key: "title",
    header: DOCUMENTS.list.columns.title,
    priority: 1,
    cell: (row) => (
      <Link href={`/documents/${row.id}`} className="kb-dtable__name">
        {row.title}
      </Link>
    ),
  },
  {
    key: "date",
    header: DOCUMENTS.list.columns.date,
    priority: 2,
    className: "mono",
    cell: (row) => row.date,
  },
  {
    key: "tags",
    header: DOCUMENTS.list.columns.tags,
    priority: 3,
    cell: (row) =>
      row.tags.length === 0 ? (
        <span className="text-[var(--kb-hint)]">{DOCUMENTS.list.noTags}</span>
      ) : (
        // §3's `.kb-taglist` replaces the documents page's inline flex wrap. The
        // three-chips-then-`+n` overflow marker is §4.7's rule for the DOCUMENTS
        // page and is P28.S5's; §4.6 rates this column and says nothing about
        // capping it, so nothing is capped here.
        <span className="kb-taglist">
          {row.tags.map((tag) => (
            <span key={tag} className="kb-chip">
              {tag}
            </span>
          ))}
        </span>
      ),
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
 * be probed), 400 and **422** all render the SAME branded not-found: a malformed id
 * is effectively not-found, and distinguishing them would leak the shape of what
 * exists. A 401 never reaches here — `requireIdentity` already turned it into a
 * redirect. EVERYTHING ELSE rethrows (an outage should surface, not masquerade as a
 * missing project).
 *
 * The **422** is P28.S3's find and a real pre-existing defect, not a tidy-up: the
 * endpoint types `project_id` as a UUID (`server/documents_api.py`), so FastAPI
 * rejects a hand-typed `/projects/not-a-uuid` with 422, NOT the 400 this comment
 * used to claim — which meant the malformed-id case fell through to the rethrow and
 * landed on the 500 editorial instead of the designed 404. It was invisible until
 * round 03 §5 gave the app an error boundary at all. `documents/page.tsx` carries
 * the same gap on the same `?project=` value and is P28.S5's half.
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
      (error.status === 404 || error.status === 400 || error.status === 422)
    ) {
      notFound();
    }
    throw error;
  }
}

/**
 * Round 04 §4.6's SECOND, parallel fetch — the project's newest documents, taken
 * from the same `/app/documents` endpoint the documents surface uses, narrowed to
 * this project. It rides beside `getProjectUsage` in one `Promise.all`, so it costs
 * nothing in wall-clock terms.
 *
 * **It must not take the page down**, which is the whole reason it has its own
 * loader: a failure here returns `null` and the panel alone renders §5.2's in-frame
 * failure block, with the page frame, the tiles, the trend and the credentials table
 * all still usable. That is the opposite of every other loader on this surface, and
 * deliberately so — this panel is an addition to a page that already worked.
 *
 * The ONE exception is a **401**, which is rethrown rather than swallowed: 401 means
 * the session died mid-request, it belongs to the page's guard (`requireIdentity`,
 * which redirects to /login) and not to a panel offering "Try again", and
 * `loadProject` rethrows it in the same breath — so the two halves of the
 * `Promise.all` treat a dead session identically instead of one hiding it.
 */
async function loadProjectDocuments(
  token: string,
  projectId: string,
): Promise<KbDocumentListItem[] | null> {
  try {
    // §4.6, literally: `getDocuments(token, { project: projectId })`, then the
    // first five of `items`. The endpoint's default order IS newest-first, so the
    // panel needs no sort control and takes a prefix of the page it is given.
    const page = await getDocuments(token, { project: projectId });
    return page.items.slice(0, DOCUMENTS_SHOWN);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw error;
    return null;
  }
}

/** §4.6: "Take the first **5** of `items`." No pager, no "show more". */
const DOCUMENTS_SHOWN = 5;

export default async function ProjectPage({
  params,
}: {
  // Next 16: dynamic route params arrive as a Promise.
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { token, identity } = await requireIdentity();
  const tenantName = identity.tenant?.name ?? "—";
  // §4.6 — the documents panel's fetch is the page's SECOND parallel call. The two
  // resolve together, so the new panel costs no extra wall-clock time; `documents`
  // is `null` when its own fetch failed, and only that panel reacts.
  const [usage, documents] = await Promise.all([
    loadProject(token, projectId),
    loadProjectDocuments(token, projectId),
  ]);
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
    // Round 04 §4.1 — one `.kb-page-flow`, whose `gap` is the page's whole vertical
    // rhythm, so every block-level `margin-top` this page carried is gone. §4.5
    // fixes the order at every width: page frame · tiles · trend · Documents · API
    // keys.
    <div className="kb-page-flow">
      {/* §4.5 — the page frame's right-hand side is a `.kb-pageframe__status`
          (replacing the generic `__actions` slot): the Public/Private chip, the
          toggle that inverts it, and a one-line hint saying what the CURRENT state
          means. Above 40rem that is a right-aligned column with the hint capped at
          17rem; below it, one full-width row — chip left, toggle taking the rest —
          with the hint on its own line, left-aligned, `order: 3`. */}
      <div className="kb-pageframe">
        <div className="kb-pageframe__title-wrap">
          {/* §4.4 — the eyebrow carries the ORG first on every page: on a phone
              the topbar crumb is hidden and this is the only place the org shows.
              `identity` comes from the page's existing `requireIdentity()` call,
              which is `cache()`d and shared with the layout, so it costs nothing. */}
          <div className="kb-app-eyebrow">
            {tenantName} · {PROJECT.header.eyebrow}
          </div>
          <h1 className="kb-app-title">{project.name}</h1>
          <p className="kb-app-sub">
            {PROJECT.header.createdPrefix} {formatDate(project.created_at)}
          </p>
        </div>
        <div className="kb-pageframe__status">
          {/* active=Public / idle=Private reuse the closed Badge status enum (no new
              CSS); `chip` is the soft-fill header emphasis. */}
          <Badge
            status={project.visibility === "public" ? "active" : "idle"}
            chip
          >
            {project.visibility === "public"
              ? PROJECT.visibility.badge.public
              : PROJECT.visibility.badge.private}
          </Badge>
          <VisibilityToggle
            projectId={project.id}
            visibility={project.visibility}
          />
          <p className="kb-pageframe__hint">
            {project.visibility === "public"
              ? PROJECT.visibility.hint.public
              : PROJECT.visibility.hint.private}
          </p>
        </div>
      </div>

      {/* Project usage — S3's StatTiles + TrendChart reused as-is (one block per
          page, so no `kb-trend-fill` gradient-id collision). */}
      <StatTiles tiles={tiles} />

      {/* §4.5 — the trend figure's `h-[120px]` is deleted here too; the figure wears
          round 03's `.kb-trend-wrap`, whose clamp owns the height at every width. */}
      <section className="kb-panel" aria-labelledby="trend-head">
        <div className="kb-panel__head">
          <h2 id="trend-head" className="kb-app-h2">
            {PROJECT.trend.heading}
          </h2>
          <span className="kb-panel__caption">
            {PROJECT.trend.caption(usage.totals.searches, peak)}
          </span>
        </div>
        <figure className="kb-trend-wrap m-0 block">
          <TrendChart
            series={series}
            ariaLabel={PROJECT.trend.ariaLabel}
            empty={PROJECT.trend.empty}
          />
        </figure>
      </section>

      {/* §4.6 — the project documents panel, the round's one net-new capability and
          the operator's literal ask ("a list of documents when I click a project").
          Five newest documents, between the trend and the API keys at every width;
          the head's ghost link is the way to the rest, so there is no pager and no
          "show more". No head caption: a count there would read as the project's
          total, and the panel shows five of an unknown many.

          On failure the panel — and ONLY the panel — becomes round 03 §5.2's
          in-frame editorial block (`.kb-panel` at zero padding, an `<h2>` at
          1.15rem, one `sm` Retry). The rest of the page stays usable, which is the
          point of the separate loader. The Retry's mechanism is `router.refresh()`
          (see `documents-retry.tsx`); the copy is `STATES.error`, round 03's own
          failure block, since round 04 adds no string. */}
      {documents === null ? (
        <Editorial
          variant="panel"
          code={STATES.error.code}
          title={STATES.error.title}
          sub={STATES.error.sub}
          actions={<DocumentsRetryButton />}
        />
      ) : (
        <section className="kb-panel" aria-labelledby="proj-docs-head">
          <div className="kb-panel__head">
            <h2 id="proj-docs-head" className="kb-app-h2">
              {DOCUMENTS.title}
            </h2>
            <Link
              href={`/documents?project=${project.id}`}
              className={appButtonClass("ghost", "sm")}
            >
              {DOCUMENTS.read.backLabel}
            </Link>
          </div>
          <DataTable
            columns={documentColumns}
            rows={documents}
            rowKey={(row) => String(row.id)}
            empty={DOCUMENTS.list.emptyNoDocuments}
          />
        </section>
      )}

      {/* Credentials — the panel head carries the heading, the lead and the "New
          key" disclosure TRIGGER; the table lists metadata only (`token_prefix`,
          never the full key). §4.4 (moving the revealed form into a `.kb-inlineform`
          block below the head) is P28.S5's, so `<MintCredentialForm>` stays whole in
          the head here and S5 splits it. */}
      <section className="kb-panel" aria-labelledby="credentials-head">
        <div className="kb-panel__head kb-panel__head--start">
          <div className="kb-panel__headmain">
            <h2 id="credentials-head" className="kb-app-h2">
              {PROJECT.credentials.heading}
            </h2>
            <p className="kb-panel__lead">{PROJECT.credentials.lead}</p>
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
    </div>
  );
}
