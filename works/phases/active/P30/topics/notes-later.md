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
