# Result — P25.S5: share affordances — copy-link, save URL, and the org-slug settings field

**Status: done.** Every surface that hands a URL to a human now hands out the pretty
one, and the operator can claim the org slug from the dashboard. Web-only: no
`server/**`, no root `tests/**`, so nothing was mirrored into `plugin/templates/`.

## 1. Type + BFF helper

- **`KbTenant.slug: string | null`** (`web/src/lib/knowledge/types.ts`) — additive on the
  canonical tenant shape, so signup / login / `GET /auth/me` / `GET /app/tenant` all carry
  it and the dashboard reads it straight off `identity.tenant` with no extra call. Its doc
  comment states the rule the rest of the phase depends on: it is the **input** to a pretty
  URL, never the URL — a payload that already carries `canonical_path` wins.
  It is **required, not optional** (the backend always emits the key); the one typed
  literal in the suite (`tests/knowledge-auth.test.ts`'s `TENANT`) gained `slug: null`,
  which is also the honest pre-claim state.
- **`setTenantSlug(token, slug)`** (`web/src/lib/knowledge/app.ts`) — `PATCH /app/tenant`
  `{slug}` → 200 `{tenant}`, unwrapped to `KbTenant` through a new `RawTenantResponse`
  envelope. Its JSDoc carries the whole contract (422 malformed-or-reserved, 409 taken —
  globally unique, 404 tenant vanished, 401 session dead) and says why there is **no GET
  twin**: `serialize_tenant` is canonical, so `/auth/me` already answers the current slug.

## 2. Copy-link swaps (three surfaces, zero new fetching)

| Surface | Path handed to the clipboard |
|---|---|
| `(public)/documents/[id]` member branch | `doc.canonical_path ?? /documents/{id}` |
| `(app)/graph` header | `graph.canonical_path ?? /graph/{orgId}` |
| `(public)/[org]/[project]/[slug]` member branch (**new button**) | `doc.canonical_path ?? /documents/{doc.id}` |

The pretty page's header comment ("share affordances are S5's job wholesale, so neither is
rendered here") was updated to say what is now true: the copy-link lives here, on the
member branch only, matching the id page; delete stays on the id URL.

## 3. Dashboard org-slug panel

- **`setOrgSlugAction`** in `dashboard/actions.ts`, cloning `setProjectVisibilityAction`'s
  shape: trim + lowercase (knowledge's own normalization order) → zod
  `^[a-z0-9]+(-[a-z0-9]+)*$` / 2–40 → `requireIdentity()` **outside** the try → status
  branching → `revalidatePath("/dashboard", "page")`. The ~38-word reserved list is
  deliberately **not** mirrored client-side (it would drift); a reserved slug passes the
  schema and comes back as the mapped 422.
  Error map: 400/422 → `invalid` (cites charset + length), 401 → `sessionExpired`,
  404 → `notFound`, **409 → `taken`, its own key**, else `generic`.
- **`dashboard/org-slug-form.tsx`** — a new client island on the `visibility-toggle` /
  mint-form idiom: `INITIAL_STATE` in the island (a `"use server"` module may export only
  async functions — the repo's request-time footgun), `useActionState`, `useId` +
  `FieldError` + `aria-describedby`, `disabled={pending}` + pending label swap.
  **Always visible and prefilled** (`defaultValue`), not a disclosure: slugs are mutable
  and the current value is what the operator comes to see. `maxLength={40}` mirrors the
  backend cap.
- **`dashboard/page.tsx`** — a new `kb-panel` section structurally twinned with the
  org-keys panel (heading + lead left, form right), placed **above** it so the public
  identity is visible without scrolling past the keys table. Below the form: the resulting
  `/@{slug}/graph` in mono with a `CopyLinkButton`, or the "no public URL yet" line while
  the slug is null. No new reads — `identity` was already on the page.
- **Copy** — `SET_ORG_SLUG_ERRORS` + `DASHBOARD.orgSlug` in `web/src/content/dashboard.ts`,
  re-exported through `content/index.ts`. No inline strings.

## 4. Tests

`web/tests/set-tenant-slug.test.ts` (new, 2 cases, mirroring `resolve-document.test.ts`):
the exact upstream URL + `PATCH` + `{"slug":…}` body + bearer + `cache: "no-store"` and the
`{tenant}` unwrap; and a **409 surfacing as `ApiError(409)`** — the one status the action
branches on separately. No page-render tests (repo convention); "tests stay small".

## 5. Validation

| Command | Result |
|---|---|
| `cd web && npm run lint` | passed (eslint, no output) |
| `cd web && npm run typecheck` | passed (`tsc --noEmit`) |
| `cd web && npm run build` | passed — **route table unchanged** (no new routes; `/dashboard` still `ƒ`) |
| `cd web && npm run test` | **15 files / 85 tests passed** (baseline 14 / 83, +1 file / +2 cases as planned) |
| `.venv/bin/python scripts/plugin_parity.py` | **PASS** (nothing mirrored — `web/` is not a shipped dir and no `server/**` or root `tests/**` file was touched) |
| `python3 scripts/workflow.py validate` | passed |
| `npx prettier --check` on the touched files | see below |

**Postgres-gated pytest was NOT run and was not required:** this slice changes no backend
file. S4's baseline stands — **124 passed** with Postgres, **83 passed / 41 skipped**
without.

**Prettier:** the two new files (`org-slug-form.tsx`, `set-tenant-slug.test.ts`) are clean.
The four modified files that `--check` still warns on (`content/dashboard.ts`,
`dashboard/page.tsx`, `tests/knowledge-auth.test.ts`, `lib/knowledge/app.ts`) were each
verified **already dirty at HEAD** (`git show HEAD:<file> | prettier --check --stdin-filepath`),
and every remaining complaint is either pre-existing or a line written to match its
immediate neighbours (my `DASHBOARD.orgSlug.empty` string wraps exactly like the adjacent
`orgKeys.empty`; my Tailwind class order copies the sibling `<span>` two lines up). Per
S3's gotcha, `prettier --write` was NOT run across them — `npm run lint` is the real gate
and it passes.

## 6. Deviations from `plan.md`

1. **The member graph header reads `graph.canonical_path`, not `identity.tenant.slug`.**
   The plan specified `path={slug ? \`/@${slug}/graph\` : \`/graph/${orgId}\`}`, but S4
   landed `canonical_path` on the graph response (built free from `ctx.tenant` on the
   member path) and its result explicitly told S5 to read it from there. phase.md's binding
   note — "build the pretty URL **once**, in the backend … do not re-derive it in
   TypeScript" — settles it. Same fallback, same guard (`orgId ? … : null`), zero extra
   calls, one less place composing a URL. `KbTenant.slug` is still added and still needed
   (the dashboard prefill + the panel's gating).
2. **The dashboard panel does compose `/@{slug}/graph` locally** — the one place on the web
   plane that composes a pretty path, because the dashboard fetches no graph payload to
   read a `canonical_path` from and adding a `/app/graph` call for one display string would
   be worse. Called out in a code comment and in the phase notes so a reviewer sees it is
   deliberate rather than a slip.
3. **`tests/knowledge-auth.test.ts` gained one line** (`slug: null` on its typed `KbTenant`
   literal) — unavoidable once `slug` is required, and it encodes the pre-claim state.
4. Panel order: placed **before** the Org API keys section rather than appended after it
   (the plan fixed the panel's structure, not its position).

## 7. Notes for the review

- Nothing here can be exercised end-to-end without a live backend + session; `build`,
  `typecheck`, `lint`, and the unit suite are the gates that ran. The one runtime footgun
  this repo has bitten on before — a non-async export from a `"use server"` module — is
  avoided (`actions.ts` exports async functions plus one erased type).
- The slug is claimed **by the operator, after deploy**. Until then every `canonical_path`
  in the product stays `null` and every surface here renders its pre-P25 fallback, which is
  exactly the "no link breaks" contract.
