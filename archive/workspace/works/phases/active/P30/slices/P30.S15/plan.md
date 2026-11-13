# P30.S15 — Progress and moving (`01-reader`)

## Goal

The reader remembers and moves:
- §4 the resume pill;
- §10 the chapter end (`ChapterEnd`), with Mark as finished and Mark as unread;
- §11 the chapter list (`ChapterList`) in the Contents sheet and at the chapter end;
- §14 version history (`VersionList`), with the stale-translation flag;
- the language switch (its behaviour, on round 03's two-slot markup that S13 built);
- *Behaviour* → *Progress, section and finished* and *Opening and moving*.

Positions and finishes are wired to S8's API: the cadence, the pagehide beacon (`POST
/api/reader/position`), last-write-wins, the grow-only `max_fraction` and `finished`, and the Mark as
unread reset. It uses S9's mapped `resume`.

## Read first

- **`works/phases/active/P30/topics/surface-slice-rules.md`: binding.**
- The spec:
  - `docs/reference/design/jobs/01-reader/rounds/02-revise/build-prompt.md`: §4, §10, §11, §14, §15
    (Version history sheet), *Progress, section and finished*, *Opening and moving*, *Data the page
    needs*, the strings for the resume pill, chapter end, chapter list and sheets, the relevant *Every
    state* rows;
  - the round 03 delta;
  - the canvas boards `ChapterEnd`, `EndStates`, `ChapterList`, `ListStates`, `VersionList`,
    `VersionStates` and `Reader` (the resume pill), plus `reader.js` for the behaviour.
- P29 *S3 Resume and progress* (with the Mark-as-unread amendment). Use `phase-section P29 Decisions`
  for that heading only.
- `topics/notes-server.md` → *S8* (the position API, cadence and limits, the beacon), *S9* (`resume`
  mapped by id across languages) and *S2* (chapter order and variants, versions).
- Code: S13 and S14's reader, `web/src/lib/knowledge/reader.ts`, `web/src/app/api/reader/position/route.ts`.

## Approach

- **Client island for position.**
  - Sample the reading position (block id plus offset or fraction, as P29's position shape says) at P29's
    cadence.
  - Send on the cadence through the BFF, and on `pagehide` or `visibilitychange` with `sendBeacon`.
  - Anonymous readers send nothing.
- **Resume pill:** when the server's `resume` is ahead of the top, as §4 says, show the pill. It jumps to
  the mapped block. Dismissal follows the signed design.
- **Chapter end:** next chapter, Mark as finished, and Mark as unread (the explicit reset), in their
  signed states. A finished chapter shows as finished in the chapter list.
- **Version history sheet:** the versions from S2's chain, Read this version (`?v=`), and the
  stale-translation flag when a translation's `translated_from` lags its source. Its exact condition is
  per P29 and the prompt.
- **Language switch:** `?lang=` with the mapped position, from S9's id mapping.
- **Very-core tests:** the cadence and the grow-only and last-write-wins client logic. Test the decision
  logic only, never the look.

## Out of scope

- Annotations (S20/S21), library and book-page progress displays (S22/S23), review (S24).

## Hand-offs from S14 (must do)

- **Version history:** S14's "Version history" button dispatches `reader:open-sheet` on `window` (OQ64).
  Add the sheet and its listener. See `topics/notes-later.md` → *The prose kit and chapter opening as
  shipped*.
- **Page `<title>`:** a reader page's `<title>` reads "Documents · knowledge" (S13 metadata). Set it to the
  chapter or document title, in the app's existing `<title>` pattern (`generateMetadata`). This is
  metadata, not a visual change.

## Dispatch

slice=P30.S15
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
