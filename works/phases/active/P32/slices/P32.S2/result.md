# P32.S2 result: research method, sources, the claim ledger, verification and the critic

- status: done
- tier: high
- model: opus
- effort: xhigh
- summary: Researched how sources are ranked, how claims are recorded and verified, how disconfirming evidence is sought, and how a critic checks a chapter against the evidence. Opened and quoted 34 primary sources (B1–B34: attribution and factuality papers, self-preference and self-correction studies, Wikipedia's sourcing policies, SIFT, lateral reading, link rot, code permalinks) and re-read S1's A1, A2 and A25. Wrote `topics/research-evidence.md`: findings for Q1–Q7, then the recommendation (dossier and ledger schema with worked web and code entries, ladder, independence rule, bar, claim rule and trace, verifier, counter-evidence, critic extension, evidence gate, `quick`, rehearsal judge), the pipeline joined with S1's for a single document and a book, and twelve hand-offs to S3.
- files_changed:
  - works/phases/active/P32/topics/research-evidence.md (new)
  - works/phases/active/P32/phase.md (`## Decisions`, `## Notes for later slices` and `## Now`, via `phase-section`)
  - works/phases/active/P32/slices/P32.S2/result.md (new)
- validation:
  - `python3 scripts/workflow.py validate`: passed (its warnings predate this slice)
  - `git diff --stat -- web/ server/ cli/ plugin/ .agents/ scripts/`: empty
  - The topic answers Q1–Q8, including the integrated pipeline (§4). Every cited id (B1–B34, A1, A2, A25, L1–L4) is a source opened in this slice, or a local file.
- deviations:
  - **Three sources were read from substitutes:**
    - Caulfield's *Web Literacy for Student Fact-Checkers* was read from Wayback snapshots, because the live site failed to connect twice.
    - Wineburg and McGrew was read from the Stanford Digital Repository, because SSRN answered 403.
    - Both are recorded in topic §6.
  - **Venues:** given only where the arXiv abstract page states one. S2's entry named venues for four papers whose pages do not; those are listed as arXiv versions only.
  - **S1's Decisions lines corrected in place** (stages, roles, gap rounds, `quick`) so they no longer point at "S2 decides". This follows the notebook rule for superseded lines; no S1 decision was dropped.
- doc_impact: none

## Validation

- `python3 scripts/workflow.py validate`: `Workflow validation passed.` The warnings it printed predate this
  slice and none concerns P32: legacy slice kinds in P22 and P26, consolidation owed by P28, P30 and P31,
  stale docs, and oversized doc sections.
- `git diff --stat -- web/ server/ cli/ plugin/ .agents/ scripts/`: empty. No product file was touched; the
  bootstrap repo was not touched.
- `phase.md` after the edits: 26,813 bytes, under the 40 KB budget. The `## Slices` block was not edited.

## Sources opened, and not opened

**Opened.** All 34 are listed with authors, dates and URLs in `topics/research-evidence.md` §6.

| Group | Sources |
|---|---|
| Claim extraction and factuality | B1 FActScore, B2 SAFE/LongFact, B3 VeriScore, B4 claim decomposition, B5 molecular facts, B6 Claimify |
| Attribution and citations | B7 ALCE, B8 AIS, B9 verifiability of generative search engines, B12 correctness vs faithfulness, B16 AttributionBench, B17 AttrScore, B18 MiniCheck |
| Verification and revision | B10 RARR, B11 Chain-of-Verification |
| Judges and critics | B13 self-recognition and self-preference, B14 self-preference via perplexity, B15 self-correction, B22 CriticGPT |
| Long context and conflicts | B19 lost in the middle, B20 WikiContradict, B21 knowledge conflicts |
| Wikipedia's sourcing rules (at named revisions) | B23 Reliable sources, B24 No original research, B25 Independent sources, B26 Verifiability, B27 Neutral point of view, B28 Identifying reliable sources (science) |
| Source credibility practice | B29 SIFT, B30 *Web Literacy* chapters 7, 10 and 42 (Wayback), B31 lateral reading (Stanford PDF) |
| Durability of evidence | B32 Pew on link rot, B33 GitHub permanent links, B34 Anthropic's long-running harness |

**Re-read from S1's saved copies:** A1, A2 (`research_subagent.md`) and A25 (MT-Bench).

**Local files:** P31.S5's `result.md` head and P31's `explain-critic.md`; `plugin/skills/explain/SKILL.md` at
`88d2e95`, read-only; S1's topic.

**Not opened.** These are never cited:

- the live webliteracy.pressbooks.com site (connection failed twice);
- the SSRN page for B31 (403);
- Wikipedia:Reliable sources/Perennial sources (downloaded, not read).

FEVER, FacTool, Self-RAG and WP:MEDRS were not attempted: none is a must-open, and the trail did not need them.

**Method.** arXiv PDFs were converted with `pdftotext`, and quotes located with a page finder. Wikipedia was
read as wikitext through the MediaWiki API, with revision ids. HTML pages were converted locally. All of it
ran in the session scratchpad, with Python run as `-I`.

## Headline findings

The detail and every quote with its locator are in the topic.

1. **A citation is a lead, not support.**
   - 51.5% of generative-engine sentences were fully supported, and 74.5% of citations supported their
     sentence (B9).
   - Citations had little correlation with factual precision (B1).
   - Up to 57% of citations were post-rationalized (B12).
   - So every claim is verified against the re-opened page, by someone other than its author.
2. **Verification fails on fine details and leans toward "supported."**
   - Over 66% of attribution errors are fine-grained details (B16).
   - ChatGPT's errors are mostly false "Supported" labels (B1).
   - Yes/no questions bias toward agreement (B11).
   - Hence the procedure: an open question before reading the quote, then an item-by-item comparison, then a
     strict label, with "unsure" never meaning `supported`.
3. **Independence comes from evidence first, model second.**
   - Self-correction without external feedback fails (B15).
   - Self-preference follows self-recognition (B13) and familiarity (B14).
   - So the verifier re-opens the source in a fresh context without the researcher's reasoning (B11), on a
     different model (Sonnet for Opus).
4. **Claims are molecular**: decontextualized and minimal (B5, B3, B2). Decomposition is unreliable (B4,
   B6), so the critic checks sentences against entries, and coverage gets its own check because precision
   metrics ignore recall (B1, B4).
5. **Ladder and independence from Wikipedia's tested policy**, plus lateral reading:
   - primary is per statement (B24), and interpretation needs a secondary source (B23, B24);
   - wire copies and churnalism count once (B23, B25);
   - exceptional claims need several sources (B26);
   - contested claims are attributed (B27);
   - credibility is checked off the page, not by checklist (B31, B29, B30).
6. **Conflicts:** given two passages, models use one (B20) and favour what they believe (B21); asked to hunt
   conflicts, they invent some (B20). Hence explicit `D-…` entries with quoted passages on both sides, never
   settled.
7. **New design choices [X]:**
   - verify after every merge, so "thin" is real and failures feed S1's cap;
   - fragments plus lead-written indexes, with one writer per file;
   - `trace.md`;
   - the critic's `ledger` and `coverage` categories;
   - an evidence gate before writing: must-cover answered, and two-thirds of load-bearing questions answered
     or contested (extrapolated);
   - `quick` keeps one verifier batch;
   - the rehearsal judge on a model different from both arms' writer.

## Notebook

`phase.md` was edited one section at a time with `phase-section`:

- **`## Decisions`:** nine S2 lines added. S1's four lines that said "S2 decides" were corrected in place.
- **`## Notes for later slices`:** removed the P32.S2 entry and the `(from P32.S1, for P32.S2)` note. Added
  `(from P32.S2, for P32.S3)` with the assumed capabilities, and `(from P32.S2, for P32.DECOMP2)`. The S3 and
  DECOMP2 entries' questions are kept intact.
- **`## Operator Questions`:** nothing appended. No question here is the operator's.
- **`## Now`:** rewritten as the hand-off to S3.
