# Free voice APIs for Listen (P41-sr.R1)

Findings of `P41-sr.R1`, surveyed on the web on **2026-11-11**. Every claim links its source in **Sources**, and all were read on that date. The samples are local, gitignored audio in `.cache/p41-voices/apis/`, listed in its `manifest.json`. They render the two shared excerpts in `.cache/p41-voices/excerpts/`, and **the excerpt text is never quoted here.**

**Status: final.** The three keyless candidates are surveyed and two of them are sampled (Pollinations was surveyed but not sampled). The keyed shortlist (Gemini, Deepgram, Fish Audio) is **surveyed, not sampled: no key given (operator, 2026-11-11)**. The operator answered "continue" without adding a key, so no official API was heard. Their sign-up steps are kept in **Sampling a keyed API later**, so a key added later can still be sampled.

## Speech rate used for the book math

These rates come from ffprobe on the edge-tts samples:

- **English:** 631 characters in 47.1 s, so **13.4 characters per second**.
- **Korean:** 398 characters in 53.3 s, so **7.5 characters per second**. Korean averages 1.95 UTF-8 bytes per character.

| Book | English audio | Korean audio |
|---|---|---|
| 130k characters | 2.7 h (162 min) | 4.8 h (290 min) |
| 300k characters | 6.2 h (373 min) | 11.2 h (670 min) |

## Summary table

"Book days" is the number of days of free quota a whole book needs, for 130k / 300k characters, in English and in Korean. **No card** means the sign-up asks for no card and no billing account.

| API | Official | Billing to use the free tier | Free quota | Korean | Data use on the free tier | Book days, 130k / 300k | Sample files |
|---|---|---|---|---|---|---|---|
| **edge-tts** (Edge Read Aloud) | no | none: no account, no key | none published; bursts get a 403 IP block | yes (3 voices) | no published terms; text goes to Microsoft | 0 / 0: one sitting (32–143 requests) | `edge-tts-{en-andrew,en-ava,ko-sunhi,ko-hyunsu}.mp3` |
| **Google Translate TTS** (gTTS) | no | none | none published; HTTP 429 when throttled | yes (1 fixed voice) | Google's general policy only | 0 / 0, but 1.3k–3k+ requests of 100 characters | `google-translate-{en,ko}.mp3` |
| **Gemini 3.8 Flash / Flash-Lite TTS** | yes | AI Studio key, **no card** (a project with no billing) | per project, shown only in AI Studio; reports range from 10 to 100 requests a day | yes (30 voices, auto-detected) | **trained on, and read by human reviewers** | EN 1–4 / 1–8; KO 1–6 / 2–14 | surveyed, not sampled: no key given (operator, 2026-11-11) |
| **Deepgram Flux TTS** | yes | account, **no card**; a one-time $200 credit | credit only: about 4.4M characters at $0.045 per 1k | yes (6 voices, Early Access) | opt-out per request (`mip_opt_out=true`), at no price change | 0 / 0 until the credit ends: about 34 books of 130k, or 14 of 300k | surveyed, not sampled: no key given (operator, 2026-11-11) |
| **Fish Audio S2.1 Pro Free** | yes | account, **no card** | "no hard character cap", under a fair-use policy; **free window to about 2026-11-30** | yes (83 languages) | "may be used to improve model quality" | 0 / 0 while it lasts | surveyed, not sampled: no key given (operator, 2026-11-11); a later sample is moot |
| Cloudflare Workers AI: MeloTTS | yes | account, no card | 10k neurons a day; MeloTTS costs 18.63 neurons per audio minute | upstream only, not in Cloudflare's docs | no training; zero retention | EN 1 / 1, KO 1 / 2, **but deprecated on 2026-11-20** | not sampled |
| Cloudflare Workers AI: Deepgram Aura-2-en / Aura-1 | yes | account, no card | 10k neurons a day (about 3.7k / 7.3k characters a day) | no | no training (Cloudflare) | Aura-2: 36 / 82; Aura-1: 18 / 41 (English only) | not sampled |
| ElevenLabs Free | yes | account, no card | 10k credits a month | yes | trains unless you opt out | 13 / 30 **months** (v4) | not sampled |
| Cartesia Free | yes | account | 20k credits a month | yes | not checked | 6.5 / 15 months | not sampled |
| Typecast API Free | yes | "No payment info required" | 15k credits a month | yes (Korean company) | not checked | 8.7 / 20 months | not sampled |
| Groq (Orpheus) | yes | account, no card | 100 requests and 3.6K tokens a day | **no** (English and Saudi Arabic only) | no retention by default | 37 / 84 | not sampled |
| Azure Speech F0 | yes | **card required** (identity check) | 0.5M characters a month; 20 requests per 60 s | yes | not logged for prebuilt voices | 1 / 1 | excluded (card) |
| Google Cloud TTS | yes | **billing must be enabled** | per voice type (1M Chirp 3 HD per third parties) | yes | not checked | — | excluded (billing) |
| Pollinations | no (a reseller) | none; the keyless GET worked | not published | via upstream models | **stores the generated audio at a public file URL**; no privacy policy found | — | not sampled (see its section) |

