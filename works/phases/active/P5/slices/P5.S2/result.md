# Result — P5.S2 (Landing page & UX structure)

Executor: `slice-executor-mid`. Completed 2026-07-12. Verdict: **done**.

Wired the operator's delivered landing design (Claude Design "Knowledge Base
Design System", Target 8 — `.kb-hero`/`.kb-sec`/`.kb-recent`/`.kb-grid`/`.kb-card`,
already staged in `extra.css` §6/§9 by S1/S5) into the live MkDocs site:
redesigned `docs/index.md`, added three per-project landing pages, tuned
`mkdocs.yml` nav features, polished `docs/tags.md`, and wired the one small
additive CSS piece the design system couldn't express on its own (a `<ul>`
can't carry an attr_list class).

## Files changed / created

- **`docs/index.md`** (redesigned) — frontmatter `title: Home` +
  `hide: [navigation, toc]`; raw-HTML `.kb-hero` (eyebrow "Knowledge Base",
  bilingual `<h1>` "Explained for beginners / 초보자를 위한 기술 설명", a lede
  grounded in the real content — nginx, caching, agent refactor,
  prompt-injection defense — no search input, see Deferred below); Recent
  section head `<div class="kb-sec" id="recent"><h2>Recent · 최근</h2></div>`
  then the **byte-identical** marker + 6 bullets (verified, see Validation);
  Browse section head + a raw-HTML `.kb-grid` of 4 `.kb-card`s (3 projects +
  Tags), descriptions grounded in each project's actual doc tags/content,
  `.kb-card__meta` omitted everywhere (would silently go stale — machinery
  never updates it).
- **`docs/changple5/index.md`**, **`docs/hi2vi_web/index.md`**,
  **`docs/bootstrap_agentic_workspace.sh/index.md`** (new) — minimal h1 + 2–3
  sentence grounded description each, no doc lists (the sidebar/section nav
  already lists the docs; a hand-maintained list would rot as `/explain`
  auto-adds pages). No frontmatter `title:` — see the tab-label finding below,
  which makes adding one pointless for its intended purpose.
- **`docs/tags.md`** — kept the h1 (now bilingual `# Tags · 태그`), added a
  one-line lede above the marker; `<!-- material/tags -->` untouched.
