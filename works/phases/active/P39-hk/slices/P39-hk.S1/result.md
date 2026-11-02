# P39-hk.S1 — result

## Verdict

- status: done
- route: mid
- model: opus
- effort: medium
- summary: Rewrote the explain skill's front door (§1): a concrete guessed reader, a subject-shaped section list with one or two other shapes, a quiz and a next-steps part only when earned, codebase-only with a plain decline, a coverage lookup naming the covering phases and a research-phase offer when none covers the subject, and a cost line of one writer plus one critic with no run choice and no price table; propagated to the .agents and web copies.
- files_changed: plugin/skills/explain/SKILL.md; .agents/skills/explain/SKILL.md; web/public/SKILL.md; works/phases/active/P39-hk/topics/skill-headings.md (new); works/phases/active/P39-hk/slices/P39-hk.S1/result.md (new)
- validation: `python3 scripts/skills_parity.py` PASS; `python3 scripts/plugin_parity.py` PASS; `uv run pytest tests/test_explain_resolver.py -q` 2 passed; `git status --porcelain .claude/` empty; front-door grep accounted below; P33-n3 citation check `citations checked=200 missing=2` (identical at HEAD: S1 changed no heading); deferred: whole-tree (none run beyond the plan's)
- deviations: (1) `mode:` dropped from `## Explain` entirely and a `phases:` line added (16 lines); (2) the confirmation's web-searches line and its paragraph removed, and the stops line no longer names the evidence gate; (3) the coverage rule reads a phase id anywhere in a commit subject, not only the scope; (4) a `yes` to explain from the code alone is offered beside "research first". Reasons below.
- doc_impact: none (the skill is plugin product, shipped by the release slice; the workspace route's change is S5's handoff)
- notebook: see `## Notebook entries` below

## What changed

All in `plugin/skills/explain/SKILL.md` (then copied):

- Frontmatter `argument-hint`: `[quick|no-research]` removed. `description:` and `allowed-tools:` left for S4.
- Opening paragraph: codebase-only, told from the code and the phases' records; a non-code subject is declined.
- The run card: the `full` / `quick` / `no-research` block replaced by a short "one kind of run" paragraph (the delta sentence kept for S2); "Never choose quick or no-research yourself" cut. The stage table is untouched (S2).
- §1: the `quick` / `no-research` / `research` flags removed (now dropped with one line, like `here`); general mode replaced by a plain decline; the loose document's subject label and slug removed; a book's `run: full` and kind `subject` removed (kind `codebase` only, chapters drawn from phases).
- §1 gains three bold-paragraph rules: **The reader** (a concrete guess, never a stock reader; S2 points its D0 brief here), **The shape** (questions in the reader's order; the "In one paragraph" box and Sources fixed; Quiz only when earned; Next steps only when something is open; no Best practices; one or two other shapes), **The phases that cover the subject** (COVERAGE: `git log --format=%s -- <paths>` plus a Grep of active and archived `intent.md` / `phase.md`; the research-phase block when none covers it).
- The front door: step 3 adds the non-code decline; step 5's cheap look notes the subject's paths and what is open, and a new "Then the coverage" paragraph runs the lookup outside the 10 reads; step 6 drafts 16 fields (no `run:`, no `mode:`, new `phases:`); step 7's template has a Reader line, the shape's optional Quiz / Next steps lines, an Other shapes block, a Built by line, the new Cost line, the no-coverage paragraph, and one worked example (topic mode, "how a highlight remembers its words", covered by P30); the cost table is gone, the cost clauses rewritten without dollars; step 8 adds the "research first" hand-off.

No heading changed (heading list byte-identical to HEAD); recorded in `topics/skill-headings.md`.

## Deviations, with reasons

1. **`mode:` goes whole, `phases:` comes in.** The plan says "`run:` and general `mode:` go". With general gone, `mode:` could only read `codebase`, so it carries nothing; it is dropped. The run needs to know which phases' records to read (intent C), and the front door already finds them, so they ride as `phases:` right after `subject:`. If S5 or the orchestrator prefers to keep `mode: codebase` for route compatibility, it is a one-line add.
2. **Web-searches line removed; stops line.** The explain no longer searches the web (intent C), so the confirmation's warning about the search cap is moot. The stops line drops "if the evidence is too thin" (the evidence gate is research machinery S2 rewrites) and names the critic and the publish. The `permissions:` line stays (§3.2 is S2/S4's).
3. **Phase ids in commits.** This repo's commits carry the id in the summary (`feat(web): P30.S20 …`), the scope being an area; `merge(P39-hk)` / `chore(P39-hk)` carry it in the scope. The rule reads both.
4. **"yes" beside "research first".** Intent C says the confirmation *offers* a research phase; an offer implies the operator may decline. Explaining from the code alone stays possible, on the operator's word.

## Front-door grep accounting

`grep -n -i -E "novice|general mode|mode: general|no-research|quick" plugin/skills/explain/SKILL.md`, hits in §1 (lines before `## 2.`):
- L126: the retired words `quick`, `no-research`, `research` are named as dropped with one line. Kept on purpose (old habits).
- L208: "Never a stock reader ("a novice", …)": the rule itself.

Hits after §1 are later slices': L676–677 (§3.1 D0 brief: `mode: … general`, `run:`, "a novice unless" — S2), §3.3 `run.md`, §3.9 `quick` and `no-research` (S2/S4), L1366, L1588, L1598 (§3/§4 general-mode lenses — S2/S3), L1900 and L1936 (§5: general mode's project slug and `--subject` — whoever rewrites §5; the server keeps `--subject` per Decisions), Part B.

