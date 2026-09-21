# P28.S3 — plan (orchestrator native plan, auto mode, 2026-09-21)

**Round 03 apply: the system states.** Executor: `slice-executor-high`.

Scope is round 03's contract **§5 only** (`web/design/rounds/03-foundation/output/build-prompt.md`, lines ~524–580) — editorial page failure, in-frame section failure, empty, `loading.tsx`, the toast region. **RESPECT THE DESIGN.** Everything else in that contract landed in `P28.S2`.

Read `works/phases/active/P28/phase.md` whole first. It already carries, from S2: **the Aside viewport recipe** (use it; do not re-derive it), **the local runtime left running for you** (a `postgres:17` container plus `web/.env.local`, with the recreate recipe), and the **500 copy ruling** in `## Decisions`. This plan does not restate them.

## Write no CSS

`.kb-editorial*`, `.kb-skel-line/-tile/-row/-stack` and `.kb-toast-region` all landed in `web/src/app/kb-console-responsive.css` in S2, byte-identical to §3. **That file is a verbatim record — do not touch it, and do not add a stylesheet of your own.** If you believe a rule is missing, that is a record gap: report it, do not write it. (The one authorised correction sheet in `## Decisions` belongs to `P28.S5`, not to you.)

## Findings from a read-only survey — spot-check before relying on any of them

### The route-group mechanics that decide this slice

- **A Next `error.tsx` sits inside its own segment's layout and does not catch that layout's throws.** So `app/(app)/error.tsx` renders inside `AppShell` and the shell stays, exactly as §5.1 wants. It must be `"use client"`, default-export, props `{ error: Error & { digest?: string }; reset: () => void }`.
- **`AppShell` already renders the `<main class="kb-app-main">`.** Copying §5.1's snippet literally into an `(app)` file would nest a second `<main>` landmark. Inside `(app)`, render **only** the `.kb-editorial` div.
- **`(public)` has no `layout.tsx` at all** — its pages wrap themselves in `AppShell` or `PublicShell` in the page body. So a `(public)/**/not-found.tsx` renders **bare on `<body>`** and must bring its own shell. The header comments in all four public not-found files claim they render inside the `(app)` shell; **those comments are stale and wrong — correct them while you are in there.**

### The gap that matters most

**The likeliest real 500 in this app escapes the boundary §5 specifies.** `(app)/layout.tsx` awaits `requireIdentity()` (an `/auth/me` round trip). A throw there is a *layout* throw, so `(app)/error.tsx` never sees it, and with no `app/error.tsx` and no `global-error.tsx` the user gets Next's default full-page error — the precise outcome §5.1 exists to prevent.

§5 does not cover this. **Add `app/error.tsx` rendering the same designed `.kb-editorial` block without the console shell**, and record it as a deviation plus a `## Operator Questions` entry. The reasoning to record: when identity itself failed there is no org and no email to build a topbar from, so "the shell stays" cannot apply; rendering the **designed** block shell-less is the minimal choice that invents no new visual decision. Do **not** reach for `global-error.tsx` (it replaces `<html>`/`<body>` and is a much bigger hammer).

### The not-found pages

Six exist, all reachable from `web/src/app/`: `(app)/documents/`, `(app)/projects/[projectId]/`, `(public)/documents/[id]/`, `(public)/graph/[org]/`, `(public)/[org]/graph/`, `(public)/[org]/[project]/[slug]/`. Each renders `.kb-empty` today with a lucide icon and an inline `padding{Top,Bottom}: 3.6rem`.

- §5.3 reclassifies these: a 404 is a **page** failure, so they become `.kb-editorial`, and `.kb-empty` stays for "a part of this page is waiting". Editorial is explicitly "no illustration" — the icons go.
- **§8 item 9 says "all seven not-found pages" and there are six.** `documents/[id]` is double-counted in §5.1's own sentence. **Create no page the record did not design** — in particular do **not** add a root `app/not-found.tsx`, which would catch every unmatched URL including marketing and auth. Report the arithmetic slip.
- **`(public)/documents/[id]/not-found.tsx`**: §5.1 asks for the anonymous shell with **Sign in** as primary, but a signed-in member hitting a 404 would then lose their rail, contradicting §5.1's own "the shell stays". The page itself already picks `AppShell` vs `PublicShell` at runtime from `optionalIdentity()`; `not-found.tsx` can be an async server component and do the same. **Do that** — it satisfies both sentences — and record it.

### Copy

`## Decisions` in the notebook carries the ruling in full and it is **binding**: the 404 editorials reuse each surface's existing `notFound {title, sub, backLabel}`, empty states are unchanged, the button labels come from §5.1, and only the 500 block is new — with the exact title, code line and sub given there, the title marked verbatim-from-record and the sub marked **originated**. Mark them the same way in `result.md`.

