# Plan — P26.DECOMP (decompose phase)

## What this slice is

Cut the middle slices for **P26: New-maintainer knowledge base**, and seed `phase.md` with the breakdown,
the survey findings, and the constraints later slices must honour.

This is a **decomposition slice**. It creates **bare slice folders** (`new-slice` only) and writes `phase.md`.
It writes **no code**, publishes **no explainer**, and **never pre-fills another slice's `plan.md`**.

Read first: `works/phases/active/P26/intent.md` (the confirmed intent — the source of truth for what was
asked) and `works/phases/active/P26/phase.md`.

## The confirmed shape (already decided — do not re-litigate)

The operator confirmed all three scope calls at `/create-phase`; they are settled input, not open questions:

- **Audience: the new maintainer**, needing full internal understanding. A public / end-user-facing series
  is explicitly a *separate later phase* — do not cut slices for it here.
- **4–5 substantial `knowledge` slices**, one `/explain` run each, written to be read **in order** as a
  short series. The target is recorded up front precisely because vocky's equivalent decomposition first
  cut ten narrow slices and had to be re-cut to five. **Do not exceed 5.** Prefer merging two thin topics
  over adding a sixth slice.
- **One light `README.md` audit-and-fix slice, last.** Audit against current reality; fix what is stale,
  wrong, or missing. **Not a rewrite** — the file's structure survives intact.

## The reference: vocky P15

The operator's request was "referencing the how vocky done this." The reference implementation is
`/Users/sugang/projects/personal/vocky/works/phases/active/P15/phase.md` — phase **P15 "New-maintainer
knowledge base"**, four `knowledge` slices (KB docs 25–28) plus a README audit, verdict `pass`.

**Read that file.** Borrow its *shape*: the reading-order arc (what is it → how does it work → how is it
secured and run → why is it this way), one-doc-lands-in-exactly-one-explainer source mapping, an explicit
"why this cut" rationale, and an already-spotted-staleness list feeding the README slice.

Borrow its shape, **not** its topic list. `knowledge` is a materially different system from vocky:

- **Four distribution surfaces, not one product** — a Claude Code **plugin** (`/knowledge:explain` +
  `/knowledge:setup`, marketplace + isolated payload + template sync), a standalone **CLI**, an
  **MCP retrieval service** (frozen v1 contract), and a **hosted multi-tenant web app**. Vocky had nothing
  comparable. This axis needs a home in the cut and may well justify the 5th slice.
- **A far heavier frontend story** — `docs/current/frontend.md` alone is 841 lines and spans *two* front
  ends (the MkDocs viewer + design system + knowledge-graph renderer, and the Next.js app with its
  sealed-cookie BFF, public route group, and the opaque-origin explainer iframe + height handshake).
