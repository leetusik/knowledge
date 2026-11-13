# P90.DECOMP — result

## Verdict

- status: needs_operator
- route: high
- model: opus
- effort: xhigh
- summary: Stopped at the explain skill's first call with `FAILED: permissions`. The §2 resolver (`python3 -c '…'`, run exactly as SKILL.md §2 writes it) was denied, because this session cannot approve it, so no research ran, no dossier or outline was written and no chapter slice was cut. The skill's §3.2 rules block does not list `python3 -c`, yet a lead that reads the skill as a file (no Skill-tool `allowed-tools` grant) needs it for both the resolver and the converter copy.
- files_changed: works/phases/active/P90/slices/P90.DECOMP/result.md; works/phases/active/P90/phase.md (`## Now`, `## Notes for later slices`); works/phases/active/P90/engine-log.md
- validation: the plan's three checks were not run because there was nothing to check: `book/research/` does not exist, so there is no `.gitignore`, `ledger.md`, `library.md` or `run.md`. `python3 scripts/workflow.py validate` was logged to `engine-log.md`, not run (there is no engine).
- deviations: The run stopped before plan step 2. I did not write `book/research/pages/.gitignore`, because §3.2 says a denied call writes nothing else ("no dossier, no brief"). Plan steps 3–6 were not reached.
- doc_impact: none
- operator_need: The session must allow the explain lead's own Bash calls before DECOMP is re-dispatched. Do one of these: (a) run the session in auto mode or bypass; or (b) add `"Bash(python3 -c *)"` plus the §3.2 rules block below (with the real paths) to `permissions.allow`, or to `--allowedTools` under `claude -p`. **Note that `Bash(python3 -c *)` is a broad rule: it allows arbitrary inline Python.** Then re-dispatch P90.DECOMP. Nothing of the run was written, so it starts at §2 and there is no `run.md` to resume from.

## What happened

1. I read `plan.md`, `phase.md`, `intent.md` (`## Explain` is complete: eleven fields, `visibility: private`, `lang: en`), `phase.json`, `slice.json`, `explain-decomposition.md`, and the skill's run card, §1–§3, §9.2, §9.3 and Part B (B0–B12).
2. I ran **SKILL.md §2's resolver** as one Bash call of its own, exactly as written: `python3 -c '<the resolver>'`. **It was denied:** "Permission for this tool use was denied. It requires approval, and this session has no approval surface … this action, and anything else that requires approval, will be denied the same way for the rest of this session." Without the resolver there is no `KB_NOW` (the run id is `<KB_NOW>-sqlite-wal`) and no `KB_EXPLAIN_STATE` (`<TOOLS>` is under it).
3. I stopped there, per the skill's stop rules (`FAILED: permissions`: "Print the rules (§3.2); the preflight writes nothing else") and `explain-decomposition.md` step 7 (`FAILED: permissions` → `needs_operator`, no slice cut). I did not hand-derive `KB_NOW` or the state path, because §2 says not to reason about the resolution by hand. I did not retype `pagetext.py`, because §3.2 step 2 says "copied by this command, never retyped". A run with no converter would have made every source `quote-match: approximate`. I did not choose that degraded run.

A second denial came earlier and is unrelated to the run: a `grep -nE` on SKILL.md (outside the workspace), which I used to find section headings. I read the file with Read instead, which the session allows for the skill folder.

## FAILED: permissions — the block, paths filled in

The resolver never ran, so `<ROOT>` below is the resolver's **default**: `~/.local/state/knowledge-kb/explain` with `XDG_STATE_HOME` unset, and home taken as `/Users/sugang`. Check it against the environment.

    FAILED: permissions — this session denied: Bash(python3 -c '<SKILL.md §2's resolver, exactly as written>').
    Nothing of the run was written.
    The research agents run on the session's permissions, not on this skill's. Use auto
    mode (interactive Claude Code's default) or bypass, or allow these (settings.json
    "permissions.allow"; under `claude -p`, the same strings after --allowedTools), then
    run the same request again:
      "WebSearch", "WebFetch",
      "Bash(curl -sS --max-time 30 *)", "Bash(curl -sS --max-time 5 *)",
      "Bash(python3 -I /Users/sugang/.local/state/knowledge-kb/explain/tools/pagetext.py *)", "Bash(pdftotext *)",
      "Bash(git show *)", "Bash(git log *)", "Bash(git grep *)", "Bash(git blame *)",
      "Bash(git diff *)", "Bash(git status *)", "Bash(shasum -a 256 *)", "Bash(mktemp -d *)",
      "Bash(knowledge --base-url *)", "Bash(knowledge --version)",
      "Read(//Users/sugang/.local/state/knowledge-kb/explain/**)",
      "Edit(//Users/sugang/.local/state/knowledge-kb/explain/**)",
      "Read(//Users/sugang/projects/personal/knowledge/plugin/skills/explain/**)"
    On another host, allow the same commands and paths in its own terms.

**Not in the skill's block, but needed by this lead:** `"Bash(python3 -c *)"`.

## Finding for the rehearsal (P32.S9): the §3.2 block does not cover a book lead

The plan says the session's allow rules "cover the skill's §3.2 list and this workspace". That is not enough for a **DECOMP or chapter executor**. Such an executor reads SKILL.md as a file, so the skill's frontmatter `allowed-tools` grant (`Bash(python3 -c:*)`, among others) never applies to it. The lead's own calls outside §3.2's list are:

| Call | Where in SKILL.md | Seen here |
|---|---|---|
| `python3 -c '<resolver>'` | §2 | **denied** |
| `python3 -c '<copy the pagetext extract>' <SKILL.md> <TOOLS>/pagetext.py` | §3.2 step 2 (also the write probe) | not tried; same command form, would be denied |
| `which pdftotext` | §3.2 step 2 | not tried; may be auto-allowed as read-only |
| `find <KB_EXPLAIN_STATE> -maxdepth 2 -name run.md` | §3.1 (the fallback when there is no Glob tool; this session has no Glob or Grep tool) | not tried; outside the workspace, likely needs approval like the `grep` above |

Possible fixes, in the plugin or the workspace, not decided here:
- the §3.2 block gains `Bash(python3 -c *)`;
- or the resolver and the converter copy move to a form the block already covers, such as `python3 -I <a shipped script>`;
- and `explain-decomposition.md`'s "Say what the research needs" names those extra rules for a book's leads (DECOMP, and every chapter executor at §9.3 step 1's D0b).

## Engine commands

Logged in `works/phases/active/P90/engine-log.md`, not run: `phase-section P90 "Now" --replace` and `phase-section P90 "Notes for later slices" --replace`, both done as Edits of `phase.md` per `CLAUDE.md`, and `validate`. No `new-slice`, because no chapter was cut.
