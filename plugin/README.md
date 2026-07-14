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
