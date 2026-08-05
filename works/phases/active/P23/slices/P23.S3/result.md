# Result — P23.S3 (web: document version history + past-version view)

**Status: done.** Completed across **two executor runs** — the first was killed mid-work
after writing the code but before running any validation and before writing this file or
the `phase.md` notes; the second run audited every partial file against `plan.md`, found
the implementation complete and coherent (no half-applied edits, no missing artifact),
ran the full validation for the first time, and wrote the wrap-up. **No file was
reverted and nothing was rewritten from scratch**; the second run's only code decision
was that no repair was needed. See *Two-run note* at the bottom for exactly what was
audited and why nothing changed.

## What landed

Frontend only — **no server change was needed** (S2's routes and `documents.version` on
the read shape were already exactly what this slice codes against).

### Types + wrappers (`web/src/lib/knowledge/`)

- `types.ts`: `KbDocumentVersion` and `KbDocumentVersionsPage`, mirroring
  `server/documents_api.py::_app_version` verbatim (`_VERSION_DROP = {id, tenant_id,
  raw_html}`; `markdown` dropped on index rows, kept on a single fetch). Also **added
  `version: number` to `KbDocumentListItem`** — the `/app` projections drop only
  `{tags_text, tenant_id, raw_html}` from `SELECT *`, so `documents.version` was already
  on the wire on both list and detail reads; the type was simply behind the server.
- `app.ts`: `getDocumentVersions(token, id, signal?)`,
  `getDocumentVersion(token, id, version, signal?)`,
  `getDocumentVersionRaw(token, id, version, signal?)` — signatures copied from
  `getDocument` / `getDocumentRaw` (`token: string | undefined`, trailing `signal?`), so
  the optional-identity shape is uniform across the whole `/app` client.

### Document read page (`(public)/documents/[id]/`)

- `page.tsx`: after the document loads, both branches fetch the version list with the
  same (optional) token and render `<VersionHistory>` below `<DocumentView>`.
  `loadVersions` **degrades instead of throwing** (a history fault must not take down a
  body that already rendered); there is no silent-outage risk because both calls hit the
  same upstream, so a real outage fails the document read first.
- `version-history.tsx` (new): a server component, pure presentation, no auth — the
  identical panel serves the member and anonymous branches. `.kb-panel` +
  `.kb-panel__head` + the headless `<DataTable>`, i.e. the projects-credentials
  vocabulary; no new visual language (F6). The first row is the **live document** (built
  from the `KbDocument` the page already has, chipped `Current`, linking nowhere, since
  the current version is deliberately not addressable as a version); archived rows link
  to the past-version view. **Renders `null` when there is no history**, so an
  unversioned corpus draws byte-identically to pre-P23.
- `document-view.tsx`: `Meta` is now **exported** — the only change to it. It stays
  auth-free and no member-only logic entered it.

### Past-version view (`(public)/documents/[id]/versions/[v]/page.tsx`, new)

