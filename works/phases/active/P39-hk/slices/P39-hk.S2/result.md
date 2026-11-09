# P39-hk.S2 — result

## Verdict

- **status:** done
- **route:** high
- **model:** opus
- **effort:** xhigh
- **summary:** Rewrote the explain skill's evidence stage around one writer and one critic. §3 is now *Gather the evidence*: the writer reads only the code at one pinned commit and the covering phases' records into `evidence.md`, and every sentence traces to an entry. A v2 is the prior plus the phases since, books draw their chapters from phases, and the critic (B5) checks the draft against the code and the records on a second model, with a new `outside` category. All four copies are propagated, and parity, the plugin templates and the resolver test pass.
- **files_changed:**
  - `plugin/skills/explain/SKILL.md`
  - `.agents/skills/explain/SKILL.md`
  - `web/public/SKILL.md`
  - `plugin/agents/explain-critic.md` (body regenerated; frontmatter `description` and `tools` hand-edited, see deviation 1)
  - `plugin/agents/web-researcher.md`, `plugin/agents/code-researcher.md`, `plugin/agents/gap-reviewer.md`, `plugin/agents/verifier.md` (bodies regenerated only: the shared B9 extract changed)
  - `works/phases/active/P39-hk/topics/skill-headings.md`
  - `works/phases/active/P39-hk/topics/evidence-model.md` (new)
  - `works/phases/active/P39-hk/slices/P39-hk.S2/result.md` (new)
- **validation:**
  - `python3 scripts/skills_parity.py`: PASS (5 agents match Part B; web copy byte-identical)
  - `python3 scripts/plugin_parity.py`: PASS
  - `uv run pytest tests/test_explain_resolver.py -q`: 2 passed
  - `git status --porcelain .claude/`: empty
  - `python3 scripts/workflow.py validate`: passed (only the pre-existing stale-docs and oversized-section warnings)
  - the plan's grep: every hit outside S4's sections is accounted for below
  - P33-n3's citation check (count only): `citations checked=200 missing=81`, against `200 / 2` at S1's state. The 2 are the existing B5 *Your dispatch* citations (D85-qk d), and the 79 new ones are S2's heading changes, expected and not chased.
  - deferred: whole-tree: none needed. No product code changed, and the guards above are this set's own checks.
- **deviations:**
  1. `plugin/agents/explain-critic.md` frontmatter was edited by hand: `tools` dropped WebFetch and WebSearch, and `description` was rewritten. `--write-agents` keeps each agent's frontmatter, so this was the only way to re-scope the critic's tools; its body is still generated.
  2. B9 (an S4-listed section) was rewritten in place, keeping its heading and marker, as the light record. B5 now keeps B9 as its one shared extract (plan item 6: "the shared extracts it keeps"). This also regenerated B1–B4's bodies, which the plan allows.
  3. Minimal pointer fixes outside the listed headings, where the text named a stage, file or section S2 removed:
     - the intro (executors "research", "lead");
     - §1's `(§3.4, §3.10)` and "scopes it down at D1";
     - the front door's step 5 (the prior's record), step 6 ("its evidence and word budgets") and step 7's v2 cost clause, which the plan allows;
     - §4's prose bullets *Teach, don't report*, *The subject, not the records*, *Standalone* and *Shorter wins* (they cited B7, B8 and the `sources` block);
     - §4.8, §4.9's record line, §5's converter pointer, B0's pointer (which the plan allows) and B12's "D0b" → "§3.2".
  4. `## 2` is untouched, as the plan says. Its dossier paragraph still reads "If D0b cannot write there" (a note for S4).
  5. D76's B5 half is settled: B5 now names the family "(Opus, Sonnet or Haiku)". This was a 5-word edit inside the passage S2 rewrote.
  6. `trusted sources:` has no outside meaning now. §3.1 reads it as what to read first among the code and the records, and anything else is set aside and reported.
