# P39-hk — notes-for-later-slices

_Entries moved here from phase.md by `phase-section --to-topic`, byte for byte, one `## ` block each; the pointer line left in each one's place names its block._

## Notes for later slices 12

- **(from S1, for S3)** What S3 inherits:
  - §1 *The shape* proposes the reader's questions, an optional Quiz, and an optional Next steps part that names open deferred jobs, unanswered questions and unbuilt decisions.
  - §4.2 and §4.5 still carry the fixed outline and Best practices, and §4 must say how Next steps is written.
  - §5 still has general mode's project slug (L~1900) and `--subject` (L~1936).

## Notes for later slices 13

- **(from S1, for S5)** What the route must do:
  - Accept the 16-line `## Explain` set: no `run:`, no `mode:`, a new `phases:`. Its confirmed-proposal check must not ask for the dropped fields.
  - Front-door step 2 still tests for v86 plus a `unit` line; bump it to the version that carries the new set.
  - Mirror the research block and the "research first" reply word.
  - S1 changed no heading (`topics/skill-headings.md`).

## Notes for later slices 5

- **(from DECOMP, for R1 and DECOMP2)** The grammar lives four places, changed together: `server/native/*` + `native_ingest.py`, their byte copies in `plugin/templates/kb/` (`plugin_parity.py`), the TS twin `web/src/lib/native/*`, and the shared `tests/fixtures/native/*` that `test_native_format.py` and `web/tests/native-conformance.test.ts` both read.

## Notes for later slices 6

- **(from DECOMP, for R1 and DECOMP2)** Annotations anchor by code-point offsets into the projection (`project.py` / `project.ts` `inlineText`): a `term:` link reuses the link node (already counted), inline math must count or skip consistently (`data-an-skip`, `data-an-len`), and `paint.ts` assumes static markup, so no client island inside a stamped paragraph.

## Notes for later slices 8

- **(from D1, for D1's return, R1 and DECOMP2)** Design job `10-reading-aids`, round `01-reading-aids`, published 2026-11-03 as version `1793661304-517d` at https://claude.ai/artifact/PndCPgBnCYWMR88qw7eApt (entry `Main.dc.html`). The record: `docs/reference/design/jobs/10-reading-aids/`, with the `## Build` in `rounds/01-reading-aids/result.md` and F1–F36 in `frame.md`.

## Notes for later slices 9

- **(from D1, for REVIEW)** Two workspace engine bugs, deferred-job candidates. (1) `design-preview` crashes writing `preview.json` when an issue excerpt cuts a math italic character in half; the workaround is `PYTHONIOENCODING=utf-8:backslashreplace`. (2) `design-sign` parses a multi-line `open_items:` list badly: D1's `SIGNOFF.md` lists the first item word by word, then the critique's C01–C08. The true list is in the round's `result.md`.

## Notes for later slices 10

- **(from D1, for REVIEW and the integration)** Published "here" on the operator's "accept. delete after the phase over." (2026-11-03): the Claude Code login cannot open the `kb` system, so `ds/kb/` went from the local cache (version `1792321604-e214`), not as a server-side copy. Delete canvas `PndCPgBnCYWMR88qw7eApt` once the phase is over (the operator said yes; confirm at the delete).

## Notes for later slices 14

- **(from S2, for S3)** §4's evidence rules, D7, §4.6 (a plain `## Sources {#sources-list}`) and §4.10 assume the evidence model. Still yours: §4.2 items 4 and 6 (best practices, "the pages you opened"), §4.5, and the prose bullets S2 only re-pointed (*Teach, don't report*, *Standalone*). Next steps reads `evidence.md`'s `## Open` (`O` ids); B5's checks go beside *Clarity*.

## Notes for later slices 15

- **(from S2, for S4)** B5 lists `with=dossier` only, so B6, B7, B8, B10 and B11 are unused and go with B1–B4; B12 stays while §5's curl form uses `--payload` (§3.2 writes it). §2's dossier paragraph still says "If D0b cannot write there" (§2 left untouched). The critic agent's frontmatter is already rewritten.

