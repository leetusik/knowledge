# P30.S16 — Figures (`02-figures`)

## Goal

Build §1–§8 of the signed `02-figures` round, on S12's pipeline hooks inside the reader:
- §1 the image box;
- §2 the figure;
- §3 the plain Markdown image;
- §4 the figure row;
- §5 the row card, in every tone;
- §6 the `svg` block, styled on S12's allowlisted mapping with `03-diagrams`' svg classes;
- §7 the sources list;
- §8 the citation.

It also covers *Behaviour*, every state on the boards, and *Values P30 adds*. The tone values are
`03-diagrams`' (*The tones* → *Values*, wave choice 1).

## Read first

- **`works/phases/active/P30/topics/surface-slice-rules.md`: binding.**
- The spec:
  - `docs/reference/design/jobs/02-figures/rounds/01-figures/build-prompt.md`: the whole prompt, including *Contract changes for
    P30*. They are additive and were signed as drawn; if the server lacks one, see the Server note below.
  - The canvas, `docs/reference/design/jobs/02-figures/rounds/01-figures/canvas/project/`.
  - `docs/reference/design/jobs/03-diagrams/rounds/01-diagrams/build-prompt.md` → *The tones* (values, where used, the svg
    block's classes).
- `topics/notes-server.md` → *S4*: the asset map `{name: {file, media_type, width, height, animated[,
  still]}}`, and the BFF relay `/api/documents/{id}/assets/{file}` that serves as `Asset.url`.
- `topics/notes-later.md` → *The render pipeline as shipped*: the `kb-ch-figure*`, `kb-ch-card`,
  `kb-ch-svg`, `kb-ch-sources` and missing-image hooks.
- S13 and S14's reader CSS and components.

## Approach

- **Style and complete the pipeline's figure, row, card, svg and sources output** to the signed parts.
  - Give images intrinsic `width` and `height` from the asset map, so nothing shifts on load.
  - The animated GIF still or play behaviour follows the prompt.
  - Citation links go to the source entry, and back.
- **Server:** if a signed *Contract change for P30* needs a server or parser change that S3, S5 or F2
  didn't make, make it on both halves:
  - Python and TS, with fixtures, keeping core test 4 identical;
  - `plugin_parity` passing.

  Record it. If it's large, record it and defer it, instead of half-building.

## Out of scope

- Diagram drawings (S17/S18) and quiz (S19).

## Dispatch

slice=P30.S16
phase=P30
kind=implementation
risk=low
attempt=1
route=mid
reason=kind implementation rated low
tier=mid
subagent_type=slice-executor-mid
model=sonnet
pass_model=yes
effort=high
pass_effort=yes
attribution=Claude Sonnet 5.5
explore_model=haiku
explore_effort=high
