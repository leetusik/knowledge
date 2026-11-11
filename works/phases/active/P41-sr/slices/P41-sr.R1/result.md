# P41-sr.R1 result: free voice APIs (terms, Korean, samples)

## Verdict

- **status:** done
- **route:** research
- **model:** opus
- **effort:** xhigh
- **summary:** I surveyed 19 free TTS APIs as of 2026-11-11 (billing, quota, Korean, data-use terms, book math) and sampled the two keyless ones that work: edge-tts (two voices per language) and Google Translate TTS. The operator added no key, so Gemini, Deepgram and Fish Audio are surveyed, not sampled. The recommendation rests on what was heard: edge-tts for English and Korean, with Gemini the official fallback on paper only, given its training-on-text term (`topics/voice-apis.md`).
- **files_changed:**
  - `.cache/p41-voices/apis/` (gitignored, unchanged on resume): `edge-tts-en-andrew.mp3`, `edge-tts-en-ava.mp3`, `edge-tts-ko-sunhi.mp3`, `edge-tts-ko-hyunsu.mp3`, `google-translate-en.mp3`, `google-translate-ko.mp3`, `manifest.json`, and the scratch `venv/` (edge-tts 7.3.1, gTTS 2.5.4)
  - `works/phases/active/P41-sr/topics/voice-apis.md` (new; finalized on resume)
  - `works/phases/active/P41-sr/slices/P41-sr.R1/result.md` (new; rewritten on resume)
- **validation** (re-run on resume, 2026-11-11):
  - `manifest.json` parses: 6 entries, all in the pinned 13-key shape. Every `file` exists and has an ffprobe duration (46.70–67.34 s, matching `seconds`): PASS.
  - `git check-ignore -v` on the manifest, two samples and `venv`: all matched by `.gitignore:3:.cache/`: PASS.
  - `git status --porcelain --untracked-files=all`: of mine, only `topics/voice-apis.md` and `slices/P41-sr.R1/result.md`. The rest is the orchestrator's state files and R4's slice folder: PASS.
  - An n-gram check of the excerpts against the topic, this file and the manifest (3- and 4-grams, Hangul words of 3+ characters) finds 0 overlaps: PASS.
- **deviations:**
  1. **Pollinations was not sampled.** A keyless probe with a harmless phrase worked and returned Azure OpenAI TTS audio. But its documents say the generated audio is stored behind a public file URL, and it publishes no privacy policy, so the private excerpts were not sent.
  2. **No Hugging Face Space was sampled.** Its voices are the open models R2 samples locally, so a sample would add nothing to the choice by ear.
  3. **StreamElements was dropped.** A first probe returned audio, but every request since answers 401 "No API key was found".
  4. **Cloudflare, ElevenLabs, Cartesia, Typecast and Groq were left off the keyed shortlist**, although none needs a card.
     - Cloudflare's only Korean-capable model, MeloTTS, is deprecated on 2026-11-20, and its Aura models are English-only on a tiny quota.
     - The other four take 6.5–30 months of free quota per book, or have no Korean.
  5. **The keyed shortlist was skipped (operator, 2026-11-11).** The operator answered "continue" and added no key, so Gemini, Deepgram and Fish Audio are surveyed, not sampled. Their sign-up steps were moved into the topic's **Sampling a keyed API later**, so a later key can still be sampled. Fish Audio's free API ends around 2026-11-30, so a later sample of it is moot. No official API was heard.
- **doc_impact:** none (findings only).
- **notebook** (wave: for the orchestrator to write; OQ1 is already appended, so no Operator Questions):
  - **Notes for later slices:**
    - `- **(from P41-sr.R1, for P41-sr.D1, P41-sr.DECOMP2)** The free-API pick, by ear: edge-tts (keyless, unofficial; EN Andrew or Ava, KO SunHi or Hyunsu; no quota a book reaches). Only edge-tts and Google Translate TTS were heard. Gemini (official; its free tier trains on the text) and Deepgram (training opt-out; a one-time $200 credit) were surveyed, not sampled: no key. Fish Audio's free API and Cloudflare MeloTTS end this month. → `topics/voice-apis.md` § Shortlist and recommendation`
    - `- **(from P41-sr.R1, for P41-sr.D1, P41-sr.DECOMP2)** "Preparing" is long: a book is 2.7–11.2 h of audio, and edge-tts makes it in about 1–3.5 h, one request at a time (bursts get a 403 IP block). Generate ahead per chapter, play each chapter as it lands, and keep the voice behind one adapter with a fallback. → `topics/voice-apis.md` § Risks`
  - **Operator Questions:** none new (OQ1 already appended by the orchestrator).
  - **Now:** `R1 is done: 19 free TTS APIs surveyed and six keyless samples (edge-tts, Google Translate TTS) in .cache/p41-voices/apis/; edge-tts leads by ear in both languages; Gemini, Deepgram and Fish Audio surveyed, not sampled (no key, operator 2026-11-11) → topics/voice-apis.md.`

