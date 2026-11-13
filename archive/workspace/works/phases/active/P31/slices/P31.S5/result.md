# P31.S5 result — one-chapter rehearsal through the package

## Verdict

- status: done
- tier: mid
- model: sonnet
- effort: high
- summary: Rehearsed the explain package as written, on a scratch stack: `## Explain` block, outline, outline-gate report, chapter plan drawn only from the outline, one chapter (`check-endpoint`, about P31.S1) drafted, read through and `knowledge check`ed to exit 0, judged by a fresh-eyes opus critic (2 must-fix, 7 should-fix, 1 note) and revised once. The rehearsal exposed four package gaps plus two procedure lessons; all are fixed in `package/`. Nothing published anywhere.
- critique: answered · disputed: none
- files_changed: `works/phases/active/P31/package/claude/skills/do-whole-phase/reference/explain-chapter.md`, `.../explain-decomposition.md`, `.../explain-review.md`, `package/claude/agents/explain-critic.md`, `package/README.md`, `package/PATCHES.md`, `works/phases/active/P31/phase.md`, this file. All rehearsal material is under the scratchpad (below), none in the phase folder.
- validation:
  - `python3 scripts/workflow.py validate`: PASS (only pre-existing warnings)
  - bootstrap unchanged: `git -C /Users/sugang/projects/personal/bootstrap_agentic_workspace.sh status --short` is empty: PASS
  - scratch API stopped: PIDs 91703 and 91706 gone, `:8793` free (`lsof` empty): PASS
  - `knowledge check` on the revised chapter: exit 0 (`OK — would publish scratch-explain/2026-10-21-one-validation-path-two-doors.md (v1)`, one expected `ref-unresolved` warning for the unpublished sibling)
  - nothing published: the scratch KB root holds only the seed commit and `docs/index.md`; no `save` was run anywhere
- deviations:
  - The plan's span 3 "answer in one revision" included disputes; there were none.
  - The critic had no `knowledge check` or old-server run (it read the route table), so it called the old server's answer a 404/405 guess; I had run a real old build (405) and wrote "a 404 or 405".
  - `rm -rf` of my own scratch copy was denied; the unused older-server tree is left at `$REH/oldtree-unused-server-build`.
- doc_impact: none (a rehearsal; `package/` is not durable product docs)

## Where the rehearsal lives

`REH` = `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/e7ea5b44-3c7d-4e6d-8ebc-268a3e5a2b8a/scratchpad/p31-rehearsal`: `intent.md` (the `## Explain` block), `book/outline.md`, `outline-gate.md`, `chapter-1-plan.md`, `book/check-endpoint.md` (final) and `tmp/check-endpoint.v1.md` (first draft), `book/critique/check-endpoint.md`, `chapter-1-result.md` (span-1 and final blocks, `## Publish`, `## Critique answers`).

## Timings (wall clock, UTC)

- Span 1 (outline, gate report, chapter plan, research, draft, read-through, check, exit-2 probes): 10:34 to 10:40, about 6 min.
- Span 2 (critic, opus): run by the orchestrator, not measured here.
- Span 3 (revision, re-check, package fixes, notebook, result): about 10:46 to 10:50, about 4 min for the chapter and package edits plus this notebook work.
- Cost drivers: the outline and plan steps were cheap; the real time went into reading the code for the claims and the web page (two fetches, because the Dry-run section sat past the first 100 KB).

## What the rehearsal showed

### Gaps found and the fix for each (all in `works/phases/active/P31/package/`)

1. **A chapter plan could not be filled from the outline.** Missing: tags (the CLI requires 2 to 5), the research on/off decision, images, summary, attribution, and which knowledge base the check targets. Fix: `explain-decomposition.md` outline entries now carry `tags`, `web research: on | off` with a reason, and `images`; *Each chapter's plan.md* now says where every other field comes from (the slice's `## Dispatch` attribution, repo root, "the configured knowledge base" per skill §2, summary written with the draft, no URL or key in a plan); `explain-chapter.md` *What plan.md names* lists them. (OQ12)
2. **`## Publish` would not turn into `save` unchanged.** "The exact command it ran" carried the executor's `--base-url`, an absolute draft path and an env token. Fix: `explain-chapter.md` now defines the section: `knowledge check <repo-root-relative draft> <flags>`, no `--base-url`, token or `--json`; the review adds the global `--base-url` and swaps `check` for `save`; a revised flag rewrites it. `explain-review.md` steps 4 and 5 and the fix-slice republish say the same. (OQ13)
3. **Exit 2 was lumped.** The reference skipped every exit 2. The probes (below) show exit 2 also means "cannot reach" and "key rejected". Fix: `explain-chapter.md` span 1 and `explain-review.md` step 4 branch on stderr: skip only `has no /api/documents/check (HTTP 404 or 405)` and argparse `invalid choice`; unreachable stops with `blocked`, a rejected key with `needs_operator`; README and the PATCHES CHANGELOG line say so. (OQ14)
4. **No research line in the outline**, so the critic could not tell whether the "Best practices & next steps" section was intended. Fix: the outline's research line (gap 1) plus `explain-critic.md`: judge the section against the plan's research line, and say under *Not seen* when the plan has none.
5. **Procedure lesson from C01 (the quiz key was wrong):** I had changed the outline's "already-published *document*" into "chapter", where the server answers differently (a bound chapter re-sent is its next version, so 200, not 409). Fix: `explain-decomposition.md` now tells the outline to name the exact case (loose document or bound chapter; placed or not), and `explain-critic.md` makes an item that changes the case a must-fix when its key is then wrong.
6. **Procedure lesson from C02/C03 (diagram step order):** I drew the publish's steps in an order the code does not have (registry runs before the handler; placement runs inside the lock). Fix: the outline says a step diagram's order is the code's order and names the function; `explain-chapter.md` span 1 tells the drafter to read each diagram's order and each quiz key against the code; `explain-critic.md` checks step order, and agreement between diagrams.

