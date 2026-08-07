# Plan — P26.S5 (Knowledge: why it is this way, and how to change it)

## What this slice is

**Explainer 5 of 5 — the last in the series.** One `/explain` run, published to the KB as project
`knowledge`. No repo source changes. Run **inline on the main thread** (`phase.md` §Constraints 1).

## The question this explainer answers

*Why does it look like this, and how do I change it?* S1–S4 described a system. S5 explains the
reasoning that produced it and hands the reader the machinery for making the next change.

## What makes this slice different

The other four explain a **system**. This one explains a **process** — and it has two halves that
must connect rather than sit side by side:

1. **The decision record** — the `D-*` entries across P1→P25 (1,230 lines): what was chosen, what was
   rejected, and what each choice *cost*.
2. **The agentic workspace** — phases → slices → review, the orchestrator/executor split,
   doc versioning at the review, and `intent.md` as the record of what was asked.

The connection is the point: the workspace is *why* a decision record exists at all. Durable docs are
versioned once per phase at the review, so `decisions.md` is not a file someone remembered to update
— it is an artifact the process forces into existence. Say that plainly.

## Series framing — and the close

Part 5 of 5. It carries the series' ending, so:

- Do **not** re-explain S1–S4. Reference them; the reader has them.
- Close the loop the series opened. S2 showed that these documents travel the write path into the
  repo they describe; S5 should note that the *phase producing them* is itself a phase in the
  workspace it describes, with an `intent.md` recording the operator's request. Do this in one
  restrained paragraph — it is a closing note, not a new theme.
- End with something a new maintainer can act on: how to make a change here.

## Sources to cover

Per `phase.md` §*Sources per knowledge topic* → **S5**:

- **Docs:** `decisions.md` (all 1,230 lines — every `D-*` / ADR entry P2 → P25), the `## Status`
  header of each `docs/current/*.md`, the `## Open Questions` sections, `docs/index.json` (the version
  trail), `docs/README.md` (the doc-versioning rules).
- **Files:** `works/backlog.md` + `works/deferred.md`, `works/phases/archived/` (phase **names**
  only — do **not** deep-read archived slices), the still-active done phases P21–P25,
  `CLAUDE.md` / `AGENTS.md`, `scripts/workflow.py`, `.claude/skills/` + `.agents/skills/`,
  `.claude/agents/` + `.codex/agents/`, `executors.toml`.

Read `decisions.md` by **selecting**, not sequentially: pull the handful of decisions that still
shape daily work and tell those properly. A list of thirty ADR titles teaches nothing.

## Debts inherited from earlier slices — all of them land here

- **From S2:** the two-implementations config seam — why accepting two independent resolvers that
  *cannot* be merged was correct, and what it costs.
- **From S3:** the design-provenance discipline — why a design round's record must not be
  retro-edited, and why the three on-token extensions are quarantined rather than merged in.
- **From S4:** three decisions named there as facts, to be justified here — **no PyPI publish**, the
  **pinned un-revokable master bearer**, and **mirror-don't-narrow** for the open-core template.

## Anchors the explainer must land

- **The defining decisions and what they cost** — disk-canonical/DB-disposable; two deployments, one
  codebase; mirror rather than narrow; proxy-and-forward-bearer for MCP; opaque-origin render instead
  of sanitizing; a durable org slug in the accounts plane; no PyPI (with a curl installer instead).
  For each: the alternative that was rejected and the price actually paid.
- **The honest current state** — live and multi-tenant; monetization not built; org creation and
  invites deferred; anonymous-read rate limiting deferred; known pre-existing test failures. A
  maintainer needs the real inventory, not the marketing one.
- **The workspace** — backlog routes, the slice folder explains, the result summarizes, docs are
  versioned durable truth; phases → slices → review; the orchestrator plans/commits while a dispatched
  executor does the work; **doc versioning happens once per phase, at the review**, which is what
  makes `docs/current/` trustworthy; `intent.md` as the confirmed record of what the operator asked.
- **The archive rule** — `active/` does not mean in-flight. A passing review marks a phase `done` but
  leaves it in `active/`; archiving is a separate manual step. Five done phases (P21–P25) are sitting
  there right now. Say so, so nobody misreads the directory.
- **How to change something** — the practical close: make a phase, capture intent, decompose, work
  slices, review, version the docs.

## Invocation

Topic mode, no trailing flags; judgment gate decides research and **record the outcome**. A skip is
plausible (repo-private process and history — vocky's equivalent slice skipped by judgment); ADR
practice and doc-versioning have some external surface. Do not force either way.

## Constraints

Inherited from `phase.md` §Constraints: no `here` flag; no repo source changes; verify with `curl`;
`git pull --rebase` after the save, before committing.

One accuracy note from the survey: `.claude/agents/` and `.codex/agents/` still carry a
`slice-executor-low` file although the contract describes only two tiers. Cosmetic workspace drift —
**do not describe three tiers**, and do not fix it here.

## Done when

- Published (201 recorded) and verified with one `curl` GET.
- `result.md` records the topic, identifiers, research outcome, whether the inherited debts from
  S2/S3/S4 were all discharged, and anything `P26.REVIEW` should weigh.
- Cross-slice note appended to `phase.md`; `validate` passes.