Excluded after a probe or a check:

- **StreamElements** (Amazon Polly voices) now answers 401 "No API key was found".
- **Hugging Face Inference Providers** gives free accounts no credits.
- **Vercel AI Gateway**'s free credits cover no speech model.
- **OpenRouter** lists `fish-audio/s2.1-pro-free:free` with "no public standard endpoint".
- **Puter.js** is a browser-side, user-pays SDK, not a server API.
- **Mistral Voxtral TTS** may not be on the free plan; that is unconfirmed, and free-plan inputs may train models.

## Candidates

### edge-tts: keyless front-runner

- **What it is.** It is unofficial: a Python client (GPL-3.0, v7.3.1, released 2026-10-13) for the Read Aloud service built into Microsoft Edge (`speech.platform.bing.com/consumer/...readaloud`). It authenticates with the client token embedded in Edge, so no account and no key are needed.
- **Voices.** It has Azure neural voices:
  - English, the best two: `en-US-AndrewMultilingualNeural` (male) and `en-US-AvaMultilingualNeural` (female);
  - Korean, all three: `ko-KR-SunHiNeural` (female), `ko-KR-InJoonNeural` (male) and `ko-KR-HyunsuMultilingualNeural` (male).
- **Limits and formats.**
  - The client splits text into requests of 4,096 bytes each.
  - Output is MP3 (24 kHz, 48 kbps, mono), plus subtitles.
  - Only SSML that Edge itself would generate is accepted: one voice and one prosody.
- **Quota.** None is published. Community reports say bursts from one IP get a 403 at the WebSocket handshake, and the fix is concurrency 1 with pauses.
- **Terms.** Microsoft publishes no terms, no quota and no retention statement for third-party use. A CIS benchmark warns that Edge's online TTS sends page text to a third party. Personal use is unaddressed; the use is unsanctioned rather than licensed.
- **Measured** (one run each):
  - English: 19.6–30.8 s to make 47 s of audio (0.4–0.65× real time);
  - Korean: 5.7–16.4 s to make 53 s (0.1–0.3× real time).
- **Book math.** A 130k English book is 32 requests and roughly 1.1–1.8 h of sequential generation. A 300k Korean book is 143 requests and roughly 1.2–3.4 h.

### Google Translate TTS (gTTS): keyless baseline

- **What it is.** It is unofficial. gTTS 2.5.4 calls Google Translate's undocumented speech endpoint; its own README says it is "not affiliated with Google".
- **Voices and format.** It has one fixed voice per language and no choice. Requests are at most 100 characters, which gTTS joins. Output is MP3 (24 kHz, 64 kbps).
- **Measured.** English took 6.1 s for 55.9 s of audio. Korean took 7.3 s for 67.3 s.
- **Fit.** It is a floor to compare against, not a contender: a book is thousands of requests to an endpoint that throttles with HTTP 429.

