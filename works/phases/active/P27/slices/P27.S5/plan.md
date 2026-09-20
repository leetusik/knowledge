# P27.S5 — plan (orchestrator native plan, `auto`, 2026-09-21)

**Design round 06: document views + the chrome-less HTML-only view + the Export PDF print appearance.**
The phase's **last** design round. `kind: co-work`, `risk: high`, style `design-only`, `Mockup: on request`.

## Shape — inline, two spans, one stop

Per the `design-cowork` skill and `CLAUDE.md`: a `co-work` slice runs **inline** on the main thread. No
mockup has been requested in this phase, so there is **no dispatched span** and **one** `pending` stop.

1. **Span 1 (this one, inline).** Write `web/design/rounds/06-document-views/handoff.md`, `start-slice`,
   `set-slice-status P27.S5 pending`, commit, report **PENDING #1**, STOP.
2. **Span 2 (on the operator's return, inline).** `DesignSync` read-back → card-contract check →
   concreteness check → land `output/` as-is → **their literal "done" signs the round** → `SIGNOFF.md` →
   `phase.md` → `finish-slice` → commit → continue into `P27.REVIEW`.

Anything wrong in the read-back: report exactly those points, `pending` again, STOP, **sign nothing**.
If the operator asks for a mockup in their own words before the round closes, the slice grows the dispatched
span and PENDING #2, and the phase gate is re-declared `accept-gate P27 --require`.

## The card contract — cards 33–41

Nine cards, one per reviewable unit, contiguous from **33**, every path two-digit-prefixed in reading
order, `@dsCard` marker on line 1, group `⏳ P27.S5 · Document views`:

| Path | Unit |
| --- | --- |
| `33-doc-column.html` | the reading column and the page header at 390 / 768 / 1180 |
| `34-doc-actions.html` | the metadata strip + the actions row, member and public, **plus the two new controls** |
| `35-explainer-frame.html` | the sandboxed explainer frame — chrome, sizing, pre-measurement, anchors |
| `36-markdown-body.html` | `.kb-prose` at three widths — measure, code, GFM tables, images |
| `37-versions.html` | the history panel + the past-version view (banner, 5-field strip, read-only) |
| `38-html-only.html` | the chrome-less full-window view and the way back out |
| `39-export-control.html` | the Export PDF control, its states, and the phone path |
| `40-printed-page.html` | **the paper itself** — both body paths |
| `41-doc-states.html` | not-found ×2, the anonymous bounce, empty body, a frame that fails, loading |

## The eight grounded facts this round is handed (all verified this session)

1. **Three routes render the same document**, all `optionalIdentity()`-branched into `AppShell` /
   `PublicShell`: `(public)/documents/[id]/page.tsx`, the pretty `(public)/[org]/[project]/[slug]/page.tsx`
   (member branch has Copy link but **no delete**), and `(public)/documents/[id]/versions/[v]/page.tsx`
   (read-only: no copy-link, no delete). All three cap the article at `max-w-[var(--kb-app-read-w)]`.
2. **The measure is three numbers that disagree.** `--kb-app-read-w: 64rem` (`kb-tokens.css:94`) caps the
   article; `.kb-prose` caps itself at `46rem` and centres (`prose.css:16-18`); `--kb-measure: 42rem`
   (`kb-tokens.css:66`) is **declared and referenced nowhere in the app** — verified by grep. Round 03 left
   both untested against the foundation and named this round as their subject.
3. **The explainer frame's pre-measurement height is the same magic number round 05 just killed for the
   graph**: `calc(100dvh - var(--kb-app-topbar-h) - 13rem)` with `min-height: 30rem`
   (`explainer.css:41-42`), and it predates round 03's navbar exactly as the graph plate did.
4. **A framed explainer is a foreign, self-styled page.** `.claude/skills/explain/SKILL.md` §4.1–4.2: a
   single self-contained HTML file, inline `<style>`/`<script>` only, its own system-font stack, its own
   `:root { color-scheme: light dark; }`, a table of contents, HTML/CSS/SVG diagrams, and a **5-question
   interactive quiz**. We style nothing inside it — the design owns the frame around it and the paper it
   lands on, never its content.
5. **The height/anchor handshake is real and load-bearing.** The relay injects a reporter
   (`lib/explainer-height.ts`); `explainer-frame.tsx` clamps 120–40000px, sets `[data-measured]`, and
   replays in-page ToC jumps against the **page**, inset by the measured `.kb-topbar`. A document that never
   reports keeps the fallback height and scrolls internally.
6. **The sandbox is absolute.** `sandbox="allow-scripts"` and never `allow-same-origin`; the relay
   (`api/documents/[id]/raw/route.ts`) pins `Content-Security-Policy: sandbox allow-scripts; frame-ancestors
   'self'` + `X-Frame-Options: SAMEORIGIN`, with matching per-path exemptions in `next.config.ts` for both
   the current and the version-aware relay. Printing a cross-origin sandboxed frame from the parent is a
   real constraint on the pipeline, and `window.print()` **inside** the frame would need `allow-modals`,
   which P16 pinned shut. The round designs the appearance; it does not reopen the sandbox.
7. **There is no print CSS anywhere in the repo** (`grep "@media print\|@page"` → nothing), no chrome-less
   route, and no export control. All three are net-new.
8. **Round 05 corrected round 04's public shell** (`.kb-app--public .kb-app-layout { grid-template-columns:
   minmax(0, 1fr) }` in `graph-r5.css`). Round 06's surfaces are mostly public — cite the fix as an input,
   never re-fix it.

## Constraints the handoff states as inputs (never as questions)

- **The HTML-only view keeps the sandboxed opaque-origin iframe.** "Chrome-less" is the app page minus its
  chrome around the *same* relay frame — never raw document HTML served on the app origin. (phase.md, from
  `P27.DECOMP`.)
- **PDF export is the browser's print pipeline**, not a server renderer (D25 is deferred).
- Copy is locked to `web/src/content/*`; any new string is returned as a table and becomes an operator
  question, exactly as round 05's did.
- Rounds 03, 04 and 05 are **settled inputs**, cited by `build-prompt.md` path, never re-posed.
- Additive only: no existing `--kb-*` name or value changes; cards 01–32 keep their paths.

## Housekeeping carried into this round

Round 05's six cards still carry the `⏳ P27.S4 · Graph` prefix. The regroup was deferred for the same
reason round 04's was — `DesignSync` has no download-to-disk path, so re-emitting 20–30 KB single-line cards
cannot be verified byte-identical afterwards, while the session that has them open can retire the label in
place at no transcription risk. Ask for it in §5 as **housekeeping, never a design change**; record it in
round 05's `SIGNOFF.md` as deferred, the way round 04's recorded it.

## Validation

`python3 scripts/workflow.py validate` after each state transition. Span 1 ends with the handoff committed
and the slice `pending`; nothing is signed until the operator returns and both read-back checks pass.
