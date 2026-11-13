# P41-sr.DECOMP — plan (decomposition, high row)

## Context

The operator wants a **Listen** control in the knowledge web reader that reads a document, or a whole
book chapter after chapter, aloud with a **free** voice. They listen on their **iPhone with the screen
off**, in **English and Korean**. Listen skips quizzes, code and source lists, and reads a visual's text
alternative instead of skipping it. The operator **chooses the voice by ear** from samples made from
their own documents. Free APIs count as well as free models: "latest, trending, and light". Nothing may
cost money. `intent.md` is the record.

The phase style is `build-after`, `Mockup: on request`. This DECOMP therefore cuts only what is knowable
before the design gate: research, groundwork, one design slice, and `DECOMP2`. It cuts **no build
slices**.

**What the planning survey found.** These are facts the breakdown must carry. Line numbers are as of
`b668d582`.

- **No audio code exists anywhere.** Nothing in `web/src` or `server/` uses `Audio`, Media Session, a
  service worker or TTS. The only outbound vendor client is Gemini embeddings (`google-genai==1.72.0`,
  `server/embeddings.py`). Its key is `GOOGLE_API_KEY`/`GEMINI_API_KEY` (`server/config.py:179-185`),
  set on the box for search.
- **Reader surfaces.**
  - The reader top bar is `header.rd-top` (`web/src/components/reader/reader-frame.tsx:536-589`). Its
    actions are in `.rd-top__end`, it hides on scroll, and its labels are in
    `web/src/content/reader.ts:180-191`.
  - Book chapters also have a bottom nav (prev / Contents / next, `reader-frame.tsx:621-702`).
  - The book landing is `web/src/components/book/book-page.tsx` + `book-top.tsx`.
- **Text model.**
  - The native tree lives in `server/native/{schema,parse,project}.py`.
  - The existing flattener is `search_text` (`server/native/project.py:102`). It includes quizzes,
    source titles and the glossary, which Listen must skip. `sections` drops typed blocks entirely.
    Neither fits as-is.
  - Text alternatives on the tree:
    - figure: `alt`;
    - figure-row items: `alt`, svg `label`, card `title`;
    - diagram: `title`;
    - svg: `label`;
    - formula: `alt`, `reading`, and `where[].means`.
- **Language.**
  - A chapter's language is its variant's `lang`.
  - A loose document has `documents.lang`, but the web guesses it (`guessLang`, Hangul ≥ 20%,
    `web/src/lib/reader/load.ts:143-147`).
- **Books.** The order is `position, key` (`server/books.py:177-179`). Each chapter body is one
  `GET /app/documents/{id}`. There is no bulk endpoint.
- **Runtime.**
  - The operator reaches the reader from the phone **only** through production,
    `https://knowledge.hi2vi.com`. The path is Cloudflare, then the edge nginx, then the `knowledge-web`
    container (Next 16 standalone, BFF), then FastAPI `knowledge-api`, a single uvicorn worker.
  - The box is a **shared Oracle ARM box**. Its CPU and RAM are not recorded anywhere.
  - Asset bytes live on the box disk under `.assets/`, which is gitignored. The asset route reads the
    whole file into memory with no HTTP Range (`server/documents_api.py:716-735`), and the BFF relays it
    via `arrayBuffer()`. **iOS media playback needs Range support.**
  - The background work is one in-process daemon thread (`server/publish.py`).
- **The repo is public.** Samples made from private documents, and any audio, must live only in
  gitignored paths (`.cache/`, `/data/`, `.env`).
- **Operator Runtime** (operations.md):
  - devices are the iPhone (Safari and Chrome), the iPad and Mac Chrome;
  - the browser instrument is Claude in Chrome;
  - **the operator accepts on production**;
  - no agent instrument stands in for a real iPhone, so screen-off playback is the operator's check at
    acceptance.
- **Overlap with P36-1s (Hermes, on its own branch).**
  - Its D1 has not started. It plans a side panel beside the reader column on desktop, a drawer on
    phone and tablet, and an "Ask Hermes" action in `annotations.tsx`.
  - Its job numbers on the branch (`10-`…`12-`) already collide with main's `10-reading-aids`.
  - Listen's player must coexist with that panel or drawer and with the chapter bottom nav.

## What this slice does

