# P41-sr.R3 — result

## Verdict

- **status:** done
- **route:** research
- **model:** opus
- **effort:** xhigh
- **summary:** Researched phone playback with the screen locked. The finding: a locked iPhone cannot reliably start a new file after `ended`, so each Listen needs one continuous source. Recommended: HLS over AAC-LC mono 48 kbps parts (54–130 MB per book), generated on demand, with one `.m4a` per Listen as the fallback and no podcast feed unless the operator asks. The topic file covers this, the serving-chain Range fix (verified on a local Starlette and Node relay), the Mac runner, D1's states and the operator's iPhone checks.
- **files_changed:**
  - `works/phases/active/P41-sr/topics/phone-playback.md` (new)
  - `works/phases/active/P41-sr/slices/P41-sr.R3/result.md` (new)
  - throwaway, gitignored: `.cache/p41-playback/` (`gen.sh`, `server.py`, `relay.mjs`, `index.html`, `media/`, logs)
- **validation:**
  - The topic file exists, and each claim carries a `[Sn]` source or a `file:line`: pass.
  - Throwaway servers on 127.0.0.1:8791 and :8792 stopped, and `lsof` shows nothing listening: pass.
  - `git status --porcelain --untracked-files=all` shows nothing of mine outside the declared set. Mine are `topics/phone-playback.md` and `slices/P41-sr.R3/`. `.cache/` is ignored (`.gitignore:3`): pass.
  - `python3 scripts/workflow.py validate`: passed. Its warnings were already there; none come from this slice.
- **deviations:**
  - The optional Claude in Chrome desktop check was skipped: `list_connected_browsers` returned no browsers, which the plan allows.
  - The notebook carries one extra **Decisions** gist beyond the plan's Notes, OQ and Now. The never-swap-at-`ended` constraint is settled by evidence rather than recommended. The orchestrator may drop it.
- **doc_impact:** none (findings only).
- **notebook** (wave; for the orchestrator to write):
  - **Notes for later slices:**
    - **On DECOMP's entry 3** ("The asset route has no HTTP Range…"): consumed. **Replace** it (`--entry 3 --replace`) with the first line below, because DECOMP2 still needs the fix and the new line carries it.
    - `- **(from P41-sr.R3, for P41-sr.DECOMP2)** The Range fix, in place of DECOMP's Range note: FastAPI \`FileResponse\` (Starlette 1.3.1 serves 206/416/HEAD, verified); the BFF audio relay forwards \`Range\` and streams \`upstream.body\`; \`getRaw\` passes \`Range\` and maps 416; a new nginx regex location with \`proxy_buffering off\`; Mac uploads in parts of ≤ 10 min under the 20m cap; a production curl checks 206 through Cloudflare → \`topics/phone-playback.md\` §5, §7.`
    - `- **(from P41-sr.R3, for P41-sr.D1, P41-sr.DECOMP2)** Delivery: one continuous source per Listen. Never a \`src\` swap at \`ended\`: it fails on a locked iPhone. HLS over AAC-LC mono 48 kbps parts (54–130 MB per book, per voice and language), generated on demand. Play-while-generating (\`EVENT\`) only if the engine runs faster than real time. Fallback: one \`.m4a\` per Listen → \`topics/phone-playback.md\` §0, §3, §6.`
    - `- **(from P41-sr.R3, for P41-sr.D1)** The player's 14 states (queued for the runner, generating with partial readiness, ready-tap-to-play, next chapter still preparing, out of quota, outdated audio, …) and the iOS rules: the tap calls \`play()\`; the lock screen shows ±skip or previous/next, not both; the player persists across reader navigation; the home-screen app needs its own sign-in → \`topics/phone-playback.md\` §9.`
    - `- **(from P41-sr.R3, for P41-sr.REVIEW)** The operator's 13 iPhone checks: ≥ 5 min locked, ≥ 2 chapter boundaries crossed while locked, a long pause, the silent switch, and passes in Chrome and the home-screen app. Before them, an agent's production curl Range check → \`topics/phone-playback.md\` §10.` This line covers everything in DECOMP's REVIEW note (entry 7), so that note may be removed.
  - **Decisions** (optional, see deviations): `- Playback shape (R3): one continuous media source per Listen; chapters are seeks inside it; never a \`src\` swap at \`ended\`, which fails on a locked iPhone (WebKit 173332, 261554, 261858) → \`topics/phone-playback.md\` §3.`
  - **Operator Questions:** `- **OQ<n> (P41-sr.R3):** Beside the web player, do you want a private podcast feed for books? You would listen in a podcast app: offline, and the most reliable locked playback. Its secret URL, and with Overcast the audio, reaches the app's servers. Recommendation: not now; file it as a deferred job, and build it if the web player fails your iPhone check → \`topics/phone-playback.md\` §8.` The orchestrator numbers it in wave order.
  - **Now** (one line): `- **Landed (P41-sr.R3):** screen-off playback is researched. The answer is one continuous source per Listen (HLS over AAC parts, with one .m4a as fallback), generated on demand. The topic also holds the serving-chain Range fix, D1's states and the iPhone checks → \`topics/phone-playback.md\`. No podcast feed unless the operator asks (OQ).`

