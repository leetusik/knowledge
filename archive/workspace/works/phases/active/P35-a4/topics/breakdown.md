# P35-a4 — breakdown

Written by `P35-a4.DECOMP` (2026-10-30). The record is `intent.md`; this file says how the
work is cut, and what each slice must not trip over. Line numbers are the canonical
`plugin/skills/explain/SKILL.md` at `cc53183d` (2,729 lines).

## Passes

- **DECOMP** (2026-10-30): a declared chain of two, S1 → S2, then `REVIEW`. No research
  slice and no `DECOMP2`: the intent pins the approach and the passages are located below.
  Not an explain phase (no `## Explain`) and not a design phase (no `## Design Style`).

## Estimate

From `dispatch-summary`'s `means` (2026-10-30): implementation 25.9 span-min/slice (the mid
row 18.8 min/span); high 81.0 min/span; critic 80.4 min/span; review 259.9 span-min/slice
(a mean dominated by gated reviews with browser walks; this one is waived).

- S1 ≈ 26 min · S2 ≈ 20–26 min · REVIEW ≈ 160 min (one high review span ≈ 81 plus one
  critic span ≈ 80), up to the review mean of ≈ 260 min.
- Phase, DECOMP's 9 min included: about **3.5–5.5 h** of span time.
- No slice spends money: the critic is the workspace's own dispatch, not spend.

## Join-rebuilt artifact

None. The generated files (the two skill copies and the five agent bodies) are all
regenerated inside S1's own set, and the chain runs one slice at a time.

## Out of scope

- `.claude/skills/**`: the workspace's copies of the workflow payload. Bringing them in
  line is the workflow-repo phase the orchestrator proposes after `REVIEW` passes. For that
  phase, the places that restate a rule this phase changes:
  - `create-phase/SKILL.md` L118: a phase book `p<N>` "titled `P<N>: <phase name>`";
  - `do-whole-phase/reference/explain-chapter.md` L210 (and its `do-next-slice` copy):
    a chapter "links earlier chapters' keys as `chapter:` links";
  - `do-whole-phase/reference/explain-review.md` L24 (and its copy): the book read flags
    "a term taught twice", which a short recap is not.
- `.claude/skills/explain/`: the stale vendored copy, deferred as D79-we.
- `docs/current/`: durable docs change only through `## Doc impact` notes and a docs phase.
- Re-explaining any published document or chapter: they stay as they are.

## Pins for S1

Decided here, so the mid row decides nothing.

- **Headings and `§` numbers stay byte for byte.** So do the Part B marker lines
  (`<!-- part-b:begin … -->`, `<!-- part-b:end … -->`) and their `with=` lists. New rules go
  inside existing sections, as new bullets or sentences, never as new headings. Each new
  rule is written in full, so the workflow can point at it without restating it.
