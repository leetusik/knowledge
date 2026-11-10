# Intent — P41-sr

- Captured at: 2026-11-10T20:54:40+09:00
- Origin: operator

## Original Input (verbatim)

The operator's request (`/create-phase`, one request for three things; this phase is item 3):

> for three things:
> ---
> 1. recently, arb_upbit_1 and Note(the english) created books using knowledge:explain skill. both got no enough phase, so had to research first. but upbit created own research phase, (the arb_upbit_1 is still processing). I can't tell which is better but the two's process too different and in this way I can assure the quality. you study two cases, and suggest best way of doing that.
> 2. the books, I thought the book's chapters got it's own page and quiz. but now I can see they are just one long page. I would like to break it.
> 3. I need a AI voice reader. so that I can read a document or book at once. quiz skip.

Sent while the first look was running:

> for voice reader, find free option on the internet. I heard there are services that offer AI voice for free.

The operator's reply to the study, the suggestions and the five questions:

> 1. yes
> 2. leave it, it's fine.
> 3. should able to listen on my phone with screen off. yes, but for later documents, maybe ready for the alt text so that reader can read it instead.
> 4. ok
> 5. whatever.
> and for the voice option. I'm not only looking for free model but free api. I heard that exists. and for the models, try latest, trending, and light models.

## Confirmed Intent (refined + clarified)

The operator wants an **AI voice reader** in the knowledge web reader, so they can listen to a
document, or a whole book, in one go.

- **A Listen control** on a document and on a book: a document plays from start to end; a book plays
  chapter after chapter.
- **On the phone, with the screen off.** Listening keeps going with the phone locked.
- **English and Korean**: the knowledge base holds documents in both.
- **What it skips:** quizzes, and also code, source lists and visuals with nothing to say aloud.
- **Alt text, read aloud.** When a visual (a figure, a diagram, a formula) has a text alternative,
  the reader reads that instead of skipping it. For later documents, the writers get the alt text
  ready so that it reads well aloud (the operator: "for later documents, maybe ready for the alt
  text so that reader can read it instead").
- **The voice is free.** Free **APIs** count as well as free models (the operator: "I'm not only
  looking for free model but free api"). Among models, try the latest, the trending and the light
  ones. The operator chooses the voice **by ear**, from short samples made from their own documents
  in English and Korean. Nothing that costs money, and no account whose billing could charge.
- **Design:** the Listen control and the player are new visible surfaces, so they are designed first
  and signed by the operator on the design canvas before they are built.

## Clarifications Resolved

- Q: Where will you listen: at the desk with the page open, or on the phone with the screen off? —
  A: "should able to listen on my phone with screen off."
- Q: Besides quizzes, skip code, diagrams and source lists? — A: "yes, but for later documents, maybe
  ready for the alt text so that reader can read it instead."
- Q: Free voice options? — A: "for voice reader, find free option on the internet. I heard there are
  services that offer AI voice for free." Then: "I'm not only looking for free model but free api. I
  heard that exists. and for the models, try latest, trending, and light models."
- Q: Design style build-after, signing on the canvas? — A: "ok".
- Q: The proposed names and objectives? — A: "whatever" (accepted as proposed).

## Scope Added at Execution

A. The operator, during `P41-sr.DECOMP` (2026-11-11):

> I'm also thinking this mac as voice model runner. if no good from the research, consider that as well,.

Read as follows (relayed to the DECOMP executor and recorded in the breakdown):

- **This Mac is a fallback voice runner.** Besides the free APIs and the models the shared Oracle box
  could run, the research also judges models that would run on this Mac, on its CPU and, through MLX
  or MPS, its GPU. Heavier, higher-quality models therefore count too.
- **The Mac generates, the box serves.** In that path the Mac generates the audio and uploads it to the
  box, which serves it to the phone.
- **The box comes first**; the Mac is used "if no good from the research".

## Design Style

build-after — one small surface (a Listen control and a player); one design round lands before the build, and the build fits in this phase.
Mockup: on request

## Notes

- Candidates found at intake (2026-11-10, web search, all still to be verified):
  - free APIs: the Gemini API's TTS models on the free tier (an AI Studio key, no card per
    third-party sources; sources conflict on whether the newest TTS models are free; free-tier inputs
    may be used by Google to improve its products); Fish Audio S2.1 Pro (announced free under fair
    use, extended to 2026-08-31, current status unknown); Google Cloud TTS (1M Chirp 3 HD
    characters a month free, but billing must be on and it charges past that); Azure Speech F0
    (500k neural characters a month); Cloudflare Workers AI (not checked); edge-tts (Edge's Read
    Aloud endpoint, unofficial).
  - free models: Supertonic 3 (Supertone, ~99M, ONNX, English and Korean officially); Kokoro 82M
    (Apache 2.0, Korean not confirmed). The browser's built-in voices stop when the screen locks.
- The documents are private. A free API's terms may let the provider use the text sent to it, so
  the comparison states each candidate's data-use terms beside its sample.
- Sizes: the English textbook (Note, doc 73) is ~130k characters; a book is ~130k–300k.
- Native blocks already carry text alternatives: a figure's `alt` (required), a figure row's item
  `alt`, a diagram's `title`, an SVG's title, a formula's `alt` and `reading`
  (`server/native/schema.py`).
- P36-1s (a chat agent beside the reader) runs on its own branch and also changes the reader;
  check the overlap before building.
