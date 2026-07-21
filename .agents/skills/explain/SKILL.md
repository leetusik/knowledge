---
name: explain
description: Research a topic or code change in the current repo/conversation and save a single self-contained interactive HTML explainer — Background, Intuition, Code, a cited "Best practices & next steps" section, and a 5-question quiz — into your own personal knowledge base (the one /knowledge:setup created and configured). Use ONLY when the user wants an explanation persisted as a document (explain and document, write this up, document what we just changed) — NOT for ordinary questions that deserve a normal chat answer.
---

# explain

Produce an educational explainer — a single **self-contained interactive HTML page**
(spec in step 4) — about a topic **or a code change** in the current repo or
conversation, and file it in **your** personal knowledge base (the one
`/knowledge:setup` created). This skill produces a **saved document**: if the user only
asked a question and did not ask for anything to be saved, answer normally in chat and
write no files.

There is one output format everywhere: both modes — explaining a topic and explaining a
code change/diff/phase — emit the same interactive HTML explainer.

## 1. Resolve the topic and the mode

**Arguments** = the skill arguments: $ARGUMENTS. First, strip any of these **trailing
standalone words** (they compose — any combination, any order) and remember each flag:

- `here` → PROJECT_COPY=yes (also write a copy into the current project, step 7).
- `research` → force the "Best practices & next steps" web-research section **ON** (skip
  the judgment gate in step 3; still degrade gracefully offline).
- `no-research` → force that section **OFF** (run no web research this time).

Strip every trailing flag word before using the rest as the topic. `research` and
`no-research` are mutually exclusive; if both appear, the last one wins. If neither
appears, the section is **default-on through the judgment gate** (step 3).

**What remains after stripping is the TOPIC / change-ref.** Decide the MODE from it:

- **Change mode** — the arguments name or point at a code change: a diff, a branch, a
  PR, a commit or commit range, a phase, or a phrase like "what we just changed" / "this
  PR" / "the last commit". Also change mode when the arguments are **empty and** the
  conversation just completed a concrete code change (a review, a merge, a fix you just
  made) — i.e. "document what we just changed".
- **Topic mode** — anything else: the arguments name a concept, tool, subsystem, or file
  to explain. Also topic mode when the arguments are empty and the recent conversation is
  an analysis/discussion rather than a change you just made.
- **Empty and neither fits** → ask the user what to explain (a topic or a change), then
  continue.

Both modes produce the **same document**, with the same four content sections (step 4).
Only the lens differs, and step 3 says how.

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

Ground **every** claim in reality — never invent paths, commands, config snippets, or
behavior; quote them from real files. Reuse conclusions already established in this
conversation rather than re-deriving them. Audience: novice programmer, unless the user
says otherwise.

**Repo research — by mode:**

- **Change mode:** read the actual change, not your memory of it. Use `git diff`,
  `git log`, and `git show` (e.g. `git show <ref>`, `git diff <base>..<head>`,
  `git log --stat`) to get the real diff and the surrounding history, then read the
  changed files and the code around them. Every statement about what changed is grounded
  in the real diff and real files.
- **Topic mode:** read the real code, configs, compose files, and scripts that make the
  topic work here, exactly as before — walk the actual implementation.

**Web research — the "Best practices & next steps" section (default-on):**

This is the one part that reaches *beyond* the codebase: how the implementation compares
to prevailing external practice. Decide whether to run it:

1. **Forced?** If `no-research` was given (step 1), skip it — go to step 4 with no
   best-practices section. If `research` was given, run it (skip the judgment gate below)
   but still honor the offline degradation in point 4.
2. **Judgment gate (the default path).** Run web research **unless** the subject has no
   meaningful external comparison surface: skip it for purely-internal material
   (repo-private glue, personal naming conventions, one-off wiring nobody else has an
   opinion on) and for trivial fixes (a typo, a version bump, a one-line guard). When in
   doubt on a substantive engineering subject, run it.
3. **Run it (WebSearch / WebFetch).** Search for how this class of problem is solved in
   general — the relevant patterns, standards, well-known libraries, documented
   trade-offs — and **open the pages you cite** (WebFetch) so every claim rests on a page
   you actually read. Gather enough to say: where the implementation **aligns** with
   prevailing practice, where it **deliberately diverges** (and why that can be
   legitimate here), and **2–4 concrete next steps**.
