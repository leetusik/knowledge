/**
 * P30.S24 — the loading state's card-shaped skeleton (`08-review` §6, board 17): the kind, the
 * source, two question lines (95% and 70%), a hint and four option bars of `kb-tap` height,
 * indented by the grading margin. The signed `.rd-skel`, held still under reduced motion.
 *
 * A server component with NO client import on purpose: `loading.tsx` draws it too, and Next
 * emits the `<script>` of every client chunk a loading file reaches without the nonce
 * (`topics/notes-later.md` → *The book page as shipped*).
 */
export function CardSkeleton() {
  return (
    <div className="rv-sk" aria-hidden="true">
      <span className="rd-skel rv-sk__kind" />
      <span className="rd-skel rv-sk__src" />
      <span className="rd-skel rv-sk__q rv-sk__w95" />
      <span className="rd-skel rv-sk__q rv-sk__w70" />
      <div className="rv-sk__opts">
        <span className="rd-skel rv-sk__hint" />
        <span className="rd-skel rv-sk__opt" />
        <span className="rd-skel rv-sk__opt" />
        <span className="rd-skel rv-sk__opt" />
        <span className="rd-skel rv-sk__opt" />
      </div>
    </div>
  );
}
