# Result — P7.F1: Write path auto-creates project landing `docs/<project>/index.md`

Fix slice for the gap P7.S6's E2E found (its `plan.md` → "## Escalation 1"): neither
the API write path nor the explain-skill fallback ever created a project landing, so a
scaffold user documenting a second project would fail their next Pages deploy gate
(`site_smoke.check_built` requires `site/<project>/index.html` for every project
`discover_projects` finds; mkdocs `navigation.indexes` synthesizes none). **The API now
owns landing creation** (escalation's option 1), mirrored across the parity boundary and
into all three explain-skill fallback branches.

## What changed

### Server (the fix)
- `server/documents.py` — added `project_landing_content(project)` and
  `ensure_project_landing(docs_root, project) -> bool`. The landing is created only when
  absent and is **never** overwritten; it carries **no YAML frontmatter / no `source:`**
  mapping, so it stays a non-doc (`index.md` is on `graph_hook._SKIP_NAMES`, excluded
  from `discover_projects` doc-counting and from `check_graph`'s `fs_count`).
- `server/main.py` — `create_document` calls `ensure_project_landing` inside the
  `WRITE_LOCK` right after `write_document_file`. When it created the landing, the scoped
  `git add` stages a **third** path `docs/<project>/index.md` (otherwise the commit stays
  the usual 2 paths — the "only touched paths, never `-A`" invariant is honored). Added a
  201 response field `landing_created: bool` (symmetric to `recent_updated`).
- **Delete path unchanged** (verified, not modified): deleting a project's last doc
  leaves the landing, but a dir with only `index.md` has zero countable docs →
  `discover_projects` drops it while mkdocs still builds the page → gate unaffected.

The exact minimal landing (byte-for-byte):

    # <project>

    Explainers about `<project>`, kept in this knowledge base.

### Parity mirror (byte-identical to the template)
- `plugin/templates/kb/server/documents.py`, `.../server/main.py`,
  `.../tests/test_api_write.py` — copied from the repo copies; `plugin_parity.py` green.

### Tests (`tests/test_api_write.py`, terse)
- `test_first_doc_creates_project_landing` — first doc of a fresh project creates the
  landing (exact content) and the scoped commit is 3 paths.
- `test_second_doc_leaves_landing_untouched` — a second doc into the same project does
  not recreate/modify the landing; commit back to 2 paths; `landing_created is False`.
- `test_existing_landing_never_overwritten` — a pre-existing hand-written landing is
  preserved verbatim and not re-staged.
- `test_happy_path_shape_and_scoped_commit` — its scoped-commit assertion updated to the
  now-correct 3 paths (its `test-project` is a fresh project, so its first doc creates
  the landing).

### Explain skills — ensure-landing step in the FALLBACK branch only (body edit)
- `plugin/skills/explain/SKILL.md` (shipped, step 6),
- `.claude/skills/explain/SKILL.md` and `.agents/skills/explain/SKILL.md` (kept
  body-identical; they differ only in frontmatter lines 4–5) — same identical body edit.
  Each writes the same minimal landing when `docs/<project>/index.md` is missing (never
  overwriting); the fallback's `git add -A` picks it up. The API branch needs nothing.
- Bootstrap repo untouched (constraint). `plugin.json` kept at 0.1.0.

## Validation (all run; all pass)

| # | Command | Outcome |
|---|---------|---------|
| 1 | `uv run pytest -q` | **57 passed** (was 53; +4 net after the 3 new cases and updated happy-path) |
| 2 | `python3 scripts/plugin_parity.py` | **PASS** — templates in parity with the repo |
| 3 | Reproducer (below) | **PASS** — the S6 failure is fixed |
| 4 | Operator-repo gate: `docker run --rm -v "$PWD":/docs squidfunk/mkdocs-material:9.7.6 build` + `python3 scripts/site_smoke.py` | **PASS** — unchanged for existing (hand-written-landing) projects |
| 5 | `claude plugin validate .` / `./plugin`, both `+ --strict` | all **✔ Validation passed** (exit 0) |
| 6 | `python3 scripts/workflow.py validate` | **Workflow validation passed** |

### Reproducer detail (validation #3 — the now-passing S6 case)
Rendered a non-operator scaffold (`render.py`, site "Reproducer Notes",
TZ America/New_York, ports 9765/9766, date 2026-07-14) → `git init` + base commit. Drove
the **scaffold's own byte-identical server code** via FastAPI `TestClient` (imported from
the scaffold path so `import server` resolves to the scaffold, **not** the live repo;
binds **no ports**, so the live KB on 8765/8766 is provably untouched) to POST a doc into
a NEW project `field-notes`:
- 201, `landing_created=True`; `docs/field-notes/index.md` auto-created with the exact
  content; scoped commit staged all 3 paths (doc, `docs/index.md`, landing);
  `source_repo` sanitized to `field-notes` (no `/Users/` leak on disk).
- `discover_projects` went from `['getting-started']` to `['field-notes','getting-started']`.
- `docker run --rm -v <scaffold>:/docs squidfunk/mkdocs-material:9.7.6 build` produced
  `site/field-notes/index.html`; `python3 <scaffold>/scripts/site_smoke.py --root <scaffold>`
  → **PASS** (2 projects / 2 docs); no `/Users/` leak in any built HTML.
- Teardown: scaffold + repro script deleted; `docker run --rm` left no containers; no new
  image built (cached `mkdocs-material:9.7.6` reused); live KB (`knowledge-kb-1`, Up 5h)
  untouched.

## Doc impact (appended to `phase.md` running list, for the P7.REVIEW slice)
- `backend — write path auto-creates a minimal docs/<project>/index.md for a project's first document (never overwrites; joins the scoped commit); keeps every project satisfying the per-project deploy-gate invariant. [F1]`
- `api — POST /api/documents side effect documented: first doc of a new project also creates the project landing (new response field landing_created: bool); the explain skills' fallback branches ensure the same landing when the API is unreachable. [F1]`
- `qa — deploy-gate invariant (site/<project>/index.html per project) now holds for API- and fallback-written projects, proven by the S6 reproducer. [F1]`

## Deviations from `plan.md`
- **Added a 201 response field `landing_created: bool`** (not explicitly called for). It
  is symmetric to the existing `recent_updated`, makes the new side effect observable and
  testable via the API, and is covered by the plan's `api` Doc impact ("side effect
  documented"). Recorded here and in the `api` Doc impact line.
- **Reproducer driven via TestClient against the scaffold's server code rather than
  `docker compose up`** (the plan explicitly left the mechanism to my judgment — "your
  call"). This runs the SCAFFOLD's byte-identical server (parity-proven), binds no ports
  (strictly safer than the 9765/9766 compose route — zero chance of touching the live KB
  on 8765/8766), and still exercises the real `create_document` HTTP handler end-to-end,
  followed by the real Docker mkdocs build + `site_smoke.py`. The gate step and
  operator-repo step are unchanged from the plan.
- Otherwise executed as planned. No `plugin.json` bump; bootstrap repo untouched; no
  commits or status transitions.
