---
title: "Measure First, Then Cache — The P39 Performance Phase Explained for Beginners"
date: 2026-07-07
tags:
  - performance
  - caching
  - redis
  - django
  - measurement
related:
  - changple5/2026-07-07-the-p35-agent-refactor-explained-for-beginners.md
source:
  project: changple5
  repo: changple5
---

# Measure First, Then Cache — The P39 Performance Phase Explained for Beginners

> This is an educational write-up of the **P39 performance phase** in the changple5 project (the app behind `miracle.changple.ai`). Written for a novice programmer — every piece of jargon is explained as it appears. The operational source of truth lives in the versioned docs (`docs/current/operations.md`, `docs/current/backend.md`, `docs/current/architecture.md`) and the durable measurement artifact `docs/reference/perf/p39-baseline.md`. This file is a teaching companion, not the runbook.

## 1. What it is

P39 was a **performance phase**: a chunk of work whose only goal is to make the existing software *faster* without changing what it does. No new buttons, no new features — the app behaves exactly the same, it just responds quicker.

Two words you'll see constantly. **Latency** is the delay between asking the software to do something and getting the answer — measured in milliseconds (ms) or seconds. **TTFB** (**time to first byte**) is one specific latency: how long the server takes to send back the very first byte of its response after a request arrives. Lower is better for both.

The phase had one iron rule: **every change had to be justified by a before-and-after measurement.** Not "this looks slow, let me speed it up" — but "I measured 196 milliseconds, I changed one thing, I measured 7 milliseconds, here is the proof." A pleasant surprise falls out of that rule: sometimes you measure, discover the thing is already fast enough, and the correct action is to *change nothing* — and that counts as a successful outcome too (more on that in §4).

The headline results, in one breath:

- The slowest admin dashboard endpoint dropped from **196.8 ms to 7.4 ms** — about 96% faster.
- Asking the AI the *same question twice* went from **~2,284 ms to ~5 ms** on the repeat — roughly 466× faster — by remembering the first answer.
- The app's visible behavior did not change at all. It is the same app, faster.

## 2. Why it exists in this project

The changple5 codebase is a **monorepo** (one repository holding several separate programs) with three apps that talk to each other: a **Next.js** web frontend (what the browser shows), a **Django** backend (the main business/database server), and a **FastAPI** agent (the AI chat service). They sit behind **nginx**, a traffic-routing gateway.

Just before P39, three earlier phases cleaned up each app one at a time — P34 (backend), P35 (agent), P36 (web). While cleaning, each one kept spotting things that were *slow* but that also touched more than one app, so they couldn't be fixed in a single-app cleanup. Rather than fix them piecemeal, the team wrote each down as a "candidate" and deferred it. **P39 is the convergence point** — the phase where all those cross-app performance candidates finally get measured and fixed together.

The operator (the person directing the work) framed it simply: *"no redesign… refactoring, performance wide, dead code, and ux improvement,"* and, on where the speed-ups should come from, *"maybe more use redis and stuff."*

That last hint matters. **Redis** — an in-memory data store, essentially a giant, blazing-fast dictionary that lives in RAM instead of on disk — was *already running* in the stack. But it was only being used as a message queue for background jobs and as scratch storage for the AI agent. It was never used as a **cache** (a place to stash the result of expensive work so you can hand it back instantly next time instead of recomputing it). P39's biggest lever was putting that idle Redis to work as a cache.

**But who does the measuring believe?** Here's the subtle part. The developer's laptop has a tiny copy of the database; production has a huge one. A query that's fast on 12 rows locally can be catastrophic on 12 million rows in production. So P39 refused to trust wall-clock time alone. Instead it leaned on **volume-independent evidence** — signals that reveal the *shape* of the cost regardless of how much data you have locally: how many database queries a request fires, and how many memory pages the database has to read (its "buffer hits"). If a request fires 28 queries, that's 28 queries whether you have 12 rows or 12 million; fixing it to 10 is a real, portable win.

## 3. How it works here

### What does the stack look like?

```
        browser
           |
        [ nginx ]  ── routing gateway
        /   |   \
   Next.js Django FastAPI-agent
    (web)  (API)    (AI chat)
              \   |   /
        ┌───────────────────┐
        │ postgres  redis  celery
        └───────────────────┘
                    |
   ★ redis = ONE server, split into 3 logical databases:
        db/0  Celery jobs + agent scratch registries
        db/1  Django cache            (new in P39)
        db/2  agent retrieval cache   (new in P39)
```

