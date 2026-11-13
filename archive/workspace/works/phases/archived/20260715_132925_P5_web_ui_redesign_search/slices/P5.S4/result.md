# Result — P5.S4 (Site-build CI smoke guard & hygiene)

Executor: `slice-executor-mid`. Completed 2026-07-12. Verdict: **done**.

Added a lean, stdlib-only CI-parity smoke guard (`scripts/site_smoke.py`) that
asserts every load-bearing invariant S1–S3 left behind — the auto-nav /
`explain:recent` marker-and-bullet contract, the CJK search config + shipped
lunr packs, the zero-JS hero search toggle, the `#recent + ul` DOM adjacency,
pin parity, and no leaked local paths / CDN scripts — wired it into
`.github/workflows/pages.yml` as a deploy gate, and made mkdocs' existing
`README.md` auto-exclusion explicit in `mkdocs.yml` (silences the
pre-existing build warning S1–S3 all saw, changes nothing published).

## Files changed / created

- **`scripts/site_smoke.py`** (new, 187 lines, stdlib-only — `argparse`,
  `json`, `re`, `sys`, `pathlib`; no test framework, no third-party deps,
  e.g. no PyYAML — `mkdocs.yml` is parsed with targeted regexes, matching how
  the plan itself frames the checks). Optional `--root` (default: this
  script's own repo root, so it works from any cwd). Two assert groups,
  collected together, exit non-zero with the named failures on any violation,
  else a one-line PASS:
  - **Source invariants:** `docs/index.md` marker line + ≥1 bullet directly
    under it matching `format_recent_bullet`'s shape
    (`server/documents.py:211`); `docs/tags.md` has `<!-- material/tags -->`;
    `mkdocs.yml` has no top-level `nav:`/`strict:`, has `font: false`,
    `plugins.search.lang` contains both `en`/`ko`, no `extra_javascript:`;
    pin parity between `.github/workflows/pages.yml`
    (`mkdocs-material==X`) and `compose.yml` (`squidfunk/mkdocs-material:X`).
  - **Built-site invariants** (clear "run mkdocs build first" error if
    `site/` is missing): `site/search/search_index.json` `config.lang`
    includes `en`+`ko`; `lunr.ko.min.js`/`lunr.multi.min.js` shipped under
    `site/assets/javascripts/lunr/min/`; `site/index.html` has `kb-hero`,
    `kb-grid`, exactly one `id="__search"`, ≥1 `for="__search"`, the built
    `<ul>` element-adjacent to `<div … id="recent">` (comments tolerated
    between), the marker comment + a rendered bullet `<li>`; the three
    per-project `site/<project>/index.html` pages built; `site/versions/`
    absent; no `/Users/` leak and no `<script src="http…">` CDN tag in any
    built HTML.
- **`.github/workflows/pages.yml`** — exactly one line added between
  `mkdocs build` and `upload-pages-artifact`: `- run: python3
  scripts/site_smoke.py`. Nothing else in the file touched (verified via
  `git diff`, see Validation).
- **`mkdocs.yml`** — `/README.md` added to `exclude_docs` (now `/versions/`
  + `/README.md`), plus a short comment explaining it makes mkdocs' existing
  auto-exclusion explicit. `exclude_docs` remains the only exclusion
  mechanism; still no `nav:`/`strict:`; pin untouched; nothing else changed.

## Validation

All commands run 2026-07-12; all passed.

1. **`docker compose run --rm kb build`** → exit 0. Grepped the full build
   output for `README`/`warning` (case-insensitive): the only hit is the
   unrelated stock "MkDocs 2.0" banner the image prints on every build (also
   seen in S1/S2/S3's builds) — the "Excluding 'README.md' … conflicts with
   'index.md'" warning S1/S2/S3 all saw is gone.
2. **`python3 scripts/site_smoke.py`** (against the fresh build, default
   root) → `PASS — all site invariants hold`.
3. **Negative test** (proves the guard actually guards) — copied
   `mkdocs.yml`, `docs/index.md`, `docs/tags.md`, `compose.yml`,
   `.github/workflows/pages.yml`, and the built `site/` tree into
   `/private/tmp/.../scratchpad/doctored_root` (never touching the repo).
   Doctored exactly one invariant per group:
   - Source group: broke the first Recent bullet's date-prefix format in the
     copied `docs/index.md` (`2026-07-07` → `07-2026-07`).
   - Built-site group: dropped `"ko"` from the copied
     `site/search/search_index.json` `config.lang` (`["en","ko"]` →
     `["en"]`).
   Ran `python3 scripts/site_smoke.py --root
   /private/tmp/.../scratchpad/doctored_root` → exit 1, naming both failures
   by group:
   ```
   FAIL — 2 site invariant(s) violated (root: .../doctored_root):
     - docs/index.md: no bullet line directly under the marker
     - site/search/search_index.json: config.lang must include 'en'/'ko', found ['en']
   ```
   Confirmed the repo's own `docs/index.md` and `site/search/search_index.json`
   were untouched throughout (`git diff --stat docs/index.md` empty;
   re-read the live `search_index.json` — still `["en", "ko"]`).
4. **`git status --short` / `git diff`** — only `.github/workflows/pages.yml`
   and `mkdocs.yml` modified (plus the new untracked `scripts/site_smoke.py`
   and this slice's own `plan.md`/pre-existing `works/*` state files from
   slice start); `docs/index.md`, `docs/tags.md`, and every other docs page
   are absent from the diff — untouched, byte-intact. The two file diffs are
   exactly the plan's scope (one CI step line; one `exclude_docs` entry +
   comment).
5. **`python3 scripts/workflow.py validate`** → "Workflow validation passed."

## Deviations from plan

None substantive. One small self-correction while writing the CI step: an
initial draft appended an inline trailing comment to the `pages.yml` line
(`# P5.S4: CI-parity invariant guard...`); re-reading the plan's literal
"touch nothing else in that file" / exact step text
(`- run: python3 scripts/site_smoke.py`), removed the comment before
finishing so the added line matches the plan verbatim. The script came in at
187 lines against the plan's "~150" guidance — slightly over given the
number of invariants the plan itself enumerates (4 source-side + ~9
built-site checks); kept lean (no helper classes, no third-party deps, one
function per invariant group) rather than trimming checks to hit the line
count.

## Out of scope (confirmed untouched)

No new test suite/framework; no `--strict`; `server/`, skills, docs content
(`docs/index.md`, `docs/tags.md`, every explainer/durable-doc page), and the
design CSS (`docs/stylesheets/extra.css`) all untouched; no assertion on
build *warnings* generally (only the README one is fixed via `exclude_docs`,
not asserted — future `/explain` page adds must never be blocked by
warning-level noise). Pin 9.7.6 untouched in both files; no `nav:`/`strict:`
added anywhere.

## Dev environment note

Left the pre-existing dev server running (`knowledge-kb-1`, from S2/S3,
`docker compose ps` shows it `Up`) — untouched by this slice; nothing was
restarted. Nothing pushed; deploys stay manual-push-only.
