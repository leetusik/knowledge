# P30.S9 — Anchors (server-side re-anchoring)

## Goal

Highlights, notes and bookmarks keep pointing at the right text when a chapter gets a new version, or when
the reader switches language. That means:
- the server-side re-anchoring ladder (exact → fuzzy ≥ 0.8 → moved → `block` → `orphan`) over the stored
  source;
- the write-back of `anchor_status` and `anchored_version`;
- resolved annotations in the chapter and document reads and in the per-book list;
- language mapping by id with the nearest-preceding fallback;
- legacy bookmarks marked approximate after migration;
- core test 3.

**The ladder never deletes or moves anything automatically** beyond what P29 defines. An unresolvable
annotation becomes `orphan` and is shown in the Unanchored group; it is never dropped.

## Read first (just in time)

- `works/phases/active/P30/topics/slice-breakdown.md` → **S9**.
- P29 *S3 Anchors*, via `phase-section P29 Decisions`.
- The signed annotation contract:
  - `docs/reference/design/jobs/05-annotations/rounds/01-annotations/build-prompt.md`, *Sections and
    offsets* and the Unanchored group;
  - the superseding round `rounds/02-keyboard-and-back-link/result.md` `## Build`, which wins where it
    differs.
- `server/native/README.md`, the **section projection** (OQ8): offsets count code points in the passage
  containers, with no whitespace collapse. This is the basis the ladder measures against. Use
  `server/native/project.py`; don't reimplement it.
- `works/phases/active/P30/topics/notes-server.md` → *S8*: the tables, the anchor fields S8 already
  stores, `Gate`, and the routes.
- Code: `server/reader_state.py`, `server/reader_api.py`, `server/native/`, `server/books.py`, and S5's
  version storage (`source` per version).

## Approach (pinned)

1. **The ladder** (`server/anchors.py`, pure and testable): given an annotation (quote, prefix, suffix,
   section id, offsets, `anchored_version`) and the target version's source:
   - exact: the same section, same offsets, same quote;
   - fuzzy: similarity ≥ 0.8 within the section, the method exactly as P29 says;
   - moved: the quote found in another section;
   - `block`: the section or block id still exists but the text doesn't, so the annotation attaches to the
     block;
   - `orphan`.

   It returns the new offsets and status. It's deterministic, with no randomness and no time.
2. **When it runs:** on read, lazily. When a chapter read's current version is newer than an annotation's
   `anchored_version`, re-anchor, write back `anchor_status` and `anchored_version` (and the new offsets
   when found), and return the resolved result. The write-back is per user and idempotent. It never
   touches another user's rows.
3. **Language:** reading a different language variant maps by id (heading and block ids are shared across
   translations, OQ6 and S5's translation id checks). If an id is missing, fall back to the nearest
   preceding id. Annotations from the other language carry the "other-language marker" flag the signed
   design draws. Their offsets are not re-mapped into foreign text; follow P29.
4. **Legacy:** bookmarks on a legacy html chapter that later migrated to native (S5's html→native) are
   marked approximate (`block` or position-only, per P29). Never dropped.
5. **Reads:** the chapter and document reads (`/app/reader/…`, or the document read with the reader's
   annotations, whichever S8 shipped as the annotation read) and the per-book list return resolved
   annotations, each with `anchor_status`, and orphans in their own group.

## Tests (core test 3)

- A fixture set over two versions of a native chapter (reuse `tests/fixtures/native/`, adding a
  `tests/fixtures/anchors/` pair). It covers:
  - exact;
  - fuzzy (≥ 0.8 hit, and < 0.8 miss);
  - moved;
  - `block`;
  - `orphan`;
  - language mapping by id;
  - the nearest-preceding fallback.
- One test that re-anchoring never deletes a row and never changes another user's row.

## Out of scope

- Review/FSRS (S10).
- The annotation UI (S20/S21).

## Validation

- `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55432/kb uv run pytest -q`.
- `python3 scripts/plugin_parity.py` must pass (mirror new server files and tests).
- `python3 scripts/skills_parity.py`.
- `python3 scripts/workflow.py validate`.
- `pnpm --dir web typecheck`, only if a web type changed.

## Notebook

- `phase.md` (about 36 KB of 41):
  - Doc impact, one short line each, with detail in `topics/doc-impact-detail.md`: `api.md`, `backend.md`,
    `data.md`, and a `decisions.md` ADR line;
  - notes for S20/S21 in `topics/notes-server.md`;
  - `## Now`.
- `result.md`: verdict block first.

**Unattended run:** settle open choices by P29's recommendation or the option that never loses a reader's
annotation. Record them on `## Operator Questions` as `decided: …`, and return `done`.

## Dispatch

slice=P30.S9
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
