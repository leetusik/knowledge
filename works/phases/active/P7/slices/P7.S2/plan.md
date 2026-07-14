# Plan — P7.S2: Plugin skeleton + marketplace wiring

Orchestrator plan (auto run). Executor: slice-executor-low — follow this plan LITERALLY; if any step's outcome differs from what this plan says to expect (a command missing, a validator error, a file that already exists), STOP and return `escalate` with what you observed. No judgment calls, no improvisation. No commits, no status transitions.

Context (read first): `phase.md` Decomposition entry for P7.S2 and Constraints. This slice creates the plugin's identity files only — no skills, no templates (those are S3/S4/S5).

## Files to create (exact contents)

### 1. `.claude-plugin/marketplace.json` (repo root — new directory + file)

```json
{
  "name": "knowledge",
  "owner": {
    "name": "leetusik"
  },
  "description": "Marketplace for the knowledge plugin: a personal knowledge base with an explain skill and a KB scaffolder.",
  "plugins": [
    {
      "name": "knowledge",
      "source": "./plugin",
      "description": "Write beginner-friendly explainer documents into your own personal knowledge base — a searchable MkDocs site backed by a FastAPI document API — and scaffold the whole KB from scratch with one setup skill."
    }
  ]
}
```

Rules honored here (do not change): NO `version` field in the marketplace entry (version lives in plugin.json ONLY); `source` is `"./plugin"` (NEVER `"./"`).

### 2. `plugin/.claude-plugin/plugin.json` (new directories + file)

```json
{
  "name": "knowledge",
  "version": "0.1.0",
  "description": "Write beginner-friendly explainer documents into your own personal knowledge base — a searchable MkDocs site backed by a FastAPI document API — and scaffold the whole KB from scratch with one setup skill.",
  "author": {
    "name": "leetusik"
  },
  "homepage": "https://leetusik.github.io/knowledge/",
  "repository": "https://github.com/leetusik/knowledge",
  "license": "MIT",
  "keywords": [
    "knowledge-base",
    "explainer",
    "documentation",
    "mkdocs",
    "notes"
  ]
}
```

### 3. `plugin/README.md`

```markdown
# knowledge — Claude Code plugin

Turn what you just figured out into a personal knowledge base. The plugin ships
two skills:

- `/knowledge:explain <topic>` — researches the topic in your current repo or
  conversation and writes a beginner-friendly explainer document into your own
  knowledge base (via its local document API, with a plain-file fallback).
- `/knowledge:setup` — scaffolds that knowledge base from scratch: a MkDocs
  Material site, a FastAPI + SQLite document API, an interactive knowledge
  graph, and a GitHub Pages publishing workflow. Run it once after install.

## Install

    /plugin marketplace add leetusik/knowledge
    /plugin install knowledge@knowledge

Then run `/knowledge:setup` once to create your KB, and `/knowledge:explain`
whenever you want something explained and kept.

## Requirements

- Python 3.12+ (the document API and site tooling).
- Docker (optional but recommended — runs the local viewer + API; without it
  the KB still works through the file-write fallback).
- A GitHub repository (optional — only needed to publish the site via Pages).

The live demo of what you get: <https://leetusik.github.io/knowledge/>.

> Skills land in this plugin's later development slices; install instructions
> above are final. This README is finalized alongside the E2E test slice.
```

(Write the file exactly as above, including the final blockquote — the E2E slice replaces it.)

### 4. `LICENSE` (repo root)

The standard MIT license text, verbatim, with this copyright line:

```
MIT License

Copyright (c) 2026 leetusik

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### 5. `.dockerignore` — append one line

Append this line at the end of the existing `.dockerignore` (do not touch other lines):

```
plugin/
```

## Validation (run each; expected outcomes stated — any other outcome = escalate)

1. `python3 -m json.tool .claude-plugin/marketplace.json > /dev/null && echo OK` → prints `OK`.
2. `python3 -m json.tool plugin/.claude-plugin/plugin.json > /dev/null && echo OK` → prints `OK`.
3. `claude plugin validate .` → exits 0 (validates the marketplace manifest; the CLI is v2.1.208 and this subcommand exists — verified). Record its output.
4. `claude plugin validate ./plugin` → exits 0 (validates the plugin manifest). Record its output.
5. `claude plugin validate . --strict` and `claude plugin validate ./plugin --strict` → record pass/fail; a --strict failure over MISSING optional metadata or unrecognized-field warnings is acceptable to REPORT (do not "fix" by adding fields this plan doesn't specify) — but a non-strict failure in 3/4 = escalate.
6. `python3 scripts/workflow.py validate` → "Workflow validation passed."

## Wrap-up

- Append to `phase.md` under `## Findings & Notes`: one short note — plugin identity files exist (`.claude-plugin/marketplace.json` with source `./plugin`; `plugin/.claude-plugin/plugin.json` v0.1.0 MIT; root LICENSE; `plugin/` added to `.dockerignore`), `claude plugin validate` green on both manifests (+ the --strict outcome).
- Append to the `## Doc impact` list in `phase.md`, exactly these two lines:
  - `architecture — plugin/marketplace packaging layout landed: repo-root .claude-plugin/marketplace.json + isolated plugin/ payload (source "./plugin"). [S2]`
  - `decisions — MIT license adopted (root LICENSE + plugin.json license); plugin hosted in this repo with payload isolation via plugin/ subdir. [S2]`
- Write `result.md` from scratch (what you created, validation outcomes); return the structured verdict.
