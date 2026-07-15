# Result — P5.S5 (final design-system integration)

Full-surface replacement of the P5.S1 interim baseline with the operator's
Claude Design deliverable ("Knowledge Base Design System", all 10 targets;
check-up PASSed 2026-07-11, recorded in `plan.md`). The design mirror was
treated as authoritative design data and integrated onto mkdocs-material 9.7.6
anatomy.

## What landed

**`docs/stylesheets/extra.css`** — rebuilt from scratch around the delivered
system, in load order (fonts → tokens → component hooks → page treatments):

- **§1 Color tokens** — `tokens/colors.css` landed **verbatim** (LOCKED Target 1,
  palette 1a Teal). Both schemes (`default` light, `slate` dark), `--kb-*`
  source-of-truth + `--md-*` mappings. This is a value change vs. S1 (the locked
  palette: paper `#f6f2e8`, surface `#fffefa`, accent `#0f6f66`, plus new tiers
  `--kb-surface-sunken`, `--kb-border-strong`, `--kb-ink/-secondary/-hint`).
- **§2 Typography tokens** — `tokens/type.css` `:root` **verbatim** (families with
  Hangul fallbacks, h1–h6 scale, leadings, weights, tracking, 42rem measure).
- **§3 Shape/motion tokens** — `tokens/shape.css` `:root` **verbatim** (radii,
  `--kb-space-*` rhythm, `--kb-ease`, the single `--kb-shadow-hover`).
- **§4–§8 Component hooks** — the "mkdocs-material hooks" block from each of the
  five component CSS files, dropped in as the primary on-site override: chrome
  (`.md-header/.md-tabs/.md-nav/.md-search__form`), content typography
  (`.md-typeset …` incl. the teal-only admonition policy), cards & grid
  (`.kb-grid/.kb-card`, the one utility the site markup will use — S2), tag pills
  (`.md-tag`), search results (`.md-search-result*`).
- **§9 Page treatments** — the landing (hero, section head, Recent list) and
  article (metadata line, related block, TOC) treatments from the two
  `pages/*.card.html` inline styles, translated to portable `.kb-*` classes
  scoped under `.md-typeset`. These are **staged for P5.S2/S3 to wire into
  markup** — they do not auto-apply and require no new generated classes. The
  live "On this page" TOC is Material's secondary nav, already accent-skinned by
  §4; the `.kb-toc` class is kept portable for a future custom article layout.

**`docs/assets/logo.svg` + `favicon.svg`** — swapped to the delivered marks
(book+spark, mid-teal `#178a80`; favicon cream-on-teal `#127f76` plate, stroke
retargeted to the new paper `#f6f2e8`). Wired paths in `mkdocs.yml`
(`logo: assets/logo.svg`, `favicon: assets/favicon.svg`) kept unchanged.

**`mkdocs.yml`** — surgical fonts edit only (see below). `nav:`/`strict:` remain
absent; the `9.7.6` pin, `features`, `plugins`, `exclude_docs`,
`markdown_extensions`, palette (both schemes), and `extra_css` are untouched.

## mkdocs.yml / fonts decision

Chose **all three families via the single CSS `@import`** (the delivery's own
model in `styles.css`) over the S1 split. Concretely: `theme.font: false` in
`mkdocs.yml` (so Material makes no Google Fonts request of its own — no Roboto),
the single `@import` at the top of `extra.css` loads Fraunces + Source Sans 3 +
JetBrains Mono, and the `--md-text-font-family`/`--md-code-font-family` tokens
(§2, with Hangul fallbacks) point Material at them.

Why this over "Source Sans 3/JetBrains Mono via `theme.font` + Fraunces via
`@import`": the design uses **weights 500 and 600** for Source Sans 3 (medium /
semibold, incl. the portable classes S2 will wire) and **500** for JetBrains
Mono. Material's `theme.font` Google Fonts request does not include 500/600, so
those would be synthesized/faux. The single `@import` requests the exact weights,
reproducing the delivery faithfully and future-proofing S2's portable-class use.
Verified in the build: `site/index.html` injects **no Roboto** request, and
`site/stylesheets/extra.css` carries the full `@import` with all three families +
exact weights.

