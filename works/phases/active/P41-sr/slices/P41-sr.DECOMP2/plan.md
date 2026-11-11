# P41-sr.DECOMP2 — the build cut (decomposition, high row)

## Context

Everything DECOMP2 waits on has landed:
- **The research:**
  - S1, the spoken script (`server/spoken.py`, mirrored);
  - R1–R5: free APIs, models and phone playback;
  - the playback change list, `topics/phone-playback.md` §5–§7.
- **The signed design:** D1, job `docs/reference/design/jobs/11-listen/`, round `01-listen`. Its build contract is
  the round `result.md` `## Build` plus `frame.md` F1–F33. It is signed "accept for the design."
- **The voice** (the operator delegated it, 2026-11-11): **Ming-3.0 0.5B, US_Emma, for English and Korean,
  rendered on this Mac** (MLX via mlx-audio, MIT, RTF 0.42, 4.4 GB). Korean text is pre-split by sentence,
  because mlx-audio's splitter ignores Hangul. The Mac is the voice runner.
- **Settled and deferred:**
  - other voices → **D104-vm**;
  - the podcast feed → **D105-y8**;
  - OQ1–OQ3 are resolved.

DECOMP2 cuts the build: backend first, then the player, then the writer guidance and release, then the deploy,
then REVIEW. The acceptance gate is already required.

**What the planning survey found** (facts the breakdown must carry; line numbers as of `d6581456`):

- **Two stores.**
  - **The content plane** is SQLite (`server/db.py`). It is disposable and rebuilt by reindex.
  - **Accounts and reader state** are in Postgres, through Alembic (`alembic/versions/`, latest
    `0006_reader_state.py`). It exists only when `DATABASE_URL` is set, which production does.
  - **Reading positions** live in Postgres: `reader_positions`, written by `PUT /app/reader/positions`
    (`server/reader_api.py:952`, `reader_state.upsert_position`), and from the web by the server action
    `saveReaderPosition` plus a `sendBeacon` to `/api/reader/position`.
  - **The production migration is manual:** Production Deploy runs no alembic, so the operator runs it on the
    box (`docs/current/operations.md`, the P18 and P19 notes).
- **The worker:** `server/publish.py` is one in-memory daemon thread, with no persisted jobs, claims or leases.
  So the Listen job queue is new.
- **Auth:**
  - `/api/*` takes `vk_` keys (org-level or project-bound), resolved by `server/api_auth.py:133-187`;
  - `/app/*` takes only a session (`accounts/auth.py:65-143`);
  - org keys are minted at `POST /app/credentials` (`app_api.py:415`);
  - `_resolve_readable_doc(conn, doc_id, ctx)` (`documents_api.py:193`) is the visibility gate.
- **Assets:**
  - `.assets/` is content-addressed, written once under `WRITE_LOCK`, with its own `.gitignore` of `*`
    (`assets.py:683`) and gitops's `_NEVER_STAGED_DIR` (`gitops.py:71`);
  - `_asset_response` (`documents_api.py:716-735`) reads whole files, with no Range;
  - the box image has **no ffmpeg** (`Dockerfile:18-20`), so the Mac does all encoding and the box only stores,
    lists and serves.
- **The plugin template:**
  - `server/` and `tests/` ship whole;
  - `server/main.py`, `config.py` and `documents_api.py` are byte-identical entries;
  - `root_only` opts a file out (`plugin/templates/manifest.json:211`; `scripts/plugin_parity.py:119-134`);
  - S1 mirrored. **DECOMP2 settles it once: every Listen server and test file mirrors** (main.py includes the
    router), and the Mac runner lives outside `server/`, so it never ships.
- **Edge** (`deploy/knowledge.conf`):
  - `client_max_body_size 20m` (`:135`);
  - `location /api/` goes to FastAPI (`:177`);
  - the image relay's regex goes to Next (`:243`);
  - `/app/` goes to FastAPI (`:261`).
- **Web:**
  - **The root layout** (`web/src/app/layout.tsx`) is the only layout shared by the document, chapter and book
    routes. It also wraps app, auth and marketing.
  - **The CSP nonce:** reader paths get a per-request nonce CSP (`proxy.ts:33-36`, `csp.ts:43-54`), and
    `book-top.tsx:12-15` warns that a client chunk loaded without the nonce is a violation.
  - **`reader-frame.tsx`** is client code: the top bar at 536-589, the resume pill `div.rd-resume` at 601-619,
    the bottom nav at 621-702, and the sheets inline at 704-825.
  - **The book page** is server code (`book-page.tsx`), with client rows (`chapter-rows.tsx`).
  - **No state library** is in use.
  - **Tests:** Vitest in a node environment (`web/tests/*.test.ts`), with no Playwright.
  - **`getRaw`** (`web/src/lib/knowledge/client.ts:100-112`) throws on every non-2xx response.
