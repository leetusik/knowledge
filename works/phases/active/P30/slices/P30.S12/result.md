# P30.S12 result — Native render pipeline (TypeScript)

- status: done
- tier: high
- model: opus
- effort: high
- summary: Built `web/src/lib/native/`, the server-only native/md render pipeline. remark (with the three GFM pieces the Python parser enables) and `yaml` parse the source, the chapter is re-validated, and the tree maps to React with no raw HTML. The svg allowlist is applied twice, missing links never leak, and Shiki emits `kb-tok-*` classes. The TS tree, the `.err` rows and the per-block projection match Python's on all 24 shared fixtures (core test 4). `/documents/{id}` and its versions now render native chapters through the pipeline, and the app CSP ships: a baseline on every response plus a nonce `script-src` on the reader routes.
- files_changed: web/src/lib/native/{errors,pyutil,ids,refs,yamlcore,svg,schema,tree,markdown,parse,project,validate,links,highlight,index}.ts and render.tsx (new); web/src/lib/csp.ts (new); web/src/content/chapter.ts (new); web/src/content/index.ts; web/src/proxy.ts; web/next.config.ts; web/src/lib/knowledge/types.ts; web/src/app/(public)/documents/[id]/document-view.tsx; web/src/app/(public)/documents/[id]/versions/[v]/page.tsx; web/package.json; web/pnpm-lock.yaml; web/tests/native-conformance.test.ts, native-render.test.ts and csp.test.ts (new); works/phases/active/P30/phase.md; works/phases/active/P30/topics/{doc-impact-detail,operator-questions-decided,notes-later}.md
- validation: `pnpm --dir web typecheck` PASS · `lint` PASS (0 problems) · `test` PASS (23 files, 226 tests; new: native-conformance 25, native-render 37, csp 3) · `build` PASS · `python3 scripts/plugin_parity.py` PASS · `python3 scripts/skills_parity.py` PASS · `python3 scripts/workflow.py validate` PASS (pre-existing warnings only) · live check in the dev runtime, the production build and the standalone server: PASS (below)
- deviations: (1) remark-gfm replaced by its three pinned micromark/mdast pieces (table, single-tilde strikethrough, autolink literal), because remark-gfm's footnotes and task lists would build trees Python never builds (OQ47). (2) `validate.ts` is the render gate over `parse.ts`, which mirrors `parse.py` and runs the schema checks while it parses, exactly as Python does. That needed more modules than the plan listed (schema, ids, refs, yamlcore, markdown, errors, tree, links, highlight). (3) md documents stay on `<MarkdownBody>` on `/documents/{id}` until S13 (OQ49); the pipeline's md mode is built and tested. (4) Shiki output comes from `codeToTokens`, not hast, mapped to classes. (5) Two additions the render needed: `assets` on `KbDocument`/`KbDocumentVersion` (`KbAsset`), and the past-version page renders native too. (6) Console capture: Aside's `page.on('console')` records nothing, not even a probe `console.log`. So the "no CSP console errors" checks ran in headless Google Chrome with a throwaway profile, whose stderr log a positive control showed records CSP violations. Aside did the signed-in sweep, the enforcement probe and the screenshot.
- doc_impact: `- frontend.md, security.md, decisions.md: P30.S12 — full lines in topics/doc-impact-detail.md → *P30.S12* (P30.S12)`

## What was built

`web/src/lib/native/` (every module imports `server-only` or is pure; nothing ships to the client):

