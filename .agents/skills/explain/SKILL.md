---
name: explain
description: Research a topic in the current repo/conversation and save a novice-friendly educational explainer document to the personal knowledge base (~/projects/personal/knowledge). Use ONLY when the user wants an explanation persisted as a document (explain and document, write this up, document what we just discussed) — NOT for ordinary questions that deserve a normal chat answer.
---

# explain

Write an educational explainer document — in the house style below — about a topic
in the current repo or conversation, and file it in the personal knowledge base at
`~/projects/personal/knowledge`. This skill produces a **saved document**: if the
user only asked a question and did not ask for anything to be saved, answer
normally in chat and write no files.

## 1. Resolve the topic

- Topic = the skill arguments: $ARGUMENTS
- If the arguments end with the standalone word `here`, strip it and remember:
  PROJECT_COPY=yes (step 7).
- No arguments → the topic is the most recent substantive analysis in this
  conversation ("document what we just discussed").
- Neither → ask the user what to explain, then continue.

## 2. Locate the knowledge base

- Check that `~/projects/personal/knowledge/mkdocs.yml` exists.
- If it does not: STOP and tell the user the KB repo is missing at
  `~/projects/personal/knowledge` and can be restored from backup or
  re-scaffolded (its README has a "Recreating from scratch" section). Do not
  write the document anywhere else, and do not scaffold the KB unless asked.

## 3. Research (read-only)

- Ground every claim in reality: read the actual files involved (code, configs,
  compose files, scripts). Never invent paths, commands, config snippets, or
  behavior — quote them from real files.
- Reuse conclusions already established in this conversation rather than
  re-deriving them.
- Audience: novice programmer, unless the user says otherwise.

## 4. Write the document — the style contract

Header:

- `# <Title>` in plain language, e.g. "The Shared nginx Problem — Explained for
  Beginners".
- Then a blockquote note stating: this is an educational write-up of the topic
  in this project; "Written for a novice programmer — every piece of jargon is
  explained as it appears."; where the operational source of truth lives (link
  the real runbook/doc if one exists); and that "this file is a teaching
  companion, not the runbook."

Structure — choose by topic shape:

- Problem-shaped (incident, fragility, fix):
  `## 1. The current situation` → `## 2. The cause` → `## 3. The proposed fix`
  → `## Mini-glossary`
- Concept-shaped (tool, pattern, subsystem):
  `## 1. What it is` → `## 2. Why it exists in this project` →
  `## 3. How it works here` → `## 4. Trade-offs and alternatives` → `## Mini-glossary`

Devices (use each where it earns its place):

- **Bold** every piece of jargon on first use and define it inline in the same
  sentence.
- Phrase H3 headings as the reader's own question where natural
  ("But who would recreate that container?").
- Teaching analogies for abstract mechanics (image/container ≈ class/object).
- One ASCII topology or flow diagram in a fenced block when structure matters,
  with ★ marking the crucial line, explained just below it.
- A markdown table when an inventory of parts helps.
- Numbered lists for concrete step sequences; bullets for design rules, each
  justified by the failure it prevents.
- Progressive disclosure between sections ("And it works! So what's the problem?").
- Exactly one blockquote "lesson in one sentence" takeaway.
- Close with `## Mini-glossary`: `**Term** — one-line definition` per term.
- Length guide: ~150–250 lines.

## 5. Save via the KB document API

- project = the current repo's root directory name, verbatim (e.g. `hi2vi_web`);
  if it contains path-unsafe characters, lowercase it and replace them with `-`.
- slug = short lowercase-kebab topic name (e.g. `shared-nginx-explained`);
  date = today, `YYYY-MM-DD`.
- Build the request in a temp dir — `<tmp>` below means
  `/tmp/explain-<date>-<slug>/` — so the document body and title never pass
  through shell arguments.
- Write `<tmp>/body.md`: the document WITHOUT the YAML frontmatter, starting
  at the H1 (the API writes the frontmatter itself).
- Write `<tmp>/meta.json` with exactly these fields, leaving `date`, `slug`,
  `overwrite`, and `commit` unset (API defaults). `co_authored_by` is the bare
  attribution value naming the model that actually did the work — the API
  prepends `Co-Authored-By: ` itself (e.g. in Codex,
  `GPT-5.5 <noreply@openai.com>`):

      {
        "title": "<Title>",
        "project": "<project>",
        "tags": ["<2–5 lowercase-kebab topic tags>"],
        "source_repo": "<absolute path to the current repo root>",
        "co_authored_by": "<bare attribution>"
      }

