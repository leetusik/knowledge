# P28.S9 — result

- **status**: `done`
- **summary**: Swept every surface P28 changed at 390×844 · 820×1180 · 1024×768 · 1440×900 in the dev runtime **and** the production standalone build — zero page-level horizontal overflow anywhere, navbar/rail placement correct at every width, dev and production identical — and drove the functional pass live (every visible control clicked, interaction states, liveness over time). Landed the one licensed change, the **11px landmark-label floor** in `drawLabel`. Found and reported (not fixed) three in-boundary defects — the graph dock's tag switch renders **0×0** on a small plate, the graph page's 21px gap where every other console page is 16px, and the member auth guard bouncing to `/login` with no `?next=` — plus one out-of-scope landing clip.
- **files_changed**:
  - `/Users/sugang/projects/personal/knowledge/web/src/app/(app)/graph/graph-canvas.tsx` (one expression + its comment)
  - `/Users/sugang/projects/personal/knowledge/works/phases/active/P28/phase.md`
  - `/Users/sugang/projects/personal/knowledge/works/phases/active/P28/slices/P28.S9/result.md`
- **validation**:
  - `pnpm --dir web typecheck` — **PASS**
  - `pnpm --dir web lint` — **PASS**
  - `pnpm --dir web test` — **PASS** (17 files, 113 tests)
  - `pnpm --dir web build` — **PASS** (standalone; the floor is in the served chunk — see below)
  - `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55439/kb uv run pytest -q` — **PASS** (128 passed, 0 skipped), on a disposable `postgres:17`
  - `python3 scripts/workflow.py validate` — **PASS** (pre-existing advisories only: unknown kinds on P22/P26 slices, `oversized_doc_sections=11`)
  - the sweep itself — §"What was verified" below (Aside `repl --account u1`, dev `:3030` + production standalone `:3040`)
- **deviations**: none. The plan's one licensed code change was made and nothing else was fixed; every other defect is reported with a repro.
- **doc_impact**: `frontend.md: the graph's always-on landmark labels now paint at a minimum 11px on screen (a floor in drawLabel's landmark tier only) (P28.S9)`
- **review_verdict**: n/a
- **explain**: n/a

---

## 1. The one licensed code change — the landmark label floor

`web/src/app/(app)/graph/graph-canvas.tsx`, in `drawLabel`:

```js
const size = Math.max(
  (isDoc ? T.labelSize : T.labelSizeTag) * z,
  isDoc && landmarks[n.id] ? 11 : 0,
);
```

- **The px value is ORIGINATED: `11`.** It is not a token, not a record value, and nothing else changed —
  no colour, no weight, no halo, no gap, no new CSS custom property.
- **Why 11.** The record's own label size is `--kb-graph-label-size: 12.5px` at zoom 1, so an 11px floor
  can **never make a landmark label bigger than the round drew it** — it only stops it shrinking below
  legibility. At the now-correct fit zoom (0.296 on the `p28s6` corpus) the same label painted at
  **3.7px**; it now paints at 11.
- **Landmark tier only.** The floor is gated on `isDoc && landmarks[n.id]`, which is exactly §4.5.1's
  always-on top-N set (`--kb-graph-label-cap` 8 on a large/medium plate, `--kb-graph-label-cap-sm` 4 on a
  small one). Selection, hover, the zoom tier (`dz >= 1.6`) and every tag-hub label are byte-unchanged —
  above zoom 0.88 the `Math.max` is a no-op, so the change is invisible everywhere the labels were already
  legible. The one deliberate superset: a landmark that is *also* selected keeps the floor (same node, same
  label) rather than paying for a second branch.
- **Verified in both runtimes.** Dev: read live off `/@p28s6/graph`, screenshot `/tmp/p28s9/graph1440.png`.
  Production: the minified expression is in the served chunk —
  `Math.max(((s="doc"===t.type)?L.labelSize:L.labelSizeTag)*a,s&&V[t.id]?11:0)` in
  `_next/static/chunks/1ody0otwqzdkk.js` — and the small-plate rendering is `/tmp/p28s9/graph390.png`.
- **What the operator should look at (walkthrough material).** The labels are legible now, and they
  **overlap each other** in the dense core — eight 11px titles ~230px wide in a cluster ~300px across.
  Before the floor they overlapped too, as an illegible grey smudge, so this is not a regression; it is the
  first time the crowding is *visible*. `11` is the adjustable number. The alternatives — a lower
  `--kb-graph-label-cap`, truncating a landmark title, or landmarks off entirely — are new visual
  decisions and were **not** taken here.

