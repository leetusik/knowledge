# P30.F6 — Chapter-to-chapter navigation lands at the top; never record an unread chapter Finished

## Why

`P30.REVIEW` round 2, finding **R3** (`slices/P30.REVIEW/result.md` → round 2):
- moving from one chapter to the next with Next, Previous, the end section's Next, or a Contents sheet link
  keeps the old scroll position;
- from the end of `all-blocks` (y 8863), Next opens `write-lock` at its end (y 2248), and from y 1500 it
  opens at y 1500;
- a fresh load opens at y 0;
- **signed in, it saves `{fraction: 1, max_fraction: 1, finished: true}` for the chapter that was never
  read.**

It predates F5 (the same numbers on `63c161b`), so production has it.

The suspected cause: `web/src/components/reader/use-reading.ts` returns early for a chapter not yet started,
so nothing scrolls to the top, and Next's own scroll-to-top doesn't fire on a chapter change. Suspects for
the latter are `loading.tsx`, the fixed first children of `.rd-root`, and Next's scroll restoration across
the streamed segment. Find the real cause and fix it there.

## The rule (pure where possible)

On a **chapter change** (any client navigation to a different chapter, document or language variant of a
reader page), the landing is decided once, in this order:
1. a `#hash` (F4's `useHashLanding`);
2. a `?note=` target (S21);
3. the reader's saved resume position (S15; the pill or the restore, as built);
4. otherwise the **top**, at y 0, instantly.

**No position or Finished write is sent until the landing has settled.** The cadence and the beacon start
only after it. A position sampled before then must never reach the server: guard against the previous
chapter's scroll position being attributed to the new chapter. This includes the `pagehide` beacon and the
"end reached" rule that sets `finished`.

Keep as built:
- F4's hash landing;
- S15's resume behaviour and its "hash wins" rule;
- F5's chrome rules (the 450 ms *ignore* after the reader's own scroll applies to this landing too);
- the legacy reader's bridge restore (check that legacy → native and native → legacy transitions land
  correctly too).

## Tests (core: saved reading state)

- A pure test of the landing decision: hash, then note, then resume, then top.
- A test that no position or finished write is produced before the landing settles, at the level of
  `position.ts` / `use-reading` logic, whatever is pure.

## Verify (live)

Follow the `topics/surface-slice-rules.md` runtime: a scratch stack and the production build; never `:8766`
or `:3030`; stop only your own PIDs; one sign-in, since the limiter returns 429.

Check:
- signed out and signed in, from the end, from the middle and from the top of a chapter: Next, Previous,
  the end section's Next, the Contents sheet link, and the book page's chapter rows all land at the top
  (or at the saved resume, for a chapter with one);
- **signed in, the server's position row for the next chapter is not `finished`** after the navigation;
  query the scratch DB and record it;
- a hash link and the sign-in return still land on their block;
- `?note=` still lands.

Record the numbers in `result.md`.

## Notebook

- `phase.md`:
  - a Doc impact line (`frontend.md`: the landing rule on a chapter change; `qa.md`: one new checklist line
    for "Next opens the next chapter at its top, not Finished", which the review writes);
  - consume the F6 note in *Notes for later slices*;
  - `## Now`, where next is REVIEW round 3.
- `result.md`: verdict block first.
- **Production note for the orchestrator:** chapters may already be wrongly marked Finished on production.
  Mark as unread clears them. Don't write to production.

## Dispatch

slice=P30.F6
phase=P30
kind=fix
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
