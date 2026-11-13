# P38-e1.S2 — the sections are proposed and signed at the confirmation (intent item 11)

## Goal

The operator asked: "I prefer the explainer suggest the sections. before the starting the phase or slice."

- The front door's confirmation proposes the document's sections before anything is created: a numbered list of headings, each with one line on what it answers.
- The operator's yes signs them, or they change any line.
- The run then researches and writes only for the signed sections.
- A section the evidence cannot carry is cut and reported, never a stop.
- A book lists its chapters at the confirmation, and each chapter's sections are signed at the existing outline gate, with no extra stop per chapter.

## The approach (pinned; decide nothing new)

Follow `works/phases/active/P38-e1/topics/breakdown.md` **`## P38-e1.S2`** exactly, together with **`## The shipped set`** and **`## Pins for every rule slice`**: the confirmation layout there, where S2 writes only the `Sections` block. The points:

1. **The cheap look** (§1 *The front door, step by step*, after step 5's prior lookup): at most 10 reads, with no agents and no web search.
   - **Repo modes:** Read, Glob and Grep the subject's files. A phase or slice subject reads its `intent.md`, `phase.md`'s `## Now` and `## Decisions`, and the heads of the slices' `result.md`.
   - **A v2:** the prior's `##` and `###` headings, from one KB read through S1's call form: `knowledge --base-url <B> read <rel_path> --source`, with a `curl -H @<KB_AUTH_HEADER>` fallback. Name this added call in the step's "your only other calls" sentence.
   - **General mode:** the request and the subject's ordinary map, with no search.
2. **The list** (drafted at step 6, shown at step 7 in the breakdown's layout, as the `Sections (your yes signs them; change any line):` block):
   - It is numbered: `<n>. <Heading> — <what it answers>`, in §4.2's order, with at most 6 content sections for a document. Quiz and Sources are implied, and one clause says so.
   - **Plain words.** Headings a newcomer understands, and the one-line answers in plain words. The operator also asked for the documents and the confirmation to be easier to understand; S6 owns the general plain-language rule, and this list must already read that way.
   - **A v2** marks each prior heading `kept`, `renamed` or `dropped`, and each addition `new`.
   - **A book** lists its chapters: `<n>. <Chapter title> — <what it covers>`. Its stops line says each chapter's sections are signed at the outline gate, with no stop per chapter.
   - **A new chapter of an existing book** lists its own sections, as a document does.
   - A changed line is folded in and the whole confirmation shown again.
3. **D0** (§3.1): in an explain phase, the signed sections are read from the confirmation recorded under `intent.md`'s *Original Input (verbatim)*: the last one shown, as the operator answered it. **With none there** (e.g. create-phase's own confirmation), D1 drafts them as today, and §8's report says they were not signed up front.
4. **D1** (§3.4, the skeleton step): the skeleton **is** the signed sections, in order. Every question belongs to one signed section, must-cover items fold into theirs, and no question serves an unsigned section.
5. **D6** (§3.10, the path step): the path is the signed sections, in their order and wording.
   - Ids derive from the headings, and a v2 carries its ids.
   - Each section keeps a word budget, and the budgets sum to the document's.
   - A section the evidence cannot carry is cut from the path: its claims go to `## Not used`, and §8 lists it with why. It is never a stop.
6. **D5g** (§3.8):
   - The must-cover rule stands.
   - The two-thirds rule counts the load-bearing questions of the sections that **remain**.
   - A cut section never fails the gate on its own.
7. **§8 report:** add `sections: <n> signed · <m> delivered`, plus each cut section and why.
8. **`outline sign-off`** (§1 step 6's field text, wherever the skill explains it): for a document or chapter, `on` now means the operator also signs D6's final outline (claims and budgets) before the write slice. A book's outline gate signs each chapter's sections: §9.2 step 5's `book/outline.md` gains, per chapter, its sections as headings with one line each. There is no stop per chapter slice. §9.3: a chapter's D6 path is its signed sections.
9. **§9.1(b):** only make the size test read the signed sections. S3 rewrites the thresholds.

## Constraints

- **Headings, `§` numbers and Part B marker lines stay byte for byte.** New rules go inside existing sections. No new `## Explain` field and no new `run:` value.
- Do not write S6's `In plain words` line or S7's `Cost:` line. Leave today's `- cost: …` bullet as it is: S7 replaces it.
- Keep the run card's "Never skip or shorten a stage…" rule. Signed sections size the stages; they never let a lead skip one.
- **The set** (touch nothing else):
  - the canonical `plugin/skills/explain/SKILL.md`;
  - `.agents/skills/explain/SKILL.md`: the canonical file minus the `argument-hint:` and `allowed-tools:` lines, body byte-equal;
  - `web/public/SKILL.md`: a full `cp`;
  - the five `plugin/agents/*.md`, regenerated with `python3 scripts/skills_parity.py --write-agents` only if Part B (e.g. B3 or B5) is touched.
- **Never** edit `.claude/skills/**`, commit, or move workflow state.
- **The notebook:**
  - Leave `## Doc impact` notes through `phase-section P38-e1 "Doc impact" --append`:
    - `product.md`: the explain confirmation proposes the sections, and the run researches only for them (P38-e1.S2);
    - `qa.md` `## Regression Checklist`: the explain front-door lines expect the sections list (P38-e1.S2).
  - Update `## Now`.
  - Leave a note for S3, S4, S6 and S7 if anything they need moved.

## Validation

- `python3 scripts/skills_parity.py` → PASS
- `python3 scripts/plugin_parity.py` → PASS
- `diff <(git show 14e1cbda:plugin/skills/explain/SKILL.md | grep '^#') <(grep '^#' plugin/skills/explain/SKILL.md)` → empty
- P33-n3's citation check (`works/phases/active/P33-n3/topics/citations.md` L64–85, from the repo root) → `checked=200 missing=2`, no worse
- `uv run pytest tests/test_explain_resolver.py -q` → still passes (S1's resolver untouched)
- A read-through, reported in `result.md`, confirming that these agree on the signed sections:
  - §1 steps 5–7 (the look, the list, the shown confirmation);
  - D0, D1, D5g, D6 and §8;
  - §9.2 and §9.3.
- `git status --porcelain .claude/` → nothing of this slice's

## Dispatch

route=mid
reason=kind implementation rated low
subagent_type=slice-executor
model=opus
pass_model=yes
effort=medium
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
