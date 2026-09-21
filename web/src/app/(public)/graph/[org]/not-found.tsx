import Link from "next/link";

import { PublicShell } from "@/components/public-shell";
import { Editorial } from "@/components/states";
import { appButtonClass } from "@/components/ui";
import { GRAPH, STATES } from "@/content";

// P19, restated on round 03 §5 (P28.S3) — the UUID public-graph branded
// not-found. Reached by the page's `notFound()` for a malformed org id OR an org
// with no public projects (which also covers a nonexistent org — 404-never-403,
// so the two are indistinguishable).
//
// EDITORIAL now, not `.kb-empty` (§5.3), and it brings a shell for the same
// reason as its pretty-URL twin: `(public)` has no `layout.tsx`, so this file
// used to render bare on `<body>`. `<PublicShell>` unconditionally, mirroring
// this route's own page. The CTA is unchanged — the marketing home, not a member
// surface.
export default function PublicGraphNotFound() {
  return (
    <PublicShell>
      <Editorial
        code={STATES.notFoundCode}
        title={GRAPH.notFound.title}
        sub={GRAPH.notFound.sub}
        actions={
          <Link href="/" className={appButtonClass("primary")}>
            {GRAPH.notFound.backLabel}
          </Link>
        }
      />
    </PublicShell>
  );
}
