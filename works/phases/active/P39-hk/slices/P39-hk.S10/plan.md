# P39-hk.S10 — the explain skill's §4 grammar text for the glossary, term links and math

## Context

S6 and S7 added three things to the native grammar (commits `62054765`, `23649f40`):
- the `glossary` block and `term:<id>` links;
- inline `` $`…`$ `` math, the `formula` block and the TeX allowlist;
- the translation 422s.

The explain skill (`plugin/skills/explain/SKILL.md`) must now teach the writer to use them, and teach the critic to check them. S3 left two "until then" placeholders for this moment. This slice writes that text. It documents a settled grammar and invents nothing. The grammar's own spec is `server/native/README.md`.

The operator's intent is in `intent.md` § *Scope Added at Execution*. B asks for formulas that look good, with a plain-words reading and a "where" legend. C asks that glossary definitions and formulas trace to the code and the records.

## Read first

- `phase-section P39-hk Decisions`:
  - R1's *Glossary grammar*, *Math grammar*, *Validation*, *Translation* and *Term window* lines;
  - S6's *Glossary limits*;
  - S7's *Math grammar settled*;
  - S3's *Reading rules* and *The critic's reading checks*, now in `topics/decisions.md` behind their pointers.
- `phase-section P39-hk "Notes for later slices"`: the entries `(from R1 and S7, for P39-hk.S10)` and `(from S3, for P39-hk.S10)`. In `topics/notes-for-later-slices.md`, the block `(from S6, for P39-hk.S10)`.
- `server/native/README.md`: the exact grammar, codes and rules.
- `topics/breakdown.md` → `## P39-hk.S10` and `## Pins for every skill slice (S1–S4, S10, S11)`.

## The work, by heading of `plugin/skills/explain/SKILL.md`

1. **§4.4, the grammar, block by block.** Add:
   - **The glossary block**, by the convention `` ```glossary #glossary ``, placed after the quiz and before `## Sources`. Its fields: `id`, `term`, `aliases` (absent, or 1–8), `short` (about 40 words) and `long` (optional). One per chapter. Term ids are their own namespace.
   - **`term:` links**: written explicitly, never auto-detected, and not on every occurrence; a term link inside a definition is refused. Say when to use a glossary entry and when a `DEFINITION` callout.
   - **Inline math `` $`…`$ ``**, with its no-escape rule: a space before a literal `$` beside a code span.
   - **The `formula` block**: `tex`, `alt`, `reading` (no math in it) and `where`, with 1–20 `{sym, means}` items, where `means` may carry a `term:` link. Add the `formula-legend` rule: every symbol the formula uses, in order.
   - **R1's gotchas**: TeX in YAML goes in a block scalar or single quotes, and `|` in a table cell is written `\lvert`. Add the allowlist's limits (inline 300, display 2,000, depth 20) and where to find the allowed commands, in one line.
2. **§5's 422 bullet** (*Common ones*) gains `ref-missing-term`, `math-syntax`, `math-command`, `formula-legend`, `translation-term-ids` and `translation-math`.
3. **Replace the two "until then" clauses** with the forms: S3's in §4 *Formulas that look good*, and B5's *A bare symbol string*.
4. **§4.2's list** gains the glossary. In order: In one paragraph, the signed sections, Next steps, Quiz (when kept), Glossary, Sources.
5. **The outline** (§3's outline and D6) lists the reader's terms. Every definition and formula traces to evidence like any sentence (S2's model).
6. **The translation step** keeps byte for byte every term id, every `` $`…`$ ``, and every `tex` and `sym`. It translates terms, aliases, definitions, readings, legend meanings and `alt`. Formula words stay English.
7. **The critic (B5)** flags jargon left unlinked on first use. Fold this into an existing category, or add one with its severity, consistent with S3's three checks. Regenerate `plugin/agents/explain-critic.md`'s body with `python3 scripts/skills_parity.py --write-agents`, and keep its frontmatter.
8. **The inline form carries no written alt.** That is OQ7's recommendation, which the build follows.
9. **Propagate:**
   - `.agents/skills/explain/SKILL.md`: the canonical body byte-equal, its frontmatter without `argument-hint:` / `allowed-tools:`;
   - `web/public/SKILL.md`: `cp`.
10. **Headings:** log every heading change in `topics/skill-headings.md`. If a heading S5's package cites moved, update `package/**` / `handoff-explain.md` so `cites.py` stays at missing=0.

## Validation

- `python3 scripts/skills_parity.py` → PASS.
- `python3 scripts/plugin_parity.py` → PASS.
- `uv run pytest tests/test_explain_resolver.py -q` passes.
- `python3 works/phases/active/P39-hk/package/checks/cites.py plugin/skills/explain/SKILL.md <the five package texts> works/phases/active/P39-hk/handoff-explain.md` → missing=0. See S5's `result.md` for the exact invocation.
- `git status --porcelain .claude/` shows nothing of this slice's.
- P33-n3's citation check: record the count only.
- Nothing of `web/` changes beyond `web/public/SKILL.md`.

## Wave

- **Set:**
  - `plugin/skills/explain/SKILL.md`;
  - `.agents/skills/explain/SKILL.md`;
  - `web/public/SKILL.md`;
  - `plugin/agents/explain-critic.md` (regenerated only);
  - `works/phases/active/P39-hk/topics/skill-headings.md` (only on a heading change);
  - `works/phases/active/P39-hk/package/**` and `works/phases/active/P39-hk/handoff-explain.md` (only if a cited heading moved).

  Plus this slice's `result.md`.
- **Beside it:** `P39-hk.S8` (math in the reader and on paper). Its set is `web/package.json`, `web/pnpm-lock.yaml`, `web/src/lib/native/{mathml.ts,render.tsx}`, `web/src/components/reader/{formula-box,scroll-box,math-layer,reader-article}.tsx`, `web/src/lib/reader/{radicals,notes-load}.ts`, `web/src/content/chapter.ts`, `web/src/app/{reader,reader-aids,kb-print,reader-fonts}.css`, `web/public/fonts/**`, the review card files, the old-version page, `tests/fixtures/book/reading-aids.*`, `scripts/publish_fixture_book.py`, `web/tests/{native-math,reader-anchor}.test.ts`, and, only if Temml refuses a sample, the TeX TSV, `tex.py` / `tex.ts` and the math fixtures with their template copies. S8 holds the ports, `web/node_modules` and Chrome. This slice needs none of them.
- **Commits waiting:** none.
- **Join-rebuilt artifact:** none.
- **Checks scoped to this set:** the validation above, which is Python-only.
- **Rules:**
  - write no `phase.md`, and run no writing engine command;
  - return notebook entries in the verdict's `notebook` field: Decisions (only a choice the grammar left), Notes for later slices (for S11 and REVIEW), Doc impact (one line), Now;
  - name the notes this slice consumed, for the orchestrator to remove;
  - edit nothing outside the set; any other file means `needs_operator`, naming it;
  - no `plugin.json` version bump, and nothing under `.claude/`.

## Dispatch

route=mid
reason=kind implementation rated low
subagent_type=slice-executor
model=opus
pass_model=yes
effort=medium
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
