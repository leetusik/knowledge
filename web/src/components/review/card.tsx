"use client";

import Link from "next/link";
import { useId, type KeyboardEvent, type ReactNode } from "react";

import { REVIEW } from "@/content/review";
import {
  gradeItem,
  hintFor,
  joinAccepted,
  srLabel,
  type ItemState,
  type QuizAction,
  type QuizSpec,
} from "@/lib/reader/quiz";
import { hangulRuns, isKorean } from "@/lib/reader/hangul";
import { languageName } from "@/lib/reader/language";
import { footFor, type Foot, type InFlight } from "@/lib/review/foot";
import { cardLang, placeText, sourceText, tagFor } from "@/lib/review/model";
import type { Rating, QueueMeta, ReviewCard } from "@/lib/review/types";
import type { Inline } from "@/lib/native/tree";

import { cx } from "@/lib/cx";

import { InlineText } from "./inline";

/**
 * P30.S24 — the card (`08-review` §2-§5, `Card`, board 14): a page of its own between two
 * strong hairlines, never a box. A quiz card is the signed quiz item, re-asked (the numeral,
 * the prompt, the hint, the options or blanks, Show answer, the grading marks), with review's
 * foot; a highlight card is the section, the quote in the signed paint and the reader's note.
 * Below sit the way back into the chapter and Suspend.
 *
 * Nothing moves when a card changes state: every status sentence is stacked in one cell, the
 * main button holds all four labels, the pair and the retry share a cell, the where-link is
 * always laid out. The quiz's CSS is scoped to `.kb-ch`, so the card's body carries that class
 * (and reads as the chapter's own prose kit does).
 */
export interface CardProps {
  card: ReviewCard;
  spec: QuizSpec | null;
  meta: Pick<QueueMeta, "day" | "now">;
  st: ItemState | null;
  pending: InFlight | null;
  failed: InFlight | null;
  onAct: (a: QuizAction) => void;
  onRate: (rating: Rating) => void;
  onRetry: () => void;
  onSuspend: () => void;
}

const chrome = (s: string): ReactNode => hangulRuns(s, true);

export function ReviewCardView(props: CardProps) {
  const { card, spec, meta, st, pending, failed } = props;
  const uid = useId();
  const headId = `${uid}-kind`;
  const busy = pending !== null;
  const lang = cardLang(card);
  const wrap = !isKorean(lang);
  const hrefBase = card.where.href.split("#")[0];
  const tag = tagFor(card, meta);
  const foot = footFor({ card, spec, st, pending, failed });
  const back = card.source === "highlight" || (st !== null && st.ph !== "open");

  return (
    <article
      className="rv-card"
      tabIndex={-1}
      aria-labelledby={headId}
      aria-busy={busy ? "true" : undefined}
      data-rv-card={card.card_id}
    >
      <div className="rv-card__head">
        <p className="rv-card__kind" id={headId}>
          {card.source === "highlight"
            ? REVIEW.card.highlight
            : REVIEW.card.question}
        </p>
        {tag ? <span className="rd-tag rd-tag--plain">{tag}</span> : null}
      </div>
      <p className="rv-card__src">
        {chrome(sourceText(card))}
        {lang !== "en" ? (
          <>
            {" · "}
            <span lang={lang}>{languageName(lang)}</span>
          </>
        ) : null}
      </p>
      <div className="kb-ch rv-body">
        {card.source === "highlight" ? (
          <HighlightBody card={card} foot={foot} props={props} lang={lang} />
        ) : spec && st ? (
          <QuizBody
            card={card}
            spec={spec}
            st={st}
            foot={foot}
            props={props}
            lang={lang}
            wrap={wrap}
            hrefBase={hrefBase}
          />
        ) : null}
      </div>
      <Where
        card={card}
        lang={lang}
        back={back}
        busy={busy}
        onSuspend={props.onSuspend}
      />
    </article>
  );
}

// --- the foot ---------------------------------------------------------------------------

