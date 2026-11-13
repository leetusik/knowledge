---
doc_id: decisions
version: v0011
created_at: 2026-07-16T19:33:06+09:00
source: P10.REVIEW
summary: P10 ADRs Postgres-over-SQLite for accounts; namespaced docs-canonical per-tenant storage; KB_API_TOKEN as the pinned tenant-1 master bearer
previous: v0010_p9_adrs_self-host_the_site_live-serve_retire_pages_automated_production_deploy_in-container_reconcile-on-main_fix-forward_edge_re-apply_workflow_dispatch-only_dedicated_runner_key
---

# Decisions

## Status

Accepted decisions: the two-track knowledge store; the GitHub Pages generator (mkdocs-material 9.7.6, re-confirmed over Hugo); the P4 pipeline-hardening set — query-side CJK search (tokenizer unchanged) + recency ranking, hybrid RRF semantic search on Gemini + SQLite BLOB vectors, the `related` cross-link convention, and publish hygiene (`source.repo` basenames + `exclude_docs`); and the P5 web-UI-redesign set — the operator-designed "calm editorial library" visual system (palette 1a Teal, Claude Design provenance, fonts via a single `@import`), the landing/nav choices, browser-only Korean/CJK search via the Material search plugin's `lang`, and a lean site-build smoke guard chosen over `--strict`. D2 (design polish) is resolved by P5 (promoted into the design-system slice). The **P6 knowledge-graph** set adds five accepted decisions — the build-time data-generation mechanism (a mkdocs `hooks:` module), the node/edge model (docs + tag nodes, dead-link ghosts, `docs/current` excluded), project inks as a documented data-viz-only accent extension, a hand-rolled vendored canvas renderer, and an operator-directed **P6.S1 renderer revision** that consciously supersedes two locked S0 interaction decisions (quiet labels A′, idle mingle). The **P7 plugin-packaging** set adds six accepted decisions — MIT license, the plugin hosted in this same repo with an isolated `plugin/` payload (`source: "./plugin"`), dynamic project discovery in the deploy gate, the uv pin `0.8.14`, the first-doc project-landing auto-creation, and the deliberate no-`KB_PUBLIC_BASE_URL`-default for the scaffold. The **P8 hosted-API** set adds seven — a public bearer-guarded endpoint at `knowledge.hi2vi.com` (over a private-network or tailnet path), `KB_GIT_PUSH` publish-on-write **defaulting off**, read auth as an explicit **flag** rather than implied by a set token, a box-generated repo-scoped **SSH deploy key** over a PAT, **no CORS**, **no edge rate-limit zone**, and reuse of the edge's **wildcard origin cert**. Two of them (`KB_GIT_PUSH` default-off, read-auth-as-a-flag) exist for the same reason: **the hosted deployment must not change anything for existing local and plugin users.** The **P9 self-host + automated-deploy** set adds four accepted decisions — **self-host the whole site** (web UI + API) on the box and **retire GitHub Pages** for this repo's site (via reclassifying `pages.yml` out of the plugin's `identical` class + neutralizing it to a build-only CI guard), **serve the web UI live** (a `mkdocs serve` viewer, over static rebuild-on-write or cron rebuild) so docs are fresh-on-write, and an **automated `workflow_dispatch` production deploy** mirroring `hi2vi_web`'s three-script split but diverging for the publish-on-write clone (reconcile-on-`main` never detach/reset/force + deploy the tip; gate + fix-forward, no rollback, because the app runs from a bind mount; **all authoritative git relocated in-container** since opc can't authenticate the SSH origin; edge re-apply inside the gate; `main`-guard + `concurrency: knowledge-deploy`; a **dedicated runner SSH key**). All proven live at P9.S5.

## Purpose

Use this doc as a lightweight ADR index: important choices, rejected alternatives, tradeoffs, and decision sources.

## Decision Log

### Two-track knowledge store

- Date: 2026-07-02
- Status: accepted
- Context: The first real operator task is a personal knowledge store with two distinct consumption paths — a public, browsable site and a database/API for a future personal web UI with hybrid search. Both are served from this single repo, beside the existing MkDocs Material tree.
- Decision: Serve knowledge through two tracks.
  - **Track 1 — `docs/` markdown tree → public GitHub Pages** (delivered by P3): publish the existing MkDocs tree as a static site.
  - **Track 2 — SQLite + FTS5 document store behind a FastAPI service** (delivered by P2): compose service `api` on host port 8766, DB at `data/kb.sqlite3` (gitignored, disposable, rebuilt from files), with FTS5/BM25 keyword search now and a clean `sqlite-vec` extension point for later hybrid search.
- Alternatives considered: Postgres + pgvector for the store — rejected (per P2 intent clarifications) in favor of SQLite + FTS5 with a `sqlite-vec` extension point.
- Consequences:
  - The API owns the write path: a POST writes the `docs/` file, inserts the Recent marker in `docs/index.md`, upserts the DB row, and makes a scoped git commit (stages only touched files — never `git add -A`; never pushes).
  - `docs/` stays canonical; `POST /api/reindex` rebuilds the DB from files and reconciles any drift.
  - Site deploys happen only on the operator's manual `git push` — no automated push from the API or skills.
  - The `/explain` skill (in the `bootstrap_agentic_workspace` repo) becomes the API's client, POSTing documents instead of writing files directly.
  - This repo never edits the `bootstrap_agentic_workspace` repo; the `/explain` update is handled there via a prepared handover prompt.
- Source: P1.REVIEW — intake evidence in P1 `phase.md`; confirmed intents in P2 and P3 `intent.md`.

### GitHub Pages generator: mkdocs-material 9.7.6

- Date: 2026-07-02
- Status: accepted
- Context: At P3 execution the operator reopened the generator choice ("maybe Hugo") for the Track 1 GitHub Pages site.
- Decision: Keep mkdocs-material, pinned exactly to `9.7.6` to match the local viewer image (`squidfunk/mkdocs-material:9.7.6`), so the local `docker compose run --rm kb build` stays a faithful CI pre-check.
- Alternatives considered: Hugo — rejected (`docs/` is plain markdown without front matter; the local viewer + tags page are material-specific; migration cost with no benefit at this scale).
- Consequences:
  - Version bumps happen in two places together: the `compose.yml` image tag and the `pages.yml` pip pin move as a pair.
  - Design polish is deferred post-launch — publish first with the stock indigo / dark-mode look; tracked as deferred job D2.
- Source: P3.REVIEW — evidence in P3 `intent.md` and `phase.md`.

### CJK search at the query layer (tokenizer unchanged) + recency ranking

