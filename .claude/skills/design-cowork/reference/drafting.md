# design-cowork — drafting and the inner loop

## Drafting and the inner loop

**Dispatch the drafters.** Resolve once with `executor-route --drafter`, and pass its `model` /
`effort` on every Agent call (`subagent_type` = its `subagent_type=` line; `subagent_type:
design-drafter` in a plain install). The prompt is **only a `slice: <id>` line and the round address
`<job>/<round>`**; on the answer pass add `critique-01.md` and, under `critic+judge`, the ids held for the
judge; on the judge's short follow-up pass add `judge-01.md` (*below*). The drafter reads everything else itself; paste
nothing. Run it
as a background task (never pass `run_in_background: false`).

**A wave dispatches one drafter per job at once.** That is the one carve-out from "one executor at a
time": the jobs' folders are disjoint and these are design spans only. Every later span of the wave
(critic, judge, the next drafter pass) runs as soon as its own job is ready for it.

**The drafter's verdict.** `done` → the loop below. `needs_operator` → the handoff is thin or
contradictory: hold that job (never fill the gap yourself, never tell it to guess), let the rest of
the
wave run on, and raise exactly what it named at the wave's stop. The operator's answer amends that
open round's handoff, and the job is drafted again from there. `blocked` → `design-check` problems
it could not fix: same, reported as named. Fields to read: `boards_written`, `render_loop`,
`component_gaps`, `departures`, `open_questions`, `open_items`, `critique_answers`, `design_check`.

**What you read of a span: its verdict block, and the round `result.md`'s `## Summary`** (1 KB or
less). Never the drafter's other output, the canvas's JS or CSS, a critique's findings or any whole
design file: their detail is the next span's input, and the operator's when they open the canvas.

**When the job's critique is `off`,** go straight to the read-back.

**When it is `critic` or `critic+judge`, run the inner loop per job, before the operator sees
anything:** one critic pass, then at most one drafter answer pass. There is no second critic pass.

1. **The critic pass** (`executor-route --critic`; its `model` / `effort` per call). The prompt:
   `mode: critic`, the round address, `pass: 01` and a scratch directory outside the design root. In a
   multi-job wave add `wave: <the wave's other jobs whose drafter has returned>`. It renders the
   canvas itself, hovers, types and clicks every row at desktop and phone width, checks the bar line
   by line, and writes `rounds/<round>/critique-01.md`; read **only its verdict block**: `verdict`,
   `confidence`, `must_fix`, `escalate`, `wave`.
2. **The answer pass.** With no must-fix open, go to the read-back. Otherwise dispatch the drafter
   once with `critique-01.md`; it fixes or rebuts each must-fix, and what it leaves open (a rebuttal,
   a fix that did not hold) reaches the operator with both sides.
3. **What the critic was unsure of** (its `escalate` ids: a low-confidence must-fix, a `pass` below
   `high`, a standoff over a logged departure, a wave choice):
   - **under `critic`**, no judge exists, so **nothing is held**: the drafter answers a listed
     must-fix like any other finding, and the operator still sees every listed item marked
     **unsure**, with its reasons, beside the drafter's answer;
   - **under `critic+judge`** (`executor-route --judge`; its `model` / `effort` per call), dispatch
     the judge **beside the drafter's answer pass**, which holds those ids. The judge's prompt:
     `mode: judge`, the round, `pass: 01`, the critique path, the escalated ids, and the critic's
     `--out` path so it reuses the render. It writes `judge-01.md`, ruling once. Its **upheld** items
     get **one more short drafter pass** (with `judge-01.md`); dropped ones are gone. A
     `pass-rejected` sends the must-fixes it names into that same short pass. With no confident
     must-fix for the answer pass, the judge runs first and the drafter takes its upheld items in
     its one pass.
   - **`skip=yes`** (a loopback proxy, no Fable): dispatch no judge; the escalated items go to the
     operator marked **low confidence**.
   - **Exit 1** (fairness: the critic or judge row names the drafter's model family): stop and tell
     the operator the row conflict. The rows are the knob.
4. **A wave choice** (a `choice` finding, a cross-job conflict) never blocks. Copy it onto the other
   job too. Under `critic+judge` the judge rules: `upheld` means this job takes the other's version,
   in its short pass; `dropped` means the other job changes, which you report on that job at the stop
   as the judge's ruling, for its next round when the operator agrees. Under `critic` it reaches the
   operator unruled.

**Cost** (measured in P36.S8B, critic at sonnet @ max; v61 runs the critic at high and reuses the drafter's render): a critic pass took 25–36 minutes on a
flow-board job, and the judge about 2 minutes per item. A job took about 55–100 agent-minutes with a
critic and about 30 without. The drafter's `--click` self-check takes a few minutes of that. The
critic's model and effort are the `[claude.critic]` row's (`high` by default since v61, `max` the step up) and
the judge's the `[claude.judge]` row's: the operator tunes them in `executors.toml`, never in a prompt.

**Every span's prompt starts with its `slice: <id>` line** — drafter, critic and judge alike: the
meter attributes the span by it. Spans are metered from the transcripts by `dispatch-summary`; never
record one by hand.

## Never — dispatching

- Dispatch anything but these spans: the drafting to `design-drafter`, every round; the critique and
  the judging to `design-critic`, when the job's level says so; and the mockup build to
  `slice-executor-high`, only when the operator asked for one.
