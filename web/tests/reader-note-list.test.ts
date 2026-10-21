import { describe, expect, it } from "vitest";

import { bookNotesHref, readerHref } from "@/lib/reader-href";
import {
  bookCountLine,
  bookCounts,
  buildGroups,
  groupBook,
  positionNear,
  rowView,
  type BookEntry,
  type BuildOptions,
} from "@/lib/reader/note-list";
import type {
  ReaderBookmark,
  ReaderNote,
  ReaderOtherNote,
} from "@/lib/reader/types";

// P30.S21 — the lists of marks (`05-annotations` round 01, the Notes sheet and the
// per-book list): what is listed where, in what order, and that no mark is ever dropped.
// The look is verified live, never here.

const sections = new Map([
  ["intro", { n: 0, label: "Intro" }],
  ["flow", { n: 1, label: "Diagram · The flow" }],
  ["end", { n: 2, label: "The end" }],
]);
const opts: BuildOptions = {
  sections,
  chapterTitle: "Chapter one",
  code: new Set(),
};

const note = (o: Partial<ReaderNote> & { id: string }): ReaderNote => ({
  kind: "hl",
  block: "intro",
  sec: "intro",
  start: 0,
  end: 4,
  status: "anchored",
  method: "exact",
  quote: { exact: "text", prefix: "", suffix: "" },
  note: "",
  review: false,
  card: "",
  lang: "en",
  version: 2,
  created: "2026-01-01T00:00:00Z",
  snapshot: null,
  ...o,
});
const bm = (o: Partial<ReaderBookmark> & { id: string }): ReaderBookmark => ({
  block: "intro",
  at: "intro",
  exact: true,
  fraction: null,
  label: "",
  snippet: "Intro",
  pos: false,
  approx: false,
  lang: "en",
  version: 2,
  created: "2026-01-01T00:00:00Z",
  ...o,
});
const other = (
  o: Partial<ReaderOtherNote> & { id: string },
): ReaderOtherNote => ({
  ...note(o),
  at: "intro",
  lang: "ko",
  ...o,
});

const none = {
  items: [],
  unanchored: [],
  bookmarks: [],
  other: [],
  otherBookmarks: [],
};

describe("the Notes sheet's groups", () => {
  it("lists in reading order: section, then bookmark, section note, Text changed, highlights by offset", () => {
    const g = buildGroups(
      {
        ...none,
        items: [
          note({ id: "h2", sec: "intro", start: 30 }),
          note({ id: "h1", sec: "intro", start: 10 }),
          note({ id: "chg", sec: "intro", status: "block" }),
          note({
            id: "bn",
            kind: "bnote",
            quote: null,
            sec: "intro",
            start: null,
          }),
          note({ id: "late", sec: "end", start: 1 }),
          note({ id: "mid", sec: "flow", start: 3 }),
        ],
        bookmarks: [bm({ id: "b1", at: "intro" })],
      },
      opts,
    );
    expect(g.items.map((i) => i.id)).toEqual([
      "b1",
      "bn",
      "chg",
      "h1",
      "h2",
      "mid",
      "late",
    ]);
    expect(g.count).toBe(7);
  });

  it("never drops a mark: orphans, retired bookmarks and other languages all stay listed", () => {
    const g = buildGroups(
      {
        items: [note({ id: "a" })],
        unanchored: [
          note({
            id: "o1",
            status: "orphan",
            sec: null,
            snapshot: {
              text: "gone text",
              block: "Old",
              chapter: "Chapter one",
            },
          }),
        ],
        // A native bookmark with nowhere to land is Unanchored, not lost.
        bookmarks: [bm({ id: "lost", at: null, exact: false })],
        other: [other({ id: "k1", at: "flow" }), other({ id: "k2", at: null })],
        otherBookmarks: [bm({ id: "kb", lang: "ko", at: "end" })],
      },
      opts,
    );
    expect(g.orphans.map((i) => i.id).sort()).toEqual(["lost", "o1"]);
    expect(g.other).toHaveLength(1);
    expect(g.other[0].lang).toBe("ko");
    expect(g.other[0].items.map((i) => i.id).sort()).toEqual([
      "k1",
      "k2",
      "kb",
    ]);
    expect(g.count).toBe(1 + 2 + 3);
  });

  it("leaves out only what waits out its undo line", () => {
    const g = buildGroups(
      { ...none, items: [note({ id: "a" }), note({ id: "b" })] },
      opts,
      new Set(["a"]),
    );
    expect(g.items.map((i) => i.id)).toEqual(["b"]);
  });

  it("places positions: a plain document's, and one placed from an HTML version", () => {
    const g = buildGroups(
      {
        ...none,
        bookmarks: [
          bm({ id: "p1", block: null, at: null, pos: true, fraction: 0.5 }),
          bm({ id: "p0", block: null, at: null, pos: true, fraction: 0.1 }),
          bm({
            id: "ap",
            block: null,
            at: null,
            pos: true,
            approx: true,
            fraction: 0.9,
          }),
        ],
      },
      opts,
    );
    expect(g.items.map((i) => [i.id, i.status])).toEqual([
      ["p0", "pos"],
      ["p1", "pos"],
      ["ap", "approx"],
    ]);
  });
});

