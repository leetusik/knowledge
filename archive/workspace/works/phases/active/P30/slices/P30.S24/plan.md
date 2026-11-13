# P30.S24 — Review surface (`08-review`)

## Goal

Build the signed `08-review` round 01 §1–§8, with *Behaviour*:
- the queue header;
- the card, for quiz and highlight cards;
- the foot: Next, or the two ratings with interval previews (the rating border is the 3:1 control edge
  from `01-reader` round 03 §1, which covers `review` 12 in the A5 wave);
- the way back into the chapter (Q8, drawn);
- suspend (Q5, drawn), and undo;
- the queue's other states: the end, the limit reached, empty, failed;
- review settings (`PATCH profile`, Q6, drawn);
- Display (the signed `DisplayPanel`).

Behaviour covers the queue, rating, focus and keyboard, motion, and the keyboard rising on a phone.

The route is the one the S22 shell's Review entry links to.

## Read first

- **`works/phases/active/P30/topics/surface-slice-rules.md`: binding.**
- The spec:
  - `docs/reference/design/jobs/08-review/rounds/01-review/build-prompt.md`, the whole prompt, including *Contract details P30
    adds*;
  - its canvas;
  - *Open proposal (Q10)* stays unbuilt; it is D42.
- `topics/notes-server.md` → *S10*:
  - `GET /app/reader/review/queue`, the card front and back, `where`, previews, `limit_reached`, and
    held cards;
  - `POST …/cards/{id}/review` with `review_id`;
  - `PATCH …/cards/{id} {status}` (suspend and undo);
  - intervals in minutes (OQ35);
  - `done_today` (OQ36);
  - no single-card delete route, an observation for REVIEW.

  Also *S8*, for the profile fields and limits.
- `topics/notes-later.md`: the reader notes (DisplayPanel, tokens), the quiz notes (S19), and the
  annotation notes (S20/S21: highlight rendering for highlight cards).

## Approach

- A client island for the session: fetch the queue through the BFF, rate with an idempotent
  `review_id` (generate it once per card showing, so a retry is a no-op), and show the next card and the
  previews.
- Interval previews are formatted from minutes, as the prompt's strings say.
- Settings write `PATCH profile` with the signed ranges (OQ29).
- **Very-core test:** the client's `review_id` reuse on retry, and preview formatting. Both are logic.

## Out of scope

- A list of suspended cards (D41) and the quiz → review entry (D42).

## Dispatch

slice=P30.S24
phase=P30
kind=implementation
risk=low
attempt=1
route=mid
reason=kind implementation rated low
tier=mid
subagent_type=slice-executor-mid
model=sonnet
pass_model=yes
effort=high
pass_effort=yes
attribution=Claude Sonnet 5.5
explore_model=haiku
explore_effort=high
