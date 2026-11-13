# P41-sr.B3: result

## Verdict

- **status:** done
- **route:** mid
- **model:** opus
- **effort:** medium
- **summary:** Built the Mac voice runner in `tools/listen-runner/`, a uv project of its own pinned to R5's environment
  (mlx-audio 0.6.5, mlx 0.32.4). It claims B1's jobs, renders them with Ming-3.0 US_Emma (Korean pre-split into
  sentence packs of 100 characters or fewer), and encodes each part with B2's exact ffmpeg command. It then uploads,
  heartbeats and finishes or fails. It also ships the LaunchAgent template, `install.sh` and `uninstall.sh` (not run),
  and a README. On a throwaway stack, all 11 parts of one English and one Korean synthetic document uploaded with 201
  (no 422), and both read `made`. `ffprobe` read each playlist at exactly the timeline's length. The RTF was 0.41–0.45.
- **files_changed** (all new):
  - `tools/listen-runner/pyproject.toml`, `uv.lock`, `env.example`, `README.md`, `install.sh`, `uninstall.sh`;
  - `tools/listen-runner/launchd/com.knowledge.listen-runner.plist.template`;
  - `tools/listen-runner/src/listen_runner/{__init__,__main__,api,encode,split,voice}.py`;
  - `tools/listen-runner/tests/test_split.py`;
  - this `result.md`.
  - `.gitignore` is untouched: `.env` and `.venv/` were already ignored.
- **validation:**
  - `cd tools/listen-runner && uv run pytest -q`: 3 passed. **PASS.**
    - `uv run --project tools/listen-runner pytest -q tools/listen-runner/tests`: 3 passed. **PASS.**
    - The plan's literal form, from the repo root with no path, collects the **root** `tests/` with the runner's
      venv and errors (Deviation 1).
  - `uv run --project tools/listen-runner python -m listen_runner --help`: runs. **PASS.**
  - `bash -n tools/listen-runner/install.sh tools/listen-runner/uninstall.sh`: **PASS.**
  - `plutil -lint` on the template filled with dummy paths: OK. **PASS.**
  - `git check-ignore tools/listen-runner/.env tools/listen-runner/.venv`: both ignored. **PASS.**
  - `git status --porcelain --untracked-files=all -- tools/listen-runner .gitignore`: only this slice's 15 files.
    **PASS.**
  - `python3 scripts/workflow.py validate`: "Workflow validation passed". The only warning was already there
    (oversized doc sections).
  - The end-to-end check (§ Run): **PASS.**
  - deferred: whole-tree (the root pytest, the web gates, the parity scripts).
- **deviations:** 4, in § Deviations. The heading heuristic stands in for a section field the claim does not carry.
  The scratch `KB_ROOT` could not be deleted: `rm -rf` was denied by permissions.
- **doc_impact:** none written to `phase.md` (a wave); the lines are under `notebook` → Doc impact.
- **notebook:**
  - **Decisions:**
    - `Mac runner (B3): tools/listen-runner (own uv project, mlx-audio 0.6.5); Korean pre-split into ≤100-char sentence packs; pauses 0.35 s after a segment, 0.9 s before a heading (inferred: the claim carries no section), 0.1 s between packs, on top of Ming's ~0.3 s tail; reseed 0 per call; model loads lazily, unloads after 30 min idle → slices/P41-sr.B3/result.md`
  - **Notes for later slices:**
    - `**(from P41-sr.B3, for P41-sr.X1)** The operator's runner install is slices/P41-sr.B3/result.md § Operator setup: uv sync, .env from env.example with an org vk_ key, a --once check, then install.sh (never run by an agent). Logs: ~/Library/Logs/kb-listen-runner.log.`
    - `**(from P41-sr.B3, for P41-sr.REVIEW)** The claim gives segments as {text} only, so the runner infers section changes from heading-like lines (short, no closing punctuation). If the claim later carries section, the runner already prefers it (is_section_start). Deferred-job candidate: expose section/kind per segment in the claim.`
  - **Doc impact:**
    - `- operations.md: the Mac voice runner tools/listen-runner (uv sync; .env from env.example: KB_LISTEN_URL, KB_LISTEN_KEY org vk_, optional poll/pause/unload settings), the LaunchAgent com.knowledge.listen-runner installed by the operator with install.sh (RunAtLoad, KeepAlive on crash, ThrottleInterval 30) and removed with uninstall.sh, logs at ~/Library/Logs/kb-listen-runner.log, caffeinate -i only while rendering (P41-sr.B3)`
    - `- architecture.md: Listen's voice runs off-box: a Mac runner (Ming-3.0 US_Emma on MLX) polls the box's /api/listen/jobs/claim with an org vk_ key, renders, encodes to B2's fMP4 pin with ffmpeg aac_at, uploads to /api/listen/parts and finishes; the box never renders (P41-sr.B3)`
  - **Now:**
    - `B3 landed: the Mac runner (tools/listen-runner): Ming-3.0 US_Emma, Korean packs, B2's ffmpeg pin, heartbeat/finish/fail, LaunchAgent template + install.sh for the operator (X1). E2E: 11/11 parts 201, both docs made, RTF ~0.42.`
  - **Operator Questions:** none.

