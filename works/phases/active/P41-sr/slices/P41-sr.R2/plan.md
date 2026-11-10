# P41-sr.R2 — free voice models: run them, Korean, the box (research)

## Goal

This slice finds the free, open text-to-speech **models** that could voice Listen. It runs the best
ones here, and records for each where it would realistically run: the shared Oracle box, **this Mac**
(the operator's named fallback runner, `intent.md` *Scope Added at Execution* A), or neither. It is
findings only: no product code, and no edits to `server/`, `web/`, `plugin/`, `pyproject.toml` or
`uv.lock`.

Read these first:
- `intent.md`: *Confirmed Intent*, *Scope Added at Execution* A, and *Notes*.
- The breakdown's *Pins for the first wave* and `## P41-sr.R2`, via `phase-section … --topic
  breakdown`.

## Inputs

- **The excerpts, read-only and shared with R1.**
  - `.cache/p41-voices/excerpts/en.txt` and `ko.txt`; their source is in `sources.json`.
  - **Never paste their text** into any committed file. The repo is public.
- **This Mac.** An Apple M3 Pro with 36 GB. `ffmpeg`/`ffprobe` are at `/opt/homebrew/bin`, and `uv`
  is at `~/.local/bin/uv`.
- **The box.** A shared Oracle Cloud ARM box (aarch64) that also hosts the operator's other apps. Its
  OCPU and RAM are **unknown**, so record an Operator Question and project from the Mac's CPU numbers.
  **Never SSH to it.**

## Steps

1. **Survey the open TTS models as of 2026-11.** Cover the latest, the trending (the Hugging Face
   trending TTS list, the release notes) and the light ones.
   - **Start from:** Supertonic 3 and Kokoro 82M.
   - **Weigh at least:** MeloTTS (Korean), Kitten TTS, Piper, Chatterbox (multilingual), CosyVoice,
     F5-TTS, Orpheus (and its multilingual variants), XTTS-v2, Fish-Speech / OpenAudio, Spark-TTS,
     IndexTTS, Dia, VibeVoice, Higgs Audio, NeuTTS. Add anything newer.
   - **For each, record:**
     - Korean: officially supported, community, or none;
     - English quality;
     - licence for personal use;
     - parameters and size on disk;
     - CPU feasibility;
     - Apple-GPU path (MLX via `mlx-audio`, or PyTorch MPS);
     - whether it needs a reference voice.
   - **No voice cloning of any real person.** Use built-in or default speakers only.
2. **Run the viable ones.** Up to about 6:
   - at least two light ones that could run on an ARM CPU box;
   - up to four heavier ones, for the Mac's GPU.
   - An English-only model may still compete for the English voice.
   - **For each model run:**
     - **Environment.** Use its own uv venv at `.cache/p41-voices/venv-<model>/`; uv may fetch another
       Python if a model needs one.
     - **Weights** go in the user-level Hugging Face cache or under `.cache/`. Keep the total download
       to about 20 GB, and say so if you stop adding models for disk.
     - **Samples.** Render both excerpts, or English only if the model has no Korean, to
       `.cache/p41-voices/models/<id>-<lang>[-<voice>].<ext>` (MP3 or m4a, through `ffmpeg`).
     - **Measure:**
       - load time;
       - the real-time factor on CPU, and on the GPU where a path exists. Take the best of 3 and note
         that R1 and R3 run beside you, so timings are noisy;
       - peak memory (`/usr/bin/time -l`);
       - the characters per second it renders.
3. **Book math.** For 130k and 300k characters, give the time to render on the Mac's CPU, on its GPU,
   and on an ARM box projected from the CPU number per core. State the assumption.
4. **Judge the runner.** For each model, choose box, Mac or neither, and say why: speed, memory and
   licence. Say what the Mac path needs: the Mac on, and a job waiting until it is.
5. **The manifest.** Write `.cache/p41-voices/models/manifest.json` in the pinned shape, one entry per
   model and language: `id`, `name`, `kind` (`model`), `runner` (`box`, `mac` or `neither`), `official`
   (null), `lang`, `voice`, `file`, `seconds`, `terms` (local, nothing leaves the machine), `billing`
   (none), `licence`, `notes` (RTF, memory).
6. **Write `works/phases/active/P41-sr/topics/voice-models.md`.**
   - a summary table: model, Korean, licence, size, CPU RTF, GPU RTF, peak memory, runner, and the
     sample files;
   - one short section per model run;
   - the models surveyed but not run, and why;
   - your recommendation of the best free model for English and for Korean, with its runner;
   - the box's projected fit;
   - sources.

## Return (wave rules: you write no `phase.md`)

- Write `result.md` with the verdict block first.
- The `notebook` field holds:
  - **Notes for later slices**, `**(from P41-sr.R2, for D1, DECOMP2)**`: gists that link
    `topics/voice-models.md`;
  - **Operator Questions:** **one** on the box's shape (OCPU and RAM, and how much is free beside the
    co-tenants), worded for the operator;
  - **Now**: one line.

## Validation

- `manifest.json` parses, and every `file` exists and has an `ffprobe` duration.
- The `.cache/` outputs are `git check-ignore`d.
- `git status --porcelain --untracked-files=all` shows nothing of yours outside your set: the user-level
  Hugging Face cache is outside the repo, which is fine.

## Wave

- **Set (this slice):** `.cache/p41-voices/models/`, `.cache/p41-voices/venv*/`,
  `works/phases/active/P41-sr/topics/voice-models.md`,
  `works/phases/active/P41-sr/slices/P41-sr.R2/`. You also hold the Mac's CPU and GPU for timings.
- **Running beside it:**
  - `P41-sr.R1`: `.cache/p41-voices/apis/`, `works/phases/active/P41-sr/topics/voice-apis.md`, its
    slice folder (network calls only).
  - `P41-sr.R3`: `.cache/p41-playback/`, `works/phases/active/P41-sr/topics/phone-playback.md`, its
    slice folder, a local port and the agent's Chrome.
  - `P41-sr.S1`: `server/spoken.py`, `tests/test_spoken.py`, `tests/fixtures/spoken/`, their
    `plugin/templates/kb/` copies, `plugin/templates/manifest.json`, its slice folder (it runs
    `pytest`).
- **Read-only to every slice:** `.cache/p41-voices/excerpts/`.
- **Waiting commits:** none.
- **Join-rebuilt artifact:** none.
- **Checks:** only the validation above.

## Dispatch

route=research
reason=kind research
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
