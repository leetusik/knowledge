# Docs

Durable docs are versioned. Do not patch old versions.

## Categories

- `docs/current/product.md`
- `docs/current/architecture.md`
- `docs/current/operations.md`
- `docs/current/qa.md`
- `docs/current/decisions.md`

## Rules

Doc updates happen in a **docs phase the operator creates** — never per slice. A slice that changes durable truth appends a one-line note to its phase's `## Doc impact` list instead; `python3 scripts/workflow.py docs-debt` prints what is owed, and the docs phase runs the commands below over those notes.

- Read latest docs from `docs/current/*.md`.
- The agent creates updates with `python3 scripts/workflow.py doc-new-version --doc <doc> --summary "..." --source <phase-or-slice>`.
- Edit only the newly created version file under `docs/versions/<doc>/`.
- The agent runs `python3 scripts/workflow.py rebuild-docs` after editing the new version.
- `docs/current/*.md` is generated from the latest version and should not be manually edited.
- When a phase's notes are all consolidated: `python3 scripts/workflow.py docs-consolidated <P>` (that is also what unblocks archiving it).

## Update Triggers

- `product`: goals, users, scope, terminology, business direction, and the user journeys and UX rules the code cannot show
- `architecture`: system boundaries, components, runtime, integrations, and what the code cannot say about its modules, data, API contracts and security model (invariants, ownership, retention, outside contracts, trust boundaries)
- `operations`: env, deployment, local commands, jobs, monitoring, backups, and how the operator runs and views the product
- `qa`: test commands, QA missions, regression checklist, acceptance style
- `decisions`: meaningful choices, tradeoffs, rejected alternatives

These docs are read by agents, which can read the code: write what the code cannot say, and point at the code for the rest. An install made before v79 may also hold `experience`, `frontend`, `backend`, `data`, `api` and `security`: they are retired, kept readable and never versioned again, and their changes go to `product` (experience) or `architecture` (the rest).
