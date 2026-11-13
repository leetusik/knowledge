# P31 slice breakdown (P31.DECOMP)

Cut by P31.DECOMP from the operator-approved plan, unchanged in shape. Slices run by `order`; `depends_on` is advisory.
Routes are what `executor-route` prints today (this repo's `cheap` row inherits mid, so qa/docs low run on sonnet).

| Slice | Kind / risk → route | Trigger (high only) | Covers |
|---|---|---|---|
| `P31.S1` knowledge check | implementation / **high** → high (opus) | **core invariant** (a check must never write) + **wide blast radius** (it shares `create_document`'s validation, the one write path) | Factor `create_document`'s checks (`server/main.py` L923–1247) into one function both paths call; a dry run (`POST /api/documents/check` or a `check: true` field — S1 chooses) returning the real 422/409 shapes and `{ok, violations, warnings}`, never taking `WRITE_LOCK`, never writing; CLI `knowledge check FILE` with `save`'s flags, printed through `native.rejected_message`, exit 0 ok / 1 violations. Two tiny core tests: a check writes nothing; check and POST agree on the error fixtures. |
| `P31.S2` skill uses it | implementation / low → mid (sonnet) | — | `plugin/skills/explain/SKILL.md` §4.8 runs `knowledge check` before §5 publish (curl form too, for when the CLI is absent or old); three parity copies in step; plugin 0.4.0 → 0.5.0; `skills_parity` + `plugin_parity` pass. |
| `P31.S3` critic + chapter procedure | implementation / **high** → high (opus) | **open design**: a new agent and a new multi-span procedure | `package/claude/agents/explain-critic.md` (modelled on `design-critic`: reads, never edits; facts and citations, diagram correctness, quiz tests understanding, against the plugin skill's rules; one critique file; severity + evidence) and the chapter-slice procedure (draft to `book/<key>.md` → `knowledge check` → critic (dispatched by the main thread) → one revision → done). Decides the critic's model routing (see Notes). |
| `P31.S4` route + references | implementation / **high** → high (opus) | **open design**: a new create-phase route and its DECOMP/REVIEW shape | In the package: the explain-route section for `create-phase`; the explain DECOMP reference (research → `book/outline.md` → outline `pending` gate the operator signs → one bare chapter slice each); the explain REVIEW reference (whole-book read, `knowledge check` every chapter, publish every chapter private, read it in the real reader, walkthrough); patch notes for `build.py`, `main.py`, counts and the `/knowledge:explain` review pointer. |
| `P31.S5` rehearsal | qa / low → cheap (= mid, sonnet) | — | Run the package as written on **one sample chapter** in the scratchpad against a scratch API: draft, `knowledge check`, explain-critic (dispatched by the orchestrator), one revision. Never published. Report where the procedure was unclear and fix the package text. |
| `P31.S6` handoff | docs / low → cheap (= mid, sonnet) | — | Write `works/phases/active/P31/handoff-explain.md`: P30's retire-and-pointer steps carried forward (re-pinned to bootstrap HEAD), plus "apply the package" file by file into `payload/`, with build/install registration, tests and CHANGELOG. |
| `P31.REVIEW` | review / high → high (opus) | kind | Gated: `knowledge check` on a real chapter, the package and the handoff read; routes OQ1 (the S1 deploy). |

## Estimate (dispatch-summary `means`, 2026-10-21)

Per slice by kind: implementation $9.97 / 29.6 span-min; qa $14.23 / 53.8; docs $1.37 / 4.4 (one sample — the
handoff is bigger, so priced at a mid span, $3.94 / 24.7); review $12.59 / 49.3. Critic span for S5: a design-critic
span is $6.84 / 80 min, an explain-critic on one chapter should be well under that; priced at ~$4 / 20 min.

| | $ | span-min |
|---|---|---|
| S1, S3, S4 (3 × implementation) | ~30 | ~90 |
| S2 (implementation, mid) | ~6–10 | ~25–30 |
| S5 (qa + one critic span) | ~18 | ~75 |
| S6 (docs, priced as a mid span) | ~4 | ~25 |
| REVIEW | ~13 | ~50 |
| **Total after DECOMP** | **~$70–75** | **~4.5 span-hours** |

Plus the main thread's planning and commits (not metered per slice). The S1 production deploy is not in this figure:
it waits for the operator's word (OQ1).
