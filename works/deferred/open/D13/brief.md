# Deferred: D13 source_url (public-origin) field + ingester population

## Context

## Why Deferred

P15.S1's MCP search hit reserves a 'url' field for each document's public origin (naver-cafe post / blog / hi2vi /docs article), surfaced via the _citation_url seam. But no document carries a public origin today: source.repo holds a repo name (changple5, hi2vi_web), not a URL, and the corpus is repo-derived explainers. Lighting up clickable citations needs a first-class optional source_url on the document model (additive to the frozen /api/* write path + frontmatter + search projection) AND the content ingesters populating it. Detail deliberately deferred (operator, P15).

## Trigger to Promote

public-scraping/ingestion features land, or clickable citations become required for a consumer (e.g. OpenClaw's citation chip)

## Notes

