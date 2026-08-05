# Result — P24.REVIEW (phase review: upload finish-return timeout)

**Verdict: `changes_requested`** — the engineering objective is fully met and every
gate is green, but the phase removed the only in-band signal of push health
(`pushed:true` / `push_error`) without replacing the operator-facing procedure that
depends on it. One small fix slice closes it. **No doc versions were created** (the
review stops before doc work on a non-passing verdict).

## 1. Validation — everything run, everything green

| Command | Outcome |
|---|---|
| `.venv/bin/python -m pytest -q` (repo root, no Postgres) | **PASS** — 83 passed, 32 skipped |
| `KB_TEST_DATABASE_URL=postgresql://kb@/kbtest?host=/tmp&port=55432 .venv/bin/python -m pytest -q` | **PASS** — **115 passed, 0 skipped, 0 failed** |
| `cli/.venv/bin/python -m pytest cli/tests -q` | **PASS** — 44 passed |
| `python3 scripts/plugin_parity.py` | **PASS** (exit 0) — templates in parity |
| `python3 scripts/skills_parity.py` | **PASS** (exit 0) — body parity, web copy byte-identical |
| `diff -q plugin/skills/explain/SKILL.md ~/.claude/skills/explain/SKILL.md` | identical (4th, ungated copy in sync) |
| `python3 scripts/workflow.py validate` | **PASS** |
| `pytest tests/test_api_push.py -k "hanging or timeout"` | **PASS** — 2/2 (ordering guarantee + `KB_GIT_TIMEOUT_S`) |

The Postgres-gated run used the `-17`-suffixed Homebrew binaries per the plan
(`initdb-17` / `pg_ctl-17` / `createdb-17`, socket `/tmp`, port `55432`, data dir in
the session scratchpad because `rm -rf /tmp/...` is sandbox-denied). Cluster stopped
afterwards. **No suite was silently accepted as skipped.**

Notable: the gated suite is now **115/115**. `qa.md` still records a standing
"pre-existing gated failure" (`tests/test_documents_api.py::
test_documents_list_detail_and_project_bridge`, the `format`-key mismatch, last
re-confirmed at the P21 review as "100 tests, 1 failed"). That test was re-run in
isolation here and **passes** — the note in `qa.md` is stale (not P24's doing; it was
fixed somewhere in P22/P23). Worth folding into the doc consolidation at re-review.

### Behavioral spot-checks beyond the suites

- **Live 201 / read-back shape** (TestClient over a throwaway KB root, scratch script,
  nothing written to the repo): `POST /api/documents` → 201 carrying
  `push_pending` (bool, present unconditionally), `pushed:false`, **no `push_error`
  key**; `GET /api/documents/by-path/<rel>` → 200 whose projection is
  `created_at, date, format, id, markdown, project, rel_path, related, slug,
  source_repo, tags, tenant_id, title, updated_at, version`.
  - This **confirms S3's load-bearing assumption**: `markdown` *is* in the by-path
    projection (`_public_doc(..., include_markdown=True)`, `server/main.py:435`), so
    `knowledge.verify_save`'s body comparison works against the real API and not just
    against `FakeApi`. Round-tripped body matched after `.strip()` on both sides.
  - It also **confirms S2/S3's `url` trap**: the read projection has no `url`. Both
    clients correctly omit it on the recovered path.
- **Ordering guarantee**: `test_response_does_not_wait_for_a_hanging_push` blocks
  `gitops.push` on an `Event` and asserts the 201 in < 1 s. Reviewed the mechanism
  itself, not just the test — `publish.submit` is a `queue.put` on the request thread
  and the work runs on the `kb-publish` daemon thread, so the guarantee is a property
  of the code rather than of `BaseHTTPMiddleware` ordering. That was exactly the trap
  `phase.md` flagged against `BackgroundTasks`; the choice is correct.
- **`KB_GIT_TIMEOUT_S`**: every `subprocess.run` in `server/gitops.py` goes through
  `_run(..., timeout=config.git_timeout_s())`, `TimeoutExpired → GitError`; the
  failure-path `rebase --abort` is bounded too and swallows its own timeout so it
  cannot mask the real error. Unparseable/non-positive falls back to 60 s, so the cap
  cannot be switched off.
- **`WRITE_LOCK` discipline**: both submit sites (`create_document` 4b,
  `_delete_document`) are **outside** the lock, and `_push_task` re-takes it. The lock
  is not reentrant and there is exactly one lock object in the process (the `/app`
  delete defers its import of `_delete_document`). No re-entry, no second worker.