- **Titles.** A phase or slice book's title, a phase or slice chapter's title, and a loose
  document's `title` (§5) say what the text explains. The id appears at most as a trailing
  small mark, as in "How a review publishes privately (P30)". Slugs, keys and positions are
  internal and stay as they are (`p<N>`, `p<N>-p<M>`, `s1`, `f1`, position `N` or the
  slice's `order`). The repo's `phases` book keeps its title `"<project>, phase by phase"`
  and its by-N positions: that is the placement the operator asks for. Only its chapter
  titles change. A title rule binds only a new book or chapter: an existing chapter keeps
  its manifest entry (§5, L1334), and a loose v2 keeps its address through `rel_path`
  (L1365). Retitling therefore never forks a document, and nothing published changes.
- **The critic's categories stay** (`reader`, `clarity`, `order`; no new category).
  Severity follows the intent:
  - a document organised by slices or work records, or one whose reader cannot follow it
    without opening a link, a file or a source, is a `reader` must-fix;
  - an id as a sentence's subject or in a heading, a deferred id, a work record named
    where plain words would do, or a lone "see X" in place of an explanation, is a
    should-fix;
  - long re-teaching of an earlier chapter stays a should-fix;
  - a short recap is never a fault.

## P35-a4.S1

- **Goal:** the canonical explain skill teaches the subject, not the work records, and every
  document and chapter stands alone. The critic's rubric enforces both. The two shipped
  copies and the five agent bodies follow.
- **Where** (canonical file, `cc53183d` lines):
  - **The subject, not the records:**
    - §1 placement, L156–195: the phase-chapter title at L173, the slice-chapter title at
      L175–177, the phase-book title at L187–189;
    - the front door's step 6 `book:` / `chapter:` lines, L258–262;
    - §3.1 brief, L428–439;
    - §3.4 step 3, the outline skeleton (L673), and step 5's *history behind it* (L704–706):
      records are evidence;
    - §3.9 `no-research` change mode, L868–871;
    - §3.10 the path, L878–895;
    - §4.2 Background and Code for a change, L1005–1015: for a phase or slice, walk the
      system as it now works, never slice by slice;
    - §5 `title`, L1310;
    - §9.2 step 2, the book's chapter list, L1526–1527.
  - **The attributed form:** the §4 *Teach, don't report* bullet (L949–953), plus wherever
    the plain-words attribution for a work record best lives: B7's attributed-form bullet
    (L2271) or B8's *In the chapter* paragraph (L2339–2343).
  - **Standalone:**
    - §4's prose rules;
    - §4.2;
    - §4.1's links bullet (L985–989): a link is an extra, never the explanation;
    - B5 *Order and prerequisites* (L2053–2057) and the rubric's should-fix (L2085–2086),
      which this rule reverses;
    - B5 *The reader* (L2059–2063);
    - B5 *Inputs* item 7 (L1974–1980): its reading list names §4.1, §4.2, §4.4–§4.6 but not
      §4's own prose rules, so add them if the new rules live there.
  - **§4.10** dispatches the critic and holds no rubric text. Change it only if a sentence
    there restates the linking rule.
- **Set:**
  - `plugin/skills/explain/SKILL.md`;
  - `.agents/skills/explain/SKILL.md`: body byte-identical, its own frontmatter kept;
  - `web/public/SKILL.md`: a full-file copy;
  - `plugin/agents/code-researcher.md`, `plugin/agents/explain-critic.md`,
    `plugin/agents/gap-reviewer.md`, `plugin/agents/verifier.md` and
    `plugin/agents/web-researcher.md`, regenerated by
    `python3 scripts/skills_parity.py --write-agents`. B7 and B8 are shared extracts
    (`with=…ladder,bar`) in all five briefs, so an edit there regenerates all five.
  - No numbered sequence and no runtime resource.
- **Validation:**
  - `python3 scripts/skills_parity.py`: PASS;
  - `python3 scripts/plugin_parity.py`: PASS;
  - the heading diff
    `diff <(git show cc53183d:plugin/skills/explain/SKILL.md | grep '^#') <(grep '^#' plugin/skills/explain/SKILL.md)`:
    empty (it also covers the `pagetext` extract's `#` lines);
  - P33-n3's citation check (`works/phases/active/P33-n3/topics/citations.md` L64–85, run
    from the repo root): `citations checked=186 missing=0`;
  - `git status --porcelain .claude/` shows nothing of S1's.
- **Risk:** `low` (the mid row). No trigger:
  - the intent and the pins above fix the approach;
  - headings stay, so no citer breaks;
  - titles bind new books and chapters only, so persisted identity is untouched;
  - regenerating the copies and agents is mechanical and checked by CI.
- **spends money:** no.
- **Depends on:** none.
- **Doc impact:**
  - product.md: the explain skill's writing rules (subject over records, ids at most a
    small mark, standalone, the critic's reversed link rule);
  - qa.md `## Regression Checklist`: P33-n3's *Explain front door, a book* line expects
    `"P<N>: <phase name>"`, which now becomes a subject-led title with the mark.

## P35-a4.S2

- **Goal:** release the plugin as **0.8.0** on its outer surface.
- **Set:**
  - `plugin/.claude-plugin/plugin.json`: `version` 0.7.0 → 0.8.0;
  - `plugin/skills/setup/SKILL.md`: `plugin_version` 0.7.0 → 0.8.0 at L341 and L355, the KB
    marker's "current plugin version", as the 0.7.0 release `ed9e2b2d` did;
  - `web/src/content/marketing/content.ts`: both counts (`lede` "2,729-line", L251, and
    `pane.meta` "2,729 lines", L261) set to `wc -l web/public/SKILL.md` after S1;
  - edited only where they restate a changed rule:
    - `.claude-plugin/marketplace.json`: it has no `version` field, so it changes only if
      the shared `description` changes, which must stay byte-identical to `plugin.json`'s;
    - `plugin/README.md` and `README.md`: at DECOMP neither restates a title or linking
      rule.
- **Validation:**
  - `python3 scripts/plugin_parity.py`: PASS;
  - `python3 scripts/skills_parity.py`: PASS;
  - the landing count equals `wc -l web/public/SKILL.md`, the existing qa checklist line;
  - `grep -rn '0\.7\.0' plugin .claude-plugin` finds no current-version mention left.
- **Risk:** `low` (the mid row): mechanical edits, no trigger.
- **spends money:** no.
- **Depends on:** P35-a4.S1, because the line count and any restated rule come from S1's
  text.
- **Doc impact:** product.md: plugin 0.8.0; the landing counts the new line total.

## P35-a4.REVIEW

**The check from the plan.** The critic runs once, against the new rubric, over the old
draft `works/phases/active/P32/rehearsal/r1/dossiers/c-new/body.md` with its dossier. The
review confirms that the L156, L173 and L177 passages (a work record or a slice as the
sentence's subject; L173 also leans on "`architecture.md` says") are now findings.

Two constraints shape how it runs:

- **The installed `knowledge:explain-critic` is plugin 0.7.0**
  (`~/.claude/plugins/cache/knowledge/knowledge/0.7.0`), so it carries the old rubric until
  the operator pushes and runs `/plugin update`. Run the new rubric the generic way §4.10
  allows: an agent whose brief is the repo's regenerated `plugin/agents/explain-critic.md`
  body, with `skill: plugin/skills/explain/SKILL.md` (the repo's).
- **The review executor's Agent tool is Explore-only** outside an explain phase, so the
  orchestrator dispatches that critic span itself, then hands its critique path to
  `REVIEW`:
  - model: the draft's writer was `claude-opus-5-5` (the dossier's `critique.md`), so the
    critic runs on Sonnet;
  - `critique:` and `scratch:` point into `P35-a4.REVIEW`'s folder, never at the P32
    dossier's own `critique.md` or `pages/`;
  - if the critic cannot run, the review reads the three passages against the new rule
    text instead.

**Also confirm:**
- the heading diff is empty, and the citation check prints `missing=0`;
- both parity checks pass;
- nothing under `.claude/skills/` changed in the phase's range;
- the landing count equals `wc -l web/public/SKILL.md`.

**Gate:** waived, as the plan recommends. Nothing operator-visible changes until the
operator pushes, updates the plugin and deploys the web, and the landing count is guarded by
the existing qa checklist line.
