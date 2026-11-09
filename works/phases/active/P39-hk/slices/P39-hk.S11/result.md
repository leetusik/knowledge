# P39-hk.S11 — result

- status: done
- route: mid
- model: opus
- effort: medium
- summary: Cut plugin 0.10.0 without pushing or tagging. `plugin.json` is 0.10.0 and setup's `plugin_version` matches. The explain front door now requires workspace v92 or later and a create-phase explain route listing `**phases**`, and both refusal texts name v92 (all three skill copies are in parity). Every "v86 or later" moved to v92, the landing's skill count is 2,492 lines, and the plugin README carries the reading aids, the v92 handshake and the stored-sources scan checklist line. The release gate is green.
- files_changed: plugin/.claude-plugin/plugin.json; .claude-plugin/marketplace.json; plugin/README.md; plugin/skills/setup/SKILL.md; plugin/skills/explain/SKILL.md; .agents/skills/explain/SKILL.md; web/public/SKILL.md; README.md; plugin/templates/kb/docs/getting-started/{{KB_DATE}}-how-your-knowledge-base-works.md; web/src/content/marketing/content.ts; works/phases/active/P39-hk/slices/P39-hk.S11/result.md; works/phases/active/P39-hk/phase.md (through phase-section)
- validation: `python3 scripts/skills_parity.py` PASS; `python3 scripts/plugin_parity.py` PASS; `uv run pytest tests/test_explain_resolver.py -q` 2 passed; `package/checks/cites.py plugin/skills/explain/SKILL.md <five package texts> handoff-explain.md` citations 113, bold parts 15, missing=0; `git status --porcelain .claude/` empty; P33-n3 citation check (vendored `.claude/**/*.md` + operations.md) checked=200 missing=85 (count only, unchanged since S4); `pnpm --dir web typecheck` pass; `wc -l plugin/skills/explain/SKILL.md` = 2492 = content.ts L251/L261 "2,492"; `grep -rn "v86" plugin README.md .claude-plugin web/public/SKILL.md` 0 hits; release gate: `uv run pytest -q` 183 passed, 60 skipped, 1 warning; `pnpm --dir web lint` exit 0; `pnpm --dir web test` 40 files, 583 tests passed; `pnpm --dir web build` exit 0 (13 static pages, worktree `web/`); `python3 scripts/workflow.py validate` passed (warnings only, pre-existing)
- deviations: (1) The previous releases have no release-notes section in `plugin/README.md`: they updated the README's description in place (see f0179a7b). So 0.10.0 does the same. S1–S4's text already covers codebase-only, one writer plus one critic, the suggested reader and shape, and the research-phase offer. This slice adds a reading-aids sentence (the glossary, `term:` links, typeset formulas), the v92 handshake in *Requirements*, and the stored-sources scan as release-checklist item 5. The full notes are below, for the commit. (2) The scan line names both readings: the breakdown/R1 note's `` ```glossary ``, `` ```formula `` and `` $` ``, and the plan's `term:` links.
- doc_impact: `(P39-hk.S11) product.md, operations.md, qa.md: plugin 0.10.0 released (unpushed); the explain front door now requires workspace v92 or later plus a create-phase explain route listing **phases** (was v86 and **unit**), both refusals name v92; the landing skill count is 2,492 lines; the plugin release checklist gains the stored-sources scan before deploy`
- notebook: written directly through phase-section (not a wave): removed Notes 6, 7, 8, 11; appended one Note for REVIEW and the integration; appended the Doc impact line above; replaced Now
- operator_need: none

## Detail

**Front door** (`plugin/skills/explain/SKILL.md`): L3's description, L25 and step 2 (L282–L292) move to "92 or later". The readiness test now looks for the `**phases**` field (the literal `phases` line only that route writes) in place of `**unit**`. Both refusal texts name v92. Part B is unchanged, so `plugin/agents/explain-critic.md` was not regenerated. No heading changed, so `topics/skill-headings.md` and the package are untouched. The skill stays at 2,492 lines. The step-2 edit swapped lines without adding any.

**Copies.** `.agents/skills/explain/SKILL.md` was rebuilt from the canonical file with the `argument-hint:` / `allowed-tools:` lines dropped. `web/public/SKILL.md` is a `cp`.

**Version strings.** `plugin.json` is 0.10.0 and its description says v92. `marketplace.json`'s description matches. Setup L170, L342, L356 and L461 are updated. Root README L37 and the KB template page L71 move to v92. A repo-wide grep finds no remaining `0.9.1` or "86 or later" in plugin/, README.md, .claude-plugin/, web/public, web/src, tests/, server/ or scripts/.

**Handshake check.** The package's `create-phase/explain-route.md` lists `- **phases**:` (L16), so a v92 workspace built from it passes the new step 2.

**Dev servers.** Before the build I listed the listeners. The only `next dev` is pid 61551 → next-server 8452 on `:3030`, with cwd `/Users/sugang/projects/personal/knowledge/web` (the main checkout). `:8766` is pid 80074, also in the main checkout. There is no worktree dev server. Neither server was touched.

**Pre-existing failures:** none. Every gate check passed.

**Deferred overlap.** This slice settles none of the `D86-sd`, `D69` or `D85-qk` (e)/(f) items.

## Release notes (for the commit)

```
feat(plugin): P39-hk.S11 release the knowledge plugin as 0.10.0, explain from the phases

Plugin 0.10.0 needs workflow workspace v92 or later (bootstrap v92 first).

- Codebase-only: /knowledge:explain writes only from the code and what the
  workspace's phases recorded (intent, decisions, notes, slice results,
  research findings). No web search, no research agents. A subject with no
  code in the repo is declined.
- One writer plus one critic: one writer drafts the native chapter, every
  sentence traced to a code range or a record line, visuals first; one critic
  on another model checks it; one revision; a private publish. The four
  research agents are retired; the plugin ships only knowledge:explain-critic.
- The confirmation suggests the reader (who they are, what they know, what
  they are new to) and the shape (the sections as that reader's questions),
  with one or two other shapes to pick from; the yes signs them.
- When no phase covers the subject, it offers "research first": a research
  phase that reads the code and records findings a later explain runs from.
- Glossary and term: links: a chapter can carry a glossary block whose terms
  the text links with term:<id>; the reader opens each term's definition in a
  window (a bottom sheet on phones), adds a Glossary section, and prints a
  glossary appendix on paper.
- Typeset formulas: inline $`...`$ math and a formula block with a plain
  reading and a "where" legend, validated at publish against a TeX allowlist
  and typeset as MathML (Temml, STIX Two Math) in the reader and on paper.
- The v92 handshake: the front door requires workspace_version 92 or later and
  a create-phase explain route that lists the **phases** field; both refusal
  texts name v92. v92's route refuses an older plugin's proposal and creates
  nothing, so update the plugin and the workspace together.

Release checklist: before deploying a server that accepts the new grammar,
scan the stored native sources once for ```glossary, ```formula, $` (a $
beside a code span, now inline math) and term: links; a hit means syntax: 2
instead of the additive syntax: 1.

Not pushed or tagged: release bootstrap v92 on GitHub first, then merge and
push this branch, then /update-workspace (OQ8).
```
