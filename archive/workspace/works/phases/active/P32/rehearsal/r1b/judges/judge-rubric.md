# How to judge

Two chapters, `chapter-1.md` and `chapter-2.md`, answer the same request (`brief.md`). `points.md` is the
hidden checklist: must-cover points (M), expert-expectation points (E) and traps (T). You do not know who or
what wrote either chapter; do not guess, and do not let a guess move a score. **Length is not merit:** a longer
chapter earns nothing for being longer, and padding counts against it (R9).

Judge every check from the page and from the sources themselves, never from your own memory of the subject.
When a check needs a page, re-open it.

## Absolute checks, for each chapter separately

- **R1 Must-cover.** For each M point: `correct` (present and right), `wrong` (present but wrong or
  misleading), or `absent`. Quote the sentence that covers it (at most 25 words). A point needs its substance,
  not its exact words; a point split across sections counts.
- **R2 Expert expectations.** For each E point: `present` or `absent`, with a short quote.
- **R3 Citation accuracy.** A *cited statement* is a sentence or bullet that carries a citation: a link, or a
  reference to an entry of the chapter's sources block. Number every cited statement in reading order
  (n in all). If n ≤ 15, check all; otherwise check statements 1, 1+k, 1+2k, … with k = ⌊n/15⌋ until you have
  15. For each: the URL it cites; re-open that page (WebFetch; if WebFetch fails, `curl -sS --max-time 30 -L
  '<url>'`); label it `supported` (the page says it), `partial` (the page says part of it, or something
  narrower), `unsupported` (the page does not say it), `unopenable` (the page could not be opened twice; not
  counted against the chapter), or `contradicted` (the page says otherwise). Count *effective citations*: the
  distinct URLs that support at least one checked statement. Any `contradicted` → R3 fails.
  **Subject C:** R3 covers statements citing web pages or documents; statements citing code belong to R5.
- **R4 Source quality.** List the chapter's load-bearing claims (what its main argument rests on; at most 10).
  For each, what it rests on: `primary` (the spec, the PEP, the official documentation, the source code, the
  paper itself), `two-independent` (two secondary sources with different owners), `single-secondary`,
  `aggregator` (a content farm, an SEO summary or a scraper site), or `none`. Report the share that is
  primary or two-independent. A load-bearing claim resting on an aggregator alone is a negative.
- **R5 Code truth (subject C only).** List every repository entity the chapter names: files, functions,
  classes, constants, environment variables, response fields, commands. Check each exists at the pinned
  commit. Then number the chapter's code claims (statements about what the code does) and check 10 of them,
  spread as in R3, against the code at the commit. Report named / found and claims matching / not matching.
  Any entity that does not exist, or a code claim the code contradicts, fails R5.
- **R6 Traps.** For each T point: `committed` (quote it) or `not committed`.
- **R7 Instructions.** English throughout (yes / no). The quiz: the number of items; for each, whether its
  marked answer is correct (if not, why).
- **R8 Declared gaps.** Does the chapter say what is unknown, contested or version-dependent where it matters,
  instead of glossing over it? List where it does; list any place it states as settled what is not. `pass` or
  `fail`, with the reason.
- **R9 Padding.** Passages that repeat earlier material or add words without information: `none`, `minor`
  or `substantial`, with examples. The word counts are in `wordcounts.txt`.

## Pairwise

For each criterion: `1`, `2` or `tie`, with one paragraph that points at specific sections.

- **Helpfulness:** does it serve the stated reader's purpose (what they want to decide, do or understand)?
- **Comprehensiveness:** does it cover what this reader needs, in breadth and depth?
- **Insight:** does it explain why, and the trade-offs, not only what?
- **Readability:** for this reader: structure, clarity, examples.

## Record format

Write `record.md` in your working folder: a section per chapter with R1–R9 (the evidence above), then the
pairwise section, then this JSON block, filled in (use `null` for R5 on subject G):

```json
{"subject": "G|C",
 "chapters": {
  "1": {"R1": {"correct": 0, "of": 8, "wrong": [], "absent": []},
        "R2": {"present": 0, "of": 4},
        "R3": {"n_cited": 0, "checked": 0, "supported": 0, "partial": 0, "unsupported": 0, "unopenable": 0,
               "contradicted": 0, "effective_citations": 0, "pass": true},
        "R4": {"load_bearing": 0, "primary_or_two": 0, "aggregator_only": 0},
        "R5": {"named": 0, "found": 0, "claims_checked": 0, "claims_match": 0, "pass": true},
        "R6": {"committed": []},
        "R7": {"english": true, "quiz_items": 0, "keys_correct": 0},
        "R8": {"pass": true},
        "R9": {"padding": "none"}},
  "2": {}},
 "pairwise": {"helpfulness": "1|2|tie", "comprehensiveness": "1|2|tie", "insight": "1|2|tie",
              "readability": "1|2|tie"}}
```