## Resume (2026-11-11)

- **What happened.** The slice first stopped with `needs_operator` for three no-card keys: `GEMINI_FREE_API_KEY`, `DEEPGRAM_API_KEY` and `FISH_AUDIO_API_KEY`. The operator answered "continue" and added no key. On resume, no `.env` exists at the repo root, which was checked by file presence only; no value was read.
- **What changed on resume.**
  - No new samples. The six keyless samples and `manifest.json` stand unchanged.
  - `topics/voice-apis.md`:
    - The status is now final.
    - The three keyed rows and sections say *surveyed, not sampled: no key given (operator, 2026-11-11)*, and Fish Audio's adds that a later sample is moot.
    - The recommendation now rests on what was heard.
    - A new **Sampling a keyed API later** section carries the sign-up steps that used to sit in this file's "Operator steps".
- **What the recommendation now says.**
  - **edge-tts for English and Korean.** It is the only candidate heard with a choice of neural voices and no quota a book reaches.
  - **Google Translate TTS is the floor.** It is not a fallback.
  - **Gemini is the official fallback, on paper only.** Its free tier trains on the text and lets human reviewers read it.
  - **Deepgram is the no-training fallback, on paper only.** It is a finite credit with Early Access Korean.
  - **If OQ1 rules out an unofficial endpoint,** whichever official API replaces edge-tts should be heard before the build commits to it.

## What was done (first run)

- **Survey.** Each API's official pricing, rate-limit, model and terms pages were read with WebFetch, using third-party pages only where the official page was silent (labelled as third party in the topic).
- **Most consequential findings:**
  - Gemini now has GA `gemini-3.8-flash-tts` and `-lite-tts`, both free on the Free tier, with free-tier limits shown only in AI Studio.
  - Deepgram's Flux TTS speaks Korean and comes with a no-card $200 credit.
  - Cloudflare's MeloTTS page shows "Planned Deprecation 11/20/2026".
  - Fish Audio's free window has moved several times; the latest stated end is 2026-11-30.
- **Samples.**
  - A uv venv at `.cache/p41-voices/apis/venv/` holds edge-tts 7.3.1 and gTTS 2.5.4.
  - The scripts lived in the session scratchpad and printed only file names, latency and bytes, never the text.
  - Durations come from ffprobe:

    | File | Duration | Latency |
    |---|---|---|
    | edge-tts EN Andrew | 46.70 s | 30.83 s |
    | edge-tts EN Ava | 47.45 s | 19.60 s |
    | edge-tts KO SunHi | 53.26 s | 5.72 s |
    | edge-tts KO Hyunsu | 53.35 s | 16.43 s |
    | Google Translate EN | 55.90 s | 6.05 s |
    | Google Translate KO | 67.34 s | 7.26 s |

  - Each latency is one run from this machine on 2026-11-11.
- **Book math.**
  - Speech rates measured from the edge-tts samples: English 13.4 characters a second, Korean 7.5.
  - The per-API request counts and days are in the topic's summary table.
- **Probes.**
  - Pollinations and StreamElements were probed only with the phrase "Hello there.".
  - The probe files sit in the first run's session scratchpad, outside the repo; deleting that folder was refused by the permission system, so they were left.
- **Dead ends:**
  - the Google Cloud TTS pricing page truncated on every fetch, so the billing rule comes from its search snippet;
  - two Mistral help articles returned 404;
  - Vercel AI Gateway's free tier lists no speech model.

## Keys and data

- No key was read, used or printed in either run. No `.env` exists.
- The excerpts were sent only to Microsoft's Read Aloud service (edge-tts) and Google Translate (gTTS).
- No excerpt text appears in any committed file.
