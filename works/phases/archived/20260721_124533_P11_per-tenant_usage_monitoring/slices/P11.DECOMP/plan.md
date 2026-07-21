# P11.DECOMP — Decompose "Per-Tenant Usage Monitoring"

This is the **plan for the `P11.DECOMP` slice** (a decomposition slice). Its executor
(`slice-executor-high`) will **create the phase's middle slices as bare folders** via
`new-slice` and **seed `phase.md`** with the breakdown, findings, resolved design, and a
running Doc-impact list. It must **not** implement any code or pre-fill any middle slice's
`plan.md` — each middle slice is planned at its own turn.

## Context — why this phase, and what it must deliver

P11 is phase 2 of the five-phase SaaS pivot (P10–P14). P10 gave us accounts, tenancy, and a
tenant-scoped `/api/*`. P11 adds **per-tenant / per-project usage monitoring** — observability
only (no quotas, no billing; the paid retriever endpoint stays deferred as D6). The metrics feed
**P12's** tenant dashboard + project detail pages via a read API. Intent:
`works/phases/active/P11/intent.md`.

Two design forks were resolved with the operator before this decomposition (record both in `phase.md`):

- **Grain = event log.** One durable Postgres row per metered event; dashboard aggregates are
  derived on-read (GROUP BY day). Retention is handled by a **deferred cleanup job** (filed by the
  orchestrator after DECOMP), not built now.
- **Meter scope = writes + searches only.** Meter high-signal events (document create, document
  delete, search) synchronously best-effort, plus stamp credential `last_used_at` for recency. The
  open read/list path stays unmetered so it stays fast — this avoids by construction the hot-path
  write-amplification vocky explicitly warned about (their P3 `phase.md:50`).

### What research established (put the load-bearing facts in `phase.md`)

- **Vocky's "no metering table" trick only half-applies.** Vocky derived all usage from an existing
  domain table (`feedback_events`) + `last_used_at` stamps. For us, **documents-saved totals are
  already derivable** from the existing `GET /api/projects` (`{project,count,latest_date}`) and
  `GET /healthz` — but **search activity and API-call volume persist nowhere**, so they need real
  metering. Hence a small durable event table is unavoidable; we keep vocky's *read* shape.
- **Metering seam.** No middleware exists in `server/`. `/api/*` funnels through two async resolvers
  `resolve_api_read` / `resolve_api_write` → shared `_resolve_tenant_bearer` (`server/api_auth.py:123`),
  where the credential is resolved to `tenant_id` (+ `project_id` **only for `vk_` callers**;
  master bearer & session tokens leave `project_id=None`). `cred` is in scope at `api_auth.py:147`.
- **`last_used_at` is built but unwired.** `project_credentials.last_used_at` +
  `touch_credential_last_used` exist (`server/accounts/repository.py:204`, `service.py:265`) but are
  **never called**. `auth_tokens` is already wired in `require_user` (`server/accounts/auth.py:84`) —
  copy that best-effort-stamp pattern.
- **sync→async wrinkle (the crux of the metering slice).** The content handlers `create_document`
  / `search` / `delete_*` are **sync `def`** (WRITE_LOCK + sqlite), but a Postgres usage write is
  **async**, and event-type + success-status are only known *after* the handler. Recommended
  resolution: an **async HTTP middleware** that reads the resolved ctx off `request.state` (the
  resolver stashes it) + the response status, and records a best-effort event for the metered
  routes on 2xx; keep the `last_used_at` stamp in the resolver (it has `cred`). The metering slice
  owns choosing/validating this — flag it as that slice's key risk.
- **Project attribution.** The operator (tenant #1) writes via the **master bearer**, which has no
  `project_id` on the context — but the POST body carries `project` (name) and search carries a
  `project` filter. To attribute the operator's own usage per project (a primary dashboard case),
  resolve the operation's project **name → Postgres project UUID** within the tenant (best-effort;
  `usage_events.project_id` stays **nullable** so unmapped names degrade to tenant-level).