### Gemini API TTS: official front-runner on paper (surveyed, not sampled)

- **Status.** Surveyed, not sampled: no key given (operator, 2026-11-11). Nothing below was heard; to sample it later, see **Sampling a keyed API later**.
- **Models.** `gemini-3.8-flash-tts` and `gemini-3.8-flash-lite-tts` became generally available on 2026-09-22. Both are "Free of charge" on the Free tier. Also free are `gemini-3.1-flash-tts-preview` and `gemini-2.5-flash-preview-tts`; `gemini-2.5-pro-preview-tts` is not available on the free tier.
- **Paid prices**, for reference: Flash $0.50 per 1M input tokens and $9 per 1M output tokens through 2026-12-31, then $18 from 2027-01-01. Flash-Lite output is $6, then $12.
- **Languages and voices.** Flash covers 130+ languages and Flash-Lite 100+; Korean is listed and the language is auto-detected. There are 30 prebuilt voices, for example Kore, Charon, Puck and Aoede.
- **Per request and formats.**
  - Input: 8,192 tokens per request.
  - Output: 16,384 tokens per request, at 25 audio tokens per second, so about 655 s of audio.
  - Formats: WAV, 24 kHz PCM, mu-law or A-law. MP3 needs a local ffmpeg step.
- **Quota.** Google no longer publishes free-tier numbers ("can be viewed in Google AI Studio", per project).
  - Developer reports range from 10 to 100 requests a day. One report from 2026-10-07 found the API enforcing 100 a day while the AI Studio page showed 10,000; Google staff replied "should have been resolved".
  - A third-party table gives 3 RPM and 10K TPM.
  - Past the quota the API returns a 429, a hard stop: an account with no billing cannot be charged.
- **Book math**, at 300 s of audio per request:
  - English: 33 / 75 requests;
  - Korean: 59 / 134 requests;
  - that is 1–2 days at 100 requests a day, and 4–14 days at 10.
- **Data use.** On the free tier ("Unpaid Services"), Google uses the text and the audio to "improve, and develop Google products", human reviewers may read them, and the terms say "Do not submit sensitive, confidential, or personal information". The terms took effect on 2026-03-23.
- **ToS limits.**
  - The service is "for developers building with Google AI models for professional or business purposes, not for consumer use".
  - Users must be 18 or older.
  - In the EEA, UK and Switzerland, only Paid Services may be offered to users.
  - A personal reader built by its own developer is a grey area against that "not for consumer use" line.

### Deepgram Flux TTS: official, no-training path (surveyed, not sampled)

- **Status.** Surveyed, not sampled: no key given (operator, 2026-11-11). Its Korean quality is unheard; to sample it later, see **Sampling a keyed API later**.
- **Credit.** New accounts get a **$200 credit with no card and no expiry**; third parties disagree on expiry, so trust Deepgram's own page.
- **Prices.** Flux TTS costs $0.045 per 1k characters, Aura-2 $0.030 and Aura-1 $0.015. A 130k-character book is $5.85 of credit, so about 34 books; a 300k book is $13.50, about 14.
- **Past the credit.** With no card on file, requests fail with 402 "Insufficient credits", a hard stop.
- **Languages.** Flux covers 42 languages, including Korean (`flux-{eunji,hyunwoo,mikyung,minjun,soojin,sungmin}-ko`). Korean is **Early Access**, and its text "isn't normalized yet": numbers and dates must be written out in words, and the excerpts contain numbers. Aura-2 has no Korean. The featured English voices are Hannah, Kit, Alexis, Cliff, Sienna, Cole and others.
- **Per request.** The documents read do not state the per-request character limit or the encodings for `/v2/speak`.
- **Data use.** Model-improvement participation is "voluntary". Adding `mip_opt_out=true` to a request keeps its data "only for the duration necessary to process the request". Deepgram's 2026-03-05 changelog says opting out has no effect on the price.

