# P40-2t.S1 — result

## Verdict

- **status:** done
- **route:** high
- **model:** opus
- **effort:** xhigh
- **summary:** Rewrote the plugin explain front door (change-list A1, A2, A4–A13): records-only, a no-code subject offered research first (declined only outside a git repository), `from=P<N>`, book kind `codebase|subject`, the research block verbatim from §3(a), the v96 + `**sources**` readiness test with both refusals naming v96, and "research first" handing over the block and the proposal so the confirmation comes back by itself (create-phase's *The research route*, **When it passes**) and still waits for the literal yes. The `.agents` and web copies were re-derived, and parity and cites pass. Found one cross-set hazard: a chained research phase's verbatim proposal trips the engine's fence-blind `## Explain` test (Notes).
- **files_changed:** `plugin/skills/explain/SKILL.md`, `.agents/skills/explain/SKILL.md`, `web/public/SKILL.md` (`plugin/agents/explain-critic.md` regenerated, byte-unchanged as expected)
- **validation:**
  - `python3 scripts/skills_parity.py --write-agents` then `python3 scripts/skills_parity.py`: PASS (no DESCRIPTION warning)
  - `python3 scripts/plugin_parity.py`: PASS
  - `uv run pytest tests/test_explain_resolver.py -q`: 2 passed
  - heading list vs `git show HEAD:plugin/skills/explain/SKILL.md`: identical text, 44 headings (line numbers shift because lines were added)
  - `python3 works/phases/active/P39-hk/package/checks/cites.py plugin/skills/explain/SKILL.md <fdb1151 create-phase/SKILL.md, explain-decomposition.md, explain-chapter.md, explain-review.md>`: 113 citations, 15 bold parts, missing 0 (baseline before the edit: the same)
  - `git status --porcelain .claude/`: empty
  - informational only: cites.py over S2's committed `explain-route.md` and `research-route.md`: 13/2, missing 0. Over S3's in-flight references: 101/14, missing 0
  - deferred: whole-tree (the full `uv run pytest -q`, the web typecheck/lint/test/build) → S6, REVIEW
- **deviations:**
  - The `argument-hint` gained `[from=P<N>]`. This follows from A4 and is plugin-frontmatter only.
  - The `.agents` copy keeps its own 4-line frontmatter, but its `description:` value was replaced by the plugin's new A1 description. They matched before, and `skills_parity.py` warns on a mismatch.
  - MODE's bullet keeps its bold opening and now reads **No code behind it: a subject**, so a cite of the change list's passage name still resolves. It was not renamed to "Subject mode".
  - Step 5 says one line not pinned in §3: a `from=` id that names no phase of this workspace is said so and dropped. This mirrors create-phase's *A confirmed proposal* `phases:` check.
  - Step 8 adds §3(c)'s `/do-whole-phases` rule (the confirmation goes in the closing report and nothing is parked), the same rule as S2's **When it passes**.
  - The heading check compared heading text, not `grep -n` output. Adding lines moves the line numbers.
- **doc_impact:** listed under notebook → Doc impact (in a wave, nothing was written to `phase.md`)
- **notebook:**
  - **Doc impact:**
    - product.md, decisions.md, qa.md (P40-2t.S1): the plugin explain front door is records-only. A subject with no code is offered research first and is declined only outside a git repository. It takes a new `from=P<N>` word, and a book's kind is `codebase|subject` (label). The research block gains `paths: … | none`, `sources:` and a chained `then:`. Readiness is workspace v96 plus create-phase's `**sources**` field, and both refusals name v96, so qa.md's v94 front-door checklist lines are stale.
  - **Decisions:**
    - Front door (S1): the subject case is MODE's **No code behind it: a subject**, with its bold opening kept. "Research first" hands create-phase the block and the proposal as last shown. `from=P<N>` reads that proposal back from the research phase's *Original Input* as the starting draft, and the redrawn confirmation's `Why:` says what changed → `slices/P40-2t.S1/result.md`.
  - **Notes for later slices:**
    - (from P40-2t.S1, for P40-2t.S5, P40-2t.S6) Parity recipe: the `.agents` copy is the plugin body after its frontmatter plus `.agents`' own 4-line frontmatter, with the `description:` line replaced by the plugin's. `web/public/SKILL.md` is a plain `cp`. Then run `skills_parity.py --write-agents`. At S1 everything was PASS and the critic agent was unchanged. cites.py over fdb1151's create-phase and the three references: missing 0. Heading text is identical (44). The skill is now 2,570 lines (was 2,492).
    - (from P40-2t.S1, for P40-2t.S6) Copy still saying the old front door: `plugin/README.md`'s intro (L10–15: "codebase-only", "declined", v94) as well as *Explain: flags and the one confirmation*. The new `argument-hint` adds `[from=P<N>]`. The A1 description is in the skill frontmatter, for `plugin.json` and `marketplace.json`.
    - (from P40-2t.S1, for P40-2t.S6, P40-2t.REVIEW) Hazard, to route: S2's research route writes the explain proposal as last shown verbatim under *Original Input*, and the proposal holds a `## Explain` line. fdb1151's `explain_phase()` (`workflow.py` L3877–3880) tests `line.strip() == "## Explain"` and ignores fences (P59-d8's intent.md already matches at its fenced L44). So a chained research phase reads as an explain phase (`explain_unit=`, the explain DECOMP, a detached host). The fix is outside S1's set: quote the proposal (`> ` on every line), or make the engine skip fenced lines.
  - **Operator Questions:** none.
  - **Now:** S1 landed. The front door is v96-ready and parity passes. S5 can start on the same four-file set. The `## Explain` hazard (Notes) needs a route.

## What changed, passage by passage

Every change is in `plugin/skills/explain/SKILL.md`, under existing headings and bold parts. The `.agents` copy has the same body, and the web copy is a byte copy.

| # | Passage | Change |
|---|---|---|
| A1 | frontmatter `description` | It covers a code change or "a subject a research phase covered", from the code and the records, "a research phase's findings included". It is records-only. A subject no phase covers, or one with no code, is offered research first, and the confirmation "comes back by itself when that research passes". It needs v96. `argument-hint` gains `[from=P<N>]`. |
| A2 | intro; *Every explain is an explain phase* | The subject case is added. "codebase-only … declined" becomes **records-only**, with research first for an uncovered subject. v94 becomes v96. |
| A4 | §1 **Arguments** | New `from=P<N>` → FROM: the research phase a chained explain is drawn from. *The research route*, **When it passes**, passes it, or the operator types it. It goes on `phases:`, and the proposal its `intent.md` recorded is the starting draft. |
| A5 | §1 MODE | "codebase-only" becomes records-only. **No code behind it: a subject** tells a subject from records alone (a covering research phase on `phases:`). With none, only "research first" is offered, with no code-alone yes. Outside a git repository it declines, with its own decline sentence. The "idea the code relies on" sentence stays for topic mode. "Both modes" becomes "All three". |
| A6 | §1 **A book** | Kind `codebase` or `subject`. `codebase` covers code that leans on outside basics. `subject` carries a display label, `kind subject: <label>`, which the publish carries (§5). The no-code decline is gone. |
| A7 | §1 COVERAGE, **None covers it**, the block | Coverage includes phases that *researched* the subject. A no-code subject has no paths and no commits. A research phase is found by its `intent.md` subject/`paths:` and its Decisions gists. `from=` names a covering phase outright. **None covers it** now covers both cases: the research runs at once, and its confirmation comes back by itself. The block is §3(a)'s, verbatim. One paragraph says how to fill `paths:`, `question:`, `then:` and `sources:`. It also says that *The research route* holds the per-source and privacy rules, and that its confirmation names the sources, where the operator's material is read, the extract's repository and whether it has a git remote. |
| A8 | step 2 | The test is v96, plus a `## The research route` that lists `**sources**`. The **No workspace** and **Too old** texts name v96, and the second is §3(e)'s text verbatim. |
| A9 | step 3 | The no-code refusal is dropped. **Outside a git repository** declines. The worktree and public-project refusals are kept. |
| A10 | step 5 | The cheap look for a no-code subject, and for any `from=`, reads the research phase's `## Decisions` gists and `topics/` headings. With no paths, the coverage runs no `git log` and greps the plain name. **With `from=P<N>`**, that phase is covering. Its proposal (*Original Input*) and its `then:` line (*Confirmed Intent*) are the starting draft, which is redrawn, and the `Why:` says what changed. |
| A11 | step 6 | `subject` may be "a subject a research phase covers". `phases` always includes a `from=` phase. A subject book is `(kind subject: <label>)`. "every subject is the repository's code" becomes: a subject explain needs no mark, since its `phases:` names the research phase. |
| A12 | step 7 | `Built by:` gets "built or researched", and "this <code \| subject>". The no-coverage paragraph has two forms: code (the research or the code-alone yes) and a no-code subject (research only). Both name the sources and say the confirmation comes back by itself. **A redrawn confirmation** puts what changed since the preview first in `Why:`. A book's stops line says research runs first when offered. |
| A13 | step 8, **On "research first"** | It hands over the request, the filled block and the proposal as last shown, verbatim. The explain's confirmation comes back by itself through create-phase's *The research route*, **When it passes** (`/knowledge:explain <subject> from=<P>`). It still waits for the literal yes. Headless prints it. `/do-whole-phases` reports it and parks nothing. A failed research shows nothing, and a "no" leaves its records. |

Left to S5, untouched: *The run, in one card* · *The evidence* (A3), §3, §4, §5 and §9, and Part B (A14–A22). `plugin/agents/explain-critic.md` was regenerated and is byte-identical.

## Pinned names, kept exactly

- create-phase's *The research route* and its bold part **When it passes**, each on one line, so a grep finds them: §1 **Arguments** and step 8.
- `from=P<N>` and `/knowledge:explain <subject> from=<P>`, as in S2's committed route.
- The readiness marker is the literal `**sources**` under `## The research route`.
- The block is copied byte for byte from change-list §3(a) and matches S2's committed `research-route.md` block.
- The bold runs the payload cites are unchanged: `**The shape`, `**The phases that cover the subject`. The front-door step numbers 1–8 are unchanged (create-phase cites steps 4–6 and 7).

## The hazard found (not in this set)

The chain has the research route write "the explain proposal as last shown" verbatim under the research phase's *Original Input (verbatim)* (§3(c), and S2's `research-route.md` step 2.2). That proposal contains its `## Explain` block. At `fdb1151`:

```python
def explain_phase(pdir: Path) -> bool:
    """True when the phase's intent.md carries the `## Explain` section (the explain route's only marker)."""
    ...
    return intent.is_file() and any(line.strip() == "## Explain" for line in intent.read_text(encoding="utf-8").split("\n"))
```

It ignores fences and indentation. P59-d8's own intent.md keeps its confirmation in a code fence with `## Explain` at L44, and that line matches already. That is harmless for an explain phase. For a research phase, `explain_phase()` would turn true:
- `next` would print `explain_unit=`;
- its DECOMP would follow the explain references;
- `parallel-start` would cut a detached host;
- `run-loop` would refuse it.

The plugin's step 4 grep (`^## Explain$`) would match too, but only if the phase is still live. A fix is outside S1's set, either way:
- the route writes the proposal as a blockquote (`> ` on every line), so no line strips to `## Explain`;
- or the engine skips fenced lines.

It is recorded in the notebook's Notes for the orchestrator to route.

## Reads

- `plan.md`, breakdown *Pins* and `## P40-2t.S1`, change-list §3–§5, intent *Confirmed Intent*.
- Read into the scratchpad from `fdb1151`: `create-phase/SKILL.md`, the three `explain-*.md` references, `payload/scripts/workflow.py` (for `explain_phase()`) and `tests/retrofit_smoke.sh`. The smoke suite pins none of the front door's text, so S1 has no literal list for S6.
- P59-d8's `intent.md` in arb_upbit_1, read only for the line positions of its fences and `## Explain`.
