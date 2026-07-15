# P5.S2 — Landing page & UX structure (plan)

Operator-approved plan (2026-07-12). Executor: **slice-executor-mid** (risk `medium`).

## Context

Wire the operator's delivered landing design (Claude Design "Knowledge Base Design System", Target 8, `pages/landing.card.html`) into the live MkDocs site: redesign `docs/index.md` (hero + Recent + Browse), tune Material nav features, and polish the tags page — while keeping the `<!-- explain:recent -->` machinery contract byte-intact. The CSS for all of this is already staged (`docs/stylesheets/extra.css` §6 cards/grid, §9 hero/section/recent); this slice writes the markup that consumes it. Read `works/phases/active/P5/phase.md` (esp. "Cross-slice notes — design system contract" and the "P5.S5 update") before starting.

## Delivered design composition (from `pages/landing.card.html` — you have no DesignSync access; this is the reference)

- **Hero** (`.kb-hero`): eyebrow "Knowledge Base" → bilingual title `Explained for beginners<br><span>초보자를 위한 기술 설명</span>` → lede ("Long-form explainers grounded in real code … Read like a book, not a manual.") → an inline search field.
- **Recent** section: `.kb-sec` head `Recent · 최근` (mock has an "All updates →" link), then the marker, then a `<ul class="kb-recent">` of plain `<li>`: `date · <a>title</a> — project`.
- **Browse** section: `.kb-sec` head `Browse · 둘러보기`, then `.kb-grid` of `.kb-card`s — one per project: title (project name), desc (bilingual one-liner), `.kb-card__meta` (explainer count).
- **Tabs row** under the header: Home / project names / Tags (§4 already skins `.md-tabs`).
- **Footer** meta line: "Knowledge Base · built with mkdocs-material · 창플 / 미라클".

## Hard constraints (verified against `server/documents.py` and phase.md)

