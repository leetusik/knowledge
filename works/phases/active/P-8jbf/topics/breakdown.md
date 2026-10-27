# P-8jbf breakdown

## Passes

- DECOMP (pass 1): **not cut**, halted `needs_operator` on OQ1. The confirmed rule targets the
  console `.kb-doc` view, which since P30.S13 renders only the unlinked
  `/documents/{id}/versions/{v}` archive page; documents and chapters open in the signed
  `01-reader` (`web/src/app/reader.css`). Detail: [reader-surface.md](reader-surface.md).
  No slices created; the re-run rewrites this file in place.

## Estimate

None yet (nothing cut). For the provisional shape in
[reader-surface.md](reader-surface.md) § The cut once confirmed (DECOMP re-run, one
implementation slice, the review), `dispatch-summary`'s means give about 7.4 + 28.9 + 369.5
span-minutes per slice by kind (decomposition, implementation, review); the review mean is
skewed by larger phases. Spends money: no.
