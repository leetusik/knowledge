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

- **(from R1, for DECOMP2)** Build cut: the grammar splits into (a) the glossary and `term:` links and (b) math (the TeX twin, the formula block, the translation 422s). Both are high (core invariant: the stored format and the projection offsets). The reader splits into (c) math rendering, high (the no-raw-HTML rebuild), and (d) terms, mid. The chain runs a → b → c → d → skill §4 → release, with no wave → [topics/glossary-and-math.md](glossary-and-math.md) `## Build cut impact`

## Notes for later slices 4

- **(from DECOMP, for S1–S5)** The vendored route (`.claude/skills/create-phase`, `do-whole-phase` / `do-next-slice` `reference/explain-*.md`, `.claude/agents/slice-executor.md`) is never edited in this phase: P33-n3's citation check against it regresses from S1 on (expected; record the count, never chase it), and S5 re-cites from `topics/skill-headings.md`.

## Notes for later slices 1

- **(from DECOMP, for DECOMP2 and the reader build slices)** Merge risk: P36-1s (Hermes) builds a reader side panel on its own branch and touches `web/src/components/reader/annotations.tsx` and the reader page, so DECOMP2's reader slices will meet it at merge; keep their edits there small and located.

## Notes for later slices 16 (2)

- **(from S5, for DECOMP2's release slice)** The plugin side of the handshake (handoff-explain.md §4): front-door step 2 must test `workspace_version` **92 or later** and a create-phase `## The explain route` listing `**phases**` (today: 86 and `**unit**`), its two refusal texts naming v92. Every "v86 or later" moves to v92: SKILL.md L3, L25 and step 2 (L283–L294); plugin README L15, L46; setup SKILL L170, L461; plugin.json and marketplace.json descriptions; root README L37; the KB template page L71. The workspace floor is plugin 0.10.0. Release order: the bootstrap's v92 on GitHub first, then the P39-hk merge and push (OQ8). If the skill §4 slice moves a heading the package cites, re-run `package/checks/cites.py`.

## Notes for later slices 10 (2)

- **(from S3, for P39-hk.S10)** §4 *Formulas that look good* ends "The inline and display forms are in §4.4 once the reader supports them; until then …", and B5 *A bare symbol string* has the same "until" clause: replace both with the forms, add them to §4.4, and slot the glossary into §4.2's list (Quiz is item 4, before Sources).

## Notes for later slices 11

- **(from S4, for P39-hk.S11)** Still owed at 0.10.0: `web/src/content/marketing/content.ts` L251 and L261 say "3,347" lines (the skill is 2,368 at S4; recount after the skill §4 slice); `plugin_version` 0.9.1 in setup L342/L356; the version in `plugin.json`; the 0.10.0 release notes in `plugin/README.md`.

## Notes for later slices 13 (2)

- **(from S5, for REVIEW)** The bootstrap package is ready for the operator's bootstrap session: `package/` and `handoff-explain.md`, re-checkable with `package/checks/` (finds 18 of 18 once at `bb525b9`; the patched smoke explain block passes on a scratch copy; citations 218, missing 0). The merge must not be pushed before the bootstrap's v92 is on GitHub (OQ8). D85-qk (a)–(d) are settled in it, (e)–(f) stay open.

## Notes for later slices 16 (3)

- **(from DECOMP2, for REVIEW)** After S9, the orchestrator runs `design-canvas 10-reading-aids --implemented`. The `kb` Design System re-sync from code (design-cowork `reference/system.md`) cannot run on this login: list it as a deferred-job candidate. The gate listens to one formula with VoiceOver (R1 §3: `alttext` alone or plus `aria-label`; OQ7).

## Notes for later slices 17

- **(from S6, for P39-hk.S9)** A term link is a plain `link`, `href: "term:<id>"` (`parseRef` → `{kind:"term", id}`; `resolveLink` → missing today). The block is `{type:"glossary", id, terms:[GlossaryTerm]}` (`tree.ts`); `typed()` draws nothing, so `#glossary` has no target yet; `notes-load.ts` `nameOf` calls it an untitled "Section".

## Notes for later slices 18 (2)

- **(from S6, for P39-hk.S10)** The exact grammar is `server/native/README.md` *The glossary*, *Limits*, *Ids*, *References*. Mind: `aliases` omitted or 1–8, never `[]`; a numeric term quoted (`"429"`); no `term:` link in a definition.

## Notes for later slices 13 (3)

- **(from F1–F3, for REVIEW)** Re-run the matrix from `scratchpad/f2/` (F2's result, *Stack as run*): `matrix3.sh`, with `oq.mjs`, `pix3.mjs` (identity net of noise) and `lay2.mjs`. F3's are in `scratchpad/f3/`: `wide.mjs` (page width), `ctl.mjs` (controls), `book2.mjs`, `past.mjs` and `pastpix.mjs` (round 2). One CDP session at a time. 320 at 200% is now 320 on reading-aids, write-lock, the loose note and the book page; 342 on all-blocks (top bar, OQ21). [F3 result](../slices/P39-hk.F3/result.md)

## Notes for later slices 11 (2)

- **(from S9, for REVIEW)** Left to the gate: a member's real highlight on a term (F2's ink line; S9 checked only an injected `mark.an-m`, signed out) and its note popover beside a window; the phone sheet on a real iPhone Safari (fixed inside the `rd` container; WebKit 284945 / 286237); VoiceOver on the window and sheet. No frame file changed, so no P36-1s merge note. Stack and states: [S9 result](../slices/P39-hk.S9/result.md) § Live sweep

## Notes for later slices 9 (2)

- **(from S8, for REVIEW)** Verification chapter `tests/fixtures/book/reading-aids.{en,ko}.md` (`reading-aids`, position 4; fresh-state ids 5/6, loose note 7). Stack and instruments as run (viewport harness on the standalone build; CDP for paper and AX): [S8 result](../slices/P39-hk.S8/result.md) § Stack as run. Re-publishing ko on a scratch API with history needs `translated_from` at en's current version.

## Notes for later slices 14 (2)

- **(from F4, for REVIEW)** Signed-in checks with no credential in the browser: `scratchpad/f4/member_proxy.py <listen> <target>` signs the member in by script and adds the session cookie per request (hydrates on a standalone build only). The math-heading chapter is `f4/make_chapter.py` + `publish_math.py`; highlights by HTTP in `seed.py`, `seed2.py`. Recipe: [F4 result](../slices/P39-hk.F4/result.md) § Stack as run.

## Notes for later slices 12 (2)

- **(from S11, for REVIEW and the integration)** Release gate at S11 green: pytest 183 passed/60 skipped, vitest 583/40 files, lint, typecheck, build all pass ([S11 result](../slices/P39-hk.S11/result.md)). Not pushed or tagged: OQ8 order stands (bootstrap v92 pushed first, then this merge and push, then `/update-workspace`).
