# P41-sr — breakdown

`P41-sr.DECOMP` wrote this file on 2026-11-11. `DECOMP2` rewrites it in place once D1's round is signed. `intent.md` is the record; this file says how the work is cut and what each slice must not trip over. Code line numbers are at `b668d582`.

## Passes

- **DECOMP** (2026-11-11), style `build-after`, `Mockup: on request`: research first. Three research slices (R1 free voice APIs, R2 free voice models, R3 phone playback with the screen off) run as one declared wave beside the S1 groundwork (the spoken script). Then one design slice (D1: one job, one round, critique `critic`), then `DECOMP2`. No build slice is cut before the signature. Not an explain phase (no `## Explain`); the orchestrator declares the gate `--require`. `parallel-plan`: `DECOMP -> R1 + R2 + R3 + S1 -> D1 -> DECOMP2 -> REVIEW`.
  - **The voice-pick route.** After the first wave drains, the orchestrator publishes one private samples page built from `.cache/p41-voices/*/manifest.json`, each candidate's terms beside its audio. The pick is one decision in D1's round stop, with a recommendation, so the operator listens and signs in one sitting. DECOMP2 builds on the pick.
  - **Operator addition, mid-DECOMP (2026-11-11):** "I'm also thinking this mac as voice model runner. if no good from the research, consider that as well,." Folded in: R2 records each model's realistic runner (box, Mac or neither), R3 covers the Mac as an off-box runner, and build items 2–3 leave the runner open until the pick. Runner: the box first; this Mac is the operator's named fallback.
- **DECOMP2** (not yet run): cuts the build from D1's signed round, the inventory below and R1–R3's findings. Order: backend first, then the player, then the writer guidance and release.

## Estimate

**Time** comes from `dispatch-summary`'s `means`, metered 2026-11-11 over every transcript root:
- routes: high 60.5 min/span (107 spans), research 25.2 (10), mid 13.4 (53), explore 2.6;
- design rows: frame 16.8, page 13.6, join 18.9, critic-page 10.6, critic-cross 15.9;
- kinds, span-min per slice: research 25.5, implementation 20.0, decomposition 11.4, review 186.0, fix 93.9. Co-work's 629.4 is dominated by the pre-v61 multi-round jobs of P29–P30, so it is not used for one round.
- comparables: P39-hk.D1 (one job, `critic`) took 10 drafter spans (153 min) and 4 critic spans (48 min); P39-hk.R1 33.0 min and P40-2t.R1 25.0; P39-hk.DECOMP2 17.7 and P40-2t.DECOMP2 11.4.
- **The main thread** is metered in requests, not minutes: about 10 requests a slice in P39-hk and P40-2t, so ≈ 5–10 min of planning a slice. D1's is larger (88 requests in P39-hk.D1: the read-back, the publish, the operator), ≈ 30–45 min.

| Slice | Route | Span time | Main thread |
|---|---|---|---|
| R1 | research | ≈ 40–75 min over two spans: ~8 APIs, the book math, samples, one `needs_operator` stop for keys, then a resume | ≈ 10 min, plus the operator's sign-ups |
| R2 | research | ≈ 60–120 min: installs and weight downloads, runs on the Mac's CPU and GPU, RTF and memory, the runner judgement | ≈ 5–10 min |
| R3 | research | ≈ 25–45 min: the platform rules, the serving chain, a throwaway test page | ≈ 5–10 min |
| S1 | mid | ≈ 10–25 min, the template mirror included | ≈ 5 min |
| D1 | design rows | frame ≈ 17, then 3–4 pages at once ≈ 14 each, join ≈ 19, then 3–4 page critics at once ≈ 11 each plus the cross critic ≈ 16, one answer pass ≈ 15–30: ≈ 150–210 span-min (P39-hk.D1 ≈ 200), ≈ 1.5–2.5 h wall | ≈ 30–45 min (the read-back, the samples page, the publish), plus the operator's sitting |
| DECOMP2 | high | ≈ 15–25 min | ≈ 10 min, plus the plan gate |
| REVIEW | high, gated | ≈ 60–180 min (186 span-min per review over 2.2 spans; P39-hk 155, P40-2t 35): a real-browser walk on production, with audio | ≈ 10–15 min |

