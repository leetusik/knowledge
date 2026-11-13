# P30.S21 — Annotations II: bookmarks, Notes sheet, per-book list (`05-annotations`)

## Goal

Build the rest of the signed annotations job:
- bookmarks;
- *The place bar*;
- *The margin, the rows and the tag* (the block and other-language markers);
- *The Notes sheet*, with its Unanchored group;
- *A row in a list*;
- *The per-book list*, with round 02's back link (`book-page` 7);
- *Plain Markdown, legacy and signed out*.

## Read first

- **`works/phases/active/P30/topics/surface-slice-rules.md`: binding.**
- The spec:
  - `docs/reference/design/jobs/05-annotations/rounds/01-annotations/build-prompt.md`, those sections, the strings and *Every
    state*;
  - `docs/reference/design/jobs/05-annotations/rounds/02-keyboard-and-back-link/result.md` → `## Build` §2, the back link, and
    the added strings;
  - both canvases.
- `topics/notes-server.md` → *S8* (bookmarks, the per-book list route) and *S9* (`unanchored`,
  `other_languages`, bookmark `place`, legacy approximate bookmarks, and the "Made on v{n}" copy using the
  row's own `version` and `lang`, OQ32).
- S20's notes and code (`topics/notes-later.md`).

## Approach

- **Bookmarks:** add and remove, the place bar, legacy approximate bookmarks.
- **Margin markers:** for highlights, notes, block notes and other-language annotations.
- **The Notes sheet:** in the reader's sheet system (S13), with the Unanchored group showing orphans whole,
  never dropped.
- **The per-book list:** a page (the route per the prompt) over S8's per-book list, with the back link to
  the book page, using `readerHref`/`bookHref`.
- **Plain md, legacy html and signed out:** behave as the prompt says. Legacy html annotation stays as
  signed until S25 builds the legacy reader. Record what S25 must add.

## Out of scope

- The book page itself (S23) and the legacy reader (S25).

## Hand-off from S20 (must do; a small, allowed server change)

- **OQ102:** the annotation reads don't expose a highlight's review-card status, so "paused" and the card
  clause in the delete line only know about cards turned on in the current session.
  - Add the card's status (`active` / `suspended` / none) to each annotation in S8/S9's reads
    (`server/reader_api.py`), with a test for isolation (only the caller's card).
  - Mirror into `plugin/templates/kb/`, so `plugin_parity` passes.
  - Use it in S20's popover and delete line.
  - Run the server suite.
- S20's hooks and live-check setup: `topics/notes-later.md` → *Annotations I as shipped*.

## Dispatch

slice=P30.S21
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
