# P38-e1.S6 — the writer held to budget, plain words, a sampling critic (intent items 4, 5 and 10)

## Goal

Four changes, each binding a v1 run and a v2 alike:

1. **The writer is held to budget while drafting** (item 5). P50-4b's draft went 7,600 → 5,800 → 4,770 words: two full rewrites. Each section is cut to its budget as it is written. The trace is appended to, never rewritten whole.
2. **The published document is easier to understand** (item 10). The operator: "make it easier to understand". It gets:
   - plain sentences for the stated reader;
   - each term defined in plain words at first use;
   - an example before the abstraction;
   - a short **"In one paragraph"** at the top.

   This complements P39-hk's glossary and does not build it.
3. **A cheaper critic** (item 4). P50-4b's critic re-opened all 34 sources ($11). Now it trusts the run's own verifier records (S4 made every `· used` claim end with one) and re-opens a **sample of at most 5 sources**. It flags jargon and dense passages.
4. **The confirmation opens with a plain summary** (item 10): 2–4 plain sentences above the `Sections` block.

## The approach (pinned; decide nothing new)

Follow `works/phases/active/P38-e1/topics/breakdown.md` **`## P38-e1.S6`** exactly, together with **`## The shipped set`** and **`## Pins for every rule slice`** (the confirmation layout). Also follow the notes `(from DECOMP, for S6)`, `(from S2, for S3, S6 and S7)` and `(from S4, for S6)` (`phase-section P38-e1 "Notes for later slices"`). The points:

1. **D7 pass 2** (§4, *Write the chapter*):
   - Write each section within its budget.
   - After each section, count its prose words with one exact form, which this slice adds to §4: a `python3 -c` that prints a heading id's prose words, excluding fenced blocks, tables, the quiz and the sources block.
   - Over budget by more than 10%: cut before starting the next section.
   - Pass 3 fixes flow only and cuts nothing for budget.
   - Run the form once against a repo dossier body, e.g. `works/phases/active/P32/rehearsal/r1/dossiers/c-new/body.md` (or any `body.md` that exists), and put the output in `result.md`.
2. **The trace** (B9 *The trace*, §4 pass 3, §4.10's revision step):
   - It is appended to, never rewritten whole.
   - A revised or moved sentence gets a new line, `(rev Cnn)`, under its heading key, and the latest line for a sentence key wins. The critic reads it so.
   - `body.md` changes only with Write or Edit (B6 already says so). Restate it where the revision step sits.
3. **The prose rules** (§4, the writing rules):
   - plain sentences for the stated reader: everyday words, one new idea a sentence;
   - each term defined in plain words at first use: inline, or a collapsed `DEFINITION` callout for a primer;
   - an example before the abstraction (extend *Show, then tell* to concepts);
   - **"In one paragraph"**:
     - the body opens, before the first `##`, with `> [!IMPORTANT] In one paragraph`: at most 120 words on what the reader will be able to do and the one idea it rests on;
     - it is no new grammar, since §4.4's `IMPORTANT` is the key-idea box;
     - §4.2 lists it first;
     - its checkable sentences trace like any other.
4. **B5 *How you check*:**
   - Each `sources` item resolves to a `library.md` entry.
   - A claim whose verify record says `supported` (or `partial`, within its narrower claim) and whose ledger status agrees is **trusted**.
   - Re-open a **sample of at most 5 sources**, the main claims' sources first (numbers, evaluative claims, quiz keys). Read the run's saved page text in `<dossier>/pages/`, and fetch only when it is missing.
   - A failure in the sample widens to every sentence citing that source.
   - Ledger item 5 ("Passages re-opened") checks a load-bearing sentence against its claim's verify record and findings passage, and re-opens pages only for the sample.
   - Code facts keep their grep.
   - The critique's `checked:` and `ledger:` lines report `<n> sources sampled (of <m>)`.
   - Carried claims (S5's `C-p<N>-…`, with `reused-from:` and the prior's record) are trusted the same way.
5. **B5's rubric** (no new category):
   - jargon used before a plain definition at first use → `should-fix` (`clarity`);
   - a dense passage (a paragraph over about 100 words, or a sentence stacking 3 or more new terms) → `should-fix` (`clarity`);
   - a missing "In one paragraph" → `should-fix` (`reader`).
6. **The critic's model:**
   - §4.10 and B5 *Your model* already say Sonnet for an Opus writer. Keep that, and state it plainly in §4.10 beside the sampling.
   - **Do not** change `same-model: accepted`'s meaning or any agent frontmatter: the workspace's Opus pin is OQ1, which is out of scope.
7. **The confirmation's plain summary** (§1 step 7's shown layout): one `In plain words:` block of 2–4 plain sentences (what it explains, for whom, what they can do afterwards), between the title line and the `Sections` block. Step 6 drafts it.
   - Also make the rest of the confirmation's wording plain where it is jargon-heavy today, e.g. "research team, verifier, gap rounds, critic".
   - Do **not** touch the `## Explain` block's field names, or S7's `Cost:` line or the existing `- cost:` bullet (S7 owns those).

## Constraints

- **Headings, `§` numbers and Part B marker lines** (and their `with=` lists) stay byte for byte. New text goes inside existing sections. No new `## Explain` field and no new `run:` value.
- Do not weaken S4's records rule or S5's carried-claim rule. The critic's trust rests on them.
- **The set** (touch nothing else):
  - the canonical `plugin/skills/explain/SKILL.md`;
  - `.agents/skills/explain/SKILL.md`: the canonical file minus the `argument-hint:` and `allowed-tools:` lines, body byte-equal;
  - `web/public/SKILL.md`: a full `cp`;
  - the five `plugin/agents/*.md`, regenerated with `python3 scripts/skills_parity.py --write-agents`.
- **Never** edit `.claude/skills/**`, commit, or move workflow state.
- **The notebook:**
  - `## Doc impact` (`--append`): `product.md`: explain documents open with "In one paragraph", define terms at first use and hold section budgets while drafting; the critic samples sources and flags jargon; the confirmation opens with a plain summary (P38-e1.S6).
  - Remove the consumed `for S6` notes (keep any part S7 still needs), and update `## Now`.

## Validation

- `python3 scripts/skills_parity.py` → PASS
- `python3 scripts/plugin_parity.py` → PASS
- **The heading diff against `14e1cbda`** → empty: save `git show 14e1cbda:plugin/skills/explain/SKILL.md` to the session scratchpad and diff the `^#` lines. The Part B marker lines must be identical too.
- P33-n3's citation check (`works/phases/active/P33-n3/topics/citations.md` L64–85) → `checked=200 missing=2`, no worse
- `uv run pytest tests/test_explain_resolver.py -q` → passes
- One run of the new word-count form on a repo `body.md`, with its output in `result.md`
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
