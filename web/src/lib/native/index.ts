/**
 * The native/md chapter render pipeline (P30.S12). Server-only.
 *
 *   <NativeChapter source={doc.source} format="native" assetUrl={…} resolveRef={…} />
 *
 * parse.ts (remark + the native extensions + yaml) → validate.ts (the
 * render-time gate) → render.tsx (the React mapping; no raw HTML ever).
 * project.ts is the per-block projection annotation offsets are measured on.
 */
export { ChapterView, NativeChapter, type NativeChapterProps } from "./render";
export {
  validateChapter,
  type CheckedBlock,
  type CheckedChapter,
} from "./validate";
export {
  parseChapter,
  type ChapterFormat,
  type ParseResult,
  type RefRecord,
} from "./parse";
export {
  codePoints,
  formatSections,
  inlineText,
  sections,
  type Section,
} from "./project";
export {
  documentAssetUrl,
  type ChapterRef,
  type DocRef,
  type LinkContext,
} from "./links";
export type { Block, Inline, Tree } from "./tree";
