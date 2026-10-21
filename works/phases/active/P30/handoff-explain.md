# Handoff to the bootstrap workspace: `/explain` now belongs to the knowledge plugin

For the agent working in the bootstrap repo (`bootstrap_agentic_workspace.sh`, the installer that ships the
agentic workspace). Written 2026-10-21 from the knowledge repo (`leetusik/knowledge`), phase P30, slice S28.
This note is self-contained: you need only the bootstrap repo and this file. The facts about the knowledge
repo below were checked there; everything about the bootstrap was read at its HEAD `7517446` (workspace v61),
so re-run the greps if HEAD has moved.

## 1. The decision, and why

The operator decided (2026-10-21): **the knowledge repo owns `/explain` outright, delivered by its Claude Code
plugin. The bootstrap keeps only a pointer.**

Why:
- The skill, the `knowledge` CLI and the document API change together, in one repo. Phase P30 rewrote the skill
  to produce **native chapters** (Markdown with typed blocks, books, images, translations), never HTML. The
  bootstrap's vendored copy still writes HTML and is wrong against the API as it now stands.
- Every outside copy drifted. The bootstrap's own header says "Nothing syncs the two copies — re-vendor by
  hand", and the knowledge repo's list of what the vendored copy would have to change (native output, `book`,
  `chapter`, `lang`, `translated_from`, `assets`, id carry-forward, `sources` blocks, images through the CLI's
  `--asset`, and no more deleting `.agents/skills/explain/`) was long enough that syncing it again would only
  drift again. Deleting the copy ends the problem.
- `--update` has already deleted the knowledge repo's own `.agents/skills/explain/` once (CHANGELOG v61 notes
  "`.agents` was flagged whole and deleted knowledge's own `/explain`"; it was fixed to be per file, by
  content). The rule below closes that class of bug for good.

## 2. What to change in the bootstrap

### 2.1 Delete the skill

The skill lives at **`payload/claude/skills/explain/`** (one file, `SKILL.md`). Delete the directory. There is no
registry to edit: `installer/main.py` derives `CLAUDE_SKILLS` from the embedded payload.

Then fix every place that counts, lists, installs, copies or documents it. Verified touchpoints (grep
`-i explain` outside `CHANGELOG.md`, `workflow/works/**` and `workflow/docs/versions/**`, which are history and
are never patched):

