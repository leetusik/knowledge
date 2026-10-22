# knowledge — Claude Code plugin

Turn what you just figured out into a personal knowledge base. The plugin ships
two skills:

- `/knowledge:explain <topic or change-ref>` — researches a topic, a **code
  change** in your current repo or conversation, or a general subject, and
  publishes a **native chapter** into your own knowledge base: Markdown with a
  few typed blocks (diagrams, figures, callouts, SVG, a quiz, sources) that the
  knowledge base renders itself. Research comes first and is its own stage: a
  team of research agents opens and quotes real sources, a verifier on a second
  model checks every load-bearing claim, gap rounds fill what is missing, and an
  evidence gate stops the run before writing when the evidence is too thin. The
  chapter (Background, Intuition, Code or worked examples, a cited "Best
  practices & next steps" section, a quiz) is written only from that evidence,
  checked by a critic on another model, revised once and published. A chapter
  joins a book when the work is a phase or a slice (`book=<slug>`); otherwise it
  is a loose document. A request for a whole book becomes a proposed explain
  phase in a workflow workspace. Skill text:
  [`skills/explain/SKILL.md`](skills/explain/SKILL.md).
- `/knowledge:setup` — wires `/knowledge:explain` to a knowledge base, two ways.
  **Connect** (the zero-infra default): sign up at the hosted KB
  (<https://knowledge.hi2vi.com>), mint one ingest key, paste it, and your chapters
  post to your own tenant — no server to run, one key serves every repo. **Scaffold**
  (full control): stand up your own self-hosted KB from scratch — a MkDocs Material site,
  a FastAPI + SQLite document API, an interactive knowledge graph, and a GitHub Pages
  publishing workflow. Run it once after install and pick a mode.

## Install

    /plugin marketplace add leetusik/knowledge
    /plugin install knowledge@knowledge

Then run `/knowledge:setup` once to create your KB, and `/knowledge:explain`
whenever you want something explained and kept.

## Explain: modes and flags

    /knowledge:explain [resume [<run-id>]] <topic or change-ref> [here] [quick|no-research] [book=<slug>] [lang=<xx>]

- **full** (the default): research agents in waves, verified on another model, up
  to 3 gap rounds, counter-evidence on the main claims, the evidence gate, the
  critic.
- **`quick`**: the main session researches alone into the same dossier, with one
  verifier batch; no gap rounds, no counter-evidence, no critic. The gate holds.
- **`no-research`**: your explicit opt-out, never the skill's choice: no web, a
  chapter from the repository (or your own material) alone, still critic-checked,
  with no "Best practices" section. Failed web research never falls back to it: the
  run stops and says so.
- **`resume [<run-id>]`**: continues a stopped run from its `run.md`
  (`trust <source>` or `drop <item>` after an evidence-gate stop).
- `book=<slug>` places the chapter in a book; `lang=<xx>` writes it in another
  language (English by default, whatever language you ask in); `here` also copies
  the source into the current project.

**Where a run's files live.** Each run keeps a dossier, never deleted or
published: `${XDG_STATE_HOME:-~/.local/state}/knowledge-kb/explain/<run-id>/`
(`brief.md`, `plan.md`, `run.md`, the researchers' `findings/`, `library.md`,
`ledger.md`, `verify/`, `gaps/`, `outline.md`, the draft `body.md`, `trace.md`,
`critique.md`, `report.md`), and the page converter in `…/explain/tools/`. If that
folder cannot be written, both move to `<cwd>/.knowledge-explain/`, and the
report says so. The report prints the dossier's path.

## Explain: research agents

The plugin ships five agents, invoked as `knowledge:<name>`. Their instructions
are Part B of the skill, byte for byte.

| Agent | Model | Does |
|---|---|---|
| `web-researcher` | opus | one angle on the web: pages saved, passages quoted exactly |
| `code-researcher` | opus | one angle of the repository: code in its real order, its history |
| `gap-reviewer` | opus | after each round: what the evidence still lacks |
| `verifier` | sonnet | re-opens each cited passage and labels the claim |
| `explain-critic` | sonnet (opus for a Sonnet writer) | one fresh-eyes pass on the draft |

## Explain: permissions and the search cap

The research agents run on your **session's** permissions: a skill cannot grant
them, and the skill's own grant ends after its first turn. Interactive Claude
Code's default **auto** mode (2.1.283 or later) needs nothing more, and bypass
mode works too. In manual mode, or under `claude -p`, allow these (settings.json
`permissions.allow`, or the same strings after `--allowedTools`). `<ROOT>` is
`${XDG_STATE_HOME:-~/.local/state}/knowledge-kb/explain` as an absolute path,
`<TOOLS>` is `<ROOT>/tools`, and `<SKILL_DIR>` is the installed skill's folder;
the extra leading `/` in a path rule is deliberate:

    "WebSearch", "WebFetch",
    "Bash(curl -sS --max-time 30 *)", "Bash(curl -sS --max-time 5 *)",
    "Bash(python3 -I <TOOLS>/pagetext.py *)", "Bash(pdftotext *)",
    "Bash(git show *)", "Bash(git log *)", "Bash(git grep *)", "Bash(git blame *)",
    "Bash(git diff *)", "Bash(git status *)", "Bash(shasum -a 256 *)", "Bash(mktemp -d *)",
    "Bash(knowledge --base-url *)", "Bash(knowledge --version)",
    "Read(/<ROOT>/**)", "Edit(/<ROOT>/**)", "Read(/<SKILL_DIR>/**)"

You do not have to work them out: the run's first step, a preflight, probes them
and, if any call is denied, stops with `FAILED: permissions`, writing nothing,
and prints this list with your real paths.

**The search cap.** Claude Code caps WebSearch at 200 calls per session, the main
thread and every agent together. A full run can use a large share of that. Raise
it in your user settings' `env`, for example
`"CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION": "1000"`. The skill never changes
your settings: at the cap it stops loudly with `failed: search-limit`, and
`/knowledge:explain resume` continues once the limit refills or is raised.

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
   — the three skill copies and the five agents in parity with Part B.
4. Run the setup + explain E2E rehearsal (scaffold into a temp dir on throwaway
   ports; exercise the 201 / 409 / fallback paths, then `mkdocs build` +
   `site_smoke.py`) — never against your own live KB.
