import type { ReactNode } from "react";

import { READER } from "@/content";
import type { QuizSpec } from "@/lib/reader/quiz";

/**
 * P30.S26 — the quiz on paper and its answer key (`09-legacy-and-print` round 01, *The quiz
 * on paper*, *The answer key*). Print-only server markup the chapter renderer places beside
 * the quiz island (`render.tsx`): the island is a form for the screen and is hidden on paper,
 * these are the paper's own, drawn from the same items. Nothing here reads a member's saved
 * answers (OQ7: they do not print).
 */

export interface PrintItem {
  spec: QuizSpec;
  /** Choice and recall: the prompt. Cloze: the sentence, its blanks as numbered rules. */
  prompt: ReactNode;
  /** Choice: each option's text, in `spec.options` order. */
  options?: ReactNode[];
  /** Recall: the model answer. */
  answer?: ReactNode;
  explain?: ReactNode;
}

const P = READER.print;

/** "B", "A and C", "A, B and D". */
function keysOf(spec: Extract<QuizSpec, { type: "choice" }>): string[] {
  return spec.options
    .filter((o) => spec.answer.includes(o.id))
    .map((o) => o.key);
}

function joinKeys(keys: string[]): string {
  if (keys.length <= 1) return keys.join("");
  return `${keys.slice(0, -1).join(", ")} and ${keys[keys.length - 1]}`;
}

function hintOf(spec: QuizSpec): string {
  if (spec.type === "recall") return P.recall;
  if (spec.type === "cloze")
    return spec.accepted.length > 1 ? P.clozeMany : P.clozeOne;
  return spec.multi ? P.choiceMany : P.choiceOne;
}

/** The quiz as it is printed: the head, every item and the pointer to the key. */
export function PrintQuiz({
  title,
  items,
  noun,
}: {
  title: ReactNode;
  items: PrintItem[];
  noun: "chapter" | "document";
}) {
  return (
    <section className="pp-quiz pp-only">
      <div className="pp-quiz__head">
        <p className="pp-quiz__label">{P.quizLabel(items.length)}</p>
        {title ? <p className="pp-quiz__title">{title}</p> : null}
      </div>
      {items.map(({ spec, prompt, options }) => (
        <div className="pp-qi" key={spec.id}>
          <span className="pp-qi__n">{spec.n}</span>
          <div>
            {spec.type === "cloze" ? (
              <>
                <p className="pp-qi__hint">{hintOf(spec)}</p>
                <p className="pp-cloze">{prompt}</p>
              </>
            ) : (
              <>
                <p>{prompt}</p>
                <p className="pp-qi__hint">{hintOf(spec)}</p>
              </>
            )}
            {spec.type === "choice" ? (
              <ul className="pp-opts">
                {spec.options.map((o, j) => (
                  <li className="pp-opt" key={o.id}>
                    <span
                      className={spec.multi ? "pp-qk pp-qk--sq" : "pp-qk"}
                      aria-hidden="true"
                    >
                      {o.key}
                    </span>
                    <span>{options?.[j]}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {spec.type === "recall" ? (
              <div className="pp-lines" aria-hidden="true">
                <span className="pp-rule" />
                <span className="pp-rule" />
                <span className="pp-rule" />
              </div>
            ) : null}
          </div>
        </div>
      ))}
      <p className="pp-quiz__note">{P.quizNote(noun)}</p>
    </section>
  );
}

export interface PrintKey {
  /** The quiz's title, plain, for the key's lead line; null when it has none. */
  title: string | null;
  items: PrintItem[];
}

/**
 * The answer key at the chapter's end, before the colophon: "Answers" as an h2, then one
 * group per quiz in the order they are printed (a chapter with several quizzes numbers each
 * from 1, as its questions are).
 */
export function PrintAnswers({ keys }: { keys: PrintKey[] }) {
  if (!keys.length) return null;
  return (
    <section className="pp-ans pp-only">
      <h2 className="pp-h2">{P.answers}</h2>
      {keys.map((k, i) => (
        <div key={i} className="pp-ans__group">
          <p className="pp-ans__lead">
            {k.title
              ? P.answersLead(k.items.length, k.title)
              : P.answersLeadUntitled(k.items.length)}
          </p>
          {k.items.map(({ spec, options, answer, explain }) => (
            <div className="pp-ai" key={spec.id}>
              <span className="pp-ai__n">{spec.n}</span>
              <div>
                <p className="pp-ai__a">
                  {spec.type === "choice" ? (
                    <>
                      <span className="pp-ai__key">
                        {joinKeys(keysOf(spec))}
                      </span>
                      {" · "}
                      {spec.options
                        .flatMap((o, j) =>
                          spec.answer.includes(o.id)
                            ? [options?.[j] ?? null]
                            : [],
                        )
                        .map((node, j) => (
                          <span key={j}>
                            {j > 0 ? "; " : null}
                            {node}
                          </span>
                        ))}
                    </>
                  ) : null}
                  {spec.type === "cloze"
                    ? spec.accepted.map((forms, j) => (
                        <span key={j}>
                          {j > 0 ? " · " : null}({j + 1}){" "}
                          <strong>{forms[0]}</strong>
                          {forms.length > 1
                            ? P.or(forms.slice(1).join(", or "))
                            : null}
                        </span>
                      ))
                    : null}
                  {spec.type === "recall" ? (
                    <>
                      <span className="pp-ai__label">{P.answerLabel}</span>
                      {answer}
                    </>
                  ) : null}
                </p>
                {explain ? <p className="pp-ai__x">{explain}</p> : null}
              </div>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}
