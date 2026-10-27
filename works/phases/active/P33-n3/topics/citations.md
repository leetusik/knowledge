# P33-n3 — the citation map (the rewrite's interface contract)

Written by `P33-n3.DECOMP` (2026-10-27) from the v86 workspace installed here. **Rule: every plugin
heading below stays at the same number with the same heading text, byte for byte (backticks
included), and its new content still answers what the citing text expects.** Citers quote the
number **and** the heading (create-phase *The explain route*; `explain-decomposition.md` L7), so a
renamed heading breaks a phase as surely as a renumbered one.

**Who cites.** `.claude/skills/create-phase/SKILL.md`, `.claude/skills/do-whole-phase/reference/explain-{decomposition,chapter,review}.md`
(the `do-next-slice/reference/explain-*.md` copies are byte-identical), `.claude/agents/slice-executor.md`
(the explain carve-out, L33). `review-phase/SKILL.md` L110 names `/knowledge:explain` only. **Not a
citer:** `.claude/skills/explain/SKILL.md`, a stale vendored copy (workspace-local, last synced v61)
that holds its own `§` references; `parallel-phase` §5 and `worktree.md`'s `§5` are that skill's
own sections. Built with `grep -rn "§\|Part B\|knowledge:explain" .claude/skills .claude/agents CLAUDE.md`
(195 lines, 186 `§N *Heading*` citations); line numbers below are the do-whole-phase copies.

## Numbered sections

