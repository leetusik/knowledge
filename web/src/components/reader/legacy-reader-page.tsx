import type { LoadedLegacy } from "@/lib/reader/load";

import { LegacyReader } from "./legacy-reader";

/**
 * P30.S25 — an html explainer in the legacy reader (`09-legacy-and-print`). Keyed by what
 * is on screen (the document and its version), so opening another chapter, language or
 * version starts it fresh: the frame, the bridge's place, the pill and the hold all end
 * with the view.
 */
export function LegacyReaderPage({ legacy }: { legacy: LoadedLegacy }) {
  return (
    <LegacyReader
      key={`${legacy.docId}:${legacy.view.version}`}
      view={legacy.view}
      frame={legacy.frame}
    />
  );
}
