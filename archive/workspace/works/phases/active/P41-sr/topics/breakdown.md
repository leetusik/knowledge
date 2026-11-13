# P41-sr — breakdown

`P41-sr.DECOMP` wrote this file on 2026-11-11, and `P41-sr.DECOMP2` rewrote it in place the same day, after D1's signature and the voice pick. `intent.md` is the record; this file says how the work is cut and what each slice must not trip over. Code line numbers in the build blocks are at `d6581456` (the done blocks' were at `b668d582`).

## Passes

- **DECOMP** (2026-11-11), style `build-after`, `Mockup: on request`: research first. Three research slices (R1 free voice APIs, R2 free voice models, R3 phone playback with the screen off) run as one declared wave beside the S1 groundwork (the spoken script). Then one design slice (D1: one job, one round, critique `critic`), then `DECOMP2`. No build slice is cut before the signature. Not an explain phase (no `## Explain`); the orchestrator declares the gate `--require`. `parallel-plan`: `DECOMP -> R1 + R2 + R3 + S1 -> D1 -> DECOMP2 -> REVIEW`.
  - **The voice-pick route.** After the first wave drains, the orchestrator publishes one private samples page built from `.cache/p41-voices/*/manifest.json`, each candidate's terms beside its audio. The pick is one decision in D1's round stop, with a recommendation, so the operator listens and signs in one sitting. DECOMP2 builds on the pick.
  - **Operator addition, mid-DECOMP (2026-11-11):** "I'm also thinking this mac as voice model runner. if no good from the research, consider that as well,." Folded in: R2 records each model's realistic runner (box, Mac or neither), R3 covers the Mac as an off-box runner, and build items 2–3 leave the runner open until the pick.
