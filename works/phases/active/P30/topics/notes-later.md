# P30 notes for the late slices (S27, S28, REVIEW), full text

Moved word for word from `phase.md` → `## Notes for later slices` by P30.S5 to keep the notebook under budget. Each entry there is now one line that points here. A slice that consumes an entry says so in its `result.md` and may delete it here.

- **(from P29.S2, re-tagged by P30.DECOMP, for S27) Device checks** (D36 (7)). Run them in the operator
  runtime with Aside `u1`. The physical-device items are recorded as operator-run, for the gate walkthrough.
  - On iPhone and iPad in Safari and Chrome, and on Mac Chrome and Safari:
    - the legacy frame as the only scroller under `100dvh` (URL bar shown and hidden; the home-indicator
      strip, WebKit 292603);
    - momentum scrolling in the frame;
    - keyboard scrolling after focus;
    - external links opening a new tab;
    - whether the frame's `color-scheme` steers the 18 self-theming documents.
  - Native diagram hairlines at DPR 2 and 3.
  - Native Korean line breaking.
  - Print to PDF from Safari and from Chrome.
- **(from P30.DECOMP, for S27 and REVIEW) Before the gate:**
  1. Push `main` with the operator's permission, after integrating `kb-api` commits.
  2. Wait for a green Production Deploy.
  3. The orchestrator runs S6's migration on production, on the operator's word.
  4. Then the walkthrough.

  REVIEW drops D38–D40 once S25's frame is live. All nine design canvases become deletable once their
  surfaces ship; REVIEW raises that.
- **(from P29.S2, re-tagged by P30.DECOMP, for S28) What the bootstrap's `.claude/skills/explain/SKILL.md`
  must change:**
  - write native, not HTML;
  - send `book`, `chapter`, `lang`, `translated_from` and `assets`, with `format: "native"`;
  - on a re-explain, carry ids forward through `fetch_document`;
  - general mode: `#sources` becomes a `sources` block, and it publishes a loose document carrying
    `subject` by default, and a chapter only when a book is named;
  - the fixed five sections become the recommended outline;
  - translation keeps ids;
  - images are attached by name through the CLI's `--asset`, and images are no longer banned;
  - stop deleting `.agents/skills/explain/` (A3).

## (from P30.S7, for S8 onwards) Loading the fixture book

`scripts/publish_fixture_book.py` publishes the shared fixture book through the `knowledge` CLI (sources in `tests/fixtures/book/`, all invented text). What lands:
- project `fixtures`, book `fixture-guide` (kind `subject`), three chapters:
  - `all-blocks` (en): every block type, all six callouts, a diagram of every kind (flow, state, sequence, stack, timeline, chart bar/line/interval), an svg, a figure, a two-image figure row, a mixed row, every quiz type, `sources`; **two versions** (v1 a short draft, v2 the full chapter, ids kept);
  - `write-lock`: en and its `ko` translation (`translated_from en@1`, same ids and quiz ids);
  - `legacy`: one `html` chapter;
- a loose native document in project `fixture-finance`, carrying `subject: Fixture finance`.

To run it, start a throwaway API (never `:8766`, never production), then the script:
```
mkdir -p $ROOT/docs && git -C $ROOT init -q && git -C $ROOT commit -q --allow-empty -m init   # needs user.name/email
KB_ROOT=$ROOT KB_DB_PATH=$ROOT/data/kb.sqlite3 .venv/bin/uvicorn server.main:app --host 127.0.0.1 --port 8767
python3 scripts/publish_fixture_book.py --base-url http://127.0.0.1:8767
```
Legacy (single-tenant) mode with no `KB_API_TOKEN` on the server accepts any bearer; the script sends a throwaway one and an empty CLI config home. It refuses non-local hosts and stops when the book exists unless `--force`. Reset by pointing at a fresh `KB_ROOT`. Chapter URLs: `/api/books/fixtures/fixture-guide`, documents `1` (all-blocks), `2`/`3` (write-lock en/ko), `4` (legacy), `5` (loose) on fresh state.
For a tenant-mode stack (Postgres) use a `vk_` key from the stack as `--token`.

## (from P30.S11, for S13, S22 and every surface that links into the reader) URLs and the sign-in return address

- **Build every reader and book URL with `web/src/lib/reader-href.ts`**, never by hand:
  - `orgSegment(tenant)` = the slug, else the tenant id (OQ42);
  - `readerHref({kind: "chapter", org, project, book, chapter}, {lang?, version?, section?})` →
    `/@{org}/{project}/books/{book}/{chapter}?lang=&v=#section`; `{kind: "document", id, canonicalPath}`
    → `canonical_path`, else `/documents/{id}`;
  - `bookHref(...)` → `/@{org}/{project}/books/{book}`;
  - "Sign in to save" and the top bar's "Sign in" link to `signInToSaveHref(target, place)` (= `loginHref(readerHref(...))`),
    with the current lang, version (omit for the newest) and the section in view.
- **S13's route** `[org]/[project]/books/[book]/[chapter]` must accept `@{tenant-id}` as well as `@{slug}`:
  the server's book route resolves both. Keep the `[org]` pages' `@` guard.
- **Login:** `/login?next=` and `/signup?next=` are laundered once by `safeNextPath` and honoured after
  sign-in (hash included, the browser keeps it). Any guard that refuses a page should redirect to
  `loginHref(path)`, or rely on `requireSession`/`requireIdentity`, which read the proxy's
  `x-kb-request-path`. Public reads never redirect; only a save action prompts.
