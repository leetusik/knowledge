/**
 * Round 03 §5.5 — the toast region.
 *
 * WHERE it mounts is the whole point of the section, and it is a structural
 * constraint rather than a preference: `.kb-app` declares
 * `container: kbapp / inline-size` (§3), and a container is a containing block
 * for `position: fixed` descendants — so a toast inside `.kb-app` would pin to
 * the bottom of the DOCUMENT instead of the bottom of the SCREEN. It therefore
 * renders as a ROOT-LEVEL SIBLING of `.kb-app` (see `app-shell.tsx`), carries the
 * scheme attributes itself since it is outside the shell that normally supplies
 * them, and is the one rule in round 03 that queries the VIEWPORT (`@media`) —
 * which is what an overlay should query. On a phone §3 lifts it above the
 * navbar rather than over it.
 *
 * The region is rendered EMPTY and always present: an `aria-live` region has to
 * be in the DOM before the message arrives, or the announcement is lost.
 *
 * NOTHING EMITS A TOAST TODAY. Round 03 §5.5 specifies the region and the toast
 * markup and nothing else — no producer, no trigger, no dismiss affordance, no
 * timing. This slice builds exactly what is designed and invents none of that;
 * the existing inline form errors were deliberately NOT migrated into it.
 */
export function ToastRegion() {
  return (
    <div
      className="kb-toast-region"
      role="status"
      aria-live="polite"
      data-md-color-scheme="default"
      data-kb-scheme="auto"
    />
  );
}
