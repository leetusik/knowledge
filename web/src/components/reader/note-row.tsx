"use client";

import Link from "next/link";
import { useEffect, useId, useRef, type ReactNode } from "react";

import { READER } from "@/content";
import { cx } from "@/lib/cx";
import type { RowView } from "@/lib/reader/note-list";

const T = READER.notes;

/**
 * P30.S21 — a row in a list (`05-annotations` round 01, `NoteItem`, board 12): the Notes
 * sheet's rows and the per-book list's. A grid of `[the row's button | its actions]`:
 * the kind (mono), the main text, the note (3 lines), the meta; Delete or Remove, and
 * for a bookmark Add or Edit label, which opens the inline label field. An Unanchored
 * mark is not a link: it can only be deleted.
 *
 * The row's button is a `<button>` in the Notes sheet (`onGo`) and a link in the book's
 * list (`href`: it opens another page).
 */
export function NoteRow({
  view: v,
  editing,
  href,
  onGo,
  onDelete,
  onLabel,
  onSaveLabel,
  onCancelLabel,
}: {
  view: RowView;
  editing: boolean;
  href?: string;
  onGo?: () => void;
  onDelete: () => void;
  onLabel?: () => void;
  onSaveLabel?: (label: string) => void;
  onCancelLabel?: () => void;
}) {
  // Closing the label field (saved or cancelled) unmounts the focused input: focus goes back to
  // the button that opened it, so the sheet's Escape and Tab keep working.
  const labelBtn = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);
  useEffect(() => {
    if (wasEditing.current && !editing) {
      const a = document.activeElement;
      if (!a || a === document.body)
        labelBtn.current?.focus({ preventScroll: true });
    }
    wasEditing.current = editing;
  }, [editing]);
  const main: ReactNode = (
    <>
      <span className="an-li__k">
        {v.k}
        {v.review ? (
          <span className="an-li__k--on">
            <span className="an-li__sep" aria-hidden="true">
              ·
            </span>{" "}
            {T.row.reviewOn}
          </span>
        ) : null}
      </span>
      {v.hasQuote ? (
        <span
          className={cx(
            "an-li__main an-li__main--q",
            v.plainQuote && "an-li__main--plain",
            v.code && "an-li__main--code",
          )}
          lang={v.quoteLang}
        >
          {v.plainQuote ? v.quote : <mark>{v.quote}</mark>}
        </span>
      ) : null}
      {v.hasGone ? (
        <span className="an-li__main an-li__main--gone" lang={v.quoteLang}>
          <del>{v.gone}</del>
        </span>
      ) : null}
      {v.hasTitle ? (
        <span
          className={cx("an-li__main", v.titleBold && "an-li__main--b")}
          lang={v.titleLang}
        >
          {v.title}
        </span>
      ) : null}
      {v.hasNote ? (
        <span className="an-li__note" lang={v.noteLang}>
          {v.note}
        </span>
      ) : null}
      {v.hasMeta ? (
        <span className="an-li__meta">
          {v.hasLang ? <b lang={v.langCode}>{v.langName}</b> : null}
          {v.meta ? <span>{v.meta}</span> : null}
        </span>
      ) : null}
    </>
  );
  return (
    <div className="an-li" role="listitem">
      {v.canGo ? (
        href ? (
          <Link className="an-li__go" href={href} prefetch={false}>
            {main}
          </Link>
        ) : (
          <button type="button" className="an-li__go" onClick={onGo}>
            {main}
          </button>
        )
      ) : (
        <div className="an-li__go">{main}</div>
      )}
      <div className="an-li__acts">
        {v.isBm && onLabel ? (
          <button
            ref={labelBtn}
            type="button"
            className="rd-btn rd-btn--quiet"
            aria-expanded={editing}
            onClick={onLabel}
          >
            {v.labelBtn}
          </button>
        ) : null}
        <button
          type="button"
          className="rd-btn rd-btn--quiet an-del"
          aria-label={v.delAria}
          onClick={onDelete}
        >
          {v.delWord}
        </button>
      </div>
      {editing && onSaveLabel && onCancelLabel ? (
        <LabelEditor
          value={v.label}
          onSave={onSaveLabel}
          onCancel={onCancelLabel}
        />
      ) : null}
    </div>
  );
}

/** The inline label field: Enter saves, Escape cancels, focus goes to the field. */
function LabelEditor({
  value,
  onSave,
  onCancel,
}: {
  value: string;
  onSave: (label: string) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = input.current;
    if (!el) return;
    el.value = value;
    el.focus({ preventScroll: true });
    // Bring the editor into view inside the list's own scroller only, never the page.
    const box = el.closest<HTMLElement>(".rd-sheet__body");
    const li = el.closest<HTMLElement>(".an-li");
    if (box && li) {
      const b = box.getBoundingClientRect();
      const r = li.getBoundingClientRect();
      if (r.bottom > b.bottom) box.scrollTop += r.bottom - b.bottom + 16;
      else if (r.top < b.top) box.scrollTop -= b.top - r.top + 16;
    }
    // Opened once per editor; `value` is the label it opened on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const save = () => onSave(input.current?.value ?? "");
  return (
    <div className="an-li__edit">
      <div className="an-ed">
        <label className="an-ed__label" htmlFor={id}>
          {T.bm.label}
        </label>
        <input
          id={id}
          ref={input}
          type="text"
          className="an-ed__field an-ed__field--line"
          maxLength={120}
          placeholder={T.bm.placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            } else if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              onCancel();
            }
          }}
        />
      </div>
      <div className="an-box__actions">
        <button type="button" className="rd-btn rd-btn--primary" onClick={save}>
          {T.bm.saveLabel}
        </button>
        <button
          type="button"
          className="rd-btn rd-btn--quiet"
          onClick={onCancel}
        >
          {READER.notes.pop.cancel}
        </button>
      </div>
    </div>
  );
}
