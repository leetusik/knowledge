# P39-hk.S4 — result

## Verdict

- status: done
- route: mid
- model: opus
- effort: medium
- summary: Retired the explain's research machinery. The four research agents and Part B's B1–B4, B6–B8, B10 and B11 are deleted, `AGENT_ROLES` is the critic alone, and `pagetext.py` now only builds the curl `--payload`. The skill's frontmatter and every product copy (plugin README, setup, both manifests, `content.ts`, `README.md`, the KB template page) now say: codebase-only, written from the phases' records, no research of its own, one writer plus one critic.
- files_changed: plugin/skills/explain/SKILL.md, .agents/skills/explain/SKILL.md, web/public/SKILL.md, plugin/agents/web-researcher.md (deleted), plugin/agents/code-researcher.md (deleted), plugin/agents/gap-reviewer.md (deleted), plugin/agents/verifier.md (deleted), scripts/skills_parity.py, plugin/README.md, plugin/skills/setup/SKILL.md, plugin/.claude-plugin/plugin.json, .claude-plugin/marketplace.json, web/src/content/marketing/content.ts, README.md, plugin/templates/kb/docs/getting-started/{{KB_DATE}}-how-your-knowledge-base-works.md, works/phases/active/P39-hk/topics/skill-headings.md, works/phases/active/P39-hk/phase.md (via phase-section), works/phases/active/P39-hk/slices/P39-hk.S4/result.md
- validation: skills_parity PASS; plugin_parity PASS; pytest tests/test_explain_resolver.py 2 passed; `pnpm typecheck` passed (run against the main checkout's node_modules through a temporary symlink, removed afterwards); retired-agent git grep returned no hits; WebSearch/WebFetch/pdftotext/no-research/general-mode grep left 1 hit per copy, accounted for below; `git status --porcelain .claude/` empty; workflow validate passed; P33-n3 citation check `checked=200 missing=85` (count only)
- deviations: (1) B12 is kept, because §5's curl form runs `pagetext.py --payload`. Its program is trimmed to `--payload` alone: the HTML converter, `--find` and `--check` served only the retired B11. It is renamed "the payload builder" in B12, §2 and §3.2, and the file name stays `pagetext.py` so no permission string changes. Because B12 stays, `allowed-tools` keeps the `pagetext.py` path. (2) `## Part B. The research roles` is renamed `## Part B. The critic and the record`, and §3.2's heading becomes *Permissions, and the payload builder*. Both are logged in `topics/skill-headings.md`. (3) §5 also loses `--book-kind subject` / `--book-subject` and the curl `subject` field, since subject books leave the skill.
- doc_impact: `(P39-hk.S4) qa.md, operations.md: scripts/skills_parity.py now holds one agent …; pagetext.py is only the curl publish's --payload builder; the plugin README's permission list drops WebSearch, WebFetch and pdftotext, and its search-cap paragraph is gone`

## What was done

1. **Part B.**
   - Deleted the B1–B4 extracts (web-researcher … verifier) and the shared extracts `rules` (B6), `ladder` (B7), `bar` (B8), `search` (B10) and `pages` (B11), each with its markers.
   - B5 (the critic, `with=dossier`) and B9 (the dossier) are unchanged.
   - B0 is rewritten for the one role. It covers the critic's brief, how it reaches the critic (plugin / generic `briefs/explain-critic.md` / alone), and the payload builder.
   - Numbers are not renumbered. B0 says the retired numbers are not reused, which keeps every B5/B9/B12 citation valid.
2. **Agents.**
   - Deleted the four research agent files.
   - `explain-critic.md`: `--write-agents` reported no change, because B5 and B9 are untouched.
   - The deletion went through `git rm` followed at once by `git reset HEAD plugin/agents/`, so the index is unchanged and the deletions sit unstaged in the working tree.
3. **`scripts/skills_parity.py`.**
   - `AGENT_ROLES = ("explain-critic",)`.
   - The AGENTS docstring is rewritten for the one role.
   - The pagetext compile check stays and is relabelled "the payload builder".
   - The PASS line now reads "the plugin agent matches Part B".
   - CI invocation unchanged, so `plugin-ci.yml` is untouched.
4. **Frontmatter.**
   - `description:` now reads: codebase-only, from the code and the phases' records, no research of its own, declined with no code, research phase offered when no phase covers it, a suggested reader and shape, one confirmation, one writer plus one critic, next steps from the workspace. It keeps "Use ONLY when…".
   - `allowed-tools` drops `Bash(pdftotext:*)`, `WebSearch` and `WebFetch`.
   - `argument-hint` is untouched.
5. **Leftovers.**
   - §5: the general-mode project slug, `[--subject]`, `--book-subject` and the curl `subject` field are gone, and the book kind is `codebase`.
   - §2: "If D0b cannot write there" → "If §3.2 cannot write there". The resolver test still passes.
6. **Copy.**
   - `plugin/README.md`:
     - the intro is rewritten;
     - *modes and flags* → *flags and the one confirmation* (no `quick`/`no-research`/full, no Cost line, no evidence gate);
     - *research agents* → *the critic agent*;
     - *permissions and the search cap* → *permissions*: no WebSearch/WebFetch/pdftotext, `sed -n` added to match §3.2, no preflight, and the search cap is gone;
     - the release checklist says "the critic agent".
   - Setup L170–171 and L460–461 now read "the repository's code … write, check and publish".
   - Manifests: the same new description in both, with no version change.
   - `content.ts` L251: "read the code and what its phases recorded … cite every line to the code". The "3,347" line count is left for the release slice.
   - `README.md` L12–15 and the template page L72 are reworded.
   - The template page is `template_only`, and plugin_parity passes.
7. **Propagation.**
   - `.agents/skills/explain/SKILL.md` is the canonical body with its own frontmatter, its description set to the canonical one.
   - `web/public/SKILL.md` is a full copy.

## Grep accounting

The `WebSearch|WebFetch|pdftotext|no-research|general mode|mode: general` grep over `plugin/skills/explain` and `.agents/skills/explain` leaves one hit per copy, at L119 / L117. That is §1's dropped-flag rule ("`quick`, `no-research` and `research` (there is one run)"). It is intentional: the words are still stripped with one line.

Other intentional mentions:
- the run card's "D2–D5, the research team's stages, are gone";
- §3's "§3.5–§3.9 … are gone";
- "No research: … no research agent";
- B0's "retired" line;
- B9's note that old research folders (`findings/`, `verify/`) are never read.

The retired-agent grep (`web-researcher|code-researcher|gap-reviewer|knowledge:verifier`) over plugin, web/public, .agents, README.md and .claude-plugin returns nothing.

## Citation check (P33-n3)

`citations checked=200 missing=85`, against S3's 81. The +4 are `Part B *The research roles*` in the vendored route, from this slice's rename. This is expected, and S5 re-cites (see `topics/skill-headings.md`).

## Deferred jobs this slice retires (for the review to close or drop)

- **D67**: the cross-vendor verifier for explain *research*. Its research half is moot because no verifier remains. Its critique half, a cross-vendor critic, still stands.
- **D72**: a mechanical dossier and search-total line. The search total is moot (no searches), and the dossier has no `run.md`.
- **D73**: verifier batches and waves in the foreground under `claude -p`. Moot: there are no verifier and no waves.
- **D76**: the verifier's half and `researchers_model` are moot. The critic's same-model "family" guard already names the family (B5: "the same family (Opus, Sonnet or Haiku)").
- **D84-8s**: a metered live 0.9.0 trial of the research run. Moot for 0.9.0's research. A 0.10.0 trial is the release's call.
- **D75** (found by the sweep): it closes the run through `run.md` state and `report.md`, and suggests `pagetext.py`. `run.md` is gone (S2), and the tool is now only the payload builder. It is a drop candidate, or a rewrite against the new record.
- **D80-ch** (partly): its setup-L49 point about general mode's subject-slug project is moot, since there is no general mode. Its template page §1 fallback point was not touched.
- **D86-sd**: the copy rewrite settles nothing beyond S1's (a), (d) and (e). This slice removes the README's search-cap paragraph and the web-search permission strings, which completes (a)'s web-searches scope across the copy. (b), (c), (f) and (h) are untouched, and (g) stays partly settled (S1).

## Notebook entries written (phase-section)

- Decisions: *Research machinery retired (S4)*.
- Notes for later slices:
  - removed the S1→S4, S2→S4 and S3→S4 entries;
  - added `(from S4, for S5)`: the agent names and Part B headings that are gone;
  - added `(from S4, for DECOMP2's release slice)`: `content.ts` L251/L261 "3,347" lines (the skill is 2,368 now), setup `plugin_version` 0.9.1 at L342/L356, the `plugin.json` version, and the 0.10.0 release notes in `plugin/README.md`.
- Doc impact: the `(P39-hk.S4)` line above.
- Now: rewritten for S4's landing, "Next: S5".