- Date: 2026-07-08
- Status: accepted (P4.S1)
- Context: `documents_fts` used `tokenize='porter unicode61'` — English stemming only, so Korean/CJK text was not word-searchable. The corpus includes a real 2-char proper noun (창플) and 2-char prefix queries.
- Decision: **Keep `porter unicode61` (no schema change, no FTS drop/rebuild)** and add query-side CJK prefix expansion — `build_match_query` emits any CJK/Hangul/Kana token as a `"tok"*` prefix query. Also add recency-aware ranking: `score = bm25 + RECENCY_WEIGHT·recency` with exp decay (`HALF_LIFE_DAYS=90`, `RECENCY_WEIGHT=0.5`) over the doc's `date`, plus search pagination (`offset`/`total`).
- Alternatives considered: `trigram` — rejected. An empirical in-memory probe showed `trigram` cannot match anything <3 chars, hard-failing 창플 and every 2-char prefix, at ~3× index size + a forced rebuild; `porter unicode61` + `"tok"*` matched the representative queries.
- Consequences / accepted limitations: mid-word substrings don't match (라클), and a pure-ASCII query won't match inside a mixed token (`changple5` vs `changple5의`). On a tiny corpus BM25 IDF collapses toward 0, so recency becomes the effective tiebreak. Re-ranking runs Python-side over the full match set (SQLite math funcs aren't guaranteed portable, and this is the seam hybrid fusion plugs into).
- Source: P4.S1 `result.md`; P4 `phase.md`.

### Hybrid semantic search: Gemini embeddings + SQLite BLOB vectors + RRF

- Date: 2026-07-08
- Status: accepted (P4.S6 — operator scope addition)
- Context: The operator added semantic search to P4. The P2 ADR (SQLite + a `sqlite-vec` extension seam; pgvector declined) stands.
- Decision:
  - **SQLite float32 BLOB vectors + Python cosine, not the `sqlite-vec` extension** — the local python.org macOS venv cannot load SQLite extensions; plain BLOBs behave identically at this scale and run everywhere. Schema is kept `sqlite-vec`-upgradable (vectors keyed by `doc_id`).
  - **Gemini embeddings**, reusing changple5's convention (`google-genai`, model `gemini-embedding-2-preview`, credential `GOOGLE_API_KEY`/`GEMINI_API_KEY`).
  - **RRF fusion** (`RRF_K=60`) over the keyword and vector orderings at the Python seam.
  - **Content-hash embedding cache** (sha256 of model + `title\n\nbody` truncated to 20000 chars) so reindex re-embeds only changed docs.
  - **Graceful BM25-only degradation** (no key / embed failure / `raw=true`).
- Alternatives considered: `sqlite-vec` now (blocked by the extension-load limitation); pgvector (declined at P2, SaaS can revisit).
- Consequences: the SDK's `embed_content` does not batch and Gemini has no `auto_truncate` (both verified live); `gemini-embedding-2-preview` has a low per-minute quota, handled by per-doc incremental persistence + bounded 429 backoff on the reindex path. Embeds run in-request (outside the write lock) or at reindex — no background workers, single-worker invariant intact.
- Source: P4.S6 `result.md`; P4 `phase.md`.

### Cross-link convention: frontmatter `related:`, forward-only, dead links tolerated

- Date: 2026-07-08
- Status: accepted (P4.S4)
- Context: Zero inter-doc links across the explainer docs — the P6 knowledge graph had no edges.
- Decision: A **frontmatter-only** `related:` list of rel_paths (no `## Related` body-section parsing — fragile/duplicative; the site/UI can render relations from the API). **Dead links tolerated** (shape-validated, existence not required — a related doc may be written later). **Forward links only** (no reverse index; P6 derives backlinks by inverting forward edges across the corpus). Exposed on the list/get API (same pass-through as `tags`); `/api/search` deliberately unchanged.
- Consequences: a small, textually-grounded subgraph backfilled (2 of 6 docs); optional/backward-compatible everywhere (the frozen `/explain` skill still works); P6 treats a `related` entry with no matching doc as a broken edge to surface, not an error.
- Source: P4.S4 `result.md`; P4 `phase.md`.

### Publish hygiene: `source.repo` basenames + `exclude_docs` for versioned docs

- Date: 2026-07-08
- Status: accepted (P4.S5 — resolves deferred job D1)
- Context: Every published doc leaked an absolute local `source.repo` path to the public site, and `docs/versions/` (workspace-internal history) published publicly.
- Decision: **Basename representation for `source.repo`** — sanitize at write time (local path → basename, URL passes through) so the surface stays publish-safe without a skill change and forward-compatibly for P7 plugin URLs. **`mkdocs exclude_docs: /versions/`** to hide versioned-doc history from the built site — never `nav:`/`strict:` (auto-nav is load-bearing).
- Consequences: no filesystem leakage on the public surface; versioned-doc history stays in git but out of CI builds; the server sanitizes regardless of skill input (P7-ready).
- Source: P4.S5 `result.md`; P4 `phase.md`.

### Design ownership & provenance: operator-designed system integrated by the agent

- Date: 2026-07-11
- Status: accepted (P5.S5 — intent amendment)
- Context: "Gonna use claude design" was clarified mid-phase to mean the **Claude
  Design tool** (claude.ai/design), not Claude-the-agent designing. The P5.S1
  Claude-written "calm editorial library" design system had already shipped as the
  interim baseline.
- Decision: The **operator** builds the complete design system in a Claude Design
  project ("Knowledge Base Design System", 10 targets); the **agent integrates it
  once, at the end**, via DesignSync — replacing the S1 interim baseline (no
  revert; S1 stays the fallback until the delivery lands). The agent no longer
  authors the visual language; it checks up and integrates. Engineering scope (CJK
  search mechanics, marker-contract safety, build guard) stays with the agent.
- Alternatives considered: keep the agent-authored S1 system (rejected — operator
  wants to own the design); per-target incremental integration (initially chosen,
  then rejected same day for a single end integration — simpler, avoids
  half-integrated states).
- Consequences: the site's visual language is operator-owned; the integration is a
  full-surface `extra.css` rebuild; downstream slices consume the delivered tokens
  and staged classes rather than inventing layout/styling.
- Source: P5.S5 `result.md`; P5 `intent.md` Amendment; P5 `phase.md`.

### Palette 1a Teal (Target 1), LOCKED

- Date: 2026-07-11
- Status: accepted (P5.S5 — operator-locked)
- Context: The design's first delivered, verified target was the color system.
- Decision: Adopt the operator-locked **palette 1a Teal** (Target 1) verbatim as
  `extra.css` §1 — warm ivory paper `#f6f2e8`, raised surface `#fffefa`, deep-teal
  accent `#0f6f66` (light) / `#62bdb2` (dark), `--md-hue: 34` warming the derived
  slate tiers. `--kb-*` are the source of truth, mapped onto Material's `--md-*`.
- Decision: **Teal is the only accent** — links, hover, focus, active nav/TOC,
  permalinks, tags, cards, `::selection`, match highlights. Neutrals carry
  everything else; no second hue. Admonitions follow a teal-only policy (note =
  teal rail; warning/others = warm-neutral rail, differentiated by icon/label/
  weight).
- Consequences: §1 is treated as immutable — never hand-tuned. The dark-safe
  branding logo uses a mid-lightness teal (`#178a80`) that clears ~3:1 on both the
  ivory and the warm-dark header (a single dark teal fails on dark) — so the logo
  is **not** swapped per scheme.
- Rejected (from the S1 interim baseline it replaced): teal header bar, serif
  body, `overrides/` inline-`currentColor` logo, hue-only dark scheme.
- Source: P5.S1/P5.S5 `result.md`; P5 `phase.md`.

### Fonts via a single CSS `@import` (`theme.font: false`)

- Date: 2026-07-11
- Status: accepted (P5.S5)
- Context: The design uses Source Sans 3 at weights **500/600** and JetBrains Mono
  at **500** — weights Material's `theme.font` Google-Fonts request does not
  include (it would synthesize faux-bold).
- Decision: Set `theme.font: false` (no Material webfont request — no Roboto) and
  load all three families (Fraunces / Source Sans 3 / JetBrains Mono, exact
  weights) from a **single `@import`** at the top of `extra.css`; the
  `--md-*-font-family` tokens (with Hangul fallbacks) point Material at them.
- Alternatives considered: `theme.font.text/code` for the sans/mono + `@import` for
  the serif only (the S1 split) — rejected because it omits the 500/600 weights the
  design uses.
- Consequences: one webfont request; the font budget (2 text + 1 code) is spent —
  later slices add no webfonts and keep `theme.font: false`.
- Source: P5.S5 `result.md`; P5 `phase.md`.

### Landing & nav-feature choices

- Date: 2026-07-12
- Status: accepted (P5.S2)
- Context: The landing redesign wired the delivered hero/section/browse design onto
  `docs/index.md` and tuned Material navigation.
- Decisions: (a) enable `navigation.tabs` / `navigation.indexes` / `navigation.top`
  / `navigation.footer`; **defer** `toc.integrate` (the design skins the separate
  right-hand TOC) and `navigation.instant` (custom-JS/search interplay — S3's call,
  ultimately left off since search is zero-JS). (b) **Omit `.kb-card__meta`
  explainer counts** from all Browse cards — the machinery never updates counts, so
  a rendered count would silently go stale. (c) Wire Recent styling via a
  `#recent + ul` selector alias rather than any markup restructuring — attr_list
  cannot class a `<ul>`, so `{ .kb-recent }` on the machinery list is impossible;
  the section head gets `id="recent"` and the list styles as its adjacent sibling.
- Consequence / accepted limitation: under load-bearing auto-nav a section tab
  label comes from the **folder name**, not the index page's `title:`/`<h1>` — so
  `bootstrap_agentic_workspace.sh` reads awkwardly; unfixable without a forbidden
  `nav:` override or a URL-breaking directory rename. Accepted.
- Source: P5.S2 `result.md`; P5 `phase.md`.

### Browser-only CJK search: Material search plugin `lang: [en, ko]`

- Date: 2026-07-12
- Status: accepted (P5.S3)
- Context: The published static Pages site cannot call the P4 local FastAPI hybrid
  search (BM25 + recency + Gemini + RRF, query-time CJK prefix expansion) — search
  must run entirely in the browser. The old `lang: ["en"]` config had no CJK
  support.
- Decision (from a three-step ladder — chose step 1): set `plugins.search` to
  `lang: [en, ko]`. The pinned 9.7.6 image bundles `lunr.ko` + `lunr.multi`, loaded
  by the search worker automatically. The CJK gap closes because Korean is
  space-separated into eojeol **and** Material's typeahead (`search.suggest`)
  appends a trailing wildcard — so index token `관련해` ← query `관련` + `*`
  prefix-matches. `lunr.ko` alone is only a trimmer/stopword filter (no segmenter),
  so it does not solve agglutination by itself. Zero custom JS; `separator` left at
  the default `[\s\-]+`; `theme.language` stays `en` (mixed-language site);
  `navigation.instant` left off.
- Alternatives considered: step 2 — separator-based Hangul/Latin CJK segmentation
  (rejected: adds documented regex surface for no measured acceptance win); step 3 —
  a prebuilt static JSON index + vendored client-side search JS (rejected: not
  needed; more surface and an external-dep risk).
- Accepted tradeoffs: no mid-compound substring match (prefix-only wildcard, no
  segmenter); Korean particles/conjunctions stopword-filtered.
- Contrast: the P4 server-side hybrid stays local-only and is never a dependency of
  the deployed site — same corpus, two independent search implementations by
  deployment target (see architecture).
- Source: P5.S3 `result.md`; P5 `phase.md`.

### Site-build smoke guard over `mkdocs build --strict`; explicit README exclusion

- Date: 2026-07-12
- Status: accepted (P5.S4)
- Context: P5 introduced the first client-side assets (design CSS, landing markup,
  CJK search config) — all of which can silently break the build or degrade search
  with no error. No automated site-build tests existed.
- Decision: Add a lean, stdlib-only invariant-assertion smoke guard
  (`scripts/site_smoke.py`), wired as a deploy-gating CI step, over
  `mkdocs build --strict`. `--strict` turns *any* build warning into a hard
  failure — future `/explain` zero-config page adds must never be blocked by
  warning-level noise — so the guard instead targets named, load-bearing invariants
  only. Also make mkdocs' pre-existing `README.md` auto-exclusion **explicit** in
  `exclude_docs` (silences the standing build warning; changes nothing published).
- Consequence: warning-level noise never blocks a deploy, but the load-bearing
  invariants (marker/bullet contract, `nav:`/`strict:` absence, `theme.font: false`,
  CJK `search.lang`, no `extra_javascript`, pin parity, shipped lunr packs, hero
  toggle, `#recent + ul` adjacency, per-project pages, `versions/` exclusion, no
  path/CDN leaks) are asserted every deploy. `--strict` remains rejected; new
  invariants extend the guard, not `--strict`.
- Source: P5.S4 `result.md`; P5 `phase.md`.

### Knowledge-graph data generation: a mkdocs `hooks:` module (build-time static asset)

- Date: 2026-07-14
- Status: accepted (P6.S1)
- Context: The published static Pages site is browser-only and CI installs only
  `mkdocs-material==9.7.6` — no server, no DB — so the map's graph data **cannot**
  come from the P4 API. It must be a build-time static asset the browser fetches.
- Decision: Generate `graph.json` from a **mkdocs `hooks:` module**
  (`scripts/graph_hook.py`) that writes into `site_dir` at `on_post_build` — fetched
  client-side like Material's own `site/search/search_index.json`. It parses
  frontmatter itself with PyYAML and **does not import `server/*`** (importing the
  reusable `parse_frontmatter` would drag the whole server package into the build).
- Alternatives considered: a standalone `scripts/build_graph.py` CI step — rejected
  because it would run only in CI `mkdocs build`, leaving the local `mkdocs serve`
  dev server without a `graph.json` (the hook runs in **both**, so local dev stays a
  faithful preview with zero `pages.yml` wiring). A `docs/`-path emit — rejected in
  favor of `site_dir`, so serve never triggers a watch-rebuild loop.
- Consequences: the repo's first mkdocs hook; deterministic + publish-safe output
  (repo-relative ids/urls, no timestamps, byte-identical across builds); serve parity
  confirmed at P6.S3. The mechanism is self-contained in `scripts/`, keeping P7
  plugin packaging clean.
- Source: P6.S1 `result.md`; P6 `phase.md`.

### Knowledge-graph node/edge model: docs + tag nodes, project as color, dead links as ghosts

- Date: 2026-07-14
- Status: accepted (P6.S1)
- Context: The `related:` graph alone is sparse (3 directed edges — one 3-doc
  changple5 cluster — plus isolated docs), so an Obsidian-like map built on it would
  be nearly empty. Node metadata must also feed a legend + info panel.
- Decision:
  - **Nodes = the 6 explainer docs + tag nodes** (~26 today). **Tags are
    first-class nodes** — the doc↔tag spokes are the map's connective tissue.
  - **Project is a node *color/group*, not a node** — doc nodes are inked by project
    (a `projects` list drives a deterministic project→ink assignment + legend counts).
  - **Edges = `related:` directed (as authored, P4 forward-only convention) +
    doc–tag.** Backlinks are derived by **inverting `related:` at build time**
    (P4.S4 deferred inversion to P6).
  - **Dead `related:` targets are data, not errors** — a `broken` edge + a `missing`
    ghost node (raw path as title, "no document yet"), never a build failure.
  - **`docs/current/*` and `docs/versions/*` are EXCLUDED** from the v1 graph — a
    different content class (no tags/related), which would be isolated islands. The
    node-selection discriminator is "frontmatter `source` is a mapping containing
    `project`", so the exclusion falls out naturally. `docs/current` inclusion behind
    a toggle is deferred beyond v1.
- Consequences: today 32 nodes / 30 edges; a hub-and-spoke look (tag spokes), not a
  dense mesh — the tag-visibility switch matters for legibility. The data contract is
  documented in **data**.
- Source: P6.S1 `result.md`; P6 `phase.md`.

### Project inks: a documented data-viz-only accent extension (teal-only UI preserved)

- Date: 2026-07-14
- Status: accepted (P6.S0 — operator co-designed in Claude Design)
- Context: The site's design language is strictly one-accent (teal). A graph needs to
  distinguish projects, which a single hue cannot do legibly for categorical data.
- Decision: Introduce a **small muted categorical set** (teal / bronze / plum,
  per-scheme) **scoped to data-viz surfaces only** — node fills and legend chips.
  **Every interactive accent stays teal** (hover, selection ring, halo, active edges,
  links, focus) — the one-accent rule is preserved *where it is UI*. Delivered as
  additive `--kb-graph-*` tokens (no existing token touched; 19/19 locked values
  byte-matched at the S0 check-up; 18/18 contrast claims pass on both schemes).
- Alternatives considered: a teal-only strength ladder for the categories — posed to
  the operator and consciously rejected in favor of the categorical set (teal-only
  cannot separate 3+ projects at the small mark sizes).
- Consequences: the design language now documents a **deliberate, bounded exception**
  to one-accent — categorical inks for data viz, teal everywhere it is chrome/UI.
  Provenance is the operator's Claude Design project ("Knowledge Base Design System",
  P6.S0 close block).
