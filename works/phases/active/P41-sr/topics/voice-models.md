# Free voice models for Listen: what runs where (P41-sr.R2, P41-sr.R4)

Findings of `P41-sr.R2` (research, 2026-11-11) and `P41-sr.R4` (research, 2026-11-11).

- **R2** was cut short by a disk stop: the Mac's SSD reached 99 %, so the orchestrator stopped every new
  download and install. It ran **three models**: two light ones and one heavy one.
- **R4** ran after the operator freed space. It ran **three more**: Chatterbox Multilingual v3, MeloTTS
  and OmniVoice. The optional fourth, NVIDIA Magpie, was not run: its build was denied (see *Surveyed,
  not run*). R4 also ran two machine checks over all eleven samples (see *Machine checks*).

The samples, the manifest and the raw timings are in the gitignored `.cache/p41-voices/models/`:
`manifest.json`, the `*.mp3` samples, and `_raw/` (per-run JSON, `bench.log`, `mem.jsonl`, and R4's
`asr.json` and `spk.json`). The bench scripts are in `_bench/`. The excerpts are documents 67 v2 (EN)
and 72 v1 (KO), the same blocks R1 uses; their text is never quoted here.

## Summary

| Model | Korean | Licence | Size on disk | CPU RTF (Mac) | GPU RTF (Mac) | Peak memory | Runner | Samples |
|---|---|---|---|---|---|---|---|---|
| Supertonic 3, 99M, ONNX | official (31 langs) | OpenRAIL-M model, MIT code | 0.39 GB | 0.158 EN, 0.157 KO (all threads); 0.161 at 4 threads; 0.351 at 1 thread | 0.122 (ONNX CoreML EP) | 0.70 GB RSS (CPU); 6.4 GB on CoreML | **box** | `supertonic3-en-F1.mp3`, `supertonic3-ko-F1.mp3` |
| Kokoro 82M v1.0, ONNX fp32 | none | Apache-2.0 | 0.35 GB | 0.155 (all threads); 0.190 at 4; 0.601 at 1 | not measured (mlx-audio path exists) | 1.48 GB RSS | **box** (EN only) | `kokoro82m-en-af_heart.mp3` |
| Qwen3-TTS 12Hz 1.7B CustomVoice | official (10 langs), native Korean speaker *Sohee* | Apache-2.0 | 4.52 GB | 2.06 EN (PyTorch fp32, 1 run) | 0.73 EN, 0.73 KO (MLX bf16) | CPU 14.9 GB RSS; GPU 11.5–13.1 GB MLX active, 28–29 GB process footprint | **mac** | `qwen3tts17b-en-Aiden.mp3`, `qwen3tts17b-ko-Sohee.mp3` |
| MeloTTS (KR, EN), VITS2 + BERT (R4) | official, one KR voice | MIT | 0.2 GB per language + a 0.44–0.47 GB BERT each (1.2 GB for both, with tokenizers) | 0.184 KO, 0.160 EN (all threads); 0.172 / 0.155 at 4; 0.231 / 0.213 at 1 | 0.081 KO, 0.042 EN (PyTorch MPS) | 3.1–3.5 GB RSS KO, 4.9–5.9 GB EN (CPU) | **box** | `melotts-ko-KR.mp3`, `melotts-en-EN-Default.mp3` |
| Chatterbox Multilingual v3, 0.5B, PyTorch (R4) | official (23 langs), one built-in voice | MIT; every output carries a PerTh watermark | 3.21 GB | 2.79 EN, 3.23 KO (6 threads) | 1.48 EN, 1.46 KO (PyTorch MPS) | CPU 7.2 GB RSS; MPS 25.7 GB footprint (with cache flushes) | **mac**, dominated | `chatterbox-mtl-v3-en.mp3`, `chatterbox-mtl-v3-ko.mp3` |
| OmniVoice 0.6B, MLX bf16 (R4) | in 646 langs; no preset voice, a voice designed from text tags | **CC-BY-NC weights**, Apache code | 1.64 GB | 8.1 (MLX on the CPU, one core; a short probe) | 0.42 EN, 0.41 KO (MLX) | MLX 3.5–3.8 GB active, 14.6–14.9 GB process footprint | **mac** | `omnivoice-en-designF.mp3`, `omnivoice-ko-designF.mp3` |

