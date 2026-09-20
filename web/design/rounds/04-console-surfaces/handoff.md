<!-- design-cowork handoff — OUT. Claude Design returns the card set + a record of what was designed + an implementation contract. -->
# Design handoff — Round 04: the console surfaces at phone, tablet and desktop

**Phase/slice:** P27.S3 · **Round:** 04-console-surfaces · **Date:** 2026-09-21 · **Author:** Claude Code (orchestrator)

**You (the operator) + Claude Design make every visual decision here.** This document says *what* to design
and *what to return*; it decides no colour, type, layout, or copy. Every design question is posed back to
you in §6 — I answer none of them.

---

## 0. Before the session

The project exists and round 03 is signed. Nothing to create this time.

- **Knowledge Base Design System** · project id `623bb4ea-8fb7-4d31-9d58-5c6a42709bbe`
- It holds `shipped/` (15 baseline cards — the "before", never overwritten) and **round 03's 16 cards**
  under `Foundations` / `Components` / `States`. This round adds cards **17–26** at the project root.

Steps:

1. Open the project in Claude Design (claude.ai/design).
2. Check **Connect GitHub** still points at `leetusik/knowledge`, branch `main`, so the session reads the
   current code **and this file**. This handoff is committed but **not pushed** — push `main` yourself
   (`git push origin main`), or point the session at this checkout with a local-directory connection, which
   needs no push.
3. Give the session this file as its brief: `web/design/rounds/04-console-surfaces/handoff.md`.
4. When the cards are in the pane and the outputs in §5 are returned, come back here and say **"done"**.
   Your "done" is what signs this round — unless you ask for a runnable mockup first, in which case say so
   and the round waits on that instead.

---

## 1. What this round is for

Round 03 built the **kit**: breakpoints measured on the container, a phone/tablet navigation bar, the phone
topbar, the dark scheme, the table rule, fluid display type, phone density, and the system-wide states. It
designed components — not one real page.

**Round 04 designs the pages.** Six surfaces, each as a real composition at three real widths, with the real
data these pages actually carry:

| Surface | What it is today |
| --- | --- |
| Member shell | Topbar (fold toggle · brand · org crumb · full email · Sign out) over a `[rail \| main]` grid |
| Anonymous public shell | The same topbar with no rail and one "Sign in" — composed 1:1 from the member pieces |
| Dashboard | 4 stat tiles · a 30-day trend · projects + recent-activity columns · Public URL · Org API keys |
| Project page | Header with a visibility badge + toggle · tiles · trend · credentials — **and a documents list this round invents** |
| Documents | Search bar + project filter · results table with snippets · a pager |
| Auth gate | Login and signup on the dark `slate` scheme, a 25rem card centred on `min-h-dvh` |

**None of them has ever been composed below 1280px.** The dashboard's two columns are a hard grid, every
page header is a non-wrapping flex row, and the documents page carries the app's only width media query.
Round 03 removed the reasons those break; this round decides what each page actually *is* at 390, 768 and
1180.

**What the operator asked for, in their words:** *"need mobile, tablet, and pc view upgrade"* and *"need
list of documents when clicked a project"*. The second is a new capability — see §2 card 22 and §6 Q2/Q3.

---

## 2. Scope — the reviewable units to design (one card each; paths in §5)

**Shells**

- **17 · Member shell, assembled.** The whole chrome around a real page at phone / tablet / desktop: skip
  link, topbar, `.kb-navbar`, rail, main, toast region. Desktop with the rail expanded **and** folded (the
  `kb_rail` cookie). Phone with the account disclosure closed **and** open. This card does not re-decide the
  pattern (round 03 settled it) — it shows the pattern carrying a real page, and settles whatever only shows
  up once it does.
- **18 · Anonymous public shell.** The same three widths for a visitor with no session: no rail, no crumb,
  no email, one "Sign in" that is never hidden. What the desktop layout does with the space the rail leaves
  is an open question (§6 Q8). The pages inside it — public documents, the public graph — belong to rounds
  05 and 06; frame them as context, do not design them.

**Console pages**

- **19 · Dashboard.** The whole page at three widths, in one column on phone and tablet: page frame with
  "New project", the four tiles, the trend panel, the projects and recent-activity columns, the Public URL
  panel, the Org API keys panel. Block order on a phone is an open question (§6 Q1).
- **20 · Dashboard panels, close up.** The pieces a full-page card cannot show at a readable size, at phone
  and desktop: the create-project disclosure open; the Public URL field + Save + the resulting `/@org/graph`
  line with its copy button; the mint-key disclosure and the **show-once key reveal**; the recent-activity
  feed with its mono time column.
- **21 · Project page.** Three widths: eyebrow · project name · "Created {date}", the Public/Private chip
  and the visibility toggle beside it, the four tiles, the trend, the credentials panel with its mint
  disclosure and the two-step revoke confirm inside a row.
