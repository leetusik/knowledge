import { ChapterView } from "@/lib/native";
import { documentAssetUrl } from "@/lib/native";
import type { LoadedReader } from "@/lib/reader/load";

/**
 * The reader's article (server): the chapter title and the body, in the text column.
 * The body is S12's pipeline, unchanged. The chapter OPENING (the book line, the lede,
 * the version line, the notices and the contents) and the prose kit's look are S14's;
 * until then the title is a plain `<h1>` and the body is legible but not yet drawn.
 *
 * An `md` body already opens with its own H1 (the stored markdown starts at it), so
 * only a native chapter, whose title lives in the header, gets the `<h1>` here.
 */
export function ReaderArticle({ reader }: { reader: LoadedReader }) {
  const { view, checked } = reader;
  return (
    <div className="rd-flow">
      {checked.format === "native" ? (
        <h1 className="rd-title" lang={view.lang}>
          {view.title}
        </h1>
      ) : null}
      <div className="rd-prose" lang={view.lang}>
        <ChapterView
          checked={checked}
          lang={view.lang}
          links={{
            format: checked.format,
            assetUrl: documentAssetUrl(reader.docId, reader.assets),
            resolveRef: reader.resolveRef,
            baseUrl: reader.baseUrl,
          }}
        />
      </div>
    </div>
  );
}