- **RTF** is render time ÷ audio time; under 1 is faster than real time.
- **Throughput** (characters per second, best of 3):
  - Supertonic: 77.5 EN, 45.5 KO.
  - Kokoro: 84.3 EN.
  - Qwen3 on the GPU: 16.6 EN, 8.5 KO.
  - Qwen3 on the CPU: 5.8 EN.
  - MeloTTS on the CPU: 94.1 EN, 34.3 KO (all threads); 96.8 EN, 36.6 KO at 4 threads; 70.2 EN, 27.3 KO
    at 1. On the GPU: 353 EN, 77.8 KO.
  - Chatterbox on the GPU: 11.0 EN, 6.2 KO. On the CPU: 6.0 EN, 2.9 KO.
  - OmniVoice on the GPU: 30.3 EN, 17.6 KO. On the CPU, about 1.6 EN (from the probe's RTF).
- **Korean carries more speech per character.** The 393-character Korean excerpt reads about as long
  as the 626-character English one, so a Korean book of the same size takes longer to render.
- **Noisy timings.** R1, R3 and S1 ran beside R2, so R2's timings are noisy. The light models' three
  runs agree within 2–10 %. R4 ran beside R1 only, which made network calls, but the operator's VM
  (about 8 GB) and 7–13 GB of swap were live throughout.
- **One Qwen3 CPU run.** The Qwen3 CPU figure is a single run: three would have taken another six
  minutes of a CPU the stop order had frozen.

## The models run

### Supertonic 3 (Supertone, May 2026)

- **What it is:** a 99M flow-matching model on ONNX Runtime, from `pip install supertonic` (1.3.1).
- **Voices:** ten built-in voices, F1–F5 and M1–M5. No reference voice is needed.
- **Settings:** the samples use F1 at the default 8 steps.
- **Speed:**
  - The vector-estimator steps dominate the render time. 5 steps cuts it about 35 % and 2 steps about
    70 %; the quality cost is unheard.
  - Scaling stops at about 4 threads. 1 → 4 threads is 2.2× faster, and 4 → 12 threads gains nothing.
  - The CoreML provider is barely faster and costs 6.4 GB of memory, so the CPU is its path.
- **Memory:** 0.70 GB RSS.
- **Box fit:** the best Korean candidate for the box.
- **Risk:** HYBE put Supertone into liquidation (shareholders' resolution 2026-07-15, confirmed
  2026-07-27).
  - The weights are OpenRAIL-M, are pinned by commit in the SDK, and run offline, so they keep
    working.
  - There will be no updates. Keep the local copy of the weights, because the Hugging Face repo may
    not outlive the company.

### Kokoro 82M v1.0 (hexgrad, Jan 2025)

- **Runtime:** fp32 ONNX via `kokoro-onnx` 0.6.1. The weights are the GitHub release
  `model-files-v1.0`.
- **Voices:** 54 built-in voices, none of them Korean. The sample uses `af_heart`, the voice the
  model card grades highest.
- **Speed:** scales well, 3.2× from 1 thread to 4.
- **Memory:** 1.48 GB RSS. An int8 ONNX (88 MB) would shrink that; it was not measured.
- **Standing:** still the most-downloaded light English model on Hugging Face (12.5M downloads,
  #6 trending). It competes for the English voice only.

### Qwen3-TTS 12Hz 1.7B CustomVoice (Qwen, Jan 2026)

- **Voices:** nine preset speakers. *Sohee* is a native Korean female voice; *Aiden* and *Ryan* are
  English. No reference voice is needed.
- **Runs:**
  - Mac GPU: `mlx-audio` 0.6.5 loads the original Hugging Face weights. One 4.5 GB download serves
    both paths.
  - CPU: the official `qwen-tts` PyTorch package.
- **CPU is not its path:**
  - The model is autoregressive and latency-bound: it used about 1.1 cores whatever the thread count.
  - fp32 needs 14.9 GB of RSS.
  - It renders 2× slower than real time, so it is not a box model.
- **Memory on the GPU:**
  - MLX held 11.5–13.1 GB active, plus a buffer cache that took the process footprint to 28–29 GB.
  - With the operator's VM using about 7.5 GB, this pushed the Mac into an 8 GB swap file. That
    swap file is part of the disk pressure.
  - A production run would cap MLX's cache (`mx.set_cache_limit`) or use the 0.6B or an 8-bit build.
    Neither was measured.
- **Sampling variance:** run 1 of the Korean excerpt came out 77 s long against 63 s for runs 2 and 3.
  The sample is run 3; check it by ear for skips or repeats.

### MeloTTS (MyShell, 2024): Korean `KR` and English `EN-Default` (R4)

- **What it is:** a VITS2 model with a BERT feature front end (`kykim/bert-kor-base` for Korean,
  `bert-base-uncased` for English), from the `melotts` package (GitHub commit `2091453`), PyTorch.
- **Voices:** one built-in Korean voice (`KR`). English has five accents; the sample uses `EN-Default`.
  No reference voice. Output is 44.1 kHz.
- **CPU is its path, and it is fast on one core:**
  - Korean: RTF 0.231 at 1 thread, 0.172 at 4, 0.184 at all threads. English: 0.213, 0.155, 0.160.
  - 1 → 4 threads gains only 1.3–1.4×, so a single core does most of the work. On one core it renders
    Korean faster than Supertonic is estimated to (27 against about 20 chars/s).
  - On a Mac, Melo's BERT helper silently moves to the GPU (MPS) when asked for the CPU. The bench
    pins it to the CPU, so the CPU figures above are CPU only.
- **Memory:** 3.1–3.5 GB RSS for Korean and 4.9–5.9 GB for English, against 0.7 GB for Supertonic.
  About 1 GB of it is importing all seven language front ends (MeloTTS loads them all for any
  language). A trimmed import would shrink that; it was not measured.
- **GPU:** PyTorch MPS renders Korean at RTF 0.081 and English at 0.042, but the box is its runner.
- **Two front-end defects, both worked around in the bench:**
  - The Korean front end raises a `KeyError` on `&`, which has no phone. The bench spells it out; a
    production run needs the same text normalisation.
  - On macOS, Korean g2p needs `python-mecab-ko`, which shares a folder with `mecab-python3` on the
    case-insensitive disk and breaks it. The bench loads one by path and stubs the other. A Linux box
    has a case-sensitive disk and would not hit this.
- **Standing:** the package is two years old and lightly maintained, but MIT, with no vendor to lose.

### Chatterbox Multilingual v3 (Resemble AI, 2026) (R4)

- **What it is:** a 0.5B autoregressive model (Llama-style T3 plus the S3Gen flow decoder), PyTorch,
  from GitHub master `ab55923` with `t3_model="v3"`. PyPI 0.1.7 has no v3.
- **Voice:** the built-in default voice (`conds.pt`) for every language. No reference clip was used.
- **Slow everywhere:**
  - Mac GPU (MPS): RTF 1.48 EN and 1.46 KO, so slower than real time even on the GPU.
  - CPU (6 threads): RTF 2.79 EN and 3.23 KO, at 7.2 GB RSS. Not a box model.
- **Memory on the GPU:** a first MPS run grew to a 43 GB footprint and was killed. With an MPS cache
  flush after each sentence and capped watermarks, the runs held at a 25.7 GB footprint. A production
  run would need the same care.
- **Watermark:** every output carries Resemble's PerTh watermark. `perth`'s detector finds it in both
  96 kbps MP3 samples (1.0) and not in Supertonic's (0.0). It is inaudible by design, but it marks the
  audio as AI-generated.
- **Side effects of loading:** its Chinese segmenter downloaded 34 MB to `~/.pkuseg/` at first load,
  even for English and Korean.
- **Standing:** the upstream README marks the project as retired research, no longer maintained, since
  2026-08. Like Supertonic, there will be no updates.
- **Sampling:** each run differs. Both samples are run 1 of 3: a harness quirk kept the first run's
  audio rather than the fastest (since fixed; the timings are unaffected).

### OmniVoice 0.6B (k2-fsa, Apr 2026) (R4)

- **What it is:** a bidirectional Qwen3-0.6B backbone with iterative masked-diffusion decoding (32
  steps) and the HiggsAudio v2 codec, run through `mlx-audio` 0.6.5 on the MLX bf16 weights.
  `venv-omnivoice` (PyTorch) was not needed.
- **No preset voice, and no cloning here.** Each language uses one voice designed from text tags, with
  the generator reseeded to 42 before every call:
  - English: `female, young adult, moderate pitch, american accent`.
  - Korean: `female, young adult, moderate pitch`. The accent tags are English-only.
- **Speed:** RTF 0.42 EN and 0.41 KO on the Mac GPU, the fastest of the heavy models, at 3.5–3.8 GB
  of MLX memory. The process footprint reaches about 15 GB with MLX's buffer cache; it can be capped.
- **The CPU is not its path:** MLX on the CPU ran at RTF 8.1 on a short probe, on one core. A full
  excerpt run was stopped after six minutes without finishing its first pass. PyTorch fp32 on the CPU
  was not measured; at 64 forward passes of a 0.6B model per chunk it cannot reach a box.
- **Korean voice design is unstable,** as the README warns (it is trained on Chinese and English
  only). 8 Korean renders were tried, over seeds 42, 1, 7 and 2026, sentence-chunked and whole-block:
  - 3 of 8 garbled about half the text. Whisper heard only 46–47 % of the reference length, at CER
    0.58–0.66. The timed seed-42 render was one of them.
  - The other 5 read cleanly: CER 0.21–0.26, Hangul-only 0.12–0.20, as good as Supertonic.
  - The published Korean sample is seed 7 (CER 0.23).
  - A book run would need an ASR check and a re-render per chunk.
- **English voice design is stable:** 4 of 4 seeds read cleanly (CER 0.020–0.028).
- **Voice consistency:** the voice-similarity proxy (below) is lower for the designed voices than for
  any preset voice, so expect some drift between chunks. The automatic voice (no tags) reads Korean
  cleanly (CER 0.24) but changes voice between calls, as R2 found: its proxy is the lowest of all.
- **Licence:** the weights are CC-BY-NC (the code is Apache-2.0). That is fine for the operator's
  personal use and rules out anything commercial.

## Machine checks (R4)

Two proxies ran over all eleven samples. **Neither is an ear:** the operator still picks by listening.
The scripts print numbers only, never text.

- **Intelligibility:** Whisper large-v3-turbo (MLX, 8-bit) transcribes each sample, scored as a
  character error rate (CER) against the excerpt. It catches skipped, repeated or garbled readings.
  - The Korean excerpt holds digits, `%` and Latin names, which every model reads differently. So no
    Korean CER is near 0, and "Hangul-only" scores the Hangul characters alone.
  - "Length" is the transcript's length over the excerpt's; well under 1 means text went missing.
- **Voice consistency:** Chatterbox's speaker encoder embeds each 3 s+ speech segment of a sample.
  "Pairwise min" is the lowest cosine similarity between any two segments. A voice that changes
  between chunks scores low. Content moves it too, so read it against the preset voices.

| Sample | CER | Hangul-only CER | Length | Segments | Pairwise min |
|---|---|---|---|---|---|
| `supertonic3-en-F1` | 0.046 | | 1.02 | 9 | 0.892 |
| `kokoro82m-en-af_heart` | 0.026 | | 1.01 | 11 | 0.892 |
| `qwen3tts17b-en-Aiden` | 0.038 | | 1.02 | 12 | 0.842 |
| `melotts-en-EN-Default` | 0.056 | | 0.99 | 10 | 0.835 |
| `chatterbox-mtl-v3-en` | 0.052 | | 1.01 | 7 | 0.884 |
| `omnivoice-en-designF` | 0.028 | | 1.02 | 10 | 0.743 |
| `supertonic3-ko-F1` | 0.215 | 0.138 | 0.94 | 12 | 0.818 |
| `qwen3tts17b-ko-Sohee` | 0.292 | 0.259 | 0.92 | 15 | 0.739 |
| `melotts-ko-KR` | 0.299 | 0.270 | 0.92 | 13 | 0.806 |
| `chatterbox-mtl-v3-ko` | 0.384 | 0.286 | 1.07 | 10 | 0.793 |
| `omnivoice-ko-designF` (seed 7) | 0.229 | 0.169 | 0.93 | 6 | 0.765 |

- **English:** every model reads the excerpt cleanly (CER ≤ 0.06). Chatterbox's English sample is
  11–14 s shorter than the others because it speaks faster, not because it skips: its length is 1.01.
- **Korean:** Supertonic reads the excerpt most accurately, then OmniVoice when its render does not
  garble. Qwen3, MeloTTS and Chatterbox trail. The proxy is coarse; a model the ear prefers may still
  score lower here.
- **Voice consistency:** the preset voices score 0.84–0.89 in English. OmniVoice's designed voice
  scores 0.70–0.80 over four seeds. In Korean every model scores lower
  (0.74–0.82), even Qwen3's preset *Sohee*, so the encoder is less sure there. OmniVoice's automatic
  Korean voice scores 0.55, the lowest of all.

## Book math

Time to render a book at the measured throughput, at 130k and 300k characters.

**How the box is projected.** "Box 4c" and "box 1c" are a shared Oracle Ampere A1 box with 4 OCPUs
or 1 OCPU, projected from this Mac, not measured.

- **Assumption: one A1 core does about 0.45× the work of one M3 Pro performance core** on this fp32
  inference. The range is about 0.35–0.55: the Neoverse N1 has half the SIMD width, a lower clock and
  no AMX.
- **R4 uses R2's factor unchanged**, so its box figures rest on the same assumption.
- The projection is the Mac's measured figure at the same thread count × 0.45.
- The Qwen3 box figure is single-core-bound, so it is the same at 1 and 4 cores.
- Chatterbox has no 4-thread run, so its box figure scales the 6-thread Mac figure: an optimistic
  bound.
- Korean figures marked "est." scale the English figure by the measured Korean-to-English throughput
  ratio.

| Model, language | Mac CPU | Mac GPU | Box 4c | Box 1c |
|---|---|---|---|---|
| Supertonic 3 EN, 130k / 300k | 28 min / 65 min | 22 / 50 min (CoreML) | 63 min / 2.4 h | 2.3 h / 5.3 h |
| Supertonic 3 KO, 130k / 300k | 48 min / 1.8 h | est. 37 / 85 min | est. 1.8 h / 4.1 h | est. 3.9 h / 9.0 h |
| Kokoro EN, 130k / 300k | 26 min / 59 min | not measured | 70 min / 2.7 h | 3.7 h / 8.5 h |
| Qwen3 1.7B EN, 130k / 300k | 6.2 h / 14.4 h | 2.2 h / 5.0 h | 14 h / 32 h | same |
| Qwen3 1.7B KO, 130k / 300k | est. 12 h / 28 h | 4.2 h / 9.8 h | est. 27 h / 62 h | same |
| MeloTTS EN, 130k / 300k | 23 / 53 min | 6 / 14 min (MPS) | 50 min / 1.9 h | 69 min / 2.6 h |
| MeloTTS KO, 130k / 300k | 63 min / 2.4 h | 28 / 64 min (MPS) | 2.2 h / 5.1 h | 2.9 h / 6.8 h |
| Chatterbox v3 EN, 130k / 300k | 6.0 h / 13.8 h | 3.3 h / 7.6 h (MPS) | est. ≥ 13 h / 31 h | slower still |
| Chatterbox v3 KO, 130k / 300k | 12.5 h / 28.9 h | 5.9 h / 13.5 h (MPS) | est. ≥ 28 h / 64 h | slower still |
| OmniVoice EN, 130k / 300k | est. 23 h / 53 h (MLX CPU probe) | 72 min / 2.8 h | not a box model | not a box model |
| OmniVoice KO, 130k / 300k | not measured | 2.1 h / 4.7 h | not a box model | not a box model |

**What a book plays as.** From the excerpts, a 130k-character English book is about 3 h of audio, and
300k characters about 7 h. In Korean, 130k characters is about 5 h and 300k about 12 h. At 64 kbps
mono, an hour of MP3 is about 29 MB.

## The runner

- **Supertonic 3 → box.**
  - Fast enough as a background job: a 130k-character book in about 1–2 h on 4 OCPUs, or a few hours
    on 1.
  - Small: 0.7 GB of RAM and 0.4 GB on disk.
  - One engine covers both languages under a permissive licence.
  - Run it niced, with 1–2 threads, so the co-tenants keep their CPU. Its scaling stops at 4 threads
    anyway.
- **Kokoro 82M → box, English only.** Similar speed, 1.5 GB of RAM (less with int8), Apache-2.0.
- **MeloTTS → box (R4).**
  - A 130k-character Korean book in about 2–3 h on the box, whether it gets 1 OCPU or 4: one core does
    most of the work, which suits a shared box. English takes about 1 h.
  - Its cost is memory: 3–3.5 GB of RAM for Korean and 5–6 GB for English, against 0.7 GB for
    Supertonic.
  - MIT, with no vendor to lose.
  - It needs `&` and similar symbols normalised before synthesis.
- **Qwen3-TTS 1.7B → Mac (GPU, MLX).**
  - The box is out on speed: 2× slower than real time even on the Mac's CPU, and 14–60 h per book
    projected on the box.
  - It is also out on memory: 15 GB of fp32 RSS.
  - On the Mac's GPU it renders 1.4× faster than real time, so a book takes an evening to overnight
    (2–10 h).
- **OmniVoice → Mac (GPU, MLX) (R4).**
  - The fastest heavy model: a 130k-character book in 1.2 h (EN) or 2.1 h (KO).
  - The lightest heavy model: about 4 GB of MLX memory, so it can run beside the operator's VM.
  - Korean needs an ASR check and a re-render per chunk, because 3 of 8 Korean renders garbled.
  - CC-BY-NC: personal use only.
  - Not the box: RTF 8 on the Mac's CPU.
- **Chatterbox v3 → Mac only, and dominated (R4).**
  - Slower than real time even on the Mac GPU: a 130k-character book takes 3.3 h (EN) or 5.9 h (KO).
  - It needs a 26 GB footprint, and a careless run reached 43 GB.
  - It watermarks every output, and it is unmaintained.
  - Qwen3 beats it on the Mac, and Supertonic and MeloTTS beat it on the box. Run it only if the ear
    picks it.
- **What the Mac path needs:**
  - The Mac on, awake (`caffeinate`) and on power while a book renders.
  - About 13 GB of free unified memory for Qwen3, so no VM running beside it, or a capped MLX cache.
    OmniVoice needs about 4 GB.
  - A job queue on the box that waits until the Mac picks the job up, renders, and uploads the audio.
    The box then serves it (R3 covers playback).
  - A book queued while the Mac is off waits until the Mac is next on.

## Surveyed, not run

As of 2026-11, these were surveyed from the model cards, the Hugging Face trending text-to-speech
list, the `mlx-audio` model table and release notes. Mark "unverified" where only third-party sources
were found. **Disk** means not run because of R2's stop order. R4 lifted that stop and ran Chatterbox,
OmniVoice and MeloTTS (now in *The models run*). The other rows still marked disk were outside R4's
scope.

| Model | Korean | Licence | Size | CPU / Apple-GPU path | Reference voice? | Why not run |
|---|---|---|---|---|---|---|
| Magpie TTS Multilingual 357M (NVIDIA) | official since v2607 (2026-07-21), CER 2.69 % reported | NVIDIA Open Model License | GGUF q8_0 0.62 GB (`magpie-tts.cpp`); NVIDIA's own GGUF Q8_0 0.33 GB | NeMo; GGUF via `magpie-tts.cpp` (CPU, optional Metal); MLX 4-bit and CoreML ports list 9 languages, **no Korean** | no: 5 built-in speakers | **R4 tried and stopped.** The `magpie-tts.cpp` clone (commit `3008ff7`) succeeded; its local build was denied by the permission system (code from an external repository). Not run. Its author reports q8_0 at about 2.6 s of compute per second of audio on a Ryzen 9 9950X3D CPU, so it is **not a light box voice either** |
| Kitten TTS 0.8 (15–80M) | none | Apache-2.0 | 25–80 MB | tiny CPU model; mlx-audio | no | English only; Kokoro is the stronger light English voice; kitten-tts-2 (2026-09, cloning, licence caveats) unverified |
| Piper (OHF piper1-gpl) | no official voice; community KSS model | GPL-3.0 code | ~60 MB/voice | tiny CPU model | no | no official Korean voice; robotic next to Kokoro |
| Fun-CosyVoice3 0.5B (Dec 2025) | official (9 langs) | Apache-2.0 | ~2 GB | MPS, MLX ports | **yes**: zero-shot from prompt audio | needs a reference voice (the no-cloning rule) |
| F5-TTS | community fine-tunes | CC-BY-NC weights | 1.3 GB | MPS | **yes** | needs a reference; Korean community only |
| XTTS-v2 (Coqui, 2023) | official | Coqui Public Model License (non-commercial) | 2.1 GB | slow CPU, MPS | no: built-in studio speakers | an older generation, superseded; Coqui shut down 2024 |
| Orpheus 3B (Canopy) + multilingual | research release incl. Korean | Apache (weights on Llama) | ~6 GB | GPU only; mlx-audio | no: 8 EN voices | heavy; Korean a research preview |
| VibeVoice-Realtime 0.5B (Microsoft) | experimental speakers in 9 langs incl. Korean, "not extensively tested" | MIT | ~2 GB | mlx-audio | no | Korean experimental; disk |
| VoxCPM2 (OpenBMB, 2026), 2B | official (30 langs) | Apache-2.0 | 5 GB | mlx-audio | optional (voice design) | **disk**; a strong heavy candidate for the Mac |
| Ming-3.0-TTS 0.5B (Ant, 2026-10) | supported, but built-in voices only zh/en | MIT | 3 GB | mlx-audio | no Korean preset | no Korean built-in voice; disk |
| Higgs Audio v2 3B / Higgs TTS 3 4B (Boson, 2026-06) | v2 lists KO; v3 100 langs | research / non-commercial (+ creator grant) | 6–8 GB | GPU; mlx-audio | presets + cloning | heavy; licence |
| Fish Audio S2 Pro (2026-03, 4–5B) / drama-3 (35B MoE) | 80+ langs, Korean unconfirmed | Fish Audio Research License (non-commercial) | 8+ GB | GPU | cloning | heavy |
| Voxtral TTS 4B (Mistral, 2026-03) | **no** (9 langs) | CC-BY-NC-4.0 | 8 GB | mlx-audio | no: 20 presets | no Korean; heavy |
| ZONOS2 (Zyphra, 2026-06), 8B MoE | tier 2 | Apache-2.0 | large | GPU | cloning-focused | heavy; ZONOS3-Mini (this month) unverified |
| Spark-TTS 0.5B, IndexTTS-2, Dia / Dia2, NeuTTS Air/Nano | none | various | – | – | Spark, IndexTTS and NeuTTS clone | no Korean |
| Phonon 31M/40M (Gradium, 2026-10) | none (en, fr, de, es, pt) | CC-BY-NC-4.0 | <75 MB | very fast CPU | no | no Korean; an English light alternative |
| Kani-TTS 400M-ko, MOSS-TTS-Nano 100M, Pocket TTS (Kyutai) | Kani has a Korean model; MOSS-Nano lists KO (third-party); Pocket's 6 langs unconfirmed | Apache-2.0 (claimed) | small | CPU | MOSS and Pocket clone | unverified; disk |

**A box runtime worth a look later:** `audio.cpp` (2026), a ggml C++ runtime without Python. It
packages Kokoro, Supertonic 3 (q8, ~0.45 GB), Qwen3-TTS 0.6B/1.7B (GGUF q8), Chatterbox, OmniVoice and
VoxCPM2. Quantized Qwen3 on CPU is the one way a heavy Korean voice might reach the box; its ARM
performance is unverified. `mlx-audio` 0.6.5 also carries MLX ports of MeloTTS and Chatterbox; R4 did
not measure them.

## Recommendation

The operator picks by ear; this is what to listen for first. Six models have now been heard: eleven
samples in `manifest.json`.

- **Korean, box:** **Supertonic 3** first (try F1, then the other nine voices).
  - It reads the Korean excerpt most accurately of the five Korean voices (Whisper CER 0.22) and needs
    0.7 GB of RAM.
  - **MeloTTS `KR` does not change this answer, but it is now the measured box fallback for Korean.**
    It is MIT with no vendor in liquidation, and as fast on one shared core. Against it: 3–3.5 GB of
    RAM, a single voice, and a weaker Whisper reading (0.30). Listen to it second.
- **Korean, best voice:** **Qwen3-TTS 1.7B, Sohee**, on the Mac GPU, rendering overnight. Use it if
  neither box voice is good enough by ear: that is the operator's "if no good from the research".
  - **Chatterbox does not change the Korean answer, for the box or for the Mac.** It is slower than
    real time even on the Mac GPU, needs a 26 GB footprint, watermarks its audio and is unmaintained.
    Its Korean sample read the weakest of the five (CER 0.38).
  - **OmniVoice** is faster and lighter than Qwen3 on the Mac (RTF 0.41, about 4 GB). When it does
    not garble, its Korean reads as accurately as Supertonic's. But 3 of 8 designed Korean renders
    garbled half the text, so it needs an ASR gate and retries, and its weights are non-commercial.
    It is a second Mac option for Korean, not the first.
- **English, box:** **Kokoro 82M, af_heart**, or Supertonic 3 to keep one engine. MeloTTS
  `EN-Default` is a third box option: fast, but 5–6 GB of RAM.
- **English, Mac:** **Qwen3-TTS 1.7B, Aiden** or **OmniVoice's designed voice**, if either is clearly
  better by ear than the box voices.
  - OmniVoice read 4 of 4 English renders cleanly, 1.7× faster than Qwen3 at a third of the memory.
  - Its designed voice drifts a little between chunks.
- **The proposal:** unchanged at its core.
  - Box first with Supertonic 3, and Kokoro for English if preferred.
  - MeloTTS is the box fallback for Korean.
  - The Mac is the fallback for whichever language fails the ear test: Qwen3 (and OmniVoice for
    English, or for Korean behind an ASR gate).
- **Not heard:** Magpie (its build was denied, and it is not light on a CPU anyway), and the models in
  *Surveyed, not run*.

## The box's projected fit

The box's OCPUs and RAM, and what its co-tenants leave free, are unknown: this is the phase's operator
question. On the projection above:

- **Any shape with ≥1 free OCPU and ≥1.5 GB of free RAM** runs Supertonic 3 or Kokoro as a background
  job. A 130k-character book takes about 1–2 h on 4 OCPUs and 2–4 h on 1. A 300k Korean book takes
  4–9 h.
- **MeloTTS (R4) needs ≥1 free OCPU and about 3.5 GB of free RAM for Korean** (5–6 GB for English). A
  130k-character Korean book takes about 2–3 h on 1–4 OCPUs, and a 300k one 5–7 h. On a single free core
  it is the fastest Korean box voice measured.
- **No plausible free shape runs Qwen3-TTS 1.7B:** it needs 15 GB of RAM and 14–60 h per book.
- **Chatterbox (CPU RTF 2.8–3.2 on the Mac) and OmniVoice (RTF 8) are out too.** The heavy voices are
  the Mac's.
- **The projection factor (0.45 per core) is the weakest number here.** A 10-second timing run on the
  box would replace it, once the operator allows one. Neither slice touched the box.

## Sources

- Supertonic 3: [Hugging Face card](https://huggingface.co/Supertone/supertonic-3), [Supertone announcement](https://www.supertone.ai/en/work/faster-and-more-accurate-across-31-languages----introducing-supertonic-3), [MarkTechPost](https://www.marktechpost.com/2026/05/15/supertone-releases-supertonic-v3-on-device-text-to-speech-model-with-31-language-support-fewer-reading-failures-and-expression-tags/); the wind-down: [Music Business Worldwide](https://www.musicbusinessworldwide.com/hybe-winds-down-ai-voice-company-supertone-after-investing-nearly-35m/), [Edaily](https://en.edaily.co.kr/news/eda202607275504/)
- Kokoro: [hexgrad/Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M), [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx)
- Qwen3-TTS: [Qwen3-TTS-12Hz-1.7B-CustomVoice](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice), [QwenLM/Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS)
- mlx-audio model table: [README](https://cdn.jsdelivr.net/gh/blaizzy/mlx-audio@main/README.md); trending: [Hugging Face text-to-speech, trending](https://huggingface.co/models?pipeline_tag=text-to-speech&sort=trending)
- OmniVoice: [k2-fsa/OmniVoice](https://huggingface.co/k2-fsa/OmniVoice) (CC-BY-NC weights, 0.6B; read 2026-11-11), [GitHub](https://github.com/k2-fsa/OmniVoice) (voice design trained on Chinese and English only; read 2026-11-11)
- Chatterbox: [resemble-ai/chatterbox](https://github.com/resemble-ai/chatterbox) (v3; retired and unmaintained since 2026-08; PerTh detection; read 2026-11-11), [Resemble multilingual V3](https://www.resemble.ai/learn/models/chatterbox-multilingual) (MIT, PerTh watermark; read 2026-11-11)
- MeloTTS: [myshell-ai/MeloTTS-Korean](https://huggingface.co/myshell-ai/MeloTTS-Korean) (MIT, CPU real-time claim; read 2026-11-11), [myshell-ai/MeloTTS](https://github.com/myshell-ai/MeloTTS)
- Magpie: [nvidia/magpie_tts_multilingual_357m](https://huggingface.co/nvidia/magpie_tts_multilingual_357m) (Korean since v2607, CER 2.69 %; read 2026-11-11), [NVIDIA blog](https://huggingface.co/blog/nvidia/magpie-tts-multilingual-voice-agents), [mudler/magpie-tts.cpp](https://github.com/mudler/magpie-tts.cpp) and [its GGUFs](https://huggingface.co/mudler/magpie-tts.cpp-gguf) (languages incl. ko, CPU figures; read 2026-11-11), [MLX 4-bit port](https://huggingface.co/aufklarer/Magpie-TTS-Multilingual-357M-MLX-4bit) (9 languages, no Korean; read 2026-11-11)
- Whisper for the intelligibility check: [mlx-community/whisper-large-v3-turbo-8bit](https://huggingface.co/mlx-community/whisper-large-v3-turbo-8bit) (read 2026-11-11)
- VoxCPM2: [openbmb/VoxCPM2](https://huggingface.co/openbmb/VoxCPM2); Ming-3.0: [AlphaSignal](https://alphasignal.ai/news/ant-group-s-ming-3-0-beats-larger-voice-models-at-just-0-5b-parameters); Voxtral TTS: [Mistral](https://mistral.ai/news/voxtral-tts/), [model card](https://huggingface.co/mistralai/Voxtral-4B-TTS-2603)
- Higgs: [bosonai/higgs-audio-v3-tts-4b](https://huggingface.co/bosonai/higgs-audio-v3-tts-4b); Fish S2: [fish.audio/s2](https://fish.audio/s2/); ZONOS2: [Zyphra/ZONOS2](https://huggingface.co/Zyphra/ZONOS2)
- VibeVoice Realtime: [microsoft/VibeVoice](https://github.com/microsoft/VibeVoice); Phonon: [Gradium](https://gradium.ai/blog/release-phonon-open-weight); Kitten: [KittenML/KittenTTS](https://github.com/KittenML/KittenTTS); Piper Korean: [neurlang/piper-onnx-kss-korean](https://huggingface.co/neurlang/piper-onnx-kss-korean)
- CosyVoice 3: [aufklarer/CosyVoice3-0.5B-MLX-bf16](https://huggingface.co/aufklarer/CosyVoice3-0.5B-MLX-bf16); Kani: [nineninesix/kani-tts-370m](https://huggingface.co/nineninesix/kani-tts-370m); Pocket TTS: [Kyutai](https://kyutai.org/blog/2026-05-04-pocket-tts-multilingual/); audio.cpp: [Better Stack guide](https://betterstack.com/community/guides/ai/audio-cpp/)
