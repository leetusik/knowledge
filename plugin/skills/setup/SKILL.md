---
name: setup
description: Wire /knowledge:explain to a knowledge base — either connect to the hosted KB at https://knowledge.hi2vi.com (sign up, mint a key, paste it; zero infrastructure) or scaffold your own self-hosted KB (MkDocs site + document API + knowledge graph + Pages workflow). Run once after installing the plugin, or re-run to reconfigure.
argument-hint: [target-dir]
disable-model-invocation: true
allowed-tools: Read, Glob, Bash(python3 -c:*), Bash(curl -sS --max-time 5:*)
---

# setup

Wire `/knowledge:explain` to a knowledge base. There are **two modes**, and the first
thing this skill does is ask which one the user wants:

- **Connect** (recommended for most plugin users) — link to the **hosted** knowledge base
  at `https://knowledge.hi2vi.com`. No Docker, no server to run: the user signs up in
  their browser, mints one ingest key, pastes it here, and is done. Their explainers post
  to their own tenant and render in the web app.
- **Scaffold** — stand up the user's **own self-hosted** knowledge base from the plugin's
  templates: a MkDocs Material site, a FastAPI + SQLite document API, an interactive
  knowledge graph, and a GitHub Pages publishing workflow. Full control, runs on their own
  machine (Docker recommended).

Both modes end by writing the single config file `/knowledge:explain` reads
(`$XDG_CONFIG_HOME/knowledge-kb/config.json`, default
`~/.config/knowledge-kb/config.json`), so afterwards `/knowledge:explain` just works. The
skill is safe to re-run — switch modes, or reconfigure an existing setup, any time.

## Choose your mode

If the user passed a **target-dir argument** (`$ARGUMENTS` non-empty), they mean scaffold
mode — skip the question and go straight to **Scaffold mode**. Otherwise ask: **connect to
the hosted KB, or scaffold a self-hosted one?** Suggest **connect** as the default for a
plugin user who just wants `/knowledge:explain` to work with zero infrastructure;
**scaffold** is for someone who wants to run and own the whole stack on their own machine.

- **Connect** → follow **Connect mode** below and stop there; the numbered scaffold stages
  do **not** run.
- **Scaffold** → skip to **Scaffold mode** (stage 1 onward).

## Connect mode — link to the hosted knowledge base

Connect mode wires `/knowledge:explain` to the hosted knowledge base at
`https://knowledge.hi2vi.com` — no Docker, no scaffold, no site to run. The user signs up
in their browser, mints one ingest key, and pastes it here; from then on
`/knowledge:explain` posts explainers to **their own tenant**, and they render in the web
app. This is the zero-infrastructure default for plugin users.

**One key, all repos.** The user mints a **single** `vk_` key, once. `/knowledge:explain`
sends the current repo's directory name as each document's `project` on every call, so the
same key files explainers from **every** repo the user works in — each under its own
project name in their tenant. The key's own bound project is only how usage is attributed;
there is **no** need for a second key per repo.

**The only secret is the pasted key.** The user's email and password **never** pass
through the agent — the browser does the sign-in, and the one thing that crosses back to
this skill is the pasted `vk_` key. Treat it like a password: this skill writes it into the
user's private config file (and nowhere else), **never** into a commit or a shell-visible
argument. This is the one sanctioned secret write — scaffold mode below writes no secrets
at all.

### C1. Sign up (or sign in) in the browser

