---
title: "How /explain Saves Documents Now — the P6 API Rewire Explained"
date: 2026-07-02
tags:
  - agent-skills
  - http-api
  - fallback-design
  - workflow-phases
source:
  project: bootstrap_agentic_workspace.sh
  repo: /Users/sugang/projects/personal/bootstrap_agentic_workspace.sh
---

# How /explain Saves Documents Now — the P6 API Rewire Explained

> This is an educational write-up of the P6 phase in the
> `bootstrap_agentic_workspace.sh` project. Written for a novice programmer —
> every piece of jargon is explained as it appears. The operational sources of
> truth are the skill itself (`.claude/skills/explain/SKILL.md` in that repo),
> the API contract (`docs/current/api.md` in the knowledge repo), and the
> workspace's `docs/current/operations.md` and `docs/current/decisions.md`.
> This file is a teaching companion, not the runbook.

## 1. What it is

P6 is a **phase** — in this workspace, a planned unit of work with its own
folder, plan, and review, driven by `scripts/workflow.py`. This particular
phase rewired one step of the `/explain` **skill** (a reusable instruction file
that tells a coding agent how to perform a task) — the step where a finished
explainer document gets *saved* into the personal knowledge base.

Before P6, the agent saved a document by hand in three separate moves:

1. Write the file `docs/<project>/<date>-<slug>.md`, including its
   **frontmatter** — the YAML block of metadata (title, date, tags) that sits
   above the document body.
2. Insert a "Recent" bullet into `docs/index.md`, the knowledge base's front
   page.
3. Run two exact `git` commands to commit both files in the knowledge repo.

After P6, all three moves became **one HTTP POST** — a single web request —
to a small **API** (a program that accepts structured requests over HTTP)
running locally at `http://localhost:8766`. The API writes the file, inserts
the bullet, updates a search index, and makes the commit, all inside one
locked operation. The document you are reading right now was saved exactly
this way.

## 2. Why it exists in this project

The knowledge repo grew its own document API: a **compose service** (a
container defined in the repo's `compose.yml`, started with
`docker compose up -d`) whose `POST /api/documents` **endpoint** — a URL that
accepts a specific kind of request — performs, in one call, exactly what the
skill's three manual moves did.

That created a classic problem: **the same convention encoded in two places**.
The frontmatter format, the Recent-bullet format, and the commit message shape
(`docs(<project>): add <slug>`) now lived both in the skill's instructions and
in the API's code. Two copies of one rule always drift apart eventually — a
future edit fixes one and forgets the other, and documents saved by the skill
stop matching documents saved by the API.

There was a second, quieter reason: the API's write is **locked** — it runs on
a single worker and serializes writes, so two saves can never interleave. An
agent doing three separate steps by hand has no such lock. Handing the write
to the API made the knowledge base's own code the single owner of its rules.

### And it worked before — so what actually changed in the skill?

Only the save. Everything around it — how the agent researches the topic, the
house writing style, the optional copy into the current project — stayed
word-for-word the same. P6 deliberately swapped the plumbing without touching
the writing.

## 3. How it works here

The new save step builds the request as *files*, not as text typed into a
shell command. This matters: a document is ~200 lines of markdown full of
quotes and special characters, and pushing that through a shell command's
arguments is a classic source of breakage. Instead the agent writes two files
into a temp folder — `body.md` (the document, starting at the `# Title` line;
the API adds the frontmatter itself) and `meta.json` (title, project, tags,
source repo, attribution) — then runs two fixed commands: a one-line Python
merge that produces `payload.json`, and a `curl` POST (curl is the standard
command-line tool for making HTTP requests) with a 5-second timeout.

```
/explain (agent, in any project repo)
   │  Write body.md + meta.json → merge → payload.json
   ▼
★  curl --json payload.json → http://localhost:8766/api/documents
   │                                        │
   │ the API answered                       │ curl exit code ≠ 0
   │ (branch on the status code)            │ (API unreachable)
   ▼                                        ▼
201: the API wrote the doc file,        Fallback: the agent does the
the Recent bullet, the search-index     three old moves by hand, and
row, and the scoped git commit —        notes that a later reindex
the agent writes NOTHING itself         will reconcile the database
```