## Notes for later slices 16

- **(from S2, for S5)** Re-cite from `topics/skill-headings.md` (S2's rows); mirror `topics/evidence-model.md`: no `run.md`, probes or research agents; the critic block drops `scratch:` and returns `trace:` for `ledger:`; the review reads `## Gaps` for `gaps/final.md` and allows a write slice's `evidence.md` additions (D85-qk c); a book has no `summary.md`.

## Notes for later slices 18

- **(from R1, for DECOMP2 and the math render slice)** frame-G1's √ gap is Chromium's: 0.418em on the base glyph, less on tall radicands, 0 in WebKit and Firefox. Never ship the canvas's fixed −0.38em; the controller measures each `msqrt` after the fonts load. F24's paren-hugging Σ comes from an `lspace="0"` rule in the rebuild → topic §3

## Notes for later slices 19

- **(from R1, for DECOMP2 and the release slice)** Before deploying, scan the stored native sources once for ```` ```glossary ````, ```` ```formula ```` and `` $` ``. A hit means `syntax: 2` instead of the additive `syntax: 1` → topic §2

## Notes for later slices 20

- **(from R1, for the terms build slice)** paint puts `mark.an-m` inside the term's `<a>` (`paint.ts` L196), so the canvas's `mark.an-m .ra-term` becomes `.ra-term:has(> mark.an-m)`. A highlight over inline math leaves the formula unpainted, like a citation's `[n]`; that state is not drawn → topic §2, §5

## Notes for later slices 21

- **(from R1, for the skill §4 slice)** TeX in YAML goes in a block scalar or single quotes. A literal `$` beside a code span needs a space. `|` in a table cell is written `\lvert`. The glossary block is ```` ```glossary #glossary ````, after the quiz. A translation keeps term ids and TeX byte for byte → topic §2, §4, §6

## Notes for later slices 2

- **(from DECOMP, for S5)** The bootstrap boundary: S5 writes `package/` (mirroring the bootstrap `payload/`) plus `handoff-explain.md` in this phase folder, as P31 did; it reads the bootstrap repo at a pinned HEAD to quote text and never edits or commits there. The operator's bootstrap session applies it; `/update-workspace` brings it here.

## Notes for later slices 7

- **(from DECOMP, for S1–S5 and REVIEW)** Deferred overlap: `D86-sd` triggers at this phase's start and `D69` on the next §1 change; `D85-qk`'s items sit in S5's files. A rewrite that settles an item says so in `result.md`; never widen a slice for one. `D67`, `D72`, `D73`, `D76` and `D84-8s` concern machinery S2/S4 retire: the review lists them as close/drop candidates.

## Notes for later slices 15 (2)

- **(from R1, for DECOMP2)** Build cut: the grammar splits into (a) the glossary and `term:` links and (b) math (the TeX twin, the formula block, the translation 422s). Both are high (core invariant: the stored format and the projection offsets). The reader splits into (c) math rendering, high (the no-raw-HTML rebuild), and (d) terms, mid. The chain runs a → b → c → d → skill §4 → release, with no wave → [topics/glossary-and-math.md](topics/glossary-and-math.md) `## Build cut impact`

## Notes for later slices 4

- **(from DECOMP, for S1–S5)** The vendored route (`.claude/skills/create-phase`, `do-whole-phase` / `do-next-slice` `reference/explain-*.md`, `.claude/agents/slice-executor.md`) is never edited in this phase: P33-n3's citation check against it regresses from S1 on (expected; record the count, never chase it), and S5 re-cites from `topics/skill-headings.md`.

## Notes for later slices 1

- **(from DECOMP, for DECOMP2 and the reader build slices)** Merge risk: P36-1s (Hermes) builds a reader side panel on its own branch and touches `web/src/components/reader/annotations.tsx` and the reader page, so DECOMP2's reader slices will meet it at merge; keep their edits there small and located.
