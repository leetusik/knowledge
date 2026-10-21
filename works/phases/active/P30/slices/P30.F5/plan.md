# P30.F5 — Reader chrome, as the operator decided at the walkthrough

## The operator's words (2026-10-21, verbatim; they amend the signed chrome rules)

> 1. when reading a article, it's very annoying to see up and down footer. stick it to bottom, and maybe add
> some drawer that user can biring while reading, so that the user can use the what footer have. and header
> bar, make it invisible when scrolling down, shows up when only user tries to tab the screen or up scrolling.

> 1. the bottom bar that comes up when I do even very slight scroll up. it's just super annoying. [pasted: the
> legacy reader's bottom chrome — Finished / Mark as unread / Print · new tab / Bookmark this position / the
> chapter bar] 2. it's not hid when I see in pc. it keeps follow the scroll. you may just fix like what I just
> said. the icon, < changple5 curriculum, Display got header I mean.

**This is an operator design decision, not a gap.** It supersedes the hide/show tables:
- `docs/reference/design/jobs/01-reader/rounds/02-revise/build-prompt.md` → *Behaviour* → *The chrome*,
  as built by S13 and S15;
- `docs/reference/design/jobs/09-legacy-and-print/rounds/01-legacy-and-print/build-prompt.md` → *Hide and
  show (the bottom chrome)*, whose rule "the top bar never hides" is gone, as built by S25.

Everything else about the bars (look, contents, focus, reduced motion, sheets) stays exactly as signed.

## The new rules (both readers, every width, desktop included)

**Top bar** (logo, back link, Display, the language switch):
- **Hide** when the page scrolls **down** (S13's accumulated-run logic; the existing > 4 px threshold is
  fine).
- **Show** only on:
  - a **tap or click on the page**: the existing toggle exemptions apply (links, buttons, summaries, code,
    tables, focusable regions, inputs, labels, or while text is selected);
  - a **deliberate scroll up**: an accumulated upward run of at least **64 px** (CSS px of the page or of the
    legacy document) within one gesture, so end-of-flick bounce and tiny nudges never trigger it;
  - being at the very top (under 48 px).
- The existing *ignore* (450 ms after the reader's own scrolls, a sheet open) and *show while focused*
  rules stay.

**Bottom chrome** (the native chapter bar; the legacy document bar plus chapter bar):
- **Never shown by scrolling up.**
- **Shown** when the reader reaches the **end** (within 4 px of the bottom / `f ≥ 0.995`), and it stays shown
  at the end until the reader scrolls back up past it.
- **Shown** by a **tap or click on the page** (the same toggle as the top bar, so one tap brings both, and
  this is the "drawer the user can bring"). It is also shown at the very top, on opening.
- **Hidden** again by scrolling down, unless held at the end.
- The top bar and bottom chrome no longer have to move together. A deliberate scroll up brings the top bar
  only.
- Native: the resume pill follows the top bar's visibility, as before.

## Legacy taps (the bridge)

The sandboxed frame reports no taps today. Extend S25's bridge (`web/src/lib/legacy/bridge.ts`, injected by
both raw relays) to post a `tap` message on a click or tap inside the document, except on interactive
elements (`a`, `button`, `input`, `select`, `textarea`, `label`, `summary`, `[contenteditable]`, `[tabindex]`,
or while text is selected).
- The parent validates it exactly like the other messages: `event.source === frame.contentWindow`, the
  strict schema and the size cap. Add it to `messages.ts` and its tests.
- Keep the bridge under its 2 KB test cap.
- The bridge must also report enough to measure a 64 px upward run in the document: it can send `scrollY`
  as well as the fraction, or the parent derives px from the fraction × the document height it already
  receives. Pick the smaller change.

## Where

- Native: `web/src/lib/reader/chrome.ts` (`stepChrome` and the pure rules) and
  `web/src/components/reader/reader-frame.tsx`.
- Legacy: `web/src/components/reader/legacy-reader.tsx`, `use-legacy-reading.ts`, `web/src/lib/legacy/`.
- Keep the rules pure and update their unit tests (`web/tests/reader-chrome.test.ts`, the legacy bridge
  tests). These are core behaviour now, so test:
  - a 12 px or 30 px upward nudge shows nothing;
  - a 64 px or larger upward run shows the top bar only;
  - a tap toggles both;
  - the end shows the bottom;
  - a scroll down hides both, except the bottom held at the end.

## Verify (live)

`topics/surface-slice-rules.md` runtime: a scratch stack, the production build, never `:8766` or `:3030`,
stop only your own PIDs, and one sign-in (the limiter answers 429).

Check, on a native chapter and on a legacy html chapter, at 1440 (desktop) and at true 390 and 820
viewports:
- a slow small scroll up shows nothing;
- a deliberate scroll up shows the top bar only;
- a click or tap on the text brings both bars;
- scrolling down hides them;
- the end shows the bottom bar and it stays;
- the desktop top bar hides;
- keyboard focus still reveals a hidden bar;
- no console or CSP errors.

Record numbers (scroll deltas, which bar was visible) in `result.md`.

## Notebook

- `phase.md`:
  - a Decisions line, "Reader chrome rules amended by the operator at the walkthrough (P30.F5)", citing the
    words above;
  - one Doc impact line: `frontend.md`, the chrome rules for both readers, plus a note that the signed
    rounds' hide/show tables are superseded by the operator's decision;
  - `## Now`.
- `result.md`: verdict block first.

## Dispatch

slice=P30.F5
phase=P30
kind=fix
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