- **`mkdocs.yml`** — added `copyright: Knowledge Base · built with
  mkdocs-material · 창플 / 미라클` (site-level, renders in Material's footer,
  no extra plugin needed) and four `features:` entries: `navigation.tabs`,
  `navigation.indexes`, `navigation.top`, `navigation.footer` (prev/next —
  cheap complement to the hero's "read like a book" framing). Did **not** add
  `toc.integrate` (the design skins the separate right-hand TOC in §4/§5) or
  `navigation.instant` (left for S3, which owns the search/JS interplay
  decision). `theme.font: false`, palette, `plugins`, `exclude_docs`,
  `markdown_extensions`, and the pin all untouched.
- **`docs/stylesheets/extra.css`** §9 — extended each of the five `.kb-recent`
  rules' selector list with a `#recent + ul` alias (additive only — no
  property changed, no rule removed/reordered), plus a short comment
  explaining why (attr_list can't put a class on a `<ul>`, so the
  machinery-managed list can't literally carry `{ .kb-recent }`; the section
  head instead gets `id="recent"` in `docs/index.md`, and the marker+bullets
  render as that div's very next `<ul>` sibling — HTML comments between them
  don't create DOM nodes, so the `+` combinator still matches). Also corrected
  the stale S1/S5-era comment above this block (which anticipated
  `{ .kb-recent }` on the list — not actually possible) to describe what was
  really done.

## Validation

1. **`docker compose run --rm kb build`** → exit 0. Only the pre-existing,
   unrelated "Excluding 'README.md' ... conflicts with 'index.md'" warning
   (also present in S1's build, not caused by this slice).
2. **Marker/bullet byte-identity**: `git diff docs/index.md` — the
   `<!-- explain:recent -->` line and all 6 bullet lines do not appear
   anywhere in the diff output (confirmed by grepping the diff for
   `explain:recent` / the bullet date prefixes and getting zero hits) —
   i.e. byte-identical, not just textually similar.
3. **Marker round-trip, pure functions** (`server.documents`, via `.venv`):
   - `insert_recent_bullet` on the new `docs/index.md` → mechanism `"marker"`,
     new bullet lands directly on the line after the marker.
   - `remove_recent_bullet` on that result removes only the inserted line and
     restores the original text exactly (`removed_text == text`).
   - Each of the 6 existing doc rel_paths appears **exactly once** in
     `docs/index.md` (in its own bullet) — no accidental second occurrence
     that would confuse `update_recent_index`'s `rel_path in text` dedup
     check. Confirmed the raw-HTML card `href`s (`changple5/`, `hi2vi_web/`,
     `bootstrap_agentic_workspace.sh/`, `tags/`) are directory/page URLs, not
     full doc rel_paths, so they can't collide with a future dedup check or
     with `remove_recent_bullet`'s `](<rel_path>)` needle (no raw-HTML href
     contains `](`).
   - `update_recent_index` against a copy of the new index correctly
     suppresses re-inserting an already-present rel_path (returns `False`).
4. **Built-site asserts** (on the `site/` produced by the compose build):
   - `site/index.html` contains `kb-hero`, `kb-grid`, `kb-card`.
   - The rendered `<ul>` is the element-adjacent sibling of
     `<div class="kb-sec" id="recent">…</div>` (regex-confirmed across the
     HTML comment gap) — the `#recent + ul` alias selector will match.
   - `explain:recent` marker comment + all 6 bullets render in the built
     HTML.
   - `site/tags/index.html` renders; `site/versions/` absent
     (`exclude_docs` intact).
   - No `/Users/` path leak anywhere under `site/**/*.html`.
   - `site/changple5/index.html`, `site/hi2vi_web/index.html`,
     `site/bootstrap_agentic_workspace.sh/index.html` all built.
   - `mkdocs.yml` has no `nav:`/`strict:` key; pin parity 9.7.6 holds in both
     `compose.yml` and `.github/workflows/pages.yml`; `theme.font: false`
     intact.
5. **Tab-label structural check** (plan item 3, "structural check only"):
   built and inspected the rendered `.md-tabs__link` text. Tabs render as
   `Home / Tags · 태그 / Bootstrap agentic workspace.sh / Changple5 / Current /
   Hi2vi web` — no build error, no broken markup. **Finding** (verified by a
   throwaway experiment, reverted): a section's tab/nav title is derived from
   its **folder name** (auto-prettified: `_`/`-` → space, first letter
   capitalized) under plain auto-nav, **not** from the section index page's
   frontmatter `title:` or its `<h1>` — confirmed by temporarily adding
   `title: Changple5 (test)` to `docs/changple5/index.md`, rebuilding, and
   observing the tab label was unaffected (still "Changple5"), then reverting
   that test change before finishing. This means the awkward
   "Bootstrap agentic workspace.sh" tab text is **not fixable** by editing the
   index page — only by renaming the directory (out of scope: would break
   every existing doc URL and the /explain skill's per-project path
   convention) or a `nav:` override (forbidden — load-bearing auto-nav). Left
   as-is per the plan's explicit call for "structural check only — the
   operator eyeballs visuals after."
6. Left the dev server running for the operator: `docker compose up -d kb` →
   `http://localhost:8765/` returns HTTP 200. Stop with
   `docker compose stop kb` when done eyeballing. Deploys stay
   manual-push-only — nothing pushed.

## Deviations from plan

None substantive. One addition beyond the plan's explicit "optional footer"
item: also enabled `navigation.footer` (prev/next reading links) alongside
the `copyright:` string — the plan's per-slice rationale explicitly listed it
as a "consider" item and it's a cheap, reversible complement to the hero's
"read like a book, not a manual" framing; flagged here for the operator/
review to confirm it reads well once eyeballed (pure CSS/config, no
correctness risk). Also corrected a stale in-file comment in `extra.css` §9
(left by S1/S5, describing a `{ .kb-recent }` approach that isn't actually
possible) — a documentation fix, not a rule change.

## Out of scope (confirmed untouched)

Hero search input and any search engineering (P5.S3's job — the design's
hero mock includes an inline search field; explicitly skipped here per the
plan). `navigation.instant` (left for S3 to decide, given its interplay with
custom search JS). Article-page `.kb-meta`/`.kb-related` treatments (need
per-page HTML or `overrides/` — future). CI smoke guard (P5.S4). No
`server/`, skill, or API changes. `docs/current/`, `docs/versions/`, and
`docs/README.md` untouched.