You are the `P41-sr.DECOMP` executor. Create the slices below with `new-slice`, as bare folders, never
writing any slice's `plan.md`. Write `topics/breakdown.md` and update the notebook. Then return the
verdict. Don't run `accept-gate`, don't commit, and don't touch product code.

### 1. Cut these slices (`python3 scripts/workflow.py new-slice --phase P41-sr …`)

**A first wave of four, all `--depends-on none`, with disjoint sets:**

| id | `--kind` | `--risk` | `--order` | name |
|---|---|---|---|---|
| `R1` | research | high | 10 | free voice APIs: terms, Korean, samples |
| `R2` | research | high | 20 | free voice models: run them, Korean, the box |
| `R3` | research | high | 30 | phone playback with the screen off |
| `S1` | implementation | low | 40 | the spoken script: what Listen reads |

**Then the barriers, which are undeclared and run alone:**

| id | `--kind` | `--risk` | `--order` | name |
|---|---|---|---|---|
| `D1` | co-work | high | 50 | Listen design: the control and the player |
| `DECOMP2` | decomposition | high | 60 | the build cut |

`REVIEW` already exists at order 9999.

### 2. Write `works/phases/active/P41-sr/topics/breakdown.md`

Follow P39-hk's format: `## Passes`, `## Estimate`, `## Join-rebuilt artifact`, `## Build inventory`,
then one `## P41-sr.<id> — <name>` block per slice. Each block has these labelled bullets: **Goal**,
**Set**, **Risk** (with its trigger), **spends money**, **Depends on**, **Doc impact owed** (when any).

**Passes.** Write the DECOMP line: style `build-after`, research first (three research slices beside
the S1 groundwork), one design slice, then `DECOMP2`, and no build slice before the signature. Name the
voice-pick route below.

**Estimate.** Base it on `python3 scripts/workflow.py dispatch-summary`'s `means`: the span-minutes by
route and by kind, the main thread included. Never use a session-$ figure or `tokens`.
- Give a per-slice table for R1–R3, S1, D1 (frame, pages, join and critics from the design rows),
  DECOMP2 and REVIEW.
- Give a rough band for the build that DECOMP2 will cut, about 4–6 slices.
- Give the wall clock: the first wave runs at once.
- **Spend:** no slice spends money. State why for R1: free tiers only, never a key on a billing-enabled
  project.

**Join-rebuilt artifact.** None. No slice in this pass touches a lockfile or a bundle. R2's scratch
venv lives under `.cache/`, never in `uv.lock` or `pyproject.toml`.

**Build inventory** (what, not how, one line each; DECOMP2 cuts from it):

1. **The spoken script.** This is S1, the groundwork. It turns a document into ordered spoken segments
   and applies the read and skip rules.
2. **The voice engine** for the operator's pick, English and Korean, which may be two engines. It covers
   text normalisation, chunking to the engine's limits, and keys only in env.
3. **Audio generation and its cache.** Generation runs in the background on the box. Audio is stored on
   the box disk, gitignored like `.assets/`, and keyed by document version, voice and language. The item
   also covers quota and failure handling, and how much disk it uses.
4. **Audio delivery** across the API, the BFF and the edge. It needs **HTTP Range**, the document's own
   visibility and auth, and cache headers.
5. **Book playback.** It plays the chapters in order in the reader's language variant, and keeps going
   from one chapter to the next with the screen locked.
6. **The web player.** It is built to the signed canvas. It includes Media Session lock-screen controls
   and metadata, and a resume position.
7. **Writers make alt text read aloud well.** This covers the explain skill's alt rules
   (`plugin/skills/explain/SKILL.md`, the figure, figure-row, diagram, svg and formula passages), the
   critic's check (`plugin/agents/explain-critic.md`) and a plugin release. This is the operator's "for
   later documents, maybe ready for the alt text".
8. **The deployment.** It adds the env keys, the box disk budget and the operations doc's phone
   listening check.
9. **D1's one job.** It has critique level `critic`, a connected group of several surfaces. The job
   covers:
   - the Listen control on a document, on a chapter (book playback from here onward) and on the book
     landing (the whole book, or resume);
   - the player, docked and opened;
   - its states: preparing or generating, playing, paused, moving between chapters, finished, failed or
     out of quota, and offline;
   - speed, and skipping back and forward;
   - how it sits with the hiding top bar, the chapter bottom nav and P36-1s's planned panel or drawer;
   - a "follow along" highlight of the block being read, as a candidate the design may take or drop;
   - phone and desktop.

   The lock screen is drawn by the OS, so it is not a canvas surface; it is build item 6.

