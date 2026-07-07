---
title: "The Daily Ingestion Job That Kept Getting Stuck — Explained for Beginners"
date: 2026-07-07
tags:
  - ingestion
  - playwright
  - self-recovery
  - celery
  - incident-fix
source:
  project: changple5
  repo: /Users/sugang/projects/personal/changple5
---

# The Daily Ingestion Job That Kept Getting Stuck — Explained for Beginners

> This is an educational write-up of the **P32** work in the `changple5` project —
> hardening the daily content-ingestion schedule so one flaky web request stops
> jamming the whole pipeline. Written for a novice programmer — every piece of
> jargon is explained as it appears. The operational source of truth lives in the
> versioned doc-set (`docs/current/backend.md` and `docs/current/operations.md`,
> the new v0010/v0011 sections) and the incident post-mortems under
> `docs/reference/ingestiion_fail_ref/`. This file is a teaching companion, not the
> runbook.

Every night, `changple5` wakes up and asks a Naver café (a Korean community forum)
"what's the newest post?", then pulls in everything it hasn't seen yet. Three times
in about ten days, that job tripped over a single slow network request and got
*stuck* — not just failed, but stuck in a way that jammed every following night
too, until a human logged into the production database and repaired it by hand.
P32 is the set of changes that made the job pick itself back up. Let's walk through
what broke, why one failure could cascade into days of downtime, and the three
fixes that shipped.

## 1. The situation — one timeout, then silence for days

The relevant job is the **scheduled incremental ingestion** — "incremental" means
"just fetch what's new since last time," and "scheduled" means a timer fires it
automatically once a day (19:40 UTC, which is 04:40 in Korea). It's driven by
**Celery beat**, a background scheduler that's basically a cron clock for a Python
web app: every minute it checks "is a daily run due, and is it safe to start one?"

The first thing the job does is **discovery** — figure out the highest post id that
currently exists on the board, so it knows how far to catch up. That happens in
`discover_latest_post_id` in `apps/backend/ingestion/scraper.py`, which drives a
real headless browser (via **Playwright**, a library that automates Chrome) to load
the board's "latest posts" page and read the newest article number off it.

On three nights — production jobs `2440`, `2461`, and `2472`, spread over ten days —
that page load timed out. The post-mortem for job 2440 records the exact error:

```
Page.goto: Timeout 30000ms exceeded while navigating to
https://cafe.naver.com/f-e/cafes/29268355/menus/0?viewType=L, waiting for networkidle
```

Nothing was actually wrong with the code, the account, or the server — a read-only
smoke test two days later logged in fine and read live post id `55877`. It was a
**transient** failure: a one-off slow response that would have worked on a retry.
But there was no retry, so the job died. And then the daily schedule went quiet for
days. That second part — the *stuck*, not the *failed* — is the real story.

## 2. The cause — why one failure blocked every future night

To see why a single timeout could freeze the schedule, you need three moving parts.

- An **IngestionJob** is one run of the pipeline — it has a `status` like `running`,
  `failed`, or `completed`.
- An **IngestionAutomaticRun** is the *scheduler's* record of a nightly attempt. It
  points at the job it launched (`active_job`) and tracks which **stage** the
  pipeline reached (`scrape`, then later enrichment stages). If a job dies, its run
  goes to a status called **`needs_attention`** — a deliberate "a human should look
  at this" flag.
- Before starting a new nightly run, the scheduler calls
  `get_blocking_automatic_run` (in `apps/backend/ingestion/automatic_runs.py`). If
  *any* run is currently `running` or `needs_attention`, that function returns it,
  and the scheduler refuses to start tonight's run — the sensible rule "don't start
  a second run while one is still unresolved."

Here's the trap, drawn as a flow:

```
  night 1: discovery times out
      │
      ▼
  IngestionJob 2440  ──────────────►  status = failed  (0 items scraped)
      │
      ▼
  IngestionAutomaticRun 44  ─────────►  status = needs_attention, stage = scrape
      │
      ▼
  ┌──────────────────────────────────────────────────────────────┐
  │  night 2, 3, 4 … Celery beat ticks, calls                     │
  │  get_blocking_automatic_run() → finds run 44 still            │
  │  needs_attention → returns it → tonight's run is SKIPPED   ★  │
  └──────────────────────────────────────────────────────────────┘
```

