import Link from "next/link";

import { FileX } from "lucide-react";

import { appButtonClass } from "@/components/ui";
import { DOCUMENTS } from "@/content";

// P25.S3 — the branded not-found for the PRETTY share URL, on the same designed
// `.kb-empty` empty-state classes as the id page's. Reached by the page's `@`-prefix
// guard (this route is the catch-all for every unmatched three-segment URL) and by
// `loadDocument`'s `notFound()` for the resolver's one indistinguishable 404 — unknown
// org slug, unknown project, unknown doc slug and a private project all land here, so
// existence never leaks.
//
// The ONE deliberate difference from the sibling: the CTA points at `/`, not at the
// member-gated `/documents` list. This is the surface strangers arrive on from a
// shared link, and most of them have no session — sending them to a page that bounces
// to /login would be a dead end.
export default function PrettyDocumentNotFound() {
  return (
    <div
      className="kb-empty"
      style={{ paddingTop: "3.6rem", paddingBottom: "3.6rem" }}
    >
      <span className="kb-empty__mark">
        <FileX size={22} aria-hidden />
      </span>
      <h1 className="kb-empty__title">{DOCUMENTS.publicNotFound.title}</h1>
      <p className="kb-empty__sub">{DOCUMENTS.publicNotFound.sub}</p>
      <Link
        href="/"
        className={appButtonClass("secondary", "sm")}
        style={{ marginTop: "0.5rem" }}
      >
        {DOCUMENTS.publicNotFound.homeLabel}
      </Link>
    </div>
  );
}
