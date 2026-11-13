# P39-hk.F4 — the Glossary in the contents, linear text for math on text-only surfaces, D80-ch's line

## Context

The operator answered the review's follow-ups with "fix everything now." (`intent.md` § *Added at review (2026-11-05)*). F4 closes the last three items on that list:

- **OQ16 (S9).** The chapter's "In this chapter" list and the Contents panel don't list the generated "Glossary" h2. They list the author's headings, and the record never drew contents with a glossary. The recommendation was to list it, since a reader looks there for it.
- **OQ10 (S8).** Inline math in a heading or a highlight shows its raw TeX on text-only surfaces the canvas never drew:
  - the Contents sheet;
  - library Continue;
  - the place names in notes;
  - a citation's way back;
  - the Review highlight card's quote.

  The recommendation was "the same plain linear text there". That is the text S8 already shows on a quiz Review card (`linearTex`, OQ9).
- **D80-ch (a deferred item, now ready).** The KB template page `plugin/templates/kb/docs/getting-started/{{KB_DATE}}-how-your-knowledge-base-works.md` L40 still says "If the API is down, an explainer can still be written straight to a file." The skill has no file fallback: `plugin/skills/explain/SKILL.md` §6 "When the API is unreachable" says "there is **no file fallback**", and §7 "No copy in the project".

**Why risk high** (bumped at planning from `low`). The display text sits beside two core invariants it must not move:
- the annotation projection, which counts inline math's TeX verbatim (`web/src/lib/native/project.ts` `inlineText`, `web/src/lib/reader/anchor.ts`, `tests/reader-anchor.test.ts`);
- the heading ids, `headingSlug(plainText(content))` (`web/src/lib/native/parse.ts` L668).

It also reaches six surfaces across the reader, the library, notes and Review: a wide blast radius.

## Where each surface gets its text (an Explore brief; verify each line, they may be off)

- **Toc and Contents.** `lib/reader/load.ts` `headingsOf` (L186–202, server-only) takes the top-level `heading` blocks at level 2 or 3. Its text is `plainText(block.content)`. From there:
  - `chapter-head.tsx`'s `Toc` (L106–161, server) draws "In this chapter", shown at 2 or more h2s;
  - `reader-frame.tsx` (client) passes the h2s (`secs`, L388) to `ChapterList` for the Contents sheet (L790–801);
  - `curH2` (L389–396) returns null for an id that is not in `headings`.

  The glossary h2 is drawn by `render.tsx` `glossary(id)` (L1219–1231) with the glossary *block's* id (`glossary-<n>` or the author's `#id`), text `CHAPTER.terms.glossary`, `lang={chromeLang}`, at the block's own place in the order.
- **Library Continue.** `lib/library/continue.ts` (server-only). `sectionTitle` (L76–84) takes the nearest top-level heading at or before the anchor block, through `plainText`, and `continue-reading.tsx` `Place` draws it.
- **Notes place names.** `lib/reader/notes-load.ts` (server-only) `nameOf` (L82–121): a heading is `plainText(content).trim()` (L89), and the sources' heading is at L129. The client `sectionLabel` (`annotations.tsx` L1019–1026) builds "{word} · {title}". `snapshotOf` stores that label as `block_title` at save time (L1028–1035, L1075).
- **A highlight's quote in the reader.** Notes rows and popovers show `quote.exact` (`note-list.ts` L115, `note-row.tsx` L75, `annotations.tsx` L2215–2217 and L2342). That is the stored projection slice, which holds the TeX verbatim.
- **A citation's way back.** `lib/native/cites.ts` `planCitations`: `section` is the nearest preceding h2's `plainText(...).trim()` (L86–88). It is used only in the back link's `aria-label` (`render.tsx` L1834 and L1854–1858).
- **The Review highlight card.** `front.quote` is the annotation's stored `quote.exact` (`server/review.py` about L556). `front.block_title` is the stored snapshot label. The web passes both through unchanged (`lib/review/actions.ts` `linearCard` skips non-quiz cards, L80; `components/review/card.tsx` `HighlightBody` L258–296). `server/review.py` L403–415 resolves the anchor (`block_id`, `start`/`end`) server-side.

## The rule (binding)

1. **OQ16: list the Glossary.** When a chapter has a glossary block that renders its h2, "In this chapter" and the Contents panel list it, at the block's place in the order.
   - Use the h2's exact id and text (`CHAPTER.terms.glossary`, in `chromeLang`).
   - It looks and behaves like every other h2 entry: the link, the current-section mark (`curH2`) and the sheet's tap-to-close.
   - It counts toward the Toc's 2-h2 threshold like any h2.
   - Nothing else about either list changes. Record that threshold choice in the Decisions entry.
