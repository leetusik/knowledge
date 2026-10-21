"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

import { READER } from "@/content";
import {
  readerCookieString,
  schemeFor,
  type ReaderSettings,
  type TextSize,
  type ThemeChoice,
} from "@/lib/reader-cookie";
import { LIBRARY_HREF, readerHref, signInToSaveHref } from "@/lib/reader-href";
import {
  progressPercent,
  QUIET_MS,
  stepChrome,
  TAP_IGNORE,
  type ChromeScroll,
} from "@/lib/reader/chrome";
import { hangulRuns, isKorean } from "@/lib/reader/hangul";
import type { ChapterRow, ReaderView } from "@/lib/reader/types";

import { ChapterList } from "./chapter-list";
import { DisplayPanel } from "./display-panel";
import {
  ReaderProgressContext,
  type ReaderProgressValue,
} from "./reader-progress";
import { useReading } from "./use-reading";
import { OPEN_SHEET_EVENT } from "./versions-button";
import { VersionList } from "./version-list";

import "@/app/reader-fonts.css";
import "@/app/reader.css";

/**
 * The reader's frame (`01-reader` round 02 + the round-03 delta): the progress line,
 * the top bar, the chapter bar, the Contents and Display sheets, and the chrome's
 * behaviour around the article. The article itself arrives as `children`, rendered on
 * the server (S12's pipeline); only this shell is a client island.
 *
 * The window scrolls. This file owns:
 *  - the chrome rules (hide on scroll down, show on scroll up / near either end /
 *    on a tap on the text; ignored for 450ms after the reader's own scroll and while a
 *    sheet is open), via `stepChrome`;
 *  - progress (the line, "Chapter N of M · P%") and the section being read;
 *  - the sheets (Contents, Display, Version history): focus moves to Close, Tab cycles
 *    inside, Escape / Close / the scrim close and return focus to the opener, the
 *    chrome cannot hide meanwhile. Version history opens on the opening's
 *    `reader:open-sheet` event;
 *  - the reader's memory (`useReading`, P30.S15): the resume pill, the position
 *    cadence and beacon, finish and unread, handed to the chapter end by context;
 *  - the device settings: applied live, written to the `kb_reader` cookie, never sent
 *    to the server.
 * `state` other than `ready` is the loading / not found / failed screen: the line and
 * top bar stay, the chapter bar appears only once the chapter is ready.
 */
type Panel = "contents" | "display" | "versions" | null;

