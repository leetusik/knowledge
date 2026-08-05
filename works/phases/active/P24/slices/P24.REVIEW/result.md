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