### Fish Audio S2.1 Pro Free: time-limited (surveyed, not sampled)

- **Status.** Surveyed, not sampled: no key given (operator, 2026-11-11). Its free API ends around 2026-11-30, so **a later sample of it is moot**: by the time Listen is built, the free model this survey describes is likely gone, and what remains is the paid S2.1 Pro.
- **Model and access.** The model header is `s2.1-pro-free`, priced at $0.00. It needs a key from a sign-up, with "No credit card required, and no waitlist".
- **Quota.** "High-volume access with no hard character cap (subject to Fair Use Policy)". There is no SLA, and Fish may throttle abuse.
- **Free window.** The blog's end dates moved from 2026-07-24 to the end of July, then 2026-08-31, then a bold "through November 30, 2026". The pricing page lists no end date, and Fish promises advance notice of any change. After the window, S2.1 Pro costs $15 per 1M UTF-8 bytes: a 130k book would be about $1.95 in English and $3.80 in Korean. That is paid, and needs prepaid credit.
- **Languages and output.** It covers 83 languages, Korean named. The voice comes from `reference_id` (a voice page id); without one, a default voice is used. The output format is MP3 in the examples.
- **Data use.** Requests "may be used to improve model quality". The privacy policy, effective 2024-08-28, keeps content "as long as we need it" and offers no opt-out.
- **ToS limits.** The free plan's FAQ allows personal, non-commercial use. Products with more than $1M ARR must contact Fish.

### Cloudflare Workers AI: not shortlisted

- **Free plan.** 10,000 neurons a day, reset at 00:00 UTC. Past that, requests "fail with an error", a hard stop with no charge.
- **MeloTTS** (`@cf/myshell-ai/melotts`):
  - cost: 18.63 neurons per audio minute, so about 536 audio minutes a day; every book fits in 1–2 days;
  - Korean: the `lang` parameter's allowed values are not listed, so Korean support on Cloudflare is unconfirmed;
  - its model page shows **"Planned Deprecation 11/20/2026"**, nine days from now. That alone rules it out.
- **Aura-2-en and Aura-1.** They are English only: Aura-2 costs 2,727 neurons per 1k characters (about 3.7k characters a day), Aura-1 1,364 (about 7.3k a day).
- **Data use.** Cloudflare's data-usage page (updated 2026-10-16) says "Cloudflare does not use Customer Content … to train AI models" and keeps zero data. Partner models may carry their own terms.

### ElevenLabs, Cartesia, Typecast: quality references, not book-viable

- **The common problem.** All three are free with no card and speak Korean, but their monthly allowance is a chapter, not a book. A 130k book takes 6.5–13 months of free quota; a 300k book 15–30 months.
- **ElevenLabs Free.**
  - Allowance: 10k credits a month, no rollover, about 2 concurrent requests.
  - Limits: no commercial licence; attribution is required on published audio.
  - Data use: it trains on free-tier data unless you switch off "Improve the models for everyone".
  - Models: `eleven_v4` handles 10,000 characters per request in 90+ languages, Korean included.
- **Cartesia Free.** 20k credits a month, at 1 credit per character; 2 concurrent requests; Sonic speaks Korean. A commercial licence is Pro only.
- **Typecast API Free.** 15k credits a month, at 1 credit per character; "No payment info required". Free audio "cannot be used commercially and must include attribution".

### Groq: not shortlisted

- **Model.** Orpheus (`canopylabs/orpheus-v1-english`); the only other model is Saudi Arabic, so there is **no Korean**.
- **Quota.** The table shows 10 RPM, 100 requests a day and 3.6K tokens a day. The page calls these Developer-plan base limits, and the free plan may be lower.
- **Fit.** A 130k English book is about 37 days.
- **Data use.** No retention by default (logs for up to 30 days for abuse), and Zero Data Retention can be switched on.

### Azure Speech F0 and Google Cloud TTS: excluded (card or billing)

