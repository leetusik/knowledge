import { cookies, headers } from "next/headers";

import { BookFrame } from "@/components/book/book-frame";
import { BookStateBlock } from "@/components/book/book-states";
import { BookTop } from "@/components/book/book-top";
import { optionalIdentity } from "@/lib/auth-guards";
import { loginHref, REQUEST_PATH_HEADER } from "@/lib/next-path";
import { parseReaderCookie, READER_COOKIE } from "@/lib/reader-cookie";
import { LIBRARY_HREF } from "@/lib/reader-href";

// P30.S23 (`07-book-page` §8) — a missing book, a private book's address and one in
// another org are the same state: the constant not-found, 404 and never 403, in the
// reader's own frame. Signed out, "Back to the library" goes to the org's public page
// (`/@{org}`, taken from the address) and the bar carries Sign in, returning here.
export default async function BookNotFound() {
  const settings = parseReaderCookie(
    (await cookies()).get(READER_COOKIE)?.value,
  );
  const ctx = await optionalIdentity();
  const path = (await headers()).get(REQUEST_PATH_HEADER) ?? "";
  const org = /^\/(@[^/?#]+)/.exec(path)?.[1];
  const libraryHref = ctx || !org ? LIBRARY_HREF : `/${org}`;
  return (
    <BookFrame
      settings={settings}
      top={
        <BookTop
          libraryHref={libraryHref}
          signInHref={ctx ? null : loginHref(path.startsWith("/") ? path : "/")}
        />
      }
    >
      <BookStateBlock kind="notfound" libraryHref={libraryHref} />
    </BookFrame>
  );
}
