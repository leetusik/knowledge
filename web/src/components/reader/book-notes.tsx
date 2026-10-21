"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { READER } from "@/content";
import { LIBRARY_HREF } from "@/lib/reader-href";
import { schemeFor, type ReaderSettings } from "@/lib/reader-cookie";
import {
  editBookmark,
  removeAnnotation,
  removeBookmark,
} from "@/lib/reader/actions";
import type { BookNotesView } from "@/lib/reader/book-notes-load";
import {
  bookCountLine,
  bookCounts,
  groupBook,
  rowView,
  type BookFilter,
} from "@/lib/reader/note-list";
import { UNDO_MS, undoText } from "@/lib/reader/notes";

import { NoteRow } from "./note-row";

import "@/app/reader-fonts.css";
import "@/app/reader.css";

const B = READER.notes.book;
const T = READER.notes;

interface Toast {
  id: number;
  text: string;
  undo?: () => void;
}

/**
 * P30.S21 — the per-book list (`05-annotations` round 01 *The per-book list*, board 04,
 * with round 02's back link): a page of its own in the reader's look. The sticky top bar
 * (the logo to the library, "‹ Back to the chapter" or "‹ Back to the book"), the head
 * (the book's title, "Notes in this book", the count line), the filter (All, Bookmarks,
 * Highlights and notes), then the chapters in book order with their rows.
 *
 * Choosing a row opens its chapter in the row's language at the mark. A delete made here
 * shows the undo line on this page and waits it out before it is sent, like the reader's.
 * A mark whose delete is not saved comes back, with the "Not saved" line.
 */
