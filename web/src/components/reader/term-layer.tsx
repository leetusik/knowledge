"use client";

import "@/app/reader-aids.css";

import { useEffect, useRef } from "react";

import { TAP_IGNORE } from "@/lib/reader/chrome";
import { fitRadicals } from "@/lib/reader/radicals";

/**
 * P39-hk.S9 — the terms' controller (`10-reading-aids` round 01, signed: *The window*, *The
 * phone sheet*, *Highlight meets term*, *The glossary section*; F2–F6, F18, F19, F33; R1 §5).
 * One client layer for the whole chapter, mounted beside `AnnotationLayer`. Everything it
 * drives is the server's static markup (`render.tsx`): the term markers `a.ra-term`, one
 * hidden window `tw-<id>` per linked term in the chapter's `.ra-float` holder, and the
 * glossary entries' hidden way back. It never moves or renders a node of the chapter: it
 * toggles `hidden`, `aria-expanded`, classes and the holder's place, and it sizes its own
 * spacer, the page's bottom padding under the phone sheet.
 *
 * - **Opening.** Click, tap and Enter (the link's own click) open the term's window and move
 *   focus into it; Space does the same by a key handler. A click on the open term closes it.
 *   With a mouse (`(hover: hover) and (pointer: fine)`, the window form only) a 250 ms rest
 *   opens it with focus left in the text, and leaving the term and the window for 200 ms
 *   closes a hover-opened one; a hover never replaces a window opened by click or key (F19).
 *   One window at a time, across the text and the formulas' legends.
 * - **The two forms.** From the reader's 40rem (the `rd` container; the same breakpoint as the
 *   CSS's container query) the window floats below the term, left on its first line box,
 *   shifted left to end on the column's edge, above it when the reading area has no room
 *   below and more above (anchored by its bottom, so the longer definition grows upward);
 *   placed hidden, shown once placed, re-placed on resize. Under 40rem it is the bottom sheet,
 *   fixed to the viewport (no scrim): the page gets bottom padding as tall as the sheet and
 *   scrolls the term's last line to 1rem above it, on open and on Read more.
 * - **Closing.** Close, Esc, Tab past the last control (focus goes on in the text) and Shift+Tab
 *   out of the first (focus returns to the term); a pointer down outside the window and the
 *   terms (the sheet then returns focus to its term); a focus that lands outside it. The click
 *   that closed it never also toggles the reader's chrome.
 * - **Never two floating things.** Its pointerdown and Esc run in the capture phase, before the
 *   annotation layer's: a pointer down on a highlight closes the window and the highlight's
 *   own click opens its popover; a term's click (a key's included, Space calls it) reaches the
 *   annotation layer's click handler, which already closes an open popover or selection bar
 *   for any link; the term's click also clears a native selection, which a press on a link
 *   keeps and the annotation layer would read again. So `annotations.tsx` needs no change.
 * - **In the glossary →** closes the window, marks the entry (`is-target`: the sources list's
 *   `:target` mark), scrolls it under the top bar, focuses it and shows its "‹ Back to the
 *   text", aimed at the very occurrence the reader came from (`tm-<id>-<n>`, a legend's
 *   included). Back scrolls that occurrence to the centre, focuses it and clears the mark.
 *   Without script every marker is a link to its entry.
 * - **√.** Each window or sheet it opens gets S8's radical fit (`fitRadicals`): a hidden
 *   window's math had no box when the chapter was measured.
 */

const HOVER_REST_MS = 250;
const HOVER_LEAVE_MS = 200;
/** Where a pointer's click may take focus itself: the sheet then leaves focus to it. */
const FOCUSABLE =
  "a[href], button, input, select, textarea, summary, label, [tabindex]";

type Mode = "hover" | "focus";

interface Open {
  term: HTMLElement;
  win: HTMLElement;
  mode: Mode;
  /** Shown as the phone sheet (the reader under 40rem). */
  sheet: boolean;
}

