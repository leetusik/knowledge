"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { BOOK } from "@/content/book";
import { clearBookReadingData } from "@/lib/book/actions";

type Phase = "idle" | "confirm" | "pending" | "failed" | "done";
type Want = "cancel" | "trigger" | "done" | null;

const T = BOOK.data;

/**
 * Your reading data (`07-book-page` §7, `ClearData`, board 10): "Clear this book's reading
 * data" behind the product's inline two-step (an in-place confirmation, not a dialog).
 *
 *  - idle: the lead and the trigger (the reader's ghost button in the revoked ink);
 *  - confirm: a group with hairlines, named by its question, listing what goes. Focus lands
 *    on Cancel (never the danger button) and the section is brought into view by the least
 *    distance; Escape or Cancel closes it and returns focus to the trigger;
 *  - pending: "Clearing…" in the danger button (both labels share one cell, so it keeps its
 *    width), `aria-busy`; a second press and Escape do nothing; Cancel steps out of view and
 *    keeps its place (`visibility: hidden`, `aria-hidden`, `tabindex=-1`);
 *  - failed: the group stays with the alert line (brought into view too); the danger button is the
 *    retry, Cancel comes back;
 *  - done: the group and the trigger go; the status line takes focus and the page re-reads
 *    (`router.refresh()`), so every row reads Not started and Continue reading starts over.
 *
 * Focus moves only after a press made inside this part (`want`), never when the page is
 * rendered straight into a state, and focus itself never scrolls (`preventScroll`); only
 * the least-distance reveal does. The section stays through the refresh until the reader
 * leaves the page, even though the server no longer has data to offer (`data` is null then).
 */
export function ClearData({
  org,
  project,
  book,
  title,
  data,
}: {
  org: string;
  project: string;
  book: string;
  title: string;
  data: { chapters: number; marks: number } | null;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const want = useRef<Want>(null);
  const section = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const done = useRef<HTMLParagraphElement>(null);
  // What the confirmation lists is what the page had when it was asked (the refresh after a
  // clear empties `data`, and a failed retry should still read the same).
  const [info] = useState(data);

  useEffect(() => {
    const reveal = () => section.current?.scrollIntoView({ block: "nearest" });
    const w = want.current;
    if (w === "cancel" && phase === "confirm" && cancel.current) {
      cancel.current.focus({ preventScroll: true });
      reveal();
    }
    if (w === "trigger" && phase === "idle" && trigger.current) {
      trigger.current.focus({ preventScroll: true });
    }
    if (w === "done" && phase === "done" && done.current) {
      done.current.focus({ preventScroll: true });
      reveal();
    }
    // Undrawn, nearest drawn pattern: the alert line opens under the actions, so it is brought
    // into view by the same least-distance reveal (focus stays on the danger button).
    if (phase === "failed") reveal();
    if (!(w === "done" && phase === "pending")) want.current = null;
  }, [phase]);

  const busy = phase === "pending";

  function ask() {
    want.current = "cancel";
    setPhase("confirm");
  }
  function close() {
    if (busy) return;
    want.current = "trigger";
    setPhase("idle");
  }
  async function confirm() {
    if (busy) return;
    want.current = "done";
    setPhase("pending");
    let ok = false;
    try {
      ok = (await clearBookReadingData({ org, project, book })).ok;
    } catch {
      ok = false;
    }
    if (ok) {
      setPhase("done");
      router.refresh();
    } else {
      setPhase("failed");
    }
  }

  if (!info && phase === "idle") return null;

  const asking =
    phase === "confirm" || phase === "pending" || phase === "failed";
  return (
    <section className="bk-clear" ref={section} aria-labelledby="bk-clear-h">
      <h2 className="bk-clear__title" id="bk-clear-h">
        {T.title}
      </h2>
      {phase === "idle" ? (
        <>
          <p className="bk-clear__lead">{T.lead}</p>
          <button
            type="button"
            className="rd-btn rd-btn--ghost bk-del"
            ref={trigger}
            onClick={ask}
          >
            {T.trigger}
          </button>
        </>
      ) : null}
      {asking ? (
        <div
          className="bk-confirm"
          role="group"
          aria-label={T.question}
          onKeyDown={(e) => {
            if (e.key === "Escape" && !busy) {
              e.preventDefault();
              close();
            }
          }}
        >
          <p className="bk-confirm__q">{T.question}</p>
          <p className="bk-confirm__p">
            {T.removesLead}
            <b>{title}</b>
            {T.removesTail}
          </p>
          <ul className="bk-confirm__list">
            <li>{T.place(info?.chapters ?? 0)}</li>
            {info && info.marks > 0 ? <li>{T.marks(info.marks)}</li> : null}
            <li>{T.quiz}</li>
          </ul>
          <p className="bk-confirm__p">{T.keeps}</p>
          <div className="bk-confirm__actions">
            <button
              type="button"
              className={
                busy ? "rd-btn rd-btn--ghost bk-hold" : "rd-btn rd-btn--ghost"
              }
              ref={cancel}
              aria-hidden={busy ? true : undefined}
              tabIndex={busy ? -1 : undefined}
              onClick={close}
            >
              {T.cancel}
            </button>
            <button
              type="button"
              className="rd-btn bk-danger"
              aria-busy={busy ? true : undefined}
              onClick={() => void confirm()}
            >
              <span className="bk-stack">
                <span className={busy ? "is-off" : undefined}>{T.confirm}</span>
                <span className={busy ? undefined : "is-off"}>
                  {T.clearing}
                </span>
              </span>
            </button>
          </div>
          {phase === "failed" ? (
            <p className="bk-confirm__err" role="alert">
              <b>{T.failedLead}</b>
              {T.failedRest}
            </p>
          ) : null}
        </div>
      ) : null}
      {phase === "done" ? (
        <p className="bk-clear__done" role="status" tabIndex={-1} ref={done}>
          <b>{T.doneLead}</b>
          {T.doneRest}
        </p>
      ) : null}
    </section>
  );
}
