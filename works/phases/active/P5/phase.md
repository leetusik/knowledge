# Phase P5: Web UI redesign & search

_Intent: see [intent.md](intent.md)._

## Objective

Claude-designed visual overhaul of the MkDocs GitHub Pages site plus an upgraded search experience; hosting stays GitHub Pages. Absorbs deferred D2 (design polish) — promote it into this phase at decomposition.

## Context

Second phase of the knowledge-feature roadmap (P4 core improvements → **P5 web UI (this phase)** → P6 knowledge graph → P7 plugin; then bootstrap P7 retires the embedded /explain). Binding scope (from `plan.md` + `intent.md`):

- **This is a static-site redesign, not a hosting change and not the SaaS/personal web UI.** Hosting stays GitHub Pages ("github page as is"). SaaS-someday is noted (keep the architecture from precluding it) but out of scope.
- **The operator does the design, in the Claude Design tool** (intent amended 2026-07-11 — "gonna use claude design" meant claude.ai/design, not Claude-the-agent; see `intent.md` → Amendment). The operator designs each target in a Claude Design design-system project, one at a time, from the target list in `slices/P5.S5/plan.md`; the agent syncs deliveries via DesignSync and integrates them. The P5.S1 Claude-written design system stays as the **interim baseline**, replaced target-by-target. mkdocs-material stays the engine; integrations land as theme config + `extra_css` + assets.
- **The Obsidian-like knowledge graph is P6, not here.** Any graph/backlink work is out of scope; note it forward, don't build it.
- **Search must be client-side-capable.** A static Pages site cannot call the P4 FastAPI hybrid semantic search (BM25+recency+Gemini+RRF) in `server/` — that stays local-only. The site's upgraded search runs entirely in the browser.
- **D2 (design polish) is absorbed here** — the orchestrator creates the design-system slice via `promote-deferred D2` (spec in Decomposition below); DECOMP does not create it.

## Decomposition

DECOMP audit (2026-07-10, read-only) spot-verified the orchestrator's pre-gathered facts against the live tree — all confirmed (see Findings & Notes). The phase splits into **four middle slices** — three created here as bare folders (`P5.S2`/`P5.S3`/`P5.S4`), plus the design-system slice (`P5.S1`) created by the orchestrator via **D2 promotion** (proposed below, not created by this slice, mirroring the P4/D1 pattern).

| Slice | Area | Kind | Risk | Order | Depends |
|---|---|---|---|---|---|
| `P5.S1` *(PROPOSED — created via D2 promotion; DONE 2026-07-10, now the interim baseline)* | Design system — Claude-designed palette/typography/spacing/branding via theme config + `extra_css` tokens, logo/favicon (optional `overrides/`) | implementation | high | 1 | — |
| `P5.S5` *(added 2026-07-11 — operator co-work, intent amendment; revised same day: no per-target integration)* | Design co-work — operator builds the FULL design system in Claude Design ("Knowledge Base Design System" project) from the brief in `slices/P5.S5/plan.md`; agent checks up & integrates once at the end (DesignSync) | implementation | medium | 1.5 | P5.S1 |
| `P5.S2` | Landing & UX structure — `index.md` redesign (preserve `explain:recent` contract), nav/browse experience, tags page | implementation | medium | 2 | P5.S1 *(advisory — see note)* |
| `P5.S3` | CJK-capable client-side search — Korean/CJK-aware search on the static Pages site | implementation | high | 3 | P5.S1 *(advisory — see note)* |
| `P5.S4` *(optional hygiene — droppable)* | Site-build CI smoke guard & hygiene — `mkdocs build` parity check + invariant assertions | implementation | medium | 4 | P5.S3 |

### D2 promotion spec (orchestrator runs this — DECOMP must NOT)

The design-system slice absorbs deferred **D2** so the deferred brief attaches. The orchestrator creates it via:

```
python3 scripts/workflow.py promote-deferred D2 --phase P5 --slice P5.S1 \
  --name "Design system — Claude-designed palette/typography/branding via theme config + extra_css tokens, logo/favicon" \
  --kind implementation --risk high --order 1
```

Run this after DECOMP completes and before executing any middle slice (P5.S1 is order 1 / the first slice to execute). Risk **high** → `slice-executor-high` (opus): design judgment, first real frontend/experience truth, foundational for the whole phase — explicitly NOT a `low` mechanical slice.

