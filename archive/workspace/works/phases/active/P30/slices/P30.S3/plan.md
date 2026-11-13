# P30.S3 — Native format: Python parser and validator

## Goal

A pure Python module that parses and validates a native chapter (`format: native`, `.md`) into the
normalized block tree P29 S2 settled. It rejects anything outside the contract with a precise,
line-numbered error, and never strips. It also produces the per-block plain-text projection. Ship it with
the shared conformance fixtures (core test 4, Python half).

The module is not wired to any route: S5 wires ingest, and S12 builds the TS renderer from the same
fixtures.

## Read first (just in time)

- `works/phases/active/P30/topics/slice-breakdown.md` → **S3**: the scope checklist.
- P29's contracts, via `python3 scripts/workflow.py phase-section P29 Decisions`. Read only these headings:
  - *S2 Syntax*, *Header*, *Callout*, *Figure*, *Figure row*, *Diagram*, *Custom SVG*, *Code*, *Quiz*,
    *Sources*, *Ids*, *References*;
  - the per-block limits;
  - *Contract details P30 adds* (from the `02-figures`, `03-diagrams`, `04-quiz` and `05-annotations`
    rounds).

  Use `Explore` for the long ones. Where a signed round's `## Build` / `build-prompt.md` adds a field to a
  block (for example a figure's credit, or a quiz item's id rule), the signed round wins for the field's
  existence; the parser accepts it.
- `works/phases/active/P30/phase.md`: `## Decisions`, `## Notes for later slices` (S2's note, the core tests,
  D22) and `## Now`.
- The S2 code for header parsing conventions (`server/documents.py`) and the existing html sanitizing in
  `server/` (if any), so the module's error style matches the API's 422 shape.

## Approach (pinned)

1. **Dependencies:** add `markdown-it-py` and `mdit-py-plugins` (GFM tables, strikethrough, task lists,
   footnotes only if P29 lists them) with `uv add`, pinned as the lockfile records. Use the existing
   `pyyaml` with a YAML 1.2 core-schema loader (no tags, no anchors and aliases, no merge keys), or
   `ruamel.yaml` if pyyaml cannot be held to the 1.2 core schema. Say which in `result.md`.
2. **Module:** a new `server/native/` package:
   - `parse.py` takes source text and returns a block tree, or raises `NativeFormatError(line, col, code,
     message)`;
   - `schema.py` holds the typed-block schemas and limits;
   - `svg.py` holds the allowlist validator: reject, never strip;
   - `ids.py` covers id syntax, assignment and uniqueness;
   - `refs.py` covers the reference schemes `chapter:`, `doc:`, `asset:` and `#id`, syntax only (S5
     resolves them against storage);
   - `project.py` is the per-block plain-text projection.
3. **Raw HTML:** any raw HTML in the markdown (block or inline) is a rejection, per P29. GFM-alert callouts
   (the 6 types) are the only callout syntax. Typed blocks are fenced YAML blocks (`figure`, `figures`,
   `diagram`, `svg`, `quiz`, `sources`), each validated against its schema with every limit enforced.
4. **Output:** a JSON-serializable normalized tree:
   - stable key order;
   - every block with its `id` (assigned or authored) and its `type`;
   - inline content as a small typed list.

   The tree is the contract S12's TS renderer consumes, so document it in a short
   `server/native/README.md`: field names, types and an example.
5. **Projection:** `project.py` maps each block to the exact plain text that offsets (annotations, S9) are
   measured against. The rules are in P29 *Anchors* / *Ids*: whitespace collapse, what a code block, a
   table cell, a quiz or a figure caption contributes. Write them down in the README; S12 reimplements them
   byte for byte.
6. **Conformance fixtures:** `tests/fixtures/native/`. Each case is a source `.md` plus the expected tree
   `.json` plus the expected projection `.txt`, or the expected error `.err`. Cover:
   - every block type and every callout type;
   - Korean text;
   - ids authored and assigned;
   - each reference scheme;
   - the limit edges (at the limit, and one over);
   - raw HTML in each position;
   - an SVG with a disallowed element, a disallowed attribute and an external reference, each rejected.

   S12 runs the same directory from TS, so keep the fixtures language-neutral.

## Tests (core)

`tests/test_native_format.py` runs every fixture: the tree equals `.json`, the projection equals `.txt`,
and errors match `.err`. Add a few direct tests for the SVG allowlist's rejection cases. Nothing else.

## Out of scope

- Wiring to `POST /api/documents`, and search, MCP and html→native (S5).
- Resolving references against storage, and assets (S4/S5).
- The TS renderer (S12).
- Any web change.

## Validation

- `uv run pytest -q`, the whole suite, with Postgres via `KB_TEST_DATABASE_URL` as S2 did if the
  container is up; otherwise report the skips.
- `python3 scripts/skills_parity.py` fails as known (A3, S7).
- `python3 scripts/workflow.py validate`.
- `git diff --stat -- web/` empty.

## Notebook

- `phase.md`:
  - `## Doc impact`: `data.md` (the native format and the tree), `backend.md` (`server/native/`), and a
    `decisions.md` ADR line (reject-not-strip; markdown-it-py; the projection as the anchor basis).
  - `## Notes for later slices`: for S5 and S12, the module API, the fixture path and the README.
  - `## Now`.
- `result.md`: verdict block first.

**Unattended run:** the operator said "skip the blockers, everything do as your recommendation". Settle an
open choice by P29's recommendation or the stricter option. Record it on `## Operator Questions` as
`decided: …`, and return `done`. Return `blocked` only for a real impediment.

## Dispatch

slice=P30.S3
phase=P30
kind=implementation
risk=high
attempt=1
route=high
reason=risk high (not low)
tier=high
subagent_type=slice-executor-high
model=opus
pass_model=yes
effort=high
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=high