- **A much longer history** — `docs/current/decisions.md` is 1,230 lines over P1–P25 (vocky's arc was P1–P14).
- **The defining architectural idea** — *disk is canonical, the DB is a disposable projection* — plus the
  two-plane split (SQLite content plane + async Postgres accounts plane) and "two deployments, one codebase".

## Survey to run before cutting

1. **The durable doc set** — `docs/current/*.md`, 11 tracks, 5,456 lines:
   `api.md` 588 · `architecture.md` 345 · `backend.md` 148 · `data.md` 229 · `decisions.md` 1230 ·
   `experience.md` 439 · `frontend.md` 841 · `operations.md` 631 · `product.md` 115 · `qa.md` 551 ·
   `security.md` 339. Skim headings first (`grep -n '^## '`), read deeply only where the cut is in doubt.
2. **The code surfaces** — `server/` (FastAPI: `documents_api.py`, `documents.py`, `app_api.py`,
   `auth_api.py`, `api_auth.py`, `dashboard_api.py`, `graph_api.py`, `search.py`, `embeddings.py`,
   `gitops.py`, `publish.py`, `reindex.py`, plus `accounts/`, `persistence/`, `usage/`), `web/src/`
   (route groups `(app)` `(auth)` `(marketing)` `(public)`), `cli/src/knowledge_cli/`, `mcp-server/`,
   `plugin/` (`skills/explain/SKILL.md`, `skills/setup/SKILL.md`, `setup/render.py`, `templates/`),
   `alembic/`, `scripts/`, `tests/`, the compose files and `deploy/`.
3. **`README.md`** (84 lines) — read it in full; it is the input to the audit slice.
4. **`works/`** — `backlog.md`, `deferred.md` (16 open jobs), archived phase **names** only. Do not
   deep-read archived slices.

## What to decide, and how

Cut **4–5 `knowledge` slices + 1 README audit slice**, ordered so the explainers read as a series.

A strong candidate cut, offered as a starting point — **change it if the survey says better**, and record
the reasoning either way:

| | topic | drawn from |
|---|---|---|
| K1 | What knowledge is, and how it is used — the problem, the four distribution surfaces as *product roles*, the org → project → document model, visibility and sharing | `product.md`, `experience.md`, `plugin/`, `cli/`, `mcp-server/CONTRACT.md` |
| K2 | System internals — disk-canonical / DB-disposable, the two planes, the single write path, the module map, the schema, the wire contracts | `architecture.md`, `backend.md`, `data.md`, `api.md`, `server/`, `alembic/` |
| K3 | The read surfaces — the MkDocs viewer + design system + knowledge graph, the Next.js app and its sealed-cookie BFF, and the sandboxed HTML-explainer render | `frontend.md`, `experience.md`, `web/src/`, `docs/stylesheets/`, `docs/javascripts/` |
| K4 | Keeping it safe and keeping it running — tenancy, credential scope, 404-never-403, XSS containment, the deploy topology, publish-on-write, the test suites and CI gates | `security.md`, `operations.md`, `qa.md`, compose files, `deploy/`, `.github/workflows/` |
| K5 | Why it is this way, and how to change it — the `D-*` record, the P1→P25 arc, the honest current state, and the phase/slice workspace this repo is driven by | `decisions.md`, `docs/index.json`, `CLAUDE.md`, `scripts/workflow.py`, `works/` |

Judgment calls worth making explicitly and recording:

- **Where does the plugin/CLI/MCP distribution story live** — with the product (K1) or as its own slice?
  vocky put its clients with the product because they added no backend capability. Here the plugin *is*
  an independently-installable open-core product with its own template-sync machinery, so the same
  reasoning may not hold.
- **Does the `/explain` write path belong to K1 (how it is used) or K2 (how it works)?** It is both the
  product's front door and its most intricate internal flow; pick one home and say why.
- **Is K3 justified, or does the frontend fold into K1/K2?** 841 doc-lines across two distinct front ends
  argues for its own slice, but confirm against what is actually there.
- **Self-reference is a feature, not a footnote.** This phase's own explainers become documents in the
  system being explained. Whichever slice covers the write path should say so plainly.

For each slice, record in `phase.md`: id, name, kind, risk, order, a one-line scope, and the **source list**
that `/explain` run should cover — precise enough that the topic string alone drives the right research
(this is what made vocky's merged groupings work in one run each).

## Slice-creation mechanics

Explainer slices — one per topic, `order` 1..N in reading order:

```
python3 scripts/workflow.py new-slice --phase P26 --slice P26.S<n> \
  --name "Knowledge: <topic>" --kind knowledge --risk low --order <n>
```

README audit slice — last:

```
python3 scripts/workflow.py new-slice --phase P26 --slice P26.S<N+1> \
  --name "Audit and refresh README.md" --kind implementation --risk low --order <N+1>
```

Bare folders only. Do **not** create `plan.md` or `result.md` for them.

## Constraints to record in `phase.md` (all of these, verbatim in substance)

1. **`knowledge` slices are run INLINE by the orchestrator, never dispatched.** `/explain` is a *user-level*
   Claude Code skill (`~/.claude/skills/explain/`); it exists only on the main thread, so no
   `slice-executor` can run it. `--risk low` on those slices is **nominal bookkeeping, not a tier
   selector** — the same rule vocky P15 recorded. Only the README audit slice is dispatched normally.
2. **Self-hosting: this phase writes into its own repo, over the network.**
   `/explain` derives `project` from the repo root dirname, so these explainers are project **`knowledge`**
   and land at `docs/knowledge/<date>-<slug>.html` **in this repo** — the KB documenting itself, published
   on its own public site. `~/.config/knowledge-kb/config.json` points at the **hosted** API
   (`https://knowledge.hi2vi.com`), which writes, commits, **and pushes** to `origin/main`. Consequence:
   each explainer save appears as a `kb-api` commit on `origin/main` while local slice commits accumulate
   on local `main`. **The orchestrator must `git pull --rebase` between explainer slices** to see its own
   output and keep the two histories from diverging. Record this prominently — it is the single biggest
   operational difference from vocky P15.
3. **KB verification gotcha** (recorded by vocky's `P15.REVIEW`): `https://knowledge.hi2vi.com` answers
   **403 Forbidden** to Python `urllib` (edge user-agent filtering) but **200** to `curl` with the same
   bearer token. Verify published documents with `curl`, as the `/explain` skill itself does.
4. **No `here` flag.** The confirmed intent is KB-only; do not write a `<TOPIC>_EXPLAINED.html` project copy.
5. **`docs/knowledge/` does not exist yet** — the KB currently holds explainers for `changple5`,
   `changple_web`, `hi2vi`, `hi2vi_web`, `bootstrap_agentic_workspace.sh`, and `vocky`, but **none for
   `knowledge` itself**. The first save creates the project folder, its `index.md` landing, and a Recent
   bullet in `docs/index.md`. Expect the browse grid on the site's home page to gain a card.
6. **Repo blast radius.** The explainer slices change no repo source. The only intentional working-tree
   change in this phase is `README.md` (the audit slice), plus `works/` bookkeeping and whatever the KB API
   pushes into `docs/knowledge/`.
7. **Doc impact.** Explainer slices have none by construction (their output is KB content, not this repo's
   durable doc tracks). The README audit **may** surface drift against `docs/current/*.md` — if it does,
   that is a one-line "Doc impact" note in `phase.md` for `P26.REVIEW` to consolidate, **not** a
   `doc-new-version` run by the audit slice itself. Widening the audit into `docs/current/` was explicitly
   declined by the operator.

## README audit input

Read `README.md` (84 lines) and list, in `phase.md`, the concrete staleness you can already see — the way
vocky's P15 pre-recorded six items for its audit slice. Known starting point: the README does not mention
**P25's org slugs / pretty share URLs** (`/@{org}/{project}/{doc-slug}`, `/@{org}/graph`), which is now the
shared-link story. Cross-check every factual claim it makes — the install lines, the plugin and CLI
commands, the "How it's built" bullets, the versioned-docs description — against `docs/current/product.md`
and `docs/current/operations.md`. State explicitly that the audit is **fix-what-is-stale, not a rewrite**.

## Done when

- 5–6 middle slices exist (4–5 `knowledge` + 1 README audit), bare folders, correct `kind`/`risk`/`order`.
- `phase.md` carries: Context, the Decomposition table with a "why this cut" rationale, the per-topic
  source lists, all seven constraints above, and the README staleness list.
- `python3 scripts/workflow.py validate` passes.
- `result.md` written; verdict returned. **Do not** commit, and do not transition any slice or phase status.
