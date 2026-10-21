---
name: explain
description: Research a topic or code change (in the current repo, or a general subject with no repo behind it) and publish a native chapter — Background, Intuition, Code or worked examples, a cited "Best practices & next steps" section, and a quiz, with real diagrams, figures and callouts — into your own personal knowledge base (the one /knowledge:setup created and configured), placed in a book when the work is a phase or a slice. Use ONLY when the user wants an explanation persisted as a document (explain and document, write this up, document what we just changed, teach me X and save it) — NOT for ordinary questions that deserve a normal chat answer.
argument-hint: <topic or change-ref> [here] [research|no-research] [book=<slug>] [lang=<xx>]
allowed-tools: Read, Grep, Glob, Write, Bash(curl -sS --max-time 5:*), Bash(curl -sS --max-time 30:*), Bash(python3 -c:*), Bash(knowledge --base-url:*), Bash(knowledge --version:*), WebSearch, WebFetch, Bash(git diff:*), Bash(git log:*), Bash(git show:*)
---

# explain

Produce an educational explainer — a **native chapter**: Markdown with a few typed
blocks (figures, diagrams, SVG, quizzes, sources) that the knowledge base renders
itself — about a topic **or a code change** in the current repo or conversation, or
about a **general subject** with no repo behind it, and file it in **your** personal
knowledge base (the one `/knowledge:setup` created). This skill produces a **saved
document**: if the user only asked a question and did not ask for anything to be saved,
answer normally in chat and write no files.

There is one output format everywhere: **native**. You never write HTML, and the
knowledge base never runs your code. Everything interactive (the quiz, the collapsible
callouts, the diagrams) is declared in the chapter's text and drawn by the reader.

## 1. Resolve the topic, the mode and the placement

**Arguments** = the skill arguments: $ARGUMENTS. First, strip any of these **trailing
standalone words** (they compose — any combination, any order) and remember each:

- `here` → PROJECT_COPY=yes (also write a copy into the current project, step 7).
- `research` → force the "Best practices & next steps" web-research section **ON** (skip
  the judgment gate in step 3; still degrade gracefully offline).
- `no-research` → force that section **OFF** (run no web research this time).
- `book=<slug>` → BOOK: publish this as a chapter of that book (lowercase-kebab slug).
- `lang=<xx>` → LANG: the chapter's language as a lowercase two- or three-letter code
  (`en`, `ko`). Without it, use the language the user is writing in (default `en`).

Strip every trailing flag word before using the rest as the topic. `research` and
`no-research` are mutually exclusive; if both appear, the last one wins. If neither
appears, the section is **default-on through the judgment gate** (step 3).

**What remains after stripping is the TOPIC / change-ref.** Decide the MODE from it:

- **Change mode** — the arguments name or point at a code change: a diff, a branch, a
  PR, a commit or commit range, a **phase** or a **slice**, or a phrase like "what we just
  changed" / "this PR" / "the last commit". Also change mode when the arguments are
  **empty and** the conversation just completed a concrete code change.
- **Topic mode** — the arguments name a concept, tool, subsystem, or file *of this repo*
  to explain. Also topic mode when the arguments are empty and the recent conversation is
  an analysis of this repo rather than a change you just made.
- **General mode** — the subject has **no repo behind it**: finance, history, a paper, a
  language, a skill the user is learning. It is general mode whenever you are not in a
  git repo, or the topic is plainly not about the repo's code. There is no code to read:
  the web and the conversation are the evidence, so the sources block (§4.6) is required.
- **Empty and none fits** → ask the user what to explain, then continue.

All three modes produce the **same kind of chapter**, with the same recommended outline
(§4.2). Only the lens differs, and step 3 says how.

**Where it goes** (PLACEMENT) — decide it now, because step 3 reads the prior version
from it and step 5 sends it:

- **A whole phase** (change mode, "explain P8", a joint "P8 and P9") → a chapter of the
  repo's **`phases`** book: book `phases`, kind `codebase`, book title
  `"<project>, phase by phase"` (the book is created on first use); chapter key `p<N>` (a
  joint explain → `p<N>-p<M>`), position `N`, chapter title `"P<N>: <phase name>"`, source
  `phase=P<N>`.
- **One slice** of a phase (change mode, "explain P8.S2") → a chapter of that phase's own
  book: book `p<N>`, kind `codebase`, book title `"P<N>: <phase name>"`; chapter key = the
  slice id lowercased (`s1`, `f1`), position = the slice's `order`, chapter title = the
  slice's name, sources `phase=P<N>` and `slice=P<N>.S<k>`.
- **A named book** (`book=<slug>`, or the user names one in words) → a chapter of that
  book. The chapter key is a short lowercase-kebab name for the chapter. If the book does
  not exist yet, it is created: a repo's book is kind `codebase`; a book about a general
  subject is kind `subject` with `subject` set to its label (`Finance`).
