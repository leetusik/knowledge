"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { READER } from "@/content";
import { cx } from "@/lib/cx";
import { hangulRuns } from "@/lib/reader/hangul";
import { saveQuizAttempt } from "@/lib/reader/actions";
import {
  fresh,
  gradeItem,
  hintFor,
  joinAccepted,
  landSend,
  reduce,
  responseOf,
  savedState,
  srLabel,
  statusLines,
  type ItemState,
  type QuizAction,
  type QuizSpec,
} from "@/lib/reader/quiz";
import type { QuizSavedItem } from "@/lib/reader/quiz-saved";

import { SignInToSave } from "./sign-in-to-save";

/**
 * P30.S19 — the quiz block (`04-quiz` round 01): the chapter's only client island.
 *
 * The server renders the whole chapter, the block included, and hands this component the
 * items as data (`spec`: ids, the key, the accepted forms: grading is client-side, S2)
 * and as already-rendered inline Markdown (`prompt`, `options`, `answer`, `explain`: React
 * elements built by the chapter renderer, so a link in a prompt is the reader's link).
 * The first paint is the state the view model gives: every item unanswered for a
 * signed-out reader; for a signed-in one each item's latest saved attempt, graded, with
 * its provenance line (`saved`). Hydration attaches the handlers and changes nothing
 * visible.
 *
 * Everything a graded item can show is already in the DOM and only toggled (every status
 * sentence stacked in one grid cell, a button holding both labels), so grading moves
 * nothing. The rules (grading, transitions, words) are `lib/reader/quiz.ts`.
 */

export interface QuizItemProps {
  spec: QuizSpec;
  /** `<block>--<item>`: the list item's id, the anchor a sign-in returns to. */
  domId: string;
  /** The prompt (choice, recall) or the sentence with its blanks (cloze). */
  prompt: ReactNode;
  /** Choice: each option's text, in `spec.options` order. */
  options?: ReactNode[];
  /** Recall: the answer. */
  answer?: ReactNode;
  explain?: ReactNode;
  /** Where Sign in to save returns to (this chapter, scrolled to this item). */
  signInHref: string | null;
  saved?: QuizSavedItem;
}

export interface QuizBlockProps {
  id: string;
  /** The block's name for assistive technology ("Quiz: {title}" or "Quiz"). */
  name: string;
  title?: ReactNode;
  items: QuizItemProps[];
  member: boolean;
  /** Where an attempt is saved; null = a member with nowhere to save (nothing is sent). */
  write: { org: string; project: string; doc: string } | null;
  /** The version on screen (the attempt's `version`). */
  version: number;
  place: "chapter" | "document";
  /** The chapter's language, carried on typed values ("You wrote …", the accepted forms). */
  lang: string;
}

interface ItemCtx {
  values: string[];
  graded: boolean;
  oks: boolean[];
  total: number;
  domId: string;
  onType: (n: number, v: string) => void;
  onCheck: () => void;
}

const ItemContext = createContext<ItemCtx | null>(null);

/** A blank inside a cloze sentence: the server places these in the text; the item feeds them. */
export function ClozeBlank({
  n,
  tail,
}: {
  n: number;
  /** The characters that touch the blank's end, kept in the same no-wrap group. */
  tail?: ReactNode;
}) {
  const c = useContext(ItemContext);
  if (!c) return null;
  const ok = c.oks[n - 1];
  const cls = `qz-blank${c.graded ? (ok ? " is-ok" : " is-bad") : ""}`;
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    // Enter is Check; an Enter that commits an IME composition (Korean) is not.
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      c.onCheck();
    }
  };
  return (
    <span className="qz-bw">
      {c.total > 1 ? (
        <span className="qz-bn" aria-hidden="true">
          {n}
        </span>
      ) : null}
      <input
        type="text"
        className={cls}
        id={`${c.domId}-b${n}`}
        value={c.values[n - 1] ?? ""}
        readOnly={c.graded}
        aria-label={`Blank ${n} of ${c.total}`}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
        data-qz-first={n === 1 ? "1" : undefined}
        onChange={(e) => c.onType(n, e.target.value)}
        onKeyDown={onKey}
      />
      {tail}
    </span>
  );
}

