"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The top bar's middle (`07-book-page` §1): the book's title (Fraunces 15px 600, one line,
 * ellipsis) over its progress ("2 of 5 finished") or, signed out, its count ("5 chapters").
 * It is always laid out, and shown (`visibility`) only once the head's bottom edge has passed
 * under the bar's bottom edge; while hidden it is `aria-hidden`. Nothing in the bar moves
 * when it shows.
 */
export function TopMid({
  title,
  line,
  headId,
}: {
  title: string;
  line?: string;
  headId: string;
}) {
  const mid = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const measure = () => {
      const head = document.getElementById(headId);
      const bar = mid.current?.closest(".bk-topwrap");
      if (!head || !bar) return;
      setOn(
        head.getBoundingClientRect().bottom <
          bar.getBoundingClientRect().bottom,
      );
    };
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [headId]);

  return (
    <div
      className="bk-top__mid"
      ref={mid}
      data-on={on ? "true" : "false"}
      aria-hidden={on ? undefined : true}
    >
      <span className="bk-top__title">{title}</span>
      {line ? <span className="bk-top__prog">{line}</span> : null}
    </div>
  );
}
