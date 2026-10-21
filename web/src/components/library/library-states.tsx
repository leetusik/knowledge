import Link from "next/link";
import type { ReactNode } from "react";

import { LIBRARY } from "@/content";
import { loginHref } from "@/lib/next-path";

/** The editorial block of the failed and not-found states (`06-library` §9; the reader's §16 values). */
export function LibEditorial({
  code,
  title,
  sub,
  actions,
  refLine,
  alert,
}: {
  code: string;
  title: string;
  sub: string;
  actions?: ReactNode;
  refLine?: string;
  alert?: boolean;
}) {
  return (
    <div className="lib-ed" data-lib role={alert ? "alert" : undefined}>
      <span className="lib-ed__code">{code}</span>
      <h1 className="lib-ed__title">{title}</h1>
      <p className="lib-ed__sub">{sub}</p>
      {actions ? <div className="lib-ed__actions">{actions}</div> : null}
      {refLine ? <p className="lib-ed__ref">{refLine}</p> : null}
    </div>
  );
}

/**
 * Not found (`/@{org}`): the constant 404 for an unknown org, an org with nothing public
 * (to anyone not a member) and a private project's address. One secondary action: signed
 * out "Sign in" (back to this address), signed in "‹ Back to your library".
 */
export function LibraryNotFound({
  signedIn,
  path,
}: {
  signedIn: boolean;
  path?: string;
}) {
  return (
    <LibEditorial
      code={LIBRARY.states.notFoundCode}
      title={LIBRARY.states.notFoundTitle}
      sub={LIBRARY.states.notFoundBody}
      actions={
        signedIn ? (
          <Link className="lib-btn lib-btn--secondary" href="/library">
            {LIBRARY.states.notFoundBack}
          </Link>
        ) : (
          <Link className="lib-btn lib-btn--secondary" href={loginHref(path)}>
            {LIBRARY.states.notFoundSignIn}
          </Link>
        )
      }
    />
  );
}

/** A panel in the page (`empty`, `nothingpublic`): title, body, one standalone link to the dashboard. */
function Panel({
  title,
  body,
  link,
}: {
  title: string;
  body: string;
  link: string;
}) {
  return (
    <div className="lib-panel">
      <h2 className="lib-panel__title">{title}</h2>
      <p className="lib-panel__body">{body}</p>
      <Link className="lib-link lib-link--solo" href="/dashboard">
        {link} <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}

/** `/library` for an org with no documents. */
export function LibraryEmpty() {
  return (
    <Panel
      title={LIBRARY.states.emptyTitle}
      body={LIBRARY.states.emptyBody}
      link={LIBRARY.states.emptyLink}
    />
  );
}

/** `/@{org}` seen by a member of that org when nothing is public. */
export function LibraryNothingPublic({ org }: { org: string }) {
  return (
    <Panel
      title={LIBRARY.states.nothingPublicTitle}
      body={LIBRARY.states.nothingPublicBody(org)}
      link={LIBRARY.states.nothingPublicLink}
    />
  );
}