- **Deploy:**
  - a manual-dispatch GitHub Action, `Production Deploy` (`deploy/README.md` §6), after a push;
  - the on-box alembic step is manual;
  - the plugin release pattern is P39-hk S11: `plugin.json` (now 0.11.0), `plugin/README.md` notes, setup's
    `plugin_version`, `marketplace.json`.
- **P36-1s** (the Hermes branch) has changed only workflow files so far; its design slice has not started. Its
  later reader panel will touch `reader-frame.tsx`. That is a merge risk for whichever phase merges second; the
  dock beside Hermes is F22.

## What this slice does

You are the `P41-sr.DECOMP2` executor. Create the build slices below with `new-slice`, as bare folders, never
writing a `plan.md`. Rewrite `topics/breakdown.md` in place and update the notebook, then return the verdict.
Do not run `accept-gate`, do not commit, and do not touch product code.

### 1. Cut these slices (`python3 scripts/workflow.py new-slice --phase P41-sr …`)

Declare every one. Orders run between 60 (DECOMP2) and 9999 (REVIEW).

| id | `--kind` | `--risk` | `--order` | `--depends-on` | name |
|---|---|---|---|---|---|
| `B1` | implementation | high | 61 | none | Listen jobs, audio store and listening positions (backend core) |
| `B2` | implementation | high | 62 | B1 | Audio delivery: playlists and Range from FastAPI through the BFF and the edge |
| `B3` | implementation | low | 63 | B1 | The Mac voice runner: Ming-3.0, poll, render, upload |
| `W1` | implementation | high | 64 | B2 | The web player core: the persistent Listen, the dock, the note, Listen on a document |
| `G1` | implementation | low | 65 | B2 | Alt text that reads aloud well, and the plugin release |
| `W2` | implementation | low | 66 | W1 | Book playback, the opened player and the book landing |
| `X1` | implementation | high | 67 | B3, W2, G1 | Ship it: deploy, migrate, start the Mac runner, check Range on production |

**Risks, with their triggers** (write each beside its block):
- **B1:** a core invariant: a Postgres migration, job state transitions with leases under concurrency, and a new
  key-authenticated write surface.
- **B2:** open design: the HLS packaging of separately encoded parts (one fMP4 init per part with
  `EXT-X-DISCONTINUITY`, or packed audio) is not pinned. It is also the media path every play goes through.
- **W1:** open design: a persistent client player above the routes, in the root layout, under the reader's
  per-request nonce CSP, with a new client store and Media Session.
- **X1:** a core invariant: a production migration whose order is load-bearing, a new key, and the edge config.
- **B3, G1, W2:** `low`, with the approach pinned:
  - B3 by B1's contract and R5's Ming script;
  - G1 by the inventory;
  - W2 by the signed design and W1's architecture.

### 2. Rewrite `works/phases/active/P41-sr/topics/breakdown.md` in place

**The format.** Keep the format: `## Passes` (add the DECOMP2 line), `## Estimate`, `## Join-rebuilt artifact`,
`## Build inventory` (unchanged, plus one line saying the voice and runner are settled), one block per slice.
Every done slice keeps a one-line block: DECOMP, R1–R5, S1, D1.

**Each new block holds:** **Goal**, **Set**, **Risk** (and trigger), **spends money: no**, **Depends on**,
**Doc impact owed**.

**Goals and sets, the content to carry.** The executor of each slice still plans nothing beyond this; the
orchestrator plans each slice later.

