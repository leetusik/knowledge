# P30.S10 — result

## Verdict

- status: done
- tier: high
- model: opus
- effort: high
- summary: Shipped spaced-repetition review on FSRS. `server/review.py` wraps `fsrs==6.3.2` (pinned; defaults plus one 10-minute learning and relearning step, no optimiser, fuzz seeded so a preview is exactly the outcome). A quiz item's first attempt seeds its card, and "Review this" (`PATCH annotations {review}`) creates, suspends or resumes a highlight card. `GET /app/reader/review/queue` serves the local day with limits, `limit_reached` and held cards in the counts; `POST review/cards/{id}/review` is idempotent by `review_id` and returns previews; `PATCH review/cards/{id}` suspends or undoes. Drift and readability are resolved lazily through the gate, so unreadable cards are excluded everywhere and writes to them are 404.
- files_changed: server/review.py (new), server/reader_api.py, tests/test_review.py (new), pyproject.toml, uv.lock, plugin/templates/kb/{server/review.py, server/reader_api.py, tests/test_review.py, pyproject.toml, uv.lock}, plugin/templates/manifest.json, works/phases/active/P30/phase.md, works/phases/active/P30/topics/{operator-questions-decided.md, doc-impact-detail.md, notes-server.md}
- validation:
  - `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55432/kb uv run pytest -q`: PASS (222 passed: S9's 216 plus 6 new)
  - `python3 scripts/plugin_parity.py`: PASS
  - `python3 scripts/skills_parity.py`: PASS
  - `python3 scripts/workflow.py validate`: PASS (the usual stale-docs and oversized-section warnings only)
- deviations: (1) The queue route is P29's `GET /app/reader/review/queue`, not the plan's shorthand `GET /app/reader/review`. The plan says "route names per P29". (2) "Due" is `due < end of day`, so the day is `[start, end)`. P29 says `<=`; a card due exactly at the next day's start now belongs to the next day (OQ37). (3) There is no "short undo" beyond `PATCH {status: active}`: neither P29 nor the round defines a server-side timed undo, and the signed toast's Undo is that PATCH.
- doc_impact: api.md (review routes, "Review this", the quiz-attempt `card`, annotations' `review`); backend.md (`server/review.py`, the routes, `fsrs==6.3.2`); data.md (how S10 writes `review_cards`/`review_logs`; no schema change); decisions.md (ADR for review on FSRS, OQ35–OQ41). Detail is in `topics/doc-impact-detail.md` → *P30.S10*.

## What was built

- **`server/review.py`** (the only module that imports `fsrs`):
  - `_Scheduler`: py-fsrs `Scheduler` with `desired_retention` 0.9, `learning_steps` and `relearning_steps` set to one 10-minute step, `maximum_interval` 36500 and fuzzing on. `_get_fuzzed_interval` is overridden to draw from `random.Random(f"{card_id}:{reps}")` using the library's own `FUZZ_RANGES`, so `previews()` and the review it previews agree exactly (OQ38).
  - `review_day`: the review day starts at `day_starts_at_hour` in the profile zone (UTC until the browser sets one).
  - `Resolver`: per-request card resolution through `Gate`, with these rules:
    - a `d:<doc>` card resolves through that document;
    - a `c:<book>/<key>` card resolves through the book's live variants of that chapter;
    - a card renders in the variant of the reader's last-used language (newest position), else the card's own language, else `en`;
    - item drift: a changed type resets the card, and an id missing from every parsed readable variant retires it;
    - a highlight card resolves through its annotation's document and is re-anchored with `anchors.resolve` for its context.
  - `build_queue`: counts, `by_book`, limits, `limit_reached`, `next_due_at`, and card payloads with previews.
  - Writes: `seed_quiz_card`, `set_highlight_review`, `set_status`, and `review`. `review` locks the card row; `review_id` is the log id; a repeated id replays the outcome stored in the log's `response`.
- **`server/reader_api.py`**:
  - three review routes;
  - `ReviewIn` and `CardPatch` bodies;
  - `PATCH annotations` gains `review`;
  - `POST quiz-attempts` returns `card`;
  - `_mark_review` puts `review` on every annotation in the doc, chapter and per-book reads, and in create and patch replies;
  - the module docstring documents the payloads.
- **Plugin mirror:** the new and changed files are copied into `plugin/templates/kb/`, `server/review.py` and `tests/test_review.py` are listed in the manifest's `identical`, and `pyproject.toml`/`uv.lock` are mirrored (both are in the template).

## Tests (`tests/test_review.py`, Postgres-gated, clock patched via `server.review.now`)

1. `test_first_attempt_seeds_and_ratings_follow_fsrs` covers:
   - a right first answer gives a Good review card days out;
   - a retried first attempt returns the same card, and attempt 2 does not touch it;
   - a wrong first answer gives a learning card due in 10 minutes;
   - queue order and payload (`quiz_title`, `item_index`/`item_count`, `front`);
   - Good graduates the card exactly to its preview;
   - Again on a review card is a lapse to relearning in 10 minutes, with `due_today`.
2. `test_review_is_idempotent_and_review_this_suspends` covers:
   - "Review this" on gives a new highlight card, with `context`, `note` and `block_title`;
   - a repeated `review_id` is a no-op with the same result, leaving 1 log and reps 1;
   - off suspends the card, the queue drops it, and a rating gets 409;
   - on resumes the same card with its history;
   - suspending through `PATCH review/cards` makes the reads say `review: false`;
   - deleting the highlight deletes the card.
3. `test_unreadable_cards_are_hidden_and_writes_404` covers:
   - another user's card id gets 404;
   - while the project is private, the queue, the counts and `by_book` are empty and both writes get 404;
   - turning the project public brings the cards back;
   - deleting the document purges its cards.
4. `test_local_day_and_limit_reached` covers:
   - Asia/Seoul, day start 04:00: 03:30 local belongs to the previous day;
   - `max_reviews_per_day` 1 holds one card back while `counts.due` stays 2;
   - after one rating: `limit_reached: "reviews"`, held cards still counted, `by_book` correct;
   - at 04:00 the count resets and the held card is served;
   - `new_highlights_per_day` 0 gives `limit_reached: "new_highlights"`.
5. `test_item_drift_resets_or_retires`: in v2, q1 changes type, so its card resets (`reset`, `choice` front and back); q2 disappears, so its card is retired; the logs are kept.
6. `test_chapter_card_renders_in_a_readable_variant`: a `c:` card in a two-language book renders in its Korean variant, with the book title and the chapter's place.

## Decisions taken (unattended; recorded as decided OQ35–OQ41)

Full text: `works/phases/active/P30/topics/operator-questions-decided.md` → *P30.S10*.

- OQ35: intervals are sent in whole minutes.
- OQ36: `done_today` counts distinct cards on the review surface; the limits work as described there; new highlights come after due cards.
- OQ37: the day is `[start, end)`.
- OQ38: seeded fuzz.
- OQ39: idempotence is stored in the log row (no migration); conflict and suspended cases get 409.
- OQ40: drift and readability are resolved lazily, through the current binding.
- OQ41: payload additions.

## Notes and observations

- One existing behaviour changed for S8's tests: `_fill` posts a quiz attempt, which now seeds a card. The existing tests still pass, because the purge removes `d:<doc>` quiz cards and `_count` does not count cards.
- `no single-card delete route`: P29 *Privacy* says a reader can delete any card, but the plan did not ask for it. It is recorded for REVIEW in `topics/notes-server.md` → *S10* and in `## Now`.
- Each review write rebuilds the queue (for `counts`, `limit_reached` and `next`). This is fine at v1 scale; it is noted for S24 if a large card set makes it slow.
- The deploy image gains the `fsrs` dependency (pure Python; `typing-extensions` was already present). This is noted in `## Now`.

Notebook: `phase.md` was edited as follows:
- `## Decisions`: the shipped-server line gains S10;
- `## Operator Questions`: OQ35–OQ41 were appended as decided;
- `## Doc impact`: four lines;
- `## Notes for later slices`: the consumed S10 audiences were dropped and the S10 note added;
- `## Now`: rewritten.

The phase notebook is 40,089 bytes, within the 40,960 budget.
