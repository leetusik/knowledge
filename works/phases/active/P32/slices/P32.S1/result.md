# P32.S1 result: research method (how research teams are planned, run and stopped)

## Verdict

- status: done
- tier: high
- model: opus
- effort: xhigh
- summary: Opened 25 sources and quoted each with a locator. Wrote `topics/research-method.md`, which answers the S1 note's Q1–Q8 with every finding marked evidenced or extrapolated. It recommends P32's research-stage orchestration for a single document and for a book: stages, roles, angles, team sizes, brief templates, gap rounds with a stop rule and a cap of 3, loud failure, `quick`, and a draft rehearsal rubric. Nine orchestration decisions, two hand-off notes (S2, S3), OQ1 (`no-research`) and a new `## Now` are in `phase.md`.
- files_changed:
  - `works/phases/active/P32/topics/research-method.md` (new)
  - `works/phases/active/P32/phase.md`: `## Decisions`, `## Notes for later slices`, `## Operator Questions` (append) and `## Now`, each written one section at a time with `phase-section`
  - `works/phases/active/P32/slices/P32.S1/result.md` (this file)
- validation:
  - `python3 scripts/workflow.py validate`: PASS ("Workflow validation passed."; only pre-existing warnings: unknown kinds in P22/P26, consolidation owed by P28/P30/P31, stale and oversized docs).
  - `git diff --stat -- web/ server/ cli/ plugin/ .agents/ scripts/`: empty, and `git status --short` on the same paths is empty: PASS.
  - Bootstrap untouched: `git -C /Users/sugang/projects/personal/bootstrap_agentic_workspace.sh status --short` is empty: PASS.
  - The topic answers Q1–Q8 (§2 Q1–Q7, §3 Q8) and cites only A1–A25, all opened on 2026-10-22: PASS (checked by hand; locators re-checked against the downloaded texts).
- deviations:
  - **openai.com refused both curl and WebFetch with 403**, twice each. I read the launch post (A3) from its Wayback Machine snapshot of 2025-02-12. The system card (A4, cdn.openai.com), the API guide (A5, platform.openai.com) and the cookbook (A6, GitHub) loaded directly.
  - **Verbatim text came from curl plus a local HTML-to-text extractor**, with `pdftotext` for STORM's PDF, rather than WebFetch alone. WebFetch's small model declines to reproduce long passages verbatim. WebFetch was still used for A9, where curl looped on an OAuth redirect.
  - **Three sources beyond the S1 note's list**, followed on the trail for stronger evidence: DocAgent (A23, a code-order ablation), MAST (A24, a taxonomy of multi-agent failures) and MT-Bench (A25, position and verbosity bias in LLM judges). This is in addition to the trail sources Cognition, Anthropic's two engineering posts, WebWeaver, OmniThink and ResearchRubrics.
  - **The topic file is long** (about 76 KB): it carries the quoted passages the plan asks for. The one-page summary the plan asks for is its §1.
- doc_impact: none

## Sources