export function ReaderFrame({
  view,
  state = "ready",
  children,
}: {
  view: ReaderView;
  state?: "ready" | "loading" | "notfound" | "failed";
  children: ReactNode;
}) {
  const router = useRouter();
  const ready = state === "ready";
  const loose = view.kind === "loose" || view.book === null;
  const hasBottom = ready && !loose;

  const [settings, setSettings] = useState<ReaderSettings>(view.settings);
  const [panel, setPanel] = useState<Panel>(null);
  const [hidden, setHidden] = useState(false);
  const [pct, setPct] = useState(0);
  const [section, setSection] = useState<string | null>(null);
  const [os, setOs] = useState<"light" | "dark">("light");

  const rootRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const quietUntil = useRef(0);
  const panelRef = useRef<Panel>(null);
  const scrollRef = useRef<ChromeScroll>({ last: 0, run: 0 });
  const titleId = useId();
  const quiet = useCallback(() => {
    quietUntil.current = Date.now() + QUIET_MS;
  }, []);
  const rd = useReading({ view, ready, rootRef, topRef, quiet });
  const { dismissPill } = rd;

  // The scroll handler reads the open sheet through a ref, so it never goes stale.
  useEffect(() => {
    panelRef.current = panel;
  }, [panel]);

  // What the device is now, for System's readout.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setOs(mq.matches ? "dark" : "light");
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // ---- the chrome and progress, on window scroll ------------------------------------
  useEffect(() => {
    if (!ready) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const top = window.scrollY;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      setPct((prev) => {
        const next = progressPercent(top, max);
        return next === prev ? prev : next;
      });
      // The section being read: the last h2 or h3 whose top is above the top bar's
      // bottom edge + 16px + 8px.
      const bottom = topRef.current?.getBoundingClientRect().bottom ?? 59;
      const line = bottom + 16 + 8;
      let found: string | null = null;
      const heads = rootRef.current?.querySelectorAll<HTMLElement>(
        ".rd-article :is(h2, h3)[id]",
      );
      heads?.forEach((h) => {
        if (h.getBoundingClientRect().top <= line) found = h.id;
      });
      setSection((prev) => (prev === found ? prev : found));

      const step = stepChrome(scrollRef.current, top, max);
      scrollRef.current = { last: step.last, run: step.run };
      if (
        Date.now() >= quietUntil.current &&
        panelRef.current === null &&
        step.want !== null
      ) {
        setHidden(!step.want);
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    // The reader's own scrolls (a jump to a section, an in-page link) are not gestures.
    const quiet = () => {
      quietUntil.current = Date.now() + QUIET_MS;
    };
    const onLink = (e: Event) => {
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (a && a.getAttribute("href")?.startsWith("#")) quiet();
    };
    if (window.location.hash) quiet();
    scrollRef.current = { last: window.scrollY, run: 0 };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("hashchange", quiet);
    // P30.S20: the annotation layer scrolls a low popover into view; not a gesture either.
    window.addEventListener("reader:quiet", quiet);
    document.addEventListener("click", onLink, true);
    document.fonts?.ready.then(onScroll).catch(() => {});
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("hashchange", quiet);
      window.removeEventListener("reader:quiet", quiet);
      document.removeEventListener("click", onLink, true);
    };
  }, [ready, settings.size]);

  // ---- settings ---------------------------------------------------------------------
  const apply = useCallback((next: ReaderSettings) => {
    setSettings(next);
    document.cookie = readerCookieString(
      next,
      window.location.protocol === "https:",
    );
  }, []);
  const onSize = (size: TextSize) => apply({ ...settings, size });
  const onTheme = (theme: ThemeChoice) => apply({ ...settings, theme });

  // ---- sheets -----------------------------------------------------------------------
  const openPanel = (name: Exclude<Panel, null>, from: HTMLElement | null) => {
    if (panel === name) {
      closePanel();
      return;
    }
    if (panel === null) opener.current = from;
    setPanel(name);
  };
  const closePanel = useCallback(() => {
    setPanel(null);
  }, []);

  // The opening's "Version history" button asks for the sheet by event (OQ64).
  useEffect(() => {
    if (!ready) return;
    const onOpenSheet = (e: Event) => {
      const detail = (e as CustomEvent<{ sheet?: string; opener?: unknown }>)
        .detail;
      if (detail?.sheet !== "versions" || !view.versions) return;
      const from = detail.opener instanceof HTMLElement ? detail.opener : null;
      if (panelRef.current === null) opener.current = from;
      setPanel("versions");
    };
    window.addEventListener(OPEN_SHEET_EVENT, onOpenSheet);
    return () => window.removeEventListener(OPEN_SHEET_EVENT, onOpenSheet);
  }, [ready, view.versions]);

  // The pill leaves when the chrome hides.
  useEffect(() => {
    if (hidden) dismissPill();
  }, [hidden, dismissPill]);

  useEffect(() => {
    if (panel === null) return;
    const sheet = sheetRef.current;
    sheet
      ?.querySelector<HTMLElement>(".rd-sheet__close")
      ?.focus({ preventScroll: true });
    if (panel === "contents") {
      // A long book: open the list with the current chapter in view, a third of the way down.
      const body = sheet?.querySelector<HTMLElement>(".rd-sheet__body");
      const row = body?.querySelector<HTMLElement>(
        '.rd-ch[aria-current="page"]',
      );
      if (body && row) {
        const top =
          row.getBoundingClientRect().top -
          body.getBoundingClientRect().top +
          body.scrollTop;
        if (top + row.offsetHeight > body.scrollTop + body.clientHeight) {
          body.scrollTop = Math.max(0, top - body.clientHeight / 3);
        }
      }
    }
    return () => {
      const o = opener.current;
      opener.current = null;
      if (o && o.isConnected) o.focus({ preventScroll: true });
    };
  }, [panel]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (panel === null) return;
    if (e.key === "Escape") {
      e.stopPropagation();
      closePanel();
      return;
    }
    if (e.key !== "Tab") return;
    // aria-modal: the product traps focus inside the sheet.
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

  // ---- taps on the text toggle the chrome -------------------------------------------
  const onTap = (e: MouseEvent<HTMLElement>) => {
    if (!ready || panel !== null) return;
    if ((e.target as Element).closest(TAP_IGNORE)) return;
    if (window.getSelection()?.toString()) return;
    setHidden((h) => !h);
  };

  // ---- places -----------------------------------------------------------------------
  const olderVersion = view.version < view.newest;
  const place = {
    lang: view.langs.length > 1 ? view.lang : null,
    version: olderVersion ? view.version : null,
    section,
  };
  const signIn = signInToSaveHref(view.target, place);
  // The language switch opens the other variant at the same section. A member's
  // pending position is written first, so the server's `resume` (the unit's latest
  // position mapped onto the other variant by id, nearest preceding id as the
  // fallback) is where the reader is NOW.
  const switchTo = async (lang: string) => {
    if (lang === view.lang) return;
    await rd.flush();
    router.push(readerHref(view.target, { lang, section }));
  };
  // A version opens at its top; the newest clears `?v=`.
  const openVersion = (n: number) => {
    closePanel();
    router.push(
      readerHref(view.target, {
        lang: view.langs.length > 1 ? view.lang : null,
        version: n === view.newest ? null : n,
      }),
    );
  };
  const fromTop = () => {
    quietUntil.current = Date.now() + QUIET_MS;
    window.scrollTo(0, 0);
    dismissPill();
  };

  const book = view.book;
  const backHref = loose || !book ? LIBRARY_HREF : book.backHref;
  const backLong = loose || !book ? READER.top.library : book.title;
  const backShort = loose || !book ? READER.top.library : READER.top.bookShort;
  const hasLangs = view.langs.length > 1;
  const rootClass = [
    "rd-root",
    `rd-size-${settings.size}`,
    loose ? "rd-loose" : "",
    hasLangs ? "rd-langs" : "",
    hidden && ready ? "rd-chrome-hidden" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const heads = view.headings;
  const secs = useMemo(() => heads.filter((h) => h.level === 2), [heads]);
  const curH2 = useMemo(() => {
    let h2: string | null = null;
    for (const h of heads) {
      if (h.level === 2) h2 = h.id;
      if (h.id === section) return h2;
    }
    return null;
  }, [heads, section]);

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
            onClick={() => switchTo(l.lang)}
          >
            {l.label}
          </button>
        ))}
      </div>
    ) : null;

  const prev = book?.prev;
  const next = book?.next;
  const isLast = !!book && !next;

  // The chapter list as it reads now: the current row follows the reader's own finish
  // and unread, and "X of M finished" moves with it (the end, the Contents sheet and
  // the lists agree).
  const baseFinished = view.progress?.state === "finished";
  const rows = useMemo<ChapterRow[]>(() => {
    if (!book) return [];
    if (!rd.saves) return book.chapters;
    const st = rd.reading;
    const opened =
      view.progress?.state !== "unopened" || view.version === view.newest;
    return book.chapters.map((row) => {
      if (!row.current) return row;
      if (st.finished) {
        return {
          ...row,
          state: "finished",
          percent: undefined,
          updated: rd.updated,
        };
      }
      if (!opened) return row;
      return {
        ...row,
        state: "started",
        percent: Math.round(st.maxFraction * 100),
        updated: false,
      };
    });
  }, [
    book,
    rd.saves,
    rd.reading,
    rd.updated,
    view.progress,
    view.version,
    view.newest,
  ]);
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
  const progressValue = useMemo<ReaderProgressValue>(
    () => ({
      member: view.member,
      saves: rd.saves,
      state: rd.state,
      signInHref: signIn,
      mark: (finished: boolean) => void rd.mark(finished),
      rows,
      finishedCount,
    }),
    [view.member, rd, signIn, rows, finishedCount],
  );

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
        {hidden && ready ? (
          <button
            type="button"
            className="rd-btn rd-btn--secondary rd-skip"
            onClick={() => setHidden(false)}
          >
            {READER.showControls}
          </button>
        ) : null}

        <div className="rd-line" aria-hidden="true">
          <span className="rd-line__fill" style={{ width: `${pct}%` }} />
        </div>

        <header className="rd-top" ref={topRef}>
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
            {ready && !view.member ? (
              <a className="rd-tbtn rd-tbtn--signin" href={signIn}>
                {READER.top.signIn}
              </a>
            ) : null}
          </div>
        </header>

        <main className="rd-page" id="main-content">
          <div className="rd-article" onClick={onTap}>
            <ReaderProgressContext.Provider value={progressValue}>
              {children}
            </ReaderProgressContext.Provider>
          </div>
        </main>

        {ready && rd.pill && !hidden && panel === null ? (
          <div className="rd-resume">
            <span className="rd-resume__text">
              {READER.resume.lead} ·{" "}
              <b lang={view.lang}>
                {rd.pill.section
                  ? hangulRuns(rd.pill.section, !isKorean(view.lang))
                  : `${rd.pill.percent}%`}
              </b>
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

        {hasBottom && book ? (
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
              <span className="rd-bnav__dir">{READER.bottom.contents}</span>
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
                  <span className="rd-bnav__dir">{READER.bottom.next}</span>
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
        ) : null}

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
                      sections={secs}
                      lang={view.lang}
                      currentSection={curH2}
                      onSection={() => {
                        quietUntil.current = Date.now() + QUIET_MS;
                        closePanel();
                      }}
                      onOpen={closePanel}
                    />
                  </>
                ) : null}
                {panel === "versions" && view.versions ? (
                  <VersionList
                    versions={view.versions}
                    version={view.version}
                    newest={view.newest}
                    noun={loose ? "document" : "chapter"}
                    onOpen={openVersion}
                  />
                ) : null}
                {panel === "display" ? (
                  <DisplayPanel
                    size={settings.size}
                    theme={settings.theme}
                    os={os}
                    onSize={onSize}
                    onTheme={onTheme}
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
