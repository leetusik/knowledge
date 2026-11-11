# P41-sr.R1 — free voice APIs: terms, Korean, samples (research)

## Goal

This slice finds the free text-to-speech **APIs** the operator could use for Listen, and makes samples
the operator judges by ear. It is findings only: no product code, and no edits to `server/`, `web/`,
`plugin/`, `pyproject.toml` or `uv.lock`.

Read these first:
- `intent.md`: *Confirmed Intent*, *Scope Added at Execution* A, and *Notes* (the intake list).
- The breakdown's *Pins for the first wave* and `## P41-sr.R1`, via
  `python3 scripts/workflow.py phase-section P41-sr "Pins for the first wave (R1, R2)" --topic breakdown`
  and the same command for `"P41-sr.R1 — free voice APIs: terms, Korean, samples"`.

## Inputs

- **The excerpts, read-only and shared with R2.**
  - `.cache/p41-voices/excerpts/en.txt` and `ko.txt`.
  - Their source is `.cache/p41-voices/excerpts/sources.json`: documents 67 (en, v2) and 72 (ko, v1),
    the `decay` heading, the paragraph after it, and the `decay-chart` diagram's title read as its alt.
  - **Never paste their text** into any committed file: `topics/`, `result.md` or your verdict. The
    repo is public. Refer to them by path.
- **The machine.** An Apple M3 Pro with 36 GB. `ffmpeg`/`ffprobe` are at `/opt/homebrew/bin`, and `uv`
  is at `~/.local/bin/uv`.

## Steps

1. **Survey, on the web, as of 2026-11.**
   - **Start with:** the Gemini API TTS models on the free tier (AI Studio key), edge-tts, Fish Audio,
     Google Cloud TTS, Azure Speech F0 and Cloudflare Workers AI (MeloTTS, Deepgram Aura, or whatever it
     hosts now).
   - **Then add what is current:** for example Groq's TTS models, Hugging Face Inference or Spaces,
     ElevenLabs' free tier, and any new free API the trending lists show.
   - **For each, record:**
     - official or unofficial;
     - what sign-up needs: an account, **a card, or billing enabled**;
     - free quota and rate limits (per minute, per day, per month);
     - input limit per request;
     - output formats;
     - English and Korean voices (the best one or two of each);
     - **free-tier data-use terms** (training or retention of the text sent), with the link;
     - ToS limits on personal use.
   - Cite every claim with a link and the date you read it.
2. **Book math.** For 130k and 300k characters, give the requests needed and the days of free quota it
   takes under each API's limits. Note what happens past the quota: a hard stop, or a charge.
3. **Samples.**
   - **Who gets one.** Make a sample from every candidate usable **at zero cost**: one with no key, or
     one whose key is in the repo's gitignored `.env`.
     - **Never print or log a key value.** Never use the production `GOOGLE_API_KEY`.
     - **Never use a key from a project or account with billing enabled.** The operator puts only
       no-billing keys in `.env`; anything that needs a card or billing is surveyed from its documents
       and never called.
   - **What to make.** Render both excerpts in the best default voice per language. Use one voice per
     language, or two where the API is a front-runner (edge-tts, Gemini).
   - **Where it goes.** MP3 (or m4a) files at `.cache/p41-voices/apis/<id>-<lang>[-<voice>].<ext>`.
     Measure each file's length with `ffprobe` and the request's latency.
   - **The scratch venv.** Install any client (edge-tts, a vendor SDK) into a uv venv at
     `.cache/p41-voices/apis/venv/`, never into the project's `.venv`.
   - **The manifest.** Write `.cache/p41-voices/apis/manifest.json` in the pinned shape, one entry per
     candidate and language: `id`, `name`, `kind` (`api`), `runner` (`api`), `official`, `lang`,
     `voice`, `file`, `seconds`, `terms`, `billing`, `licence` (null), `notes`.
4. **Keys.** No `.env` exists today, so `needs_operator` is expected once.
   - Do every keyless candidate first.
   - Write the findings so far to `topics/voice-apis.md`.
   - Then return `needs_operator`. Its `operator_need` lists, for each shortlisted keyed API worth
     hearing:
     - the sign-up URL;
     - whether it asks for a card;
     - the exact `.env` line to add (`NAME=` with no value);
     - one line on why it is worth hearing.
   - **Shortlist only APIs that are genuinely free with no card on file.** If none qualifies, don't stop
     at all.
   - **When you are resumed with keys**, sample those APIs, finish the manifest and topic, and return
     `done`.
5. **Write `works/phases/active/P41-sr/topics/voice-apis.md`.**
   - a summary table: name, official, billing, quota, Korean, data use, the 130k/300k book days, and the
     sample files;
   - one short section per candidate;
   - a shortlist, with your recommendation of the best free API for English and for Korean and the
     reason;
   - risks: an unofficial endpoint, a terms change, training on private text;
   - sources.

## Return (wave rules: you write no `phase.md`)

- Write `result.md` with the verdict block first.
- The `notebook` field holds gist entries only:
  - **Notes for later slices**, `**(from P41-sr.R1, for D1, DECOMP2)**`: one or two gists that link
    `topics/voice-apis.md` (the front-runners, the quota math that shapes the "preparing" state);
  - **Operator Questions**, only if something beyond keys needs the operator;
  - **Now**: one line.
- No Decisions, and no Doc impact.

## Validation

- `manifest.json` parses, and every `file` exists and has an `ffprobe` duration.
- `git check-ignore` confirms the `.cache/` outputs are ignored.
- `git status --porcelain --untracked-files=all` shows nothing of yours outside your set.

## Resume after the operator's word (2026-11-11)

You returned `needs_operator` for three keys: `GEMINI_FREE_API_KEY`, `DEEPGRAM_API_KEY` and
`FISH_AUDIO_API_KEY`. The operator answered "continue" and **added no key**: `.env` holds none of the
three. Read that as **skip the keyed APIs for now**. Finish the slice without them:

- **Make no new samples.** Your six keyless samples and the manifest stand as they are.
- **`topics/voice-apis.md`:** mark Gemini, Deepgram and Fish Audio as *surveyed, not sampled: no key
  given (operator, 2026-11-11)*. Keep their sign-up steps, so a later key can still be sampled. Fish
  Audio's free API ends around 2026-11-30, so say that a later sample of it is moot.
- **Keep the recommendation honest.** It rests on what was heard: edge-tts and Google Translate TTS.
  Gemini stays the official fallback on paper, with its training-on-text term.
- **`result.md`:** rewrite the verdict block as `status: done`. Add a line to `deviations` for the
  skipped keys. Keep the notebook entries, updated if needed. The orchestrator has already appended
  your OQ1 (the unofficial endpoint and the training terms), so do not return it again.
- Run the validation below again.

## Wave

- **Set (this slice):** `.cache/p41-voices/apis/`, `works/phases/active/P41-sr/topics/voice-apis.md`,
  `works/phases/active/P41-sr/slices/P41-sr.R1/`.
- **Running beside it:** `P41-sr.R4`, which runs the three voice models R2 left for disk. Its set is
  `.cache/p41-voices/models/`, `.cache/p41-voices/venv*/` (the `venv-*` folders at that level, not your
  `apis/venv/`), `works/phases/active/P41-sr/topics/voice-models.md` and its slice folder. It holds the
  Mac's CPU and GPU for timings, so render nothing locally.
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
