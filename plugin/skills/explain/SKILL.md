---
name: explain
description: Research a topic in the current repo/conversation and save a novice-friendly educational explainer document into your own personal knowledge base (the one /knowledge:setup created and configured). Use ONLY when the user wants an explanation persisted as a document (explain and document, write this up, document what we just discussed) — NOT for ordinary questions that deserve a normal chat answer.
argument-hint: <topic> [here]
allowed-tools: Read, Grep, Glob, Write, Bash(curl -sS --max-time 5:*), Bash(python3 -c:*)
---

# explain

Write an educational explainer document — in the house style below — about a topic
in the current repo or conversation, and file it in **your** personal knowledge base
(the one `/knowledge:setup` created). This skill produces a **saved document**: if the
user only asked a question and did not ask for anything to be saved, answer normally in
chat and write no files.

## 1. Resolve the topic

- Topic = the skill arguments: $ARGUMENTS
- If the arguments end with the standalone word `here`, strip it and remember:
  PROJECT_COPY=yes (step 7).
- No arguments → the topic is the most recent substantive analysis in this
  conversation ("document what we just discussed").
- Neither → ask the user what to explain, then continue.

## 2. Resolve the knowledge base configuration

The knowledge base is no longer hardcoded to one machine — resolve it from config.
**Run this one command** and read its `KEY=VALUE` output; do not reason about the
resolution rules by hand:

    python3 -c '
    import json, os
    home = os.path.expanduser("~")
    def env(k):
        v = os.environ.get(k)
        return v if v else None
    env_root = env("KB_ROOT")
    env_api = env("KB_API_BASE_URL")
    env_token = env("KB_API_TOKEN")
    xdg = os.environ.get("XDG_CONFIG_HOME") or os.path.join(home, ".config")
    cfg_path = os.path.join(xdg, "knowledge-kb", "config.json")
    cfg = None
    if os.path.isfile(cfg_path):
        try:
            cfg = json.load(open(cfg_path))
        except Exception as e:
            print("KB_STATUS=error")
            print("KB_ERROR=cannot parse " + cfg_path + ": " + str(e))
            raise SystemExit(0)
    legacy_root = os.path.join(home, "projects", "personal", "knowledge")
    legacy = os.path.isfile(os.path.join(legacy_root, "mkdocs.yml"))
    if cfg is None and not legacy and not (env_root or env_api or env_token):
        print("KB_STATUS=unconfigured")
        raise SystemExit(0)
    if cfg is not None:
        b_root = cfg.get("kb_root")
        api = cfg.get("api") or {}
        b_api = api.get("base_url")
        b_token = api.get("token")
        site = cfg.get("site") or {}
        b_site = site.get("base_url")
    elif legacy:
        b_root, b_api, b_token, b_site = legacy_root, "http://localhost:8766", None, "http://localhost:8765"
    else:
        b_root = b_api = b_token = b_site = None
    kb_root = env_root or b_root or ""
    api_base = env_api or b_api or "http://localhost:8766"
    token = env_token or b_token or ""
    site_base = b_site or "http://localhost:8765"
    kb_root = os.path.expanduser(kb_root) if kb_root else ""
    local_fallback = bool(kb_root) and os.path.isfile(os.path.join(kb_root, "mkdocs.yml"))
    print("KB_STATUS=configured")
    print("KB_ROOT=" + kb_root)
    print("KB_API_BASE_URL=" + api_base)
    print("KB_API_TOKEN=" + token)
    print("KB_SITE_BASE_URL=" + site_base)
    print("KB_LOCAL_FALLBACK=" + ("yes" if local_fallback else "no"))
    '

Read the output:

- `KB_STATUS=unconfigured` → **STOP**. Tell the user no knowledge base is configured
  and to run `/knowledge:setup` (or set the `KB_ROOT` / `KB_API_BASE_URL` /
  `KB_API_TOKEN` env vars). Write no files anywhere, and do not scaffold anything.
- `KB_STATUS=error` → **STOP** and report the `KB_ERROR` line (the config file exists
  but is unreadable); do not fall back to another source.
- `KB_STATUS=configured` → remember all five values for the steps below:
  - `KB_API_BASE_URL` — the document API base (used in step 5).
  - `KB_API_TOKEN` — a bearer token, or empty (empty = no token; used in step 5).
  - `KB_ROOT` — the local KB checkout, or empty for a remote-only config (step 6).
  - `KB_SITE_BASE_URL` — the local MkDocs viewer base (used in step 8).
  - `KB_LOCAL_FALLBACK` — `yes` only if `KB_ROOT` is a local directory that exists and
    contains `mkdocs.yml`; `no` otherwise. This one value decides whether the file
    fallback in step 6 is permitted.

What the command resolves, for reference (per-key, highest priority first):

1. **Env overrides** — `KB_ROOT`, `KB_API_BASE_URL`, `KB_API_TOKEN`, each overriding
   just its own key.