The starred line is the heart of the phase. There is only **one** Redis process running, but Redis lets you carve it into numbered **logical databases** (db/0, db/1, db/2) that don't see each other's keys. P39 assigned each app its own numbered slot so their data can never collide — explained just below.

### How do you measure a whole stack?

The first slice of the phase (P39.S1) built a small **measurement harness** — a set of scripts, in `scripts/perf/`, that pokes the running system and records timings. It deliberately uses only Python's standard library (no new dependencies to install). It records a **warm median** TTFB for each endpoint: hit the endpoint several times so caches and connections are "warm" (already primed, not cold on the first hit), then take the median (middle value) so one unlucky slow request doesn't skew the number.

The result was saved as a durable **baseline** — a snapshot of "how fast everything was *before* we touched anything" — at `docs/reference/perf/p39-baseline.md`. Every later fix is measured against that baseline. The loop for each fix was:

1. Read the baseline number for this endpoint.
2. Make one focused change.
3. Re-measure the same way.
4. Keep the change only if the number actually improved; record both numbers.

The baseline also revealed something worth knowing: the AI chat's "streaming" (text appearing word-by-word) is partly cosmetic — the agent generates the *whole* answer first (~9 seconds), then chops it into a few chunks over ~280 ms. So the time you wait is dominated by thinking, not by the streaming plumbing. That finding steered the phase away from touching streaming and toward caching repeated work instead.

### Why three Redis databases?

Because a **cache** needs a "wipe everything" button — `cache.clear()` — and you must guarantee that button can *only* wipe the cache, never the live job queue or the agent's working state. Numbered logical databases give exactly that isolation:

| Logical DB | Who owns it | What lives there |
|---|---|---|
| **db/0** | Celery + agent | Background-job queue and the agent's scratch registries (unchanged since before P39) |
| **db/1** | Django backend cache | Cached admin-dashboard payloads; every key is prefixed `backend:` |
| **db/2** | Agent retrieval cache | Cached AI search results and embeddings; every key is prefixed `agent:cache:` |

A **key prefix** is a namespace tag glued to the front of every key an app writes, so you can tell at a glance whose data it is. The isolation was *proven*, not assumed: clearing db/1 left db/0's ~1,800 keys completely untouched.

Here is the actual Django cache configuration that was added (`apps/backend/config/settings.py`):

```python
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": DJANGO_CACHE_URL,   # points at Redis db/1
        "KEY_PREFIX": "backend",
    }
}
```

Before P39 this block didn't exist — Django had no cache at all. Adding it is what made db/1 a cache.

### What actually got faster?

Five concrete fixes landed, each with its before/after number:

| Fix | Before → After | What actually changed |
|---|---|---|
| Operator overview | 28 → 10 database queries; 20.6 → 6.9 ms | Collapsed a **query fan-out** (one request firing many small queries) into a few combined ones, then cached the result |
| Ingestion summary | 196.8 → 7.4 ms | Cached the assembled dashboard payload in Redis (the biggest single win, 96% faster) |
| Session search | buffer hits 352,446 → 5,826 | Rewrote the SQL: a correlated `Exists()` check instead of a join that multiplied rows and forced expensive de-duplication |
| Agent → backend calls | 4.52 → 0.60 ms per call | **Connection pooling** — reuse one open HTTP connection instead of opening a fresh one every call |
| Repeated AI retrieval | 2,283.9 → 4.9 ms | Cache the whole search result so an identical question skips the embeddings and the reranking AI call entirely |

A few of those in plain terms. **Query fan-out** is when handling one web request quietly triggers dozens of separate trips to the database — each trip cheap, but the pile-up is slow; combining them into fewer, larger queries fixes it. **Buffer hits** count how many chunks of memory the database had to inspect to answer a query — 352,446 down to 5,826 means the new query examines ~98% less data, and that saving grows *larger* in production where the tables are bigger. **Connection pooling** means keeping a network connection open and reusing it, instead of paying the setup cost (a few milliseconds) on every single call.

### When does cached data go stale?

Caching is a bargain: you trade freshness for speed. If you remember an answer, you might hand back a slightly old copy. P39 controlled that with a **TTL** (**time to live**) — an expiry timer on each cached entry. Two classes:

- **poll TTL ≈ 20 seconds** — for admin dashboards that get polled constantly; being up to 20 seconds stale is harmless there.
- **read TTL ≈ 300 seconds (5 minutes)** — for the AI's retrieval results, since the underlying corpus only changes about daily.