- **Testing.** There is **zero pytest coverage** of the Postgres/accounts plane; the only harness is
  `scripts/onboarding_smoke.py` (live httpx E2E, tenant mode). P11 **extends that script** rather
  than standing up a new pytest Postgres fixture — matches the repo's "keep tests lean, prefer
  smoke checks" rule.
- **Persistence + Alembic templates.** New entity = model (`server/persistence/models.py`, follow
  `ProjectModel` at :87 — `NAMING_CONVENTION`, `PG_UUID`, tz-aware `utc_now`) → types
  (`Create*`/`*Record`, `server/accounts/types.py`) → repository (sole ORM boundary, never commits) →
  service (owns the `async with session … commit`) → hand-written Alembic migration
  `0002_<slug>.py` with `down_revision="0001_accounts_tenancy"` (style: `alembic/versions/0001_accounts_tenancy.py`),
  run explicitly as a deploy step (`alembic upgrade head`).
- **Read-API template.** `server/app_api.py` is the exact pattern the read endpoints mirror:
  `Depends(require_user)`, `_load_scoped_project` (404 both missing & cross-tenant),
  `serialize_*` helpers, `get_accounts_service()`. Vocky's proven response shape:
  `{window:{start,end}, totals:{…}, daily_counts:[{day,…}], projects|credentials:[…]}`, default
  window = last 30 days, missing days zero-filled in Python.

## Resolved design (shared by all middle slices)

- **`usage_events` (durable Postgres, 7th control-plane table):** UUID PK; `tenant_id`
  (FK→`tenants`, `ondelete=CASCADE`, indexed); `project_id` (nullable FK→`projects`,
  `ondelete=SET NULL`, indexed); `event_type` (text — `document.created` | `document.deleted` |
  `search`); `occurred_at` (tz-aware, default `utc_now`). Index for windowed aggregates on
  `(tenant_id, occurred_at)` and `(project_id, occurred_at)`. Event-log grain.
- **Aggregate on read:** a `UsageService`/`UsageRepository` `get_usage_metrics(tenant_id, project_id?,
  window)` — a single grouped SELECT (`GROUP BY date(occurred_at)`, conditional counts per
  `event_type`), totals summed in Python, days zero-filled to a contiguous windowed series
  (bounded by the window, never by event volume). Mirrors vocky `feedback/repository.py`.
- **Metering:** best-effort, isolated transaction, never fails the request; covers **all** caller
  types (master / `vk_` / session) so tenant #1's own activity is counted. `last_used_at` stamp in
  the resolver.
- **Read API home:** a new `server/usage_api.py` router (mounted in `server/main.py` like
  `auth_api`/`app_api`), session-guarded, cross-tenant-safe (404).
- **Legacy/dormant parity:** with `DATABASE_URL` unset, metering is inert and `/api/*` stays
  byte-for-byte pre-P10 (the 65-test legacy regression must stay green).

## Decomposition — the four middle slices to create

The executor runs these `new-slice` calls (bare folders only; **no `plan.md`**). `P11.DECOMP` is
`order 0` and `P11.REVIEW` is `order 9999`, so orders 1–4 slot cleanly between them; REVIEW stays
final.

1. **`P11.S1` — Usage persistence + aggregate service** — `--kind implementation --risk medium --order 1`
   `usage_events` model + hand-written Alembic `0002_usage_events` migration; `Create*/*Record`
   types; `UsageRepository` (insert-event + the windowed GROUP-BY-day aggregate); `UsageService`
   (`record_event` best-effort + `get_usage_metrics`). No HTTP wiring yet. Medium: first durable
   schema since P10 + the aggregate query correctness.

2. **`P11.S2` — Metering hook (record on writes/deletes/search + wire `last_used_at`)** —
   `--kind implementation --risk medium --order 2 --depends-on P11.S1`
   Record `document.created` (201), `document.deleted` (2xx), `search` (2xx) best-effort; resolve
   project attribution (payload/filter name → project UUID, nullable fallback); wire
   `touch_credential_last_used` in `_resolve_tenant_bearer`. Owns the **sync→async** resolution
   (recommended: async middleware reading `request.state` + status). Medium: hot-path integration,
   best-effort semantics, legacy-mode/reindex must stay untouched.