- **Live checks after S11:** a second `next dev` in `web/` is refused while the standing `:3030` runs
  (Next 16's one-dev-server lock). Clone `web/` (minus `.next`) with `cp -Rc` into the scratchpad and
  run it there on a spare port; `next build` and `next start -p <spare>` from `web/` are fine
  (dev output lives in `.next/dev`).

## (from P30.S12, for S13–S21, S25, S26 and REVIEW) The render pipeline as shipped

The code is `web/src/lib/native/` (server-only); the detail is in `slices/P30.S12/result.md`; the decisions are OQ46–OQ54 (`topics/operator-questions-decided.md`).

- **Render a chapter:** `<NativeChapter source={doc.source} format="native" lang={…} assetUrl={documentAssetUrl(id, doc.assets)} resolveRef={…} />` (from `@/lib/native`). md: `format="md"` with the md body and `baseUrl`. For your own shell use `validateChapter(source, format)` (→ `{refused, blocks: [{block, refused}], tree, parse}`) and `<ChapterView checked links>`. The tree is the README's; `sections(tree)` / `codePoints()` in `project.ts` are the anchor basis (identical to Python's, core test 4).
- **Hooks to style (S13+):** root `.kb-ch[data-format]`; headings `h2–h4.kb-ch-h#id[data-block]`; callouts `aside.kb-ch-callout[data-kind=note|important|warning|caution|skip|definition] > .kb-ch-callout__head (> .kb-ch-callout__type + .kb-ch-callout__title) + .kb-ch-callout__body`, collapsed = `details.kb-ch-callout[data-collapsed] > summary.kb-ch-callout__sum (head + .kb-ch-callout__toggle) + .kb-ch-callout__body` (S14); code `figure.kb-ch-code#id[data-lang] > figcaption.kb-ch-code__bar (> __title + __lang) + .kb-ch-code__wrap > pre.kb-ch-code__pre > code > span.kb-ch-code__ln > span.kb-tok.kb-tok-<token>` (the syntax colours are on the `kb-tok-*` classes; nothing is inline; a `text` fence is `.kb-ch-code--art`, an `ArtBox`) (S14); tables `div.kb-ch-table[--wide|--long] > .kb-ch-table__wrap > .kb-ch-table__scroll > table` with `.kb-ch-fade` and `.kb-ch-table__hint` (a `TableBox`), cells `[data-align]` (S14); lists `ul|ol[data-tight]`; figure `figure.kb-ch-figure[data-width] > img + figcaption.kb-ch-caption (.kb-ch-figure__credit)`; row `figure.kb-ch-figures[data-count] > .kb-ch-figures__row > figure.kb-ch-figures__item[data-kind]`, cards `.kb-ch-card[data-tone]`; diagram `figure.kb-ch-diagram[data-kind] > .kb-ch-diagram__body` (S17/S18 replace the body); svg `figure.kb-ch-svg > svg.kb-ch-svg__art[role=img][aria-label]` (ids scoped `<block-id>-<id>`); quiz `section.kb-ch-quiz > ol > li[data-type]#item-id` (S19's island replaces it); sources `section.kb-ch-sources#id > ol > li#source-id`; missing link `span.kb-link-missing[data-missing-link]`; missing image `span.kb-ch-image-missing[role=img]`; refused block `div.kb-ch-unshowable[role=note]`. Copy lives in `@/content` → `CHAPTER`.
- **A chart's kind is the block's `chart` key** (`bar|line|interval`); the block keeps `type: "diagram"` and `kind: "chart"` (OQ46, fixed by P30.F2 on both halves; `chartTable` reads `d.chart`). A figures row's inner chart carries `chart` too.
- **Links (S13):** pass `resolveRef`, built from `validateChapter(…).parse.refs` (kinds `chapter`/`doc`) pre-resolved with the reader's token; anything unresolved stays a missing link (never an href). Wrap `CHAPTER.missingLink` styling as the round draws the "missing link" style.
- **CSP (every surface):** `src/lib/csp.ts`. A new page under `/documents/…` or `/@…` runs under the nonce `script-src`: no inline `<script>`, no `on*=` attributes, no `javascript:` URLs; `next/script` and client islands are fine (Next stamps the nonce). Images must be same-origin or `data:` (the asset relay is). S25's legacy frame stays `frame-src 'self'` + the relay's sandbox CSP; a new relay route needs its own next.config entry AFTER the `/:path*` one.
- **For REVIEW (observations from S12, all fixed by P30.F2):** the choice-quiz `answer: [[a]]` 500 is now a 422 (`quiz-answer`); ids and slugs are matched with `fullmatch` (a trailing newline is `id-malformed`); OQ46's chart key moved. Nothing remains to file for these.

## (from P30.S13, for S16–S21, S22, S23, S25 and REVIEW) The reader shell as shipped

- **Where things are:** `web/src/components/reader/` (`reader-page.tsx` composes the shell around `reader-article.tsx`; `reader-frame.tsx` is the one client island: line, top bar, chapter bar, sheets, settings cookie, chrome and progress, section tracking, focus trap), `web/src/lib/reader/` (`load.ts` server-only: `loadChapterReader`, `loadLooseReader`; `chrome.ts`; `state-view.ts`; `types.ts`), tokens in `web/src/app/reader.css`, faces in `reader-fonts.css`, copy in `web/src/content/reader.ts`, cookie in `web/src/lib/reader-cookie.ts`.
- **S16–S21:** new blocks must keep the chrome's tap handling (`main`/`article` tap toggles; interactive children must stop propagation) and never put `position: fixed` inside a `container-type` ancestor.
- **S22/S23/S25:** `LIBRARY_HREF` lives in `reader-href.ts`; the "Book" link is dead until S23; html chapters redirect to the legacy frame until S25.
- **Every new page:** reader routes need the nonce'd `script-src` (`isReaderPath`); dev now uses `'self'` + nonce without `'strict-dynamic'` (OQ61).
- **Live-check runtime used:** production build `next start` on a spare port against a scratch API (throwaway DB), dev server from a scratchpad clone for the failed-state reload; `kb_reader` and `scroll-behavior` quirks: see OQ56, OQ62.

## (from P30.S14, for S16–S19 and REVIEW) The prose kit and chapter opening as shipped

- **Where things are:** `web/src/components/reader/chapter-head.tsx` (the opening, a server component; `publishedDate`), `versions-button.tsx` (client), `scroll-box.tsx` (client: `TableBox`, `ArtBox`), `web/src/lib/reader/hangul.tsx` (`hangulRuns`, `hangulParts`, `joinHyphens`, `isKorean`; pure, shared by server and client), the CSS in the last block of `web/src/app/reader.css` (everything under "P30.S14"), copy in `READER.opening` and `CHAPTER` (`calloutWord`, `newTab`, `drawing`, `tableBox`). `ChapterView` takes `omitTitle`; the renderer wraps Hangul runs when `lang` is not Korean.
- **S17–S19 (S16 is done):** S14 styled only the hooks the plan names. The diagram body and the quiz keep S12's plumbing plus a `lg×k` column margin and S12-era list bullets (the block of `reader.css` headed "Until S17–S19"); replace those, don't layer on them. Figures, svg and sources were S16's (below). The diagram figure (`figure.kb-ch-diagram`) already carries the block id, `aria-label` = its title and the column's width; S17/S18 replace its body, and its caption (`figcaption.kb-ch-caption`) has no look yet. Inline text anywhere in the chapter gets Hangul spans through `Renderer.text()`; use it for any new string you put in the tree (never for code or attributes).
- **Any new scrolling box:** reuse `useBox` in `scroll-box.tsx` (measure, scroll, resize, class change on `.rd-root`, fonts) and the `.kb-ch-fade` rules; a box that scrolls is `tabindex=0`, `role=region`, labelled, and carries the hint under it.
- **Live check setup that worked:** production build `next start` on a spare port against a scratch API on `:8767`+ and a scratch Postgres database; Aside for geometry and screenshots, the iframe harness (`scratchpad/harness.mjs`, `vp.sh`) for true narrow viewports, a CDP script over headless Chrome (`--remote-debugging-port`, a throwaway profile) for console/CSP capture (Aside records no console; `--dump-dom` ran no effects). In zsh an unquoted `$dim` does not split.

## (from P30.S15, for S16–S21, S22, S23, S24 and REVIEW) Progress and moving as shipped

The detail is in `slices/P30.S15/result.md`; the decisions are OQ69–OQ77 (`topics/operator-questions-decided.md`).

- **Where things are:**
  - `web/src/lib/reader/position.ts`: the pure rules (cadence, end-of-chapter, the unread hold, `max_fraction`, the write gate), tested in `web/tests/reader-position.test.ts`;
  - `web/src/components/reader/use-reading.ts`: the hook the frame calls (the resume restore and pill, the cadence, the end sentinel, the beacon, `mark`, `flush`);
  - `reader-progress.tsx`: the context the article's client parts read (`member`, `saves`, `state`, `signInHref`, `mark`, the chapter rows as they read NOW, `finishedCount`). It wraps only `.rd-article`, so a new client component inside the chapter (a quiz, a highlight menu) can `useReaderProgress()`;
  - `chapter-end.tsx`, `version-list.tsx`;
  - `web/src/lib/reader/actions.ts`: the server action `saveReaderPosition` (the pattern for S19/S20/S21's writes: `getSession()`, a strict zod body, `{ok}`, no throw);
  - `ReaderPage` keys the frame by document and version.
- **`view.write` and `view.progress`:** `write` = `{org, project, doc}` is the address every reader-state write needs (null for a loose document of a slug-less owner: save nothing); `progress` = `{state, finishedVersion, maxFraction, resume}` for a member, null for the signed-out. `view.versions` is the Version history rows.
- **The sheets:** the opening's button announces `reader:open-sheet` `{sheet: "versions", opener}`; the frame's listener handles only `versions` (and ignores an event when `view.versions` is null). A new sheet (S20/S21) adds its own `Panel` name and event the same way; focus goes to Close and returns to `opener`.
- **A new id'd block owes the position its `data-block`.** The reader samples `.rd-article [data-block]` for the position and restores to `[data-block="<id>"]`; S12's renderer already stamps it on every id'd block. A block without it can be neither saved as a place nor jumped to.
- **Everything that writes goes through a member-only guard:** a write for the signed-out is `{ok: false}` and a refused one is undone in the UI (the end, the marks). Test member writes at the TOP level in Aside or headless Chrome: writes made inside the iframe harness did not reach the server (observed: a chapter that showed Finished there was unfinished on the server; probably Next's server-action origin check, as the page's Origin is the harness port and the proxied Host the app's; not isolated), so the harness is for layout only.
- **For REVIEW (server observation, not built around):** Mark as unread resets only the variant's own row; a chapter finished in another language is still `finished` for the unit (`_unit_state`: any finished variant), so after Mark as unread on English the Korean variant's state keeps the chapter finished. Whether unread should reset every variant of the unit is a server decision (P29 *Resume and progress* says "resets the chapter"); the page shows what the server holds.
- **Live check setup that worked:** the S14 setup, plus `scratchpad/s15/cdp15.mjs` (headless Chrome, a throwaway profile, logs in through the page, runs a JSON scenario of real `Runtime.evaluate` steps and prints console, CSP and POSTs) and `st.sh` (the member's server-side state of a chapter with `curl`). `next dev` from a clone must be opened at `http://localhost:<port>` (on `127.0.0.1` Next 16 dev refuses the HMR socket and the page never hydrates).

## (from P30.S16, for S17–S21, S22, S25, S26 and REVIEW) Figures and sources as shipped

The detail is in `slices/P30.S16/result.md`; the decisions are OQ78–OQ82 (`topics/operator-questions-decided.md`).

- **Where things are:**
  - markup: `web/src/lib/native/render.tsx` (`figure`, `figures`, `card`, `svgBlock`, `svg`, `sources`, `sourceBack`, `citation`, `paragraph`/`plainImage`, `imageBox`). The signed `fg-*` class names replace S12's `kb-ch-figure*`/`kb-ch-card`/`kb-ch-svg`/`kb-ch-sources`; `kb-ch-diagram`, `kb-ch-caption`, `kb-ch-quiz*` are untouched;
  - `web/src/lib/native/cites.ts`: `planCitations(blocks)` (a WeakMap keyed by the link NODE, so a renderer asks "is this link a citation?" of the very object; each source's citations with the nearest top-level h2) and `letters()`;
  - `web/src/lib/native/links.ts`: `resolveAsset(name, ctx)` and `documentAssets(docId, assets)` (a name to `{url, width, height, animated, stillUrl}`); pass `assetInfo` to `ChapterView`/`NativeChapter` (the three read pages do); `assetUrl` still works but sizes nothing;
  - `web/src/components/reader/figure-parts.tsx` (client): `ImageBox` (loading to `is-loaded` on `load` or when `img.complete` at hydration; `error` swaps to the missing box), `MissingBox`, `ScrollFigure` (measured overflow through `useBox`, exported from `scroll-box.tsx` with a `watchLoad` flag for a wide figure's image);
  - CSS: the last block of `web/src/app/reader.css` ("P30.S16").
- **For S17/S18 (diagrams):** the tones are `--dg-<tone>` (line), `--dg-<tone>-ink`, `--dg-<tone>-tint` on the reader root per theme (light, slate, sepia, system dark and print), exactly `03-diagrams`' `diagram.css`; the 13 names and the aliases (`accent`=`series-1` …) are all defined, so a diagram reads them directly. A row's diagram item is `figure.fg-item > div.kb-ch-diagram` + `figcaption.fg-figcap`; replace the diagram body inside the `div` (it takes `margin: 0` in a row). A standalone diagram keeps S12's `figure.kb-ch-diagram` + `figcaption.kb-ch-caption`.
- **A new id'd block** still owes `data-block`: every block here has it (the figure, the row, the `svg` block, the plain image, the sources list); a source ITEM carries only its id.
- **Style attributes:** the figures emit `style="--fg-w:…;--fg-h:…"` and `style="--fg-vbw:…;--fg-minw:…px"` (numbers only); the S12 test now allows exactly that and still refuses any other `style`. `style-src` is open, so no CSP change.
- **Live-check setup that worked:** the production build `next start` (`:3081`) and a dev clone (`:3083`, opened at `localhost` for the HMR socket; its `node_modules` had to be a real copy, a symlink out of the clone is refused) against a scratch API (`:8781`, database `kb_s16live`), a public `fixtures` project for anonymous reads, my own chapter (`scratchpad/s16/figs.md`) with generated PNG/GIF assets published through `knowledge save --asset`; a missing image is a stored file deleted from `<root>/tenants/<tenant>/.assets/…`; Aside + the iframe harness for geometry and screenshots, a CDP script (`cdp16.mjs`, with `Emulation.setEmulatedMedia` for reduced motion and real key events) for console, CSP, keyboard and reduced motion.


## (from P30.S17, for S18 and REVIEW) Diagram drawings I as shipped

The detail is in `slices/P30.S17/result.md`; the decisions are OQ83–OQ86 (`topics/operator-questions-decided.md`).

- **Where things are:**
  - `web/src/lib/native/diagram-layout.ts` (`layoutGraph(spec, "flow"|"state")` returns `{W, H, prims, nodes, edges, init}`, a port of the canvas's `dggraph.js`; `layoutSequence` is NOT ported yet: S18 ports it from `dggraph.js` lines 598-697);
  - `diagram-text.ts` (`measure`, `wrap`, `wrapBalanced`, the four faces `LABEL`/`SMALL`/`SMALL_B`/`MONO`);
  - `diagram-metrics.ts` (GENERATED; do not hand-edit; `web/scripts/gen-diagram-metrics.py`; it holds Source Sans 3, JetBrains Mono and Pretendard only);
  - `diagram-draw.tsx` (`Drawing` turns prims into the SVG with `--dg-vbw`/`--dg-floor`, `graphSpec`, `graphAlt`);
  - `web/src/components/reader/diagram-figure.tsx` (the client frame: `tag` figure or div, title, scroll box through `useBox`, fades, hint, hidden alternative, caption);
  - CSS: the last block of `reader.css` ("P30.S17"), canvas class names (`dg-*`, `dg__*`), the drawn-kind classes incl. `.dg-note`, `.dg-life`, `.dg-t--num` that sequence needs;
  - copy: `CHAPTER.diagram` (`hint`, `aria`, `alt.*`).
- **For S18:** `Renderer.isDrawn(d)` picks the kinds with the new frame (flow, state); extend it and `drawn()` (add a `layoutSequence` call, the sequence alternative is an `<ol>`, `"{a} to {b}: {label}"`), and the row kinds (stack, timeline, chart) are HTML in `em` inside the same `DiagramFigure` (pass them as `drawing`; they have no `--dg-vbw` and carry their own min width). `diagramBody` and the `kb-ch-diagram__*` styles go when the last kind moves. The title id is `dg-title-<n>` from `Renderer.dgCount`.
- **Live-check setup that worked:** scratch API `:8791` (database `kb_s17live`), `next start` `:3791`, a dev clone `:3793` (opened at `localhost`), the anonymous harness `:3792`; scripts and the diagram test chapter generator (`mk.mjs`, from the canvas's `dgdata.js` samples) in the session scratchpad `s17/`. Headless Chrome (CDP) raw ArrowRight events do not scroll a box; Aside's `page.keyboard.press` does.

## (from P30.S18, for REVIEW and S19) Diagram drawings II as shipped

The detail is in `slices/P30.S18/result.md`; the decisions are OQ87–OQ92 (`topics/operator-questions-decided.md`).

- **Where things are:** `web/src/lib/native/diagram-sequence.ts` (`layoutSequence`, a port of the canvas's, drawn by S17's `Drawing`); `diagram-rows.ts` (the numbers for stack, timeline and chart: `buildStack`, `buildTimeline`, `buildChart`, `niceTicks`, `fmt`, `nudge`, the data table); `diagram-kinds.tsx` (`diagramParts(d, kind, text, lead)` returns `{drawing, alt}` for all six kinds; `kindOf` is the unknown-kind-as-flow fallback); the row kinds' CSS is the last block of `reader.css` ("P30.S18").
- **Style rule:** every inline style is a number set as a `--dg-<letters>` custom property; a new row-kind position needs a variable and a CSS rule, never a style string. The reader's `.kb-ch ul/li` rules are more specific than a bare class: any list inside a drawing needs the `.dg` prefix (OQ88).
- **Source keys:** a chart's source key is `type: bar|line|interval` (the tree key is `chart`); a timeline lane needs `bars: []` when it has only marks (OQ90, a contract observation for REVIEW).
- **Dev server:** a long-running `next dev` clone can print a stray React "unique key" warning after hot reloads (it did here, then showed none on a fresh start and on the production build); check console on a fresh start.
- **Live-check setup that worked:** scratch API `:8811` (database `kb_s18live`), `next start` `:3811`, dev clone `:3813`, anonymous harnesses `:3812`/`:3814` and a cookie-keeping one `:3815` (text sizes through the `kb_reader` cookie); scripts and the chapter generator (`mk.mjs`, from the canvas's `dgdata.js` samples) in the session scratchpad `s18/`.

## (from P30.S19, for S20, S22, S24 and REVIEW) The quiz as shipped

The detail is in `slices/P30.S19/result.md`; the decisions are OQ93-OQ98 (`topics/operator-questions-decided.md`).

- **Where things are:**
  - `web/src/lib/reader/quiz.ts`: the pure rules (grading, `reduce`, the foot's words, `landSend`, provenance and drift notes, `shapeOf`), tested in `web/tests/reader-quiz.test.ts`;
  - `web/src/components/reader/quiz.tsx`: the island (`QuizBlock`, `ClozeBlank`), the chapter's only client island; the renderer (`render.tsx` → `quiz()`, `clozeRun()`) hands it the items as data (`spec`, with the key) plus rendered inline Markdown as props;
  - `web/src/lib/reader/quiz-saved.ts` (server-only): what each saved answer shows on return (graded with its provenance, or fresh with a note); `load.ts` fills `LoadedReader.quiz`; `ReaderArticle` builds `QuizViewContext` (member, `write`, version, place, the sign-in address) and `ChapterView` takes it as `quiz`;
  - the write: server action `saveQuizAttempt` in `lib/reader/actions.ts` over `postQuizAttempt` in `lib/knowledge/reader.ts` (the client's UUID is the idempotency key; the reply's `attempt` words the save line);
  - CSS: the last block of `reader.css` ("P30.S19"), every rule `.kb-ch`-prefixed; the option's border is `--rd-control-edge`.
- **For S20/S24:** a block that wants the same pattern (state in one island, content as server-rendered props) can copy `QuizBlock`; the review surface re-asks `choice`/`cloze` with the same `gradeItem`/`norm`. No review entry from the quiz (D42).
- **A page that renders `NativeChapter`/`ChapterView` without `quiz`** (the older `/documents` pages) still answers and grades but saves nothing and offers no sign-in.
- **Live-check setup that worked:** the S18 setup (scratch API `:8821`, database `kb_s19live`, `next start` `:3821` + a dev clone `:3823` at `localhost`, anonymous and signed-in harnesses) plus `scratchpad/s19/cdp19.mjs` (headless Chrome, real mouse and keyboard events via CDP, `LOGIN=1` signs in, JSON scenarios, prints POSTs, console and CSP); publishing a v2 with a changed item shape tests drift; killing the scratch API tests "Not saved".

## (from P30.S20, for S21, S24 and REVIEW) Annotations I as shipped

The detail is in `slices/P30.S20/result.md`; the decisions are OQ99-OQ110 (`topics/operator-questions-decided.md`).

- **Where things are:**
  - `web/src/lib/reader/anchor.ts` (pure): `capture(root, bounds, sections)` turns a DOM selection into `{passage: sec, s, e, clipped, quote{exact,prefix,suffix}} | {block: sec} | refuse`; `segments`/`verified` read the stamps; `slicesIn`/`pointAt` map offsets back to DOM points (the paint uses them). Tested against Python in `web/tests/reader-anchor.test.ts` (every accept fixture plus `fixtures/anchor-mixed.txt`, generated by Python `format_sections`).
  - The renderer (`lib/native/render.tsx`, `anchorStamps`) stamps each passage container (`p`, callout title, `th`/`td`, each code line) with `data-tx` (p|code), `data-sec`, `data-base`, only when its text equals the projection; `data-an-skip` marks text that is not the author's (" · new tab", sr-only missing-link text, a citation's `[n]`, image boxes, cloze blanks); `data-an-len="N"` lets a bare citation's `[n]` stand for N characters. **A new inline element that prints text of its own must carry `data-an-skip`, or capture refuses that container** (safe, but no highlights there).
  - `lib/reader/paint.ts`: `paint(root, sections, {ranges, pending, active, desc})` and `unpaint` (`mark.an-m[--2][--note][.is-active]`, `mark.an-pending`); the first piece of each highlight outside a link is the round-02 tab stop (`data-an-key`).
  - `components/reader/annotations.tsx`: `AnnotationLayer({notes, write, version, lang, chapterTitle, place})`, mounted by `ReaderArticle` after `ChapterEnd` for a native chapter when the reader is signed out or has somewhere to write. It owns selection, the bar, the popover (modes hl, new, bnote, bnew, choose), the undo line and the 401 Sign in to save (both portalled into `.rd-root`, because `.rd-page` is a container and traps `position: fixed`), and the write queue.
  - Data: `lib/reader/notes-load.ts` (server-only) builds `ReaderNotes {sections, items, unanchored}` from the read's `annotations`; `load.ts` → `LoadedReader.notes`. Writes: `saveAnnotation`/`editAnnotation`/`removeAnnotation` in `lib/reader/actions.ts` over `lib/knowledge/reader.ts`.
  - `lib/reader/chrome.ts` `TAP_IGNORE` includes `.an-layer`; `reader-frame.tsx` listens for `reader:quiet` (the layer fires it before revealing a low popover).
- **For S21:** consumed; see *Annotations II as shipped* below.
- **Live-check setup that worked:** scratch API `:8831` (database `kb_s20live`, dropped after), `next start` `:3831` and a dev clone `:3832` at `localhost`; `scratchpad/s20/cdp20.mjs` (headless Chrome over CDP, throwaway or `PROFILE=` profile, real mouse, touch and key events, prints writes, console and CSP) with scenarios `s1`-`s5`; theme and size go through the `kb_reader` cookie (`size=N&theme=light|dark|sepia|system`), never by editing `.rd-root`'s class (React puts it back); the web's login is limited to a few tries per 15 minutes per server process, so reuse one profile; `scratchpad/s20/verify.py` checks every stored row against Python's projection and the S9 ladder.

## (from P30.S21, for S22, S24, S25 and REVIEW) Annotations II as shipped

The detail is in `slices/P30.S21/result.md`; the decisions are OQ111-OQ124 (`topics/operator-questions-decided.md`).

- **Where things are:**
  - `lib/reader/note-list.ts` (pure, tested in `web/tests/reader-note-list.test.ts`): `buildGroups` (the sheet's groups, never drops a mark), `rowView`, `groupBook`/`bookCountLine`/`bookCounts`, `positionNear` (2%);
  - `components/reader/annotation-parts.tsx` (BookmarkButton, PlaceBar, margin item, row), `note-row.tsx` (a list row and its label field), `notes-panel.tsx` (the sheet's Notes view), `reader-notes.tsx` (`NotesBridgeContext`: the frame hands the layer the sheet body, the layer reports its count); `reader-frame.tsx` owns the Contents|Notes switch (`Panel` = contents | notes | display);
  - `annotations.tsx` now also owns bookmarks (optimistic, `bm-save/bm-edit/bm-remove` through the same queue), the margin rail (from 64rem), rows under headings (below), the "Bookmarked" tag, the place bar, and `?note=` landing;
  - the per-book list: `app/(public)/[org]/[project]/notes/[book]/page.tsx` + `components/reader/book-notes.tsx` + `lib/reader/book-notes-load.ts` (server-only; S9's per-book read). The address helper is `bookNotesHref` in `lib/reader-href.ts`; S22's book page must link to it with `{from: "book"}`;
  - server: `GET` annotation reads carry `card` ("active" | "suspended" | ""), `review` is `card == "active"`; `review.highlight_card_status`.
- **Gotchas:**
  - DOM the layer injects into the chapter (`.an-rows` hosts, the `[data-an-tag]` tag) is created in a layout effect; its cleanup must be a layout effect declared BEFORE it (a passive cleanup runs after the sync and removes what it just made: found live, rows were missing on a fresh load);
  - a list row's label field unmounts its focused input: focus returns to the opener, else the sheet's Escape and Tab trap stop working;
  - signed-out and legacy html: the layer is `layerOn(reader)` (`lib/reader/layer.ts`); a legacy html chapter has none, so its bar needs S25's bookmark control and the line "Highlights are not available in this document.";
  - the web's login throttle is per server process (5 per 15 min): restart `next start` between scenarios or reuse one session.
- **Live-check setup that worked:** scratch API `:8841` (database `kb_s21live`, dropped), `next start` `:3841` on the production build only (no dev clone this slice), `scratchpad/s21/cdp21.mjs` (CDP driver) with `run.sh <scenario>` (restarts `next start` first), a second chapter version published from `scratchpad/s21/write-lock.en.v2.md` for Text changed / Unanchored, Aside `u1` for one signed-in pass.



## (from P30.S22, for S23, S24, S25 and REVIEW) The library as shipped

The detail is in `slices/P30.S22/result.md`; the decisions are OQ125-OQ135 (`topics/operator-questions-decided.md`).

- **Where things are:**
  - pages: `app/(app)/library/` (page, loading, error) and `app/(public)/[org]/(library)/` (layout = the shell, page, loading, error, not-found; the group holds only `/@{org}`, the graph and reader routes keep theirs);
  - `components/library/` (`library-view.tsx` composes; `shelves.tsx` and `clear-all.tsx` are the client islands), `lib/library/` (`model.ts` pure and tested in `web/tests/library-model.test.ts`; `continue.ts` Continue reading composed in the BFF; `load.ts`; `due.ts` the Review count; `actions.ts` Clear all), copy in `content/library.ts`, CSS in `app/library.css` (the shell additions, the roles, `lib-*`);
  - server: `GET /app/orgs/{org}/library?scope=` (`books_api.py`, `db.list_loose_documents`; optional identity; `scope=public` narrows a member to the public view; one 404 for every miss) and `updated` (finished chapters on an older version) on each book of `GET /app/reader/library`.
- **For S23 (the book page):** the library's cards link to `bookHref(...)` = `/@{org}/{project}/books/{book}` and Continue / rows to the reader; that route does not exist yet, so prefetches log 404s in the console until S23 ships. Link "Notes in this book" with `bookNotesHref(..., {from: "book"})`.
- **For S24 (review):** the shell's Review item links to `/review` (a not-found until S24) and wears `reviewDue()` (`lib/library/due.ts`, `GET review/queue?limit=1` → `counts.due`, a fault is 0, read once per request in `AppShell`). `/review` should be `aria-current` automatically.
- **The shell is shared:** the Reading group, the 44 px targets, the count pill, `kb-secondary` on the topbar user line and the rail eyebrow, and `kb-accent-strong` on the current rail item apply on every `(app)` page; the round-02 ghost edge (`--lib-ghost-edge`) is scoped to pages that carry `[data-lib]` (`.kb-app:has([data-lib])`), the round's Q1 (a); a console-wide edge is D45.
- **Gotchas:** the web login throttle is per `next start` process (5 per 15 min): restart between scenarios; a scroll made with `scrollIntoView` before reading a rect needs `behavior: 'instant'` (`scroll-behavior`); a JS `.click()` does not move focus, so check focus with real mouse events.
- **Live-check setup that worked:** scratch API `:8851` (database `kb_s22live`, dropped), a pass-through proxy `:8852` that fails or slows the library listing and the clear on a flag file (`scratchpad/s22/proxy.mjs`), `next start` `:3851` on the production build, `scratchpad/s22/cdp22.mjs` (headless Chrome over CDP, real mouse/key, `Emulation.setDeviceMetricsOverride` for true narrow viewports and `setEmulatedMedia` for the dark scheme), `state.py` to seed positions, Aside `u1` for one signed-in pass at 1440.

## phase.md pointer lines as they stood before P30.S22 (word for word; shortened there)

- **(from P30.S12, for S25, S26 and REVIEW) The render pipeline as shipped** (how to render a
  chapter, the `kb-ch-*` hooks and `kb-tok-*` classes, the chart's own `chart` key (OQ46, fixed by P30.F2), `resolveRef` for links, the
  CSP rules every new page must keep, and the S12 observations, all fixed by P30.F2): `topics/notes-later.md` →
  *The render pipeline as shipped*.
- **(from P30.S13, for S22, S23, S25 and REVIEW) The reader shell as shipped** (where things are, tap and fixed-position rules, dev CSP): `topics/notes-later.md` → *The reader shell as shipped*.
- **(from P30.S14, for REVIEW) The prose kit and chapter opening as shipped** (where things are, what S18–S19 replaced, the scroll-box reuse, the live-check setup): `topics/notes-later.md` → *The prose kit and chapter opening as shipped*.
- **(from P30.S15, for S22, S23, S24 and REVIEW) Progress and moving as shipped** (the reader's memory, the context the end reads, `view.write`/`view.progress`, the sheet event, what a new id'd block owes the position, the harness limit on writes, the server observation for REVIEW): `topics/notes-later.md` → *Progress and moving as shipped*.
- **(from P30.S16, for S22, S25, S26 and REVIEW) Figures and sources as shipped** (where things are, the `--dg-*` tone variables S17/S18 read, a row's diagram slot, `data-block`, the style attributes, the live-check setup): `topics/notes-later.md` → *Figures and sources as shipped*.
- **(from P30.S17 and P30.S18, for REVIEW) Diagram drawings as shipped** (S17: frame, flow, state, the generated metrics; S18: sequence, stack, timeline, chart, the `--dg-*` style rule, the `.dg` list-prefix rule, the live-check setup): `topics/notes-later.md` → *Diagram drawings I as shipped* and *Diagram drawings II as shipped*.
- **(from P30.S19, for S22, S24 and REVIEW) The quiz as shipped** (the island, what it takes from the reader, the save and return rules, the BFF action, the live-check setup): `topics/notes-later.md` → *The quiz as shipped*.
- **(from P30.S20, for S24 and REVIEW) Annotations I as shipped** (where things are, the `data-tx` stamps and the `data-an-skip` rule for new inline text, the layer and its API; the live-check setup): `topics/notes-later.md` → *Annotations I as shipped*.
- **(from P30.S21, for S22, S24, S25 and REVIEW) Annotations II as shipped** (where things are, the layer-injected DOM and focus gotchas, S22's link to the per-book list, S25's legacy bar, the live-check setup): `topics/notes-later.md` → *Annotations II as shipped*.

## (from P30.S23, for S24, S25 and REVIEW) The book page as shipped

The detail is in `slices/P30.S23/result.md`; the decisions are OQ136-OQ146 (`topics/operator-questions-decided.md`).

- **Where things are:**
  - route: `app/(public)/[org]/[project]/books/[book]/` (page, loading, error, not-found; the `[chapter]` route below it keeps its own);
  - `components/book/` (`book-page.tsx` composes the head and Continue; `book-frame.tsx` the reader's root at size 3 and the theme from the `kb_reader` cookie; `book-top.tsx` the bar; `top-mid.tsx`, `chapter-rows.tsx` and `clear-data.tsx` are the client parts; `book-states.tsx`);
  - `lib/book/` (`model.ts` pure and tested in `web/tests/book-model.test.ts`: the Continue table, order, shape, stale translation; `load.ts` server-only; `view.ts` the plain view model; `actions.ts` the clear), copy in `content/book.ts`, CSS in `app/book.css` (the canvas's `book.css` plus the ghost button);
  - no server change: the page composes `getBook`, `getReaderBook` (now typed with `continue`, `updated`, `counts`), `getReaderBookNotes`, and `getDocument`/`getDocumentVersions` for the version dates, a chapter's lede and the stopped-at section.
- **What links where:** the library's cards, the chapter's "‹ Book" and "Back to the book →", the per-book list's back link (`?from=book`) all land on the page now. "Notes in this book →" opens `bookNotesHref(..., {from: "book"})`; a row opens the chapter in `readerHref`.
- **Gotchas:**
  - **`loading.tsx` and the nonce:** Next renders a `<script async>` WITHOUT the nonce for every client chunk a `loading.tsx` (also `error.tsx`/`template.tsx`) reaches, which the `strict-dynamic` CSP blocks, one console error per load. Keep the loading file's import graph free of client modules, `next/link` included (`BookTop` is plain anchors, the scroll-watched `TopMid` is passed in by the page). Found live; the chapter route escapes it only because its chunks are already injected;
  - the not-found and failed states are HTTP 200 (the loading boundary has streamed), as on the chapter route; `noindex` is set;
  - a page read before another tab reads a chapter is not live: after reading, going back may show the old progress until the next request (no `pageshow` re-read; REVIEW observation).
- **For REVIEW:** version rows all show the document's one publication date (OQ139; no per-version publish date on the wire); Tidewater's chapter 7 legacy row, an all-legacy book and larger-text (175-200%) reflow were not verified; the phone's top-bar middle at 20 chapters was.
- **Live-check setup that worked:** scratch API `:8871` (database `kb_s23live`, dropped), a pass-through proxy `:8872` that fails or slows the book read and the clear on flag files (`scratchpad/s23/proxy.mjs`), `next start` `:3871` on the production build, `scratchpad/s23/cdp23.mjs` (headless Chrome over CDP: real mouse and keys, `setDeviceMetricsOverride` for true narrow viewports, `setEmulatedMedia` for dark and reduced motion), `seed23.py` (the guide with a stale Korean translation and a chapter on v3, Tidewater's 20 chapters with a description, `lantern`'s phases and per-slice books) and `state.py` (seeds positions), Aside `u1` for one signed-in pass at 1440.

## (from P30.S24, for S25 and REVIEW) The review surface as shipped

- **What shipped:** `/review` (a focused frame of the reader's family: `rd-root`, a fixed top bar with the logo, "‹ Library", Settings and Display, no app shell), signed in only. `app/review/{layout,page,loading,error}.tsx` (the layout holds the `requireIdentity` guard above `loading.tsx`; the page reads the first queue and, on an end state, the continue pointer), `components/review/` (`review-app.tsx` the island holding all state in a ref-mirrored `set()`; `card.tsx` the quiz and highlight cards and the foot; `queue-head.tsx`; `end.tsx`; `settings.tsx`; `skeleton.tsx`; `inline.tsx`; `review-static.tsx` the loading frame with no client import), `lib/review/` (`model.ts`, `foot.ts` pure; `actions.ts` server actions; `types.ts`, `spec.ts` the card → `QuizSpec` map, `cx.ts`), `content/review.ts` (every string), `app/review.css`. Test: `web/tests/review-model.test.ts` (11 tests: interval formatting, `review_id` reuse, the local queue after a rating, which end state, the next-due text).
- **No server change.** `lib/knowledge/reader.ts` gained `getReviewQueue`, `postCardReview`, `patchReviewCard`, `patchReaderProfile`.
- **Gotchas:**
  - **`className` template strings:** write a class list with `cx("a", on && "b")` (`lib/review/cx.ts`), never `` `a${on ? " b" : ""}` `` (a missing space turns `qz-st is-off` into `qz-stis-off`, silently; found live: the foot showed every sentence at once);
  - **a `"use server"` module exports only async functions** (types are fine), so `actions.ts` keeps its constants private;
  - **`loading.tsx` and the nonce** as S23 found: `ReviewStatic` imports no client module; the segment's guard sits in the layout, above the loading shell (which otherwise streams a 200 before the page's redirect);
  - **React Compiler lint** refuses a `useCallback` it cannot preserve: a plain function is fine;
  - the web login limiter answers 429 after a handful of sign-ins in a few minutes: a live check that signs in per run needs to reuse one session or wait (about 3 minutes).
- **For REVIEW (observations, not defects):** a card rated Again in the same session comes back at the END of the local queue (the server's `due_today`); no route lists or un-suspends a suspended card beside Undo (D41); the quiz → review entry is D42; Undo of a suspend after a reload is gone with the toast; the draft of a settings form is lost if the sheet is closed; real iOS keyboard not checked (a 390×520 viewport stands in); print not checked; sepia is checked on the card and the highlight, the end states are checked in light only.
- **Live-check setup that worked:** scratch API `:8881` (database `kb_s24live`, dropped), a pass-through proxy `:8882` that fails, slows or LOSES the reply of the queue, rating, status, profile and continue calls on flag files (`scratchpad/s24/proxy.mjs`), `next start` `:3881` on the production build, `scratchpad/s24/cdp24.mjs` (headless Chrome over CDP: real mouse and keys, `setDeviceMetricsOverride`, `setEmulatedMedia`), `seed24.py` (eight quiz cards across single, multiple, cloze (one and two blanks), recall (Korean), five highlights with a 500-character note and a Korean one) and `reseed.sh` (resets the state, re-seeds, back-dates the due times), Aside `u1` for a signed-in pass at 1440.
