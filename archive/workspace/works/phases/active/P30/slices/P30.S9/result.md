# P30.S9 result: Anchors (server-side re-anchoring)

## Verdict

- **status:** done
- **tier:** high
- **model:** opus
- **effort:** high
- **summary:** Shipped server-side re-anchoring. `server/anchors.py` is a pure, deterministic ladder (exact, fuzzy ≥ 0.8 on the quote and on its context, moved, `block`, `orphan`) plus `map_id` (by id, then the nearest preceding id). It runs on every reader read from the captured anchor, which is never rewritten. `anchor_status`/`anchored_version` are written back only for the caller's own rows and only on current-version reads. The reads return resolved annotations, orphans in `unanchored`, other-language marks mapped by id, bookmark `place` (legacy bookmarks approximate, restored by id) and a mapped `resume`. Core test 3 and the never-delete/never-another-user test are green.
- **files_changed:** `server/anchors.py` (new), `server/reader_state.py`, `server/reader_api.py`, `tests/test_anchors.py` (new), `tests/fixtures/anchors/{cases.json,chapter-v1.md,chapter-v2.md,chapter-ko.md}` (new), the same six files mirrored under `plugin/templates/kb/`, `plugin/templates/manifest.json`, `works/phases/active/P30/phase.md`, `works/phases/active/P30/topics/{operator-questions-decided.md,doc-impact-detail.md,notes-server.md}`, this `result.md`
- **validation:**
  - `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55432/kb uv run pytest -q`: PASS, 216 passed (202 before, plus 14 new; the Postgres-gated ones ran, none skipped)
  - `python3 scripts/plugin_parity.py`: PASS
  - `python3 scripts/skills_parity.py`: PASS
  - `python3 scripts/workflow.py validate`: PASS (only the standing stale-docs and oversized-section warnings)
  - `pnpm --dir web typecheck`: not run, because no web type changed
- **deviations:**
  1. The write-back stores only `anchor_status` and `anchored_version`, not "the new offsets when found". P29 names only those two columns. Keeping the captured anchor immutable means a fuzzy match never compounds and a reader's evidence is never overwritten (OQ31).
  2. `anchored_version` means "the newest version the text was found on" and does not move on `block`/`orphan` (OQ32).
  3. The reads split orphans out of `annotations` into `unanchored`. No client consumed S8's shape yet. They also add `other_languages`, bookmark `place` and `resume` (the last one is P29's *Language switch* resume-by-id).
  4. Core test 3 lives in its own `tests/test_anchors.py` rather than in `test_reader_state.py`.
- **doc_impact:** four lines appended to `## Doc impact` (detail in `topics/doc-impact-detail.md` → *P30.S9*):
  - `api.md`: the resolved-annotation read shapes;
  - `backend.md`: `server/anchors.py`, `SectionCache`, `write_back_anchors`, `_Anchoring`;
  - `data.md`: status and version are a cache written by reads, with no schema change;
  - `decisions.md`: the ADR for OQ31–OQ34.

## What was built

- **`server/anchors.py`** (pure; the docstring is the spec):
  - `resolve(block_id, quote, sections) -> Resolution(status, method, block_id, start, end, similarity)`;
  - `map_id(block_id, source_order, target_ids) -> (id | None, exact)`;
  - `similarity`/`levenshtein` through a bit-parallel Myers/Hyyrö implementation (Python ints, so any pattern length works, and no new dependency);
  - `THRESHOLD = Fraction(4, 5)`, so the 0.8 comparison is exact.
  - The ladder measures against `server.native.sections`, which it does not reimplement. Exact ties break by stored-context agreement, then nearness to `start`, then position. The fuzzy candidates come from a substring-search pass (one per run of ends within `m // 4` edits), and the start comes from a reversed global pass.
  - Timing: a 300-character quote in a 20k-character section takes about 10 ms, and a 3,000-character quote in 50k characters about 70 ms.
- **`server/reader_state.py`:**
  - `SectionCache` parses each `(document, version)` once per request: the current version from `documents.source`, older ones from `document_versions.source`. It returns `None` (do not resolve) for a non-native version, a missing archive row or an unparseable source.
  - `write_back_anchors` runs `UPDATE … WHERE id AND user_id AND anchored_version <= target AND (status or version differs)`. It touches only those two columns and never `updated_at`.
- **`server/reader_api.py`:** `_Anchoring` (annotation, other_language, bookmark, resume, flush) is wired into `_variant_payload` (the doc and chapter reads) and into `GET annotations` (the per-book or loose-document list). The module docstring describes the new payloads.

## Decisions (unattended run, recorded as decided)

`## Operator Questions` OQ31–OQ34, full text in `topics/operator-questions-decided.md` → *P30.S9*:
- OQ31: status-only write-back from the immutable anchor;
- OQ32: the meaning of `anchored_version`;
- OQ33: the exact fuzzy method;
- OQ34: the edge cases. A retired block note becomes an orphan. A retired bookmark falls back to the nearest preceding id. An unresolvable version is reported as stored and nothing is written. Other-language marks are resolved in their own variant and only their section is mapped. `resume` is mapped by id.

Each choice is the one that never loses or distorts a reader's annotation.

## Tests (core test 3)

`tests/test_anchors.py`, with fixtures `tests/fixtures/anchors/`: v1 and v2 of a native chapter, a Korean variant missing `lenses`, and `cases.json`.
- Eight ladder cases. Each first checks that an anchor resolves exact at the same offsets on its own version:
  - exact, with the text shifted by an inserted paragraph;
  - fuzzy hit, one word edited;
  - fuzzy miss → `block`;
  - moved to another section;
  - moved from a retired section;
  - orphan;
  - a block note on a surviving section and on a retired one.
- A threshold test: exactly 0.8 is a hit, 0.7 is a miss, and context cannot carry a short changed quote.
- Three language-mapping cases: by id, the nearest-preceding fallback, and an id unknown to the source.
- Two Postgres-gated API tests:
  - The write-back writes only the reader's own rows. No row is deleted, and the captured anchor and `updated_at` are unchanged. Another user's row is untouched. It is idempotent, an old-version read writes nothing, and the orphan comes back in `unanchored` with its note. A bookmark on a retired section falls back to `fuel`.
  - Other-language marks are mapped (overview exact, lenses → fuel) and never painted; resume is mapped (lenses → fuel). Legacy bookmarks after html → native are `approx`: one restored by id, the other by fraction.

A throwaway check (scratchpad, not committed) compared the Myers distances against a naive DP on 3,000 random pairs, mixed-script included. It matched.

## Notes written

- `phase.md`:
  - `## Decisions`: the "Shipped server-side" line gains S8 and S9;
  - `## Doc impact`: four lines;
  - `## Operator Questions`: OQ31–OQ34, collapsed;
  - `## Notes for later slices`: S9's consumed tags removed and an S9 pointer added;
  - `## Now`.
- `topics/notes-server.md` → *(from P30.S9, …) Anchors as shipped*: what to paint, the Text changed copy (made-on `lang`/`version` plus the original `block_id`), other languages, `place`, `resume`, and the S10 hook.