### Per-slice rationale

- **P5.S1 Design system (high, via D2 promotion):** the visual foundation — a Claude-designed palette (replace stock indigo), typography (theme `font.text`/`font.code` or self-hosted), spacing/branding tokens in `extra_css`, and branding assets (`logo`, `favicon`), optionally a thin `overrides/` `custom_dir` for header/footer/announcement polish. This is the phase's design-judgment core and the first real `frontend.md`/`experience.md` truth (both are still bootstrap v0001 placeholders). High risk because it sets the design language every later slice builds on, touches theme config broadly, and requires taste, not a mechanical recipe. Social cards (the `social` plugin, needs cairosvg/Pillow deps) are OPTIONAL within this slice's purview — include only if cheap; otherwise note forward. Foundational → order 1.
- **P5.S2 Landing & UX structure (medium):** redesign `docs/index.md` (hero/landing feel, Browse-by-project + Browse-by-topic affordances) **while preserving the load-bearing `<!-- explain:recent -->` marker and its exact bullet format** (both the server write path and the /explain skill's API-down fallback parse it — see Constraints); tune Material nav features (`navigation.instant`, `navigation.tabs`/`navigation.sections`, `navigation.top`, `toc.integrate`?) for a better browse experience; polish the tags page (`docs/tags.md` keeps `<!-- material/tags -->`); optional per-project landing feel. Medium (not high): bounded UX work on top of S1's tokens, but the marker/bullet contract is a real correctness constraint and nav-feature choices carry some judgment. Depends on S1 (advisory) so it composes on the settled design tokens/theme config.
- **P5.S3 CJK-capable client-side search (high):** the hardest slice. Today's lunr search has **no CJK support** (config empirically confirmed: `lang:["en"]`, `separator:"[\\s\\-]+"`, pipeline `stopWordFilter` only — see Findings). Korean is agglutinative, so `"검색"` never matches `"검색을"`, and the default separator only splits on whitespace/hyphen. The slice must deliver browser-only CJK-capable search; the **approach is a genuine open design decision delegated to the slice** — e.g. tune the Material `search` plugin `separator` to segment CJK into characters/bigrams (documented CJK separator patterns) vs. a prebuilt static JSON index + a small client-side fuzzy/segmenting search JS. lunr has no Korean language pack, so real segmentation is non-trivial; this is research + design, not mechanical → high risk. Depends on S1 (advisory) so any search-UI styling rides on the design system and theme-config edits merge cleanly. **Client-side only** — must NOT reach for the local FastAPI server (that would be scope creep, see Constraints).
- **P5.S4 Site-build CI smoke guard & hygiene (medium, OPTIONAL/droppable):** there are **no automated site-build tests today**, and P5 introduces the first client-side assets (`extra_css`, possibly `overrides/`, custom search JS/index) — all of which can silently break `mkdocs build`. This slice adds a lightweight CI-parity build smoke guard (assert `mkdocs build` succeeds + a few invariants: `docs/versions/` still excluded from `site/`, the `explain:recent` marker preserved, no `/Users/` leak, pin parity 9.7.6 between `pages.yml` and `compose.yml`). Medium (not low): it edits the load-bearing `.github/workflows/pages.yml` (a deploy-critical file) and must pick meaningful invariants — light judgment, not a fully-mechanical haiku plan. **Optional/droppable:** it's engineering hygiene, not part of the operator's "design + search" intent — the orchestrator may cut it (or fold its smoke check into each slice's validation) if the operator wants to stay strictly within the redesign scope. Lands last (depends_on P5.S3) so the guard covers the final set of new client assets.

- **P5.S5 Design co-work (medium, added 2026-07-11 by intent amendment; revised same day):** operator co-work slice at order 1.5 — sits `pending` while the operator builds the **complete design system** in the Claude Design project "Knowledge Base Design System", following the brief in `slices/P5.S5/plan.md` (which is written to be handed to Claude Design directly). **No per-target integration:** when the operator says the system is done, the agent runs one final check-up (DesignSync structural + content pass against the brief), then a single full integration replacing the S1 baseline (expect a bump to `slice-executor-high` — full-surface work), validates, commits, finishes the slice. Target 1 (color tokens, palette 1a Teal) is delivered and verified well-formed. **Downstream re-scope:** P5.S2 keeps the UX/marker-contract mechanics and integrates the delivered landing design (target 8) rather than inventing a layout; P5.S3 keeps the CJK search engineering and consumes target 10's search-UI styling; P5.S4 unchanged. Visual design decisions now come from the operator's deliveries, not from agent taste.

### Ordering logic

S1 (design tokens/theme foundation) first — everything visual builds on it. S2 (landing/UX) next so the site structure and nav feel settle on the new design before the highest-risk work. S3 (CJK search) after the structure is stable, so search UI integrates into a settled theme and its `mkdocs.yml`/asset edits don't collide with in-flight structure changes. S4 (build smoke guard) last so it validates the complete redesigned + searchable site. Dependencies on S1 are **advisory only** and are encoded via `order`, NOT via `--depends-on` on S2/S3 — because P5.S1 does not exist yet when DECOMP runs (the orchestrator promotes it afterward), and a dangling `depends_on` target would fail `validate`. S4→S3 is a real, existence-valid `depends_on` (both created by DECOMP). The orchestrator may optionally add `--depends-on P5.S1` when it promotes/plans S2/S3 once S1 exists.

## Findings & Notes

Verified audit (DECOMP, 2026-07-10) — read-only; all orchestrator pre-gathered facts confirmed against the live tree.

**Site engine & theme (mkdocs.yml)**

- Stock mkdocs-material, **exact pin 9.7.6** in two places that MUST bump together: CI `.github/workflows/pages.yml:25` (`pip install mkdocs-material==9.7.6`) and `compose.yml:3` (`squidfunk/mkdocs-material:9.7.6`). Pin parity is a hard constraint for any upgrade.
- Palette: indigo, `default`/`slate` light/dark with `prefers-color-scheme` + a manual toggle (`mkdocs.yml:6-18`). Features: `content.code.copy`, `search.suggest`, `search.highlight`, `toc.follow` (`mkdocs.yml:19-23`). Plugins: `search` + `tags` (`mkdocs.yml:29-31`). Markdown extensions: admonition, attr_list, tables, toc(permalink), pymdownx.details/highlight(anchor_linenums)/inlinehilite/superfences (`mkdocs.yml:39-50`).
- **Auto-nav is load-bearing: NO `nav:` key, NO `strict:` — ever** (`mkdocs.yml:25-27` carries the load-bearing comment). This is what lets /explain add pages with zero config. `exclude_docs: |\n  /versions/` (`mkdocs.yml:33-37`, from P4/D1) is the ONLY exclusion mechanism.
- **Clean slate for design (confirmed):** no `overrides/` dir, no `docs/stylesheets`/`docs/javascripts`/`docs/assets`, and no `extra_css`/`extra_javascript`/`custom_dir`/`hooks`/`logo`/`favicon` keys in `mkdocs.yml`. S1 starts from zero custom design — no legacy CSS to reconcile.

**Publishing / CI (.github/workflows/pages.yml)**

- Trigger: push to `main` + `workflow_dispatch` (`pages.yml:3-6`). Build job: checkout → setup-python 3.12 → `pip install mkdocs-material==9.7.6` → `mkdocs build` (**never `--strict`**, comment at `pages.yml:26`) → `upload-pages-artifact` (`path: site`). Deploy job: `deploy-pages@v4`, `concurrency: pages` with `cancel-in-progress: false` (never cancels a mid-flight deploy). Manual-push-only deploys.
- **No automated site-build tests exist** anywhere — the only CI-parity check is running `docker compose run --rm kb build` locally (docker is available on this host; local `mkdocs` is not installed). This gap is what P5.S4 (optional) addresses.

**Content shape (20 published pages)**

- 6 explainer docs in 3 per-project dirs: `docs/changple5/` (×4, Korean-topic content), `docs/hi2vi_web/` (×1), `docs/bootstrap_agentic_workspace.sh/` (×1). Frontmatter: `title`/`date`/`tags`/`related`/`source{project,repo}` (P4 added `related:` to 2 changple5 docs, sanitized `source.repo` to basenames). Example: `docs/changple5/...the-p35-agent-refactor...md`.
- 11 durable docs `docs/current/*.md` (different frontmatter: `doc_id`/`version`/`created_at`/`source`/`summary`/`previous`) — generated snapshots, never hand-edited.
- `docs/index.md` — landing page. Carries `<!-- explain:recent -->` (`docs/index.md:10`) + a strict bullet format `- YYYY-MM-DD · [Title](path) — project` (`docs/index.md:11-16`) parsed by BOTH `server/documents.py` (write path) AND the /explain skill's API-down fallback. Also has a `## Browse` section (`docs/index.md:18-21`). **Marker + bullet format MUST stay byte-intact** through any redesign.
- `docs/tags.md` — just `# Tags` + `<!-- material/tags -->` (the tags-plugin insertion point). `docs/README.md` — a docs-versioning how-to (not really a site page, but publishes).

**Search (the core upgrade target)**

- Built-in lunr via the Material `search` plugin. Config empirically confirmed from the on-disk (stale) `site/search/search_index.json`: `{"lang":["en"], "separator":"[\\s\\-]+", "pipeline":["stopWordFilter"], "fields":{"title":{"boost":1000}, "text":{"boost":1}, "tags":{"boost":1000000}}}`. (The stale build predates `exclude_docs` and the P4 Korean content — 283 docs incl. `versions/`, 0 CJK — so ignore its *contents*; only its *config* is informative, and it matches the live `mkdocs.yml`.)
- **No CJK support at all.** `lang:["en"]` = English stemmer + English stopwords; `separator:"[\\s\\-]+"` splits only on whitespace/hyphens. Korean is agglutinative (`검색을`, `미라클`, `창플`) so a bare `"검색"` query won't match `"검색을"`, and there's no character/bigram segmentation. lunr ships no Korean language pack. This is the gap P5.S3 must close **client-side** (the P4 FastAPI hybrid search solved CJK server-side with query-time prefix expansion, but a static Pages site can't call it).
- Design decision (separator tuning vs. custom prebuilt index + client JS) is **delegated to P5.S3** — DECOMP did not prototype either (the plan said no heavy prototypes; the config confirmation above is the cheap probe).

**Docs to be produced (P5.REVIEW)**

- `docs/current/frontend.md` and `docs/current/experience.md` are still bootstrap v0001 placeholders ("No frontend/experience truth finalized yet"). P5 produces the FIRST real frontend/experience truth. Versioning happens ONLY at P5.REVIEW (one new version per affected doc), never per slice — slices append one-line Doc-impact notes below.

## Constraints

Binding for every P5 slice (design + search):

- **Pin parity 9.7.6:** any mkdocs-material version bump must change BOTH `.github/workflows/pages.yml:25` and `compose.yml:3` in the same change. Prefer NOT bumping unless a design/search feature requires it.
- **Never add `nav:` or `strict:` to `mkdocs.yml`.** Auto-nav from the `docs/` tree is load-bearing (lets /explain add pages with zero config). `exclude_docs` is the only exclusion mechanism.
- **Preserve the `<!-- explain:recent -->` marker AND its exact bullet format** in `docs/index.md` (parsed by `server/documents.py` and the /explain skill's API-down fallback). Any landing redesign keeps them byte-intact. Likewise keep `<!-- material/tags -->` in `docs/tags.md`.
- **This is a STATIC-SITE phase — no server/API/skill changes are required.** Search is browser-only; it must NOT depend on the local FastAPI `server/`. If any slice finds itself wanting to edit `server/`, the /explain skill (`~/.claude/skills/explain`), or the API, STOP and flag it as scope creep (skill changes are P7; graph/backlink is P6).
- **Never hand-edit `docs/current/*.md`; never patch `docs/versions/*`.** Durable-doc versioning happens only at P5.REVIEW. Slices append one-line Doc-impact notes below.
- **Keep tests lean.** Prefer the CI-parity smoke `docker compose run --rm kb build` + small assertions over test suites; grow a suite only if the operator asks or risk clearly warrants.
- **Design ownership:** Claude designs the visuals (palette/type/branding via theme config + `extra_css`) — do not swap in an external/third-party theme or an off-the-shelf design system. mkdocs-material stays the engine.
- **SaaS-someday / P6 graph:** note forward, don't build. Keep the architecture from precluding SaaS; leave graph edges (the P4 `related:` frontmatter) untouched for P6 to consume.

## Doc impact (running — consolidated at P5.REVIEW)

_Each implementation/fix slice appends a one-line note here naming the durable doc(s) it changed and what changed; `P5.REVIEW` consolidates these into new doc versions (one per affected doc). Anticipated targets per area (guidance, not yet actual changes):_

- **S1 design →** `frontend.md` (FIRST real truth: theme config, design tokens/`extra_css`, `overrides/` if used, branding assets/build layout), `experience.md` (visual language, look-and-feel, dark/light behavior), `decisions.md` (palette/typography/branding choices + rejected alternatives), maybe `operations.md` (any new build asset step / social plugin deps), maybe `product.md` (brand identity).
- **S2 landing/UX →** `experience.md` (landing/browse journeys, nav structure, UX states), `frontend.md` (nav feature config, page structure), maybe `decisions.md` (nav-feature + landing-structure choices), `operations.md` only if the `explain:recent` contract handling changes (it must NOT).
- **S3 search →** `experience.md` (search UX/journey), `frontend.md` (client-side search implementation: separator config or custom index + JS), `decisions.md` (CJK approach chosen + tradeoffs vs. the P4 server-side approach), maybe `architecture.md` (client-side static search boundary vs. the server hybrid search), maybe `operations.md` (any build-time index generation).
- **S4 build smoke →** `operations.md` (CI-parity site-build smoke guard + invariants), `qa.md` (site-build acceptance / smoke check), maybe `decisions.md` (why a build guard).

_Actual notes (appended by slices below):_

- **S1 →** `frontend.md`: FIRST real truth — mkdocs-material 9.7.6 theme config gains custom `primary`/`accent` palette, `theme.font` (Source Sans 3 / JetBrains Mono), `logo`/`favicon`, and `extra_css: stylesheets/extra.css`; the design system lives in `docs/stylesheets/extra.css` (token architecture over Material CSS custom properties, both schemes) with branding assets under `docs/assets/`. No `overrides/`, no social plugin.
- **S1 →** `experience.md`: FIRST real truth — visual language is "calm editorial library": warm-ivory light / warm-charcoal dark paper, serif display headings (Fraunces) over clean sans body (Source Sans 3), single deep-teal accent, paper-colored header with hairline rule (not a colored bar), soft borders, no heavy shadows; dark/light via `prefers-color-scheme` + manual toggle; Hangul fallback stacks for mixed EN/KR.
- **S1 →** `decisions.md`: ADR — palette (custom warm-neutral + deep-teal, `--md-hue:34` for warm slate), typography (Fraunces/Source Sans 3/JetBrains Mono, Hangul fallbacks), and branding (original book+spark mark) choices; rejected alternatives: teal header bar, serif body, `overrides/` inline-logo, social cards, hue-only dark scheme (see result.md "Rejected alternatives").
- **S1 →** `operations.md` (minor): the build now emits `docs/stylesheets/extra.css` + `docs/assets/{logo,favicon}.svg` into `site/`; runtime pulls Google Fonts (Source Sans 3, JetBrains Mono, Fraunces). No new build step or CI dep (social cards deliberately skipped).
- **S5 →** `frontend.md`: full design system integrated from the operator's Claude Design project ("Knowledge Base Design System", all 10 targets), replacing the S1 interim baseline. `docs/stylesheets/extra.css` is now organized as §1 color tokens (LOCKED Target 1, verbatim) → §2 type tokens → §3 shape/motion tokens → §4–§8 per-component mkdocs-material hooks (chrome, content, cards, tags, search) → §9 staged landing/article page treatments. Fonts wiring changed: `theme.font: false` in `mkdocs.yml`; all three families (Fraunces/Source Sans 3/JetBrains Mono, exact weights incl. 500/600) load from a single `@import` at the top of `extra.css`, with `--md-*-font-family` tokens (Hangul fallbacks) pointing Material at them (no Roboto request). Brand marks swapped to the delivered `logo.svg`/`favicon.svg`.
- **S5 →** `experience.md`: the "calm editorial library" visual language is now the operator-designed system (not agent taste) — warm ivory/charcoal paper, single deep-teal accent (teal-only invariant across links/nav/TOC/focus/tags/cards/`::selection`/match highlights), Fraunces serif display on a restrained h1–h6 ladder over Source Sans body at lh 1.72, teal-only admonition policy (note = teal rail, warning/others = warm-neutral rail — differentiated by icon+label+weight, no second hue), soft hairlines and one card-hover shadow. Both schemes ship (`default`/`slate`, `--md-hue: 34`). Mixed EN/KR via Hangul fallback stacks.
- **S5 →** `decisions.md`: ADR — (a) operator-locked palette **1a Teal** (Target 1, LOCKED) as the color foundation; (b) design **provenance is the operator's Claude Design project**, integrated via DesignSync (agent no longer authors the visual language — it checks up + integrates); (c) fonts loaded via a single CSS `@import` with `theme.font: false` (rejected: `theme.font` split, which omits the 500/600 weights the design uses); (d) permalink + `::selection` accent rules retained from S1 (design intends them; delivery ships no explicit CSS).
- **S5 →** `operations.md` (minor): `theme.font: false` — Material no longer requests its own webfonts; the single `extra.css` `@import` is now the only Google Fonts request (all three families). Build asset set unchanged otherwise (`extra.css` + `assets/{logo,favicon}.svg` into `site/`).

## Cross-slice notes — design system contract (for S2/S3/S4)

S1 settled the design tokens and theme config every later P5 slice composes on. Reuse these; do not redefine colors/fonts ad hoc.

**Theme config now in `mkdocs.yml` (do not regress):** `logo: assets/logo.svg`, `favicon: assets/favicon.svg`, `font.text: Source Sans 3`, `font.code: JetBrains Mono`, both palette schemes `primary: custom`/`accent: custom`, `extra_css: [stylesheets/extra.css]`. Still NO `nav:`/`strict:`; pin 9.7.6 untouched; `features`/`plugins`/`exclude_docs`/`markdown_extensions` unchanged. S2's nav-feature tuning adds to `features:` only.

**CSS custom-property tokens (defined per scheme in `extra.css` §2–3):**
- Surfaces: `--kb-paper` (page bg), `--kb-surface` (raised: cards/search/admonitions), `--kb-border` (soft hairline).
- Accent: `--kb-accent` (deep teal light `#0f6f68` / lighter teal dark `#63bdb3`), `--kb-accent-strong` (hover/emphasis), `--kb-accent-soft` (low-alpha teal for selections/rules/soft fills), `--kb-tag-bg`/`--kb-tag-fg`.
- Also overridden: Material's `--md-default-*`, `--md-primary-*` (header = paper), `--md-typeset-a-color` (teal links), `--md-code-bg-color`, `--md-footer-*`.
- Shape/type: `--kb-radius` (0.55rem), `--kb-radius-sm`, `--kb-radius-pill`, `--kb-font-display` (Fraunces stack w/ Hangul serif fallback), `--kb-ease` (0.15s).
- **Accent-usage rule:** teal is the ONLY accent — links, hover, focus rings, active nav/TOC, permalinks, tag hover, card hover, `::selection`. Neutrals carry everything else. Don't introduce a second hue.

**Fonts:** headings/site-title/`.md-nav__title` use `--kb-font-display` (Fraunces, optical sizing); body uses `--md-text-font-family` (Source Sans 3 + Hangul fallback); code uses `--md-code-font-family` (JetBrains Mono + Hangul fallback). Budget is spent (2 text families + 1 code) — S2/S3 should NOT add webfonts.

**Card/grid utility (for S2 landing, `extra.css` §7):** `.kb-grid` = responsive `auto-fit minmax(14rem,1fr)` grid; `.kb-card` = soft-bordered card, accent border + lift on hover, both schemes. Two consumption paths (md_in_html is NOT enabled): **(A)** raw-HTML `<div class="kb-grid"><a class="kb-card"><span class="kb-card__title">…</span><span class="kb-card__desc">…</span></a></div>` — link text goes directly in the HTML; **(B)** a markdown list + `{ .kb-grid }` (attr_list) whose `<li>` render as cards. S2 must keep the `<!-- explain:recent -->` marker + exact bullet format byte-intact regardless of which layout it adopts around it.

**For S3 (search UI):** any search-result/highlight styling should ride the existing `.md-search__*` polish and the accent tokens; the search form is already rounded with an accent focus ring. `--md-typeset-mark-color` is set to `--kb-accent-soft`. Search-index/separator work is a separate concern from styling.

### P5.S5 update — the S1 baseline is REPLACED by the delivered design system

The interim S1 `extra.css` is fully superseded. S2/S3 now compose on the
operator's delivered system (integrated 2026-07-11). What changed for consumers:

- **`extra.css` structure** (do not regress): §1 color tokens (LOCKED Target 1,
  verbatim) · §2 type tokens · §3 shape/motion tokens · §4–§8 per-component
  mkdocs-material hook blocks (chrome / content / cards / tags / search) · §9
  staged landing+article page treatments. Tokens keep the same `--kb-*` /
  `--md-*` names as S1 (stable), but **color VALUES changed to palette 1a Teal**
  (paper `#f6f2e8`, surface `#fffefa`, accent light `#0f6f66` / dark `#62bdb2`),
  and new tiers exist: `--kb-surface-sunken`, `--kb-border-strong`,
  `--kb-ink/-secondary/-hint`, `--kb-space-*`, `--kb-shadow-hover`,
  `--kb-text-*` scale, `--kb-leading-*`, `--kb-weight-*`, `--kb-tracking-*`,
  `--kb-measure`, `--kb-font-body/-mono`. Reuse these; never hard-code colors.
- **Fonts wiring changed** (regression risk): `mkdocs.yml` is now
  `theme.font: false` (NOT `font.text`/`font.code`). All three families load from
  the single `@import` at the top of `extra.css`. **S2/S3 must not re-add
  `theme.font` and must not add webfonts** — the budget (2 text + 1 code) is
  spent and the weights (incl. 500/600) are already requested.
- **Targets 8 & 10 are LIVE as CSS.** §6 `.kb-grid`/`.kb-card` + §9 `.kb-hero`,
  `.kb-sec`, `.kb-recent`, `.kb-meta`, `.kb-related`, `.kb-toc` are portable
  classes scoped under `.md-typeset`, **staged for S2/S3 to wire into markup**
  (they don't auto-apply). **S2 (landing):** drop the hero/section/browse markup
  into `docs/index.md` and add `{ .kb-recent }` (attr_list) to the Recent list —
  keeping `<!-- explain:recent -->` + the exact bullet format byte-intact (only
  `<li>/<a>` styled; date/project stay bare text nodes). **S3 (search):** the
  result dropdown styling (§8) is done — engineering the CJK matching
  (separator vs. prebuilt index) is the remaining work.
- The article metadata line / related block (§9 `.kb-meta`/`.kb-related`) need
  per-page HTML or a template; the site still ships **no `overrides/`**. The
  live right-hand "On this page" TOC is Material's secondary nav, accent-skinned
  by §4 (the portable `.kb-toc` is for a future custom article layout only).
- Brand marks are the delivered `logo.svg` (mid-teal `#178a80`, dual-header
  safe) / `favicon.svg` (`#127f76` plate). **Do not** swap the logo for the
  per-scheme accents — the mid-teal is the one value that clears ~3:1 on both
  headers.

**Forward notes:**
- **Social cards deliberately skipped** (needs the `social` plugin + cairosvg/Pillow — CI dep weight, no design payoff now). If ever wanted, it's a separate deps + `plugins:` change, not a token change.
- **`overrides/` custom_dir intentionally NOT created.** The bi-scheme logo is solved by a mid-lightness teal (clears ~3:1 on both headers) so no inline-`currentColor` partial was needed. If a later slice truly needs a partial (e.g. font `<link rel=preload>`), that's the first justification to add `custom_dir`.
- Dev server may be left running (`docker compose up -d kb`, port 8765) for eyeballing; deploys stay manual-push-only.

## Open Questions

- None blocking. Two design decisions are deliberately delegated to their slices: the CJK client-side search approach (Material `separator` tuning vs. prebuilt index + client JS) → P5.S3; the overall visual language (palette/typography/branding, and whether to use `overrides/` custom_dir) → P5.S1. Social cards (needs the `social` plugin + cairosvg/Pillow deps) is optional within S1 — include only if cheap. P5.S4 (build smoke guard) is optional/droppable at the orchestrator's discretion.
