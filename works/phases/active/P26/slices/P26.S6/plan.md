# Plan — P26.S6 (Audit and refresh README.md)

## What this slice is

The phase's **only repo-file change**: audit the 84-line `README.md` against current reality and fix
what is stale, wrong, or missing.

**This is an audit-and-fix, NOT a rewrite.** The file's section structure must survive intact:

```
# Knowledge Base  →  headline links + lede
## Install the plugin
## Command-line interface
## How it's built
## Recreating from scratch
## Agentic workflow
```

Keep those six sections, in that order, with their voice. You are correcting and filling gaps inside
them — not restructuring, not expanding the file into a product brochure. A reasonable outcome is a
file in the same size class (~84 lines, plausibly 95–110 after the genuine gaps are filled), not one
twice as long.

## Why the file is stale

`README.md` was last edited at **P13** (`1fa9bfd`). Twelve phases have landed since (P14–P25) and it
still describes the P9–P13 regime.

## The work list

`works/phases/active/P26/phase.md` §*Already-spotted README staleness* has **eleven pre-recorded,
verified items**. **Read that section and work it.** It is the audit's input; it is not exhaustive,
but it is precise, and several items were verified live against production. Highlights:

- **Item 1 is the most urgent** — the README's very first link,
  `https://knowledge.hi2vi.com/graph/`, sends an anonymous reader to a **sign-in wall** (verified
  `308 → /graph → 200 .../login`), and the "library index" link now points at the marketing landing.
- **Item 3** — the hosted web app, the product's primary human surface, is **absent from the file
  entirely**.
- **Items 4, 5, 6** — P25 pretty share URLs, the MCP retrieval service, and P20's curl installer +
  published `/SKILL.md` are all missing.
- **Items 2, 7, 8, 9, 10** — factual corrections inside "How it's built" and "Recreating from
  scratch" (retired mkdocs-at-root topology, hybrid search understated as FTS5, "Nothing publishes
  until I push" no longer true of the hosted box, the graph bullet describing only the retired static
  map, `docker compose up -d` now also starting Postgres).
- **Item 11** — cross-check the still-plausible claims before editing.

## Ground every claim

Verify against `docs/current/product.md` and `docs/current/operations.md` (and `compose.prod.yml` /
`deploy/knowledge.conf` where a topology claim is involved) rather than trusting the item list alone.
The list was compiled during decomposition and is good, but this slice is the one that writes the
words — check before you write.

For anything reachable, a single `curl -sS -o /dev/null -w '%{http_code}'` against the live site is
cheaper than reasoning about it. **Never verify with Python `urllib`** — the edge answers 403 to its
user-agent (`phase.md` §Constraints 3).

## Explicitly out of scope

- **Do not touch `docs/current/*.md`.** Widening the audit into the durable docs was explicitly
  declined by the operator (`intent.md`, `phase.md` §Constraints 7). If you find drift there, record
  it as a note — do not fix it.
- **Do not run `doc-new-version`.** Durable docs are versioned once per phase, at the review.
- **Do not touch any other repo file**, including `plugin/README.md` and `cli/README.md`. They are
  separate files with their own audiences and are not in this slice's scope.
- No code changes anywhere.

## The doc-impact call — decide it explicitly

`phase.md` §Open Questions asks whether the README audit rises to a **durable-truth change**.

The expectation is **no**: `README.md` is not under `docs/`, and items 2, 3, 7 and 8 touch facts that
`operations.md` and `product.md` already state correctly — so the audit pulls the README **up to** the
durable docs rather than surfacing new truth. **But decide it yourself and record it either way** in
`result.md`, and append the corresponding line to `phase.md`'s *Doc impact* list. If you find a fact
the durable docs get *wrong*, that **is** a doc-impact note for `P26.REVIEW` to consolidate — write
the note, do not fix the doc.

## Validation

- `git diff --stat README.md` — the blast radius is one file.
- Grep the file for each corrected claim to prove the old wording is gone and the new one is present.
- Every URL the README states should be checked with `curl` for its actual status code, including the
  ones you write.
- Every command the README names must exist (check `Makefile` targets, the compose service names, and
  the plugin/CLI install lines against their real sources).

## Done when

- `README.md` is corrected, the six sections intact, in the same size class.
- `result.md` records: what changed per item, what was verified and how, the explicit doc-impact
  decision, and anything found but deliberately left alone.
- A cross-slice note is appended to `phase.md`, including the *Doc impact* line.
- `python3 scripts/workflow.py validate` passes.
- **Do not commit** and do not change any slice or phase status — the orchestrator does both.