- Source: P6.S0 `result.md`; P6 `phase.md` → "Design guide (P6.S0, locked)".

### Knowledge-graph renderer: hand-rolled vendored canvas force sim (over d3-force)

- Date: 2026-07-14
- Status: accepted (P6.S2)
- Context: The map needs a force layout + pan/zoom/drag/hover/click, vendored (the
  no-CDN guard forbids a CDN). The P6.S0 design's `graph-render.js` is a
  *drawing spec* (mark grammar + draw order), renderer-agnostic — the layout engine
  was left as engineering's call.
- Decision: Ship the renderer as **one vendored file** (`docs/javascripts/graph.js`)
  with a **hand-rolled force sim + canvas drawing — zero third-party code, zero CDN**.
  The design's drawing grammar ports 1:1; only the layout was swapped from the design's
  hand-placed composition to a real (deterministic, hash-seeded) force sim that
  settles in ~600ms (and, since the P6.S1 revision below, then keeps a barely-there
  idle mingle rather than stopping dead).
- Alternatives considered: **`d3-force`** (the earlier lean, ~25 KB) — rejected
  because it needs ≥3 micro-packages vendored, whereas the corpus is tiny (O(n²) sim
  is trivial at ≤150 nodes) and the design's drawing spec is already hand-rolled
  canvas. Zero third-party files keeps the no-CDN guard surface minimal and the P7
  plugin-packaging path clean. A full vendored graph lib — rejected (overkill).
