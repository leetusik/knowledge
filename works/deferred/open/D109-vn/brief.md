# Deferred: D109-vn Listen claim carries each segment's section and kind

## Context

## Why Deferred

The runner claim gives segments as {text} only, so the Mac runner guesses section changes from heading-like lines to place its longer pauses; listen_parts.segments already stores section, block and kind. The runner already prefers a section field when present (is_section_start).

## Trigger to Promote

Pauses land in the wrong places in made audio, or a later voice needs the block kind

## Notes

