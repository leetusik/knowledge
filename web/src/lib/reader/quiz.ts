/**
 * P30.S19 — the quiz block's rules (`04-quiz` round 01, *Grading*, *States per item, and
 * the transitions*, *Saving*, *On return*), as pure functions: no React, no network.
 * The client island (`components/reader/quiz.tsx`) calls them to grade, move an item
 * between states and word the foot; the server (`quiz-saved.ts`) calls them to decide
 * what a saved answer shows on return. Not `server-only`: both sides import it.
 */
import type { Inline } from "@/lib/native/tree";

// --- what the island is given about an item (the key ships in the page: S2) -----------

export type QuizSpec =
  | {
      id: string;
      type: "choice";
      n: number;
      /** The option ids in order, with the letter A-F each shows. */
      options: { id: string; key: string }[];
      answer: string[];
      multi: boolean;
    }
  | { id: string; type: "recall"; n: number }
  | {
      id: string;
      type: "cloze";
      n: number;
      /** The accepted forms of each blank, in order. */
      accepted: string[][];
    };

/** An item's state (`phase: open | revealed | graded`, the round's *States per item*). */
export interface ItemState {
  ph: "open" | "revealed" | "graded";
  sel: string[];
  blanks: string[];
  self: "got" | "missed" | null;
  /** The last Check had nothing to check. */
  empty: boolean;
  correct: boolean | null;
  save: null | "saving" | "saved" | "failed";
  /** The server numbered the saved attempt above 1: review keeps the first. */
  later: boolean;
  origin: "live" | "saved";
  note: string;
  prov: string;
  /** The send this state started (a reply lands only on the attempt that started it). */
  sendId: string | null;
}

export type QuizAction =
  | { t: "pick"; opt: string }
  | { t: "toggle"; opt: string }
  | { t: "type"; n: number; v: string }
  | { t: "check" }
  | { t: "reveal" }
  | { t: "self"; v: "got" | "missed" }
  | { t: "retry" };

export type QuizResponse =
  | { selected: string[] }
  | { blanks: string[] }
  | { self_grade: "got" | "missed" };

export function fresh(note = ""): ItemState {
  return {
    ph: "open",
    sel: [],
    blanks: [],
    self: null,
    empty: false,
    correct: null,
    save: null,
    later: false,
    origin: "live",
    note,
    prov: "",
    sendId: null,
  };
}

/** The state a saved attempt shows: graded, as if just answered (*On return*, 3). */
export function savedState(
  response: Partial<{
    selected: string[];
    blanks: string[];
    self_grade: "got" | "missed";
  }>,
  correct: boolean,
  prov: string,
): ItemState {
  const st = fresh();
  st.ph = "graded";
  st.origin = "saved";
  st.correct = correct;
  st.prov = prov;
  if (response.selected) st.sel = [...response.selected];
  if (response.blanks) st.blanks = [...response.blanks];
  if (response.self_grade) st.self = response.self_grade;
  return st;
}

// --- grading --------------------------------------------------------------------------

/**
 * A typed answer is compared after Unicode NFC, a trim of both ends, a case-fold (upper
 * then lower) and NFC again. Inner spaces count; an NFD answer from a Korean IME matches.
 */
export function norm(s: string | null | undefined): string {
  return String(s ?? "")
    .normalize("NFC")
    .trim()
    .toUpperCase()
    .toLowerCase()
    .normalize("NFC");
}

