import type { Metadata } from "next";
import { cookies } from "next/headers";

import { MemberLibrary } from "@/components/library/library-view";
import { LIBRARY } from "@/content";
import { requireIdentity } from "@/lib/auth-guards";
import { loadLibrary } from "@/lib/library/load";
import { chooseGroup } from "@/lib/library/model";
import { parseReaderCookie, READER_COOKIE } from "@/lib/reader-cookie";

// P30.S22 — `/library` (`06-library` round 01): a signed-in member's own org, the landing after
// sign-in. The `(app)` layout has already required the session. Continue reading, the shelves
// and "Your reading data" are read per request (the page is dynamic: it reads the cookie).
// `?by=subject` wins over the device's remembered grouping (`kb_reader` `libraryGroup`).
// A fault anywhere is the segment's `error.tsx`, the designed "failed" state.
export const metadata: Metadata = {
  title: LIBRARY.metaTitle,
  robots: { index: false },
};

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token, identity } = await requireIdentity();
  const data = await loadLibrary(token, identity);
  const remembered = parseReaderCookie(
    (await cookies()).get(READER_COOKIE)?.value,
  ).libraryGroup;
  const group = chooseGroup((await searchParams).by, remembered);
  return <MemberLibrary data={data} group={group} />;
}