## Deferred items

- **D86-sd:** (a) the web-searches line's scope — settled (the line is gone); (d) the cost table's round count — settled (the table is gone); (e) `quick` offered twice on a narrow subject — settled (no `quick`); (g) the cheap look's shell reads — partly: the front door's allowed calls now name the coverage's `git log`; other shell reads are not addressed. (b), (c), (f), (h) untouched.
- **D69** (minted phase ids in §1 placement): not touched; the `p<N>` / position `N` rules are as before.

## Citation check (P33-n3)

`citations checked=200 missing=2`, both `B5 *Your dispatch*` in the vendored `explain-chapter.md` references; the same result against HEAD's skill, so pre-existing and not S1's.

## Notebook entries

- **Decisions:**
  - **The `## Explain` field set (S1):** sixteen lines, in order: unit, subject, phases, book, chapter, prior, lang, reader, depth, must-cover, leave-out, trusted sources, project, visibility, outline sign-off, worktree. `run:` and `mode:` go (one run; every subject is code); `phases:` names the covering phases or `none`. S5 mirrors it in create-phase's route.
  - **Reader and shape (S1):** §1 *The reader*: a concrete guess (who, what they know, what they are new to, what they will do), never a stock reader. §1 *The shape*: sections are the reader's questions in their order, plus one or two other shapes; the "In one paragraph" box and Sources fixed; Quiz only when earned; Next steps only when something is open; no Best practices.
  - **Research-phase hand-off (S1):** none covering → the confirmation offers "research first"; the front door invokes `create-phase` with the request and a `Research: <subject>` block (subject, paths, question, findings-only: yes, then: explain only when the operator asks again); create-phase confirms, creates and stops. "yes" still explains from the code alone. Text: §1 *The phases that cover the subject*, front door step 8.
- **Notes for later slices:**
  - **(from S1, for S2)** §3.1's D0 brief (`mode: … general · run: …`, "a novice unless…") should point at §1 *The reader* and drop `run:`/general; the run card's "The run" paragraph keeps only the delta sentence for you; front door step 5 still looks for the prior's dossier to price a delta — keep or cut with the delta. The run now gets `phases:` in `## Explain` as its record list.
  - **(from S1, for S3)** §1 *The shape* says what the confirmation proposes: the reader's questions, optional Quiz, optional "Next steps" naming open deferred jobs / unanswered questions / unbuilt decisions, no Best practices; §4.2 and §4.5 still carry the fixed outline and Best practices, and §4 must say how Next steps is written. §5's general-mode project slug (L~1900) and `--subject` (L~1936) are stale in the skill.
  - **(from S1, for S5)** The route must accept the 16-line set (no `run:`, no `mode:`, new `phases:`), and its confirmed-proposal check must not ask for the dropped fields; front door step 2 still tests v86 + a `unit` line: bump it to the version that carries the new set. Mirror the research block and the "research first" word from §1 / step 8. No heading changed in S1 (`topics/skill-headings.md`).
  - **(from S1, for S4)** The frontmatter `description:` still says "or a general subject", research agents and "Best practices & next steps"; `allowed-tools` still lists WebSearch/WebFetch.
- **Doc impact:** none.
- **Operator Questions:** none.
- **Now:** S1 landed the front door (reader, shape, codebase-only, coverage and research-phase offer, one writer plus one critic). Next: S2 rewrites §3's evidence model from the 16-field `## Explain` and §1 *The reader*. Open: R1 beside it.
