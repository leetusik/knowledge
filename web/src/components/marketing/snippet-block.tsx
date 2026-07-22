import { CopyButton } from "./copy-button";

// Snippet block (P20.S3, build-prompt §(a)) — a labeled charcoal plate for lines you
// PASTE, deliberately distinct from the terminal transcript chrome (mkt-term = a
// transcript; this = things you copy). Label top-left, copy control top-right; the body
// is a `pre-wrap` mono block on the charcoal plate (code stays dark in both bands).
//
// `display` (children) is what shows — it may differ from `copyText`: the ~/.zshenv
// block floats the comment onto its own hint line above the exports, but the copy pill
// still writes the byte-exact two locked lines. `copyText` is the FULL artifact copied.
export function SnippetBlock({
  label,
  copyText,
  children,
  legend,
}: {
  label: string;
  /** The full byte-exact artifact the copy pill writes to the clipboard. */
  copyText: string;
  /** The syntax-inked display body (may differ from `copyText`). */
  children: React.ReactNode;
  /** Optional legend row under a hairline (the health-check 200/401 meanings). */
  legend?: React.ReactNode;
}) {
  return (
    <div className="mkt-snip">
      <div className="mkt-snip__bar">
        <span className="mkt-snip__label">{label}</span>
        <CopyButton text={copyText} />
      </div>
      <pre className="mkt-snip__body">{children}</pre>
      {legend && <div className="mkt-snip__legend">{legend}</div>}
    </div>
  );
}
