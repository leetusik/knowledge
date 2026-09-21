import {
  LoadingRegion,
  SkelBlock,
  SkelPageHead,
  SkelPanel,
  SkelTable,
  SkelTiles,
} from "@/components/states";

// Round 03 §5.4 (P28.S3) — the project detail skeleton, mirroring the page it
// replaces: the `.kb-pageframe` head with its actions slot (visibility toggle +
// mint), the project's own four usage tiles in the real `.kb-tile-grid`, the
// 120px trend figure, and the credentials table panel.
export default function ProjectLoading() {
  return (
    <LoadingRegion>
      <SkelPageHead withAction />

      <SkelTiles />

      <div className="kb-panel" style={{ marginTop: "var(--kb-space-md)" }}>
        <div className="mb-[0.3rem] flex items-baseline justify-between gap-4">
          <div className="kb-skel kb-skel-line w-[7rem]" />
          <div className="kb-skel kb-skel-line w-[9rem]" />
        </div>
        {/* `.kb-trend-wrap`, not a fixed 120px — see the dashboard skeleton. */}
        <SkelBlock className="mt-[0.3rem] kb-trend-wrap" />
      </div>

      <SkelPanel className="mt-[var(--kb-space-md)]">
        <SkelTable rows={4} />
      </SkelPanel>
    </LoadingRegion>
  );
}
