# P30.S22 result: the library and `/@{org}` (`06-library`)

## Verdict

- status: done
- tier: mid
- model: sonnet
- effort: high
- summary: Built the signed `06-library` round 01 (§1–§9) with round 02's control edges: `/library` (page head, Continue reading, shelves by project and by subject, book cards, loose rows, grouping, Your reading data and Clear all, and the loading, failed and empty states), the public `/@{org}` (signed out, member, stranger, nothing public, constant 404), the shell's Reading group with the Review count, and the `/library` landing after sign-in. One new server read, `GET /app/orgs/{org}/library`.
- files_changed:
  - server: `server/books_api.py`, `server/db.py`, `server/reader_api.py`, `tests/test_books.py`, and their byte copies under `plugin/templates/kb/`
  - web shell: `web/src/components/app-shell/{app-frame,app-shell,navbar-nav,rail-nav}.tsx`, `web/src/components/public-shell.tsx`, `web/src/content/{app,index}.ts`, `web/src/app/globals.css`
  - web library (new): `web/src/app/library.css`, `web/src/app/(app)/library/*`, `web/src/app/(public)/[org]/(library)/*`, `web/src/components/library/*`, `web/src/lib/library/*`, `web/src/content/library.ts`, `web/tests/library-model.test.ts`
  - web other: `web/src/lib/next-path.ts`, `web/src/lib/reader-href.ts` (comment), `web/src/lib/knowledge/{app,reader,types}.ts`, `web/tests/{next-path,login-next,session-guards}.test.ts`
  - notebook: `works/phases/active/P30/phase.md` and its `topics/{notes-later,doc-impact-detail,operator-questions-decided}.md`, this file
