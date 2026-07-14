---
name: setup
description: Scaffold your own knowledge base (MkDocs site + document API + knowledge graph + Pages workflow) and wire /knowledge:explain to it; run once after installing the plugin, or re-run to reconfigure.
argument-hint: [target-dir]
disable-model-invocation: true
allowed-tools: Read, Glob, Bash(python3 -c:*)
---

# setup

Scaffold a brand-new personal knowledge base for the user and wire
`/knowledge:explain` to it. This is a one-time installer: it interviews the
user, renders their KB from the plugin's templates, initializes git, writes the
config file that `/knowledge:explain` reads, brings the stack up (or prints the
no-Docker alternative), and hands them the GitHub Pages go-live steps. It is
safe to re-run — a second run reconfigures or re-renders an existing scaffold
rather than clobbering it.

**This skill mutates the filesystem, runs git, and starts containers.** Only the
read-only probes below (`python3 -c` one-liners, `Read`, `Glob`) are
pre-approved. Every mutation — running the renderer, `mkdir`, writing the config
and the marker, `chmod`, `git`, `docker` — will ask the user for permission the
first time. That is deliberate: the user should see each thing this skill does
to their machine. Do NOT try to suppress those prompts. **Never write a secret
(Gemini/API key, bearer token) into any file this skill creates.**

## 1. Preflight — resolve the payload and detect tools

The plugin's payload lives at `${CLAUDE_PLUGIN_ROOT}`. The renderer is
`${CLAUDE_PLUGIN_ROOT}/setup/render.py` and its templates sit beside it under
`${CLAUDE_PLUGIN_ROOT}/templates/` — the renderer resolves templates relative to
itself, so you only ever name the script.

Detect the three tools once and remember the results:

    python3 -c '
    import shutil
    for tool in ("python3", "git", "docker"):
        print(tool + "=" + ("yes" if shutil.which(tool) else "no"))
    '

- `python3=no` → **hard stop.** (You are running under it, so this cannot
  actually happen, but if the check ever prints `no`, stop and say python3 is
  required.)
- `git=no` → **degraded, keep going.** Warn once that git is not installed; skip
  the `git init` + initial commit in stage 4 and tell the user their KB will not
  be a git repo (Pages publishing in stage 7 needs one — they can `git init`
  later).
- `docker=no` → the local stack cannot start; stage 6 prints the no-Docker
  alternative instead of bringing containers up.

## 2. Interview

Collect the parameters below. If `$ARGUMENTS` is non-empty, take it as the
**target dir** and do not ask for that one. Offer every default; let the user
accept it with Enter. Ask the ports question only if they say they want to
change ports ("advanced").

| Parameter | Prompt / default | Feeds |
| --- | --- | --- |
| target dir | default `~/knowledge` (expand `~` to `$HOME`) | render `--dest`, config `kb_root` |
| site title | default `Knowledge Base` | `KB_SITE_NAME` |
| GitHub `owner/repo` | **optional**; skip for local-only | `KB_SITE_URL` (see below), stage 7 |
| copyright line | default = the site title | `KB_COPYRIGHT` |
| timezone | default = host TZ (detect below), else `UTC` | `KB_TZ` |
| viewer port | default `8765` (ask only if "advanced") | `KB_VIEWER_PORT`, `site.base_url` |
| API port | default `8766` (ask only if "advanced") | `KB_API_PORT`, `api.base_url` |
| Gemini key | **do NOT collect** — explain host-env only (see below) | nothing written |

Derive the rest without asking:

- **`KB_SITE_URL`** — if the user gave `owner/repo`, it is
  `https://<owner>.github.io/<repo>/` (GitHub mode). If they skipped it, it is
  `http://localhost:<viewer_port>/` (local-only mode). Remember which mode you
  are in for stages 6–7.
- **`KB_COPYRIGHT`** — the whole footer line, substituted verbatim into
  `mkdocs.yml`'s `copyright:`. The default is just the site title; the user may
  type a fuller line (e.g. `Field Notes · built with mkdocs-material`).