The ★ line is the crucial one: a single call now owns the whole write. On
success (**201**, the HTTP code for "created") the agent's only remaining job
is to *report* — it must not write a file, touch the index, or run git,
because the API already did all of it.

### What if the API says no?

Every HTTP answer carries a **status code** — a three-digit number stating how
the request went. The skill handles each one differently:

| Answer | Meaning | What the skill does |
|---|---|---|
| 201 | Document created | Report the viewer link; nothing else |
| 409 | Duplicate — that path already exists | Report the existing title, ask the user before retrying with `overwrite: true` |
| 422 | The payload breaks a convention (bad tags, bad project name) | Fix our payload once and retry, else report |
| 401 | The server requires a bearer token | Report it; do not retry |
| curl exit ≠ 0 | No answer at all — connection refused or timed out | Fall back to the manual three-step save |

### Why not just write the file by hand whenever anything fails?

Because the two failure kinds mean opposite things. A **transport failure**
(curl's exit code is not 0 — nothing answered) means the API is *down*; the
knowledge base still deserves the document, so the old manual flow runs as a
**fallback**, and a later `POST /api/reindex` rebuilds the database from the
files. An **HTTP error** (the API answered with 409/422/401) means the API is
*up and refusing for a reason* — a duplicate, a rule violation, missing auth.
Writing the file by hand at that moment would smuggle the document past the
exact check that rejected it. So HTTP errors never trigger the fallback.

## 4. Trade-offs and alternatives

- **Fallback kept, verbatim.** Pure designs delete the old path; this one
  keeps it because the knowledge base matters more than the plumbing —
  losing a finished document to a stopped container would be the worse bug.
  The cost: the old convention text still lives in the skill (now only as
  the fallback), so the drift risk is reduced, not zero.
- **Files-then-merge instead of `jq` or inline JSON.** Building the payload
  with `jq` (a shell tool for JSON) would push the title through shell
  quoting; having the agent hand-write the whole payload as one JSON string
  would mean escaping every quote and newline in a 200-line document. Writing
  plain files and merging with Python's `json` module avoids both.
- **Attribution moved into the payload.** The old third `git` command carried
  a `Co-Authored-By:` trailer naming the model that wrote the document. The
  API accepts that as a `co_authored_by` field (the bare value — it adds the
  `Co-Authored-By: ` prefix itself), so the credit survives the rewire.
- **Still hardcoded, on purpose.** The knowledge-base path and the two ports
  (`8765` viewer, `8766` API) are written directly into the skill. Making them
  configurable is a separately tracked, deliberately deferred job (D1) — this
  is a personal tool on one machine, and parameterizing it before anyone else
  needs it would be speculative work.
- **Shipped as workspace v4.** The workspace versions its installable
  machinery with a single integer; P6 bumped it 3 → 4 with a changelog entry,
  so other repos that adopted this workspace see "you're on v3 → upstream v4:
  /explain now saves through the KB API" when they update.

> Lesson in one sentence: when two places encode the same convention, make one
> of them the owner and the other a caller — and fall back only when the owner
> is silent, never when it says no.

## Mini-glossary

**Phase** — this workspace's planned unit of work (P1, P2, …), with its own
plan, slices, and review.
**Skill** — a markdown instruction file that teaches a coding agent a
repeatable task; `/explain` is one.
**Frontmatter** — the YAML metadata block (title, date, tags) above a
markdown document's body.
**API** — a program that accepts structured requests over HTTP; here, the
knowledge base's document service on port 8766.
**Endpoint** — one URL on an API that accepts a specific request, like
`POST /api/documents`.
**Compose service** — a container Docker starts from the repo's
`compose.yml`.
**HTTP status code** — the three-digit result of a web request: 201 created,
409 conflict, 422 invalid, 401 unauthorized.
**Transport failure** — no HTTP answer at all (refused or timed out), as
opposed to an error answer.
**Fallback** — the older manual save path, used only when the API is
unreachable.
**Reindex** — `POST /api/reindex`, which rebuilds the API's database from the
files on disk, reconciling anything written while it was down.
**Scoped commit** — a git commit that stages only the files the operation
touched, never `git add -A`.
