import { cookies } from "next/headers";

import { ReaderFrame } from "@/components/reader/reader-frame";
import { ReaderStateBlock } from "@/components/reader/reader-state";
import { parseReaderCookie, READER_COOKIE } from "@/lib/reader-cookie";
import { stateView } from "@/lib/reader/state-view";

// P30.S13 (`01-reader` §16) — the skeleton, in the reader's frame with the line and
// the top bar (the chapter bar appears only once the chapter is ready).
export default async function ChapterLoading() {
  const settings = parseReaderCookie(
    (await cookies()).get(READER_COOKIE)?.value,
  );
  return (
    <ReaderFrame view={stateView(settings)} state="loading">
      <ReaderStateBlock kind="loading" />
    </ReaderFrame>
  );
}
