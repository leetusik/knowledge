import { ChapterView } from "@/lib/native";
import { documentAssets } from "@/lib/native";
import type { QuizViewContext } from "@/lib/native/render";
import { layerOn } from "@/lib/reader/layer";
import type { LoadedReader } from "@/lib/reader/load";

import { AnnotationLayer } from "./annotations";
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
  // The quiz island's context (P30.S19): who is reading, where an attempt is saved, the
  // saved answers as they show on return, and the address Sign in to save returns to
  // (this chapter, language and version; the island adds the item).
  const quiz: QuizViewContext = {
    member: view.member,
    write: view.write,
    version: view.version,
    place: loose ? "document" : "chapter",
    lang: view.lang,
    signIn: {
      target: view.target,
      lang: view.langs.length > 1 ? view.lang : null,
      version: view.version < view.newest ? view.version : null,
    },
    saved: reader.quiz,
  };
  return (
    <div className="rd-flow">
      <ChapterHead view={view} />
      <div className="rd-prose" lang={view.lang}>
        <ChapterView
          checked={checked}
          lang={view.lang}
          omitTitle={checked.format === "md" ? view.title : null}
          quiz={quiz}
          links={{
            format: checked.format,
            assetInfo: documentAssets(reader.docId, reader.assets),
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
      {/* P30.S20/S21: highlights, notes and bookmarks, on a native chapter that renders and
          bookmarks on a plain Markdown one. A member with nowhere to save (OQ75) gets none;
          a signed-out reader gets Sign in to save. */}
      {reader.notes && layerOn(reader) ? (
        <AnnotationLayer
          notes={reader.notes}
          write={view.write}
          version={view.version}
          lang={view.lang}
          chapterTitle={view.title}
          place={loose ? "document" : "chapter"}
          target={view.target}
        />
      ) : null}
    </div>
  );
}
