# Result — P23.S4 (/explain skill: read prior version + publish v2 across all skill copies)

**Status: done.** Prose-only slice; no code, no server/web/CLI change. All four skill
copies are in sync (including the installed one — the write outside the repo succeeded,
no operator `cp` needed).

## What changed in the skill

The whole edit is 85 changed lines, applied to the canonical file and propagated
byte-exactly. Five touch points, no top-level step renumbered:

### 1. Step 3 (Research) — a new "Knowledge-base research" block (the F8 fix)

Inserted between the existing "Repo research — by mode" and "Web research" blocks, so
the lookup happens **before** authoring, which is what lets item 2 of the plan ("build
on what v1 said") actually work — a resolution step living only in step 5 would run
after the page is already written.

The block tells the agent to derive `project`/`slug` exactly as step 5 defines them,
then run one `GET /api/documents?project=<project>&limit=200` and scan `items` for a
matching `slug` (or a title that is plainly the same subject under a different slug),
matching **on subject, not recency**. Two outcomes are named as remembered values that
step 5 consumes: `PRIOR=none`, or `PRIOR_REL_PATH` / `PRIOR_VERSION`. On a match it
reads the current body via `GET /api/documents/by-path/<PRIOR_REL_PATH>`, with the
S2/`_public_doc` truth stated explicitly: `markdown` on an html doc is the **extracted
plain text** (`raw_html` never leaves `/api` on the document surface) — which is what
the agent needs, since it re-authors the page from scratch. Older bodies get the two S2
routes (`…/versions`, `…/versions/{n}`) with the envelope spelled out and the "the
current version is never listed / `total: 0` is not an error" rule stated, so an
unversioned document does not read as a failure. A failed lookup degrades to
`PRIOR=none` rather than blocking the save (same philosophy as the existing offline
web-research degradation). Closes with the rule that a version is a **full
replacement, not a diff**, so the document stays standalone.

### 2. Step 5 — the `new_version` write (a new bullet after the `meta.json` block)

`meta.json` gains exactly `"new_version": true` + `"rel_path": "<PRIOR_REL_PATH>"` when
`PRIOR` exists. The bullet states the S1 contract the agent can otherwise get wrong:
the body is written at the **same** `rel_path`; response carries
`version`/`previous_version`/`archived_path`; id, URL, links and graph edges never
move; the target's original `date`/`slug` win even after a retitle (the response echoes
the target's); a differing `project` or `format` is a **422**, never a silent move; and
a stale `rel_path` falls back to a plain create rather than 404ing. Left untouched: the
merge command, the two POST forms, and the "leave `date`/`slug`/`overwrite`/`commit`
unset" rule (`new_version`/`rel_path` were never in that list).

### 3. Step 5 — 201 branch

Now also records `version` and `previous_version` for step 8, and notes that a version
bump adds no duplicate Recent bullet (`update_recent_index` suppression, per the pinned
design).

### 4. Step 5 — 409 branch, reworked (plan item 4)

`new_version` is now the documented primary retry: on a yes from the user, add
`"new_version": true` + the detail's `rel_path`, re-run the merge, re-POST. The
detail's shape is described as S1 actually built it (`rel_path`, `existing_title`,
plus `version` + `hint` **only when a real DB row is behind it**). `overwrite` is kept
and explicitly re-described as no-longer-destructive (it archives), but demoted to
"only when the user wants to replace rather than supersede". The ask-the-user gate is
preserved verbatim in force. One accuracy point worth keeping: the branch says a
`new_version` write **that resolved its target** never lands here — that matches
`server/main.py`, where the 409 check is skipped only when `target is not None`; a
`new_version` write whose resolution missed can still 409 on today's path.

### 5. Steps 6 and 8 — two small honesty notes

Step 6 (API-unreachable fallback) now says the fallback writes a NEW file at today's
path and **cannot** bump a version (only the API archives/versions), so a prior version
found in step 3 should be re-published with `new_version` once the API is back —
otherwise the fallback silently manufactures the exact duplicate-document bug this
slice fixes. Step 8's API-path bullet now reports which version was published and, on a
bump, that the `previous_version` body is archived rather than lost.

## The four copies (F7)

| Copy | How it was written | State |
| --- | --- | --- |
| `plugin/skills/explain/SKILL.md` | edited directly (canonical) | source of truth |
| `.agents/skills/explain/SKILL.md` | body replaced with canonical's body, its own 4-line frontmatter preserved byte-exactly (diff starts at line 148 — frontmatter untouched) | body-identical |
| `web/public/SKILL.md` | full byte copy of canonical | byte-identical |
| `~/.claude/skills/explain/SKILL.md` | full byte copy of canonical (**not** a patch — it was two edits behind: the `default`-project fallback and the shareable-`url` wording) | byte-identical, `cmp` verified |

The installed write succeeded, so no operator `cp` is required. For the record, the
command that would reproduce it is
`cp plugin/skills/explain/SKILL.md ~/.claude/skills/explain/SKILL.md`.

All three repo copies show the same 85 changed lines.

## Validation

| Command | Outcome |
| --- | --- |
| `python3 scripts/skills_parity.py` | **PASS** (exit 0) — "explain skill copies are in body parity (web copy byte-identical)"; no DESCRIPTION warning |
| `python3 scripts/workflow.py validate` | **PASS** (exit 0) — "Workflow validation passed." |
| `cmp ~/.claude/skills/explain/SKILL.md plugin/skills/explain/SKILL.md` | identical |
| End-to-end re-read of the edited flow | consistent — see below |

The re-read checked the things prose can silently break: every new `curl` starts with
the exact `curl -sS --max-time 5` prefix the frontmatter's
`allowed-tools: Bash(curl -sS --max-time 5:*)` pre-approves; URLs containing `&` are
single-quoted; the bearer-token rule is stated once in step 3 and points at step 5's two
spelled-out forms rather than re-deriving it; `PRIOR` / `PRIOR_REL_PATH` /
`PRIOR_VERSION` are defined in step 3 and consumed in step 5 under exactly those names;
the 409 retry re-runs the unchanged merge command (correct — it re-reads `meta.json`);
the recorded response keys in the 201 branch are exactly the ones step 8 reports; and
no step number referenced anywhere in the file moved.

No server behavior was assumed from the phase notes alone — the write path, the 409
detail, `_public_doc`/`_public_version`, and both by-path version routes were read in
`server/main.py` and the skill's wording was matched to them.

## Deviations from plan.md

None material. The plan left the insertion point to the executor's call ("a new sub-step
of step 5, or folded into the existing steps"); I put the resolution + prior-body read
in **step 3** rather than step 5, because reading v1 after authoring v2 cannot inform
the writing. Steps 6 and 8 received one sentence each — beyond the literal four items,
but required for the flow to stay truthful end to end (an unversioned fallback write and
an unreported version number were both live inconsistencies once step 5 changed).
