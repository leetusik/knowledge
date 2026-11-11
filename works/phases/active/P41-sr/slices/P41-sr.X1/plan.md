# P41-sr.X1 — Ship it: deploy, migrate, start the Mac runner, check Range on production

## Goal

Put Listen on production, `https://knowledge.hi2vi.com`, and prove it end to end there:
- the box serves the new code and the new tables;
- the Mac runner renders production's jobs;
- a part is served with HTTP Range through the edge and is not cached by Cloudflare;
- a short document plays.

**Every production step is the operator's** (DECOMP2's gate, approved). The steps are: push, the Production Deploy
action, the on-box `alembic upgrade head`, the runner's org key, and the LaunchAgent install. The slice stops
`pending` (`operator-action`) for them. **No agent pushes, runs the deploy action, SSHes to the box, mints a key,
reads or prints a key, runs `install.sh`, or signs in to production.**

## How this slice runs

1. **Span 1, this dispatch: the pre-flight.** Local and read-only toward production. It ends by returning
   `needs_operator` with Stop A.
2. **Stop A, the operator:** push, the box's `alembic current`, free disk, then the migration and Production Deploy
   in the order Span 1 pins.
3. **The orchestrator** runs § Runbook's flip probes inline: public, unauthenticated, read-only.
4. **Stop B, the operator:** mint the runner's org key, fill `tools/listen-runner/.env`, run `--once`, and run
   `install.sh`. Then start one Listen on a short native document of theirs, in their own browser on production.
5. **Span 2, a later dispatch:** the production check. Its plan section is appended to this file before it runs.

## Span 1: the pre-flight

### 1. What ships

- `git fetch origin`, then list `git log --oneline origin/main..main`. It is about 41 commits: this phase's B1, B2,
  B3, G1, W1 and W2, plus the workflow commits.
- Scan `git diff --stat origin/main..main` for anything that must not go public:
  - audio or `.m4a` outside `tests/fixtures/listen/`;
  - `.cache/` paths;
  - `.env` files;
  - keys or tokens: grep the diff for `vk_[A-Za-z0-9]{8,}`, `SESSION_SECRET=` and private-key headers. Report counts
    and paths, never values;
  - real private excerpt text;
  - a voice sample.

  `tests/fixtures/listen/part.m4a` is B2's synthetic sine fixture: confirm it is a few KB.
- `UPDATE_REQUIRED.md` stays untracked and is never committed.

### 2. The whole-tree gates (deferred to here by G1, W1 and W2; the review re-runs them)

- **The full root pytest** with the Listen Postgres tests live:
  - Postgres in a container named **`p41-x1-pg`**, on **127.0.0.1:55451**;
  - `KB_TEST_DATABASE_URL` set as B1's result says;
  - `uv run pytest -q`.
- **Alembic** on that database: `upgrade head`, `downgrade -1`, `upgrade head`, all clean.
- **The runner:** `cd tools/listen-runner && uv run pytest -q`.
- **Web**, in `web/`:
  - `pnpm vitest run`: the whole suite;
  - `pnpm lint`;
  - `pnpm exec tsc --noEmit`;
  - the production build, **in a scratch APFS clone** by `## Operator Runtime` (never into `web/.next`: `:3030` is
    running and is never restarted).
- **Parity:**
  - `uv run python scripts/plugin_parity.py`;
  - `python3 scripts/skills_parity.py`;
  - `claude plugin validate plugin`, if the CLI offers it. Otherwise say so.
- **Failures.** A gate that fails is reported with its output, and **not fixed here**: X1's set has no product code.
  Return `blocked`, naming the failing gate and the slice whose set owns the file. A failure that is plainly
  pre-existing at `origin/main` is reported as such: check by running it on a scratch worktree of `origin/main` only
  if that is quick.

### 3. The migration order (the load-bearing question)

Read `alembic/versions/0007_listen.py` and every server path that touches the Listen tables, then settle these:
- **Old code, new schema.** Is `0007` purely additive, with new tables only and no change to an existing table? Then
  old code with the new schema is safe, as `0004` was.
- **New code, old schema.** Between the deploy and the migration, does any **non-Listen** request read a Listen
  table? Check:
  - the API's startup and reindex;
  - the reader routes;
  - the web reader's seed: W1 and W2 read `/app/listen/state` beside the page load, and "any miss means no Listen,
    never a failed page". Confirm a 500 there degrades to no Listen;
  - `/healthz`;
  - the deploy's health gate.
