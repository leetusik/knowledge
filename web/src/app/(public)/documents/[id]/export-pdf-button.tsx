"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { AppButton } from "@/components/ui";
import { DOCUMENTS } from "@/content";

import { PRINT_DATE_ATTR } from "./print-blocks";

/**
 * P28.S8 — round 06 §5's Export PDF control, the export half of the print layer.
 *
 * WHAT IT IS. PDF export in this product IS the browser's own print pipeline: a
 * print stylesheet (`kb-print.css`) plus this control, which opens the print
 * dialog on the document the reader is already looking at. A server-side
 * renderer is job D25 and stays deferred, so there is no fetch here, no second
 * rendering of the document, and no file to download — the reader picks "Save as
 * PDF" in their own dialog, which is what the hint line says out loud.
 *
 * WHY IT NEVER SWITCHES VIEWS FIRST (§3.2): print drops the chrome itself, so the
 * printed sheet is identical whether the reader exports from the normal page or
 * from the chrome-less `?view=full` one. The control has nothing to prepare.
 *
 * WHAT IT OWES THE READER, and it is all failure honesty:
 *   - the dialog hint, because "Export PDF" that opens a PRINT dialog is a
 *     surprise unless it tells you which destination to choose (and on iOS,
 *     where printing goes through the share sheet, it is a different sentence);
 *   - `.kb-docexport__error` when `window.print()` throws or the dialog never
 *     opens — a blocked pop-up leaves the page looking like nothing happened,
 *     and the copy hands the reader ⌘P instead;
 *   - the UNMEASURED warning: a framed explainer that never reported its height
 *     prints only its first page, so the reader is told BEFORE the dialog and
 *     has to click again. That second click is the point — an honest warning the
 *     reader can dismiss by pressing on is worth more than a truncated PDF they
 *     discover later.
 *
 * It also owns §4.5's date hydration, because it is this surface's one client
 * island and the print blocks are server components: on mount it writes the
 * READER's local date into both print-only blocks, over the server's ISO default.
 * The server's date is not the reader's, and the sheet says "Printed {date}".
 */

/**
 * How long the dialog gets to announce itself before we call it a failure.
 * The record's number (§5). `beforeprint` fires synchronously in every engine
 * that opens a dialog at all, so anything this late means no dialog opened.
 */
const BEFORE_PRINT_TIMEOUT_MS = 1500;

/** The three sentences this control can put under the actions row. */
type Message = { kind: "hint" | "warn" | "error"; text: string } | null;

