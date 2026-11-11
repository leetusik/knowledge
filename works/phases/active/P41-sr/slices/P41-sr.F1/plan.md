# P41-sr.F1 — Skip the Sources section and headings that lead to nothing

## Goal

Fix review round 1's **F1**. Listen reads an explain document's Sources section aloud, file paths and commit hashes
included, and it reads a heading alone when nothing in its section is read. The intent says source lists are
skipped.

**Read first:**
- `slices/P41-sr.REVIEW/result.md` § Findings → *F1 — Listen reads the source list aloud*: the rule, the proof and the
  case table;
- `server/spoken.py` (S1, the read and skip table; `_SKIPPED` at `:187`, the walk around `:241-258`);
- `topics/decisions.md` § Decisions 4: S1's read and skip table;
- `plugin/skills/explain/SKILL.md` §4.6: how every chapter ends, with `## Sources {#sources-list}` as plain Markdown;
  and its translation rule, which keeps the `sources-list` id;
- `server/listen.py`: the unit identity, the manifest, `segment_hash` and `part_key`, for case h.

## The rule (the review's simplest rule, pinned)

1. **A `sources-list` section is skipped whole, heading included.** Detect it by the heading's id `sources-list`,
   whatever the heading's words, so a Korean translation's Sources is skipped too. The section ends at the next
   heading of the same or a higher level.
2. **A heading whose section yields no other segment is dropped.** For example "Check yourself" over a quiz, or a
   heading over only code or a glossary. A heading followed by a subheading that has text is not empty.
3. **The guard:** the word "sources" in prose, and a `## Sources` heading **without** the `sources-list` id, stay
   read.
4. **The typed `sources` block** stays skipped, as now.

## The acceptance matrix (prove every case)

| Case | Expected |
|---|---|
| a. a typed `sources` block | skipped |
| b. a plain `## Sources {#sources-list}` section: its paragraphs and lists | skipped |
| c. the Sources heading itself, either form | skipped |
| d. a Korean translation's Sources (heading translated, id `sources-list` kept) | skipped |
| e. a book chapter's Sources | skipped (same path) |
| f. a heading whose section then says nothing (e.g. "Check yourself" over a quiz) | dropped |
| g. "sources" as a word in prose; a `## Sources` with no `sources-list` id | read |
| h. units already made before the fix | see below |

**Case h, the units already made.** Production holds one made document: the operator's, 6 parts of about 49 min. It
reads its Sources at the end. The operator will listen to it at acceptance, so prefer that it is **remade, rendering
only what changed**. Choose by this order and record the choice:
1. **No schema change**, if at all possible: `0007` is applied on production.
2. **Only the parts whose spoken text changed render again.** Parts are content-addressed by their segments'
   hashes, so a unit rebuilt from the fixed script reuses every stored part whose segments are unchanged. Find the
   cleanest way to make an already-made unit rebuild its manifest from the fixed script: for example a spoken-script
   version folded into the **unit** identity or the manifest check, but **not** into the segment or part hashes.
   - Say how an existing Listen picks it up. The likely forms are that the state reads `outdated` and offers
     "Update audio", or that the next Listen builds the new unit.
   - Say which form the W1 and W2 UI already handles. Verify it with the tests or a scratch run.
3. **If (2) needs a schema change, or touches the profile in the part key:** stop at the simplest safe option.
   Either leave made units until their document's next version, or accept a full remake of that one document
   (about 25 min of Mac rendering). Say which, and why.

## Files (the set)

- `server/spoken.py`, and `server/listen.py` only for case h;
- `tests/test_spoken.py` and `tests/fixtures/spoken/chapter.md`: add one plain `## Sources {#sources-list}`
  section, a heading over only a quiz, and the guard's prose use;
- the plugin template mirrors of each changed file, byte-identical (`plugin/templates/kb/server/…`,
  `plugin/templates/kb/tests/…`);
- `plugin/templates/manifest.json`, only if a file is added;
- `server/config.py` and its mirror, only if case h bumps a setting.

**Not:** any web file, any alembic file, or `docs/`.

## Tests (tiny)

Extend `tests/test_spoken.py` with at most **two** test functions covering cases b–g on the fixture: one for the
Sources skip with its guard, one for the dropped empty heading. Case h gets one assertion in `tests/test_listen.py`
only if the mechanism is non-obvious (with its mirror). Otherwise verify it on a scratch run.

## Validation

- `uv run pytest -q tests/test_spoken.py tests/test_listen.py tests/test_listen_play.py`:
  - with a disposable Postgres: a container named **`p41-f1-pg`** on **127.0.0.1:55451**, `KB_TEST_DATABASE_URL`;
  - then the full `uv run pytest -q` once;
- `uv run python scripts/plugin_parity.py`: exit 0;
- print `spoken_script` on SKILL.md §4.6's own example and on the fixture, and show that the Sources and "Check
  yourself" lines are gone and the guard line stays;
- `git status --porcelain --untracked-files=all`: only the set, plus this slice folder;
- remove `p41-f1-pg` with its volume. If the permission layer refuses a delete, list the path; never work around it.

**Never:**
- touch the installed runner (`com.knowledge.listen-runner`) or production;
- push, deploy or commit;
- read `.env` files;
- restart `:3030`.

## Return

`result.md`, with the verdict block first, then:
- **§ Cases:** the matrix with each case's evidence;
- **§ Made units (case h):** the choice, how an existing Listen picks it up, and what production's one document will
  do after the deploy.

The `notebook` field holds:
- **Decisions:** one gist, `Spoken skip (F1): … → slices/P41-sr.F1/result.md`;
- **Doc impact:** a `backend.md` line, the `sources-list` skip and the empty-heading drop;
- **Now:** one line.

## Dispatch

route=high
reason=risk high (not low)
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
