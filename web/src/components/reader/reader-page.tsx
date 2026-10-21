import { layerOn } from "@/lib/reader/layer";
import type { LoadedReader } from "@/lib/reader/load";

import { ReaderArticle } from "./reader-article";
import { ReaderFrame } from "./reader-frame";

/**
 * A loaded chapter or loose document in the reader shell. The frame is keyed by what is
 * on screen (the document and its version), so opening another chapter, language or
 * version starts it fresh: the unread hold, the resume pill and the position state all
 * end with the view (`01-reader` *Progress, section and finished*).
 */
export function ReaderPage({ reader }: { reader: LoadedReader }) {
  return (
    <ReaderFrame
      key={`${reader.docId}:${reader.view.version}`}
      view={reader.view}
      notes={layerOn(reader)}
    >
      <ReaderArticle reader={reader} />
    </ReaderFrame>
  );
}
