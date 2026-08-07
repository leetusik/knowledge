# Plan — P25.REVIEW: phase review of "Pretty public share URLs"

## Job

Validate all of P25's slices together, judge the phase against its objective and `intent.md`, and — **only on a `pass` verdict** — consolidate the phase's "Doc impact" notes from `phase.md` into new durable doc versions. This phase is NOT in parallel mode, so consolidation happens here. On `changes_requested` or `blocked`: complete validation and judgment first so the whole picture arrives in one cycle, then STOP before any consolidation and return numbered findings plus proposed fix slices.

## What P25 built (S1–S5, all `done`; read each slice's `result.md` and the accumulated `phase.md`)

- S1: `tenants.slug` (nullable, unique; alembic `0005_tenant_slug`), `server/accounts/slugs.py` rules (charset + reserved list), repo/service functions, `serialize_tenant` slug, `PATCH /app/tenant` (422/409).
- S2: `GET /app/orgs/{org}/{project}/{slug}` resolver with the extracted `_is_publicly_readable` gate, additive `canonical_path` on detail reads, pretty 201 save URL via the `resolve_org_slug` async dependency.
- S3: `(public)/[org]/[project]/[slug]` pretty route (`@`-guard, catch-all fidelity), `resolveDocument` BFF seam, anonymous-only 307 from `/documents/{id}`.
- S4 (D19): `?org=` UUID-or-slug on `/app/graph`, `canonical_path` on the graph response, `/@{org}/graph` page, legacy `/graph/{uuid}` 307 on both branches.
- S5: copy-link swaps (three surfaces), dashboard Public URL panel (`setOrgSlugAction`, dedicated 409 copy), `KbTenant.slug`.

## Behavioral validation (run it all — this is the phase's consolidated validation)