Invalidation (getting rid of stale data) is **TTL-expiry-first**: the phase does not try to surgically delete entries when data changes; it just lets them expire. Simpler, and there was no case where a few seconds of staleness would be an actual bug. The agent's db/2 cache adds two safety features, visible in its constants (`apps/agent/app/retrieval/cache.py`):

```python
RETRIEVAL_CACHE_DB = 2
RETRIEVAL_CACHE_KEY_PREFIX = "agent:cache:"
_RANKED_SCHEMA_VERSION = 1
_DEFAULT_TTL_SECONDS = 300
```

It is **fail-open** — if Redis is unreachable, a cache read is simply treated as a **miss** (not found) and the code computes the answer the normal way; the cache never becomes a point of failure. And it is **schema-versioned**: `_RANKED_SCHEMA_VERSION` tags each stored blob, so if a future deploy changes the result shape, the old blobs are read as misses and recomputed rather than deserialized into garbage.

## 4. Trade-offs and alternatives

The most distinctive thing about P39 is what it *didn't* do — and recorded as a deliberate, measured decision:

- **Preferred-content endpoint** — flagged as possibly slow, but a live check against production showed it returns **zero rows**. There was nothing to speed up. Recorded as a measured non-action; a fix would have been wasted effort against a problem that doesn't exist.
- **Explicit Gemini context caching** — a paid feature of the AI provider. Measured to have *negative* return on investment at the current low request volume; skipped so as not to add cost and complexity for no gain.
- **Batch-API backfill** — leaving it as direct calls was deliberate: switching to batched calls would subtly change *when* results arrive, which counts as a behavior change, and P39's contract was "faster, not different."
- **Trigram search index** — a real optimization, but low return for an admin-only, low-traffic search; the cheaper SQL rewrite captured most of the win without a risky database migration.

> The lesson in one sentence: measuring first meant half the wins were changes made — and the other half were changes *proven unnecessary*, which is just as valuable because it spends no complexity you'll have to maintain forever.

The phase also accepted a few honest costs, each written down:

- **Redis is now a harder dependency.** With the old setup, cache operations couldn't fail. Now, if Redis is down, a Django cache read/write *raises an error*. Accepted because Redis was already required for background jobs — it's not a *new* dependency, just a wider one.
- **Rate-limit counters are now global.** Login-throttle counters used to live in each server worker's private memory; moving to shared Redis means they're now enforced across all workers at once — slightly stricter, but that's the more correct behavior.
- **Tests needed two new fixtures.** A shared cache doesn't roll back between tests the way a database transaction does, so the test suite got an automatic `cache.clear()` before each test. And the reused HTTP client binds to one event loop, so the agent tests got a reset fixture. Both are one-time plumbing costs of moving from private to shared resources.

Finally, the honest limit: the AI's ~9-second time-to-first-text is a *generate-then-chunk* architecture, not a plumbing problem. Caching helps when the same question is asked again, but genuinely restructuring how answers stream was out of scope for a behavior-preserving phase. P39 sped up the repeat; the first-ask latency is a problem for another day.

## Mini-glossary

- **Performance phase** — a unit of work aimed only at making existing software faster, with no change to behavior.
- **Latency** — the delay between a request and its response, usually in milliseconds.
- **TTFB (time to first byte)** — how long the server takes to send the first byte of a response.
- **Warm median** — a timing taken after the system is primed, then the middle value of several runs, to avoid one-off noise.
- **Cache** — stored result of expensive work, handed back instantly instead of recomputing.
- **Cache hit / miss** — a "hit" is finding a usable stored answer; a "miss" means it wasn't there and must be computed.
- **TTL (time to live)** — an expiry timer on a cached entry; after it, the entry is discarded.
- **Redis** — an in-memory key/value store used here for job queues and caching.
- **Logical database** — one of Redis's numbered, isolated slots (db/0, db/1, …) that don't see each other's keys.
- **Key prefix** — a namespace tag on every key an app writes (e.g. `backend:`), so ownership is obvious.
- **Query fan-out** — one request quietly firing many separate database queries.
- **Buffer hits** — how many memory pages the database inspected to answer a query; a proxy for query cost that doesn't depend on local data size.
- **Connection pooling** — reusing an open network connection across calls instead of opening a fresh one each time.
- **SSE (server-sent events)** — the one-way streaming channel that delivers the AI's answer to the browser chunk by chunk.
- **Fail-open** — designed so that when a helper (here, Redis) is unavailable, the system falls back to working correctly (just slower) rather than breaking.
