# P30.S28 result

- status: done
- tier: mid
- model: sonnet
- effort: high
- summary: Bumped the knowledge plugin to 0.4.0 and rewrote the stale "HTML explainer" wording (plugin.json, marketplace.json, plugin README, setup skill, marketing skill band; text only). Wrote the self-contained bootstrap handoff at `works/phases/active/P30/handoff-explain.md`: delete the vendored skill, add a pointer with verified install commands, and the updater never touches anything named `explain`.
- handoff note (for the orchestrator to report): `/Users/sugang/projects/personal/knowledge/works/phases/active/P30/handoff-explain.md`
- validation (all passed):
  - `python3 scripts/skills_parity.py` PASS; `python3 scripts/plugin_parity.py` PASS
  - `claude plugin validate ./plugin` and `claude plugin validate .` both "Validation passed"
  - `pnpm --dir web typecheck && lint && test && build` exit 0
  - `python3 scripts/workflow.py validate` passed (only the pre-existing warnings)
- deviations: none of substance. Extras beyond the plan's list, all text: the setup skill's false claim that `/knowledge:explain` falls back to writing a file when the API is down now says there is no file fallback (the skill says so at its §6); the README's "landing page" and "file-write fallback" claims were removed for the same reason; a code comment in `copy-button.tsx` lost the "486-line" number.
- doc_impact: one line appended to `phase.md` (operations.md, product.md).

## Changes

| File | Change |
|---|---|
| `plugin/.claude-plugin/plugin.json` | version `0.3.0` to `0.4.0`; description rewritten for native chapters, books, general subjects; keyword `chapter` added |
| `.claude-plugin/marketplace.json` | plugin entry description, same text |
| `plugin/README.md` | the explain bullet rewritten (native chapter, books, general mode, no HTML); "explainers" to "chapters" in the setup bullet; the Docker requirement no longer claims a file-write fallback |
| `plugin/skills/setup/SKILL.md` | three "explainer" nouns to "chapter"; the "falls back to writing the explainer into the local KB" paragraph replaced with the no-fallback truth. The seed `getting-started explainer` mention (a rendered template doc) is left |
| `web/src/content/marketing/content.ts` | skill band lede: "486-line ... self-contained interactive explainer" to "775-line ... native chapter with real diagrams and a quiz"; pane meta "486 lines" to "775 lines". No layout or style touched. `FEATURE_SKILL` tick about Codex under `.agents/` stays true (parity-guarded copy exists) |
| `web/src/components/marketing/copy-button.tsx` | comment only |
| `works/phases/active/P30/handoff-explain.md` | new |

Other marketing hits (`explainers` as a plain noun for documents, "Read the explainer", terminal demo) are generic and were left; none says HTML.

## Verification of the commands in the note

Checked 2026-10-21 against `code.claude.com/docs/en/discover-plugins` and `…/plugins-reference`:
- `/plugin marketplace add leetusik/knowledge`; `/plugin install knowledge@knowledge` (in a session it opens the plugin panel to choose a scope); shell forms `claude plugin marketplace add`, `claude plugin install … --scope`, `claude plugin update <plugin>@<marketplace>`, `claude plugin marketplace update <name>`;
- skills are namespaced `/<plugin>:<skill>`, so `/knowledge:explain`;
- a `version` in `plugin.json` pins users until it changes, and third-party marketplaces auto-update off by default (the reason for the 0.4.0 bump);
- marketplace name `knowledge` and plugin name `knowledge` read from the two manifests.

## Bootstrap repo (read only, never edited)

Read at HEAD `7517446` (workspace v61). Touchpoints found and put in the note: `payload/claude/skills/explain/`, `installer/main.py` (`EXPECTED_SKILL_COUNT`, the "18 skills" print, the closing "Knowledge:" print, the two `.agents/skills/explain/*` `RETIRED_FILES` entries), `installer/README.md`, `installer/payloads/doc_bodies/operations.md`, `README.en.md`, `payload/contract.md`, the review pointer string in `review-phase`, both `reference/review.md` files and both executor agents, and about ten places in `tests/retrofit_smoke.sh`. Key hazard called out: the usual "add the dropped file's hash to `RETIRED_FILES`" release step must be skipped for `explain`, or `update-workspace` would offer to delete it.

## For the orchestrator

- `git diff --stat` touches nothing outside this repo; no commit, no state move.
- This repo's own tracked `.claude/skills/explain/SKILL.md` is the bootstrap's stale installed copy (still HTML). Delete it after the bootstrap change lands (noted in `phase.md` Notes). Not done here: the plan did not call for it and the operator may still use it until then.
- No operator question raised; no spend.
