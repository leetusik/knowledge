import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { Search } from "lucide-react";

import {
  appButtonClass,
  DataTable,
  type DataTableColumn,
} from "@/components/ui";
import { DOCUMENTS } from "@/content";
import { requireIdentity } from "@/lib/auth-guards";
import { ApiError } from "@/lib/knowledge/client";
import {
  getDocuments,
  listProjects,
  searchDocuments,
} from "@/lib/knowledge/app";
import {
  type ActiveParams,
  activeLimit,
  activeOffset,
  documentsHref,
  FORM_FIELD_KEYS,
  pagerOffsets,
  readActiveParams,
  toQuery,
} from "@/lib/knowledge/documents-query";
import type { KbProject } from "@/lib/knowledge/types";
import { cn } from "@/lib/utils";

import { DeleteDocumentButton } from "./delete-document-button";

// P12.S5 — the per-tenant documents surface: browse (newest-first, optional project
// filter) + full-text search, the vocky flagship-read-surface analog. A server
// component that fetches and renders everything; the filter bar is a plain
// `<form method="GET">`, so it needs no JS, no `useSearchParams`, no `router.push`.
// Submitting navigates, which is the semantic we want: each result set is its own
// shareable URL and browser back is "previous page". Rendered inside the S2/S2R
// `(app)` shell, so it draws only into `.kb-app-main`.
//
// TWO ENDPOINTS: `q` present → `searchDocuments` (ranked, with snippets); else →
// `getDocuments` (newest-first). `listProjects` rides along in parallel for the
// project-filter options (its UUID values bridge to content-plane names server-side).
//
// P21 — the page is no longer island-free: each row carries ONE client island, the
// two-step-confirm `<DeleteDocumentButton>`, and it is the page's only interactive
// bit. Its write goes through the `"use server"` `deleteDocumentAction` (the authed-
// mutation convention) to the unmetered, session-scoped `DELETE /app/documents/{id}`
// — so this surface still touches nothing on the metered `vk_`-keyed `/api/*` machine
// plane, and everything else here remains READ + SEARCH.
export const metadata: Metadata = { title: DOCUMENTS.title };

/** One table row, normalized across the browse + search result shapes. */
interface DocRow {
  id: number;
  title: string;
  project: string;
  date: string;
  tags: string[];
  /** Search mode only — the highlighted excerpt (`<mark>` delimited). */
  snippet?: string;
}

/**
 * Render an FTS snippet safely. The backend wraps matched terms in LITERAL
 * `<mark>…</mark>` markers; this splits on those and rebuilds with REAL `<mark>`
 * elements, so every other segment (untrusted document text) renders as an escaped
 * string child — never injected as HTML. No `dangerouslySetInnerHTML`.
 *
 * Round 04 §4.7 — the rebuild-from-literal-markers logic is UNCHANGED; only the
 * styling moves, out of the Tailwind arbitraries and into `.kb-snippet mark` (§3).
 */
function renderSnippet(snippet: string): ReactNode[] {
  const parts = snippet.split(/<mark>|<\/mark>/);
  return parts.map((part, i) =>
    i % 2 === 1 ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>,
  );
}

/**
 * Round 04 §4.7 — at most three chips, then one non-interactive `+{n}` overflow
 * marker whose `title` lists the hidden tags. §6: the marker must not be the only
 * place a tag name exists for a screen reader, and it is not — the read page
 * carries the full list. No tag is ever truncated.
 */
const MAX_TAG_CHIPS = 3;