- **`KB_DATE`** — today, `YYYY-MM-DD`. Get it (and the host timezone) with:

      python3 -c '
      import os, pathlib, datetime
      tz = os.environ.get("TZ")
      if not tz:
          p = pathlib.Path("/etc/localtime")
          if p.is_symlink():
              t = os.readlink(p)
              tz = t.split("zoneinfo/", 1)[1] if "zoneinfo/" in t else None
      print("KB_TZ_DEFAULT=" + (tz or "UTC"))
      print("KB_DATE=" + datetime.date.today().isoformat())
      '

- **Gemini key** — never collect it. Tell the user plainly: semantic search
  needs a Gemini key set as `GOOGLE_API_KEY` (or `GEMINI_API_KEY`) in the shell
  or compose env **later**; without it, search still works (keyword/BM25 only).
  This skill writes no key anywhere.

**Confirm before touching disk.** Print a summary of every resolved value
(target dir, mode, all 7 `KB_*` tokens, ports, config path) and the actions you
are about to take, and ask the user to confirm. Only proceed on a yes.

## 3. Target-dir safety

Classify the target dir before rendering:

    python3 -c '
    import os, sys
    d = os.path.expanduser(sys.argv[1])
    if not os.path.isdir(d) or not os.listdir(d):
        print("EMPTY")
    elif os.path.isfile(os.path.join(d, ".kb-scaffold.json")):
        print("MARKED")
    else:
        print("UNMARKED")
    ' <target-dir>

- **`EMPTY`** (missing or empty) → proceed to stage 4 (fresh render).
- **`MARKED`** (a `.kb-scaffold.json` from a previous run) → **re-run mode.**
  Read the marker, show its `params`, and offer three choices:
  - **(a) reconfigure only** — leave the scaffold as-is, skip to stage 5 to
    rewrite the config file (use this when only ports / GitHub owner changed).
  - **(b) re-render** — run the renderer with `--force` (stage 4), then show
    `git status` / `git diff` in the target and tell the user to review the
    changes before committing (only meaningful if the target is a git repo).
  - **(c) abort** — stop and change nothing.
- **`UNMARKED`** (non-empty, no marker) → **refuse.** Say plainly you will not
  render into a directory this plugin does not own, and suggest an empty target
  or a re-run of an existing scaffold. (The operator's own KB at
  `~/projects/personal/knowledge` has no marker, so this refusal covers it by
  construction — never scaffold on top of it.)

## 4. Render + marker + git

**Render** the scaffold. Pass all seven tokens together (the renderer fails if
any is missing or if an unknown key is given). Quote each value; add `--force`
only in the stage-3 re-render path:

    python3 "${CLAUDE_PLUGIN_ROOT}/setup/render.py" --dest "<target-dir>" \
      --set KB_SITE_NAME="<site title>" \
      --set KB_SITE_URL="<site url>" \
      --set KB_COPYRIGHT="<copyright line>" \
      --set KB_TZ="<timezone>" \
      --set KB_VIEWER_PORT="<viewer port>" \
      --set KB_API_PORT="<api port>" \
      --set KB_DATE="<YYYY-MM-DD>"

The renderer writes the whole KB tree (server, docs, mkdocs.yml, compose.yml,
Dockerfile, workflows, a seed `getting-started` explainer dated `KB_DATE`, …)
and refuses to leave any `{{KB_...}}` token unsubstituted.

**Write the marker** `.kb-scaffold.json` into the target dir so a later run
recognizes this as a KB we own. Use the Write tool (it prompts — this is a
mutation) with exactly this shape, filling the **non-secret** params only:

    {
      "plugin": "knowledge",
      "plugin_version": "0.2.1",
      "rendered_at": "<YYYY-MM-DD>",
      "params": {
        "KB_SITE_NAME": "<site title>",
        "KB_SITE_URL": "<site url>",
        "KB_COPYRIGHT": "<copyright line>",
        "KB_TZ": "<timezone>",
        "KB_VIEWER_PORT": "<viewer port>",
        "KB_API_PORT": "<api port>",
        "KB_DATE": "<YYYY-MM-DD>"
      }
    }

`plugin_version` is `0.1.0` — the current plugin version; it never contains a
secret. (On re-render, overwrite the marker with the new params and today's
`rendered_at`.)

