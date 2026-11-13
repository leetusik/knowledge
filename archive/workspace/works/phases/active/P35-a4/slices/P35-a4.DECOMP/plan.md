# P35-a4.DECOMP — plan

slice: P35-a4.DECOMP · kind: decomposition · phase: Explain documents: about the subject, standalone

## Context

The operator wants explain documents to be about their subject. Phase, slice and deferred ids appear at most as a small mark like "(P30)", and every document stands alone without depending on links. The confirmed intent and every clarification are in `works/phases/active/P35-a4/intent.md`. Read it first: it is the record, and this plan does not restate it.

Two decisions made at `/do-whole-phase` shape the cut:

1. **This phase changes the plugin only, in this repo.** The workspace's copies (`.claude/skills/**`, which are byte-identical to the workflow repo's payload) are **out of scope**. When this phase is done, a separate phase in the workflow repo removes the rules it restates and leaves pointers to the plugin.
2. **From then on, a change to how documents are written is made here alone.** So this phase keeps every plugin `§`-number and heading stable, because the workflow cites them by number and heading. Each new rule is written in full in the plugin, so the workflow can point at it without repeating it.

Evidence of the problem: `works/phases/active/P32/rehearsal/r1/dossiers/c-new/body.md`
- L156: "The P24.S1 result adds that…"
- L173: "the P24.S1 result, say writers…"
- L177: "P31.S1 moved that code verbatim"

In each, a work record or a slice is the subject of the sentence. L173 also leans on "`architecture.md` says", a repo doc cited where the explanation should be.

## The executor's job (high row, by kind)

Cut the phase's middle slices as bare folders with `new-slice`, write `topics/breakdown.md`, and add gist lines to `phase.md` through `phase-section`, following `.claude/skills/do-whole-phase/reference/decomposition.md`. Do not write any slice's `plan.md`, and do not edit the plugin.

**Not an explain phase:** `intent.md` has no `## Explain` section, so `reference/explain-decomposition.md` does not apply. It is also not a design phase, so it has no `## Design Style`.

### What the slices must cover

Locate the passages yourself (Explore is fine); the list below says where to look.

**1. The subject, not the records.**
- **§1 Change mode and placement, and the front door's confirmation:**
  - phase and slice book and chapter **titles** say what they explain, with the id at most a small mark;
  - slugs and keys (`p<N>`, `s1`) are internal and may stay.
- **§3.1 D0 brief and §3.10 D6 outline:**
  - for a phase or slice subject, the reader's path follows the system's ideas and flow, never slice order;
  - work records (`intent.md`, the notebook, `result.md`, deferred jobs) are evidence, never the subject or the structure.
- **§4 prose rules (*Teach, don't report*):**
  - a workflow id is never a sentence's subject and never in a heading;
  - at most a parenthetical mark;
  - no deferred ids: say what is still open in plain words.
- **B8's attributed form for rung-1 sources** is what produces "the P24.S1 result says". Give work records a plain-words attribution ("the notes from the change that introduced it") or the small mark.

**2. Standalone.** Covers §4 and §4.2, plus B5, the critic's *Order and prerequisites*.
- No sentence depends on opening a link, source, file or other document: an idea the reader needs is explained in place.
- Citations and sources stay as evidence.
- A repo path is fine as a code block's title, but never "see X §4" in place of explaining.
- **Book chapters too:** a short recap of an earlier chapter's idea instead of "see chapter 2". A `chapter:` link may be added as an extra.
- This **reverses** B5's "re-teaching an earlier chapter instead of linking it" should-fix (§4.10 and B5's rubric): leaning on a link becomes the fault, and only long re-teaching stays one.

**3. The critic enforces both.**
- B5's *How you check* and *The rubric* gain checks for ids as subject or structure, and for link-dependence.
- Keep the existing categories (`reader`, `clarity`, `order`) unless a new one is truly needed.
- Set each check's severity from intent: a document organised by slices, or one the reader cannot follow without opening a link, fails the reader.

