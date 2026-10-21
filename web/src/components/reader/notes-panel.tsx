"use client";

import Link from "next/link";
import { useId } from "react";

import { READER } from "@/content";
import { rowView, type Groups, type ListItem } from "@/lib/reader/note-list";

import { NoteRow } from "./note-row";
import { SignInToSave } from "./sign-in-to-save";

const T = READER.notes.sheet;

/**
 * P30.S21 — the Notes view of the Contents sheet (`05-annotations` round 01, `NotesPanel`,
 * board 11): the chapter's items in reading order, the other languages' items under "In
 * {endonym}", the Unanchored group, and the foot's "All notes in this book →". Signed out,
 * the sheet is the signed Sign in to save (`what` "highlights and notes").
 *
 * Mounted by the annotation layer into the sheet's body, because the marks live there.
 */
export function NotesPanel({
  groups,
  member,
  loose,
  plain,
  editLabel,
  langName,
  bookHref,
  signInHref,
  onGo,
  onDelete,
  onLabel,
  onSaveLabel,
  onCancelLabel,
  onClose,
}: {
  groups: Groups;
  member: boolean;
  loose: boolean;
  /** A plain Markdown document: positions only. */
  plain: boolean;
  editLabel: string | null;
  langName: (lang: string) => string;
  /** "All notes in this book →"; null in a loose document. */
  bookHref: string | null;
  signInHref: string;
  onGo: (it: ListItem) => void;
  onDelete: (it: ListItem) => void;
  onLabel: (it: ListItem) => void;
  onSaveLabel: (it: ListItem, label: string) => void;
  onCancelLabel: () => void;
  onClose: () => void;
}) {
  const uid = useId();
  const any = groups.count > 0;
  const row = (it: ListItem, withGo: boolean) => (
    <NoteRow
      key={it.id}
      view={rowView(it, "panel", langName)}
      editing={editLabel === it.id}
      onGo={withGo ? () => onGo(it) : undefined}
      onDelete={() => onDelete(it)}
      onLabel={() => onLabel(it)}
      onSaveLabel={(label) => onSaveLabel(it, label)}
      onCancelLabel={onCancelLabel}
    />
  );
  return (
    <div className="an-notes">
      {!member ? (
        <SignInToSave
          what={READER.save.whats.notes}
          place={loose ? "document" : "chapter"}
          signInHref={signInHref}
          onDismiss={onClose}
        />
      ) : null}
      {member && !any ? (
        <p className="an-empty">
          {loose
            ? T.emptyDocument
            : plain
              ? T.emptyPlainChapter
              : T.emptyChapter}
        </p>
      ) : null}
      {member && groups.items.length ? (
        <section
          className="an-group"
          aria-label={loose ? T.documentGroup : T.chapterGroup}
        >
          <p className="an-group__lead">{T.lead}</p>
          <div className="an-list" role="list">
            {groups.items.map((it) => row(it, true))}
          </div>
        </section>
      ) : null}
      {member
        ? groups.other.map((g) => {
            const name = langName(g.lang);
            return (
              <section
                key={g.lang}
                className="an-group"
                aria-labelledby={`${uid}-${g.lang}`}
              >
                <div className="an-group__head">
                  <h3 className="an-group__title" id={`${uid}-${g.lang}`}>
                    {T.inLang}
                    <span lang={g.lang}>{name}</span>
                  </h3>
                </div>
                <p className="an-group__lead">
                  {T.otherLeadPre}
                  <span lang={g.lang}>{name}</span>.
                </p>
                <div className="an-list" role="list">
                  {g.items.map((it) => row(it, true))}
                </div>
              </section>
            );
          })
        : null}
      {member && groups.orphans.length ? (
        <section className="an-group" aria-labelledby={`${uid}-u`}>
          <div className="an-group__head">
            <h3 className="an-group__title" id={`${uid}-u`}>
              {T.unanchored}
            </h3>
          </div>
          <p className="an-group__lead">{T.unanchoredLead}</p>
          <div className="an-list" role="list">
            {groups.orphans.map((it) => row(it, false))}
          </div>
        </section>
      ) : null}
      {member && bookHref ? (
        <div className="an-foot">
          <Link className="an-link" href={bookHref} prefetch={false}>
            {T.allNotes}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
