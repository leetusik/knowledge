# P30.S22 — Library and `/@{org}` (`06-library`)

## Goal

Build the signed `06-library` round 01 §1–§9, as superseded by round 02 (C11, the control border at 3:1):
- §1 the app shell's entry points, a "Reading" group with Library and Review;
- §2 the page head;
- §3 Continue reading;
- §4 the shelves, by project and by subject;
- §5 the book card;
- §6 the loose document row;
- §7 the grouping control;
- §8 your reading data and Clear all (`DELETE state?scope=all`);
- §9 the loading, failed, empty and not-found states.

Also add the **public org library `/@{org}`** as drawn. Make **the landing after sign-in `/library`** for
every member (`library` 3). Change `DEFAULT_NEXT_PATH`, and S13's library link (`LIBRARY_HREF`, OQ57)
follows. Console, auth and landing change only where this forces it.

## Read first

- **`works/phases/active/P30/topics/surface-slice-rules.md`: binding.**
- The spec:
  - `docs/reference/design/jobs/06-library/rounds/01-library/build-prompt.md`, the whole prompt. *Proposed shell values* were
    signed as drawn.
  - `docs/reference/design/jobs/06-library/rounds/02-control-border/result.md` → `## Build`, the delta and the scope of bordered
    controls.
  - Both canvases.
- `topics/notes-server.md` → *S2* (book listing reads, `/app/orgs/{org}/{project}/books/{book}`, kinds
  and subjects) and *S8* (progress, Continue reading data, clear-all keeping the profile, OQ28).
- `topics/notes-later.md` → *URLs and the sign-in return address* (S22's default landing,
  `orgSegment`) and the reader notes.
- Code: the app shell (`web/src/app/(app)/…` or the console layout and its nav), `DEFAULT_NEXT_PATH` in
  `web/src/lib/next-path.ts`, the existing `/@{org}` routes (org graph), and the dashboard.

## Approach

- **Server:** if the library needs a listing read that S2 and S8 don't provide (for example, every book
  and loose document the member can read, with progress, in one call), add it to the server:
  - with the `Gate` visibility check;
  - with tests for isolation and visibility;
  - with `plugin_parity` passing.

  Prefer composing existing reads in the BFF if that's enough.
- **`/@{org}` public library:** anonymous, public projects only, with no reading data. Don't change the
  existing org graph route's behaviour beyond what the prompt draws (if `/@{org}` is the graph today, the
  prompt says where each goes; follow it).
- **Landing:** update `DEFAULT_NEXT_PATH` and its tests. A safe `next` still wins.

## Out of scope

- The book page (S23) and the review surface (S24). The shell's Review entry links to S24's route, which
  may 404 until S24 ships; record that.

## Dispatch

slice=P30.S22
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
