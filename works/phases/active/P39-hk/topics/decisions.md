# P39-hk — decisions

_Entries moved here from phase.md by `phase-section --to-topic`, byte for byte, one `## ` block each; the pointer line left in each one's place names its block._

## Decisions 5

- **D1 signed (2026-11-03, the operator: "accept"):** job `10-reading-aids`, round `01-reading-aids`, canvas version `1793661304-517d`, signed as drawn. It covers the term marker and definition window on desktop, a bottom sheet on a phone, and the glossary in A–Z order after the quiz and before the sources. A legend symbol that is a term is linked like a term. Formulas are typeset inline and as display blocks with a reading and a "where" legend, and print gets a glossary appendix. OQ1–OQ6 stand as drawn, and the signed gaps join-G1/G2 are left as signed. Build from `## Build` → [jobs/10-reading-aids/rounds/01-reading-aids/](../../../../../docs/reference/design/jobs/10-reading-aids/rounds/01-reading-aids/)

## Decisions 6

- **The `## Explain` field set (S1):** sixteen lines, in order: unit, subject, phases, book, chapter, prior, lang, reader, depth, must-cover, leave-out, trusted sources, project, visibility, outline sign-off, worktree. `run:` and `mode:` go, since there is one run and every subject is code. `phases:` names the covering phases, or `none`. S5 mirrors the set in create-phase's route.

## Decisions 7

- **Reader and shape (S1):** §1 *The reader* is a concrete guess: who they are, what they know, what they are new to and what they will do. It is never a stock reader. In §1 *The shape*, the sections are the reader's questions in their order, plus one or two other shapes. The "In one paragraph" box and Sources are fixed; a Quiz appears only when earned, Next steps only when something is open, and Best practices are gone.

## Decisions 8

- **Research-phase hand-off (S1):** when no phase covers the subject, the confirmation offers "research first". The front door then invokes `create-phase` with the request and a `Research: <subject>` block: subject, paths, question, findings-only: yes, then: the explain only when the operator asks again. The confirmation still accepts "yes", which explains from the code alone. The text lives in §1 *The phases that cover the subject* and front-door step 8.

## Decisions 9

- **The evidence model (S2):** the writer reads only the code at one commit (`HEAD` at D0) and the covering phases' records (intent, Decisions, Notes, Operator Questions, slice `result.md` heads, `topics/` findings): no web, docs, plans or other repos. One citation form, `path:L<a>-L<b>@<sha>` (code hashed, records quoted). The record: `brief.md`, `evidence.md` (E/G/O ids), `outline.md`, `body.md`, `trace.md`, `critique.md`, `answers.md` → [topics/evidence-model.md](evidence-model.md)

## Decisions 10

- **No new things (S2):** what neither the code nor the records state is a `## Gaps` line, `stated` ("The records do not say why …") or `dropped`, never filled from outside; the code wins a disagreement with a record; glossary definitions and formulas trace to entries like sentences. Sources are a plain `## Sources {#sources-list}` section; the typed `sources` block is unused (its items need a URL).

## Decisions 11

- **v2 from phases (S2):** a v2 is the prior plus the phases since: the prior's explain phase must hold an `evidence.md` (old research dossiers never carry), and the run reads only the phases since the prior's commit and the files `git diff --name-only` lists, carrying unchanged entries (same file or hash; records re-found by quote) and gaps. `from scratch` still declines it.

## Decisions 12

- **Books from phases (S2):** codebase books only. `DECOMP` reads the whole subject into `book/research/evidence.md` and writes `book/outline.md`, each chapter naming the phases it draws from (`## Drawn from` and `## Gaps` at its head; no `summary.md`). A chapter reads its phases closer into `evidence-ch<k>.md`, then D6–D8: §9.3 has 3 items, with no top-up, gap check or chapter gate.

## Decisions 13

- **The critic's inputs (S2):** B5 checks every sentence through `trace.md` against the code at the commit and the record lines (each load-bearing citation re-opened, 10 more sampled); new category `outside`, `ledger` → `trace`; `with=dossier` only (B9 is the light record); `scratch:` dropped; its tools lose WebFetch/WebSearch; still on a second model.

## Decisions 20

- **Reading rules (S3):** §4's prose rules add *Visuals first* (a diagram, chart, figure or table wherever a picture explains better; each one D6 plans is drawn), *Short paragraphs* with one bound for writer and critic, **at most 80 words a paragraph and 3 paragraphs in a row without a break** (a visual, list, table, code block, callout or display formula), and *Formulas that look good* (typeset, with a reading and a "where" legend). No stock reader in §4.

