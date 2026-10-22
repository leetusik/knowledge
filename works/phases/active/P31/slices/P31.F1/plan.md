# P31.F1 — Fix the explain review's privacy probe and two package nits

## Why

`P31.REVIEW` round 1 returned `changes_requested`; see `slices/P31.REVIEW/result.md` → *Findings*.

The explain review's privacy proof is meant to protect the operator's "private by default". As written it
checks nothing in production:
- an anonymous `GET /api/documents/by-path/…` answers 401 in tenant mode whatever the visibility
  (`server/api_auth.py` L217–243);
- the web `url` probe only works in the pretty `/@…` form.

## Do

Package and notebook only. No product code, and never edit the bootstrap.

1. **`package/claude/skills/do-whole-phase/reference/explain-review.md` step 5:** replace the probe.
   - **Verify the route and its answers in the code first:** `server/books_api.py` (the anonymous book route
     near L114) and how it answers for a private project, a public one, and an unknown org or book.
   - Then write the probe as `GET <KB_API_BASE_URL>/app/orgs/<org slug or tenant id>/<project>/books/<book>`,
     with no key:
     - **404 = private, proceed.**
     - **200 = public**: stop, `needs_operator` (the operator decides).
     - Anything else, including a 401, is **no evidence**: `needs_operator`.
   - Keep the web `url` probe only for the `/@…` form.
   - **Prove it live** on a scratch stack. Follow the scratch rules in `phase.md`: never `:8766` or `:3030`,
     never production, stop only your own PIDs.
     1. Publish a tiny book into a **private** project and a **public** one, using an org credential.
     2. Run the probe anonymously on each, and record the status codes in `result.md`.
     3. Note whether the scratch stack's tenant mode matches production's, meaning Postgres with an org. If
        the legacy mode can't show it, use the scratch Postgres at `127.0.0.1:55432` with a scratch database
        you create and drop.
2. **Correct the S4 line in `## Decisions` in place** so it names the new probe. Then **append** an OQ10
   correction to `## Operator Questions`. That list is append-only: never rewrite the old entry.
3. **`package/PATCHES.md` §3:** change `do-next-slice/SKILL.md` **L36 → L37**. Re-grep it at bootstrap
   `f207775`, along with anything else you touch.
4. **`## Doc impact`:** append one `backend.md` line. It covers `_CheckedWrite`/`_check_document`, shared by
   `create_document` and the unmetered, lock-free `check_document` (P31.S1).
5. **Optional, low cost:** one clause in `explain-route.md` or `explain-decomposition.md` separating
   `## Explain`'s `mode` (codebase/general) from the skill §1's mode (change/topic/general).
6. If `handoff-explain.md` repeats the old probe, fix it there too.

## Validation

- `python3 scripts/workflow.py validate`.
- The bootstrap is unchanged (`status --short` is empty, HEAD `f207775`).
- The scratch stack is stopped, and any scratch DB you created is dropped.

## Notebook

- `phase.md`:
  - consume the F1 note;
  - `## Now`, with REVIEW round 2 next.
- `result.md`: verdict block first, including the probe's status codes.

## Dispatch

slice=P31.F1
phase=P31
kind=fix
risk=high
attempt=1
route=high
reason=risk high (not low)
tier=high
subagent_type=slice-executor-high
model=opus
pass_model=yes
effort=high
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=high
