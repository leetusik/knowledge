# Result — P26.DECOMP

## What was done

Surveyed the corpus and cut **six middle slices** for P26 — five `knowledge` explainer slices plus a
final README audit — as **bare folders** (`slice.json` only; no `plan.md`, no `result.md`), and rewrote
`works/phases/active/P26/phase.md` with the Context, the Decomposition table + "why this cut" rationale,
per-topic source lists, the recorded judgment calls, all nine constraints, the pre-recorded README
staleness list, and an initialized "Doc impact" list.

No code was written, no slice or phase status was transitioned, nothing was committed.

## Slices created

| id | name | kind | risk | order |
|---|---|---|---|---|
| `P26.S1` | Knowledge: what it is and how it is used | knowledge | low | 1 |
| `P26.S2` | Knowledge: system internals - content plane, write path, contracts | knowledge | low | 2 |
| `P26.S3` | Knowledge: the read surfaces - two front ends | knowledge | low | 3 |
| `P26.S4` | Knowledge: shipping and running it - distribution, deploy, security, QA | knowledge | low | 4 |
| `P26.S5` | Knowledge: why it is this way, and how to change it | knowledge | low | 5 |
| `P26.S6` | Audit and refresh README.md | implementation | low | 6 |

The reading arc: *what is it and who is it for* → *how does it work* → *what does a reader see* →
*how does it ship and stay safe* → *why is it like this and how do I change it*.

## The survey behind the cut

- **`docs/current/*.md`** — headings read for all 11 tracks (5,456 lines); `product.md` read in full;
  `architecture.md` §Plugin packaging (P7) + §Open-core template (P17), `operations.md` §Publishing /
  §Web app production deploy (P14) / §Knowledge CLI (P13), and `data.md` §Indexes-Search read in full
  where the cut was in doubt.
- **Code surfaces** — `server/` (24 modules + `accounts/` `persistence/` `usage/`, ~6.5k lines),
  `web/src/` (12 page routes across four route groups, 10 `lib/` modules, four component families),
  `cli/src/knowledge_cli/` (8 modules), `mcp-server/src/knowledge_mcp/` (4 modules + `CONTRACT.md`),
  `plugin/` (two skills, `setup/render.py`, `templates/manifest.json`, and a full byte-parity mirror of
  `server/` + `tests/` under `templates/kb/`), `alembic/versions/` (0001→0005), `scripts/` (six gates),
  `tests/` (14 files), `compose.yml` / `compose.prod.yml`, `deploy/knowledge.conf` (the edge location
  map), `.github/workflows/` (four).
- **`README.md`** — read in full (84 lines) and cross-checked against `docs/current/` **and against the
  live site**.
- **`works/`** — `backlog.md`, `deferred.md` (16 open), archived phase names only (P1→P20).
- **Reference** — `/Users/sugang/projects/personal/vocky/works/phases/active/P15/phase.md`, read
  read-only for shape (reading-order arc, one-doc-one-explainer mapping, explicit "why this cut", the
  pre-recorded staleness list, the inline-execution rule). Nothing under that repo was touched.

### Three findings that changed the cut

1. **A fifth slice is genuinely warranted** (the intent's 4–5 target, not a stretch): `frontend.md`
   alone is 841 lines covering *two distinct front ends*, one of which (the MkDocs viewer) was retired
   from production at P14 and survives as the plugin's shipped scaffold.
2. **The distribution story splits along a product/engineering seam** rather than living in one slice:
   the four surfaces appear in S1 as *product roles*; the packaging machinery (payload isolation, the
   three-class template manifest, `render.py`, the two parity guards, `plugin-ci.yml`, the P17 mirror
   and its `{{KB_DATABASE_URL}}` dormancy token) appears in S4, beside release and CI where its
   siblings already live in `operations.md` and `qa.md`. Reasoning recorded in `phase.md`.
3. **The `/explain` write path is S2's, not S1's** — it only makes sense after "disk is canonical, the
   DB is a disposable projection" is established, which is S2's opening idea. S2 is also where the
   self-reference must be stated plainly (these explainers are written by that path into this repo).

## Live checks run during the survey (they fed the README staleness list)

| command | outcome |
|---|---|
| `curl -sI https://knowledge.hi2vi.com/graph/` (no follow) | **308 → `/graph`**, which follows to **`/login`** (`<title>Sign in · knowledge</title>`) — the README's headline link is a sign-in wall for anonymous readers |
| `curl -s https://knowledge.hi2vi.com/` | 200, `<title>knowledge — Durable knowledge for developers and their coding agents · knowledge</title>` — the marketing landing, **not** a library index |
| `curl -s -o /dev/null -w '%{http_code}' .../install.sh` | 200 (the P20 curl installer the README never mentions) |
| `curl -s -o /dev/null -w '%{http_code}' .../SKILL.md` | 200 (the published explain skill the README never mentions) |
| `git log --oneline -5 -- README.md` | last touched at **P13** (`1fa9bfd`) — P14→P25 drift, twelve phases |

Eleven staleness items are pre-recorded in `phase.md` for `P26.S6`, with the "fix what is stale, not a
rewrite" boundary stated explicitly.

## Validation

| command | outcome |
|---|---|
| `python3 scripts/workflow.py new-slice …` ×6 | PASS — six slices created |
| `ls works/phases/active/P26/slices/P26.S{1..6}` | PASS — each holds `slice.json` only (bare folders; no `plan.md` pre-filled) |
| `python3 scripts/workflow.py next` | PASS — `current_slice=P26.DECOMP`, `next_slice=P26.S1` |
| `python3 scripts/workflow.py validate` | **PASS** — "Workflow validation passed." (exit 0) |
| `git status --short` | clean of source changes — only `works/` bookkeeping + the new `works/phases/active/P26/` tree |

## Doc impact

**None** — planning only. The line is recorded in `phase.md`'s *Doc impact* list.

## Deviations from `plan.md`

None in substance. Two places where the plan invited a judgment call and it was exercised:

- The plan's candidate table was adopted **with modifications**: K4's scope was widened from
  "security + operations + QA" to also carry the **plugin/open-core packaging machinery** (with
  `architecture.md` §P7 + §P17 explicitly reassigned there from K2), answering the plan's first open
  judgment call. K4 is consequently the heaviest slice; that is flagged in `phase.md` with a pre-agreed
  re-split fallback that requires the operator's ask.
- The plan listed **seven** constraints to record; `phase.md` records those seven verbatim in substance
  plus **two more** drawn from the confirmed intent (audience is the new maintainer only; keep the
  series at five and never silently thin coverage), so `Constraints` has nine entries.
</content>
