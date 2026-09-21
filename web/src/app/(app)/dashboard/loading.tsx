import {
  LoadingRegion,
  SkelBlock,
  SkelPageHead,
  SkelPanel,
  SkelTable,
  SkelTiles,
} from "@/components/states";

// Round 03 §5.4 (P28.S3) — the dashboard's streaming skeleton. It mirrors the
// layout it replaces, block for block: the `.kb-pageframe` head with its action
// slot (the create-project disclosure), the four usage tiles in the very grid
// `<StatTiles>` uses — so they are 4-up on a desktop and 2-up on a phone with no
// new rule — the trend figure at its real 120px, and the two `.kb-app-cols`
// panels, which stack when `kbmain` crosses 64rem exactly as the real page does.
//
// `aria-busy` is on the region, not on each block (§5.4). The shimmer is already
// reduced-motion-safe at `kb-console.css:172`, so nothing extra is guarded here.
export default function DashboardLoading() {
  return (
    <LoadingRegion>
      <SkelPageHead withAction />

      <SkelTiles />

      <div className="kb-panel" style={{ marginTop: "var(--kb-space-md)" }}>
        <div className="mb-[0.3rem] flex items-baseline justify-between gap-4">
          <div className="kb-skel kb-skel-line w-[7rem]" />
          <div className="kb-skel kb-skel-line w-[9rem]" />
        </div>
        {/* The real figure is `h-[120px]` on both dashboard and project page. */}
        <SkelBlock className="mt-[0.3rem] h-[120px]" />
      </div>

      <div className="kb-app-cols mt-[var(--kb-space-md)]">
        <SkelPanel>
          <SkelTable rows={4} />
        </SkelPanel>
        <SkelPanel>
          <div className="kb-skel kb-skel-line mt-[0.2rem] w-full" />
          <div className="kb-skel kb-skel-line w-[80%]" />
          <div className="kb-skel kb-skel-line w-[90%]" />
          <div className="kb-skel kb-skel-line w-[70%]" />
        </SkelPanel>
      </div>
    </LoadingRegion>
  );
}
