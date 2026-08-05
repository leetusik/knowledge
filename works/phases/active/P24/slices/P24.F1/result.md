# Result — P24.F1 (fix: operator surfaces — honest push verification after the after-response publish)

**Done.** All three review findings closed. Docs, comments, and one script constant
only — **no `server/**` file touched, no behavior changed** (the one compose addition
is a *commented-out* env line, so the resolved config is byte-identical).

## What changed

### Finding 1 (must) — `deploy/README.md` §2: a bring-up check that can pass again

The old paragraph (lines 184-189) told the operator to verify push capability by
reading `pushed:true` / `push_error` out of the first write's 201. Post-P24 that can
**never** pass. Replaced with a procedure whose evidence still exists, keeping the
P8.F2 rule explicit ("assert the capability at bring-up, never infer it from a status
code") and adding a short callout stating *why* the old evidence is gone
(`pushed` constant `false`, `push_error` unreachable, `push_pending:true` only means
"queued").

The new check has three commands, in the runbook's existing fenced-block voice:

1. `docker compose -f compose.prod.yml exec api git -C /repo ls-remote origin main`
   — a **pre-write** capability probe of the whole push credential chain (SSH origin +
   deploy key + pinned host key). Deliberately labelled as proving *authentication,
   not write access* — a read-only `ls-remote` succeeds with a read-only deploy key,
   so it is a fast fail-early signal, not the assertion.
2. `docker compose -f compose.prod.yml logs --since 30m api | grep 'publish:'` — run
   after the first real write (§5 / P8.S5 E2E acceptance). **Expect no output**, and
   the doc says so explicitly, because `server/publish.py::_log` is only ever called
   on failure (`_loop`'s `except` branch, `publish.py:66`) — **there is no success log
   line**, which the review's suggested wording ("grep for the `publish:` line
   (success/FAILED)") assumed. Documented the two failure shapes and that an
   `embed … FAILED` line is the semantic-search embed (search degrades to BM25),
   not the push.
3. `git -C /opt/knowledge rev-list --count origin/main..HEAD` — **expect `0`**: the
   positive assertion that everything the box committed is published. Non-zero names
   the recovery (fix the credential; the next write republishes everything, or push by
   hand through the container). Added a caveat that `origin/main` here is the clone's
   remote-tracking ref, updated by the *container's* push, and that the host must not
   `git fetch` to refresh it — the SSH origin is the container's credential and the
   host user has no deploy key (§1b).

Swept the rest of `deploy/README.md` for other now-impossible statements:
`grep -rn 'push_error\|pushed' deploy/` returns only this paragraph plus
`deploy/deploy.sh`'s "unpushed doc commit" comments, which describe stranded local
commits and are still true (more true, in fact, now that the push is deferred).

### Finding 2 (should) — two stale/missing operator-config facts

- `compose.prod.yml`'s `KB_GIT_PUSH` comment now says the commit is in-request while
  the fetch + rebase + push run **after the response on the publish worker**
  (`server/publish.py`, P24), that a failure appears **only** in the container log as
  `[kb-api] publish: push <rel> FAILED: …` and never in the response, and points at
  `deploy/README.md` §2 for the bring-up assertion.
- **`KB_GIT_TIMEOUT_S` documented in both places an operator looks:**
  - `compose.prod.yml` — a **commented-out** `# KB_GIT_TIMEOUT_S: "60"` entry with the
    reason it is load-bearing (the worker re-takes the non-reentrant write lock while
    pushing) and the fallback-to-60 behavior. Commented on purpose: 60 s is the code
    default and setting it would be a (redundant) config change, but the knob is now
    discoverable in the file that documents its siblings.
  - `deploy/README.md` §1 — a short paragraph right after the existing "non-secret box
    config is baked into `compose.prod.yml`" sentence, saying explicitly that this one
    is *not* set there and defaults to 60 s.

### Finding 3 (optional, done) — the post-deploy verifier now proves the additive field ships

`scripts/onboarding_smoke.py`'s `FROZEN_201_KEYS` gained `push_pending`, with the
comment rewritten: presence is asserted (never the value — `true` on the box, `false`
wherever `KB_GIT_PUSH` is off), and `push_error` is recorded as no longer existing in
any response. Verified `push_pending` is emitted **unconditionally** on the 201
(`server/main.py:865-920`) and on both DELETE 200s (`:1001-1021`), so a presence
assertion is safe locally and on the box. Both call sites (`:355`, `:528`) use it as a
subset check, so nothing else moves.

## Validation

| Command | Outcome |
|---|---|
| `python3 scripts/plugin_parity.py` | **PASS** (exit 0) — unchanged; `deploy/` and `scripts/` are outside `shipped_dirs`, as expected |
| `.venv/bin/python -m pytest -q` | **PASS** — 83 passed, 32 skipped (identical to the review's run; nothing moved) |
| `python3 -m py_compile scripts/onboarding_smoke.py` | **PASS** (exit 0) — no lint/self-test exists for this script |
| `python3 scripts/workflow.py validate` | **PASS** |
| `.venv/bin/python -c "yaml.safe_load(open('compose.prod.yml'))"` | **PASS** — parses; api `environment` keys unchanged (10, `KB_GIT_TIMEOUT_S` correctly absent because it is commented) |
| `docker compose -f <scratch copy>/compose.prod.yml config` | **PASS** — resolves cleanly with a dummy `.env`; only `KB_GIT_PUSH` appears, confirming zero effective config change |

The last two are extra checks the plan did not name: the compose edit is the only one
that could break something at deploy time (a YAML comment typo), so it was worth
proving the resolved config is unchanged. `docker compose config` was run against a
copy in the session scratchpad with a dummy `.env` because the repo root has no `.env`
(gitignored, box-only) — run in-repo it fails on that missing file, pre-existing and
unrelated.

Not run: the repo's Postgres-gated suite and the CLI suite. Nothing in this slice is
importable by either (`deploy/**` is not code, and `onboarding_smoke.py` is a
standalone script no test imports — `grep -rn onboarding_smoke tests/ cli/` is empty);
the review ran both green two commits ago.

## Deviations from `plan.md`

- **The review's suggested log grep was corrected, not copied.** It described the
  `[kb-api] publish:` line as "(success/FAILED)"; the code only logs failures, so the
  runbook says "expect NO output" and pairs it with the `rev-list` check as the
  positive assertion. Documenting a success line that does not exist would have
  reproduced exactly the bug this slice fixes.
- **One command added beyond the review's suggestion**: the `ls-remote` credential
  probe, so the operator has a check that fails *before* the E2E write rather than
  only after it. Explicitly caveated as not proving write access.
- `KB_GIT_TIMEOUT_S` documented in **both** the compose comment block and the deploy
  README (the plan allowed "and/or") — the compose entry is where its siblings live,
  the README paragraph is where §1 already enumerates the non-secret config.
- Everything else per plan.

## Notes for the re-review

- The consolidation's `operations.md` version can now lift the exact commands from
  `deploy/README.md` §2 verbatim — doc and runbook should not drift apart on this.
- Still true, and still worth the review's recorded deferred job: a failed background
  push is visible **only** in the container log. Nothing in this slice adds an ops
  endpoint (`publish.last_error()` / `publish.pending()` stay test/diagnostic-only), by
  design — the review recommended docs-only scope.
