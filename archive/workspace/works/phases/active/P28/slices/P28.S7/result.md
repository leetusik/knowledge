# P28.S7 — result

- **status:** done
- **summary:** Round 06's screen half applied — `kb-docview.css` landed verbatim between `graph-r5.css` and `kb-record-fixes.css`, `prose.css` + `explainer.css` deleted with the 46rem cap retired, and the reading column is now the two-track grid (prose 672px / fence + table on the full track, identical member and public). The chrome-less `?view=full` view ships on all three routes and both body kinds behind the unchanged sandboxed relay, with an always-visible exit pill mounted as a sibling of `.kb-app`; the explainer frame gained its waiting line, its measured 4s `[data-unmeasured]` state and both relay-failure branches; the version panel gained priorities and an honest `ok: false` failure it could not report before. Checks 1–13 and 21–22 pass in the dev runtime and the production build; check 23 is a record gap reported, not invented.
- **files_changed:**
  - `web/src/app/kb-docview.css` (new, byte-identical to §3.1)
  - `web/src/app/globals.css`
  - `web/src/app/(public)/documents/[id]/prose.css` (deleted)
  - `web/src/app/(public)/documents/[id]/explainer.css` (deleted)
  - `web/src/app/(public)/documents/[id]/document-view.tsx`
  - `web/src/app/(public)/documents/[id]/markdown-body.tsx`
  - `web/src/app/(public)/documents/[id]/explainer-frame.tsx`
  - `web/src/app/(public)/documents/[id]/version-history.tsx`
  - `web/src/app/(public)/documents/[id]/page.tsx`
  - `web/src/app/(public)/documents/[id]/versions/[v]/page.tsx`
  - `web/src/app/(public)/[org]/[project]/[slug]/page.tsx`
  - `web/src/app/(public)/documents/[id]/full-width-exit.tsx` (new)
  - `web/src/lib/full-width.ts` (new)
  - `web/src/components/app-shell/app-shell.tsx`
  - `web/src/components/public-shell.tsx`
  - `web/src/components/states/editorial.tsx`
  - `web/src/content/documents.ts`
  - `works/phases/active/P28/phase.md`, `works/phases/active/P28/slices/P28.S7/result.md`
