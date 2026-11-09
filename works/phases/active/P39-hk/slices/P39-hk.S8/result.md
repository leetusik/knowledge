# P39-hk.S8 result: math in the reader and on paper

## Verdict

- **status:** done
- **route:** high
- **model:** opus
- **effort:** xhigh
- **summary:** Built the signed reading-aids math (Temml 0.14.0 MathML rebuilt through an allowlist into React, inline `math.ra-m` atoms, the `figure.ra-mb` block with `FormulaBox`, the measured √ correction, STIX Two Math, screen and print CSS, the Review card's linear text, the bilingual verification chapter), then swept it live with Claude in Chrome on the agent profile and on paper with headless Chrome over CDP. The sweep found three departures from the signed record and fixed them in S8's set: the stepped rows' spacing around the relation, the chapter's legend column (5.5 → the record's 5.25), and the fixture's unstretched parens in `participation`.
- **files_changed:**
  - `web/package.json`, `web/pnpm-lock.yaml`
  - `web/src/lib/native/mathml.ts` (new), `web/src/lib/native/render.tsx`
  - `web/src/components/reader/formula-box.tsx` (new), `web/src/components/reader/math-layer.tsx` (new; this run: the F27 rounding), `web/src/components/reader/reader-article.tsx`
  - `web/src/lib/reader/radicals.ts` (new), `web/src/lib/reader/notes-load.ts`
  - `web/src/content/chapter.ts`
  - `web/src/app/reader-aids.css` (new; this run: the relation spacing), `web/src/app/kb-print.css`, `web/src/app/reader-fonts.css`
  - `web/public/fonts/reader/stix-two-math.woff2` (new), `web/public/fonts/reader/stix-two-math-OFL.txt` (new), `web/public/fonts/README.md`
  - `web/src/lib/review/actions.ts`, `web/src/components/review/inline.tsx`
  - `web/tests/native-math.test.ts` (new), `web/tests/reader-anchor.test.ts`
  - `tests/fixtures/book/reading-aids.en.md` (new), `tests/fixtures/book/reading-aids.ko.md` (new; this run: `participation`'s `\left( … \right)` in both), `scripts/publish_fixture_book.py`
  - this `result.md`
- **validation:**
  - `pnpm --dir web typecheck`: pass (re-run after the sweep's fixes)
  - `pnpm --dir web lint`: pass (re-run)
  - `pnpm --dir web exec vitest run tests/native-math.test.ts tests/native-render.test.ts tests/reader-anchor.test.ts tests/native-conformance.test.ts tests/csp.test.ts`: pass, 5 files, 311 tests (re-run)
  - standalone `next build` in a scratch APFS clone of `web/`: pass (rebuilt after the fixes), served with `node server.js` on :3998
  - `server.native.parse_chapter` on both fixture chapters: pass (re-run after the TeX change); the en and ko formula TeX lines are byte-identical
  - `scripts/publish_fixture_book.py --base-url http://127.0.0.1:8997`: pass on fresh scratch state (8 saves)
  - `.venv/bin/python scripts/plugin_parity.py`: pass; `python3 scripts/workflow.py validate`: pass (warnings only, none S8's)
  - **live sweep: run.** Instrument: **Claude in Chrome**, `list_connected_browsers` → one browser, deviceId `c14e5b18-f250-45f1-b92e-4a08a31197b5`, then `select_browser` on it before any other browser tool; my own tab only, closed at the end. True viewports through a same-origin iframe harness against the standalone build. Paper and Chromium's accessible-name computation: **headless Chrome 156 over CDP** on a throwaway profile (`Page.printToPDF`, `Accessibility.getPartialAXTree`), PDFs rendered to PNG with `pdftoppm`. Results in § *Live sweep*.
  - `deferred: whole-tree`: the whole web suite and the full pytest run (REVIEW runs them)
- **deviations:** the six code-side deviations of the first run (below, 1–6), plus this run's three sweep fixes (7–9) and the instrument split (10). Details in § *Deviations, with reasons*.
- **doc_impact:** one line, in the `notebook` field.
- **notebook:** the entries are listed under § *Notebook* below (Decisions, Notes, Doc impact, OQ12–OQ14, Now, notes consumed).
- **operator_need:** none.

## What was built

| Part | Where | Notes |
|---|---|---|
| Engine | `web/src/lib/native/mathml.ts` | See the engine notes below the table. |
| Inline | `render.tsx` `inlineMath` | `<math class="ra-m" alttext="<linear text>" data-an-len="<TeX code points>">`. The anchor projection counts the TeX, and paint skips the atom. |
| Block | `render.tsx` `formula` | See the block notes below the table. |
| `FormulaBox` | `formula-box.tsx` | Reuses `scroll-box`'s `useBox("self")`. Classes `is-over` / `is-more-start` / `is-more-end` drive the 2.5rem mask. `tabIndex=0`, `role="region"` and "Formula, scrolls sideways" (ko "수식, 옆으로 스크롤됩니다") only while it overflows. |
| √ correction | `web/src/lib/reader/radicals.ts` | `fitRadicals(root)` clears and refits every `msqrt` / `mroot` under `root`, innermost first: `gap = radical.right − radicand.right`; past 0.01em, `marginInlineEnd = −gap em`. No box (hidden windows) → skipped. `fitRadical(el)` is exported for S9. No fixed margin. |
| Layer | `math-layer.tsx`, mounted in `reader-article.tsx` | Runs on the chapter's `.kb-ch` only if it holds math, on mount, `document.fonts.ready`, `loadingdone` and `.rd-root` class changes (type size). Sets F27's `--ra-sym-k` from the widest legend symbol + 0.35, **rounded to the nearest ¼** (this run; was rounded up). Imports `reader-aids.css`. |
| Face | `reader-fonts.css` | Hand-written `@font-face` for STIX Two Math: `local()` first, then `/fonts/reader/stix-two-math.woff2` (`@fontsource/stix-two-math@5.3.0`, 403,344 B, MATH table, unmodified, OFL 1.1; Reserved Font Name in `web/public/fonts/README.md`, licence beside it). |
| CSS | `reader-aids.css` (screen), `kb-print.css` (paper) | See the CSS notes below the table. |
| Notes | `notes-load.ts` | A note (and the reader's place bar) on a formula is named "Figure · {alt}". |
| Review (OQ9) | `review/actions.ts` | `loadReviewQueue` and `rateReviewCard` replace every `{type:"math", tex}` in a quiz card with `{type:"text", text: linearTex(tex)}`, falling back to a `code` run with the TeX if Temml refuses. The API is unchanged. `inline.tsx`'s `case "math"` is defensive. |
| Anchor test | `reader-anchor.test.ts` | The round-trip assertion ignores characters inside `data-an-len` atoms (`units()` kind `atom`). Only that. |
| Core test | `web/tests/native-math.test.ts` | Every TSV row renders through Temml in its context; every element, attribute, class and style Temml emits is allowlisted or dropped by name; no `style` survives; F24 inline only; the linear text of the eight F12 snippets. No TSV row failed, so no validator twin was touched. |
| Fixture | `tests/fixtures/book/reading-aids.{en,ko}.md` | F12's text: three sections (F29 headings, ids `scoring-a-run`, `counting-the-trials`, `when-nothing-happens`), seven inline formulas, four display blocks (`tstat`, `worked`, `participation`, `poisson`; alt, reading and legends from `RA_FORMULAS`), the F30 quiz, the 12-term glossary and a placeholder source. ko is `translated_from en@1`, same ids; shares carry no-break spaces. |

**Engine (`mathml.ts`):** `temml.renderToString(tex, {displayMode, wrap:"none", throwOnError:true, trust:false, annotate:false})`, parsed with `saxes` (already a dependency) and rebuilt with `createElement`, never `dangerouslySetInnerHTML`. R1's allowlists plus `mstyle`; off-list elements dropped with their subtree; text only in `mi` / `mn` / `mo` / `mtext`; `class` filtered to Temml's layout classes; a 4000-entry cache; `linearText` / `linearTex` for alttext and cards. A Temml refusal raises `MathError` and the block is refused (`kb-ch-unshowable`); raw TeX is never shown.

**Block (`render.tsx` `formula`):** `figure.ra-mb` (+ `ra-mb--steps` for `aligned`, detected after trimming a block scalar's trailing `\n`), `aria-label` "Formula: {alt}" / "수식: {alt}", the math with `alttext={alt}`; `figcaption.ra-mb__cap` holds `p.ra-mb__read`, `p.ra-mb__where` ("where" / "여기서"), `dl.ra-legend`; each `dt` the symbol's math, each `dd` through the inline renderer (a `term:` link shows S6's missing-link text until S9).

**CSS:** tokens `--font-math`, `--ra-math-k` 1, `--ra-display-k` 1.5; inline `nowrap`, compact; display 1.5 × `--rd-fs`; stepped rows `tml-right` / `tml-left` (Chromium's `-webkit-right/left`), **the relation 0.28em from either side** (this run), rows 0.2em apart; the legend grid on the chapter's symbol column with `overflow-wrap: break-word` (F36); Temml's table spacing restored under Tailwind's preflight; paper F10/F26/F28 (inline 1em, display 21.33 px, reading and legend 14 px, "where" 12 px, max-width 38em, symbol column `--ra-sym-k` em, `break-inside: avoid`, lead-in `break-after: avoid`); math colour `currentColor`.

## Live sweep

**Stack (this run):** scratch Postgres `kb_p39s8live` in `kb-p28s2-pg` (:55432), API :8997, `next dev` :3997, standalone :3998 (rebuilt after the fixes), viewport harness proxies :3996 → standalone and :3995 → dev, headless Chrome CDP :9333. Throwaway member `p39s8-member@example.com`, slug `p39s8`. Every check anonymous (public projects). Recipe in § *Stack as run*.

**Viewports:** the agent window is fixed at 1728×963 (DPR 1; `innerWidth` read first). Desktop-direct checks ran in that window on dev and standalone. True CSS viewports came from the harness (`/__vp?w=&h=&path=`, one same-origin iframe; `X-Frame-Options` and CSP `frame-ancestors` stripped, every other CSP directive kept; the Cookie header dropped except the reader's `kb_reader`), pointed at the standalone build, where React hydrates. Theme and text size were set through the reader's own Display panel or its `kb_reader` cookie; the cookie was deleted at the end, so the profile is back on the default (System).

### Formulas states (the ones S8 owns)

Columns: `scroll` is each box's scrollWidth/clientWidth; `relX` is the first relation's centre from the formula's left edge, in em (the record's grid, rebuilt in the page, gives tstat 1.304 · worked 1.255 · participation 1.352 · poisson 5.822).

| State | Viewport | Theme | Lang | Runtime | Result |
|---|---|---|---|---|---|
| rest: 7 inline, 4 blocks | 1728×963 direct | light | en | dev | Found fixes 7 and 8 (below); after them `relX` and the after-relation gap equal the record's grid to 3 decimals, legend column 5.25 (105 px at 20 px). |
| rest, Korean | 1728×963 direct | light, dark | ko | dev | "수식: …" figure labels, 여기서 upright, inline math unchanged. |
| dark | 1728×963 direct | dark | en | dev | Math `currentColor` = ink rgb(236,228,215); "where" `kb-secondary`; hairlines `kb-border`. |
| desktop | 1440×900 harness | light, dark | en, ko | standalone | All four blocks fit (576/576); `relX` 1.304 / 1.256 / 1.352 / 5.821; legend column 5.25em; no page or legend overflow. |
| tablet | 820×1180 harness | light, dark | en, ko | standalone | Same as desktop (576/576, 5.25em). |
| phone 390 | 390×844 harness | light, dark | en, ko | standalone | All fit (356/356); legend column 5.25em; screenshots match the signed "390 · t = s × √n" board. |
| phone 390, text size 5 (22 px) | 390×844 harness | light | en | standalone | `poisson` scrolls (374/356) as a region; switching to size 1 (15 px) live in the Display panel dropped its role, name and tabindex and refit the √ and the column. |
| phone 320: the long formula in its own box | 320×700 harness | light, dark | en, ko | standalone | `worked` fits in steps (286/286), as the record's Formulas page draws ("320 steps fit"). `poisson` scrolls (306/286), as the record's 320 render shows ("rate × tim" fading): `role="region"`, "Formula, scrolls sideways" / "수식, 옆으로 스크롤됩니다", `tabindex=0`; the mask class is `is-more-end` at the start, both mid-way, `is-more-start` at the end; the page never scrolls sideways; legend column 28% (4.455em, the record's bound). **Tab reaches the box (`:focus-visible`, 2 px accent outline computed) but no ring is visible**: the record's own `mask-image` clips the outline, which sits outside the box → OQ12. |

S9 owns the legend-term, Read more and term-open states (not swept here).

### The √ (Chromium)

Every radical, measured `radical.right − radicand.right` before the fit, and the effective trailing gap after:

| Radical | Before | After |
|---|---|---|
| inline `t = s × √n` | 0.418em | 0.000em |
| `tstat` √n | 0.418em | 0.000em |
| `worked` √n | 0.418em | 0.000em |
| `worked` √30 | 0.418em | 0.000em |

The same at every viewport above, both languages and themes, text sizes 1, 3 and 5, and on paper (the margin is in em). WebKit's zero gap could not be checked: no WebKit the harness can drive on this host. That is the gate's (real iPhone and iPad).

### The font

- `reading-aids`: the STIX Two Math face `loaded`, 0 font fetches. macOS ships STIX Two Math, so the `local()` leg wins.
- `write-lock` (no math): the face stays `unloaded`, 0 fetches. So the face loads only on a page with math.
- The `url()` leg: a FontFace on `/fonts/reader/stix-two-math.woff2` loaded (403,344 B). A system without the face gets the vendored file. Seeing that fetch happen is the gate's (a Windows or Android device).
- Dev lists the face 3 times in `document.fonts` (dev CSS injection); standalone once.

### Accessible name

Chromium's own computation, via headless Chrome CDP `Accessibility.getPartialAXTree`:
- `figure#tstat`: role `figure`, name "Formula: s equals mean over sd; t equals s times the square root of n" (ko "수식: s는 평균 나누기 sd, t는 s 곱하기 n의 제곱근"), from `aria-label`.
- The block's `math`, an inline `math.ra-m` and a legend symbol: role `MathMLMath`, **no name**. Chromium maps no name from `alttext`; it exposes the MathML tree. What VoiceOver speaks is the gate's check.
- At 320: the scrolling `poisson` box is `region` "Formula, scrolls sideways"; the fitting `worked` box is `generic`, unnamed.

### The old-version page

`/documents/5/versions/1` (anonymous, public project; v1 archived by a scratch v2):
- 4 figures and 7 inline formulas render like every native block there, without the reader CSS: the browser's `math` face at 16 px, display formulas centred, the legend an unstyled `dl`, and Chromium's √ gap uncorrected ("√n .").
- No horizontal overflow at 1728 or at 320: the formulas fit (251/251).
- Not broken, so not touched (plan item 10) → OQ13.

### Paper

Headless Chrome over CDP, `Page.printToPDF` with backgrounds off, from the standalone build, with `pdftoppm` PNGs inspected. Four PDFs: en and ko, A4 (595.9×841.9 pt) and letter (612×792 pt), each 4 pages.

- **Measured under print media (en and ko the same):**
  - formula 21.33 px; reading 14 px; "where" 12 px; legend 14 px;
  - symbol column 73.5 px = 5.25em; max-width 532 px = 38em;
  - `break-inside: avoid`; lead-in `break-after: avoid`;
  - inline math 14 px = 1em of the 14 px text;
  - ink colour; no mask; the √ fitted.
- **On the pages:**
  - p1: masthead, title, "Scoring a run" with its inline math, then `tstat` and its legend;
  - p2: "With the thirty events above:" carried over with `worked` (the lead-in rule at work), then `participation` with stretched parens;
  - p3: `poisson`, the quiz, Sources and Answers;
  - p4: the colophon.
- The stepped rows on paper carry the record's spacing.
- The glossary appendix is S9's.

### Console

No console messages on the reader page in dev or standalone (Claude in Chrome `read_console_messages`), and no console errors or exceptions in the CDP run.

### What the sweep fixed (departures from the signed record)

1. **Stepped rows' spacing (the record's `.ra-steps__grid`).**
   - **Method:** I rebuilt the record's own markup (MathBlock's per-cell `<math>` grid, `column-gap: 0.28em`, `row-gap: 0.2em`) in the live page at the same size and measured it beside the build.
   - **Before:** the relation sat 0.28em closer on each side. Relation centre: tstat 1.024 vs 1.304em, worked 0.976 vs 1.255, poisson 5.542 vs 5.822; the gap after the relation was 0.28em short. The build had read the grid's 0.28em as the relation's own 0.2778em spacing, but the record's lone `<mo>` keeps that spacing too, so the two add.
   - **Fix:** `reader-aids.css`, `margin-inline: 0.28em` on the first operator of Temml's right cell.
   - **After:** equal to 3 decimals; the row pitch was already equal (1.079; 2.224 / 1.664 / 0.871).
2. **F27's chapter column.**
   - **Before:** `--ra-sym-k` was 5.5, not the record's 5.25. P(no event) measures 4.904em, and `ceil((4.904 + 0.35) × 4) / 4` = 5.5.
   - **Fix:** `math-layer.tsx` rounds to the nearest ¼.
   - **After:** 5.25 on screen and on paper.
3. **The fixture's `participation`.**
   - **Before:** `(\sum_i e_i)^2` gives Temml's non-stretchy parens. The signed block's `<mo>(</mo>` is a stretchy fence around the sum.
   - **Fix:** `\left(\sum_i e_i\right)^2`, in en and ko (byte-identical TeX).
   - **After:** checked against the signed crop.
   - The inline `(∑e)² ÷ ∑e²` keeps plain parens, as F24 draws.

## Left to the gate

- **Member-only (the profile is anonymous):** the Review card in a browser, and a highlight across inline math.
- **Real VoiceOver:** one display formula (the figure's name, then its caption) and one inline formula. Chromium gives inline math no name from `alttext`.
- **Real iPhone and iPad (WebKit):** the √ with no correction needed (zero gap expected), Safari's MathML in the steps and the scrolling box.
- **A device without STIX Two Math** (Windows or Android): the vendored woff2 fetched on a math page only.
- **The decisions:** OQ12 (the invisible focus ring), OQ13 (the old-version page) and OQ14 (the Korean particle wrap).
- **S9's states:** legend term open, Read more, term open in dark and on the phone sheet.

## Server-rendered checks (first run, HTTP fetch, not a browser)

- **Reader pages:** dev :3997 and standalone :3998, `/@p39s8/fixtures/books/fixture-guide/reading-aids?lang=en|ko`, return 200, with:
  - 7 `math.ra-m`;
  - 4 `figure.ra-mb` (3 `--steps`);
  - the ko labels;
  - no `style=`;
  - no `kb-ch-unshowable`.
- **The font:** `/fonts/reader/stix-two-math.woff2` returns 200 `font/woff2`, and no page preloads it.
- **Production CSS:** the face rule is in the reader chunk, and the paper rules sit inside `@media print`.
- **The Review queue:** through the standalone BFF, as the member, it carries only linear text. No `\times`, `\sqrt`, `\div`, `\approx` or `\lambda` leaks.

## Stack as run (for S9 and REVIEW)

- **API:**
  - Create the scratch Postgres database in `kb-p28s2-pg`: `docker exec kb-p28s2-pg createdb -U kb kb_p39s8live`.
  - Migrate it: `DATABASE_URL=postgresql+psycopg://kb:kb@127.0.0.1:55432/kb_p39s8live .venv/bin/alembic upgrade head`.
  - Run: `env -u GOOGLE_API_KEY -u GEMINI_API_KEY KB_ROOT=<scratch>/root KB_DB_PATH=<scratch>/root/data/kb.sqlite3 DATABASE_URL=<same> KB_GIT_COMMIT=false KB_STARTUP_REINDEX=false KB_AUTH_RATE_LIMIT=200 .venv/bin/uvicorn server.main:app --host 127.0.0.1 --port 8997`.
- **Member:**
  - `POST /auth/signup` (throwaway email);
  - an org key from `POST /app/credentials`;
  - slug `p39s8` via `PATCH /app/tenant`.
- **Publish:**
  - `FIXTURE_API_TOKEN=<vk_ key> python3 scripts/publish_fixture_book.py --base-url http://127.0.0.1:8997`.
  - On fresh state the ids are: all-blocks 1, write-lock 2/3, legacy 4, reading-aids en 5 / ko 6, the loose note 7.
  - Then `PATCH /app/projects/<id>` `{"visibility":"public"}` for `fixtures` and `fixture-finance`.
  - Re-publishing onto a scratch API with history needs `--force`. The ko chapter must then be saved as a translation of en's *current* version (the server keeps a translation's math byte-identical to its source version). This run saved it from a temp copy with `translated_from.version: 3`; the repo file stays `en@1`, right on fresh state.
- **Dev:** `KB_API_BASE_URL=http://127.0.0.1:8997 SESSION_SECRET=<throwaway> pnpm exec next dev -H 127.0.0.1 -p 3997`, from `web/`.
- **Standalone:**
  - Make a `cp -Rc` clone of every top-level entry of `web/` except `.next`, then run `pnpm exec next build`.
  - Copy `.next/static` to `.next/standalone/.next/static`, and the contents of `public/` into `.next/standalone/public/`.
  - Run `NODE_ENV=production PORT=3998 HOSTNAME=127.0.0.1 KB_API_BASE_URL=… SESSION_SECRET=… node server.js`.
- **Viewport harness:** a ~90-line Python proxy, `vp_proxy.py <listen> <target>`.
  - `/__vp?w=&h=&path=` serves one iframe of exactly w×h, plus a probe script.
  - Everything else is proxied, with `X-Frame-Options` and `frame-ancestors` stripped and only `kb_reader` kept in the Cookie header.
  - Point it at the standalone build so React hydrates.
- **Paper and AX:**
  - Headless Chrome (`--headless=new --remote-debugging-port=9333 --user-data-dir=<scratch> --disable-features=OverlayScrollbar`), driven by `cdp.mjs`.
  - Node 24's global WebSocket; `Page.printToPDF`, `Accessibility.getPartialAXTree`, `Emulation.setEmulatedMedia`.
  - Then `pdftoppm`.
- **Reader URL:** `/@p39s8/fixtures/books/fixture-guide/reading-aids?lang=en|ko`. Old version: `/documents/5/versions/1` (after a second save of `reading-aids`).
- **Signing in by HTTP:** the production session cookie is `Secure`, so a script sends it by hand over `http://127.0.0.1`.
- **Cleanup (this run):**
  - Stopped exactly the processes I started:
    - API 37576;
    - dev 37666 / 37674 / 37690 / 38492;
    - standalone 37668 (before the rebuild) and 42462;
    - proxies 38213, 38215 and 43170;
    - headless Chrome 44862.
  - Dropped `kb_p39s8live`.
  - Deleted the agent profile's `kb_reader` cookie, and closed my tab.
  - `:3030` (8452) and `:8766` (80074) were never touched and were still listening at the end.
  - Scripts, PDFs and PNGs are under `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/aba4c78e-665c-427a-9abd-276457679f2d/scratchpad/s8live/`.

## Deviations, with reasons

1. **`mstyle` in the element allowlist.** Temml wraps `\dfrac` / `\tfrac` in it; R1's list, drawn from the canvas's hand-written MathML, lacked it.
2. **Styles mapped, not kept.** `math-depth:N` on an accent → `scriptlevel="N"`; `margin-left:-0.1667em` (`\!`) → class `ra-m-nthin`; a cases/aligned column pair's padding → class `ra-m-col`; Temml's defaults dropped (the CSS does them); dropped by name: `tml-display`, `tml-vec`, the `chr-*` / `wbk-*` accent nudges, `xmlns`. Keeps `native-render`'s no-style guarantee.
3. **F24 inline only.** `lspace="0"` on a large operator straight after an opening fence applies to inline math only: the signed `MathBlock` boards draw display math with Temml's spacing.
4. **Fixture wording.** The Terms board's "…the subject of Many trials, one bar" names the section by its F29 heading ("Counting the trials" / "시도 횟수 세기"); `sharpe`'s long definition writes `⟨s⟩` as inline math (F31); the sources placeholder uses `https://example.com/source` (the schema needs a URL); shares use no-break spaces for the canvas's `{…}` keep marks.
5. **`scripts/publish_fixture_book.py`.** It publishes a fixed list, so the new chapter needed two saves (chapter `reading-aids`, position 4) and a docstring line; the loose document's id on fresh state moves from 5 to 7 (P30's recipe note says 5).
6. **`review/inline.tsx` `case "math"`.** Defensive: cards are linearized in `actions.ts`; if a math node ever reaches it, it shows the TeX as code rather than dropping the formula silently (OQ9).
7. **Sweep fix: the relation's 0.28em** (`reader-aids.css`). A departure from the record's steps grid, measured and corrected (§ *What the sweep fixed* 1).
8. **Sweep fix: F27 rounding to the nearest ¼** (`math-layer.tsx`). The first run's "rounded up" gave this chapter 5.5 against the record's 5.25 (§ 2). OQ11's second line ("rounded up to ¼") is superseded; see the Decisions line.
9. **Sweep fix: the fixture's `participation` parens** (`reading-aids.{en,ko}.md`), to the record's stretchy fence (§ 3).
10. **Two instruments.** Claude in Chrome for every screen state, as the plan binds. Headless Chrome over CDP for paper (`Page.printToPDF`: the extension has no print-to-PDF; the orchestrator relayed the pin and the operator did not object) and for Chromium's accessible-name computation, which page JS and the extension's page tree cannot read. Both are named above. No WebKit run.

## Notebook (for the orchestrator to write; this slice ran in a wave)

**Decisions**
- Math (S8): Temml 0.14.0 output is rebuilt through R1's allowlists plus `mstyle` into React, with every `style` dropped (the meaningful ones mapped to `scriptlevel` or classes). F24's `lspace="0"` is inline only. A Temml refusal at render refuses the whole block (`kb-ch-unshowable`), never showing TeX → [S8 result](slices/P39-hk.S8/result.md)
- Math CSS (S8): in the new `web/src/app/reader-aids.css`, imported by `MathLayer` (keeps `reader.css` clear of P36-1s). Stepped rows give the relation the record's 0.28em grid gap on both sides, on top of its own spacing. F27's column is measured per chapter: `--ra-sym-k` = widest legend symbol + 0.35em, rounded to the nearest ¼ (this chapter 5.25; fallback 5.25), which supersedes OQ11's "rounded up". Review cards get linear text in `review/actions.ts`; the API is unchanged.

**Notes for later slices**
- **(from S8, for P39-hk.S9)** The radical API is `fitRadicals(root)` (refits every `msqrt` / `mroot` under `root`, innermost first; skips nodes with no client rects) and `fitRadical(el)`, in `web/src/lib/reader/radicals.ts`. Call it when a term window or sheet with math opens. S9's CSS goes in `reader-aids.css`. A legend `dd`'s `term:` link renders S6's missing-link text, and the `dd` runs through `this.inline`.
- **(from S8, for P39-hk.S9 and REVIEW)** The verification chapter is `tests/fixtures/book/reading-aids.{en,ko}.md` (chapter `reading-aids`, position 4; fresh-state ids 5 and 6, loose note 7). The stack and instruments as run are in [S8 result](slices/P39-hk.S8/result.md) § Stack as run: the viewport harness against the standalone build, and CDP for paper and AX. On a scratch API with history, re-publishing ko needs `translated_from` at en's current version.
- **(from S8, for REVIEW)** The gate's checks: [S8 result](slices/P39-hk.S8/result.md) § Left to the gate. That covers the member-only Review card and a highlight across math, real VoiceOver (Chromium gives inline math no name from `alttext`), WebKit's √ and MathML on a real iPhone and iPad, and the vendored woff2 on a system without STIX Two Math.

**Doc impact**
- architecture + product + qa: the reader typesets math. Temml 0.14.0 MathML is rebuilt through an allowlist (`mathml.ts`): inline `math.ra-m` atoms, the `figure.ra-mb` block with its reading and legend, `FormulaBox`, the measured √ and STIX Two Math (OFL, vendored). The screen and print CSS live in `reader-aids.css` and `kb-print.css`. Review cards show formulas as linear text. The fixture book gains `reading-aids` en/ko.

**Operator Questions** (OQ10 and OQ11 are already on disk; these are new)
- **OQ12 (S8):** A formula box that scrolls (`poisson` at 320 px) takes keyboard focus but shows no ring. The record's own fade (`mask-image` on the box) clips its 2 px accent outline, which sits outside the box, and the focused state was never drawn. Recommended: a small fix slice that paints the fade the way the tables do (overlay spans), so the drawn ring shows. Fix slice, or as is?
- **OQ13 (S8):** The old-version page shows math like every native block there, without the reader CSS: the browser's math face, display centred, the legend unstyled and Chromium's √ gap left in. Nothing overflows at 320 px. Recommended: as is (that page styles no native block). As is, or a follow-up job?
- **OQ14 (S8):** In Korean, a particle can wrap away from the inline formula before it. At 390 px, "…∑e²" ends one line and "를 계산하며" starts the next. Recommended: a follow-up job binding a particle to the formula before it. Follow-up, or as is?

**Now**
- S8 is done: the math engine, the inline atom, the formula block, the √ correction, STIX Two Math, the screen and print CSS, the Review linear text and the reading-aids fixture.
- The Claude in Chrome sweep ran on the agent profile, with paper through CDP. Three record departures were fixed: the relation spacing, F27's 5.25 column and `participation`'s parens.
- Typecheck, lint, 311 scoped tests and the standalone build pass.
- Next: S9 (the term window and the glossary), S11, then REVIEW. Open: OQ7–OQ14.

**Notes consumed:** remove these:
- `(from S7, for P39-hk.S8)` (entry 16);
- `(from S7, for P39-hk.S8 and its plan)` (entry 17).

Retarget, don't remove:
- `(from R1, for P39-hk.S8 and S9)`, the √ gap (entry 6): S9 still needs it for the windows; retarget to "for P39-hk.S9".

These stay as they are:
- `(from DECOMP2, for P39-hk.S8, S9 and REVIEW)` (entry 12);
- `(from DECOMP, for P39-hk.S8 and S9)` (entry 1).
