import Link from "next/link";

import { Editorial } from "@/components/states";
import { OptionalShell } from "@/components/states/optional-shell";
import { appButtonClass } from "@/components/ui";
import { DOCUMENTS, STATES } from "@/content";

// P25.S3, restated on round 03 §5 (P28.S3) — the branded not-found for the
// PRETTY share URL. Reached by the page's `@`-prefix guard (this route is the
// catch-all for every unmatched three-segment URL) and by `loadDocument`'s
// `notFound()` for the resolver's one indistinguishable 404 — unknown org slug,
// unknown project, unknown doc slug and a private project all land here, so
// existence never leaks.
//
// EDITORIAL now, not `.kb-empty` (§5.3), and it brings a shell: `(public)` has
// no `layout.tsx`, so this page used to render bare on `<body>` with no topbar,
// which is not "the shell stays" by any reading. `<OptionalShell>` mirrors the
// page's own `optionalIdentity()` branch — member → `<AppShell>` with the rail,
// stranger → `<PublicShell>`.
//
// The ONE deliberate difference from the id sibling is kept: the CTA points at
// `/`, not at the member-gated `/documents` list, and it points there for BOTH
// branches. This is the surface strangers arrive on from a shared link, and
// `publicNotFound` — unchanged here — has only ever carried the one home label.
export default function PrettyDocumentNotFound() {
  return (
    <OptionalShell>
      {() => (
        <Editorial
          code={STATES.notFoundCode}
          title={DOCUMENTS.publicNotFound.title}
          sub={DOCUMENTS.publicNotFound.sub}
          actions={
            <Link href="/" className={appButtonClass("primary")}>
              {DOCUMENTS.publicNotFound.homeLabel}
            </Link>
          }
        />
      )}
    </OptionalShell>
  );
}
