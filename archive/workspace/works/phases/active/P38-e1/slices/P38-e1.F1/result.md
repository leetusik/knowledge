# P38-e1.F1 — result

- status: done
- route: high
- model: opus
- effort: xhigh
- summary: Applied all 15 desk-check findings to the explain skill's §1 step 7 (the confirmation template, the `Cost:` cases, the cost table) and to §5's `save` synopsis. I also fixed four cases of the same classes that S8 missed. The confirmation now uses plain words: what `quick` and `no-research` mean, research agents and fact-check batches instead of the skill's own terms, an "earlier version" entry, must-cover on its own line, a permissions line a newcomer can follow, and a web-searches line. `quick` now shows a projected $15–25. I re-rendered desk-check §4's three samples from the fixed template, marked §8 fixed and updated §7.
- files_changed: plugin/skills/explain/SKILL.md; .agents/skills/explain/SKILL.md; web/public/SKILL.md; works/phases/active/P38-e1/topics/desk-check.md; works/phases/active/P38-e1/slices/P38-e1.F1/result.md (new); works/phases/active/P38-e1/phase.md (through `phase-section` only: Now, Notes for later slices, Doc impact)
- validation:
  - `python3 scripts/skills_parity.py` → PASS
  - `python3 scripts/plugin_parity.py` → PASS
  - heading diff against `14e1cbda` (scratchpad copy; `^#` lines) → empty, 57 lines; Part B marker lines (`<!-- part-b`) → identical, 27 lines
  - P33-n3's citation check (`topics/citations.md` L66–83) → `citations checked=200 missing=2`, the baseline: the same two workspace-side `B5 *Your dispatch*` misses
  - `uv run pytest tests/test_explain_resolver.py -q` → 2 passed
  - finding-by-finding table → below
  - desk-check §4's three samples against the fixed step 7 → a scratch checker reads the template lines from the skill and compares each sample. All 31 checks pass: the constant lines are byte-equal; the run, stops and Cost lines match the template with its documented substitutions; the line order matches; no old wording is left.
  - `git status --porcelain .claude/` → empty
  - `python3 scripts/workflow.py validate` → passed (warnings only, all from before this slice)