- **Skill self-consistency**: every `curl` in `plugin/skills/explain/SKILL.md` is
  covered by an `allowed-tools` prefix — 5 at `--max-time 5` (step-3 reads) and 5 at
  `--max-time 30` (POST ×2 forms, verification GET ×2 forms, …), with both entries in
  the frontmatter. §5 → §5.1 → §6 → §8 route consistently: a bare non-zero curl exit
  can no longer reach step 6, and step 6's file-exists guard prevents duplicating a
  write the API already made.
- **Consumer sweep**: nothing in the repo reads `pushed` truthily or reads
  `push_error`. `scripts/onboarding_smoke.py` only asserts key *presence* for
  `committed`/`commit_sha`/`pushed` — all still present. Web/`/app` planes are
  unaffected (the `/app` delete is 204 with an empty body).

## 2. Judgment against objective and intent

**Intent (`intent.md`) is satisfied on all three counts.**

1. *Confirm the failure mode* — done at `P24.DECOMP`, from code, with a refinement of
   the operator's hypothesis: the culprit was not "git commit" but the unbounded
   **network** stages (fetch/rebase/push, then the Gemini embed) sitting between the
   durable save and the 201. Measured SSH RTT backs it.
2. *Make the finish response reliable* — S1. The pre-response path is now entirely
   local (validate → archive → file → index → DB commit → local `git add`/`commit`),
   and every git subprocess is bounded. The mechanism (single FIFO daemon worker,
   `WRITE_LOCK` re-take outside the lock, drain on shutdown, `publish.drain()` in
   tests) is sound and well-argued.
3. *Make client reporting honest* — S2 (`/explain`, 4 copies) and S3 (CLI). Both encode
   the same rule: a transport failure on a mutating call is not evidence of failure;
   verify once with `GET /api/documents/by-path/<rel>`; never loop; at most one
   informed retry (skill) or zero (CLI).

**Flagged behavior changes — all deliberate, additive, and acceptable:**

- `push_pending: bool` added to the `POST` 201 and both `DELETE` 200s. Emitted
  unconditionally (a stable key), no field removed, no type changed → the frozen
  consumer contract holds for changple5 / the hi2vi content agent.
