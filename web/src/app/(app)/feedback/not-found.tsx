import Link from "next/link";

import { Editorial } from "@/components/states";
import { appButtonClass } from "@/components/ui";
import { FEEDBACK, STATES } from "@/content";

// The list-level not-found: the list page's `loadFeedback` calls `notFound()` when
// the API refuses a hand-made filter (a project outside the org, a malformed id,
// rating or cursor). The Documents list's editorial, with this surface's copy.
// Renders inside the `(app)` shell, so only the block, never a second `<main>`.
export default function FeedbackNotFound() {
  return (
    <Editorial
      code={STATES.notFoundCode}
      title={FEEDBACK.filterNotFound.title}
      sub={FEEDBACK.filterNotFound.sub}
      actions={
        <Link href="/feedback" className={appButtonClass("primary")}>
          {FEEDBACK.filterNotFound.backLabel}
        </Link>
      }
    />
  );
}
