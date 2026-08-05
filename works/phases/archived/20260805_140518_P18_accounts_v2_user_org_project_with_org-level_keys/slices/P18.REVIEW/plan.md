# Plan — P18.REVIEW: phase review + durable-doc consolidation

Operator-approved orchestrator plan (2026-07-22). Executor: `slice-executor-high` (kind: review). Read every completed slice's `slice.json` + `plan.md` + `result.md`, the phase's `phase.md` (Context, Findings, Constraints, the full Doc impact running list) and `intent.md`, `docs/index.json`, and the relevant `docs/current/*.md`.

## 1. Validate all slices together (local re-runs; cite S5's live evidence)

- Root `pytest` (legacy mode, `.venv/bin/python -m pytest -q`) — green.
- Postgres-gated suite vs a disposable `postgres:17` (S1/S2's pattern) — green **except** the known pre-existing `test_documents_api.py::test_documents_list_detail_and_project_bridge` failure (P16-era; already confirmed on clean trees by S1 and S2 — do not fix it here).
- Web: `pnpm --dir web typecheck && pnpm --dir web lint && pnpm --dir web build` (+ `pnpm --dir web test` if configured) — green.
- CLI: `cd cli && uv run pytest -q` — green.
- `python3 scripts/plugin_parity.py` → 0; `python3 scripts/skills_parity.py` → 0.
- `python3 scripts/workflow.py validate`.
- **Do not re-run the prod smoke** — S5 Stage B ran it today against `https://knowledge.hi2vi.com` (PASS exit 0, recorded in S5's result.md). Cite that; a re-run only adds throwaway prod tenants.

## 2. Judge vs objective / intent.md

Intent bullets: (1) signup auto-provisions default org + default project; (2) org-level `vk_` keys, honest with tenant-wide enforcement; (3) projects get-or-create by name; (4) CLI repo-basename default + `--project` + `"default"` fallback. Boundaries: D14 (org mgmt) untouched, P19/P20 not encroached. Invariants: frozen contracts additive-only; parity green; single worker preserved.

## 3. Adjudicate the two flagged items (recommend routing; you cannot run `defer-job`)

1. Pre-existing `test_documents_api.py` `format`-key gated failure — not P18's defect. Recommend: deferred job (orchestrator creates it post-review) unless you judge it phase-blocking (then `changes_requested` + proposed fix slice).
2. S4's note: `init --project other` re-mints an org key — cosmetic tension with "one key, all repos"; candidate follow-up. Same routing options.

## 4. On `pass` ONLY — consolidate the docs

Expect all 11 docs affected (product, experience, architecture, frontend, backend, data, api, decisions, operations, security, qa) per the running list. For each: `python3 scripts/workflow.py doc-new-version --doc <doc> --summary "<whole-phase summary for that doc>" --source P18.REVIEW` → edit ONLY the returned `edit_path` (consolidate that doc's running-list entries into durable truth — whole-phase, not per-slice) → after the last doc, `python3 scripts/workflow.py rebuild-docs` once. Never hand-edit `docs/current/*` or existing versions.

## 5. Wrap up

`result.md`: validation matrix, judgment rationale, flagged-item recommendations, doc versions created. Structured verdict with `review_verdict`: `pass` | `changes_requested` (numbered issues + proposed `P18.Fn` slices) | `blocked`. **Never edit source code.** No commits, no status transitions (the orchestrator records the verdict via `review-phase`).
