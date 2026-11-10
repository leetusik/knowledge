# Free voice models for Listen: what runs where (P41-sr.R2)

Findings of `P41-sr.R2` (research, 2026-11-11). It was cut short by a disk stop: the Mac's SSD reached
99 %, so the orchestrator stopped every new download and install. **Three models were run**: two
light ones and one heavy one. Two more heavy models are downloaded and installed but were not run
(see *Surveyed, not run*). The samples, the manifest and the raw timings are in the gitignored
`.cache/p41-voices/models/`: `manifest.json`, the `*.mp3` samples, and `_raw/` (per-run JSON,
`bench.log`, `mem.jsonl`). The bench scripts are in `_bench/`. The excerpts are documents 67 v2 (EN)
and 72 v1 (KO), the same blocks R1 uses; their text is never quoted here.

## Summary

| Model | Korean | Licence | Size on disk | CPU RTF (Mac) | GPU RTF (Mac) | Peak memory | Runner | Samples |
|---|---|---|---|---|---|---|---|---|
| Supertonic 3, 99M, ONNX | official (31 langs) | OpenRAIL-M model, MIT code | 0.39 GB | 0.158 EN, 0.157 KO (all threads); 0.161 at 4 threads; 0.351 at 1 thread | 0.122 (ONNX CoreML EP) | 0.70 GB RSS (CPU); 6.4 GB on CoreML | **box** | `supertonic3-en-F1.mp3`, `supertonic3-ko-F1.mp3` |
| Kokoro 82M v1.0, ONNX fp32 | none | Apache-2.0 | 0.35 GB | 0.155 (all threads); 0.190 at 4; 0.601 at 1 | not measured (mlx-audio path exists) | 1.48 GB RSS | **box** (EN only) | `kokoro82m-en-af_heart.mp3` |
| Qwen3-TTS 12Hz 1.7B CustomVoice | official (10 langs), native Korean speaker *Sohee* | Apache-2.0 | 4.52 GB | 2.06 EN (PyTorch fp32, 1 run) | 0.73 EN, 0.73 KO (MLX bf16) | CPU 14.9 GB RSS; GPU 11.5–13.1 GB MLX active, 28–29 GB process footprint | **mac** | `qwen3tts17b-en-Aiden.mp3`, `qwen3tts17b-ko-Sohee.mp3` |

- **RTF** is render time ÷ audio time; under 1 is faster than real time.
- **Throughput** (characters per second, best of 3):
  - Supertonic: 77.5 EN, 45.5 KO.
  - Kokoro: 84.3 EN.
  - Qwen3 on the GPU: 16.6 EN, 8.5 KO.
  - Qwen3 on the CPU: 5.8 EN.
- **Korean carries more speech per character.** The 393-character Korean excerpt reads about as long
  as the 626-character English one, so a Korean book of the same size takes longer to render.
- **Noisy timings.** R1, R3 and S1 ran beside this slice, so all timings are noisy. The light models'
  three runs agree within 2–10 %.
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

## Book math

Time to render a book at the measured throughput, at 130k and 300k characters.

**How the box is projected.** "Box 4c" and "box 1c" are a shared Oracle Ampere A1 box with 4 OCPUs
or 1 OCPU, projected from this Mac, not measured.

- **Assumption: one A1 core does about 0.45× the work of one M3 Pro performance core** on this fp32
  inference. The range is about 0.35–0.55: the Neoverse N1 has half the SIMD width, a lower clock and
  no AMX.
- The projection is the Mac's measured figure at the same thread count × 0.45.
- The Qwen3 box figure is single-core-bound, so it is the same at 1 and 4 cores.
- Korean figures marked "est." scale the English figure by the measured Korean-to-English throughput
  ratio.