export function TermLayer({ chapter }: { chapter: string }) {
  const padRef = useRef<HTMLDivElement>(null);

  // `chapter` (document, version, language) re-binds the layer to the next chapter's markup
  // when the reader moves on and this component stays mounted.
  useEffect(() => {
    const art = document.querySelector<HTMLElement>(".rd-article");
    const roots = Array.from(
      document.querySelectorAll<HTMLElement>(".rd-prose > .kb-ch"),
    );
    const pad = padRef.current;
    if (!art || !pad || !roots.some((r) => r.querySelector("a.ra-term")))
      return;

    const inChapter = (el: Element) => roots.some((r) => r.contains(el));
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const rem = () =>
      parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    /** `kb-space-xs`: the gap between a term and its window. */
    const gap = () => {
      const v = getComputedStyle(art).getPropertyValue("--kb-space-xs").trim();
      const n = parseFloat(v);
      if (!Number.isFinite(n)) return 0.35 * rem();
      return v.endsWith("rem") ? n * rem() : n;
    };
    /** The reader's container (`rd`, `.rd-page`) under 40rem: the sheet's width. */
    const narrow = () =>
      (art.closest<HTMLElement>(".rd-page") ?? art).clientWidth < 40 * rem();
    /** The reading area a window must fit in: under the top bar, above the chapter bar. */
    const visible = () => {
      const shown = (el: Element | null): el is Element =>
        !!el && getComputedStyle(el).visibility !== "hidden";
      const top = document.querySelector(".rd-top");
      const line = document.querySelector(".rd-line");
      const bottom = document.querySelector(".rd-bottom");
      return {
        top: shown(top)
          ? top.getBoundingClientRect().bottom
          : (line?.getBoundingClientRect().bottom ?? 0),
        bottom: shown(bottom)
          ? bottom.getBoundingClientRect().top
          : window.innerHeight,
      };
    };
    const lines = (el: Element) =>
      Array.from(el.getClientRects()).filter((r) => r.width || r.height);
    const idOf = (term: Element) =>
      (term.getAttribute("aria-controls") ?? "").replace(/^tw-/, "");
    const controls = (win: HTMLElement) =>
      Array.from(win.querySelectorAll<HTMLElement>("button, a[href]")).filter(
        (el) => el.getClientRects().length > 0,
      );
    /** A scroll of the reader's own is not a gesture: the chrome stays as it is. */
    const quiet = () => window.dispatchEvent(new Event("reader:quiet"));

    let open: Open | null = null;
    let timer = 0;
    /** The click that ends the pointer press which closed a window. */
    let swallow = false;
    /** The sheet closed by a tap outside: its term takes focus back, unless the tap takes it. */
    let refocus: HTMLElement | null = null;
    /** The pointer went down on a term: its focus and its click swap the window. */
    let downOnTerm = false;
    /** The glossary entry a window's "In the glossary →" led to. */
    let arrived: HTMLElement | null = null;

    const setLong = (win: HTMLElement, on: boolean) => {
      const long = win.querySelector<HTMLElement>(".ra-def--long");
      const btn = win.querySelector<HTMLElement>(".ra-more");
      if (!long || !btn) return;
      long.hidden = !on;
      btn.setAttribute("aria-expanded", on ? "true" : "false");
      const [more, less] = Array.from(
        btn.querySelectorAll<HTMLElement>(".ra-swap > span"),
      );
      more?.setAttribute("aria-hidden", on ? "true" : "false");
      less?.setAttribute("aria-hidden", on ? "false" : "true");
    };

    // F3: below the term, its left edge on the term's first line box; shifted left to end on
    // the column's right edge; above the term when the reading area has less room below than
    // the window needs and more room above. Never over the term.
    const placeWindow = (o: Open) => {
      const holder = o.win.parentElement as HTMLElement;
      const rs = lines(o.term);
      if (!rs.length) return;
      const first = rs[0];
      const last = rs[rs.length - 1];
      const a = art.getBoundingClientRect();
      const col = (
        o.term.closest(".rd-prose") ??
        o.term.closest(".kb-ch") ??
        art
      ).getBoundingClientRect();
      const w = holder.offsetWidth;
      const h = o.win.offsetHeight;
      const colL = col.left - a.left;
      const colR = col.right - a.left;
      let left = first.left - a.left;
      if (left + w > colR) left = colR - w;
      if (left < Math.min(colL, 8)) left = Math.min(colL, 8);
      const g = gap();
      const vis = visible();
      const below = vis.bottom - last.bottom;
      const above = first.top - vis.top;
      holder.style.left = `${Math.round(left)}px`;
      if (below >= h + g || below >= above) {
        holder.style.top = `${Math.round(last.bottom - a.top + g)}px`;
        holder.style.bottom = "";
      } else {
        holder.style.top = "";
        holder.style.bottom = `${Math.round(a.bottom - first.top + g)}px`;
      }
    };

    // F4: the page gets bottom padding as tall as the sheet, and scrolls the term's last line
    // to 1rem above the sheet's top edge.
    const fitSheet = (o: Open, scroll: boolean) => {
      const h = Math.ceil(o.win.getBoundingClientRect().height);
      if (Math.abs((parseFloat(pad.style.height) || 0) - h) > 1)
        pad.style.height = `${h}px`;
      if (!scroll) return;
      const rs = lines(o.term);
      const last = rs[rs.length - 1];
      if (!last) return;
      const delta = last.bottom - (o.win.getBoundingClientRect().top - rem());
      if (Math.abs(delta) >= 1) {
        quiet();
        window.scrollBy(0, delta);
      }
    };

    const layout = (o: Open, scroll: boolean) => {
      const holder = o.win.parentElement as HTMLElement;
      o.sheet = narrow();
      if (o.sheet) {
        holder.style.left = holder.style.top = holder.style.bottom = "";
        fitSheet(o, scroll);
      } else {
        pad.style.height = "";
        placeWindow(o);
      }
      holder.dataset.placed = "1";
    };

    const hide = (focusTerm: boolean, swap = false) => {
      window.clearTimeout(timer);
      const o = open;
      if (!o) return;
      open = null;
      // Focus first: the window holds it until it hides.
      if (focusTerm) o.term.focus({ preventScroll: true });
      o.win.hidden = true;
      setLong(o.win, false);
      o.term.setAttribute("aria-expanded", "false");
      (o.win.parentElement as HTMLElement).dataset.placed = "0";
      if (!swap) pad.style.height = "";
    };

    const show = (term: HTMLElement, mode: Mode) => {
      window.clearTimeout(timer);
      const win = document.getElementById(`tw-${idOf(term)}`);
      if (!win || !inChapter(win)) return;
      if (open && open.win === win && open.term === term) {
        // A hover-opened window, clicked: it becomes a clicked one, with focus.
        if (mode === "focus" && open.mode === "hover") {
          open.mode = "focus";
          win.focus({ preventScroll: true });
        }
        return;
      }
      hide(false, true);
      const holder = win.parentElement as HTMLElement;
      holder.dataset.placed = "0";
      setLong(win, false);
      win.hidden = false;
      term.setAttribute("aria-expanded", "true");
      const o: Open = { term, win, mode, sheet: false };
      open = o;
      fitRadicals(win);
      layout(o, true);
      if (mode === "focus" || o.sheet) win.focus({ preventScroll: true });
    };

    const toggleLong = () => {
      const o = open;
      if (!o) return;
      const on =
        o.win.querySelector(".ra-more")?.getAttribute("aria-expanded") !==
        "true";
      setLong(o.win, on);
      fitRadicals(o.win);
      if (o.sheet) fitSheet(o, true);
    };

    const unmark = () => {
      const entry = arrived;
      arrived = null;
      if (!entry) return;
      entry.classList.remove("is-target");
      entry.removeAttribute("tabindex");
      const back = entry.querySelector<HTMLElement>(".ra-gl__back");
      if (back) back.hidden = true;
    };

    const toGlossary = () => {
      const o = open;
      if (!o) return;
      const entry = document.getElementById(`gl-${idOf(o.term)}`);
      hide(false);
      if (!entry || !inChapter(entry)) return;
      unmark();
      entry.classList.add("is-target");
      entry.tabIndex = -1;
      const back = entry.querySelector<HTMLElement>(".ra-gl__back");
      const link = back?.querySelector("a");
      if (back && link && o.term.id) {
        link.setAttribute("href", `#${o.term.id}`);
        back.hidden = false;
      }
      arrived = entry;
      quiet();
      entry.scrollIntoView({ block: "start", behavior: "instant" });
      entry.focus({ preventScroll: true });
    };

    const goBack = (link: HTMLAnchorElement) => {
      const id = (link.getAttribute("href") ?? "").replace(/^#/, "");
      const term = id ? document.getElementById(id) : null;
      unmark();
      if (!term) return;
      quiet();
      term.scrollIntoView({ block: "center", behavior: "instant" });
      term.focus({ preventScroll: true });
    };

    // ---- the page's events ---------------------------------------------------------------
    const onDown = (e: PointerEvent) => {
      swallow = false;
      refocus = null;
      const t = e.target as Element | null;
      downOnTerm = !!t?.closest?.("a.ra-term");
      const o = open;
      if (!o || !t?.closest || downOnTerm || o.win.contains(t)) return;
      hide(false);
      swallow = true;
      if (o.sheet) refocus = o.term;
    };

    const onArtClick = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (!t?.closest) return;
      if (swallow) {
        swallow = false;
        // The click that closed a window does not also toggle the chrome (the frame's tap).
        if (!t.closest(TAP_IGNORE)) e.stopPropagation();
      }
      if (refocus) {
        const back = refocus;
        refocus = null;
        if (!t.closest(FOCUSABLE)) back.focus({ preventScroll: true });
      }
      const plain =
        e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
      const term = t.closest<HTMLElement>("a.ra-term");
      if (term && inChapter(term)) {
        downOnTerm = false;
        // A modified click is the browser's (a new tab lands on the entry).
        if (!plain) return;
        e.preventDefault();
        // A press on a link keeps the reader's selection, and the annotation layer reads it
        // again once the button is up, which would bring its bar back beside the window:
        // the tap on a term dismisses it, as a tap anywhere else does.
        const s = window.getSelection();
        if (s && !s.isCollapsed) s.removeAllRanges();
        if (open && open.term === term && open.mode !== "hover") hide(false);
        else show(term, "focus");
        return;
      }
      const o = open;
      if (o && o.win.contains(t)) {
        if (t.closest(".ra-close")) {
          e.preventDefault();
          hide(true);
        } else if (t.closest(".ra-more")) {
          e.preventDefault();
          toggleLong();
        } else if (plain && t.closest("a.ra-go")) {
          e.preventDefault();
          toGlossary();
        }
        return;
      }
      const back = t.closest<HTMLAnchorElement>(".ra-gl__back a");
      if (back && plain && inChapter(back)) {
        e.preventDefault();
        goBack(back);
      }
    };

    // A tap outside the article (the top bar's empty stretch) gives the sheet's term its focus back.
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (!refocus || !t?.closest || art.contains(t)) return;
      const back = refocus;
      refocus = null;
      if (!t.closest(FOCUSABLE)) back.focus({ preventScroll: true });
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      const o = open;
      if (e.key === "Escape" && o) {
        e.preventDefault();
        hide(true);
        return;
      }
      if (
        (e.key === " " || e.key === "Spacebar") &&
        t?.matches?.("a.ra-term") &&
        inChapter(t)
      ) {
        e.preventDefault();
        if (o && o.term === t) {
          o.mode = "focus";
          o.win.focus({ preventScroll: true });
        } else t.click();
        return;
      }
      if (e.key === "Tab" && o && t && o.win.contains(t)) {
        const list = controls(o.win);
        const at = document.activeElement;
        if (!e.shiftKey && list.length && at === list[list.length - 1]) {
          // F18: past the last control the window closes and focus carries on in the text,
          // from the term (the key's own move, from there).
          o.term.focus({ preventScroll: true });
          hide(false);
        } else if (e.shiftKey && (at === list[0] || at === o.win)) {
          e.preventDefault();
          hide(true);
        }
      }
    };

    const onFocusIn = (e: FocusEvent) => {
      const o = open;
      const t = e.target as Element | null;
      if (!o || !t) return;
      if (o.win.contains(t) || t === o.term) return;
      if (downOnTerm && t.closest?.("a.ra-term")) return;
      hide(false);
    };

    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || !fine.matches) return;
      const t = e.target as Element | null;
      if (!t?.closest) return;
      const from = e.relatedTarget as Node | null;
      const term = t.closest<HTMLElement>("a.ra-term");
      if (term && inChapter(term)) {
        if (from && term.contains(from)) return;
        window.clearTimeout(timer);
        const o = open;
        if (o && (o.term === term || o.mode !== "hover")) return;
        if (narrow()) return;
        timer = window.setTimeout(() => show(term, "hover"), HOVER_REST_MS);
        return;
      }
      const o = open;
      if (o && o.win.contains(t) && !(from && o.win.contains(from)))
        window.clearTimeout(timer);
    };

    const onOut = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const t = e.target as Element | null;
      if (!t?.closest) return;
      const to = e.relatedTarget as Node | null;
      const term = t.closest<HTMLElement>("a.ra-term");
      const o = open;
      if (term && inChapter(term)) {
        if (to && term.contains(to)) return;
        window.clearTimeout(timer);
        if (o && o.term === term && o.mode === "hover")
          timer = window.setTimeout(() => hide(false), HOVER_LEAVE_MS);
        return;
      }
      if (
        o &&
        o.mode === "hover" &&
        o.win.contains(t) &&
        !(to && o.win.contains(to))
      ) {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => hide(false), HOVER_LEAVE_MS);
      }
    };

    // Re-placed on resize; a change of form (a phone turned) places it in the new one.
    const relayout = () => {
      const o = open;
      if (!o) return;
      layout(o, o.sheet !== narrow());
    };
    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(relayout) : null;
    ro?.observe(art);

    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("click", onDocClick, true);
    art.addEventListener("click", onArtClick, true);
    art.addEventListener("pointerover", onOver);
    art.addEventListener("pointerout", onOut);
    window.addEventListener("resize", relayout);
    return () => {
      hide(false);
      unmark();
      window.clearTimeout(timer);
      ro?.disconnect();
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("click", onDocClick, true);
      art.removeEventListener("click", onArtClick, true);
      art.removeEventListener("pointerover", onOver);
      art.removeEventListener("pointerout", onOut);
      window.removeEventListener("resize", relayout);
    };
  }, [chapter]);

  // The page's bottom padding under the phone sheet (F4): zero until a sheet opens.
  return <div ref={padRef} className="ra-pad" aria-hidden="true" />;
}