- **Production's current head.** It is unknown here. `docs/current/operations.md` records `0004`, and the repo also
  has `0005` and `0006`, so production may be behind `0006`. The operator reads it at Stop A with
  `alembic current`, and the runbook says what each answer means. If `upgrade head` would also apply `0005` or `0006`,
  read those too, and judge the order for the whole run of migrations.
- **Pin the order:**
  - **migrate first:** the box clone has to be reconciled first, because the api is bind-mounted;
  - **or deploy first:** then migrate at once, if new code with the old schema is safe for everything but Listen.

  Pin the exact on-box commands from the repo's own record, and check them against `compose.prod.yml` (the service
  name, and whether `alembic` is on the image's PATH). The record uses
  `docker compose -f compose.prod.yml run --rm api alembic upgrade head` for `0003` and `0004`, and
  `… exec api alembic upgrade head` on an already-migrated box. Expect `0006_reader_state -> 0007_listen`, or the
  run the head check implies.

### 4. The edge and the deploy chain

- Confirm Production Deploy re-applies `deploy/knowledge.conf` (`deploy/README.md` §6, step 4, `nginx -t` gated).
  B2 added `location ~ ^/api/listen/(play/|position$)` with `proxy_buffering off`.
- Confirm the deploy rebuilds `knowledge-web` and force-recreates the api, so both serve the new code.
- If `nginx -t` can be run locally against the file with stub upstreams, do it. Otherwise re-read the new location
  against its neighbours, and say which you did.
- Note the body cap: `client_max_body_size 20m`, against the runner's largest upload (B1 caps a part at about 4 MB).

### 5. The checks after each stop: write them as exact commands

**After Stop A, the orchestrator's flip probes.** These are public, unauthenticated and `curl -sS -o /dev/null -w`
shaped. For each, name the expected status and the server that answers:
- `/healthz` → 200;
- `GET /api/listen/play/x/playlist.m3u8`, with no cookie → the BFF's 401, answered by `knowledge-web` rather than
  FastAPI or nginx (tell them apart by a header or body shape you find in the code);
- `POST /api/listen/position`, with no cookie → the BFF's 401;
- `POST /api/listen/jobs/claim`, with no key → FastAPI's 401;
- `GET /app/listen/state?...`, with no session → 401.

Pick probes whose answer **flips** from the old deploy to the new one, as P18 used `GET /app/credentials` 404→401.
State the before and after for each.

**For Stop B and Span 2, the production check:**
- **The runner.** After `--once`, the log `~/Library/Logs/kb-listen-runner.log` (it never logs text or keys) shows
  `claimed` → `rendered` (seconds, RTF) → `uploaded` → `finished` for the operator's Listen.
- **Range.** The part requests need a session. The agent never holds the operator's session, and never creates a
  production account. So write a **one-line browser-console snippet** for the operator to paste on production while
  signed in. It reads the playlist URL from the page's Listen state, or from the network panel, and prints:
  - the status, `Content-Range`, `Accept-Ranges`, `Content-Encoding` and `cf-cache-status` for `Range: bytes=0-99`;
  - the same past the end, which must give `416`;
  - a `HEAD`.

  The expected results:
  - `206`;
  - `cf-cache-status` absent, `BYPASS` or `DYNAMIC`, never `HIT`;
  - no `Content-Encoding` on audio;
  - `416` past the end.

  Check that the snippet works against the scratch stack before handing it over: start a scratch stack for this, as
  W1's result describes, or drop the live run if it costs too long, and say so.
- **The play:** the operator plays it in Chrome on the Mac. The iPhone screen-off check stays at acceptance (R3 §10).
- **Free disk:** the operator runs `df -h /opt/knowledge` on the box. The box's CPU and RAM go unrecorded; only
  D104-vm would need them.

### 6. Write the runbook

Write `result.md` with the verdict block first, then:
- **§ Pre-flight:** what ships, the scan, every gate with its result, and the migration analysis with its evidence
  (`file:line`);
