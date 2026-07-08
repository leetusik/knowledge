# P4.S5 — Publish hygiene: publish-safe source metadata + hide docs/versions from the built site

Operator-approved plan (2026-07-08). Executor: `slice-executor-low` — follow this plan literally; escalate on any surprise. Promoted from deferred job **D1** (original brief appended at the bottom).

## Context

Verified state: all 6 explainer docs leak `/Users/sugang/...` — **only** on their frontmatter `source.repo:` line (bodies and `docs/current/` are clean; pre-verified by grep); `docs/versions/` (20 files) publishes publicly; the Pages workflow builds with `mkdocs-material==9.7.6` (mkdocs ≥1.6, so `exclude_docs` is available); mkdocs is NOT installed locally (CI-only) — local build verification via `uvx`.

**Design decision (resolved at the plan gate, operator-approved): `source.repo` = repo directory basename** (e.g. `changple5`) — no absolute/home paths ever. URL-shaped values (`http(s)://`, `git@`, `ssh://`) pass through unchanged (forward-compat for P7's plugin). `source.project` already carries the project name; basename keeps `repo` meaningful without leaking the filesystem.

Read `phase.md` Constraints first. Never add `nav:`/`strict:` to mkdocs.yml. Never touch `docs/current/` or `docs/versions/`.

## What to build

### 1. Sanitizer (server/documents.py)

```python
def sanitize_source_repo(value: Optional[str]) -> str:
    """Publish-safe source.repo: local paths collapse to their basename; URLs pass through."""
    v = (value or "").strip()
    if not v:
        return ""
    if v.startswith(("http://", "https://", "git@", "ssh://")):
        return v
    if "/" in v or v.startswith("~"):
        return PurePosixPath(v.rstrip("/")).name
    return v
```

(`from pathlib import PurePosixPath`.) Known accepted quirk: a bare `org/repo` shorthand collapses to `repo` — document in the docstring.

### 2. Apply at both ingestion seams

- `server/main.py` `create_document`: `source_repo = documents_mod.sanitize_source_repo(body.source_repo)` before the write; thread the sanitized value into `write_document_file` and `db.upsert_document` (the unchanged /explain skill keeps sending absolute paths; the server stays safe without a skill change).
- `server/reindex.py` `_index_file`: wrap the parsed value — `source_repo = documents.sanitize_source_repo(source_repo) or None` (defense in depth: a hand-added doc with a path never reaches the DB/API).

### 3. Backfill the 6 explainer docs

Edit only the `repo:` frontmatter line in each of the 6 docs under `docs/changple5/`, `docs/hi2vi_web/`, `docs/bootstrap_agentic_workspace.sh/` — replace the absolute path with its basename (apply the sanitizer rule to the existing value; e.g. `/Users/sugang/projects/personal/changple5` → `changple5`). Touch nothing else in the files. Then `uv run python -m server.reindex` → DB `source_repo` syncs. Post-check: `grep -rn "/Users/" docs/` must return zero matches.

### 4. Hide docs/versions/ from the built site (mkdocs.yml)

Append after the `plugins:` block:

```yaml
# D1: workspace internals under docs/versions/ are history, not site content —
# excluded from the built site (pages, nav, search). docs/current/ stays published.
# Use exclude_docs only; never nav:/strict: (see the load-bearing comment above).
exclude_docs: |
  /versions/
```

### 5. README touch-up

In the README's publish-path bullet area (around lines 14–19): add one bullet noting `docs/versions/` is excluded from the built site (history lives in git/`docs/versions/`, latest under `docs/current/`), and one noting `source.repo` frontmatter is publish-safe (repo name only; the API sanitizes at write time).

### 6. Tests (small)

- `tests/test_documents.py`: one test covering `sanitize_source_repo` cases (absolute path → basename; trailing slash; `~/x/y` → `y`; `https://github.com/x/y` unchanged; plain name unchanged; empty/None → `""`).
- `tests/test_api_write.py`: one test — POST with an absolute `source_repo` → written frontmatter line is `  repo: <basename>` and GET-by-id returns the sanitized `source_repo`. If any existing byte-exact fixture posts a path-shaped `source_repo`, update its expectation to the sanitized form (that is the intended behavior change); plain-name fixtures are unaffected.
- Full suite green: `uv run pytest -q`.

### 7. Local site-build verification

`uvx --from mkdocs-material==9.7.6 mkdocs build --site-dir <scratch>/site` (use a temp dir OUTSIDE the repo; network download OK), then assert: `<scratch>/site/versions/` does NOT exist; `<scratch>/site/current/` DOES exist; `grep -r "/Users/" <scratch>/site/` → empty. If `uvx` or the build errors unexpectedly → escalate, don't improvise.

### 8. Wrap-up

Write free-form `result.md`; append to `phase.md`: Doc-impact one-liners (`security.md`: no local paths on the public surface + write-time sanitizer; `data.md`/`api.md`: publish-safe `source.repo` convention (basename, URLs pass through); `operations.md`: `exclude_docs` + what publishes; `decisions.md`: ADR — basename representation + exclude_docs-not-nav) and a "From S5" cross-slice note (P7: plugin skill may send a clean repo name/URL, server sanitizes regardless; D1 is now fully resolved). No commits, no status transitions.

## Verification

Full test suite, the reindex run, the `grep -rn "/Users/" docs/` zero-match check, and the local `uvx` mkdocs build assertions above. Do NOT commit — the orchestrator commits.

---

## Promoted Deferred Context (original D1 brief)

# Deferred: D1 Decide whether works/docs internals appear on the public site

## Context

## Why Deferred

agentic-workspace files now live inside the MkDocs content root (docs/current, docs/versions, docs/README.md, docs/index.json)

## Trigger to Promote

P3 planning

## Notes
