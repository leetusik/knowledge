# P38-e1.S7 — an honest cost line, the cheaper run, and a translation as its own document (intent items 7 and 8)

## Goal

1. **An honest confirmation** (item 7).
   - The front door shows the cost of the proposed run, from metered numbers, in plain words.
   - When a prior's dossier was found (S5), it offers the delta (`full` as a delta of v<N>) with the decline word `from scratch`, the from-scratch cost beside it.
   - When the subject is narrow, it offers `quick`.
   - It offers; the operator decides.
2. **Translations stay cheap** (item 8). P51-3q cost $7.84 for a $2.26 translation.
   - A translation is one write span: no research and no critic.
   - A **loose document's** translation is a new loose document of its own, never `--new-version` onto the source, which would replace it.

## The approach (pinned; decide nothing new)

Follow `works/phases/active/P38-e1/topics/breakdown.md` **`## P38-e1.S7`** exactly, together with **`## The shipped set`** and **`## Pins for every rule slice`** (the confirmation layout). Also follow the notes `(from S2, for S7)`, `(from S3, for S5 and S7)` and `(from S5, for S7)` (`phase-section P38-e1 "Notes for later slices"`). The points:

1. **The `Cost:` line** sits right after the Sections list's `Quiz and Sources close it…` line. It replaces step 7's `- cost: …` bullet, keeping that bullet's permissions clause (move it to the stops line or keep it as its own short bullet).
   - **Content:** the agents (researchers, verifier batches, gap reviews, the critic), about $ at list price, and the source of the numbers.
   - **Plain words:** S6 made the confirmation plain; keep it so.
   - **One clause** says that a subscription user reads "$" as usage.
2. **A small cost table** inside §1, after step 7, copied from `topics/cost-evidence.md` §6:
   - v1 document ≈ $35–45;
   - v2 delta ≈ $25–38;
   - translation ≈ $3, one write span;
   - `quick` and a book: "not metered yet".

   Label it "measured on plugin 0.8.0 runs, projected for 0.9.0". It is the one place the numbers live, and the line cites it. S8 will confirm or correct them.
3. **The cheaper run:**
   - **A prior's dossier found:** the run line reads `full — as a delta of v<N> (researches only what changed since <date>)`, with `say "from scratch" for a full rerun ≈ $<from-scratch>`.
   - **Not found:** `delta: none (no dossier)`, and the v1 price.
   - **A narrow subject** (one question, one file or function, or the request's own "short"): offer `quick` with its cost.
   - The front door offers and never chooses; the operator's reply decides. Keep the run card's "Never choose `quick` or `no-research` yourself".
4. **A translation** (§3.1 *Translation*, §5, §4.10, the front door):
   - **A loose document's translation is a new loose document:**
     - slug `<source slug>-<lang>`, a title in that language;
     - `--lang <xx> --translated-from <src>@<version>`;
     - **never** `--new-version --rel-path` onto the source;
     - the curl form sets `"slug"`;
     - expect the `translation-source-missing` warning for a loose source (harmless, per P51-3q's S1).
   - **One write span:** no research and no critic. Then §4.8–§4.9 and §5. §4.10's first line reads "`quick` and a translation go straight to §5".
   - **In the confirmation:**
     - a translation keeps `run: full` (no new value);
     - its `lang:` line names the source, e.g. `ko (translated from en v2)`;
     - its cost line says one write span, ≈ $3;
     - it shows no Sections list: the sections are the source's.
   - A chapter's translation stays a `lang` variant of the same key, as today.

## Constraints

- **Headings, `§` numbers and Part B marker lines** stay byte for byte. New text goes inside existing sections. No new `## Explain` field and no new `run:` value.
- Do not change the `## Explain` block, S6's `In plain words:` line, or S2's Sections block, beyond placing the `Cost:` line after it.
- **The set** (touch nothing else):
  - the canonical `plugin/skills/explain/SKILL.md`;
  - `.agents/skills/explain/SKILL.md`: the canonical file minus the `argument-hint:` and `allowed-tools:` lines, body byte-equal;
  - `web/public/SKILL.md`: a full `cp`;
  - the five `plugin/agents/*.md`, regenerated only if Part B changes.
- **Never** edit `.claude/skills/**`, commit, or move workflow state.
- **The notebook:**
  - `## Doc impact` (`--append`):
    - `product.md`: the explain confirmation shows a metered cost line and offers a delta or `quick`; a loose document's translation publishes as its own document (P38-e1.S7);
    - `qa.md` `## Regression Checklist`: the headless explain front-door line expects the `Cost:` line (P38-e1.S7).
  - Remove the consumed `for S7` notes, leaving a note for S8 on where the cost table lives.
  - Rewrite `## Now` **under its 2,048 B budget** (it is over now): use `--replace`.

## Validation

- `python3 scripts/skills_parity.py` → PASS
- `python3 scripts/plugin_parity.py` → PASS
- **The heading diff against `14e1cbda`** → empty: save `git show 14e1cbda:plugin/skills/explain/SKILL.md` to the session scratchpad and diff the `^#` lines. The Part B marker lines must be identical too.
- P33-n3's citation check (`works/phases/active/P33-n3/topics/citations.md` L64–85) → `checked=200 missing=2`, no worse
- `uv run pytest tests/test_explain_resolver.py -q` → passes
- The cost table's numbers equal `topics/cost-evidence.md` §6 (quote both in `result.md`)
- `grep -n -- '--new-version' plugin/skills/explain/SKILL.md`: no line tells a loose translation to use it (quote the relevant lines)
- `git status --porcelain .claude/` → nothing of this slice's

## Dispatch

route=mid
reason=kind implementation rated low
subagent_type=slice-executor
model=opus
pass_model=yes
effort=medium
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
