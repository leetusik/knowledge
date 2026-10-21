"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";

import { READER } from "@/content";
import {
  readBridgeMessage,
  LEGACY_SANDBOX,
  restoreMessage,
} from "@/lib/legacy/messages";
import {
  readerCookieString,
  schemeFor,
  type ReaderSettings,
  type ThemeChoice,
} from "@/lib/reader-cookie";
import { LIBRARY_HREF, readerHref, signInToSaveHref } from "@/lib/reader-href";
import { saveBookmark, removeBookmark } from "@/lib/reader/actions";
import { QUIET_MS } from "@/lib/reader/chrome";
import { hangulRuns, isKorean } from "@/lib/reader/hangul";
import { positionNear } from "@/lib/reader/note-list";
import { publishedDate } from "@/lib/reader/date";
import type { ChapterRow, LegacyFrame, ReaderView } from "@/lib/reader/types";

import { ChapterList } from "./chapter-list";
import { DisplayPanel } from "./display-panel";
import { SignInToSave } from "./sign-in-to-save";
import { useLegacyReading } from "./use-legacy-reading";
import { VersionList } from "./version-list";

import "@/app/reader-fonts.css";
import "@/app/reader.css";
import "@/app/legacy.css";

/**
 * P30.S25 — the legacy reader (`09-legacy-and-print` round 01): an html explainer read in a
 * full-screen page that never scrolls, under the signed reader's chrome plus one document
 * bar. The sandboxed frame of the raw relay is the ONLY scroller; the parent never draws,
 * reads or styles the document.
 *
 *  - The page: `100dvh`, `overflow: hidden` (`legacy.css`), one flex column: the top safe
 *    area, the progress line and the top bar (never hide), the stage (the frame, its
 *    states, the resume pill, Sign in to save, "Show reading controls"), then the bottom
 *    chrome (the document bar, the chapter bar, the bottom safe area), which folds away as
 *    the document scrolls down and returns as it scrolls up (*Hide and show*).
 *  - The bridge (`@/lib/legacy/bridge`, injected by the relays) is the only channel: every
 *    `message` is judged by `readBridgeMessage` (the sender must be this frame's
 *    `contentWindow`; the shape, size and a `navigate` path are checked), anything else
 *    is ignored. The parent sends one `restore` on load (the resume, a language switch's
 *    place, From the top).
 *  - Reading memory: `useLegacyReading` (S3's rules, fed by the bridge).
 */
type Panel = "contents" | "display" | "versions" | null;
type Status = "loading" | "slow" | "ready" | "missing" | "failed";

/** "Still loading…" after this long without the document (undrawn; OQ: decided 8 s). */
const SLOW_MS = 8000;
/** After the frame's `load`, how long the parent waits for the bridge before asking the relay. */
const HELLO_GRACE_MS = 1500;
/** The language switch hands the fraction to the next page (a different document). */
const HANDOFF_KEY = "kb-legacy-place";
const HANDOFF_TTL_MS = 30_000;
const FRAME_ID = "legacy-document";

/** The other language at the same place: the anchor rides the `#hash`, the fraction this note. */
function writeHandoff(path: string, fraction: number) {
  try {
    sessionStorage.setItem(
      HANDOFF_KEY,
      JSON.stringify({ path, fraction, at: Date.now() }),
    );
  } catch {
    // storage is best effort
  }
}

function takeHandoff(path: string): number | null {
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(HANDOFF_KEY);
    const h = JSON.parse(raw) as {
      path?: unknown;
      fraction?: unknown;
      at?: unknown;
    };
    if (
      h.path === path &&
      typeof h.at === "number" &&
      Date.now() - h.at < HANDOFF_TTL_MS &&
      typeof h.fraction === "number" &&
      h.fraction >= 0 &&
      h.fraction <= 1
    ) {
      return h.fraction;
    }
  } catch {
    // a bad note is no note
  }
  return null;
}

function hashAnchor(): string | null {
  const raw = window.location.hash.slice(1);
  if (!raw) return null;
  let id = raw;
  try {
    id = decodeURIComponent(raw);
  } catch {
    // keep it raw
  }
  return id.length > 0 && id.length <= 200 ? id : null;
}

const noSubscribe = () => () => {};

function newId(): string {
  return crypto.randomUUID();
}