## What was done

1. **Read** `plan.md`, `intent.md`, the breakdown's R3 block and *Build inventory*, the notebook's Notes and Now, and operations `## Operator Runtime` (`validate` marks operations STALE, but the runtime section was only needed for the deviceId). Also read the code the plan names:
   - `server/documents_api.py:664-783`;
   - the BFF image relay and `getRaw`;
   - `deploy/knowledge.conf`;
   - `web/src/app/manifest.ts`, `web/src/lib/csp.ts`, `web/src/lib/session.ts`;
   - the Dockerfile and `compose.prod.yml`.
2. **Searched the web** for each of the nine questions, read the primary pages, and pulled MDN browser-compat-data JSON for Media Session, MediaMetadata, ManagedMediaSource and AudioSession support. The sources, with dates, are in the topic.
3. **Ran a throwaway check** (topic §11):
   - **Starlette's `FileResponse`** in the repo's `.venv` (1.3.1) serves Range correctly: 206 with Content-Range, 416, HEAD, Accept-Ranges.
   - **The current `Response(bytes)` shape** answers a Range request with 200 and the full body.
   - **A Node streaming relay** that forwards Range (the proposed BFF pattern) relays every case unchanged.
   - **An HLS book playlist** (fMP4 parts with byte ranges and DISCONTINUITY) decodes end to end through the relay with ffmpeg.
4. **Stopped both servers and confirmed the ports closed.**

## Findings in one paragraph each (detail in the topic)

- **Background audio:**
  - **What works:** an audible, audio-only `<audio>` keeps playing locked in an iOS Safari tab, iOS Chrome (WebKit) and Android Chrome.
  - **What fails:** iOS fails to start the next file after a natural `ended` while locked. This is documented from iOS 15.4.1 onward, with fresh October and November 2026 reports.
  - **The home-screen app is worse:** WebKit 261858 is still open, and lock-screen play goes dead after ~30 s paused. It also has its own cookie jar.
  - **The first play needs a tap.**
- **Media Session** works on iOS 15+. Any handler replaces the default controls. The lock screen shows ±skip *or* previous/next, never both. Handlers must be re-registered on `playing`. Safari has no `chapterInfo`.
- **Shape:**
  - **Rejected:** per-chapter `src` swaps and two-element handoffs.
  - **Reliable:** one continuous source.
  - **Recommended: HLS.** It is native on the operator's devices, and `EVENT` growth gives play-while-generating.
  - **Fallbacks:** first one `.m4a` per Listen, then MSE/ManagedMediaSource (proven on iOS 18.7 by one project).
- **Format:** AAC-LC mono at 48 kbps, which sits in Apple's 40–80 kbps range for mono at 22.05/24 kHz. That is 21.6 MB per hour and 54–130 MB per book. Opus is rejected (full support only from iOS 18.4).
- **Serving chain:** no link in it serves a range today.
  - **Server:** FastAPI moves to `FileResponse`.
  - **BFF:** forward Range and stream the body; `getRaw` needs a Range option and 416 handling.
  - **Edge:** nginx needs a new regex location, and `proxy_buffering off` helps.
  - **Cloudflare:** `private` responses are not cached; its 524 timeout is now 125 s; uploads are capped at 100 MB; its CDN terms mention audio files.
  - **Auth:** the image-relay model carries over, with signed URLs as the fallback.
- **Generation:** on demand from the listener's position. The cache works per spoken segment, keyed by the hash of the spoken text, the voice and the language, and audio is packaged in parts of ≤ ~10 min. Play-while-generating is allowed only for engines faster than real time.
- **Mac runner:**
  - **How it works:** a LaunchAgent polls with a dedicated `vk_` key under a lease and heartbeat, holds off sleep with `caffeinate -i`, and uploads raw parts small enough for nginx's 20m cap.
  - **The UI:** shows "waiting for the voice runner".
  - **Encoding:** the box image has no ffmpeg.
- **Podcast feed:** it is the best option for locked and offline listening, but its secret URL reaches third-party servers (Overcast and Pocket Casts crawl centrally; Apple syncs subscriptions through its cloud). Not now: the operator decides (OQ).

## Dead ends and limits

- The Medium original of the amsyeung article and dbushell.com returned 403. The dev.to copy of the former was read. The latter's artwork claim stays marked *secondary*.
- `trac.ffmpeg.org` (the AAC encoder ranking) is behind bot protection, so the topic makes no claim about encoder ranking.
- **Not settled from first-party sources, so they are device checks:**
  - whether Chrome for iOS keeps playing locked today, with lock-screen controls (§1);
  - how Cloudflare handles Range on an uncached `private` response (§5);
  - whether an HLS `EVENT` playlist keeps playing locked while it grows (§3).
- No agent instrument stands in for a real iPhone. Topic §10 lists the operator's checks.