3. **`P11.S3` — Usage read API** — `--kind implementation --risk medium --order 3 --depends-on P11.S1`
   `server/usage_api.py`: `GET /app/usage` (tenant-scoped) and `GET /app/projects/{id}/usage`
   (`_load_scoped_project`, 404 cross-tenant, + the project's credentials with `last_used_at`).
   Vocky response shape, 30-day default window, empty-tenant short-circuit. Mounted in `main.py`.
   Medium: cross-tenant 404 + serialization correctness (feeds P12).

4. **`P11.S4` — E2E usage smoke + verification** — `--kind implementation --risk low --order 4 --depends-on P11.S3`
   Extend `scripts/onboarding_smoke.py`: after tenant B writes a doc + searches, `GET /app/usage`
   (session) asserts `document.created ≥ 1` and `search ≥ 1`; `GET /app/projects/{id}/usage`
   asserts project-scoped counts + credential `last_used_at` present; cross-tenant — B's usage never
   reflects tenant #1's activity. Keep it lean, matching the file's argparse/collect-failures style.
   Low: mechanical extension of an established template (orchestrator may bump to mid if S3 leaves
   the response shape non-obvious).

`P11.REVIEW` already exists and is untouched by DECOMP; the phase review validates all slices
together and consolidates Doc-impact into new doc versions.

## What the DECOMP executor must do

1. Create `P11.S1–S4` exactly as above with `new-slice` (bare folders — **no `plan.md`**, no code).
2. Seed `phase.md`:
   - **Decomposition:** the four-slice table above with the S1→{S2,S3}→S4 dependency shape and risk
     rationale (why S4 is the only `low`).
   - **Findings & Notes:** the load-bearing research facts above — the metering seam
     (`_resolve_tenant_bearer`), the unwired `last_used_at`, the **sync→async wrinkle** and the
     recommended async-middleware resolution, the project-attribution wrinkle (master bearer has no
     `project_id`; derive from payload name), the "documents-saved totals already derivable"
     insight, and the persistence/Alembic/read-API templates with file:line pointers.
   - **Resolved decisions:** grain = event log; meter scope = writes+searches; retention = deferred;
     read shape = vocky's. (These become decisions.md ADRs at REVIEW.)
   - **Doc impact (running list to seed):** `data.md` (new `usage_events` table, event-log grain,
     retention-deferred); `api.md` (`/app/usage` + `/app/projects/{id}/usage`, additive
     control-plane reads); `backend.md` (metering seam + `usage_api.py`/`UsageService`, sync→async
     approach); `operations.md` (`0002` migration → `alembic upgrade head` deploy step, smoke
     extended); `decisions.md` (event-log-over-rollup, meter-writes+searches, derive-on-read,
     `last_used_at` wired); `security.md` (per-tenant usage, cross-tenant-404 on read).
   - **Constraints:** legacy/dormant parity (65-test regression green); metering never fails a
     request; frozen `/api/*` consumer contract untouched (metering is additive/side-effect only).
   - **Open questions** for the middle slices: exact metering mechanism (middleware vs per-handler);
     whether `event_type` is an enum/CHECK or free text; project-name→UUID resolution cost.
3. Return the structured verdict; do **not** commit, transition status, `defer-job`, or version docs.

## Orchestrator follow-ups (not the executor's job)

- After DECOMP finishes: file the **retention deferred job**
  (`defer-job --title "usage_events retention/cleanup job" --reason "event-log grows unbounded; observability-only + low volume so deferred until material" --trigger "usage_events growth becomes material / before high-volume tenants" --source P11.DECOMP`).
- Then plan `P11.S1` at the gate (plan mode on → operator approves each slice's plan before its
  executor runs), and proceed slice by slice to `P11.REVIEW`.

## Verification (for the DECOMP slice)

- `python3 scripts/workflow.py validate` — state integrity: S1–S4 exist as bare folders, orders sit
  between DECOMP and REVIEW, REVIEW is last, `depends_on` targets exist.
- `python3 scripts/workflow.py next` — should select `P11.S1`.
- `phase.md` carries the decomposition, findings, resolved decisions, and the Doc-impact list.
- No source files changed; no middle-slice `plan.md` created.