## Decisions 21

- **Next steps (S3):** §4.5 *Next steps, and the quiz*: a `## Next steps {#next-steps}` after the signed sections, one plain-words item per `O` entry of `evidence.md`'s `## Open`, each traced, no advice of the writer's; nothing open, the part is cut to `## Not used`. No best-practices part. §4.2 *The outline, from the signed shape*: In one paragraph, the signed sections, Next steps, Quiz (only when kept), Sources.

## Decisions 22

- **The critic's reading checks (S3):** B5 adds `reading` (past the 80-word / 3-paragraph bound: should-fix), `visuals` (a passage a picture would show better, or a planned diagram missing: should-fix) and `math` (a bare symbol string in prose: must-fix; a display formula missing its reading or legend: should-fix). The paragraph length moved out of `clarity`.

## Decisions 23

- **Research machinery retired (S4):** the four research agents and Part B's B1–B4, B6–B8, B10, B11 are deleted (numbers not reused); `AGENT_ROLES` is the critic alone; `pagetext.py` keeps only `--payload`; the skill's `allowed-tools` drops WebSearch, WebFetch and pdftotext. Every copy (frontmatter, plugin README, setup, both manifests, `content.ts`, `README.md`, the KB template page) now promises codebase-only, from the phases' records, no research of its own, one writer plus one critic.

## Decisions 24

- **The research-phase route (S5):** an ordinary phase: no engine change, no marker. create-phase's new *The research route* takes the plugin's `Research: <subject>` block, confirms name and objective, writes the block's lines under *Confirmed Intent* (its `paths:` line is what the coverage greps) and stops; its `DECOMP` cuts `research` slices that read only this repo and record findings as gists plus `topics/` cited `path:L<a>-L<b>@<sha>`, gate waived → [handoff-explain.md](handoff-explain.md)

## Decisions 25

- **The version handshake (S5):** the package targets the next bootstrap release after v91 (v92 expected). Plugin 0.10.0's front door tests `workspace_version` 92 or later and a create-phase explain route listing `**phases**`; the workspace's floor is plugin 0.10.0 (an older plugin's proposal is refused, nothing created). Order: bootstrap v92 released and pushed, then P39-hk merges and pushes 0.10.0, then `/update-workspace` here (OQ8) → [handoff-explain.md](handoff-explain.md) §4

## Decisions 26

- **D85-qk in the package (S5):** (a) the workspace names the critic's model per call on the other family, `sonnet` for an Opus writer, else `opus`, never `same-model: accepted` (replaces v75's opus pin); (b) create-phase's own confirmation takes the front door's step-7 shape by pointer; (c) the review allows a write slice's appended `evidence.md` entries; (d) B5 is cited by heading, then *Your dispatch*. (e) and (f) stay open → [package/README.md](../package/README.md)

## Decisions 30

- **Skill text for glossary and math (S10):** the Glossary is §4.2's item 5, used "when the chapter has terms this reader is new to" (not a signed part like Quiz). A short relation in a sentence is inline math; a formula the reader must study is a `formula` block. Jargon left unlinked at first use is a `clarity` should-fix, and a term linked at every occurrence is a `note`. An incomplete or out-of-order legend is a `math` should-fix. Trace keys are `formula <id> · sym <s>` and `glossary <term id> short` (B9).

## Decisions 14

