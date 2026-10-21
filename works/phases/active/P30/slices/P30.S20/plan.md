# P30.S20 — Annotations I: selection, highlights, notes (`05-annotations`)

## Goal

A signed-in reader can select text, keep a highlight, attach a note to a highlight or a block, edit and
delete it, and turn on "Review this", exactly as signed:
- *The paint*, including inside a folded callout;
- *The selection flow* by mouse, touch and keyboard, with keyboard reach as superseded by round 02 §1;
- *The popover*;
- *The undo line*;
- notes on a highlight or a block, edit and delete;
- "Review this", wired to S10;
- the 2,000-character note.

**Core invariant:** the browser captures the stored anchor (the quote, its prefix and suffix, and the
**block-projection offsets** measured by S12's `project.ts` basis), and S9 re-maps it on the server. A wrong
capture silently corrupts every later re-anchoring. Rated `high` for that reason.

## Read first

- **`works/phases/active/P30/topics/surface-slice-rules.md`: binding.**
- The spec:
  - `docs/reference/design/jobs/05-annotations/rounds/01-annotations/build-prompt.md`: *Sections and offsets*, *The paint*, *The
    selection flow*, *The popover*, *The undo line*, notes, the strings, *Every state* and the values;
  - `docs/reference/design/jobs/05-annotations/rounds/02-keyboard-and-back-link/result.md` → `## Build` §1, keyboard reach,
    option (a), which wins where it differs;
  - both rounds' canvases (`canvas/project/`).
- P29 *S3 Anchors* and *Highlights and notes* (via `phase-section P29 Decisions`).
- `server/native/README.md`: the section projection (OQ8: code points in passage containers, with no
  whitespace collapse). `web/src/lib/native/project.ts` is the TS twin, already identical to Python.
- `topics/notes-server.md` → *S8* (the annotation routes, limits OQ29, the create idempotency by client
  id), *S9* (what the reads return, `unanchored`, other languages, what to paint) and *S10* (`PATCH
  annotations/{id} {review}`).
- `topics/notes-later.md`: the S13–S15 reader notes, the `kb-ch-*` hooks, and `data-block` ids.

## Approach

1. **Capture** (`web/src/lib/reader/anchor.ts`, pure):
   - from a DOM `Range` inside the rendered chapter, find the block (`data-block`/id) and compute the
     start and end offsets **in the same projection `project.ts` defines**;
   - take the quote, prefix and suffix as P29 says;
   - refuse selections that cross blocks, or that fall before the first heading, per the prompt.

   The inverse, `paintRanges`, maps stored offsets back to DOM ranges for painting.
2. **Paint:** wrap the resolved ranges with the signed highlight style, without breaking the server-rendered
   markup. Use the CSS Custom Highlight API if the prompt allows it and it's supported, otherwise
   non-destructive `<mark>` wrapping applied in a client island after hydration. Choose by what the
   signed design and the CSP allow, and record the choice. Folded callouts paint when opened.
3. **Selection flow and popover:** mouse, touch (the native selection handles plus the popover placement
   the prompt draws) and keyboard (round 02 §1). The popover offers Highlight, Note, "Review this" and
   Delete, in their states. The undo line follows delete.
4. **Writes:** go through BFF server actions to S8's routes, with client-generated ids (idempotent create),
   using optimistic UI with the signed failure states. Signed-out readers get Sign in to save.
5. **Very-core tests:** capture versus `project.ts` agreement, run on the shared fixtures. For a
   rendered fixture chapter, a selection's captured offsets must equal what Python's projection gives for
   the same text. This is the invariant. Also test the paint round trip.

## Out of scope

- Bookmarks, the margin and tags, the Notes sheet, the per-book list, and legacy or signed-out
  annotations (S21).

## Dispatch

slice=P30.S20
phase=P30
kind=implementation
risk=high
attempt=1
route=high
reason=risk high (not low)
tier=high
subagent_type=slice-executor-high
model=opus
pass_model=yes
effort=high
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=high
