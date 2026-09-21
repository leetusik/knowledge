# Deferred: D15 Fix pre-existing P16-era gated failure: documents list projection format key (test_documents_api)

## Context

## Why Deferred

test_documents_api.py::test_documents_list_detail_and_project_bridge fails on any Postgres-gated run: format entered the list projection in P16 but _LIST_KEYS was never updated; predates P18 (confirmed on clean trees). Decide whether format belongs in list items (fix the test) or not (fix the projection).

## Trigger to Promote

next documents-plane slice, or before wiring Postgres-gated tests into CI

## Notes

