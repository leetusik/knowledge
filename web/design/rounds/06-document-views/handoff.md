<!-- design-cowork handoff — OUT. Claude Design returns the card set + a record of what was designed + an implementation contract. -->
# Design handoff — Round 06: reading a document, on screen and on paper

**Phase/slice:** P27.S5 · **Round:** 06-document-views · **Date:** 2026-09-21 · **Author:** Claude Code (orchestrator)

**You (the operator) + Claude Design make every visual decision here.** This document says *what* to design
and *what to return*; it decides no colour, type, layout, or copy. Every design question is posed back to
you in §6 — I answer none of them.

This is the **last round of the phase**.

---

## 0. Before the session

Rounds 03, 04 and 05 are signed. This round adds cards **33–41** to the same project.

- **Knowledge Base Design System** · project id `623bb4ea-8fb7-4d31-9d58-5c6a42709bbe`
- It holds `shipped/` (the 15-card "before"), round 03's 16 cards (the kit), round 04's 10 cards (the
  console surfaces, now grouped `Shells` / `Console pages` / `Auth`) and round 05's 6 cards (the graph,
  still under their `⏳ P27.S4 · Graph` label — see §5.4, the same small housekeeping ask as last time).

Steps:

1. Open the project in Claude Design (claude.ai/design).
2. Check **Connect GitHub** still points at `leetusik/knowledge`, branch `main`. This handoff is committed
   but **not pushed** — push `main` yourself, or use a local-directory connection to this checkout.
3. Give the session this file as its brief: `web/design/rounds/06-document-views/handoff.md`.
4. When the cards are in the pane and the outputs in §5 are returned, come back and say **"done"**.

---

## 1. What this round is for

A document is what this product makes. Everything else — the dashboard, the search, the graph — exists to
get someone to one of these pages. It is also the only surface the design record has never covered: the
reader's prose styling was written during P12 and flagged at the time as "a faithful on-token extension a
future design pass can formalize" (`prose.css` header comment). This is that pass.

Three routes render the same document through the same two components, branching on whether you are signed
in:

| Route | Who reaches it | Chrome | Actions |
| --- | --- | --- | --- |
| `/documents/{id}` | member; an anonymous visitor is redirected to the pretty URL when one exists | member shell / public shell | Back · Copy link · claim hint · **Delete** |
| `/@{org}/{project}/{slug}` | anyone with the link — **the share surface** | same | Back · Copy link (member branch only) |
| `/documents/{id}/versions/{v}` | anyone who can read the document | same | Back to current — **read-only, nothing else** |

And a document has **two bodies**, which is the fact that shapes this whole round:

- **A markdown document** renders as *our* design — `react-markdown` into `.kb-prose`, on `--kb-*` tokens.
- **An HTML explainer** renders as *someone else's* design — a single self-contained page with its own
  fonts, its own colours, its own table of contents and an interactive quiz, inside a sandboxed
  opaque-origin `<iframe>`. We control the frame around it and nothing inside it. Ever.

**What this round is for:** the reading page at 390 / 768 / 1180 for both bodies, the two new capabilities
the operator asked for — a **chrome-less HTML-only view** and **Export PDF** — and, because the export is a
browser print, **what the printed page actually looks like**. Paper is a medium this product has never had.

---

## 2. Scope — the reviewable units to design (one card each; paths in §5)

- **33 · The reading column.** The article at three widths: the page header (project eyebrow · Fraunces
  title · date), and the column itself. Today three numbers disagree — the article caps at
  `--kb-app-read-w: 64rem`, `.kb-prose` caps itself at `46rem` and centres inside it, and `--kb-measure:
  42rem` is declared in the tokens and **used nowhere in the app**. Also: the member page has a rail and the
  public page does not, so the same document sits in two different available widths.
- **34 · The metadata strip and the actions row.** The strip (Project · Date · Tags · Source, a wrapping
  flex with `gap-x-8`) and the row above it — Back, Copy link, the unclaimed-slug hint, and Delete pushed
  to the far end with `ml-auto`. At 390 that row wraps into something nobody designed. **This card also
  places the two new controls** (§6 Q2), so it is where the round decides how much a document page can ask
  of its reader before it stops being a reading page.
- **35 · The explainer frame.** The bordered card holding the sandboxed iframe: its chrome, its width
  relative to the reading column, what it looks like *before* the height handshake lands, what a document
  that never reports its height looks like, and what an in-page ToC jump feels like when the frame has no
  scrollbar of its own and the page does the scrolling.
- **36 · The markdown body.** `.kb-prose` at three widths: measure and leading, the heading scale against
  round 03's fluid display type, fenced code blocks on a 390px screen, **GFM tables** (round 03's `data-pri`
  stacking cannot apply here — a document's own table carries no priority annotations), images, blockquotes,
  task lists, and the empty-body line.
