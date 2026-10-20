import type { LoadedReader } from "@/lib/reader/load";

import { ReaderArticle } from "./reader-article";
import { ReaderFrame } from "./reader-frame";

/** A loaded chapter or loose document in the reader shell. */
export function ReaderPage({ reader }: { reader: LoadedReader }) {
  return (
    <ReaderFrame view={reader.view}>
      <ReaderArticle reader={reader} />
    </ReaderFrame>
  );
}
