# P32.S1 — research method: how research teams are planned, run and stopped

## Goal

Find out, thoroughly and from primary sources, how the best research agents and research-to-writing systems
plan, fan out, search, run gap rounds, stop, and turn research into a document, and recommend the
**orchestration** half of P32's research stage (single document and book). Quality over efficiency: cost and
time are not the bound; loop safety is. Findings only: this slice writes no product file.

The evidence half (the source ladder, the dossier and ledger schema, verification, the critic) is S2's; where
the team runs (hosts, plugin, book package) is S3's. Stay out of both, except to name a hand-off point S2 or S3
must pick up.

## Read first

- `works/phases/active/P32/intent.md` (the confirmed research shape the operator asked for).
- `phase.md` `## Notes for later slices` → the **P32.S1** entry: the must-open sources and questions 1–8.
  That entry is this slice's spec; answer every question there.
- `plugin/skills/explain/SKILL.md` §3 (L165–278) and §4.2 (L316–340): today's research step and outline, so
  the recommendation says what it replaces.

## Sources

Open at least every source the S1 entry lists. Follow the trail further where a source cites stronger
evidence (an original paper, a published prompt, an ablation). For each one opened, keep: URL, title,
publisher or authors, date, and the passages (quoted, with a locator) that support what you take from it.

- `WebFetch` answers through a small model: ask it for **verbatim quotes** with section names, not a summary,
  and page through long documents with `offset`. For a paper, prefer the arXiv HTML or ACL Anthology page and
  the PDF where HTML is missing.
- A source that will not load after two tries goes under **Not opened** with the reason; never cite it.
- Mark each finding **evidenced** (a source says it, with an ablation or measurement where there is one) or
  **extrapolated** (your inference for P32). Product marketing pages are evidence of what a product claims,
  not of what works.
- `Explore` is available for repo lookups only (it has no web tools).

## What to write

**`works/phases/active/P32/topics/research-method.md`**, in English:

1. **Summary**: the recommended orchestration, in about a page.
2. **Findings by question 1–7**: each answered with its evidence (source ids), the trade-offs the authors
   report, and the failure modes and their fixes.
3. **Recommendation (question 8)**: P32's stages for the single document and for the book (whole-book research
   before the outline, a per-chapter top-up); each agent's role and **brief template** (objective, output
   format and file, source and tool guidance, boundaries, size); researcher counts by subject complexity; the
   wide-then-deep search rules; the gap-round driver, the stop rule and the cap, and how a capped run reports
   it; how the outline and the writer draw from the research; what `quick` drops; a draft rubric for the
   old-vs-new rehearsal.
4. **Hand-offs**: what S2 must settle (the dossier format your stages produce and consume) and S3 (any
   capability your stages assume, such as parallel agents or a per-call model).
5. **Sources**: one list with id, title, publisher or authors, date, URL, accessed date.
6. **Not opened / open questions.**

## Notebook and result

- `phase.md` (one section at a time, `phase-section`):
  - `## Decisions`: one line per settled orchestration choice, pointing at the topic file;
  - `## Notes for later slices`: remove the P32.S1 entry; add a short entry for S2 and S3 with anything they
    need from you (keep the S2 and S3 entries' questions intact);
  - `## Operator Questions`: append only a question only the operator can answer;
  - `## Now`: rewrite as the hand-off to S2.
- `result.md`: the verdict block first (`status`, `tier`, `model`, `effort` from `## Dispatch`, `summary`,
  `files_changed`, `validation`, `deviations`, `doc_impact: none`), then how many sources were opened, what was
  not opened, and the headline findings.
- Run `python3 scripts/workflow.py validate`. No commit, no state command.

## Verification

- `topics/research-method.md` exists, answers questions 1–8, and every cited source is one you opened.
- The product diff is empty: `git diff --stat -- web/ server/ cli/ plugin/ .agents/ scripts/`.
- `validate` passes.

## Dispatch

slice=P32.S1
phase=P32
kind=research
risk=high
attempt=1
route=research
reason=kind research
tier=high
subagent_type=slice-executor-high
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=high
