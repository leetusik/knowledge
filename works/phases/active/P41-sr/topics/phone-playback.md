# Phone playback with the screen off (P41-sr.R3)

Findings only. Web sources were read on **2026-11-11** unless a line says otherwise. `[Sn]` points to *Sources* at the end, and `file:line` points to this repo at the time of the slice. A claim marked *(secondary)* rests on a search summary or a single third-party write-up, not a page read in full. Nothing here quotes a private document: the throwaway check used macOS `say` on generic text.

## 0. Recommendation (the short version)

- **Delivery shape: one continuous media source per Listen. Never swap `src` at `ended`.**
  - Every source agrees that a web page on a locked iPhone cannot reliably start the next file once the current one ends naturally. WebKit closes the audio session at the natural end, and `play()` from the background then makes no sound [S1][S2][S3][S7][S8][S11].
  - Reports run from iOS 15.4.1 to October and November 2026. The home-screen app fares worst [S3][S7][S8][S9].
  - So chapters become **seeks inside one source**, and the lock screen's skip or previous/next buttons map to seeks.
- **The source: HLS.** Serve one `.m3u8` per Listen (a document, or a book from a chapter onward, in the reader's language) over AAC fMP4 parts stored on the box.
  - **Where it plays natively:** iPhone and iPad (Safari and Chrome are both WebKit), Mac Safari, Android Chrome and desktop Chrome 142+ [S21] *(secondary)*. hls.js (MSE, Apache-2.0) covers browsers without native HLS [S20].
  - **What it gives that a single file cannot:**
    - **play while generating:** an `EVENT` playlist grows part by part, then gets `EXT-X-ENDLIST` [S22];
    - **cheap edits:** the playlist references content-addressed parts, so only the changed parts are made again.
  - **Fallback 1:** if HLS fails an iPhone check (§10), concatenate the same parts into one progressive `.m4a` per Listen (ffmpeg concat `-c copy`, ran locally) and serve it with Range. This loses play-while-generating for books.
  - **Fallback 2:** MSE / ManagedMediaSource, appending the next part to one SourceBuffer. One project proved it on a locked iPhone on iOS 18.7, but it needs the most code [S8].
- **Format: AAC-LC, mono, at the engine's native rate (commonly 22.05/24 kHz), 48 kbps, in MP4.** That is 21.6 MB per hour, so **54–130 MB per book** for 2.5–6 h, per voice and language. Apple recommends AAC over MP3, MP4 over ADTS, and 40–80 kbps for mono at 22.05/24 kHz [S24]. Moving to 64 kbps is a by-ear choice (§4).
- **Generate on demand**, starting at the first Listen, in reading order from the listener's position. Never generate at publish.
  - **Granularity:** generation and caching work per spoken segment, keyed by the hash of the spoken text, the voice and the language. Packaging works per **part** (≤ ~10 min of audio).
  - **When playback may start:** once the first part is ready, **if** the engine runs faster than real time (R1 and R2 measure that). Otherwise the unit is prepared first (§6).
- **Podcast feed: not now.** It is the strongest option for locked and offline listening, but it hands a long-lived secret URL, and for some apps the audio, to third-party servers [S36][S37][S38]. Offer it as a deferred job, and as the fallback if the web player fails the operator's iPhone check. That choice is the operator's question (OQ).

## 1. Background audio with the screen locked

| Platform | Keeps playing | Stops | Versions and bugs | Tap needed |
|---|---|---|---|---|
| **iOS Safari tab** | An audible `<audio>` keeps playing locked. Page JS keeps running while audio is audible, with timers aligned to 1 s [S11]. | (a) Starting the next file after a natural `ended`: the event fires but `play()` makes no sound [S1][S2]. (b) Anything with a video track [S11]. (c) Muted or zero-volume media, once hidden [S11]. (d) Web Audio (`AudioContext`) is "ambient" and suspended in the background [S4], fixed in 17.5 when `navigator.audioSession.type = "playback"` [S2][S12]. (e) Once audio stops, WebKit releases its assertion and the page can be suspended, so no script runs [S11]. | Next-track failures were reported on 15.4.1 [S5] and on 17.2–17.3 [S2]. They returned on 17.2.1 for `<audio>` [S1], and 2026 reports continue [S7][S8][S9][S10]. Media Session arrived in 15 [S13]. The Audio Session API arrived in 16.4 [S13]. | **Yes.** iOS requires a user gesture to play media with sound [S15]. Call `play()` synchronously in the tap handler. |
| **iOS Chrome** | Same WebKit engine, so treat it as Safari. Chrome for iOS has kept audio playing in the background since 2012 [S17] *(old)*. | As Safari. | No first-party source for current Chrome on iOS: **device check** (§10). | As Safari. |
| **Home-screen web app** (`web/src/app/manifest.ts:15` declares `display: "standalone"`) | Background audio in standalone mode was **broken until iOS 15.4** [S4]. | Worse than Safari. (a) The next track does not start after a natural end; the lock-screen buttons stop responding; the same site works in Safari (iOS 16–17, **open**) [S3]. (b) Lock-screen play stops working after about 30 s paused [S6]. (c) 2026 reports in installed apps [S7][S8][S9]. | WebKit bug 261858 is still NEW [S3]. | As Safari, plus a **separate cookie jar**: a home-screen app shares no state with Safari, by design, so it needs its own sign-in [S18]. |
| **Android Chrome** | Audible background `<audio>` keeps playing, and Chrome does not freeze an audible page [S11]. A media notification appears for media of at least 5 s [S14]. | Muted background audio may be paused (`kPauseMutedBackgroundAudio`) [S11]. | Media Session since Chrome 57 [S13]. | One interaction with the domain unlocks autoplay with sound [S16]. |

- **Conclusion:** use an audible, audio-only `<audio>` element and one continuous source, and recommend a **Safari tab** over the home-screen app.
- **Note:** the operator's devices are iPhone, iPad and Mac Chrome (operations `## Operator Runtime`). Android is covered from sources only.

## 2. Media Session (lock screen)

- **Support:**
  - `metadata` (title, artist, album, artwork), `setPositionState`, and the handlers `play`, `pause`, `seekbackward`, `seekforward`, `previoustrack`, `nexttrack`, `seekto` and `stop` are all in Safari 15+, iOS included [S13].
  - `MediaMetadata.chapterInfo` is **not** in Safari [S13]. Change `title` per chapter from script; it runs while audio is audible [S11].
- **iOS defaults with no handler:** play/pause, a scrubber and ±15 s skips, with position and duration taken from the element [S11].
- **Registering any handler** replaces the defaults with exactly the registered commands, plus play/pause [S11].
- **Skip or previous/next, not both:**
  - With `seekbackward`/`seekforward` set, iOS shows skip buttons. To show previous/next, set those two to `null` and register `previoustrack`/`nexttrack` [S7].
  - So **the lock screen offers ±skip or chapter previous/next, never both.** This is a choice for D1 (§9).
- **The registration bug:** iOS ignores handlers registered before the element becomes "Now Playing". The fix is to re-register them on every `playing` event [S7].
- **Position state:** call `setPositionState({duration, playbackRate, position})` when playback starts, after a seek and on `ratechange` [S14]. With HLS `EVENT`, the duration is open until `ENDLIST`.
- **Artwork:**
  - Chrome wants 512×512 and falls back to the page icon [S14].
  - iOS artwork has been reported broken in some versions *(secondary, the 2023 dbushell.com write-up; its page returned 403)*.
  - Use a **static, same-origin, public** image, such as the app logo or a book cover that is not private. Never a private document's figure.

## 3. Chapter to chapter while locked: the shapes compared

| Shape | Locked iPhone | Plays while generating | Notes |
|---|---|---|---|
| One `<audio>`, change `src` in `ended` (a file per chapter) | **Unreliable**: fails after a natural end [S1][S2][S3][S5][S7][S8] | Yes | Rejected. The workaround is `loop = true` and swapping on the wrap to 0:00 [S7]. It is a fragile hack, and a short silence clip fired its own `ended` [S7]. |
| Two elements, standby `play()` at `ended` | **Unreliable**: a hidden page may not start it [S9] | Yes | Rejected. A second element also needs its own gesture [S15]. |
| One file per book | **Reliable**: "one `<audio>` playing one continuous file avoids all of these" [S11] | No: the whole book must exist first | Fallback 1. A chapter edit means re-concatenating, which is cheap with `-c copy`. Compute chapter offsets from the assembled file: per-file AAC priming made the local concat 43 ms longer than the sum of its parts. |
| Per-segment files with swaps | Worst: many more swaps | Yes | Rejected. |
| **HLS** (one playlist, parts with `EXT-X-DISCONTINUITY` between them) | Continuous, with the native player (AVFoundation) handling every boundary [S22] | **Yes**, through `EVENT` growth [S22] | **Recommended.** Native on iOS/iPadOS, macOS Safari, Android Chrome and Chrome 142+ [S21] *(secondary)*; elsewhere hls.js [S20]. Set `#EXT-X-START:TIME-OFFSET=0`, because a client otherwise starts an unfinished playlist ≥ 3 target durations from its end [S22] §6.3.3. |
| MSE / ManagedMediaSource | Proven on a locked iPhone on iOS 18.7 (12 tracks in 7.8 min) [S8] | Yes | Fallback 2. Needs iOS 17.1+ [S13]. iOS buffers only about 5 MB, so appends must be fragmented and `QuotaExceededError` handled. It needs `disableRemotePlayback` (no AirPlay) [S8], and had a cold-start regression on iOS 26.2 [S19]. |

**For a book of 130k–300k characters (2.5–6 h):** use HLS, packaged in parts of ≤ ~10 min cut at paragraph boundaries, which are pauses anyway, so the small gap at a discontinuity is not heard.

- **The playlist:** a playlist per Listen lists every part with a `DISCONTINUITY` between parts. The local run made each part's fMP4 with byte ranges (`-f hls -hls_segment_type fmp4 -hls_flags single_file`), joined three of them with discontinuities, and decoded the result end to end through a Range relay (§11).
- **A risk to check on the device:** keep generation **ahead** of playback. RFC 8216 expects a live playlist to gain a segment within 1.5 target durations [S22] §6.2.1. If playback catches up and audio stops, iOS may suspend the page [S11], and reloads may stall. So `EVENT` mode is allowed only when the engine runs faster than real time. Otherwise the unit is prepared first and served as a VOD playlist.

## 4. Formats and sizes

- **AAC in MP4** plays in every major browser [S26]. Apple's podcast table recommends **40–80 kbps** for mono at 22.05/24 kHz and 64–128 kbps at 44.1/48 kHz. It also says AAC sounds better than MP3 at the same bit rate, and recommends MP4 over ADTS [S24].
- **MP3** is universal (Safari 3.1+) [S26]. It is the fallback only if a runner cannot encode AAC.
- **Opus** is rejected: iOS has only partial support from 11 to 18.3 and full support from 18.4 [S27], and older Safari supports it only in CAF [S26].
- **Encoders:** this Mac's ffmpeg has both `aac` and `aac_at` (AudioToolbox), checked locally. The box's API image has **no ffmpeg**: `Dockerfile:19` installs only git, openssh-client and tzdata. A box runner therefore needs ffmpeg or PyAV added to the image.
- **Faststart:** use `-movflags +faststart` for progressive files, which puts the `moov` index first [S35].

| Bit rate (mono) | MB per hour | Book, 2.5 h | Book, 6 h |
|---|---|---|---|
| 32 kbps | 14.4 | 36 | 86 |
| **48 kbps (recommended)** | **21.6** | **54** | **130** |
| 64 kbps | 28.8 | 72 | 173 |

- The figures are decimal MB per voice and language, before container overhead. That overhead was about 5% on a 7 s local file and is smaller on long files.
- A book in both English and Korean doubles the size, and so does keeping a fallback-1 concatenation beside the parts.

## 5. HTTP Range and the serving chain: the change list for DECOMP2

- **The requirement:**
  - iOS needs byte ranges: "HTTP servers hosting media files for iOS must support byte-range requests" [S23].
  - Apple Podcasts likewise requires HEAD and byte ranges [S25].
  - Chrome reads media with open-ended `bytes=N-` requests [S11].
- **Today none of the chain serves a range.** Locally, the current `Response(content=bytes)` shape answered `Range: bytes=0-99` with **200, the full body and no `Accept-Ranges`** (§11).

**Changes:**

1. **FastAPI** (`server/documents_api.py:716-735`, `_asset_response`, which reads the whole file at `:726`):
   - Serve audio with **`starlette.responses.FileResponse`**. The installed Starlette 1.3.1 already does single and multiple ranges, `206` with `Content-Range`, `416` with `bytes */size`, HEAD and `Accept-Ranges`, all verified locally.
   - Use `audio/mp4` for parts, and `application/vnd.apple.mpegurl` with `Cache-Control: no-store` for an `EVENT` playlist.
   - Keep `nosniff` and the constant 404.
   - Use `private, max-age=…` for a private document. Content-addressed parts may be long-lived.
   - The image route itself can stay as it is.
2. **The BFF relay** (`web/src/app/api/documents/[id]/assets/[file]/route.ts:54,67`, the template for the audio route). In the audio twin:
   - forward `Range` and `If-Range`;
   - return the upstream status (200, 206 or 416) and pass `Content-Range`, `Content-Length`, `Accept-Ranges`, `ETag` and `Last-Modified` through;
   - **stream `upstream.body`** instead of `await upstream.arrayBuffer()`;
   - add a `HEAD` handler;
   - extend `getRaw` (`web/src/lib/knowledge/client.ts:100-112`), which today sends only the bearer (`:106`) and throws on every non-2xx (`:110`), so a 416 would become a 502.

   A Node relay built on this pattern passed every case locally (§11). Route handlers return a Web `Response` with a stream body [S34]. Next gzips responses under `next start` [S34]; check that an audio response carries no `Content-Encoding`.
3. **Edge nginx** (`deploy/knowledge.conf`):
   - Add a regex location for the new audio and playlist paths, like the image relay's at `:243`. Without one, `/api/documents/<id>/…` falls into `location /api/` (`:177`) and reaches FastAPI.
   - `Range` passes through by default (`proxy_pass_request_headers on`); it is dropped only when proxy caching is on, and it is not [S33].
   - Set `proxy_buffering off` or `proxy_max_temp_file_size 0` on that location, so nginx streams instead of spooling up to its 1024 MB temp-file default [S33].
   - **Uploads (Mac runner only):** `client_max_body_size 20m` (`:135`) caps a request. A 1 h part at 48 kbps (21.6 MB) would fail, so upload ≤ ~10 min parts (3.6 MB each) or give an upload location its own cap of at most 100m.
4. **Cloudflare:**
   - **Caching:** a `Cache-Control: private` response is not cached [S28]. `.m4a`, `.m4s` and `.m3u8` are not default-cached extensions, while `.mp3` is [S28].
   - **Range on uncached responses:** the range page covers only cacheable requests and does not say how Range is handled for uncached ones [S29]. **Check on production:** `curl -H 'Range: bytes=0-99'` should return `206`, with `cf-cache-status` BYPASS or DYNAMIC.
   - **Origin timeout:** the 524 page now gives **125 s** by default, not the ~100 s in the nginx comments. It does not say whether that counts time to first byte or idle time [S30]. Headers come at once and parts are small, so it does not bite.
   - **Uploads:** the free plan caps a request body at **100 MB** [S31].
   - **Terms:** the CDN terms let Cloudflare restrict serving "a disproportionate percentage of pictures, audio files, or other large files" without paid services [S32]. A single listener is a small share, but it is a non-zero risk to note in `decisions.md`.
5. **Auth and visibility:**
   - **The route:** keep the image model. The BFF unseals `knowledge_session` (httpOnly, `SameSite=Strict`, 30 days: `web/src/lib/session.ts:28,53`), forwards the bearer, and FastAPI resolves the document through `_resolve_readable_doc` (`server/documents_api.py:193`). Audio is readable exactly when its document is, behind one constant 404.
   - **Cookies on media requests:** they are same-origin, so the cookie rides along. WebKit sends AVFoundation's requests (progressive and HLS) through its own loader with credentials included, a finding from reading WebKit's source, not tested on a device [S11]. hls.js uses same-origin XHR.
   - **Check the credential's reach:** it must cover the whole listen, pauses included, because the media stack re-requests ranges mid-listen and Chrome does not retry a 401 [S11].
   - **If the iPhone check shows cookie-less media requests** (404s in the API log during locked playback), switch to signed part URLs: an HMAC token with an expiry that FastAPI checks on `/app/…`, which the edge already sends to FastAPI (`:261`).
   - **CSP:** `APP_CSP` has no `default-src` or `media-src` (`web/src/lib/csp.ts:28-36`), so media loads are unrestricted today. If a `default-src` is ever added, add `media-src 'self' blob:`; hls.js needs `blob:`.

## 6. Generate ahead or on demand

- **On demand, at the first Listen.** Generating at publish spends free quota and CPU on documents never heard, multiplied by each voice and language, and repeats on every edit.
  - **The optional exception:** a **"Prepare"** action on the book landing (queue the whole book before a commute).
- **Order:** generate from the listener's start position onward, then the rest of the unit.
- **What plays early:**
  - **When the engine is faster than real time** (R1/R2's measured real-time factor < 1): the first **part** (≤ ~10 min) plays while the rest generates, through HLS `EVENT` (§3). The first-play wait is then about the part length × the real-time factor.
  - **When it is slower:** the unit is prepared first, and the player shows a preparing state with progress.
- **The cache:**
  - **Key:** `sha256(normalized spoken text + voice id and settings + language + engine version + encoder profile)`, one key per spoken segment. S1 produces the segments.
  - **Unit manifest:** a document's audio is an ordered list of segment hashes, its parts are packaged from them, and the playlist is generated from the manifest. This mirrors the content-addressed `.assets/` store (`server/assets.py:25-28`).
  - **Invalidation:**
    - Implicit: an edit changes only the hashes of the segments it touched.
    - A change to S1's read and skip rules changes the spoken text and so the keys.
    - A voice change makes new keys.
  - **Garbage collection:** delete parts that no current manifest references after N days.
  - **Storage:** under the content root in a dot-dir with its own `.gitignore` (`*`), never committed, like `.assets/`. The repo is public.
- **Box disk:** 54–130 MB per book, per voice and language, at 48 kbps (§4). The box's free disk is recorded nowhere, so the deployment slice measures it.
- **Timestamps for free:** part and segment offsets give block-level timing, which is what D1's "follow along" candidate would need.

## 7. The Mac as an off-box runner

- **Learning about work: polling.** The box cannot reach a Mac behind NAT. A persistent outbound socket would cross Cloudflare's timeouts [S30], which is too much for this. So:
  - **The poll:** a per-user **LaunchAgent**, which runs only while the operator is logged in [S41], polls `/api/…/jobs/claim` every 15–60 s. It authenticates with a dedicated, revocable org-level `vk_` key, the bearer resolved in `server/api_auth.py`.
  - **The job:** it claims a job under a **lease** and sends a heartbeat. When a lease expires (the Mac slept mid-job), the job is re-queued.
  - **Sleep:** while a job runs, `caffeinate -i` holds off idle sleep; `-s` works only on AC power [S40].
- **Upload:** raw `audio/mp4` per part, not base64 JSON (base64 adds a third), one request per part of ≤ ~10 min (3.6 MB at 48 kbps). That fits nginx's 20m cap (`deploy/knowledge.conf:135`) and Cloudflare's 100 MB free cap [S31].
- **"The Mac must be on, and a job waits until it is":**
  - jobs queue on the box;
  - each poll is a heartbeat, so the box knows `runner_last_seen`;
  - the UI states it honestly: "waiting for the voice runner, last seen …" (§9).
- **Compared with a box runner:**

| | Box runner | Mac runner |
|---|---|---|
| Always available | Yes | Only while awake and logged in |
| Models | Light only (box CPU and RAM unrecorded, R2) | Heavier models via MLX/MPS (R2) |
| Encoder | Image needs ffmpeg or PyAV (`Dockerfile:19`) | ffmpeg `aac`/`aac_at` present |
| Moving parts | In-process worker, like the publish worker (`server/publish.py`) | A job queue, leases, upload endpoints, a key on the Mac, a LaunchAgent |
| Failure UX | "generating" | "generating" **plus** "waiting for the runner" |

- **Free APIs:** if an API is the pick, the **box** calls it directly, and no Mac is involved.
- **SSH/rsync from the Mac into the box's storage** (the deploy path's `ssh oracle-cloud`) is possible, but it bypasses API auth and the database record. Not recommended as the product path.

## 8. A private podcast feed

- **What it gains:**
  - downloads for offline listening;
  - native lock-screen and CarPlay controls;
  - automatic episode-to-episode playback with no web bugs;
  - speed and resume per episode.
- **What it needs:**
  - one secret, per-book, revocable token in the feed URL (≥ 128 bits, stored hashed like the `vk_` keys);
  - enclosure URLs carrying a long-lived token, because apps download later;
  - `<itunes:block>`, so directories do not process it [S39];
  - HEAD and byte-range support on the audio [S25];
  - per-chapter episodes (progressive `.m4a`, fallback 1's files).
- **Privacy:**
  - **Overcast** crawls feeds from its own servers, and its servers "may" download episodes to collect metadata. It treats `itunes:block` or basic-auth feeds as private: no search, no share [S36].
  - **Pocket Casts** polls from its servers, even after unfollowing [S37] *(secondary)*.
  - **Apple Podcasts:** every copy of the app checks the feed itself, but subscriptions sync through Apple's cloud when sync is on [S38]. The "Follow a Show by URL" path exists [S39].
  - So the secret URL, and with Overcast possibly the audio of private documents, reaches a third party.
- **Revocation:** rotating the token kills the old URL, but a copy an app has already downloaded stays on the device.
- **Recommendation:** do not build it in P41. Offer it as a **deferred job**, triggered if the web player fails the iPhone check or the operator wants offline listening. The question goes to the operator (OQ).

## 9. What D1 must draw: states and transitions

- **Entry points:**
  - Listen on a document;
  - Listen on a chapter (the book from here onward);
  - Listen on the book landing (the whole book, **resume**, and optionally **Prepare**).
- **States:**

1. **Idle**: either "Listen · 42 min" (audio cached) or "Listen" (it prepares first).
2. **Preparing, queued**: with a Mac runner, "waiting for the voice runner, last seen …".
3. **Preparing, generating**: progress (part k of n, or %, plus a rough ETA), and **partial readiness**: "ready to start" once the first part exists, if `EVENT` mode is on.
4. **Ready, tap to play** (iOS-imposed). If preparing outlasted the tap, `play()` needs a new gesture [S15]. The same applies if the phone locked while preparing: the page is suspended and cannot start playback itself [S11].
5. **Loading / buffering at start.**
6. **Playing**:
   - position and duration (an open duration while `EVENT`);
   - the chapter title;
   - speed;
   - ±15 s;
   - previous/next chapter in the page;
   - optionally the "follow along" highlight (offsets from §6).
7. **Paused**: resume. After a long lock-screen pause in a home-screen app, play may not respond [S6], so draw a "tap to resume" for when the page returns.
8. **Buffering mid-play / stalled** (network).
9. **Moving to the next chapter**: inside one source this is only a title change. If generation is behind, draw **"next chapter still preparing"**.
10. **Finished**: the end of the document or of the book.
11. **Failed**, in four flavours:
    - generation error (retry);
    - **out of quota** (the free API's daily cap, with a retry time; R1 has the limits);
    - playback error (network, or session expired: sign in);
    - unavailable (the document is not readable).
12. **Offline**: cannot start. Mid-play, it plays to the end of the buffer, then stalls. Offline listening is the podcast feed's job (§8).
13. **Resume a position**: "Resume chapter 4 · 12:30" or "Start over". The position is saved per user and unit.
14. **Audio outdated**: the document changed since the audio was made. Only the changed parts regenerate (§6).

- **Constraints from iOS and the platform:**
  - **The first tap starts playback.** Call `play()` synchronously in the Listen or Play handler [S15].
  - **The lock screen** shows ±skip **or** previous/next chapter, not both [S7]. Recommendation: ±15 s, the podcast convention, with chapter jumps in the page.
  - **The lock screen is drawn by the OS:** D1 controls only the title (the chapter), the album (the book) and the artwork (§2).
  - **The player must outlive navigation:** the `<audio>` lives in a layout that persists across client-side reader navigation, docked. A full page load kills playback.
  - **The home-screen app needs its own sign-in** [S18]. The Safari tab is the recommended way to listen (§1).

## 10. The operator's iPhone acceptance checks (for REVIEW)

- **Why the operator:** no agent instrument stands in for a real iPhone.
- **Before them,** an agent checks production with curl, on an audio URL:
  - `Range: bytes=0-99` gives `206` with `Content-Range`;
  - an out-of-range request gives `416`;
  - HEAD gives `200`;
  - there is no `Content-Encoding`;
  - `cf-cache-status` is not HIT for a private document.

1. Record the iPhone model, the iOS version and the browser.
2. **Safari tab, document:** tap Listen and let it play. Lock the phone and listen for ≥ 5 min: audio continues.
3. **Lock-screen controls:** the title, chapter and artwork are right; play/pause works; ±15 s (or previous/next, per D1) works; dragging the scrubber seeks.
4. **Chapter boundary while locked:** start a book about 1 min before a chapter's end and lock the phone. Playback crosses **≥ 2 chapter boundaries** without unlocking, and the lock-screen title changes.
5. **Long pause:** pause from the lock screen, wait 2 min and then 10 min, and press play on the lock screen. It resumes.
6. **Interruptions:** a call or Siri, then resume. Switch to another app with the screen on: playback continues.
7. **Network:** switch Wi-Fi to cellular while locked. Playback continues, or the failed state appears on unlock.
8. **Silent switch on:** audio still plays.
9. **Play while generating** (only if `EVENT` mode is built): start an ungenerated book, lock right after playback starts, and cross the first part boundary.
10. **Resume:** close the tab, reopen the book, and "Resume at …" lands at the right point.
11. **Private document:** sign out. The audio URL no longer plays (constant 404).
12. **Repeat 2–5 in iOS Chrome and in the home-screen app** (sign in there first). Record which pass; the home-screen app is expected to be weakest [S3].
13. **iPad Safari:** a quick pass of 2–4.

- **How to read the results:**
  - If 4 fails in Safari: build fallback 1 (one progressive file) or ask about the podcast feed.
  - If it fails only in the home-screen app: record it in `operations.md` as "listen in Safari, not from the Home Screen".

## 11. The throwaway check (what ran)

- **Files:** `.cache/p41-playback/`, which is gitignored and holds `gen.sh`, `server.py`, `relay.mjs`, `index.html` and `media/`. It is the slice's only throwaway; no product file changed.
- **The audio:** three ~7 s "chapters" from macOS `say`, encoded with ffmpeg as AAC-LC mono, 24 kHz, 48 kbps, faststart. It produced:
  - a concatenated `book.m4a`;
  - per-chapter HLS fMP4 parts with byte ranges;
  - a book `.m3u8` joining them with `EXT-X-DISCONTINUITY`.
- **Starlette `FileResponse`** (the repo's `.venv`, Starlette 1.3.1, on 127.0.0.1:8791) answered:
  - `bytes=0-99` with 206 and `Content-Range: bytes 0-99/131190`;
  - `bytes=100000-` with 206;
  - `bytes=999999-` with 416 and `bytes */131190`;
  - a plain GET with 200 and `Accept-Ranges: bytes`;
  - HEAD with 200.
- **The current shape,** `Response(content=bytes)`, answered a Range request with **200, the full body and no `Accept-Ranges`**.
- **The Node relay** (`relay.mjs`, on 127.0.0.1:8792) used Web `fetch`, forwarded `Range`/`If-Range`, passed the status and range headers through, and **streamed** the body. It gave identical results to Starlette, including 416.
- **The HLS book playlist** decoded end to end through the relay with ffmpeg (20.68 s). The origin saw only byte-range requests for the init and media ranges of each part.
- **Not run:** a desktop browser check. `list_connected_browsers` returned no browsers, so the Claude in Chrome check was skipped, as the plan allows. ffmpeg is not AVPlayer: the HLS result shows the packaging is valid, not that the iPhone plays it locked.
- **Both servers stopped:** ports 8791 and 8792 were checked closed.

## Sources (read 2026-11-11 unless noted)

- [S1] WebKit bug 173332, "HTML5 audio .ended not firing in background / screen off": https://bugs.webkit.org/show_bug.cgi?id=173332
- [S2] WebKit bug 261554, "[iOS] AudioContext is getting suspended when page goes in the background…" (fixed in 275558@main; its comments cover `<audio>` src swaps): https://bugs.webkit.org/show_bug.cgi?id=261554
- [S3] WebKit bug 261858, "[iOS 16.x & iOS 17.x] autoplay in audio element and media session controls not working in standalone web app (pwa) when playback ends" (NEW): https://bugs.webkit.org/show_bug.cgi?id=261858
- [S4] WebKit bug 198277, "Audio stops playing when standalone web app is no longer in foreground" (fixed in iOS 15.4): https://bugs.webkit.org/show_bug.cgi?id=198277
- [S5] Apple Developer Forums 706499 (iOS 15.4.1, next track not played while locked): https://developer.apple.com/forums/thread/706499
- [S6] Apple Developer Forums 762582 (PWA lock-screen play dead after ~30 s paused): https://developer.apple.com/forums/thread/762582
- [S7] amsyeung, "Getting my iPhone music app to keep playing on the lock screen" (dev.to; the Medium original returned 403): https://dev.to/amsyeung/getting-my-iphone-music-app-to-keep-playing-on-the-lock-screen-91f
- [S8] legato issue 408, "Locked, the installed iPhone app can't start the next track" (the MSE fix; iOS 18.7 prototype): https://github.com/danielbchurchill/legato/issues/408
- [S9] NicotinD issue 1530 (iPhone web app queue stops off screen): https://github.com/kevinch3/NicotinD/issues/1530
- [S10] audiopost issue 23 (locked iPhone; page script suspended once nothing plays): https://github.com/cwfreelance/audiopost/issues/23
- [S11] patricktree/cup issue 58 and its research note (iOS Safari and Android Chrome locked MP3; WebKit and Chromium source citations): https://github.com/patricktree/cup/issues/58 · https://github.com/patricktree/cup/blob/8fc2116/docs/research/locked-mp3-playback.md
- [S12] sadiss issue 134 (WebKit 261554 confirmed fixed by iOS 17.5): https://github.com/sadiss-org/sadiss/issues/134
- [S13] MDN browser-compat-data, `api/MediaSession.json`, `MediaMetadata.json`, `ManagedMediaSource.json` and `AudioSession.json` (raw JSON, main branch): https://github.com/mdn/browser-compat-data/tree/main/api
- [S14] web.dev, "Customize media notifications and playback controls with the Media Session API": https://web.dev/articles/media-session
- [S15] WebKit blog, "New video policies for iOS" (2016-07-25): https://webkit.org/blog/6784/new-video-policies-for-ios/
- [S16] Chrome for Developers, "Autoplay policy in Chrome": https://developer.chrome.com/blog/autoplay
- [S17] Cult of Mac, "Google Chrome for iOS can now play audio in the background…" (2012-12-14): https://www.cultofmac.com/news/google-chrome-for-ios-can-now-play-audio-in-the-background-after-its-been-closed
- [S18] WebKit bug 181849, "'Add to homescreen' apps don't share storage with Safari" (intentional, 2022): https://bugs.webkit.org/show_bug.cgi?id=181849
- [S19] WebKit bug 305712, "REGRESSION (iOS 26.2): ManagedMediaSource Cold Start Failure": https://bugs.webkit.org/show_bug.cgi?id=305712 · Safari 17.1 brings MMS to iPhone (search summary): https://webkit.org/blog/14735/
- [S20] hls.js (MSE-based, MMS on iOS 17.1+, Apache-2.0): https://github.com/video-dev/hls.js
- [S21] *(secondary, search summaries)* Chrome desktop native HLS from 142: https://tech-ish.com/2025/12/08/google-chrome-microsoft-edge-chromium-native-hls-playback-desktop · Mux incident on the 141 rollout: https://status.mux.com/incidents/g4wcv5cm02sg
- [S22] RFC 8216, HTTP Live Streaming (§3.3 fMP4, §4.3.2.2 BYTERANGE, §4.3.2.3 DISCONTINUITY, §4.3.3.5 EVENT, §6.2.1, §6.3.3, §6.3.4): https://www.rfc-editor.org/rfc/rfc8216
- [S23] Apple, Safari Web Content Guide, "Creating Video" (byte-range requirement, updated 2016-12-12): https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/CreatingVideoforSafarioniPhone/CreatingVideoforSafarioniPhone.html
- [S24] Apple Podcasts for Creators, "Audio requirements": https://podcasters.apple.com/support/audio-requirements
- [S25] Apple Podcasts for Creators, "Podcast requirements" (HEAD and byte-range requests): https://podcasters.apple.com/support/823-podcast-requirements
- [S26] MDN, "Web audio codec guide": https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Audio_codecs
- [S27] caniuse, Opus: https://caniuse.com/opus
- [S28] Cloudflare, "Default cache behavior": https://developers.cloudflare.com/cache/concepts/default-cache-behavior/
- [S29] Cloudflare, "Range requests" (last updated 2026-09-14): https://developers.cloudflare.com/cache/reference/range-requests/
- [S30] Cloudflare, "Error 524" (125 s default Proxy Read Timeout): https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-5xx-errors/error-524/
- [S31] Cloudflare, Workers limits, "maximum request body size" by zone plan (Free 100 MB): https://developers.cloudflare.com/workers/platform/limits/
- [S32] Cloudflare, Service-Specific Terms, CDN (updated 2026-09-28): https://www.cloudflare.com/service-specific-terms-application-services/
- [S33] nginx, `ngx_http_proxy_module` (`proxy_buffering`, `proxy_max_temp_file_size`, `proxy_pass_request_headers`, Range with caching): https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- [S34] Next.js, `route.js` (Web Request/Response, streaming): https://nextjs.org/docs/app/api-reference/file-conventions/route · `compress` (gzip under `next start`): https://nextjs.org/docs/app/api-reference/config/next-config-js/compress
- [S35] FFmpeg formats, mov/mp4 `faststart`: https://ffmpeg.org/ffmpeg-formats.html
- [S36] Overcast, "Info for podcasters" (central crawlers; private feeds): https://overcast.fm/podcasterinfo
- [S37] *(secondary, search summary)* Pocket Casts, "Private, Paid, or Members-Only Feeds": https://support.pocketcasts.com/knowledge-base/private-or-members-only-feeds/
- [S38] Michael Tsai, "Privacy of Apple Podcasts" (quoting James Cridland, 2021): https://mjtsai.com/blog/2021/01/05/privacy-of-apple-podcasts/
- [S39] Apple Podcasts for Creators, "How Apple Podcasts distributes your shows to listeners" (`itunes:block`, follow by URL): https://podcasters.apple.com/support/5108-how-apple-podcasts-distributes-your-shows-to-listeners
- [S40] `caffeinate` man page (ss64): https://ss64.com/mac/caffeinate.html
- [S41] Apple, "Creating Launch Daemons and Agents" (LaunchAgents run while the user is logged in; `KeepAlive`, `StartInterval`): https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html
- Repo, checked 2026-11-11: `server/documents_api.py:193,674,716-735,743,764`, `web/src/app/api/documents/[id]/assets/[file]/route.ts:54,67`, `web/src/lib/knowledge/client.ts:100-112`, `deploy/knowledge.conf:135,177,243,261`, `web/src/app/manifest.ts:15`, `web/src/lib/csp.ts:28-36`, `web/src/lib/session.ts:28,53`, `Dockerfile:19`, `server/assets.py:25-28`, `uv.lock` (Starlette 1.3.1, FastAPI 0.139.0), and the local run (§11).
