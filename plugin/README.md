# knowledge — Claude Code plugin

Turn what you just figured out into a personal knowledge base. The plugin ships
two skills:

- `/knowledge:explain <topic or change-ref>` — explains what code in your
  current repo does, a **code change** in it, or a **subject** a research phase
  covered, and publishes a **native chapter** into your own knowledge base:
  Markdown with a few typed blocks (diagrams, figures, callouts, SVG, a quiz,
  sources) that the knowledge base renders itself. It is **records-only**: it
  writes only from the code and from what your workflow workspace's phases
  recorded, a research phase's findings included, does no research of its own
  (no web search, no research agents) and brings in nothing from outside.
  Whenever the records lack what the reader needs (a subject no phase covers,
  code or not, or a covered subject that rests on outside basics no record
  states), it offers a **research phase first**, and your own "research first"
  is always honoured: it runs at once, and when it passes the explain's
  confirmation comes back by itself. It is the
  front door of an **explain phase** in a workflow workspace (v96 or later): it
  suggests the reader and the shape, asks you **once**, and on your yes hands it
  to the workspace's `create-phase`, which runs it to a private publish. One writer
  drafts the chapter, every sentence traced to a code range or a record line,
  visuals first; one critic on another model checks it; it is revised once and
  published. The chapter can carry a **glossary** whose terms the text links
  with `term:` links (each opens its definition in the reader), and **typeset
  formulas**: inline `` $`…`$ `` math and a `formula` block with a plain reading
  and a "where" legend, typeset in the reader and on paper. The default is a
  standalone document; a chapter of a book, or a
  whole book, only when you ask for one. Skill text:
  [`skills/explain/SKILL.md`](skills/explain/SKILL.md).
