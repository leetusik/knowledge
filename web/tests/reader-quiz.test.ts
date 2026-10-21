import { describe, expect, it } from "vitest";

import {
  driftNote,
  fresh,
  gradeItem,
  landSend,
  norm,
  provenance,
  reduce,
  responseOf,
  savedLine,
  shapeOf,
  statusLines,
  type QuizSpec,
} from "@/lib/reader/quiz";

// P30.S19 — the quiz's core rules (`04-quiz` round 01, *Grading*, *Saving* and *On
// return*): what is right, what counts as the first attempt, and when a saved answer
// may be shown. The look is verified live, never here.

const single: QuizSpec = {
  id: "q1",
  type: "choice",
  n: 1,
  options: [
    { id: "a", key: "A" },
    { id: "b", key: "B" },
  ],
  answer: ["b"],
  multi: false,
};
const multi: QuizSpec = {
  ...single,
  options: [...single.options, { id: "c", key: "C" }],
  answer: ["a", "c"],
  multi: true,
};
const cloze: QuizSpec = {
  id: "q3",
  type: "cloze",
  n: 3,
  accepted: [["write lock", "WRITE_LOCK"], ["SQLite"]],
};
const recall: QuizSpec = { id: "q2", type: "recall", n: 2 };

function run(spec: QuizSpec, ...actions: Parameters<typeof reduce>[2][]) {
  let st = fresh();
  for (const a of actions) st = reduce(spec, st, a).st;
  return st;
}

describe("choice", () => {
  it("a single answer grades on tap", () => {
    const right = reduce(single, fresh(), { t: "pick", opt: "b" });
    expect(right.graded).toBe(true);
    expect(right.st.correct).toBe(true);
    const wrong = reduce(single, fresh(), { t: "pick", opt: "a" });
    expect(wrong.st.correct).toBe(false);
    // a graded item takes no further pick
    expect(reduce(single, right.st, { t: "pick", opt: "a" }).graded).toBe(
      false,
    );
  });

  it("a multi answer is right only for the exact set; partly right says so", () => {
    expect(
      run(
        multi,
        { t: "toggle", opt: "c" },
        { t: "toggle", opt: "a" },
        { t: "check" },
      ).correct,
    ).toBe(true);
    const part = run(multi, { t: "toggle", opt: "a" }, { t: "check" });
    expect(part.correct).toBe(false);
    expect(gradeItem(multi, part).partly).toBe(true);
    const over = run(
      multi,
      { t: "toggle", opt: "a" },
      { t: "toggle", opt: "b" },
      { t: "toggle", opt: "c" },
      { t: "check" },
    );
    expect(over.correct).toBe(false);
    expect(statusLines(multi, over, false).lines.find((l) => l.on)?.word).toBe(
      "Incorrect · partly right",
    );
  });

  it("an empty Check is not graded and not saved", () => {
    const r = reduce(multi, fresh(), { t: "check" });
    expect(r.graded).toBe(false);
    expect(r.st.ph).toBe("open");
    expect(r.st.empty).toBe(true);
    expect(reduce(multi, r.st, { t: "toggle", opt: "a" }).st.empty).toBe(false);
  });
});

describe("cloze matching", () => {
  it("folds case, trims the ends and accepts an alternative; inner spaces count", () => {
    const ok = (a: string, b: string) =>
      run(
        cloze,
        { t: "type", n: 1, v: a },
        { t: "type", n: 2, v: b },
        { t: "check" },
      ).correct;
    expect(ok("  Write Lock ", "sqlite")).toBe(true);
    expect(ok("write_lock", "SQLITE")).toBe(true);
    expect(ok("write  lock", "sqlite")).toBe(false);
  });

  it("an NFD answer from a Korean IME matches the NFC form", () => {
    const ko: QuizSpec = {
      id: "k",
      type: "cloze",
      n: 1,
      accepted: [["쓰기 잠금"]],
    };
    const nfd = "쓰기 잠금".normalize("NFD");
    expect(nfd).not.toBe("쓰기 잠금");
    expect(run(ko, { t: "type", n: 1, v: nfd }, { t: "check" }).correct).toBe(
      true,
    );
    expect(norm(nfd)).toBe(norm("쓰기 잠금"));
  });

  it("counts the right blanks; an empty blank is wrong; all-empty is an empty Check", () => {
    const part = run(
      cloze,
      { t: "type", n: 1, v: "write lock" },
      { t: "check" },
    );
    const g = gradeItem(cloze, part);
    expect(g.correct).toBe(false);
    expect(g.rightCount).toBe(1);
    expect(statusLines(cloze, part, false).lines.find((l) => l.on)?.word).toBe(
      "Incorrect · 1 of 2 blanks right",
    );
    expect(run(cloze, { t: "type", n: 1, v: "   " }, { t: "check" }).ph).toBe(
      "open",
    );
  });

  it("sends the raw blanks as typed", () => {
    const st = run(
      cloze,
      { t: "type", n: 1, v: " Write Lock " },
      { t: "check" },
    );
    expect(responseOf(cloze, st)).toEqual({ blanks: [" Write Lock ", ""] });
  });
});

