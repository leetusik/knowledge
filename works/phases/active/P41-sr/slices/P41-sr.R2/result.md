# P41-sr.R2: result

## Verdict

- **status:** done
- **route:** research
- **model:** opus
- **effort:** xhigh
- **summary:** Surveyed about 30 open TTS models as of 2026-11. Ran three of them on this Mac:
  - Supertonic 3 (EN+KO, CPU RTF 0.16, 0.7 GB) and Kokoro 82M (EN, CPU RTF 0.16, 1.5 GB), both
    judged box-capable.
  - Qwen3-TTS 1.7B CustomVoice (EN+KO, MLX GPU RTF 0.73, CPU RTF 2.1, 15 GB), judged Mac-only.

  It wrote five samples, the manifest and `topics/voice-models.md`. A disk stop (SSD at 99 %) cut it
  from six models to three: Chatterbox v3 and OmniVoice are downloaded but not run.
- **files_changed:**
  - `works/phases/active/P41-sr/topics/voice-models.md` (new)
  - `works/phases/active/P41-sr/slices/P41-sr.R2/result.md` (new)
  - gitignored, never committed:
    - `.cache/p41-voices/models/` (`manifest.json`, 5 `*.mp3`, `_raw/`, `_bench/`, `_weights/`)
    - `.cache/p41-voices/venv-{supertonic,kokoro,mlx,qwen,chatterbox,omnivoice,melo}/`
  - outside the repo, created by this slice: three Hugging Face cache entries (sizes below)
- **validation:**
  - `manifest.json` parses, 5 entries; every `file` exists and has an `ffprobe` duration that matches
    its `seconds`. **pass**
  - `git check-ignore -v` on the manifest, a sample, a venv and `_raw/`: all ignored by
    `.gitignore:3:.cache/`. **pass**
  - `git status --porcelain --untracked-files=all`: of mine, only `topics/voice-models.md` and
    `slices/P41-sr.R2/result.md` are new. `slice.json` is the orchestrator's `start-slice` edit and
    `plan.md` the orchestrator's. **pass**
  - `python3 scripts/workflow.py validate` (read-only): passed. Its warnings are all older ones.
    **pass**