- `pushed` is now a constant `false`. Its documented meaning ("saved; publishes on the
  next successful push") is unchanged and was never a failure signal, so no consumer
  that follows the documented contract regresses. **But see Finding 1** — one
  *internal* consumer, the deploy runbook, does read it as a capability assertion.
- `push_error` is now unreachable in every response. Same caveat.
- `commit_sha` is the local pre-rebase commit. Correct and unavoidable once the rebase
  moves after the response; the test suite was reworked to assert the published head
  against the post-rebase local head instead of against `commit_sha`.

**Recorded soft spots — judged acceptable, no fix slice needed:**

- *Unbounded Gemini embed on the worker* — cannot delay a response any more, but a
  stalled embed blocks the single FIFO worker and therefore every push queued behind
  it (until process restart; the writes themselves stay durable and republish on the
  next successful push). Accepted for this phase, documented in S1's result. **Worth a
  deferred job** (`defer-job`): give `server/embeddings.py` a client timeout, or run
  embeds on a second queue.
- *Background embed's SQLite race / lost FK target* — fails closed, logged, next
  reindex catches up; semantic search is a disposable cache. Fine.
- *In-memory queue lost on crash* — loses only the push, never the save, and `git push`
  publishes all accumulated commits on the next write. Fine, and documented.
- *Unbounded queue growth / no push coalescing* — the phase's open question, correctly
  left open.
- *CLI client-side date derivation around midnight* — only ever downgrades to "I could
  not confirm it", whose message points at `knowledge list`. Fine.
- *Skill's plain-create verification uses `title` match rather than a body compare*
  (the CLI compares bodies). Narrow: step 3 resolves priors, so a same-path
  same-title stranger is already implausible. Not a finding.

**Doc impact list** (`phase.md`) was checked against the three slices' results: the
`api.md` / `backend.md` + `architecture.md` / `operations.md` / `experience.md` lines
accurately cover every durable-truth change the phase made. Two additions the
consolidation should carry, recorded at the bottom of `phase.md`: the operator-surface
line from the fix slice below, and the stale `qa.md` gated-failure note.

## 3. Findings

### Finding 1 (must fix) — the phase removed the only in-band push-health signal and left the runbook prescribing it

`deploy/README.md:184-189` (§2 Bring-up) still says:

> the 201 body carries `pushed:false` + `push_error`. … it is silent, so check
> `pushed:true` on the first write (P8.S5) rather than assuming.

Post-P24 **`pushed` is a constant `false` and `push_error` never appears**, so this
verification can never pass. An operator bringing the box up — which is exactly what
shipping this phase requires — would read a perfectly healthy box as a broken push.

The deeper half: this paragraph exists because of the P8.F2 lesson recorded in
`operations.md:30` — *"a best-effort code path can hide a total infrastructure failure
— assert the capability at bring-up … make acceptance assert the capability
(`pushed:true`), never the status code."* P24 moved the push behind the response, so
the **only remaining evidence of a failed push is a `[kb-api] publish: <name> FAILED:
…` line in the container log**, and no runbook, script, or verifier references it. The
hard-won assertion has been silently deleted rather than replaced.

Suggested (not mandated) replacement to document: after the first write on the box,
`docker compose -f compose.prod.yml logs api | grep 'publish:'` for a FAILED line, and
`git -C /opt/knowledge rev-list origin/main..HEAD` returning empty (everything the box
committed has been published). Exposing `publish.last_error()` / `publish.pending()`
on an ops surface is an option if the log line is judged insufficient, but a docs-only
fix is the recommended scope.

### Finding 2 (should fix, same slice) — two stale/missing operator-config facts

- `compose.prod.yml:48-51` — the `KB_GIT_PUSH` comment still describes the push as part
  of the request ("After the scoped commit the server fetches + rebases onto
  origin/main and pushes (best-effort; a failed push never fails the request)"). True
  in ordering, misleading about *when*: it now runs after the response, on the publish
  worker.
- **`KB_GIT_TIMEOUT_S` (default 60 s) is documented nowhere an operator looks** — not in
  `compose.prod.yml`'s non-secret box-config block, not in `deploy/README.md`. It has a
  safe default, so this is documentation only. (`operations.md`'s env table gets it in
  the consolidation.)

### Finding 3 (optional, same slice) — the post-deploy verifier does not prove the new field ships

`scripts/onboarding_smoke.py:81-82` lists the required 201 keys and still stops at
`pushed`. Adding `push_pending` would make the committed post-deploy verifier prove the
phase's one additive contract change actually reached prod. No behavioral assertion
needed (`push_pending` is `true` on the box, `false` locally). `scripts/` is not in
`shipped_dirs`, so this is a single-file change with no mirror obligation.

## 4. Proposed fix slice

```
python3 scripts/workflow.py new-slice --phase P24 --slice P24.F1 \
  --name "Operator surfaces: honest push verification after the after-response publish" \
  --kind fix --risk high --order 4 --depends-on P24.S1
```

`risk high` because it spans more than one file (`deploy/README.md`,
`compose.prod.yml`, optionally `scripts/onboarding_smoke.py`), per the contract's
tiering rule — the work itself is small and docs/comment-only. Covers Findings 1-3.
Neither `deploy/` nor `scripts/` is in `plugin/templates/manifest.json`'s
`shipped_dirs`, so **no mirror obligation** and `plugin_parity.py` cannot move.

## 5. Doc consolidation — deliberately NOT done

P24 is **not** in parallel mode (`phase.json` carries no `execution` block), so a
passing review would have consolidated here. Per the contract, a `changes_requested`
verdict stops before doc work: **no `doc-new-version` was run, no `docs/current/*.md`
touched, no source file edited.** The consolidation to run at re-review, from the
verified Doc impact list (+ the two additions noted in `phase.md`):

| doc | what the version must carry |
|---|---|
| `api.md` | `push_pending` on the 201 + both DELETE 200s; publish + embed after the response; `pushed` always false when deferred; `push_error` gone; `commit_sha` = local pre-rebase commit. Stale spots: lines 130, 137-139, 413-414, 441-451, 510-513, 120-121. |
| `backend.md` / `architecture.md` | `server/publish.py` FIFO worker, `WRITE_LOCK` re-take submitted outside the lock, shutdown drain, `KB_GIT_TIMEOUT_S` bounding every git subprocess. |
| `operations.md` | `KB_GIT_TIMEOUT_S` env row; publish-on-write flow is no longer in-request (lines 221-240); the P8.F2 bring-up assertion's replacement (Finding 1); background push failures live only in the container log (line 30 needs the same correction). |
| `experience.md` | the `/explain` §5.1 verify-before-report rule + `--max-time 30`; `knowledge save`'s verify-or-say-so path, `WRITE_TIMEOUT = 30` vs `DEFAULT_TIMEOUT = 15`, and that only a genuine connect failure still says `cannot reach`. |
| `qa.md` (new, added by this review) | the gated suite is now 115/115 — retire the standing "pre-existing gated failure" note; record `publish.drain()` as the deterministic way to assert a background side effect. |

## 6. Explain

`explain: not written — run /explain for this phase.`

## Deviations from `plan.md`

- The plan's Postgres recipe assumed a data dir under `/tmp`; `rm -rf /tmp/...` is
  sandbox-denied here, so the cluster's data dir lives in the session scratchpad
  (socket still `/tmp`, port `55432`). Same coverage, same DSN.
- Added one behavioral spot-check the plan did not name — a live `POST` + by-path `GET`
  against a throwaway KB root — because S3's verification correctness hinges on
  `markdown` being in the read projection, which the CLI suite only proves against a
  fake. Confirmed against the real projection.
- Everything else per plan.

---

# Second pass — re-review after `P24.F1`

**Verdict: `pass`.** All three first-pass findings are closed, and closed *honestly* —
F1 corrected the review's own suggested wording rather than copying it. Six doc versions
consolidate the full Doc impact list. **No source file was touched on this pass**
(docs + `result.md` + `phase.md` only).

## 1. Each finding, verified against the code (not just against F1's prose)

| Finding | Closed by | Verified how |
|---|---|---|
| **1 (must)** — the runbook prescribed a bring-up check (`pushed:true` / `push_error`) that can never pass | `deploy/README.md` §2: a callout stating why the old evidence is gone + three commands (`exec api git ls-remote origin main` credential probe → `logs --since 30m api \| grep 'publish:'` expecting **no output** → `rev-list --count origin/main..HEAD` == 0) | Read `server/publish.py` end to end: **`_log` has exactly one call site**, `_loop`'s `except` branch (`publish.py:66`) — there is **no success line**, so "expect NO output" is correct and the review's own suggested "grep for the `publish:` line (success/FAILED)" would have been a second unfalsifiable instruction. The `rev-list` positive assertion is the right substitute. P8.F2's rule is restated explicitly, so the *lesson* survives, not just the paragraph. |
| **2 (should)** — stale `KB_GIT_PUSH` comment; `KB_GIT_TIMEOUT_S` documented nowhere | `compose.prod.yml`'s comment rewritten (commit in-request, fetch/rebase/push after the response on the worker, failures only in the log) + a **commented-out** `# KB_GIT_TIMEOUT_S: "60"` with its rationale; `deploy/README.md` §1 paragraph | Diff read. The compose entry is commented on purpose (60 s is the code default; F1 proved the resolved config is unchanged with `docker compose config`), so the knob is discoverable without a redundant config change. Matches `server/config.py::git_timeout_s`'s documented fallback-to-60 behavior. |
| **3 (optional)** — the post-deploy verifier didn't prove the new field ships | `scripts/onboarding_smoke.py::FROZEN_201_KEYS` gained `push_pending`, comment rewritten (presence asserted, never the value; `push_error` recorded as gone) | Confirmed `push_pending` is emitted **unconditionally** — `server/main.py:865-920` builds it into the 201 dict outside any conditional (`push_pending = False` … `if committed and config.git_push_enabled(): push_pending = True`), and `:1001-1021` does the same on the DELETE 200 — so a presence assertion is safe on the box and locally. |

Nothing in F1 touched `server/**`, so no mirror obligation arose (`deploy/` and
`scripts/` are outside `shipped_dirs`) and `plugin_parity.py` could not move.

## 2. Validation (second pass)

| Command | Outcome |
|---|---|
| `.venv/bin/python -m pytest -q` | **PASS** — 83 passed, 32 skipped (unchanged) |
| `python3 scripts/plugin_parity.py` | **PASS** (exit 0), re-run after the doc work too |
| `python3 scripts/skills_parity.py` | **PASS** (exit 0), re-run after the doc work too |
| `python3 -m py_compile scripts/onboarding_smoke.py` | **PASS** |
| `python3 scripts/workflow.py validate` | **PASS** (before and after the consolidation) |
| `diff -q plugin/skills/explain/SKILL.md ~/.claude/skills/explain/SKILL.md` | identical (4th, ungated copy still in sync) |
| `python3 scripts/workflow.py rebuild-docs` | **PASS** — `docs/current` regenerated from the six new versions |

Per the plan, the expensive suites (Postgres-gated 115/115, CLI 44) were **not** re-run:
F1 changed only `deploy/README.md`, `compose.prod.yml` and one constant in a standalone
script that no test imports (`grep -rn onboarding_smoke tests/ cli/` is empty), and both
were green two commits ago. `git status` confirms this pass wrote **no source file** —
only `docs/**` and `works/**`.

## 3. Doc consolidation — six versions, the full list

The Doc impact list (S1 ×3, S2, S3, the review's two, F1's one) maps onto six docs.
Overlapping lines were merged per doc rather than transcribed.

| doc | version | what it carries |
|---|---|---|
| `api` | `v0017` | New "As of P24" contract paragraph; `push_pending` added to the 201 key list, both DELETE outputs and the sample body; `push_error` removed everywhere; `pushed` documented as **always false when deferred and never a failure signal**; `commit_sha` = the local pre-rebase commit; the publish/embed-after-response split in *Commit/push semantics*; and a new **verify-don't-blind-retry** client rule (incl. the no-`url` read projection) in *Operational semantics the client relies on*. |
| `backend` | `v0012` | New *After-response publish worker (P24)* section (FIFO daemon thread, why a queue and not `BackgroundTasks`, the `WRITE_LOCK` re-take + submit-outside-the-lock rule, failure logging with no success line, and the accepted limits: in-memory queue, unbounded embed, unbounded queue); `config.git_timeout_s`; a corrected `gitops` bullet (it **does** push — the old "never pushes" was stale since P8 — and every subprocess is now bounded, `TimeoutExpired → GitError`); two new invariants; and the retirement of "no background workers" / "embeds happen in-request". |
| `architecture` | `v0016` | The *API-Owns-Writes Flow* rewritten around the **response/publish split** (steps 1-5 local and in-request, the 201, then push+embed on the worker) with the rationale for why the boundary is load-bearing; the two-deployments table row; "the write path became the publish path" updated to the two failure domains; a new *no network I/O before a response* constraint; the single-writer invariant extended to the worker thread; and a P24 clause in the Status chain (the system's **first background worker**). |
| `operations` | `v0022` | `KB_GIT_TIMEOUT_S` env-table row; the *Publish-on-write flow* corrected (it is no longer in-request) with what an operator now sees; **a new *Bring-up: asserting push capability (P24)* section carrying `deploy/README.md` §2's three commands verbatim** plus the two traps (the grep is a *negative* check; `origin/main` is the container-updated tracking ref — never `git fetch` from the host); the P8.F2 note at the top rewritten so the **rule** survives with new instruments; and the `onboarding_smoke.py` `push_pending` assertion recorded. |
| `experience` | `v0015` | New *The reply gets lost: honest publishing after a timeout (P24)* section — the symptom in the operator's own terms, the one verify-once rule both clients share, "never loop", what "I could not confirm it" looks like and why a recovered save prints no URL, the agreed 30 s write budget, and the local fallback's no-duplicate guard. |
| `qa` | `v0013` | The standing "pre-existing gated failure" note **retired** in all three places it appeared (status paragraph, P18 section, P21 section) — the gated suite is **115 passed / 0 failed**; plus a new *Publish-worker acceptance (P24)* section: `publish.drain()` as the sleep-free way to assert after-response side effects, the ordering-guarantee regression test and why it must stay, the move of assertions off `pushed` onto git state, and the live read-projection spot-check. |

**Runbook/doc drift risk noted in both places:** `operations.md`'s new section says it is
kept in step with `deploy/README.md` §2, and F1's §2 block is reproduced byte-for-byte,
so a future change must edit both.

## 4. Explain

`explain: not written — run /explain for this phase.`

## Deviations from `plan.md` (second pass)

- The plan named "the FULL Doc impact list … `api.md`, `backend.md`/`architecture.md`,
  `operations.md`, `experience.md`" plus `qa.md`; that is exactly the six versions
  created (`backend` and `architecture` got **separate** versions — the notes are
  genuinely different at the two altitudes, and they are separate docs in the index).
- While editing `backend.md` I corrected one **pre-existing** staleness beyond P24's
  scope: the `gitops` bullet still claimed the module "never pushes" (untrue since P8).
  Leaving it would have made the new timeout sentence read as describing a module that
  does not push. No other out-of-scope doc edits.
- Everything else per plan.