| Module | Mirrors | What it does |
|---|---|---|
| `markdown.ts` | markdown-it setup | the unified processor: `remark-parse` plus this slice's plugin `remarkNativeGrammar` (GFM table, strikethrough `singleTilde`, autolink literal). `parseInlineMdast` = markdown-it's `parseInline`: the string becomes 4-space-indented continuation lines of a sentinel paragraph, so block syntax stays text. `restoreLineEndWhitespace` puts back the trailing whitespace markdown-it keeps (a trailing tab). |
| `parse.ts` | `parse.py` | header, body, NUL/size checks, the callout lift (the `[!TYPE]` line is replaced by a sentinel and re-parsed, plus the indentation markdown-it keeps on `rest`), the heading `{#id}` cut on the raw content, typed fences, id assignment, the `#id` check. Returns the tree, every violation (never thrown) and each top-level block's line span. `format: "md"` turns off the extensions and every check. |
| `schema.ts`, `yamlcore.ts`, `svg.ts`, `refs.ts`, `ids.ts`, `errors.ts`, `project.ts` | the same-named Python modules | line-for-line ports. `yamlcore` runs `yaml` with the failsafe schema and resolves plain scalars with the 1.2 core regexes, as PyYAML does there. `svg` uses saxes (namespace-aware, no DTD). `pyutil` holds the Python-semantics helpers (`strip`, `splitlines`, `$` before a final newline). |
| `validate.ts` | — | the render gate: a violation inside a top-level block refuses that block; one outside every block refuses the chapter (OQ48). |
| `render.tsx` | — | the React mapping: one method per node and typed block, `kb-ch-*` class and `data-*` hooks, no `style`, no HTML passthrough. The svg is rebuilt through `svgAttrsToProps`, which applies the allowlist again and scopes ids. |
| `links.ts` | — | `resolveLink` / `resolveImage` / `documentAssetUrl` (README schemes; missing = no href; md rules, OQ52). |
| `highlight.ts` | — | Shiki 4.5.0, sync, JS regex engine, CSS-variables theme mapped to `kb-tok-<token>` classes (OQ53). |

`web/src/lib/csp.ts` and `src/proxy.ts`/`next.config.ts` hold the CSP (OQ51). On every response: `object-src 'none'; base-uri 'none'; frame-src 'self'; frame-ancestors 'none'; img-src 'self' data:`. On `/documents/…` and `/@…`, the proxy adds `script-src 'self' 'nonce-<128-bit>' 'strict-dynamic'` (plus `'unsafe-eval'` in dev only) to both the forwarded request and the response. Next reads the nonce from the forwarded request. The two raw relays keep their own `sandbox allow-scripts; frame-ancestors 'self'`, because Next's last-matching entry per key wins. When the proxy sets the CSP on a reader route, curl showed one header, the proxy's superset.

New dependencies, all exact pins: `unified@11.0.5`, `remark-parse@11.0.0`, `yaml@2.9.1`, `saxes@6.0.0`, `shiki@4.5.0`, `micromark-extension-gfm-{autolink-literal@2.1.0,strikethrough@2.1.0,table@2.1.1}`, `mdast-util-gfm-{autolink-literal@2.0.1,strikethrough@2.0.0,table@2.0.0}`, and dev `@types/mdast@4.0.4`. All are MIT and none is a paid service. `shiki` is traced into `.next/standalone`, as `serverExternalPackages` expects; the rest are bundled.

## Tests (core test 4, plus sanitizing)

- `web/tests/native-conformance.test.ts` runs the TS half of core test 4 over `tests/fixtures/native/`. Each accept case must give `violations == []`, a tree deep-equal to `.json`, and `formatSections(sections(tree))` byte-equal to `.txt`. Each reject case must give `formatErrors(violations)` byte-equal to `.err`. All 24 cases plus the directory check pass (25 tests).
- `web/tests/native-render.test.ts` (37 tests):
  - every fixture renders with no `<script|iframe|object|foreignObject`, ` on*=`, ` style=` or `javascript:`. Accept cases show no placeholder; reject cases show it;
  - a native block holding `<img onerror>` is refused, and nothing echoes it;
  - md drops raw HTML;
  - md extensions are off;
  - the svg validator refuses `script`, `on*`, `javascript:` hrefs, `foreignObject`, `style` and `a`;
  - the mapper strips them from an unvalidated tree;
  - an svg `<title>` renders as text;
  - an unresolved `chapter:`/`doc:` target leaks neither its path nor its slug;
  - md `javascript:`/`data:`/`vbscript:` links are missing;
  - an asset missing from the map, or an external asset, never reaches an `<img>`;
  - code emits `kb-tok-*` with no inline style;
  - the three top-level charts render as diagrams.