- **B1 — the backend core.**
  - **The store:** a content-addressed audio store on disk under the content root (`_content_root`), at
    **`.audio/`**. It gets its own `.gitignore` of `*`, is never staged by gitops (beside `.assets`) and is
    written once under the write lock, like `.assets`.
  - **Postgres** (new Alembic `0007_listen.py`), holding:
    - **Listen units:** a document version, or a book from a chapter onward, in a language, with the voice
      `ming3-us_emma`;
    - **the unit's manifest:** S1 segments → segment hashes → parts of at most about 10 min, keyed by
      `sha256(spoken text + voice + language + engine version + encoder profile)`;
    - **the job queue:** job rows with a state, a lease and heartbeat, attempts, and re-queue on lease expiry;
    - **`runner_last_seen`**;
    - **`listen_positions` per user and unit:** position, speed, follow along, and the kept position (F17). It
      follows `reader_positions`' pattern.
  - **The reader API**, on `/app/listen/…` with a session:
    - start or attach a Listen for a document or for a book from a chapter, in a language;
    - read its state (F19 states, `made`, `part`, `len`, `soFar`, waiting with `runner_last_seen`);
    - save the position;
    - "update audio" when a document version changed.
  - **The runner API**, on `/api/listen/…` with an **org `vk_` key**:
    - claim a job under a lease; the job carries its spoken segments, so the Mac never reads documents
      itself;
    - heartbeat;
    - upload one part as raw `audio/mp4`, at most about 4 MB;
    - finish or fail.
  - **Visibility:** through `_resolve_readable_doc`, behind one constant 404.
  - **Without `DATABASE_URL`**, Listen answers 404 (legacy mode).
  - **The template:** mirror every server and test file, and add each to `files.identical`.
  - **Tiny core tests:** claim, lease expiry and re-queue; a part upload landing write-once; a manifest that
    changes only the edited segments' hashes. Postgres tests skip without `KB_TEST_DATABASE_URL`, as
    `test_accounts_provisioning.py` does.
  - **Set:**
    - `server/listen*.py` (new);
    - `server/main.py`, `server/config.py`, `server/gitops.py`, plus `server/persistence/models.py` if models
      live there;
    - `alembic/versions/0007_listen.py`;
    - `tests/test_listen*.py`, `tests/fixtures/listen/`;
    - their `plugin/templates/kb/` copies;
    - `plugin/templates/manifest.json`.
  - **Doc impact owed:** `backend.md`, `api.md`, `data.md`, `security.md`.
- **B2 — delivery.** It follows R3 §5 item by item:
  - FastAPI serves parts with `FileResponse` (Range, 206, 416, HEAD, `Accept-Ranges`) as `audio/mp4`;
  - an HLS playlist per Listen: `EVENT` while making, `ENDLIST` when made, `no-store`;
  - a book-from-chapter Listen is one playlist across chapters (chapters are seeks);
  - it pins the packaging so separately encoded parts play gaplessly on iOS;
  - the BFF twin route under `web/src/app/api/listen/…`: streams `upstream.body`, forwards `Range` and
    `If-Range`, passes the status and range headers through, adds HEAD, and extends `getRaw` for 206 and 416;
  - the nginx locations for the audio and playlist paths (`proxy_buffering off`);
  - the runner's upload path within the 20m cap;
  - visibility as for images;
  - **the template:** mirror.
  - **Tests:** one tiny Range test (`bytes=0-99` → 206 with `Content-Range`), and one BFF relay test in Vitest.
  - **Set:**
    - the server delivery module(s), and `server/documents_api.py` only if touched;
    - the web route files under `web/src/app/api/listen/`;
    - `web/src/lib/knowledge/client.ts`, `web/src/lib/knowledge/app.ts`;
    - `deploy/knowledge.conf`;
    - its tests;
    - template copies and `manifest.json`.
  - **Doc impact owed:** `api.md`, `operations.md`, `security.md`.