describe("recall", () => {
  it("is right when the reader says they got it", () => {
    const got = run(recall, { t: "reveal" }, { t: "self", v: "got" });
    expect(got.correct).toBe(true);
    expect(responseOf(recall, got)).toEqual({ self_grade: "got" });
    expect(
      run(recall, { t: "reveal" }, { t: "self", v: "missed" }).correct,
    ).toBe(false);
    // no grading before the answer is shown
    expect(reduce(recall, fresh(), { t: "self", v: "got" }).graded).toBe(false);
  });

  it("Try again returns to hidden and keeps a drift note", () => {
    const noted = reduce(recall, fresh("a note"), { t: "reveal" }).st;
    const back = reduce(recall, noted, { t: "retry" }).st;
    expect(back.ph).toBe("open");
    expect(back.note).toBe("a note");
  });
});

describe("the first attempt is the server's number", () => {
  it("words the save line from the reply's attempt, never a count the page keeps", () => {
    expect(savedLine(1)).toBe("Saved for review");
    expect(savedLine(2)).toBe("Saved · review keeps your first answer");
    expect(savedLine(7)).toBe("Saved · review keeps your first answer");
  });

  it("a reply lands only on the attempt that started it", () => {
    const sent = {
      ...reduce(single, fresh(), { t: "pick", opt: "b" }).st,
      save: "saving" as const,
      sendId: "s1",
    };
    expect(landSend(sent, "s0", { ok: true, attempt: 1 })).toBeNull();
    expect(landSend(fresh(), "s1", { ok: true, attempt: 1 })).toBeNull();
    expect(landSend(sent, "s1", { ok: true, attempt: 1 })).toMatchObject({
      save: "saved",
      later: false,
    });
    expect(landSend(sent, "s1", { ok: true, attempt: 3 })).toMatchObject({
      save: "saved",
      later: true,
    });
    expect(landSend(sent, "s1", { ok: false })).toMatchObject({
      save: "failed",
    });
  });
});

describe("what a saved answer may show (item drift)", () => {
  it("keeps the shape through a wording change and drops it on a real change", () => {
    expect(shapeOf(single, true)).toBe(shapeOf({ ...single }, true));
    expect(shapeOf(single, true)).not.toBe(
      shapeOf({ ...single, answer: ["a"] }, true),
    );
    expect(shapeOf(single, true)).not.toBe(
      shapeOf(
        { ...single, options: [...single.options, { id: "c", key: "C" }] },
        true,
      ),
    );
    expect(shapeOf(cloze, true)).not.toBe(
      shapeOf({ ...cloze, accepted: [["write lock"], ["SQLite"]] }, true),
    );
    // across languages only the blank count matters (typed answers never cross anyway)
    expect(shapeOf(cloze, false)).toBe(
      shapeOf({ ...cloze, accepted: [["x"], ["y"]] }, false),
    );
    expect(shapeOf(recall, true)).not.toBe(shapeOf(single, true));
    expect(shapeOf(null, true)).toBe("none");
  });

  it("words the provenance and the notes", () => {
    const at = "2026-10-12T08:00:00Z";
    expect(
      provenance({
        answeredAt: at,
        sameLang: true,
        version: 3,
        viewVersion: 3,
        langName: "English",
      }),
    ).toBe("Your answer from 12 Oct 2026");
    expect(
      provenance({
        answeredAt: at,
        sameLang: true,
        version: 2,
        viewVersion: 3,
        langName: "English",
      }),
    ).toBe("Your answer from 12 Oct 2026, on v2");
    expect(
      provenance({
        answeredAt: at,
        sameLang: false,
        version: 2,
        viewVersion: 3,
        langName: "한국어",
      }),
    ).toBe("Your answer from 12 Oct 2026, in 한국어 v2");
    expect(
      driftNote({
        answeredAt: at,
        sameLang: true,
        version: 2,
        langName: "English",
        otherLanguageCloze: false,
      }),
    ).toBe(
      "You answered a different version of this question (v2, 12 Oct 2026), so it starts fresh here.",
    );
  });
});
