# P28.S3 — result

- **status:** done
- **summary:** Round 03 §5 applied: a shared `<Editorial>` block (page + in-panel variants) now backs both error boundaries and all six not-found pages, four `(app)` `loading.tsx` skeletons landed, and the `.kb-toast-region` mounts as a root-level sibling of `.kb-app`. §8 item 9 verified in the operator runtime **and** the production build with Aside `--account u1`; no CSS was written and no signed record was edited.
- **validation:**
  - `pnpm --dir web typecheck` — PASS
  - `pnpm --dir web lint` — PASS
  - `pnpm --dir web test` — PASS (88/88, 16 files)
  - `pnpm --dir web build` — PASS (Next 16.2.10, standalone)
  - Round 03 **§8 item 9** — PASS, in the dev runtime and the production standalone build (see *Browser verification*)
  - §5.1–§5.5 behaviours — PASS with two recorded gaps (§5.4 phone cards, §5.2 Retry deferred to S4)
- **deviations:** five, all recorded below — the root `app/error.tsx` the record does not specify; the shell each `(public)` failure page now brings; the runtime shell pick extended to the pretty-URL 404; §5.4's phone card skeleton reported instead of implemented; one originated a11y string.
- **doc_impact:** `frontend.md` + `experience.md` — one line appended to `phase.md`.
- **doc_versions:** none — deferred to a docs phase.

---

## What landed

**New**

| File | What |
|---|---|
| `web/src/content/states.ts` | `STATES` — the cross-surface 500 block, the `Not found · 404` eyebrow, the loading label. Barrelled through `content/index.ts` with a comment naming this slice. |
| `web/src/components/states/editorial.tsx` | `<Editorial>` — §5.1's page variant and §5.2's in-panel variant, one component. |
| `web/src/components/states/error-ref.tsx` | `<ErrorRef>` — the mono `ref {digest} · {timestamp}` line, timestamp written after hydration. |
| `web/src/components/states/toast-region.tsx` | `<ToastRegion>` — §5.5's empty region. |
| `web/src/components/states/skeleton.tsx` | `LoadingRegion` / `SkelBlock` / `SkelPageHead` / `SkelTiles` / `SkelPanel` / `SkelTable`. |
| `web/src/components/states/optional-shell.tsx` | The member-vs-anonymous shell pick for the two document not-founds. **Deliberately not in the barrel** — see *Two import traps*. |
| `web/src/components/states/index.ts` | Barrel (client-safe). |
| `web/src/app/error.tsx` | The root boundary. A deviation — see below. |
| `web/src/app/(app)/error.tsx` | §5.1's console 500, inside the shell. |
| `web/src/app/(app)/{dashboard,documents,graph,projects/[projectId]}/loading.tsx` | §5.4, four files. |

**Changed** — the six `not-found.tsx` (`.kb-empty` → `.kb-editorial`), `components/app-shell/app-shell.tsx` (returns a fragment so the toast region is a sibling), `content/index.ts`.

**Not touched:** `kb-console-responsive.css`, `kb-console.css`, `kb-tokens.css`, `globals.css` — `git diff` on all four is empty. No stylesheet was created. Nothing under `web/design/rounds/` was edited.

## Copy provenance (the D28 ruling, applied)

Marked exactly as `phase.md` `## Decisions` requires:

| String | Provenance |
|---|---|
| `Something on our side stopped reading.` | **VERBATIM specimen copy** (quoted in P27's notebook) — not originated |
| `The page did not finish loading. Try again — and if it keeps failing, the reference below tells us where it stopped.` | **ORIGINATED here** — routed to the operator at the review |
| `Error · 500` | parallel of §5.1's own literal `Not found · 404` |
| `Not found · 404`, `Try again`, `Back to dashboard` | §5.1, literal |
| every 404 title / sub / CTA label | **unchanged** — the existing `notFound {title, sub, backLabel}` on `DOCUMENTS` / `PROJECT` / `GRAPH`. No key renamed, no `*_ERRORS` dictionary touched. |
| `Loading…` | **ORIGINATED** — an accessibility-floor string (§7), not visual copy: `aria-busy` alone gives the region no accessible name |

## Deviations

**1. A root `app/error.tsx` the record does not specify.** §5 designs one 500 page and `(app)/error.tsx` cannot catch the likeliest real one: `(app)/layout.tsx` awaits `requireIdentity()` (an `/auth/me` round trip) and a boundary never catches its own layout. Proved live — with the API down, `/dashboard` reaches the root boundary and never `(app)/error.tsx`. Every `(public)` page is in the same position (that group has no layout at all, so no boundary of its own). The new file renders the **same designed block without the console shell**: when identity itself failed there is no org and no email to build a topbar from, so "the shell stays" cannot apply, and rendering the designed block bare invents no visual. `.kb-app` + `.kb-app-main` are kept only as the frame — paper, gutters, `data-kb-scheme` dark adoption, and the `kbmain` container the editorial's own phone rule queries. `global-error.tsx` was **not** used (it replaces `<html>`/`<body>`, loses the fonts and the token sheet, and only catches root-layout throws). On `## Operator Questions`.

**2. All four `(public)` failure pages had NO shell at all — bigger than the stale comment `plan.md` expected.** The plan predicted stale header comments in four files; in fact only `(public)/documents/[id]/not-found.tsx` carried the wrong claim. The real finding is structural: `(public)` has no `layout.tsx`, so **all four** rendered a bare `.kb-empty` div straight onto `<body>` — no topbar, no chrome — which is not "the shell stays" under any reading. All four now bring one, and the stale comment is corrected.

**3. The runtime shell pick was extended to the pretty-URL 404, and refused for the two graph 404s.** `plan.md` directed it for `(public)/documents/[id]` only. The principle that satisfies §5.1's two sentences at once is **each failure page mirrors its own page's shell choice**: `documents/[id]/page.tsx` and `[org]/[project]/[slug]/page.tsx` both branch `optionalIdentity()` → `AppShell` | `PublicShell`, so their not-founds do too (member keeps the rail; stranger gets the anonymous shell and §5.1's literal **Sign in** primary). The two graph pages render `PublicShell` unconditionally, signed in or not — so their not-founds do too, rather than handing a member a rail the page itself would not have given them.

**4. §5.4's "card-shaped 7rem blocks" on a phone — reported, not implemented.** §3 ships no phone rule for `.kb-skel-stack` / `.kb-skel-row` and no 7rem block class. It also cannot be reached from the markup: **every `.kb-*` sheet is unlayered** (`globals.css` plain-imports them) while Tailwind's utilities live in `@layer utilities`, and unlayered wins. Measured live at a true 390 viewport — `@max-[40rem]:h-[7rem]` generated correctly into `@container not (min-width: 40rem)` and still lost to `.kb-skel-row { height: 2.9rem }`; the attempt was removed rather than escalated to `!important` on five properties. The desktop row form therefore stands at every width. On `## Operator Questions`. **This cascade fact is a `## Decisions` entry now — it binds every remaining apply slice.**

*The two record readings that needed no deviation:* §5.4's "four tiles on desktop, two on a phone" is satisfied by rendering four `.kb-skel-tile` in the real `.kb-tile-grid`, which is already 4-up / 2-up (measured: `172.6px 172.6px`, two per row, at 390). §5.2's `<h2>` at 1.15rem is an inline `style` on the element, because the record states the size literally and §3 ships no rule — markup, not a new stylesheet.

**5. One originated a11y string**, `STATES.loading.label` — see the copy table.

## Things the record did not decide, and that this slice therefore did not do

- **Nothing emits a toast.** §5.5 specifies the region and the toast markup and **nothing else** — no producer, no trigger, no dismiss affordance, no timing. The region ships empty and always mounted (an `aria-live` region must exist before the message arrives). The existing inline form errors were **not** migrated into it.
- **§5.2's in-panel variant is built and wired nowhere.** Its one specified instance is round 04's project-documents panel (`P28.S4`), and Retry's mechanism on a server-rendered panel is undefined by the record. Note left for S4.
- **No root `app/not-found.tsx`** — it would catch every unmatched URL including marketing and auth, and the record designed no such page.
- `components/usage/trend-chart.tsx`'s `.kb-empty` is a *panel* empty (§5.3 leaves it correct) and was not converted.

## Two import traps found the hard way

Both surfaced as a **failing `pnpm build` that typecheck and lint were blind to**, so they are worth the paragraph:

1. `OptionalShell` reaches `optionalIdentity()` → `lib/session.ts` → `node:crypto`, which is server-only. Re-exporting it from `components/states/index.ts` dragged that into the client graph of every `"use client"` file importing `<Editorial>` — i.e. both error boundaries. It is now imported by path only, and the barrel says why.
2. The same barrel would have been a **cycle**: `app-shell.tsx` → barrel → `optional-shell.tsx` → `AppShell`. Keeping `OptionalShell` out of the barrel fixes both at once.

## Findings — pre-existing, not introduced here

**The API answers 422 where two console pages expect 404, so a bad id now shows the 500 editorial instead of the 404 one.** `server/documents_api.py` types the list filter as `project: UUID | None` and the project route likewise, so FastAPI rejects a non-UUID value with **422**. `loadDocuments` (`documents/page.tsx`) and `loadProject` (`projects/[projectId]/page.tsx`) map only **404/400** to `notFound()`, so `/documents?project=not-a-uuid` and `/projects/not-a-uuid` throw. Both files' own header comments claim the opposite ("a missing / cross-tenant / **non-UUID** id all map here"). Observed in dev and in the production build. **Not introduced by this slice** — before it, the same URLs produced Next's default error page, which is why nobody had noticed; §5.1's boundary is what made it visible. A valid-but-unknown UUID does 404 correctly on both, which is how the two 404 pages were reached for verification. Left alone: `documents/page.tsx` is `P28.S5`'s file and the fix is behaviour, not round 03. Noted for S5 and flagged to `P28.REVIEW` as a deferred-job candidate.

**§8 item 9's arithmetic slip, confirmed on the landed tree:** six `not-found.tsx`, not seven. `documents/[id]` is double-counted in §5.1's own sentence. No page was created that the record did not design.

## Browser verification

**Instrument: Aside, `repl` surface over Bash, `aside repl --account u1` throughout** (never `u0`). **Runtime:** the manifest's dev runtime — `pnpm --dir web dev` → `http://127.0.0.1:3030`, API `uv run uvicorn server.main:app --port 8766` against S2's `kb-p28s2-pg` — **and additionally the production build**, run as `node .next/standalone/server.js` on the same port (`next start` refuses `output: standalone`). Narrow viewports came from S2's recipe: the same-origin iframe harness behind a throwaway `127.0.0.1:3031` proxy, recreated from `phase.md`'s recipe and torn down afterwards.

| Check | Result |
|---|---|
| §8 item 9 — all six not-found pages render `.kb-editorial` inside the shell | **PASS** in dev **and** in the production build. Each: `Not found · 404` eyebrow, `<h1>` title, sub, one primary; exactly one `<main>`; **zero `.kb-empty`**; topbar present |
| `(app)/error.tsx` — a page throw, shell intact | **PASS** (dev + prod). Topbar, navbar and rail all still render; `ref <digest> · <UTC stamp>` present |
| `app/error.tsx` — a **layout** throw `(app)/error.tsx` cannot catch | **PASS** (dev + prod). API stopped → `/dashboard` renders the designed block with **no** topbar/navbar/rail, paper background, Fraunces title, digest ref line |
| `loading.tsx` actually appears | **PASS**, all four routes. Throttled by putting a deliberate 2.5 s pass-through in front of the API and soft-navigating; `[aria-busy="true"]` on the region only (**0** blocks carry it), sr-only "Loading…", tiles 4-up at 1440 (`268.8px × 4`), rows 46.39px = 2.9rem, graph plate 636px, shimmer `kb-skel-pulse` running |
| Editorial at phone width | **PASS** at a true 390×844 CSS viewport: actions `flex-direction: column`, both buttons **318 × 44px** (the `--kb-tap` floor), title Fraunces 24.7px, detail JetBrains Mono 11.5px, block fits the main with no overflow |
| `.kb-toast-region` placement (§5.5) | **PASS**: `position: fixed`, `parentElement` = `BODY`, `previousElementSibling` = `.kb-app`. At 390: `left`/`right` = 16.8px (the phone gutter), `bottom` = 68.8px — **above** the navbar, `align-items: stretch` |
| Skeleton phone card form | **FAIL — the record gap in deviation 4.** Measured: gap 1px, border 1px, row 46.39px at 390 |
| Motion | **PASS**. Enumerated computed `animation-name` across the rendered error page: **zero** animating elements. The only animation in these states is `.kb-skel`'s shimmer, which `kb-console.css:172` already switches off under `prefers-reduced-motion: reduce` (S2 established this; no new guard needed) |

**One addition to the phase's viewport recipe**, found here and written into `phase.md`: the iframe harness **cannot render a Next `notFound()` or `error.tsx` page at all**. Next delivers those by switching to client rendering (`NEXT_HTTP_ERROR_FALLBACK;404`), and React does not hydrate inside the harness — the iframe shows the shell with an empty `<main>`. Phone-width measurement of a failure state therefore means capturing the real markup at top level and re-measuring it inside the harness under the real sheet, which is what was done.

**Not verified in a browser:** the anonymous branch of `(public)/documents/[id]/not-found.tsx`. No signed-out profile was available (`u1` holds the session; `u0` is the operator's and is never driven, and switching to `u2` is the operator's call). It was verified instead by a **cookieless HTTP request to the same running dev server**: status 404, `.kb-app` carrying only `data-md-color-scheme` (= `PublicShell`, no rail), and two "Sign in → /login", the editorial's being `kb-appbtn kb-appbtn--primary`. The `PublicShell` + `.kb-editorial` combination itself **is** browser-verified, by the two public graph 404s.

## Runtime left for P28.S4

Unchanged from S2's note and still running: `kb-p28s2-pg`, the gitignored `web/.env.local` (restored byte-for-byte after the throttling experiment), uvicorn on 8766 and `pnpm --dir web dev` on 3030. The two throwaway proxies (the 2.5 s API delay, the 3031 viewport harness) are stopped and live only in the session scratchpad.

## Phase notebook

`phase.md` was edited, not appended to: four `## Decisions` added, the `(from P28.DECOMP + P28.S2, for P28.S3)` note consumed and removed, four `## Operator Questions` appended, notes added for S4 / S5 / every browser-verifying slice / `P28.REVIEW`, one `## Doc impact` line, and `## Now` rewritten. Nothing here restates it.