// Column priorities are round 03 §4.6's, verbatim: 1 Title + Actions · 2 Project,
// Date · 3 Tags. The action column's header is a ReactNode, which is exactly why
// the primitive keys its `data-label` exemption off `actions`, not off position.
function columns(searchMode: boolean): DataTableColumn<DocRow>[] {
  return [
    {
      key: "title",
      header: DOCUMENTS.list.columns.title,
      priority: 1,
      cell: (row) => (
        <div>
          <Link
            href={`/documents/${row.id}`}
            className="kb-dtable__name hover:text-[var(--kb-accent-strong)]"
          >
            {row.title}
          </Link>
          {/* §4.7 — the snippet lives INSIDE the title cell, so it stays with the
              title when the row becomes a card below 40rem. */}
          {searchMode && row.snippet ? (
            <span className="kb-snippet">{renderSnippet(row.snippet)}</span>
          ) : null}
        </div>
      ),
    },
    {
      key: "project",
      header: DOCUMENTS.list.columns.project,
      priority: 2,
      cell: (row) => (
        <span className="text-[var(--kb-secondary)]">{row.project}</span>
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
      cell: (row) => {
        if (row.tags.length === 0) {
          return (
            <span className="text-[var(--kb-hint)]">{DOCUMENTS.list.noTags}</span>
          );
        }
        const shown = row.tags.slice(0, MAX_TAG_CHIPS);
        const hidden = row.tags.slice(MAX_TAG_CHIPS);
        return (
          <span className="kb-taglist">
            {shown.map((tag) => (
              <span key={tag} className="kb-chip">
                {tag}
              </span>
            ))}
            {hidden.length > 0 ? (
              <span className="kb-chip kb-chip--more" title={hidden.join(", ")}>
                +{hidden.length}
              </span>
            ) : null}
          </span>
        );
      },
    },
    {
      key: "action",
      header: <span className="sr-only">{DOCUMENTS.list.columns.actions}</span>,
      priority: 1,
      actions: true,
      // The row's only interactive element (P21): a client island that arms an
      // inline confirm before hard-deleting the document. The title is passed for
      // the action's accessible name — "Delete" alone repeats down the column.
      cell: (row) => (
        <DeleteDocumentButton documentId={row.id} documentTitle={row.title} />
      ),
    },
  ];
}

/**
 * Fetch the page (search OR browse) + the project list, mapping the backend's
 * rejections to the 404 page. 404 (a `project` UUID outside the tenant —
 * 404-never-403 so ids cannot be probed), 400 (a malformed query) and 422 render the
 * SAME not-found: every one means "the page you asked for does not exist". A 401
 * never reaches here (`requireIdentity` already redirected); EVERYTHING ELSE
 * rethrows — an outage must surface, not masquerade as an empty result.
 *
 * P28.S5 — **422 belongs in that set**, and its absence was a real bug: the API types
 * the `project` filter as a UUID (`server/documents_api.py`), so FastAPI rejects a
 * hand-typed non-UUID with 422, not 400. Mapping only 404/400 therefore sent
 * `/documents?project=not-a-uuid` to the 500 editorial — contradicting this very
 * comment. `projects/[projectId]/page.tsx` got the same fix in P28.S4; this closes
 * the other half. A valid-but-unknown UUID still 404s through the 404 branch.
 *
 * The mapping lives here so `notFound()` can never sit inside the `try` that would
 * swallow it (it signals by throwing, like `redirect()`).
 */
async function loadDocuments(
  token: string,
  active: ActiveParams,
): Promise<{ total: number; rows: DocRow[]; projects: KbProject[] }> {
  const query = toQuery(active);
  try {
    // Start the projects fetch first so it runs in parallel with the page fetch.
    const projectsPromise = listProjects(token);
    let total: number;
    let rows: DocRow[];
    if (active.q) {
      const page = await searchDocuments(token, { ...query, q: active.q });
      total = page.total;
      rows = page.results.map((r) => ({
        id: r.id,
        title: r.title,
        project: r.project,
        date: r.date,
        tags: r.tags,
        snippet: r.snippet,
      }));
    } else {
      const page = await getDocuments(token, query);
      total = page.total;
      rows = page.items.map((r) => ({
        id: r.id,
        title: r.title,
        project: r.project,
        date: r.date,
        tags: r.tags,
      }));
    }
    const projects = await projectsPromise;
    return { total, rows, projects };
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

function SearchForm({
  active,
  projects,
}: {
  active: ActiveParams;
  projects: KbProject[];
}) {
  // The URL-only params (tag/limit), re-emitted as hidden inputs so a hand-crafted
  // URL survives a submit. `offset` is deliberately dropped — submitting resets to
  // page 1, and omitting it is exactly how a GET form does that. `q`/`project` are
  // real fields, so they are excluded from the passthrough.
  const passthrough = (Object.entries(active) as [string, string][]).filter(
    ([key]) =>
      key !== "offset" && !FORM_FIELD_KEYS.includes(key as (typeof FORM_FIELD_KEYS)[number]),
  );

  return (
    // Round 03 §4.8 + §0 — the app's last width-media-query utilities (the
    // 720px breakpoint trio) are DELETED, and the row is `.kb-searchbar`, which
    // stacks on `kbmain`, not on the window. Round 04 §9 item 7 greps for that
    // utility prefix, so it is not spelled out here either. Round 04 §4.7 finishes it: the submit/reset pair
    // is the bar's THIRD cell, `.kb-searchbar__actions`.
    //
    // The form keeps `method="GET"`: the hidden passthrough inputs and that
    // submit/reset pair are the ENTIRE no-JS search path (round 03 §4.8's snippet
    // draws only two cells, which is why the third sat unstyled until now). Never
    // delete them for tidiness.
    //
    // The page-level `mt-[var(--kb-space-md)]` is gone — §4.1's `.kb-page-flow`
    // gap owns the rhythm now.
    <form method="GET" action="/documents" className="kb-searchbar">
      {passthrough.map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}

      {/* The designed `.kb-appsearch` box: magnifier + a flat search input. */}
      <div className="kb-searchbar__field">
        <label className="kb-appsearch">
          <Search size={16} aria-hidden />
          <input
            type="search"
            name="q"
            defaultValue={active.q ?? ""}
            placeholder={DOCUMENTS.search.placeholder}
            aria-label={DOCUMENTS.search.label}
            className="kb-appsearch__input"
          />
        </label>
      </div>

      {/* Project filter. Value = the project UUID (bridged to a name server-side).
          Blank "All projects" submits as `project=` and is dropped by
          `readActiveParams` — sending it would be a 422. */}
      <div className="kb-searchbar__filter">
        <select
          name="project"
          defaultValue={active.project ?? ""}
          aria-label={DOCUMENTS.search.projectLabel}
          className="kb-field__input"
        >
          <option value="">{DOCUMENTS.search.projectAll}</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {/* §4.7 — the third cell. Above 40rem it sits in the row; below it the bar
          stacks and Search flexes while Reset keeps its intrinsic width (the
          `:first-child { flex: 1 1 auto }` phone rule in §3). */}
      <div className="kb-searchbar__actions">
        <button type="submit" className={appButtonClass("primary")}>
          {DOCUMENTS.search.submitLabel}
        </button>
        {/* A link, not `type="reset"`: reset would restore the submitted values,
            not clear the query — and §4.7 restates it ("Reset stays a link"). */}
        <Link href="/documents" className={appButtonClass("ghost")}>
          {DOCUMENTS.search.resetLabel}
        </Link>
      </div>
    </form>
  );
}

function Pager({
  active,
  total,
}: {
  active: ActiveParams;
  total: number;
}) {
  const limit = activeLimit(active);
  const offset = activeOffset(active);
  const { prev, next } = pagerOffsets(offset, limit, total);

  const link = (label: string, target: number | null) =>
    target === null ? (
      <span
        aria-disabled="true"
        className={cn(
          appButtonClass("ghost", "sm"),
          "pointer-events-none opacity-40",
        )}
      >
        {label}
      </span>
    ) : (
      <Link
        href={documentsHref(active, target)}
        className={appButtonClass("secondary", "sm")}
      >
        {label}
      </Link>
    );

  // Nothing to page through — a single page needs no controls.
  if (prev === null && next === null) return null;

  // §4.7 — `.kb-pager`: right-aligned above 40rem, the two halves splitting the
  // row at the 44px floor below it. The disabled side keeps its
  // `pointer-events: none; opacity: .4` (utilities, not `.kb-*` properties — see
  // the phase's cascade rule).
  return (
    <nav aria-label={DOCUMENTS.pager.ariaLabel} className="kb-pager">
      {link(DOCUMENTS.pager.prevLabel, prev)}
      {link(DOCUMENTS.pager.nextLabel, next)}
    </nav>
  );
}

export default async function DocumentsPage({
  searchParams,
}: {
  // Next 16: search params arrive as a Promise, and a value is `string[]` for a
  // repeated key — see `takeFirst` in documents-query.ts.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const active = readActiveParams(await searchParams);
  const { token, identity } = await requireIdentity();
  const tenantName = identity.tenant?.name ?? "—";
  const { total, rows, projects } = await loadDocuments(token, active);

  const searchMode = Boolean(active.q);
  const hasFilters = Boolean(active.q || active.project || active.tag);
  // Two empty states: nothing ingested yet vs. filters that matched nothing.
  const empty = hasFilters
    ? DOCUMENTS.list.emptyNoMatches
    : DOCUMENTS.list.emptyNoDocuments;

  return (
    // Round 04 §4.1 — one `.kb-page-flow`, the same element every other console
    // page now wears: the frame, the bar, the hint and the results panel are its
    // four direct children in one order at every width, and its `gap` replaces the
    // per-block `mt-[var(--kb-space-md)]` this page used to carry.
    <div className="kb-page-flow">
      {/* Round 03 §4.4 — the shared page frame. This page has no actions slot, so
          the frame is the title wrap alone; the h1's inline `marginTop` is gone
          (the `.kb-app-sub` / frame rules own the spacing now). */}
      <div className="kb-pageframe">
        <div className="kb-pageframe__title-wrap">
          <div className="kb-app-eyebrow">
            {tenantName} · {DOCUMENTS.eyebrow}
          </div>
          <h1 className="kb-app-title">{DOCUMENTS.title}</h1>
          <p className="kb-app-sub">{DOCUMENTS.sub}</p>
        </div>
      </div>

      {/* The bar and the line that explains it are ONE flow block: §4.7 draws the
          `.kb-hintline` as the form's next sibling and §3 gives it its own
          `margin-top: 0.6rem`, so letting the flow's gap separate them too would
          detach the caption from the thing it captions. The wrapper carries no
          class and draws nothing. */}
      <div>
        <SearchForm active={active} projects={projects} />
        {/* §4.7 + §3 — the hand-rolled mono utilities become `.kb-hintline`
            (mono, hint-grey, NOT uppercased: it is a sentence). */}
        <p className="kb-hintline">{DOCUMENTS.search.hint}</p>
      </div>

      <div className="kb-panel">
        {/* §4.7 — head is the h2 plus the count as a `.kb-panel__caption`. */}
        <div className="kb-panel__head">
          <h2 className="kb-app-h2">{DOCUMENTS.title}</h2>
          <span className="kb-panel__caption">
            {DOCUMENTS.count.label(total)}
          </span>
        </div>

        <DataTable
          columns={columns(searchMode)}
          rows={rows}
          rowKey={(row) => String(row.id)}
          empty={empty}
        />

        <Pager active={active} total={total} />
      </div>
    </div>
  );
}