- **Research top-ups** (2026-11-11): R4 (the three models R2 left for disk, declared on R2) and R5 (four more Mac models, declared on R4) ran after the first wave. The operator then delegated the pick: Ming-3.0 US_Emma, on this Mac.
- **DECOMP2** (2026-11-11, plan approved at the operator's gate): cuts **seven build slices** from D1's signed round (job `11-listen`, round `01-listen`: the round `result.md` `## Build` plus `frame.md` F1–F33), the voice pick and S1/R1–R5's findings. Backend first (B1, then B2), then the runner beside the player and the writer guidance (B3 + W1 + G1), then W2, then the deploy (X1), then REVIEW.
  - **Settled here:** the runner is **this Mac**, by the pick; **every Listen server and test file mirrors** into the plugin template, and the runner lives in `tools/listen-runner/`, outside `server/`, so it never ships; **listening positions live in Postgres** beside `reader_positions`, so phone and Mac agree.
  - **The operator's gate:** approved with no answers to the two decisions, so the recommendations stand. The runner is a **LaunchAgent the operator installs with one script** (never installed silently), and **X1 stops for each production step** (push, Production Deploy, the on-box migration, the runner key).
  - **P36-1s re-checked at `d6581456`:** its branch still changes workflow files only. Its later reader panel will touch `reader-frame.tsx` (F22), a merge risk for whichever phase merges second.
  - **B3 waits for B2** (a change from the approved plan's `B2 + B3`): B3 encodes parts in the packaging B2 pins, and that packaging is B2's open design, so the two are not independent. The wall clock is unchanged: B3 (mid, short) now runs beside W1 (high, long) instead of beside B2 (high, long).
  - `parallel-plan`: `DECOMP2 -> B1 -> B2 -> B3 + W1 + G1 -> W2 -> X1 -> REVIEW`.

## Estimate

**Time** comes from `dispatch-summary`'s `means`, re-metered at DECOMP2 (2026-11-11):
- routes: high 60.0 min/span (108 spans), mid 13.2 (54), research 29.4 (16), explore 2.6;
- kinds, span-min per slice: implementation 19.8 (72 slices, 1.0 span each), review 186.0 (2.2 spans), fix 93.9, decomposition 11.6;
- **the main thread** is metered in requests, not minutes: ≈ 5–10 min of planning a slice.

| Slice | Route | Span time | Runs |
|---|---|---|---|
| B1 | high | ≈ 60–90 min: a migration, the job queue, two APIs, the store, the template mirror, Postgres tests | alone |
| B2 | high | ≈ 60–90 min: FastAPI Range, the playlist and its packaging pin, the BFF twin, nginx | alone |
| B3 | mid | ≈ 15–40 min: a new uv project, the Korean splitter, one short render smoke | beside W1 + G1 |
| W1 | high | ≈ 60–120 min: the root-layout provider under the nonce CSP, the dock, the note, a Chrome walk | beside B3 + G1 |
| G1 | mid | ≈ 15–30 min: the alt rules, the critic's Part B, the release (P39-hk.S11, the pattern, took one mid span) | beside B3 + W1 |
| W2 | mid | ≈ 20–45 min: book playback, the opened player sheet, the landing, a Chrome walk | alone |
| X1 | high | ≈ 30–60 min of span time, plus the operator's four steps | alone, with four operator stops |
| REVIEW | high, gated | ≈ 60–180 min (186 span-min per review): production, audio, a Chrome walk; the iPhone check is the operator's | alone |

- **Span time.** The build is ≈ **4.5–8 h**: four high slices ≈ 3.5–6 h, three mid ≈ 0.8–1.9 h. REVIEW adds ≈ 1–3 h. Fix slices after the review are not counted (93.9 span-min each).
- **Wall clock**, from `parallel-plan`:
  - B1 ≈ 1–1.5 h;
  - B2 ≈ 1–1.5 h;
  - B3 + W1 + G1 ≈ 1–2 h (W1 is the longest; B3 and G1 finish inside it);
  - W2 ≈ 0.3–0.75 h;
  - X1 ≈ 0.5–1 h, plus the operator's wait;
  - REVIEW ≈ 1–3 h;
  - the main thread ≈ 1–1.5 h.

  That is **≈ 6–11 h**, plus the operator's stops: X1's four steps and the iPhone acceptance.
- **Spend:** no build slice spends money (each block says so). The voice is a local, MIT-licensed model run on this Mac, whose weights are free to download. Cloudflare and the box stay on their current plans, and the runner's org key is free. Every span is the workspace's own dispatch.

## Join-rebuilt artifact

None.
- **Lockfiles.** Only W1 touches `web/pnpm-lock.yaml` (hls.js). B3's lock is its own (`tools/listen-runner/uv.lock`), never the root `uv.lock`.
- **Generated files stay inside one slice's set.** G1 regenerates `plugin/agents/explain-critic.md` from the skill's Part B (`python3 scripts/skills_parity.py --write-agents`) and refreshes the skill's two copies. B1 and B2 each mirror their own template copies. Both edit `plugin/templates/manifest.json`, in sequence (B2 depends on B1).
- **The one declared round of several is disjoint** (B3 + W1 + G1):
  - B3 is `tools/listen-runner/**` alone (a file named `.env` is already ignored repo-wide, `.gitignore:17`);
  - W1 is the web app's root layout, its Listen, reader, content and CSP files, and the web package files;
  - G1 is the plugin's skill, agent and release files, the skill's two copies and the landing's skill-length line.

  No file is in common.
- **Runtime resources in that round:**
  - **`web/.next`:** W1's dev server holds it, so G1 runs no `pnpm --dir web build` beside W1; its release gate's web checks are listed `deferred: whole-tree` for REVIEW.
  - **Ports:** a slice that starts a local server takes a free port of its own and never restarts the operator's running dev servers.
  - **The Mac's GPU:** B3's render smoke loads Ming (≈ 4.4 GB); no sibling needs the GPU.
  - **The agent's Chrome:** only W1 drives it.

## Build inventory

What the build ships, not how, one line each. DECOMP2 cut from it.

1. **The spoken script** (S1, the groundwork). It turns a document into ordered spoken segments and applies the read and skip rules.
2. **The voice engine** for the operator's pick, English and Korean, which may be two engines. It covers text normalisation, chunking to the engine's limits, and keys only in env. **The runner may be the box or the operator's Mac** (an off-box runner that uploads to the box). The choice follows the voice pick, and DECOMP2 settles it.
3. **Audio generation and its cache.** Generation runs in the background on the box, **or on the Mac with upload to the box** (the same choice as item 2). Audio is stored on the box disk, gitignored like `.assets/`, and keyed by document version, voice and language. The item also covers quota and failure handling, and how much disk it uses.
4. **Audio delivery** across the API, the BFF and the edge. It needs **HTTP Range**, the document's own visibility and auth, and cache headers.
5. **Book playback.** It plays the chapters in order in the reader's language variant, and keeps going from one chapter to the next with the screen locked.
6. **The web player**, built to the signed canvas. It includes Media Session lock-screen controls and metadata, and a resume position.
7. **Writers make alt text read aloud well.** This covers the explain skill's alt rules (`plugin/skills/explain/SKILL.md`, the figure, figure-row, diagram, svg and formula passages), the critic's check (`plugin/agents/explain-critic.md`) and a plugin release. This is the operator's "for later documents, maybe ready for the alt text".
8. **The deployment.** It adds the env keys, the box disk budget and the operations doc's phone listening check (and, if the Mac runs the voice, how the Mac runner is started and kept on).
9. **D1's one job**, critique level `critic`, a connected group of several surfaces:
   - the Listen control on a document, on a chapter (book playback from here onward) and on the book landing (the whole book, or resume);
   - the player, docked and opened;
   - its states: preparing or generating, playing, paused, moving between chapters, finished, failed or out of quota, and offline;
   - speed, and skipping back and forward;
   - how it sits with the hiding top bar, the chapter bottom nav and P36-1s's planned panel or drawer;
   - a "follow along" highlight of the block being read, as a candidate the design may take or drop;
   - phone and desktop.

   The lock screen is drawn by the OS, so it is not a canvas surface; it is build item 6.

**Settled at DECOMP2 (items 2, 3 and 8):** the voice is **Ming-3.0 0.5B US_Emma** for English and Korean, and the runner is **this Mac**. It polls the box for jobs, renders, encodes and uploads; the box only stores, lists and serves. The box-runner path waits for deferred job D104-vm.

**Every server file ships in the plugin template.** `plugin/templates/manifest.json` declares `shipped_dirs` `server` and `tests` whole, and `scripts/plugin_parity.py` (CI) fails on any file in one tree but not the other. `server/main.py`, `server/config.py`, `server/documents_api.py` and `server/publish.py` are all byte-`identical` entries, and the template ships no `web/`. So every backend build slice either mirrors its server files into `plugin/templates/kb/`, or keeps them `root_only` without a shipped file importing them. **Settled at DECOMP2: mirror** (see *P41-sr.B1*).

## Pins for the first wave (R1, R2)

Done. The excerpts stay in `.cache/p41-voices/excerpts/` and the samples' manifests in `.cache/p41-voices/{apis,models}/manifest.json`, all gitignored. No excerpt text ever enters a committed file: the repo is public.

## P41-sr.DECOMP — the first pass (done)

Research first, then D1, then DECOMP2 (see *Passes*).

## P41-sr.R1 — free voice APIs (done)

19 APIs surveyed; edge-tts and Google Translate TTS heard. Superseded by the local voice pick → `topics/voice-apis.md`.

## P41-sr.R2 — free voice models (done)

About 30 models surveyed and three run on this Mac; Supertonic 3 named for the box → `topics/voice-models.md`.

## P41-sr.R3 — phone playback with the screen off (done)

One continuous HLS source per Listen; the Range change list (§5), generate on demand (§6), the Mac runner (§7), D1's states (§9) and the operator's iPhone checks (§10) → `topics/phone-playback.md`.

## P41-sr.R4 — the models R2 left for disk (done)

Three more models run: MeloTTS KR the box's Korean fallback, OmniVoice a light Mac option, Chatterbox out → `topics/voice-models.md`.

## P41-sr.R5 — four more Mac models (done)

Fish Audio S2 Pro the best Korean, Ming-3.0 US_Emma the best English; the operator's delegated pick took Ming for both languages → `topics/voice-models.md` § Recommendation, § Round 3 (R5).

## P41-sr.S1 — the spoken script (done)

`server/spoken.py`, `spoken_script(tree, lang=, title=)` → `[{section, block, kind, lang, text}]`, mirrored into the template; its read and skip rules are in `## Decisions`.

## P41-sr.D1 — Listen design (done)

Job `11-listen`, round `01-listen`, signed "accept for the design." The build contract is the round `result.md` `## Build` plus `frame.md` F1–F33 (`docs/reference/design/jobs/11-listen/`).

## P41-sr.DECOMP2 — the build cut (this pass)

Seven build slices, B1–X1, below; see *Passes*.

## P41-sr.B1 — Listen jobs, audio store and listening positions (backend core)

- **Goal.**
  - **The store:** a content-addressed audio store on disk under the content root (`_content_root`, `server/documents_api.py:684`), at **`.audio/`**, beside `.assets/`:
    - it gets its own `.gitignore` of `*`, as `assets.py:683` writes for `.assets`;
    - gitops never stages it, beside `_NEVER_STAGED_DIR` (`gitops.py:71`, used at `:267` and `:446`);
    - it is written once, under the write lock.
  - **Postgres**, through a new Alembic `alembic/versions/0007_listen.py` (after `0006_reader_state.py`), holding:
    - **Listen units:** a document version, or a book from a chapter onward, in a language, with the voice `ming3-us_emma`;
    - **the unit's manifest:** S1 segments → segment hashes → parts of at most about 10 min, keyed by `sha256(spoken text + voice + language + engine version + encoder profile)` (R3 §6);
    - **the job queue:** job rows with a state, a lease and heartbeat, attempts, and re-queue on lease expiry (R3 §7). `server/publish.py` is one in-memory daemon thread with no persisted jobs, claims or leases, so this queue is new;
    - **`runner_last_seen`**;
    - **`listen_positions` per user and unit:** position, speed, follow along and the kept position (F17). It follows `reader_positions`' pattern (`ReaderPositionModel`, `server/persistence/models.py:284`; `reader_state.upsert_position`; `PUT /app/reader/positions`, `server/reader_api.py:952`).
  - **The reader API**, on `/app/listen/…` with a session only (`accounts/auth.py:65-143`):
    - start or attach a Listen for a document, or for a book from a chapter, in a language;
    - read its state (F19's states, `made`, `part`, `len`, `soFar`, and waiting with `runner_last_seen`);
    - save the position;
    - "update audio" when a document version changed.
  - **The runner API**, on `/api/listen/…` with an **org `vk_` key** (resolved by `server/api_auth.py:133-187`; minted at `POST /app/credentials`, `app_api.py:415`):
    - claim a job under a lease; the job carries its spoken segments, so the Mac never reads documents itself;
    - heartbeat;
    - upload one part as raw `audio/mp4`, at most about 4 MB;
    - finish or fail.
  - **Visibility:** through `_resolve_readable_doc` (`documents_api.py:193`), behind one constant 404.
  - **Without `DATABASE_URL`**, Listen answers 404 (legacy mode). Production sets it.
  - **Tiny core tests:** claim, lease expiry and re-queue; a part upload landing write-once; a manifest that changes only the edited segments' hashes. Postgres tests skip without `KB_TEST_DATABASE_URL`, as `tests/test_accounts_provisioning.py` does.
- **The template rule** (settled here; it was DECOMP's note for S1 and DECOMP2):
  - every Listen server and test file mirrors byte-identically into `plugin/templates/kb/`, with an `identical` entry in `plugin/templates/manifest.json`. `shipped_dirs` ships `server/` and `tests/` whole, and CI's `scripts/plugin_parity.py` fails on a one-sided file;
  - `server/main.py` includes the router and is byte-identical, so a shipped file must never import a root-only module;
  - `alembic/` is not a shipped dir, so `0007_listen.py` stays root-only. `server/persistence/models.py` is an `identical` entry, so a model added there mirrors.
- **Set:**
  - `server/listen*.py` (new);
  - `server/main.py`, `server/config.py`, `server/gitops.py`, `server/persistence/models.py`;
  - `alembic/versions/0007_listen.py`;
  - `tests/test_listen*.py`, `tests/fixtures/listen/`;
  - their `plugin/templates/kb/` copies, and `plugin/templates/manifest.json`.
- **Risk:** `high`. Trigger: **a core invariant**: a Postgres migration, job state transitions with leases under concurrency, and a new key-authenticated write surface.
- **spends money:** no.
- **Depends on:** none (declared; the first build slice).
- **Doc impact owed:** `backend.md`, `api.md`, `data.md`, `security.md`.

## P41-sr.B2 — Audio delivery: playlists and Range from FastAPI through the BFF and the edge

- **Goal.** R3's change list, `topics/phone-playback.md` §5 (with §7's upload), item by item. This block now owns R3's Range note (detail: `topics/notes-for-later-slices.md` § Notes for later slices 3).
  - **FastAPI** serves parts with `starlette.responses.FileResponse`, as `audio/mp4`. Starlette 1.3.1 does Range, `206` with `Content-Range`, `416` with `bytes */size`, HEAD and `Accept-Ranges` (verified locally by R3). Keep `nosniff` and the constant 404. `_asset_response` (`documents_api.py:716-735`) reads whole files with no Range; the image route can stay as it is.
  - **An HLS playlist per Listen** (`application/vnd.apple.mpegurl`): `EVENT` while making, `ENDLIST` when made, `Cache-Control: no-store`. A book-from-chapter Listen is **one playlist across chapters**: chapters are seeks, and `src` is never swapped at `ended` (R3 §3).
  - **Pin the packaging** so separately encoded parts play gaplessly on iOS: one fMP4 init per part with `EXT-X-DISCONTINUITY`, or packed audio. **B3 encodes to this pin**, so B2 records it (container, init handling, segmenting, the encoder settings) in `## Decisions`, with a note for B3.
  - **The BFF twin** under `web/src/app/api/listen/…`, on the image relay's pattern (`web/src/app/api/documents/[id]/assets/[file]/route.ts:54,67`):
    - it forwards `Range` and `If-Range`;
    - it returns the upstream status (200, 206 or 416) and passes `Content-Range`, `Content-Length`, `Accept-Ranges`, `ETag` and `Last-Modified` through;
    - it streams `upstream.body`, never `arrayBuffer()`;
    - it adds a `HEAD` handler;
    - it extends `getRaw` (`web/src/lib/knowledge/client.ts:100-112`), which sends only the bearer and throws on every non-2xx, for 206 and 416;
    - an audio response carries no `Content-Encoding` under `next start`.
  - **nginx** (`deploy/knowledge.conf`): a regex location for the audio and playlist paths, like the image relay's (`:243`), with `proxy_buffering off`. Without one, the path falls into `location /api/` (`:177`). The runner's upload path stays within `client_max_body_size 20m` (`:135`), with parts of at most about 10 min.
  - **Visibility:** as for images. The BFF unseals `knowledge_session` and forwards the bearer, and FastAPI resolves through `_resolve_readable_doc`. If the iPhone check later shows cookie-less media requests, the fallback is signed part URLs (R3 §5.5).
  - **The template:** mirror the server and test files, as B1.
  - **Tests:** one tiny Range test (`bytes=0-99` → 206 with `Content-Range`), and one BFF relay test in Vitest.
- **Set:**
  - the server delivery module(s), and `server/documents_api.py` only if touched;
  - the web route files under `web/src/app/api/listen/`;
  - `web/src/lib/knowledge/client.ts`, `web/src/lib/knowledge/app.ts`;
  - `deploy/knowledge.conf`;
  - its tests (`tests/test_listen*.py`, `web/tests/listen*.test.ts`);
  - their `plugin/templates/kb/` copies, and `plugin/templates/manifest.json`.
- **Risk:** `high`. Trigger: **open design**: the HLS packaging of separately encoded parts is not pinned, and this is the media path every play goes through.
- **spends money:** no.
- **Depends on:** B1.
- **Doc impact owed:** `api.md`, `operations.md`, `security.md`.

## P41-sr.B3 — The Mac voice runner: Ming-3.0, poll, render, upload

- **Goal.**
  - **Where:** a new top-level `tools/listen-runner/`, with its own `pyproject.toml` and uv lock. Never the root `pyproject.toml` or `uv.lock`, and never shipped (outside `server/`).
  - **What it does:**
    - polls `/api/listen/jobs/claim` every 15–60 s, with an org `vk_` key read from a gitignored local env file;
    - renders each segment with **Ming-3.0 US_Emma** through mlx-audio, pre-splitting Korean by sentence, because mlx-audio's splitter ignores Hangul (R5, `topics/voice-models.md`; R5's bench script under `.cache/p41-voices/models/_bench/` is the reference);
    - encodes parts as AAC-LC mono 48 kbps with this Mac's ffmpeg, **in the packaging B2 pins**;
    - uploads, heartbeats, and sends finish or fail (B1's runner API);
    - holds idle sleep off only while rendering (`caffeinate -i`).
  - **The LaunchAgent** (the operator's gate: the recommendation stands): a plist template and an install script that the operator runs. It starts at login and polls about every 30 s. It is never installed automatically.
  - **Tests:** one tiny test of the Korean splitter.
- **Set:** `tools/listen-runner/**`, and `.gitignore` only if its env file needs a line (a file named `.env` is already ignored repo-wide, `.gitignore:17`).
- **Risk:** `low` (the mid row). The approach is pinned by B1's contract, B2's packaging and R5's Ming script.
- **spends money:** no.
- **Depends on:** B1, B2 (the packaging pin).
- **Doc impact owed:** `operations.md`, `architecture.md`.

## P41-sr.W1 — The web player core: the persistent Listen, the dock, the note, Listen on a document

- **Goal.** Built to the signed canvas under **RESPECT THE DESIGN** (job `11-listen`, round `01-listen`: `## Build` plus `frame.md`).
  - **The persistent Listen:**
    - a client store and provider mounted in the root layout (`web/src/app/layout.tsx`, the only layout the document, chapter and book routes share; it also wraps app, auth and marketing), scoped so it renders only on reader paths and the book landing;
    - the reader paths' per-request nonce CSP (`proxy.ts:33-36`, `csp.ts:43-54`) holds: a client chunk loaded without the nonce is a violation (`book-top.tsx:12-15`). No state library is in use today;
    - one `<audio>` with native HLS, and hls.js for browsers without it;
    - the F19 state machine;
    - Media Session (title = chapter, album = book or document, ±15 s);
    - the position saved through B1's API, plus a pagehide beacon like `/api/reader/position`;
    - speed and follow along kept.
  - **On the reader for a loose document:**
    - the Listen control (F6, F27), and the head slot held at the tallest note;
    - the bottom-slot pill (the resume pill is `div.rd-resume`, `reader-frame.tsx:601-619`);
    - the Dock (F7);
    - ListenNote (F10, F24, F25), with `act` and `tone`;
    - the nine icons (F5);
    - the compact top-bar port (F26; the top bar is `reader-frame.tsx:536-589`);
    - follow along (F12).
  - **It never reshapes the signed reader.**
  - **Tests:** a tiny Vitest test of the state machine's transitions (`web/tests/*.test.ts`, node environment; there is no Playwright).
  - **Verification:** in Claude in Chrome on a local dev server, with a fixture part, in the agent's Chrome by the `deviceId` in `## Operator Runtime`, never a profile signed into the operator's accounts.
- **Set:**
  - `web/src/app/layout.tsx`;
  - `web/src/components/listen/**`, `web/src/lib/listen/**`;
  - `web/src/content/listen.ts`, `web/src/content/index.ts`;
  - `web/src/components/reader/reader-frame.tsx`, `reader.css` (or a new `listen.css`);
  - `web/src/lib/csp.ts`, `web/src/proxy.ts` if needed;
  - `web/package.json` and `web/pnpm-lock.yaml` (hls.js);
  - `web/tests/listen*.test.ts`.
- **Risk:** `high`. Trigger: **open design**: a persistent client player above the routes, in the root layout, under the reader's per-request nonce CSP, with a new client store and Media Session.
- **spends money:** no.
- **Depends on:** B2.
- **Doc impact owed:** `frontend.md`, `experience.md`, `product.md`.

## P41-sr.G1 — Alt text that reads aloud well, and the plugin release

- **Goal.**
  - **The explain skill's alt rules** (`plugin/skills/explain/SKILL.md`: the figure, figure-row, diagram, svg and formula passages), so that alt text and a formula's `reading` read well aloud. They stay consistent with S1's read and skip table (`## Decisions`).
  - **The critic's check.** `plugin/agents/explain-critic.md`'s body is generated from the skill's Part B, so the check is written in Part B and the agent regenerated with `python3 scripts/skills_parity.py --write-agents`.
  - **The plugin release**, on P39-hk.S11's pattern, as the next minor version after 0.11.0. It carries the Listen server template mirrored by B1 and B2. S11's pattern touched:
    - `plugin/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `plugin/README.md` (updated in place);
    - setup's `plugin_version` (`plugin/skills/setup/SKILL.md`);
    - the skill's two copies, `.agents/skills/explain/SKILL.md` and `web/public/SKILL.md`;
    - the landing's skill-length line (`web/src/content/marketing/content.ts:261`, "2,722 lines" today).
  - **Checks:** `python3 scripts/skills_parity.py`, `python3 scripts/plugin_parity.py`; the release gate's whole-tree checks (the full pytest, the web lint, test and build) are listed `deferred: whole-tree` for REVIEW while W1 runs.
- **Set:**
  - `plugin/skills/explain/**`, `plugin/agents/explain-critic.md`;
  - `.agents/skills/explain/SKILL.md`, `web/public/SKILL.md`;
  - `plugin/.claude-plugin/plugin.json`, `plugin/README.md`, `.claude-plugin/marketplace.json`;
  - `plugin/skills/setup/SKILL.md` (`plugin_version`);
  - `web/src/content/marketing/content.ts` (the landing line);
  - the root `README.md` only if it names the version.

  It never touches `plugin/templates/**`.
- **Risk:** `low` (the mid row). The approach is pinned by the inventory and S11's pattern.
- **spends money:** no.
- **Depends on:** B2 (the release carries B1's and B2's template).
- **Doc impact owed:** `product.md` (the writing guidance).

## P41-sr.W2 — Book playback, the opened player and the book landing

- **Goal.** Built to the signed canvas under **RESPECT THE DESIGN**, on W1's architecture.
  - **Listen on a chapter:** the book from here, one playlist, and "next chapter still preparing".
  - **The opened player sheet** (F8, F28–F30, F33): Close, Escape and the scrim reveal the page unchanged; Go to the text; Stop listening keeps the place (F17); Speed, Follow along and Chapters with readiness.
  - **The book landing's Listen and resume** (F31), the rows' "Audio …" item, and the dock on the landing's track. The book page is server code (`book-page.tsx`), with client rows (`chapter-rows.tsx`).
  - **The resume form** of the bottom pill.
  - **Verification:** in Claude in Chrome, as W1.
- **Set:**
  - `web/src/components/listen/**` (the player sheet), `web/src/lib/listen/**`;
  - `web/src/components/book/**`, `web/src/lib/book/**`;
  - `web/src/components/reader/reader-frame.tsx`;
  - `web/src/content/{listen,book,reader}.ts`;
  - the CSS it needs;
  - `web/tests/listen*.test.ts`.
- **Risk:** `low` (the mid row). The approach is pinned by the signed design and W1's architecture.
- **spends money:** no.
- **Depends on:** W1.
- **Doc impact owed:** `frontend.md`, `experience.md`, `qa.md`.

## P41-sr.X1 — Ship it: deploy, migrate, start the Mac runner, check Range on production

- **Goal.**
  - **The order, written as an operator runbook in the slice plan** (the operator's gate: X1 stops for each step):
    1. The operator pushes and runs Production Deploy (the manual-dispatch GitHub Action, `deploy/README.md` §6).
    2. They run `alembic upgrade head` (0007) on the box. Production Deploy runs no alembic (`docs/current/operations.md`, the P18 and P19 notes). The slice plan checks whether the migration must come before the deploy, as P18 needed.
    3. They mint an org `vk_` key for the runner.
    4. They install the LaunchAgent on this Mac.
  - **Then the agent checks:**
    - `curl -H 'Range: bytes=0-99'` on a production part → `206`, with `cf-cache-status` BYPASS or DYNAMIC (R3 §5.4), plus R3 §10's pre-checks (416, HEAD, no `Content-Encoding`);
    - one short document is made end to end by the Mac and plays in Chrome on production;
    - the box's free disk is measured through the API or by the operator, **never SSH**. The box's CPU and RAM are still recorded nowhere; only a server-side voice (D104-vm) would need them.
  - **The slice stops `pending` (`operator-action`)** for each operator step.
  - **The operations doc's phone listening check** goes in as a Doc impact line, for the docs phase.
- **Set:** `deploy/**` (only if a step changes), `works/phases/active/P41-sr/slices/P41-sr.X1/`.
- **Risk:** `high`. Trigger: **a core invariant**: a production migration whose order is load-bearing, a new key, and the edge config.
- **spends money:** no.
- **Depends on:** B3, W2, G1.
- **Doc impact owed:** `operations.md` (the runner, the key, the migration order, the phone check); `decisions.md` (the voice, the Mac runner, Cloudflare's large-file term, R3 §5.4).

## P41-sr.REVIEW — phase review

- **Gated** (`--require`). Screen-off playback on a real iPhone is the operator's check at the acceptance walkthrough; no agent instrument stands in for it.
- **The operator's 13 iPhone checks:** `topics/phone-playback.md` §10, with the agent's production curl checks before them.
- **The browser:** the agent's Chrome by the `deviceId` in `## Operator Runtime`. In R3's run no browser was connected, so confirm it first.
- **Deferred whole-tree checks** from the B3 + W1 + G1 round (G1's release gate: the full pytest, the web lint, test and build) run here.
- **Context, not findings:** the operator deferred other voices and a server-side voice (D104-vm) and the podcast feed (D105-y8). Their absence is as signed.
- **spends money:** no.
