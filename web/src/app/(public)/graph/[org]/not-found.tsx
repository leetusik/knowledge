import Link from "next/link";

import { Share2 } from "lucide-react";

import { appButtonClass } from "@/components/ui";
import { GRAPH } from "@/content";

// P19 — the public-graph branded not-found, on the designed `.kb-empty` empty-state
// classes (modeled on the doc read view's not-found). Reached by the page's
// `notFound()` for a malformed org id OR an org with no public projects (which also
// covers a nonexistent org — 404-never-403, so the two are indistinguishable). It
// links back to the marketing home rather than a member surface.
export default function PublicGraphNotFound() {
  return (
    <div
      className="kb-empty"
      style={{ paddingTop: "3.6rem", paddingBottom: "3.6rem" }}
    >
      <span className="kb-empty__mark">
        <Share2 size={22} aria-hidden />
      </span>
      <h1 className="kb-empty__title">{GRAPH.notFound.title}</h1>
      <p className="kb-empty__sub">{GRAPH.notFound.sub}</p>
      <Link
        href="/"
        className={appButtonClass("secondary", "sm")}
        style={{ marginTop: "0.5rem" }}
      >
        {GRAPH.notFound.backLabel}
      </Link>
    </div>
  );
}