function FootView({
  foot,
  props,
  st,
  spec,
}: {
  foot: Foot;
  props: CardProps;
  st: ItemState | null;
  spec: QuizSpec | null;
}) {
  if (!foot.show) return null;
  const F = REVIEW.foot;
  const main = foot.main;
  const onMain = () => {
    if (!main) return;
    if (main.phase === "retry") return props.onRetry();
    if (!st || !spec) return;
    if (st.ph !== "graded") return props.onAct({ t: "check" });
    // Next rates the grade: right → Good, wrong → Again.
    props.onRate(gradeItem(spec, st).correct ? "good" : "again");
  };
  return (
    <div
      className={cx("qz-foot rv-foot", foot.kind === "pair" && "rv-foot--pair")}
    >
      <div className="qz-stack">
        {foot.cells.map((c) => (
          <p
            key={c.key}
            className={cx("qz-st", !c.on && "is-off")}
            aria-hidden={c.on ? undefined : "true"}
          >
            <span
              className={cx("qz-st__word", c.tone && `qz-st__word--${c.tone}`)}
            >
              {c.word}
            </span>
            {c.sub ? <span className="qz-st__sub">{chrome(c.sub)}</span> : null}
          </p>
        ))}
      </div>
      <div className="qz-acts">
        {main ? (
          <div
            className={cx("qz-acts__layer", main.hidden && "is-off")}
            aria-hidden={main.hidden ? "true" : undefined}
          >
            <button
              type="button"
              className={`rd-btn qz-act rv-main ${main.primary ? "rd-btn--primary" : "rd-btn--secondary"}`}
              data-rv-main="1"
              data-rv-role={main.phase === "retry" ? "retry" : "main"}
              aria-busy={main.busy ? "true" : undefined}
              disabled={main.disabled}
              tabIndex={main.hidden ? -1 : undefined}
              onClick={onMain}
            >
              <span className="qz-swap">
                <span className={main.phase === "check" ? undefined : "is-off"}>
                  {F.check}
                </span>
                <span className={main.phase === "next" ? undefined : "is-off"}>
                  {F.next}
                </span>
                <span
                  className={main.phase === "saving" ? undefined : "is-off"}
                >
                  {F.saving}
                </span>
                <span className={main.phase === "retry" ? undefined : "is-off"}>
                  {F.tryAgain}
                </span>
              </span>
            </button>
          </div>
        ) : null}
        {foot.pair ? (
          <>
            <div
              className={cx("qz-acts__layer rv-pair", foot.failed && "is-off")}
              aria-hidden={foot.failed ? "true" : undefined}
            >
              {foot.pair.map((b) => (
                <button
                  key={b.rating}
                  type="button"
                  className="rd-btn rd-btn--secondary rv-rate"
                  data-rv-rate={b.rating}
                  aria-busy={b.saving ? "true" : undefined}
                  disabled={props.pending !== null}
                  tabIndex={foot.failed ? -1 : undefined}
                  onClick={() => props.onRate(b.rating)}
                >
                  <span className="qz-swap">
                    <span className={b.saving ? "is-off" : undefined}>
                      {b.word}
                    </span>
                    <span className={b.saving ? undefined : "is-off"}>
                      {F.saving}
                    </span>
                  </span>
                  <span className="rv-rate__ivl">{b.sub}</span>
                </button>
              ))}
            </div>
            <div
              className={cx("qz-acts__layer", !foot.failed && "is-off")}
              aria-hidden={foot.failed ? undefined : "true"}
            >
              <button
                type="button"
                className="rd-btn rd-btn--primary qz-act"
                data-rv-main="1"
                data-rv-role="retry"
                tabIndex={foot.failed ? undefined : -1}
                onClick={props.onRetry}
              >
                {F.tryAgain}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Live({ text }: { text: string }) {
  return (
    <p className="rv-vh" aria-live="polite">
      <span className="rv-vh__t">{text}</span>
    </p>
  );
}

// --- a highlight card ---------------------------------------------------------------------

function HighlightBody({
  card,
  foot,
  props,
  lang,
}: {
  card: Extract<ReviewCard, { source: "highlight" }>;
  foot: Foot;
  props: CardProps;
  lang: string;
}) {
  const { front } = card;
  const wrap = !isKorean(lang);
  const note = front.note;
  return (
    <div className="rv-hl">
      {front.block_title ? (
        <p className="rv-hl__sec" lang={lang}>
          {hangulRuns(front.block_title, wrap)}
        </p>
      ) : null}
      <p className="rv-hl__quote" lang={lang}>
        <mark className={cx("an-m", note && "an-m--note")}>
          {hangulRuns(front.quote ?? "", wrap)}
        </mark>
      </p>
      {note ? (
        <div className="rv-hl__note">
          <p className="rv-hl__notek">{REVIEW.card.yourNote}</p>
          <p className="rv-hl__notet" lang={lang}>
            {hangulRuns(note, wrap)}
          </p>
        </div>
      ) : null}
      <FootView foot={foot} props={props} st={null} spec={null} />
      <Live text={foot.live} />
    </div>
  );
}

// --- a quiz card ----------------------------------------------------------------------------

function QuizBody({
  card,
  spec,
  st,
  foot,
  props,
  lang,
  wrap,
  hrefBase,
}: {
  card: Exclude<ReviewCard, { source: "highlight" }>;
  spec: QuizSpec;
  st: ItemState;
  foot: Foot;
  props: CardProps;
  lang: string;
  wrap: boolean;
  hrefBase: string;
}) {
  const uid = useId();
  const graded = st.ph === "graded";
  const g = gradeItem(spec, st);
  const total = card.where.item_count ?? 1;
  const promptId = `${uid}-q`;
  const text = (nodes: readonly Inline[] | null | undefined): ReactNode => (
    <InlineText nodes={nodes} wrap={wrap} hrefBase={hrefBase} />
  );
  const nCls = cx("qz-n", graded && (st.correct ? "qz-n--ok" : "qz-n--bad"));
  const head = (
    <span className={nCls} aria-hidden="true">
      {spec.n}
    </span>
  );
  const sr = <span className="qz-vh">{srLabel(spec, st, total)}</span>;
  const hint = <p className="qz-hint">{hintFor(spec)}</p>;
  const note = st.note ? <p className="qz-note">{chrome(st.note)}</p> : null;
  const live = <Live text={foot.live} />;
  const footView = <FootView foot={foot} props={props} st={st} spec={spec} />;

  // --- choice ------------------------------------------------------------------------
  if (card.item_type === "choice" && spec.type === "choice") {
    const explain = card.back.explain;
    const options = card.front.options.map((o, j) => {
      const so = spec.options[j];
      const mine = st.sel.includes(o.id);
      const right = spec.answer.includes(o.id);
      // The option's look: its own marks, each a class that is on or not.
      const sel = !graded && spec.multi && mine;
      const okMine = graded && mine && right;
      const badMine = graded && mine && !right;
      const okOther = graded && !mine && right;
      const cls = cx(
        "qz-opt",
        spec.multi && "qz-opt--multi",
        sel && "is-sel",
        graded && "is-done",
        okMine && "is-ok-mine",
        badMine && "is-bad-mine",
        okOther && "is-ok-other",
      );
      const keyCls = cx(
        "qz-key",
        spec.multi && "qz-key--sq",
        sel && "is-sel",
        okMine && "is-ok-mine",
        badMine && "is-bad-mine",
        okOther && "is-ok-other",
      );
      const tag = okMine
        ? "Your answer · correct"
        : badMine
          ? "Your answer · incorrect"
          : okOther
            ? "Correct answer"
            : "";
      const tagCls = cx(
        "qz-tag",
        (okMine || okOther) && "qz-tag--ok",
        badMine && "qz-tag--bad",
      );
      const oid = `${uid}-${o.id}`;
      const busy = props.pending !== null;
      const onPick = () => {
        if (graded || busy) return;
        props.onAct(
          spec.multi ? { t: "toggle", opt: o.id } : { t: "pick", opt: o.id },
        );
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
            {so?.key}
          </span>
          <span className="qz-opt__text" id={`${oid}-t`}>
            {text(o.text)}
          </span>
          {tag ? (
            <span className={tagCls} id={`${oid}-g`}>
              {tag}
            </span>
          ) : null}
        </li>
      );
    });
    return (
      <div className="qz-item rv-q" lang={lang}>
        {head}
        <div className="qz-body">
          {sr}
          <p className="qz-q" id={promptId}>
            {text(card.front.prompt)}
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
          {footView}
          {graded && explain && explain.length > 0 ? (
            <div className="qz-result">
              <p className="qz-why">{text(explain)}</p>
            </div>
          ) : null}
          {live}
        </div>
      </div>
    );
  }

  // --- recall ----------------------------------------------------------------------------
  if (card.item_type === "recall") {
    const open = st.ph === "open";
    const answerId = `${uid}-a`;
    const explain = card.back.explain;
    return (
      <div className="qz-item rv-q" lang={lang}>
        {head}
        <div className="qz-body">
          {sr}
          <p className="qz-q" id={promptId}>
            {text(card.front.prompt)}
          </p>
          {hint}
          {note}
          <div
            className={cx("qz-card", open && "qz-card--hidden")}
            id={answerId}
            tabIndex={-1}
            data-qz-answer="1"
            role="group"
            aria-label="Answer"
          >
            <p className="qz-card__label">Answer</p>
            {open ? (
              <button
                type="button"
                className="rd-btn rd-btn--secondary"
                data-qz-first="1"
                aria-expanded="false"
                aria-controls={answerId}
                onClick={() => props.onAct({ t: "reveal" })}
              >
                Show answer
              </button>
            ) : (
              <>
                <p className="qz-card__answer">{text(card.back.answer)}</p>
                {explain && explain.length > 0 ? (
                  <p className="qz-card__why">{text(explain)}</p>
                ) : null}
              </>
            )}
          </div>
          {footView}
          {live}
        </div>
      </div>
    );
  }

  // --- cloze -----------------------------------------------------------------------------
  if (card.item_type === "cloze" && spec.type === "cloze") {
    const blanks = spec.accepted.length;
    const explain = card.back.explain;
    const blank = (n: number, tail: ReactNode) => {
      const ok = g.oks[n - 1];
      const cls = cx("qz-blank", graded && (ok ? "is-ok" : "is-bad"));
      const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
        // Enter is Check; an Enter that commits an IME composition (Korean) is not.
        if (e.key === "Enter" && !e.nativeEvent.isComposing) {
          e.preventDefault();
          if (!graded && props.pending === null) props.onAct({ t: "check" });
        }
      };
      return (
        <span className="qz-bw">
          {blanks > 1 ? (
            <span className="qz-bn" aria-hidden="true">
              {n}
            </span>
          ) : null}
          <input
            type="text"
            className={cls}
            id={`${uid}-b${n}`}
            value={st.blanks[n - 1] ?? ""}
            readOnly={graded}
            aria-label={`Blank ${n} of ${blanks}`}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="done"
            data-qz-first={n === 1 ? "1" : undefined}
            onChange={(e) => props.onAct({ t: "type", n, v: e.target.value })}
            onKeyDown={onKey}
            // With the keyboard up, the blank (and the foot below it) stays in view.
            onFocus={(e) =>
              e.currentTarget.scrollIntoView({ block: "nearest" })
            }
          />
          {tail}
        </span>
      );
    };
    const wrong = graded && !st.correct;
    const acc = wrong
      ? spec.accepted
          .map((forms, i) =>
            g.oks[i]
              ? null
              : { n: i + 1, val: String(st.blanks[i] ?? "").trim(), forms },
          )
          .filter((x): x is { n: number; val: string; forms: string[] } => !!x)
      : [];
    const hasResult =
      graded && (acc.length > 0 || (explain && explain.length > 0));
    return (
      <div className="qz-item rv-q" lang={lang}>
        {head}
        <div className="qz-body">
          {sr}
          <p className="qz-q qz-cloze" id={promptId}>
            <InlineText
              nodes={card.front.text}
              wrap={wrap}
              hrefBase={hrefBase}
              cloze={{ blank }}
            />
          </p>
          {hint}
          {note}
          {footView}
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
              {explain && explain.length > 0 ? (
                <p className="qz-why">{text(explain)}</p>
              ) : null}
            </div>
          ) : null}
          {live}
        </div>
      </div>
    );
  }
  return null;
}

// --- the way back into the chapter, and Suspend ---------------------------------------------

function Where({
  card,
  lang,
  back,
  busy,
  onSuspend,
}: {
  card: ReviewCard;
  lang: string;
  back: boolean;
  busy: boolean;
  onSuspend: () => void;
}) {
  const W = REVIEW.where;
  const loose = card.where.book === null;
  const place = placeText(card);
  const wrap = !isKorean(lang);
  const href = card.where.href.startsWith("/") ? card.where.href : "/library";
  return (
    <div className="rv-where">
      <p className="rv-where__label">
        {loose ? W.fromDocument : W.fromChapter}
      </p>
      <p className="rv-where__title" lang={lang}>
        {hangulRuns(card.where.chapter_title, wrap)}
      </p>
      {place ? <p className="rv-where__place">{chrome(place)}</p> : null}
      <div className="rv-where__acts">
        <Link
          className={cx("rd-linkbtn rv-where__link", !back && "is-off")}
          href={href}
          prefetch={false}
          aria-hidden={back ? undefined : "true"}
          tabIndex={back ? undefined : -1}
        >
          {card.source === "highlight" ? W.openHighlight : W.openQuestion}
        </Link>
        <button
          type="button"
          className="rd-btn rd-btn--quiet rv-suspend"
          disabled={busy}
          onClick={onSuspend}
        >
          {W.suspend}
        </button>
      </div>
    </div>
  );
}
