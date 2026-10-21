import type { ReactNode } from "react";

// The metadata strip's field (P19 / P23.S3 / P28.S7), shared with the past-version view.
// P30.S25 removed `DocumentView` (the header + strip + format branch of the older
// document frame): every document now opens in the reader or the legacy reader, so only
// the archived md/native version page (`versions/[v]`) still draws this strip.

/**
 * One labeled field in the metadata strip. EXPORTED (P23.S3) so the past-version
 * view renders its own strip in the same vocabulary instead of re-inventing one —
 * it is presentation only, with no document coupling.
 *
 * `empty` (P28.S7) marks a field whose value is the em-dash placeholder: §4.2 keeps
 * the field itself — "a strip that changes shape per document is not a strip" — and
 * greys only the value.
 */
export function Meta({
  label,
  children,
  mono,
  empty,
  tags,
}: {
  label: string;
  children: ReactNode;
  mono?: boolean;
  empty?: boolean;
  /** The one field of unknown length: it spans the whole strip (§4.2). */
  tags?: boolean;
}) {
  return (
    <div
      className={
        tags ? "kb-docmeta__field kb-docmeta__field--tags" : "kb-docmeta__field"
      }
    >
      <span className="kb-docmeta__label">{label}</span>
      <span
        className={[
          "kb-docmeta__value",
          mono ? "kb-docmeta__value--mono" : "",
          empty ? "kb-docmeta__value--empty" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </span>
    </div>
  );
}
