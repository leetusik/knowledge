# Surface-slice rules (P30.S13–S26): binding on every web surface slice

The orchestrator wrote this once (before P30.S13). Each surface plan points here and adds only its own
scope.

## RESPECT THE DESIGN

- The signed round is the spec. Build exactly what its `build-prompt.md` (or, for a superseding round,
  `result.md` → `## Build`, a **delta** on the earlier prompt) describes: tokens, parts, props, every
  state, behaviour, strings, keyboard and values.
- **Never drop, simplify, restyle or "improve" an approved element.** No new colours, sizes, spacing,
  copy or motion.
- If a value is missing, take it from the round's canvas snapshot (`rounds/<r>/canvas/project/*.css`,
  `*.dc.html`, `reader.js`). Transcribe its CSS into the product's own CSS idiom (CSS Modules or the
  existing `globals.css` layer, whichever the app uses for scoped surface CSS). The class names may stay
  as the canvas has them (`rd-*`).
- *Canvas-only (never build)* items stay unbuilt.
- **A gap that needs a visual decision** (nothing in the prompt or the canvas answers it): pick the
  nearest drawn pattern and record it on `## Operator Questions` as `decided: … (undrawn; nearest drawn
  pattern)`. A real new surface or design need becomes a deferred job, not a guess.
- Where a later round in the same job exists, it wins where it differs.

## Wiring

- Render chapters through S12's pipeline (`web/src/lib/native/`) and style its `kb-ch-*` hooks. Never fork
  the parser or emit raw HTML. **Keep the CSP** (nonce `script-src` on reader routes; `img-src 'self'
  data:`). New client components must work under it.
- Build reader and book URLs only with `web/src/lib/reader-href.ts`.
- State comes from S8–S10's `/app/reader/…` API through the BFF (`web/src/lib/knowledge/reader.ts` and
  its pattern). Anonymous readers get only the settings cookie and "Sign in to save".
- Server changes are allowed only where the slice's plan says so. Then `plugin_parity` must pass.

## Live check (every surface slice)

- **Runtime** (`docs/current/operations.md` → `## Operator Runtime`): a fresh throwaway API on a spare port
  (`:8767`+), with a scratch `KB_ROOT` and a scratch database in the test Postgres (`kb-p28s2-pg`). Load
  the fixture book with `scripts/publish_fixture_book.py` (`topics/notes-later.md` → *Loading the fixture
  book*).
  - Web dev runs from a scratchpad copy of `web/` on a spare port, since Next 16 refuses a second
    `next dev` beside the standing `:3030`.
  - The production build runs as `next start` from `web/` on another spare port.
  - **Never use or stop `:8766` or `:3030`**, never publish to production, and never set Gemini keys
    (no paid spend).
- **Instrument:** Aside, `aside repl --account u1 "<js>"` (start Aside with `open -g -a Aside` if it's
  down). `u1` is signed out of `127.0.0.1`, so sign in to the scratch API's test account.
  - Aside's console capture records nothing. Check console and CSP errors with headless Chrome and a
    throwaway profile, as S12 did.
  - Narrow viewports need the iframe harness (`## Operator Runtime`); container narrowing is a layout
    probe only.
- **What to check:**
  - every state the round's *Every state* table lists that the slice builds;
  - every control works;
  - the manifest viewports (phone 390×844, tablet 820×1180 and 1024×768, desktop 1440×900);
  - the three themes, plus sepia where drawn;
  - text sizes;
  - keyboard;
  - no inner scroller;
  - no CSP or console errors.

  Compare against the canvas boards by screenshot. Stop your servers afterwards **by the PIDs you started, never `pkill -f next-server` or any pattern kill** (S17 killed the standing `:3030` that way).
- Name the instrument in `result.md`, and never claim a check you didn't run.

## Gates

- `pnpm --dir web typecheck`, `lint`, `test` and `build`.
- `python3 scripts/plugin_parity.py`, `python3 scripts/skills_parity.py` and `python3 scripts/workflow.py
  validate`.
- The server suite, if the server changed.
- **D22: never run `prettier --write` or `pnpm format` on existing web files.** Format only files you
  create.
- Tests only for very core behaviour (state and logic: anchoring math, cadence, grading). Never test the
  look.

## Notebook

- `phase.md`:
  - **One** Doc impact line per slice: `frontend.md` naming the signed round(s) as the surface's design
    record, plus any other docs. Full lines go in `topics/doc-impact-detail.md` → *P30.Sx*.
  - Decided questions: one collapsed line each on `## Operator Questions`, with full text in
    `topics/operator-questions-decided.md`.
  - Notes for later slices go in `topics/notes-later.md` with one link line. Consume and remove the notes
    addressed only to you.
  - `## Now`.
  - Keep `phase.md` under 40 KB.
- `result.md`: verdict block first.

**Unattended run:** the operator is away. Settle open choices by the signed round, then the nearest drawn
pattern, then the safest option. Record them as decided, and return `done`. Return `blocked` only for a
real impediment.
