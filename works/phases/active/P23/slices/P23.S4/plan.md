# Plan — P23.S4 (/explain skill: read prior version + publish v2 across all skill copies)

## Read first

`../../phase.md` — findings F7 (four copies + parity gates) and F8 (how the agent finds
"the same document") are the contract. The S1/S2 notes give the server surface the
skill will document: `POST /api/documents` with `new_version: true` (+ optional
`rel_path` target; server resolves newest-`(project, slug)` when rel_path is absent;
no target ⇒ plain v1 create), response gains `version`/`previous_version`/
`archived_path`; `GET /api/documents/by-path/{rel}/versions` (list) and
`.../versions/{version}` (one archived body, `markdown` + `raw_html` for html).

## The problem this slice fixes (F8)

`/explain` derives `rel_path = <project>/<today>-<slug>` — so re-explaining a topic on a
later date silently creates a NEW post instead of a v2. After this slice the skill:

1. **Resolves the existing document before publishing** — when the explainer's topic
   matches an existing document in the project (`GET /api/documents?project=<p>`, match
   on `slug`; or `GET /api/documents/by-path/<rel_path>` when the path is known).
2. **Can read the prior content** — the single-doc fetch returns `markdown`; older
   versions via the S2 list/fetch routes — so the new explainer can build on (not
   ignore) what v1 said.
3. **Publishes v2/v3 with `new_version: true`** + the resolved `rel_path` in
   `meta.json`, instead of a same-day-only overwrite or an accidental new post.
4. **Reworks the 409 branch**: a 409 now carries the versionable hint (S1); the skill
   should offer "publish as new version" as the primary retry (add
   `"new_version": true` + the response's `rel_path` to `meta.json`, re-merge, re-POST)
   — `overwrite` still exists (non-destructive now, it archives) but new_version is the
   documented path. Keep the ask-the-user-before-retrying gate.

Where exactly the resolution step slots into the skill's numbered flow (a new sub-step
of step 5, or folded into the existing steps) is your call — keep the skill's existing
imperative, curl-exact, spelled-exactly-this-way style, keep edits tight (this is prose,
but it must be unambiguous for the executing agent), and don't renumber more than needed.
Also mention version history read-back (item 2) only to the depth an executing agent
needs — this skill is a procedure, not API docs.

## The four copies (F7)

1. `plugin/skills/explain/SKILL.md` — canonical; edit this first.
2. `.agents/skills/explain/SKILL.md` — body-identical mirror (frontmatter differs only
   in `argument-hint`/`allowed-tools` lines — preserve its frontmatter, sync the body).
3. `web/public/SKILL.md` — FULL byte-for-byte copy of canonical (CI-gated).
4. `~/.claude/skills/explain/SKILL.md` — installed copy, outside the repo, currently
   drifted two edits behind canonical. Sync it to the NEW canonical in full (not a
   patch). If the write outside the repo is blocked, report the exact `cp` command for
   the operator in your verdict instead of leaving copies half-synced.

`python3 scripts/skills_parity.py` gates 1–3 and must be green; it was green before
this slice.

## Out of scope

Server/web changes (none), CLI (F9 — none), any change to other skills.

## Validation

- `python3 scripts/skills_parity.py`
- `python3 scripts/workflow.py validate`
- A careful re-read of the edited step 5 flow end-to-end for internal consistency
  (statuses, file names, the merge command) — prose is the deliverable here.

## Wrap-up

Write `result.md`; append cross-slice notes + a one-line Doc impact entry
(`product.md` / `experience.md`: versioned publishing is now the skill's documented
update path) to `phase.md`.