export function LegacyReader({
  view,
  frame,
}: {
  view: ReaderView;
  frame: LegacyFrame;
}) {
  const router = useRouter();
  const loose = view.kind === "loose" || view.book === null;
  const noun: "chapter" | "document" = loose ? "document" : "chapter";
  const book = view.book;
  const olderVersion = view.version < view.newest;
  const hasLangs = view.langs.length > 1;

  const [settings, setSettings] = useState<ReaderSettings>(view.settings);
  const [os, setOs] = useState<"light" | "dark">("light");
  const [panel, setPanel] = useState<Panel>(null);
  const [status, setStatus] = useState<Status>(
    frame.missing ? "missing" : "loading",
  );
  const [attempt, setAttempt] = useState(0);
  const [failRef, setFailRef] = useState<string | null>(null);
  const [place, setPlace] = useState<{
    fraction: number;
    anchor: string | null;
  }>({
    fraction: 0,
    anchor: null,
  });
  const [hidden, setHidden] = useState(false);
  const [tight, setTight] = useState(false);
  const [prompt, setPrompt] = useState<"bookmark" | "finish" | null>(null);
  const [pill, setPill] = useState<number | null>(null);
  const [marks, setMarks] = useState(frame.bookmarks);
  /**
   * The frame's focus ring (drawn just inside its edge in the document's scheme): only
   * once focus is moved into the frame by keyboard (a Tab, the skip link), never for the
   * quiet focus it takes after load on a desktop, nor a click into the document. An
   * iframe never matches `:focus-visible` itself (its document holds the focus), so the
   * parent tracks it.
   */
  const [ring, setRing] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const chapRef = useRef<HTMLDivElement>(null);
  const safeTopRef = useRef<HTMLDivElement>(null);
  const safeBotRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const hintId = useId();

  // Chrome rules state, read by the message handler.
  const lastF = useRef(0);
  const quietUntil = useRef(0);
  const rebase = useRef(false);
  const endLock = useRef(false);
  const panelRef = useRef<Panel>(null);
  const hiddenRef = useRef(false);
  /** This attempt has heard from the bridge. */
  const heard = useRef(false);
  /** The frame attempt now on screen; a probe for an earlier one is dropped. */
  const attemptRef = useRef(0);
  /** The restore to send once the bridge speaks; null = none. */
  const pendingRestore = useRef<{
    anchor?: string | null;
    fraction?: number | null;
  } | null>(null);
  /** The next scroll message is where a restore landed (the pill names it). */
  const landing = useRef<"pill" | "quiet" | null>(null);

  const rd = useLegacyReading(view);
  const { sample } = rd;

  useEffect(() => {
    panelRef.current = panel;
  }, [panel]);
  const shownOnce = useRef(hidden);
  useEffect(() => {
    hiddenRef.current = hidden;
    // The frame's height changed, so the fraction did: the next message only re-bases
    // (not on the first render: nothing has changed size yet). The fold animates over
    // `--rd-ease`, and the bridge reports each resize on the way, so the messages of
    // the fold itself are quiet too (they still move the baseline).
    if (shownOnce.current !== hidden) {
      rebase.current = true;
      quietUntil.current = Math.max(quietUntil.current, Date.now() + QUIET_MS);
    }
    shownOnce.current = hidden;
  }, [hidden]);

  // What the device is now (System's readout, and the frame's colour scheme).
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setOs(mq.matches ? "dark" : "light");
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // The frame is created on the client only (never in the server html, which could load
  // and speak before the page hydrates); the message listener is a layout effect, in
  // place before the frame can load.
  const mounted = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );

  // ---- where to land: the link's place, the language switch's, or the member's resume ----
  useEffect(() => {
    const anchor = hashAnchor();
    const handed = takeHandoff(
      window.location.pathname + window.location.search,
    );
    const progress = view.progress;
    if (anchor || handed !== null) {
      pendingRestore.current = {
        anchor,
        fraction: handed ?? progress?.resume?.fraction ?? null,
      };
      landing.current = "quiet";
      return;
    }
    const r = progress?.resume;
    if (r && progress?.state === "started" && view.version === view.newest) {
      pendingRestore.current = { anchor: r.block, fraction: r.fraction };
      landing.current = "pill";
    }
  }, [view.progress, view.version, view.newest]);

  // ---- loading: slow after a while; a load with no word from the bridge asks the relay ----
  useEffect(() => {
    if (status !== "loading") return;
    const t = setTimeout(
      () => setStatus((s) => (s === "loading" ? "slow" : s)),
      SLOW_MS,
    );
    return () => clearTimeout(t);
  }, [status, attempt]);

  const probeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const onFrameLoad = useCallback(() => {
    if (heard.current) return;
    const mine = attemptRef.current;
    if (probeTimer.current) clearTimeout(probeTimer.current);
    probeTimer.current = setTimeout(async () => {
      if (heard.current) return;
      let next: Status = "failed";
      let ref: string | null = null;
      try {
        const res = await fetch(frame.src, {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (res.status === 404) next = "missing";
        else if (res.ok) next = "ready";
        else {
          const type = res.headers.get("content-type") ?? "";
          if (type.includes("application/json")) {
            const body = (await res.json().catch(() => null)) as {
              ref?: unknown;
            } | null;
            if (
              body &&
              typeof body.ref === "string" &&
              /^lg-[0-9a-f]{8}$/.test(body.ref)
            ) {
              ref = body.ref;
            }
          }
        }
        if (res.ok) await res.body?.cancel().catch(() => {});
      } catch {
        next = "failed";
      }
      // A result for an earlier attempt is dropped.
      if (attemptRef.current === mine && !heard.current) {
        setStatus(next);
        setFailRef(ref);
      }
    }, HELLO_GRACE_MS);
  }, [frame.src]);
  useEffect(
    () => () => {
      if (probeTimer.current) clearTimeout(probeTimer.current);
    },
    [],
  );

  const retry = () => {
    heard.current = false;
    attemptRef.current += 1;
    setFailRef(null);
    setStatus("loading");
    setAttempt((a) => a + 1);
  };

  // ---- the bridge -----------------------------------------------------------------------
  const focusFrameQuietly = useCallback(() => {
    const el = frameRef.current;
    if (!el || panelRef.current !== null) return;
    if (!window.matchMedia("(min-width: 64rem)").matches) return;
    const active = document.activeElement;
    if (active && active !== document.body && rootRef.current?.contains(active))
      return;
    setRing(false);
    el.focus({ preventScroll: true });
  }, []);

  // Keyboard focus into the frame shows the ring; any other focus clears it.
  useEffect(() => {
    let lastTab = 0;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Tab") lastTab = Date.now();
    };
    const onBlur = () => {
      // The window blurs as focus moves into the frame's document.
      window.setTimeout(() => {
        if (
          document.activeElement === frameRef.current &&
          Date.now() - lastTab < 150
        ) {
          setRing(true);
        }
      }, 0);
    };
    const clear = () => setRing(false);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", clear);
    document.addEventListener("focusin", clear);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", clear);
      document.removeEventListener("focusin", clear);
    };
  }, []);

  const postRestore = useCallback(
    (place: { anchor?: string | null; fraction?: number | null }) => {
      const win = frameRef.current?.contentWindow;
      if (!win) return;
      quietUntil.current = Date.now() + QUIET_MS;
      win.postMessage(restoreMessage(place), "*");
    },
    [],
  );

  const onScrollMessage = useCallback(
    (f: number, anchor: string | null) => {
      const df = f - lastF.current;
      lastF.current = f;
      if (landing.current) {
        if (landing.current === "pill") setPill(Math.round(f * 100));
        landing.current = null;
      }
      setPlace((p) =>
        Math.abs(p.fraction - f) < 0.0005 && p.anchor === anchor
          ? p
          : { fraction: f, anchor },
      );
      sample({ fraction: f, anchor });

      const quiet = Date.now() < quietUntil.current;
      // A message inside the quiet window has already moved the baseline (`lastF`), so
      // it is the re-base: the next gesture counts.
      if (quiet) rebase.current = false;
      if (!quiet && panelRef.current === null) {
        let want: boolean | null = null; // true = shown
        if (f >= 0.995) {
          want = true;
          endLock.current = true;
        } else if (f <= 0.0005) want = true;
        else if (rebase.current) rebase.current = false;
        else if (df < -0.002) {
          want = true;
          endLock.current = false;
        } else if (df > 0.0005 && !endLock.current) want = false;
        if (want !== null && want === hiddenRef.current) {
          hiddenRef.current = !want;
          setHidden(!want);
          if (!want) setPill(null);
        }
      }
    },
    [sample],
  );

  useLayoutEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const msg = readBridgeMessage(
        e.source,
        frameRef.current?.contentWindow ?? null,
        e.data,
      );
      if (!msg) return;
      if (msg.type === "navigate") {
        router.push(msg.path);
        return;
      }
      if (!heard.current) {
        heard.current = true;
        if (probeTimer.current) clearTimeout(probeTimer.current);
        setStatus("ready");
        setFailRef(null);
        focusFrameQuietly();
        const want = pendingRestore.current;
        if (want) {
          pendingRestore.current = null;
          // The first word is the place before the restore; the next is where it landed.
          postRestore(want);
          return;
        }
      }
      onScrollMessage(msg.fraction, msg.anchor);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [router, focusFrameQuietly, postRestore, onScrollMessage]);

  // ---- the tight page: larger text, zoom, a short window --------------------------------
  useEffect(() => {
    const page = rootRef.current;
    if (!page || typeof ResizeObserver === "undefined") return;
    const fit = () => {
      const top = topRef.current;
      const bar = barRef.current;
      if (!top || !bar) return;
      const H = page.clientHeight;
      const rem =
        parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const chrome =
        bar.scrollHeight +
        (chapRef.current?.offsetHeight ?? 0) +
        (safeBotRef.current?.offsetHeight ?? 0);
      const room =
        H - top.offsetHeight - (safeTopRef.current?.offsetHeight ?? 0) - chrome;
      const next = H > 0 && room < Math.min(0.4 * H, 17 * rem) - 1;
      setTight((t) => (t === next ? t : next));
    };
    const ro = new ResizeObserver(fit);
    [
      page,
      topRef.current,
      chapRef.current,
      ...(barRef.current ? Array.from(barRef.current.children) : []),
    ]
      .filter((el): el is Element => !!el)
      .forEach((el) => ro.observe(el));
    fit();
    return () => ro.disconnect();
  }, [status]);

  // ---- settings ---------------------------------------------------------------------------
  const onTheme = (theme: ThemeChoice) => {
    const next = { ...settings, theme };
    setSettings(next);
    document.cookie = readerCookieString(
      next,
      window.location.protocol === "https:",
    );
  };
  const dark =
    settings.theme === "dark" || (settings.theme === "system" && os === "dark");
  const docDark = frame.look === "auto" && dark;

  // ---- sheets -----------------------------------------------------------------------------
  const closePanel = useCallback(() => setPanel(null), []);
  const openPanel = (name: Exclude<Panel, null>, from: HTMLElement | null) => {
    if (panel === name) {
      closePanel();
      return;
    }
    if (panel === null) opener.current = from;
    setPanel(name);
  };
  const sheetOpen = panel !== null;
  useEffect(() => {
    if (!sheetOpen) return;
    return () => {
      const o = opener.current;
      opener.current = null;
      if (o && o.isConnected) o.focus({ preventScroll: true });
    };
  }, [sheetOpen]);
  useEffect(() => {
    if (panel === null) return;
    sheetRef.current
      ?.querySelector<HTMLElement>(".rd-sheet__close")
      ?.focus({ preventScroll: true });
  }, [panel]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (panel === null) return;
    if (e.key === "Escape") {
      e.stopPropagation();
      closePanel();
      return;
    }
    if (e.key !== "Tab") return;
    const sheet = sheetRef.current;
    if (!sheet) return;
    const items = Array.from(
      sheet.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (!sheet.contains(active)) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  // ---- places -----------------------------------------------------------------------------
  const ready = status === "ready";
  const frac = ready ? place.fraction : 0;
  const pct = Math.round(frac * 100);
  const here = {
    lang: hasLangs ? view.lang : null,
    version: olderVersion ? view.version : null,
    section: ready ? place.anchor : null,
  };
  const signIn = signInToSaveHref(view.target, here);

  const switchTo = async (lang: string) => {
    if (lang === view.lang) return;
    await rd.flush();
    const href = readerHref(view.target, { lang, section: place.anchor });
    writeHandoff(href.split("#", 1)[0], place.fraction);
    router.push(href);
  };
  const openVersion = (n: number) => {
    closePanel();
    router.push(
      readerHref(view.target, {
        lang: hasLangs ? view.lang : null,
        version: n === view.newest ? null : n,
      }),
    );
  };
  const fromTop = () => {
    setPill(null);
    postRestore({ fraction: 0 });
  };

  // ---- bookmarks and finishing -----------------------------------------------------------
  const near = ready ? positionNear(marks, frac) : [];
  const marked = near.length > 0;
  const toggleBookmark = () => {
    if (!view.member) {
      setPrompt("bookmark");
      return;
    }
    const write = view.write;
    if (!write) return;
    if (marked) {
      const gone = marks.filter((m) => near.includes(m.id));
      setMarks((list) => list.filter((m) => !near.includes(m.id)));
      for (const m of gone) {
        void removeBookmark({ id: m.id }).then((res) => {
          if (!res.ok)
            setMarks((list) =>
              list.some((x) => x.id === m.id) ? list : [...list, m],
            );
        });
      }
      return;
    }
    const id = newId();
    const mark = { id, fraction: frac };
    setMarks((list) => [...list, mark]);
    void saveBookmark({
      ...write,
      id,
      version: view.version,
      anchor: place.anchor
        ? { fraction: frac, anchor: place.anchor }
        : { fraction: frac },
      snippet: "",
    }).then((res) => {
      if (!res.ok) setMarks((list) => list.filter((m) => m.id !== id));
    });
  };
  const onMark = (finished: boolean) => {
    if (!view.member) {
      setPrompt((p) => (p === "finish" ? null : "finish"));
      return;
    }
    void rd.mark(finished);
  };

  // The status cell: reading, or the chapter end's words once at the end of the newest version.
  let layer: "read" | "finished" | "updated" | "unread" | "anon" = "read";
  if (ready && !olderVersion && frac >= 0.95) {
    if (!view.member) layer = "anon";
    else if (rd.state !== "started") layer = rd.state;
  }

  // The chapter list as it reads now (the current row follows the reader's finish and unread).
  const rows = useMemo<ChapterRow[]>(() => {
    if (!book) return [];
    if (!rd.saves) return book.chapters;
    return book.chapters.map((row) => {
      if (!row.current) return row;
      if (rd.reading.finished) {
        return {
          ...row,
          state: "finished",
          percent: undefined,
          updated: rd.updated,
        };
      }
      return {
        ...row,
        state: "started",
        percent: Math.round(rd.reading.maxFraction * 100),
        updated: false,
      };
    });
  }, [book, rd.saves, rd.reading, rd.updated]);
  const baseFinished = view.progress?.state === "finished";
  const finishedCount =
    book && book.finished !== null
      ? Math.max(
          0,
          book.finished +
            (rd.saves
              ? (rd.reading.finished ? 1 : 0) - (baseFinished ? 1 : 0)
              : 0),
        )
      : null;

  const backHref = loose || !book ? LIBRARY_HREF : book.backHref;
  const backLong = loose || !book ? READER.top.library : book.title;
  const backShort = loose || !book ? READER.top.library : READER.top.bookShort;
  const prev = book?.prev;
  const next = book?.next;
  const isLast = !!book && !next;
  const botHidden = hidden && ready;
  const hasHistory =
    !!view.versions && view.versions.ok && view.versions.rows.length > 1;
  const date = publishedDate(view.date);
  const L = READER.legacy;
  const E = READER.end;
  const O = READER.opening;

  const endLines: {
    key: typeof layer;
    word: string;
    sub: string;
    act: "unread" | "finish";
  }[] = view.member
    ? [
        {
          key: "finished",
          word: E.finished[0],
          sub: E.finished[1],
          act: "unread",
        },
        {
          key: "updated",
          word: E.updated(noun)[0],
          sub: E.updated(noun)[1],
          act: "unread",
        },
        { key: "unread", word: E.unread[0], sub: E.unread[1], act: "finish" },
      ]
    : [
        {
          key: "anon",
          word: E.signedOut[0],
          sub: E.signedOut[1],
          act: "finish",
        },
      ];

  const historyLink = hasHistory ? (
    <>
      <span aria-hidden="true">·</span>
      <button
        type="button"
        className="rd-linkbtn"
        aria-haspopup="dialog"
        onClick={(e) => openPanel("versions", e.currentTarget)}
      >
        {O.versionHistory}
      </button>
    </>
  ) : null;

  const rootClass = [
    "rd-root",
    "rd-size-3",
    "lg-page",
    loose ? "rd-loose" : "",
    hasLangs ? "rd-langs" : "",
    botHidden ? "lg-bot-hidden" : "",
    tight ? "lg-tight" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const langSwitch = (slot: "bar" | "row") =>
    hasLangs ? (
      <div
        className={`rd-lang rd-lang--${slot}`}
        role="group"
        aria-label={READER.top.languageLabel}
      >
        {view.langs.map((l) => (
          <button
            key={l.lang}
            type="button"
            className="rd-lang__opt"
            lang={l.lang}
            aria-pressed={l.lang === view.lang}
            onClick={() => void switchTo(l.lang)}
          >
            {l.label}
          </button>
        ))}
      </div>
    ) : null;

  const frameStates =
    status === "loading" ||
    status === "slow" ||
    status === "missing" ||
    status === "failed";

  return (
    <div
      ref={rootRef}
      className={rootClass}
      data-md-color-scheme={schemeFor(settings.theme)}
      data-theme-choice={settings.theme}
      lang="en"
      onKeyDown={onKeyDown}
    >
      <div className="rd-in">
        <a
          className="rd-btn rd-btn--secondary lg-skip"
          href={`#${FRAME_ID}`}
          onClick={(e) => {
            const el = frameRef.current;
            if (!el) return;
            e.preventDefault();
            el.focus({ preventScroll: true });
            // Activated by keyboard (the link shows only while focused): the ring shows.
            setRing(e.detail === 0);
          }}
        >
          {L.skip}
        </a>
        <div
          className="lg-safe lg-safe--t"
          ref={safeTopRef}
          aria-hidden="true"
        />
        <div className="lg-topbox" ref={topRef}>
          <div className="rd-line" aria-hidden="true">
            <span className="rd-line__fill" style={{ width: `${pct}%` }} />
          </div>
          <header className="rd-top">
            <div className="rd-top__start">
              <Link
                className="rd-logo"
                href={LIBRARY_HREF}
                prefetch={false}
                aria-label={READER.top.logoLabel}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- a static 22px mark */}
                <img src="/logo.svg" alt="" width={22} height={22} />
              </Link>
              <Link className="rd-back" href={backHref} prefetch={false}>
                <span className="rd-back__chev" aria-hidden="true">
                  ‹
                </span>
                <span className="rd-back__long">{backLong}</span>
                <span className="rd-back__short">{backShort}</span>
              </Link>
              {olderVersion ? (
                <span className="rd-tag rd-top__ver">
                  {READER.top.olderVersion(view.version)}
                </span>
              ) : null}
            </div>
            <div className="rd-top__end">
              {langSwitch("bar")}
              <button
                type="button"
                className="rd-tbtn"
                aria-haspopup="dialog"
                aria-expanded={panel === "display"}
                onClick={(e) => openPanel("display", e.currentTarget)}
              >
                {READER.top.display}
              </button>
              {langSwitch("row")}
              {!view.member ? (
                <a className="rd-tbtn rd-tbtn--signin" href={signIn}>
                  {READER.top.signIn}
                </a>
              ) : null}
            </div>
          </header>
        </div>

        <main
          className="lg-stage"
          id="main-content"
          aria-label={view.title}
          aria-busy={
            status === "loading" || status === "slow" ? true : undefined
          }
        >
          {mounted && status !== "missing" && status !== "failed" ? (
            <iframe
              key={attempt}
              ref={frameRef}
              id={FRAME_ID}
              className={
                docDark ? "lg-docframe lg-docframe--dark" : "lg-docframe"
              }
              src={frame.src}
              sandbox={LEGACY_SANDBOX}
              title={L.frameLabel(view.title)}
              referrerPolicy="same-origin"
              data-ring={ring ? "1" : undefined}
              style={{ colorScheme: dark ? "dark" : "light" }}
              onLoad={onFrameLoad}
            />
          ) : null}
          {frameStates ? (
            <div
              className="lg-docframe lg-docframe--state"
              tabIndex={0}
              role="region"
              aria-label={L.frameLabel(view.title)}
            >
              {status === "loading" || status === "slow" ? (
                <div
                  className="lg-fs"
                  role="status"
                  aria-label={status === "slow" ? L.slowLabel : L.loadingLabel}
                >
                  <p className="lg-fs__line">
                    <span aria-hidden={status === "slow"}>{L.loading}</span>
                    <span aria-hidden={status !== "slow"}>{L.slow}</span>
                  </p>
                  <span className="rd-skel lg-fs__title" />
                  <span className="rd-skel lg-fs__meta" />
                  <span className="rd-skel lg-fs__ln lg-fs__w100 lg-fs__gap" />
                  <span className="rd-skel lg-fs__ln lg-fs__w96" />
                  <span className="rd-skel lg-fs__ln lg-fs__w100" />
                  <span className="rd-skel lg-fs__ln lg-fs__w72" />
                  <span className="rd-skel lg-fs__h2" />
                  <span className="rd-skel lg-fs__ln lg-fs__w100" />
                  <span className="rd-skel lg-fs__ln lg-fs__w90" />
                  <span className="rd-skel lg-fs__ln lg-fs__w48" />
                  <span className="rd-skel lg-fs__box" />
                </div>
              ) : null}
              {status === "missing" ? (
                <div className="rd-ed">
                  <span className="rd-ed__code">{L.missingCode}</span>
                  <h1 className="rd-ed__title">{L.missingTitle(noun)}</h1>
                  <p className="rd-ed__sub">{L.missingSub(noun)}</p>
                  <div className="rd-ed__actions">
                    <Link
                      className="rd-btn rd-btn--primary"
                      href={backHref}
                      prefetch={false}
                    >
                      <span aria-hidden="true">‹</span>{" "}
                      {loose ? L.backToLibrary : L.backToBook}
                    </Link>
                  </div>
                </div>
              ) : null}
              {status === "failed" ? (
                <div className="rd-ed">
                  <span className="rd-ed__code">{L.failedCode}</span>
                  <h1 className="rd-ed__title">{L.failedTitle}</h1>
                  <p className="rd-ed__sub">{L.failedSub}</p>
                  <div className="rd-ed__actions">
                    <button
                      type="button"
                      className="rd-btn rd-btn--primary"
                      onClick={retry}
                    >
                      {READER.states.retry}
                    </button>
                  </div>
                  {failRef ? (
                    <p className="rd-ed__ref">
                      {READER.states.refPrefix} · {failRef}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {botHidden ? (
            <button
              type="button"
              className="rd-btn rd-btn--secondary lg-showctl"
              onClick={() => {
                hiddenRef.current = false;
                setHidden(false);
              }}
            >
              {READER.showControls}
            </button>
          ) : null}

          {ready &&
          view.member &&
          pill !== null &&
          panel === null &&
          !botHidden ? (
            <div className="rd-resume">
              <span className="rd-resume__text">
                {READER.resume.lead} · <b>{pill}%</b>
              </span>
              <button
                type="button"
                className="rd-btn rd-btn--quiet"
                onClick={fromTop}
              >
                {READER.resume.fromTop}
              </button>
            </div>
          ) : null}

          {prompt && !view.member && ready ? (
            <div className="lg-slot">
              <SignInToSave
                what={
                  prompt === "bookmark"
                    ? READER.save.whats.bookmarks
                    : READER.save.whats.progress
                }
                place={noun}
                raised
                signInHref={signIn}
                onDismiss={() => setPrompt(null)}
              />
            </div>
          ) : null}
        </main>

        <div className="lg-bottom">
          <div className="lg-bottom__in">
            <div className="lg-bottom__bar" ref={barRef}>
              <div className="lg-bar" role="region" aria-label={L.region}>
                {olderVersion ? (
                  <div className="rd-notice">
                    <p className="rd-notice__text">
                      <span className="rd-notice__label">{O.olderVersion}</span>
                      <span>
                        {O.olderVersionBody(view.version, view.newest, noun)}
                      </span>
                    </p>
                    <button
                      type="button"
                      className="rd-linkbtn"
                      onClick={() => openVersion(view.newest)}
                    >
                      <span>{O.readNewest(view.newest)}</span>
                    </button>
                  </div>
                ) : view.staleSource ? (
                  <div className="rd-notice">
                    <p className="rd-notice__text">
                      <span className="rd-notice__label">
                        {O.olderTranslation}
                      </span>
                      <span>
                        {O.olderTranslationBody(
                          view.staleSource.label,
                          view.staleSource.from,
                          view.staleSource.newest,
                        )}
                      </span>
                    </p>
                    <button
                      type="button"
                      className="rd-linkbtn"
                      onClick={() =>
                        view.staleSource && void switchTo(view.staleSource.lang)
                      }
                    >
                      <span>
                        {O.readSource(
                          view.staleSource.label,
                          view.staleSource.newest,
                        )}
                      </span>
                    </button>
                  </div>
                ) : null}
                <div className="lg-bar__row">
                  <div className="lg-bar__status" aria-live="polite">
                    <div
                      className={
                        layer === "read"
                          ? "lg-bar__layer"
                          : "lg-bar__layer is-off"
                      }
                      aria-hidden={layer === "read" ? undefined : true}
                    >
                      <p className="lg-bar__line">
                        <span className="rd-tag rd-tag--plain">
                          {READER.chapterList.originalLayout}
                        </span>
                        <span className="lg-bar__title" lang={view.lang}>
                          {hangulRuns(view.title, !isKorean(view.lang))}
                        </span>
                      </p>
                      <p className="lg-bar__meta">
                        <span>{O.version(view.version, date)}</span>
                        {historyLink}
                      </p>
                    </div>
                    {endLines.map((e) => (
                      <div
                        key={e.key}
                        className={
                          layer === e.key
                            ? "lg-bar__layer"
                            : "lg-bar__layer is-off"
                        }
                        aria-hidden={layer === e.key ? undefined : true}
                      >
                        <p className="lg-bar__state">
                          <span className="lg-bar__word">{e.word}</span>
                          <span className="lg-bar__sub">{e.sub}</span>
                        </p>
                        <p className="lg-bar__meta">
                          {e.act === "unread" ? (
                            <button
                              type="button"
                              className="rd-linkbtn"
                              onClick={() => onMark(false)}
                            >
                              {E.markUnread}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="rd-linkbtn"
                              aria-expanded={
                                view.member ? undefined : prompt === "finish"
                              }
                              onClick={() => onMark(true)}
                            >
                              {E.markFinished}
                            </button>
                          )}
                          {historyLink}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div
                    className={
                      ready ? "lg-bar__actions" : "lg-bar__actions is-off"
                    }
                    aria-hidden={ready ? undefined : true}
                  >
                    <a
                      className="rd-btn rd-btn--secondary"
                      href={frame.src}
                      target="_blank"
                      rel="noopener"
                      aria-describedby={hintId}
                      tabIndex={ready ? undefined : -1}
                    >
                      {L.print}
                    </a>
                    <span className="lg-sr" id={hintId} hidden>
                      {L.printHint}
                    </span>
                    <span className="an-legacy__ctl">
                      <button
                        type="button"
                        className="rd-btn rd-btn--secondary an-bar__btn"
                        aria-pressed={marked}
                        tabIndex={ready ? undefined : -1}
                        onClick={toggleBookmark}
                      >
                        <span className="an-btn-w">
                          <span aria-hidden={!marked}>
                            {READER.notes.bm.positionOn}
                          </span>
                          <span aria-hidden={marked}>
                            {READER.notes.bm.position}
                          </span>
                        </span>
                      </button>
                    </span>
                  </div>
                </div>
                <div className="lg-bar__notes">
                  <p className="an-legacy__na">{READER.notes.bm.plain}</p>
                  <p className="an-legacy__na">{L.noRestyle}</p>
                </div>
              </div>
            </div>

            {book ? (
              <div className="lg-chap" ref={chapRef}>
                <nav className="rd-bottom" aria-label={READER.bottom.navLabel}>
                  <div className="rd-bottom__cell">
                    {prev ? (
                      <Link
                        className="rd-bnav rd-bnav--prev"
                        href={prev.href}
                        prefetch={false}
                      >
                        <span className="rd-bnav__dir">
                          <span className="rd-bnav__chev" aria-hidden="true">
                            ‹
                          </span>{" "}
                          {READER.bottom.previous}
                        </span>
                        <span className="rd-bnav__mark" aria-hidden="true">
                          ‹
                        </span>
                        <span className="rd-bnav__sub" lang={prev.lang}>
                          {hangulRuns(prev.title, !isKorean(prev.lang))}
                        </span>
                      </Link>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="rd-bnav rd-bnav--mid"
                    aria-haspopup="dialog"
                    aria-expanded={panel === "contents"}
                    onClick={(e) => openPanel("contents", e.currentTarget)}
                  >
                    <span className="rd-bnav__dir">
                      {READER.bottom.contents}
                    </span>
                    <span className="rd-bnav__sub">
                      {READER.bottom.where(book.n, book.total, pct)}
                    </span>
                    <span className="rd-bnav__count" aria-hidden="true">
                      {READER.bottom.count(book.n, book.total)}
                    </span>
                  </button>
                  <div className="rd-bottom__cell rd-bottom__cell--end">
                    {next ? (
                      <Link
                        className="rd-bnav rd-bnav--next"
                        href={next.href}
                        prefetch={false}
                      >
                        <span className="rd-bnav__dir">
                          {READER.bottom.next}
                        </span>
                        <span className="rd-bnav__mark" aria-hidden="true">
                          →
                        </span>
                        <span className="rd-bnav__sub" lang={next.lang}>
                          {hangulRuns(next.title, !isKorean(next.lang))}
                        </span>
                      </Link>
                    ) : null}
                    {isLast ? (
                      <Link
                        className="rd-bnav rd-bnav--next"
                        href={book.backHref}
                        prefetch={false}
                      >
                        <span className="rd-bnav__dir">
                          <span className="rd-bnav__long">
                            {READER.bottom.backToBook}
                          </span>
                          <span className="rd-bnav__short">
                            {READER.bottom.backToBookShort}
                          </span>
                        </span>
                        <span className="rd-bnav__mark" aria-hidden="true">
                          →
                        </span>
                        <span className="rd-bnav__sub">{book.title}</span>
                      </Link>
                    ) : null}
                  </div>
                </nav>
              </div>
            ) : null}
            <div
              className="lg-safe lg-safe--b"
              ref={safeBotRef}
              aria-hidden="true"
            />
          </div>
        </div>

        {panel !== null ? (
          <>
            <button
              type="button"
              className="rd-scrim"
              tabIndex={-1}
              aria-label={READER.sheets.closePanel}
              onClick={closePanel}
            />
            <div
              ref={sheetRef}
              className={`rd-sheet ${panel === "contents" ? "rd-sheet--left" : "rd-sheet--right"}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
            >
              <div className="rd-sheet__head">
                <h2 className="rd-sheet__title" id={titleId}>
                  {panel === "contents"
                    ? READER.sheets.contents
                    : panel === "versions"
                      ? READER.sheets.versionHistory
                      : READER.sheets.display}
                </h2>
                <button
                  type="button"
                  className="rd-btn rd-btn--quiet rd-sheet__close"
                  onClick={closePanel}
                >
                  {READER.sheets.close}
                </button>
              </div>
              <div className="rd-sheet__body">
                {panel === "contents" && book ? (
                  <>
                    <p className="rd-sheet__booktitle">
                      {hangulRuns(book.title, true)}
                    </p>
                    <p className="rd-sheet__bookmeta">
                      {READER.sheets.bookMeta(
                        book.n,
                        book.total,
                        view.member ? finishedCount : null,
                      )}
                    </p>
                    <ChapterList
                      rows={rows}
                      member={view.member}
                      lang={view.lang}
                      onOpen={closePanel}
                    />
                  </>
                ) : null}
                {panel === "versions" && view.versions ? (
                  <VersionList
                    versions={view.versions}
                    version={view.version}
                    newest={view.newest}
                    noun={noun}
                    onOpen={openVersion}
                  />
                ) : null}
                {panel === "display" ? (
                  <DisplayPanel
                    size={settings.size}
                    theme={settings.theme}
                    os={os}
                    onSize={() => {}}
                    onTheme={onTheme}
                    look={frame.look}
                  />
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