/** Today, ISO `YYYY-MM-DD`, in the READER's timezone (the server's may differ). */
function localDate(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * §5's iOS test, verbatim. `navigator.platform` is deprecated but is still what
 * distinguishes an iPad — which reports `MacIntel` — from a Mac, together with
 * the touch-point count. Getting it wrong costs a wrong sentence, nothing more.
 */
function isIosLike(): boolean {
  const nav = window.navigator;
  return nav.maxTouchPoints > 1 && /Mac|iP/.test(nav.platform);
}

export function ExportPdfButton() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  /**
   * Where the message line renders. It must be a child of `.kb-docbar` and NOT
   * of `.kb-docbar__actions`: the actions group is a flex row above 40rem and a
   * grid of equal 44px columns below it, so a sentence dropped in there becomes
   * a fourth button-sized cell, while `.kb-docbar__hint` (`flex: 1 0 100%`) is
   * the record's own "a sentence, always on its own line" slot in the bar.
   *
   * It matters for paper as much as for layout: `kb-print.css` drops the whole
   * `.kb-docbar`, so a line rendered inside it can never print. A line rendered
   * as a sibling of the article's other blocks WOULD print — the dialog hint
   * would be on the very sheet it is describing.
   *
   * Found by query rather than by a ref off this button: `AppButton` forwards no
   * `ref` in its typed props, and all three document surfaces render exactly one
   * `.kb-docbar` (§4.1's row), so the query is unambiguous. It is resolved in the
   * click handler rather than in an effect — nothing can be said before the
   * reader asks for something, so the lookup costs nothing until then.
   */
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  /** The unmeasured warning is shown once; the next click prints anyway. */
  const warnedRef = useRef(false);
  const beforePrintRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const liveRef = useRef(true);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // §4.5 — the reader's own date, into both print-only blocks, over the
  // server-rendered ISO default. Done in an effect (never during render) so the
  // server HTML and the hydrated tree still match: this is a post-hydration DOM
  // write to nodes React does not re-render.
  useEffect(() => {
    const today = localDate();
    document
      .querySelectorAll(`[${PRINT_DATE_ATTR}]`)
      .forEach((el) => {
        el.textContent = today;
      });
  }, []);

  useEffect(() => {
    liveRef.current = true;
    function onBefore() {
      beforePrintRef.current = true;
      clearTimer();
    }
    function onAfter() {
      clearTimer();
      if (!liveRef.current) return;
      // The dialog is closed — whatever it was for, it is over. The hint has
      // done its job and the reader is back on the page.
      setBusy(false);
      setMessage(null);
    }
    window.addEventListener("beforeprint", onBefore);
    window.addEventListener("afterprint", onAfter);
    return () => {
      liveRef.current = false;
      clearTimer();
      window.removeEventListener("beforeprint", onBefore);
      window.removeEventListener("afterprint", onAfter);
    };
  }, [clearTimer]);

  const fail = useCallback(() => {
    if (!liveRef.current) return;
    setBusy(false);
    setMessage({ kind: "error", text: DOCUMENTS.read.exportFailed });
  }, []);

  function handleExport() {
    // Double-submit guard in the handler, not on the DOM: a disabled button
    // drops out of the tab order mid-action (the `AppButton busy` convention).
    if (busy) return;

    // The message line's home in the bar (see `slot`), resolved on first use.
    setSlot((current) => current ?? document.querySelector(".kb-docbar"));

    // §5's honesty rule, BEFORE the dialog. `[data-unmeasured]` is the flag
    // `explainer-frame.tsx` sets on `.kb-explainer` when no height ever arrived;
    // such a frame prints its first page only, so the reader is told first and
    // has to ask again.
    if (
      !warnedRef.current &&
      document.querySelector(".kb-explainer[data-unmeasured]") !== null
    ) {
      warnedRef.current = true;
      setMessage({ kind: "warn", text: DOCUMENTS.read.exportUnmeasured });
      return;
    }

    beforePrintRef.current = false;
    setBusy(true);
    setMessage({
      kind: "hint",
      text: isIosLike()
        ? DOCUMENTS.read.exportDialogIos
        : DOCUMENTS.read.exportDialog,
    });

    clearTimer();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      if (!beforePrintRef.current) fail();
    }, BEFORE_PRINT_TIMEOUT_MS);

    // §5's one animation frame: the busy state and the hint line must be PAINTED
    // before `window.print()` blocks the main thread behind a modal dialog —
    // without it the reader sees the page freeze with no explanation, and on a
    // slow engine the hint would appear only after the dialog closed.
    window.requestAnimationFrame(() => {
      try {
        window.print();
      } catch {
        clearTimer();
        fail();
      }
    });
  }

  const line =
    message === null ? null : (
      <p
        className={
          message.kind === "hint"
            ? "kb-docbar__hint"
            : "kb-docbar__hint kb-docexport__error"
        }
        role="status"
        aria-live="polite"
      >
        {message.text}
      </p>
    );

  return (
    <>
      <AppButton
        variant="ghost"
        size="sm"
        busy={busy}
        onClick={handleExport}
      >
        {busy ? DOCUMENTS.read.exportPending : DOCUMENTS.read.exportLabel}
      </AppButton>
      {line === null ? null : slot === null ? line : createPortal(line, slot)}
    </>
  );
}