- Consequences: the repo's first custom JS; `extra_javascript` allowlisted to exactly
  this one entry; the sim's force constants are engineering's (validated on a headless
  numeric harness — related edges tighter than tag edges); scheme changes repaint via
  a `data-md-color-scheme` MutationObserver. Browser visual QA is owed to the operator.
- Source: P6.S2 `result.md`; P6 `phase.md`.

### P6.S1 renderer revision: quiet labels A′ + idle mingle (supersedes two locked S0 decisions)

- Date: 2026-07-14
- Status: accepted (P6.S1 — operator-directed, via Claude Design)
- Context: After P6 shipped, the operator did visual QA in Claude Design and directed
  a co-designed revision of the map's interaction (the "P6.S1 revision" spec, mirrored
  as `BRIEF_REVISION.md` + a reference `kbGraph.mount()`). Two of the revised behaviors
  deliberately **overturn decisions locked at P6.S0**.
- Decision: adopt the revised interaction model. It **supersedes** two S0 locks:
  - **Label Strategy A → A′.** S0 locked "doc titles always on". A′ makes the idle map
    **marks-only (quiet)**: a node's title reveals on hover/selection, doc titles fade
    up past ~110% zoom, and tag labels stay on-demand.
  - **Settle-then-still → settle-then-mingle.** S0 locked "settle ~600ms, then stop —
    no idle drift". The map now keeps a **barely-there idle mingle** (≤
    `--kb-graph-drift` from rest over `--kb-graph-drift-period`, tags ×1.5). Reduced
    motion keeps the old behavior — paint at rest, hold still.
  Additive (not supersessions): pointer/pinch zoom toward the cursor + 1:1 pan; sticky
  node re-placement with spring-following tag spokes; a legend that **highlights
  rather than filters** (`.is-on` lens); and (F3) roomier degree-aware/owner-anchored
  seeding with placement/camera/lens surviving an in-tab reload via `sessionStorage`.
  Four `--kb-graph-*` tokens were added, none changed; delivered as additive
  `extra.css` §10 + a renderer live-model port from the design's `kbGraph.mount()`.
- Alternatives considered: keep the S0-locked "docs-always / settle-then-still" model —
  rejected by the operator after live QA (always-on labels were noisy on the tag-heavy
  corpus; a dead-still map read as inert).
- Consequences: the P6.S0 "Label Strategy A" and "settle-then-still" locks are
  **consciously superseded** (recorded below), not silently broken; the P6.S0 design
  provenance and the categorical project-ink extension are unchanged. Two latent CSS
  §10 specificity defeats surfaced by the same browser QA were fixed (F2 `[hidden]`,
  F4 full-bleed margin — see qa). Browser *feel* QA remains owed to the operator (a
  re-review headless-Chrome CDP probe confirmed the geometry / overlay-hide /
  reload-restore behavior).
- Source: P6.F1 `result.md`; P6 `phase.md` → "P6.F1"; the design mirror's
  `BRIEF_REVISION.md`.

### Package the feature as a Claude Code plugin hosted in this repo (`source: "./plugin"`)

- Date: 2026-07-14
- Status: accepted (P7 — operator-confirmed intent)
- Context: The operator wanted `/explain` + the knowledge store usable by other Claude
  Code users, and eventually SaaS-like (noted, out of scope). "Plugin style" was
  clarified to mean a **real Claude Code plugin** (`.claude-plugin/` + marketplace
  manifest), installable via `/plugin` — and it should **live in this knowledge repo**,
  after which the bootstrap repo retires its embedded `/explain`.
- Decision: One repo is both marketplace and plugin. A repo-root
  `.claude-plugin/marketplace.json` (marketplace `knowledge`, owner `leetusik`) has a
  single entry `{name:"knowledge", source:"./plugin"}`; the installable payload lives
  entirely under **`plugin/`** with `plugin/.claude-plugin/plugin.json`. The `version`
  is set **only** in `plugin.json` (never the marketplace entry). Ships the two
  user-facing skills `/knowledge:explain` + `/knowledge:setup`.
- Alternatives considered: extending the bootstrap installer, a fork-and-go template
  repo, or a plugin+template combo — all rejected in favor of a real installable
  plugin. `source: "./"` — rejected outright: a plugin's `source` is copied whole into
  every installer's cache, so `./` would ship the operator's personal `docs/`, `works/`,
  `data/`, `.env`, and tokens. Payload isolation under `plugin/` is the load-bearing
  boundary.
- Consequences: nothing personal ships (only the templated KB + two skills); the
  scaffold is a checked-in byte-parity **snapshot** of the repo, kept in sync by a
  root-only parity guard + CI (see architecture/operations); the bootstrap repo stays
  exactly as-is until this review passes, then its P7 becomes unblocked (never edited
  from here).
