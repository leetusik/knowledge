"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

import { READER } from "@/content";
import { readerHref, type ReaderTarget } from "@/lib/reader-href";
import {
  editAnnotation,
  editBookmark,
  removeAnnotation,
  removeBookmark,
  saveAnnotation,
  saveBookmark,
  type AnnotationPatch,
  type AnnotationResult,
  type AnnotationWrite,
  type BookmarkWrite,
} from "@/lib/reader/actions";
import { capture, cps, type ANode, type Captured } from "@/lib/reader/anchor";
import { progressPercent, TAP_IGNORE } from "@/lib/reader/chrome";
import {
  buildGroups,
  marksWord,
  positionNear,
  snippetOf,
  type ListItem,
  type SectionIndex,
} from "@/lib/reader/note-list";
import {
  cleanNote,
  clip,
  countLine,
  deleteLine,
  langOf,
  newId,
  NOTE_MAX,
  reviewLine,
  UNDO_MS,
  undoText,
} from "@/lib/reader/notes";
import {
  EMPTY_PAINT,
  paint,
  unpaint,
  type Painted,
  type PaintRange,
} from "@/lib/reader/paint";
import type {
  CardStatus,
  NoteSection,
  ReaderBookmark,
  ReaderNote,
  ReaderNotes,
  ReaderOtherNote,
  ReaderWrite,
} from "@/lib/reader/types";

import {
  BookmarkButton,
  MarginItem,
  MarkerRow,
  PlaceBar,
  type MarkerLook,
} from "./annotation-parts";
import { NotesPanel } from "./notes-panel";
import { useNotesBridge } from "./reader-notes";
import { useReaderProgress } from "./reader-progress";
import { SignInToSave } from "./sign-in-to-save";

/**
 * P30.S20 — highlights and notes in a native chapter (`05-annotations` round 01, with round
 * 02 §1's keyboard stop): the paint, the selection flow by mouse, touch and keyboard, the
 * selection bar, the popover (a highlight, its note, Review this, a section's note, the
 * chooser where highlights overlap), the undo line, and the 2,000-character note.
 *
 * The chapter is server-rendered (S12's pipeline); this island reads its selections and
 * paints over it. The captured anchor is the shared projection's (`lib/reader/anchor.ts`),
 * and every write goes through a server action to S8's routes with a client id, so a write
 * sent again is a no-op. Writes are optimistic and run one at a time, in order:
 *
 *  - a write that does not reach the server is tried again, then "Not saved · check your
 *    connection" with Try again holds it (nothing is dropped while the page is open);
 *  - a gone session raises Sign in to save in the bottom slot;
 *  - deleting waits out the undo line (10 seconds) before it is sent, so Undo puts back the
 *    highlight with its note and its review card's history (a delayed delete, P30.S20).
 *
 * P30.S21 adds, on the same layer (it owns every mark, so each surface shows one truth):
 *
 *  - bookmarks: a section's (the place bar, the selection bar on a heading or a typed
 *    block) and a plain document's position, each with an optional label; removing one
 *    waits out the same undo line;
 *  - the margin (from 64rem) and the rows under a heading or typed block (below it) for a
 *    section's note, Text changed, the other languages and a bookmark, and the "Bookmarked"
 *    tag in the heading's top margin;
 *  - the place bar in the bottom slot, riding with the chrome;
 *  - the Notes view of the Contents sheet, mounted by the frame's bridge, with the
 *    Unanchored group and the other languages' group (nothing is ever dropped);
 *  - the popovers for Text changed, the other language and a bookmark;
 *  - landing on a mark from a list (`?note=` from the book's list, a row in the sheet).
 */

const T = READER.notes;

type Item = ReaderNote & {
  /** Review this was on at some point (its card exists, active or paused). */
  everOn: boolean;
  /** Deleted, waiting out the undo line. */
  gone?: boolean;
};
type OtherItem = ReaderOtherNote & { gone?: boolean };
type Bk = ReaderBookmark & { gone?: boolean };

/** A selection in a plain Markdown document: nothing can be highlighted there. */
type NoneSel = { mode: "none" };
type Sel = (Captured | NoneSel) & { id: number; pointer: boolean };

type Pop =
  | { t: "hl"; id: string; edit: boolean }
  | { t: "new" }
  | { t: "bnote"; id: string; edit: boolean }
  | { t: "bnew"; sec: string }
  | { t: "choose"; ids: string[] }
  /** Text changed on a section. */
  | { t: "changed"; sec: string }
  /** Highlights made in another language, on a section. */
  | { t: "other"; sec: string; lang: string }
  | { t: "bm"; id: string; edit: boolean };

/** What a Sign in to save is asked for (`what`). */
type SaveWhat = "notes" | "bookmarks";

interface Toast {
  id: number;
  text: string;
  undo?: () => void;
  retry?: () => void;
}

/** A write as data, so the ones a lapsed session stopped can outlive a sign-in. */
type Wire =
  | { op: "save"; input: AnnotationWrite }
  | { op: "edit"; input: AnnotationPatch }
  | { op: "remove"; input: { id: string } }
  | { op: "bm-save"; input: BookmarkWrite }
  | { op: "bm-edit"; input: { id: string; label: string | null } }
  | { op: "bm-remove"; input: { id: string } };

const runWire = (w: Wire): Promise<AnnotationResult> => {
  switch (w.op) {
    case "save":
      return saveAnnotation(w.input);
    case "edit":
      return editAnnotation(w.input);
    case "remove":
      return removeAnnotation(w.input);
    case "bm-save":
      return saveBookmark(w.input);
    case "bm-edit":
      return editBookmark(w.input);
    case "bm-remove":
      return removeBookmark(w.input);
  }
};

/**
 * Writes the server refused with a 401 wait here (sessionStorage, this tab) until the
 * reader is signed in again; the layer that mounts next as a member sends them, in order.
 * Creates carry their client id, so a write the server already took is not doubled.
 */
const UNSAVED_KEY = "kb-reader-unsaved";

function stashUnsaved(wires: Wire[]) {
  try {
    const held = JSON.parse(
      sessionStorage.getItem(UNSAVED_KEY) ?? "[]",
    ) as Wire[];
    sessionStorage.setItem(UNSAVED_KEY, JSON.stringify([...held, ...wires]));
  } catch {
    // Storage off or full: the writes stay held in memory and on screen.
  }
}

function takeUnsaved(): Wire[] {
  try {
    const held = JSON.parse(
      sessionStorage.getItem(UNSAVED_KEY) ?? "[]",
    ) as Wire[];
    sessionStorage.removeItem(UNSAVED_KEY);
    return Array.isArray(held) ? held : [];
  } catch {
    return [];
  }
}

interface Job {
  wire: Wire;
  done?: (r: AnnotationResult) => void;
  /** Put the page back when the server refuses the write for good (404, 422). */
  undo?: () => void;
  tries: number;
}

interface Placed {
  sig: string;
  left: number;
  top: number;
  width: number | null;
  maxW: number;
}

const FOCUSABLE =
  'button, a[href], input, textarea, select, summary, [tabindex]:not([tabindex="-1"])';

export interface AnnotationLayerProps {
  notes: ReaderNotes;
  /** Where a member's annotations are written; null = nowhere (the layer is not mounted then). */
  write: ReaderWrite | null;
  /** The version on screen. */
  version: number;
  lang: string;
  chapterTitle: string;
  place: "chapter" | "document";
  /** The chapter or document on screen, for the links to other languages and versions. */
  target: ReaderTarget;
}

const toItem = (n: ReaderNote): Item => ({ ...n, everOn: n.card !== "" });

