# P5.S3 — CJK-capable client-side search (plan)

Operator-approved plan (2026-07-12). Executor: **slice-executor-high** (risk `high`).

## Context

The site's search today is Material's built-in lunr with `lang: ["en"]` and separator `[\s\-]+` — no CJK support: Korean is agglutinative, so `검색` never matches `검색을`. The P4 server-side hybrid search can't be used (static Pages site). This slice delivers browser-only Korean/CJK-capable search. DECOMP delegated the approach decision to this slice; orchestrator research (below) has narrowed it substantially. Read `works/phases/active/P5/phase.md` first (design-system contract, P5.S5 update, and S2's cross-slice notes).

## Verified facts (orchestrator research, 2026-07-12)

1. **The pinned Material (9.7.6) bundles `lunr.ko.min.js`** — the built site ships it under `site/assets/javascripts/lunr/min/` (verified on the on-disk build). `plugins.search.lang: [en, ko]` is therefore a real, supported option; the worker loads language packs + `lunr.multi` automatically.
2. **`lunr.ko` is only a trimmer + Korean stopword filter** (inspected the shipped file: `wordCharacters="[A-Za-z가-힣]"`, no segmenter, no stemmer). It does NOT solve agglutination by itself.
3. **But Korean text is space-separated into eojeol**, and Material's search appends trailing wildcards to query terms as you type (this is what `search.suggest`/typeahead rides on). So with `lang: [en, ko]`: index token `검색을` ← query `검색` + `*` prefix-matches. Prefix direction is exactly Korean agglutination (suffixes attach at the end). This closes the core gap with **zero custom JS**.
4. Known residual gaps of the prefix approach: no match mid-compound (query `미라클` inside `슈퍼미라클`), and Korean stopword filtering drops a fixed list of standalone particles/conjunctions from the index (acceptable; record in decisions).
5. Corpus reality: today's docs are mostly English with sparse Hangul (the changple5 prompt-injection doc has real agglutinated forms — `관련해`, `너한테`, `미라클`; the S2 per-project pages added Korean descriptions). The capability is forward-looking — /explain keeps adding Korean-topic docs.
6. Node v21 is available on this host for a lunr smoke test; docker (compose `kb` service) is the build/validation path.
7. From S2's cross-slice notes: the hero deliberately shipped without its search field (deferred here); `navigation.instant` deliberately not enabled (this slice decides; with a zero-JS approach there is no interplay — recommend leaving it off and noting forward). `.md-search__*` styling (§4/§8) is done — engineering only here.

## Recommended approach (decision ladder — confirm empirically, don't assume)

1. **Primary: `plugins.search: {lang: [en, ko]}`** — supported config, zero custom JS, upgrade-proof. Optionally refine `separator` (it supports lookaheads) if empirical testing shows a win — e.g. also splitting Hangul↔Latin boundaries; keep any regex documented and minimal.
2. **Fallback (only if 1 demonstrably fails acceptance):** separator-based CJK segmentation (lookahead splits of Hangul runs). Record why in decisions.
3. **Last resort (needs clear recorded justification — expected NOT to be needed):** prebuilt-index + custom client JS (vendored locally, no CDN). This is the expensive path the phase warned about; do not reach for it while 1–2 pass.

## Work items

1. **Search config** (`mkdocs.yml`): change `- search` to the object form with `lang: [en, ko]` (+ optional documented `separator` refinement). Everything else in `mkdocs.yml` untouched: no `nav:`/`strict:`, pin 9.7.6, `theme.font: false`, features list (do NOT add `navigation.instant` or `toc.integrate`), `exclude_docs`, `theme.language` stays `en` (mixed-language site, deliberate).
2. **Hero search affordance** (realizes the delivered design's hero search field, deferred from S2):
   - **Try zero-JS first**: Material's search overlay is toggled by a checkbox `<input data-md-toggle="search" id="__search">`; a styled `<label for="__search">` inside `.kb-hero` in `docs/index.md` opens it (Material's own JS focuses the input on toggle). Verify the toggle id in the built HTML.
   - If the label trick misbehaves, fall back to a tiny dependency-free `docs/javascripts/hero-search.js` + `extra_javascript` (first script asset — keep it ~10 lines).
   - Style with an **additive** `extra.css` block reusing the design tokens (`--kb-surface`, `--kb-border`, `--kb-radius`, accent focus ring — mirror the mock's bordered rounded field with a `/` key hint; no external icon script — inline SVG or text glyph). Do not modify delivered rules.
   - **Marker contract**: this edits `docs/index.md` — the `<!-- explain:recent -->` line and all bullet lines stay byte-identical (same discipline and round-trip validation as S2 — see S2's `result.md` for the ready-made checks).
3. **Acceptance queries** (grounded in the live corpus): `미라클` and `관련` (should hit the changple5 prompt-injection doc — `관련해`/`미라클` appear in body); `창플` (S2 index-page descriptions); English regression: `nginx`, `cache`; a Hangul term NOT in the corpus returns no results (no false floods).
4. **Notes & docs**: append Doc-impact one-liners to `phase.md` — `experience.md` (search UX/journey incl. hero affordance), `frontend.md` (search plugin config, hero wiring, any JS/CSS added), `decisions.md` (ADR: chosen approach vs. alternatives, contrast with P4 server-side hybrid, stopword caveat, `navigation.instant` left off), `architecture.md` (client-side static-search boundary vs. local FastAPI hybrid). Cross-slice notes for S4: new invariants — `search_index.json` config carries `"ko"`, `lunr.ko.min.js` shipped in `site/`, hero label target (`__search`) present in built HTML, index.md marker/bullets verbatim.

## Validation (lean)

- `docker compose run --rm kb build` → exit 0; then assert: `site/search/search_index.json` config has `lang` incl. `ko` (+ chosen separator), Korean body text present in index entries, `site/assets/javascripts/lunr/min/lunr.ko.min.js` shipped.
- **Node smoke test** (scratchpad only — no repo files, no package.json committed): `npm i lunr lunr-languages` in a temp dir; build an index over the real `search_index.json` docs with `lunr.multiLanguage('en','ko')`, assert `관련*` matches the doc containing `관련해` and `미라클*` hits, plus an English control. Label it in result.md as an approximation of Material's worker (same lunr + language packs underneath).
- `git diff docs/index.md` marker/bullet byte-identity + the same `server.documents` pure-function round-trip S2 ran.
- Built-site asserts: no `nav:`/`strict:`, pin parity 9.7.6 both files, `site/versions/` absent, no `/Users/` leak.
- Leave the dev server running (`docker compose up -d kb`, port 8765) and put a short manual query checklist in result.md for the operator eyeball (the true worker behavior is browser-only).

## Out of scope

Any `server/`/API/skill change (client-side only — hard constraint); graph/backlinks (P6); CI smoke guard (S4); replacing Material's search UI wholesale; new webfonts; `navigation.instant` (noted forward).

## Executor contract

Do the work above, write `result.md` (free-form, from scratch) beside this file, append the Doc-impact one-liners and cross-slice notes to `works/phases/active/P5/phase.md`. Never commit; never run `start-slice`/`finish-slice`/`set-slice-status`/`doc-new-version`. Return a structured verdict (`done` / `needs_operator` / `blocked`) with a summary and validation results.
