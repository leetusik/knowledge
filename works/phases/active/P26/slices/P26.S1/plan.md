# Plan — P26.S1 (Knowledge: what it is and how it is used)

## What this slice is

**Explainer 1 of 5** in the new-maintainer series. One `/explain` run, published to the KB as project
`knowledge`. No repo source changes.

Run **inline on the main thread** — `/explain` is a user-level skill (`~/.claude/skills/explain/`) and no
`slice-executor` has it. `risk: low` here is nominal bookkeeping, not a tier selector (`phase.md`
§Constraints 1).

## The question this explainer answers

*What is knowledge, who is it for, and how do people actually use it?* — the first thing a new maintainer
asks, before any code. It is the **product** explainer: roles, models, and journeys, not mechanism. The
write path's internals, the front-end code, the deploy kit, and the decision record all belong to S2–S5;
gesture at them and move on.

## Series framing

Say explicitly, near the top, that this is **part 1 of a five-part series** for someone taking over the
project, and name where the rest goes: internals (S2) → the read surfaces (S3) → shipping and running it
(S4) → why it is this way (S5). vocky's P15 series did this and it is what makes five documents read as
one book rather than four strangers.

## Sources to cover

Per `phase.md` §*Sources per knowledge topic* → **S1**:

- **Docs:** `docs/current/product.md` in full (Status, Summary, Target Users, Problem, Goals, Non-Goals,
  the whole *Product Direction* arc P7 → P25, Terminology) and `docs/current/experience.md` (visual
  language, route/screen map, the core user journeys, UX states, copy and tone, and each per-phase journey
  section P12 → P25).
- **Code as product artifacts:** `plugin/skills/explain/SKILL.md` and `plugin/skills/setup/SKILL.md` (what
  the two commands promise), `plugin/README.md`, `cli/README.md` + `cli/src/knowledge_cli/guide.py` +
  the `knowledge.py` / `main.py` command surface, `mcp-server/CONTRACT.md` + `mcp-server/README.md` (the
  frozen `search` / `fetch_document` v1 contract as a *product* surface), the repo `README.md`,
  `web/public/install.sh` and `web/public/SKILL.md`.

Read for meaning, not exhaustively — `product.md` is only 115 lines but its *Product Direction* section
carries the whole P7→P25 arc, and `experience.md` (439 lines) is where the journeys live.

## Anchors the explainer must land

- **The four surfaces as roles**, and why there are four rather than one: plugin = self-host / open-core
  plus the write skill; CLI = hosted onboarding for someone who lives in a terminal; MCP = agent-to-agent
  retrieval ("search as a service", first consumer hi2vi's OpenClaw bot); web app = the free human UI.
- **user → org → project → document**: signup auto-provisions a default org + project, projects are
  get-or-create by name, and one **org-level** `vk_` key serves every repo (P18).
- **Private by default**; making a project public opens its docs *and* its graph to anonymous readers,
  with private nodes absent rather than dimmed (P19).
- **Pretty share URLs** (P25): `/@{org}/{project}/{doc-slug}` and `/@{org}/graph`, dateless by design,
  with every old `/documents/{id}` link still resolving.
- **Versioned documents** (P23): re-explaining a subject publishes v2 of the same document instead of a
  duplicate post; history is readable but quiet (only the current version is searchable and on the graph).
- **The interactive HTML explainer as a first-class document type** (P16/P17) — one output format
  everywhere, quiz included, the markdown house style retired.
- **Everything in the web UI is free**; the one intended monetizable surface is agent retrieval, and
  billing is still unbuilt (D12).
- A light nod to the self-reference — this document is itself one of those explainers — with the
  mechanism deferred to S2, which owns it.

## Invocation

Topic mode, no trailing flags. Let the skill's own judgment gate decide the "Best practices & next steps"
section (the subject is a private repo's own product shape, so a skip is the likely and acceptable
outcome) — **record which way it went** in `result.md`.

```
/explain the knowledge product — what it is, who it serves, and how it is used: the problem it solves, its four distribution surfaces (the Claude Code plugin, the standalone knowledge CLI, the MCP retrieval service, and the hosted multi-tenant web app) as product roles, the user → org → project → document model with org-level keys and get-or-create projects, public/private project visibility and the P25 pretty share URLs, versioned documents, and the self-contained interactive HTML explainer as a first-class document type. Part 1 of a five-part series for a new maintainer.
```

## Constraints

- **No `here` flag** — KB-only, no `<TOPIC>_EXPLAINED.html` copy in this repo (`phase.md` §Constraints 4).
- **No repo source changes.** This slice's only working-tree writes are `works/` bookkeeping; the explainer
  itself arrives via the hosted API's own commit (§Constraints 2, 6).
- **`docs/knowledge/` does not exist yet** — this is the **first** save into it, so expect the API to also
  create the project landing page, a Recent bullet in `docs/index.md`, and a new Browse card
  (§Constraints 5).
- **Verify with `curl`, never Python `urllib`** — the edge 403s on urllib's user-agent (§Constraints 3).
- **Self-hosting:** the save lands as a `kb-api` commit on `origin/main`. After the save, `git pull
  --rebase` before committing this slice, so local and remote histories do not diverge (§Constraints 2).

## Done when

- The explainer is published: a 201 with a document id, version, and URL recorded.
- The save is verified with one `curl` GET.
- `result.md` records: the exact topic invoked, the document id / version / path / URL, whether the
  research section was `included` / `skipped-by-judgment` / `skipped-offline`, whether one run sufficed
  for the merged grouping, and any finding worth carrying to a later slice.
- A cross-slice note is appended to `phase.md` §*Findings & Notes*.
- `python3 scripts/workflow.py validate` passes.
