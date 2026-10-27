# P33-n3.DECOMP — result

- status: done
- route: high
- model: opus
- effort: xhigh
- summary: Cut P33-n3 into a declared chain of two: S1 (re-rated high for wide blast radius, then open design) rewrites the explain skill into the explain-phase front door, with its two parity copies and the five regenerated agents; S2 (low, mid row) covers the plugin's outer surface and version 0.7.0. Wrote the breakdown and the citation map, which is the rewrite's interface contract (186 citations, plus a heading check that passes on 0.6.0), and raised one operator question about the landing's framing.
- files_changed: works/phases/active/P33-n3/topics/breakdown.md (new); works/phases/active/P33-n3/topics/citations.md (new); works/phases/active/P33-n3/slices/P33-n3.S2/slice.json (new, by `new-slice`); works/phases/active/P33-n3/slices/P33-n3.S1/slice.json (`risk` low → high; `depends_on` declared none by `set-slice-deps`); works/phases/active/P33-n3/phase.md (Decisions ×3, Operator Questions OQ1, Notes ×3, Now; the Slices table regenerated); works/phases/active/P33-n3/slices/P33-n3.DECOMP/result.md; engine-regenerated: works/backlog.md, works/index.json, works/events.jsonl
- validation: `python3 scripts/workflow.py validate` passed (warnings are pre-existing: P22/P26 legacy kinds, consolidation owed by P28–P32, oversized doc sections); `python3 scripts/workflow.py parallel-plan P33-n3` → `DECOMP -> S1 -> S2 -> REVIEW`; `python3 scripts/skills_parity.py` PASS and `python3 scripts/plugin_parity.py` exit 0 (baseline); the citation check in topics/citations.md → `citations checked=186 missing=0` on 0.6.0
- deviations: (1) There is no `set-slice-risk` command, so I re-rated S1 the way `do-whole-phase/reference/dispatch.md` describes: the one `risk` field in its `slice.json`, then the table regenerated (`new-slice` rebuilt it). (2) S2's set is wider than the plan's sketch. It adds the root `README.md` (its plugin paragraph tells installers to just run `/knowledge:explain`) and `web/src/content/marketing/content.ts` (the landing's hardcoded "2,635" line count, which a P32 regression line pins to `wc -l web/public/SKILL.md`). (3) S1's set adds `.agents/skills/explain/SKILL.md` and `web/public/SKILL.md`, which the plan did not name: `scripts/skills_parity.py` (CI) holds them in byte parity with the canonical file.
- doc_impact: none (the cut changes no durable truth; the expected notes are listed below for S1 and S2)
- parallel: `parallel_plan=P33-n3: DECOMP -> S1 -> S2 -> REVIEW`, 4 rounds for 4 open slices, a chain. It is a chain because S2's README states what S1 decides (flags, the dossier, the permission paths) and S2's landing count is S1's final line count. One thing would unlock a round: splitting S2's S1-independent half (the manifests' descriptions, the setup skill, the KB template page) to run beside S1, since its set is disjoint. Recommended against: it would save about 10 minutes and cost a slice's overhead.
- acceptance gate (recommendation): `--require`. `/knowledge:explain` behaves differently for the operator: one confirmation, a hand-off to an explain phase, refusals without a v86 workspace, a resume or v2 offer on a repeat. The README and marketplace text change, and the landing's skill pane renders the new file. The walkthrough can try the front door before any push with `claude --plugin-dir ./plugin`.

## What I read

- `intent.md`; handoff §1–§3.6 and §6–§9 (`works/phases/active/P-9sz6/handoff.md`); create-phase *The explain route* and *A confirmed proposal*; `do-whole-phase/reference/explain-decomposition.md` whole, and the citing passages of `explain-chapter.md` and `explain-review.md`; `reference/decomposition.md` and `dispatch.md`.
- The plugin skill by its headings, then read directly: the run card and §1 (L1–180), §2's dossier part, §3.1's head, §3.3, §4.9–§4.10, §6–§9.1, B5's head and *Confirm mode*, and §9.3.
- The outer surface: `plugin/README.md`, both manifests, `plugin/skills/setup/SKILL.md` (by grep), the KB template pages, `scripts/skills_parity.py`, `scripts/plugin_parity.py`, `.github/workflows/plugin-ci.yml`, the landing's `FEATURE_SKILL` (`web/src/content/marketing/content.ts`), and qa's regression checklist P32 lines.

## Findings that shaped the cut

- **Three shipped copies, CI-gated.** `scripts/skills_parity.py` holds `plugin/skills/explain/SKILL.md`, `.agents/skills/explain/SKILL.md` (body) and `web/public/SKILL.md` (full file) in byte parity, and regenerates the five `plugin/agents/*.md` bodies from Part B. So S1's set is all eight files, and the critic agent changes when B5's confirm mode goes.
- **The run card's heading is cited** (`explain-decomposition.md` L22, L131: a lead reads "its run card (*The run, in one card*)"). The intent's citation list leaves it out, so the front door cannot simply replace the card: the card keeps its heading as the stage map. This is open-design item 1 in S1's block.
- **§3.3's heading, §9.1's size test and §7's number** must survive even though the parts named for them go. Citers expect §3.3's resume note (`trust`, `drop`) and its exact heading, and they expect §9.1's test (b) and the report's book suggestion. §7 is uncited, but §8 and §9 are, so §7 keeps its number.
- **`<TOOLS>` is tied to `KB_EXPLAIN_STATE`.** The preflight's permission block, the `allowed-tools` pagetext pattern and README's `<ROOT>` all use it. Removing the out-of-repo dossier therefore leaves a real choice about where the converter lives (open-design item 2; recommended: keep it there, so operators' existing manual rules stay valid).
- **§1's book rules vs create-phase.** 0.6.0 puts a whole-phase *chapter* in the `phases` book (key `p<N>`). v86 create-phase L118 cites "§1's rules" for a phase subject's *book* `p<N>`. Both can hold, and S1 must state both.
- **The landing counts the skill's lines** ("2,635-line skill", `pane.meta`). A P32 checklist line requires them to equal `wc -l web/public/SKILL.md`, so S2 updates them. The landing's framing ("Copy it straight into your agent … everything the agent needs, offline"; "ships for Codex under `.agents/`") becomes an overpromise once a workspace is required. That is OQ1 (it contradicts the operator's "workspace required" decision), not a silent edit.
- **README heading cited:** create-phase L135 cites *Explain: permissions and the search cap* in the plugin README, so S2 keeps it.
- **The stale vendored `.claude/skills/explain/`** (an old `/explain`, last synced at v61) is not a citer and not in scope. P32 d06 left it untouched, and the v86 installer leaves it "until its owner deletes it". Decided as drawn, and the review lists its deletion as a deferred-job candidate.
- **Three P32 regression lines test the removed engine**: a `quick` document under `claude -p`, the 15-minute repeat, and `book` under `claude -p` outside a workspace. They sit inside the phase's boundary and will fail by design. That note is left for the review.

## Doc impact the slices should record (not written by DECOMP)

- decisions.md: `/knowledge:explain` no longer runs a document on its own engine; every explain is an explain phase behind one confirmation (supersedes P32's single-document engine). Owner: S1.
- product.md and architecture.md: the plugin's explain is a front door plus the method library, the dossier is inside the phase folder, and it needs workspace v86+. Owner: S1 (S2 for the README-level wording).
- operations.md: plugin release 0.7.0; the manual-mode permission paths if `<ROOT>` or `<TOOLS>` change. Owner: S2.
- qa.md: no PASS-count change expected. The superseded P32 checklist lines are the review's gate section.

## Engine commands run

```
sed (slice.json risk low → high)                        # P33-n3.S1, the one field
python3 scripts/workflow.py set-slice-deps P33-n3.S1 --depends-on none
python3 scripts/workflow.py new-slice --phase P33-n3 --slice P33-n3.S2 \
  --name "Say it on the plugin's outer surface and bump it to 0.7.0" \
  --kind implementation --risk low --order 20 --depends-on P33-n3.S1
python3 scripts/workflow.py parallel-plan P33-n3        # DECOMP -> S1 -> S2 -> REVIEW
python3 scripts/workflow.py executor-route P33-n3.S1    # route=high
python3 scripts/workflow.py executor-route P33-n3.S2    # route=mid
python3 scripts/workflow.py validate                    # passed
```

The `phase.md` entries are on disk (`## Decisions` 1–3, OQ1, `## Notes for later slices` 1–3, `## Now`). They are referenced here, not restated.