2. **Config file** — `$XDG_CONFIG_HOME/knowledge-kb/config.json` (default
   `~/.config/knowledge-kb/config.json`), written by `/knowledge:setup`, with keys
   `kb_root`, `api.base_url`, `api.token`, `site.base_url`. Omitted keys default to
   `api.base_url` → `http://localhost:8766`, `site.base_url` → `http://localhost:8765`,
   token → none; `kb_root` may legitimately be absent (a remote-only config).
3. **Legacy convention** — if `~/projects/personal/knowledge/mkdocs.yml` exists, use
   `kb_root=~/projects/personal/knowledge`, `api.base_url=http://localhost:8766`,
   `site.base_url=http://localhost:8765`, no token. (Keeps machines that predate
   `/knowledge:setup` working.)
4. **Nothing** → unconfigured (the STOP above).

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

- Merge — run exactly this command, spelled exactly this way:

      python3 -c 'import json,sys; m=json.load(open(sys.argv[1])); m["markdown"]=open(sys.argv[2]).read(); json.dump(m, open(sys.argv[3], "w"))' <tmp>/meta.json <tmp>/body.md <tmp>/payload.json

- POST once to `<KB_API_BASE_URL>/api/documents` (the `KB_API_BASE_URL` from step 2).
  When `KB_API_TOKEN` from step 2 is **non-empty**, add the bearer header shown in the
  second form; when it is empty, use the first form. Spelled exactly this way:

      curl -sS --max-time 5 -o <tmp>/response.json -w '%{http_code}' --json @<tmp>/payload.json <KB_API_BASE_URL>/api/documents

      curl -sS --max-time 5 -H "Authorization: Bearer <KB_API_TOKEN>" -o <tmp>/response.json -w '%{http_code}' --json @<tmp>/payload.json <KB_API_BASE_URL>/api/documents

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
  - **401** — the API requires a bearer token and yours is missing or wrong:
    report that a valid `KB_API_TOKEN` must be configured (via
    `~/.config/knowledge-kb/config.json` `api.token`, or the `KB_API_TOKEN` env
    var — re-run `/knowledge:setup` to set it). Do not fall back.

## 6. Fallback — only when the API is unreachable AND a local KB exists

Only after a transport failure in step 5 (curl exit ≠ 0):

- If `KB_LOCAL_FALLBACK` from step 2 is **`no`** (the API is remote, or no local
  `KB_ROOT` with `mkdocs.yml` exists) → **STOP**. Report that the document API at
  `<KB_API_BASE_URL>` is unreachable and there is no local knowledge base to write to;
  write no files and suggest no scaffolding.
- Only if `KB_LOCAL_FALLBACK` is **`yes`** do by hand, against the resolved
  `<KB_ROOT>`, what the API would have done:

- Write `<KB_ROOT>/docs/<project>/<date>-<slug>.md` with this frontmatter above
  the H1 — title always double-quoted (an unquoted colon breaks the whole site
  build); tags always a YAML list of 2–5 lowercase-kebab topic tags:

      ---
      title: "<Title>"
      date: <YYYY-MM-DD>
      tags:
        - <topic-tag>
      source:
        project: <project>
        repo: <absolute path to the current repo root>
      ---

- In `<KB_ROOT>/docs/index.md`, insert on a new line directly after the
  `<!-- explain:recent -->` marker:

      - <YYYY-MM-DD> · [<Title>](<project>/<date>-<slug>.md) — <project>

  If the marker is missing, insert as the first bullet under `## Recent`; if
  that heading is missing too, append a `## Recent` section (with the marker)
  at the end of the file.

- Commit — knowledge-base repo only. The KB has an auto-commit convention (see
  its README). Run exactly these two commands, spelled exactly this way, adding
  your own tool's standard Co-Authored-By trailer — naming the model that
  actually did the work — as a second `-m` (e.g. in Codex,
  `Co-Authored-By: GPT-5.5 <noreply@openai.com>`). These `git -C <KB_ROOT>`
  commands are not pre-approved (the KB path is not fixed), so they will prompt
  for permission — approve them:

      git -C <KB_ROOT> add -A
      git -C <KB_ROOT> commit -m "docs(<project>): add <slug>"

  Never push. Never commit in any other repo.

- Note for step 8: the API was down; a later `POST /api/reindex` to
  `<KB_API_BASE_URL>` — or `docker compose up -d` in `<KB_ROOT>` — reconciles the DB.

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
- Fallback path: the absolute file path `<KB_ROOT>/docs/<project>/<date>-<slug>.md`
  from step 6; view at `<KB_SITE_BASE_URL>/<project>/<date>-<slug>/`; and note the
  API was down — a later `POST /api/reindex` to `<KB_API_BASE_URL>`, or
  `docker compose up -d` in `<KB_ROOT>`, reconciles the DB.
- The project copy path, if one was made.
