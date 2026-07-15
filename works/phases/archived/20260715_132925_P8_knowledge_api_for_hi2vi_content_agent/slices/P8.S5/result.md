# Result — P8.S5: E2E acceptance (first hi2vi write → push → Pages → live; search under auth)

**Verdict: PASS — all six acceptance assertions green against the LIVE public endpoint.**
Publish-on-write is proven end to end: `https://knowledge.hi2vi.com` accepted a real
write, committed it, pushed it to `main`, GitHub Pages deployed it through the
`site_smoke.py` gate, and the document is **publicly live 65 seconds after the POST
returned**. This is the phase's core capability working for the first time in
production — the box had never actually pushed a commit before this slice.

## The published document (a real, public artifact)

- **Live URL:** <https://leetusik.github.io/knowledge/hi2vi/2026-07-14-the-hi2vi-research-space/>
- `rel_path`: `hi2vi/2026-07-14-the-hi2vi-research-space.md` · `id`: 7 · `project`: `hi2vi`
- Tags: `hi2vi`, `knowledge-base`, `research`, `content-agent` · `source_repo`: `hi2vi_web`
- **Commit:** `383577eab0ef335ee538607d157dc3823e8f05a3` — *"docs(hi2vi): add the-hi2vi-research-space"*

Content is an honest inaugural note for the research space: what `docs/hi2vi/` holds,
how documents arrive (the agent POSTs → the API writes + indexes + commits + pushes →
Pages publishes, no human in the loop), the dated-snapshot/`related` convention, and how
to read/search the corpus. ~400 words. It is explicitly distinguished from the
engineering explainers in `docs/hi2vi_web/`. **Leak-scanned before sending** (assertion
below): no token, no `/opt/*` box path, no container/network names, no API hostname, no
key material. `slug` and `date` were set explicitly (not defaulted) so the duplicate-POST
test in assertion 6 had a deterministic `rel_path` to collide with.

## Assertions — each with its evidence

### 1. 201 with `pushed: true` — PASS

`POST /api/documents` → **HTTP 201** in 5.83s. Response (verbatim, key order as
`contract.md` froze it):

```json
{"id":7,"rel_path":"hi2vi/2026-07-14-the-hi2vi-research-space.md",
 "url":"https://leetusik.github.io/knowledge/hi2vi/2026-07-14-the-hi2vi-research-space/",
 "title":"The hi2vi Research Space","project":"hi2vi","slug":"the-hi2vi-research-space",
 "date":"2026-07-14","tags":["hi2vi","knowledge-base","research","content-agent"],
 "related":[],"recent_updated":true,"landing_created":true,"committed":true,
 "commit_sha":"383577eab0ef335ee538607d157dc3823e8f05a3","pushed":true}
```

**`pushed: true`** — not merely `committed: true`. **No `push_error`, no `commit_error`.**
`landing_created: true` confirms P7.F1's auto-landing fired for the brand-new `hi2vi`
project. `url` is under the Pages origin (`KB_PUBLIC_BASE_URL` correctly set to the Pages
site, not the API origin). This is the assertion P8.F2 warned about — a best-effort push
would have returned an identical-looking 201 with `pushed:false` had the `openssh-client`
fix not landed.

### 2. The commit is really on `main` (verified at GitHub, not the box) — PASS

```
gh api repos/leetusik/knowledge/commits/main --jq .sha
  → 383577eab0ef335ee538607d157dc3823e8f05a3      # == the response's commit_sha
```

Commit tree — exactly three files, the scoped commit doing precisely what it should:

| status | file |
|---|---|
| added | `docs/hi2vi/2026-07-14-the-hi2vi-research-space.md` (the doc) |
| added | `docs/hi2vi/index.md` (the P7.F1 auto-landing) |
| modified | `docs/index.md` (the Recent bullet) |

Parent is `4eb85d5` — the exact pre-write baseline → a clean fast-forward, **no clobber,
no `-A` sweep** (the box clone held no other stray changes to sweep in, and none appear).
Commit author is the server identity `kb-api <kb-api@localhost>`.

### 3. Pages deploy runs and passes the `site_smoke.py` gate — PASS

Both workflows triggered by the push concluded **success**:

| run | workflow | conclusion |
|---|---|---|
| 29342484368 | `pages` | **success** (46s: 14:48:04Z push → 14:48:50Z deployed) |
| 29342484543 | `plugin parity` | **success** (F1/F2 parity held) |

The `pages` run's `python3 scripts/site_smoke.py` step passed — i.e. the auto-created
`docs/hi2vi/index.md` satisfied the per-project `site/hi2vi/index.html` deploy-gate
invariant. **The first write to a brand-new project did not break the site build** —
exactly the property P7.F1 was built to guarantee, now proven end to end rather than
argued. (Only annotations were Node-20 deprecation warnings, unrelated and pre-existing.)

### 4. The doc is live on the public site — PASS

`GET https://leetusik.github.io/knowledge/hi2vi/2026-07-14-the-hi2vi-research-space/`
→ **HTTP 200 on the first poll, 14:49:09Z — 65s after the POST returned.**
`<title>The hi2vi Research Space - Knowledge Base</title>`; body contains the doc's prose
("dated snapshots", "The corpus is meant to compound, not to repeat itself.").
The auto-created project landing `https://leetusik.github.io/knowledge/hi2vi/` → **200**.

### 5. Read-back under auth; 401 without — PASS

