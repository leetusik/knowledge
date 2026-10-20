"use client";

import { READER } from "@/content";

/**
 * The version line's "Version history" link-button (`01-reader` §5 item 4). It asks the
 * reader frame to open the Version history sheet by announcing `reader:open-sheet`
 * with `{ sheet: "versions", opener }` on the window; the sheet and its content are
 * S15's, which listens for it. Until then it announces and nothing opens.
 */
export const OPEN_SHEET_EVENT = "reader:open-sheet";

export function VersionsButton() {
  return (
    <button
      type="button"
      className="rd-linkbtn"
      aria-haspopup="dialog"
      onClick={(e) =>
        window.dispatchEvent(
          new CustomEvent(OPEN_SHEET_EVENT, {
            detail: { sheet: "versions", opener: e.currentTarget },
          }),
        )
      }
    >
      {READER.opening.versionHistory}
    </button>
  );
}
