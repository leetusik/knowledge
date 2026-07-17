# P12.REVIEW — phase review + durable-doc consolidation

## Context

The final slice of P12. All six middle slices are `done` and committed — the authenticated web app
now ships the full feature set: **S1** design-system scaffold, **S2** auth/BFF/sealed-cookie + app
shell, **S2R** re-skin to the Knowledge Base design system, **S3** tenant dashboard (+ the
`/app/dashboard` route), **S4** project detail + show-once credentials, **S5** per-tenant documents
browse/search (+ unmetered `/app/documents`+`/app/search`), **S6** in-app knowledge graph (+
`/app/graph`). The entire rail (Dashboard · Documents · Graph) is live. This slice is delegated to
`slice-executor-high` like any slice: it **validates every slice together**, **reviews against the
objective / `intent.md` / docs**, and — **only on a passing review** — **consolidates the phase's
accumulated `phase.md` "Doc impact" notes into new durable-doc versions** (writing docs only, never
source). It returns a `review_verdict`.

## Part 1 — Validate the whole phase (all slices at once)

Run the consolidated behavioral validation (do not trust the per-slice `done` verdicts — re-run):
- **Backend** — the Python suite. Run it **against the reachable Postgres DSN** so the tenant-scoped
  `/app` route tests actually execute (the executors used `postgresql://vocky:vocky@127.0.0.1:55432/
  postgres` — knowledge has no host-mapped Postgres of its own): `KB_TEST_DATABASE_URL=… .venv/bin/
  python -m pytest -q` → expect **77 passed, 0 skipped** (the P12 additions: the S3 dashboard, S5
  documents/search, S6 graph route tests + the pre-P12 suite). Also confirm the default (no-DSN) run
  stays green (**65 passed**, the Postgres-gated suites skip cleanly — no committed creds).
- **Frontend** — `pnpm --dir web typecheck` · `pnpm --dir web lint` · `pnpm --dir web test`
  (expect **54 passed**) · `pnpm --dir web build` (the whole app compiles; `/dashboard`,
  `/projects/[id]`, `/documents`, `/documents/[id]`, `/graph` all as dynamic routes).
- **State integrity** — `python3 scripts/workflow.py validate`.
- **Interactive/visual E2E** — the real browser render (login → dashboard/project/documents/graph,
  mint/revoke, search, graph drag/zoom/click-through) needs a running backend + seeded login + a
  browser, which the phase could not stand up (no host-mapped Postgres; the sealed-cookie BFF + live
  uvicorn is a larger stack). Record it as **deferred to the P14 deploy / operator verification** —
  the route behavior is covered by the `TestClient` suites and the frontend by typecheck/lint/build.
  Do **not** block the review on it (consistent with how S3–S6 recorded it).

## Part 2 — Review against the objective + intent

Confirm P12 delivered its objective (`phase.md`) and the operator's `intent.md`: an **authenticated
web app** with a **tenant dashboard** + **project detail pages** consuming the tenancy/usage APIs,
**all web-UI features free** (graph + Claude-Code surfaces included, nothing plan-gated), modeled on
hi2vi_web/vocky but on the settled **Knowledge Base design system**. Assess the **flagged deviations**
and record a disposition for each (accept, or cut a follow-up fix slice):
- **S3 — "View all" projects button omitted**: no all-projects route exists in P12 and a live link
  would 404 (violates the S2 "never a 404 link" rule); the dashboard already renders the tenant's
  complete list. *Assess: accept (a later slice/phase can add an all-projects surface) or request one.*
- **No design specimen for project-detail / documents / graph** (only dashboard + login cards were
  delivered): those pages are faithful compositions of the delivered `.kb-*` vocabulary + the two
  on-token extensions **`.kb-prose`** (S5 markdown reader) and the **`--kb-graph-*`** token layer
  (S6). *Assess: accept as a faithful application of the delivered design system; note that a future
  design pass (P14 or a design round) could formalize reader/graph specs — this is documentation of a
  known gap, not a blocker.*
- Confirm the **constraints held**: surface discipline (`/auth/*`+`/app/*` only, never `vk_`-keyed
  `/api/*` from the app), the BFF/sealed-cookie boundary (no browser-JS token, no backend CORS
  change, no web-DB), credential plaintext shown once, 404-never-403 on foreign ids, usage
  read-only/no plan-gating, and **web-UI reads unmetered** (`/app/dashboard`+`/app/documents`+
  `/app/search`+`/app/graph` never move a usage counter).

If everything holds → **`pass`**. If a flagged item warrants code change → **`changes_requested`**
with proposed `P12.Fn` fix slices. If blocked → **`blocked`**.

## Part 3 — Consolidate durable docs (ONLY on a passing review)

