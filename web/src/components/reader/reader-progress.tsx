"use client";

import { createContext, useContext } from "react";

import type { ChapterRow } from "@/lib/reader/types";

/**
 * P30.S15 — what the frame knows about the reader's progress, handed to the chapter
 * end (a client component inside the server-rendered article) through context: the
 * end's sentence, the two marks, the sign-in address and the chapter list as it reads
 * NOW (the current row follows the reader's own finish and unread).
 */
export interface ReaderProgressValue {
  member: boolean;
  /** A member with a place to save to: the status row is real only then. */
  saves: boolean;
  /** Which of the end's four member sentences shows. */
  state: "finished" | "updated" | "unread" | "started";
  signInHref: string;
  mark: (finished: boolean) => void;
  rows: ChapterRow[];
  /** "X of M finished"; null when the book's state was not read. */
  finishedCount: number | null;
}

export const ReaderProgressContext = createContext<ReaderProgressValue | null>(
  null,
);

export function useReaderProgress(): ReaderProgressValue | null {
  return useContext(ReaderProgressContext);
}
