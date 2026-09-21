# P28.S8 — result

- **status:** done
- **summary:** Round 06's print half landed — `kb-print.css` byte-identical to the record and imported after `kb-docview.css`, §4.5's masthead/colophon as a server component on all three surfaces, §5's `<ExportPdfButton>` in the actions row, the paper caveat note, and §7's four `print.*` strings. Checks 14–20 and 24 were answered on **real paper** (headless Chromium printed to A4 and US Letter, text-extracted, rasterised and read) rather than off the stylesheet; check 19's engine is recorded — **Blink prints a content-sized iframe in full**. One record defect had to be corrected to make the print-only blocks print at all, and it is flagged for the operator.
- **files_changed:**
  - `web/src/app/kb-print.css` (new — round 06 §3.2, byte-identical to `web/design/rounds/06-document-views/output/print-r6.css`)
  - `web/src/app/globals.css` (the `@import`, after `kb-docview.css`, before `kb-record-fixes.css`)
  - `web/src/app/(public)/documents/[id]/print-blocks.tsx` (new — §4.5 masthead + colophon, server)
  - `web/src/app/(public)/documents/[id]/export-pdf-button.tsx` (new — §5 client island)
  - `web/src/app/(public)/documents/[id]/explainer-frame.tsx` (§4.3's second note)
  - `web/src/app/(public)/documents/[id]/page.tsx`, `web/src/app/(public)/[org]/[project]/[slug]/page.tsx`, `web/src/app/(public)/documents/[id]/versions/[v]/page.tsx` (mounts)
  - `web/src/content/documents.ts` (§7's four `print.*` strings)
  - `web/src/app/kb-record-fixes.css` (**one four-line correction — see "The record defect"**)
  - `works/phases/active/P28/phase.md`, this file
- **validation:**
  - `pnpm --dir web typecheck` — pass
  - `pnpm --dir web lint` — pass
  - `pnpm --dir web test` — pass (17 files, 113 tests; no test added, per the plan)
  - `pnpm --dir web build` — pass
  - `python3 scripts/workflow.py validate` — pass (pre-existing warnings only)
  - Round 06 §8 checks **14–20 and 24** — see the per-check table below (paper vs CSS vs unverified)
  - Dev runtime `http://127.0.0.1:3030` **and** the production standalone build (`node .next/standalone/server.js`, port 3040) — both
- **deviations:** three, all recorded below — (1) the §3.2 cascade correction in `kb-record-fixes.css` (authorisation not yet given); (2) §4.3's two note class-lists shipped **swapped** relative to the markup block, because the record's own print rules, §11 of the round result and check 19 all read the other way; (3) `print.archivedColophon` takes `(date, current)`, not §7's `(current)`, because §7's own string interpolates `{date}`.
- **doc_impact:** two lines appended to `phase.md` (frontend.md for the print layer; product.md + experience.md for PDF export as a capability, D25 still deferred).

---

## What landed

**`kb-print.css`** — round 06 §3.2, copied byte-for-byte. Proven, not assumed: the shipped file is
**byte-identical** to the round's own `print-r6.css` (13,123 bytes, `a == b`). It is imported from
`globals.css` immediately after `kb-docview.css` and before `kb-record-fixes.css`, so the chain is now
`kb-tokens → kb-console → kb-console-responsive → kb-console-r4 → graph-tokens → graph → graph-r5 →
kb-docview → kb-print → kb-record-fixes`.

**`print-blocks.tsx`** (server) — §4.5's `<PrintMasthead>` and `<PrintColophon>`, mounted per §4.1's
order: the masthead right after `.kb-docbar` (above the superseded stamp), the colophon after the version
panel. On the past-version page they bracket `PastVersion`, and the colophon takes `currentVersion`, which
is what selects §7's archived line. The URL is `canonical_path ?? the id URL`, prefixed with the
deployment origin and **without its scheme** (§4.5's own specimen reads `knowledge.hi2vi.com/@…`).

**The date is the reader's, and that is measured.** Both blocks render the server's ISO date and mark the
date itself `data-kb-print-date`; the export island overwrites those nodes on mount. Proved with a
timezone override rather than by reading the code: with the browser in `Pacific/Midway` (where it was
still 20 Sep) the sheet read **`Printed 2026-09-20`** in both blocks while the server had rendered
`2026-09-21`. No hydration warning — the write is a post-hydration DOM write to nodes React does not
re-render.

**`export-pdf-button.tsx`** (client) — §5 exactly: `aria-busy` + `Preparing…`, one `requestAnimationFrame`,
`window.print()` in a `try`, the iOS hint chosen by `maxTouchPoints > 1 && /Mac|iP/.test(platform)`,
cleared on `afterprint`, `.kb-docexport__error` when `print()` throws **or** `beforeprint` has not fired
within 1500 ms, and the unmeasured-explainer warning before the dialog with a required second click.

**Where its message line renders, and why it is not free.** The button is inside `.kb-docbar__actions`,
which is a flex row above 40 rem and a `grid-auto-flow: column` of equal cells below it — a `<p>` dropped
in there becomes a fourth button-shaped cell. The line is therefore portalled to the enclosing
`.kb-docbar` and wears `.kb-docbar__hint` (the record's own "a sentence, always its own line" slot), plus
`.kb-docexport__error` for the two failure sentences. **That placement is also what keeps it off paper:**
`kb-print.css` drops the whole `.kb-docbar`, while a line rendered among the article's blocks would have
printed the dialog hint onto the very sheet it describes. §3.1 ships no class and no placement for the
hint line — reported as a §3.1 gap, nothing invented beyond reusing the record's two existing classes.

**The four `print.*` strings** were adopted verbatim (D30's default). Only the `archivedColophon`
signature departs from §7's key, and only because §7's own string needs the date.

---

## The record defect: the print-only blocks could never print

**Measured before it was explained.** With print media emulated on the real page, `.kb-printhead` and
`.kb-printfoot` both computed `display: none`. The cause is inside the signed sheet: `@media print`
declares `.kb-printonly { display: block }` and `.kb-printhead { display: flex }` near the top, and the
file's **last** line — outside the media query — declares
`.kb-printonly, .kb-printhead, .kb-printfoot { display: none }` to keep the blocks off the screen. A media
query adds no specificity, so the later rule wins **in print too**, and §4.5's two blocks, §3.2's own long
comment about them and acceptance checks 14 and 18 are all defeated.

**What I did:** four lines in `web/src/app/kb-record-fixes.css`, inside `@media print`, re-stating the
record's own two declarations (`.kb-printonly { display: block }`, `.kb-printhead { display: flex }`).
**Nothing is originated** — same selectors, same values, no visual decision — and screen is untouched.
**Authorisation was not given**, which is why it is the loudest item in this result, is on
`## Operator Questions`, and belongs in the gate walkthrough: deleting those four lines is the whole
revert, and the consequence of reverting is a printed sheet with no provenance at all, which §3.2 itself
calls this product's most dangerous artefact.

Verified in **both** runtimes, because the production minifier could have folded a duplicate `@media print`
block back into the record's own one: it does not — the built chunk keeps two print blocks with this one
last, and both blocks compute `flex` / `block` under print media in dev and in the production build.

**A trap that cost me an hour and is worth the next slice's attention:** an old `next start`/standalone
server left on the port serves the PREVIOUS build's HTML (it referenced a CSS chunk the new build no
longer had, which 500'd), so "production fails" was measured against a stale server. Kill by port
(`lsof -ti tcp:PORT | xargs kill`), not by process-name pattern, and confirm the served CSS chunk exists.

---

## Per check: what is verified on PAPER, what as CSS, what not at all

Paper means a real PDF out of the browser's print pipeline — headless Chromium (**Chrome 153.0.8010.52**,
macOS) driven over CDP `Page.printToPDF` at **A4 (8.27×11.69in)** and **US Letter (8.5×11in)**, then
text-extracted with `pdftotext` and rasterised with PDFKit and looked at. `window.print()` was never
called in an automated browser; the control's own behaviour was driven with a stubbed `print` (below).

| Check | Verdict | Evidence |
|---|---|---|
| **14** carries masthead, title, one-line metadata, body, colophon; no chrome | **PAPER ✓** | Anonymous `/@p28s5/research/round-06-measure-probe` and **member** `/documents/64` and `/documents/67` (which has history): the sheet carries exactly the five blocks, and the topbar, navbar, rail, actions row, claim-hint slot, version panel and exit pill are absent from the extracted text and from the rendered page. Member and anonymous sheets are **pixel-identical** (same PNG hash). Needed the correction above. |
| **15** dark OS prints the same sheet | **PAPER ✓, with one latent CSS gap** | Real OS flip (`osascript` → dark, **restored** to light afterwards): the member page printed **pixel-identical** to the light print (same SHA of the rasterised page) — Chromium forces a light colour-scheme for the print pipeline. Under CDP-**emulated** `prefers-color-scheme: dark` one deviation appears: the tag chips print teal `#0a544e` instead of `#4a433a`, because round 03's `.kb-app[data-kb-scheme="auto"] .kb-chip` (0,3,0) out-specifies §3.2's `.kb-docmeta .kb-chip` (0,2,0). Latent, not fixed, reported. Ground `#ffffff` and ink `#1b1714` confirmed in print under both schemes. |
| **16** links print their target; `#`-anchors do not | **PAPER ✓** | In the A4 PDF: `A relative link (http://127.0.0.1:3030/@p28s5/notes/something.md) that must be absolutized`; the bare autolink prints once with no repeat; the in-page anchor prints nothing. Cross-checked against computed `::after` `content` under print media. |
| **17** a table across a break repeats its header; no row splits; no heading ends a page | **PAPER ✓** | Throwaway DOM probe grew fixture 64's table to **60 rows** (3 A4 pages): the header row is redrawn on pages 1, 2 and 3, rows run 18 → 19 unbroken across the break (rasterised and read). Separately, an 8-step spacer sweep (700→840 px) moved a heading to the next page **together with its paragraph** every time — `break-after: avoid` fires. |
| **18** a past version prints its stamp above the title, unsplit, version in masthead and colophon | **PAPER ✓** | `/documents/67/versions/1`: boxed stamp above the title on one page, `V1` in the masthead, `v1` in the colophon, and the archived line — "Printed 2026-09-21. This is an archived body. The current version is v3." |
| **19** a measured explainer prints its whole framed document plus the caveat — **record the engine** | **PAPER ✓ — engine: Blink/Chromium prints it in FULL** | Fixture 66 (`round-06-long-explainer`, measured **10,617 px** in this layout) printed **13 A4 pages** and 13 Letter pages carrying all 21 framed sections, ending with the caveat line and the colophon. The screen-only note does not print; the caveat prints exactly once. **WebKit and Gecko untested here** (no Firefox on this machine; Safari cannot be driven to PDF without the modal the plan forbids) — if Gecko clips, the caveat and the full-width fallback are the documented behaviour. |
| **20** one `@page` with `size: auto`; nothing sized in vh/dvh | **CSS ✓ and PAPER ✓** | `grep "@page" kb-print.css` → exactly **one rule** (`@page { size: auto; margin: 16mm 15mm 18mm }`; the two other matches are prose in comments), and no `@page` anywhere else in `web/src`. Zero `vh`/`dvh`/`vw` in the file and in a runtime scan of every rule inside the print block. On paper: page box **595.92 × 841.92 pt** (A4), text from **x 42.75 pt** (15.08 mm) to **553.95 pt** (14.8 mm from the right), first ink at **y 46.55 pt** (~16 mm), last at 781.65 (21 mm from the foot) — the record's margins reach paper. With the browser's own header/footer on, the header occupies y 16.5–24.5 pt and never touches the masthead at 46.5 pt, which is §3.2's stated reason for the 16 mm top; page numbers come from that footer, as designed. |
| **24** blocked print → error line; unmeasured explainer → warning then a second click | **SCREEN ✓ (real browser, dev and production)** | Aside (`aside repl --account u1`) on `/documents/64`, `window.print` **stubbed** — never a real dialog. (a) stub throws → `.kb-docexport__error` with the ⌘P copy, busy cleared. (b) stub silently does nothing → hint + busy at 300 ms, error at 1800 ms (the 1500 ms `beforeprint` window). (c) stub fires `beforeprint`/`afterprint` → `Preparing…` + `aria-busy=true` + spinner + the desktop hint in an `aria-live="polite"` `role="status"` line, all cleared on `afterprint`, `print()` called **once**. (d) with `[data-unmeasured]` forced on `.kb-explainer`: first click shows `exportUnmeasured` and calls `print()` **zero** times; the second click prints. Re-run against the production build with the same results. |

**Not verified at all, and nobody should read this result as covering it:** a physical printer (every
"paper" claim above is a PDF out of the browser's print pipeline, which is what "PDF export" means here);
**Safari on macOS/iOS and Firefox**, so check 19's engine note and check 15's dark-mode result are
Chromium's; and the real deployment origin — locally `SITE.url` falls back to `http://127.0.0.1:3030`, so
the masthead prints `127.0.0.1:3030/@…` where production (with `NEXT_PUBLIC_APP_URL` baked in) will print
`knowledge.hi2vi.com/@…`.

---

## Findings reported, not fixed

1. **§4.3's two note class-lists are swapped, and shipping them as written would make the caveat
   unreachable.** §4.3 puts `--screen` on the *print caveat*; §3.2 re-shows every `.kb-explainer__note` in
   print and then hides `--screen`, so a caveat wearing that modifier is hidden on screen **and** on paper
   — dead markup, and check 19's "plus the caveat line" could never pass. The round result §11 ("prints
   one caveat line under it") settles the intent. Shipped the other way round: the unmeasured note keeps
   the base class **plus `--screen`** (screen-only, still revealed by `[data-unmeasured] +
   .kb-explainer__note`, verified), and the caveat is the plain `.kb-explainer__note` (hidden on screen,
   printed). Both states verified live.
2. **The phone actions row is now four cells, and Delete did not move to its own row.** At 390×844 the row
   measures Copy link 93 px · Export PDF 81 · Full width 80 · Delete 80, all ≥44 px tall, no label clipped
   and no horizontal overflow — so the fourth cell is **not** too tight. But §3.1's phone block gives
   `.kb-docbar__danger` `flex: 1 0 100%` inside a parent that the same block turns into
   `display: grid; grid-auto-flow: column` — flex properties are inert in a grid, so Delete is simply the
   fourth column with a hairline over its own cell, not "below a full-width rule". Pre-existing (it would
   have been the third cell before this slice), made more consequential by the fourth control: the
   destructive button is one thumb-width from Full width. Fixing it means `grid-column: 1 / -1` in a
   verbatim record sheet — **reported, not restyled**.
3. **§3.2's "the output is IDENTICAL from the normal page and from the full-width view" is not true as
   built.** Printing `?view=full` drops the **title block and the metadata strip** as well (§3.1 hides them
   in that view at a specificity print does not undo) and indents the prose differently. Provenance
   survives — the masthead and colophon carry title, URL, version and date. It is only reachable with ⌘P,
   because the export control lives in the `.kb-docbar` that the full-width view hides. Reported.
4. **Tag chips print teal from a dark OS in an engine that keeps `prefers-color-scheme: dark` during
   print** (check 15 above). One line would fix it in the corrections sheet; not taken.

## Probes and instruments (all throwaway)

`aside repl --account u1` for every screen-side interaction (the manifest's instrument and agent account).
Paper needed something Aside cannot do — it has no `emulateMedia` — so a ~70-line CDP driver over Node 24's
global `WebSocket` drove headless Chrome for `Emulation.setEmulatedMedia`, `setDeviceMetricsOverride`,
`setTimezoneOverride` and `Page.printToPDF`; `pdftotext` (poppler) and a 25-line PDFKit rasteriser turned
the PDFs into text and images. The scripts live under `/tmp/p28s8` and in this session's scratchpad; they
touch no repo file. Two DOM probes (the 60-row table, the forced `[data-unmeasured]`) were page-local and
left no trace — no product file was edited for a probe, so there was nothing to byte-diff back.
