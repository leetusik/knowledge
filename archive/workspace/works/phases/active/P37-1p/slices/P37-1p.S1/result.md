# P37-1p.S1 result: the public graph links redirect

## Verdict

- status: done
- route: mid
- model: opus
- effort: medium
- summary: `/@{org}/graph` now 307s to `/@{org}` behind the unchanged `@` guard, with no fetch. `/graph/{uuid}` resolves the org through `getOrgLibrary(token, uuid, "public")` and 307s to `/@{orgSegment(library.org)}`. Both not-founds render the library's `LibraryNotFound` in `OptionalShell`. The comment-only files no longer describe a live graph page, and no S1 file imports `GraphCanvas`, `GRAPH`, `getGraph` or `KbGraph`.
- files_changed: web/src/app/(public)/[org]/graph/page.tsx, web/src/app/(public)/[org]/graph/not-found.tsx, web/src/app/(public)/graph/[org]/page.tsx, web/src/app/(public)/graph/[org]/not-found.tsx, web/src/app/robots.ts, web/src/app/(public)/[org]/(library)/layout.tsx, web/src/app/(public)/[org]/(library)/page.tsx, web/src/components/states/optional-shell.tsx, web/src/lib/auth-guards.ts, web/src/lib/next-path.ts, works/phases/active/P37-1p/phase.md (through phase-section), works/phases/active/P37-1p/slices/P37-1p.S1/result.md
- validation: `pnpm --dir web typecheck` PASS; `pnpm --dir web lint` PASS; `pnpm --dir web test` PASS (37 files, 395 tests); live curl on dev `:3030` PASS for every probe the stale API allows (see deviation 1); `pnpm exec next build` of a scratchpad clone, then `next start -p 3047` against a throwaway library stub on `:8797`, PASS for all probes; `python3 scripts/workflow.py validate` PASS
- deviations: (1) The dev API on `:8766` is stale. Its uvicorn has been up since 2026-09-21, and its `openapi.json` lists no `/app/orgs/{org}/library`. So on dev every org library shows "Library not found", and the `/graph/{uuid}` success path cannot land. I was told never to restart it. Instead I proved the success path, the slug-less case and "the library answers 200" on the production build, pointed at a throwaway Python stub of that one endpoint. I did not use a real org. Raised as OQ4. (2) The production build ran from a `cp -Rc` scratchpad clone, not from `web/`, so `web/.next` was not touched.
- doc_impact: `- product.md: a miss on an old graph link (/x/graph, a malformed or unknown /graph/{uuid}) now shows the library's "Library not found" in the optional shell, not the graph's own not-found copy (S1).`

## What changed

- `(public)/[org]/graph/page.tsx` keeps `safeDecode` and the `@` guard verbatim, then calls `redirect('/' + segment)`. The segment is re-encoded and its leading `%40` is restored to `@`. The metadata, `loadGraph`, the session read and every graph import are gone.
- `(public)/graph/[org]/page.tsx`:
  - It keeps the `ORG_UUID` check, so a malformed id is `notFound()` before any call.
  - It then calls `optionalIdentity()` and `loadLibrary`, which wraps `getOrgLibrary(token, org, "public")`. An `ApiError` 404 becomes `notFound()`, and any other error rethrows.
  - At the top level it calls `redirect('/@' + encodeURIComponent(orgSegment(library.org)))`. `KbOrgLibrary.org` carries `{id, slug}`, which is exactly the `OrgOwner` that `orgSegment` takes, so no escalation was needed.