| Where | What to do |
|---|---|
| `installer/main.py` `EXPECTED_SKILL_COUNT = 18` and its comment "18 skill packages" (~line 166) | `17`. |
| `installer/main.py` ~line 1822 `print("Claude Code: 18 skills in .claude/skills/ …")` | `17`. |
| `installer/main.py` ~line 1829 (and the embedded copy in the built file, ~line 2010) closing line `print("Knowledge: /explain writes an interactive explainer …")` | Replace with the pointer text of 2.2, in one or two lines. |
| `installer/main.py` ~lines 1536-1538 (comment mentioning "the knowledge repo keeps its own .agents/skills/explain/SKILL.md") and `RETIRED_FILES` entries `.agents/skills/explain/SKILL.md` and `.agents/skills/explain/agents/openai.yaml` (~lines 1566-1567) | See 2.3: delete these two entries and reword the comment. |
| `installer/README.md` ~lines 127-131 ("`explain` is the one **vendored** skill …") | Replace with: `/explain` is not shipped; it comes from the knowledge plugin (point at 2.2). |
| `installer/payloads/doc_bodies/operations.md` lines ~43-68 (`## Knowledge (phase explainers)`) | Replace the section with the pointer (2.2). This is the seed `docs/current/operations.md` body new workspaces get. |
| `README.en.md` ~lines 460-481 (the "Knowledge (phase explainers)" block, including the "Alternative (Claude Code plugin)" paragraph and the sentence "a separate namespace from this workspace's `/explain`") | Replace the block with the pointer; the "Alternative" paragraph becomes the main text. Also `README.en.md` ~line 262 "the 18 skills" → 17. `README.md` (the other language) has no explain/knowledge block (grep finds only the contract quote at line 315); check it for a skill count too. |
| `payload/contract.md` line 13 (the exceptions list: "`/explain` is **operator-invoked only**") | Reword so it does not claim the workspace ships `/explain`; the contract is under a size cap (12,288 B, at 12,281 now), so make the edit net-negative in bytes. |
| `payload/claude/skills/review-phase/SKILL.md` ~line 74, `payload/claude/skills/do-next-slice/reference/review.md` line 3, `payload/claude/skills/do-whole-phase/reference/review.md` line 4, `payload/claude/agents/slice-executor-{mid,high}.md` line 91 | These carry the fixed review line `explain: not written — run /explain for this phase`. `/explain` no longer exists in the workspace, so change the pointer to `/knowledge:explain` (the plugin's namespaced command). Keep it one fixed string everywhere; grep `tests/retrofit_smoke.sh` and `payload/scripts/workflow.py` for the old string first. The review still writes no explainer. |
| `workflow/.agentic-nested.json`, `.claude/skills/explain/`, `.claude/agents/*` copies in this repo | Installed, untracked copies. Never edit them (your CLAUDE.md says so); refresh with `sh bootstrap_agentic_workspace.sh --update .`. |
| `tests/retrofit_smoke.sh` | See 2.4. |
| `CHANGELOG.md` | A new top section, with a Migration notes line (2.5). |

After editing `payload/**` or `installer/**`, follow your CLAUDE.md: `python3 installer/build.py`, commit the
rebuilt `bootstrap_agentic_workspace.sh` in the same commit, bump `WORKSPACE_VERSION` and add the CHANGELOG
section in that commit. Run `bash tests/retrofit_smoke.sh` alone in its shell call.

### 2.2 Add the pointer

Put this (adapt the wording to each place; keep the commands verbatim) in the seed operations doc, the README
block and the installer's closing line:

> **Knowledge (`/explain`).** Explaining a topic, a change or a phase into your knowledge base is done by the
> **knowledge plugin**, not by this workspace. The plugin owns the skill, the CLI and the document API, so they
> stay in step. Install it once:
>
>     /plugin marketplace add leetusik/knowledge
>     /plugin install knowledge@knowledge
>
> then run `/knowledge:setup` once (connect to the hosted KB, or scaffold your own) and use
> `/knowledge:explain <topic>`. Plugin version 0.4.0 or later is required (earlier versions still describe
> HTML). To update: `/plugin marketplace update knowledge`, then update `knowledge@knowledge` from the
> `/plugin` panel's Installed tab (or, from a shell, `claude plugin update knowledge@knowledge`). The review
> never writes an explainer; it only reports `explain: not written — run /knowledge:explain for this phase`.

The commands were checked on 2026-10-21 against the Claude Code docs
(`https://code.claude.com/docs/en/discover-plugins`, `…/plugins-reference`) and this repo's manifests:
- marketplace name `knowledge` (`.claude-plugin/marketplace.json`, `"name": "knowledge"`), plugin name
  `knowledge` (`plugin/.claude-plugin/plugin.json`, `"name": "knowledge"`, version `0.4.0`), source `./plugin`;
  so the install id is `knowledge@knowledge` and the GitHub source is `leetusik/knowledge`;
- `/plugin marketplace add owner/repo` adds a GitHub marketplace; `/plugin install <plugin>@<marketplace>` opens
  the `/plugin` panel on that plugin so you choose a scope (user / project / local), it does not install
  silently inside a session; "Active now" means no reload, "Reload needed" runs `/reload-plugins`;
- plugin skills are namespaced `/<plugin>:<skill>`, so the skill is **`/knowledge:explain`** and the setup skill
  is `/knowledge:setup`; type `/` to see them, or run `claude plugin list` in a shell;
- shell forms for scripts: `claude plugin marketplace add leetusik/knowledge`,
  `claude plugin install knowledge@knowledge --scope user|project|local` (user is the default);
  `claude plugin marketplace update knowledge` refreshes the listing but not installed plugins;
  `claude plugin update knowledge@knowledge` updates one plugin;
- a third-party marketplace has **auto-update off by default**, and a plugin with a `version` in `plugin.json`
  stays pinned until that version changes: that is why this repo bumped to `0.4.0` in S28. Someone who
  installed 0.3.0 must run the update commands above;
- one-step form (needs Claude Code v2.1.275 in a session, v2.1.292 in a shell):
  `/plugin install knowledge --marketplace leetusik/knowledge`. Mention it only if you want the shorter text;
  the two-command form works on every version.

Do not paste the knowledge plugin's behaviour into the bootstrap. Link to it instead (section 4).

### 2.3 The updater never touches anything named `explain`

Rule: **`--update`, `--into-existing`, a fresh install, `--nested`, `--at-root` and the update report never
create, modify, delete, flag as stale or recommend removing a file or directory whose path contains a component
named `explain`**, in `.claude/skills/explain/`, `.agents/skills/explain/` or anywhere else. They may stay
silent about it. This closes the knowledge repo's A3 (its own `.agents/skills/explain/` being deleted).

Concretely:
1. Removing `payload/claude/skills/explain/` drops `.claude/skills/explain` from `CLAUDE_SKILLS`, so the
   installer stops managing that directory. Check what that does to an install that already has it: the dir is
   in `.git/info/exclude` and carries a self-hiding `.gitignore` of `*` written by an earlier version, and
   `flag_skill_dir_files()` / `flag_retired_files()` walk only skills in `CLAUDE_SKILLS` and `RETIRED_DIRS`
   (`.agents`, `.codex`) plus any `.claude/skills/<name>` that appears as a key in `RETIRED_FILES`. So:
2. **Do not add `.claude/skills/explain/…` to `RETIRED_FILES`.** The usual "when a release drops a shipped file,
   add its hash" step would flag an unchanged copy as stale and `update-workspace` would then offer to remove
   it. Skip that step for this one skill, and write the reason in the comment above the table.
3. **Delete the two `.agents/skills/explain/…` entries from `RETIRED_FILES`** (they are v30's, last shipped in
   `4ee5c22`). With them an unchanged v30 copy is flagged "stale: remove it"; without them any file there is
   reported at most as the adopter's own ("yours, kept"), and `update-workspace` removes only listed stale
   files. Decide whether the report should even print the "kept" line for `explain`; the safest reading of
   the rule is to skip it, a one-line filter where the report classifies files.
4. Confirm by test (2.4) that nothing named `explain` is created, changed or removed, in a plain, `--nested`
   and `--at-root` host.
5. Existing adopters keep their old `.claude/skills/explain/` after an update (it is now unmanaged, so it also
   stops being refreshed). It keeps shadowing nothing in the plugin namespace, but it leaves two ways to say
   "explain" and the old one writes HTML. The migration note (2.5) tells the adopter to delete it **by hand,
   once**. The updater must not do that for them.

### 2.4 Tests to change in `tests/retrofit_smoke.sh`

Line numbers are as of HEAD `7517446`:
- ~121 `assert len(skills) == 18` and ~1751 `"$nskill" -eq 18` → 17 (and the messages).
- ~183-185 the `codex_prose <= {"update-workspace", "explain"}` allowance → drop `"explain"`.
- ~550-552 asserts on `payload/claude/skills/explain/SKILL.md` content (operator-invoked-only text, "asks before
  it creates an account") → delete; that text lives in the plugin now. If you keep a pin for the contract line,
  pin the reworded contract text instead.
- ~1730-1731 "fresh install ships the explain skill" / "vendored explain is de-plugin-ified" → invert: a fresh
  install has **no** `.claude/skills/explain/` and its seed operations doc contains `/plugin marketplace add
  leetusik/knowledge` and `/plugin install knowledge@knowledge`.
- ~2845 (reads `$IG/.claude/skills/explain/.gitignore`) and ~2880-2882 (appends to and diffs
  `.claude/skills/explain/SKILL.md`) use `explain` only as a convenient installed skill → switch both to another
  skill, e.g. `commit`.
- ~1586-1663 (the planted adopter `.agents/skills/explain/` kept by `--update`) stays, and gets stronger: also
  plant `.claude/skills/explain/SKILL.md` (and one more byte-for-byte copy of the old shipped text), run
  `--update`, and assert both are **unchanged and not listed under `stale`/`removed`**; adjust the expected
  report line for `.agents/skills/explain/SKILL.md` if you removed its `RETIRED_FILES` entry in 2.3.
- Keep Test 8 (`--with-explain` is rejected as an unknown option); that flag stays retired.

### 2.5 Release notes (the CHANGELOG section)

The workspace version bump is yours. The Migration notes line should say, in your house style, at least:
- `/explain` is no longer shipped; it comes from the knowledge plugin as `/knowledge:explain` (install commands as
  in 2.2; plugin 0.4.0 or later).
- `--update` neither deletes nor edits an existing `.claude/skills/explain/` or `.agents/skills/explain/`. An
  adopter who has the old workspace copy should delete `.claude/skills/explain/` **once, by hand**, after
  installing the plugin, so there are not two explain skills. A repo that keeps its own portable
  `.agents/skills/explain/` (the knowledge repo does, and keeps it in step with its plugin) is left alone.
- The review's fixed line is now `explain: not written — run /knowledge:explain for this phase` (if you took that
  change in 2.1).

## 3. What a workspace sees afterwards

- With the plugin installed the skill is **`/knowledge:explain`**, with its own `argument-hint`
  (`<topic or change-ref> [here] [research|no-research] [book=<slug>] [lang=<xx>]`). The bare `/explain` is not
  provided by the workspace any more.
- First use still needs a knowledge base: run `/knowledge:setup` once (it offers the hosted KB at
  `https://knowledge.hi2vi.com`, or a self-hosted scaffold). The credentials the old skill read
  (`KB_API_BASE_URL`, `KB_API_TOKEN`, `~/.config/knowledge-kb/config.json`) are the same the plugin reads, so an
  existing setup keeps working.
- A workspace that already had the bootstrap's `.claude/skills/explain/` has two `explain` skills until it
  deletes the old directory by hand. This applies to the **knowledge repo's own checkout too**: its
  `.claude/skills/explain/SKILL.md` is the bootstrap's installed copy and is tracked in that repo's git. The
  knowledge repo's orchestrator removes it after this change ships; you do nothing there.

## 4. The contract the skill relies on (for reference; link, do not copy)

All in `https://github.com/leetusik/knowledge`:
- `plugin/skills/explain/SKILL.md`: the skill itself (native chapters, books, assets, translations, general mode);
- `plugin/skills/setup/SKILL.md`: connect-or-scaffold onboarding;
- `server/native/README.md`: the native format and ingest contract (block types, ids, reject-never-strip rules);
- `cli/README.md`: the `knowledge` CLI the skill drives (install, `save`, `--book`/`--chapter`, `--asset`);
- `plugin/README.md`: the plugin's own install text.

If you quote anything about the skill's behaviour in the bootstrap, quote only the install and update commands.

## 5. Verification the bootstrap agent can run

1. **The updater leaves `explain` alone.** In a scratch host (a throwaway `git init`, never a real repo): install
   the previous release, then plant `.agents/skills/explain/SKILL.md` and `.claude/skills/explain/SKILL.md`
   (both with a marker line), hash them, run `sh bootstrap_agentic_workspace.sh --update <host>` plain, then
   with `--nested` and with `--at-root`, and compare the hashes. They must be byte-identical, still present, and
   not in the `stale`/`removed` lists of the update report. Also run `--update --dry-run` and check it says
   nothing about removing them.
2. **A fresh install ships no `explain`.** `ls <host>/.claude/skills` has 17 entries and no `explain`; the
   installer's closing text and the seed `docs/current/operations.md` show the pointer commands of 2.2.
3. **The pointer renders.** Read the new README block, the seed operations doc and the closing line; the two
   plugin commands are copy-pasteable, with no stray markup.
4. **The plugin gives `/knowledge:explain`.** In a fresh Claude Code workspace (any scratch repo), run
   `/plugin marketplace add leetusik/knowledge` then `/plugin install knowledge@knowledge`, choose a scope,
   and check that typing `/knowledge:` lists `explain` and `setup` (or `claude plugin list` shows
   `knowledge@knowledge` at version `0.4.0`). If the install shows an older version, run
   `/plugin marketplace update knowledge` and update the plugin; the marketplace's auto-update is off.
   A workspace needs the network for this step; skip it and say so if the machine has none.
5. `python3 installer/build.py --check` and `bash tests/retrofit_smoke.sh` (alone in its shell call) pass.

## 6. Out of scope here

- Do not edit anything in the knowledge repo from the bootstrap session; its half is done (plugin 0.4.0, the
  manifests' wording, the plugin README and setup text).
- Do not re-vendor the skill, and do not add an `explain` stub that forwards to the plugin: the operator wants a
  pointer only.
- The `--with-explain` flag stays retired.