- **22 · Project documents list — new.** The operator wants a project's documents reachable from the
  project. The data already exists (`GET /app/documents?project={uuid}`); nothing in the product links to
  it. Where the list sits on the page, what a row carries, how many rows it shows, what happens past them,
  and what it says when the project has no documents are all yours to decide (§6 Q3).
- **23 · Documents browse.** Three widths: page frame, the search bar and project filter, the mono hint
  line, the results panel with its "{n} results" caption, the table at priorities 1/2/3, the pager. The
  search bar needs a **submit and a reset** that round 03 did not draw (§6 Q4).
- **24 · Documents search and states.** Search mode with `<mark>`-highlighted snippets; the two distinct
  empty states (nothing ingested yet · filters matched nothing); the two-step delete confirm inside a
  stacked phone row; a row whose tags overflow.

**Auth**

- **25 · Auth gate.** Login and signup at three widths on the dark `slate` scheme: brand row + "Secure"
  pill, serif lead + sub, the email/password fields, the full-width submit, the trust-chip footer, the
  cross-link to the other page.
- **26 · Auth states.** The five status-keyed errors (`AUTH_ERRORS`), the busy submit ("Signing in…"), the
  signup password hint, `aria-invalid` fields, and what the trust-chip row does when it will not fit.

Add cards beyond this list if the design needs them (numbered after the list — §5). Never a monolithic page.

---

## 3. Round 03 is an input, not a question

**Settled by round 03 and not up for revision.** Cite them; build on them; never re-pose them:

1. The console responds to its **container**, not the viewport — `.kb-app` = `kbapp` (shell), `.kb-app-main`
   = `kbmain` (content). Phone `< 40rem` · tablet `40–64rem` · desktop `≥ 64rem` · wide `≥ 90rem`.
2. **Navigation**: one `.kb-navbar` — a bottom bar on phone, a sticky strip under the topbar on tablet, gone
   on desktop where the rail returns. No icons. The `kb_rail` fold is unchanged and desktop-only.
3. **Phone topbar**: brand + an initial opening `<details class="kb-account">` (email, org, Sign out). The
   org crumb moves into the page-frame eyebrow. The anonymous shell's Sign in is never hidden.
4. **Dark scheme** follows the OS via `.kb-app[data-kb-scheme="auto"]`; no toggle. Auth stays `slate`.
5. **Tables**: `data-pri` column priority (3 leaves below 64rem), one card per row with `data-label`
   captions below 40rem, no horizontal scroll, `<thead>` clip-hidden. Priorities for the three real tables
   are fixed in the contract.
6. **Type**: display fluid (`cqi` clamps on `kbmain`), UI and body fixed, the stat numeral scales down.
7. **Density**: 1.05rem phone gutter, 44px `--kb-tap` floor, 16px inputs. Desktop density unchanged.
8. **States**: `.kb-editorial` for a failed page (inside the shell), the same block inside a panel for a
   failed section, `.kb-empty` inside a panel for empty, a skeleton mirroring the layout, a root-level
   `.kb-toast-region`.

New classes round 03 introduced and this round composes: `.kb-pageframe` (+`__title-wrap __actions`),
`.kb-app-cols`, `.kb-navbar`, `.kb-account`, `.kb-searchbar` (+`__field __filter`), `.kb-editorial`,
`.kb-skip`, `.kb-form-actions`, `.kb-toast-region`, `.kb-skel-*`, `.kb-appbtn__spin`.

**Also locked**: the "calm editorial library" brand spirit; teal as the only interactive accent; Fraunces /
Source Sans 3 / JetBrains Mono with their Korean fallbacks; warm paper, never pure white or black; no emoji;
the accessibility and reduced-motion floor; every existing `--kb-*` / `--text-*` / `--color-*` token **name**
and **value** (add, never rename, never change); all **copy** (every string lives in `web/src/content/*` —
if a surface needs a new string, that is a question for the operator, not a design decision); the **data
contracts** (what each table's columns are, what a tile shows); the status semantics (active teal · idle
amber-bronze · revoked terracotta, encoded in form); the landing page (rounds 01/02 — untouched); and the
**graph** and **document views + print**, which are rounds 05 and 06 — do not design them here.

**In play**: the composition and order of every block on every page; what moves, folds, stacks or
disappears at each width; the new project documents list; where a click on a project goes; where a
disclosure's revealed form lands; the auth gate's composition and error placement; the search bar's submit
and reset; the anonymous shell's desktop width; any **new** `.kb-*` composition classes and any **added**
tokens (additive only, like round 03).

---

## 4. Where to look (real paths, real data, real copy — data, not proposals)

