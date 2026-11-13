# Deferred: D89-zf Graph leftovers tidy-up

## Context

## Why Deferred

Behaviour-neutral leftovers from the trimmed P37-1p.S4 scope: /app/graph docstrings at server/reader_api.py:76 and server/books_api.py:72 (and template twins); the unused projects kwarg on db.list_documents/count_documents/_filtered; a stale comment in web/src/app/(app)/graph/page.tsx; the PublicGraphPage, PrettyPublicGraphPage and PublicGraphNotFound component names on the redirect routes.

## Trigger to Promote

the next slice touching db.py, reader_api.py, books_api.py or the redirect routes, or a docs phase

## Notes

