import type { ReaderSettings } from "@/lib/reader-cookie";

import type { ReaderView } from "./types";

/**
 * The view model of the loading / not found / failed screens: no chapter yet (or
 * none), so the frame draws the line and the top bar with the library as the way
 * back, no chapter bar and no "Sign in" (a miss says nothing about why, so it offers
 * no return address either).
 */
export function stateView(settings: ReaderSettings): ReaderView {
  return {
    kind: "loose",
    member: true,
    title: "",
    lang: "en",
    langs: [],
    version: 1,
    newest: 1,
    target: { kind: "document", id: 0 },
    book: null,
    headings: [],
    settings,
  };
}