## Run

The throwaway stack:

- `postgres:17` as `p41-b3-pg` on 127.0.0.1:55453, migrated with `alembic upgrade head` (through `0007_listen`);
- `uvicorn server.main:app` on 127.0.0.1:8793, with:
  - a scratch `KB_ROOT` under `$TMPDIR`;
  - `KB_GIT_COMMIT=0` and `KB_GIT_PUSH=0`;
  - no Gemini keys in its environment;
  - `KB_LISTEN_PART_CAP_S=20`, so each document makes several parts.

The setup followed B2's probe:

1. Signed up an account.
2. Wrote two **synthetic** native documents of my own straight into the scratch SQLite: one in English (three
   sections) and one in Korean (three sections; sentences ending in `다.`, `요.`, `?` and `!`).
3. Minted an org `vk_` key into a 0600 scratch env file. It was never printed, and the file was deleted after.
4. Started a Listen on each with `/app/listen/start`. English needed 6 parts and Korean 5.

**The runner, run with `--once`** 12 times, made 11 jobs and then logged one `idle`. Every upload got **201**, with
no 422.

| Lang | Segments | Audio s (runner) | Measured s (server) | Render s | RTF | Bytes | MLX peak GB |
|---|---|---|---|---|---|---|---|
| ko | 2 | 5.92 | 5.992 | 2.4 | 0.410 | 38,890 | 4.07 |
| ko | 2 | 11.72 | 11.774 | 4.9 | 0.419 | 74,645 | 4.36 |
| ko | 1 | 11.30 | 11.356 | 4.8 | 0.428 | 71,993 | 4.27 |
| ko | 3 | 17.17 | 17.231 | 7.1 | 0.415 | 108,337 | 4.30 |
| ko | 2 | 9.32 | 9.382 | 3.8 | 0.409 | 59,471 | 4.27 |
| en | 2 | 5.12 | 5.180 | 2.1 | 0.409 | 33,734 | 4.00 |
| en | 2 | 10.22 | 10.288 | 4.3 | 0.423 | 65,216 | 4.11 |
| en | 1 | 8.80 | 8.848 | 3.9 | 0.445 | 56,117 | 4.16 |
| en | 2 | 10.72 | 10.776 | 4.5 | 0.424 | 68,310 | 4.10 |
| en | 1 | 6.80 | 6.851 | 2.9 | 0.433 | 43,413 | 4.22 |
| en | 2 | 8.52 | 8.593 | 3.5 | 0.413 | 54,462 | 4.22 |

- **Model load:** 0.8 s warm, every `--once` process. A cold load was 4.3 s in the first probe.
- **The server's measured seconds** run 50–70 ms over the WAV. That is the `aac_at` priming B2 recorded.
- **State and playlists:**
  - **English:** state `made`, 6 of 6. `len` 50.535. The playlist has 6 `EXT-X-MAP` and `ENDLIST`. The timeline is
    50.535328 and complete, with every part `timed: true`. **`ffprobe` on the playlist: 50.535328.**
  - **Korean:** state `made`, 5 of 5. `len` 55.735. The playlist has 5 maps and `ENDLIST`. The timeline is
    55.735147 and complete, with every part timed. **`ffprobe`: 55.735147.**