- `/knowledge:setup` — wires `/knowledge:explain` to a knowledge base, two ways.
  **Connect** (the zero-infra default): sign up at the hosted KB
  (<https://knowledge.hi2vi.com>), mint one ingest key, paste it, and your chapters
  post to your own tenant — no server to run, one key serves every repo. **Scaffold**
  (full control): stand up your own self-hosted KB from scratch — a MkDocs Material site,
  a FastAPI + SQLite document API, an interactive knowledge graph, and a GitHub Pages
  publishing workflow. Run it once after install and pick a mode. The key never
  enters the transcript: the explain skill's resolver writes it to a `0600` header
  file that every KB call passes by path, or leaves it to the `knowledge` CLI, which
  reads it itself.

## Install

    /plugin marketplace add leetusik/knowledge
    /plugin install knowledge@knowledge

Then run `/knowledge:setup` once to create your KB, and `/knowledge:explain`
whenever you want something explained and kept.

## Explain: flags and the one confirmation

    /knowledge:explain <topic or change-ref> [book=<slug>] [lang=<xx>] [from=P<N>]

**Requirements:** a workflow workspace v96 or later in the repository you run it
from (without one it refuses and runs nothing; an older one, or one whose
create-phase research route does not write the `sources` line, is told to run
`/update-workspace`), and `/knowledge:setup` run once. Plugin 0.11.0 and workspace
v96 need each other: v96's explain route refuses an older plugin's proposal and
creates nothing, so update both (the workspace first).

**The one confirmation.** `/knowledge:explain` reads, drafts and asks; it never
researches or writes by itself. It finds the workspace and checks it is ready,
looks for a live explain phase on the same subject (and offers to resume it or
start a new version), looks up the published prior version and the phases that
built the subject, then shows the proposed phase and its `## Explain` block and
asks once. It **suggests the reader** (a concrete guess at who they are, what
they know and what they are new to) and **the shape**: the sections as that
reader's questions, in their order, with one or two other shapes to pick from.
Your yes signs them, and the run writes only those. When the records lack what
the reader needs, it says so and offers "research first": when no phase covers
the subject, or when phases cover it but the reader needs something none of
their records states (a field's terms, a formula, outside basics), which it
names; there "yes" explains from the records as they are, those parts stated as
gaps. Your own "research first", or research asked for in your own words, is
always honoured, whatever the coverage. One more confirmation names what the
research reads (the code, the web, with a source beside each finding, or your
own material, under privacy rules), then the workspace creates that research
phase and runs it at once. When it passes, the explain's confirmation comes back
by itself, redrawn from the findings (the research phase beside any phase that
built the code), and waits for your yes. A subject with no code behind it (a
field of study, a language, your own notes) that no research phase covers yet
can only go this way; outside a git repository it is declined. `from=P<N>` names
the research phase an explain is drawn from (the chained confirmation passes it
for you). Change any line and it shows the whole confirmation again;
reply yes and it hands the proposal to `create-phase`, which creates the explain
phase in its own worktree and runs it to publish. It stops only for the check,
the critic, or a publish failure. Headless (`claude -p`), it prints the
confirmation and creates nothing.

- **One run:** one writer reads the code at one commit and the covering phases'
  records (intent, decisions, notes, slice results, research findings), writes
  from them alone, and one critic on another model checks every sentence against
  them. What neither states is a gap the chapter states, never filled from
  outside. **Next steps** appear only when something is still open in the
  workspace (an open deferred job, an open question, a decision not yet built); a
  quiz only when the subject earns one. A **v2** of a published document is the
  earlier version plus the phases since: only those phases and the code that
  changed are read. Say "from scratch" in your reply for a full rerun instead.
- `book=<slug>` makes it a chapter of that book when the book exists, else a new
  book of that slug (a book's chapters are drawn from the phases). A book is of
  kind `codebase`, or `subject` with a short label when no code is behind it
  (`kind subject: English grammar`); its Sources also list the outside works its
  research read, each marked "read by the research, not by this book". After you
  sign the outline, the workspace writes its chapters **at once** (at most 4 in
  flight, a synthesis chapter after the chapters it draws on), each checked by
  its own critic; `lang=<xx>`
  writes it in another language (English by default, whatever language you ask
  in). Asking for a published document or chapter in another language is a
  **translation**: one write, with no critic. A chapter's translation is that
  chapter's language variant; a loose document's translation is a document of its
  own (`<slug>-<xx>`), never a new version of the original.
- **Resuming** is the workspace's: a stopped explain phase goes on from its
  dossier with `/do-whole-phase <P>` (and asking `/knowledge:explain` again on
  the same subject offers exactly that). There is no project copy: the draft is
  already committed in the phase folder.

**Where a run's files live.** Each run keeps a dossier, never deleted or
published, in its explain phase's folder: `doc/` for a document or a chapter,
`book/research/` for a book (`brief.md`, `evidence.md`, `outline.md`, the
draft `body.md`, `trace.md`, `critique.md`, `answers.md`). It is committed with
the phase, except its git-ignored `pages/`. The payload builder for a curl
publish lives outside every repository, in
`${XDG_STATE_HOME:-~/.local/state}/knowledge-kb/explain/tools/`
(`<KB_EXPLAIN_STATE>/tools/`), shared by every run; if that folder cannot be
written it moves to the dossier's `pages/tools/`, and the report says so. The
report prints the dossier's path.

## Explain: the critic agent

The plugin ships one agent, `knowledge:explain-critic` (sonnet; opus for a
Sonnet writer): one fresh-eyes pass on the draft against the code and the
records. Its instructions are Part B of the skill, byte for byte.

## Explain: permissions

The run's calls go on your **session's** permissions: a skill cannot grant them,
and the skill's own grant ends after its first turn. Interactive Claude Code's
default **auto** mode (2.1.283 or later) needs nothing more, and bypass mode
works too. In manual mode, or under `claude -p`, allow these (settings.json
`permissions.allow`, or the same strings after `--allowedTools`). `<ROOT>` is
`${XDG_STATE_HOME:-~/.local/state}/knowledge-kb/explain` as an absolute path,
`<TOOLS>` is `<ROOT>/tools` (when the payload builder fell back to the dossier's
`pages/tools/`, that is `<TOOLS>` and the two `<ROOT>` rules go), `<SKILL_DIR>`
is the installed skill's folder, and `<UNIT>` is the unit's folder in the
explain phase (a document's or a chapter's `doc/`, a book's `book/`); the extra
leading `/` in a path rule is deliberate:

    "Bash(git show *)", "Bash(git log *)", "Bash(git grep *)", "Bash(git blame *)",
    "Bash(git diff *)", "Bash(git status *)", "Bash(sed -n *)", "Bash(shasum -a 256 *)",
    "Bash(curl -sS --max-time 30 *)", "Bash(curl -sS --max-time 5 *)",
    "Bash(python3 -I <TOOLS>/pagetext.py *)",
    "Bash(knowledge --base-url *)", "Bash(knowledge --version)",
    "Read(/<ROOT>/**)", "Edit(/<ROOT>/**)", "Read(/<SKILL_DIR>/**)"

The phase's writer reads the skill by path, so it also needs
`"Bash(python3 -c *)"`, `"Read(/<UNIT>/**)"` and `"Edit(/<UNIT>/**)"`. A book's
chapter also needs `"Bash(git -C <BOOK> show HEAD:./*)"`, the critic's read of
earlier chapters, where `<BOOK>` is the book's folder exactly as the critic's
`draft:` path writes it (relative, not a path rule).

You do not have to work them out: there is no preflight, and a denied call stops
the run where it is made with `FAILED: permissions`, writing nothing more, and
prints this list with your real paths.

## Requirements

**Connect mode needs none of the below** — just a browser to sign up and mint a key. The
list is for **scaffold** (self-hosted) mode:

- Python 3.12+ (the document API and site tooling).
- Docker (optional but recommended — runs the local viewer + API; without a
  running API there is nothing to publish to, because a native chapter cannot be
  written by hand).
- A GitHub repository (optional — only needed to publish the site via Pages).

The live demo of what you get: <https://leetusik.github.io/knowledge/>.

## Development & releasing

The shipped payload under `plugin/templates/kb/` is a byte-for-byte snapshot of
the live repo it was extracted from. A root-only parity guard
(`scripts/plugin_parity.py`, run in CI by `.github/workflows/plugin-ci.yml`)
re-renders the templates and fails the build if they drift from their source
files, so the scaffold a user installs always matches the running system.

Release checklist — before pushing a release:

1. Any change under `plugin/**` ships only with a `plugin.json` `version` bump;
   installers pull updates only when the version changes.
2. `python3 scripts/plugin_parity.py` — templates in parity with the repo.
3. `claude plugin validate .` and `claude plugin validate ./plugin` — both pass
   (add `--strict` to surface metadata warnings); `python3 scripts/skills_parity.py`
   — the three skill copies and the critic agent in parity with Part B.
4. Run the setup + explain E2E rehearsal (scaffold into a temp dir on throwaway
   ports; exercise the 201 / 409 / fallback paths, then `mkdocs build` +
   `site_smoke.py`) — never against your own live KB.
5. Before deploying a server that accepts the new grammar, scan the stored native
   sources once for `` ```glossary ``, `` ```formula ``, `` $` `` (a `$` beside a
   code span, now inline math) and `term:` links; a hit means `syntax: 2` instead
   of the additive `syntax: 1`.
