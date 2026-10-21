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
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

import { READER } from "@/content";
import {
  editAnnotation,
  removeAnnotation,
  saveAnnotation,
  type AnnotationPatch,
  type AnnotationResult,
  type AnnotationWrite,
} from "@/lib/reader/actions";
import { capture, cps, type ANode, type Captured } from "@/lib/reader/anchor";
import { TAP_IGNORE } from "@/lib/reader/chrome";
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
  NoteSection,
  ReaderNote,
  ReaderNotes,
  ReaderWrite,
} from "@/lib/reader/types";

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
 * S21 adds the bookmarks, the margin and the rows, the place bar, the Notes sheet and the
 * per-book list on top of this.
 */

const T = READER.notes;

type Item = ReaderNote & {
  /** Review this was on at some point (its card exists, active or paused). */
  everOn: boolean;
  /** Deleted, waiting out the undo line. */
  gone?: boolean;
};

type Sel = Captured & { id: number; pointer: boolean };

type Pop =
  | { t: "hl"; id: string; edit: boolean }
  | { t: "new" }
  | { t: "bnote"; id: string; edit: boolean }
  | { t: "bnew"; sec: string }
  | { t: "choose"; ids: string[] };

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
  | { op: "remove"; input: { id: string } };

const runWire = (w: Wire): Promise<AnnotationResult> =>
  w.op === "save"
    ? saveAnnotation(w.input)
    : w.op === "edit"
      ? editAnnotation(w.input)
      : removeAnnotation(w.input);

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
}

const toItem = (n: ReaderNote): Item => ({ ...n, everOn: n.review });

export function AnnotationLayer({
  notes,
  write,
  version,
  lang,
  chapterTitle,
  place,
}: AnnotationLayerProps) {
  const progress = useReaderProgress();
  const member = !!progress?.member;
  const signInHref = progress?.signInHref ?? "/login";

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
  const [sel, setSel] = useState<Sel | null>(null);
  const [pop, setPop] = useState<Pop | null>(null);
  const [save, setSave] = useState(false);
  const [slotSave, setSlotSave] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [draft, setDraft] = useState("");
  const [placed, setPlaced] = useState<Placed | null>(null);
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
  const pendingDel = useRef<{ id: string; commit: () => void } | null>(null);
  const mouseDown = useRef(false);
  // The current state, for the document listeners (registered once).
  const now = useRef({ sel, pop, save, items, member });
  useEffect(() => {
    now.current = { sel, pop, save, items, member };
  });

  // ---- where the layer lives ------------------------------------------------------------
  useEffect(() => {
    const art = layerRef.current?.closest<HTMLElement>(".rd-article");
    const root = art?.querySelector<HTMLElement>(".kb-ch");
    const shell = art?.closest<HTMLElement>(".rd-root");
    // The layer reads the server-rendered page around it once it is hydrated.
    if (art && root && shell) setHost({ art, root, shell });
  }, []);

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
          setSlotSave(true);
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
  }, [notes]);

  const enqueue = useCallback(
    (job: Omit<Job, "tries">) => {
      queue.current.push({ ...job, tries: 0 });
      void pump();
    },
    [pump],
  );

  const patchItem = useCallback(
    (id: string, change: Partial<Item>) =>
      setItems((list) =>
        list.map((x) => (x.id === id ? { ...x, ...change } : x)),
      ),
    [],
  );

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
  const active = pop?.t === "hl" ? pop.id : null;
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
      setSave(true);
      return;
    }
    clearNative();
    setSel({ ...s, pointer: true });
    setDraft("");
    setPop({ t: "new" });
    focusWant.current = "field";
  }, []);

  const blockNote = useCallback((sec: string) => {
    if (!now.current.member) {
      setSave(true);
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

  const remove = useCallback(
    (id: string) => {
      const it = now.current.items.find((x) => x.id === id);
      if (!it) return;
      flushDelete();
      patchItem(id, { gone: true });
      let timer = 0;
      const commit = () => {
        window.clearTimeout(timer);
        if (pendingDel.current?.id === id) pendingDel.current = null;
        enqueue({
          wire: { op: "remove", input: { id } },
          done: () => setItems((list) => list.filter((x) => x.id !== id)),
          undo: () => patchItem(id, { gone: false }),
        });
      };
      timer = window.setTimeout(commit, UNDO_MS);
      pendingDel.current = { id, commit };
      showToast(
        {
          text:
            it.kind === "bnote"
              ? T.undo.noteOnly
              : undoText({ note: it.note, card: it.review || it.everOn }),
          undo: () => {
            window.clearTimeout(timer);
            if (pendingDel.current?.id === id) pendingDel.current = null;
            patchItem(id, { gone: false });
            setToast(null);
          },
        },
        true,
      );
      setPop(null);
      setSel(null);
      focusWant.current = "back";
    },
    [enqueue, flushDelete, patchItem, showToast],
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
    patchItem(p.id, { review: on, everOn: it.everOn || on });
    enqueue({
      wire: { op: "edit", input: { id: p.id, review: on } },
      done: (r) =>
        patchItem(p.id, {
          review: !!r.review,
          ...(r.card ? { everOn: true } : {}),
        }),
      undo: () => patchItem(p.id, { review: it.review, everOn: it.everOn }),
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
      if (el.closest(".an-layer, .rd-end")) return;
      let c: Captured | null;
      if (!host.root.contains(sc)) {
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
        (o.mode !== "refuse" && c.mode !== "refuse"
          ? o.sec === c.sec &&
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
    [host, sections],
  );

  // ---- the page's events ---------------------------------------------------------------------
  useEffect(() => {
    if (!host) return;
    const { art } = host;
    let selT = 0;
    const inFloat = (t: EventTarget | null) =>
      t instanceof Element && !!t.closest(".an-layer");
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
      else {
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
  }, [host, kind, sig, pop, sel, items]);

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
    if (want === "field" && fieldRef.current) {
      const f = fieldRef.current;
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
        what={READER.save.whats.notes}
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
          <p className="an-box__k">{k}</p>
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
                what={READER.save.whats.notes}
                place={place}
                signInHref={signInHref}
                onDismiss={() => setSlotSave(false)}
              />
            </div>,
            host.shell,
          )
        : null}
    </div>
  );
}