| Section and exact heading | Cited at | What the citing text expects there | Handoff §7 |
|---|---|---|---|
| §1 *Resolve the topic, the mode and the placement* | create-phase L117–118; decomp L32, L37, L41 | §1's MODE per chapter (change, topic or general; distinct from `## Explain`'s `mode: codebase | general`); the book's slug, title and kind by "§1's rules": a phase or slice subject's book is `p<N>` titled `P<N>: <phase name>` (a tailed or v73 id keeps its form), any other book is named, kind `codebase` or `subject`; a chapter's key is "the slice key of §1" (the slice id lowercased) when it is shaped like one slice | stays as rules; the automatic placement and *A whole book is a suggestion* go. 0.6.0 puts a whole-phase **chapter** in the `phases` book (key `p<N>`); create-phase's `p<N>` is the phase subject's **book**: §1 must state both without contradicting create-phase |
| §2 *Resolve the knowledge base configuration* | decomp L13, L114, L132, L175; chapter L42, L149, L200; review L35, L42 | the resolver is **one `python3 -c` call**, a lead's first (only `Bash(python3 -c *)` allows it); it gives `KB_API_BASE_URL` (the CLI's global `--base-url <KB_API_BASE_URL>`, "the configured knowledge base", the org the review publishes into) and the org key `/knowledge:setup` wrote; **`<DOSSIER>` is defined so that a phase's `doc/` "is the plugin's `<DOSSIER>`"**, and "`<tmp>` is `<DOSSIER>`"; a span stopped before it wrote one restarts at §2 | resolver stays; the `KB_EXPLAIN_STATE` dossier and its cwd fallback go |
| §3 *Research* | slice-executor L33; create-phase L192; decomp L22, L120, L131 | the lead's procedure for a document or a chapter, D0 to D6 ("§3 through §3.10"); each role's method in Part B | stays (method) |
| §3.1 *D0: the brief, and the prior version* | decomp L135, L137 | the brief's fields (subject, mode, run, reader, must-cover, leave-out, trusted sources, lang, placement `loose` or `<book>/<key>`); the prior lookup, a v2 carrying every surviving id forward; reading a placement's book (`GET <KB_API_BASE_URL>/api/books/<project>/<book>` with the org key) | prior and translation rules stay; the unfinished-run lookup (L294–299) goes |
| §3.2 *D0b: the preflight* | create-phase L135; decomp L13, L28, L29, L175; chapter L51, L59, L72 | the probe agents (A in the background; **a subagent lead waits in the foreground**); `FAILED: permissions` printing the rules block, **with the lines for a lead that read the skill by path**; D0b again in every new session | stays; its wording "a workspace's book executor" should now cover any unit's lead |
| §3.3 *`run.md`, and resuming a run* | decomp L25, L134; chapter L77 | `run.md` holds the run's state, so a stopped span is re-dispatched from disk and goes on from its recorded stage, **D0b first**; the **resume note**: `trust <source>` (one more round on the failed items, beyond the cap) and `drop <item>` (out of must-cover) after an evidence-gate stop. B5 also reads the `tools:` folder from `run.md`'s `dossier:` line | shrinks to the `run.md` format and the in-span resume from disk; **the heading stays word for word** although the `resume` argument goes |
| §3.4 *D1: the plan* | decomp L139 | the start of the `full` range "§3.4 through §3.8" | stays |
| §3.5 *D2: a wave* | decomp L29; chapter L59 | a subagent lead sends a wave's calls in one message, in the foreground | stays |
| §3.6, §3.7 | (only inside the range §3.4–§3.8) | D3 merge, D3v/D3s, D4 gap rounds | stay |
| §3.8 *D5, D5s and D5g: final verification, and the evidence gate* | decomp L139, L140 | D5g's rule; `STOPPED: evidence gate` with the failing must-cover items and questions, their best sources and the queries run | stays |
| §3.9 *`quick` and `no-research`* | decomp L139; chapter L211 | `quick`: no research team, the lead researches the angles alone, then one verifier batch on another model, and keeps every file the section lists; `no-research`: the operator's words only, the repository by mode, no web probe, plan, team or ledger, and a draft with no "Best practices & next steps" and no sources block unless the operator gave pages | stays |
| §3.10 *D6: the final outline, the reader's path* | create-phase L192; decomp L40, L131, L141; chapter L60, L207 | `outline.md` final, opening with `## Reader's task` (2–4 tasks, each with its deliverable); D7 writes from it | stays |
| §4 *Write the chapter — native Markdown* | chapter L61, L199, L207 | the grammar and the paths, which need no translation when `<tmp>` is `<DOSSIER>` | stays |
| §4.7 *Images* | decomp L49; review L44 | image names and what each shows; attached on publish | stays |
| §4.8 *Before you publish* | chapter L114, L127, L230; review L118 | the read-through before the check | stays |
| §4.9 *Check* | chapter L130, L133, L230; review L36, L119 | `knowledge check` with the publish's exact flags; exit 0 / 1 / 2, **exit 2 (no check route, or a CLI before 0.2.0) skipped with a line**; the dossier line (a chapter skips it) | stays |
| §4.10 *D8: the critic, one revision, then publish* | chapter L84, L107, L161, L214; review L117 | the lead dispatches the critic **in the foreground** (a headless session stopped a background one after ten idle minutes); the critic on **the other model family**; **`quick` goes straight to the publish**; **steps 2–3** = answer each finding (`fixed | disputed | declined`), one revision, no new evidence (an unsupported fix removes the sentence or states the point as open). The workspace already runs it "without the confirm pass" | shrinks: the confirm pass goes (a dispute is the review's); keep steps 2 and 3 numbered as the answer and the revision |
| §5 *Publish via the KB document API* | create-phase L122; decomp L69, L170; chapter L199; review L39, L44, L94 | `translated_from` names the original's version; `--new-version --rel-path <rel_path>` for a v2; the 409 meaning; title, summary and tags rules; assets re-attached; the 422 as the backstop | stays |
| §5.1 *Transport failure on the POST — verify before you report or retry* | review L54, L100 | verify before any retry; never re-send blind | stays |
| §6, §7 | not cited | — | §6 stays; §7's `here` copy goes, **but §7 keeps its number** so §8 and §9 do not move |
| §8 *D9: the report* | review L109, L132 | the fields the review's `## Report` and the closing report carry: `PUBLISHED (<run>) — <title>`, url, version (or the prior superseded); the research and gate counts; the critic or `none (quick)`; declared gaps; the dossier's path; **the book suggestion for a scoped-down topic** | shrinks to those fields; item 8 stays as "a book suggested for a scoped-down topic" |
| §9 *A book* | create-phase L108; decomp L12 | exists, with the research agents, at 0.6.0 or later (the workspace's floor; 0.7.0 meets it) | stays |
| §9.1 *The book suggestion* | create-phase L188; decomp L142; review L109 | **the size test (b)**: about 25 questions, 7 top-level sections, tier 3 on two axes, or more than 10 researchers in wave 1; a topic over it is scoped down to one document and the report suggests a book (the reason, the part left out). create-phase L188 names "plugin 0.6.0's §9.1" for a proposal with no `unit` line: historical, no demand on 0.7.0 | shrinks: the proposal flow, the workspace probe and *No workspace* go; **the heading, the size test and the suggestion stay** |
| §9.2 *Research for a book (an explain phase)* | slice-executor L33; create-phase L191; decomp L20, L22, L23, L30, L44, L58, L96, L101; chapter L28; review L21 | the whole-book run into `book/research/`: questions, waves, gap rounds and the ceiling; `summary.md`; expected top-ups; **the freeze** of `library.md` and `ledger.md` at the outline's signature | stays |
| §9.3 *A chapter: its top-up, then the draft* | slice-executor L33; create-phase L191; decomp L56, L66, L120; chapter L15, L22, L50, L52, L60, L75 | **items 1–5 numbered**: D0b; the gap check, the top-up and the chapter's gate (items 2–4); the outline and draft (item 5); state in `run-ch<k>.md` | stays |
| Part B *The research roles* | decomp L22, L131 | each role's method; B0, how the lead uses it | stays |
| B5 *Critic (`knowledge:explain-critic`)* | chapter L87, L216 | the dispatch block: `mode: critique · kind: document | chapter`, `draft:`, `critique:`, `dossier:`, `skill:`, `scratch:`, `writer_model:`, `same-model: accepted`, a chapter's `chapter: slice: … · phase: … · key: … · plan: …`; it refuses a writer of its own family (`blocked`) unless `same-model: accepted`, then reports `critic_model: <id> (same model, degraded)`; findings by severity (`must-fix`, `should-fix`, `note`) with confidence, evidence and a `reader` category | stays; `#### Confirm mode` and "the confirm pass" go with §4.10's |
| B9 *The dossier: files, ids and entries* | decomp L132 | the dossier's files as the phase lays them out: `brief.md`, `plan.md`, `run.md`, `outline.md`, `findings/`, `library.md`, `ledger.md`, `verify/`, `gaps/`, then `body.md`, `trace.md`, `critique.md`, `assets/` | stays |

## Unnumbered things the workspace depends on

- **The heading *The run, in one card*** (decomp L22, L131: "Read the skill … its run card (*The run, in one card*), §3 …"). A phase's lead reads it as the run's map before §3: the stages D0–D9 and the runs (`full`, `quick`, `no-research`). It keeps that heading and the map; what goes is the engine (the compaction header, the run-level stop rules, "A repeat is never a new run", the `resume` run). The front door therefore cannot simply replace the card.
- **The file's place:** `<installPath>/skills/explain/SKILL.md` found through `~/.claude/plugins/installed_plugins.json`, version 0.6.0 or later (decomp L12).
- **The agents** `knowledge:web-researcher`, `code-researcher`, `gap-reviewer`, `verifier` and `explain-critic` keep their names, and the critic's frontmatter keeps `maxTurns` (chapter L100). `scripts/skills_parity.py` regenerates the bodies from Part B's `<!-- part-b:begin/end -->` markers, which stay well formed.
- **The plugin README heading *Explain: permissions and the search cap*** (create-phase L135) stays, still holding the manual-mode rules and the search cap (S2's file).
- **create-phase *A confirmed proposal*** (L185–189) is the receiving end of the hand-off: the proposal carries the unit, the phase name, the objective and every `## Explain` field with its reason; with a literal `unit` line it runs step 3 (create and run); fields joined by ` · ` are written one a line; it re-checks the per-unit required set (17 lines), `visibility: private`, a private project, a real subject and the stream. The front door's readiness test looks for that literal `unit` field (create-phase L115: "The literal `unit` line is what the plugin's front door tests for").

## The check (S1 runs it before `done`; the review runs it again)

Exit 0 means every `§N *Heading*` the workspace cites, plus *The run, in one card*, is a heading of
the canonical skill with that number and text. It proves presence, not meaning: the read-through
against the table above is still the judgment.

```sh
python3 - <<'EOF'
import re, glob, sys
skill = open('plugin/skills/explain/SKILL.md').read()
heads = set()
for l in skill.splitlines():
    m = re.match(r'^#{2,4} (?:(\d+(?:\.\d+)*)\.? |(B\d+)\. |(Part B)\. )?(.*)$', l)
    if m: heads.add(((m.group(1) or m.group(2) or m.group(3) or ''), m.group(4).strip()))
files = [f for f in glob.glob('.claude/skills/**/*.md', recursive=True) + glob.glob('.claude/agents/*.md') if '/skills/explain/' not in f]
bad = n = 0
for f in files:
    for i, l in enumerate(open(f), 1):
        for m in re.finditer(r'(§(\d+(?:\.\d+)*)|(B\d{1,2})|(Part B)) \*([^*]+)\*', l):
            num = m.group(2) or m.group(3) or m.group(4); h = m.group(5).strip()
            if num == '5' and 'merges back' in h: continue
            n += 1
            if not any(hn == num and (hh == h or hh.startswith(h)) for hn, hh in heads):
                bad += 1; print(f"MISSING {f}:{i}: {num} *{h}*")
if not any(hh == 'The run, in one card' for _, hh in heads): bad += 1; print('MISSING heading The run, in one card')
print(f"citations checked={n} missing={bad}"); sys.exit(1 if bad else 0)
EOF
```

At DECOMP, on the 0.6.0 skill: `citations checked=186 missing=0`.