- **§ Runbook,** in the operator's terms, short and exact:
  - **Stop A:**
    1. push: `git push origin main`;
    2. on the box: `alembic current`, reported back, and `df -h`;
    3. the migration and Production Deploy, in the pinned order, with each command and what success looks like.
  - **Then the orchestrator's flip probes.**
  - **Stop B:**
    - B3's `## Operator setup` steps, with `KB_LISTEN_URL=https://knowledge.hi2vi.com`;
    - where in the app to mint the **org-level** key (the page and the control, found in `web/src`);
    - `--once` and `install.sh`;
    - start a Listen on one short native document in their own browser;
    - paste the snippet and send back its output.
  - **Span 2's checks.**
  - **Rollback notes:** what to do if the deploy fails, which is fix-forward per `deploy/README.md`, and how to stop
    the runner.
- The `operator_need` field holds Stop A, word for word as the operator should see it.

### Teardown

- Remove `p41-x1-pg` with its volume (`docker rm -fv`).
- Stop any scratch `next`.
- Delete the scratch clone. If the permission layer refuses a delete, list the paths in `result.md` and never work
  around it.
- **Never:**
  - restart `:3030`;
  - read or edit `web/.env.local`;
  - touch another container (changple5-*, p50-s12-db).

## Set

- `works/phases/active/P41-sr/slices/P41-sr.X1/` (`result.md`);
- `deploy/**`, **only** if the pre-flight finds a deploy script or the conf that must change. Say why, and keep it
  minimal.

No product code.

## Return (Span 1)

- **Verdict:** `needs_operator` with Stop A, or `blocked` on a failing gate.
- **validation:** each gate with its result.
- **The `notebook` field:**
  - **Doc impact:**
    - `operations.md`: the Listen deploy order and on-box migration, the runner's production setup, and the
      operator's phone listening check (R3 §10);
    - `decisions.md`: the voice (Ming-3.0 US_Emma), the Mac runner, and Cloudflare's large-file term (R3 §5.4).
  - **Now:** one line.

## Dispatch

route=high
reason=risk high (not low)
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh

## Stop A, as run (2026-11-12)

The operator said "you do all".
- **The operator ran, because the permission layer refused the agent:**
  - the push, `b1eb6484..bf75e1eb`;
  - Production Deploy run `43048454873`.

  The agent's SSH read of `alembic current` and `df` was refused too, and not worked around. `df -h /opt/knowledge`
  is still owed by the operator.
- **The run was green:**
  - `Running upgrade 0006_reader_state -> 0007_listen`;
  - knowledge-api, knowledge-web and knowledge-mcp healthy;
  - edge `nginx -t` ok, then the reload;
  - `Deploy completed successfully.`;
  - the smokes OK for `/healthz` 200, `/` 200 and `/mcp` 406.
- **The flip probes,** run by the orchestrator afterwards, all as predicted:

  | Probe | Result |
  |---|---|
  | `healthz` | `200` |
  | `play` | `401 xfo=DENY` |
  | `position` | `401 xfo=DENY` |
  | `claim` | `401 www-auth=Bearer` |
  | `state` | `401 www-auth=Bearer` |

- **Stop B, prepared by the orchestrator:**
  - `uv sync` in `tools/listen-runner`;
  - `.env` written from `env.example` with `KB_LISTEN_URL=https://knowledge.hi2vi.com` and an empty `KB_LISTEN_KEY=`,
    mode 0600, gitignored.

  The key is the operator's to paste.

## Span 2: the part-size fix and the production record (2026-11-12)

### What happened at Stop B

- **The operator:**
  - put the org key in `tools/listen-runner/.env`;
  - ran `install.sh` (`com.knowledge.listen-runner` is loaded and running);
  - pressed Listen on a document of theirs on production. "Voice comes well."
- **The orchestrator** ran `--once` (`idle note=no job`), and read `~/Library/Logs/kb-listen-runner.log`:

  | Part | Segments | Estimate | Audio | RTF | Bytes | Upload |
  |---|---|---|---|---|---|---|
  | 1 | 35 | 598 s | 627.96 s | 0.460 | 3,888,484 | 201 |
  | 2 | 14 | 315 s | 310.96 s | 0.467 | 1,926,459 | 201 |
  | 3 | 41 | 567.5 s | 676.79 s | 0.474 | **4,190,874** | 201 |

  - Model load took 2.7 s. Peak memory was 4.48 GB.
  - No `failed`, `dropped` or `claim-refused` lines appeared.
  - Part 4 (29 segments, estimate 569 s) was rendering when this was written.
