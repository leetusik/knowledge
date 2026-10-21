import { LIBRARY } from "@/content";

function Rows({ n, three }: { n: number; three?: boolean }) {
  return (
    <div className="lib-sk__rows">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="lib-sk__row">
          {three ? <span className="lib-skel lib-sk__l1" /> : null}
          <span className="lib-skel lib-sk__l2" />
          <span className="lib-skel lib-sk__l3" />
        </div>
      ))}
    </div>
  );
}

/**
 * The loading state (`06-library` §9, board 13): a skeleton that mirrors the page at its
 * width, using the page's own grid classes so it re-flows with it. `/library` adds the
 * Continue section (heading bar, the lead block and three rows of three lines, side by
 * side from `kbmain` 60rem) and the shelves' control; `/@{org}` is the head and the shelves.
 * The sheen moves 1.4s and is still under reduced motion.
 */
export function LibrarySkeleton({ route }: { route: "library" | "public" }) {
  const member = route === "library";
  return (
    <div
      className="lib"
      data-lib
      role="status"
      aria-label={LIBRARY.states.loading}
    >
      <div className="lib-head">
        <span className="lib-skel lib-sk__title" />
        <span className="lib-skel lib-sk__sub" />
      </div>
      {member ? (
        <div className="lib-sec">
          <div className="lib-sec__head">
            <span className="lib-skel lib-sk__h2" />
          </div>
          <div className="lib-cont lib-cont--many">
            <span className="lib-skel lib-sk__lead" />
            <Rows n={3} three />
          </div>
        </div>
      ) : null}
      <div className="lib-sec">
        {member ? (
          <div className="lib-sec__head">
            <span className="lib-skel lib-sk__h2" />
            <span className="lib-skel lib-sk__seg" />
          </div>
        ) : null}
        <div className="lib-group">
          <span className="lib-skel lib-sk__shelf" />
          <div className="lib-books">
            <span className="lib-skel lib-sk__card" />
            <span className="lib-skel lib-sk__card" />
            <span className="lib-skel lib-sk__card" />
          </div>
        </div>
        <div className="lib-group">
          <span className="lib-skel lib-sk__shelf" />
          <Rows n={2} />
        </div>
      </div>
    </div>
  );
}
