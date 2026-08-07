import Link from "next/link";

import { Share2 } from "lucide-react";

import { appButtonClass } from "@/components/ui";
import { GRAPH } from "@/content";

// P25.S4 — the branded not-found for the PRETTY public graph URL `/@{org}/graph`,
// on the same designed `.kb-empty` classes as the UUID page's. Reached by the page's
// `@`-prefix guard (this route catches every unmatched `/x/graph`) and by `loadGraph`'s
// `notFound()` for the one indistinguishable 404 — an unknown, unclaimed, reserved or
// malformed org slug and an org with no public projects all land here, so existence
// never leaks. It links back to the marketing home rather than a member surface: a
// shared link's audience is mostly anonymous strangers.
export default function PrettyPublicGraphNotFound() {
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