**4. The release.**
- The canonical file has shipped copies, held by `scripts/skills_parity.py` (CI: `.github/workflows/plugin-ci.yml`): `.agents/skills/explain/SKILL.md` (body byte-identical) and `web/public/SKILL.md` (full file).
- `plugin/agents/*.md` bodies are generated from Part B: edit Part B, then run `python3 scripts/skills_parity.py --write-agents`.
- Version bump to **0.8.0** in `plugin/.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`.
- `plugin/README.md` and the root `README.md`, only where they restate a changed rule.
- The landing's line count: `web/src/content/marketing/content.ts` (FEATURE_SKILL lede, "2,729-line").
- Precedent: commit `ed9e2b2d` (the 0.7.0 release).
- `python3 scripts/plugin_parity.py` and `skills_parity.py` must pass.

**Out of scope** (say so in the breakdown):
- `.claude/skills/**`, which is the workflow repo's phase;
- `.claude/skills/explain/`, the vendored copy, deferred as D79-we;
- `docs/current/`;
- re-explaining published documents.

### Shape, risk, cost (a suggestion; the decomposition decides)

- **About two slices, chained:**
  - **S1:** the rules in the canonical `SKILL.md` (§1, §3.1, §3.10, §4, §4.2, §4.10, B5, B8 where needed), its two copies and the regenerated agents;
  - **S2:** the release, depending on S1 (version, marketplace, READMEs, landing count, both parity checks).
  - One slice is fine if the set stays small.
- **Kind and risk:** `implementation`, rated `low` (mid row). The intent pins the approach, so no high trigger applies unless your reading finds one: name it if so.
- **Money:** `spends money: no` on each slice.
- **Sets:** the declared set lists every file, the generated agent files included. `web/public/SKILL.md` and `content.ts` go to whichever slice regenerates or edits them.
- **Doc impact:** each slice that changes durable truth (the explain skill's writing rules, plugin 0.8.0) leaves one `## Doc impact` line in `phase.md`.
- **Tests:** none beyond the existing parity checks (the contract's tiny-tests rule).
- **Estimate:** from `python3 scripts/workflow.py dispatch-summary`'s `means` block.

### The review's check (write it into the breakdown for `REVIEW`)

The review dispatches the plugin's `knowledge:explain-critic` once, against the new rubric (S1's regenerated `plugin/agents/explain-critic.md`), over the old draft `works/phases/active/P32/rehearsal/r1/dossiers/c-new/body.md`, with its dossier. It confirms that the L156, L173 and L177 passages are now findings. If an id-heavy sample turns out not to exist in a form the critic can judge, it reads the passages against the new rule text instead.

It also confirms:
- no `§` number or heading changed (diff the heading lines);
- both parity checks pass;
- nothing under `.claude/skills/` changed.

### Acceptance gate (the orchestrator declares it after `finish-slice`)

Recommended: `--waive --note "plugin instruction text only: the effect shows in the next explain run; /SKILL.md and the landing count change on the operator's push and web deploy"`. Say in the verdict if you see an operator-visible surface that argues for `--require`.

## Return

`done` once the slices are cut and declared, with:
- `topics/breakdown.md` (`## Passes`, `## Estimate`, one `## <slice id>` block per slice with goal, set, risk and trigger, `spends money:` and depends on);
- a `Breakdown (DECOMP): …` gist line under `## Decisions`;
- `## Now` updated;
- `parallel:` from `parallel-plan`.

`needs_operator` only for a question the intent does not answer, written to `## Operator Questions`.

## After the phase (the orchestrator, not this slice)

Once `P35-a4.REVIEW` passes:
1. Propose the workflow-repo phase's name and objective to the operator: remove the restated explain writing, placement and linking rules from the workflow's explain references and `create-phase`, leaving pointers to the plugin; release as a new workflow version.
2. On their yes, create it there through `create-phase`, then stop.
3. Never push. The plugin takes effect after the operator's push and `/plugin update`.

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
