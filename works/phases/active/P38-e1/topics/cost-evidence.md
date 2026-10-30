# P38-e1 — cost evidence

Written by `P38-e1.DECOMP` (2026-10-31). The sources are in `/Users/sugang/projects/personal/arb_upbit_1`, all read-only, and none was refused:

- `works/phases/active/P50-4b/doc/{run,critique,outline,trace,ledger}.md` and `slices/*/result.md`;
- `works/phases/active/P51-3q/` (intent, the three `result.md`);
- `works/phases/active/P48-q4/doc/run.md`, added as the **metered v1** case;
- `python3 scripts/workflow.py dispatch-summary --phase <P>` for P50-4b, P51-3q, P42 and P48-q4, run in that repo on 2026-10-31.

All runs used plugin **0.8.0**. `$` is list price as `dispatch-summary` prices it. Opus 5.5 is $4 input / $20 output per Mtok, and Sonnet 5.5 is half that ($2 / $10). Claim counts come from a scratch id-extractor run over `ledger.md` (claims returned) and `trace.md` (claims used in the published body).

## 1. Where P50-4b's $79 went (a v2; the code had not changed since v1)

| Span | n | $ | min | Note |
|---|---|---|---|---|
| research lead (DECOMP executor) | 1 | 12.99 | 60.0 | merged 10 findings files and 19 verify records |
| code researchers | 5 | 12.99 | 38.5 | $2.60 and 7.7 min each |
| web researchers | 5 | 6.49 | 27.7 | $1.30 and 5.5 min each |
| verifier batches | 19 | 10.25 | 68.8 | $0.54 a batch, ≈ $0.040 a claim checked |
| gap reviewers | 2 | 2.74 | 9.0 | 1 gap round |
| probes (general-purpose) | 2 | 0.01 | 0.7 | |
| **research (DECOMP window), with its main thread** | | **46.37** | | |
| writer (S1 spans 1 and 3) | 1 (+1 resume) | 17.96 | 67.2 | 300k output tokens |
| critic (Opus, same model as the writer) | 1 | 10.95 | 24.0 | re-opened 34 sources, grepped 47 code claims |
| **write + critic (S1 window), with its main thread** | | **29.88** | | |
| review | 1 | 2.31 | 5.8 | window total $2.98 |
| **phase total** | | **79.22** | | main thread $2.52 (3%) |

- **Claims returned vs used vs verified.**
  - 256 claims were returned: 224 in round 1, 28 in round 2 and 4 counter-evidence claims.
  - The verifiers ran **259 claim-checks** in 19 batches:
    - 174 load-bearing claims in round 1;
    - 21 in round 2;
    - 64 at D5: the 36 candidates the outline mapped, plus the 28 main claims checked a second time with a counter-search.
  - The outline mapped 231 claims. The published body's trace cites **195**. So 61 returned claims (24%) never reached the page, and about 40 verified claims went unused.
- **Use by where the evidence lives.**
  - Code angles (code-order, code-history, applied, branches, r2-applied) returned 153 claims and **136 were used (89%)**.
  - Web angles (foundations, evidence, how-others, criticism, r2-criticism) returned 99 and **55 were used (56%)**. The weakest were evidence (7 of 20) and how-others (6 of 16).
- **Researchers per angle.** There were 8 angles in round 1 (4 code, 4 web), one researcher each, plus 2 in round 2. That is 10 researchers on a tier-3 plan, where tier 3 came from breadth 3. That is the "highest of three axes" rule at work.
- **Words per section vs the budget.**
  - The outline budgeted about **4,800 prose words**, and the brief allowed 3,000–5,000.
  - The draft came out at **~7,600**. The span-1 reader pass cut it to ~5,800. The critic then flagged the overrun (C18), and span 3 cut it to **~4,770**. The file went from 9,969 to ~8,700 words.
  - Span 3 also **rewrote `trace.md` whole** (28.9 KB) and edited `body.md` with python heredoc replacements.
  - Section budgets: Background ~450, Intuition ~800, Code ~1,600, Where the books stand ~800, Best practices ~1,150.
- **Checkable sentences.**
  - `trace.md` has about 170 sentence lines (`sN:`), plus table rows, list items, quiz keys and diagrams, across 27 heading blocks.
  - The 4,770 words carried 195 distinct claims, **≈ 24 words a claim**.
- **The critic.**
  - It re-opened **all 34 sources**, grepped 47 code claims, traced ~170 claims and answered 6 quiz items.
  - It ran on Opus with `same-model: accepted`, because the workspace's `explain-chapter.md` *The critic's model* pins `opus` (v75). It returned 8 must-fix and 14 should-fix findings. One should-fix was the length (C18).
- **What a delta could have reused.**
  - The scorer was unchanged since `e2f9b210` (C-r1-code-history-35).
  - The v2 kept 24 of v1's 27 headings, all 4 diagrams, 5 of 6 quiz items and **22 of v1's sources**. It re-opened every one of them from scratch, because the v1 dossier was used "as scouting leads only".
  - Of the 195 claims used, about 126 (65%) rest on sources that had not changed: the code-order and code-history claims and the stable literature. About 69 were new: applied, branches, r2 and counters.
  - A content-checked delta would have researched only the books and branches since 2026-10-27, plus the new must-cover items.