| Model, language | Mac CPU | Mac GPU | Box 4c | Box 1c |
|---|---|---|---|---|
| Supertonic 3 EN, 130k / 300k | 28 min / 65 min | 22 / 50 min (CoreML) | 63 min / 2.4 h | 2.3 h / 5.3 h |
| Supertonic 3 KO, 130k / 300k | 48 min / 1.8 h | est. 37 / 85 min | est. 1.8 h / 4.1 h | est. 3.9 h / 9.0 h |
| Kokoro EN, 130k / 300k | 26 min / 59 min | not measured | 70 min / 2.7 h | 3.7 h / 8.5 h |
| Qwen3 1.7B EN, 130k / 300k | 6.2 h / 14.4 h | 2.2 h / 5.0 h | 14 h / 32 h | same |
| Qwen3 1.7B KO, 130k / 300k | est. 12 h / 28 h | 4.2 h / 9.8 h | est. 27 h / 62 h | same |

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
- **Qwen3-TTS 1.7B → Mac (GPU, MLX).**
  - The box is out on speed: 2× slower than real time even on the Mac's CPU, and 14–60 h per book
    projected on the box.
  - It is also out on memory: 15 GB of fp32 RSS.
  - On the Mac's GPU it renders 1.4× faster than real time, so a book takes an evening to overnight
    (2–10 h).
- **What the Mac path needs:**
  - The Mac on, awake (`caffeinate`) and on power while a book renders.
  - About 13 GB of free unified memory, so no VM running beside it, or a capped MLX cache.
  - A job queue on the box that waits until the Mac picks the job up, renders, and uploads the audio.
    The box then serves it (R3 covers playback).
  - A book queued while the Mac is off waits until the Mac is next on.

## Surveyed, not run

As of 2026-11, these were surveyed from the model cards, the Hugging Face trending text-to-speech
list, the `mlx-audio` model table and release notes. Mark "unverified" where only third-party sources
were found. **Disk** means not run because of the stop order.

| Model | Korean | Licence | Size | CPU / Apple-GPU path | Reference voice? | Why not run |
|---|---|---|---|---|---|---|
| Chatterbox Multilingual v3 (Resemble AI, 2026), ~0.5B | official (23 langs) | MIT, audio watermarked | 3.2 GB | AR, slow on CPU; PyTorch MPS, mlx-audio | no: built-in default voice | **disk**: the weights (3.21 GB) and the venv (from GitHub master `ab55923`; PyPI 0.1.7 lacks v3) are on disk; a run needs nothing new |
| OmniVoice (k2-fsa, Apr 2026), 0.6B | in 646 langs | Apache code, **CC-BY-NC weights** | 1.6 GB MLX | diffusion; mlx-audio, MPS | optional: voice design is trained on zh/en only, so Korean design "may be unstable"; auto voice changes per call | **disk**: the MLX weights (1.64 GB) are on disk; a run needs nothing new |
| MeloTTS (MyShell, 2024), VITS2 | official, one KR voice | MIT | 0.2 GB + a 0.47 GB Korean BERT | made for CPU, real time; MPS | no | **disk**: venv installed, weights not downloaded |
| Magpie TTS Multilingual 357M (NVIDIA) | added, CER 2.69 % reported | NVIDIA Open Model License | ~0.7 GB (est.) | NeMo; MLX 4-bit, CoreML, GGUF (`magpie-tts.cpp`) ports | no: built-in speakers | **disk**, and a heavy NeMo install. **The next light Korean candidate to try** |
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
performance is unverified.

## Recommendation

The operator picks by ear; this is what to listen for first.

- **Korean, box:** **Supertonic 3** (try F1, then the other nine voices). It is the only light model
  measured with official Korean, and the only one here that serves both languages on the box.
- **Korean, best voice:** **Qwen3-TTS 1.7B, Sohee**, on the Mac GPU, rendering overnight. Use it if
  Supertonic's Korean is not good enough by ear: that is the operator's "if no good from the
  research".
- **English, box:** **Kokoro 82M, af_heart**, or Supertonic 3 to keep one engine.
- **English, Mac:** **Qwen3-TTS 1.7B, Aiden** if it is clearly better by ear.
- **The proposal:** box first with Supertonic 3, and Kokoro for English if preferred. The Mac and Qwen3
  are the fallback for whichever language fails the ear test.
- **Not yet heard** (weights already on disk, no download needed): Chatterbox v3 (built-in voice, both
  languages) and OmniVoice.

## The box's projected fit

The box's OCPUs and RAM, and what its co-tenants leave free, are unknown: this is the slice's operator
question. On the projection above:

- **Any shape with ≥1 free OCPU and ≥1.5 GB of free RAM** runs Supertonic 3 or Kokoro as a background
  job. A 130k-character book takes about 1–2 h on 4 OCPUs and 2–4 h on 1. A 300k Korean book takes
  4–9 h.
- **No plausible free shape runs Qwen3-TTS 1.7B:** it needs 15 GB of RAM and 14–60 h per book. The
  heavy voices are the Mac's.
- **The projection factor (0.45 per core) is the weakest number here.** A 10-second timing run on the
  box would replace it, once the operator allows one. This slice never touched the box.

## Sources

- Supertonic 3: [Hugging Face card](https://huggingface.co/Supertone/supertonic-3), [Supertone announcement](https://www.supertone.ai/en/work/faster-and-more-accurate-across-31-languages----introducing-supertonic-3), [MarkTechPost](https://www.marktechpost.com/2026/05/15/supertone-releases-supertonic-v3-on-device-text-to-speech-model-with-31-language-support-fewer-reading-failures-and-expression-tags/); the wind-down: [Music Business Worldwide](https://www.musicbusinessworldwide.com/hybe-winds-down-ai-voice-company-supertone-after-investing-nearly-35m/), [Edaily](https://en.edaily.co.kr/news/eda202607275504/)
- Kokoro: [hexgrad/Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M), [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx)
- Qwen3-TTS: [Qwen3-TTS-12Hz-1.7B-CustomVoice](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice), [QwenLM/Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS)
- mlx-audio model table: [README](https://cdn.jsdelivr.net/gh/blaizzy/mlx-audio@main/README.md); trending: [Hugging Face text-to-speech, trending](https://huggingface.co/models?pipeline_tag=text-to-speech&sort=trending)
- OmniVoice: [k2-fsa/OmniVoice](https://huggingface.co/k2-fsa/OmniVoice), [GitHub](https://github.com/k2-fsa/OmniVoice)
- Chatterbox: [resemble-ai/chatterbox](https://github.com/resemble-ai/chatterbox), [Resemble multilingual V3](https://www.resemble.ai/learn/models/chatterbox-multilingual)
- Magpie: [nvidia/magpie_tts_multilingual_357m](https://huggingface.co/nvidia/magpie_tts_multilingual_357m), [NVIDIA blog](https://huggingface.co/blog/nvidia/magpie-tts-multilingual-voice-agents)
- VoxCPM2: [openbmb/VoxCPM2](https://huggingface.co/openbmb/VoxCPM2); Ming-3.0: [AlphaSignal](https://alphasignal.ai/news/ant-group-s-ming-3-0-beats-larger-voice-models-at-just-0-5b-parameters); Voxtral TTS: [Mistral](https://mistral.ai/news/voxtral-tts/), [model card](https://huggingface.co/mistralai/Voxtral-4B-TTS-2603)
- Higgs: [bosonai/higgs-audio-v3-tts-4b](https://huggingface.co/bosonai/higgs-audio-v3-tts-4b); Fish S2: [fish.audio/s2](https://fish.audio/s2/); ZONOS2: [Zyphra/ZONOS2](https://huggingface.co/Zyphra/ZONOS2)
- VibeVoice Realtime: [microsoft/VibeVoice](https://github.com/microsoft/VibeVoice); Phonon: [Gradium](https://gradium.ai/blog/release-phonon-open-weight); Kitten: [KittenML/KittenTTS](https://github.com/KittenML/KittenTTS); Piper Korean: [neurlang/piper-onnx-kss-korean](https://huggingface.co/neurlang/piper-onnx-kss-korean)
- CosyVoice 3: [aufklarer/CosyVoice3-0.5B-MLX-bf16](https://huggingface.co/aufklarer/CosyVoice3-0.5B-MLX-bf16); Kani: [nineninesix/kani-tts-370m](https://huggingface.co/nineninesix/kani-tts-370m); Pocket TTS: [Kyutai](https://kyutai.org/blog/2026-05-04-pocket-tts-multilingual/); audio.cpp: [Better Stack guide](https://betterstack.com/community/guides/ai/audio-cpp/)
