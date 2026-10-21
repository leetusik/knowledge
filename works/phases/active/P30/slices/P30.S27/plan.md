# P30.S27 — Fidelity and functional sweep (qa)

## Goal

Sweep every P30 surface end to end, as the operator will walk it. It finds defects; it fixes nothing. Each
defect is written up so the orchestrator can cut an `F` slice. The surfaces:
- the reader: native and md chapters, loose documents, legacy html;
- figures, diagrams and quiz;
- annotations and bookmarks, the Notes sheet, the per-book list;
- the library and `/@{org}`, the book page, review;
- print;
- sign-in return.

## Read first

- **`works/phases/active/P30/topics/surface-slice-rules.md`**: the runtime, instruments and never-touch rules.
- `docs/current/operations.md` → `## Operator Runtime`: the viewports, devices and the true-viewport iframe
  harness.
- `docs/current/qa.md` → the regression checklist: P28's inner-scroller lines.
- `topics/notes-later.md`:
  - *Device checks* (D36 (7));
  - each surface slice's "as shipped" notes;
  - each slice's **Not verified** items, collected from `slices/P30.S13…S26/result.md`. Re-check the ones a
    browser can check: 150%/200% text zoom, reduced motion, Space on a collapsed callout's summary, the
    refused-finish revert, the long table's sticky header at large sizes, `prefers-color-scheme: dark` with
    the system theme, and print.
- `works/phases/active/P30/intent.md` → *Fidelity and functional sweep*.

## How

1. **Runtime:** a fresh scratch API and database with the fixture book plus enough extra content to reach
   every state: two books (codebase and subject), a KO/EN pair with an older translation, a chapter with
   two versions, a legacy html chapter, loose md and native documents, and a public org project for
   `/@{org}`.
   - Two accounts: a member, and another org's member for the visibility checks.
   - Run the dev clone and the production build, as in the rules.
   - **Never touch `:8766` or `:3030`, and stop only your own PIDs.**
2. **Instruments:** Aside `--account u1` for interaction; the true-viewport iframe harness, against the
   production build, for phone 390×844 and tablet 820×1180 / 1024×768; headless Chrome (a throwaway
   profile) for console, CSP, DPR 2 (`deviceScaleFactor: 2`), and the classic-scrollbar emulation where
   possible; CDP `Page.printToPDF` for print.
3. **Checklist** (record pass, fail or not-run for each, with evidence such as a screenshot path or a
   measured number):
   - every visible control on every surface does something;
   - resume position and progress survive a reload, signed in;
   - quiz results persist and show "your answer, vN" on return;
   - highlights, notes and bookmarks persist, re-anchor after a new version, and show Unanchored when the
     text is gone;
   - a review session rates, suspends, undoes and ends;
   - Clear this book and Clear all clear what they say;
   - **no inner scroller** on any chapter or legacy document: at DPR 2, with classic scrollbars, and across
     many width changes (P28's checklist lines). Exactly one scroller: the page for native, the frame for
     legacy;
   - signed out: Sign in to save everywhere, nothing written, and the sign-in round trip returns to the
     chapter and block;
   - another org's member sees only public content, and private content returns the constant not-found;
   - the CSP holds, with no console errors on any surface;
   - themes, sepia and text sizes 1, 3 and 5 on each surface;
   - keyboard reach across the reader chrome, the popover, the quiz and review ratings;
   - the device checks (D36 (7)) that a browser can emulate. **Physical-device items are recorded as
     operator-run**, for the gate walkthrough, never claimed.
4. **Defects:** for each, record the severity, the surface, steps to reproduce, the expected behaviour
   (with the signed-round reference) and the actual behaviour, plus evidence. Group them into suggested
   fix slices. Don't fix anything.

## Output

- `result.md`: verdict block first, then the checklist table, the defects with suggested `F` groupings,
  the operator-run device list, and the instruments used.
- `phase.md`:
  - one `## Doc impact` line: `qa.md`, the P30 regression lines to add to the checklist (full lines in
    `topics/doc-impact-detail.md` → *P30.S27*);
  - `## Now`.
- No source edits.

**Unattended run:** the operator is away. Report defects; don't decide them. Return `done` with the
defect list, even if it is long.

## Practical notes (from S13–S26)

- The web login limiter answers 429 after a handful of sign-ins in a few minutes, so reuse sessions.
- Server actions don't save from inside the iframe harness (Next's origin check). Use the harness for
  layout only, and do saves at the top level.
- Aside's console capture records nothing, so use CDP.
- The design canvases need the design tool's runtime and don't render standalone. Compare against the
  critics' rendered PNGs in each round folder and against the build prompts' numbers.
- Known open items already filed or recorded (D49, D50, D51, D41, D42, D45, D48, and the OQs in
  `topics/operator-questions-decided.md`) aren't new defects. Reference them instead of re-reporting.

## Dispatch

slice=P30.S27
phase=P30
kind=qa
risk=low
attempt=1
route=cheap
reason=kind qa rated low
tier=mid
subagent_type=slice-executor-mid
model=sonnet
pass_model=yes
effort=high
pass_effort=yes
attribution=Claude Sonnet 5.5
explore_model=haiku
explore_effort=high
