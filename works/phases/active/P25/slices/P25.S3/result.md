# Result — P25.S3: web pretty document route and legacy `/documents/{id}` redirect

**Status: done.** `/@{org}/{project}/{doc-slug}` renders the document for members and
anonymous visitors alike, and an anonymous visitor on a legacy `/documents/{id}` link is
307-redirected to the pretty URL whenever the document has one. Q1 is now answered
**empirically, twice** (route manifest + a live `next start` probe): a root-level
`[org]/[project]/[slug]` shadows nothing. No rewrite, no `middleware.ts`, no
`next.config.ts` change — the wiring is plain App Router routing, exactly as D1 hoped.

## 1. Q1 — route precedence, settled empirically

Ran `npm run build` **before** writing the page to capture a baseline, then again after.
The diff is exactly one added route and **zero reordering**:

`.next/routes-manifest.json`, after (manifest order *is* match order; every
`staticRoutes` entry is tried before any dynamic one):

```
staticRoutes: /  /_global-error  /_not-found  /api/auth/login  /api/auth/logout
              /api/auth/signup  /dashboard  /documents  /graph  /login
              /manifest.webmanifest  /robots.txt  /signup  /sitemap.xml
dynamicRoutes (in order):
  0 /api/documents/[id]/raw               ^/api/documents/([^/]+?)/raw$
  1 /api/documents/[id]/versions/[v]/raw  ^/api/documents/([^/]+?)/versions/([^/]+?)/raw$
  2 /documents/[id]                       ^/documents/([^/]+?)$
  3 /documents/[id]/versions/[v]          ^/documents/([^/]+?)/versions/([^/]+?)$
  4 /graph/[org]                          ^/graph/([^/]+?)$
  5 /projects/[projectId]                 ^/projects/([^/]+?)$
  6 /[org]/[project]/[slug]               ^/([^/]+?)/([^/]+?)/([^/]+?)$   ← LAST
```

Two independent reasons it cannot shadow: (a) routes compile to **full-path** regexes,
not a greedy tree walk, and (b) the new all-dynamic route sorts **last** among the
dynamic ones (Next orders more-static-prefix first), so it is the final fallback rather
than a competitor. Route groups (`(public)`, `(app)`) are URL-transparent and change
none of this.

**Live probe** (production build, `next start -p 3131`, knowledge backend deliberately
not running so a "reached the real route" answer is distinguishable from a 404):

| URL | status | which page actually rendered |
|---|---|---|
| `/documents/25` | 500 | the **id** page (upstream unreachable → rethrow) — not the catch-all |
| `/documents/25/versions/1` | 500 | the **past-version** page — not the catch-all |
| `/api/documents/25/raw` | 502 | the **BFF relay** route handler — not the catch-all |
| `/graph/abc` | 404 | `(public)/graph/[org]`'s UUID guard |
| `/dashboard`, `/projects/9` | 307 | the `(app)` auth gate → `/login` |
| `/login` | 200 | the login page |
| `/@hi2vi/kb/hello` | 500 | the **new pretty page** (guard passed, upstream unreachable) |
| `/foo/bar/baz` | 404 | the **new pretty page's `@` guard** → branded not-found |

The last two rows are the discriminator: only they carry the new `publicNotFound` copy,
so the first three demonstrably did **not** fall through to `[org]/[project]/[slug]`.
The 500s are the expected "no backend on this laptop" answer, not a defect — a non-404
`ApiError` is rethrown by design so an outage never masquerades as a missing document.

## 2. What landed

**BFF helper** — `resolveDocument(token, org, project, slug, signal?)` in
`web/src/lib/knowledge/app.ts`, placed beside `getDocument`/`getDocumentRaw` in the same
`import "server-only"` module, token-first, `ApiError` never swallowed. Each of the three
segments is `encodeURIComponent`-escaped independently, so a slash or `..` inside any of
them cannot restructure the upstream path. The doc comment carries the full route
contract (bare org slug, exact project match, newest-under-slug, optional identity, one
indistinguishable 404, `id` still present so `/versions*` + `/raw` stay id-keyed).

**Pretty route** — `web/src/app/(public)/[org]/[project]/[slug]/page.tsx`, structurally a
clone of `(public)/documents/[id]/page.tsx`:

- The **`@` guard runs first**, before `optionalIdentity()` and before any upstream call:
  `org` must start with `@` *and* have a non-empty remainder, and neither `project` nor
  `slug` may be empty. This is load-bearing, not cosmetic — this route is now the
  catch-all for every unmatched 3-segment URL, so without it `/foo/bar/baz` would fire an
  upstream request. Params are defensively `decodeURIComponent`-ed (via a `safeDecode`
  that returns the input on a malformed escape) as the sibling routes do.
- `loadDocument` / `loadVersions` live **outside** the component, so `notFound()`'s throw
  is never swallowed by a `try` (repo hard convention). 404/400 → `notFound()` on
  **both** branches; everything else rethrows. `loadVersions` keeps the degrade-to-empty
  pattern verbatim.
