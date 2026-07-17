import Link from "next/link";

import { FolderX } from "lucide-react";

import { appButtonClass } from "@/components/ui";
import { PROJECT } from "@/content";

// P12.S4 — the branded project not-found, on the designed `.kb-empty` empty-state
// classes rather than Next's raw default. Rendered by `loadProject`'s `notFound()`
// for a missing / cross-tenant / non-UUID id (all map here so ids cannot be probed
// — 404-never-403). It renders inside the `(app)` shell's `.kb-app-main`, so the
// topbar + rail stay in place.
export default function ProjectNotFound() {
  return (
    <div className="kb-empty" style={{ paddingTop: "3.6rem", paddingBottom: "3.6rem" }}>
      <span className="kb-empty__mark">
        <FolderX size={22} aria-hidden />
      </span>
      <h1 className="kb-empty__title">{PROJECT.notFound.title}</h1>
      <p className="kb-empty__sub">{PROJECT.notFound.sub}</p>
      <Link
        href="/dashboard"
        className={appButtonClass("secondary", "sm")}
        style={{ marginTop: "0.5rem" }}
      >
        {PROJECT.notFound.backLabel}
      </Link>
    </div>
  );
}