- `web/tests/csp.test.ts` (3 tests): the baseline string, the nonce superset (no `unsafe-inline`; `unsafe-eval` only in dev), and the reader-path scope.

**Differential probe (throwaway, deleted).** 63 extra sources were run through both parsers and compared on tree, `.txt` or `.err` rows:
- the 5 fixture-book chapters;
- 58 edge cases: callout edge forms, block syntax inside YAML *(md)* fields, references into YAML fields, heading `{#id}` with code, setext ids, loose lists without paragraphs, table padding and escaped pipes, trailing tabs, entities, autolinks, emphasis, image titles, Korean, YAML tabs, unclosed quotes, multi-document input, merge keys, `.inf`, depth, svg comments, DOCTYPE, entities, stray text, foreign namespaces, header variants, NUL.

The first run found three divergences, all fixed (a callout `rest` keeps its first-line indentation; a soft break keeps a trailing tab); the final runs had 0 divergences. The probe also confirmed two Python bugs (below).

## Live check

**Instruments:**
- Aside, `aside repl --account u1`: signed-in sweeps, the CSP enforcement probe and a screenshot;
- headless Google Chrome (`--headless=new`, a throwaway `--user-data-dir` in the scratchpad, `--enable-logging=stderr`) for the console. Aside's `page.on('console')` captured nothing, not even a probe `console.log`, so it cannot prove an absence. A Chrome positive control (a `data:` page with `script-src 'none'`) logged the CSP violation, so Chrome's log can.

**Stack:**
- a fresh API on `:8767`: `KB_ROOT` = a scratch git repo; `DATABASE_URL` = a new database `kb_s12live` in the test Postgres `kb-p28s2-pg`, migrated to `0006`; `KB_GIT_COMMIT=false`; `GOOGLE_API_KEY`/`GEMINI_API_KEY` unset, so no paid embedding calls;
- a throwaway account `s12-live@example.com` and an org `vk_` key; the fixture book published with `scripts/publish_fixture_book.py --token <vk_>`;
- dev: `next dev -p 3041` from a `cp -Rc` scratchpad clone of `web/`;
- production build: `next start -p 3042` from `web/`;
- a final smoke of `node .next/standalone/server.js` on `:3043`.

For the anonymous Chrome checks the scratch `fixtures` and `fixture-finance` projects were made public, and the scratch tenant got the slug `s12org` for the pretty URL. The standing `:8766` and `:3030` were never used or stopped; my servers were stopped afterwards.

**Results:**
- **`all-blocks` (doc 1), signed in, production build (Aside DOM sweep):** every block renders as semantic markup and no block was refused:
  - headings `h2/h3` with ids;
  - six callouts, DEFINITION collapsed into `<details>`;
  - two code blocks with 27 `kb-tok` spans;
  - one figure and two figure rows;
  - four `<img>` from `/api/documents/1/assets/…`, all loaded;
  - nine diagrams, including three charts as tables;
  - one svg with nine children;
  - quiz items choice, choice, recall and cloze;
  - two sources;
  - one table;
  - five in-chapter anchors;
  - external links `_blank`/`noopener noreferrer`;
  - zero `[style]`, `<script>` or `<iframe>` inside the chapter.

  The screenshot shows unstyled plumbing with images and the disclosure working.
