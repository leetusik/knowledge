# P39-hk.S10 — result

## Verdict

- status: done
- route: mid
- model: opus
- effort: medium
- summary: The explain skill now teaches the glossary block, `term:` links, inline `` $`…`$ `` math and the `formula` block (§4.4, with *Writing TeX*: YAML quoting, `\lvert`, ASCII, limits, where the allowlist lives), the six new 422 codes (§5), the translation keep-list (§3.1), the reader's terms in the D6 outline, and the critic's unlinked-jargon and legend-order checks (B5); S3's two "until then" clauses are replaced, and the change is propagated to `.agents/`, `web/public/` and the regenerated critic agent.
- files_changed: plugin/skills/explain/SKILL.md; .agents/skills/explain/SKILL.md; web/public/SKILL.md; plugin/agents/explain-critic.md (regenerated); works/phases/active/P39-hk/slices/P39-hk.S10/result.md
- validation: `python3 scripts/skills_parity.py` PASS; `python3 scripts/plugin_parity.py` PASS; `uv run pytest tests/test_explain_resolver.py -q` 2 passed; `package/checks/cites.py plugin/skills/explain/SKILL.md <five package texts> handoff-explain.md` citations 113, bold parts 15, missing=0; `git status --porcelain .claude/` empty; P33-n3 citation check (vendored `.claude/**/*.md` + operations.md) checked=200 missing=85 (count only, unchanged from S4); the skill's new glossary and formula examples, plus inline math, a table-cell `\lvert` and `$ `ls``, parsed clean by `server/native/parse.parse_chapter`; `python3 scripts/workflow.py validate` passed (warnings only: stale docs, oversized sections, pre-existing)
- deviations: §4.1 (*Links*, *Limits*), §4.3 (scoped ids), §4.8 (before-publish list) and §4.10 step 1's summary also gained a line each, so the hard-rule list does not contradict the new forms ("Nothing else" in *Links* would otherwise refuse `term:`); B9's trace sample gained two lines (`formula <id>`, `glossary <term id> short`). No heading changed, so `topics/skill-headings.md` and the package are untouched.
- doc_impact: listed under notebook (wave)
- notebook:
  - Decisions: **Skill text for glossary and math (S10):** the Glossary is §4.2's item 5, written "when the chapter has terms this reader is new to" (not a signed part like Quiz); a short relation in a sentence is inline math, a formula the reader must study is a `formula` block; unlinked jargon at first use is a `clarity` should-fix, a term linked at every occurrence a `note`, and a legend incomplete or out of the formula's order a `math` should-fix; trace keys `formula <id> · sym <s>` and `glossary <term id> short` (B9).
  - Notes for later slices: **(from S10, for P39-hk.S11)** The skill is now 2,492 lines (recount the marketing figure from this, S4's note); its §4.4 *Writing TeX* points writers to the server's `tests/fixtures/native/tex-allowlist.tsv` and README *TeX*, a repo path the release notes may want to restate.
  - Notes for later slices: **(from S10, for REVIEW)** S10 changed no skill heading (only bold leads inside §4.4: *Glossary*, *Term links*, *Inline math*, *Formula*, *Writing TeX*); `cites.py` stays at missing=0, and P33-n3's vendored count stays 85.
  - Doc impact: product (the explain skill): the writer's grammar gains the glossary block, `term:` links, inline `` $`…`$ `` math and the `formula` block; the translation step keeps term ids and math byte for byte; the critic flags jargon left unlinked at first use (S10).
  - Now: S10 landed the skill's §4 text for the glossary, term links and math; S8 (math in the reader) runs beside it; next S9, then S11 (release 0.10.0).
  - Consumed notes, for the orchestrator to remove: `(from R1 and S7, for P39-hk.S10)`, `(from S3, for P39-hk.S10)`, `(from S6, for P39-hk.S10)`.

## What changed, by heading of `plugin/skills/explain/SKILL.md`

- **§3.1 Translation:** keep the glossary's term ids and every `term:` link id; keep every inline `` $`…`$ `` and each formula's `tex` and `sym` byte for byte; translate terms, aliases, both definitions, `reading`, `means`, `alt`; words inside the TeX stay English. The 422 sentence gains `translation-term-ids` and `translation-math` (display in order, inline as a multiset).
- **§3.10 D6:** under each heading, the display formulas and the terms it introduces; a `## Glossary` list in `outline.md` (term, term id, entry, first use), with a sample line.
- **§4 prose rules:** *Each term defined…* adds a glossary entry linked at first use; *Formulas that look good* drops the "until then" clause for the two forms (plan item 3, S3's clause).
- **§4.1:** `term:<id>` joins *Links* (a miss is an error); *Limits* gains one glossary of 1–100 terms and a legend of 1–20.
- **§4.2:** the list is In one paragraph, the signed sections, Next steps, Quiz (when kept), Glossary, Sources.
- **§4.3:** term ids as a scoped namespace, with the `#rate-limit` / `term:rate-limit` example (README *Ids*).
- **§4.4:** new bold blocks *Glossary* (fields, ~40-word `short`, no `[]` aliases, quoted numeric term, no `term:` link in a definition, example), *Term links* (explicit, never detected, first use and not every occurrence, where allowed, glossary entry vs `DEFINITION` callout), *Inline math* (form, depths, no escape, one line, no written alt: OQ7's recommendation), *Formula* (fields, `reading` with no math, legend every symbol in order, `formula-legend`, `aligned` drawn as steps, example), *Writing TeX* (block scalar or single quotes, `\lvert`, ASCII outside a text argument, refused `% # ~ $`, limits 300 / 2,000 / 20, the allowlist's location).
- **§4.8:** `term:` links resolve, TeX quoting, each `sym` in its `tex`.
- **§4.10 step 1:** the critic's summary gains the unlinked term.
- **§5 422 bullet:** `ref-missing-term`, `math-syntax`, `math-command`, `formula-legend`, `translation-term-ids`, `translation-math`.
- **B5:** Inputs item 8 reads §4.4 for glossary and formula shapes; *Clarity* gains *jargon left unlinked* (should-fix, `clarity`), folded into the existing category; *A bare symbol string* drops its "until" clause (B5's clause) and adds legend order; the rubric's should-fix list matches.
- **B9:** two trace sample lines for a formula and a glossary definition.

Every rule is from `server/native/README.md` (*The glossary*, *Inline math*, *The formula block*, *TeX*, *Limits*, *Ids*, *References*, *Ingest*) or R1's `topics/glossary-and-math.md` §1, §2, §6; nothing in the grammar was changed or extended.

## Deferred overlap

None of `D86-sd`, `D69`, `D85-qk` (e)/(f) is touched.
