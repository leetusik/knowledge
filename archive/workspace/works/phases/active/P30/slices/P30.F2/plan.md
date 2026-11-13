# P30.F2 — Native parser fixes on both halves (Python + TS)

## Why

S12's port and differential probe found three defects in the shipped native parser (S3). Each lives in both
halves, which core test 4 keeps byte-identical, so both are fixed together in one slice, along with the
fixtures. The operator's standing instruction is to do as recommended. S12 recommended fixing these before
the chart slice (OQ46 and `slices/P30.S12/result.md` §observations 1–2).

## Do

1. **Chart type key (OQ46):**
   - Today a top-level chart's own `type` (`bar|line|interval`) overwrites the block's `type: "diagram"`
     (`block.update(check_diagram(...))` in `server/native/schema.py` or `parse.py`).
   - Fix it so the block keeps `type: "diagram"` and the chart's kind moves to its own key (`chart`, as OQ46
     suggests), matching the README's tree.
   - Update `server/native/README.md` where the tree is described, and the fixtures that encode the quirk
     (`tests/fixtures/native/diagrams-rows.json`, `limits-at.json`, and any other).
   - Update the TS port (`web/src/lib/native/schema.ts` / `parse.ts`), and update `render.tsx`'s interim
     `kind: "chart"` workaround to read the new key.
2. **Quiz `answer: [[a]]` 500 → 422:** in `schema._quiz_item`, a non-string answer must produce one
   proper violation (422, with its line), never a `TypeError`. Mirror it in TS. Add a reject fixture
   (`.md` + `.err`).
3. **Trailing-newline ids:** `ids.ID_RE`, `refs` and every server slug or id validator using
   `re.match(r"^…$")` must use `re.fullmatch` (or `\Z`). Then a YAML block-scalar id (`"s1\n"`) is
   refused with the normal id violation. Mirror it in TS by dropping `pyutil.pyFullMatch`'s
   newline-tolerant behaviour.
   - Grep the server for the same `^…$` pattern in other id and slug validators, such as `books.py`,
     `native_ingest.py`, `reader_api.py` and `documents.py`. Fix those that validate ids, slugs or keys,
     where a trailing newline must not pass.
   - Add a reject fixture.
4. Mirror every changed server file and fixture into `plugin/templates/kb/` and the manifest.

## Validation

- `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55432/kb uv run pytest -q`.
- `pnpm --dir web typecheck`, `lint`, `test` (core test 4 still identical on all fixtures, now 26 or more)
  and `build`.
- `python3 scripts/plugin_parity.py`, `python3 scripts/skills_parity.py` and `python3 scripts/workflow.py
  validate`.
- Re-publish the fixture book to a fresh scratch API (spare port, scratch `KB_ROOT`) to confirm the
  `all-blocks` chapter still ingests. **Never touch `:8766` or `:3030`.** The live-library migration
  binds documents, and it doesn't re-ingest, so this is safe for stored chapters. Note whether any
  stored chart would now read differently, since stored trees are re-parsed from `source`.

## Notebook

- `phase.md`:
  - one Doc impact line (`backend.md`, plus `decisions.md` if the README contract changed), with detail in
    `topics/doc-impact-detail.md` → *P30.F2*;
  - mark OQ46's fix as shipped (a one-line pointer);
  - `## Now`.
- `result.md`: verdict block first.

**Unattended run:** settle open choices by the README and the stricter option. Record them as decided,
and return `done`.

## Dispatch

slice=P30.F2
phase=P30
kind=fix
risk=low
attempt=1
route=mid
reason=kind fix rated low
tier=mid
subagent_type=slice-executor-mid
model=sonnet
pass_model=yes
effort=high
pass_effort=yes
attribution=Claude Sonnet 5.5
explore_model=haiku
explore_effort=high