- Source: P7 `intent.md`; `P7.DECOMP`/`P7.S2` `result.md`; P7 `phase.md`.

### MIT license

- Date: 2026-07-14
- Status: accepted (P7 — operator decision)
- Context: A publicly installable plugin needs an explicit license.
- Decision: **MIT** — a root `LICENSE` file (`Copyright (c) 2026 leetusik`) plus
  `"license": "MIT"` in `plugin.json`.
- Source: P7 `phase.md` Constraints; `P7.S2` `result.md`.

### Portable deploy gate: dynamic project discovery over a hardcoded `PROJECTS` list

- Date: 2026-07-14
- Status: accepted (P7.S1)
- Context: `scripts/site_smoke.py` hardcoded the operator's three project names and
  required a per-project `site/<project>/index.html`, a Recent bullet, and graph
  doc-count identities — so a **fresh scaffold** (none of those projects) would fail its
  own `pages.yml` deploy gate. The guard must ship byte-identical **and** be meaningful
  on a new KB.
- Decision: Replace the hardcoded list with a module-level `discover_projects(root)`
  (sorted non-reserved `docs/` subdirs carrying ≥1 non-`index.md` `*.md`), used by
  **both** the built-site per-project check **and** `check_graph`'s filesystem
  doc-count — **one discovery truth** so they cannot drift — with a zero-project teeth
  guard. On the operator's repo it yields exactly the previous three projects.
- Alternatives considered: keep a hardcoded list and special-case scaffolds (rejected —
  two code paths, drift risk); derive from `graph.json` only (rejected — the built-site
  check needs a filesystem view independent of the graph).
- Consequences: `site_smoke.py` joins the byte-identical template class; a scaffold with
  only its seed project passes the same guard the operator's repo runs.
- Source: `P7.S1` `result.md`; P7 `phase.md`.

### uv pinned to `0.8.14` (reproducible container build)

- Date: 2026-07-14
- Status: accepted (P7.S1)
- Context: The `Dockerfile` copied uv from a **floating** `ghcr.io/astral-sh/uv:latest`
  stage — non-reproducible, and it must ship byte-identical in the template.
- Decision: Pin to `ghcr.io/astral-sh/uv:0.8.14` — the uv version actually running on
  the host, i.e. the one that produced `uv.lock` (the plan's suggested `0.11.28` rested
  on a wrong host-version premise; `0.8.14` is the locally-proven, reproducible pin).
  Shipped byte-identically in `plugin/templates/kb/Dockerfile`.
- Consequences: reproducible builds; a future uv bump is a one-line change in both the
  repo `Dockerfile` and the template snapshot (kept in parity by the guard).
- Source: `P7.S1` `result.md`; P7 `phase.md` Findings §3.

### Write path auto-creates a project's landing on its first document

- Date: 2026-07-14
- Status: accepted (P7.F1)
- Context: The S6 E2E found that a scaffold user documenting a **second** project would
  fail their next Pages deploy: `site_smoke` requires `site/<project>/index.html` per
  project and mkdocs `navigation.indexes` does not synthesize a missing landing. The
  write path created the dated doc + Recent bullet but never the project landing.
- Decision: **The API owns it.** `create_document` calls
  `ensure_project_landing(docs_root, project)` inside `WRITE_LOCK` right after writing
  the doc; when a landing was absent it writes a minimal `docs/<project>/index.md`
  (H1 + one line, **no frontmatter** → stays a non-doc, excluded from doc-counting and
  the graph), joins it to the scoped commit (3 paths), and reports `landing_created`.
  Existing landings are **never overwritten**. The explain skill's file-fallback branch
  does the same when the API is unreachable. No delete-side cleanup (a project with only
  `index.md` drops out of `discover_projects`, so the gate stays satisfied).
- Alternatives considered: a mkdocs plugin/`nav` synthesis (rejected — auto-nav is
  load-bearing, no `nav:`); a site_smoke exception for landing-less projects (rejected —
  it would hide a real broken deploy).
- Consequences: every project satisfies the per-project deploy-gate invariant for
  API-written and fallback-written docs alike; one new observable response field
  (`landing_created`).
- Source: `P7.F1` `result.md`; P7 `phase.md` → "P7.F1".

### Scaffold leaves `KB_PUBLIC_BASE_URL` unset (localhost viewer root is correct)

- Date: 2026-07-14
- Status: accepted (P7.S1 / review)
- Context: `public_base_url()` defaults to `http://localhost:8765` and is used at
  exactly one place to build the 201 response `url` field. That base is the **local
  mkdocs viewer**, served at root; the `/knowledge/` subpath exists only on the
  published Pages site. Setting `KB_PUBLIC_BASE_URL` to a subpath would **break** local
  viewer links.
- Decision: The scaffold's `compose.yml` deliberately does **not** set
  `KB_PUBLIC_BASE_URL` — the default localhost root is correct for the default-port
  local viewer. `compose.yml` stays parameterized for TZ + ports only.
- Accepted limitation (weighed at review): a scaffold on **advanced custom ports** gets
  a default-port `url` in the 201 response body — a **cosmetic** mismatch in one
  informational field only; the document write, the site build, and the viewer are all
  correct, and the default-port journey (the vast majority) is fully correct. Not a
  release blocker at `0.1.0`; a future slice could derive `KB_PUBLIC_BASE_URL` from
  `KB_VIEWER_PORT` if custom ports become common.
- Source: P7 `phase.md` Findings §2 + S6 caveat; review judgment (`P7.REVIEW`).

### Host the API publicly at `knowledge.hi2vi.com` with a bearer (over a private-network path)

- Date: 2026-07-14
- Status: accepted (P8, operator-fixed at execution kickoff)
- Context: The hi2vi content agent (a Docker co-tenant on the same OCI box) needs to write and search this knowledge base. Candidates: reach the API over the box's **private** Docker network only; a **tailnet**-only endpoint; or a **public** subdomain + token.
- Decision: **Public**, at `https://knowledge.hi2vi.com` — a subdomain vhost on the box's existing nginx edge, Cloudflare-proxied — with **bearer auth on every `/api/*` call**. One subdomain is enough; there is no separate private-network path.
- Rationale / tradeoff: the corpus is **already fully public** on GitHub Pages, so a public API surface leaks no new *content* — the risk it adds is unauthenticated **abuse/load** and **write authority**, which the bearer addresses directly. A public URL also keeps the consumer simple (no network topology coupling) and leaves the door open to consumers that are not co-tenants on this box.
- Consequences: TLS + a real auth story became mandatory (see the read-auth ADR); reads are gated not for secrecy but to stop unauthenticated abuse; `healthz` stays open for probes.
- Source: P8 `intent.md` (operator addendum) + `phase.md` hosting design §1/§3.

### `KB_GIT_PUSH` — publish-on-write, default **off**

