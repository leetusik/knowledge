# P41-sr.REVIEW — phase review (gated)

## Goal

Review P41-sr, "Listen: a free AI voice reader", against its confirmed intent:
- a Listen control in the knowledge web reader;
- it reads a document, or a book chapter after chapter, aloud in English and Korean;
- it plays on an iPhone with the screen off;
- it skips quizzes, code and sources, and reads alt text;
- it is free;
- **Scope Added at Execution A:** this Mac as the fallback runner.

Return a `review_verdict`. On `pass`, also return the **walkthrough** for the operator's acceptance gate (required).

Follow the `review-phase` skill (`.claude/skills/review-phase/`) and `.claude/skills/do-whole-phase/reference/review.md`
(the reviewer's half). **Read first:**
- `intent.md`;
- `phase-section P41-sr` (the list), then `Decisions`, `Notes for later slices`, `Doc impact` and `Operator
  Questions`;
- the breakdown block `phase-section P41-sr "P41-sr.REVIEW — phase review" --topic breakdown`;
- each build slice's `result.md` verdict block: B1, B2, B3, G1, W1, W2, X1.

## The boundary

`python3 scripts/workflow.py phase-scope P41-sr` prints the boundary: base `b1eb6484`, head `4aba2544`, 42 commits and
about 103 product files.
- **The range also carries P40-2t's merge** (`07090944 merge(P40-2t): …`, plus its follow-up commits). P40-2t was
  reviewed and accepted in its own phase, so its files are **outside this review**, unless a P41-sr commit also
  changed them. Tell the two apart with `git log --format=%s -- <file>` over the range.
- Anything you notice outside the boundary is an **observation**, returned as a deferred-job candidate. It is never a
  finding. Known one: the `site build` CI workflow (`scripts/site_smoke.py`) has failed on every push since at least
  P39-hk, over `docs/index.md`'s Recent list and the project dirs. It is outside this phase.

## 1. Validate the whole phase together

All in this checkout:
- the root `uv run pytest -q`, with the Listen Postgres tests live:
  - Postgres in a container named **`p41-rv-pg`** on **127.0.0.1:55451**;
  - `KB_TEST_DATABASE_URL` set as B1's result says;
- `alembic`: `upgrade head`, `downgrade -1`, `upgrade head` on that database;
- `cd tools/listen-runner && uv run pytest -q`;
- web, in `web/`:
  - `pnpm vitest run`;
  - `pnpm lint`;
  - `pnpm exec tsc --noEmit`;
  - the production build **in a scratch APFS clone** (`## Operator Runtime`; never into `web/.next`, because `:3030`
    runs and is never restarted);
- `uv run python scripts/plugin_parity.py`, `python3 scripts/skills_parity.py`, and `claude plugin validate plugin`;
- `python3 scripts/workflow.py validate`.

X1's pre-flight passed all of these at `bf75e1eb`. Since then only `server/config.py` and its template copy have
changed. Run them again anyway: this is the gate.

## 2. Review against the intent and the signed design

- **The intent, item by item**, with evidence: `file:line`, a test, or a live observation. Notes:
  - the skips and alt text are S1's `server/spoken.py`;
  - the screen-off iPhone is the operator's at acceptance (R3 §10);
  - "free" covers the voice licence and the Mac runner, against D104-vm and D105-y8, which are deferred by the
    operator and are context, not findings.
- **RESPECT THE DESIGN:** check the built reader, player and landing against the signed round
  (`docs/reference/design/jobs/11-listen/rounds/01-listen/result.md` § Build, `frame.md` F1–F33). Look for an
  approved element dropped, simplified or restyled.
- **The decisions in `## Decisions`:** confirm each one recorded in a `result.md` is there, including **Player (W1,
  amended by W2)**, **Ship order (X1)** and **Part upload cap (X1)**.
- **Judge these candidates.** Each becomes a finding with a proposed fix slice, a walkthrough item, or a
  deferred-job candidate. Say which, and why:
  1. **The first part's wait.** About 5 minutes on production before anything plays: part 1 is a full ~10-minute
     part at RTF ≈ 0.46 (`slices/P41-sr.X1/result.md` § For the review).
  2. **Speed and follow along** carry across Listens only within a page session. F3 says "kept from one Listen to
     the next wherever it starts" (W2 § For X1 and the review).
  3. **The dock or player title** can show the landing row's variant title when the audio language differs (W2).
  4. **A reload while playing** can show the last 15-second save, not the pagehide position (W1 § Chrome run).
  5. **Chromium plays through hls.js**, and WebKit natively (W2). Confirm the WebKit path is unchanged from W1's, so
     the iPhone lock screen keeps native HLS.
  6. **The part upload cap** is now 16 MiB. Confirm that nothing else in the chain caps lower: the edge's 20m, the
     BFF (runner uploads go straight to FastAPI), and B2's upload validation.
  7. **The runner's inferred section pauses** (B3's deviation 2, D109-vn). Are they acceptable as shipped?

