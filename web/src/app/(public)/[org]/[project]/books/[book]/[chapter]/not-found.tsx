import { cookies } from "next/headers";

import { ReaderFrame } from "@/components/reader/reader-frame";
import { ReaderStateBlock } from "@/components/reader/reader-state";
import { parseReaderCookie, READER_COOKIE } from "@/lib/reader-cookie";
import { stateView } from "@/lib/reader/state-view";

// P30.S13 (`01-reader` §16) — a missing chapter and one private to this reader are the
// same state: the constant not-found, in the reader's own frame.
export default async function ChapterNotFound() {
  const settings = parseReaderCookie(
    (await cookies()).get(READER_COOKIE)?.value,
  );
  return (
    <ReaderFrame view={stateView(settings)} state="notfound">
      <ReaderStateBlock kind="notfound" noun="chapter" />
    </ReaderFrame>
  );
}