- Date: 2026-07-14
- Status: accepted (P8.S1)
- Context: intent point 4 requires agent writes to reach `main` → GitHub Pages **without operator action**. That directly contradicts the standing "agents/skills/API commit but **never push**" rule (P1/P2).
- Decision: the write path pushes its scoped commit to `origin/main`, gated by a **new `KB_GIT_PUSH` flag that defaults to `false`**. Only the hosted box sets it true. The push is `fetch origin main` → **rebase onto `origin/main`** → **non-force** `push origin HEAD:main`; **never `--force`, never `git add -A`**. Failure is best-effort — still 201, with `pushed:false` + `push_error`.
- Alternatives considered: a **knowledge-side sync** (cron/webhook pulling agent writes) — rejected as more moving parts for a once-daily writer, and it would leave a window where the doc exists but isn't published. **Push by default** — rejected: it would silently start pushing from every existing local and plugin install.
- Consequences: "the agent never pushes" becomes a **flag-gated** rule with exactly one deliberate exception (recorded in security). The default-off inversion is the compatibility contract — an existing user upgrading gets zero behavior change. The rebase-before-push doubles as the box's freshness mechanism, so no mirror/cron is needed. **DELETE pushes too**, for parity on the reverse path.
- Source: P8 `phase.md` design §2 + S1 findings.

### Read auth is a **flag** (`KB_REQUIRE_READ_AUTH`), not implied by "a token is set"

- Date: 2026-07-14
- Status: accepted (P8.S2)
- Context: The hosted deployment must put reads/search behind the bearer. The obvious implementation — "if `KB_API_TOKEN` is set, gate reads too" — needs no new config.
- Decision: add a **separate `KB_REQUIRE_READ_AUTH` flag, default false**. Reads are gated only when **both** it and `KB_API_TOKEN` are set. The new `require_read_bearer` dependency **delegates to** the existing write-path `require_bearer` rather than reimplementing the check.
- Alternatives considered: **token-implies-closed-reads** — rejected, and this is the important call: it would have **silently broken every existing local and plugin user who had set a token** (their token guards writes; their reads are open and expected to stay open). Convenience for one box is not worth a breaking change for everyone else.
- Consequences: two flags to set on the box instead of one; a backward-compat unit test (token set + flag unset ⇒ reads still open) is now a standing invariant. Delegating to `require_bearer` means the read and write auth surfaces are literally the same code and cannot drift.
- Source: P8 `phase.md` design §3 + S2 findings.

### Push credential: a repo-scoped SSH **deploy key**, generated on the box