**The slice blocks.** Goals and sets:

- **R1. Free voice APIs.**
  - **Goal.** Survey the free TTS APIs as of 2026-11, the latest and the trending.
    - **Start with** the intake list in `intent.md` *Notes*: Gemini API TTS free tier, edge-tts, Fish
      Audio, Google Cloud TTS, Azure F0 and Cloudflare Workers AI. Add what is new, for example Groq
      and Hugging Face inference.
    - **For each API, record:** whether a card or billing is needed; its quota and rate limits; its
      **data-use terms**; its English and Korean voices; its input limit per request; and whether it is
      official.
    - **Do the book math** for 130k and 300k characters under each API's limits.
    - **Make the samples.** Use the same two excerpts (one English, one Korean, about 30–45 s each,
      including one alt-text passage). Make a sample from every candidate usable at zero cost. Keys come
      only from the repo's gitignored `.env`, and only from accounts with no billing.
    - **On a missing key.** If a shortlisted API has no key, return `needs_operator` **once**, listing
      each sign-up step.
  - **Set:** `.cache/p41-voices/apis/` (the samples and `manifest.json`), `topics/voice-apis.md`, its
    slice folder.
- **R2. Free voice models.**
  - **Goal.** Survey the open TTS models, the latest, trending and light ones. Start from Supertonic 3
    and Kokoro 82M in `intent.md`, then add what is current.
    - **Filter** on Korean support, licence (personal use), size, and **CPU** speed and memory.
    - **Run** the viable ones on the Mac's CPU in a scratch venv under `.cache/`, and make the same two
      excerpts.
    - **Measure** the real-time factor and peak memory.
    - **Judge feasibility on the shared Oracle ARM box.** Use its shape if the operator stated it;
      otherwise record an OQ and project from the Mac. Never SSH to the box.
  - **Set:** `.cache/p41-voices/models/`, `.cache/p41-voices/venv*/`, `topics/voice-models.md`, its
    slice folder.
- **R3. Phone playback with the screen off.**
  - **Goal.** Establish how the web reader keeps playing on iPhone Safari and Chrome, and on Android
    Chrome, with the screen locked. Cover:
    - the `<audio>` element's background rules;
    - Media Session;
    - **continuing chapter to chapter while locked**;
    - one file per chapter, segments or streaming;
    - the Range requirement, checked against the current serving chain (FastAPI, the BFF `arrayBuffer`
      relay, nginx, Cloudflare);
    - generating ahead versus on demand;
    - caching by document version and box storage;
    - the alternative of **a private podcast feed** for a book, with its tradeoffs.
  - **Output.** State which reader states the design must draw. A throwaway test page under `.cache/` is
    allowed; product code is not.
  - **Set:** `.cache/p41-playback/`, `topics/phone-playback.md`, its slice folder.
- **S1. The spoken script.**
  - **Goal.** A server-side function that turns a native document's tree into ordered spoken segments.
    Each segment carries its block id, kind, language and text.
    - **It reads:** headings and prose, lists, callouts and blockquotes; the figure's `alt` (and its
      caption); figure-row items; the diagram `title`; the svg `label`; and the formula `alt` and
      `reading`.
    - **It skips:** quiz, code, sources and hr. S1's own plan pins tables and the glossary.
    - **It reuses** `server/native/parse.py` and `project.py:inline_text`.
    - **It adds** one tiny core test.
    - **Mirror check.** Check whether `server/native/` files must be mirrored into
      `plugin/templates/kb/` (the P39-hk "four places" rule). If they must, put the module outside
      `server/native/`.
  - **Set:** the new module, its test, and one fixture under `tests/fixtures/`.
  - **Risk:** `low`. The approach is pinned and no trigger applies.
- **D1.** A co-work barrier.
  - **Goal.** One job, **one round**, critique `critic`. The job number is the next free one on main
    (`11-…`); flag the P36-1s numbering collision.
  - **The handoff draws on** R1–R3's findings (latency and states) and S1's read and skip rules.
- **DECOMP2.** A decomposition barrier. It cuts the build from D1's signed round, the inventory above,
  and R1–R3. The order is backend first, then the player, then the writer guidance and release.
