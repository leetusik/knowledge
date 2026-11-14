import {
  LoadingRegion,
  SkelPageHead,
  SkelPanel,
  SkelTable,
} from "@/components/states";

// The Feedback list's skeleton, the Documents list's own shapes: the page frame,
// the `.kb-searchbar` row (the search field and its two filters), the hint line
// and the results panel.
export default function FeedbackLoading() {
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
