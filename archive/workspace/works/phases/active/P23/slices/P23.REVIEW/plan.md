# Plan — P23.REVIEW (phase review: document version control)

## Inputs

- `../../phase.md` — objective, pinned design, findings F1–F10, every slice's appended
  notes, and the **Doc impact** list (DECOMP expectation + S1/S2/S3/S4 concrete lines).
- `../../intent.md` — the confirmed operator intent this phase must satisfy.
- Each slice's `plan.md` + `result.md` (S1 write path, S2 read API, S3 web, S4 skill).
- P23 is NOT in parallel mode — a passing review consolidates docs here.

## 1. Validate all slices together

- `.venv/bin/python -m pytest` (the venv interpreter — repo-root python3 lacks pytest)
- Postgres-gated `/app` suites (no CI runs pytest; without a DSN they silently skip):
  use the recipe recorded in phase.md — unix-socket DSN
  `postgresql://kb@/kbtest?host=/tmp&port=55432` with a disposable local cluster; if
  standing up the cluster fails in this environment, say so explicitly in the verdict
  (do not silently accept the skips).
- `python3 scripts/plugin_parity.py` (template mirror gate — S1/S2 touched server+tests)
- `python3 scripts/skills_parity.py` (four-copy skill gate — S4)
- In `web/`: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` (S3)
- `python3 scripts/workflow.py validate`
- Smoke the end-to-end story the intent asks for (temp KB root or the test fixtures):
  publish v1 → publish v2 via `new_version` → list versions on both planes → fetch v1
  body → overwrite archives → reindex from disk rebuilds `document_versions`.

## 2. Review against objective and intent

- intent.md: agent can see previous versions and publish v2/v3 instead of a new post —
  server schema/API ✔? web history ✔? /explain updated across copies ✔?
- The flagged behavior change (`overwrite: true` now archives) — confirm it is
  deliberate, coherent, and documented.
- The known consciously-accepted costs (S3's two upstream calls per doc page; S4's
  step-6 fallback cannot version) — judge whether they hold or need fix slices.
- Backward compatibility promises (unversioned corpus byte-identical, CLI untouched,
  search/graph output unchanged) — verify via the test evidence.

## 3. Verdict

- `changes_requested` / `blocked`: finish validation + judgment first, then STOP before
  any doc consolidation; return numbered findings + proposed fix slices.
- `pass`: consolidate the Doc impact list into new doc versions with
  `python3 scripts/workflow.py doc-new-version --doc <doc> --summary "..." --source P23.REVIEW`
  (one per affected doc; write docs only, never source), then `rebuild-docs` if the
  engine doesn't do it automatically. The Doc impact lines name: `data.md`, `api.md`,
  `backend.md`, `frontend.md`, `experience.md`, `product.md`, and possibly
  `architecture.md`/`decisions.md` — consolidate what the lines actually support,
  merging overlapping lines per doc; verify the list is complete against the slices'
  results while you're at it.
- The review writes no phase explainer: report
  `explain: not written — run /explain for this phase`.

## Wrap-up

Write `result.md` (validation evidence, judgment, findings or consolidation record).
Return: review_verdict, findings (numbered, if any), proposed_fix_slices (if any),
doc_versions created (if pass), files_changed, explain pointer.