- Member branch: `<AppShell>` + back-link to `/documents` + `<DocumentView>` +
  `<VersionHistory>`. Anonymous branch: `<PublicShell>` + the same two components. No
  `DeleteDocumentButton`, no `CopyLinkButton` (S5 owns share affordances wholesale).
- `<VersionHistory>` is fed `doc.id` — version links stay id-keyed, which is the exact-row
  addressing D2 deliberately keeps.
- Static `export const metadata = { title: DOCUMENTS.title }`, with the reason written
  into the file header.

**Co-located not-found** — `.../[slug]/not-found.tsx`, the sibling's `.kb-empty` markup
with **one deliberate difference**: the CTA links to `/`, not to the member-gated
`/documents`. New copy block `DOCUMENTS.publicNotFound` (title / sub / homeLabel) in
`web/src/content/documents.ts`; nothing inline.

**Legacy redirect** — `(public)/documents/[id]/page.tsx`, anonymous branch only: after
`loadDocument(undefined, id, …)` returns, `if (doc.canonical_path) redirect(doc.canonical_path)`
at page top level, outside any `try`. 307 (`redirect()`'s default), not 308, because D3
leaves slugs mutable. Member branch byte-unchanged. `canonical_path === null` (slug-less
tenant, legacy mode, registry-less owner) ⇒ serves exactly as today.

**Tests** — `web/tests/resolve-document.test.ts`, 4 cases in the `document-versions`
idiom (`vi.stubGlobal("fetch")`): exact URL + bearer + `cache: "no-store"`; per-segment
escaping (`hi 2vi` / `kb/../etc` / `a b` → `hi%202vi/kb%2F..%2Fetc/a%20b`); tokenless call
sends **no** `Authorization`; 404 → `ApiError` with `status: 404`, never swallowed. Page
rendering is not unit-tested in this repo (convention).

## 3. Validation

| Command | Result |
|---|---|
| `cd web && npm run build` (baseline, before any edit) | passed — manifest captured |
| `cd web && npm run lint` | passed (eslint, no output) |
| `cd web && npm run typecheck` | passed (`tsc --noEmit`, no output) |
| `cd web && npm run build` (after) | passed — `ƒ /[org]/[project]/[slug]` added, nothing reordered |
| `cd web && npm run test` | **14 files / 83 tests passed** (baseline 13/79 — verified by stashing) |
| live `next start -p 3131` probe, 9 URLs | table above — **no shadowing** |
| `npx prettier --check` on the touched paths | clean (see deviation 2) |
| `python3 scripts/workflow.py validate` | passed |
| `.venv/bin/python scripts/plugin_parity.py` | **PASS** (web is not a shipped dir; nothing to mirror) |

No `server/**`, `tests/**` or `plugin/**` file was touched, so the Postgres-gated pytest
suite is untouched by this slice and was not re-run (S2's baseline stands: 123 passed with
Postgres, 83 passed / 40 skipped without).

## 4. Deviations from `plan.md`

1. **The guard is slightly wider than "org starts with `@`".** It also rejects a bare `@`
   (empty org remainder) and an empty `project`/`slug`. Same spirit — reject before the
   upstream call — and it costs nothing.
2. **`web/src/lib/knowledge/app.ts` still fails `prettier --check`.** Pre-existing, and
   verified so by stashing: the three formatting complaints are in `getDocumentVersion`,
   `search` and `getGraph`, none of them mine. `prettier` on the file produces **zero**
   diff inside the `resolveDocument` block I added. I did not reformat the rest of the
   file — that would bury this slice's diff in unrelated churn, and `npm run lint` (the
   actual gate) passes. `document-view.tsx` / `explainer-frame.tsx` are likewise
   pre-existing prettier-dirty. My new test file **is** prettier-formatted.
3. **`safeDecode` helper** rather than a raw `decodeURIComponent`. A malformed escape
   (`%zz`) in a URL segment would otherwise throw a `URIError` and render a 500 on what is
   an anonymous share surface; falling back to the raw segment lets it flow into the
   guard/resolver and 404 like every other miss.
4. **The member branch renders no `CopyLinkButton` and no `DeleteDocumentButton`** — as
   the plan directs. Worth flagging for the review: a member landing on a pretty URL
   therefore has *fewer* affordances than on the id URL. That is intentional for this
   slice (S5 decides share affordances), not an omission.

Untouched as scoped: `robots.ts`, `sitemap.ts`, `next.config.ts`, `deploy/knowledge.conf`,
the graph routes, the dashboard, and everything under `server/`.

## 5. Notes for S4 / S5

- The pretty route is now the **catch-all for every unmatched 3-segment URL**. S4's
  `/@{org}/graph` is 2 segments and does not collide — but anything S4 or S5 adds at
  three segments must be *static-prefixed* (like `/documents/[id]/versions/[v]`) to win,
  and any new 3-segment dynamic route would race this one.
- `/documents/{id}/versions/{v}` has **no** pretty equivalent and gets none: version
  links from the pretty page are id-keyed on purpose.
- S5's copy-link on the id page must keep the member/anonymous asymmetry in mind: an
  anonymous visitor never *sees* the id page any more once a slug exists (they are
  redirected), so the id page's copy-link is effectively a member-only control.
