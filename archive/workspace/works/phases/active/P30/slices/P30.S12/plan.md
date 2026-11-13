# P30.S12 — Native render pipeline (TypeScript)

## Goal

The web half of the native format: turn a stored native (or `md`) chapter source into React, safely.
- remark with this slice's own plugin, plus `yaml`, run in a server component.
- Validate again at render.
- Map to React with **no** raw HTML, `innerHTML` or `dangerouslySetInnerHTML`.
- An allowlisted SVG-to-React mapping.
- Link schemes and the never-leaking "missing link".
- The TS half of the conformance fixtures, including the per-block offset projection (**core test 4**).
- `md` through the same pipeline with the extensions turned off.
- Server-side code highlighting into token classes.
- The app CSP as defense in depth.

**It builds the plumbing, not the look.** Components render minimal semantic markup with stable class and
data hooks. S13 onwards style them under the signed design.

## Read first (just in time)

- `works/phases/active/P30/topics/slice-breakdown.md` → **S12**.
- P29's contracts, via `phase-section P29 Decisions`. Read only these headings: *S2 Render model*,
  *Custom SVG* (Render), *References* (At render), and the typed-block grammar you need.
- **`server/native/README.md`: the normative spec.** The TS validator and the projection must agree
  with the Python side byte for byte on the shared fixtures. Also read `server/native/project.py` and
  `server/native/svg.py`, the allowlist to mirror.
- `tests/fixtures/native/`: the 24 conformance cases, each with its expected output.
- `works/phases/active/P30/topics/notes-server.md` → *S5* (the read routes: where `source`, `format` and
  the assets come from) and *S9* (the projection the anchors depend on).
- `topics/notes-later.md`: loading the fixture book, plus S11's `readerHref` helpers.
- Code:
  - `web/package.json`, `web/next.config.*` and the existing CSP/headers;
  - `web/src/lib/knowledge/`, the API client;
  - how `/documents/{id}` currently renders md (if it does);
  - the `web/tests/` style.

## Approach (pinned)

1. **Location:** `web/src/lib/native/`:
   - `parse.ts`: remark plus remark-gfm plus this slice's directive or fenced-block plugin for the typed
     blocks, with `yaml` for their bodies;
   - `validate.ts`: re-validation that mirrors the Python rules. On failure it renders an inline "this
     block couldn't be shown" placeholder, never the raw source;
   - `project.ts`: the per-block offset projection, identical to `project.py`;
   - `svg.ts`: the allowlist mapping of elements and attributes to React props, with no `href` to `javascript:` or
     external targets and no event handlers, `style` or `foreignObject`;
   - `render.tsx`: the hast/mdast to React mapping, a component per node and typed block, with no HTML
     passthrough. Raw HTML nodes are dropped, or shown as text per README.

   Pin each new dependency to an exact version. Server components only, so nothing ships to the client.
2. **Links:** the README's allowed schemes. A relative or `ref:`-style internal reference resolves through
   the chapter's refs. An unresolved one renders the "missing link" marker, and **never leaks** the target
   text or path when it points to something unreadable.
3. **Code highlighting:** Shiki, pinned, with CSS-variable themes so S13's themes control the colours. It
   emits token classes or CSS variables only, never inline colour styles that would fight themes. If Shiki's
   output needs `dangerouslySetInnerHTML`, use its hast output mapped through the same React mapper instead.
4. **`md`:** the same pipeline with typed blocks and directives off.
5. **CSP:** a strict app CSP in the Next config, or the proxy, for the reader routes at least:
   - `script-src 'self'` with nonces if Next needs them;
   - `object-src 'none'`, `base-uri 'none'`, `frame-ancestors` as the site already has it;
   - `img-src 'self' data:` (asset `/raw` routes are same-origin).

   **Don't break existing pages.** The legacy html explainer iframe stays working until S25: scope or relax
   as needed, record what you chose, and verify existing pages load with no CSP console errors.
6. **A dev route to see it:** if no reader exists yet, add a minimal unstyled preview at the eventual
   chapter route, or use `/documents/{id}` for native and `md` documents, rendering through the pipeline.
   S13 replaces the shell. Keep it minimal.

## Tests (core test 4, plus sanitizing)

- The TS conformance runner over `tests/fixtures/native/`. Every accept case renders. Every reject case is
  refused by `validate.ts` exactly where Python refuses it. The per-block projection matches the expected
  offsets byte for byte.
- SVG allowlist: script, an `on*` handler, `javascript:` hrefs and `foreignObject` are all stripped or
  refused.
- No raw HTML reaches the output, so an `<img onerror>` in the source renders inert.
- Missing link never leaks.

## Live check

Load the fixture book into a fresh local API, following `topics/notes-later.md` → *Loading the fixture
book*, on a spare port (`:8767`) with a scratch `KB_ROOT`. **Never touch the standing `:8766` or `:3030`.**
Run web dev from a scratchpad copy on a spare port, as S11 did, and the production build with `next start`
on another port. Then:
- open the `all-blocks` chapter;
- confirm every block renders as semantic markup with no console CSP errors;
- confirm an existing legacy html document still displays.

Use Aside `--account u1`, or another real browser. Name the instrument. The agent profile was signed out
by S11, so sign in to the scratch API's test account.

## Validation

- `pnpm --dir web typecheck`, `lint`, `test` and `build`.
- `python3 scripts/plugin_parity.py`, `python3 scripts/skills_parity.py` and `python3 scripts/workflow.py
  validate`.
- D22: never run `prettier --write` on existing files. Format only new ones.

## Notebook

- `phase.md`:
  - **one** Doc impact line for the slice, naming its docs, with full lines in
    `topics/doc-impact-detail.md` → *P30.S12*;
  - notes for S13 onwards (component hooks, class names, how to render a chapter, the CSP decisions) in
    `topics/notes-later.md`, with one link line;
  - `## Now`.
- `result.md`: verdict block first.

**Unattended run:** settle open choices by the safest option and the README. Record them on
`## Operator Questions` as `decided: …` (one collapsed line in `phase.md`, full text in
`topics/operator-questions-decided.md`), and return `done`.

## Dispatch

slice=P30.S12
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
