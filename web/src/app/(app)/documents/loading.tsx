import {
  LoadingRegion,
  SkelPageHead,
  SkelPanel,
  SkelTable,
} from "@/components/states";

// Round 03 §5.4 (P28.S3) — the documents list skeleton: the `.kb-pageframe`
// head (this page has no actions slot), the `.kb-searchbar` row, the mono hint
// line, and the list panel. The table stand-in is §5.4's own reading — the
// bordered stack of rows a `.kb-dtable` is on a desktop, and its card-shaped
// 7rem blocks below 40rem, where `.kb-dtable` itself stacks into cards.
export default function DocumentsLoading() {
  return (
    <LoadingRegion>
      <SkelPageHead />

      <div className="kb-searchbar mt-[var(--kb-space-md)]">
        <div className="kb-searchbar__field">
          <div className="kb-skel h-[var(--kb-tap)] w-full" />
        </div>
        <div className="kb-searchbar__filter">
          <div className="kb-skel h-[var(--kb-tap)] w-full" />
        </div>
      </div>
      <div className="kb-skel kb-skel-line mt-[0.6rem] mb-[0.5rem] w-[16rem] max-w-full" />

      <SkelPanel>
        <SkelTable rows={6} />
      </SkelPanel>
    </LoadingRegion>
  );
}
