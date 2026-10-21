import Link from "next/link";

import { LIBRARY } from "@/content";
import type { LibraryData, PublicLibraryData } from "@/lib/library/load";
import { hasSubjects, type LibraryGroup } from "@/lib/library/model";
import { loginHref } from "@/lib/next-path";

import "@/app/reader-fonts.css";

import { ClearAll } from "./clear-all";
import { ContinueReading } from "./continue-reading";
import { LibraryEmpty, LibraryNothingPublic } from "./library-states";
import { Shelves } from "./shelves";

/**
 * `/library` (`06-library` §2–§4, §8): a signed-in member's own org. The head, then
 * Continue reading (drawn only with at least one item), then the shelves, then "Your
 * reading data". An org with no documents shows the empty panel in place of the middle and
 * keeps "Your reading data" at the foot.
 */
export function MemberLibrary({
  data,
  group,
}: {
  data: LibraryData;
  group: LibraryGroup;
}) {
  const empty = data.books.length === 0 && data.docs.length === 0;
  return (
    <div className="lib" data-lib>
      <header className="lib-head">
        <h1 className="lib-title">{LIBRARY.title}</h1>
        {empty ? null : (
          <p className="lib-sub">
            {LIBRARY.sub(data.books.length, data.docs.length)}
          </p>
        )}
      </header>
      {empty ? <LibraryEmpty /> : null}
      {data.continue.length > 0 ? (
        <section className="lib-sec" aria-labelledby="lib-cont-h">
          <div className="lib-sec__head">
            <h2 className="lib-h2" id="lib-cont-h">
              {LIBRARY.continue.heading}
            </h2>
          </div>
          <ContinueReading items={data.continue} />
        </section>
      ) : null}
      {empty ? null : (
        <Shelves
          books={data.books}
          docs={data.docs}
          projects={data.projects}
          initialGroup={group}
          signedIn
          showGrouping
          libraryRoute
        />
      )}
      <ClearAll />
    </div>
  );
}

/**
 * `/@{org}` (`06-library` §2, §4): the org's public library. Signed out nothing is saved
 * and the note offers sign-in (back to this page); signed in (member or not) the note says
 * progress is private and each card carries the viewer's own. A member of an org with nothing
 * public sees the head and the "Nothing here is public yet" panel.
 */
export function PublicLibrary({
  data,
  group,
  path,
}: {
  data: PublicLibraryData;
  group: LibraryGroup;
  path: string;
}) {
  const nothing = data.books.length === 0 && data.docs.length === 0;
  return (
    <div className="lib" data-lib>
      <header className="lib-head">
        <h1 className="lib-title">{data.orgName}</h1>
        <p className="lib-sub">
          {LIBRARY.publicSub(data.books.length, data.docs.length, !nothing)}
        </p>
        {nothing ? null : data.signedIn ? (
          <p className="lib-note">{LIBRARY.privateProgressNote}</p>
        ) : (
          <p className="lib-note">
            {LIBRARY.signedOutNote.before}
            <Link className="lib-link" href={loginHref(path)}>
              {LIBRARY.signedOutNote.link}
            </Link>
            {LIBRARY.signedOutNote.after}
          </p>
        )}
      </header>
      {nothing ? (
        <LibraryNothingPublic org={data.orgName} />
      ) : (
        <Shelves
          books={data.books}
          docs={data.docs}
          projects={data.projects}
          initialGroup={group}
          signedIn={data.signedIn}
          showGrouping={hasSubjects(data.books, data.docs)}
          libraryRoute={false}
        />
      )}
    </div>
  );
}
