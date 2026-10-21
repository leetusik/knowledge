# P30.S25 result: the legacy reader

- status: done
- tier: high
- model: opus
- effort: high
- summary: An `html` chapter, loose document or older version now opens in the signed `09-legacy-and-print` legacy reader. It is a full-screen `100dvh` sandboxed frame and the only scroller, with the legacy bar, Display, resume and bookmarks all running through a 1846-byte postMessage bridge. Both raw relays inject the bridge in place of the retired height handshake; the sandbox gains popups but never `allow-same-origin`; the parent checks `event.source`, the schema and the size of every message. D37 `no-transform` is on both relays.
- files_changed:
  - created:
    - web/src/lib/legacy/bridge.ts
    - web/src/lib/legacy/messages.ts
    - web/src/components/reader/legacy-reader.tsx
    - web/src/components/reader/legacy-reader-page.tsx
    - web/src/components/reader/use-legacy-reading.ts
    - web/src/app/legacy.css
    - web/tests/legacy-bridge.test.ts
  - edited:
    - web/src/app/api/documents/[id]/raw/route.ts
    - web/src/app/api/documents/[id]/versions/[v]/raw/route.ts
    - web/next.config.ts
    - web/src/lib/reader/load.ts
    - web/src/lib/reader/types.ts
    - web/src/lib/reader/actions.ts
    - web/src/lib/knowledge/reader.ts
    - web/src/components/reader/display-panel.tsx
    - web/src/content/reader.ts
    - web/src/app/(public)/[org]/[project]/books/[book]/[chapter]/page.tsx
    - web/src/app/(public)/[org]/[project]/[slug]/page.tsx
    - web/src/app/(public)/documents/[id]/page.tsx
    - web/src/app/(public)/documents/[id]/versions/[v]/page.tsx
    - web/src/app/(public)/documents/[id]/document-view.tsx
    - web/src/app/(public)/documents/[id]/export-pdf-button.tsx
    - web/tests/raw-route.test.ts
    - web/tests/version-raw-route.test.ts
    - deploy/knowledge.conf
  - deleted:
    - web/src/lib/explainer-height.ts
    - web/src/app/(public)/documents/[id]/explainer-frame.tsx
    - web/src/app/(public)/documents/[id]/version-history.tsx
    - web/tests/explainer-reporter.test.ts
  - notebook:
    - works/phases/active/P30/phase.md (Decisions, Doc impact, Operator Questions, Notes for later slices, Now)
    - works/phases/active/P30/topics/{notes-later,doc-impact-detail,operator-questions-decided,decisions-archive}.md
- validation (all pass):
  - `pnpm --dir web typecheck`
  - `pnpm --dir web lint`
  - `pnpm --dir web test` (36 files, 380 tests)
  - `pnpm --dir web build`
  - `python3 scripts/plugin_parity.py`
  - `python3 scripts/skills_parity.py`
  - `python3 scripts/workflow.py validate` (passes; the long-standing oversized-doc-sections warning is still printed)
  - the server suite was not run (no server change)
- deviations:
  - the bridge is 1846 bytes, not "~1 KB"; a test caps it under 2 KB;
  - `version-history.tsx` (orphaned) and `DocumentView` were deleted along with the explainer frame;
  - the frame's focus ring uses an island-set `[data-ring]` instead of the canvas's `:focus-visible` plus `[data-quiet]`, because an iframe never matches `:focus-visible`;
  - the top bar and chapter bar markup is duplicated rather than refactored out of `reader-frame` (OQ168).
- doc_impact: frontend.md, security.md, api.md, operations.md: P30.S25. `09-legacy-and-print` round 01 is the legacy reader's design record; sandbox popups; relay `no-transform` and the 502 `ref`; the nginx version-raw location. Full lines are in topics/doc-impact-detail.md → *P30.S25*.

## For REVIEW

- **D37 has shipped:** `Cache-Control: no-store, no-transform` is on both raw relays (the unit tests check it, and it was checked live on the relay). REVIEW can close D37.
- **D38–D40's droppable condition ("once S25 ships") now holds:** the unmeasured box, the frame print slicing and the height reporter are all gone (`explainer-height.ts`, `explainer-frame.tsx`, the prepare/release handshake in `export-pdf-button.tsx`, `tests/explainer-reporter.test.ts`).
- **Hand-offs consumed:**
  - S21: the legacy bar carries the bookmark control and "Highlights are not available in this document.";
  - S24: the 429 limiter, so one Aside sign-in was reused;
  - S4: the version raw relay now has its nginx location.

## What shipped

The routes, files, bridge contract, retired code, gotchas and live-check setup are in `topics/notes-later.md` → *The legacy reader as shipped*. The decided questions are OQ159–OQ171 in `topics/operator-questions-decided.md` → *P30.S25*. In short:

- **Loader:** `lib/reader/load.ts` no longer redirects html. It returns `{kind:"legacy"}` with `LegacyFrame {src, look, missing, bookmarks}`. `probeRaw` reads the relay once on the server (3 s timeout) to get look, missing and `<html lang>`.
- **The message boundary** (`lib/legacy/messages.ts`, pure and tested):
  - a message is read only when `source === frame.contentWindow`;
  - it must be a plain object with at most 5 keys and at most 4096 JSON characters, with `kb:"legacy"`, `v:1` and an exact schema;
  - `scroll` needs a fraction in 0..1 and an anchor of at most 200 characters or none;
  - `navigate` is laundered through `safeNextPath` and must match the reader-path allowlist (a document, a document version, a chapter or a book page);
  - in the frame, the bridge accepts `restore` only from `window.parent`.