The ★ line is the cascade. Run 44 never went away on its own, so it blocked every
subsequent night. Why didn't anything clean it up? There *was* a self-healing sweep
already — `_resolve_stale_scheduled_incremental_blockers` in `schedules.py` — but it
only rescued jobs still in a live state (`pending`, `queued`, `running`). A job that
had already *finished* as `failed` was terminal; the sweep never looked at it. So the
run it left behind sat in `needs_attention` forever, and the only cure was a human
running a guarded database edit in production — three times.

> The dangerous bug wasn't the timeout — it was that a *recoverable* failure had no
> recovery path, so it silently escalated into a *blocking* one.

## 3. The three fixes

P32 attacked this on three fronts. The first stops the timeout from failing the job
at all; the second makes sure that *if* a job still dies this way, the schedule
un-jams itself; the third reduces how often the fragile step even runs.

| Fix | File | What it does | Failure it prevents |
|---|---|---|---|
| **S1 Discovery hardening** | `ingestion/scraper.py` | Retry discovery 3×; use a lighter page-load wait | A single transient timeout killing the job |
| **S2 Self-recovery** | `ingestion/schedules.py` | Auto-clear a run stuck by *this exact* failure shape | A dead job blocking every future night |
| **S3 Session persistence** | `ingestion/scraper.py` + compose | Reuse a saved login instead of re-logging-in each job | Extra fragile login round-trips (and bot-detection risk) |

### 3.1 S1 — retry the flaky step, but fail loudly if it truly won't work

`discover_latest_post_id` now wraps the actual work in a retry loop:

```python
for attempt in range(1, self.config.retry_count + 1):   # retry_count = 3
    try:
        return self._discover_latest_post_id(self._browser, self._storage_state)
    except Exception as error:
        last_error = error
        logger.warning("discover_latest_post_id attempt %d/%d failed: %s", ...)

logger.error("discover_latest_post_id exhausted %d attempt(s); re-raising last error", ...)
assert last_error is not None
raise last_error
```

Three attempts turn a one-off blip into a non-event. But notice the last line: on
exhaustion it **re-raises** — it throws the error back up and lets the job fail.

That's a deliberate contrast with a sibling method, `extract_post`, which pulls a
*single* post's content. When `extract_post` gives up after its retries, it returns
a **skip dict** — a small dictionary like `{"skip_reason": "parse_error", …}` — so
the pipeline records "couldn't read post 12345, moving on" and keeps going. That's
fine for one post out of thousands. But discovery has no such per-item escape hatch:
if you can't find the *latest post id*, you don't know how far to catch up, and
quietly returning "nothing new" would silently stall the whole catch-up frontier.
So discovery must **fail loudly** (raise) rather than fail silently (return a skip).
Getting that distinction right was the whole judgment call of S1.

The second half of S1 changes *how* the page load waits. The old code used
`wait_until="networkidle"` — Playwright jargon for "wait until the network has been
quiet for 500ms." On a chatty page full of trackers and ads, the network is *never*
quiet, so that wait leans on the full 30-second timeout and is exactly what kept
tripping. The new code uses `wait_until="domcontentloaded"` — "wait until the HTML
document is parsed," a much earlier and more reliable milestone. It's safe here
because the code doesn't trust the page to be "done" anyway: right after the load it
polls for up to 12 seconds, re-reading the candidate article ids until one appears:

```python
page.goto(LATEST_POSTS_URL, wait_until="domcontentloaded")
deadline = time.time() + 12
while time.time() < deadline:
    ...  # read candidate ids; return as soon as one parses
    page.wait_for_timeout(500)
```

### 3.2 S2 — let the schedule heal itself, but only for this exact failure

