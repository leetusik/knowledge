# P40-2t.S2 — result

- **status:** done
- **route:** mid
- **model:** opus
- **effort:** medium
- **summary:** Wrote the package's create-phase route texts (explain-route.md, research-route.md, started from fdb1151's text) implementing B1–B10, and patches/create-phase.md with five exactly-once finds (B11 plus the route replacement); the research route now carries the bold field list with the `**sources**` v96 marker, the per-source and eight privacy rules, the run-at-once confirmation and the new bold part **When it passes**.
- **files_changed:**
  - works/phases/active/P40-2t/package/claude/skills/create-phase/explain-route.md (new)
  - works/phases/active/P40-2t/package/claude/skills/create-phase/research-route.md (new)
  - works/phases/active/P40-2t/package/patches/create-phase.md (new)
  - works/phases/active/P40-2t/slices/P40-2t.S2/result.md (new)
- **validation:**
  - scratch finds check (P39-hk finds.py logic, `scratchpad/finds_s2.py`) over patches/create-phase.md against fdb1151's create-phase SKILL.md: finds checked=5 not-exactly-once=0 — PASS
  - scratch create-phase SKILL.md (`scratchpad/assemble_s2.py`: fdb1151 head + both route texts + the patch, apply.py logic): 50,448 B; headings in order (create-phase, Procedure, docs-phase, QA-sweep, loop, explain, research routes); `## The research route` (L224) lists `- **sources**:` (L241) and `**When it passes.**` (L310) — PASS
  - `python3 works/phases/active/P39-hk/package/checks/cites.py <git show HEAD:plugin/skills/explain/SKILL.md> explain-route.md research-route.md`: citations checked=13 bold parts checked=2 missing=0 — PASS
  - smoke-suite pins (`scratchpad/pins_s2.py`): all 61 `create_phase` literals of tests/retrofit_smoke.sh at fdb1151 hold on both the old and the new text — PASS (none removed or broken)
  - `python3 scripts/workflow.py validate` — passed (warnings pre-existing)
  - deferred: whole-tree (the patched smoke suite and apply.py run are S6's)
- **deviations:**
  - patches/create-phase.md also carries 1b (the *Who may invoke it* sentence "Every other phase … stops after creation") and 1d (step 5's run-on parenthetical), beside B11's two named passages: without them the core still says a research phase stops after creation, contradicting B7. And 1e, the route-replacement find (`## The explain route`), in P39-hk's form, so S6's apply.py can find it.
  - B8 is §3(a)'s rule text verbatim; its evidence asides ("P58-pm's form, now the rule", "(P58-pm re-opened 13)", "This is P58-pm's eight-item form…", "P8-x9's corpus rules") are left out of the shipped route, as history rather than rule.
  - B2: the old "no git repository" half of the dropped no-code refusal is not re-added in the route; the plugin front door declines outside a git repository (A9) and the workspace check already refuses there (§3(b)).
- **doc_impact:** none written (wave): see `notebook`.
- **notebook:**
  - **Doc impact:** `- product.md, decisions.md (P40-2t.S2): one request runs both phases — "research first" creates and runs at once a findings-only research phase (sources: code, web with a source beside each finding, or the operator's material under eight privacy rules); when it passes, the explain's confirmation, redrawn from the findings, appears by itself and waits for the literal yes; explain accepts a no-code subject a research phase covers; plugin floor 0.11.0 (create-phase routes, package for v96).`
  - **Notes for later slices:** `- **(from P40-2t.S2, for P40-2t.S6)** Smoke literals: S2's edit removes or breaks none of the 61 create_phase pins at fdb1151 (scratch check). "0.10.0" in create_phase now survives only in the legacy-proposal refusal ("older than 0.10.0"): retarget that pin to "0.11.0". New pins to add: "- **sources**:", "**When it passes.**", "**0.11.0 or later**", "at most 4 at once", "--depends-on none", "from=<P>", "kind subject: <label>". The core grows 40,523 → 50,448 B (no cap). Patch has 5 finds (1a–1e), 1e the route replacement.`
  - **Decisions:** `- create-phase package (S2): the research route runs at once on one confirmation (sources named; for operator material the landing repo and its git remote) in auto on the default stream; its bold part **When it passes** invokes /knowledge:explain <subject> from=<P>; the patch also edits *Who may invoke it* and step 5 so the core never says the research phase stops (patches/create-phase.md 1a–1e).`
  - **Operator Questions:** none.

## Detail

**Sources read.** `plan.md`; `topics/breakdown.md` (*Pins*, `## P40-2t.S2`); `topics/change-list.md` §3(a)–(e), §4, §5 Group B; `intent.md` *Confirmed Intent*; fdb1151's `payload/claude/skills/create-phase/SKILL.md` and `tests/retrofit_smoke.sh` (read by `git -C … show fdb1151:<path>` into the scratchpad); the plugin skill as committed (`git show HEAD:…`); P39-hk's package (`checks/`, `PATCHES.md` form).

**explain-route.md** (fdb1151 L127–223, edited): B1 — the opening says records only, a research phase's findings included, a no-code subject a research phase covers, "research first" for anything uncovered, floor 0.11.0. B2 — the no-code refusal is gone; plugin refusal "older than 0.11.0". B3 — `subject` adds the covered no-code subject; `phases` may be a research phase (always one for a no-code subject; `from=P<N>`); `book` kind `codebase|subject` with the `(kind subject: <label>)` form; "every subject is this repository's code" replaced; "research first" covers both cases, the only way on for a subject, and its confirmation returns by itself; `Built by:` gains the subject case. B4 — *A confirmed proposal* accepts "… or covered by a research phase on `phases:`", reads a carried-forward `from=` proposal the same way, and a legacy `mode: general` so covered as a subject explain. B5 — a book's DECOMP: D1 has no code for a subject; the outline pins recap lines, names, running examples, link ids; chapters declared (`--depends-on none`, the synthesis chapter on what it draws on); after the gate a wave of at most 4, citing `reference/explain-chapter.md`, *Chapters at once (a wave)*. The "research first" reply paragraph now says the proposal travels with the block.

**research-route.md** (rewritten from fdb1151 L225–248): the block of §3(a); B6's bold field list; B10's legacy-block sentence; the ordinary-phase paragraph, now naming it the explain's own research under the contract's explain-route exception; B7's steps 1–2 (one confirmation naming the sources, the extract's repository and its git remote; `new-phase`, `intent.md` with request, block, proposal, confirmation and reply verbatim, the `then:` line under *Confirmed Intent*; intake commit; `next` and `do-whole-phase` in `auto` on the default stream); B8's *What that DECOMP will cut* (corpus slice first, code/web/operator-material rules, the eight privacy rules, finding recording with `unsourced:` and plain-name gists for `paths: none`, reader-shaped findings, the research review's checks); B9's **When it passes** (after the recorded and merged pass, `/knowledge:explain <subject> from=<P>` via the Skill tool; redraw with `Why:`; literal yes; headless prints; `/do-whole-phases` reports and parks nothing; no pass shows nothing; a "no" leaves records). The "ask `/knowledge:explain` again" closing line is gone.

**Scratch files** (scratchpad `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/2d64ceca-9a02-4312-a9cd-5ec758f37364/scratchpad/`): `cp-base.md` (fdb1151), `cp-new.md` (assembled), `smoke.sh`, `skill-head.md`, `finds_s2.py`, `assemble_s2.py`, `pins_s2.py`.