- **Opened: 25** (A1–A25 in the topic's §5, with URL, publisher or authors, date and access date). Every must-open on the S1 note was opened:
  - Anthropic's post and its published lead, subagent and citations prompts;
  - OpenAI's launch post (via Wayback), system card, API guide and cookbook;
  - Gemini's overview, its December 2024 blog post and its API doc on collaborative planning;
  - TTD-DR;
  - STORM and Co-STORM;
  - open_deep_research (the write-up and the code) and GPT Researcher;
  - Anthropic's judge rubric (inside A1) and DeepResearch Bench.
- **Not opened** (never cited):
  - openai.com directly (403);
  - a 2026 Wayback snapshot of A3 (Cloudflare challenge);
  - Perplexity Deep Research, Hugging Face Open Deep Research and Kimi-Researcher (not attempted: they are not must-opens and no trail pointed to an ablation);
  - LiveResearchBench, DeepResearchGym and DeepConsult (named only inside A20 and A22).
- **Partly read:** A9's last ~6.9k characters (WebFetch window).

## Headline findings

1. **Scope before research, as a written brief.** Every production system scopes first (A5, A8, A9, A13), and a rewrite into a brief can do it without a conversation (A13's "north star"; A6 on making unstated dimensions open). P32: write `brief.md`, ask nothing (the skill runs unattended), and preflight the web tools.
2. **Orchestrator–worker research, single-threaded writing.** Parallel researchers help where sub-topics are independent (A1: +90.2% over a single agent; token use explains 80% of variance). LangChain's parallel section writers produced "disjoint" reports, so research is multi-agent and writing is not (A13). Anthropic forbids a subagent writing the report (A2), and Cognition gives the reasons (A17).
3. **The brief decides duplication.** It needs an objective, an output format, source and tool guidance, and boundaries (A1, A2). Vague briefs duplicated work (A1's semiconductor example), and step repetition is 15.7% of MAST's failures (A24). P32 adds not-yours boundaries, "known already" and a shared query log.
4. **Scale the team, then cap it.** Anthropic's tiers run 1, 2–4 and more than 10 (A1); its prompt says 1, 2–3, 3–5 and 5–10, max 20, "Prefer fewer, more capable subagents" (A2). Early failures included "spawning 50 subagents" and "scouring the web endlessly" (A1). P32 sizes the team on ResearchRubrics' breadth, nesting and exploration axes (A22): 3, 5–6 or 7–10, never more than 10 per wave, with run ceilings and per-researcher hard caps. These numbers are extrapolated.
5. **Wide, then deep:** short broad queries under 5 words, fetch every page used, parallel calls, reflection after each result, and a stop when the last 2 searches add nothing (A1, A2, A14). SEO farms are fixed by source-quality heuristics (A1), which S2's ladder supplies.
6. **Gap rounds work best against a draft or outline mapped to its evidence.**
   - TTD-DR: draft-driven questions add +12 points of query novelty, and 51.2% of the final information arrives by step 9 of 20 (A10).
   - WebWeaver: gains over 3 outline rounds, with outline support rising 51.2 → 73.6 (A20).
   - Co-STORM's moderator asks from uncited, unused sources (A12).
   - ResearchRubrics' "what a well-informed person would expect" axis, together with synthesis, accounts for 45–50% of agent failures (A22).

   P32 uses a fresh gap reviewer that asks five things (expert, reader, evidence, unused, must-cover), researches only load-bearing gaps, stops on `complete` or `stalled`, and caps at 3 rounds. A capped run declares its open gaps everywhere. The cap value and the fresh reviewer are extrapolated.
7. **Writing from evidence ids beats writing from everything.** WebWeaver's per-section retrieve-and-prune writer beats a writer given the whole memory bank on every metric, citation accuracy 86.73 → 93.37 among them (A20). STORM's residual errors are improper inference and paraphrase, not invention (A11). open_deep_research silently truncates findings and silently ends research on any exception (`or True`, A14): P32 forbids both.
8. **Evaluation:**
   - binary criteria agree with humans about 20 points more than ternary ones;
   - hand-written criteria with examples help, while LLM-expanded ones hurt by 15–20% (A22);
   - isolated scoring is not discriminative, so judging is pairwise or reference-based (A16);
   - judges carry position and verbosity bias, so each pair is judged twice with positions swapped (A25);
   - humans catch source bias (A1).

   The draft rehearsal rubric is in the topic's §3.13.

## Notebook entries (by reference)

- `## Decisions`: nine lines tagged `(S1, …)`, each pointing at a topic section.
- `## Notes for later slices`: the P32.S1 entry is removed. Two notes are added under "From finished slices": `(from P32.S1, for P32.S2)` and `(from P32.S1, for P32.S3)`. The S2, S3 and DECOMP2 entries are kept intact.
- `## Operator Questions`: OQ1 asks whether to keep `no-research` as an explicit opt-out (recommended) or drop it.
- `## Now`: rewritten as the hand-off to S2.

## Working notes

- Downloaded texts and the extractor lived in this session's scratchpad (`…/scratchpad/src/`, `…/scratchpad/tools/h2t.py`). They are not part of the repo, and the topic cites the public URLs.
- Nothing was published. No product file and no bootstrap file was touched. No commit was made and no state command was run.