- **Azure F0.** The free tier gives 0.5M neural characters a month and 20 requests per 60 s, and "Customers cannot accrue overages on the free tier". But an Azure account needs a non-prepaid card for identity verification. Edge's Read Aloud (edge-tts) serves the same family of neural voices.
- **Google Cloud TTS.** "You must enable billing to use Text-to-Speech, and will be automatically charged" past the free characters. That is the billing-enabled account the operator ruled out.

### Pollinations: not sampled

- **What it is.** An unofficial reseller of many TTS models.
- **Probe.** A keyless `GET gen.pollinations.ai/audio/{text}` on a harmless phrase returned MP3 that its C2PA manifest marks as "Azure OpenAI TTS". Its own documents say generation needs a key.
- **Why it was not sampled.** Its documents say generated audio "is stored as a media file" behind a "public file URL", and no privacy policy for prompts was found. The private excerpts were therefore **not sent to it**.

### Hugging Face Spaces: survey only

- **Quota.** Community ZeroGPU Spaces can be called keyless, with 2 GPU minutes a day unauthenticated and 5 with a free account. Inference Providers give free accounts no credit.
- **Why it was not sampled.** The voices there are the open models R2 samples locally, so a Space sample adds nothing to the choice by ear. It matters only as a runner, which is R2's and DECOMP2's question.

## Shortlist and recommendation

**What was heard.** Only the two keyless, unofficial endpoints: edge-tts (two voices per language) and Google Translate TTS (one fixed voice per language). **No official API was heard**: the keyed shortlist got no key (operator, 2026-11-11).

**The keyed shortlist** (all **no card**), surveyed, not sampled:

1. **Gemini 3.8 Flash TTS:** the best official free candidate on paper, in both languages.
2. **Deepgram Flux TTS:** the only official option whose free use can opt out of training, on a finite $200 credit.
3. **Fish Audio S2.1 Pro Free:** moot, since its free API ends around 2026-11-30.

**Recommendation, resting on what was heard:**

