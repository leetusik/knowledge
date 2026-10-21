import { cookies } from "next/headers";

import { BookFrame } from "@/components/book/book-frame";
import { BookStateBlock } from "@/components/book/book-states";
import { BookTop } from "@/components/book/book-top";
import { parseReaderCookie, READER_COOKIE } from "@/lib/reader-cookie";
import { LIBRARY_HREF } from "@/lib/reader-href";

// P30.S23 (`07-book-page` §8) — the skeleton in the page's own shape, under the top bar
// (which stays, with no middle).
export default async function BookLoading() {
  const settings = parseReaderCookie(
    (await cookies()).get(READER_COOKIE)?.value,
  );
  return (
    <BookFrame settings={settings} top={<BookTop libraryHref={LIBRARY_HREF} />}>
      <BookStateBlock kind="loading" />
    </BookFrame>
  );
}
