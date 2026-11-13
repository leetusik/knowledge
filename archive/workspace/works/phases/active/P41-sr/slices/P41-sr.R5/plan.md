# P41-sr.R5 — more Korean voice models for the Mac, community-recommended (research)

## Goal

The operator signed the Listen design on 2026-11-11. They did not pick a voice yet. Their words:

> "for vocie, you may find out more candidates. recent updated model, korean support, available for the
> mac, highly recommended by community"

This slice finds and **runs** more free voice models that meet **all four** of those criteria:
1. **Recently updated:** a release or a substantial update in roughly the last 6–9 months (as of
   2026-11-11). Say what counts and why for each model.
2. **Korean:** officially supported, or a strong community Korean model. Korean quality is the main
   question: the current Korean field is thin.
3. **Runs on this Mac:** Apple M3 Pro, 36 GB. Use MLX (`mlx-audio` or a dedicated MLX port), PyTorch
   MPS, or CPU. Heavy is fine: the Mac is the named fallback runner (`intent.md` *Scope Added at
   Execution* A) and renders overnight.
4. **Recommended by the community.** Show evidence, each with a link and the date read:
   - Hugging Face likes, downloads or trending rank;
   - GitHub stars and recent commits;
   - a TTS leaderboard or arena rank;
   - discussion threads (r/LocalLLaMA, Hugging Face, Korean developer communities).

   Prefer models people actually use and praise for Korean, not just ones with Korean on a list.

It is findings only. It writes no product code, and makes no edits to `server/`, `web/`, `plugin/`,
`pyproject.toml` or `uv.lock`. Its method, measurements and output shape are R2's and R4's. Read
`works/phases/active/P41-sr/slices/P41-sr.R2/plan.md`, then `P41-sr.R4/plan.md` and its `result.md`
(the workarounds, the Whisper check, the cleanup list), and `topics/voice-models.md`.

## What is already heard (do not re-run)

These six are on the operator's samples page already: Supertonic 3, Kokoro 82M (English only), Qwen3-TTS
1.7B CustomVoice (Sohee, Aiden), Chatterbox Multilingual v3, MeloTTS and OmniVoice.

- Another **built-in Korean speaker** of an already-heard model is in scope, if the community rates it
  above the one sampled: for example another Qwen3-TTS speaker, or another Supertonic voice.
- The same goes for a **newer release** of a heard model.

## Candidates to start from

`topics/voice-models.md` § *Surveyed, not run* names several. Re-check each against the four criteria as
of today; do not assume R2's notes are current:
- VoxCPM2 (Korean official, Apache-2.0, mlx-audio; R2 called it "a strong heavy candidate for the Mac");
- NVIDIA Magpie TTS Multilingual 357M. R4's build of it was denied by the permission system: try only a
  path that needs no such build, or skip it;
- VibeVoice;
- Higgs Audio v2 or TTS 3 (watch the licence);
- Fish Audio S2;
- Kani-TTS-400M-ko;
- MOSS-TTS-Nano.

Then **search for what is new and trending** as of 2026-11, with Korean in mind:
- the Hugging Face text-to-speech trending list, filtered or read for Korean;
- the `mlx-audio` model table and its recent releases;
- the leaderboards;
- Korean community posts.

List everything you weigh in the topic, with why it was run or not.

## Steps

1. **Survey.** Write a shortlist of about 4–6 models, ranked by the four criteria, with the evidence.
2. **Run** the shortlist, best first, one at a time. For each model:
   - **Environment:** its own uv venv at `.cache/p41-voices/venv-<model>/`.
   - **Weights:** in the user-level Hugging Face cache or under `.cache/`.
   - **Samples:** render both excerpts (`.cache/p41-voices/excerpts/en.txt`, `ko.txt`) to
     `.cache/p41-voices/models/<id>-<lang>[-<voice>].mp3`. Korean is the priority; render English too when
     the model has it.
   - **Measure** what R4 measured:
     - load time;
     - real-time factor on the Mac GPU path (and CPU if cheap);
     - peak memory;
     - characters per second;
     - **Whisper intelligibility**: reuse `models/_bench/asr_check.py`, giving character error rate for
       Korean and word error rate for English;
     - the voice-consistency proxy (`spk_check.py`) where a model can drift.
   - **Book math:** for 130k and 300k characters, on this Mac.
3. **The manifest.** Append one entry per new model and language to `.cache/p41-voices/models/manifest.json`,
   in the pinned shape. `runner` is `mac`, or `box` if one turns out light enough. Leave the 11 existing
   entries untouched.
4. **The topic.** Update `works/phases/active/P41-sr/topics/voice-models.md` in place:
   - a new section, `## Round 3 (R5): community-recommended Korean models for the Mac`, with the survey,
     the evidence and the shortlist;
   - one short section per model run;
   - the summary table extended;
   - `## Recommendation` rewritten across **every** voice now heard, with **a clear first pick for Korean
     on the Mac and for English**. Say plainly whether a new model beats Qwen3-TTS Sohee for Korean, and on
     what evidence: the Whisper CER, the community and your own notes. The operator decides by ear.

## Limits

- **No cloning of any real person's voice.** Use built-in or preset speakers, or a voice designed from a
  **text** description only.
  - Never pass a reference clip, and that includes a model's bundled demo prompt of a real speaker.
  - A model that only works with a reference clip is surveyed, not run.
- **Licence:** personal, non-commercial use is fine. Record the licence and say when it is non-commercial.
- **Disk.** Check `df -h /` before each download. Keep **at least 25 GiB free**; about 57 GiB is free now.
  Keep the new downloads under about 25 GB in total. Stop adding models when either limit binds, and say so.
- **Memory.** Run one model at a time, and record peak memory.
- **Permissions.** If the permission system denies a step, record it and move to the next model. Never
  work around a denial.
- **Deleting.** Delete nothing that existed before this slice. Cleanup is the operator's call: add your
  new items to the cleanup list in `result.md`.
- **Excerpts.** Never print excerpt text, and never paste it into a committed file. The repo is public.

## Return (wave rules do not apply: this slice runs alone)

- Write `result.md` with the verdict block first.
- Give a **cleanup list**: every venv, weight folder and cache this slice added, with its size.
- Return the `notebook` field:
  - **Notes for later slices**, `**(from P41-sr.R5, for DECOMP2)**`: one gist on the new first picks,
    linking `topics/voice-models.md`;
  - **Operator Questions:** none expected;
  - **Now:** one line.

## Validation

- `manifest.json` parses. Every `file` exists and has an `ffprobe` duration, the earlier 11 included.
- The `.cache/` outputs are `git check-ignore`d.
- A grep for excerpt words finds none in the topic or `result.md`.
- `git status --porcelain --untracked-files=all` shows nothing of yours outside
  `works/phases/active/P41-sr/topics/voice-models.md` and this slice folder. `UPDATE_REQUIRED.md` at the
  root is the workspace updater's notice, not yours: leave it alone.

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
