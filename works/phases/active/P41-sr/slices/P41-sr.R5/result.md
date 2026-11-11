# P41-sr.R5: result

## Verdict

- **status:** done
- **route:** research
- **model:** opus
- **effort:** xhigh
- **summary:** Weighed over 20 candidates that are recent, speak Korean, run on this Mac and have a community
  following. Ran four of them here in both languages: Ming-3.0-tts 0.5B, VoxCPM2 2B, Fish Audio S2 Pro 5B (8-bit)
  and Audio8-TTS-Realistic-Air 0.6B. The manifest now holds 19 samples.
  - **First pick for Korean on the Mac: Fish Audio S2 Pro.** It beats Qwen3-TTS Sohee on Whisper (CER 0.20
    against 0.29), on voice steadiness (0.87 against 0.74) and on the community's Korean figure. It is slower
    than real time (RTF 1.9), so a 130k-character book takes about 9 h.
  - **First pick for English: Ming-3.0 US_Emma on the Mac.** It is the arena's highest-rated model heard
    (Elo 1185), has the cleanest Whisper reading (0.022), and runs at RTF 0.42.
- **files_changed:**
  - `works/phases/active/P41-sr/topics/voice-models.md` (edited in place)
  - `works/phases/active/P41-sr/slices/P41-sr.R5/result.md` (new)
  - gitignored, never committed (`.gitignore:3:.cache/`):
    - `.cache/p41-voices/models/`:
      - `manifest.json`: 8 entries appended. The first 11 are byte-identical; backup in `_raw/manifest.r4.json`.
      - 8 new `*.mp3` samples.
      - `_raw/`: R5's run JSONs and WAVs; `asr_seg.json`, `*.asrseg.txt`, the new `*.asr.txt`; the
        `r5-probe/`, `r5-anchor/` and `r5-superseded/` folders.
      - `_raw/asr.json`, `_raw/spk.json`, `bench.log`, `mem.jsonl` and `results.log` had entries appended.
        Backups: `asr.r4.json.bak-r5` and `spk.r4.json`.
      - `_bench/`: 9 new scripts, all named `r5_*` or `b_r5_*`. No earlier script was edited.
    - `.cache/p41-voices/venv-voxcpm2/`, `venv-ming3/`, `venv-fishs2/`, `venv-audio8/`: new.
  - outside the repo: four new Hugging Face cache repos (see the cleanup list).
