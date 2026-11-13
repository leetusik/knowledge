# P41-sr — notes-for-later-slices

_Entries moved here from phase.md by `phase-section --to-topic`, byte for byte, one `## ` block each; the pointer line left in each one's place names its block._

## Notes for later slices 3

- **(from P41-sr.R3, for P41-sr.DECOMP2)** The Range fix, which replaces DECOMP's Range note:
  - **FastAPI:** serve with `FileResponse`. Starlette 1.3.1 serves 206, 416 and HEAD; verified locally.
  - **The BFF audio relay:** forward `Range` and stream `upstream.body`; `getRaw` passes `Range` and maps
    416.
  - **nginx:** a new regex location with `proxy_buffering off`.
  - **The Mac runner:** uploads in parts of ≤ 10 min, under nginx's 20m cap.
  - **Check:** a production curl confirms a 206 through Cloudflare.
  - See `topics/phone-playback.md` §5 and §7.

## Notes for later slices 7

- **(from P41-sr.S1, for D1, DECOMP2)**
  - **Segment shape:** `{section: nearest id'd top-level block or null, block: own id or null, kind:
    title|summary|heading|text|list-item|quote|callout|table-row|figure|diagram|svg|formula, lang,
    text}`, whitespace-collapsed and never empty.
  - **The mirror:** the module, its test and its fixture are mirrored in `plugin/templates/kb/` (manifest
    `files.identical`), so DECOMP2's backend slices mirror their new `server/` and `tests/` files too.
  - **Doc 67:** 187 segments, 52 of them `table-row`.
  - **Open for D1 or DECOMP2:** a `## Sources` heading is still read before its skipped list, and reading
    tables aloud is a decision D1 surfaces.
  - **Detail:** `slices/P41-sr.S1/result.md`.

## Notes for later slices 8

- **(from P41-sr.R3, for P41-sr.D1, P41-sr.DECOMP2)** Delivery:
  - **One continuous source per Listen.** Never swap `src` at `ended`: it fails on a locked iPhone.
  - **The format:** HLS over AAC-LC mono 48 kbps parts, 54–130 MB per book for each voice and language,
    generated on demand.
  - **Play while generating** (`EVENT`) only if the engine runs faster than real time.
  - **Fallback:** one `.m4a` per Listen.
  - See `topics/phone-playback.md` §0, §3 and §6.

## Notes for later slices 9

- **(from P41-sr.R3, for P41-sr.D1)** The player has 14 states, among them:
  - queued for the runner;
  - generating, with partial readiness;
  - ready, tap to play;
  - next chapter still preparing;
  - out of quota;
  - outdated audio.

  The iOS rules:
  - the tap itself calls `play()`;
  - the lock screen shows ±skip or previous/next, never both;
  - the player persists across reader navigation;
  - the home-screen app needs its own sign-in.

  See `topics/phone-playback.md` §9.

## Notes for later slices 10

- **(from P41-sr.R3, for P41-sr.REVIEW)** The operator's 13 iPhone checks include:
  - at least 5 minutes locked;
  - at least 2 chapter boundaries crossed while locked;
  - a long pause;
  - the silent switch;
  - passes in Chrome and in the home-screen app.

  Before them, an agent runs a production curl Range check. See `topics/phone-playback.md` §10.

## Notes for later slices 12

- **(from P41-sr.R2, for P41-sr.D1, P41-sr.DECOMP2)** Box voice: Supertonic 3.
  - **What it is:** English and Korean, 10 built-in voices, OpenRAIL-M.
  - **On the Mac:** ONNX on CPU at RTF 0.16 (render time ÷ audio time), using 0.7 GB of RAM.
  - **Projected on the shared A1 box:** a 130k-character book in about 1–2 h on 4 OCPUs, or 2–4 h on 1.
  - **The English-only box alternative:** Kokoro 82M.
  - See `topics/voice-models.md`.

## Notes for later slices 13

- **(from P41-sr.R2, for P41-sr.D1, P41-sr.DECOMP2)** Mac voice: Qwen3-TTS 1.7B CustomVoice.
  - **What it is:** Sohee (Korean) and Aiden (English), Apache-2.0, run on MLX at RTF 0.73.
  - **A book:** 2–10 h, with about 13 GB of free unified memory and the Mac on and awake.
  - **On CPU:** RTF 2.1 at 15 GB, so never on the box.
  - See `topics/voice-models.md` § The runner.

## Notes for later slices 15

