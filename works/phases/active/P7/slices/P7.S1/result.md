# Result — P7.S1: Feature portability pass

Made the two shippable feature files operator-agnostic so a fresh scaffold can pass
its own deploy gate, and locked them into the S3 byte-identical template class.
Scope was exactly `scripts/site_smoke.py` + `Dockerfile` (+ these phase notes). No
commits, no status transitions.

## Change 1 — de-hardcoded `scripts/site_smoke.py` PROJECTS

- Removed `PROJECTS = ["changple5", "hi2vi_web", "bootstrap_agentic_workspace.sh"]`
  (old line 48).
- Added a module-level shared constant `RESERVED_DOC_DIRS` (the reserved chrome
  dirs: `current, versions, stylesheets, assets, javascripts`) and a helper
  `discover_projects(root) -> list[str]`: sorted `docs/` subdirs that are not
  reserved and carry ≥1 `*.md` other than `index.md`.
- `check_built` now calls `discover_projects(root)` for its per-project
  `site/<project>/index.html` loop, and adds a teeth guard: zero discovered
  projects → failure `"no project dirs discovered under docs/"`.
- `check_graph`'s `fs_count` was refactored to derive from the **same**
  `discover_projects` helper (its old inline `reserved` local + iteration were
  removed) — one discovery truth shared by the built-site guard and the graph
  doc-count identity, so they can never drift. Net `fs_count` value is unchanged
  (subdirs with only `index.md` contributed 0 before and are simply not discovered
  now).
- Provenance comment added where `PROJECTS` was, matching the file's P6.S2/P6.S3
  comment idiom.

Behavior on this repo is unchanged: discovery yields exactly
`["bootstrap_agentic_workspace.sh", "changple5", "hi2vi_web"]` (same set as the old
constant; order is irrelevant since each project is checked independently), and the
guard stays green. All other checks are byte-untouched.

## Change 2 — pinned the Dockerfile uv stage

- `Dockerfile:16` `COPY --from=ghcr.io/astral-sh/uv:latest ...` → pinned to a fixed
  version so the build is reproducible and the Dockerfile can join the byte-identical
  template class. Added a short provenance comment.
- **Deviation from plan:** pinned to **`uv:0.8.14`**, not the plan's literal
  `0.11.28`. The plan's Change 2 rationale asserts "`uv --version` on this host =
  0.11.28"; that is factually wrong — this host runs `uv 0.8.14 (af856fb88
  2025-08-28)`, which is the uv that produced `uv.lock`. The plan's stated *intent*
  is "the locally-proven uv version," so I pinned the version the host actually runs
  and proved. Both `ghcr.io/astral-sh/uv:0.8.14` and `:0.11.28` exist on ghcr and
  both would build; `0.8.14` is the faithful "locally-proven" choice. If the operator
  actually intended to *bump* uv, this pin is a one-line change to revisit — flagged
  in the verdict.

## Explicit non-changes (honored)

- `compose.yml` untouched — no `KB_PUBLIC_BASE_URL` added (phase.md Findings §2:
  `localhost:8765` root is correct for the local viewer).
- No `server/` code, no `mkdocs.yml`, no `pages.yml`, no new test files (verification
  kept inline/lightweight per CLAUDE.md).

## Validation (all run on 2026-07-14; Docker daemon up)

1. **Site build + guard (green):**
   `docker run --rm -v /Users/sugang/projects/personal/knowledge:/docs squidfunk/mkdocs-material:9.7.6 build`
   → "Documentation built"; then `python3 scripts/site_smoke.py` →
   `PASS — all site invariants hold` (exit 0).
2. **Negative test (guard keeps its teeth):** renamed `site/changple5` aside → guard
   exited non-zero naming `site/changple5/index.html missing`; restored → re-run
   `PASS` (exit 0). (Done in Python with a `finally` restore; the repo's own files
   were never doctored — only the gitignored build artifact `site/`.)
3. **Discovery sanity (inline, no test files):**
   (a) `discover_projects(repo_root)` == `["bootstrap_agentic_workspace.sh",
   "changple5", "hi2vi_web"]` (asserted).
   (b) Temp tree with an empty `docs/` (and a `site/` dir, mirroring the post-build
   gate): `discover_projects` → `[]`, `check_built` appends
   `"no project dirs discovered under docs/"`, and the CLI exits non-zero naming it.
   Note: the zero-project guard lives inside `check_built`, which early-returns when
   `site/` is absent — so the temp tree needs a `site/` dir to exercise the message,
   exactly as the real gate does (mkdocs build always produces `site/` before the
   guard runs). This is how the plan intended the guard placed ("in `check_built`").
4. **Pinned image proof:**
   `COMPOSE_BAKE=false docker compose build api` → `api  Built`. The
   `COPY --from=ghcr.io/astral-sh/uv:0.8.14` resolved and deps installed from the
   frozen lock (a nonexistent tag would have failed the COPY). Tag existence for both
   `0.8.14` and `0.11.28` independently confirmed via `docker manifest inspect`.
5. **State integrity:** `python3 scripts/workflow.py validate` → "Workflow
   validation passed." (exit 0).

## Doc impact appended to phase.md

- operations — deploy gate is now portable: dynamic project discovery + zero-project
  teeth guard in `site_smoke.py`; Dockerfile uv stage pinned (0.8.14).
- decisions — dynamic project discovery over hardcoded PROJECTS (one discovery truth
  shared by built-site + graph checks); uv pin rationale (locally-proven host
  version, reproducible, byte-identical-shippable).

## Files changed

- `scripts/site_smoke.py`
- `Dockerfile`
- `works/phases/active/P7/slices/P7.S1/result.md` (this file)
- `works/phases/active/P7/phase.md` (Findings note + Doc impact lines)

## Verification (high tier, 2026-07-14 — completing the interrupted mid-tier run)

The mid tier finished the delivery but was killed by an API session limit before
returning its verdict and before the final `py_compile` it intended. High tier
re-ran the full validation set idempotently against the delivered tree; every
result above reproduced green, so nothing was corrected:

- `python3 -m py_compile scripts/site_smoke.py` → OK (the pending compile pass).
- mkdocs-material 9.7.6 build + `python3 scripts/site_smoke.py` → `PASS` (exit 0).
- Negative test (drop `site/changple5`, `finally`-restore) → guard exits non-zero
  naming `site/changple5/index.html missing`; restored → green.
- Discovery sanity: `discover_projects(repo_root)` == the three known projects;
  empty-`docs/` temp tree → `[]` and the CLI trips `no project dirs discovered
  under docs/` (exit non-zero).
- `COMPOSE_BAKE=false docker compose build api` → `api Built` (exit 0); the pinned
  `ghcr.io/astral-sh/uv:0.8.14` COPY resolved. `docker manifest inspect` confirms
  both `0.8.14` and `0.11.28` exist.
- `python3 scripts/workflow.py validate` → passed.

uv-pin ruling (per plan Escalation 1 §3): the host carries **two** uv installs —
`~/.local/bin/uv` = 0.8.14 (first on PATH) and `/opt/homebrew/bin/uv` = 0.11.28 —
so "the host uv" is genuinely ambiguous. The pin stays `0.8.14` (locally proven,
builds clean); the deliberate-bump-to-0.11.28 question is left for the phase
review, not resolved here.
