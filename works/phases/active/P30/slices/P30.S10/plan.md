# P30.S10 — Review on FSRS (server)

## Goal

Spaced-repetition review on the server, as P29 S3 settled it and the signed `08-review` round adds:
- `fsrs` (py-fsrs) pinned, defaults plus one 10-minute learning/relearning step, with no optimiser;
- cards seeded from a quiz item's first attempt;
- "Review this" highlight cards: turning it off suspends the card and keeps its history; deleting the
  highlight deletes the card;
- the queue, the reader's local day and the daily limits;
- an idempotent review write with Again/Good ratings, suspend, and interval previews;
- unreadable cards excluded everywhere.

## Read first (just in time)

- `works/phases/active/P30/topics/slice-breakdown.md` → **S10**.
- P29's contracts, via `phase-section P29 Decisions`. Read only these headings: *S3 Review items*,
  *Algorithm: FSRS*, *Ratings*, *Item drift*, *Review data contract*.
- `docs/reference/design/jobs/08-review/rounds/01-review/build-prompt.md` → *Contract details P30 adds*:
  `limit_reached`, held cards in the counts, the quiz title, and the question's place in `where`. Also the
  review screen states, so the payload carries everything they draw.
- `works/phases/active/P30/topics/notes-server.md` → *S8* and *S9*: the tables (S8 stored the review
  tables), `Gate`, `unit`, the stored-unit lag caveat, profile fields (`day_starts_at_hour`, limits) and
  the anchor resolution for highlight cards.
- Code: `server/reader_state.py`, `server/reader_api.py`, `server/anchors.py`, `tests/test_reader_state.py`.

## Approach (pinned)

1. **Dependency:** `uv add fsrs==<current stable>`, pinned exactly. Use the default parameters plus one
   10-minute learning and relearning step, with no optimiser extra. Wrap it in `server/review.py`, so the
   rest of the code never imports `fsrs` directly.
2. **Seeding:**
   - A quiz item's **first** attempt creates its card, rated from that attempt as P29 says. Later attempts
     don't re-seed.
   - Turning "Review this" on for a highlight creates or unsuspends its card. Turning it off suspends the
     card and keeps its history.
   - Deleting the highlight deletes its card.
   - Item drift (a quiz item changed in a new version) is handled per P29 *Item drift*.
3. **Queue:** `GET /app/reader/review` (route names per P29) returns due cards by the reader's local day,
   using `day_starts_at_hour` from the profile:
   - new-card and review limits per day;
   - `limit_reached`;
   - held cards counted as the signed design says;
   - each card's front and back data: the quiz title, the question's place in `where`, and for a highlight
     card the quote, its context and the note, resolved through S9;
   - counts: due, new highlights, done today, by book.
4. **Review write:** `POST` with the rating (Again or Good, plus Next for the graded types per the signed
   design), carrying a client review id for **idempotence**. A repeated id is a no-op that returns the
   same result. It returns the next card and the **interval previews** for both ratings.
5. **Suspend** (and the short undo, if P29 or the round defines one).
6. **Exclusion:** a card whose document is unreadable (private, deleted, or the unit unresolved) is omitted
   from the queue, the counts and the previews, and any write to it is a 404, the same as core test 2.
   Because the stored `unit` can lag (S8's caveat), resolve readability through `Gate` at read time, never
   only through the stored unit.

## Tests (very core)

- First-attempt seeding only.
- Again and Good move the due date per FSRS, with the 10-minute step.
- An idempotent repeat is a no-op.
- Turning "Review this" off suspends the card and keeps its history; deleting the highlight deletes the
  card.
- Unreadable cards are excluded from the queue and counts, and writes to them 404.
- `limit_reached`, and the local-day boundary.

## Out of scope

- The review UI (S24).
- A list of suspended cards (D41).
- An entry to review from the quiz (D42).

## Validation

- `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55432/kb uv run pytest -q`.
- `python3 scripts/plugin_parity.py` must pass: mirror the files, and `pyproject.toml`/`uv.lock` if they
  are in the template.
- `python3 scripts/skills_parity.py`.
- `python3 scripts/workflow.py validate`.

## Notebook

- `phase.md` (about 38 KB of 41; compress into `topics/` first if needed):
  - Doc impact, short lines, with detail in `topics/doc-impact-detail.md`: `api.md`, `backend.md`,
    `data.md`, and a `decisions.md` ADR line;
  - notes for S19/S24 in `topics/notes-server.md`;
  - `## Now`.
- `result.md`: verdict block first.

**Unattended run:** settle open choices by P29's or the signed round's recommendation. Record them on
`## Operator Questions` as `decided: …`, and return `done`.

## Dispatch

slice=P30.S10
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