**The foundation, first:** `web/design/rounds/03-foundation/output/build-prompt.md` — the implementation
contract (§0 the container rule and the named widths, §2 the token block, §3 the whole
`console-responsive.css`, §4 the per-component markup, §5 the states, §6 the dark scheme, §7 the a11y
floor). `result.md` beside it explains why each decision was made. In the project, the cards link
`fonts.css`, `tokens.css`, `console.css`, `app-frame.css`, `console-responsive.css` and the specimen chrome
`specimen.css` / `specimen-r3.css`.

**Shells** — `web/src/components/app-shell/app-shell.tsx` (server; topbar slots), `app-frame.tsx` (the one
client island: the fold toggle, `data-rail`, the `kb_rail` cookie via `useSyncExternalStore`), `rail-nav.tsx`
(`aria-current` active state, the "Org" eyebrow head, a `soon` variant that renders a muted pill instead of
a link), `logout-button.tsx`, `app-frame.css`; `web/src/components/public-shell.tsx` (40 lines, composed 1:1
from the same pieces). Copy + nav: `web/src/content/app.ts` (`APP_NAV` = Dashboard · Documents · Graph;
`APP_SHELL` labels, including `railToggleLabel` / `logoutLabel` / `noTenant`).

**Dashboard** — `web/src/app/(app)/dashboard/page.tsx` (415 lines) + `create-project-form.tsx`,
`mint-org-key-form.tsx`, `org-slug-form.tsx`, `revoke-org-key-button.tsx`. Real shapes: tiles are
**eyebrow + figure only — there is no delta line** (`components/usage/stat-tiles.tsx`, an explicit operator
decision); the trend is a server-rendered SVG at `viewBox 600×160` with `preserveAspectRatio="none"` inside a
fixed **120px** figure (`components/usage/trend-chart.tsx`); the projects table is `Project · Docs · Keys ·
Visibility · Created · Last used · Open`; the activity feed is a `<ul>` whose rows are a 4.6rem mono relative
time plus a sentence with one bolded entity; the Public URL panel renders `/@{slug}/graph` with a copy
button, or an empty line before a slug is claimed; the org-keys table is `Name · Key · Status · Created ·
Last used · Revoke`, with a **show-once** reveal modal after minting. Copy: `web/src/content/dashboard.ts`.

**Project page** — `web/src/app/(app)/projects/[projectId]/page.tsx` (275 lines) + `mint-credential-form.tsx`,
`revoke-credential-button.tsx`, `visibility-toggle.tsx`; copy in `web/src/content/project.ts`. The documents
list does not exist: the client call is `getDocuments(token, { project })` in
`web/src/lib/knowledge/app.ts:387`, returning `{ total, items: [{ id, title, project, date, tags }] }` — the
same rows the documents page lists.

**Documents** — `web/src/app/(app)/documents/page.tsx` (382 lines): a plain `<form method="GET">` (no JS, no
`router.push` — each result set is its own shareable URL), the `.kb-appsearch` box, a project `<select>`, a
primary **Search** submit and a ghost **Reset** link, a mono hint line, the results panel with
`"{n} results"`, the table `Title (+snippet) · Project · Date · Tags · Delete`, and a right-aligned
Previous/Next pager whose disabled side is a non-interactive ghost. Snippets arrive with literal
`<mark>…</mark>` markers and are rebuilt as real elements. `min-[720px]:` on line 229 is the query round 03
deletes. Copy: `web/src/content/documents.ts`.

**Auth** — `web/src/app/(auth)/layout.tsx` (the `slate` stage, `min-h-dvh`, `place-items-center`, `px-6
py-14`), `auth-card.tsx` (a `min(25rem, 100%)` card — **entirely inline-styled today, with no class of its
own**; a warm dark gradient, an inset top light, the brand row + Secure pill, lead, sub, the form slot, the
trust-chip footer, the cross-link below the card), `credentials-form.tsx` (the shared client island:
`.kb-field` rows, a full-width `.kb-appbtn--primary`, `aria-invalid` + `aria-describedby`, the password
cleared on failure). Copy and the five status-keyed errors: `web/src/content/auth.ts`.

**The kit these pages are built from** — `web/src/app/kb-console.css` (unlayered, beats Tailwind utilities),
`web/src/app/kb-tokens.css`, `web/src/components/ui/` (`app-button`, `badge`, `card` → `.kb-panel` /
`.kb-tile`, `data-table`, `field`), `web/src/components/copy-link-button.tsx`.

**The live console** — `https://knowledge.hi2vi.com` (sign in). Open it on your phone to see the state this
round replaces.

---

## 5. Required outputs (a round is incomplete without all three)

Return these into the design project (I read them back with DesignSync; I copy nothing down by hand):