- **deviations:**
  1. **3 models run, not ~6.** The orchestrator stopped every download and install mid-slice (the
     Mac's SSD at 99 %). Chatterbox Multilingual v3 and OmniVoice weights are on disk but unrun;
     MeloTTS is installed but its weights were never downloaded. The topic lists every model not run
     with the reason (disk).
  2. **Qwen3 CPU is one run, not best of 3,** because of the stop.
  3. **No Korean GPU number for Supertonic,** and no GPU number for Kokoro. The Kokoro GPU path needs
     new MLX weights, which the stop forbade.
  4. **No ASR intelligibility check.** I planned a Whisper pass and installed `mlx-whisper`, but its
     weights would have been a new download. Quality is the operator's ear.
  5. **The box is projected at 0.45× an M3 Pro performance core per A1 core.** That factor is an
     assumption, stated as one.
- **doc_impact:** none (findings only)
- **notebook:** in the wave, for the orchestrator to write:
  - **Notes for later slices:**
    - `**(from P41-sr.R2, for P41-sr.D1, P41-sr.DECOMP2)**` Box voice: Supertonic 3 (EN+KO, 10 built-in
      voices, ONNX CPU RTF 0.16 on the Mac, 0.7 GB RAM, OpenRAIL-M). Projected on a shared A1 box: a
      130k-character book in about 1–2 h on 4 OCPUs and 2–4 h on 1. Kokoro 82M is the English-only
      box alternative. → `topics/voice-models.md`
    - `**(from P41-sr.R2, for P41-sr.D1, P41-sr.DECOMP2)**` Mac voice: Qwen3-TTS 1.7B CustomVoice
      (Sohee KO, Aiden EN, Apache-2.0) on MLX, RTF 0.73. A book takes 2–10 h, needs about 13 GB of free
      unified memory, and the Mac on and awake. CPU RTF 2.1 at 15 GB, so never the box.
      → `topics/voice-models.md` § The runner
    - `**(from P41-sr.R2, for P41-sr.DECOMP2)**` Supertone (Supertonic's maker) has been in
      liquidation since 2026-07: the weights run offline under OpenRAIL-M, but keep a local copy and
      expect no updates. → `topics/voice-models.md`
    - `**(from P41-sr.R2, for the orchestrator)**` Unrun but on disk (no download needed): Chatterbox
      Multilingual v3 (built-in voice, KO+EN, `venv-chatterbox`) and OmniVoice (MLX, `venv-mlx`). The
      next light Korean candidate is NVIDIA Magpie 357M. → `topics/voice-models.md` § Surveyed, not run
  - **Operator Questions:** `- **OQ<n> (P41-sr.R2):** The shared Oracle box: how many OCPUs and how
    much RAM does it have, and how much of each is free beside your other apps? The light voices need
    about 1 free core and 1.5 GB of RAM to render a book in a few hours in the background. May an agent
    run one 10-second timing test on it, so the projection becomes a measurement?`
  - **Now:** `- **Landed (P41-sr.R2):** 3 of ~6 voice models run before the disk stop. Box: Supertonic 3
    (EN+KO) and Kokoro (EN); Mac: Qwen3-TTS 1.7B (EN+KO). 5 samples in
    `.cache/p41-voices/models/manifest.json`; detail in `topics/voice-models.md`.`

## What I did

1. **Survey.** Read the Hugging Face trending text-to-speech list, the `mlx-audio` model table, the
   model cards and release notes; about 30 models in all. The table is in `topics/voice-models.md`
   § *Surveyed, not run*.
2. **Harness.** `.cache/p41-voices/models/_bench/` (gitignored):
   - `common.py` reads the excerpt blocks, times the model load, renders the excerpt block by block
     with 0.5 s gaps, takes the best of N runs, and writes the WAV and the MP3 (96 kbps mono, through
     `ffmpeg`).
   - `bench.sh` wraps each run in `/usr/bin/time -l` for peak RSS and peak footprint.
   - There is one script per model: `b_supertonic.py`, `b_kokoro.py`, `b_mlx.py`, `b_qwen_pt.py`,
     `b_chatterbox.py` (unrun) and `b_melo.py` (unrun).
3. **Runs**, all best of 3 unless noted:

   | Run | Load | Best gen / audio | RTF | Chars/s | Peak |
   |---|---|---|---|---|---|
   | Supertonic 3 EN F1, CPU, all threads | 0.33 s | 8.07 / 51.13 s | 0.158 | 77.5 | RSS 0.70 GB |
   | Supertonic 3 EN, 1 / 4 / 6 threads | | 17.94 / 8.22 / 8.01 s | 0.351 / 0.161 / 0.157 | 34.9 / 76.2 / 78.1 | 0.68–0.70 GB |
   | Supertonic 3 EN, CoreML EP | 7.35 s | 6.27 s | 0.122 | 99.9 | RSS 6.40 GB |
   | Supertonic 3 KO F1, CPU | 0.34 s | 8.64 / 54.96 s | 0.157 | 45.5 | 0.70 GB |
   | Kokoro EN af_heart, CPU, all / 1 / 4 threads | 0.32 s | 7.43 / 28.75 / 9.08 s (audio 47.80 s) | 0.155 / 0.601 / 0.190 | 84.3 / 21.8 / 69.0 | 1.48 GB |
   | Qwen3 1.7B EN Aiden, MLX GPU | 2.66 s (warm) | 37.63 / 51.40 s | 0.732 | 16.6 | MLX 11.5 GB, footprint 28.1 GB |
   | Qwen3 1.7B KO Sohee, MLX GPU | 21.67 s (cold) | 46.08 / 63.08 s | 0.731 | 8.5 | MLX 13.1 GB, footprint 29.5 GB |
   | Qwen3 1.7B EN Aiden, PyTorch fp32 CPU, **1 run** | 10.5 s | 107.5 / 52.12 s | 2.063 | 5.8 | RSS 14.9 GB |

   - Qwen3's Korean run 1 rendered 77 s of audio against 63 s for runs 2 and 3 (sampling). The sample
     is run 3.
   - The Qwen3 CPU process used about 1.1 cores whatever the thread count: autoregressive and
     latency-bound.
4. **Book math and runner judgement:** `topics/voice-models.md` § *Book math* and § *The runner*. The
   box projection assumes one A1 core does 0.45× an M3 Pro performance core.
5. **Manifest:** `.cache/p41-voices/models/manifest.json`, five entries in the pinned shape:
   - `kind: model`, `official: null`, `billing: none`;
   - `terms`: local, nothing leaves the machine;
   - `runner`: box for Supertonic and Kokoro, mac for Qwen3.

## Dead ends and side findings

- **Supertonic's advertised speed (1,200+ chars/s) is not reached at the default 8 steps.** The
  vector-estimator steps dominate the render time: 5 steps cuts it about 35 % and 2 steps about 70 %.
  The quality cost of fewer steps is unheard.
- **The CoreML provider is not worth it** for Supertonic: barely faster (0.122 against 0.158) at
  9× the memory.
- **PyPI's `chatterbox-tts` 0.1.7 has no multilingual v3.** GitHub master has it, so
  `venv-chatterbox` is installed from commit `ab55923`.
- **Qwen3 MLX memory caused the swap.** A 28–29 GB process footprint beside the operator's ~7.5 GB VM
  pushed macOS into an 8 GB swap file, which counts against the same nearly full disk. A Mac runner
  should cap MLX's cache.
- **Two machine actions were denied or never needed.**
  - `rm -rf venv-omnivoice` was denied by the permission system. I then stopped deleting anything, as
    the coordinator ordered.
  - `timeout` does not exist on macOS, so one CoreML attempt silently did nothing and was re-run.
- **The rules were kept:**
  - Clone no real person's voice: built-in or preset speakers only.
  - Never SSH to the box.
  - The excerpt text appears in no committed file.

## Cleanup list

These are for the orchestrator and the operator. Sizes are from `du`; the venv sizes may overcount,
because uv clones files from its cache on APFS.

| Path | Size | State |
|---|---|---|
| `.cache/p41-voices/venv-supertonic` | 128 MB | used (Supertonic 3) |
| `.cache/p41-voices/venv-kokoro` | 129 MB | used (Kokoro) |
| `.cache/p41-voices/venv-mlx` | 1.2 GB | used (Qwen3 MLX); also holds the unused `mlx-whisper` and `jiwer` |
| `.cache/p41-voices/venv-qwen` | 1.3 GB | used (Qwen3 PyTorch CPU probe) |
| `.cache/p41-voices/venv-chatterbox` | 976 MB | installed, not run |
| `.cache/p41-voices/venv-omnivoice` | 924 MB | installed, **unused** (the MLX path was chosen instead) |
| `.cache/p41-voices/venv-melo` | 1.8 GB | installed, not run (no weights) |
| `.cache/p41-voices/models/_weights/supertonic3` | 385 MB | Supertonic 3 weights (keep if Supertonic is picked: the vendor is in liquidation) |
| `.cache/p41-voices/models/_weights/kokoro` | 337 MB | Kokoro ONNX + voices |
| `.cache/p41-voices/models/` (the rest: samples, `_raw/`, `_bench/`) | ~24 MB | samples, raw WAVs, timings, scripts |
| `~/.cache/huggingface/hub/models--Qwen--Qwen3-TTS-12Hz-1.7B-CustomVoice` | 4.52 GB | used |
| `~/.cache/huggingface/hub/models--ResembleAI--chatterbox` (v3 files only) | 3.21 GB | downloaded, not run |
| `~/.cache/huggingface/hub/models--mlx-community--OmniVoice-bf16` | 1.64 GB | downloaded, not run |

- **Where the Hugging Face bytes are.** The three Hugging Face entries keep their bytes in the shared
  `~/.cache/huggingface/hub/blobs/` (8.7 GiB). These three repos are all of it, so removing them frees
  it.
- **Other disk growth during the slice:**
  - `~/.cache/uv` grew from about 6.6 GB to 9.7 GB. That cache is shared, so a `uv cache prune` is the
    operator's call.
  - The swap file is 8 GB and is transient.

## Validation

- `manifest.json` parses, 5 entries, each with its `ffprobe` duration:

  | Entry | Seconds |
  |---|---|
  | supertonic3-en-F1 | 51.13 |
  | supertonic3-ko-F1 | 54.96 |
  | kokoro82m-en-af_heart | 47.80 |
  | qwen3tts17b-en-Aiden | 51.40 |
  | qwen3tts17b-ko-Sohee | 63.08 |

- Every `.cache/p41-voices/**` path checked is ignored (`.gitignore:3:.cache/`).
- `git status` shows nothing of mine outside the declared set.
- `python3 scripts/workflow.py validate`: "Workflow validation passed". Its warnings are all older
  ones: unknown kinds in P22/P26, the P41-sr notebook's long entries, consolidation debt and
  oversized docs. None comes from this slice.
- A search for distinctive excerpt words in `topics/voice-models.md` and this file finds none, so no
  excerpt text leaked into committed files.