## 2. What was verified

**Instrument: Aside**, `aside repl --account u1 "<js>"` over Bash, never `u0`. Layout at a true CSS
viewport through S2's iframe harness behind a throwaway reverse proxy (dev `:3031` → `:3030`, production
`:3032` → `:3040`, both with S7's `/__anon` cookie-stripping prefix); interaction with real
`page.mouse.click` / `page.locator().fill()` / `page.keyboard`.

### 2.1 Four viewports × every changed surface, dev and production

Every cell below is `document.scrollWidth − clientWidth` (page-level horizontal overflow), the navbar
placement, and a structural smoke read. **hOver = 0 on every surface at every viewport in both runtimes.**

| Surface | 390×844 | 820×1180 | 1024×768 | 1440×900 |
|---|---|---|---|---|
| `/dashboard` | navbar bottom (top 785, 59px, 3×58px) | navbar strip (top 56) | rail | rail |
| `/documents` | ✓ | ✓ | ✓ | ✓ |
| `/documents?q=probe` (snippets, marks) | ✓ | ✓ | ✓ | ✓ |
| `/projects/{id}` (+ documents panel) | ✓ | ✓ | ✓ | ✓ |
| `/graph` (member) | plate 356×416 | ✓ | ✓ | plate 1123×660 |
| `/documents/64` (member doc) | ✓ | ✓ | ✓ | ✓ |
| `/@p28s5/research/…` (anonymous doc) | ✓ | ✓ | ✓ | ✓ |
| `/@p28s6/graph` (anonymous, 136-node corpus) | ✓ | ✓ | ✓ | plate 1331×660 |
| `/` (landing, rounds 01/02) | **clipped hero — F4** | ✓ | ✓ | ✓ |
| `/login` (auth gate) | card 400px, `place-items: center`, no `data-kb-scheme` | — | — | ✓ |

