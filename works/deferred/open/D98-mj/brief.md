# Deferred: D98-mj A heading with no authored id takes a new id in each version, orphaning its marks

## Context

## Why Deferred

retired_ids (server/native_ingest.py, P30.S5) reserves every id the current row and earlier versions used, so IdRegistry.assign_slug re-mints an unchanged heading's slug as -2, -3: throwaway math-check went when-e-lambda-is-near-one → -2 → -3 and its highlight went Unanchored; ids.py's docstring says only retired ids are reserved. The explain skill authors every heading id, so only hand-written chapters hit it

## Trigger to Promote

the next native-ingest change, or the first report of a lost highlight

## Notes

