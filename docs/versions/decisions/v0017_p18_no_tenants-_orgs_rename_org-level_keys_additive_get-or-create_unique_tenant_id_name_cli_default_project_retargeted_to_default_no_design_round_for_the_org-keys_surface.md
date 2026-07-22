---
doc_id: decisions
version: v0017
created_at: 2026-07-22T11:24:32+09:00
source: P18.REVIEW
summary: P18 no tenants->orgs rename; org-level keys additive; get-or-create + UNIQUE(tenant_id,name); CLI DEFAULT_PROJECT retargeted to default; no design round for the org-keys surface
previous: v0016_p17_always-html_explainer_default-on_gated_cited_offline-degrading_web_research_plugin-canonical_to_copies_derivation_skills_parity_ci_guard_parity_mirror-not-narrow_plugin_0.3.0
---

# Decisions

## Status

Accepted decisions: the two-track knowledge store; the GitHub Pages generator (mkdocs-material 9.7.6, re-confirmed over Hugo); the P4 pipeline-hardening set — query-side CJK search (tokenizer unchanged) + recency ranking, hybrid RRF semantic search on Gemini + SQLite BLOB vectors, the `related` cross-link convention, and publish hygiene (`source.repo` basenames + `exclude_docs`); and the P5 web-UI-redesign set — the operator-designed "calm editorial library" visual system (palette 1a Teal, Claude Design provenance, fonts via a single `@import`), the landing/nav choices, browser-only Korean/CJK search via the Material search plugin's `lang`, and a lean site-build smoke guard chosen over `--strict`. D2 (design polish) is resolved by P5 (promoted into the design-system slice). The **P6 knowledge-graph** set adds five accepted decisions — the build-time data-generation mechanism (a mkdocs `hooks:` module), the node/edge model (docs + tag nodes, dead-link ghosts, `docs/current` excluded), project inks as a documented data-viz-only accent extension, a hand-rolled vendored canvas renderer, and an operator-directed **P6.S1 renderer revision** that consciously supersedes two locked S0 interaction decisions (quiet labels A′, idle mingle). The **P7 plugin-packaging** set adds six accepted decisions — MIT license, the plugin hosted in this same repo with an isolated `plugin/` payload (`source: "./plugin"`), dynamic project discovery in the deploy gate, the uv pin `0.8.14`, the first-doc project-landing auto-creation, and the deliberate no-`KB_PUBLIC_BASE_URL`-default for the scaffold. The **P8 hosted-API** set adds seven — a public bearer-guarded endpoint at `knowledge.hi2vi.com` (over a private-network or tailnet path), `KB_GIT_PUSH` publish-on-write **defaulting off**, read auth as an explicit **flag** rather than implied by a set token, a box-generated repo-scoped **SSH deploy key** over a PAT, **no CORS**, **no edge rate-limit zone**, and reuse of the edge's **wildcard origin cert**. Two of them (`KB_GIT_PUSH` default-off, read-auth-as-a-flag) exist for the same reason: **the hosted deployment must not change anything for existing local and plugin users.** The **P9 self-host + automated-deploy** set adds four accepted decisions — **self-host the whole site** (web UI + API) on the box and **retire GitHub Pages** for this repo's site (via reclassifying `pages.yml` out of the plugin's `identical` class + neutralizing it to a build-only CI guard), **serve the web UI live** (a `mkdocs serve` viewer, over static rebuild-on-write or cron rebuild) so docs are fresh-on-write, and an **automated `workflow_dispatch` production deploy** mirroring `hi2vi_web`'s three-script split but diverging for the publish-on-write clone (reconcile-on-`main` never detach/reset/force + deploy the tip; gate + fix-forward, no rollback, because the app runs from a bind mount; **all authoritative git relocated in-container** since opc can't authenticate the SSH origin; edge re-apply inside the gate; `main`-guard + `concurrency: knowledge-deploy`; a **dedicated runner SSH key**). All proven live at P9.S5. The **P10 accounts/tenancy** set adds three — Postgres (async SQLAlchemy 2.0 + psycopg3) over SQLite for the accounts control plane, namespaced `docs/`-canonical per-tenant storage, and `KB_API_TOKEN` as the pinned tenant-#1 master bearer. The **P11 usage-monitoring** set adds six accepted decisions — an **event-log grain** (durable per-event rows, aggregates derived on read) over per-request rollups, **metering writes + searches only** (the open read path stays unmetered to avoid a hot-path write), **derive-on-read** windowed aggregates, stamping credential **`last_used_at` on metered events only** (not on every read), **project attribution by name→UUID with a nullable fallback**, and a **free-text `event_type`** column (no DB enum). All are observability-only — no quotas/billing/entitlements — and all six were verified live at the P11 review. The **P12 authenticated-web-app** set adds the D-P12 decisions in final form — the app lives in a **`web/` subdir** of this repo (D-P12-1); the browser↔API boundary is a **server-side sealed-cookie BFF** (D-P12-2, no CORS / no web-DB); **the app's design is the Knowledge Base design system** (D-P12-3 final — the S1 "adopt hi2vi green" record is superseded, hi2vi = structure/vibe only; the "production deploy in P14" half stands) — plus the scope ADRs: per-tenant **documents browse in the app**, the **graph moved into the app** (a server-side twin of the mkdocs hook), **web-UI `/app` reads are unmetered** (web search out of the billable metric — the paid retriever is P15), and a **read-only web UI** (no plan-gating; all web-UI features free). The **P13 CLI & agent-first-onboarding** set adds the D-P13 decisions — a **separate `cli/` package** distributed via `uv tool install git+…#subdirectory=cli` (D-P13-1); a **direct password grant, no device flow** (D-P13-2); a **two-token model** (`vk_` in `api.token`, additive 30-day session in `auth.session_token`, D-P13-3); **exposure + throttle in the same slice** (the control plane goes public at the edge with a server-side per-IP throttle, D-P13-4, narrowing P8's "no rate limit needed"); **CLI code/tests out of `server/`/`tests/`** to add no parity debt (D-P13-5); and **guide docs bundled in the CLI, not served** (D-P13-6, resolving Open Question (a) over vocky's observed served-`docs.json` rot) — plus the resolved open questions: **the CLI is `knowledge`, no `kb` alias** (Q(d)); **`save` prints `id`/`rel_path`, never the 201 `url`** (Q(b)); and **`save`'s project = the git repo basename** (matching the plugin, overriding DECOMP's config-default line). The hosted flow is code-complete + edge-routed but awaits a one-time P10–P13 accounts-plane cutover (operations). The **P14 landing / design-gate** set adds four accepted decisions — the **public landing is designed through the Claude Design gate (round 01) and implemented AS-IS** on the existing KB design system (no new brand; additive tokens; copy verbatim); the **landing takes over `/` while the authenticated app stays at its current paths** (no `/app` rebase — supersedes the design's decision #3, avoiding the P13 CLI edge collision, a non-visual routing change); **retire the mkdocs `knowledge-site` from the edge** (its content lives on as tenant #1's knowledge) with **`/docs` reserved for future product docs**; and **free-only launch pricing** (a Free tier beside an "Agent Retrieval API — Coming" waitlist, the one paid surface deferred to P15). An accepted copy-fidelity gap (the build-prompt quoted no lede for three feature sections) is deferred to the operator / a copy round (D10), not invented. The **P17 explain-v2 + public-ingestion** set adds the D-P17 decisions — **always-HTML explainer output for both modes** (the §4 markdown house style fully removed, one format everywhere); **web research default-on behind a judgment gate** with **mandatory visible-domain citations** and **graceful offline degradation** (the skill runs unattended at automated phase reviews), plus `research`/`no-research` force-flags and the best-practices section placed between Code and Quiz; the **plugin-canonical → copies derivation rule** — the project copy `.claude/skills/explain/` deleted, two shipped copies (`plugin/` canonical + `.agents/` portable, byte-identical bodies) and the user-level `~/.claude` copy operator-updated, guarded by a new root-only `scripts/skills_parity.py` CI gate; **parity by mirroring the SaaS server into the template, not narrowing `shipped_dirs`**; the emitted HTML's **zero-external-deps** self-containment (forced by the P16 opaque-origin sandbox) and the skill emitting **no document frontmatter** (the API writes it); the **additive USE of the frozen P16 API contract** (`format:"html"` — no `/api/*` or MCP contract change); the **iframe height-handshake left parked**; and **plugin `0.2.1 → 0.3.0`** carrying the whole phase. All D-P17 were verified together at the P17 review (hosted skill-path E2E live on prod). The **P18 accounts-v2** set adds the D-P18 decisions — **no `tenants → orgs` rename** (the tenant row *is* the org; product naming only, a large zero-behavior diff avoided); **org-level keys are additive** (`project_credentials.tenant_id` backfilled + `project_id` nullable, org rows = `project_id NULL`; existing project-bound keys unchanged) rather than a schema rewrite; **get-or-create projects require `UNIQUE(tenant_id, name)`** with a defensive de-dupe in `0003` and a **catch-`IntegrityError`-and-re-read** race guard; the **write-path get-or-create lives in an async FastAPI dependency** ahead of the sync `WRITE_LOCK` handler (row-before-409/422 accepted as idempotent); the **CLI `DEFAULT_PROJECT` retargeted `"knowledge" → "default"`** (shared with `init --project`) rather than adding a separate save-fallback constant; **`knowledge init` mints an org-level key** with the reuse-gate structure preserved verbatim (so it re-mints on a recorded-project change even though org keys aren't project-bound — flagged as a candidate follow-up, not a defect); and the **org-keys web surface reuses P12 components at org scope → no Claude Design round** (stance #6), placed as a dashboard panel (not a dedicated org-settings route), with Workspace→Org copy label-only. All D-P18 were verified together at the P18 review (Postgres-gated suites + extended `onboarding_smoke.py` green local + live prod).

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

