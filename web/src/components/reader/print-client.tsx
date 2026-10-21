"use client";

import { useEffect, useRef } from "react";

import { printDate } from "@/lib/reader/print";

/**
 * P30.S26 — the printed sheet's two small client parts (`09-legacy-and-print` round 01).
 *
 * Both listen for the browser's own `beforeprint`, which fires for every way of printing
 * (⌘P, the menu, a script): the sheet cannot rely on a control of ours being pressed.
 */

/**
 * "Printed {date}": the reader's own date, not the server's. The server renders its date
 * (`suppressHydrationWarning`: a client-rendered copy of this on the legacy page may see
 * another date than the server did) and the date is written into the element on mount
 * and again each time a print starts, straight into the DOM (a state update could land
 * after the page has been laid out for paper).
 */
export function PrintedOn({ initial }: { initial: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const write = () => {
      if (ref.current) ref.current.textContent = printDate(new Date());
    };
    write();
    window.addEventListener("beforeprint", write);
    return () => window.removeEventListener("beforeprint", write);
  }, []);
  return (
    // The span's own text differs between the server's clock and the reader's whenever
    // their dates differ (a time zone, midnight), and `PrintNotice` is rendered by the
    // client component on the legacy page: React would throw error 418 on hydration.
    // The mount effect writes the reader's date anyway, so the mismatch is expected.
    <span ref={ref} data-print-date="" suppressHydrationWarning>
      {initial}
    </span>
  );
}

/**
 * A collapsed callout prints open ("paper has no button"). The stylesheet opens it in
 * engines that support `::details-content`; this does the same for the ones that do not,
 * by opening each closed callout for the print and folding it again after.
 */
export function PrintPrep() {
  useEffect(() => {
    let opened: Element[] = [];
    const before = () => {
      opened = Array.from(
        document.querySelectorAll("details.kb-ch-callout:not([open])"),
      );
      for (const d of opened) d.setAttribute("open", "");
    };
    const after = () => {
      for (const d of opened) d.removeAttribute("open");
      opened = [];
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
      after();
    };
  }, []);
  return null;
}