export function AnnotationLayer({
  notes,
  write,
  version,
  lang,
  chapterTitle,
  place,
  target,
}: AnnotationLayerProps) {
  const progress = useReaderProgress();
  const bridge = useNotesBridge();
  const member = !!progress?.member;
  const signInHref = progress?.signInHref ?? "/login";
  const plain = notes.plain;

  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const desc = useMemo(
    () => ({ one: `${uid}-d-hl`, note: `${uid}-d-note`, many: `${uid}-d-2` }),
    [uid],
  );
  const sections = useMemo(
    () => new Map(notes.sections.map((s) => [s.id, cps(s.text)])),
    [notes.sections],
  );
  const meta = useMemo(
    () => new Map(notes.sections.map((s) => [s.id, s])),
    [notes.sections],
  );

  const [items, setItems] = useState<Item[]>(() => notes.items.map(toItem));
  const [orph, setOrph] = useState<Item[]>(() => notes.unanchored.map(toItem));
  const [others, setOthers] = useState<OtherItem[]>(() => notes.other);
  const [bms, setBms] = useState<Bk[]>(() => notes.bookmarks);
  const [obms, setObms] = useState<Bk[]>(() => notes.otherBookmarks);
  const [sel, setSel] = useState<Sel | null>(null);
  const [pop, setPop] = useState<Pop | null>(null);
  const [save, setSave] = useState(false);
  const [saveWhat, setSaveWhat] = useState<SaveWhat>("notes");
  const [slotSave, setSlotSave] = useState<false | SaveWhat>(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [draft, setDraft] = useState("");
  const [placed, setPlaced] = useState<Placed | null>(null);
  /** A highlight reached from a list: shown open (the accent underline) with no popover. */
  const [landed, setLanded] = useState<string | null>(null);
  /** The Notes list's inline label editor. */
  const [editLabel, setEditLabel] = useState<string | null>(null);
  /** The section being read (the place bar), and how far through the text the reader is. */
  const [blk, setBlk] = useState<string | null>(null);
  const [pct, setPct] = useState(0);
  const [endSeen, setEndSeen] = useState(false);
  const [codeIds, setCodeIds] = useState<ReadonlySet<string>>(new Set());
  /** The margin items' tops, by key (from 64rem), and the nodes the rows mount in. */
  const [railTops, setRailTops] = useState<Record<string, number>>({});
  const [rowHosts, setRowHosts] = useState<Record<string, HTMLElement>>({});
  const [host, setHost] = useState<{
    art: HTMLElement;
    root: HTMLElement;
    shell: HTMLElement;
  } | null>(null);

  const layerRef = useRef<HTMLDivElement>(null);
  const floatRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const painted = useRef<Painted>(EMPTY_PAINT);
  const opener = useRef<{ el: HTMLElement | null; mark: string | null }>({
    el: null,
    mark: null,
  });
  const focusWant = useRef<"box" | "field" | "back" | null>(null);
  const revealed = useRef<string | null>(null);
  const selSeq = useRef(0);
  const toastSeq = useRef(0);
  const queue = useRef<Job[]>([]);
  const paused = useRef<Job[]>([]);
  const running = useRef(false);
  const pendingDel = useRef<{ key: string; commit: () => void } | null>(null);
  const mouseDown = useRef(false);
  const railRaf = useRef(0);
  // The current state, for the document listeners (registered once).
  const now = useRef({ sel, pop, save, items, orph, others, bms, obms, member });
  useEffect(() => {
    now.current = { sel, pop, save, items, orph, others, bms, obms, member };
  });

  // ---- where the layer lives ------------------------------------------------------------
  useEffect(() => {
    const art = layerRef.current?.closest<HTMLElement>(".rd-article");
    const root = art?.querySelector<HTMLElement>(".kb-ch");
    const shell = art?.closest<HTMLElement>(".rd-root");
    // The layer reads the server-rendered page around it once it is hydrated.
    if (art && root && shell) setHost({ art, root, shell });
  }, []);

  // ---- what the layer holds, as the lists and the margin show it ---------------------------------
  const names = notes.langNames;
  const langName = useCallback(
    (l: string) => names[l] ?? l,
    [names],
  );
  const look = useMemo<SectionIndex>(
    () =>
      new Map(
        notes.sections.map((x, i) => [
          x.id,
          {
            n: i,
            label: x.word === "Section" ? x.title : `${x.word} · ${x.title}`,
          },
        ]),
      ),
    [notes.sections],
  );
  const groups = useMemo(
    () =>
      buildGroups(
        {
          items,
          unanchored: orph,
          bookmarks: bms,
          other: others,
          otherBookmarks: obms,
        },
        { sections: look, chapterTitle, code: codeIds },
        new Set(
          [...items, ...orph, ...others, ...bms, ...obms]
            .filter((x) => x.gone)
            .map((x) => x.id),
        ),
      ),
    [items, orph, others, bms, obms, look, chapterTitle, codeIds],
  );
  const groupsRef = useRef(groups);
  useEffect(() => {
    groupsRef.current = groups;
  });
  const setCount = bridge?.setCount;
  useEffect(() => {
    setCount?.(member ? groups.count : 0);
  }, [setCount, groups.count, member]);

  /** A section's bookmark is on (the place bar and the bar read "Bookmarked"). */
  const bookmarked = (sec: string | null): boolean =>
    !!sec && bms.some((b) => !b.gone && !b.pos && !b.approx && b.at === sec);
  const positionOn =
    positionNear(
      bms.filter((b) => !b.gone && b.pos && !b.approx),
      pct / 100,
    ).length > 0;

  // ---- the margin (from 64rem) and the rows under a block (below it) --------------------------
  interface Marker {
    key: string;
    kind: "note" | "bnote" | "changed" | "other" | "bm";
    at: "mark" | "block";
    id?: string;
    sec: string;
    lang?: string;
    order: number;
    look: MarkerLook;
  }
  const markers = useMemo<Marker[]>(() => {
    const out: Marker[] = [];
    const n = (sec: string) => look.get(sec)?.n ?? 0;
    const alive = items.filter((x) => !x.gone);
    for (const x of alive) {
      const sec = x.sec ?? x.block;
      if (!look.has(sec)) continue;
      if (x.kind === "hl" && x.status === "anchored" && x.note) {
        out.push({
          key: x.id,
          kind: "note",
          at: "mark",
          id: x.id,
          sec,
          order: n(sec) * 1e6 + (x.start ?? 0),
          look: {
            label: T.margin.note,
            text: x.note,
            lang: langOf(x.note, x.lang),
          },
        });
      } else if (x.kind === "bnote" && x.status === "anchored") {
        const diagram = look.get(sec)?.label.startsWith("Diagram");
        out.push({
          key: x.id,
          kind: "bnote",
          at: "block",
          id: x.id,
          sec,
          order: n(sec) * 1e6 - 2,
          look: {
            label: diagram ? T.margin.noteDiagram : T.margin.noteSection,
            text: x.note,
            lang: langOf(x.note, x.lang),
          },
        });
      }
    }
    const changed = new Map<string, Item[]>();
    for (const x of alive)
      if (x.status === "block") {
        const sec = x.sec ?? x.block;
        if (look.has(sec)) changed.set(sec, [...(changed.get(sec) ?? []), x]);
      }
    for (const [sec, list] of changed)
      out.push({
        key: `chg-${sec}`,
        kind: "changed",
        at: "block",
        sec,
        order: n(sec) * 1e6 - 1,
        look: {
          label: T.margin.changed,
          text: T.changed.item(marksWord(list), list.length),
          lang,
        },
      });
    const byOther = new Map<string, OtherItem[]>();
    for (const x of others)
      if (!x.gone && x.at && look.has(x.at))
        byOther.set(`${x.at}|${x.lang}`, [
          ...(byOther.get(`${x.at}|${x.lang}`) ?? []),
          x,
        ]);
    for (const [k, list] of byOther) {
      const sec = list[0].at!;
      out.push({
        key: `oth-${k}`,
        kind: "other",
        at: "block",
        sec,
        lang: list[0].lang,
        order: n(sec) * 1e6 - 0.5,
        look: {
          label: "",
          text: T.other.item(marksWord(list)),
          lang,
          endonym: { name: langName(list[0].lang), lang: list[0].lang },
        },
      });
    }
    for (const b of bms)
      if (!b.gone && !b.pos && !b.approx && b.at && look.has(b.at))
        out.push({
          key: b.id,
          kind: "bm",
          at: "block",
          id: b.id,
          sec: b.at,
          order: n(b.at) * 1e6 - 3,
          look: {
            label: T.margin.bookmarked,
            labelOn: true,
            text: b.label,
            lang: langOf(b.label, "en"),
          },
        });
    return out.sort((a, b) => a.order - b.order || a.key.localeCompare(b.key));
  }, [items, others, bms, look, lang, langName]);

  const openMarker = useCallback(
    (m: Marker, el: HTMLElement) => {
      setSel(null);
      setSave(false);
      setLanded(null);
      opener.current = { el, mark: null };
      if (m.kind === "note" && m.id) {
        // A highlight inside a closed fold: open the fold first, then its popover.
        host?.root
          .querySelector<HTMLDetailsElement>(
            `details:not([open]):has(mark.an-m[data-an~="${CSS.escape(m.id)}"])`,
          )
          ?.setAttribute("open", "");
        setPop({ t: "hl", id: m.id, edit: false });
      } else if (m.kind === "bnote" && m.id)
        setPop({ t: "bnote", id: m.id, edit: false });
      else if (m.kind === "changed") setPop({ t: "changed", sec: m.sec });
      else if (m.kind === "other" && m.lang)
        setPop({ t: "other", sec: m.sec, lang: m.lang });
      else if (m.kind === "bm" && m.id)
        setPop({ t: "bm", id: m.id, edit: false });
      focusWant.current = "box";
    },
    [host],
  );
  const markerOpen = (m: Marker): boolean => {
    if (!pop) return false;
    if (m.kind === "note") return pop.t === "hl" && pop.id === m.id;
    if (m.kind === "bnote") return pop.t === "bnote" && pop.id === m.id;
    if (m.kind === "bm") return pop.t === "bm" && pop.id === m.id;
    if (m.kind === "changed") return pop.t === "changed" && pop.sec === m.sec;
    return pop.t === "other" && pop.sec === m.sec && pop.lang === m.lang;
  };

  // The margin items' tops: each beside its anchor (a mark, or a block), 8 px clear of the one above.
  const layoutRail = useCallback((): boolean => {
    if (!host) return false;
    const rail = host.art.querySelector<HTMLElement>(".an-rail");
    if (!rail || !rail.offsetParent) return false; // below 64rem the rail is not shown
    const ar = host.art.getBoundingClientRect();
    const els = rail.querySelectorAll<HTMLElement>(".an-ri");
    const tops: Record<string, number> = {};
    let prev = -1e9;
    let missing = false;
    markers.forEach((m, i) => {
      const el = els[i];
      if (!el) return;
      let a: Element | null =
        m.at === "mark" && m.id
          ? host.root.querySelector(
              `mark.an-m[data-an~="${CSS.escape(m.id)}"]`,
            )
          : null;
      // A mark inside a closed fold has no box: its item anchors to the fold's summary.
      if (a && !a.getClientRects().length)
        a = a.closest("details")?.querySelector("summary") ?? null;
      if (!a)
        a = host.root.querySelector(`[data-block="${CSS.escape(m.sec)}"]`);
      let y: number | null = a
        ? a.getBoundingClientRect().top - ar.top
        : null;
      if (y === null) {
        missing = true;
        y = prev + 8;
      }
      const t = Math.round(Math.max(y - 4, prev + 8));
      tops[m.key] = t;
      prev = t + el.offsetHeight;
    });
    setRailTops((o) => {
      const ks = Object.keys(tops);
      const same =
        ks.length === Object.keys(o).length &&
        ks.every((k) => Math.abs((o[k] ?? -1e9) - tops[k]) <= 1);
      return same ? o : tops;
    });
    return missing;
  }, [host, markers]);
  const scheduleRail = useCallback(() => {
    cancelAnimationFrame(railRaf.current);
    railRaf.current = requestAnimationFrame(() => {
      // An anchor that is not in the page yet (a late block): once more shortly after.
      if (layoutRail())
        window.setTimeout(() => {
          railRaf.current = requestAnimationFrame(() => layoutRail());
        }, 150);
    });
  }, [layoutRail]);
  // After each render, and when the text reflows (a resize, a font, a fold, an image).
  useLayoutEffect(() => {
    scheduleRail();
  });
  useEffect(() => {
    if (!host) return;
    const again = () => scheduleRail();
    const ro = new ResizeObserver(again);
    ro.observe(host.root);
    ro.observe(host.art);
    window.addEventListener("resize", again);
    host.art.addEventListener("toggle", again, true);
    host.art.addEventListener("load", again, true);
    document.fonts?.ready.then(again).catch(() => {});
    return () => {
      cancelAnimationFrame(railRaf.current);
      ro.disconnect();
      window.removeEventListener("resize", again);
      host.art.removeEventListener("toggle", again, true);
      host.art.removeEventListener("load", again, true);
    };
  }, [host, scheduleRail]);

  // The "Bookmarked" tag (in the block's top margin) and the rows' mount nodes are DOM the
  // chapter does not render itself, kept in step with the marks and removed with the layer.
  const hostNodes = useRef(new Map<string, HTMLElement>());
  // The cleanup is a layout effect declared first: on a host change every cleanup runs before
  // the sync below creates its nodes, where a passive cleanup would remove what it just made.
  useLayoutEffect(
    () => () => {
      hostNodes.current.forEach((n) => n.remove());
      hostNodes.current.clear();
      host?.root.querySelectorAll("[data-an-tag]").forEach((t) => t.remove());
    },
    [host],
  );
  useLayoutEffect(() => {
    if (!host) return;
    const tagSecs = new Set(
      markers.filter((m) => m.kind === "bm").map((m) => m.sec),
    );
    host.root.querySelectorAll<HTMLElement>("[data-an-tag]").forEach((t) => {
      const sec = t.getAttribute("data-an-tag") ?? "";
      if (tagSecs.has(sec)) tagSecs.delete(sec);
      else t.remove();
    });
    tagSecs.forEach((sec) => {
      const el = host.root.querySelector(`[data-block="${CSS.escape(sec)}"]`);
      if (!el) return;
      const tag = document.createElement("span");
      tag.className = "an-tag";
      tag.setAttribute("aria-hidden", "true");
      tag.setAttribute("data-an-skip", "");
      tag.textContent = T.margin.bookmarked;
      if (/^(OL|UL|DL|TABLE)$/.test(el.tagName)) {
        // A list or a table takes no <span> child: the tag hangs from a zero-height box before it.
        const wrap = document.createElement("div");
        wrap.className = "an-tag-w";
        wrap.setAttribute("data-an-tag", sec);
        wrap.setAttribute("aria-hidden", "true");
        wrap.appendChild(tag);
        el.before(wrap);
      } else {
        tag.setAttribute("data-an-tag", sec);
        el.appendChild(tag);
      }
    });
    const rowSecs = new Set(
      markers
        .filter((m) => m.kind === "bnote" || m.kind === "changed" || m.kind === "other")
        .map((m) => m.sec),
    );
    const nodes = hostNodes.current;
    for (const [sec, node] of [...nodes])
      if (!rowSecs.has(sec) || !node.isConnected) {
        node.remove();
        nodes.delete(sec);
      }
    for (const sec of rowSecs) {
      if (nodes.has(sec)) continue;
      const block = host.root.querySelector(`[data-block="${CSS.escape(sec)}"]`);
      if (!block) continue;
      const node = document.createElement("div");
      node.className = "an-rows";
      block.after(node);
      nodes.set(sec, node);
    }
    setRowHosts((o) => {
      const same =
        Object.keys(o).length === nodes.size &&
        [...nodes].every(([k, v]) => o[k] === v);
      return same ? o : Object.fromEntries(nodes);
    });
  }, [host, markers]);

  // ---- the section being read, for the place bar -----------------------------------------------
  useEffect(() => {
    if (!host) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const doc = document.documentElement;
      const p = progressPercent(window.scrollY, doc.scrollHeight - window.innerHeight);
      setPct((o) => (o === p ? o : p));
      const bar =
        document.querySelector(".rd-top")?.getBoundingClientRect().bottom ?? 59;
      const line = bar + 24;
      let found: string | null = null;
      host.root.querySelectorAll<HTMLElement>("[data-block]").forEach((h) => {
        const id = h.getAttribute("data-block");
        if (id && look.has(id) && h.getBoundingClientRect().top <= line)
          found = id;
      });
      setBlk((o) => (o === found ? o : found));
      const end = host.art.querySelector(".rd-end");
      const seen = end
        ? end.getBoundingClientRect().top < window.innerHeight - 40 || p >= 95
        : p >= 95;
      setEndSeen((o) => (o === seen ? o : seen));
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    document.fonts?.ready.then(on).catch(() => {});
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, [host, look]);

  // ---- the toast ---------------------------------------------------------------------------
  const showToast = useCallback((t: Omit<Toast, "id">, timed: boolean) => {
    toastSeq.current += 1;
    const id = toastSeq.current;
    setToast({ id, ...t });
    // A timer clears only the line it started.
    if (timed)
      window.setTimeout(
        () => setToast((cur) => (cur && cur.id === id ? null : cur)),
        UNDO_MS,
      );
  }, []);

  // ---- writes: one at a time, in order ---------------------------------------------------
  const pump = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      while (queue.current.length) {
        const job = queue.current[0];
        let r: AnnotationResult;
        try {
          r = await runWire(job.wire);
        } catch {
          r = { ok: false, status: 0 };
        }
        if (r.ok) {
          queue.current.shift();
          job.done?.(r);
          continue;
        }
        const st = r.status ?? 0;
        if (st === 401) {
          paused.current.push(...queue.current);
          queue.current = [];
          // Kept across the sign-in: the link leaves this page.
          stashUnsaved(paused.current.map((j) => j.wire));
          setSlotSave(job.wire.op.startsWith("bm") ? "bookmarks" : "notes");
          break;
        }
        if (st === 0 || st === 429 || st >= 500) {
          job.tries += 1;
          if (job.tries < 3) {
            await new Promise((ok) => window.setTimeout(ok, 800 * job.tries));
            continue;
          }
          paused.current.push(...queue.current);
          queue.current = [];
          showToast(
            { text: T.notSaved, retry: () => retryRef.current() },
            false,
          );
          break;
        }
        // Refused for good: drop it and put the page back as the server holds it.
        queue.current.shift();
        job.undo?.();
        showToast({ text: T.notSaved }, true);
      }
    } finally {
      running.current = false;
    }
  }, [showToast]);

  const retryRef = useRef<() => void>(() => {});
  const retry = useCallback(() => {
    if (!paused.current.length) return;
    // Sent from memory now; the stashed copy would only send them twice.
    takeUnsaved();
    const jobs = paused.current.map((j) => ({ ...j, tries: 0 }));
    paused.current = [];
    queue.current = [...jobs, ...queue.current];
    setToast(null);
    void pump();
  }, [pump]);
  useEffect(() => {
    retryRef.current = retry;
  }, [retry]);

  // Writes a lapsed session stopped, held across the sign-in: send them now, in order,
  // then read the notes again so the page shows what the server keeps.
  const router = useRouter();
  const resync = useRef(false);
  useEffect(() => {
    if (!member) return;
    const held = takeUnsaved();
    if (!held.length) return;
    void (async () => {
      let sent = 0;
      for (let i = 0; i < held.length; i += 1) {
        let r: AnnotationResult;
        try {
          r = await runWire(held[i]);
        } catch {
          r = { ok: false, status: 0 };
        }
        const st = r.status ?? 0;
        if (r.ok) sent += 1;
        else if (st === 0 || st === 401 || st === 429 || st >= 500) {
          // Not now: keep the rest for the next page this tab opens.
          stashUnsaved(held.slice(i));
          break;
        }
      }
      if (sent) {
        resync.current = true;
        router.refresh();
      }
    })();
  }, [member, router]);
  useEffect(() => {
    if (!resync.current) return;
    resync.current = false;
    setItems(notes.items.map(toItem));
    setOrph(notes.unanchored.map(toItem));
    setOthers(notes.other);
    setBms(notes.bookmarks);
    setObms(notes.otherBookmarks);
  }, [notes]);

  const enqueue = useCallback(
    (job: Omit<Job, "tries">) => {
      queue.current.push({ ...job, tries: 0 });
      void pump();
    },
    [pump],
  );

  const patchItem = useCallback(
    (id: string, change: Partial<Item>) => {
      const apply = (list: Item[]) =>
        list.map((x) => (x.id === id ? { ...x, ...change } : x));
      setItems(apply);
      setOrph(apply);
      setOthers((list) =>
        list.map((x) => (x.id === id ? { ...x, ...change } : x)),
      );
    },
    [],
  );
  const patchBookmark = useCallback(
    (id: string, change: Partial<Bk>) =>
      setBms((list) =>
        list.map((x) => (x.id === id ? { ...x, ...change } : x)),
      ),
    [],
  );
  /** Mark deleted marks (they wait out the undo line, hidden everywhere), or bring them back. */
  const setGone = useCallback((ids: readonly string[], gone: boolean) => {
    const on = new Set(ids);
    const apply = <T extends { id: string; gone?: boolean }>(list: T[]) =>
      list.map((x) => (on.has(x.id) ? { ...x, gone } : x));
    setItems(apply);
    setOrph(apply);
    setOthers(apply);
    setBms(apply);
    setObms(apply);
  }, []);
  const dropMarks = useCallback((ids: readonly string[]) => {
    const on = new Set(ids);
    const keep = <T extends { id: string }>(list: T[]) =>
      list.filter((x) => !on.has(x.id));
    setItems(keep);
    setOrph(keep);
    setOthers(keep);
    setBms(keep);
    setObms(keep);
  }, []);

  // A delete waits out its undo line; this sends it now (the next delete, leaving).
  const flushDelete = useCallback(() => {
    const p = pendingDel.current;
    if (p) p.commit();
  }, []);

  useEffect(() => {
    const away = () => {
      if (document.visibilityState === "hidden") flushDelete();
    };
    const online = () => {
      if (paused.current.length) retryRef.current();
    };
    document.addEventListener("visibilitychange", away);
    window.addEventListener("pagehide", flushDelete);
    window.addEventListener("online", online);
    return () => {
      document.removeEventListener("visibilitychange", away);
      window.removeEventListener("pagehide", flushDelete);
      window.removeEventListener("online", online);
      flushDelete();
    };
  }, [flushDelete]);

  // ---- what is painted ---------------------------------------------------------------------
  const ranges = useMemo<PaintRange[]>(
    () =>
      items
        .filter(
          (x) =>
            x.kind === "hl" &&
            !x.gone &&
            x.status === "anchored" &&
            x.method !== "stored" &&
            x.sec !== null &&
            sections.has(x.sec) &&
            x.start !== null &&
            x.end !== null &&
            x.end > x.start,
        )
        .sort(
          (a, b) => (a.start ?? 0) - (b.start ?? 0) || a.id.localeCompare(b.id),
        )
        .map((x) => ({
          id: x.id,
          sec: x.sec!,
          s: x.start!,
          e: x.end!,
          note: !!x.note,
        })),
    [items, sections],
  );
  const pending =
    sel && sel.mode === "passage" && (sel.pointer || pop?.t === "new")
      ? { sec: sel.sec, s: sel.s, e: sel.e }
      : null;
  const active = pop?.t === "hl" ? pop.id : pop ? null : landed;
  const paintKey = JSON.stringify([ranges, pending, active]);

  useLayoutEffect(() => {
    if (!host) return;
    unpaint(painted.current);
    painted.current = paint(host.root, sections, {
      ranges,
      pending,
      active,
      desc,
    });
    // Which highlights sit in code (a list shows their quote in mono, unpainted).
    const code = new Set<string>();
    host.root
      .querySelectorAll<HTMLElement>("mark.an-m[data-an]")
      .forEach((m) => {
        if (m.closest('[data-tx="code"]'))
          (m.getAttribute("data-an") ?? "")
            .split(" ")
            .filter(Boolean)
            .forEach((id) => code.add(id));
      });
    // Reported after the paint (the lists, not the page, read it).
    requestAnimationFrame(() =>
      setCodeIds((prev) =>
        prev.size === code.size && [...code].every((id) => prev.has(id))
          ? prev
          : code,
      ),
    );
    // ranges/pending/active are folded into paintKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host, paintKey, sections, desc]);
  useEffect(
    () => () => {
      unpaint(painted.current);
      painted.current = EMPTY_PAINT;
    },
    [],
  );

  // ---- closing and focus ---------------------------------------------------------------------
  const clearNative = () => {
    const s = window.getSelection();
    if (s && s.rangeCount) s.removeAllRanges();
  };

  const closeAll = useCallback((back: boolean) => {
    setPop(null);
    setSel(null);
    setSave(false);
    setLanded(null);
    if (back) focusWant.current = "back";
  }, []);

  const restoreFocus = useCallback(() => {
    const o = opener.current;
    let el: HTMLElement | null = null;
    if (o.mark && host)
      el = host.root.querySelector<HTMLElement>(
        `mark[data-an-key~="${CSS.escape(o.mark)}"]`,
      );
    if (!el && o.el && o.el.isConnected) el = o.el;
    el?.focus({ preventScroll: true });
  }, [host]);

  // ---- the actions -----------------------------------------------------------------------------
  const sectionLabel = useCallback(
    (sec: string | null): string => {
      const m = sec ? meta.get(sec) : undefined;
      if (!m) return "";
      return m.word === "Section" ? m.title : `${m.word} · ${m.title}`;
    },
    [meta],
  );

  const snapshotOf = useCallback(
    (sec: string, text: string) => ({
      text: Array.from(text).slice(0, 5000).join(""),
      block_title: Array.from(sectionLabel(sec)).slice(0, 500).join(""),
      chapter_title: Array.from(chapterTitle).slice(0, 500).join(""),
    }),
    [sectionLabel, chapterTitle],
  );

  const createHighlight = useCallback(
    (s: Extract<Sel, { mode: "passage" }>, note: string): string | null => {
      if (!write) return null;
      const id = newId();
      const item: Item = {
        id,
        kind: "hl",
        block: s.sec,
        sec: s.sec,
        start: s.s,
        end: s.e,
        status: "anchored",
        method: "exact",
        quote: {
          exact: s.quote.exact,
          prefix: s.quote.prefix,
          suffix: s.quote.suffix,
        },
        note,
        review: false,
        card: "",
        snapshot: null,
        everOn: false,
        lang,
        version,
        created: new Date().toISOString(),
      };
      setItems((list) => [...list, item]);
      enqueue({
        wire: {
          op: "save",
          input: {
            ...write,
            id,
            version,
            block_id: s.sec,
            quote: s.quote,
            note: note || null,
            snapshot: snapshotOf(s.sec, s.quote.exact),
          },
        },
        undo: () => setItems((list) => list.filter((x) => x.id !== id)),
      });
      return id;
    },
    [write, lang, version, enqueue, snapshotOf],
  );

  const highlight = useCallback(() => {
    const s = now.current.sel;
    if (!s || s.mode !== "passage") return;
    if (!now.current.member) {
      setSaveWhat("notes");
      setSave(true);
      return;
    }
    clearNative();
    const id = createHighlight(s, "");
    setSel(null);
    if (id) {
      // Its popover opens (view), so a note or Review this is one tap away.
      opener.current = { el: null, mark: id };
      setPop({ t: "hl", id, edit: false });
      focusWant.current = "box";
    }
  }, [createHighlight]);

  const noteSel = useCallback(() => {
    const s = now.current.sel;
    if (!s || s.mode !== "passage") return;
    if (!now.current.member) {
      setSaveWhat("notes");
      setSave(true);
      return;
    }
    clearNative();
    setSel({ ...s, pointer: true });
    setDraft("");
    setPop({ t: "new" });
    focusWant.current = "field";
  }, []);

  const blockNote = useCallback((sec: string, from?: "place") => {
    if (!now.current.member) {
      if (from === "place") setSlotSave("notes");
      else {
        setSaveWhat("notes");
        setSave(true);
      }
      return;
    }
    const have = now.current.items.find(
      (x) =>
        x.kind === "bnote" &&
        !x.gone &&
        x.status === "anchored" &&
        (x.sec ?? x.block) === sec,
    );
    setSel(null);
    if (have) {
      setPop({ t: "bnote", id: have.id, edit: false });
      focusWant.current = "box";
    } else {
      setDraft("");
      setPop({ t: "bnew", sec });
      focusWant.current = "field";
    }
  }, []);

  const openMarks = useCallback((ids: string[]) => {
    setSel(null);
    setSave(false);
    if (ids.length > 1) setPop({ t: "choose", ids });
    else setPop({ t: "hl", id: ids[0], edit: false });
    focusWant.current = "box";
  }, []);

  const closePop = useCallback(() => {
    const p = now.current.pop;
    setPop(null);
    // A new note's Cancel and Close return to the bar; everything else closes.
    if (p?.t !== "new") setSel(null);
    focusWant.current = "back";
  }, []);

  /** A delete waits out its undo line, hidden everywhere meanwhile; Undo puts it all back. */
  const scheduleDelete = useCallback(
    (ids: string[], text: string, wireOf: (id: string) => Wire) => {
      flushDelete();
      setGone(ids, true);
      const key = ids.join(",");
      let timer = 0;
      const commit = () => {
        window.clearTimeout(timer);
        if (pendingDel.current?.key === key) pendingDel.current = null;
        for (const id of ids)
          enqueue({
            wire: wireOf(id),
            done: () => dropMarks([id]),
            undo: () => setGone([id], false),
          });
      };
      timer = window.setTimeout(commit, UNDO_MS);
      pendingDel.current = { key, commit };
      showToast(
        {
          text,
          undo: () => {
            window.clearTimeout(timer);
            if (pendingDel.current?.key === key) pendingDel.current = null;
            setGone(ids, false);
            setToast(null);
          },
        },
        true,
      );
    },
    [dropMarks, enqueue, flushDelete, setGone, showToast],
  );

  const remove = useCallback(
    (id: string) => {
      const cur = now.current;
      const it: (ReaderNote & { everOn?: boolean }) | undefined =
        cur.items.find((x) => x.id === id) ??
        cur.orph.find((x) => x.id === id) ??
        cur.others.find((x) => x.id === id);
      if (!it) return;
      scheduleDelete(
        [id],
        it.kind === "bnote"
          ? T.undo.noteOnly
          : undoText({ note: it.note, card: it.card !== "" || !!it.everOn }),
        () => ({ op: "remove", input: { id } }),
      );
      setPop(null);
      setSel(null);
      setLanded(null);
      focusWant.current = "back";
    },
    [scheduleDelete],
  );

  // ---- bookmarks ------------------------------------------------------------------------------
  const removeBookmarks = useCallback(
    (ids: string[]) => {
      if (!ids.length) return;
      scheduleDelete(ids, T.bm.removed, (id) => ({
        op: "bm-remove",
        input: { id },
      }));
      setPop(null);
      setSel(null);
      focusWant.current = "back";
    },
    [scheduleDelete],
  );

  const makeBookmark = useCallback(
    (
      anchor: { block_id: string } | { fraction: number },
      snippet: string,
    ): string | null => {
      if (!write) return null;
      const id = newId();
      const sec = "block_id" in anchor ? anchor.block_id : null;
      const bk: Bk = {
        id,
        block: sec,
        at: sec,
        exact: true,
        fraction: "fraction" in anchor ? anchor.fraction : null,
        label: "",
        snippet,
        pos: sec === null,
        approx: false,
        lang,
        version,
        created: new Date().toISOString(),
      };
      setBms((list) => [...list, bk]);
      enqueue({
        wire: {
          op: "bm-save",
          input: { ...write, id, version, anchor, snippet },
        },
        undo: () => setBms((list) => list.filter((x) => x.id !== id)),
      });
      return id;
    },
    [write, lang, version, enqueue],
  );

  /** A section's bookmark, toggled: the control reads "Bookmarked" and is pressed. */
  const toggleSection = useCallback(
    (sec: string, from: "bar" | "place") => {
      if (!now.current.member) {
        if (from === "place") setSlotSave("bookmarks");
        else {
          setSaveWhat("bookmarks");
          setSave(true);
        }
        return;
      }
      const have = now.current.bms.filter(
        (b) => !b.gone && !b.pos && !b.approx && b.at === sec,
      );
      if (have.length) {
        removeBookmarks(have.map((b) => b.id));
        return;
      }
      makeBookmark({ block_id: sec }, clip(sectionLabel(sec), 140));
    },
    [makeBookmark, removeBookmarks, sectionLabel],
  );

  /** What the reader is looking at: the fraction read, and the first text under the top bar. */
  const placeNow = useCallback((): { frac: number; snippet: string } => {
    const doc = document.documentElement;
    const p = progressPercent(window.scrollY, doc.scrollHeight - window.innerHeight);
    let snippet = "";
    const line =
      (document.querySelector(".rd-top")?.getBoundingClientRect().bottom ??
        59) + 8;
    const all = host?.root.querySelectorAll<HTMLElement>(
      "p, li, h2, h3, h4, pre, blockquote",
    );
    if (all)
      for (const el of Array.from(all)) {
        if (el.getBoundingClientRect().top >= line - 4 && el.textContent?.trim()) {
          snippet = el.textContent;
          break;
        }
      }
    return { frac: p / 100, snippet: snippetOf(snippet) };
  }, [host]);

  /** A plain document's position bookmark; one within 2% of the reader's place is removed instead. */
  const togglePosition = useCallback(
    (from: "bar" | "place") => {
      if (!now.current.member) {
        if (from === "place") setSlotSave("bookmarks");
        else {
          setSaveWhat("bookmarks");
          setSave(true);
        }
        return;
      }
      const { frac, snippet } = placeNow();
      const near = positionNear(
        now.current.bms.filter((b) => !b.gone && b.pos && !b.approx),
        frac,
      );
      if (near.length) {
        removeBookmarks(near);
        return;
      }
      makeBookmark({ fraction: frac }, snippet);
    },
    [makeBookmark, placeNow, removeBookmarks],
  );

  const setLabel = useCallback(
    (id: string, label: string) => {
      const before = now.current.bms.find((b) => b.id === id)?.label ?? "";
      const clean = label.trim().slice(0, 120);
      if (clean === before) return;
      patchBookmark(id, { label: clean });
      enqueue({
        wire: { op: "bm-edit", input: { id, label: clean || null } },
        undo: () => patchBookmark(id, { label: before }),
      });
    },
    [enqueue, patchBookmark],
  );

  const setNote = useCallback(
    (id: string, note: string, before: string) => {
      patchItem(id, { note });
      enqueue({
        wire: { op: "edit", input: { id, note: note || null } },
        undo: () => patchItem(id, { note: before }),
      });
    },
    [enqueue, patchItem],
  );

  const saveNote = useCallback(() => {
    const p = now.current.pop;
    const text = cleanNote(draft);
    if (!p) return;
    if (p.t === "new") {
      const s = now.current.sel;
      if (!s || s.mode !== "passage") {
        setPop(null);
        return;
      }
      const id = createHighlight(s, text);
      setSel(null);
      if (id) {
        opener.current = { el: null, mark: id };
        setPop({ t: "hl", id, edit: false });
        focusWant.current = "box";
      } else setPop(null);
      return;
    }
    if (p.t === "bnew") {
      if (!text || !write) {
        setPop(null);
        focusWant.current = "back";
        return;
      }
      const id = newId();
      const item: Item = {
        id,
        kind: "bnote",
        block: p.sec,
        sec: p.sec,
        start: null,
        end: null,
        status: "anchored",
        method: "section",
        quote: null,
        note: text,
        review: false,
        card: "",
        snapshot: null,
        everOn: false,
        lang,
        version,
        created: new Date().toISOString(),
      };
      setItems((list) => [...list, item]);
      enqueue({
        wire: {
          op: "save",
          input: {
            ...write,
            id,
            version,
            block_id: p.sec,
            note: text,
            snapshot: snapshotOf(p.sec, sectionLabel(p.sec)),
          },
        },
        undo: () => setItems((list) => list.filter((x) => x.id !== id)),
      });
      setPop({ t: "bnote", id, edit: false });
      focusWant.current = "box";
      return;
    }
    if (p.t === "bnote") {
      const it = now.current.items.find((x) => x.id === p.id);
      // Saving an empty section note deletes it.
      if (!text) {
        remove(p.id);
        return;
      }
      if (it && it.note !== text) setNote(p.id, text, it.note);
      setPop({ ...p, edit: false });
      focusWant.current = "box";
      return;
    }
    if (p.t === "hl") {
      const it = now.current.items.find((x) => x.id === p.id);
      // Saving an empty note on a highlight removes the note and keeps the highlight.
      if (it && it.note !== text) setNote(p.id, text, it.note);
      setPop({ ...p, edit: false });
      focusWant.current = "box";
    }
  }, [
    draft,
    createHighlight,
    write,
    lang,
    version,
    enqueue,
    snapshotOf,
    sectionLabel,
    remove,
    setNote,
  ]);

  const deleteNote = useCallback(() => {
    const p = now.current.pop;
    if (!p) return;
    if (p.t === "bnote") {
      remove(p.id);
      return;
    }
    if (p.t !== "hl") return;
    const it = now.current.items.find((x) => x.id === p.id);
    if (!it) return;
    const before = it.note;
    setNote(p.id, "", before);
    setPop({ ...p, edit: false });
    focusWant.current = "box";
    if (before)
      showToast(
        {
          text: T.undo.noteOnly,
          undo: () => {
            setNote(p.id, before, "");
            setToast(null);
          },
        },
        true,
      );
  }, [remove, setNote, showToast]);

  const toggleReview = useCallback(() => {
    const p = now.current.pop;
    if (!p || p.t !== "hl") return;
    const it = now.current.items.find((x) => x.id === p.id);
    if (!it) return;
    const on = !it.review;
    const card: CardStatus = on ? "active" : "suspended";
    patchItem(p.id, { review: on, card, everOn: it.everOn || on });
    enqueue({
      wire: { op: "edit", input: { id: p.id, review: on } },
      done: (r) =>
        patchItem(p.id, {
          review: !!r.review,
          ...(r.card === "active" || r.card === "suspended"
            ? { card: r.card, everOn: true }
            : {}),
        }),
      undo: () =>
        patchItem(p.id, {
          review: it.review,
          card: it.card,
          everOn: it.everOn,
        }),
    });
  }, [enqueue, patchItem]);

  const startEdit = useCallback(() => {
    const p = now.current.pop;
    if (!p || (p.t !== "hl" && p.t !== "bnote")) return;
    const it = now.current.items.find((x) => x.id === p.id);
    setDraft(it?.note ?? "");
    setPop({ ...p, edit: true });
    focusWant.current = "field";
  }, []);

  const cancelEdit = useCallback(() => {
    const p = now.current.pop;
    if (!p) return;
    if (p.t === "new") {
      // Cancel closes the editor and returns to the bar.
      setPop(null);
      return;
    }
    if (p.t === "bnew") {
      setPop(null);
      focusWant.current = "back";
      return;
    }
    if (p.t === "hl" || p.t === "bnote") {
      setPop({ ...p, edit: false });
      focusWant.current = "box";
    }
  }, []);

  // ---- landing on a mark, from a list ---------------------------------------------------------
  /** Scroll so the element sits 32 px under the top bar (not a gesture: the chrome stays as it is). */
  const scrollUnderBar = useCallback((el: Element) => {
    window.dispatchEvent(new Event("reader:quiet"));
    const bar =
      document.querySelector(".rd-top")?.getBoundingClientRect().bottom ?? 59;
    const y = el.getBoundingClientRect().top + window.scrollY - (bar + 32);
    window.scrollTo({ top: Math.max(0, y), behavior: "instant" });
  }, []);

  const land = useCallback(
    (it: ListItem) => {
      if (!host) return;
      const sec = it.sec;
      const block = sec
        ? host.root.querySelector<HTMLElement>(
            `[data-block="${CSS.escape(sec)}"]`,
          )
        : null;
      if (it.kind === "hl" && it.status === "anchored") {
        const mark = host.root.querySelector<HTMLElement>(
          `mark.an-m[data-an~="${CSS.escape(it.id)}"]`,
        );
        if (mark) {
          // A highlight inside a closed fold: open the fold, then land on the mark.
          const fold = mark.closest("details");
          if (fold && !fold.open) fold.open = true;
          scrollUnderBar(mark);
          setPop(null);
          setSel(null);
          setLanded(it.id);
          return;
        }
      }
      if (it.status === "block" && sec) {
        if (block) scrollUnderBar(block);
        setSel(null);
        setLanded(null);
        opener.current = { el: null, mark: null };
        setPop({ t: "changed", sec });
        focusWant.current = "box";
        return;
      }
      if (block) {
        scrollUnderBar(block);
        return;
      }
      // A position (or a bookmark with no section to land on): at its fraction.
      if (it.frac > 0) {
        window.dispatchEvent(new Event("reader:quiet"));
        const max = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo({ top: Math.max(0, it.frac * max), behavior: "instant" });
      }
    },
    [host, scrollUnderBar],
  );

  const goTo = useCallback(
    (it: ListItem) => {
      bridge?.close();
      setEditLabel(null);
      if (it.status === "other") {
        // Another language's mark: that chapter variant, at the mark's own section.
        const o = now.current.others.find((x) => x.id === it.id);
        const b = now.current.obms.find((x) => x.id === it.id);
        const section = o ? (o.sec ?? o.block) : (b?.block ?? b?.at ?? null);
        router.push(
          readerHref(target, { lang: it.lang, section, note: it.id }),
        );
        return;
      }
      land(it);
    },
    [bridge, land, router, target],
  );

  /** Delete from a list: waits out the undo line like the popover's delete, and never moves focus. */
  const deleteFromList = useCallback(
    (it: ListItem) => {
      if (it.kind === "bm") {
        scheduleDelete([it.id], T.bm.removed, (id) => ({
          op: "bm-remove",
          input: { id },
        }));
        return;
      }
      const cur = now.current;
      const n: (ReaderNote & { everOn?: boolean }) | undefined =
        cur.items.find((x) => x.id === it.id) ??
        cur.orph.find((x) => x.id === it.id) ??
        cur.others.find((x) => x.id === it.id);
      scheduleDelete(
        [it.id],
        it.kind === "bnote"
          ? T.undo.noteOnly
          : undoText({
              note: it.note,
              card: (n ? n.card !== "" || !!n.everOn : false) || it.card !== "",
            }),
        (id) => ({ op: "remove", input: { id } }),
      );
    },
    [scheduleDelete],
  );

  // `?note=<id>` (a row in the book's list, or in another language): land on the mark once
  // the page is painted, again when the fonts settle if the reader has not moved.
  const arrived = useRef(false);
  useEffect(() => {
    if (!host || arrived.current) return;
    arrived.current = true;
    const url = new URL(window.location.href);
    const id = url.searchParams.get("note");
    if (!id) return;
    const it = [...groupsRef.current.items, ...groupsRef.current.orphans].find(
      (x) => x.id === id,
    );
    if (it) {
      land(it);
      const at = window.scrollY;
      document.fonts?.ready
        .then(() => {
          if (Math.abs(window.scrollY - at) <= 2) land(it);
        })
        .catch(() => {});
    }
    // The mark is reached; the address no longer needs to ask for it.
    window.setTimeout(() => {
      const u = new URL(window.location.href);
      u.searchParams.delete("note");
      window.history.replaceState(
        window.history.state,
        "",
        `${u.pathname}${u.search}${u.hash}`,
      );
    }, 1200);
  }, [host, land]);

  // ---- reading a selection -------------------------------------------------------------------
  const read = useCallback(
    (pointer: boolean) => {
      if (!host) return;
      const s = window.getSelection();
      if (!s || !s.rangeCount || s.isCollapsed) return;
      const first = s.getRangeAt(0);
      const last = s.getRangeAt(s.rangeCount - 1);
      const sc = first.startContainer;
      const el = sc.nodeType === 1 ? (sc as Element) : sc.parentElement;
      if (!el || !host.art.contains(el)) return;
      if (el.closest(".an-layer, .an-rows, .an-rail, .rd-end")) return;
      let c: Captured | NoneSel | null;
      if (plain) {
        // A plain Markdown document: nothing can be highlighted, anywhere in it.
        c = { mode: "none" };
      } else if (!host.root.contains(sc)) {
        if (!el.closest(".rd-head")) return;
        c = { mode: "refuse" };
      } else {
        c = capture(
          host.root as unknown as ANode,
          {
            startContainer: first.startContainer as unknown as ANode,
            startOffset: first.startOffset,
            endContainer: last.endContainer as unknown as ANode,
            endOffset: last.endOffset,
          },
          sections,
        );
      }
      if (!c) return;
      const o = now.current.sel;
      const same =
        o &&
        o.mode === c.mode &&
        (o.mode === "passage" || o.mode === "block"
          ? (c.mode === "passage" || c.mode === "block") &&
            o.sec === c.sec &&
            (o.mode !== "passage" ||
              (c.mode === "passage" && o.s === c.s && o.e === c.e))
          : true);
      if (same && o.pointer === pointer) return;
      selSeq.current += 1;
      setSel({
        ...c,
        id: selSeq.current,
        pointer: pointer && c.mode === "passage",
      });
      setPop(null);
      setSave(false);
      // A mouse selection of a passage is replaced by the pending paint; touch and keyboard
      // keep the native selection (its handles) until an action is pressed.
      if (pointer && c.mode === "passage") s.removeAllRanges();
    },
    [host, sections, plain],
  );

  // ---- the page's events ---------------------------------------------------------------------
  useEffect(() => {
    if (!host) return;
    const { art } = host;
    let selT = 0;
    const inFloat = (t: EventTarget | null) =>
      t instanceof Element && !!t.closest(".an-layer, .an-rows, .an-rail");
    let pointerUpAt = 0;
    const onSelChange = () => {
      // A mouse selection is read once, on mouseup; the selectionchange events that the
      // browser queues around the release must not turn it into a touch-style read.
      if (mouseDown.current || Date.now() - pointerUpAt < 400) return;
      const a = document.activeElement;
      if (a && a.closest(".an-layer")) return;
      window.clearTimeout(selT);
      selT = window.setTimeout(() => read(false), 350);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button === 0) mouseDown.current = true;
      const t = e.target as Element | null;
      if (!t || !t.closest || inFloat(t)) return;
      // A highlight reached from a list stays shown open until the reader touches the page.
      setLanded(null);
      const mark = t.closest("mark.an-m");
      if (mark && art.contains(mark)) {
        const ids = (mark.getAttribute("data-an") ?? "")
          .split(" ")
          .filter(Boolean);
        opener.current = { el: null, mark: ids[0] ?? null };
      } else {
        opener.current = { el: t.closest<HTMLElement>(FOCUSABLE), mark: null };
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType === "mouse") {
        mouseDown.current = false;
        pointerUpAt = Date.now();
        window.clearTimeout(selT);
        selT = window.setTimeout(() => read(true), 10);
      }
    };
    const onTouchEnd = () => {
      window.clearTimeout(selT);
      selT = window.setTimeout(() => read(false), 10);
    };
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t || inFloat(t)) return;
      if (t.matches?.("mark.an-m[data-an-key]")) {
        const key = (t.getAttribute("data-an-key") ?? "").split(" ")[0];
        opener.current = { el: t, mark: key || null };
      } else opener.current = { el: t, mark: null };
    };
    // A tap on a highlight opens it; a tap anywhere else closes an open bar or popover
    // first, and only the next tap toggles the chrome.
    const onArticleClick = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (!t || !t.closest || inFloat(t)) return;
      const mark = t.closest("mark.an-m");
      if (mark && !t.closest("a") && !window.getSelection()?.toString()) {
        const ids = (mark.getAttribute("data-an") ?? "")
          .split(" ")
          .filter(Boolean);
        if (ids.length) {
          e.stopPropagation();
          openMarks(ids);
          return;
        }
      }
      const { sel: s, pop: p, save: sv } = now.current;
      if (s || p || sv) {
        closeAll(false);
        if (!t.closest(TAP_IGNORE)) e.stopPropagation();
      }
    };
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (!t || !t.closest || inFloat(t) || art.contains(t)) return;
      const { sel: s, pop: p, save: sv } = now.current;
      if (s || p || sv) closeAll(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("input, textarea, select, [contenteditable]")) return;
      if (document.querySelector(".rd-sheet")) return;
      const k = e.key;
      const { sel: s, pop: p, save: sv } = now.current;
      // Round 02: Enter or Space on a highlight's stop opens what a tap there opens.
      if (
        (k === "Enter" || k === " ") &&
        t?.matches?.("mark.an-m[data-an-key]")
      ) {
        const ids = (t.getAttribute("data-an") ?? "")
          .split(" ")
          .filter(Boolean);
        if (ids.length) {
          e.preventDefault();
          const key = (t.getAttribute("data-an-key") ?? "").split(" ")[0];
          opener.current = { el: t, mark: key || null };
          openMarks(ids);
        }
        return;
      }
      if ((k === "h" || k === "H") && s?.mode === "passage" && !p) {
        e.preventDefault();
        highlight();
      } else if ((k === "n" || k === "N") && s?.mode === "passage" && !p) {
        e.preventDefault();
        noteSel();
      } else if (k === "Escape" && (p || s || sv)) {
        e.preventDefault();
        if (p) closePop();
        else closeAll(true);
        clearNative();
      }
    };
    // Closing a fold while a popover on a highlight inside it is open closes the popover;
    // focus goes to the summary.
    const onToggle = (e: Event) => {
      const d = e.target as HTMLDetailsElement | null;
      if (!d || d.tagName !== "DETAILS" || d.open) return;
      const p = now.current.pop;
      const ids = p?.t === "hl" ? [p.id] : p?.t === "choose" ? p.ids : [];
      if (!ids.length) return;
      const inside = ids.some((id) =>
        d.querySelector(`mark.an-m[data-an~="${CSS.escape(id)}"]`),
      );
      if (!inside) return;
      setPop(null);
      d.querySelector<HTMLElement>("summary")?.focus({ preventScroll: true });
    };
    document.addEventListener("selectionchange", onSelChange);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("pointerup", onPointerUp, true);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onDocClick, true);
    art.addEventListener("click", onArticleClick, true);
    art.addEventListener("touchend", onTouchEnd, { passive: true });
    art.addEventListener("toggle", onToggle, true);
    return () => {
      window.clearTimeout(selT);
      document.removeEventListener("selectionchange", onSelChange);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("pointerup", onPointerUp, true);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onDocClick, true);
      art.removeEventListener("click", onArticleClick, true);
      art.removeEventListener("touchend", onTouchEnd);
      art.removeEventListener("toggle", onToggle, true);
    };
  }, [host, read, openMarks, closeAll, closePop, highlight, noteSel]);

  // ---- the floating box: where it hangs ---------------------------------------------------
  const kind: "bar" | "pop" | "save" | null = pop
    ? "pop"
    : save && sel
      ? "save"
      : sel
        ? "bar"
        : null;
  const sig = kind
    ? JSON.stringify([
        kind,
        pop,
        sel && sel.mode === "passage" ? [sel.sec, sel.s, sel.e] : sel?.mode,
        sel && sel.mode === "block" ? sel.sec : null,
      ])
    : null;

  const layout = useCallback(() => {
    const fl = floatRef.current;
    if (!kind || !sig) revealed.current = null; // closed: the next opening may reveal again
    if (!host || !fl || !kind || !sig) return;
    const { art, root } = host;
    const rects: DOMRect[] = [];
    const take = (els: Iterable<Element>) => {
      for (const el of els)
        for (const r of Array.from(el.getClientRects()))
          if (r.width || r.height) rects.push(r);
    };
    const marks = (ids: string[]) =>
      Array.from(root.querySelectorAll("mark.an-m")).filter((m) => {
        const on = (m.getAttribute("data-an") ?? "").split(" ");
        return ids.every((id) => on.includes(id));
      });
    const block = (sec: string) => {
      const el = root.querySelector(`[data-block="${CSS.escape(sec)}"]`);
      if (el) take([el]);
    };
    const native = () => {
      const s = window.getSelection();
      if (s && s.rangeCount)
        for (const r of Array.from(s.getRangeAt(0).getClientRects()))
          if (r.width || r.height) rects.push(r);
    };
    const pend = () => take(root.querySelectorAll('mark[data-an="pending"]'));
    if (pop) {
      if (pop.t === "hl") {
        take(marks([pop.id]));
        if (!rects.length) {
          const it = items.find((x) => x.id === pop.id);
          if (it?.sec) block(it.sec);
        }
      } else if (pop.t === "choose") take(marks(pop.ids));
      else if (pop.t === "new") pend();
      else if (pop.t === "bnew") block(pop.sec);
      else if (pop.t === "changed" || pop.t === "other") block(pop.sec);
      else if (pop.t === "bm") {
        const b = bms.find((x) => x.id === pop.id);
        if (b?.at) block(b.at);
      } else {
        const it = items.find((x) => x.id === pop.id);
        if (it) block(it.sec ?? it.block);
      }
    } else if (sel) {
      if (sel.mode === "passage") {
        pend();
        if (!rects.length) native();
      } else if (sel.mode === "block") block(sel.sec);
      else {
        native();
        if (!rects.length) {
          const t = art.querySelector(".rd-head__title");
          if (t) take([t]);
        }
      }
    }
    if (!rects.length) return;
    const ar = art.getBoundingClientRect();
    const colEl = art.querySelector(".rd-prose") ?? root;
    const cr = colEl.getBoundingClientRect();
    const firstR = rects[0];
    const lastR = rects[rects.length - 1];
    const top = firstR.top - ar.top;
    const bottom = lastR.bottom - ar.top;
    const cx = (lastR.left + lastR.right) / 2 - ar.left;
    const colL = cr.left - ar.left;
    const colR = cr.right - ar.left;
    const colW = colR - colL;
    const rem =
      parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const want = kind === "pop" ? 24 * rem : kind === "save" ? 30 * rem : 0;
    const W = want ? Math.min(want, colW) : Math.min(fl.offsetWidth, colW);
    const left = Math.max(colL, Math.min(cx - W / 2, colR - W));
    const h = fl.offsetHeight;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const gap = kind === "bar" && coarse ? 28 : 8;
    // The visible band: 8 px under the top bar to 8 px above the chapter bar (64 px).
    const topBar =
      document.querySelector(".rd-top")?.getBoundingClientRect().bottom ?? 59;
    const loose = !!host.shell.classList.contains("rd-loose");
    const bandTop = Math.max(0, topBar) - ar.top + 8;
    const bandBottom = window.innerHeight - (loose ? 8 : 64) - ar.top - 8;
    let t = bottom + gap;
    if (kind === "bar" && t + h > bandBottom && top - gap - h >= bandTop)
      t = top - gap - h;
    const next: Placed = {
      sig,
      left: Math.round(left),
      top: Math.round(t),
      width: want ? Math.round(W) : null,
      maxW: Math.floor(colW),
    };
    setPlaced((o) =>
      o &&
      o.sig === next.sig &&
      Math.abs(o.left - next.left) <= 1 &&
      Math.abs(o.top - next.top) <= 1 &&
      o.width === next.width &&
      o.maxW === next.maxW
        ? o
        : next,
    );
    // A popover that opens low scrolls the page just enough, never its anchor out of view.
    // Measured only once the box sits at its placed width, so its height is the real one.
    if (
      revealed.current !== sig &&
      kind !== "bar" &&
      fl.dataset.placed === "1"
    ) {
      revealed.current = sig;
      let dy = 0;
      if (t + h > bandBottom)
        dy = Math.min(t + h - bandBottom, Math.max(0, top - bandTop));
      else if (t < bandTop) dy = Math.max(t - bandTop, top - bandTop - 40);
      if (Math.abs(dy) >= 2) {
        window.dispatchEvent(new Event("reader:quiet"));
        window.scrollBy(0, dy);
      }
    }
  }, [host, kind, sig, pop, sel, items, bms]);

  useLayoutEffect(() => {
    layout();
  });

  useEffect(() => {
    if (!host || !kind) return;
    const again = () => layout();
    const ro = new ResizeObserver(again);
    ro.observe(host.art);
    window.addEventListener("resize", again);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", again);
    };
  }, [host, kind, layout]);

  // Focus: the box in view mode, the field in edit mode, once the box is placed; back to
  // the opener when it closes.
  const isPlaced = !!placed && placed.sig === sig;
  useLayoutEffect(() => {
    const want = focusWant.current;
    if (!want) return;
    if (want === "back") {
      if (pop) return;
      focusWant.current = null;
      restoreFocus();
      return;
    }
    if (!isPlaced) return;
    const f = fieldRef.current ?? labelRef.current;
    if (want === "field" && f) {
      f.focus({ preventScroll: true });
      f.setSelectionRange(f.value.length, f.value.length);
      focusWant.current = null;
    } else if (want === "box" && boxRef.current) {
      boxRef.current.focus({ preventScroll: true });
      focusWant.current = null;
    }
  });

  // ---- what the floating box says ------------------------------------------------------------
  const field = useId();
  const hintId = useId();
  const labelRef = useRef<HTMLInputElement>(null);
  const byId = (id: string) => items.find((x) => x.id === id && !x.gone);
  const blockWord = (sec: string | null): "section" | "diagram" =>
    sec && meta.get(sec)?.word === "Diagram" ? "diagram" : "section";
  const hold = (e: ReactMouseEvent) => {
    // The bar never takes the selection away: pressing it keeps the text selected.
    if ((e.target as Element).closest("button")) e.preventDefault();
  };

  let body: ReactNode = null;
  if (kind === "bar" && sel) body = bar(sel);
  else if (kind === "save")
    body = (
      <SignInToSave
        raised
        what={READER.save.whats[saveWhat]}
        place={place}
        signInHref={signInHref}
        onDismiss={() => {
          closeAll(true);
          clearNative();
        }}
      />
    );
  else if (kind === "pop" && pop) body = popover(pop);

  function bar(s: Sel): ReactNode {
    if (s.mode === "passage") {
      const m = meta.get(s.sec);
      return (
        <div
          className="an-box an-box--bar"
          role="toolbar"
          aria-label={T.bar.selected}
          onMouseDown={hold}
        >
          {s.clipped ? (
            <p className="an-box__msg">
              {T.bar.clippedLead}
              <b lang={lang}>{m ? sectionLabel(s.sec) : ""}</b>
              {T.bar.clippedTail}
            </p>
          ) : null}
          <button
            type="button"
            className="rd-btn rd-btn--quiet an-bar__btn"
            onClick={highlight}
          >
            {T.bar.highlight}
          </button>
          <span className="an-place__sep" aria-hidden="true" />
          <button
            type="button"
            className="rd-btn rd-btn--quiet an-bar__btn"
            onClick={noteSel}
          >
            {T.bar.addNote}
          </button>
        </div>
      );
    }
    if (s.mode === "block") {
      const m: NoteSection | undefined = meta.get(s.sec);
      return (
        <div
          className="an-box an-box--bar"
          role="toolbar"
          aria-label={T.bar.blockLabel(m?.word ?? "Section")}
          onMouseDown={hold}
        >
          <p className="an-box__msg">
            {m?.word ?? "Section"} · <b lang={lang}>{m?.title ?? ""}</b>
          </p>
          <button
            type="button"
            className="rd-btn rd-btn--quiet an-bar__btn"
            onClick={() => blockNote(s.sec)}
          >
            {T.bar.addNote}
          </button>
          <span className="an-place__sep" aria-hidden="true" />
          <BookmarkButton
            on={bookmarked(s.sec)}
            onClick={() => toggleSection(s.sec, "bar")}
          />
        </div>
      );
    }
    if (s.mode === "none") {
      return (
        <div
          className="an-box an-box--bar"
          role="toolbar"
          aria-label={T.bar.selected}
          onMouseDown={hold}
        >
          <p className="an-box__msg">{T.bm.plain}</p>
          <BookmarkButton
            on={positionOn}
            position
            onClick={() => togglePosition("bar")}
          />
        </div>
      );
    }
    return (
      <div
        className="an-box an-box--bar"
        role="toolbar"
        aria-label={T.bar.selected}
        onMouseDown={hold}
      >
        <p className="an-box__msg an-box__msg--only">{T.bar.refuse}</p>
      </div>
    );
  }

  function swap(labels: [string, string, string]): ReactNode {
    // Add note, Edit note and Save note share one cell, so the button never resizes.
    return (
      <span className="an-btn-w">
        <span>{labels[0]}</span>
        <span aria-hidden="true">{labels[1]}</span>
        <span aria-hidden="true">{labels[2]}</span>
      </span>
    );
  }

  /** Four labels share the cell when a button changes in place (Add / Edit / Save label). */
  function swap4(labels: [string, string, string]): ReactNode {
    return swap(labels);
  }

  /** The quotes and notes of Text changed and the other language: unpainted, each with Delete. */
  function markList(list: readonly (ReaderNote & { gone?: boolean })[]): ReactNode {
    return (
      <ul className="an-box__list">
        {list.map((x) => (
          <li key={x.id} className="an-box__item">
            {x.quote ? (
              <p className="an-box__quote" lang={x.lang}>
                {x.quote.exact}
              </p>
            ) : null}
            {x.note ? (
              <p
                className="an-box__note an-box__note--item"
                lang={langOf(x.note, x.lang)}
              >
                {x.note}
              </p>
            ) : null}
            <div className="an-box__actions">
              <button
                type="button"
                className="rd-btn rd-btn--quiet an-del"
                aria-label={
                  (x.kind === "bnote"
                    ? T.aria.deleteNote
                    : T.aria.deleteHighlight) +
                  clip(x.quote?.exact ?? x.note, 60)
                }
                onClick={() => remove(x.id)}
              >
                {T.changed.delete}
              </button>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  function editor(label: string, existing: boolean): ReactNode {
    const count = countLine(draft.length);
    return (
      <>
        <div className="an-ed">
          <label className="an-ed__label" htmlFor={field}>
            {label}
          </label>
          <textarea
            id={field}
            ref={fieldRef}
            className="an-ed__field"
            lang={langOf(draft, lang)}
            value={draft}
            maxLength={NOTE_MAX}
            placeholder={T.pop.placeholder}
            aria-describedby={hintId}
            onChange={(e) => setDraft(e.target.value.slice(0, NOTE_MAX))}
            onKeyDown={(e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                saveNote();
              } else if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                cancelEdit();
              }
            }}
          />
          <p className="an-ed__hint" id={hintId}>
            <span className="an-ed__keys">{T.pop.hint}</span>
            {count ? (
              <span className="an-ed__count" aria-live="polite">
                {count}
              </span>
            ) : null}
          </p>
        </div>
        <div className="an-box__actions">
          <button
            type="button"
            className="rd-btn rd-btn--primary"
            onClick={saveNote}
          >
            {swap([T.pop.saveNote, T.pop.editNote, T.pop.addNote])}
          </button>
          <button
            type="button"
            className="rd-btn rd-btn--quiet"
            onClick={cancelEdit}
          >
            {T.pop.cancel}
          </button>
          {existing ? (
            <button
              type="button"
              className="rd-btn rd-btn--quiet an-del an-push"
              onClick={deleteNote}
            >
              {T.pop.deleteNote}
            </button>
          ) : null}
        </div>
      </>
    );
  }

  function popover(p: Pop): ReactNode {
    let k = "";
    let kLang: { name: string; lang: string } | null = null;
    let dialog = "";
    let where = "";
    let content: ReactNode = null;
    if (p.t === "choose") {
      const picks = p.ids.map(byId).filter((x): x is Item => !!x);
      k = T.pop.kindCount(picks.length);
      dialog = T.pop.dialogChoose;
      content = (
        <>
          <p className="an-box__fine">{T.pop.overlap}</p>
          <ul className="an-box__list">
            {picks.map((x) => (
              <li key={x.id}>
                <button
                  type="button"
                  className="an-pick"
                  onClick={() => {
                    // A pick swaps the box's content: focus goes into the box again.
                    setPop({ t: "hl", id: x.id, edit: false });
                    focusWant.current = "box";
                  }}
                >
                  <span className="an-pick__q" lang={x.lang}>
                    <mark>{clip(x.quote?.exact ?? "", 90)}</mark>
                  </span>
                  <span className="an-pick__m">
                    {x.note ? T.pop.kindHighlightNote : T.pop.kindHighlight}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      );
    } else if (p.t === "new") {
      k = T.pop.kindNew;
      dialog = T.pop.dialogNew;
      where = sel && sel.mode === "passage" ? sectionLabel(sel.sec) : "";
      content = editor(T.pop.fieldNew, false);
    } else if (p.t === "bnew") {
      const w = blockWord(p.sec);
      k = T.pop.kindBlock(w);
      dialog = k;
      where = sectionLabel(p.sec);
      content = editor(k, false);
    } else if (p.t === "changed") {
      const list = items.filter(
        (x) => !x.gone && x.status === "block" && (x.sec ?? x.block) === p.sec,
      );
      if (!list.length) return null;
      k = T.changed.kind;
      dialog = T.changed.kind;
      where = sectionLabel(p.sec);
      // One block per version the marks were made on (usually one).
      const versions = [...new Set(list.map((x) => x.version))].sort(
        (a, b) => a - b,
      );
      content = (
        <>
          {versions.map((v) => {
            const group = list.filter((x) => x.version === v);
            return (
              <div key={v} className="an-box__grp">
                <p className="an-box__fine">
                  {(group.length === 1 ? T.changed.leadOne : T.changed.leadMany)(
                    names[group[0].lang] ?? group[0].lang,
                    v,
                  )}
                </p>
                {markList(group)}
                <div className="an-box__actions">
                  <Link
                    className="an-link"
                    href={readerHref(target, {
                      lang: group[0].lang,
                      version: v,
                      section: p.sec,
                    })}
                    prefetch={false}
                  >
                    {T.changed.read(v)}
                  </Link>
                </div>
              </div>
            );
          })}
        </>
      );
    } else if (p.t === "other") {
      const list = others.filter(
        (x) => !x.gone && x.at === p.sec && x.lang === p.lang,
      );
      if (!list.length) return null;
      const name = names[p.lang] ?? p.lang;
      k = `${marksWord(list)} in `;
      kLang = { name, lang: p.lang };
      dialog = `${marksWord(list)} in ${name}`;
      where = sectionLabel(p.sec);
      content = (
        <>
          <p className="an-box__fine">
            {(list.length === 1 ? T.other.leadOne : T.other.leadMany)(
              names[lang] ?? lang,
            )}
          </p>
          {markList(list)}
          <div className="an-box__actions">
            <Link
              className="an-link"
              href={readerHref(target, {
                lang: p.lang,
                section: list[0].sec ?? list[0].block,
              })}
              prefetch={false}
            >
              {T.other.readPre}
              <span lang={p.lang}>{name}</span> →
            </Link>
          </div>
        </>
      );
    } else if (p.t === "bm") {
      const b = bms.find((x) => x.id === p.id && !x.gone);
      if (!b) return null;
      k = T.bm.kind;
      dialog = T.bm.kind;
      where = b.at ? sectionLabel(b.at) : "";
      content = p.edit ? (
        <>
          <div className="an-ed">
            <label className="an-ed__label" htmlFor={field}>
              {T.bm.label}
            </label>
            <input
              id={field}
              ref={labelRef}
              type="text"
              className="an-ed__field an-ed__field--line"
              maxLength={120}
              placeholder={T.bm.placeholder}
              defaultValue={b.label}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setLabel(b.id, labelRef.current?.value ?? "");
                  setPop({ t: "bm", id: b.id, edit: false });
                  focusWant.current = "box";
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation();
                  setPop({ t: "bm", id: b.id, edit: false });
                  focusWant.current = "box";
                }
              }}
            />
          </div>
          <div className="an-box__actions">
            <button
              type="button"
              className="rd-btn rd-btn--primary"
              onClick={() => {
                setLabel(b.id, labelRef.current?.value ?? "");
                setPop({ t: "bm", id: b.id, edit: false });
                focusWant.current = "box";
              }}
            >
              {swap4([T.bm.saveLabel, T.bm.editLabel, T.bm.addLabel])}
            </button>
            <button
              type="button"
              className="rd-btn rd-btn--quiet"
              onClick={() => {
                setPop({ t: "bm", id: b.id, edit: false });
                focusWant.current = "box";
              }}
            >
              {T.pop.cancel}
            </button>
          </div>
        </>
      ) : (
        <>
          {b.label ? (
            <p
              className="an-box__note an-box__label"
              lang={langOf(b.label, "en")}
            >
              {b.label}
            </p>
          ) : (
            <p className="an-box__fine">{T.bm.noLabel}</p>
          )}
          <div className="an-box__actions">
            <button
              type="button"
              className="rd-btn rd-btn--secondary"
              onClick={() => {
                setPop({ t: "bm", id: b.id, edit: true });
                focusWant.current = "field";
              }}
            >
              {swap4(
                b.label
                  ? [T.bm.editLabel, T.bm.saveLabel, T.bm.addLabel]
                  : [T.bm.addLabel, T.bm.editLabel, T.bm.saveLabel],
              )}
            </button>
            <button
              type="button"
              className="rd-btn rd-btn--quiet an-del an-push"
              onClick={() => removeBookmarks([b.id])}
            >
              {T.bm.remove}
            </button>
          </div>
        </>
      );
    } else {
      const it = byId(p.id);
      if (!it) return null;
      const isHl = p.t === "hl";
      const w = blockWord(it.sec ?? it.block);
      where = sectionLabel(it.sec ?? it.block);
      if (isHl) {
        k = it.note ? T.pop.kindHighlightNote : T.pop.kindHighlight;
        dialog = T.pop.kindHighlight;
      } else {
        k = T.pop.kindBlock(w);
        dialog = k;
      }
      if (p.edit) {
        content = editor(
          isHl ? (it.note ? T.pop.field : T.pop.fieldNew) : T.pop.kindBlock(w),
          !!it.note,
        );
      } else {
        const card = it.review || it.everOn;
        const line = isHl ? deleteLine({ note: it.note, card }) : null;
        content = (
          <>
            {it.note ? (
              <>
                <p className="an-box__note" lang={langOf(it.note, lang)}>
                  {it.note}
                </p>
                <div className="an-box__actions">
                  <button
                    type="button"
                    className="rd-btn rd-btn--secondary"
                    onClick={startEdit}
                  >
                    {swap([T.pop.editNote, T.pop.saveNote, T.pop.addNote])}
                  </button>
                </div>
              </>
            ) : (
              <div className="an-box__actions">
                <button
                  type="button"
                  className="rd-btn rd-btn--secondary"
                  onClick={startEdit}
                >
                  {swap([T.pop.addNote, T.pop.editNote, T.pop.saveNote])}
                </button>
              </div>
            )}
            {isHl ? (
              <>
                <hr className="an-box__rule" />
                <button
                  type="button"
                  className="an-rev"
                  role="switch"
                  aria-checked={it.review}
                  onClick={toggleReview}
                >
                  <span className="an-rev__track" aria-hidden="true">
                    <span className="an-rev__thumb" />
                  </span>
                  <span className="an-rev__label">
                    {T.pop.review} · <b>{it.review ? T.pop.on : T.pop.off}</b>
                  </span>
                  <span className="an-rev__sub">
                    {reviewLine(it.review, it.everOn)}
                  </span>
                </button>
              </>
            ) : null}
            <hr className="an-box__rule" />
            <div className="an-box__actions an-box__actions--split">
              <button
                type="button"
                className="rd-btn rd-btn--quiet an-del"
                onClick={() => remove(it.id)}
              >
                {isHl ? T.pop.deleteHighlight : T.pop.deleteNote}
              </button>
              {line ? <span className="an-box__fine">{line}</span> : null}
            </div>
          </>
        );
      }
    }
    return (
      <div
        ref={boxRef}
        className="an-box an-pop"
        role="dialog"
        aria-label={dialog}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (
            e.key === "Escape" &&
            !(e.target as Element).closest("textarea, input")
          ) {
            e.preventDefault();
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
            closePop();
          }
        }}
      >
        <div className="an-box__head">
          <p className="an-box__k">
            {k}
            {kLang ? <span lang={kLang.lang}>{kLang.name}</span> : null}
          </p>
          <button
            type="button"
            className="rd-btn rd-btn--quiet an-box__x"
            onClick={closePop}
          >
            {T.pop.close}
          </button>
        </div>
        {where ? (
          <p className="an-box__where" lang={lang}>
            {where}
          </p>
        ) : null}
        {content}
      </div>
    );
  }

  // ---- the place bar ---------------------------------------------------------------------------
  const placeUp =
    !!host &&
    !bridge?.sheetOpen &&
    !bridge?.pillUp &&
    !sel &&
    !pop &&
    !toast &&
    !save &&
    !slotSave &&
    !endSeen &&
    (plain ? true : !!blk);
  const placeSec = !plain && blk && look.has(blk) ? blk : null;

  const rowsOf = (sec: string) =>
    markers.filter(
      (m) =>
        m.sec === sec &&
        (m.kind === "bnote" || m.kind === "changed" || m.kind === "other"),
    );

  return (
    <div ref={layerRef} className="an-layer">
      <span id={desc.one} className="an-sr-desc">
        {T.desc.one}
      </span>
      <span id={desc.note} className="an-sr-desc">
        {T.desc.note}
      </span>
      <span id={desc.many} className="an-sr-desc">
        {T.desc.many}
      </span>
      {markers.length ? (
        <div className="an-rail" role="complementary" aria-label={T.margin.rail}>
          {markers.map((m) => (
            <div
              key={m.key}
              className="an-ri"
              style={
                railTops[m.key] === undefined
                  ? { top: 0, visibility: "hidden" }
                  : { top: railTops[m.key] }
              }
            >
              <MarginItem
                m={m.look}
                current={markerOpen(m)}
                onOpen={(el) => openMarker(m, el)}
              />
            </div>
          ))}
        </div>
      ) : null}
      {Object.entries(rowHosts).map(([sec, node]) =>
        createPortal(
          rowsOf(sec).map((m) => (
            <MarkerRow
              key={m.key}
              m={m.look}
              onOpen={(el) => openMarker(m, el)}
            />
          )),
          node,
          sec,
        ),
      )}
      {kind && body ? (
        <div
          ref={floatRef}
          className={`an-float an-float--${kind === "bar" ? "sel" : kind}`}
          data-placed={isPlaced ? "1" : "0"}
          style={
            isPlaced && placed
              ? {
                  left: placed.left,
                  top: placed.top,
                  width: placed.width ?? undefined,
                  maxWidth: placed.maxW,
                }
              : { left: 0, top: 0 }
          }
        >
          {body}
        </div>
      ) : null}
      {host && toast
        ? createPortal(
            <div className="an-slot an-slot--toast">
              <div className="an-toast" role="status">
                <span className="an-toast__text">{toast.text}</span>
                {toast.undo ? (
                  <button
                    type="button"
                    className="rd-btn rd-btn--quiet"
                    onClick={toast.undo}
                  >
                    {T.undo.undo}
                  </button>
                ) : toast.retry ? (
                  <button
                    type="button"
                    className="rd-btn rd-btn--quiet"
                    onClick={toast.retry}
                  >
                    {T.tryAgain}
                  </button>
                ) : null}
              </div>
            </div>,
            host.shell,
          )
        : null}
      {host && slotSave
        ? createPortal(
            <div className="an-save">
              <SignInToSave
                raised
                what={READER.save.whats[slotSave]}
                place={place}
                signInHref={signInHref}
                onDismiss={() => setSlotSave(false)}
              />
            </div>,
            host.shell,
          )
        : null}
      {host && placeUp
        ? createPortal(
            <div className="an-slot an-slot--chrome">
              {plain ? (
                <PlaceBar
                  kind="pos"
                  title=""
                  titleLang={lang}
                  on={positionOn}
                  onNote={() => {}}
                  onBookmark={() => togglePosition("place")}
                />
              ) : placeSec ? (
                <PlaceBar
                  kind="block"
                  title={sectionLabel(placeSec)}
                  titleLang={lang}
                  on={bookmarked(placeSec)}
                  onNote={() => {
                    // The page first shows what the note is about: the section's heading.
                    const el = host.root.querySelector(
                      `[data-block="${CSS.escape(placeSec)}"]`,
                    );
                    if (el) scrollUnderBar(el);
                    opener.current = { el: null, mark: null };
                    blockNote(placeSec, "place");
                  }}
                  onBookmark={() => toggleSection(placeSec, "place")}
                />
              ) : null}
            </div>,
            host.shell,
          )
        : null}
      {bridge?.open && bridge.host
        ? createPortal(
            <NotesPanel
              groups={groups}
              member={member}
              loose={place === "document"}
              plain={plain}
              editLabel={editLabel}
              langName={langName}
              bookHref={target.kind === "chapter" ? bridge.bookHref : null}
              signInHref={signInHref}
              onGo={goTo}
              onDelete={deleteFromList}
              onLabel={(it) =>
                setEditLabel((cur) => (cur === it.id ? null : it.id))
              }
              onSaveLabel={(it, label) => {
                setLabel(it.id, label);
                setEditLabel(null);
              }}
              onCancelLabel={() => setEditLabel(null)}
              onClose={() => bridge.close()}
            />,
            bridge.host,
          )
        : null}
    </div>
  );
}