/** The chrome's strings are English; a Hangul run in one (a language's own name) is `lang="ko"`. */
const chrome = (s: string): ReactNode => hangulRuns(s, true);

function newId(): string {
  const c = typeof crypto !== "undefined" ? crypto : undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  // Not a secure context (plain http on a LAN name): build a v4 from random bytes.
  const b = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") c.getRandomValues(b);
  else for (let i = 0; i < 16; i += 1) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0"));
  return `${h.slice(0, 4).join("")}-${h.slice(4, 6).join("")}-${h.slice(6, 8).join("")}-${h.slice(8, 10).join("")}-${h.slice(10).join("")}`;
}

function initialState(item: QuizItemProps): ItemState {
  const s = item.saved;
  if (!s) return fresh();
  if (s.state === "fresh") return fresh(s.note);
  return savedState(s.response, s.correct, s.prov);
}

export function QuizBlock(props: QuizBlockProps) {
  const { id, items, member, write, version, place, lang } = props;
  const saves = member && write !== null;
  const total = items.length;

  const [states, setStates] = useState<Record<string, ItemState>>(() =>
    Object.fromEntries(items.map((it) => [it.spec.id, initialState(it)])),
  );
  const ref = useRef(states);
  const commit = (next: Record<string, ItemState>) => {
    ref.current = next;
    setStates(next);
  };
  // Sign in to save opens once per view, under the first item a signed-out reader grades.
  const [sign, setSign] = useState<{ at: string | null; closed: boolean }>({
    at: null,
    closed: false,
  });

  // After a click, focus goes where the next step is; moving focus never scrolls.
  const rootRef = useRef<HTMLElement>(null);
  const want = useRef<{ dom: string; sel: string } | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const w = want.current;
    if (!w) return;
    want.current = null;
    const el = rootRef.current?.querySelector<HTMLElement>(
      `[id="${w.dom}"] ${w.sel}`,
    );
    el?.focus({ preventScroll: true });
  }, [tick]);

  const act = (item: QuizItemProps, a: QuizAction | { t: "signclose" }) => {
    const spec = item.spec;
    if (a.t === "signclose") {
      setSign((s) => ({ ...s, closed: true }));
      want.current = { dom: item.domId, sel: "[data-qz-main]" };
      setTick((t) => t + 1);
      return;
    }
    const cur = ref.current[spec.id] ?? fresh();
    const r = reduce(spec, cur, a);
    const st = r.st;
    if (a.t === "retry")
      want.current = { dom: item.domId, sel: "[data-qz-first]" };
    if (a.t === "reveal")
      want.current = { dom: item.domId, sel: "[data-qz-answer]" };
    if (a.t === "self")
      want.current = { dom: item.domId, sel: "[data-qz-retry]" };
    let send: (() => void) | null = null;
    if (r.graded) {
      if (saves && write) {
        const sendId = newId();
        st.save = "saving";
        st.sendId = sendId;
        const response = responseOf(spec, st);
        const body = {
          ...write,
          id: sendId,
          version,
          block_id: id,
          item_id: spec.id,
          item_type: spec.type,
          response:
            "blanks" in response
              ? { blanks: response.blanks.map((b) => b.slice(0, 1000)) }
              : response,
          correct: !!st.correct,
          answered_at: new Date().toISOString(),
        };
        send = () => {
          saveQuizAttempt(body)
            .catch(() => ({ ok: false }) as { ok: boolean; attempt?: number })
            .then((reply) => {
              // A reply lands only on the attempt that started it.
              const landed = landSend(ref.current[spec.id], sendId, reply);
              if (landed) commit({ ...ref.current, [spec.id]: landed });
            });
        };
      } else if (!member && sign.at === null && !sign.closed) {
        setSign({ at: spec.id, closed: false });
      }
    }
    commit({ ...ref.current, [spec.id]: st });
    if (want.current) setTick((t) => t + 1);
    send?.();
  };

  const answered = items.filter(
    (it) => states[it.spec.id]?.ph === "graded",
  ).length;
  const label = `Quiz · ${total} ${total === 1 ? "question" : "questions"}`;

  return (
    <section
      ref={rootRef}
      className="qz"
      id={id}
      data-block={id}
      aria-label={props.name}
    >
      <div className="qz__head">
        <p className="qz__label">{label}</p>
        {total > 1 ? (
          <p
            className={cx("qz__count", answered === 0 && "is-off")}
            aria-hidden={answered > 0 ? undefined : "true"}
          >
            {answered} of {total} answered
          </p>
        ) : null}
      </div>
      {props.title ? (
        <p className="qz__title" id={`${id}--title`}>
          {props.title}
        </p>
      ) : null}
      <ol className="qz__items">
        {items.map((item) => {
          const st = states[item.spec.id] ?? fresh();
          return (
            <li className="qz__li" id={item.domId} key={item.spec.id}>
              <QuizItemView
                item={item}
                st={st}
                total={total}
                saves={saves}
                lang={lang}
                act={(a) => act(item, a)}
              />
              {!member &&
              sign.at === item.spec.id &&
              !sign.closed &&
              item.signInHref ? (
                <div className="qz-save">
                  <SignInToSave
                    what={READER.save.whats.quiz}
                    place={place}
                    signInHref={item.signInHref}
                    onDismiss={() => act(item, { t: "signclose" })}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** The status cell: every sentence stacked in one grid cell, the others hidden. */
function Status({ lines }: { lines: ReturnType<typeof statusLines>["lines"] }) {
  return (
    <div className="qz-stack">
      {lines.map((s) => (
        <p
          key={s.k}
          className={cx("qz-st", !s.on && "is-off")}
          aria-hidden={s.on ? undefined : "true"}
        >
          <span
            className={`qz-st__word${s.tone ? ` qz-st__word--${s.tone}` : ""}`}
          >
            {s.word}
          </span>
          {s.sub ? <span className="qz-st__sub">{chrome(s.sub)}</span> : null}
        </p>
      ))}
    </div>
  );
}

function QuizItemView({
  item,
  st,
  total,
  saves,
  lang,
  act,
}: {
  item: QuizItemProps;
  st: ItemState;
  total: number;
  saves: boolean;
  lang: string;
  act: (a: QuizAction) => void;
}) {
  const { spec, domId } = item;
  const graded = st.ph === "graded";
  const g = gradeItem(spec, st);
  const { lines, live } = statusLines(spec, st, saves);
  const promptId = `${domId}-q`;
  const nCls = `qz-n${graded ? (st.correct ? " qz-n--ok" : " qz-n--bad") : ""}`;
  const multi = spec.type === "choice" && spec.multi;

  const head = (
    <span className={nCls} aria-hidden="true">
      {spec.n}
    </span>
  );
  const sr = <span className="qz-vh">{srLabel(spec, st, total)}</span>;
  const hint = <p className="qz-hint">{hintFor(spec)}</p>;
  const note = st.note ? <p className="qz-note">{chrome(st.note)}</p> : null;
  const liveRegion = (
    <p className="qz-vh" aria-live="polite">
      {live}
    </p>
  );

  // --- choice -------------------------------------------------------------------------
  if (spec.type === "choice") {
    const options = spec.options.map((o, j) => {
      const mine = st.sel.includes(o.id);
      const right = spec.answer.includes(o.id);
      let cls = `qz-opt${spec.multi ? " qz-opt--multi" : ""}`;
      let keyCls = `qz-key${spec.multi ? " qz-key--sq" : ""}`;
      let tag = "";
      let tagCls = "qz-tag";
      if (!graded) {
        if (spec.multi && mine) {
          cls += " is-sel";
          keyCls += " is-sel";
        }
      } else {
        cls += " is-done";
        if (mine && right) {
          cls += " is-ok-mine";
          keyCls += " is-ok-mine";
          tag = "Your answer · correct";
          tagCls += " qz-tag--ok";
        } else if (mine) {
          cls += " is-bad-mine";
          keyCls += " is-bad-mine";
          tag = "Your answer · incorrect";
          tagCls += " qz-tag--bad";
        } else if (right) {
          cls += " is-ok-other";
          keyCls += " is-ok-other";
          tag = "Correct answer";
          tagCls += " qz-tag--ok";
        }
      }
      const oid = `${domId}-${o.id}`;
      const onPick = () => {
        if (graded) return;
        act(spec.multi ? { t: "toggle", opt: o.id } : { t: "pick", opt: o.id });
      };
      return (
        <li className={cls} key={o.id}>
          <button
            type="button"
            className="qz-opt__hit"
            role={spec.multi ? "checkbox" : undefined}
            aria-checked={spec.multi ? (mine ? "true" : "false") : undefined}
            aria-disabled={graded ? "true" : undefined}
            aria-labelledby={`${oid}-k ${oid}-t${tag ? ` ${oid}-g` : ""}`}
            data-qz-first={j === 0 ? "1" : undefined}
            onClick={onPick}
          />
          <span className={keyCls} id={`${oid}-k`}>
            {o.key}
          </span>
          <span className="qz-opt__text" id={`${oid}-t`}>
            {item.options?.[j]}
          </span>
          {tag ? (
            <span className={tagCls} id={`${oid}-g`}>
              {tag}
            </span>
          ) : null}
        </li>
      );
    });
    const hasFoot = spec.multi ? true : graded;
    const hasResult = graded && !!item.explain;
    return (
      <div className="qz-item">
        {head}
        <div className="qz-body">
          {sr}
          <p className="qz-q" id={promptId}>
            {item.prompt}
          </p>
          {hint}
          {note}
          <div role="group" aria-labelledby={promptId}>
            <ul
              className="qz-opts"
              aria-label={`Answers to question ${spec.n}`}
            >
              {options}
            </ul>
          </div>
          {hasFoot ? (
            <div className="qz-foot">
              <Status lines={lines} />
              <div className="qz-acts">
                {multi ? (
                  <button
                    type="button"
                    className={`rd-btn qz-act ${graded ? "rd-btn--quiet" : "rd-btn--secondary"}`}
                    data-qz-main="1"
                    onClick={() =>
                      act(graded ? { t: "retry" } : { t: "check" })
                    }
                  >
                    <span className="qz-swap">
                      <span
                        className={graded ? "is-off" : undefined}
                        aria-hidden={graded ? "true" : undefined}
                      >
                        Check
                      </span>
                      <span
                        className={graded ? undefined : "is-off"}
                        aria-hidden={graded ? undefined : "true"}
                      >
                        Try again
                      </span>
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="rd-btn rd-btn--quiet qz-act"
                    data-qz-main="1"
                    onClick={() => act({ t: "retry" })}
                  >
                    Try again
                  </button>
                )}
              </div>
            </div>
          ) : null}
          {hasResult ? (
            <div className="qz-result">
              <p className="qz-why">{item.explain}</p>
            </div>
          ) : null}
          {liveRegion}
        </div>
      </div>
    );
  }

  // --- recall -------------------------------------------------------------------------
  if (spec.type === "recall") {
    const open = st.ph === "open";
    const shown = !open;
    const hasFoot = st.ph !== "open";
    const answerId = `${domId}-a`;
    return (
      <div className="qz-item">
        {head}
        <div className="qz-body">
          {sr}
          <p className="qz-q" id={promptId}>
            {item.prompt}
          </p>
          {hint}
          {note}
          <div
            className={cx("qz-card", open && "qz-card--hidden")}
            id={answerId}
            tabIndex={-1}
            data-qz-answer="1"
            role="group"
            aria-label={`Answer to question ${spec.n}`}
          >
            <p className="qz-card__label">Answer</p>
            {open ? (
              <button
                type="button"
                className="rd-btn rd-btn--secondary"
                data-qz-first="1"
                aria-expanded="false"
                aria-controls={answerId}
                onClick={() => act({ t: "reveal" })}
              >
                Show answer
              </button>
            ) : null}
            {shown ? (
              <>
                <p className="qz-card__answer">{item.answer}</p>
                {item.explain ? (
                  <p className="qz-card__why">{item.explain}</p>
                ) : null}
              </>
            ) : null}
          </div>
          {hasFoot ? (
            <div className="qz-foot">
              <Status lines={lines} />
              <div className="qz-acts">
                <div
                  className={cx("qz-acts__layer", st.ph !== "revealed" && "is-off")}
                  aria-hidden={st.ph === "revealed" ? undefined : "true"}
                >
                  <button
                    type="button"
                    className="rd-btn rd-btn--secondary"
                    tabIndex={st.ph === "revealed" ? undefined : -1}
                    onClick={() => act({ t: "self", v: "got" })}
                  >
                    I got it
                  </button>
                  <button
                    type="button"
                    className="rd-btn rd-btn--secondary"
                    tabIndex={st.ph === "revealed" ? undefined : -1}
                    onClick={() => act({ t: "self", v: "missed" })}
                  >
                    I missed it
                  </button>
                </div>
                <div
                  className={cx("qz-acts__layer", !graded && "is-off")}
                  aria-hidden={graded ? undefined : "true"}
                >
                  <button
                    type="button"
                    className="rd-btn rd-btn--quiet qz-act"
                    data-qz-retry="1"
                    data-qz-main="1"
                    tabIndex={graded ? undefined : -1}
                    onClick={() => act({ t: "retry" })}
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          {liveRegion}
        </div>
      </div>
    );
  }

  // --- cloze --------------------------------------------------------------------------
  const blanks = spec.accepted.length;
  const ctx: ItemCtx = {
    values: st.blanks,
    graded,
    oks: g.oks,
    total: blanks,
    domId,
    onType: (n, v) => act({ t: "type", n, v }),
    // Enter in a blank is Check; once graded the fields are read-only and Enter does nothing.
    onCheck: () => {
      if (!graded) act({ t: "check" });
    },
  };
  const wrong = graded && !st.correct;
  const acc = wrong
    ? spec.accepted
        .map((forms, i) => {
          if (g.oks[i]) return null;
          const val = String(st.blanks[i] ?? "").trim();
          return { n: i + 1, val, forms };
        })
        .filter((x): x is { n: number; val: string; forms: string[] } => !!x)
    : [];
  const hasResult = graded && (acc.length > 0 || !!item.explain);
  return (
    <ItemContext.Provider value={ctx}>
      <div className="qz-item">
        {head}
        <div className="qz-body">
          {sr}
          <p className="qz-q qz-cloze" id={promptId}>
            {item.prompt}
          </p>
          {hint}
          {note}
          <div className="qz-foot">
            <Status lines={lines} />
            <div className="qz-acts">
              <button
                type="button"
                className={`rd-btn qz-act ${graded ? "rd-btn--quiet" : "rd-btn--secondary"}`}
                data-qz-main="1"
                onClick={() => act(graded ? { t: "retry" } : { t: "check" })}
              >
                <span className="qz-swap">
                  <span
                    className={graded ? "is-off" : undefined}
                    aria-hidden={graded ? "true" : undefined}
                  >
                    Check
                  </span>
                  <span
                    className={graded ? undefined : "is-off"}
                    aria-hidden={graded ? undefined : "true"}
                  >
                    Try again
                  </span>
                </span>
              </button>
            </div>
          </div>
          {hasResult ? (
            <div className="qz-result">
              {acc.length > 0 ? (
                <ul
                  className="qz-acc"
                  aria-label={
                    blanks > 1 ? "Accepted answers" : "Accepted answer"
                  }
                >
                  {acc.map((a) => (
                    <li key={a.n}>
                      {blanks > 1 ? (
                        <>
                          <span className="qz-acc__n">{a.n}</span>{" "}
                        </>
                      ) : null}
                      {a.val ? (
                        <>
                          You wrote “
                          <span className="qz-acc__wrote" lang={lang}>
                            {a.val}
                          </span>
                          ”.{" "}
                        </>
                      ) : (
                        <>Left empty. </>
                      )}
                      Accepted:{" "}
                      {joinAccepted(a.forms).map((x, j) => (
                        <span key={j}>
                          <b lang={lang}>{x.v}</b>
                          {x.sep}
                        </span>
                      ))}
                      .
                    </li>
                  ))}
                </ul>
              ) : null}
              {item.explain ? <p className="qz-why">{item.explain}</p> : null}
            </div>
          ) : null}
          {liveRegion}
        </div>
      </div>
    </ItemContext.Provider>
  );
}
