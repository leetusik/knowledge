"use client";

import { useId, useState } from "react";

import Link from "next/link";

import { LIBRARY } from "@/content";
import {
  buildShelves,
  visibleDocs,
  FOLD_AT,
  type BookCard,
  type DocRow,
  type LibraryGroup,
  type ProjectInfo,
} from "@/lib/library/model";
import { readerCookieString, readReaderCookie } from "@/lib/reader-cookie";

import { BookCardView } from "./book-card";
import { DocRowView } from "./doc-row";

/**
 * "Books and documents" (`06-library` §4 and §7): the shelves, by project or by subject,
 * and the grouping control. A client island for exactly the control: switching re-renders
 * without a reload, replaces the URL (`?by=subject`; by project has no parameter, and no
 * history entry is added), remembers the choice on the device (`kb_reader`'s `libraryGroup`)
 * and folds every "Show all" again. The server passes the group the URL or the cookie chose.
 */
export function Shelves({
  books,
  docs,
  projects,
  initialGroup,
  signedIn,
  showGrouping,
  libraryRoute,
}: {
  books: BookCard[];
  docs: DocRow[];
  projects: ProjectInfo[];
  initialGroup: LibraryGroup;
  signedIn: boolean;
  /** The control shows on `/library` always; on `/@{org}` only when a subject exists. */
  showGrouping: boolean;
  /** `/library`: the PUBLIC tag on a public project and the "nothing to read yet" line. */
  libraryRoute: boolean;
}) {
  const [group, setGroup] = useState<LibraryGroup>(initialGroup);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const uid = useId();

  const { shelves, emptyProjects, noSubjects } = buildShelves(
    books,
    docs,
    projects,
    group,
    LIBRARY.shelves.withoutSubject,
  );

  function choose(next: LibraryGroup) {
    if (next === group) return;
    setGroup(next);
    setOpen({});
    const url = new URL(window.location.href);
    if (next === "subject") url.searchParams.set("by", "subject");
    else url.searchParams.delete("by");
    window.history.replaceState(window.history.state, "", url);
    document.cookie = readerCookieString(
      { ...readReaderCookie(document.cookie), libraryGroup: next },
      window.location.protocol === "https:",
    );
  }

  const showProject = group === "subject";
  return (
    <section className="lib-sec" aria-labelledby={`${uid}-h`}>
      <div className="lib-sec__head">
        <h2 className="lib-h2" id={`${uid}-h`}>
          {LIBRARY.shelves.heading}
        </h2>
        {showGrouping ? (
          <div
            className="lib-seg"
            role="group"
            aria-label={LIBRARY.shelves.groupName}
          >
            <button
              type="button"
              className="lib-seg__opt"
              aria-pressed={group === "project"}
              onClick={() => choose("project")}
            >
              {LIBRARY.shelves.byProject}
            </button>
            <button
              type="button"
              className="lib-seg__opt"
              aria-pressed={group === "subject"}
              onClick={() => choose("subject")}
            >
              {LIBRARY.shelves.bySubject}
            </button>
          </div>
        ) : null}
      </div>
      {noSubjects ? (
        <p className="lib-note">{LIBRARY.shelves.noSubjects}</p>
      ) : null}
      <div className="lib-groups">
        {shelves.map((shelf, i) => {
          const hid = `${uid}-g${i}`;
          const folded = shelf.docs.length > FOLD_AT;
          const isOpen = open[shelf.key] === true;
          const all = LIBRARY.shelves.showAll(shelf.docs.length);
          return (
            <section
              key={shelf.key}
              className="lib-group"
              aria-labelledby={hid}
            >
              <div className="lib-group__head">
                <h3 className="lib-group__name" id={hid}>
                  {shelf.name}
                </h3>
                <span className="lib-group__count">
                  {LIBRARY.shelves.count(shelf.books.length, shelf.docs.length)}
                </span>
                {libraryRoute && group === "project" && shelf.isPublic ? (
                  <span className="rd-tag rd-tag--plain">
                    {LIBRARY.shelves.publicTag}
                  </span>
                ) : null}
              </div>
              {shelf.books.length > 0 ? (
                <ul
                  className="lib-books"
                  aria-label={LIBRARY.shelves.booksIn(shelf.name)}
                >
                  {shelf.books.map((b) => (
                    <li key={b.key}>
                      <BookCardView
                        card={b}
                        signedIn={signedIn}
                        showProject={showProject}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
              {shelf.docs.length > 0 ? (
                <ul
                  className="lib-rows"
                  aria-label={LIBRARY.shelves.docsIn(shelf.name)}
                >
                  {visibleDocs(shelf.docs, isOpen).map((d) => (
                    <li key={d.key}>
                      <DocRowView
                        doc={d}
                        signedIn={signedIn}
                        showProject={showProject}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
              {folded ? (
                <button
                  type="button"
                  className="lib-btn lib-btn--quiet lib-more"
                  aria-expanded={isOpen}
                  aria-label={isOpen ? LIBRARY.shelves.showFewer : all}
                  onClick={() =>
                    setOpen((prev) => ({ ...prev, [shelf.key]: !isOpen }))
                  }
                >
                  <span className="lib-btn__labels" aria-hidden="true">
                    <span className={isOpen ? "is-off" : undefined}>{all}</span>
                    <span className={isOpen ? undefined : "is-off"}>
                      {LIBRARY.shelves.showFewer}
                    </span>
                  </span>
                </button>
              ) : null}
            </section>
          );
        })}
      </div>
      {libraryRoute && group === "project" && emptyProjects > 0 ? (
        <p className="lib-foot">
          {LIBRARY.shelves.emptyProjects(emptyProjects)}{" "}
          <Link className="lib-link" href="/dashboard">
            {LIBRARY.shelves.onDashboard} <span aria-hidden="true">→</span>
          </Link>
        </p>
      ) : null}
    </section>
  );
}
