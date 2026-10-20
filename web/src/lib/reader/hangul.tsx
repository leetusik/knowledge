import { Fragment, type ReactNode } from "react";

/**
 * Hangul runs inside other-language text (`01-reader` round 02, §6a).
 *
 * In text whose language is not Korean, each Hangul run is wrapped in
 * `<span lang="ko">`, so the `:lang(ko)` rules keep it whole (it never breaks between
 * its syllables) and it sets in Noto Serif KR. A run is a maximal sequence of Hangul
 * (`\p{Script=Hangul}`: syllables, jamo and compatibility jamo) with the ordinary or
 * no-break spaces between two Hangul characters; anything else (Latin, digits,
 * punctuation, Hanja) ends it. This is the pattern the signed prompt gives.
 *
 * Pure and dependency-free, so the server renderer and the client frame share it.
 * Never applied to code, link targets or attribute values.
 */
const HANGUL_RUN = /\p{Script=Hangul}+(?:[  ]+\p{Script=Hangul}+)*/gu;

/** The text split into plain and Hangul pieces, in order. */
export function hangulParts(text: string): { text: string; ko: boolean }[] {
  const out: { text: string; ko: boolean }[] = [];
  let last = 0;
  for (const m of text.matchAll(HANGUL_RUN)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ text: text.slice(last, at), ko: false });
    out.push({ text: m[0], ko: true });
    last = at + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), ko: false });
  return out;
}

/**
 * `text` as React children. `wrap` is "this text's language is not Korean"; when it
 * is false (a Korean variant is `lang="ko"` already) the text is returned as written.
 */
export function hangulRuns(text: string, wrap: boolean): ReactNode {
  if (!wrap || !/\p{Script=Hangul}/u.test(text)) return text;
  return hangulParts(text).map((part, i) =>
    part.ko ? (
      <span key={i} lang="ko">
        {part.text}
      </span>
    ) : (
      <Fragment key={i}>{part.text}</Fragment>
    ),
  );
}

/**
 * A display title that never breaks at the hyphen of a compound (§5): U+2060 WORD
 * JOINER after each hyphen between two letters. `overflow-wrap: break-word` still
 * breaks a compound wider than the column.
 */
export function joinHyphens(title: string): string {
  return title.replace(/(\p{L})-(?=\p{L})/gu, "$1-⁠");
}

/** Whether a language tag is Korean (`ko`, `ko-KR`): such text is `lang="ko"` already and gets no spans. */
export function isKorean(lang: string | undefined): boolean {
  return !!lang && /^ko(-|$)/i.test(lang);
}
