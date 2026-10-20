# P30.S13 — Reader shell (`01-reader`)

## Goal

The reader's frame, where every native or `md` chapter now opens. It covers:
- tokens: faces, the five text sizes per device, the themes including sepia, frame and motion, the type
  scale, the syntax roles' colour values for `kb-tok-*`;
- *Layout*: the frame, the container and breakpoints, the article tracks;
- §1 Top bar, §2 the progress line, §3 the chapter bar (as superseded by round 03), §12 Sign in to save,
  §13 the Display sheet, §15 the sheets (Contents and Display here; Version history's content is S15's),
  §16 the reader's states (loading, not found, failed);
- *Behaviour* → *The chrome* and *Keyboard*;
- the `kb_reader` settings cookie (P29 *S3 Who keeps state*);
- the chapter route, and native and `md` documents opening in the reader;
- the reader-scoped *Values P30 adds* that the shell uses.

The prose kit's styling (§5–§9a) is S14's. The resume pill, chapter end, list and version history, and the
position wiring are S15's. This slice renders the chapter body through S12's pipeline unstyled-but-legible,
which S14 then styles.

## Read first

- **`works/phases/active/P30/topics/surface-slice-rules.md`: binding.**
- The spec:
  - `docs/reference/design/jobs/01-reader/rounds/02-revise/build-prompt.md`, the signed base. Read the
    sections listed above, plus *What it is*, *Canvas-only*, *Wiring*, *Data the page needs*, *Every
    state*, the strings for the top bar, chapter bar, sheets, sign-in and states, and *Values P30 adds*.
  - `rounds/03-chapter-bar-and-border/result.md` → `## Build`, the delta: the control edge
    `--rd-control-edge`, compact chrome C07, the two-slot language switch.
  - The canvas, `rounds/03-chapter-bar-and-border/canvas/project/` (`reader.css`, `reader.js`, the
    `Reader`, `ReaderTop`, `ReaderBottom`, `DisplayPanel`, `SignInToSave`, `ReaderState` and `Foundations`
    boards).
- `topics/notes-later.md`:
  - *The render pipeline as shipped*: rendering, `kb-ch-*` hooks, `resolveRef`, CSP;
  - *URLs and the sign-in return address*: the route must accept `@{tenant-id}`, `signInToSaveHref`;
  - *Loading the fixture book*.
- `topics/notes-server.md` → *S2*, the book GET shapes and chapter reads, and *S8*, the profile and `kb_reader`
  versus the server profile.
- Code: the existing `/documents/{id}` view (`document-view.tsx`), the `(public)` routes and `/@…` pages,
  `web/src/app/globals.css` and the token layer, the app shell, `web/src/content/`.

## Approach

1. **Route:** `web/src/app/(public)/@[org]/[project]/books/[book]/[chapter]/page.tsx`, or the segment
   shape the existing `/@…` routes use. It accepts `@{slug}` and `@{tenant-id}`. It resolves through S2's
   book read with the reader's session when present, and it honours `?lang=` and `?v=`.
   - Native and `md` documents on `/documents/{id}` and on their pretty URLs open in the same reader shell,
     the loose-document variant (`rd-loose`).
   - **html stays on today's frame until S25.**
   - Switch md from `<MarkdownBody>` to the pipeline's md mode **inside the reader only** (OQ49). Any page
     that still shows md outside the reader keeps working.
2. **Shell parts:** build them as the prompt names them (`Reader`, `ReaderTop`, `ReaderBottom`,
   `DisplayPanel`, `SignInToSave`, `ReaderState`, and the sheet container), with server components where
   possible and client islands only for the chrome behaviour, the sheets and the display settings.
3. **Settings:** the `kb_reader` cookie holds text size, theme and anything else P29 lists. It applies on
   the server render, so there's no flash. Signed-in readers follow P29: does the profile win, or the
   cookie? Follow *S3 Who keeps state*.
4. **Links:** pre-resolve `chapter:` and `doc:` refs with the reader's token and pass `resolveRef` (OQ50).
5. **States:** loading, not found and failed, per §16. A private or missing chapter gives the constant
   not-found, never a leak.

## Out of scope

- Prose styling (S14).
- Resume, chapter end, chapter list content, version history and position wiring (S15).
- Figures, diagrams and quiz (S16–S19).
- Annotations (S20/S21).
- Library and book page (S22/S23).
- Legacy html (S25).

## Dispatch

slice=P30.S13
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
