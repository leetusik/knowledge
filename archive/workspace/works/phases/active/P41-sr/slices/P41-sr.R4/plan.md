# P41-sr.R4 — free voice models: the three R2 left for disk (research)

## Goal

`P41-sr.R2` planned up to about six models. It ran three (Supertonic 3, Kokoro 82M and Qwen3-TTS 1.7B)
and then stopped, because the Mac's SSD was 99 % full. On 2026-11-11 the operator freed space ("we got
some room now"); about 41 GiB is free. This slice **runs the models R2 left for disk**, so the operator
hears them before choosing a voice by ear. Two of them add Korean, where the choice is thinnest.

It is findings only. It writes no product code, and makes no edits to `server/`, `web/`, `plugin/`,
`pyproject.toml` or `uv.lock`. Its method, rules and output shape are **R2's**:
`works/phases/active/P41-sr/slices/P41-sr.R2/plan.md`. Read that plan first; this one names only what
differs.

Read these as well:
- `works/phases/active/P41-sr/topics/voice-models.md`: the three models run, `## Surveyed, not run`,
  the book math, the runner judgement and the recommendation;
- R2's `result.md`: its deviations, its cleanup list and its notes.

## The models (in this order)

1. **Chatterbox Multilingual v3** (Resemble AI, MIT, about 0.5B).
   - Weights: in the Hugging Face cache, 3.21 GB.
   - Environment: `venv-chatterbox`, built from GitHub master `ab55923`. PyPI 0.1.7 has no v3.
   - R2's script `b_chatterbox.py` was never run.
   - Use the **built-in default voice only**. Never pass a reference clip.
   - Note the audio watermark it adds.
   - Measure the CPU and the PyTorch MPS paths.
2. **MeloTTS** (MyShell, MIT, VITS2), **Korean** (`KR`) and English (`EN`, the default speaker).
   - `venv-melo` is installed but holds no weights; download them, about 0.2 GB plus a 0.47 GB Korean
     BERT.
   - R2's script `b_melo.py` was never run.
   - It is built for CPU, so it is a **box candidate for Korean**. Measure CPU first.
3. **OmniVoice** (k2-fsa).
   - Weights: the MLX build in the Hugging Face cache, 1.64 GB.
   - Environment: `venv-mlx`. Its `venv-omnivoice` was installed and never used; use it only if the
     MLX path fails.
   - Its weights are **CC-BY-NC**; for the operator's personal use, record that.
   - **No voice cloning.** Use only a built-in voice, or a voice designed from a **text** description,
     and keep one fixed voice per language for both excerpts. R2 found the automatic voice changes on
     every call, and that Korean voice design "may be unstable": record what you hear.
4. **Optional, only if the first three are done and disk allows: NVIDIA Magpie TTS Multilingual 357M.**
   - R2 calls it the next light Korean candidate.
   - Try **one** light port: MLX 4-bit, or GGUF through `magpie-tts.cpp`. Never the full NeMo install.
   - If the port fails to install or run within about 30 minutes, stop, and record it as tried.
   - Use built-in speakers only.

## Limits

- **Disk.**
  - Check `df -h /` before each download. Keep **at least 25 GiB free** at all times.
  - Keep the new downloads under about 8 GB in total.
  - Stop adding models when either limit binds, and say so.
- **Memory.**
  - Run one model at a time. The Mac has 36 GB, and Qwen3 earlier pushed macOS into 8 GB of swap.
  - Record peak memory with `/usr/bin/time -l`.
- **Deleting.** Delete nothing outside this slice's set. Nothing that existed before this slice may be
  deleted: that cleanup is the operator's call.
- **Never print excerpt text.** Never paste it into a committed file either. The repo is public.

## Outputs (R2's shape)

- **Samples:** `.cache/p41-voices/models/<id>-<lang>[-<voice>].mp3`, rendered from both excerpts (or
  English only for a model with no Korean), through `ffmpeg`.
- **Measurements:** load time; the real-time factor on CPU and on the GPU path (best of 3; R1 runs
  beside you, but only network calls); peak memory; characters per second.
- **Book math:** 130k and 300k characters, on the Mac's CPU and GPU and on the projected ARM box. Use
  **R2's projection factor**, and say that it is the same assumption.
- **The runner judgement:** box, Mac or neither, with why.
- **Append to `.cache/p41-voices/models/manifest.json`.**
  - Keep R2's five entries untouched.
  - Add one entry per new model and language, in the pinned shape: `id`, `name`, `kind` (`model`),
    `runner`, `official` (null), `lang`, `voice`, `file`, `seconds`, `terms` (local, nothing leaves
    the machine), `billing` (none), `licence`, `notes` (RTF, memory, any watermark).
- **Update `works/phases/active/P41-sr/topics/voice-models.md` in place.**
  - Add each model run to the summary table and to `## The models run` (one short section each).
  - Remove it from `## Surveyed, not run`.
  - Extend `## Book math` and `## The runner`.
  - Rewrite `## Recommendation` across **all** the models now heard. Say plainly whether MeloTTS or
    Chatterbox changes the Korean answer for the box or for the Mac.
  - Update `## The box's projected fit` if a new box candidate appears.
  - Add sources with their read dates.
  - Keep every claim R2 measured. Edit R2's prose only where the new results change it.

## Return (wave rules: you write no `phase.md`)

- Write `result.md` with the verdict block first.
- The `notebook` field holds:
  - **Notes for later slices**, `**(from P41-sr.R4, for D1, DECOMP2)**`: one gist on what the new
    models change, linking `topics/voice-models.md`. Say whether R2's orchestrator note ("unrun but on
    disk: Chatterbox, OmniVoice; next light Korean candidate Magpie") is now **consumed**, so the
    orchestrator removes it.
  - **Operator Questions:** none expected. The box's shape is already OQ3.
  - **Now:** one line.
- Add a short **cleanup list** to `result.md`: each venv, weight folder and cache this slice and R2 left,
  with its size, so the operator can decide.

## Validation

- `manifest.json` parses. Every `file` exists and has an `ffprobe` duration, R2's five included.
- The `.cache/` outputs are `git check-ignore`d.
- A grep for excerpt words finds none in the topic or in `result.md`.
- `git status --porcelain --untracked-files=all` shows nothing of yours outside your set. The
  user-level Hugging Face cache is outside the repo, which is fine.

## Wave

- **Set (this slice):**
  - `.cache/p41-voices/models/` (new samples; appended manifest entries; `_raw`, `_bench`,
    `_weights`);
  - `.cache/p41-voices/venv*/` (the `venv-*` folders at that level; a new one if Magpie needs it);
  - `works/phases/active/P41-sr/topics/voice-models.md`;
  - `works/phases/active/P41-sr/slices/P41-sr.R4/`.
  - You also hold the Mac's CPU and GPU for timings.
- **Running beside it:** `P41-sr.R1`, which is wrapping up with no keys. Its set is
  `.cache/p41-voices/apis/` (its own `venv/` inside it), `works/phases/active/P41-sr/topics/voice-apis.md`
  and its slice folder. It makes no local renders.
- **Read-only:** `.cache/p41-voices/excerpts/`, and R2's slice folder.
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
