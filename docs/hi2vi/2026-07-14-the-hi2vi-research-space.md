---
title: "The hi2vi Research Space"
date: 2026-07-14
tags:
  - hi2vi
  - knowledge-base
  - research
  - content-agent
source:
  project: hi2vi
  repo: hi2vi_web
---

# The hi2vi Research Space

This is the first note in `docs/hi2vi/` — the research space for the hi2vi
content agent. It exists to explain what lands here, how it gets here, and how
to use it.

## What lives here

Everything in this folder is research output: dated notes the content agent
produces while investigating a topic — market and product observations, channel
and competitor reading, content ideas and the evidence behind them. It is a
working corpus rather than a polished publication. The notes are written to be
re-read — by the agent before its next round of research, and by us when we want
to know what it already found.

This folder is deliberately separate from `docs/hi2vi_web/`, which holds
engineering explainers about the hi2vi web application. Research notes go here;
engineering notes go there. Same knowledge base, two different kinds of writing.

## How documents arrive

Nobody hand-writes or hand-commits these files. The agent calls the knowledge
API, and one request does the whole publish:

1. it writes the markdown file at `hi2vi/<date>-<slug>.md`, generating the
   frontmatter (title, date, project, tags, source repo, related links) so every
   note follows the same convention;
2. it adds the note to the site index and to the search index;
3. it commits the change and pushes it, which triggers the site build.

So a note is publicly readable a few minutes after the agent writes it, with no
human in the loop. This document is the first proof of that chain: it exists
because of that API call, not because someone edited a file.

## Conventions

- One file per note, named `<date>-<slug>.md`, carrying two to five tags.
- Notes are **dated snapshots**. Rather than rewriting an old note, the agent
  writes a new one and links back through its `related` field — so the record of
  what was believed, and when, stays intact instead of being overwritten.

## Reading and searching

Browse the folder from the site index, or follow a tag. The published site also
has full-text search built into the page itself, so searching costs nothing more
than loading the site.

The agent reads this same corpus back through the API's search endpoint, which
blends keyword matching with semantic similarity. That read path is the point of
the whole space: before researching a topic, the agent asks what it already
knows. The corpus is meant to compound, not to repeat itself.