Repeats the read page's structure: both params coerced + `Number.isSafeInteger`-checked
**before** any session read (a malformed segment is the branded 404 for everyone and
leaks nothing), `optionalIdentity()`, member → `AppShell` with a back-link, anonymous →
`PublicShell` with every miss `redirect("/login")`; the miss-mapping helper
(`loadOrMiss`) lives outside the render so `notFound()`/`redirect()` throws are never
swallowed. **Static `metadata`** — no `generateMetadata` (the client is `no-store`, so it
would buy a second uncached fetch). Renders a superseded banner naming the current
version, a metadata strip in the shared `Meta` vocabulary (labelled **Superseded**, not
"Created" — a version row's `created_at` is the archive time), and the body: `html` →
`ExplainerFrame` pointed at the new relay, else `MarkdownBody` in a `.kb-panel`.
Read-only — no delete, no copy-link, no rollback.

### BFF raw relay twin

- `web/src/app/api/documents/[id]/versions/[v]/raw/route.ts` (new): a deliberate
  structural **copy** of `[id]/raw/route.ts` (the security-critical seam stays readable
  in full at each call site) — params validated before the session read, optional
  identity, `getDocumentVersionRaw`, 404 → 404 / other → 502, buffer +
  `injectHeightReporter`, and the four pinned `RAW_HTML_HEADERS` re-asserted explicitly
  rather than copied from upstream.
- `web/next.config.ts`: the matching per-path headers entry for
  `/api/documents/:id/versions/:v/raw`. **This entry is not optional and nothing in
  lint/typecheck/test/build catches its absence** — without it the global
  `X-Frame-Options: DENY` wins for that path and framing fails at runtime only.

### Copy + tests

- `content/documents.ts`: a `versions` group (panel + past-version read copy, functions
  for the interpolated strings), re-exported through the `@/content` barrel with a
  phase-tagged comment; every page imports from the barrel, no inline strings.
- `tests/document-versions.test.ts`: the wrapper seam (URL, method, bearer, `no-store`,
  and the **tokenless** anonymous call), plus the unversioned `{total: 0, versions: []}`
  answer.
- `tests/version-raw-route.test.ts`: the relay — pinned headers, upstream version URL,
  tokenless relay, upstream 404 → 404, and a bad id/version short-circuiting **before**
  any session read or upstream call.

## Validation (run in the second executor run; the first ran none)

| Command | Where | Outcome |
| --- | --- | --- |
| `pnpm lint` | `web/` | **pass** (clean) |
| `pnpm typecheck` | `web/` | **pass** (clean) |
| `pnpm test` | `web/` | **pass** — 12 files, **76 tests**, 0 failed |
| `pnpm build` | `web/` | **pass** — both new routes registered as dynamic (`ƒ /documents/[id]/versions/[v]`, `ƒ /api/documents/[id]/versions/[v]/raw`) |
| `python3 scripts/workflow.py validate` | repo root | **pass** |

Additional manual audit the toolchain cannot cover:

- Every class/token used exists (`kb-chip`, `kb-panel__head`, `kb-app-h2`,
  `kb-app-eyebrow`, `kb-app-sub`, `kb-status-idle-soft/-ink`, `kb-radius-sm`,
  `kb-space-md`, `kb-dtable`) — `src/app/kb-console.css` / `kb-tokens.css`.
- **`DataTable` carries no `"use client"`** (only `ui/reveal.tsx` does), so the server
  component may pass `cell` **functions** as props — the one runtime-only failure mode
  this composition could have had.
- The TS shapes were re-checked against the live Python projector (`_VERSION_DROP`,
  `_DROP`) rather than against the phase notes alone.
- `pnpm format:check` is **red repo-wide and pre-existing** (51 files, including
  untouched ones like `src/lib/session.ts`, `tests/session.test.ts`,
  `explainer-frame.tsx`). It is not in the plan's validation and **no CI workflow runs
  any `web/` gate at all** (`plugin-ci`, `pages`, `workspace-ci`, `deploy-production`).
  None of this slice's new files appear in its warning list — the slice adds no new
  formatting drift.

## Deviations from `plan.md`

1. **Panel gating is `versions.length > 0`, not `total > 0`.** Equivalent: the envelope
   is unpaginated, so `total === versions.length` always, and the panel needs the array
   anyway. No behavioral difference.
2. **`document-view.tsx` was touched** — `Meta` exported so the past-version strip uses
   the same vocabulary instead of re-inventing one. The plan left the panel placement
   "your call" and required the view stay auth-free; it does (this is presentation only,
   with no document coupling).
3. **`KbDocumentListItem.version` added** — not spelled out in the plan's types bullet,
   but required to render "current vN" from the document itself, and it only catches the
   type up to what S1 already put on the wire.
4. **`getDocumentVersionRaw` has no direct wrapper test**; it is exercised end-to-end
   through the relay suite (which asserts its exact upstream URL and tokenless mode).
   Kept that way under the repo's terse-tests rule.
5. **`formatDate` is duplicated** in `version-history.tsx` and the version page rather
   than extracted. That matches the repo's existing convention — `(app)/dashboard/page.tsx`
   and `(app)/projects/[projectId]/page.tsx` each define the same four-line helper
   locally.

## Notes for the review

- **Every document page view now makes two upstream calls** (document + version list)
  instead of one. Unavoidable by design — a document cannot know it has history without
  asking — and both are unmetered `/app` reads, but it is the one systemic cost this
  slice adds and is worth a conscious ack.
- Nothing here consumes `raw_html` from JSON: an archived HTML body's bytes reach the
  browser only through the relay, exactly as on the current-document path.
- No design work, no new components beyond `version-history.tsx`, no server change.

## Two-run note (what the interrupted run had left)

The killed run had already written **all** of the code above. The audit found it
**complete and correct** against the plan — every planned artifact present, no
half-written file, no dangling import, no partial edit — and it passed all five checks on
the first attempt. What was missing was strictly the wrap-up the kill interrupted:
**no validation had ever been run**, `result.md` did not exist, and **nothing had been
appended to `phase.md`** (its Doc impact list still ended at the S2 entry, so there was
nothing to de-duplicate). The second run therefore changed no source file; it validated,
audited the runtime-only risks listed above, and wrote this file plus the phase notes.
