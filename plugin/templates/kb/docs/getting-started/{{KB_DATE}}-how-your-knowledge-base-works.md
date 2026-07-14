---
title: "How Your Knowledge Base Works — Explained for Beginners"
date: {{KB_DATE}}
tags:
  - knowledge-base
  - getting-started
  - mkdocs
  - explainers
source:
  project: getting-started
  repo: getting-started
---

# How Your Knowledge Base Works — Explained for Beginners

> This is the first page of your new knowledge base — an educational write-up
> of the thing you are reading it in. Written for a novice programmer: every
> piece of jargon is explained as it appears. Once you have written a few
> explainers of your own, you can delete this page.

## 1. What this is

A **knowledge base** is just a searchable pile of writing you keep for later.
This one is built from three small, ordinary parts working together:

1. A **static site** — a folder of Markdown files turned into an HTML website by
   [MkDocs](https://www.mkdocs.org/), a tool that reads `docs/` and writes a
   browsable `site/`. "Static" means the pages are plain files; there is no
   server deciding what to show you, so it is cheap to host and hard to break.
2. A small **document API** — a program (built with FastAPI, a Python web
   framework) that accepts a finished explainer over HTTP and files it away for
   you: it writes the Markdown file, records it in a search index, and commits
   it to git. This is what the `/knowledge:explain` skill talks to.
3. A **knowledge graph** — a build step that reads the metadata at the top of
   each explainer and draws every document as a dot on an interactive map,
   linked to the topics it shares with its neighbours. Open the **Graph** tab to
   see it.

None of these needs the others to be running to work. If the API is down, an
explainer can still be written straight to a file. If you never publish the
site, it still runs on your own machine.

## 2. The shape of an explainer

Every explainer is a single Markdown file living under `docs/<project>/`, where
`<project>` is whatever body of work it is about. This one lives under
`getting-started/`. At the very top of the file is a block called
**frontmatter** — a few lines of [YAML](https://yaml.org/) between two `---`
fences that describe the document without appearing in the body:

```yaml
---
title: "How Your Knowledge Base Works — Explained for Beginners"
date: 2026-01-01
tags:
  - knowledge-base
  - getting-started
source:
  project: getting-started
---
```

The `tags` are the threads that link explainers together on the graph, and
`source.project` is what groups them into sections. Get the frontmatter right
and everything else — the search index, the Recent list, the graph — updates
itself.

## 3. How a new page arrives

You do not edit these files by hand. You ask the `/knowledge:explain` skill to
explain something, and it does three things for you:

1. Writes the explainer file with correct frontmatter under the right project.
2. Adds a one-line bullet to the top of this site's home page, under the
   `<!-- explain:recent -->` marker, so the newest writing is always the first
   thing you see.
3. Commits both changes to git — a small, self-contained snapshot you can undo.

That is the whole loop: figure something out, run `/knowledge:explain`, and the
explanation is written down, indexed, linked, and saved before you have moved on
to the next thing.

## 4. Where to go next

- Open the **Graph** tab to watch this single node become a web as you add more.
- Run `/knowledge:explain` the next time you untangle something worth keeping.
- When you are ready to share it, the included GitHub Pages workflow publishes
  the site every time you push.

Welcome to your knowledge base.
