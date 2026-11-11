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