### Usage metering grain: a durable event log, aggregates derived on read (over per-request rollups)

- Date: 2026-07-16
- Status: accepted (P11 — operator-resolved before DECOMP)
- Context: P11 needs per-tenant/per-project usage (document creates/deletes, searches) for the P12 dashboard. Documents-saved totals are already derivable from `GET /api/projects` + `GET /healthz`, but **search activity and API-call volume persist nowhere** (vocky derived usage from an existing domain table + `last_used_at`; that only half-applies here), so a small durable table is unavoidable.
- Decision: store **one durable Postgres row per metered event** in `usage_events` (event-log grain); the dashboard's aggregates are **derived on read** (GROUP BY UTC day, conditional per-`event_type` counts), never pre-rolled. Chosen for flexibility and simplicity at low volume.
- Alternatives considered: per-request rollup counters (declined — less flexible; a new breakdown means a schema/backfill change, whereas the event log answers any windowed question); deriving everything from existing tables (declined — search/API volume isn't persisted anywhere).
- Consequences: the log grows unbounded, so a retention/cleanup job is **deferred (D8)** until volume is material; aggregates cost a grouped SELECT per read (backed by two composite `(…, occurred_at)` indexes). Read shape mirrors vocky's `{window, totals, daily_counts, projects|credentials}`.
- Source: P11 `intent.md`; P11 `phase.md` "Resolved decisions" #1/#3.

### Meter writes + searches only; the open read path stays unmetered

- Date: 2026-07-16
- Status: accepted (P11 — operator-resolved before DECOMP)
- Context: The content plane's hot path is open reads/lists/searches. Metering every request would put a Postgres write on the hot path — the write-amplification vocky explicitly warned about.
- Decision: meter only the **high-signal** events — `document.created` (201), `document.deleted` (2xx), `search` (2xx) — synchronously best-effort, and stamp credential `last_used_at` for recency. The open read/list/get path stays **unmetered** so it stays fast. This avoids the hot-path write-amplification *by construction* (no `request.state.usage` stash on the read handlers).
- Consequences: API-call *volume* is approximated by the metered events, not a per-request counter (acceptable for a dashboard); reads never touch Postgres for metering.
- Source: P11 `phase.md` "Resolved decisions" #2.

### `last_used_at` stamped on metered events only, not in the resolver (the reads-stay-fast refinement)

- Date: 2026-07-16
- Status: accepted (P11.S2 — refines the DECOMP note)
- Context: DECOMP proposed stamping credential `last_used_at` in the `/api/*` resolver (where `cred` is in scope). But the resolver runs on **every** request including reads, so stamping there would write on every read — contradicting "open reads stay fast".
- Decision: move the stamp into `record_usage` (the metered write/search path), so `last_used_at` is refreshed **only on a metered event**, never on a plain read.
- Consequences: a `vk_` key used only for reads will not refresh `last_used_at` — it reflects the key's last write/search. Acceptable for an ingest key; the usage-read API documents this, and the E2E smoke drives a write/search before asserting `last_used_at` is non-null. Revisit only if read-recency is later wanted (a throttled read stamp).
- Source: P11 `phase.md` "S2 built" REFINEMENT.

### Derive-on-read usage aggregate: half-open window + zero-filled day series

- Date: 2026-07-16
- Status: accepted (P11.S1)
- Context: The dashboard wants a contiguous daily usage series over a rolling window, from an event log.
- Decision: `get_usage_metrics` runs one grouped SELECT (GROUP BY the UTC calendar day of `occurred_at`, per-`event_type` `count().filter(...)`), filtered to a **half-open window `[start, end)`**; days with no events are **zero-filled** in Python to a contiguous series **bounded by the window, never by event volume**; totals are summed in Python from the daily buckets. Mirrors vocky's feedback-metrics query.
- Consequences: `GET /app/usage` with `days=N` always returns exactly `N` daily buckets (a zero-event tenant still gets the full zero-filled series — no empty-tenant special case); the two composite `(…, occurred_at)` indexes back it. Verified live at the P11 review against `postgres:17`.
- Source: P11 `phase.md` "S1 built" contracts.

### Project attribution by name→UUID with a nullable fallback

- Date: 2026-07-16
- Status: accepted (P11.S2 — resolves the DECOMP "attribution wrinkle")
- Context: The operator (tenant #1) writes via the **master bearer**, which has **no `project_id`** on its context — but the POST body carries `project` (name) and search carries a `project` filter. Attributing the operator's own usage per project is a primary dashboard case.
- Decision: `record_usage` resolves the operation's project **name → tenant project UUID** (`get_project_by_name`, tenant-scoped, oldest-wins) for attribution; it falls back to the `vk_` caller's bound `project_id`, else to **tenant-level** attribution via a **nullable `project_id` with an `ON DELETE SET NULL` FK**. So an unmapped name degrades cleanly, and deleting a project keeps its usage history.
- Alternatives considered: require a project id on every metered write (declined — the master bearer has none); a non-null `project_id` (declined — can't represent tenant-level / unmapped usage, and would block project deletion).
- Consequences: one extra tenant-scoped SELECT per metered write (acceptable for a low-volume writer); attribution is best-effort inside the best-effort metering.
- Source: P11 `phase.md` "Project attribution wrinkle" + "S2 built".

### `event_type` is free text, not a DB enum/CHECK

- Date: 2026-07-16
- Status: accepted (P11.S1 — resolves an S1 open question)
- Context: `usage_events.event_type` could be a Postgres enum / CHECK constraint or free text.
- Decision: **free text** — integrity comes from the shared constants in `server.usage.types` (`EVENT_DOCUMENT_CREATED`/`EVENT_DOCUMENT_DELETED`/`EVENT_SEARCH`), imported by both the metering hook (writer) and the read API (reporter). A new event type needs no migration.
- Alternatives considered: a DB enum/CHECK (declined — every new event type would need a migration; the constants give the same integrity at the one code boundary that matters).
- Consequences: the metering hook and read API must import the constants, never re-declare the literals; adding an event type is a code-only change.
- Source: P11 `phase.md` "S1 built" constants.

### App location: a `web/` subdir in this repo (D-P12-1)

- Date: 2026-07-16
- Status: accepted (P12)
- Context: The authenticated app could be its own repo (hi2vi_web's topology) or a subdir of this one. "hi2vi_web-style" means stack / patterns / design-gate, **not** repo topology.
- Decision: the app is a **`web/` subdirectory** in this repo, versioned/committed by the existing workflow engine.
- Source: P12 `phase.md` D-P12-1.

### Browser↔API boundary: a server-side sealed-cookie BFF (D-P12-2)

- Date: 2026-07-16
- Status: accepted (P12)
- Context: The backend is bearer-only with **no CORS / cookies / CSRF by design**; a browser app cannot hold the bearer safely and cannot call `/api/*` cross-origin.
- Decision: a **Next.js server-side BFF proxy**. The browser talks only to the Next origin; Next calls the backend server-to-server with `Authorization: Bearer`; the backend session token is sealed into an **AES-256-GCM httpOnly cookie** (never in browser JS). **No backend CORS change, no web-side DB.** Adding unmetered `/app` read routes for the app is orthogonal (it extends the control plane, not the origin model).
- Alternatives considered: a browser client of `/api/*` + backend CORS — rejected (it reopens the auth question a browser can't safely answer; the no-CORS invariant is load-bearing).
- Source: P12 `phase.md` D-P12-2; the S2 as-built notes.

### App design = the Knowledge Base design system; deploy deferred to P14 (D-P12-3 final)

- Date: 2026-07-17
- Status: accepted (P12; final at S2R)
- Context: D-P12-3 first framed the app as a neutral-placeholder palette with a deferred design gate; at S1 the operator directed adopting hi2vi_web's real green now; then the operator's Knowledge Base design-system co-work returned a brief, applied at S2R.
- Decision: **the app's design is the Knowledge Base "calm editorial library" design system** (warm paper + one deep-teal accent, both schemes, token-driven); **hi2vi contributes dashboard structure/vibe only, not its palette**. The **"production deploy in P14" half of D-P12-3 stands** — P12 ships the app runnable via `pnpm dev` + `output: "standalone"` only.
- Consequences: the S1 "adopt hi2vi green wholesale" record is superseded (below); a future design pass may formalize the reader/graph specs (no specimen shipped for project-detail / documents / graph — accepted as faithful compositions of the delivered design system).
- Source: P12 `phase.md` (S2R notes; the design-gate handoff).

### Documents-in-app + graph-in-app; unmetered `/app` web-reads; read-only web UI

- Date: 2026-07-17
- Status: accepted (P12 — operator scope)
- Context: Documents lived only on the metered `/api/*`; the graph was a build-time mkdocs asset (tenant #1 only). Both had to become per-tenant app surfaces without polluting the billable usage metric, and the whole web UI must be free.
- Decision: add small **session-scoped, tenant-scoped, UNMETERED** `/app` read routes (documents/search/graph, alongside the dashboard rollup) rather than reuse the metered `/api/*`; **web-UI search stays out of the billable `searches` metric** (the paid retriever is P15). The app is the **per-tenant knowledge viewer** (the public mkdocs site stays tenant #1's public surface); the graph is a **server-side twin** of the mkdocs hook (the hook stays server-free / tenant-#1's). The web UI is **read-only** for documents/usage/graph — no billing, no plan-gating; **all web-UI features are free**.
- Consequences: web-UI browsing never moves a usage counter; writing/deleting docs stays on `/api/*`. The S3 dashboard "View all" projects button was **omitted** (no all-projects route exists; a live link would 404, violating the "never a 404 link" console rule — the dashboard already renders the tenant's complete list) — accepted, a later phase may add an all-projects surface.
- Source: P12 `phase.md` (S5/S6 resolved open questions; the S3 "View all" omission + the no-specimen design-fidelity notes).

### D-P13-1 — CLI is a separate package in `cli/`, distributed via git subdirectory

- Date: 2026-07-17
- Status: accepted (P13.DECOMP/S1)
- Context: The root `pyproject.toml` is a virtual project (`package = false`, no `[build-system]`) — load-bearing for Docker's `uv export --no-emit-project` — with no `[project.scripts]` anywhere. The CLI cannot hang off it, and the operator has no PyPI/npm/brew account. (Resolves the intent's open "distribution channel" question.)
- Decision: ship the CLI as its **own hatchling package under `cli/`** (`knowledge-cli`, `packages = ["src/knowledge_cli"]`, `[project.scripts] knowledge`), leaving the root untouched. Distribution is **`uv tool install git+https://github.com/leetusik/knowledge#subdirectory=cli`** — no account of any kind. PyPI stays a later, separate call.
- Alternatives considered: making the root installable (rejected — breaks the Docker export invariant); PyPI/npm/brew now (rejected — needs accounts, and the git-subdir form is free).
- Consequences: `uv tool install ./cli` is the proven form; the git form is true **only once the operator pushes `main`** (which also turns `plugin-ci.yml` red — the D9 parity debt, accepted). CLI code + tests live under `cli/` (out of the parity-guarded `server/`/`tests/`), so the phase adds no parity debt (D-P13-5).
- Source: P13 `phase.md` D-P13-1; `P13.S1` `result.md`.

### D-P13-2 — Auth flow: direct password grant, not device flow

- Date: 2026-07-17
- Status: accepted (P13.DECOMP)
- Context: The intent left device-flow-vs-direct-credentials to DECOMP; vocky left the same question open and never answered it, so there was no precedent to inherit.
- Decision: use the **existing `POST /auth/login` direct password grant** (plain JSON, bearer out, no CSRF/cookie/redirect) — the programmatic path that already exists. **No device flow** is built (it would mean net-new server endpoints).
- Alternatives considered: a browser-based device/SSO flow — rejected as net-new server work; revisit only if the operator wants browser SSO.
- Consequences: passwords are handled client-side (never in `argv`; see security); enumeration-safe generic 401 preserved.
- Source: P13 `phase.md` D-P13-2.

### D-P13-3 — Two tokens, two lifetimes (`api.token` = `vk_`, `auth.session_token` = 30-day session)

- Date: 2026-07-17
- Status: accepted (P13.DECOMP/S2)
- Context: `POST /auth/login` returns a 30-day session token; `POST /app/projects/{id}/credentials` returns a non-expiring `vk_` ingest key. The plugin's seam reads `api.token`.
- Decision: store the **non-expiring `vk_` in `api.token`** (the seam `/knowledge:explain` already reads → the plugin keeps working after the session lapses) and the **30-day session in a new additive `auth.session_token`** key (used only for `/app/*`, e.g. `usage`). Extra keys are ignored by the four-key resolver, so this is backward-compatible.
- Consequences: the concrete proof of "SaaS-open" — a CLI-written config resolves through the verbatim SKILL heredoc as configured; after `logout`, reads keep working on the `vk_` while `usage` needs re-login (the two-token model, visible from the terminal). Handling detail in security.
- Source: P13 `phase.md` D-P13-3; `P13.S2` `result.md`.

### D-P13-4 — The control plane goes public in P13, with a throttle, in the same slice

- Date: 2026-07-17
- Status: accepted (P13.DECOMP/S5)
- Context: The deployed edge routed only `/api/*` + `/healthz`; `/auth/*` + `/app/*` 404-ed into the mkdocs catch-all, so the CLI's whole first half was unreachable on the hosted host. Exposing an unauthenticated password grant with no server-side throttle opens unmetered guessing + open signup.
- Decision: add `location /auth/` + `location /app/` to the edge **and** land throttling for the now-public grant **in the same slice** (S5), never apart. The throttle is **server-side** (in-process, per-IP, per-route fixed window), chosen over an nginx `limit_req_zone` because the edge bans global zone names and the local stack has no nginx to test one.
- Consequences: the public consumer contract widened to `/api/* + /auth/* + /app/* + /healthz` (api.md); the throttle leans on the single-worker invariant (security/operations). Supersedes the P8 "no edge rate-limit zone; this API needs none" rationale for the `/auth` surface (see Superseded).
- Source: P13 `phase.md` D-P13-4; `P13.S5` `result.md`.

### D-P13-5 — CLI code and tests stay out of `server/` and `tests/`

- Date: 2026-07-17
- Status: accepted (P13.DECOMP)
- Context: `plugin/templates/manifest.json` declares `shipped_dirs: [server, tests, …]` and `plugin_parity.py` fails on any repo file missing from the template — already red (34 issues, D9), green only because `main` is unpushed.
- Decision: keep all CLI code and tests under `cli/`, adding **no** new file to the parity-guarded dirs, so the phase adds no new parity debt. The pre-existing 34-issue debt is D9's, not P13's to fix (the intent says the plugin stays untouched).
- Consequences: verified byte-for-byte across S1–S5 — `plugin_parity.py` stayed exactly 34 issues, 0 `cli/` mentions, throughout.
- Source: P13 `phase.md` D-P13-5; every slice's `result.md`.

### D-P13-6 — Guide docs ship bundled in the CLI, not served by the API (Open Question (a))

- Date: 2026-07-18
- Status: accepted (P13.DECOMP/S4 — resolves Open Question (a))
- Context: The intent's explicit open question was where the agent guide docs live and how agents discover them (bundled? served by the API? both?).
- Decision: **bundled.** `knowledge guide` prints the full agent contract, held as a **module string** in `cli/src/knowledge_cli/guide.py` (a string is guaranteed in the wheel with zero hatch config; a `.md` data file needs `force-include` and can silently miss). No `server/` route → no parity debt. Discovery is three install-instruction tails aimed at agents (`cli/README.md`, root `README.md`, the `knowledge --help` epilog) — **not** an API route and **not** this repo's `AGENTS.md`/`CLAUDE.md` (that is for the Codex agent working *on* this codebase, per the operator).
- Alternatives considered: **served by the API** — rejected for the parity debt a new `server/` route adds, and for vocky's **observed** served-`docs.json` rot (its D-P2-4: packaged docs went stale and were superseded then deleted — a real drift-and-rot failure mode next door).
- Consequences: proven live from the installed binary (offline, no server/network/auth); an anti-rot test pins the exact `INSTALL_COMMAND` string.
- Source: P13 `phase.md` D-P13-6; `P13.S4` `result.md`.

### CLI name is `knowledge`, no `kb` alias (Open Question (d))

- Date: 2026-07-17
- Status: accepted (P13.S1 — resolves Open Question (d))
- Context: The `[project.scripts]` entry point / console-script name was left to S1's planning turn.
- Decision: package `knowledge-cli`, module `knowledge_cli`, console script **`knowledge`**, **no `kb` alias** (a generic two-letter name with real PATH-collision risk — a user can alias it themselves). Matches the `knowledge-kb` config dir and the `knowledge` plugin.
- Source: P13 `phase.md` (`P13.S1` note); `P13.S1` `result.md`.

### `save` prints `id`/`rel_path`, never the 201 `url` (Open Question (b), CLI layer)

- Date: 2026-07-17
- Status: accepted (P13.S2 for `site.base_url`, P13.S3 for output — resolves Open Question (b))
- Context: The 201 `url` is built from `KB_PUBLIC_BASE_URL` (the mkdocs origin) and points at a page that does not exist for any tenant but #1 (the P12 web app's document view is the honest target, undeployed until P14).
- Decision: `save` prints `id`, `rel_path`, and a `knowledge read <id>` hint — paths that always work — and **never prints the `url`**; the `url` stays in `--json` (nothing is hidden). `site.base_url` is written as the onboarding base (one origin serves both planes on the hosted service).
- Consequences: confirmed live — a throwaway tenant's write returned a `localhost:8765` (mkdocs) `url` while the CLI talked to `:8766` (the API); the P14 web-app document view remains the honest link.
- Source: P13 `phase.md` Open Question (b); `P13.S2`/`P13.S3` `result.md`.

### `save`'s project defaults to the git repo basename (overrides DECOMP's config-default line)

- Date: 2026-07-17
- Status: accepted (P13.S3)
- Context: DECOMP's `phase.md` said the CLI should default `save`'s project from config; that was written without the deciding fact: `plugin/skills/explain/SKILL.md:160` tells `/knowledge:explain` to use the current repo's root directory name, verbatim.
- Decision: default precedence is `--project` > **the git repo root's basename** > the config's `api.project` > `knowledge`. The CLI and the plugin write the **same corpus with the same key**, so they must partition it identically — defaulting from config would scatter one repo's notes across two project names depending on which tool wrote it. The config's `api.project` is the *fallback* (outside a repo), not the default.
- Consequences: a repo named `my app` — the plugin auto-sanitizes to `my-app`, while the CLI **stops and suggests `--project my-app`** (a sentence, not a 422); same destination, different road. Overrides DECOMP's `phase.md:40` line (see Superseded).
- Source: P13 `phase.md` (`P13.S3` note); `P13.S3` `result.md`.

### The landing is designed through the Claude Design gate and implemented AS-IS (P14)

- Date: 2026-07-18
- Status: accepted (P14.S1/S2)
- Context: P14 ships the product's first public landing page. The repo's design ownership model (P5.S5) is that the operator owns the visual language via Claude Design; the agent integrates it, never authors it.
- Decision: run a **Claude Design gate (round 01)** for the landing — the agent writes only `handoff.md` (what to design + the required card set), holds a hard `pending` gate, reads the returned cards back with DesignSync, **lands the design AS-IS**, and implements from the returned `build-prompt.md` contract. **Respect the design** — no dropped, simplified, or "improved" designed element. The design is built on the **existing Knowledge Base design system** (no new brand); new marketing/band tokens are **additive** and no locked `--kb-*` value changes. Copy is **verbatim from the contract** — never invented.
- Consequences: the landing extends the "calm editorial library" system (dark hero → light editorial bands → charcoal footer; type-led, illustration-only). The design record is read-only provenance under `web/design/rounds/01-landing/` (`build-prompt.md` is the implementation contract). A **copy-fidelity gap** is accepted: `build-prompt §4` quoted no lede for the three mid-feature sections / the how-it-works steps, so those ship heading + verbatim ticks + visual with no fabricated prose — a design-round gap, not a dropped element (deferred job **D10** for the operator/a copy round to supply the text; not invented here).
- Source: P14 `phase.md` → "Approved design direction — Round 01"; `P14.S1`/`P14.S2` `result.md`.

### Landing takes over `/`; the authenticated app stays at its current paths (no `/app` rebase)

- Date: 2026-07-18
- Status: accepted (P14 — operator routing resolution; supersedes the design's decision #3)
- Context: The landing needs `/`. The design's decision #3 proposed the landing at `/` **and** rebasing the authenticated app to `/app/*`. But the edge (`deploy/knowledge.conf`, P13.S5) already routes `/app/*` (and `/auth/*`, `/api/*`) → `knowledge-api` for the CLI control plane — so an app rebase to `/app` would collide with the CLI edge contract.
- Decision: the landing takes over `/` (the old `web/src/app/page.tsx` root redirect is deleted; a `(marketing)` route group owns `/`), and the **authenticated app stays at its current paths** — `/dashboard`, `/graph`, `/documents`, `/projects`, `/login`, `/signup` — with **no `/app` rebase**. The landing frees `/` on its own; the app never needed `/app`. All landing CTAs point at the app's **real** paths (`/login`, `/signup`), not the design's `/app`.
- Alternatives considered: rebase the app to `/app` per the design (rejected — collides with the CLI's `/app` edge plane); serve the landing at `hi2vi.com/knowledge` (rejected — splits it into the separate hi2vi_web repo/site + design system and buys nothing over serving it from the knowledge app).
- Consequences: **nothing collides with the CLI's `/api //auth //app` edge contract** (unchanged). This is a **non-visual routing decision** — the landing's visual design is unchanged; only the CTA link targets shift from `/app` to `/login`/`/signup`. At the edge (P14.S3), a **more-specific `location /api/auth/` → `knowledge-web`** carries the Next BFF, and everything else (`/`, `/dashboard`, …) → `knowledge-web`, while the CLI planes stay on `knowledge-api`.
- Source: P14 `phase.md` → "Resolution (operator, 2026-07-18)"; `P14.S2`/`P14.S3` `result.md`.

### Retire the mkdocs `knowledge-site` from the hosted edge; reserve `/docs` for future product docs

- Date: 2026-07-18
- Status: accepted (P14 — operator decision)
- Context: The landing takes `/`, which the mkdocs `knowledge-site` viewer served (P9). The mkdocs site only ever rendered the operator's personal KB (tenant #1).
- Decision: **retire `knowledge-site`** — drop the `site` service from `compose.prod.yml` and the `location / → knowledge-site` edge rule. Its content is **not lost**: it lives on as tenant #1's knowledge in the app (browse/search/read + graph) and the api. **`/docs` is reserved for FUTURE product documentation** (a later effort); P14 does not claim it.
- Consequences: the box's public site is now the Next `web/` app alone; the P9 fresh-on-write mkdocs mechanism is history. Deploy automation health-gates `knowledge-web` instead of `knowledge-site`. One deferred cosmetic caveat: the api's 201 `url` (`KB_PUBLIC_BASE_URL/{project}/{date}-{slug}/`) used to render on the mkdocs site at `/` and is now a dead link (docs are read by id via the api/app) — left unchanged, deferred to a future docs effort.
- Source: P14 `phase.md` → "Docs-site decision (operator, 2026-07-18)"; `P14.S3` `result.md`.

### Free-only launch pricing: a Free tier beside an "Agent Retrieval API — Coming" waitlist (paid retriever → P15)

- Date: 2026-07-18
- Status: accepted (P14 — resolved in the design round)
- Context: The five-phase pivot launches with **no paid plan** (the paid retriever endpoint is deferred). The landing's pricing presentation was left to the design gate (P14 Open Question / intent note).
- Decision: pricing is a **Free ($0/forever)** card beside an **"Agent Retrieval API — Coming"** waitlist tier — an honest free-only launch that also names the one deferred paid surface. All web-UI + CLI + plugin features are free; the metered retriever endpoint is the single paid surface, **deferred to P15**.
- Consequences: the landing makes no paid claim it can't honor; the waitlist CTA points at the repo (no waitlist form yet — the roadmap lives there). Aligns with the P12 "read-only web UI, all web-UI features free" and P11 "observability-only, no billing" decisions.
- Source: P14 `phase.md` → design decision #2; `P14.S2` `result.md`; P14 `intent.md`.

### Explain v2: always-HTML output + default-on gated cited web research (D-P17)

- Date: 2026-07-21
- Status: accepted (P17.S1 — operator-confirmed intent; S1 owned the final shaping)
- Context: The operator asked to upgrade `/explain` to emit a gist-style self-contained interactive HTML explainer, and (follow-up) to add beyond-codebase research comparing the implementation to best practices. The intent confirmed **both** modes always emit HTML and web research is **default-on** (the operator delegated the shaping).
- Decision: `/explain` **always** emits one self-contained interactive HTML explainer (Background → Intuition → Code → **Best practices & next steps** → 5-question Quiz) for **both** topic and code-change modes; the §4 markdown house style is **fully removed** (one output format everywhere). The **"Best practices & next steps"** section is **default-on behind a judgment gate** (skipped for purely-internal subjects / trivial fixes, absent-with-no-marker when skipped), **degrades gracefully offline** (never hangs, loops, or fails the save — it runs unattended at automated phase reviews), and carries **mandatory visible-domain citations** ("no citation, no claim"; the domain in plain text so it survives FTS/MCP extraction). Trailing `research` / `no-research` words force the section on/off (last-one-wins, composing with `here`); the section sits **between Code and Quiz**.
- Alternatives considered: keeping a markdown topic mode (rejected — one skill, one format); an opt-in research flag (rejected — it would never fire in the automated review path, where comparison + next steps pay off most; hallucination risk in a public KB is managed by mandatory citations, cost by the judgment gate).
- Consequences: the emitted HTML must be **self-contained with zero external deps** (inline CSS/JS, no CDN/fetch/`<form>`/`target="_blank"`) because P16 renders it in an opaque-origin `sandbox="allow-scripts"` iframe; the skill emits **no document frontmatter** and POSTs raw from `<!DOCTYPE html>` with **`format:"html"`** — an **additive USE** of the frozen P16 API contract, **no `/api/*` or MCP contract change**. `allowed-tools` gained `WebSearch`/`WebFetch` + `git diff`/`log`/`show`. Plugin bumped **0.2.1 → 0.3.0**.
- Source: `P17.S1` `result.md`; P17 `phase.md`; P17 `intent.md`.

### Explain-skill copy topology: plugin-canonical → copies, with a `skills_parity.py` CI guard (D-P17)

- Date: 2026-07-21
- Status: accepted (P17.S2)
- Context: The explain skill existed in four copies (`plugin/` canonical, project `.claude/`, portable `.agents/`, and a byte-identical user-level `~/.claude/`) with no sync mechanism — only `plugin/templates/kb/` was parity-guarded, never `plugin/skills/`.
- Decision: `plugin/skills/explain/SKILL.md` is **canonical**; other copies are **structural derivations** of its body. The project copy `.claude/skills/explain/` is **deleted** (it was the in-repo double-registration). The two **shipped** copies are `plugin/` (Claude-plugin frontmatter with `allowed-tools`) and `.agents/` (portable — `name` + `description` only, body **byte-identical** to canonical; its `openai.yaml` schema has **no** tools field, so the v2 tool needs live in the SKILL prose). The user-level `~/.claude/` copy is **kept and operator-updated** (an operator-machine path, never written from the repo). A new root-only `scripts/skills_parity.py` byte-compares the two shipped bodies and is wired into `plugin-ci.yml` as a second drift gate.
- Consequences: any future edit to the canonical body must re-derive `.agents/` or CI goes red. Post-cutover steady state (flagged for the operator): install the plugin user-wide from the public marketplace and drop the redundant user-level copy.
- Source: `P17.S2` `result.md`; P17 `phase.md`.

### Plugin-template parity: mirror the SaaS server, do not narrow `shipped_dirs` (D9 / D-P17)

- Date: 2026-07-21
- Status: accepted (P17.S4 — promoted D9, operator-ratified direction)
- Context: `plugin_parity.py` was FAIL 36 because the P10–P16 multi-tenant server growth (`accounts`/`persistence`/`usage` packages, the `*_api` control-plane modules, `seed.py`) was never mirrored into `plugin/templates/kb/`. Two directions: **mirror** the new files into the template, or **narrow** `shipped_dirs` to exclude them.
- Decision: **Mirror.** The open-core scaffold now carries the full multi-tenant server (27 added + 8 refreshed byte-copies), but stays **dormant single-tenant**: a new `{{KB_DATABASE_URL}}` render token is the full tenant Postgres URL under the operator's parity params yet **empty** for a scaffold → compose `DATABASE_URL:` null → unset in-container → accounts plane off (Docker-boot verified). `render.py` unchanged.
- Alternatives considered: narrowing `shipped_dirs` (rejected — the operator ratified mirroring so a self-host user gets the same server, latently able to opt into multi-tenancy by exporting `DATABASE_URL`).
- Consequences: `plugin_parity.py` green; the scaffold boots an unused `postgres` container (accepted); `alembic/`, `onboarding_smoke.py`, and `cli/` are **deliberately unshipped** (self-hosted multi-tenant migrations stay undocumented). Any future `server/**`/`tests/**` growth re-opens parity and must be mirrored again. Plugin stays 0.3.0.
- Source: `P17.S4` `result.md`; P17 `phase.md`.

### No `tenants → orgs` rename — the tenant row *is* the org (D-P18)

- Date: 2026-07-22
- Status: accepted (P18.DECOMP / P18.S1)
- Context: P18 introduces an explicit user → org → project model. The literal reading is to rename the `tenants` table (and every reference) to `orgs`.
- Decision: **Do not rename.** The tenant row *is* the org; "org" is a product-facing naming layer (web copy, CLI/skill text, docs) over the unchanged `tenants` table and `tenant_id`. A rename would be a large mechanical diff across both planes — SQLite `documents.tenant_id`, `usage_events`, the resolver, seed, MCP, the web BFF — with prod-regression risk and **zero behavior change**.
- Consequences: internal identifiers (`tenant_id`, `TenantModel`, `tenants`) stay; only user-facing strings become "org." Org **creation** + member **invites**/roles are out of scope (deferred **D14**).
- Source: P18 `phase.md` Findings; `P18.S1` `result.md`.

### Org-level keys are additive; get-or-create needs `UNIQUE(tenant_id, name)` (D-P18)

- Date: 2026-07-22
- Status: accepted (P18.S1 / P18.S2)
- Context: "API keys mintable at org level" + "projects get-or-create by name" both need schema support without breaking the frozen contract or existing project-bound keys.
- Decision: **Additive schema (`0003`).** Add `project_credentials.tenant_id` (backfilled from the bound project's tenant, NOT NULL, FK CASCADE, indexed) and make `project_id` **nullable** — org rows carry `project_id NULL`, project-bound rows keep it; no column dropped, no row rewritten in meaning. Add `projects UNIQUE(tenant_id, name)` (get-or-create's guarantee), **de-duping** pre-existing duplicates oldest-wins in the same migration since prod had no such constraint. Get-or-create is **race-safe by catch-`IntegrityError`-and-re-read**, not an upsert.
- Alternatives considered: a separate org-credentials table (rejected — more surface, the resolver would branch on two tables); an upsert for get-or-create (rejected — catch-and-re-read is simpler and honest about the read-after-write). The `0003` downgrade is destructive-by-design (a fix-forward repo).
- Consequences: existing project-bound keys work unchanged; the resolver reads `cred.tenant_id` directly (org keys skip the project query, project-bound keep the vanished-project guard); the first NULL-`project_id` rows appear only via the org-mint endpoint (S1 writes none). `serialize_credential` was made NULL-safe. `POST /app/projects` folded into get-or-create (also closing a latent dupe-500 the new UNIQUE introduced).
- Source: `P18.S1`/`P18.S2` `result.md`; P18 `phase.md`.

### Write-path get-or-create lives in an async dependency ahead of the sync handler (D-P18)

- Date: 2026-07-22
- Status: accepted (P18.S2)
- Context: `POST /api/documents` must ensure a Postgres `projects` row exists for `(tenant_id, body.project)`, but the sync handler holds `WRITE_LOCK` over the sqlite critical section and cannot `await` Postgres.
- Decision: Run the get-or-create in an **async FastAPI dependency** (`ensure_registry_project`) in front of the sync handler. FastAPI parses the body once and caches the resolver, so the dep runs exactly once, before the handler. A row may be created even if the handler later 409/422s on other fields — accepted as **idempotent and harmless**.
- Alternatives considered: get-or-create inside `record_usage`/metering (rejected — then an unmetered save leaves no row); a synchronous Postgres call inside the lock (rejected — blocks the write lock on Postgres). `metering.py` is left unchanged (its name-first lookup now always resolves).
- Source: `P18.S2` `result.md`; P18 `phase.md`.

### CLI: retarget `DEFAULT_PROJECT` to `"default"`; `init` mints an org key; reuse-gate preserved (D-P18)

- Date: 2026-07-22
- Status: accepted (P18.S4)
- Context: The CLI's outside-a-repo save fallback was `auth.DEFAULT_PROJECT = "knowledge"`, a constant **shared** with `init --project`'s default. The intent wants a `"default"` fallback.
- Decision: **Retarget the shared constant** `"knowledge" → "default"` rather than add a separate save-fallback constant — since signup now auto-provisions a `"default"` project (and the write path get-or-creates any name), `init`'s default and `save`'s fallback rightly coincide. `knowledge init` mints an **org-level** key (`POST /app/credentials`), and the `init` reuse-gate keeps its **structure verbatim** — so `init --project other` re-mints a second org key on a recorded-project change even though org keys aren't project-bound. The explain skill's fallback is repo→`"default"` only (its resolver ignores `api.project`), while the CLI keeps the fuller repo→`api.project`→`"default"` chain.
- Consequences: `init`'s default silently changed from `"knowledge"` to `"default"` (intended). The reuse-gate re-mint is a mild tension with "one key, all repos" — **flagged as a candidate follow-up (a deferred job), not a defect** (the extra org key still authorizes the whole org; harmless).
- Source: `P18.S4` `result.md`; P18 `phase.md`.

### Org-keys web surface reuses P12 components at org scope — no Claude Design round (D-P18)

- Date: 2026-07-22
- Status: accepted (P18.S3)
- Context: The web app needs an org-level keys surface (mint/list/revoke org `vk_` keys).
- Decision: Reuse the **existing P12 keys-table + mint-modal + revoke components at org scope** — the *same* visual language at a different scope, **not** a new design surface (design stance #6) → **no Claude Design round**. Placement is a **full-width dashboard panel** (not a dedicated org-settings route → no rail/route change). Workspace→Org is **label-only** (the `workspaceLabel` code identifier and CSS classes are kept; only string values move). `KbCredential.project_id` was widened to `string | null` (one shared credential shape, honest to the NULL-safe serializer) rather than a separate org-credential type; the org mint/revoke actions were appended to the existing `dashboard/actions.ts` with page-local client islands (the established P12 convention).
- Source: `P18.S3` `result.md`; P18 `phase.md`.

## Superseded Decisions

- The P2 "clean `sqlite-vec`/RRF seam, no embeddings this phase" framing is **consumed, not superseded**, by P4.S6: hybrid search is live via SQLite BLOB vectors + Python cosine, with the seam kept `sqlite-vec`-upgradable.
- The **P3 "design polish deferred post-launch (D2)"** consequence is **resolved**, not superseded: D2 was promoted into P5's design-system slice and delivered as the operator-designed "calm editorial library" system (palette 1a Teal). The stock indigo / dark-mode look is retired.
- The **P5.S1 agent-authored "calm editorial library" design system** is **superseded** by the P5.S5 operator-designed system of the same name: same visual direction, but the tokens/values and provenance are now the operator's Claude Design delivery (palette 1a Teal, fonts via `@import`), not agent taste. S1 served as the interim baseline until the delivery landed.
- The **P6.S0 "Label Strategy A" lock (doc titles always on)** is **superseded** by the operator-directed P6.S1 quiet labels (Strategy A′): the idle map is marks-only; titles reveal on hover/selection and above ~110% zoom.
- The **P6.S0 "settle-then-still / no idle drift" motion lock** is **superseded** by P6.S1's settle-then-mingle (a bounded idle wander; reduced motion still paints at rest and holds still).
- The **P1/P2 "the API never pushes; deploys are the operator's manual `git push`" rule** is **narrowed, not abandoned**, by P8: it remains the default and the guarantee for every local and plugin deployment (`KB_GIT_PUSH=false`), with **one** deliberate, flag-gated exception — the hosted box, whose scoped, rebase-onto-remote, non-force push is what makes agent-written docs publish without operator action.
- The **P8 DECOMP "shared-edge fragility" rule** — that the vhost/cert/network were undeclared runtime state on the old shared nginx container, wiped by every co-tenant deploy, requiring a cross-repo re-apply script and an "assume the endpoint is down after any co-tenant deploy" operating rule — is **superseded by fact**, discovered at P8.F2: the box had already cut over to a **dedicated edge whose `conf.d/` and `certs/` are read-only host bind mounts**, so the config is declarative host state that a co-tenant deploy cannot wipe. There is no re-apply script and none is needed. (This was the end state the deferred **D2** proposal envisioned.) The design proposal above was written against the *old* topology; **operations carries the verified one.**
- The **P3 "Track 1 → public GitHub Pages" publishing target** and P8's "the published site stays on GitHub Pages" premise are **superseded** by P9: Track 1's public site is now **self-hosted live-serve on the box** at `knowledge.hi2vi.com`, and GitHub Pages is **retired for this repo's site** (the git push continues as off-box backup only; the **shipped plugin keeps Pages** for downstream users). The two-track store, the browser-only static-search boundary, and the mkdocs-material 9.7.6 generator choice are all **unchanged** — only the *hosting* of the built site moved from Pages to the box. The ~65 s Pages publish SLA (P8 operations) is superseded by **fresh-on-write**.
- The **S1 "adopt hi2vi_web green wholesale" app-design record** (bright `#2ff28f` / `#00b66a` on near-black-green) is **superseded** by D-P12-3 final: the P12 web app's design is the **Knowledge Base design system** (deep-teal accent, both schemes); hi2vi_web contributes **dashboard structure/vibe only**, not its palette. The "production deploy deferred to P14" half of D-P12-3 is **unchanged**.
- The P8 "a future browser client would be a separate, explicit change that reopens the auth question" note is **satisfied without reopening it** by D-P12-2: the P12 browser client is served by a **Next.js server-side BFF** that holds the bearer in a sealed httpOnly cookie, so **no** backend CORS change was needed and the no-CORS / server-to-server boundary still holds.
- The **P8 "no `limit_req` rate-limit zone on the vhost; this API needs none anyway"** decision is **narrowed at P13** (D-P13-4): its rationale ("every `/api/*` call is bearer-gated, one known consumer") went false the moment P13 published the unauthenticated `/auth/{signup,login}` grant. P13 adds a throttle **server-side** (per-IP, in-process) rather than via an nginx zone — the edge's global-zone-name ban still holds, so the "no `limit_req_zone` on the vhost" house rule itself is **unchanged**; only the "needs none" justification is superseded, for the `/auth` surface. `/api/*` stays unthrottled (still bearer-gated).
- **P13.DECOMP's `phase.md` "the CLI should default `save`'s project from config"** guidance is **overridden** by P13.S3: `save`'s project defaults to the **git repo root's basename** (matching `explain/SKILL.md:160`, so the CLI and the plugin partition one corpus identically), with the config's `api.project` as the *fallback* only. The line was written before the deciding SKILL fact was known.
- **The P14 design round's decision #3 — "landing at `/`, app rebases to `/app/*`"** — is **superseded (its `/app` half only)** by the operator's P14 routing resolution: the landing takes `/`, but the authenticated app **stays at its current paths** (no `/app` rebase), because `/app` collided with the P13 CLI edge plane. This is a non-visual change — the landing's visual design is unchanged; only the CTA targets shift from `/app` to `/login`/`/signup`. The rest of the design (visual language, sections, tokens) landed AS-IS.
- **The P9 "Track 1 self-hosted mkdocs live-serve at `/`" + fresh-on-write publishing regime** is **superseded (its `/`-serving half) by P14**: the Next `web/` app now serves the domain root, and the `knowledge-site` mkdocs service is removed from `compose.prod.yml` + the edge + the deploy health-gate. Track 1's content is not lost — it lives on as tenant #1's knowledge in the app + api. The P9 GitHub-Pages retirement itself is **unchanged** (Pages stays retired for this repo; the shipped plugin keeps Pages downstream); `/docs` is reserved for future product documentation, unclaimed by P14.
- The **`/explain` §4 markdown house style** (the markdown-explainer output format used since the skill's inception) is **superseded** by P17.S1's always-HTML output: both modes now emit a single self-contained interactive HTML explainer, and no mode still writes markdown. The KB itself still holds markdown documents (P16 made HTML an *additional* first-class type, byte-for-byte preserving markdown docs); only the *skill's own output* changed format.
