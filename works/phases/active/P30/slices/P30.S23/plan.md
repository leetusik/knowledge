# P30.S23 — Book page (`07-book-page`)

## Goal

Build the signed `07-book-page` round 01 §1–§8:
- the top bar;
- the book's head;
- Continue reading;
- the per-book list's entry (into S21's list);
- Contents;
- a chapter row;
- your reading data, with "Clear this book's reading data" (`DELETE state?scope=book`);
- the loading, not-found and failed states.

It also covers *The book shapes*, *Member, another org, signed out*, and *Keyboard and accessibility*.

The route is the book URL that `bookHref` builds. S13's "Book" link, dead until now (OQ57), comes alive.

## Read first

- **`works/phases/active/P30/topics/surface-slice-rules.md`: binding.**
- The spec:
  - `docs/reference/design/jobs/07-book-page/rounds/01-book-page/build-prompt.md`, the whole prompt, plus its canvas;
  - the `book-page` 7 back-link change, which lives in `docs/reference/design/jobs/05-annotations/rounds/02-keyboard-and-back-link/result.md`
    → `## Build` §2 and is already built in S21;
  - the 3:1 control edge for its controls, from `docs/reference/design/jobs/01-reader/rounds/03-chapter-bar-and-border/result.md`
    → `## Build` §1, and `06-library` round 02 for app-frame controls.
- `topics/notes-server.md` → *S2* (the book read, chapter variants and order, `canonical_path`) and *S8*
  (per-book progress and clear-book).
- `topics/notes-later.md`: S21's per-book list route, S22's library and shell, and the reader notes.

## Approach

- A server component over S2's book read and S8's per-book state, with a client island only for Clear and
  its confirmation, as drawn.
- Another org's book, and signed out: as *Member, another org, signed out* says, with no reading data
  and Sign in to save where drawn.
- Not-found is constant for private, missing and wrong-org books.

## Out of scope

- The review surface (S24) and the legacy reader (S25).

## Dispatch

slice=P30.S23
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
