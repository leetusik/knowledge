# P41-sr.R4: result

## Verdict

- **status:** done
- **route:** research
- **model:** opus
- **effort:** xhigh
- **summary:** Ran the three voice models R2 left for disk, on this Mac, in both languages:
  - **MeloTTS** (MIT): CPU RTF 0.17–0.23 on 1–4 threads, 3.1–5.9 GB RSS. It is a box voice and now the
    measured box fallback for Korean. It does not displace Supertonic 3.
  - **OmniVoice** (CC-BY-NC weights): MLX GPU RTF 0.41–0.42 at about 4 GB. It is a light Mac option,
    but its designed Korean voice garbled 3 of 8 renders.
  - **Chatterbox Multilingual v3** (MIT, watermarked): slower than real time even on MPS (RTF 1.46–1.48).
    It is Mac-only and dominated by Qwen3.

  Magpie, the optional fourth, was tried and stopped: its local build was denied by the permission
  system. R4 added six samples to the manifest (eleven in all), ran a Whisper intelligibility check
  and a voice-consistency proxy over every sample, and updated `topics/voice-models.md` in place.
- **files_changed:**
  - `works/phases/active/P41-sr/topics/voice-models.md` (edited in place)
  - `works/phases/active/P41-sr/slices/P41-sr.R4/result.md` (new)
  - gitignored, never committed:
    - `.cache/p41-voices/models/`:
      - `manifest.json`: 6 entries appended; R2's 5 byte-identical, backup in `_raw/manifest.r2.json`.
      - 6 new `*.mp3` samples.
      - `_raw/`: new run JSONs and WAVs, `asr.json`, `spk.json`, `*.asr.txt` transcripts, and
        `r4-superseded/` (the MPS-contaminated Melo runs).
      - `_bench/`: `spk_check.py` is new. `b_chatterbox.py`, `b_melo.py`, `asr_check.py` and
        `common.py` were edited.
      - `_weights/`: `hf-melo/`, `nltk_data/` and `whisper-turbo-8bit/` (symlinks) are new.
    - `.cache/p41-voices/venv-melo/`: packages added (see the cleanup list).
    - `.cache/p41-voices/venv-magpie/`: new, an unbuilt clone.
  - outside the repo, created by this slice:
    - `~/.cache/huggingface/hub/models--mlx-community--whisper-large-v3-turbo-8bit` (0.86 GB);
    - `~/.pkuseg/` (90 MB, written by Chatterbox at load).
- **validation:**
  - `manifest.json` parses: 11 entries, each in the pinned 13-key shape. Every `file` exists, and its
    `ffprobe` duration matches `seconds`, R2's five included. **pass**
  - `git check-ignore -v` on the manifest, a sample, `_raw/asr.json`, `_weights/hf-melo`,
    `venv-magpie`, `venv-melo` and `_bench/spk_check.py`: all ignored by `.gitignore:3:.cache/`.
    **pass**
  - The excerpt-leak check over the topic and this file found no excerpt n-gram (counts only, no text
    printed). **pass**
  - `git status --porcelain --untracked-files=all`: of mine, only `topics/voice-models.md` and
    `slices/P41-sr.R4/result.md`. `plan.md` and `slice.json` are the orchestrator's. **pass**
  - `python3 scripts/workflow.py validate` (read-only): see *Validation* below. **pass**
- **deviations:**
  1. **Magpie was not run.** The `magpie-tts.cpp` clone succeeded; its `cmake` build was denied by the
     permission system (code from an external repository), so I stopped there and did not work
     around it. Its author's own CPU figure (q8_0, about 2.6 s of compute per audio second on a Ryzen
     9 9950X3D) says it is not a light box voice anyway.
  2. **OmniVoice's CPU figure is a short probe, not best of 3 on the excerpt.**
     - MLX on the CPU runs on one core in bf16. The full-excerpt run was stopped after six minutes,
       before its first pass finished.
     - The figure (RTF 8.1) comes from two runs of a probe sentence of my own.
     - PyTorch CPU was not measured; `venv-omnivoice` stayed unused, since the MLX GPU path worked.
  3. **The OmniVoice Korean sample is not the timed render.** The best-of-3 timing (seed 42) garbled
     about half the text (CER 0.66). The published sample is a seed-7 render with the same settings
     (CER 0.23). Its timing matches within 3 %.
  4. **Chatterbox MPS needed care.** The first run grew to a 43 GB footprint and was killed. The
     re-runs flush the MPS cache after each sentence and cap the watermarks (high 0.8, low 0.6).
     Chatterbox has no 4-thread run, so its box figure scales the 6-thread figure and is marked
     optimistic.
  5. **MeloTTS needed four fixes, all inside its venv or the bench script:**
     - `setuptools<81`, for `pkg_resources`;
     - `python-mecab-ko`, for Korean g2p;
     - an import shim, because that package collides with `mecab-python3` on the case-insensitive disk;
     - `&` spelled out, because the front end raises a `KeyError` on it.

     My first CPU runs were also void: Melo silently moves its BERT to MPS on a Mac. I moved them to
     `_raw/r4-superseded/` and re-ran pinned to the CPU.
  6. **Additions beyond the plan, within its disk limits:**
     - a Whisper large-v3-turbo intelligibility check (0.86 GB download);
     - a speaker-embedding voice-consistency proxy over all eleven samples;
     - OmniVoice stability probes: 8 Korean and 4 English renders.

     I cannot listen, so these are the machine stand-in for "record what you hear". Neither replaces
     the operator's ear.
  7. **A harness quirk was fixed in `common.py`.** The sample was the best-timed run only when rounding
     allowed. Both Chatterbox samples are run 1 of 3. The timings are unaffected.