- **The build** (cut by DECOMP2, about 4–6 slices): the backend slices are likely `high` (a persisted audio cache, the background thread, the delivery's auth), the player `high` or `mid`, the writer guidance and the release `mid`. That is ≈ 30–70 min a high slice and 10–25 a mid one, so **≈ 2.5–5 h of span time**. Fix slices after the review are not counted (93.9 span-min each; P39-hk needed seven).
- **Totals.** Span time ≈ **8.5–16 h**. The first wave runs at once, so it costs its longest member (R2, ≈ 1–2 h) instead of the sum (≈ 2.3–4.4 h). Wall clock: the wave ≈ 1–2 h, D1 ≈ 1.5–2.5 h, DECOMP2 ≈ 0.3–0.5 h, the build ≈ 2.5–5 h (backend first, mostly a chain), REVIEW ≈ 1–3 h, and the main thread ≈ 1.5–2.5 h: **≈ 8–15 h wall clock**, plus the operator's three stops (R1's key sign-ups, D1's listen-and-sign sitting, the iPhone acceptance).
- **Spend:** no slice spends money. R1 uses free tiers only: keys come from the repo's gitignored `.env`, and only from accounts and projects with no billing enabled (for example an AI Studio key on a project with billing off). **Never a key on a billing-enabled project**, so a free tier that needs billing on (Google Cloud TTS, per intake) is surveyed from its documents and never sampled. R2 runs open weights, which are free to download. R3, S1, D1, DECOMP2 and REVIEW call no vendor at all. Every span is the workspace's own dispatch.

## Join-rebuilt artifact

None. No slice in this pass touches a lockfile or a bundle.
- R2's scratch venv lives under `.cache/p41-voices/venv*/`, never in `uv.lock` or `pyproject.toml`. R1 installs any client it needs (edge-tts, a vendor SDK) into a venv inside its own `.cache/p41-voices/apis/`. Neither uses the project's `.venv`, which S1's tests run in.
- **The first wave's sets are disjoint** (see each block). Runtime resources: R2 holds the Mac's CPU and GPU for its measurements; R3 holds a local port for its test page, and the agent's Chrome if it uses it; R1 holds only network calls and quotas; S1 runs `pytest`. R2's timings are noisy while the wave runs, so R2 repeats each timing and reports the best of N, noting the wave.

## Build inventory

What the build ships, not how, one line each. DECOMP2 cuts from it.

1. **The spoken script** (S1, the groundwork). It turns a document into ordered spoken segments and applies the read and skip rules.
2. **The voice engine** for the operator's pick, English and Korean, which may be two engines. It covers text normalisation, chunking to the engine's limits, and keys only in env. **The runner may be the box or the operator's Mac** (an off-box runner that uploads to the box). The choice follows the voice pick, and DECOMP2 settles it.
3. **Audio generation and its cache.** Generation runs in the background on the box, **or on the Mac with upload to the box** (the same choice as item 2). Audio is stored on the box disk, gitignored like `.assets/`, and keyed by document version, voice and language. The item also covers quota and failure handling, and how much disk it uses.
4. **Audio delivery** across the API, the BFF and the edge. It needs **HTTP Range**, the document's own visibility and auth, and cache headers.
5. **Book playback.** It plays the chapters in order in the reader's language variant, and keeps going from one chapter to the next with the screen locked.
6. **The web player**, built to the signed canvas. It includes Media Session lock-screen controls and metadata, and a resume position.
7. **Writers make alt text read aloud well.** This covers the explain skill's alt rules (`plugin/skills/explain/SKILL.md`, the figure, figure-row, diagram, svg and formula passages), the critic's check (`plugin/agents/explain-critic.md`) and a plugin release. This is the operator's "for later documents, maybe ready for the alt text".
8. **The deployment.** It adds the env keys, the box disk budget and the operations doc's phone listening check (and, if the Mac runs the voice, how the Mac runner is started and kept on).
9. **D1's one job**, critique level `critic`, a connected group of several surfaces:
   - the Listen control on a document, on a chapter (book playback from here onward) and on the book landing (the whole book, or resume);
   - the player, docked and opened;
   - its states: preparing or generating, playing, paused, moving between chapters, finished, failed or out of quota, and offline;
   - speed, and skipping back and forward;
   - how it sits with the hiding top bar, the chapter bottom nav and P36-1s's planned panel or drawer;
   - a "follow along" highlight of the block being read, as a candidate the design may take or drop;
   - phone and desktop.

   The lock screen is drawn by the OS, so it is not a canvas surface; it is build item 6.

**Every server file ships in the plugin template.** `plugin/templates/manifest.json` declares `shipped_dirs` `server` and `tests` whole, and `scripts/plugin_parity.py` (CI) fails on any file in one tree but not the other. `server/main.py`, `server/config.py`, `server/documents_api.py` and `server/publish.py` are all byte-`identical` entries, and the template ships no `web/`. So every backend build slice either mirrors its server files into `plugin/templates/kb/`, or keeps them `root_only` without a shipped file importing them. DECOMP2 settles which, once, from S1's choice.

## Pins for the first wave (R1, R2)

- **The two excerpts are one source.** Before the wave starts, the orchestrator writes the English and the Korean excerpt (about 30–45 s of speech each, each including one alt-text passage, from the operator's own documents) once to `.cache/p41-voices/excerpts/`. That folder is outside every slice's set and read-only to all of them. R1's and R2's `plan.md` name only its path and the source document and block ids, **never the text**: `plan.md` is committed and the repo is public. The local `data/kb.sqlite3` is a disposable dev copy (70 documents, `lang` unset), so it may not hold a suitable source.
- **One manifest shape**, so the samples page reads both `.cache/p41-voices/apis/manifest.json` and `.cache/p41-voices/models/manifest.json`. One entry per candidate and language: `id`, `name`, `kind` (`api` or `model`), `runner` (`api`, `box`, `mac` or `neither`), `official`, `lang`, `voice`, `file` (the audio, relative to the manifest), `seconds`, `terms` (the data-use terms in one line, with the link), `billing` (what the free tier needs), `licence` (models), `notes`.
- **Keys.** There is no `.env` at the repo root today, so R1's one `needs_operator` stop is expected. It lists every sign-up step for the shortlisted keys at once.

## P41-sr.R1 — free voice APIs: terms, Korean, samples

- **Goal.** Survey the free TTS APIs as of 2026-11, the latest and the trending.
  - Start with the intake list in `intent.md` *Notes*: Gemini API TTS free tier, edge-tts, Fish Audio, Google Cloud TTS, Azure F0 and Cloudflare Workers AI. Add what is new, for example Groq and Hugging Face inference.
  - For each API, record whether a card or billing is needed; its quota and rate limits; its **data-use terms**; its English and Korean voices; its input limit per request; and whether it is official.
  - Do the book math for 130k and 300k characters under each API's limits.
  - Make a sample from every candidate usable at zero cost, from the two shared excerpts. Keys come only from the repo's gitignored `.env`, and only from accounts with no billing.
  - On a missing key, return `needs_operator` **once**, listing each sign-up step.
- **Set:** `.cache/p41-voices/apis/` (the samples, `manifest.json`, any scratch venv), `works/phases/active/P41-sr/topics/voice-apis.md`, `works/phases/active/P41-sr/slices/P41-sr.R1/`.
- **Risk:** `high`, by kind (`research`).
- **spends money:** no (free tiers only; never a key on a billing-enabled project).
- **Depends on:** none (declared; first wave).
- **Doc impact owed:** none; it is findings only.

## P41-sr.R2 — free voice models: run them, Korean, the box

- **Goal.** Survey the open TTS models, the latest, trending and light ones. Start from Supertonic 3 and Kokoro 82M in `intent.md`, then add what is current.
  - Filter on Korean support, licence (personal use), size, and CPU speed and memory.
  - Run the viable ones on the Mac in a scratch venv under `.cache/`, and make the same two excerpts.
  - Measure the real-time factor and peak memory.
  - Judge feasibility on the shared Oracle ARM box. Its shape is not stated, so record an OQ and project from the Mac. Never SSH to the box.
  - **The Mac as a runner (operator addition).** Also judge models that would run on this Mac as the voice runner: Apple Silicon CPU, and its GPU through MLX or MPS. Heavier, higher-quality open models are in scope for the Mac, as a fallback runner. Record each model's realistic runner: box, Mac or neither.
  - Weights download into the gitignored `.cache/` (or the user-level model cache), never into the tree.
- **Set:** `.cache/p41-voices/models/` (the samples and `manifest.json`), `.cache/p41-voices/venv*/`, `works/phases/active/P41-sr/topics/voice-models.md`, `works/phases/active/P41-sr/slices/P41-sr.R2/`.
- **Risk:** `high`, by kind (`research`).
- **spends money:** no (open weights, run locally).
- **Depends on:** none (declared; first wave).
- **Doc impact owed:** none; it is findings only.

## P41-sr.R3 — phone playback with the screen off

- **Goal.** Establish how the web reader keeps playing on iPhone Safari and Chrome, and on Android Chrome, with the screen locked. Cover:
  - the `<audio>` element's background rules;
  - Media Session;
  - **continuing chapter to chapter while locked**;
  - one file per chapter, segments or streaming;
  - the Range requirement, checked against the current serving chain (FastAPI `server/documents_api.py:716-735`, the BFF's `arrayBuffer()` relay, nginx, Cloudflare);
  - generating ahead versus on demand;
  - caching by document version, and box storage;
  - **the Mac as an off-box runner (operator addition):** it generates audio and uploads it to the box, which then serves it. Cover what that implies (the Mac must be on, a job waits until it is, and it pushes through the API) beside the box-runner path;
  - the alternative of **a private podcast feed** for a book, with its tradeoffs.
- **Output.** State which reader states the design must draw. A throwaway test page under `.cache/` is allowed; product code is not.
- **Set:** `.cache/p41-playback/`, `works/phases/active/P41-sr/topics/phone-playback.md`, `works/phases/active/P41-sr/slices/P41-sr.R3/`.
- **Risk:** `high`, by kind (`research`).
- **spends money:** no.
- **Depends on:** none (declared; first wave).
- **Doc impact owed:** none; it is findings only.

## P41-sr.S1 — the spoken script: what Listen reads

- **Goal.** A server-side function that turns a native document's tree into ordered spoken segments. Each segment carries its block id, kind, language and text.
  - **It reads:** headings and prose, lists, callouts and blockquotes; the figure's `alt` (and its caption); figure-row items (`alt`, svg `label`, card `title`); the diagram `title`; the svg `label`; and the formula `alt` and `reading` (and `where[].means`).
  - **It skips:** quiz, code, sources and hr. S1's own plan pins tables and the glossary.
  - It reuses `server/native/parse.py` and `project.py:inline_text`. `search_text` (`project.py:102`) does not fit: it keeps quizzes, source titles and the glossary.
  - It adds one tiny core test.
  - **The mirror check is already answered** (this DECOMP looked): every new file under `server/` or `tests/` ships, not only `server/native/`, so moving the module out of `server/native/` does not escape the mirror (see *Build inventory*). S1's plan picks: mirror the module, its test and its fixture byte-identically into `plugin/templates/kb/` with `identical` entries, or list them `root_only` (the precedent: `tests/test_migrate_books.py`, `tests/fixtures/book`). Validation includes `python3 scripts/plugin_parity.py`.
- **Set:** the new module, its test, one fixture under `tests/fixtures/`, their `plugin/templates/kb/` copies if mirrored, `plugin/templates/manifest.json`, `works/phases/active/P41-sr/slices/P41-sr.S1/`.
- **Risk:** `low` (the mid row). The approach is pinned and no trigger applies.
- **spends money:** no.
- **Depends on:** none (declared; first wave).
- **Doc impact owed:** likely `backend.md`: the spoken-script module and its read and skip rules (S1 confirms).

## P41-sr.D1 — Listen design: the control and the player

- **Goal.** One job, **one round**, critique `critic` (build inventory item 9). The job number is the next free one on main, `11-…` (main has `01-`…`10-reading-aids`). **The P36-1s collision:** P36-1s's breakdown plans four jobs numbered "`10-`…`12-` today" by `design-open`, which already collide with main's `10-reading-aids` and will collide with this `11-`. Flag it in D1's result; neither phase renumbers the other's job.
- **The handoff draws on** R1–R3's findings (latency and states) and S1's read and skip rules. The voice pick rides in the same round stop (*Passes*).
- **Set:** `docs/reference/design/jobs/11-…/`, `works/phases/active/P41-sr/slices/P41-sr.D1/`, and the notebook.
- **Risk:** `high`, by kind (`co-work`). A barrier: undeclared, runs alone.
- **spends money:** no.
- **Depends on:** undeclared (a barrier after the first wave).
- **Doc impact owed:** none; the design record is its own artifact.

## P41-sr.DECOMP2 — the build cut

- **Goal.** Cut the build from D1's signed round, the inventory above and R1–R3's findings: backend first, then the player, then the writer guidance and release. Settle the runner (box or Mac) from the pick, and the template question for the backend's server files (*Build inventory*). Re-check P36-1s's branch before the build.
- **Set:** `works/phases/active/P41-sr/**` (new slice folders, this file, the notebook).
- **Risk:** `high`, by kind (`decomposition`). A barrier: undeclared, runs alone.
- **spends money:** no; its build slices each get their own line.
- **Depends on:** undeclared (a barrier after D1).
- **Doc impact owed:** none itself. The build will owe `product.md`, `experience.md`, `frontend.md`, `backend.md`, `api.md`, `data.md`, `security.md`, `operations.md`, `decisions.md` (the pick and the runner) and `qa.md`.

## P41-sr.REVIEW — phase review

- **Gated** (`--require`). Screen-off playback on a real iPhone is the operator's check at the acceptance walkthrough; no agent instrument stands in for it.
- **spends money:** no.