export function BookNotes({
  view,
  settings,
}: {
  view: BookNotesView;
  settings: ReaderSettings;
}) {
  const [filter, setFilter] = useState<BookFilter>("all");
  const [gone, setGone] = useState<ReadonlySet<string>>(new Set());
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [dropped, setDropped] = useState<ReadonlySet<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const seq = useRef(0);
  const pending = useRef<{ key: string; commit: () => void } | null>(null);
  const headId = useId();

  const name = useCallback(
    (l: string) => view.langNames[l] ?? l,
    [view.langNames],
  );

  // The rows as they read now: a bookmark's label as saved, a deleted mark out.
  const rows = useMemo(
    () =>
      view.rows
        .filter(
          (r) => !dropped.has(r.entry.item.id) && !gone.has(r.entry.item.id),
        )
        .map((r) => {
          const lbl = labels[r.entry.item.id];
          return lbl === undefined
            ? r
            : {
                ...r,
                entry: { ...r.entry, item: { ...r.entry.item, label: lbl } },
              };
        }),
    [view.rows, dropped, gone, labels],
  );
  const entries = useMemo(() => rows.map((r) => r.entry), [rows]);
  const hrefOf = useMemo(
    () => new Map(rows.map((r) => [r.entry.item.id, r.href])),
    [rows],
  );
  const shown = useMemo(
    () => groupBook(entries, filter, view.chapters),
    [entries, filter, view.chapters],
  );
  const counts = bookCounts(entries);
  const showToast = useCallback((t: Omit<Toast, "id">, timed: boolean) => {
    seq.current += 1;
    const id = seq.current;
    setToast({ id, ...t });
    if (timed)
      window.setTimeout(
        () => setToast((c) => (c && c.id === id ? null : c)),
        UNDO_MS,
      );
  }, []);

  const flush = useCallback(() => pending.current?.commit(), []);
  useEffect(() => {
    const away = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", away);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", away);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [flush]);

  const remove = (id: string) => {
    const r = rows.find((x) => x.entry.item.id === id);
    if (!r) return;
    const it = r.entry.item;
    flush();
    setGone((g) => new Set(g).add(id));
    setEditing(null);
    let timer = 0;
    const commit = async () => {
      window.clearTimeout(timer);
      if (pending.current?.key === id) pending.current = null;
      let ok = false;
      try {
        const res =
          it.kind === "bm"
            ? await removeBookmark({ id })
            : await removeAnnotation({ id });
        ok = res.ok;
      } catch {
        ok = false;
      }
      if (ok) setDropped((d) => new Set(d).add(id));
      else {
        // Not deleted: it comes back, and the line says so.
        setGone((g) => {
          const n = new Set(g);
          n.delete(id);
          return n;
        });
        showToast({ text: T.notSaved }, true);
      }
    };
    timer = window.setTimeout(() => void commit(), UNDO_MS);
    pending.current = { key: id, commit: () => void commit() };
    showToast(
      {
        text:
          it.kind === "bm"
            ? T.bm.removed
            : it.kind === "bnote"
              ? T.undo.noteOnly
              : undoText({ note: it.note, card: it.card !== "" }),
        undo: () => {
          window.clearTimeout(timer);
          if (pending.current?.key === id) pending.current = null;
          setGone((g) => {
            const n = new Set(g);
            n.delete(id);
            return n;
          });
          setToast(null);
        },
      },
      true,
    );
  };

  const saveLabel = async (id: string, label: string) => {
    const before =
      rows.find((x) => x.entry.item.id === id)?.entry.item.label ?? "";
    const clean = label.trim().slice(0, 120);
    setEditing(null);
    if (clean === before) return;
    setLabels((l) => ({ ...l, [id]: clean }));
    let ok = false;
    try {
      ok = (await editBookmark({ id, label: clean || null })).ok;
    } catch {
      ok = false;
    }
    if (!ok) {
      setLabels((l) => ({ ...l, [id]: before }));
      showToast({ text: T.notSaved }, true);
    }
  };

  const empty =
    filter === "bm"
      ? B.emptyBookmarks
      : filter === "hl"
        ? B.emptyHighlights
        : B.emptyAll;
  const rootClass = ["rd-root", `rd-size-${settings.size}`].join(" ");
  const filters: [BookFilter, string][] = [
    ["all", B.all],
    ["bm", B.bookmarks],
    ["hl", B.highlights],
  ];

  // The device's text size and theme are the reader's own (the `kb_reader` cookie, read on the server).
  return (
    <div
      className={rootClass}
      data-md-color-scheme={schemeFor(settings.theme)}
      data-theme-choice={settings.theme}
      lang="en"
    >
      <div className="rd-in">
        <div className="an-page">
          <header className="an-page__top">
            <Link
              className="rd-logo"
              href={LIBRARY_HREF}
              prefetch={false}
              aria-label={READER.top.logoLabel}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- a static 22px mark */}
              <img src="/logo.svg" alt="" width={22} height={22} />
            </Link>
            <Link className="rd-back" href={view.back.href} prefetch={false}>
              <span className="rd-back__chev" aria-hidden="true">
                ‹
              </span>
              <span className="an-page__backt">
                {view.back.kind === "book" ? B.backBook : B.backChapter}
              </span>
            </Link>
          </header>
          <main className="an-page__main" id="main-content">
            <p className="an-page__book">{view.bookTitle}</p>
            <h1 className="an-page__title">{B.title}</h1>
            <p className="an-page__count">
              {bookCountLine(entries, filter, shown.length)}
            </p>
            <div className="an-page__filters">
              <div className="an-filter" role="group" aria-label={B.show}>
                {filters.map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    className="an-filter__opt"
                    aria-pressed={filter === k}
                    onClick={() => setFilter(k)}
                  >
                    {label}
                    <span className="an-filter__n">{counts[k]}</span>
                  </button>
                ))}
              </div>
            </div>
            {shown.length === 0 ? <p className="an-empty">{empty}</p> : null}
            {shown.map((c) => (
              <section
                key={c.key}
                className="an-chap"
                aria-labelledby={`${headId}-${c.key}`}
              >
                <div className="an-chap__head">
                  <span className="an-chap__n">{B.chapterN(c.n)}</span>
                  <h2
                    className="an-chap__title"
                    id={`${headId}-${c.key}`}
                    lang={c.lang}
                  >
                    {c.title}
                  </h2>
                </div>
                <div className="an-list" role="list">
                  {c.entries.map((e) => (
                    <NoteRow
                      key={e.item.id}
                      view={rowView(e.item, "book", name)}
                      editing={editing === e.item.id}
                      href={hrefOf.get(e.item.id) ?? undefined}
                      onDelete={() => remove(e.item.id)}
                      onLabel={() =>
                        setEditing((cur) =>
                          cur === e.item.id ? null : e.item.id,
                        )
                      }
                      onSaveLabel={(label) => void saveLabel(e.item.id, label)}
                      onCancelLabel={() => setEditing(null)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </main>
        </div>
        {toast ? (
          <div className="an-slot an-slot--toast an-slot--page">
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
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