**Initialize git** — skip this whole step if `git=no` from stage 1, and skip it
on a stage-3 re-render if the target is already a git repo (just show the diff).
Run in the target dir; never push:

    git -C "<target-dir>" init
    git -C "<target-dir>" add -A
    git -C "<target-dir>" commit -m "chore: scaffold knowledge base (knowledge plugin v0.1.0)"

The scaffold ships a `.gitignore` that already excludes `site/`, `.env`,
`__pycache__/`, and `/data/`, so the initial commit is clean.

## 5. Config file — wire /knowledge:explain to this KB

`/knowledge:explain` finds this KB by reading a config file. Write it at
`$XDG_CONFIG_HOME/knowledge-kb/config.json`, defaulting to
`~/.config/knowledge-kb/config.json`. The schema is **nested** and must match
`/knowledge:explain`'s resolver exactly — a flat shape will not be read:

    {
      "kb_root": "<absolute target-dir>",
      "api": {
        "base_url": "http://localhost:<api port>",
        "token": null
      },
      "site": {
        "base_url": "http://localhost:<viewer port>"
      }
    }

`api.token` is JSON `null` — this skill never writes a bearer token. (Set one
later by editing this file's `api.token`, or via the `KB_API_TOKEN` env var, if
you enable auth on the API.)

Do it in this order (each mutation prompts):

1. Resolve the config path:

       python3 -c '
       import os
       xdg = os.environ.get("XDG_CONFIG_HOME") or os.path.join(os.path.expanduser("~"), ".config")
       print(os.path.join(xdg, "knowledge-kb", "config.json"))
       '

2. If that file **already exists**, read it, show it, and ask before
   overwriting. One config, last-setup-wins: a second KB is out of scope — the
   newest setup owns the config. If the user declines, keep the old config and
   say `/knowledge:explain` will still point at the previous KB.
3. `mkdir -p` the `knowledge-kb` directory (Bash — prompts).
4. Write the JSON above with the Write tool (prompts).
5. `chmod 600 <config path>` (Bash — prompts): the file is user-private.

## 6. Bring the stack up

**Docker present** (`docker=yes`): start the stack in the target, then probe
both services. First build takes a few minutes.

    docker compose -f "<target-dir>/compose.yml" up -d
    curl -sS --max-time 5 http://localhost:<api port>/healthz
    curl -sS --max-time 5 -o /dev/null -w '%{http_code}\n' http://localhost:<viewer port>/

- Healthz returns `{"status":"ok", ...}` when the API is live; the viewer probe
  should print `200`. Report both results.
- If `up` fails with a **port bind error**, the chosen ports are already in use
  (the operator's own stack may hold 8765/8766). Say so, offer to re-run from
  stage 2 with different ports, and stop bring-up.

**No Docker** (`docker=no`): print the alternative and do not try to start
anything:

- Run the API directly with uv: `uv sync` then
  `uv run uvicorn server.main:app --port <api port>` from the target dir.
- Serve the site alone later with the pinned mkdocs-material image, or just
  build it (`docker compose run --rm kb build`) when Docker is available.
- **State clearly:** even with nothing running, `/knowledge:explain` still works
  — when the API is unreachable it falls back to writing the explainer straight
  into this local KB (that fallback is exactly why the config points `kb_root`
  at the target dir).

## 7. Go-live handoff

Print a short checklist tailored to the mode.

**GitHub mode** (owner/repo given):

1. Create the repo on GitHub (empty), named to match the `owner/repo` you gave.
2. `git -C "<target-dir>" remote add origin git@github.com:<owner>/<repo>.git`
   (or the HTTPS URL), then `git -C "<target-dir>" push -u origin main`.
3. Enable Pages: repo **Settings → Pages → Source: GitHub Actions**.
4. The first push runs the shipped `pages.yml` workflow (mkdocs build + the
   `site_smoke.py` deploy gate); when it passes, the site is live at
   `<KB_SITE_URL>`.

Never push for the user — they run the `git push` themselves.

**Local-only mode** (owner/repo skipped): the site serves locally at
`http://localhost:<viewer port>/`. To publish to GitHub Pages later, re-run
`/knowledge:setup` (choose **reconfigure** in stage 3) and give an `owner/repo`
— that rewrites `KB_SITE_URL` and the config, and you follow the GitHub steps
above.

Close with: try `/knowledge:explain <topic>` to write your first explainer.