export function sameSet(a: readonly string[], b: readonly string[]): boolean {
  const x = [...a].sort();
  const y = [...b].sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

export interface Grade {
  correct: boolean;
  /** Choice (multi only): not correct, at least one right option chosen. */
  partly: boolean;
  /** Cloze: each blank right or not. */
  oks: boolean[];
  rightCount: number;
}

export function gradeItem(spec: QuizSpec, st: ItemState): Grade {
  if (spec.type === "choice") {
    const right = st.sel.filter((x) => spec.answer.includes(x));
    const correct = sameSet(st.sel, spec.answer);
    return {
      correct,
      partly: !correct && spec.multi && right.length > 0,
      oks: [],
      rightCount: right.length,
    };
  }
  if (spec.type === "cloze") {
    const oks = spec.accepted.map((acc, i) => {
      const v = norm(st.blanks[i]);
      return v !== "" && acc.some((a) => norm(a) === v);
    });
    const rightCount = oks.filter(Boolean).length;
    return {
      correct: rightCount === spec.accepted.length,
      partly: rightCount > 0 && rightCount < spec.accepted.length,
      oks,
      rightCount,
    };
  }
  return { correct: st.self === "got", partly: false, oks: [], rightCount: 0 };
}

/** An empty Check: nothing chosen, or every blank empty after trimming. */
export function isEmpty(spec: QuizSpec, st: ItemState): boolean {
  if (spec.type === "choice") return st.sel.length === 0;
  if (spec.type === "cloze") return !st.blanks.some((v) => norm(v) !== "");
  return false;
}

/** What is sent as the attempt's `response` (the raw answer, as typed). */
export function responseOf(spec: QuizSpec, st: ItemState): QuizResponse {
  if (spec.type === "choice") return { selected: [...st.sel] };
  if (spec.type === "cloze")
    return { blanks: spec.accepted.map((_, i) => st.blanks[i] ?? "") };
  return { self_grade: st.self === "got" ? "got" : "missed" };
}

/** One action on one item's state; `graded` says a new attempt began (it saves). */
export function reduce(
  spec: QuizSpec,
  prev: ItemState,
  a: QuizAction,
): { st: ItemState; graded: boolean } {
  const st: ItemState = {
    ...prev,
    sel: [...prev.sel],
    blanks: [...prev.blanks],
  };
  let graded = false;
  if (
    a.t === "pick" &&
    spec.type === "choice" &&
    !spec.multi &&
    st.ph === "open"
  ) {
    st.sel = [a.opt];
    st.ph = "graded";
    graded = true;
  } else if (
    a.t === "toggle" &&
    spec.type === "choice" &&
    spec.multi &&
    st.ph === "open"
  ) {
    const i = st.sel.indexOf(a.opt);
    if (i >= 0) st.sel.splice(i, 1);
    else st.sel.push(a.opt);
    st.empty = false;
  } else if (a.t === "type" && spec.type === "cloze" && st.ph === "open") {
    st.blanks[a.n - 1] = a.v;
    st.empty = false;
  } else if (
    a.t === "check" &&
    st.ph === "open" &&
    (spec.type === "cloze" || (spec.type === "choice" && spec.multi))
  ) {
    if (isEmpty(spec, st)) {
      st.empty = true;
    } else {
      st.empty = false;
      st.ph = "graded";
      graded = true;
    }
  } else if (a.t === "reveal" && spec.type === "recall" && st.ph === "open") {
    st.ph = "revealed";
  } else if (a.t === "self" && spec.type === "recall" && st.ph === "revealed") {
    st.self = a.v;
    st.ph = "graded";
    graded = true;
  } else if (a.t === "retry") {
    return { st: fresh(prev.note), graded: false };
  }
  if (graded) st.correct = gradeItem(spec, st).correct;
  st.origin = "live";
  st.prov = "";
  if (graded) {
    st.save = null;
    st.later = false;
    st.sendId = null;
  }
  return { st, graded };
}

// --- saving ---------------------------------------------------------------------------

export const SAVE_LONG = "Saved · review keeps your first answer";

/**
 * The sub-line after a send lands. Review keeps the item's FIRST attempt, and which one
 * this was is the server's number in its reply (1, or more), never a count the page
 * keeps: "Saved for review" on the first, the long line on any later one.
 */
export function savedLine(attempt: number): string {
  return attempt > 1 ? SAVE_LONG : "Saved for review";
}

/**
 * Whether a send's reply may land: only on the attempt that started it (the reader
 * retried or moved on otherwise). The reply's `attempt` then decides "later".
 */
export function landSend(
  st: ItemState | undefined,
  sendId: string,
  reply: { ok: boolean; attempt?: number },
): ItemState | null {
  if (!st || st.sendId !== sendId || st.save !== "saving") return null;
  if (!reply.ok) return { ...st, save: "failed" };
  return { ...st, save: "saved", later: (reply.attempt ?? 1) > 1 };
}

// --- the foot's words -----------------------------------------------------------------

export interface StatusLine {
  k: string;
  word: string;
  tone: "" | "ok" | "bad";
  sub: string;
  on: boolean;
}

/** The sub-line under the verdict: the provenance, else the save line, else nothing. */
export function subLine(st: ItemState, saves: boolean): string {
  if (st.origin === "saved") return st.prov;
  if (!saves) return "";
  if (st.save === "saving") return "Saving…";
  if (st.save === "failed") return "Not saved · check your connection";
  if (st.save === "saved") return st.later ? SAVE_LONG : savedLine(1);
  return "";
}

export function verdictWord(
  spec: QuizSpec,
  st: ItemState,
  g: Grade,
): { k: "ok" | "bad" | "got" | "missed"; word: string } {
  if (spec.type === "recall")
    return st.self === "got"
      ? { k: "got", word: "Got it" }
      : { k: "missed", word: "Missed it" };
  if (st.correct) return { k: "ok", word: "Correct" };
  let word = "Incorrect";
  if (spec.type === "choice" && g.partly) word = "Incorrect · partly right";
  if (spec.type === "cloze" && spec.accepted.length > 1)
    word = `Incorrect · ${g.rightCount} of ${spec.accepted.length} blanks right`;
  return { k: "bad", word };
}

/**
 * Every sentence the foot's status can show, in one list (the cell stacks them, the
 * others hidden, so it is always as tall as the longest and nothing moves on grading).
 */
export function statusLines(
  spec: QuizSpec,
  st: ItemState,
  saves: boolean,
): { lines: StatusLine[]; live: string } {
  const g = gradeItem(spec, st);
  const graded = st.ph === "graded";
  const sub = subLine(st, saves);
  let reserve = saves ? (st.origin === "saved" ? st.prov : SAVE_LONG) : "";
  if (sub.length > reserve.length) reserve = sub;
  const blanks = spec.type === "cloze" ? spec.accepted.length : 0;
  const emptySub =
    spec.type === "cloze"
      ? "Fill in at least one blank first."
      : "Choose at least one answer first.";

  const cand: {
    k: string;
    word: string;
    tone: "" | "ok" | "bad";
    sub?: string;
  }[] =
    spec.type === "recall"
      ? [
          { k: "ask", word: "Did you get it?", tone: "" },
          { k: "got", word: "Got it", tone: "ok" },
          { k: "missed", word: "Missed it", tone: "bad" },
        ]
      : spec.type === "choice" && !spec.multi
        ? [
            { k: "ok", word: "Correct", tone: "ok" },
            { k: "bad", word: "Incorrect", tone: "bad" },
          ]
        : [
            { k: "none", word: "", tone: "" },
            {
              k: "empty",
              word: "Nothing to check yet",
              tone: "",
              sub: emptySub,
            },
            { k: "ok", word: "Correct", tone: "ok" },
            {
              k: "bad",
              word:
                spec.type === "cloze" && blanks > 1
                  ? `Incorrect · ${Math.max(0, blanks - 1)} of ${blanks} blanks right`
                  : spec.type === "choice" && spec.multi
                    ? "Incorrect · partly right"
                    : "Incorrect",
              tone: "bad",
            },
          ];

  let curK = "none";
  let cur: { k: string; word: string } | null = null;
  if (graded) {
    cur = verdictWord(spec, st, g);
    curK = cur.k;
  } else if (st.ph === "revealed") curK = "ask";
  else if (st.empty) curK = "empty";

  const lines: StatusLine[] = cand.map((c) => {
    const on = c.k === curK;
    const word = on && cur ? cur.word : c.word;
    const s =
      c.k === "empty"
        ? (c.sub ?? "")
        : c.k === "none" || c.k === "ask"
          ? ""
          : on
            ? sub
            : reserve;
    return { k: c.k, word, tone: c.tone, sub: s, on };
  });

  const liveWord = graded
    ? (cur?.word ?? "")
    : curK === "empty"
      ? "Nothing to check yet"
      : curK === "ask"
        ? "Answer shown. Did you get it?"
        : "";
  const liveSub = graded ? sub : curK === "empty" ? emptySub : "";
  return {
    lines,
    live: liveWord ? liveWord + (liveSub ? `. ${liveSub}` : "") : "",
  };
}

export const HINTS = {
  recall: "Answer it in your head, then show the answer.",
  clozeOne:
    "Fill in the blank. Capitals and spaces around the answer don't count.",
  clozeMany:
    "Fill in the blanks. Capitals and spaces around each answer don't count.",
  multi: "Select all that apply.",
  single: "Choose one answer.",
} as const;

export function hintFor(spec: QuizSpec): string {
  if (spec.type === "recall") return HINTS.recall;
  if (spec.type === "cloze")
    return spec.accepted.length > 1 ? HINTS.clozeMany : HINTS.clozeOne;
  return spec.multi ? HINTS.multi : HINTS.single;
}

export function srLabel(spec: QuizSpec, st: ItemState, total: number): string {
  const base = `Question ${spec.n} of ${total}`;
  if (st.ph !== "graded") return base;
  if (spec.type === "recall")
    return `${base}${st.self === "got" ? ", got it" : ", missed it"}`;
  return `${base}${st.correct ? ", correct" : ", incorrect"}`;
}

/** "A or B" / "A, B or C" (the accepted forms, joined as the round writes them). */
export function joinAccepted(
  list: readonly string[],
): { v: string; sep: string }[] {
  return list.map((v, j) => ({
    v,
    sep: j < list.length - 1 ? (j === list.length - 2 ? " or " : ", ") : "",
  }));
}

// --- dates, languages, provenance, drift (On return) ---------------------------------

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** `d Mon yyyy` in English, on the UTC day (chrome copy is English-only). */
export function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function provenance(args: {
  answeredAt: string;
  sameLang: boolean;
  version: number;
  viewVersion: number;
  langName: string;
}): string {
  const day = dayLabel(args.answeredAt);
  if (args.sameLang)
    return args.version !== args.viewVersion
      ? `Your answer from ${day}, on v${args.version}`
      : `Your answer from ${day}`;
  return `Your answer from ${day}, in ${args.langName} v${args.version}`;
}

export function driftNote(args: {
  answeredAt: string;
  sameLang: boolean;
  version: number;
  langName: string;
  /** The answer was typed in another language (a cloze). */
  otherLanguageCloze: boolean;
}): string {
  const day = dayLabel(args.answeredAt);
  if (args.otherLanguageCloze)
    return `You answered this in ${args.langName} on ${day}. Typed answers stay in their language, so it starts fresh here.`;
  const where = args.sameLang
    ? `v${args.version}`
    : `${args.langName} v${args.version}`;
  return `You answered a different version of this question (${where}, ${day}), so it starts fresh here.`;
}

// --- the shape a saved answer depends on (Item drift) ---------------------------------

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Every cloze blank's accepted forms, in document order (blanks may sit in em/strong/del). */
export function blanksOf(
  nodes: readonly Inline[] | null | undefined,
): string[][] {
  const out: string[][] = [];
  const walk = (list: readonly Inline[]) => {
    for (const n of list) {
      if (n.type === "blank") out.push(n.accept.map((a) => a.trim()));
      else if (
        n.type === "em" ||
        n.type === "strong" ||
        n.type === "del" ||
        n.type === "link"
      )
        walk(n.children);
    }
  };
  if (nodes) walk(nodes);
  return out;
}

/** The option ids of a tree item, the right answer ids, the blanks: the parts of a spec. */
export function specOf(item: Rec, n: number): QuizSpec | null {
  const id = typeof item.id === "string" ? item.id : null;
  if (!id) return null;
  if (item.type === "choice") {
    const options = (Array.isArray(item.options) ? item.options : [])
      .filter(isRec)
      .map((o, j) => ({ id: String(o.id ?? ""), key: "ABCDEF".charAt(j) }));
    const answer = (Array.isArray(item.answer) ? item.answer : []).filter(
      (x): x is string => typeof x === "string",
    );
    return { id, type: "choice", n, options, answer, multi: answer.length > 1 };
  }
  if (item.type === "recall") return { id, type: "recall", n };
  if (item.type === "cloze") {
    return {
      id,
      type: "cloze",
      n,
      accepted: blanksOf(
        Array.isArray(item.text) ? (item.text as Inline[]) : null,
      ),
    };
  }
  return null;
}

/**
 * The shape a saved answer depends on: the type, the option ids and the right answer
 * (choice); the number of blanks (cloze) and, in one language, what each accepts; the
 * type alone (recall). A wording change keeps the shape.
 */
export function shapeOf(spec: QuizSpec | null, withText: boolean): string {
  if (!spec) return "none";
  if (spec.type === "choice")
    return `choice|${spec.options
      .map((o) => o.id)
      .sort()
      .join(",")}|${[...spec.answer].sort().join(",")}`;
  if (spec.type === "cloze")
    return `cloze|${spec.accepted.length}${
      withText
        ? `|${spec.accepted.map((a) => a.map(norm).sort().join("/")).join(",")}`
        : ""
    }`;
  return "recall";
}
