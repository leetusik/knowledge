# Engine commands not run (no engine in this scratch workspace)

## P90.DECOMP (attempt 2), slice-executor
- `python3 scripts/workflow.py new-slice --phase P90 --slice P90.S1 --name "how-wal-works: How SQLite's write-ahead log works" --kind implementation --risk high --order 10` — cut chapter 1's bare slice (explain-decomposition.md step 5: risk high for open design, undeclared, no plan.md)
- `python3 scripts/workflow.py new-slice --phase P90 --slice P90.S2 --name "running-wal: Running SQLite in WAL mode in production" --kind implementation --risk high --order 20` — cut chapter 2's bare slice (same rule; undeclared, so it never runs in a wave)
- `python3 workflow/scripts/workflow.py phase-section P90 Decisions --replace` — record the book's decision line (step 6); done with Read and Edit instead, as CLAUDE.md says
- `python3 workflow/scripts/workflow.py phase-section P90 "Breakdown" --replace` — record the chapter breakdown and its one risk trigger (agent file: a decomposition's breakdown goes in phase.md); done with Edit
- `python3 workflow/scripts/workflow.py phase-section P90 "Notes for later slices" --replace` — the defined-terms list, tagged for both chapters (step 6); done with Edit
- `python3 workflow/scripts/workflow.py phase-section P90 Now --replace` — the outline awaits the operator's signature (step 6); done with Edit
- `python3 scripts/workflow.py validate` — a decomposition slice's validation (agent file, Do step 2); not run, no engine

## The outline gate (after P90.DECOMP attempt 2), orchestrator
- `python3 scripts/workflow.py finish-slice P90.DECOMP --outcome "Research run 20261023-1245-sqlite-wal complete (10 researchers, 1 gap round, 63 sources, 286 claims); 2-chapter outline and summary written; P90.S1 and P90.S2 cut"` — the executor returned `done`; close the slice before the gate (explain-decomposition.md, The outline gate); phase.md's Slices table updated by hand
- `python3 scripts/workflow.py accept-gate P90 --require` — declare the acceptance gate; an explain phase never waives (gate step 1)
- `python3 scripts/workflow.py set-slice-status P90.S1 pending --stop-kind decision --on-words "'accept' signs the outline and the chapters run; feedback re-runs DECOMP"` — stop the first chapter at the outline gate (gate step 2); phase.md's Slices table updated by hand
- `python3 scripts/workflow.py validate` — validate before the gate commit (gate step 3); not run, no engine

## The operator's return ("accept") and P90.S1, orchestrator
- `python3 scripts/workflow.py set-slice-status P90.S1 in_progress` — the operator answered "accept", literally: the outline is signed, attempt 2, and the chapters run (explain-decomposition.md, *On the operator's return*); phase.md's Slices table updated by hand
- `python3 workflow/scripts/workflow.py phase-section P90 Decisions --replace` — add the "outline signed, attempt 2" line; done with Edit instead, as CLAUDE.md says
- `python3 scripts/workflow.py executor-route P90.S1` — resolve P90.S1's route once its plan.md is written (dispatch.md (1)); its output, given by the operator, is pinned verbatim in the plan's `## Dispatch`
- `python3 scripts/workflow.py executor-route --explore` — the lookup row (dispatch.md (1)); its `explore_model=haiku` / `explore_effort=xhigh` lines are pinned in the same section