## Coverage diff vs the S1 baseline

Inventoried every property the S1 `extra.css` set. Outcome: **near-total
replacement by the delivered system; nothing consciously dropped**.

- **Covered by the delivery (replaced, incl. token values):** all palette tokens
  (§1, replaced by the locked Target-1 values); `--kb-font-display`,
  `--md-text/-code-font-family`, radii, `--kb-ease` (§2/§3); header/tabs chrome
  (§4); links, blockquote, code, admonitions, tables, nav-active (§5); tag pills
  (§7); search form + results (§8); `.kb-grid`/`.kb-card` utility (§6, delivery
  uses `--kb-shadow-hover` for the same hover lift S1 inlined).
- **Bridged onto `.md-typeset` from delivered tokens (preserves S1 behavior):**
  the delivery's content hooks set heading family/optical-sizing/tracking + the
  h2 rule but left the h1–h4 **sizes/margins**, the body **font-size** (0.82rem),
  and the p/li **letter-spacing** to the portable `.kb-prose`. Those are wired
  onto `.md-typeset` here using the delivered `--kb-text-*`/`--kb-leading-*`/
  `--kb-tracking-*` tokens, so real articles keep S1's restrained editorial
  ladder (a design signature) rather than reverting to Material defaults.
- **Retained from S1 (no delivery CSS ships, but the design intends them):**
  permalink (`.headerlink`) accent-on-hover, and global `::selection:
  --kb-accent-soft`. The delivery's README lists both under its accent-usage rule
  but ships no explicit CSS for them; kept and retargeted to the locked tokens.
- **Consciously dropped:** none. (`.md-typeset strong` weight is *not* bridged —
  S1 never set it; Material's bold is acceptable and the delivery's hooks omit
  it.)

## Validation evidence

- `docker compose run --rm kb build` → **success**: `Documentation built in 0.45
  seconds`. Warnings are only the standard Material-2.0 announcement banner and
  the pre-existing `README.md`/`index.md` conflict exclusion — no errors.
- **`<!-- explain:recent -->` marker + bullets byte-intact:** `git diff
  --exit-code docs/index.md` clean; recent-region (lines 10–16) hash
  `a79a5fc608a25bdc59a193ae38a2f753f665c0a2` == HEAD.
- **Both schemes wired:** `mkdocs.yml` still has `scheme: default` (light) +
  `scheme: slate` (dark) with the manual toggle.
- **`site/versions/` absent:** no `versions` dir/path under `site/` (the
  `exclude_docs: /versions/` mechanism still holds).
- **Assets/CSS wired in build:** `site/index.html` references
  `stylesheets/extra.css`, `assets/logo.svg`, `assets/favicon.svg`; no Roboto.
- `python3 scripts/workflow.py validate` → **Workflow validation passed**.
- **No out-of-scope files:** working tree shows only `docs/assets/{logo,favicon}
  .svg`, `docs/stylesheets/extra.css`, `mkdocs.yml` (plus pre-existing `works/*`
  from the orchestrator and this slice's context files). `site/` is gitignored.

## For S2 / S3

- **Targets 8 & 10 CSS is now live.** S2 (landing/UX) drops the hero + section
  heads + browse grid into `docs/index.md` using §6/§9 classes and adds
  `{ .kb-recent }` (attr_list) to the Recent list — keeping the
  `<!-- explain:recent -->` marker + bullet format byte-intact (only `<li>/<a>`
  styled; date/project stay bare text). S3 (CJK search) rides §8 result styling;
  engineering (separator vs. prebuilt index) is unchanged by this slice.
- Do **not** redefine colors/fonts ad hoc — consume the §1–§3 tokens.
- The article metadata line / related block need per-page HTML or a template
  (the site ships no `overrides/`); the classes are ready in §9 when wanted.