2. **OQ10: linear text, display only.** Wherever one of the surfaces above shows text from inline nodes holding `math`, it shows `linearTex(tex)`, the text S8's Review quiz card shows, in place of the TeX.
   - A formula `linearTex` refuses (null), which publish never lets through, keeps its TeX.
   - **Never change** `plainText` (heading ids, `omitTitle`), `inlineText`, `project.ts`, `anchor.ts`, the stored anchors, the snapshot shape or any API payload.
   - Add one display flattener beside `linearTex`'s server-only world, for example a `displayText(nodes)` that walks like `plainText` but linearizes math, and use it in `headingsOf`, `sectionTitle`, `nameOf` and `planCitations`.
   - Check that every importer of the module you change stays server-side. `mathml.ts` is `server-only`, and a client import fails the build.
3. **OQ10, the quotes.** A highlight's stored quote is a plain projection slice, so the TeX inside it has no delimiters.
   - Rebuild a display quote only where it can be exact: from the block's inline nodes and the anchor's own start and end. Never search the string for TeX-like text: a one-letter formula "n" also matches the word "n".
   - In the reader, a client surface, the DOM already holds each math atom (`data-an-len`, its alttext), and the resolved highlight's range covers whole atoms (`atomLen`).
   - On the Review card, decide from what the web receives. If the card carries the block and the offsets, map them with the chapter's tree on the server (`loadReviewQueue` is `"use server"`), at most one document read per distinct document in the queue.
   - The card's `where` carries `block_id`, `doc` and `version`. Check whether the payload also carries the highlight's offsets (`server/review.py` builds an `anchor` with `start`/`end`, about L410–420).
   - If an exact mapping needs a change to the Python API or to the stored data, don't make it. Leave that surface's quote as stored and finish the rest of the slice. Append one Operator Questions entry: what a reader sees, the change it would take and its cost, recommended as a deferred job. Return `done`: the review round routes it, so no stop is needed for it.
