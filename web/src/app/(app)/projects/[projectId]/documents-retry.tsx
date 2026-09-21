"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { AppButton } from "@/components/ui";
import { STATES } from "@/content";

/**
 * The one `sm` Retry round 04 §4.6 requires on the project documents panel's
 * in-panel failure block — and the one mechanism the signed record leaves open.
 *
 * §4.6 says the failed documents fetch renders round 03 §5.2's in-frame block "with
 * one `sm` Retry", but §5.2 designs that block for a PANEL, not for an error
 * boundary, and outside a boundary there is no `reset()` to call. P28.S3 therefore
 * built `<Editorial variant="panel">` and deliberately wired it to nothing, because
 * a Retry that does nothing is worse than no Retry at all.
 *
 * `router.refresh()` is the mechanism, and it is the only sensible one here: the
 * panel is rendered by a SERVER component, so "retry" can only mean "ask the server
 * to render this route again". It re-runs the route's server components — including
 * the `Promise.all` this panel's fetch sits in — without touching the browser's
 * scroll position, the URL or any client state, and the knowledge client is
 * `cache: "no-store"`, so the refetch really does hit the API again rather than
 * replaying a cached response. On success the panel comes back with rows; on a
 * second failure the same block re-renders. It invents no visual decision: the
 * button is §4.6's own `sm` control, wearing round 03 §4.9's busy affordance while
 * the refresh is in flight.
 *
 * `useTransition` is what makes that affordance possible — `router.refresh()` alone
 * returns nothing to await — and its pending flag doubles as the double-submit
 * guard (`busy` deliberately does not `disable`, so the early return is here).
 */
export function DocumentsRetryButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <AppButton
      variant="primary"
      size="sm"
      busy={pending}
      onClick={() => {
        if (pending) return;
        startTransition(() => {
          router.refresh();
        });
      }}
    >
      {STATES.error.retryLabel}
    </AppButton>
  );
}
