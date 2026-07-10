# Result — P5.S1 (Design system — "calm editorial library")

Executor: `slice-executor-high`. Completed 2026-07-10. Verdict: **done**.

Built the visual foundation for the MkDocs Material 9.7.6 GitHub Pages site — a
Claude-designed "calm editorial library" design language delivered as `extra_css`
tokens + component polish, an original book+spark branding mark, and surgical
`mkdocs.yml` wiring. Nothing outside the sanctioned surface was touched.

## Files created / changed

- **`docs/stylesheets/extra.css`** (new, ~13.5 KB) — the design system.
- **`docs/assets/logo.svg`** (new) — original editorial mark (open book + spark of
  insight), single deep-teal at mid lightness so it reads on both headers.
- **`docs/assets/favicon.svg`** (new) — same mark in cream on a rounded deep-teal
  plate, legible at 16px against any tab chrome.
- **`mkdocs.yml`** (edited, surgical) — added `logo`, `favicon`, `font.text`/`font.code`,
  changed both palette entries' `primary`/`accent` from `indigo` → `custom`, added
  `extra_css`. The two-scheme toggle, `features`, `plugins`, `exclude_docs`, and
  `markdown_extensions` are byte-unchanged. **No `nav:`/`strict:` added; mkdocs-material
  pin 9.7.6 untouched.**

## Design decisions

**Direction:** operator-chosen "calm editorial library" — warm paper neutrals, serif
display over clean sans, generous whitespace, one deep-teal accent, soft borders, no
heavy shadows.

**Palette (custom, both schemes via `primary: custom` / `accent: custom`):**
- Light (`default`): warm ivory paper `#f7f3ea`, raised surface `#fffdf7`, ink text
  `#2c2722`, soft warm border `#e6ddcb`, deep-teal accent `#0f6f68`.
- Dark (`slate`): warm charcoal paper `#1b1916` (`--md-hue: 34` warms Material's derived
  slate tiers), warm off-white text `#ece5da`, lighter teal accent `#63bdb3` for dark-bg
  contrast.
- Header wears the **paper** (ivory light / warm-dark), not a colored bar — implemented by
  mapping `--md-primary-fg-color` to the surface and `--md-primary-bg-color` to ink, plus a
  hairline bottom border and no heavy shadow. Links are re-pointed to teal via
  `--md-typeset-a-color` (which otherwise defaults to primary and would go ivory).
- Footer is a warm near-black band (editorial anchor) via `--md-footer-*`.

**Typography (≤2 text families + 1 code font, as budgeted):**
- Headings + site title + `.md-nav__title`: **Fraunces** (variable serif display,
  `font-optical-sizing: auto`), `@import`ed in `extra.css`. h2 carries a hairline bottom rule.
- Body: **Source Sans 3** via `theme.font.text` (loaded by Material's Google Fonts link).
- Code: **JetBrains Mono** via `theme.font.code`.
- **Hangul fallback** for mixed EN/KR content: `--md-text-font-family` and
  `--md-code-font-family` are fully overridden to append `"Apple SD Gothic Neo", "Noto Sans KR"`;
  the display stack appends `"Nanum Myeongjo", "Apple SD Gothic Neo"`.
- Reading rhythm: `.md-typeset` line-height 1.72, larger serif h1/h2, calmer type scale.

**Component polish:** rounded soft-bordered code blocks + inline pills; admonitions/details
with a thin accent left-rule and no drop shadow; hairline-framed tables with a quiet header
band (serif th); tag pills (tags-plugin `.md-tag`) as soft teal-on-cream pills with accent
hover; rounded search form with accent focus ring; teal permalinks/blockquote rule/selection.

**Card utility (for P5.S2):** `.kb-grid` (responsive `auto-fit` grid) + `.kb-card` (soft-bordered
card with accent-on-hover lift), styled for both schemes. Works two ways, both documented
inline in `extra.css` §7 and in phase.md: (A) raw-HTML `<div class="kb-grid"><a class="kb-card">…`
(md_in_html is NOT enabled, so link text goes directly in the markup), or (B) a markdown list
+ `{ .kb-grid }` via attr_list, whose `<li>` become cards.

**Branding mark:** an original open-book (line-art) + spark-of-insight diamond — "knowledge +
insight". Logo is a transparent single-color teal `#178a80` chosen so its luminance sits in the
window that clears ~3:1 graphical contrast against BOTH the light ivory header and the warm-dark
header (a single dark teal fails on dark; a mid teal clears both). Favicon uses a filled teal
plate + cream mark for punch at 16px.

## Rejected alternatives (for the decisions ADR at P5.REVIEW)

- **Teal header bar** (branded, teal-forward) — rejected for the paper header; the paper/ivory
  header is more "curated library" and differentiates hardest from stock Material's colored bar.
- **Serif body** (fully book-like) — rejected; plan mandates a clean sans body. Serif is reserved
  for display headings only.
- **`overrides/` custom_dir for an inline `currentColor` logo** (would let the mark auto-adapt per
  scheme) — rejected as unnecessary weight; solved instead by picking a mid-lightness teal that
  clears contrast on both headers, keeping the mkdocs.yml surface minimal.
- **Social cards** (`social` plugin) — skipped: pulls cairosvg/Pillow CI deps for no design payoff
  this slice. Forward note left in phase.md.
- **`--md-hue` alone for the whole dark scheme** — used `--md-hue: 34` to warm Material's derived
  slate tiers but kept an explicit deep `--md-default-bg-color` for a richer charcoal than the
  hue-derived ~21% lightness.

## Validation

- **`docker compose run --rm kb build`** → **exit 0** (only the pre-existing, unrelated
  `README.md` vs `index.md` conflict warning; same 9.7.6 image as CI).
- Built `site/` contains `site/stylesheets/extra.css`, `site/assets/logo.svg`,
  `site/assets/favicon.svg`. Head wiring confirmed: `<link rel="icon" href="assets/favicon.svg">`,
  `<img src="assets/logo.svg">`, Google Fonts link for `Source Sans 3` + `JetBrains Mono`,
  `<link ... href="stylesheets/extra.css">` emitted **after** `main`/`palette` CSS (overrides win).
  Body attrs now `data-md-color-primary="custom" data-md-color-accent="custom"` for both schemes.
- `site/versions/` **absent** — `exclude_docs` intact. `explain:recent` marker present in built
  `site/index.html`.
- `git diff --quiet HEAD -- docs/index.md` → **byte-identical**. Protected paths
  (`docs/tags.md`, `docs/README.md`, `compose.yml`, `docs/current`, `docs/versions`, `server`,
  `.github`) all unchanged. In-scope diff: `mkdocs.yml` + new `docs/assets/` + `docs/stylesheets/`.
- SVGs well-formed (`xmllint --noout`).
- **Dev server left running** for operator eyeball: `docker compose up -d kb` →
  **http://localhost:8765/knowledge/** returns HTTP 200 (livereload; both schemes toggle in the
  header). Deploys stay manual-push-only — nothing was pushed. Stop it with
  `docker compose stop kb` when done.

## Deviations from plan

None. All hard constraints honored (mkdocs.yml surface limited to font/extra_css/logo/favicon/
palette colors; no `nav:`/`strict:`; no pin bump; no commits, no status transitions,
no `doc-new-version`, no `new-slice`; social cards skipped with a forward note; `overrides/`
skipped as preferred).
