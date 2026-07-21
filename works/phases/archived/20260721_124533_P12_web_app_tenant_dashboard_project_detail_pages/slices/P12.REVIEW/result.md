# P12.REVIEW — result

**Verdict: `pass`.** P12 delivered the free, authenticated web app — sign-in gate →
tenant dashboard · project detail · per-tenant documents (browse/search/read) · in-app
knowledge graph — on the settled **Knowledge Base design system**, with every constraint
held. All validation re-run green; the eight durable-doc versions are consolidated. The
one live-browser E2E gap is deferred to the P14 deploy / operator verification (recorded,
not a blocker). No source was touched (review writes docs only).

## Part 1 — Validation (re-run, not trusted from per-slice verdicts)

| Command | Result |
|---|---|
| `KB_TEST_DATABASE_URL=postgresql://vocky:vocky@127.0.0.1:55432/postgres .venv/bin/python -m pytest -q` | **77 passed, 0 skipped** (4.31s) — the S3 dashboard, S5 documents/search, S6 graph route tests execute against the reachable Postgres |
| `.venv/bin/python -m pytest -q` (default, no DSN) | **65 passed, 12 skipped** — the Postgres-gated `/app` suites skip cleanly; no committed creds |
| `pnpm --dir web typecheck` | **pass** (exit 0) |
| `pnpm --dir web lint` | **pass** (exit 0, no warnings) |
| `pnpm --dir web test` | **54 passed** (7 files) |
| `pnpm --dir web build` | **pass** — all routes compile: `/`, `/api/auth/{login,signup,logout}`, `/dashboard`, `/documents`, `/documents/[id]`, `/graph`, `/login`, `/projects/[projectId]`, `/signup` (dynamic `ƒ`) |
| `python3 scripts/workflow.py validate` | **Workflow validation passed** |

A throwaway test DB is created/dropped by the harness on vocky's Postgres
(`127.0.0.1:55432`) — knowledge has no host-mapped Postgres of its own; no credentials
committed.

**Interactive/visual browser E2E** (real render of login → surfaces, mint/copy/dismiss →
reload-never-re-reveals, revoke, search snippets, graph drag/zoom/hover/click-through) is
**deferred to the P14 deploy / operator verification** — the sealed-cookie BFF + live
uvicorn + seeded login + a browser could not be stood up here (the same limit S3–S6
recorded). Route behavior is covered by the `TestClient` suites; the frontend by
typecheck/lint/build. **Not a blocker.**

## Part 2 — Review against objective + `intent.md`

P12 delivers the phase objective and the confirmed intent: an **authenticated web app**
with a tenant dashboard + project detail pages consuming the tenancy/usage APIs, **all
web-UI features free** (graph + Claude-Code surfaces included, nothing plan-gated),
modeled on hi2vi_web/vocky but on the **Knowledge Base design system**. The full rail
(Dashboard · Documents · Graph) is live.

**Constraints — all verified (code-inspected, not just claimed):**

- **Surface discipline** — no `/api/*` backend calls from `web/src/lib/knowledge/*`; the
  only `/api/*` routes in `web/src` are the app's own `/api/auth` BFF endpoints. The app
  is a client of `/auth/*` + `/app/*` only.
- **Sealed-cookie BFF boundary** — `web/src/lib/session.ts` seals the token into an
  httpOnly cookie (`httpOnly: true`); no browser-JS token. **No backend CORS middleware
  anywhere in `server/`** (`grep` for `CORSMiddleware`/`allow_origins` → none). No
  web-side DB.
- **Unmetered web-UI reads** — `server/{dashboard,documents,graph}_api.py` contain **no**
  `request.state.usage =` assignment and **no** `record_event(` call (the only matches
  are docstrings stating the routes are unmetered). Web-UI browse/search/graph never move
  a usage counter across `/app/dashboard` + `/app/documents` + `/app/search` +
  `/app/graph`.
- **Credential plaintext shown once** — verified via S4's notes + the show-once modal;
  the list endpoint returns only `token_prefix`.
- **404-never-403** — backend-enforced (`_load_scoped_project`); the app renders a branded
  not-found, never assumes 403.
- **Usage read-only / no plan-gating** — no billing/entitlement path in the web UI; all
  features free.

### Disposition of the flagged deviations

1. **S3 "View all" projects button omitted** — **ACCEPT.** No all-projects route exists in
   P12; a live link would 404, violating the S2 "never a 404 link" console rule, and the
   dashboard already renders the tenant's complete, unpaginated list. Every other designed
   dashboard element ships. A later phase may add an all-projects surface + the button;
   recorded as a scope note in `decisions.md`, not a fix slice.