### The four things the plan said to check

- **Can the critic check the outline's quiz targets and diagrams as written?** Yes for the target and the diagram's nodes; but the outline's wording left the case and the step order loose, and both led to a must-fix. Fixed as 5 and 6 above. The critic did answer every quiz item itself and traced each node to a line.
- **Does `## Publish` turn into `save` unchanged?** No, as written; yes after fix 2. (`save` accepts the same flags as `check`, the argparse setup being shared.)
- **Does the exit-2 handling read right?** No as written (fix 3). With the fix, all four real cases read right: nothing on the port (`cannot reach`, exit 2), a real older server (I built one from `git archive 7c27519^`; it answered 405; `has no /api/documents/check (HTTP 405)`, exit 2), a wrong key (exit 2), and an old CLI (argparse `invalid choice`, exit 2). A refusal is exit 1.
- **Was any `## Explain` field missing?** No: all eight were fillable. The gaps were in the outline and plan fields, not in `## Explain`.

### The critique and how it was answered

Verdict `revise`, high confidence: must-fix C01 (quiz), C02 (diagram order); should-fix C03 to C09; note C10. All answered in one revision, none disputed:
- C01: the item is now a loose document (key 409), and its explain says a bound chapter is the next version (200).
- C02, C03: both diagrams redrawn to the code's real order; placement shown on the check's path.
- C04 to C06: elision markers, "404 or 405", and the push wording fixed.
- C07, C08: the registry, `rel_path`, native chapter, manifest and binding conflict are glossed at first use.
- C09: the cloze became a predict item.
- C10: "every validation stage runs for real, and only the writing is prevented".

Line-by-line answers: `$REH/chapter-1-result.md`, `## Critique answers`.

## The exit-2 probes

| scenario | stderr | exit |
|---|---|---|
| nothing on `:8795` | `error: cannot reach http://127.0.0.1:8795: [Errno 61] Connection refused` | 2 |
| real older server (`git archive 7c27519^`, on `:8794`) | `has no /api/documents/check (HTTP 405): the server predates knowledge check` | 2 |
| wrong token | `your API key was rejected …` | 2 |
| unknown subcommand (an old CLI) | argparse `invalid choice` | 2 |
| raw HTML in the body | `the server would reject this publish (1 problem): line 3: [raw-html] …` | 1 |

## The scratch commands

- Scratch KB: `git init` in `$REH/kb` with one seed commit.
- API: `env -u DATABASE_URL -u GEMINI_API_KEY -u GOOGLE_API_KEY KB_ROOT=$REH/kb KB_API_TOKEN=reh-token KB_STARTUP_REINDEX=0 HOME=$REH/home uv run uvicorn server.main:app --host 127.0.0.1 --port 8793` (legacy mode, no Gemini key). Older build: `git archive 7c27519^ | tar -x -C <dir>` and the repo venv's python with `PYTHONPATH=<dir>` on `:8794`, stopped right after the probe.
- CLI: the scratch venv's `knowledge-cli 0.2.0`, run through `$REH/chk.sh`, which sets `HOME`, `XDG_CONFIG_HOME` and `KB_API_TOKEN=reh-token` and passes the chapter's `## Publish` flags.
- Only my own PIDs were stopped (91703, 91706, and the older build's 92171). `:8766` and `:3030` were never used.

## Notebook

`phase.md`: the two `for S5` notes removed; a `for S6` note added (what the handoff must carry); `## Now` rewritten; OQ12 to OQ14 appended as decided choices. OQ10 (the agent profile's reader sign-in) remains untested; the rehearsal publishes nothing and so reads nothing in the reader.
