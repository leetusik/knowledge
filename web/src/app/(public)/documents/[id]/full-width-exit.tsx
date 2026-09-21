"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { DOCUMENTS } from "@/content";
import { FULL_WIDTH_LINK_ATTR, VIEW_PARAM } from "@/lib/full-width";

/**
 * The chrome-less view's one control (round 06 §4.4 / §5).
 *
 * `?view=full` is a query on the DOCUMENT'S OWN URL, so the view is linkable and
 * browser back is its primary exit at every width. This pill is the other exit, and
 * it is always visible — not on hover, not on scroll-up — because a phone has
 * neither Esc nor hover, and a reader who cannot find the way out of a full-window
 * view has been trapped by a feature they opted into.
 *
 * IT IS MOUNTED AS A SIBLING OF `.kb-app`, by the shells, beside the toast region.
 * `.kb-app` declares `container-type: inline-size`, which brings layout containment,
 * which makes it the containing block for `position: fixed` descendants — a pill
 * inside it would pin to the bottom of the DOCUMENT instead of the screen, i.e. be
 * invisible on a long explainer (acceptance check 13 exists to catch exactly that).
 * Round 03 documented the same trap for `.kb-toast-region`. For the same reason the
 * pill's phone rule in `kb-docview.css` is a viewport `@media`, not an
 * `@container kbapp` query, so this component needs no container root of its own
 * (unlike round 04's show-once reveal — see phase.md `## Decisions`).
 *
 * It holds no state: nothing is trapped, nothing is remembered, and the view itself
 * is a URL.
 */

export function FullWidthExit() {
  const router = useRouter();
  // Did the reader leave through THIS control (or Esc)? Browser back also unmounts
  // the pill, and moving focus after a back navigation would be a surprise — and
  // could fight the scroll restoration check 11 asks for.
  const exitedRef = useRef(false);

  const exit = useCallback(() => {
    exitedRef.current = true;
    const url = new URL(window.location.href);
    url.searchParams.delete(VIEW_PARAM);
    // REPLACE, never push: back already handles the entry that opened the view, so
    // pushing here would make the reader press back twice to leave one page.
    router.replace(`${url.pathname}${url.search}${url.hash}`);
  }, [router]);

  useEffect(() => {
    // §6 — entering the view moves focus to the body container, so the keyboard
    // reader's next Tab is inside the document and not back in the hidden chrome.
    // `preventScroll`: the focus is a starting point, not a jump.
    document
      .querySelector<HTMLElement>(".kb-doc")
      ?.focus({ preventScroll: true });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      exit();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [exit]);

  // §6 — leaving it returns focus to the Full width control. The pill unmounts as
  // the view closes, so the restore rides on the cleanup, one frame later: by then
  // the chrome is displayed again and a hidden element cannot take focus.
  useEffect(
    () => () => {
      if (!exitedRef.current) return;
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLElement>(`[${FULL_WIDTH_LINK_ATTR}]`)
          ?.focus({ preventScroll: true });
      });
    },
    [],
  );

  return (
    <button type="button" className="kb-docfull__exit" onClick={exit}>
      {DOCUMENTS.read.fullWidthExit} <kbd>Esc</kbd>
    </button>
  );
}
