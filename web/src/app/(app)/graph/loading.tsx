import { LoadingRegion, SkelBlock, SkelPageHead } from "@/components/states";

// Round 03 §5.4 (P28.S3) — the graph skeleton. One page-frame head plus one
// plate: the graph is a single sized canvas, so mirroring "the layout it
// replaces" means one block at the plate's own height rather than tiles or rows.
//
// The height is `.kb-graph`'s, quoted from its source (`app/(app)/graph/graph.css:27`)
// rather than re-derived, and written as a markup style rather than a new rule —
// `graph.css` is component-imported by `graph-canvas.tsx`, which this file must
// not pull in just to borrow one declaration.
export default function GraphLoading() {
  return (
    <LoadingRegion>
      <SkelPageHead withAction />
      <SkelBlock
        style={{
          height: "calc(100dvh - var(--kb-app-topbar-h) - 13rem)",
          minHeight: "30rem",
        }}
      />
    </LoadingRegion>
  );
}