- **CSP enforced:** in Aside on `/documents/1`, a third-party image fired a `securitypolicyviolation` (`img-src`) and errored; an injected `<img onerror>` was blocked (`script-src-attr`); `window.next.version` was set, so Next's nonce'd scripts ran. A `createElement('script')` from the evaluator did run, which `'strict-dynamic'` allows by design (it is not parser-inserted).
- **Console (headless Chrome, dev and production build):** no CSP errors and no other errors on:
  - `/documents/1`, `/1/versions/1` (v1 archived native), `/3` (ko translation), `/4` (legacy html), `/5` (loose native);
  - `/@s12org/fixtures/every-block-once`, the pretty URL that renders the chapter;
  - `/@s12org/graph`, under the nonce CSP, with its canvas;
  - `/`, the static marketing page with the baseline CSP;
  - `/login`.

  The only lines left are dev noise (React DevTools, HMR, Fast Refresh) and a pre-existing "CSS preloaded but not used" warning.
- **Legacy html still displays:** `/documents/4` frames `/api/documents/4/raw` with `sandbox="allow-scripts"`, and the island resized it to 613 px. No console errors.
- **Member surfaces (Aside, production build):** `/dashboard`, `/documents`, `/graph` (canvas) and `/` load with their content.
- **Bug found and fixed during the check:** in the first pass both runtimes logged a hydration mismatch on doc 1. React 19 treats `<title>` as document metadata and stringified the svg `<title>`'s Fragment child as `[object Object]`. Text elements now take plain string children (a regression test was added), and the re-run was clean.
- **Standalone server:** `/documents/1` redirects to the pretty URL, which renders the chapter (`kb-tok` spans, 3 charts, `<title>Arrow</title>`), with no server errors.
- Side effects:
  - the agent profile `u1` was signed out of `127.0.0.1` at the end;
  - the database `kb_s12live` was left in `kb-p28s2-pg`. It is harmless; the database-drop command was refused by the permission policy, so I left it.

## Decisions (OQ46–OQ54, all decided under the unattended run)

The full text is in `topics/operator-questions-decided.md` → *P30.S12*; there is one collapsed line each in `phase.md`.
- OQ46: the chart `type` clobber is kept for parity and rendered as a diagram; a cross-stack fix slice is recommended before S18.
- OQ47: GFM pieces instead of remark-gfm.
- OQ48: refusal granularity.
- OQ49: md stays on `<MarkdownBody>` until S13.
- OQ50: `chapter:`/`doc:` links resolve through `resolveRef`; until it exists they are missing links.
- OQ51: the CSP shape.
- OQ52: md link and image rules.
- OQ53: Shiki setup.
- OQ54: diagram and quiz stand-ins.

## Findings for REVIEW (outside S12's boundary: server-side observations, deferred-job candidates)

1. **A Python ingest 500.** A choice quiz with `answer: [[a]]` crashes `schema._quiz_item` with `TypeError: unhashable type: 'list'` (`seen.add(a)` on a list), so ingest answers 500 instead of one 422. Reproduced with `parse_chapter`. The fix is one line: skip `seen.add` for non-strings.
2. **Ids with a trailing newline.** `ids.ID_RE`, `refs` and the server slug validators use `re.match(r"^…$")`, whose `$` also matches before a final newline. A YAML block-scalar id (`id: |` → `"s1\n"`) is therefore accepted and stored as `s1\n`. The TS port mirrors this (`pyutil.pyFullMatch`) to keep parity. A fix (`\Z` or `fullmatch`) belongs to both halves and the fixtures.
3. **The chart clobber (OQ46).** `parse.py`'s `block.update(...)` lets the chart's `type` overwrite `"diagram"`, which contradicts the README's tree. The fixtures encode it.

## Notebook

- `phase.md`:
  - `## Doc impact`: one line; the full lines are in `topics/doc-impact-detail.md` → *P30.S12*;
  - `## Operator Questions`: OQ46–OQ54, each collapsed;
  - `## Decisions`: one S12 line;
  - `## Notes for later slices`: removed the three consumed S12 notes (core test 4, the CSP note, the S3 parser note), took S12 out of the S5 note's audience, and added one link line;
  - `## Now`: rewritten.
- `topics/notes-later.md` → *The render pipeline as shipped*, for S13–S21, S25, S26 and REVIEW: how to render a chapter, every hook, the chart quirk, `resolveRef`, the CSP rules, S16's asset map, and the three REVIEW observations.