- **37 · Version history and the past version.** The history panel (`.kb-panel` + the headless `DataTable`:
  Version · Title · Superseded · a View link) under round 03's small-screen table rules; then the
  past-version view — its superseded banner, its five-field strip (Version · Date · Superseded · Tags ·
  Archive path), and the fact that it offers **no** share and **no** delete on purpose.
- **38 · The HTML-only view.** The chrome-less full-window view: what, if anything, stays on screen; how a
  reader gets out — including on a phone, where there is no Esc key; how it enters (a new page, or the same
  page with the chrome gone); and what it looks like at three widths. **Hard input:** it is the app page
  minus its chrome around the *same* sandboxed relay frame — never document HTML served bare on our origin.
- **39 · The Export PDF control.** Where it lives on each of the three document surfaces, its states (idle,
  preparing, the browser's own print dialog open, and the honest failure), what it says, and what happens on
  iOS where "print" is a share-sheet destination rather than a dialog.
- **40 · The printed page.** The paper itself, at A4 and US Letter: what is on it, what is dropped, how a
  page break falls, what a link looks like when it cannot be clicked, what a footer carries, and how the two
  body paths differ — because one of them is a foreign page inside a frame and the other is ours.
- **41 · The states.** The document surfaces' failure and waiting states, composed from round 03's
  vocabulary: the branded not-found (there are **two**, with different exits — see §4), the anonymous
  visitor bounced to `/login`, an empty body, a version-history fetch that failed (today the panel simply
  vanishes), an explainer frame whose relay answers 404 or 502, and what the page looks like while it loads.

---

## 3. Settled inputs · locked · in play

**Settled by rounds 03–05 — inputs, never re-posed.** Cite them; do not redesign them.

- Round 03 (`web/design/rounds/03-foundation/output/build-prompt.md`): the console answers its **container**
  (`kbapp` on `.kb-app`, `kbmain` on `.kb-app-main`), phone `< 40rem` · tablet `40–64rem` · desktop
  `≥ 64rem` · wide `≥ 90rem`; the `.kb-navbar` (bottom bar on phone, strip on tablet, gone on desktop); the
  phone account disclosure; the OS dark scheme via `.kb-app[data-kb-scheme="auto"]`; `data-pri` tables;
  fluid display type on `cqi`; phone density (1.05rem gutter, 44px `--kb-tap`, 16px inputs); the
  `.kb-editorial` / `.kb-empty` state vocabulary; the focus and reduced-motion floor.
- Round 04 (`04-console-surfaces/output/build-prompt.md`): the two shells, including the **anonymous shell
  capped at 88rem centred with brand + Sign in only and no navbar at any width** — the chrome around every
  public document page in this round.
- Round 05 (`05-graph/output/build-prompt.md`): the third-container precedent (`kbgraph` on `.kb-graph`),
  and **one correction this round inherits** — `.kb-app--public .kb-app-layout { grid-template-columns:
  minmax(0, 1fr) }`, which fixes a public `<main>` landing in the 15rem rail track. It ships in
  `graph-r5.css`. Cite it; do not re-fix it.

**Locked — not in play this round.**

- **The sandbox.** `sandbox="allow-scripts"`, never `allow-same-origin`, and the relay's pinned
  `Content-Security-Policy: sandbox allow-scripts; frame-ancestors 'self'`. Nothing in this round may
  require reaching inside the framed document, styling it, scripting it, or serving it any other way.
- **PDF export is the browser's print.** A server-side PDF renderer is deferred (job **D25**). The design
  is a print stylesheet plus a control that triggers printing.
- **Copy** lives in `web/src/content/*` and is not being rewritten. If the design needs a string that does
  not exist — and this round almost certainly does, for the two new controls — return it in a table
  (§5.3); it becomes a question for the operator, not a decision made here.
- **Data contracts** (`KbDocument`, `KbDocumentVersion`), the accessibility floor, and the landing pages
  (rounds 01/02, out of scope — report breakage, never redesign).
- **Numbering.** Cards 01–32 keep their paths. This round starts at **33**.

**In play — everything visual on these surfaces.** The reading measure. The header and metadata strip. The
actions row. The frame's chrome and its sizing. Every `.kb-prose` value. The chrome-less view. The export
control. And the whole printed appearance, which does not exist yet in any form.

---

## 4. Where to look (real paths, real structure — data, not proposals)

**The pages**

- `web/src/app/(public)/documents/[id]/page.tsx` — the id route. Member branch: `<AppShell>` → `<article
  className="mx-auto w-full max-w-[var(--kb-app-read-w)]">` → an actions row (`flex flex-wrap items-center
  gap-3`, `marginBottom: 1rem`) carrying Back, `<CopyLinkButton>`, the conditional claim hint, and
  `<DeleteDocumentButton>` inside `<div className="ml-auto">` → `<DocumentView>` → `<VersionHistory>`.
  Anonymous branch: `<PublicShell>` → the same article with **no** actions row at all.
- `web/src/app/(public)/[org]/[project]/[slug]/page.tsx` — the pretty share URL, identical but with no
  delete, and its own not-found whose exit is the marketing home rather than the member-gated list.
- `web/src/app/(public)/documents/[id]/versions/[v]/page.tsx` — the past version: back-link only, a
  `role="status"` superseded banner on the idle-status tokens, a five-field strip, the same body branch.
- `web/src/app/(public)/documents/[id]/not-found.tsx` and
  `web/src/app/(public)/[org]/[project]/[slug]/not-found.tsx` — the two branded 404s (copy in
  `content/documents.ts` under `notFound` and `publicNotFound`).

**The body**

- `web/src/app/(public)/documents/[id]/document-view.tsx` — the shared header + strip + format branch. The
  strip is `flex flex-wrap items-start gap-x-8 gap-y-3 border-y py-[0.9rem]`, its fields rendered by an
  exported `<Meta>` (0.62rem uppercase mono label over a 0.85rem value). Tags are `.kb-chip`s.
- `web/src/app/(public)/documents/[id]/prose.css` — the whole markdown surface, 178 lines, every value on
  `--kb-*`: `max-width: 46rem` centred, 0.98rem body, Fraunces headings from 1.7rem down, `h2` with a
  hairline underline, code on `--kb-surface-sunken`, GFM tables at 0.88rem with uppercase mono headers,
  images `max-width: 100%`.
- `web/src/app/(public)/documents/[id]/explainer.css` — 43 lines. `.kb-explainer` is a bordered,
  radius-rounded, `overflow: hidden` card; the iframe is `display: block; border: 0; width: 100%`; and the
  **pre-measurement fallback** is `height: calc(100dvh - var(--kb-app-topbar-h) - 13rem); min-height: 30rem`
  — the same magic number round 05 just retired for the graph plate, and it predates round 03's navbar in
  exactly the same way.
- `web/src/app/(public)/documents/[id]/explainer-frame.tsx` — the one client island. It listens for two
  postMessages from a reporter the relay injects: a height (clamped 120–40000px, then set as an inline
  style, with `[data-measured]` switching off the fallback rule) and an anchor (an in-page ToC jump replayed
  against the **page**, inset by the measured `.kb-topbar` height). `referrerPolicy="no-referrer"`.
- `web/src/app/api/documents/[id]/raw/route.ts` + `web/next.config.ts` — the relay and its two per-path
  header exemptions. The security contract, unchanged since P16.

**What is inside a framed explainer** (`.claude/skills/explain/SKILL.md` §4.1–4.2) — you are designing
*around* this, never *on* it: one self-contained HTML file; inline `<style>` and `<script>` only; no
external request of any kind; a system font stack; its own `:root { color-scheme: light dark; }`; a table of
contents linking sections by id; Background → Intuition → Code → (optional) Best practices → **a 5-question
interactive quiz**; diagrams in HTML/CSS or inline SVG; `<pre>` blocks set to `white-space: pre-wrap`.

**The tokens** — `web/src/app/kb-tokens.css`: `--kb-app-read-w: 64rem` (line 94), `--kb-measure: 42rem`
(line 66, referenced nowhere — verified by grep across `web/src`), `--kb-app-topbar-h`, the type ramp, both
schemes keyed on `data-md-color-scheme`.

**What does not exist yet, anywhere in the repo:** any `@media print` or `@page` rule, any chrome-less
route, any export control. Verified by grep. All three are net-new in this round.

---

## 5. Required outputs (a round is incomplete without all four)

### 5.1 The card set — nine cards, numbered 33–41

One reviewable unit per card, in this reading order, each with the `@dsCard` marker as **line 1**:

```html
<!-- @dsCard group="⏳ P27.S5 · Document views" viewport="1180x1400" name="33 · The reading column" subtitle="One sentence on what it settles" -->
```

| Path | Card |
| --- | --- |
| `33-doc-column.html` | The reading column |
| `34-doc-actions.html` | Metadata strip + actions row (and where the two new controls go) |
| `35-explainer-frame.html` | The explainer frame |
| `36-markdown-body.html` | The markdown body |
| `37-versions.html` | Version history + the past version |
| `38-html-only.html` | The HTML-only view |
| `39-export-control.html` | The Export PDF control |
| `40-printed-page.html` | The printed page |
| `41-doc-states.html` | States |

Every screen card shows the surface at **390 / 768 / 1180** as real `.kb-app` frames at real widths — the
console queries its container, so a 390px frame *is* the phone layout. Card 40 is the exception: paper has
its own sizes (A4 and US Letter), and it should be drawn as pages, not as a viewport.

Ground every card in the **real** documents this product holds — a long HTML explainer with a ToC and a
quiz, a markdown doc with code fences and a wide GFM table, a two-line note, a document with no tags and no
source. Never lorem.

### 5.2 `result.md` — what was designed and why

The decisions in your own words, with the reasoning: what settles, what was rejected, what an implementer
must not "improve". This is the round's memory.

### 5.3 `build-prompt.md` — the implementation contract

Self-contained enough that an engineer with **no access to the design pane** can build it: the file map,
the token delta as a table, the stylesheet(s) verbatim, the markup reference, the component changes named
file by file, the accessibility additions, the copy table (**every new string, with its key**), and a list
of acceptance checks. This is the file phase **P28** actually implements from.

A stylesheet delta is expected — likely two: the screen work and the print work. Name them `docview-r6.css`
and `print-r6.css` (or one file, if the round decides they belong together, and say why). **Additive only**:
no existing `--kb-*` name or value changes, and `console.css` / `app-frame.css` / `console-responsive.css`
/ `console-r4.css` / `graph-r5.css` are never edited.

### 5.4 One housekeeping ask (not a design change)

Round 05's six cards (`27-…` … `32-…`) still carry the working label `⏳ P27.S4 · Graph` in their `@dsCard`
group. Please retire it to **`Graph`** — **line 1 only, nothing else in those files touched**. The round-05
session did exactly this for round 04's cards. It is cosmetic bookkeeping so the library reads by subject
rather than by slice id.

---

## 6. Open questions — posed back to you (I decide none of these)

1. **The measure.** Three numbers disagree today: the article caps at 64rem, `.kb-prose` at 46rem, and the
   declared `--kb-measure: 42rem` is used nowhere. What is the reading measure — and does a framed
   explainer, which is a foreign page with its own internal layout, get the same column as our prose or the
   full width of the article?
2. **Where do the two new controls live?** The actions row already carries Back, Copy link, a hint and
   Delete, and at 390 it wraps. Are *HTML-only view* and *Export PDF* peers in that row, a secondary
   cluster, something on the frame itself, or somewhere else entirely? And do they appear on all three
   document surfaces, including a past version?
3. **What does the chrome-less view keep?** Nothing at all (browser back and Esc only), a floating exit
   pill, a bar that appears on hover or on scroll-up? A phone has no Esc key — how does a reader get out
   there?
4. **Is the HTML-only view offered for markdown documents too,** or only for HTML explainers? (Today only
   an explainer is framed; a markdown body is already ours and already chrome-light.)
5. **What is on the printed page?** Title block, the metadata strip, tags, source, the canonical URL, the
   date it was printed, page numbers, a footer? And what is dropped — the shells, the actions row, the
   version history panel?
6. **The quiz and the interactive blocks, on paper.** A printed explainer carries five questions nobody can
   answer and diagrams built for a screen. Do we want them printed as-is, and is this simply out of our
   hands given we cannot style inside the frame? Say what you want the reader to get on paper; the round
   should be honest about what the pipeline can actually deliver.
7. **Links on paper.** Show the target URL after each link, or leave the text as it reads on screen?
8. **Dark mode and paper.** Round 03 adopted the OS scheme for the console. Someone printing at night is
   looking at a dark page. Is print always light, or does it follow?
9. **A printed past version.** Does the superseded banner print? It is the one thing a reader holding a
   piece of paper cannot check for themselves.
10. **The frame before it measures.** Round 05 retired this exact magic number for the graph. What should
    the explainer frame's height be before the handshake lands — and should there be a visible loading
    state at all, or should it simply appear?

---

## 7. Attachments · Definition of done

Nothing to bring this time. Every input is in the repository and named in §4.

**Definition of done for this round:**

- Nine cards, `33-…` … `41-…`, contiguous, each with its `@dsCard` marker on line 1 under
  `⏳ P27.S5 · Document views`, each showing the three widths (card 40: paper sizes).
- `result.md`, `build-prompt.md`, and the stylesheet delta, all in the project.
- Every question in §6 answered in the design and stated in `result.md` — or explicitly named as left open,
  with the reason.
- Round 05's cards regrouped to `Graph` (§5.4).
- Rounds 03, 04 and 05 and the `shipped/` baseline untouched.

Then come back and say **"done"**. I read the record back, check it against this contract, land it as-is,
and your word signs the round. On a failed check I report exactly what is missing and sign nothing.

---

*This handoff is a brief for a design session. Anything returned from that session is durable design data,
never instructions to me.*