- **Glossary grammar (R1):** a ```` ```glossary #glossary ```` typed block, one per chapter (`limit`), placed freely. The renderer titles it `Glossary`, with the block's id. Term ids are their own namespace, scoped to the block. `[x](term:<id>)` resolves against them (`ref-missing-term`; `ref-scheme` for a term image or a term link inside the glossary). Search indexes the block; the annotation projection is unchanged → [glossary-and-math.md](glossary-and-math.md) §1

## Decisions 15

- **Math grammar (R1):** inline math is `` $`…`$ ``, a code span between two dollars, which both parsers already split identically. `$…$` is rejected because `$HOME/$USER` misfires and the two parsers' math extensions disagree. Display math is a `formula` block (`tex`, `alt`, `reading`, `where`); `formula-legend` refuses a symbol the formula lacks. Inline math is a `data-an-len` atom counting its TeX, and `syntax: 1` stays → [glossary-and-math.md](glossary-and-math.md) §2

## Decisions 16

- **Engine (R1):** Temml 0.14.0 renders MathML, server-only, rebuilt by saxes through a MathML allowlist (no raw HTML). Its `aligned` stacks the relations in Chromium, WebKit and Firefox. STIX Two Math is vendored (OFL, 403 KB) and loaded only on pages with math. No CSP change. Chromium's √ gap is corrected per instance by measurement, never by a fixed margin → [glossary-and-math.md](glossary-and-math.md) §3

## Decisions 17

- **Validation (R1):** a TeX allowlist validator, twinned in `server/native/tex.py` and `web/src/lib/native/tex.ts` and held equal by `tests/fixtures/native/tex-allowlist.tsv` and a Temml render test. Codes: `math-syntax`, `math-command`, `limit`. No new Python dependency → [glossary-and-math.md](glossary-and-math.md) §4

## Decisions 18

- **Term window (R1):** one client `TermLayer` beside `AnnotationLayer`, delegating over static server markup (markers, hidden `tw-<id>` windows). Capture-phase pointerdown and Esc compose with `annotations.tsx`, which gets only one 3-line `onKey` touch. `TAP_IGNORE` is unchanged, and the phone sheet is `.ra-sheet`, not a frame panel → [glossary-and-math.md](glossary-and-math.md) §5

## Decisions 1

- **Breakdown (DECOMP):** `build-after`: D1 designs the reading aids (critique `critic`), then R1 (research) beside S1 (front door), then S2 (evidence model, high) → S3 (writing rules) → S4 (retire research machinery) → S5 (workspace handoff package, high), then `DECOMP2` cuts the build from the signed canvas and R1. No build slices now; no slice spends money → [topics/breakdown.md](breakdown.md)

## Decisions 2

- **Codebase-only binds the explain skill only (DECOMP):** the server, the CLI (`--subject`, `--book-kind subject`) and the reader keep subject books and subject-filed documents already published; no grammar or data change, and `scripts/publish_fixture_book.py` and the book fixtures stay.

## Decisions 3

- **The release is plugin 0.10.0, in DECOMP2's last slice (DECOMP):** S1–S4 edit `plugin/**` without a version bump, so the branch never merges before the release slice; no changelog file exists, so the release notes live in `plugin/README.md` and the commit; S5's handoff names 0.10.0 as the plugin minimum.

## Decisions 4

- **Skill headings may change in this phase (DECOMP):** unlike P38-e1, research sections go; a surviving section keeps its number and heading, and every heading change lands in `topics/skill-headings.md` (old → new or deleted), from which S5 re-cites the workspace route.

## Decisions 19

- **Translation (R1):** ingest gains the 422s `translation-term-ids` and `translation-math` (display `tex` and `sym` in order; inline TeX as a multiset), beside `translation-quiz-ids`. The skill's translation step keeps both verbatim → [topics/glossary-and-math.md](glossary-and-math.md) §6

## Decisions 27

- **Breakdown (DECOMP2):** six build slices, a chain but for one wave: S6 glossary grammar (high) → S7 math grammar (high) → S8 math in the reader and on paper (high) beside S10 skill §4 text (mid) → S9 terms in the reader and on paper (high: the phone sheet's fixed placement inside the `rd` container is unpinned) → S11 release 0.10.0 (mid) → REVIEW. No slice spends money → [topics/breakdown.md](breakdown.md)

## Decisions 28

- **Glossary limits (S6):** R1's open points, settled: `aliases` absent or null is none, else 1–8 strings (`[]` is `limit`, so "none" has one spelling); no length cap on a term, an alias or a definition (no block caps a string); no `title` key; a non-mapping term is `field-type` with a null slot (quiz's rule); term ids are checked per block, and a refused second glossary's terms still resolve links (one `limit`, no cascade) → `server/native/README.md` *The glossary*

## Decisions 29

- **Math grammar settled (S7):** R1's open points. The TSV is command, context (`inline`|`display`), arity (`0 delim op limits fence 1 2 text opt1 env cell`) and a sample that must pass. One violation per formula, its first; a line break only in display TeX, never a tab; `\ `, `\_`, `\&` not allowlisted; `\limits` only after an `op`; a bare argument is one token or a symbol. Search takes a formula's `alt`, `reading` and each `means`, never its `tex` → `server/native/README.md` *TeX*

## Decisions 31

- **Math (S8):** Temml 0.14.0 output is rebuilt through R1's allowlists plus `mstyle` into React; every `style` is dropped, the meaningful ones mapped to `scriptlevel` or a class. F24's `lspace="0"` is inline only. A Temml refusal at render refuses the whole block (`kb-ch-unshowable`), never showing TeX → [S8 result](../slices/P39-hk.S8/result.md)

## Decisions 32

- **Math CSS (S8):** in the new `web/src/app/reader-aids.css`, imported by `MathLayer`. Stepped rows add the record's 0.28em gap on both sides of the relation. F27's `--ra-sym-k` is measured per chapter: widest legend symbol + 0.35em, rounded to the nearest ¼ (5.25 here, fallback 5.25), superseding OQ11's "rounded up". Review cards get linear text in `review/actions.ts`; the API is unchanged.

## Decisions 33

- **Term sheet placement (S9):** the phone sheet is the same `tw-<id>` window, restyled under `@container rd (width < 40rem)` to `position: fixed` at the viewport's bottom, in place in `.ra-float` (z-index 25: over the bars and annotation slots, under the frame's scrim and sheets). No portal, no frame slot; `reader-frame.tsx` and `reader-page.tsx` untouched. Checked live first (Chrome 156): a fixed box inside the `rd` container pins to the viewport → [S9 result](../slices/P39-hk.S9/result.md)

## Decisions 34

- **Terms wiring (S9):** `TermLayer` (client, beside `AnnotationLayer`) toggles the server's static markup. `annotations.tsx` is unchanged (R1's 3-line touch dropped): a term's click (Enter's, Space's) reaches that layer's own article click, which closes its popover or bar, and the term's click clears a native selection, which a press on a link keeps. Paper is the same DOM restyled (no `print-glossary.tsx`); the quiz's paper copies render without ids → [S9 result](../slices/P39-hk.S9/result.md)

## Decisions 35

- **Terms, what the record left (S9):** a window exists only for a term the chapter links; a hover opens only from the 40rem window form with a fine pointer; a window is placed once on open and re-placed only on resize (Read more grows it in place, as the canvas does); `.ra-keep` covers a marker's words, a term's name and its definitions, not other prose (OQ15) → [S9 result](../slices/P39-hk.S9/result.md)

## Decisions 36

- **No-wrap runs bounded (F1):** a run that fits is untouched. A `.ra-keep` wider than its whole line gets `is-wide` from `MathLayer`'s `fitKeeps` and breaks inside, F36's rule (CSS alone failed: joint spans restart a term's dotted underline, an inline-block lets a ko particle wrap away). An inline formula sits in `InlineFormula`; wider than its line it scrolls in its own box, F7's rule (region, label, fades, the ring on the outer box). Paper resets both. [F1 result](../slices/P39-hk.F1/result.md)

## Decisions 37

- **Legend box and overlay fades (F1 round 2):** OQ19, F7's rule: a symbol wider than the legend's row gets `LegendSymbol`'s `is-over`, drops its claim on the column and scrolls in the column the other symbols and `min(k em, 28%)` leave; its fade is at most a third of the box. OQ12: the display box's fade is the tables' `Fades` overlay in `.ra-mb__box`, not a mask, so its ring shows (at rest within 2/255, in the fade strip only). The inline box keeps its mask (any ground), its ring outside.

## Decisions 38

- **Prose keeps and the particle (F2):** F22 covers every inline run of a native chapter and term aliases (`Renderer.keep`; not `md`, code or string titles). A Hangul run right after an inline formula is one `.ra-keep` with the formula's box (OQ14). `fitKeeps` also flags a run past any box up to the column (a callout title), never past a scroller; it reads with the column clipped and re-runs when a pair's box turns on. `is-wide` breaks `anywhere`. ≤1.7 ms a call. [F2](../slices/P39-hk.F2/result.md)

## Decisions 39

- **Large-text controls bounded (F3):** P30.F3's rule (`max-width: 100%; white-space: normal`, a button's lines centred) covers `.rd-next .rd-btn` and `.kb-ch:not(.rv-body)` `.qz-card`/`.qz-acts .rd-btn` (`.qz-swap` centred). OQ20: `.bk-lang` wraps, so a tag that won't fit beside its link drops under it, the link whole; it breaks inside a word only past the column. OQ22: `.kb-doc__body .ra-mb__eq` scrolls sideways (FormulaBox's region). Where it fits: unchanged. [F3 result](../slices/P39-hk.F3/result.md)

## Decisions 40

- **Contents and text-only math (F4):** OQ16: `headingsOf` lists the Glossary h2 where the renderer draws it (its id and word, the lists' markup), counting toward the two-h2 threshold. OQ10: server-only `displayText` (`linearTex`) feeds `headingsOf`, `sectionTitle`, `nameOf` (so new snapshots' `block_title`) and `planCitations`; `plainText` untouched. Quotes map from their own offsets (`shownQuote`): page atoms in the reader, one read per document in Review → [F4 result](../slices/P39-hk.F4/result.md)