- **doc_impact:** none beyond DECOMP's explain-contract line, which already covers it ("no research of its own: one writer from the covering phases' records and the code, a critic checking against them").
- **notebook** (in a wave: for the orchestrator to write):
  - **Decisions** (append):
    - `- **The evidence model (S2):** the writer reads only the code at one commit (`HEAD` at D0) and the covering phases' records (intent, Decisions, Notes, Operator Questions, slice `result.md` heads, `topics/` findings): no web, docs, plans or other repos. One citation form, `path:L<a>-L<b>@<sha>` (code hashed, records quoted). The record: `brief.md`, `evidence.md` (E/G/O ids), `outline.md`, `body.md`, `trace.md`, `critique.md`, `answers.md` → [topics/evidence-model.md](topics/evidence-model.md)`
    - `- **No new things (S2):** what neither the code nor the records state is a `## Gaps` line, `stated` ("The records do not say why …") or `dropped`, never filled from outside; the code wins a disagreement with a record; glossary definitions and formulas trace to entries like sentences. Sources are a plain `## Sources {#sources-list}` section; the typed `sources` block is unused (its items need a URL).`
    - `- **v2 from phases (S2):** a v2 is the prior plus the phases since: the prior's explain phase must hold an `evidence.md` (old research dossiers never carry), and the run reads only the phases since the prior's commit and the files `git diff --name-only` lists, carrying unchanged entries (same file or hash; records re-found by quote) and gaps. `from scratch` still declines it.`
    - `- **Books from phases (S2):** codebase books only. `DECOMP` reads the whole subject into `book/research/evidence.md` and writes `book/outline.md`, each chapter naming the phases it draws from (`## Drawn from` and `## Gaps` at its head; no `summary.md`). A chapter reads its phases closer into `evidence-ch<k>.md`, then D6–D8: §9.3 has 3 items, with no top-up, gap check or chapter gate.`
    - `- **The critic's inputs (S2):** B5 checks every sentence through `trace.md` against the code at the commit and the record lines (each load-bearing citation re-opened, 10 more sampled); new category `outside`, `ledger` → `trace`; `with=dossier` only (B9 is the light record); `scratch:` dropped; its tools lose WebFetch/WebSearch; still on a second model.`
  - **Notes for later slices:** remove entry 13, `(from S1, for S2)` (consumed). Append:
    - `- **(from S2, for S3)** §4's evidence rules, D7, §4.6 (a plain `## Sources {#sources-list}`) and §4.10 assume the evidence model. Still yours: §4.2 items 4 and 6 (best practices, "the pages you opened"), §4.5, and the prose bullets S2 only re-pointed (*Teach, don't report*, *Standalone*). Next steps reads `evidence.md`'s `## Open` (`O` ids); B5's checks go beside *Clarity*.`
    - `- **(from S2, for S4)** B5 lists `with=dossier` only, so B6, B7, B8, B10 and B11 are unused and go with B1–B4; B12 stays while §5's curl form uses `--payload` (§3.2 writes it). §2's dossier paragraph still says "If D0b cannot write there" (§2 left untouched). The critic agent's frontmatter is already rewritten.`
    - `- **(from S2, for S5)** Re-cite from `topics/skill-headings.md` (S2's rows); mirror `topics/evidence-model.md`: no `run.md`, probes or research agents; the critic block drops `scratch:` and returns `trace:` for `ledger:`; the review reads `## Gaps` for `gaps/final.md` and allows a write slice's `evidence.md` additions (D85-qk c); a book has no `summary.md`.`
  - **Doc impact:** none.
  - **Operator Questions:** none.
  - **Now** (replace the S2 line): `- S2 done: §3 is *Gather the evidence* (one writer reads the code at one commit and the covering phases' records into `evidence.md`; every sentence traces to an entry; gaps are stated, never filled), v2 is the prior plus the phases since, books draw from phases, and the critic checks against the code and the records. Next: S3 (writing rules), once R1 lands.`

## The evidence model, as written

The decisions are in `works/phases/active/P39-hk/topics/evidence-model.md` (gist lines above); the
canonical text is the skill. By heading:

- **The run card** has one writer and one critic. Its stages are D0 brief, D1 evidence, D6 the reader's path, D7 write, D8 check/critic/revise/publish and D9 report. D2–D5 are gone, and the later labels keep their numbers so that citations still resolve. The D0b preflight, `run.md`, team sizing, waves, merges, gap rounds, verification and the evidence gate are removed. The writer's rules open with **No research**.
- **§3 *Gather the evidence*:**
  - **§3.1 D0:** the brief carries `commit:` and `phases:`, has no `run:` and no `general`, and takes its reader from §1 *The reader*. The prior lookup and reading the prior are kept verbatim, translation is kept (it reads no evidence and has no critic), and the delta moved to §3.4.
  - **§3.2 *Permissions, and the converter*:** no probes; a denied call in a given form stops the run with the trimmed rules block (no WebSearch, WebFetch, pdftotext or mktemp; `sed -n` added for B9's hash). The converter command is byte-identical to the old one, and the splice asserted it.
  - **§3.3 *The record, and resuming a run*:** the file table, the book's record, and a resume from the first stage file that is missing or has no closing line. An old research dossier is never resumed or read as evidence.
  - **§3.4 D1 *the evidence*:**
    - steps 1–7 cover finding the records (active or archived; `phases: none` means code only), what to read and what never to read (plans, breakdown, `docs/`, commit messages as evidence), reading the code in its real order, entries, open items, gaps, and the closing counts line;
    - **A v2: the prior plus the phases since** covers the prior's `evidence.md`, the phases since, `git diff --name-only`, carrying by file or hash, and records re-found by quote.
  - **§3.10 D6:** the outline is the signed sections with their entries, gaps, budgets and `## Reader's task`; a section with no evidence is cut, and a section missing only its *why* states a gap instead. It closes with a `D6:` line.
- **§4:** D7's pass 2 loads entries. The evidence rules are: no fact without its entry, say what the entry says, no new things, declared gaps, and a writer gap is read for in the same evidence. **§4.6** is a plain `## Sources {#sources-list}` (code at the commit, then what the work recorded); the typed `sources` block is unused because the server requires an `http(s)` `url` for every item (`server/native/schema.py` `check_sources`). **§4.10**: the critic block without `scratch:`, answers in `answers.md`, and fixes drawn from the same evidence only.
- **§8:** `PUBLISHED — <title>`; the writer and critic models; the evidence (commit, phases read, entry counts, the v2 line, sections); gaps from `## Gaps`.
- **§9:** §9.1's size test now cites §3.10. §9.2 *The evidence for a book* and §9.3 *A chapter: its evidence, then the draft* are as in the Decisions gist.
- **B0:** a one-line pointer (only the critic is dispatched now); the spawn paths are plugin, generic and alone.
- **B5:** `with=dossier`; *Your rules* folds in what the critic needs from B6. Its inputs are the brief, the outline, the trace, `evidence.md`, and the code and records at the cited ranges. Its checks are *Facts in code*, *Facts in the records*, *Nothing from outside*, *The trace*, coverage of the signed sections and gaps, and diagrams, quiz, order, reader, clarity and rules as before. Its verdict fields are `trace:` and the new `coverage:`, and the family is named (D76).
- **B9:** the light record: the files, *The evidence*, ids (E/G/O/C), *A citation* (the hashed code-range form is kept; records are quoted), *An entry*, *What an entry supports*, the form of `evidence.md`, and the trace (it adds definitions, formulas and legend symbols, and `gap G<n>`).

## The grep, accounted for

`grep -n -i -E "WebSearch|WebFetch|web search|gap round|verifier|evidence gate|run\.md|D0b|D5|ledger|dossier" plugin/skills/explain/SKILL.md`, the hits outside B1–B4 and B6–B8/B10–B12 (S4's) and the frontmatter (S4's):

- **`dossier`** (55 hits): kept on purpose. `<DOSSIER>` (§2) is still the record's folder, now holding the light record; B9's heading keeps the word because the workspace cites it.
- **L59** (the card), "D2–D5, the research team's stages, are gone": deliberate.
- **L79** (the card), **L655** (§3's intro) and **L332** (S1's front-door cheap look) say "no web search": they are prohibitions.
- **L645** (§2), "If D0b cannot write there": §2 is untouched per the plan; noted for S4.
- **L876** (§3.3), **L963** (§3.4 *A v2*) and **L2651** (B9) mention `run.md` and `ledger.md`: they detect an earlier version's research dossier so that it is never resumed or carried.
- **L3** and **L5** are the frontmatter (`description`, `allowed-tools`), left for S4.
- B5 has no hit besides `dossier`.

Other words now stale outside S2's headings, left for their slices: §4.2 items 4 and 6 ("Best practices & next steps … `no-research`", "the pages you opened") and §4.5 are S3's; §5's general-mode `--subject` and project slug are S3's (S1's note).

## Deferred items

- **D86-sd** (wording after 0.9.0):
  - S2 settles **(c)**: §3.4's `W` timing gap is gone, and `W` now lives in §3.10 D6, where the budgets are set.
  - S2 settles **(f)**: §4.9 and §8 now describe a translation run (`brief.md` and `body.md`; the critic `none (a translation)`).
  - (a), (d), (e) and part of (g) were S1's; (b) and (h) are untouched by S2.
- **D69** (§1 placement and minted ids): not touched.
- **D85-qk** (workspace follow-ups):
  - (c) now depends on S5: a write slice adds entries to `evidence.md` for a writer gap or a critic fix (§4's evidence rules, §4.10), so explain-review must allow that.
  - (a), the critic-model pin, is still S5's: the plugin keeps "a second model".
  - (d), the B5 *Your dispatch* citation, is unchanged: it is a bold label, not a heading.
- **Close or drop candidates for the review**, since their subject is research machinery S2 retires:
  - **D72**: the dossier and search-total line; there are no searches and no `plan.md` now.
  - **D73**: verifier batches in the foreground; there is no verifier.
  - **D84-8s**: a metered trial of the cost table and team sizing, both gone; a trial of the new model would be a new job.
  - **D76**: its verifier half is retired and its B5 half is settled here.
  - **D67**: cross-vendor verification is retired. Its cross-vendor critic idea still stands, if the operator wants to keep it as a narrower job.

## Method notes

- I spliced the new text in with a script in the scratchpad. It asserted every anchor matched exactly once, carried the prior-lookup and translation blocks over verbatim, and checked that the converter command came over byte for byte. I then fixed up a few passages by hand, re-propagated, and regenerated the agents.
- I read no B1–B4 body (they are S4's to delete). I read the vendored workspace route only to see which interfaces it cites (the headings, B5 *Your dispatch*, *Order and prerequisites*, B9's heading, the dossier paths); nothing under `.claude/` was edited.
