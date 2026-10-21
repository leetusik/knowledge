# P31.DECOMP — result

- status: done
- tier: high
- model: opus
- effort: high
- summary: Cut P31 into six bare middle slices, S1 `knowledge check` (high), S2 skill uses it (low), S3 explain-critic and chapter procedure (high), S4 route and references (high), S5 one-chapter rehearsal (qa low) and S6 handoff (docs low), ahead of the existing gated REVIEW. Recorded six Decisions in `phase.md`, among them publish-first-then-read and "a check never writes"; the slice notes; OQ1 (deploying S1); and the breakdown with an estimate of about $70–75 and 4.5 span-hours.
- files_changed: works/phases/active/P31/slices/P31.S{1..6}/slice.json (via new-slice), works/phases/active/P31/phase.md, works/phases/active/P31/topics/slice-breakdown.md, works/phases/active/P31/slices/P31.DECOMP/result.md
- validation: `python3 scripts/workflow.py validate` passed (pre-existing warnings only); `next` → next_slice=P31.S1; no middle slice has a plan.md; `git diff --stat -- web/ server/ cli/ plugin/` is empty
- deviations: the estimate is about $70–75, not the plan's $55–70, because the qa and review means plus a critic span for S5 are higher than the plan assumed. The handoff location is pinned to P31's folder (the plan said only "update handoff-explain.md"). Two line-number corrections are in Notes (the lock is at L1252, not L1249). The plan's "no engine change" holds only if S3 chooses option (a) (see Findings).
- doc_impact: none

## What was cut

Run `python3 scripts/workflow.py new-slice --phase P31 …` once per slice. The routes below come from `executor-route`:

| Slice | kind / risk | route (model) | order | depends_on |
|---|---|---|---|---|
| P31.S1 knowledge check: dry-run validation endpoint and CLI | implementation / high | high (opus) | 10 | — |
| P31.S2 explain skill runs knowledge check before publishing | implementation / low | mid (sonnet) | 20 | S1 |
| P31.S3 package: explain-critic agent and chapter-slice procedure | implementation / high | high (opus) | 30 | S1 |
| P31.S4 package: explain route, DECOMP and REVIEW references, install patch notes | implementation / high | high (opus) | 40 | S3 |
| P31.S5 rehearse one sample chapter through the package | qa / low | cheap (sonnet: this repo's cheap row inherits mid) | 50 | S4 |
| P31.S6 handoff note: retire old explain and apply the package | docs / low | cheap (sonnet) | 60 | S5 |

The triggers, written beside each slice in `topics/slice-breakdown.md`, are:
- S1 is a core invariant (a check must never write) and has a wide blast radius (it shares the one write path).
- S3 and S4 are open design.

## Phase notebook writes (by reference)

- `## Decisions`, six lines: the cut, publish-first-then-read, private means a private project, a check never writes, the critic is dispatched by the main thread, and the package and handoff locations.
- `## Operator Questions`: OQ1, whether to deploy S1 to knowledge.hi2vi.com.
- `## Notes for later slices`: one note for all slices, then S1, S2, S3+S4 (×2), S4, S5 and S6.
- `## Now`: rewritten.
- Breakdown and estimate: `topics/slice-breakdown.md`.

## Findings beyond the plan's exploration

1. **The critic's model is engine-managed in the bootstrap.**
   - In `payload/scripts/workflow.py` (L337–366), `ROUTE_AGENT` and `MANAGED_AGENT_FILES` tie each managed agent file to a route row. `sync-agents` writes that file's frontmatter, and `CRITIC_ROWS` forces the design critic onto a model different from the drafter's.
   - An `explain-critic` outside that table is an unmanaged agent. So "no engine change" holds only if the agent carries a fixed frontmatter model and the orchestrator passes the model per call.
   - The alternative is patch notes for a new row. This is S3's choice, recorded in Notes.
2. **A slice executor cannot dispatch the critic.** Executors may spawn only `Explore`, so the per-chapter critic has to be dispatched by the main thread between the draft span and the revision span, like a co-work critique step. This is recorded as a Decision.
   - For the S5 rehearsal there is a second problem: the agent is not installed in `.claude/agents/`. The orchestrator has to dispatch a general agent told to follow the package's critic file.
3. **"Private" is a project property.**
   - `projects.visibility` defaults to `"private"` (`server/accounts/types.py` L63–69).
   - A tenant #1 or master-bearer write is public by definition (`server/api_auth.py` L213/243, `ctx.is_public`).
   - So the explain REVIEW must publish with the org credential into a non-public project. Recorded as a Decision.
4. **`create_document` has write-side dependencies outside its body.**
   - `ensure_registry_project` (L814) get-or-creates a Postgres project row.
   - Usage metering runs off `request.state.usage`.
   - A dry-run route must avoid both. Recorded as a Decision and in the S1 note.
5. **The bootstrap HEAD moved.** It is at `f207775` (v62), while P30's handoff was pinned to `7517446` (v61). The `explain` skill is still shipped there, so P30's handoff has not been applied yet. S6 must re-grep the line numbers.
6. **Routing.** This repo's `executors.toml` sets no rows, so `cheap` inherits mid and runs on sonnet, not haiku. S5 and S6 therefore run on the same model the real chapter slices would. The plan's `qa` and `docs` kinds were kept.

## Estimate

From `dispatch-summary` `means`, worked out in `topics/slice-breakdown.md`: about $70–75 and about 4.5 span-hours after DECOMP. This excludes main-thread time and the S1 production deploy, which waits on OQ1.

## Validation output

```
python3 scripts/workflow.py validate  → "Workflow validation passed." (warnings: P26 legacy kinds, P28/P30 consolidation owed, stale docs, oversized doc sections — all pre-existing)
python3 scripts/workflow.py next      → current_slice=P31.DECOMP, next_slice=P31.S1
git diff --stat -- web/ server/ cli/ plugin/  → (empty)
```
