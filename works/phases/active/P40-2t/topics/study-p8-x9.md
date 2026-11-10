# Study: Note's P8-x9, the English textbook (P40-2t.R1)

`P40-2t.R1` wrote this on 2026-11-10, read-only, from Note's unmerged worktree
`.claude/worktrees/P8-x9-english_textbook_from_my_own_words/workflow/works/phases/active/P8-x9/` (a nested
workflow repo at v95, no git remote). Times are KST, from `slice.json` and the nested repo's commit log. The
operator's words in the corpus are cited by counts and record-id prefixes only, never quoted.

## The run in one line

`/knowledge:explain` was asked for an English textbook built from the operator's own words. Explain refused it
(no code behind the subject), so the session ran **one ordinary phase** that gathered, sorted, wrote,
assembled, proofread and published. It took about **2 h 53 min** from intake to the acceptance gate, and the
result is **one 129 KB document** with **one 20-item quiz at the end**.

## The slices, in order, with their time

| Slice | Kind, row | Ran (KST) | Span | What it did |
|---|---|---|---|---|
| intake | — | 14:55 | — | `create-phase`: five clarifications, then "yes" to one phase. "Can explain make this? — No" is recorded under *Clarifications Resolved* |
| DECOMP | decomposition, high | 15:03:40–15:07:25 | 3.8 min | Cut S1–S9 with three write slices (S6–S8) pre-cut and no DECOMP2; required the acceptance gate |
| S1 | implementation, **mid** (risk low) | 15:08:56–15:23:34 | 14.6 min | A read-only extractor (`topics/corpus/extract.py`) and the corpus: mac-personal 1,545 records, mac-krpd 907, node 545 |
| (re-cut) | orchestrator | 15:25 commit | — | The operator's word removed the pre-cut writers and asked for a DECOMP2; S1's over-budget surface was split three ways |
| S2, S3, S4, S10, S11 | research, high, **one wave** | 15:27:01–15:46:21 | 10.7 / 19.3 / 13.1 / 11.6 / 11.9 min | Sorted each surface into findings (good patterns, mistakes, Korean-instead, timed misunderstandings, reading problems). Wall 19.3 min against 66.6 summed |
| S5 | research, high | 15:47:22–16:09:11 | 21.8 min | Merged 2,601 records into 50 ranked patterns and 62 costed misunderstandings (~25 h lost); proposed 6 parts, 26 units |
| (gate) | operator | 16:09–16:38 | ~29 min | DECOMP2's plan gate: OQ1 (Part 4 stays its own part), OQ2 (full length, ~142 points) |
| DECOMP2 | decomposition, high | 16:38:01–16:45:04 | 7.1 min | Cut six one-part writers (one wave), S18 assemble, S19 proofread; wrote `topics/writing-rules.md`, the writers' shared contract |
| S12–S17 | implementation, high, **one wave** | 16:46:04–16:59:10 | 12.2 / 8.4 / 8.9 / 13.1 / 10.4 / 9.2 min | One part each, quotes checked against the corpus. **Wall 13.1 min against 62.2 summed** |
| S18 | implementation, high | 17:00:37–17:12:15 | 11.6 min | Joined the parts into `topics/textbook/textbook.md`: opening, checklist, one 20-item quiz, a plain glossary section |
| S19 | qa, high | 17:13:14–17:27:09 | 13.9 min | A fresh-eyes proofread of the whole book: 36 fixes |
| S9 | implementation, high | 17:27:50–17:34:00 | 6.2 min | Published privately (doc 73 v2, project `english`); a placeholder v1 went first to prove privacy |
| REVIEW r1 | review, high | 17:35–17:42 | ~7 min | `changes_requested`, one finding: the notebook lacked the proofread's rulings and told a later version to re-join the unproofread drafts |
| F1 | fix, low | 17:43:14–17:45:17 | 2 min | Corrected the notebook |
| REVIEW r2 | review, high | →17:48 | ~3 min | `pass`; the acceptance gate opened (still `pending` at R1) |

## The operator's stops

