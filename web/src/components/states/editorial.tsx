import type { ReactNode } from "react";

/**
 * Round 03 §5.1 / §5.2 — the ONE editorial failure block, in its two designed
 * variants. Three surfaces need it (the error boundaries, the six not-found
 * pages, and round 04's in-frame panel failure), so it is a component rather
 * than three transcriptions of the same markup that can drift apart.
 *
 * It is pure markup over the classes round 03 §3 already landed in
 * `kb-console-responsive.css` — it adds NO styling of its own beyond the one
 * font-size §5.2 states literally (see `variant="panel"` below). The block is
 * deliberately shell-agnostic: §5.1's snippet wraps it in `<main class="kb-app-main">`,
 * but inside the `(app)` group the shell already renders that landmark, so the
 * caller supplies whatever wrapper its own position needs and this renders only
 * the `.kb-editorial` div.
 *
 * The distinction §5.3 calls "the whole rule" is the caller's to honour, not
 * this component's: **editorial = the page failed · `.kb-empty` = a part of the
 * page is waiting.**
 */
export function Editorial({
  variant = "page",
  code,
  title,
  sub,
  actions,
  detail,
}: {
  /**
   * `page` — a whole page failed: `<h1>` on bare paper, no panel (§5.1).
   * `panel` — one section failed: the same block INSIDE the `.kb-panel` that
   * failed, with an `<h2>` at 1.15rem and (by convention) a single `sm` Retry,
   * the rest of the page still usable (§5.2).
   */
  variant?: "page" | "panel";
  /** The mono eyebrow — `Not found · 404`, `Error · 500`. */
  code: string;
  title: string;
  sub: string;
  /** One primary, optionally one ghost. Anchors or buttons; the CSS takes both. */
  actions?: ReactNode;
  /** The mono `ref … · …` line. Errors only, and only when there is a real ref. */
  detail?: ReactNode;
}) {
  const block = (
    <div className="kb-editorial">
      <div className="kb-editorial__code">{code}</div>
      {variant === "panel" ? (
        // §5.2 states the size literally ("an <h2> at 1.15rem instead of the
        // <h1>"), and §3 ships no rule for it. Written here as markup rather
        // than as a new CSS rule: the round 03 stylesheet is a verbatim record
        // and is never edited.
        <h2 className="kb-editorial__title" style={{ fontSize: "1.15rem" }}>
          {title}
        </h2>
      ) : (
        <h1 className="kb-editorial__title">{title}</h1>
      )}
      <p className="kb-editorial__sub">{sub}</p>
      {actions ? <div className="kb-editorial__actions">{actions}</div> : null}
      {detail ? <p className="kb-editorial__detail">{detail}</p> : null}
    </div>
  );

  // §5.2's wrapper, verbatim: `<div class="kb-panel" style="padding:0">`. The
  // zero padding is the record's, and it matters — `.kb-panel > .kb-editorial`
  // (§3) supplies the block's own 2rem/1rem instead, which only applies while
  // the editorial is a DIRECT child of the panel.
  return variant === "panel" ? (
    <div className="kb-panel" style={{ padding: 0 }}>
      {block}
    </div>
  ) : (
    block
  );
}
