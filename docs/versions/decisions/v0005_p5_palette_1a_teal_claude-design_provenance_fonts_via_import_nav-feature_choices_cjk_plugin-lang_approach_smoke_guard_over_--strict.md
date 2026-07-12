---
doc_id: decisions
version: v0005
created_at: 2026-07-12T14:34:14+09:00
source: P5.REVIEW
summary: P5: palette 1a Teal + Claude-Design provenance, fonts via @import, nav-feature choices, CJK plugin-lang approach, smoke guard over --strict
previous: v0004_p4_cjk_query-side_search_hybrid_rrf_cross-link_convention_publish_hygiene_adrs
---

# Decisions

## Status

Accepted decisions: the two-track knowledge store; the GitHub Pages generator (mkdocs-material 9.7.6, re-confirmed over Hugo); the P4 pipeline-hardening set — query-side CJK search (tokenizer unchanged) + recency ranking, hybrid RRF semantic search on Gemini + SQLite BLOB vectors, the `related` cross-link convention, and publish hygiene (`source.repo` basenames + `exclude_docs`); and the P5 web-UI-redesign set — the operator-designed "calm editorial library" visual system (palette 1a Teal, Claude Design provenance, fonts via a single `@import`), the landing/nav choices, browser-only Korean/CJK search via the Material search plugin's `lang`, and a lean site-build smoke guard chosen over `--strict`. D2 (design polish) is resolved by P5 (promoted into the design-system slice).

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

## Superseded Decisions

- The P2 "clean `sqlite-vec`/RRF seam, no embeddings this phase" framing is **consumed, not superseded**, by P4.S6: hybrid search is live via SQLite BLOB vectors + Python cosine, with the seam kept `sqlite-vec`-upgradable.
- The **P3 "design polish deferred post-launch (D2)"** consequence is **resolved**, not superseded: D2 was promoted into P5's design-system slice and delivered as the operator-designed "calm editorial library" system (palette 1a Teal). The stock indigo / dark-mode look is retired.
- The **P5.S1 agent-authored "calm editorial library" design system** is **superseded** by the P5.S5 operator-designed system of the same name: same visual direction, but the tokens/values and provenance are now the operator's Claude Design delivery (palette 1a Teal, fonts via `@import`), not agent taste. S1 served as the interim baseline until the delivery landed.