1. **Intake** (14:55): the request plus two follow-ups (more repos; "you can make a phase for gathering
   information, and then start writing"), then five clarifications at `create-phase`: whether explain can do it
   (no), which words to read (intent files and every typed chat message, on the Mac and on `node`), where to save
   it (the knowledge base, private), which language for the notes (English plus Korean), and one phase or two
   (the operator said "yes" to one).
2. **A mid-run re-cut** (about 15:25): the operator rejected the pre-cut writer slices ("clear write slices,
   make decomp2 instead"), because the parts could not be known before the research ran.
3. **DECOMP2's gate** (16:09–16:38): two outline decisions, OQ1 and OQ2. This was the run's outline gate in all
   but name.
4. **The spend** was approved with the DECOMP plan: under $0.01 of Gemini embeddings on the publish.
5. **The acceptance gate** (from 17:48, still open): read the book, then D1 (a v3 with a real glossary once the
   server is deployed) and D2 (the level and the Korean lines).

## The checks, and what they caught

- **Extractor self-tests (S1):** six claims proven failing-first. Secrets scrubbed across 17 made-up shapes; one
  uuid at most once; only typed text kept; pastes cut; nothing written on `node`; reproducible counts. The secret
  grep found prefixes in prose only, with no value.
- **Quote checks:** each writer checked its part's quotes against the corpus by record id: 44, 34, 40, 74, 76 and
  47. The front matter added 31. After the proofread, a scratch `quotes.py` checked all **342** quotes as
  exact (masks `[name]`/`[figure]` read as any text), failing first on a one-word change.
- **S18's `verify.py`:**
  - parts joined byte-for-byte, except for the 38 glossary links;
  - 176 unique ids, 79 links, 0 broken;
  - a scan for record ids, paths, emails, phone numbers and secret shapes;
  - the size, and one quiz of 20 items.
  - `knowledge check`, the server's dry run, exits 0. It refused the `term:` links until they were converted.
- **S19's proofread:** 36 fixes in 27 points, plus 7 lines outside the points:
  - wrong meanings, ambiguous pronouns, over-broad rules and consistency;
  - 4 rows dropped, which were duplicates across parts or rude lines;
  - 1 callout replaced, and 2 tool names unmasked.
  - It left 4 items "as written, doubtful" for the reviewer.
- **S9's privacy proof:** the authenticated read-back equals `textbook.md`. 22 unauthenticated URLs were refused
  (401, 404 or the login page), and the marker text was absent from all of them. The project's visibility field
  was not proven: it needs a web session.
- **The review:** one finding, in the notebook, not in the book. It reused S19's quote check, read the book in
  full and spot-checked 10 quotes.
- **No critic on a second model and no sentence trace.** No one checked what a "Better" sentence or a "Why"
  line claims, beyond the proofread's one fresh read.

## The output

- **One native document**, doc 73 v2 in a new private project `english`: 129,208 bytes, 26 units, 133
  points and 16 "keep doing this" callouts.
- **The shape:** an opening of about 7 KB, six parts, a checklist, **one 20-item quiz at the end** and a plain
  glossary (25 grammar words, 18 work words). It is not a book: there is no page or quiz per part. The operator's
  item 2 in P40-2t's intake is this long page.
- **The drafts:** each part draft (`topics/textbook/part-<n>.md`) has a sources file mapping each point to its
  corpus record ids. After the proofread, `textbook.md` is the only source; the part drafts are stale.

## What went wrong or was improvised

- **Explain refused it.** Plugin 0.10.0 declines a subject with no code behind it, so the session built an
  ordinary phase by hand. Every explain check was lost with that detour: the outline gate, the second-model
  critic, the sentence trace and the book shape.
- **The writers were pre-cut** before the research ran. The operator caught it, and DECOMP2 cut them from the
  findings instead. This is the same lesson as a book's DECOMP: cut the chapters from the evidence.
- **The corpus extractor ran as a mid-row implementation slice.** It is a script plus a 2.7 MB corpus of the
  operator's words, kept in `topics/corpus/` and committed to a nested repo with no remote.
  - Its privacy rules are the model for question (a): only typed text, pastes cut, secrets redacted by shape,
    the assistant's text kept as context and never quoted, and nothing written on another host.
  - So are the writing rules' §8 masking rules: people, companies, clients and money masked; public tools named;
    no record id or path in the book text.
- **The glossary work-around.** The hosted knowledge server predates the plugin's glossary grammar: it refuses
  `term:` links, and the `glossary` block is not deployed. So S18 converted 38 `term:` links into links to a
  plain `## Glossary` section. P59-d8 hit the same server gap (its OQ2), so this is a deploy gap, not a route gap.
- **A placeholder was published first** (v1, archived) to prove privacy before the real body went up.
- **The parallel writers worked from a shared contract** (`writing-rules.md`): fixed heading ids with a
  unit prefix so writers never clash, glossary ids, voice, masking and checks.
  - The proofread still found cross-part duplicates and inconsistencies.
  - That is the evidence for question (d): parallel writing needs the shared facts pinned before it starts,
    and a whole-book read after it.
- **The drafts diverged from the book.** Because the parts were joined and then proofread in the joined
  file, the notebook told a later version to re-join the drafts. That was round 1's finding. Explain's book
  avoids it, because each chapter stays its own final file, and a fix slice edits that file.