- validation (all passed):
  - `pnpm --dir web typecheck`, `lint`, `test` (34 files, 363 tests), `build`
  - `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55432/kb .venv/bin/python -m pytest -q` (228 passed; two new tests: the org library's visibility, and its one-404 misses)
  - `python3 scripts/plugin_parity.py`, `python3 scripts/skills_parity.py`, `python3 scripts/workflow.py validate`
- deviations: none from the plan's scope. Decisions the plan left open are OQ125–OQ135 in `topics/operator-questions-decided.md`.
- doc_impact: one line appended to `phase.md` (frontend.md, api.md, backend.md); the full lines are in `topics/doc-impact-detail.md` → *P30.S22*.

## What was built

- **Server (the plan allowed one if composing was not enough):**
  - `GET /app/orgs/{org}/library?scope=all|public` (`books_api.py`): optional identity through `_resolve_org`; a member of the org reads every project, anyone else the public ones, and `scope=public` gives a member the public view. It returns the org, `member`, the project list, books with chapters and variants, and loose documents (`db.list_loose_documents`: not a chapter variant, superseded `(project, slug)` duplicates dropped, lean rows). An unknown org, or an org that shows a stranger nothing, is one identical 404.
  - `GET /app/reader/library` books carry `updated` (finished chapters on an older version), for the card's "Updated" tag.
  - Tests: a stranger sees only the public project's book and document (and the member sees both, `scope=public` narrows, a cross-org member is a stranger); the two kinds of miss are the same 404.
- **Shell:** the Reading group (Library, Review) and the Org group in the rail (two `kb-rail__sec` blocks) and in the strip and bar (the strip's separator before Dashboard, the bar wraps instead of scrolling), the Review count pill (always laid out, hidden at 0, "99+", accessible name "Review, N due"), the wordmark to `/library`, the 44 px targets, `kb-secondary` on the user line and the rail eyebrow, `kb-accent-strong` on the current rail item, the account summary as a 44 px target around the avatar. The public shell's "Sign in" returns to `/@{org}`.
- **Round 02 (C11):** `--lib-control-edge` (kb-hint) on the grouping control and every secondary button; `--lib-ghost-edge` (kb-secondary) on the shell's ghost buttons only where the shell frames a library page (`.kb-app:has([data-lib])`), the round's Q1 (a).
- **Library page:** the structure, strings and CSS values are the prompt's and the canvas's (`library.css` transcribed; `rd-tag` repeated rather than importing `reader.css`). The grouping is `?by=subject`, remembered in `kb_reader`'s `libraryGroup`, replaces the URL and folds every "Show all". Continue reading is composed in the BFF (`lib/library/continue.ts`): started items resume with the heading text of the saved place, a finished chapter offers the next unfinished one, finished loose documents and fully finished books drop out, one per book, a shared slug adds the project.
- **Clear all:** a server action over `DELETE /app/reader/state?scope=all`; the five phases with the focus rules (Cancel on open, back to the button on Cancel and Escape, the status line after clearing, focus stays on the pressed button while clearing), the page re-reads on success.
- **Landing:** `DEFAULT_NEXT_PATH` is `/library`; `LIBRARY_HREF` follows; a safe `next` still wins (tests updated and one added).

## Live check

- **Runtime:** a scratch API on `:8851` (database `kb_s22live` in `kb-p28s2-pg`, scratch `KB_ROOT`), a pass-through proxy on `:8852` that fails or slows the library listing and the clear on a flag file, and `next start` on `:3851` from the production build. The fixture book plus extra loose documents (a shelf of 8, subjects, a Korean title, a second book with the same slug in another project), two accounts, org slugs `s22org` and `s22other`. Never `:8766` or `:3030`; every PID I started was stopped and the database dropped.
- **Instruments:** headless Chrome over CDP with a throwaway profile (real mouse and key events, `Emulation.setDeviceMetricsOverride` for true 390, 820, 1024 and 1440 viewports, `prefers-color-scheme` dark; console and CSP captured there, since Aside records none) and Aside `u1` (`aside repl --account u1`) for one signed-in pass at 1440 (signing in landed on `/library`; lead, two cards and the Review pill read as expected).
- **Checked:**
  - `/library` at four widths in light and dark: no horizontal scroll, every nav target at least 44 px (the phone bar 78×58, five columns; the strip with its separator; the rail from 1024), only the in-sentence dashboard link under 44 px (inline, as drawn); screenshots read against the canvas.
  - By project and by subject, the URL and cookie memory (the URL wins), Show all and Show fewer (same width), the Korean lead ("Left off at 동작 방식 · 62% · 한국어", `lang="ko"` runs), up next, shared-slug project label, finished/started rows, the PUBLIC tag, the empty-projects line.
  - Clear all: Cancel focused on open, Escape and Cancel return focus, the clearing state (width kept, `aria-busy`, Cancel disabled, focus on the pressed button), a failure (alert, `ref · …`, retry), success (status line focused, Continue gone, "0 of N finished", rows "Not started"); verified on the server that the state was removed.
  - Loading (navigating to the library with a slowed read), failed (`error.tsx`, both routes, shell kept), "Try again" showing the skeleton then the page, empty org, nothing public (member), the constant 404 signed out and in, `/@{org}` signed out, as a member and as a signed-in stranger, the sign-in link returning to `/@{org}`, the Review pill with a real due count (2) in the rail, strip and bar.
  - Keyboard: the tab order (skip link, topbar, rail, lead, rows, grouping control, …), the focus ring (2px accent), Tab then Space on the grouping control.
  - Console and CSP: clean on both routes (the only console lines are the injected server fault in the failed-state run and 404 prefetches of the book page, which S23 has not built).
- **Not verified:** print; real devices (touch was emulated); larger-text reflow (175–200%) of the phone bar; a library of hundreds of documents; sepia (the library follows the OS, as drawn); the canvas boards side by side (read one at a time by screenshot).

## Notes

- The Review item links `/review` (S24) and the cards link the book page (S23): both 404 until those slices ship, which the plan names.
- Decided without the operator (unattended; each on `phase.md` → Operator Questions as OQ125–OQ135, full text in `topics/operator-questions-decided.md`): the listing route, the landing, round 02's scope, `/@{org}` as a route group with a shell layout, up-next language, the rows' 13px book line, the clear's logged `ref`, the Review pill's fault handling, who sees what on `/@{org}`, the singular empty-projects line's link, `rd-tag` repeated in `library.css`.
- The notes addressed to S22 were consumed and re-tagged (`phase.md` → Notes for later slices; `topics/notes-later.md` → *The library as shipped*).
- Prettier ran only on the files I created (D22); `library.css` was not reformatted.
