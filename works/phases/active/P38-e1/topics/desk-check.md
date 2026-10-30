# P38-e1 — the desk check (S8)

Written by `P38-e1.S8` (2026-10-31): a paper proof, with no live explain run, that the rules S1–S7 wrote do what the operator asked. Every `L<n>` below is a line of the final `plugin/skills/explain/SKILL.md` (3,335 lines, unchanged by this slice). The unit costs are [cost-evidence.md](cost-evidence.md) §5. The writer, critic and lead figures are §6's judgment, not metered. Every $ is list price for the run's own spans. The workspace's phase around the run is left out, as the cost table says (L390–392).

**Verdict.** The cut holds on paper:

- a v1 sizes to 4 researchers;
- a v2 runs as a delta;
- a translation is one write span;
- every cost-table row with a number is within ±25% of the projection;
- every intent item has a line.

The misses are 15 findings (§8): 7 in the rules and the table, and 8 confirmation lines a newcomer cannot follow. None changes the sizing.

## 1. The v1 case: P42's bar as a v1

The setup:

- codebase, topic mode, `prior: none`;
- signed sections and budgets are P50-4b's outline: Background 450, Intuition 800, Code 1,600, Where the books stand 800, Best practices 1,150.

| Step | Rule (line) | Result |
|---|---|---|
| `W` | sum of the signed sections' budgets (L951–952); "this holds for a v1 exactly as for a v2" (L949–950) | 450 + 800 + 1,600 + 800 + 1,150 = **4,800** |
| wave 1 | above 3,500 → 4, the document cap (L953–954) | **4 researchers** |
| where the evidence lives | codebase: code-in-order + history as one code researcher, applied + branches + cases as another; web angles merged into ≤ 2 (L955–960) | **2 code + 2 web** |
| a prior | none, so the delta bullet is inert (L961–962: "any other v2 is sized as a v1 is") | — |
| gap rounds, ceiling | ≤ 2 researchers a round; ceiling 8 dispatches, researchers and gap reviewers (L971–973); a reviewer after each D3s (L1129) | 4 + review 1 + 2 + review 1 = **8 = the ceiling**, so at most 1 gap round can run |
| tool budgets | web 10–20 / 30, code double (L974–975) | — |
| claim cap | `C = W ÷ 25` (L976–982); split across wave 1 as `claims: ≤ <n>` (L1051) | **C = 192**, 48 a researcher |
| D3v | sends no batch (L1110–1113) | 0 verifier batches before the pick |
| D5p | picks used claims within `C`, must-cover and load-bearing first, ~25 words a claim (L1147–1161) | ≤ 192 used. P48-q4 used 171 and P50-4b 195, so ~170–192 |
| D5 | verifies only the `· used` claims, ~15 a batch, counter-evidence on the main ones (L1163–1176) | 171–192 ÷ 15 = 12–13 batches |
| the swap | one more small batch (L1186–1195) | **13–14 batches** |
| writer | each section written within its budget, counted, over 10% cut before the next (L1327, L1359–1361); the reader pass cuts nothing (L1362–1366); trace appended (L1369) | 1 span, no cutting pass, no trace rewrite |
| critic | another model, Sonnet for an Opus writer (L1739–1742); trusts verify records, re-opens ≤ 5 sources (L1759–1764, B5 L2537–2541) | 1 Sonnet span, sampling |

**Projection** (§5 unit costs):

| Span | n | $ |
|---|---|---|
| lead (judgment, §6) | 1 | 5–8 |
| D0b probes | 2 | ~0.01 |
| code researchers | 2 | 4.2–5.2 |
| web researchers | 2 | 2.0–2.6 |
| gap reviews | 1–2 | 1.4–4.0 |
| gap-round researchers | 0–2 | 0–3.9 |
| verifier batches | 13–14 | 5.5–7.6 |
| writer (judgment) | 1 | 9–12 |
| critic, Sonnet, sampling (judgment) | 1 | 2–3 |
| review | 1 | 1.7–2.3 |
| **total** | ~20–25 agents; researcher + reviewer dispatches 5–8 | **≈ $31–49**, mid ≈ $40 |

**Beside P48-q4** (metered v1, $73.97):

- researchers: 9 (5 code + 4 web), 2 gap reviews and 23 verifier batches;
- projected: 4–6 researchers, 1–2 reviews and 13–14 batches;
- the $ falls by 34–58%.

Sensitivity:

- If the lead stays at its metered $10–13 (P48-q4, P50-4b), the total is ≈ $36–54, mid ≈ $45.
- An explain phase's Opus critic (OQ1) adds ≈ $2.
- P48-q4's unexplained $15.36 main thread is the workspace's, outside the table (finding F6).

**Pass:** wave 1 sizes to **4 researchers** (2 code + 2 web), against 9. The total agent count still holds ~14 verifier batches. That is the price of verifying every used fact on a second model (the card's "never skip", L103).

## 2. The v2 case: P50-4b as a delta of its v1

The prior is the v1 of 2026-10-27. D1d finds the legacy dossier `20261027-0106-our-bar-performance-rule-v1` (L670–673: phase lookup first, then `<KB_EXPLAIN_STATE>/*/response.json`). The numbers are S5's hand-run (S5 `result.md` *Hand-run*).

| Step | Rule (line) | Result |
|---|---|---|
| a delta runs | a `full` run with a `prior:` (L649–658); D1d after D0b, before D1 (L660) | yes, not declined |
| copy | one `python3 -c` copy into `prior/` (L678–683) | 792 K |
| claims in play | verified `supported` / `partial` / `contested` with a record (L684–687) | **204** |
| code check | one `git diff --name-only`, then a same-line hash for a listed file (L688–693) | 28 paths, 2 files changed, 3 claims changed; the scorer is unchanged. **96 code claims carried** |
| web check | one fetch a source, passages re-found verbatim; `approximate` → changed (L694–698); recheck agents on haiku, ≤ 20 sources each (L713–728) | 35 exact sources, 173 passages, **2 haiku agents**; 1 approximate changed |
| carry | `C-p<N>-…` with `reused-from:` (L700–708) | **≤ 199 of 204** carried; 5 leads |
| questions | carried questions take `angle: carried`; the rest open (L936–942) | 12 carried, **8 open** (Q7–Q12, Q18, Q19) |
| size | `W_Δ = W × open ÷ all`, rounded to 100; ≤ 1,000 → 1, then the rungs (L961–967) | 4,800 × 8/20 = 1,920 → **1,900 → 2 researchers (1 code · 1 web)**, new claims ≤ 76, `C` 192 |
| pick | carried claims are picked like any other and count toward `C` (L1159–1160) | ~126 carried + ≤ 66–76 new ≤ 192 |
| D5 | a carried claim has its prior's record; a used main claim with no counter search is batched once (L1164–1167) | ≈ 70–80 checks → **5–6 batches**, plus ≤ 1 swap batch |
| gap round | as in a v1 (L1129–1143) | likely P50-4b's G-r1-01 and G-r1-02: 0–2 more researchers |

**Projection:**

| Span | n | $ |
|---|---|---|
| lead (judgment; D1d, merging 2–4 returns, the pick over ~200 carried lines) | 1 | 5–8 |
| recheck agents, haiku (judgment, not metered) | 2 | 0.3–1.0 |
| code researcher | 1 | 2.1–2.6 |
| web researcher | 1 | 1.0–1.3 |
| gap reviews | 1–2 | 1.4–4.0 |
| gap-round researchers | 0–2 | 0–3.9 |
| verifier batches | 5–7 | 2.1–3.8 |
| writer | 1 | 9–12 |
| critic, Sonnet | 1 | 2–3 |
| review | 1 | 1.7–2.3 |
| **total** | researcher + reviewer dispatches 3–6 | **≈ $25–42**, mid ≈ $33 |

**Beside P50-4b** (metered $79.22):

- it ran 10 researchers, 19 batches (259 claim-checks) and 2 gap reviews;
- projected: 2–4 researchers, 5–7 batches (≈ 70–80 checks) and 1–2 reviews;
- the $ falls by 47–68%.

**Reused:**

- the scorer's code-order and code-history claims;
- the stable literature (foundations, criticism, evidence, how-others);
- the 7 `D-` entries.

**Researched:**

- the records since 2026-10-23/27 (applications, the live books, open questions);
- P40's and P49's bars on their branches;
- the rule's revision path;
- capital staging;
- benchmark judging.

## 3. The translation: P51-3q under S7's rule

- **The rule:** a loose document's translation is a new loose document (L737–741, L1821–1823), and one write span with no research and no critic. It skips D0b–D5g and runs §4, §4.8–§4.9, then §5 (L747–748, L1737).
- **The confirmation:**
  - `run: full` stays;
  - `lang: ko (translated from en v2)`;
  - no `Sections` block;
  - the Cost line says one write span (L385–389).
- **The publish:**

      knowledge --base-url <KB_API_BASE_URL> save <tmp>/body.md --format native --json \
        --title "우리의 기준: 성과 규칙 v1" --summary "…" --tag performance-rule … \
        --lang ko --project arb_upbit_1 --source-repo /Users/sugang/projects/personal/arb_upbit_1 \
        --co-authored-by "Claude Opus 5.5 <noreply@anthropic.com>" \
        --slug our-bar-performance-rule-v1-ko --translated-from en@2

  It sends no `--new-version` and no `--rel-path`. The result is `rel_path arb_upbit_1/2026-10-30-our-bar-performance-rule-v1-ko.md`, as P51-3q's REVIEW recorded it. §5's CLI synopsis (L1800–1812) has no `--slug` slot (finding F7).
- **Projected:**
  - the write span is ≈ $2.3–3 (P51-3q's S1 was $2.26);
  - the table says **$3**, so it passes;
  - P51-3q's metered $7.84 was 29% translation. The DECOMP ($2.95) and the REVIEW ($2.28) around it are the workspace's, unchanged by this phase, so the operator still pays ≈ $7.5 (finding F6).

## 4. Three sample confirmations (per §1 step 7, L328–354)

### 4.1 A v1 document: the bar

```
Explain — confirm once; then it runs to publish.
In plain words: This explains the bar: the one set of performance rules every strategy in this repository is judged by. It is for you, the operator, who knows the strategies and basic trading terms. Afterwards you can run the scorer and read its scorecard, judge a strategy against the bar, and tell when the bar itself should change.
Sections (your yes signs them; change any line):
  1. Background — what the bar is, why one bar replaced four, and how it was built so no one could tune it to the answer
  2. Intuition — the four ideas each check rests on, shown with small made-up numbers
  3. Code — the scorer as it runs: the command, the record it reads, the stress test, the checks, the verdict
  4. Where the books stand — every use of the bar since it was signed, and what was done about it
  5. Best practices and next steps — which parts follow published practice, the known limits, and when to change the bar
  Quiz and Sources close it, as in every document.
Cost: 4 researchers (2 code, 2 web), ~14 verifier batches, ≤ 1 gap round, the critic · ≈ $35–45 at list price (the cost table, below)
Phase: Explain: the bar: performance rule v1 — one standalone document for the operator on the bar every strategy is judged by, published private
- unit: document (standalone). Say "a chapter of <book>" or "a book" to change it
- subject: the bar: performance rule v1, the one set of performance stats every strategy is judged by · mode: codebase
- run: full (agents research the sources, a second model checks every fact used, more rounds fill what is missing, a reviewer reads the draft) · or quick / no-research
- lang: en · reader: the operator, who knows this repo, its strategies and basic trading terms · must-cover: (1) why one bar: the per-phase bars it replaced and the ideas it rests on; (2) the three stages and every leg B1–B12, with thresholds and the verdict; (3) running the scorer and reading what it prints; (4) how the bar has been applied since it was signed; (5) its known limits and open questions
- project: arb_upbit_1 (private) · prior: none found
- runs on its own copy of the repository; stops only if the evidence is too thin, a reviewer's must-fix cannot be settled, or publishing fails
- permissions: manual permission mode needs the preflight's rules (§3.2)

## Explain

- unit: document
- subject: the bar: performance rule v1, the one set of performance stats every strategy is judged by
- mode: codebase
- book: none
- chapter: none
- prior: none
- run: full
- lang: en (translations: none)
- reader: the operator, who knows this repo, its strategies and basic trading terms, and wants to read a scorecard, judge a strategy against the bar, and decide when the bar itself should change
- depth: one document
- must-cover: (1) why one bar …; (2) the three stages and every leg B1–B12 …; (3) running the scorer …; (4) how the bar has been applied since it was signed …; (5) its known limits and open questions
- leave-out: the strategies' own mechanics, beyond a line where one illustrates a leg or a verdict
- trusted sources: none
- project: arb_upbit_1 (private)
- visibility: private
- outline sign-off: off
- worktree: yes

Why: prior — the knowledge base holds no document on the bar; project — the repository's root folder; reader — your words; leave-out — the strategies are a book's chapters, not this document's.
Reply yes, or change any line.
```

There is no `cheaper:` clause. The subject is not narrow and there is no prior (L370–383). The template still shows the clause unconditionally (finding F1). The template has no line for the search-cap sentence step 7 requires (finding F3).

### 4.2 A v2 document: the bar's next version, as a delta

```
Explain — confirm once; then it runs to publish.
In plain words: This updates the explanation of the bar, the performance rules every strategy here is judged by, to what changed since the last version on 30 October. It is for you, the operator. Afterwards you can read a scorecard, judge a strategy, and see where each live book stands against the bar today.
Sections (your yes signs them; change any line):
  1. Background — what the bar is and why one bar replaced four · kept
  2. Intuition — the four ideas each check rests on, with small made-up numbers · kept
  3. Code — the scorer as it runs, from the command to the verdict · kept
  4. Where the books stand today — every use of the bar since it was signed, and what was done · renamed from "Where the books stand"
  5. What changed since the last version — the rule's revisions and the new bars beside it · new
  6. Best practices and next steps — the known limits, and when to change the bar · kept
  Quiz and Sources close it, as in every document.
Cost: 1–2 code and 0–1 web researchers, ~5 verifier batches plus the recheck of the prior's sources, 0–1 gap round, the critic · ≈ $25–38 at list price (the cost table, below) · say "from scratch" for a full rerun ≈ $35–45
Phase: Explain: the bar: performance rule v1 — the next version of the standalone document on the bar, for the operator, published private
- unit: document (standalone). Say "a chapter of <book>" or "a book" to change it
- subject: the bar: performance rule v1, the one set of performance stats every strategy is judged by · mode: codebase
- run: full — as a delta of v2 (researches only what changed since 2026-10-30) · say "from scratch" for a full rerun ≈ $35–45
- lang: en · reader: the operator, who knows this repo, its strategies and basic trading terms · must-cover: none
- project: arb_upbit_1 (private) · prior: arb_upbit_1/2026-10-27-our-bar-performance-rule-v1.md v2
- runs on its own copy of the repository; stops only if the evidence is too thin, a reviewer's must-fix cannot be settled, or publishing fails
- permissions: manual permission mode needs the preflight's rules (§3.2)

## Explain

- unit: document
- subject: the bar: performance rule v1, the one set of performance stats every strategy is judged by
- mode: codebase
- book: none
- chapter: none
- prior: arb_upbit_1/2026-10-27-our-bar-performance-rule-v1.md v2
- run: full
- lang: en (translations: ko)
- reader: the operator, who knows this repo, its strategies and basic trading terms, and wants to read a scorecard, judge a strategy against the bar, and decide when the bar itself should change
- depth: one document
- must-cover: none
- leave-out: the strategies' own mechanics, beyond a line where one illustrates a leg or a verdict
- trusted sources: none
- project: arb_upbit_1 (private)
- visibility: private
- outline sign-off: off
- worktree: yes

Why: prior — the knowledge base holds v2, and P50-4b's dossier was found, so the run is a delta; sections — v2's headings, one renamed and one new for what changed.
Reply yes, or change any line.
```

The rules applied:

- the run line and the Cost line, delta form (L371–377);
- the kept / renamed / new marks (L317–319);
- the dossier lookup at the front door (L272–274).

### 4.3 A book: the bar and the strategies it judges

```
Explain — confirm once; then it runs to publish.
In plain words: This is a short book about the bar and the strategies it judges: one chapter on the bar itself, then one on each strategy and how the bar reads it. It is for you, the operator. Afterwards you can explain any strategy's standing in plain terms and see why each one was kept, scaled or retired.
Sections (your yes signs them; change any line):
  1. The bar — the one set of rules every strategy is judged by, and how to read its scorecard
  2. U10, the live book — how it trades, and where it stands against the bar
  3. The fish ladder — how it works, and what the bar said about it
  4. The Korbit book — what it did, and why it was retired
  5. Other bars — the wave-2 contest bar and the KOSPI benchmark, and why they sit beside the bar
  Quiz and Sources close each chapter, as in every document.
Cost: several runs' worth of research agents: a whole-book research, then a top-up, a write and a critic per chapter · not metered yet (the cost table, below)
Phase: Explain: the bar and the strategies it judges — a private book of about 5 chapters for the operator
- unit: book. Say "a document" to change it
- subject: the bar and the strategies it judges · mode: codebase
- run: full (agents research the sources, a second model checks every fact used, more rounds fill what is missing, a reviewer reads the draft) · or quick / no-research
- lang: en · reader: the operator, who knows this repo, its strategies and basic trading terms · must-cover: none
- project: arb_upbit_1 (private) · prior: none
- runs on its own copy of the repository; stops at the outline gate, where you sign every chapter's sections at once (no stop per chapter), and at the acceptance gate; otherwise only if the evidence is too thin, a reviewer's must-fix cannot be settled, or publishing fails
- permissions: manual permission mode needs the preflight's rules (§3.2)

## Explain

- unit: book
- subject: the bar and the strategies it judges
- mode: codebase
- book: bar-and-strategies — "The bar and the strategies it judges" (kind codebase)
- chapter: none
- prior: none
- run: full
- lang: en (translations: none)
- reader: the operator, who knows this repo, its strategies and basic trading terms
- depth: about 5 chapters
- must-cover: none
- leave-out: none
- trusted sources: none
- project: arb_upbit_1 (private)
- visibility: private
- outline sign-off: on
- worktree: yes

Why: unit — you asked for a book; book — a new slug, no book holds it; outline sign-off — a book's is on, fixed.
Reply yes, or change any line.
```

The rules applied:

- the chapters list (L320–321, L358–360);
- the book's Cost line (L384) and row (L400);
- `run: full` and `outline sign-off: on` fixed (L294–295, L306);
- the outline gate signs every chapter's sections at once (L2041–2042).

The run line still offers `quick / no-research`, which a book never applies (finding F4).

## 5. The plainness read (item 10)

I read each sample as a newcomer who has never run an explain. The plain summaries and section lines read well. The fixed lines of the template do not.

| # | Line (all three samples unless named) | What a newcomer cannot follow |
|---|---|---|
| P1 | `- run: full (…) · or quick / no-research` | "quick" and "no-research" are named, never explained |
| P2 | `Cost: … ~14 verifier batches, ≤ 1 gap round, the critic` | "verifier batch", "gap round", "critic" are the skill's own terms |
| P3 | `- project: … · prior: none found` | "prior" for "an earlier published version" |
| P4 | `- permissions: manual permission mode needs the preflight's rules (§3.2)` | "manual permission mode", "preflight", and §3.2 of which file |
| P5 | `- runs on its own copy …; stops only if …, a reviewer's must-fix cannot be settled, …` | "must-fix" |
| P6 | the book's stops line: `… the outline gate … the acceptance gate …` | "outline gate", "acceptance gate" |
| P7 | v1: `- lang: en · reader: … · must-cover: (1) … (5) …` | one ~450-character line carrying three fields |
| P8 | v2: `say "from scratch" for a full rerun ≈ $35–45` on both the run line and the Cost line | said twice, so each line runs long |

Each is a finding (§8, F8–F15). The `## Explain` block is machine-facing, the input create-phase writes verbatim, so it is read as drawn: its field names stay.

## 6. The item map

| Item | Delivered by (final skill) |
|---|---|
| 1. delta for a v2 | §3.1 *The delta* L649–658, D1d L660–712, the recheck L713–728; §3.4 L961–967 |
| 2. team sized by the document | §3.4 step 4 L949–982 (`W`, wave 1 ≤ 4, 2 code + 2 web, `C = W ÷ 25`, ceiling 8); the tier table for books only L988–1001 |
| 3. verify only what is used | card L67–68; D3v L1110–1113; D5p L1147–1161; D5 L1163–1176 |
| 4. cheaper, independent critic | §4.10 L1739–1742 (Sonnet on an Opus writer), L1759–1764 (trusts records, ≤ 5 sources); B5 L2537–2541. Workspace pin: OQ1 |
| 5. writer held to budget | §4 D7 L1327 and L1359–1361 (count, cut before the next); L1362–1366; trace appended L1369, L3079 |
| 6. no secret leakage | §2 L423–427 (never prints the key; `-H @<KB_AUTH_HEADER>`), L489, L508–511; every curl L583–586 |
| 7. honest confirmation | §1 step 7 `Cost:` L338, L366–389; the cost table L390–400 |
| 8. translations cheap | §3.1 *Translation* L730–748; §4.10 L1737; §5 L1821–1823 |
| 9. a v1 is cheap too | §3.4 L949–950 ("this holds for a v1 exactly as for a v2"); L983–984 (the v1 example); §1 of this file |
| 10. easier to understand | the plain summary L325–327, L332; §4 prose rules L1371–1390 ("In one paragraph", terms defined, example first); B5 clarity L2618–2644 |
| 11. sections up front | §1 step 5 cheap look L276–284; step 6 L313–324; step 7 L333–337; §3.1 L568–573; §3.4 L945–948; §3.10 L1271–1278; §9.2 L2041–2042 |

Every item has a line, so no item is a miss.

## 7. The cost-table check (±25%)

| Row (L396–400) | Table | Projection | Midpoints | Result |
|---|---|---|---|---|
| v1 document | 4 researchers, ~14 batches, ≤ 1 gap round · $35–45 | 4 (+0–2), 13–14 batches · $31–49 | 40 vs 40 (0%); ends −11% / +8% | **pass** |
| v2 delta | 1–2 code + 0–1 web, ~5 batches + recheck, 0–1 round · $25–38 | 1 + 1 (+0–2), 5–7 batches · $25–42 | 31.5 vs 33.5 (+6%); high end +10% | **pass** |
| translation | one write span · $3 | $2.3–3 | 3 vs 2.65 (−12%) | **pass** (the span; the phase around it, F6) |
| `quick` | not metered yet | ≈ $15–25 (my judgment: the lead $6–10, one batch of ≤ C claims $4–5, the writer $6–9, the review ~$2) | — | no number to check; F2 |
| book | not metered yet | — | — | honest as stated |

With the lead at its metered $10–13, the v1 high end is +20% and the delta's +25%, both still at or inside the bound.

## 8. Findings (misses, never edits)

The rules and the table:

- **F1** L338: `· cheaper: <delta | quick> ≈ $<c>` is shown unconditionally, but L370–383 give it only for a v2 or a narrow subject. **Fix:** write it `[ · cheaper: <delta | quick> ≈ $<c>]` and add "(only when one applies)" to L369–370.
- **F2** L380–383 vs L399: a narrow subject's Cost line adds `cheaper: say "quick"` "with its cost", but the table prices `quick` as "not metered yet". **Fix:** L381–382 to read `cheaper: say "quick"` "with its cost, or `not metered yet`" (or give the row a projected `≈ $15–25 (projected)`).
- **F3** L361–364: the search-cap sentence ("say so for a `full` run…") has no line in the template. **Fix:** add after the permissions line `- web searches: every search, the agents' included, counts against this session's limit (200 by default); start a long run in a fresh session`.
- **F4** L342 vs L294–295: a book's run line offers `· or quick / no-research`, which a book never applies. **Fix:** add to L358–360: "and its run line drops `· or quick / no-research`".
- **F5** L396: the v1 row says "(measured on a codebase subject)", but its numbers are projections. **Fix:** `v1 document (a codebase subject; projected from P48-q4)`.
- **F6** L390–392 and L398: the table leaves out the workspace's phase around the run. For a translation that is ~70% of the bill ($5.58 of P51-3q's $7.84). **Fix:** translation row `$3 (the explain phase around it adds ≈ $5 today)`, and the Cost paragraph (L366–369) adds "plus the explain phase around it, a few dollars".
- **F7** L1800–1812: the `save` synopsis has no `--slug` slot, though L738 and L1822 require `--slug <source slug>-<xx>`. **Fix:** add `[--slug <source slug>-<xx>] \` above the `[--translated-from …]` line.

The confirmation's plain lines (P1–P8 above):

- **F8** (P1) L342: **fix** `· or say "quick" (one agent researches alone, no reviewer) or "no-research" (this repository only, no web)`.
- **F9** (P2) L366–368 and the table's "What it sends" column: **fix** the Cost line's agents as `4 research agents (2 read the code, 2 search the web), about 14 fact-check batches on a second model, at most 1 extra round to fill gaps, 1 reviewer`, and the delta's `a check that v<N>'s sources still say the same`.
- **F10** (P3) L344: **fix** `earlier version: <none found | v<N>>` in the summary list. The `## Explain` field stays `prior:`.
- **F11** (P4) L346: **fix** `- permissions: if you approve tool calls by hand, add the rules the run prints first (the explain skill's §3.2)`.
- **F12** (P5) L345: **fix** `… stops only if the evidence is too thin, the reviewer finds an error the run cannot fix, or publishing fails`.
- **F13** (P6) L358–360: **fix** the book's stops line: `it stops twice for your yes: once to sign every chapter's sections together, once to accept the finished book`.
- **F14** (P7) L343: **fix** move `must-cover` to its own line, `- must-cover: <n> items, each in a section above`, or numbered, one per line.
- **F15** (P8) L373–375: **fix** say `from scratch` once, on the Cost line only. The run line keeps `- run: full — as a delta of v<N> (researches only what changed since <date>)`.

Observations, not misses: the book row has no number yet (honest, L384, L400); item 4's Sonnet critic waits on OQ1 inside explain phases.
