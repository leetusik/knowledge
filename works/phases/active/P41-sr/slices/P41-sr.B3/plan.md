# P41-sr.B3 — The Mac voice runner: Ming-3.0, poll, render, upload

## Goal

A small program on this Mac that turns B1's queued Listen jobs into audio parts:
1. claim a job;
2. render its segments with **Ming-3.0 0.5B, voice US_Emma** (MLX, mlx-audio);
3. encode the part **exactly to B2's packaging pin**;
4. upload it, then finish or fail.

It runs under a LaunchAgent that **the operator installs**; it is never installed automatically.

Read first:
- The breakdown block: `phase-section P41-sr "P41-sr.B3 — The Mac voice runner: Ming-3.0, poll, render, upload" --topic
  breakdown`.
- `slices/P41-sr.B1/result.md` § Contract: § Runner routes and § Runner rules (polling, the heartbeat, the 409 and 404
  answers).
- `slices/P41-sr.B2/result.md` § Packaging: **the exact ffmpeg command**, the upload content type, and what the upload
  validation refuses. Encode to it byte-shape for byte-shape: the server refuses anything else with a 422.
- `topics/voice-models.md`: the Ming-3.0 sections of R5 and the Recommendation. Note:
  - the Korean pre-split (mlx-audio's splitter ignores Hangul);
  - the load time and memory;
  - the native sample rate (44.1 kHz per B2).
- R5's bench script under `.cache/p41-voices/models/_bench/`: the reference call into mlx-audio for Ming. The working
  environment is `.cache/p41-voices/venv-ming3/`; read its installed `mlx-audio` version and any workaround R5 needed.
  The model is in the Hugging Face cache, and loads offline.

## Build

**Where:** `tools/listen-runner/`, a uv project of its own: `pyproject.toml` and `uv.lock`, pinned to the mlx-audio
version R5 ran. Never the root `pyproject.toml` or `uv.lock`.
- Its virtual environment is `tools/listen-runner/.venv` (`.venv/` is ignored repo-wide).
- The root `pytest` collects only `tests/` (`pyproject.toml:39`), so the runner's own test never runs in the root
  suite. Keep it that way.

**Configuration:** from `tools/listen-runner/.env`, already gitignored by `.gitignore:17`. Confirm with
`git check-ignore`. Ship a committed `env.example` with no values:
- `KB_LISTEN_URL`, the server origin;
- `KB_LISTEN_KEY`, an org-level `vk_` key;
- optional poll and pause settings.

**Never print, log or echo the key.**

**The loop:**
- **Poll** `POST /api/listen/jobs/claim` every `KB_LISTEN_POLL_S`, 30 s by default. Back off on network errors, up to
  a few minutes.
  - `204` → sleep.
  - On a job: render the `segments` **in order**, with exactly the claim's `voice` and `profile`. If the runner cannot
    match them, call `fail` with a reason.
- **Heartbeat** from a background thread, at least every poll interval, while a job renders.
  - A `409` or `404` on heartbeat drops the job at once (§ Runner rules).
  - Hold idle sleep off only while rendering: run `caffeinate -i -w <pid>` for the render's span, or wrap the render,
    and release it after.
- **Rendering:**
  - **Korean** text (Hangul present) is pre-split into sentences before mlx-audio.
  - Insert a short pause between segments, and a longer one at a section change. You choose the lengths, recorded.
  - Send `segment_seconds` per segment, in order, **including** the pause that follows it, so B2's timeline lines up.
- **Encoding:** concatenate to one WAV at the native rate, then run B2's ffmpeg command. Write temp files under a
  temp directory and clean them up.
- **Uploading:**
  - `PUT /api/listen/parts/{part_key}` with the headers B2's § Packaging names;
  - then `finish` with `segment_seconds`;
  - a `409` "already stored" → finish; a `409` "no live lease" → drop the job (§ Runner rules).
- **Failures:** any render or encode error calls `fail` with a short message (no text excerpt in it), and the loop
  continues.
- **The model** loads once, lazily, at the first job, and stays loaded. Unload it after a long idle period if memory
  matters; your call, stated.
- **Logs:** one line per event (claimed, rendered part with its seconds and RTF, uploaded, finished, failed) to stdout.
  The LaunchAgent sends them to `~/Library/Logs/kb-listen-runner.log`. **Never log segment text.**
- **`--once`:** handle at most one job, then exit. Used for checks.

**The LaunchAgent (the operator's to install):**
- `tools/listen-runner/launchd/com.knowledge.listen-runner.plist.template`: `RunAtLoad`, `KeepAlive` on crash,
  `ThrottleInterval`, and stdout and stderr to the log.
- `tools/listen-runner/install.sh`: fills the template with absolute paths, copies it to `~/Library/LaunchAgents/`,
  and loads it with `launchctl bootstrap gui/$(id -u)`.
- `tools/listen-runner/uninstall.sh`: the reverse.
- **Do not run `install.sh`** in this slice, and do not load any LaunchAgent: X1 has the operator do it.

**`tools/listen-runner/README.md`:** setup (`uv sync`, the env file, `install.sh`), what it does, its logs, and how to
stop it. Keep it short.

## Test (tiny)

One pytest file, `tools/listen-runner/tests/test_split.py`, run with `uv run --project tools/listen-runner pytest`:
- Korean sentence splitting: `다.`, `요.`, `?` and `!` boundaries, and a long sentence without punctuation;
- an English string passes through unsplit.

## End-to-end check (the proof that the pin holds)

1. **Start a throwaway stack:**
   - Postgres in a container named **`p41-b3-pg`**, on **127.0.0.1:55453**;
   - `alembic upgrade head`;
   - a scratch API: `uv run uvicorn server.main:app --port 8793`, with `DATABASE_URL` and a **scratch `KB_ROOT` in the
     system temp directory**.

   Never use ports 8766, 3030, 3041 or 55451 (W1's), and never touch any other container.
2. **Set it up:**
   - create an account and an org-level key on that stack, the way B1's and B2's probes did;
   - write two **synthetic** native documents, one English and one Korean, a few short paragraphs each. Write the text
     yourself, never from `.cache/` excerpts.
   - start a Listen on each through `/app/listen/start`.
3. **Run the runner** with `--once` until both are made.
4. **Confirm:**
   - each upload was accepted (no 422);
   - the state reads `made`;
   - B2's playlist for each lists the parts, and `ffprobe` reads the playlist's duration;
   - each part's RTF.
5. **Listen to one Korean part yourself:** play it locally (`afplay`, to the speaker, briefly). Note whether the
   sentence pauses sound natural. This is the operator's voice by delegation, so record anything odd.
6. **Remove** the container and its own volume, stop the scratch API, and delete the scratch `KB_ROOT`.

## Validation

- `uv run --project tools/listen-runner pytest -q`;
- `uv run --project tools/listen-runner python -m <module> --help` runs;
- `bash -n tools/listen-runner/install.sh uninstall.sh`, and `plutil -lint` on a template filled with dummy paths;
- `git check-ignore tools/listen-runner/.env tools/listen-runner/.venv`;
- `git status --porcelain --untracked-files=all -- tools/listen-runner .gitignore`: only your files;
- **deferred: whole-tree**: the root pytest, the web gates, the parity scripts.

## Return

- `result.md`, with the verdict block first, then:
  - **§ Run:** what the end-to-end check measured: parts, seconds, RTF, peak memory if read;
  - **§ Operator setup:** the exact steps X1 will ask the operator to run.
- The `notebook` field holds:
  - **Notes for later slices** `(for X1)`: one gist pointing at § Operator setup;
  - **Doc impact:**
    - `operations.md`: the runner, its env file, the LaunchAgent, the logs;
    - `architecture.md`: the off-box runner;
  - **Now:** one line.

## Wave

- **set:** `tools/listen-runner/**`; `.gitignore` (only if a line is truly needed; `.env` and `.venv/` are already
  ignored).
- **Runtime resources held:**
  - the container `p41-b3-pg` on 127.0.0.1:55453;
  - the scratch API on :8793;
  - a scratch `KB_ROOT` in the system temp directory;
  - the Mac GPU while Ming renders.
- **Running beside it:**
  - **P41-sr.W1**, set: `web/src/app/layout.tsx`, `web/src/app/reader.css`, `web/src/app/(public)/[org]/[project]/[slug]/page.tsx`,
    `web/src/components/listen/**`, `web/src/components/reader/**`, `web/src/lib/listen/**`, `web/src/lib/reader/**`,
    `web/src/lib/knowledge/listen.ts`, `web/src/content/listen.ts`, `web/src/content/index.ts`, `web/src/lib/csp.ts`,
    `web/src/proxy.ts`, `web/package.json`, `web/pnpm-lock.yaml`, `web/tests/listen-player*.test.ts`.
    - Runtime: the agent's Chrome; :8766, :3030 (the operator's, never restarted) and :3041; the container `p41-w1-pg`
      on :55451; `web/node_modules`.
  - **P41-sr.G1**, set: `plugin/skills/explain/**`, `plugin/agents/explain-critic.md`, `.agents/skills/explain/SKILL.md`,
    `web/public/SKILL.md`, `plugin/.claude-plugin/plugin.json`, `plugin/README.md`, `.claude-plugin/marketplace.json`,
    `plugin/skills/setup/SKILL.md`, `web/src/content/marketing/content.ts`, `README.md` (only if it names the version).
- **Waiting commits:** none.
- **Join-rebuilt artifact:** none.
- **Checks scoped to the set:** the ones under Validation. Whole-tree checks are deferred.

## Dispatch

route=mid
reason=kind implementation rated low
subagent_type=slice-executor
model=opus
pass_model=yes
effort=medium
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
