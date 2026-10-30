# P35-a4.S2 — result

## Verdict

- status: done
- route: mid
- model: opus
- effort: medium
- summary: Released the knowledge plugin as 0.8.0: `plugin.json` version and setup's `plugin_version` (both places) bumped from 0.7.0, and the landing's two skill line counts set to 2,771 (= `wc -l web/public/SKILL.md`). marketplace.json and both READMEs restate no rule S1 changed, so they are unchanged.
- files_changed: plugin/.claude-plugin/plugin.json; plugin/skills/setup/SKILL.md; web/src/content/marketing/content.ts; works/phases/active/P35-a4/phase.md (via phase-section); works/phases/active/P35-a4/slices/P35-a4.S2/result.md
- validation: plugin_parity PASS; skills_parity PASS; `grep -n '2,771'` content.ts 2 hits, `2,729` count 0; `grep -rn '0\.7\.0' plugin .claude-plugin` only uv.lock (annotated_types 0.7.0, a third-party package); `git status --porcelain .claude/ docs/` empty; `workflow.py validate` passed
- deviations: also removed the consumed `(from DECOMP, for S2)` note (its content was this slice's job), besides the planned `(from S1, for S2)` note
- doc_impact: `- **product (P35-a4.S2):** knowledge plugin released as 0.8.0 (plugin.json, setup's plugin_version) carrying S1's explain rules (subject over the records, standalone documents and chapters, subject-led titles); the landing (content.ts lede, pane.meta) counts 2,771 lines.`

## Edits

- `plugin/.claude-plugin/plugin.json` L3: `"version": "0.7.0"` → `"0.8.0"`. `description` unchanged (restates no S1 rule).
- `plugin/skills/setup/SKILL.md` L341 (`"plugin_version": "0.8.0"`) and L355 (`` `plugin_version` is `0.8.0` ``).
- `web/src/content/marketing/content.ts` L251 lede "2,771-line skill", L261 `meta: "2,771 lines · yaml + markdown"`.

`wc -l web/public/SKILL.md` → `2771 web/public/SKILL.md` (confirmed before editing).

## Item 4 checks (no change)

`grep -nE 'P[0-9]+: |link|0\.7\.0' .claude-plugin/marketplace.json plugin/README.md README.md`:

```
README.md:96:- **Pretty share links** — a hosted org can claim a durable public slug and get
README.md:98:  `/documents/{id}` and `/graph/{uuid}` links keep resolving forever.
```

Both hits are the share-link product feature, not the explain linking rule. No phase-book title, no 0.7.0. marketplace.json has no `version`; its plugin `description` remains byte-identical to plugin.json's (unchanged on both sides; plugin_parity passes).

## Validation output

```
$ python3 scripts/plugin_parity.py
PASS — plugin templates are in parity with the repo.
$ python3 scripts/skills_parity.py
PASS — explain skill copies are in body parity (web copy byte-identical); the 5 plugin agents match Part B.
$ grep -n '2,771' web/src/content/marketing/content.ts
251:  lede: "Saving isn't a form. It's a 2,771-line skill: ...
261:    meta: "2,771 lines · yaml + markdown",
$ grep -c '2,729' web/src/content/marketing/content.ts
0
$ grep -rn '0\.7\.0' plugin .claude-plugin
plugin/templates/kb/uv.lock:34:version = "0.7.0"
plugin/templates/kb/uv.lock:36:sdist = { url = ".../annotated_types-0.7.0.tar.gz", ... }
plugin/templates/kb/uv.lock:38:    { url = ".../annotated_types-0.7.0-py3-none-any.whl", ... },
$ git status --porcelain .claude/ docs/
(empty)
$ python3 scripts/workflow.py validate
Workflow validation passed.   (plus the pre-existing stale_docs / oversized_doc_sections warnings)
```

Remaining 0.7.0 hits stay: they are the `annotated-types` package version pinned in the KB template's lockfile, not the plugin version.

## Notebook

Via `phase-section`: removed Notes entries `(from S1, for S2)` and `(from DECOMP, for S2)`; appended the Doc impact line above; replaced `## Now` for the REVIEW.