- **validation:**
  - `manifest.json` parses: 19 entries, all in the pinned 13-key shape. Every `file` exists, and its `ffprobe`
    duration matches `seconds`, the earlier 11 included. **pass**
  - `git check-ignore -v` on the manifest, a sample, `_raw/asr_seg.json`, an anchor WAV, `_bench/b_r5_mlx.py`
    and the four new venvs: all ignored by `.gitignore:3:.cache/`. **pass**
  - Excerpt-leak check (`_bench/r5_leak_check.py`, R4's rule) over the topic and this file: 0 excerpt
    n-grams. It prints counts only. **pass**
  - `git status --porcelain --untracked-files=all`: of mine, only `topics/voice-models.md` and
    `slices/P41-sr.R5/result.md`. The other modified files were already modified at the start; `plan.md` and
    `slice.json` are the orchestrator's; `UPDATE_REQUIRED.md` was left alone. **pass**
  - `python3 scripts/workflow.py validate`: see *Validation* below. **pass**
- **deviations:**
  1. **The excerpts were split into sentence packs** for VoxCPM2 (≤ 120 characters), Ming-3.0 and Audio8
     (≤ 100). R2 and R4 rendered a paragraph per call. Each model needs this:
     - VoxCPM2 garbled whole Korean paragraphs.
     - `mlx-audio`'s Ming splitter never splits Hangul, so Korean stopped after about 15 s.
     - Audio8 is capped at about 24 s per call.

     Fish rendered each excerpt in **one** call, as `<|speaker:0|>` turns, so that it keeps its voice.
  2. **Fish S2 Pro was not in the plan's candidate list.** I added it, and Audio8: they had the best Korean
     benchmark figure and the top Korean trending rank. Under the operator's widened licence line, Fish's
     non-commercial licence no longer counts against it.
  3. **A second Whisper pass was added** (`_bench/r5_asr_seg.py`, piece by piece). On VoxCPM2's first render,
     the whole-file pass lost the text. The topic keeps the whole-file pass as the main column, R4's method,
     and gives the second pass as a cross-check.
  4. **Extra probes beyond the plan, within the limits:**
     - seed-stability renders: VoxCPM2 KO ×3 plus 2 with a Korean description, EN ×2; Ming KO ×3 and EN ×1;
       Fish KO ×1;
     - Fish's cross-call tests: isolated calls, and the warm-up anchor test on my own sentences;
     - a Ming probe on the MLX CPU path.

     I cannot listen, so these are the machine stand-in.
  5. **Not measured:** CPU throughput for VoxCPM2, Fish and Audio8. MLX on the CPU is one core in bf16, and
     Ming's probe (RTF 3.6) already shows the class is no box model. Cold load times come from the first probe
     of each model.
- **doc_impact:** none (findings only)
- **notebook:** this slice runs alone, so these are for the orchestrator to write into `phase.md`:
  - **Notes for later slices:** `**(from P41-sr.R5, for P41-sr.DECOMP2)**` New first picks, by machine
    evidence, which the operator confirms by ear:
    - **Korean, Mac: Fish Audio S2 Pro** (8-bit MLX). It reads Korean best (Whisper CER 0.20, voice proxy
      0.87, against Sohee's 0.29 and 0.74), at RTF 1.9 (about 9 h per 130k characters), 15–17 GB, under a
      non-commercial licence. It needs one conversation per section, each opened with a fixed warm-up that is
      discarded.
    - **English, Mac: Ming-3.0 US_Emma** (MIT, arena Elo 1185, RTF 0.42, 4.4 GB). Ming's Korean must be
      pre-split.
    - The box is unchanged: Supertonic 3, with MeloTTS as the Korean fallback.

    → `topics/voice-models.md` § Recommendation, § Round 3 (R5)
  - **Operator Questions:** none.
  - **Now:** `- **Landed (P41-sr.R5):** 4 more voice models run (19 samples). New Mac first picks: Fish S2 Pro
    for Korean (it beats Sohee on Whisper and voice steadiness, but takes about 9 h per 130k characters) and
    Ming-3.0 US_Emma for English. The box is unchanged (Supertonic 3). Detail in `topics/voice-models.md`.`

## What I did

1. **Read** R2's plan, R4's plan and result, the topic, and the phase notebook's `Now` and voice notes.
2. **Surveyed** as of 2026-11-11, with read dates and links in the topic's *Round 3 (R5)* and *Sources*:
   - the Hugging Face trending text-to-speech list, overall and filtered to Korean;
   - the Hugging Face and GitHub APIs, for likes, downloads, stars, created and pushed dates;
   - the Artificial Analysis speech arena;
   - the `mlx-audio` 0.6.0–0.6.5 release notes and model table, and the installed package's model folders;
   - a Korean "local TTS" awesome-list, Korean press on KRAFTON's Raon models, and a Korean blog that tested
     Ming-3.0 on a Mac.

   Reddit refused the fetcher. Its one figure (VoxCPM2's launch thread) comes second-hand from a review I
   read.
3. **Runs**, each in its own uv venv and best of 3 unless noted. The venvs were installed offline from
   `venv-mlx`'s freeze (`mlx-audio` 0.6.5, `mlx` 0.32.4). Characters: 393 KO and 626 EN.

   | Run | Load (warm / cold) | Best gen / audio | RTF | Chars/s | MLX peak | Footprint |
   |---|---|---|---|---|---|---|
   | VoxCPM2 bf16 KO, packs ≤ 120, seed 42 | 2.9 s / 11 s | 38.26 / 48.82 s | 0.784 | 10.3 | 10.1 GB | 30.5 GB |
   | VoxCPM2 bf16 EN, packs ≤ 120, seed 42 | 3.0 s | 27.11 / 39.06 s | 0.694 | 23.1 | 8.9 GB | 22.0 GB |
   | Ming-3.0 bf16 KO, US_Emma, packs ≤ 100 | 1.6 s / 11 s | 20.57 / 49.4 s | 0.416 | 19.1 | 4.4 GB | 12.6 GB |
   | Ming-3.0 bf16 EN, US_Emma | 1.6 s | 19.18 / 46.0 s | 0.417 | 32.6 | 4.4 GB | 11.6 GB |
   | Fish S2 Pro 8-bit KO, one call, seed 42 | 3.8 s / 31 s | 96.29 / 50.76 s | 1.897 | 4.1 | 15.2 GB | 31.3 GB |
   | Fish S2 Pro 8-bit EN, one call, seed 42 | 4.0 s | 110.68 / 56.98 s | 1.942 | 5.7 | 17.4 GB | 29.4 GB |
   | Audio8 bf16 KO, packs ≤ 100, seed 42 | 0.4 s | 39.48 / 52.11 s | 0.758 | 10.0 | 10.4 GB | 29.8 GB |
   | Audio8 bf16 EN, packs ≤ 100, seed 42 | 0.8 s | 39.52 / 50.94 s | 0.776 | 15.8 | 10.6 GB | 31.0 GB |
   | Ming-3.0 on the MLX CPU, probe sentence, 1 run | 3.2 s | 31.66 / 8.8 s | 3.6 | | RSS 3.6 GB | |

   - Fish's harness count is 397 characters, because joining the blocks adds 4 separator characters. Its
     characters a second use the true 393 and 626.
   - The Mac's swap reached 14 GB during the Fish runs, beside the operator's VM.
4. **Machine checks** over all 19 samples, as R4 did:
   - **Whisper, whole file (`asr_check.py`), with Hangul-only CER computed from its transcripts.** R4's five
     Korean figures reproduce exactly.
   - **The voice proxy (`spk_check.py`).**
   - **The new segmented Whisper pass (`r5_asr_seg.py`).**

   Results are in the topic's *Machine checks* table.
5. **Stability probes** (segmented Whisper CER):

   | Render | CER | Hangul-only | Length | Voice proxy |
   |---|---|---|---|---|
   | VoxCPM2 KO, whole paragraphs, seed 42 (first render) | 0.732 | 0.836 | 0.83 | |
   | VoxCPM2 KO, packs ≤ 120, seeds 42 / 1 / 7 / 2026 | 0.257 / 0.599 / 0.285 / 0.278 | 0.212 / 0.619 / 0.259 / 0.196 | 0.88 / 0.55 / 0.89 / 0.87 | 0.64 / 0.68 / 0.73 / 0.82 |
   | VoxCPM2 KO, Korean description, seeds 42 / 1 | 0.239 / 0.430 | 0.159 / 0.381 | 0.92 / 0.75 | |
   | VoxCPM2 EN, seeds 42 / 1 / 7 | 0.054 / 0.074 / 0.068 | | 0.97–0.99 | 0.70 (seed 42) |
   | Ming KO, whole paragraphs (the port bug), US_Emma / 灵小柔 | 0.680 / 0.665 | 0.561 / 0.550 | 0.39 / 0.36 | |
   | Ming KO, packs ≤ 100: timed, pick, seeds 1 / 7 / 2026 (US_Emma) | 0.275 / 0.271 / 0.239 / 0.268 / 0.296 | 0.180 / 0.201 / 0.169 / 0.233 / 0.206 | 0.84–0.89 | 0.64 / – / 0.59 / 0.70 / 0.67 |
   | Ming KO, packs ≤ 100, 灵小柔 | 0.296 | 0.201 | 0.84 | |
   | Ming EN, timed / seed 7 | 0.022 / 0.028 | | 1.01 | 0.86 (timed) |
   | Fish KO, one call, seeds 42 / 7 | 0.201 / 0.222 | 0.122 / 0.148 | 0.92 / 0.88 | 0.87 / 0.81 |
   | Fish KO, one call per pack, untagged / tagged | 1.039 / 0.683 | 1.000 / 0.677 | 1.11 / 0.78 | |

   - The untagged per-pack Fish render was detected by Whisper as English: the model spoke the style
     instruction, not the text.
6. **The Fish warm-up test** (`_bench/r5_fish_anchor.py`, my own Korean sentences, seed 42, same instruction).
   It ran four conversations: passages A and B, each with and without a fixed warm-up sentence whose audio
   is discarded.
   - Whole-clip speaker-embedding similarity, A against B: **0.974 with the warm-up, 0.759 without**.
   - Whisper read both warm-up conversations verbatim. Without the warm-up, A's first word was garbled, and
     B began by reading the style instruction aloud.
   - This is one pair, not a chapter.
7. **The manifest, the topic, the book math and the recommendation:** see the topic.

## Dead ends and side findings

- **The `mlx-audio` Ming splitter bug.** `_semantic_length` counts Chinese characters and Latin words only,
  so Korean text is never split and is cut off at the 512-position cache. Worth an upstream issue, or a
  pre-split in any build.
- **VoxCPM2 tolerates long English but not long Korean.** Whole Korean paragraphs garbled; packs of
  ≤ 120 characters fixed most seeds.
- **Fish's port keeps the whole conversation**, with no trimming, inside a 32,768-token context. That is
  about 20 minutes of audio per conversation, so a book needs several, each opened with the warm-up.
- **ZONOS3-Mini's default voices are bundled speaker recordings** (`.wav`, with embeddings made from them).
  Using one would clone a bundled recording, so it was surveyed, not run.
- **Disk.** Free space went 57 → 89 → 77 → 38 GiB during the slice. This slice's own downloads total about
  16 GiB, and the uv cache did not grow. The final drop of about 39 GiB came after the last download, so most
  of it is outside this slice (swap and other activity on the Mac). It stayed above the 25 GiB floor, and no
  model was added after it.
- **The rules were kept:**
  - No voice cloning. Only a trained preset (Ming's US_Emma), a model's own default voice (Audio8), and
    voices from text descriptions (VoxCPM2, Fish). No reference clip, no bundled demo clip, and no embedding
    from one.
  - Never touched the box.
  - Deleted nothing that existed before. The only files moved were R5's own superseded renders, into
    `_raw/r5-superseded/`.
  - No excerpt text was printed or pasted. The checks print counts; the probes use my own sentences.
  - No permission denial was met.

## Cleanup list

For the orchestrator and the operator. Sizes come from `du`. The venvs were installed from the uv cache and
APFS clones their files, so their real disk cost is far below the listed size: free disk did not move when
they were made.

| Path | Size | Made by | State |
|---|---|---|---|
| `.cache/p41-voices/venv-voxcpm2` | 1.2 GB listed (cloned) | R5 | used (VoxCPM2) |
| `.cache/p41-voices/venv-ming3` | 1.2 GB listed (cloned) | R5 | used (Ming-3.0) |
| `.cache/p41-voices/venv-fishs2` | 1.2 GB listed (cloned) | R5 | used (Fish S2 Pro) |
| `.cache/p41-voices/venv-audio8` | 1.2 GB listed (cloned) | R5 | used (Audio8) |
| `~/.cache/huggingface/hub/models--mlx-community--fish-audio-s2-pro-8bit` | 6.3 GB | R5 | keep if Fish is picked |
| `~/.cache/huggingface/hub/models--mlx-community--VoxCPM2-bf16` | 4.6 GB | R5 | not a first pick; the first to free |
| `~/.cache/huggingface/hub/models--mlx-community--Ming-3.0-tts-0.5B-bf16` | 2.8 GB | R5 | keep if Ming is picked |
| `~/.cache/huggingface/hub/models--mlx-community--Audio8-TTS-Realistic-0.6b-bf16` | 2.4 GB | R5 | not a first pick; free |
| `.cache/p41-voices/models/_raw/` (R5's run WAVs and JSONs, transcripts, `r5-probe/`, `r5-anchor/`, `r5-superseded/`, the backups) | 126 MB | R5 | raw timings and checks |
| `.cache/p41-voices/models/*.mp3` (8 new samples) | 4.5 MB | R5 | the samples page |
| `.cache/p41-voices/models/_bench/r5_*`, `b_r5_mlx.py` | 36 KB | R5 | scripts |

- **The Hugging Face bytes** live in the shared `~/.cache/huggingface/hub/blobs/`, now 26 GB with R2's and
  R4's. Removing a repo frees its blobs.
- **R2's and R4's items** are in R4's cleanup list, unchanged. R5 wrote no new files into their venvs.

## Validation

- **`manifest.json`:** parses; 19 entries, every one with the 13 pinned keys in order; `kind: model`,
  `official: null` and `billing: none` on all. Durations by `ffprobe` match `seconds` for all 19:
  - the earlier 11 are unchanged (51.13 … 53.95 s);
  - R5's: VoxCPM2 KO 48.82, EN 39.06; Ming KO 49.40, EN 46.00; Fish KO 50.76, EN 56.98; Audio8 KO 52.11,
    EN 50.94.
- **Ignored:** every `.cache/p41-voices/**` path checked is ignored (`.gitignore:3:.cache/`).
- **No excerpt text:** 0 excerpt n-grams (95 English 4-grams, 69 Korean 2-grams, 15 Hangul words of 4+
  syllables) in the topic and in this file.
- **`git status`:** nothing of mine outside the topic and this slice folder.
- **`python3 scripts/workflow.py validate`:** "Workflow validation passed". Its warnings all predate this slice:
  P26's slice kinds, P41-sr's notebook budget (its Decisions and Notes entries), the consolidation debt, the
  stale docs, and the oversized doc sections.
