import { hangulRuns, isKorean } from "@/lib/reader/hangul";

/**
 * A title or section in its own language (`06-library` §3): `lang` set on the span, and
 * Hangul runs inside English text carry `lang="ko"` (the reader's §6a) so they set in the
 * serif Hangul face.
 */
export function LangText({ text, lang }: { text: string; lang: string }) {
  return <span lang={lang}>{hangulRuns(text, !isKorean(lang))}</span>;
}