- **The logs:** 68 lines. None holds the key, `vk_`, or any document text (grep-checked).
- **The Korean part, heard:** `afplay -t 5` played the 11.3 s Korean part (the paragraph with `요.`, `?` and `!`) to
  the speaker. The command ran, but **I cannot hear audio**, so there is no ear judgment here. The operator's ear at
  X1 is the real check.
  - What I measured instead, with `silencedetect` at -40 dB, ≥ 0.2 s:
    - between sentences, 0.20–0.50 s;
    - between paragraphs (segments), 0.8 s;
    - before a heading, 1.1–1.2 s;
    - after a heading, about 0.85 s.
  - Each Korean part's length matched its character estimate (7.5 cps): 11.3 s against 12.3 s estimated. That is no
    sign of R5's 15 s truncation.
  - Not run: a Whisper check. No Whisper weights are cached locally (R5's `_weights/` is empty), and downloading them
    was out of scope.
- **Not exercised live:** the `fail` path (an unsupported voice or profile), a 409 or 404 on heartbeat, and
  "already stored". They are code paths from B1's § Runner rules, and none was triggered on the stack.
- **Teardown:**
  - uvicorn stopped, and :8793 is closed;
  - `docker rm -f -v p41-b3-pg` done, with no `p41-b3` container left;
  - the scratch env file holding the key is deleted.
  - **Not deleted:** the scratch `KB_ROOT`, `/var/folders/_3/xjzt23013c792mp64_80srbw0000gp/T/p41-b3-kbroot.pfEQ4ZVz4k`.
    `rm -rf` was denied by the permission system. It holds only the synthetic documents, a scratch SQLite and 11
    synthetic audio parts. The orchestrator or operator can remove it with `rm -rf` on that path.
- The e2e drivers are in the session scratchpad: `b3/setup.py`, `b3/check.py`, `b3/run.log`.

## Operator setup

These are the steps X1 asks the operator to run. No agent runs `install.sh`.

1. `cd tools/listen-runner && uv sync`. This creates its own `.venv`. The Ming-3.0 weights are already in this Mac's
   Hugging Face cache; a fresh Mac fetches 2.8 GB on the first job.
2. Mint an **org-level** key: the dashboard's org credentials, or `POST /app/credentials` signed in.
3. `cp env.example .env`, then fill these two values:
   - `KB_LISTEN_URL=https://<the server origin>`;
   - `KB_LISTEN_KEY=vk_…`.

   `.env` is gitignored, and `install.sh` sets it to 0600.
4. Check it once: `uv run python -m listen_runner --once`. It prints `start` and then either `idle` or one job's
   `claimed` … `finished`.
5. `./install.sh`. It fills the template into `~/Library/LaunchAgents/com.knowledge.listen-runner.plist`,
   `plutil -lint`s it, and loads it with `launchctl bootstrap gui/$(id -u)`. It starts at login and restarts on a crash.
6. Watch it: `tail -f ~/Library/Logs/kb-listen-runner.log`.
7. To stop it:
   - `launchctl bootout gui/$(id -u)/com.knowledge.listen-runner` stops it until the next login;
   - `./uninstall.sh` removes it.

## Deviations

1. **The test command.** From the repo root, `uv run --project tools/listen-runner pytest -q` with no path picks up
   the root `pyproject.toml`'s pytest config (`testpaths = ["tests"]`), so it collects the root suite. That fails with
   26 collection errors in the runner's venv. The working forms are `cd tools/listen-runner && uv run pytest -q`, or
   passing `tools/listen-runner/tests`. The root suite still never collects the runner's test.
2. **Section changes are inferred.** B1's claim gives `segments: [{"text"}]` only. The `section` and `kind` fields
   stay on the server (`listen_jobs.py:526`), and the server is outside this slice's set.
   - The runner treats a short line (≤ 80 characters, ≤ 12 words) with no closing punctuation as a heading. It adds
     0.9 s before a heading and about 0.6 s after one.
   - If the claim ever carries `section`, `is_section_start` uses it instead.
   - A list item without a period also reads as a heading. That only lengthens its pause.
   - Deferred-job candidate: carry `section` (or `kind`) per segment in the claim.
3. **The pause lengths** (my choice, recorded):
   - 0.35 s after a segment;
   - 0.9 s before a heading;
   - 0.1 s between Korean packs.

   These all come on top of the roughly 0.3 s tail that mlx-audio keeps when it trims each call's silence.
   - **Seed:** `mx.random.seed(0)` before every voice call. This is R5's voice-consistency approach.
   - **The model** unloads after 30 minutes idle (`KB_LISTEN_IDLE_UNLOAD_S`). Its footprint reaches 12 GB with MLX's
     cache, so it is not held all day beside the VM.
4. **Teardown is incomplete:** the scratch `KB_ROOT` could not be deleted, because `rm -rf` was denied (see § Run).

Other choices:

- **HTTP** uses the standard library's urllib, so no requests or httpx dependency.
- **The WAV** is 16-bit PCM from the stdlib `wave` module. `aac_at` takes s16 anyway.
- **The LaunchAgent** runs `.venv/bin/python -m listen_runner` directly, so there is no `uv` at each start. It sets
  its own `PATH` to include Homebrew's ffmpeg.
- **A 401 or 403 on claim** (a bad key) logs and waits 5 minutes rather than exiting. A crash-restart loop would
  spam the log.
- **A network error mid-job** is logged. The lease then expires and the job is claimed again (attempts count).
- **Failure messages** carry the stage and the exception type only (`render failed: ValueError`), never text.
