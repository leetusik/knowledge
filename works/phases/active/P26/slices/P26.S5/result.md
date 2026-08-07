# Result — P26.S5 (Knowledge: why it is this way, and how to change it)

**Explainer 5 of 5 published — the series is complete.** Run inline by the orchestrator per
`phase.md` §Constraints 1.

## What landed

| | |
|---|---|
| Document id | **33** |
| Version | **1** (`PRIOR=none`) |
| Title | Why Knowledge Is This Way, and How to Change It |
| `rel_path` | `knowledge/2026-08-08-why-knowledge-is-this-way-and-how-to-change-it.html` |
| URL | `https://knowledge.hi2vi.com/@leetusik/knowledge/why-knowledge-is-this-way-and-how-to-change-it` |
| Tags | `decision-record`, `agentic-workspace`, `adr`, `process`, `new-maintainer` |
| Extracted text | 17,730 chars |

`committed: true` (`9e8e6a4e`), `pushed: false` + `push_pending: true` (normal).

## The series, verified end to end

`GET /api/documents?project=knowledge&limit=50` → **`total: 5`**, all v1, in reading order:

| id | title |
|---|---|
| 29 | Knowledge: What It Is and How It Is Used |
| 30 | Knowledge System Internals: The Content Plane, the Write Path, and the Contracts |
| 31 | Knowledge's Read Surfaces: Two Front Ends, One Corpus |
| 32 | Shipping and Running Knowledge: Distribution, the Edge, Security, and the Gates |
| 33 | Why Knowledge Is This Way, and How to Change It |

## Research section: **included**

Two pages on `adr.github.io` opened and cited with the bare domain in plain text: the definitions of
an architectural decision record and a decision log, and the template catalogue's listing of the
Michael Nygard template's five components (Title, Status, Context, Decision, Consequences).

This produced a genuinely useful comparison rather than a compliment. Every entry in
`decisions.md` carries all five **plus two more**: an explicit **"Alternatives considered"** field
(which makes the road not taken retrievable rather than inferred from Context — the single most
useful field for someone contemplating a change) and a **"Source"** pointer back to the slice and
`result.md` that produced the decision (traceability the workspace gives away for free).

The **divergence** is the file model: standard ADR practice is one immutable numbered file per
decision; this project keeps one appended log inside a versioned document track. Given up: a stable
per-decision URL and per-decision revision history. Gained: decisions version in lockstep with the
ten other tracks they constrain, consolidated in one act at the review — where a per-file scheme
would have needed its own separate discipline, which is exactly the discipline that decays.

## All three inherited debts discharged

| from | debt | how it landed |
|---|---|---|
| **S2** | the two-implementations config seam — *why* accepting two unmergeable resolvers was correct, and what it costs | Own subsection: the skill is the self-host path, the CLI the hosted path, neither may depend on the other's presence; cost paid honestly as a permanent drift risk with a pinned test; ends on the maintainer's rule — *edit either side, edit both*. Also became next step 4. |
| **S3** | design-provenance — why a design round's record must not be retro-edited | Framed as a **truthfulness constraint about who decided what**, not tidiness: editing the mirrored canvas would forge a decision the round never made. Paired with the "the agent does not design; it integrates" ADR. |
| **S4** | three decisions named as facts, to be justified: no PyPI, the pinned master bearer, mirror-don't-narrow | All three told in the alternatives-and-cost shape, with what each **bought**: zero release ceremony; a frozen contract surviving the multi-tenant migration with zero consumer changes; one server instead of two. |

## Structural choices worth recording

1. **The two halves are joined, not adjacent.** The decision record exists *because* of the
   workspace: doc versioning is a required step of the phase review, so `decisions.md` is an artifact
   the process forces into existence rather than a file someone remembered to update. Stated up front,
   because it changes how a reader should trust every other document in the series.
2. **The entries are told backwards** — alternatives first, consequences second, decision last —
   since the choice itself is already visible in the code, and a change usually amounts to
   re-litigating an old rejection.
3. **The series closes on the loop, in one restrained paragraph** (as the plan asked): the phase that
   produced these documents is itself a phase in the workspace they describe, with its own
   `intent.md`. "The process documented here is the process that produced the documentation."
4. **The `active/` ≠ in-flight trap and `pending` ≠ `blocked` both got callouts**, because both are
   states a new maintainer will misread from the directory listing alone.

## Accuracy note honored

The plan flagged that `.claude/agents/` and `.codex/agents/` still carry a `slice-executor-low` file
although the contract describes only two tiers. **The explainer describes two tiers**, not three, and
the stale file is instead raised as **next step 3** — framed as exactly the failure the workspace's
own claim is meant to prevent (a maintainer reading three tiers where two exist). Not fixed here;
this slice writes no code.

## For `P26.REVIEW`

- The four proposed next steps in this document are actionable and cheap: archive the five finished
  phases, sweep the deferred triggers (at least two have plausibly already fired — D17 and D23),
  retire the stale executor-tier file, and give the config seam a shared conformance fixture.
- S4's "do not re-split" recommendation stands and should be weighed by the review/operator.

## Doc impact

**None** — by construction.
