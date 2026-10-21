# P31 package: the explain phase, for the bootstrap

A ready-to-apply package for the bootstrap (workflow) repo. Paths here mirror the bootstrap's `payload/`:
`package/<path>` goes to `payload/<path>`. Prepared in this repo by phase P31; the operator relays it, and
`works/phases/active/P31/handoff-explain.md` (P31.S6) tells the bootstrap agent how to apply it.

**Stub (P31.S3).** P31.S4 completes this file: the create-phase explain route, the decomposition and review
references, and the install patch notes.

| File | Goes to | What it is | Slice |
|---|---|---|---|
| `claude/agents/explain-critic.md` | `payload/claude/agents/explain-critic.md` (new) | The fresh-eyes critic for one drafted chapter: one pass, one critique file, never edits | P31.S3 |
| `claude/skills/do-whole-phase/reference/explain-chapter.md` | `payload/claude/skills/do-whole-phase/reference/explain-chapter.md` (new) | A chapter slice's three spans (executor drafts and checks, orchestrator dispatches the critic, executor revises once) and the critic's model rule | P31.S3 |

Neither file changes the engine: the critic has no route-table row, and the orchestrator picks its model per
call (always different from the chapter executor's). Both need the knowledge plugin's explain skill at 0.5.0 or
later (its §4.9 `knowledge check`), and refer to it by section rather than copying it.