| check | result |
|---|---|
| `GET /api/search?q=hi2vi research space` **+ bearer** | **200**, `mode: hybrid`, new doc is the **#1 hit** |
| — its signals | `{bm25: 6.4706, recency: 1.0, vector: 0.716681}` |
| semantic-only query (no keyword overlap): `q=how does the content agent avoid repeating research` | **200**, new doc **top hit** |
| `GET /api/search` **without** bearer | **401** `{"detail":"missing or invalid bearer token"}` |
| `GET /api/search` with a **wrong** bearer | **401**, same body |
| `GET /api/documents/by-path/hi2vi/2026-07-14-...md` + bearer | **200**, full doc incl. `markdown` |
| `POST /api/documents` **without** bearer | **401** (write auth unaffected by the read-auth flag) |
| `GET /healthz` (no bearer) | **200**, `documents: 7` (was 6) — deliberately open |

The doc was **indexed *and* embedded in the same request that wrote it**: the `vector`
signal is present on the very first search, and a query sharing *no* keywords with the
title still ranks it first — hybrid search is genuinely live on the box, not a
BM25-only degradation. 401 bodies match `contract.md` byte for byte.

### 6. Duplicate-POST semantics — PASS

Re-POSTing the identical payload → **HTTP 409**, exactly the frozen shape (the DB-row
case, so `id` + `existing_title` are present as `contract.md` predicts):

```json
{"detail":{"message":"document already exists at hi2vi/2026-07-14-the-hi2vi-research-space.md",
 "rel_path":"hi2vi/2026-07-14-the-hi2vi-research-space.md","id":7,
 "existing_title":"The hi2vi Research Space"}}
```

**No second commit:** `main` HEAD still `383577e`; exactly one new commit exists since the
`4eb85d5` baseline. This validates the client's documented retry rule — a
409-after-timeout means *already written*, safe to treat as success and read back via
`by-path` (which assertion 5 proves works).

## Post-run state (nothing left dirty)

Box clone `/opt/knowledge` after the push: `HEAD == origin/main == 383577e`, working tree
**clean**, **no `.git/rebase-merge` / `.git/rebase-apply` leftovers** — the S1
fetch→rebase→push discipline completed cleanly under real conditions (its rebase-abort
safety net was never needed; nothing to unwind). Container logs over the window show only
the expected sequence — `201 Created`, the reads, `409 Conflict`, `401 Unauthorized` — no
errors, no stack traces, no `push_error`.

**This repo:** I ran no `git commit`/`git push` and hand-edited no `docs/`, `server/`, or
`deploy/` file — the doc was created *only* through the API, exactly as hi2vi's agent
will. My local clone is behind `origin/main` by exactly the 1 commit the API pushed
(`git rev-list --left-right --count HEAD...origin/main` → `0  1`); the orchestrator
reconciles. Box config untouched (read-only diagnosis only; no restarts, no edge changes).

## Validation commands

| command | outcome |
|---|---|
| `POST /api/documents` (live, bearer) | **201**, `pushed:true`, `landing_created:true` |
| `gh api repos/leetusik/knowledge/commits/main --jq .sha` | `383577e…` == response `commit_sha` |
| `gh api …/commits/383577e… --jq '.files[]'` | 3 files: doc + `hi2vi/index.md` + `index.md` |
| `gh run watch 29342484368 --exit-status` | **success** (`pages`, incl. `site_smoke.py`) |
| `gh run list --commit=383577e…` | `plugin parity` → **success** |
| `curl <Pages url>` | **200**, title + body present (65s after POST) |
| `curl /api/search + bearer` | **200** `mode:hybrid`, new doc #1 (`vector` signal present) |
| `curl /api/search` (no bearer / bad bearer) | **401** ×2 |
| `curl /api/documents/by-path/… + bearer` | **200**, full markdown |
| re-`POST` identical payload | **409**, no second commit |
| `python3 scripts/workflow.py validate` | **passed** |

## Deviations from plan.md

**None material.** Two within-intent choices worth naming:

1. **`date` + `slug` set explicitly** rather than defaulted, so assertion 6's duplicate
   POST had a deterministic `rel_path` to collide with. (Defaults would have produced the
   same values — box TZ is `Asia/Seoul`, and the slug is `slugify(title)`.)
2. **Assertions widened** beyond the plan's six: added write-without-bearer → 401, healthz
   still open, a semantic-only search query (to prove the `vector` signal rather than
   assume it), a `by-path` read-back (the contract's documented 409-recovery path), and a
   post-run box-cleanliness check (no rebase leftovers). All additive; none weakened.

## Observation for the review (not a defect, not blocking)

The publish commits are authored `kb-api <kb-api@localhost>` — a placeholder identity now
visible in a **public** repo's history. It is pre-existing (the `Dockerfile`'s git
identity, unchanged by P8) and harmless, but every future agent-published doc will carry
it. If the operator wants agent commits attributable (e.g. `kb-api@hi2vi.com`) that is a
one-line `Dockerfile`/env change — worth a deferred job rather than a P8 fix.

## Doc impact (for P8.REVIEW — recorded in phase.md, not versioned here)

- **`qa.md`** — the E2E acceptance procedure for the hosted endpoint, and the lesson
  **assert `pushed:true`, never just the 201** (a best-effort push means a broken publish
  chain returns an identical-looking success).
- **`operations.md`** — `https://knowledge.hi2vi.com` is **validated end to end in
  production**: write → commit → push → Pages deploy (`site_smoke` gate) → publicly live
  in ~65s; hybrid search + read-auth confirmed live on the box.
