# P39-hk.DECOMP2 — cut the build: glossary and formulas, from the signed canvas and R1

## Context

P39-hk runs `build-after`, and everything the build needs has landed:
- **D1 is signed**: the operator said "accept" to `10-reading-aids/01-reading-aids`, canvas version `1793661304-517d`. The build contract is in the round's `## Build` (`docs/reference/design/jobs/10-reading-aids/rounds/01-reading-aids/result.md`).
- **R1 settled the approach** (`topics/glossary-and-math.md`):
  - a `glossary` block with `term:` links;
  - inline `` $`…`$ `` and a `formula` block;
  - Temml MathML rebuilt through an allowlist;
  - a TeX allowlist validator twinned in Python and TypeScript;
  - one `TermLayer` for the term window;
  - translation 422s.

  R1 also proposed the build cut: a chain (a) glossary grammar → (b) math grammar → (c) math rendering → (d) terms in the reader → skill §4 → release.
- **S1–S5 are done.** The skill side of the explain is rewritten, and the bootstrap package is written.

This slice cuts the remaining build slices. It writes no product code.

## The executor's job (high row, kind decomposition)

Read:
- `intent.md` whole;
- `phase.md` through `phase-section` only (Decisions, Notes for later slices, Operator Questions, Now);
- `topics/breakdown.md` (`## Build inventory`, `## P39-hk.DECOMP2`);
- `topics/glossary-and-math.md` (all of it, `## Build cut impact` first);
- `topics/notes-for-later-slices.md`: the blocks for DECOMP2, the build slices, the skill §4 slice and the release slice;
- the D1 round's `result.md` (`## Build`) and `frame.md` F1–F36;
- `design-cowork/reference/build.md` (RESPECT THE DESIGN, the fidelity sweep, Claude in Chrome).

Then:

1. **Cut the build slices with `new-slice`** as bare folders. Never pre-fill a `plan.md`. Give each `--kind implementation`, `--risk`, `--order` and `--depends-on`. The starting shape is R1's, which the executor may refine from the code:
   - **B1, (a) the glossary and `term:` links:**
     - the `glossary` block, its own term-id namespace, `ref-missing-term` / `ref-scheme`, and the search projection;
     - it lands in all four places at once: `server/native/*` + `server/native_ingest.py`, the `plugin/templates/kb/server/` byte copies, the TS twin `web/src/lib/native/*`, and the shared `tests/fixtures/native/*`.
     - Risk **high**, trigger **core invariant**: the stored chapter format and the annotation projection offsets.
   - **B2, (b) math grammar:**
     - inline `` $`…`$ `` as a `data-an-len` atom, and the `formula` block (`tex`, `alt`, `reading`, `where`, `formula-legend`);
     - the TeX allowlist twin `server/native/tex.py` ↔ `web/src/lib/native/tex.ts`, with `tests/fixtures/native/tex-allowlist.tsv`;
     - the translation 422s `translation-term-ids` and `translation-math`;
     - the four places again.
     - Risk **high**, trigger **core invariant**. Depends on B1.
   - **B3, (c) math rendering, reader and print, to the signed canvas:**
     - `temml`, pinned exactly;
     - `mathml.ts`, the rebuild allowlist;
     - inline, formula and legend markup, and `FormulaBox`;
     - STIX Two Math vendored, with its OFL licence and a README line;
     - screen and paper math CSS;
     - Chromium's √ gap corrected per instance, never by the canvas's fixed −0.38em.
     - Risk **high**, trigger **core invariant**: the renderer's no-raw-HTML guarantee. Depends on B2.
   - **B4, (d) terms, reader and print, to the signed canvas:**
     - `planTerms`, the markers and the hidden windows;
     - the desktop window and the phone bottom sheet (`.ra-sheet`);
     - the glossary section (A–Z, after the quiz, before the sources) and its way back;
     - `TermLayer`, and the 3-line `annotations.tsx` touch;
     - the paper glossary appendix.
     - Risk `low`, no trigger: R1 §5 pins the wiring. Depends on B3, since both edit `render.tsx` and the windows carry inline math.
   - **B5, the skill's §4 grammar text:**
     - the glossary, `term:` links, inline math and the `formula` block;
     - R1's YAML, `$` and `|` gotchas, and the translation keep-list;
     - replace S3's "until then" clauses in §4 and B5;
     - fit the glossary into §4.2's list;
     - the critic flags jargon left unlinked on first use;
     - the three copies, plus the critic's agent body via `--write-agents`.
     - Risk `low`. It depends on B2, which fixes the grammar. Its set (the plugin skill and its copies) is disjoint from B3/B4's `web/` reader files, so **declare it to run beside B3/B4** if the sets truly are disjoint. Otherwise chain it.
   - **B6, the release:**
     - `plugin.json` 0.10.0, with the release notes in `plugin/README.md` and the commit;
     - setup's `plugin_version`;
     - `content.ts`'s skill line count;
     - `marketplace.json`;
     - the plugin front-door readiness test becomes workspace **v92** plus a `**phases**` field (S5's handshake);
     - the stored-native-sources scan before deploy, as a checklist line in the release notes, never a slice.
     - The slice does **not** push. Risk `low`. Depends on B1–B5.
2. **Real-browser verification:**
   - B3 and B4 verify in a real browser through Claude in Chrome, per `## Operator Runtime` (the operations doc) and its recorded `deviceId`, never another browser.
   - The executor checks that section now. If it is absent or `UNFILLED`, say so in the breakdown and a Note: those slices will return `needs_operator`.
   - B3 and B4 also run the fidelity sweep against the signed boards (RESPECT THE DESIGN: never drop, simplify, restyle or "improve" a signed element).
3. **Rate risk by the named triggers**, as above. Put **`spends money: no`** on every slice (temml and the font are free).
4. **Rewrite `topics/breakdown.md` in place.**
   - Each done slice keeps a one-line block.
   - Update `## Passes` (add DECOMP2) and `## Estimate`, timed from `dispatch-summary`'s `means`.
   - Update `## Build inventory` from R1: the temml dependency, the font, the stored-source scan.
   - Add one `## <slice id>` block per new slice, each with goal, set, risk and trigger, `spends money:` and depends on. Each **set** lists every file the slice may touch, including tests, fixtures, template copies, the lockfile and vendored font files.
   - Keep `## Join-rebuilt artifact`: none, unless the survey finds one (e.g. `pnpm-lock.yaml` if two slices add dependencies; only B3 does).
5. **Record in `phase.md`** through `phase-section`, as gist lines:
   - `## Decisions`: one `Breakdown (DECOMP2): …` line linking the topic. Decisions is at ~11.2 of 12 KB, so first move the long D1 sign-off entry (entry 5) or older entries to `topics/decisions.md` with `--to-topic decisions --entry K`.
   - `## Notes for later slices`:
     - remove the notes this pass consumed, the ones "for DECOMP2" (R1's build-cut note and the DECOMP grammar notes), only once their content is in the breakdown blocks;
     - keep the ones for the build, skill §4, release and REVIEW slices;
     - add one for REVIEW: the `kb` Design System Artifact should be re-synced after B3/B4 land, per design-cowork `reference/system.md`, but this login cannot open it. A deferred-job candidate, not a slice.
   - `## Now`.
   - Leave OQ7 (inline spoken text) and OQ8 (release order) open. B3 builds on R1's OQ7 recommendation; OQ8 bears on the integration, not on any slice.
6. **Declare every middle slice.** Return the `parallel:` line.
7. **Never** run `accept-gate` (already required), commit, or move phase state beyond the decomposition carve-out.

## After the executor returns (orchestrator)

1. `record-dispatch`, then `finish-slice P39-hk.DECOMP2` (it refuses an undeclared slice).
2. `validate`, then commit `chore(P39-hk): P39-hk.DECOMP2 cut the build …`.
3. Report the cut and the `parallel:` line, then run B1 → … → B6 in the auto loop (plans inline, waves where declared) through to REVIEW, where the acceptance gate opens.

## Verification

- `python3 scripts/workflow.py validate` passes, and `phase-section P39-hk` is under budget.
- `finish-slice` accepts the declarations.
- `topics/breakdown.md` has every required section, and every new slice carries `spends money:`, a risk with any trigger named, and a full set.
- No `plan.md` is pre-filled. Nothing outside `works/phases/active/P39-hk/` and the regenerated `works/` files changes.

## Dispatch

route=high
reason=kind decomposition
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
