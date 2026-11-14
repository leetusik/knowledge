import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Search } from "lucide-react";

import {
  appButtonClass,
  DataTable,
  type DataTableColumn,
} from "@/components/ui";
import { FEEDBACK } from "@/content";
import { requireIdentity } from "@/lib/auth-guards";
import { listFeedback } from "@/lib/feedback/app";
import {
  type ActiveParams,
  FORM_FIELD_KEYS,
  nextPageHref,
  readActiveParams,
  toQuery,
} from "@/lib/feedback/query";
import type { Feedback, FeedbackPage } from "@/lib/feedback/types";
import { ApiError } from "@/lib/knowledge/client";
import { listProjects } from "@/lib/knowledge/app";
import type { KbProject } from "@/lib/knowledge/types";

import { ratingLabel, Timestamp } from "./feedback-fields";
import "./feedback.css";

// The org's feedback: every project's captures, newest first, with search and a
// project and rating filter. Laid out as the Feedback app's list was (filter bar,
// then the results table, then "Next page"), drawn in the console kit the
// Documents page uses. A server component with no client island: the filter bar
// is a plain `<form method="GET">`, so each result set is its own URL and browser
// back is "previous page".
//
// READ + SEARCH ONLY: nothing is submitted but the query.
//
// Two parallel calls: the records carry only `project_id`, so `/app/projects`
// supplies the id → name map and the project filter's options.
export const metadata: Metadata = { title: FEEDBACK.title };

/**
 * Fetch the page and the project list, mapping the API's refusals to the
 * not-found page: 404 (a project outside the org, never 403 so ids cannot be
 * probed) and 400 (a malformed id, rating or cursor) both mean "no such view". A
 * 401 never reaches here (`requireIdentity` redirected); everything else rethrows,
 * so an outage surfaces instead of passing for an empty search. `notFound()`
 * throws, so it stays out of the `try`.
 */
