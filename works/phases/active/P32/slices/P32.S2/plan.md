# P32.S2 — research method: sources, the claim ledger, verification and the critic

## Goal

Find out, thoroughly and from primary sources, how sources should be ranked, how claims are recorded and
verified, how disconfirming evidence is sought, and how a critic checks a chapter against what was found; then
recommend the **evidence** half of P32's research stage and integrate it with S1's orchestration into one
recommended pipeline (single document and book). Quality over efficiency: cost and time are not the bound;
loop safety is. Findings only: this slice writes no product file.

Hosts, the plugin and the book package are S3's; name any capability you assume as a hand-off to S3.

## Read first

- `works/phases/active/P32/intent.md`.
- `phase.md` `## Notes for later slices`: the **P32.S2** entry (the must-open sources and questions 1–8, this
  slice's spec: answer every question) and **(from P32.S1, for P32.S2)** (what S1's stages assume of you).
- `topics/research-method.md` §1, §3.2–3.3, §3.6 and §4.1, as that note says; the rest only where you need
  it. Do not re-research S1's ground.
- Locally: `works/phases/active/P31/slices/P31.S5/result.md` head (the critic's two must-fixes) and
  `works/phases/active/P31/package/claude/agents/explain-critic.md` (the critic rubric you extend or replace).

## Sources

Open at least every source the S2 entry lists, and follow the trail to stronger evidence. For each one opened,
keep: URL, title, authors or publisher, date, and the passages (quoted, with a locator) that support what you
take from it.

- S1's lessons: `WebFetch` will not reproduce long passages verbatim; for exact quotes, `curl` the page and
  convert it locally (HTML to text, `pdftotext` for a PDF), working in this session's scratchpad. A site that
  answers 403 may be readable from a Wayback Machine snapshot (say so). S1's downloaded texts are in
  `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/c2016e8a-14bf-4ba0-89b3-a899f1c9c55e/scratchpad/src/`
  and may be reused.
- A source that will not load after two tries goes under **Not opened**; never cite it.
- Mark each finding **evidenced** or **extrapolated**, as S1 did, and continue S1's source-id scheme with a
  new prefix (for example B1…) so the two topics never collide.
- `Explore` is available for repo lookups only.

## What to write

**`works/phases/active/P32/topics/research-evidence.md`**, in English:

1. **Summary**, about a page.
2. **Findings by question 1–7** of the S2 entry, with evidence, trade-offs and failure modes.
3. **Recommendation (question 8):** the dossier and ledger schema with **one worked entry** for a web claim
   and one for a codebase claim; the source ladder with its credibility tests and the independence rule; the
   atomic-claim rule (which chapter claims need ledger entries); the verifier's procedure, its inputs (and what
   it must not see) and its model rule; the counter-evidence pass and how a disagreement is recorded; the
   critic's ledger check and coverage check, with severity and what replaces or extends P31's rubric; the loud
   failure rule (minimum evidence to proceed); and settle S1's open items for you (the support bar, the
   per-question states, what an unsupported must-cover item does, what `quick` keeps, the rehearsal judge's
   model).
4. **The integrated pipeline:** one page joining S1's stages and this into P32's recommended pipeline, single
   document and book, stage by stage, naming each file written and read.
5. **Hand-offs to S3:** every host capability the pipeline assumes.
6. **Sources** (id, title, authors or publisher, date, URL, accessed) and **Not opened / open questions**.

## Notebook and result

- `phase.md` (one section at a time, `phase-section`):
  - `## Decisions`: one line per settled evidence choice, pointing at the topic file;
  - `## Notes for later slices`: remove the P32.S2 entry and the (from P32.S1, for P32.S2) note; add or
    extend the entry for S3 with what you assume; keep the S3 and DECOMP2 entries' questions intact;
  - `## Operator Questions`: append only a question only the operator can answer;
  - `## Now`: rewrite as the hand-off to S3.
- `result.md`: the verdict block first (`status`, `tier`, `model`, `effort` from `## Dispatch`, `summary`,
  `files_changed`, `validation`, `deviations`, `doc_impact: none`), then the sources opened and not opened,
  and the headline findings.
- Run `python3 scripts/workflow.py validate`. No commit, no state command.

## Verification

- `topics/research-evidence.md` answers questions 1–8, includes the integrated pipeline, and cites only
  sources you opened.
- The product diff is empty: `git diff --stat -- web/ server/ cli/ plugin/ .agents/ scripts/`.
- `validate` passes.

## Dispatch

slice=P32.S2
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
