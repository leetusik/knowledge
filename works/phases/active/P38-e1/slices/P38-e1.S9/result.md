# P38-e1.S9 — result

- status: done
- route: mid
- model: opus
- effort: medium
- summary: Released the knowledge plugin as 0.9.0: version bumped in plugin.json and setup's plugin_version (both places), the landing's two line counts set to 3,347, and plugin/README.md's run text updated for the confirmation's sections and cost line, the document-sized team (at most about 4 researchers), the delta v2 ("from scratch" declines), used-claims-only verification and translations, plus one sentence on the key staying out of the transcript.
- files_changed: plugin/.claude-plugin/plugin.json; plugin/skills/setup/SKILL.md; web/src/content/marketing/content.ts; plugin/README.md; works/phases/active/P38-e1/phase.md (via phase-section); works/phases/active/P38-e1/slices/P38-e1.S9/result.md
- validation:
  - `python3 scripts/plugin_parity.py` → PASS
  - `python3 scripts/skills_parity.py` → PASS
  - landing count: `wc -l web/public/SKILL.md` = 3347; `content.ts` L251 "3,347-line", L261 "3,347 lines" → match
  - `grep -rn '0\.8\.0' plugin .claude-plugin` → one hit, history only: `plugin/skills/explain/SKILL.md:401` "(measured on plugin 0.8.0 runs," (the cost table's provenance; correct as history)
  - `uv run pytest tests/test_explain_resolver.py -q` → 2 passed
  - heading diff against `14e1cbda` (base saved to scratchpad, `^#` lines diffed) → empty
  - `git status --porcelain .claude/` → empty
  - `python3 scripts/workflow.py validate` → passed (warnings only, pre-existing debt)
- deviations: none. Step 5's optional edits were judged unnecessary: the explain skill's `description` (three copies), `plugin.json`/`marketplace.json` descriptions and the root `README.md` say "research agents ... claims verified on a second model, gap rounds, an evidence gate", which remains true and does not mislead; leaving them keeps the skill's line count and parity untouched. The permissions block was not changed (S1 changed no command form). I also adjusted plugin/README.md's intro sentence ("a team ... sized to the document", "checks the claims the document uses") because it restated the old verify-every-claim rule.
- doc_impact: `product.md`: knowledge plugin 0.9.0, and the landing counts the new line total (3,347) (P38-e1.S9).

## Detail

- Precedent: P35-a4.S2 (`364461e7`), same three files plus this slice's README text.
- `plugin/README.md` edits: intro (team sized to the document; verifier checks the claims the document uses); setup bullet (key never enters the transcript: resolver writes a `0600` header file passed by path, or the `knowledge` CLI reads it itself); confirmation paragraph (sections, at most 6, signed by the yes; the `Cost:` line, list-price dollars, never picks a cheaper run); `full` bullet (team sized by length, at most about 4; used claims fact-checked on a second model; v2 delta, "from scratch" for a full rerun); `lang=` bullet (translation is one cheap write with no research and no critic; a chapter's is its language variant, a loose document's is its own `<slug>-<xx>` document). All facts re-read from the canonical skill (§1 step 7 *The `Cost:` line*, §3.1 *Translation*, §3.4 wave sizing, the resolver block).
- Notebook (via `phase-section`): `## Doc impact` appended the line above; `## Notes for later slices` entry 4 `(from S7, for S9)` removed as consumed; `## Now` replaced (1,222 B) saying the phase is ready for REVIEW.
