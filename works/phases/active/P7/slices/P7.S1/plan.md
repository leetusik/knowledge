# Plan — P7.S1: Feature portability pass

Orchestrator plan (auto run). Executor: slice-executor-mid. Read `phase.md` (Decomposition, Findings §1–§3, Constraints) and `slices/P7.DECOMP/plan.md` first — the architecture and file-class mapping live there. Scope is exactly two files (`scripts/site_smoke.py`, `Dockerfile`) plus `phase.md` notes. No commits, no status transitions.

## Goal

Make the shippable feature files portable so a **fresh scaffold can pass its own deploy gate**, and lock the byte-identical template class for S3: after this slice, `scripts/site_smoke.py` and `Dockerfile` are operator-agnostic and ship into `plugin/templates/kb/` unchanged.

## Change 1 — de-hardcode `scripts/site_smoke.py` PROJECTS (the crux)

Current state (verified):
- `site_smoke.py:48` — `PROJECTS = ["changple5", "hi2vi_web", "bootstrap_agentic_workspace.sh"]`, consumed only at lines 194–196 (`check_built`: `site/<project>/index.html` must exist per project).
- `check_graph` lines 290–298 already contains the *dynamic* discovery rule this repo considers canonical: subdirs of `docs/` excluding `reserved = {"current", "versions", "stylesheets", "assets", "javascripts"}`, counting `*.md` at depth 2 except `index.md`. (Project dirs DO carry their own `index.md` — the P5 per-project pages — which is exactly why `site/<project>/index.html` exists; `index.md` is excluded from doc *counts* but is expected in project dirs.)
- `graph_hook.py` discovers doc nodes by frontmatter (`source` as a mapping with `project`), which on this repo yields the same projects. Do NOT switch site_smoke to frontmatter parsing — the fs-based rule is the guard's existing idiom and must stay consistent with `check_graph`'s `fs_count`.

Do:
1. Replace the `PROJECTS` constant with one helper, e.g. `discover_projects(root: Path) -> list[str]`: sorted subdirs of `root/docs` not in the reserved set that contain ≥1 `*.md` other than `index.md`. Factor so **both** `check_built` (line 194 loop) and `check_graph`'s `fs_count` (296–298) use the same rule/helper — one discovery truth, they can never drift. Keep the `reserved` set a single shared constant.
2. Teeth guard: in `check_built`, zero discovered projects → failure `"no project dirs discovered under docs/"`. (A fresh scaffold has ≥1 seed project by design — S3's seed content; an empty docs tree must still fail the gate.)
3. Behavior on THIS repo must be unchanged: discovery yields exactly `changple5`, `hi2vi_web`, `bootstrap_agentic_workspace.sh` and the guard stays green. All other checks byte-untouched.
4. Match the file's existing comment idiom (brief provenance comments like the P6.S2/P6.S3 ones) — one short comment noting the dynamic discovery invariant where PROJECTS was.

## Change 2 — pin the Dockerfile uv stage

`Dockerfile:16`: `COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv` → pin `ghcr.io/astral-sh/uv:0.11.28` (the locally-proven uv version; `uv --version` on this host = 0.11.28, and uv.lock was produced by this line of uv). Nothing else in the Dockerfile changes.

## Explicit non-changes

- `compose.yml` — confirmed non-issue (phase.md Findings §2): do NOT add `KB_PUBLIC_BASE_URL`; `http://localhost:8765` root is correct for the local viewer.
- No server/ code, no mkdocs.yml, no pages.yml, no new test files (keep verification inline/lightweight per CLAUDE.md).

## Validation (run, record outcomes in result.md)

1. Build the site the way CI does and run the guard: `docker run --rm -v "$PWD":/docs squidfunk/mkdocs-material:9.7.6 build` then `python3 scripts/site_smoke.py` → green. (`docs/current/qa.md` documents this acceptance pattern; if the Docker daemon is unavailable, use a throwaway venv `pip install mkdocs-material==9.7.6` + `mkdocs build` and say so.)
2. Negative test (qa.md pattern): after the green run, temporarily rename one project's built dir (e.g. `site/changple5` → aside) → `site_smoke.py` must FAIL naming that project; restore and re-run green. This proves the dynamic check kept its teeth.
3. Discovery sanity, inline (no test files): with `python3 -c`, import the helper and (a) assert it returns the three expected projects for this repo root, (b) against a temp dir containing an empty `docs/`, assert the zero-project guard path fails (e.g. run `site_smoke.py --root <tmp>` and expect a non-zero exit mentioning the no-projects failure — other failures for the missing chrome are fine/expected in that run; you're checking the message appears).
4. Pinned image proof: `COMPOSE_BAKE=false docker compose build api` succeeds (pulls the pinned uv tag; operations doc records the COMPOSE_BAKE quirk on this host). If the daemon is down, verify the tag exists another way (`docker manifest inspect` once daemon is up is NOT possible — then note it as unverified and keep the pin, it matches the local uv).
5. `python3 scripts/workflow.py validate`.

## Wrap-up

- Append to `phase.md`: (a) a Findings note confirming the byte-identical class now includes `scripts/site_smoke.py` + `Dockerfile` (adjust the 3-class mapping if anything shifted); (b) Doc impact one-liners — `operations` (deploy gate is now portable: dynamic project discovery + zero-project guard; uv stage pinned 0.11.28) and `decisions` (dynamic discovery over hardcoded PROJECTS; pin rationale).
- Write `result.md` from scratch; return the structured verdict.

## Escalation 1: mid → high (infra cutoff, not a capability failure)

The mid-tier executor completed the slice — the working tree holds the full delivery (`scripts/site_smoke.py` + `Dockerfile` edits, `result.md`, `phase.md` Findings + Doc impact appends) and its `result.md` documents every validation in this plan as run and green (site build + guard PASS, negative test, discovery sanity incl. zero-project guard, `COMPOSE_BAKE=false docker compose build api` with the pinned tag, workflow validate) — but the agent was killed by an API session limit before returning its structured verdict, and before a final `python3 -m py_compile` pass it intended.

High-tier job — VERIFY AND COMPLETE, do not redo:
1. Read the delivered diff (`git diff scripts/site_smoke.py Dockerfile`) and `result.md`; check the delivery against this plan.
2. Re-run the validation set (idempotent): `python3 -m py_compile scripts/site_smoke.py`; the site build + guard (`docker run --rm -v "$PWD":/docs squidfunk/mkdocs-material:9.7.6 build` then `python3 scripts/site_smoke.py`); the inline discovery sanity checks (repo root yields the three known projects; empty-docs temp tree trips the zero-project failure); `python3 scripts/workflow.py validate`. Skip re-running the compose build only if you have another way to confirm the pinned tag builds — result.md already records it green.
3. Deviation ruling: the mid tier pinned `uv:0.8.14` (the uv its shell resolved; NOTE the host ALSO has `/opt/homebrew/bin/uv` = 0.11.28, so "the host uv" is ambiguous — two installs). Both tags exist; the build was proven with 0.8.14. Keep 0.8.14 unless verification shows a concrete problem; the version-bump question is flagged for the phase review either way.
4. Fix only what verification proves wrong; update `result.md` (and `phase.md` notes) only where reality differs from what it claims.
5. Return the structured verdict.
