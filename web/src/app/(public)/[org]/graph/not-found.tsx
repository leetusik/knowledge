import Link from "next/link";

import { PublicShell } from "@/components/public-shell";
import { Editorial } from "@/components/states";
import { appButtonClass } from "@/components/ui";
import { GRAPH, STATES } from "@/content";

// P25.S4, restated on round 03 §5 (P28.S3) — the branded not-found for the
// PRETTY public graph URL `/@{org}/graph`. Reached by the page's `@`-prefix
// guard (this route catches every unmatched `/x/graph`) and by `loadGraph`'s
// `notFound()` for the one indistinguishable 404 — an unknown, unclaimed,
// reserved or malformed org slug and an org with no public projects all land
// here, so existence never leaks.
//
// EDITORIAL now, not `.kb-empty` (§5.3: a 404 is a page failure), and it brings
// a shell: `(public)` has no `layout.tsx`, so this used to render bare on
// `<body>` — no topbar, nothing — which is the opposite of §5.1's "the shell
// stays". `<PublicShell>` unconditionally, and NOT the runtime pick the two
// document not-founds make, because THIS route's page renders `<PublicShell>`
// unconditionally too: a member browsing an org's public graph is looking at the
// public surface, and the 404 should not suddenly hand them a rail the page
// itself would not have given them.
//
// The CTA is unchanged and still the marketing home rather than a member
// surface: a shared link's audience is mostly anonymous strangers.
export default function PrettyPublicGraphNotFound() {
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