- **English: edge-tts** (Andrew or Ava; the operator's ear picks between them). Of the candidates heard, it is the only one with a choice of neural voices, and it is free with no account and no quota a book can reach. It took about 0.4–0.65× real time to generate. Its weakness is that it is unofficial, with no published terms.
- **Korean: edge-tts** (SunHi or Hyunsu), for the same reasons. It is the only Korean candidate heard that offers a choice of voice.
- **Google Translate TTS is the floor, not a fallback.** It has one fixed voice per language and 100-character requests, so a book is thousands of requests to an endpoint that throttles with HTTP 429.
- **The official fallback, on paper only: Gemini 3.8 Flash TTS.** It is unheard. Its free tier lets Google train on the text and lets human reviewers read it ("Do not submit sensitive, confidential, or personal information"), and its unpublished daily cap may stretch a book over several days. Whether that term is acceptable is OQ1 in `phase.md`.
- **The no-training fallback, on paper only: Deepgram Flux.** It is unheard. It covers about 34 books of 130k, then stops hard. Its Korean is Early Access and needs numbers written out in words.
- **The other no-training path** is the local models that R2 and R4 sample (`topics/voice-models.md`).

**What would change it.** If OQ1 rules out an unofficial endpoint, edge-tts is out. The choice then falls to Gemini (if its training term is accepted), Deepgram or a local model, and whichever API it is should be heard before the build commits to it: see **Sampling a keyed API later**.

## Sampling a keyed API later

A key added later can still be sampled, under the same rules as R1's samples. Put it in a `.env` at the repo root (gitignored), one `NAME=` line per key with the value after the `=`.

- **The rules.**
  - Never use a key from a project or account with billing enabled.
  - Never use the production `GOOGLE_API_KEY`.
  - Never print or log a key value.
- **Gemini (Google AI Studio, free tier).**
  - **Sign up:** https://aistudio.google.com/apikey. No card.
  - **Steps:** Sign in and choose **Create API key**, then **create it in a new project**: never an existing project, and never the one behind production. On the API keys page, check that the project shows the **Free** tier, with no billing account linked. AI Studio's rate-limit page shows the requests per day for `gemini-3.8-flash-tts`.
  - **`.env` line:** `GEMINI_FREE_API_KEY=`
- **Deepgram (Flux TTS).**
  - **Sign up:** https://console.deepgram.com/signup. No card: new accounts get a $200 credit.
  - **Steps:** Under API Keys, create a key (Member role). **Add no payment method**: without one, the credit ends in a hard stop instead of a charge.
  - **`.env` line:** `DEEPGRAM_API_KEY=`
- **Fish Audio (S2.1 Pro Free).** Moot after about 2026-11-30. Before then: sign up at https://fish.audio/app/developers/get-started/ (no card), create a key at https://fish.audio/app/api-keys, buy no credit, and add `FISH_AUDIO_API_KEY=`.
- **How to sample.**
  - Render both excerpts in `.cache/p41-voices/excerpts/`: one voice per language, two for Gemini.
  - Install any client into the scratch uv venv at `.cache/p41-voices/apis/venv/`, never into the project's `.venv`.
  - Write MP3 to `.cache/p41-voices/apis/<id>-<lang>[-<voice>].mp3`.
  - Add one entry per file to `manifest.json`, in its existing shape.

## Risks

- **An unofficial endpoint (edge-tts, gTTS).** It can break or block without notice (a 403 IP block, a token change) and is unsanctioned under no published terms. The build should keep the voice behind one adapter, with a fallback.
- **A terms change.** Fish Audio's free window ends on about 2026-11-30, and Cloudflare's MeloTTS on 2026-11-20. Gemini's free-tier quota is unpublished, and reports say it varies and has been cut before. Deepgram's credit is one-time.
- **Training on private text.**
  - Gemini's free tier: training plus human review.
  - Fish: may improve models.
  - ElevenLabs: on by default, opt-out available.
  - Mistral free: may train.
  - Pollinations: public URLs.
  - Deepgram (opt-out), Cloudflare and Groq do not train. Edge Read Aloud and Translate state nothing for this use.
- **Quota math shapes "preparing".** A book is 2.7–11.2 h of audio. edge-tts makes it in one sitting (about 1–3.5 h of generation). Gemini on a daily cap may need several days. Audio should be generated ahead, per chapter, and playable as each chapter lands.

## Sources (all read 2026-11-11)

- Gemini pricing: https://aistudio.google.com/docs/pricing
- Gemini rate limits: https://aistudio.google.com/docs/rate-limits
- Gemini speech generation: https://aistudio.google.com/docs/speech-generation
- Gemini API terms: https://aistudio.google.com/docs/terms
- Gemini 3.8 TTS, 100 RPD report (2026-10-07): https://discuss.ai.google.dev/t/gemini-3-8-flash-tts-api-enforces-100-rpd-despite-ai-studio-showing-10k-rpd/187223
- Gemini 3.8 TTS limits, third party (2026-09-30): https://blog.laozhang.ai/en/posts/gemini-3-8-flash-tts-api
- Gemini free-tier tables, third party: https://www.scriptbyai.com/gemini-api-rate-limits/
- edge-tts: https://github.com/rany2/edge-tts and https://pypi.org/project/edge-tts/
- edge-tts 403 reports: https://github.com/rany2/edge-tts/issues/458 and https://doc.pyvideotrans.com/en/edgetts-error
- Edge cloud voices: https://blogs.windows.com/msedgedev/2019/08/14/cloud-powered-voices-microsoft-edge-chromium/
- CIS benchmark, online TTS: https://www.tenable.com/audits/items/CIS_Microsoft_Edge_v3.0.0_L2.audit:0f583f89efc05efa1feb2dc6a63e58b8
- gTTS: https://gtts.readthedocs.io/en/latest/ (disclaimer from the installed package's README)
- Deepgram pricing: https://deepgram.com/pricing
- Deepgram TTS languages: https://developers.deepgram.com/docs/tts-models-languages-overview
- Deepgram Flux voices: https://developers.deepgram.com/docs/flux-tts/voices
- Deepgram model improvement program: https://developers.deepgram.com/docs/the-deepgram-model-improvement-partnership-program
- Deepgram changelog (2026-03-05): https://developers.deepgram.com/changelog/2026/3/5
- Deepgram errors (402): https://developers.deepgram.com/reference/errors
- Fish Audio free API post: https://fish.audio/blog/s2-1-pro-free-api/?articleLocale=en
- Fish Audio pricing and rate limits: https://docs.fish.audio/developer-guide/models-pricing/pricing-and-rate-limits
- Fish Audio plans: https://fish.audio/plan/
- Fish Audio privacy policy: https://fish.audio/privacy/
- Fish Audio quickstart: https://docs.fish.audio/developer-guide/getting-started/quickstart
- Cloudflare Workers AI pricing: https://developers.cloudflare.com/workers-ai/platform/pricing/
- Cloudflare MeloTTS: https://developers.cloudflare.com/workers-ai/models/melotts/
- Cloudflare Aura-2-en: https://developers.cloudflare.com/workers-ai/models/aura-2-en/
- Cloudflare data usage: https://developers.cloudflare.com/workers-ai/platform/data-usage/
- Cloudflare changelog: https://developers.cloudflare.com/workers-ai/changelog/
- ElevenLabs pricing: https://elevenlabs.io/pricing
- ElevenLabs models: https://elevenlabs.io/docs/overview/models
- ElevenLabs data use: https://elevenlabs.io/docs/help-center/legal/is-my-data-used-to-improve-eleven-labs-ai-models
- ElevenLabs billing (free plan attribution): https://elevenlabs.io/docs/overview/administration/billing.mdx
- Cartesia pricing: https://cartesia.ai/pricing
- Typecast API pricing: https://typecast.ai/pricing/api/
- Groq TTS: https://console.groq.com/docs/text-to-speech
- Groq rate limits: https://console.groq.com/docs/rate-limits
- Groq data: https://console.groq.com/docs/your-data
- Groq free tier, third party: https://freellm.net/free-groq-api-key
- Azure Speech pricing: https://azure.microsoft.com/en-us/pricing/details/speech/
- Azure Speech quotas: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-services-quotas-and-limits
- Azure TTS data privacy: https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/speech-service/text-to-speech/data-privacy-security
- Azure F0 overage: https://learn.microsoft.com/en-us/answers/questions/5566384/azure-ai-speech-what-happens-after-free-tier-t0-ex
- Azure card requirement: https://learn.microsoft.com/en-us/answers/questions/5773916/how-to-sing-in-azure-portal-without-credit-card
- Google Cloud TTS pricing: https://cloud.google.com/text-to-speech/pricing (the page truncated on fetch; billing line from the search snippet)
- Google Cloud TTS free plan, third party: https://costbench.com/software/ai-voice-tools/google-cloud-text-to-speech/free-plan/
- Pollinations API: https://gen.pollinations.ai/docs/llm.txt
- Hugging Face Inference Providers pricing: https://huggingface.co/docs/inference-providers/pricing
- Hugging Face ZeroGPU: https://huggingface.co/docs/hub/spaces-zerogpu
- Vercel AI Gateway pricing: https://vercel.com/docs/ai-gateway/pricing
- Vercel AI Gateway free models: https://vercel.com/ai-gateway/models?freeTier=true
- OpenRouter Fish model: https://openrouter.ai/fish-audio/s2.1-pro-free:free
- Puter.js TTS: https://developer.puter.com/tutorials/free-unlimited-openai-text-to-speech-api/
- Mistral Voxtral TTS: https://mistral.ai/news/voxtral-tts/
- Mistral free tier, third party (2026-11-04): https://www.activepieces.com/blog/mistral-api-free-tier-limits-models-credits-2026.md
