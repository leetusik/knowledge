# Plan — P23.S3 (web: document version history + past-version view)

## Read first

`../../phase.md` — findings F5/F6 and the S2 notes: the exact `/app` route shapes landed
in `server/documents_api.py` (list `{rel_path, current_version, total, versions[]}` with
body-less rows `version DESC`; one version adds `markdown`, never `raw_html`; raw route
serves archived HTML with the four sandbox headers). All three are optional-identity
(member or public-project anonymous, 404-never-403) and unmetered. `documents.version`
is already on the document read shape — render "current" from the doc itself; call the
version routes only for history.

## Scope

**Types + wrappers** (`web/src/lib/knowledge/types.ts`, `app.ts`):
- `KbDocumentVersion` (rel_path, version, archive_path, title, date, tags, format,
  created_at; optional markdown on the single fetch) and a versions-page envelope type,
  mirroring the server projector verbatim (comment style as the existing types).
- Wrappers copying `getDocument` / `getDocumentRaw` signatures exactly
  (`token: string | undefined`, trailing `signal?`):
  `getDocumentVersions(token, id)`, `getDocumentVersion(token, id, version)`,
  `getDocumentVersionRaw(token, id, version)` → `/app/documents/{id}/versions[...]`.

**Document page — version history panel:**
- In `(public)/documents/[id]/page.tsx`, both branches: after the doc loads, fetch the
  version list with the same token (tokenless for anonymous). Render a history panel
  only when `total > 0` — an unversioned corpus renders byte-identical to today.
- Keep `document-view.tsx` auth-free: either pass the versions list in as an optional
  prop or render a separate panel beside/below `DocumentView` in the page — your call;
  do not put member-only logic inside the shared view (there is none here anyway — the
  panel is identical for both branches).
- Panel look: `.kb-panel` + `.kb-panel__head`, rows in the existing `.kb-dtable`
  vocabulary or the headless `DataTable` from `@/components/ui` (the `(app)/documents`
  list page and projects credentials table are the closest analogues). Current version
  shown from `doc.version` (e.g. a `.kb-status--chip`-style "current" marker), archived
  rows link to the past-version view.

**Past-version view — new nested route** `(public)/documents/[id]/versions/[v]/page.tsx`:
- New-but-consistent shape (precedents: `(app)/projects/[projectId]`,
  `(public)/graph/[org]`). Repeat the doc page's structure: coerce/validate both params
  before any session read, `optionalIdentity()`, member branch → `AppShell` (back-link
  to the document), anonymous → `PublicShell` with miss → `redirect("/login")`; the
  miss-mapping helper lives outside the render (copy `loadDocument`'s pattern). Static
  `metadata` — no `generateMetadata` (deliberate: no second uncached fetch).
- Render: clear "viewing version N (superseded — current is vM)" framing + metadata
  strip; `format === "html"` → `ExplainerFrame` pointed at the new BFF relay, else
  `MarkdownBody` in a `.kb-panel`. Read-only — no actions on a past version.

**BFF raw relay twin** `web/src/app/api/documents/[id]/versions/[v]/raw/route.ts`:
- Copy `api/documents/[id]/raw/route.ts` verbatim in structure: validate params before
  session read, optional identity, `getDocumentVersionRaw`, 404/502 mapping, buffer +
  `injectHeightReporter`, and re-assert the pinned `RAW_HTML_HEADERS` explicitly.
- **`web/next.config.ts`**: add the matching per-path headers entry for
  `/api/documents/:id/versions/:v/raw` (without it the global `X-Frame-Options: DENY`
  wins and framing fails only at runtime — nothing in build/lint/test catches it).

**Copy** (`web/src/content/documents.ts` + barrel `index.ts`):
- New `versions` group under `DOCUMENTS` (`as const`, functions for interpolated
  strings, e.g. panel title, `versionLabel(n)`, current marker, superseded framing);
  re-export via `@/content` with a phase-tagged comment; pages import from the barrel.

**Tests** (node-only vitest — wrapper/route seams, no component tests):
- One wrapper seam test mirroring `tests/delete-document.test.ts` (stub fetch; assert
  method/url/token header/cache for the versions wrappers).
- One relay test mirroring `tests/raw-route.test.ts` for the new route (headers,
  upstream URL, tokenless relay, 404 mapping).
- Keep both terse.

## Out of scope

Server changes (none needed), skill (S4), version publish/rollback UI, design changes
(reuse existing tokens/components only — F6).

## Validation

In `web/`: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
Repo root: `python3 scripts/workflow.py validate`.

## Wrap-up

Write `result.md`; append cross-slice notes + a one-line Doc impact entry
(`frontend.md`/`experience.md`) to `phase.md`.