- Both `not-found.tsx` files render `<OptionalShell>{(signedIn) => <LibraryNotFound signedIn={signedIn} />}</OptionalShell>`. This matches `/@{org}`'s own not-found: the same component and the same `signedIn` prop. The library layout's shell picks app shell or public shell the same way. That layout's sign-in href is `/login` whenever the segment is not a valid `@org`, and the graph not-founds only render in exactly that case, so `PublicShell`'s default `/login` is also the same. No new copy.
- Comments only:
  - `robots.ts`: the P19 note now says `/graph/{org}` is a redirect.
  - `(library)/layout.tsx` and `page.tsx`: dropped the live-graph references.
  - `optional-shell.tsx`: the "NOT used by the graph not-founds" paragraph now says they use it.
  - `auth-guards.ts`: "(graph)" became "(library)", and noted the graph was retired.
  - `next-path.ts`: the P28.S6 gate line is now past tense.
  - No code changed in any of these files. `robots.ts` has no `/graph` rule. `next-path.ts`'s `/graph` is a doc-comment example, not an allowlist. Both are noted for S2.

## Live verification (instrument: `curl`, no browser, as the plan says; no browser run is claimed)

**Dev `:3030`** (anonymous, no cookie; this uses the stale `:8766` API):

| probe | result |
|---|---|
| `/@leetusik/graph` | 307 `location: /@leetusik`; no graph markup |
| `/@a%20b/graph` | 307 `location: /@a%20b` |
| `/@/graph` | 404 with the library not-found |
| `/x/graph` | 404 with the library not-found |
| `/graph/not-a-uuid` | 404 with the library not-found |
| `/graph/11111111-…` (a random UUID) | 404. Correct, but only because the stale API has no library route |
| following to `/@leetusik` | 200, but its body is "Library not found" (streamed). This was already the case before S1, because of the stale API |

**Production build** (a scratchpad clone; `next build` with Turbopack OK; `next start -p 3047`; `KB_API_BASE_URL=http://127.0.0.1:8797`, a throwaway stub that answers `/app/orgs/{org}/library` for one slugged UUID (`stubslug`), one slug-less UUID, and 404s otherwise, and logs every request):

| probe | status / Location | upstream calls logged |
|---|---|---|
| `/@stubslug/graph` | 307 → `/@stubslug` | none |
| `/graph/11111111-1111-4111-8111-111111111111` (slugged) | 307 → `/@stubslug` | `/app/orgs/1111…/library?scope=public` |
| `/graph/22222222-2222-4222-8222-222222222222` (slug-less) | 307 → `/@22222222-2222-4222-8222-222222222222` | the same call for `2222…` |
| `/graph/3f2b8c1e-0000-4000-8000-000000000000` (unknown) | 404 with the library not-found | one library call (404) |
| `/graph/not-a-uuid` | 404 with the library not-found | none |
| `/x/graph` | 404 with the library not-found | none |
| `/@stubslug` (followed) | 200, the stub's document "Hello" rendered | the library call |
| `/@22222222-…` (followed, slug-less) | 200, "Hello" rendered | the library call |

- **How the 404 body arrives.** The not-found body comes in Next's RSC payload: "Library not found", the `lib-ed` editorial and the `kb-topbar` shell. It is not in the pre-hydration HTML. `/documents/abc`'s existing `OptionalShell` not-found arrives the same way, so this is the house pattern, not a regression.
- **Slug-less orgs in the local data.** Not checked, because the dev API cannot serve the library. The stub covered that case instead. No org was created.
- **Cleanup.** Both scratch servers (PIDs 21151 and 21145) are stopped, and ports 3047 and 8797 are free. `:3030` and `:8766` were never touched. A sandbox denial stopped the `rm -rf` of the scratchpad clone, so the clone (`<scratchpad>/clone`, `<scratchpad>/stub`) is left in the session scratchpad, outside the repo.

## Notebook writes (phase.md, through phase-section)

- Notes: removed the DECOMP note for S1. Added two notes: one for S2 (no comment hid code; `/graph` is still a live route), and one for S2, S3, S5 and REVIEW (the stale `:8766`).
- Operator Questions: OQ4, the stale dev API.
- Decisions: "Old graph 404s (S1)".
- Doc impact: one product.md line (the 404 copy).
- Now: rewritten.
