"use client";

import { useEffect, useId, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { LIBRARY } from "@/content";
import { clearAllReadingData } from "@/lib/library/actions";

type Phase = "rest" | "confirm" | "clearing" | "cleared" | "failed";

/**
 * "Your reading data" and Clear all (`06-library` §8, board 12), at the foot of `/library`.
 * An inline two-step in the console's `kb-confirm` family, not a dialog:
 *
 *  - rest: the secondary button; confirm: a panel (`role="group"`) whose Cancel takes the
 *    focus; Escape or Cancel closes it and returns the focus to the button;
 *  - clearing: the danger button keeps its width (both labels share one grid cell), shows a
 *    spinner and "Clearing…" with `aria-busy`; Cancel is disabled; focus stays put;
 *  - cleared: the status line (`role="status"`) takes the focus and the page re-reads;
 *  - failed: the panel stays open with an alert line and "ref · {id}"; pressing the danger
 *    button again retries.
 *
 * Focus follows a press made here only (`want`), never a render the page itself caused.
 */
export function ClearAll() {
  const router = useRouter();
  const uid = useId();
  const [phase, setPhase] = useState<Phase>("rest");
  const [ref, setRef] = useState<string>("");
  const want = useRef(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const done = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!want.current || phase === "clearing") return;
    want.current = false;
    const target =
      phase === "confirm"
        ? cancel.current
        : phase === "cleared"
          ? done.current
          : phase === "rest"
            ? trigger.current
            : null;
    target?.focus();
  }, [phase]);

  const busy = phase === "clearing";

  function start() {
    want.current = true;
    setPhase("confirm");
  }
  function close() {
    if (busy) return;
    want.current = true;
    setPhase("rest");
  }
  async function confirm() {
    if (busy) return;
    setPhase("clearing");
    const result = await clearAllReadingData();
    if (result.ok) {
      want.current = true;
      setPhase("cleared");
      router.refresh();
    } else {
      setRef(result.ref);
      setPhase("failed");
    }
  }

  const open =
    phase === "confirm" || phase === "clearing" || phase === "failed";
  return (
    <section className="lib-data" aria-labelledby={`${uid}-h`}>
      <h2 className="lib-h2" id={`${uid}-h`}>
        {LIBRARY.data.heading}
      </h2>
      <p className="lib-data__lead">{LIBRARY.data.lead}</p>
      {phase === "cleared" ? (
        <p className="lib-data__done" role="status" tabIndex={-1} ref={done}>
          <b>{LIBRARY.data.clearedLead}</b>
          <span>{LIBRARY.data.clearedRest.trim()}</span>
        </p>
      ) : null}
      {!open ? (
        <button
          type="button"
          className="lib-btn lib-btn--secondary"
          ref={trigger}
          onClick={start}
        >
          {LIBRARY.data.clear}
        </button>
      ) : (
        <div
          className="lib-confirm"
          role="group"
          aria-labelledby={`${uid}-t`}
          onKeyDown={(e) => {
            if (e.key === "Escape" && !busy) {
              e.preventDefault();
              close();
            }
          }}
        >
          {phase === "failed" ? (
            <p className="lib-confirm__error" role="alert">
              <b>{LIBRARY.data.failedLead}</b>
              {LIBRARY.data.failedRest}
            </p>
          ) : null}
          <p className="lib-confirm__title" id={`${uid}-t`}>
            {LIBRARY.data.confirmTitle}
          </p>
          <p className="lib-confirm__text">{LIBRARY.data.removes}</p>
          <ul className="lib-confirm__list">
            {LIBRARY.data.list.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="lib-confirm__keep">{LIBRARY.data.keeps}</p>
          <div className="lib-confirm__actions">
            <button
              type="button"
              className="lib-btn lib-btn--secondary"
              ref={cancel}
              disabled={busy}
              onClick={close}
            >
              {LIBRARY.data.cancel}
            </button>
            <button
              type="button"
              className="lib-btn lib-btn--danger"
              aria-busy={busy ? "true" : "false"}
              onClick={confirm}
            >
              <span className="lib-btn__labels">
                <span className={busy ? "is-off" : undefined}>
                  {LIBRARY.data.confirm}
                </span>
                <span
                  className={busy ? undefined : "is-off"}
                  aria-hidden={busy ? "false" : "true"}
                >
                  <span className="lib-spin" aria-hidden="true" />
                  {LIBRARY.data.clearing}
                </span>
              </span>
            </button>
          </div>
          {phase === "failed" ? (
            <p className="lib-ref">{LIBRARY.data.ref(ref)}</p>
          ) : null}
        </div>
      )}
    </section>
  );
}
