import { describe, expect, it } from "vitest";

import { dueText } from "@/content";
import { sectionTitle } from "@/lib/library/continue";
import {
  buildShelves,
  chooseGroup,
  toCards,
  toRows,
  visibleDocs,
  type BookCard,
  type DocRow,
} from "@/lib/library/model";
import type { KbReaderLibrary } from "@/lib/knowledge/reader";
import type { KbOrgLibrary } from "@/lib/knowledge/types";

// P30.S22 — the library's rules (`06-library` §3–§7): what is on which shelf and in what order,
// the fold, how progress and "Updated" reach a card, the grouping the URL or device chose, and
// the heading a saved place is under. The look is verified live, never here.

const book = (over: Partial<BookCard>): BookCard => ({
  key: "p/b",
  project: "p",
  slug: "b",
  title: "B",
  subject: null,
  total: 1,
  done: 0,
  updated: false,
  allLegacy: false,
  langs: [],
  href: "/x",
  ...over,
});
const doc = (over: Partial<DocRow>): DocRow => ({
  key: "p/d",
  project: "p",
  title: "D",
  lang: "en",
  subject: null,
  date: "1 Jan 2026",
  sort: "2026-01-01",
  state: "none",
  pct: 0,
  updated: false,
  legacy: false,
  href: "/d",
  ...over,
});

describe("shelves", () => {
  const books = [
    book({ key: "z/b", project: "zeta", title: "Beta", subject: "Law" }),
    book({ key: "z/a", project: "zeta", title: "alpha" }),
    book({ key: "a/c", project: "alpha", title: "Gamma", subject: "Law" }),
  ];
  const docs = [
    doc({ key: "a/old", project: "alpha", sort: "2026-01-01", subject: "Law" }),
    doc({ key: "a/new", project: "alpha", sort: "2026-03-01" }),
  ];
  const projects = [
    { name: "alpha", isPublic: true },
    { name: "zeta", isPublic: false },
    { name: "empty", isPublic: false },
  ];

  it("by project: A to Z, books by title, documents newest first, empty projects counted", () => {
    const out = buildShelves(
      books,
      docs,
      projects,
      "project",
      "Without a subject",
    );
    expect(out.shelves.map((s) => s.name)).toEqual(["alpha", "zeta"]);
    expect(out.shelves[0].isPublic).toBe(true);
    expect(out.shelves[1].books.map((b) => b.title)).toEqual(["alpha", "Beta"]);
    expect(out.shelves[0].docs.map((d) => d.key)).toEqual(["a/new", "a/old"]);
    expect(out.emptyProjects).toBe(1);
  });

  it("by subject: subjects A to Z, then Without a subject; nothing is dropped", () => {
    const out = buildShelves(
      books,
      docs,
      projects,
      "subject",
      "Without a subject",
    );
    expect(out.shelves.map((s) => s.name)).toEqual([
      "Law",
      "Without a subject",
    ]);
    const all = out.shelves.flatMap((s) => [...s.books, ...s.docs]);
    expect(all).toHaveLength(books.length + docs.length);
    expect(out.noSubjects).toBe(false);
  });

  it("by subject with no subject anywhere is one shelf and the note", () => {
    const out = buildShelves(
      [book({})],
      [],
      projects,
      "subject",
      "Without a subject",
    );
    expect(out.shelves.map((s) => s.name)).toEqual(["Without a subject"]);
    expect(out.noSubjects).toBe(true);
  });

  it("folds a shelf of more than 6 documents to the newest 5", () => {
    const six = Array.from({ length: 6 }, (_, i) => doc({ key: `d${i}` }));
    expect(visibleDocs(six, false)).toHaveLength(6);
    const seven = [...six, doc({ key: "d6" })];
    expect(visibleDocs(seven, false)).toHaveLength(5);
    expect(visibleDocs(seven, true)).toHaveLength(7);
  });
});

describe("cards and rows from the listing and the reader's state", () => {
  const listing: KbOrgLibrary = {
    org: { id: "t1", slug: "acme", name: "Acme", label: "acme" },
    member: true,
    projects: [{ name: "p", visibility: "public" }],
    books: [
      {
        project: "p",
        slug: "b",
        title: "Book",
        kind: "codebase",
        subject: null,
        chapters: [
          {
            key: "c1",
            position: 1,
            title: null,
            variants: [
              {
                lang: "en",
                doc: "d1",
                doc_id: 1,
                title: "One",
                version: 1,
                format: "html",
              },
              {
                lang: "ko",
                doc: "d1k",
                doc_id: 2,
                title: "하나",
                version: 1,
                format: "native",
              },
            ],
          },
          {
            key: "c2",
            position: 2,
            title: null,
            variants: [
              {
                lang: "en",
                doc: "d2",
                doc_id: 3,
                title: "Two",
                version: 1,
                format: "html",
              },
            ],
          },
        ],
      },
    ],
    documents: [
      {
        id: 9,
        project: "p",
        slug: "note",
        doc: "2026-02-01-note",
        title: "Note",
        date: "2026-02-01",
        format: "html",
        lang: "en",
        version: 1,
        subject: null,
        canonical_path: "/@acme/p/note",
      },
    ],
  };
  const state = {
    books: [
      {
        org: "acme",
        project: "p",
        book: "b",
        title: "Book",
        progress: { finished: 1, started: 0, total: 2 },
        updated: 1,
      },
    ],
    docs: [
      {
        doc: { org: "acme", project: "p", doc: "2026-02-01-note" },
        position: { state: "started", max_fraction: 0.384, updated: false },
      },
    ],
  } as unknown as KbReaderLibrary;

  it("a card carries the finished count, Updated, languages and the legacy flag", () => {
    const [card] = toCards(listing, state);
    expect(card).toMatchObject({
      total: 2,
      done: 1,
      updated: true,
      allLegacy: true,
    });
    expect(card.langs.map((l) => l.lang)).toEqual(["en", "ko"]);
    expect(card.href).toBe("/@acme/p/books/b");
    expect(toCards(listing, null)[0]).toMatchObject({
      done: 0,
      updated: false,
    });
  });

  it("a row carries its state and rounded percent; no state is none", () => {
    const [row] = toRows(listing, state);
    expect(row).toMatchObject({
      state: "started",
      pct: 38,
      legacy: true,
      href: "/@acme/p/note",
      date: "1 Feb 2026",
    });
    expect(toRows(listing, null)[0].state).toBe("none");
  });
});

describe("small rules", () => {
  it("the URL wins over the device, which wins over by project", () => {
    expect(chooseGroup("subject", "project")).toBe("subject");
    expect(chooseGroup("project", "subject")).toBe("project");
    expect(chooseGroup(undefined, "subject")).toBe("subject");
    expect(chooseGroup("nonsense", undefined)).toBe("project");
  });

  it("the Review count reads 99+ above 99 and nothing at 0", () => {
    expect([dueText(0), dueText(12), dueText(99), dueText(100)]).toEqual([
      "",
      "12",
      "99",
      "99+",
    ]);
  });

  it("a saved place resolves to the heading it sits under", () => {
    const src =
      "---\nformat: native\nsyntax: 1\n---\n## First {#first}\n\nText {#t1}\n\n## Second {#second}\n\nMore.\n";
    expect(sectionTitle(src, "second")).toBe("Second");
    expect(sectionTitle(src, "nope")).toBe("");
  });
});