2. **No design specimen for project-detail / documents / graph** (only dashboard + login
   cards were in the KB handback) — **ACCEPT** as faithful compositions of the delivered
   `.kb-*` vocabulary + the two on-token extensions: the **`.kb-prose`** markdown reader
   (S5) and the **`--kb-graph-*`** token layer (S6, re-mapped onto the KB palette,
   near-exact to `extra.css` §10a). No new visual design was invented; both extensions
   compose only on the KB `--kb-*` palette. A future design pass (P14 or a design round)
   could formalize a reader spec + a graph spec — documented as a known gap in
   `frontend.md`/`decisions.md`, not a blocker.
3. **S2R non-functional re-skin deviations** (the app-unused, P14-reserved `ui/button.tsx`
   glow retuned to `--kb-shadow-hover`; the unused `ui/section.tsx` `forest` tone removed)
   — **ACCEPT.** Fully within the "tokens + component styling only" scope; they eliminate
   the last hi2vi green from source and compiled CSS. No functional change.
4. **S6 `/app/graph` `truncated` superset key + tag-pill href / "explainer"→"document"
   wording** — **ACCEPT.** A harmless superset of the four-key contract (the renderer
   ignores unknown keys) and faithful shell adaptations, not a redesign.

None of the flagged items warrants a code change → **no `P12.Fn` fix slices.** Verdict:
**`pass`.**

## Part 3 — Durable-doc consolidation (on the passing review)

Eight new versions created via `doc-new-version --source P12.REVIEW`, each **extending**
the prior version (no history restated), then `rebuild-docs` (confirmed `docs/index.json`
updated + `docs/current/*` regenerated):

| Doc | New version | What it consolidates |
|---|---|---|
| `frontend` | v0004 → **v0005** | the whole `web/` app: KB `@theme` tokens + `.kb-*` console layer, self-hosted Fraunces/Source Sans/JetBrains/Pretendard, the sealed-cookie BFF + `lib/knowledge/*` seam + guards, the app shell, the four surfaces + components, `GraphCanvas` + `--kb-graph-*` |
| `architecture` | v0009 → **v0010** | separate-origin Next.js app + server-side sealed-cookie BFF (no CORS, no web-DB); the four unmetered session-scoped `/app` read routes; the app as the per-tenant knowledge viewer; the graph as a server-side twin of the mkdocs hook |
| `api` | v0008 → **v0009** | the five unmetered `/app` reads (`GET /app/dashboard`, `/app/documents`, `/app/documents/{id}`, `/app/search`, `/app/graph`); the project UUID→name bridge; frozen `/api/*` contract untouched |
| `experience` | v0004 → **v0005** | signup/login gate → light editorial console; dashboard / project-detail (mint-show-once + revoke) / documents / in-app graph UX; whole rail live; status encoded in form |
| `decisions` | v0012 → **v0013** | D-P12-1/2/3 final (web/ subdir · sealed-cookie BFF · app design = KB design system, superseding the S1 hi2vi-green record; deploy P14) + the docs-in-app / graph-in-app / unmetered-`/app`-reads / read-only-web / "View all"-omission ADRs + two supersession bullets |
| `operations` | v0012 → **v0013** | the `web/` local build/run stub (`pnpm dev` :3030 / `output: "standalone"`) + `KB_API_BASE_URL` + `SESSION_SECRET` via `.env.example`; full deploy = P14 |
| `product` | v0003 → **v0004** | the authenticated web app as the primary user surface; all web-UI features free; the "personal web UI" non-goal resolved |
| `security` | v0007 → **v0008** | the sealed-cookie BFF threat model (no browser-JS token, no CORS change); enumeration-safe BFF pipeline; show-once `vk_` handling; unmetered reads never alter a request; five new checklist items |

**Note on doc naming:** the first `doc-new-version` pass used long descriptive summaries
whose slugified filenames exceeded macOS's 255-byte limit (and the editor's temp-file
suffix pushed them over). I reverted that pass cleanly (`git checkout` the tracked
`docs/index.json` + `docs/current/`, deleted the untracked over-long version files) and
recreated all eight with **short summaries** (the long detail lives in the doc bodies).
No other effect.

## Deviations from `plan.md`

- **`security` was promoted to a new version** (v0007 → v0008), which the plan left to the
  reviewer's judgment ("may also warrant a note … the review executor decides"). P12
  introduces knowledge's first browser-facing auth surface (sealed-cookie BFF, show-once
  credential UX, unmetered-reads-never-alter-a-request) — genuinely new durable
  security truth not covered by P10/P11's server-side docs — so it rises to a new version.
- Otherwise followed the plan exactly.

## For the operator / orchestrator

- **Verdict to record:** `review-phase P12 --verdict pass --reviewer slice-executor-high`.
  A `pass` marks P12 `done` and its `REVIEW` slice `done`; the phase stays in `active/`
  (archiving is a separate later step).
- **Owed at P14:** the live-browser visual acceptance of the app (login → surfaces,
  mint/revoke, search, graph interaction) + the production deploy (Dockerfile / compose /
  edge) + the public landing page + an optional formal design pass to give the reader
  (`.kb-prose`) and graph (`--kb-graph-*`) surfaces their own specimens.