Create new versions via `python3 scripts/workflow.py doc-new-version --doc <name> --summary "…"
--source P12.REVIEW` (writing **docs only, never source**), consolidating the `phase.md` "Doc impact"
running list (S1/S2/S2R/S3/S4/S5/S6). Confirm each exact name/latest against `docs/index.json`; the
current latest versions to extend are:
- **`frontend`** (v0004 → v0005) — the whole `web/` Next.js app: the KB design system (`@theme`
  repointed at per-scheme `--kb-*`, the `.kb-*` console layer, self-hosted Fraunces/Source Sans/
  JetBrains/Pretendard), the sealed-cookie BFF + `lib/knowledge/*` server client seam + auth-guards,
  the app shell (dark login gate / light console), the four surfaces + their components (StatTiles,
  the `console-trend.js` line/area TrendChart, DataTable lists, the show-once `.kb-reveal` modal, the
  3-state status, the `.kb-appsearch` documents browser, the `react-markdown` `.kb-prose` reader), and
  the `GraphCanvas` client canvas renderer + the `--kb-graph-*` token layer.
- **`architecture`** (v0009 → v0010) — the separate-origin Next.js app + server-side sealed-cookie BFF
  as knowledge's **authenticated** browser surface (no CORS change, no web-side DB); the new
  session-scoped, tenant-scoped, **unmetered** `/app` read routes (dashboard/documents/search/graph);
  the app as the **per-tenant knowledge viewer** (resolves the coexist-vs-replace-mkdocs question — the
  public mkdocs site stays tenant #1's public surface); the project UUID↔content-name bridge.
- **`api`** (v0008 → v0009) — the new `/app` routes: `GET /app/dashboard` (per-project rollup +
  activity), `GET /app/documents`, `GET /app/documents/{id}`, `GET /app/search`, `GET /app/graph` —
  all session-scoped, tenant-scoped, unmetered; the `/api/*` frozen contract untouched.
- **`experience`** (v0004 → v0005) — the signup/login gate → the light editorial console; the
  dashboard / project-detail (mint-show-once / revoke) / documents (browse·search·read) / in-app graph
  UX; the whole rail live; status encoded in form for greyscale.
- **`decisions`** (v0012 → v0013) — **D-P12-1/2/3 final**: app in a `web/` subdir; the sealed
  AES-256-GCM httpOnly-cookie server-side BFF (D-P12-2 as built); **app design = the Knowledge Base
  design system** (the S1 "adopt hi2vi green" record is superseded; hi2vi = structure/vibe only; the
  "deploy in P14" half stands); + the scope ADRs: docs-browse-in-app, graph-in-app, **unmetered `/app`
  web-reads** (web-UI search deliberately out of the billable `searches` metric — the paid retriever
  is P15), deltas-omitted, read-only web UI.
- **`operations`** (v0012 → v0013) — the web-app local build/run stub: `pnpm install` / `pnpm dev`
  (`127.0.0.1:3030`) / `pnpm build` (`output: "standalone"`), the two server-only env keys
  `KB_API_BASE_URL` + `SESSION_SECRET` (via `.env.example`); **full production deploy = P14**.
- **`product`** (v0003 → v0004, if warranted) — the authenticated web app as the primary user surface;
  **all web-UI features free** (graph + Claude-Code surfaces included).
- (`security` may also warrant a note — the sealed-cookie BFF threat model + the show-once credential
  handling + unmetered-reads-never-alter-a-request; the review executor decides whether it rises to a
  new version or is already covered by P10/P11's security docs.)

Then `python3 scripts/workflow.py rebuild-docs` (regenerate `docs/current/*` snapshots) as part of the
consolidation, and confirm `docs/index.json` reflects the new versions.

## Verdict handoff (orchestrator, after the executor returns)

The executor returns a `review_verdict`; **I** (orchestrator) record it —
`python3 scripts/workflow.py review-phase P12 --verdict <pass|changes_requested|blocked> --reviewer
slice-executor-high --note "…"` — which transitions **both** the phase and the `REVIEW` slice, then
`python3 scripts/workflow.py validate`, then commit. A `pass` marks P12 `done` (left in `active/` — I
do **not** archive here). `changes_requested` → I create the proposed `P12.Fn` slices, complete them
via the executor, and re-review. I do **not** continue into P13.

## Out of scope
- **Archiving** P12 (a separate manual step — `archive-phase`/`rotate-backlog`/`archive-all` — later,
  on the operator's say-so).
- Any **source** change (the review writes only docs; behavioral fixes, if needed, become `P12.Fn`
  slices).
- **P14** work (production deploy, the public landing page, a formal design pass for the
  reader/graph surfaces).

## Critical files
- **Read/validate:** every slice's `plan.md`/`result.md` under `works/phases/active/P12/slices/*`, the
  phase `phase.md` (objective + intent link + the Doc-impact running list), `docs/index.json`; the
  code under `web/` + `server/{dashboard,documents,graph}_api.py` + `tests/test_{dashboard,documents,
  graph}_api.py`.
- **Write (docs only):** new `docs/versions/<doc>/vNNNN_*.md` via `doc-new-version` for
  frontend/architecture/api/experience/decisions/operations/(product)(/security), then
  `rebuild-docs`; append the review outcome to `phase.md`.
