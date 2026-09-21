import Link from "next/link";

import { Editorial } from "@/components/states";
import { appButtonClass } from "@/components/ui";
import { DOCUMENTS, STATES } from "@/content";

// P12.S5, restated on round 03 §5 (P28.S3) — the list-level branded not-found.
// Reached by the documents page's `loadDocuments` calling `notFound()` when a
// hand-crafted `?project=` filter is malformed / cross-tenant (400/404 both map
// here so ids cannot be probed — 404-never-403).
//
// It is now EDITORIAL, not `.kb-empty`. §5.3 draws the whole distinction:
// **editorial = the page failed · panel = a part of the page is waiting**, and a
// 404 is a page failure. The lucide mark is gone with it — §5.1's editorial is
// explicitly "no panel, no illustration" — as is the inline 3.6rem padding the
// `.kb-editorial` clamp now owns. The copy is UNCHANGED: `filterNotFound` already
// carries the title, sub and the nearest-list CTA §5.1 asks a 404 to offer.
//
// Renders inside the `(app)` shell's `.kb-app-main`, so the topbar, navbar and
// rail all stay — and therefore renders only the block, never a second `<main>`.
export default function DocumentsNotFound() {
  return (
    <Editorial
      code={STATES.notFoundCode}
      title={DOCUMENTS.filterNotFound.title}
      sub={DOCUMENTS.filterNotFound.sub}
      actions={
        <Link href="/documents" className={appButtonClass("primary")}>
          {DOCUMENTS.filterNotFound.backLabel}
        </Link>
      }
    />
  );
}
