"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

import { isListenPath } from "@/lib/listen/paths";

/**
 * P41-sr.W1 — Listen's mount in the root layout (the one layout the document, chapter and
 * book routes share; it also wraps the app, auth and marketing).
 *
 *  - It reads only the pathname on the client, so the layout stays as static as it was:
 *    no headers, no cookies, no nonce, and every prerendered page stays prerendered.
 *  - Off a reader or book path it renders nothing and loads nothing beyond this module.
 *  - On one, it loads the host (`ListenHost`: the `<audio>` and the engine) as a client
 *    chunk through Next's own loader, never server-rendered. Under the reader routes'
 *    nonce CSP (`script-src 'self' 'nonce-…' 'strict-dynamic'`) that chunk is trusted the
 *    way every Next chunk is: Next's nonced bootstrap inserts it (`'strict-dynamic'`), and
 *    hls.js, when the element has no native HLS, is a further chunk of the same kind.
 */
const ListenHost = dynamic(() => import("./listen-host"), { ssr: false });

export function ListenRoot() {
  const pathname = usePathname();
  return isListenPath(pathname) ? <ListenHost /> : null;
}