1. **Marker contract, byte-intact.** `insert_recent_bullet` finds the line whose `strip()` == `<!-- explain:recent -->` and inserts a bare bullet on the next line; fallback ladder is `## Recent` heading → append. `remove_recent_bullet` drops **any** line in index.md containing `](<rel_path>)`. `update_recent_index` skips insertion if `rel_path` appears **anywhere** in index.md. The marker line and the 6 existing bullet lines (`- YYYY-MM-DD · [Title](path) — project`) must survive unchanged.
2. **Consequences for the redesign:**
   - No markdown links `](….md)` to individual explainer docs anywhere in index.md outside the Recent list (removal would delete the line; presence suppresses insertion). Raw-HTML `href="…"` to directories/pages is safe — it never matches the `](` needle and must not contain a full doc rel_path.
   - The Recent bullet list must stay a **top-level markdown list** — never wrapped in raw HTML (`md_in_html` is not enabled, so markdown inside raw HTML doesn't render).
   - New machinery-inserted bullets carry no class annotations — styling must come from ul/li-level CSS.
3. **`attr_list` cannot attach a class to a `<ul>`** (Python-Markdown limitation — the phase note "add `{ .kb-recent }` to the list" is not directly possible). Wire `.kb-recent` via a small **additive alias selector** in `extra.css` §9: give the Recent section head an id (`<div class="kb-sec" id="recent">`) and extend each `.kb-recent` rule with the `#recent + ul` equivalent (HTML comments don't break `+` adjacency). Comment the why. Do not restructure the delivered rules — additive only.
4. `mkdocs.yml`: **no `nav:`, no `strict:`**, pin 9.7.6 untouched, `theme.font: false` stays, no new webfonts, `exclude_docs` is the only exclusion mechanism. Additions limited to `features:` entries (+ optional `copyright:`).
5. `docs/tags.md` keeps `<!-- material/tags -->`. Never hand-edit `docs/current/*` or `docs/versions/*`. No `server/`, skill, or API changes (static-site slice).

## Work items

1. **`docs/index.md` redesign** (raw-HTML blocks interleaved with the markdown Recent list):
   - Frontmatter: `title: Home` (clean tab name) + `hide: [navigation, toc]` for the editorial landing (frontmatter doesn't disturb marker parsing — it's line-based).
   - Raw-HTML hero per the design, adapted lede grounded in the real content (nginx, caching, agent refactors, prompt-injection defense…). **Skip the hero search input** — embedding Material's search inline needs JS/overrides; note forward to S3 (which owns search UX).
   - Recent: `<div class="kb-sec" id="recent"><h2>Recent · 최근</h2></div>`, blank line, marker line, the 6 bullets **byte-identical**. Drop the mock's "All updates →" link (no archive page exists).
   - Browse: `.kb-sec` head + raw-HTML `.kb-grid` cards for the 3 projects (changple5, hi2vi_web, bootstrap_agentic_workspace.sh) + a Tags card. Real, grounded descriptions. **Omit explainer counts** in `.kb-card__meta` (machinery won't update them → guaranteed staleness); use meta for something stable or drop it.
2. **Per-project landing pages** (gives the Browse cards real destinations): minimal `docs/<project>/index.md` — h1 + 1–2 sentence description, **no doc lists** (they'd rot as /explain auto-adds pages; the sidebar/section nav is the list). Enable `navigation.indexes` so section titles/tabs click through to them. Cards link `href="changple5/"` etc. (safe per constraint 2).
3. **Nav features** (`features:` additions only): add `navigation.tabs` (the design shows a tabs row), `navigation.indexes`, `navigation.top`; consider `navigation.footer` (prev/next reading flow). Do **not** add `toc.integrate` (the design skins the right-hand TOC) or `navigation.instant` (custom-JS interplay is S3's decision — note forward). Sanity-check how the long `bootstrap_agentic_workspace.sh` and `Current`/`README` tabs render; structural check only — the operator eyeballs visuals after.
4. **Tags page polish**: keep the h1 (optionally `Tags · 태그`), add a one-line lede above the marker; marker stays. §7 already styles the pills.
5. **Optional footer**: `copyright: Knowledge Base · built with mkdocs-material · 창플 / 미라클` in mkdocs.yml (Material renders it in the footer §1/§4 already skin).
6. **Notes & docs**: append Doc-impact one-liners to `phase.md` (`experience.md` — landing/browse journeys + nav structure; `frontend.md` — nav feature config, landing markup wiring, §9 alias selector; `decisions.md` — tabs/indexes choices, counts omitted, hero search deferred) and cross-slice notes (S3: hero search + `navigation.instant`; S4: new invariants — marker, per-project index pages, `#recent + ul` adjacency).

## Validation (lean, CI-parity)

- `docker compose run --rm kb build` succeeds.
- `git diff docs/index.md` shows the marker line and all 6 bullet lines unchanged.
- Marker round-trip (pure functions, no server): python snippet importing `server.documents` — `insert_recent_bullet` on the new index.md lands the bullet directly after the marker; `remove_recent_bullet` removes only that line; no existing doc rel_path appears outside its own bullet (insertion-dedup safety).
- Built-site asserts: `site/index.html` contains `kb-hero`/`kb-grid` and the `<ul>` sits element-adjacent to `#recent` (alias selector matches); `site/tags/` renders; `site/versions/` absent; no `/Users/` leak; `mkdocs.yml` has no `nav:`/`strict:` and pin parity 9.7.6 holds.
- Leave a note for the operator to eyeball via `docker compose up -d kb` (port 8765).

## Out of scope

Article-page treatments (`.kb-meta`/`.kb-related` need per-page HTML or `overrides/` — future), hero search input + any search engineering (S3), CI smoke guard (S4), any `server/`/skill/API change.

## Executor contract

Do the work above, write `result.md` (free-form, from scratch) beside this file, append the Doc-impact one-liners and cross-slice notes to `works/phases/active/P5/phase.md`. Never commit; never run `start-slice`/`finish-slice`/`set-slice-status`/`doc-new-version`. Return a structured verdict (`done` / `needs_operator` / `blocked` / `escalate` with findings).
