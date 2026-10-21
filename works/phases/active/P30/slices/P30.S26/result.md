- status: done
- tier: mid
- model: sonnet (Claude Sonnet 5.5)
- effort: high
- summary: Built print from the signed `09-legacy-and-print` round 01. The native reader's sheet extends `kb-print.css` (masthead, colophon, figure rows, diagrams, ASCII art fitted to the column, tables, sources, the quiz on paper with its answer key, every link's address, page breaks). ⌘P on a legacy page prints one notice sheet. No server change.
- validation (all pass): `pnpm --dir web typecheck`, `lint`, `test` (380), `build`; `python3 scripts/plugin_parity.py`; `python3 scripts/skills_parity.py`; `python3 scripts/workflow.py validate`. Live check below.
- deviations: `print-blocks.tsx` and `export-pdf-button.tsx` are NOT deleted: the past-version page `/documents/{id}/versions/{v}` still uses them (the plan says keep what is used elsewhere). I tried redirecting that page to the reader and deleting them; the build then showed a CSP console error on every reader page (a nonce-less `<script async>` Next emits for a client chunk that stopped being shared), so I reverted it. That page keeps the older P28 print rules (part 4 of `kb-print.css`). OQ178.
- doc_impact: `frontend.md` (P30.S26 line in `phase.md`).

## What was built

- `web/src/app/kb-print.css`, rebuilt in four parts: (1) page box, palette, console chrome (unchanged in effect; the old explainer print rules are gone); (2) the reader's sheet, every rule under `html .rd-root` so no theme, text size or system dark scheme reaches paper; (3) the legacy ⌘P notice; (4) the older document page's P28 rules, unchanged. `kb-record-fixes.css` untouched.
- New: `components/reader/print-sheet.tsx` (masthead, colophon, notice, `PrintAddr` with `<wbr>`), `print-quiz.tsx` (quiz on paper, answer key), `print-client.tsx` (`PrintedOn`, `PrintPrep`), `lib/reader/print.ts`; strings in `READER.print`.
- Edited: `lib/native/render.tsx` (link address spans, paper quiz and key, source URL twin, art `--fg-cols`), `scroll-box.tsx` (`ArtBox` `cols`), `reader-article.tsx`, `legacy-reader.tsx`, `content/reader.ts`.
- The legacy Print control (`Print · new tab`, an `<a href=frame.src target=_blank rel=noopener>`) is S25's; confirmed on the live page, and the relay answers 200 `text/html`.

## Live check

Instrument: headless Chrome (a throwaway profile) over CDP, `Page.printToPDF` with backgrounds off (as a print dialog defaults), pages rendered to PNG with `pdftoppm`; production build (`next start` :3901, `NEXT_PUBLIC_APP_URL` set at build so addresses read `knowledge.hi2vi.com`), scratch API :8901 with a scratch database (dropped), the fixture book plus a stress document. Servers stopped by their own PIDs; :8766 and :3030 untouched. Aside was not used: print needs the PDF path, and the screen checks (below) ran over the same CDP driver. The print boards (`.dc.html`) cannot be rendered here (the canvas runtime `support.js` is not in the folder), so I compared against `paper.css` and `paper.js` (the markup, sizes and strings the boards are drawn from), not against board screenshots.

- A4, 8 pages: `all-blocks` (masthead, h2/h3, list, table, quote, six callouts with the collapsed one open, code with title bar, drawing, images, wide figure with credit, two rows of figures, every diagram kind, svg, citations, the four-item quiz, sources, the answer key, colophon). Letter: 9 pages. v1 (older version tag and "current version is v2, at ..." line), the KO chapter (Korean quiz, key, language "한국어 · v1" in the colophon), a legacy explainer (one notice sheet, A4 and Letter), a loose document.
- Stress document (7 pages): a 118-column drawing set to fit with no wrap, a long code line wrapping with the hanging indent, a collapsed callout, three cards, a 45-row table (header repeated on every page, rows whole), a long link broken at its slashes, 20 quiz items and their key.
- Dark theme with the largest text size, and sepia with the smallest: both print identically to light (page counts equal).
- Screen unchanged: all 7 `.pp-only` elements `display: none`; no horizontal overflow at 1280; the quiz still grades; `beforeprint` writes the date and opens/refolds a collapsed callout; the legacy page and its Print link intact.
- Console and CSP: clean on the final build (the earlier CSP error was the redirect experiment above).
- Not verified: Safari and Firefox print engines, a printer's own margins, real iOS.
- Observation: Chrome draws a faint 1px line at a page's foot when a rounded callout moves whole to the next page (US Letter); gone with `border-radius: 0`; left as drawn.

## Notes

- `phase.md`: `## Now`, `## Decisions` (S26 added to the client-side line), `## Operator Questions` (OQ172-OQ182, one line), `## Doc impact`, `## Notes for later slices` (S26 line; S12/S16/S25 notes retagged for REVIEW). Full text: `topics/operator-questions-decided.md`, `topics/doc-impact-detail.md` → *P30.S26*, `topics/notes-later.md` → *Print as shipped*, `topics/decisions-archive.md`. `phase.md` is 38.8 KB.
- D22 held: `prettier --write` ran only on the four files I created.
- Throwaway scratch (in the session scratchpad): `s26/` (drivers, PNGs, the stress source, a copy of the HEAD tree `wt/` that I could not delete).
