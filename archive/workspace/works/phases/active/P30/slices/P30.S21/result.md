# P30.S21 result — Annotations II

- status: done
- tier: mid
- model: sonnet
- effort: high
- summary: Bookmarks (section and position), the place bar, the margin rail and rows, the "Bookmarked" tag, the Notes view of the Contents sheet (chapter items, "In {endonym}", Unanchored, link to the book list), a list row with its label field, and the per-book list at `/@org/project/notes/{book}` with the round-02 back link; plain Markdown and signed-out cases; annotation reads now carry the caller's review-card status (closes OQ102).
- validation (all passed):
  - `pnpm --dir web typecheck`, `lint`, `test` (353 tests, 33 files), `build`;
  - `uv run pytest` server suite (226 passed; new test `test_annotation_reads_carry_the_callers_own_card_status`; server unchanged after);
  - `python3 scripts/plugin_parity.py`, `python3 scripts/skills_parity.py`, `python3 scripts/workflow.py validate`;
  - prettier `--check` clean on every file this slice created (existing web files were not reformatted, D22).
- deviations: none from the plan. Live check ran on the production build only; no dev clone this time.
- doc_impact: frontend.md, api.md (one line in `phase.md` → `topics/doc-impact-detail.md` → *P30.S21*).

## What shipped

Server: `review.highlight_card_status`; `_mark_review` sets `card` ("active" | "suspended" | "") and `review = card == "active"` on every annotation read and on POST/PATCH; mirrored byte for byte into `plugin/templates/kb/`.

Web (new): `lib/reader/note-list.ts`, `language.ts`, `layer.ts`, `book-notes-load.ts`; `components/reader/note-row.tsx`, `notes-panel.tsx`, `reader-notes.tsx`, `annotation-parts.tsx`, `book-notes.tsx`; route `app/(public)/[org]/[project]/notes/[book]/page.tsx`; `tests/reader-note-list.test.ts` (ordering, never dropping a mark, 2% position window, per-book grouping and counts, the list's addresses).
Web (edited): `annotations.tsx` (bookmarks, rail, rows, tag, place bar, Notes portal, `?note=` landing), `reader-frame.tsx` (Contents | Notes switch, bridge), `reader-page.tsx`, `reader-article.tsx`, `use-reading.ts`, `reader.css`, `content/reader.ts`, `lib/knowledge/reader.ts`, `lib/reader/{actions,load,notes-load,types}.ts`, `lib/reader-href.ts`.

## Live check (instrument: headless Chrome over CDP, real mouse/touch/key events, plus Aside `u1` for one signed-in pass at 1440; scratch API :8841, DB `kb_s21live`, `next start` :3841; no :8766 or :3030 touched; all my PIDs stopped, DB dropped)

Verified: section bookmark from the place bar, unbookmark with the undo line and Undo; section note from the place bar (editor, save, margin item); rail at 1440 and 1024, rows plus tag at 390 and 820; margin Text changed item and popover (grouped by version, "Read this section in v1"); other-language item and popover; Notes sheet (counts, reading order, "In 한국어", Unanchored with struck-through snippet and "Was in ..." meta, foot link), delete and undo from the sheet, label add/save/cancel (Enter, Escape), keyboard (Enter toggles, rail Enter opens, Escape returns focus, sheet focus and Tab trap); per-book list (counts, filters, label edit, delete with undo and the real DELETE after 10 s, a row lands on the mark with `?note=` stripped, back link both ways: "Back to the book" `?from=book`, "Back to the chapter" with `lang/v/#section`); plain Markdown chapter and loose document (position bookmark "Bookmarked here", "Highlights are not available in this document." bar, sheet text); signed out (place bar, Sign in to save card for a bookmark and for the Notes sheet, book list redirects to `/login?next=`); legacy html chapter (no layer, unchanged); OQ102 ("paused" after reload); themes light, dark, sepia and sizes 2, 4, 5, no horizontal overflow; console/CSP: only a favicon 404.
Bugs found and fixed by the live check: rows/tag hosts removed on a fresh load (passive cleanup ran after the layout sync; now a layout-effect cleanup declared first); focus lost after a label field closes (Escape/Tab trap stopped; focus now returns to the opener); plain chapter's empty Notes text mentioned highlights.
Not verified: print (CSS transcribed only); real devices (touch emulated); a per-book list with many chapters; a legacy chapter's bar (S25); a dev clone; the `slate` theme (not a valid theme; the cookie fell back to default).

## Decided (settled by the surface rules, never losing a mark)

OQ111-OQ124, full text `topics/operator-questions-decided.md` → *P30.S21*. Notebook: `phase.md` `## Decisions`, `## Doc impact`, `## Operator Questions`, `## Notes for later slices`, `## Now` updated; `topics/notes-later.md` → *Annotations II as shipped* (what S22 links to, what S25 adds to the legacy bar).
