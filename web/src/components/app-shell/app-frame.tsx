"use client";

import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { APP_SHELL } from "@/content";
import { railCookieString, readRailCookie } from "@/lib/rail-cookie";

import "./app-frame.css";
import { RAIL_ID, RailNav } from "./rail-nav";

/**
 * The fold state lives in the COOKIE, not in React — the frame merely subscribes to it.
 *
 * That is deliberate, and it is what makes the two failure modes impossible rather than
 * merely unlikely. `useState(defaultCollapsed)` would seed ONCE and ignore every later
 * prop, and navigating from `(app)` into `(public)/documents/[id]` crosses route groups,
 * which MOUNTS a second frame from a server render that could in principle predate the
 * last toggle (a prefetched RSC payload). A `useState` mirror would then have to be
 * reconciled in an effect — which this repo's React Compiler lint rightly forbids
 * (`react-hooks/set-state-in-effect`). With the jar as the single source there is no
 * mirror to drift and nothing to reconcile.
 *
 * The store is a plain module-scope emitter: cookies fire no events, so the only writer
 * is `writeRail` below and it notifies subscribers itself.
 */
const listeners = new Set<() => void>();

function subscribeRail(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

/** `true`/`false` when a preference is stored, `null` for "no opinion". A primitive, so
 *  it is a stable snapshot no matter how often React asks. */
function railSnapshot(): boolean | null {
  return readRailCookie(document.cookie);
}

/** The SSR/hydration snapshot — never touches `document`. `null` defers to the value the
 *  server already rendered; React re-reads the live snapshot right after hydration, so a
 *  stale payload self-corrects without a mismatch. */
function railServerSnapshot(): boolean | null {
  return null;
}

function writeRail(collapsed: boolean): void {
  document.cookie = railCookieString(collapsed, location.protocol === "https:");
  for (const onStoreChange of listeners) onStoreChange();
}

/**
 * The shell's ONE stateful frame — the sticky topbar band plus the [rail | main] grid,
 * holding the fold bit that both of them need. A client island for exactly one reason:
 * the toggle lives in the topbar and the grid it collapses is the topbar's SIBLING, so
 * some common ancestor has to own the state.
 *
 * Everything it frames stays SERVER-rendered: `topbar` and `children` are ReactNodes
 * built in the server `AppShell` and handed down as slots, so this module never imports
 * them and nothing extra reaches the client bundle. The identity OBJECT is never a prop
 * here — only its already-rendered nodes ride inside the `topbar` slot, which keeps the
 * shell's standing rule (a live session's surroundings do not cross a client boundary).
 *
 * `defaultCollapsed` comes from the `kb_rail` cookie read on the server, so the very
 * first paint is already folded — no flash of an expanded rail, no localStorage.
 */
export function AppFrame({
  defaultCollapsed,
  topbar,
  children,
}: {
  defaultCollapsed: boolean;
  topbar: ReactNode;
  children: ReactNode;
}) {
  // No stored preference means the visitor has never toggled — then the server's value
  // IS the truth, which is what the `??` says.
  const stored = useSyncExternalStore(
    subscribeRail,
    railSnapshot,
    railServerSnapshot,
  );
  const collapsed = stored ?? defaultCollapsed;

  // Write-through: no server action (a network round-trip for chrome) and no
  // `router.refresh()` — the cookie exists so the NEXT server render is right, not to
  // drive this one. Writing it synchronously in the handler means any RSC request the
  // ensuing navigation makes already carries the new value.
  function toggle() {
    writeRail(!collapsed);
  }

  return (
    <>
      <header className="kb-topbar sticky top-0 z-20">
        {/* The accessible NAME is constant and the state rides on `aria-expanded` —
            flipping both would announce "Show navigation, expanded", which contradicts
            itself. `title` is the mouse-only tooltip; `aria-label` wins the name
            computation, so it never reaches the accessibility tree. */}
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-controls={RAIL_ID}
          aria-label={APP_SHELL.railToggleLabel}
          title={collapsed ? APP_SHELL.railShowTitle : APP_SHELL.railHideTitle}
          className="kb-appbtn kb-appbtn--ghost kb-appbtn--sm kb-railtoggle"
        >
          {collapsed ? (
            <PanelLeftOpen size={16} aria-hidden />
          ) : (
            <PanelLeftClose size={16} aria-hidden />
          )}
        </button>
        {topbar}
      </header>

      <div
        className="kb-app-layout"
        data-rail={collapsed ? "collapsed" : "expanded"}
        style={{ minHeight: "calc(100dvh - var(--kb-app-topbar-h))" }}
      >
        {/* The rail stays MOUNTED when folded — `app-frame.css` hides it — so the no-JS
            floor is the rail in its default expanded state, links and all. */}
        <RailNav />
        <main id="main-content" className="kb-app-main">
          {children}
        </main>
      </div>
    </>
  );
}
