# Result — P5.S3 (CJK-capable client-side search)

Executor: `slice-executor-high`. Completed 2026-07-12. Verdict: **done**.

Delivered browser-only Korean/CJK-capable search on the static MkDocs Pages
site by taking the plan's **primary** approach from the decision ladder — the
Material search plugin with `lang: [en, ko]` (zero custom JS) — and wired the
hero search affordance deferred from S2 as a **zero-JS `<label for="__search">`**
trick. Neither the fallback (separator-based CJK segmentation) nor the last
resort (prebuilt index + vendored client JS) was needed: the primary approach
passes every acceptance query empirically.

## Approach chosen and why

**Primary approach (decision ladder step 1) — no separator change, no custom JS.**

- `plugins.search` → object form with `lang: [en, ko]`. The pinned
  mkdocs-material 9.7.6 image bundles `lunr.ko.min.js` (Korean trimmer +
  stopword filter) and `lunr.multi.min.js`, both confirmed shipped in the built
  `site/assets/javascripts/lunr/min/`. The search worker loads the packs +
  `lunr.multi` automatically for the configured langs.
- **Why this closes the CJK gap:** Korean is agglutinative — the eojeol `관련해`
  is one indexed token, and a bare `관련` query would never match it under the
  old `lang:["en"]`. `lunr.ko` is only a trimmer/stopword filter (no segmenter,
  no stemmer), so it does **not** solve agglutination by itself. What closes the
  gap is that Korean text is space-separated into eojeol **and** Material's
  typeahead appends a trailing wildcard to query terms (`search.suggest`, already
  enabled): index token `관련해` ← query `관련` + `*` prefix-matches. Prefix
  direction is exactly Korean agglutination (suffixes attach at the end).
