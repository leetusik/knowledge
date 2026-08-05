# Plan — P24.S2 (/explain skill: honest publish timeout + verify before retry)

## Read first

`../../phase.md` — the Decomposition row for S2, the Constraints (skill parity gate +
the `allowed-tools` prefix rule), and S1's landed contract notes: `push_pending: bool`
is now on the 201, `pushed: false` means "saved, publishes on the next successful
push" (never a failure), `push_error` no longer appears, `commit_sha` is the local
pre-rebase commit. The server now answers the publish POST fast — the skill's timeout
handling is the remaining dishonesty.

## Scope — SKILL.md §5/§6/§8 edits

1. **Raise the publish POST's `--max-time`** to a value that comfortably covers the
   now-fast response (e.g. 30 — your call; justify briefly in result.md). The
   `allowed-tools` frontmatter pre-approves `Bash(curl -sS --max-time 5:*)` only —
   add the matching entry for the new value in the canonical frontmatter (and thus the
   byte-identical `web/public/SKILL.md`); the `.agents` copy carries no
   `allowed-tools`. Keep the existing 5s entries for the other curls that still use
   them (don't churn unrelated commands).
2. **Rewrite the transport-failure branch honestly** (currently: any non-zero curl
   exit → "API unreachable → step 6"). After a timeout/transport error on the publish
   POST itself, the save may well have landed:
   - Verify with `GET /api/documents/by-path/<rel_path>` (the skill knows
     project/date/slug; for a `new_version` publish it knows the resolved
     `PRIOR_REL_PATH` from P23's step 3). Match on what proves *this* publish landed
     (e.g. the returned `version`/title/updated recency — your call, keep it simple
     and unambiguous).
   - Landed → report success honestly (note `push_pending`/`pushed` semantics — the
     publish is saved; git publishing completes in the background), write no file,
     never re-POST.
   - Genuinely absent → only then the existing step-6 fallback logic (API truly
     unreachable) or a single re-POST if the verification GET itself succeeded
     (meaning the API is reachable and the save really failed) — never a blind retry
     (duplicate/unwanted-v2 hazard, P23).
3. **Step 8 reporting**: reflect the new fields honestly — `push_pending: true` /
   `pushed: false` is not an error; drop any wording that reads `push_error` (it no
   longer exists in responses).
4. **Copies**: canonical `plugin/skills/explain/SKILL.md` → `.agents/skills/explain/
   SKILL.md` (body sync, preserve its own frontmatter) → `web/public/SKILL.md` (full
   byte copy) — `python3 scripts/skills_parity.py` must stay green. ALSO sync the
   installed copy `~/.claude/skills/explain/SKILL.md` (P23 established it as the
   fourth copy; it is currently byte-identical to canonical and would otherwise
   drift). If that outside-repo write is blocked, report the exact `cp` command in
   your verdict.

## Out of scope

Server (S1 done), CLI (S3), any other skill, changple5.

## Validation

- `python3 scripts/skills_parity.py`
- `python3 scripts/workflow.py validate`
- End-to-end consistency re-read of the edited §5→§6→§8 flow (statuses, variable
  names, the merge command untouched, every curl's `--max-time` covered by
  `allowed-tools`).

## Wrap-up

Write `result.md`; append cross-slice notes + a one-line Doc impact entry
(client verify-before-retry rule) to `phase.md`.
