import Link from "next/link";

import { SearchX } from "lucide-react";

import { appButtonClass } from "@/components/ui";
import { DOCUMENTS } from "@/content";

// P12.S5 — the list-level branded not-found, on the designed `.kb-empty` empty-state
// classes. Reached by the documents page's `loadDocuments` calling `notFound()` when
// a hand-crafted `?project=` filter is malformed / cross-tenant (400/404 both map
// here so ids cannot be probed — 404-never-403). Renders inside the `(app)` shell's
// `.kb-app-main`, so the topbar + rail stay in place.
export default function DocumentsNotFound() {
  return (
    <div
      className="kb-empty"
      style={{ paddingTop: "3.6rem", paddingBottom: "3.6rem" }}
    >
      <span className="kb-empty__mark">
        <SearchX size={22} aria-hidden />
      </span>
      <h1 className="kb-empty__title">{DOCUMENTS.filterNotFound.title}</h1>
      <p className="kb-empty__sub">{DOCUMENTS.filterNotFound.sub}</p>
      <Link
        href="/documents"
        className={appButtonClass("secondary", "sm")}
        style={{ marginTop: "0.5rem" }}
      >
        {DOCUMENTS.filterNotFound.backLabel}
      </Link>
    </div>
  );
}
