# P6.F4 — full-bleed breakout defeated by §10b's margin rule; panel/zoom clipped off-screen

## Why (operator browser QA + CDP-measured diagnosis)

Operator: clicking a dot opens the info panel "almost out of screen". Diagnosed with a
headless-Chrome CDP probe against the live serve (script + evidence below) — this is a
measured fact, not a hypothesis:

- `.kb-graph`'s full-bleed trick (`width: 100vw; margin-left: calc(50% - 50vw);`,
  extra.css §10b, specificity (0,1,0)) is DEFEATED by `.md-typeset > .kb-graph
  { margin: 0; }` (extra.css:755, specificity (0,2,0)) — margin-left never applies.
- The 100vw box therefore starts at the ARTICLE's left edge (= Material's centered
  61rem grid edge) instead of the viewport's: offset = (viewportWidth − 1220px)/2 when
  the viewport is wider than 1220px. Measured: x=110 @1440 (panel 92px off-screen right,
  zoom stack FULLY off-screen, 110px dead gutter on the left); @1920 the offset is 350px
  → the 340px-wide panel is an ~8px sliver ("almost out of screen"); @1280 offset 30.
- Same disease family as P6.F2 ([hidden] specificity defeat). The map canvas mostly
  masked it because the plate still covered most of the viewport.

## The fix (exact, one line)

`docs/stylesheets/extra.css` line 755 — replace:

```css
.md-typeset > .kb-graph { margin: 0; }
```

with:

```css
/* carries the full-bleed margin at (0,2,0) — a bare .kb-graph margin loses to this
   very selector; keep the breakout and the zeroed top/bottom margins together. */
.md-typeset > .kb-graph { margin: 0 0 0 calc(50% - 50vw); }
```

Touch NOTHING else (no JS, no other CSS, no graph.md).

## Verification (probe-based — a browser IS available headless)

The probe from the diagnosis is at
`/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/7a3b6e1d-58a3-417e-9225-914f76c2e068/scratchpad/panel-probe.mjs`.
It launches nothing itself — Chrome must be running first. Lifecycle (port 9223 is free;
kill YOUR instance when done):

```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --remote-debugging-port=9223 --window-size=1440,900 \
  --user-data-dir=<your scratch>/chrome-profile --no-first-run about:blank &
```

1. Confirm the compose `kb` server is up (`curl -s -o /dev/null -w '%{http_code}' 
   http://localhost:8765/knowledge/graph/` → 200; it live-reloads your CSS edit
   automatically). Do NOT start/stop the server itself.
2. Run `node panel-probe.mjs` (it probes 1440×900, 1280×720, 1000×800 + a
   scrolled-to-bottom case, prints JSON metrics, saves screenshots into the scratchpad).
   Optionally extend the probe with a 1920×1080 case — the operator's likely width.
3. Acceptance, at EVERY probed width: `graph.x` ≈ 0 (±1), `graph.right` ≈ viewport width
   (±1), `panelOffscreenRight` ≤ 0, `zoom.right` ≤ viewport width. Eyeball one screenshot:
   no left gutter, panel fully visible, zoom stack visible bottom-right.
4. `python3 scripts/site_smoke.py` after a `mkdocs build` in the pinned venv — expect
   exactly **1** violation, the KNOWN pre-existing `/Users/` prose leak (docs/current,
   out of scope, the re-review owns it). Any OTHER violation → stop and escalate.
5. `pkill -f 'remote-debugging-port=9223'` when done (tear down what you start).

Known, deliberately-unfixed observations (record in result.md, do not fix):
- With classic (non-overlay) scrollbars a vertical scrollbar makes 100vw overflow by the
  scrollbar width (~15px). macOS overlay scrollbars: no effect. Out of scope.
- `--kb-graph-chrome: 4.8rem` (96px) vs measured header+tabs 98px → ~2px overshoot at the
  map's bottom edge. Invisible; out of scope.

## Executor duties (contract)

- Apply the fix, verify per above, write `result.md` beside this plan.
- Append to `works/phases/active/P6/phase.md`: a short "P6.F4" section (measured offsets +
  fix) and ONE Doc-impact line:
  - `qa` (P6.F4): second §10 specificity defeat found by operator browser QA (after F2's
    `[hidden]`) — `.md-typeset > .kb-graph { margin: 0 }` killed the full-bleed
    `margin-left: calc(50% − 50vw)`, offsetting the map box right by (viewport−1220)/2 and
    clipping the info panel and zoom stack off-screen on wide displays; fixed by carrying
    the breakout margin on the higher-specificity rule. CDP probe (headless Chrome
    geometry assertions + screenshots) added to the QA toolkit for overlay/layout checks.
- Never commit; never transition slice/phase status; no doc-new-version.
- The working tree may show dirty `works/*` state files — the orchestrator's; ignore.
- Any mismatch with this plan (line 755 differs, probe can't reach the server, Chrome
  missing) → return `escalate` with findings; do not improvise.