1. **Backend, gated**: stand up a disposable Postgres (S1's recipe: `docker run` postgres:17 on port 55439), `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55439/kb .venv/bin/python -m pytest -q` — expect the S4 baseline **124 passed**, and run it **twice** against the same database (globally-unique-slug re-runnability). Tear the container down after.
2. **Backend, ungated**: `.venv/bin/python -m pytest -q` — expect **83 passed / 41 skipped** (clean skip path).
3. **Web**: `cd web && npm run lint && npm run typecheck && npm run build && npm run test` — expect build clean with routes `/[org]/[project]/[slug]` and `/[org]/graph` present and ordered after the static/dynamic incumbents; vitest **15 files / 85 tests**.
4. **Parity**: `.venv/bin/python scripts/plugin_parity.py` and `.venv/bin/python scripts/skills_parity.py` → PASS.
5. **Migration**: on the disposable Postgres, `alembic upgrade head` from scratch and a `downgrade 0004_project_visibility` → `upgrade head` round-trip.
6. **State**: `python3 scripts/workflow.py validate`.
7. **End-to-end smoke (judgment call, encouraged if cheap)**: the compose dev stack or a targeted uvicorn+next run exercising: set slug → 201 save URL pretty → resolver 200 → pretty page → legacy id URL 307s anonymously → graph slug URL → legacy graph redirects. If the stack is too heavy, the gated API tests plus S3/S4's recorded live-probe evidence may stand in — say which you did.

## Review judgment

Judge against `intent.md`'s confirmed intent and the four constraints that matter most:
- **No link breaks**: `/documents/{id}` and `/graph/{uuid}` still resolve everywhere (member + anonymous, slug and slug-less tenants); redirects are 307 and one-way.
- **404-never-403** on every new anonymous surface, misses indistinguishable.
- **Nothing durable keys off `documents.id`**; pretty URLs derive from (org slug, project, doc slug) only.
- **Slug-less tenants see exactly today's behavior**; provisioning is operator-set via the dashboard, no backfill.
Also check the cross-cutting seams the slices flagged for review: the anonymous doc detail's second Postgres round trip (S2), the member-affordance gap S5 closed on the pretty page, Q4's pretty-201-even-for-private decision, and the S5 deviation list (graph header uses `graph.canonical_path`; dashboard composes `/@{slug}/graph` locally as the one exception).

## On `pass` — consolidate docs (only then, and only here)

Work through `phase.md` § "Doc impact" (the **Actual (P25.S2/S3/S4/S5)** blocks plus S1's five lines; ignore the leftover "(expected)" hints where superseded). Consolidate per-doc — one `doc-new-version` per durable doc, not per note:

```
python3 scripts/workflow.py doc-new-version --doc <doc> --summary "..." --source P25.REVIEW
```

Expected docs: `api`, `data`, `backend`, `architecture`, `frontend`, `experience`, `qa`, `decisions` (D1–D4 from phase.md § "Design decisions settled here"). For each: edit the new version file under `docs/versions/<doc>/` (never `docs/current/` by hand), then `python3 scripts/workflow.py rebuild-docs` once at the end. You may run `doc-new-version` — you are the review slice; this is the one slice allowed to.

## Return

`result.md` in this slice's folder + a structured verdict: `review_verdict: pass | changes_requested | blocked`, numbered findings (with proposed fix slices on a non-pass), the validation evidence table, `doc_versions` created (on pass), and the fixed pointer `explain: not written — run /explain for this phase`. Never commit; never transition slice/phase status (the orchestrator records the verdict with `review-phase`).

---

## Re-review addendum (after `changes_requested`, F1 + F2 landed)

The first review pass (its findings and evidence are in the existing `result.md` — read it, then **overwrite** it with this pass's result) returned `changes_requested` with two findings; both fix slices are now `done`:

- **F1 (blocking, Finding 1)**: round-trip guard — `canonical_path` and the 201 save URL are emitted only when the dateless path resolves back to the same row. See `P25.F1/result.md`; new gated baselines: **125 passed** (Postgres) / **83 passed + 42 skipped** (no DSN); negative-control verified.
- **F2 (minor, Finding 2)**: `DASHBOARD.orgSlug.hint` now warns that changing a claimed slug breaks shared links. See `P25.F2/result.md`.

Re-review focus: verify both findings are actually closed (the F1 guard semantics against the Finding-1 transcript scenario; the F2 copy), re-run the consolidated validation with the updated baselines, and re-judge. On `pass`, do the doc consolidation as specified above, incorporating the first pass's Doc-impact audit: the **Actual (P25.F1/F2)** blocks are now part of the list; `decisions.md` gets D1–D4 + Q2/Q3/Q4 from `phase.md` § "Design decisions settled here" (no Actual note exists for it); give `product.md` its P25 paragraph (the audit judged it owed one).

---

## Third round (F3 + F4, after the production cutover)

The second pass PASSED and consolidated nine doc versions. The phase then shipped to production, and operator feedback produced two more fix slices, both now `done`:

- **F3 — unclaimed-slug share UX**: live diagnosis showed no org slug claimed on prod, so every share affordance silently fell back to the legacy URL and read as broken. The member share surfaces (document read view with a `canonical_path === null` ownership proxy — the plan's own-tenant premise was wrong, cross-org public reads exist; and the member graph header) now show a dashboard-linked claim-your-URL hint when the viewer's tenant has no slug. See `P25.F3/result.md`.
- **F4 — explainer height hydration race**: the sandboxed explainer posts its height before React hydrates the listener and the reporter's dedupe made the miss permanent — the frame stayed at its CSS fallback and scrolled internally (reproduced under CPU throttle on ALL article views, not just the member branch). Fixed with a parent→child `kb-explainer-request` re-post handshake; verified at 1/4/10/20x throttle across id/pretty/anonymous/versions views. New web baseline: **16 files / 88 tests**. See `P25.F4/result.md`.

This review pass: read the existing `result.md` (second pass) then OVERWRITE it. Verify both fixes (code + the new `explainer-reporter` tests + the recorded repro evidence), re-run the consolidated validation (gated pytest baseline 125 passed — F3/F4 touched no backend, so a single gated run suffices this round; web 16/88 expected), and re-judge. On `pass`, consolidate ONLY the F3/F4-round Doc impact notes (the `phase.md` list marks the earlier rounds CLOSED): new versions of `experience` (F3's hint), `frontend` and `qa` (F4's handshake + baselines). Do not re-version docs already covered by the second pass unless a real gap is found.