- **Anything else** (a PR, a commit, a topic of this repo, **every general-mode request
  that names no book**) → a **loose document**, exactly as before. In general mode the
  loose document carries `subject` — a short display label (`Finance`, `Linear algebra`) —
  and its **project is the subject's slug** (`finance`, `linear-algebra`), not the
  directory you happen to be standing in.

Do **not** invent a book the user did not ask for and the rules above do not name.

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
  - `KB_API_BASE_URL` — the document API base (used in steps 3 and 5).
  - `KB_API_TOKEN` — a bearer token, or empty (empty = no token; used in step 5).
  - `KB_ROOT` — the local KB checkout, or empty for a remote-only config.
  - `KB_SITE_BASE_URL` — the local MkDocs viewer base (used in step 8).
  - `KB_LOCAL_FALLBACK` — `yes` or `no`; kept for the report in step 6.

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

Ground **every** claim in reality — never invent paths, commands, config snippets,
behavior, figures, dates or quotations; quote them from real files and real pages. Reuse
conclusions already established in this conversation rather than re-deriving them.
Audience: novice, unless the user says otherwise.

**Repo research — by mode:**

- **Change mode:** read the actual change, not your memory of it. Use `git diff`,
  `git log`, and `git show` (e.g. `git show <ref>`, `git diff <base>..<head>`,
  `git log --stat`) to get the real diff and the surrounding history, then read the
  changed files and the code around them. Every statement about what changed is grounded
  in the real diff and real files. For a phase or slice, also read its plan and result
  notes if the repo keeps them.
- **Topic mode:** read the real code, configs, compose files, and scripts that make the
  topic work here — walk the actual implementation.
- **General mode:** there is no repo research. The evidence is the web research below,
  files or images the user gave you, and what the conversation established.

**Knowledge-base research — is this an update to an existing chapter or document?**

The KB versions documents **in place**: re-explaining something publishes the **next
version of the same document**, not a second post. Derive `project` and `slug`/key
exactly as step 5 defines them, then find the prior one. Every `curl` in this skill takes
`-H "Authorization: Bearer <KB_API_TOKEN>"` when `KB_API_TOKEN` from step 2 is non-empty
and no header when it is empty.

- **A chapter (PLACEMENT names a book and key):** ask the book what it holds:

      curl -sS --max-time 5 '<KB_API_BASE_URL>/api/books/<project>/<book>'

  Look in `chapters` for your `key`, and in its `variants` for your `lang`. A hit gives
  `rel_path` and `version`: remember them as `PRIOR_REL_PATH` / `PRIOR_VERSION` and
  `PRIOR_FORMAT` (its `format`). A 404, or no such key or lang, is `PRIOR=none` — a new
  chapter. **You do not need `new_version` for a chapter:** the server resolves
  `(project, book, key, lang)` and a variant that exists simply receives its next
  version. Another variant of the same chapter in a different language is the *source*
  of a translation, not a prior (below).
- **A loose document:** one list call, then match:

      curl -sS --max-time 5 '<KB_API_BASE_URL>/api/documents?project=<project>&limit=200'

  Look in `items` for an entry whose `slug` matches, or whose `title` is plainly this same
  topic under a different slug. Match on **subject**, not recency: a genuinely different
  subject is a new document even in the same project. No match → `PRIOR=none`. A match →
  `PRIOR_REL_PATH` / `PRIOR_VERSION` / `PRIOR_FORMAT` as above.

**Re-explaining a prior (`PRIOR` is not `none`):** read what the current version says, so
the new chapter builds on it instead of silently contradicting it:

    curl -sS --max-time 30 '<KB_API_BASE_URL>/api/documents/by-path/<PRIOR_REL_PATH>'

- A **native** prior carries `source` — the **whole stored file**, header and every id
  included. Read `source`, **not** `markdown` (that is only the plain-text search
  projection), and not the MCP `fetch_document` tool (it truncates at 20,000 characters,
  so a long chapter would lose its tail and its ids). (With the CLI installed,
  `knowledge --base-url <KB_API_BASE_URL> read <PRIOR_REL_PATH> --source` prints the same.)
  **Carry the ids forward:** every heading, typed block, quiz item, quiz option and
  source item that survives keeps its id exactly; new material gets new ids; an id the
  server retired is never handed out again, so do not re-use a dropped one for something
  else. Ids are what the reader's saved quiz results, highlights and notes hang on.
- A **`html`** prior (a legacy explainer) has no `source`; read the extracted text in
  `markdown` for what was already said. Your native chapter replaces it: the first native
  publish onto an html document is a one-time format migration (the html body is archived
  as a version, the id and URL stay). Tell the user so in the report.
- Only if an **older** body matters, list and fetch the archived ones:
  `…/api/documents/by-path/<PRIOR_REL_PATH>/versions` and `…/versions/<n>`.
- Any error or unreachable API here is **never fatal**: treat it as `PRIOR=none` and
  carry on — step 5 still catches a collision with a 409.

Either way, write a **complete, standalone chapter** (a version is a full replacement,
not a diff): keep what still holds, correct what changed, add what is new.

