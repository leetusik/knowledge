- status: done
- tier: mid
- model: sonnet
- effort: high
- summary: Added §4.9 *Check* to the explain skill (CLI `knowledge check` or curl `/api/documents/check` before the publish; exit 0 publish, 1 fix and recheck, same list twice STOP, 2 skip with a report line, offline say so), mirrored byte-for-byte into the `.agents` and `web/public` copies, and bumped the plugin to 0.5.0. Exit codes verified against a scratch API.
- files_changed: plugin/skills/explain/SKILL.md, .agents/skills/explain/SKILL.md, web/public/SKILL.md, plugin/.claude-plugin/plugin.json, works/phases/active/P31/phase.md, works/phases/active/P31/slices/P31.S2/result.md
- validation:
  - `python3 scripts/skills_parity.py`: PASS
  - `python3 scripts/plugin_parity.py`: PASS
  - `python3 scripts/workflow.py validate`: passed (only pre-existing stale-docs warnings)
  - `cd cli && uv run pytest -q`: not run, no CLI guide text changed
  - live scratch check (below): PASS
- deviations: none
- doc_impact: `operations.md` — the explain skill checks before publishing (new §4.9); plugin 0.5.0

## What changed

- New `### 4.9 Check` between §4.8 and §5 (+10 lines, about 900 bytes per copy). It sits after the read-through but names §5's fields, because the check needs the publish's exact flags and payload; it refers to §5/§5.1/§6/step 8 instead of restating them. §5's 422 branch is untouched and stays the backstop.
- `.agents` and `web` copies got the identical block inserted before `## 5. Publish`; frontmatter untouched.
- `plugin.json` 0.4.0 → 0.5.0. No README/CHANGELOG lists versions (README only states the bump rule), so nothing else changed. `.claude/skills/explain/` untouched.

## Live check (scratch API only)

Setup: uvicorn on `127.0.0.1:8793`, `KB_ROOT` = a scratchpad git repo, `KB_API_TOKEN=scratch-token`, legacy mode (no `DATABASE_URL`), no Gemini key, `KB_STARTUP_REINDEX=0`, isolated `HOME`. Never `:8766`/`:3030`. Only my own PIDs were stopped; port 8793 was confirmed free.

| command | result |
|---|---|
| `knowledge check tests/fixtures/native/callouts.md --title Callouts --tag a --tag b --project scratch --source-repo /x/scratch --format native --book guide --book-kind codebase --chapter ch1 --position 1` | exit 0, `OK — would publish scratch/2026-10-21-why-lanterns-glow.md (v2)` |
| same flags on `err-raw-html.md` | exit 1, `error: the server would reject this publish (15 problems):` + one `line N: [raw-html] …` per violation |
| `knowledge --base-url http://127.0.0.1:8799 check …` (nothing listening) | exit 2, `error: cannot reach …` |
| curl `POST /api/documents/check` (bearer, `--json @payload.json`) on the valid chapter | 200 `{"ok": true, "rel_path", "version", …}` |
| same curl on `err-raw-html.md` | 422 with the `detail` list of `line`/`col`/`code`/`message` |

The exit codes match what §4.9 says to do. The scratch KB repo gained no files from the checks. The check is the publish's own request, so the curl payload needs `source_repo` (a first attempt without it returned a field-required 422, which is the same rule the skill's meta.json already states).

## Notebook

`phase.md`: consumed the two `for S2` notes, added a `for S3` note, one Doc impact line, OQ4 (decided:), and `## Now` rewritten.
