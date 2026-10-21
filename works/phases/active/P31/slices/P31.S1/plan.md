# P31.S1 — `knowledge check`: a dry-run validation endpoint and CLI

## Goal

Validate a document exactly as `POST /api/documents` would, **without ever writing anything**, so an explain
phase's chapter slices can catch every 422 while still drafting.

## Read first

- `phase.md`:
  - `## Decisions`, in particular "a check never writes";
  - `## Notes for later slices`: the *(for S1)* note and the scratch-stack note.
- `server/main.py`:
  - `create_document` (L906 to the write at L1252);
  - its dependencies `ensure_registry_project` (L814) and `resolve_org_slug`;
  - `DocumentIn` (L589).
- `cli/src/knowledge_cli/knowledge.py`: `register` (L875), `cmd_save` (L503), `_prepare_body` (L615); and
  `cli/src/knowledge_cli/native.py`: `build_fields`, `rejected_message` (L297).
- `tests/test_native_ingest.py`, `tests/fixtures/native/err-*.md`.

## Approach (pinned)

1. **One validation path.** Factor everything in `create_document` before `with WRITE_LOCK` into one function,
   for example `_check_document(...)`, that returns what the write needs or raises the same `HTTPException`s
   (the string 422s, the list 422, the 409s) with the same bodies. `create_document` calls it, then writes. The
   POST's behaviour, status codes and bodies stay **byte-identical**. The existing server suite proves it.
2. **The route:** `POST /api/documents/check`, with the same `DocumentIn` body and the same auth.
   - **ok:** `200 {"ok": true, "rel_path": …, "version": <the version a publish would make>, "format": …}`,
     plus the book and chapter it would land in when placed.
   - **Not ok:** the **same** 422 and 409 status codes and bodies a publish would return. Report the 409s:
     they are real refusals a publish would hit.
   - **It never:**
     - takes `WRITE_LOCK`;
     - writes a file, a DB row, a git commit, an asset or an index entry;
     - runs `ensure_registry_project`'s get-or-create;
     - sets `request.state.usage`.

     Where validation needs a project or registry row that doesn't exist yet, read it without creating it.
     Treat a missing project as "would be created" and validate on.
   - Add it to the API's public route list or rate limits wherever the POST is listed, so it is
     authenticated the same way.
3. **The CLI:** `knowledge check FILE`, with `save`'s flags (share the argparse setup with `save`, don't copy
   it) and `--json`.
   - It posts to `/api/documents/check`.
   - On ok it prints one line: "OK — would publish <rel_path> (v<N>)".
   - On a 422 it prints through `native.rejected_message`, adapted so it reads "would be rejected", not
     "was rejected".
   - Exit codes: **0** ok; **1** violations or a 409; **2** auth or transport failure.
   - Bump `cli/pyproject.toml` to **0.2.0**, so a skill can check `knowledge --version` for `check`.
4. **The skill and parity:** don't touch `plugin/skills/explain/`; S2 does that.

## Tests (core, tiny; in `tests/`)

1. **A check writes nothing.** On a fresh tenant, check a valid native chapter that would create a new
   project, a book and assets. Afterwards: no document row, no file under the root, no new git commit, no
   registry or project row, no asset, no usage row. Then a real POST of the same body succeeds, which proves
   the check didn't consume an id or slug.
2. **Check and publish agree.** For every `tests/fixtures/native/err-*.md`, plus one string-422 case (bad
   tags) and one 409 case (exists without `new_version`), `/check` returns the same status and body as the
   POST.

Also add one CLI test, if the CLI suite has the pattern (`cli/tests`): the exit codes for ok and 422 against a
mocked transport.

## Verify (live)

Use a scratch stack: a scratch API on a spare port with a scratch DB and a scratch `KB_ROOT`, per the scratch
notes in `phase.md`. Never `:8766` or `:3030`; stop only your own PIDs.

Run the installed-from-source CLI against it:
- `knowledge check` on a valid native chapter returns exit 0;
- on an `err-*` fixture it returns exit 1, with the line and col list;
- on a duplicate it returns the 409 message;
- then confirm in the scratch DB and on disk that nothing was written.

Record the commands and outputs in `result.md`.

## Validation

- `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55432/kb uv run pytest -q` (229 plus the new tests).
- `cd cli && uv run pytest -q`.
- `python3 scripts/plugin_parity.py`, `python3 scripts/skills_parity.py`, `python3 scripts/workflow.py
  validate`.
- D22: never `prettier --write` existing files.

## Notebook

- `phase.md`:
  - one Doc impact line (`architecture.md`/`operations.md`: the `/api/documents/check` route and
    `knowledge check`);
  - S2's note: the CLI version, the exit codes, the curl form;
  - `## Now`.
- `result.md`: verdict block first.
- Unattended: settle open choices by the safest option, and record them as `decided:` on
  `## Operator Questions`.

## Dispatch

slice=P31.S1
phase=P31
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