- Date: 2026-07-14
- Status: accepted (P8.S3/S4, hardened by P8.F2)
- Context: The hosted API needs write access to this repo to push. Options: a fine-grained **PAT** (`contents:write`), or a **deploy key** registered on this repo alone.
- Decision: an **SSH deploy key with write access, scoped to this repo**, generated **on the box** in its final location and mounted read-only into the container; `GIT_SSH_COMMAND` pins the identity (`IdentitiesOnly=yes`) and the **host key** (a pinned `known_hosts`, `StrictHostKeyChecking=yes`).
- Alternatives considered: a **PAT** — rejected as a worse blast radius (it spans the operator's repos) with an expiry to babysit; kept as a fallback since `push()` is remote-URL-agnostic. **`accept-new`** host-key policy — rejected: GitHub's host keys are static and publicly verifiable, so pinning closes the first-push TOFU window for free.
- Consequences (the hard-won part): the original "generate locally → copy to the box → delete the local copy" flow **left a live write-capable private key in this public repo's working tree**, plus an orphaned second key still authorized on GitHub. Both were remediated, and the flow was fixed at the source. The durable rule: **generate a credential where it will live**, and **never rely on a "remember to delete it" step**. Also: `openssh-client` must be in the image — `git` alone cannot push over SSH, and because push is best-effort, its absence fails *silently* (see qa).
- Source: P8 `phase.md` S3/S4 findings + the F2 security finding.

### No CORS on the hosted API

- Date: 2026-07-14
- Status: accepted (P8.S2)
- Context: A newly-public HTTP API invites the reflex to add CORS middleware.
- Decision: **none.** The consumer is **server-to-server** (the hi2vi agent runs server-side), and the published Pages site searches **browser-only via lunr** and never calls this API — so no browser origin ever reaches it.
- Consequences: recorded as an intentional omission, not an oversight. A future browser client would be a separate, explicit change (and would reopen the auth question, since a browser cannot hold this bearer safely).
- Source: P8 `phase.md` design §3 + S2 findings.

### No `limit_req` rate-limit zone on the vhost

- Date: 2026-07-14
- Status: accepted (P8.F2)
- Context: The reflex for a public endpoint is an nginx `limit_req` zone.
- Decision: **none on our vhost.** Defenses are the bearer on every `/api/*` call, Cloudflare in front, and a single known low-volume consumer.
- Rationale: `limit_req_zone` names are **global across the edge's whole `conf.d/` tree**, which is tested and reloaded **as a unit** — a duplicate zone name is a hard `nginx -t` failure that blocks the reload for **every site on the box** (demonstrated empirically). A rate limit we don't need is not worth a foot-gun aimed at every co-tenant.
- Consequences: if the endpoint ever gains untrusted consumers, add throttling deliberately (app-side, or a carefully-namespaced edge zone). Recorded as an open question in security.
- Source: P8 `phase.md` F2 findings (verified live against the edge).

### Reuse the edge's wildcard origin certificate (no cert provisioning)

- Date: 2026-07-14
- Status: accepted (P8.F2 — settles the DECOMP "TLS cert mechanism" open question)
- Context: DECOMP left open whether the box's edge used a `*.hi2vi.com` wildcard origin cert (one cert would cover a new subdomain free) or per-host certs.
- Decision: **wildcard, confirmed by inspection of the live edge** — its Cloudflare Origin CA cert carries `*.hi2vi.com`, valid to 2041. `knowledge.hi2vi.com` needs **no cert work at all**; the per-host-cert branch drafted in the vhost was deleted as dead code.
- Consequences: adding a subdomain to this edge is a **host file drop + a graceful reload**, nothing more. (The edge's config is declarative host state on read-only bind mounts — see operations; this is what makes the old "a co-tenant deploy wipes your vhost" fragility obsolete.)
- Source: P8 `phase.md` F2 findings.

### Self-host the whole site (web UI + API) at `knowledge.hi2vi.com`; retire GitHub Pages

- Date: 2026-07-15
- Status: accepted (P9 — operator scope expansion, mid-DECOMP)
- Context: P9 began as API-deploy automation; the operator expanded it to make the box the **single public front door** for the whole site so others can browse the knowledge base directly, distinct from hi2vi, reusing the existing mkdocs web UI, with **no more GitHub Pages** (one public URL).
- Decision: add a **`knowledge-site`** viewer to `compose.prod.yml` and serve the human web UI from the box at the **domain root** (`site_url`/`KB_PUBLIC_BASE_URL`/parity-locked `KB_SITE_URL` cut to `https://knowledge.hi2vi.com/`, dropping the `/knowledge/` subpath). **Retire Pages for this repo's site** by reclassifying `.github/workflows/pages.yml` **out of** the plugin manifest's `identical` class and **neutralizing** the repo copy to a **build-only CI guard** (`mkdocs build` + `site_smoke.py`, no `deploy` job / `upload-pages-artifact` / `pages:write`), then turning repo Settings→Pages Off. The **shipped plugin keeps Pages** (`plugin/templates/kb/.github/workflows/pages.yml` untouched — now free to diverge).
- Alternatives considered: keeping Pages as a fallback mirror (declined — one public URL); an operator-settings-only Pages cutover leaving every file byte-identical (declined — the `push`-triggered `pages.yml` would then fail red on every doc push); a full `rm` of `pages.yml` (declined — it anchors `site_smoke.py`'s pin-parity read + more churn).
- Consequences: one public front door for both tracks; no ~65 s Pages lag; two CIs stay green; the reclassify-out-of-`identical` is what lets the repo retire Pages while the plugin keeps it. Cutover was gap-free (box proven live at S5 **before** Pages off).
- Source: P9 `intent.md` (scope expansion); `phase.md` §A–§C + S1/S5 findings.

### Serve the web UI **live** (`mkdocs serve`), not a static build or cron rebuild

- Date: 2026-07-15
- Status: accepted (P9 — operator clarification)
- Context: The box could serve Track 1 three ways: live-serve (`mkdocs serve` off the clone), a static `mkdocs build` rebuilt on write, or a periodic cron rebuild.
- Decision: **live-serve** — a `knowledge-site` container running `mkdocs serve --dev-addr=0.0.0.0:8000 --livereload`, mirroring the local `compose.yml` `kb` service, off the **same** box clone the api writes into. `--livereload` is **explicit and load-bearing**: the flag never arms by default in this image, and it is what makes an api write surface on the site with no restart. **Fresh-on-write** is the payoff — the api writes into the shared bind-mounted `docs/`, cross-container `inotify` fires the mkdocs rebuild, and the doc is live immediately (proven at S5: POST → the page 200s with no restart).
- Alternatives considered: static rebuild-on-write (declined — more glue: a build step + a swap on every write); periodic cron rebuild (declined — staleness window). Both add machinery the live-serve path avoids.
- Consequences: near-zero glue (the stock mkdocs image); the fresh-on-write assumption (cross-container inotify over a shared bind mount) was the live-serve choice's critical risk, so S5 gated on proving it — it held, no polling/rebuild-on-write fallback needed.
- Source: P9 `intent.md` Clarifications; `phase.md` §A/§H + S5 findings.

### Automated production deploy: mirror hi2vi's three-script split, diverged for the publish-on-write clone

- Date: 2026-07-15
- Status: accepted (P9 — S2/S3/F1, design-first sign-off)
- Context: P8's box deploy was hand-run. P9 automates it via a GitHub Action, mirroring `hi2vi_web`'s proven `deploy-production.yml` + three-script `deploy/` chain — but knowledge's box clone is **also the publish-on-write clone** (the api commits + pushes to it as root), which hi2vi's deploy-only clone is not, so several core pieces had to diverge.
- Decision: a **`workflow_dispatch`-only, main-guarded** `Production Deploy` action driving a three-script chain (runner-transport driver → on-box gate → `deploy/deploy.sh`), with these knowledge-specific divergences:
  - **Publish-on-write reconcile-on-`main`, never detach/reset/force.** Instead of hi2vi's detached `git checkout $REF` (which would move HEAD off `main` and could strand an unpushed doc), the box stays on `main` and reconciles: refuse a dirty **tracked** worktree (permit ahead/unpushed), `fetch --prune origin main`, **fail-closed** `TARGET_SHA` ancestor gate, `merge --ff-only` when behind / `rebase` when ahead / `rebase --abort`+fail on conflict. It deploys origin/main's **tip** (not a detached SHA) — a deliberate, documented divergence; `TARGET_SHA` is verified an ancestor of the tip, fail-closed.
  - **Run the reconcile in a one-shot root container reusing the `api` service.** The box clone's `.git` is root-owned (the api commits as uid 0) and `origin` is an SSH URL whose deploy key is root-owned. A `docker compose run --rm --entrypoint sh api …` inherits the mount, the deploy key, `GIT_SSH_COMMAND`, and the baked `safe.directory /repo` — so git runs as uid 0 with SSH auth, matching the ownership model. (No `image:` added; a unique `--name` avoids the `container_name` clash.)
  - **Gate + fix-forward, no rollback (§F v1).** The app runs from the **bind mount** (`.:/repo`, `KB_ROOT=/repo`; the image ships only interpreter+git+deps), so an image-tag flip (hi2vi's rollback) **cannot** revert mounted `server/` code. On health failure the deploy captures artifacts and exits non-zero; recovery is **fix-forward** (merge a fix, re-dispatch) — never an auto git rollback that could move the publish-on-write checkout backwards under the running container.
  - **All authoritative git relocated in-container (F1).** The gate's `fetch`/ancestor check originally ran as **`opc`**, which **cannot authenticate** the SSH origin (root-owned deploy key it can't read, no opc GitHub key) — it would kill every deploy. F1 deleted the opc-side git gate and made `deploy.sh`'s root reconcile container the single authoritative git-truth path; the on-box gate is now pure opc-safe orchestration (assert inputs → `deploy.sh` → edge re-apply → artifacts).
  - **Edge re-apply inside the gate**, after a healthy deploy: `install` the vhost into `/home/opc/edge/conf.d/` → the edge's own `./deploy.sh` (`nginx -t` gate → graceful reload, never recreate). A failed edge `nginx -t` **fails the deploy loudly**; skipped if the deploy is non-zero.
  - **`main`-guard + `concurrency: knowledge-deploy` + `workflow_dispatch`-only** so the agent's constant publish-on-write pushes to `main` **never** trigger a redeploy, and two dispatches can't interleave.
- Alternatives considered: `sudo git` on the box for the root-owned `.git` (declined — the one-shot container reuses the existing ownership model, no host sudo grant); a `push`-triggered CD variant (declined — publish-on-write would self-trigger endlessly); best-effort git rollback (v2, declined — more moving parts near the publish-on-write invariant, useless against bind-mounted code).
- Consequences: a repeatable, auditable box deploy; the reconcile + mount-based-rollback are the knowledge-specific inventions that make this its own phase, not a hi2vi copy-paste. Proven live at S5 (run 29385684066).
- Source: P9 `phase.md` §D/§E/§F + S2/S3/F1/S5 findings.

### Dedicated GHA runner → `opc@box` SSH key (three `ORACLE_SSH_*` repo secrets)

- Date: 2026-07-15
- Status: accepted (P9 — S4)
- Context: The runner needs an SSH key to reach `opc@box`. Options: reuse hi2vi's existing runner key, or mint a dedicated one. This is a **second, independent** credential from P8's container→GitHub push deploy key.
- Decision: **mint a dedicated `knowledge` runner key** (ed25519, `knowledge-gha-runner@box`), added as three `leetusik/knowledge` Actions secrets (`ORACLE_SSH_PRIVATE_KEY`/`ORACLE_SSH_KNOWN_HOSTS` required, `ORACLE_SSH_PASSPHRASE` optional). Least-privilege + P8's leaked-key history make a dedicated key (rotatable/revocable without touching hi2vi's deploy) the safer call.
- Alternatives considered: reuse hi2vi's runner key (declined — shared blast radius; a rotation would ripple across deploys). A forced-command lock (n/a — the driver `scp`s + runs a script).
- Consequences: the two P9 credentials are kept **strictly distinct** (see security); the runner key's private half is the one deliberate secret-transit exception (`umask 077` tempdir → `gh secret set` → shred). The `.pub` is **appended** to `opc`'s `authorized_keys`; the host key is pinned + verified out-of-band. Proven to authenticate under the driver's exact flags before S5.
- Source: P9 `phase.md` §G + S4 findings.

### Postgres (async SQLAlchemy 2.0 + psycopg3) for the accounts control plane — over SQLite

- Date: 2026-07-16
- Status: accepted (P10 — S1)
- Context: P10 introduces accounts/tenancy (users, tenants, projects, credentials, sessions) — the SaaS pivot's first durable relational, transactional, PII-bearing data. The content plane's disposable SQLite is rebuilt from files on boot, so it is unsuitable for durable account state. The `vocky` repo is the closest prior art. An Open Question: async-SQLAlchemy-in-a-sync-app vs sync SQLAlchemy + psycopg.
- Decision: stand up a **separate Postgres control plane** (six tables ported from vocky: `users`, `tenants`, `tenant_members`, `projects`, `project_credentials`, `auth_tokens`), reached via **async SQLAlchemy 2.0 + `postgresql+psycopg` (psycopg3)** with Alembic migrations, in a layered `security → types → repository → service` accounts package. Async was chosen over sync psycopg for the cleaner integration (single worker means no async-throughput requirement); the plane is a **lazy singleton**, dormant when `DATABASE_URL` is unset.
- Alternatives considered: keep everything in SQLite (declined — the content DB is disposable/rebuilt-from-files; account state must be durable + transactional + concurrently safe). asyncpg (declined — psycopg3 integrated more cleanly). A single shared datastore (declined — content stays files-canonical; conflating the planes would invert that invariant).
- Consequences: a `postgres:17` service in both compose files, an explicit `alembic upgrade head` deploy step, and new `.env` prereqs (`POSTGRES_PASSWORD`). The content plane is untouched and still boots without Postgres. Passwords are argon2id; tokens are sha256-hex at rest (see security).
- Source: P10 `phase.md` (S1 doc-impact) + intent.md.

### Namespaced, `docs/`-canonical per-tenant storage — no per-tenant repos or sites

- Date: 2026-07-16
- Status: accepted (P10 — S5)
- Context: The single-repo git-publish content model (one `docs/` tree, in-process `WRITE_LOCK`, in-request push) won't scale to many tenants as-is. P10 must store each tenant's corpus while (a) keeping tenant #1's `docs/<project>/…` paths + public site unchanged (frozen contract) and (b) not touching the disposable-SQLite / files-canonical invariant.
- Decision: keep content **files-canonical**; tenant #1 stays in `docs/` (git-published, unchanged), and every other tenant's content lives under a **namespaced, non-published `<KB_ROOT>/tenants/<uuid>/` root** (a sibling of `docs/`, gitignored, never in the mkdocs build). `documents.tenant_id` scopes the disposable SQLite; **reindex re-derives `tenant_id` from the file path**, so tenant identity survives the disposable-DB rebuild. **No** per-tenant git repos, **no** per-tenant public sites (P12 owns dashboards), **no** invariant inversion.
- Alternatives considered: DB-canonical content (declined — inverts the core invariant). Per-tenant git repos (declined — heavy, and P10 scopes out per-tenant publishing). A DB-only `tenant_id` (declined — wiped on every boot reindex; identity must live in the path). An mkdocs `exclude_docs` rule for `tenants/` (unnecessary — a sibling of `docs_dir` is simply never in the build; exclusion is physical separation + `.gitignore`).
- Consequences: cross-tenant content isolation on every query + a cross-tenant 404; `/tenants/` in `.gitignore`; reindex/boot walk both roots with tenant-scoped vanished-row cleanup. **Known limitation:** non-#1 `tenants/` content is on-box-only (no git backup, no site) — a backup/snapshot job is a flagged follow-up before non-#1 tenants carry real data at scale.
- Source: P10 `phase.md` (S5 doc-impact) + resolved Open Question.

### `KB_API_TOKEN` as the pinned tenant-#1 master bearer

- Date: 2026-07-16
- Status: accepted (P10 — S4; F1 refinement)
- Context: The live hi2vi content agent authenticates to `/api/*` with a single `KB_API_TOKEN`. Multi-tenancy must not break it — the intent requires tenant #1 to keep working with **zero** client changes.
- Decision: keep `KB_API_TOKEN` as tenant #1's **pinned master bearer** — a config special-case (resolved to the operator's tenant via `KB_OPERATOR_EMAIL`), **not** a DB credential and therefore **un-revokable** from the accounts store. New tenants use `vk_` per-project keys; session tokens drive the control plane + own-corpus reads. Unresolvable (401) when `KB_OPERATOR_EMAIL` is unset or the operator isn't seeded (a safe misconfigured state, never a silent accept). **P10.F1** normalized `KB_OPERATOR_EMAIL` (`.strip().lower()`) inside `get_tenant_one_id()` so the pin is casing-tolerant.
- Alternatives considered: migrate the hi2vi agent to a `vk_` key (declined — a client change the intent forbids for P10). Make the master a real revokable DB credential (declined — adds a seeding/rotation coupling for the one bearer that must always work; the un-revokable special-case is the deliberate tradeoff).
- Consequences: the frozen `POST /api/documents` contract is preserved with zero consumer changes (verified in the P10 review E2E); the master bearer is a documented, un-revokable exception noted in security; `KB_OPERATOR_EMAIL` is a hosted deploy prerequisite.
- Source: P10 `phase.md` (S4/F1 doc-impact) + Legacy bearer decision.

## Superseded Decisions

- The P2 "clean `sqlite-vec`/RRF seam, no embeddings this phase" framing is **consumed, not superseded**, by P4.S6: hybrid search is live via SQLite BLOB vectors + Python cosine, with the seam kept `sqlite-vec`-upgradable.
- The **P3 "design polish deferred post-launch (D2)"** consequence is **resolved**, not superseded: D2 was promoted into P5's design-system slice and delivered as the operator-designed "calm editorial library" system (palette 1a Teal). The stock indigo / dark-mode look is retired.
- The **P5.S1 agent-authored "calm editorial library" design system** is **superseded** by the P5.S5 operator-designed system of the same name: same visual direction, but the tokens/values and provenance are now the operator's Claude Design delivery (palette 1a Teal, fonts via `@import`), not agent taste. S1 served as the interim baseline until the delivery landed.
- The **P6.S0 "Label Strategy A" lock (doc titles always on)** is **superseded** by the operator-directed P6.S1 quiet labels (Strategy A′): the idle map is marks-only; titles reveal on hover/selection and above ~110% zoom.
- The **P6.S0 "settle-then-still / no idle drift" motion lock** is **superseded** by P6.S1's settle-then-mingle (a bounded idle wander; reduced motion still paints at rest and holds still).
- The **P1/P2 "the API never pushes; deploys are the operator's manual `git push`" rule** is **narrowed, not abandoned**, by P8: it remains the default and the guarantee for every local and plugin deployment (`KB_GIT_PUSH=false`), with **one** deliberate, flag-gated exception — the hosted box, whose scoped, rebase-onto-remote, non-force push is what makes agent-written docs publish without operator action.
- The **P8 DECOMP "shared-edge fragility" rule** — that the vhost/cert/network were undeclared runtime state on the old shared nginx container, wiped by every co-tenant deploy, requiring a cross-repo re-apply script and an "assume the endpoint is down after any co-tenant deploy" operating rule — is **superseded by fact**, discovered at P8.F2: the box had already cut over to a **dedicated edge whose `conf.d/` and `certs/` are read-only host bind mounts**, so the config is declarative host state that a co-tenant deploy cannot wipe. There is no re-apply script and none is needed. (This was the end state the deferred **D2** proposal envisioned.) The design proposal above was written against the *old* topology; **operations carries the verified one.**
- The **P3 "Track 1 → public GitHub Pages" publishing target** and P8's "the published site stays on GitHub Pages" premise are **superseded** by P9: Track 1's public site is now **self-hosted live-serve on the box** at `knowledge.hi2vi.com`, and GitHub Pages is **retired for this repo's site** (the git push continues as off-box backup only; the **shipped plugin keeps Pages** for downstream users). The two-track store, the browser-only static-search boundary, and the mkdocs-material 9.7.6 generator choice are all **unchanged** — only the *hosting* of the built site moved from Pages to the box. The ~65 s Pages publish SLA (P8 operations) is superseded by **fresh-on-write**.
