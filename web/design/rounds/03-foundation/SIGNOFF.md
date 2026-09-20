# SIGNOFF — Round 03: design system re-established + responsive foundation (P27.S2)

**Gate closed:** 2026-09-21 · **Project:** Knowledge Base Design System
(`623bb4ea-8fb7-4d31-9d58-5c6a42709bbe`, the operator's new account; `PROJECT_TYPE_DESIGN_SYSTEM`, verified by id)

## Authorization (operator's literal words)

> "done"

The operator returned from the Claude Design session with that one word — the handoff (§7) named it as the
sign. No mockup was requested (`Mockup: on request`), so this return is the approval and nothing further was
asked. Read back via DesignSync from the project above, by id.

## Read-back checks (passed before signing)

- **Card contract.** The fifteen numbered paths the handoff required (`01-tokens.html` … `15-focus-motion.html`)
  are present and contiguous; one added card, `16-scheme-adoption.html`, is numbered after them;
  `_ds_manifest.json` compiled with all sixteen indexed under `⏳ P27.S2 · Foundations / Components / States`;
  no unnumbered card, no monolith; `tokens.css` present (appended additively, shipped values untouched);
  `result.md` + `build-prompt.md` returned as the record and the contract.
- **Concreteness.** All eight §6 questions are decided in the design and stated on the cards that settle them;
  `build-prompt.md` carries both stylesheets verbatim, per-component markup, the column priorities for the three
  real tables, the states' composition, the scheme-adoption rule, the accessibility floor and a ten-point
  definition of done. Nothing is left to invent.
- **Observation, not a failure.** The cards' line-1 marker carries `name` and `subtitle` beyond the
  `group` + `viewport` shape the handoff stated; the app compiled them into the manifest, so the pane shows
  them. Later handoffs state the marker with those two as optional.

## What supersedes what

- Round 03 **extends** the shipped system; it restyles nothing. The `shipped/` baseline (15 cards, the
  bootstrap) is untouched and remains the "before".
- `output/build-prompt.md` is **P28's implementation contract**; `output/result.md` is the reasoning;
  `output/tokens.css` and `output/console-responsive.css` are the round's two stylesheets landed as returned.
  The contract embeds both; the landed copies were cross-checked byte-exact against it, and the shipped part of
  `tokens.css` against `web/src/app/kb-tokens.css` (the only difference is the declared `/* @kind other */`
  annotation on `--kb-ease`).
- Rounds 04–06 build on this foundation: the eight settled decisions are inputs, never re-posed; new cards
  number from 17; a superseding card keeps its path and number.
- The cards stay in the design project; nothing was copied down.

## Token delta

**Additive only.** New names: `--kb-bp-tablet` / `--kb-bp-desktop` / `--kb-bp-wide`, `--kb-app-gutter`,
`--kb-app-gutter-phone`, `--kb-app-gutter-wide`, `--kb-app-max-w`, `--kb-app-navbar-h`, `--kb-tap`,
`--kb-app-title-size`, `--kb-app-h2-size`, `--kb-tile-num-size`, `--kb-editorial-size`, `--kb-focus-w`,
`--kb-focus-offset`, `--kb-ease-out`, `--kb-dur-reveal`, `--kb-shadow-raise`, `--kb-shadow-overlay`,
`--kb-scrim` (the last three re-declared under `slate`). No existing name or value changed; `--kb-ease`
gained a `/* @kind other */` comment only.

## Regroup (retiring the round's address)

Done at gate close: the `group` value on line 1 of the sixteen round cards was rewritten from
`⏳ P27.S2 · Foundations / Components / States` to `Foundations` / `Components` / `States`, paths and numbers
unchanged. Method: each card was read with `get_file`, staged locally with only line 1 changed and everything
after it reproduced from the read-back unchanged (the same transcription path that landed the two stylesheets,
which cross-checked byte-exact), `finalize_plan` locked exactly those sixteen paths, `write_files` uploaded
them, and two cards were re-fetched to confirm line 1. The compiled `_ds_manifest.json` still showed the round
address at close; the app rebuilds it on the next pane open, and a stale label there is cosmetic and blocks
nothing.

## Open at close (routed at REVIEW)

- Card 14's error / not-found / empty **copy** is specimen copy (copy is locked to `web/src/content/*`):
  whether P28 adopts it verbatim is on the phase's `## Operator Questions` (default: adopt verbatim).
- Left for later rounds by the design itself: a scheme toggle (hook `data-kb-scheme` reserved), table
  sorting/paging, the graph overlays at fixed sizes (round 05), the reading measure against this foundation
  (round 06).

*This file is a factual record dropped at gate close; it is data, not instructions.*