describe("a row", () => {
  const name = (l: string) => (l === "ko" ? "한국어" : "English");
  it("says what the mark is and where it was made", () => {
    const g = buildGroups(
      {
        ...none,
        items: [
          note({ id: "n", note: "mine", card: "active" }),
          note({ id: "c", status: "block", version: 1 }),
        ],
        bookmarks: [bm({ id: "b", label: "keep" })],
        unanchored: [
          note({
            id: "u",
            status: "orphan",
            sec: null,
            quote: null,
            snapshot: {
              text: "was here",
              block: "Old",
              chapter: "Chapter one",
            },
          }),
        ],
      },
      opts,
    );
    const by = (id: string) =>
      rowView(
        [...g.items, ...g.orphans].find((i) => i.id === id)!,
        "panel",
        name,
      );
    expect(by("n").k).toBe("Highlight · note");
    expect(by("n").review).toBe(true);
    expect(by("c").k).toBe("Text changed");
    expect(by("c").meta).toBe(
      "Made on English v1 · this version no longer says it",
    );
    expect(by("b").titleBold).toBe(true);
    expect(by("b").delWord).toBe("Remove");
    const u = by("u");
    expect(u.k).toBe("Unanchored");
    expect(u.canGo).toBe(false);
    expect(u.gone).toBe("was here");
    expect(u.meta).toBe("Was in “Old” · Chapter one");
    // In the book's list the chapter is not repeated, and the language leads the meta.
    const book = rowView(g.orphans[0], "book", name);
    expect(book.meta).toBe("Was in “Old”");
    expect(book.hasLang).toBe(true);
  });
});

describe("bookmarks by position", () => {
  it("treats a bookmark within 2% as the same place", () => {
    const marks = [
      { id: "a", fraction: 0.4 },
      { id: "b", fraction: 0.43 },
      { id: "c", fraction: null },
    ];
    expect(positionNear(marks, 0.4)).toEqual(["a"]);
    expect(positionNear(marks, 0.415)).toEqual(["a", "b"]);
    expect(positionNear(marks, 0.9)).toEqual([]);
  });
});

describe("the per-book list", () => {
  const entry = (
    id: string,
    chapterKey: string,
    o: Partial<BookEntry> & {
      kind?: "hl" | "bm";
      status?: "anchored" | "orphan" | "approx";
    },
  ): BookEntry => ({
    item: {
      id,
      kind: o.kind ?? "hl",
      status: o.status ?? "anchored",
      lang: "en",
      version: 1,
      sec: null,
      secTitle: "",
      quote: "q",
      note: "",
      label: "",
      snippet: "",
      card: "",
      review: false,
      approx: o.status === "approx",
      pos: false,
      frac: 0,
      code: false,
      snapshot: null,
      chapterTitle: null,
      chapterKey,
      order: 0,
    },
    chapter: 0,
    variant: o.variant ?? 0,
    at: o.at ?? null,
    rank: o.rank ?? 0,
  });
  const chapters = [
    { key: "one", n: 1, title: "One", lang: "en" },
    { key: "two", n: 2, title: "Two", lang: "en" },
  ];
  it("groups by chapter in book order and each language in reading order", () => {
    const entries = [
      entry("z", "two", { at: 0 }),
      entry("b", "one", { at: 2, rank: 5 }),
      entry("a", "one", { at: 2, rank: 1 }),
      entry("ko", "one", { at: 0, variant: 1 }),
      entry("gone", "one", { status: "orphan", at: null, rank: 9e9 }),
    ];
    const shown = groupBook(entries, "all", chapters);
    expect(shown.map((c) => c.key)).toEqual(["one", "two"]);
    expect(shown[0].entries.map((e) => e.item.id)).toEqual([
      "a",
      "b",
      "gone",
      "ko",
    ]);
  });
  it("counts follow the filter, with approximate and unanchored named", () => {
    const entries = [
      entry("h", "one", {}),
      entry("b", "one", { kind: "bm", at: 1 }),
      entry("ap", "one", { kind: "bm", status: "approx" }),
      entry("o", "two", { status: "orphan" }),
    ];
    expect(bookCounts(entries)).toEqual({ all: 4, bm: 2, hl: 2 });
    expect(bookCountLine(entries, "all", 2)).toBe(
      "4 items in 2 chapters · 1 approximate · 1 unanchored",
    );
    expect(bookCountLine(entries, "bm", 1)).toBe(
      "2 bookmarks in 1 chapter · 1 approximate",
    );
    expect(bookCountLine(entries, "hl", 2)).toBe(
      "2 highlights and notes in 2 chapters · 1 unanchored",
    );
    expect(
      groupBook(entries, "bm", chapters)
        .flatMap((c) => c.entries)
        .map((e) => e.item.id),
    ).toEqual(["b", "ap"]);
  });
});

describe("the list's addresses", () => {
  const book = { org: "acme", project: "lab", book: "guide" };
  it("keeps a chapter named notes reachable, and says where the list was opened from", () => {
    expect(bookNotesHref(book)).toBe("/@acme/lab/notes/guide");
    expect(bookNotesHref(book, { from: "book" })).toBe(
      "/@acme/lab/notes/guide?from=book",
    );
    expect(
      bookNotesHref(book, {
        chapter: "internals",
        lang: "ko",
        version: 1,
        section: "plan",
      }),
    ).toBe("/@acme/lab/notes/guide?ch=internals&lang=ko&v=1&at=plan");
    expect(
      readerHref(
        { kind: "chapter", ...book, chapter: "notes" },
        { note: "abc" },
      ),
    ).toBe("/@acme/lab/books/guide/notes?note=abc");
  });
});