- deviations:
  1. **D-F1:** the template's optional clause reads `[ · <the clause below that applies>]`, not `[ · cheaper: <delta | quick> ≈ $<c>]`. No rule offers a delta as a cheaper option: a found dossier makes the delta the run itself, and its clause is `from scratch`. The literal invited `cheaper: delta ≈ $…`. It is the same length and exact.
  2. **D-F5:** `v1 document (a codebase subject; projected)` drops "from P48-q4". The shipped skill would otherwise name a workspace phase from another repository, and the table's head already says "projected for 0.9.0". Shorter and exact.
  3. **D-F2 (the plan's choice):** the `quick` cell is `$15–25 (projected; not metered yet)`, without `≈`, because the column head already says "≈ $ at list price", as the other rows assume.
  4. **D-F8:** the no-research bracket is `<this repository | your own material>`, chosen by mode. That makes it exact in general mode too (card L77). A codebase rendering is the finding's text.
  5. **D-F11:** shortened to `first add the rules listed in the explain skill's §3.2`. §3.2 lists them in its stop block; "the rules the run prints first" read as if the run printed them before asking.
  6. **D-F13:** "stops twice …" without the leading "it", matching the line's other clauses ("runs on …; stops only if …").
  7. **Class cases added**, as a fix slice owes: four lines S8 never rendered, of the same classes (see *Added cases*).
- doc_impact: `qa.md` `## Regression Checklist`: the explain front-door book line no longer finds "outline" and "acceptance" gates by name; its stops line reads "stops twice for your yes: …", and a `full` run's confirmation ends with a `- web searches:` line (P38-e1.F1). A second line narrows it: the web-searches line is a `full` run's only, never on the headless `quick` line or a translation. That line was appended because `## Doc impact` refuses `--entry --replace`, and my first line overstated "every confirmation".

## Finding by finding

Line numbers are in the fixed `plugin/skills/explain/SKILL.md` (3,347 lines). The `.agents` and web copies match it (parity PASS).

| Finding | What it fixed | The line now holding the fix |
|---|---|---|
| D-F1 | the closing `Cost:` clause is shown only when a case applies | L338, which ends `[ · <the clause below that applies>]`; L374–376 ("It adds one more clause only when one of the cases below applies") |
| D-F2 | `quick` gets a price | L410 `$15–25 (projected; not metered yet)`; L387–389, where a narrow subject's Cost line adds `cheaper: say "quick" ≈ $<the table's quick price> (projected)` |
| D-F3 | the search-cap line | L348 `- web searches: every search, the agents' included, counts against this session's limit (200 by default); start a long run in a fresh session`; L365–368 point the rule at it |
| D-F4 | a book's run line drops the offer | L360–361 |
| D-F5 | the v1 row is labelled projected | L407 |
| D-F6 | the explain phase around the run | L409, the translation row `$3 (the explain phase around it adds ≈ $5 today)`; L372–374, the paragraph ("plus the explain phase around it, a few dollars"); L338, the template's phase clause; L398–399, a translation's line says ≈ $5; L391–392, a book's line has no phase clause |
| D-F7 | `--slug` in the `save` synopsis | L1821 `[--slug <source slug>-<xx>] \`, above `[--translated-from …]` |
| D-F8 | `quick` and `no-research` explained | L342 |
| D-F9 | the Cost line's agents in plain words | L370–372 (the paragraph names them as a newcomer would); L407–411 (every row of "What it sends"); L381, the delta's `a check that v<N>'s sources still say the same` |
| D-F10 | `earlier version:` in the summary list | L345; the `## Explain` field stays `prior:` |
| D-F11 | the permissions line | L347 |
| D-F12 | "the reviewer finds an error the run cannot fix" | L346 |
| D-F13 | the book's stops line | L361–364 |
| D-F14 | must-cover on its own line | L343 (`- lang: <LANG> · reader: <the reader>`), L344 (`- must-cover: <none \| <n> items, each in a section above>`); the rule that each item folds into a section is §3.4 step 3, L956–958 |
| D-F15 | `from scratch` said once, on the Cost line | L379–382; the run line keeps `- run: full — as a delta of v<N> (researches only what changed since <the prior's date>)` |

## Added cases (the same classes, missed by S8's three samples)

| Class | Case | Fix (line) |
|---|---|---|
| D-F4, offers and lines that never apply | a translation is `run: full` but researches nothing; its run line offered `quick` / `no-research` and described agents researching, and the `- web searches:` rule ("for a `full` run") would have printed a search-cap warning | L393–396: its run line reads `- run: full (a translation: one writer, no research and no reviewer)`, with no offer and no `- web searches:` line |
| D-F9, Cost-line jargon | `(the cost table, below)`: the operator sees no table below the confirmation | L338: `(the explain skill's cost table)`, like D-F11's §3.2 pointer |
| D-F9 | a v2 with no dossier: `delta: none (no dossier)` | L385–386: `no research saved from v<N> to reuse` |
| D-F9 | a translation's "one write span … no critic" | L398 and L409: "one writer … no reviewer" |
| D-F12, the stops line | `worktree: no`: "runs here, on this stream" | L365: "runs here, in this folder" |

How the added cases render, worked from the fixed rules:

    Cost: one writer, no research and no reviewer · ≈ $3 at list price, plus ≈ $5 for the explain phase around it (the explain skill's cost table)
    - run: full (a translation: one writer, no research and no reviewer)
    - lang: ko (translated from en v2) · reader: …
    (no Sections block; no - web searches: line)

    a v2, no dossier:  … · ≈ $35–45 at list price, plus a few dollars for the explain phase around it (the explain skill's cost table) · no research saved from v2 to reuse
    a narrow subject:  … (the explain skill's cost table) · cheaper: say "quick" ≈ $15–25 (projected)

## desk-check.md

- **Header:** the `L<n>` in §1–§3 and §5–§6 are at `af566e54` (3,335 lines). §4, §7 and §8's fix notes cite the fixed file (3,347 lines). The verdict notes that all 15 findings are fixed.
- **§4:** re-rendered from the fixed template. The plain summaries, section lists and `## Explain` blocks are S8's, with three changes:
  - v1: the five must-cover items are now written in full in `## Explain`, because the summary only counts them;
  - v2: the `Why:` line drops "P50-4b's dossier" for "v2's saved research";
  - each sample's "rules applied" list cites the fixed lines.

  The heading's range became L328–411.
- **§5:** one closing sentence says all eight were fixed.
- **§7:**
  - the "Table" column uses the new wording;
  - translation: the span passes (3 vs 2.65, −12%), and the new phase figure passes too (≈ $5 vs P51-3q's $5.23–5.58, −7%);
  - `quick`: $15–25 against S8's own projection, so it passes by construction and proves nothing until a `quick` run is metered;
  - a sentence on the phase clause: "a few dollars" fits P50-4b's $2.52 main thread, and P48-q4's unexplained $15.36 is the exception.
- **§8:** each of F1–F15 ends with `**Fixed in P38-e1.F1:** L<n>…`.

## Notebook (through `phase-section` only)

- `## Notes for later slices`:
  - entry 5, `(from S8, for REVIEW)`: replaced by its remaining part, the sizing summary, "F1 fixed its 15 findings", and the pointer to §4's samples as the walkthrough;
  - appended `(from F1, for REVIEW)`: the added cases; that the `quick` row passes by construction; that create-phase's layout copy now drifts further (S6's note).
- `## Doc impact`: two lines, the qa checklist line and its narrowing (see `doc_impact` above).
- `## Now`: replaced, 1,486 B.
- No Decisions or Operator Questions entry. Every rule F1 touched is already covered by S2's, S6's and S7's notes and decisions, apart from the checklist wording above.

## Not done, and why

- The workspace's create-phase layout copy (`.claude/skills/create-phase/SKILL.md` L140–148) still shows the old lines. It is outside this slice's set and is already S6's deferred-job candidate for the REVIEW.
- `plugin/README.md` and the landing line count (`web/src/content/marketing/content.ts`, now `wc -l` = 3,347) belong to S9's set.
- The `plugin/agents/*.md` files were not regenerated: Part B is unchanged, and `plugin_parity` PASS confirms it.
