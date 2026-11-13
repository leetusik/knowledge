# P30.S13 result — Reader shell (`01-reader`)

- status: done
- tier: mid
- model: sonnet
- effort: high
- summary: Built the reader shell from the signed `01-reader` rounds 02 + 03: tokens (faces, five sizes, light/dark/sepia/system), layout, top bar, progress line, chapter bar (compact chrome, control edge, two-slot language switch), Display and Contents sheets, Sign in to save component, loading/not-found/failed states, chrome rules and keyboard, the `kb_reader` cookie, the chapter route, and native/md documents opening in the reader.
- validation (all passed): `pnpm --dir web typecheck`, `pnpm --dir web lint`, `pnpm --dir web test` (25 files, 240 tests), `pnpm --dir web build`, `python3 scripts/plugin_parity.py`, `python3 scripts/skills_parity.py`, `python3 scripts/workflow.py validate` (only pre-existing warnings). No server change, so no server suite.
- deviations: see below (none from the plan's scope; choices recorded as OQ55–OQ62).
- doc_impact: `frontend.md, security.md, decisions.md: P30.S13` (full lines in `topics/doc-impact-detail.md` → *P30.S13*).

## Files

Created: `web/src/app/reader.css`, `reader-fonts.css`, `web/public/fonts/reader/` (138 woff2), `web/src/lib/reader-cookie.ts`, `web/src/content/reader.ts`, `web/src/lib/reader/{types,chrome,state-view,load}.ts`, `web/src/components/reader/{reader-frame,chapter-list,display-panel,sign-in-to-save,reader-state,reader-article,reader-page}.tsx`, route `web/src/app/(public)/[org]/[project]/books/[book]/[chapter]/{page,not-found,loading,error}.tsx`, tests `web/tests/reader-cookie.test.ts`, `web/tests/reader-chrome.test.ts`.
Edited: `web/src/lib/reader-href.ts`, `web/src/content/index.ts`, `web/src/lib/knowledge/{types,app,reader}.ts` (book reads), `web/src/lib/csp.ts` + `web/tests/csp.test.ts` (dev script-src), both document pages (`/documents/[id]`, `/[org]/[project]/[slug]`) and a comment in `document-view.tsx`, `web/public/fonts/README.md`.
Notebook: `phase.md` (Decisions, Doc impact, Operator Questions OQ55–OQ62 collapsed, Notes, Now), `topics/{doc-impact-detail,operator-questions-decided,notes-later}.md`.

## Decisions

OQ55–OQ62, full text in `topics/operator-questions-decided.md` → *P30.S13* (viewport media queries vs container; accumulated scroll runs; links owned by later slices; missing chapter is 200 + noindex because of `loading.tsx`; loose md/native; vendored fonts; dev CSP; Try again reloads). Also decided (in notes): the Contents sheet carries the full `ChapterList`; section tracking is built in the frame for S15; `SignInToSave` is built but mounted by S15; the `.rd-prose .kb-ch` stand-in and `.rd-title` are S14's to replace.

## Live check

Instrument: Aside (`repl --account u1`) for interaction, geometry and screenshots; headless Chrome (throwaway profile, `--enable-logging`) for console/CSP, because Aside's repl gave no console capture. Runtime: the production build (`next start`, spare port) against a scratch API and throwaway Postgres DB with the fixture book; a dev server from a scratchpad clone for the failed/loading states and the dev CSP. Never `:8766`, `:3030`; no production access; no model-API spend. All my servers are stopped.

Verified: member and anonymous reads; chrome rules (hide/show, tap toggle, skip button, quiet period, ignored while a sheet is open); progress and section tracking; Contents/Display sheets with Tab trap, Escape, scrim, Close and focus return; cookie SSR (no flash), tampered fallback; sepia, size 1–5 (15/16.5/18/20/22 px), system dark (OS toggle restored); ko variant loads Noto Serif KR; `?v=` older version; md and native loose docs; legacy redirect for html chapters; link resolution and missing links; sign-in return address; geometry at 390/820/1024/320/260/195; loading, failed (and Try again), not-found, Sign in to save (via a throwaway preview page, deleted); private vs missing chapter identical; seven reader URLs and the dev reader produced zero console/CSP lines (positive control produced lines); reading positions drive the chapter list states (Finished / Reading now / Started 40%).

Fixes made during the check: hash jumps were read as scrolls by the chrome (smooth scroll) → `scroll-behavior: auto` in the reader; `#id` links to non-heading blocks hid under the bar → `scroll-margin-top` on `[id]` blocks; Try again stalled in dev → skeleton then reload; the dev CSP blocked the reader's own un-nonced scripts → dev drops `'strict-dynamic'`.

Not verified (do not read as done): reduced motion is a source audit only (no OS toggle driven); 150%/200% text zoom verified via equivalent narrow widths, not browser zoom; after the final CSS tweak the 195px overflow probe still showed table/code cells wider than the viewport (`overflow-x:auto` contains them inside their own scroll box; document scroll width stayed 195/390); dark-mode check was the OS toggle with the production build only; Aside is left signed in to a scratch account on `127.0.0.1`.
