import { ChapterView } from "@/lib/native";
import { documentAssetUrl } from "@/lib/native";
import type { LoadedReader } from "@/lib/reader/load";

import { ChapterEnd } from "./chapter-end";
import { ChapterHead } from "./chapter-head";

/**
 * The reader's article (server): the chapter opening (§5) and the body, in the text
 * column. The body is S12's pipeline, styled by the prose kit (§6-§9a) in `reader.css`.
 *
 * An `md` body already opens with its own H1 (the stored markdown starts at it); the
 * opening shows the title, so that first H1 is left out of the body when it is the
 * title. A native chapter's title lives in the header and is only shown by the opening.
 *
 * The chapter end (§10) closes the article: it is the end sentinel the frame watches
 * and carries Mark as finished / Mark as unread, the next chapter and the book's list.
 */
export function ReaderArticle({ reader }: { reader: LoadedReader }) {
  const { view, checked } = reader;
  const loose = view.kind === "loose" || view.book === null;
  return (
    <div className="rd-flow">
      <ChapterHead view={view} />
      <div className="rd-prose" lang={view.lang}>
        <ChapterView
          checked={checked}
          lang={view.lang}
          omitTitle={checked.format === "md" ? view.title : null}
          links={{
            format: checked.format,
            assetUrl: documentAssetUrl(reader.docId, reader.assets),
            resolveRef: reader.resolveRef,
            baseUrl: reader.baseUrl,
          }}
        />
      </div>
      <ChapterEnd
        noun={loose ? "document" : "chapter"}
        loose={loose}
        next={view.book?.next}
        isLast={!!view.book && !view.book.next}
        bookBackHref={view.book?.backHref}
        total={view.book?.total}
      />
    </div>
  );
}
