# P37-1p.REVIEW: review "Drop the knowledge graph" (gated)

## Context

P37-1p removes the knowledge graph from the hosted product, per `intent.md`. All five slices are done:

- **S1:** old public graph links redirect to the library.
- **S2:** the member graph page, its nav item and the dashboard line go, and the dashboard shows `/@{slug}`.
- **S3:** the graph CSS goes, and the public grid rule moves.
- **S4:** the graph API goes on both sides of the plugin template; plugin 0.9.1.
- **S5:** the landing and README drop the graph.

The acceptance gate is **required** (`accept-gate P37-1p --require` at DECOMP).

**The operator asked to run unattended:** "just continue w/o my involve. skip everything not necessary". So this review:

- never returns `needs_operator` for a check it can skip;
- runs every check anonymously, because the agent's browser profile is not signed in to `:3030` and no test login is allowed;
- leaves the signed-in member checks as waived, noted in the walkthrough. The operator waived S2's signed-in leg.

Follow the `review-phase` skill (`.claude/skills/review-phase/SKILL.md`) as the checklist, with the scope below.

## The boundary

This phase was created before P38-e1 merged, so measure from DECOMP's start instead of creation:

```
python3 scripts/workflow.py phase-scope P37-1p --base 0616f38a861ffee2dc6d5e77f4e71f5e219667c2
```

Only those files and the surfaces they feed are in scope. Anything else you notice is an observation or a deferred-job candidate for the orchestrator, never a finding. In particular, the landing hero's `h1` overflows at 390px (S5's note); `hero.tsx` was never touched, so it is a deferred-job candidate.

## Validate all slices together

Run each from the repo root and record the results:

1. `pnpm --dir web typecheck`, `pnpm --dir web lint` and the full `pnpm --dir web test`.
2. **The production build.** Build a scratch copy, never into `web/.next` while `:3030` serves.
   - Copy `web/` to the session scratchpad, as S1 did (`cp -Rc`, excluding `.next`).
   - Run `pnpm exec next build` there; if Turbopack fails, use `--webpack`.
   - Run `next start -p <free port>` against `KB_API_BASE_URL=http://127.0.0.1:8766`.
   - Stop it when done.
3. `uv run pytest -q`: expect 172 passed / 60 skipped (S4's count).
4. `python3 scripts/plugin_parity.py`, `python3 scripts/skills_parity.py` and `claude plugin validate plugin`.
5. `python3 -m py_compile scripts/onboarding_smoke.py`, never run live.
6. `python3 scripts/workflow.py validate`.

## Open the running product yourself (the gate stages)

**The runtime:**

- dev web `http://127.0.0.1:3030`, which you never restart;
- the API on `:8766`, which the orchestrator restarted on post-S4 code: `/app/graph` gives 404, and `/app/orgs/p28s2/library?scope=public` gives 200;
- your scratch production build.

**Local orgs with public projects:** `p28s2`, `p28s5`, `p28s6`, and the slug-less `5087f389-d870-4b33-b410-d253da9bc322`.

**HTTP**, on dev and on the production build, with `curl` and no cookie:

- `/@p28s2/graph` gives 307 to `/@p28s2`;
- `/graph/<p28s2's tenant id>` gives 307 to `/@p28s2`;
- `/graph/5087f389-d870-4b33-b410-d253da9bc322` gives 307 to `/@5087f389-…`, then 200;
- `/graph/<random uuid>`, `/graph/not-a-uuid` and `/x/graph` give 404 with the library not-found;
- `/graph` (member) gives 307 to `/login?next=%2Fgraph`;
- `:8766/app/graph` gives 404.

**Browser:** Claude in Chrome.

- Call `list_connected_browsers`, then `select_browser` on exactly deviceId `c14e5b18-f250-45f1-b92e-4a08a31197b5`, before any other browser tool. Open your own tab and drive only it.
- The window's size is fixed; `resize_window` does not work. Record the size you get, and use S3's container-width technique or S5's proxy harness only where the size matters.
- Walk, as a first-time anonymous visitor:
  - the landing `/`: no graph band, motif or graph copy; the bands alternate; it does not look bare;
  - an old `/@p28s2/graph` link landing on the library;
  - the library `/@p28s2`, with a one-column public grid;
  - a `PublicShell` document page such as `/documents/67/versions/2`;
  - `/login`.
- Look for anything broken by the deletions: unstyled regions, a dangling nav item, console errors (`read_console_messages`).

**README:** the hero links `https://knowledge.hi2vi.com/@leetusik` with no screenshot, and the body keeps the local mkdocs graph sentence.

**The template's graph stays:** `plugin/templates/kb/` still has `scripts/graph_hook.py`, `docs/graph.md`, `docs/javascripts/graph.js` and the `mkdocs.yml` hook.

**Signed-in checks are waived** by the operator (no test login is allowed): the rail without Graph, the signed-in `/graph` going to `/library`, and the dashboard's `/@{slug}` line. Do not sign in. S2's code, typecheck and tests cover them. Name them as waived in `result.md` and in the walkthrough.

## The regression checklist and the gate sections

- **Read `docs/current/qa.md`'s `## Regression Checklist` whole** and classify each line inside or outside the boundary.
  - Lines that check the in-app or public graph (around 243–246, plus the *In-app graph label focus* mission) are now **retired**: the surface is gone. Record them as retired, not failed.
  - Re-run only in-boundary lines you can run anonymously, and list the rest as skipped.
- **Version the two gate sections**, the only docs you write (`doc-new-version`):
  - **qa:** `## Regression Checklist` drops or marks the retired graph lines, and appends this phase's headline checks: the old-link redirects, the landing without a graph, and `/app/graph` 404.
  - **operations:** `## Operator Runtime` records the browser instrument the operator named on 2026-11-02: Claude in Chrome, the "sugang" Chrome profile, `Agent's Chrome deviceId: c14e5b18-f250-45f1-b92e-4a08a31197b5`. Note that `resize_window` does not resize that window, and how S3 and S5 worked around it. Keep Aside as the documented fallback.

## Notebook and verdict

- **`## Doc impact`:** verify it covers every durable change, and append any missing line yourself (`doc_impact_added:`).
- **`## Operator Questions`:** OQ1–OQ4 are all resolved, so they count as routed. Route any new one.
- **The verdict:** on `pass`, return `review_verdict: pass`, `doc_versions:` with the two gate sections, the `explain:` pointer line, and a **walkthrough** under the stop rules: about 2k characters, at most about 5 decisions, then a "decided as drawn" list, where "accept" signs everything. Keep it short, since the operator wants minimal involvement. It should cover:
  - what changed, in a few lines;
  - the release step that is theirs to do: push `main` and deploy, which ships the web change and plugin 0.9.1. Nothing has been pushed;
  - the waived signed-in checks they may glance at on production;
  - "decided as drawn": the parity decision, the dashboard `/@{slug}` line, the README hero, the trimmed S4 scope (the `db.py` kwarg and the docstrings were left).
- **Findings:** any finding gives `changes_requested`, with numbered findings and one proposed fix slice per problem class (kind `fix`, risk proposed). Never fix silently.
- **Deferred-job candidates:** list them for the orchestrator to file. One is the hero `h1` overflow at 390px.
- **Never** run `accept-gate`, `review-phase` or `finish-slice`, and never commit.

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