S2 adds a second sweep, `_resolve_terminal_failed_automatic_run_blockers`, and calls
it in `evaluate_scheduled_incremental_schedule` **right before**
`get_blocking_automatic_run` — so on the very next nightly tick, the stuck run is
cleared *before* the code checks whether anything is blocking:

```python
terminal_failed_run_ids = _resolve_terminal_failed_automatic_run_blockers(now=current_time)
...
blocking_automatic_run = get_blocking_automatic_run()   # now sees the cleared run
```

The scary part of auto-clearing anything is clearing something that *genuinely* needs
a human. So the new sweep is deliberately paranoid: it only touches a run that matches
the incident's fingerprint on **every** guard. It selects runs that are
`needs_attention` at `stage = scrape`, then for each one checks in Python:

```python
if job is None:                                              continue
if job.status != IngestionJob.Status.FAILED:                continue   # job really is dead
if job.job_type != IngestionJob.JobType.SCHEDULED_INCREMENTAL: continue # it's the nightly job
if job.automatic_run_id != run.pk:                          continue   # they point at each other
if job.items.exists():                                      continue   # scraped ZERO items
```

Only a run whose job died *at the scrape stage, as the scheduled nightly job, having
saved nothing* gets cleared. A run that failed later (say, mid-enrichment), or one
that actually pulled some posts before dying, is left alone for a human — because
those shapes might mean real, partial, ambiguous state. The clear itself is a
**race-safe filtered update** — instead of "load the row, change it, save it" (which
can clobber a concurrent change), it does a single conditional write:

```python
updated = IngestionAutomaticRun.objects.filter(
    pk=run.pk, status=NEEDS_ATTENTION      # only if it's STILL needs_attention
).update(status=FAILED, error_message=message, updated_at=now)
```

The `filter(... status=NEEDS_ATTENTION)` in the same statement means "only flip it if
nobody else already changed it." Because this runs inside the same database
**transaction** (an all-or-nothing block) that then re-checks the blocker, the freed
schedule proceeds the same night — no extra plumbing, no waiting for tomorrow.

### 3.3 S3 — stop logging in from scratch every single job

Separately, the operator noticed the scraper does a full typed-username-and-password
Naver login at the start of *every* job. Each login is another fragile multi-step
browser round-trip against a site that actively watches for bots — more chances to
time out, more chances to trip a captcha. S3 makes the login **persistent**: save it
once, reuse it.

The mechanism is Playwright's **`storage_state`** — a JSON blob of cookies and local
storage that captures "you are logged in." When a scraper session opens, it now calls
`_restore_or_authenticate`:

```
  session start
      │
      ▼
  _try_restore_session()  ── read saved storage_state file
      │                      load it into a browser, poll ~8s for "am I really logged in?"
      │
      ├── markers present ──►  re-save the refreshed session,
      │                        log "Restored persisted Naver session from …",  return it  ★
      │
      └── missing / invalid / any error ──►  return None (never raises)
                                              │
                                              ▼
                                   authenticate()  ── full credential login (unchanged),
                                                      then save the fresh session
```

The ★ path is the fast, reuse path. The key design rule is that **restoring is
non-fatal**: `_try_restore_session` catches every failure and returns `None`, so a
stale or corrupt saved session can never crash a job — it just falls back to the old
credential login. That's contrasted with the credential path's *own* validation,
`wait_for_login_session`, which stays **fatal** on purpose (it raises
`"Login session did not fully settle before scraping"` after 20 seconds) — if a human
credential login genuinely can't establish a session, that *should* stop the job.
Both paths share one helper, `_has_live_session_markers`, that checks for logged-in
signals (specific cookies and on-page markers).

Three more details worth their weight:

- **Exactly one mechanism.** Playwright offers two ways to persist a login:
  `storage_state` (just the cookie/state blob) or `launch_persistent_context` (a whole
  on-disk browser profile). The operator's rule was "ship one, never both" — S3 ships
  only `storage_state`, with credential login as the always-present safety net.