4. **D80-ch.** Rewrite only that sentence of the template page so it is true of the skill:
   - no file fallback;
   - when the API is down, the publish fails and the draft is kept for a later publish (§6), with nothing written into the project (§7).

   Keep the paragraph's plain voice. Don't touch the page's other lines or the setup skill: D80-ch's setup-L49 half is moot (the review's disposition).

**RESPECT THE DESIGN.**
- The Glossary entry uses the lists' existing entry markup and style. It gets no new mark, icon or group.
- The linear text is S8's, as on the Review quiz card. It gets no new style and no MathML on these surfaces.
- A heading without math, and a quote without math, renders byte-identical to HEAD.

## Read first

- `phase-section P39-hk "Operator Questions"`, OQ9, OQ10 and OQ16, and `phase-section P39-hk Decisions`: S8's *Review card linear text* and S9's terms wiring, if present.
- `slices/P39-hk.S8/result.md` (OQ9, `linearTex`, *Stack as run*) and `slices/P39-hk.S9/result.md` (the glossary section, *Live sweep*).
- `slices/P39-hk.REVIEW/result.md` § *Deferred jobs* 5 and 8, and its D80-ch disposition.
- `docs/reference/design/jobs/10-reading-aids/rounds/01-reading-aids/frame.md`: F1 (the section is "**Glossary** (an h2, like 'Sources')") and F6 (its place).
- `.claude/skills/design-cowork/reference/build.md`.

## The work

1. **Reproduce** on HEAD's standalone build: a chapter with inline math in an h2 and in a highlight, and the glossary's absence from both lists.
   - The fixture `tests/fixtures/book/reading-aids.{en,ko}.md` may have no math in a heading. If so, publish a scratch chapter to **your own** scratch API, never `:8977`: a copy of the fixture with one h2 holding inline math, and a cite under it.
   - Record what each surface shows.
2. **OQ16** in `headingsOf` (and `reader-frame.tsx` only if `curH2` or the sheet needs it).
3. **OQ10's headings and names**: the display flattener, and its callers in `load.ts`, `continue.ts`, `notes-load.ts` and `cites.ts`.
4. **OQ10's quotes**: the reader's notes rows and popover, then the Review card, by rule 3.
5. **D80-ch**: the one sentence. Then `python3 scripts/plugin_parity.py`, and any template copy it checks.
6. **Tests: core only.**
   - Add one case: a heading with inline math gets the same id as before, and shows linear text in the headings list.
   - Add one case: the glossary is listed at its place.
   - `reader-anchor.test.ts` stays green and unchanged.

## The stack and the instrument (binding)

- **Servers.** Never touch or restart `:3030` / `:8766`. Never stop the review's walk stack: API `:8977` (PID 68284) and standalone `:3978` (PID 68294). Read from `:8977` only, and write nothing to it. For a scratch chapter or a signed-in check, stand up your own scratch DB, API and builds on free ports, as `slices/P39-hk.S8/result.md` § *Stack as run* does. Stop exactly the PIDs you start, and drop the DBs you create.
- **The browser.** Claude in Chrome. Call `list_connected_browsers`, then `select_browser` on deviceId `c14e5b18-f250-45f1-b92e-4a08a31197b5`, before any other browser tool. If it is missing, return `needs_operator`. Never use another browser.
  - A signed-in check uses a throwaway member on **your** scratch stack, made in this session. Seed it through the API over HTTP, as the review did, not by typing credentials into the browser.
  - Leave the profile as you found it, and close your tabs.
- **The sweep**, HEAD against yours, en and ko:
  - **OQ16:** "In this chapter" and the Contents sheet list "Glossary" at its place. The link lands on the h2. The current-section mark follows it on scroll. At 390 the sheet's tap closes the sheet.
  - **OQ10:** each surface shows the linear text, with ids unchanged, on these surfaces:
    - the Toc;
    - the Contents sheet;
    - library Continue;
    - a note's place name;
    - the highlight's quote in the reader's notes row and popover;
    - a cite's back-link `aria-label`;
    - the Review highlight card.

    The heading ids and the anchor round trip are unchanged.
  - **Identity:** a chapter with no math in a heading (`write-lock`, `all-blocks`) renders byte-identical to HEAD on the chapter page, the Toc, the sheet and the notes rows.
  - **F1–F3's sweeps stay passing** where this slice touches their files.

## Validation

- `pnpm --dir web typecheck` and `pnpm --dir web lint` pass.
- `pnpm --dir web exec vitest run` passes, now 585 tests plus yours.
- `uv run pytest -q` passes, if any Python is touched (it shouldn't be).
- `python3 scripts/plugin_parity.py` and `python3 scripts/skills_parity.py` pass.
- The standalone build in a scratch copy passes.
- The sweep above, with its instruments named.
- `python3 scripts/workflow.py validate` passes.

## Set

- `web/src/lib/native/mathml.ts` (only to add the display flattener beside `linearTex`), or a new `web/src/lib/native/display-text.ts` (`server-only`);
- `web/src/lib/reader/load.ts`, `web/src/lib/library/continue.ts`, `web/src/lib/reader/notes-load.ts`, `web/src/lib/native/cites.ts`;
- `web/src/components/reader/reader-frame.tsx` (only for `curH2` or the sheet);
- `web/src/components/reader/annotations.tsx`, `web/src/components/reader/note-row.tsx`, `web/src/lib/reader/note-list.ts` (only for the quote's display);
- `web/src/lib/review/actions.ts`, `web/src/components/review/card.tsx` (only for the Review quote);
- `plugin/templates/kb/docs/getting-started/{{KB_DATE}}-how-your-knowledge-base-works.md` (the one sentence);
- `web/tests/native-render.test.ts`, or a new small `web/tests/display-text.test.ts`;
- this slice's `result.md`;
- `phase.md` through `phase-section`.

Any other file needed means `needs_operator`, naming it. Never touch `project.ts`, `anchor.ts`, `parse.ts`, `reader-anchor.test.ts`, the fixtures under `tests/fixtures/native/`, `server/` or the stored data. Nothing under `.claude/`. Never commit or move workflow state.

## Notebook (alone: write through `phase-section`, under budget; phase.md is 39.5 of 40 KB)

`phase.md` has no room. Before you write, move older entries out with `--to-topic` (Decisions to `decisions`, Notes to `notes-for-later-slices`) until it has room for your entries plus about 2 KB for the review. Then fix the moved entries' relative links by hand: from `topics/`, `](../slices/…`, `](../package/…`, or `](x.md)` for a sibling topic.
- **Decisions:** one entry: the Glossary's place in the lists and the threshold; the display flattener and its callers; how each quote surface was mapped, or why one was left.
- **Doc impact:** one line (product, architecture: the contents list the Glossary; text-only surfaces show linear math; the template page's line).
- **Now:** F4's landing, then "Next: REVIEW round 2 (the acceptance gate)".

## Dispatch

route=high
reason=risk high (not low)
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
