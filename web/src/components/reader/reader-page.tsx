import { layerOn } from "@/lib/reader/layer";
import type { LoadedReader } from "@/lib/reader/load";
import type { ListenSeed } from "@/lib/listen/types";

import { ReaderArticle } from "./reader-article";
import { ReaderFrame } from "./reader-frame";

/**
 * A loaded chapter or loose document in the reader shell. The frame is keyed by what is
 * on screen (the document and its version), so opening another chapter, language or
 * version starts it fresh: the unread hold, the resume pill and the position state all
 * end with the view (`01-reader` *Progress, section and finished*).
 *
 * P41-sr.W1: `listen` is the page's Listen seed (a signed-in reader on a native
 * document's current version), or none: no Listen control on this page.
 */
export function ReaderPage({
  reader,
  listen = null,
}: {
  reader: LoadedReader;
  listen?: ListenSeed | null;
}) {
  return (
    <ReaderFrame
      key={`${reader.docId}:${reader.view.version}`}
      view={reader.view}
      notes={layerOn(reader)}
      listen={listen}
    >
      <ReaderArticle reader={reader} />
    </ReaderFrame>
  );
}
