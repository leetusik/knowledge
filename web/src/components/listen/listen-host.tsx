"use client";

import { useEffect, useRef } from "react";

import { createEngine } from "@/lib/listen/engine";
import { setEngine } from "@/lib/listen/store";

/**
 * P41-sr.W1 — the persistent player: the page's one `<audio>` element and its engine
 * (`@/lib/listen/engine`). Mounted above the routes (the root layout, through
 * `ListenRoot`), so moving between reader pages on the client never stops a Listen (R3:
 * only a full page load does). It draws nothing: the dock and the note are the reader's.
 */
export default function ListenHost() {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;
    const engine = createEngine(audio);
    setEngine(engine);
    return () => {
      setEngine(null);
      engine.destroy();
    };
  }, []);
  return <audio ref={ref} preload="none" hidden />;
}