async function loadFeedback(
  token: string,
  active: ActiveParams,
): Promise<[FeedbackPage, KbProject[]]> {
  try {
    return await Promise.all([
      listFeedback(token, toQuery(active)),
      listProjects(token),
    ]);
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

function columns(
  projectNames: Map<string, string>,
): DataTableColumn<Feedback>[] {
  return [
    {
      key: "when",
      header: FEEDBACK.list.columns.when,
      className: "mono",
      cell: (record) => <Timestamp iso={record.ingested_at} />,
    },
    {
      key: "project",
      header: FEEDBACK.list.columns.project,
      cell: (record) =>
        (record.project_id && projectNames.get(record.project_id)) ||
        FEEDBACK.list.unknownProject,
    },
    {
      key: "message",
      header: FEEDBACK.list.columns.message,
      // The way into the detail. `message` is untrusted caller text: a text
      // child, never HTML and never part of the href.
      cell: (record) => (
        <Link
          href={`/feedback/${record.id}`}
          className="kb-dtable__name fb-clamp"
        >
          {record.message}
        </Link>
      ),
    },
    {
      key: "value",
      header: FEEDBACK.list.columns.value,
      cell: (record) => ratingLabel(record.feedback_value),
    },
    {
      key: "source",
      header: FEEDBACK.list.columns.source,
      className: "mono",
      cell: (record) => record.source_product,
    },
  ];
}

function FilterBar({
  active,
  projects,
}: {
  active: ActiveParams;
  projects: KbProject[];
}) {
  // The URL-only filters ride as hidden inputs so a hand-made URL survives a
  // submit. `cursor` is dropped: a new search starts at page 1.
  const passthrough = (Object.entries(active) as [string, string][]).filter(
    ([key]) =>
      key !== "cursor" &&
      !FORM_FIELD_KEYS.includes(key as (typeof FORM_FIELD_KEYS)[number]),
  );

  return (
    <form method="GET" action="/feedback" className="kb-searchbar">
      {passthrough.map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}

      <div className="kb-searchbar__field">
        <label className="kb-appsearch">
          <Search size={16} aria-hidden />
          <input
            type="search"
            name="q"
            defaultValue={active.q ?? ""}
            placeholder={FEEDBACK.filters.searchPlaceholder}
            aria-label={FEEDBACK.filters.searchLabel}
            className="kb-appsearch__input"
          />
        </label>
      </div>

      {/* "All projects" submits blank and is dropped by `readActiveParams`. */}
      <div className="kb-searchbar__filter">
        <select
          name="project"
          defaultValue={active.project ?? ""}
          aria-label={FEEDBACK.filters.projectLabel}
          className="kb-field__input"
        >
          <option value="">{FEEDBACK.filters.projectAll}</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {/* The API takes only 1 or 2: there is no filter for "unrated". */}
      <div className="kb-searchbar__filter">
        <select
          name="feedback_value"
          defaultValue={active.feedback_value ?? ""}
          aria-label={FEEDBACK.filters.valueLabel}
          className="kb-field__input"
        >
          <option value="">{FEEDBACK.filters.valueAny}</option>
          <option value="1">{FEEDBACK.filters.valueLiked}</option>
          <option value="2">{FEEDBACK.filters.valueDisliked}</option>
        </select>
      </div>

      <div className="kb-searchbar__actions">
        <button type="submit" className={appButtonClass("primary")}>
          {FEEDBACK.filters.submitLabel}
        </button>
        {/* A link, not `type="reset"`: reset would restore the submitted values. */}
        <Link href="/feedback" className={appButtonClass("ghost")}>
          {FEEDBACK.filters.resetLabel}
        </Link>
      </div>
    </form>
  );
}

export default async function FeedbackListPage({
  searchParams,
}: {
  // Search params arrive as a Promise; a repeated key is a `string[]`.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const active = readActiveParams(await searchParams);
  const { token, identity } = await requireIdentity();
  const tenantName = identity.tenant?.name ?? "—";
  const [page, projects] = await loadFeedback(token, active);

  const projectNames = new Map(projects.map((p) => [p.id, p.name]));

  // Two empty results: with no project nothing can have arrived yet; with one,
  // the filters matched nothing.
  const empty =
    projects.length === 0
      ? FEEDBACK.list.emptyNoProjects
      : FEEDBACK.list.emptyNoMatches;

  return (
    <div className="kb-page-flow">
      <div className="kb-pageframe">
        <div className="kb-pageframe__title-wrap">
          <div className="kb-app-eyebrow">
            {tenantName} · {FEEDBACK.eyebrow}
          </div>
          <h1 className="kb-app-title">{FEEDBACK.title}</h1>
        </div>
      </div>

      <div>
        <FilterBar active={active} projects={projects} />
        <p className="kb-hintline">{FEEDBACK.filters.searchHint}</p>
      </div>

      <section className="kb-panel" aria-labelledby="feedback-list">
        <div className="kb-panel__head">
          <h2 id="feedback-list" className="kb-app-h2">
            {FEEDBACK.list.heading}
          </h2>
          <span className="kb-panel__caption">{FEEDBACK.list.timeNote}</span>
        </div>

        <DataTable
          columns={columns(projectNames)}
          rows={page.records}
          rowKey={(record) => record.id}
          empty={empty}
        />

        {/* Forward only: keyset paging has no previous cursor, and browser back
            is "previous". `next_cursor` is OMITTED when exhausted, so the test is
            `!== undefined`. */}
        {page.next_cursor !== undefined ? (
          <nav aria-label={FEEDBACK.pagination.ariaLabel} className="kb-pager">
            <Link
              href={nextPageHref(active, page.next_cursor)}
              className={appButtonClass("secondary", "sm")}
            >
              {FEEDBACK.pagination.nextLabel}
            </Link>
          </nav>
        ) : null}
      </section>
    </div>
  );
}