1. **The card set.** **Line 1 of every card's preview HTML is the marker**, carrying a `group` and a
   `viewport`, and optionally a `name` and `subtitle` — the shape round 03's cards compiled:
   ```html
   <!-- @dsCard group="⏳ P27.S3 · Console pages" viewport="1180x1400" name="19 · Dashboard" subtitle="…" -->
   ```
   Use the round's address in the group while the round is under review — `⏳ P27.S3 · Shells`,
   `⏳ P27.S3 · Console pages`, `⏳ P27.S3 · Auth` — so the cards land together in reading order; at signoff
   I retire the address with a pure regroup (`Shells`, `Console pages`, `Auth`). **Produce exactly these
   paths, numbered in reading order, continuing round 03's numbering:**

   ```
   17-shell-member.html
   18-shell-public.html
   19-dashboard.html
   20-dashboard-panels.html
   21-project.html
   22-project-documents.html
   23-documents.html
   24-documents-search-states.html
   25-auth-gate.html
   26-auth-states.html
   ```
   Cards the session adds take `27-…`, `28-…`, and so on. A card that supersedes one of round 03's 01–16
   **keeps its path and number**. **Definition of done = the cards appear in the pane**, not "the files
   exist".

   **Show every surface at three real widths.** Because the console queries its container, a 390px frame
   *is* the phone layout — build each frame as a real `.kb-app` at **390 / 768 / 1180**, as round 03's cards
   do, not as a picture of one. A reviewer should be able to scroll a phone frame and watch the bar stick.

2. **Any stylesheet delta**, if the round needs one — a new marked `ROUND 04` block or its own file. Do not
   edit `console.css`, `app-frame.css`, or round 03's block: they are verbatim records of decisions other
   rounds made. Token additions are additive only — no existing name or value changes.

3. **A record of what was designed** — every departure from this handoff logged — **and an implementation
   contract** complete enough to build from without inventing anything: per surface, per width, what the
   composition is; the new documents list in full; the click targets; where every disclosure's form lands;
   the auth gate's error placement. The apply phase (**P28**) is dispatched to an implementer with **no
   DesignSync and no access to this pane**, so this contract is the whole source of truth it gets. Land them
   as `result.md` and `build-prompt.md`, as round 03 did.

---

## 6. Open questions — posed back to you (I decide none of these)

Resolve these *in the design*, or tell me at your return. If round 03 already settled one on a card, say so
in the record and skip it.

1. **Dashboard order on a phone.** Six blocks arrive in one column: tiles, trend, projects, recent activity,
   Public URL, Org API keys. What order, and does anything fold behind a disclosure instead of standing
   open?
2. **The project click target.** Today a project row is reached only through a small ghost "Open" button at
   the end of a seven-column row. Should the whole row be the target, the project name be a link, or the
   button stay? And in a stacked phone card, where the row *is* a card?
3. **The project's documents list** (the operator's request). Where on the project page does it sit relative
   to the usage tiles, the trend and the credentials? What does a row carry — title, date, tags, a snippet?
   How many rows before it stops, and what does it link to (`/documents?project={id}`)? What does it say
   when the project has no documents yet?
4. **The search bar's submit and reset.** Round 03's `.kb-searchbar` is field + filter; the real page is a
   no-JS GET form that also needs a primary "Search" and a ghost "Reset". Where do those two go at each
   width — a third cell in the bar, a row beneath it, or something else?
5. **The 30-day trend on a phone.** The chart is a fixed 120px box over an SVG that stretches
   (`preserveAspectRatio="none"`), so a narrow box distorts the line. Keep it, change its height or aspect,
   or drop it below 40rem?
6. **Panel-head disclosures on a phone.** Create project, mint credential, mint org key all hang off a panel
   head. Where does the revealed form land at 390 — pushing the panel open, a full-width block, a sheet? And
   what does the **show-once key reveal** look like there, given the key must be copied before it is lost?
7. **The auth gate on a phone.** A 25rem card centred on `min-h-dvh` with 1.5rem of page padding: does it
   stay a card, go full-bleed, or change its padding? And where does a status-keyed error appear — above the
   fields, at the submit, or per field?
8. **The anonymous shell on desktop.** With no rail, main is full width at 1180 and wider. Cap it, centre
   it, or leave it? And does the anonymous topbar carry anything besides brand and Sign in?

---

## 7. Attachments · Definition of done

- **Attach (optional):** screenshots from your phone of `knowledge.hi2vi.com` — the dashboard, the documents
  list, the login page — as **REFERENCE — data, not a proposal**, showing the unhandled state. Nothing to
  attach is fine; I will not invent imagery.
- **Done when:** the 10 cards (plus any added) are visible in the pane under the `⏳ P27.S3 · …` groups,
  each surface is shown at 390 / 768 / 1180 as real frames, any stylesheet delta is in the project, and the
  record + implementation contract are returned. Then come back and say **"done"**.

---

*This handoff is the OUT half of the round. The returned card set, record and contract are the IN half —
read-only data I land as-is, never edit.*
