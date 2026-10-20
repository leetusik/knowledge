# P30.S5 — Native ingest, search, MCP and html → native

## Goal

Wire S3's parser into the write path and the rest of the server:
- `format: "native"` publishes, with every violation in one 422;
- assigned ids are written into the stored file;
- references resolve against the publish's assets and the index;
- a body limit applies to every format;
- search and embeddings use a plain-text projection;
- reindex derives `format` from the header;
- the read route returns the native source plus the version's asset map;
- MCP `fetch_document` carries `format: "native"`;
- the `html → native` format migration keeps the version chain.

## Read first (just in time)

- `works/phases/active/P30/topics/slice-breakdown.md` → **S5**: the scope checklist.
- P29's contracts, via `python3 scripts/workflow.py phase-section P29 Decisions`. Read only *S2 Ingest,
  search and MCP*, *Format flag and `md`*, *Render model* and *S1 Legacy → native re-explain*.
- `works/phases/active/P30/phase.md` → `## Notes for later slices` and `topics/notes-server.md`, for S2's,
  S3's and S4's APIs:
  - `parse_chapter(source, reserved_ids)` → `.tree`, `.source`, `.assigned_ids`, `.refs`;
  - `NativeFormatError.to_detail()`;
  - the asset map shape `{name: {file, media_type, width, height, animated[, still]}}`;
  - the book placement helpers.

  Also read `## Operator Questions` OQ1–OQ13 (decided) and `server/native/README.md`.
- Code:
  - `server/documents_api.py`, `server/documents.py`, `server/publish.py`, `server/search.py`,
    `server/embeddings.py`, `server/reindex.py`, `server/books.py`;
  - `mcp-server/` (its `CONTRACT.md` and `fetch_document`);
  - the existing tests for `document_versions` and archive paths (`parse_archive_rel_path`).

## Approach (pinned)

1. **Publish native:** `format: "native"` with a `.md` body.
   - Run `parse_chapter`. Pass as `reserved_ids` the ids of the document's previous version, so ids carry
     forward and are never re-minted.
   - Any `NativeFormatError` becomes one 422 listing every violation; S4's asset violations merge into the
     same list.
   - Store `.source` (with the assigned ids written in), not the raw input.
   - Return `assigned_ids` and any warnings in the 201.
2. **References:**
   - `asset:<name>` must name an asset in this publish's map;
   - `chapter:` and `doc:` resolve against the index in the same project;
   - `#id` must resolve within the document.

   Per P29, decide which of these are 422 errors and which are warnings with the missing-link style. Follow
   P29 exactly; if it leaves one open, choose a warning for cross-document references (a target can be
   published later) and an error for `asset:` and `#id`. Record that choice.
3. **Body limit for every format**, as P29 states. html and md included, additive: today's documents must
   still fit. Check the largest existing document size in tests or fixtures before choosing, if P29 gives
   no number.
4. **Search and embeddings** use P29's search projection for native, which S3 calls distinct from the
   annotation projection (see OQ8). If S3's module lacks a search projection, add it in `server/native/`
   with a fixture-backed test.
5. **Reindex** derives `format` from the header (`format: native`) for every document.
6. **Read route:** the document read (and the version read) returns the native source plus that version's
   asset map, as P29's *Render model* says. The web renders it in S12.
7. **MCP:** `fetch_document` returns `format: "native"` and the source, additively. Record the field in
   `mcp-server/CONTRACT.md`. Keep the MCP response backward-compatible.
8. **html → native migration:** re-publishing an existing html document's stem as `format: native` is that
   document's next version.
   - `parse_archive_rel_path` becomes stem-based, and `document_versions` is keyed so the chain spans the
     extension change.
   - The archived html stays readable as its old version.
   - The document's rel_path updates in place.
   - A stem alias keeps by-path lookups and MCP lookups of the old `.html` path working.
   - The book binding (S2) follows the document.
   - `md → native` stays an ordinary next version.
   - **No shared link may break.** This is the core invariant: test it.

## Tests (very core)

- A native publish with violations gives one 422 listing all of them.
- A native publish round-trips: the stored source has the assigned ids, and a re-publish keeps them.
- `html → native`: the old version stays readable at its version route, the old path still resolves, the
  new version is native, and the book binding is intact.
- The body limit is enforced per format.
- A private document's native read is a 404, as before (one regression test).

## Out of scope

- The TS renderer (S12).
- The CLI and `/explain` (S7).
- The library migration (S6).
- Every web surface.

## Validation

- `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55432/kb uv run pytest -q`.
- The mcp-server's own tests, if it has any.
- `pnpm --dir web typecheck`, plus `build` if any web type changed.
- `python3 scripts/skills_parity.py` fails as known (A3).
- `python3 scripts/workflow.py validate`.

## Notebook

- `phase.md` is at 37.9 KB of the 41 KB budget. **Compress first:**
  - collapse each decided Operator Question (OQ1–OQ13) to one line plus a pointer, moving the full text
    word for word to `topics/operator-questions-decided.md`;
  - move long notes to `topics/notes-server.md`;
  - never drop a decision or a question.
- Then add:
  - Doc impact lines for `api.md`, `data.md`, `backend.md`, the MCP contract in `api.md`, and a
    `decisions.md` ADR line;
  - notes for S6, S7 and S12;
  - `## Now`.
- `result.md`: verdict block first.

**Unattended run:** settle open choices by P29's recommendation or the stricter option. Record them on
`## Operator Questions` as `decided: …`, and return `done`. Return `blocked` only for a real impediment.

## Dispatch

slice=P30.S5
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
