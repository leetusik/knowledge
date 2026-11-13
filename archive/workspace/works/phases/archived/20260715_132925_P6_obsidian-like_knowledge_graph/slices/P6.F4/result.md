# P6.F4 — result

## What changed

`docs/stylesheets/extra.css` line 755, exactly as the plan specified — one selector's
`margin` value, plus a preceding comment:

```diff
-.md-typeset > .kb-graph { margin: 0; }
+/* carries the full-bleed margin at (0,2,0) — a bare .kb-graph margin loses to this
+   very selector; keep the breakout and the zeroed top/bottom margins together. */
+.md-typeset > .kb-graph { margin: 0 0 0 calc(50% - 50vw); }
```

No JS, no other CSS, no `graph.md` touched — confirmed by `git status`/`git diff`: the
only tracked-file diff in the repo is this one hunk in `extra.css`.

## Why (restated from plan)

`.kb-graph`'s own full-bleed rule (`width:100vw; margin-left:calc(50% - 50vw);`,
specificity (0,1,0)) was defeated by `.md-typeset > .kb-graph { margin: 0; }`
(specificity (0,2,0)) — the later, higher-specificity rule zeroed `margin-left` back
out, so the 100vw box started at the article's left edge instead of the viewport's,
pushing the info panel and zoom stack off-screen on wide viewports. Fix carries the
breakout `margin-left` on the higher-specificity rule itself.

## Verification

Server prerequisite: compose `kb` was already up; confirmed live-reload picked up the
CSS edit automatically (did not start/stop the server).

| Command | Result |
| --- | --- |
| `curl -s -o /dev/null -w '%{http_code}' http://localhost:8765/knowledge/graph/` | `200` |
| Launched own headless Chrome: `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --remote-debugging-port=9223 --window-size=1440,900 --user-data-dir=<scratch>/chrome-profile --no-first-run about:blank` | started; `curl http://127.0.0.1:9223/json/version` → Chrome/141.0.7390.123 |
| `node panel-probe.mjs` (the plan's ready-made CDP probe: 1440×900, 1280×720, 1000×800 + scrolled-to-bottom) | ran clean, JSON + 5 screenshots emitted into the scratchpad |
| Extended probe to 1920×1080 (optional, plan-suggested "operator's likely width") via a small companion script `probe-1920.mjs` reusing the same CDP pattern | ran clean, JSON + screenshot emitted |
| `pkill -f 'remote-debugging-port=9223'` | Chrome torn down; confirmed `curl 127.0.0.1:9223/json` → connection refused after kill |
| Fresh pinned venv (`pip install mkdocs-material==9.7.6`, confirmed 1.6.1/9.7.6) → `mkdocs build --clean` | "Documentation built in 0.36 seconds", no errors |
| `python3 scripts/site_smoke.py` | **exactly 1 violation** — the KNOWN pre-existing `/Users/` prose leak in `docs/current/{frontend,qa,operations,data}` built pages (out of scope; owned by the reopened re-review per P6.F1/F2/F3 notes). No graph/renderer/guard/landing assertion failed. |

### Acceptance metrics (probe JSON, all widths)

| Width | `graph.x` | `graph.right` | viewport width | `panelOffscreenRight` | `zoom.right` |
| --- | --- | --- | --- | --- | --- |
| 1440×900 | 0 | 1440 | 1440 | -18 | 1422 (≤1440) |
| 1280×720 | 0 | 1280 | 1280 | -18 | 1262 (≤1280) |
| 1000×800 | 0 | 1000 | 1000 | -18 | 982 (≤1000) |
| 1920×1080 (extra) | 0 | 1920 | 1920 | -19.8 | 1900.2 (≤1920) |
| 1440×900 scrolled-to-bottom | 0 | 1440 | 1440 | -18 | 1422 (≤1440) |

All within the plan's acceptance band (`graph.x`≈0 ±1, `graph.right`≈viewport ±1,
`panelOffscreenRight`≤0, `zoom.right`≤viewport width) at every probed width, including
the scrolled-to-bottom case and the extra 1920×1080 width.

Eyeballed `panel-1440x900.png`: no left gutter (map spans the full viewport edge to
edge), info panel fully visible top-right, zoom stack (+/−/fullscreen) fully visible
bottom-right, legend fully visible bottom-left. Matches the acceptance description.

## Known, deliberately-unfixed observations (per plan, recorded not fixed)

- Classic (non-overlay) scrollbars would make the 100vw box overflow by the scrollbar
  width (~15px) since `100vw` includes the scrollbar gutter; macOS overlay scrollbars
  (used in this probe: `scrollbarGutter: 0` observed) have no effect. Out of scope.
- `--kb-graph-chrome: 4.8rem` (96px) vs measured header+tabs 98px → ~2px overshoot at
  the map's bottom edge (confirmed in the probe: header+tabs bottom = 98, graph height
  computed off 4.8rem). Invisible; out of scope.

## Deviations from plan

None. Line 755 matched the plan's stated before-state exactly; the probe script existed
and ran without modification; Chrome was available at the stated path; the server was
already up (200); `site_smoke.py` returned exactly the one expected pre-existing
violation. The only addition beyond the plan's minimum was the optional 1920×1080 probe
extension, which the plan itself invited ("Optionally extend the probe with a
1920×1080 case").

## Housekeeping

- Own headless Chrome instance (port 9223) launched and torn down within this slice;
  did not touch the compose `kb` server (found already running, left running).
- `mkdocs build` wrote a `site/` directory in the repo root (gitignored, untracked) —
  left as-is; matches the pattern of prior P6 slices' pinned-build verification.
- No commit made; no slice/phase status transitioned; no `doc-new-version` run.
