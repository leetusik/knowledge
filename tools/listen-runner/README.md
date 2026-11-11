# listen-runner

The Mac voice runner for Listen. It polls the knowledge server for queued Listen jobs, reads each part aloud with
**Ming-3.0 0.5B, voice US_Emma** (MLX, through mlx-audio), encodes it to the server's pinned packaging (fragmented
MP4, AAC-LC mono 48 kbps, ffmpeg `aac_at`), uploads it, and reports the job finished or failed. Nothing is rendered on
the server; a Listen queued while this Mac is off waits until the runner is next up.

Needs: Apple silicon, `uv`, Homebrew `ffmpeg` (with `aac_at`), about 4.5 GB of free unified memory while rendering,
and the Ming-3.0 weights (`mlx-community/Ming-3.0-tts-0.5B-bf16`, 2.8 GB; fetched into the Hugging Face cache on the
first job if missing).

## Setup

```sh
cd tools/listen-runner
uv sync                          # its own .venv, pinned to mlx-audio 0.6.5
cp env.example .env              # gitignored; fill KB_LISTEN_URL and KB_LISTEN_KEY (an org-level vk_ key)
uv run python -m listen_runner --once   # optional: handle one job (or none) and exit
./install.sh                     # install and start the LaunchAgent (starts at login, restarts on a crash)
```

## Settings (`.env`)

| Setting | Default | |
|---|---|---|
| `KB_LISTEN_URL` | (required) | the server origin |
| `KB_LISTEN_KEY` | (required) | an org-level `vk_` key; never printed or logged |
| `KB_LISTEN_POLL_S` | 30 | the claim poll and the heartbeat interval |
| `KB_LISTEN_PAUSE_S` | 0.35 | silence added after a segment |
| `KB_LISTEN_SECTION_PAUSE_S` | 0.9 | silence added before a heading |
| `KB_LISTEN_SENTENCE_PAUSE_S` | 0.1 | silence added between Korean sentence packs |
| `KB_LISTEN_IDLE_UNLOAD_S` | 1800 | unload the model after this long without a job |
| `KB_LISTEN_SEED` | 0 | the seed set before every voice call |
| `KB_LISTEN_MODEL` | `mlx-community/Ming-3.0-tts-0.5B-bf16` | |
| `KB_LISTEN_FFMPEG` | `ffmpeg` on PATH, else `/opt/homebrew/bin/ffmpeg` | |

Ming already ends each call with about 0.3 s of silence, so the heard gaps are about 0.4 s between sentences,
0.65 s between paragraphs and 1.2 s before a heading.

## What it does

Each poll claims one job. It renders the job's segments in order (Korean text is split into sentence packs of at most
100 characters first, because mlx-audio's splitter ignores Hangul), keeps the lease alive with a heartbeat thread,
holds idle sleep off with `caffeinate -i` only while rendering, encodes, uploads, and finishes with one duration per
segment. A render or encode error calls `fail` (the server retries up to three claims); a lost lease drops the job.

## Logs

One line per event (`claimed`, `model-loaded`, `rendered` with seconds and RTF, `uploaded`, `finished`, `failed`,
`dropped`) to `~/Library/Logs/kb-listen-runner.log`. No text of the document is ever logged.

```sh
tail -f ~/Library/Logs/kb-listen-runner.log
```

## Stop it

```sh
launchctl bootout gui/$(id -u)/com.knowledge.listen-runner   # stop until the next install or login
./uninstall.sh                                               # stop and remove the LaunchAgent
```

Tests: `cd tools/listen-runner && uv run pytest -q`.
