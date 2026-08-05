# Plan — P21.REVIEW: Phase review, Web document deletion

Context: read `../../phase.md` in full (decomposition, findings, S1/S2 notes, Doc impact list), the phase `../../intent.md`, and both `../P21.S1/result.md` and `../P21.S2/result.md`. P21 is **not** in parallel mode — a passing review consolidates docs here.

## 1. Validate all slices together

- Backend (S1): from the repo root, with the disposable-postgres recipe recorded in `P21.S1/result.md` (docker `postgres:17` on `127.0.0.1:55433`, `KB_TEST_DATABASE_URL`, `.venv/bin/python`), run `pytest tests/ -q`. Expected: 99 passed, 1 pre-existing failure (`test_documents_list_detail_and_project_bridge` `format`-key case, recorded at `docs/current/qa.md:394`). Any *new* failure is a finding.
- Web (S2): from `web/`: `pnpm vitest run`, `pnpm lint`, `pnpm typecheck`. (`pnpm build` passed at S2; re-run only if something you find casts doubt on it. `pnpm format:check` fails repo-wide pre-existing — not a finding of this phase.)
- `python3 scripts/plugin_parity.py` and `python3 scripts/workflow.py validate`.
- If a live end-to-end exercise is practical in your environment (run the server + a session, delete via the route), do the three checks S2's result.md names (list delete, detail delete redirect, repeat delete → 404 copy); if not practical, verify the same behavior by reading the code paths and say so explicitly — don't silently skip.

## 2. Review against the objective and intent

Objective: logged-in members hard-delete documents from the web app (confirm step), reusing `_delete_document` so the doc is gone from file, DB, FTS, embeddings. Check specifically:
- The `/app` plane stays unmetered (no `UsageHint` on the delete path) and `server/main.py` is untouched with exactly one `WRITE_LOCK`.
- No public fallback on the DELETE (404-never-403, tenant-scoped), and the anonymous branch/`document-view.tsx` carry no delete control.
- The `is_public` UUID-vs-string bridge fix (S1 deviation 1) is correct against `server/api_auth.py:213`.
- The new precedents flagged by S2: guarded `redirect()` in a server action; cross-route-group island/action import; the rewritten header comments now telling the truth.
- Accepted gaps are documented, not silent: empty-page-after-last-row-delete; cross-org public-doc button → 404 copy.

## 3. Verdict and pass-only consolidation

- **Only on `pass`:** consolidate the phase's Doc impact list from `phase.md` into new doc versions — one `python3 scripts/workflow.py doc-new-version --doc <doc> --summary "..." --source P21.REVIEW` per affected doc (`api`, `backend`, `security`, `qa`, `frontend`, `experience` per the list — write the actual content updates into the new version files per the docs' house style), then `rebuild-docs`. Write only docs, never source.
- On `changes_requested` or `blocked`: STOP before any consolidation; finish validation and judgment first so everything arrives in one cycle, then return the verdict with numbered findings and proposed fix slices (id, name, kind `fix`, risk, one-line scope each).
- Do not produce a phase explainer; report the fixed pointer `explain: not written — run /explain for this phase`.
- Write `result.md` in this slice's folder (free-form): validation evidence, judgment, findings or consolidation summary. Append any durable notes to `phase.md`.

Rules reminder: `doc-new-version` is permitted to you only because this is the review slice; never commit, never run other state commands (the orchestrator records the verdict via `review-phase`).