Mechanics: `web/src/content/` is one flat module per surface exporting a SCREAMING_CASE `as const` object plus its type, re-exported through the hand-maintained `src/content/index.ts` barrel (pages import from `@/content`, never a deep path, never an inline string). A new `src/content/states.ts` is the natural home for the cross-surface 500/editorial/toast/loading strings; barrel it with a comment naming this slice. Do **not** fold page-failure copy into the existing `*_ERRORS` dictionaries — those are inline form errors and several already carry a near-miss "Please try again." that would read as duplication. Do **not** rename existing `notFound` keys; six files and three exported copy types depend on them.

The `ref` line renders **only when `error.digest` exists** (it is `undefined` in dev, and a blank "ref ·" is worse than no line), and its timestamp is written **after mount** — a server-rendered clock is a hydration mismatch.

### One shared component, not three copies

S3, S4 and the review all need the editorial block, and §5.2's in-frame variant is the same block with an `<h2>` and one `sm` Retry. **Build one small presentational component** (page variant and in-panel variant) and use it everywhere here. **Wire it nowhere else**: §5.2's one specified instance is round 04's project-documents panel, which is `P28.S4`'s, and Retry's mechanism on a server-rendered panel is undefined by the record — leave both to S4 and say so in a note for it.

### `loading.tsx`

§5.4 says "per route"; in practice that is the four `(app)` console routes (dashboard, documents, graph, projects/[projectId]). A `(public)` loading file would render with no shell, and `(public)/documents/[id]` picks its shell at runtime, so a shell-accurate skeleton is structurally impossible there — skip them and record why. `(auth)` is static forms with nothing to stream.

Two record gaps to work around without inventing CSS:
- §5.4 wants "four `.kb-skel-tile` on desktop, two on a phone", but §3 ships no rule that hides tiles 3–4, and `loading.tsx` cannot know the viewport. **Read it as "the same grid the real tiles use"** — which is 2-up on phone and 4-up on desktop already — since §5.4's own stated principle is that the skeleton mirrors the layout it replaces at the breakpoint it is standing in. That needs no new CSS. Record the reading.
- There is no 7rem card-block class (`.kb-skel-tile` is 6.2rem, `.kb-skel-row` 2.9rem). Use `.kb-skel` with a height utility in the markup rather than a new rule.

`aria-busy="true"` on the region, not on each block.

### The toast region

§5.5 puts it as a **root-level sibling of `.kb-app`** carrying the scheme attributes itself — because `.kb-app` is a container and would otherwise become the containing block, pinning the toast to the document instead of the screen. S2 rewrote the shell, so **read `app-shell.tsx` as it is now** and place the region accordingly.

**Nothing in the app emits a toast today** — no producer, no trigger, no dismiss, no timing, and §5.5 specifies none. Build the empty region as designed and **say plainly in `result.md` that it has no producer yet**; do not invent a toast system, and do not migrate the existing inline form errors into it.

### Small things that will bite

- `components/usage/trend-chart.tsx` uses `.kb-empty` with Tailwind mixed in. That is a *panel* empty and §5.3 leaves it correct — **do not convert it**.
- `web/vitest.config.ts` is `environment: "node"` with no jsdom and no React rendering, so **nothing here is test-guarded**. `pnpm --dir web typecheck` plus your browser pass is the whole net.

## Tests

**Write no new test file.** There is no component-rendering harness, and these are surfaces the workspace verifies live. If you want to add one, you have found a behaviour change that belongs elsewhere — say so instead.

## Validation

1. `pnpm --dir web typecheck` · `lint` · `test` · `build`. **Never** `prettier --write` an existing web file (**D22**).
2. **Round 03 §8 item 9** — `error.tsx` and all the not-found pages render `.kb-editorial` inside the shell. That item is yours and yours alone.
3. **In the operator runtime, in a real browser**, with S2's recipe: force a real 404 on each of the six routes, and force a real throw to see `(app)/error.tsx` — then force one in the layout to prove `app/error.tsx` catches what `(app)/error.tsx` cannot. Check a `loading.tsx` actually appears (throttle if you must). Check the editorial block at phone width via the iframe harness, remembering **layout there is trustworthy and interaction is not** — drive any clicking at the top level. Name the instrument in `result.md` and never claim a run you did not make.

## Before you finish

- Append **one** `## Doc impact` line (`frontend.md` and/or `experience.md` — the state pages, the new content module, the editorial/empty distinction). Run **no** `doc-new-version`.
- Edit the notebook: consume the notes you used, add `## Decisions` for each deviation you acted on, add `## Operator Questions` for the record gaps (the layout-throw boundary, the six/seven slip, the §5.4 skeleton gaps), add a note for `P28.S4` about the shared editorial component and §5.2's unwired Retry, and rewrite `## Now` (≤ 15 lines).
- Write `result.md` verdict-block-first, marking the originated 500 sub line explicitly as originated.

You never commit and never transition slice or phase status.