- **Sandbox:** `allow-scripts allow-popups allow-popups-to-escape-sandbox` is set in all three places (the iframe attribute, the relay CSP `sandbox` and `next.config.ts`). There is no `allow-same-origin` and no top navigation.
- **Relays:** they inject the bridge, send `no-store, no-transform`, and answer an upstream failure with `502 {ok:false, ref:"lg-…"}`, logged on the server.

## Live check

The runtime was the scratch stack required by `topics/surface-slice-rules.md`, not the operator's `:8766`/`:3030` (both were left running and untouched):

- the API on `:8891` with database `kb_s25live`;
- a failure-injecting proxy on `:8892`;
- `next start` on `:3891`, serving the production build.

Instruments: Aside `--account u1` (and never u0) for signed-out and signed-in passes, and headless Chrome over CDP with a throwaway profile (`scratchpad/s25/cdp.mjs`) for viewports, keyboard, frame states and console/CSP.

Checked live:

- **Headers and markup:**
  - the relay carries the bridge, the new CSP and `no-store, no-transform`;
  - `viewport-fit=cover` appears only on the legacy pages;
  - `/documents/6/versions/1` → 307 to `/documents/6?v=1`;
  - the anonymous `/documents/10` → 307 to its canonical `/@…` URL.
- **One scroller:** at 390×844, 820×1180, 1024×768 and 1440×900 (DPR 2) the page never scrolls (`body overflow: hidden`; no other overflowing element; the frame fills the space between the top bar and the bar). At a 200% root font on a 390-wide phone the tight layout engages and only `lg-bottom__bar` scrolls, as drawn.
- **Bridge:**
  - the progress line and "Chapter 1 of 3 · N%" follow the frame;
  - the bottom chrome hides on a scroll down, shows on a scroll up and at the top, and hides on the first gesture after load at every viewport;
  - a spoofed message from the page window or from a child frame is ignored;
  - an in-frame `#anchor` link scrolls inside the frame;
  - `/settings` is refused;
  - an external link opens example.com in a new tab;
  - the in-frame legacy-chapter link and native-document link navigate the reader;
  - a `javascript:void(0)` link does nothing.
- **Member (one Aside sign-in):**
  - the position is saved with its anchor (`msl`, about 35%);
  - after a reload the resume pill reads "Picked up where you left off · 25%" and the frame lands there;
  - Bookmark this position / Bookmarked here toggles, and the bookmark is stored server-side as `{anchor:"msl", fraction:0.249}`;
  - reading to the end auto-finishes ("Finished · Saved to your progress.", server `state: finished`);
  - Mark as unread → "Not finished", and reading to the end again finishes it again;
  - a fresh chapter opened three times stays at `started` with fraction 0.
- **Moving between documents:**
  - Version history sheet (Escape returns focus) → v1 shows the "Older version · v1" tag and notice, and "Read v2 →" returns;
  - 한국어 shows the stale-translation notice and keeps the place (`#msl`, 31%), and "Read English v2 →" returns;
  - Next, Previous and Contents navigate;
  - the loose html document shows "‹ Library" and no chapter bar.
- **Display:**
  - the "In this document" note replaces Text size;
  - Dark darkens the self-darkening document (`lg-docframe--dark`, frame `color-scheme: dark`);
  - Sepia and Light keep it light.
- **States:**
  - loading (the skeleton, actions hidden, `aria-busy`), then slow at 8 s ("Still loading…"), then ready;
  - failed shows "Error · 502" with `ref · lg-…`, matching the server log, and Try again recovers;
  - missing (the relay answers 404) shows "This chapter's file is missing" with "Back to the book", checked at 390 and 1440.
- **Keyboard:**
  - on desktop the frame takes focus quietly after load, and Space/PageDown scroll it;
  - at 820, Tab reaches "Skip to the document" first, Enter moves focus into the frame with the teal ring, and the arrow keys scroll;
  - Display opens by keyboard, Tab is trapped in the sheet, and Escape returns focus to Display;
  - a click into the frame shows no ring.
- **Console/CSP:** clean (only a CSS preload warning from Next).

Defects found live and fixed in this slice:

1. **The bridge measured before layout:** the first post read fraction 1 on a long document, which would finish a member's chapter on open, and it also swallowed the first desktop scroll gesture. The first post now waits for `load` (OQ169).
2. **The bottom chrome never hid,** then re-showed during its own fold. Re-basing now happens only on a real fold change, and there is a 450 ms quiet window after a fold or restore (OQ167).
3. **The frame's focus ring never showed,** because an iframe does not match `:focus-visible`. The island now tracks keyboard focus with `[data-ring]` (OQ170).

An earlier "javascript: link resets to 0%" turned out to be Aside's `frameLocator.click()` scrolling the target into view, not a defect.

Not verified:

- real iOS (URL bar, home indicator, safe-area insets on a device);
- classic always-on scrollbars;
- print (S26);
- a document that itself tries to navigate `top` (the sandbox forbids it).

Cleanup: I stopped my own PIDs (web, API, proxy) and dropped `kb_s25live`. `:8766` and `:3030` are still listening, untouched.