Tell the user to open `https://knowledge.hi2vi.com/signup` and **Create your account** with
an email and a password of at least 8 characters (the form's hint is *"At least 8
characters"*). A workspace is created for them automatically. If they already have an
account, they open `https://knowledge.hi2vi.com/login` and **Sign in** instead.

The user does this in their own browser. **Do not** ask the user to type their email or
password to the agent — authentication happens entirely in the browser, and only the
minted key comes back here.

### C2. Create a project

On the **Dashboard**, under **Projects**, the user clicks **New project**, types a
**Project name** (e.g. a repo they will file explainers from), and clicks **Create**. Then
they click **Open** on that project's row to go to its page.

(A brand-new project name can also be used later without pre-creating it — the write path
accepts any project name — but creating one now gives a place to mint the key and watch
usage.)

### C3. Mint an ingest key

On the project page, under **API keys**, the user clicks **New key**, optionally gives it a
**Key name** (e.g. *"Production ingest"*) to tell keys apart, and clicks **Create key**.

The web app then shows the **Copy your new key now** panel, warning *"This is the only time
this key will ever be shown. It cannot be recovered — if you lose it, revoke it and create
a new one."* The user clicks **Copy**. That `vk_…` string is the ingest key.

### C4. Paste the key and wire up the config

Ask the user to paste the `vk_…` key. Then write the config that points
`/knowledge:explain` at the hosted KB — this exact shape (**no `kb_root`**; connect mode is
remote-only, so there is no local KB and therefore no file fallback):

    {
      "api": {
        "base_url": "https://knowledge.hi2vi.com",
        "token": "<the pasted vk_ key>"
      },
      "site": {
        "base_url": "https://knowledge.hi2vi.com"
      }
    }

Write it **secret-safely** — the key must never land in a shell argument or a commit. Do it
in this order:

1. Resolve the config path (the same path `/knowledge:explain`'s resolver reads):

       python3 -c '
       import os
       xdg = os.environ.get("XDG_CONFIG_HOME") or os.path.join(os.path.expanduser("~"), ".config")
       print(os.path.join(xdg, "knowledge-kb", "config.json"))
       '

2. If that file **already exists**, read it, **show the user its current contents**, and
   **ask before replacing it** — a local self-host config may already live there, and
   connect mode would overwrite it. Only proceed on a yes; if the user declines, keep the
   old config and say `/knowledge:explain` still points where it did.
3. `mkdir -p` the `knowledge-kb` directory (Bash — prompts).
4. Write the pasted key **alone** to a temp file (e.g. `/tmp/kb-connect/vk.txt`) with the
   Write tool (prompts). Nothing else goes in that file.
5. Compose the config from that temp file, so the key is read from disk and never becomes a
   shell argument (`base_url` is the fixed public host, safe as a literal):

       python3 -c '
       import json, sys
       token = open(sys.argv[1]).read().strip()
       cfg = {
           "api": {"base_url": "https://knowledge.hi2vi.com", "token": token},
           "site": {"base_url": "https://knowledge.hi2vi.com"},
       }
       json.dump(cfg, open(sys.argv[2], "w"), indent=2)
       ' /tmp/kb-connect/vk.txt "<config path from step 1>"

6. `chmod 600 "<config path>"` (Bash — prompts): the file holds the user's key, keep it
   private.
7. Delete the temp key file — `rm /tmp/kb-connect/vk.txt` (Bash — prompts) — so the
   plaintext key survives only inside the private config.

**Env-var escape hatch.** For a one-off or a per-shell override, the user can skip the file
and export `KB_API_BASE_URL=https://knowledge.hi2vi.com` and `KB_API_TOKEN=<vk_>` in their
shell — `/knowledge:explain`'s resolver honors those over the config file. The config file
is the durable, machine-wide setting; the env vars are the transient override.

### C5. Verify the connection

Confirm the key works with one authenticated read (safe — it lists at most one document and
writes nothing), substituting the pasted key:

    curl -sS --max-time 5 -H "Authorization: Bearer <vk_>" \
      "https://knowledge.hi2vi.com/api/documents?limit=1"

- **HTTP 200** (a JSON `{total, items}` body) → **connected.** Report to the user:
  `/knowledge:explain` now saves to **their** tenant from **any** repo, and their documents
  render in the web app under **Documents** (`https://knowledge.hi2vi.com/documents`).
- **HTTP 401** → the key is wrong or was revoked. Have the user re-check they pasted the
  whole `vk_…` string, or mint a fresh key (project page → **API keys** → **New key**) and
  re-run connect mode. Do **not** fall back to anything.

Connect mode is then done — suggest `/knowledge:explain <topic>` to file the first
explainer to the hosted KB.

### Prefer the terminal? Use the standalone CLI instead

A user who would rather stay in the terminal can do this whole onboarding (sign up →
project → key → config) without a browser hand-off, via the standalone `knowledge` CLI:

    uv tool install git+https://github.com/leetusik/knowledge#subdirectory=cli
    knowledge init

`knowledge init` writes the **same** `~/.config/knowledge-kb/config.json` this skill writes,
so `/knowledge:explain` picks it up identically. Either path works — the user needs only
one.

## Scaffold mode — self-host your own knowledge base

Scaffold mode stands up a brand-new personal knowledge base for the user and wires
`/knowledge:explain` to it. This is a one-time installer: it interviews the user, renders
their KB from the plugin's templates, initializes git, writes the config file that
`/knowledge:explain` reads, brings the stack up (or prints the no-Docker alternative), and
hands them the GitHub Pages go-live steps. It is safe to re-run — a second run reconfigures
or re-renders an existing scaffold rather than clobbering it.

**This mode mutates the filesystem, runs git, and starts containers.** Only the read-only
probes below (`python3 -c` one-liners, `Read`, `Glob`) are pre-approved. Every mutation —
running the renderer, `mkdir`, writing the config and the marker, `chmod`, `git`, `docker`
— will ask the user for permission the first time. That is deliberate: the user should see
each thing this skill does to their machine. Do NOT try to suppress those prompts. **Never
write a secret (Gemini/API key, bearer token) into any file scaffold mode creates** — the
self-hosted config's `api.token` stays `null` (unlike connect mode, which writes the user's
own `vk_` key into `api.token`).

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
      "plugin_version": "0.3.0",
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

`plugin_version` is `0.3.0` — the current plugin version; it never contains a
secret. (On re-render, overwrite the marker with the new params and today's
`rendered_at`.)

**Initialize git** — skip this whole step if `git=no` from stage 1, and skip it
on a stage-3 re-render if the target is already a git repo (just show the diff).
Run in the target dir; never push:

    git -C "<target-dir>" init
    git -C "<target-dir>" add -A
    git -C "<target-dir>" commit -m "chore: scaffold knowledge base (knowledge plugin v0.3.0)"

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
