# P37-1p.S1 — the public graph links redirect

## Goal

The two public graph routes stop rendering a graph and become redirects to the org's library. A 404 stays a branded 404 that leaks no existence. Afterwards nothing in this slice's files imports `GraphCanvas`, `GRAPH`, `getGraph` or `KbGraph`, because S2 deletes them.

The breakdown block is `phase-section P37-1p "P37-1p.S1" --topic breakdown`. The redirect decision is `phase-section P37-1p Decisions`, its "Redirect targets" line.

## Context

The operator: old shared graph links "redirect to the org's library instead of breaking" (`intent.md`). S1 runs alone (no wave), so it may write `phase.md` through `phase-section` itself and run whole-tree checks.

## Steps

1. **`web/src/app/(public)/[org]/graph/page.tsx`** (`/@{org}/graph`):
   - Keep the `@`-prefix guard exactly as it is, so an unmatched `/x/graph` stays `notFound()` with no upstream call.
   - Then `redirect()` to `/{org}`, the same segment with its `@`, which is the org's library. No fetch and no session read are needed.
   - Drop the graph imports, the `loadGraph` helper and the graph metadata. Keep only what the guard and the redirect need.
   - Rewrite the header comment to say what the route now does, in the file's own comment style: P37-1p retired the graph, and old links land on the library.
2. **`web/src/app/(public)/graph/[org]/page.tsx`** (`/graph/{uuid}`):
   - A malformed UUID is `notFound()` before any call. Keep or adapt the file's existing UUID check.
   - Otherwise read `optionalIdentity()` for the caller's optional token, as the page does now. Call the existing `getOrgLibrary(token, org, "public")` (`web/src/lib/knowledge/app.ts:485`; check its exact signature and the scope argument's name). It hits `GET /app/orgs/{org}/library`, and `server/books_api.py`'s `_resolve_org` tries the UUID first.
   - On success, `redirect()` (307, Next's default for `redirect` in a server component) to `/@{orgSegment(<the org owner from the response>)}`. `orgSegment` is in `web/src/lib/reader-href.ts:33`. That gives the slug, or the tenant UUID for a slug-less org.
   - On `ApiError` 404, `notFound()`. Let any other error throw, as the current page does, so an outage never masquerades as a missing org.
   - If the library response does not carry what `orgSegment` needs, stop and return `escalate` with what you found. Never invent a resolver.
   - Drop the graph imports and metadata. Rewrite the header comment the same way as step 1.
3. **The two not-founds** (`(public)/[org]/graph/not-found.tsx` and `(public)/graph/[org]/not-found.tsx`) must keep rendering a branded 404, since the app has no root `not-found.tsx`.
   - Re-point both to the existing `LibraryNotFound` from `web/src/components/library/library-states`. Find how the library's own `not-found.tsx` renders it, and match that: the same shell and the same props.
   - Never write new copy. Rewrite their header comments.
4. **The comments in the set:** `web/src/app/robots.ts`, `web/src/app/(public)/[org]/(library)/layout.tsx` and `page.tsx`, `web/src/components/states/optional-shell.tsx`, `web/src/lib/auth-guards.ts` and `web/src/lib/next-path.ts`.
   - Reword only the graph-route mentions, so they no longer describe a live graph page.
   - Leave all code untouched. In particular, `robots.ts`'s rules and any `/graph` entry in `next-path.ts`'s allowlist stay. A `/graph` still exists as a redirect (S2's), and S2 owns that behaviour.
   - If a "comment" turns out to be code (a path list, a regex), leave it and note it for S2 under `## Notes for later slices`.
5. **Stay inside the set.** The files are those listed in the breakdown's S1 block. Any other file you would need is a `needs_operator`, naming the file. Never touch `next.config.ts` (S2's), `web/src/app/(app)/graph/*` (S2's), `content/graph.ts` or `lib/knowledge/*` (S2's), or the signed design records (`web/design/*`, `docs/reference/design/*`).

## Verification

1. **Static checks:** `pnpm --dir web typecheck`, `pnpm --dir web lint` and `pnpm --dir web test` all pass.
2. **Live on dev**, where `:3030` (web) and `:8766` (API) are already running. Never restart either.
   - **Anonymous requests:** use `curl -sI` with no cookie.
     - `/@<a real public org slug>/graph` gives 307 with `Location: /@<slug>`.
     - `/graph/<that org's tenant UUID>` gives 307 with `Location: /@<slug>`.
     - `/graph/<a random valid UUID>` gives 404, and its body is the library not-found.
     - `/graph/not-a-uuid` gives 404.
     - `/x/graph` (no `@`) gives 404 with no upstream call.
   - **Then follow the redirect:** the library itself answers 200.
   - **Finding a public org and its UUID:** read the local accounts DB, or call the API (`/app/orgs/...`). Record which org you used.
   - **A slug-less org**, if one exists locally: `/graph/<its uuid>` lands on `/@<uuid>`, and that answers 200. If none exists, say so; never create one.
3. **Production build:** build a scratch copy on its own port, as earlier slices did. Use `pnpm exec next build` (if Turbopack fails, `--webpack`), then `next start -p <a free port>` from `web/`, with the same API. Repeat step 2's probes there. Stop the scratch server afterwards.
4. **No browser is needed:** these are HTTP-level redirects and 404 bodies, so `curl` is the instrument. Say so in `result.md`. Never claim a browser run.
5. **Workflow state:** `python3 scripts/workflow.py validate` passes.

## Notebook (you write it, since this slice runs alone)

- **`## Now`:** what landed. Next are S5, held for OQ2 and OQ3, and S2.
- **`## Notes for later slices`:** remove the DECOMP note "for P37-1p.S1" once consumed. Add any note S2 needs, for example a `/graph` path in `next-path.ts`.
- **`## Doc impact`:** add a line only if this slice changes durable truth beyond the DECOMP's lines already there.

## Dispatch

route=mid
reason=kind implementation rated low
subagent_type=slice-executor
model=opus
pass_model=yes
effort=medium
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
