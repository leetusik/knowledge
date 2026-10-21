import { describe, expect, it } from "vitest";

import {
  isStale,
  orderChapters,
  planContinue,
  rowState,
  shapeOf,
  type ContRow,
  type RowState,
} from "../src/lib/book/model";
import type { KbBookChapter } from "../src/lib/knowledge/types";

// P30.S23 — the book page's rules (`07-book-page` §3): the Continue reading table, the
// order and shape of a book, and the stale translation. The look is verified live.

const rows = (...states: RowState[]): ContRow[] =>
  states.map((state, i) => ({ n: i + 1, state, summary: "" }));
const at = (index: number, pct = 38) => ({ index, section: "", pct });

describe("planContinue", () => {
  it("starts at chapter 1 signed out, and when nothing was opened", () => {
    expect(planContinue(rows("unopened", "unopened"), false, at(1)).kind).toBe(
      "start",
    );
    const none = planContinue(rows("unopened", "unopened"), true, null);
    expect(none).toMatchObject({ kind: "start", index: 0 });
  });

  it("continues a started chapter where the pointer is", () => {
    const p = planContinue(
      rows("finished", "started", "unopened"),
      true,
      at(1, 38),
    );
    expect(p).toMatchObject({ kind: "continue", index: 1, pct: 38 });
  });

  it("offers the next unfinished chapter after a finished pointer, else the first", () => {
    const next = planContinue(
      rows("finished", "finished", "unopened", "started"),
      true,
      at(1),
    );
    expect(next).toMatchObject({ kind: "next", index: 2, after: 2 });
    const wrap = planContinue(
      rows("unopened", "finished", "finished"),
      true,
      at(2),
    );
    expect(wrap).toMatchObject({ kind: "next", index: 0, after: 3 });
  });

  it("is Finished when every chapter is, pointing at the first Updated one", () => {
    const upd = planContinue(
      rows("finished", "updated", "finished", "updated"),
      true,
      at(3),
    );
    expect(upd).toMatchObject({ kind: "finished", index: 1, updated: [2, 4] });
    const plain = planContinue(rows("finished", "finished"), true, at(1));
    expect(plain).toMatchObject({ kind: "finished", index: 0, updated: [] });
  });
});

describe("a book's order, state and shape", () => {
  const ch = (
    key: string,
    position: number,
    over: Partial<KbBookChapter> = {},
  ): KbBookChapter => ({
    key,
    position,
    title: null,
    source: null,
    variants: [
      {
        lang: "en",
        doc_id: 1,
        rel_path: "p/x.md",
        title: key,
        slug: key,
        version: 1,
        format: "native",
        updated_at: "",
        translated_from: null,
      },
    ],
    ...over,
  });

  it("orders by position, then key, and drops a chapter with no live variant", () => {
    const out = orderChapters([
      ch("b", 2),
      ch("a", 2),
      ch("z", 1),
      ch("gone", 0, { variants: [] }),
    ]);
    expect(out.map((c) => c.key)).toEqual(["z", "a", "b"]);
  });

  it("counts an old-version finish as Updated", () => {
    expect(rowState({ state: "finished", updated: true })).toBe("updated");
    expect(rowState({ state: "finished", updated: false })).toBe("finished");
    expect(rowState(undefined)).toBe("unopened");
  });

  it("tells a phases book, a per-slice book and a plain guide", () => {
    expect(shapeOf([ch("a", 1), ch("b", 2)])).toEqual({ kind: "plain" });
    expect(
      shapeOf([
        ch("p8", 8, { source: { phase: "P8" } }),
        ch("p9", 9, { source: { phase: "P9" } }),
      ]),
    ).toEqual({ kind: "phases" });
    expect(
      shapeOf([
        ch("s1", 1, { source: { phase: "P24", slice: "P24.S1" } }),
        ch("f1", 2, { source: { phase: "P24", slice: "P24.F1" } }),
      ]),
    ).toEqual({ kind: "slices", phase: "P24" });
  });

  it("flags a translation of an older source version", () => {
    const c = ch("a", 1);
    const en = c.variants[0];
    const ko = {
      ...en,
      lang: "ko",
      translated_from: { lang: "en", version: 1 },
    };
    const book = { ...c, variants: [{ ...en, version: 2 }, ko] };
    expect(isStale(book, ko)).toBe(true);
    expect(isStale(book, book.variants[0])).toBe(false);
  });
});
