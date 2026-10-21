import type { LoadedReader } from "./load";

/**
 * P30.S20/S21 — does this page carry the annotation layer? A chapter that renders (native
 * or plain Markdown) with something to show: a signed-out reader gets Sign in to save; a
 * member needs a place to write (a tenant with no org slug has none, OQ75). The frame and
 * the article ask the same question.
 */
export function layerOn(reader: LoadedReader): boolean {
  return (
    !!reader.notes &&
    !reader.checked.refused &&
    (!reader.view.member || !!reader.view.write)
  );
}
