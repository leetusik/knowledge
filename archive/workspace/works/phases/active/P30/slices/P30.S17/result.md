# P30.S17 result — Diagrams I (`03-diagrams`: frame, flow, state)

- status: done
- tier: mid
- model: sonnet
- effort: high
- summary: Flow and state `diagram` blocks (standalone and as figure-row items) are now laid out on the server (a rule-for-rule TS port of the canvas's `dggraph.js`, text measured from the fonts' own advance widths) and drawn as safe React SVG inside the signed frame (title, measured scroll box with fades and hint, hidden text alternative, caption, size clamp, three themes, Korean). The other four kinds keep S12's text until S18.
- files_changed: web/src/lib/native/diagram-text.ts (new), diagram-layout.ts (new), diagram-metrics.ts (new, GENERATED), diagram-draw.tsx (new); web/scripts/gen-diagram-metrics.py (new); web/src/components/reader/diagram-figure.tsx (new); web/src/lib/native/render.tsx; web/src/content/chapter.ts; web/src/app/reader.css; web/tests/diagram-layout.test.ts (new); web/tests/native-render.test.ts (style allowance); works/phases/active/P30/phase.md, topics/{notes-later,operator-questions-decided,doc-impact-detail}.md
- validation:
  - `pnpm --dir web typecheck` PASS · `lint` PASS · `test` PASS (29 files, 264 tests; 2 new) · `build` PASS
  - `python3 scripts/plugin_parity.py` PASS · `python3 scripts/skills_parity.py` PASS · `python3 scripts/workflow.py validate` PASS (pre-existing warnings only)
  - live check (below): PASS
- deviations: none from the plan. Decisions OQ83–OQ86 (`topics/operator-questions-decided.md`). One incident, see *Incident*.
- doc_impact: frontend.md, security.md: P30.S17 (one line in `phase.md`; full text `topics/doc-impact-detail.md` → *P30.S17*)

## What was built

- **Layout** (`diagram-layout.ts`): `layoutGraph(spec, kind)`, the canvas's algorithm kept step for step: grid placement (`at`, or the next free cell in `direction`), node sizing (balanced wraps at 132/140, padding by shape, entity head band and fields), shapes (box, pill, store cylinder, entity, state, final double border, initial dot and arrow), gaps (base, group padding and name band, self-loop, initial), the fixed list of route shapes (straight, Z, L, way back, U, self), ports, tracks 10 px apart, "two edges never share a run", labels on the longest segment with one ground per label and a pair-each-way rule, lanes and layers as groups, and the growing-gap loop (4 passes). Output is plain primitives in px at the default size. Deterministic: same source, same geometry (the very-core test).
- **Text** (`diagram-text.ts`, `diagram-metrics.ts`): wrap and balanced wrap exactly as `dg.js` (a Hangul word never breaks inside itself; a lone `·` stays with its word; a long word breaks after `/ - _ . · (`). Widths are sums of advance widths generated from the vendored variable woff2 (`web/scripts/gen-diagram-metrics.py`, instanced at 400/600), not a browser.
- **Draw** (`diagram-draw.tsx`): primitives to React `<svg>` (`aria-hidden`, `focusable=false`, `viewBox`, `--dg-vbw`, `--dg-floor`); `graphAlt` builds the hidden text alternative ("Starts at …", "{label} ({sub}), in {group}, an end state. Fields: …. Goes to …; back to itself, …").
- **Frame** (`diagram-figure.tsx`, client): title (`aria-labelledby`), `.dg__box` with the scroll box (role region, tabindex 0 and the label only while it overflows, via `useBox`), fades, hint, hidden alternative, caption. Server and first client render agree.
- **Renderer** (`render.tsx`): `isDrawn` picks flow and state; `drawn()` is used for a top-level block and for a figure-row item (a `div.dg` inside the item's figure). Hangul runs in the title, caption and alternative go through `Renderer.text`.
- **CSS** (`reader.css`, last block): the frame, the size clamp, the drawn-kind and tone-selector classes, transcribed from `diagram.css` (tones were already in from S16).

## Live check

Instrument: **Aside** (`aside repl --account u1`) for screenshots, geometry and the real ArrowRight key (through the iframe harness for 390/820/1024 widths); headless Chrome over CDP (throwaway profile) for console and CSP and for Tab focus. Compared by screenshot against the critic's rendered PNGs of the signed canvas (`KindFlow.frame.png`); the canvas itself needs the design tool.

Runtime: production build `next start` `:3791` and a dev clone `:3793` (opened at `localhost`) against a scratch API `:8791` (scratch `KB_ROOT`, scratch database `kb_s17live` in `kb-p28s2-pg`, migrated to `0006`, `KB_GIT_COMMIT=false`, no Gemini keys), the fixture book plus my chapter `diag` (the canvas's own flow and state samples from `dgdata.js`, a no-caption one, a Korean one, a row with a flow and a state). `fixtures` made public for anonymous reads.

| Check | Result |
|---|---|
| Pipeline in lanes, layers (down, pills, stores, toned edges), loop with a way back, tables (entities), no node placed, long labels, chapter and card state (initial, final, self-loop, pair each way) | draw as the canvas boards (routes, ports, label knock-outs, group names, shapes) |
| Korean labels, long Hangul node, Korean title and caption | Pretendard in the drawing, keep-all wrap, node grows; no cut |
| Themes light, dark (slate), sepia | tones and knock-outs right in all three (sepia and dark screenshots) |
| 1440, 1024, 820: column 576, `write-path` (W 551) shows whole; at 390 the 356 column scrolls | measured: 8 of 11 diagrams `is-over` at 390 with role region, tabindex 0, label, hint shown; none at 1024/820 except the row state; the page never scrolls sideways at any width |
| Size: the clamp | at 1440 `write-path`: size 1 = 467 px (the floor wins), 3 = 551, 5 = 576 (the column); figure font 12.5 / 15 / 18.33 px |
| Row items | a small flow shows whole in a third; the state shrinks then scrolls with its own fades and hint |
| Keyboard | Tab reaches the scrolling box, focus ring 2 px accent solid; ArrowRight scrolls it (Aside real key: scrollLeft 0 to max, left fade appears) |
| Text alternative | present, visually hidden, correct for state (starts, end state, self loop) and Korean |
| Console and CSP | no errors on the production build or the dev clone (only the unrelated `/favicon.ico` 404); dev hydrates cleanly |

Not verified: print (CSS transcribed, not printed), real devices, the canvas boards side by side, headless-CDP ArrowRight (raw CDP key events do not scroll a box; Aside's did).

## Incident

While stopping my servers I ran `pkill -f next-server`, which also stopped the standing `:3030` dev server (never to be stopped). I restarted it at once with `pnpm --dir web dev` from the repo (now pid 61557, listening on `127.0.0.1:3030`, same command the Operator Runtime gives). `:8766` was never touched. Everything else I started is stopped.

## Residue

Scratch database `kb_s17live` in `kb-p28s2-pg`; scratch files in the session scratchpad `s17/`. The Aside profile `u1` holds no session on `127.0.0.1`.
