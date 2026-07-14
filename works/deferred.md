# Deferred Jobs

> Generated dashboard. Do not put detailed deferred context here; edit each `works/deferred/<state>/<DID>/` folder instead.

## Summary

- Open: `1`
- Promoted: `2`
- Dropped: `0`
- Rebuilt at: `2026-07-14T22:48:04+09:00`

## Open

| ID | Status | Title | Source | Trigger | Path |
|---|---|---|---|---|---|
| `D3` | `deferred` | Revoke orphan GitHub deploy key 157264706 (knowledge-api@oci) + delete its stray private half from the repo working tree | P8.F2 | operator runs: gh repo deploy-key delete 157264706 -R leetusik/knowledge && rm -f knowledge_deploy_key knowledge_deploy_key.pub | `works/deferred/open/D3` |

## Promoted

| ID | Status | Title | Promoted To | Path |
|---|---|---|---|---|
| `D1` | `promoted` | Decide whether works/docs internals appear on the public site | `P4.S5` | `works/deferred/promoted/D1` |
| `D2` | `promoted` | Design polish for the Pages site (palette/fonts/logo, optional extra_css) | `P5.S1` | `works/deferred/promoted/D2` |

## Dropped

| ID | Status | Title | Reason | Path |
|---|---|---|---|---|
| - | - | - | - | - |
