# P38-e1.S6 result

- status: done
- route: mid
- model: opus
- effort: medium
- summary: The explain skill now holds the writer to each section's word budget while drafting (one exact `python3 -c` word count in D7 pass 2, cut over 10% before the next section; pass 3 cuts nothing), keeps the trace append-only (`(rev Cnn)`, latest line wins), adds plain-prose rules ("In one paragraph" box first, plain sentences, terms defined at first use, example before abstraction), makes the B5 critic trust verify records and sample at most 5 sources while flagging jargon and dense passages, and opens the confirmation with an `In plain words:` summary.
- files_changed: plugin/skills/explain/SKILL.md; .agents/skills/explain/SKILL.md; web/public/SKILL.md; plugin/agents/web-researcher.md; plugin/agents/code-researcher.md; plugin/agents/gap-reviewer.md; plugin/agents/verifier.md; plugin/agents/explain-critic.md (regenerated); works/phases/active/P38-e1/phase.md (via phase-section); works/phases/active/P38-e1/slices/P38-e1.S6/result.md
- validation:
  - `python3 scripts/skills_parity.py` → PASS
  - `python3 scripts/plugin_parity.py` → PASS
  - heading diff (`^#` lines) against `14e1cbda` → empty; Part B marker lines (`part-b:`) → identical
  - P33-n3 citation check → `citations checked=200 missing=2` (the two pre-existing `B5 *Your dispatch*` misses; no worse)
  - `uv run pytest tests/test_explain_resolver.py -q` → 2 passed
  - the new word-count form, run as shipped, on `works/phases/active/P32/rehearsal/r1/dossiers/c-new/body.md` → output below
  - `git status --porcelain .claude/` → empty
  - `python3 scripts/workflow.py validate` → passed (stale-docs / oversized-section warnings only, pre-existing)
- deviations: two small fillings the plan implied but did not spell out: the reader pass marks its revised trace lines `(rev)` (no critic id exists then), and the "In one paragraph" box traces under the key `## top` (it has no heading id). Also, plain-wording the confirmation's `- run:` and stops lines leaves create-phase's own copy of the layout (workspace-side, outside the set) on the old wording; noted for REVIEW.
- doc_impact: `product.md`: explain documents open with "In one paragraph", define terms at first use and hold section budgets while drafting; the critic samples sources and flags jargon; the confirmation opens with a plain summary (P38-e1.S6).

## What changed, by place (plugin/skills/explain/SKILL.md; copies synced)

- §4 intro: the body starts with the "In one paragraph" box, before the first `##`.
- §4 D7 pass 2: write each section within its budget, then count its prose words with the shipped form (heading's section down to the next heading of its level or higher; skips headings, fenced blocks incl. quiz and sources, tables); over 10% → cut with Edit before the next section. Pass 3 fixes flow only, cuts nothing for budget; the trace follows by appending. New sentence after the passes: `body.md` and `trace.md` change only with Write/Edit, trace never rewritten whole.
- §4 prose rules: "In one paragraph" first (≤ 120 words, §4.4's `IMPORTANT`, traced); plain sentences; terms defined in plain words at first use (inline or collapsed `DEFINITION`); *Show, then tell* extended to concepts.
- §4.2: a lead-in line lists "In one paragraph" first, before item 1 (the numbered list is not renumbered).
- §4.10 step 1: a paragraph stating the critic runs on Sonnet for an Opus writer, trusts verify records, samples ≤ 5 sources from `<DOSSIER>/pages/`, flags jargon/density/missing summary. Step 3: `body.md` only via Edit/Write; trace append-only with `(rev Cnn)` lines, latest wins. `same-model: accepted` untouched.
- B5 Inputs 5: the trace's latest line per sentence key wins. *How you check*: sources resolve to `library.md`; trusted claims (record `supported`/`partial` within its narrower claim, ledger agrees; carried `C-p<N>-…` claims too); sample ≤ 5 sources, main claims first, saved page text first; a sample failure widens to every sentence citing that source. Ledger item 5 checks against the verify record and findings passage, re-opening pages only for the sample. Clarity: jargon-before-definition and dense passages → `should-fix` (`clarity`); missing "In one paragraph" → `should-fix` (`reader`). Rubric's should-fix list names them (no new category). File: `checked:` and `ledger:` report `<n> sources sampled (of <m>)`; verdict block's `ledger` likewise. *Never*: no longer "pass a citation you did not open" but a sampled or untrusted one.
- B9 *The trace*: an example `(rev C03)` line and a paragraph: append-only, Edit/Write only, `## top` key for the summary box, latest line per sentence key wins.
- §1 step 6: drafts the plain summary last. Step 7 layout: `In plain words: <2–4 plain sentences…>` between the title line and `Sections`. Plain wording: `- run: full (agents research the sources, a second model checks every fact used, more rounds fill what is missing, a reviewer reads the draft)`; stops line `runs on its own copy of the repository; stops only if the evidence is too thin, a reviewer's must-fix cannot be settled, or publishing fails`. The `## Explain` fields and the `- cost:` bullet are untouched (S7's).
- No headings, `§` numbers, Part B markers, frontmatter, `## Explain` fields or `run:` values changed. S4's records rule and S5's carried-claim rule are untouched; B5 leans on them.

## The word-count form, run once

Extracted verbatim from the shipped SKILL.md code block and run on `works/phases/active/P32/rehearsal/r1/dossiers/c-new/body.md`:

    background 300
    intuition 245
    code 1173
    validation 396
    under-the-lock 296
    queueing 351
    response 130
    invariants 747
    best-practices 370
    quiz-section 0
    sources-heading 0

`code` (1173) equals its four `###` subsections (396 + 296 + 351 + 130); the quiz and sources sections count 0, so fenced blocks are excluded.

## Notebook

- `## Decisions`: appended the S6 gist (writer budget, trace, B5 sampling).
- `## Doc impact`: appended the line above.
- `## Notes for later slices`: removed `(from DECOMP, for S6)` and `(from S4, for S6)`; narrowed `(from S2, for S3, S6 and S7)` to S7; added `(from S6, for REVIEW)` on create-phase's copy of the confirmation layout.
- `## Now`: S6 landed; next S7.
