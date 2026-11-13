# P32.DECOMP2: cut the build for "Thorough research and critic in the explain pipeline"

## Context

The three research slices are done and committed:

- S1, orchestration: `topics/research-method.md`;
- S2, evidence: `topics/research-evidence.md`;
- S3, hosts and delivery: `topics/hosts-and-delivery.md`.

So far P32 has cost about $46 over about 1.9 span-hours: DECOMP $6, and the research slices $13 each.

What the research settled, briefly:

- **The skill gets a research stage.** A lead plans the questions and dispatches researchers in waves. They write
  findings files, the lead merges them into a source library and a claim ledger, and a Sonnet verifier
  re-checks them. Gap rounds are capped at 3. An evidence gate then decides, before writing, whether there is
  enough.
- **Writing follows the dossier.** The writer writes from the dossier and keeps a `trace.md`. The critic checks
  the chapter against the ledger and for coverage, then there is one revision.
- **The team ships as five plugin agents:** `web-researcher`, `code-researcher`, `gap-reviewer`, `verifier` and
  `explain-critic`. Their briefs live in a new Part B of SKILL.md, so all three copies stay single files.
- **Runs check their permissions first.** A two-agent preflight runs before anything else, because a skill
  cannot carry permissions through a background wave. Exact page text comes from curl plus a small converter.
- **The plugin goes to 0.6.0.**
- **The book flow goes to the bootstrap as a package with patches,** following P31's pattern.

This slice only cuts the build. It writes no product code.

## Decisions for you (approving this plan answers them as recommended)

1. **OQ2: who runs a book's research in the bootstrap?**
   - Recommended: a narrow carve-out in the bootstrap's `slice-executor.md`. On an explain phase, the `DECOMP`
     executor (whole-book research) and each chapter executor (its top-up) may dispatch the knowledge plugin's
     research agents. It needs no contract edit, and the book's lead stays one context.
   - The alternative, research as slices, means up to 45 extra slices, with the orchestrator as the merger.
2. **OQ3: is your "yes" to explain's book proposal `create-phase`'s confirmation?**
   - Recommended: yes. The proposal shows the name, the objective and every `## Explain` field verbatim.
   - On your literal yes, the skill invokes `create-phase`'s explain route, which runs `new-phase`, writes
     `intent.md` and stops. You then run `/do-whole-phase` as normal.
   - The alternative: it only prints the command, and `create-phase` asks you again.
3. **OQ4: the WebSearch cap.**
   - The cap is 200 searches per interactive session, across all its agents. A book's research needs about 360
     and a broad document about 200. At the cap, searches silently do nothing.
   - Recommended: the plugin README and the book package say to raise it, with
     `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION=1000` in your user settings' `env`. The skill never changes your
     settings itself, and it turns a capped search into a loud stop you can resume.
   - The rehearsals set the variable only on their own scratch runs.
4. **The cost goes up, because the rehearsals run the real thing.**
   - The rehearsals run full research teams: two subjects, old pipeline vs. new, plus one book chapter.
   - They make up about $90–140 of the remaining ~$170–240. The whole phase comes to about $215–285 and 9–10
     span-hours, up from the first estimate of $130–180.
   - The cheaper option is one subject per rehearsal; I recommend the full set, for quality.
5. **The skill roughly doubles in size, from 46 KB to about 85–90 KB, in each of its three copies.**
   - This is what keeps the landing download a single file, as its signed design shows.
   - Part A opens with a core card in its first 5,000 tokens, because that is all that is re-attached after a
     compaction.
   - Shrinking the skill stays out of scope, as your intent says.

**Decided as drawn:**

- Everything is English by default. `quick` and `no-research` stay as your opt-outs.
- Plugin 0.6.0, and the landing copy in `web/public/`, reach users only on your word: there is no push and no
  web deploy from a slice.
- The rehearsals publish nothing. They run on a scratch API, with the old arm at commit 2849ea6. Each one
  reports its real cost, from `claude -p --output-format json`.
- The interactive-session permission check goes to your acceptance walkthrough, where you run the new skill
  once yourself. Executors can only test `-p`.
- Book chapters route to high, on an Opus lead, in the package.
- The `argument-hint` line that claude.ai's skill upload rejects becomes a deferred job, not part of P32's fix.
- The bootstrap stays read-only. The package's anchors avoid P42's new sections.