- **validation:**
  - `pnpm --dir web typecheck` — pass
  - `pnpm --dir web lint` — pass
  - `pnpm --dir web test` — pass (17 files, 113 tests; no new test file, per the plan)
  - `pnpm --dir web build` — pass (21 routes, no new warning)
  - `python3 scripts/workflow.py validate` — pass (pre-existing warnings only)
  - Round 06 §8 checks **1–13, 21–23** — see the table below (2, 3 and 4 pass on intent with the record's own numbers off; 23 is a record gap)
  - Real browser (Aside `repl --account u1`) in the manifest runtime — dev `http://127.0.0.1:3030` **and** the production build (`pnpm --dir web build` + `next start` on the same port), plus a true-viewport harness at 390 / 820 / 1024 / 1180
- **deviations:** nine, all listed under *Deviations* below — none of them a visual decision.
- **doc_impact:** one line appended to `phase.md` (frontend.md + experience.md + product.md).

---

## 1. Acceptance checks (round 06 §8, items 1–13 and 21–23)

Instrument: **Aside**, `aside repl --account u1 "<js>"` over Bash, in the manifest runtime
(`docs/current/operations.md` → `## Operator Runtime`). Narrow viewports came from P28.S2's
throwaway reverse-proxy harness, recreated at `/tmp/p28s7/vpproxy.py` with one addition (an
`/__anon` prefix that strips the cookie, so the *anonymous* rendering of a public URL can be
measured while the profile is signed in). Interaction was driven at the top level, where React
really hydrates — the harness's standing limitation.

| # | Check | Verdict | How |
|---|---|---|---|
| 1 | paragraph = 672px (42rem) at 1180 member and 1180 public | **pass** | harness 1180: member `/documents/64` **672**, anonymous `/@p28s5/research/round-06-measure-probe` **672**. The two differ only in the margin beside it (article 886 vs 1024). |
| 2 | `pre` / `.kb-prose__wide` measure the article's width — 885 member, 1125 public | **pass on intent, the two numbers cannot hold** | Measured 1180 member **839**, 1180 anonymous **977**; 1440 member **977**; 390 **354**. Both land on the FULL track — the article minus `.kb-doc__body`'s own `1.4rem` padding and 1px borders, which §3.1 itself declares (886 − 2 − 44.8 = 839.2). And 1125 exceeds `.kb-doc`'s own `max-width: var(--kb-app-read-w)` = 1024, so no anonymous page can reach it. The fence and the table are 167px/305px wider than the text track at every size, which is the decision. Nothing was "fixed" to make the numbers literal. |
| 3 | at 390 a `pre` reaches both gutters and scrolls; the page does not | **pass on intent** | Fence **354px at x=18** inside a **356px** body at x=17 — it bleeds through the panel's padding to its inner edges (`margin-inline: calc(gutter * -1)`), scrolls horizontally (`scrollWidth > clientWidth`), and `documentElement.scrollWidth === innerWidth` (no page scroll). The record's "390px minus the frame border" would need the article to reach the window edge; rounds 03/04 keep a 17px page gutter, which this round does not touch. |
| 4 | `grep -r "46rem" web/src` returns nothing; `kb-measure` returns the token + `kb-docview.css` | **pass on intent** | `46rem` → **3 hits, all comment prose inside the verbatim §3.1 sheet** (lines 18, 23, 121 — the record explaining why 46rem is retired). **No declaration anywhere**: the old `.kb-prose { max-width: 46rem }` is gone with `prose.css`, and the served CSS chunk contains no `46rem` at all (`grep -c` → 0). `kb-measure` → the `kb-tokens.css` declaration + `kb-docview.css`, nothing else. Editing the comments out would mean editing a verbatim record. |
| 5 | strip is two equal columns at 390, Tags spans, no field missing on an em-dash | **pass** | 390: `grid-template-columns: 170.203px 170.203px`, tags `grid-column: 1 / -1`, four labels present. The em-dash path keeps the field and greys only the value (`--empty`), verified in the rendered markup. |
| 6 | reporter disabled → 26/32/40rem by tier for 4s, then 70rem + `[data-unmeasured]` + note, frame scrolling internally | **pass** | With the injection temporarily neutered (probe reverted, byte-diffed): **416px = 26rem** at 390, **512px = 32rem** at 820 and at 1180 (`kbmain` < 64rem), **640px = 40rem** at 1440. After the wait: **1120px = 70rem**, `[data-unmeasured]="true"`, wait line gone, note visible. Internal scroll: the 8,698px document sits in a 1,120px frame and the page stays **1,567px**, so the content scrolls inside the frame. |
| 7 | measured → flag set, inline height matches, wait gone, one scrollbar | **pass** | `[data-measured]`, `style="height:916px"` == measured frame height 916, wait `display:none`, page scrolls, frame does not. Also in production (8,698px on doc 66). |
| 8 | no `100dvh`/`100vh` in `kb-docview.css` | **pass** | One match, in a comment (line 213, the record recalling the sum it replaced). No rule. |
| 9 | an in-page ToC jump lands ≥ 0.75rem clear of the sticky topbar | **pass** | Clicked real ToC links inside the opaque frame with `page.mouse` (five successive links → scrollY 1136 · 1448 · 1761 · 2074 · 2387). The landing arithmetic: `scrollTo(frameTop + msg.top − (barH + 12))` puts the section top at **68px = topbar 56 + 12px (0.75rem)** below the viewport top, i.e. exactly at the floor, and the heading inside the section sits lower still. |
| 10 | `?view=full` hides topbar/navbar/rail/actions/header/strip/versions, keeps the superseded stamp | **pass** | Markdown body, HTML explainer and past version, member and anonymous: all seven hidden (`display:none`), `.kb-docnotice` **visible** on `/documents/67/versions/1?view=full`. `.kb-doc` max-width `none`, `.kb-app-main` padding `0`, body panel transparent/borderless at `24px 24px 72px` (1.5rem `--kb-full-pad`), phone `16px 16.8px 88px`. |
| 11 | back exits + restores scroll; the pill adds no history entry; Esc exits | **pass** | scroll 2000 → enter → scroll 3000 → back → **`?`empty, scrollY 2000**, chrome restored. Pill: `history.length` 2 → **2** (`router.replace`). Esc: exits, no entry. Focus returns to the Full width control on both control exits (§6) and is left alone on browser back. Verified again in the production build. |
| 12 | sandbox still exactly `allow-scripts`, src still the relay, no route serves document HTML | **pass** | In the view: `sandbox="allow-scripts"`, `src="/api/documents/66/raw"`. **`next.config.ts` untouched** — the view is a query on the document's own URL, so it frames the two existing exempted relay paths. No new route, no `allow-same-origin`. |
| 13 | at 390 the pill is centred, ≥44px, clear of the safe area, visible at every scroll position | **pass** | True 390×844 viewport on a **14,846px** page (`/documents/68?view=full`): identical rect at top, middle (scrollY 7423) and bottom (scrollY 14002) — `160×44` at left 115 (centred to <1.5px), **14px** above the bottom (`0.9rem + env(safe-area-inset-bottom)`, which is 0 in desktop Chrome — a real iPhone adds its inset; gate walk). And on the hydrated **8,698px explainer** at 1440: `148×44`, 18px from right and bottom, unchanged at top/middle/bottom. `pill.parentElement.classList.contains('kb-app') === false` — it is the sibling the record demands. |
| 21 | no history → no panel; a throwing fetch → the panel with the Unavailable editorial and no button | **pass** | `/documents/64` (no history) → no `.kb-docversions`. With `loadVersions` forced to throw (probe reverted, byte-diffed): panel head "Version history" + `.kb-editorial` code **"Unavailable"**, the §7 sub line, **zero buttons**, no table, no nested panel, `.kb-panel > .kb-editorial` padding `32px 16px`. |
| 22 | relay 404 and 502 render inside the box at the reserved height; the page length does not change | **pass** | Relay forced to 404 then 502 (probe reverted, byte-diffed): box **642px** (40rem + borders) and document height **1046px** in both, identical to the waiting state. 404 → `Not found · 404` + the §7 sentence, **no button**. 502 → `Error · 502` + the §7 sentence + a **Reload** button. Neither sets `[data-unmeasured]`, so the reserved height is what holds the page still. |
| 23 | loading renders real strip labels with skeleton values; reduced motion does not animate | **NOT IMPLEMENTED — record gap** | Round 06 designs no document-page loading state: no `loading.tsx` in §1's file map, no skeleton rule in §3.1, no string in §7. It is also not reachable as specified: the `(public)` group **has no `layout.tsx`** (P28.S3 established this), so the shell is rendered by each page and a `loading.tsx` there would paint a bare skeleton on `<body>` with no topbar — worse than no loading state. Closing it means a structural decision this round does not make. **Nothing was invented.** The second half is already guaranteed: `.kb-skel`'s pulse is switched off under `prefers-reduced-motion: reduce` at `kb-console.css:172` (P28.S2 enumerated the console's three animations). Routed to the operator. |

Checks **14–20 and 24** are P28.S8's print half and were not attempted.

## 2. What the slice is for, and what it actually does now

**The reading column is a grid.** `.kb-prose` is `[full-start] 1fr [text-start] min(100%, --kb-measure) [text-end] 1fr [full-end]`; everything lands on `text`, and `pre`, `.kb-prose__wide`, `figure`, `hr`, `img` take `full`. Measured: prose **672px** at every width above the measure, on the member surface and the anonymous one alike — the thing the round was for. Below the measure the side tracks collapse and a phone sees one column (321px at 390).

**The chrome-less view is a query on the document's own URL.** `?view=full` → `isFullWidth(searchParams)` → `data-kb-view="full"` on `.kb-app` and `<FullWidthExit />` mounted as a **sibling** of it, beside the toast region, in both shells. Nothing unmounts; the CSS hides the chrome, so exit costs no refetch. The security boundary did not move: same page, same relay, same `sandbox="allow-scripts"`, no `next.config.ts` entry, no raw HTML on the app origin.

**The explainer frame states.** Waiting line → measured (inline height) · unmeasured (70rem + note) after `--kb-explainer-wait` · the relay's own 404/502 inside the reserved box. The existing handshake is untouched: both postMessage listeners, the 120–40000 clamp and the child-ward `kb-explainer-request` re-post are verbatim.

**The version panel stops lying.** `loadVersions` returned `[]` on catch on all three routes, which is also what a document with no history returns — so a failed fetch rendered as "never re-published" and nobody was told. It now returns `{ ok: false }` and the panel says so.

## 3. The two things the plan said to find out, not assume

### 3.1 Is 4s the right `[data-unmeasured]` wait? **Yes — keep it. Measured, not assumed.**

| What | Measured (dev runtime, manifest) |
|---|---|
| Relay `GET /api/documents/65/raw` (4.8 KB) | ttfb **9.6–15.9 ms**, total **9.7–16.0 ms** (3 runs) |
| Relay `GET /api/documents/66/raw` (25.7 KB) | ttfb **10.3–11.1 ms**, total **10.4–11.2 ms** |
| The iframe as the browser fetched it (resource timing, doc 66) | started **118 ms**, `responseEnd` **155 ms** (37 ms), parent `loadEventEnd` **189 ms** |
| Height in hand | before the parent's own `load`, i.e. **~0.2 s** after navigation |

Three structural facts matter more than the numbers. (a) The reporter schedules its post **16 ms after the child's `DOMContentLoaded`** (`lib/explainer-height.ts`), **not** on `load` — so images and fonts in a heavy explainer do **not** delay it. (b) The frame's `src` is in the SSR HTML, so the relay fetch runs **in parallel with hydration**, and the 4s clock only starts when the island mounts. (c) The wait therefore has to cover hydration → child DCL → one postMessage, which measured **~200 ms** here and would need a **20× degradation** to threaten 4s. Raising it would only make a genuinely silent document wait longer before we admit it. **`--kb-explainer-wait: 4s` stands unchanged**, and the island reads it *from the token* (`getComputedStyle(box).getPropertyValue('--kb-explainer-wait')`, with a 4000 ms fallback) rather than hard-coding a second copy of the number.

### 3.2 Are the exit pill's rules container queries? **No — and so no portal root was built.**

§3.1's pill rules are `@media (pointer: coarse)` and `@media (width < 40rem)`, plain viewport queries, and the record says so explicitly ("for the same reason the pill's phone rule is a viewport `@media (width < 40rem)` query, not an `@container kbapp` one"). P28.S5's portal-root resolution therefore does **not** apply, and a wrapper carrying `container-name: kbapp` was **not** built. The pill is a plain sibling of `.kb-app`, and the phone rule was verified to match at a true 390 viewport (centred, `transform: translateX(-50%)`, `bottom: calc(0.9rem + env(...))`). The note is consumed in `phase.md`.

## 4. Deviations from `plan.md` / the record — nine, none of them a visual decision

1. **Five of §7's second-table strings landed here, not in S8.** The plan's split line says "the nine print-only and failure strings are S8's", but its own per-file instructions require `versions.panel.failedSub` for the `ok: false` panel and `explainerError.*` for the relay branches — both mine. §7's second table is headed "Print-only **and state** strings"; I took the five state strings and left S8 the **four** genuinely print-only ones (`print.printedOn`, `print.colophon`, `print.archivedColophon`, `print.explainerCaveat`). All ten first-table strings are here too, including the six `export*` ones S8's control will consume — one slice per copy table.
2. **`components/states/editorial.tsx` gained `variant="inline"` and an optional `title`.** §5 says the failures render "`.kb-editorial` **inside** `.kb-explainer`" and the panel failure is "the panel head plus `.kb-editorial`" — a bare block, not §5.2's `.kb-panel`-wrapped one (which would draw a second hairline one pixel inside the card that already failed) — and §7 gives both failures a code and a sub line and **no title**. Rather than transcribe the markup twice and let it drift from the component P28.S3 built for exactly this reuse, the component took one new variant and one optional prop. Both are additive; `page` and `panel` are byte-unchanged.
3. **New `web/src/lib/full-width.ts`**, not in §1's file map. Three server pages read the flag and one client island clears it; a `"use client"` module's exports become client references a server component cannot call, so the shared definition (`VIEW_PARAM`, `FULL_VIEW`, `FULL_WIDTH_LINK_ATTR`, `isFullWidth`, `fullWidthHref`) has to live in a plain module. Plumbing, no visual surface.
4. **The relay failure is classified by a bodyless `HEAD`, at most once per mount.** §5 asks for "a `load` handler that treats a non-HTML relay answer as a failure", but a sandboxed opaque-origin frame **cannot be read from the parent** — the failure arrives as a JSON body the frame renders like any page, and `onError` does not fire for an HTTP error. The only honest signal is to ask the relay. It is asked **only when the frame has already failed to report**: 200 ms after the iframe's `load` (see 5), on `error`, or when the wait window closes — and the answer is cached in a ref, so no explainer is ever fetched twice. Verified in production: a healthy explainer makes **exactly one** `/raw` request.
5. **`RELAY_PROBE_GRACE_MS = 200` is an originated number**, and it is the only one in this slice. It exists so a 404 is named in ~0.3 s instead of after the full four seconds, without paying a second upstream read on every healthy view: the reporter posts 16 ms after the child's DCL, which precedes the child's `load`, so in the healthy case the height is already in hand when the grace expires. A relay that answers "ok" never shortens the `unmeasured` decision — that one stays the record's 4 s.
6. **The in-frame failure overlay carries four inline positioning declarations** (`position/inset/overflow/background`). §3.1 ships a class for the waiting line but none for the failure, and reusing `.kb-explainer__wait` would push its mono 0.7 rem type and letter-spacing into `.kb-editorial__sub` (which sets no font-family). The iframe stays mounted underneath — it is what reserves the height, which is what makes check 22's "the page length does not change" true. The surface colour is the record's own `var(--kb-surface)`; nothing else is styled. Reported as a §5 record gap.
7. **The second `.kb-explainer__note--screen` (print caveat) is not rendered yet.** §4.3 draws it, but its string is `print.explainerCaveat` — S8's half — and it is invisible on screen by construction. The slot is marked in `explainer-frame.tsx` and the note for S8 says exactly where it goes.
8. **The anonymous branches render `.kb-docbar` with only the actions group.** §4.1's nav group holds one link, "All documents", into the **member-gated** list; the anonymous public page never had it and giving a stranger a link to a login wall is not what the group is for. Copy link and Delete stay member-only exactly as before. Full width is on **every** surface, as §5 requires, and it is where S8's Export PDF joins it.
9. **`exportDialog` / `exportDialogIos` are stored without §7's `**` emphasis markers** ("Choose Save as PDF as the destination…"). The asterisks are markdown emphasis in a copy table, not characters a reader should see; how to render the emphasis is S8's markup decision, noted for them.

## 5. Record gaps reported, not filled (also on `## Operator Questions`)

- **§8 check 2's two numbers** (885 / 1125) contradict §3.1's own `.kb-doc__body` padding and `.kb-doc` 64rem cap. Fourth instance of the phase's standing shape — prose overreaching a verbatim sheet.
- **§8 check 3's "390px minus the frame border"** ignores the page gutter rounds 03/04 own.
- **§8 check 4 greps for `46rem`** in a tree that must contain the verbatim §3.1 sheet, whose comments say "46rem" three times.
- **§8 check 23** designs a state the round does not: see the table.
- **§6 names two accessible labels ("Code block", "Table") that §7 lists no key for.** The literals are the record's and were adopted; only the language suffix (`Code block (ts)`) is originated, and §5 is what asks for "an aria-label from the fence's language".
- **§7 gives the two relay failures no mono eyebrow.** The 404 branch reuses `STATES.notFoundCode` ("Not found · 404", round 03 §5.1's own literal); the 502's `Error · 502` is originated as the exact parallel of round 03's `Error · 500`.
- **§5/§7 give the `ok: false` panel no title** — hence the optional-title change in deviation 2, rather than inventing a heading.

## 6. Probes run and reverted (each byte-diffed back)

| Probe | Why | Reverted |
|---|---|---|
| `lib/explainer-height.ts` — `injectHeightReporter` returning the html unchanged | check 6 needs "the reporter disabled", and the relay injects it into every document | `diff` clean; the served document carries the marker again |
| `api/documents/[id]/raw/route.ts` — `if (id === 65) return json(404 \| 502, …)` | check 22's two branches | `diff` clean; `/api/documents/65/raw` → 200 |
| `(public)/documents/[id]/page.tsx` — `loadVersions` forced to throw | check 21's failure panel | `diff` clean |

`git status` at the end shows only the intended files.

## 7. Fixtures created (tenant `p28s5`, project `research`, which is public)

Left in place for **P28.S8** (the print half needs exactly these bodies) and **P28.S9**. All were
created with `commit: false`, and `tenants/` is gitignored, so nothing entered the repo.

| id | what | why it exists |
|---|---|---|
| 64 | `round-06-measure-probe` (md) | a 42rem paragraph, a wide `pre`, a 6-column GFM table, a relative link, a bare autolink, a `#`-anchor, a task list, a blockquote, an `hr` — checks 1–4, 16 |
| 65 | `round-06-short-explainer` (html) | a measured frame (916px), a ToC, a quiz button |
| 66 | `round-06-long-explainer` (html) | 25 sections → an 8,698px measured frame; check 13's "genuinely long explainer" and check 9's ToC |
| 67 | `round-06-versioned-probe` (md, v3) | the version panel and `/documents/67/versions/1` |
| 68 | `round-06-long-markdown-probe` (md) | a 14,846px page at 390 with no hydration needed — the harness proof for check 13 |
| 69 | `round-06-empty-body-probe` (md, empty) | `.kb-prose__empty` inside `.kb-prose` |

Anonymous reads: `/@p28s5/research/<slug>`. A fresh ingest key was minted for this
(`p28s7-fixtures`); the plaintext lives only in `/tmp` and is not recorded here.

## 8. Not reachable from here (for the gate walk / P28.S9)

- **`env(safe-area-inset-bottom)` on a real iPhone** — desktop Chrome resolves it to 0, so the pill's measured 14px clearance at 390 is the floor, not the device value.
- **`@media (pointer: coarse)` hiding the `<kbd>Esc</kbd>`** — no touch emulation through this instrument.
- **`prefers-reduced-motion: reduce`** — not settable live (P28.S2's finding); the spinner's animation is inside the record's own `no-preference` block and `.kb-skel`'s pulse is guarded at `kb-console.css:172`, both audited in source.
- **The claim-hint line on a real slug-less tenant** — `p28s5` has a slug, so the hint cannot render there. Its layout was proved by injecting the markup into the live `.kb-docbar` (`flex-basis: 100%`, own line below the row, accent underline link); the live path wants `p28s6noslug`.
- **The anonymous `/documents/{id}` branch** — an anonymous visitor is redirected to the pretty URL whenever the document has one, so that branch needs a slug-less tenant too. It renders the same components as the pretty page's anonymous branch, which was measured.