4. **Degrade gracefully — never hang, never loop, never fail the save.** If WebSearch /
   WebFetch are unavailable, or the first couple of attempts error or time out, **stop
   trying**: skip the section, remember the outcome as `skipped-offline`, and move on to
   step 4. This skill runs unattended at automated phase reviews — the offline path must
   always fall through to a successful save. Do not retry in a loop.

Remember the outcome for the report (step 8): **included**, **skipped-by-judgment**
(purely-internal / trivial), or **skipped-offline** (tools unavailable or errored). A
failed research step **never** blocks the save.

## 4. Write the document — one interactive HTML explainer

The output is **always** a single self-contained interactive HTML page (both modes).
There is no markdown output any more. Author the whole page, then save it in step 5.

### 4.1 Hard constraints (the render breaks if violated)

The knowledge base renders this file inside an opaque-origin
`sandbox="allow-scripts"` iframe: inline JavaScript runs, but **every external request is
blocked and there is no `allow-forms` / `allow-popups`**. So:

- **Self-contained, zero external requests.** Inline `<style>` and inline `<script>`
  only. No CDN, no web fonts (use a system font stack), no network-fetched images, no
  `<link rel="stylesheet">`, no `@import`, no `url(http…)`. **No `fetch` /
  `XMLHttpRequest` anywhere.** Diagrams are HTML/CSS or inline `<svg>` — never a fetched
  image.
- **No `<form>`** and **no `target="_blank"`** (the sandbox allows neither). Plain
  `<a href="…">` links are fine; the quiz uses plain buttons/divs with JS handlers.
- The file **starts exactly at `<!DOCTYPE html>`** — no leading blank line, no
  frontmatter (the API writes the metadata itself, step 5).

### 4.2 Page shape

- `<!DOCTYPE html>`, `<html lang="en">`, `<head>` with `<meta charset>`,
  `<meta name="viewport" content="width=device-width, initial-scale=1">`, and a
  `<title>` matching the document's H1.
- One long page (**no tab navigation**) with a **table of contents** at the top linking
  each section by `id`. Sections in this fixed order:

  1. **Background** — change mode: the system as it was before this change, plus context;
     topic mode: what this is and why it exists here. Offer a deeper beginner background
     (note it can be skipped if the reader already knows it), then the narrower part
     directly relevant.
  2. **Intuition** — the core idea in essence (not the full detail), with **concrete toy
     data** and diagrams; change mode: why the change and what it buys; topic mode: the
     mental model.
  3. **Code** — a high-level walkthrough of the real code: change mode walks the diff,
     grouped/ordered logically; topic mode walks the actual implementation here.
  4. **Best practices & next steps** — *present only when step 3 ran web research.* When
     research was skipped, this section **and its ToC entry are simply absent** — the
     document carries no "skipped" note; the chat report (step 8) says why instead. See
     §4.3.
  5. **Quiz** — 5 interactive questions (§4.4).

- Readable column width, comfortable typography, responsive/mobile styling. Use
  **callout boxes** for key concepts, definitions, and important edge cases. Render code
  in `<pre>` blocks whose CSS sets `white-space: pre-wrap` (or `pre` with horizontal
  scroll in a container) — before saving, scan every code block and confirm this, or the
  browser collapses the newlines onto one line.
- **Diagrams are HTML/CSS or inline SVG, never ASCII art.** Pick a small family of
  diagram styles and reuse them across the explanation; put real example data in the
  figures (a simplified UI view for UI changes, a data-flow/component diagram with
  example data for system changes).
- Tone: the clarity and flow of Martin Kleppmann — an essay with smooth transitions
  between sections, not a bullet dump; define each piece of jargon on first use; classic,
  engaging, novice-friendly by default. **No length cap** — as long as the teaching needs
  (typical explainers run a few hundred lines of HTML).

### 4.3 The "Best practices & next steps" section (when present)

- Cover three things: where the implementation **aligns** with prevailing practice, where
  it **deliberately diverges** (and why that can be a legitimate choice here), and **2–4
  concrete next steps**.