- **(from P41-sr.R2, for the orchestrator)** The disk stop (the operator's SSD at 99%) cut the run from
  about six models to three.
  - **Not run:** Chatterbox Multilingual v3, OmniVoice, MeloTTS.
  - **Cleanup:** R2's cleanup list is in `slices/P41-sr.R2/result.md`: about 9.4 GB of Hugging Face
    cache, 6.4 GB of venvs, and the uv cache's growth. It waits on the operator's word.

## Notes for later slices 13 (2)

- **(from P41-sr.R4, for P41-sr.D1, P41-sr.DECOMP2)** Six free voice models now heard, in 11 samples. MeloTTS KR (MIT; CPU RTF 0.23 on 1 thread; 3–3.5 GB RAM) is the **box fallback for Korean**, not a replacement for Supertonic 3. OmniVoice is a light Mac option (MLX RTF 0.41, about 4 GB, CC-BY-NC); its designed Korean voice garbled 3 of 8 renders, so it needs an ASR gate. Chatterbox v3 is out: slower than real time on MPS, watermarked, unmaintained. R2's disk-stop note is consumed (operator, 2026-11-11: room again). → `topics/voice-models.md`

## Notes for later slices 14

- **(from P41-sr.D1, for DECOMP2, REVIEW)** The Listen design: job `docs/reference/design/jobs/11-listen/`, round `01-listen`. The canvas is https://claude.ai/artifact/EKyuGvWVWFKmgFuk71xKaG, with its entry Page `Main.dc.html`: the book landing → Listen → the chapter with the docked player → the opened player. The build spec is the round's `result.md` `## Build` plus `frame.md` F1–F33. The `kb` system was installed from the local cache: this login cannot open the system Artifact (same as P39-hk.D1). **Job-number collision:** P36-1s's branch plans its jobs as `10-`…`12-` by `design-open`, which collide with main's `10-reading-aids` and this `11-listen`. Neither phase renumbers the other's; settle it at P36-1s's merge.

## Notes for later slices 16

- **(from P41-sr.R5, for P41-sr.DECOMP2)** The new Mac first picks, on machine evidence (the operator confirms by ear):
  - **Korean: Fish Audio S2 Pro, 8-bit MLX.** Whisper CER 0.20 and voice proxy 0.87, against Sohee's 0.29 and 0.74. RTF 1.9, so about 9 h per 130k characters; 15–17 GB; non-commercial. It needs one conversation per section (at most about 20 min of audio), each opened with a fixed, discarded warm-up sentence.
  - **English: Ming-3.0 US_Emma.** MIT, arena Elo 1185, RTF 0.42, 4.4 GB. Ming's Korean must be pre-split, because mlx-audio's splitter ignores Hangul.
  - **The box is unchanged:** Supertonic 3, with MeloTTS as the Korean fallback.
  - → `topics/voice-models.md` § Recommendation, § Round 3 (R5)

## Notes for later slices 10 (2)

- **(from P41-sr.R2, for P41-sr.DECOMP2)** Supertone, Supertonic's maker, has been in liquidation since
  2026-07. The weights run offline under OpenRAIL-M, so keep a local copy and expect no updates. See
  `topics/voice-models.md`.

## Notes for later slices 11

- **(from P41-sr.R1, for P41-sr.D1, P41-sr.DECOMP2)** The free-API pick, by ear: edge-tts (keyless, unofficial; EN Andrew or Ava, KO SunHi or Hyunsu; no quota a book reaches). Only edge-tts and Google Translate TTS were heard. Gemini (official; its free tier trains on the text) and Deepgram (training opt-out; a one-time $200 credit) were surveyed, not sampled: no key. Fish Audio's free API and Cloudflare MeloTTS end this month. → `topics/voice-apis.md` § Shortlist and recommendation

## Notes for later slices 12 (2)

- **(from P41-sr.R1, for P41-sr.D1, P41-sr.DECOMP2)** "Preparing" is long: a book is 2.7–11.2 h of audio, and edge-tts makes it in about 1–3.5 h, one request at a time (bursts get a 403 IP block). Generate ahead per chapter, play each chapter as it lands, and keep the voice behind one adapter with a fallback. → `topics/voice-apis.md` § Risks

## Notes for later slices 15 (2)

- **(orchestrator, for D1's stop and DECOMP2)** The voice samples page, private: https://claude.ai/artifact/MvYx6Sqwf5fvRBvqk9yV5z. It holds 17 samples (6 API, 11 model) from both manifests, built by a scratch `build.py`. The operator's pick there decides DECOMP2's voice engine.

## Notes for later slices 16 (2)

- **(from P41-sr.B2, for P41-sr.W1, P41-sr.W2)** The state's `play = {list, playlist, timeline}`, as BFF paths via `web/src/lib/knowledge/listen.ts`. Load `play.playlist` once `len` is set (native HLS, else hls.js). A chapter seek is `timeline.entries[i].start`; follow along maps `currentTime` to `segments[].block`. Re-read the timeline while it is incomplete. A new `play.list` means the audio changed: never swap `src` at `ended`. Beacon: `POST /api/listen/position` → `slices/P41-sr.B2/result.md` § Contract
