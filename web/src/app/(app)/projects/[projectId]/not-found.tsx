import Link from "next/link";

import { Editorial } from "@/components/states";
import { appButtonClass } from "@/components/ui";
import { PROJECT, STATES } from "@/content";

// P12.S4, restated on round 03 §5 (P28.S3) — the branded project not-found.
// Rendered by `loadProject`'s `notFound()` for a missing / cross-tenant /
// non-UUID id (all map here so ids cannot be probed — 404-never-403).
//
// Now EDITORIAL rather than `.kb-empty` (§5.3: editorial = the page failed),
// so the `FolderX` mark and the inline 3.6rem padding are gone. The copy is
// unchanged — `PROJECT.notFound` already offers Dashboard, the nearest list
// §5.1 wants a 404 to point at. The `(app)` shell supplies the `<main>`.
export default function ProjectNotFound() {
  return (
    <Editorial
      code={STATES.notFoundCode}
      title={PROJECT.notFound.title}
      sub={PROJECT.notFound.sub}
      actions={
        <Link href="/dashboard" className={appButtonClass("primary")}>
          {PROJECT.notFound.backLabel}
        </Link>
      }
    />
  );
}
