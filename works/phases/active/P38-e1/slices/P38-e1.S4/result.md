# P38-e1.S4 — result

- status: done
- route: high
- model: opus
- effort: xhigh
- summary: Explain now verifies only the claims the outline uses. D3v keeps its name but sends no batch. A new pick, D5p (the first step of §3.8), marks `· used` and `· main` within S3's claim cap. D5 verifies only the used claims, into `verify/final-b<k>.md`, with counter-evidence on the main ones. D5s swaps a failed used claim once, before D5g. The card, §3.3's log and resume, §3.9, §4, §9.2–§9.3 and B1/B3/B8/B9 were updated to match. Headings and Part B markers are byte-identical to `14e1cbda`.
- files_changed: plugin/skills/explain/SKILL.md; .agents/skills/explain/SKILL.md; web/public/SKILL.md; plugin/agents/web-researcher.md; plugin/agents/code-researcher.md; plugin/agents/gap-reviewer.md; plugin/agents/verifier.md; plugin/agents/explain-critic.md (all five regenerated); works/phases/active/P38-e1/phase.md (via phase-section); works/phases/active/P38-e1/slices/P38-e1.S4/result.md
- validation:
  - `python3 scripts/skills_parity.py` → PASS
  - `python3 scripts/plugin_parity.py` → PASS
  - heading diff (`^#` lines) against `14e1cbda` → empty (57 lines identical)
  - Part B marker lines (`^<!-- part-b`) against `14e1cbda` → empty (24 lines identical)
  - P33-n3 citation check → `citations checked=200 missing=2` (the baseline's two workspace-side `B5 *Your dispatch*` misses; no new one)
  - `uv run pytest tests/test_explain_resolver.py -q` → 2 passed
  - `git status --porcelain .claude/` → empty
  - `python3 scripts/workflow.py validate` → passed (warnings only, all pre-existing and workspace-wide)
- deviations: (1) the swap runs in D5s, before D5g, not at D6, so the gate counts the swapped states; (2) B1's sentence "re-opens every passage you quote" now reads "the passages of every claim the chapter uses", to stay true; (3) §8 item 3 and §3.4 step 4's claim-cap bullet each gain one clause naming the pick; (4) the writer gap first picks an unpicked candidate before any top-up, and the result is still verified once; (5) a book chapter's pick is capped by `W ÷ 25` over the chapter; (6) `quick` has no swap batch, to keep its one batch; (7) the card's "Never skip or shorten a stage" bullet gains one sentence and is not reworded. Reasons are below.
- doc_impact: `product.md`: explain verifies only the claims the outline uses, picked before verification (P38-e1.S4).

## The design chosen

The DECOMP's recommendation (`topics/breakdown.md` `## P38-e1.S4`) was taken, with one change of placement: the swap.

1. **No per-round verification.**
   - **D3v keeps its name and its heading word.** Its text now says it **sends no batch**: a round's claims stay `candidate`, and verification waits for the pick.
   - **D3v keeps a resume meaning.** A `run.md` from an earlier version of the skill that logged `D3v` batches keeps what they wrote:
     - a missing batch is not sent again;
     - D3s applies the records on disk the way D5s does;
     - a claim with a record is not verified again at D5.
   - **D3s, "the round's states":** every claim stays `candidate`, and each question takes the state its findings files report, marked `(reported)`. Two reports that differ are both written, each with its stem.
   - **B3** judges those reported states from the support lines (rung, fit, independence), and knows they are unverified.
   - The heading `### 3.6 D3: the merge, then D3v and D3s` is byte for byte.
2. **The pick, D5p.** It is the first step of §3.8, a sub-stage like D5s and D5g, so no heading changes and the stage table reads in order (D4 → D5p → D5 → D5g).
   - **When:** once research has stopped (§3.7 now ends "then go to the pick").
   - **What it does:** it maps the ledger's claims to the sections, signed or skeleton, and picks within `C`. Every must-cover item and every load-bearing question is served first, and the cap never leaves one unserved. Then each section gets what its purpose needs, at about 25 words a claim.
   - **Marks:** `· used` goes on the ledger line and in `outline.md`. The main-claim marking (`· main`) moved here from D5 and applies within the used set.
   - **Resume record:** the `D5p: used <n> of <m> claims (cap <C>) · main <k>` log line is written last, so a pick with no such line is redone whole.
3. **D5 verifies only the used claims.**
   - It sends every `· used` claim with no verify record yet, grouped by source, about 15 to a batch. Batch ids are `final-b<k>`, and the main claims carry counter-evidence in the same batch.
   - D3v's verifier-dispatch rules moved here verbatim: the agent or generic model, `researchers_model:`, `blocked` → corrected once, `same-model: accepted` only for a host that cannot choose, a batch failing twice stops (resumable), and the sequential path.
   - These are kept: the verifier on another model, one re-verification per claim at most, and `researchers_model:`.
   - In a run resumed from a `D3v` log, a used main claim that never had a counter-search also goes once. Counter-evidence is not a re-verification.
4. **The swap is in D5s (moved from D6).**
   - **What fails:** a used claim left `unsupported`, `contradicted`, `candidate` (needs-rewrite), or `partial` in a way that leaves its question open.
   - **The swap:** that claim is swapped **once** for an unpicked candidate on the same question or must-cover item, marked `· used · swap for <id>`, and verified in one more small `final-b<k>` batch. A swap is never swapped again.
   - **No swap possible:** the failed claim stays used, and D6 either states it as B8 allows or leaves it out.
   - **Why D5s and not D6:** D5g must count the states after the swap.
     - If the swap ran at D6, after the gate, the gate could stop a run that a swap would have rescued.
     - Worse, a swap that failed after the gate had passed would leave a question thin past the gate.
   - **What stays the same:** D6's outline still lists only verified used claims, and S2's section-cut rule applies unchanged.
5. **The verifier records the critic reads** (§3.8 *The records* bullet, the item 6 answer).
   - Every used claim ends with a verify record its ledger line links: `verified verify/final-b<k>.md#V-<claim id>-<n>`.
   - A run resumed from a `D3v` log may keep a `verify/r<n>-b<k>.md` record.
   - A book chapter's record is the book's `final-b<k>` or its own `verify/ch<k>-b<m>.md`.
   - B9's ledger example now shows `· used · main · verified verify/final-b2.md#…`, plus one paragraph on what `· used` and `· main` mean.
6. **The rest of the reach:**
   - **§3.9 `quick`:** D3 and D3s, D5p within `C`, then one `final-b1` batch of the used claims with `counter-evidence ids: none`. It has no swap, so its single batch stays single.
   - **§4's writer gap:** it first picks an unpicked candidate, and only then runs a top-up (D2–D3s). Either way the new claims are marked `· used` and verified once in one more `final-b<k>` batch before a sentence rests on them.
   - **§3.10 D6:** it writes from the used claims only. `## Not used` lists used claims dropped there and failed ones not stated; claims the pick left out are not listed.
   - **§9.2, a book:** the whole-book research has no pick, because each chapter picks. D5 verifies the book's main claims, with counter-evidence, **before the outline gate**, so the gate signs a map whose main claims and disagreements are checked. Every other claim stays `candidate` with reported states. The summary gains a line `verified: the <n> main claims (D5); every other claim candidate…`, so the operator sees what is and is not verified.
   - **§9.3, a chapter:** after its top-up, its own D5p runs over the frozen ledger and the overlay, within its own `C`. Each claim it uses, a frozen one included, gets an **overlay** line `· used`, and the frozen ledger is never touched. It verifies the used claims with no record into `verify/ch<k>-b<m>.md`. Counter-evidence goes on its main claims that the book's D5 did not search. The swap is included.
   - **B9 (book overlays):** the overlay line for a frozen claim wins for that chapter.
   - **B8:**
     - `candidate` now names "until the final verification checks the used claims, and for good a claim never picked, a book's main claims aside";
     - `answered` and `thin` are judged over the used claims once the pick has run;
     - reported states are carried as `(reported)`.
   - **B4:** unchanged. Its dispatch form already covers it, and only which claims it gets changes.
   - **The card:**
     - the D3v row is `you (D3v sends no batch, §3.6)` with `—`;
     - a new `D5p pick` row;
     - the D5 row reads "on the used claims only, with counter-evidence on the main ones" and writes "the swap";
     - the `full` and `quick` bullets say "the pick".
   - **The card's "Never skip or shorten a stage" rule:** its text is unchanged, with one sentence added: "Verification is sized to the claims the outline uses (§3.8), never skipped."
   - **The headings:** all byte for byte, and no new `## Explain` field or `run:` value.

## Read-through: the card against §3.3, §3.6–§3.10, §9.2, §9.3

| Card row | Where it is defined | Agrees? |
|---|---|---|
| D3 merge | §3.6 D3 steps 1–6. Step 4 now notes states are "as reported until D5s sets them from the verify records". | yes |
| D3v, D3s: you, no batch; statuses are the researchers' own, every claim `candidate`; no stop | §3.6 *D3v* ("sends no batch") and *D3s, the round's states*. The old "a batch fails twice" stop is gone with the batch. | yes |
| D4 gap round: B3, then D2–D3s | §3.7: B3 judges reported states, and research stops, "then go to the pick (D5p, §3.8)". B3 has the matching "Most of what you read is unverified" paragraph. | yes |
| D5p pick: `· used`/`· main` within the cap | §3.8 *D5p, the pick*, first paragraph of §3.8. The cap is §3.4 step 4's `C` (its bullet now says the pick holds used claims to `C`). | yes |
| D5, D5s: verifiers on the used claims only, counter-evidence on the main ones; writes `verify/final-b<k>.md`, statuses, the swap, disagreements, `gaps/final.md`; stops when a batch fails twice | §3.8 *D5* (used claims only, `final-b<k>`, main claims with counter-evidence, a batch failing twice stops) and *D5s* (statuses, disagreements, *The swap*, *The records*, then `gaps/final.md`). | yes |
| D5g evidence gate | §3.8 *D5g*, unchanged byte for byte (S2's rule). It reads states D5s set from the used claims' records. | yes |
| D6 the reader's path | §3.10: "from the used claims (D5p) and the statuses D5s gave them". | yes |
| D7 write: "a writer gap is stated or dropped" | §4's writer gap: a pick or a top-up, verified once, else stated or dropped. The row's wording was not touched; it names the fallback, as before. | yes (unchanged) |
| §3.3 `## Log` template | Order D2 → D3 → D4 → **D5p** → **D5** (with `swap:`) → D5g. The `D3v r1` line was removed, because a new run writes none. | yes |
| §3.3 resume steps 3–4 | Step 3: a missing D5 batch is the used claims with no record; research stopped with no `D5p` line → pick whole; an old `D3v` log → send none again. Step 4: "Then D5–D5g again, the pick first …" keeps the original phrase. | yes |
| §3.9 `quick` | D3, D3s, D5p within `C`, one `final-b1` batch, D5s without counter-evidence or swap, gaps, D5g, D6, D7. The card's quick bullet says "the pick and one verifier batch of the claims it uses". | yes |
| §9.2 book | D2–D4 (D3s on reported states), then D5–D5s on the book's main claims before the outline gate, then gaps, the outline, the summary with its new `verified:` line, and the freeze. No pick at book level, stated. | yes |
| §9.3 chapter | Gap check (B3 chapter scope, frozen + overlays) → top-up → its D5p over frozen + overlay within its `C` → verify the used claims with no record (`ch<k>-b<m>`) → D5s with the swap into the overlay → its D5g → D6–D7. | yes |

Checked against the workspace references, without editing them:
- `explain-decomposition.md`: "`full` runs §3.4 through §3.8", "D0–D5g and D6", and the book's "D5–D5s and `gaps/final.md` … no gate stop". All still hold, because the pick is inside §3.8 and the book still runs D5–D5s before its gate.
- `explain-chapter.md`: the `trust`/`drop` resume note still holds.

## The resume walk

1. **Mid-wave** (stage `D2 wave`, some `findings/r<n>-*.md` missing).
   - Step 3 re-dispatches only the missing researchers, then D3 merges the files the indexes do not list.
   - D3s writes reported states, and no verify batch goes out. D4's review follows.
   - **An old `run.md` stopped at `D3v`:** step 3 says send none of the logged batches again. The records on disk stand (D3s applies them as D5s does), and the run goes on to D4.
2. **Research stopped, before the pick.**
   - The log has D4's `stop: complete | stalled | capped: …` (in `quick`, its D3s) and no `D5p` line. Step 3 says run the pick, whole.
   - Because the `D5p` log line is written **last**, a pick interrupted halfway, with marks partly written, has no line and is redone whole from the ledger. Nothing past it, D5 included, has started, since D5 begins only after the line.
3. **Mid-D5.**
   - The `D5p` line exists and some `verify/final-b<k>.md` are present. Step 3: a missing D5 batch is "the used claims that have no record yet". The lead lists `· used` claims with no `V-<id>-` record in `verify/` and batches them again, by source, about 15 a batch.
   - Present files are merged (D5s). Records already written are never re-sent, so one verification per claim holds.
   - **Mid-swap:** each swap is already marked `· used · swap for <id>` before its batch goes, so an unreturned swap batch is just "used claims with no record". The `swap for` mark stops a second swap of the same question's claim.
4. **The D5g `trust` resume note.**
   - Step 4: `trust <source>` joins trusted sources and buys one more round, beyond the round cap, on the failed items (D2–D3s). Then "D5–D5g again, the pick first".
   - The round's new claims for the failed items join the pick, past the claim cap for those items only. The claims already used keep their marks and records.
   - D5 sends only used claims with no record. A failed used claim that the round gave new support goes once as B4's `re-verify` (`-2` record), never twice.
   - D5s, with the swap for new failures, and D5g then run on the new states.
   - **`drop <item>`:** it shrinks must-cover. The pick adds nothing and D5 sends nothing, because every used claim has a record. D5s re-sets the states and D5g recounts with S2's rule: two-thirds over the remaining sections, and a must-cover section is never cut.
   - **A book chapter's `trust`** (`explain-chapter.md`): the same, from `run-ch<k>.md`, into its overlay.

## Hand-run: P50-4b (v2) and P48-q4 (v1)

Sources: `topics/cost-evidence.md` §1 and §3, plus a read-only tally of each run's `verify/*.md` and `ledger.md` in `/Users/sugang/projects/personal/arb_upbit_1/works/phases/active/{P50-4b,P48-q4}/doc/` (verifier header `claims:` sums and `verdict:` labels).

| | P50-4b today (0.8.0) | P50-4b under S4 | P48-q4 today | P48-q4 under S4 |
|---|---|---|---|---|
| claims returned / in the ledger | 256 | same research | 215 (225 ledger lines) | same research |
| claims used (trace) | 195 | **≤ 192** (`C` = 4,800 ÷ 25; the pick holds 3 fewer) | 171 | **171** (under `C` 192; the cap is not a target) |
| verifier checks | 259 per cost-evidence (headers on disk: 258 = 174 r1 + 21 r2 + 63 final, the final ones incl. 28 main re-checks) | **≈ 192–194** (each used claim once; 27–28 main claims carry counter-evidence in the same batch; ≤ 2 swaps) | 236 (cost-evidence; 239 records on disk) | **≈ 171** (0 swaps expected) |
| batches | 19 (12 r1 + 2 r2 + 5 final) | **≈ 13–14** (⌈192 ÷ 15⌉ = 13, plus at most one small swap batch) | 23 dispatched (22 files: 12 r1 + 4 r2 + 6 final) | **≈ 12** (⌈171 ÷ 15⌉ = 12, plus a swap batch only if one fails) |
| verifier $ (per-claim rate of each run) | $10.25 ($0.040 a check) | **≈ $7.6–7.7** (−25%) | $9.71 ($0.041 a check) | **≈ $7.0** (−28%) |
| failing labels | 0 of 258 records (230 supported, 28 partial); ledger shows 2 `unsupported` (bar not met) | those 2 are the only swap candidates | 0 of 239 (227 supported, 12 partial) | none to swap |

What the numbers say:
- **P50-4b, the plan's expectation:** about 195 used claims in about 13–14 batches, against 259 checks in 19. That holds: ≈ 192–194 checks in 13–14 batches.
- **Per-round verification steered no gap decision in either run.** Not one claim-check failed across the 497 records of the two runs. The researchers' reported states would have led the gap reviewer to the same rounds, which is the evidence behind dropping D3v.
- **Where the saving comes from:**
  - the ≈ 40 verified-but-unused claims in each run are no longer checked (P48-q4: about 236 − 26 main re-checks − 171 used ≈ 39);
  - the main claims are no longer checked twice (28 and 26 re-checks).
  - Those two account for the drop: 259 → 192 and 236 → 171.
- **What stays the same:** the counter-evidence work on the ≈ 27 main claims is unchanged. The per-batch cost rises a little, because each batch is fuller and carries some of those searches. The per-claim estimate above accounts for that; a per-batch estimate (13 × $0.54 ≈ $7.0; 12 × $0.42 ≈ $5.0) would understate it.
- **Cost line:** this matches `cost-evidence.md` §6's "~14 (≤ ~190 used claims)" for S7.

## Deviations, with reasons

1. **The swap moved from D6 to D5s.** D5g must count the post-swap states. At D6 the gate would either stop a run a swap would have rescued, or pass a question a failed swap later made thin. D6 still lists only verified used claims.
2. **B1's sentence** "A verifier on another model re-opens every passage you quote" became "re-opens the passages of every claim the chapter uses". The old text was no longer true. It sits in the web-researcher extract, which regenerates anyway.
3. **§8 item 3** gains "the pick's `used <n> of <m>`", and **§3.4 step 4's claim-cap bullet** gains one sentence tying the pick to `C`. Both are within the canonical file and add one clause each, so the report and the cap name the pick.
4. **The writer gap first picks an unpicked candidate.** It is cheaper than a top-up, and it is still verified once in a `final-b<k>` batch.
5. **A chapter's pick is capped by `C` from the chapter's `W`.** S3 left a book's researchers `claims: none`, but a chapter's pick needs the same bound a document's has.
6. **`quick` has no swap.** The card promises it one verifier batch.
7. **The card's "Never skip" rule** was not reworded; one sentence was appended. Nothing else in the rule contradicts the pick, but a lead reading "D3v sends no batch" beside "never skip a stage" deserves the explicit line.

## The notebook

Written through `phase-section` only:
- `## Decisions` +1 (the design gist);
- `## Doc impact` +1 (`product.md` …, S4);
- `## Notes for later slices` +3 (for S5: reused claims enter the pick; for S6: the verify records the critic can trust; for S8 and REVIEW: the writer-gap clash, below);
- `## Now` rewritten (1,510 B, under its 2 KB budget).

The DECOMP notes addressed to "S4 and S5" and "S1–S7" were kept, because S5–S7 still need them.

## Observation (out of scope, for a workspace follow-up)

`.claude/skills/do-whole-phase/reference/explain-review.md` step 1 treats any change after DECOMP to `ledger.md`, `findings/`, `verify/` or `gaps/` in a document phase as a finding. §4's writer gap writes exactly those files in the write slice, through a top-up today and, after S4, also through an unpicked candidate's `final-b<k>` batch. The clash predates S4 (the old top-up had it). It is a workspace-side rule, so it is recorded as a note for S8 and the REVIEW, not changed here.
