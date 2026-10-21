/**
 * P30.S19 — what a signed-in reader's saved quiz answers show on return (`04-quiz`
 * round 01, *On return, signed in*; P29 *Item drift*). Server-only: it reads the
 * versions an answer was made on.
 *
 * For each item the block shows the LATEST saved attempt, in any language and version,
 * unless that answer cannot be shown truthfully:
 *  1. a `cloze` answered in another language starts fresh, with the language note;
 *  2. an item whose SHAPE changed since (the type, the option ids and the right answer;
 *     the number of blanks and, in one language, what each accepts; the type alone for a
 *     recall) starts fresh, with the drift note. A wording change keeps the shape;
 *  3. otherwise it shows graded from the saved attempt, with the provenance line.
 *
 * Judging (2) needs the item as it was on the version the answer was made on. That
 * version is read only when it is not the one on screen (a few reads at most, deduped);
 * an answer whose version cannot be read starts fresh WITHOUT a note, since a note would
 * claim a change nobody checked.
 */
import "server-only";

import { getDocument, getDocumentVersion } from "@/lib/knowledge/app";
import type { KbQuizAttempt } from "@/lib/knowledge/reader";
import { validateChapter, type CheckedChapter } from "@/lib/native";

import { driftNote, provenance, shapeOf, specOf, type QuizSpec } from "./quiz";

export type QuizSavedItem =
  | {
      state: "graded";
      response: KbQuizAttempt["response"];
      correct: boolean;
      prov: string;
    }
  | { state: "fresh"; note: string };

/** Keyed by the item's DOM id, `<block>--<item>`. */
export type QuizSaved = Record<string, QuizSavedItem>;

/** The most older versions one page reads to judge drift. */
const MAX_READS = 6;

type Rec = Record<string, unknown>;

/** Every quiz item of a checked chapter as a spec, keyed `<block>--<item>`. */
export function quizSpecs(checked: CheckedChapter): Map<string, QuizSpec> {
  const out = new Map<string, QuizSpec>();
  if (checked.refused) return out;
  for (const block of checked.tree.blocks) {
    if (block.type !== "quiz" || typeof block.id !== "string") continue;
    const items = Array.isArray(block.items) ? block.items : [];
    items.forEach((raw: unknown, i: number) => {
      if (typeof raw !== "object" || raw === null) return;
      const spec = specOf(raw as Rec, i + 1);
      if (spec) out.set(`${block.id}--${spec.id}`, spec);
    });
  }
  return out;
}

export interface QuizSavedArgs {
  token: string | undefined;
  attempts: readonly KbQuizAttempt[];
  /** The chapter on screen. */
  checked: CheckedChapter;
  project: string;
  /** The variant on screen. */
  here: {
    stem: string;
    lang: string;
    version: number;
    docId: number;
    /** That document's current version. */
    newest: number;
  };
  /** A loose document has one variant; "the same language" then means the same document. */
  loose: boolean;
  /** The chapter's variants (other languages), each with its CURRENT version. */
  variants: { stem: string; docId: number; version: number }[];
  langName: (lang: string) => string;
}

export async function loadQuizSaved(args: QuizSavedArgs): Promise<QuizSaved> {
  const { token, attempts, checked, here, loose } = args;
  const out: QuizSaved = {};
  if (attempts.length === 0) return out;
  const now = quizSpecs(checked);
  if (now.size === 0) return out;

  const reads = new Map<string, Promise<Map<string, QuizSpec> | null>>();
  const specsAt = (a: KbQuizAttempt): Promise<Map<string, QuizSpec> | null> => {
    if (a.doc === here.stem && a.version === here.version)
      return Promise.resolve(now);
    const key = `${a.doc}@${a.version}`;
    const hit = reads.get(key);
    if (hit) return hit;
    const target =
      a.doc === here.stem
        ? { docId: here.docId, current: here.newest }
        : (() => {
            const v = args.variants.find((x) => x.stem === a.doc);
            return v ? { docId: v.docId, current: v.version } : null;
          })();
    let run: Promise<Map<string, QuizSpec> | null>;
    if (!target || a.version > target.current || reads.size >= MAX_READS) {
      run = Promise.resolve(null);
    } else {
      run = (async () => {
        try {
          const source =
            a.version < target.current
              ? await getDocumentVersion(token, target.docId, a.version)
              : await getDocument(token, target.docId);
          if (source.format !== "native" || !source.source)
            return new Map<string, QuizSpec>();
          return quizSpecs(validateChapter(source.source, "native"));
        } catch {
          return null;
        }
      })();
    }
    reads.set(key, run);
    return run;
  };

  await Promise.all(
    attempts.map(async (a) => {
      const key = `${a.block_id}--${a.item_id}`;
      const spec = now.get(key);
      if (!spec) return;
      const sameLang = loose ? a.doc === here.stem : a.lang === here.lang;
      const langName = args.langName(a.lang);
      if (spec.type === "cloze" && !sameLang) {
        out[key] = {
          state: "fresh",
          note: driftNote({
            answeredAt: a.answered_at,
            sameLang,
            version: a.version,
            langName,
            otherLanguageCloze: true,
          }),
        };
        return;
      }
      const then = await specsAt(a);
      if (!then) {
        out[key] = { state: "fresh", note: "" };
        return;
      }
      if (
        shapeOf(then.get(key) ?? null, sameLang) !== shapeOf(spec, sameLang)
      ) {
        out[key] = {
          state: "fresh",
          note: driftNote({
            answeredAt: a.answered_at,
            sameLang,
            version: a.version,
            langName,
            otherLanguageCloze: false,
          }),
        };
        return;
      }
      out[key] = {
        state: "graded",
        response: a.response,
        correct: a.correct,
        prov: provenance({
          answeredAt: a.answered_at,
          sameLang,
          version: a.version,
          viewVersion: here.version,
          langName,
        }),
      };
    }),
  );
  return out;
}
