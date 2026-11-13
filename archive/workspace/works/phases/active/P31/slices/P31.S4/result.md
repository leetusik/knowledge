# P31.S4 result

- status: done
- tier: high
- model: opus
- effort: high
- summary: Wrote the package's second half. The create-phase explain route uses `## Explain` fields as the marker. The DECOMP reference covers the outline, bare chapter slices, and the outline gate on the first chapter. The REVIEW reference publishes private with the org key, proves privacy with an anonymous 404, then reads the book in the reader, and fix slices republish. `PATCHES.md` lists every bootstrap edit, line-numbered at `f207775`, and `README.md` is completed. There is no contract edit and no engine change.
- files_changed:
  - works/phases/active/P31/package/claude/skills/create-phase/explain-route.md (new)
  - works/phases/active/P31/package/claude/skills/do-whole-phase/reference/explain-decomposition.md (new)
  - works/phases/active/P31/package/claude/skills/do-whole-phase/reference/explain-review.md (new)
  - works/phases/active/P31/package/PATCHES.md (new)
  - works/phases/active/P31/package/README.md (completed)
  - works/phases/active/P31/phase.md (Decisions, Operator Questions OQ7–OQ11, Notes for later slices, Now)
  - works/phases/active/P31/slices/P31.S4/result.md
- validation:
  - `python3 scripts/workflow.py validate`: PASS, with pre-existing warnings only;
  - `git -C <bootstrap> status --short`: empty before and after, HEAD `f207775`;
  - every `PATCHES.md` line number was re-grepped at `f207775`;
  - no product code was touched.
- deviations: none from the pinned decisions. The plan left five choices open, and each is recorded in `phase.md` as a decided OQ (OQ7–OQ11). `PATCHES.md` also goes beyond the "done when" list: the review carve-out sits beside the pointer in `review-phase` and in both executor bodies, the decomposition twins carry the explain gate, and the READMEs list the critic (OQ11).
- doc_impact: none. The package is workflow material under `works/`, and no product doc changes.

## What was written

