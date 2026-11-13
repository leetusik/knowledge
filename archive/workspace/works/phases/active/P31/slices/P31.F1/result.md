# P31.F1 result: fix the explain review's privacy probe and two package nits

## Verdict

- status: done
- tier: high
- model: opus
- effort: high
- summary: Replaced the explain review's privacy probe, which could not tell private from public. Step 5 now runs an org-key control (`GET /api/books/<project>/<book>`, must be 200), then an anonymous `GET /app/orgs/<org>/<project>/books/<book>`: 404 is private, 200 is public, and anything else is no evidence. The probe is live-proven on a tenant-mode scratch stack, where it answered 404 private and 200 public. Corrected the S4 Decision, appended OQ15 as OQ10's correction, fixed PATCHES §3 (L37) and added the backend.md Doc impact line.
- files_changed:
  - works/phases/active/P31/package/claude/skills/do-whole-phase/reference/explain-review.md
  - works/phases/active/P31/package/PATCHES.md
  - works/phases/active/P31/package/claude/skills/create-phase/explain-route.md
  - works/phases/active/P31/phase.md
  - works/phases/active/P31/slices/P31.F1/result.md
- validation:
  - `python3 scripts/workflow.py validate`: passed (only the pre-existing warnings).
  - The bootstrap is unchanged: `git status --short` is empty, HEAD is `f207775`.
  - The live probe ran on a scratch stack: PASS (status codes below).
  - The scratch uvicorn (PID 43905, `:8798`) was stopped and the port is free. The scratch DB `kb_p31f1` was dropped. `:8766` and `:3030` were never touched, and neither was production.
- deviations:
  - (1) Two guards were added beyond the plan's probe. One is the org-key control `GET /api/books/<project>/<book>` → 200. Without it, a wrong org, project or book name also gives a 404, which would read as "private". The other is a slug-less fallback, `GET /app/documents/<id>`, because an org key cannot learn its own tenant id. A legacy-form `url` is now also `needs_operator`, since the route always 404s on a server without orgs.
  - (2) An explicit line says an org key is not a member on `/app/*`; this was found live.
  - (3) Optional item 5 was taken: a one-sentence `mode` clause in `explain-route.md`.
  - `handoff-explain.md` was not changed. It says "proves it private (an anonymous 404)", which still reads true.
- doc_impact: `- backend.md: server/main.py gains _CheckedWrite and _check_document, the pre-lock validation shared by create_document and the new check_document handler; check_document is unmetered and lock-free … (P31.S1; recorded by P31.F1)`

## The probe in code

- `server/books_api.py` L114–152 is `resolve_book_by_slug`, which depends on `optional_user`.
  - In legacy mode it always answers 404 (L134).
  - An unknown org, project or book answers 404.
  - A member answers 200 whatever the visibility.
  - Anyone else gets 200 only when `registry.visibility == "public"`, and the one identical 404 otherwise, never a 403.
- `server/accounts/auth.py` L100–143: `optional_user` resolves **session** tokens only.
  - An org `vk_` key, or any unresolvable bearer, is treated as anonymous, never as a 401.
  - So an org key is not a member here. It also means a bearer could never produce a 401 on this route, though the probe sends none.
- `server/api_auth.py` L217–243: `resolve_api_read` raises 401 in tenant mode for a keyless request. That is why the old by-path probe was blind.
- `server/main.py` L1987–1999: `GET /api/books/{project}/{book}` with `resolve_api_read` answers 200 for the key's tenant, or 404. This is the control.
- `server/main.py` L1656–1666: the publish's `url` takes one of three forms:
  - `/@{org_slug}/{project}/{slug}` when a slug has been claimed;
  - `/documents/{id}` for a slug-less tenant;
  - `/{project}/{date}-{slug}/` in legacy mode.

  These forms are where the probe's `<org>` comes from, and how a legacy server is recognised.

## Live proof (scratch stack)

Setup:
- The scratch Postgres container `kb-p28s2-pg` (`127.0.0.1:55432`), with a new database `kb_p31f1`, migrated to `alembic head` (0001–0006).
- `uvicorn server.main:app` on `127.0.0.1:8798`, **tenant mode** like production: `DATABASE_URL` set, `KB_OPERATOR_EMAIL` and `KB_API_TOKEN` unset, so no tenant #1 and nothing public by definition.
- A scratch `KB_ROOT` (git init), a scratch `KB_DB_PATH`, `KB_STARTUP_REINDEX=0`, `KB_GIT_PUSH=false`.
- The flow, over HTTP from a scratchpad script (`httpx`):
  - two orgs signed up: one claimed the slug `p31f1org4`, the other stayed slug-less;
  - each minted an org key (`POST /app/credentials`);
  - each key published one native chapter of book `guide` into project `secret` (private by default) and project `open`;
  - `open` was then made public with `PATCH /app/projects/{id}`.