**Translation** (the user asks for the chapter in another language, `lang=<xx>`, and an
existing variant of the same chapter is the source): fetch the source variant's `source`,
translate the prose, and **keep every id verbatim** — heading ids, block ids, quiz item
and option ids, source ids, asset names. Ids are never translated. Publish it as the
`lang` variant of the same book and key, with `translated_from` = the source's language
and version. If the quiz item or option ids differ from the source version's, the server
refuses it (422 `translation-quiz-ids`); heading and block id differences come back as
warnings.

**Web research — the "Best practices & next steps" section (default-on):**

This is the one part that reaches *beyond* the codebase: how the implementation compares
to prevailing external practice — and, in general mode, it is the substance of the
chapter. Decide whether to run it:

1. **Forced?** If `no-research` was given (step 1), skip it — go to step 4 with no
   best-practices section. If `research` was given, run it (skip the judgment gate below)
   but still honor the offline degradation in point 4.
2. **Judgment gate (the default path).** Run web research **unless** the subject has no
   meaningful external comparison surface: skip it for purely-internal material
   (repo-private glue, personal naming conventions, one-off wiring nobody else has an
   opinion on) and for trivial fixes (a typo, a version bump, a one-line guard). **In
   general mode always run it.** When in doubt on a substantive subject, run it.
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
   always fall through to a successful save. Do not retry in a loop. (In general mode,
   write only what the conversation and the user's own material support; if you have no
   source you opened, publish no sources block rather than an invented one.)

Remember the outcome for the report (step 8): **included**, **skipped-by-judgment**
(purely-internal / trivial), or **skipped-offline** (tools unavailable or errored). A
failed research step **never** blocks the save.

## 4. Write the chapter — native Markdown

Author the whole chapter as one Markdown file, then publish it in step 5. The file is the
**body only**: **no `---` header** (the server writes the header from the fields you send in
step 5) and **no `# H1`** (the title is a field, and the reader draws it). It starts at
the first paragraph or `##` heading. Write it to `<tmp>/body.md`, where `<tmp>` is
`/tmp/explain-<date>-<slug>/` — so the body and title never pass through shell arguments.

The grammar below is the one the server enforces. It is **CommonMark + GFM** (tables with
alignment, `~~strikethrough~~`, autolinks) plus exactly three extensions:
**callouts**, **typed fenced blocks** and **heading ids**. Anything outside it is rejected
at publish with a line-numbered list — never silently repaired — so write to it exactly.

### 4.1 Hard rules (a violation is a 422)

- **No raw HTML, anywhere** — no tag, no `<br>`, no `<!-- comment -->`, in a paragraph,
  table cell, list, callout, heading, or a YAML *(md)* field. Use Markdown. A literal `<`
  in prose is fine when it cannot read as a tag (`a < b`); put code in backticks.
- **Headings are `##`, `###`, `####` only**, and only at the top level (not inside a
  list, quote or callout). No `#` (the title is a field), no `#####`.
- **Typed blocks are top-level only** (not inside a list, quote or callout). Their body is
  YAML (JSON is accepted). A fence's info string is only `` ```[lang] [title="…"] [#id] ``.
- **Links** are `#id` (in this chapter), `http(s)://…`, `chapter:[<project>/]<book>/<key>[?lang=xx][#id]`
  and `doc:[<project>/]<slug>`. Nothing else: no `mailto:`, `javascript:`, `data:`,
  relative paths or bare filenames. A `#id` that matches nothing is an error; a
  `chapter:`/`doc:` target that does not exist yet is only a warning (a series may link
  forward).
- **Images** are `![alt](asset:NAME)` or a figure's `src` — never an `http(s)` URL (that is
  an error), and every NAME must be attached to **this** publish (§4.7).
- **YAML strings:** quote anything with a colon-space, a leading `#`, `{`, `[`, `*`, `&`, `!`,
  `|`, `>`, `%`, `@` or a backtick; and quote a number-looking label (`label: "2024"`).
  No anchors, aliases, tags, merge keys or duplicate keys. Unknown keys are rejected.
- **Limits:** 512 KB per chapter, 300 typed blocks, 60 diagram nodes / 100 edges / 12
  lanes / 200 chart points, quiz 1–20 items, figure row 2–3 items, SVG 64 KB and 2,000
  elements, 2 MB per image, 20 images and 12 MB in all.

### 4.2 Recommended outline

The old fixed five-section page is now the **recommended outline** — a starting shape,
not a form to fill. Use the sections the subject earns, in this order, as `##` headings
with ids (the reader builds the table of contents from `##` and `###`; **never write one**):

1. **Background** — change mode: the system as it was before this change, plus context;
   topic mode: what this is and why it exists here; general mode: what the subject is and
   what the reader needs to already know. Offer a deeper beginner background in a
   `> [!SKIP] Skip this if you already know …` callout, then the narrower relevant part.
2. **Intuition** — the core idea in essence, with **concrete toy data** and a diagram;
   change mode: why the change and what it buys; topic mode: the mental model; general
   mode: the idea through a worked example.
