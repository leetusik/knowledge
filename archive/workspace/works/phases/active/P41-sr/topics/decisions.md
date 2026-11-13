# P41-sr — decisions

_Entries moved here from phase.md by `phase-section --to-topic`, byte for byte, one `## ` block each; the pointer line left in each one's place names its block._

## Decisions 4

- Spoken script: `server/spoken.py` `spoken_script(tree, lang=, title=)` → `[{section, block, kind, lang, text}]`.
  - **Read:** title, summary, headings, paragraphs, each list item, quote and callout paragraphs (callout
    title first), table body rows as "header: cell; …" (kind `table-row`, so the player can skip them),
    a figure, figures, diagram or svg's alt, label or title then its caption, and a formula's alt,
    reading and "sym: means".
  - **Skipped:** code, hr, quiz, sources, glossary.
  - **Inline:** math becomes linear text; an inline image reads its alt (P41-sr.S1).

## Decisions 6

- **Listen design signed (P41-sr.D1, 2026-11-11, "accept for the design."):** job `11-listen`, round `01-listen`, as drawn. The book landing, the reader and the player share one docked player; the opened player is the reader's sheet. Listen sits under the title, with a bottom pill while reading, never in the top bar. A chapter's Listen plays the book from that chapter on. Tables are read. Follow along is on by default. There is no Prepare button, no voice picker and no podcast feed. Build from `result.md` `## Build` and `frame.md` F1–F33 → [jobs/11-listen/rounds/01-listen/](../../../docs/reference/design/jobs/11-listen/rounds/01-listen/)

## Decisions 8

- **Voice (operator delegated, 2026-11-11):** "I'm not sure. you pick based on reputaion. and capability. only one model for now, various model selection defer."; then "go".
  - **The pick:** **Ming-3.0 0.5B, voice US_Emma, for English and Korean, on this Mac** (MLX via mlx-audio, MIT).
  - **Why:** arena Elo 1185, the best heard; Whisper CER 0.022 in English and 0.18 Hangul-only in Korean; RTF 0.42, so it plays while making; 4.4 GB.
  - **The cost:** Korean in an English voice. Korean text is pre-split by sentence.
  - **The Mac is the voice runner:** it polls for Listen jobs, renders them and uploads the audio, and jobs wait while the Mac is off.
  - **Other models:** deferred, D104-vm.
  - → `topics/voice-models.md` § Recommendation