- **The leak.** The §2 resolver prints `KB_API_TOKEN=<key>`. The auto-mode classifier refused to run it, so the lead ran a masked resolver of its own and read the prior through `knowledge … read --source`. Rotating the key is the operator's action, outside this phase.

## 2. P51-3q's span split (the Korean translation)

| Window | span $ | main $ | total $ |
|---|---|---|---|
| DECOMP (dossier, brief and a dry-run `check`) | 0.94 | 2.01 | 2.95 |
| S1 (the translation) | **2.26** | 0.35 | 2.61 |
| REVIEW (checks, publish, private proof) | 1.98 | 0.30 | 2.28 |
| **total** | 5.18 | 2.66 | **7.84** |

- The translation itself was $2.26 (29%). The other ~$5.6 is the phase around it, and that shape belongs to the workspace, which is out of scope here.
- On the plugin side, the cost was the missing rule. A loose document has no language variants, and a `--lang ko --new-version` save onto the English would have become v3 and replaced it. The DECOMP found this with a dry-run `check` and published the Korean as its own loose document (`--slug …-ko --lang ko --translated-from en@2`, no `--new-version`).

## 3. The v1 calibration: P48-q4 (U10, `run: full`, `prior: none`, metered $73.97)

| Span | n | $ | Note |
|---|---|---|---|
| lead | 1 | 10.53 | tier 2, 18 questions, 6 angles |
| code researchers | 5 | 10.35 | $2.07 each |
| web researchers | 4 | 3.93 | $0.98 each, all `partial` |
| verifier batches | 23 | 9.71 | $0.42 a batch; 131 + 40 + 65 claims checked |
| gap reviewers | 2 | 4.04 | 1 gap round |
| writer | 1 (+1 resume) | 11.05 | ~5,950 prose words against a 4,800 budget |
| critic (Opus) | 1 | 7.25 | |
| review | 1 | 1.74 | |
| main thread | | 15.36 | $11.98 of it in the DECOMP window; cause not established |

- Claims: 215 returned, **171 used (80%)**. Code angles: 145 returned, 127 used (88%). Web angles: 68 returned, 43 used (63%).
- **A v1 is as costly as a v2 today.** The intent's v1 check names P42's bar as a v1. Its research shape would be P50-4b's tier-3 plan, which has 8 angles.

## 4. P42, the phase that built the subject

P42 cost **≥ $77.92**: main $34.71 and spans $43.21. These are floors, because 76% of the span requests logged no final usage. It ran 1 DECOMP, 2 research slices, 4 implementation slices, 1 fix and 1 review. The bar's v2 explanation cost $79.22, about as much as building the bar.

## 5. Calibration for the build slices (pinned in `breakdown.md`)

- **Words per claim:** about 25. Measured: 24 (P50-4b) and ~35 (P48-q4). The claim cap is therefore `budget words ÷ 25`: ≈ 190 for a 4,800-word document and ≈ 120 for 3,000 words. P50-4b used 195 and P48-q4 used 171, so the cap cuts the 24% surplus and the unused verifications.
- **Researchers:** a document needs about 4 (2 code + 2 web for a codebase subject).
  - Code angles land 88–89% of their claims, so two code researchers with merged angles carry the repo.
  - Web angles land 56–63%, so two web researchers carry the outside evidence.
- **Unit costs at 0.8.0:**
  - a code researcher ≈ $2.1–2.6;
  - a web researcher ≈ $1.0–1.3;
  - a verifier batch ≈ $0.42–0.54 (≈ $0.04 a claim);
  - a gap review ≈ $1.4–2.0;
  - the review ≈ $1.7–2.3.

## 6. Projected 0.9.0 costs (the cost line's first numbers; S8's desk check confirms or corrects them)

The writer and critic figures are judgment, not metered. The rest are §5's unit costs times the projected spans.

| Case | Researchers | Verifier batches | Gap | Critic | Projected $ | Metered 0.8.0 |
|---|---|---|---|---|---|---|
| v1 document, codebase (P42's bar as a v1; P48-q4's shape) | 4 (2 code + 2 web) | ~14 (≤ ~190 used claims) | ≤ 1 round | Sonnet, sampling | **≈ $35–45** | $73.97 (P48-q4) |
| v2 delta, unchanged code (P50-4b) | 1–2 code + 0–1 web | ~5 (≈ 70 new used claims) plus the reuse check | 0–1 | Sonnet, sampling | **≈ $25–38** | $79.22 (P50-4b) |
| translation of a loose document | 0 | 0 | 0 | none | **≈ $3** of write span; the phase around it is the workspace's (≈ $8 today) | $7.84 (P51-3q) |
| `quick` document | 0 (the lead alone) | 1 | 0 | none | not metered | — |
| book | top tier (§9.2), then a top-up per chapter | per chapter | per chapter | per chapter | not metered: one whole-book research plus about a document's write and critic per chapter | — |

These assumptions hold the table up:

- **The critic:** half price on Sonnet, and with ≤ 5 sources re-opened about 40% of P50-4b's volume, so ≈ $2–3. An explain phase keeps Opus until the workspace's critic-model pin changes (OQ1), so ≈ $4–5 there.
- **The writer:** ≈ $9–12. Holding the budget while drafting removes the cutting pass, and an appended trace removes the 29 KB rewrite.
- **The lead:** ≈ $5–8, with 4 returns to merge instead of 10.
