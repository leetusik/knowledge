# P33-n3.S2 — result

- status: done
- route: mid
- model: opus
- effort: medium
- summary: Plugin bumped to 0.7.0. Both manifests now share one byte-identical description: explain runs as an explain phase in a workflow workspace v86+, with one confirmation, then research, write, check and a private publish. `plugin/README.md`, the root README, the setup skill and the KB template page now describe the front door S1 built. The landing's two line counts read 2,729.
- files_changed: plugin/.claude-plugin/plugin.json; .claude-plugin/marketplace.json; plugin/README.md; README.md; plugin/skills/setup/SKILL.md; plugin/templates/kb/docs/getting-started/{{KB_DATE}}-how-your-knowledge-base-works.md; web/src/content/marketing/content.ts; works/phases/active/P33-n3/slices/P33-n3.S2/result.md; works/phases/active/P33-n3/phase.md (via phase-section)
- validation: `python3 -m json.tool` on both manifests PASS; `claude plugin validate .` PASS; `claude plugin validate ./plugin` PASS; `python3 scripts/plugin_parity.py` exit 0; `python3 scripts/skills_parity.py` exit 0; landing counts `grep -c '2,729'` = 2, `wc -l web/public/SKILL.md` = 2729; `pnpm --dir web typecheck` PASS; `pnpm --dir web test` 395/395 PASS; stale-offer grep: 2 hits, both kept (below); `python3 scripts/workflow.py validate` PASS (only the standing stale_docs/oversized warnings)
- deviations: none. Judgment calls inside the plan are listed below.
- doc_impact: `- **(P33-n3.S2)** product: the knowledge plugin is 0.7.0; plugin.json/marketplace.json, both READMEs, the setup skill and the KB template page say /knowledge:explain runs as an explain phase and needs a workflow workspace v86+ (flags quick|no-research|book=|lang=, no resume/here, dossier in the phase folder); the landing counts 2,729 lines.`

## The edits

1. **plugin.json**: `version` 0.6.0 → 0.7.0. The new `description` (409 chars, was 368) keeps the native-chapter sentence and adds: "It runs as an explain phase in a workflow workspace (v86 or later): one confirmation, then research, write, check and a private publish. One setup skill connects the hosted KB or scaffolds your own." It drops the old "placed in a book when the work is a phase or a slice" clause, because a document is now the default.
2. **marketplace.json**: the plugin description is byte-identical to plugin.json's. The same replacement script wrote both.
3. **plugin/README.md**:
   - Intro bullet: names the explain-phase front door (v86+, asks once, hands off to `create-phase`, private publish) and says a document is the default, with a chapter or a book only on request. Removed: "a request for a whole book becomes a proposed explain phase".
   - *Explain: modes and flags*: new usage line `[quick|no-research] [book=<slug>] [lang=<xx>]`; a **Requirements:** line (workspace v86+, `/update-workspace` when older, `/knowledge:setup` once); a paragraph on what the one confirmation does (readiness check, live-phase check, prior lookup, the proposal and `## Explain` block, re-shown when a line changes, the yes goes to `create-phase`, the stops, headless creates nothing). `book=` follows S1's rule: a chapter when the book exists, else a new book. `resume` is replaced by "resuming is `/do-whole-phase <P>`". `here` is replaced by "no project copy".
   - *Where a run's files live*: the phase's `doc/` or `book/research/`, committed except `pages/`. The converter sits at `<KB_EXPLAIN_STATE>/tools/`, with `<DOSSIER>/pages/tools/` as the fallback. `<cwd>/.knowledge-explain/` is gone.
   - *Explain: permissions and the search cap*: **the heading is unchanged byte for byte**. `<ROOT>`/`<TOOLS>` follow §3.2 (the fallback drops the two `<ROOT>` rules). Added: `<SKILL_DIR>`, `<UNIT>`, and a line for the by-path lead's four extra rules (`python3 -c`, `which pdftotext`, `Read`/`Edit(/<UNIT>/**)`). "The run's first step" now reads "the research run's first step", because the front door comes first. The search-cap resume line now points at `/do-whole-phase <P>`.
4. **README.md (root)**: the plugin paragraph gains one sentence: explain runs as an explain phase and needs a workflow workspace (v86 or later) in the repository you run it from.
5. **plugin/skills/setup/SKILL.md**: `plugin_version` 0.3.0 → 0.7.0 in both places (the JSON example and the sentence calling it the current version). The two places that tell the user to run `/knowledge:explain` (the end of connect mode and the closing line) now each say, in one clause, that it runs as an explain phase and needs a workspace v86+. Nothing else in the skill describes how explain runs.
6. **KB template page**: only the sentence before §3's list changed. Explain confirms once, then researches, writes and checks as an explain phase and sends the result to the document API, "which does three things for you". The three-things list is unchanged. I checked it against the server: `documents.py`'s `RECENT_MARKER` / the recent-list insertion and the git commit in `gitops.py` show the API, not the skill, does all three, so the list was always the API's work and stays accurate.
7. **web/src/content/marketing/content.ts**: `FEATURE_SKILL.lede` "2,635-line" → "2,729-line" and `pane.meta` "2,635 lines" → "2,729 lines". No other text on the landing changed (the framing belongs to OQ1).

## Stale-offer grep

`grep -rnE 'explain resume|\bresume \[|\[here\]|`here`|knowledge-explain/|\.knowledge-explain|one-shot|one shot'` across plugin/, README.md and the landing content (server code excluded):
- `web/src/content/marketing/content.ts:183` "A one-shot `knowledge init` ...": kept. It describes the CLI's init, not explain.
- `plugin/skills/explain/SKILL.md:131` "Two words of 0.6.0 are flags no more. A trailing `here` ...": kept. This is S1's retirement rule, not an offer.
- A wider `\bresume\b` grep over the README, setup, agents, manifests and template finds only `plugin/README.md:49` ("offers to resume it or start a new version"). That is the front door's live-phase offer, which is correct.

## Observations (outside the plan's edits; not changed)

- KB template page §1 still says "If the API is down, an explainer can still be written straight to a file." The skill has no file fallback any more (§6; the setup skill says so too). This claim predates P33 and is not about how explain is run, so I left it. It is a candidate for a later template touch.
- Setup skill line 49 ("sends the current repo's directory name as each document's project") ignores general mode's subject-slug project. Also pre-existing, left as is.

## Notebook

- `## Doc impact`: one line appended (above).
- `## Notes for later slices`: both S2 entries removed (from DECOMP and from S1). The REVIEW note stays.
- `## Now`: rewritten for the review.
