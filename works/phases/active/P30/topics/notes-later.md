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
- **S22:** the default landing is `DEFAULT_NEXT_PATH` in `web/src/lib/next-path.ts` (`/dashboard`); moving
  it to `/library` there moves every fallback at once (`loginHref` then also omits `next=/library`).
- **Live checks after S11:** a second `next dev` in `web/` is refused while the standing `:3030` runs
  (Next 16's one-dev-server lock). Clone `web/` (minus `.next`) with `cp -Rc` into the scratchpad and
  run it there on a spare port; `next build` and `next start -p <spare>` from `web/` are fine
  (dev output lives in `.next/dev`).

## (from P30.S12, for S13–S21, S25, S26 and REVIEW) The render pipeline as shipped

The code is `web/src/lib/native/` (server-only); the detail is in `slices/P30.S12/result.md`; the decisions are OQ46–OQ54 (`topics/operator-questions-decided.md`).

- **Render a chapter:** `<NativeChapter source={doc.source} format="native" lang={…} assetUrl={documentAssetUrl(id, doc.assets)} resolveRef={…} />` (from `@/lib/native`). md: `format="md"` with the md body and `baseUrl`. For your own shell use `validateChapter(source, format)` (→ `{refused, blocks: [{block, refused}], tree, parse}`) and `<ChapterView checked links>`. The tree is the README's; `sections(tree)` / `codePoints()` in `project.ts` are the anchor basis (identical to Python's, core test 4).
- **Hooks to style (S13+):** root `.kb-ch[data-format]`; headings `h2–h4.kb-ch-h#id[data-block]`; callouts `aside.kb-ch-callout[data-kind=note|important|warning|caution|skip|definition]` with `.kb-ch-callout__title`, collapsed = `details.kb-ch-callout[data-collapsed] > summary`; code `figure.kb-ch-code#id[data-lang] > figcaption.kb-ch-code__title + pre > code > span.kb-tok.kb-tok-<token>` (define the `--kb-code-*` colours on these classes; nothing is inline); tables `div.kb-ch-table[role=region] > table`, cells `[data-align]`; lists `ul|ol[data-tight]`; figure `figure.kb-ch-figure[data-width] > img + figcaption.kb-ch-caption (.kb-ch-figure__credit)`; row `figure.kb-ch-figures[data-count] > .kb-ch-figures__row > figure.kb-ch-figures__item[data-kind]`, cards `.kb-ch-card[data-tone]`; diagram `figure.kb-ch-diagram[data-kind] > .kb-ch-diagram__body` (S17/S18 replace the body); svg `figure.kb-ch-svg > svg.kb-ch-svg__art[role=img][aria-label]` (ids scoped `<block-id>-<id>`); quiz `section.kb-ch-quiz > ol > li[data-type]#item-id` (S19's island replaces it); sources `section.kb-ch-sources#id > ol > li#source-id`; missing link `span.kb-link-missing[data-missing-link]`; missing image `span.kb-ch-image-missing[role=img]`; refused block `div.kb-ch-unshowable[role=note]`. Copy lives in `@/content` → `CHAPTER`.
- **A chart's kind is the block's `chart` key** (`bar|line|interval`); the block keeps `type: "diagram"` and `kind: "chart"` (OQ46, fixed by P30.F2 on both halves; `chartTable` reads `d.chart`). A figures row's inner chart carries `chart` too.
- **Links (S13):** pass `resolveRef`, built from `validateChapter(…).parse.refs` (kinds `chapter`/`doc`) pre-resolved with the reader's token; anything unresolved stays a missing link (never an href). Wrap `CHAPTER.missingLink` styling as the round draws the "missing link" style.
- **CSP (every surface):** `src/lib/csp.ts`. A new page under `/documents/…` or `/@…` runs under the nonce `script-src`: no inline `<script>`, no `on*=` attributes, no `javascript:` URLs; `next/script` and client islands are fine (Next stamps the nonce). Images must be same-origin or `data:` (the asset relay is). S25's legacy frame stays `frame-src 'self'` + the relay's sandbox CSP; a new relay route needs its own next.config entry AFTER the `/:path*` one.
- **S16:** the asset map is on `KbDocument.assets` / `KbDocumentVersion.assets` (`KbAsset`); `documentAssetUrl` maps a name to `/api/documents/{id}/assets/{file}`; the `<img>` has no width/height yet (S16 sizes it from the map).
- **For REVIEW (observations from S12, all fixed by P30.F2):** the choice-quiz `answer: [[a]]` 500 is now a 422 (`quiz-answer`); ids and slugs are matched with `fullmatch` (a trailing newline is `id-malformed`); OQ46's chart key moved. Nothing remains to file for these.

## (from P30.S13, for S14, S15, S16–S21, S22, S23, S25 and REVIEW) The reader shell as shipped

- **Where things are:** `web/src/components/reader/` (`reader-page.tsx` composes the shell around `reader-article.tsx`; `reader-frame.tsx` is the one client island: line, top bar, chapter bar, sheets, settings cookie, chrome and progress, section tracking, focus trap), `web/src/lib/reader/` (`load.ts` server-only: `loadChapterReader`, `loadLooseReader`; `chrome.ts`; `state-view.ts`; `types.ts`), tokens in `web/src/app/reader.css`, faces in `reader-fonts.css`, copy in `web/src/content/reader.ts`, cookie in `web/src/lib/reader-cookie.ts`.
- **S14:** the prose is a `.rd-prose` wrapper around `ChapterView`; `reader.css` carries a legibility stand-in for `.rd-prose .kb-ch` and the native `.rd-title` (`h1`) that S14 replaces with the prose kit and chapter opening. Headings and any `[id]` block carry `scroll-margin-top` to clear the bars. Wide tables/code are contained by the stand-in (`display:block; overflow-x:auto`); keep that in the real kit.
- **S15:** the Contents sheet already renders the full `ChapterList` (state, progress, "Reading now", the `ORIGINAL LAYOUT` chip, in-chapter sections); S15 adds chapter end, the resume pill, Version history's content and position writes. Section tracking (the active heading) and `progressPercent` are in the frame, reusable for position writes. `SignInToSave` (`components/reader/sign-in-to-save.tsx`) is built and verified on a throwaway page but rendered nowhere yet: S15 mounts it (anonymous). The `?lang=` switch preserves the hash best-effort; S15 refines the section mapping.
- **S16–S21:** new blocks must keep the chrome's tap handling (`main`/`article` tap toggles; interactive children must stop propagation) and never put `position: fixed` inside a `container-type` ancestor.
- **S22/S23/S25:** `LIBRARY_HREF` lives in `reader-href.ts`; the "Book" link is dead until S23; html chapters redirect to the legacy frame until S25.
- **Every new page:** reader routes need the nonce'd `script-src` (`isReaderPath`); dev now uses `'self'` + nonce without `'strict-dynamic'` (OQ61).
- **Live-check runtime used:** production build `next start` on a spare port against a scratch API (throwaway DB), dev server from a scratchpad clone for the failed-state reload; `kb_reader` and `scroll-behavior` quirks: see OQ56, OQ62.