- **B3 — the Mac voice runner.**
  - **Where:** a new top-level `tools/listen-runner/`, with its own `pyproject.toml` and uv lock. Never the
    root `pyproject.toml` or `uv.lock`, and never shipped.
  - **What it does:**
    - polls `/api/listen/jobs/claim` every 15–60 s with an org `vk_` key read from a gitignored local env file;
    - renders each segment with **Ming-3.0 US_Emma** through mlx-audio, pre-splitting Korean by sentence (R5,
      `topics/voice-models.md`; R5's bench script under `.cache/p41-voices/models/_bench/` is the reference);
    - encodes parts as AAC-LC mono 48 kbps with this Mac's ffmpeg, in the packaging B2 pins;
    - uploads, heartbeats, and sends finish or fail;
    - holds idle sleep off only while rendering (`caffeinate -i`).
  - **The LaunchAgent:** a plist template and an install script that the operator runs, never auto-installed.
  - **Tests:** one tiny test of the Korean splitter.
  - **Set:** `tools/listen-runner/**`, and `.gitignore` only if its env file needs a line.
  - **Doc impact owed:** `operations.md`, `architecture.md`.
- **W1 — the player core**, built to the signed canvas under RESPECT THE DESIGN.
  - **The persistent Listen:**
    - a client store and provider mounted in the root layout, scoped so it renders only on reader paths and
      the book landing;
    - one `<audio>` with native HLS, and hls.js for browsers without it;
    - the F19 state machine;
    - Media Session (title = chapter, album = book or document, ±15 s);
    - the position saved through the B1 API, plus a pagehide beacon like `/api/reader/position`;
    - speed and follow along kept.
  - **On the reader for a loose document:**
    - the Listen control (F6, F27) and the head slot held at the tallest note;
    - the bottom-slot pill;
    - the Dock (F7);
    - ListenNote (F10, F24, F25) with `act` and `tone`;
    - the nine icons (F5);
    - the compact top-bar port (F26);
    - follow along (F12).
  - **It never reshapes the signed reader.**
  - **Tests:** a tiny Vitest test of the state machine's transitions.
  - **Verification:** in Claude in Chrome on a local dev server, with a fixture part (Operator Runtime's
    `deviceId`, never a profile signed into the operator's accounts).
  - **Set:**
    - `web/src/app/layout.tsx`;
    - `web/src/components/listen/**`, `web/src/lib/listen/**`;
    - `web/src/content/listen.ts`, `web/src/content/index.ts`;
    - `web/src/components/reader/reader-frame.tsx`, `reader.css` (or a new `listen.css`);
    - `web/src/lib/csp.ts`, `web/src/proxy.ts` if needed;
    - `web/package.json` and `web/pnpm-lock.yaml` (hls.js);
    - `web/tests/listen*.test.ts`.
  - **Doc impact owed:** `frontend.md`, `experience.md`, `product.md`.
- **G1 — writer guidance and release.**
  - **The explain skill's alt rules** (`plugin/skills/explain/SKILL.md`: the figure, figure-row, diagram, svg and
    formula passages) so alt text and a formula's `reading` read well aloud. It must stay consistent with S1's
    read and skip table.
  - **The critic's check** (`plugin/agents/explain-critic.md`).
  - **The plugin release** (P39-hk S11's pattern, the next minor version), carrying the Listen server template
    mirrored by B1 and B2.
  - **Set:**
    - `plugin/skills/explain/**`, `plugin/agents/explain-critic.md`;
    - `plugin/.claude-plugin/plugin.json`, `plugin/README.md`;
    - the marketplace file, setup's `plugin_version`, and any landing line the release pattern names.

    It never touches `plugin/templates/**`.
  - **Doc impact owed:** `product.md` (writing guidance).
- **W2 — book playback, the opened player and the landing.**
  - **Listen on a chapter:** the book from here, one playlist, and "next chapter still preparing".
  - **The opened player sheet** (F8, F28–F30, F33): Close, Escape and the scrim reveal the page unchanged; Go to
    the text; Stop listening keeps the place (F17); Speed, Follow along and Chapters with readiness.
  - **The book landing's Listen and resume** (F31), the rows' "Audio …" item, and the dock on the landing's track.
  - **The resume form** of the bottom pill.
  - **Verification:** in Claude in Chrome, as W1.
  - **Set:**
    - `web/src/components/listen/**` (the player sheet), `web/src/lib/listen/**`;
    - `web/src/components/book/**`, `web/src/lib/book/**`;
    - `web/src/components/reader/reader-frame.tsx`;
    - `web/src/content/{listen,book,reader}.ts`;
    - the CSS it needs;
    - `web/tests/listen*.test.ts`.
  - **Doc impact owed:** `frontend.md`, `experience.md`, `qa.md`.
- **X1 — ship it.**
  - **The order, written as an operator runbook in the slice plan:**
    1. The operator pushes and runs Production Deploy.
    2. They run `alembic upgrade head` (0007) on the box.
    3. They mint an org `vk_` key for the runner.
    4. They install the LaunchAgent on this Mac.
  - **Then the agent checks:**
    - `curl -H 'Range: bytes=0-99'` on a production part → `206`, with `cf-cache-status` BYPASS or DYNAMIC
      (R3 §5.4);
    - one short document is made end to end by the Mac and plays in Chrome on production;
    - the box's free disk is measured through the API or the operator, never SSH.
  - **The slice stops `pending` (`operator-action`)** for each operator step.
  - **The operations doc's phone listening check** goes in as a Doc impact line, for the docs phase.
  - **Set:** `deploy/**` (only if a step changes), `works/phases/active/P41-sr/slices/P41-sr.X1/`.
  - **Doc impact owed:** `operations.md` (the runner, the key, the migration order, the phone check),
    `decisions.md` (the voice, the Mac runner, Cloudflare's large-file term).

**Keep the existing REVIEW block**, adding the 13 iPhone checks pointer (R3 §10) and D104-vm and D105-y8 as
context.

**`## Estimate`.** Use `python3 scripts/workflow.py dispatch-summary`'s `means`, never a $ figure or tokens. It
gives:

| unit | measure |
|---|---|
| high route | 60.5 min per span |
| mid route | 13.2 min per span |
| implementation slice | 19.8 span-minutes on average |
| review slice | 186 span-minutes |

- **Per slice:** high for B1, B2, W1 and X1; mid for B3, G1 and W2. X1 adds the operator's wait time.
- **The wall clock:** from `parallel-plan`: B2 and B3 together, then W1 and G1 (with B3 if still running), then W2.

**`## Join-rebuilt artifact`.** Write: none. Only W1 touches `web/pnpm-lock.yaml`, and B3's lock is its own.

### 3. The notebook (through `phase-section` only)

- **`## Decisions`:** append one gist, `Breakdown (DECOMP2): …`, linking `topics/breakdown.md`. Include:
  - the runner (the Mac, by the voice pick);
  - the template rule (mirror all Listen server and test files; the runner in `tools/`, never shipped);
  - positions in Postgres beside `reader_positions`.
- **`## Notes for later slices`:** remove the DECOMP-era notes this pass consumes (`--list`, then
  `--entry K --remove`), each re-homed into a slice block first:
  - the box's shape;
  - the Range note's pointer (B2 now owns it);
  - the template note (settled).

  Add one note `**(from P41-sr.DECOMP2, for B1–X1)**`: P36-1s's later Hermes panel touches `reader-frame.tsx`
  (F22), a merge risk for the second phase to merge.
- **`## Now`:** rewrite: the build cut, B1 first, nothing open.
- **`## Doc impact`:** nothing. This pass changes no durable truth.

### 4. Validate and return

1. Run `python3 scripts/workflow.py validate` and `python3 scripts/workflow.py parallel-plan P41-sr`. The expected
   plan is `B1 -> B2 + B3 -> W1 + G1 (+ B3) -> W2 -> X1 -> REVIEW`.
2. Write `result.md` with the verdict block first, and the `parallel:` line.

## Verification

- `validate` reports clean, and every new slice is declared.
- `parallel-plan` prints the rounds above.
- `topics/breakdown.md` holds every section; each new block has its set, risk trigger and a `spends money:` line.
- No new slice folder has a `plan.md`.
- `git status` shows no product file changed.

## For the operator, at this gate (the executor ignores this section)

**Decided as drawn:**
- seven build slices, backend first, with the Mac as the voice runner (your pick, Ming-3.0);
- listening positions saved on the server like reading positions, so phone and Mac agree;
- Listen's server code mirrored into the plugin template, the runner kept outside it;
- one plugin release carrying the writer guidance;
- tiny core tests only;
- browser checks in the agent's Chrome;
- the iPhone screen-off check stays yours at acceptance.

**Decisions for you (two):**
1. **How the Mac runner runs.** I recommend a **LaunchAgent**:
   - it starts when you log in and asks the server for work every 30 s;
   - it keeps the Mac awake only while it renders;
   - you install it with one script, and it is never installed silently.

   The alternative is a command you start by hand when you want audio made. Then nothing renders unless you
   remember.
2. **The production steps are yours, in X1:**
   1. push;
   2. run the Production Deploy action;
   3. run the on-box `alembic upgrade head` for the new Listen tables;
   4. mint one org key for the runner in the app.

   X1 stops for each, with exact commands. Say if you want any of them done differently (for example the
   migration before the deploy, as P18 needed: the slice plan will check the order).

## Operator answers at the gate

Approved with no answers to the two decisions (2026-11-11), so the recommendations stand: the Mac runner is a LaunchAgent the operator installs with one script; X1 stops for each production step (push, Production Deploy, the on-box migration, the runner key).

## Dispatch

route=high
reason=kind decomposition
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