- **The operator's console snippet** on production. The first form found no playlist: the resource-timing discovery
  missed it, so the revised snippet clears the buffer and waits for hls.js's next playlist reload. Its results:

  | Request | Result |
  |---|---|
  | `range_0_99` | `206`, `content-range: bytes 0-99/3888484`, `accept-ranges: bytes`, `content-encoding: null`, 100 bytes, `cache-control: private, max-age=31536000, immutable`, `cf-cache-status: DYNAMIC` |
  | `past_end` | `416`, `content-range: bytes */3888484`, `DYNAMIC` |
  | `head` | `200`, `accept-ranges: bytes`, `content-length: 3888484`, `DYNAMIC` |
  | `playlist` | `200`, `no-store`, `content-encoding: zstd` (Cloudflare compresses the text playlist only for clients that accept it), `DYNAMIC` |

### The defect

Part 3 came within **3,430 bytes** of B1's upload cap (`listen_max_part_bytes`, 4 MiB):
- **The cause:** spoken audio ran up to 19 % over B1's length estimate (676.8 s against 567.5 s), and the AAC
  stream is about 6.2 KB/s.
- **What a larger part does:**
  1. it gets `413` (`server/listen_api.py:657`);
  2. the runner `fail`s the job (`tools/listen-runner/src/listen_runner/__main__.py`, `_deliver`);
  3. rendering is deterministic (seed 0), so all 3 attempts give the same size, and the Listen stops at "Preparing
     stopped".

### The fix (this span's product change, added to X1's set)

- **The change:** `server/config.py` `listen_max_part_bytes()`'s default goes from `4 * 1024 * 1024` to
  **`16 * 1024 * 1024`**, with the docstring updated. Make the byte-identical change in
  `plugin/templates/kb/server/config.py`.
- **Why 16 MiB:**
  - it stays under the edge's `client_max_body_size 20m` (`deploy/knowledge.conf:135`);
  - it leaves about 4× headroom over a 10-minute estimate even at +50 %;
  - the upload is read with a cap (`_read_capped`), so memory stays bounded.
- **What does not change:**
  - the part length cap (`KB_LISTEN_PART_CAP_S`, 600);
  - the env override (`KB_LISTEN_MAX_PART_BYTES`).
- **Grep** for any other place that states 4 MiB for parts, among docs strings, B1's or B2's validation and tests,
  and update only places inside `server/`, `tests/` and their template mirrors.
  - Never edit `docs/versions/` or `docs/current/`: add a Doc impact line instead.
  - Do not edit other slices' `result.md`.
- **Validation:**
  - `uv run pytest -q tests/test_listen.py tests/test_listen_play.py` (Postgres tests may skip without a DSN; say so);
  - `uv run python scripts/plugin_parity.py`: exit 0;
  - `git diff --stat`: the two config files only, plus any test line you changed.
- **Set for this span:**
  - `server/config.py`, `plugin/templates/kb/server/config.py`;
  - `tests/test_listen*.py`, and their template copies, only if one names the cap;
  - `works/phases/active/P41-sr/slices/P41-sr.X1/result.md`.

### Write the record

In `result.md`:
- **replace the verdict block,** keeping Span 1's facts in a short line;
- **add `## Stop A, as run`:** copy the facts from this plan's § Stop A, as run;
- **add `## Production check`:**
  - the runner table, the snippet table and the play;
  - the free disk, still owed by the operator because the agent's SSH was refused;
  - the part-boundary and reload-resume checks, which were not heard yet: the review's walkthrough covers them, with
    the iPhone screen-off checks (R3 §10);
- **add `## The part-size defect and fix`;**
- **add `## For the review`:**
  - the first part's wait: about 4.5–5 min before anything plays, because part 1 is a full ~10-minute part rendered
    at RTF ≈ 0.46. A short first part would start playback in under a minute. This is a candidate finding or
    deferred job, not fixed here;
  - the snippet's discovery miss, and its fix.

### Return

`needs_operator` with **Stop C**, word for word for the operator:
1. `! git push origin main`, after the orchestrator commits the fix;
2. `! gh workflow run deploy-production.yml --ref main`;
3. if part 4 or a later part was refused meanwhile, press **Try again** on that document after the deploy is green.

Notebook:
- **Doc impact:** `operations.md`, one line on the part upload cap: 16 MiB, `KB_LISTEN_MAX_PART_BYTES`, against the
  edge's 20m;
- **Notes for later slices** `(for P41-sr.REVIEW)`: the first part's wait;
- **Now:** one line.