- Merge and POST — run exactly these two commands, spelled exactly this way:

      python3 -c 'import json,sys; m=json.load(open(sys.argv[1])); m["markdown"]=open(sys.argv[2]).read(); json.dump(m, open(sys.argv[3], "w"))' <tmp>/meta.json <tmp>/body.md <tmp>/payload.json

      curl -sS --max-time 5 -o <tmp>/response.json -w '%{http_code}' --json @<tmp>/payload.json http://localhost:8766/api/documents

- curl exit code ≠ 0 (connection refused, timeout) = the API is unreachable →
  go to step 6. Exit 0 = the API answered → branch on the printed status code,
  and NEVER fall back to a file write on an HTTP error:
  - **201** — the API wrote the file, inserted the Recent bullet, indexed the
    row, and made the scoped commit. Write NO file, do NOT touch
    `docs/index.md`, run NO git. Record `url`, `committed`, and `commit_error`
    from `<tmp>/response.json` for step 8.
  - **409** — duplicate: report the response's `existing_title` and `rel_path`
    and ASK the user before retrying; on a yes, add `"overwrite": true` to
    `meta.json`, re-run the merge command, and re-POST (overwrite suppresses a
    duplicate Recent bullet).
  - **422** — convention violation: if the mistake is in our payload, fix it
    once and re-POST; otherwise report the response detail.
  - **401** — `KB_API_TOKEN` is set on the server: report that a bearer token
    is required. Do not fall back.

## 6. Fallback — only when the API is unreachable

Only after a transport failure in step 5 (curl exit ≠ 0) do by hand what the
API would have done:

- Write `~/projects/personal/knowledge/docs/<project>/<date>-<slug>.md` with
  this frontmatter above the H1 — title always double-quoted (an unquoted colon
  breaks the whole site build); tags always a YAML list of 2–5 lowercase-kebab
  topic tags:

      ---
      title: "<Title>"
      date: <YYYY-MM-DD>
      tags:
        - <topic-tag>
      source:
        project: <project>
        repo: <absolute path to the current repo root>
      ---

- In `~/projects/personal/knowledge/docs/index.md`, insert on a new line
  directly after the `<!-- explain:recent -->` marker:

      - <YYYY-MM-DD> · [<Title>](<project>/<date>-<slug>.md) — <project>

  If the marker is missing, insert as the first bullet under `## Recent`; if
  that heading is missing too, append a `## Recent` section (with the marker)
  at the end of the file.

- Commit — knowledge-base repo only. The KB has an auto-commit convention (see
  its README). Run exactly these two commands, spelled exactly this way, adding
  your own tool's standard Co-Authored-By trailer — naming the model that
  actually did the work — as a second `-m` (e.g. in Codex,
  `Co-Authored-By: GPT-5.5 <noreply@openai.com>`):

      git -C ~/projects/personal/knowledge add -A
      git -C ~/projects/personal/knowledge commit -m "docs(<project>): add <slug>"

  Never push. Never commit in any other repo.

- Note for step 8: the API was down; a later `POST /api/reindex` — or
  `docker compose up -d` in the KB repo — reconciles the DB.

## 7. Optional copy in the current project

Only when PROJECT_COPY=yes: also write the document — without the YAML
frontmatter — to `<repo-root>/<TOPIC>_EXPLAINED.md` (topic in SCREAMING_SNAKE,
e.g. `SHARED_NGINX_EXPLAINED.md`). Do not commit it; that repo belongs to the
user.

## 8. Report

Tell the user:

- API path: the document is saved and committed in the KB; view at the `url`
  from the response. If `committed` is `false` with a `commit_error`, say the
  document was saved but the commit failed, and quote the error.
- Fallback path: the absolute KB file path from step 6; view at
  `http://localhost:8765/<project>/<date>-<slug>/`; and note the API was down —
  a later `POST /api/reindex`, or `docker compose up -d` in
  `~/projects/personal/knowledge`, reconciles the DB.
- The project copy path, if one was made.
