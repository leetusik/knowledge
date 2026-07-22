import Link from "next/link";

import { FileX } from "lucide-react";

import { appButtonClass } from "@/components/ui";
import { DOCUMENTS } from "@/content";

// P12.S5 — the read-view branded not-found, on the designed `.kb-empty` empty-state
// classes. Reached by `loadDocument`'s `notFound()` for a missing / cross-tenant /
// non-integer id (all map here so ids cannot be probed — 404-never-403). Renders
// inside the `(app)` shell's `.kb-app-main`, so the topbar + rail stay in place.
export default function DocumentNotFound() {
  return (
    <div
      className="kb-empty"
      style={{ paddingTop: "3.6rem", paddingBottom: "3.6rem" }}
    >
      <span className="kb-empty__mark">
        <FileX size={22} aria-hidden />
      </span>
      <h1 className="kb-empty__title">{DOCUMENTS.notFound.title}</h1>
      <p className="kb-empty__sub">{DOCUMENTS.notFound.sub}</p>
      <Link
        href="/documents"
        className={appButtonClass("secondary", "sm")}
        style={{ marginTop: "0.5rem" }}
      >
        {DOCUMENTS.notFound.backLabel}
      </Link>
    </div>
  );
}