## Proposed cut (the executor decides the final one and justifies it)

| Slice | Kind / risk | Does |
|---|---|---|
| **S4** | implementation, high (open design) | **Part B and the agents:** the role briefs, the source ladder, the verifier procedure and the critic rubric (P31's, plus `ledger` and `coverage`). Also the converter and Wayback blocks, the five `plugin/agents/*.md` files as byte-identical extracts, and the `skills_parity.py` AGENTS check with its CI. |
| **S5** | implementation, high (open design + wide blast radius) | **Part A, the research stage (D0–D9):** the core card, preflight, the three dispatch paths and waves, `run.md` and resume, the dossier at the state dir, gap rounds, the evidence gate, the search-limit stop, `quick` and `no-research`, and the modes report. |
| **S6** | implementation, high (wide blast radius) | **Part A, writing and the rest:** writing from the dossier with `trace.md`, the critic and one revision, English by default, the book section (B1–B6) that the package calls, the book suggestion (OQ3), and plugin 0.6.0 with its README (OQ4). |
| **S7** | qa, high (fixes skill text) | **Rehearsal 1:** old vs. new single document, on one general subject and one codebase subject, judged on S1 §3.13 and S2 §3.14 (a judge from another model, run twice with the positions swapped). It also runs S3's §6 checks under `-p`, and fixes the skill where the rehearsal shows a problem. |
| **S8** | implementation, high (open design + blast radius) | **The bootstrap package:** `package/` and `PATCHES.md` per S3 §4.9, with text anchors. It patches `create-phase`'s route fields and the three explain references, adds the `slice-executor.md` carve-out (OQ2), and removes the bootstrap's `explain-critic`. |
| **S9** | qa | **Rehearsal 2:** a tiny book run through the package as written, on a scratch stack: research, the outline with its research summary, and one chapter with its top-up and the critic. Nothing is published. |
| **S10** | docs, low | **The handoff for the bootstrap:** what to apply, the before- and after-P42 order, and the minimum versions. |
| **REVIEW** | review | Already exists. The acceptance gate is required. |

## What the DECOMP2 executor does (`slice-executor-high`, opus @ xhigh)

1. **Read, just in time:**
   - `intent.md`;
   - `phase.md`: `## Decisions`, the DECOMP2 notes and `## Now`;
   - the three topics: each one's §1, then S3 §4–5, S2 §3–4 and S1 §3, as needed;
   - `plugin/skills/explain/SKILL.md`'s structure;
   - P31's `package/` layout;
   - the bootstrap, read-only.
2. **Cut the slices** with `new-slice` as bare folders, each with its kind, its risk (with the named trigger),
   its order and `--depends-on`.
3. **Update `phase.md`:**
   - **`## Notes for later slices`:** one spec entry per slice, giving the topic sections it builds from, what it
     must deliver, and how it is verified, so each slice can be planned inline. Remove the consumed DECOMP2
     notes. Update the rules for every slice: build slices may now edit `plugin/`, `.agents/`, `web/public/` and
     `scripts/skills_parity.py`; the three copies stay in parity; the scratch-stack rules hold; nothing is
     pushed; the bootstrap is read-only.
   - **`## Decisions`:** the cut, and the answers to OQ2–OQ4.
   - **`## Now`.**
4. **Run `validate`** and return the verdict. No commit, and no state change beyond `new-slice`.

## After it returns (orchestrator)

1. Record the dispatch and finish the slice.
2. Resolve OQ2–OQ4 against the new Decisions lines.
3. File the `argument-hint` deferred job.
4. Commit.
5. Run S4 to S10 and the review in auto mode, each planned inline. Stop at the review's acceptance walkthrough,
   or earlier at any `needs_operator`.

## Verification

- `validate` passes, and `next` points at S4.
- No new slice has a `plan.md`, and each one has a spec entry in `phase.md`.
- The product diff is empty (`git diff --stat -- web/ server/ cli/ plugin/ .agents/ scripts/`).

## Dispatch

slice=P32.DECOMP2
phase=P32
kind=decomposition
risk=high
attempt=1
route=high
reason=kind decomposition
tier=high
subagent_type=slice-executor-high
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=high