- **doc_impact:** none (findings only)
- **notebook:** in the wave, for the orchestrator to write:
  - **Notes for later slices:**
    - `**(from P41-sr.R4, for P41-sr.D1, P41-sr.DECOMP2)**` Six free voices now heard (11 samples).
      MeloTTS KR (MIT, CPU RTF 0.23 on 1 thread, 3–3.5 GB RAM) is the box fallback for Korean, not a
      replacement for Supertonic 3. OmniVoice is a light Mac option (MLX RTF 0.41, ~4 GB,
      CC-BY-NC); its Korean design garbled 3/8 renders, so it needs an ASR gate. Chatterbox v3 is out:
      slower than real time on MPS, watermarked, unmaintained. → `topics/voice-models.md`
    - **Consumed:** R2's orchestrator note ("Unrun but on disk: Chatterbox … OmniVoice … The next light
      Korean candidate is NVIDIA Magpie 357M") is consumed. Chatterbox and OmniVoice ran; Magpie was
      tried, its build was denied, and it is not light on a CPU. Remove it.
  - **Operator Questions:** none (the box's shape is already OQ3).
  - **Now:** `- **Landed (P41-sr.R4):** 3 more voice models run. MeloTTS is the box fallback for
    Korean; OmniVoice is a light Mac option (CC-BY-NC, Korean needs an ASR gate); Chatterbox v3 is
    dominated. Magpie's build was denied. 11 samples in `.cache/p41-voices/models/manifest.json`;
    detail in `topics/voice-models.md`.`

## What I did

1. **Read** R2's `plan.md`, `result.md` and `topics/voice-models.md`. I reused R2's harness
   (`_bench/common.py`, `bench.sh`: best of 3, `/usr/bin/time -l` peak memory, `ffmpeg` 96 kbps
   mono MP3).
2. **Runs, all best of 3 unless noted.** Chars are 626 EN and 393 KO.

   | Run | Load | Best gen / audio | RTF | Chars/s | Peak |
   |---|---|---|---|---|---|
   | Chatterbox v3 EN, CPU (torch 6 threads) | 7.6 s | 103.8 / 37.2 s | 2.789 | 6.0 | RSS 7.17 GB |
   | Chatterbox v3 KO, CPU | | 136.2 / 42.1 s | 3.234 | 2.9 | RSS 7.17 GB |
   | Chatterbox v3 EN, MPS (cache flush, capped) | 8.5 s | 57.2 / 38.7 s | 1.477 | 11.0 | footprint 25.7 GB, RSS 5.3 GB |
   | Chatterbox v3 KO, MPS | | 63.8 / 43.8 s | 1.456 | 6.2 | footprint 25.8 GB |
   | Chatterbox v3 EN, MPS, first attempt (no flush) | | killed after 57 s | | | footprint 43.2 GB |
   | MeloTTS KR, CPU, all / 4 / 1 threads | 0.3 s (+ BERT on first call) | 11.47 / 10.74 / 14.41 s (audio 62.4 s) | 0.184 / 0.172 / 0.231 | 34.3 / 36.6 / 27.3 | RSS 3.13–3.54 GB |
   | MeloTTS EN-Default, CPU, all / 4 / 1 | 0.3 s | 6.65 / 6.46 / 8.91 s (audio 41.8 s) | 0.160 / 0.155 / 0.213 | 94.1 / 96.8 / 70.2 | RSS 4.87–5.94 GB |
   | MeloTTS KR, MPS | 0.7 s | 5.05 / 62.4 s | 0.081 | 77.8 | RSS 3.9 GB, footprint 5.3 GB |
   | MeloTTS EN-Default, MPS | 0.7 s | 1.77 / 42.0 s | 0.042 | 353 | footprint 4.8 GB |
   | OmniVoice EN designF, MLX GPU, seed 42, chunks ≤ 250 | 12.2 s (cold) | 20.66 / 48.86 s | 0.423 | 30.3 | MLX 3.54 GB, footprint 14.9 GB |
   | OmniVoice KO designF, MLX GPU | 2.1 s (warm) | 22.32 / 53.95 s | 0.414 | 17.6 | MLX 3.77 GB, footprint 14.6 GB |
   | OmniVoice EN, MLX on the CPU, probe sentence, 2 runs | | 60.5 / 7.5 s | 8.09 | ~1.6 | RSS 3.45 GB |

   - Melo's memory: importing `melo.api` alone takes 1.05 GB RSS (all seven language front ends);
     loading the model adds 0.5 GB and the BERT about 1 GB.
   - Melo scales little with threads: one core does most of the work, which suits a shared box.
   - OmniVoice reseeded before every call is deterministic: all three runs gave the same audio length.
3. **Machine checks** (`_bench/asr_check.py` in `venv-mlx`; `_bench/spk_check.py` in `venv-chatterbox`).
   The table is in the topic, *Machine checks*. The OmniVoice stability probes, by Whisper CER:

   | Lang, seed, chunking | CER | Hangul-only | Length |
   |---|---|---|---|
   | KO 42, ≤ 250 (the timed render) | 0.655 | 0.630 | 0.46 |
   | KO 42, whole block | 0.257 | 0.196 | 0.93 |
   | KO 1, ≤ 250 / whole | 0.585 / 0.211 | 0.577 / 0.122 | 0.46 / 0.93 |
   | KO 7, ≤ 250 / whole | 0.229 / 0.232 | 0.169 / 0.153 | 0.93 / 0.95 |
   | KO 2026, ≤ 250 / whole | 0.239 / 0.602 | 0.185 / 0.582 | 0.93 / 0.47 |
   | KO automatic voice (no tags), 42, ≤ 250 | 0.243 | 0.191 | 0.94 |
   | EN 42 / 1 / 7 / 2026, ≤ 250 | 0.028 / 0.022 / 0.022 / 0.020 | | 1.01–1.02 |

   - The failures are seed-dependent, not chunking-dependent.
   - The automatic voice reads cleanly but scores 0.55 on the voice proxy: it changes voice between
     calls.
4. **Watermark.** `perth.PerthImplicitWatermarker().get_watermark` returns 1.0 on Chatterbox's raw WAV
   and on both of its MP3 samples, and 0.0 on Supertonic's.
5. **Book math, runner judgement, recommendation:** in the topic. The box projection uses R2's 0.45
   factor, unchanged.
6. **Magpie:**
   - Korean arrived in v2607 (2026-07-21).
   - The MLX 4-bit and CoreML ports list nine languages without Korean, and they need a Swift SDK.
   - I chose the GGUF route and cloned `mudler/magpie-tts.cpp` (commit `3008ff7`, ggml `e705c5f`) into
     `.cache/p41-voices/venv-magpie/`. The CPU build was denied. No GGUF was downloaded.

## Dead ends and side findings

- **MLX on the CPU is no CPU path for OmniVoice.** bf16 on one core, about 8× slower than real time.
- **Chatterbox loads a Chinese segmenter for every language.** It wrote `~/.pkuseg/` (90 MB) at first
  load, and warns offline about a Cangjie mapping (Chinese only, harmless).
- **The Melo pitfalls are worth carrying into any build slice:**
  - Its BERT helpers ignore `device="cpu"` on a Mac when MPS exists.
  - It imports every language's front end, about 1 GB RSS, whatever language you ask for.
  - `&` crashes the Korean front end.
  - Its Korean g2p wants `python-mecab-ko`, which overwrites `mecab-python3`'s `MeCab/__init__.py` on
    macOS's case-insensitive disk.
- **The swap file grew to 9–13 GB** during the Chatterbox MPS runs, beside the operator's 8 GB VM. Free
  disk went from 40 GiB to 36–37 GiB: about 2.3 GB of downloads plus swap. It never came near the
  25 GiB floor.
- **The rules were kept:**
  - No voice cloning: built-in voices and text-designed voices only, and no reference audio anywhere.
  - Never touched the box.
  - Deleted nothing that existed before this slice.
  - No excerpt text in any committed file, and none printed: the checks print numbers only. The
    Whisper transcripts sit in the gitignored `_raw/*.asr.txt`.
- **One R2-era file changed in place.** Installing `python-mecab-ko` into R2's `venv-melo` overwrote
  `mecab-python3`'s `MeCab/__init__.py` (the case collision), and `setuptools` went from 84.2.1 to
  80.10.2. `venv-melo` is a throwaway venv in this slice's set; it works for Melo through the bench's
  shim.

## Cleanup list

For the orchestrator and the operator. Sizes are from `du`; the venv sizes may overcount, because uv
clones files from its cache on APFS.

| Path | Size | Made by | State |
|---|---|---|---|
| `.cache/p41-voices/venv-supertonic` | 128 MB | R2 | used (Supertonic 3) |
| `.cache/p41-voices/venv-kokoro` | 129 MB | R2 | used (Kokoro) |
| `.cache/p41-voices/venv-mlx` | 1.2 GB | R2 | used (Qwen3; R4's OmniVoice and Whisper) |
| `.cache/p41-voices/venv-qwen` | 1.3 GB | R2 | used (Qwen3 PyTorch CPU probe) |
| `.cache/p41-voices/venv-chatterbox` | 1.1 GB | R2, run by R4 | used (Chatterbox; R4's voice proxy) |
| `.cache/p41-voices/venv-omnivoice` | 924 MB | R2 | **never used** by either slice |
| `.cache/p41-voices/venv-melo` | 2.0 GB | R2, extended by R4 | used (MeloTTS); R4 added `python-mecab-ko` + dictionary (107 MB) |
| `.cache/p41-voices/venv-magpie` | 37 MB | R4 | an unbuilt `magpie-tts.cpp` clone, **unused** |
| `.cache/p41-voices/models/_weights/supertonic3` | 385 MB | R2 | keep if Supertonic is picked (the vendor is in liquidation) |
| `.cache/p41-voices/models/_weights/kokoro` | 337 MB | R2 | Kokoro ONNX + voices |
| `.cache/p41-voices/models/_weights/hf-melo` | 1.2 GB | R4 | Melo KR + EN checkpoints, two BERTs, tokenizers (its own `HF_HOME`) |
| `.cache/p41-voices/models/_weights/nltk_data` | 20 MB | R4 | Melo English g2p data |
| `.cache/p41-voices/models/_weights/whisper-turbo-8bit` | 0 (symlinks) | R4 | points into the Hugging Face cache |
| `.cache/p41-voices/models/` (the rest: samples, `_raw/`, `_bench/`) | ~100 MB | R2 + R4 | samples, raw WAVs, timings, transcripts, scripts |
| `~/.cache/huggingface/hub/models--Qwen--Qwen3-TTS-12Hz-1.7B-CustomVoice` | 4.52 GB | R2 | used |
| `~/.cache/huggingface/hub/models--ResembleAI--chatterbox` (v3 files) | 3.21 GB | R2, run by R4 | used; dominated, so the first to free |
| `~/.cache/huggingface/hub/models--mlx-community--OmniVoice-bf16` | 1.64 GB | R2, run by R4 | used |
| `~/.cache/huggingface/hub/models--mlx-community--whisper-large-v3-turbo-8bit` | 0.86 GB | R4 | used for the intelligibility check |
| `~/.pkuseg/` | 90 MB | R4 (Chatterbox at load) | not needed by anything else |
| `~/.cache/uv` | 9.3 GB | shared | R2 noted its growth; `uv cache prune` is the operator's call |

- **Where the Hugging Face bytes are.** The four Hugging Face entries keep their bytes in the shared
  `~/.cache/huggingface/hub/blobs/` (9.5 GiB). These four repos are all of it, so removing them frees
  it.
- **The swap file** (9–13 GB during the runs) is transient.

## Validation

- **`manifest.json`:** parses; 11 entries, keys in the pinned order; `kind: model`, `official: null`
  and `billing: none` on every entry. Durations by `ffprobe` match `seconds`:
  - R2's five: 51.13, 54.96, 47.80, 51.40 and 63.08 s, unchanged.
  - Chatterbox EN 37.03, KO 43.92. MeloTTS EN 41.71, KO 62.43. OmniVoice EN 48.86, KO 53.95.
- **Ignored:** every `.cache/p41-voices/**` path checked is ignored (`.gitignore:3:.cache/`).
- **No excerpt text:** the leak check builds every 4-word English n-gram and every 2-word Korean
  n-gram, and every Hangul word of 4+ syllables, from the excerpts. It counts their occurrences in the
  topic and in this file: 0. It prints only counts.
- **`git status`** shows nothing of mine outside the declared set.
- **`python3 scripts/workflow.py validate`:** "Workflow validation passed". The warnings it prints are
  all older ones, not from this slice.
