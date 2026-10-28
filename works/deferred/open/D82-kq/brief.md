# Deferred: D82-kq Let the site build pass on a KB with no public project

## Context

## Why Deferred

scripts/site_smoke.py assumes a Recent bullet, a project dir and a matching graph count; with every project private the site build workflow fails on every push since the unpublish (it gates no deploy)

## Trigger to Promote

when the operator wants a green push, or the red check gets in the way

## Notes