- **spends money:** `no` on every slice.

### 3. The notebook (through `phase-section` only)

- **`## Decisions`.** Append one gist line, `Breakdown (DECOMP): …`, that links `topics/breakdown.md`.
  Append one line for **the voice-pick route**:
  - after the first wave drains, the orchestrator publishes a private samples page from `.cache/p41-voices/*/manifest.json`, with each candidate's terms beside its audio;
  - the pick is one decision in **D1's round stop**, with a recommendation, so the operator listens and
    signs in one sitting;
  - DECOMP2 builds on the pick.
- **`## Notes for later slices`.** Each note is tagged `**(from P41-sr.DECOMP, for …)**`:
  - **For everyone.** The public repo means audio and private excerpts stay in `.cache/` or `/data/`
    and are never committed.
  - **For R3 and DECOMP2.** The asset route has no Range support.
  - **For D1 and DECOMP2.** P36-1s's panel and drawer, and its job-number collision. Re-check its
    branch before the build.
  - **For R2 and DECOMP2.** The box's CPU and RAM are unknown.
  - **For REVIEW.** Screen-off playback on a real iPhone is the operator's check at the acceptance
    gate.
- **`## Now`.** Rewrite it: what was cut, that the first wave runs next, and that nothing is open.
- **`## Doc impact`.** Nothing: this slice changes no durable truth.

### 4. Validate and return

1. Run `python3 scripts/workflow.py validate` and `python3 scripts/workflow.py parallel-plan P41-sr`.
   The expected plan is `DECOMP -> R1 + R2 + R3 + S1 -> D1 -> DECOMP2 -> REVIEW`.
2. Write `result.md` with the verdict block first.
3. Return the structured verdict with its `parallel:` line.

Don't run `finish-slice` or `accept-gate`. The orchestrator finishes the slice and declares
`accept-gate P41-sr --require`: the phase changes what the operator sees and hears.

## Verification

- Expect `validate` to report clean, and every middle slice except D1 and DECOMP2 to be declared.
- Expect `parallel-plan` to print the four-wide first round.
- `topics/breakdown.md` holds all its sections, and each block has its set and a `spends money:` line.
- `phase-section P41-sr` stays within its budget.
- No `plan.md` exists in any new slice folder, and `git status` shows no product file changed.

## For the operator, at this gate (the executor ignores this section)

**Decided as drawn:**

- three research slices run beside the spoken-script groundwork;
- the design is one round at critique level `critic`;
- the samples live in `.cache/` and are never committed;
- the acceptance gate is required, because you check screen-off listening on your iPhone;
- nothing spends money.

**Decisions for you (at most three):**

1. **Where you pick the voice.** I recommend folding it into the design round's stop: one private page
   of English and Korean samples, with the terms beside each, published next to the canvas. You listen
   and sign once. The alternative is a separate stop right after research.
2. **Keys for free APIs.** Sampling the free APIs needs free keys, for example a Google AI Studio key
   for Gemini TTS, **on a project with billing off**. If you want, add `GEMINI_API_KEY=…` to the repo's
   `.env` (gitignored) now. Otherwise R1 stops once and lists exactly which sign-ups it needs. Should the
   production `GOOGLE_API_KEY` (used for search) count as free tier? Say so only if its project has no
   billing.
3. **The Oracle box's shape** (OCPU and RAM). It decides whether a local model can run there. If you
   know it, say it; otherwise R2 projects from the Mac and asks.

## Operator answers at the gate

The operator approved this plan without answering the three decisions above, so the recommendations stand:
1. The voice pick folds into D1's round stop.
2. No key was added, so R1 stops `needs_operator` once for any shortlisted key it lacks.
3. The box's shape is not stated, so R2 projects from the Mac and records an OQ.

## Dispatch

route=high
reason=kind decomposition
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh

## Operator addition during the run

The operator wrote this while the executor ran (2026-11-11): "I'm also thinking this mac as voice model
runner. if no good from the research, consider that as well,." The orchestrator relayed it to the
executor through SendMessage, and it is now recorded in `intent.md` under *Scope Added at Execution* A:

- R2 also judges models runnable on this Mac (CPU, and the GPU through MLX or MPS);
- R3 also covers the Mac as an off-box runner that uploads audio to the box;
- the build inventory leaves the runner open until the voice pick.
