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