3. **Code** — change mode walks the diff, grouped and ordered logically; topic mode walks
   the real implementation here (fenced code with a `title="path"`). In **general mode**
   this section is **Worked examples** instead: real numbers, real cases, step by step.
4. **Best practices & next steps** — *present only when step 3 ran web research* (§4.5).
   When research was skipped, this section is simply absent; the chat report says why.
5. **Quiz** — a `quiz` block of about 5 items (§4.5). Always last before the sources.
6. **Sources** — the `sources` block (§4.6): the pages you opened. Required in general
   mode; in repo modes, whenever any section cites a page.

Tone: the clarity and flow of Martin Kleppmann — an essay with smooth transitions between
sections, not a bullet dump; define each piece of jargon on first use; engaging and
novice-friendly by default. **No length cap** — as long as the teaching needs.

### 4.3 Ids

- Syntax `[a-z0-9][a-z0-9-]{0,63}`, **unique across the chapter**.
- **Write them yourself:** every `##`/`###`/`####` heading (`## Background {#background}`),
  every typed block (`` ```diagram #request-flow ``), every code block you want to link or
  annotate (`` ```python title="app.py" #app-main ``), every quiz item and option, every
  source item. Use short, meaningful, stable slugs.
- Ids are what the reader's links, saved quiz results, highlights and notes attach to, so
  **a re-explain keeps the id of everything that survives**, and a translation copies all
  of them. If you do omit one, the server assigns it (`getting-started`, `s-3`, `diagram-2`)
  and tells you in `assigned_ids` — but then it is the server's choice, not yours.
- Callouts, paragraphs, lists, tables have no id; a link to one points at its section.
- Scoped ids (a quiz option within its item, a diagram node within its diagram, an SVG
  element within its SVG) need only be unique inside their parent.

### 4.4 The grammar, block by block

**Callouts** — a blockquote whose first line is `[!TYPE]`, optionally followed by a title;
a `-` right after the type makes it collapsed (a disclosure). Types: `NOTE`, `IMPORTANT`
(the key-idea box), `WARNING`, `CAUTION`, `SKIP` (skip-this-if-you-know), `DEFINITION`
(use the collapsed form for a primer). The body is full Markdown, nesting included.

````markdown
> [!IMPORTANT] The key idea
> A cache trades **freshness** for speed.

> [!DEFINITION]- Primer: write lock
> Only one writer holds the lock at a time.

> [!SKIP] Skip this if you know SQL
> A one-paragraph refresher.
````

**Figure** — one image: `src` (an asset name), `alt` (required), `caption` *(md, required)*,
optional `credit` and `width: column | wide`.

````markdown
```figure #arch-photo
src: arch
alt: The three layers drawn on a whiteboard
caption: The layers, *as sketched in review*.
```
````

**Figure row** — 2–3 items side by side (stacked on a phone), each one of `image` (+ `alt`),
`diagram` (an inline diagram body), `svg` (+ `label`) or `card` (`title`, `body` *(md)*,
`tone`); each may have a `caption`; the row may have its own `caption`.

````markdown
```figures #before-after
caption: The same request, before and after.
items:
  - image: before
    alt: The old flow
    caption: Before.
  - card:
      title: After
      body: |
        One round trip instead of three.
      tone: accent
```
````

**Diagram** — drawn by the reader from data; prefer it to ASCII art or hand-made SVG. Every
diagram needs `kind` and `title` (the short text alternative), and may have a `caption`
*(md)*. Tones (the only colours): `default`, `muted`, `accent`, `ok`, `warn`, `bad`,
`store`, `series-1` … `series-6`. Kinds:

- `flow` — `nodes[{id, label, sub?, at?: [row, col], shape?: box|pill|store|entity,
  fields?[], tone?}]`, `groups?[{id, label, nodes[]}]`, `edges[{from, to, label?,
  style?: solid|dashed, tone?}]`, `direction?: down|right`. Place nodes on a grid with
  `at`, or let them flow in `direction`. Covers pipelines, loops, architecture maps and
  entity diagrams (`shape: entity` + `fields`).
- `state` — a `flow` plus `initial` and `final` (one id or a list) and labelled transitions.
- `sequence` — `actors[{id, label}]`, `steps[{from, to, label, style?, note?}]`.
- `stack` — `layers[{label, items?[], tone?}]`, `nested?: bool`.
- `timeline` — `axis{unit, from, to, ticks?}`, `lanes[{label, bars[{from, to, label?, tone?}],
  marks?[{at, label}]}]`.
- `chart` — `type: bar|line|interval`, `x{label, categories? | numeric{from,to}}`,
  `y{label, min?, max?}`, `series[{name, values[], tone?}]`, `rules?[{at, label}]`
  (an interval value is `[low, high]` or `[low, median, high]`).

Anything else (a UI mock, a matrix, a decision tree) is an `svg` block.

````markdown
```diagram #request-flow
kind: flow
title: A request through the cache
direction: right
nodes:
  - {id: client, label: Client, shape: pill}
  - {id: cache, label: Cache, shape: store, tone: store}
  - {id: db, label: Database, sub: source of truth}
edges:
  - {from: client, to: cache, label: GET}
  - {from: cache, to: db, label: on a miss, style: dashed}
```
````

**Custom SVG** — only when no diagram kind fits. Body is `label` (required text
alternative), optional `caption`, and `svg` (one `<svg>` with a `viewBox`). **Allowed
elements:** `svg g defs marker title desc rect circle ellipse line polyline polygon path
text tspan`, and `use` with a local `#id` only. **Colour only** via `fill`/`stroke` set to
`none` or `currentColor`, and the classes `kb-fill-<tone>` / `kb-stroke-<tone>`; no hex,
`rgb()` or named colours. **Forbidden:** `script`, `foreignObject`, `style`, `image`, `a`,
animation, `filter`, every `on*` attribute, any non-local `href` or `url()`. Rejected,
never stripped.

````markdown
```svg #arrow
label: An arrow from A to B
svg: |
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40" role="img" aria-label="Arrow">
    <line x1="10" y1="20" x2="100" y2="20" stroke="currentColor" stroke-width="2"/>
    <text x="10" y="35" font-size="10" class="kb-fill-muted">A to B</text>
  </svg>
```
````

**Code** — a standard fence, with `title="path/or/label"` and an optional `#id`; the
language is optional (`text` for ASCII output). A language outside the block names above
(`mermaid` included) is just code.

### 4.5 Best practices, and the quiz

**Best practices & next steps (when present).** Cover three things: where the
implementation **aligns** with prevailing practice, where it **deliberately diverges** (and
why that can be a legitimate choice here), and **2–4 concrete next steps**. **Every claim
carries a citation to a page you actually opened — no citation, no claim.** Cite with an
ordinary link to the source's id, and keep the source visible in plain text, because the
KB's search indexes the *text* and an `href` is not text:

````markdown
Request-scoped connection pooling is standard practice
([PostgreSQL docs](#src-pg-pooling) — postgresql.org).
````

**The quiz** — one `quiz` block with about **5 medium-difficulty items** that test
substantive understanding (hard enough that you must understand the subject, not
gotchas). Every item has a required `id` and a `type`; mix the types:

- `choice` — `prompt` *(md)*, `options` (2–6 of `{id, text}`), `answer: [option ids]` (more
  than one id = "select all that apply"), `explain` *(md, required)*;
- `recall` — `prompt`, `answer` *(md)*, optional `explain`: the reader reveals the answer
  and grades themself;
- `cloze` — `text` *(md)* with blanks written `{{accepted|alternative}}` (1–5 blanks),
  optional `explain`: typed answers.

Grading happens in the reader; the answer key ships in the page, so this is a learning
aid. Every `answer` must name real option ids; a `cloze` needs at least one blank.

````markdown
```quiz #quiz
title: Check yourself
items:
  - id: q-miss
    type: choice
    prompt: What happens on a cache miss?
    options:
      - {id: a, text: The request fails}
      - {id: b, text: The cache asks the database and keeps the answer}
      - {id: c, text: The database is skipped}
    answer: [b]
    explain: The miss path is what fills the cache.
  - id: q-why
    type: recall
    prompt: Why does a cache trade freshness for speed?
    answer: It serves a stored copy that may be older than the source.
  - id: q-ttl
    type: cloze
    text: A {{TTL|time to live}} bounds how stale an entry may get.
```
````

### 4.6 Sources

One `sources` block, id `sources`, at the end: `items[{id, title, url, publisher?, date?,
accessed?, note?}]`, each `id` required and `url` an `http(s)` URL. Cite a source anywhere
with `[text](#src-id)`. List only pages you actually opened. Put a `## Sources` heading
before the block if you like (the server gives that heading the id `sources-list`, clear
of the block's `sources`).

````markdown
```sources #sources
items:
  - id: src-pg-pooling
    title: Connection pooling
    url: https://www.postgresql.org/docs/current/runtime-config-connection.html
    publisher: PostgreSQL
    accessed: 2026-10-21
```
````

### 4.7 Images

**Images are welcome** when they teach — a screenshot, a photo, a chart the user gave you
or you made, a scan of a figure the user owns. Never hot-link, and never download a
third-party image the user did not give you the right to use. Each image is a file on
disk that you attach **by name** at publish time (step 5's `--asset NAME=PATH`, repeated),
and the body refers to the **name**: `![alt](asset:arch)` or a figure's `src: arch`.

- Formats: png, jpeg, webp, gif (an animated GIF shows a still unless the reader plays it;
  animated PNG/WebP are rejected). **No SVG file upload** — draw vector art with an `svg`
  block. Names: `[A-Za-z0-9][A-Za-z0-9._-]{0,127}`; every name referenced must be attached,
  and every attached name should be referenced.
- A version **inherits no images**: the file you publish carries exactly the images you
  send *with that publish*. A re-explain, a new version or a translation must **re-attach
  every image it still references** from the original files; if you no longer have a file,
  drop the reference (or ask the user for it) rather than leave a name that resolves to
  nothing (422 `ref-unknown-asset`).
- Always write real `alt` text, and a `caption` on a `figure`.

### 4.8 Before you publish

Read the body once, against the rules: no `#`/`#####` headings, no raw HTML, every `#id` link
resolves, every quiz `answer` names an option, every `asset:` name is attached, no
number-like or colon-bearing YAML string left unquoted, every sources `url` is
`http(s)`, nothing cited that you did not open. The server tells you every violation, with
its line, if you miss one — but a clean first publish is better than two.

### 4.9 Check

With §5's fields settled, dry-run the exact publish first: CLI `knowledge check <tmp>/body.md`
with the publish's flags (not `--json`), or curl `POST <KB_API_BASE_URL>/api/documents/check`
with §5's payload and headers. It writes nothing. **Exit 0** (curl 200): go to §5. **Exit 1**
(422/409): fix every listed line, check again; the same list twice → STOP and report the
codes. **Exit 2**: no `/api/documents/check` (server not yet updated) or a CLI before 0.2.0
→ skip it, say so in step 8, and let §5's 422 be the backstop; any other cause follows §5/§5.1.
Offline (§6): no check is possible; say so.

## 5. Publish via the KB document API

- **project:**
  - repo modes — the current repo's root directory name, verbatim (e.g. `hi2vi_web`); if
    it contains path-unsafe characters, lowercase it and replace them with `-`;
  - general mode — the subject's slug (`finance`), as step 1 said; a named book keeps the
    project its book already lives in;
  - outside a git repo with nothing to derive from, fall back to `default` (the KB
    get-or-creates any project on the first write).
- **slug** = short lowercase-kebab topic name (e.g. `shared-nginx-explained`); date = today,
  `YYYY-MM-DD`. (A chapter's address is its book and key; the slug and date still name its
  file.)
- **title** = a clean title, no trailing period. **tags** = 2–5 lowercase-kebab topic tags.
  **summary** = one or two sentences that lede the chapter under its title (optional,
  recommended). **lang** = the chapter's language (§1).
- `co_authored_by` is the bare attribution value naming the model that actually did the
  work — the API prepends `Co-Authored-By: ` itself (e.g. in Codex,
  `GPT-5.5 <noreply@openai.com>`).
- Write the body to `<tmp>/body.md` (step 4). Images stay as files on disk.

Publish with the **CLI** when it runs (`knowledge --version` answers) — it encodes the
images, shows the server's line-numbered refusals readably, and prints the warnings.
Otherwise use the **curl** form further down; both send the same request.

    knowledge --base-url <KB_API_BASE_URL> save <tmp>/body.md --format native --json \
      --title "<Title>" --tag <tag> --tag <tag> --summary "<lede>" --lang <xx> \
      --project <project> --source-repo <repo> --co-authored-by "<bare attribution>" \
      [--subject "<Label>"] \
      [--book <book> --book-kind <codebase|subject> --book-title "<Book title>" \
       --chapter <key> --position <n> --chapter-title "<Chapter title>" \
       --chapter-source phase=P<N> --chapter-source slice=P<N>.S<k>] \
      [--translated-from <xx>@<version>] \
      [--new-version --rel-path <PRIOR_REL_PATH>] \
      [--asset <name>=<path> ...]

- A placed chapter sends `--book` **and** `--chapter` together; `--position`,
  `--chapter-title` and `--chapter-source` matter only when the chapter is **new** (an
  existing chapter keeps its manifest entry), and the book's `--book-kind` / `--book-title` /
  `--book-subject` only when the **book** is new (a subject book needs `--book-subject`).
  A loose document sends neither; in general mode it sends `--subject`.
- `--new-version --rel-path` is for a **loose** document's re-explain (`PRIOR` from step 3).
  A chapter needs neither: re-sending the same book, key and `--lang` is its next version.
- The CLI reads its key from `$KB_API_TOKEN` or the config, the same as step 2. If it is
  not installed or says no API key is configured, use the curl form below.

**The curl form.** Write `<tmp>/meta.json` with exactly the fields you need — note
`"format": "native"`. Leave `date`, `slug`, `overwrite` and `commit` unset (API defaults):

    {
      "title": "<Title>",
      "project": "<project>",
      "format": "native",
      "summary": "<lede>",
      "lang": "<xx>",
      "tags": ["<2–5 lowercase-kebab topic tags>"],
      "source_repo": "<absolute path to the current repo root>",
      "co_authored_by": "<bare attribution>",
      "book": {"slug": "<book>", "kind": "<codebase|subject>", "title": "<Book title>"},
      "chapter": {"key": "<key>", "position": <n>, "title": "<Chapter title>",
                  "source": {"phase": "P<N>", "slice": "P<N>.S<k>"}},
      "translated_from": {"lang": "<xx>", "version": <n>},
      "subject": "<Label>"
    }

Drop every field that does not apply: `book` and `chapter` only for a placed chapter,
`subject` only for a loose general-mode document, `translated_from` only for a translation.
For a loose document's **new version** add `"new_version": true, "rel_path":
"<PRIOR_REL_PATH>"` (keep `project` and `format` identical to the target: changing either
is a 422). Merge the body in — and the images, if any: each as `name|media-type|path`
(`image/png`, `image/jpeg`, `image/webp` or `image/gif`; the server checks the real bytes):

    python3 -c 'import json,sys,base64; m=json.load(open(sys.argv[1])); m["markdown"]=open(sys.argv[2]).read(); a=[x.split("|",2) for x in sys.argv[4:]]; a and m.__setitem__("assets",[{"name":n,"media_type":t,"content_base64":base64.b64encode(open(p,"rb").read()).decode()} for n,t,p in a]); json.dump(m, open(sys.argv[3], "w"))' <tmp>/meta.json <tmp>/body.md <tmp>/payload.json [name|image/png|path ...]

POST once to `<KB_API_BASE_URL>/api/documents`. When `KB_API_TOKEN` from step 2 is
**non-empty**, add the bearer header shown in the second form; when it is empty, use the
first form. The **30 s** budget is deliberate (the API answers *before* its git push and
embedding work) and the `allowed-tools` frontmatter pre-approves exactly this
`--max-time 30` prefix, so spell it exactly this way:

    curl -sS --max-time 30 -o <tmp>/response.json -w '%{http_code}' --json @<tmp>/payload.json <KB_API_BASE_URL>/api/documents

    curl -sS --max-time 30 -H "Authorization: Bearer <KB_API_TOKEN>" -o <tmp>/response.json -w '%{http_code}' --json @<tmp>/payload.json <KB_API_BASE_URL>/api/documents

**Branch on the result** (the CLI's exit code and stderr say the same thing as the curl
status below). A curl exit code ≠ 0 (connection refused, timeout) means **you did not see
a response**, which is NOT the same as a failed save: do not re-POST yet → go to **§5.1**.
Exit 0 = the API answered → branch on the status, and NEVER fall back to a file write on
an HTTP error:

- **201** — the API wrote the file, indexed the row, and made the scoped commit. Write NO
  file and run NO git. Record `url`, `version`, `previous_version`, `committed`,
  `commit_error`, `pushed`, `push_pending`, `assigned_ids`, `warnings` and `migrated_from`
  from `<tmp>/response.json` (or the CLI's `--json` output) for step 8. **`pushed: false`
  with `push_pending: true` is the normal, successful result — never an error and never a
  reason to retry**: the document is saved and committed, and the push to the remote runs
  in the background right after this response. `warnings` are **not** failures — a
  `ref-unresolved` is a `chapter:`/`doc:` link to something that does not exist yet, and a
  `translation-ids` is a heading or block id that differs from the source: report them.
- **409** — a document already exists at that path (or, for a stem, another document owns
  it). This is the plain-create collision. The detail carries `rel_path`, `existing_title`
  and, when a real KB document is behind it, its `version`. It is the "same topic again"
  case, so the primary retry is a **new version**: report the `existing_title` and
  `rel_path` and ASK the user before retrying; on a yes, add `new_version` and the detail's
  `rel_path` and re-publish. `"overwrite": true` still works and is no longer destructive
  (it archives the replaced body too), but use it only when the user explicitly wants to
  replace rather than supersede.
- **422** — a convention violation or an invalid chapter. The detail is **one list that
  names every violation** with its `line` (a line of the body you sent; `0` is the header
  or the whole document), a `code` and a message. Fix **every** listed problem in
  `<tmp>/body.md`, then publish once more. If the same list comes back, STOP and report the
  codes — never loop. Common ones: `raw-html`, `heading-level`, `ref-unknown-asset`
  (attach the image, or drop the reference), `quiz-answer`, `ref-missing-id`, `field-type`
  (an unquoted number or colon), `translation-quiz-ids` (keep the source's ids), and
  `asset-*` (a bad image: format, size, or not the type its bytes say). The `html` → native
  migration needs no flag.
- **401** — the API requires a bearer token and yours is missing or wrong: report that a
  valid `KB_API_TOKEN` must be configured (via `~/.config/knowledge-kb/config.json`
  `api.token`, or the `KB_API_TOKEN` env var — re-run `/knowledge:setup` to set it). Do not
  fall back.

### 5.1 Transport failure on the POST — verify before you report or retry

A non-zero curl exit tells you only that **this client never saw the response**. The
request may well have been delivered and the document durably saved: the API writes the
file and the database row *before* it answers. So a timeout is **not** proof of failure,
and the two obvious reactions are both wrong — reporting "unreachable" lies about a
published document, and re-POSTing blind creates a duplicate or burns an unwanted extra
version. **Verify first, exactly once.**

- **The target `rel_path`** is `<PRIOR_REL_PATH>` when `PRIOR` was found (step 3). For a
  **new** chapter or document, ask for it by its place: for a chapter,
  `GET <KB_API_BASE_URL>/api/books/<project>/<book>` and look for your `key` and `lang`;
  for a loose document, `GET …/api/documents/by-path/<project>/<date>-<slug>.md`. Use the
  bearer header exactly as in the POST above:

      curl -sS --max-time 30 -o <tmp>/verify.json -w '%{http_code}' '<KB_API_BASE_URL>/api/documents/by-path/<rel_path>'

      curl -sS --max-time 30 -H "Authorization: Bearer <KB_API_TOKEN>" -o <tmp>/verify.json -w '%{http_code}' '<KB_API_BASE_URL>/api/documents/by-path/<rel_path>'

- Branch on that verification:
  - **200 and it is this publish** — for a new document, a 200 whose `title` is the one
    you just sent is proof; for a next version, `version` is `PRIOR_VERSION + 1`. → **The
    save LANDED.** Run NO git and do NOT re-POST. Go to step 8 and report success from
    `<tmp>/verify.json` (it carries `id`, `title`, `rel_path` and `version`, and **no
    `url`**) — plus one honest line: the response never arrived, and the document is
    confirmed saved by this follow-up read.
  - **200 but it is plainly the OLD document** (`version` still `PRIOR_VERSION`) → the API
    is reachable and your write did not land: re-run the POST **once**, exactly as spelled
    above. If that single retry also fails at the transport layer, STOP: report that the
    publish state could not be established, name the `rel_path`, and write nothing.
  - **200 answering a different document** on a plain create — the path is taken by
    something else, i.e. the **409** case arriving late. Do NOT re-POST blind: report the
    existing title and `rel_path` and ASK the user before publishing over it.
  - **404** — nothing there. The API is reachable and the save genuinely failed → re-run
    the POST **once**, same one-retry-then-stop rule.
  - **5xx — or any other status** (e.g. a **401** when reads are token-guarded): the API
    answered but could not tell you what happened → STOP, report the status and that the
    publish state is unknown at `<rel_path>`. Do not retry.
  - **curl exit ≠ 0 on the verification GET too** — the API really is unreachable now. Go
    to step 6.
- Never loop this. One verification GET, at most one re-POST, then report what you know.

## 6. When the API is unreachable

A native chapter cannot be written by hand: the server parses and validates it, assigns
its ids, stores its images, and places it in a book. So there is **no file fallback** for a
chapter. After a transport failure that §5.1's verification could not resolve (the
verification GET failed at the transport layer too):

- **STOP.** Report that the document API at `<KB_API_BASE_URL>` is unreachable, that the
  publish state is **unverified** (the POST may have landed, so check the KB before
  publishing this again), and that you wrote nothing to the knowledge base.
- Keep the authored chapter: leave `<tmp>/body.md` (and the images you referenced) in place
  and tell the user its absolute path, so the same publish can be re-run when the API is
  back. If `KB_LOCAL_FALLBACK` is `yes`, add that a local `docker compose up -d` in
  `<KB_ROOT>` brings the API up.

## 7. Optional copy in the current project

Only when PROJECT_COPY=yes: also write the chapter — the **native source** as the server
stored it (the `source` field of `GET /api/documents/by-path/<rel_path>`, header included,
or your `<tmp>/body.md` if you cannot read it back) — to
`<repo-root>/<TOPIC>_EXPLAINED.md` (topic in SCREAMING_SNAKE, e.g.
`SHARED_NGINX_EXPLAINED.md`). The copy carries no images. Do not commit it; that repo
belongs to the user.

## 8. Report

Tell the user:

- API path: the document is saved and committed in the KB; view at the `url` from the
  response (the direct doc page; shareable with others when the project is public). If
  `committed` is `false` with a `commit_error`, say the document was saved but the commit
  failed, and quote the error. Say which version this was: `version` from the response — a
  new document or chapter is `v1`; a version bump names the `previous_version` it
  superseded, whose body is kept (archived), not lost.
- Where it landed: a loose document, or the book and chapter key (and language) it joined,
  and whether the book or chapter was newly created.
- **Publishing state — do not misreport it.** `pushed: false` together with
  `push_pending: true` is the normal 201: the document is **saved and committed**, and the
  push to the remote runs in the background just after the response. Say it that way (e.g.
  "saved and committed; publishing to the remote in the background") — never call it a
  failure, never "not saved", and never retry the POST because of it.
- **Warnings** from the 201, one line each (an unresolved `chapter:`/`doc:` link, or ids
  that differ from a translation's source), and `migrated_from` if an html explainer was
  replaced by this native chapter (say that the old html body is kept as a version).
- **Recovered path (§5.1)**: when the POST's response was lost but the verification proved
  the document is there, report it as a plain success from `<tmp>/verify.json` — `title`,
  `rel_path`, `version`, `id` — plus one line: the connection dropped before the response
  arrived, the save is confirmed by a follow-up read, and nothing was written twice.
- The **research-section outcome**, one line: **included**, **skipped-by-judgment**
  (purely-internal subject / trivial fix), or **skipped-offline** (research tools
  unavailable or errored) — with a short why.
- The project copy path, if one was made.