## 3. The gate stages (the acceptance gate is required)

- **Open the running product yourself.** Never pass on other slices' reports alone.
  - **Instrument:** Claude in Chrome. Call `list_connected_browsers`, then `select_browser` on exactly
    `c14e5b18-f250-45f1-b92e-4a08a31197b5`, before any other browser tool. Open your own tab and close it at the end.
    A missing tool, id or match is `needs_operator`.
  - **Dev `:3030`:**
    - rebuild a scratch stack per `slices/P41-sr.W2/result.md`: the API on `:8766` and `p41-rv-pg`;
    - synthetic native content only: one loose document and one small book with a Korean variant;
    - act as the runner, with macOS `say` and B2's pinned packaging;
    - sign up in the agent's Chrome.

    Spot-check the headline claims as a first-time user:
    - Listen on a document;
    - Listen on a chapter (the book from there, and `next-waiting`);
    - the player sheet: Speed, Follow along, Chapters, Go to the text, Stop listening, then Continue listening;
    - the landing's Listen and the rows' audio item;
    - follow along that never scrolls;
    - Korean and dark;
    - the console free of CSP violations (a buffered `ReportingObserver`, since `read_console_messages` misses them).
  - **Production** (`https://knowledge.hi2vi.com`): you have no account there and **must not create one or sign
    in**. Check what is public:
    - X1's flip probes (`slices/P41-sr.X1/result.md` § Runbook);
    - `/healthz`;
    - that a public reader page loads without a Listen control and with no console error.

    X1 § Production check holds the operator's signed-in results. Cite them as theirs.
- **The `## Regression Checklist`** (`docs/current/qa.md`):
  - re-run **only** the lines whose surface a file in the boundary feeds: the reader, book landing and chapter pages,
    the root layout, the document routes, the BFF routes, the explain skill and plugin release, and the edge conf;
  - never re-run the whole list;
  - append this phase's headline checks.

  This gate section and `## Operator Runtime` are the only doc sections you write, with `doc-new-version` on the
  default stream. Add W1's CSP-observer method and the `localhost:<port>` cookie note (`## Doc impact`) to `## Operator
  Runtime`.
- **`## Operator Questions`:** OQ1–OQ3 are resolved. Confirm none is open.
- **The walkthrough**, for the operator on production. Short, ordered and concrete:
  - R3 §10's 13 iPhone checks (`topics/phone-playback.md` §10), screen off included;
  - this phase's headline checks on Mac Chrome;
  - the candidates above that you route to the walkthrough;
  - the `df -h /opt/knowledge` the operator still owes.

## 4. On a pass only

- Verify that `## Doc impact` is complete against what the phase changed. Append any missing line yourself
  (`doc_impact_added:`).
- Return `doc_versions: none — deferred to a docs phase`, except the two gate sections above.
- Write the explain line as the reference fixes it.

**A non-passing verdict** finishes validation and judgment first, then returns numbered findings with proposed fix
slices, one per problem class, each with its case list.

## Teardown

- Remove `p41-rv-pg` with its volume.
- Stop the API and any scratch `next`.
- Sign out and close your tab.
- Delete scratch files. If the permission layer refuses, list the paths; never work around it.
- **Never:**
  - restart `:3030`;
  - read `.env` files;
  - touch the installed runner (`com.knowledge.listen-runner`) beyond reading its log;
  - touch other containers (changple5-*, p50-s12-db);
  - push, deploy, SSH, commit or run `accept-gate`.

## Return

`result.md`, with the verdict block first:
- `review_verdict`;
- the summary;
- the validation, each gate with its result;
- the findings or `none`;
- the deferred-job candidates;
- `doc_impact_added`;
- `doc_versions`;
- the explain line;
- the **walkthrough**;
- `notebook`, holding the `Now` line.

## Dispatch

route=high
reason=kind review
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
