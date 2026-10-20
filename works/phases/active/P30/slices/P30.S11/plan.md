# P30.S11 — Sign-in return address (D18, D32) and org-slug reader URLs

## Goal

1. **The return address after sign-in (absorbs D32 and D18's re-scoped member half):** `requireSession()`
   and its 401 branch redirect to `/login?next=<path>`, built through `headers()` or middleware and
   laundered by `safeNextPath`, so signing in returns the reader to where they were. Open redirects must
   be impossible.
2. **"Sign in to save" returns to the same chapter and block** (`01-reader` §12, Sign in to save).
3. **Reader URLs are built on the owner's org slug** (`/@{org}/…`), with `tenants.slug` nullable. A tenant
   without a slug falls back as decided in OQ26 (the tenant id). The visual case is undrawn: if a visual
   decision is needed, decide by the most conservative existing pattern and record it.

The landing after sign-in moves to `/library` in S22, where it is drawn. Don't change the default landing
here.

## Read first (just in time)

- `works/phases/active/P30/topics/slice-breakdown.md` → **S11**.
- `works/deferred/open/D18/brief.md` and `works/deferred/open/D32/brief.md` (the D18 history: P28.REVIEW
  re-scoped it to the member guard).
- `docs/reference/design/jobs/01-reader/rounds/02-revise/build-prompt.md` §12, Sign in to save, and §15
  if it touches auth. The superseding round
  `jobs/01-reader/rounds/03-chapter-bar-and-border/result.md` `## Build` changes only the bars and the
  edge.
- P29 *S3 Who keeps state* (anonymous keeps nothing; "Sign in to save" returns to the chapter).
- `works/phases/active/P30/topics/notes-server.md` → *S8* (OQ26: `org` is the org slug, or the tenant id
  for a tenant without one) and *S2* (the public book route `/app/orgs/{org}/{project}/books/{book}`).
- Code:
  - `web/src/lib/` auth/session helpers (`requireSession`, `safeNextPath`);
  - `web/src/middleware.ts` (if any);
  - `web/src/app/(auth)/login`;
  - the public routes under `web/src/app/(public)/@…` or similar;
  - `server/auth_api.py`, `server/accounts/`;
  - the existing web tests.

## Approach (pinned)

1. **`next=`:** in the 401/redirect branch of `requireSession()` (and any equivalent guard), take the
   current path and search from request headers (`headers()`: `x-pathname` set by middleware, or `next-url`
   or the referer, whichever the codebase already supports; add a tiny middleware that sets
   `x-invoke-path` if nothing exists). Redirect to `/login?next=…`.
   - `safeNextPath` accepts only same-origin relative paths: a leading single `/`, no `//`, no `\`, no
     scheme, no control characters, and length-capped. Anything else becomes the default landing.
   - Login success honours `next`. Check every login success path (password, magic link, OAuth callback,
     whatever exists).
2. **Sign in to save:**
   - The reader's "Sign in to save" link carries `next=/@{org}/{project}/…#<block-id>` (or the reader route
     S13 will use; build the URL with a helper `readerHref(...)` in `web/src/lib/`, so S13+ reuse it).
   - After sign-in, the reader lands at the same chapter and block.
   - The reader UI is S13's. This slice ships the helper, the guard behaviour, and a test of the
     round-trip at the URL level.
3. **Org-slug URLs:** a helper `orgSegment(tenant)` returns the slug, or the tenant id when the slug is
   null, consistent with S8's OQ26 and S2's public route. Use it wherever reader and book URLs are built
   (the helper, and S2's server responses if they emit URLs).
4. **Anonymous public reads stay anonymous.** No redirect on public routes; only save actions prompt for
   sign-in.

## Tests (very core: an open redirect is a security bug)

- `safeNextPath` table tests: accepts `/a/b?c#d`; rejects `//evil.com`, `/\evil`, `https:…`, `javascript:`,
  an encoded `%2F%2F`, a newline, and an overlong path.
- `requireSession` redirect carries `next`.
- Login honours a safe `next` and ignores an unsafe one.
- `orgSegment` with a slug and with a null slug.

## Live check

In the dev runtime, run a fresh local API on a spare port (for example `:8767`) with a scratch `KB_ROOT`
and the test Postgres, plus `pnpm --dir web dev` with `KB_API_BASE_URL` pointing at it. **Never use or stop
the standing `:8766` server**, whose `KB_ROOT` is this repo. With Aside `aside repl --account u1`, or the
fallback browser:
- signed out, open a member page, sign in, and land back on it;
- try a crafted `/login?next=//evil.com` and land on the default.

Name the instrument in `result.md`. Also run the production build.

## Validation

- `pnpm --dir web typecheck`, `lint`, `test` and `build`.
- `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55432/kb uv run pytest -q`, if the server changed.
- `python3 scripts/plugin_parity.py`, `python3 scripts/skills_parity.py` and `python3 scripts/workflow.py
  validate`.
- D22: format only the files you create.

## Notebook

- `phase.md`:
  - **one** Doc impact line for this slice listing every doc it touches (likely `frontend.md`,
    `security.md`, `api.md`), with the full lines in `topics/doc-impact-detail.md` under `### P30.S11`;
  - notes for S13 and S22 (the `readerHref`/`orgSegment` helpers, the login `next` behaviour) in
    `topics/notes-later.md` with one link line;
  - `## Now`.
- `result.md`: verdict block first. List D18 and D32 as shipped, for REVIEW to close.

**Unattended run:** settle open choices by the safest option. Record them on `## Operator Questions` as
`decided: …`, and return `done`.

## Dispatch

slice=P30.S11
phase=P30
kind=implementation
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
