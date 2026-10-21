import { cookies } from "next/headers";

import { ReviewStatic } from "@/components/review/review-static";
import { parseReaderCookie, READER_COOKIE } from "@/lib/reader-cookie";

// P30.S24 (`08-review` §6) — the loading state: the header's counts skeleton and a card-shaped
// skeleton, under the frame (which stays).
export default async function ReviewLoading() {
  const settings = parseReaderCookie(
    (await cookies()).get(READER_COOKIE)?.value,
  );
  return <ReviewStatic settings={settings} loading />;
}