- **Every claim carries a source link to a page you actually opened during research — no
  citation, no claim.** Never cite a page you did not read.
- **Keep the source visible in plain text**, because the KB's search and MCP surfaces
  index only the *extracted text* and an `href` is not text — a bare "source" link would
  lose its provenance there. Write each citation so the domain survives as text: link
  text that names the source, plus the bare domain in parentheses, e.g.:

      <p>Request-scoped connection pooling is standard practice for this
      (<a href="https://www.postgresql.org/docs/current/runtime-config-connection.html">PostgreSQL
      docs</a> — postgresql.org).</p>

### 4.4 The quiz

- **5 medium-difficulty multiple-choice questions** that test substantive understanding
  — hard enough that you must actually understand the subject to answer, but not gotchas.
- Show each question's options as plain buttons/divs. On click, give **immediate
  feedback**: mark correct/incorrect and reveal a one-line "why". **No `<form>`** — wire
  it with a small inline `<script>` and click handlers; keyboard-friendly where easy.

Use the **structural skeleton and one worked quiz item below as the spec** — generate all
the real teaching content and all five real questions in this shape. It is a contract,
not a literal template to paste:

    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title><!-- matches the H1 --></title>
      <style>
        :root { color-scheme: light dark; }
        body { max-width: 46rem; margin: 2rem auto; padding: 0 1rem;
               font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
               line-height: 1.6; }
        pre  { white-space: pre-wrap; overflow-wrap: anywhere;
               background: #f4f4f4; padding: .75rem; border-radius: 6px; }
        .callout { border-left: 4px solid #4a7; background: #f0f8f4;
                   padding: .75rem 1rem; margin: 1rem 0; border-radius: 4px; }
        .q .opt { display: block; width: 100%; text-align: left; margin: .3rem 0;
                  padding: .5rem .75rem; cursor: pointer; }
        .q .opt.correct   { background: #d6f5d6; }
        .q .opt.incorrect { background: #f7d6d6; }
        .q .why { margin: .4rem 0 0; font-size: .95em; }
      </style>
    </head>
    <body>
      <h1><!-- title --></h1>

      <nav aria-label="Contents">
        <strong>Contents</strong>
        <ol>
          <li><a href="#background">Background</a></li>
          <li><a href="#intuition">Intuition</a></li>
          <li><a href="#code">Code</a></li>
          <!-- include the next line ONLY when the research section is present -->
          <li><a href="#best-practices">Best practices &amp; next steps</a></li>
          <li><a href="#quiz">Quiz</a></li>
        </ol>
      </nav>

      <section id="background"><h2>Background</h2> … </section>
      <section id="intuition"><h2>Intuition</h2> … </section>
      <section id="code"><h2>Code</h2> … </section>
      <!-- include this section ONLY when step 3 ran web research -->
      <section id="best-practices"><h2>Best practices &amp; next steps</h2> … </section>

      <section id="quiz">
        <h2>Quiz</h2>
        <div class="q" id="q1">
          <p><strong>1.</strong> Which statement is true?</p>
          <button class="opt" data-correct="false">Option A</button>
          <button class="opt" data-correct="false">Option B</button>
          <button class="opt" data-correct="true">Option C</button>
          <p class="why" hidden>Because C is the only one that … .</p>
        </div>
        <!-- q2 … q5 in the same shape -->
      </section>

      <script>
        document.querySelectorAll('.q').forEach(function (q) {
          var why = q.querySelector('.why');
          q.querySelectorAll('.opt').forEach(function (btn) {
            btn.addEventListener('click', function () {
              var right = btn.dataset.correct === 'true';
              btn.classList.add(right ? 'correct' : 'incorrect');
              if (why) why.hidden = false;
            });
          });
        });
      </script>
    </body>
    </html>

## 5. Save via the KB document API

- project = the current repo's root directory name, verbatim (e.g. `hi2vi_web`);
  if it contains path-unsafe characters, lowercase it and replace them with `-`.
- slug = short lowercase-kebab topic name (e.g. `shared-nginx-explained`);
  date = today, `YYYY-MM-DD`.
- Build the request in a temp dir — `<tmp>` below means
  `/tmp/explain-<date>-<slug>/` — so the document body and title never pass
  through shell arguments.
- Write `<tmp>/body.html`: the **raw HTML document you authored in step 4, starting
  exactly at `<!DOCTYPE html>`, with NO frontmatter** (the API writes the `<!--kb …-->`
  comment-frontmatter itself).
- Write `<tmp>/meta.json` with exactly these fields — note `"format": "html"`. Leave
  `date`, `slug`, `overwrite`, and `commit` unset (API defaults). `co_authored_by` is the
  bare attribution value naming the model that actually did the work — the API prepends
  `Co-Authored-By: ` itself (e.g. in Codex, `GPT-5.5 <noreply@openai.com>`):

      {
        "title": "<Title>",
        "project": "<project>",
        "format": "html",
        "tags": ["<2–5 lowercase-kebab topic tags>"],
        "source_repo": "<absolute path to the current repo root>",
        "co_authored_by": "<bare attribution>"
      }

- Merge — run exactly this command, spelled exactly this way (the raw HTML rides the
  existing `markdown` field; `"format": "html"` in the payload tells the API to treat it
  as an HTML explainer and write the comment-frontmatter):

      python3 -c 'import json,sys; m=json.load(open(sys.argv[1])); m["markdown"]=open(sys.argv[2]).read(); json.dump(m, open(sys.argv[3], "w"))' <tmp>/meta.json <tmp>/body.html <tmp>/payload.json

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

- Write `<KB_ROOT>/docs/<project>/<date>-<slug>.html` with **exactly the leading
  `<!--kb …-->` comment-frontmatter the API writes for an HTML doc**, then a blank line,
  then the raw HTML body starting at `<!DOCTYPE html>`. The block is an HTML comment (so
  the browser ignores it) carrying the same fields a `reindex` re-derives — title always
  a double-quoted JSON string (an unquoted colon would break parsing); tags a YAML list
  of 2–5 lowercase-kebab topic tags. Write it byte-for-byte in this shape:

      <!--kb
      title: "<Title>"
      date: <YYYY-MM-DD>
      tags:
        - <topic-tag>
      source:
        project: <project>
        repo: <absolute path to the current repo root>
      -->

      <!DOCTYPE html>
      … the raw HTML document from step 4 …

- Ensure the project landing exists — mkdocs builds `site/<project>/index.html`
  from it, and the site deploy gate requires one per project. The landing stays a
  Markdown `.md` file. If `<KB_ROOT>/docs/<project>/index.md` is **missing**, create it
  with this minimal content (an H1 and a one-liner, **no** YAML frontmatter). NEVER
  overwrite an existing landing:

      # <project>

      Explainers about `<project>`, kept in this knowledge base.

- In `<KB_ROOT>/docs/index.md`, insert on a new line directly after the
  `<!-- explain:recent -->` marker (note the `.html` rel_path):

      - <YYYY-MM-DD> · [<Title>](<project>/<date>-<slug>.html) — <project>

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

Only when PROJECT_COPY=yes: also write the document — the **raw HTML, no
frontmatter** (starting at `<!DOCTYPE html>`) — to
`<repo-root>/<TOPIC>_EXPLAINED.html` (topic in SCREAMING_SNAKE, e.g.
`SHARED_NGINX_EXPLAINED.html`). Do not commit it; that repo belongs to the user.

## 8. Report

Tell the user:

- API path: the document is saved and committed in the KB; view at the `url`
  from the response. If `committed` is `false` with a `commit_error`, say the
  document was saved but the commit failed, and quote the error.
- Fallback path: the absolute file path `<KB_ROOT>/docs/<project>/<date>-<slug>.html`
  from step 6; view at `<KB_SITE_BASE_URL>/<project>/<date>-<slug>.html`; and note the
  API was down — a later `POST /api/reindex` to `<KB_API_BASE_URL>`, or
  `docker compose up -d` in `<KB_ROOT>`, reconciles the DB.
- The **research-section outcome**, one line: **included**, **skipped-by-judgment**
  (purely-internal subject / trivial fix), or **skipped-offline** (research tools
  unavailable or errored) — with a short why.
- The project copy path, if one was made.