- **Atomic writes under concurrency.** The Celery worker runs with `--concurrency=2`
  (two jobs at once), so two jobs could try to save the session file simultaneously.
  `_persist_storage_state` writes to a uniquely-named temp file and then does
  `os.replace(tmp, path)` — an **atomic rename**, an OS guarantee that readers see
  either the whole old file or the whole new file, never a half-written one. And like
  restore, it never raises.
- **Where the file lives.** It's stored on a **named volume** (a Docker-managed disk
  that survives container restarts) called `scraper_state`, mounted at
  `/workspace/scraper-state`, with the path set by `SCRAPER_STORAGE_STATE_PATH`
  (default `/workspace/scraper-state/naver-session.json`). The volume is deliberately
  mounted only on the services that actually scrape (`celery_worker`, and
  `django_backend` for admin smokes) — never on `celery_beat`, which only keeps time.
  Resetting is easy: delete the file and the next job logs in fresh and re-seeds it.

## 4. How it shipped — the two-round deploy handshake

One more thing worth learning from P32 is *how* it reached production, because the
bug only ever happened in production and couldn't be reproduced on demand. The work
was run as a governed **phase** (the project tracks work as phases and slices), and
the final slice, `P32.S4`, was an **operator co-work** step — meaning a human has to
do part of it, because pushing code and approving a production deploy are
human-only actions. It used a **two-round** pattern:

1. **Round 1 (the agent):** run read-only pre-flight checks — confirm exactly which
   commits ship, that there are no database migrations, that the compose files parse —
   then write a paste-ready **handoff package** telling the operator precisely what to
   do, and stop.
2. **The operator:** pushes the commits, runs the "Production Deploy" workflow, and
   approves the production gate.
3. **Round 2 (verification):** confirm the site is healthy with public **smoke tests**
   (quick `curl` checks that `/`, `/api/health`, `/agent-api/health` all return
   healthy), and confirm the fixes are actually live. Because the machine running the
   checks can't SSH into the production host, the operator's own report — plus one
   specific log line, `"Restored persisted Naver session from …"`, appearing on the
   *second* night after deploy — stands in as evidence that S3's session reuse works.
   (S1's retry can't be directly observed, since you can't summon a real transient
   timeout on command; it's covered by unit tests instead.)

The operator reported **"p32 verified"** after the nightly runs came back clean, and
the phase closed.

## Mini-glossary

- **Ingestion** — the pipeline that pulls new café posts into the app's database.
- **Scheduled incremental job** — the once-a-day run that fetches only what's new.
- **Celery beat** — the background scheduler (a cron-like clock) that fires the daily job.
- **Playwright** — a library that drives a real headless browser to load and read pages.
- **`page.goto(..., wait_until=...)`** — load a URL and wait for a milestone; `networkidle`
  (network quiet 500ms) is fragile on busy pages, `domcontentloaded` (HTML parsed) is earlier and reliable.
- **Discovery** — the first step of the job: find the highest existing post id.
- **IngestionJob** — one execution of the pipeline, with a `status` (`running`/`failed`/…).
- **IngestionAutomaticRun** — the scheduler's record of a nightly attempt; goes to
  `needs_attention` when its job dies.
- **`needs_attention`** — a status meaning "a human should look at this"; it blocks new runs.
- **Terminal state** — a final status (like `failed`) that won't change on its own.
- **Skip dict** — a small dictionary a step returns to say "couldn't handle this one item, moving on."
- **Re-raise** — throw an error back up to fail loudly, instead of swallowing it.
- **Filtered update** — a single conditional database write (`filter(...).update(...)`) that avoids clobbering concurrent changes.
- **Transaction** — an all-or-nothing block of database work.
- **`storage_state`** — Playwright's saved cookies/state that represent "logged in."
- **Atomic rename (`os.replace`)** — swap a file in one step so readers never see a half-written file.
- **Named volume** — a Docker-managed disk that outlives container restarts.
- **`--concurrency=2`** — the Celery worker runs two jobs at once (why writes must be atomic).
- **Operator co-work** — a step needing a human for actions (push, deploy-approve) an agent can't take.
- **Smoke test** — a fast check that a deployed service is up and responding.