| File | Bytes | What it holds |
|---|---|---|
| `package/claude/skills/create-phase/explain-route.md` | 4,852 | `## The explain route`, in the same prose shape as the docs-phase and QA-sweep routes. It covers the trigger phrases (and that the one-shot stays `/knowledge:explain`), the eight `## Explain` fields asked at step 2, the plugin prerequisite, an example objective, the `## Explain` block for `intent.md`, and "What that `DECOMP` will cut". It does not write workflow mechanics into `intent.md`: the docs route does, which conflicts with step 4.2's "never workflow mechanics" |
| `package/.../reference/explain-decomposition.md` | 7,299 | Before planning: check `## Explain` (a gap is a `pending` decision), locate the skill (≥ 0.5.0, else `operator-action`), estimate from the meter. The plan asks the executor to research the subject, write `book/outline.md` (every field the plan pins, plus a defined-terms list and out-of-scope), cut bare slices, and update `phase.md`. Then the outline gate: `accept-gate --require`, the first chapter slice `pending`, the report by the stop rules, and accept or feedback (attempt n). It ends with how each chapter's `plan.md` is drawn from the outline |
| `package/.../reference/explain-review.md` | 7,691 | The publish carve-out, stated explicitly. Eight steps: validate the chapters, read the whole book, decide disputes, check, publish private (the org key, never master or tenant #1; the anonymous-404 proof after the first chapter; §5.1 on transport failure), read in the reader (manifest instrument and agent account; a member sign-in is needed), the gate stages mapped onto a book, and the return (walkthrough, deferred translation jobs). Then: fix slices republish, and what happens after a pass |
| `package/PATCHES.md` | ~24 KB | 0. P30 crosswalk; 1. create-phase (1a step 2, 1b step 4.2, 1c the route); 2–3. both do-* special lines, with byte budgets; 4. decomposition twins; 5. review twins and `review-phase`; 6. the pointer table, every file; 7. `build.py`; 8. `main.py`; 9. engine (none) and counts; 10. seed doc and READMEs; 11. smoke tests (11a fresh critic, 11b DUAL_FIXED, 11c prose pins, 11d already covered, 11e P30's); 12. CHANGELOG draft with migration notes; 13. the release rule; 14. verification |
| `package/README.md` | 5,581 | What the package is; the file map (S3's two files, S4's two references, the route text marked as not a file, and `PATCHES.md` marked as not shipped); the apply order; the minimums |

Every reference cites the plugin skill by section (§1, §2, §3, §4.7, §4.8, §4.9, §5, §5.1) and copies none of it.

## Facts re-grepped at bootstrap HEAD `f207775`

- **create-phase `SKILL.md`** is 96 lines:
  - the step 2 docs paragraph is at L29, and `3. **Confirm.**` at L31;
  - the `## Design Style` bullet runs L52–58;
  - the QA-sweep route runs L92–96 and ends the file.
- **The `do-*` cores:**
  - `do-whole-phase/SKILL.md` L25 is the special-slice line, at 7,327 B;
  - `do-next-slice/SKILL.md` L33–38 hold the special-slice bullets, at 7,984 B.
  - The smoke suite caps both at **8,192 B** (L136), and requires that a core names every shipped `reference/*.md` exactly (L131–135, and `skill_tree_ok` L100–104). The do-next-slice bullet was sized to 190 B, which brings it to 8,174 B.
- **The pointer `run /explain for this phase`** appears at:
  - `slice-executor-{mid,high}.md` L40 and L91 (identical in both);
  - `review-phase/SKILL.md` L74;
  - `do-whole-phase/reference/review.md` L4;
  - `do-next-slice/reference/review.md` L3;
  - `installer/payloads/doc_bodies/operations.md` L48–49;
  - `explain/SKILL.md` L29, which P30 deletes;
  - `CHANGELOG.md` L1885 and L2080, which are history.

  It does not appear in `tests/` or `workflow.py`.
- **`build.py`:**
  - `EXPECTED_SKILL_COUNT` L49;
  - `FIXED_LIVE_FILES` L54–71, with design-critic at L60;
  - `SHARED_SKILL_FILES` L77–79.

  The build refuses a shared key that is also a source.
- **`main.py`:**
  - `WORKSPACE_VERSION = 62` L48; `EXPECTED_SKILL_COUNT` L164/L166;
  - `MANAGED_FILES` L185–199 (agents at L193–194); `NESTED_AGENTS` L642;
  - `nested_plan` uses it at L1066/L1101; `nested_rewrite` renames agent tokens in prose;
  - the agent-write comment is at L1484–1488, and the design-critic write at L1493;
  - the summary prints are at L1286–1287 (nested; they count by themselves) and L1822/L1829.
- **`workflow.py`:**
  - `MANAGED_AGENT_FILES` L360–367 (five files) and `ROUTE_AGENT` L355–356 are both left alone;
  - there is no slice delete or rename command, which is why OQ7 exists;
  - `finish-slice` works on any status.
- **Smoke suite:**
  - the design-critic fresh pin is at L1061–1064;
  - `DUAL_FIXED` runs L1758–1769;
  - Test 0's Python block runs L115–860, with the `create_phase` asserts at L159–162;
  - the version check is at L1016–1017.
- **The contract** is 12,281 B against a 12,288 B cap (smoke L819). P31 makes no edit there.

## Choices the plan left open (all in phase.md as decided OQs)

- **OQ7, the re-cut without a delete.**
  - A surviving key keeps its slice.
  - A new chapter is cut with a fractional order.
  - A dropped chapter is closed by the orchestrator with `finish-slice --outcome "dropped: …"`.
  - A retitled chapter keeps its old slice name.
- **OQ8, translations after acceptance.** A translation's `translated_from` needs the original's published version, so no translation slices are cut in DECOMP. The review lists a deferred job for each.
- **OQ9, fix slices republish.** This follows the pinned wording. Each fix makes one private publish, as a new version, and the critic does not re-run.
- **OQ10, privacy and reading.**
  - The review proves privacy after the first publish, with an anonymous 404 on the chapter's `url` and on `by-path`, and stops if either one reads.
  - Reading a private book needs the agent profile signed into the reader as an org member. In the server, members read any visibility (`books_api.py`, `documents_api.py` `_is_publicly_readable`). Without that sign-in the review returns `needs_operator`, never borrowing the operator's profile.
  - The reader's book URL is `<site>/<org>/<project>/books/<book>` (`web/src/app/(public)/[org]/[project]/books/[book]`).
- **OQ11, extra patch targets.** The extra targets are the review carve-out in `review-phase` L74 and the executor bodies at L40, the gate sentence in the decomposition twins, the agent count in the READMEs, and one sentence about explain phases in the seed doc and README.

Smaller choices made inside the files:
- **DECOMP's `## Explain` check.** A missing field is a `pending` decision **before** dispatch, the same pattern as the design-style ask.
- **The skill version.** A plugin older than 0.5.0 is an `operator-action` stop.
- **Slice names.** A chapter slice is named `<key>: <title>`.
- **The first chapter slice.** It is "the first in order", normally `<P>.S1`.
- **The outline.** It adds a defined-terms list (each term defined once, in one chapter) and an out-of-scope list.

## Dead ends and notes

- **Publish carve-out placement.** Putting it only in `explain-review.md` was considered and rejected. The executor bodies say a review writes only docs, `result.md` and `phase.md`, so without the L40 sentence an executor following its own file would refuse to publish.
- **The route file's location.** It sits under `package/claude/skills/create-phase/` to mirror the path, but it is text to insert. Both README and PATCHES 1c warn never to copy it as a file, because the build would ship it as a stray file in the skill directory.
- **Phase-scope.** For an explain phase it should list no product files, since the book lives under `works/`. Stage 4 therefore records "0 inside" and appends no checklist line. S5 and the bootstrap should confirm that `phase-scope` excludes `works/`; if it lists the book files, they are still not regression-checklist surfaces.

## Commands

- `git -C /Users/sugang/projects/personal/bootstrap_agentic_workspace.sh status --short`: empty, before and after.
- `python3 scripts/workflow.py validate`: `Workflow validation passed.` The warnings are pre-existing: the P26 kinds, consolidation owed for P28/P30, stale docs, and oversized doc sections.
- `phase-section` writes:
  - Notes: 4549 → 3801 B (the three consumed S4 notes removed; S4→S5 and S4→S6 added);
  - Decisions: 4073 → 5434 B (one S4 line);
  - Operator Questions: OQ7–OQ11 appended;
  - Now: rewritten.

  `phase.md` is now about 19.6 KB, against a 40 KB budget.