- **`separator` left at the default `[\s\-]+`.** The optional Hangul/Latin-split
  refinement was evaluated against the acceptance queries and **not adopted**:
  every acceptance query passes on prefix-matching alone, so a custom separator
  would add documented regex surface for no measured win (plan step 1's "keep
  any regex documented and minimal" → minimal = none here). Recorded as the
  chosen tradeoff.
- **`theme.language` stays `en`** (deliberately mixed-language site) and
  `navigation.instant` stays OFF — with a zero-JS search approach there is no
  instant-nav ↔ search-worker interplay to manage, so leaving it off (as S2 did)
  is correct and noted forward.

**Hero search affordance — zero-JS `<label for="__search">` (plan step 2, primary).**

- The built home HTML carries exactly one `<input ... data-md-toggle="search"
  id="__search">` (verified). A styled `<label class="kb-hero__search"
  for="__search">` inside `.kb-hero` toggles that checkbox; Material's own JS
  focuses the search input on toggle. **No custom JS needed** — the
  `docs/javascripts/hero-search.js` fallback in the plan was not required (no
  `extra_javascript`, no script asset added).
- Styled additively in `extra.css` §9 (new "hero search affordance" block right
  after the hero lede) reusing only existing §1–§3 tokens (`--kb-surface`,
  `--kb-border`, `--kb-radius`, `--kb-radius-sm`, `--kb-accent`,
  `--kb-shadow-hover`, `--kb-font-mono`, ink/hint tiers): the mock's bordered
  rounded field, inline SVG magnifier (no external icon script), a bilingual
  "Search the knowledge base · 검색" label, and a `/` `<kbd>` key hint mirroring
  Material's built-in "press / to search" shortcut. No delivered rule modified.

## Files changed

- **`mkdocs.yml`** — `plugins.search` changed from the bare `- search` to the
  object form with `lang: [en, ko]` (+ a documented comment block explaining the
  agglutination/typeahead mechanism and why `separator` stays default).
  Everything else untouched: no `nav:`/`strict:`, pin 9.7.6, `theme.font: false`,
  the S2 `features:` list (NO `navigation.instant`/`toc.integrate` added),
  `exclude_docs`, `theme.language: en` (default), `tags` plugin.
- **`docs/index.md`** — added a single `<label class="kb-hero__search"
  for="__search">` block (magnifier SVG + bilingual text + `/` kbd) inside the
  existing `.kb-hero`, above the Recent section. The `<!-- explain:recent -->`
  marker line and all 6 bullet lines are **byte-identical** (git diff shows only
  the 5 inserted hero-label lines; see Validation).
- **`docs/stylesheets/extra.css`** §9 — additive "Landing: hero search
  affordance (P5.S3)" block (12 rules) between `.kb-hero__lede` and the section-
  heading block. No existing rule/property changed; the §4 field skin and §8
  results skin (already done by S1/S5) are untouched.

## Validation

All commands run 2026-07-12; all passed.

1. **`docker compose run --rm kb build`** → exit 0. Only the pre-existing,
   unrelated "Excluding 'README.md' … conflicts with 'index.md'" warning (also
   present in S1/S2 builds). The MkDocs-2.0 banner is the image's stock notice,
   not an error.
2. **Built-site asserts** (on the produced `site/`):
   - `site/search/search_index.json` `config.lang == ["en", "ko"]`, `separator ==
     "[\\s\\-]+"` (default, as designed).
   - Korean body text indexed: 12/214 index entries contain Hangul; the
     agglutinated forms `미라클`, `관련해`, `창플`, `너한테` all present in the
     index `text`.
   - `site/assets/javascripts/lunr/min/lunr.ko.min.js` **and** `lunr.multi.min.js`
     shipped.
   - `site/index.html` carries `<label class="kb-hero__search" for="__search">`
     and exactly one `id="__search"` toggle.
   - Hygiene: `mkdocs.yml` has no `nav:`/`strict:`; pin parity 9.7.6 holds in
     both `.github/workflows/pages.yml` and `compose.yml`; `theme.font: false`
     intact; `site/versions/` absent (`exclude_docs` intact); no `/Users/` path
     leak anywhere under `site/**/*.html`.
3. **Node lunr smoke test** (scratchpad only, OUTSIDE the repo — `npm i lunr
   lunr-languages` in a temp dir; nothing committed). Built a lunr index over the
   **real** `search_index.json` docs with `lunr.multiLanguage('en','ko')` + the
   plugin's default separator, then queried with a trailing `*` to mimic
   Material's typeahead. **Labelled an approximation** of Material's search worker
   (same lunr 2.3.9 + lunr-languages 1.20.0 packs the pinned image bundles; NOT a
   byte-for-byte replica of Material's `integration.js` query builder — the
   browser eyeball is authoritative). Results — **all 7 checks PASS**:
   - `관련*` → 1 hit, the prompt-injection doc (the core **agglutination** test:
     `관련` prefix-matches indexed `관련해`).
   - `미라클*` → 2 hits (prompt-injection doc); `미라클` bare → 2 hits (appears
     standalone too); `창플*` → 3 hits.
   - `nginx` → 17 hits, `cache` → 25 hits (English regression intact).
   - `블록체인*` (Hangul term absent from corpus) → 0 hits (no false floods).
4. **Marker byte-identity** — `git diff docs/index.md` contains no
   `<!-- explain:recent -->` line and no `- 20xx-…` bullet line; the only added
   lines are the 5-line hero label. Byte-identical, not merely similar.
5. **`server.documents` pure-function round-trip** (via `.venv`, same shape S2
   ran) — all pass:
   - `insert_recent_bullet(index)` → mechanism `"marker"`, bullet lands directly
     on the line after the marker.
   - `remove_recent_bullet(...)` restores `docs/index.md` **byte-for-byte**
     (`removed_text == original`).
   - Each of the 6 Recent `rel_path`s appears exactly once (no dedup collision
     for `update_recent_index`'s `rel_path in text` check).
   - `update_recent_index` no-ops (`returns False`) on an already-present
     `rel_path`.
   - The hero `<label>` markup contains no `](` needle, so it cannot confuse
     `remove_recent_bullet`'s `](<rel_path>)` matcher.
6. **`python3 scripts/workflow.py validate`** → "Workflow validation passed"
   (state integrity).
7. **Dev server left running** for the operator: `docker compose up -d kb`
   (container `knowledge-kb-1` running, live-reloaded with the new config).
   Note the site is served under the `site_url` subpath — eyeball at
   **`http://localhost:8765/knowledge/`** (a bare `http://localhost:8765/`
   302-redirects there). Confirmed the live server serves `lang: ['en', 'ko']`
   and the hero label. Stop with `docker compose stop kb` when done. Deploys
   stay manual-push-only — nothing pushed.

### Manual query checklist for the operator (browser — the true worker behavior)

Open `http://localhost:8765/knowledge/`, click the hero search field (or press
`/`), and type each of these; the smoke test predicts the outcome but only the
browser exercises Material's real worker + typeahead:

- [ ] `미라클` → the prompt-injection doc appears (Korean noun match).
- [ ] `관련` → the prompt-injection doc appears **while still typing** (typeahead
      prefix-matches the agglutinated `관련해`; this is the core CJK win — if it
      only matches after you type the full `관련해`, the typeahead wildcard is not
      firing).
- [ ] `창플` → the prompt-injection doc (and the decisions page) appear.
- [ ] `nginx` and `cache` → English results unchanged (regression check).
- [ ] `블록체인` → no results, cleanly (no false flood).
- [ ] Hero field: clicking it opens/focuses search; hover shows the teal border
      + soft lift; the `/` hint reads correctly; both light and dark schemes look
      right (toggle the header brightness icon).

## Residual gaps / known limits (recorded, not defects)

- **Mid-compound misses:** a query for a substring *inside* a compound eojeol
  (e.g. `미라클` inside a hypothetical `슈퍼미라클`) won't match — lunr.ko has no
  segmenter, and the trailing wildcard is prefix-only. Not triggered by any
  current corpus term; an ADR-level tradeoff of the prefix approach.
- **Korean stopword filtering:** `lunr.ko` drops a fixed list of standalone
  particles/conjunctions from the index. Acceptable and expected; recorded in
  decisions.
- **Smoke test is an approximation** (see Validation 3) — it uses `idx.search('관련*')`
  to stand in for Material's typeahead; the browser checklist is the
  authoritative behavioral gate.

## Deviations from plan

None. The plan's primary approach (step 1) and primary hero affordance (zero-JS
label) both worked; the documented-separator refinement was evaluated and
declined as unnecessary (the plan explicitly made it optional and "only if
empirical testing shows a win"). No fallback/last-resort path taken.

## Out of scope (confirmed untouched)

No `server/`, `/explain` skill, or API changes (client-side only — hard
constraint). No graph/backlinks (P6). No CI smoke guard (P5.S4). Material's
search UI not replaced wholesale (only re-skinned via the already-present §4/§8
CSS + the additive hero field). No new webfonts, no CDN scripts, no
`extra_javascript`. `docs/current/`, `docs/versions/`, `docs/README.md`
untouched. Pin 9.7.6 and `theme.font: false` untouched.