- Three earlier attempts failed on payload shape (tags count, `book.subject`, the `/app/projects` shape). They left only throwaway tenants, which went with the dropped DB.

| Org | Project | Anonymous `/app/orgs/<org>/<project>/books/guide` | Same, `<org>` = tenant id | Org-key control `/api/books/<project>/guide` | Org key on `/app/orgs/…` | Member session on `/app/orgs/…` | Old probe, anonymous `/api/documents/by-path/…` |
|---|---|---|---|---|---|---|---|
| slug `p31f1org4` | `secret` (private) | **404** | 404 | 200 | 404 | 200 | 401 |
| slug `p31f1org4` | `open` (public) | **200** | 200 | 200 | 200 | 200 | 401 |
| slug-less | `secret` (private) | **404** (tenant id form) | 404 | 200 | 404 | 200 | 401 |
| slug-less | `open` (public) | **200** (tenant id form) | 200 | 200 | 200 | 200 | 401 |

- **Unknown org, project or book:** 404 each, the same answer as private. That is why the control is needed.
- **Publish `url`s:**
  - the slug org got `http://127.0.0.1:8798/@p31f1org4/secret/ch1`;
  - the slug-less org got `http://127.0.0.1:8798/documents/5` and `/documents/6`.
- **The slug-less fallback, anonymous `GET /app/documents/<id>`:** the private docs (ids 3 and 5) answered 404, and the public ones (ids 4 and 6) answered 200.
- **Document route, anonymous `/app/orgs/p31f1org4/<project>/ch1`:** 404 for `secret`, 200 for `open`.
- **The old probe** answered 401 on private and public alike, which confirms REVIEW finding 1.
- **Not tested live:**
  - **The web `/@…` page,** because the scratch stack ran no Next app and `:3030` is off limits. It stays only a second probe, as before.
  - **Legacy mode,** which is shown by code (L134). Production is tenant mode.
  - **Production's routing of `/app/*` behind `KB_API_BASE_URL`,** because production is never touched.

**Instrument:** curl/httpx against the API. No browser was needed, because the probe is an API call.

Cleanup:
- `kill 43905`, my own PID only, and `:8798` is free.
- `DROP DATABASE kb_p31f1`; no `p31f1` database remains.
- The scratch `KB_ROOT` and SQLite under the session scratchpad could not be removed (the sandbox denied `rm -rf`). They hold only throwaway data and live outside the repo.

## Package and notebook edits

- **`explain-review.md` step 5:** the single by-path bullet is replaced by:
  - the control;
  - the source of the org (the `/@<org>/` `url`, else the tenant id or the `/app/documents/<id>` fallback; a legacy `url` → `needs_operator`);
  - the anonymous probe with its three outcomes (404, 200, anything else);
  - the `/@…` `url` as a second probe only, never a `/documents/<id>` console page;
  - "an org key is not a member on `/app/*`".
- **`PATCHES.md` §3 (L67):** `Find: L36` → `L37`. Re-grepped at `git show f207775:payload/claude/skills/do-next-slice/SKILL.md`: L36 is the decomposition line and L37 is the review line, matching the quoted text.
- **`explain-route.md` `mode` bullet:** one sentence says this is the book's mode, not the skill's §1 mode (change, topic or general), which the outline sets per chapter. It adds about 120 B to the text PATCHES 1c appends, so 13,630 + 4,977 ≈ 18.6 KB, and the "about 18.5 KB" claim stands.
- **`phase.md`:**
  - the S4 `## Decisions` line *REVIEW …* is corrected in place;
  - **OQ15 (P31.F1)** is appended as OQ10's correction (OQ10 itself is untouched);
  - the `backend.md` Doc impact line is appended;
  - in `## Notes for later slices`, the REVIEW→F1 note is consumed and an F1→REVIEW note added;
  - `## Now` is rewritten, with REVIEW round 2 next.
- **Checked and left alone:**
  - README L22 ("prove the book is private");
  - `handoff-explain.md` L74–75 ("an anonymous 404");
  - PATCHES L96/L102/L108/L141/L268, which say "publishes it private".

  None of them names the old route.