Dev and production agree surface-by-surface within a few px (the only deltas are rows this sweep itself
added to the API-keys table). Two "offenders" recur and are both correct by design: the `pre` fence and the
6-column table on document pages exceed the viewport **inside their own scroll containers** (round 06
§3.1's bleed-and-scroll — page-level overflow stays 0), and the stacked-card tables' `<thead>` is clipped to
1px by `overflow:hidden` at 390 (round 03's stacked-card technique).

### 2.2 The functional pass — every visible control, clicked

**Console (member, `p28s5`).** Rail collapse/expand (`data-rail` flips, 240px ↔ 0) · skip link ·
navbar links with `aria-current="page"` updating · phone account `<details>` opens and fits ·
"New project" disclosure (opens, focus to the first field, Cancel closes and returns focus to the trigger,
`aria-expanded` correct) · org-slug Save · **Copy link → "Link copied"** with the Check icon (the state is
sticky by design) · **New key → real submit → show-once reveal**, Copy *inside* the key block → "Copied",
Dismiss returns focus to "New key" · **two-step confirms** on Revoke and Delete (prompt · Cancel ·
destructive, focus to Cancel, cancel restores focus to the trigger) — and Revoke **carried through for
real** twice (status → Revoked, the button leaves the row) · focus ring measured `2px solid rgb(15,111,102)`
at `2px` offset.

**Documents.** Search typed and submitted with Enter (`?q=probe` → 4 rows, 3 real `<mark>`s, hint line) ·
project filter + Search round trip (`?project=…` → 8 rows, caption "8 results") · Reset → `/documents` ·
`?project=not-a-uuid` → the designed 404 **inside the shell** (the 422 mapping) · `+n` tag overflow chips
carry a `title` · **pager exercised** at `?limit=10`: "Previous" is a `<span>` on page 1, Next → `offset=10`,
Previous back — never exercised before, because no fixture tenant has more than one page at the default limit.

**Project page.** Visibility toggle **both ways** (Public → Private → Public, status line and label
follow) · documents panel lists five newest + "All documents" → the filtered list · empty-project panel
renders the table's empty row.

**Document views.** `Copy link` · **`Export PDF` fully driven** with `window.print` stubbed (never called for
real): the hint `Choose Save as PDF as the destination…` portals into `.kb-docbar` (not the actions row) with
`role="status"`, the button reads `Preparing…`, `afterprint` clears **both** (no stuck busy), and the failure
branch fires after 1.5s with `Couldn't open the print dialog. Use your browser's Print command instead — ⌘P,
or Ctrl+P.` · `Full width` → `?view=full` (docbar, topbar and metadata strip all computed `display:none`,
prose to the full 1440 track, exit pill `position:fixed` 18px up with its `<kbd>` shown on a fine pointer) ·
**Esc exits** back to the document · version history (3 rows, `/documents/67/versions/2` loads) ·
explainer frames resolve live (916px and 8,698px measured, `[data-unmeasured]` never set, no waiting line
left on screen).

**Graph (`p28s6`, 33 docs / 100 tag hubs / 136 nodes).** Legend collapse (`aria-expanded`, height 165 ↔ 41,
persisted as `kb-graph:v1:…` in `sessionStorage`) · zoom `+` repaints the canvas · Fit writes the v2 view
record (`{"v":2,"w":1121,"h":658,"n":136,…}`) · node click → panel with title, date, tags, close · the
**public** read link is the canonical path `/@p28s6/changple5/changple5-note-02`, the **member** one is
`/documents/53` and member tag pills are `/documents?tag=…` links · a panel tag pill on the public graph
**lenses without navigating** (URL unchanged) — D18's tag half · dock at a small plate: 44px pills, project
lens sets `aria-pressed` and the panel becomes a **bottom sheet** (`position:absolute`, 354px wide, 1px off
the plate's bottom edge) · `+`/`−` correctly hidden below 34rem with Fit alone at 44×44 · the dock's
horizontal scroller is real (`overflow-x:auto`, scrollWidth 466 in a 356px rail, `scrollLeft` max 110).

**Auth.** Sign out → `/login` · wrong password → `.kb-authcard__error[role=alert]` **"Incorrect email or
password."**, which **clears on real typing** · `?next=` round trip proved end to end
(`/login?next=/@p28s6/changple5/changple5-note-02` → real sign-in → **landed on the document**) ·
`redirectIfAuthenticated` honours a safe next (`?next=/documents` → `/documents`) and **fails closed live**
on `?next=//evil.example.com` → `/dashboard`.

**Empty and legacy states.** `p28s6empty`: the plate's own empty state — "No documents yet / The map draws
itself as documents land in your org. 문서가 추가되면 지도가 그려집니다." — with the legend hidden and no
page-level editorial borrowed; documents page `0 results` + the table's empty row; tiles all 0.
`p28s6noslug` on the legacy `/graph/{uuid}` route: legend, zoom, painted canvas, node panel, and the read
link is **`/documents/62`** — the `canonical_path: null` fallback, confirmed against the payload
(`GET /app/graph?org=<uuid>` → `canonical_path: null`, `url: "/documents/62"`).

**Liveness over time.** A client-side nav to `/graph` paints 6 skeleton elements at ~120ms and resolves to
the canvas (0 skeletons) — no skeleton that never resolves. No busy state anywhere outlived its action
(mint, toggle, export, revoke all measured after). `.kb-toast-region` is still empty — nothing emits a
toast, as P28.S3 recorded.

**OS dark scheme** (set with `osascript`, restored immediately). `.kb-app` adopts dark (`rgb(26,24,21)`) on
every console surface, the **graph canvas re-inks** (`rgb(22,19,15)` at the plate corner), and the dashboard
shows no light-body bleed (`.kb-app` height == document height). Screenshot `/tmp/p28s9/dark.png`.

### 2.3 Seams between rounds — the three the notebook named, plus what I looked for

1. **The graph page is not a `.kb-page-flow`** — confirmed at all four viewports in both runtimes, and now
   **measured**: the gap between `.kb-pageframe` and the plate is **21px**, where every `.kb-page-flow` page
   has a **16px** row gap (dashboard children measured at exactly 16). Finding **F2** below.
2. **The graph CSS on every page is inert** — re-checked: `graph-tokens.css` declares only `--kb-graph-*`
   and `graph.css` has no selector outside `.kb-graph`; no weight, spacing or colour change was observed on
   any non-graph surface in either runtime at any viewport.
3. **The four-cell phone actions row** — at a 390 container the row is `display:grid` with columns
   `93.4 / 80.7 / 80.4 / 80.4`, all four on **one row**, Delete 80×48, nothing clipped, no overflow. Exactly
   what P28.S8 reported; re-reported by nobody, confirmed by me.
4. **Looked for and did not find:** any surface where a round-05/06 sheet leaks outside its scope (every
   P28 sheet is `.kb-*`-scoped or `:root` `--kb-*` tokens; the only element-level rule,
   `html, body, .kb-app` in `kb-print.css:53`, is inside `@media print`); any page-level horizontal
   overflow; any shell/nav mismatch between the console, the public shell and the auth gate at a shared
   breakpoint; any failure of the dev↔production pair.

## 3. Defects found and NOT fixed — for `P28.REVIEW`

### F1 — the graph dock's tag switch is 0×0 on a small plate (in-boundary, functional)

**Repro.** Open `/@p28s6/graph` (or the member `/graph`) at 390×844 — verified at a true 390 viewport
against the **production** build and at a 390-wide `.kb-app` container in dev. Below `34rem` of plate the
legend leaves and `.kb-graph-dock` takes over. Its "Tags · 태그 76" row contains

```html
<button class="kb-graph-switch is-on" data-switch="tags"
        aria-label="Toggle tag visibility" aria-pressed="true"></button>
```

which measures **0×0** (`display:block`, `tabIndex 0`). On the desktop legend the same control measures
~14px and works. Visible in `/tmp/p28s9/graph390.png`: the dock's Tags pill shows a count and **no toggle**.

**Cause.** Every sizing rule for the switch is scoped to a *descendant* of the plate —
`graph.css:172/184/196/199` all read `.kb-graph .kb-graph-switch…` — and P28.S6 made the dock a **sibling**
of `.kb-graph`. Round 05 §3 itself expects the switch to live in the dock (`graph-r5.css:141`:
`.kb-graph-dock__item .kb-graph-switch { margin-left: 0.1rem; }`), so the record and the shipped DOM agree;
only the pre-existing sizing selector does not reach.

**Consequence.** On a phone the only control that hides 76 tag hubs is invisible and unclickable, and an
invisible focusable control stays in the tab order.

**Suggested fix (one line, and it does *not* touch a verbatim record).** `graph.css` is P22's own
stylesheet, not a signed round sheet — widening `graph.css:172`'s selector to
`.kb-graph .kb-graph-switch, .kb-graph-dock .kb-graph-switch` (and the same for the `::after` / `.is-on`
siblings) restores the record's intent, originating no value. **Not landed here**: the notebook rules that
the landmark floor and P28.S8's print correction are the only two authorised corrections in P28 and that
every other gap is reported, not fixed.

### F2 — the graph page's 21px gap vs the console's 16px (in-boundary, cosmetic)

**Repro.** `/graph` at 1440: `.kb-graph`'s top is **21px** below `.kb-pageframe`'s bottom; on `/dashboard`
every `.kb-page-flow` child sits on a **16px** row gap. Predicted by P28.S6's note ("the gap above the plate
may not match the other pages"); now measured. The dock's own `margin-top: 0.55rem` means the page still
renders correctly. The fix — wrapping the graph page in `.kb-page-flow` like round 04 did to every other
console page — is more than a line and is a `fix`-slice job.

### F3 — the member auth guard bounces to `/login` with no return address (in-boundary, D18)

**Repro.** Signed out, open `/documents` → `/login` with **no query** → sign in → `/dashboard`, not the
documents page. `requireIdentity` → `requireSession()` (`web/src/lib/auth-guards.ts`) redirects to the bare
`LOGIN_PATH`, and so does its 401 branch.

Everything that *is* given a `next` works, proved live above: the public gate's link, `/login`'s laundering
through `safeNextPath`, `redirectIfAuthenticated` honouring a safe path and failing closed on
`//evil.example.com`. So this is the one half of D18's original problem statement ("`requireSession` bounces
to `LOGIN_PATH` with no return address") that P28.S6's "D18 is now closed on both halves" does not cover.
**Not a one-line fix** — a server guard cannot see the request path without `headers()` or middleware — so
it is a review call: close D18 as-is (the public gate was the user-facing half) or cut a `fix` slice.

### F4 — the landing hero is clipped at 390 (OUT of scope, pre-existing, deferred-job candidate)

**Repro.** `/` at 390×844 (`/tmp/p28s9/land390.png`): the hero `h1` and the lede both lay out to **x=428** in
a 390 viewport and are cut by `section.mkt-band`'s `overflow-x:hidden` — "outlives" and "conversation" are
sliced mid-word, the lede loses the end of every line, and the second CTA "Connect Claude Code" is clipped.
The `.mkt-eyebrow`'s 404px min-content is what forces the grid item wider than its track.

**Not caused by P28**: the marketing files are outside `phase-scope P28`, and every sheet P28 added is
`.kb-*`-scoped or `:root` `--kb-*` tokens (the one element-level rule is inside `@media print`), so nothing
this phase landed can reach `.mkt-*`. Rounds 01/02 are report-never-redesign, and this is outside the
phase's boundary, so it belongs in `defer-job` (the review files it), not in the verdict.

## 4. What I could NOT verify — say it plainly

- **Touch.** Nothing in this phase, including this slice, has been driven with a finger. Specifically
  untested: the dock's thumb-scroll (the scroller is correctly configured — `overflow-x:auto`, 110px of
  travel — and `scrollLeft` moves programmatically, which is *not* the same as a thumb), the bottom sheet's
  internal scroll under a drag, and **pinch / double-tap zoom on a small plate**, which is round 05 §3's own
  justification for dropping `+`/`−` there. If pinch does not work on a real phone, Fit-only is a trap.
- **Safari, Mac and iOS.** Every engine claim in this phase, mine included, is Chromium's — the print
  findings, the teal-tag-chip question, `@media (pointer: coarse)` behaviour, and the iOS 16px input zoom.
- **A physical printer.** Every paper claim is a PDF out of the print pipeline (P28.S8's, not re-run here).
- **The production origin in the print masthead.** Locally `SITE.url` falls back to `127.0.0.1:3030`, so the
  masthead prints that; `knowledge.hi2vi.com` is only provable on the deployed container.
- **`prefers-reduced-motion` live** — it cannot be set into the browser from the shell (S2 established
  this); the guards were audited in source and the computed animation set enumerated instead.
- **Device pixel ratio and real devices.** The harness gives a true CSS viewport at DPR 1, never a phone.

## 5. Method notes worth keeping (they are in `phase.md` for the next reader)

- **The harness hydrates against the PRODUCTION server.** S2/S3/S7 recorded that React does not hydrate
  inside the iframe harness — true in dev, where the proxy carries no HMR websocket, but **false against
  `next start` / the standalone server**: at a true 390 viewport on `:3040` the graph dock, the account
  disclosure, navbar navigation and the bottom sheet all worked under real mouse clicks. True-viewport
  *interaction* is therefore available in P28 for the first time; it is how F1 was confirmed at 390.
- **`uv run pytest` needs `KB_TEST_DATABASE_URL` on a disposable postgres.** Pointing `DATABASE_URL` at the
  live `kb-p28s2-pg` fixture database with a populated `KB_ROOT` produced **45 spurious failures**; the same
  tree against a throwaway `postgres:17` on 55439 is **128 passed, 0 skipped**, exactly as P28.S1 recorded.
- **The standalone server needs `public/` linked entry by entry.** `ln -sfn "$PWD/public"
  .next/standalone/public` nests *inside* the existing directory and `/logo.svg` then silently 404s (a
  broken logo, no layout change). Link each entry, and restart the server afterwards — it does not pick the
  links up live.

## 6. State left behind

- Dev runtime restored exactly as the notebook documents it: `next dev` on **:3030**, API on **:8766**,
  `kb-p28s2-pg` up, signed in as **`p28s5@example.com`**. The production server (:3040), both harness
  proxies (:3031, :3032) and the disposable test postgres (:55439) are stopped/removed.
- `web/.next` now holds a **production** build (`pnpm --dir web build` ran after the code change); the dev
  server rebuilt over it on restart and serves the console correctly (verified: the CSS chunk carries
  `.kb-authcard` / `.kb-navbar`).
- This sweep created and then **revoked** two API keys in `p28s5` ("p28s9 sweep key", "p28s9 reveal probe"),
  so the dashboard's API-keys table now shows two extra `Revoked` rows. No document, project or tenant was
  created or deleted anywhere; `research` was toggled Private and back to **Public** (its original state).
- Scratch artefacts (proxies, probes, screenshots) are under `/tmp/p28s9/`, outside the repo.
