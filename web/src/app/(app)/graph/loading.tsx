import { LoadingRegion, SkelPageHead } from "@/components/states";

// Round 03 §5.4 (P28.S3) + round 05 §4.8/§6.7 (P28.S6) — the graph skeleton. One
// page-frame head plus one plate: the graph is a single sized canvas, so mirroring
// "the layout it replaces" means one block at the plate's own height.
//
// P28.S6 changed two things here, neither a visual decision:
//
//  1. The height is no longer quoted at all. It used to be copied out of
//     `graph.css:27` as an inline style, because `graph.css` was a COMPONENT import
//     and this file must not pull the engine in just to borrow one declaration.
//     P28.S6 moved the three graph sheets into the `globals.css` chain, so the
//     skeleton can simply wear `.kb-graph` and inherit round 05 §3's real sizing —
//     including the phone (26rem) and tablet (30rem) `@container kbapp` rules a
//     single copied `clamp()` could never have reproduced.
//  2. Round 05 §4.8 names what the plate shows while the payload is unresolved —
//     "one pulsing mark and `Drawing the map`, no skeleton nodes" — and §6.7 draws
//     it. A Next route-level `loading.tsx` IS this app's "payload not yet resolved"
//     moment (the engine itself receives `data` already resolved, as a prop), so
//     the designed state lands here rather than nowhere. The classes are round
//     05's own; the reduced-motion guard is inside §3's stylesheet.
export default function GraphLoading() {
  return (
    <LoadingRegion>
      <SkelPageHead withAction />
      <div className="kb-graph">
        <div className="kb-graph-empty kb-graph-empty--load">
          <div className="kb-graph-skel">
            <span className="kb-graph-skel__dot" />
          </div>
          <div className="kb-graph-empty__sub">
            Drawing the map · 지도를 그리는 중
          </div>
        </div>
      </div>
    </LoadingRegion>
  );
}
