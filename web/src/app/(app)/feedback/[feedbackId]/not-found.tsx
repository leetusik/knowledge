import Link from "next/link";

import { Editorial } from "@/components/states";
import { appButtonClass } from "@/components/ui";
import { FEEDBACK, STATES } from "@/content";

// The record-level not-found: missing, malformed, or another org's record all
// land here alike (404-never-403, so ids cannot be probed). The project page's
// editorial, with this surface's copy.
export default function FeedbackDetailNotFound() {
  return (
    <Editorial
      code={STATES.notFoundCode}
      title={FEEDBACK.notFound.title}
      sub={FEEDBACK.notFound.sub}
      actions={
        <Link href="/feedback" className={appButtonClass("primary")}>
          {FEEDBACK.notFound.backLabel}
        </Link>
      }
    />
  );
}
