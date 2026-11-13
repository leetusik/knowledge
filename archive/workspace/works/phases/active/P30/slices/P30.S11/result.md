# P30.S11 — result

## Verdict

- status: done
- tier: high
- model: opus
- effort: high
- summary: Every member-guard bounce now carries `/login?next=<page>`: a Next 16 `src/proxy.ts` stamps the page path, and `safeNextPath` launders it, now also refusing encoded `//`/`\` and values over 2,048 characters. Login and signup both honour `next`, and the anonymous-miss bounces carry it too. `web/src/lib/reader-href.ts` is the one builder for reader, book and "Sign in to save" URLs, on `orgSegment` (the slug, else the tenant id), and the server book route now resolves a tenant id. D18 and D32 have shipped.
- files_changed: web/src/proxy.ts (new), web/src/lib/reader-href.ts (new), web/src/lib/next-path.ts, web/src/lib/session.ts, web/src/lib/auth-guards.ts, web/src/app/(auth)/auth-card.tsx, web/src/app/(auth)/credentials-form.tsx, web/src/app/(auth)/login/page.tsx, web/src/app/(auth)/signup/page.tsx, web/src/app/(auth)/signup/signup-form.tsx, web/src/app/(public)/documents/[id]/page.tsx, web/src/app/(public)/documents/[id]/versions/[v]/page.tsx, web/tests/next-path.test.ts, web/tests/session-guards.test.ts, web/tests/reader-href.test.ts (new), web/tests/login-next.test.ts (new), server/books_api.py, tests/test_books.py, plugin/templates/kb/server/books_api.py, plugin/templates/kb/tests/test_books.py, works/phases/active/P30/phase.md, works/phases/active/P30/topics/{operator-questions-decided,doc-impact-detail,notes-later}.md
- validation: `pnpm --dir web typecheck` PASS · `lint` PASS · `test` PASS (20 files, 161 tests) · `build` PASS (lists `ƒ Proxy (Middleware)`) · `KB_TEST_DATABASE_URL=… uv run pytest -q` PASS (223; `tests/test_books.py` 6, both Postgres-gated tests ran) · `python3 scripts/plugin_parity.py` PASS · `python3 scripts/skills_parity.py` PASS · `python3 scripts/workflow.py validate` PASS (pre-existing warnings only) · live round trip in the dev runtime and the production build, with Aside `--account u1`: PASS
- deviations: (1) The plan's header suggestion (`x-invoke-path`) became `x-kb-request-path`, set by Next 16's `proxy.ts`, which is middleware's new name. (2) Two scope additions that serve the plan's goal: signup honours `next` (it is a sign-in success path), and the anonymous-miss bounces on `/documents/{id}` and its versions carry `next` (D18's original half). (3) The live dev server ran from a `cp -Rc` clone of `web/` in the scratchpad, because Next 16 refuses a second `next dev` in the same directory while the standing `:3030` runs, and the plan says not to touch that server. The production build ran with `next start -p 3032` from `web/`.
- doc_impact: `- api.md, decisions.md, frontend.md, security.md: P30.S11 — full lines in topics/doc-impact-detail.md → *P30.S11* (P30.S11)`
- deferred shipped (for REVIEW to close): **D18** (login return address; its member half, as re-scoped at P28.REVIEW, and the anonymous-miss half) and **D32** (the member guard bounces with no return address).

## What shipped

**The return address (D32, D18).**
- `web/src/proxy.ts`: for every page request (`api/`, `_next/*` and metadata files excluded) it overwrites the request header `x-kb-request-path` with `pathname + search`. It does not redirect or read a cookie. Next strips `_rsc` from `nextUrl` before the proxy sees it (checked in `next/dist/server/web/adapter.js`).
- `session.ts`: `loginRedirectTarget()` returns `loginHref(header)`. `requireSession()` redirects there, and so does `auth-guards.ts` `requireIdentity()` on the dead-token 401.
- `next-path.ts`:
  - `safeNextPath` adds two fail-closed rules (OQ43): a length cap (`MAX_NEXT_PATH_LENGTH` = 2048), and a pathname whose percent-decoded form (up to 3 rounds) carries `//`, `\` or a control character anywhere. Invalid encoding is refused.
  - New `loginHref(next)` builds `/login?next=<encoded safe path>`. It returns a bare `/login` when the value is missing, unsafe or the default.
  - New exports: `LOGIN_PATH` and `REQUEST_PATH_HEADER`.
- Login was already honouring `next` (P28.S5). Signup now does too: the page launders it, passes it to `redirectIfAuthenticated` and the form, and `AuthCard`'s cross-link carries it in the href only. There is no magic link or OAuth in the codebase (checked `server/auth_api.py` and `web/src/app/api/auth/*`).
- The anonymous-miss bounces on `(public)/documents/[id]` and `/versions/[v]` now go to `loginHref('/documents/{id}…')`. The `[org]` public pages are unchanged and still never redirect (live: `/@nobody/x/y` → 404).

**Sign in to save, and the org-slug URLs.**
- `web/src/lib/reader-href.ts` provides:
  - `orgSegment({id, slug})` → the slug, else the id;
  - `bookHref` → `/@{org}/{project}/books/{book}`;
  - `readerHref(target, {lang, version, section})` → `/@{org}/{project}/books/{book}/{chapter}?lang=&v=#section` for a chapter. For a loose document it returns `canonical_path`, else `/documents/{id}`;
  - `signInToSaveHref` → `loginHref(readerHref(...))`.
- Segments are encoded so none can escape the route, and `@` is kept readable, matching the existing `[org]` page.
- `server/books_api.py` (mirrored to `plugin/templates/kb/`):
  - `GET /app/orgs/{org}/{project}/books/{book}` resolves `org` as a UUID first, then as a slug (`/app/graph`'s rule). It keeps the single 404 and the visibility gate.
  - Both book reads' `canonical_path` use `reader_state.org_label` (the slug, else the tenant id) and are never `null` now (OQ42).
  - Loose-document URLs keep the existing `canonical_path ?? /documents/{id}` contract.
- No visual decision was needed for the slug-less case: the fallback is a URL, and every surface renders the same.

## Decided on the unattended run (`## Operator Questions`, full text in `topics/operator-questions-decided.md` → *P30.S11*)

- OQ42: a slug-less tenant's reader URLs are built on the tenant id. The server book route resolves both forms; loose documents are unchanged.
- OQ43: the stricter `next` laundering (decoded `//` `\` control characters, the 2,048 cap).
- OQ44: the proxy header is always overwritten and always laundered, so a missing or planted value degrades to a bare `/login`.
- OQ45: the success paths are login and signup, plus the anonymous-miss bounces.

## Tests (core: an open redirect is a security bug)

- `web/tests/next-path.test.ts`:
  - accepts `/a/b?c#d`, a full reader place, and `%2F%2F` in the query;
  - rejects `/%2F%2Fevil`, `/%2f%2f`, `/%5C`, `/%252F%252F`, `/%0A`, `/a//evil`, broken encoding, and a value over the cap (the cap value itself is accepted);
  - `loginHref` encodes and round-trips, and is bare for unsafe or default values.
  The existing cases still pass: `//evil.com`, `/\evil`, `https:`, `javascript:`, newline.
- `web/tests/session-guards.test.ts`:
  - `requireSession` carries `next` (path + query) and drops a crafted header;
  - `requireIdentity`'s 401 carries `next`;
  - `redirectIfAuthenticated` honours a safe `next`, hash included, and sends an unsafe one to `/dashboard`.
- `web/tests/login-next.test.ts`: `/login` and `/signup` hand a safe `next` to the card, the form and the bounce, and turn four unsafe ones into `/dashboard`.
- `web/tests/reader-href.test.ts`:
  - `orgSegment` with a slug, a null slug and an empty slug;
  - the chapter, book and document hrefs, and segment encoding;
  - the Sign in to save round trip at URL level: `signInToSaveHref`, then parse `next`, then `safeNextPath`, gives the same chapter, lang, version and block, also for a slug-less tenant.
- `tests/test_books.py::test_slugless_tenant_book_is_addressed_on_its_tenant_id` (Postgres):
  - the member read names `/@{tenant-id}/…`, and that path resolves anonymously for a public project;
  - a private project is the same 404 as a random tenant id;
  - after a slug is claimed, the id path still resolves and `canonical_path` names the slug.
  The existing private-project test was refactored onto the shared seeding helpers and is unchanged in what it asserts.

## Live check

**Instrument:** Aside, `aside repl --account u1`. It was not running, so I started it with `open -g -a Aside`.

**Stack:**
- a fresh API on `:8767` (`KB_ROOT` = a scratch git repo, `DATABASE_URL` = the test Postgres `:55432`, `KB_GIT_COMMIT=false`) with a throwaway account `s11-live-*@example.com`;
- the dev runtime: `next dev -p 3031` from a scratchpad clone of `web/`, with `KB_API_BASE_URL=http://127.0.0.1:8767`;
- the production build: `next start -p 3032` from `web/`, same API.

The standing `:8766` and `:3030` were never used or stopped. My three servers were stopped afterwards; `:3030` and `:8766` were still listening.

Results, identical in dev and in the production build:

| Step | Landed on |
|---|---|
| Signed out, open `/documents?tag=rust` | `/login?next=%2Fdocuments%3Ftag%3Drust` |
| Sign in | `/documents?tag=rust` |
| `/login?next=//evil.com` while signed in | `/dashboard` |
| The same, signed out, then sign in | `/dashboard` |
| `next=/%2F%2Fevil.com`, then sign in | `/dashboard` |
| The login → signup cross-link with `next=/graph` | `/signup?next=%2Fgraph` |
| (prod) `next=/documents?tag=x#s-intro`, then sign in | `/documents?tag=x#s-intro`: the hash survives, which is what Sign in to save relies on |

curl against the production build:
- `/projects/abc` → `307 /login?next=%2Fprojects%2Fabc`;
- `/documents/999999` (anonymous miss) → `307 /login?next=%2Fdocuments%2F999999`;
- `/@nobody/x/y` → 404 (no redirect);
- a planted `x-kb-request-path: //evil.com` on `/graph` → `/login?next=%2Fgraph` (the proxy overwrote it).

Side effect: the agent profile `u1` is left signed **out** of `127.0.0.1` (logged out at the end; cookies ignore the port, so that includes `:3030`). This is noted in `## Now`.

## Notebook

All edits to `phase.md` went through `phase-section`:
- `## Doc impact`: one line; the full lines are in `topics/doc-impact-detail.md` → *P30.S11*.
- `## Operator Questions`: OQ42–OQ45 appended and resolved; the full text is in `topics/operator-questions-decided.md` → *P30.S11*.
- `## Decisions`: one S11 line.
- `## Notes for later slices`: removed the consumed DECOMP "undrawn slug-less tenant" note and dropped S11 from the S2 and S8 notes' audiences. Added one link line to `topics/notes-later.md` → *URLs and the sign-in return address*, for S13 and S22.
- `## Now`: rewritten.

D22: `prettier --write` was run only on the four new files. Each edited existing file has the same prettier `--check` status as at HEAD: four failed before and still fail, the rest pass.
