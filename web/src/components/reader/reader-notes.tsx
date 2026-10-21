"use client";

import { createContext, useContext } from "react";

/**
 * P30.S21 — what the frame and the annotation layer tell each other (`05-annotations`):
 * the Notes view of the Contents sheet is the frame's sheet, but the marks it lists live
 * in the layer, so the frame hands the layer the sheet's body to mount the list in, and
 * the layer reports its count for the sheet's head. The layer also asks what covers the
 * page (a sheet, the resume pill), because the place bar yields to both.
 */
export interface NotesBridge {
  /** The Notes view of the sheet is open. */
  open: boolean;
  /** The node the layer mounts the Notes list in (set while the view is open). */
  host: HTMLElement | null;
  /** The layer reports "Notes · N" for the sheet's head. */
  setCount: (n: number) => void;
  /** Close the sheet. */
  close: () => void;
  /** Any sheet is open. */
  sheetOpen: boolean;
  /** The signed resume pill is showing. */
  pillUp: boolean;
  /** "All notes in this book →", for the place the reader is at; null in a loose document. */
  bookHref: string | null;
}

export const NotesBridgeContext = createContext<NotesBridge | null>(null);

export function useNotesBridge(): NotesBridge | null {
  return useContext(NotesBridgeContext);
}
