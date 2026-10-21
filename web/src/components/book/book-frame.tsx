import type { ReactNode } from "react";

import { schemeFor, type ReaderSettings } from "@/lib/reader-cookie";

import "@/app/reader-fonts.css";
import "@/app/reader.css";
import "@/app/book.css";

/**
 * The book page's frame (`07-book-page` *What it is, and where it sits*): the reader's
 * root and themes, a slim top bar of its own, no app rail and no app top bar, for members
 * and the signed-out alike. The page follows the reader's Display setting for the THEME (the
 * `kb_reader` cookie, read on the server, so the first paint already has it) but not its
 * text size: the root is the reader's root at size 3 (open question 12).
 */
export function BookFrame({
  settings,
  top,
  children,
}: {
  settings: ReaderSettings;
  top: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className="rd-root rd-size-3 bk-page"
      data-md-color-scheme={schemeFor(settings.theme)}
      data-theme-choice={settings.theme}
      lang="en"
    >
      <div className="rd-in">
        {top}
        <div className="bk-room">{children}</div>
      </div>
    </div>
  );
}
