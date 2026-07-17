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

// P12.S5 — the per-tenant documents surface: browse (newest-first, optional project
// filter) + full-text search, the vocky flagship-read-surface analog. A server
// component throughout with NO client island — the filter bar is a plain
// `<form method="GET">`, so it needs no JS, no `useSearchParams`, no `router.push`.
// Submitting navigates, which is the semantic we want: each result set is its own
// shareable URL and browser back is "previous page". Rendered inside the S2/S2R
// `(app)` shell, so it draws only into `.kb-app-main`.
//
// TWO ENDPOINTS: `q` present → `searchDocuments` (ranked, with snippets); else →
// `getDocuments` (newest-first). `listProjects` rides along in parallel for the
// project-filter options (its UUID values bridge to content-plane names server-side).
// READ + SEARCH ONLY — writes stay on the `vk_`-keyed `/api/*` machine surface.
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
 */
function renderSnippet(snippet: string): ReactNode[] {
  const parts = snippet.split(/<mark>|<\/mark>/);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark
        key={i}
        className="rounded-[2px] bg-[var(--kb-accent-soft)] px-[0.15em] text-[var(--kb-accent-strong)]"
      >
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function columns(searchMode: boolean): DataTableColumn<DocRow>[] {
  return [
    {
      key: "title",
      header: DOCUMENTS.list.columns.title,
      cell: (row) => (
        <div>
          <Link
            href={`/documents/${row.id}`}
            className="kb-dtable__name hover:text-[var(--kb-accent-strong)]"
          >
            {row.title}
          </Link>
          {searchMode && row.snippet ? (
            <div className="kb-dtable__sub" style={{ marginTop: "0.2rem" }}>
              {renderSnippet(row.snippet)}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: "project",
      header: DOCUMENTS.list.columns.project,
      cell: (row) => (
        <span className="text-[var(--kb-secondary)]">{row.project}</span>
      ),
    },
    {
      key: "date",
      header: DOCUMENTS.list.columns.date,
      className: "mono",
      cell: (row) => row.date,
    },
    {
      key: "tags",
      header: DOCUMENTS.list.columns.tags,
      cell: (row) =>
        row.tags.length === 0 ? (
          <span className="text-[var(--kb-hint)]">{DOCUMENTS.list.noTags}</span>
        ) : (
          <span className="flex flex-wrap gap-[0.3rem]">
            {row.tags.map((tag) => (
              <span key={tag} className="kb-chip">
                {tag}
              </span>
            ))}
          </span>
        ),
    },
  ];
}

/**
 * Fetch the page (search OR browse) + the project list, mapping the backend's
 * rejections to the 404 page. 404 (a `project` UUID outside the tenant —
 * 404-never-403 so ids cannot be probed) and 400 (a malformed query) render the SAME
 * not-found: every one means "the page you asked for does not exist". A 401 never
 * reaches here (`requireIdentity` already redirected); EVERYTHING ELSE rethrows — an
 * outage must surface, not masquerade as an empty result.
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
      (error.status === 404 || error.status === 400)
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
    <form
      method="GET"
      action="/documents"
      className="mt-[var(--kb-space-md)] flex flex-col gap-3 min-[720px]:flex-row min-[720px]:items-center"
    >
      {passthrough.map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}

      {/* The designed `.kb-appsearch` box: magnifier + a flat search input. */}
      <label className="kb-appsearch min-[720px]:flex-1">
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

      {/* Project filter. Value = the project UUID (bridged to a name server-side).
          Blank "All projects" submits as `project=` and is dropped by
          `readActiveParams` — sending it would be a 422. */}
      <div className="min-[720px]:w-56">
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

      <div className="flex items-center gap-2">
        <button type="submit" className={appButtonClass("primary")}>
          {DOCUMENTS.search.submitLabel}
        </button>
        {/* A link, not `type="reset"`: reset would restore the submitted values,
            not clear the query. */}
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

  return (
    <nav
      aria-label={DOCUMENTS.pager.ariaLabel}
      className="mt-[var(--kb-space-md)] flex items-center justify-end gap-2"
    >
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
    <>
      {/* .mainhead — eyebrow + Fraunces title + sub. */}
      <div className="mb-[1.3rem]">
        <div className="kb-app-eyebrow">
          {tenantName} · {DOCUMENTS.eyebrow}
        </div>
        <h1 className="kb-app-title" style={{ marginTop: "0.35rem" }}>
          {DOCUMENTS.title}
        </h1>
        <p className="kb-app-sub">{DOCUMENTS.sub}</p>
      </div>

      <SearchForm active={active} projects={projects} />
      <p className="mt-[0.6rem] mb-[0.5rem] text-[0.7rem] uppercase tracking-[0.04em] text-[var(--kb-hint)] [font-family:var(--kb-font-mono)]">
        {DOCUMENTS.search.hint}
      </p>

      <div className="kb-panel">
        <div className="kb-panel__head">
          <h2 className="kb-app-h2">{DOCUMENTS.title}</h2>
          <span className="text-[0.68rem] uppercase tracking-[0.04em] text-[var(--kb-hint)] [font-family:var(--kb-font-mono)]">
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
    </>
  );
}
